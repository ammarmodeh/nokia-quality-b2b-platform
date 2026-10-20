import { formatValue } from "./fieldTypes";

// Operators offered per field type in the filter builder.
export const OPS = {
  contains: { label: "contains", needs: true },
  eq: { label: "is", needs: true },
  neq: { label: "is not", needs: true },
  gt: { label: ">", needs: true },
  lt: { label: "<", needs: true },
  before: { label: "is before", needs: true },
  after: { label: "is after", needs: true },
  empty: { label: "is empty", needs: false },
  notEmpty: { label: "is not empty", needs: false },
};
export const opsFor = (field) => {
  switch (field.type) {
    case "number":
    case "rating":
    case "autoNumber": return ["eq", "neq", "gt", "lt", "empty", "notEmpty"];
    case "date":
    case "datetime":
    case "createdTime":
    case "updatedTime": return ["eq", "before", "after", "empty", "notEmpty"];
    case "singleSelect":
    case "multiSelect":
    case "taxonomy":
    case "user":
    case "fieldTeam": return ["eq", "neq", "empty", "notEmpty"];
    case "checkbox": return ["eq"];
    default: return ["contains", "eq", "neq", "empty", "notEmpty"];
  }
};

/** Value used for comparisons, sorting and grouping. */
export const rawOf = (field, row) => {
  switch (field.type) {
    case "autoNumber": return row.autoNumber;
    case "createdTime": return row.createdAt;
    case "updatedTime": return row.updatedAt;
    case "createdBy": return row.createdBy;
    case "updatedBy": return row.updatedBy;
    default: return row.data?.[field.key];
  }
};
const isEmpty = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
const dayKey = (v) => (v ? String(new Date(v).toISOString()).slice(0, 10) : "");

const test = (field, row, f, lookups) => {
  const v = rawOf(field, row);
  switch (f.op) {
    case "empty": return isEmpty(v);
    case "notEmpty": return !isEmpty(v);
    default: break;
  }
  const want = f.value;
  if (want === undefined || want === null || want === "") return true;
  if (["date", "datetime", "createdTime", "updatedTime"].includes(field.type)) {
    if (isEmpty(v)) return false;
    const a = dayKey(v);
    const b = dayKey(want);
    return f.op === "eq" ? a === b : f.op === "before" ? a < b : f.op === "after" ? a > b : true;
  }
  if (["number", "rating", "autoNumber"].includes(field.type)) {
    const n = Number(v);
    const w = Number(want);
    if (isEmpty(v)) return f.op === "neq";
    return f.op === "eq" ? n === w : f.op === "neq" ? n !== w : f.op === "gt" ? n > w : f.op === "lt" ? n < w : true;
  }
  if (field.type === "checkbox") return Boolean(v) === (want === true || want === "true");
  if (field.type === "multiSelect" || field.type === "user") {
    const has = (v || []).includes(want);
    return f.op === "neq" ? !has : has;
  }
  if (field.type === "taxonomy") {
    const label = [v?.category, v?.sub].filter(Boolean).join(" · ");
    const hit = label === want || v?.category === want;
    return f.op === "neq" ? !hit : hit;
  }
  if (field.type === "singleSelect" || field.type === "fieldTeam") return f.op === "neq" ? v !== want : v === want;
  const text = formatValue(field, v, row, lookups).toLowerCase();
  const w = String(want).toLowerCase();
  return f.op === "contains" ? text.includes(w) : f.op === "eq" ? text === w : f.op === "neq" ? text !== w : true;
};

const compare = (field, a, b, lookups) => {
  const x = rawOf(field, a);
  const y = rawOf(field, b);
  if (isEmpty(x) && isEmpty(y)) return 0;
  if (isEmpty(x)) return 1;
  if (isEmpty(y)) return -1;
  if (["number", "rating", "autoNumber"].includes(field.type)) return Number(x) - Number(y);
  if (["date", "datetime", "createdTime", "updatedTime"].includes(field.type)) return new Date(x) - new Date(y);
  if (field.type === "checkbox") return Number(Boolean(y)) - Number(Boolean(x));
  if (field.type === "singleSelect") {
    const order = (field.options?.choices || []).map((c) => c.value);
    return order.indexOf(x) - order.indexOf(y);
  }
  return formatValue(field, x, a, lookups).localeCompare(formatValue(field, y, b, lookups), undefined, { numeric: true, sensitivity: "base" });
};

/** Apply search, filters and sorts. Returns rows in display order. */
export const applyView = (rows, fields, view, lookups, q) => {
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
  let out = rows;
  const filters = (view?.filters || []).filter((f) => byKey[f.field]);
  if (filters.length) out = out.filter((r) => filters.every((f) => test(byKey[f.field], r, f, lookups)));
  if (q) {
    const needle = q.toLowerCase();
    out = out.filter((r) => fields.some((f) => formatValue(f, rawOf(f, r), r, lookups).toLowerCase().includes(needle)) || String(r.autoNumber) === q);
  }
  const sorts = (view?.sorts || []).filter((s) => byKey[s.field]);
  if (sorts.length) {
    out = [...out].sort((a, b) => {
      for (const s of sorts) {
        const c = compare(byKey[s.field], a, b, lookups);
        if (c) return s.dir === "desc" ? -c : c;
      }
      return (a.autoNumber || 0) - (b.autoNumber || 0);
    });
  }
  return out;
};

/** Group key + label for a row; multi-value fields group by their first value. */
export const groupOf = (field, row, lookups) => {
  const v = rawOf(field, row);
  if (isEmpty(v)) return { key: "__none", label: `No ${field.label.toLowerCase()}` };
  if (field.type === "checkbox") return v ? { key: "true", label: "Checked" } : { key: "false", label: "Unchecked" };
  if (field.type === "multiSelect" || field.type === "user") return { key: String(v[0]), label: formatValue(field, [v[0]], row, lookups) };
  if (field.type === "date" || field.type === "datetime") return { key: dayKey(v), label: formatValue(field, v, row, lookups) };
  const label = formatValue(field, v, row, lookups);
  return { key: label, label };
};

/** Build the visible items of a grid: rows, with group headers when grouped. */
export const groupRows = (rows, groupField, lookups, collapsed = {}) => {
  if (!groupField) return rows.map((row) => ({ kind: "row", row }));
  const groups = new Map();
  for (const r of rows) {
    const g = groupOf(groupField, r, lookups);
    if (!groups.has(g.key)) groups.set(g.key, { ...g, rows: [] });
    groups.get(g.key).rows.push(r);
  }
  let list = [...groups.values()];
  if (groupField.type === "singleSelect") {
    const order = (groupField.options?.choices || []).map((c) => c.value);
    list.sort((a, b) => (a.key === "__none" ? 1 : b.key === "__none" ? -1 : order.indexOf(a.key) - order.indexOf(b.key)));
  } else list.sort((a, b) => (a.key === "__none" ? 1 : b.key === "__none" ? -1 : String(a.label).localeCompare(String(b.label), undefined, { numeric: true })));
  const items = [];
  for (const g of list) {
    items.push({ kind: "group", key: g.key, label: g.label, count: g.rows.length, value: g.rows[0] ? rawOf(groupField, g.rows[0]) : null });
    if (!collapsed[g.key]) g.rows.forEach((row) => items.push({ kind: "row", row }));
  }
  return items;
};

/** Tab-separated text for the clipboard (Excel-compatible). */
export const toTSV = (matrix) => matrix.map((r) => r.map((c) => (/[\t\n"]/.test(c) ? `"${String(c).replace(/"/g, '""')}"` : c)).join("\t")).join("\n");
export const fromTSV = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\n$/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === "\t") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows;
};
