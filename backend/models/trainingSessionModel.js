import mongoose from "mongoose";

const trainingSessionSchema = new mongoose.Schema(
  {
    sessionDate: { type: Date, required: true },
    conductedBy: [{ type: String, required: true }],
    sessionTitle: { type: String, required: true },
    location: { type: String },
    sessionType: { type: String },
    duration: { type: String },
    outlines: [
      {
        mainTopic: { type: String, required: true },
        subTopics: [{ type: String }]
      }
    ],
    notes: { type: String, default: "" },
    violationPoints: { type: Number, default: 0 },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FieldTeams"
      }
    ],
    isTemplate: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Index to quickly find recent sessions for templates
trainingSessionSchema.index({ sessionTitle: 1, sessionDate: -1 });

export const TrainingSession = mongoose.model("TrainingSession", trainingSessionSchema);
