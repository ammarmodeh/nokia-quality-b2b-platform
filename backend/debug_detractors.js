import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Detractor from './models/detractorModel.js';

dotenv.config();

const runDebug = async () => {
  try {
    console.log("Connecting to DB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");

    const count = await Detractor.countDocuments();
    console.log(`\nTotal Detractor Documents: ${count}`);

    if (count === 0) {
      console.log("No data found. Upload might have failed.");
    } else {
      const samples = await Detractor.find().sort({ createdAt: -1 }).limit(2).lean();
      console.log("\nSample Data (First 2):");
      console.dir(samples, { depth: null });

      // Analyze keys
      const first = samples[0];
      const keys = Object.keys(first);
      console.log("\nKeys in first document:", keys);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
};

runDebug();
