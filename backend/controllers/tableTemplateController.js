// Table templates (built-in, uploaded, saved from a table) and stored files.
import mongoose from "mongoose";
import { CustomTable, CustomRow, TableTemplate, StoredFile } from "../models/customTableModels.js";
import { BUILT_IN_TEMPLATES, builtInTemplate } from "../utils/builtInTemplates.js";
import { FIELD_TYPES } from "../utils/customFields.js";
import { validateTaxonomy } from "../utils/taxonomy.js";
import { saveFile, streamFile, MAX_FILE_BYTES } from "../utils/fileStore.js";

const oid = (v) => mongoose.Types.ObjectId.isValid(String(v));
const fail = (res, code, message) => res.status(code).json({ message });
const stripFields = (fields) =>
  fields
    .filter((f) => !f.archived)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(({ label, type, description, options, required, defaultValue, validation, width, hidden, coreMapping }) => ({ label, type, description, options, required, defaultValue, validation, width, hidden, coreMapping }));

const checkFields = (fields) => {
  if (!Array.isArray(fields) || !fields.length) return "A template needs at least one field";
  for (const f of fields) {
    if (!f.label?.trim()) return "Every field needs a name";
    if (!FIELD_TYPES.includes(f.type)) return `Unknown field type "${f.type}"`;
  }
  return null;
};

export const listTemplates = async (req, res) => {
  const q = { archived: req.query.archived === "true" };
  if (req.query.category) q.issueCategory = req.query.category;
  const saved = await TableTemplate.find(q).select("-history -sampleRows").sort({ updatedAt: -1 }).populate("createdBy", "name").lean();
  const builtIns = req.query.archived === "true" ? [] : BUILT_IN_TEMPLATES.filter((t) => !req.query.category || t.issueCategory === req.query.category);
  res.json([...builtIns.map(({ sampleRows, ...t }) => t), ...saved]);
};

export const getTemplate = async (req, res) => {
  const id = req.params.id;
  const t = id.startsWith("builtin:") ? builtInTemplate(id.slice(8)) : oid(id) ? await TableTemplate.findById(id).populate("createdBy", "name").lean() : null;
  if (!t) return fail(res, 404, "Template not found");
  res.json(t);
};

export const createTemplate = async (req, res) => {
  const { name, description, issueCategory, issueSubCategory = null, fields, sampleRows = [], sourceFileId, source = "uploaded" } = req.body;
  if (!name?.trim()) return fail(res, 400, "Name the template");
  const tax = validateTaxonomy(issueCategory, issueSubCategory || null);
  if (tax) return fail(res, 400, tax);
  const err = checkFields(fields);
  if (err) return fail(res, 400, err);
  const t = await TableTemplate.create({
    name: name.trim(),
    description,
    issueCategory,
    issueSubCategory: issueSubCategory || null,
    fields: stripFields(fields),
    sampleRows: sampleRows.slice(0, 50),
    source: ["uploaded", "saved_from_table"].includes(source) ? source : "uploaded",
    sourceFileId: oid(sourceFileId) ? sourceFileId : undefined,
    createdBy: req.user._id,
  });
  if (oid(sourceFileId)) await StoredFile.updateOne({ _id: sourceFileId }, { $set: { templateId: t._id } });
  res.status(201).json(t);
};

/** Editing saves a new version; a built-in is copied into an editable template first. */
export const updateTemplate = async (req, res) => {
  const id = req.params.id;
  if (id.startsWith("builtin:")) {
    const b = builtInTemplate(id.slice(8));
    if (!b) return fail(res, 404, "Template not found");
    req.body = { ...b, ...req.body, source: "saved_from_table", name: req.body.name || `${b.name} (copy)` };
    return createTemplate(req, res);
  }
  const t = oid(id) && (await TableTemplate.findById(id));
  if (!t) return fail(res, 404, "Template not found");
  const { name, description, issueCategory, issueSubCategory, fields, sampleRows, archived } = req.body;
  if (fields || sampleRows) {
    if (fields) {
      const err = checkFields(fields);
      if (err) return fail(res, 400, err);
    }
    t.history.push({ version: t.version, fields: t.fields, sampleRows: t.sampleRows, savedAt: new Date(), savedBy: req.user._id });
    if (fields) t.fields = stripFields(fields);
    if (sampleRows) t.sampleRows = sampleRows.slice(0, 50);
    t.version += 1;
  }
  if (issueCategory !== undefined) {
    const tax = validateTaxonomy(issueCategory, issueSubCategory || null);
    if (tax) return fail(res, 400, tax);
    t.issueCategory = issueCategory;
    t.issueSubCategory = issueSubCategory || null;
  }
  if (name !== undefined) t.name = name;
  if (description !== undefined) t.description = description;
  if (archived !== undefined) t.archived = Boolean(archived);
  await t.save();
  res.json(t);
};

export const duplicateTemplate = async (req, res) => {
  const id = req.params.id;
  const src = id.startsWith("builtin:") ? builtInTemplate(id.slice(8)) : oid(id) ? await TableTemplate.findById(id).lean() : null;
  if (!src) return fail(res, 404, "Template not found");
  const t = await TableTemplate.create({
    name: `${src.name} (copy)`,
    description: src.description,
    issueCategory: src.issueCategory,
    issueSubCategory: src.issueSubCategory,
    fields: stripFields(src.fields),
    sampleRows: src.sampleRows || [],
    source: "saved_from_table",
    createdBy: req.user._id,
  });
  res.status(201).json(t);
};

/** Save a table's structure (and optionally up to 20 sample rows) as a template. */
export const templateFromTable = async (req, res) => {
  const table = oid(req.params.tableId) && (await CustomTable.findById(req.params.tableId).lean());
  if (!table) return fail(res, 404, "Table not found");
  let sampleRows = [];
  if (req.body.withRows) {
    const live = table.fields.filter((f) => !f.archived);
    const rows = await CustomRow.find({ tableId: table._id, deleted: false }).sort({ autoNumber: 1 }).limit(20).lean();
    sampleRows = rows.map((r) => Object.fromEntries(live.filter((f) => r.data?.[f.key] !== undefined).map((f) => [f.label, r.data[f.key]])));
  }
  const t = await TableTemplate.create({
    name: req.body.name?.trim() || `${table.name} template`,
    description: req.body.description ?? table.description,
    issueCategory: table.issueCategory,
    issueSubCategory: table.issueSubCategory,
    fields: stripFields(table.fields),
    sampleRows,
    source: "saved_from_table",
    createdBy: req.user._id,
  });
  res.status(201).json(t);
};

// ---------------------------------------------------------------- files
export const uploadFile = async (req, res) => {
  if (!req.file) return fail(res, 400, "No file received");
  if (req.file.size > MAX_FILE_BYTES) return fail(res, 400, "Files can be up to 15 MB");
  const links = {};
  for (const k of ["tableId", "templateId", "importBatchId"]) if (oid(req.body[k])) links[k] = req.body[k];
  if (["import", "template", "attachment", "error_report"].includes(req.body.purpose)) links.purpose = req.body.purpose;
  try {
    const f = await saveFile({ buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype }, req.user, links);
    res.status(201).json(f);
  } catch (e) {
    fail(res, 500, `Couldn't store the file: ${e.message}`);
  }
};

export const listFiles = async (req, res) => {
  const q = {};
  for (const k of ["tableId", "templateId", "importBatchId"]) if (oid(req.query[k])) q[k] = req.query[k];
  if (req.query.purpose) q.purpose = req.query.purpose;
  res.json(await StoredFile.find(q).sort({ createdAt: -1 }).limit(200).populate("uploadedBy", "name").lean());
};

export const getFile = async (req, res) => {
  const f = oid(req.params.id) && (await StoredFile.findById(req.params.id).populate("uploadedBy", "name").lean());
  if (!f) return fail(res, 404, "File not found");
  res.json(f);
};

export const downloadFile = async (req, res) => {
  const f = oid(req.params.id) && (await StoredFile.findById(req.params.id).lean());
  if (!f) return fail(res, 404, "File not found");
  try {
    await streamFile(f, res, { inline: req.query.inline === "true" });
  } catch (e) {
    if (!res.headersSent) fail(res, 500, `Couldn't read the file: ${e.message}`);
  }
};
