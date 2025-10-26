import {
  Box,
  Typography,
  Button,
  Paper,
  Card,
  CardContent,
  Chip,
  Divider,
  TextField,
} from "@mui/material";
import { ArrowBack, BarChart, TrendingUp, TrendingDown, BarChartOutlined } from '@mui/icons-material';
import { Bar } from 'react-chartjs-2';

const AssessmentDetail = ({
  assessment,
  team,
  colors,
  getPerformanceColor,
  getCategoryChartData,
  horizontalChartOptions,
  analyzeCategoryPerformance,
  getLabelForCheckpoint,
  isMobile,
  onBack,
  onEdit,
}) => {
  // Function to get the background color for each bar
  const getBarColors = (data) => {
    return data.datasets[0].data.map(score => {
      if (score < 50) {
        return colors.error; // Red for scores below 50
      } else if (score < 75) {
        return colors.warning; // Orange for scores below 75
      } else {
        return colors.primary; // Default color for other scores
      }
    });
  };

  // Custom chart options based on mobile or desktop view
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: isMobile ? 'y' : 'x',
    plugins: {
      legend: {
        display: false,
      },
      // title: {
      //   display: true,
      //   text: 'Category Performance',
      //   color: colors.textPrimary,
      //   font: {
      //     size: 16,
      //   },
      // },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += context.parsed + '%';
            }
            return label;
          }
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
    },
    scales: {
      x: {
        max: 100,
        grid: {
          display: !isMobile,
          color: colors.border,
        },
        ticks: {
          color: colors.textSecondary,
        },
      },
      y: {
        max: 100,
        grid: {
          display: !isMobile,
          color: colors.border,
        },
        ticks: {
          color: colors.textSecondary,
        },
      }
    }
  };

  // Custom chart data with background colors for the bars
  const chartData = getCategoryChartData();
  if (chartData) {
    chartData.datasets[0].backgroundColor = getBarColors(chartData);
  }

  // Compute category averages
  const categoryStats = assessment.checkPoints.reduce((acc, point) => {
    if (!acc[point.category]) {
      acc[point.category] = {
        totalScore: 0,
        count: 0,
        weight: assessment.categoryWeights[point.category] || 0.20
      };
    }
    acc[point.category].totalScore += point.score;
    acc[point.category].count += 1;
    return acc;
  }, {});

  const categoryList = Object.entries(categoryStats).map(([category, stats]) => ({
    category,
    average: Math.round(stats.totalScore / stats.count),
    weight: stats.weight
  }));

  // Checkpoint strengths and improvements
  const checkpointStrengths = assessment.checkPoints
    .filter(cp => cp.score >= 80)
    .sort((a, b) => b.score - a.score)
    .map(cp => ({
      name: cp.name,
      score: cp.score,
      label: getLabelForCheckpoint(cp.name, cp.score)
    }));

  const checkpointImprovements = assessment.checkPoints
    .filter(cp => cp.score < 80)
    .sort((a, b) => a.score - b.score)
    .map(cp => ({
      name: cp.name,
      score: cp.score,
      label: getLabelForCheckpoint(cp.name, cp.score)
    }));

  return (
    <Box sx={{ mt: 3 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={onBack}
        sx={{
          mb: 2,
          color: colors.primary,
          '&:hover': {
            backgroundColor: colors.primaryHover
          }
        }}
      >
        Back to Assessments List
      </Button>

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
              <Typography sx={{ color: "white" }}>{team.teamName}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Conducted By</Typography>
              <Typography sx={{ color: "white" }}>{assessment.conductedBy}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Date</Typography>
              <Typography sx={{ color: "white" }}>
                {new Date(assessment.assessmentDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Overall Score</Typography>
              <Chip
                label={`${assessment.overallScore}%`}
                color={getPerformanceColor(assessment.overallScore)}
                size="small"
                variant="outlined"
              />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Status</Typography>
              <Typography sx={{ color: "white" }}>{assessment.status}</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{
        display: 'flex',
        gap: 3,
        flexDirection: 'column',
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
          {chartData && (
            <Box sx={{
              height: isMobile ? '350px' : '450px',
              position: 'relative',
              width: '100%'
            }}>
              <Bar
                data={chartData}
                options={chartOptions}
              />
            </Box>
          )}
        </Paper>

        <Paper sx={{
          p: 2,
          flex: 1,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
        }}>
          <Typography variant="h6" gutterBottom sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: colors.primary,
            mb: 2,
            fontSize: isMobile ? '1.1rem' : '1.25rem'
          }}>
            <BarChartOutlined fontSize={isMobile ? 'small' : 'medium'} />
            Performance Analysis
          </Typography>

          <Box sx={{ mt: 2 }}>
            {/* Category Averages */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ color: colors.textPrimary, fontWeight: 'medium', mb: 1 }}>
                Category Averages
              </Typography>
              <Box sx={{ pl: 2 }}>
                {categoryList.map((item, index) => (
                  <Box key={index} sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1,
                    borderBottom: index < categoryList.length - 1 ? `1px solid ${colors.border}` : 'none'
                  }}>
                    <Typography variant="body2" sx={{ color: colors.textPrimary }}>
                      {item.category}
                    </Typography>
                    <Chip
                      label={`${item.average}%`}
                      color={getPerformanceColor(item.average)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Checkpoint Strengths */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{
                display: 'flex',
                alignItems: 'center',
                color: colors.success,
                fontWeight: 'medium',
                mb: 1
              }}>
                <TrendingUp fontSize="small" sx={{ mr: 1 }} />
                Checkpoint Strengths
              </Typography>

              {checkpointStrengths.length > 0 ? (
                <Box sx={{ pl: 2 }}>
                  {checkpointStrengths.map((item, index) => (
                    <Box key={index} sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1,
                      borderBottom: index < checkpointStrengths.length - 1 ? `1px solid ${colors.border}` : 'none'
                    }}>
                      <Typography variant="body2" sx={{ color: colors.textPrimary }}>
                        {item.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip label={`${item.score}%`} color="success" size="small" variant="outlined" />
                        {/* <Chip label={item.label} size="small" variant="outlined" sx={{ backgroundColor: '#4caf50', color: 'white' }} /> */}
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: colors.textSecondary, pl: 2 }}>
                  No significant strengths identified.
                </Typography>
              )}
            </Box>

            {/* Checkpoint Improvements */}
            <Box>
              <Typography variant="subtitle1" sx={{
                display: 'flex',
                alignItems: 'center',
                color: colors.warning,
                fontWeight: 'medium',
                mb: 1
              }}>
                <TrendingDown fontSize="small" sx={{ mr: 1 }} />
                Checkpoint Areas for Improvement
              </Typography>

              {checkpointImprovements.length > 0 ? (
                <Box sx={{ pl: 2 }}>
                  {checkpointImprovements.map((item, index) => (
                    <Box key={index} sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1,
                      borderBottom: index < checkpointImprovements.length - 1 ? `1px solid ${colors.border}` : 'none'
                    }}>
                      <Typography variant="body2" sx={{ color: colors.textPrimary }}>
                        {item.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip label={`${item.score}%`} color={item.score < 50 ? "error" : "warning"} size="small" variant="outlined" />
                        {/* <Chip label={item.label} size="small" variant="outlined" sx={{
                          backgroundColor: item.score < 50 ? '#f44336' : '#ff9800',
                          color: 'white'
                        }} /> */}
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: colors.textSecondary, pl: 2 }}>
                  No significant areas for improvement.
                </Typography>
              )}
            </Box>
          </Box>

        </Paper>
      </Box>

      <Paper sx={{
        p: 3,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        mb: 3
      }}>
        <Typography variant="h6" gutterBottom sx={{
          color: colors.primary,
          mb: 2
        }}>
          Check Points Details
        </Typography>

        {assessment.checkPoints.map((point, index) => (
          <Box key={index} sx={{ mb: 3 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1
            }}>
              <Typography variant="subtitle1" sx={{
                color: colors.textPrimary,
                fontWeight: '500'
              }}>
                {point.name}
              </Typography>
              <Chip
                label={`${point.score}%`}
                color={getPerformanceColor(point.score)}
                size="small"
                variant="outlined"
              />
              {/* <Chip
                label={getLabelForCheckpoint(point.name, point.score)}
                size="small"
                variant="outlined"
                sx={{
                  backgroundColor: getPerformanceColor(point.score) === 'success' ? '#4caf50' :
                    getPerformanceColor(point.score) === 'warning' ? '#ff9800' : '#f44336',
                  color: 'white',
                  '& .MuiChip-outlined': {
                    borderColor: 'transparent'
                  }
                }}
              /> */}
            </Box>

            <Typography sx={{ color: colors.textSecondary, mb: 1 }}>
              {point.description}
            </Typography>

            <Box sx={{ my: 2, backgroundColor: '#2f2f2f', p: 2, borderRadius: '8px' }}>
              <Typography variant="body2" sx={{
                color: colors.textPrimary,
                mb: 1
              }}>
                <strong style={{ color: colors.textSecondary }}>Notes:</strong> <br />
                <span style={{ display: 'flex', direction: point.notes ? 'rtl' : 'ltr', textAlign: point.notes ? 'right' : 'left' }}>{point.notes || "No notes provided"}</span>
              </Typography>
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
          Feedback
        </Typography>
        <TextField
          label="Feedback"
          fullWidth
          multiline
          rows={4}
          value={assessment.feedback}
          InputLabelProps={{
            style: { color: colors.textSecondary }
          }}
          InputProps={{
            style: {
              color: colors.textPrimary,
              direction: 'rtl',
              textAlign: 'right'
            }
          }}
        />
      </Paper>

      {/* <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="contained"
          onClick={() => onEdit(assessment)}
          sx={{
            backgroundColor: colors.primary,
            color: '#fff',
            '&:hover': {
              backgroundColor: `${colors.primary}cc`
            }
          }}
        >
          Edit Assessment
        </Button>
      </Box> */}

      <Button
        startIcon={<ArrowBack />}
        onClick={onBack}
        sx={{
          my: 2,
          color: colors.primary,
          '&:hover': {
            backgroundColor: colors.primaryHover
          }
        }}
      >
        Back to Assessments List
      </Button>
    </Box>
  );
};

export default AssessmentDetail;