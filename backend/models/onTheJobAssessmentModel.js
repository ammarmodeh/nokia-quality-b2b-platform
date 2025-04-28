// Updated assessment schema
import mongoose from "mongoose";

const assessmentSchema = new mongoose.Schema(
  {
    fieldTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FieldTeams",
      required: true,
    },
    fieldTeamName: {
      type: String,
      required: true,
    },
    assessmentDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    conductedBy: {
      type: String,
      required: true,
    },
    checkPoints: [
      {
        name: {
          type: String,
          required: true,
        },
        description: {
          type: String,
        },
        category: {
          type: String,
          required: true,
          enum: ["Equipment", "Splicing", "Configuration", "Validation", "Customer", "Service"],
        },
        isCompleted: {
          type: Boolean,
          default: false,
        },
        score: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
        notes: {
          type: String,
        },
      },
    ],
    categoryWeights: {
      Equipment: { type: Number, default: 0.10 },
      Splicing: { type: Number, default: 0.25 },
      Configuration: { type: Number, default: 0.20 },
      Validation: { type: Number, default: 0.10 },
      Customer: { type: Number, default: 0.20 },
      Service: { type: Number, default: 0.25 },
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    categoryScores: {
      Equipment: { type: Number, default: 0 },
      Splicing: { type: Number, default: 0 },
      Configuration: { type: Number, default: 0 },
      Validation: { type: Number, default: 0 },
      Customer: { type: Number, default: 0 },
      Service: { type: Number, default: 0 },
    },
    status: {
      type: String,
      default: "Completed",
    },
    feedback: {
      type: String,
    },
    attachments: [
      {
        url: String,
        name: String,
        type: String,
      },
    ],
  },
  { timestamps: true }
);

// Calculate overall score and category scores before saving
assessmentSchema.pre("save", function (next) {
  if (this.checkPoints && this.checkPoints.length > 0) {
    // Group checkpoints by category
    const categories = this.checkPoints.reduce((acc, checkpoint) => {
      const category = checkpoint.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(checkpoint);
      return acc;
    }, {});

    // Calculate category scores
    let weightedSum = 0;

    Object.entries(categories).forEach(([category, points]) => {
      const categoryScore = points.reduce((sum, point) => sum + point.score, 0) / points.length;
      this.categoryScores[category] = Math.round(categoryScore);

      const weight = this.categoryWeights[category] || 0;
      weightedSum += categoryScore * weight;
    });

    this.overallScore = Math.round(weightedSum);
  }
  next();
});

export const OnTheJobAssessment = mongoose.model(
  "OnTheJobAssessment",
  assessmentSchema
);