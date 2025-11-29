// Helper function to prepare comprehensive analytics data for AI
export const prepareWeeklyAnalyticsData = (tasks) => {
  // Helper to get week number
  Date.prototype.getWeek = function () {
    const onejan = new Date(this.getFullYear(), 0, 1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  };

  // Monthly Summary
  const monthlyReport = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.validationStatus === 'Validated').length,
    pendingTasks: tasks.filter(t => t.validationStatus !== 'Validated').length,
    highPriorityTasks: tasks.filter(t => t.priority === 'High').length,
  };

  // Weekly Breakdown with violations and trending reasons
  const weeks = {};
  tasks.forEach(task => {
    const weekNum = new Date(task.createdAt).getWeek();
    if (!weeks[weekNum]) {
      weeks[weekNum] = {
        violations: 0,
        reasons: {},
        governorates: {},
        priorities: { High: 0, Medium: 0, Low: 0 }
      };
    }
    weeks[weekNum].violations++;
    weeks[weekNum].reasons[task.reason] = (weeks[weekNum].reasons[task.reason] || 0) + 1;
    weeks[weekNum].governorates[task.governorate] = (weeks[weekNum].governorates[task.governorate] || 0) + 1;
    weeks[weekNum].priorities[task.priority]++;
  });

  // Get top trending reason for each week
  Object.keys(weeks).forEach(week => {
    const reasons = weeks[week].reasons;
    const topReason = Object.keys(reasons).reduce((a, b) => reasons[a] > reasons[b] ? a : b, '');
    weeks[week].trendingReason = topReason;
    weeks[week].trendingReasonCount = reasons[topReason];
  });

  // Overall Statistics
  const byPriority = {
    high: tasks.filter(t => t.priority === 'High').length,
    medium: tasks.filter(t => t.priority === 'Medium').length,
    low: tasks.filter(t => t.priority === 'Low').length
  };

  const byGovernorate = tasks.reduce((acc, t) => {
    acc[t.governorate] = (acc[t.governorate] || 0) + 1;
    return acc;
  }, {});

  // Top 5 reasons overall
  const reasons = {};
  tasks.forEach(t => {
    reasons[t.reason] = (reasons[t.reason] || 0) + 1;
  });
  const topReasons = Object.entries(reasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});

  return {
    monthlyReport,
    weeklyAnalysis: weeks,
    byPriority,
    byGovernorate,
    topReasons
  };
};
