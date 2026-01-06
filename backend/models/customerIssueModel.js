import mongoose from "mongoose";

const customerIssueSchema = new mongoose.Schema({
  slid: { type: String, required: true },
  pisDate: {
    type: Date,
    required: false, // Changed from true
    default: null
  },
  from: { type: String, required: true },
  reporter: { type: String, required: true },
  reporterNote: { type: String },
  contactMethod: {
    type: String,
    required: true
  },
  // issueCategory: { type: String, required: true }, // Deprecated
  issues: [{
    category: { type: String, required: true },
    subCategory: { type: String }
  }],
  // REMOVED: issueDetails field
  teamCompany: {
    type: String,
    required: true
  },
  date: { type: Date, default: Date.now },
  solved: {
    type: String,
    required: true,
    enum: ['yes', 'no'],
    default: 'no'
  },
  resolveDate: { type: Date },
  closedBy: { type: String }, // Returned as Supervisor
  resolutionDetails: { type: String },
  assignedTo: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const CustomerIssueSchema = mongoose.model('CustomerIssue', customerIssueSchema);