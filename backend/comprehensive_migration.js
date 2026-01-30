import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TaskSchema } from "./models/taskModel.js";
import { Customer } from "./models/customerModel.js";
import { TechnicalDetail } from "./models/technicalDetailModel.js";
import { TaskTicket } from "./models/taskTicketModel.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSON_FILE_PATH = path.join(__dirname, "..", "b2bProject_2026.tasks.json");

const migrateData = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error("MONGO_URI not found in environment variables.");
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for migration...");

        if (!fs.existsSync(JSON_FILE_PATH)) {
            console.error(`JSON file not found at: ${JSON_FILE_PATH}`);
            process.exit(1);
        }

        const rawData = fs.readFileSync(JSON_FILE_PATH, "utf8");
        const tasksData = JSON.parse(rawData);

        console.log(`Found ${tasksData.length} tasks in JSON file.`);

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const oldTask of tasksData) {
            try {
                // Skip if no requestNumber (shouldn't happen)
                if (!oldTask.requestNumber) {
                    console.warn(`Skipping task with missing requestNumber: SLID ${oldTask.slid}`);
                    skipCount++;
                    continue;
                }

                // Check if task already exists by requestNumber
                const existingTask = await TaskSchema.findOne({ requestNumber: oldTask.requestNumber });

                // If it exists and already has populated refs, we might skip or update
                // For now, let's update everything to be sure

                // Prepare IDs
                let taskId;
                if (existingTask) {
                    taskId = existingTask._id;
                } else {
                    taskId = oldTask._id?.$oid ? new mongoose.Types.ObjectId(oldTask._id.$oid) : new mongoose.Types.ObjectId();
                }

                // Map dates helper
                const parseDate = (d) => {
                    if (!d) return null;
                    if (d.$date) return new Date(d.$date);
                    return new Date(d);
                };

                // Map User IDs helper
                const mapUser = (u) => {
                    if (!u) return null;
                    if (u.$oid) return new mongoose.Types.ObjectId(u.$oid);
                    if (mongoose.Types.ObjectId.isValid(u)) return new mongoose.Types.ObjectId(u);
                    return null;
                };

                // Filter out invalid User IDs
                const mapUsers = (arr) => {
                    return (arr || []).map(mapUser).filter(u => u !== null);
                };

                // Map top-level Task fields
                const taskFields = {
                    _id: taskId,
                    slid: oldTask.slid,
                    requestNumber: oldTask.requestNumber,
                    customerName: oldTask.customerName,
                    contactNumber: oldTask.contactNumber ? String(oldTask.contactNumber) : null,
                    operation: oldTask.operation,
                    rootCause: oldTask.rootCause,
                    subReason: oldTask.subReason,
                    teamName: oldTask.teamName,
                    teamId: mapUser(oldTask.teamId),
                    teamCompany: oldTask.teamCompany,
                    date: parseDate(oldTask.date),
                    pisDate: parseDate(oldTask.pisDate),
                    dashboardShortNote: oldTask.dashboardShortNote || "",
                    responsible: oldTask.responsible,
                    interviewDate: parseDate(oldTask.interviewDate),
                    priority: oldTask.priority || "Normal",
                    status: oldTask.status || "Todo",
                    assignedTo: mapUsers(oldTask.assignedTo),
                    whomItMayConcern: mapUsers(oldTask.whomItMayConcern),
                    createdBy: mapUser(oldTask.createdBy) || taskId, // Use taskId as fallback if no creator
                    category: oldTask.category,
                    validationStatus: oldTask.validationStatus,
                    readBy: mapUsers(oldTask.readBy),
                    taskLogs: (oldTask.taskLogs || []).map(log => ({
                        action: log.action || "updated",
                        user: mapUser(log.user) || taskId,
                        timestamp: parseDate(log.timestamp) || new Date(),
                        description: log.description || ""
                    })),
                    resolutionStatus: oldTask.resolutionStatus || "Pending",
                    subtaskType: oldTask.subtaskType || "original",
                    isDeleted: oldTask.isDeleted || false,
                    evaluationScore: oldTask.evaluationScore || 1,
                    serviceRecipientInitial: oldTask.serviceRecipientInitial,
                    serviceRecipientQoS: oldTask.serviceRecipientQoS,
                    createdAt: parseDate(oldTask.createdAt) || new Date(),
                    updatedAt: parseDate(oldTask.updatedAt) || new Date()
                };

                // Map subtasks to schema (though main tracking moved to GAIA tickets)
                taskFields.subTasks = (oldTask.subTasks || []).map(st => ({
                    title: st.title,
                    note: st.note || "",
                    dateTime: parseDate(st.dateTime),
                    status: st.status || "Open",
                    progress: st.progress || 0,
                    shortNote: st.shortNote || "",
                    optional: st.optional || false,
                    checkpoints: (st.checkpoints || []).map(cp => ({
                        name: cp.name,
                        checked: cp.checked || false,
                        score: cp.score || 0,
                        options: cp.options ? {
                            type: cp.options.type,
                            question: cp.options.question,
                            choices: (cp.options.choices || []).map(c => ({
                                label: c.label,
                                value: c.value
                            })),
                            selected: cp.options.selected,
                            value: cp.options.value,
                            simpleQuestion: cp.options.simpleQuestion || false,
                            // Simplified followUp and actionTaken for migration
                            followUpQuestion: cp.options.followUpQuestion ? {
                                question: cp.options.followUpQuestion.question,
                                selected: cp.options.followUpQuestion.selected
                            } : undefined,
                            actionTaken: cp.options.actionTaken ? {
                                question: cp.options.actionTaken.question,
                                selected: cp.options.actionTaken.selected
                            } : undefined
                        } : undefined,
                        signalTestNotes: cp.signalTestNotes || ""
                    }))
                }));

                // Create or Update Task
                let taskDoc;
                if (existingTask) {
                    Object.assign(existingTask, taskFields);
                    taskDoc = existingTask;
                } else {
                    taskDoc = new TaskSchema(taskFields);
                }

                // Create Customer entry
                const customerData = {
                    taskId: taskId,
                    customerName: oldTask.customerName,
                    customerType: oldTask.customerType,
                    contactNumber: oldTask.contactNumber,
                    governorate: oldTask.governorate,
                    district: oldTask.district,
                    customerFeedback: oldTask.customerFeedback,
                };
                const customer = await Customer.findOneAndUpdate({ taskId: taskId }, customerData, { upsert: true, new: true });

                // Create TechnicalDetail entry
                const technicalDetailData = {
                    taskId: taskId,
                    operation: oldTask.operation,
                    tarrifName: oldTask.tarrifName,
                    speed: oldTask.speed,
                    ontType: oldTask.ontType,
                    freeExtender: oldTask.freeExtender,
                    extenderType: oldTask.extenderType,
                    extenderNumber: oldTask.extenderNumber,
                    reason: oldTask.reason,
                    subReason: oldTask.subReason,
                    rootCause: oldTask.rootCause,
                };
                const technicalDetail = await TechnicalDetail.findOneAndUpdate({ taskId: taskId }, technicalDetailData, { upsert: true, new: true });

                // Create TaskTicket (GAIA) entries from subTasks
                if (oldTask.subTasks && oldTask.subTasks.length > 0) {
                    for (const st of oldTask.subTasks) {
                        if (st.note || st.status === "Closed") {
                            const ticketNote = st.note || `Status marked as ${st.status}`;

                            // Check if ticket already exists (heuristic based on note and taskId)
                            const existingTicket = await TaskTicket.findOne({
                                taskId: taskId,
                                note: ticketNote
                            });

                            if (!existingTicket) {
                                let mainCategory = "Visited";
                                if (st.status === "Closed") mainCategory = "Resolved";
                                if (st.title === "Task Reception") mainCategory = "Todo";
                                if (st.title?.includes("Called")) mainCategory = "Called";

                                await new TaskTicket({
                                    taskId: taskId,
                                    taskType: "Task",
                                    mainCategory: mainCategory,
                                    status: oldTask.status || "Todo",
                                    note: ticketNote,
                                    recordedBy: taskFields.createdBy,
                                    timestamp: parseDate(st.dateTime) || taskFields.createdAt,
                                    eventDate: parseDate(st.dateTime) || taskFields.createdAt
                                }).save();
                            }
                        }
                    }
                }

                // Link documents back to Task
                taskDoc.customer = customer._id;
                taskDoc.technicalDetails = technicalDetail._id;

                await taskDoc.save();
                successCount++;
                if (successCount % 100 === 0) console.log(`Processed ${successCount} tasks...`);

            } catch (err) {
                console.error(`Error migrating task SLID ${oldTask.slid}, Request ${oldTask.requestNumber}:`, err);
                errorCount++;
            }
        }

        console.log("Migration summary:");
        console.log(`- Success: ${successCount}`);
        console.log(`- Skipped: ${skipCount}`);
        console.log(`- Errors: ${errorCount}`);

        console.log("Migration process finished.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrateData();
