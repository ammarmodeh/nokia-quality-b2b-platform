import { addMonths, differenceInCalendarDays, endOfDay, endOfMonth, getDaysInMonth, isSameDay, max, min, startOfMonth } from "date-fns";

// Periods offered on Teams → Trends. Boundaries come from the dashboard's resolvePeriod, so
// "week" follows the configured week start / week 1 settings exactly as everywhere else.
export const TREND_PERIODS = [
  { value: "lastWeek", label: "Last week" },
  { value: "week", label: "Current week" },
  { value: "lastMonth", label: "Last month" },
  { value: "month", label: "Current month" },
  { value: "custom", label: "Custom period" },
];

/**
 * Whole calendar months that exactly tile [start, end] → ["2026-9", "2026-10"], else [].
 * Survey samples and online volumes are stored per team per month, so rates are only
 * meaningful for periods made of whole months.
 */
export const monthsCovered = (start, end) => {
  if (!start || !end || start > end) return [];
  if (!isSameDay(start, startOfMonth(start)) || !isSameDay(end, endOfMonth(end))) return [];
  const out = [];
  for (let m = startOfMonth(start); m <= end && out.length < 36; m = addMonths(m, 1)) out.push(`${m.getFullYear()}-${m.getMonth() + 1}`);
  return out;
};

/**
 * Every calendar month [start, end] touches, with how many of its days are inside the period:
 * [{ key: "2026-10", year, month, days, daysInMonth, weight }].
 */
export const monthShares = (start, end) => {
  if (!start || !end || start > end) return [];
  const out = [];
  for (let m = startOfMonth(start); m <= end && out.length < 36; m = addMonths(m, 1)) {
    const days = differenceInCalendarDays(min([end, endOfMonth(m)]), max([start, m])) + 1;
    const daysInMonth = getDaysInMonth(m);
    out.push({ key: `${m.getFullYear()}-${m.getMonth() + 1}`, year: m.getFullYear(), month: m.getMonth() + 1, days, daysInMonth, weight: Math.min(1, days / daysInMonth) });
  }
  return out;
};

/**
 * The months whose full team samples / online volumes a period uses (user rule, 2026-10-27: whole
 * numbers, never pro-rated). Team samples are entered per month, so:
 * - a month counts when the period covers at least half of it (whole months always do);
 * - if none does (a week, or a short range across two months), the month holding most of the
 *   period's days is used, so a week crossing a month boundary isn't counted twice.
 */
export const sampleMonths = (start, end) => {
  const shares = monthShares(start, end);
  const covered = shares.filter((m) => m.weight >= 0.5);
  if (covered.length || !shares.length) return covered;
  return [shares.reduce((best, m) => (m.days >= best.days ? m : best))];
};

/** Query params for /team-trends from a resolved period descriptor. */
export const trendQuery = (p, metric) => ({
  from: p.start.toISOString(),
  to: endOfDay(p.end).toISOString(),
  months: sampleMonths(p.start, p.end)
    .map((m) => m.key)
    .join(","),
  metric,
});

export const TREND_METRICS = [
  { value: "perSample", label: "Per survey sample", field: "perSamplePct", rate: true, format: (v) => `${v}%`, description: "Accountable DVOC ÷ (team survey samples − non-accountable DVOC)" },
  { value: "perOnline", label: "Per online", field: "perOnlinePct", rate: true, format: (v) => `${v}%`, description: "Accountable DVOC ÷ team online transactions" },
  { value: "reach", label: "REACH ownership", field: "reachOwned", rate: false, format: (v) => v.toLocaleString(), description: "RCA rows whose owner is REACH, accountable or not — same count as the dashboard's Top owners" },
  { value: "accountable", label: "Total accountable", field: "accountable", rate: false, format: (v) => v.toLocaleString(), description: "All accountable DVOC in the period" },
];

/** Rates need whole months; otherwise rank by the total accountable count instead. */
export const effectiveMetric = (metric, months) => {
  const m = TREND_METRICS.find((x) => x.value === metric) || TREND_METRICS[0];
  return m.rate && !months.length ? TREND_METRICS.find((x) => x.value === "accountable") : m;
};
