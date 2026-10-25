import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, isWithinInterval } from "date-fns";
import { accountabilityOf } from "../../utils/accountability";

// Columns follow the existing Task.status enum — no new statuses.
export const STATUSES = [
  { value: "Todo", label: "Todo", tone: "neutral", color: "#9394A1" },
  { value: "In Progress", label: "In Progress", tone: "info", color: "#2563EB" },
  { value: "Closed", label: "Closed", tone: "success", color: "#16A34A" },
  { value: "Completed", label: "Completed", tone: "accent", color: "#6C47FF" },
];
export const statusMeta = (v) => STATUSES.find((s) => s.value === v) || STATUSES[0];

export const PRIORITIES = [
  { value: "High", tone: "danger", color: "#DC2626", rank: 0 },
  { value: "Medium", tone: "warning", color: "#D97706", rank: 1 },
  { value: "Normal", tone: "info", color: "#2563EB", rank: 2 },
  { value: "Low", tone: "neutral", color: "#9394A1", rank: 3 },
  { value: "Not specified", tone: "neutral", color: "#D4D4D8", rank: 4 },
];
export const priorityMeta = (v) => PRIORITIES.find((p) => p.value === v) || PRIORITIES[4];

// Same thresholds the dashboards use: 1–6 detractor, 7–8 neutral, 9–10 promoter.
export const npsType = (score) => {
  const n = Number(score);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n <= 6) return { label: "Detractor", tone: "danger" };
  if (n <= 8) return { label: "Neutral", tone: "warning" };
  return { label: "Promoter", tone: "success" };
};

export const taskDate = (t) => t.interviewDate || t.pisDate || t.createdAt;

export const DATE_RANGES = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const rangeFor = (key) => {
  const now = new Date();
  switch (key) {
    case "week": return { start: startOfWeek(now), end: endOfWeek(now) };
    case "month": return { start: startOfMonth(now), end: endOfMonth(now) };
    case "30d": return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    case "90d": return { start: startOfDay(subDays(now, 90)), end: endOfDay(now) };
    default: return null;
  }
};

const idOf = (u) => (u && typeof u === "object" ? u._id : u);

export const filterTasks = (tasks, f, me) => {
  const q = (f.q || "").trim().toLowerCase();
  const range = f.from && f.to ? { start: startOfDay(new Date(f.from)), end: endOfDay(new Date(f.to)) } : rangeFor(f.range);
  return tasks.filter((t) => {
    if (q) {
      const hay = [t.slid, t.customerName, t.requestNumber, t.teamName, t.contactNumber, t.governorate]
        .filter((x) => x !== null && x !== undefined)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.mine && !(t.assignedTo || []).some((u) => idOf(u) === me)) return false;
    if (f.status?.length && !f.status.includes(t.status)) return false;
    if (f.priority?.length && !f.priority.includes(t.priority || "Not specified")) return false;
    if (f.assignee?.length && !(t.assignedTo || []).some((u) => f.assignee.includes(idOf(u)))) return false;
    if (f.team?.length && !f.team.includes(t.teamName || "")) return false;
    if (f.acc?.length && !f.acc.includes(accountabilityOf(t))) return false;
    if (f.type?.length) {
      const nt = npsType(t.evaluationScore)?.label;
      if (!f.type.includes(nt)) return false;
    }
    if (range) {
      const d = taskDate(t);
      if (!d || !isWithinInterval(new Date(d), range)) return false;
    }
    return true;
  });
};

// Board order: explicit boardOrder first, then newest first.
export const boardSort = (a, b) => {
  const ao = a.boardOrder ?? null;
  const bo = b.boardOrder ?? null;
  if (ao !== null && bo !== null) return ao - bo;
  if (ao !== null) return -1;
  if (bo !== null) return 1;
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
};

export const GROUP_BY = [
  { value: "none", label: "No grouping" },
  { value: "assignee", label: "Assignee" },
  { value: "team", label: "Field team" },
  { value: "priority", label: "Priority" },
];

export const groupKeyFor = (t, by) => {
  if (by === "assignee") {
    const first = (t.assignedTo || [])[0];
    return first ? { key: idOf(first), label: first.name || "Assigned" } : { key: "_none", label: "Unassigned" };
  }
  if (by === "team") return t.teamName ? { key: t.teamName, label: t.teamName } : { key: "_none", label: "No team" };
  if (by === "priority") {
    const p = t.priority || "Not specified";
    return { key: p, label: p, rank: priorityMeta(p).rank };
  }
  return { key: "all", label: "All" };
};

export const taskTitle = (t) => t.customerName || `Request ${t.requestNumber ?? ""}`.trim();

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—");
