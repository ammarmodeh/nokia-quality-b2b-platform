import mongoose from "mongoose";
import dotenv from "dotenv";
import { TaskSchema } from "./models/taskModel.js";
import { Customer } from "./models/customerModel.js";
import { TechnicalDetail } from "./models/technicalDetailModel.js";
import { TaskTicket } from "./models/taskTicketModel.js";

dotenv.config();

const migrateData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB for migration...");

        const tasks = await TaskSchema.find({
            $or: [
                { customer: { $exists: false } },
                { technicalDetails: { $exists: false } }
            ]
        });

        console.log(`Found ${tasks.length} tasks to migrate.`);

        for (const task of tasks) {
            // 1. Create Customer entry
            const customer = new Customer({
                taskId: task._id,
                customerName: task.customerName,
                customerType: task.customerType,
                contactNumber: task.contactNumber,
                governorate: task.governorate,
                district: task.district,
                customerFeedback: task.customerFeedback,
            });

            // 2. Create TechnicalDetail entry
            const technicalDetail = new TechnicalDetail({
                taskId: task._id,
                operation: task.operation,
                tarrifName: task.tarrifName,
                speed: task.speed,
                ontType: task.ontType,
                freeExtender: task.freeExtender,
                extenderType: task.extenderType,
                extenderNumber: task.extenderNumber,
                reason: task.reason,
                subReason: task.subReason,
                rootCause: task.rootCause,
            });

            // 3. Create initial ticket from subtasks if any, or just a creation ticket
            const tickets = [];
            if (task.subTasks && task.subTasks.length > 0) {
                task.subTasks.forEach(st => {
                    if (st.note || st.status === "Closed") {
                        tickets.push(new TaskTicket({
                            taskId: task._id,
                            mainCategory: st.status === "Closed" ? "Resolved" : "Visited",
                            status: task.status,
                            note: st.note,
                            recordedBy: task.createdBy,
                            timestamp: st.dateTime || task.createdAt
                        }));
                    }
                });
            }

            if (tickets.length === 0) {
                tickets.push(new TaskTicket({
                    taskId: task._id,
                    mainCategory: "Todo",
                    status: "Todo",
                    note: "Migrated from old system",
                    recordedBy: task.createdBy,
                }));
            }

            // Save new entries
            await customer.save();
            await technicalDetail.save();
            for (const ticket of tickets) {
                await ticket.save();
            }

            // Update Task with references
            task.customer = customer._id;
            task.technicalDetails = technicalDetail._id;
            await task.save();

            console.log(`Migrated task: ${task._id}`);
        }

        console.log("Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrateData();
