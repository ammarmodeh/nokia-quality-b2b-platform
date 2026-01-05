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

export const getWeekNumberForTaksTable = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  // Define the start of week 0
  const startWeek0 = new Date(d.getFullYear() - 1, 11, 29); // December 29 of the previous year
  startWeek0.setHours(0, 0, 0, 0);

  // Define the end of week 0
  const endWeek0 = new Date(d.getFullYear(), 0, 4); // January 4 of the current year
  endWeek0.setHours(0, 0, 0, 0);

  // Check if the date falls within week 0
  if (d >= startWeek0 && d <= endWeek0) {
    return 0;
  }

  const baseDate = new Date(d.getFullYear(), 0, 5); // Set January 5 as the base
  baseDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((d - baseDate) / 86400000); // Days difference from Jan 5
  const weekNumber = Math.floor(diffDays / 7) + 1; // Calculate week number starting from 1

  return weekNumber;
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


export const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const baseDate = new Date(2024, 11, 29); // Set December 29, 2024, as the base
  baseDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((d - baseDate) / 86400000); // Days difference from Dec 29, 2024
  const weekNumber = Math.floor(diffDays / 7); // Calculate week number starting from 0

  return weekNumber;
};

export const generateWeekRanges = (tasks) => {
  if (tasks.length === 0) return [];

  const latestTaskDate = new Date(
    Math.max(...tasks.map((task) => new Date(task.interviewDate)))
  );
  const currentWeek = getWeekNumber(latestTaskDate);
  const ranges = [];

  for (let i = 0; i <= currentWeek; i++) {
    ranges.push(`Wk-${i}`);
  }

  return ranges;
};

export const groupDataByWeek = (data, timeRange) => {
  if (data.length === 0) return {};

  const groupedData = {};
  const latestTaskDate = new Date(
    Math.max(...data.map((task) => new Date(task.interviewDate)))
  );
  const currentWeek = getWeekNumber(latestTaskDate);
  let allWeeks = [];

  if (timeRange === "allWeeks") {
    // All weeks up to the current week
    allWeeks = Array.from({ length: currentWeek + 1 }, (_, i) => `Wk-${i}`);
  } else if (Array.isArray(timeRange)) {
    // Handle multiple week ranges
    allWeeks = timeRange.flatMap((range) => {
      if (range.startsWith("Wk-")) {
        const weekNumber = parseInt(range.replace("Wk-", ""), 10);
        return [`Wk-${weekNumber}`];
      }
      return [];
    });
  } else if (timeRange.startsWith("Wk-")) {
    // Handle single week range
    const weekNumber = parseInt(timeRange.replace("Wk-", ""), 10);
    allWeeks = [`Wk-${weekNumber}`];
  } else {
    // Default to all weeks
    allWeeks = Array.from({ length: currentWeek + 1 }, (_, i) => `Wk-${i}`);
  }

  // Initialize groupedData with all weeks
  allWeeks.forEach((week) => {
    groupedData[week] = { Detractor: 0, NeutralPassive: 0, Promoter: 0 };
  });

  // Process tasks
  data.forEach((task) => {
    const weekNumber = getWeekNumber(task.interviewDate);
    const weekKey = `Wk-${weekNumber}`;

    if (groupedData[weekKey]) {
      if (task.evaluationScore >= 1 && task.evaluationScore <= 6) {
        groupedData[weekKey].Detractor += 1;
      } else if (task.evaluationScore >= 7 && task.evaluationScore <= 8) {
        groupedData[weekKey].NeutralPassive += 1;
      }
    }
  });

  // Calculate Promoter scores
  Object.keys(groupedData).forEach((week) => {
    const total = 100; // Assuming total tasks per week is 100
    groupedData[week].Promoter = total - groupedData[week].Detractor - groupedData[week].NeutralPassive;
  });

  return groupedData;
};

export const getDesiredWeeks = (data, range) => {
  if (data.length === 0) return [];

  const latestTaskDate = new Date(
    Math.max(...data.map((task) => new Date(task.interviewDate)))
  );
  const currentWeek = getWeekNumber(latestTaskDate); // Last week with data
  let desiredWeeks = [];

  if (Array.isArray(range)) {
    // Handle multiple week ranges
    desiredWeeks = range.flatMap((r) => {
      if (r === "allWeeks") {
        return Array.from({ length: currentWeek + 1 }, (_, i) => `Wk-${i}`);
      } else if (r.startsWith("Wk-")) {
        const weekNumber = parseInt(r.replace("Wk-", ""), 10);
        return [`Wk-${weekNumber}`];
      }
      return [];
    });
  } else if (range === "allWeeks") {
    // All weeks
    desiredWeeks = Array.from({ length: currentWeek + 1 }, (_, i) => `Wk-${i}`);
  } else if (range.startsWith("Wk-")) {
    // Single week
    const weekNumber = parseInt(range.replace("Wk-", ""), 10);
    desiredWeeks = [`Wk-${weekNumber}`];
  } else {
    // Default to no weeks
    desiredWeeks = [];
  }

  // Filter tasks based on desired weeks
  return data.filter((task) => {
    const weekNumber = getWeekNumber(task.interviewDate);
    return desiredWeeks.includes(`Wk-${weekNumber}`);
  });
};

export const getCustomWeekNumber = (date, year) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  // Set the start date of the first week of the year
  // Our system starts from Dec 29, 2024 for year 2025 based on previous logic
  // But let's make it smarter: find the Sunday of the week containing Jan 1
  const jan1 = new Date(year, 0, 1);
  const startOfTime = new Date(jan1);
  startOfTime.setDate(jan1.getDate() - jan1.getDay()); // Previous Sunday
  startOfTime.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((d - startOfTime) / 86400000);
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