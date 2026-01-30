import mongoose from "mongoose";
import dotenv from "dotenv";
import { TaskSchema } from "./models/taskModel.js";
import { TaskTicket } from "./models/taskTicketModel.js";

dotenv.config();

const verifyMigration = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for v5 verification...");

        const taskCount = await TaskSchema.countDocuments();
        const ticketCount = await TaskTicket.countDocuments();

        console.log("Verification Summary:");
        console.log(`- Total Tasks: ${taskCount}`);
        console.log(`- Total GAIA Tickets: ${ticketCount}`);

        const mappedTasks = await TaskSchema.countDocuments({ teamId: { $ne: null } });
        console.log(`- Tasks with mapped teamId: ${mappedTasks}`);

        // Check a sample task that should have a mapped team
        const sampleTask = await TaskSchema.findOne({ teamName: { $ne: null }, teamId: { $ne: null } });
        if (sampleTask) {
            console.log("\nSample Mapped Task Data:");
            console.log(`- SLID: ${sampleTask.slid}`);
            console.log(`- Team Name: ${sampleTask.teamName}`);
            console.log(`- Team ID: ${sampleTask.teamId}`);
        } else {
            console.log("\nNo tasks found with both teamName and teamId.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    }
};

verifyMigration();
