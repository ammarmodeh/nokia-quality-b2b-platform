/**
 * Groups tasks by week based on interviewDate.
 */
export const groupTasksByWeek = (tasks) => {
  const groupedTasks = {};

  tasks.forEach((task) => {
    if (!task.interviewDate) return;

    const date = new Date(task.interviewDate);
    const weekNumber = getWeekNumber(date);

    if (!groupedTasks[weekNumber]) {
      groupedTasks[weekNumber] = [];
    }

    groupedTasks[weekNumber].push(task);
  });

  return groupedTasks;
};

/**
 * Calculates week number relative to January 5th, 2025.
 */
export const getWeekNumber = (date) => {
  const startDate = new Date("2025-01-05");
  const timeDifference = date - startDate;
  const daysDifference = timeDifference / (1000 * 60 * 60 * 24);
  return Math.floor(daysDifference / 7) + 1;
};

/**
 * Returns formatted date range for a given week number.
 */
export const getWeekDateRange = (week) => {
  const startDate = new Date(2025, 0, 5);
  const startOfWeek = new Date(startDate.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);

  const formatDate = (date) =>
    date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
};

/**
 * Counts reasons and categorizes tasks.
 */
export const countReasonsAndCategories = (tasks) => {
  const reasons = {};
  const categories = {
    detractor: 0,
    neutral: 0,
    promoter: 0,
  };

  tasks.forEach((task) => {
    if (!task.reason) return;

    if (!reasons[task.reason]) {
      reasons[task.reason] = 0;
    }
    reasons[task.reason]++;

    if (task.evaluationScore >= 1 && task.evaluationScore <= 6) {
      categories.detractor++;
    } else if (task.evaluationScore >= 7 && task.evaluationScore <= 8) {
      categories.neutral++;
    } else if (task.evaluationScore >= 9 && task.evaluationScore <= 10) {
      categories.promoter++;
    }
  });

  return { reasons, categories };
};

/**
 * Compares reason counts between two weeks.
 */
export const compareReasons = (currentReasons, previousReasons) => {
  const comparison = {};

  Object.keys(currentReasons).forEach((reason) => {
    const currentCount = currentReasons[reason];
    const previousCount = previousReasons[reason] || 0;
    comparison[reason] = currentCount - previousCount;
  });

  return comparison;
};

/**
 * Calculates weekly trends for reasons and categories.
 */
export const calculateReasonTrends = (groupedTasks) => {
  const weeks = Object.keys(groupedTasks).sort((a, b) => Number(a) - Number(b));
  const trends = [];

  weeks.forEach((week, index) => {
    const currentWeekTasks = groupedTasks[week];
    const previousWeekTasks = groupedTasks[weeks[index - 1]] || [];

    const { reasons: currentWeekReasons, categories: currentWeekCategories } =
      countReasonsAndCategories(currentWeekTasks);
    const { reasons: previousWeekReasons } = countReasonsAndCategories(previousWeekTasks);

    trends.push({
      week: Number(week),
      totalTasks: currentWeekTasks.length,
      reasons: currentWeekReasons,
      categories: currentWeekCategories,
      comparison: index === 0 ? null : compareReasons(currentWeekReasons, previousWeekReasons),
    });
  });

  return trends;
};

/**
 * Counts violations per team up to a specific week.
 */
export const countViolationsPerTeam = (groupedTasks, currentWeek) => {
  const violations = {};

  Object.keys(groupedTasks)
    .filter((week) => parseInt(week) <= currentWeek)
    .forEach((week) => {
      const tasks = groupedTasks[week];

      tasks.forEach((task) => {
        if (!task.teamName) return;

        if (!violations[task.teamName]) {
          violations[task.teamName] = {
            teamName: task.teamName,
            totalViolations: 0,
            currentWeekViolations: 0,
            currentWeekDetractors: 0,
            currentWeekNeutrals: 0,
            totalDetractors: 0,
            totalNeutrals: 0,
            violatedWeeks: new Set(),
          };
        }

        violations[task.teamName].totalViolations++;

        if (task.evaluationScore >= 1 && task.evaluationScore <= 6) {
          violations[task.teamName].totalDetractors++;
        }
        if (task.evaluationScore >= 7 && task.evaluationScore <= 8) {
          violations[task.teamName].totalNeutrals++;
        }

        const taskWeek = getWeekNumber(new Date(task.interviewDate));
        violations[task.teamName].violatedWeeks.add(taskWeek);

        if (taskWeek === currentWeek) {
          violations[task.teamName].currentWeekViolations++;
          if (task.evaluationScore >= 1 && task.evaluationScore <= 6) {
            violations[task.teamName].currentWeekDetractors++;
          }
          if (task.evaluationScore >= 7 && task.evaluationScore <= 8) {
            violations[task.teamName].currentWeekNeutrals++;
          }
        }
      });
    });

  return Object.values(violations).map(v => ({
    ...v,
    violatedWeeks: Array.from(v.violatedWeeks).sort((a, b) => a - b)
  }));
};

/**
 * Calculates weekly trends for team violations.
 */
export const calculateTeamViolationTrends = (groupedTasks) => {
  const weeks = Object.keys(groupedTasks).sort((a, b) => Number(a) - Number(b));
  const trends = [];

  weeks.forEach((week) => {
    const allViolations = countViolationsPerTeam(groupedTasks, parseInt(week));
    const currentWeekTasks = groupedTasks[week] || [];
    const currentWeekTeams = new Set(currentWeekTasks.map(task => task.teamName));

    const violations = allViolations.filter(v => currentWeekTeams.has(v.teamName));

    trends.push({
      week: Number(week),
      violations,
    });
  });

  return trends;
};
