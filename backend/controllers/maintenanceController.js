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

const TEAM_FIELDS = ["teamName", "teamCode", "company", "supervisor", "supervisorPhone", "governorate", "coverageAreas", "shift", "vehicle", "members", "status", "notes"];

const cleanTeam = (body) => {
  const t = pick(body, TEAM_FIELDS);
  if (typeof t.coverageAreas === "string") t.coverageAreas = t.coverageAreas.split(",");
  if (Array.isArray(t.coverageAreas)) t.coverageAreas = [...new Set(t.coverageAreas.map((s) => String(s).trim()).filter(Boolean))];
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
      { $group: { _id: "$team", total: { $sum: 1 }, open: { $sum: { $cond: [{ $ne: ["$status", "Closed"] }, 1, 0] } }, lastTaskAt: { $max: "$createdAt" } } },
    ]),
    MaintenanceSurveySample.aggregate([{ $match: { team: { $in: ids } } }, { $group: { _id: "$team", samples: { $sum: "$sampleSize" }, entries: { $sum: 1 } } }]),
  ]);
  const ts = new Map(taskStats.map((s) => [String(s._id), s]));
  const ss = new Map(sampleStats.map((s) => [String(s._id), s]));
  res.json(
    teams.map((t) => ({
      ...t,
      stats: {
        tasks: ts.get(String(t._id))?.total || 0,
        openTasks: ts.get(String(t._id))?.open || 0,
        lastTaskAt: ts.get(String(t._id))?.lastTaskAt || null,
        samples: ss.get(String(t._id))?.samples || 0,
        sampleEntries: ss.get(String(t._id))?.entries || 0,
      },
    }))
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

const TASK_FIELDS = ["slid", "ticketNumber", "customerName", "contactNumber", "governorate", "district", "team", "surveySample", "evaluationScore", "customerFeedback", "interviewDate", "faultDate", "dueDate", "faultType", "priority", "status", "assignedTo", "rca", "notes"];
const DATE_FIELDS = ["interviewDate", "faultDate", "dueDate"];

const cleanTask = (body) => {
  const t = pick(body, TASK_FIELDS);
  for (const k of DATE_FIELDS) if (t[k] === "") t[k] = null;
  if (t.surveySample === "") t.surveySample = null;
  if (t.evaluationScore === "" || t.evaluationScore === "Not specified") t.evaluationScore = null;
  if (t.evaluationScore != null) t.evaluationScore = Number(t.evaluationScore);
  if (Array.isArray(t.assignedTo)) t.assignedTo = t.assignedTo.map((u) => (u && typeof u === "object" ? u._id : u)).filter((id) => isValidObjectId(id));
  if (Array.isArray(t.rca)) t.rca = t.rca.filter((r) => r && Object.values(r).some((v) => v && v !== "Not specified")).map((r) => pick(r, ["reason", "subReason", "rootCause", "responsible", "teamAccountability"]));
  if (typeof t.slid === "string") t.slid = t.slid.trim().toUpperCase();
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
  if (data.evaluationScore != null && !(Number.isInteger(data.evaluationScore) && data.evaluationScore >= 1 && data.evaluationScore <= 10)) errors.evaluationScore = "Score must be 1–10";
  if (data.dueDate && data.faultDate && new Date(data.dueDate) < new Date(data.faultDate)) errors.dueDate = "Due date is before the fault date";
  if (Object.keys(errors).length) fail(400, Object.values(errors)[0], { fields: errors });
};

const nextTaskNumber = () => {
  const d = new Date();
  return `MT-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}-${randomCode(5)}`;
};

const populateTask = (q) => q.populate("team", "teamName teamCode status").populate("assignedTo", "name email").populate("createdBy updatedBy", "name").populate("surveySample", "year month sampleSize");

export const listTasks = handle(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  const filter = {};
  if (req.query.status) filter.status = { $in: String(req.query.status).split(",").filter((s) => MAINTENANCE_TASK_STATUSES.includes(s)) };
  if (req.query.priority) filter.priority = { $in: String(req.query.priority).split(",") };
  if (req.query.team) filter.team = { $in: String(req.query.team).split(",").filter(isValidObjectId) };
  if (req.query.mine === "1") filter.assignedTo = req.user._id;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q.trim()), "i");
    filter.$or = [{ slid: rx }, { taskNumber: rx }, { ticketNumber: rx }, { customerName: rx }, { contactNumber: rx }];
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
    filter.$or = [{ slid: rx }, { taskNumber: rx }, { ticketNumber: rx }, { customerName: rx }];
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
  const [teams, activeTeams, tasks, statusCounts, overdue, samplesThisMonth] = await Promise.all([
    MaintenanceTeam.countDocuments({}),
    MaintenanceTeam.countDocuments({ status: "Active" }),
    MaintenanceTask.countDocuments({}),
    MaintenanceTask.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    MaintenanceTask.countDocuments({ status: { $ne: "Closed" }, dueDate: { $lt: new Date() } }),
    MaintenanceSurveySample.aggregate([{ $match: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 } }, { $group: { _id: null, n: { $sum: "$sampleSize" }, entries: { $sum: 1 } } }]),
  ]);
  res.json({ teams, activeTeams, tasks, statusCounts: Object.fromEntries(statusCounts.map((s) => [s._id, s.n])), overdue, samplesThisMonth: samplesThisMonth[0]?.n || 0, sampleEntriesThisMonth: samplesThisMonth[0]?.entries || 0 });
});
