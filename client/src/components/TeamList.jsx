import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TablePagination,
  Avatar,
  IconButton,
  TextField,
  LinearProgress,
  Tooltip
} from "@mui/material";
import {
  Search,
  ChevronRight,
  Assignment,
  Groups,
  Analytics
} from '@mui/icons-material';

const TeamList = ({
  fieldTeams,
  colors,
  teamAssessmentsMap,
  getTeamAverageScore,
  getPerformanceColor,
  getScoreLabel,
  loading,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onSelectTeam
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTeams = (fieldTeams || []).filter(team =>
    (team.teamName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const glassStyle = {
    background: colors.surface,
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    border: `1px solid ${colors.border}`,
    borderRadius: '24px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    overflow: 'hidden'
  };

  return (
    <Box sx={{ mb: 6 }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Groups sx={{ color: colors.primary }} />
          <Typography variant="h5" sx={{ fontWeight: 800, color: colors.textPrimary }}>
            Operational Units
          </Typography>
        </Box>
        <TextField
          placeholder="Quick search unit..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ color: colors.textSecondary, mr: 1, fontSize: 20 }} />,
            sx: {
              borderRadius: '12px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              width: { xs: '100%', md: 300 },
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
            }
          }}
        />
      </Box>

      <TableContainer component={Paper} sx={glassStyle}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: 'rgba(99, 102, 241, 0.05)' }}>
            <TableRow>
              <TableCell sx={{ color: colors.primary, fontWeight: 700, borderBottom: `1px solid ${colors.border}` }}>Team Identity</TableCell>
              <TableCell sx={{ color: colors.primary, fontWeight: 700, borderBottom: `1px solid ${colors.border}` }}>Audits Conducted</TableCell>
              <TableCell sx={{ color: colors.primary, fontWeight: 700, borderBottom: `1px solid ${colors.border}` }}>Cumulative Perf.</TableCell>
              <TableCell sx={{ color: colors.primary, fontWeight: 700, borderBottom: `1px solid ${colors.border}` }}>Evaluation Status</TableCell>
              <TableCell sx={{ color: colors.primary, fontWeight: 700, borderBottom: `1px solid ${colors.border}`, textAlign: 'right' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTeams
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((team) => {
                const teamAssessments = teamAssessmentsMap[team._id.toString()] || [];
                const assessmentCount = teamAssessments.length;
                const isAssessed = assessmentCount > 0;
                const averageScore = isAssessed ? getTeamAverageScore(team._id) : 0;

                return (
                  <TableRow
                    key={team._id}
                    sx={{
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.02)',
                        cursor: 'pointer'
                      },
                      transition: 'background-color 0.2s',
                    }}
                    onClick={() => onSelectTeam(team)}
                  >
                    <TableCell sx={{ borderBottom: `1px solid ${colors.border}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{
                          bgcolor: `${colors.primary}20`,
                          color: colors.primary,
                          fontWeight: 700,
                          width: 40,
                          height: 40,
                          fontSize: '0.9rem'
                        }}>
                          {team.teamName.substring(0, 2).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: colors.textPrimary }}>
                            {team.teamName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                            ID: {team._id.toString().slice(-6).toUpperCase()}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${colors.border}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assignment sx={{ fontSize: 16, color: colors.textSecondary }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: colors.textPrimary }}>
                          {assessmentCount} audits
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${colors.border}` }}>
                      {isAssessed ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: colors.textPrimary, minWidth: 40 }}>
                            {Math.round(averageScore)}%
                          </Typography>
                          <Box sx={{ flex: 1, minWidth: 100 }}>
                            <LinearProgress
                              variant="determinate"
                              value={averageScore}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: 'rgba(255,255,255,0.05)',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: colors[getPerformanceColor(averageScore)] || colors.primary
                                }
                              }}
                            />
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: colors.textSecondary, fontStyle: 'italic' }}>Pending Baseline</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${colors.border}` }}>
                      {isAssessed ? (
                        <Chip
                          label={getScoreLabel(averageScore)}
                          size="small"
                          sx={{
                            bgcolor: `${colors[getPerformanceColor(averageScore)]}15`,
                            color: colors[getPerformanceColor(averageScore)],
                            borderColor: `${colors[getPerformanceColor(averageScore)]}30`,
                            fontWeight: 700,
                            borderRadius: '8px'
                          }}
                        />
                      ) : (
                        <Chip
                          label="No Data"
                          size="small"
                          sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: colors.textSecondary, fontWeight: 700 }}
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'right' }}>
                      <IconButton
                        sx={{
                          color: colors.primary,
                          '&:hover': { bgcolor: `${colors.primary}10` }
                        }}
                      >
                        <ChevronRight />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredTeams.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
          sx={{
            color: colors.textSecondary,
            borderTop: `1px solid ${colors.border}`,
            '& .MuiTablePagination-selectIcon': { color: colors.textSecondary },
            '& .MuiTablePagination-actions': { color: colors.textSecondary }
          }}
        />
      </TableContainer>
    </Box>
  );
};

export default TeamList;