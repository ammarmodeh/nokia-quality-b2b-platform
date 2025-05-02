import {
  Grid,
  Card,
  CardContent,
  Typography,
  Divider,
  Box,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  LinearProgress,
  useTheme
} from "@mui/material";
import { Person, Assessment, EmojiEvents, TrendingUp } from '@mui/icons-material';
import React from "react";

const StatsOverview = ({ stats, supervisorStats, colors, isMobile }) => {
  console.log({ stats });
  const theme = useTheme();

  if (!stats) return null;

  // Calculate total assessments across all supervisors
  const totalAssessments = Object.values(supervisorStats || {})
    .reduce((sum, supervisor) => sum + supervisor.assessmentCount, 0);

  // Sort supervisors by assessment count (descending)
  const sortedSupervisors = Object.values(supervisorStats || {})
    .sort((a, b) => b.assessmentCount - a.assessmentCount);

  // Calculate score distribution
  const scoreDistribution = {
    '0-19': 0,
    '20-39': 0,
    '40-59': 0,
    '60-79': 0,
    '80-100': 0
  };

  stats.fieldTeamStats?.forEach(team => {
    const score = team.averageScore || 0;
    if (score <= 19) {
      scoreDistribution['0-19']++;
    } else if (score <= 39) {
      scoreDistribution['20-39']++;
    } else if (score <= 59) {
      scoreDistribution['40-59']++;
    } else if (score <= 79) {
      scoreDistribution['60-79']++;
    } else {
      scoreDistribution['80-100']++;
    }
  });

  const totalTeams = stats.fieldTeamStats?.length || 1;

  return (
    <>
      <Divider sx={{ my: 4, borderColor: colors.border }} />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            title: "Total Assessments",
            value: stats.overallStats.totalAssessments || 0,
            unit: "",
            icon: <Assessment fontSize="medium" sx={{ color: colors.primary }} />,
            trend: stats.overallStats.trend || 0,
            flexContent: (
              <Box sx={{ flex: 1 }} /> // Empty flex box to maintain height
            )
          },
          {
            title: "Average Score",
            value: stats.overallStats.averageScore || 0,
            unit: "%",
            icon: <TrendingUp fontSize="medium" sx={{ color: colors.success }} />,
            trend: stats.overallStats.scoreTrend || 0,
            flexContent: (
              <Box sx={{
                mt: 1,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end'
              }}>
                <Typography component="div" variant="caption" sx={{
                  color: colors.textSecondary,
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.65rem'
                }}>
                  Team Score Distribution:
                </Typography>
                {Object.entries(scoreDistribution).map(([range, count]) => (
                  <Box key={range} sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 0.5,
                    gap: 0.5
                  }}>
                    <Typography component="span" variant="caption" sx={{
                      color: colors.textPrimary,
                      minWidth: 40,
                      fontSize: '0.6rem',
                      lineHeight: '1.2'
                    }}>
                      {range}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(count / totalTeams) * 100}
                      sx={{
                        flexGrow: 1,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: `${colors.border}30`,
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          backgroundColor:
                            range === '80-100' ? colors.success :
                              range === '60-79' ? colors.info :
                                range === '40-59' ? colors.warning :
                                  range === '20-39' ? colors.error :
                                    colors.error
                        }
                      }}
                    />
                    <Typography component="span" variant="caption" sx={{
                      color: colors.textSecondary,
                      minWidth: 24,
                      textAlign: 'right',
                      fontSize: '0.6rem',
                      lineHeight: '1.2'
                    }}>
                      {Math.round((count / totalTeams) * 100)}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            )
          },
          {
            title: "Top Performing Team",
            value: stats.fieldTeamStats[0]?.teamName || "N/A",
            subtitle: `${stats.fieldTeamStats[0]?.averageScore || 0}%`,
            icon: <EmojiEvents fontSize="medium" sx={{ color: colors.warning }} />,
            trend: stats.fieldTeamStats[0]?.trend || 0,
            flexContent: (
              <Box sx={{ flex: 1 }} /> // Empty flex box to maintain height
            )
          },
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card sx={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 4px 20px 0 ${colors.primary}20`
              }
            }}>
              <CardContent sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                pb: '16px !important'
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography component="div" variant="subtitle1" sx={{
                    color: colors.textSecondary,
                    fontSize: isMobile ? '0.875rem' : '1rem'
                  }}>
                    {stat.title}
                  </Typography>
                  {stat.icon}
                </Box>

                <Typography component="div" variant="h4" sx={{
                  color: colors.textPrimary,
                  fontWeight: 'bold',
                  fontSize: isMobile ? '1.5rem' : '2rem',
                  mb: 1
                }}>
                  {stat.value}{stat.unit || ''}
                </Typography>

                {stat.subtitle && (
                  <Typography component="div" variant="body2" sx={{
                    color: colors.textSecondary,
                    fontSize: isMobile ? '0.75rem' : '0.875rem'
                  }}>
                    {stat.subtitle}
                  </Typography>
                )}

                {stat.trend !== 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingUp sx={{
                      fontSize: '1rem',
                      color: stat.trend > 0 ? colors.success : colors.error,
                      transform: stat.trend > 0 ? 'none' : 'rotate(180deg)'
                    }} />
                    <Typography component="span" variant="body2" sx={{
                      ml: 0.5,
                      color: stat.trend > 0 ? colors.success : colors.error,
                      fontSize: '0.75rem'
                    }}>
                      {Math.abs(stat.trend)}% {stat.trend > 0 ? 'increase' : 'decrease'}
                    </Typography>
                  </Box>
                )}

                {/* Flex content that grows to fill remaining space */}
                {stat.flexContent}
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Enhanced Supervisor Stats Card */}
        <Grid item xs={12}>
          <Card sx={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            boxShadow: `0 2px 10px ${colors.primary}10`
          }}>
            <CardContent>
              <Typography component="div" variant="h6" sx={{
                color: colors.primary,
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                fontSize: isMobile ? '1rem' : '1.25rem'
              }}>
                <Person sx={{ mr: 1, fontSize: 'inherit' }} />
                Assessments Conducted by Supervisors
                <Typography component="span" sx={{
                  ml: 'auto',
                  color: colors.textSecondary,
                  fontSize: '0.875rem'
                }}>
                  Total: {totalAssessments}
                </Typography>
              </Typography>

              {sortedSupervisors.length > 0 ? (
                <List sx={{ py: 0 }}>
                  {sortedSupervisors.map((supervisor, idx) => {
                    const percentage = (supervisor.assessmentCount / totalAssessments) * 100;
                    return (
                      <React.Fragment key={idx}>
                        <ListItem sx={{ px: 0, py: 1.5 }}>
                          <ListItemAvatar>
                            <Avatar sx={{
                              bgcolor: theme.palette.mode === 'dark' ? colors.primary : `${colors.primary}20`,
                              color: theme.palette.mode === 'dark' ? '#fff' : colors.primary,
                              width: 36,
                              height: 36,
                              fontSize: '0.875rem'
                            }}>
                              {supervisor.name.split(' ').map(n => n[0]).join('')}
                            </Avatar>
                          </ListItemAvatar>

                          <ListItemText
                            primary={
                              <Typography component="div" variant="body1" sx={{ color: colors.textPrimary }}>
                                {supervisor.name}
                              </Typography>
                            }
                            secondary={
                              <Typography component="div">
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Typography component="span" variant="body2" sx={{
                                    color: colors.textPrimary,
                                    fontWeight: 'bold',
                                    mr: 2,
                                    minWidth: 150
                                  }}>
                                    {supervisor.assessmentCount} assessments
                                  </Typography>

                                  <Box sx={{ width: '100%', mr: 2 }}>
                                    <LinearProgress
                                      variant="determinate"
                                      value={percentage}
                                      sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: `${colors.border}30`,
                                        '& .MuiLinearProgress-bar': {
                                          borderRadius: 4,
                                          backgroundColor: colors.primary
                                        }
                                      }}
                                    />
                                  </Box>

                                  <Typography component="span" variant="caption" sx={{
                                    color: colors.textSecondary,
                                    minWidth: 40,
                                    textAlign: 'right'
                                  }}>
                                    {percentage.toFixed(1)}%
                                  </Typography>
                                </Box>
                              </Typography>
                            }
                            sx={{ my: 0 }}
                          />
                        </ListItem>
                        {idx < sortedSupervisors.length - 1 && (
                          <Divider sx={{ backgroundColor: colors.border }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </List>
              ) : (
                <Typography component="div" sx={{
                  color: colors.textSecondary,
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  py: 2
                }}>
                  No assessment data available for supervisors.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
};

export default StatsOverview;