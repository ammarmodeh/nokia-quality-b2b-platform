import React, { useState } from 'react';
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TablePagination,
  Box,
  TextField,
  Avatar,
  LinearProgress,
  Tooltip
} from "@mui/material";
import {
  Visibility,
  Edit,
  Delete,
  Search,
  CalendarMonth,
  Person,
  BarChart
} from "@mui/icons-material";

const AssessmentList = ({
  assessments,
  colors,
  onSelectAssessment,
  onEditAssessment,
  onDeleteAssessment,
  getPerformanceColor,
  getScoreLabel,
  user,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = (assessments || []).filter(a =>
    (a.conductedBy || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (getScoreLabel(a.overallScore) || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const glassStyle = {
    background: colors.surface,
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    border: `1px solid ${colors.border}`,
    borderRadius: '24px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
  };

  const formatLocalDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
          <BarChart sx={{ color: colors.primary }} />
          <Typography variant="h5" sx={{ fontWeight: 800, color: colors.textPrimary }}>
            Assessment History
          </Typography>
        </Box>
        <TextField
          placeholder="Filter by supervisor or label..."
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
              width: { xs: '100%', md: 320 },
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
            }
          }}
        />
      </Box>

      {filtered.length > 0 ? (
        <TableContainer component={Paper} sx={glassStyle}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: 'rgba(99, 102, 241, 0.05)' }}>
              <TableRow>
                <TableCell sx={{ color: colors.primary, fontWeight: 700, borderBottom: `1px solid ${colors.border}` }}>Timeline</TableCell>
                <TableCell sx={{ color: colors.primary, fontWeight: 700, borderBottom: `1px solid ${colors.border}` }}>Supervisor</TableCell>
                <TableCell sx={{ color: colors.primary, fontWeight: 700, borderBottom: `1px solid ${colors.border}` }}>Skill Level</TableCell>
                <TableCell sx={{ color: colors.primary, fontWeight: 700, borderBottom: `1px solid ${colors.border}` }}>Performance</TableCell>
                <TableCell sx={{ color: colors.primary, fontWeight: 700, borderBottom: `1px solid ${colors.border}`, textAlign: 'right' }}>Management</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((assessment) => (
                  <TableRow
                    key={assessment._id}
                    sx={{
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <TableCell sx={{ borderBottom: `1px solid ${colors.border}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CalendarMonth sx={{ fontSize: 18, color: colors.primary }} />
                        <Typography variant="body2" sx={{ fontWeight: 700, color: colors.textPrimary }}>
                          {formatLocalDate(assessment.assessmentDate)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${colors.border}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{
                          bgcolor: `${colors.primary}15`,
                          color: colors.primary,
                          width: 32,
                          height: 32,
                          fontSize: '0.8rem',
                          fontWeight: 700
                        }}>
                          {assessment.conductedBy.split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: colors.textPrimary }}>
                          {assessment.conductedBy}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${colors.border}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: colors.textPrimary, minWidth: 40 }}>
                          {Math.round(assessment.overallScore || 0)}%
                        </Typography>
                        <Box sx={{ flex: 1, minWidth: 80 }}>
                          <LinearProgress
                            variant="determinate"
                            value={assessment.overallScore || 0}
                            sx={{
                              height: 4,
                              borderRadius: 2,
                              bgcolor: 'rgba(255,255,255,0.05)',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: colors[getPerformanceColor(assessment.overallScore)] || colors.primary
                              }
                            }}
                          />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${colors.border}` }}>
                      <Chip
                        label={getScoreLabel(assessment.overallScore)}
                        size="small"
                        sx={{
                          bgcolor: `${colors[getPerformanceColor(assessment.overallScore)]}15`,
                          color: colors[getPerformanceColor(assessment.overallScore)],
                          borderColor: `${colors[getPerformanceColor(assessment.overallScore)]}30`,
                          fontWeight: 700,
                          borderRadius: '8px'
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'right' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="View Detailed Report">
                          <IconButton
                            size="small"
                            onClick={() => onSelectAssessment(assessment)}
                            sx={{ color: colors.primary, '&:hover': { bgcolor: `${colors.primary}15` } }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Modify Assessment">
                          <IconButton
                            size="small"
                            onClick={() => onEditAssessment(assessment)}
                            sx={{ color: colors.warning, '&:hover': { bgcolor: `${colors.warning}15` } }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {user.role === 'Admin' && (
                          <Tooltip title="Delete Permanently">
                            <IconButton
                              size="small"
                              onClick={() => onDeleteAssessment(assessment._id)}
                              sx={{ color: colors.error, '&:hover': { bgcolor: `${colors.error}15` } }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filtered.length}
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
      ) : (
        <Paper sx={{ ...glassStyle, p: 6, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: colors.textSecondary }}>
            No assessments registered for this team yet.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default AssessmentList;