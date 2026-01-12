import mongoose from "mongoose";

const customerIssueLogSchema = new mongoose.Schema({
  slid: { type: String, required: true },
  issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerIssue' },
  action: {
    type: String,
    enum: ['ADD', 'UPDATE', 'DELETE', 'STATUS_CHANGE'],
    required: true
  },
  performedBy: { type: String, required: true },
  details: { type: String },
  prevData: { type: Object },
  newData: { type: Object },
  changes: { type: Object },
  timestamp: { type: Date, default: Date.now }
});

customerIssueLogSchema.index({ slid: 1 });
customerIssueLogSchema.index({ timestamp: -1 });

export const CustomerIssueLog = mongoose.model('CustomerIssueLog', customerIssueLogSchema);
