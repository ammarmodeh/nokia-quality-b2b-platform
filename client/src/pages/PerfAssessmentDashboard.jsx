import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Card,
  CardContent,
  Tooltip,
  TablePagination,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  Stack,
  Autocomplete,
  Tabs,
  Tab
} from '@mui/material';
import {
  Search,
  ArrowBack,
  BarChart,
  Refresh,
  Save,
  Download
} from '@mui/icons-material';
import { MdPictureAsPdf } from 'react-icons/md';
import api from '../api/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Legend);

const PerfAssessmentDashboard = () => {
  const [teamId, setTeamId] = useState('');
  const [allTeams, setAllTeams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentResult, setCurrentResult] = useState(null);
  const [essayScores, setEssayScores] = useState({});
  const [questionFilter, setQuestionFilter] = useState('all');
  const [settings, setSettings] = useState(null);
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:503px)');
  const [exporting, setExporting] = useState(false);

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
      } catch (err) {
        console.error('Failed to fetch settings');
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (selectedResult) {
      console.log('Selected Result:', JSON.stringify(selectedResult, null, 2)); // Debug log
      const initialScores = selectedResult.userAnswers.reduce((acc, answer, index) => {
        if (answer.type === 'essay') {
          acc[index] = answer.score !== undefined ? answer.score.toString() : '0';
        }
        return acc;
      }, {});
      setEssayScores(initialScores);
    }
  }, [selectedResult]);

  const colors = {
    background: '#2d2d2d',
    surface: 'transparent',
    surfaceElevated: '#252525',
    border: '#e5e7eb',
    primary: '#7b68ee',
    primaryHover: 'rgba(62, 166, 255, 0.08)',
    textPrimary: '#ffffff',
    textSecondary: '#6b7280',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    chartCorrect: '#4caf50',
    chartIncorrect: '#f44336',
  };

  const fetchResults = async () => {
    if (!teamId.trim()) {
      setError('Please select a Team');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/quiz-results?teamId=${teamId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      setResults(response.data.data);
      // console.log('Quiz Results:', JSON.stringify(response.data.data, null, 2)); // Debug log
      if (response.data.data.length === 0) {
        setError('No results found for this Team');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      fetchResults();
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setCurrentResult(null);
  };

  const handleDeleteResult = async () => {
    if (!currentResult) return;

    try {
      await api.delete(`/quiz-results/${currentResult._id}`);
      setResults(results.filter(result => result._id !== currentResult._id));
      handleMenuClose();
    } catch (err) {
      setError('Failed to delete result');
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
          color: 'rgba(255, 255, 255, 0.1)'
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
          color: 'rgba(255, 255, 255, 0.1)'
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
          color: 'rgba(255, 255, 255, 0.1)'
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
          color: 'rgba(255, 255, 255, 0.1)'
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

      let markdown = `## Assessment Details\n\n`;
      markdown += `| Metric | Value |\n`;
      markdown += `| :--- | :--- |\n`;
      const totalQCount = selectedResult.userAnswers?.length || selectedResult.totalQuestions;
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

  return (
    <Box sx={{
      // backgroundColor: colors.background,
      minHeight: '100vh',
      color: colors.textPrimary,
      maxWidth: '1100px',
      mx: 'auto',
      // p: 2,
      px: isMobile ? 0 : undefined
    }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/')}
        sx={{
          mb: 2,
          color: colors.primary,
          '&:hover': {
            backgroundColor: colors.primaryHover
          }
        }}
      >
        Back to Dashboard
      </Button>

      <Typography variant="h4" gutterBottom sx={{
        color: colors.primary,
        fontWeight: 'bold',
        mb: 4
      }}>
        Perf Assessment Dashboard
      </Typography>

      <Paper sx={{
        p: 3,
        mb: 3,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: isMobile ? 'column' : 'row', height: isMobile ? undefined : '36px' }}>
          <Autocomplete
            freeSolo
            options={allTeams}
            getOptionLabel={(option) => option.teamName || option.teamId || ''}
            value={allTeams.find(team => team.teamId === teamId) || null}
            onChange={(event, newValue) => {
              if (newValue) {
                setTeamId(newValue.teamId);
              } else {
                setTeamId('');
                setResults([]);
                setSelectedResult(null);
              }
            }}
            onInputChange={(event, newInputValue) => {
              if (!newInputValue) {
                setTeamId('');
                setResults([]);
                setSelectedResult(null);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Team"
                variant="outlined"
                onKeyPress={handleKeyPress}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: colors.border,
                    },
                    '&:hover fieldset': {
                      borderColor: colors.primary,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: colors.primary,
                    },
                    color: colors.textPrimary,
                    height: '36px',
                    fontSize: '0.8rem',
                  },
                  '& .MuiInputBase-input': {
                    padding: '8px 12px',
                    height: 'auto',
                  },
                  '& .MuiInputLabel-root': {
                    color: colors.textSecondary,
                    fontSize: '0.8rem',
                    top: '-7px',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: colors.primary,
                    top: '1px',
                  },
                  '& input': {
                    caretcolor: '#ffffff',
                  },
                  '& input:-webkit-autofill': {
                    WebkitBoxShadow: `0 0 0 1000px ${colors.surface} inset`,
                    WebkitTextFillColor: colors.textPrimary,
                    transition: 'background-color 5000s ease-in-out 0s',
                    caretcolor: '#ffffff',
                  },
                }}
              />
            )}
            sx={{
              width: '100%',
              '& .MuiAutocomplete-popupIndicator': {
                color: colors.textSecondary,
                '&:hover': {
                  backgroundColor: colors.primaryHover,
                }
              },
              '& .MuiAutocomplete-clearIndicator': {
                color: colors.textSecondary,
                '&:hover': {
                  backgroundColor: colors.primaryHover,
                }
              },
            }}
            componentsProps={{
              paper: {
                sx: {
                  backgroundColor: colors.surfaceElevated,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`,
                  '& .MuiAutocomplete-option': {
                    '&[aria-selected="true"]': {
                      backgroundColor: `${colors.primary}22`,
                    },
                    '&[aria-selected="true"].Mui-focused': {
                      backgroundColor: `${colors.primary}33`,
                    },
                    '&.Mui-focused': {
                      backgroundColor: colors.primaryHover,
                    },
                  },
                },
              },
              popper: {
                sx: {
                  '& .MuiAutocomplete-listbox': {
                    backgroundColor: colors.surfaceElevated,
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: colors.surface,
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: colors.border,
                      borderRadius: '4px',
                    },
                  },
                },
              },
            }}
          />

          <Stack sx={{ width: isMobile ? '100%' : 'auto', flexDirection: 'row', gap: 2, height: '36px' }}>
            <Button
              variant="contained"
              startIcon={<Search />}
              onClick={fetchResults}
              disabled={loading}
              sx={{
                backgroundColor: colors.primary,
                '&:hover': {
                  backgroundColor: '#1d4ed8',
                },
                '&:disabled': {
                  backgroundColor: '#555',
                  color: '#999'
                },
                minWidth: isMobile ? undefined : '120px',
                width: isMobile ? '100%' : undefined
              }}
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>

            {results.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={exportToExcel}
                disabled={exporting}
                sx={{
                  color: colors.primary,
                  borderColor: colors.primary,
                  '&:hover': {
                    backgroundColor: colors.primaryHover,
                    borderColor: colors.primary,
                  },
                  '&:disabled': {
                    borderColor: '#555',
                    color: '#999'
                  },
                  minWidth: isMobile ? undefined : '180px',
                  width: isMobile ? '100%' : undefined
                }}
              >
                {exporting ? 'Exporting...' : 'Export Excel'}
              </Button>
            )}
          </Stack>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{
          mb: 3,
          backgroundColor: '#2d0000',
          color: '#ff6e6e',
          border: '1px solid #ff3d3d',
          borderRadius: '8px'
        }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          p: 4,
          backgroundColor: colors.surface,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`
        }}>
          <CircularProgress sx={{ color: colors.primary }} />
        </Box>
      )}

      {!loading && results.length > 0 && !selectedResult && (
        <>
          <TableContainer component={Paper} sx={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px',
            borderBottomLeftRadius: '0px',
            borderBottomRightRadius: '0px',
            "& .MuiTableHead-root": {
              backgroundColor: colors.surfaceElevated,
              "& .MuiTableCell-root": {
                color: colors.textSecondary,
                fontWeight: "bold",
                borderBottom: `1px solid ${colors.border}`,
              }
            },
            "& .MuiTableBody-root": {
              "& .MuiTableCell-root": {
                borderBottom: `1px solid ${colors.border}`,
                color: colors.textPrimary,
              },
              "& .MuiTableRow-root": {
                backgroundColor: colors.surface,
                "&:hover": {
                  backgroundColor: colors.surfaceElevated,
                },
              }
            },
          }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Team Name</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((result) => (
                    <TableRow key={result._id} hover>
                      <TableCell>
                        {new Date(result.submittedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "numeric",
                          minute: "numeric"
                        })}
                      </TableCell>
                      <TableCell>{result.teamName}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${result.percentage}/100`}
                          color={getPerformanceColor(result.percentage)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setSelectedResult(result)}
                            sx={{
                              color: colors.primary,
                              borderColor: colors.primary,
                              '&:hover': {
                                backgroundColor: colors.primaryHover,
                                borderColor: colors.primary,
                              }
                            }}
                          >
                            View Details
                          </Button>
                          {/* Add Export Detail Button */}
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => exportDetailedResults(result)}
                            sx={{
                              color: colors.success,
                              borderColor: colors.success,
                              '&:hover': {
                                backgroundColor: 'rgba(76, 175, 80, 0.08)',
                                borderColor: colors.success,
                              }
                            }}
                          >
                            Export Details
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={results.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            sx={{
              color: colors.textPrimary,
              '& .MuiTablePagination-selectIcon': {
                color: colors.textPrimary
              },
              '& .MuiSvgIcon-root': {
                color: colors.textPrimary
              },
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderTop: 'none',
              borderBottomLeftRadius: '8px',
              borderBottomRightRadius: '8px'
            }}
          />
        </>
      )
      }

      {
        selectedResult && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                startIcon={<ArrowBack />}
                onClick={() => setSelectedResult(null)}
                sx={{
                  color: colors.primary,
                  '&:hover': {
                    backgroundColor: colors.primaryHover
                  }
                }}
              >
                Back to Results List
              </Button>

              {/* Add Export Button for Detailed View */}
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => exportDetailedResults(selectedResult)}
                sx={{
                  color: colors.success,
                  borderColor: colors.success,
                  '&:hover': {
                    backgroundColor: 'rgba(76, 175, 80, 0.08)',
                    borderColor: colors.success,
                  }
                }}
              >
                Export Detailed Results
              </Button>
              <Button
                variant="contained"
                startIcon={<MdPictureAsPdf />}
                onClick={exportToPDF}
                sx={{
                  backgroundColor: '#dc3545',
                  '&:hover': {
                    backgroundColor: '#c82333',
                  }
                }}
              >
                Export PDF Report
              </Button>
            </Box>

            <div id="assessment-overview">
              <Card sx={{
                mb: 3,
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px'
              }}>
                <CardContent>
                  <Typography variant="h5" gutterBottom sx={{
                    color: colors.primary,
                    mb: 3
                  }}>
                    Assessment Summary
                  </Typography>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
                    gap: 3,
                    '& > div': {
                      minWidth: '150px'
                    }
                  }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Team Name</Typography>
                      <Typography sx={{ color: "white" }}>{selectedResult.teamName}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Date Taken</Typography>
                      <Typography sx={{ color: "white" }}>
                        {new Date(selectedResult.submittedAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Score</Typography>
                      <Chip
                        label={`${selectedResult.percentage}/100 (${selectedResult.correctAnswers}/${(selectedResult.userAnswers?.length || selectedResult.totalQuestions) * 2})`}
                        color={getPerformanceColor(selectedResult.percentage)}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Percentage</Typography>
                      <Typography sx={{ color: "white" }}>{selectedResult.percentage}%</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Total Score</Typography>
                      <Typography sx={{ color: "white" }}>
                        {selectedResult.percentage}/100
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Questions Scored</Typography>
                      <Typography sx={{ color: "white" }}>
                        {selectedResult.userAnswers.filter(a => a.type === 'options' || a.isScored || a.score > 0).length}/{selectedResult.userAnswers.length}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              <Box sx={{
                display: 'flex',
                gap: 3,
                flexDirection: { xs: 'column', md: 'row' },
                mb: 3
              }}>
                <Paper sx={{
                  p: 2,
                  flex: 1,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <Typography variant="h6" gutterBottom sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: colors.primary,
                    mb: 2,
                    fontSize: isMobile ? '1.1rem' : '1.25rem'
                  }}>
                    <BarChart fontSize={isMobile ? 'small' : 'medium'} />
                    {isMobile ? 'Performance' : 'Performance Overview'}
                  </Typography>
                  {getChartData() && (
                    <Box sx={{
                      height: isMobile ? '250px' : '300px',
                      position: 'relative',
                      width: '100%',
                      minWidth: isMobile ? '100%' : undefined
                    }}>
                      <Bar
                        data={getChartData()}
                        options={{
                          ...chartOptions,
                          plugins: {
                            ...chartOptions.plugins,
                            title: {
                              ...chartOptions.plugins.title,
                              display: !isMobile,
                              text: 'Question-by-Question Performance'
                            },
                            legend: {
                              ...chartOptions.plugins.legend,
                              position: isMobile ? 'bottom' : 'top'
                            }
                          },
                          scales: {
                            ...chartOptions.scales,
                            x: {
                              ...chartOptions.scales.x,
                              ticks: {
                                ...chartOptions.scales.x.ticks,
                                font: {
                                  size: isMobile ? 10 : 12
                                }
                              }
                            }
                          }
                        }}
                      />
                    </Box>
                  )}
                </Paper>

                <Paper sx={{
                  p: 2,
                  flex: 1,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px'
                }}>
                  <Typography variant="h6" gutterBottom sx={{
                    color: colors.primary,
                    mb: 2,
                    fontSize: isMobile ? '1.1rem' : '1.25rem'
                  }}>
                    {isMobile ? 'Statistics' : 'Key Statistics'}
                  </Typography>

                  {selectedResult && (() => {
                    const { strengths, improvements } = analyzeCategoryPerformance(selectedResult.userAnswers);

                    return (
                      <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                      }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{
                            color: colors.textSecondary,
                            mb: 1,
                            fontSize: isMobile ? '0.8rem' : '0.875rem'
                          }}>
                            Strongest Areas ({strengths.length})
                          </Typography>
                          {strengths.length > 0 ? (
                            <Box sx={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 1,
                              '& .MuiChip-root': {
                                fontSize: isMobile ? '0.7rem' : '0.8125rem'
                              }
                            }}>
                              {strengths.map((stat, index) => (
                                <Tooltip
                                  key={index}
                                  title={`${stat.score}/${stat.total} score (${stat.percentage}%)`}
                                  arrow
                                >
                                  <Chip
                                    label={isMobile ? stat.category.split(' ')[0] : stat.category}
                                    color="success"
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      borderColor: colors.success,
                                      color: colors.textPrimary
                                    }}
                                  />
                                </Tooltip>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{
                              color: colors.textSecondary,
                              fontSize: isMobile ? '0.8rem' : '0.875rem'
                            }}>
                              No strong categories
                            </Typography>
                          )}
                        </Box>

                        <Box>
                          <Typography variant="subtitle2" sx={{
                            color: colors.textSecondary,
                            mb: 1,
                            fontSize: isMobile ? '0.8rem' : '0.875rem'
                          }}>
                            Areas Needing Improvement ({improvements.length})
                          </Typography>
                          {improvements.length > 0 ? (
                            <Box sx={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 1,
                              '& .MuiChip-root': {
                                fontSize: isMobile ? '0.7rem' : '0.8125rem'
                              }
                            }}>
                              {improvements.map((stat, index) => (
                                <Tooltip
                                  key={index}
                                  title={`${stat.score}/${stat.total} score (${stat.percentage}%)`}
                                  arrow
                                >
                                  <Chip
                                    label={isMobile ? stat.category.split(' ')[0] : stat.category}
                                    color="error"
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      borderColor: colors.error,
                                      color: colors.textPrimary
                                    }}
                                  />
                                </Tooltip>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{
                              color: colors.textSecondary,
                              fontSize: isMobile ? '0.8rem' : '0.875rem'
                            }}>
                              All categories meet standards
                            </Typography>
                          )}
                        </Box>

                        <Box>
                          <Typography variant="subtitle2" sx={{
                            color: colors.textSecondary,
                            mb: 0.5,
                            fontSize: isMobile ? '0.8rem' : '0.875rem'
                          }}>
                            Overall Accuracy
                          </Typography>
                          <Typography sx={{
                            color: "white",
                            fontSize: isMobile ? '0.9rem' : '1rem'
                          }}>
                            {selectedResult.percentage}%
                            <Typography component="span" sx={{
                              color: colors.textSecondary,
                              ml: 1,
                              fontSize: isMobile ? '0.8rem' : '0.875rem'
                            }}>
                              ({selectedResult.percentage}/100)
                            </Typography>
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })()}
                </Paper>
              </Box>

              <Paper sx={{
                p: 2,
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                mb: 3,
                overflow: 'hidden'
              }}>
                <Typography variant="h6" gutterBottom sx={{
                  color: colors.primary,
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: isMobile ? '1.1rem' : '1.25rem'
                }}>
                  <BarChart fontSize={isMobile ? 'small' : 'medium'} />
                  {isMobile ? 'Categories' : 'Category Performance Analysis'}
                </Typography>

                {selectedResult && (() => {
                  const { strengths, improvements } = analyzeCategoryPerformance(selectedResult.userAnswers);
                  const chartData = getCategoryChartData();

                  return (
                    <>
                      <Box sx={{
                        display: 'flex',
                        gap: 3,
                        mb: 3,
                        flexWrap: 'wrap',
                        justifyContent: isMobile ? 'space-between' : 'flex-start'
                      }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{
                            color: colors.textSecondary,
                            fontSize: isMobile ? '0.8rem' : '0.875rem'
                          }}>
                            Strongest Areas
                          </Typography>
                          <Typography variant="h6" sx={{
                            color: colors.success,
                            fontSize: isMobile ? '1rem' : '1.25rem'
                          }}>
                            {strengths.length}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" sx={{
                            color: colors.textSecondary,
                            fontSize: isMobile ? '0.8rem' : '0.875rem'
                          }}>
                            Weakest Areas
                          </Typography>
                          <Typography variant="h6" sx={{
                            color: colors.error,
                            fontSize: isMobile ? '1rem' : '1.25rem'
                          }}>
                            {improvements.length}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" sx={{
                            color: colors.textSecondary,
                            fontSize: isMobile ? '0.8rem' : '0.875rem'
                          }}>
                            Total Areas Covered
                          </Typography>
                          <Typography variant="h6" sx={{
                            color: colors.textPrimary,
                            fontSize: isMobile ? '1rem' : '1.25rem'
                          }}>
                            {strengths.length + improvements.length}
                          </Typography>
                        </Box>
                      </Box>

                      {chartData && (
                        <Box sx={{
                          height: isMobile ? '250px' : '300px',
                          position: 'relative',
                          width: '100%'
                        }}>
                          <Bar
                            data={chartData}
                            options={{
                              ...horizontalChartOptions,
                              plugins: {
                                ...horizontalChartOptions.plugins,
                                tooltip: {
                                  callbacks: {
                                    afterLabel: function (context) {
                                      const dataIndex = context.dataIndex;
                                      const score = context.chart.data.datasets[0].data[dataIndex];
                                      const missed = context.chart.data.datasets[1].data[dataIndex];
                                      const total = score + missed;
                                      const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
                                      return `Percentage: ${percentage}%`;
                                    }
                                  }
                                },
                                title: {
                                  ...horizontalChartOptions.plugins.title,
                                  text: `Performance by Category (${selectedResult.totalQuestions} Questions)`,
                                  display: !isMobile
                                },
                                legend: {
                                  ...horizontalChartOptions.plugins.legend,
                                  position: isMobile ? 'bottom' : 'top'
                                }
                              },
                              scales: {
                                ...horizontalChartOptions.scales,
                                x: {
                                  ...horizontalChartOptions.scales.x,
                                  max: Math.max(...chartData.datasets.flatMap(d => d.data)) + 1
                                }
                              }
                            }}
                          />

                          {!isMobile && (
                            <Box sx={{
                              position: 'absolute',
                              top: 20,
                              right: 20,
                              backgroundColor: 'rgba(30, 30, 30, 0.8)',
                              p: 1,
                              borderRadius: 1,
                              border: `1px solid ${colors.border}`
                            }}>
                              <Typography variant="caption" sx={{
                                display: 'flex',
                                alignItems: 'center',
                                color: colors.textSecondary,
                                fontSize: '0.75rem'
                              }}>
                                <Box sx={{
                                  width: 10,
                                  height: 10,
                                  backgroundColor: colors.primary,
                                  mr: 1
                                }} />
                                Threshold: 70% score
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}
                    </>
                  );
                })()}
              </Paper>
            </div>

            <Paper sx={{
              p: 3,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px'
            }}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                flexWrap: 'wrap',
                gap: 2
              }}>
                <Typography variant="h6" sx={{ color: colors.primary }}>
                  Detailed Question Analysis
                </Typography>

                <Tabs
                  value={questionFilter}
                  onChange={(e, newVal) => setQuestionFilter(newVal)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    '& .MuiTabs-indicator': { backgroundColor: colors.primary },
                    '& .MuiTab-root': {
                      color: colors.textSecondary,
                      '&.Mui-selected': { color: colors.primary }
                    }
                  }}
                >
                  <Tab label={`All (${selectedResult.userAnswers.length})`} value="all" />
                  <Tab label={`Needs Scoring (${selectedResult.userAnswers.filter(a => a.type === 'essay' && !(a.isScored || a.score > 0)).length})`} value="needs-scoring" />
                  <Tab label={`Scored (${selectedResult.userAnswers.filter(a => a.type === 'options' || a.isScored || a.score > 0).length})`} value="scored" />
                  <Tab label={`Correct (${selectedResult.userAnswers.filter(a => a.type === 'options' && a.isCorrect).length})`} value="correct" />
                  <Tab label={`Incorrect (${selectedResult.userAnswers.filter(a => a.type === 'options' && !a.isCorrect).length})`} value="incorrect" />
                </Tabs>
              </Box>

              {selectedResult.userAnswers
                .filter(answer => {
                  const isActuallyScored = answer.type === 'options' || answer.isScored || (answer.type === 'essay' && answer.score > 0);
                  if (questionFilter === 'all') return true;
                  if (questionFilter === 'needs-scoring') return answer.type === 'essay' && !isActuallyScored;
                  if (questionFilter === 'scored') return isActuallyScored;
                  if (questionFilter === 'correct') return answer.type === 'options' && answer.isCorrect;
                  if (questionFilter === 'incorrect') return answer.type === 'options' && !answer.isCorrect;
                  return true;
                })
                .map((answer, index) => {
                  // Find original index for question numbering
                  const originalIndex = selectedResult.userAnswers.findIndex(a => a === answer);

                  return (
                    <Box key={originalIndex} sx={{ mb: 3 }}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1,
                        flexWrap: 'wrap'
                      }}>
                        <Typography variant="subtitle1" sx={{
                          color: colors.textPrimary,
                          fontWeight: '500'
                        }}>
                          Question {originalIndex + 1}:
                        </Typography>
                        <Chip
                          label={answer.type === 'essay' ? ((answer.isScored || answer.score > 0) ? 'Scored' : 'Unscored') : 'Scored'}
                          color={answer.type === 'essay' ? ((answer.isScored || answer.score > 0) ? 'success' : 'warning') : 'success'}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      <Typography sx={{ color: colors.textSecondary, direction: 'rtl', textAlign: 'right' }}>
                        {answer.question}
                      </Typography>
                      <Box>
                        {answer.type === 'essay' ? (
                          <>
                            <Box sx={{ my: 2, backgroundColor: '#2f2f2f', p: 2, borderRadius: '8px' }}>
                              <Typography variant="body2" sx={{
                                color: colors.textPrimary,
                                mb: 1,
                                display: 'flex'
                              }}>
                                <strong style={{ color: colors.textSecondary, width: '200px' }}>Essay Answer:</strong>
                                <span style={{ direction: 'rtl', textAlign: 'right', width: '100%' }}>
                                  {answer.essayAnswer || "No answer provided"}
                                </span>
                              </Typography>
                            </Box>
                            <Box sx={{ my: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                              <TextField
                                label="Score (0-2)"
                                value={essayScores[originalIndex] !== undefined ? essayScores[originalIndex] : answer.score?.toString() || '0'}
                                onChange={(e) => setEssayScores({
                                  ...essayScores,
                                  [originalIndex]: e.target.value
                                })}
                                inputProps={{ step: '0.01', min: '0', max: '2' }}
                                sx={{
                                  width: '100px',
                                  '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: colors.border },
                                    '&:hover fieldset': { borderColor: colors.primary },
                                    '&.Mui-focused fieldset': { borderColor: colors.primary },
                                    color: colors.textPrimary
                                  },
                                  '& .MuiInputLabel-root': { color: colors.textSecondary },
                                  '& .MuiInputLabel-root.Mui-focused': { color: colors.primary }
                                }}
                              />
                              <Button
                                variant="contained"
                                startIcon={<Save />}
                                onClick={() => handleUpdateEssayScore(selectedResult._id, originalIndex)}
                                sx={{
                                  backgroundColor: colors.primary,
                                  '&:hover': { backgroundColor: '#1d4ed8' }
                                }}
                              >
                                Save Score
                              </Button>
                              <Button
                                variant="outlined"
                                onClick={() => handleUpdateEssayScore(selectedResult._id, originalIndex, 0)}
                                sx={{
                                  color: colors.error,
                                  borderColor: colors.error,
                                  '&:hover': {
                                    backgroundColor: 'rgba(244, 67, 54, 0.08)',
                                    borderColor: colors.error
                                  }
                                }}
                              >
                                Give Zero
                              </Button>
                            </Box>
                          </>
                        ) : (
                          <>
                            <Box sx={{ my: 2, backgroundColor: '#2f2f2f', p: 2, borderRadius: '8px' }}>
                              <Typography variant="body2" sx={{
                                color: colors.textPrimary,
                                mb: 1
                              }}>
                                <strong style={{ color: colors.textSecondary }}>Options:</strong>
                              </Typography>
                              <ul style={{
                                marginTop: 0,
                                marginBottom: '8px',
                                paddingLeft: '20px',
                                direction: 'rtl',
                                textAlign: 'right',
                                listStyleType: 'disc',
                                listStylePosition: 'inside',
                              }}>
                                {answer.options.map((option, optionIndex) => (
                                  <li key={optionIndex} style={{
                                    color: colors.textPrimary,
                                    marginBottom: '4px',
                                  }}>
                                    {option}
                                  </li>
                                ))}
                              </ul>
                            </Box>

                            <Box sx={{ my: 2, backgroundColor: '#2f2f2f', p: 2, borderRadius: '8px' }}>
                              <Typography variant="body2" sx={{
                                color: colors.textPrimary,
                                mb: 1,
                                display: 'flex',
                              }}>
                                <strong style={{ color: colors.textSecondary, width: '200px' }}>Selected Answer:</strong>
                                <span style={{
                                  color: answer.selectedAnswer ?
                                    (answer.isCorrect ? colors.success : colors.error) :
                                    colors.error,
                                  width: '100%',
                                  direction: 'rtl', textAlign: 'right'
                                }}>
                                  {answer.selectedAnswer || "No answer selected"}
                                </span>
                              </Typography>
                            </Box>

                            <Box sx={{ my: 2, backgroundColor: '#2f2f2f', p: 2, borderRadius: '8px' }}>
                              <Typography variant="body2" sx={{
                                color: colors.textPrimary,
                                mb: 1,
                                display: 'flex'
                              }}>
                                <strong style={{ color: colors.textSecondary, width: '200px' }}>Correct Answer:</strong>
                                <span style={{ color: colors.success, direction: 'rtl', textAlign: 'right', width: '100%' }}>
                                  {answer.correctAnswer}
                                </span>
                              </Typography>
                            </Box>
                          </>
                        )}
                        <Typography variant="body2" sx={{
                          color: colors.textPrimary
                        }}>
                          <strong style={{ color: colors.textSecondary }}>Category:</strong> {answer.category}
                        </Typography>
                        {answer.type === 'essay' && (
                          <Typography variant="body2" sx={{
                            color: colors.textPrimary,
                            mt: 1
                          }}>
                            <strong style={{ color: colors.textSecondary }}>Score:</strong> {answer.score || 0}
                          </Typography>
                        )}
                      </Box>
                      {index < selectedResult.userAnswers.length - 1 && (
                        <Divider sx={{
                          mt: 2,
                          backgroundColor: colors.border
                        }} />
                      )}
                    </Box>
                  );
                })}
            </Paper>
          </Box>
        )
      }

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{
          "& .MuiPaper-root": {
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`,
            minWidth: '200px'
          }
        }}
      >
        <MenuItem onClick={() => {
          if (currentResult) setSelectedResult(currentResult);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <BarChart fontSize="small" style={{ color: colors.primary }} />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteResult}>
          <ListItemIcon>
            <Refresh fontSize="small" style={{ color: colors.error }} />
          </ListItemIcon>
          <ListItemText>Delete Result</ListItemText>
        </MenuItem>
      </Menu>
    </Box >
  );
};

export default PerfAssessmentDashboard;