import PageHeader from "../components/ui/PageHeader";
import { tok } from "../theme/tokens";
import { useEffect, useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { Autocomplete, Box, Button, Divider, IconButton, ListItemIcon, Menu, MenuItem, Tab, Tabs, TextField, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Refresh from '@mui/icons-material/Refresh';
import SaveOutlined from '@mui/icons-material/SaveOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import api from '../api/api';
import { bulkDelete, DELETE_PATHS } from '../api/bulkDelete';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import AppDialog from '../components/ui/AppDialog';
import SafeDeleteDialog from '../components/ui/SafeDeleteDialog';
import SectionCard from '../components/ui/SectionCard';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import BulkBar from '../components/ui/BulkBar';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import PageLoader from '../components/ui/PageLoader';
import { gridSx } from './tasks/gridSx';
import { exportRows } from '../utils/exportRows';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Legend);

// Every column of a quiz result, for exports and the backup before a permanent delete.
const RESULT_COLUMNS = [
  ['Team', (r) => r.teamName],
  ['Taken', (r) => (r.submittedAt ? new Date(r.submittedAt) : '')],
  ['Score (%)', (r) => r.percentage],
  ['Points', (r) => r.correctAnswers],
  ['Questions', (r) => r.userAnswers?.length || r.totalQuestions],
  ['Essays scored', (r) => (r.userAnswers || []).filter((a) => a.type === 'essay' && (a.isScored || a.score > 0)).length],
  ['Remarks', (r) => r.remarks || r.feedback || ''],
  ['Team ID', (r) => r.teamId],
  ['Record ID', (r) => r._id],
];

const PerfAssessmentDashboard = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isAdmin = useSelector((st) => st?.auth?.user?.role) === 'Admin';

  const [teamId, setTeamId] = useState('');
  const [allTeams, setAllTeams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [selection, setSelection] = useState([]);
  const [rowMenu, setRowMenu] = useState(null); // { anchor, row }
  const [deleting, setDeleting] = useState(null); // results to delete permanently
  const [currentResult, setCurrentResult] = useState(null);
  const [essayScores, setEssayScores] = useState({});
  const [questionFilter, setQuestionFilter] = useState('all');
  const [settings, setSettings] = useState(null);
  const isMobile = useMediaQuery('(max-width:503px)');
  const [exporting, setExporting] = useState(false);
  const [globalStats, setGlobalStats] = useState(null);

  // Edit overall result dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingScore, setEditingScore] = useState('');
  const [editingCorrect, setEditingCorrect] = useState('');
  const [editingTotal, setEditingTotal] = useState('');
  const [editingRemarks, setEditingRemarks] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const fetchAllTeams = async () => {
      try {
        const response = await api.get('/quiz-results/teams/all', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        setAllTeams(response.data.data || []);
      } catch (err) {
        console.error('Failed to fetch teams:', err);
      }
    };

    fetchAllTeams();

    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        setSettings(response.data);
      } catch {
        console.error('Failed to fetch settings');
      }
    };
    fetchSettings();
  }, []);

  // Handle URL search params or location state for direct team / result view
  useEffect(() => {
    const paramTeamId = searchParams.get('teamId') || location.state?.teamId;
    const paramResultId = searchParams.get('resultId') || location.state?.resultId;
    const directResult = location.state?.selectedResult;
    const isEditMode = searchParams.get('edit') === 'true' || location.state?.mode === 'edit';

    if (directResult) {
      setSelectedResult(directResult);
      if (directResult.teamId) {
        setTeamId(directResult.teamId);
        fetchResults(directResult.teamId);
      }
      if (isEditMode) {
        handleOpenEdit(directResult);
      }
      return;
    }

    if (paramTeamId) {
      setTeamId(paramTeamId);
      fetchResults(paramTeamId).then((data) => {
        if (paramResultId && Array.isArray(data)) {
          const match = data.find(r => r._id === paramResultId);
          if (match) {
            setSelectedResult(match);
            if (isEditMode) {
              handleOpenEdit(match);
            }
          }
        }
      });
    } else if (paramResultId) {
      api.get(`/quiz-results/${paramResultId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      }).then(res => {
        if (res.data?.data) {
          const item = res.data.data;
          setSelectedResult(item);
          if (item.teamId) {
            setTeamId(item.teamId);
            fetchResults(item.teamId);
          }
          if (isEditMode) {
            handleOpenEdit(item);
          }
        }
      }).catch(err => {
        console.error('Failed to load quiz result by ID:', err);
      });
    }
  }, [searchParams, location.state]);

  // Calculate global stats
  useEffect(() => {
    const calculateGlobalStats = async () => {
      try {
        const response = await api.get('/quiz-results', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        const allResults = response.data.data || [];
        
        if (allResults.length === 0) {
          setGlobalStats(null);
          return;
        }

        // Group by team
        const teamStats = {};
        allResults.forEach(result => {
          if (!teamStats[result.teamId]) {
            teamStats[result.teamId] = {
              teamName: result.teamName,
              results: [],
              averageScore: 0,
            };
          }
          teamStats[result.teamId].results.push(result);
        });

        // Calculate averages
        Object.values(teamStats).forEach(team => {
          const avg = team.results.reduce((sum, r) => sum + r.percentage, 0) / team.results.length;
          team.averageScore = Math.round(avg);
        });

        // Sort teams by average score
        const sortedTeams = Object.values(teamStats).sort((a, b) => b.averageScore - a.averageScore);

        // Score distribution
        const scoreDistribution = {
          'Excellent (85+)': 0,
          'Good (70-84)': 0,
          'Average (50-69)': 0,
          'Below Average (<50)': 0
        };

        Object.values(teamStats).forEach(team => {
          if (team.averageScore >= 85) scoreDistribution['Excellent (85+)'] += 1;
          else if (team.averageScore >= 70) scoreDistribution['Good (70-84)'] += 1;
          else if (team.averageScore >= 50) scoreDistribution['Average (50-69)'] += 1;
          else scoreDistribution['Below Average (<50)'] += 1;
        });

        setGlobalStats({
          totalTeams: allTeams.length,
          teamsWithResults: Object.keys(teamStats).length,
          totalResults: allResults.length,
          averageScore: Math.round(allResults.reduce((sum, r) => sum + r.percentage, 0) / allResults.length),
          topTeams: sortedTeams.slice(0, 5),
          bottomTeams: sortedTeams.slice(-3).reverse(),
          scoreDistribution,
          allTeamStats: sortedTeams
        });
      } catch (err) {
        console.error('Failed to calculate global stats:', err);
      }
    };

    if (allTeams.length > 0) {
      calculateGlobalStats();
    }
  }, [allTeams]);

  useEffect(() => {
    if (selectedResult) {
      console.log('Selected Result:', JSON.stringify(selectedResult, null, 2)); // Debug log
      const initialScores = selectedResult.userAnswers?.reduce((acc, answer, index) => {
        if (answer.type === 'essay') {
          acc[index] = answer.score !== undefined ? answer.score.toString() : '0';
        }
        return acc;
      }, {}) || {};
      setEssayScores(initialScores);
    }
  }, [selectedResult]);

  const colors = {
    background: tok('--surface'),
    surface: tok('--surface'),
    surfaceElevated: tok('--surface-subtle'),
    border: tok('--border'),
    primary: tok('--accent'),
    primaryHover: tok('--surface-hover'),
    textPrimary: tok('--text'),
    textSecondary: tok('--text-secondary'),
    success: tok('--success'),
    warning: tok('--warning'),
    error: tok('--danger'),
    chartCorrect: tok('--success'),
    chartIncorrect: tok('--danger'),
  };

  const fetchResults = async (targetTeamId = teamId) => {
    const idToUse = (typeof targetTeamId === 'string' ? targetTeamId : teamId)?.trim();
    if (!idToUse) {
      setError('Please select a Team');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/quiz-results?teamId=${idToUse}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = response.data.data || [];
      setResults(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch results';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (result) => {
    if (!result) return;
    setCurrentResult(result);
    setEditingScore(result.percentage !== undefined ? result.percentage : result.score || '');
    setEditingCorrect(result.correctAnswers !== undefined ? result.correctAnswers : '');
    setEditingTotal(result.totalQuestions !== undefined ? result.totalQuestions : (result.userAnswers?.length || ''));
    setEditingRemarks(result.remarks || result.feedback || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!currentResult?._id) return;
    const pct = Number(editingScore);
    if (editingScore === '' || pct < 0 || pct > 100 || editingTotal === '' || Number(editingTotal) < 1 || (editingCorrect !== '' && Number(editingCorrect) < 0)) {
      toast.error('Check the highlighted fields');
      return;
    }
    setSavingEdit(true);
    try {
      const scoreNum = Number(editingScore) || 0;
      const correctNum = Number(editingCorrect) || 0;
      const totalNum = Number(editingTotal) || 0;
      const payload = {
        percentage: scoreNum,
        score: `${scoreNum}%`,
        correctAnswers: correctNum,
        totalQuestions: totalNum,
        remarks: editingRemarks
      };
      const response = await api.put(`/quiz-results/${currentResult._id}`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const updated = response.data?.data || { ...currentResult, ...payload };
      toast.success("Online exam result updated successfully");
      setResults(prev => prev.map(q => q._id === currentResult._id ? updated : q));
      if (selectedResult?._id === currentResult._id) {
        setSelectedResult(prev => ({ ...prev, ...updated }));
      }
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Failed to update quiz result:", error);
      toast.error(error.response?.data?.message || "Failed to update exam result");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleUpdateEssayScore = async (resultId, questionIndex, manualScore = null) => {
    try {
      const scoreValue = manualScore !== null ? manualScore : essayScores[questionIndex];
      const score = scoreValue !== undefined ? parseFloat(scoreValue) : 0;

      if (isNaN(score) || score < 0 || score > 2) {
        toast.error('Score must be a number between 0 and 2');
        return;
      }

      // Check if it was unscored before
      const answer = selectedResult.userAnswers[questionIndex];
      // A question is considered scored if isScored is true OR if it has a legacy score > 0
      const isActuallyScored = answer.isScored || (answer.type === 'essay' && answer.score > 0);
      const wasUnscored = answer.type === 'essay' && !isActuallyScored;

      const response = await api.patch(`/quiz-results/${resultId}/score`, {
        questionIndex,
        score
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      setSelectedResult(response.data.data);
      setResults(results.map(result => result._id === resultId ? response.data.data : result));
      setError(null);

      if (wasUnscored && score > 0) {
        toast.success(`Question ${questionIndex + 1} scored successfully!`, {
          description: `Score: ${score}/2 points assigned.`,
        });
      } else {
        toast.success(`Score updated for Question ${questionIndex + 1}`);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update score';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const getPerformanceColor = (percentage) => {
    const thresholds = settings?.thresholds || { pass: 85, average: 70, fail: 50, quizPassScore: 70 };
    const passThreshold = thresholds.quizPassScore || 70;

    if (percentage >= passThreshold) return 'success';
    if (percentage >= thresholds.fail) return 'warning';
    return 'error';
  };

  const getChartData = () => {
    if (!selectedResult) return null;

    const labels = Array.from({ length: selectedResult.totalQuestions }, (_, i) => `Q${i + 1}`);
    const totalQCount = selectedResult.userAnswers?.length || selectedResult.totalQuestions;
    const correctData = Array(totalQCount).fill(0);
    const incorrectData = Array(totalQCount).fill(0);
    selectedResult.userAnswers.forEach((answer, index) => {
      correctData[index] = answer.type === 'essay' ? (answer.score || 0) : (answer.isCorrect ? 2 : 0);
      incorrectData[index] = answer.type === 'essay' ? (2 - (answer.score || 0)) : (answer.isCorrect ? 0 : 2);
    });

    return {
      labels,
      datasets: [
        {
          label: 'Score',
          data: correctData,
          backgroundColor: colors.chartCorrect,
        },
        {
          label: 'Missed (Options Only)',
          data: incorrectData,
          backgroundColor: colors.chartIncorrect,
        },
      ],
    };
  };

  const getCategoryChartData = () => {
    if (!selectedResult) return null;

    const categoryData = selectedResult.userAnswers.reduce((acc, answer) => {
      if (!acc[answer.category]) {
        acc[answer.category] = { score: 0, missed: 0, total: 0 };
      }
      acc[answer.category].total += 1;
      if (answer.type === 'essay') {
        const score = answer.score || 0;
        acc[answer.category].score += score;
        acc[answer.category].missed += (2 - score);
      } else {
        if (answer.isCorrect) {
          acc[answer.category].score += 2;
        } else {
          acc[answer.category].missed += 2;
        }
      }
      return acc;
    }, {});

    const labels = Object.keys(categoryData);

    return {
      labels,
      datasets: [
        {
          label: 'Score',
          data: labels.map(category => categoryData[category].score),
          backgroundColor: colors.chartCorrect,
        },
        {
          label: 'Missed (Options Only)',
          data: labels.map(category => categoryData[category].missed),
          backgroundColor: colors.chartIncorrect,
        },
      ],
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
      title: {
        display: true,
        text: 'Question-by-Question Performance',
        color: colors.textPrimary
      },
    },
    scales: {
      x: {
        ticks: {
          color: colors.textPrimary
        },
        grid: {
          color: tok('--overlay-subtle')
        }
      },
      y: {
        ticks: {
          color: colors.textPrimary,
          stepSize: 0.5,
          min: 0,
          max: 2
        },
        grid: {
          color: tok('--overlay-subtle')
        }
      },
    },
  };

  const horizontalChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: colors.textPrimary
        }
      },
      title: {
        display: true,
        text: 'Category Performance',
        color: colors.textPrimary
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || '';
            const value = context.raw;
            const total = context.chart.data.datasets[0].data[context.dataIndex] +
              context.chart.data.datasets[1].data[context.dataIndex];
            const percentage = total > 0 ? Math.round((value / (total)) * 100) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        ticks: {
          color: colors.textPrimary,
          stepSize: 1,
        },
        grid: {
          color: tok('--overlay-subtle')
        }
      },
      y: {
        stacked: true,
        ticks: {
          color: colors.textPrimary,
          font: {
            size: isMobile ? 10 : 12
          }
        },
        grid: {
          color: tok('--overlay-subtle')
        }
      },
    },
  };

  const analyzeCategoryPerformance = (userAnswers) => {
    const categoryStats = userAnswers.reduce((acc, answer) => {
      if (!acc[answer.category]) {
        acc[answer.category] = { total: 0, score: 0 };
      }
      acc[answer.category].total += 1;
      if (answer.type === 'essay') {
        acc[answer.category].score += answer.score || 0;
      } else if (answer.isCorrect) {
        acc[answer.category].score += 2;
      }
      return acc;
    }, {});

    const strengths = [];
    const improvements = [];

    Object.entries(categoryStats).forEach(([category, stats]) => {
      const maxScore = stats.total * 2; // Max 2 points per question
      const percentage = maxScore > 0 ? (stats.score / maxScore) * 100 : 0;
      if (percentage >= 70) {
        strengths.push({
          category,
          percentage: Math.round(percentage),
          score: stats.score,
          total: maxScore
        });
      } else {
        improvements.push({
          category,
          percentage: Math.round(percentage),
          score: stats.score,
          total: maxScore
        });
      }
    });

    strengths.sort((a, b) => b.percentage - a.percentage);
    improvements.sort((a, b) => a.percentage - b.percentage);

    return { strengths, improvements };
  };

  const exportToExcel = () => {
    if (!results.length) return;

    setExporting(true);

    try {
      // Prepare data for Excel
      const worksheetData = results.map(result => ({
        'Team Name': result.teamName,
        'Date': new Date(result.submittedAt).toLocaleString(),
        'Score': `${result.percentage}/100`,
        'Percentage': `${result.percentage}%`,
        'Points Scored': result.correctAnswers,
        'Max Possible Points': (result.userAnswers?.length || result.totalQuestions) * 2,
        'Total Questions': result.userAnswers?.length || result.totalQuestions
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Quiz Results');

      // Generate Excel file
      const teamNameForFile = results[0].teamName.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
      const fileName = `Quiz_Results_${teamNameForFile}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      // Download the file
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setError('Failed to export results to Excel');
    } finally {
      setExporting(false);
    }
  };

  // Add this function to export detailed results
  const exportDetailedResults = (result) => {
    if (!result) return;

    try {
      // Prepare detailed data for Excel
      const detailedData = result.userAnswers.map((answer, index) => ({
        'Question Number': index + 1,
        'Question': answer.question,
        'Type': answer.type,
        'Category': answer.category,
        'Selected Answer': answer.selectedAnswer || answer.essayAnswer || 'No answer provided',
        'Correct Answer': answer.correctAnswer || 'N/A (Essay)',
        'Score': answer.type === 'essay' ? (answer.score || 0) : (answer.isCorrect ? 2 : 0),
        'Is Correct': answer.type === 'essay' ? 'Scored' : (answer.isCorrect ? 'Yes' : 'No')
      }));

      // Add summary row
      detailedData.push({});
      detailedData.push({
        'Question Number': 'SUMMARY',
        'Question': '',
        'Type': '',
        'Category': '',
        'Selected Answer': '',
        'Correct Answer': '',
        'Score': result.correctAnswers,
        'Is Correct': `Percentage: ${result.percentage}%`
      });

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(detailedData);

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Detailed Results');

      // Generate Excel file
      const teamNameForFile = result.teamName.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
      const fileName = `Detailed_Results_${teamNameForFile}_${new Date(result.submittedAt).toISOString().slice(0, 10)}.xlsx`;

      // Download the file
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error exporting detailed results:', error);
      setError('Failed to export detailed results to Excel');
    }
  };

  const exportToPDF = async () => {
    if (!selectedResult) return;

    toast.info('Generating PDF Report...');
    try {
      const { strengths, improvements } = analyzeCategoryPerformance(selectedResult.userAnswers);

      let markdown = `| Metric | Value |\n`;
      markdown += `| :--- | :--- |\n`;
      markdown += `| **Team Name** | ${selectedResult.teamName} |\n`;
      markdown += `| **Date Taken** | ${new Date(selectedResult.submittedAt).toLocaleString()} |\n`;
      markdown += `| **Score** | ${selectedResult.percentage}/100 |\n`;
      markdown += `| **Percentage** | ${selectedResult.percentage}% |\n\n`;

      markdown += `## Category Performance Analytics\n\n`;

      if (strengths.length > 0) {
        markdown += `### Strongest Areas\n`;
        strengths.forEach(s => {
          markdown += `• **${s.category}**: ${s.percentage}% (${s.score}/${s.total})\n`;
        });
        markdown += `\n`;
      }

      if (improvements.length > 0) {
        markdown += `### Areas for Improvement\n`;
        improvements.forEach(i => {
          markdown += `• **${i.category}**: ${i.percentage}% (${i.score}/${i.total})\n`;
        });
        markdown += `\n`;
      }

      markdown += `## Question-by-Question Analysis\n\n`;
      markdown += `| # | Question | Type | Category | Result/Score |\n`;
      markdown += `| :--- | :--- | :--- | :--- | :--- |\n`;

      selectedResult.userAnswers.forEach((answer, index) => {
        const score = answer.type === 'essay' ? (answer.score || 0) : (answer.isCorrect ? 2 : 0);
        const resultText = answer.type === 'essay' ? `${score}/2` : (answer.isCorrect ? 'Correct (2/2)' : 'Incorrect (0/2)');
        const sanitizedQuestion = (answer.question || "").replace(/\|/g, '\\|');
        markdown += `| ${index + 1} | ${sanitizedQuestion} | ${answer.type} | ${answer.category} | ${resultText} |\n`;
      });

      const response = await api.post('/ai/report/download', {
        reportContent: markdown,
        format: 'pdf',
        title: `Performance Assessment - ${selectedResult.teamName}`
      }, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const teamNameForFile = selectedResult.teamName.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
      a.download = `Assessment_Report_${teamNameForFile}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('PDF Report exported successfully!');
    } catch (err) {
      console.error('PDF Export failed:', err);
      toast.error('Failed to generate PDF report');
    }
  };

  const scoreTone = (p) => ({ success: 'success', warning: 'warning', error: 'danger' })[getPerformanceColor(p)];
  const fmtDateTime = (d) => (d ? new Date(d).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
  const isScored = (a) => a.type === 'options' || a.isScored || (a.type === 'essay' && a.score > 0);
  const answerCount = (r) => r.userAnswers?.length || r.totalQuestions || 0;
  const selectedRows = results.filter((r) => selection.includes(r._id));

  const resultColumns = [
    { field: 'submittedAt', headerName: 'Date', type: 'dateTime', width: 190, valueGetter: (v) => (v ? new Date(v) : null), renderCell: ({ value }) => fmtDateTime(value) },
    { field: 'teamName', headerName: 'Team', flex: 1, minWidth: 180 },
    { field: 'percentage', headerName: 'Score', type: 'number', width: 110, align: 'left', headerAlign: 'left', renderCell: ({ value }) => <Badge tone={scoreTone(value)}>{value}/100</Badge> },
    { field: 'correctAnswers', headerName: 'Points', type: 'number', width: 110, align: 'left', headerAlign: 'left', renderCell: ({ row }) => `${row.correctAnswers ?? '—'} / ${answerCount(row) * 2}` },
    { field: 'scored', headerName: 'Scored', width: 110, sortable: false, valueGetter: (_v, row) => `${(row.userAnswers || []).filter(isScored).length}/${answerCount(row)}` },
    {
      field: 'actions', headerName: '', width: 56, sortable: false, filterable: false, align: 'right',
      renderCell: ({ row }) => (
        <IconButton size="small" aria-label={`Actions for ${row.teamName}`} onClick={(e) => { e.stopPropagation(); setRowMenu({ anchor: e.currentTarget, row }); }}>
          <MoreHoriz fontSize="small" />
        </IconButton>
      ),
    },
  ];

  const editErrors = {
    score: editingScore === '' || Number(editingScore) < 0 || Number(editingScore) > 100 ? 'Enter 0–100' : '',
    correct: editingCorrect !== '' && Number(editingCorrect) < 0 ? 'Can’t be negative' : '',
    total: editingTotal === '' || Number(editingTotal) < 1 ? 'At least 1' : '',
  };
  const editInvalid = Object.values(editErrors).some(Boolean);

  const answerBox = { my: 1.25, p: 1.5, borderRadius: '8px', backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--border)' };
  const answerRow = (label, value, color) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '150px 1fr' }, gap: 1, fontSize: 13 }}>
      <Typography sx={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{label}</Typography>
      <Typography dir="auto" sx={{ fontSize: 13, color: color || 'var(--text)' }}>{value}</Typography>
    </Box>
  );

  const filterCounts = selectedResult ? {
    all: selectedResult.userAnswers.length,
    'needs-scoring': selectedResult.userAnswers.filter((a) => a.type === 'essay' && !isScored(a)).length,
    scored: selectedResult.userAnswers.filter(isScored).length,
    correct: selectedResult.userAnswers.filter((a) => a.type === 'options' && a.isCorrect).length,
    incorrect: selectedResult.userAnswers.filter((a) => a.type === 'options' && !a.isCorrect).length,
  } : {};
  const analysis = selectedResult ? analyzeCategoryPerformance(selectedResult.userAnswers) : { strengths: [], improvements: [] };
  const categoryChart = selectedResult ? getCategoryChartData() : null;
  const questionChart = selectedResult ? getChartData() : null;

  return (
    <Box>
      <PageHeader
        title="Assessment Dashboard"
        description="Technical quiz results per field team: scores, answers and essay scoring."
        actions={!selectedResult && results.length > 0 && (
          <Button variant="outlined" startIcon={<FileDownloadOutlined sx={{ fontSize: 16 }} />} onClick={exportToExcel} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export results'}
          </Button>
        )}
      />

      {!selectedResult && (
        <>
          {/* Team picker */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Autocomplete
              options={allTeams}
              getOptionLabel={(option) => option.teamName || option.teamId || ''}
              value={allTeams.find((team) => team.teamId === teamId) || null}
              onChange={(_e, v) => {
                setSelection([]);
                if (v) {
                  setTeamId(v.teamId);
                  fetchResults(v.teamId);
                } else {
                  setTeamId('');
                  setResults([]);
                  setError(null);
                }
              }}
              renderInput={(params) => <TextField {...params} placeholder="Choose a field team…" slotProps={{ htmlInput: { ...params.inputProps, 'aria-label': 'Field team' } }} />}
              sx={{ width: { xs: '100%', sm: 340 } }}
            />
            {teamId && (
              <Button variant="outlined" startIcon={<Refresh sx={{ fontSize: 16 }} />} onClick={() => fetchResults()} disabled={loading}>Refresh</Button>
            )}
            <Box sx={{ flex: 1 }} />
            {teamId && !loading && <Typography sx={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{results.length} result{results.length === 1 ? '' : 's'}</Typography>}
          </Box>

          {globalStats && (
            <>
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' }, mb: 2 }}>
                <StatCard label="Field teams" value={globalStats.totalTeams} />
                <StatCard label="Teams with results" value={globalStats.teamsWithResults} />
                <StatCard label="Quiz results" value={globalStats.totalResults} />
                <StatCard label="Average score" value={`${globalStats.averageScore}%`} />
              </Box>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, mb: 2 }}>
                <SectionCard title="Top teams" description="Highest average quiz score">
                  {globalStats.topTeams.map((team, idx) => (
                    <Box key={team.teamName || idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.75, borderBottom: '1px solid var(--border)', '&:last-of-type': { borderBottom: 0 } }}>
                      <Typography sx={{ width: 20, fontSize: 12.5, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</Typography>
                      <Typography noWrap dir="auto" sx={{ flex: 1, fontSize: 13 }}>{team.teamName}</Typography>
                      <Badge tone={scoreTone(team.averageScore)}>{team.averageScore}%</Badge>
                    </Box>
                  ))}
                </SectionCard>
                <SectionCard title="Score distribution" description="Teams by average score">
                  {Object.entries(globalStats.scoreDistribution).map(([category, count]) => (
                    <Box key={category} sx={{ display: 'flex', alignItems: 'center', py: 0.75, borderBottom: '1px solid var(--border)', '&:last-of-type': { borderBottom: 0 } }}>
                      <Typography sx={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{category}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{count}</Typography>
                    </Box>
                  ))}
                </SectionCard>
              </Box>
            </>
          )}

          {error && <ErrorState title="Results didn’t load" message={error} onRetry={teamId ? () => fetchResults() : undefined} sx={{ mb: 2 }} />}

          {selectedRows.length > 0 && (
            <BulkBar
              count={selectedRows.length}
              onExport={() => exportRows(selectedRows, RESULT_COLUMNS, { filename: 'quiz-results-selected' })}
              onDelete={isAdmin ? () => setDeleting(selectedRows) : undefined}
              onClear={() => setSelection([])}
            />
          )}

          {loading ? (
            <PageLoader minHeight={240} variant="table" rows={5} />
          ) : teamId ? (
            <DataGrid
              rows={results}
              columns={resultColumns}
              getRowId={(r) => r._id}
              onRowClick={({ row }) => setSelectedResult(row)}
              checkboxSelection
              disableRowSelectionOnClick
              rowSelectionModel={selection}
              onRowSelectionModelChange={setSelection}
              autoHeight
              rowHeight={46}
              columnHeaderHeight={40}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } }, sorting: { sortModel: [{ field: 'submittedAt', sort: 'desc' }] } }}
              slots={{ noRowsOverlay: () => <EmptyState title="No quiz results for this team" description="Results appear here after the team takes the quiz." minHeight={200} /> }}
              sx={{ ...gridSx, minHeight: 260 }}
            />
          ) : (
            <SectionCard>
              <EmptyState title="Choose a field team" description="Pick a team above to see its quiz results, review answers and score essays." minHeight={200} />
            </SectionCard>
          )}
        </>
      )}

      {selectedResult && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button variant="text" startIcon={<ArrowBack sx={{ fontSize: 16 }} />} onClick={() => setSelectedResult(null)} sx={{ color: 'var(--text-secondary)' }}>All results</Button>
            <Box sx={{ flex: 1 }} />
            <Button variant="outlined" startIcon={<FileDownloadOutlined sx={{ fontSize: 16 }} />} onClick={() => exportDetailedResults(selectedResult)}>Export answers</Button>
            <Button variant="outlined" startIcon={<PictureAsPdfOutlined sx={{ fontSize: 16 }} />} onClick={exportToPDF}>PDF report</Button>
            <Button variant="contained" startIcon={<EditOutlined sx={{ fontSize: 16 }} />} onClick={() => handleOpenEdit(selectedResult)}>Edit result</Button>
          </Box>

          <SectionCard title={selectedResult.teamName} description={`Taken ${fmtDateTime(selectedResult.submittedAt)}`} actions={<Badge tone={scoreTone(selectedResult.percentage)}>{selectedResult.percentage}/100</Badge>}>
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' } }}>
              <StatCard label="Score" value={`${selectedResult.percentage}%`} />
              <StatCard label="Points" value={`${selectedResult.correctAnswers ?? '—'} / ${answerCount(selectedResult) * 2}`} />
              <StatCard label="Questions scored" value={`${filterCounts.scored}/${filterCounts.all}`} hint={filterCounts['needs-scoring'] ? `${filterCounts['needs-scoring']} essay(s) to score` : 'All scored'} />
              <StatCard label="Categories" value={analysis.strengths.length + analysis.improvements.length} hint={`${analysis.strengths.length} strong · ${analysis.improvements.length} to improve`} />
            </Box>
            {selectedResult.remarks && <Typography sx={{ mt: 1.5, fontSize: 13, color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text)' }}>Remarks:</strong> {selectedResult.remarks}</Typography>}
          </SectionCard>

          <Box id="assessment-overview" sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' } }}>
            <SectionCard title="Score by question" description="2 points per question" sx={{ minWidth: 0 }}>
              {questionChart && (
                <Box sx={{ height: isMobile ? 250 : 300, position: 'relative' }}>
                  <Bar data={questionChart} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { display: false }, legend: { ...chartOptions.plugins.legend, position: 'bottom' } } }} />
                </Box>
              )}
            </SectionCard>
            <SectionCard title="Strengths and gaps" description="Categories at or above 70% are strengths">
              <Typography sx={{ fontSize: 12.5, color: 'var(--text-secondary)', mb: 0.75 }}>Strongest areas ({analysis.strengths.length})</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                {analysis.strengths.length ? analysis.strengths.map((s) => (
                  <Tooltip key={s.category} title={`${s.score}/${s.total} points (${s.percentage}%)`}><span><Badge tone="success">{s.category} · {s.percentage}%</Badge></span></Tooltip>
                )) : <Typography sx={{ fontSize: 12.5, color: 'var(--text-muted)' }}>None yet</Typography>}
              </Box>
              <Typography sx={{ fontSize: 12.5, color: 'var(--text-secondary)', mb: 0.75 }}>Needs improvement ({analysis.improvements.length})</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {analysis.improvements.length ? analysis.improvements.map((s) => (
                  <Tooltip key={s.category} title={`${s.score}/${s.total} points (${s.percentage}%)`}><span><Badge tone="danger">{s.category} · {s.percentage}%</Badge></span></Tooltip>
                )) : <Typography sx={{ fontSize: 12.5, color: 'var(--text-muted)' }}>All categories meet the standard</Typography>}
              </Box>
            </SectionCard>
          </Box>

          <SectionCard title="Performance by category" description={`${selectedResult.totalQuestions || answerCount(selectedResult)} questions`}>
            {categoryChart && (
              <Box sx={{ height: isMobile ? 260 : Math.max(220, categoryChart.labels.length * 36), position: 'relative' }}>
                <Bar
                  data={categoryChart}
                  options={{
                    ...horizontalChartOptions,
                    plugins: {
                      ...horizontalChartOptions.plugins,
                      title: { display: false },
                      legend: { ...horizontalChartOptions.plugins.legend, position: 'bottom' },
                      tooltip: {
                        callbacks: {
                          afterLabel: (context) => {
                            const score = context.chart.data.datasets[0].data[context.dataIndex];
                            const missed = context.chart.data.datasets[1].data[context.dataIndex];
                            const total = score + missed;
                            return `Percentage: ${total > 0 ? Math.round((score / total) * 100) : 0}%`;
                          },
                        },
                      },
                    },
                    scales: { ...horizontalChartOptions.scales, x: { ...horizontalChartOptions.scales.x, max: Math.max(...categoryChart.datasets.flatMap((d) => d.data)) + 1 } },
                  }}
                />
              </Box>
            )}
          </SectionCard>

          <SectionCard title="Answers" description="Review each answer and score essay questions (0–2).">
            <Tabs value={questionFilter} onChange={(_e, v) => setQuestionFilter(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 1.5 }}>
              {[['all', 'All'], ['needs-scoring', 'Needs scoring'], ['scored', 'Scored'], ['correct', 'Correct'], ['incorrect', 'Incorrect']].map(([v, l]) => (
                <Tab key={v} value={v} label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>{l}<Box component="span" sx={{ px: 0.75, height: 18, minWidth: 18, borderRadius: '5px', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', backgroundColor: 'var(--surface-active)' }}>{filterCounts[v]}</Box></Box>} />
              ))}
            </Tabs>
            {selectedResult.userAnswers
              .map((answer, originalIndex) => ({ answer, originalIndex }))
              .filter(({ answer }) => {
                if (questionFilter === 'needs-scoring') return answer.type === 'essay' && !isScored(answer);
                if (questionFilter === 'scored') return isScored(answer);
                if (questionFilter === 'correct') return answer.type === 'options' && answer.isCorrect;
                if (questionFilter === 'incorrect') return answer.type === 'options' && !answer.isCorrect;
                return true;
              })
              .map(({ answer, originalIndex }) => (
                <Box key={originalIndex} sx={{ py: 2, borderBottom: '1px solid var(--border)', '&:last-of-type': { borderBottom: 0, pb: 0 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Question {originalIndex + 1}</Typography>
                    <Badge outline>{answer.category}</Badge>
                    {answer.type === 'essay'
                      ? <Badge tone={isScored(answer) ? 'success' : 'warning'} dot>{isScored(answer) ? `Scored ${answer.score || 0}/2` : 'Needs scoring'}</Badge>
                      : <Badge tone={answer.isCorrect ? 'success' : 'danger'} dot>{answer.isCorrect ? 'Correct' : 'Incorrect'}</Badge>}
                  </Box>
                  <Typography dir="auto" sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>{answer.question}</Typography>
                  {answer.type === 'essay' ? (
                    <>
                      <Box sx={answerBox}>{answerRow('Essay answer', answer.essayAnswer || 'No answer provided')}</Box>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                        <TextField
                          label="Score (0–2)"
                          type="number"
                          value={essayScores[originalIndex] !== undefined ? essayScores[originalIndex] : answer.score?.toString() || '0'}
                          onChange={(e) => setEssayScores({ ...essayScores, [originalIndex]: e.target.value })}
                          error={essayScores[originalIndex] !== undefined && (Number(essayScores[originalIndex]) < 0 || Number(essayScores[originalIndex]) > 2)}
                          slotProps={{ htmlInput: { step: '0.5', min: 0, max: 2 } }}
                          sx={{ width: 120 }}
                        />
                        <Button variant="contained" startIcon={<SaveOutlined sx={{ fontSize: 16 }} />} onClick={() => handleUpdateEssayScore(selectedResult._id, originalIndex)}>Save score</Button>
                        <Button variant="outlined" onClick={() => handleUpdateEssayScore(selectedResult._id, originalIndex, 0)}>Give zero</Button>
                      </Box>
                    </>
                  ) : (
                    <Box sx={answerBox}>
                      {answerRow('Options', <Box component="ul" sx={{ m: 0, pl: 2.5 }}>{(answer.options || []).map((o, i) => <li key={i} dir="auto">{o}</li>)}</Box>)}
                      <Box sx={{ mt: 1 }}>{answerRow('Selected', answer.selectedAnswer || 'No answer selected', answer.selectedAnswer && answer.isCorrect ? 'var(--success)' : 'var(--danger)')}</Box>
                      <Box sx={{ mt: 1 }}>{answerRow('Correct answer', answer.correctAnswer, 'var(--success)')}</Box>
                    </Box>
                  )}
                </Box>
              ))}
          </SectionCard>
        </Box>
      )}

      <Menu anchorEl={rowMenu?.anchor} open={Boolean(rowMenu)} onClose={() => setRowMenu(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem onClick={() => { setSelectedResult(rowMenu.row); setRowMenu(null); }}><ListItemIcon><VisibilityOutlined fontSize="small" /></ListItemIcon>View answers</MenuItem>
        <MenuItem onClick={() => { handleOpenEdit(rowMenu.row); setRowMenu(null); }}><ListItemIcon><EditOutlined fontSize="small" /></ListItemIcon>Edit result</MenuItem>
        <MenuItem onClick={() => { exportDetailedResults(rowMenu.row); setRowMenu(null); }}><ListItemIcon><FileDownloadOutlined fontSize="small" /></ListItemIcon>Export answers</MenuItem>
        {isAdmin && <Divider />}
        {isAdmin && (
          <MenuItem onClick={() => { setDeleting([rowMenu.row]); setRowMenu(null); }} sx={{ color: 'var(--danger)' }}>
            <ListItemIcon><DeleteOutline fontSize="small" sx={{ color: 'var(--danger)' }} /></ListItemIcon>Delete permanently…
          </MenuItem>
        )}
      </Menu>

      <AppDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        title="Edit quiz result"
        description={currentResult ? `Score, points and remarks for ${currentResult.candidateName || currentResult.teamName}.` : ''}
        onSubmit={handleSaveEdit}
        primary={{ label: 'Save changes', loadingLabel: 'Saving…', loading: savingEdit, disabled: editInvalid }}
      >
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' } }}>
          <TextField required label="Score (%)" type="number" value={editingScore} onChange={(e) => setEditingScore(e.target.value)} error={Boolean(editErrors.score)} helperText={editErrors.score || ' '} slotProps={{ htmlInput: { min: 0, max: 100 } }} />
          <TextField label="Points" type="number" value={editingCorrect} onChange={(e) => setEditingCorrect(e.target.value)} error={Boolean(editErrors.correct)} helperText={editErrors.correct || ' '} slotProps={{ htmlInput: { min: 0 } }} />
          <TextField required label="Questions" type="number" value={editingTotal} onChange={(e) => setEditingTotal(e.target.value)} error={Boolean(editErrors.total)} helperText={editErrors.total || ' '} slotProps={{ htmlInput: { min: 1 } }} />
        </Box>
        <TextField fullWidth label="Assessor remarks" multiline minRows={3} value={editingRemarks} onChange={(e) => setEditingRemarks(e.target.value)} />
      </AppDialog>

      <SafeDeleteDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        records={deleting || []}
        noun={{ one: 'quiz result', many: 'quiz results' }}
        nameOf={(r) => `${r.teamName} · ${fmtDateTime(r.submittedAt)} · ${r.percentage}%`}
        exportColumns={RESULT_COLUMNS}
        exportFilename="quiz-results"
        onDelete={(list) => bulkDelete(DELETE_PATHS.quizResults, list.map((r) => r._id))}
        onDeleted={({ deleted }) => {
          setResults((prev) => prev.filter((r) => !deleted.includes(r._id)));
          setSelection((s) => s.filter((id) => !deleted.includes(id)));
          if (deleted.includes(selectedResult?._id)) setSelectedResult(null);
        }}
      />
    </Box>
  );
};

export default PerfAssessmentDashboard;
