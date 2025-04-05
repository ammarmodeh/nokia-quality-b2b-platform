import mongoose from "mongoose";

const customerIssueSchema = new mongoose.Schema({
  slid: { type: String, required: true },
  pisDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  from: { type: String, required: true },
  reporter: { type: String, required: true },
  reporterNote: { type: String },
  contactMethod: {
    type: String,
    required: true,
    enum: ['Phone call', 'WhatsApp private message', 'WhatsApp group message']
  },
  issueCategory: { type: String, required: true },
  // REMOVED: issueDetails field
  teamCompany: {
    type: String,
    required: true,
    enum: ['Barium 1', 'Barium 2', 'Barium 3', 'Barium 4', 'Al-Dar 2', 'Orange Team', 'Others']
  },
  date: { type: Date, default: Date.now },
  solved: {
    type: String,
    required: true,
    enum: ['yes', 'no'],
    default: 'no'
  },
  resolutionDetails: { type: String },
  assignedTo: { type: String, required: true },
  assignedNote: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const CustomerIssueSchema = mongoose.model('CustomerIssue', customerIssueSchema);