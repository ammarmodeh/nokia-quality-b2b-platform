import mongoose from "mongoose";
import dotenv from "dotenv";
import { TaskSchema } from "./models/taskModel.js";
import { TaskTicket } from "./models/taskTicketModel.js";

dotenv.config();

const verifyMigration = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for verification...");

        const taskCount = await TaskSchema.countDocuments();
        const ticketCount = await TaskTicket.countDocuments();

        console.log("Verification Summary:");
        console.log(`- Total Tasks: ${taskCount}`);
        console.log(`- Total GAIA Tickets: ${ticketCount}`);

        // Check a sample task
        const sampleTask = await TaskSchema.findOne();
        if (sampleTask) {
            console.log("\nSample Task Data:");
            console.log(`- SLID: ${sampleTask.slid}`);
            console.log(`- Customer Name: ${sampleTask.customerName}`);
            console.log(`- Operation: ${sampleTask.operation}`);
            console.log(`- CreatedBy: ${sampleTask.createdBy}`);
            console.log(`- AssignedTo: ${JSON.stringify(sampleTask.assignedTo)}`);
        }

        process.exit(0);
    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    }
};

verifyMigration();
