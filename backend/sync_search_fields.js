import mongoose from "mongoose";
import dotenv from "dotenv";
import { TaskSchema } from "./models/taskModel.js";
import { Customer } from "./models/customerModel.js";
import { TechnicalDetail } from "./models/technicalDetailModel.js";

dotenv.config();

const syncSearchFields = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB for synchronization...");

        const tasks = await TaskSchema.find({}).populate("customer").populate("technicalDetails");
        console.log(`Syncing ${tasks.length} tasks...`);

        for (const task of tasks) {
            let updated = false;

            if (task.customer && task.customer.customerName && task.customerName !== task.customer.customerName) {
                task.customerName = task.customer.customerName;
                updated = true;
            }
            if (task.customer && task.customer.contactNumber && task.contactNumber !== task.customer.contactNumber) {
                task.contactNumber = task.customer.contactNumber;
                updated = true;
            }
            if (task.technicalDetails && task.technicalDetails.operation && task.operation !== task.technicalDetails.operation) {
                task.operation = task.technicalDetails.operation;
                updated = true;
            }
            if (task.technicalDetails && task.technicalDetails.rootCause && task.rootCause !== task.technicalDetails.rootCause) {
                task.rootCause = task.technicalDetails.rootCause;
                updated = true;
            }
            if (task.technicalDetails && task.technicalDetails.subReason && task.subReason !== task.technicalDetails.subReason) {
                task.subReason = task.technicalDetails.subReason;
                updated = true;
            }

            if (updated) {
                await task.save();
            }
        }

        console.log("Synchronization completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Synchronization failed:", error);
        process.exit(1);
    }
};

syncSearchFields();
