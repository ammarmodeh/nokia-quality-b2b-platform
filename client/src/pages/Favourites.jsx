import { useEffect, useState, useCallback } from "react";
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
import {
  MdVisibility,
  MdDelete,
  MdMoreVert,
  MdRefresh
} from 'react-icons/md';
import { useSelector } from "react-redux";
import api from "../api/api";
import LoadingSpinner from '../components/common/LoadingSpinner';
import { format, parseISO } from "date-fns";
import { useNavigate, useLocation } from "react-router-dom";

const Favourite = () => {
  const user = useSelector((state) => state?.auth?.user);
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width:503px)');

  const fetchFavourites = useCallback(async () => {
    try {
      const response = await api.get("/favourites/get-favourites", {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      setFavourites(response.data.favourites || []);
    } catch (err) {
      // console.error("Error fetching favorites:", err);
      setError("Failed to load favorites. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavourites();
  }, [fetchFavourites]);

  const handleMenuOpen = (event, task) => {
    setAnchorEl(event.currentTarget);
    setCurrentTask(task);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setCurrentTask(null);
  };

  const handleDeleteFavourite = async () => {
    if (!currentTask) return;

    try {
      await api.delete(`/favourites/delete-favourite/${currentTask._id}/${user._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      setFavourites(favourites.filter(fav => fav._id !== currentTask._id));
      alert("Removed from favorites successfully!");
    } catch (err) {
      // console.error("Error deleting favorite:", err);
      alert("Failed to remove from favorites. Please try again.");
    } finally {
      handleMenuClose();
    }
  };

  const handleViewTask = (task) => {
    navigate(`/tasks/view-task/${task.originalTaskId}`, {
      state: {
        from: location.pathname,
        isFavourite: true
      }
    });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return <LoadingSpinner variant="page" />;
  }

  if (error) {
    return (
      <Box p={4}>
        <Typography color="error">{error}</Typography>
        <Button
          onClick={fetchFavourites}
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
          mb: 2
        }}>
          Favorite Tasks
        </Typography>

        {/* Favorites Table */}
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
                <TableCell>Contact</TableCell>
                <TableCell>Customer Feedback</TableCell>
                <TableCell>Interview Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {favourites.length > 0 ? (
                favourites
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((task) => (
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
                        {task.interviewDate ? format(parseISO(task.interviewDate), 'dd/MM/yyyy') : "-"}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          {/* <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleViewTask(task)}
                            sx={{ color: '#7b68ee' }}
                          >
                            <MdVisibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove from Favorites">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={(e) => handleMenuOpen(e, task)}
                            sx={{ color: '#ff4081' }}
                          >
                            <MdStar />
                          </IconButton>
                        </Tooltip> */}
                          <Tooltip title="More options">
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, task)}
                              sx={{ color: '#b3b3b3' }}
                            >
                              <MdMoreVert />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#ffffff' }}>
                    No favorite tasks found
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
            count={favourites.length}
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
          <MenuItem onClick={() => currentTask && handleViewTask(currentTask)}>
            <ListItemIcon>
              <MdVisibility fontSize="small" style={{ color: '#7b68ee' }} />
            </ListItemIcon>
            <ListItemText>View Details</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleDeleteFavourite}>
            <ListItemIcon>
              <MdDelete fontSize="small" style={{ color: '#f44336' }} />
            </ListItemIcon>
            <ListItemText>Remove from Favorites</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default Favourite;