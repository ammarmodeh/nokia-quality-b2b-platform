import mongoose from 'mongoose';

const policyLogSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()
  },
  action: {
    type: String,
    required: true,
    enum: ["create", "update", "response"],
  },
  details: {
    type: String,
    required: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true // Make this field required
  },
  performedAt: {
    type: Date,
    default: Date.now,
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { _id: true });

const policyActionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: [true, 'Policy name already exists'],
  },
  action: {
    type: String,
    enum: ['agree', 'disagree', 'pending'],
    required: true,
    default: 'pending',
  },
  content: {
    type: String,
    required: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  rejectedAt: {
    type: Date,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastUpdate: {
    type: Date,
    default: Date.now,
  },
  logs: [policyLogSchema],
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
});

// Create the model
export const PolicyAction = mongoose.model('PolicyAction', policyActionSchema);