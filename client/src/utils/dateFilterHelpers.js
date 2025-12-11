/**
 * Date filtering and aggregation utilities for weekly and monthly summaries
 */
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { getCustomWeekNumber } from './helpers';

/**
 * Filter tasks by a specific week
 * @param {Array} tasks - Array of tasks
 * @param {number} year - The year
 * @param {number} weekNumber - The custom week number
 * @returns {Array} Filtered tasks
 */
export const filterTasksByWeek = (tasks, year, weekNumber) => {
  return tasks.filter(task => {
    if (!task.interviewDate) return false;
    const date = new Date(task.interviewDate);

    // Calculate the start of the week (Sunday) for this task
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const weekYear = weekStart.getFullYear();

    // We filter based on the year of the *week start* to be consistent
    if (weekYear !== year) return false;

    // Calculate week number based on the Sunday of the week
    return getCustomWeekNumber(weekStart, weekYear) === weekNumber;
  });
};

/**
 * Filter tasks by a specific month
 * @param {Array} tasks - Array of tasks
 * @param {number} year - The year
 * @param {number} month - The month (0-11)
 * @returns {Array} Filtered tasks
 */
// Custom 5-4-4 Week Pattern
// Jan: 5 weeks (52, 1, 2, 3, 4) - Wk 52 is from previous year
// Feb: 4 weeks (5, 6, 7, 8)
// Mar: 4 weeks (9, 10, 11, 12)
// Q2
// Apr: 5 weeks (13, 14, 15, 16, 17)
// May: 4 weeks (18, 19, 20, 21)
// Jun: 4 weeks (22, 23, 24, 25)
// Q3
// Jul: 5 weeks (26, 27, 28, 29, 30)
// Aug: 4 weeks (31, 32, 33, 34)
// Sep: 4 weeks (35, 36, 37, 38)
// Q4
// Oct: 5 weeks (39, 40, 41, 42, 43)
// Nov: 4 weeks (44, 45, 46, 47)
// Dec: 4 weeks (48, 49, 50, 51) + 53 if exists?
const CUSTOM_MONTH_WEEKS = [
  { month: 0, weeks: [52, 1, 2, 3, 4] },
  { month: 1, weeks: [5, 6, 7, 8] },
  { month: 2, weeks: [9, 10, 11, 12] },
  { month: 3, weeks: [13, 14, 15, 16, 17] },
  { month: 4, weeks: [18, 19, 20, 21] },
  { month: 5, weeks: [22, 23, 24, 25] },
  { month: 6, weeks: [26, 27, 28, 29, 30] },
  { month: 7, weeks: [31, 32, 33, 34] },
  { month: 8, weeks: [35, 36, 37, 38] },
  { month: 9, weeks: [39, 40, 41, 42, 43] },
  { month: 10, weeks: [44, 45, 46, 47] },
  { month: 11, weeks: [48, 49, 50, 51, 52] }, // Include 53 in Dec if it occurs
];

/**
 * Filter tasks by a specific custom month
 * @param {Array} tasks - Array of tasks
 * @param {number} year - The "Customer Year" (e.g. 2025 for Jan which might start in Dec 2024)
 * @param {number} month - The month index (0-11)
 * @returns {Array} Filtered tasks
 */
export const filterTasksByMonth = (tasks, year, month) => {
  const targetConfig = CUSTOM_MONTH_WEEKS.find(m => m.month === month);
  if (!targetConfig) return [];

  return tasks.filter(task => {
    if (!task.interviewDate) return false;
    const date = new Date(task.interviewDate);
    const start = startOfWeek(date, { weekStartsOn: 0 });
    const taskYear = start.getFullYear();
    const weekNumber = getCustomWeekNumber(start, taskYear);

    // Determine the "Custom Year" this task belongs to
    // If Week 52, it belongs to NEXT year's January
    // If Week 1-51, it belongs to THIS year (mostly)
    // Wait, if we say Jan 2025 includes Wk 52 of 2024...

    let customYear = taskYear;
    if (weekNumber === 52 && month === 0) {
      // Wk 52 belongs to Jan of NEXT year
      // So if taskYear is 2024, it belongs to 2025 Jan
      customYear = taskYear + 1;
    }

    if (customYear !== year) return false;
    return targetConfig.weeks.includes(weekNumber);
  });
};

/**
 * Helper to get the start and end date for a custom month
 */
const getCustomMonthDateRange = (year, monthIndex) => {
  const config = CUSTOM_MONTH_WEEKS.find(m => m.month === monthIndex);
  if (!config || !config.weeks.length) return null;

  // Logic to find dates:
  // We need to find the specific weeks for this year.
  // Case Jan (Month 0): Weeks 52 (Year-1), 1 (Year), 2 (Year), 3 (Year), 4 (Year)
  // Case others: Weeks X (Year) ...

  // We can iterate weeks.
  // Start Date = Start of first week
  // End Date = End of last week

  // To get date from week num:
  // There isn't a cheap "get date from custom week" without reverse engineering getCustomWeekNumber
  // But we can approximate using date-fns or moment if available.
  // Since we don't have a direct helper, we'll try to scan.
  // Actually, `getAvailableMonths` iterates tasks, so we can just grab min/max from actual data seen?
  // User requested "Month (Date Range)". If no data, maybe fine? 
  // BUT the label should ideally be theoretically correct even if gaps.
  // Let's rely on data min/max for specific label in `getAvailableMonths` for now as it's safer than complex date math blindly.
  return null;
};

/**
 * Filter tasks by a custom date range
 * @param {Array} tasks - Array of tasks
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {Array} Filtered tasks
 */
export const filterTasksByDateRange = (tasks, startDate, endDate) => {
  if (!startDate || !endDate) return tasks;

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return tasks.filter(task => {
    if (!task.interviewDate) return false;
    const taskDate = new Date(task.interviewDate);
    return taskDate >= start && taskDate <= end;
  });
};

/**
 * Get list of available weeks with data
 * @param {Array} tasks - Array of tasks
 * @returns {Array} Array of {year, week, label, start, end}
 */
export const getAvailableWeeks = (tasks) => {
  const weeks = new Map();

  tasks.forEach(task => {
    if (!task.interviewDate) return;
    const date = new Date(task.interviewDate);

    // Always use the Sunday start of the week to calculate week number
    const start = startOfWeek(date, { weekStartsOn: 0 });
    const end = endOfWeek(date, { weekStartsOn: 0 });
    const year = start.getFullYear();

    // Use the Sunday to get the custom week number
    const weekNumber = getCustomWeekNumber(start, year);
    const key = `${year}-W${weekNumber}`;

    if (!weeks.has(key)) {
      weeks.set(key, {
        year,
        week: weekNumber,
        key,
        label: `Week ${weekNumber} (${format(start, 'MMM d')} - ${format(end, 'MMM d')})`,
        start,
        end
      });
    }
  });

  // Sort by year desc, then week desc
  return Array.from(weeks.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.week - a.week;
  });
};

/**
 * Get list of available months with data (Custom Logic)
 * @param {Array} tasks - Array of tasks
 * @returns {Array} Array of {year, month, label}
 */
export const getAvailableMonths = (tasks) => {
  const months = new Map();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  tasks.forEach(task => {
    if (!task.interviewDate) return;
    const date = new Date(task.interviewDate);
    const start = startOfWeek(date, { weekStartsOn: 0 });
    const end = endOfWeek(date, { weekStartsOn: 0 });
    const taskYear = start.getFullYear();
    const weekNumber = getCustomWeekNumber(start, taskYear);

    // Find which custom month this week belongs to
    let foundMonthIndex = -1;
    let customYear = taskYear;

    // Special Check for Week 52: Belongs to Jan of NEXT year
    if (weekNumber === 52) {
      foundMonthIndex = 0; // Jan
      customYear = taskYear + 1;
    } else {
      const config = CUSTOM_MONTH_WEEKS.find(c => c.weeks.includes(weekNumber));
      if (config) {
        foundMonthIndex = config.month;
      }
    }

    if (foundMonthIndex === -1) return; // Should not happen if all weeks covered

    const key = `${customYear}-${foundMonthIndex}`;

    if (!months.has(key)) {
      const weeksConfig = CUSTOM_MONTH_WEEKS.find(m => m.month === foundMonthIndex);
      const weekRangeStr = `Wk${weeksConfig.weeks[0]}-${weeksConfig.weeks[weeksConfig.weeks.length - 1]}`;

      months.set(key, {
        year: customYear,
        month: foundMonthIndex,
        key,
        // Initial values, will update range below
        minDate: start,
        maxDate: end,
        weekRangeLabel: weekRangeStr,
        baseLabel: `${monthNames[foundMonthIndex]} ${customYear}`
      });
    }

    // Update min/max dates for the label
    const combined = months.get(key);
    if (date < combined.minDate) combined.minDate = date; // Using actual task date or week start? Week start is better for period description
    if (start < combined.minDate) combined.minDate = start;
    if (end > combined.maxDate) combined.maxDate = end;
  });

  // Format labels
  return Array.from(months.values()).map(m => {
    const startStr = format(m.minDate, 'MMM d');
    const endStr = format(m.maxDate, 'MMM d');
    return {
      ...m,
      label: `${m.baseLabel} (${startStr} - ${endStr}) / ${m.weekRangeLabel}`
    };
  }).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
};

/**
 * Calculate trend data for teams or reasons over time periods
 * @param {Array} tasks - Array of tasks
 * @param {string} period - 'week' or 'month'
 * @param {number|string} periodsCount - Number of periods to analyze or 'all'
 * @param {string} groupBy - 'team' or 'reason'
 * @param {Object} dateRange - { start, end } optional custom range
 * @returns {Object} Trend data by group (team name or reason)
 */
export const calculateTrendData = (tasks, period = 'week', periodsCount = 8, groupBy = 'team', dateRange = null) => {
  const periods = period === 'week' ? getAvailableWeeks(tasks) : getAvailableMonths(tasks);

  let periodsToAnalyze = [];

  if (dateRange && dateRange.start && dateRange.end) {
    // Filter periods that fall within the custom range
    const start = new Date(dateRange.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999);

    periodsToAnalyze = periods.filter(p => {
      // For weeks/months, we check if the period's "start" or representative date is in range
      // The `periods` array from getAvailableWeeks/Months has `start` (date object) for weeks.
      // For months, we can reconstruct the date.

      let periodDate;
      if (period === 'week') {
        periodDate = p.start; // Week start date
      } else {
        periodDate = new Date(p.year, p.month, 1); // Month start date
      }

      return periodDate >= start && periodDate <= end;
    }).reverse(); // Chronological order
  } else {
    // Standard count-based logic
    periodsToAnalyze = periodsCount === 'all'
      ? [...periods].reverse()
      : periods.slice(0, periodsCount).reverse();
  }

  const trendData = {};

  periodsToAnalyze.forEach(periodInfo => {
    const filteredTasks = period === 'week'
      ? filterTasksByWeek(tasks, periodInfo.year, periodInfo.week)
      : filterTasksByMonth(tasks, periodInfo.year, periodInfo.month);

    // Group by team or reason
    filteredTasks.forEach(task => {
      // Determine group key
      let groupKey;
      if (groupBy === 'reason') {
        groupKey = task.reason || 'Unspecified';
      } else {
        groupKey = task.teamName;
      }

      if (!trendData[groupKey]) {
        trendData[groupKey] = {
          periods: [],
          detractors: [],
          neutrals: [],
          totalViolations: [],
          equivalentDetractors: []
        };
      }

      const periodLabel = period === 'week'
        ? `W${periodInfo.week}`
        : periodInfo.label.split(' ')[0].substring(0, 3);

      // Find or create period entry
      let periodIndex = trendData[groupKey].periods.indexOf(periodLabel);
      if (periodIndex === -1) {
        trendData[groupKey].periods.push(periodLabel);
        trendData[groupKey].detractors.push(0);
        trendData[groupKey].neutrals.push(0);
        trendData[groupKey].totalViolations.push(0);
        trendData[groupKey].equivalentDetractors.push(0);
        periodIndex = trendData[groupKey].periods.length - 1;
      }

      // Count violations
      if (task.evaluationScore >= 1 && task.evaluationScore <= 6) {
        trendData[groupKey].detractors[periodIndex]++;
        trendData[groupKey].totalViolations[periodIndex]++;
      } else if (task.evaluationScore >= 7 && task.evaluationScore <= 8) {
        trendData[groupKey].neutrals[periodIndex]++;
        trendData[groupKey].totalViolations[periodIndex]++;
      }

      // Note: totalViolations is incremented inside blocks to ensure we only count 
      // relevant tickets (Detractors/Neutrals), not just any task in the period 
      // if logic changes. Currently redundant but safe.
    });
  });

  // Calculate equivalent detractors for each period
  Object.keys(trendData).forEach(key => {
    trendData[key].equivalentDetractors = trendData[key].periods.map((_, index) => {
      const detractors = trendData[key].detractors[index] || 0;
      const neutrals = trendData[key].neutrals[index] || 0;
      return detractors + Math.floor(neutrals / 3);
    });
  });

  return trendData;
};

/**
 * Calculate percentage change between two values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Percentage change
 */
export const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};
