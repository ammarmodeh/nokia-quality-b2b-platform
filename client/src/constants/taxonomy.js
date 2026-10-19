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
