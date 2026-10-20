// Custom tables: tables, fields, rows, views, imports (with history + rollback).
// Permissions map onto the existing roles: Admin manages tables/fields/templates,
// any signed-in user (Member ≈ Supervisor) edits rows, views and imports.
import mongoose from "mongoose";
import { CustomTable, CustomRow, TableView, TableTemplate, ImportBatch, RowActivity } from "../models/customTableModels.js";
import { FIELD_TYPES, READ_ONLY_TYPES, CORE_CONCEPTS, CORE_TYPES, newFieldKey, coerce, coerceData, systemColumns, convertValue, calendarFieldsOf } from "../utils/customFields.js";
import { validateTaxonomy } from "../utils/taxonomy.js";
import { builtInTemplate } from "../utils/builtInTemplates.js";
import { FieldTeamsSchema } from "../models/fieldTeamsModel.js";
import { bulkDeleteHandler } from "../utils/bulkDelete.js";

const isAdmin = (req) => req.user?.role === "Admin";
const oid = (v) => mongoose.Types.ObjectId.isValid(String(v));
const fail = (res, code, message, extra) => res.status(code).json({ message, ...extra });
const MAX_IMPORT_ROWS = 500;

const visibleFilter = (req) => (isAdmin(req) ? {} : { visibility: { $ne: "admins" } });

const loadTable = async (req, res) => {
  if (!oid(req.params.id)) return fail(res, 404, "Table not found"), null;
  const t = await CustomTable.findOne({ _id: req.params.id, ...visibleFilter(req) });
  if (!t) return fail(res, 404, "Table not found"), null;
  return t;
};

/** Clean a field definition coming from the client. */
const sanitizeField = (f, order) => {
  if (!f?.label || !String(f.label).trim()) throw new Error("Each field needs a name");
  if (!FIELD_TYPES.includes(f.type)) throw new Error(`Unknown field type "${f.type}"`);
  if (f.coreMapping && !CORE_CONCEPTS.includes(f.coreMapping)) throw new Error(`Unknown core concept "${f.coreMapping}"`);
  if (f.coreMapping && !CORE_TYPES[f.coreMapping].includes(f.type)) throw new Error(`A ${f.type} field can't be mapped to ${f.coreMapping}`);
  const choices = (f.options?.choices || []).map((c) => (typeof c === "string" ? { value: c } : c)).filter((c) => c.value !== undefined && String(c.value).trim());
  if (["singleSelect", "multiSelect"].includes(f.type)) {
    const vals = choices.map((c) => String(c.value).trim().toLowerCase());
    if (new Set(vals).size !== vals.length) throw new Error(`"${f.label}" has duplicate options`);
  }
  return {
    key: f.key || newFieldKey(),
    label: String(f.label).trim(),
    type: f.type,
    description: f.description || "",
    options: { ...f.options, choices: choices.map((c) => ({ value: String(c.value).trim(), color: c.color || "gray" })) },
    required: Boolean(f.required) && !READ_ONLY_TYPES.includes(f.type),
    defaultValue: f.defaultValue ?? null,
    validation: f.validation || {},
    order: f.order ?? order,
    width: f.width || 180,
    hidden: Boolean(f.hidden),
    coreMapping: f.coreMapping || null,
    archived: false,
  };
};

const checkCoreUnique = (fields) => {
  const seen = {};
  for (const f of fields.filter((x) => x.coreMapping && !x.archived)) {
    if (seen[f.coreMapping]) throw new Error(`Only one field can be mapped to ${f.coreMapping} ("${seen[f.coreMapping]}" already is)`);
    seen[f.coreMapping] = f.label;
  }
};

// ---------------------------------------------------------------- tables
export const listTables = async (req, res) => {
  const q = { ...visibleFilter(req), archived: req.query.archived === "true" };
  if (req.query.category) q.issueCategory = req.query.category;
  if (req.query.sub) q.issueSubCategory = req.query.sub === "none" ? null : req.query.sub;
  const tables = await CustomTable.find(q).sort({ issueCategory: 1, name: 1 }).lean();
  const counts = await CustomRow.aggregate([{ $match: { tableId: { $in: tables.map((t) => t._id) }, deleted: false } }, { $group: { _id: "$tableId", n: { $sum: 1 }, last: { $max: "$updatedAt" } } }]);
  const by = Object.fromEntries(counts.map((c) => [String(c._id), c]));
  res.json(tables.map((t) => ({ ...t, rowCount: by[t._id]?.n || 0, lastActivity: by[t._id]?.last || t.updatedAt })));
};

export const getTable = async (req, res) => {
  const t = await loadTable(req, res);
  if (t) res.json(t);
};

export const createTable = async (req, res) => {
  try {
    const { name, description, issueCategory, issueSubCategory = null, icon, color, templateId, duplicateFrom, withRows, visibility } = req.body;
    if (!name?.trim()) return fail(res, 400, "Give the table a name");
    const taxErr = validateTaxonomy(issueCategory, issueSubCategory || null);
    if (taxErr) return fail(res, 400, taxErr);
    let fields = req.body.fields || [];
    let templateVersion = null;
    let sampleRows = [];
    let source = null;
    if (templateId) {
      const tpl = String(templateId).startsWith("builtin:") ? builtInTemplate(String(templateId).slice(8)) : oid(templateId) ? await TableTemplate.findById(templateId).lean() : null;
      if (!tpl) return fail(res, 404, "Template not found");
      fields = tpl.fields.map((f) => ({ ...f, key: undefined }));
      templateVersion = tpl.version || 1;
      if (req.body.withSampleRows) sampleRows = tpl.sampleRows || [];
      source = oid(templateId) ? templateId : null;
    }
    if (duplicateFrom) {
      const src = await CustomTable.findOne({ _id: duplicateFrom, ...visibleFilter(req) }).lean();
      if (!src) return fail(res, 404, "Table to duplicate not found");
      fields = src.fields.filter((f) => !f.archived);
    }
    if (!fields.length) fields = [{ label: "Name", type: "text" }];
    const clean = fields.map((f, i) => sanitizeField(duplicateFrom ? f : { ...f, key: f.key || undefined }, i));
    checkCoreUnique(clean);
    const table = await CustomTable.create({
      name: name.trim(),
      description,
      issueCategory,
      issueSubCategory: issueSubCategory || null,
      icon,
      color,
      visibility,
      templateId: source,
      templateVersion,
      owner: req.user._id,
      fields: clean,
      primaryField: clean[0].key,
    });
    // sample rows from a template are keyed by field label
    if (sampleRows.length) {
      const byLabel = Object.fromEntries(clean.map((f) => [f.label, f.key]));
      for (const s of sampleRows) {
        const patch = Object.fromEntries(Object.entries(s).filter(([k]) => byLabel[k]).map(([k, v]) => [byLabel[k], v]));
        await insertRow(table, patch, req.user, {});
      }
    }
    if (duplicateFrom && withRows) {
      const src = await CustomTable.findById(duplicateFrom).lean();
      const keyMap = Object.fromEntries(src.fields.filter((f) => !f.archived).map((f, i) => [f.key, clean[i].key]));
      const rows = await CustomRow.find({ tableId: duplicateFrom, deleted: false }).lean();
      for (const r of rows) {
        const data = Object.fromEntries(Object.entries(r.data || {}).filter(([k]) => keyMap[k]).map(([k, v]) => [keyMap[k], v]));
        await insertRow(table, data, req.user, { coerced: true });
      }
    }
    await TableView.create({ tableId: table._id, name: "All rows", type: "grid", owner: req.user._id, shared: true });
    res.status(201).json(table);
  } catch (e) {
    fail(res, 400, e.message);
  }
};

export const updateTable = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  const allowed = ["name", "description", "icon", "color", "visibility", "archived", "primaryField"];
  for (const k of allowed) if (req.body[k] !== undefined) t[k] = req.body[k];
  if (req.body.settings) {
    const next = { ...req.body.settings };
    if (next.calendarFields !== undefined) {
      if (!Array.isArray(next.calendarFields)) return fail(res, 400, "calendarFields must be a list of field keys");
      const dateKeys = t.fields.filter((f) => !f.archived && ["date", "datetime"].includes(f.type)).map((f) => f.key);
      const bad = next.calendarFields.filter((k) => !dateKeys.includes(k));
      if (bad.length) return fail(res, 400, "Only date fields can drive the calendar");
      next.calendarFields = [...new Set(next.calendarFields)];
    }
    t.settings = { ...t.settings.toObject?.(), ...next };
  }
  if (req.body.issueCategory !== undefined) {
    const err = validateTaxonomy(req.body.issueCategory, req.body.issueSubCategory || null);
    if (err) return fail(res, 400, err);
    t.issueCategory = req.body.issueCategory;
    t.issueSubCategory = req.body.issueSubCategory || null;
  }
  await t.save();
  res.json(t);
};

/** Hard delete (admins, with the table name typed as confirmation). Archive is PATCH { archived: true }. */
export const deleteTable = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  if (!t.archived) return fail(res, 400, "Archive the table before deleting it permanently");
  if (req.body?.confirm !== t.name) return fail(res, 400, "Type the table name to confirm");
  await Promise.all([CustomRow.deleteMany({ tableId: t._id }), TableView.deleteMany({ tableId: t._id }), RowActivity.deleteMany({ tableId: t._id }), ImportBatch.deleteMany({ tableId: t._id })]);
  await t.deleteOne();
  res.json({ ok: true });
};

// ---------------------------------------------------------------- fields
export const addField = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  try {
    const live = t.fields.filter((f) => !f.archived).sort((a, b) => a.order - b.order);
    const at = Number.isInteger(req.body.position) ? Math.max(0, Math.min(req.body.position, live.length)) : live.length;
    const f = sanitizeField({ ...req.body, key: undefined }, at);
    live.forEach((x) => { if (x.order >= at) x.order += 1; });
    t.fields.push(f);
    checkCoreUnique(t.fields);
    await t.save();
    if (f.coreMapping) await refreshSystemColumns(t);
    res.status(201).json(t);
  } catch (e) {
    fail(res, 400, e.message);
  }
};

const previewConversion = async (t, field, target) => {
  const rows = await CustomRow.find({ tableId: t._id, deleted: false, [`data.${field.key}`]: { $nin: [null, ""] } }).select(`data.${field.key}`).lean();
  const ok = [];
  const bad = [];
  for (const r of rows) {
    const v = r.data[field.key];
    const out = convertValue(field, target, v);
    (out.error ? bad : ok).push({ rowId: r._id, from: v, to: out.value, error: out.error });
  }
  return { total: rows.length, ok: ok.length, failed: bad.length, samples: { ok: ok.slice(0, 5), failed: bad.slice(0, 10) }, rows: { ok, bad } };
};

export const convertPreview = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  const field = t.fields.find((f) => f.key === req.params.key);
  if (!field) return fail(res, 404, "Field not found");
  try {
    const target = sanitizeField({ ...field.toObject(), ...req.body, key: field.key }, field.order);
    const { rows, ...summary } = await previewConversion(t, field, target);
    res.json(summary);
  } catch (e) {
    fail(res, 400, e.message);
  }
};

export const updateField = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  const field = t.fields.find((f) => f.key === req.params.key);
  if (!field) return fail(res, 404, "Field not found");
  try {
    const before = field.toObject();
    const next = sanitizeField({ ...before, ...req.body, key: field.key, order: before.order }, before.order);
    const typeChanged = next.type !== before.type || JSON.stringify(next.options?.choices) !== JSON.stringify(before.options?.choices);
    Object.assign(field, next);
    checkCoreUnique(t.fields);
    let converted = null;
    if (typeChanged) {
      // convert stored values; anything that doesn't convert is kept in row.legacy
      const { rows, ...summary } = await previewConversion(t, before, next);
      const ops = [
        ...rows.ok.map((r) => ({ updateOne: { filter: { _id: r.rowId }, update: { $set: { [`data.${field.key}`]: r.to } } } })),
        ...rows.bad.map((r) => ({ updateOne: { filter: { _id: r.rowId }, update: { $set: { [`data.${field.key}`]: null, [`legacy.${field.key}`]: r.from } } } })),
      ];
      if (ops.length) await CustomRow.bulkWrite(ops);
      converted = summary;
    }
    await t.save();
    if (next.coreMapping !== before.coreMapping || typeChanged) await refreshSystemColumns(t);
    res.json({ table: t, converted });
  } catch (e) {
    fail(res, 400, e.message);
  }
};

export const reorderFields = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  const keys = req.body.keys || [];
  keys.forEach((k, i) => {
    const f = t.fields.find((x) => x.key === k);
    if (f) f.order = i;
  });
  await t.save();
  res.json(t);
};

export const archiveField = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  const field = t.fields.find((f) => f.key === req.params.key);
  if (!field) return fail(res, 404, "Field not found");
  if (t.fields.filter((f) => !f.archived).length === 1) return fail(res, 400, "A table needs at least one field");
  if (req.query.hard === "true") {
    if (!field.archived) return fail(res, 400, "Archive the field first");
    await CustomRow.updateMany({ tableId: t._id }, { $unset: { [`data.${field.key}`]: "", [`legacy.${field.key}`]: "" } });
    t.fields = t.fields.filter((f) => f.key !== field.key);
  } else {
    field.archived = true;
    field.archivedAt = new Date();
    field.coreMapping = null;
    if (t.primaryField === field.key) t.primaryField = t.fields.find((f) => !f.archived)?.key;
  }
  await t.save();
  await refreshSystemColumns(t);
  res.json(t);
};

export const restoreField = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  const field = t.fields.find((f) => f.key === req.params.key);
  if (!field) return fail(res, 404, "Field not found");
  field.archived = false;
  field.archivedAt = undefined;
  field.order = t.fields.filter((f) => !f.archived).length;
  await t.save();
  res.json(t);
};

const refreshSystemColumns = async (t) => {
  const rows = await CustomRow.find({ tableId: t._id }).select("data").lean();
  const ops = rows.map((r) => ({ updateOne: { filter: { _id: r._id }, update: { $set: { status: null, assignees: [], fieldTeamId: null, dueDate: null, ...systemColumns(t, r.data || {}) } } } }));
  for (let i = 0; i < ops.length; i += 1000) await CustomRow.bulkWrite(ops.slice(i, i + 1000));
};

// ---------------------------------------------------------------- rows
const FILTER_OPS = {
  eq: (v) => v,
  neq: (v) => ({ $ne: v }),
  contains: (v) => ({ $regex: String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" }),
  empty: () => ({ $in: [null, "", []] }),
  notEmpty: () => ({ $nin: [null, "", []] }),
  gt: (v) => ({ $gt: v }),
  lt: (v) => ({ $lt: v }),
  gte: (v) => ({ $gte: v }),
  lte: (v) => ({ $lte: v }),
  in: (v) => ({ $in: Array.isArray(v) ? v : [v] }),
};
const SYSTEM_SORT = { createdAt: "createdAt", updatedAt: "updatedAt", autoNumber: "autoNumber" };

const rowQuery = (t, query) => {
  const q = { tableId: t._id, deleted: query.deleted === "true" };
  if (query.batch && oid(query.batch)) q.importBatchId = query.batch;
  let filters = [];
  try { filters = query.filters ? JSON.parse(query.filters) : []; } catch { filters = []; }
  const fields = Object.fromEntries(t.fields.map((f) => [f.key, f]));
  const and = [];
  for (const f of filters) {
    const fn = FILTER_OPS[f.op];
    if (!fn || !fields[f.field]) continue;
    const path = fields[f.field].type === "taxonomy" ? `data.${f.field}.category` : `data.${f.field}`;
    and.push({ [path]: fn(f.value) });
  }
  if (query.q) {
    const rx = { $regex: String(query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    const text = t.fields.filter((f) => ["text", "longText", "phone", "email", "url", "singleSelect"].includes(f.type) && !f.archived);
    if (text.length) and.push({ $or: text.map((f) => ({ [`data.${f.key}`]: rx })) });
  }
  if (and.length) q.$and = and;
  return q;
};

export const listRows = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  const q = rowQuery(t, req.query);
  const limit = Math.min(Number(req.query.limit) || 1000, 5000);
  const page = Math.max(Number(req.query.page) || 1, 1);
  let sort = { autoNumber: 1, createdAt: 1 };
  try {
    const s = req.query.sorts ? JSON.parse(req.query.sorts) : [];
    if (s.length) sort = Object.fromEntries(s.map((x) => [SYSTEM_SORT[x.field] || `data.${x.field}`, x.dir === "desc" ? -1 : 1]));
  } catch { /* default sort */ }
  const [rows, total] = await Promise.all([CustomRow.find(q).sort(sort).skip((page - 1) * limit).limit(limit).lean(), CustomRow.countDocuments(q)]);
  res.json({ rows, total, page, limit });
};

const checkUnique = async (t, data, rowId) => {
  for (const f of t.fields.filter((x) => x.validation?.unique && !x.archived)) {
    const v = data[f.key];
    if (v === undefined || v === null || v === "") continue;
    const clash = await CustomRow.findOne({ tableId: t._id, deleted: false, [`data.${f.key}`]: v, ...(rowId ? { _id: { $ne: rowId } } : {}) }).select("_id").lean();
    if (clash) return `${f.label} "${v}" already exists`;
  }
  return null;
};

/** Create a row. opts: { coerced, batchId } */
const insertRow = async (t, patch, user, { coerced = false, batchId } = {}) => {
  let data = patch;
  if (!coerced) {
    const r = coerceData(t, patch, { partial: false });
    if (r.errors.length) throw Object.assign(new Error(r.errors.map((e) => e.message).join("; ")), { errors: r.errors });
    data = r.data;
  }
  const dup = await checkUnique(t, data);
  if (dup) throw new Error(dup);
  const { nextAutoNumber } = await CustomTable.findByIdAndUpdate(t._id, { $inc: { nextAutoNumber: 1 } }, { new: false, projection: { nextAutoNumber: 1 } });
  const row = await CustomRow.create({ tableId: t._id, data, autoNumber: nextAutoNumber, createdBy: user?._id, updatedBy: user?._id, importBatchId: batchId, ...systemColumns(t, data) });
  await RowActivity.create({ tableId: t._id, rowId: row._id, batchId, action: "create", user: user?._id, changes: Object.entries(data).map(([field, v]) => ({ field, old: null, new: v })) });
  return row;
};

/** Update a row with an already-coerced patch, recording field-level changes. */
const patchRow = async (t, row, data, user, { batchId } = {}) => {
  const changes = [];
  const next = { ...(row.data || {}) };
  for (const [k, v] of Object.entries(data)) {
    if (JSON.stringify(next[k] ?? null) === JSON.stringify(v ?? null)) continue;
    changes.push({ field: k, old: next[k] ?? null, new: v });
    next[k] = v;
  }
  if (!changes.length) return { row, changed: false };
  const dup = await checkUnique(t, next, row._id);
  if (dup) throw new Error(dup);
  const updated = await CustomRow.findByIdAndUpdate(row._id, { $set: { data: next, updatedBy: user?._id, ...systemColumns(t, next) } }, { new: true }).lean();
  await RowActivity.create({ tableId: t._id, rowId: row._id, batchId, action: "update", user: user?._id, changes });
  return { row: updated, changed: true };
};

export const createRow = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  try {
    const row = await insertRow(t, req.body.data || {}, req.user);
    res.status(201).json(row);
  } catch (e) {
    fail(res, 400, e.message, { errors: e.errors });
  }
};

export const updateRow = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  const row = oid(req.params.rowId) && (await CustomRow.findOne({ _id: req.params.rowId, tableId: t._id }).lean());
  if (!row) return fail(res, 404, "Row not found");
  const { data, errors } = coerceData(t, req.body.data || {});
  if (errors.length) return fail(res, 400, errors.map((e) => e.message).join("; "), { errors });
  for (const f of t.fields.filter((x) => x.required && !x.archived)) if (f.key in data && (data[f.key] === null || data[f.key] === "")) return fail(res, 400, `${f.label} is required`);
  try {
    const extra = {};
    if (req.body.linkedTaskId !== undefined) extra.linkedTaskId = oid(req.body.linkedTaskId) ? req.body.linkedTaskId : null;
    if (Object.keys(extra).length) await CustomRow.updateOne({ _id: row._id }, { $set: extra });
    const out = await patchRow(t, { ...row, ...extra }, data, req.user);
    res.json(out.changed ? out.row : await CustomRow.findById(row._id).lean());
  } catch (e) {
    fail(res, 400, e.message);
  }
};

/** Paste / fill-down: many cell updates at once. Each item { rowId, data } or { data } for a new row. */
export const bulkRows = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  const items = (req.body.items || []).slice(0, 2000);
  const results = [];
  for (const [i, it] of items.entries()) {
    try {
      if (it.rowId) {
        const row = await CustomRow.findOne({ _id: it.rowId, tableId: t._id }).lean();
        if (!row) throw new Error("Row not found");
        const { data, errors } = coerceData(t, it.data);
        if (errors.length) throw new Error(errors.map((e) => `${e.label}: ${e.message}`).join("; "));
        const out = await patchRow(t, row, data, req.user);
        results.push({ i, ok: true, row: out.row });
      } else {
        const row = await insertRow(t, it.data, req.user);
        results.push({ i, ok: true, row });
      }
    } catch (e) {
      results.push({ i, ok: false, message: e.message });
    }
  }
  res.json({ results, failed: results.filter((r) => !r.ok).length });
};

export const deleteRows = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  const ids = (req.body.ids || []).filter(oid);
  const restore = req.path.endsWith("/restore");
  const rows = await CustomRow.find({ _id: { $in: ids }, tableId: t._id, deleted: restore }).select("_id").lean();
  await CustomRow.updateMany({ _id: { $in: rows.map((r) => r._id) } }, { $set: { deleted: !restore, deletedAt: restore ? null : new Date(), updatedBy: req.user._id } });
  if (rows.length) await RowActivity.insertMany(rows.map((r) => ({ tableId: t._id, rowId: r._id, action: restore ? "restore" : "delete", user: req.user._id })));
  res.json({ count: rows.length });
};

/**
 * POST /:id/rows/purge { ids, confirm: "permanent delete" } — permanent delete.
 * Same access as editing rows (anyone who can see the table); rows of other tables are ignored.
 */
const purge = bulkDeleteHandler({
  model: CustomRow,
  scope: (req) => ({ tableId: req.table._id }),
  cascade: (docs, req) => RowActivity.deleteMany({ tableId: req.table._id, rowId: { $in: docs.map((d) => d._id) } }),
});
export const purgeRows = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  req.table = t;
  return purge(req, res);
};

export const rowActivity = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  const items = await RowActivity.find({ tableId: t._id, rowId: req.params.rowId }).sort({ createdAt: -1 }).limit(200).populate("user", "name email").lean();
  res.json(items);
};

// ---------------------------------------------------------------- views
export const listViews = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  res.json(await TableView.find({ tableId: t._id, $or: [{ shared: true }, { owner: req.user._id }] }).sort({ createdAt: 1 }).lean());
};

const VIEW_KEYS = ["name", "type", "filters", "sorts", "groupBy", "hiddenFields", "columnOrder", "frozen", "cardFields", "dateField", "shared"];
export const saveView = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  const body = Object.fromEntries(VIEW_KEYS.filter((k) => req.body[k] !== undefined).map((k) => [k, req.body[k]]));
  if (req.params.viewId) {
    const v = await TableView.findOne({ _id: req.params.viewId, tableId: t._id });
    if (!v) return fail(res, 404, "View not found");
    if (v.shared && !isAdmin(req) && String(v.owner) !== String(req.user._id) && req.body.shared !== undefined) return fail(res, 403, "Only the owner can change sharing");
    Object.assign(v, body);
    await v.save();
    return res.json(v);
  }
  if (!body.name) return fail(res, 400, "Name the view");
  res.status(201).json(await TableView.create({ ...body, tableId: t._id, owner: req.user._id }));
};

export const deleteView = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  const v = await TableView.findOne({ _id: req.params.viewId, tableId: t._id });
  if (!v) return fail(res, 404, "View not found");
  if (!isAdmin(req) && String(v.owner) !== String(req.user._id)) return fail(res, 403, "Only the owner can delete this view");
  if ((await TableView.countDocuments({ tableId: t._id })) === 1) return fail(res, 400, "A table needs at least one view");
  await v.deleteOne();
  res.json({ ok: true });
};

// ---------------------------------------------------------------- import
/**
 * POST /:id/import  { rows: [{ __row, data: { fieldKey: raw } }], mode, matchField, dryRun, batchId, fileId, sheet, mapping }
 * A dry run validates only. A real run records an ImportBatch (created on the first chunk)
 * and row activity, so the batch can be rolled back later.
 */
export const importRows = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  const { rows = [], mode = "create", matchField, dryRun = true, fileId, sheet, mapping } = req.body;
  if (!rows.length) return fail(res, 400, "No rows to import");
  if (rows.length > MAX_IMPORT_ROWS) return fail(res, 400, `Send at most ${MAX_IMPORT_ROWS} rows per request`);
  if (!["create", "upsert", "skip"].includes(mode)) return fail(res, 400, "Unknown mode");
  const match = matchField && t.fields.find((f) => f.key === matchField && !f.archived);
  if (mode !== "create" && !match) return fail(res, 400, "Choose the field that identifies a row");

  let batch = null;
  if (!dryRun) {
    batch = req.body.batchId ? await ImportBatch.findOne({ _id: req.body.batchId, tableId: t._id }) : await ImportBatch.create({ tableId: t._id, fileId: oid(fileId) ? fileId : undefined, sheet, mapping, mode, matchField, createdBy: req.user._id });
    if (!batch || batch.status !== "running") return fail(res, 400, "Import batch is closed");
  }
  const results = [];
  const seen = new Set();
  for (const [i, r] of rows.entries()) {
    const rowNo = r.__row ?? i + 1;
    try {
      const { data, errors } = coerceData(t, r.data || {}, { partial: false });
      if (errors.length) throw new Error(errors.map((e) => `${e.label}: ${e.message}`).join("; "));
      let existing = null;
      if (match && data[match.key] !== null && data[match.key] !== undefined) {
        const k = JSON.stringify(data[match.key]);
        if (dryRun && seen.has(k) && mode !== "create") { results.push({ row: rowNo, action: "skip", status: "ok", message: "Repeated in the file" }); continue; }
        seen.add(k);
        existing = await CustomRow.findOne({ tableId: t._id, deleted: false, [`data.${match.key}`]: data[match.key] }).lean();
      }
      if (existing && mode === "skip") { results.push({ row: rowNo, action: "skip", status: "ok", id: existing._id }); continue; }
      if (existing && mode === "create" && match) throw new Error(`Already exists (${match.label} = ${data[match.key]})`);
      if (dryRun) {
        const dup = existing ? null : await checkUnique(t, data);
        if (dup) throw new Error(dup);
        results.push({ row: rowNo, action: existing ? "update" : "create", status: "ok" });
        continue;
      }
      if (existing) {
        const out = await patchRow(t, existing, data, req.user, { batchId: batch._id });
        results.push({ row: rowNo, action: out.changed ? "update" : "skip", status: "ok", id: existing._id });
      } else {
        const row = await insertRow(t, data, req.user, { coerced: true, batchId: batch._id });
        results.push({ row: rowNo, action: "create", status: "ok", id: row._id });
      }
    } catch (e) {
      results.push({ row: rowNo, action: null, status: "error", message: e.message });
    }
  }
  const counts = { created: 0, updated: 0, skipped: 0, failed: 0 };
  for (const r of results) counts[r.status === "error" ? "failed" : r.action === "update" ? "updated" : r.action === "skip" ? "skipped" : "created"]++;
  if (batch) {
    for (const k of Object.keys(counts)) batch.counts[k] += counts[k];
    batch.rowErrors.push(...results.filter((r) => r.status === "error").slice(0, 1000).map((r) => ({ row: r.row, message: r.message })));
    if (req.body.final) batch.status = "completed";
    await batch.save();
  }
  res.json({ dryRun: Boolean(dryRun), batchId: batch?._id, counts, results });
};

export const listBatches = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  res.json(await ImportBatch.find({ tableId: t._id }).sort({ createdAt: -1 }).limit(100).populate("createdBy", "name").populate("fileId", "originalName size").lean());
};

export const finishBatch = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  const b = await ImportBatch.findOneAndUpdate({ _id: req.params.batchId, tableId: t._id, status: "running" }, { $set: { status: "completed" } }, { new: true });
  res.json(b || { ok: true });
};

/** Soft-delete rows the batch created and revert fields it updated (newest change first). */
export const rollbackBatch = async (req, res) => {
  const t = await loadTable(req, res);
  if (!t) return;
  const b = await ImportBatch.findOne({ _id: req.params.batchId, tableId: t._id });
  if (!b) return fail(res, 404, "Batch not found");
  if (b.status === "rolled_back") return fail(res, 400, "This batch was already rolled back");
  const acts = await RowActivity.find({ batchId: b._id }).sort({ createdAt: -1 }).lean();
  let removed = 0;
  let reverted = 0;
  const conflicts = [];
  for (const a of acts) {
    if (a.action === "create") {
      const r = await CustomRow.updateOne({ _id: a.rowId, deleted: false }, { $set: { deleted: true, deletedAt: new Date(), updatedBy: req.user._id } });
      if (r.modifiedCount) {
        removed++;
        await RowActivity.create({ tableId: t._id, rowId: a.rowId, batchId: b._id, action: "rollback", user: req.user._id });
      }
    } else if (a.action === "update") {
      const row = await CustomRow.findById(a.rowId).lean();
      if (!row) continue;
      const set = {};
      const changes = [];
      for (const c of a.changes) {
        // skip a field that someone edited again after the import
        if (JSON.stringify(row.data?.[c.field] ?? null) !== JSON.stringify(c.new ?? null)) { conflicts.push({ rowId: a.rowId, field: c.field }); continue; }
        set[`data.${c.field}`] = c.old;
        changes.push({ field: c.field, old: c.new, new: c.old });
      }
      if (changes.length) {
        await CustomRow.updateOne({ _id: a.rowId }, { $set: { ...set, updatedBy: req.user._id } });
        const fresh = await CustomRow.findById(a.rowId).lean();
        await CustomRow.updateOne({ _id: a.rowId }, { $set: systemColumns(t, fresh.data || {}) });
        await RowActivity.create({ tableId: t._id, rowId: a.rowId, batchId: b._id, action: "rollback", user: req.user._id, changes });
        reverted++;
      }
    }
  }
  b.status = "rolled_back";
  b.rolledBackAt = new Date();
  b.rolledBackBy = req.user._id;
  await b.save();
  res.json({ removed, reverted, conflicts: conflicts.length });
};

// ---------------------------------------------------------------- cross-table
/**
 * Rows on the global calendar. A row shows once per calendar date field that has a
 * value in [from, to] (see calendarFieldsOf: the table's chosen fields, else the
 * schedule / date mappings and appointment-like date fields). Each event keeps the
 * original keys (id = row id, date, dateField, dateType) and adds fieldLabel, role
 * ("schedule" for a booked appointment / visit, "date" otherwise) and a unique key.
 */
export const calendarEvents = async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 45 * 864e5);
  const to = req.query.to ? new Date(req.query.to) : new Date(Date.now() + 45 * 864e5);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return fail(res, 400, "Invalid date range");
  const tables = await CustomTable.find({ archived: false, "settings.showInCalendar": true, ...visibleFilter(req) }).lean();
  const withDates = tables.map((t) => ({ t, cal: calendarFieldsOf(t) })).filter((x) => x.cal.length);
  if (!withDates.length) return res.json([]);
  // dates are stored as ISO strings, which sort the same way as the dates themselves
  const range = { $gte: from.toISOString(), $lte: to.toISOString() };
  const rows = await CustomRow.find({
    deleted: false,
    $or: withDates.map(({ t, cal }) => ({ tableId: t._id, $or: cal.map(({ field }) => ({ [`data.${field.key}`]: range })) })),
  }).limit(5000).lean();
  const byId = Object.fromEntries(withDates.map((x) => [String(x.t._id), x]));
  const events = [];
  for (const r of rows) {
    const { t, cal } = byId[String(r.tableId)];
    const title = r.data?.[t.primaryField];
    for (const { field, role } of cal) {
      const v = r.data?.[field.key];
      if (!v || v < range.$gte || v > range.$lte) continue;
      events.push({
        id: r._id,
        key: `${r._id}:${field.key}`,
        tableId: t._id,
        tableName: t.name,
        issueCategory: t.issueCategory,
        issueSubCategory: t.issueSubCategory,
        title: typeof title === "object" && title !== null ? JSON.stringify(title) : title || `#${r.autoNumber}`,
        date: v,
        status: r.status,
        dateField: field.key,
        dateType: field.type,
        fieldLabel: field.label,
        role,
      });
    }
  }
  res.json(events);
};

// Dashboard roll-up: per table, row counts by tracker category, field team, status and
// severity for rows whose mapped date falls in [from, to]. `team` = comma-separated names or ids.
export const summary = async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 7 * 864e5);
  const to = req.query.to ? new Date(req.query.to) : new Date();
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return fail(res, 400, "Invalid date range");
  const teamFilter = String(req.query.team || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

  const tables = (await CustomTable.find({ archived: false, ...visibleFilter(req) }).lean()).filter((t) => t.fields.some((f) => f.coreMapping === "date" && !f.archived));
  if (!tables.length) return res.json({ from, to, tables: [] });
  const teams = await FieldTeamsSchema.find({}, { teamName: 1 }).lean();
  const teamById = Object.fromEntries(teams.map((t) => [String(t._id), t]));
  const teamByName = Object.fromEntries(teams.filter((t) => t.teamName).map((t) => [t.teamName.trim().toLowerCase(), t]));
  const rows = await CustomRow.find({ tableId: { $in: tables.map((t) => t._id) }, deleted: false, dueDate: { $gte: from, $lte: to } }, { tableId: 1, data: 1, status: 1, fieldTeamId: 1 }).lean();
  const rowsBy = {};
  for (const r of rows) (rowsBy[String(r.tableId)] ||= []).push(r);

  const bump = (map, key, extra) => {
    const m = map.get(key) || { ...extra, count: 0 };
    m.count++;
    map.set(key, m);
  };
  const out = tables.map((t) => {
    const mapped = Object.fromEntries(t.fields.filter((f) => f.coreMapping && !f.archived).map((f) => [f.coreMapping, f]));
    const byCategory = new Map(), byTeam = new Map(), byStatus = new Map(), bySeverity = new Map();
    let total = 0;
    for (const r of rowsBy[String(t._id)] || []) {
      // field team: a fieldTeam field stores an id, a text field stores a name
      let team = null;
      if (mapped.fieldTeam) {
        const raw = mapped.fieldTeam.type === "fieldTeam" ? r.fieldTeamId || r.data?.[mapped.fieldTeam.key] : r.data?.[mapped.fieldTeam.key];
        if (raw) {
          const known = teamById[String(raw)] || teamByName[String(raw).trim().toLowerCase()];
          team = known ? { fieldTeamId: known._id, teamName: known.teamName } : { fieldTeamId: null, teamName: String(raw).trim() };
        }
      }
      if (teamFilter.length && !(team && (teamFilter.includes(team.teamName.toLowerCase()) || (team.fieldTeamId && teamFilter.includes(String(team.fieldTeamId)))))) continue;
      total++;
      const cat = mapped.category && typeof r.data?.[mapped.category.key] === "object" && r.data[mapped.category.key]?.category ? r.data[mapped.category.key] : { category: t.issueCategory, sub: t.issueSubCategory };
      bump(byCategory, `${cat.category}|${cat.sub || ""}`, { issueCategory: cat.category, issueSubCategory: cat.sub || null });
      if (team) bump(byTeam, String(team.fieldTeamId || team.teamName.toLowerCase()), team);
      else bump(byTeam, "", { fieldTeamId: null, teamName: null });
      bump(byStatus, r.status ?? "", { status: r.status ?? null });
      if (mapped.severity) {
        const sev = r.data?.[mapped.severity.key];
        bump(bySeverity, sev == null || sev === "" ? "" : String(sev), { severity: sev == null || sev === "" ? null : String(sev) });
      }
    }
    const list = (m) => [...m.values()].sort((a, b) => b.count - a.count);
    return {
      tableId: t._id,
      name: t.name,
      icon: t.icon,
      color: t.color,
      issueCategory: t.issueCategory,
      issueSubCategory: t.issueSubCategory,
      mapped: Object.keys(mapped),
      total,
      byCategory: list(byCategory),
      byTeam: list(byTeam),
      byStatus: list(byStatus),
      bySeverity: list(bySeverity),
    };
  });
  res.json({ from, to, tables: out });
};

export const fieldTypes = (req, res) => res.json({ types: FIELD_TYPES, readOnly: READ_ONLY_TYPES, core: CORE_TYPES });
export { coerce };
