import mongoose from 'mongoose';

const dailyOnlineSamplesSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
  },
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true,
  },
  month: {
    type: Number, // 1..12
    required: true,
  },
  day: {
    type: Number, // 1..31
    required: true,
  },
  onlineSamples: {
    type: Number,
    default: 0,
  },
  samplesToken: {
    type: Number,
    default: 0,
  },
  note: {
    type: String,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

dailyOnlineSamplesSchema.index({ year: 1, date: 1 }, { unique: true });

const DailyOnlineSamples = mongoose.model('DailyOnlineSamples', dailyOnlineSamplesSchema);

export default DailyOnlineSamples;
