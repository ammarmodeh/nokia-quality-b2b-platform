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
export const filterTasksByWeek = (tasks, year, weekNumber, settings = {}) => {
  const { weekStartDay = 0 } = settings;
  return tasks.filter(task => {
    if (!task.interviewDate) return false;
    const date = new Date(task.interviewDate);

    // Calculate the start of the week for this task
    const weekStart = startOfWeek(date, { weekStartsOn: weekStartDay });
    const weekYear = weekStart.getFullYear();

    // We filter based on the year of the *week start* to be consistent
    if (weekYear !== year) return false;

    // Calculate week number based on the start of the week
    return getCustomWeekNumber(weekStart, weekYear, settings) === weekNumber;
  });
};

/**
 * Filter tasks by a specific month
 * @param {Array} tasks - Array of tasks
 * @param {number} year - The year
 * @param {number} month - The month (0-11)
 * @returns {Array} Filtered tasks
 */
/**
 * Generate the 5-4-4 week pattern starting from the calibrated start week
 * @param {number} startWeek - The beginning week number (from settings)
 * @returns {Array} Array of {month, weeks}
 */
export const getCustomMonthWeeks = (startWeek = 1) => {
  const pattern = [5, 4, 4]; // 5-4-4 pattern
  const monthWeeks = [];
  let currentWeek = startWeek;

  for (let month = 0; month < 12; month++) {
    const numWeeks = pattern[month % 3];
    const weeks = [];
    for (let i = 0; i < numWeeks; i++) {
      weeks.push(currentWeek);
      currentWeek++;
      // standard wrap around if not continuous
      if (currentWeek > 52) currentWeek = 1;
    }
    monthWeeks.push({ month, weeks });
  }
  return monthWeeks;
};


/**
 * Filter tasks by a specific custom month
 * @param {Array} tasks - Array of tasks
 * @param {number} year - The "Customer Year" (e.g. 2025 for Jan which might start in Dec 2024)
 * @param {number} month - The month index (0-11)
 * @returns {Array} Filtered tasks
 */
export const filterTasksByMonth = (tasks, year, month, settings = {}) => {
  const { weekStartDay = 0, startWeekNumber = 1 } = settings;
  const customMonthWeeks = getCustomMonthWeeks(startWeekNumber);
  const targetConfig = customMonthWeeks.find(m => m.month === month);
  if (!targetConfig) return [];

  return tasks.filter(task => {
    if (!task.interviewDate) return false;
    const date = new Date(task.interviewDate);
    const start = startOfWeek(date, { weekStartsOn: weekStartDay });
    const taskYear = start.getFullYear();
    const weekNumber = getCustomWeekNumber(start, taskYear, settings);

    let customYear = taskYear;
    // Year attribution: if Week > 50 in Jan, it's prev year's tail
    if (weekNumber > 50 && month === 0) {
      customYear = taskYear + 1;
    }

    return customYear === year && targetConfig.weeks.includes(weekNumber);
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
export const getAvailableWeeks = (tasks, settings = {}) => {
  const { weekStartDay = 0 } = settings;
  const weeks = new Map();

  tasks.forEach(task => {
    if (!task.interviewDate) return;
    const date = new Date(task.interviewDate);

    // Always use the start of the week to calculate week number
    const start = startOfWeek(date, { weekStartsOn: weekStartDay });
    const end = endOfWeek(date, { weekStartsOn: weekStartDay });
    const year = start.getFullYear();

    // Use the Sunday to get the custom week number
    const weekNumber = getCustomWeekNumber(start, year, settings);
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
export const getAvailableMonths = (tasks, settings = {}) => {
  const { weekStartDay = 0, startWeekNumber = 1 } = settings;
  const customMonthWeeks = getCustomMonthWeeks(startWeekNumber);
  const months = new Map();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  tasks.forEach(task => {
    if (!task.interviewDate) return;
    const date = new Date(task.interviewDate);
    const start = startOfWeek(date, { weekStartsOn: weekStartDay });
    const end = endOfWeek(date, { weekStartsOn: weekStartDay });
    const taskYear = start.getFullYear();
    const weekNumber = getCustomWeekNumber(start, taskYear, settings);

    // Find which custom month this week belongs to
    let foundMonthIndex = -1;
    let customYear = taskYear;

    const config = customMonthWeeks.find(c => c.weeks.includes(weekNumber));
    if (config) {
      foundMonthIndex = config.month;
      if (weekNumber > 50 && foundMonthIndex === 0) {
        customYear = taskYear + 1;
      }
    }

    if (foundMonthIndex === -1) return;

    const key = `${customYear}-${foundMonthIndex}`;

    if (!months.has(key)) {
      const weeksConfig = customMonthWeeks.find(m => m.month === foundMonthIndex);
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
export const calculateTrendData = (tasks, period = 'week', periodsCount = 8, groupBy = 'team', dateRange = null, settings = {}) => {
  const allPeriods = period === 'week' ? getAvailableWeeks(tasks, settings) : getAvailableMonths(tasks, settings);

  let periodsToAnalyze = [];

  if (dateRange && dateRange.start && dateRange.end) {
    // Filter periods that fall within the custom range
    const start = new Date(dateRange.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999);

    periodsToAnalyze = allPeriods.filter(p => {
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
      ? [...allPeriods].reverse()
      : allPeriods.slice(0, periodsCount).reverse();
  }

  const trendData = {};

  // 1. First, identify ALL unique keys (teams or reasons) that appear in these periods
  // We need to check all tasks that fall into any of these periods.
  // A simple way is to iterate periods, get tasks, and collect keys.
  const relevantKeys = new Set();

  periodsToAnalyze.forEach(periodInfo => {
    const tasksInPeriod = period === 'week'
      ? filterTasksByWeek(tasks, periodInfo.year, periodInfo.week, settings)
      : filterTasksByMonth(tasks, periodInfo.year, periodInfo.month, settings);

    tasksInPeriod.forEach(task => {
      let key;
      if (groupBy === 'reason') {
        key = task.reason || 'Unspecified';
      } else {
        key = task.teamName;
      }
      if (key) relevantKeys.add(key);
    });
  });

  // 2. Initialize trendData for all keys with ZERO-filled arrays
  const periodLabels = periodsToAnalyze.map(p =>
    period === 'week'
      ? `W${p.week}`
      : p.label.split(' ')[0].substring(0, 3)
  );

  relevantKeys.forEach(key => {
    trendData[key] = {
      periods: periodLabels,
      detractors: new Array(periodsToAnalyze.length).fill(0),
      neutrals: new Array(periodsToAnalyze.length).fill(0),
      totalViolations: new Array(periodsToAnalyze.length).fill(0),
      equivalentDetractors: new Array(periodsToAnalyze.length).fill(0)
    };
  });

  // 3. Iterate periods and fill data
  periodsToAnalyze.forEach((periodInfo, index) => {
    const tasksInPeriod = period === 'week'
      ? filterTasksByWeek(tasks, periodInfo.year, periodInfo.week, settings)
      : filterTasksByMonth(tasks, periodInfo.year, periodInfo.month, settings);

    tasksInPeriod.forEach(task => {
      let key;
      if (groupBy === 'reason') {
        key = task.reason || 'Unspecified';
      } else {
        key = task.teamName;
      }

      if (!trendData[key]) return; // Should not happen given step 1

      // Count violations
      if (task.evaluationScore >= 1 && task.evaluationScore <= 6) {
        trendData[key].detractors[index]++;
        trendData[key].totalViolations[index]++;
      } else if (task.evaluationScore >= 7 && task.evaluationScore <= 8) {
        trendData[key].neutrals[index]++;
        trendData[key].totalViolations[index]++;
      }

      // Track reason frequency (only if it's a violation)
      if (task.evaluationScore <= 8) {
        if (!trendData[key].reasonCounts) trendData[key].reasonCounts = {};
        const reason = task.reason || 'Unspecified';
        trendData[key].reasonCounts[reason] = (trendData[key].reasonCounts[reason] || 0) + 1;
      }
    });
  });

  // 4. Calculate equivalent detractors and find top reason
  Object.keys(trendData).forEach(key => {
    // Equivalent Detractors
    trendData[key].equivalentDetractors = trendData[key].detractors.map((det, idx) => {
      const neut = trendData[key].neutrals[idx];
      return det + Math.floor(neut / 3);
    });

    // Top Reason & All Reasons
    let topReason = 'None';
    let topReasonCount = 0;
    let allReasons = [];

    if (trendData[key].reasonCounts) {
      allReasons = Object.entries(trendData[key].reasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);

      if (allReasons.length > 0) {
        topReason = allReasons[0].reason;
        topReasonCount = allReasons[0].count;
      }
    }
    trendData[key].allReasons = allReasons;
    trendData[key].topReason = topReason;
    trendData[key].topReasonCount = topReasonCount;
    // Cleanup temporary count map
    delete trendData[key].reasonCounts;
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
