import { useState, useEffect, useRef, useMemo } from "react";
import { IoMdAdd } from "react-icons/io";
import { FaList, FaUserClock, FaRegCalendarAlt, FaSortAmountDown } from "react-icons/fa";
import { MdClose, MdGridView, MdOutlineSearch, MdFilterList } from "react-icons/md";
import {
  Tabs, Tab, Stack, Typography, TextField, IconButton, Box, Button,
  CircularProgress, useMediaQuery, Card, CardContent, Grid, LinearProgress,
  MenuItem, Select, InputAdornment, Chip, Tooltip, Avatar,
  Paper
} from "@mui/material";
import { HourglassEmpty, PlayCircle, CheckCircle, Cancel } from "@mui/icons-material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import AddTask from "../components/task/AddTask";
import api from "../api/api";
import { PulseLoader } from "react-spinners";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import TaskCard from "../components/TaskCard";
import { useSelector } from "react-redux";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

// --- Components ---

const StatCard = ({ title, count, total, color, icon, percentage }) => (
  <Card sx={{ height: '100%', position: 'relative', overflow: 'visible', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
    <CardContent sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="start" mb={2}>
        <Box>
          <Typography variant="subtitle2" color="textSecondary" fontWeight="600" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="800" color="textPrimary">
            {count}
          </Typography>
        </Box>
        <Avatar
          variant="rounded"
          sx={{
            bgcolor: `${color}15`, // Light opacity background
            color: color,
            width: 48,
            height: 48,
            borderRadius: 2
          }}
        >
          {icon}
        </Avatar>
      </Stack>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <LinearProgress
          variant="determinate"
          value={percentage || 0}
          sx={{
            flexGrow: 1,
            height: 6,
            borderRadius: 5,
            bgcolor: `${color}20`,
            '& .MuiLinearProgress-bar': {
              bgcolor: color,
              borderRadius: 5,
            }
          }}
        />
        <Typography variant="caption" sx={{ ml: 2, fontWeight: 'bold', color: color }}>
          {percentage.toFixed(0)}%
        </Typography>
      </Box>
      <Typography variant="caption" color="textSecondary">
        {count} of {total} tasks
      </Typography>
    </CardContent>
  </Card>
);

const TABS = [
  { title: "Board View", icon: <MdGridView /> },
  { title: "List View", icon: <FaList /> },
];

const AssignedToMe = () => {
  const user = useSelector((state) => state?.auth?.user);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(0); // 0 = Board, 1 = List
  const [open, setOpen] = useState(false);
  const [updateRefetchTasks, setUpdateRefetchTasks] = useState(false);
  const [updateStateDuringSave, setUpdateStateDuringSave] = useState(false);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [validationFilter, setValidationFilter] = useState("all");
  const [allTasks, setAllTasks] = useState([]);
  const searchInputRef = useRef(null);
  const { ref, inView } = useInView();
  const [trashActionState, setTrashActionState] = useState({
    loading: false,
    error: null,
    success: false
  });

  const isSmallScreen = useMediaQuery('(max-width:600px)');
  const isMediumScreen = useMediaQuery('(max-width:900px)');

  // --- Data Fetching ---

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get("/users/get-all-users", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        setUsers(data);
      } catch (error) {
        // console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchAllTasks = async () => {
      try {
        const { data } = await api.get(`/tasks/get-assigned-tasks?validationStatus=${validationFilter}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        setAllTasks(data);
        setFilteredTasks(data); // Initial set
      } catch (error) {
        // console.error("Error fetching all tasks:", error);
      }
    };
    fetchAllTasks();
  }, [updateStateDuringSave, updateRefetchTasks, user, validationFilter]);

  const TASKS_PER_PAGE = 5;

  const fetchTasks = async ({ pageParam = 1 }) => {
    try {
      const { data } = await api.get(`/tasks/get-paginated-assigned-tasks?page=${pageParam}&validationStatus=${validationFilter}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return data;
    } catch (error) {
      throw error;
    }
  };

  const { data, status, error, fetchNextPage, isFetchingNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['assigned-to-me-tasks', validationFilter],
    queryFn: fetchTasks,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < TASKS_PER_PAGE) {
        return undefined;
      }
      return allPages.length + 1;
    }
  });

  useEffect(() => {
    if (inView && hasNextPage && !searchTerm && selected === 0) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage, searchTerm, selected]);

  const infiniteTasks = useMemo(() => (data ? data.pages.flat() : []), [data]);

  // Sync filtered tasks with infinite scroll data ONLY in Board View and when NOT searching
  useEffect(() => {
    if (selected === 0 && !searchTerm && infiniteTasks.length > 0) {
      setFilteredTasks(infiniteTasks);
    }
  }, [infiniteTasks, searchTerm, selected]);


  // --- Logic & Handlers ---

  const calculateStatusStats = () => {
    const totalTasks = allTasks.length;
    if (totalTasks === 0) return { todo: { count: 0, percentage: 0 }, inProgress: { count: 0, percentage: 0 }, closed: { count: 0, percentage: 0 } };

    let todo = 0, inProgress = 0, closed = 0;
    allTasks.forEach(task => {
      if (task.status === "Closed") {
        closed++;
      } else if (task.status === "In Progress") {
        inProgress++;
      } else {
        todo++;
      }
    });

    return {
      todo: { count: todo, percentage: (todo / totalTasks) * 100 },
      inProgress: { count: inProgress, percentage: (inProgress / totalTasks) * 100 },
      closed: { count: closed, percentage: (closed / totalTasks) * 100 },
    };
  };

  const statusStats = calculateStatusStats();

  const handleSearch = (term) => {
    setSearchTerm(term);

    // Sort logic
    let source = searchTerm || selected === 1 ? allTasks : infiniteTasks; // If searching or list view, use allTasks
    if (selected === 1) source = allTasks; // Always use all data for DataGrid for now to enable client-side sort/filter

    let filtered = source;

    if (term) {
      filtered = source.filter((task) =>
        task.slid?.toLowerCase().includes(term.toLowerCase()) ||
        task.customerName?.toLowerCase().includes(term.toLowerCase()) ||
        task.governorate?.toLowerCase().includes(term.toLowerCase())
      );
    }

    // Apply Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date);
      const dateB = new Date(b.createdAt || b.date);
      if (sortBy === "newest") return dateB - dateA;
      if (sortBy === "oldest") return dateA - dateB;
      // Add more sort options if needed
      return 0;
    });

    setFilteredTasks(filtered);
  };

  useEffect(() => {
    handleSearch(searchTerm);
  }, [sortBy, allTasks]); // Re-run when sort changes or data updates

  const handleClearSearch = () => {
    setSearchTerm("");
    if (searchInputRef.current) searchInputRef.current.value = "";
    handleSearch("");
  };

  const handleTabChange = (event, newValue) => {
    setSelected(newValue);
    // When switching to List view, show all tasks (client side paging)
    // When switching to Board view, show infinite scroll tasks or filtered result
    if (newValue === 1) {
      setFilteredTasks(allTasks);
    } else {
      if (searchTerm) {
        handleSearch(searchTerm);
      } else {
        setFilteredTasks(infiniteTasks);
      }
    }
  };

  // --- Actions ---

  const handleTaskUpdate = (updatedTask) => {
    setFilteredTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
    setAllTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
  };

  const executeTaskAction = async (actionType, taskId) => {
    const confirmMessage = actionType === 'delete'
      ? "Are you sure you want to move this task to trash?"
      : "Are you sure you want to archive this task?";

    if (!window.confirm(confirmMessage)) return;

    setTrashActionState({ loading: true, error: null, success: false });

    try {
      const { data: taskData } = await api.get(`/tasks/get-task/${taskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });

      if (!taskData) throw new Error("Task not found");

      const endpoint = actionType === 'delete' ? '/trash/add-trash' : '/archive/add-archive';
      const payload = actionType === 'delete'
        ? { ...taskData, deletedBy: user._id, deletionReason: 'Deleted by user', deletedAt: new Date() }
        : { taskData, archivedBy: user._id, archivedAt: new Date(), archiveReason: 'Archived by user' };

      const response = await api.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });

      if (response.status === 201) {
        await api.delete(`/tasks/delete-task/${taskId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
        });

        // Update UI
        const updateFilter = (prev) => prev.filter(t => t._id !== taskId);
        setFilteredTasks(updateFilter);
        setAllTasks(updateFilter);

        alert(`Task ${actionType === 'delete' ? 'moved to trash' : 'archived'} successfully`);
      } else {
        throw new Error(`Failed to ${actionType} task`);
      }
      setTrashActionState({ loading: false, error: null, success: true });
    } catch (error) {
      alert(`Error: ${error.message}`);
      setTrashActionState({ loading: false, error: error.message, success: false });
    }
  };

  const handleFavoriteClick = async (task) => {
    try {
      const response = await api.post("/favourites/add-favourite", { task, userId: user._id }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (response.status === 201) alert("Task added to favorites!");
      else if (response.data?.isAlreadyFavorited) alert("Already in favorites!");
    } catch (error) {
      alert("Failed to add to favorites.");
    }
  };

  // --- Columns for DataGrid ---
  const columns = [
    { field: 'slid', headerName: 'SLID', width: 120, renderCell: (params) => <Typography fontWeight="bold" color="primary">{params.value}</Typography> },
    { field: 'customerName', headerName: 'Customer Name', flex: 1, minWidth: 150 },
    { field: 'governorate', headerName: 'Governorate', width: 130 },
    {
      field: 'summary',
      headerName: 'Summary',
      width: 200,
      renderCell: (params) => (
        <Typography variant="caption" sx={{ color: '#2196f3', fontWeight: '500' }}>
          {params.row.subTasks?.[0]?.title === "Task Reception" ? params.row.subTasks[0].shortNote : ""}
        </Typography>
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => {
        let color = 'default';
        if (params.value === 'Done' || params.value === 'Closed') color = 'success';
        else if (params.value === 'In Progress') color = 'primary';
        else if (params.value === 'Todo' || params.value === 'Open') color = 'warning';
        return <Chip label={params.value || 'Open'} color={color} size="small" variant="outlined" />;
      }
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value || 'Medium'}
          size="small"
          sx={{
            bgcolor: params.value === 'High' ? '#fee2e2' : params.value === 'Low' ? '#dcfce7' : '#fef3c7',
            color: params.value === 'High' ? '#ef4444' : params.value === 'Low' ? '#16a34a' : '#d97706',
            fontWeight: 'bold'
          }}
        />
      )
    },
    {
      field: 'createdAt',
      headerName: 'Created At',
      width: 160,
      valueFormatter: (params) => params.value ? format(new Date(params.value), "MMM dd, yyyy") : 'N/A'
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Button variant="contained" size="small" onClick={() => navigate(`/tasks/view-task/${params.row._id}`)}>
          View
        </Button>
      )
    }
  ];

  return (
    <Box sx={{ p: isSmallScreen ? 0 : 3, minHeight: '100vh' }}>

      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'start', md: 'center' }} mb={4} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight="800" color="#647897ff">
            Assigned To Me
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage and track your assigned tasks efficiently.
          </Typography>
        </Box>
        {user && user.role === "Admin" && (
          <Button
            variant="contained"
            startIcon={<IoMdAdd />}
            onClick={() => setOpen(true)}
            sx={{
              bgcolor: '#2563eb',
              '&:hover': { bgcolor: '#1d4ed8' },
              borderRadius: 2,
              textTransform: 'none',
              px: 3,
              py: 1
            }}
          >
            Create New Task
          </Button>
        )}
      </Stack>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="To Do"
            count={statusStats.todo.count}
            total={allTasks.length}
            percentage={statusStats.todo.percentage}
            color="#f59e0b" // Amber
            icon={<HourglassEmpty />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="In Progress"
            count={statusStats.inProgress.count}
            total={allTasks.length}
            percentage={statusStats.inProgress.percentage}
            color="#3b82f6" // Blue
            icon={<PlayCircle />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Completed"
            count={statusStats.closed.count}
            total={allTasks.length}
            percentage={statusStats.closed.percentage}
            color="#10b981" // Emerald
            icon={<CheckCircle />}
          />
        </Grid>
      </Grid>

      {/* Toolbar & Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 3, p: 2, overflow: 'hidden' }} elevation={0}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>

          <Tabs
            value={selected}
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48 },
              '& .Mui-selected': { color: '#2563eb' }
            }}
          >
            <Tab icon={<MdGridView />} iconPosition="start" label="Board View" />
            <Tab icon={<FaList />} iconPosition="start" label="List View" />
          </Tabs>

          <Stack direction="row" spacing={2} sx={{ width: { xs: '100%', md: 'auto' } }}>
            <TextField
              placeholder="Search tasks..."
              size="small"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              inputRef={searchInputRef}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MdOutlineSearch color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}><MdClose /></IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ width: { xs: '100%', md: 240 }, bgcolor: '#f1f5f9', borderRadius: 2, '& fieldset': { border: 'none' } }}
            />

            <TextField
              select
              label="Validation"
              value={validationFilter}
              onChange={(e) => setValidationFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 150, bgcolor: '#f1f5f9', borderRadius: 2, '& fieldset': { border: 'none' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MdFilterList color="action" size={18} />
                  </InputAdornment>
                ),
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="Validated">Validated</MenuItem>
              <MenuItem value="Not validated">Not Validated</MenuItem>
            </TextField>

            <TextField
              select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
              }}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FaSortAmountDown color="action" size={14} />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 150, bgcolor: '#f1f5f9', borderRadius: 2, '& fieldset': { border: 'none' } }}
            >
              <MenuItem value="newest">Newest First</MenuItem>
              <MenuItem value="oldest">Oldest First</MenuItem>
            </TextField>
          </Stack>
        </Stack>
      </Paper>

      {/* Content Area */}
      {selected === 0 ? (
        // Board View
        <Box>
          {filteredTasks.length === 0 ? (
            <Box textAlign="center" py={10}>
              <Typography variant="h6" color="textSecondary">No tasks found</Typography>
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: isSmallScreen ? '1fr' : isMediumScreen ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 3
                }}
              >
                {filteredTasks.map((task, index) => (
                  <TaskCard
                    key={`task-${task._id}-${index}`}
                    task={task}
                    users={users}
                    handleTaskUpdate={handleTaskUpdate}
                    handleTaskDelete={(id) => executeTaskAction('delete', id)}
                    handleTaskArchive={(id) => executeTaskAction('archive', id)}
                    handleFavoriteClick={handleFavoriteClick}
                    setUpdateStateDuringSave={setUpdateStateDuringSave}
                    trashActionState={trashActionState}
                  />
                ))}
              </Box>

              {/* Infinite Scroll Loader for Board View */}
              <Box sx={{ my: 4, display: 'flex', justifyContent: 'center' }} ref={ref}>
                {isFetchingNextPage && <PulseLoader speedMultiplier={2} size={10} color="#2563eb" />}
              </Box>
            </>
          )}
        </Box>
      ) : (
        // List View (DataGrid)
        <Paper sx={{ height: 600, width: '100%', borderRadius: 3, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <DataGrid
            rows={filteredTasks} // Use filteredTasks for full sorting/filtering capability on client side for now
            columns={columns}
            getRowId={(row) => row._id}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
            }}
            pageSizeOptions={[5, 10, 25]}
            checkboxSelection
            disableRowSelectionOnClick
            slots={{ toolbar: GridToolbar }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': { borderBottom: '1px solid #f1f5f9' },
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc', fontWeight: 'bold' }
            }}
          />
        </Paper>
      )}

      <AddTask open={open} setOpen={setOpen} setUpdateRefetchTasks={setUpdateRefetchTasks} />
    </Box>
  );
};

export default AssignedToMe;