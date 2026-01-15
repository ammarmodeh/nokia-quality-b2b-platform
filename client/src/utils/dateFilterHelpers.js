import { startOfWeek, endOfWeek, format } from 'date-fns';
import { getCustomWeekNumber, generateMonthRanges, getMonthNumber } from './helpers';

/**
 * Filter tasks by a specific week
 * @param {Array} tasks - Array of tasks
 * @param {number} year - The year
 * @param {number} weekNumber - The custom week number
 * @returns {Array} Filtered tasks
 */
export const filterTasksByWeek = (tasks, year, weekNumber, settings = {}) => {
  if (!Array.isArray(tasks)) return [];
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
 * Filter tasks by a specific month (Using new configurable logic)
 * @param {Array} tasks - Array of tasks
 * @param {number} year - The year (ignored in favor of settings configuration ranges)
 * @param {number} month - The month number (1-12)
 * @returns {Array} Filtered tasks
 */
export const filterTasksByMonth = (tasks, year, month, settings = {}) => {
  if (!Array.isArray(tasks)) return [];
  const ranges = generateMonthRanges(tasks, settings);
  // Find range for "Month-X"
  // Note: month param here might be 0-based index or 1-based number depending on caller.
  // NPSSummaryCard passes parseInt(selectedPeriod). If selectedPeriod is "1", returns 1.
  // getAvailableMonths below generates keys "Month-1", "Month-2".

  // If caller passes index (0-11), we might need to adjust. 
  // But let's assume standardizing on 1-based Month numbers.

  const targetKey = `Month-${month}`;
  const targetRange = ranges.find(r => r.key === targetKey);

  if (!targetRange) return [];

  return tasks.filter(task => {
    if (!task.interviewDate) return false;
    const d = new Date(task.interviewDate);
    // Include boundary? Usually yes.
    return d >= targetRange.start && d <= targetRange.end;
  });
};

/**
 * Filter tasks by a custom date range
 * @param {Array} tasks - Array of tasks
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {Array} Filtered tasks
 */
export const filterTasksByDateRange = (tasks, startDate, endDate) => {
  if (!Array.isArray(tasks)) return [];
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
  if (!Array.isArray(tasks)) return [];
  const safeSettings = settings || {};
  const { weekStartDay = 0, week1StartDate = null, week1EndDate = null, startWeekNumber = 1 } = safeSettings;
  const weeks = new Map();

  // 1. Collect weeks from tasks
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

  // 2. Safely add the CURRENT week if it's not present (even if no tasks)
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: weekStartDay });
  const currentWeekEnd = endOfWeek(today, { weekStartsOn: weekStartDay });
  const currentWeekNumber = getCustomWeekNumber(currentWeekStart, currentYear, settings);
  const currentKey = `${currentYear}-W${currentWeekNumber}`;

  if (!weeks.has(currentKey)) {
    weeks.set(currentKey, {
      year: currentYear,
      week: currentWeekNumber,
      key: currentKey,
      label: `Week ${currentWeekNumber} (${format(currentWeekStart, 'MMM d')} - ${format(currentWeekEnd, 'MMM d')})`,
      start: currentWeekStart,
      end: currentWeekEnd
    });
  }

  // Sort by year desc, then week desc
  return Array.from(weeks.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.week - a.week;
  });
};

/**
 * Get list of available months (Custom Logic)
 * @param {Array} tasks - Array of tasks
 * @returns {Array} Array of {year, month, label}
 */
export const getAvailableMonths = (tasks, settings = {}) => {
  if (!Array.isArray(tasks)) return [];
  const ranges = generateMonthRanges(tasks, settings);

  // We want to return all generated ranges (or maybe just those that encompass 'tasks' dates?)
  // For 'Available', typically we show what is possible to select.
  // Since ranges are fixed by settings, we display them all.
  // Optionally filter if no data exists, but user might want to see empty month.

  return ranges.map(range => {
    // extract number from key "Month-1"
    const monthNum = parseInt(range.key.split('-')[1]);
    const startStr = format(range.start, 'MMM d');
    const endStr = format(range.end, 'MMM d');
    const label = `${range.label} (${startStr} - ${endStr})`;

    return {
      year: range.start.getFullYear(),
      month: monthNum, // Using number as ID
      key: range.key,
      label: label,
      value: monthNum,
      start: range.start,
      end: range.end
    };
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
  if (!Array.isArray(tasks)) return {};
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
/**
 * Aggregate survey samples based on a specific period
 * @param {Array} samplesData - Array of sample objects {weekNumber, sampleSize, ...}
 * @param {string} type - 'week', 'month', or 'range'
 * @param {any} value - weekNumber, {month}, or {start, end, ...}
 * @param {Object} settings - { weekStartDay, startWeekNumber, month1StartDate, month1EndDate }
 * @returns {number} Sum of sample sizes
 */
export const aggregateSamples = (samplesData, type, value, settings = {}) => {
  if (!samplesData || samplesData.length === 0) return 0;

  if (type === 'week') {
    const weekNum = typeof value === 'object' ? value.weekNumber : value;
    const year = typeof value === 'object' ? value.year : null;
    const startDate = typeof value === 'object' ? value.startDate : null;

    // Try to find exact match by weekNumber and year first
    const matches = samplesData.filter(s => {
      const sWeek = s.weekNumber !== undefined ? s.weekNumber : s.week;
      const sYear = s.year;

      const mWeek = Number(sWeek) === Number(weekNum);
      const mYear = year ? Number(sYear) === Number(year) : true;

      if (mWeek && mYear) return true;

      // Secondary check: Robust Date comparison if weekNum/year didn't match perfectly
      if (startDate && s.startDate) {
        const d1 = new Date(startDate);
        const d2 = new Date(s.startDate);
        return d1.getFullYear() === d2.getFullYear() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getDate() === d2.getDate();
      }

      return false;
    });

    return matches.reduce((sum, s) => sum + (Number(s.sampleSize) || 0), 0);
  }

  if (type === 'month') {
    const { month } = value;
    // We need to find which weeks fall into this month.
    // Using generateMonthRanges to get the date range of the month
    const ranges = generateMonthRanges([], settings);
    const targetKey = `Month-${month}`;
    const targetRange = ranges.find(r => r.key === targetKey);

    if (!targetRange) return 0;

    // Now assume samples have a weekNumber.
    // We need to approximate if the week falls in result range.
    // This is imperfect without exact dates in samples, but we can try to use Week 1 Start + offset.
    const { week1StartDate } = settings;

    return samplesData.filter(s => {
      // If sample has a specific startDate, use it
      if (s.startDate) {
        const sDate = new Date(s.startDate);
        return sDate >= targetRange.start && sDate <= targetRange.end;
      }

      // Fallback: Estimate from Week 1 (if available)
      if (week1StartDate && s.weekNumber) {
        const w1Start = new Date(week1StartDate);
        const estimatedStart = new Date(w1Start);
        estimatedStart.setDate(w1Start.getDate() + (s.weekNumber - 1) * 7);
        // Check if ANY part of the week is in the month? Or start date?
        // Let's check start date
        return estimatedStart >= targetRange.start && estimatedStart <= targetRange.end;
      }

      return false; // Can't determine
    }).reduce((sum, s) => sum + (Number(s.sampleSize) || 0), 0);
  }

  if (type === 'range') {
    const { start, end, weeksInterval } = value;
    if (!start || !end) return 0;

    const startDate = new Date(start);
    const endDate = new Date(end);

    return samplesData.filter(s => {
      // Preferred: use sample startDate
      if (s.startDate) {
        const sDate = new Date(s.startDate);
        return sDate >= startDate && sDate <= endDate;
      }

      // Fallback: use weeksInterval lookup if provided
      if (weeksInterval && s.weekNumber) {
        const weekIdx = s.weekNumber - 1;
        const weekStart = weeksInterval[weekIdx];
        if (weekStart) {
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          // Checking overlap
          return weekEnd >= startDate && weekStart <= endDate;
        }
      }

      return false;
    }).reduce((sum, s) => sum + (Number(s.sampleSize) || 0), 0);
  }

  // Default 'all'
  return samplesData.reduce((sum, s) => sum + (Number(s.sampleSize) || 0), 0);
};
