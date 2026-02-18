import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import api from '../api/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  Box,
  Typography,
  Button,

  useMediaQuery,
  useTheme,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  TablePagination,
} from '@mui/material';
import { FaUndoAlt } from 'react-icons/fa';
import { MdRefresh, MdSearch, MdClose, MdVisibility } from 'react-icons/md';
import { format, parseISO } from 'date-fns';
import { TaskDetailsDialog } from '../components/TaskDetailsDialog';

const Archived = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const user = useSelector((state) => state?.auth?.user);
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Fetch archives
  const fetchArchives = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/archive/get-all-archives', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const { data } = response;
      if (Array.isArray(data)) {
        const sortedArchives = data.sort((a, b) => {
          const dateA = a.interviewDate ? new Date(a.interviewDate).getTime() : 0;
          const dateB = b.interviewDate ? new Date(b.interviewDate).getTime() : 0;
          return dateB - dateA;
        });
        setArchives(sortedArchives);
      } else {
        setError('Invalid data format received from the server.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchives();
  }, [fetchArchives]);

  // Restore task from archives
  const restoreFromArchivesToTasks = useCallback(async (taskId) => {
    const isConfirmed = window.confirm('Are you sure you want to restore this task?');
    if (!isConfirmed) return;

    try {
      const restoreResponse = await api.post(
        `/archive/${taskId}/restore`,
        {}, // empty body
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );

      if (restoreResponse.status === 200) {
        setArchives((prevArchives) => prevArchives.filter((archive) => archive._id !== taskId));
        alert('Task restored successfully! Check the tasks page.');
      }
    } catch (error) {
      alert('Failed to restore task: ' + error.message);
    }
  }, []);

  // Filter archives to show only those created by or assigned to the logged-in user
  const myArchives = useMemo(() => {
    return archives.filter((archive) =>
      archive.assignedTo.includes(user._id) ||
      archive.createdBy === user._id ||
      archive.whomItMayConcern.includes(user._id)
    );
  }, [archives, user._id]);

  // Filter tasks based on search term
  const filteredArchives = myArchives.filter((archive) => {
    return (
      archive.slid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      archive.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      archive.contactNumber?.toString().includes(searchTerm) ||
      archive.customerFeedback?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      archive.requestNumber?.toString().includes(searchTerm) ||
      archive.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      archive.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Loading state
  if (loading) {
    return <LoadingSpinner variant="page" />;
  }

  // Error state
  if (error) {
    return (
      <Box p={4}>
        <Typography color="error">{error}</Typography>
        <Button
          onClick={fetchArchives}
          variant="contained"
          startIcon={<MdRefresh />}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundColor: 'background.default',
      p: 3,
    }}>
      <Box sx={{
        mx: 'auto',
      }}>
        <Typography variant="h5" gutterBottom sx={{
          color: '#7b68ee',
          fontWeight: 'bold',
          fontSize: isMobile ? '1.2rem' : '1.5rem',
          mb: 2,
        }}>
          Archived Tasks
        </Typography>

        {/* Search Bar */}
        <Box sx={{
          backgroundColor: '#2d2d2d',
          p: 2,
          borderRadius: '8px',
          border: '1px solid #3d3d3d',
          mb: 2,
          width: '100%',
        }}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search by SLID, Name, Contact, Request #, Team, Category or Feedback..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MdSearch style={{ color: '#b3b3b3' }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <IconButton
                  size="small"
                  onClick={() => setSearchTerm('')}
                  sx={{
                    visibility: searchTerm ? 'visible' : 'hidden',
                    color: '#b3b3b3',
                    '&:hover': {
                      backgroundColor: '#2a2a2a',
                    }
                  }}
                >
                  <MdClose />
                </IconButton>
              ),
              sx: {
                borderRadius: '20px',
                backgroundColor: '#2d2d2d',
                '& fieldset': {
                  border: 'none',
                },
                '& input': {
                  color: '#ffffff',
                  '&::placeholder': {
                    color: '#666',
                    opacity: 1,
                  },
                  '&:-webkit-autofill': {
                    WebkitBoxShadow: '0 0 0 100px #ffffff inset !important',
                    WebkitTextFillColor: '#ffffff !important',
                  },
                },
                '& input:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 100px #ffffff inset !important',
                  WebkitTextFillColor: '#ffffff !important',
                },
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  border: '1px solid #666 !important',
                },
                '&.Mui-focused fieldset': {
                  border: '1px solid #7b68ee !important',
                },
              },
              '& .MuiInputBase-input': {
                '&:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 100px #ffffff inset !important',
                  WebkitTextFillColor: '#ffffff !important',
                },
              },
            }}
            inputProps={{
              autoComplete: 'off',
            }}
          />
        </Box>

        {/* Archives Table */}
        <TableContainer component={Paper} sx={{
          mt: 2,
          maxWidth: '100%',
          overflowX: 'auto',
          backgroundColor: '#2d2d2d',
          border: '1px solid #3d3d3d',
          "& .MuiTable-root": {
            backgroundColor: "#2d2d2d",
          },
          "& .MuiTableHead-root": {
            backgroundColor: "#2d2d2d",
            "& .MuiTableCell-root": {
              color: "#b3b3b3",
              fontSize: "0.875rem",
              fontWeight: "bold",
              borderBottom: "1px solid #e5e7eb",
            }
          },
          "& .MuiTableBody-root": {
            "& .MuiTableCell-root": {
              borderBottom: "1px solid #e5e7eb",
              color: "#ffffff",
            },
            "& .MuiTableRow-root": {
              backgroundColor: "#2d2d2d",
              "&:hover": {
                backgroundColor: "#2d2d2d",
              },
            }
          },
        }}>
          <Table size={isMobile ? 'small' : 'medium'}>
            <TableHead>
              <TableRow>
                <TableCell>SLID</TableCell>
                <TableCell>Customer Name</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Request #</TableCell>
                <TableCell>Team</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Feedback</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Interview Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredArchives.length > 0 ? (
                filteredArchives
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((archive) => (
                    <TableRow key={archive._id}>
                      <TableCell>{archive.slid || "-"}</TableCell>
                      <TableCell>
                        <Typography fontWeight={500}>
                          {archive.customerName || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>{archive.contactNumber || "-"}</TableCell>
                      <TableCell>{archive.requestNumber || "-"}</TableCell>
                      <TableCell>{archive.teamName || "-"}</TableCell>
                      <TableCell>{archive.category || "-"}</TableCell>
                      <TableCell>
                        {archive.customerFeedback ? (
                          <Typography
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {archive.customerFeedback}
                          </Typography>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {archive.evaluationScore ? (
                          <Chip
                            label={archive.evaluationScore}
                            size="small"
                            color={
                              archive.evaluationScore >= 9 ? 'success' :
                                archive.evaluationScore >= 7 ? 'warning' : 'error'
                            }
                          />
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {archive.interviewDate ? format(parseISO(archive.interviewDate), 'dd/MM/yyyy') : "-"}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => {
                                setSelectedTask(archive);
                                setViewDialogOpen(true);
                              }}
                              sx={{ color: '#7b68ee' }}
                            >
                              <MdVisibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Restore Task">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => restoreFromArchivesToTasks(archive._id)}
                              sx={{ color: '#7b68ee' }}
                            >
                              <FaUndoAlt />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{
                    py: 4,
                    color: '#ffffff',
                    fontStyle: 'italic'
                  }}>
                    No archived tasks found for your account.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination - Only show if there are archives */}
        {filteredArchives.length > 0 && (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            mt: 2,
            '& .MuiTablePagination-root': {
              color: '#ffffff',
            },
            '& .MuiTablePagination-selectIcon': {
              color: '#ffffff',
            }
          }}>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={filteredArchives.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Box>
        )}

        {/* Task Details Dialog */}
        {selectedTask && (
          <TaskDetailsDialog
            open={viewDialogOpen}
            onClose={() => {
              setViewDialogOpen(false);
              setSelectedTask(null);
            }}
            tasks={[selectedTask]}
            teamName={selectedTask.teamName || "Unknown Team"}
            onTaskUpdated={fetchArchives}
          />
        )}
      </Box>
    </Box>
  );
};

export default Archived;