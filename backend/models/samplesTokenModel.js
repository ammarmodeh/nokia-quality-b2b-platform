import mongoose from 'mongoose';

const samplesTokenSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
  },
  weekNumber: {
    type: Number,
    required: true,
  },
  weekRange: {
    type: String,
    required: true,
  },
  sampleSize: {
    type: Number,
    default: 0,
  },
  promoters: {
    type: Number,
    default: 0,
  },
  detractors: {
    type: Number,
    default: 0,
  },
  npsRelated: {
    type: Number,
    default: 0,
  },
  itnRelated: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Compound unique index to prevent duplicate year+week entries
samplesTokenSchema.index({ year: 1, weekNumber: 1 }, { unique: true });

const SamplesToken = mongoose.model('SamplesToken', samplesTokenSchema);

export default SamplesToken;
