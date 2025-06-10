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
  CircularProgress,
  Avatar,
  useTheme,
  Tooltip,
} from "@mui/material";
import { Event } from '@mui/icons-material';

const TeamList = ({
  fieldTeams,
  colors,
  isTeamAssessed,
  teamAssessmentsMap,
  getTeamAverageScore,
  getPerformanceColor,
  loading,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onSelectTeam,
}) => {
  const theme = useTheme();

  // console.log({ fieldTeams });

  const formatLocalDate = (dateString) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);

    const dateOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };

    const timeOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };

    const formattedDate = date.toLocaleDateString(undefined, dateOptions);
    const formattedTime = date.toLocaleTimeString(undefined, timeOptions);

    return (
      <>
        {formattedDate}
        <br />
        <small style={{ color: colors.textSecondary }}>{formattedTime}</small>
      </>
    );
  };

  // Function to get most recent assessment
  const getMostRecentAssessment = (assessments) => {
    if (!assessments || assessments.length === 0) return null;

    // Sort assessments by date (newest first)
    const sorted = [...assessments].sort((a, b) =>
      new Date(b.assessmentDate) - new Date(a.assessmentDate)
    );

    return sorted[0]; // Return the most recent assessment
  };

  return (
    <>
      <Typography variant="h5" gutterBottom sx={{
        color: colors.primary,
        fontWeight: 'bold',
        mb: 2
      }}>
        Field Teams – Assessment History
      </Typography>

      {loading ? (
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          p: 4,
          backgroundColor: colors.surface,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`
        }}>
          <CircularProgress sx={{ color: colors.primary }} />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} sx={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px',
            borderBottomLeftRadius: '0px',
            borderBottomRightRadius: '0px',
            "& .MuiTableHead-root": {
              backgroundColor: colors.surfaceElevated,
              "& .MuiTableCell-root": {
                color: colors.textSecondary,
                fontWeight: "bold",
                borderBottom: `1px solid ${colors.border}`,
              }
            },
            "& .MuiTableBody-root": {
              "& .MuiTableCell-root": {
                borderBottom: `1px solid ${colors.border}`,
                color: colors.textPrimary,
              },
              "& .MuiTableRow-root": {
                backgroundColor: colors.surface,
                "&:hover": {
                  backgroundColor: colors.surfaceElevated,
                },
              }
            },
          }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Team Name</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Last Assessment</TableCell>
                  <TableCell>Conducted By</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fieldTeams
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((team) => {
                    const teamId = team._id.toString();
                    const isAssessed = isTeamAssessed(teamId);
                    const teamAssessments = teamAssessmentsMap[teamId] || [];
                    const averageScore = teamAssessments.length > 0
                      ? getTeamAverageScore(teamId)
                      : 0;
                    const mostRecentAssessment = getMostRecentAssessment(teamAssessments);

                    return (
                      <TableRow
                        key={team._id}
                        hover
                        onClick={() => onSelectTeam(team)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{team.teamName}</TableCell>
                        <TableCell>{team.teamCompany}</TableCell>
                        <TableCell>
                          {isAssessed ? (
                            <Tooltip
                              title={`UTC: ${new Date(mostRecentAssessment?.assessmentDate).toUTCString()}`}
                              arrow
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Event sx={{
                                  fontSize: '1rem',
                                  color: colors.textSecondary,
                                  mr: 1
                                }} />
                                <Box>
                                  {formatLocalDate(mostRecentAssessment?.assessmentDate)}
                                </Box>
                              </Box>
                            </Tooltip>
                          ) : "N/A"}
                        </TableCell>
                        <TableCell>
                          {isAssessed ? (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{
                                width: 24,
                                height: 24,
                                fontSize: '0.75rem',
                                mr: 1,
                                bgcolor: theme.palette.mode === 'dark' ? colors.primary : `${colors.primary}20`,
                                color: theme.palette.mode === 'dark' ? '#fff' : colors.primary,
                              }}>
                                {mostRecentAssessment?.conductedBy?.split(' ').map(n => n[0]).join('')}
                              </Avatar>
                              {mostRecentAssessment?.conductedBy}
                            </Box>
                          ) : "N/A"}
                        </TableCell>
                        <TableCell>
                          {isAssessed ? (
                            <Chip
                              label={`${averageScore}%`}
                              color={getPerformanceColor(averageScore)}
                              variant="outlined"
                            />
                          ) : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={isAssessed ? "Assessed" : "Not Assessed"}
                            color={isAssessed ? "success" : "error"}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={fieldTeams.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
            sx={{
              color: colors.textPrimary,
              '& .MuiTablePagination-selectIcon': { color: colors.textSecondary },
              '& .MuiSvgIcon-root': { color: colors.textSecondary },
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderTop: 'none',
              borderBottomLeftRadius: '8px',
              borderBottomRightRadius: '8px',
              mb: 6
            }}
          />
        </>
      )}
    </>
  );
};

export default TeamList;