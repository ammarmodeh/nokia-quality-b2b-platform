import mongoose from "mongoose"

export const connectDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB...");

    // Connection options to help with DNS resolution and timeouts
    const options = {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    };

    await mongoose.connect(process.env.MONGO_URI, options);
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      syscall: error.syscall,
      hostname: error.hostname
    });
    // process.exit(1); // Do not exit process, allow server to run for debugging or retry
  }
};
