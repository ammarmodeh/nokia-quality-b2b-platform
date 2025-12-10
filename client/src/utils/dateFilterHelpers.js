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
export const filterTasksByMonth = (tasks, year, month) => {
  return tasks.filter(task => {
    if (!task.interviewDate) return false;
    const taskDate = new Date(task.interviewDate);
    return taskDate.getFullYear() === year && taskDate.getMonth() === month;
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
 * Get list of available months with data
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
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${month}`;

    if (!months.has(key)) {
      months.set(key, {
        year,
        month,
        key,
        label: `${monthNames[month]} ${year}`
      });
    }
  });

  return Array.from(months.values()).sort((a, b) => {
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
