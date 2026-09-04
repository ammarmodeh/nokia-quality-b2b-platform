import mongoose from "mongoose";

const labAssessmentSchema = new mongoose.Schema(
  {
    fieldTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FieldTeams",
      required: [true, "Field Team is required"],
    },
    fieldTeamName: {
      type: String,
      trim: true,
    },
    assessorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assessor is required"],
    },
    conductedBy: {
      type: String,
      trim: true,
    },
    assessmentDate: {
      type: Date,
      default: Date.now,
    },
    assessmentType: {
      type: String,
      default: "E2E FTTH Practical Assessment",
    },
    ontModel: {
      type: String,
      default: "All Supported Models (ZTE F6600P, Nokia G-2426G-P, Nokia G-140W-H)",
    },
    ontType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ONTType",
      required: false,
    },
    // Field Team Profile & Safety Compliance
    experienceYears: {
      type: Number,
      default: 0,
    },
    experienceMonths: {
      type: Number,
      default: 0,
    },
    experienceDays: {
      type: Number,
      default: 0,
    },
    yearsOfExperience: {
      type: Number,
      default: 0,
    },
    employmentType: {
      type: String,
      enum: ["Employee", "Subcontractor"],
      default: "Subcontractor",
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    age: {
      type: Number,
      default: null,
    },
    certificates: {
      dd: { type: Boolean, default: false }, // DD: Defensive Driving
      es: { type: Boolean, default: false }, // ES: Electrical Safety
      fa: { type: Boolean, default: false }, // FA: First Aid
      ff: { type: Boolean, default: false }, // FF: Fire Fighting
      ra: { type: Boolean, default: false }, // RA: Risk Assessment
      wah: { type: Boolean, default: false }, // WAH: Work at Height
    },
    // Optical & Physical Measured Values
    measuredValues: {
      fdbSplitterPower: { type: String, default: "" }, // e.g. -18.5 dBm
      otoLinkLoss: { type: String, default: "" },      // e.g. 0.35 dB
      otoReceivedPower: { type: String, default: "" },  // e.g. -19.2 dBm
      ontReceivedPower: { type: String, default: "" },  // e.g. -19.4 dBm
    },
    // Tools & Equipment Readiness Checklist
    equipmentChecklist: [
      {
        toolName: { type: String, required: true },
        status: {
          type: String,
          enum: ["Valid", "Need Maintenance", "Not Valid", "Available", "Not Available", "Not Existing", "N/A"],
          default: "Valid",
        },
        notes: { type: String, default: "" },
      },
    ],
    // Structured 7 Assessment Sections
    sections: [
      {
        sectionId: { type: String, required: true },
        sectionTitle: { type: String, required: true },
        score: { type: Number, default: 0 },
        maxScore: { type: Number, default: 0 },
        checkpoints: [
          {
            id: { type: String },
            name: { type: String, required: true },
            subSection: { type: String },
            status: {
              type: String,
              enum: ["Pass", "Fail", "N/A"],
              default: "Pass",
            },
            score: { type: Number, default: 5 }, // 0 to 5
            isCompleted: { type: Boolean, default: true },
            measuredValue: { type: String, default: "" },
            notes: { type: String, default: "" },
          },
        ],
      },
    ],
    // Legacy / Flat checkpoints support for backward compatibility
    checkpoints: [
      {
        name: { type: String, required: true },
        isCompleted: { type: Boolean, default: false },
        score: { type: Number, default: 0 },
        notes: { type: String, trim: true },
      },
    ],
    sectionScores: {
      type: Map,
      of: Number,
      default: {},
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    totalScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    status: {
      type: String,
      default: "Completed",
    },
    feedback: {
      type: String,
      trim: true,
    },
    comments: {
      type: String,
      trim: true,
    },
    splicingMachineStatus: {
      type: String,
      default: "Good",
    },
    electrodeLifetime: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Pre-save hook to calculate section and overall scores
labAssessmentSchema.pre("save", function (next) {
  if (this.sections && this.sections.length > 0) {
    let totalScoreObtained = 0;
    let totalMaxPossible = 0;
    const scoresMap = {};

    this.sections.forEach((section) => {
      let secScore = 0;
      let secMax = 0;
      const isSec7 = section.sectionId === "sec-7"; // Informational awareness section, excluded from scoring penalty

      const isSec8 = section.sectionId === "sec-8" || section.sectionTitle?.includes("Photo") || section.sectionTitle?.includes("Self-Assessment");

      if (section.checkpoints && section.checkpoints.length > 0) {
        section.checkpoints.forEach((cp) => {
          if (cp.status !== "N/A") {
            const isSec8Cp = isSec8 || cp.id === "cp-8-photos-self-assess" || cp.name?.includes("Photo") || cp.name?.includes("Self-Assessment");
            const cpMax = isSec8Cp ? 10 : 5;
            secMax += cpMax;
            const cpScore = cp.score !== undefined ? cp.score : (cp.status === "Pass" ? cpMax : 0);
            secScore += Math.min(cpMax, Math.max(0, Number(cpScore)));
          }
        });
      }
      section.score = secScore;
      section.maxScore = secMax;
      scoresMap[section.sectionId] = secMax > 0 ? Math.round((secScore / secMax) * 100) : 100;

      if (!isSec7) {
        totalScoreObtained += secScore;
        totalMaxPossible += secMax;
      }
    });

    this.sectionScores = scoresMap;
    const computedPercentage = totalMaxPossible > 0 ? Math.round((totalScoreObtained / totalMaxPossible) * 100) : 0;

    if (this.overallScore === undefined || this.overallScore === null) {
      this.overallScore = computedPercentage;
    }
    this.totalScore = this.overallScore !== undefined ? this.overallScore : computedPercentage;
  } else if (this.checkpoints && this.checkpoints.length > 0 && (!this.totalScore || this.totalScore === 0)) {
    const sum = this.checkpoints.reduce((acc, cp) => acc + (Number(cp.score) || 0), 0);
    const max = this.checkpoints.length * 5;
    const pct = max > 0 ? Math.round((sum / max) * 100) : 0;
    this.totalScore = pct;
    this.overallScore = pct;
  }
  next();
});

export const LabAssessment = mongoose.model("LabAssessment", labAssessmentSchema);
