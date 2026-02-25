import mongoose from "mongoose";

const customerIssueSchema = new mongoose.Schema({
  slid: { type: String, required: true },
  ticketId: { type: String, required: false },
  pisDate: {
    type: Date,
    required: false, // Changed from true
    default: null
  },
  from: { type: String, required: false }, // Keep for backward compatibility
  fromMain: { type: String, required: false },
  fromSub: { type: String },
  reporter: { type: String, required: false },
  reporterNote: { type: String },
  contactMethod: {
    type: String,
    required: false
  },
  // issueCategory: { type: String, required: true }, // Deprecated
  issues: [{
    category: { type: String, required: false },
    subCategory: { type: String }
  }],
  // REMOVED: issueDetails field
  teamCompany: {
    type: String,
    required: false
  },
  teamName: {
    type: String,
    required: false
  },
  teamCode: {
    type: String,
    required: false
  },
  customerName: {
    type: String,
    required: false  // Optional for backward compatibility with existing records
  },
  customerContact: {
    type: String,
    required: false  // Optional for backward compatibility with existing records
  },
  assigneeNote: {
    type: String,
    required: false
  },
  resolvedBy: {
    type: String,
    enum: ['Phone', 'Visit', ''],
    default: ''
  },
  date: { type: Date, required: false, default: null },
  solved: {
    type: String,
    required: true,
    enum: ['yes', 'no'],
    default: 'no'
  },
  resolveDate: { type: Date },
  closedBy: { type: String }, // Returned as Supervisor
  closedAt: { type: Date }, // Time of closure by Supervisor
  resolutionDetails: { type: String },
  assignedTo: { type: String, required: false },
  installingTeam: { type: String },
  dispatched: {
    type: String,
    enum: ['yes', 'no'],
    enum: ['yes', 'no'],
    default: 'no'
  },
  dispatchedAt: { type: Date },
  area: { type: String, required: false }, // Geographic area
  callerName: { type: String, required: false }, // Caller Name from dropdown
  callerDetails: { type: String, required: false }, // Caller details/note
  callDate: { type: Date, required: false }, // Date of the call
  isChecked: { type: Boolean, default: false }, // For user progress tracking
  isQoS: { type: Boolean, default: false },
  itnRelated: { type: [String], default: [] },
  relatedToSubscription: { type: [String], default: [] },
  scoringKeys: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add indexes for better performance on frequently queried fields
customerIssueSchema.index({ slid: 1 });
customerIssueSchema.index({ assignedTo: 1 });
customerIssueSchema.index({ teamCompany: 1 });
customerIssueSchema.index({ solved: 1 });
customerIssueSchema.index({ pisDate: -1 });
customerIssueSchema.index({ createdAt: -1 });
customerIssueSchema.index({ area: 1 });
customerIssueSchema.index({ callerName: 1 });

export const CustomerIssueSchema = mongoose.model('CustomerIssue', customerIssueSchema);
