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

export const taxonomyByLabel = Object.fromEntries(TAXONOMY.map((c) => [c.label, c]));

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
