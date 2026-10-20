// Permanent (hard) delete for one or many records, shared by every table.
//
// POST body: { ids: [id, ...], confirm: "permanent delete" }
// Response:  { deleted: [id, ...], failed: [{ id, message }] }
//   200 when at least one record was deleted (check `failed` for the rest),
//   400 for a bad request, 404 when none were found, 409 when every record is blocked.
//
// Routes mount it behind protect + the role check; this helper validates again
// on its own (ids, confirmation phrase, size limit) and never trusts the client.
import mongoose from "mongoose";

export const DELETE_PHRASE = "permanent delete";
const MAX_IDS = 1000;

/**
 * model: Mongoose model.
 * blockedBy(docs) → Map<id, reason> of records that must not be deleted (relationships).
 * cascade(docs, req) → remove dependent data after the records are gone.
 * scope(req) → extra filter (e.g. { tableId }) so ids from elsewhere can't be deleted.
 */
export const bulkDeleteHandler = ({ model, blockedBy, cascade, scope }) => async (req, res) => {
  try {
    const { ids, confirm } = req.body || {};
    if (confirm !== DELETE_PHRASE) return res.status(400).json({ message: `Type "${DELETE_PHRASE}" to confirm` });
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: "Choose at least one record to delete" });
    if (ids.length > MAX_IDS) return res.status(400).json({ message: `Delete at most ${MAX_IDS} records at a time` });

    const unique = [...new Set(ids.map(String))];
    const failed = unique.filter((id) => !mongoose.Types.ObjectId.isValid(id)).map((id) => ({ id, message: "Invalid id" }));
    const valid = unique.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const extra = scope ? await scope(req) : {};
    const docs = await model.find({ _id: { $in: valid }, ...extra }).lean();
    const found = new Set(docs.map((d) => String(d._id)));
    for (const id of valid) if (!found.has(id)) failed.push({ id, message: "Not found — it may already be deleted" });

    const blocked = blockedBy ? await blockedBy(docs, req) : new Map();
    for (const [id, message] of blocked) failed.push({ id: String(id), message });
    const doomed = docs.filter((d) => !blocked.has(String(d._id)));

    if (!doomed.length) {
      const code = blocked.size ? 409 : 404;
      return res.status(code).json({ message: blocked.size ? failed.find((f) => blocked.has(f.id))?.message || "These records can't be deleted" : "No matching records found", deleted: [], failed });
    }

    const result = await model.deleteMany({ _id: { $in: doomed.map((d) => d._id) }, ...extra });
    // deleteMany is all-or-nothing per document; if the count is short, re-check which survived
    let deletedIds = doomed.map((d) => String(d._id));
    if (result.deletedCount !== doomed.length) {
      const left = new Set((await model.find({ _id: { $in: doomed.map((d) => d._id) } }, { _id: 1 }).lean()).map((d) => String(d._id)));
      deletedIds = deletedIds.filter((id) => !left.has(id));
      for (const id of left) failed.push({ id, message: "The database didn't delete it — try again" });
    }
    // the records are gone at this point, so a cascade problem is reported, not hidden behind a 500
    let warning;
    if (cascade) {
      try {
        await cascade(doomed.filter((d) => deletedIds.includes(String(d._id))), req);
      } catch (e) {
        warning = `Deleted, but cleaning up linked data failed: ${e.message}`;
      }
    }
    res.json({ deleted: deletedIds, failed, ...(warning ? { warning } : {}) });
  } catch (error) {
    res.status(500).json({ message: `Delete failed: ${error.message}` });
  }
};
