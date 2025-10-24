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
  Button,
  TablePagination,
  Box,
} from "@mui/material";

const AssessmentList = ({
  assessments,
  colors,
  getPerformanceColor,
  onSelectAssessment,
  onEditAssessment,
  onDeleteAssessment,
  onNewAssessment,
  user,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) => {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{
          color: colors.primary,
          fontWeight: 'bold',
        }}>
          Previous Assessments
        </Typography>
        {onNewAssessment && (
          <Button
            variant="contained"
            onClick={onNewAssessment}
            sx={{
              backgroundColor: colors.primary,
              color: colors.textPrimary,
              '&:hover': {
                backgroundColor: '#1d4ed8',
              }
            }}
          >
            New Assessment
          </Button>
        )}
      </Box>

      {assessments && assessments.length > 0 ? (
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
                  <TableCell>Date</TableCell>
                  <TableCell>Conducted By</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assessments
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((assessment) => (
                    <TableRow key={assessment._id} hover>
                      <TableCell>
                        {new Date(assessment.assessmentDate).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </TableCell>
                      <TableCell>{assessment.conductedBy}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${assessment.overallScore}%`}
                          color={getPerformanceColor(assessment.overallScore)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{assessment.status}</TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => onSelectAssessment(assessment)}
                          sx={{
                            color: colors.primary,
                            borderColor: colors.primary,
                            '&:hover': {
                              backgroundColor: colors.primaryHover,
                              borderColor: colors.primary,
                            }
                          }}
                        >
                          View Details
                        </Button>
                        {user.role === 'Admin' && (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => onEditAssessment(assessment)}
                            sx={{
                              ml: 1,
                              color: colors.warning,
                              borderColor: colors.warning,
                              '&:hover': {
                                backgroundColor: `${colors.warning}22`,
                                borderColor: colors.warning,
                              }
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        {user.role === 'Admin' && (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => onDeleteAssessment(assessment._id)}
                            sx={{
                              ml: 1,
                              color: colors.error,
                              borderColor: colors.error,
                              '&:hover': {
                                backgroundColor: `${colors.error}22`,
                                borderColor: colors.error,
                              }
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={assessments.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
            sx={{
              color: colors.textPrimary,
              '& .MuiTablePagination-selectIcon': { color: colors.textPrimary },
              '& .MuiSvgIcon-root': { color: colors.textPrimary },
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderTop: 'none',
              borderBottomLeftRadius: '8px',
              borderBottomRightRadius: '8px',
              mb: 6
            }}
          />
        </>
      ) : (
        <Paper sx={{
          p: 3,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <Typography variant="body1" sx={{ color: colors.textSecondary }}>
            No assessments found for this team
          </Typography>
        </Paper>
      )}
    </>
  );
};

export default AssessmentList;