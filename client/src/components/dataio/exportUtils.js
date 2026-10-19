import { format } from "date-fns";
import { TAXONOMY, taxonomyOfIssue, taxonomyOfTask } from "../../constants/taxonomy";
import { ENTITIES } from "./entities";
import { downloadWorkbook } from "./parse";

export const SPLITS = [
  { value: "none", label: "One sheet" },
  { value: "tracker", label: "One sheet per tracker" },
  { value: "team", label: "One sheet per field team" },
  { value: "month", label: "One sheet per month" },
];

const dateOf = (e, r) => {
  const d = e === "tasks" ? r.interviewDate || r.pisDate || r.createdAt : e === "snags" ? r.date || r.pisDate || r.createdAt : r.createdAt;
  return d ? new Date(d) : null;
};
const trackerOf = (e, r) => (e === "tasks" ? taxonomyOfTask(r).label : e === "snags" ? taxonomyOfIssue(r).label : ENTITIES[e].short);

/** Human-readable cell value for an export. */
export const cellValue = (entity, field, row) => {
  const custom = ENTITIES[entity].exportValue?.[field.key];
  if (custom) return custom(row);
  const v = row[field.key];
  if (v === null || v === undefined) return "";
  if (field.type === "date") return v ? new Date(v) : "";
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === "object" ? x.name || x.label || x.category || "" : x)).filter(Boolean).join(", ");
  if (typeof v === "object") return v.name || v.label || "";
  return v;
};

/** Build [{ name, header, rows }] for one entity, optionally split into several sheets. */
export const exportSheetsFor = (entity, rows, columns, split = "none") => {
  const fields = Object.fromEntries(ENTITIES[entity].fields.map((f) => [f.key, f]));
  const cols = columns.map((c) => fields[c.key]).filter(Boolean);
  const header = cols.map((f) => f.label);
  const toRow = (r) => cols.map((f) => cellValue(entity, f, r));
  if (split === "none") return [{ name: ENTITIES[entity].short, header, rows: rows.map(toRow) }];
  const groups = new Map();
  for (const r of rows) {
    const k = split === "tracker" ? trackerOf(entity, r) : split === "team" ? r.teamName || "No team" : dateOf(entity, r) ? format(dateOf(entity, r), "yyyy-MM") : "No date";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(toRow(r));
  }
  return [...groups.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))).map(([k, rs]) => ({ name: `${ENTITIES[entity].short} ${k}`, header, rows: rs }));
};

/** Import template: headers + one example row, plus a "Lists" sheet of valid values. */
export const downloadTemplate = (entity) => {
  const def = ENTITIES[entity];
  const example = {
    text: "Example",
    number: 1,
    date: new Date(),
    enum: null,
    yesno: "no",
    list: "Value A | Value B",
    taxonomy: TAXONOMY[0].subs.length ? `${TAXONOMY[0].label} · ${TAXONOMY[0].subs[0]}` : TAXONOMY[0].label,
  };
  const header = def.fields.map((f) => (f.required ? `${f.label} *` : f.label));
  const row = def.fields.map((f) => (f.type === "enum" ? f.options[0] : example[f.type] ?? ""));
  const listCols = def.fields.filter((f) => f.options);
  const maxLen = Math.max(0, ...listCols.map((f) => f.options.length));
  const lists = {
    name: "Lists",
    header: listCols.map((f) => f.label),
    rows: Array.from({ length: maxLen }, (_, i) => listCols.map((f) => f.options[i] ?? "")),
  };
  downloadWorkbook([{ name: `${def.short} template`, header, rows: [row] }, ...(listCols.length ? [lists] : [])], `${def.short.toLowerCase().replace(/\s+/g, "-")}-import-template`);
};
