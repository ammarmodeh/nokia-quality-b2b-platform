import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Divider, Rating, Grid, List, ListItem, ListItemText, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

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

const getBarColor = (score) => {
  return score < 60 ? colors.error : score < 80 ? colors.warning : colors.success;
};


const TeamDetailView = ({ teamData }) => {

  if (!teamData || !teamData.length) return (
    <Typography sx={{ color: colors.textPrimary }}>Select a team to view details</Typography>
  );

  return (
    <Box sx={{ py: 3, backgroundColor: colors.background, color: colors.textPrimary }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Team Assessments ({teamData.length})
      </Typography>

      {teamData.map((team, assessmentIndex) => (
        <Accordion key={assessmentIndex} defaultExpanded={assessmentIndex === 0} sx={{
          mb: 3,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          '&:before': { display: 'none' }
        }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: colors.textPrimary }} />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ color: colors.textPrimary, mr: 2 }}>
                Assessment #{assessmentIndex + 1} - {new Date(team.assessmentDate).toLocaleDateString()}
              </Typography>
              <Box sx={{
                px: 1,
                borderRadius: 1,
                backgroundColor: getBarColor(team.overallScore),
                color: colors.textPrimary
              }}>
                Score: {team.overallScore}/100
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, backgroundColor: colors.surfaceElevated, border: `1px solid ${colors.border}`, height: '100%' }}>
                  <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary }}>Team Overview</Typography>
                  <Typography sx={{ color: colors.textSecondary }}><strong>Conducted by:</strong> {team.conductedBy}</Typography>
                  <Typography sx={{ color: colors.textSecondary }}><strong>Assessment Date:</strong> {new Date(team.assessmentDate).toLocaleDateString()}</Typography>
                  <Typography sx={{ color: colors.textSecondary }}>
                    <strong>Status:</strong>
                    <Chip
                      label={team.status}
                      color={team.status === 'Completed' ? 'success' : 'warning'}
                      sx={{ ml: 1, color: colors.textPrimary, backgroundColor: team.status === 'Completed' ? colors.success : colors.warning }}
                    />
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h5" sx={{ color: getBarColor(team.overallScore), mr: 2 }}>
                      Overall Score: <strong>{team.overallScore}</strong>/100
                    </Typography>
                    <Rating
                      value={team.overallScore / 20}
                      precision={0.5}
                      readOnly
                      sx={{
                        '& .MuiRating-iconFilled': {
                          color: getBarColor(team.overallScore)
                        },
                        '& .MuiRating-iconEmpty': {
                          color: colors.border
                        }
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper sx={{ p: 2, backgroundColor: colors.surfaceElevated, border: `1px solid ${colors.border}` }}>
                  <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary }}>Checkpoint Performance</Typography>
                  <Box sx={{ height: '400px' }}>
                    <Bar
                      data={{
                        labels: team.checkPoints.map(cp => cp.name),
                        datasets: [{
                          label: 'Checkpoint Scores',
                          data: team.checkPoints.map(cp => cp.score),
                          backgroundColor: team.checkPoints.map(cp => getBarColor(cp.score)),
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { color: colors.textSecondary },
                            grid: { color: colors.border },
                            title: {
                              display: true,
                              text: 'Score (%)',
                              color: colors.textSecondary
                            }
                          },
                          x: {
                            ticks: {
                              color: colors.textSecondary,
                              callback: function (value) {
                                const label = this.getLabelForValue(value);
                                return label.length > 15 ? label.substring(0, 15) + '...' : label;
                              }
                            },
                            grid: { color: colors.border }
                          }
                        },
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                return `${context.label}: ${context.raw}%`;
                              },
                              afterLabel: (context) => {
                                const checkpoint = team.checkPoints.find(cp => cp.name === context.label);
                                return checkpoint.description;
                              }
                            }
                          }
                        }
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper sx={{ p: 2, backgroundColor: colors.surfaceElevated, border: `1px solid ${colors.border}` }}>
                  <Typography variant="h6" gutterBottom sx={{ color: colors.textPrimary }}>Feedback & Notes</Typography>
                  <Typography paragraph sx={{ color: colors.textSecondary }}>{team.feedback}</Typography>
                  <Divider sx={{ my: 2, backgroundColor: colors.border }} />

                  {/* Performance Statistics Cards */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    {/* Weakest Checkpoints (Below 60%) */}
                    {team.checkPoints.filter(cp => cp.score < 60).length > 0 && (
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
                                  <TableCell sx={{ color: colors.textPrimary }}>Category</TableCell>
                                  <TableCell sx={{ color: colors.textPrimary }} align="right">Score</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {team.checkPoints
                                  .filter(cp => cp.score < 60)
                                  .sort((a, b) => a.score - b.score)
                                  .map((cp, index) => (
                                    <TableRow key={index}>
                                      <TableCell sx={{ color: colors.textPrimary }}>{cp.name}</TableCell>
                                      <TableCell sx={{ color: colors.textSecondary }}>{cp.category}</TableCell>
                                      <TableCell align="right">
                                        <Box sx={{
                                          display: 'inline-block',
                                          px: 1,
                                          borderRadius: 1,
                                          backgroundColor: colors.error,
                                          color: colors.textPrimary
                                        }}>
                                          {cp.score}%
                                        </Box>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Paper>
                      </Grid>
                    )}

                    {/* Needs Improvement Checkpoints (60-79%) */}
                    {team.checkPoints.filter(cp => cp.score >= 60 && cp.score < 80).length > 0 && (
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
                                  <TableCell sx={{ color: colors.textPrimary }}>Category</TableCell>
                                  <TableCell sx={{ color: colors.textPrimary }} align="right">Score</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {team.checkPoints
                                  .filter(cp => cp.score >= 60 && cp.score < 80)
                                  .sort((a, b) => a.score - b.score)
                                  .map((cp, index) => (
                                    <TableRow key={index}>
                                      <TableCell sx={{ color: colors.textPrimary }}>{cp.name}</TableCell>
                                      <TableCell sx={{ color: colors.textSecondary }}>{cp.category}</TableCell>
                                      <TableCell align="right">
                                        <Box sx={{
                                          display: 'inline-block',
                                          px: 1,
                                          borderRadius: 1,
                                          backgroundColor: colors.warning,
                                          color: colors.textPrimary
                                        }}>
                                          {cp.score}%
                                        </Box>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Paper>
                      </Grid>
                    )}

                    {/* Category Performance Summary - Enhanced */}
                    <Grid item xs={12}>
                      <Paper sx={{
                        p: 2,
                        backgroundColor: colors.surfaceElevated,
                        border: `1px solid ${colors.border}`
                      }}>
                        <Typography variant="subtitle1" sx={{
                          color: colors.textPrimary,
                          mb: 2,
                          fontWeight: 'bold'
                        }}>
                          Category Performance Breakdown
                        </Typography>
                        <Grid container spacing={2}>
                          {Array.from(new Set(team.checkPoints.map(cp => cp.category))).map(category => {
                            const categoryPoints = team.checkPoints.filter(cp => cp.category === category);
                            const avgScore = categoryPoints.reduce((sum, cp) => sum + cp.score, 0) / categoryPoints.length;
                            const weakCount = categoryPoints.filter(cp => cp.score < 60).length;
                            const needsImprovementCount = categoryPoints.filter(cp => cp.score >= 60 && cp.score < 80).length;
                            const strongCount = categoryPoints.length - weakCount - needsImprovementCount;

                            return (
                              <Grid item xs={12} sm={6} md={4} key={category}>
                                <Paper sx={{
                                  p: 2,
                                  backgroundColor: colors.surface,
                                  border: `1px solid ${getBarColor(avgScore)}`,
                                  boxShadow: `0 0 8px ${getBarColor(avgScore)}33`,
                                  height: '100%'
                                }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography sx={{
                                      color: colors.textPrimary,
                                      fontWeight: 'medium',
                                      fontSize: '1rem'
                                    }}>
                                      {category}
                                    </Typography>
                                    <Box sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1
                                    }}>
                                      <Typography sx={{
                                        color: getBarColor(avgScore),
                                        fontWeight: 'bold',
                                        fontSize: '1.1rem'
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
                                            color: getBarColor(avgScore)
                                          },
                                          '& .MuiRating-iconEmpty': {
                                            color: colors.border
                                          }
                                        }}
                                      />
                                    </Box>
                                  </Box>

                                  {/* Progress bar showing score distribution */}
                                  <Box sx={{
                                    height: 8,
                                    backgroundColor: colors.border,
                                    borderRadius: 4,
                                    overflow: 'hidden',
                                    mb: 1.5
                                  }}>
                                    <Box sx={{
                                      height: '100%',
                                      width: `${(strongCount / categoryPoints.length) * 100}%`,
                                      backgroundColor: colors.success,
                                      display: 'inline-block'
                                    }} />
                                    <Box sx={{
                                      height: '100%',
                                      width: `${(needsImprovementCount / categoryPoints.length) * 100}%`,
                                      backgroundColor: colors.warning,
                                      display: 'inline-block'
                                    }} />
                                    <Box sx={{
                                      height: '100%',
                                      width: `${(weakCount / categoryPoints.length) * 100}%`,
                                      backgroundColor: colors.error,
                                      display: 'inline-block'
                                    }} />
                                  </Box>

                                  {/* Detailed counts */}
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Box sx={{ textAlign: 'center' }}>
                                      <Typography variant="caption" sx={{
                                        color: colors.success,
                                        display: 'block',
                                        fontWeight: 'medium'
                                      }}>
                                        {strongCount}
                                      </Typography>
                                      <Typography variant="caption" sx={{
                                        color: colors.textSecondary,
                                        fontSize: '0.7rem'
                                      }}>
                                        Strong
                                      </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'center' }}>
                                      <Typography variant="caption" sx={{
                                        color: colors.warning,
                                        display: 'block',
                                        fontWeight: 'medium'
                                      }}>
                                        {needsImprovementCount}
                                      </Typography>
                                      <Typography variant="caption" sx={{
                                        color: colors.textSecondary,
                                        fontSize: '0.7rem'
                                      }}>
                                        Needs Imp.
                                      </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'center' }}>
                                      <Typography variant="caption" sx={{
                                        color: colors.error,
                                        display: 'block',
                                        fontWeight: 'medium'
                                      }}>
                                        {weakCount}
                                      </Typography>
                                      <Typography variant="caption" sx={{
                                        color: colors.textSecondary,
                                        fontSize: '0.7rem'
                                      }}>
                                        Weak
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Paper>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Detailed Notes Section */}
                  <Typography variant="subtitle1" sx={{ color: colors.textPrimary, mb: 1 }}>Detailed Notes:</Typography>
                  {team.checkPoints.filter(cp => cp.notes && cp.score < 80).length > 0 ? (
                    <List dense sx={{
                      backgroundColor: colors.surface,
                      borderRadius: 1,
                      p: 1
                    }}>
                      {team.checkPoints
                        .filter(cp => cp.notes && cp.score < 80)
                        .sort((a, b) => a.score - b.score)
                        .map((cp, index) => (
                          <ListItem key={index} sx={{
                            alignItems: 'flex-start',
                            borderBottom: `1px solid ${colors.border}`,
                            '&:last-child': { borderBottom: 'none' }
                          }}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Typography sx={{
                                    color: getBarColor(cp.score),
                                    fontWeight: 'bold',
                                    minWidth: '60px'
                                  }}>
                                    {cp.score}%
                                  </Typography>
                                  <Typography sx={{ color: colors.textPrimary }}>
                                    {cp.name}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Typography sx={{
                                  color: colors.textSecondary,
                                  fontSize: '0.875rem',
                                  mt: 0.5
                                }}>
                                  {cp.notes}
                                </Typography>
                              }
                              sx={{ my: 0 }}
                            />
                          </ListItem>
                        ))}
                    </List>
                  ) : (
                    <Typography variant="body2" sx={{
                      color: colors.textSecondary,
                      fontStyle: 'italic'
                    }}>
                      No additional notes provided for checkpoints below 80%.
                    </Typography>
                  )}
                </Paper>
              </Grid>

            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default TeamDetailView;