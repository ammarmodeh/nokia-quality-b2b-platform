import mongoose from 'mongoose';

const teamSamplesTokenSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
  },
  month: {
    type: Number, // 1 to 12
    required: true,
  },
  teamName: {
    type: String,
    required: true,
    trim: true,
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FieldTeam',
  },
  sampleSize: {
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

// Compound unique index on year, month, and teamName
teamSamplesTokenSchema.index({ year: 1, month: 1, teamName: 1 }, { unique: true });

const TeamSamplesToken = mongoose.model('TeamSamplesToken', teamSamplesTokenSchema);

export default TeamSamplesToken;
