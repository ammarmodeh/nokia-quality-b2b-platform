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
    // clientName: {
    //   type: String,
    //   default: "Reach -",
    // },
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
    npsTargets: {
      promoters: { type: Number, default: 75 },
      detractors: { type: Number, default: 9 },
    },
    notifications: {
      emailAlerts: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
    },
    weekStartDay: {
      type: Number,
      default: 0, // 0 = Sunday, 1 = Monday, etc.
      min: 0,
      max: 6,
    },
    week1StartDate: {
      type: Date,
      default: null,
    },
    week1EndDate: {
      type: Date,
      default: null,
    },
    startWeekNumber: {
      type: Number,
      default: 1,
    },
    month1StartDate: {
      type: Date,
      default: null,
    },
    month1EndDate: {
      type: Date,
      default: null,
    },
    // Dynamic Scoring Keys (Simple Label + Points)
    scoringKeys: [
      {
        label: { type: String, required: true },
        points: { type: Number, required: true, default: 0 },
        targetForm: {
          type: String,
          enum: ["Task", "Issue", "Both"],
          default: "Both"
        }
      }
    ],
  },
  { timestamps: true }
);

export const Settings = mongoose.model("Settings", settingsSchema);
