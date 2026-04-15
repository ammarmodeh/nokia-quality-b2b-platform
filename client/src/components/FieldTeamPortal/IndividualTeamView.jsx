
import React from 'react';
import { Box, Paper, Typography, Grid, Button, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, TextField, Chip, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Pagination, LinearProgress, Stack, Avatar, Card, CardContent, CircularProgress, Alert, TablePagination, Tooltip as MuiTooltip, IconButton } from '@mui/material';
import { Quiz, Assignment, BarChart as BarChartIconMUI, SupportAgent, CheckCircle, Warning, PriorityHigh, Assessment, PictureAsPdf as PictureAsPdfIcon, Timeline, Visibility as VisibilityIcon } from '@mui/icons-material';
import { Doughnut, Bar } from 'react-chartjs-2';
import { FaFileExcel, FaClipboardList, FaFileExport } from 'react-icons/fa';

export const IndividualTeamView = ({
  selectedTeam, colors, activeTab, handleTabChange, Quiz, Assignment, BarChartIconMUI, SupportAgent, CheckCircle, stats, operationalEfficiencyData, deepStats, allActivities, trendData, statusData, categoryData, technicalTasks, quizDistributionData, jobDistributionData, doughnutOptions, commonOptions, renderLineChart, renderBarChart, StatCard, quizResults, jobAssessments, labAssessments, customerIssues, formatDate, getAssessmentStatus, quizPage, quizRowsPerPage, setQuizPage, setQuizRowsPerPage, jobPage, jobRowsPerPage, setJobPage, setJobRowsPerPage, labPage, labRowsPerPage, setLabPage, setLabRowsPerPage, issuesPage, issuesRowsPerPage, setIssuesPage, setIssuesRowsPerPage, handleExportFullPerformanceToExcel, generatingReport, handleGenerateFullReport, exportTheoreticalToExcel, exportTestToPDF, exportPracticalToExcel, exportLabToExcel, handleExportTeamViolations, FieldTeamTicketsForPortalReview, ViewIssueDetailsDialog, TaskDetailsDialog, CompactDataTable, getPerformanceColor, calculateScoreLabel, getScoreDistribution, identifyStrengthsAndWeaknesses, Timeline, setSelectedDetailIssue, setDetailIssueOpen, setSelectedTask, setViewDialogOpen, handleReviewAssessment
}) => {
  return (
    <>
                <Box sx={{ animation: 'fadeIn 0.5s ease-out' }}>

            {/* Navigation Tabs */}
            <Paper sx={{
              mb: 4,
              bgcolor: 'transparent',
              boxShadow: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    color: colors.textSecondary,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 500,
                    py: 3,
                    px: 4,
                    minHeight: 64,
                    transition: '0.3s',
                    '&.Mui-selected': { color: colors.primary, fontWeight: 700 }
                  },
                  '& .MuiTabs-indicator': {
                    height: '4px',
                    borderRadius: '4px 4px 0 0',
                    background: colors.primaryGradient
                  }
                }}
              >
                <Tab label="Executive Overview" icon={<BarChartIconMUI />} iconPosition="start" />
                <Tab label="Customer Issues" icon={<SupportAgent />} iconPosition="start" />
                <Tab label="Tasks & Tickets" icon={<Assignment />} iconPosition="start" />
                <Tab label="Theoretical" icon={<Quiz />} iconPosition="start" />
                <Tab label="Practical" icon={<CheckCircle />} iconPosition="start" />
                <Tab label="Lab" icon={<Assessment />} iconPosition="start" />
                <Tab label="Smart Reports" icon={<Timeline />} iconPosition="start" />
              </Tabs>
            </Paper>

            {/* TAB PANELS */}

            {/* 1. EXECUTIVE OVERVIEW */}
            {activeTab === 0 && (
              <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>
                    Executive Overview: <span style={{ color: colors.primary }}>{selectedTeam?.teamName}</span>
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<FaFileExport />}
                    onClick={handleExportFullPerformanceToExcel}
                    sx={{
                      background: colors.primaryGradient,
                      borderRadius: '12px',
                      px: 3,
                      py: 1,
                      textTransform: 'none',
                      fontWeight: 600,
                      boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                      '&:hover': {
                        boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    Export Full Performance Data
                  </Button>
                </Box>

                <Grid container spacing={3}>
                  {/* High Level KPI Cards */}
                  {[
                    {
                      title: 'NPS Tickets',
                      value: stats.technicalTasksCount,
                      unit: 'Total',
                      desc: `Detractors: ${stats.technicalDetractors} | Neutrals: ${stats.technicalNeutrals}`,
                      color: colors.warning,
                      icon: <Assignment />
                    },
                    {
                      title: 'Customer Issues (Snags and Complaints)',
                      value: stats.customerIssuesCount,
                      unit: 'Reported',
                      desc: `${stats.resolutionRate}% Resolution Rate`,
                      color: colors.error,
                      icon: <SupportAgent />
                    },
                    {
                      title: 'Theoretical Score',
                      value: calculateAverageScore(quizResults),
                      max: 100,
                      unit: '%',
                      desc: 'Average Quiz Performance',
                      color: colors.primary,
                      icon: <Quiz />
                    },
                    {
                      title: 'Practical Score',
                      value: calculateAverageScore(jobAssessments),
                      max: 5,
                      unit: '/ 5',
                      desc: 'Field Assessment Proficiency',
                      color: colors.success,
                      icon: <CheckCircle />
                    },
                    {
                      title: 'Lab Score',
                      value: calculateAverageScore(labAssessments),
                      max: 100,
                      unit: '%',
                      desc: 'Average Lab Proficiency',
                      color: colors.info,
                      icon: <Assessment />
                    },
                  ].map((kpi, i) => (
                    <Grid item xs={12} sm={6} md={2.4} key={i}>
                      <Paper {...glassCardProps} sx={{ ...glassCardProps.sx, p: 3, position: 'relative', height: '100%' }}>
                        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: kpi.color }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography variant="overline" sx={{ color: colors.textSecondary, letterSpacing: 1.2, fontWeight: 600 }}>
                            {kpi.title}
                          </Typography>
                          <Box sx={{ color: kpi.color, opacity: 0.8 }}>
                            {kpi.icon}
                          </Box>
                        </Box>
                        <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', mb: 0.5 }}>
                          {typeof kpi.value === 'number' ?
                            (kpi.max === 5 ? kpi.value.toFixed(1) : Math.round(kpi.value))
                            : kpi.value}
                          <Typography component="span" variant="h6" sx={{ color: colors.textSecondary, ml: 1 }}>{kpi.unit}</Typography>
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block' }}>
                          {kpi.desc}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}

                  {/* Operational Efficiency & Deep Stats */}
                  <Grid item xs={12} md={8}>
                    <Paper {...glassCardProps} sx={{ ...glassCardProps.sx, p: 4, height: 450, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>Operational Efficiency & Responsivity</Typography>
                        <Chip
                          label="Live Operational Data"
                          size="small"
                          sx={{ bgcolor: `${colors.primary}20`, color: colors.primary, fontWeight: 700, border: `1px solid ${colors.primary}40` }}
                        />
                      </Box>
                      <Box sx={{ flex: 1, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart
                            data={operationalEfficiencyData}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis
                              type="category"
                              dataKey="name"
                              stroke={colors.textSecondary}
                              fontSize={12}
                              width={120}
                            />
                            <RechartsTooltip
                              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            />
                            <RechartsBar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                              {operationalEfficiencyData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </RechartsBar>
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </Box>

                      {/* Deep Stats Sub-grid */}
                      <Grid container spacing={2} sx={{ mt: 2 }}>
                        {[
                          { label: 'Reliability Index', value: `${deepStats.reliabilityIndex}%`, icon: <TrendingUpIcon fontSize="small" />, color: colors.secondary },
                          { label: 'Avg Resolution', value: `${deepStats.avgResolutionSpeed}d`, icon: <Schedule fontSize="small" />, color: colors.info },
                          { label: 'Aging Issues', value: deepStats.highAgingCount, icon: <Warning fontSize="small" />, color: colors.error },
                          { label: 'Express Fixes', value: deepStats.expressResolutionCount, icon: <CheckCircleIcon fontSize="small" />, color: colors.success },
                        ].map((s, i) => (
                          <Grid item xs={3} key={i}>
                            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                                <Box sx={{ color: s.color, display: 'flex' }}>{s.icon}</Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{s.value}</Typography>
                              </Box>
                              <Typography variant="caption" sx={{ color: colors.textSecondary, fontSize: '0.65rem', display: 'block' }}>{s.label}</Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Paper {...glassCardProps} sx={{ ...glassCardProps.sx, p: 4, height: 450, display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="h6" sx={{ mb: 3, color: '#fff', fontWeight: 600 }}>Recent Activity</Typography>
                      <Box sx={{ flex: 1, overflowY: 'auto', pr: 1, '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' } }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {allActivities.slice(0, 15).map((activity, idx) => (
                            <Box key={activity.id || idx} sx={{
                              p: 2,
                              borderRadius: '16px',
                              bgcolor: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.05)',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              position: 'relative',
                              overflow: 'hidden',
                              '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.04)',
                                borderColor: `${activity.color}40`,
                                transform: 'translateX(4px)'
                              }
                            }}>
                              {/* Vertical Accent */}
                              <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', bgcolor: activity.color, opacity: 0.6 }} />

                              <Stack spacing={1}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box sx={{
                                      p: 1,
                                      borderRadius: '10px',
                                      bgcolor: `${activity.color}15`,
                                      color: activity.color,
                                      display: 'flex',
                                      backdropFilter: 'blur(4px)'
                                    }}>
                                      {activity.icon}
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.2, fontSize: '0.65rem' }}>
                                        {activity.title}
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, lineHeight: 1.3 }}>
                                        {activity.detail}
                                      </Typography>
                                    </Box>
                                  </Stack>
                                  <Typography variant="caption" sx={{ color: colors.textSecondary, whiteSpace: 'nowrap', fontSize: '0.7rem', opacity: 0.7 }}>
                                    {formatDate(activity.date)}
                                  </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 400 }}>
                                    {activity.metadata}
                                  </Typography>
                                  {activity.status && (
                                    <Chip
                                      label={activity.status}
                                      size="small"
                                      sx={{
                                        height: '20px',
                                        fontSize: '0.62rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        bgcolor: `${activity.color}15`,
                                        color: activity.color,
                                        border: `1px solid ${activity.color}30`,
                                        '& .MuiChip-label': { px: 1 }
                                      }}
                                    />
                                  )}
                                </Box>
                              </Stack>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* 2. CUSTOMER ISSUES TAB (Deep Insights) */}
            {activeTab === 1 && (
              <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#fff' }}>Customer Issues Dashboard</Typography>
                    <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                      Technical analysis and performance metrics for {selectedTeam?.teamName}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#2d2d2d', px: 2, py: 1, borderRadius: 2, border: '1px solid #3d3d3d', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ color: '#b3b3b3', fontSize: '0.8rem' }}>From:</Typography>
                        <TextField
                          type="date"
                          size="small"
                          value={dateFilter.start}
                          onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                          sx={{
                            bgcolor: '#1a1a1a',
                            borderRadius: 1,
                            '& input': { color: '#fff', fontSize: '0.8rem', p: '6px 8px' },
                            '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ color: '#b3b3b3', fontSize: '0.8rem' }}>To:</Typography>
                        <TextField
                          type="date"
                          size="small"
                          value={dateFilter.end}
                          onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                          sx={{
                            bgcolor: '#1a1a1a',
                            borderRadius: 1,
                            '& input': { color: '#fff', fontSize: '0.8rem', p: '6px 8px' },
                            '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                          }}
                        />
                      </Box>
                      {(dateFilter.start || dateFilter.end) && (
                        <Button size="small" onClick={() => setDateFilter({ start: '', end: '' })} sx={{ color: '#f44336', minWidth: 0, p: 0.5 }}>
                          Clear
                        </Button>
                      )}
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<FaFileExport />}
                      disabled
                      sx={{ bgcolor: '#4e73df', '&:hover': { bgcolor: '#2e59d9' } }}
                    >
                      Email Report
                    </Button>
                  </Box>
                </Box>

                {/* KPI Section - Match Reference Layout */}
                <Grid container spacing={2} mb={4}>
                  <Grid item xs={12} sm={6} md={2.4}><StatCard title="Total Transactions" value={stats.totalTransactions} icon={<FaClipboardList />} color="#2196f3" subtext="Total records" /></Grid>
                  <Grid item xs={12} sm={6} md={2.4}><StatCard title="Issues Highlighted" value={stats.totalIssuesHighlighted} icon={<FaExclamationCircle />} color="#ffc107" subtext={`Avg: ${stats.issueDensity} per txn`} /></Grid>
                  <Grid item xs={12} sm={6} md={2.4}><StatCard title="Closed" value={stats.closed} icon={<FaCheckCircle />} color="#4caf50" subtext={`${stats.resolutionRate}% Rate`} /></Grid>
                  <Grid item xs={12} sm={6} md={2.4}><StatCard title="Open" value={stats.open} icon={<FaExclamationCircle />} color="#f44336" subtext="Require attention" /></Grid>
                  <Grid item xs={12} sm={6} md={2.4}><StatCard title="Avg. Daily Issues" value={(stats.totalTransactions / (trendData.labels.length || 1)).toFixed(1)} icon={<FaChartLine />} color="#ff9800" subtext="Trend metric" /></Grid>
                </Grid>

                {/* Process Efficiency Spotlight - Match Reference Layout */}
                <Box mb={4}>
                  <Grid container spacing={4}>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', height: '100%', border: '1px solid #3d3d3d' }}>
                        <Typography variant="subtitle2" color="grey.500" mb={1}>SUPERVISOR DISPATCH SPEED (Incl. Aging)</Typography>
                        <Typography variant="h3" fontWeight="800" color={Number(stats.avgDispatchTime) > 1 ? "warning.main" : "info.main"}>
                          {stats.avgDispatchTime}<span style={{ fontSize: '1rem', color: '#888' }}> days</span>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          Avg time from <b>Reported</b> → <b>Dispatched</b> (Or <b>Reported</b> → <b>Now</b> if pending)
                        </Typography>
                        <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, border: '1px dashed #444' }}>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#888', fontStyle: 'italic', lineHeight: 1.2 }}>
                            * Calculation: (Dispatched Date - Reported Date) OR (Now - Reported Date) if undispatched.
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', height: '100%', border: '1px solid #3d3d3d' }}>
                        <Typography variant="subtitle2" color="grey.500" mb={1}>FIELD RESOLUTION SPEED (Incl. Aging)</Typography>
                        <Typography variant="h3" fontWeight="800" color="success.main">
                          {stats.avgResolutionTime}<span style={{ fontSize: '1rem', color: '#888' }}> days</span>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          Avg time from <b>Dispatched</b> → <b>Resolved</b> (Or <b>Reported</b> → <b>Now</b> if pending)
                        </Typography>
                        <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, border: '1px dashed #444' }}>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#888', fontStyle: 'italic', lineHeight: 1.2 }}>
                            * Calculation: Resolved cases use (Resolved - Dispatched). Pending cases use (Now - Reported) to reflect negligence.
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', height: '100%', border: '1px solid #3d3d3d' }}>
                        <Typography variant="subtitle2" color="grey.500" mb={1}>TOTAL LIFECYCLE (Accountability)</Typography>
                        <Typography variant="h3" fontWeight="800" color="white">
                          {stats.avgLifecycleTime}<span style={{ fontSize: '1rem', color: '#888' }}> days</span>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          Total time from <b>Initial Report</b> → <b>Closed/Now</b>
                        </Typography>
                        <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, border: '1px dashed #444' }}>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#888', fontStyle: 'italic', lineHeight: 1.2 }}>
                            * Calculation: Full duration from (Report Date) to (Closed Date) OR (Now) if the case is still open.
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>

                {/* Charts - Match Reference Layout */}
                <Grid container spacing={3} mb={4}>
                  <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold">Issue Reporting Trend</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <FormControl size="small" variant="outlined">
                            <Select
                              value={trendTimeframe}
                              onChange={(e) => setTrendTimeframe(e.target.value)}
                              sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#3d3d3d' }, fontSize: '0.8rem', height: 32 }}
                            >
                              <MenuItem value="day">Daily</MenuItem>
                              <MenuItem value="week">Weekly</MenuItem>
                              <MenuItem value="month">Monthly</MenuItem>
                            </Select>
                          </FormControl>
                          <FormControl size="small" variant="outlined">
                            <Select
                              value={trendChartType}
                              onChange={(e) => setTrendChartType(e.target.value)}
                              sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#3d3d3d' }, fontSize: '0.8rem', height: 32 }}
                            >
                              <MenuItem value="mixed">Mixed</MenuItem>
                              <MenuItem value="bar">Bar</MenuItem>
                              <MenuItem value="line">Line</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
                      </Box>
                      <Box sx={{ height: 300 }}><Bar data={trendData} options={commonOptions} /></Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d', height: '100%' }}>
                      <Typography variant="h6" gutterBottom fontWeight="bold">Resolution Status</Typography>
                      <Box sx={{ height: 260, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Doughnut data={statusData} options={doughnutOptions} />
                        <Box sx={{ position: 'absolute', textAlign: 'center' }}>
                          <Typography variant="h4" fontWeight="bold" sx={{ color: '#1cc88a' }}>{stats.resolutionRate}%</Typography>
                          <Typography variant="caption" color="#b3b3b3">Resolved</Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Detailed Issue Registry - Styled like Supervisor Performance Table */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 0,
                    bgcolor: '#1e293b',
                    borderRadius: 3,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    overflow: 'hidden',
                    background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)' }}>
                    <Box>
                      <Typography variant="h6" fontWeight="700" color="#f8fafc">
                        Issue History & Registry
                      </Typography>
                      <Typography variant="body2" color="#94a3b8" sx={{ mt: 0.5 }}>
                        Full list of issues associated with this team
                      </Typography>
                    </Box>
                    <Chip
                      label={`${filteredIssuesByDate.length} Records`}
                      size="small"
                      sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)', fontWeight: 600 }}
                    />
                  </Box>
                  <Box sx={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                      <thead>
                        <tr style={{ background: '#0f172a' }}>
                          <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Date</th>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>SLID</th>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Reporter</th>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Category</th>
                          <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredIssuesByDate
                          .slice(issuesPage * issuesRowsPerPage, issuesPage * issuesRowsPerPage + issuesRowsPerPage)
                          .map((issue) => (
                            <tr
                              key={issue._id}
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background-color 0.2s ease' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <td style={{ padding: '16px 24px', color: '#f8fafc', fontSize: '0.85rem' }}>{formatDate(issue.date || issue.createdAt)}</td>
                              <td style={{ padding: '16px', color: '#60a5fa', fontWeight: 'bold', fontSize: '0.85rem' }}>{issue.slid}</td>
                              <td style={{ padding: '16px', color: '#f8fafc', fontSize: '0.85rem' }}>{issue.reporter || 'N/A'}</td>
                              <td style={{ padding: '16px', color: '#94a3b8', fontSize: '0.85rem' }}>
                                {issue.issues?.[0]?.category || issue.issueCategory || 'Uncategorized'}
                                <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>{issue.issues?.[0]?.subCategory || '-'}</Typography>
                              </td>
                              <td style={{ padding: '16px', textAlign: 'center' }}>
                                <Chip
                                  label={issue.solved === 'yes' ? 'Closed' : 'Open'}
                                  size="small"
                                  sx={{
                                    bgcolor: issue.solved === 'yes' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: issue.solved === 'yes' ? '#4ade80' : '#f87171',
                                    border: `1px solid ${issue.solved === 'yes' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                    fontWeight: 600
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    <TablePagination
                      rowsPerPageOptions={[10, 25, 50]}
                      component="div"
                      count={filteredIssuesByDate.length}
                      rowsPerPage={issuesRowsPerPage}
                      page={issuesPage}
                      onPageChange={(e, p) => setIssuesPage(p)}
                      onRowsPerPageChange={(e) => {
                        setIssuesRowsPerPage(parseInt(e.target.value, 10));
                        setIssuesPage(0);
                      }}
                      sx={{ color: '#94a3b8' }}
                    />
                  </Box>
                </Paper>
              </Box>
            )}

            {/* 3. TASKS & TICKETS TAB (Full Premium Dashboard) */}
            {activeTab === 2 && (
              <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#fff' }}>NPS Tickets</Typography>
                    <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                      Operational workload and technical assessment registry for {selectedTeam?.teamName}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<FaFileExcel />}
                      sx={{ color: colors.success, borderColor: colors.success }}
                      onClick={() => {
                        const data = technicalTasks.map(t => ({
                          SLID: t.slid,
                          'Request Number': t.requestNumber,
                          'Customer Name': t.customerName,
                          'PIS Date': t.pisDate ? new Date(t.pisDate).toLocaleDateString() : 'N/A',
                          Priority: t.priority,
                          Status: t.validationStatus,
                          Score: t.evaluationScore || 'N/A'
                        }));
                        const ws = XLSX.utils.json_to_sheet(data);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Tasks");
                        XLSX.writeFile(wb, `${selectedTeam.teamName}_Technical_Tasks.xlsx`);
                      }}
                    >
                      Export Excel
                    </Button>
                  </Box>
                </Box>

                {/* Technical KPI Section */}
                <Grid container spacing={2} mb={4}>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Total Tasks"
                      value={technicalTasks.length}
                      icon={<FaClipboardList />}
                      color={colors.primary}
                      subtext="Technical workload"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="High Priority"
                      value={technicalTasks.filter(t => t.priority === 'High').length}
                      icon={<PriorityHigh />}
                      color={colors.error}
                      subtext="Requires urgent action"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Detractors"
                      value={technicalTasks.filter(t => t.evaluationScore > 0 && t.evaluationScore <= 60).length}
                      icon={<FaExclamationCircle />}
                      color={colors.warning}
                      subtext="Score below 60%"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Avg. Quality"
                      value={(() => {
                        const evaluated = technicalTasks.filter(t => t.evaluationScore > 0);
                        return evaluated.length > 0 ? (evaluated.reduce((a, b) => a + b.evaluationScore, 0) / evaluated.length).toFixed(1) : 'N/A';
                      })()}
                      icon={<CheckCircle />}
                      color={colors.success}
                      subtext="Technical score avg"
                    />
                  </Grid>
                </Grid>

                {/* Technical Charts */}
                <Grid container spacing={3} mb={4}>
                  <Grid item xs={12} lg={6}>
                    <Paper sx={{ p: 3, ...darkThemeStyles.paper, height: '100%' }}>
                      <Typography variant="h6" sx={{ mb: 2, color: colors.primary }}>Task Distribution by Priority</Typography>
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={[
                            { name: 'High', value: technicalTasks.filter(t => t.priority === 'High').length, color: colors.error },
                            { name: 'Medium', value: technicalTasks.filter(t => t.priority === 'Medium').length, color: colors.warning },
                            { name: 'Low', value: technicalTasks.filter(t => t.priority === 'Low').length, color: colors.success },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} vertical={false} />
                            <XAxis dataKey="name" stroke={colors.textSecondary} fontSize={12} />
                            <YAxis stroke={colors.textSecondary} fontSize={12} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#252525', border: `1px solid ${colors.border}`, borderRadius: '12px' }} />
                            <RechartsBar dataKey="value" radius={[4, 4, 0, 0]}>
                              {[colors.error, colors.warning, colors.success].map((color, idx) => <Cell key={`cell-${idx}`} fill={color} />)}
                            </RechartsBar>
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} lg={6}>
                    <Paper sx={{ p: 3, ...darkThemeStyles.paper, height: '100%' }}>
                      <Typography variant="h6" sx={{ mb: 2, color: colors.primary }}>Operational Status</Typography>
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <RechartsPie
                              data={[
                                { name: 'Validated', value: technicalTasks.filter(t => t.validationStatus === 'Validated').length, color: colors.success },
                                { name: 'Pending', value: technicalTasks.filter(t => t.validationStatus === 'Pending').length, color: colors.warning },
                                { name: 'Rejected', value: technicalTasks.filter(t => t.validationStatus === 'Rejected').length, color: colors.error },
                              ].filter(d => d.value > 0)}
                              cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                            >
                              {[colors.success, colors.warning, colors.error].map((color, idx) => <Cell key={`cell-${idx}`} fill={color} />)}
                            </RechartsPie>
                            <RechartsTooltip contentStyle={{ backgroundColor: '#252525', border: `1px solid ${colors.border}`, borderRadius: '12px' }} />
                            <RechartsLegend verticalAlign="bottom" height={36} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Task Registry Table */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 0,
                    bgcolor: '#1e293b',
                    borderRadius: 3,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    overflow: 'hidden',
                    background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                  }}
                >
                  <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight="700" color="#f8fafc">Technical Task Registry</Typography>
                    <Chip label={`${technicalTasks.length} Tasks`} size="small" sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }} />
                  </Box>
                  <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ background: '#0f172a' }}>
                        <tr>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>REQUEST NO</th>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>CUSTOMER</th>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>SLID</th>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>PIS DATE</th>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>PRIORITY</th>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>STATUS</th>
                          <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>SCORE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {technicalTasks.map((task) => (
                          <tr key={task._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: '0.2s', '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                            <td style={{ padding: '16px', color: '#fff', fontSize: '0.85rem' }}>{task.requestNumber || 'N/A'}</td>
                            <td style={{ padding: '16px', color: '#f8fafc', fontSize: '0.85rem' }}>{task.customerName}</td>
                            <td style={{ padding: '16px', color: colors.primary, fontWeight: 'bold' }}>{task.slid}</td>
                            <td style={{ padding: '16px', color: '#94a3b8', fontSize: '0.85rem' }}>{formatDate(task.pisDate || task.createdAt)}</td>
                            <td style={{ padding: '16px' }}>
                              <Chip label={task.priority} size="small" color={task.priority === 'High' ? 'error' : task.priority === 'Medium' ? 'warning' : 'success'} variant="outlined" />
                            </td>
                            <td style={{ padding: '16px' }}>
                              <Chip
                                label={task.validationStatus}
                                size="small"
                                sx={{
                                  bgcolor: task.validationStatus === 'Validated' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                                  color: task.validationStatus === 'Validated' ? '#4ade80' : '#facc15',
                                  border: `1px solid ${task.validationStatus === 'Validated' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)'}`
                                }}
                              />
                            </td>
                            <td style={{ padding: '16px', textAlign: 'center', fontWeight: 'bold', color: (task.evaluationScore && (task.evaluationScore > 80 || (task.evaluationScore <= 10 && task.evaluationScore > 8))) ? colors.success : colors.warning }}>
                              {task.evaluationScore ? `${task.evaluationScore}${task.evaluationScore <= 10 ? '/10' : '%'}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Paper>
              </Box>
            )}

            {/* 4. THEORETICAL ASSESSMENTS (Updated Styling) */}
            {activeTab === 3 && (
              <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h5" sx={{ color: colors.primary }}>Theoretical Assessments</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<TableChartIcon />}
                        onClick={exportTheoreticalToExcel}
                        disabled={quizResults.length === 0}
                        sx={{ color: colors.success, borderColor: colors.success, '&:hover': { borderColor: colors.success, bgcolor: `${colors.success}11` } }}
                      >
                        Pro Excel
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={() => exportTestToPDF('theoretical', quizResults)}
                        disabled={quizResults.length === 0}
                        sx={{ color: colors.error, borderColor: colors.error, '&:hover': { borderColor: colors.error, bgcolor: `${colors.error}11` } }}
                      >
                        Pro PDF Report
                      </Button>
                    </Box>
                  </Box>
                  <Chip
                    label={`Avg: ${Math.round(calculateAverageScore(quizResults))}%`}
                    variant="outlined"
                    sx={{ borderColor: getPerformanceColor(calculateAverageScore(quizResults), 'quiz'), color: getPerformanceColor(calculateAverageScore(quizResults), 'quiz') }}
                  />
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress sx={{ color: colors.primary }} />
                  </Box>
                ) : quizResults.length > 0 ? (
                  <>
                    <TableContainer component={Paper} sx={{
                      mb: 2,
                      ...darkThemeStyles.paper,
                      "& .MuiTable-root": darkThemeStyles.table
                    }}>
                      <Table>
                        <TableHead sx={darkThemeStyles.tableHead}>
                          <TableRow>
                            <TableCell sx={darkThemeStyles.tableCell}>Date</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Quiz Code</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Score</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Correct Answers</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Percentage</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {quizResults
                            .slice(quizPage * quizRowsPerPage, quizPage * quizRowsPerPage + quizRowsPerPage)
                            .map((result) => (
                              <TableRow key={result._id}
                                sx={{
                                  "&:hover": {
                                    backgroundColor: colors.tableRowHover
                                  }
                                }}
                              >
                                <TableCell sx={darkThemeStyles.tableCell}>{formatDate(result.submittedAt)}</TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>{result.quizCode}</TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>
                                  <Chip
                                    label={result.score}
                                    sx={{
                                      bgcolor: `${getPerformanceColor(result.percentage)}22`,
                                      color: getPerformanceColor(result.percentage),
                                      borderColor: getPerformanceColor(result.percentage),
                                      fontWeight: 'bold'
                                    }}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>{result.correctAnswers}/{result.totalQuestions}</TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>{result.percentage}%</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      rowsPerPageOptions={[10, 25, 50]}
                      component="div"
                      count={quizResults.length}
                      rowsPerPage={quizRowsPerPage}
                      page={quizPage}
                      onPageChange={(e, newPage) => setQuizPage(newPage)}
                      onRowsPerPageChange={(e) => {
                        setQuizRowsPerPage(parseInt(e.target.value, 10));
                        setQuizPage(0);
                      }}
                      sx={{
                        ...darkThemeStyles.tablePagination,
                        color: colors.textPrimary,
                        "& .MuiTablePagination-select": {
                          color: colors.textPrimary
                        },
                        "& .MuiTablePagination-selectIcon": {
                          color: colors.textPrimary
                        }
                      }}
                      labelRowsPerPage={
                        <Typography color={colors.textPrimary}>Rows per page:</Typography>
                      }
                    />
                  </>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center', ...darkThemeStyles.paper }}>
                    <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                      No theoretical assessments found for this team
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            {/* 5. PRACTICAL ASSESSMENTS (Updated Styling) */}
            {activeTab === 4 && (
              <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h5" sx={{ color: colors.primary }}>Practical Assessments</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<TableChartIcon />}
                        onClick={exportPracticalToExcel}
                        disabled={jobAssessments.length === 0}
                        sx={{ color: colors.success, borderColor: colors.success, '&:hover': { borderColor: colors.success, bgcolor: `${colors.success}11` } }}
                      >
                        Pro Excel
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={() => exportTestToPDF('practical', jobAssessments)}
                        disabled={jobAssessments.length === 0}
                        sx={{ color: colors.error, borderColor: colors.error, '&:hover': { borderColor: colors.error, bgcolor: `${colors.error}11` } }}
                      >
                        Pro PDF Report
                      </Button>
                    </Box>
                  </Box>
                  <Chip
                    label={`Avg: ${Number(calculateAverageScore(jobAssessments)).toFixed(1)}/5`}
                    variant="outlined"
                    sx={{ borderColor: getPerformanceColor(calculateAverageScore(jobAssessments), 'practical'), color: getPerformanceColor(calculateAverageScore(jobAssessments), 'practical') }}
                  />
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress sx={{ color: colors.primary }} />
                  </Box>
                ) : jobAssessments.length > 0 ? (
                  <>
                    <TableContainer component={Paper} sx={{
                      mb: 2,
                      ...darkThemeStyles.paper,
                      "& .MuiTable-root": darkThemeStyles.table
                    }}>
                      <Table>
                        <TableHead sx={darkThemeStyles.tableHead}>
                          <TableRow>
                            <TableCell sx={darkThemeStyles.tableCell}>Date</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Conducted By</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Score</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {jobAssessments
                            .slice(jobPage * jobRowsPerPage, jobPage * jobRowsPerPage + jobRowsPerPage)
                            .map((assessment) => (
                              <TableRow key={assessment._id}
                                sx={{
                                  "&:hover": {
                                    backgroundColor: colors.tableRowHover
                                  }
                                }}
                              >
                                <TableCell sx={darkThemeStyles.tableCell}>{formatDate(assessment.assessmentDate)}</TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>{assessment.conductedBy}</TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>
                                  <Chip
                                    label={`${Number(assessment.overallScore).toFixed(1)}/5`}
                                    sx={{
                                      bgcolor: `${getAssessmentStatus(assessment.overallScore, 'practical').color}22`,
                                      color: getAssessmentStatus(assessment.overallScore, 'practical').color,
                                      borderColor: getAssessmentStatus(assessment.overallScore, 'practical').color,
                                      border: '1px solid',
                                      fontWeight: 'bold'
                                    }}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>
                                  <Chip
                                    label={getAssessmentStatus(assessment.overallScore, 'practical').label}
                                    size="small"
                                    sx={{
                                      borderColor: getAssessmentStatus(assessment.overallScore, 'practical').color,
                                      color: getAssessmentStatus(assessment.overallScore, 'practical').color,
                                      border: '1px solid'
                                    }}
                                    variant="outlined"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      rowsPerPageOptions={[10, 25, 50]}
                      component="div"
                      count={jobAssessments.length}
                      rowsPerPage={jobRowsPerPage}
                      page={jobPage}
                      onPageChange={(e, newPage) => setJobPage(newPage)}
                      onRowsPerPageChange={(e) => {
                        setJobRowsPerPage(parseInt(e.target.value, 10));
                        setJobPage(0);
                      }}
                      sx={{
                        ...darkThemeStyles.tablePagination,
                        color: colors.textPrimary,
                        "& .MuiTablePagination-select": {
                          color: colors.textPrimary
                        },
                        "& .MuiTablePagination-selectIcon": {
                          color: colors.textPrimary
                        }
                      }}
                      labelRowsPerPage={
                        <Typography color={colors.textPrimary}>Rows per page:</Typography>
                      }
                    />
                  </>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center', ...darkThemeStyles.paper }}>
                    <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                      No practical assessments found for this team
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            {/* 6. LAB ASSESSMENTS (Updated Styling) */}
            {activeTab === 5 && (
              <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h5" sx={{ color: colors.primary }}>Lab Assessments</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<TableChartIcon />}
                        onClick={exportLabToExcel}
                        disabled={labAssessments.length === 0}
                        sx={{ color: colors.success, borderColor: colors.success, '&:hover': { borderColor: colors.success, bgcolor: `${colors.success}11` } }}
                      >
                        Pro Excel
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={() => exportTestToPDF('lab', labAssessments)}
                        disabled={labAssessments.length === 0}
                        sx={{ color: colors.error, borderColor: colors.error, '&:hover': { borderColor: colors.error, bgcolor: `${colors.error}11` } }}
                      >
                        Pro PDF Report
                      </Button>
                    </Box>
                  </Box>
                  <Chip
                    label={`Avg: ${Math.round(calculateAverageScore(labAssessments))}%`}
                    variant="outlined"
                    sx={{ borderColor: getPerformanceColor(calculateAverageScore(labAssessments)), color: getPerformanceColor(calculateAverageScore(labAssessments)) }}
                  />
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress sx={{ color: colors.primary }} />
                  </Box>
                ) : labAssessments.length > 0 ? (
                  <>
                    <TableContainer component={Paper} sx={{
                      mb: 2,
                      ...darkThemeStyles.paper,
                      "& .MuiTable-root": darkThemeStyles.table
                    }}>
                      <Table>
                        <TableHead sx={darkThemeStyles.tableHead}>
                          <TableRow>
                            <TableCell sx={darkThemeStyles.tableCell}>Date</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Type</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>ONT Type</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Splicing Status</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Score</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Comments</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {labAssessments
                            .slice(labPage * labRowsPerPage, labPage * labRowsPerPage + labRowsPerPage)
                            .map((assessment) => (
                              <TableRow key={assessment._id}
                                sx={{
                                  "&:hover": {
                                    backgroundColor: colors.tableRowHover
                                  }
                                }}
                              >
                                <TableCell sx={darkThemeStyles.tableCell}>{formatDate(assessment.createdAt)}</TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>
                                  <Chip label={assessment.assessmentType || 'Technical'} size="small" variant="outlined" sx={{ color: colors.primary, borderColor: colors.primary }} />
                                </TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>{assessment.ontType?.name || 'N/A'}</TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>
                                  {assessment.assessmentType === 'Infrastructure' ? (
                                    <Chip
                                      label={assessment.splicingMachineStatus || 'Good'}
                                      size="small"
                                      sx={{
                                        bgcolor: assessment.splicingMachineStatus === 'Poor' ? `${colors.error}22` : assessment.splicingMachineStatus === 'Fair' ? `${colors.warning}22` : `${colors.success}22`,
                                        color: assessment.splicingMachineStatus === 'Poor' ? colors.error : assessment.splicingMachineStatus === 'Fair' ? colors.warning : colors.success,
                                        borderColor: assessment.splicingMachineStatus === 'Poor' ? colors.error : assessment.splicingMachineStatus === 'Fair' ? colors.warning : colors.success,
                                      }}
                                      variant="outlined"
                                    />
                                  ) : 'N/A'}
                                </TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>
                                  <Chip
                                    label={`${assessment.totalScore}%`}
                                    sx={{
                                      bgcolor: `${getPerformanceColor(assessment.totalScore)}22`,
                                      color: getPerformanceColor(assessment.totalScore),
                                      borderColor: getPerformanceColor(assessment.totalScore),
                                      fontWeight: 'bold'
                                    }}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>{assessment.comments || '-'}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      rowsPerPageOptions={[10, 25, 50]}
                      component="div"
                      count={labAssessments.length}
                      rowsPerPage={labRowsPerPage}
                      page={labPage}
                      onPageChange={(e, newPage) => setLabPage(newPage)}
                      onRowsPerPageChange={(e) => {
                        setLabRowsPerPage(parseInt(e.target.value, 10));
                        setLabPage(0);
                      }}
                      sx={{
                        ...darkThemeStyles.tablePagination,
                        color: colors.textPrimary,
                        "& .MuiTablePagination-select": {
                          color: colors.textPrimary
                        },
                        "& .MuiTablePagination-selectIcon": {
                          color: colors.textPrimary
                        }
                      }}
                      labelRowsPerPage={
                        <Typography color={colors.textPrimary}>Rows per page:</Typography>
                      }
                    />
                  </>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center', ...darkThemeStyles.paper }}>
                    <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                      No lab assessments found for this team
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            {/* Tab index 6 now corresponds to Smart Reports */}

            {/* 8. REPORTS (Index 6 after removal of Leaderboard tab) */}
            {activeTab === 6 && (
              <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" sx={{ color: colors.primary }}>Advanced Analytics & Reporting</Typography>
                  <Button
                    variant="contained"
                    startIcon={generatingReport ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <PictureAsPdfIcon />}
                    onClick={handleGenerateFullReport}
                    disabled={generatingReport || (quizResults.length === 0 && jobAssessments.length === 0 && labAssessments.length === 0)}
                    sx={{
                      bgcolor: colors.primary,
                      '&:hover': { bgcolor: colors.primary, opacity: 0.9 },
                      '&:disabled': { bgcolor: colors.textSecondary }
                    }}
                  >
                    {generatingReport ? 'Generating...' : 'Generate Full Evaluation'}
                  </Button>
                </Box>

                <Grid container spacing={3}>
                  {/* Strategic Benchmarking */}
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, ...darkThemeStyles.paper, height: '100%', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)' }}>
                      <Typography variant="h6" sx={{ mb: 2, color: colors.primary, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUpIcon /> Strategic Benchmarking
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {(() => {
                          const avgMastery = Math.round((calculateAverageScore(quizResults) + (calculateAverageScore(jobAssessments) * 20) + calculateAverageScore(labAssessments)) / 3);
                          const isMaster = avgMastery >= 85;
                          return (
                            <>
                              <Box>
                                <Typography variant="caption" color={colors.textSecondary}>Current Status</Typography>
                                <Typography variant="h5" sx={{ fontWeight: 700, color: isMaster ? colors.success : colors.warning }}>
                                  {isMaster ? 'Mastery Level' : 'Development Phase'}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color={colors.textSecondary}>Distance to Top Tier</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                  {avgMastery >= 90 ? 'Elite (Top 5%)' : `${90 - avgMastery}% to Elite`}
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(100, (avgMastery / 90) * 100)}
                                  sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { bgcolor: colors.primary } }}
                                />
                              </Box>
                              <Box sx={{ mt: 1, p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <Typography variant="caption" sx={{ color: colors.textSecondary, fontStyle: 'italic' }}>
                                  {avgMastery < 70 ? 'Recommendation: Remedial training required in core domains.'
                                    : avgMastery < 85 ? 'Recommendation: Focus on consistency and error reduction.'
                                      : 'Recommendation: Maintain performance; mentor other teams.'}
                                </Typography>
                              </Box>
                            </>
                          );
                        })()}
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Operational Balance Radar */}
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, ...darkThemeStyles.paper, height: '100%' }}>
                      <Typography variant="h6" sx={{ mb: 2, color: colors.primary }}>Performance Balance</Typography>
                      <ResponsiveContainer width="100%" height={280}>
                        <RadarChart data={[
                          {
                            subject: 'Theoretical',
                            score: calculateAverageScore(quizResults),
                            fullMark: 100
                          },
                          {
                            subject: 'Practical',
                            score: calculateAverageScore(jobAssessments) * 20, // Scale to 100
                            fullMark: 100
                          },
                          {
                            subject: 'Lab',
                            score: calculateAverageScore(labAssessments),
                            fullMark: 100
                          }
                        ]}>
                          <PolarGrid stroke={colors.border} />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: colors.textPrimary, fontSize: 10 }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: colors.textSecondary, fontSize: 8 }} />
                          <Radar name="Score" dataKey="score" stroke={colors.primary} fill={colors.primary} fillOpacity={0.3} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#252525', border: `1px solid ${colors.border}`, borderRadius: '12px' }}
                            formatter={(value) => `${Math.round(value)}%`}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>

                  {/* Strengths & Weaknesses */}
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, ...darkThemeStyles.paper, height: '100%' }}>
                      <Typography variant="h6" sx={{ mb: 2, color: colors.primary }}>Strengths & Weaknesses</Typography>
                      {(() => {
                        const { strengths, weaknesses } = identifyStrengthsAndWeaknesses();
                        return (
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: colors.success, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CheckCircleIcon fontSize="small" /> Top Strengths
                            </Typography>
                            {strengths.length > 0 ? (
                              <Box sx={{ mb: 3 }}>
                                {strengths.map((s, i) => (
                                  <Chip
                                    key={i}
                                    label={`${s.name}: ${Math.round(s.score)}%`}
                                    size="small"
                                    sx={{ m: 0.5, bgcolor: `${colors.success}22`, color: colors.success, borderColor: colors.success }}
                                    variant="outlined"
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color={colors.textSecondary} sx={{ mb: 3 }}>No data available</Typography>
                            )}

                            <Typography variant="subtitle2" sx={{ color: colors.error, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CancelIcon fontSize="small" /> Areas for Improvement
                            </Typography>
                            {weaknesses.length > 0 ? (
                              <Box>
                                {weaknesses.map((w, i) => (
                                  <Chip
                                    key={i}
                                    label={`${w.name}: ${Math.round(w.score)}%`}
                                    size="small"
                                    sx={{ m: 0.5, bgcolor: `${colors.error}22`, color: colors.error, borderColor: colors.error }}
                                    variant="outlined"
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color={colors.textSecondary}>No data available</Typography>
                            )}
                          </Box>
                        );
                      })()}
                    </Paper>
                  </Grid>

                  {/* Mastery & Consistency Metrics */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, ...darkThemeStyles.paper, height: '100%' }}>
                      <Typography variant="h6" sx={{ mb: 2, color: colors.primary }}>Consistency & Mastery Analysis</Typography>
                      <Grid container spacing={2}>
                        {[
                          { label: 'Overall Mastery', value: `${Math.round((calculateAverageScore(quizResults) + (calculateAverageScore(jobAssessments) * 20) + calculateAverageScore(labAssessments)) / 3)}%`, color: colors.primary },
                          { label: 'Theoretical Volatility', value: `${Math.round(calculateStandardDeviation(quizResults))}%`, color: colors.warning },
                          { label: 'Practical Consistency', value: calculateStandardDeviation(jobAssessments) < 10 ? 'High' : 'Variable', color: colors.success },
                          { label: 'Lab Mastery Rate', value: `${Math.round(calculatePercentageAboveThreshold(labAssessments, 80))}%`, color: colors.primary }
                        ].map((metric, i) => (
                          <Grid item xs={6} key={i}>
                            <Card sx={{ bgcolor: colors.surfaceElevated, border: `1px solid ${colors.border}` }}>
                              <CardContent sx={{ p: 2 }}>
                                <Typography variant="caption" color={colors.textSecondary}>{metric.label}</Typography>
                                <Typography variant="h6" sx={{ color: metric.color, fontWeight: 'bold' }}>{metric.value}</Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  </Grid>

                  {/* Process Efficiency Analysis */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, ...darkThemeStyles.paper, height: '100%' }}>
                      <Typography variant="h6" sx={{ mb: 2, color: colors.primary }}>Process Efficiency Analysis</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {[
                          { label: 'Avg Dispatch Speed', value: stats.avgDispatchTime, unit: 'days', color: colors.info },
                          { label: 'Avg Resolution Speed', value: stats.avgResolutionTime, unit: 'days', color: colors.success },
                          { label: 'Full Lifecycle Time', value: stats.avgLifecycleTime, unit: 'days', color: colors.warning }
                        ].map((metric, i) => (
                          <Box key={i}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2" color={colors.textSecondary}>{metric.label}</Typography>
                              <Typography variant="body2" fontWeight="bold" sx={{ color: metric.color }}>{metric.value} {metric.unit}</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(100, (metric.value / 10) * 100)}
                              sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { bgcolor: metric.color } }}
                            />
                          </Box>
                        ))}
                        <Box sx={{ mt: 1, p: 2, bgcolor: 'rgba(59, 130, 246, 0.05)', borderRadius: 2, border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                          <Typography variant="caption" sx={{ color: colors.info, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Info sx={{ fontSize: '1rem' }} /> Values normalized against 10-day benchmark.
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Performance Summary Section */}
            {(quizResults.length > 0 || jobAssessments.length > 0 || labAssessments.length > 0) && (
              <Box sx={{ mt: 5 }}>
                <Typography variant="h5" sx={{ color: colors.primary, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assessment /> Advanced Analytics
                </Typography>

                <Grid container spacing={3}>
                  {[
                    { name: 'Theoretical', data: quizResults, color: colors.primary },
                    { name: 'Practical', data: jobAssessments, color: colors.success },
                    { name: 'Lab', data: labAssessments, color: colors.warning }
                  ].filter(group => group.data.length > 0).map((group, idx) => (
                    <Grid item xs={12} key={idx}>
                      <Paper sx={{ p: 3, ...darkThemeStyles.paper, position: 'relative' }}>
                        <Typography variant="h6" sx={{ color: group.color, mb: 2 }}>{group.name} Analytics</Typography>
                        <Grid container spacing={4}>
                          <Grid item xs={12} md={4}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography color={colors.textSecondary}>Median Score</Typography>
                                <Typography fontWeight="bold">{Math.round(calculateMedianScore(group.data))}%</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography color={colors.textSecondary}>Volatility (StdDev)</Typography>
                                <Typography fontWeight="bold">{Math.round(calculateStandardDeviation(group.data))}%</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography color={colors.textSecondary}>Top Score</Typography>
                                <Typography sx={{ color: colors.success }} fontWeight="bold">{calculateHighestScore(group.data)}%</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography color={colors.textSecondary}>Mastery Rate ({'>'}80%)</Typography>
                                <Typography fontWeight="bold">{Math.round(calculatePercentageAboveThreshold(group.data, 80))}%</Typography>
                              </Box>
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={8}>
                            <Box sx={{ height: 200 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={group.data.map(item => ({
                                  date: formatDate(item.submittedAt || item.assessmentDate || item.createdAt),
                                  score: item.percentage || item.overallScore || item.totalScore || 0
                                })).reverse()}>
                                  <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} vertical={false} />
                                  <XAxis dataKey="date" hide />
                                  <YAxis domain={[0, 100]} hide />
                                  <RechartsTooltip contentStyle={{ backgroundColor: '#252525', border: `1px solid ${colors.border}`, borderRadius: '12px' }} />
                                  <Area
                                    type="monotone"
                                    dataKey="score"
                                    stroke={group.color}
                                    fill={group.color}
                                    fillOpacity={0.1}
                                    strokeWidth={2}
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </Box>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Box>
        )
    </>
  );
};
