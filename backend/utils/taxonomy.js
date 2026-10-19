// Unified issue taxonomy: Category → Sub-category (sub-category only where defined).
// Shared by controllers (validation / defaults) and the backfill migration.
export const TAXONOMY = [
  { category: "Closure Call", subs: ["Installation"] },
  { category: "TCRM", subs: [] },
  { category: "TRC", subs: [] },
  { category: "OJO Snags", subs: ["Installation", "Maintenance"] },
  { category: "Internal Audit (FAT)", subs: [] },
  { category: "DVOC", subs: ["Installation", "Maintenance"] },
];

const byName = Object.fromEntries(TAXONOMY.map((t) => [t.category, t]));

/** Returns an error message, or null when the pair is valid. */
export const validateTaxonomy = (category, subCategory) => {
  const t = byName[category];
  if (!t) return `Unknown issue category "${category}". Allowed: ${TAXONOMY.map((x) => x.category).join(", ")}`;
  if (!t.subs.length) return subCategory ? `"${category}" has no sub-categories` : null;
  if (!subCategory) return `"${category}" needs a sub-category (${t.subs.join(" or ")})`;
  return t.subs.includes(subCategory) ? null : `"${subCategory}" is not a sub-category of "${category}" (${t.subs.join(" or ")})`;
};

// ---- Mapping rules (approved 2026-10-19) ---------------------------------
// Tasks are the NPS survey cases = the DVOC · Installation tracker.
export const taxonomyForTask = (task = {}) => {
  const legacy = (task.category || "").trim();
  if (!legacy || legacy === "DVOC - FTTH Installations") return { issueCategory: "DVOC", issueSubCategory: "Installation" };
  return null; // anything else is left for manual review
};

// Customer issues (OJO snags) are classified by their source.
export const taxonomyForIssue = (issue = {}) => {
  const main = (issue.fromMain || "").trim();
  const sub = (issue.fromSub || issue.from || "").trim();
  if (sub === "TCRM") return { issueCategory: "TCRM", issueSubCategory: null };
  if (sub === "TRC") return { issueCategory: "TRC", issueSubCategory: null };
  if (sub === "FAT Audit") return { issueCategory: "Internal Audit (FAT)", issueSubCategory: null };
  if (main === "Snags" || sub === "Joint Quality" || (!main && !sub)) {
    return { issueCategory: "OJO Snags", issueSubCategory: issue.snagType === "Maintenance" ? "Maintenance" : "Installation" };
  }
  return null;
};

/**
 * Normalise taxonomy fields on a create/update body.
 * - explicit issueCategory/issueSubCategory are validated
 * - on create (or when the source fields change) missing values are derived
 * Returns { error } or { body }.
 */
export const applyTaxonomy = (body, kind, { derive = true } = {}) => {
  const out = { ...body };
  if (out.issueSubCategory === "") out.issueSubCategory = null;
  const explicit = out.issueCategory !== undefined && out.issueCategory !== null && out.issueCategory !== "";
  if (explicit) {
    const err = validateTaxonomy(out.issueCategory, out.issueSubCategory || null);
    if (err) return { error: err };
    if (!byName[out.issueCategory].subs.length) out.issueSubCategory = null;
    return { body: out };
  }
  if (!derive) return { body: out };
  const derived = kind === "task" ? taxonomyForTask(out) : taxonomyForIssue(out);
  if (derived) Object.assign(out, derived);
  return { body: out };
};
