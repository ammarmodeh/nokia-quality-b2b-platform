import { useEffect, useState } from 'react';
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
  Tooltip,
  TablePagination,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  Stack,
  Autocomplete
} from '@mui/material';
import {
  Search,
  ArrowBack,
  BarChart,
  Refresh,
} from '@mui/icons-material';
import api from '../api/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Legend);

const PerfAssessmentDashboard = () => {
  const [teamId, setTeamId] = useState('');
  const [allTeams, setAllTeams] = useState([]); // State for all evaluated teams
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentResult, setCurrentResult] = useState(null);
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:503px)');

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
  }, []);

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
      await api.delete(`/api/quiz-results/${currentResult._id}`);
      setResults(results.filter(result => result._id !== currentResult._id));
      handleMenuClose();
      // eslint-disable-next-line no-unused-vars
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

    const categoryData = selectedResult.userAnswers.reduce((acc, answer) => {
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

    const labels = Object.keys(categoryData);

    return {
      labels,
      datasets: [
        {
          label: 'Correct',
          data: labels.map(category => categoryData[category].correct),
          backgroundColor: colors.chartCorrect,
        },
        {
          label: 'Incorrect',
          data: labels.map(category => categoryData[category].incorrect),
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
            // Get the total for this category (correct + incorrect)
            const total = context.chart.data.datasets[0].data[context.dataIndex] +
              context.chart.data.datasets[1].data[context.dataIndex];
            const percentage = Math.round((value / total) * 100);
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
          precision: 0,
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
        Perf Assessment Dashboard
      </Typography>

      {/* Search Section */}
      <Paper sx={{
        p: 3,
        mb: 3,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
      }}>
        {/* Search Bar */}
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
                // Clear both the team ID and results when selection is cleared
                setTeamId('');
                setResults([]);
                setSelectedResult(null);
              }
            }}
            onInputChange={(event, newInputValue) => {
              if (!newInputValue) {
                // Clear both the team ID and results when input is cleared
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
                    caretColor: '#fff',
                  },
                  '& input:-webkit-autofill': {
                    WebkitBoxShadow: `0 0 0 1000px ${colors.surface} inset`,
                    WebkitTextFillColor: colors.textPrimary,
                    transition: 'background-color 5000s ease-in-out 0s',
                    caretColor: '#fff',
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
          </Stack>
        </Box>
      </Paper >

      {/* Error Alert */}
      {
        error && (
          <Alert severity="error" sx={{
            mb: 3,
            backgroundColor: '#2d0000',
            color: '#ff6e6e',
            border: '1px solid #ff3d3d',
            borderRadius: '8px'
          }}>
            {error}
          </Alert>
        )
      }

      {/* Loading Indicator */}
      {
        loading && (
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
        )
      }

      {/* Results Table */}
      {
        !loading && results.length > 0 && !selectedResult && (
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
                            label={result.score}
                            color={getPerformanceColor(result.percentage)}
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

      {/* Detailed Results View */}
      {
        selectedResult && (
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

            <div id="assessment-overview">
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

              {/* Charts Row - Modified for mobile view */}
              <Box sx={{
                display: 'flex',
                gap: 3,
                flexDirection: { xs: 'column', md: 'row' },
                mb: 3
              }}>
                {/* Performance Chart */}
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

                {/* Statistics Card */}
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
                                  title={`${stat.correct}/${stat.total} correct (${stat.percentage}%)`}
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
                                  title={`${stat.correct}/${stat.total} correct (${stat.percentage}%)`}
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
                            {Math.round(
                              (selectedResult.correctAnswers / selectedResult.totalQuestions) * 100
                            )}%
                            <Typography component="span" sx={{
                              color: colors.textSecondary,
                              ml: 1,
                              fontSize: isMobile ? '0.8rem' : '0.875rem'
                            }}>
                              ({selectedResult.correctAnswers}/{selectedResult.totalQuestions})
                            </Typography>
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })()}
                </Paper>
              </Box>

              {/* Category Performance - Modified for mobile */}
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
                      {/* Summary Stats */}
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

                      {/* Enhanced Chart */}
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
                                      const correct = context.chart.data.datasets[0].data[dataIndex];
                                      const incorrect = context.chart.data.datasets[1].data[dataIndex];
                                      const total = correct + incorrect;
                                      const percentage = Math.round((context.raw / total) * 100);
                                      return `Percentage: ${percentage}%`;
                                    }
                                  }
                                },
                                title: {
                                  ...horizontalChartOptions.plugins.title,
                                  text: `Performance by Category (${selectedResult.userAnswers.length} Questions)`,
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

                          {/* Threshold Indicator - Hidden on mobile */}
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
                                Threshold: 70% correct
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
                  <Box >

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
        )
      }

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
    </Box >
  );
};

export default PerfAssessmentDashboard;