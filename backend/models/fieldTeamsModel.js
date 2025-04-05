import mongoose from "mongoose";

const fieldTeamsSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
      required: [true, "Team Name is required"],
      trim: true,
    },
    teamCompany: {
      type: String,
      required: [true, "Team Company is required"],
      trim: true,
    },
    contactNumber: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"],
    },
    fsmSerialNumber: {
      type: String,
    },
    laptopSerialNumber: {
      type: String,
    },
    evaluationScore: {
      type: String,
      required: [true, "Evaluation score is required"],
      default: "0/0 0%",
    },
    evaluationHistory: [
      {
        score: String,
        date: { type: Date, default: Date.now },
      },
    ],
    isEvaluated: {
      type: Boolean,
      default: false,
    },
    lastEvaluationDate: {
      type: Date,
      default: null,
    },
    quizCode: {
      type: String,
      required: true,
      unique: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspensionStartDate: {
      type: Date,
      default: null,
    },
    suspensionEndDate: {
      type: Date,
      default: null,
    },
    suspensionReason: {
      type: String,
      default: null,
    },
    isTerminated: {
      type: Boolean,
      default: false,
    },
    terminationReason: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isOnLeave: {
      type: Boolean,
      default: false,
    },
    leaveReason: {
      type: String,
      default: null,
    },
    leaveStartDate: {
      type: Date,
      default: null,
    },
    leaveEndDate: {
      type: Date,
      default: null,
    },
    isResigned: {
      type: Boolean,
      default: false,
    },
    resignationReason: {
      type: String,
      default: null,
    },
    stateLogs: [
      {
        state: { type: String, enum: ["Active", "Suspended", "Terminated", "On Leave", "Resigned"], required: true },
        reason: { type: String, default: null },
        startDate: { type: Date, default: null },
        endDate: { type: Date, default: null },
        changedAt: { type: Date, default: Date.now },
      },
    ],
    sessionHistory: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        sessionDate: { type: Date, required: true },
        conductedBy: { type: String, required: true },
        sessionTitle: { type: String },
        outlines: { type: String },
        notes: { type: String, default: "" },
        status: {
          type: String,
          enum: ["Completed", "Missed", "Cancelled"],
          default: "Completed"
        },
        violationPoints: { type: Number, default: 0 },
        reason: { type: String, default: "" },
        violationType: { type: String }, // Added this field to replace violations.type
      },
    ],

    totalViolationPoints: {
      type: Number,
      default: 0
    },

    canTakeQuiz: {
      type: Boolean,
      default: false, // Default to true so existing teams can take the quiz
    },

    role: {
      type: String,
      default: "fieldTeam",
      enum: ["fieldTeam"], // Add other roles as needed
    },
  },
  { timestamps: true }
);

// Add indexes here, before creating the model
fieldTeamsSchema.index({ quizCode: 1, canTakeQuiz: 1 }); // For quick validation checks
fieldTeamsSchema.index({ isEvaluated: 1, lastEvaluationDate: 1 }); // For reporting

export const FieldTeamsSchema = mongoose.model("FieldTeams", fieldTeamsSchema);