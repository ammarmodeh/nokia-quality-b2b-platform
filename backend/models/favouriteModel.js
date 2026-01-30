import mongoose from "mongoose";

const favouriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    originalTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true
    },
    // Flattened fields copied from Task
    slid: { type: String, required: true, trim: true },
    requestNumber: { type: Number, required: true },
    subtaskType: { type: String, trim: true, default: null },
    customerName: { type: String, trim: true },
    customerType: { type: String, trim: true, default: null },
    contactNumber: { type: String, trim: true },
    governorate: { type: String, default: null },
    district: { type: String, default: null },
    customerFeedback: { type: String, trim: true, default: null },
    operation: { type: String, trim: true },
    tarrifName: { type: String, trim: true, default: null },
    speed: { type: Number, default: null },
    ontType: { type: String, trim: true, default: null },
    freeExtender: { type: String, enum: ["Yes", "No", null], default: null },
    extenderType: { type: String, trim: true, default: null },
    extenderNumber: { type: Number, default: 0 },
    reason: { type: String, trim: true, default: null },
    subReason: { type: String, trim: true, default: null },
    rootCause: { type: String, trim: true, default: null },
    teamName: { type: String, trim: true, default: null },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "FieldTeams", default: null },
    teamCompany: { type: String, default: null },
    pisDate: { type: Date, default: null },
    responsible: { type: String, trim: true, default: null },
    interviewDate: { type: Date, default: null },
    priority: { type: String, default: "Normal" },
    status: { type: String, default: "Todo" },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    whomItMayConcern: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    category: { type: String },
    validationStatus: { type: String },
    evaluationScore: { type: Number, default: 1 },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
    strict: false // Allow for future Task model changes without breaking favorites
  }
);

export const FavouriteSchema = mongoose.model("Favourite", favouriteSchema);