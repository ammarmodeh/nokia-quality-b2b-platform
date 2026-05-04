import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { TaskSchema } from "./models/taskModel.js";

const cleanup = async () => {
  try {
    await connectDB();
    
    // Use $unset to remove the field from all documents in the collection
    const result = await TaskSchema.updateMany({}, { $unset: { isTeamAccountable: 1 } });
    
    console.log(`Cleanup completed. Field 'isTeamAccountable' removed from ${result.modifiedCount} documents.`);
    process.exit(0);
  } catch (error) {
    console.error("Cleanup failed:", error);
    process.exit(1);
  }
};

cleanup();
