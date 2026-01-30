import mongoose from "mongoose";
import dotenv from "dotenv";
import { TaskSchema } from "./models/taskModel.js";
import { Customer } from "./models/customerModel.js";
import { TechnicalDetail } from "./models/technicalDetailModel.js";
import { TaskTicket } from "./models/taskTicketModel.js";

dotenv.config();

const verifyMigration = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for verification...");

        const taskCount = await TaskSchema.countDocuments();
        const customerCount = await Customer.countDocuments();
        const technicalDetailCount = await TechnicalDetail.countDocuments();
        const ticketCount = await TaskTicket.countDocuments();

        console.log("Verification Summary:");
        console.log(`- Total Tasks: ${taskCount}`);
        console.log(`- Total Customers: ${customerCount}`);
        console.log(`- Total Technical Details: ${technicalDetailCount}`);
        console.log(`- Total GAIA Tickets: ${ticketCount}`);

        // Check if some tasks have refs
        const tasksWithRefs = await TaskSchema.countDocuments({
            customer: { $exists: true },
            technicalDetails: { $exists: true }
        });
        console.log(`- Tasks with valid refs: ${tasksWithRefs}`);

        if (tasksWithRefs === taskCount) {
            console.log("All tasks are correctly linked to customer and technical details.");
        } else {
            console.warn(`${taskCount - tasksWithRefs} tasks are missing links!`);
        }

        process.exit(0);
    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    }
};

verifyMigration();
