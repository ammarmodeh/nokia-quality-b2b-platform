import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { TaskSchema } from "./models/taskModel.js";
import { TaskTicket } from "./models/taskTicketModel.js";

dotenv.config();

const JSON_FILE_PATH = path.join(process.cwd(), "..", "b2bProject_2026.tasks.json");

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for flat migration...");

        // Clear existing tasks to avoid duplicates or conflicts during this refactor
        await TaskSchema.deleteMany({});
        await TaskTicket.deleteMany({});
        console.log("Cleared existing tasks and tickets.");

        const rawData = fs.readFileSync(JSON_FILE_PATH, "utf8");
        const tasks = JSON.parse(rawData);
        console.log(`Found ${tasks.length} tasks in JSON file.`);

        const results = { success: 0, errors: 0 };

        for (const taskData of tasks) {
            try {
                const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
                const extractId = (idObj) => {
                    if (!idObj) return null;
                    if (typeof idObj === 'string' && isValidId(idObj)) return idObj;
                    if (idObj.$oid && isValidId(idObj.$oid)) return idObj.$oid;
                    return null;
                };

                const isValidDate = (d) => d instanceof Date && !isNaN(d);
                const parseDate = (d) => {
                    if (!d) return null;
                    const dateValue = d.$date || d;
                    const parsed = new Date(dateValue);
                    return isValidDate(parsed) ? parsed : null;
                };

                // Prepare Task document (Flat)
                const task = new TaskSchema({
                    slid: taskData.slid,
                    requestNumber: taskData.requestNumber,
                    customerName: taskData.customerName,
                    customerType: taskData.customerType || null,
                    contactNumber: taskData.contactNumber ? String(taskData.contactNumber) : null,
                    governorate: taskData.governorate || null,
                    district: taskData.district || null,
                    customerFeedback: taskData.customerFeedback || null,

                    operation: taskData.operation,
                    tarrifName: taskData.tarrifName || null,
                    speed: taskData.speed || null,
                    ontType: taskData.ontType || null,
                    freeExtender: taskData.freeExtender || null,
                    extenderType: taskData.extenderType || null,
                    extenderNumber: taskData.extenderNumber || 0,
                    reason: taskData.reason || null,
                    subReason: taskData.subReason || null,
                    rootCause: taskData.rootCause || null,

                    teamName: taskData.teamName || null,
                    teamCompany: taskData.teamCompany || null,
                    date: parseDate(taskData.date),
                    pisDate: parseDate(taskData.pisDate),
                    responsible: taskData.responsible || null,
                    interviewDate: parseDate(taskData.interviewDate),
                    priority: taskData.priority || "Normal",
                    status: taskData.status || "Todo",
                    category: taskData.category || null,
                    validationStatus: taskData.validationStatus,
                    evaluationScore: taskData.evaluationScore || 1,
                    serviceRecipientInitial: taskData.serviceRecipientInitial || null,
                    serviceRecipientQoS: taskData.serviceRecipientQoS || null,

                    // Assign to a default admin if createdBy is missing in JSON
                    createdBy: extractId(taskData.createdBy) || "67ab4cbc8b3293fde0fa364a",
                    assignedTo: Array.isArray(taskData.assignedTo) ? taskData.assignedTo.map(extractId).filter(Boolean) : [],
                    whomItMayConcern: Array.isArray(taskData.whomItMayConcern) ? taskData.whomItMayConcern.map(extractId).filter(Boolean) : [],
                });

                await task.save();

                // Migrate subTasks to TaskTicket (GAIA)
                if (taskData.subTasks && Array.isArray(taskData.subTasks)) {
                    for (const sub of taskData.subTasks) {
                        const ticket = new TaskTicket({
                            taskId: task._id,
                            mainCategory: sub.status === "Resolved" ? "Resolved" : "Todo",
                            status: sub.status === "Closed" ? "Closed" : (sub.status === "Open" ? "Todo" : "Todo"),
                            note: sub.note || sub.title || "",
                            eventDate: parseDate(sub.dateTime) || new Date(),
                            recordedBy: task.createdBy
                        });
                        await ticket.save();
                    }
                }

                results.success++;
            } catch (err) {
                console.error(`Error migrating task ${taskData.slid}:`, err.message);
                results.errors++;
            }
        }

        console.log("\nMigration summary:");
        console.log(`- Success: ${results.success}`);
        console.log(`- Errors: ${results.errors}`);
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrate();
