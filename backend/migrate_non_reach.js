import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { TaskSchema } from "./models/taskModel.js";

const migrate = async () => {
  try {
    await connectDB();
    
    // Find all tasks where accountability is not "Yes" and set them to "No"
    const result = await TaskSchema.updateMany(
      { accountability: { $ne: "Yes" } },
      { $set: { accountability: "No" } }
    );
    
    console.log(`Migration completed. ${result.modifiedCount} tasks updated to accountability: "No".`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrate();
