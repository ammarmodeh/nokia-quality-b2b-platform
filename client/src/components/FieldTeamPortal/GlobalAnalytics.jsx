
import React from 'react';
import { Box, Paper, Typography, Grid, Button, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, TextField, Chip, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Pagination, LinearProgress, Stack, Avatar } from '@mui/material';
import { PieChart as PieChartIcon } from '@mui/icons-material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { PieChart as RechartsPieChart, Pie as RechartsPie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend as RechartsLegend } from 'recharts';

export const GlobalAnalytics = ({
  isMedium, analyticsSubTab, setAnalyticsSubTab, globalAnalytics, handleExportAnalyticsDistributions, timeFilterMode, setTimeFilterMode, recentDaysValue, setRecentDaysValue, selectedWeeks, setSelectedWeeks, weekRanges, selectedMonths, setSelectedMonths, monthOptions, customDateRange, setCustomDateRange, handleAnalyticsDrillDown, offendersPage, setOffendersPage, colors, PieChartIcon, TrendingUpIcon, RechartsPieChart, RechartsPie, Cell, ResponsiveContainer, RechartsTooltip, RechartsLegend, Avatar, Typography, Box, Tabs, Tab, Button, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, FormControl, InputLabel, Select, MenuItem, TextField, Chip, Pagination, LinearProgress, Stack
}) => {
  return (
    <>
                  <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
              <Box sx={{
                display: 'flex',
                flexDirection: isMedium ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMedium ? 'start' : 'center',
                gap: 2,
                mb: 3,
                pb: 1,
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}>
                <Tabs
                  value={analyticsSubTab}
                  onChange={(e, v) => setAnalyticsSubTab(v)}
                  sx={{
                    minHeight: '40px',
                    '& .MuiTab-root': {
                      color: colors.textSecondary,
                      minHeight: '40px',
                      py: 0.5,
                      fontSize: '0.85rem',
                      textTransform: 'none'
                    },
                    '& .Mui-selected': { color: '#fff !important', fontWeight: 'bold' },
                    '& .MuiTabs-indicator': { backgroundColor: '#3b82f6' }
                  }}
                >
                  <Tab label="All Analysis" />
                  <Tab label="Detractors" />
                  <Tab label="Neutrals" />
                </Tabs>

                <Box sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: '20px',
                  bgcolor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                  <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.85rem' }}>
                    <span style={{ color: '#94a3b8' }}>Analyzing:</span> <span style={{ fontWeight: '800', color: '#3b82f6' }}>{globalAnalytics.totalProcessed}</span> <span style={{ color: '#94a3b8' }}>Tasks</span>
                  </Typography>
                </Box>

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FaFileExcel size={13} />}
                  onClick={handleExportAnalyticsDistributions}
                  sx={{
                    borderColor: 'rgba(34, 197, 94, 0.4)',
                    color: '#22c55e',
                    fontSize: '0.75rem',
                    '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.1)', borderColor: '#22c55e' }
                  }}
                >
                  Export Analytics
                </Button>
              </Box>
              <Paper sx={{ p: 2, mb: 3, ...colors.glass, borderRadius: 3 }} elevation={0}>
                <Stack direction={isMedium ? "column" : "row"} spacing={3} alignItems={isMedium ? "start" : "center"}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FilterListIcon sx={{ color: colors.primary }} />
                    <Typography variant="subtitle2" sx={{ color: colors.textSecondary, fontWeight: 700, minWidth: '80px' }}>
                      Time Filter:
                    </Typography>
                  </Box>

                  <ToggleButtonGroup
                    value={timeFilterMode}
                    exclusive
                    onChange={(e, val) => val && setTimeFilterMode(val)}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(0,0,0,0.2)',
                      '& .MuiToggleButton-root': {
                        color: '#94a3b8',
                        borderColor: 'rgba(255,255,255,0.05)',
                        px: 2,
                        py: 0.5,
                        fontSize: '0.75rem',
                        textTransform: 'none',
                        fontWeight: 600,
                        '&.Mui-selected': {
                          bgcolor: 'rgba(139, 92, 246, 0.1)',
                          color: colors.primary,
                          borderColor: 'rgba(139, 92, 246, 0.3)',
                          '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.2)' }
                        }
                      }
                    }}
                  >
                    <ToggleButton value="all" sx={{ gap: 1 }}><CalendarTodayIcon sx={{ fontSize: 16 }} /> All Time</ToggleButton>
                    <ToggleButton value="weeks" sx={{ gap: 1 }}><EventIcon sx={{ fontSize: 16 }} /> Weeks</ToggleButton>
                    <ToggleButton value="months" sx={{ gap: 1 }}><CalendarTodayIcon sx={{ fontSize: 16 }} /> Months</ToggleButton>
                    <ToggleButton value="days" sx={{ gap: 1 }}><UpdateIcon sx={{ fontSize: 16 }} /> Recent Days</ToggleButton>
                    <ToggleButton value="custom" sx={{ gap: 1 }}><FilterListIcon sx={{ fontSize: 16 }} /> Custom</ToggleButton>
                  </ToggleButtonGroup>

                  <Box sx={{ flexGrow: 1, width: '100%' }}>
                    {timeFilterMode === 'days' && (
                      <Stack direction="row" spacing={3} alignItems="center">
                        <Slider
                          value={recentDaysValue}
                          onChange={(e, val) => setRecentDaysValue(val)}
                          min={7}
                          max={365}
                          sx={{ flexGrow: 1, color: colors.primary }}
                          valueLabelDisplay="auto"
                        />
                        <TextField
                          size="small"
                          label="Days"
                          type="number"
                          value={recentDaysValue}
                          onChange={(e) => setRecentDaysValue(Number(e.target.value))}
                          sx={{
                            width: 80,
                            '& .MuiOutlinedInput-root': { color: '#fff', fontSize: '0.8rem' },
                            '& .MuiInputLabel-root': { color: '#94a3b8', fontSize: '0.8rem' }
                          }}
                        />
                      </Stack>
                    )}

                    {timeFilterMode === 'weeks' && (
                      <Autocomplete
                        multiple
                        size="small"
                        options={weekRanges}
                        value={selectedWeeks}
                        onChange={(e, newVal) => setSelectedWeeks(newVal)}
                        renderInput={(params) => (
                          <TextField {...params} label="Select Weeks" variant="outlined" placeholder="Search weeks..." />
                        )}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff', fontSize: '0.8rem',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }
                          },
                          '& .MuiInputLabel-root': { color: '#94a3b8', fontSize: '0.8rem' }
                        }}
                      />
                    )}

                    {timeFilterMode === 'months' && (
                      <Autocomplete
                        multiple
                        size="small"
                        options={monthOptions}
                        getOptionLabel={(option) => option.label}
                        value={monthOptions.filter(m => selectedMonths.includes(m.key))}
                        onChange={(e, newVal) => setSelectedMonths(newVal.map(v => v.key))}
                        renderInput={(params) => (
                          <TextField {...params} label="Select Monthly Periods" variant="outlined" placeholder="Search months..." />
                        )}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff', fontSize: '0.8rem',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }
                          },
                          '& .MuiInputLabel-root': { color: '#94a3b8', fontSize: '0.8rem' }
                        }}
                      />
                    )}

                    {timeFilterMode === 'custom' && (
                      <Stack direction="row" spacing={2}>
                        <TextField
                          size="small"
                          label="Start Date"
                          type="date"
                          value={customDateRange.start}
                          onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                          InputLabelProps={{ shrink: true }}
                          sx={{
                            '& .MuiOutlinedInput-root': { color: '#fff', fontSize: '0.8rem' },
                            '& .MuiInputLabel-root': { color: '#94a3b8', fontSize: '0.8rem' }
                          }}
                        />
                        <TextField
                          size="small"
                          label="End Date"
                          type="date"
                          value={customDateRange.end}
                          onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                          InputLabelProps={{ shrink: true }}
                          sx={{
                            '& .MuiOutlinedInput-root': { color: '#fff', fontSize: '0.8rem' },
                            '& .MuiInputLabel-root': { color: '#94a3b8', fontSize: '0.8rem' }
                          }}
                        />
                      </Stack>
                    )}
                  </Box>

                  <Button
                    size="small"
                    sx={{ color: colors.textSecondary, textTransform: 'none', minWidth: '80px' }}
                  >
                    Reset Filter
                  </Button>
                </Stack>
              </Paper>

              {/* 1. Global Sentiment Segmentation - Deep Dive Port */}
              <Grid container spacing={4} sx={{ mb: 6 }}>
                <Grid item xs={12} md={7}>
                  <Paper sx={{ p: 2.5, ...colors.glass, borderRadius: 4, border: '1px solid rgba(139, 92, 246, 0.2)' }} elevation={0}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 3, height: 20, bgcolor: '#8b5cf6', borderRadius: 4 }} />
                        <Typography variant="h6" fontWeight="800" color="#fff" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.95rem' }}>
                          Sentiment Segmentation <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Deep Analysis</span>
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 3, mt: 0.5 }}>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Total Samples (Target): <span style={{ color: '#8b5cf6', fontWeight: 800 }}>{globalAnalytics.totalSamplesTarget}</span>
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Audited (Low Satisfaction): <span style={{ color: '#ef4444', fontWeight: 800 }}>{globalAnalytics.totalAuditedLowSatisfaction}</span>
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => setChartDialog({ open: true, title: 'Sentiment Analysis', data: globalAnalytics.sentimentData, type: 'pie' })}
                          sx={{ color: '#8b5cf6', bgcolor: 'rgba(139, 92, 246, 0.1)', '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.2)' } }}
                        >
                          <MdInsights size={18} />
                        </IconButton>
                      </Box>
                    </Box>
                    <TableContainer sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, fontSize: '0.75rem' } }}>
                        <TableHead>
                          <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: 'rgba(255,255,255,0.03)', color: '#94a3b8', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)' } }}>
                            <TableCell>Customer Sentiment</TableCell>
                            <TableCell align="right">Hit Count</TableCell>
                            <TableCell align="right">Matrix Share</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {globalAnalytics.sentimentData.map((row) => (
                            <TableRow key={row.name} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                              <TableCell sx={{ color: row.color, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.name}</TableCell>
                              <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.value}</TableCell>
                              <TableCell align="right" sx={{
                                bgcolor: getHeatmapColor(parseFloat(row.percentage), 0, 100, row.name === 'Promoters' ? 'green' : row.name === 'Neutrals' ? 'orange' : 'red'),
                                color: '#fff', fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.05)'
                              }}>
                                {row.percentage}%
                              </TableCell>
                            </TableRow>
                          ))}

                          <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                            <TableCell sx={{ color: '#94a3b8', fontWeight: 800 }}>Total Audited (Low Sat)</TableCell>
                            <TableCell align="right" sx={{ color: '#fff', fontWeight: 900 }}>{globalAnalytics.totalAuditedLowSatisfaction}</TableCell>
                            <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 800 }}>100%</TableCell>
                          </TableRow>

                          <TableRow sx={{ bgcolor: 'rgba(139, 92, 246, 0.05)', borderTop: '1px solid rgba(139, 92, 246, 0.2)' }}>
                            <TableCell sx={{ color: '#8b5cf6', fontWeight: 900 }}>Samples Token (Target)</TableCell>
                            <TableCell align="right" sx={{ color: '#8b5cf6', fontWeight: 900 }}>{globalAnalytics.totalSamplesTarget}</TableCell>
                            <TableCell align="right" sx={{ color: '#8b5cf6', fontWeight: 800 }}>Target</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={5}>
                  <Paper sx={{ p: 2.5, ...colors.glass, borderRadius: 4, border: '1px solid rgba(139, 92, 246, 0.1)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} elevation={0}>
                    <ResponsiveContainer width="100%" height={220}>
                      <RechartsPieChart>
                        <RechartsPie
                          data={globalAnalytics.sentimentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={6}
                          dataKey="value"
                          label={({ name, percentage }) => `${percentage}%`}
                        >
                          {globalAnalytics.sentimentData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </RechartsPie>
                        <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }} />
                        <RechartsLegend verticalAlign="bottom" height={30} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
              </Grid>

              {/* Analytical Matrices removed */}


              <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Divider sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                <Typography variant="h6" sx={{ color: '#3b82f6', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>Advanced Analytics Charts & Tables</Typography>
                <Divider sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
              </Box>

              {/* Advanced Analytics Charts & Tables */}
              <Grid container spacing={3}>
                {/* Owner Analysis */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, ...colors.glass, borderRadius: 3, border: '1px solid rgba(59, 130, 246, 0.2)' }} elevation={0}>
                    <Typography variant="h6" fontWeight="700" mb={3} color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SupportAgent sx={{ color: '#3b82f6' }} /> Owner Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={280}>
                      <RechartsBarChart data={globalAnalytics.ownerData}>
                        <defs>
                          <linearGradient id="ownerGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                        <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                        <RechartsTooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <Paper sx={{ p: 1.5, bgcolor: '#1e293b', border: '1px solid #334155', borderRadius: 2, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
                                  <Typography sx={{ color: '#fff', fontWeight: 'bold', fontSize: '0.8rem', mb: 0.5 }}>{label}</Typography>
                                  <Typography sx={{ color: '#3b82f6', fontSize: '0.75rem' }}>Count: <strong>{payload[0].value}</strong></Typography>
                                  <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>Contribution: {payload[0].payload.percentage}%</Typography>
                                </Paper>
                              );
                            }
                            return null;
                          }}
                        />
                        <RechartsBar dataKey="value" fill="url(#ownerGradient)" radius={[6, 6, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                    {/* Detailed Owner Table - Compact Style */}
                    <TableContainer sx={{ mt: 2, maxHeight: 200, overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' } }}>
                      <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Owner</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Points</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Total</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>ITN</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Sub</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>%</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {globalAnalytics.detailedOwners.map((data) => (
                            <TableRow key={data.name} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                              <TableCell sx={{ color: '#e2e8f0' }}>{data.name}</TableCell>
                              <TableCell align="right" sx={{ color: '#10b981', fontWeight: 'bold' }}>{data.points}</TableCell>
                              <TableCell
                                align="right"
                                onClick={() => handleAnalyticsDrillDown({ owner: data.name })}
                                sx={{
                                  color: '#e2e8f0',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }
                                }}
                              >
                                {data.total}
                              </TableCell>
                              <TableCell
                                align="right"
                                onClick={() => data.itn > 0 && handleAnalyticsDrillDown({ owner: data.name, itn: true })}
                                sx={{
                                  color: data.itn > 0 ? '#f59e0b' : '#64748b',
                                  cursor: data.itn > 0 ? 'pointer' : 'default',
                                  '&:hover': data.itn > 0 ? { bgcolor: 'rgba(245, 158, 11, 0.2)' } : {}
                                }}
                              >
                                {data.itn}
                              </TableCell>
                              <TableCell
                                align="right"
                                onClick={() => data.subscription > 0 && handleAnalyticsDrillDown({ owner: data.name, subscription: true })}
                                sx={{
                                  color: data.subscription > 0 ? '#10b981' : '#64748b',
                                  cursor: data.subscription > 0 ? 'pointer' : 'default',
                                  '&:hover': data.subscription > 0 ? { bgcolor: 'rgba(16, 185, 129, 0.2)' } : {}
                                }}
                              >
                                {data.subscription}
                              </TableCell>
                              <TableCell align="right" sx={{ color: '#94a3b8' }}>{data.percentage}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                  </Paper>
                </Grid>

                {/* Reason Breakdown */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, ...colors.glass, borderRadius: 3, border: '1px solid rgba(16, 185, 129, 0.2)' }} elevation={0}>
                    <Typography variant="h6" fontWeight="700" mb={3} color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PriorityHigh sx={{ color: '#10b981' }} /> Reason Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={280}>
                      <RechartsPieChart>
                        <RechartsPie
                          data={globalAnalytics.reasonData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {globalAnalytics.reasonData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'][index % 8]} />
                          ))}
                        </RechartsPie>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <Paper sx={{ p: 1.5, bgcolor: '#1e293b', border: '1px solid #334155', borderRadius: 2 }}>
                                  <Typography sx={{ color: '#fff', fontWeight: 'bold', fontSize: '0.8rem', mb: 0.5 }}>{payload[0].name}</Typography>
                                  <Typography sx={{ color: payload[0].payload.fill, fontSize: '0.75rem' }}>Count: <strong>{payload[0].value}</strong></Typography>
                                  <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>Weight: {payload[0].payload.percentage}%</Typography>
                                </Paper>
                              );
                            }
                            return null;
                          }}
                        />
                        <RechartsLegend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.7rem', color: '#94a3b8' }} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    {/* Detailed Reason Table - Compact Style */}
                    <TableContainer sx={{ mt: 2, maxHeight: 200, overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' } }}>
                      <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Reason</TableCell>
                            {globalAnalytics.matrixOwners.map(owner => (
                              <TableCell key={owner} align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold', fontSize: '0.65rem' }}>{owner}</TableCell>
                            ))}
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>ITN</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Sub</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Total</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>%</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {globalAnalytics.detailedReasons.slice(0, 15).map((data) => {
                            const rowTotal = Object.values(data.ownerBreakdown).reduce((sum, count) => sum + count, 0);
                            return (
                              <TableRow key={data.name} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                <TableCell
                                  onClick={() => handleAnalyticsDrillDown({ reason: data.name })}
                                  sx={{ color: '#e2e8f0', cursor: 'pointer', '&:hover': { color: '#3b82f6' } }}
                                >
                                  {data.name}
                                </TableCell>
                                {globalAnalytics.matrixOwners.map(owner => {
                                  const count = data.ownerBreakdown[owner] || 0;
                                  const pct = rowTotal > 0 ? ((count / rowTotal) * 100).toFixed(0) : 0;
                                  return (
                                    <TableCell
                                      key={owner}
                                      align="right"
                                      onClick={() => count > 0 && handleAnalyticsDrillDown({ reason: data.name, owner })}
                                      sx={{
                                        color: count > 0 ? '#e2e8f0' : 'rgba(255,255,255,0.1)',
                                        fontWeight: count > 0 ? 'bold' : 'normal',
                                        cursor: count > 0 ? 'pointer' : 'default',
                                        '&:hover': count > 0 ? { bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' } : {}
                                      }}
                                    >
                                      {count}
                                      {count > 0 && <span style={{ fontSize: '0.6rem', color: '#64748b', marginLeft: 4 }}>({pct}%)</span>}
                                    </TableCell>
                                  );
                                })}
                                <TableCell
                                  align="right"
                                  onClick={() => data.itn > 0 && handleAnalyticsDrillDown({ reason: data.name, itn: true })}
                                  sx={{
                                    color: data.itn > 0 ? '#f59e0b' : '#64748b',
                                    cursor: data.itn > 0 ? 'pointer' : 'default',
                                    '&:hover': data.itn > 0 ? { bgcolor: 'rgba(245, 158, 11, 0.2)' } : {}
                                  }}
                                >
                                  {data.itn}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  onClick={() => data.subscription > 0 && handleAnalyticsDrillDown({ reason: data.name, subscription: true })}
                                  sx={{
                                    color: data.subscription > 0 ? '#10b981' : '#64748b',
                                    cursor: data.subscription > 0 ? 'pointer' : 'default',
                                    '&:hover': data.subscription > 0 ? { bgcolor: 'rgba(16, 185, 129, 0.2)' } : {}
                                  }}
                                >
                                  {data.subscription}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  onClick={() => handleAnalyticsDrillDown({ reason: data.name })}
                                  sx={{ color: '#e2e8f0', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                  {data.total}
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#94a3b8' }}>{data.percentage}%</TableCell>
                              </TableRow>
                            );
                          })}
                          {/* Total Row */}
                          <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                            <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>TOTAL</TableCell>
                            {globalAnalytics.matrixOwners.map(owner => {
                              const totalForOwner = Object.values(globalAnalytics.detailedReasons).reduce((sum, data) => sum + (data.ownerBreakdown[owner] || 0), 0);
                              return (
                                <TableCell key={owner} align="right" sx={{ color: '#3b82f6', fontWeight: 'bold' }}>{totalForOwner}</TableCell>
                              );
                            })}
                            <TableCell align="right" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedReasons).reduce((sum, data) => sum + data.itn, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedReasons).reduce((sum, data) => sum + data.subscription, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedReasons).reduce((sum, data) => sum + data.total, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 'bold' }}>100%</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>

                  </Paper>
                </Grid>

                {/* Sub-reason Analysis */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, ...colors.glass, borderRadius: 3, border: '1px solid rgba(245, 158, 11, 0.2)' }} elevation={0}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6" fontWeight="700" color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assignment sx={{ color: '#f59e0b' }} /> Sub-Reason Breakdown
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setChartDialog({ open: true, title: 'Sub-Reason Analysis', data: globalAnalytics.subReasonData, type: 'bar' })}
                        sx={{ color: '#f59e0b', bgcolor: 'rgba(245, 158, 11, 0.1)' }}
                      >
                        <MdInsights size={20} />
                      </IconButton>
                    </Box>
                    <ResponsiveContainer width="100%" height={280}>
                      <RechartsBarChart data={globalAnalytics.subReasonData}>
                        <defs>
                          <linearGradient id="subReasonGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                        <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                        <RechartsTooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <Paper sx={{ p: 1.5, bgcolor: '#1e293b', border: '1px solid #334155', borderRadius: 2 }}>
                                  <Typography sx={{ color: '#fff', fontWeight: 'bold', fontSize: '0.8rem', mb: 0.5 }}>{label}</Typography>
                                  <Typography sx={{ color: '#f59e0b', fontSize: '0.75rem' }}>Count: <strong>{payload[0].value}</strong></Typography>
                                  <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>Contribution: {payload[0].payload.percentage}%</Typography>
                                </Paper>
                              );
                            }
                            return null;
                          }}
                        />
                        <RechartsBar dataKey="value" fill="url(#subReasonGradient)" radius={[6, 6, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                    {/* Detailed Sub-Reason Table - Compact Style */}
                    <TableContainer sx={{ mt: 2, maxHeight: 200, overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' } }}>
                      <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Sub-Reason</TableCell>
                            {globalAnalytics.matrixOwners.map(owner => (
                              <TableCell key={owner} align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold', fontSize: '0.65rem' }}>{owner}</TableCell>
                            ))}
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold', fontSize: '0.65rem' }}>Other</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>ITN</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Sub</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Total</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>%</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {globalAnalytics.detailedSubReasons.slice(0, 15).map((data) => {
                            const rowTotal = Object.values(data.ownerBreakdown).reduce((sum, count) => sum + count, 0);
                            return (
                              <TableRow key={data.name} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                <TableCell
                                  onClick={() => handleAnalyticsDrillDown({ subReason: data.name })}
                                  sx={{ color: '#e2e8f0', cursor: 'pointer', '&:hover': { color: '#3b82f6' } }}
                                >
                                  {data.name}
                                </TableCell>
                                {globalAnalytics.matrixOwners.map(owner => {
                                  const count = data.ownerBreakdown[owner] || 0;
                                  const pct = rowTotal > 0 ? ((count / rowTotal) * 100).toFixed(0) : 0;
                                  return (
                                    <TableCell
                                      key={owner}
                                      align="right"
                                      onClick={() => count > 0 && handleAnalyticsDrillDown({ subReason: data.name, owner })}
                                      sx={{
                                        color: count > 0 ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                                        fontWeight: count > 0 ? 'bold' : 'normal',
                                        cursor: count > 0 ? 'pointer' : 'default',
                                        '&:hover': count > 0 ? { bgcolor: 'rgba(245, 158, 11, 0.2)', color: '#fff' } : {}
                                      }}
                                    >
                                      {count}
                                      {count > 0 && <span style={{ fontSize: '0.6rem', color: '#64748b', marginLeft: 4 }}>({pct}%)</span>}
                                    </TableCell>
                                  );
                                })}
                                <TableCell
                                  align="right"
                                  onClick={() => data.itn > 0 && handleAnalyticsDrillDown({ subReason: data.name, itn: true })}
                                  sx={{
                                    color: data.itn > 0 ? '#f59e0b' : '#64748b',
                                    cursor: data.itn > 0 ? 'pointer' : 'default',
                                    '&:hover': data.itn > 0 ? { bgcolor: 'rgba(245, 158, 11, 0.2)' } : {}
                                  }}
                                >
                                  {data.itn}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  onClick={() => data.subscription > 0 && handleAnalyticsDrillDown({ subReason: data.name, subscription: true })}
                                  sx={{
                                    color: data.subscription > 0 ? '#10b981' : '#64748b',
                                    cursor: data.subscription > 0 ? 'pointer' : 'default',
                                    '&:hover': data.subscription > 0 ? { bgcolor: 'rgba(16, 185, 129, 0.2)' } : {}
                                  }}
                                >
                                  {data.subscription}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  onClick={() => handleAnalyticsDrillDown({ subReason: data.name })}
                                  sx={{ color: '#e2e8f0', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                  {data.total}
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#94a3b8' }}>{data.percentage}%</TableCell>
                              </TableRow>
                            );
                          })}
                          {/* Total Row */}
                          <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                            <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>TOTAL</TableCell>
                            {globalAnalytics.matrixOwners.map(owner => {
                              const totalForOwner = Object.values(globalAnalytics.detailedSubReasons).reduce((sum, data) => sum + (data.ownerBreakdown[owner] || 0), 0);
                              return (
                                <TableCell key={owner} align="right" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>{totalForOwner}</TableCell>
                              );
                            })}
                            <TableCell align="right" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedSubReasons).reduce((sum, data) => sum + data.itn, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedSubReasons).reduce((sum, data) => sum + data.subscription, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedSubReasons).reduce((sum, data) => sum + data.total, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 'bold' }}>100%</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>

                  </Paper>
                </Grid>

                {/* Root Cause Analysis */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, ...colors.glass, borderRadius: 3, border: '1px solid rgba(139, 92, 246, 0.2)' }} elevation={0}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6" fontWeight="700" color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SearchIcon sx={{ color: '#8b5cf6' }} /> Root Cause Matrix
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setChartDialog({ open: true, title: 'Root Cause Analysis', data: globalAnalytics.rootCauseData, type: 'area' })}
                        sx={{ color: '#8b5cf6', bgcolor: 'rgba(139, 92, 246, 0.1)' }}
                      >
                        <MdInsights size={20} />
                      </IconButton>
                    </Box>
                    <ResponsiveContainer width="100%" height={280}>
                      <RechartsBarChart data={globalAnalytics.rootCauseData}>
                        <defs>
                          <linearGradient id="rootCauseGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                        <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                        <RechartsTooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <Paper sx={{ p: 1.5, bgcolor: '#1e293b', border: '1px solid #334155', borderRadius: 2 }}>
                                  <Typography sx={{ color: '#fff', fontWeight: 'bold', fontSize: '0.8rem', mb: 0.5 }}>{label}</Typography>
                                  <Typography sx={{ color: '#8b5cf6', fontSize: '0.75rem' }}>Count: <strong>{payload[0].value}</strong></Typography>
                                  <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>Contribution: {payload[0].payload.percentage}%</Typography>
                                </Paper>
                              );
                            }
                            return null;
                          }}
                        />
                        <RechartsBar dataKey="value" fill="url(#rootCauseGradient)" radius={[6, 6, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                    {/* Detailed Root Cause Table - Compact Style */}
                    <TableContainer sx={{ mt: 2, maxHeight: 200, overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' } }}>
                      <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Root Cause</TableCell>
                            {globalAnalytics.matrixOwners.map(owner => (
                              <TableCell key={owner} align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold', fontSize: '0.65rem' }}>{owner}</TableCell>
                            ))}
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>ITN</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Sub</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Total</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>%</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {globalAnalytics.detailedRootCauses.slice(0, 15).map((data) => {
                            const rowTotal = Object.values(data.ownerBreakdown).reduce((sum, count) => sum + count, 0);
                            return (
                              <TableRow key={data.name} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                <TableCell
                                  onClick={() => handleAnalyticsDrillDown({ rootCause: data.name })}
                                  sx={{ color: '#e2e8f0', cursor: 'pointer', '&:hover': { color: '#3b82f6' } }}
                                >
                                  {data.name}
                                </TableCell>
                                {globalAnalytics.matrixOwners.map(owner => {
                                  const count = data.ownerBreakdown[owner] || 0;
                                  const pct = rowTotal > 0 ? ((count / rowTotal) * 100).toFixed(0) : 0;
                                  return (
                                    <TableCell
                                      key={owner}
                                      align="right"
                                      onClick={() => count > 0 && handleAnalyticsDrillDown({ rootCause: data.name, owner })}
                                      sx={{
                                        color: count > 0 ? '#e2e8f0' : 'rgba(255,255,255,0.1)',
                                        fontWeight: count > 0 ? 'bold' : 'normal',
                                        cursor: count > 0 ? 'pointer' : 'default',
                                        '&:hover': count > 0 ? { bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' } : {}
                                      }}
                                    >
                                      {count}
                                      {count > 0 && <span style={{ fontSize: '0.6rem', color: '#64748b', marginLeft: 4 }}>({pct}%)</span>}
                                    </TableCell>
                                  );
                                })}
                                <TableCell
                                  align="right"
                                  onClick={() => data.itn > 0 && handleAnalyticsDrillDown({ rootCause: data.name, itn: true })}
                                  sx={{
                                    color: data.itn > 0 ? '#f59e0b' : '#64748b',
                                    cursor: data.itn > 0 ? 'pointer' : 'default',
                                    '&:hover': data.itn > 0 ? { bgcolor: 'rgba(245, 158, 11, 0.2)' } : {}
                                  }}
                                >
                                  {data.itn}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  onClick={() => data.subscription > 0 && handleAnalyticsDrillDown({ rootCause: data.name, subscription: true })}
                                  sx={{
                                    color: data.subscription > 0 ? '#10b981' : '#64748b',
                                    cursor: data.subscription > 0 ? 'pointer' : 'default',
                                    '&:hover': data.subscription > 0 ? { bgcolor: 'rgba(16, 185, 129, 0.2)' } : {}
                                  }}
                                >
                                  {data.subscription}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  onClick={() => handleAnalyticsDrillDown({ rootCause: data.name })}
                                  sx={{ color: '#e2e8f0', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                  {data.total}
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#94a3b8' }}>{data.percentage}%</TableCell>
                              </TableRow>
                            );
                          })}
                          {/* Total Row */}
                          <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                            <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>TOTAL</TableCell>
                            {globalAnalytics.matrixOwners.map(owner => {
                              const totalForOwner = Object.values(globalAnalytics.detailedRootCauses).reduce((sum, data) => sum + (data.ownerBreakdown[owner] || 0), 0);
                              return (
                                <TableCell key={owner} align="right" sx={{ color: '#8b5cf6', fontWeight: 'bold' }}>{totalForOwner}</TableCell>
                              );
                            })}
                            <TableCell align="right" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedRootCauses).reduce((sum, data) => sum + data.itn, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedRootCauses).reduce((sum, data) => sum + data.subscription, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedRootCauses).reduce((sum, data) => sum + data.total, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 'bold' }}>100%</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>

                  </Paper>
                </Grid>
              </Grid>

              {/* Field Team Analysis Section using Blue Theme */}
              <Box sx={{ mt: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" fontWeight="700" color="#3b82f6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Field Team Offenders Analysis
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<FaFileExcel />}
                    onClick={handleExportAllTeamsViolations}
                    sx={{ borderColor: '#10b981', color: '#10b981', '&:hover': { borderColor: '#059669', bgcolor: 'rgba(16, 185, 129, 0.1)' } }}
                  >
                    Export All Teams Detailed Report
                  </Button>
                </Box>

                {globalAnalytics.fieldTeamAnalytics && globalAnalytics.fieldTeamAnalytics.length > 0 ? (
                  <Grid container spacing={2}>
                    {globalAnalytics.fieldTeamAnalytics
                      .slice((offendersPage - 1) * 10, offendersPage * 10)
                      .map((team, idx) => (
                        <Grid item xs={12} key={idx}>
                          <Paper sx={{
                            p: 2,
                            ...colors.glass,
                            borderRadius: 2,
                            border: '2px solid rgba(59, 130, 246, 0.3)',
                            '&:hover': { borderColor: 'rgba(59, 130, 246, 0.6)' }
                          }} elevation={0}>
                            {/* Team Header */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Box>
                                <Typography variant="h6" fontWeight="700" color="#fff">
                                  #{(offendersPage - 1) * 10 + idx + 1} {team.teamName}
                                </Typography>
                                <Typography variant="body2" color="#b3b3b3">
                                  Total Issues: <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{team.totalIssues}</span>
                                </Typography>
                              </Box>
                              <Button
                                size="small"
                                startIcon={<FaFileExcel />}
                                onClick={() => handleExportTeamViolations(team)}
                                sx={{ color: '#94a3b8', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                              >
                                Export
                              </Button>
                            </Box>

                            {/* Analysis Grid */}
                            <Grid container spacing={4}>
                              {/* Left Column: People & Reasons */}
                              <Grid item xs={12} md={4}>
                                <Stack spacing={3}>
                                  <Box>
                                    <Typography variant="subtitle2" fontWeight="700" mb={1.5} color="#3b82f6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <SupportAgent sx={{ fontSize: 18 }} /> Responsible Owners
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 300, overflowY: 'auto', pr: 1 }}>
                                      {team.owners.map((owner, i) => (
                                        <Box key={i} sx={{ position: 'relative' }}>
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, px: 1 }}>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#e2e8f0' }}>{owner.name}</Typography>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'bold' }}>{owner.value}</Typography>
                                          </Box>
                                          <LinearProgress
                                            variant="determinate"
                                            value={(owner.value / team.totalIssues) * 100}
                                            sx={{
                                              height: 4,
                                              borderRadius: 2,
                                              bgcolor: 'rgba(59, 130, 246, 0.1)',
                                              '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6' }
                                            }}
                                          />
                                        </Box>
                                      ))}
                                    </Box>
                                  </Box>
                                  <Box>
                                    <Typography variant="subtitle2" fontWeight="700" mb={1.5} color="#f59e0b" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <PriorityHigh sx={{ fontSize: 18 }} /> Issue Reasons
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 300, overflowY: 'auto', pr: 1 }}>
                                      {team.reasons.map((reason, i) => (
                                        <Box key={i}>
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, px: 1 }}>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#e2e8f0' }}>{reason.name}</Typography>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 'bold' }}>{reason.value}</Typography>
                                          </Box>
                                          <LinearProgress
                                            variant="determinate"
                                            value={(reason.value / team.totalIssues) * 100}
                                            sx={{
                                              height: 4,
                                              borderRadius: 2,
                                              bgcolor: 'rgba(245, 158, 11, 0.1)',
                                              '& .MuiLinearProgress-bar': { bgcolor: '#f59e0b' }
                                            }}
                                          />
                                        </Box>
                                      ))}
                                    </Box>
                                  </Box>
                                </Stack>
                              </Grid>

                              {/* Middle Column: Root Causes & Sub-reasons */}
                              <Grid item xs={12} md={4}>
                                <Stack spacing={3}>
                                  <Box>
                                    <Typography variant="subtitle2" fontWeight="700" mb={1.5} color="#10b981" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <SearchIcon sx={{ fontSize: 18 }} /> Root Cause Distribution
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 300, overflowY: 'auto', pr: 1 }}>
                                      {team.rootCauses.map((rc, i) => (
                                        <Box key={i}>
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, px: 1 }}>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#e2e8f0' }}>{rc.name}</Typography>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>{rc.value}</Typography>
                                          </Box>
                                          <LinearProgress
                                            variant="determinate"
                                            value={(rc.value / team.totalIssues) * 100}
                                            sx={{
                                              height: 4,
                                              borderRadius: 2,
                                              bgcolor: 'rgba(16, 185, 129, 0.1)',
                                              '& .MuiLinearProgress-bar': { bgcolor: '#10b981' }
                                            }}
                                          />
                                        </Box>
                                      ))}
                                    </Box>
                                  </Box>
                                  <Box>
                                    <Typography variant="subtitle2" fontWeight="700" mb={1.5} color="#8b5cf6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Assignment sx={{ fontSize: 18 }} /> Sub-Reason Analysis
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 300, overflowY: 'auto', pr: 1 }}>
                                      {team.subReasons.map((sr, i) => (
                                        <Box key={i}>
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, px: 1 }}>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#e2e8f0' }}>{sr.name}</Typography>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 'bold' }}>{sr.value}</Typography>
                                          </Box>
                                          <LinearProgress
                                            variant="determinate"
                                            value={(sr.value / team.totalIssues) * 100}
                                            sx={{
                                              height: 4,
                                              borderRadius: 2,
                                              bgcolor: 'rgba(139, 92, 246, 0.1)',
                                              '& .MuiLinearProgress-bar': { bgcolor: '#8b5cf6' }
                                            }}
                                          />
                                        </Box>
                                      ))}
                                    </Box>
                                  </Box>
                                </Stack>
                              </Grid>

                              {/* Right Column: NPS Satisfaction */}
                              <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2" fontWeight="700" mb={2} color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <TrendingUp sx={{ fontSize: 18 }} /> Customer Satisfaction (NPS)
                                </Typography>
                                <Paper sx={{
                                  p: 2,
                                  bgcolor: 'rgba(15, 23, 42, 0.6)',
                                  borderRadius: 3,
                                  border: '1px solid rgba(255,255,255,0.05)',
                                  height: '240px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center'
                                }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <RechartsBarChart data={team.npsBreakdown} layout="vertical" margin={{ left: 20 }}>
                                      <XAxis type="number" hide />
                                      <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={80}
                                        stroke="#94a3b8"
                                        fontSize={11}
                                        fontWeight={600}
                                      />
                                      <RechartsTooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                                        itemStyle={{ color: '#fff', fontSize: '0.8rem' }}
                                      />
                                      <RechartsBar dataKey="value" radius={[0, 6, 6, 0]} barSize={32}>
                                        {team.npsBreakdown.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                      </RechartsBar>
                                    </RechartsBarChart>
                                  </ResponsiveContainer>
                                  <Box sx={{ mt: 1, px: 1, display: 'flex', justifyContent: 'space-around' }}>
                                    {team.npsBreakdown.map((entry, i) => (
                                      <Stack key={i} direction="row" spacing={1} alignItems="center">
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color }} />
                                        <Typography sx={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                          {entry.name}: <strong>{entry.value}</strong>
                                        </Typography>
                                      </Stack>
                                    ))}
                                  </Box>
                                </Paper>
                              </Grid>
                            </Grid>
                          </Paper>
                        </Grid>
                      ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="#b3b3b3" textAlign="center" py={4}>
                    No field team data available
                  </Typography>
                )}

                {/* Pagination Controls */}
                {globalAnalytics.fieldTeamAnalytics && globalAnalytics.fieldTeamAnalytics.length > 10 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
                    <Pagination
                      count={Math.ceil(globalAnalytics.fieldTeamAnalytics.length / 10)}
                      page={offendersPage}
                      onChange={(e, v) => setOffendersPage(v)}
                      color="primary"
                      sx={{
                        '& .MuiPaginationItem-root': { color: '#fff' },
                        '& .Mui-selected': { bgcolor: 'rgba(59, 130, 246, 0.3) !important' }
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Box>
    </>
  );
};
