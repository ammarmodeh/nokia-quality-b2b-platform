import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { TaskSchema } from "./models/taskModel.js";

const cleanup = async () => {
  try {
    await connectDB();
    
    // Use direct collection access to bypass Mongoose schema logic
    const result = await TaskSchema.collection.updateMany(
      {}, 
      { $unset: { isTeamAccountable: "" } }
    );
    
    console.log(`Direct Cleanup completed. Field 'isTeamAccountable' unset in ${result.modifiedCount} documents.`);
    
    // Verify on one document
    const verify = await TaskSchema.collection.findOne({ isTeamAccountable: { $exists: true } });
    if (verify) {
      console.log("WARNING: Field still exists in at least one document!", verify._id);
    } else {
      console.log("Verification successful: No documents found with 'isTeamAccountable'.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Cleanup failed:", error);
    process.exit(1);
  }
};

cleanup();
