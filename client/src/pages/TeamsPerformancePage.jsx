import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Legend, Tooltip } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import * as XLSX from 'xlsx';
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Grid, IconButton, Rating, Tooltip as MuiToolTip, Chip, MenuItem,
  Autocomplete
} from '@mui/material';
import { Download, FilterAlt, Search, ArrowBack } from '@mui/icons-material';
import TeamDetailView from '../components/TeamDetailView';
import api from '../api/api';
import TeamStatistics from '../components/TeamStatistics';
import TeamPerformanceTablesAccordion from '../components/TeamPerformanceTablesAccordion';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const TeamsPerformancePage = () => {
  const isMobile = false;
  const colors = {
    background: '#121212',
    surface: '#1e1e1e',
    surfaceElevated: '#252525',
    border: '#444',
    primary: '#3ea6ff',
    primaryHover: 'rgba(62, 166, 255, 0.08)',
    textPrimary: '#ffffff',
    textSecondary: '#9e9e9e',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
  };

  const [teamsData, setTeamsData] = useState({
    fieldTeamStats: [],
    overallStats: {
      totalAssessments: 0,
      averageScore: 0,
      minScore: 0,
      maxScore: 0,
      totalTeams: 0,
      assessedTeams: 0,
      unassessedTeams: 0
    },
    checkPoints: [],
    checkpointStats: {}
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedTeamDetails, setSelectedTeamDetails] = useState([]);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    minScore: '',
    maxScore: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState('');

  const calculateDaysBetween = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assessmentsResponse, fieldTeamsResponse, violations] = await Promise.all([
          api.get('/on-the-job-assessments', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`
            }
          }),
          api.get('/field-teams/get-field-teams', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`
            }
          }),
          fetchTasksData()
        ]);

        console.log('Assessments Response:', assessmentsResponse.data);
        console.log('Field Teams Response:', fieldTeamsResponse.data);
        console.log('Violations:', violations);

        const assessments = assessmentsResponse.data;
        const allFieldTeams = fieldTeamsResponse.data;

        const processedAssessedData = processAssessmentsData(assessments);

        console.log('Processed Assessed Data:', processedAssessedData);

        const assessedTeamsMap = processedAssessedData.fieldTeamStats.reduce((map, team) => {
          map[team.teamId._id] = team;
          return map;
        }, {});

        const trainingDates = allFieldTeams.reduce((acc, team) => {
          acc[team._id] = team.sessionHistory?.map(session => session.sessionDate) || [];
          return acc;
        }, {});

        console.log('Training Dates:', trainingDates);

        const allTeamsData = allFieldTeams.map(team => {
          const assessedTeam = assessedTeamsMap[team._id];
          if (assessedTeam) {
            return {
              ...assessedTeam,
              teamId: { _id: team._id, teamName: team.teamName },
              evaluationScore: team.evaluationScore || "N/A",
              isEvaluated: team.isEvaluated || false,
              quizCode: team.quizCode || "",
              isActive: team.isActive || true,
              isSuspended: team.isSuspended || false,
              isTerminated: team.isTerminated || false,
              isOnLeave: team.isOnLeave || false,
              isResigned: team.isResigned || false,
              sessionHistory: team.sessionHistory || [],
              totalViolationPoints: team.totalViolationPoints || 0
            };
          }
          return {
            teamId: { _id: team._id, teamName: team.teamName },
            teamName: team.teamName,
            assessmentCount: 0,
            totalScore: 0,
            averageScore: 0,
            lastAssessmentDate: null,
            evaluationScore: team.evaluationScore || "N/A",
            isEvaluated: team.isEvaluated || false,
            quizCode: team.quizCode || "",
            isActive: team.isActive || true,
            isSuspended: team.isSuspended || false,
            isTerminated: team.isTerminated || false,
            isOnLeave: team.isOnLeave || false,
            isResigned: team.isResigned || false,
            sessionHistory: team.sessionHistory || [],
            totalViolationPoints: team.totalViolationPoints || 0
          };
        });

        console.log('All Teams Data:', allTeamsData);

        const finalData = {
          fieldTeamStats: allTeamsData,
          overallStats: calculateOverallStats(allTeamsData),
          checkPoints: processedAssessedData.checkPoints,
          checkpointStats: processedAssessedData.checkpointStats
        };

        const updatedData = calculateTeamStatistics(finalData, trainingDates, violations);
        console.log('Updated Data:', updatedData);
        setTeamsData(updatedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchTasksData = async () => {
    try {
      const response = await api.get('/tasks/get-all-tasks', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const tasks = response.data;
      const violations = tasks.reduce((acc, task) => {
        if (!acc[task.teamId]) {
          acc[task.teamId] = [];
        }
        acc[task.teamId].push(task);
        return acc;
      }, {});
      return violations;
    } catch (err) {
      setError(err.message);
      return {};
    }
  };

  const currentYearStartDate = new Date('2024-12-29');

  const calculateDaysFromCurrentYearStart = (trainingDate) => {
    if (!trainingDate) return 0;
    const trainingDateObj = new Date(trainingDate);
    const diffTime = Math.abs(trainingDateObj - currentYearStartDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateTeamStatistics = (teamsData, trainingDates, violations) => {
    if (!teamsData.fieldTeamStats || !Array.isArray(teamsData.fieldTeamStats)) {
      console.error("No valid team data available");
      return { ...teamsData, fieldTeamStats: [] };
    }

    const currentDate = new Date();
    const ABSOLUTE_MIN_DAYS = 7; // Absolute minimum days required after training

    const teamStats = teamsData.fieldTeamStats.map(team => {
      const teamId = team.teamId._id;
      const teamTrainingDates = trainingDates[teamId] || [];
      const completedSessions = team.sessionHistory?.filter(session => session.status === "Completed") || [];
      const mostRecentTrainingDate = completedSessions.length > 0
        ? new Date(Math.max(...completedSessions.map(session => new Date(session.sessionDate).getTime())))
        : null;

      const teamViolations = violations[teamId] || [];
      const firstViolationDate = teamViolations.length > 0
        ? new Date(Math.min(...teamViolations.map(v => new Date(v.pisDate).getTime())))
        : null;

      // Calculate violations before and after training
      const violationsBeforeTraining = mostRecentTrainingDate
        ? teamViolations.filter(violation => new Date(violation.pisDate) < mostRecentTrainingDate)
        : [];
      const violationsAfterTraining = mostRecentTrainingDate
        ? teamViolations.filter(violation => new Date(violation.pisDate) >= mostRecentTrainingDate)
        : teamViolations;

      // Calculate time periods
      const daysFromCurrentYearStart = mostRecentTrainingDate
        ? calculateDaysFromCurrentYearStart(mostRecentTrainingDate)
        : 0;
      const daysAfterTraining = mostRecentTrainingDate
        ? calculateDaysBetween(mostRecentTrainingDate, currentDate)
        : 0;

      // Calculate dynamic threshold (10% of days since year start, with 7-day minimum)
      const requiredDaysForComparison = Math.max(
        ABSOLUTE_MIN_DAYS,
        Math.ceil(daysFromCurrentYearStart * 0.10)
      );
      const hasSufficientData = daysAfterTraining >= requiredDaysForComparison;

      // Calculate violation rates (per day)
      const violationRateBefore = daysFromCurrentYearStart > 0
        ? violationsBeforeTraining.length / daysFromCurrentYearStart
        : 0;
      const violationRateAfter = daysAfterTraining > 0
        ? violationsAfterTraining.length / daysAfterTraining
        : 0;

      // Calculate improvement percentage
      let improvementPercentage = "N/A";
      let hasNewViolations = false;

      if (mostRecentTrainingDate) {
        if (violationsBeforeTraining.length === 0) {
          if (violationsAfterTraining.length > 0) {
            hasNewViolations = true;
            improvementPercentage = -100;
          } else {
            improvementPercentage = 0;
          }
        } else if (hasSufficientData) {
          if (violationRateBefore > 0) {
            improvementPercentage = ((violationRateBefore - violationRateAfter) / violationRateBefore) * 100;
          } else if (violationRateAfter > 0) {
            improvementPercentage = -100;
          } else {
            improvementPercentage = 0;
          }
        }
      }

      // Prepare violation reasons breakdown
      const violationReasons = teamViolations.reduce((acc, violation) => {
        const reason = violation.reason;
        if (!acc[reason]) {
          acc[reason] = { total: 0, before: 0, after: 0 };
        }
        acc[reason].total++;
        if (mostRecentTrainingDate) {
          if (new Date(violation.pisDate) < mostRecentTrainingDate) {
            acc[reason].before++;
          } else {
            acc[reason].after++;
          }
        }
        return acc;
      }, {});

      return {
        ...team,
        mostRecentTrainingDate,
        firstViolationDate,
        totalViolations: teamViolations.length,
        violationsBeforeTraining: violationsBeforeTraining.length,
        violationsAfterTraining: violationsAfterTraining.length,
        violationReasons,
        daysBeforeTraining: mostRecentTrainingDate && firstViolationDate
          ? calculateDaysBetween(firstViolationDate, mostRecentTrainingDate)
          : "N/A",
        daysFromCurrentYearStart,
        daysAfterTraining,
        requiredDaysForComparison, // For debugging/display purposes
        hasSufficientData,
        violationRateBefore: violationRateBefore.toFixed(3),
        violationRateAfter: violationRateAfter.toFixed(3),
        improvementPercentage,
        hasNewViolations,
        violationPercentages: Object.entries(violationReasons).map(([reason, counts]) => ({
          reason,
          percentage: (counts.total / teamViolations.length) * 100,
          beforePercentage: counts.before / (violationsBeforeTraining.length || 1) * 100,
          afterPercentage: counts.after / (violationsAfterTraining.length || 1) * 100
        }))
      };
    });

    return {
      ...teamsData,
      fieldTeamStats: teamStats
    };
  };

  const prepareViolationTrendData = (team) => {
    if (!team || !team.violationReasons || Object.keys(team.violationReasons).length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const reasons = Object.keys(team.violationReasons);
    const beforeData = reasons.map(reason => team.violationReasons[reason].before);
    const afterData = reasons.map(reason => team.violationReasons[reason].after);

    return {
      labels: reasons,
      datasets: [
        {
          label: 'Before Training',
          data: beforeData,
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        {
          label: 'After Training',
          data: afterData,
          backgroundColor: colors.error,
          borderColor: colors.error,
        }
      ]
    };
  };

  const prepareViolationRateData = (team) => {
    if (!team) {
      return {
        labels: [],
        datasets: []
      };
    }

    return {
      labels: ['Before Training', 'After Training'],
      datasets: [{
        label: 'Violations per Day',
        data: [team.violationRateBefore, team.violationRateAfter],
        backgroundColor: [colors.primary, colors.error],
        borderWidth: 1
      }]
    };
  };

  const prepareViolationReasonsData = (team) => {
    if (!team || !team.violationReasons) return null;

    const reasons = Object.keys(team.violationReasons);
    const beforeData = reasons.map(reason => team.violationReasons[reason].before);
    const afterData = reasons.map(reason => team.violationReasons[reason].after);

    return {
      labels: reasons,
      datasets: [
        {
          label: 'Before Training',
          data: beforeData,
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        {
          label: 'After Training',
          data: afterData,
          backgroundColor: colors.error,
          borderColor: colors.error,
        }
      ]
    };
  };

  const processAssessmentsData = (assessments) => {
    const categoryMap = {
      "Splicing & Testing Equipment": "Equipment",
      "Fiber Optic Splicing Skills": "Splicing",
      "ONT Placement, Configuration and testing": "Configuration",
      "Customer Education": "Customer",
      "Customer Service Skills": "Service"
    };

    const teams = assessments.reduce((acc, assessment) => {
      const teamKey = assessment.fieldTeamName || assessment.fieldTeamId;
      if (!acc[teamKey]) {
        acc[teamKey] = [];
      }
      acc[teamKey].push(assessment);
      return acc;
    }, {});

    const fieldTeamStats = Object.entries(teams).map(([teamKey, teamAssessments]) => {
      const totalScore = teamAssessments.reduce((sum, assessment) => sum + assessment.overallScore, 0);
      const averageScore = totalScore / teamAssessments.length;
      const lastAssessmentDate = teamAssessments.reduce((latest, assessment) =>
        new Date(assessment.assessmentDate) > new Date(latest) ? assessment.assessmentDate : latest,
        teamAssessments[0].assessmentDate
      );

      return {
        teamId: teamAssessments[0].fieldTeamId,
        teamName: teamAssessments[0].fieldTeamName,
        assessmentCount: teamAssessments.length,
        totalScore,
        averageScore,
        lastAssessmentDate,
      };
    });

    const checkpointStats = {};

    assessments.forEach(assessment => {
      assessment.checkPoints.forEach(checkpoint => {
        if (!checkpointStats[checkpoint.name]) {
          checkpointStats[checkpoint.name] = {
            totalScore: 0,
            count: 0,
            category: checkpoint.category
          };
        }
        checkpointStats[checkpoint.name].totalScore += checkpoint.score;
        checkpointStats[checkpoint.name].count += 1;
      });
    });

    Object.keys(checkpointStats).forEach(key => {
      checkpointStats[key].averageScore =
        checkpointStats[key].totalScore / checkpointStats[key].count;
    });

    return {
      fieldTeamStats,
      overallStats: calculateOverallStats(fieldTeamStats),
      checkPoints: assessments.flatMap(assessment => assessment.checkPoints),
      checkpointStats
    };
  };

  const calculateOverallStats = (fieldTeamStats) => {
    const assessedTeams = fieldTeamStats.filter(team => team.assessmentCount > 0);

    const totalAssessments = assessedTeams.reduce((sum, team) => sum + team.assessmentCount, 0);
    const averageScore = assessedTeams.length > 0
      ? assessedTeams.reduce((sum, team) => sum + team.averageScore, 0) / assessedTeams.length
      : 0;

    const minScore = assessedTeams.length > 0
      ? Math.min(...assessedTeams.map(team => team.averageScore))
      : 0;
    const maxScore = assessedTeams.length > 0
      ? Math.max(...assessedTeams.map(team => team.averageScore))
      : 0;

    return {
      totalAssessments,
      averageScore,
      minScore,
      maxScore,
      totalTeams: fieldTeamStats.length,
      assessedTeams: assessedTeams.length,
      unassessedTeams: fieldTeamStats.length - assessedTeams.length
    };
  };

  const prepareCheckpointChartData = () => {
    if (!teamsData.checkpointStats || Object.keys(teamsData.checkpointStats).length === 0) return null;

    const sortedCheckpoints = Object.entries(teamsData.checkpointStats)
      .map(([name, stats]) => ({
        name,
        category: stats.category,
        averageScore: stats.averageScore,
        count: stats.count
      }))
      .sort((a, b) => a.averageScore - b.averageScore);

    return {
      labels: sortedCheckpoints.map(cp => cp.name),
      datasets: [{
        label: 'Average Score',
        data: sortedCheckpoints.map(cp => cp.averageScore),
        backgroundColor: sortedCheckpoints.map(cp => {
          const score = cp.averageScore;
          return score < 60 ? colors.error :
            score < 80 ? colors.warning :
              colors.success;
        }),
      }]
    };
  };

  const checkpointChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      datalabels: {
        anchor: 'end',
        align: 'top',
        formatter: (value) => `${Math.round(value)}%`,
        color: colors.textPrimary,
        font: {
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const cpName = context.label;
            const stats = teamsData.checkpointStats[cpName];
            return [
              `Average: ${stats.averageScore.toFixed(1)}%`,
              `Assessments: ${stats.count}`,
              `Category: ${stats.category}`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Average Score (%)',
          color: colors.textSecondary
        },
        ticks: {
          color: colors.textSecondary,
          stepSize: 20
        },
        grid: {
          color: colors.border
        }
      },
      x: {
        ticks: {
          color: colors.textSecondary,
          callback: function (value, index, values) {
            const label = this.getLabelForValue(value);
            return label.length > 15 ? label.substring(0, 15) + '...' : label;
          }
        },
        grid: {
          display: false
        }
      }
    }
  };

  const fetchTeamDetails = async (teamId) => {
    try {
      const response = await api.get(`/on-the-job-assessments/field-team/${teamId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      setSelectedTeamDetails(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    if (team.assessmentCount > 0) {
      fetchTeamDetails(team.teamId._id);
    } else {
      setSelectedTeamDetails([]);
    }
  };

  const handleBackToList = () => {
    setSelectedTeam(null);
    setSelectedTeamDetails([]);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(teamsData.fieldTeamStats);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Teams Performance');
    XLSX.writeFile(workbook, 'TeamsPerformance.xlsx');
  };

  const exportTeamDetailsToExcel = () => {
    if (!selectedTeamDetails || selectedTeamDetails.length === 0) {
      console.error("No team details available to export.");
      return;
    }

    const worksheets = selectedTeamDetails.map((assessment, index) => {
      const checkPointsArray = assessment.checkPoints.map(cp => ({
        Name: cp.name,
        Category: cp.category,
        Score: cp.score,
        Status: cp.isCompleted ? 'Completed' : 'Pending',
        Description: cp.description,
        Notes: cp.notes || 'No notes'
      }));

      return {
        name: `Assessment ${index + 1}`,
        data: XLSX.utils.json_to_sheet([{
          'Team ID': assessment.fieldTeamId,
          Team: assessment.fieldTeamName,
          ConductedBy: assessment.conductedBy,
          AssessmentDate: new Date(assessment.assessmentDate).toLocaleDateString(),
          Status: assessment.status,
          OverallScore: assessment.overallScore,
          Feedback: assessment.feedback
        }]),
        checkPoints: XLSX.utils.json_to_sheet(checkPointsArray)
      };
    });

    const workbook = XLSX.utils.book_new();
    worksheets.forEach((ws, index) => {
      XLSX.utils.book_append_sheet(workbook, ws.data, `Assessment ${index + 1} Summary`);
      XLSX.utils.book_append_sheet(workbook, ws.checkPoints, `Assessment ${index + 1} Checkpoints`);
    });

    XLSX.writeFile(workbook, `${selectedTeam.teamName}_Assessments.xlsx`);
  };

  const applyFilters = () => {
    console.log('Applying filters', filters);
    setFilterDialogOpen(false);
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      minScore: '',
      maxScore: '',
    });
  };

  const filteredTeams = teamsData.fieldTeamStats.filter(team => {
    if (selectedTeamId && team.teamId._id !== selectedTeamId) return false;

    const isAssessed = team.assessmentCount > 0;
    const matchesSearch = team.teamName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMinScore = filters.minScore === '' || team.averageScore >= Number(filters.minScore);
    const matchesMaxScore = filters.maxScore === '' || team.averageScore <= Number(filters.maxScore);
    const lastAssessmentDate = new Date(team.lastAssessmentDate);
    const matchesDateFrom = filters.dateFrom === '' || lastAssessmentDate >= new Date(filters.dateFrom);
    const matchesDateTo = filters.dateTo === '' || lastAssessmentDate <= new Date(filters.dateTo);

    return isAssessed && matchesSearch && matchesMinScore && matchesMaxScore && matchesDateFrom && matchesDateTo;
  });

  const getBarColor = (score) => {
    return score < 50 ? colors.error : score < 80 ? colors.warning : colors.success;
  };

  const chartData = {
    labels: filteredTeams.map(team => team.teamName),
    datasets: [
      {
        label: 'Average Score',
        data: filteredTeams.map(team => team.averageScore),
        backgroundColor: filteredTeams.map(team => getBarColor(team.averageScore)),
      },
    ],
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
        formatter: (value) => `${value}%`,
        color: colors.textPrimary,
        font: {
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          afterLabel: function (context) {
            const team = filteredTeams.find(t => t.teamName === context.label);
            return `Assessments: ${team.assessmentCount}\nLast: ${new Date(team.lastAssessmentDate).toLocaleDateString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
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
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        handleTeamSelect(filteredTeams[index]);
      }
    }
  };

  const getWeakestCheckpoints = (checkpointStats, count = 5) => {
    if (!checkpointStats) return [];

    return Object.entries(checkpointStats)
      .map(([name, stats]) => ({
        name,
        category: stats.category,
        averageScore: stats.averageScore,
        count: stats.count
      }))
      .filter(cp => cp.averageScore < 60)
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, count);
  };

  const getNeedsImprovementCheckpoints = (checkpointStats, count = 5) => {
    if (!checkpointStats) return [];

    return Object.entries(checkpointStats)
      .map(([name, stats]) => ({
        name,
        category: stats.category,
        averageScore: stats.averageScore,
        count: stats.count
      }))
      .filter(cp => cp.averageScore >= 60 && cp.averageScore < 80)
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, count);
  };

  const prepareCategoryChartData = () => {
    if (!teamsData.checkpointStats || Object.keys(teamsData.checkpointStats).length === 0) {
      return null;
    }

    const categoryStats = {};
    Object.entries(teamsData.checkpointStats).forEach(([name, stats]) => {
      if (!categoryStats[stats.category]) {
        categoryStats[stats.category] = {
          totalScore: 0,
          count: 0
        };
      }
      categoryStats[stats.category].totalScore += stats.averageScore;
      categoryStats[stats.category].count += 1;
    });

    const categories = Object.keys(categoryStats).map(category => ({
      name: category,
      averageScore: categoryStats[category].totalScore / categoryStats[category].count
    })).sort((a, b) => a.averageScore - b.averageScore);

    return {
      labels: categories.map(c => c.name),
      datasets: [{
        label: 'Average Score',
        data: categories.map(c => c.averageScore),
        backgroundColor: categories.map(c => {
          const score = c.averageScore;
          return score < 60 ? colors.error :
            score < 80 ? colors.warning :
              colors.success;
        }),
      }]
    };
  };

  const categoryChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      datalabels: {
        anchor: 'end',
        align: 'top',
        formatter: (value) => `${Math.round(value)}%`,
        color: colors.textPrimary,
        font: {
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `Average: ${context.raw.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Average Score (%)',
          color: colors.textSecondary
        },
        ticks: {
          color: colors.textSecondary,
          stepSize: 20
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
  };

  const renderTeamStatistics = (team) => (
    <TeamStatistics
      team={team}
      tabValue={tabValue}
      setTabValue={setTabValue}
      colors={colors}
      prepareViolationReasonsData={prepareViolationReasonsData}
      prepareViolationTrendData={prepareViolationTrendData}
      prepareViolationRateData={prepareViolationRateData}
    />
  );

  const categorizeTeams = (teams) => {
    if (!teams || !Array.isArray(teams)) {
      return {
        trained: {
          improvedTeams: [],
          declinedTeams: [],
          noChangeTeams: [],
          noViolationsTeams: [],
          newViolationsTeams: [] // New category
        },
        untrained: []
      };
    }

    // Separate trained and untrained teams
    const trainedTeams = teams.filter(team => {
      return team.sessionHistory?.some(session => session.status === "Completed") || false;
    });

    const untrainedTeams = teams.filter(team => {
      return !team.sessionHistory ||
        team.sessionHistory.length === 0 ||
        !team.sessionHistory.some(session => session.status === "Completed");
    });

    // Categorize trained teams
    const improvedTeams = [];
    const declinedTeams = [];
    const noChangeTeams = [];
    const noViolationsTeams = [];
    const newViolationsTeams = []; // Teams with 0 before and >0 after

    trainedTeams.forEach(team => {
      if (team.totalViolations === 0) {
        noViolationsTeams.push(team);
      } else if (team.hasNewViolations) {
        newViolationsTeams.push(team);
      } else if (team.improvementPercentage === 0 || team.improvementPercentage === "N/A") {
        noChangeTeams.push(team);
      } else if (team.improvementPercentage > 0) {
        improvedTeams.push(team);
      } else {
        declinedTeams.push(team);
      }
    });

    // Sort the teams
    improvedTeams.sort((a, b) => b.improvementPercentage - a.improvementPercentage);
    declinedTeams.sort((a, b) => a.improvementPercentage - b.improvementPercentage);
    noChangeTeams.sort((a, b) => b.totalViolations - a.totalViolations);
    noViolationsTeams.sort((a, b) => b.totalViolations - a.totalViolations);
    newViolationsTeams.sort((a, b) => b.violationsAfterTraining - a.violationsAfterTraining);

    // Sort untrained teams by total violations
    const sortedUntrainedTeams = [...untrainedTeams].sort((a, b) => b.totalViolations - a.totalViolations);

    return {
      trained: {
        improvedTeams,
        declinedTeams,
        noChangeTeams,
        noViolationsTeams,
        newViolationsTeams
      },
      untrained: sortedUntrainedTeams
    };
  };

  const { trained, untrained } = categorizeTeams(teamsData.fieldTeamStats);
  const {
    improvedTeams,
    declinedTeams,
    noChangeTeams,
    noViolationsTeams,
    newViolationsTeams // Add this line
  } = trained;
  console.log({ trained, untrained });
  console.log({ improvedTeams, declinedTeams, noChangeTeams, noViolationsTeams });

  if (loading) return (
    <Box sx={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Typography sx={{ color: colors.textPrimary }}>Loading...</Typography>
    </Box>
  );

  if (error) return (
    <Box sx={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Typography sx={{ color: colors.error }}>Error: {error}</Typography>
    </Box>
  );

  if (selectedTeam) {
    return (
      <Box sx={{ backgroundColor: colors.background, minHeight: '100vh', color: colors.textPrimary, p: isMobile ? 1 : 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <IconButton onClick={handleBackToList} sx={{ color: colors.primary, '&:hover': { backgroundColor: colors.primaryHover } }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" sx={{ color: colors.primary }}>
            {selectedTeam.teamName} - Performance Details
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          {selectedTeam.assessmentCount > 0 && (
            <MuiToolTip title="Export to Excel">
              <IconButton onClick={exportTeamDetailsToExcel} sx={{ color: colors.primary, '&:hover': { backgroundColor: colors.primaryHover } }}>
                <Download />
              </IconButton>
            </MuiToolTip>
          )}
        </Box>
        {selectedTeam.assessmentCount > 0 && <TeamDetailView teamData={selectedTeamDetails} colors={colors} />}
        {renderTeamStatistics(selectedTeam)}
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: colors.background, minHeight: '100vh', color: colors.textPrimary, p: isMobile ? 1 : 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: colors.primary, fontWeight: 'bold', mb: 3 }}>
        Teams Performance Analysis
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 2 : 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Autocomplete
            options={teamsData.fieldTeamStats}
            getOptionLabel={(option) => option.teamName}
            value={teamsData.fieldTeamStats.find(team => team.teamId._id === selectedTeamId) || null}
            onChange={(event, newValue) => {
              setSelectedTeamId(newValue ? newValue.teamId._id : '');
              if (newValue) handleTeamSelect(newValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Team"
                sx={{
                  minWidth: 400,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: colors.border },
                    '&:hover fieldset': { borderColor: colors.primary }
                  },
                  '& .MuiInputLabel-root': { color: colors.textSecondary },
                  '& .MuiInputBase-input': { color: colors.textPrimary }
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.teamId._id}>
                {option.teamName}
                {option.assessmentCount === 0 && (
                  <Chip
                    label="Not Assessed"
                    size="small"
                    sx={{
                      ml: 1,
                      backgroundColor: colors.warning,
                      color: colors.textPrimary
                    }}
                  />
                )}
              </li>
            )}
            isOptionEqualToValue={(option, value) => option.teamId._id === value.teamId._id}
            sx={{ minWidth: 200 }}
          />

          <Button
            variant="outlined"
            onClick={() => {
              setSelectedTeamId('');
              setSelectedTeam(null);
            }}
            sx={{
              color: colors.textPrimary,
              borderColor: colors.border,
              '&:hover': {
                borderColor: colors.primary
              },
              height: '100%',
            }}
          >
            Clear Selection
          </Button>

          {/* <TextField
            label="Search Teams"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <Search sx={{ color: colors.textSecondary, mr: 1 }} /> }}
            sx={{
              width: isMobile ? '100%' : '300px',
              '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: colors.border }, '&:hover fieldset': { borderColor: colors.primary }, height: '100%' },
              '& .MuiInputLabel-root': { color: colors.textSecondary },
              '& .MuiInputBase-input': { color: colors.textPrimary },
              height: '100%',
            }}
          /> */}
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
          <Button
            variant="outlined"
            startIcon={<FilterAlt />}
            onClick={() => setFilterDialogOpen(true)}
            sx={{ color: colors.textPrimary, borderColor: colors.border, '&:hover': { borderColor: colors.primary } }}
          >
            Filters
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={exportToExcel}
            sx={{ backgroundColor: colors.primary, '&:hover': { backgroundColor: '#2d8ada' } }}
          >
            Export
          </Button>
        </Box>
      </Box>

      <Box sx={{ height: '400px', mb: 4, width: '100%' }}>
        {chartData && chartData.labels && <Bar data={chartData} options={chartOptions} />}
      </Box>

      <Paper sx={{ p: 2, mb: 4, backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
        <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary }}>
          Category Performance
        </Typography>
        <Box sx={{ height: prepareCategoryChartData() ? '400px' : '100%' }}>
          {prepareCategoryChartData() ? (
            <Bar
              data={prepareCategoryChartData()}
              options={categoryChartOptions}
            />
          ) : (
            <Typography sx={{ color: colors.textSecondary, textAlign: 'center', py: 4 }}>
              No category data available
            </Typography>
          )}
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 4, backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
        <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary }}>
          Category Performance Summary
        </Typography>
        <Grid container spacing={2}>
          {Array.from(new Set(Object.values(teamsData.checkpointStats).map(stats => stats.category))).map(category => {
            const categoryPoints = Object.values(teamsData.checkpointStats).filter(stats => stats.category === category);
            const avgScore = categoryPoints.reduce((sum, cp) => sum + cp.averageScore, 0) / categoryPoints.length;
            const weakCount = categoryPoints.filter(cp => cp.averageScore < 60).length;
            const needsImprovementCount = categoryPoints.filter(cp => cp.averageScore >= 60 && cp.averageScore < 80).length;

            const borderColor = avgScore < 60 ? colors.error :
              avgScore < 80 ? colors.warning :
                colors.success;

            return (
              <Grid item xs={12} sm={6} md={4} key={category}>
                <Paper sx={{
                  p: 1.5,
                  backgroundColor: colors.surfaceElevated,
                  border: `1px solid ${borderColor}`,
                  boxShadow: `0 0 8px ${borderColor}33`
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ color: colors.textPrimary, fontWeight: 'medium' }}>
                      {category}
                    </Typography>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Typography sx={{
                        color: borderColor,
                        fontWeight: 'bold'
                      }}>
                        {avgScore.toFixed(1)}%
                      </Typography>
                      <Rating
                        value={avgScore / 20}
                        precision={0.1}
                        readOnly
                        size="small"
                        sx={{
                          '& .MuiRating-iconFilled': {
                            color: borderColor
                          },
                          '& .MuiRating-iconEmpty': {
                            color: colors.border
                          }
                        }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption" sx={{
                      color: colors.error,
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <Box sx={{
                        width: 8,
                        height: 8,
                        backgroundColor: colors.error,
                        borderRadius: '50%',
                        mr: 0.5
                      }} />
                      {weakCount} weak
                    </Typography>
                    <Typography variant="caption" sx={{
                      color: colors.warning,
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <Box sx={{
                        width: 8,
                        height: 8,
                        backgroundColor: colors.warning,
                        borderRadius: '50%',
                        mr: 0.5
                      }} />
                      {needsImprovementCount} needs improvement
                    </Typography>
                    <Typography variant="caption" sx={{
                      color: colors.success,
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <Box sx={{
                        width: 8,
                        height: 8,
                        backgroundColor: colors.success,
                        borderRadius: '50%',
                        mr: 0.5
                      }} />
                      {categoryPoints.length - weakCount - needsImprovementCount} strong
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 4, backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
        <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary }}>
          Checkpoint Performance (All Checkpoints)
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 16, height: 16, backgroundColor: colors.success, mr: 1 }} />
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>Strong (80-100%)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 16, height: 16, backgroundColor: colors.warning, mr: 1 }} />
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>Needs Improvement (60-79%)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 16, height: 16, backgroundColor: colors.error, mr: 1 }} />
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>Weak (0-59%)</Typography>
          </Box>
        </Box>
        {prepareCheckpointChartData() ? (
          <Box sx={{ height: '70vh', mt: 2 }}>
            <Bar
              data={prepareCheckpointChartData()}
              options={checkpointChartOptions}
              plugins={[ChartDataLabels]}
            />
          </Box>
        ) : (
          <Typography sx={{ color: colors.textSecondary, textAlign: 'center', py: 4 }}>
            No checkpoint data available
          </Typography>
        )}
      </Paper>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {getWeakestCheckpoints(teamsData.checkpointStats).length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{
              p: 2,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.error}`,
              boxShadow: `0 0 8px ${colors.error}33`
            }}>
              <Typography variant="subtitle1" sx={{
                color: colors.error,
                mb: 1,
                fontWeight: 'bold'
              }}>
                Weakest Checkpoints (Below 60%)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: colors.textPrimary }}>Checkpoint</TableCell>
                      <TableCell sx={{ color: colors.textPrimary }} align="right">Score</TableCell>
                      <TableCell sx={{ color: colors.textPrimary }}>Category</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getWeakestCheckpoints(teamsData.checkpointStats).map((cp) => (
                      <TableRow key={cp.name}>
                        <TableCell sx={{ color: colors.textPrimary }}>{cp.name}</TableCell>
                        <TableCell align="right">
                          <Box sx={{
                            display: 'inline-block',
                            px: 1,
                            borderRadius: 1,
                            backgroundColor: colors.error,
                            color: colors.textPrimary
                          }}>
                            {cp.averageScore.toFixed(1)}%
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: colors.textSecondary }}>{cp.category}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        )}

        {getNeedsImprovementCheckpoints(teamsData.checkpointStats).length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{
              p: 2,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.warning}`,
              boxShadow: `0 0 8px ${colors.warning}33`
            }}>
              <Typography variant="subtitle1" sx={{
                color: colors.warning,
                mb: 1,
                fontWeight: 'bold'
              }}>
                Needs Improvement (60-79%)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: colors.textPrimary }}>Checkpoint</TableCell>
                      <TableCell sx={{ color: colors.textPrimary }} align="right">Score</TableCell>
                      <TableCell sx={{ color: colors.textPrimary }}>Category</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getNeedsImprovementCheckpoints(teamsData.checkpointStats).map((cp) => (
                      <TableRow key={cp.name}>
                        <TableCell sx={{ color: colors.textPrimary }}>{cp.name}</TableCell>
                        <TableCell align="right">
                          <Box sx={{
                            display: 'inline-block',
                            px: 1,
                            borderRadius: 1,
                            backgroundColor: colors.warning,
                            color: colors.textPrimary
                          }}>
                            {cp.averageScore.toFixed(1)}%
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: colors.textSecondary }}>{cp.category}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        )}

        {teamsData.checkpointStats &&
          Object.values(teamsData.checkpointStats).filter(cp => cp.averageScore < 80).length === 0 && (
            <Grid item xs={12}>
              <Typography variant="body2" sx={{
                color: colors.textSecondary,
                fontStyle: 'italic',
                textAlign: 'center',
                py: 2
              }}>
                All checkpoints scored 80% or above - excellent performance!
              </Typography>
            </Grid>
          )}
      </Grid>

      <Paper sx={{ p: 2, mb: 4, backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
        <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary, mb: 4 }}>
          Training Effectiveness Overview (Completed Training Sessions Only)
        </Typography>

        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{
              p: 2,
              backgroundColor: colors.surfaceElevated,
              border: `1px solid ${colors.error}`,
              boxShadow: `0 0 8px ${colors.error}33`
            }}>
              <Typography variant="subtitle1" sx={{ color: colors.textPrimary }}>
                Unchanged Performance
              </Typography>
              <Typography variant="h4" sx={{ color: colors.error }}>
                {declinedTeams.length}
              </Typography>
              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                Teams performing worse after training
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{
              p: 2,
              backgroundColor: colors.surfaceElevated,
              border: `1px solid ${colors.error}`,
              boxShadow: `0 0 8px ${colors.error}33`
            }}>
              <Typography variant="subtitle1" sx={{ color: colors.textPrimary }}>
                New Violations After Training
              </Typography>
              <Typography variant="h4" sx={{ color: colors.error }}>
                {newViolationsTeams.length}
              </Typography>
              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                Teams with new violations after training
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{
              p: 2,
              backgroundColor: colors.surfaceElevated,
              border: `1px solid ${colors.warning}`,
              boxShadow: `0 0 8px ${colors.warning}33`
            }}>
              <Typography variant="subtitle1" sx={{ color: colors.textPrimary }}>
                No Change
              </Typography>
              <Typography variant="h4" sx={{ color: colors.warning }}>
                {noChangeTeams.length}
              </Typography>
              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                Teams with no significant change
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{
              p: 2,
              backgroundColor: colors.surfaceElevated,
              border: `1px solid ${colors.success}`,
              boxShadow: `0 0 8px ${colors.success}33`
            }}>
              <Typography variant="subtitle1" sx={{ color: colors.textPrimary }}>
                Improved Performance
              </Typography>
              <Typography variant="h4" sx={{ color: colors.success }}>
                {improvedTeams.length}
              </Typography>
              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                Teams showing positive improvement after training
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{
              p: 2,
              backgroundColor: colors.surfaceElevated,
              border: `1px solid ${colors.success}`,
              boxShadow: `0 0 8px ${colors.success}33`
            }}>
              <Typography variant="subtitle1" sx={{ color: colors.textPrimary }}>
                Teams with No Violations
              </Typography>
              <Typography variant="h4" sx={{ color: colors.success }}>
                {noViolationsTeams.length}
              </Typography>
              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                Teams with no violations reported
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {declinedTeams.length > 0 && (
          <TeamPerformanceTablesAccordion
            title="Unchanged Performance Teams"
            color="error"
            defaultExpanded={true}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: colors.surfaceElevated }}>
                    <TableCell sx={{ color: colors.textPrimary }}>Team Name</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Violations Before</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Violations After</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Rate Before</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Rate After</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Rate of Change</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }}>Last Training Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {declinedTeams.map((team) => (
                    <TableRow
                      key={team.teamId._id}
                      hover
                      onClick={() => handleTeamSelect(team)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: `${colors.error}10`,
                        '&:hover': { backgroundColor: `${colors.error}20` }
                      }}
                    >
                      <TableCell sx={{ color: colors.textPrimary }}>
                        {team.teamName}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.error }}>
                        {team.violationsBeforeTraining}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.error }}>
                        {team.violationsAfterTraining}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.error }}>
                        {team.violationRateBefore}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.error }}>
                        {team.violationRateAfter}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.error, fontWeight: 'bold' }}>
                        {team.improvementPercentage}%
                      </TableCell>
                      <TableCell sx={{ color: colors.textPrimary }}>
                        {team.mostRecentTrainingDate ? new Date(team.mostRecentTrainingDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TeamPerformanceTablesAccordion>
        )}

        {newViolationsTeams.length > 0 && (
          <TeamPerformanceTablesAccordion
            title="Teams with New Violations After Training"
            color="error"
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: colors.surfaceElevated }}>
                    <TableCell sx={{ color: colors.textPrimary }}>Team Name</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">New Violations</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Violation Rate</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }}>Last Training Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {newViolationsTeams.map((team) => (
                    <TableRow
                      key={team.teamId._id}
                      hover
                      onClick={() => handleTeamSelect(team)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: `${colors.error}10`,
                        '&:hover': { backgroundColor: `${colors.error}20` }
                      }}
                    >
                      <TableCell sx={{ color: colors.textPrimary }}>
                        {team.teamName}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.error }}>
                        {team.violationsAfterTraining}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.error }}>
                        {team.violationRateAfter}
                      </TableCell>
                      <TableCell sx={{ color: colors.textPrimary }}>
                        {team.mostRecentTrainingDate ? new Date(team.mostRecentTrainingDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TeamPerformanceTablesAccordion>
        )}

        {noChangeTeams.length > 0 && (
          <TeamPerformanceTablesAccordion
            title="Teams with No Significant Change"
            color="warning"
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: colors.surfaceElevated }}>
                    <TableCell sx={{ color: colors.textPrimary }}>Team Name</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Violations Before</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Violations After</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Rate Before</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Rate After</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Change</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }}>Last Training Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {noChangeTeams.map((team) => (
                    <TableRow
                      key={team.teamId._id}
                      hover
                      onClick={() => handleTeamSelect(team)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: `${colors.warning}10`,
                        '&:hover': { backgroundColor: `${colors.warning}20` }
                      }}
                    >
                      <TableCell sx={{ color: colors.textPrimary }}>
                        {team.teamName}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.textPrimary }}>
                        {team.violationsBeforeTraining}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.textPrimary }}>
                        {team.violationsAfterTraining}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.textPrimary }}>
                        {team.violationRateBefore}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.textPrimary }}>
                        {team.violationRateAfter}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.warning, fontWeight: 'bold' }}>
                        {team.improvementPercentage === "N/A" ? "N/A" : "0%"}
                      </TableCell>
                      <TableCell sx={{ color: colors.textPrimary }}>
                        {team.mostRecentTrainingDate ? new Date(team.mostRecentTrainingDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TeamPerformanceTablesAccordion>
        )}

        {improvedTeams.length > 0 && (
          <TeamPerformanceTablesAccordion
            title="Improved Performance Teams"
            color="success"
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: colors.surfaceElevated }}>
                    <TableCell sx={{ color: colors.textPrimary }}>Team Name</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Violations Before</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Violations After</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Rate Before</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Rate After</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }} align="right">Improvement</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }}>Last Training Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {improvedTeams.map((team) => (
                    <TableRow
                      key={team.teamId._id}
                      hover
                      onClick={() => handleTeamSelect(team)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: `${colors.success}10`,
                        '&:hover': { backgroundColor: `${colors.success}20` }
                      }}
                    >
                      <TableCell sx={{ color: colors.textPrimary }}>
                        {team.teamName}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.error }}>
                        {team.violationsBeforeTraining}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.success }}>
                        {team.violationsAfterTraining}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.error }}>
                        {team.violationRateBefore}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.success }}>
                        {team.violationRateAfter}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.success, fontWeight: 'bold' }}>
                        +{team.improvementPercentage}%
                      </TableCell>
                      <TableCell sx={{ color: colors.textPrimary }}>
                        {team.mostRecentTrainingDate ? new Date(team.mostRecentTrainingDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TeamPerformanceTablesAccordion>
        )}
      </Paper>

      {noViolationsTeams.length > 0 && (
        <Paper sx={{ p: 2, mb: 4, backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
          <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary, mb: 4 }}>
            Teams with No Violations
          </Typography>
          <TeamPerformanceTablesAccordion
            title="Teams with No Violations"
            color="success"
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: colors.surfaceElevated }}>
                    <TableCell sx={{ color: colors.textPrimary }}>Team Name</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }}>Last Training Date</TableCell>
                    <TableCell sx={{ color: colors.textPrimary }}>Total Violations</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {noViolationsTeams.map((team) => (
                    <TableRow
                      key={team.teamId._id}
                      hover
                      onClick={() => handleTeamSelect(team)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: `${colors.success}10`,
                        '&:hover': { backgroundColor: `${colors.success}20` }
                      }}
                    >
                      <TableCell sx={{ color: colors.textPrimary }}>
                        {team.teamName}
                      </TableCell>
                      <TableCell sx={{ color: colors.textPrimary }}>
                        {team.mostRecentTrainingDate ? new Date(team.mostRecentTrainingDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell sx={{ color: colors.textPrimary }}>
                        {team.totalViolations}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TeamPerformanceTablesAccordion>
        </Paper>
      )}

      {/* {noChangeTeams.length > 0 && (
        <Paper sx={{ p: 2, mb: 4, backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
          <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary, mb: 4 }}>
            Teams with Violations but 0% Change
          </Typography>

          {noChangeTeams.length > 0 && (
            <TeamPerformanceTablesAccordion
              title="Teams with Violations but 0% Change"
              color="warning"
            >
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: colors.surfaceElevated }}>
                      <TableCell sx={{ color: colors.textPrimary }}>Team Name</TableCell>
                      <TableCell sx={{ color: colors.textPrimary }}>Last Training Date</TableCell>
                      <TableCell sx={{ color: colors.textPrimary }}>Total Violations</TableCell>
                      <TableCell sx={{ color: colors.textPrimary }}>Violation Rate Before</TableCell>
                      <TableCell sx={{ color: colors.textPrimary }}>Violation Rate After</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {noChangeTeams.map((team) => (
                      <TableRow
                        key={team.teamId._id}
                        hover
                        onClick={() => handleTeamSelect(team)}
                        sx={{
                          cursor: 'pointer',
                          backgroundColor: `${colors.warning}10`,
                          '&:hover': { backgroundColor: `${colors.warning}20` }
                        }}
                      >
                        <TableCell sx={{ color: colors.textPrimary }}>
                          {team.teamName}
                        </TableCell>
                        <TableCell sx={{ color: colors.textPrimary }}>
                          {team.mostRecentTrainingDate ? new Date(team.mostRecentTrainingDate).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell sx={{ color: colors.textPrimary }}>
                          {team.totalViolations}
                        </TableCell>
                        <TableCell sx={{ color: colors.textPrimary }}>
                          {team.violationRateBefore}
                        </TableCell>
                        <TableCell sx={{ color: colors.textPrimary }}>
                          {team.violationRateAfter}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TeamPerformanceTablesAccordion>
          )}
        </Paper>

      )} */}

      {untrained.length > 0 && (
        <TeamPerformanceTablesAccordion
          title="Untrained Teams"
          color="warning"
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: colors.surfaceElevated }}>
                  <TableCell sx={{ color: colors.textPrimary }}>Team Name</TableCell>
                  <TableCell sx={{ color: colors.textPrimary }} align="right">Total Violations</TableCell>
                  <TableCell sx={{ color: colors.textPrimary }} align="right">Violation Rate</TableCell>
                  <TableCell sx={{ color: colors.textPrimary }}>Training Status</TableCell>
                  <TableCell sx={{ color: colors.textPrimary }}>Last Assessment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {untrained.map((team) => (
                  <TableRow
                    key={team.teamId._id}
                    hover
                    onClick={() => handleTeamSelect(team)}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: `${colors.warning}10`,
                      '&:hover': { backgroundColor: `${colors.warning}20` }
                    }}
                  >
                    <TableCell sx={{ color: colors.textPrimary }}>
                      {team.teamName}
                    </TableCell>
                    <TableCell align="right" sx={{ color: colors.error }}>
                      {team.totalViolations}
                    </TableCell>
                    <TableCell align="right" sx={{ color: colors.error }}>
                      {team.violationRateBefore !== "N/A" ? team.violationRateBefore : "N/A"}
                    </TableCell>
                    <TableCell>
                      {team.sessionHistory && team.sessionHistory.length > 0 ? (
                        <Chip
                          label="Missed"
                          size="small"
                          sx={{
                            backgroundColor: colors.warning,
                            color: colors.textPrimary
                          }}
                        />
                      ) : (
                        <Chip
                          label="Not Trained"
                          size="small"
                          sx={{
                            backgroundColor: colors.error,
                            color: colors.textPrimary
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ color: colors.textPrimary }}>
                      {team.lastAssessmentDate ? new Date(team.lastAssessmentDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TeamPerformanceTablesAccordion>
      )}

      <Dialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        PaperProps={{ sx: { backgroundColor: colors.surface, color: colors.textPrimary } }}
      >
        <DialogTitle sx={{ color: colors.textPrimary }}>Filter Teams</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="From Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true, sx: { color: colors.textSecondary } }}
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: colors.border }, '&:hover fieldset': { borderColor: colors.primary } },
                  '& .MuiInputBase-input': { color: colors.textPrimary }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="To Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true, sx: { color: colors.textSecondary } }}
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: colors.border }, '&:hover fieldset': { borderColor: colors.primary } },
                  '& .MuiInputBase-input': { color: colors.textPrimary }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Minimum Score"
                type="number"
                fullWidth
                value={filters.minScore}
                onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
                inputProps={{ min: 0, max: 100 }}
                sx={{
                  '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: colors.border }, '&:hover fieldset': { borderColor: colors.primary } },
                  '& .MuiInputLabel-root': { color: colors.textSecondary },
                  '& .MuiInputBase-input': { color: colors.textPrimary }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Maximum Score"
                type="number"
                fullWidth
                value={filters.maxScore}
                onChange={(e) => setFilters({ ...filters, maxScore: e.target.value })}
                inputProps={{ min: 0, max: 100 }}
                sx={{
                  '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: colors.border }, '&:hover fieldset': { borderColor: colors.primary } },
                  '& .MuiInputLabel-root': { color: colors.textSecondary },
                  '& .MuiInputBase-input': { color: colors.textPrimary }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetFilters} sx={{ color: colors.textSecondary }}>Reset</Button>
          <Button
            onClick={applyFilters}
            variant="contained"
            sx={{ backgroundColor: colors.primary, '&:hover': { backgroundColor: '#2d8ada' } }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamsPerformancePage;
