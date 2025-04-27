import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  IconButton,
  Tooltip,
  TablePagination,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme
} from '@mui/material';
import {
  Search,
  ArrowBack,
  BarChart,
  Refresh,
  MoreVert
} from '@mui/icons-material';
import api from '../api/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

const AssessmentResults = () => {
  const theme = useTheme();
  const [teamId, setTeamId] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  console.log({ selectedResult });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentResult, setCurrentResult] = useState(null);
  const navigate = useNavigate();

  // Dark mode colors
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
    chartCorrect: '#4caf50',
    chartIncorrect: '#f44336',
  };

  const fetchResults = async () => {
    if (!teamId.trim()) {
      setError('Please enter a Team ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/quiz-results?teamId=${teamId}`);
      setResults(response.data.data);
      if (response.data.data.length === 0) {
        setError('No results found for this Team ID');
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

  const handleMenuOpen = (event, result) => {
    setAnchorEl(event.currentTarget);
    setCurrentResult(result);
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

  const getPerformanceColor = (percentage) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  const getChartData = () => {
    if (!selectedResult) return null;

    const labels = selectedResult.userAnswers.map((_, index) => `Q${index + 1}`);
    const correctData = selectedResult.userAnswers.map(answer => answer.isCorrect ? 1 : 0);
    const incorrectData = selectedResult.userAnswers.map(answer => answer.isCorrect ? 0 : 1);

    return {
      labels,
      datasets: [
        {
          label: 'Correct',
          data: correctData,
          backgroundColor: colors.chartCorrect,
        },
        {
          label: 'Incorrect',
          data: incorrectData,
          backgroundColor: colors.chartIncorrect,
        },
      ],
    };
  };

  const getCategoryChartData = () => {
    if (!selectedResult) return null;

    const categoryCounts = selectedResult.userAnswers.reduce((acc, answer) => {
      if (!acc[answer.category]) {
        acc[answer.category] = { correct: 0, incorrect: 0 };
      }
      if (answer.isCorrect) {
        acc[answer.category].correct += 1;
      } else {
        acc[answer.category].incorrect += 1;
      }
      return acc;
    }, {});

    const labels = Object.keys(categoryCounts);
    const correctData = labels.map(category => categoryCounts[category].correct);
    const incorrectData = labels.map(category => categoryCounts[category].incorrect);

    return {
      labels,
      datasets: [
        {
          label: 'Correct',
          data: correctData,
          backgroundColor: colors.chartCorrect,
        },
        {
          label: 'Incorrect',
          data: incorrectData,
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
          stepSize: 1,
          precision: 0,
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
        acc[answer.category] = { total: 0, correct: 0 };
      }
      acc[answer.category].total += 1;
      if (answer.isCorrect) {
        acc[answer.category].correct += 1;
      }
      return acc;
    }, {});

    const strengths = [];
    const improvements = [];

    Object.entries(categoryStats).forEach(([category, stats]) => {
      const percentage = (stats.correct / stats.total) * 100;
      if (percentage >= 70) { // 70% threshold for strength
        strengths.push({
          category,
          percentage: Math.round(percentage),
          correct: stats.correct,
          total: stats.total
        });
      } else {
        improvements.push({
          category,
          percentage: Math.round(percentage),
          correct: stats.correct,
          total: stats.total
        });
      }
    });

    // Sort by percentage (highest first for strengths, lowest first for improvements)
    strengths.sort((a, b) => b.percentage - a.percentage);
    improvements.sort((a, b) => a.percentage - b.percentage);

    return { strengths, improvements };
  };

  return (
    <Box sx={{
      p: 3,
      backgroundColor: colors.background,
      minHeight: '100vh',
      color: colors.textPrimary
    }}>
      {/* Back Button */}
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

      {/* Header */}
      <Typography variant="h4" gutterBottom sx={{
        color: colors.primary,
        fontWeight: 'bold',
        mb: 4
      }}>
        Assessment Results
      </Typography>

      {/* Search Section */}
      <Paper sx={{
        p: 3,
        mb: 3,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            label="Team ID"
            variant="outlined"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            onKeyPress={handleKeyPress}
            fullWidth
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
              },
              '& .MuiInputLabel-root': {
                color: colors.textSecondary,
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: colors.primary,
              },
              '& input': {
                caretColor: '#fff', // 👈 white cursor
              },
              '& input:-webkit-autofill': {
                WebkitBoxShadow: `0 0 0 1000px transparent inset`,
                WebkitTextFillColor: colors.textPrimary,
                transition: 'background-color 5000s ease-in-out 0s',
                caretColor: '#fff', // 👈 also white cursor when autofilled
              },
            }}

          />
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
              minWidth: '120px'
            }}
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
          <Tooltip title="Refresh">
            <IconButton
              onClick={fetchResults}
              sx={{
                color: colors.primary,
                '&:hover': {
                  backgroundColor: colors.primaryHover
                }
              }}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Error Alert */}
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

      {/* Loading Indicator */}
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

      {/* Results Table */}
      {!loading && results.length > 0 && !selectedResult && (
        <>
          <TableContainer component={Paper} sx={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
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
                  <TableCell>Quiz Code</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Percentage</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((result) => (
                    <TableRow key={result._id} hover>
                      <TableCell>
                        {new Date(result.submittedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{result.teamName}</TableCell>
                      <TableCell>{result.quizCode}</TableCell>
                      <TableCell>
                        <Chip
                          label={result.score}
                          color={getPerformanceColor(result.percentage)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{result.percentage}%</TableCell>
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
                          <Tooltip title="More options">
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, result)}
                              sx={{
                                color: colors.textSecondary,
                                '&:hover': {
                                  backgroundColor: colors.primaryHover,
                                  color: colors.primary
                                }
                              }}
                            >
                              <MoreVert />
                            </IconButton>
                          </Tooltip>
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
      )}

      {/* Detailed Results View */}
      {selectedResult && (
        <Box sx={{ mt: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => setSelectedResult(null)}
            sx={{
              mb: 2,
              color: colors.primary,
              '&:hover': {
                backgroundColor: colors.primaryHover
              }
            }}
          >
            Back to Results List
          </Button>

          {/* Summary Card */}
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
                {/* <Box>
                  <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Quiz Code</Typography>
                  <Typography sx={{ color: "white" }}>{selectedResult.quizCode}</Typography>
                </Box> */}
                <Box>
                  <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Date Taken</Typography>
                  <Typography sx={{ color: "white" }}>
                    {new Date(selectedResult.submittedAt).toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Score</Typography>
                  <Chip
                    label={selectedResult.score}
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
                  <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Correct Answers</Typography>
                  <Typography sx={{ color: "white" }}>
                    {selectedResult.correctAnswers}/{selectedResult.totalQuestions}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Charts Row */}
          <Box sx={{
            display: 'flex',
            gap: 3,
            flexDirection: { xs: 'column', md: 'row' },
            mb: 3
          }}>
            {/* Performance Chart */}
            <Paper sx={{
              p: 3,
              flex: 1,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px'
            }}>
              <Typography variant="h6" gutterBottom sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: colors.primary,
                mb: 2
              }}>
                <BarChart /> Performance Overview
              </Typography>
              {getChartData() && (
                <Box sx={{ height: '300px' }}>
                  <Bar data={getChartData()} options={chartOptions} />
                </Box>
              )}
            </Paper>

            {/* Statistics Card */}
            <Paper sx={{
              p: 3,
              flex: 1,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px'
            }}>
              <Typography variant="h6" gutterBottom sx={{
                color: colors.primary,
                mb: 2
              }}>
                Key Statistics
              </Typography>

              {selectedResult && (() => {
                const { strengths, improvements } = analyzeCategoryPerformance(selectedResult.userAnswers);

                return (
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3
                  }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{
                        color: colors.textSecondary,
                        mb: 1
                      }}>
                        Strongest Areas ({strengths.length})
                      </Typography>
                      {strengths.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {strengths.map((stat, index) => (
                            <Tooltip
                              key={index}
                              title={`${stat.correct}/${stat.total} correct (${stat.percentage}%)`}
                              arrow
                            >
                              <Chip
                                label={stat.category}
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
                        <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                          No categories with strong performance
                        </Typography>
                      )}
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" sx={{
                        color: colors.textSecondary,
                        mb: 1
                      }}>
                        Areas Needing Improvement ({improvements.length})
                      </Typography>
                      {improvements.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {improvements.map((stat, index) => (
                            <Tooltip
                              key={index}
                              title={`${stat.correct}/${stat.total} correct (${stat.percentage}%)`}
                              arrow
                            >
                              <Chip
                                label={stat.category}
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
                        <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                          All categories meet performance standards
                        </Typography>
                      )}
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" sx={{
                        color: colors.textSecondary,
                        mb: 0.5
                      }}>
                        Overall Accuracy
                      </Typography>
                      <Typography sx={{ color: "white" }}>
                        {Math.round(
                          (selectedResult.correctAnswers / selectedResult.totalQuestions) * 100
                        )}%
                        <Typography component="span" sx={{
                          color: colors.textSecondary,
                          ml: 1
                        }}>
                          ({selectedResult.correctAnswers}/{selectedResult.totalQuestions} correct)
                        </Typography>
                      </Typography>
                    </Box>
                  </Box>
                );
              })()}
            </Paper>
          </Box>

          {/* Category Performance */}
          <Paper sx={{
            p: 3,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            mb: 3
          }}>
            <Typography variant="h6" gutterBottom sx={{
              color: colors.primary,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <BarChart fontSize="small" /> Category Performance Analysis
            </Typography>

            {selectedResult && (() => {
              const { strengths, improvements } = analyzeCategoryPerformance(selectedResult.userAnswers);
              const chartData = getCategoryChartData();

              return (
                <>
                  {/* Summary Stats */}
                  <Box sx={{
                    display: 'flex',
                    gap: 3,
                    mb: 3,
                    flexWrap: 'wrap'
                  }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>
                        Strong Categories
                      </Typography>
                      <Typography variant="h6" sx={{ color: colors.success }}>
                        {strengths.length}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>
                        Weak Categories
                      </Typography>
                      <Typography variant="h6" sx={{ color: colors.error }}>
                        {improvements.length}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>
                        Total Categories
                      </Typography>
                      <Typography variant="h6" sx={{ color: colors.textPrimary }}>
                        {strengths.length + improvements.length}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Enhanced Chart */}
                  {chartData && (
                    <Box sx={{ height: '300px', position: 'relative' }}>
                      <Bar
                        data={chartData}
                        options={{
                          ...chartOptions,
                          plugins: {
                            ...chartOptions.plugins,
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  const label = context.dataset.label || '';
                                  const total = context.raw + context.dataset.data[context.dataIndex];
                                  const percentage = Math.round((context.raw / total) * 100);
                                  return `${label}: ${context.raw} (${percentage}%)`;
                                }
                              }
                            },
                            title: {
                              ...chartOptions.plugins.title,
                              text: `Performance by Category (${selectedResult.userAnswers.length} Questions)`
                            }
                          },
                          scales: {
                            ...chartOptions.scales,
                            y: {
                              ...chartOptions.scales.y,
                              max: Math.max(
                                ...chartData.datasets.flatMap(d => d.data)
                              ) + 1 // Add buffer space
                            }
                          }
                        }}
                      />

                      {/* Threshold Indicator */}
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
                          color: colors.textSecondary
                        }}>
                          <Box sx={{
                            width: 10,
                            height: 10,
                            backgroundColor: colors.primary,
                            mr: 1
                          }} />
                          Threshold: 70% correct
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </>
              );
            })()}
          </Paper>

          {/* Detailed Question Analysis */}
          <Paper sx={{
            p: 3,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px'
          }}>
            <Typography variant="h6" gutterBottom sx={{
              color: colors.primary,
              mb: 2
            }}>
              Detailed Question Analysis
            </Typography>
            {selectedResult.userAnswers.map((answer, index) => (
              <Box key={index} sx={{ mb: 3 }}>
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
                    Question {index + 1}:
                  </Typography>
                  <Chip
                    label={answer.isCorrect ? 'Correct' : 'Incorrect'}
                    color={answer.isCorrect ? 'success' : 'error'}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Typography sx={{ color: colors.textSecondary, direction: 'rtl', textAlign: 'right' }}>
                  {answer.question}
                </Typography>
                <Box sx={{ pl: 2 }}>

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
                      listStyleType: 'disc', // this is the key part!
                      listStylePosition: 'inside', // bullets align nicely inside the text
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
                        {answer.selectedAnswer || " No answer selected"}
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

                  <Typography variant="body2" sx={{
                    color: colors.textPrimary
                  }}>
                    <strong style={{ color: colors.textSecondary }}>Category:</strong> {answer.category}
                  </Typography>
                </Box>
                {index < selectedResult.userAnswers.length - 1 && (
                  <Divider sx={{
                    mt: 2,
                    backgroundColor: colors.border
                  }} />
                )}
              </Box>
            ))}
          </Paper>
        </Box>
      )}

      {/* Context Menu */}
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
    </Box>
  );
};

export default AssessmentResults;