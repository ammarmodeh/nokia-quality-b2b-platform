// Trackers added online, team-code history, calendar entries and per-team analysis.
// All endpoints are new (additive); existing endpoints keep their shapes.
import mongoose from "mongoose";
import { Tracker, TeamCodeAssignment, CalendarEntry } from "../models/qopsModels.js";
import { CustomTable, CustomRow, TableTemplate } from "../models/customTableModels.js";
import { FieldTeamsSchema } from "../models/fieldTeamsModel.js";
import { CustomerIssueSchema } from "../models/customerIssueModel.js";
import { TaskSchema } from "../models/taskModel.js";
import { LabAssessment } from "../models/labAssessmentModel.js";
import { OnTheJobAssessment } from "../models/onTheJobAssessmentModel.js";
import QuizResult from "../models/quizResultModel.js";
import { BUILT_IN_CATEGORIES, taxonomyForIssue, TAXONOMY } from "../utils/taxonomy.js";
import { reloadTrackers } from "../utils/trackers.js";
import { EPOCH, findOverlap, makeResolver, normCode } from "../utils/teamCodes.js";

const isAdmin = (req) => req.user?.role === "Admin";
const oid = (v) => mongoose.Types.ObjectId.isValid(String(v));
const fail = (res, code, message, extra) => res.status(code).json({ message, ...extra });
const slug = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 40);
const validDate = (v) => v !== undefined && v !== null && v !== "" && !Number.isNaN(new Date(v).getTime());
const asText = (v) => (v === null || v === undefined ? "" : typeof v === "object" ? (v.category ? [v.category, v.sub].filter(Boolean).join(" · ") : JSON.stringify(v)) : String(v));

// ================================================================ trackers
export const listTrackers = async (req, res) => {
  const archived = req.query.archived === "true" && isAdmin(req);
  const list = await Tracker.find({ archived }).sort({ order: 1, name: 1 }).lean();
  const counts = await CustomTable.aggregate([{ $match: { archived: false, issueCategory: { $in: list.map((t) => t.name) } } }, { $group: { _id: "$issueCategory", n: { $sum: 1 } } }]);
  const by = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  res.json(list.map((t) => ({ ...t, tableCount: by[t.name] || 0 })));
};

const cleanSubs = (subs) => [...new Set((Array.isArray(subs) ? subs : []).map((s) => String(s).trim()).filter(Boolean))].slice(0, 20);

export const createTracker = async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return fail(res, 400, "Name the tracker");
  if (name.length > 40) return fail(res, 400, "Keep the name under 40 characters");
  if (BUILT_IN_CATEGORIES.some((c) => c.toLowerCase() === name.toLowerCase())) return fail(res, 409, `“${name}” is a built-in tracker`);
  if (await Tracker.exists({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })) return fail(res, 409, `A tracker called “${name}” already exists`);
  let key = slug(name) || `tracker-${Date.now().toString(36)}`;
  if (await Tracker.exists({ key })) key = `${key}-${Date.now().toString(36).slice(-4)}`;
  const t = await Tracker.create({
    name,
    key,
    description: String(req.body.description || ""),
    color: /^#[0-9a-f]{6}$/i.test(req.body.color || "") ? req.body.color : "#475569",
    icon: String(req.body.icon || "track_changes"),
    subs: cleanSubs(req.body.subs),
    order: (await Tracker.countDocuments()) + 1,
    createdBy: req.user._id,
  });
  await reloadTrackers();
  res.status(201).json(t);
};

export const updateTracker = async (req, res) => {
  if (!oid(req.params.id)) return fail(res, 404, "Tracker not found");
  const t = await Tracker.findById(req.params.id);
  if (!t) return fail(res, 404, "Tracker not found");
  const oldName = t.name;
  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) return fail(res, 400, "Name the tracker");
    if (BUILT_IN_CATEGORIES.some((c) => c.toLowerCase() === name.toLowerCase())) return fail(res, 409, `“${name}” is a built-in tracker`);
    if (await Tracker.exists({ _id: { $ne: t._id }, name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })) return fail(res, 409, `A tracker called “${name}” already exists`);
    t.name = name;
  }
  if (req.body.subs !== undefined) {
    const subs = cleanSubs(req.body.subs);
    const dropped = t.subs.filter((s) => !subs.includes(s));
    if (dropped.length) {
      const used = await CustomTable.countDocuments({ issueCategory: oldName, issueSubCategory: { $in: dropped }, archived: false });
      if (used) return fail(res, 409, `${used} table${used === 1 ? " uses" : "s use"} “${dropped.join("”, “")}”. Move or archive ${used === 1 ? "it" : "them"} first.`);
    }
    t.subs = subs;
  }
  if (req.body.description !== undefined) t.description = String(req.body.description);
  if (req.body.color !== undefined && /^#[0-9a-f]{6}$/i.test(req.body.color)) t.color = req.body.color;
  if (req.body.icon !== undefined) t.icon = String(req.body.icon);
  if (req.body.order !== undefined) t.order = Number(req.body.order) || 0;
  if (req.body.archived !== undefined) t.archived = Boolean(req.body.archived);
  await t.save();
  if (t.name !== oldName) {
    // the name is the category stored on tables, templates and calendar entries
    await Promise.all([
      CustomTable.updateMany({ issueCategory: oldName }, { $set: { issueCategory: t.name } }),
      TableTemplate.updateMany({ issueCategory: oldName }, { $set: { issueCategory: t.name } }),
      CalendarEntry.updateMany({ issueCategory: oldName }, { $set: { issueCategory: t.name } }),
    ]);
  }
  await reloadTrackers();
  res.json(t);
};

/** Permanent delete: only a tracker with no tables (archive it otherwise). */
export const deleteTracker = async (req, res) => {
  if (!oid(req.params.id)) return fail(res, 404, "Tracker not found");
  const t = await Tracker.findById(req.params.id);
  if (!t) return fail(res, 404, "Tracker not found");
  if (req.body?.confirm !== "permanent delete") return fail(res, 400, "Type “permanent delete” to confirm");
  const used = await CustomTable.countDocuments({ issueCategory: t.name });
  if (used) return fail(res, 409, `“${t.name}” still has ${used} table${used === 1 ? "" : "s"} (including archived ones). Archive the tracker instead, or delete its tables first.`);
  await t.deleteOne();
  await reloadTrackers();
  res.json({ deleted: [String(t._id)], failed: [] });
};

// ================================================================ team codes
const teamLite = { teamName: 1, teamCode: 1, teamCompany: 1, isTerminated: 1, isActive: 1 };

/** GET /team-codes?code=&teamId= — recorded periods, plus codes that have no history yet. */
export const listTeamCodes = async (req, res) => {
  const q = {};
  if (req.query.code) q.code = normCode(req.query.code);
  if (req.query.teamId && oid(req.query.teamId)) q.fieldTeamId = req.query.teamId;
  const periods = await TeamCodeAssignment.find(q).sort({ code: 1, from: -1 }).populate("fieldTeamId", teamLite).populate("createdBy", "name").lean();
  const withHistory = new Set(await TeamCodeAssignment.distinct("code"));
  const teamQ = req.query.teamId && oid(req.query.teamId) ? { _id: req.query.teamId } : {};
  const teams = await FieldTeamsSchema.find(teamQ, teamLite).lean();
  const implicit = teams
    .filter((t) => t.teamCode && !withHistory.has(normCode(t.teamCode)) && (!q.code || normCode(t.teamCode) === q.code))
    .map((t) => ({ code: normCode(t.teamCode), fieldTeamId: t, from: null, to: null, implicit: true }));
  res.json({ periods, implicit });
};

const periodBody = async (req, res, exceptId) => {
  const code = normCode(req.body.code);
  if (!code) return fail(res, 400, "Enter the team code"), null;
  if (!oid(req.body.fieldTeamId) || !(await FieldTeamsSchema.exists({ _id: req.body.fieldTeamId }))) return fail(res, 400, "Choose the field team"), null;
  const from = validDate(req.body.from) ? new Date(req.body.from) : EPOCH;
  const to = validDate(req.body.to) ? new Date(req.body.to) : null;
  if (to && to <= from) return fail(res, 400, "The end date must be after the start date"), null;
  const clash = await findOverlap({ code, from, to, exceptId });
  if (clash) {
    const d = (x) => (x ? new Date(x).toISOString().slice(0, 10) : "now");
    return fail(res, 409, `${code} was held by ${clash.fieldTeamId?.teamName || "another team"} from ${d(clash.from)} to ${d(clash.to)}. Shorten that period first.`), null;
  }
  return { code, fieldTeamId: req.body.fieldTeamId, from, to, note: String(req.body.note || "") };
};

export const createTeamCode = async (req, res) => {
  const body = await periodBody(req, res);
  if (!body) return;
  const p = await TeamCodeAssignment.create({ ...body, source: "manual", createdBy: req.user._id });
  res.status(201).json(await TeamCodeAssignment.findById(p._id).populate("fieldTeamId", teamLite).lean());
};

export const updateTeamCode = async (req, res) => {
  if (!oid(req.params.id)) return fail(res, 404, "Period not found");
  const p = await TeamCodeAssignment.findById(req.params.id);
  if (!p) return fail(res, 404, "Period not found");
  const body = await periodBody({ body: { code: p.code, fieldTeamId: p.fieldTeamId, from: p.from, to: p.to, note: p.note, ...req.body } }, res, p._id);
  if (!body) return;
  Object.assign(p, body);
  await p.save();
  res.json(await TeamCodeAssignment.findById(p._id).populate("fieldTeamId", teamLite).lean());
};

export const deleteTeamCode = async (req, res) => {
  if (!oid(req.params.id)) return fail(res, 404, "Period not found");
  const p = await TeamCodeAssignment.findByIdAndDelete(req.params.id);
  if (!p) return fail(res, 404, "Period not found");
  res.json({ ok: true });
};

/** GET /team-codes/resolve?code=&date= — who held the code that day. */
export const resolveTeamCode = async (req, res) => {
  const hit = await makeResolver()(req.query.code, validDate(req.query.date) ? req.query.date : new Date());
  res.json(hit);
};

// ================================================================ calendar entries
const issueTax = (s) => (s.issueCategory ? { category: s.issueCategory, sub: s.issueSubCategory || null } : (() => { const d = taxonomyForIssue(s) || { issueCategory: "OJO Snags", issueSubCategory: "Installation" }; return { category: d.issueCategory, sub: d.issueSubCategory }; })());

/** Copy what the calendar needs from the ticket an entry points at. */
const targetSnapshot = async (req, kind, id, tableId) => {
  if (!oid(id)) return null;
  if (kind === "row") {
    const row = await CustomRow.findOne({ _id: id, deleted: false }).lean();
    if (!row) return null;
    const t = await CustomTable.findOne({ _id: row.tableId, ...(isAdmin(req) ? {} : { visibility: { $ne: "admins" } }) }).lean();
    if (!t || (tableId && String(tableId) !== String(t._id))) return null;
    const primary = t.fields.find((f) => f.key === t.primaryField);
    const team = row.fieldTeamId ? await FieldTeamsSchema.findById(row.fieldTeamId, { teamName: 1 }).lean() : null;
    return { target: { kind, id: row._id, tableId: t._id }, title: asText(primary ? row.data?.[primary.key] : "") || `#${row.autoNumber}`, slid: row.slid || "", issueCategory: t.issueCategory, issueSubCategory: t.issueSubCategory, tableName: t.name, fieldTeamId: row.fieldTeamId || null, teamName: team?.teamName || null };
  }
  if (kind === "issue") {
    const s = await CustomerIssueSchema.findById(id).lean();
    if (!s) return null;
    const tax = issueTax(s);
    const hit = s.teamCode ? await makeResolver()(s.teamCode, s.date || s.pisDate || s.createdAt) : null;
    return { target: { kind, id: s._id, tableId: null }, title: s.customerName || s.slid || "Snag", slid: s.slid || "", issueCategory: tax.category, issueSubCategory: tax.sub, tableName: null, fieldTeamId: hit?.fieldTeamId || null, teamName: s.teamName || hit?.teamName || null };
  }
  if (kind === "task") {
    const k = await TaskSchema.findById(id).lean();
    if (!k) return null;
    return { target: { kind, id: k._id, tableId: null }, title: k.customerName || k.slid || "Task", slid: k.slid || "", issueCategory: k.issueCategory || "DVOC", issueSubCategory: k.issueCategory ? k.issueSubCategory : "Installation", tableName: null, fieldTeamId: k.teamId || null, teamName: k.teamName || null };
  }
  return null;
};

const ENTRY_STATUS = ["planned", "done", "cancelled"];
const entryFields = (body) => {
  const out = {};
  if (body.date !== undefined) {
    if (!validDate(body.date)) throw new Error("Choose a date");
    out.date = new Date(body.date);
  }
  if (body.time !== undefined) {
    if (body.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.time)) throw new Error("Time must look like 09:30");
    out.time = body.time || "";
  }
  if (body.type !== undefined) out.type = String(body.type || "Visit").trim().slice(0, 40) || "Visit";
  if (body.note !== undefined) out.note = String(body.note || "").slice(0, 2000);
  if (body.status !== undefined) {
    if (!ENTRY_STATUS.includes(body.status)) throw new Error("Unknown status");
    out.status = body.status;
  }
  if (body.assignees !== undefined) out.assignees = (Array.isArray(body.assignees) ? body.assignees : []).filter(oid);
  return out;
};

/** GET /calendar-entries?from&to  or  ?kind=&id= (the entries of one ticket) */
export const listEntries = async (req, res) => {
  const q = {};
  if (req.query.id) {
    if (!oid(req.query.id)) return res.json([]);
    q["target.id"] = req.query.id;
  } else {
    const from = validDate(req.query.from) ? new Date(req.query.from) : new Date(Date.now() - 90 * 864e5);
    const to = validDate(req.query.to) ? new Date(req.query.to) : new Date(Date.now() + 180 * 864e5);
    q.date = { $gte: from, $lte: to };
  }
  res.json(await CalendarEntry.find(q).sort({ date: 1, time: 1 }).limit(5000).populate("createdBy", "name").lean());
};

export const createEntry = async (req, res) => {
  try {
    const { kind, id, tableId } = req.body.target || req.body;
    const snap = await targetSnapshot(req, kind, id, tableId);
    if (!snap) return fail(res, 404, "That ticket wasn't found (or you can't see it)");
    const fields = entryFields({ type: "Visit", ...req.body });
    if (!fields.date) return fail(res, 400, "Choose a date");
    const e = await CalendarEntry.create({ ...snap, ...fields, createdBy: req.user._id, updatedBy: req.user._id });
    res.status(201).json(e);
  } catch (e) {
    fail(res, 400, e.message);
  }
};

export const updateEntry = async (req, res) => {
  if (!oid(req.params.id)) return fail(res, 404, "Calendar entry not found");
  const e = await CalendarEntry.findById(req.params.id);
  if (!e) return fail(res, 404, "Calendar entry not found");
  try {
    Object.assign(e, entryFields(req.body), { updatedBy: req.user._id });
    // refresh the copied ticket details (team, title) while we're here
    const snap = await targetSnapshot(req, e.target.kind, e.target.id, e.target.tableId);
    if (snap) Object.assign(e, { title: snap.title, slid: snap.slid, issueCategory: snap.issueCategory, issueSubCategory: snap.issueSubCategory, tableName: snap.tableName, fieldTeamId: snap.fieldTeamId, teamName: snap.teamName });
    await e.save();
    res.json(e);
  } catch (err) {
    fail(res, 400, err.message);
  }
};

export const deleteEntry = async (req, res) => {
  if (!oid(req.params.id)) return fail(res, 404, "Calendar entry not found");
  const e = await CalendarEntry.findById(req.params.id);
  if (!e) return fail(res, 404, "Calendar entry not found");
  if (!isAdmin(req) && String(e.createdBy) !== String(req.user._id)) return fail(res, 403, "Only the person who added it, or an admin, can remove it");
  await e.deleteOne();
  res.json({ ok: true });
};

// ================================================================ team analysis
const avg = (list) => (list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : null);
const inRange = (d, from, to) => d && d >= from && d <= to;

/**
 * Everything attributed to field teams in [from, to]:
 * - custom-table rows: their stored team (team-code snapshot or a Field team field)
 * - snags / complaints (OJO, TCRM, TRC, FAT): team code + date through the code history,
 *   else the team name recorded on the ticket
 * - DVOC tasks: their team id (else name)
 * - lab, on-the-job and technical (quiz) assessments
 */
const collect = async (from, to, onlyTeam) => {
  const teams = await FieldTeamsSchema.find(onlyTeam ? { _id: onlyTeam } : {}, teamLite).lean();
  const allTeams = onlyTeam ? await FieldTeamsSchema.find({}, { teamName: 1 }).lean() : teams;
  const byName = new Map(allTeams.filter((t) => t.teamName).map((t) => [t.teamName.trim().toLowerCase(), String(t._id)]));
  const wanted = new Set(teams.map((t) => String(t._id)));
  const resolver = makeResolver();
  const records = []; // { teamId, source, category, sub, date, slid, title, link }

  const tables = await CustomTable.find({ archived: false }, { name: 1, issueCategory: 1, issueSubCategory: 1, primaryField: 1, fields: 1 }).lean();
  const tableById = new Map(tables.map((t) => [String(t._id), t]));
  const rows = await CustomRow.find({ deleted: false, fieldTeamId: onlyTeam ? onlyTeam : { $ne: null }, tableId: { $in: tables.map((t) => t._id) } }, { tableId: 1, fieldTeamId: 1, dueDate: 1, createdAt: 1, slid: 1, data: 1, autoNumber: 1, teamResolution: 1 }).lean();
  for (const r of rows) {
    const d = r.dueDate || r.createdAt;
    if (!inRange(d, from, to)) continue;
    const t = tableById.get(String(r.tableId));
    records.push({ teamId: String(r.fieldTeamId), source: "table", category: t.issueCategory, sub: t.issueSubCategory, date: d, slid: r.slid || "", title: asText(r.data?.[t.primaryField]) || `#${r.autoNumber}`, tableId: t._id, tableName: t.name, link: `/tables/${t._id}?row=${r._id}`, code: r.teamResolution?.code || "" });
  }

  const issues = await CustomerIssueSchema.find({ $or: [{ date: { $gte: from, $lte: to } }, { pisDate: { $gte: from, $lte: to } }, { createdAt: { $gte: from, $lte: to } }] }, { slid: 1, teamCode: 1, teamName: 1, issueCategory: 1, issueSubCategory: 1, fromMain: 1, fromSub: 1, from: 1, snagType: 1, date: 1, pisDate: 1, createdAt: 1, customerName: 1 }).lean();
  for (const s of issues) {
    const d = s.date || s.pisDate || s.createdAt;
    if (!inRange(d, from, to)) continue;
    let teamId = null;
    if (s.teamCode) teamId = (await resolver(s.teamCode, d))?.fieldTeamId;
    if (!teamId && s.teamName) teamId = byName.get(s.teamName.trim().toLowerCase());
    if (!teamId) continue;
    const tax = issueTax(s);
    const path = { "OJO Snags": "/ojo-snags", TCRM: "/tcrm", TRC: "/trc", "Internal Audit (FAT)": "/internal-audit" }[tax.category] || "/ojo-snags";
    records.push({ teamId: String(teamId), source: "issue", category: tax.category, sub: tax.sub, date: d, slid: s.slid || "", title: s.customerName || s.slid || "Snag", link: `${path}?q=${encodeURIComponent(s.slid || "")}`, code: normCode(s.teamCode) });
  }

  const tasks = await TaskSchema.find({ $or: [{ interviewDate: { $gte: from, $lte: to } }, { createdAt: { $gte: from, $lte: to } }] }, { slid: 1, teamId: 1, teamName: 1, issueCategory: 1, issueSubCategory: 1, interviewDate: 1, createdAt: 1, customerName: 1 }).lean();
  for (const k of tasks) {
    const d = k.interviewDate || k.createdAt;
    if (!inRange(d, from, to)) continue;
    const teamId = k.teamId ? String(k.teamId) : k.teamName ? byName.get(k.teamName.trim().toLowerCase()) : null;
    if (!teamId) continue;
    records.push({ teamId: String(teamId), source: "task", category: k.issueCategory || "DVOC", sub: k.issueCategory ? k.issueSubCategory : "Installation", date: d, slid: k.slid || "", title: k.customerName || k.slid || "Task", link: `/tasks-list?task=${k._id}` });
  }

  const [lab, ojt, quiz] = await Promise.all([
    LabAssessment.find({ assessmentDate: { $gte: from, $lte: to }, ...(onlyTeam ? { fieldTeamId: onlyTeam } : {}) }, { fieldTeamId: 1, overallScore: 1, assessmentDate: 1 }).lean(),
    OnTheJobAssessment.find({ assessmentDate: { $gte: from, $lte: to }, ...(onlyTeam ? { fieldTeamId: onlyTeam } : {}) }, { fieldTeamId: 1, overallScore: 1, assessmentDate: 1 }).lean(),
    QuizResult.find({ submittedAt: { $gte: from, $lte: to }, ...(onlyTeam ? { teamId: String(onlyTeam) } : {}) }, { teamId: 1, percentage: 1, submittedAt: 1 }).lean(),
  ]);
  const assess = { lab: new Map(), ojt: new Map(), quiz: new Map() };
  const push = (m, id, v, d) => { const k = String(id); const x = m.get(k) || { scores: [], last: null }; if (typeof v === "number") x.scores.push(v); if (!x.last || d > x.last) x.last = d; m.set(k, x); };
  lab.forEach((a) => push(assess.lab, a.fieldTeamId, a.overallScore, a.assessmentDate));
  ojt.forEach((a) => push(assess.ojt, a.fieldTeamId, a.overallScore, a.assessmentDate));
  quiz.forEach((a) => push(assess.quiz, a.teamId, a.percentage, a.submittedAt));

  return { teams, wanted, records: records.filter((r) => wanted.has(r.teamId)), assess };
};

const rangeOf = (req) => ({
  from: validDate(req.query.from) ? new Date(req.query.from) : EPOCH,
  to: validDate(req.query.to) ? new Date(req.query.to) : new Date(Date.now() + 365 * 864e5),
});
const assessOut = (m, id) => {
  const x = m.get(String(id));
  return x ? { count: x.scores.length, average: avg(x.scores), last: x.last } : { count: 0, average: null, last: null };
};

/** GET /team-analytics?from&to — one line per team: records per tracker and assessment averages. */
export const teamMatrix = async (req, res) => {
  const { from, to } = rangeOf(req);
  const { teams, records, assess } = await collect(from, to, null);
  const by = new Map();
  for (const r of records) {
    const x = by.get(r.teamId) || { total: 0, byCategory: {} };
    x.total++;
    x.byCategory[r.category] = (x.byCategory[r.category] || 0) + 1;
    by.set(r.teamId, x);
  }
  res.json({
    from,
    to,
    categories: TAXONOMY.map((t) => t.category),
    teams: teams.map((t) => ({
      fieldTeamId: t._id,
      teamName: t.teamName,
      teamCode: t.teamCode,
      teamCompany: t.teamCompany,
      isTerminated: t.isTerminated,
      total: by.get(String(t._id))?.total || 0,
      byCategory: by.get(String(t._id))?.byCategory || {},
      lab: assessOut(assess.lab, t._id),
      ojt: assessOut(assess.ojt, t._id),
      technical: assessOut(assess.quiz, t._id),
    })),
  });
};

/** GET /team-analytics/:teamId?from&to — one team in depth. */
export const teamDetail = async (req, res) => {
  if (!oid(req.params.teamId)) return fail(res, 404, "Team not found");
  const { from, to } = rangeOf(req);
  const { teams, records, assess } = await collect(from, to, req.params.teamId);
  const team = teams[0];
  if (!team) return fail(res, 404, "Team not found");
  const trackers = new Map();
  for (const r of records) {
    const k = `${r.category}|${r.sub || ""}`;
    const x = trackers.get(k) || { category: r.category, sub: r.sub || null, count: 0, tables: {} };
    x.count++;
    if (r.tableId) x.tables[r.tableId] = { tableId: r.tableId, name: r.tableName, count: (x.tables[r.tableId]?.count || 0) + 1 };
    trackers.set(k, x);
  }
  const months = {};
  for (const r of records) {
    const m = new Date(r.date).toISOString().slice(0, 7);
    months[m] = (months[m] || 0) + 1;
  }
  const slids = new Map();
  for (const r of records) if (r.slid) slids.set(r.slid, (slids.get(r.slid) || 0) + 1);
  const codes = await TeamCodeAssignment.find({ fieldTeamId: team._id }).sort({ from: -1 }).lean();
  res.json({
    team,
    from,
    to,
    total: records.length,
    trackers: [...trackers.values()].map((x) => ({ ...x, tables: Object.values(x.tables).sort((a, b) => b.count - a.count) })).sort((a, b) => b.count - a.count),
    months: Object.entries(months).sort().map(([month, count]) => ({ month, count })),
    repeatSlids: [...slids.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([slid, count]) => ({ slid, count })),
    assessments: { lab: assessOut(assess.lab, team._id), ojt: assessOut(assess.ojt, team._id), technical: assessOut(assess.quiz, team._id) },
    codes: codes.length ? codes : [{ code: normCode(team.teamCode), from: null, to: null, implicit: true }],
    records: records.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 500),
  });
};
