
import React from 'react';
import { Box, Paper, TextField, IconButton, FormControl, Select, MenuItem, Button, Grid, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip, Tooltip as MuiTooltip, TablePagination } from '@mui/material';
import { Search as SearchIcon, FilterList as FilterListIcon, TableChart as TableChartIcon } from '@mui/icons-material';
import { FaTimes, FaFilter, FaFileExcel } from 'react-icons/fa';

export const GlobalLeaderboard = ({
  leaderboardSearchQuery, setLeaderboardSearchQuery,
  leaderboardStatusQuery, setLeaderboardStatusQuery,
  advancedFiltersOpen, setAdvancedFiltersOpen,
  leaderboardDateFilter, setLeaderboardDateFilter,
  leaderboardThresholds, setLeaderboardThresholds,
  leaderboardPage, setLeaderboardPage,
  leaderboardSort, setLeaderboardSort,
  leaderboardRowsPerPage, setLeaderboardRowsPerPage,
  paginatedLeaderboardData, leaderboardDataLength,
  colors, handleExportLeaderboard, handleTeamSelect, handleDrillDown
}) => {
  return (
    <>
                  <>
              {/* Magic Table Controls: Advanced Search & Filter */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'stretch', mb: 2 }}>
                  <Paper sx={{
                    p: 2,
                    flex: 1,
                    minWidth: '300px',
                    ...colors.glass,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <SearchIcon sx={{ color: colors.primary, mr: 2, fontSize: '1.2rem' }} />
                    <TextField
                      placeholder="Search by Team Name, Company, or Region..."
                      variant="standard"
                      fullWidth
                      value={leaderboardSearchQuery}
                      onChange={(e) => {
                        setLeaderboardSearchQuery(e.target.value);
                        setLeaderboardPage(0); // Reset to first page on search
                      }}
                      InputProps={{
                        disableUnderline: true,
                        sx: { color: '#fff', fontSize: '1rem', fontWeight: 300, letterSpacing: '0.5px' }
                      }}
                    />
                    {leaderboardSearchQuery && (
                      <IconButton size="small" onClick={() => setLeaderboardSearchQuery('')} sx={{ color: colors.textSecondary }}>
                        <FaTimes />
                      </IconButton>
                    )}
                  </Paper>

                  <FormControl sx={{ minWidth: 200, ...colors.glass, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Select
                      value={leaderboardStatusQuery}
                      onChange={(e) => {
                        setLeaderboardStatusQuery(e.target.value);
                        setLeaderboardPage(0);
                      }}
                      displayEmpty
                      variant="standard"
                      disableUnderline
                      sx={{
                        height: '100%',
                        px: 2,
                        color: '#fff',
                        fontWeight: 300,
                        '& .MuiSelect-select': { py: 1.5 }
                      }}
                    >
                      <MenuItem value="all">All Rankings</MenuItem>
                      <MenuItem value="detractors">Has Detractors</MenuItem>
                      <MenuItem value="issues">Has Key Issues</MenuItem>
                      <MenuItem value="open">Has Open Cases</MenuItem>
                    </Select>
                  </FormControl>

                  <Button
                    variant="outlined"
                    startIcon={<FaFilter />}
                    onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
                    sx={{
                      borderRadius: '16px',
                      color: advancedFiltersOpen ? colors.primary : colors.textSecondary,
                      borderColor: advancedFiltersOpen ? colors.primary : 'rgba(255,255,255,0.1)',
                      background: advancedFiltersOpen ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                      textTransform: 'none',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: colors.primary, background: 'rgba(139, 92, 246, 0.1)' }
                    }}
                  >
                    Advanced
                  </Button>

                  <Button
                    variant="contained"
                    startIcon={<TableChartIcon />}
                    onClick={handleExportLeaderboard}
                    sx={{
                      borderRadius: '16px',
                      px: 3,
                      background: colors.primaryGradient,
                      textTransform: 'none',
                      fontWeight: 700,
                      boxShadow: `0 8px 20px ${colors.primary}40`,
                      '&:hover': { transform: 'translateY(-2px)', filter: 'brightness(1.1)' },
                      transition: 'all 0.2s'
                    }}
                  >
                    Export Ranking
                  </Button>
                </Box>

                {advancedFiltersOpen && (
                  <Box sx={{
                    p: 3,
                    mb: 3,
                    ...colors.glass,
                    borderRadius: '20px',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    animation: 'slideDown 0.3s ease-out'
                  }}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 900, mb: 1, display: 'block' }}>START DATE</Typography>
                        <TextField
                          type="date"
                          fullWidth
                          variant="standard"
                          InputProps={{ disableUnderline: true, sx: { color: '#fff', fontWeight: 300 } }}
                          value={leaderboardDateFilter.start}
                          onChange={(e) => {
                            setLeaderboardDateFilter({ ...leaderboardDateFilter, start: e.target.value });
                            setLeaderboardPage(0);
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 900, mb: 1, display: 'block' }}>END DATE</Typography>
                        <TextField
                          type="date"
                          fullWidth
                          variant="standard"
                          InputProps={{ disableUnderline: true, sx: { color: '#fff', fontWeight: 300 } }}
                          value={leaderboardDateFilter.end}
                          onChange={(e) => {
                            setLeaderboardDateFilter({ ...leaderboardDateFilter, end: e.target.value });
                            setLeaderboardPage(0);
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 900, mb: 1, display: 'block' }}>MIN ISSUES</Typography>
                        <TextField
                          placeholder="e.g. 5"
                          type="number"
                          fullWidth
                          variant="standard"
                          InputProps={{ disableUnderline: true, sx: { color: '#fff', fontWeight: 300 } }}
                          value={leaderboardThresholds.minIssues}
                          onChange={(e) => {
                            setLeaderboardThresholds({ ...leaderboardThresholds, minIssues: e.target.value });
                            setLeaderboardPage(0);
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 900, mb: 1, display: 'block' }}>MIN SUCCESS %</Typography>
                        <TextField
                          placeholder="e.g. 80"
                          type="number"
                          fullWidth
                          variant="standard"
                          InputProps={{ disableUnderline: true, sx: { color: '#fff', fontWeight: 300 } }}
                          value={leaderboardThresholds.minSuccessRate}
                          onChange={(e) => {
                            setLeaderboardThresholds({ ...leaderboardThresholds, minSuccessRate: e.target.value });
                            setLeaderboardPage(0);
                          }}
                        />
                      </Grid>
                    </Grid>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        sx={{ color: colors.error, fontWeight: 700 }}
                        onClick={() => {
                          setLeaderboardDateFilter({ start: '', end: '' });
                          setLeaderboardThresholds({ minIssues: '', minSuccessRate: '' });
                        }}
                      >
                        Clear All Filters
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>

              <TableContainer component={Paper} sx={{
                ...colors.glass,
                borderRadius: '24px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                    <TableRow>
                      <TableCell sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>RANK</TableCell>
                      <TableCell sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'teamName', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>TEAM NAME</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>STATUS</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'totalNpsTickets', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>TOTAL NPS</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'npsDetractors', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>DETRACTORS</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'npsNeutrals', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>NEUTRALS</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'issueViolations', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>KEY ISSUES</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'openCount', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>OPEN CASES</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'avgResolutionTime', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>AVG SPEED</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'resPercent', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>SUCCESS %</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'totalPoints', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>TOTAL POINTS</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'totalViolations', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>TOTAL VIOLATIONS</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>ACTIONS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedLeaderboardData.map((team, index) => {
                      const actualRank = (leaderboardPage * leaderboardRowsPerPage) + index + 1;
                      return (
                        <TableRow
                          key={team._id}
                          sx={{
                            bgcolor: 'transparent',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                            transition: 'background 0.2s'
                          }}
                        >
                          <TableCell sx={{ color: colors.textSecondary, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', py: 1 }}>
                            <Box sx={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: index + (leaderboardPage * leaderboardRowsPerPage) === 0 ? 'rgba(245, 158, 11, 0.2)' : index + (leaderboardPage * leaderboardRowsPerPage) === 1 ? 'rgba(209, 213, 219, 0.2)' : index + (leaderboardPage * leaderboardRowsPerPage) === 2 ? 'rgba(180, 83, 9, 0.2)' : 'rgba(255,255,255,0.05)',
                              color: index + (leaderboardPage * leaderboardRowsPerPage) === 0 ? '#f59e0b' : index + (leaderboardPage * leaderboardRowsPerPage) === 1 ? '#d1d5db' : index + (leaderboardPage * leaderboardRowsPerPage) === 2 ? '#b45309' : colors.textSecondary,
                              fontWeight: 800,
                              fontSize: '0.75rem'
                            }}>
                              {actualRank}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1 }}>
                            <Box sx={{ cursor: 'pointer' }} onClick={() => handleTeamSelect(team)}>
                              <Typography sx={{ color: '#fff', fontWeight: 300, fontSize: '0.85rem' }}>{team.teamName}</Typography>
                              <Typography variant="caption" sx={{ color: colors.textSecondary, fontSize: '0.7rem' }}>{team.teamCompany} | {team.governorate}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1 }}>
                            {(() => {
                              let label = 'Active';
                              let bg = 'rgba(16, 185, 129, 0.15)';
                              let color = '#10b981';
                              if (team.isTerminated) { label = 'Terminated'; bg = 'rgba(239, 68, 68, 0.15)'; color = '#ef4444'; }
                              else if (team.isResigned) { label = 'Resigned'; bg = 'rgba(249, 115, 22, 0.15)'; color = '#f97316'; }
                              else if (team.isSuspended) { label = 'Suspended'; bg = 'rgba(245, 158, 11, 0.15)'; color = '#f59e0b'; }
                              else if (team.isOnLeave) { label = 'On Leave'; bg = 'rgba(99, 102, 241, 0.15)'; color = '#6366f1'; }
                              return (
                                <Chip
                                  label={label}
                                  size="small"
                                  sx={{
                                    background: bg,
                                    color: color,
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    height: '20px',
                                    fontSize: '0.68rem',
                                    border: `1px solid ${color}40`,
                                    letterSpacing: '0.3px'
                                  }}
                                />
                              );
                            })()}
                          </TableCell>
                          <TableCell align="center" sx={{ color: colors.info, fontWeight: 300, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>{team.totalNpsTickets}</TableCell>
                          <TableCell align="center" onClick={() => handleDrillDown(team, 'detractors')} sx={{ color: colors.error, fontWeight: 300, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', cursor: 'pointer' }}>{team.npsDetractors}</TableCell>
                          <TableCell align="center" onClick={() => handleDrillDown(team, 'neutrals')} sx={{ color: colors.warning, fontWeight: 300, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', cursor: 'pointer' }}>{team.npsNeutrals}</TableCell>
                          <TableCell align="center" onClick={() => handleDrillDown(team, 'issues')} sx={{ color: '#3b82f6', fontWeight: 300, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', cursor: 'pointer' }}>{team.issueViolations}</TableCell>
                          <TableCell align="center" onClick={() => team.openCount > 0 && handleDrillDown(team, 'open')} sx={{ color: team.openCount > 0 ? colors.error : colors.textSecondary, fontWeight: 300, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', cursor: team.openCount > 0 ? 'pointer' : 'default' }}>{team.openCount}</TableCell>
                          <TableCell align="center" sx={{ color: colors.info, fontWeight: 300, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>{team.avgResolutionTime}d</TableCell>
                          <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                            <Typography variant="body2" sx={{
                              color: team.resPercent > 90 ? colors.success : team.resPercent > 70 ? colors.warning : colors.error,
                              fontWeight: 500,
                              fontSize: '0.8rem'
                            }}>
                              {team.resPercent}%
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                            <Chip
                              label={team.totalPoints}
                              size="small"
                              sx={{
                                background: 'rgba(139, 92, 246, 0.1)',
                                color: colors.primary,
                                fontWeight: 800,
                                borderRadius: '8px',
                                height: '22px',
                                fontSize: '0.75rem',
                              }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                            <Chip
                              label={team.totalViolations}
                              onClick={() => handleDrillDown(team, 'violations')}
                              size="small"
                              sx={{
                                background: team.totalViolations === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: team.totalViolations === 0 ? colors.success : colors.error,
                                fontWeight: 700,
                                borderRadius: '8px',
                                height: '22px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                '&:hover': { transform: 'scale(1.1)' }
                              }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1 }}>
                            <MuiTooltip title="Export Detailed Team Report">
                              <IconButton
                                size="small"
                                onClick={() => handleExportIndividualTeam(team)}
                                sx={{
                                  color: colors.success,
                                  bgcolor: 'rgba(16, 185, 129, 0.1)',
                                  '&:hover': {
                                    bgcolor: 'rgba(16, 185, 129, 0.2)',
                                    transform: 'scale(1.1)'
                                  },
                                  transition: 'all 0.2s'
                                }}
                              >
                                <FaFileExcel size={14} />
                              </IconButton>
                            </MuiTooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <TablePagination
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  component="div"
                  count={leaderboardData.length}
                  rowsPerPage={leaderboardRowsPerPage}
                  page={leaderboardPage}
                  onPageChange={(e, newPage) => setLeaderboardPage(newPage)}
                  onRowsPerPageChange={(e) => {
                    setLeaderboardRowsPerPage(parseInt(e.target.value, 10));
                    setLeaderboardPage(0);
                  }}
                  sx={{
                    color: colors.textSecondary,
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    '& .MuiTablePagination-selectIcon': { color: colors.textSecondary },
                    '& .MuiIconButton-root': { color: colors.primary }
                  }}
                />
              </TableContainer >
            </>
    </>
  );
};
