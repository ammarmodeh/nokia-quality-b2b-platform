import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { TaskSchema } from "./models/taskModel.js";

const rename = async () => {
  try {
    await connectDB();
    
    // Rename the field directly in MongoDB
    const result = await TaskSchema.collection.updateMany(
      {}, 
      { $rename: { accountability: "teamAccountability" } }
    );
    
    console.log(`Rename completed. Field 'accountability' renamed to 'teamAccountability' in ${result.modifiedCount} documents.`);
    process.exit(0);
  } catch (error) {
    console.error("Rename failed:", error);
    process.exit(1);
  }
};

rename();
