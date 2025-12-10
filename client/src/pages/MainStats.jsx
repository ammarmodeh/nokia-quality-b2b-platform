import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Legend, Tooltip } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  Box, Typography, Paper,
  Button,
  ButtonGroup,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import api from '../api/api';
import AdvancedStatsDialog from '../components/AdvancedStatsDialog';
import GovernorateDetailsDialog from '../components/GovernorateDetailsDialog';
import { ExpandMore } from '@mui/icons-material';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const MainStats = () => {
  const colors = {
    background: '#2d2d2d',
    surface: '#ffffff',
    surfaceElevated: '#252525',
    border: '#e5e7eb',
    primary: '#7b68ee',
    primaryHover: 'rgba(62, 166, 255, 0.08)',
    textPrimary: '#ffffff',
    textSecondary: '#6b7280',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
  };

  const [tasksData, setTasksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    teamStats: [],
    categoryStats: {},
    priorityStats: {},
    statusStats: {},
    evaluationStats: {},
    reasonStats: {},
    governorateStats: {},
    responsibilityStats: {}
  });
  // console.log('stats.governorateStats:', stats.governorateStats);

  const [reasonView, setReasonView] = useState('highest'); // State to manage the current view
  const [advancedStatsOpen, setAdvancedStatsOpen] = useState(false);
  const [selectedDimension, setSelectedDimension] = useState('governorate');
  const [selectedTimeframe, setSelectedTimeframe] = useState('weekly');
  const [governorateDetailsOpen, setGovernorateDetailsOpen] = useState(false);
  const [selectedGovernorate, setSelectedGovernorate] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReasonDetails, setSelectedReasonDetails] = useState({
    reason: '',
    teams: {},
    governorates: {}
  });



  useEffect(() => {
    const fetchTasksData = async () => {
      try {
        const response = await api.get('/tasks/get-all-tasks', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        const tasks = response.data;
        setTasksData(tasks);
        const processedData = processTasksData(tasks);
        setStats(processedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasksData();
  }, []);

  const handleReasonClick = (reason) => {
    // Filter tasks that have this reason
    const tasksWithReason = tasksData.filter(task => task.reason === reason);

    // Count teams
    const teamsCount = tasksWithReason.reduce((acc, task) => {
      const team = task.teamName || 'Unknown';
      acc[team] = (acc[team] || 0) + 1;
      return acc;
    }, {});

    // Count governorates
    const governoratesCount = tasksWithReason.reduce((acc, task) => {
      const governorate = task.governorate || 'Unknown';
      acc[governorate] = (acc[governorate] || 0) + 1;
      return acc;
    }, {});

    setSelectedReasonDetails({
      reason,
      teams: teamsCount,
      governorates: governoratesCount
    });
    setDialogOpen(true);
  };

  // Add this function to handle opening the dialog
  const handleOpenAdvancedStats = (dimension) => {
    setSelectedDimension(dimension);
    setAdvancedStatsOpen(true);
  };

  const processTasksData = (tasks) => {
    // Group tasks by team
    const teams = tasks.reduce((acc, task) => {
      const teamName = task.teamName;
      if (!acc[teamName]) {
        acc[teamName] = [];
      }
      acc[teamName].push(task);
      return acc;
    }, {});

    // Calculate team statistics
    const teamStats = Object.entries(teams).map(([teamName, teamTasks]) => {
      const completedTasks = teamTasks.filter(task => task.status === 'Done').length;
      const avgEvaluation = teamTasks.reduce((sum, task) => sum + (task.evaluationScore || 0), 0) / teamTasks.length;

      return {
        teamName,
        taskCount: teamTasks.length,
        completedTasks,
        completionRate: (completedTasks / teamTasks.length) * 100,
        avgEvaluation: isNaN(avgEvaluation) ? 0 : avgEvaluation
      };
    });

    // Calculate category statistics
    const categoryStats = tasks.reduce((acc, task) => {
      const category = task.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = {
          count: 0,
          totalEvaluation: 0,
          completed: 0
        };
      }
      acc[category].count++;
      acc[category].totalEvaluation += task.evaluationScore || 0;
      if (task.status === 'Done') acc[category].completed++;
      return acc;
    }, {});

    // Calculate priority statistics
    const priorityStats = tasks.reduce((acc, task) => {
      const priority = task.priority || 'Not specified';
      if (!acc[priority]) {
        acc[priority] = 0;
      }
      acc[priority]++;
      return acc;
    }, {});

    // Calculate status statistics
    const statusStats = tasks.reduce((acc, task) => {
      const status = task.status || 'Not specified';
      if (!acc[status]) {
        acc[status] = 0;
      }
      acc[status]++;
      return acc;
    }, {});

    // Calculate Satisfaction Score distribution
    const evaluationStats = tasks.reduce((acc, task) => {
      const score = Math.floor(task.evaluationScore || 0);
      if (!acc[score]) {
        acc[score] = 0;
      }
      acc[score]++;
      return acc;
    }, {});

    const evaluationScoreStats = {
      total: tasks.length,
      average: tasks.reduce((sum, task) => sum + (task.evaluationScore || 0), 0) / tasks.length,
      detractors: tasks.filter(task => (task.evaluationScore || 0) <= 6).length,
      neutrals: tasks.filter(task => (task.evaluationScore || 0) >= 7 && (task.evaluationScore || 0) <= 8).length,
    };

    const scoreReasons = tasks.reduce((acc, task) => {
      const score = task.evaluationScore || 0;
      const reason = task.reason || 'Unknown';
      const teamName = task.teamName || 'Unknown';
      const governorate = task.governorate || 'Unknown';

      if (!acc[score]) {
        acc[score] = { total: 0, reasons: {} };
      }

      acc[score].total += 1;

      if (!acc[score].reasons[reason]) {
        acc[score].reasons[reason] = {
          count: 0,
          teams: {},
          governorates: {}
        };
      }

      acc[score].reasons[reason].count += 1;

      // Track team occurrences for this reason
      if (!acc[score].reasons[reason].teams[teamName]) {
        acc[score].reasons[reason].teams[teamName] = 0;
      }
      acc[score].reasons[reason].teams[teamName] += 1;

      // Track governorate occurrences for this reason
      if (!acc[score].reasons[reason].governorates[governorate]) {
        acc[score].reasons[reason].governorates[governorate] = 0;
      }
      acc[score].reasons[reason].governorates[governorate] += 1;

      return acc;
    }, {});

    // Calculate reason statistics
    const reasonStats = tasks.reduce((acc, task) => {
      const reason = task.reason || 'Not specified';
      if (!acc[reason]) {
        acc[reason] = {
          count: 0,
          completed: 0,
          totalEvaluation: 0
        };
      }
      acc[reason].count++;
      acc[reason].totalEvaluation += task.evaluationScore || 0;
      if (task.status === 'Done') acc[reason].completed++;
      return acc;
    }, {});

    // In the processTasksData function, update the governorateStats section:
    const governorateStats = tasks.reduce((acc, task) => {
      const governorate = task.governorate || 'Not specified';
      const validationCat = task.validationCat || 'Not specified';

      if (!acc[governorate]) {
        acc[governorate] = {
          count: 0,
          completed: 0,
          totalEvaluation: 0,
          validationCats: {} // Track validation categories within governorate
        };
      }

      acc[governorate].count++;
      acc[governorate].totalEvaluation += task.evaluationScore || 0;
      if (task.status === 'Done') acc[governorate].completed++;

      // Track validation categories
      if (!acc[governorate].validationCats[validationCat]) {
        acc[governorate].validationCats[validationCat] = 0;
      }
      acc[governorate].validationCats[validationCat]++;

      return acc;
    }, {});

    // Calculate responsibility statistics
    const responsibilityStats = tasks.reduce((acc, task) => {
      const responsibility = task.responsibility || 'Not specified';
      if (!acc[responsibility]) {
        acc[responsibility] = {
          count: 0,
          completed: 0,
          totalEvaluation: 0
        };
      }
      acc[responsibility].count++;
      acc[responsibility].totalEvaluation += task.evaluationScore || 0;
      if (task.status === 'Done') acc[responsibility].completed++;
      return acc;
    }, {});

    return {
      teamStats,
      categoryStats,
      priorityStats,
      statusStats,
      evaluationStats,
      evaluationScoreStats,
      scoreReasons,
      reasonStats,
      governorateStats,
      responsibilityStats
    };
  };

  const prepareEvaluationScoreData = (stats) => {
    if (!stats || stats.total === 0) return null;

    return {
      labels: ['Detractors (1-6)', 'Neutrals (7-8)'],
      datasets: [{
        data: [stats.detractors, stats.neutrals],
        backgroundColor: [colors.error, colors.warning],
        borderColor: [colors.error, colors.warning],
        borderWidth: 1
      }]
    };
  };

  // const prepareScoreReasonsData = (scoreReasons) => {
  //   return Object.entries(scoreReasons).map(([score, data]) => {
  //     const reasons = Object.entries(data.reasons).map(([reason, details]) => {
  //       const mostCommonTeam = Object.entries(details.teams).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];
  //       const mostCommonGovernorate = Object.entries(details.governorates).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];

  //       return {
  //         reason,
  //         count: details.count,
  //         percentage: ((details.count / data.total) * 100).toFixed(1),
  //         mostCommonTeam: mostCommonTeam[0],
  //         teamCount: mostCommonTeam[1],
  //         mostCommonGovernorate: mostCommonGovernorate[0],
  //         governorateCount: mostCommonGovernorate[1]
  //       };
  //     }).sort((a, b) => b.count - a.count); // Sort by count

  //     return {
  //       score,
  //       total: data.total,
  //       reasons
  //     };
  //   }).sort((a, b) => b.total - a.total); // Sort scores by total count
  // };


  // const prepareChartData = (reasons) => {
  //   return {
  //     labels: reasons.map(r => r.reason),
  //     datasets: [{
  //       label: 'Count',
  //       data: reasons.map(r => r.count),
  //       backgroundColor: reasons.map(r => `hsl(${Math.random() * 360}, 70%, 50%)`),
  //     }]
  //   };
  // };

  // const preparePriorityChartData = () => {
  //   return {
  //     labels: Object.keys(stats.priorityStats),
  //     datasets: [{
  //       label: 'Tasks by Priority',
  //       data: Object.values(stats.priorityStats),
  //       backgroundColor: [
  //         colors.error,    // High
  //         colors.warning,  // Medium
  //         colors.success   // Low
  //       ]
  //     }]
  //   };
  // };

  const prepareEvaluationChartData = () => {
    // Initialize an array with zeros for scores from 1 to 8
    const evaluationData = Array(9).fill(0); // Scores from 1-8 (index 1 to 8)

    // Populate the array with the actual counts from the stats
    Object.entries(stats.evaluationStats).forEach(([score, count]) => {
      const scoreIndex = parseInt(score, 10);
      if (scoreIndex >= 1 && scoreIndex <= 8) {
        evaluationData[scoreIndex] = count;
      }
    });

    return {
      labels: Array.from({ length: 8 }, (_, i) => i + 1), // Labels from 1 to 8
      datasets: [{
        label: 'Satisfaction Score Distribution',
        data: evaluationData.slice(1), // Use data from index 1 to 8
        backgroundColor: evaluationData.slice(1).map((_, index) =>
          index < 6 ? colors.error : colors.warning
        ),
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: colors.textPrimary
        }
      },
      datalabels: {
        anchor: 'end',
        align: 'top',
        color: colors.textPrimary,
        font: {
          weight: 'bold',
        },
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: colors.textSecondary
        },
        grid: {
          color: colors.border
        }
      },
      x: {
        ticks: {
          color: colors.textSecondary
        },
        grid: {
          color: colors.border
        }
      }
    }
  };

  // Prepare chart data for governorates
  const prepareGovernorateChartData = () => {
    const governorates = Object.entries(stats.governorateStats)
      .map(([governorate, data]) => ({
        governorate,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count

    return {
      labels: governorates.map(g => g.governorate),
      datasets: [
        {
          label: 'Count',
          data: governorates.map(g => g.count),
          backgroundColor: governorates.map(g => colors.primary),
        }
      ]
    };
  };

  const governorateChartOptions = {
    ...chartOptions,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: colors.textPrimary
        }
      },
      datalabels: {
        anchor: 'end',
        align: 'top',
        formatter: (value, context) => {
          const total = context.chart.data.datasets[0].data.reduce((acc, data) => acc + data, 0);
          const percentage = Math.round((value / total) * 100);
          return `${value} (${percentage}%)`;
        },
        color: colors.textPrimary,
        font: {
          weight: 'bold',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Count',
          color: colors.textSecondary
        },
        ticks: {
          color: colors.textSecondary
        },
        grid: {
          color: colors.border
        }
      },
      x: {
        ticks: {
          color: colors.textSecondary
        },
        grid: {
          color: colors.border
        }
      }
    }
  };

  const aggregateScoreReasonsData = (scoreReasons) => {
    const aggregatedReasons = {};

    Object.entries(scoreReasons).forEach(([_, data]) => {
      Object.entries(data.reasons).forEach(([reason, details]) => {
        if (!aggregatedReasons[reason]) {
          aggregatedReasons[reason] = {
            count: 0,
            teams: {},
            governorates: {}
          };
        }

        aggregatedReasons[reason].count += details.count;

        // Aggregate team data
        Object.entries(details.teams).forEach(([teamName, teamCount]) => {
          if (!aggregatedReasons[reason].teams[teamName]) {
            aggregatedReasons[reason].teams[teamName] = 0;
          }
          aggregatedReasons[reason].teams[teamName] += teamCount;
        });

        // Aggregate governorate data
        Object.entries(details.governorates).forEach(([governorate, govCount]) => {
          if (!aggregatedReasons[reason].governorates[governorate]) {
            aggregatedReasons[reason].governorates[governorate] = 0;
          }
          aggregatedReasons[reason].governorates[governorate] += govCount;
        });
      });
    });

    // Calculate additional aggregated statistics
    const totalTasks = Object.values(aggregatedReasons).reduce((sum, reason) => sum + reason.count, 0);

    const reasonsWithStats = Object.entries(aggregatedReasons).map(([reason, details]) => {
      const mostCommonTeam = Object.entries(details.teams).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];
      const mostCommonGovernorate = Object.entries(details.governorates).sort((a, b) => b[1] - a[1])[0] || ['Unknown', 0];

      return {
        reason,
        count: details.count,
        percentage: ((details.count / totalTasks) * 100).toFixed(1),
        mostCommonTeam: mostCommonTeam[0],
        teamCount: mostCommonTeam[1],
        mostCommonGovernorate: mostCommonGovernorate[0],
        governorateCount: mostCommonGovernorate[1]
      };
    }).sort((a, b) => b.count - a.count); // Sort by count

    return {
      total: totalTasks,
      reasons: reasonsWithStats
    };
  };

  // Prepare chart data for responsibilities
  const prepareResponsibilityChartData = () => {
    const responsibilities = Object.entries(stats.responsibilityStats)
      .map(([responsibility, data]) => ({
        responsibility,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count

    return {
      labels: responsibilities.map(r => r.responsibility),
      datasets: [
        {
          label: 'Count',
          data: responsibilities.map(r => r.count),
          backgroundColor: responsibilities.map(r => colors.primary),
        }
      ]
    };
  };

  const responsibilityChartOptions = {
    ...chartOptions,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: colors.textPrimary
        }
      },
      datalabels: {
        anchor: 'end',
        align: 'top',
        formatter: (value, context) => {
          const total = context.chart.data.datasets[0].data.reduce((acc, data) => acc + data, 0);
          const percentage = Math.round((value / total) * 100);
          return `${value} (${percentage}%)`;
        },
        color: colors.textPrimary,
        font: {
          weight: 'bold',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Count',
          color: colors.textSecondary
        },
        ticks: {
          color: colors.textSecondary
        },
        grid: {
          color: colors.border
        }
      },
      x: {
        ticks: {
          color: colors.textSecondary
        },
        grid: {
          color: colors.border
        }
      }
    }
  };

  // Function to prepare data for all reasons
  const prepareAllReasonsChartData = () => {
    const reasons = Object.entries(stats.reasonStats)
      .map(([reason, data]) => ({
        reason,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      labels: reasons.map(r => r.reason),
      datasets: [
        {
          label: 'Count',
          data: reasons.map(r => r.count),
          backgroundColor: reasons.map(r => colors.primary),
        }
      ]
    };
  };

  // Function to prepare data for highest reasons count
  const prepareHighestReasonsChartData = () => {
    const reasons = Object.entries(stats.reasonStats)
      .map(([reason, data]) => ({
        reason,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Show top 5 highest reasons

    return {
      labels: reasons.map(r => r.reason),
      datasets: [
        {
          label: 'Count',
          data: reasons.map(r => r.count),
          backgroundColor: reasons.map(r => colors.primary),
        }
      ]
    };
  };

  // Function to prepare data for mid to highest reasons count
  const prepareMidToHighestReasonsChartData = () => {
    const reasons = Object.entries(stats.reasonStats)
      .map(([reason, data]) => ({
        reason,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, Math.ceil(Object.keys(stats.reasonStats).length / 2)); // Show mid to highest reasons

    return {
      labels: reasons.map(r => r.reason),
      datasets: [
        {
          label: 'Count',
          data: reasons.map(r => r.count),
          backgroundColor: reasons.map(r => colors.primary),
        }
      ]
    };
  };

  // Function to get the appropriate chart data based on the current view
  const getReasonChartData = () => {
    switch (reasonView) {
      case 'highest':
        return prepareHighestReasonsChartData();
      case 'midToHighest':
        return prepareMidToHighestReasonsChartData();
      default:
        return prepareAllReasonsChartData();
    }
  };

  // Chart options for reasons
  const reasonChartOptions = {
    ...chartOptions,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: colors.textPrimary
        }
      },
      datalabels: {
        anchor: 'end',
        align: 'top',
        formatter: (value, context) => {
          const total = context.chart.data.datasets[0].data.reduce((acc, data) => acc + data, 0);
          const percentage = Math.round((value / total) * 100);
          return `${value} (${percentage}%)`;
        },
        color: colors.textPrimary,
        font: {
          weight: 'bold',
        },
      },
    },
  };

  // const prepareGovernorateReasonsChartData = () => {
  //   const governorates = Object.entries(stats.governorateStats)
  //     .sort((a, b) => b[1].count - a[1].count);

  //   // Get all unique validation categories across all governorates
  //   const allValidationCats = new Set();
  //   governorates.forEach(([_, govData]) => {
  //     Object.keys(govData.validationCats || {}).forEach(cat => allValidationCats.add(cat));
  //   });

  //   // Prepare dataset for each validation category
  //   const validationCatDatasets = Array.from(allValidationCats).map(cat => ({
  //     label: cat,
  //     data: governorates.map(([govName, govData]) => {
  //       const totalTasks = govData.count;
  //       const catCount = (govData.validationCats || {})[cat] || 0;
  //       return Math.round((catCount / totalTasks) * 100); // Percentage
  //     }),
  //     backgroundColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
  //     stack: 'stack',
  //   }));

  //   return {
  //     labels: governorates.map(([govName]) => govName),
  //     datasets: validationCatDatasets
  //   };
  // };

  // const governorateReasonsOptions = {
  //   responsive: true,
  //   maintainAspectRatio: false,
  //   plugins: {
  //     legend: {
  //       position: 'top',
  //       labels: {
  //         color: colors.textPrimary
  //       }
  //     },
  //     tooltip: {
  //       callbacks: {
  //         label: function (context) {
  //           return `${context.dataset.label}: ${context.raw}%`;
  //         }
  //       }
  //     }
  //   },
  //   scales: {
  //     y: {
  //       beginAtZero: true,
  //       max: 100,
  //       title: {
  //         display: true,
  //         text: 'Percentage of Tasks',
  //         color: colors.textSecondary
  //       },
  //       ticks: {
  //         color: colors.textSecondary,
  //         callback: function (value) {
  //           return value + '%';
  //         }
  //       },
  //       grid: {
  //         color: colors.border
  //       }
  //     },
  //     x: {
  //       ticks: {
  //         color: colors.textSecondary
  //       },
  //       grid: {
  //         color: colors.border
  //       }
  //     }
  //   }
  // };

  // const handleGovernorateClick = (index) => {
  //   const governorateName = prepareGovernorateReasonsChartData().labels[index];
  //   const governorate = stats.governorateStats[governorateName];

  //   // Calculate reasons data for the selected governorate
  //   const reasonsData = tasksData.reduce((acc, task) => {
  //     if (task.governorate === governorateName) {
  //       const reason = task.reason || 'Not specified';
  //       if (!acc[reason]) {
  //         acc[reason] = { count: 0, completed: 0, totalEvaluation: 0 };
  //       }
  //       acc[reason].count++;
  //       acc[reason].totalEvaluation += task.evaluationScore || 0;
  //       if (task.status === 'Done') acc[reason].completed++;
  //     }
  //     return acc;
  //   }, {});

  //   setSelectedGovernorate({
  //     governorate: governorateName,
  //     ...governorate,
  //     reasons: reasonsData
  //   });
  //   setGovernorateDetailsOpen(true);
  // };


  if (loading) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Typography sx={{ color: colors.textPrimary }}>Loading...</Typography>
    </Box>
  );

  if (error) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Typography sx={{ color: colors.error }}>Error: {error}</Typography>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', color: colors.textPrimary, p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: colors.primary, fontWeight: 'bold', mb: 3 }}>
        Tasks Performance Dashboard
      </Typography>

      {/* Reason Statistics */}
      <Paper sx={{ p: 2, mb: 4, border: `1px solid ${colors.border}` }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary }}>
            Tasks by Reason
          </Typography>
          <Button
            variant="outlined"
            onClick={() => handleOpenAdvancedStats('reason')}
            sx={{ color: colors.primary }}
          >
            View Trends
          </Button>
        </Box>
        <ButtonGroup variant="contained" sx={{ mb: 2 }}>
          <Button onClick={() => setReasonView('all')} sx={{ backgroundColor: reasonView === 'all' ? colors.primary : colors.surfaceElevated }}>
            All Reasons
          </Button>
          <Button onClick={() => setReasonView('highest')} sx={{ backgroundColor: reasonView === 'highest' ? colors.primary : colors.surfaceElevated }}>
            Highest Reasons
          </Button>
          <Button onClick={() => setReasonView('midToHighest')} sx={{ backgroundColor: reasonView === 'midToHighest' ? colors.primary : colors.surfaceElevated }}>
            Mid to Highest Reasons
          </Button>
        </ButtonGroup>
        <Box sx={{ height: '400px' }}>
          <Bar data={getReasonChartData()} options={reasonChartOptions} />
        </Box>

        {/* Accordion for the table */}
        <Accordion sx={{ backgroundColor: colors.surfaceElevated, mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore sx={{ color: colors.textPrimary }} />}>
            <Typography sx={{ color: colors.textPrimary }}>
              Reason Details
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: colors.textPrimary }}>Reason</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Count</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Percentage</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Most Common Team</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Team Count</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Most Common Governorate</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Governorate Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aggregateScoreReasonsData(stats.scoreReasons).reasons.map((reasonData, idx) => (
                    <TableRow
                      key={idx}
                      hover
                      onClick={() => handleReasonClick(reasonData.reason)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell sx={{ color: colors.textPrimary }}>{reasonData.reason}</TableCell>
                      <TableCell align="right" sx={{ color: colors.textPrimary }}>{reasonData.count}</TableCell>
                      <TableCell align="right" sx={{ color: colors.textPrimary }}>{reasonData.percentage}%</TableCell>
                      <TableCell align="right" sx={{ color: colors.textPrimary }}>{reasonData.mostCommonTeam}</TableCell>
                      <TableCell align="right" sx={{ color: colors.textPrimary }}>{reasonData.teamCount}</TableCell>
                      <TableCell align="right" sx={{ color: colors.textPrimary }}>{reasonData.mostCommonGovernorate}</TableCell>
                      <TableCell align="right" sx={{ color: colors.textPrimary }}>{reasonData.governorateCount}</TableCell>
                    </TableRow>

                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      </Paper>


      {/* Governorate Statistics */}
      <Paper sx={{ p: 2, mb: 4, border: `1px solid ${colors.border}` }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: colors.textPrimary }}>
            Performance by Governorate
          </Typography>
          <Button
            variant="outlined"
            onClick={() => handleOpenAdvancedStats('governorate')}
            sx={{ color: colors.primary }}
          >
            View Trends
          </Button>
        </Box>
        <Box sx={{ height: '500px' }}>
          <Bar data={prepareGovernorateChartData()} options={governorateChartOptions} />
        </Box>
      </Paper>

      {/* Governorate Validation Categories Breakdown */}
      {/* <Paper sx={{ p: 2, mb: 4, backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: colors.textPrimary }}>
            Validation Categories by Governorate
          </Typography>
        </Box>
        <Box sx={{ height: '500px' }}>
          <Bar
            data={prepareGovernorateReasonsChartData()}
            options={{
              ...governorateReasonsOptions,
              onClick: (event, elements) => {
                if (elements.length > 0) {
                  const index = elements[0].index;
                  handleGovernorateClick(index);
                }
              }
            }}
          />

        </Box>
      </Paper> */}

      {/* Responsibility Statistics */}
      <Paper sx={{ p: 2, mb: 4, border: `1px solid ${colors.border}` }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: colors.textPrimary }}>
            Performance by Responsibility
          </Typography>
          <Button
            variant="outlined"
            onClick={() => handleOpenAdvancedStats('responsibility')}
            sx={{ color: colors.primary }}
          >
            View Trends
          </Button>
        </Box>
        <Box sx={{ height: '500px' }}>
          <Bar data={prepareResponsibilityChartData()} options={responsibilityChartOptions} />
        </Box>
      </Paper>

      {/* Tasks by Priority */}
      {/* <Paper sx={{ p: 2, mb: 4, backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
        <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary }}>
          Tasks by Priority
        </Typography>
        <Box sx={{ height: '300px' }}>
          <Bar data={preparePriorityChartData()} options={chartOptions} />
        </Box>
      </Paper> */}

      {/* Satisfaction Score Distribution */}
      <Paper sx={{ p: 2, mb: 4, border: `1px solid ${colors.border}` }}>
        <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary }}>
          Satisfaction Score Distribution
        </Typography>
        <Box sx={{ height: '400px' }}>
          <Bar data={prepareEvaluationChartData()} options={chartOptions} />
        </Box>
      </Paper>

      {/* Score Reasons Distribution */}
      {/* <Paper sx={{ p: 2, mb: 4, backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
        <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary }}>
          Satisfaction Score Reasons Distribution
        </Typography>
        {prepareScoreReasonsData(stats.scoreReasons).map((scoreData, index) => (
          <Accordion key={index} sx={{ backgroundColor: colors.surfaceElevated, mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore sx={{ color: colors.textPrimary }} />}>
              <Typography sx={{ color: colors.textPrimary }}>
                Score {scoreData.score} (Total: {scoreData.total} tasks)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ height: '300px', mb: 2 }}>
                <Bar
                  data={prepareChartData(scoreData.reasons)}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          color: colors.textSecondary,
                        },
                      },
                      x: {
                        ticks: {
                          color: colors.textSecondary,
                        },
                      },
                    },
                  }}
                />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: colors.textPrimary }}>Reason</TableCell>
                      <TableCell sx={{ color: colors.textPrimary }} align="right">Count</TableCell>
                      <TableCell sx={{ color: colors.textPrimary }} align="right">Percentage</TableCell>
                      <TableCell sx={{ color: colors.textPrimary }} align="right">Most Common Team</TableCell>
                      <TableCell sx={{ color: colors.textPrimary }} align="right">Team Count</TableCell>
                      <TableCell sx={{ color: colors.textPrimary }} align="right">Most Common Governorate</TableCell>
                      <TableCell sx={{ color: colors.textPrimary }} align="right">Governorate Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scoreData.reasons.map((reasonData, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ color: colors.textPrimary }}>{reasonData.reason}</TableCell>
                        <TableCell align="right" sx={{ color: colors.textPrimary }}>{reasonData.count}</TableCell>
                        <TableCell align="right" sx={{ color: colors.textPrimary }}>{reasonData.percentage}%</TableCell>
                        <TableCell align="right" sx={{ color: colors.textPrimary }}>{reasonData.mostCommonTeam}</TableCell>
                        <TableCell align="right" sx={{ color: colors.textPrimary }}>{reasonData.teamCount}</TableCell>
                        <TableCell align="right" sx={{ color: colors.textPrimary }}>{reasonData.mostCommonGovernorate}</TableCell>
                        <TableCell align="right" sx={{ color: colors.textPrimary }}>{reasonData.governorateCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper> */}

      {/* Satisfaction Score Statistics */}
      <Paper sx={{ p: 2, mb: 4, border: `1px solid ${colors.border}` }}>
        <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary }}>
          Customer Satisfaction Scores
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" sx={{ color: colors.textPrimary, mb: 1 }}>
              Score Distribution
            </Typography>
            <Box sx={{ height: '300px' }}>
              <Bar
                data={prepareEvaluationScoreData(stats.evaluationScoreStats)}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        color: colors.textPrimary
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          const label = context.label || '';
                          const value = context.raw || 0;
                          const percentage = (value / stats.evaluationScoreStats.total * 100).toFixed(1);
                          return `${label}: ${value} (${percentage}%)`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        color: colors.textSecondary
                      },
                      grid: {
                        color: colors.border
                      }
                    },
                    x: {
                      ticks: {
                        color: colors.textSecondary
                      },
                      grid: {
                        display: false
                      }
                    }
                  }
                }}
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" sx={{ color: colors.textPrimary, mb: 1 }}>
              Evaluation Metrics
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: colors.textPrimary }}>Metric</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Value</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }}>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ color: colors.textPrimary }}>Average Score</TableCell>
                    <TableCell align="right" sx={{
                      color: stats.evaluationScoreStats.average < 5 ? colors.error :
                        stats.evaluationScoreStats.average < 8 ? colors.warning :
                          colors.success,
                      fontWeight: 'bold'
                    }}>
                      {stats.evaluationScoreStats.average?.toFixed(1) || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: colors.textSecondary }}>
                      Average of all Satisfaction Scores (1-8 scale)
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: colors.textPrimary }}>Detractors (1-6)</TableCell>
                    <TableCell align="right" sx={{ color: colors.error, fontWeight: 'bold' }}>
                      {stats.evaluationScoreStats.detractors} ({(stats.evaluationScoreStats.detractors / stats.evaluationScoreStats.total * 100).toFixed(1)}%)
                    </TableCell>
                    <TableCell sx={{ color: colors.textSecondary }}>
                      Customers unlikely to recommend
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ color: colors.textPrimary }}>Neutrals (7-8)</TableCell>
                    <TableCell align="right" sx={{ color: colors.warning, fontWeight: 'bold' }}>
                      {stats.evaluationScoreStats.neutrals} ({(stats.evaluationScoreStats.neutrals / stats.evaluationScoreStats.total * 100).toFixed(1)}%)
                    </TableCell>
                    <TableCell sx={{ color: colors.textSecondary }}>
                      Passive customers
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`
          }
        }}
      >
        <DialogTitle sx={{ color: colors.primary }}>
          Details for Reason: {selectedReasonDetails?.reason || 'Unknown'}
        </DialogTitle>
        <DialogContent>
          {selectedReasonDetails && (
            <>
              <Typography variant="subtitle1" sx={{ color: colors.textPrimary, mt: 2 }}>
                Teams ({Object.keys(selectedReasonDetails.teams || {}).length})
              </Typography>
              <TableContainer
                component={Paper}
                sx={{
                  mb: 3,
                  backgroundColor: colors.surfaceElevated,
                  border: `1px solid ${colors.border}`
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: colors.primary, fontWeight: 'bold' }}>Team Name</TableCell>
                      <TableCell sx={{ color: colors.primary, fontWeight: 'bold' }} align="right">Count</TableCell>
                      <TableCell sx={{ color: colors.primary, fontWeight: 'bold' }} align="right">Percentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedReasonDetails.teams && Object.entries(selectedReasonDetails.teams)
                      .sort((a, b) => b[1] - a[1]) // Sort by count descending
                      .map(([teamName, count], index) => {
                        const total = Object.values(selectedReasonDetails.teams).reduce((sum, c) => sum + c, 0);
                        const percentage = ((count / total) * 100).toFixed(1);
                        return (
                          <TableRow key={index}>
                            <TableCell sx={{ color: colors.textPrimary }}>{teamName}</TableCell>
                            <TableCell sx={{ color: colors.textPrimary }} align="right">{count}</TableCell>
                            <TableCell sx={{ color: colors.textPrimary }} align="right">{percentage}%</TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography variant="subtitle1" sx={{ color: colors.textPrimary, mt: 2 }}>
                Governorates ({Object.keys(selectedReasonDetails.governorates || {}).length})
              </Typography>
              <TableContainer
                component={Paper}
                sx={{
                  backgroundColor: colors.surfaceElevated,
                  border: `1px solid ${colors.border}`
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: colors.primary, fontWeight: 'bold' }}>Governorate</TableCell>
                      <TableCell sx={{ color: colors.primary, fontWeight: 'bold' }} align="right">Count</TableCell>
                      <TableCell sx={{ color: colors.primary, fontWeight: 'bold' }} align="right">Percentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedReasonDetails.governorates && Object.entries(selectedReasonDetails.governorates)
                      .sort((a, b) => b[1] - a[1]) // Sort by count descending
                      .map(([governorate, count], index) => {
                        const total = Object.values(selectedReasonDetails.governorates).reduce((sum, c) => sum + c, 0);
                        const percentage = ((count / total) * 100).toFixed(1);
                        return (
                          <TableRow key={index}>
                            <TableCell sx={{ color: colors.textPrimary }}>{governorate}</TableCell>
                            <TableCell sx={{ color: colors.textPrimary }} align="right">{count}</TableCell>
                            <TableCell sx={{ color: colors.textPrimary }} align="right">{percentage}%</TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ backgroundColor: colors.surfaceElevated, borderTop: `1px solid ${colors.border}` }}>
          <Button
            onClick={() => setDialogOpen(false)}
            sx={{
              color: colors.primary,
              '&:hover': {
                backgroundColor: colors.primaryHover
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <AdvancedStatsDialog
        open={advancedStatsOpen}
        onClose={() => setAdvancedStatsOpen(false)}
        tasksData={tasksData}
        colors={colors}
        selectedDimension={selectedDimension}
        selectedTimeframe={selectedTimeframe}
        setSelectedTimeframe={setSelectedTimeframe}
      />

      <GovernorateDetailsDialog
        open={governorateDetailsOpen}
        onClose={() => setGovernorateDetailsOpen(false)}
        governorateData={selectedGovernorate}
        colors={colors}
        tasksData={tasksData}
        stats={stats} // Pass the stats object here
      />

    </Box>
  );
};

export default MainStats;