import { addDays, endOfDay, endOfMonth, format, startOfDay, startOfMonth, startOfYear, subMonths } from "date-fns";
import { aggregateSamples, filterTasksByDateRange, filterTasksByMonth, filterTasksByWeek } from "../../utils/dateFilterHelpers";
import { getCustomWeekNumber, getCustomWeekRange } from "../../utils/helpers";

// Same NPS maths as NPSSummaryCard: tasks give detractor/neutral counts,
// samples-token gives the survey total; promoters are the remainder.
export const npsFromCounts = (totalSamples, detractors, neutrals) => {
  const promoters = Math.max(0, totalSamples - (detractors + neutrals));
  const pct = (n) => (totalSamples > 0 ? Math.round((n / totalSamples) * 100) : 0);
  const promotersPercent = pct(promoters);
  const detractorsPercent = pct(detractors);
  const neutralsPercent = pct(neutrals);
  return {
    totalSamples, promoters, neutrals, detractors,
    promotersPercent, neutralsPercent, detractorsPercent,
    nps: promotersPercent - detractorsPercent,
    hasSamples: totalSamples > 0,
  };
};

const isDetractor = (t) => t.evaluationScore >= 1 && t.evaluationScore <= 6;
const isNeutral = (t) => t.evaluationScore >= 7 && t.evaluationScore <= 8;

// ---- Period descriptors -------------------------------------------------
// kind: week | month | months (several calendar months) | range
const weekPeriod = (date, settings) => {
  const { start, end } = getCustomWeekRange(date, settings);
  const year = start.getFullYear();
  const weekNumber = getCustomWeekNumber(start, year, settings);
  return { kind: "week", year, weekNumber, start, end, label: `Week ${weekNumber}`, sub: `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}` };
};
const monthPeriod = (date) => {
  const start = startOfMonth(date);
  return { kind: "month", year: start.getFullYear(), month: start.getMonth() + 1, start, end: endOfMonth(start), label: format(start, "MMMM yyyy"), sub: format(start, "MMM yyyy") };
};
const monthsPeriod = (start, count, label) => {
  const months = Array.from({ length: count }, (_, i) => monthPeriod(subMonths(start, -i)));
  return { kind: "months", months, start: months[0].start, end: months[months.length - 1].end, label, sub: `${format(months[0].start, "MMM")} – ${format(months[months.length - 1].end, "MMM yyyy")}` };
};
const quarterOf = (date) => {
  const q = Math.floor(date.getMonth() / 3);
  return monthsPeriod(new Date(date.getFullYear(), q * 3, 1), 3, `Q${q + 1} ${date.getFullYear()}`);
};

export const PERIODS = [
  { value: "week", label: "This week" },
  { value: "lastWeek", label: "Last week" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "quarter", label: "This quarter" },
  { value: "ytd", label: "Year to date" },
  { value: "custom", label: "Custom range" },
];

/** Returns { current, previous } period descriptors. */
export const resolvePeriod = (key, settings = {}, custom = {}, now = new Date()) => {
  switch (key) {
    case "lastWeek": {
      const cur = weekPeriod(addDays(weekPeriod(now, settings).start, -1), settings);
      return { current: cur, previous: weekPeriod(addDays(cur.start, -1), settings) };
    }
    case "month": return { current: monthPeriod(now), previous: monthPeriod(subMonths(now, 1)) };
    case "lastMonth": return { current: monthPeriod(subMonths(now, 1)), previous: monthPeriod(subMonths(now, 2)) };
    case "quarter": {
      const cur = quarterOf(now);
      return { current: cur, previous: quarterOf(subMonths(cur.start, 1)) };
    }
    case "ytd": {
      const months = now.getMonth() + 1;
      const cur = monthsPeriod(startOfYear(now), months, `${now.getFullYear()} year to date`);
      const prevStart = startOfYear(new Date(now.getFullYear() - 1, 0, 1));
      return { current: cur, previous: monthsPeriod(prevStart, months, `${now.getFullYear() - 1} same period`) };
    }
    case "custom": {
      if (!custom.from || !custom.to) return resolvePeriod("month", settings, {}, now);
      const start = startOfDay(new Date(custom.from));
      const end = endOfDay(new Date(custom.to));
      const len = end - start;
      const pEnd = new Date(start.getTime() - 1);
      const pStart = new Date(pEnd.getTime() - len);
      const mk = (s, e) => ({ kind: "range", start: s, end: e, label: `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`, sub: "Custom range" });
      return { current: mk(start, end), previous: mk(startOfDay(pStart), endOfDay(pEnd)) };
    }
    case "week":
    default: {
      const cur = weekPeriod(now, settings);
      return { current: cur, previous: weekPeriod(addDays(cur.start, -1), settings) };
    }
  }
};

export const tasksInPeriod = (tasks, p, settings = {}) => {
  if (p.kind === "week") return filterTasksByWeek(tasks, p.year, p.weekNumber, settings);
  if (p.kind === "month") return filterTasksByMonth(tasks, p.year, p.month, settings);
  if (p.kind === "months") return p.months.flatMap((m) => filterTasksByMonth(tasks, m.year, m.month, settings));
  return filterTasksByDateRange(tasks, p.start, p.end);
};

export const samplesInPeriod = (samplesData, p, settings = {}) => {
  if (p.kind === "week") return aggregateSamples(samplesData, "week", { weekNumber: p.weekNumber, startDate: p.start, year: p.year }, settings);
  if (p.kind === "month") return aggregateSamples(samplesData, "month", { month: p.month, year: p.year }, settings);
  if (p.kind === "months") return p.months.reduce((n, m) => n + aggregateSamples(samplesData, "month", { month: m.month, year: m.year }, settings), 0);
  return aggregateSamples(samplesData, "range", { start: p.start, end: p.end }, settings);
};

export const computePeriodNps = (tasks, samplesData, p, settings = {}) => {
  const list = tasksInPeriod(tasks, p, settings);
  const det = list.filter(isDetractor);
  const neu = list.filter(isNeutral);
  return { ...npsFromCounts(samplesInPeriod(samplesData, p, settings), det.length, neu.length), tasks: list, detractorTasks: det, neutralTasks: neu };
};

// ---- Trend buckets ------------------------------------------------------
export const TREND_GRAINS = [
  { value: "week", label: "Weekly", count: 12 },
  { value: "month", label: "Monthly", count: 12 },
  { value: "quarter", label: "Quarterly", count: 6 },
];

export const trendBuckets = (grain, settings = {}, now = new Date()) => {
  const g = TREND_GRAINS.find((x) => x.value === grain) || TREND_GRAINS[0];
  const out = [];
  if (g.value === "week") {
    let p = weekPeriod(now, settings);
    for (let i = 0; i < g.count; i++) {
      out.unshift({ ...p, short: `W${p.weekNumber}` });
      p = weekPeriod(addDays(p.start, -1), settings);
    }
  } else if (g.value === "month") {
    for (let i = g.count - 1; i >= 0; i--) {
      const p = monthPeriod(subMonths(now, i));
      out.push({ ...p, short: format(p.start, "MMM yy") });
    }
  } else {
    let p = quarterOf(now);
    for (let i = 0; i < g.count; i++) {
      out.unshift({ ...p, short: p.label });
      p = quarterOf(subMonths(p.start, 1));
    }
  }
  return out;
};

export const yearsNeeded = (now = new Date()) => [now.getFullYear() - 1, now.getFullYear()];
