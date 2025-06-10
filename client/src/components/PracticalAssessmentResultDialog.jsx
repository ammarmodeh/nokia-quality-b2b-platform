import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Card,
  CardContent,
  Button,
  useMediaQuery,
  Stack,
} from '@mui/material';
import { ArrowBack, BarChart } from '@mui/icons-material';
import api from '../api/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Legend);

const PracticalAssessmentResultDialog = ({ assessmentId, teamName, onClose }) => {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMobile = useMediaQuery('(max-width:503px)');

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
    chartCorrect: '#1976d2', // Changed from green to blue
    chartIncorrect: '#f44336',
  };

  useEffect(() => {
    const fetchAssessment = async () => {
      if (!assessmentId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await api.get(`/on-the-job-assessments/${assessmentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        if (!response.data) {
          throw new Error('Invalid response format');
        }
        setAssessment(response.data);
      } catch (err) {
        const errorMessage = err.response?.data?.message ||
          err.message ||
          'Failed to fetch assessment';
        setError(errorMessage);
        console.error('Fetch assessment error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [assessmentId]);

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'error';
  };

  const getChartData = () => {
    if (!assessment) return null;

    const labels = assessment.checkPoints.map(checkPoint => checkPoint.name); // Changed to use checkpoint names
    const scores = assessment.checkPoints.map(checkPoint => checkPoint.score);

    return {
      labels,
      datasets: [
        {
          label: 'Scores',
          data: scores,
          backgroundColor: colors.chartCorrect,
        },
      ],
    };
  };

  const getCategoryChartData = () => {
    if (!assessment) return null;

    // Calculate averages from checkPoints
    const categoryAverages = calculateCategoryAverages(assessment.checkPoints);

    const labels = Object.keys(categoryAverages);
    const scores = Object.values(categoryAverages);

    return {
      labels,
      datasets: [
        {
          label: 'Scores',
          data: scores,
          backgroundColor: colors.chartCorrect,
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
        text: 'CheckPoint Scores',
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
          stepSize: 10,
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
        text: 'Category Scores',
        color: colors.textPrimary
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || '';
            const value = context.raw;
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        ticks: {
          color: colors.textPrimary,
          stepSize: 10,
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

  const analyzeCategoryPerformance = (checkPoints) => {
    const categoryStats = checkPoints.reduce((acc, checkPoint) => {
      if (!acc[checkPoint.category]) {
        acc[checkPoint.category] = { total: 0, score: 0, checkPoints: [] };
      }
      acc[checkPoint.category].total += 1;
      acc[checkPoint.category].score += checkPoint.score;
      acc[checkPoint.category].checkPoints.push({ name: checkPoint.name, score: checkPoint.score }); // Add checkpoint names and scores
      return acc;
    }, {});

    const strengths = [];
    const improvements = [];

    Object.entries(categoryStats).forEach(([category, stats]) => {
      const averageScore = stats.score / stats.total;
      if (averageScore >= 70) {
        strengths.push({
          category,
          averageScore: Math.round(averageScore),
          score: stats.score,
          total: stats.total,
          checkPoints: stats.checkPoints // Include checkpoint names and scores
        });
      } else {
        improvements.push({
          category,
          averageScore: Math.round(averageScore),
          score: stats.score,
          total: stats.total,
          checkPoints: stats.checkPoints // Include checkpoint names and scores
        });
      }
    });

    strengths.sort((a, b) => b.averageScore - a.averageScore);
    improvements.sort((a, b) => a.averageScore - b.averageScore);

    return { strengths, improvements };
  };

  const calculateCategoryAverages = (checkPoints) => {
    const categoryStats = checkPoints.reduce((acc, checkPoint) => {
      if (!acc[checkPoint.category]) {
        acc[checkPoint.category] = { totalScore: 0, count: 0 };
      }
      acc[checkPoint.category].totalScore += checkPoint.score;
      acc[checkPoint.category].count += 1;
      return acc;
    }, {});

    const categoryAverages = {};
    Object.keys(categoryStats).forEach(category => {
      categoryAverages[category] = Math.round(categoryStats[category].totalScore / categoryStats[category].count);
    });

    return categoryAverages;
  };

  return (
    <Box sx={{
      backgroundColor: colors.background,
      minHeight: '100vh',
      color: colors.textPrimary,
      p: 3,
      overflow: 'auto'
    }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBack />}
        aria-label="Back to teams"
        onClick={onClose}
        sx={{
          mb: 2,
          color: colors.primary,
          '&:hover': {
            backgroundColor: colors.primaryHover
          }
        }}
      >
        Back to Teams
      </Button>

      {/* Header */}
      <Typography variant="h4" gutterBottom sx={{
        color: colors.primary,
        fontWeight: 'bold',
        mb: 4,
        textAlign: 'center'
      }}>
        {teamName} - Practical Assessment Dashboard
      </Typography>

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

      {/* Assessment Details */}
      {assessment && (
        <>
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
                Assessment Summary 00000
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
                  <Typography sx={{ color: "white" }}>{assessment.fieldTeamName}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Date Taken</Typography>
                  <Typography sx={{ color: "white" }}>
                    {new Date(assessment.assessmentDate).toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Overall Score</Typography>
                  <Chip
                    label={`${assessment.overallScore}%`}
                    color={getPerformanceColor(assessment.overallScore)}
                    variant="outlined"
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Conducted By</Typography>
                  <Typography sx={{ color: "white" }}>{assessment.conductedBy}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Feedback</Typography>
                  <Typography sx={{ color: "white", direction: 'rtl', textAlign: 'right' }}>{assessment.feedback}</Typography>
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
            {/* CheckPoint Scores Chart */}
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
                {isMobile ? 'CheckPoints' : 'CheckPoint Scores Overview'}
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
                          text: 'CheckPoint Scores'
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

            {/* Category Scores Chart */}
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
                {isMobile ? 'Categories' : 'Category Scores Overview'}
              </Typography>
              {getCategoryChartData() && (
                <Box sx={{
                  height: isMobile ? '250px' : '300px',
                  position: 'relative',
                  width: '100%',
                  minWidth: isMobile ? '100%' : undefined
                }}>
                  <Bar
                    data={getCategoryChartData()}
                    options={{
                      ...horizontalChartOptions,
                      plugins: {
                        ...horizontalChartOptions.plugins,
                        title: {
                          ...horizontalChartOptions.plugins.title,
                          display: !isMobile,
                          text: 'Category Scores'
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
                          ticks: {
                            ...horizontalChartOptions.scales.x.ticks,
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
          </Box>

          {/* Category Performance Analysis */}
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

            {assessment && (() => {
              const { strengths, improvements } = analyzeCategoryPerformance(assessment.checkPoints);

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

                  {/* Detailed Strengths and Weaknesses */}
                  <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 3,
                    mb: 2
                  }}>
                    {/* Strengths */}
                    {strengths.length > 0 && (
                      <Box sx={{
                        flex: 1,
                        backgroundColor: '#1a2e22',
                        p: 2,
                        borderRadius: '8px'
                      }}>
                        <Typography variant="subtitle1" sx={{ color: colors.success, mb: 1 }}>
                          Strongest Areas
                        </Typography>
                        <Box component="ul" sx={{ pl: 2 }}>
                          {strengths.map((strength, index) => (
                            <Box component="li" key={index} sx={{ mb: 1 }}>
                              <Typography variant="body2" component="span" sx={{ color: colors.textPrimary }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <strong>{strength.category}</strong>: {strength.averageScore}% average score
                                  <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block' }}>
                                    ({strength.total} checkpoints)
                                  </Typography>
                                </Stack>
                                {strength.checkPoints.map((checkPoint, idx) => (
                                  <Typography key={idx} variant="caption" sx={{ color: colors.textSecondary, display: 'block', mt: 1 }}>
                                    {checkPoint.name}: {checkPoint.score}%
                                  </Typography>
                                ))}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Weaknesses */}
                    {improvements.length > 0 && (
                      <Box sx={{
                        flex: 1,
                        backgroundColor: '#2e1a1a',
                        p: 2,
                        borderRadius: '8px'
                      }}>
                        <Typography variant="subtitle1" sx={{ color: colors.error, mb: 1 }}>
                          Weakest Areas
                        </Typography>
                        <Box component="ul" sx={{ pl: 2 }}>
                          {improvements.map((improvement, index) => (
                            <Box component="li" key={index} sx={{ mb: 1 }}>
                              <Typography variant="body2" sx={{ color: colors.textPrimary }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <strong>{improvement.category}</strong>: {improvement.averageScore}% average score
                                  <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block' }}>
                                    ({improvement.total} checkpoints)
                                  </Typography>
                                </Stack>
                                {improvement.checkPoints.map((checkPoint, idx) => (
                                  <Typography key={idx} variant="caption" sx={{ color: colors.textSecondary, display: 'block', mt: 1 }}>
                                    {checkPoint.name}: {checkPoint.score}%
                                  </Typography>
                                ))}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </>
              );
            })()}
          </Paper>

          {/* Detailed CheckPoint Analysis */}
          <Paper sx={{
            p: 3,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',

          }}>
            <Typography variant="h6" gutterBottom sx={{
              color: colors.primary,
              mb: 2
            }}>
              Detailed CheckPoint Analysis
            </Typography>
            {assessment.checkPoints.map((checkPoint, index) => (
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
                    CheckPoint {index + 1}: {checkPoint.name}
                  </Typography>
                  <Chip
                    label={`Score: ${checkPoint.score}`}
                    color={getPerformanceColor(checkPoint.score)}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Typography sx={{ color: colors.textSecondary }}>
                  {checkPoint.description}
                </Typography>
                <Box>
                  <Box sx={{ my: 2, backgroundColor: '#2f2f2f', p: 2, borderRadius: '8px' }}>
                    <Typography variant="body2" sx={{
                      color: colors.textPrimary,
                      mb: 1
                    }}>
                      <strong style={{ color: colors.textSecondary }}>Category:</strong> {checkPoint.category}
                    </Typography>
                  </Box>

                  <Box sx={{ my: 2, backgroundColor: '#2f2f2f', p: 2, borderRadius: '8px' }}>
                    <Typography variant="body2" sx={{
                      color: colors.textPrimary,
                      mb: 1,
                      display: 'flex',
                    }}>
                      <strong style={{ color: colors.textSecondary, width: '200px' }}>Notes:</strong>
                      <span style={{ color: colors.textPrimary, width: '100%', direction: 'rtl', textAlign: 'right' }}>
                        {checkPoint.notes || "No notes"}
                      </span>
                    </Typography>
                  </Box>
                </Box>
                {index < assessment.checkPoints.length - 1 && (
                  <Divider sx={{
                    mt: 2,
                    backgroundColor: colors.border
                  }} />
                )}
              </Box>
            ))}
          </Paper>
        </>
      )}
    </Box>
  );
};

export default PracticalAssessmentResultDialog;