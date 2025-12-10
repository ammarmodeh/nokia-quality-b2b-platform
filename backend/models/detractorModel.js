import mongoose from "mongoose";

const detractorSchema = new mongoose.Schema({
  // Flexible Schema: All other fields (Name, Score, etc.) are stored dynamically via strict: false

  uploadDate: {
    type: Date,
    default: Date.now,
  },
  fileName: {
    type: String,
    default: "Unknown File",
  },
  auditStatus: {
    type: String,
    enum: ["Pending", "Confirmed"],
    default: "Confirmed",
  },
}, { timestamps: true, strict: false }); // strict: false allows saving extra fields not matched in schema

const Detractor = mongoose.model("Detractor", detractorSchema);

export default Detractor;
