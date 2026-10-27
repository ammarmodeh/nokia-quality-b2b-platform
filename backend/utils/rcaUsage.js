// How often each root-cause-analysis value is used on tasks, to fill Dropdown Management from real data.
// RCA rows are stored index-aligned on a task: responsible[i], reason[i], subReason[i], rootCause[i].

// Dropdown list → task field, and the list its parent comes from (matches Dropdown Management's PARENTS).
export const RCA_LISTS = {
  RESPONSIBILITY: { field: "responsible", parent: null },
  REASON: { field: "reason", parent: "RESPONSIBILITY" },
  REASON_SUB: { field: "subReason", parent: "REASON" },
  ROOT_CAUSE: { field: "rootCause", parent: "REASON_SUB" },
};

const EMPTY = new Set(["", "not specified", "n/a", "na", "none", "null", "undefined", "-", "—", "empty", "nil"]);
const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const keyOf = (v) => clean(v).toLowerCase();
const arr = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]);
const isEmpty = (v) => EMPTY.has(keyOf(v));

/**
 * @param tasks    tasks with RCA fields
 * @param category one of RCA_LISTS
 * @param existing current option values of that list (to mark what's already there)
 * @returns [{ value, count, parentValue, parentShare, exists, variants }] most used first.
 *   value: the most common spelling of the case/space-insensitive group
 *   parentValue: the parent-list value it appears with most often in the same RCA row
 */
export const rcaUsage = (tasks, category, existing = []) => {
  const spec = RCA_LISTS[category];
  if (!spec) throw new Error(`Not an RCA list: ${category}`);
  const parentField = spec.parent ? RCA_LISTS[spec.parent].field : null;
  const have = new Set(existing.map(keyOf));
  const groups = new Map(); // key → { count, spellings: Map, parents: Map }

  for (const t of tasks) {
    const values = arr(t[spec.field]);
    const parents = parentField ? arr(t[parentField]) : [];
    values.forEach((raw, i) => {
      if (isEmpty(raw)) return;
      const k = keyOf(raw);
      if (!groups.has(k)) groups.set(k, { count: 0, spellings: new Map(), parents: new Map() });
      const g = groups.get(k);
      g.count++;
      g.spellings.set(clean(raw), (g.spellings.get(clean(raw)) || 0) + 1);
      // Same RCA row's parent; single legacy values apply to every row.
      const p = parents.length === values.length ? parents[i] : parents.length === 1 ? parents[0] : null;
      if (p != null && !isEmpty(p)) g.parents.set(clean(p), (g.parents.get(clean(p)) || 0) + 1);
    });
  }

  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  return [...groups.entries()]
    .map(([k, g]) => {
      const [value] = top(g.spellings);
      const parent = g.parents.size ? top(g.parents) : null;
      return {
        value,
        count: g.count,
        parentValue: parent ? parent[0] : null,
        parentShare: parent ? Math.round((parent[1] / g.count) * 100) : null,
        exists: have.has(k),
        variants: g.spellings.size > 1 ? [...g.spellings.keys()] : [],
      };
    })
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
};
