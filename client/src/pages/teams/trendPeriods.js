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
 * Every calendar month [start, end] touches, with the share of its days inside the period:
 * [{ key: "2026-10", year, month, days, daysInMonth, weight }]. Monthly team samples and online
 * volumes are pro-rated by `weight` (approved 2026-10-27); whole months have weight 1.
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

/** Query params for /team-trends from a resolved period descriptor. */
export const trendQuery = (p, metric) => ({
  from: p.start.toISOString(),
  to: endOfDay(p.end).toISOString(),
  months: monthShares(p.start, p.end)
    .map((m) => (m.weight === 1 ? m.key : `${m.key}:${m.weight.toFixed(4)}`))
    .join(","),
  metric,
});

export const TREND_METRICS = [
  { value: "perSample", label: "Per survey sample", field: "perSamplePct", rate: true, format: (v) => `${v}%`, description: "Accountable DVOC ÷ (team survey samples − non-accountable DVOC)" },
  { value: "perOnline", label: "Per online", field: "perOnlinePct", rate: true, format: (v) => `${v}%`, description: "Accountable DVOC ÷ team online transactions" },
  { value: "reach", label: "REACH ownership", field: "reachAccountable", rate: false, format: (v) => v.toLocaleString(), description: "Accountable DVOC where the responsible owner is REACH" },
  { value: "accountable", label: "Total accountable", field: "accountable", rate: false, format: (v) => v.toLocaleString(), description: "All accountable DVOC in the period" },
];

/** Rates need whole months; otherwise rank by the total accountable count instead. */
export const effectiveMetric = (metric, months) => {
  const m = TREND_METRICS.find((x) => x.value === metric) || TREND_METRICS[0];
  return m.rate && !months.length ? TREND_METRICS.find((x) => x.value === "accountable") : m;
};
