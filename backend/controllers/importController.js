// Bulk import for existing entities.
//
// Rows are already mapped to model fields by the client wizard. For writes we
// call the same controllers the app uses for single records, so every business
// rule (GAIA tickets for tasks, SOW handling, field-team quiz code / password,
// taxonomy defaults, issue logs, question ordering) stays identical.
// A dry run never writes: it validates against the model and looks up keys.
import mongoose from "mongoose";
import { TaskSchema } from "../models/taskModel.js";
import { CustomerIssueSchema } from "../models/customerIssueModel.js";
import { FieldTeamsSchema } from "../models/fieldTeamsModel.js";
import { QuizSchema } from "../models/quizModel.js";
import { DropdownOption } from "../models/dropdownOptionModel.js";
import { addTask, updateTask } from "./taskControllers.js";
import { createIssue, updateIssue } from "./customerIssueController.js";
import { addFieldTeam, updateFieldTeam } from "./fieldTeamsControllers.js";
import { addQuestion, updateQuestion } from "./quizControllers.js";
import { addOption, updateOption } from "./dropdownOptionControllers.js";
import { applyTaxonomy } from "../utils/taxonomy.js";

const MAX_ROWS = 500;

const ENTITIES = {
  tasks: {
    model: TaskSchema,
    keys: ["requestNumber", "slid"],
    required: ["slid", "requestNumber"],
    create: addTask,
    update: updateTask,
    taxonomy: "task",
  },
  snags: {
    model: CustomerIssueSchema,
    keys: ["ticketId", "slid"],
    required: ["slid"],
    create: createIssue,
    update: updateIssue,
    taxonomy: "issue",
    // createIssue stamps today on a missing PIS date unless told it is unknown
    prepare: (row) => (row.pisDate ? row : { ...row, pisDateKnown: false }),
  },
  fieldTeams: {
    model: FieldTeamsSchema,
    keys: ["teamCode"],
    required: ["teamCode", "teamName", "teamCompany", "contactNumber", "firstName", "surname"],
    create: addFieldTeam,
    update: updateFieldTeam,
    keyFilter: (v) => ({ teamCode: String(v).trim(), isTerminated: false }),
  },
  quiz: {
    model: QuizSchema,
    keys: ["question"],
    required: ["question", "options", "correctAnswer"],
    create: addQuestion,
    update: updateQuestion,
  },
  dropdownOptions: {
    model: DropdownOption,
    keys: ["value"],
    required: ["category", "value", "label"],
    create: addOption,
    update: updateOption,
    keyFilter: (v, row) => ({ category: row.category, value: v }),
  },
};

// Run an Express controller in-process and capture its response.
const invoke = (fn, { body, params = {}, user }) =>
  new Promise((resolve) => {
    let statusCode = 200;
    const res = {
      status(code) {
        statusCode = code;
        return res;
      },
      json(data) {
        resolve({ status: statusCode, data });
        return res;
      },
      send(data) {
        resolve({ status: statusCode, data });
        return res;
      },
    };
    Promise.resolve(fn({ body, params, user, query: {} }, res)).catch((err) => resolve({ status: 500, data: { message: err.message } }));
  });

const errorText = (data) => data?.message || data?.error || (typeof data === "string" ? data : "Request failed");

const blank = (v) => v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length);
const same = (a, b) => {
  if (typeof a === "string" && typeof b === "string" && /^\d{4}-\d{2}-\d{2}/.test(a) && /^\d{4}-\d{2}-\d{2}/.test(b)) {
    return a.slice(0, 10) === b.slice(0, 10);
  }
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
};
const diffOf = (existing, data, onlyBlanks = false, allowedCols = null) =>
  Object.entries(data)
    .filter(([k, v]) => {
      if (k.startsWith("__") || ["_id", "createdBy", "createdAt", "updatedAt", "__v"].includes(k)) return false;
      if (allowedCols && Array.isArray(allowedCols) && allowedCols.length && !allowedCols.includes(k)) return false;
      if (blank(v)) return false;
      if (onlyBlanks && !blank(existing[k])) return false;
      return !same(existing[k], v);
    })
    .map(([k, v]) => ({ field: k, old: existing[k] ?? null, new: v }));

export const importRows = async (req, res) => {
  const cfg = ENTITIES[req.params.entity];
  if (!cfg) return res.status(404).json({ message: `Unknown entity "${req.params.entity}"` });

  const { rows = [], mode = "create", key, dryRun = true, columnsToUpdate } = req.body || {};
  if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ message: "No rows to import" });
  if (rows.length > MAX_ROWS) return res.status(400).json({ message: `Send at most ${MAX_ROWS} rows per request` });
  if (!["create", "upsert", "skip"].includes(mode)) return res.status(400).json({ message: "mode must be create, upsert or skip" });
  if (mode !== "create" && !cfg.keys.includes(key)) return res.status(400).json({ message: `Choose a match key: ${cfg.keys.join(", ")}` });

  const results = [];
  const seen = new Map();

  for (let i = 0; i < rows.length; i++) {
    let row = { ...rows[i] };
    const rowNo = row.__row ?? i + 1;
    const rowAction = row.__action;
    delete row.__row;
    delete row.__action;
    if (cfg.prepare) row = cfg.prepare(row);
    const r = { row: rowNo, action: null, status: "ok", message: "" };
    try {
      const missing = cfg.required.filter((f) => row[f] === undefined || row[f] === null || row[f] === "" || (Array.isArray(row[f]) && !row[f].length));
      if (missing.length && (!rowAction || rowAction === "create")) throw new Error(`Missing ${missing.join(", ")}`);

      if (cfg.taxonomy) {
        const tax = applyTaxonomy(row, cfg.taxonomy);
        if (tax.error) throw new Error(tax.error);
        Object.assign(row, tax.body);
      }

      const matchKey = key || cfg.keys[0];
      let existing = null;
      let repeatOf = null;

      if (row[matchKey] !== undefined && row[matchKey] !== "") {
        const matchVal = String(row[matchKey]).trim();
        if (seen.has(matchVal)) {
          repeatOf = seen.get(matchVal);
        } else {
          seen.set(matchVal, rowNo);
        }

        const filter = cfg.keyFilter ? cfg.keyFilter(row[matchKey], row) : { [matchKey]: row[matchKey] };
        existing = await cfg.model.findOne(filter).lean();
      }

      const dupInfo = existing
        ? {
            id: existing._id,
            autoNumber: existing.requestNumber || existing.slid || existing.ticketId || existing.teamCode || String(existing._id).slice(-4),
            changes: diffOf(existing, row, false, columnsToUpdate),
            blanks: diffOf(existing, row, true, columnsToUpdate).length,
          }
        : null;

      const decision = ["create", "update", "merge", "skip"].includes(rowAction) ? rowAction : null;

      if (decision === "skip" || (!decision && existing && mode === "skip")) {
        r.action = "skip";
        r.message = `Exists (${matchKey} = ${row[matchKey]})`;
        r.id = String(existing?._id);
        r.existing = dupInfo;
        r.repeatOf = repeatOf;
        results.push(r);
        continue;
      }

      if (!decision && dryRun && repeatOf && mode !== "create") {
        r.action = "skip";
        r.message = "Repeated in the file";
        r.repeatOf = repeatOf;
        r.existing = dupInfo;
        results.push(r);
        continue;
      }

      if (!decision && existing && mode === "create") {
        throw new Error(`Already exists (${matchKey} = ${row[matchKey]})`);
      }

      const asNew = decision === "create" || !existing;
      r.action = asNew ? "create" : "update";
      r.existing = dupInfo;
      r.repeatOf = repeatOf;

      if (dryRun) {
        if (asNew) {
          const doc = new cfg.model({ ...row, createdBy: req.user?._id });
          await doc.validate();
        }
      } else {
        if (!asNew) {
          let patch = {};
          if (decision === "merge") {
            const mergeDiff = diffOf(existing, row, true, columnsToUpdate);
            patch = Object.fromEntries(mergeDiff.map((c) => [c.field, c.new]));
          } else if (columnsToUpdate && Array.isArray(columnsToUpdate) && columnsToUpdate.length) {
            columnsToUpdate.forEach((col) => {
              if (row[col] !== undefined && !blank(row[col])) {
                patch[col] = row[col];
              }
            });
          } else {
            Object.entries(row).forEach(([k, v]) => {
              if (!blank(v) && !k.startsWith("__")) patch[k] = v;
            });
          }

          if (Object.keys(patch).length === 0) {
            r.action = "skip";
            r.message = "No fields changed";
            r.id = String(existing._id);
            results.push(r);
            continue;
          }

          const out = await invoke(cfg.update, { body: patch, params: { id: String(existing._id) }, user: req.user });
          if (out.status >= 400) throw new Error(errorText(out.data));
          r.id = String(existing._id);
        } else {
          const out = await invoke(cfg.create, { body: row, user: req.user });
          if (out.status >= 400) throw new Error(errorText(out.data));
          const saved = out.data?.task || out.data?.data || out.data;
          r.id = saved?._id ? String(saved._id) : undefined;
        }
      }
    } catch (err) {
      r.status = "error";
      r.message = err instanceof mongoose.Error.ValidationError ? Object.values(err.errors).map((e) => e.message).join("; ") : err.message;
    }
    results.push(r);
  }

  const counts = results.reduce(
    (acc, r) => {
      if (r.status === "error") acc.invalid++;
      else acc[r.action === "update" ? "updated" : r.action === "skip" ? "skipped" : "created"]++;
      return acc;
    },
    { created: 0, updated: 0, skipped: 0, invalid: 0 }
  );
  res.status(200).json({ dryRun: Boolean(dryRun), counts, results });
};

export const importEntities = (req, res) =>
  res.json(Object.fromEntries(Object.entries(ENTITIES).map(([k, v]) => [k, { keys: v.keys, required: v.required }])));
