import mongoose from "mongoose";

// In your suggestionsModel.js
const responseLogSchema = new mongoose.Schema({
  _id: {  // Add explicit _id field
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId() // Auto-generate unique IDs
  },
  status: {
    type: String,
    required: true,
    enum: ["pending", "reviewed", "implemented", "rejected"],
  },
  response: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  respondedAt: {
    type: Date,
    default: Date.now,
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { _id: true }); // Enable _id for subdocuments

const suggestionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    category: {
      type: String,
      required: true,
      enum: ["bug", "improvement", "feature", "other"],
      default: "other",
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "implemented", "rejected"],
      default: "pending",
    },
    responseLog: [responseLogSchema],
    lastRespondedAt: Date,
    lastRespondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
  },
  { timestamps: true }
);

// Add this to prevent strict population errors
suggestionSchema.set('strictPopulate', false);

export const SuggestionSchema = mongoose.model("Suggestion", suggestionSchema);