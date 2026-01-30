import mongoose from "mongoose"

export const connectDB = async () => {
  try {
    console.log("========================================");
    console.log("🔄 Attempting to connect to MongoDB...");
    console.log("========================================");

    // Verify MONGO_URI exists
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables!");
    }

    // Log partial connection string for debugging (hide password)
    const uriPreview = process.env.MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log("📍 Connection URI:", uriPreview);

    // Connection options with increased timeout
    const options = {
      serverSelectionTimeoutMS: 30000, // Increased to 30s
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(process.env.MONGO_URI, options);

    console.log("========================================");
    console.log("✅ MongoDB Connected Successfully!");
    console.log("========================================");

    // Monitor connection events
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ Mongoose disconnected from MongoDB');
      console.warn('⚠️ Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ Mongoose reconnected to MongoDB');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error("========================================");
    console.error("❌ CRITICAL: MongoDB Connection Failed!");
    console.error("========================================");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);

    if (error.name === 'MongoServerSelectionError') {
      console.error("");
      console.error("⚠️ COMMON CAUSES:");
      console.error("  1. Internet connection issues");
      console.error("  2. IP not whitelisted in MongoDB Atlas");
      console.error("  3. Incorrect MONGO_URI");
      console.error("  4. MongoDB Atlas cluster is paused");
      console.error("");
    }

    console.error("Full error stack:", error.stack);
    console.error("========================================");

    // Exit the process on connection failure
    console.error("⛔ Exiting process due to MongoDB connection failure...");
    process.exit(1);
  }
};

