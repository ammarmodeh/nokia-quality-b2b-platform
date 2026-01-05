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
        isAvailable: {
          type: Boolean,
          default: true,
        },
        score: {
          type: Number,
          min: 0,
          max: 5,
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
      max: 100, // Total score as percentage
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
  // If overallScore is manually provided as 0-100, we skip
  if (this.isModified('overallScore') && this.overallScore > 5) {
    return next();
  }

  if (this.checkPoints && this.checkPoints.length > 0) {
    let totalScore = 0;
    const categoryTotals = {};
    const categoryCounts = {};

    this.checkPoints.forEach(checkpoint => {
      const category = checkpoint.category;
      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
        categoryCounts[category] = 0;
      }
      categoryTotals[category] += checkpoint.score;
      categoryCounts[category]++;
      totalScore += checkpoint.score;
    });

    // Update category averages (as percentages)
    for (const category in categoryTotals) {
      const averagePercent = (categoryTotals[category] / (categoryCounts[category] * 5)) * 100;
      this.categoryScores[category] = Math.round(averagePercent);
    }

    // Update overall average (as percentage)
    const overallAvgPercent = (totalScore / (this.checkPoints.length * 5)) * 100;
    this.overallScore = Math.round(overallAvgPercent);
  }

  next();
});

// Remove the old validate hook entirely as it contains strict percentage logic
assessmentSchema.pre("validate", function (next) {
  if (this.checkPoints) {
    for (const checkpoint of this.checkPoints) {
      // Simple validation: scores must be between 0 and 5
      if (checkpoint.score < 0 || checkpoint.score > 5) {
        this.invalidate(
          `checkPoints.${this.checkPoints.indexOf(checkpoint)}.score`,
          'Score must be between 0 and 5'
        );
      }
    }
  }
  next();
});

export const OnTheJobAssessment = mongoose.model(
  "OnTheJobAssessment",
  assessmentSchema
);