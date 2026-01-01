import mongoose from "mongoose";

const labAssessmentSchema = new mongoose.Schema(
  {
    fieldTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FieldTeams",
      required: [true, "Field Team is required"],
    },
    assessorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assessor is required"],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    ontType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ONTType",
      required: [true, "ONT Type is required"],
    },
    checkpoints: [
      {
        name: { type: String, required: true },
        isCompleted: { type: Boolean, default: false },
        score: { type: Number, default: 0 },
        notes: { type: String, trim: true },
      },
    ],
    comments: {
      type: String,
      trim: true,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const LabAssessment = mongoose.model("LabAssessment", labAssessmentSchema);
