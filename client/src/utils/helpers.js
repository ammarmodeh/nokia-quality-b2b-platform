import moment from "moment";
import * as XLSX from "xlsx";

/////////////////////////////////////////////////////// Functions ////////////////////////////////////////////////////////////////

export const formatDate = (date) => {
  // Get the month, day, and year
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();

  const formattedDate = `${day}-${month}-${year}`;

  return formattedDate;
};

export const newFormatDate = (date) => {
  // Handle null/undefined/empty cases first
  if (!date) return 'N/A';

  const parsedDate = new Date(date);

  // Check if the date is valid
  if (isNaN(parsedDate.getTime())) return 'N/A';

  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  try {
    const parts = parsedDate.toLocaleDateString('en-GB', options).split(' ');
    return `${parts[0]} ${parts[1]}, ${parts[2]}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
}

export function dateFormatter(dateString) {
  const inputDate = new Date(dateString);

  if (isNaN(inputDate)) {
    return "Invalid Date";
  }

  const year = inputDate.getFullYear();
  const month = String(inputDate.getMonth() + 1).padStart(2, "0");
  const day = String(inputDate.getDate()).padStart(2, "0");

  const formattedDate = `${year}-${month}-${day}`;
  return formattedDate;
}

export function getInitials(fullName) {
  // Return "Unknown" if fullName is undefined, null, or an empty string
  if (!fullName) {
    return "N/A";
  }

  // Split the fullName into an array of names
  const names = fullName.split(" ");

  // Get the initials of the first two names
  const initials = names.slice(0, 2).map((name) => name[0].toUpperCase());

  // Join the initials into a single string
  const initialsStr = initials.join("");

  return initialsStr;
}

export const getCategoryStatus = (subTasks) => {
  return subTasks.map(category => {
    // console.log("category:", category);
    const totalProgress = category.reduce((sum, task) => sum + task.progress, 0);
    // console.log({ totalProgress });
    if (totalProgress === 100) return "Closed";
    if (totalProgress > 0) return "In Progress";
    return "Todo";
  });
}

export const getTeamViolations = (tasks) => {
  const teamViolations = {};

  // Group violations by teamName and teamCompany
  tasks.forEach((task) => {
    const { teamName = "Unknown", teamCompany = "Unknown", evaluationScore } = task;

    // Create a unique key combining teamName and teamCompany
    const key = `${teamName}-${teamCompany}`;

    if (!teamViolations[key]) {
      teamViolations[key] = {
        teamName,
        teamCompany,
        detractors: 0,
        passives: 0,
        total: 0,
      };
    }

    // Count violations based on evaluationScore
    if (evaluationScore >= 1 && evaluationScore <= 6) {
      teamViolations[key].detractors += 1;
      teamViolations[key].total += 1;
    } else if (evaluationScore >= 7 && evaluationScore <= 8) {
      teamViolations[key].passives += 1;
      teamViolations[key].total += 1;
    }
  });

  // Convert to array and sort by total violations in descending order
  return Object.values(teamViolations)
    .map((violations, index) => ({
      id: index + 1,
      teamName: violations.teamName,
      teamCompany: violations.teamCompany,
      detractors: violations.detractors,
      passives: violations.passives,
      total: violations.total,
    }))
    .sort((a, b) => b.total - a.total); // Sort by total violations in descending order
};

// Export function for Excel
export const exportToExcel = (rows, columns) => {
  const data = rows.map((row) =>
    columns.reduce((acc, column) => {
      acc[column.field] = row[column.field];
      return acc;
    }, {})
  );
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, "data.xlsx");
};

export const getWeekNumberForTaksTable = (date, settings = {}) => {
  return getCustomWeekNumber(date, new Date(date).getFullYear(), settings);
};


export const getReasonViolations = (tasks) => {
  const reasonViolations = {};

  // Group violations by reason
  tasks.forEach((task) => {
    const { reason, evaluationScore } = task;

    if (!reason) return; // Skip if reason is not defined

    if (!reasonViolations[reason]) {
      reasonViolations[reason] = {
        total: 0,
      };
    }

    if (evaluationScore >= 1 && evaluationScore <= 6) {
      reasonViolations[reason].total += 1;
    } else if (evaluationScore >= 7 && evaluationScore <= 8) {
      reasonViolations[reason].total += 1;
    }
  });

  // Calculate total violations across all reasons
  const totalViolations = Object.values(reasonViolations).reduce((sum, violations) => sum + violations.total, 0);

  // Convert to array and add percentage
  return Object.entries(reasonViolations).map(([reason, violations]) => ({
    reason,
    total: violations.total,
    percentage: ((violations.total / totalViolations) * 100).toFixed(2) + "%", // Calculate percentage
  }));
};

export const getReasonViolations2 = (tasks) => {
  const reasonMap = {};

  tasks.forEach(task => {
    const reason = task.reason || 'Unspecified';

    if (!reasonMap[reason]) {
      reasonMap[reason] = {
        total: 0,
        tasks: []
      };
    }

    reasonMap[reason].total++;
    reasonMap[reason].tasks.push(task);
  });

  const totalT = Object.values(reasonMap).reduce((sum, { total }) => sum + total, 0);

  return Object.entries(reasonMap).map(([reason, { total, tasks }]) => ({
    reason,
    total,
    tasks,
    percentage: totalT > 0 ? ((total / totalT) * 100).toFixed(2) + "%" : 0
  }));
};

export const getOwnerViolations = (tasks) => {
  const ownerMap = {};

  tasks.forEach(task => {
    const owner = task.responsible || 'Unspecified';

    if (!ownerMap[owner]) {
      ownerMap[owner] = {
        total: 0,
        tasks: []
      };
    }

    ownerMap[owner].total++;
    ownerMap[owner].tasks.push(task);
  });

  const totalT = Object.values(ownerMap).reduce((sum, { total }) => sum + total, 0);

  return Object.entries(ownerMap).map(([owner, { total, tasks }]) => ({
    owner,
    total,
    tasks,
    percentage: totalT > 0 ? ((total / totalT) * 100).toFixed(2) + "%" : "0.00%"
  }));
};



export const getWeekNumber = (date, weekStartDay = 0, week1StartDate = null, week1EndDate = null, startWeekNumber = 1) => {
  if (!date) return { week: 0, year: 0, key: "Wk-00 (0)" };

  const d = new Date(date);
  const settings = { weekStartDay, week1StartDate, week1EndDate, startWeekNumber };
  const weekNum = getCustomWeekNumber(d, d.getFullYear(), settings);

  let year = d.getFullYear();
  if (week1StartDate) {
    const w1Start = new Date(week1StartDate);
    // If it's a high week number occurring before the calibration start, it's prev year
    if (d < w1Start && weekNum > 50) {
      year = w1Start.getFullYear() - 1;
    } else if (d >= w1Start) {
      year = w1Start.getFullYear();
    }
  }

  return {
    week: weekNum,
    year,
    key: `Wk-${String(weekNum).padStart(2, '0')} (${year})`
  };
};

export const generateWeekRanges = (tasks, settings = {}) => {
  if (!tasks || tasks.length === 0) return [];
  const { weekStartDay = 0, week1StartDate = null, week1EndDate = null, startWeekNumber = 1 } = settings;

  const weeksSet = new Set();
  tasks.forEach(task => {
    if (task.interviewDate) {
      const { key } = getWeekNumber(task.interviewDate, weekStartDay, week1StartDate, week1EndDate, startWeekNumber);
      weeksSet.add(key);
    }
  });

  return Array.from(weeksSet).sort((a, b) => {
    // Expected format: Wk-02 (2026)
    const matchA = a.match(/Wk-(\d+) \((\d+)\)/);
    const matchB = b.match(/Wk-(\d+) \((\d+)\)/);
    if (!matchA || !matchB) return 0;
    const yearA = parseInt(matchA[2], 10);
    const yearB = parseInt(matchB[2], 10);
    const weekA = parseInt(matchA[1], 10);
    const weekB = parseInt(matchB[1], 10);

    if (yearA !== yearB) return yearA - yearB;
    return weekA - weekB;
  });
};

export const groupDataByWeek = (data, timeRange, settings = {}, samplesData = []) => {
  if (data.length === 0 && (!timeRange || timeRange.length === 0)) return {};
  const { weekStartDay = 0, week1StartDate = null, week1EndDate = null, startWeekNumber = 1 } = settings;

  const groupedData = {};

  let selectedWeeks = [];
  if (timeRange === "allWeeks") {
    // Usually we pass specific range, but if allWeeks, we could derive
    selectedWeeks = [];
  } else if (Array.isArray(timeRange)) {
    selectedWeeks = timeRange;
  } else {
    selectedWeeks = [timeRange];
  }

  // Initialize groupedData
  selectedWeeks.forEach((week) => {
    groupedData[week] = { Detractors: 0, Neutrals: 0, Promoters: 0, sampleSize: 0 };
  });

  // 1. Process feedback tasks (counts)
  data.forEach((task) => {
    if (!task.interviewDate) return;
    const { key: weekKey } = getWeekNumber(task.interviewDate, weekStartDay, week1StartDate, week1EndDate, startWeekNumber);

    if (groupedData[weekKey]) {
      if (task.evaluationScore >= 1 && task.evaluationScore <= 6) {
        groupedData[weekKey].Detractors += 1;
      } else if (task.evaluationScore >= 7 && task.evaluationScore <= 8) {
        groupedData[weekKey].Neutrals += 1;
      }
    }
  });

  // 2. Process samplesData (total sample sizes)
  samplesData.forEach((sample) => {
    const weekKey = `Wk-${String(sample.weekNumber).padStart(2, '0')} (${sample.year})`;
    if (groupedData[weekKey]) {
      groupedData[weekKey].sampleSize += (sample.sampleSize || 0);
    }
  });

  // 3. Calculate Percentages
  Object.keys(groupedData).forEach((week) => {
    const stats = groupedData[week];
    const totalSamples = stats.sampleSize || 0;

    if (totalSamples > 0) {
      const detCount = stats.Detractors;
      const neuCount = stats.Neutrals;
      const proCount = Math.max(0, totalSamples - (detCount + neuCount));

      groupedData[week].Promoters = Math.round((proCount / totalSamples) * 100);
      groupedData[week].Detractors = Math.round((detCount / totalSamples) * 100);
      groupedData[week].Neutrals = Math.round((neuCount / totalSamples) * 100);
    } else {
      // If no samples recorded, default to 0
      groupedData[week].Promoters = 0;
      groupedData[week].Detractors = 0;
      groupedData[week].Neutrals = 0;
    }
  });

  return groupedData;
};

export const getDesiredWeeks = (data, range, settings = {}) => {
  if (data.length === 0) return [];
  const { weekStartDay = 0, week1StartDate = null, week1EndDate = null, startWeekNumber = 1 } = settings;

  let desiredWeeks = [];
  const allWeeks = generateWeekRanges(data, settings);

  if (range === "allWeeks") {
    desiredWeeks = allWeeks;
  } else if (Array.isArray(range)) {
    desiredWeeks = range;
  } else if (typeof range === "string") {
    desiredWeeks = [range];
  }

  // Filter tasks based on desired weeks
  return data.filter((task) => {
    if (!task.interviewDate) return false;
    const { key } = getWeekNumber(task.interviewDate, weekStartDay, week1StartDate, week1EndDate, startWeekNumber);
    return desiredWeeks.includes(key);
  });
};

export const getCustomWeekNumber = (date, year, settings = {}) => {
  const { weekStartDay = 0, week1StartDate = null, week1EndDate = null, startWeekNumber = 1 } = settings;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  // If custom calibration is defined
  if (week1StartDate && week1EndDate) {
    const w1Start = new Date(week1StartDate);
    w1Start.setHours(0, 0, 0, 0);
    const w1End = new Date(week1EndDate);
    w1End.setHours(23, 59, 59, 999);

    // 1. Within calibration range
    if (d >= w1Start && d <= w1End) return startWeekNumber;

    // 2. After calibration
    if (d > w1End) {
      let firstRegular = new Date(w1End);
      firstRegular.setDate(w1End.getDate() + 1);
      firstRegular.setHours(0, 0, 0, 0);
      while (firstRegular.getDay() !== weekStartDay) {
        firstRegular.setDate(firstRegular.getDate() + 1);
      }

      if (d < firstRegular) return startWeekNumber;

      const diffTime = d.getTime() - firstRegular.getTime();
      const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
      return startWeekNumber + 1 + diffWeeks;
    }

    // 3. Before calibration
    if (d < w1Start) {
      const diffTime = w1Start.getTime() - d.getTime();
      const diffWeeks = Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000));
      let num = startWeekNumber - diffWeeks;

      // Predictable wrap-around
      while (num <= 0) num += 52;
      return num;
    }
  }

  // Fallback annual logic
  const jan1 = new Date(year, 0, 1);
  const startOfTime = new Date(jan1);
  // Find the first Sunday (or weekStartDay) on or after Jan 1
  const diff = (weekStartDay - jan1.getDay() + 7) % 7;
  startOfTime.setDate(jan1.getDate() + diff);
  startOfTime.setHours(0, 0, 0, 0);

  if (d < startOfTime) {
    // Part of the "Week 0" or partial week before the first full week of the year
    return 0;
  }

  const diffDays = Math.floor((d.getTime() - startOfTime.getTime()) / 86400000);
  return Math.floor(diffDays / 7) + 1;
};





export const getCompanyViolations = (tasks) => {
  const companyViolations = {};

  // Group violations by company
  tasks.forEach((task) => {
    const { teamCompany, evaluationScore } = task;

    if (!teamCompany) return; // Skip if company is not defined

    if (!companyViolations[teamCompany]) {
      companyViolations[teamCompany] = {
        total: 0,
      };
    }

    if (evaluationScore >= 1 && evaluationScore <= 6) {
      companyViolations[teamCompany].total += 1;
    } else if (evaluationScore >= 7 && evaluationScore <= 8) {
      companyViolations[teamCompany].total += 1;
    }
  });

  // Calculate total violations across all companies
  const totalViolations = Object.values(companyViolations).reduce((sum, violations) => sum + violations.total, 0);

  // Convert to array and add percentage
  return Object.entries(companyViolations).map(([company, violations]) => ({
    company,
    total: violations.total,
    percentage: ((violations.total / totalViolations) * 100).toFixed(2) + "%", // Calculate percentage
  }));
};
///////////////////////////////////////////////////// Constants //////////////////////////////////////////////////////////////////


// ============================================
// MONTH CALCULATION FUNCTIONS
// ============================================

/**
 * Generate month ranges based on month1 configuration
 * Month 1 is defined by user.
 * Subsequent months are calculated as strict 4-week (28-day) periods.
 * This results in a 13-month year (52 weeks / 4 weeks = 13).
 */
export const generateMonthRanges = (tasks, settings = {}) => {
  const { month1StartDate, month1EndDate } = settings;

  if (!month1StartDate || !month1EndDate) {
    return [];
  }

  const ranges = [];
  const month1Start = new Date(month1StartDate);
  const month1End = new Date(month1EndDate);

  // Add Month 1
  ranges.push({
    key: `Month-1`,
    label: `Month 1`,
    start: month1Start,
    end: month1End
  });

  // Calculate subsequent months (strict 4-week periods = 28 days)
  let currentStart = new Date(month1End);
  currentStart.setDate(currentStart.getDate() + 1); // Day after Month 1 ends

  for (let i = 2; i <= 13; i++) { // Generate up to 13 months to cover full year
    // Every month is exactly 4 weeks (28 days)
    const daysInMonth = 28;

    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + (daysInMonth - 1));

    ranges.push({
      key: `Month-${i}`,
      label: `Month ${i}`,
      start: new Date(currentStart),
      end: new Date(currentEnd)
    });

    // Next month starts the day after current month ends
    currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }

  return ranges;
};

/**
 * Get month number for a given date
 */
export const getMonthNumber = (date, settings = {}) => {
  const { month1StartDate, month1EndDate } = settings;

  if (!month1StartDate || !month1EndDate) {
    return null;
  }

  const targetDate = new Date(date);
  const month1Start = new Date(month1StartDate);
  const month1End = new Date(month1EndDate);

  // Check if date is in Month 1
  if (targetDate >= month1Start && targetDate <= month1End) {
    return { monthNumber: 1, key: 'Month-1' };
  }

  // Calculate which 4-week period the date falls into
  let currentStart = new Date(month1End);
  currentStart.setDate(currentStart.getDate() + 1);

  for (let i = 2; i <= 12; i++) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + 27);

    if (targetDate >= currentStart && targetDate <= currentEnd) {
      return { monthNumber: i, key: `Month-${i}` };
    }

    currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.setDate() + 1);
  }

  return null; // Date doesn't fall in any configured month
};

/**
 * Group data by month
 */
export const groupDataByMonth = (data, monthRange, settings = {}, samplesData = []) => {
  if (data.length === 0 && (!monthRange || monthRange.length === 0)) return {};

  const groupedData = {};
  const monthRanges = generateMonthRanges(data, settings);

  // Initialize grouped data for selected months
  if (Array.isArray(monthRange)) {
    monthRange.forEach((month) => {
      groupedData[month] = { Detractors: 0, Neutrals: 0, Promoters: 0, sampleSize: 0 };
    });
  }

  // Process feedback tasks
  data.forEach((task) => {
    if (!task.interviewDate) return;

    const monthInfo = getMonthNumber(task.interviewDate, settings);
    if (!monthInfo) return;

    const monthKey = monthInfo.key;

    if (groupedData[monthKey]) {
      if (task.evaluationScore >= 1 && task.evaluationScore <= 6) {
        groupedData[monthKey].Detractors += 1;
      } else if (task.evaluationScore >= 7 && task.evaluationScore <= 8) {
        groupedData[monthKey].Neutrals += 1;
      }
    }
  });

  // Process samplesData - aggregate by month
  const monthRangesMap = {};
  monthRanges.forEach(range => {
    monthRangesMap[range.key] = range;
  });

  samplesData.forEach((sample) => {
    // Find which month this week belongs to
    const weekKey = `Wk-${String(sample.weekNumber).padStart(2, '0')} (${sample.year})`;

    // We need to determine which month this week falls into
    // This requires checking the week's date range against month ranges
    // For simplicity, we'll use a helper to map weeks to months
    for (const [monthKey, monthRange] of Object.entries(monthRangesMap)) {
      // This is a simplified check - in production you'd want more precise week-to-month mapping
      if (groupedData[monthKey]) {
        groupedData[monthKey].sampleSize += (sample.sampleSize || 0);
      }
    }
  });

  // Calculate percentages
  Object.keys(groupedData).forEach((month) => {
    const stats = groupedData[month];
    const totalSamples = stats.sampleSize || 0;

    if (totalSamples > 0) {
      const detCount = stats.Detractors;
      const neuCount = stats.Neutrals;
      const proCount = Math.max(0, totalSamples - (detCount + neuCount));

      groupedData[month].Promoters = Math.round((proCount / totalSamples) * 100);
      groupedData[month].Detractors = Math.round((detCount / totalSamples) * 100);
      groupedData[month].Neutrals = Math.round((neuCount / totalSamples) * 100);
    } else {
      groupedData[month].Promoters = 0;
      groupedData[month].Detractors = 0;
      groupedData[month].Neutrals = 0;
    }
  });

  return groupedData;
};

export const PRIOTITYSTYELS = {
  high: "text-red-600",
  medium: "text-yellow-600",
  low: "text-blue-600",
};

export const TASK_TYPE = {
  todo: "bg-blue-600",
  "in progress": "bg-yellow-600",
  closed: "bg-green-600",
};

export const BGS = [
  "bg-blue-600",
  "bg-yellow-600",
  "bg-red-600",
  "bg-green-600",
];