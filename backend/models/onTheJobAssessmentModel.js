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
    conductedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
          enum: [
            "Splicing & Testing Equipment",
            "Fiber Optic Splicing Skills",
            "ONT Placement, Configuration and testing",
            "Customer Education",
            "Customer Service Skills"
          ],
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
      "Splicing & Testing Equipment": { type: Number, default: 0.20 },
      "Fiber Optic Splicing Skills": { type: Number, default: 0.20 },
      "ONT Placement, Configuration and testing": { type: Number, default: 0.20 },
      "Customer Education": { type: Number, default: 0.20 },
      "Customer Service Skills": { type: Number, default: 0.20 }
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    categoryScores: {
      "Splicing & Testing Equipment": { type: Number, default: 0 },
      "Fiber Optic Splicing Skills": { type: Number, default: 0 },
      "ONT Placement, Configuration and testing": { type: Number, default: 0 },
      "Customer Education": { type: Number, default: 0 },
      "Customer Service Skills": { type: Number, default: 0 }
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
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Calculate overall score and category scores before saving
assessmentSchema.pre("save", function (next) {
  if (this.overallScore !== undefined && this.overallScore !== null) {
    // Skip recalculation if overallScore is already set
    return next();
  }

  if (this.checkPoints && this.checkPoints.length > 0) {
    // Calculate the total score by summing all checkpoint scores
    const totalScore = this.checkPoints.reduce((sum, checkpoint) => sum + checkpoint.score, 0);

    // Calculate the average score
    const averageScore = totalScore / this.checkPoints.length;

    // Set the overall score
    this.overallScore = Math.round(averageScore); // You can remove Math.round if you want the exact value

    // Calculate category scores
    const categories = this.checkPoints.reduce((acc, checkpoint) => {
      const category = checkpoint.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(checkpoint);
      return acc;
    }, {});

    Object.entries(categories).forEach(([category, points]) => {
      const categoryScore = points.reduce((sum, point) => sum + point.score, 0) / points.length;
      this.categoryScores[category] = Math.round(categoryScore); // You can remove Math.round if you want the exact value
    });
  }
  next();
});


export const OnTheJobAssessment = mongoose.model(
  "OnTheJobAssessment",
  assessmentSchema
);