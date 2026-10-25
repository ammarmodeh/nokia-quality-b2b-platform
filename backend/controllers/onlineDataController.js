import TeamOnlineData from '../models/teamOnlineDataModel.js';
import TeamSamplesToken from '../models/teamSamplesTokenModel.js';
import { TaskSchema as Task } from '../models/taskModel.js';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// POST /api/team-online/upload
// Body: { rows: [{ teamCode, teamName, year, month, onlineTransactions, notes }] }
// Upserts each row (year + month + teamName are the unique key).
// ---------------------------------------------------------------------------
export const uploadOnlineData = async (req, res) => {
  const { rows = [] } = req.body;
  if (!Array.isArray(rows) || rows.length === 0)
    return res.status(400).json({ message: 'rows array is required and must not be empty.' });

  const batch = randomUUID();
  const userId = req.user?._id;

  const ops = rows.map((r) => ({
    updateOne: {
      filter: {
        year: Number(r.year),
        month: Number(r.month),
        teamName: String(r.teamName || '').trim(),
      },
      update: {
        $set: {
          teamCode: String(r.teamCode || '').trim(),
          onlineTransactions: Number(r.onlineTransactions) || 0,
          notes: String(r.notes || '').trim(),
          uploadBatch: batch,
          uploadedBy: userId,
        },
      },
      upsert: true,
    },
  }));

  const result = await TeamOnlineData.bulkWrite(ops, { ordered: false });
  res.json({
    message: 'Upload complete',
    upserted: result.upsertedCount,
    modified: result.modifiedCount,
    batch,
  });
};

// ---------------------------------------------------------------------------
// GET /api/team-online
// Query: ?year=2026&month=10  (optional filters)
// ---------------------------------------------------------------------------
export const listOnlineData = async (req, res) => {
  const filter = {};
  if (req.query.year)  filter.year  = Number(req.query.year);
  if (req.query.month) filter.month = Number(req.query.month);
  if (req.query.teamName) filter.teamName = { $regex: req.query.teamName, $options: 'i' };

  const rows = await TeamOnlineData.find(filter)
    .sort({ year: -1, month: -1, teamName: 1 })
    .lean();
  res.json(rows);
};

// ---------------------------------------------------------------------------
// DELETE /api/team-online/:id
// ---------------------------------------------------------------------------
export const deleteOnlineRow = async (req, res) => {
  const row = await TeamOnlineData.findByIdAndDelete(req.params.id);
  if (!row) return res.status(404).json({ message: 'Record not found.' });
  res.json({ message: 'Deleted', id: req.params.id });
};

// ---------------------------------------------------------------------------
// DELETE /api/team-online/batch/:batch
// Deletes every row that belongs to the given upload batch UUID.
// ---------------------------------------------------------------------------
export const deleteOnlineBatch = async (req, res) => {
  const result = await TeamOnlineData.deleteMany({ uploadBatch: req.params.batch });
  res.json({ message: 'Batch deleted', deleted: result.deletedCount });
};

// ---------------------------------------------------------------------------
// GET /api/team-online/summary
// Returns a merged view: for every (year, month, teamName) combination that
// has online data → join with samples + DVOC issues.
// Query: ?from=YYYY-MM&to=YYYY-MM
// ---------------------------------------------------------------------------
export const onlineSummary = async (req, res) => {
  // Parse date range
  const parseYM = (s) => {
    if (!s) return null;
    const [y, m] = String(s).split('-').map(Number);
    return { year: y, month: m };
  };
  const fromYM = parseYM(req.query.from);
  const toYM   = parseYM(req.query.to);

  // Build mongo filter
  const filter = {};
  if (fromYM && toYM) {
    filter.$or = [
      // same year: clamp month
      {
        year: fromYM.year,
        ...(fromYM.year === toYM.year
          ? { month: { $gte: fromYM.month, $lte: toYM.month } }
          : { month: { $gte: fromYM.month } }),
      },
      // middle years (if range spans >1 year)
      ...(toYM.year - fromYM.year > 1
        ? [{ year: { $gt: fromYM.year, $lt: toYM.year } }]
        : []),
      // end year
      ...(toYM.year > fromYM.year
        ? [{ year: toYM.year, month: { $lte: toYM.month } }]
        : []),
    ];
  }

  const onlineRows = await TeamOnlineData.find(filter).lean();

  // Build a lookup: key = `${year}-${month}-${teamName.toLowerCase()}`
  const onlineByKey = {};
  for (const row of onlineRows) {
    const key = `${row.year}-${row.month}-${row.teamName.toLowerCase()}`;
    onlineByKey[key] = row;
  }

  // --- Samples: aggregate from TeamSamplesToken within the same period ---
  const sampleFilter = {};
  if (fromYM) sampleFilter.$or = filter.$or; // reuse same structure
  const samplesAgg = await TeamSamplesToken.aggregate([
    ...(fromYM
      ? [{ $match: filter }]
      : []),
    {
      $group: {
        _id: { year: '$year', month: '$month', teamName: { $toLower: '$teamName' } },
        sampleSize: { $sum: '$sampleSize' },
        teamNameOrig: { $first: '$teamName' },
      },
    },
  ]);

  const samplesByKey = {};
  for (const s of samplesAgg) {
    const key = `${s._id.year}-${s._id.month}-${s._id.teamName}`;
    samplesByKey[key] = s.sampleSize;
  }

  // --- Issues: count DVOC survey tasks per team per month (by interviewDate) ---
  // DVOC tasks are identified by having interviewDate set + teamName filled (no `tracker` field).
  // Build a date range for interviewDate if a period filter is active.
  const issueDateMatch = {
    interviewDate: { $exists: true, $ne: null },
    teamName:      { $exists: true, $ne: '' },
  };
  if (fromYM && toYM) {
    const issueFrom = new Date(Date.UTC(fromYM.year, fromYM.month - 1, 1));
    const issueTo   = new Date(Date.UTC(toYM.year,   toYM.month,       0, 23, 59, 59, 999));
    issueDateMatch.interviewDate = { $gte: issueFrom, $lte: issueTo };
  }

  const isAccountable = (acc) => {
    const arr = Array.isArray(acc) ? acc : typeof acc === "string" ? [acc] : [];
    return arr.some((x) => String(x).trim().toLowerCase() === "yes");
  };

  const tasks = await Task.find(issueDateMatch, { interviewDate: 1, teamName: 1, teamAccountability: 1 }).lean();
  const issuesByKey = {};
  for (const t of tasks) {
    if (!t.interviewDate || !t.teamName) continue;
    const d = new Date(t.interviewDate);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${t.teamName.trim().toLowerCase()}`;
    if (!issuesByKey[key]) {
      issuesByKey[key] = { dvoc: 0, accountable: 0 };
    }
    issuesByKey[key].dvoc++;
    if (isAccountable(t.teamAccountability)) {
      issuesByKey[key].accountable++;
    }
  }

  // --- Merge all three into output rows ---
  const rows = onlineRows.map((row) => {
    const key = `${row.year}-${row.month}-${row.teamName.toLowerCase()}`;
    const samples = samplesByKey[key] || 0;
    const issueData = issuesByKey[key] || { dvoc: 0, accountable: 0 };
    const dvoc = issueData.dvoc;
    const accountable = issueData.accountable;
    const nonAccountable = Math.max(0, dvoc - accountable);
    const adjustedSamples = Math.max(0, samples - nonAccountable);
    const online = row.onlineTransactions || 0;

    const sampleRate = online > 0 ? +((samples / online) * 100).toFixed(2) : null;
    const dvocSamplePct = adjustedSamples > 0 ? +((accountable / adjustedSamples) * 100).toFixed(1) : null;
    const dvocOnlinePct = online > 0 ? +((accountable / online) * 100).toFixed(2) : null;

    return {
      _id: row._id,
      year: row.year,
      month: row.month,
      teamCode: row.teamCode,
      teamName: row.teamName,
      onlineTransactions: online,
      samplesToken: samples,
      issuesFound: dvoc,
      dvoc,
      accountable,
      adjustedSamples,
      sampleRate,
      dvocSamplePct,
      dvocOnlinePct,
      issueRate: dvocSamplePct,
      issueRateOnline: dvocOnlinePct,
      uploadBatch: row.uploadBatch,
      notes: row.notes,
    };
  });

  // Sort: year desc, month desc, teamName asc
  rows.sort((a, b) =>
    b.year - a.year || b.month - a.month || a.teamName.localeCompare(b.teamName)
  );

  res.json(rows);
};
