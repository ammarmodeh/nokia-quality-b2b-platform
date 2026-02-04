import mongoose from "mongoose";
import dns from "dns";

/**
 * Connects to MongoDB.
 * Re-added dns.setServers fix because your network/ISP has trouble 
 * resolving MongoDB Atlas SRV records (ECONNREFUSED error).
 */
export const connectDB = async () => {
  try {
    // Force Google DNS to resolve MongoDB SRV records
    dns.setServers(['8.8.8.8', '8.8.4.4']);

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI is not defined in environment variables!");
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => console.error('❌ MongoDB error:', err));
    mongoose.connection.on('disconnected', () => console.warn('⚠️ MongoDB disconnected'));

  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

