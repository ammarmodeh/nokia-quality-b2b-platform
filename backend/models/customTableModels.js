// Custom tables: a small Airtable-like database built into the app.
// All collections are new and additive; nothing here touches existing models.
//
// Rows store their values in `data`, keyed by the field's stable `key`
// (generated once, never changed), so labels can be renamed freely.
import mongoose from "mongoose";

const { Schema, model, models } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const choiceSchema = new Schema({ value: { type: String, required: true }, color: { type: String, default: "gray" } }, { _id: false });

export const fieldSchema = new Schema(
  {
    // stable id, assigned when the field joins a table (template fields have none)
    key: { type: String },
    label: { type: String, required: true, trim: true },
    type: { type: String, required: true },
    description: { type: String, default: "" },
    // choices for selects, number format, date format, rating max, multiple users …
    options: {
      choices: [choiceSchema],
      format: { type: String },
      precision: { type: Number },
      max: { type: Number },
      multiple: { type: Boolean },
      prefix: { type: String },
    },
    required: { type: Boolean, default: false },
    defaultValue: { type: Schema.Types.Mixed },
    validation: { min: Number, max: Number, pattern: String, unique: Boolean },
    order: { type: Number, default: 0 },
    width: { type: Number, default: 180 },
    hidden: { type: Boolean, default: false },
    // core concept this field feeds (status, assignee, fieldTeam, date, category, severity, customerId, location)
    coreMapping: { type: String, default: null },
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date },
  },
  { _id: false, timestamps: true }
);

const customTableSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "table" },
    color: { type: String, default: "violet" },
    issueCategory: { type: String, required: true },
    issueSubCategory: { type: String, default: null },
    templateId: { type: ObjectId, ref: "TableTemplate", default: null },
    templateVersion: { type: Number, default: null },
    owner: { type: ObjectId, ref: "User" },
    // "team": every signed-in user; "admins": admins only
    visibility: { type: String, enum: ["team", "admins"], default: "team" },
    fields: [fieldSchema],
    primaryField: { type: String },
    nextAutoNumber: { type: Number, default: 1 },
    settings: {
      showInCalendar: { type: Boolean, default: true },
      rowsAreTasks: { type: Boolean, default: false },
    },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);
customTableSchema.index({ issueCategory: 1, issueSubCategory: 1, archived: 1 });

const customRowSchema = new Schema(
  {
    tableId: { type: ObjectId, ref: "CustomTable", required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    // values that failed a field type conversion, kept so nothing is lost
    legacy: { type: Schema.Types.Mixed },
    autoNumber: { type: Number },
    // system columns, filled from the table's core field mapping on every save
    status: { type: String },
    assignees: [{ type: ObjectId, ref: "User" }],
    fieldTeamId: { type: ObjectId, ref: "FieldTeams" },
    dueDate: { type: Date },
    linkedTaskId: { type: ObjectId, ref: "Task" },
    importBatchId: { type: ObjectId, ref: "ImportBatch" },
    createdBy: { type: ObjectId, ref: "User" },
    updatedBy: { type: ObjectId, ref: "User" },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true, minimize: false }
);
customRowSchema.index({ tableId: 1, deleted: 1, createdAt: -1 });
customRowSchema.index({ tableId: 1, dueDate: 1 });
customRowSchema.index({ importBatchId: 1 });

const tableViewSchema = new Schema(
  {
    tableId: { type: ObjectId, ref: "CustomTable", required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["grid", "kanban", "calendar"], default: "grid" },
    filters: [{ field: String, op: String, value: Schema.Types.Mixed, _id: false }],
    sorts: [{ field: String, dir: { type: String, enum: ["asc", "desc"] }, _id: false }],
    groupBy: { type: String },
    hiddenFields: [String],
    columnOrder: [String],
    frozen: { type: Number, default: 1 },
    cardFields: [String],
    dateField: { type: String },
    owner: { type: ObjectId, ref: "User" },
    shared: { type: Boolean, default: true },
  },
  { timestamps: true }
);
tableViewSchema.index({ tableId: 1 });

const templateVersionSchema = new Schema(
  { version: Number, fields: [fieldSchema], sampleRows: [Schema.Types.Mixed], savedAt: Date, savedBy: { type: ObjectId, ref: "User" } },
  { _id: false }
);

const tableTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    issueCategory: { type: String, required: true },
    issueSubCategory: { type: String, default: null },
    fields: [fieldSchema],
    sampleRows: [Schema.Types.Mixed],
    source: { type: String, enum: ["built_in", "uploaded", "saved_from_table"], required: true },
    builtInKey: { type: String },
    sourceFileId: { type: ObjectId, ref: "StoredFile" },
    version: { type: Number, default: 1 },
    history: [templateVersionSchema],
    createdBy: { type: ObjectId, ref: "User" },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const storedFileSchema = new Schema(
  {
    originalName: { type: String, required: true },
    mimeType: { type: String },
    size: { type: Number },
    storage: { type: String, enum: ["s3", "local"], required: true },
    storagePath: { type: String, required: true },
    checksum: { type: String },
    uploadedBy: { type: ObjectId, ref: "User" },
    tableId: { type: ObjectId, ref: "CustomTable" },
    templateId: { type: ObjectId, ref: "TableTemplate" },
    importBatchId: { type: ObjectId, ref: "ImportBatch" },
    purpose: { type: String, enum: ["import", "template", "attachment", "error_report"], default: "import" },
  },
  { timestamps: true }
);

const importBatchSchema = new Schema(
  {
    tableId: { type: ObjectId, ref: "CustomTable", required: true },
    fileId: { type: ObjectId, ref: "StoredFile" },
    sheet: { type: String },
    mapping: { type: Schema.Types.Mixed },
    mode: { type: String, enum: ["create", "upsert", "skip"], default: "create" },
    matchField: { type: String },
    counts: { created: { type: Number, default: 0 }, updated: { type: Number, default: 0 }, skipped: { type: Number, default: 0 }, failed: { type: Number, default: 0 } },
    rowErrors: [{ row: Number, message: String, _id: false }],
    status: { type: String, enum: ["running", "completed", "rolled_back"], default: "running" },
    rolledBackAt: { type: Date },
    rolledBackBy: { type: ObjectId, ref: "User" },
    createdBy: { type: ObjectId, ref: "User" },
  },
  { timestamps: true }
);
importBatchSchema.index({ tableId: 1, createdAt: -1 });

const rowActivitySchema = new Schema(
  {
    tableId: { type: ObjectId, ref: "CustomTable", required: true },
    rowId: { type: ObjectId, ref: "CustomRow", required: true },
    batchId: { type: ObjectId, ref: "ImportBatch" },
    action: { type: String, enum: ["create", "update", "delete", "restore", "rollback"], required: true },
    changes: [{ field: String, old: Schema.Types.Mixed, new: Schema.Types.Mixed, _id: false }],
    user: { type: ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
rowActivitySchema.index({ rowId: 1, createdAt: -1 });
rowActivitySchema.index({ batchId: 1 });

export const CustomTable = models.CustomTable || model("CustomTable", customTableSchema, "custom_tables");
export const CustomRow = models.CustomRow || model("CustomRow", customRowSchema, "custom_rows");
export const TableView = models.TableView || model("TableView", tableViewSchema, "table_views");
export const TableTemplate = models.TableTemplate || model("TableTemplate", tableTemplateSchema, "table_templates");
export const StoredFile = models.StoredFile || model("StoredFile", storedFileSchema, "stored_files");
export const ImportBatch = models.ImportBatch || model("ImportBatch", importBatchSchema, "import_batches");
export const RowActivity = models.RowActivity || model("RowActivity", rowActivitySchema, "row_activity");
