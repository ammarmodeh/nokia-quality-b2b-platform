import mongoose from "mongoose";
import dns from "dns";

/**
 * Connects to MongoDB.
 * Re-added dns.setServers fix because your network/ISP has trouble 
 * resolving MongoDB Atlas SRV records (ECONNREFUSED error).
 */
export const connectDB = async () => {
  try {
    // Force Google DNS to resolve MongoDB SRV records only for local development 
    // if it's needed. On Vercel, this can cause ERR_CONNECTION_RESET.
    if (process.env.NODE_ENV !== "production") {
      try {
        dns.setServers(['8.8.8.8', '8.8.4.4']);
      } catch (dnsErr) {
        console.warn("⚠️ Could not set DNS servers:", dnsErr.message);
      }
    }

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
    // In serverless environments like Vercel, process.exit(1) can cause ERR_CONNECTION_RESET.
    // We should throw or just log the error and let the app handle it via health checks.
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
  }
};

