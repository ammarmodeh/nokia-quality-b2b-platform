
import mongoose from "mongoose";

const AIReportSchema = new mongoose.Schema({
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for now, but good to have
  },
  period: {
    type: String, // 'ytd', 'last_month', 'custom', etc.
    required: true
  },
  periodTitle: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: false
  },
  analysis: {
    type: String, // The full markdown report
    required: true
  },
  metadata: {
    totalCases: Number,
    closureRate: String,
    totalTeams: Number,
    detractorLimitPerTeam: Number
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export const AIReport = mongoose.model("AIReport", AIReportSchema);
