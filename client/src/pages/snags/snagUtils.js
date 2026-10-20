import { taxonomyOfIssue } from "../../constants/taxonomy";
import { endOfDay, isWithinInterval, startOfDay, startOfMonth, startOfWeek, subDays } from "date-fns";

// Sub-category within OJO Snags (Installation / Maintenance), from the taxonomy.
export const snagTypeOf = (s) => taxonomyOfIssue(s).subCategory || "Installation";
export const isOjoSnag = (s) => taxonomyOfIssue(s).category === "OJO Snags";

// TCRM / TRC / FAT records belong to their own trackers; the Source filter can still show them.
export const NON_OJO_SOURCES = ["TCRM", "TRC", "FAT Audit"];
export const sourceOf = (s) => s.fromSub || s.from || "Not specified";

export const statusOf = (s) => (s.solved === "yes" ? { label: "Resolved", tone: "success" } : s.dispatched === "yes" ? { label: "Dispatched", tone: "info" } : { label: "Open", tone: "warning" });

export const reportedDate = (s) => s.date || s.pisDate || s.createdAt;

export const categoriesOf = (s) => [...new Set((s.issues || []).map((i) => i?.category).filter(Boolean))];

export const DATE_RANGES = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];
const rangeFor = (key) => {
  const now = new Date();
  if (key === "week") return { start: startOfWeek(now), end: endOfDay(now) };
  if (key === "month") return { start: startOfMonth(now), end: endOfDay(now) };
  if (key === "30d") return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
  if (key === "90d") return { start: startOfDay(subDays(now, 90)), end: endOfDay(now) };
  return null;
};

export const filterSnags = (list, f) => {
  const q = (f.q || "").trim().toLowerCase();
  const range = rangeFor(f.range);
  return list.filter((s) => {
    if (f.tab !== "all" && snagTypeOf(s) !== f.tab) return false;
    if (q) {
      const hay = [s.slid, s.ticketId, s.customerName, s.customerContact, s.teamName, s.teamCode, s.reporter, s.area, ...(s.issues || []).flatMap((i) => [i?.category, i?.subCategory])]
        .filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.source.length ? !f.source.includes(sourceOf(s)) : taxonomyOfIssue(s).category !== (f.tracker || "OJO Snags")) return false;
    if (f.status.length && !f.status.includes(statusOf(s).label)) return false;
    if (f.category.length && !categoriesOf(s).some((c) => f.category.includes(c))) return false;
    if (f.team.length && !f.team.includes(s.teamName || "")) return false;
    if (range) {
      const d = reportedDate(s);
      if (!d || !isWithinInterval(new Date(d), range)) return false;
    }
    return true;
  });
};

export const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—");
