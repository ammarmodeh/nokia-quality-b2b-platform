import mongoose from "mongoose";

const trashSchema = new mongoose.Schema(
  {
    // Snapshot of the task data (Flexible storage)
    slid: { type: String, required: [true, "SLID is required"], trim: true },
    requestNumber: { type: Number },

    // Original Task Metadata
    originalTaskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },

    // Store the entire task object as a flexible field to ensure nothing is lost
    taskData: { type: mongoose.Schema.Types.Mixed },

    // Denormalized search-friendly fields (Optional for trash visibility)
    customerName: { type: String },
    contactNumber: { type: String },
    operation: { type: String },
    teamName: { type: String },
    status: { type: String },
    priority: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Deletion Metadata
    deletedAt: { type: Date, default: Date.now },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    strict: false // Allow saving fields not explicitly defined
  }
);

export const TrashSchema = mongoose.model("Trash", trashSchema);
