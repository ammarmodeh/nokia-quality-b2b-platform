import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  Divider,
  TablePagination,
  Tooltip,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  MdSearch,
  MdClose,
  MdVisibility,
  MdEdit,
  MdDelete,
  MdFileDownload,
  MdRefresh,
  MdStar,
  MdStarOutline,
  MdFilterList
} from 'react-icons/md';
import { IoMdAdd } from "react-icons/io";
import api from '../api/api';
import EditTaskDialog from '../components/task/EditTaskDialog';
import { TaskDetailsDialog } from '../components/TaskDetailsDialog';
import { format, parseISO } from 'date-fns';
import { utils, writeFile } from 'xlsx';
import AddTask from '../components/task/AddTask';

const AllTasksList = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const user = useSelector((state) => state?.auth?.user);

  const [tasks, setTasks] = useState([]);
  const [favoriteTasks, setFavoriteTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'neutrals', 'detractors'
  const [openAddTask, setOpenAddTask] = useState(false);
  const [updateRefetchTasks, setUpdateRefetchTasks] = useState(false);

  // Fetch all non-deleted tasks and sort by interview date
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await api.get("/tasks/get-all-tasks", {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      const sortedTasks = (response.data || []).sort((a, b) => {
        const dateA = a.interviewDate ? new Date(a.interviewDate).getTime() : 0;
        const dateB = b.interviewDate ? new Date(b.interviewDate).getTime() : 0;
        return dateB - dateA;
      });

      setTasks(sortedTasks);
      setError(null);
    } catch (err) {
      // console.error("Error fetching tasks:", err);
      setError("Failed to load tasks. Please try again.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's favorite tasks
  const fetchFavoriteTasks = async () => {
    try {
      const response = await api.get("/favourites/get-favourites", {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      setFavoriteTasks(response.data.favourites || []);
    } catch (err) {
      // console.error("Error fetching favorite tasks:", err);
    }
  };

  useEffect(() => {
    fetchTasks();
    if (user?._id) {
      fetchFavoriteTasks();
    }
  }, [user?._id, updateRefetchTasks]);

  // Check if task is favorited and get its favorite ID
  const getFavoriteStatus = (taskId) => {
    const favorite = favoriteTasks.find(fav => fav.originalTaskId === taskId);
    return {
      isFavorited: !!favorite,
      favoriteId: favorite?._id
    };
  };

  // Toggle favorite status
  const toggleFavorite = async (task) => {
    const { isFavorited, favoriteId } = getFavoriteStatus(task._id);

    try {
      if (isFavorited) {
        // Remove from favorites
        await api.delete(`/favourites/delete-favourite/${favoriteId}/${user._id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        setFavoriteTasks(favoriteTasks.filter(fav => fav._id !== favoriteId));
      } else {
        // Add to favorites
        const response = await api.post("/favourites/add-favourite", {
          task,
          userId: user._id,
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        setFavoriteTasks([...favoriteTasks, response.data]);
      }
    } catch (error) {
      // console.error("Error updating favorite status:", error);
      alert("Failed to update favorites. Please try again.");
    }
  };

  // Filter tasks based on search term and selected filter
  const filteredTasks = tasks.filter((task) => {
    // Apply search filter
    const matchesSearch = (
      task.slid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.contactNumber?.toString().includes(searchTerm) ||
      task.customerFeedback?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply evaluation score filter
    let matchesFilter = true;
    if (filter === 'neutrals') {
      matchesFilter = task.evaluationScore >= 7 && task.evaluationScore <= 8;
    } else if (filter === 'detractors') {
      matchesFilter = task.evaluationScore >= 1 && task.evaluationScore <= 6;
    }

    return matchesSearch && matchesFilter;
  });

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle task deletion
  const handleDeleteTask = async () => {
    try {
      // First, get the complete task data
      const { data: taskData } = await api.get(`/tasks/get-task/${taskToDelete._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      if (!taskData) {
        throw new Error("Task not found");
      }

      // Move to trash with additional metadata
      const trashResponse = await api.post('/trash/add-trash', {
        ...taskData, // Spread all task fields
        deletedBy: user._id,
        deletionReason: 'Deleted by user',
        deletedAt: new Date()
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      if (trashResponse.status === 201) {
        // Only delete from main collection if trash operation succeeded
        await api.delete(`/tasks/delete-task/${taskToDelete._id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });

        // Update UI state
        setTasks(tasks.filter(task => task._id !== taskToDelete._id));
        setDeleteDialogOpen(false);
        setTaskToDelete(null);

        alert("Task moved to trash successfully");
      } else {
        throw new Error("Failed to move task to trash");
      }
    } catch (err) {
      // console.error("Error deleting task:", err);
      setError("Failed to delete task. Please try again.");
    }
  };


  // Export to Excel function
  const exportToExcel = () => {
    const data = filteredTasks.map(task => ({
      'Request Number': task.requestNumber || 'N/A',
      'SLID': task.slid || 'N/A',
      'PIS Date': task.pisDate ? format(parseISO(task.pisDate), 'dd/MM/yyyy') : 'N/A',
      'Customer Name': task.customerName || 'N/A',
      'Contact': task.contactNumber || 'N/A',
      'Customer Feedback': task.customerFeedback || 'N/A',
      'Governorate': task.governorate || 'N/A',
      'District': task.district || 'N/A',
      'Team Name': task.teamName || 'N/A',
      'Team Company': task.teamCompany || 'N/A',
      'Evaluation Score': task.evaluationScore || 'N/A',
      'Interview Date': task.interviewDate ? format(parseISO(task.interviewDate), 'dd/MM/yyyy') : 'N/A'
    }));

    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Tasks');
    writeFile(workbook, 'Tasks_Export.xlsx');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Typography color="error">{error}</Typography>
        <Button
          onClick={fetchTasks}
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
    <Box sx={{ p: isMobile ? 0 : 3 }}>
      <Typography variant="h5" gutterBottom sx={{
        color: '#3ea6ff',
        fontWeight: 'bold',
        fontSize: isMobile ? '1.2rem' : '1.5rem',
        mb: 2
      }}>
        Tasks Audit Dashboard
      </Typography>

      {/* Search and Export Bar */}
      <Box sx={{
        backgroundColor: '#1e1e1e',
        p: 2,
        borderRadius: '8px',
        border: '1px solid #444',
        mb: 2,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 2,
        alignItems: 'center'
      }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search by SLID, Name, Contact, or Feedback..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MdSearch style={{ color: '#aaaaaa' }} />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <IconButton
                size="small"
                onClick={() => setSearchTerm('')}
                sx={{
                  visibility: searchTerm ? 'visible' : 'hidden',
                  color: '#aaaaaa',
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
              backgroundColor: '#272727',
              width: '100%',
              '& fieldset': {
                border: 'none',
              },
              '& input': {
                color: '#ffffff',
                overflow: 'hidden',        // Ensures text doesn't overflow visibly
                textOverflow: 'ellipsis',  // Adds "..." when text overflows
                whiteSpace: 'nowrap',      // Prevents text from wrapping
                '&::placeholder': {
                  color: '#666',
                  opacity: 1,
                  fontSize: '0.8rem',      // Smaller placeholder text
                  overflow: 'hidden',      // Needed for ellipsis in placeholder
                  textOverflow: 'ellipsis',// Ellipsis for placeholder
                  whiteSpace: 'nowrap',    // Prevents wrapping
                }
              },
            },
          }}
          sx={{
            width: isMobile ? '100%' : 'auto',
            flex: 1,
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                border: '1px solid #666 !important',
              },
              '&.Mui-focused fieldset': {
                border: '1px solid #3ea6ff !important',
              },
            },
          }}
        />

        <FormControl size="small" sx={{ minWidth: isMobile ? undefined : 120, width: isMobile ? '100%' : undefined }}>
          <InputLabel id="filter-select-label" sx={{ color: '#aaaaaa' }}>
            Filter
          </InputLabel>
          <Select
            labelId="filter-select-label"
            id="filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            label="Filter"
            sx={{
              color: '#ffffff',
              borderRadius: '20px',
              backgroundColor: '#272727',
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #666 !important',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #3ea6ff !important',
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: '#272727',
                  color: '#ffffff',
                },
              },
            }}
          >
            <MenuItem value="all">
              <Box display="flex" alignItems="center" gap={1}>
                <MdFilterList />
                <span>All Tasks</span>
              </Box>
            </MenuItem>
            <MenuItem value="neutrals">
              <Box display="flex" alignItems="center" gap={1}>
                <Chip label="7-8" size="small" color="warning" />
                <span>Neutrals</span>
              </Box>
            </MenuItem>
            <MenuItem value="detractors">
              <Box display="flex" alignItems="center" gap={1}>
                <Chip label="1-6" size="small" color="error" />
                <span>Detractors</span>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          onClick={exportToExcel}
          startIcon={<MdFileDownload />}
          sx={{
            borderColor: '#444',
            color: '#1976d2',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.08)',
              borderColor: '#666',
            },
            textTransform: 'none',
            borderRadius: '20px',
            px: 3,
            whiteSpace: 'nowrap',
            width: isMobile ? '100%' : 'auto'
          }}
        >
          Export to Excel
        </Button>

        {user && user.role === 'Admin' && (
          <Button
            variant="outlined"
            onClick={() => setOpenAddTask(true)}
            startIcon={<IoMdAdd />}
            sx={{
              borderColor: '#444',
              color: '#4caf50',
              '&:hover': {
                backgroundColor: 'rgba(76, 175, 80, 0.08)',
                borderColor: '#666',
              },
              textTransform: 'none',
              borderRadius: '20px',
              px: 3,
              whiteSpace: 'nowrap',
              width: isMobile ? '100%' : 'auto'
            }}
          >
            Create Task
          </Button>
        )}
      </Box>

      {/* Tasks Table */}
      <TableContainer component={Paper} sx={{
        mt: 2,
        maxWidth: '100%',
        overflowX: 'auto',
        backgroundColor: '#1e1e1e',
        border: '1px solid #444',
        "& .MuiTable-root": {
          backgroundColor: "#272727",
        },
        "& .MuiTableHead-root": {
          backgroundColor: "#333",
          "& .MuiTableCell-root": {
            color: "#9e9e9e",
            fontSize: "0.875rem",
            fontWeight: "bold",
            borderBottom: "1px solid #444",
          }
        },
        "& .MuiTableBody-root": {
          "& .MuiTableCell-root": {
            borderBottom: "1px solid #444",
            color: "#ffffff",
          },
          "& .MuiTableRow-root": {
            backgroundColor: "#272727",
            "&:hover": {
              backgroundColor: "#333",
            },
          }
        },
        "&::-webkit-scrollbar": {
          width: "8px",
          height: "8px",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "#666",
          borderRadius: "4px",
        },
        "&::-webkit-scrollbar-track": {
          backgroundColor: "#444",
        },
      }}>
        <Table size={isMobile ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              <TableCell>SLID</TableCell>
              <TableCell>Customer Name</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Customer Feedback</TableCell>
              <TableCell>Evaluation Score</TableCell>
              <TableCell>Interview Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTasks.length > 0 ? (
              filteredTasks
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((task) => {
                  const { isFavorited } = getFavoriteStatus(task._id);
                  return (
                    <TableRow key={task._id}>
                      <TableCell>{task.slid || "-"}</TableCell>
                      <TableCell>
                        <Typography fontWeight={500}>
                          {task.customerName || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>{task.contactNumber || "-"}</TableCell>
                      <TableCell>
                        {task.customerFeedback ? (
                          <Typography
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {task.customerFeedback}
                          </Typography>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {task.evaluationScore ? (
                          <Chip
                            label={task.evaluationScore}
                            size="small"
                            color={
                              task.evaluationScore >= 9 ? 'success' :
                                task.evaluationScore >= 7 ? 'warning' : 'error'
                            }
                          />
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {task.interviewDate ? format(parseISO(task.interviewDate), 'dd/MM/yyyy') : "-"}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Tooltip title={isFavorited ? "Remove from Favorites" : "Add to Favorites"}>
                            <IconButton
                              size="small"
                              onClick={() => toggleFavorite(task)}
                              sx={{
                                color: isFavorited ? '#ffc107' : '#aaaaaa',
                                '&:hover': {
                                  color: isFavorited ? '#ffd700' : '#ffffff'
                                }
                              }}
                            >
                              {isFavorited ? <MdStar /> : <MdStarOutline />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => {
                                setSelectedTask(task);
                                setViewDialogOpen(true);
                              }}
                              sx={{ color: '#3ea6ff' }}
                            >
                              <MdVisibility />
                            </IconButton>
                          </Tooltip>
                          {
                            user && user.role === 'Admin' && (
                              <>
                                <Tooltip title="Edit Task">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => {
                                      setSelectedTask(task);
                                      setEditDialogOpen(true);
                                    }}
                                    sx={{ color: '#ffc107' }}
                                  >
                                    <MdEdit />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Task">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      setTaskToDelete(task);
                                      setDeleteDialogOpen(true);
                                    }}
                                    sx={{ color: '#f44336' }}
                                  >
                                    <MdDelete />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )
                          }
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#ffffff' }}>
                  {searchTerm ? 'No matching tasks found' : 'No tasks available'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
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
          count={filteredTasks.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Box>

      {/* Edit Task Dialog */}
      {selectedTask && (
        <EditTaskDialog
          open={editDialogOpen}
          setOpen={setEditDialogOpen}
          task={selectedTask}
          handleTaskUpdate={(updatedTask) => {
            setTasks(tasks.map(t =>
              t._id === updatedTask._id ? updatedTask : t
            ));
            setSelectedTask(null);
          }}
        />
      )}

      {/* View Task Dialog */}
      {selectedTask && (
        <TaskDetailsDialog
          open={viewDialogOpen}
          onClose={() => {
            setViewDialogOpen(false);
            setSelectedTask(null);
          }}
          tasks={[selectedTask]}
          teamName={selectedTask.teamName || "Unknown Team"}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        fullScreen={isMobile}
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
          }
        }}
      >
        <DialogTitle sx={{
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          borderBottom: '1px solid #444',
          padding: '16px 24px',
        }}>
          Confirm Deletion
        </DialogTitle>
        <Divider sx={{ backgroundColor: '#444' }} />
        <DialogContent sx={{ backgroundColor: '#1e1e1e', padding: '20px 24px' }}>
          <Typography>
            Are you sure you want to delete task {taskToDelete?.slid}?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This action will move the task to trash and cannot be undone.
          </Typography>
        </DialogContent>
        <Divider sx={{ backgroundColor: '#444' }} />
        <DialogActions sx={{
          backgroundColor: '#1e1e1e',
          borderTop: '1px solid #444',
          padding: '12px 24px',
        }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#2a2a2a',
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteTask}
            variant="contained"
            color="error"
            sx={{
              backgroundColor: '#f44336',
              '&:hover': {
                backgroundColor: '#d32f2f',
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Task Dialog */}
      <AddTask
        open={openAddTask}
        setOpen={setOpenAddTask}
        setUpdateRefetchTasks={setUpdateRefetchTasks}
      />
    </Box>
  );
};

export default AllTasksList;