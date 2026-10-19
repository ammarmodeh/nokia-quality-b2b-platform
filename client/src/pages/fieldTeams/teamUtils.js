// Same precedence as the existing status stats on the Field Teams page.
export const teamStatusOf = (t) => {
  if (t.isTerminated) return { label: "Terminated", tone: "danger" };
  if (t.isResigned) return { label: "Resigned", tone: "neutral" };
  if (t.isSuspended) return { label: "Suspended", tone: "warning" };
  if (t.isOnLeave) return { label: "On leave", tone: "info" };
  if (t.isActive === false) return { label: "Inactive", tone: "neutral" };
  return { label: "Active", tone: "success" };
};

export const TEAM_STATUSES = ["Active", "On leave", "Suspended", "Resigned", "Terminated", "Inactive"];

export const latestEval = (t) => t.evaluationHistory?.[0] || null;

export const evalTone = (pct) => (pct >= 90 ? "success" : pct >= 70 ? "warning" : "danger");

// Escalation levels come from getEscalationConsequence on the page (0–6).
export const escalationTone = (level) => (level <= 0 ? "success" : level === 1 ? "warning" : level === 2 ? "warning" : "danger");

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—");
