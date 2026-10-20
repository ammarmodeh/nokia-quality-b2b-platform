// Field types for custom tables: coercion, validation and type conversion.
// The client mirrors these rules for instant feedback; the server is the authority.
import crypto from "crypto";
import mongoose from "mongoose";
import { validateTaxonomy } from "./taxonomy.js";

export const FIELD_TYPES = [
  "text", "longText", "number", "date", "datetime", "singleSelect", "multiSelect", "checkbox",
  "user", "fieldTeam", "phone", "email", "url", "attachment", "rating", "taxonomy", "linkedTask",
  "autoNumber", "createdTime", "updatedTime", "createdBy", "updatedBy",
];
export const READ_ONLY_TYPES = ["autoNumber", "createdTime", "updatedTime", "createdBy", "updatedBy"];
export const CORE_CONCEPTS = ["status", "assignee", "fieldTeam", "date", "schedule", "category", "severity", "customerId", "location", "slid", "teamCode"];
// which field types can feed each core concept
export const CORE_TYPES = {
  status: ["singleSelect", "checkbox", "text"],
  assignee: ["user"],
  fieldTeam: ["fieldTeam", "text"],
  date: ["date", "datetime"],
  // the booked appointment / scheduled visit (shown on the calendar on that day)
  schedule: ["date", "datetime"],
  category: ["taxonomy", "singleSelect"],
  severity: ["singleSelect", "rating", "number"],
  customerId: ["text", "phone", "number", "autoNumber"],
  location: ["text", "longText"],
  // the service line id that ties records across trackers
  slid: ["text", "number"],
  // the field team's code; resolved to the team that held it on the record's date
  teamCode: ["text", "number", "singleSelect"],
};

export const newFieldKey = () => `f_${crypto.randomBytes(4).toString("hex")}`;

const isEmpty = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
const YES = ["true", "yes", "y", "1", "ok", "done", "✓", "x", "نعم"];
const NO = ["false", "no", "n", "0", "", "لا"];
const isId = (v) => mongoose.Types.ObjectId.isValid(String(v));
const choiceValues = (f) => (f.options?.choices || []).map((c) => c.value);
const matchChoice = (f, v) => choiceValues(f).find((c) => c.toLowerCase() === String(v).trim().toLowerCase());

const toDate = (v) => {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v;
  if (typeof v === "number") return new Date(v);
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return Number(m[2]) > 12 ? undefined : new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/**
 * Convert a raw value to the stored representation of `field`.
 * Returns { value } or { error }. Empty input returns { value: null }.
 */
export const coerce = (field, raw) => {
  if (isEmpty(raw)) return { value: null };
  const t = field.type;
  switch (t) {
    case "text":
    case "longText":
      return { value: typeof raw === "object" ? JSON.stringify(raw) : String(raw) };
    case "phone": {
      const s = String(raw).trim();
      return /^[+\d][\d\s\-()]{3,}$/.test(s) ? { value: s } : { error: `"${s}" is not a phone number` };
    }
    case "email": {
      const s = String(raw).trim();
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? { value: s.toLowerCase() } : { error: `"${s}" is not an email address` };
    }
    case "url": {
      const s = String(raw).trim();
      return /^https?:\/\/\S+$/i.test(s) ? { value: s } : { error: `"${s}" is not a link (http/https)` };
    }
    case "number":
    case "rating": {
      const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[,\s%]/g, ""));
      if (!Number.isFinite(n)) return { error: `"${raw}" is not a number` };
      if (t === "rating" && (n < 0 || n > (field.options?.max || 5))) return { error: `Rating must be 0–${field.options?.max || 5}` };
      return { value: field.options?.format === "integer" ? Math.round(n) : n };
    }
    case "date":
    case "datetime": {
      const d = toDate(raw);
      return d ? { value: d.toISOString() } : { error: `"${raw}" is not a date` };
    }
    case "checkbox": {
      if (typeof raw === "boolean") return { value: raw };
      const s = String(raw).trim().toLowerCase();
      if (YES.includes(s)) return { value: true };
      if (NO.includes(s)) return { value: false };
      return { error: `"${raw}" is not yes/no` };
    }
    case "singleSelect": {
      const hit = matchChoice(field, raw);
      return hit !== undefined ? { value: hit } : { error: `"${raw}" is not an option` };
    }
    case "multiSelect": {
      const list = Array.isArray(raw) ? raw : String(raw).split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
      const out = [];
      for (const v of list) {
        const hit = matchChoice(field, v);
        if (hit === undefined) return { error: `"${v}" is not an option` };
        if (!out.includes(hit)) out.push(hit);
      }
      return { value: out };
    }
    case "user":
    case "attachment": {
      const list = (Array.isArray(raw) ? raw : [raw]).map(String);
      if (!list.every(isId)) return { error: "Invalid reference" };
      return { value: t === "user" && !field.options?.multiple ? list.slice(0, 1) : list };
    }
    case "fieldTeam":
    case "linkedTask":
      return isId(raw) ? { value: String(raw) } : { error: "Invalid reference" };
    case "taxonomy": {
      const [category, sub] = typeof raw === "object" ? [raw.category, raw.sub] : String(raw).split(/\s+[·/-]\s+/).map((x) => x.trim());
      const v = { category, sub: sub || null };
      const err = validateTaxonomy(v.category, v.sub || null);
      return err ? { error: err } : { value: { category: v.category, sub: v.sub || null } };
    }
    default:
      return { error: `"${t}" values are set by the system` };
  }
};

/** Validate and coerce a patch of { fieldKey: raw }. Returns { data, errors }. */
export const coerceData = (table, patch, { partial = true } = {}) => {
  const fields = Object.fromEntries(table.fields.filter((f) => !f.archived).map((f) => [f.key, f]));
  const data = {};
  const errors = [];
  for (const [key, raw] of Object.entries(patch || {})) {
    const f = fields[key];
    if (!f || READ_ONLY_TYPES.includes(f.type)) continue;
    const r = coerce(f, raw);
    if (r.error) errors.push({ field: key, label: f.label, message: r.error });
    else {
      if (f.validation?.min !== undefined && f.validation?.min !== null && typeof r.value === "number" && r.value < f.validation.min) errors.push({ field: key, label: f.label, message: `Must be at least ${f.validation.min}` });
      else if (f.validation?.max !== undefined && f.validation?.max !== null && typeof r.value === "number" && r.value > f.validation.max) errors.push({ field: key, label: f.label, message: `Must be at most ${f.validation.max}` });
      else if (f.validation?.pattern && typeof r.value === "string" && !new RegExp(f.validation.pattern).test(r.value)) errors.push({ field: key, label: f.label, message: "Doesn't match the required format" });
      else data[key] = r.value;
    }
  }
  if (!partial) {
    for (const f of Object.values(fields)) {
      if (READ_ONLY_TYPES.includes(f.type)) continue;
      if (data[f.key] === undefined || data[f.key] === null) {
        if (!isEmpty(f.defaultValue)) {
          const d = coerce(f, f.defaultValue);
          if (!d.error) data[f.key] = d.value;
        }
      }
      if (f.required && isEmpty(data[f.key])) errors.push({ field: f.key, label: f.label, message: `${f.label} is required` });
    }
  }
  return { data, errors };
};

/** System columns derived from the table's core mapping. */
export const systemColumns = (table, data) => {
  const by = Object.fromEntries(table.fields.filter((f) => f.coreMapping && !f.archived).map((f) => [f.coreMapping, f]));
  const out = {};
  if (by.status) {
    const v = data[by.status.key];
    out.status = v === true ? "Done" : v === false ? "Not done" : v ?? undefined;
  }
  if (by.assignee) out.assignees = (data[by.assignee.key] || []).filter(isId);
  if (by.fieldTeam && by.fieldTeam.type === "fieldTeam") out.fieldTeamId = isId(data[by.fieldTeam.key]) ? data[by.fieldTeam.key] : undefined;
  if (by.date) out.dueDate = data[by.date.key] ? new Date(data[by.date.key]) : undefined;
  if (by.slid) out.slid = isEmpty(data[by.slid.key]) ? undefined : String(data[by.slid.key]).trim().toUpperCase();
  if (by.teamCode) out.teamCode = isEmpty(data[by.teamCode.key]) ? undefined : String(data[by.teamCode.key]).trim().toUpperCase();
  return out;
};

// Date fields whose label reads like a booking are treated as scheduling dates.
export const SCHEDULE_LABEL_RX = /appoint|visit|schedul|book|reserv|follow.?up|موعد|زيارة|حجز/i;
const DATE_TYPES = ["date", "datetime"];

/**
 * Date fields that put a row on the global calendar, in priority order:
 * the table's explicit choice (settings.calendarFields), otherwise the field
 * mapped to "schedule", the one mapped to "date", and any date field whose
 * label names an appointment or visit. Each item: { field, role: "schedule" | "date" }.
 */
export const calendarFieldsOf = (table) => {
  const live = (table.fields || []).filter((f) => !f.archived && DATE_TYPES.includes(f.type));
  const role = (f) => (f.coreMapping === "schedule" || (f.coreMapping !== "date" && SCHEDULE_LABEL_RX.test(f.label)) ? "schedule" : "date");
  const chosen = table.settings?.calendarFields;
  if (Array.isArray(chosen) && chosen.length) return chosen.map((k) => live.find((f) => f.key === k)).filter(Boolean).map((f) => ({ field: f, role: role(f) }));
  const out = [];
  const add = (f) => f && !out.some((x) => x.field.key === f.key) && out.push({ field: f, role: role(f) });
  add(live.find((f) => f.coreMapping === "schedule"));
  add(live.find((f) => f.coreMapping === "date"));
  live.filter((f) => SCHEDULE_LABEL_RX.test(f.label)).forEach(add);
  return out;
};

/** Stored value → plain value a new type can read. */
const asRaw = (field, v) => {
  if (isEmpty(v)) return v;
  if (field.type === "taxonomy" && typeof v === "object") return v.sub ? `${v.category} · ${v.sub}` : v.category;
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "yes" : "no";
  return v;
};

/** Try converting one stored value from `from` field to `to` field definition. */
export const convertValue = (from, to, v) => {
  if (isEmpty(v)) return { value: null };
  if (to.type === "taxonomy" && typeof v === "object") return coerce(to, v);
  return coerce(to, asRaw(from, v));
};
