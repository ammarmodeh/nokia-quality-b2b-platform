import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { TaskSchema } from "./models/taskModel.js";

const migrate = async () => {
  try {
    await connectDB();
    
    // Find all tasks that have at least one owner containing "reach"
    const tasks = await TaskSchema.find({ responsible: { $regex: /reach/i } });
    console.log(`Found ${tasks.length} tasks with potential Reach ownership.`);

    let totalUpdated = 0;

    for (const task of tasks) {
      const resps = task.responsible || [];
      
      // If any owner in the array is Reach, the whole task gets accountability: "Yes"
      const hasReach = resps.some(owner => owner && owner.toLowerCase().includes("reach"));

      if (hasReach) {
        task.accountability = "Yes";
        await task.save();
        totalUpdated++;
      }
    }

    console.log(`Migration completed. ${totalUpdated} tasks updated to accountability: "Yes".`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrate();
