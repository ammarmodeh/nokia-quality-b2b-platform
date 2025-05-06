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
import { Person, Assessment, EmojiEvents } from '@mui/icons-material';
import React from "react";

const StatsOverview = ({ stats, supervisorStats, colors, isMobile }) => {
  console.log({ stats });
  const theme = useTheme();

  if (!stats) return null;

  // Calculate total assessments across all supervisors
  const totalSupervisorAssessments = Object.values(supervisorStats || {})
    .reduce((sum, supervisor) => sum + supervisor.assessmentCount, 0);

  // Calculate total assessments from field teams
  const totalFieldTeamAssessments = stats.fieldTeamStats?.reduce((sum, team) =>
    sum + (team.assessmentCount || 1), 0) || 0;

  // Use the most accurate total count available
  const totalAssessments = Math.max(
    stats.overallStats.totalAssessments || 0,
    totalSupervisorAssessments,
    totalFieldTeamAssessments
  );

  // Sort supervisors by assessment count (descending)
  const sortedSupervisors = Object.values(supervisorStats || {})
    .sort((a, b) => b.assessmentCount - a.assessmentCount);

  // Calculate score distribution - properly accounting for multiple assessments per team
  const scoreDistribution = {
    '0-19': 0,
    '20-39': 0,
    '40-59': 0,
    '60-79': 0,
    '80-100': 0
  };

  stats.fieldTeamStats?.forEach(team => {
    const score = team.averageScore || 0;
    const count = team.assessmentCount || 1; // Default to 1 if count missing

    if (score <= 19) {
      scoreDistribution['0-19'] += count;
    } else if (score <= 39) {
      scoreDistribution['20-39'] += count;
    } else if (score <= 59) {
      scoreDistribution['40-59'] += count;
    } else if (score <= 79) {
      scoreDistribution['60-79'] += count;
    } else {
      scoreDistribution['80-100'] += count;
    }
  });

  console.log({ scoreDistribution, totalAssessments });

  // Sort teams to find top and bottom performers
  const sortedTeamsByScore = [...(stats.fieldTeamStats || [])].sort((a, b) =>
    (b.averageScore || 0) - (a.averageScore || 0)
  );
  const topTeam = sortedTeamsByScore[0];
  const bottomTeam = sortedTeamsByScore[sortedTeamsByScore.length - 1];

  const cards = [
    // Combined Assessments and Average Score card
    {
      title: "Assessments Overview",
      icon: <Assessment fontSize="medium" sx={{ color: colors.primary }} />,
      flexContent: (
        <Box sx={{ mt: 1, flex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography component="div" variant="caption" sx={{
                color: colors.textSecondary,
                fontSize: '0.7rem'
              }}>
                Total Assessments
              </Typography>
              <Typography component="div" variant="h6" sx={{
                color: colors.textPrimary,
                fontWeight: 'bold',
                fontSize: isMobile ? '1.25rem' : '1.5rem'
              }}>
                {totalAssessments}
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'right' }}>
              <Typography component="div" variant="caption" sx={{
                color: colors.textSecondary,
                fontSize: '0.7rem'
              }}>
                Average Score
              </Typography>
              <Typography component="div" variant="h6" sx={{
                color: colors.textPrimary,
                fontWeight: 'bold',
                fontSize: isMobile ? '1.25rem' : '1.5rem'
              }}>
                {stats.overallStats.averageScore || 0}%
              </Typography>
            </Box>
          </Box>

          <Typography component="div" variant="caption" sx={{
            color: colors.textSecondary,
            display: 'block',
            mb: 0.5,
            fontSize: '0.65rem'
          }}>
            Score Distribution:
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
                value={(count / totalAssessments) * 100}
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
                {count} ({Math.round((count / totalAssessments) * 100)}%)
              </Typography>
            </Box>
          ))}
        </Box>
      )
    },
    // Team Performance card
    {
      title: "Team Performance",
      icon: <EmojiEvents fontSize="medium" sx={{ color: colors.warning }} />,
      flexContent: (
        <Box sx={{ mt: 2, flex: 1 }}>
          <Box sx={{ mb: 2 }}>
            <Typography component="div" variant="caption" sx={{
              color: colors.success,
              fontWeight: 'bold',
              display: 'block',
              mb: 0.5,
              fontSize: '0.7rem'
            }}>
              Highest-Scoring Team
            </Typography>
            <Typography component="div" variant="body1" sx={{
              color: colors.textPrimary,
              fontWeight: 'bold',
              fontSize: isMobile ? '0.9rem' : '1rem'
            }}>
              {topTeam?.teamName || "N/A"}
            </Typography>
            <Typography component="div" variant="body2" sx={{
              color: colors.textSecondary,
              fontSize: isMobile ? '0.75rem' : '0.875rem'
            }}>
              Score: {topTeam?.averageScore || 0}%
            </Typography>
          </Box>

          <Divider sx={{ borderColor: colors.border, my: 1 }} />

          <Box>
            <Typography component="div" variant="caption" sx={{
              color: colors.error,
              fontWeight: 'bold',
              display: 'block',
              mb: 0.5,
              fontSize: '0.7rem'
            }}>
              Lowest-Scoring Team
            </Typography>
            <Typography component="div" variant="body1" sx={{
              color: colors.textPrimary,
              fontWeight: 'bold',
              fontSize: isMobile ? '0.9rem' : '1rem'
            }}>
              {bottomTeam?.teamName || "N/A"}
            </Typography>
            <Typography component="div" variant="body2" sx={{
              color: colors.textSecondary,
              fontSize: isMobile ? '0.75rem' : '0.875rem'
            }}>
              Score: {bottomTeam?.averageScore || 0}%
            </Typography>
          </Box>
        </Box>
      )
    }
  ];

  return (
    <div key={JSON.stringify(stats) + JSON.stringify(supervisorStats)}>
      <Divider sx={{ my: 4, borderColor: colors.border }} />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {cards.map((stat, index) => (
          <Grid item xs={12} md={6} key={index}>
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
                  Total: {totalSupervisorAssessments}
                </Typography>
              </Typography>

              {sortedSupervisors.length > 0 ? (
                <List sx={{ py: 0 }}>
                  {sortedSupervisors.map((supervisor, idx) => {
                    const percentage = (supervisor.assessmentCount / totalSupervisorAssessments) * 100;
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
    </div>
  );
};

export default StatsOverview;
