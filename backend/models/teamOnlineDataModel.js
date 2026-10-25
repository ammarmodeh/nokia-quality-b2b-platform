import mongoose from 'mongoose';

/**
 * One row = one team's online transaction count for a given month.
 * Uploaded in bulk from a spreadsheet.  Each upload session is tagged
 * with a shared `uploadBatch` UUID so the batch can be reviewed / deleted
 * as a unit.
 */
const teamOnlineDataSchema = new mongoose.Schema(
  {
    // Period ------------------------------------------------------------------
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 }, // 1–12

    // Team identity -----------------------------------------------------------
    teamCode: { type: String, trim: true, default: '' },
    teamName: { type: String, required: true, trim: true },

    // Core metrics uploaded from the sheet ------------------------------------
    onlineTransactions: { type: Number, default: 0, min: 0 },

    // Upload meta -------------------------------------------------------------
    uploadBatch: { type: String, default: '' }, // UUID shared across one import
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Optional notes ----------------------------------------------------------
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// Compound index so duplicate (year, month, teamName) rows are caught and
// upserted cleanly during a re-upload.
teamOnlineDataSchema.index({ year: 1, month: 1, teamName: 1 }, { unique: true });

const TeamOnlineData = mongoose.model('TeamOnlineData', teamOnlineDataSchema);
export default TeamOnlineData;
