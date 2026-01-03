import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    projectName: {
      type: String,
      default: "OrangeJO FTTH QoS",
      trim: true,
    },
    projectBrief: {
      type: String,
      default: "Project management and quality assessment platform.",
    },
    globalTimer: {
      type: Number,
      default: 60, // Default timer in minutes or seconds depending on implementation
    },
    sessionTimeout: {
      type: Number,
      default: 30, // Default session timeout in minutes
    },
    projectID: {
      type: String,
      default: "PRJ-001",
    },
    clientName: {
      type: String,
      default: "Orange Jordan",
    },
    projectManager: {
      type: String,
      default: "Ammar Modeh",
    },
    thresholds: {
      pass: { type: Number, default: 85 },
      average: { type: Number, default: 70 },
      fail: { type: Number, default: 50 },
      quizPassScore: { type: Number, default: 70 },
      labPassScore: { type: Number, default: 75 },
    },
    notifications: {
      emailAlerts: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const Settings = mongoose.model("Settings", settingsSchema);
