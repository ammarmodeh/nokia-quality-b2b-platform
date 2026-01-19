import mongoose from "mongoose";
import dotenv from "dotenv";
import { FieldAuditUser } from "./models/fieldAuditUser.js";
import { connectDB } from "./config/db.js";

dotenv.config();
connectDB();

const seedAdmin = async () => {
  try {
    const adminExists = await FieldAuditUser.findOne({ username: "admin" });
    if (adminExists) {
      console.log("Admin already exists");
      process.exit();
    }

    await FieldAuditUser.create({
      name: "Super Admin",
      username: "admin",
      password: "password123", // Change this immediately
      role: "Admin"
    });

    console.log("Admin user created successfully");
    console.log("Username: admin");
    console.log("Password: password123");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedAdmin();
