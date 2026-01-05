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
  const theme = useTheme();

  if (!stats) return null;

  const glassStyle = {
    background: colors.surface,
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    border: `1px solid ${colors.border}`,
    borderRadius: '24px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease',
    '&:hover': {
      transform: 'translateY(-8px)',
      boxShadow: `0 12px 40px 0 ${colors.primary}30`,
      borderColor: `${colors.primary}40`,
    }
  };

  const totalSupervisorAssessments = Object.values(supervisorStats || {})
    .reduce((sum, supervisor) => sum + supervisor.assessmentCount, 0);

  const totalFieldTeamAssessments = stats.fieldTeamStats?.reduce((sum, team) =>
    sum + (team.assessmentCount || 1), 0) || 0;

  const totalAssessments = Math.max(
    stats.overallStats.totalAssessments || 0,
    totalSupervisorAssessments,
    totalFieldTeamAssessments
  );

  const sortedSupervisors = Object.values(supervisorStats || {})
    .sort((a, b) => b.assessmentCount - a.assessmentCount);

  const scoreDistribution = {
    '90%+ (Excel)': 0,
    '75-89% (Good)': 0,
    '60-74% (Fair)': 0,
    '40-59% (Needs Imp)': 0,
    '<40% (Poor)': 0
  };

  stats.fieldTeamStats?.forEach(team => {
    const score = team.averageScore || 0;
    const count = team.assessmentCount || 1;

    if (score >= 90) scoreDistribution['90%+ (Excel)'] += count;
    else if (score >= 75) scoreDistribution['75-89% (Good)'] += count;
    else if (score >= 60) scoreDistribution['60-74% (Fair)'] += count;
    else if (score >= 40) scoreDistribution['40-59% (Needs Imp)'] += count;
    else scoreDistribution['<40% (Poor)'] += count;
  });

  const sortedTeamsByScore = [...(stats.fieldTeamStats || [])].sort((a, b) =>
    (b.averageScore || 0) - (a.averageScore || 0)
  );
  const topTeam = sortedTeamsByScore[0];
  const bottomTeam = sortedTeamsByScore[sortedTeamsByScore.length - 1];

  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3} sx={{ mb: 6 }}>
        {/* Main Stats Card */}
        <Grid item xs={12} md={6}>
          <Card sx={glassStyle}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ color: colors.primary, fontWeight: 700 }}>
                  Network Performance
                </Typography>
                <Assessment sx={{ color: colors.primary }} />
              </Box>

              <Box sx={{ display: 'flex', gap: 4, mb: 4 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, mb: 0.5, display: 'block' }}>
                    Global Average
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: colors.textPrimary }}>
                    {Math.round(stats.overallStats.averageScore || 0)}%
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, mb: 0.5, display: 'block' }}>
                    Total Depth
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: colors.textPrimary }}>
                    {totalAssessments}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="caption" sx={{ color: colors.textSecondary, mb: 1, display: 'block' }}>
                Distribution of Team Scores:
              </Typography>
              {Object.entries(scoreDistribution).map(([range, count]) => (
                <Box key={range} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: colors.textPrimary, fontSize: '0.7rem' }}>{range}</Typography>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>{count} Teams</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(count / (totalAssessments || 1)) * 100}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'rgba(255,255,255,0.05)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        backgroundColor: range.includes('Excel') ? colors.success :
                          range.includes('Good') ? colors.success :
                            range.includes('Fair') ? colors.primary :
                              range.includes('Needs') ? colors.warning : colors.error
                      }
                    }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Leaders Card */}
        <Grid item xs={12} md={6}>
          <Card sx={glassStyle}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ color: colors.warning, fontWeight: 700 }}>
                  Performance Leaders
                </Typography>
                <EmojiEvents sx={{ color: colors.warning }} />
              </Box>

              <Box sx={{
                p: 2.5,
                borderRadius: '16px',
                bgcolor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.1)',
                mb: 3
              }}>
                <Typography variant="caption" sx={{ color: colors.success, fontWeight: 700, mb: 0.5, display: 'block' }}>
                  Top Performer
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: colors.textPrimary }}>{topTeam?.teamName || "N/A"}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: colors.success }}>{Math.round(topTeam?.averageScore || 0)}%</Typography>
                </Box>
              </Box>

              <Box sx={{
                p: 2.5,
                borderRadius: '16px',
                bgcolor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.1)'
              }}>
                <Typography variant="caption" sx={{ color: colors.error, fontWeight: 700, mb: 0.5, display: 'block' }}>
                  Attention Required
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: colors.textPrimary }}>{bottomTeam?.teamName || "N/A"}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: colors.error }}>{Math.round(bottomTeam?.averageScore || 0)}%</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Supervisor Contributions Card */}
        <Grid item xs={12}>
          <Card sx={{ ...glassStyle, '&:hover': { ...glassStyle['&:hover'], transform: 'none' } }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Person sx={{ color: colors.primary }} />
                  <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 700 }}>
                    Supervisory Oversight
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                  Total Audits: <strong>{totalSupervisorAssessments}</strong>
                </Typography>
              </Box>

              <Grid container spacing={4}>
                {sortedSupervisors.map((supervisor, idx) => {
                  const percentage = (supervisor.assessmentCount / (totalSupervisorAssessments || 1)) * 100;
                  return (
                    <Grid item xs={12} sm={6} md={4} key={idx}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{
                          bgcolor: colors.primary,
                          fontWeight: 700,
                          boxShadow: `0 0 12px ${colors.primary}40`
                        }}>
                          {supervisor.name.split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: colors.textPrimary }}>{supervisor.name}</Typography>
                            <Typography variant="caption" sx={{ color: colors.textSecondary }}>{supervisor.assessmentCount}</Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={percentage}
                            sx={{
                              height: 4,
                              borderRadius: 2,
                              bgcolor: 'rgba(255,255,255,0.05)',
                              '& .MuiLinearProgress-bar': { bgcolor: colors.primary }
                            }}
                          />
                        </Box>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StatsOverview;
