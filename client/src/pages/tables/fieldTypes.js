import { format, isValid } from "date-fns";
import TextFields from "@mui/icons-material/TextFields";
import Notes from "@mui/icons-material/Notes";
import Numbers from "@mui/icons-material/Numbers";
import Event from "@mui/icons-material/Event";
import Schedule from "@mui/icons-material/Schedule";
import ArrowDropDownCircleOutlined from "@mui/icons-material/ArrowDropDownCircleOutlined";
import ChecklistOutlined from "@mui/icons-material/ChecklistOutlined";
import CheckBoxOutlined from "@mui/icons-material/CheckBoxOutlined";
import PersonOutline from "@mui/icons-material/PersonOutline";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import PhoneOutlined from "@mui/icons-material/PhoneOutlined";
import AlternateEmailOutlined from "@mui/icons-material/AlternateEmailOutlined";
import LinkOutlined from "@mui/icons-material/LinkOutlined";
import AttachFileOutlined from "@mui/icons-material/AttachFileOutlined";
import StarOutline from "@mui/icons-material/StarOutline";
import AccountTreeOutlined from "@mui/icons-material/AccountTreeOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import TagOutlined from "@mui/icons-material/Tag";
import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import { parseDate, parseTaxonomy } from "../../components/dataio/parse";

export const FIELD_TYPES = {
  text: { label: "Text", icon: TextFields, group: "Basic" },
  longText: { label: "Long text", icon: Notes, group: "Basic" },
  number: { label: "Number", icon: Numbers, group: "Basic" },
  date: { label: "Date", icon: Event, group: "Basic" },
  datetime: { label: "Date & time", icon: Schedule, group: "Basic" },
  singleSelect: { label: "Single select", icon: ArrowDropDownCircleOutlined, group: "Basic" },
  multiSelect: { label: "Multi select", icon: ChecklistOutlined, group: "Basic" },
  checkbox: { label: "Checkbox", icon: CheckBoxOutlined, group: "Basic" },
  rating: { label: "Rating", icon: StarOutline, group: "Basic" },
  phone: { label: "Phone", icon: PhoneOutlined, group: "Contact" },
  email: { label: "Email", icon: AlternateEmailOutlined, group: "Contact" },
  url: { label: "Link", icon: LinkOutlined, group: "Contact" },
  user: { label: "User", icon: PersonOutline, group: "App" },
  fieldTeam: { label: "Field team", icon: GroupsOutlined, group: "App" },
  taxonomy: { label: "Tracker category", icon: AccountTreeOutlined, group: "App" },
  linkedTask: { label: "Linked task", icon: TaskAltOutlined, group: "App" },
  attachment: { label: "Attachment", icon: AttachFileOutlined, group: "App" },
  autoNumber: { label: "Auto number", icon: TagOutlined, group: "System" },
  createdTime: { label: "Created time", icon: HistoryOutlined, group: "System" },
  updatedTime: { label: "Updated time", icon: HistoryOutlined, group: "System" },
  createdBy: { label: "Created by", icon: PersonOutline, group: "System" },
  updatedBy: { label: "Updated by", icon: PersonOutline, group: "System" },
};
export const READ_ONLY = ["autoNumber", "createdTime", "updatedTime", "createdBy", "updatedBy"];
export const SELECT_TYPES = ["singleSelect", "multiSelect"];

export const CHOICE_COLORS = {
  gray: "var(--text-secondary)",
  red: "var(--danger)",
  amber: "var(--warning)",
  green: "var(--success)",
  blue: "var(--info)",
  violet: "var(--accent)",
  pink: "#db2777",
  teal: "#0d9488",
};
export const COLOR_NAMES = Object.keys(CHOICE_COLORS);

export const CORE_CONCEPTS = {
  status: { label: "Status", types: ["singleSelect", "checkbox", "text"], hint: "Kanban lanes, status filters, task views" },
  assignee: { label: "Assignee", types: ["user"], hint: "My work, task views" },
  fieldTeam: { label: "Field team", types: ["fieldTeam", "text"], hint: "Team Violation Tracker, team pages" },
  date: { label: "Date", types: ["date", "datetime"], hint: "Calendar, date filters, trends" },
  schedule: { label: "Scheduled appointment / visit", types: ["date", "datetime"], hint: "Puts the row on the calendar on the booked day, marked as an appointment" },
  category: { label: "Category", types: ["taxonomy", "singleSelect"], hint: "Category breakdowns" },
  severity: { label: "Severity / score", types: ["singleSelect", "rating", "number"], hint: "Dashboard severity" },
  customerId: { label: "Customer / account ID", types: ["text", "phone", "number", "autoNumber"], hint: "Global search, linking to tasks" },
  location: { label: "Location", types: ["text", "longText"], hint: "Location filters" },
  slid: { label: "SLID", types: ["text", "number"], hint: "Ties this row to the same SLID in other trackers and in Team analysis" },
  teamCode: { label: "Team code", types: ["text", "number", "singleSelect"], hint: "Counts the row for the team that held this code on the row's date (kept even if the code moves to someone else later)" },
};

const empty = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
export const choiceColor = (field, value) => CHOICE_COLORS[(field.options?.choices || []).find((c) => c.value === value)?.color] || CHOICE_COLORS.gray;

/** Plain-text rendering of a stored value (search, export, copy). lookups: { users, teams } by id. */
export const formatValue = (field, v, row, lookups = {}) => {
  switch (field.type) {
    case "autoNumber": return row?.autoNumber ? `${field.options?.prefix || ""}${row.autoNumber}` : "";
    case "createdTime": return row?.createdAt ? format(new Date(row.createdAt), "dd MMM yyyy HH:mm") : "";
    case "updatedTime": return row?.updatedAt ? format(new Date(row.updatedAt), "dd MMM yyyy HH:mm") : "";
    case "createdBy": return lookups.users?.[row?.createdBy]?.name || "";
    case "updatedBy": return lookups.users?.[row?.updatedBy]?.name || "";
    default: break;
  }
  if (empty(v)) return "";
  switch (field.type) {
    case "date": {
      const d = new Date(v);
      return isValid(d) ? format(d, "dd MMM yyyy") : String(v);
    }
    case "datetime": {
      const d = new Date(v);
      return isValid(d) ? format(d, "dd MMM yyyy HH:mm") : String(v);
    }
    case "checkbox": return v ? "Yes" : "No";
    case "multiSelect": return v.join(", ");
    case "user": return v.map((id) => lookups.users?.[id]?.name || "Unknown user").join(", ");
    case "fieldTeam": return lookups.teams?.[v]?.teamName || "Unknown team";
    case "taxonomy": return [v.category, v.sub].filter(Boolean).join(" · ");
    case "attachment": return `${v.length} file${v.length === 1 ? "" : "s"}`;
    case "number": {
      if (field.options?.format === "percent") return `${v}%`;
      return typeof field.options?.precision === "number" ? Number(v).toFixed(field.options.precision) : String(v);
    }
    case "rating": return "★".repeat(Math.round(v));
    default: return String(v);
  }
};

const YES = ["yes", "y", "true", "1", "ok", "done", "x", "نعم"];
const NO = ["no", "n", "false", "0", "لا"];

/**
 * Parse typed or pasted text into a value the server accepts.
 * Returns { value } or { error }; matching is forgiving (case, Excel dates, y/n).
 */
export const parseInput = (field, raw, lookups = {}) => {
  if (raw === undefined || raw === null || (typeof raw === "string" && !raw.trim())) return { value: null };
  const s = typeof raw === "string" ? raw.trim() : raw;
  switch (field.type) {
    case "number":
    case "rating": {
      const n = typeof s === "number" ? s : Number(String(s).replace(/[,\s%]/g, ""));
      return Number.isFinite(n) ? { value: n } : { error: `"${s}" is not a number` };
    }
    case "date":
    case "datetime": {
      const d = parseDate(s);
      return d ? { value: d.toISOString() } : { error: `"${s}" is not a date` };
    }
    case "checkbox": {
      if (typeof s === "boolean") return { value: s };
      const n = String(s).toLowerCase();
      return YES.includes(n) ? { value: true } : NO.includes(n) ? { value: false } : { error: `"${s}" is not yes/no` };
    }
    case "singleSelect": {
      const hit = (field.options?.choices || []).find((c) => c.value.toLowerCase() === String(s).toLowerCase());
      return hit ? { value: hit.value } : { error: `"${s}" is not an option` };
    }
    case "multiSelect": {
      const parts = Array.isArray(s) ? s : String(s).split(/[,|;]/).map((x) => x.trim()).filter(Boolean);
      const out = [];
      for (const p of parts) {
        const hit = (field.options?.choices || []).find((c) => c.value.toLowerCase() === p.toLowerCase());
        if (!hit) return { error: `"${p}" is not an option` };
        out.push(hit.value);
      }
      return { value: out };
    }
    case "taxonomy": {
      if (typeof s === "object") return { value: s };
      const t = parseTaxonomy(s);
      if (!t) return { error: `"${s}" isn't a tracker category` };
      if (t.missingSub) return { error: `${t.category} needs a sub-category` };
      return { value: { category: t.category, sub: t.sub } };
    }
    case "fieldTeam": {
      if (lookups.teams?.[s]) return { value: s };
      const hit = Object.values(lookups.teams || {}).find((t) => t.teamName?.toLowerCase() === String(s).toLowerCase());
      return hit ? { value: hit._id } : { error: `No field team called "${s}"` };
    }
    case "user": {
      const list = Array.isArray(s) ? s : String(s).split(/[,;]/).map((x) => x.trim()).filter(Boolean);
      const ids = [];
      for (const p of list) {
        const hit = lookups.users?.[p] ? { _id: p } : Object.values(lookups.users || {}).find((u) => u.name?.toLowerCase() === p.toLowerCase() || u.email?.toLowerCase() === p.toLowerCase());
        if (!hit) return { error: `No user called "${p}"` };
        ids.push(hit._id);
      }
      return { value: ids };
    }
    default:
      return { value: String(s) };
  }
};

/** A table field as an Import-wizard field (see components/dataio/entities.js). */
export const toImportField = (f) => {
  const base = { key: f.key, label: f.label, required: f.required, synonyms: [f.label, ...f.label.split("|").map((x) => x.trim())] };
  switch (f.type) {
    case "number":
    case "rating": return { ...base, type: "number" };
    case "date":
    case "datetime": return { ...base, type: "date" };
    case "singleSelect": return { ...base, type: "enum", options: (f.options?.choices || []).map((c) => c.value) };
    case "multiSelect": return { ...base, type: "list", splitComma: true };
    case "checkbox": return { ...base, type: "yesno" };
    case "taxonomy": return { ...base, type: "taxonomy" };
    default: return { ...base, type: "text" };
  }
};
export const IMPORTABLE = (f) => !f.archived && !READ_ONLY.includes(f.type) && !["attachment", "linkedTask", "user", "fieldTeam"].includes(f.type);

/**
 * Guess field definitions from a sheet: header row + sample values.
 * Dates, numbers, phones, emails, links, yes/no, and select lists for columns with few distinct values.
 */
export const inferFields = (header, rows) =>
  header
    .map((h, col) => ({ h: String(h ?? "").replace(/\s+/g, " ").trim(), col }))
    .filter(({ h, col }) => h || rows.some((r) => r[col] !== "" && r[col] !== undefined))
    .map(({ h, col }) => {
      const vals = rows.map((r) => r[col]).filter((v) => v !== "" && v !== undefined && v !== null);
      const strs = vals.map((v) => String(v).trim());
      const distinct = [...new Set(strs)];
      const label = h || `Column ${col + 1}`;
      const all = (fn) => vals.length > 0 && vals.every(fn);
      let type = "text";
      let options;
      if (all((v) => v instanceof Date || (typeof v === "number" && v > 30000 && v < 60000 && /date|تاريخ/i.test(label)) || (typeof v === "string" && /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(v.trim())))) type = "date";
      else if (all((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()))) type = "email";
      else if (all((v) => /^https?:\/\//i.test(String(v).trim()))) type = "url";
      else if (all((v) => /^(\+?962|0)?7\d{8}$/.test(String(v).replace(/[\s-]/g, "")) || /^\+?\d{9,14}$/.test(String(v).replace(/[\s-]/g, "")))) type = "phone";
      else if (all((v) => typeof v === "boolean" || [...YES, ...NO].includes(String(v).trim().toLowerCase())) && distinct.length <= 4) type = "checkbox";
      else if (all((v) => typeof v === "number" || /^-?\d+(\.\d+)?%?$/.test(String(v).trim()))) type = "number";
      else if (distinct.length > 0 && distinct.length <= Math.min(12, Math.max(3, vals.length / 3)) && strs.every((s) => s.length <= 40)) {
        type = "singleSelect";
        const seen = new Map();
        distinct.forEach((v) => { if (!seen.has(v.toLowerCase())) seen.set(v.toLowerCase(), v); });
        options = { choices: [...seen.values()].map((v, i) => ({ value: v, color: COLOR_NAMES[(i + 1) % COLOR_NAMES.length] })) };
      } else if (strs.some((s) => s.length > 80)) type = "longText";
      return { label, type, options, sourceColumn: col, samples: distinct.slice(0, 4), filled: vals.length };
    });
