import crypto from "crypto";
import mongoose from "mongoose";
import {
  MaintenanceAudit,
  MaintenanceSurveySample,
  MaintenanceTask,
  MaintenanceTeam,
  MaintenanceTicket,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_SHIFTS,
  MAINTENANCE_TASK_STATUSES,
  MAINTENANCE_TEAM_STATUSES,
} from "../models/maintenanceModels.js";
import { withTransaction } from "../utils/withTransaction.js";

// DVOC · Maintenance API. Reads and writes only the maintenance_* collections.

const { isValidObjectId } = mongoose;
const isAdmin = (req) => req.user?.role === "Admin";
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
const isDup = (err) => err?.code === 11000;

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
const fail = (status, message, extra) => {
  throw new HttpError(status, message, extra);
};

/** Wraps a handler: HttpError → its status; validation/cast errors → 400; duplicates → 409. */
const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ message: err.message, ...err.extra });
    if (err?.name === "ValidationError") {
      const fields = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
      return res.status(400).json({ message: Object.values(fields)[0] || "Invalid data", fields });
    }
    if (err?.name === "CastError") return res.status(400).json({ message: `Invalid ${err.path}` });
    if (isDup(err)) return res.status(409).json({ message: "A record with these details already exists", key: err.keyValue });
    console.error("[maintenance]", err);
    return res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const audit = (req, entity, entityId, action, { changes = null, summary = "" } = {}, session = null) =>
  MaintenanceAudit.create([{ entity, entityId, action, changes, summary, user: req.user?._id, userName: req.user?.name || "" }], session ? { session } : {});

/** { field: { from, to } } for fields whose value changed. */
const diff = (before, after, fields) => {
  const out = {};
  const norm = (v) => (v instanceof Date ? v.toISOString() : v && typeof v === "object" ? JSON.stringify(v) : v ?? null);
  for (const f of fields) if (norm(before?.[f]) !== norm(after?.[f])) out[f] = { from: before?.[f] ?? null, to: after?.[f] ?? null };
  return Object.keys(out).length ? out : null;
};

const randomCode = (n) => crypto.randomBytes(n).toString("base64url").replace(/[-_]/g, "").toUpperCase().slice(0, n);

const requireId = (id, what = "record") => {
  if (!isValidObjectId(id)) fail(400, `Invalid ${what} id`);
};

// ---------------------------------------------------------------------------- meta

export const getMeta = handle(async (_req, res) => {
  res.json({
    teamStatuses: MAINTENANCE_TEAM_STATUSES,
    shifts: MAINTENANCE_SHIFTS,
    taskStatuses: MAINTENANCE_TASK_STATUSES,
    priorities: MAINTENANCE_PRIORITIES,
  });
});

// ---------------------------------------------------------------------------- teams

const TEAM_FIELDS = ["teamName", "teamCode", "company", "supervisor", "supervisorPhone", "governorate", "coverageAreas", "shift", "vehicle", "members", "status", "yearsOfExperience", "training", "qaResult", "notes"];

const cleanTeam = (body) => {
  const t = pick(body, TEAM_FIELDS);
  if (typeof t.coverageAreas === "string") t.coverageAreas = t.coverageAreas.split(",");
  if (Array.isArray(t.coverageAreas)) t.coverageAreas = [...new Set(t.coverageAreas.map((s) => String(s).trim()).filter(Boolean))];
  if ("yearsOfExperience" in t) t.yearsOfExperience = t.yearsOfExperience === "" || t.yearsOfExperience == null ? null : Number(t.yearsOfExperience);
  if (t.training === "") t.training = null;
  if (t.qaResult === "") t.qaResult = null;
  if (Array.isArray(t.members)) t.members = t.members.filter((m) => m && String(m.name || "").trim()).map((m) => ({ ...(m._id && isValidObjectId(m._id) ? { _id: m._id } : {}), name: String(m.name).trim(), role: String(m.role || "Technician").trim(), phone: String(m.phone || "").trim() }));
  return t;
};

const teamNameTaken = async (name, exceptId) => {
  const found = await MaintenanceTeam.findOne({ teamName: String(name || "").trim(), ...(exceptId ? { _id: { $ne: exceptId } } : {}) })
    .collation({ locale: "en", strength: 2 })
    .select("_id")
    .lean();
  return Boolean(found);
};

export const listTeams = handle(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q.trim()), "i");
    filter.$or = [{ teamName: rx }, { teamCode: rx }, { supervisor: rx }, { company: rx }, { governorate: rx }];
  }
  const teams = await MaintenanceTeam.find(filter).sort({ status: 1, teamName: 1 }).lean();
  const ids = teams.map((t) => t._id);
  const [taskStats, sampleStats] = await Promise.all([
    MaintenanceTask.aggregate([
      { $match: { team: { $in: ids } } },
      {
        $group: {
          _id: "$team",
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $ne: ["$status", "Closed"] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ["$resolvedAfterVisit", "Yes"] }, 1, 0] } },
          lastTaskAt: { $max: "$createdAt" },
          detractors: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$evaluationScore", null] },
                    { $gte: ["$evaluationScore", 1] },
                    { $lte: ["$evaluationScore", 6] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          neutrals: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$evaluationScore", null] },
                    { $gte: ["$evaluationScore", 7] },
                    { $lte: ["$evaluationScore", 8] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          highRated: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$evaluationScore", null] },
                    { $gte: ["$evaluationScore", 9] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    MaintenanceSurveySample.aggregate([{ $match: { team: { $in: ids } } }, { $group: { _id: "$team", samples: { $sum: "$sampleSize" }, entries: { $sum: 1 } } }]),
  ]);
  const ts = new Map(taskStats.map((s) => [String(s._id), s]));
  const ss = new Map(sampleStats.map((s) => [String(s._id), s]));
  res.json(
    teams.map((t) => {
      const tsData = ts.get(String(t._id)) || {};
      const ssData = ss.get(String(t._id)) || {};
      const taskCount = tsData.total || 0;
      const sampleCount = ssData.samples || 0;
      const det = tsData.detractors || 0;
      const neu = tsData.neutrals || 0;
      const high = tsData.highRated || 0;
      const nonPromoters = det + neu;
      const promoters = sampleCount > 0 ? Math.max(0, sampleCount - nonPromoters) : high;
      const promoterRate = sampleCount > 0 ? Number(((promoters / sampleCount) * 100).toFixed(1)) : (nonPromoters + high > 0 ? Number(((high / (nonPromoters + high)) * 100).toFixed(1)) : null);
      const dvocSampleRate = sampleCount > 0 ? Number(((taskCount / sampleCount) * 100).toFixed(1)) : null;

      return {
        ...t,
        stats: {
          tasks: taskCount,
          dvoc: taskCount,
          openTasks: tsData.open || 0,
          resolvedTasks: tsData.resolved || 0,
          lastTaskAt: tsData.lastTaskAt || null,
          samples: sampleCount,
          sampleEntries: ssData.entries || 0,
          detractors: det,
          neutrals: neu,
          nonPromoters,
          promoters,
          promoterRate,
          dvocSampleRate,
        },
      };
    })
  );
});

export const getTeam = handle(async (req, res) => {
  requireId(req.params.id, "team");
  const team = await MaintenanceTeam.findById(req.params.id).lean();
  if (!team) fail(404, "Maintenance team not found");
  const [samples, tasks, statusCounts, history] = await Promise.all([
    MaintenanceSurveySample.find({ team: team._id }).sort({ year: -1, month: -1 }).limit(24).lean(),
    MaintenanceTask.find({ team: team._id }).sort({ createdAt: -1 }).limit(10).select("taskNumber slid customerName status priority createdAt dueDate").lean(),
    MaintenanceTask.aggregate([{ $match: { team: team._id } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    MaintenanceAudit.find({ entity: "team", entityId: team._id }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  res.json({ ...team, samples, recentTasks: tasks, statusCounts: Object.fromEntries(statusCounts.map((s) => [s._id, s.n])), history });
});

export const createTeam = handle(async (req, res) => {
  const data = cleanTeam(req.body);
  if (!data.teamName?.trim()) fail(400, "Team name is required", { fields: { teamName: "Team name is required" } });
  if (await teamNameTaken(data.teamName)) fail(409, `A maintenance team named "${data.teamName.trim()}" already exists`, { fields: { teamName: "Already used" } });
  const team = await withTransaction(async (session, undo) => {
    const [created] = await MaintenanceTeam.create([{ ...data, createdBy: req.user._id, updatedBy: req.user._id }], session ? { session } : {});
    undo(() => MaintenanceTeam.deleteOne({ _id: created._id }));
    await audit(req, "team", created._id, "create", { summary: `Created team ${created.teamName}` }, session);
    return created;
  });
  res.status(201).json(team);
});

export const updateTeam = handle(async (req, res) => {
  requireId(req.params.id, "team");
  const before = await MaintenanceTeam.findById(req.params.id).lean();
  if (!before) fail(404, "Maintenance team not found");
  const data = cleanTeam(req.body);
  if (data.teamName !== undefined && !String(data.teamName).trim()) fail(400, "Team name is required", { fields: { teamName: "Team name is required" } });
  if (data.teamName && (await teamNameTaken(data.teamName, before._id))) fail(409, `A maintenance team named "${data.teamName.trim()}" already exists`, { fields: { teamName: "Already used" } });
  const team = await withTransaction(async (session, undo) => {
    const updated = await MaintenanceTeam.findByIdAndUpdate(before._id, { ...data, updatedBy: req.user._id }, { new: true, runValidators: true, session });
    undo(() => MaintenanceTeam.replaceOne({ _id: before._id }, before));
    const changes = diff(before, updated.toObject(), TEAM_FIELDS);
    if (changes) await audit(req, "team", before._id, changes.status && Object.keys(changes).length === 1 ? "status" : "update", { changes }, session);
    return updated;
  });
  res.json(team);
});

export const deleteTeam = handle(async (req, res) => {
  if (!isAdmin(req)) fail(403, "Only admins can delete maintenance teams");
  requireId(req.params.id, "team");
  const team = await MaintenanceTeam.findById(req.params.id).lean();
  if (!team) fail(404, "Maintenance team not found");
  const [tasks, samples] = await Promise.all([MaintenanceTask.countDocuments({ team: team._id }), MaintenanceSurveySample.countDocuments({ team: team._id })]);
  if (tasks || samples) fail(409, `This team has ${tasks} task(s) and ${samples} sample entr${samples === 1 ? "y" : "ies"}. Set it to Inactive instead so its history stays intact.`, { tasks, samples });
  await MaintenanceTeam.deleteOne({ _id: team._id });
  await audit(req, "team", team._id, "delete", { summary: `Deleted team ${team.teamName}`, changes: { teamName: { from: team.teamName, to: null } } });
  res.json({ deleted: true, id: team._id });
});

// ---------------------------------------------------------------------------- survey samples

const SAMPLE_FIELDS = ["team", "year", "month", "sampleSize", "promoters", "neutrals", "detractors", "source", "notes"];

const validateSample = async (data, { partial = false } = {}) => {
  const errors = {};
  const num = (k) => (data[k] === "" || data[k] === null || data[k] === undefined ? null : Number(data[k]));
  for (const k of ["year", "month", "sampleSize", "promoters", "neutrals", "detractors"]) if (data[k] !== undefined) data[k] = num(k);
  if (!partial || data.team !== undefined) {
    if (!isValidObjectId(data.team)) errors.team = "Choose a maintenance team";
    else if (!(await MaintenanceTeam.exists({ _id: data.team }))) errors.team = "Team not found";
  }
  if (!partial || data.year !== undefined) if (!Number.isInteger(data.year) || data.year < 2000 || data.year > 2100) errors.year = "Enter a valid year";
  if (!partial || data.month !== undefined) if (!Number.isInteger(data.month) || data.month < 1 || data.month > 12) errors.month = "Choose a month";
  if (!partial || data.sampleSize !== undefined) if (!Number.isInteger(data.sampleSize) || data.sampleSize < 0) errors.sampleSize = "Samples must be a whole number ≥ 0";
  for (const k of ["promoters", "neutrals", "detractors"]) if (data[k] != null && (!Number.isInteger(data[k]) || data[k] < 0)) errors[k] = "Must be a whole number ≥ 0";
  const parts = ["promoters", "neutrals", "detractors"].map((k) => data[k]).filter((v) => v != null);
  if (data.sampleSize != null && parts.length && parts.reduce((a, b) => a + b, 0) > data.sampleSize) errors.sampleSize = "Promoters + neutrals + detractors can't exceed the sample size";
  if (Object.keys(errors).length) fail(400, Object.values(errors)[0], { fields: errors });
};

export const listSamples = handle(async (req, res) => {
  const filter = {};
  if (req.query.year) filter.year = Number(req.query.year);
  if (req.query.month) filter.month = Number(req.query.month);
  if (req.query.team && isValidObjectId(req.query.team)) filter.team = req.query.team;
  const rows = await MaintenanceSurveySample.find(filter).sort({ year: -1, month: -1, createdAt: -1 }).populate("team", "teamName teamCode status").populate("createdBy updatedBy", "name").lean();
  const linked = await MaintenanceTask.aggregate([{ $match: { surveySample: { $in: rows.map((r) => r._id) } } }, { $group: { _id: "$surveySample", n: { $sum: 1 } } }]);
  const byId = new Map(linked.map((l) => [String(l._id), l.n]));
  const q = String(req.query.q || "").trim().toLowerCase();
  res.json(rows.map((r) => ({ ...r, linkedTasks: byId.get(String(r._id)) || 0 })).filter((r) => !q || [r.team?.teamName, r.team?.teamCode, r.source, r.notes].some((v) => String(v || "").toLowerCase().includes(q))));
});

export const createSample = handle(async (req, res) => {
  const data = pick(req.body, SAMPLE_FIELDS);
  await validateSample(data);
  const team = await MaintenanceTeam.findById(data.team).select("status teamName").lean();
  if (team.status !== "Active") fail(400, `${team.teamName} is inactive. Reactivate it before entering samples.`, { fields: { team: "Team is inactive" } });
  const existing = await MaintenanceSurveySample.findOne({ team: data.team, year: data.year, month: data.month }).select("_id sampleSize").lean();
  if (existing) fail(409, `${team.teamName} already has ${existing.sampleSize} samples for ${data.month}/${data.year}. Edit that entry instead.`, { existingId: existing._id });
  const sample = await withTransaction(async (session, undo) => {
    const [created] = await MaintenanceSurveySample.create([{ ...data, createdBy: req.user._id, updatedBy: req.user._id }], session ? { session } : {});
    undo(() => MaintenanceSurveySample.deleteOne({ _id: created._id }));
    await audit(req, "sample", created._id, "create", { summary: `${team.teamName} ${data.month}/${data.year}: ${data.sampleSize} samples` }, session);
    return created;
  });
  res.status(201).json(sample);
});

export const updateSample = handle(async (req, res) => {
  requireId(req.params.id, "sample");
  const before = await MaintenanceSurveySample.findById(req.params.id).lean();
  if (!before) fail(404, "Sample entry not found");
  const data = pick(req.body, SAMPLE_FIELDS);
  const merged = { ...before, ...data, team: data.team ?? String(before.team) };
  await validateSample(merged);
  if (String(merged.team) !== String(before.team) || merged.year !== before.year || merged.month !== before.month) {
    if (await MaintenanceSurveySample.exists({ _id: { $ne: before._id }, team: merged.team, year: merged.year, month: merged.month })) fail(409, "That team already has an entry for this month");
    if (String(merged.team) !== String(before.team) && (await MaintenanceTask.exists({ surveySample: before._id }))) fail(409, "Tasks are linked to this entry, so its team can't change");
  }
  const sample = await withTransaction(async (session, undo) => {
    const updated = await MaintenanceSurveySample.findByIdAndUpdate(before._id, { ...pick(merged, SAMPLE_FIELDS), updatedBy: req.user._id }, { new: true, runValidators: true, session });
    undo(() => MaintenanceSurveySample.replaceOne({ _id: before._id }, before));
    const changes = diff(before, updated.toObject(), SAMPLE_FIELDS);
    if (changes) await audit(req, "sample", before._id, "update", { changes }, session);
    return updated;
  });
  res.json(sample);
});

export const deleteSample = handle(async (req, res) => {
  if (!isAdmin(req)) fail(403, "Only admins can delete sample entries");
  requireId(req.params.id, "sample");
  const sample = await MaintenanceSurveySample.findById(req.params.id).lean();
  if (!sample) fail(404, "Sample entry not found");
  const linked = await MaintenanceTask.countDocuments({ surveySample: sample._id });
  if (linked) fail(409, `${linked} task(s) are linked to this entry. Unlink them first.`, { linked });
  await MaintenanceSurveySample.deleteOne({ _id: sample._id });
  await audit(req, "sample", sample._id, "delete", { changes: { sampleSize: { from: sample.sampleSize, to: null } }, summary: `Deleted ${sample.month}/${sample.year} entry` });
  res.json({ deleted: true, id: sample._id });
});

// ---------------------------------------------------------------------------- tasks

const TASK_FIELDS = ["slid", "ticketNumber", "customerName", "contactNumber", "customerComplaint", "fiberCategory", "governorate", "district", "team", "surveySample", "evaluationScore", "customerFeedback", "teamFeedback", "interviewDate", "faultDate", "creationDate", "dueDate", "installationDate", "ncf", "hcResponsibility", "resolvedAfterVisit", "teamResponsibility", "customerFollowUp", "faultType", "priority", "status", "assignedTo", "rca", "notes"];
const DATE_FIELDS = ["interviewDate", "faultDate", "creationDate", "dueDate", "installationDate"];

/** "Yes" | "No" | null (cleared) | undefined (not sent). Accepts Yes/No, true/false, MT wording from sheets. */
const normYesNo = (v) => {
  if (v === undefined) return undefined;
  if (v === null || v === "" || v === "Not specified") return null;
  const s = String(v).trim().toLowerCase();
  if (["yes", "y", "true", "1", "mt"].includes(s)) return "Yes";
  if (["no", "n", "false", "0"].includes(s)) return "No";
  return v; // left as is so validation reports it
};

const cleanTask = (body) => {
  const t = pick(body, TASK_FIELDS);
  if ("teamResponsibility" in t) t.teamResponsibility = normYesNo(t.teamResponsibility);
  if ("customerFollowUp" in t) t.customerFollowUp = normYesNo(t.customerFollowUp);
  for (const k of DATE_FIELDS) if (t[k] === "") t[k] = null;
  if (t.surveySample === "") t.surveySample = null;
  if (t.evaluationScore === "" || t.evaluationScore === "Not specified") t.evaluationScore = null;
  if (t.evaluationScore != null) t.evaluationScore = Number(t.evaluationScore);
  if (typeof t.fiberCategory === "string") t.fiberCategory = t.fiberCategory.trim();
  if (t.ncf !== undefined) t.ncf = Boolean(t.ncf === true || t.ncf === "true" || t.ncf === "Yes" || t.ncf === "1" || t.ncf === 1);
  if (t.hcResponsibility !== undefined) t.hcResponsibility = Boolean(t.hcResponsibility === true || t.hcResponsibility === "true" || t.hcResponsibility === "Yes" || t.hcResponsibility === "1" || t.hcResponsibility === 1);
  if (t.installationDate && (t.ncf === undefined || t.ncf === null)) {
    const refDate = t.creationDate || t.faultDate || new Date();
    const diffMs = new Date(refDate).getTime() - new Date(t.installationDate).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays >= 0 && diffDays <= 31) t.ncf = true;
  }
  if (Array.isArray(t.assignedTo)) t.assignedTo = t.assignedTo.map((u) => (u && typeof u === "object" ? u._id : u)).filter((id) => isValidObjectId(id));
  if (Array.isArray(t.rca)) t.rca = t.rca.filter((r) => r && Object.values(r).some((v) => v && v !== "Not specified")).map((r) => pick(r, ["reason", "subReason", "rootCause", "responsible", "teamAccountability"]));
  if (typeof t.slid === "string") t.slid = t.slid.trim().toUpperCase();
  if (t.resolvedAfterVisit === "Yes" && (!t.status || t.status === "Todo" || t.status === "In Progress")) {
    t.status = "Closed";
    t.closedAt = new Date();
  }
  return t;
};

const validateTaskRefs = async (data, { creating }) => {
  const errors = {};
  if (creating || data.slid !== undefined) if (!data.slid) errors.slid = "SLID is required";
  if (creating || data.team !== undefined) {
    if (!isValidObjectId(data.team)) errors.team = "Choose a maintenance team";
    else {
      const team = await MaintenanceTeam.findById(data.team).select("status").lean();
      if (!team) errors.team = "Team not found";
      else if (creating && team.status !== "Active") errors.team = "This team is inactive";
    }
  }
  if (data.surveySample) {
    if (!isValidObjectId(data.surveySample)) errors.surveySample = "Invalid survey sample";
    else {
      const s = await MaintenanceSurveySample.findById(data.surveySample).select("team").lean();
      if (!s) errors.surveySample = "Survey sample entry not found";
      else if (data.team && String(s.team) !== String(data.team)) errors.surveySample = "That sample entry belongs to another team";
    }
  }
  // Team responsibility is no longer asked in the form; older values stay valid.
  if (data.teamResponsibility != null && !["Yes", "No"].includes(data.teamResponsibility)) errors.teamResponsibility = "Team responsibility must be Yes or No";
  if (creating && !data.customerFollowUp) errors.customerFollowUp = "Choose whether the customer needs a follow-up";
  else if (data.customerFollowUp != null && !["Yes", "No"].includes(data.customerFollowUp)) errors.customerFollowUp = "Customer follow-up must be Yes or No";
  if (data.evaluationScore != null && !(Number.isInteger(data.evaluationScore) && data.evaluationScore >= 1 && data.evaluationScore <= 10)) errors.evaluationScore = "Score must be 1–10";
  if (data.dueDate && data.creationDate && new Date(data.dueDate) < new Date(data.creationDate)) errors.dueDate = "Clearance date cannot be before creation date";
  if (data.dueDate && data.faultDate && new Date(data.dueDate) < new Date(data.faultDate)) errors.dueDate = "Clearance date cannot be before reporting date";
  if (Object.keys(errors).length) fail(400, Object.values(errors)[0], { fields: errors });
};

const nextTaskNumber = () => {
  const d = new Date();
  return `MT-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}-${randomCode(5)}`;
};

const populateTask = (q) => q.populate("team", "teamName teamCode status").populate("assignedTo", "name email").populate("createdBy updatedBy", "name").populate("surveySample", "year month sampleSize");

export const listTasks = handle(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const parsedLimit = parseInt(req.query.limit, 10);
  const limit = req.query.limit === "all" || parsedLimit > 100
    ? Math.min(50000, Math.max(1, parsedLimit || 50000))
    : Math.min(100, Math.max(1, parsedLimit || 25));
  const filter = {};
  if (req.query.status) filter.status = { $in: String(req.query.status).split(",").filter((s) => MAINTENANCE_TASK_STATUSES.includes(s)) };
  if (req.query.priority) filter.priority = { $in: String(req.query.priority).split(",") };
  if (req.query.team) filter.team = { $in: String(req.query.team).split(",").filter(isValidObjectId) };
  if (req.query.ncf === "1" || req.query.ncf === "true") filter.ncf = true;
  else if (req.query.ncf === "0" || req.query.ncf === "false") filter.ncf = false;
  if (req.query.hc === "1" || req.query.hc === "true") filter.hcResponsibility = true;
  if (req.query.mine === "1") filter.assignedTo = req.user._id;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q.trim()), "i");
    filter.$or = [{ slid: rx }, { taskNumber: rx }, { ticketNumber: rx }, { customerName: rx }, { contactNumber: rx }, { customerComplaint: rx }, { fiberCategory: rx }, { customerFeedback: rx }, { teamFeedback: rx }];
  }
  const SORTS = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, due: { dueDate: 1, createdAt: -1 }, updated: { updatedAt: -1 } };
  const sort = SORTS[req.query.sort] || SORTS.newest;
  const { status: _status, ...withoutStatus } = filter; // tab counts ignore the status filter itself
  const [rows, total, statusCounts] = await Promise.all([
    populateTask(MaintenanceTask.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).select("-requestKey")).lean(),
    MaintenanceTask.countDocuments(filter),
    MaintenanceTask.aggregate([{ $match: withoutStatus }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  res.json({ rows, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)), statusCounts: Object.fromEntries(statusCounts.map((s) => [s._id, s.n])) });
});

export const getTask = handle(async (req, res) => {
  requireId(req.params.id, "task");
  const task = await populateTask(MaintenanceTask.findById(req.params.id).select("-requestKey")).lean();
  if (!task) fail(404, "Maintenance task not found");
  const [tickets, history] = await Promise.all([
    MaintenanceTicket.find({ task: task._id }).sort({ eventDate: 1, createdAt: 1 }).populate("recordedBy editedBy", "name").select("-requestKey").lean(),
    MaintenanceAudit.find({ $or: [{ entity: "task", entityId: task._id }] }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  res.json({ ...task, tickets, history });
});

export const createTask = handle(async (req, res) => {
  const requestKey = typeof req.body.requestKey === "string" && req.body.requestKey.length <= 80 ? req.body.requestKey : undefined;
  if (requestKey) {
    // Retry / double submit of the same form: hand back the task that was already created.
    const existing = await MaintenanceTask.findOne({ requestKey }).select("_id taskNumber").lean();
    if (existing) return res.status(200).json({ ...existing, duplicate: true });
  }
  const data = cleanTask(req.body);
  await validateTaskRefs(data, { creating: true });
  if (!req.body.allowDuplicateSlid) {
    const open = await MaintenanceTask.findOne({ slid: data.slid, status: { $ne: "Closed" } }).select("_id taskNumber requestKey").lean();
    // A concurrent copy of this same submission got there first: that's the duplicate, not a conflict.
    if (open && requestKey && open.requestKey === requestKey) return res.status(200).json({ _id: open._id, taskNumber: open.taskNumber, duplicate: true });
    if (open) fail(409, `SLID ${data.slid} already has an open maintenance task (${open.taskNumber}).`, { code: "OPEN_TASK_EXISTS", existingId: open._id, taskNumber: open.taskNumber });
  }
  if (!data.creationDate) data.creationDate = new Date();
  if (data.status === "Closed") data.closedAt = new Date();

  let task;
  for (let attempt = 0; attempt < 5 && !task; attempt++) {
    try {
      task = await withTransaction(async (session, undo) => {
        const [created] = await MaintenanceTask.create([{ ...data, taskNumber: nextTaskNumber(), requestKey, createdBy: req.user._id, updatedBy: req.user._id }], session ? { session } : {});
        undo(() => MaintenanceTask.deleteOne({ _id: created._id }));
        await audit(req, "task", created._id, "create", { summary: `Created ${created.taskNumber} for SLID ${created.slid}` }, session);
        return created;
      });
    } catch (err) {
      if (isDup(err) && err.keyPattern?.requestKey) {
        const existing = await MaintenanceTask.findOne({ requestKey }).select("_id taskNumber").lean();
        return res.status(200).json({ ...existing, duplicate: true }); // a concurrent retry won the race
      }
      if (!(isDup(err) && err.keyPattern?.taskNumber)) throw err; // taskNumber collision → new number
    }
  }
  if (!task) fail(500, "Couldn't allocate a task number, try again");
  res.status(201).json(await populateTask(MaintenanceTask.findById(task._id).select("-requestKey")).lean());
});

export const updateTask = handle(async (req, res) => {
  requireId(req.params.id, "task");
  const before = await MaintenanceTask.findById(req.params.id).lean();
  if (!before) fail(404, "Maintenance task not found");
  const data = cleanTask(req.body);
  await validateTaskRefs({ ...data, team: data.team ?? String(before.team), surveySample: data.surveySample === undefined ? before.surveySample : data.surveySample }, { creating: false });
  if (data.status && data.status !== before.status) data.closedAt = data.status === "Closed" ? new Date() : null;
  if (data.resolvedAfterVisit === "Yes") {
    data.status = "Closed";
    data.closedAt = before.closedAt || new Date();
  } else if (data.resolvedAfterVisit === "No" && before.status === "Closed" && !req.body.status) {
    data.status = "In Progress";
    data.closedAt = null;
  }
  const task = await withTransaction(async (session, undo) => {
    const updated = await MaintenanceTask.findByIdAndUpdate(before._id, { ...data, updatedBy: req.user._id }, { new: true, runValidators: true, session });
    undo(() => MaintenanceTask.replaceOne({ _id: before._id }, before));
    const changes = diff(before, updated.toObject(), TASK_FIELDS);
    if (changes) await audit(req, "task", before._id, changes.status && Object.keys(changes).length === 1 ? "status" : "update", { changes }, session);
    return updated;
  });
  res.json(await populateTask(MaintenanceTask.findById(task._id).select("-requestKey")).lean());
});

export const deleteTask = handle(async (req, res) => {
  if (!isAdmin(req)) fail(403, "Only admins can delete maintenance tasks");
  requireId(req.params.id, "task");
  const task = await MaintenanceTask.findById(req.params.id).lean();
  if (!task) fail(404, "Maintenance task not found");
  const result = await withTransaction(async (session, undo) => {
    const tickets = await MaintenanceTicket.find({ task: task._id }).session(session).lean();
    await MaintenanceTicket.deleteMany({ task: task._id }, { session });
    undo(() => tickets.length && MaintenanceTicket.insertMany(tickets));
    await MaintenanceTask.deleteOne({ _id: task._id }, { session });
    undo(() => MaintenanceTask.create(task));
    await audit(req, "task", task._id, "delete", { summary: `Deleted ${task.taskNumber} and ${tickets.length} ticket(s)` }, session);
    return { deleted: true, id: task._id, tickets: tickets.length };
  });
  res.json(result);
});

// ---------------------------------------------------------------------------- processing / tickets

const TICKET_FIELDS = ["transactionType", "transactionState", "unfReasonCode", "gaiaTicket", "status", "eventDate", "followUpDate", "note", "agentName"];

const cleanTicket = (body) => {
  const t = pick(body, TICKET_FIELDS);
  for (const k of ["eventDate", "followUpDate"]) if (t[k] === "") t[k] = null;
  for (const k of ["transactionType", "transactionState", "unfReasonCode"]) if (typeof t[k] === "string") t[k] = t[k].trim().toUpperCase();
  return t;
};

const validateTicket = (t, { partial = false } = {}) => {
  const errors = {};
  if (!partial || t.transactionType !== undefined) if (!t.transactionType) errors.transactionType = "Choose a transaction type";
  if (!partial || t.status !== undefined) if (!MAINTENANCE_TASK_STATUSES.includes(t.status)) errors.status = "Choose the task status after this step";
  if (t.eventDate && Number.isNaN(new Date(t.eventDate).getTime())) errors.eventDate = "Invalid date";
  if (t.eventDate && new Date(t.eventDate) > new Date(Date.now() + 864e5)) errors.eventDate = "Event date can't be in the future";
  if (t.followUpDate && t.eventDate && new Date(t.followUpDate) < new Date(new Date(t.eventDate).toDateString())) errors.followUpDate = "Follow-up is before the event date";
  if (Object.keys(errors).length) fail(400, Object.values(errors)[0], { fields: errors });
};

/** Re-derives a task's ticket counters (and optionally its status) from its remaining tickets. */
const syncTaskFromTickets = async (taskId, session, { status } = {}) => {
  const latest = await MaintenanceTicket.find({ task: taskId }).sort({ eventDate: -1, createdAt: -1 }).limit(1).session(session).lean();
  const count = await MaintenanceTicket.countDocuments({ task: taskId }).session(session);
  const set = { ticketCount: count, lastTicketAt: latest[0]?.eventDate || latest[0]?.createdAt || null };
  if (status) {
    set.status = status;
    set.closedAt = status === "Closed" ? new Date() : null;
  }
  await MaintenanceTask.updateOne({ _id: taskId }, { $set: set }, { session });
};

export const listTaskTickets = handle(async (req, res) => {
  requireId(req.params.id, "task");
  if (!(await MaintenanceTask.exists({ _id: req.params.id }))) fail(404, "Maintenance task not found");
  res.json(await MaintenanceTicket.find({ task: req.params.id }).sort({ eventDate: 1, createdAt: 1 }).populate("recordedBy editedBy", "name").select("-requestKey").lean());
});

/** Processing queue: open tasks with their latest step, oldest activity first. */
export const processingQueue = handle(async (req, res) => {
  const filter = { status: { $in: String(req.query.status || "Todo,In Progress").split(",").filter((s) => MAINTENANCE_TASK_STATUSES.includes(s)) } };
  if (req.query.team && isValidObjectId(req.query.team)) filter.team = req.query.team;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q.trim()), "i");
    filter.$or = [{ slid: rx }, { taskNumber: rx }, { ticketNumber: rx }, { customerName: rx }, { customerComplaint: rx }, { teamFeedback: rx }];
  }
  const tasks = await MaintenanceTask.find(filter).sort({ lastTicketAt: 1, createdAt: 1 }).limit(200).populate("team", "teamName teamCode").select("taskNumber slid customerName status priority dueDate ticketCount lastTicketAt createdAt team").lean();
  const latest = await MaintenanceTicket.aggregate([
    { $match: { task: { $in: tasks.map((t) => t._id) } } },
    { $sort: { eventDate: -1, createdAt: -1 } },
    { $group: { _id: "$task", ticketId: { $first: "$ticketId" }, transactionType: { $first: "$transactionType" }, transactionState: { $first: "$transactionState" }, eventDate: { $first: "$eventDate" }, followUpDate: { $first: "$followUpDate" } } },
  ]);
  const byTask = new Map(latest.map((l) => [String(l._id), l]));
  res.json(tasks.map((t) => ({ ...t, lastStep: byTask.get(String(t._id)) || null })));
});

export const recordTicket = handle(async (req, res) => {
  requireId(req.params.id, "task");
  const requestKey = typeof req.body.requestKey === "string" && req.body.requestKey.length <= 80 ? req.body.requestKey : undefined;
  if (requestKey) {
    const existing = await MaintenanceTicket.findOne({ requestKey }).select("-requestKey").lean();
    if (existing) return res.status(200).json({ ...existing, duplicate: true });
  }
  const task = await MaintenanceTask.findById(req.params.id).lean();
  if (!task) fail(404, "Maintenance task not found");
  const data = cleanTicket(req.body);
  if (!data.eventDate && data.eventDate !== null) data.eventDate = new Date();
  validateTicket(data);

  let ticket;
  for (let attempt = 0; attempt < 5 && !ticket; attempt++) {
    try {
      ticket = await withTransaction(async (session, undo) => {
        const [created] = await MaintenanceTicket.create(
          [{ ...data, ticketId: `MQ-${randomCode(8)}`, task: task._id, team: task.team, previousStatus: task.status, agentName: data.agentName || req.user.name || "", recordedBy: req.user._id, requestKey }],
          session ? { session } : {}
        );
        undo(() => MaintenanceTicket.deleteOne({ _id: created._id }));
        undo(() => MaintenanceTask.replaceOne({ _id: task._id }, task));
        await syncTaskFromTickets(task._id, session, { status: data.status });
        await audit(req, "ticket", created._id, "create", { summary: `${created.ticketId} on ${task.taskNumber}: ${data.transactionType}${data.transactionState ? ` / ${data.transactionState}` : ""}` }, session);
        if (data.status !== task.status) await audit(req, "task", task._id, "status", { changes: { status: { from: task.status, to: data.status } }, summary: `Status set by ${created.ticketId}` }, session);
        return created;
      });
    } catch (err) {
      if (isDup(err) && err.keyPattern?.requestKey) return res.status(200).json({ ...(await MaintenanceTicket.findOne({ requestKey }).select("-requestKey").lean()), duplicate: true });
      if (!(isDup(err) && err.keyPattern?.ticketId)) throw err;
    }
  }
  if (!ticket) fail(500, "Couldn't allocate a ticket id, try again");
  res.status(201).json(await MaintenanceTicket.findById(ticket._id).populate("recordedBy", "name").select("-requestKey").lean());
});

export const updateTicket = handle(async (req, res) => {
  requireId(req.params.ticketId, "ticket");
  const before = await MaintenanceTicket.findById(req.params.ticketId).lean();
  if (!before) fail(404, "Ticket not found");
  if (!isAdmin(req) && String(before.recordedBy) !== String(req.user._id)) fail(403, "Only the person who recorded this ticket or an admin can edit it");
  const data = cleanTicket(req.body);
  validateTicket({ ...before, ...data }, { partial: false });
  const taskBefore = await MaintenanceTask.findById(before.task).lean();
  const updated = await withTransaction(async (session, undo) => {
    const t = await MaintenanceTicket.findByIdAndUpdate(before._id, { ...data, editedBy: req.user._id, editedAt: new Date() }, { new: true, runValidators: true, session });
    undo(() => MaintenanceTicket.replaceOne({ _id: before._id }, before));
    undo(() => taskBefore && MaintenanceTask.replaceOne({ _id: taskBefore._id }, taskBefore));
    // Only the latest step decides the task status.
    const latest = await MaintenanceTicket.find({ task: before.task }).sort({ eventDate: -1, createdAt: -1 }).limit(1).session(session).lean();
    const isLatest = latest[0] && String(latest[0]._id) === String(before._id);
    await syncTaskFromTickets(before.task, session, isLatest ? { status: t.status } : {});
    const changes = diff(before, t.toObject(), TICKET_FIELDS);
    if (changes) await audit(req, "ticket", before._id, "update", { changes, summary: `Edited ${before.ticketId}` }, session);
    return t;
  });
  res.json(await MaintenanceTicket.findById(updated._id).populate("recordedBy editedBy", "name").select("-requestKey").lean());
});

export const deleteTicket = handle(async (req, res) => {
  if (!isAdmin(req)) fail(403, "Only admins can delete tickets");
  requireId(req.params.ticketId, "ticket");
  const ticket = await MaintenanceTicket.findById(req.params.ticketId).lean();
  if (!ticket) fail(404, "Ticket not found");
  const taskBefore = await MaintenanceTask.findById(ticket.task).lean();
  await withTransaction(async (session, undo) => {
    await MaintenanceTicket.deleteOne({ _id: ticket._id }, { session });
    undo(() => MaintenanceTicket.create(ticket));
    undo(() => taskBefore && MaintenanceTask.replaceOne({ _id: taskBefore._id }, taskBefore));
    // The task falls back to the status the newest remaining step set, or what it was before this one.
    const latest = await MaintenanceTicket.find({ task: ticket.task }).sort({ eventDate: -1, createdAt: -1 }).limit(1).session(session).lean();
    await syncTaskFromTickets(ticket.task, session, { status: latest[0]?.status || ticket.previousStatus || "Todo" });
    await audit(req, "ticket", ticket._id, "delete", { summary: `Deleted ${ticket.ticketId}` }, session);
  });
  res.json({ deleted: true, id: ticket._id });
});

/** Module overview for the landing tabs. */
export const getOverview = handle(async (_req, res) => {
  const [teams, activeTeams, tasks, resolvedTasks, samplesThisMonth] = await Promise.all([
    MaintenanceTeam.countDocuments({}),
    MaintenanceTeam.countDocuments({ status: "Active" }),
    MaintenanceTask.countDocuments({}),
    MaintenanceTask.countDocuments({ resolvedAfterVisit: "Yes" }),
    MaintenanceSurveySample.aggregate([{ $match: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 } }, { $group: { _id: null, n: { $sum: "$sampleSize" }, entries: { $sum: 1 } } }]),
  ]);
  res.json({ teams, activeTeams, tasks, resolvedTasks, samplesThisMonth: samplesThisMonth[0]?.n || 0, sampleEntriesThisMonth: samplesThisMonth[0]?.entries || 0 });
});

/** Bulk upload maintenance sheet with "Tel no" mapping to SLID, NCF auto-detection and HC responsibility. */
export const bulkUploadTasks = handle(async (req, res) => {
  const { rows, defaultTeam, updateExistingNcf = true } = req.body || {};
  if (!Array.isArray(rows) || !rows.length) fail(400, "No rows provided for upload");

  let targetTeam = defaultTeam;
  if (!targetTeam || !isValidObjectId(targetTeam)) {
    const active = await MaintenanceTeam.findOne({ status: "Active" }).select("_id").lean();
    if (active) targetTeam = String(active._id);
  }

  let createdCount = 0;
  let updatedCount = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rawSlid = r.slid || r.telNo || r.tel || r.telephone || r["Tel no"] || r["Tel No"] || r["tel no"] || r["TEL NO"] || "";
    const slid = String(rawSlid).trim().toUpperCase();
    if (!slid) continue;

    let instDate = r.installationDate || r.installDate || r.pisDate || r["Installation date"] || r["PIS date"] || r["Install Date"] || null;
    if (instDate) {
      instDate = new Date(instDate);
      if (isNaN(instDate.getTime())) instDate = null;
    }

    let creationDate = r.creationDate || r.createdDate || r.faultDate || r.date || r["Creation date"] || r["Date"] || r["Reporting date"] || null;
    if (creationDate) {
      creationDate = new Date(creationDate);
      if (isNaN(creationDate.getTime())) creationDate = null;
    }

    let isNcf = r.ncf != null ? Boolean(r.ncf === true || r.ncf === "true" || r.ncf === "Yes" || r.ncf === "1" || r.ncf === 1) : null;
    if (isNcf == null && instDate) {
      const refDate = creationDate || new Date();
      const diffMs = refDate.getTime() - instDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays <= 31) isNcf = true;
      else isNcf = false;
    }

    let isHc = r.hcResponsibility != null ? Boolean(r.hcResponsibility === true || r.hcResponsibility === "true" || r.hcResponsibility === "Yes" || r.hcResponsibility === "1" || r.hcResponsibility === 1) : false;

    // RCA & Team accountability extraction from uploaded row
    const reason = String(r.reason || r["Reason"] || r["Main reason"] || "").trim();
    const subReason = String(r.subReason || r["Sub reason"] || r["Sub-Reason"] || "").trim();
    const rootCause = String(r.rootCause || r["Root cause"] || "").trim();
    const responsible = String(r.responsible || r["Responsible"] || r["Owner"] || "").trim();
    const rawAccountable = r.teamAccountability || r["Team accountability"] || r["Accountability"] || r["Team Accountable"] || "";
    let teamAccountability = "No";
    if (typeof rawAccountable === "string" && (rawAccountable.toLowerCase().startsWith("y") || rawAccountable.toLowerCase() === "true" || rawAccountable === "1")) {
      teamAccountability = "Yes";
    } else if (rawAccountable === true || rawAccountable === 1) {
      teamAccountability = "Yes";
    } else if (typeof rawAccountable === "string" && rawAccountable.trim()) {
      teamAccountability = rawAccountable.trim();
    }

    const rcaList = [];
    if (reason || subReason || rootCause || responsible || rawAccountable) {
      rcaList.push({
        reason: reason || "Unknown",
        subReason: subReason || "Unknown",
        rootCause: rootCause || "Unknown",
        responsible: responsible || "Unknown",
        teamAccountability: teamAccountability || "No",
      });
    }

    // Check if task with this SLID already exists
    const existing = await MaintenanceTask.findOne({ slid }).lean();
    if (existing) {
      if (updateExistingNcf) {
        const patch = {};
        if (isNcf !== null) patch.ncf = isNcf;
        else if (instDate) {
          const refDate = existing.creationDate || existing.faultDate || existing.createdAt || new Date();
          const diffMs = new Date(refDate).getTime() - instDate.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays >= 0 && diffDays <= 31) patch.ncf = true;
        }
        if (instDate) patch.installationDate = instDate;
        if (isHc) patch.hcResponsibility = true;
        if (r.teamFeedback) patch.teamFeedback = String(r.teamFeedback).trim();
        if (r.customerComplaint) patch.customerComplaint = String(r.customerComplaint).trim();
        if (r.fiberCategory) patch.fiberCategory = String(r.fiberCategory).trim();
        if (rcaList.length > 0) patch.rca = rcaList;
        const resp = normYesNo(r.teamResponsibility ?? r["Team responsibility"]);
        if (resp === "Yes" || resp === "No") patch.teamResponsibility = resp;
        const followUp = normYesNo(r.customerFollowUp ?? r["Customer follow-up"]);
        if (followUp === "Yes" || followUp === "No") patch.customerFollowUp = followUp;
        if (Object.keys(patch).length > 0) {
          patch.updatedBy = req.user._id;
          await MaintenanceTask.findByIdAndUpdate(existing._id, patch);
          updatedCount++;
        }
      }
    } else {
      try {
        const taskData = cleanTask({
          slid,
          ticketNumber: String(r.ticketNumber || r["Ticket number"] || r.ticket || "").trim(),
          customerName: String(r.customerName || r["Customer name"] || r.customer || "").trim(),
          contactNumber: String(r.contactNumber || r["Contact number"] || r.phone || "").trim(),
          customerComplaint: String(r.customerComplaint || r["Customer complaint"] || "").trim(),
          fiberCategory: String(r.fiberCategory || r["Fiber category"] || "").trim(),
          teamFeedback: String(r.teamFeedback || r["Team feedback"] || "").trim(),
          faultType: String(r.faultType || r["Fault type"] || "").trim(),
          faultDate: r.faultDate ? new Date(r.faultDate) : null,
          creationDate: creationDate || new Date(),
          dueDate: r.dueDate ? new Date(r.dueDate) : null,
          interviewDate: r.interviewDate ? new Date(r.interviewDate) : null,
          installationDate: instDate,
          ncf: isNcf || false,
          hcResponsibility: isHc || false,
          team: r.team && isValidObjectId(r.team) ? r.team : targetTeam,
          resolvedAfterVisit: r.resolvedAfterVisit || "Not specified",
          teamResponsibility: r.teamResponsibility ?? r["Team responsibility"],
          customerFollowUp: r.customerFollowUp ?? r["Customer follow-up"],
          rca: rcaList.length > 0 ? rcaList : undefined,
        });
        if (taskData.team) {
          await MaintenanceTask.create({
            ...taskData,
            taskNumber: nextTaskNumber(),
            createdBy: req.user._id,
            updatedBy: req.user._id,
          });
          createdCount++;
        } else {
          errors.push({ slid, error: "No maintenance team specified" });
        }
      } catch (err) {
        errors.push({ slid, error: err.message });
      }
    }
  }

  res.json({
    created: createdCount,
    updated: updatedCount,
    total: rows.length,
    errors: errors.slice(0, 10),
  });
});
