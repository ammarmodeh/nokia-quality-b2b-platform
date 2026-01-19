import mongoose from "mongoose";

const fieldAuditTaskSchema = new mongoose.Schema(
  {
    slid: {
      type: String,
      required: [true, "SLID is required"],
      index: true,
      trim: true,
    },
    scheduledDate: { type: Date, default: Date.now, index: true }, // Targeted Execution Date
    isVisible: { type: Boolean, default: true }, // Visibility Control
    auditor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FieldAuditUser",
      required: false, // Can be unassigned initially
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Submitted", "Rejected", "Approved"],
      default: "Pending"
    },
    siteDetails: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      // This will store the arbitrary columns from the CSV
    },
    checklist: [
      {
        checkpointName: { type: String, required: true },
        status: { type: String, enum: ["OK", "N.OK", "N/A", "Pending"], default: "Pending" },
        inputValue: { type: String, default: "" },
        notes: { type: String, default: "" }, // Explicit notes field
        required: { type: Boolean, default: true }
      }
    ],
    photos: [
      {
        url: { type: String, required: true },
        checkpointName: { type: String }, // Which checkpoint required this photo?
        uploadedAt: { type: Date, default: Date.now },
        description: { type: String }
      }
    ],
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // The global admin who uploaded this task
      required: false
    }
  },
  { timestamps: true }
);

export const FieldAuditTask = mongoose.model("FieldAuditTask", fieldAuditTaskSchema);
