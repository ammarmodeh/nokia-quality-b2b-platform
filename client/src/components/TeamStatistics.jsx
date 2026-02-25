import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Tabs, Tab, Chip, Divider, Grid,
  CircularProgress, Button
} from '@mui/material';
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';
import {
  Assessment, Summarize, TrendingUp, CompareArrows, CheckCircleOutline,
  WarningAmber, Timeline, StackedBarChart, TrendingDown,
  Score, FileDownload
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import api from '../api/api';
import { parseISO, startOfWeek, getYear, startOfYear, eachWeekOfInterval } from 'date-fns';
import * as XLSX from 'xlsx';

const TeamStatistics = ({ team, tabValue, setTabValue, colors, prepareViolationReasonsData, prepareViolationTrendData, prepareViolationRateData }) => {
  const [teamTasks, setTeamTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState(null);

  // Fetch tasks for the selected team
  useEffect(() => {
    const fetchTeamTasks = async () => {
      if (!team?.teamId?._id) return;

      setLoadingTasks(true);
      setError(null);
      try {
        const response = await api.get('/tasks/get-all-tasks', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        const filteredTasks = response.data.filter(task => task.teamId === team.teamId._id);
        setTeamTasks(filteredTasks);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching team tasks:', err);
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchTeamTasks();
  }, [team?.teamId?._id]);

  if (!team) return null;

  const hasCompletedSession = team.sessionHistory?.some(session => session.status === "Completed");

  // Prepare tasks score data specifically for the selected team
  const prepareTasksScoreData = () => {
    if (!teamTasks || teamTasks.length === 0) return null;

    const detractors = teamTasks.filter(task => task.evaluationScore >= 1 && task.evaluationScore <= 6).length;
    const neutrals = teamTasks.filter(task => task.evaluationScore >= 7 && task.evaluationScore <= 8).length;
    const highPriority = teamTasks.filter(task => task.priority === "High").length;
    const mediumPriority = teamTasks.filter(task => task.priority === "Medium").length;
    const lowPriority = teamTasks.filter(task => task.priority === "Low").length;
    const scoredTasks = teamTasks.filter(task => task.evaluationScore);
    const totalScoredTasks = scoredTasks.length;

    // Calculate individual score percentages
    const scoreCounts = {};
    for (let score = 1; score <= 8; score++) {
      scoreCounts[score] = scoredTasks.filter(task => task.evaluationScore === score).length;
    }
    const scorePercentages = Object.keys(scoreCounts).map(score => ({
      score: parseInt(score),
      percentage: totalScoredTasks > 0 ? ((scoreCounts[score] / totalScoredTasks) * 100).toFixed(1) : 0
    })).filter(item => item.percentage > 0); // Only include scores with non-zero percentages

    return {
      scoreDistribution: {
        labels: ['Detractors (1-6)', 'Neutrals (7-8)'],
        datasets: [{
          data: [detractors, neutrals],
          backgroundColor: [colors.error, colors.warning],
          borderColor: [colors.error, colors.warning],
          borderWidth: 1
        }]
      },
      priorityDistribution: {
        labels: ['High', 'Medium', 'Low'],
        datasets: [{
          data: [highPriority, mediumPriority, lowPriority],
          backgroundColor: [colors.error, colors.warning, colors.success],
          borderColor: [colors.error, colors.warning, colors.success],
          borderWidth: 1
        }]
      },
      totalTasks: teamTasks.length,
      highPriorityPercentage: teamTasks.length > 0 ? (highPriority / teamTasks.length) * 100 : 0,
      scoredTasksCount: totalScoredTasks,
      detractorsPercentage: totalScoredTasks > 0 ? (detractors / totalScoredTasks * 100).toFixed(1) : 0,
      neutralsPercentage: totalScoredTasks > 0 ? (neutrals / totalScoredTasks * 100).toFixed(1) : 0,
      scorePercentages
    };
  };

  const tasksScoreData = prepareTasksScoreData();

  const renderSummary = () => (
    <TableContainer component={Paper} sx={{
      mb: 4,
      backgroundColor: colors.surface,
      boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)',
      border: `1px solid ${colors.border}`,
      borderRadius: '8px'
    }}>
      <Table>
        <TableHead>
          <TableRow sx={{
            backgroundColor: 'rgba(62, 166, 255, 0.1)',
            '& th': { fontWeight: '600', fontSize: '0.875rem' }
          }}>
            <TableCell sx={{ color: colors.textPrimary }}>METRIC</TableCell>
            <TableCell sx={{ color: colors.textPrimary }} align="right">VALUE</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell sx={{ color: colors.textSecondary, fontWeight: '500', borderBottom: `1px solid ${colors.border}` }}>
              Total Violations
            </TableCell>
            <TableCell sx={{ color: colors.error, fontWeight: '600', borderBottom: `1px solid ${colors.border}` }} align="right">
              {team.totalViolations}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderDetailedStatistics = () => (
    <>
      <TableRow>
        <TableCell sx={{ color: colors.textSecondary, fontWeight: '500', borderBottom: `1px solid ${colors.border}` }}>
          First Violation Date
        </TableCell>
        <TableCell sx={{ color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }} align="right">
          {team.firstViolationDate ? (
            <Chip
              label={new Date(team.firstViolationDate).toLocaleDateString()}
              size="small"
              sx={{ bgcolor: '#9b9b9b' }}
            />
          ) : (
            <Chip label="No violations" size="small" sx={{ bgcolor: colors.success, color: colors.textPrimary }} />
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell sx={{ color: colors.textSecondary, fontWeight: '500', borderBottom: `1px solid ${colors.border}` }}>
          Last Training Date
        </TableCell>
        <TableCell sx={{ color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }} align="right">
          {team.mostRecentTrainingDate ? (
            <Chip
              label={new Date(team.mostRecentTrainingDate).toLocaleDateString()}
              size="small"
              sx={{ bgcolor: colors.primary, color: colors.textPrimary }}
            />
          ) : (
            <Chip label="Not trained yet" size="small" sx={{ bgcolor: colors.border, color: colors.textPrimary }} />
          )}
        </TableCell>
      </TableRow>
      {team.mostRecentTrainingDate && (
        <>
          <TableRow>
            <TableCell sx={{ color: colors.textSecondary, fontWeight: '500', borderBottom: `1px solid ${colors.border}` }}>
              Days Since Year Start
            </TableCell>
            <TableCell sx={{ color: colors.primary, borderBottom: `1px solid ${colors.border}` }} align="right">
              {team.daysFromCurrentYearStart}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ color: colors.textSecondary, fontWeight: '500', borderBottom: `1px solid ${colors.border}` }}>
              Days Since Training
            </TableCell>
            <TableCell sx={{ color: colors.error, borderBottom: `1px solid ${colors.border}` }} align="right">
              {team.daysAfterTraining}
            </TableCell>
          </TableRow>
        </>
      )}
      <TableRow>
        <TableCell sx={{ color: colors.textSecondary, fontWeight: '500', borderBottom: `1px solid ${colors.border}` }}>
          Total Violations
        </TableCell>
        <TableCell sx={{ color: colors.textPrimary, fontWeight: '600', borderBottom: `1px solid ${colors.border}` }} align="right">
          {team.totalViolations}
        </TableCell>
      </TableRow>
      {team.mostRecentTrainingDate && (
        <>
          <TableRow>
            <TableCell sx={{ color: colors.textSecondary, fontWeight: '500', borderBottom: `1px solid ${colors.border}` }}>
              Violations Before Training
            </TableCell>
            <TableCell sx={{ color: colors.primary, borderBottom: `1px solid ${colors.border}` }} align="right">
              {team.violationsBeforeTraining}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ color: colors.textSecondary, fontWeight: '500', borderBottom: `1px solid ${colors.border}` }}>
              Violations After Training
            </TableCell>
            <TableCell sx={{ color: colors.error, borderBottom: `1px solid ${colors.border}` }} align="right">
              {team.violationsAfterTraining}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ color: colors.textSecondary, fontWeight: '500', borderBottom: `1px solid ${colors.border}` }}>
              Violation Rate (Before)
            </TableCell>
            <TableCell sx={{ color: colors.primary, borderBottom: `1px solid ${colors.border}` }} align="right">
              {team.violationRateBefore} <Typography component="span" variant="caption" sx={{ color: colors.textSecondary }}>per day</Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ color: colors.textSecondary, fontWeight: '500', borderBottom: `1px solid ${colors.border}` }}>
              Violation Rate (After)
            </TableCell>
            <TableCell sx={{ color: colors.error, borderBottom: `1px solid ${colors.border}` }} align="right">
              {team.violationRateAfter} <Typography component="span" variant="caption" sx={{ color: colors.textSecondary }}>per day</Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ color: colors.textSecondary, fontWeight: '500' }}>
              Improvement
            </TableCell>
            <TableCell sx={{
              color: team.improvementPercentage > 0 ? colors.success : team.improvementPercentage < 0 ? colors.error : colors.warning,
              fontWeight: '600'
            }} align="right">
              {(() => {
                if (!team.daysAfterTraining || team.daysAfterTraining < 7) {
                  return <Chip label="Insufficient data" size="small" sx={{ bgcolor: colors.border, color: colors.textPrimary }} />;
                }
                const rateBefore = team.violationsBeforeTraining / team.daysFromCurrentYearStart;
                const rateAfter = team.violationsAfterTraining / team.daysAfterTraining;
                let improvement = 0;
                if (rateBefore > 0) {
                  improvement = ((rateBefore - rateAfter) / rateBefore) * 100;
                } else if (rateAfter > 0) {
                  return <Chip label="New violations" size="small" sx={{ bgcolor: colors.error, color: colors.textPrimary }} />;
                }
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {improvement > 0 ? '↑' : improvement < 0 ? '↓' : ''}
                    {Math.abs(improvement).toFixed(1)}%
                    {improvement > 0 ? (
                      <CheckCircleOutline fontSize="small" sx={{ color: colors.success, ml: 0.5, verticalAlign: 'middle' }} />
                    ) : improvement < 0 ? (
                      <WarningAmber fontSize="small" sx={{ color: colors.error, ml: 0.5, verticalAlign: 'middle' }} />
                    ) : null}
                  </Box>
                );
              })()}
            </TableCell>
          </TableRow>
        </>
      )}
    </>
  );

  const getWeekKey = (date) => {
    if (!date) return null;
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const year = getYear(weekStart);
    const weekNumber = Math.ceil((weekStart - startOfYear(weekStart)) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${weekNumber}`;
  };

  const allWeeks = () => {
    const weeksSet = new Set();
    const years = new Set();

    teamTasks.forEach(task => {
      const dateToUse = task.createdAt || task.updatedAt;
      if (dateToUse) {
        try {
          const parsedDate = parseISO(dateToUse);
          if (!isNaN(parsedDate.getTime())) {
            years.add(getYear(parsedDate));
          }
        } catch (e) {
          console.warn('Invalid date format:', dateToUse);
        }
      }
    });

    if (years.size === 0) {
      years.add(getYear(new Date()));
    }

    years.forEach(year => {
      const start = startOfYear(new Date(year, 0, 1));
      const end = new Date(year, 11, 31);
      const weeksInYear = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 });
      weeksInYear.forEach(weekStart => {
        const weekKey = getWeekKey(weekStart);
        if (weekKey) weeksSet.add(weekKey);
      });
    });

    return Array.from(weeksSet).sort((a, b) => {
      const [yearA, weekA] = a.split('-W').map(Number);
      const [yearB, weekB] = b.split('-W').map(Number);
      return yearA !== yearB ? yearA - yearB : weekA - weekB;
    });
  };

  const prepareTasksByWeekData = () => {
    const weeks = allWeeks();
    const tasksByWeek = weeks.map(week => {
      return teamTasks.filter(task => {
        const taskDate = task.interviewDate;
        if (!taskDate) return false;
        try {
          const parsedDate = parseISO(taskDate);
          const taskWeek = getWeekKey(parsedDate);
          return taskWeek === week;
        } catch (e) {
          return false;
        }
      }).length;
    });

    return {
      labels: weeks.map(week => {
        const [year, weekNum] = week.split('-W');
        return `Week ${weekNum}`;
      }),
      datasets: [{
        label: 'Tasks by Week',
        data: tasksByWeek,
        borderColor: colors.primary,
        backgroundColor: colors.primary,
        tension: 0
      }]
    };
  };

  const handleExportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Metric', 'Value'],
      ['Team Name', team.teamName],
      ['Total Violations', team.totalViolations]
    ];

    if (hasCompletedSession) {
      summaryData.push(['First Violation Date', team.firstViolationDate ? new Date(team.firstViolationDate).toLocaleDateString() : 'No violations']);
      summaryData.push(['Last Training Date', team.mostRecentTrainingDate ? new Date(team.mostRecentTrainingDate).toLocaleDateString() : 'Not trained yet']);
      if (team.mostRecentTrainingDate) {
        summaryData.push(['Days Since Year Start', team.daysFromCurrentYearStart]);
        summaryData.push(['Days Since Training', team.daysAfterTraining]);
        summaryData.push(['Violations Before Training', team.violationsBeforeTraining]);
        summaryData.push(['Violations After Training', team.violationsAfterTraining]);
        summaryData.push(['Violation Rate (Before)', `${team.violationRateBefore} per day`]);
        summaryData.push(['Violation Rate (After)', `${team.violationRateAfter} per day`]);
        if (team.daysAfterTraining >= 7) {
          const rateBefore = team.violationsBeforeTraining / team.daysFromCurrentYearStart;
          const rateAfter = team.violationsAfterTraining / team.daysAfterTraining;
          let improvementText = 'No change';
          if (rateBefore > 0) {
            const improvement = ((rateBefore - rateAfter) / rateBefore) * 100;
            improvementText = `${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`;
          } else if (rateAfter > 0) {
            improvementText = 'New violations';
          }
          summaryData.push(['Improvement', improvementText]);
        } else {
          summaryData.push(['Improvement', 'Insufficient data']);
        }
      }
    }

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Violation Breakdown Sheet
    if (team.violationPercentages && team.violationPercentages.length > 0) {
      const violationData = [['Reason', 'Total', 'Before', 'After', 'Change']];
      team.violationPercentages
        .sort((a, b) => b.percentage - a.percentage)
        .forEach(violation => {
          const vr = team.violationReasons[violation.reason] || { before: 0, after: 0, total: 0 };
          const before = vr.before;
          const after = vr.after;
          let changeStr = '—';
          if (before === 0 && after > 0) {
            changeStr = 'NEW';
          } else if (before > 0) {
            const change = ((after - before) / before) * 100;
            changeStr = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
          }
          violationData.push([violation.reason, vr.total, before, after, changeStr]);
        });

      const wsViolations = XLSX.utils.aoa_to_sheet(violationData);
      XLSX.utils.book_append_sheet(wb, wsViolations, 'Violation Breakdown');
    }

    // Tasks Summary Sheet
    if (tasksScoreData) {
      const tasksSummaryData = [
        ['Total Violations', tasksScoreData.totalTasks],
        ['Detractors (1-6)', `${tasksScoreData.detractorsPercentage}%`],
        ['Neutrals (7-8)', `${tasksScoreData.neutralsPercentage}%`],
        // ['High Severity', `${tasksScoreData.highPriorityPercentage.toFixed(1)}%`],
        [],
        ['Score Distribution']
      ];
      tasksScoreData.scoreDistribution.labels.forEach((label, i) => {
        tasksSummaryData.push([label, tasksScoreData.scoreDistribution.datasets[0].data[i]]);
      });
      tasksSummaryData.push([]);
      tasksSummaryData.push(['Severity Distribution']);
      tasksScoreData.priorityDistribution.labels.forEach((label, i) => {
        tasksSummaryData.push([label, tasksScoreData.priorityDistribution.datasets[0].data[i]]);
      });
      tasksSummaryData.push([]);
      tasksSummaryData.push(['Individual Score Breakdown']);
      tasksScoreData.scorePercentages.forEach(item => {
        tasksSummaryData.push([`Score ${item.score}`, `${item.percentage}%`]);
      });

      const wsTasksSummary = XLSX.utils.aoa_to_sheet(tasksSummaryData);
      XLSX.utils.book_append_sheet(wb, wsTasksSummary, 'Violations Summary');
    }

    // Tasks List Sheet
    if (teamTasks.length > 0) {
      const tasksListData = [['SLID', 'Score', 'Priority', 'Interview Date', 'Customer Feedback']];
      teamTasks.forEach(task => {
        tasksListData.push([
          task.slid,
          task.evaluationScore || 'N/A',
          task.priority,
          task.interviewDate ? new Date(task.interviewDate).toLocaleDateString() : 'N/A',
          task.customerFeedback || 'N/A'
        ]);
      });

      const wsTasksList = XLSX.utils.aoa_to_sheet(tasksListData);
      XLSX.utils.book_append_sheet(wb, wsTasksList, 'Violations List');
    }

    // Tasks by Week Sheet
    if (teamTasks.length > 0) {
      const tasksByWeek = prepareTasksByWeekData();
      const tasksByWeekData = [['Week', 'Violations']];
      tasksByWeek.labels.forEach((label, i) => {
        tasksByWeekData.push([label, tasksByWeek.datasets[0].data[i]]);
      });

      const wsTasksByWeek = XLSX.utils.aoa_to_sheet(tasksByWeekData);
      XLSX.utils.book_append_sheet(wb, wsTasksByWeek, 'Violations by Week');
    }

    XLSX.writeFile(wb, `${team.teamName}_Performance_Statistics_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ color: colors.primary, fontWeight: '600', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment fontSize="medium" /> Team Performance Analytics
        </Typography>
        <Button variant="outlined" startIcon={<FileDownload />} onClick={handleExportToExcel} sx={{ textTransform: 'none' }}>
          Export to Excel
        </Button>
      </Box>

      <Tabs
        value={tabValue}
        onChange={(e, newValue) => setTabValue(newValue)}
        sx={{ mb: 3, '& .MuiTabs-indicator': { backgroundColor: colors.primary, height: 3 } }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab icon={<Summarize fontSize="small" />} label="Summary" sx={{ minHeight: 48, color: colors.textSecondary, '&.Mui-selected': { color: colors.primary } }} />
        <Tab icon={<TrendingUp fontSize="small" />} label="Violation Trends" sx={{ minHeight: 48, color: colors.textSecondary, '&.Mui-selected': { color: colors.primary } }} />
        <Tab icon={<CompareArrows fontSize="small" />} label="Rates Comparison" sx={{ minHeight: 48, color: colors.textSecondary, '&.Mui-selected': { color: colors.primary } }} />
        <Tab icon={<Score fontSize="small" />} label="Score Breakdown" sx={{ minHeight: 48, color: colors.textSecondary, '&.Mui-selected': { color: colors.primary } }} />
      </Tabs>

      {tabValue === 0 && (
        <TableContainer component={Paper} sx={{ mb: 4, backgroundColor: colors.surface, boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)', border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(62, 166, 255, 0.1)', '& th': { fontWeight: '600', fontSize: '0.875rem' } }}>
                <TableCell sx={{ color: colors.textPrimary }}>METRIC</TableCell>
                <TableCell sx={{ color: colors.textPrimary }} align="right">VALUE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {hasCompletedSession ? renderDetailedStatistics() : renderSummary()}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tabValue === 1 && hasCompletedSession && team.violationPercentages && team.violationPercentages.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ color: colors.textPrimary, fontWeight: '600', display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp fontSize="small" /> Violation Trends Analysis
          </Typography>
          <Box sx={{ height: '400px', mb: 4 }}>
            {prepareViolationReasonsData(team) && (
              <Bar
                data={prepareViolationReasonsData(team)}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top', labels: { color: colors.textPrimary, font: { weight: '500' } } },
                    tooltip: {
                      backgroundColor: colors.surface,
                      titleColor: colors.textPrimary,
                      bodyColor: colors.textPrimary,
                      borderColor: colors.border,
                      borderWidth: 1,
                      padding: 12,
                      callbacks: { label: context => `${context.dataset.label}: ${context.raw}` }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: 'Percentage of Violations', color: colors.textSecondary, font: { weight: '500' } },
                      ticks: { color: colors.textSecondary },
                      grid: { color: colors.border, drawBorder: false }
                    },
                    x: { ticks: { color: colors.textSecondary }, grid: { display: false } }
                  }
                }}
              />
            )}
          </Box>
          <Typography variant="subtitle1" gutterBottom sx={{ color: colors.textPrimary, fontWeight: '600', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Timeline fontSize="small" /> Violation Frequency by Reason
          </Typography>
          <Box sx={{ height: '400px' }}>
            {prepareViolationTrendData(team) && (
              <Line
                data={prepareViolationTrendData(team)}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top', labels: { color: colors.textPrimary, font: { weight: '500' } } },
                    tooltip: {
                      backgroundColor: colors.surface,
                      titleColor: colors.textPrimary,
                      bodyColor: colors.textPrimary,
                      borderColor: colors.border,
                      borderWidth: 1,
                      padding: 12
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: 'Number of Violations', color: colors.textSecondary, font: { weight: '500' } },
                      ticks: { color: colors.textSecondary },
                      grid: { color: colors.border, drawBorder: false }
                    },
                    x: { ticks: { color: colors.textSecondary }, grid: { color: colors.border, drawBorder: false } }
                  }
                }}
              />
            )}
          </Box>
        </Box>
      )}

      {tabValue === 2 && hasCompletedSession && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ color: colors.textPrimary, fontWeight: '600', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CompareArrows fontSize="small" /> Violation Rates Comparison
          </Typography>
          <Box sx={{ height: '300px' }}>
            <Bar
              data={prepareViolationRateData(team)}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: colors.surface,
                    titleColor: colors.textPrimary,
                    bodyColor: colors.textPrimary,
                    borderColor: colors.border,
                    borderWidth: 1,
                    padding: 12,
                    callbacks: { label: context => `${context.raw} violations per day` }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Violations per Day', color: colors.textSecondary, font: { weight: '500' } },
                    ticks: { color: colors.textSecondary },
                    grid: { color: colors.border, drawBorder: false }
                  },
                  x: { ticks: { color: colors.textSecondary }, grid: { display: false } }
                }
              }}
            />
          </Box>
          {team.mostRecentTrainingDate && (
            <>
              <Divider sx={{ my: 3, borderColor: colors.border }} />
              <Typography variant="subtitle1" gutterBottom sx={{ color: colors.textPrimary, fontWeight: '600', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment fontSize="small" /> Training Effectiveness Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: colors.surface, boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)', border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
                    <Typography variant="body1" sx={{ color: colors.textPrimary, fontWeight: '600', mb: 1 }}>
                      Time Period Analysis
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 0.5 }}>
                          Before Training:
                        </Typography>
                        <Typography variant="body1" sx={{ color: colors.primary, fontWeight: '600' }}>
                          {team.daysFromCurrentYearStart} days
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 0.5 }}>
                          After Training:
                        </Typography>
                        <Typography variant="body1" sx={{ color: colors.error, fontWeight: '600' }}>
                          {team.daysAfterTraining} days
                        </Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ borderColor: colors.border }} />
                    <Typography variant="body1" sx={{ color: colors.textPrimary, fontWeight: '600', mt: 2, mb: 1 }}>
                      Violation Count Comparison
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 0.5 }}>
                          Before:
                        </Typography>
                        <Typography variant="body1" sx={{ color: colors.primary, fontWeight: '600' }}>
                          {team.violationsBeforeTraining}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 0.5 }}>
                          After:
                        </Typography>
                        <Typography variant="body1" sx={{ color: colors.error, fontWeight: '600' }}>
                          {team.violationsAfterTraining}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: colors.surface, boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)', border: `1px solid ${team.improvementPercentage > 0 ? colors.success : colors.error}`, borderRadius: '8px' }}>
                    <Typography variant="body1" sx={{ color: colors.textPrimary, fontWeight: '600', mb: 1 }}>
                      Improvement Analysis
                    </Typography>
                    <Typography variant="body2" sx={{ color: team.improvementPercentage > 0 ? colors.success : colors.error, fontWeight: '600', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      {team.improvementPercentage > 0 ? <CheckCircleOutline fontSize="small" /> : <WarningAmber fontSize="small" />}
                      {team.improvementPercentage > 0 ? 'Positive' : 'Negative'} change: {Math.abs(team.improvementPercentage).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: colors.textSecondary, lineHeight: 1.6 }}>
                      {team.improvementPercentage >= 75
                        ? 'Outstanding improvement observed; the training has had a transformative impact on team performance.'
                        : team.improvementPercentage >= 50
                          ? 'Strong improvement noted; the training is proving highly effective.'
                          : team.improvementPercentage >= 25
                            ? 'Moderate improvement detected; continued monitoring and minor reinforcement may be beneficial.'
                            : team.improvementPercentage > 0
                              ? 'Slight improvement noted; consider additional support or targeted retraining.'
                              : team.improvementPercentage === 0
                                ? 'No measurable improvement; training effectiveness needs evaluation.'
                                : 'Performance declined after training; immediate investigation and corrective action are recommended.'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      )}

      {tabValue === 3 && (
        <Box sx={{ mb: 4 }}>
          {loadingTasks ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Paper sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', backgroundColor: colors.surface, border: `1px solid ${colors.error}`, borderRadius: '8px' }}>
              <Typography variant="body1" sx={{ color: colors.error }}>
                Error loading data: {error}
              </Typography>
            </Paper>
          ) : tasksScoreData ? (
            <>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px', height: '100%' }}>
                    <Typography variant="body1" sx={{ color: colors.textSecondary, mb: 1 }}>
                      Total Violations
                    </Typography>
                    <Typography variant="h4" sx={{ color: colors.primary, fontWeight: '600' }}>
                      {tasksScoreData.totalTasks}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px', height: '100%' }}>
                    <Typography variant="body1" sx={{ color: colors.textSecondary, mb: 1 }}>
                      Score Breakdown
                    </Typography>
                    <Typography variant="body2" sx={{ color: colors.error, fontWeight: '600', mb: 0.5 }}>
                      Detractors (1-6): {tasksScoreData.detractorsPercentage}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: colors.warning, fontWeight: '600', mb: 1 }}>
                      Neutrals (7-8): {tasksScoreData.neutralsPercentage}%
                    </Typography>
                    {tasksScoreData.scorePercentages.map((item, index) => (
                      <Typography key={index} variant="caption" sx={{ color: colors.textSecondary, display: 'block' }}>
                        {item.score} {item.percentage}%
                      </Typography>
                    ))}
                  </Paper>
                </Grid>
              </Grid>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%', backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ color: colors.textPrimary, fontWeight: '600' }}>
                      Score Distribution for {team.teamName}
                    </Typography>
                    {tasksScoreData.scoreDistribution && (
                      <Box sx={{ height: '300px' }}>
                        <Doughnut
                          data={tasksScoreData.scoreDistribution}
                          options={{
                            plugins: {
                              tooltip: {
                                callbacks: {
                                  label: context => {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((context.raw / total) * 100);
                                    return `${context.label}: ${context.raw} (${percentage}%)`;
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </Box>
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%', backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ color: colors.textPrimary, fontWeight: '600' }}>
                      Severity Distribution for {team.teamName}
                    </Typography>
                    {tasksScoreData.priorityDistribution && (
                      <Box sx={{ height: '300px' }}>
                        <Pie
                          data={tasksScoreData.priorityDistribution}
                          options={{
                            plugins: {
                              tooltip: {
                                callbacks: {
                                  label: context => {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((context.raw / total) * 100);
                                    return `${context.label}: ${context.raw} (${percentage}%)`;
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>
              <Paper sx={{ mt: 3, p: 2, backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
                <Typography variant="subtitle1" gutterBottom sx={{ color: colors.textPrimary, fontWeight: '600' }}>
                  All Violations for {team.teamName}
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: colors.textPrimary }}>SLID</TableCell>
                        <TableCell sx={{ color: colors.textPrimary }}>Score</TableCell>
                        <TableCell sx={{ color: colors.textPrimary }}>Feedback Severity</TableCell>
                        <TableCell sx={{ color: colors.textPrimary }}>Interview Date</TableCell>
                        <TableCell sx={{ color: colors.textPrimary }}>Customer Feedback</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {teamTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((task, index) => (
                        <TableRow key={index}>
                          <TableCell sx={{ color: colors.textPrimary }}>{task.slid}</TableCell>
                          <TableCell sx={{
                            color: !task.evaluationScore ? colors.textSecondary :
                              task.evaluationScore >= 9 ? colors.success :
                                task.evaluationScore >= 7 ? colors.warning : colors.error,
                            fontWeight: '600'
                          }}>
                            {task.evaluationScore || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={task.priority}
                              size="small"
                              sx={{
                                backgroundColor: task.priority === 'High' ? colors.error :
                                  task.priority === 'Medium' ? colors.warning : colors.success,
                                color: colors.textPrimary
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: colors.textPrimary }}>
                            {task.interviewDate ? new Date(task.interviewDate).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell sx={{ color: colors.textPrimary, maxWidth: '300px', whiteSpace: 'normal' }}>
                            {task.customerFeedback || 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          ) : (
            <Paper sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
              <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                No violations found for {team.teamName}
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {tabValue === 3 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ color: colors.textPrimary, fontWeight: '600', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Timeline fontSize="small" /> Violations by Week for {team.teamName}
          </Typography>
          <Box sx={{ height: '400px' }}>
            {teamTasks.length > 0 ? (
              <Line
                data={prepareTasksByWeekData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top', labels: { color: colors.textPrimary } },
                    tooltip: { callbacks: { label: context => `${context.dataset.label}: ${context.raw}` } }
                  },
                  scales: {
                    y: { beginAtZero: true, ticks: { color: colors.textSecondary }, grid: { color: colors.border } },
                    x: { ticks: { color: colors.textSecondary }, grid: { color: colors.border } }
                  }
                }}
              />
            ) : (
              <Typography sx={{ color: colors.textSecondary, textAlign: 'center', py: 4 }}>
                No task data available
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {team.violationPercentages && team.violationPercentages.length > 0 && (
        <Paper sx={{ p: 3, mb: 4, backgroundColor: colors.surface, boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)', border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
          <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary, fontWeight: '600', display: 'flex', alignItems: 'center', gap: 1 }}>
            <StackedBarChart fontSize="small" /> Violation Reasons Breakdown
          </Typography>
          <TableContainer>
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(62, 166, 255, 0.1)', '& th': { fontWeight: '600', fontSize: '0.875rem' } }}>
                  <TableCell sx={{ color: colors.textPrimary }}>REASON</TableCell>
                  <TableCell sx={{ color: colors.textPrimary }} align="right">TOTAL</TableCell>
                  <TableCell sx={{ color: colors.textPrimary }} align="right">BEFORE</TableCell>
                  <TableCell sx={{ color: colors.textPrimary }} align="right">AFTER</TableCell>
                  <TableCell sx={{ color: colors.textPrimary }} align="right">CHANGE</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {team.violationPercentages.sort((a, b) => b.percentage - a.percentage).map((violation, index) => {
                  const vr = team.violationReasons[violation.reason] || { before: 0, after: 0, total: 0 };
                  const before = vr.before;
                  const after = vr.after;
                  let change = 0;
                  let changeFormatted = '0.0';
                  let changeSign = '→';
                  let isNew = false;

                  if (before !== 0) {
                    change = ((after - before) / before) * 100;
                    changeFormatted = Math.abs(change).toFixed(1);
                    changeSign = change < 0 ? '↑' : change > 0 ? '↓' : '→';
                  } else if (after > 0) {
                    isNew = true;
                  }

                  return (
                    <TableRow key={index} sx={{ '&:hover': { backgroundColor: colors.primaryHover } }}>
                      <TableCell sx={{ color: colors.textPrimary, fontWeight: '500' }}>
                        {violation.reason}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.textPrimary, fontWeight: '500' }}>
                        {vr.total}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.primary, fontWeight: '500' }}>
                        {before}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.error, fontWeight: '500' }}>
                        {after}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: '600' }}>
                        {isNew ? (
                          <Chip label="NEW" size="small" sx={{ bgcolor: colors.warning, color: colors.textPrimary }} />
                        ) : changeSign === '→' ? (
                          <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                            —
                          </Typography>
                        ) : (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', color: change < 0 ? colors.success : colors.error }}>
                            {changeSign} {changeFormatted}%
                            {change < 0 ? <TrendingUp fontSize="small" sx={{ ml: 0.5 }} /> : <TrendingDown fontSize="small" sx={{ ml: 0.5 }} />}
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default TeamStatistics;