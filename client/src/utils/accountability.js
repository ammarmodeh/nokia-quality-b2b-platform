// Team accountability on DVOC tasks (NPS survey cases).
// Each RCA row records whether the field team is accountable ("Yes" / "No");
// a ticket counts against the team when any of its rows says "Yes".
// Older records store a single string instead of an array.

const values = (t) => {
  const v = t?.teamAccountability;
  if (Array.isArray(v)) return v;
  return v ? [v] : [];
};

export const isTeamAccountable = (t) => values(t).some((x) => String(x).trim().toLowerCase() === "yes");

/** "accountable" | "not" | "unset" */
export const accountabilityOf = (t) => (isTeamAccountable(t) ? "accountable" : values(t).length ? "not" : "unset");

export const ACCOUNTABILITY_OPTIONS = [
  { value: "accountable", label: "Team accountable" },
  { value: "not", label: "Not accountable" },
  { value: "unset", label: "Not set" },
];

export const ACCOUNTABILITY_LABEL = Object.fromEntries(ACCOUNTABILITY_OPTIONS.map((o) => [o.value, o.label]));

/** Keep tasks whose accountability is one of `selected` (empty = keep all). */
export const filterByAccountability = (tasks, selected = []) => (selected.length ? tasks.filter((t) => selected.includes(accountabilityOf(t))) : tasks);
