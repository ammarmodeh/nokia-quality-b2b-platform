import { useEffect, useState, useCallback } from 'react';
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
  IconButton,
  Tooltip,
  TablePagination,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
  useMediaQuery
} from "@mui/material";
import { FaUndoAlt } from 'react-icons/fa';
import { MdDelete, MdRefresh } from 'react-icons/md';
import api from '../api/api';
import { useSelector } from 'react-redux';
import moment from 'moment';

const Trash = () => {
  const user = useSelector((state) => state?.auth?.user);
  const [trashes, setTrashes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const isMobile = useMediaQuery('(max-width:503px)');

  // Define fetchTrashes outside of useEffect
  const fetchTrashes = useCallback(async () => {
    try {
      const response = await api.get('/trash', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });

      // console.log('Server Response:', response.data); // Log the response data

      if (Array.isArray(response.data)) {
        setTrashes(response.data);
      } else if (response.data && Array.isArray(response.data.data)) {
        setTrashes(response.data.data);
      } else {
        setError('Invalid data format received from the server.');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch trash items');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch trashes on component mount
  useEffect(() => {
    fetchTrashes();
  }, [fetchTrashes]);

  // Restore task from trash
  const restoreTask = useCallback(async (taskId) => {
    const isConfirmed = confirm('Are you sure you want to restore this task?');
    if (!isConfirmed) return;

    try {
      await api.post(`/trash/${taskId}/restore`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setTrashes((prevTrashes) => prevTrashes.filter((trash) => trash._id !== taskId));
      alert('Task restored successfully! Check the tasks page.');
    } catch (error) {
      alert('Failed to restore task: ' + (error.response?.data?.message || error.message));
    }
  }, []);

  // Delete task permanently
  const deleteTaskPermanently = useCallback(async (taskId) => {
    const isConfirmed = confirm('Are you sure you want to permanently delete this task?');
    if (!isConfirmed) return;

    try {
      await api.delete(`/trash/${taskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setTrashes((prevTrashes) => prevTrashes.filter((trash) => trash._id !== taskId));
      alert('Task deleted permanently!');
    } catch (error) {
      alert('Failed to permanently delete task: ' + (error.response?.data?.message || error.message));
    }
  }, []);

  const handleMenuClose = () => {
    setAnchorEl(null);
    setCurrentTask(null);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Format date
  const formatDate = (dateString) => {
    return dateString ? moment(dateString).format('YYYY-MM-DD HH:mm') : 'N/A';
  };

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box p={4}>
        <Typography color="error">{error}</Typography>
        <Button
          onClick={fetchTrashes}
          variant="contained"
          startIcon={<MdRefresh />}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  // Filter trashes to show only those created by the logged-in user
  const myTrashes = trashes.filter((trash) =>
    trash.createdBy?._id === user._id ||
    (typeof trash.createdBy === 'string' && trash.createdBy === user._id)
  );

  return (
    <Box sx={{
      maxWidth: '1100px',
      mx: 'auto',
      p: 2,
      px: isMobile ? 0 : undefined
    }}>
      <Typography variant="h5" gutterBottom sx={{
        color: '#7b68ee',
        fontWeight: 'bold',
        mb: 2
      }}>
        Trash
      </Typography>

      {/* Trash Table */}
      <TableContainer component={Paper} sx={{
        mt: 2,
        backgroundColor: '#2d2d2d',
        border: '1px solid #3d3d3d',
        "& .MuiTableHead-root": {
          backgroundColor: "#2d2d2d",
          "& .MuiTableCell-root": {
            color: "#b3b3b3",
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
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>SLID</TableCell>
              <TableCell>Customer Name</TableCell>
              <TableCell>Customer Feedback</TableCell>
              <TableCell>Deleted By</TableCell>
              <TableCell>Deleted At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {myTrashes.length > 0 ? (
              myTrashes
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((trash) => (
                  <TableRow key={trash._id}>
                    <TableCell>{trash.slid || "-"}</TableCell>
                    <TableCell>
                      <Typography fontWeight={500}>
                        {trash.customerName || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {trash.customerFeedback ? (
                        <Typography
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {trash.customerFeedback}
                        </Typography>
                      ) : "-"}
                    </TableCell>
                    <TableCell>{trash.deletedBy?.name || "-"}</TableCell>
                    <TableCell>{formatDate(trash.deletedAt)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Tooltip title="Restore">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => restoreTask(trash._id)}
                            sx={{ color: '#7b68ee' }}
                          >
                            <FaUndoAlt />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Permanently">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => deleteTaskPermanently(trash._id)}
                            sx={{ color: '#ff4081' }}
                          >
                            <MdDelete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#ffffff' }}>
                  No trash items found
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
        }
      }}>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={myTrashes.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{
          "& .MuiPaper-root": {
            backgroundColor: '#2d2d2d',
            color: '#ffffff',
          }
        }}
      >
        <MenuItem onClick={() => currentTask && restoreTask(currentTask._id)}>
          <ListItemIcon>
            <FaUndoAlt fontSize="small" style={{ color: '#7b68ee' }} />
          </ListItemIcon>
          <ListItemText>Restore</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => currentTask && deleteTaskPermanently(currentTask._id)}>
          <ListItemIcon>
            <MdDelete fontSize="small" style={{ color: '#f44336' }} />
          </ListItemIcon>
          <ListItemText>Delete Permanently</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Trash;
