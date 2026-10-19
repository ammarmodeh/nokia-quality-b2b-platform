import XLSX from "xlsx-js-style";
import { TAXONOMY } from "../../constants/taxonomy";

// ---------------------------------------------------------------- reading
export async function readWorkbook(file) {
  const buf = await file.arrayBuffer();
  const isCsv = /\.csv$/i.test(file.name);
  const wb = isCsv ? XLSX.read(new TextDecoder("utf-8").decode(buf), { type: "string", raw: false }) : XLSX.read(buf, { type: "array", cellDates: false });
  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true, blankrows: false });
    const merges = (ws["!merges"] || []).length;
    return { name, rows, merges, ref: ws["!ref"] || "" };
  });
}

// ---------------------------------------------------------------- matching
export const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[❖•‏‎]/g, "")
    .replace(/[^a-z0-9؀-ۿ]+/g, " ")
    .trim();

const lev = (a, b) => {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
};

/** 0..1 similarity between a header and a field (key, label, synonyms). */
export const headerScore = (header, field) => {
  const h = norm(header);
  if (!h) return 0;
  const cands = [field.key, field.label, ...(field.synonyms || [])].map(norm).filter(Boolean);
  let best = 0;
  for (const c of cands) {
    if (h === c || h.replace(/ /g, "") === c.replace(/ /g, "")) return 1;
    const ratio = 1 - lev(h, c) / Math.max(h.length, c.length);
    best = Math.max(best, ratio);
    if (c.length >= 4 && (h.startsWith(c + " ") || h.endsWith(" " + c))) best = Math.max(best, 0.82);
  }
  return best;
};

/** Pick the row (among the first 15) that looks most like a header row. */
export const detectHeaderRow = (rows, fields) => {
  let bestIdx = 0, bestScore = -1;
  rows.slice(0, 15).forEach((row, i) => {
    const cells = row.filter((c) => c !== "" && c !== null);
    if (cells.length < 2) return;
    const strings = cells.filter((c) => typeof c === "string" && Number.isNaN(Number(c))).length;
    const matches = row.filter((c) => fields.some((f) => headerScore(c, f) >= 0.8)).length;
    const score = matches * 3 + strings / Math.max(1, cells.length) + cells.length * 0.01;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  });
  return bestIdx;
};

/** Map each header to its best field (each field used once). saved: { normalizedHeader: fieldKey } */
export const autoMap = (headers, fields, saved = {}) => {
  const mapping = headers.map((h) => (saved[norm(h)] !== undefined ? saved[norm(h)] : null));
  const pairs = [];
  headers.forEach((h, i) => {
    if (mapping[i] !== null) return;
    fields.forEach((f) => {
      const s = headerScore(h, f);
      if (s >= 0.78) pairs.push({ i, key: f.key, s });
    });
  });
  pairs.sort((a, b) => b.s - a.s);
  const used = new Set(mapping.filter(Boolean));
  for (const p of pairs) {
    if (mapping[p.i] !== null || used.has(p.key)) continue;
    mapping[p.i] = p.key;
    used.add(p.key);
  }
  return mapping.map((m) => (m === "" ? null : m));
};

// ---------------------------------------------------------------- values
export const parseDate = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v;
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? new Date(Date.UTC(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, Math.floor(d.S || 0))) : undefined;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/); // dd/mm/yyyy
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const d = new Date(Date.UTC(y, Number(m[2]) - 1, Number(m[1])));
    return Number.isNaN(d.getTime()) || Number(m[2]) > 12 ? undefined : d;
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const YES = ["yes", "y", "true", "1", "closed", "resolved", "solved", "done", "نعم"];
const NO = ["no", "n", "false", "0", "open", "pending", "not solved", "لا"];

const taxonomyIndex = TAXONOMY.flatMap((t) => [
  { text: norm(t.label), category: t.label, sub: t.subs.length === 1 ? t.subs[0] : null },
  ...t.subs.map((s) => ({ text: norm(`${t.label} ${s}`), category: t.label, sub: s })),
]).concat([
  { text: "ojo", category: "OJO Snags", sub: null },
  { text: "fat", category: "Internal Audit (FAT)", sub: null },
  { text: "internal audit", category: "Internal Audit (FAT)", sub: null },
  { text: "closure", category: "Closure Call", sub: "Installation" },
]);

export const parseTaxonomy = (v) => {
  const s = norm(v);
  if (!s) return null;
  const cat = taxonomyIndex.filter((t) => s === t.text || s.includes(t.text)).sort((a, b) => b.text.length - a.text.length)[0];
  if (!cat) return undefined;
  const def = TAXONOMY.find((t) => t.label === cat.category);
  const sub = def.subs.find((x) => s.includes(norm(x))) || cat.sub || (def.subs.length ? undefined : null);
  return sub === undefined ? { ...cat, sub: null, missingSub: true } : { category: cat.category, sub };
};

// Cells that mean "no value" in the source workbooks (e.g. TCRM uses N/A for a missing PIS date)
const PLACEHOLDERS = ["n/a", "na", "-", "--", "—", "null", "none", "tbd", "#n/a"];

// Words used instead of a date when it hasn't happened yet (e.g. a PIS date of "Pending")
const DATE_PLACEHOLDERS = ["pending", "not yet", "unknown", "tba"];

/** Convert one cell to a field value. Returns { value } or { error }. */
export const convert = (field, raw) => {
  const empty = raw === "" || raw === null || raw === undefined || (typeof raw === "string" && (!raw.trim() || PLACEHOLDERS.includes(raw.trim().toLowerCase())));
  if (empty) return { value: undefined };
  switch (field.type) {
    case "number": {
      const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[,\s]/g, ""));
      return Number.isFinite(n) ? { value: n } : { error: `"${raw}" is not a number` };
    }
    case "date": {
      if (typeof raw === "string" && DATE_PLACEHOLDERS.includes(raw.trim().toLowerCase())) return { value: undefined };
      const d = parseDate(raw);
      return d === undefined ? { error: `"${raw}" is not a recognised date` } : { value: d ? d.toISOString() : undefined };
    }
    case "enum": {
      const hit = field.options.find((o) => norm(o) === norm(raw));
      return hit ? { value: hit } : { error: `"${raw}" is not one of ${field.options.join(", ")}` };
    }
    case "yesno": {
      const n = norm(raw);
      if (YES.includes(n)) return { value: "yes" };
      if (NO.includes(n)) return { value: "no" };
      return { error: `"${raw}" is not yes / no` };
    }
    case "list":
      // Commas only separate values for multi-value tags (quiz options may contain commas).
      return { value: String(raw).split(field.splitComma ? /\s*[|;\n,]\s*/ : /\s*[|;\n]\s*/).map((x) => x.trim()).filter(Boolean) };
    case "taxonomy": {
      const t = parseTaxonomy(raw);
      if (!t) return { error: `"${raw}" doesn't match a tracker category` };
      if (t.missingSub) return { error: `"${raw}" needs a sub-category for ${t.category}` };
      return { value: { category: t.category, sub: t.sub } };
    }
    default:
      return { value: typeof raw === "number" ? String(raw) : String(raw).trim() };
  }
};

/**
 * Build records from a sheet.
 * mapping: array (per column) of field key | null; defaults: { fieldKey: rawValue }
 * Returns { records, problems } where problems = [{ row, field, message }].
 */
export const buildRecords = (rows, headerIdx, mapping, fields, defaults = {}) => {
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
  const records = [];
  const problems = [];
  rows.slice(headerIdx + 1).forEach((row, i) => {
    if (!row.some((c) => c !== "" && c !== null)) return;
    const rowNo = headerIdx + i + 2; // spreadsheet row number
    const rec = { __row: rowNo };
    mapping.forEach((key, col) => {
      if (!key) return;
      const out = convert(byKey[key], row[col]);
      if (out.error) problems.push({ row: rowNo, field: byKey[key].label, message: out.error });
      else if (out.value !== undefined) rec[key] = out.value;
    });
    Object.entries(defaults).forEach(([key, raw]) => {
      if (rec[key] !== undefined || raw === "" || raw === undefined) return;
      const out = convert(byKey[key], raw);
      if (!out.error && out.value !== undefined) rec[key] = out.value;
    });
    fields.filter((f) => f.required && rec[f.key] === undefined).forEach((f) => problems.push({ row: rowNo, field: f.label, message: "Required value missing" }));
    records.push(rec);
  });
  return { records, problems };
};

/** Shape a record into the API body expected by the entity's controller. */
export const toApiRow = (entity, rec, ctx = {}) => {
  const r = { ...rec };
  if (r.taxonomy) {
    r.issueCategory = r.taxonomy.category;
    r.issueSubCategory = r.taxonomy.sub || null;
    delete r.taxonomy;
  }
  if (entity === "snags") {
    if (r.issueCategories) r.issues = r.issueCategories.map((c) => ({ category: c }));
    delete r.issueCategories;
    if (r.solved === undefined) r.solved = "no";
  }
  if (entity === "tasks" && r.teamName && ctx.teams) {
    const t = ctx.teams.find((x) => norm(x.teamName) === norm(r.teamName));
    if (t) {
      r.teamId = t._id;
      if (!r.teamCompany) r.teamCompany = t.teamCompany;
    }
  }
  if (entity === "fieldTeams" && !r.teamName) r.teamName = [r.firstName, r.secondName, r.thirdName, r.surname].filter(Boolean).join(" ");
  if (entity === "quiz" && !r.type) r.type = "options";
  return r;
};

// ---------------------------------------------------------------- writing
const styleHeader = (ws, width) => {
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell) cell.s = { font: { bold: true, color: { rgb: "131316" } }, fill: { fgColor: { rgb: "F3F0FF" } }, border: { bottom: { style: "thin", color: { rgb: "D4D4D8" } } } };
    for (let r = 1; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === "d") cell.z = "dd-mmm-yyyy";
    }
  }
  ws["!cols"] = width;
  ws["!autofilter"] = { ref: ws["!ref"] };
  ws["!views"] = [{ state: "frozen", ySplit: 1 }];
};

const safeSheetName = (s, used) => {
  let base = String(s || "Sheet").replace(/[\\/?*[\]:]/g, " ").slice(0, 28).trim() || "Sheet";
  let name = base, n = 2;
  while (used.has(name)) name = `${base.slice(0, 25)} ${n++}`;
  used.add(name);
  return name;
};

/** sheets: [{ name, header: [..], rows: [[..]] }] → downloads a styled workbook */
export const downloadWorkbook = (sheets, filename, format = "xlsx") => {
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "csv") {
    const s = sheets[0];
    const ws = XLSX.utils.aoa_to_sheet([s.header, ...s.rows], { cellDates: true });
    const blob = new Blob(["﻿" + XLSX.utils.sheet_to_csv(ws, { dateNF: "yyyy-mm-dd" })], { type: "text/csv;charset=utf-8" });
    return saveBlob(blob, `${filename}-${stamp}.csv`);
  }
  if (format === "json") {
    const obj = Object.fromEntries(sheets.map((s) => [s.name, s.rows.map((r) => Object.fromEntries(s.header.map((h, i) => [h, r[i] instanceof Date ? r[i].toISOString() : r[i]])))]));
    return saveBlob(new Blob([JSON.stringify(sheets.length === 1 ? Object.values(obj)[0] : obj, null, 2)], { type: "application/json" }), `${filename}-${stamp}.json`);
  }
  const wb = XLSX.utils.book_new();
  const used = new Set();
  sheets.forEach((s) => {
    const ws = XLSX.utils.aoa_to_sheet([s.header, ...s.rows], { cellDates: true });
    styleHeader(ws, s.header.map((h, i) => ({ wch: Math.min(48, Math.max(String(h).length + 2, ...s.rows.slice(0, 300).map((r) => String(r[i] instanceof Date ? "00-Mmm-0000" : r[i] ?? "").length + 1))) })));
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(s.name, used));
  });
  XLSX.writeFile(wb, `${filename}-${stamp}.xlsx`);
};

const saveBlob = (blob, name) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};
