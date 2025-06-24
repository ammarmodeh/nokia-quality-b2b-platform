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
  if (this.isModified('overallScore') && this.overallScore !== null) {
    return next();
  }

  if (this.checkPoints && this.checkPoints.length > 0) {
    // Calculate weighted scores
    let totalWeightedScore = 0;
    let totalPossibleWeight = 0;

    const categoryScores = {};
    const categoryCounts = {};

    // First pass: Calculate category averages
    this.checkPoints.forEach(checkpoint => {
      const category = checkpoint.category;

      if (!categoryScores[category]) {
        categoryScores[category] = 0;
        categoryCounts[category] = 0;
      }

      categoryScores[category] += checkpoint.score;
      categoryCounts[category]++;
    });

    // Second pass: Apply weights and calculate overall
    for (const category in categoryScores) {
      const averageScore = categoryScores[category] / categoryCounts[category];
      const weight = this.categoryWeights[category] || 1;

      totalWeightedScore += averageScore * weight;
      totalPossibleWeight += 100 * weight; // 100 is max score per category

      this.categoryScores[category] = Math.round(averageScore);
    }

    this.overallScore = Math.round((totalWeightedScore / totalPossibleWeight) * 100);
  }

  next();
});

assessmentSchema.pre("validate", function (next) {
  if (this.checkPoints) {
    for (const checkpoint of this.checkPoints) {
      // If equipment is marked as not available, score must be 0
      if (checkpoint.isAvailable === false && checkpoint.score !== 0) {
        checkpoint.score = 0;
      }

      // Splicing Equipment Condition (4 levels)
      if (checkpoint.name === "Splicing Equipment Condition (FSM)" ||
        checkpoint.name === "Testing Tools Condition (OPM and VFL)") {
        if (![0, 50, 75, 100].includes(checkpoint.score)) {
          this.invalidate(
            `checkPoints.${this.checkPoints.indexOf(checkpoint)}.score`,
            'Equipment score must be 0, 50, 75, or 100'
          );
        }
      }

      if (checkpoint.category === "Customer Service Skills") {
        if (checkpoint.name === "Appearance" && ![0, 30, 70, 100].includes(checkpoint.score)) {
          this.invalidate(
            `checkPoints.${this.checkPoints.indexOf(checkpoint)}.score`,
            'Appearance score must be 0, 30, 70, or 100'
          );
        }
        else if (checkpoint.name === "Communication" && ![0, 40, 80, 100].includes(checkpoint.score)) {
          this.invalidate(
            `checkPoints.${this.checkPoints.indexOf(checkpoint)}.score`,
            'Communication score must be 0, 40, 80, or 100'
          );
        }
        else if (checkpoint.name === "Patience and Precision" && ![0, 50, 85, 100].includes(checkpoint.score)) {
          this.invalidate(
            `checkPoints.${this.checkPoints.indexOf(checkpoint)}.score`,
            'Patience score must be 0, 50, 85, or 100'
          );
        }
      }

      // Consumables Availability (3 levels)
      else if (checkpoint.name === "Consumables Availability") {
        if (![0, 50, 100].includes(checkpoint.score)) {
          this.invalidate(
            `checkPoints.${this.checkPoints.indexOf(checkpoint)}.score`,
            'Availability score must be 0, 50, or 100'
          );
        }
      }
      // Other checkpoints (percentage-based)
      else {
        if (checkpoint.score < 0 || checkpoint.score > 100) {
          this.invalidate(
            `checkPoints.${this.checkPoints.indexOf(checkpoint)}.score`,
            'Score must be between 0 and 100'
          );
        }
      }
    }
  }
  next();
});

export const OnTheJobAssessment = mongoose.model(
  "OnTheJobAssessment",
  assessmentSchema
);