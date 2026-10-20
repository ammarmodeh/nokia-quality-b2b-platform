// Unified issue taxonomy: Category → Sub-category (sub-category optional).
// This typed constant is the seed / fallback; Dropdown Management becomes the
// runtime source of truth once the taxonomy lists are seeded (Phase 2).
export const TAXONOMY = [
  { key: "closure-call", label: "Closure Call", color: "#2563EB", subs: ["Installation"] },
  { key: "tcrm", label: "TCRM", color: "#0891B2", subs: [] },
  { key: "trc", label: "TRC", color: "#7C3AED", subs: [] },
  { key: "ojo-snags", label: "OJO Snags", color: "#EA580C", subs: ["Installation", "Maintenance"] },
  { key: "internal-audit-fat", label: "Internal Audit (FAT)", color: "#DB2777", subs: [] },
  { key: "dvoc", label: "DVOC", color: "#16A34A", subs: ["Installation", "Maintenance"] },
];

export const BUILT_IN_COUNT = TAXONOMY.length;
export const taxonomyByLabel = Object.fromEntries(TAXONOMY.map((c) => [c.label, c]));

// ---- Trackers added online ---------------------------------------------------
// They join TAXONOMY / taxonomyByLabel in place, so every existing import sees them.
// Components that list trackers re-render through useTrackers().
let trackerVersion = 0;
const listeners = new Set();
export const registerTrackers = (list = []) => {
  TAXONOMY.splice(BUILT_IN_COUNT, TAXONOMY.length);
  for (const k of Object.keys(taxonomyByLabel)) if (!TAXONOMY.some((t) => t.label === k)) delete taxonomyByLabel[k];
  for (const t of list) {
    if (taxonomyByLabel[t.name]) continue;
    const entry = { key: t.key, label: t.name, color: t.color || "#475569", subs: t.subs || [], custom: true, id: t._id, description: t.description, path: `/trackers/${t.key}` };
    TAXONOMY.push(entry);
    taxonomyByLabel[t.name] = entry;
  }
  trackerVersion++;
  listeners.forEach((fn) => fn(trackerVersion));
};
export const onTrackersChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const customTrackers = () => TAXONOMY.slice(BUILT_IN_COUNT);

const BUILT_IN_PATHS = { "Closure Call": "/closure-call", "OJO Snags": "/ojo-snags", DVOC: "/dvoc", TCRM: "/tcrm", TRC: "/trc", "Internal Audit (FAT)": "/internal-audit" };
/** Workspace page of a tracker (built-in or added online). */
export const trackerPath = (category) => BUILT_IN_PATHS[category] || taxonomyByLabel[category]?.path || "/dashboard";

export const taxonomyLabel = (category, subCategory) =>
  [category, subCategory].filter(Boolean).join(" · ");

export const isValidTaxonomy = (category, subCategory) => {
  const c = taxonomyByLabel[category];
  if (!c) return false;
  if (!c.subs.length) return !subCategory;
  return c.subs.includes(subCategory);
};

// NPS survey tasks (the Tasks / tasks-list records) are the DVOC · Installation tracker.
export const TASK_TAXONOMY = { category: "DVOC", subCategory: "Installation" };

// ---- Record classification ------------------------------------------------
// Records carry issueCategory / issueSubCategory once the backfill has run;
// until then (or for older clients' writes) the same rules as the backend
// migration (backend/utils/taxonomy.js) are applied on read.
const withMeta = (category, subCategory) => {
  const t = taxonomyByLabel[category];
  return { category, subCategory: subCategory || null, color: t?.color, label: taxonomyLabel(category, subCategory) };
};

export const taxonomyOfTask = (task = {}) =>
  task.issueCategory ? withMeta(task.issueCategory, task.issueSubCategory) : withMeta(TASK_TAXONOMY.category, TASK_TAXONOMY.subCategory);

export const taxonomyOfIssue = (s = {}) => {
  if (s.issueCategory) return withMeta(s.issueCategory, s.issueSubCategory);
  const sub = (s.fromSub || s.from || "").trim();
  if (sub === "TCRM") return withMeta("TCRM");
  if (sub === "TRC") return withMeta("TRC");
  if (sub === "FAT Audit") return withMeta("Internal Audit (FAT)");
  return withMeta("OJO Snags", s.snagType === "Maintenance" ? "Maintenance" : "Installation");
};
