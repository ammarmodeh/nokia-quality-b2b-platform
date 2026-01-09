import { useState, useEffect, useRef, useMemo } from "react";
import { IoMdAdd } from "react-icons/io";
import { FaList, FaSortAmountDown } from "react-icons/fa";
import { MdClose, MdGridView, MdOutlineSearch } from "react-icons/md";
import {
  Tabs, Tab, Stack, Typography, TextField, IconButton, Box, Button,
  CircularProgress, useMediaQuery, Card, CardContent, Grid, LinearProgress,
  MenuItem, Chip, Avatar, Paper, InputAdornment
} from "@mui/material";
import { HourglassEmpty, PlayCircle, CheckCircle } from "@mui/icons-material";
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
            bgcolor: `${color}15`,
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

const AssignedNeutral = () => {
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
  const [allTasks, setAllTasks] = useState([]);
  const searchInputRef = useRef(null);
  const { ref, inView } = useInView();

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
      } catch (error) { }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchAllTasks = async () => {
      try {
        const { data } = await api.get("/tasks/get-neutral-assigned-tasks", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });

        // Filter tasks assigned to current user
        const userId = user?._id;
        if (!userId) return;

        const myTasks = data.filter((task) =>
          Array.isArray(task.assignedTo) && task.assignedTo.some(id => id === userId || id._id === userId)
        );

        setAllTasks(myTasks);
        setFilteredTasks(myTasks);
      } catch (error) { }
    };
    if (user?._id) fetchAllTasks();
  }, [updateStateDuringSave, updateRefetchTasks, user]);

  const TASKS_PER_PAGE = 5;

  const fetchTasks = async ({ pageParam = 1 }) => {
    try {
      const { data } = await api.get(`/tasks/get-paginated-neutral-assigned-tasks?page=${pageParam}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      return data;
    } catch (error) {
      throw error;
    }
  };

  const { data, status, error, fetchNextPage, isFetchingNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['assigned-to-me-neutral-tasks'],
    queryFn: fetchTasks,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0 || lastPage.length < TASKS_PER_PAGE) return undefined;
      return allPages.length + 1;
    }
  });

  useEffect(() => {
    if (inView && hasNextPage && !searchTerm && selected === 0) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage, searchTerm, selected]);

  const infiniteTasks = useMemo(() => {
    if (!data) return [];
    const flat = data.pages.flat();
    const userId = user?._id;
    return flat.filter(task =>
      Array.isArray(task.assignedTo) && task.assignedTo.some(id => id === userId || id?._id === userId)
    );
  }, [data, user]);

  useEffect(() => {
    if (selected === 0 && !searchTerm && infiniteTasks.length > 0) {
      setFilteredTasks(infiniteTasks);
    }
  }, [infiniteTasks, searchTerm, selected]);


  // --- Logic ---

  const calculateStatusStats = () => {
    const totalTasks = allTasks.length;
    if (totalTasks === 0) return { todo: { count: 0, percentage: 0 }, inProgress: { count: 0, percentage: 0 }, closed: { count: 0, percentage: 0 } };

    let todo = 0, inProgress = 0, closed = 0;
    allTasks.forEach(task => {
      if (task.status === "Done" || task.status === "Closed") {
        closed++;
      } else if (task.status === "In Progress" || (task.subTasks && task.subTasks.some(st => st.progress > 0))) {
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
    let source = searchTerm || selected === 1 ? allTasks : infiniteTasks;
    if (selected === 1) source = allTasks;

    let filtered = source;
    if (term) {
      filtered = source.filter((task) =>
        task.slid?.toLowerCase().includes(term.toLowerCase()) ||
        task.customerName?.toLowerCase().includes(term.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date);
      const dateB = new Date(b.createdAt || b.date);
      if (sortBy === "newest") return dateB - dateA;
      if (sortBy === "oldest") return dateA - dateB;
      return 0;
    });

    setFilteredTasks(filtered);
  };

  useEffect(() => { handleSearch(searchTerm); }, [sortBy, allTasks]);

  const handleClearSearch = () => {
    setSearchTerm("");
    if (searchInputRef.current) searchInputRef.current.value = "";
    handleSearch("");
  };

  // --- Actions ---

  const handleTaskUpdate = (updatedTask) => {
    setFilteredTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
    setAllTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
  };

  const handleTaskDelete = async (taskId) => {
    const confirmDelete = window.confirm("Are you sure you want to move this task to trash?");
    if (!confirmDelete) return;

    try {
      const { data: taskData } = await api.get(`/tasks/get-task/${taskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });

      if (!taskData) { throw new Error("Task not found"); }

      const trashResponse = await api.post('/trash/add-trash', {
        ...taskData,
        deletedBy: user._id,
        deletionReason: 'Deleted by user',
        deletedAt: new Date()
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });

      if (trashResponse.status === 201) {
        await api.delete(`/tasks/delete-task/${taskId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
        });

        // Update UI
        const updateFilter = (prev) => prev.filter(t => t._id !== taskId);
        setFilteredTasks(updateFilter);
        setAllTasks(updateFilter);

        alert("Task moved to trash successfully");
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleTaskArchive = async (taskId) => {
    const confirmArchive = window.confirm("Are you sure you want to archive this task?");
    if (!confirmArchive) return;

    try {
      const { data: taskData } = await api.get(`/tasks/get-task/${taskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });

      if (!taskData) throw new Error("Task not found");

      const archiveResponse = await api.post('/archive/add-archive', {
        taskData,
        archivedBy: user._id,
        archivedAt: new Date(),
        archiveReason: 'Archived by user'
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });

      if (archiveResponse.status === 201) {
        await api.delete(`/tasks/delete-task/${taskId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
        });
        const updateFilter = (prev) => prev.filter(t => t._id !== taskId);
        setFilteredTasks(updateFilter);
        setAllTasks(updateFilter);
        alert("Task archived successfully");
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleFavoriteClick = async (task) => {
    try {
      const response = await api.post("/favourites/add-favourite", { task, userId: user._id }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (response.status === 201) alert("Task added to favorites!");
      else if (response.data?.isAlreadyFavorited) alert("Already in favorites!");
    } catch (error) { alert("Failed to add to favorites."); }
  };

  // --- Columns ---
  const columns = [
    { field: 'slid', headerName: 'SLID', width: 120, renderCell: (params) => <Typography fontWeight="bold" color="primary">{params.value}</Typography> },
    { field: 'customerName', headerName: 'Customer Name', flex: 1, minWidth: 150 },
    { field: 'governorate', headerName: 'Governorate', width: 130 },
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

      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'start', md: 'center' }} mb={4} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight="800" color="#647897ff">
            Assigned Neutrals
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage your neutral satisfaction tasks efficiently.
          </Typography>
        </Box>
        {user && user.role === "Admin" && (
          <Button
            variant="contained"
            startIcon={<IoMdAdd />}
            onClick={() => setOpen(true)}
            sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' }, borderRadius: 2, textTransform: 'none', px: 3, py: 1 }}
          >
            Create New Task
          </Button>
        )}
      </Stack>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="To Do" count={statusStats.todo.count} total={allTasks.length} percentage={statusStats.todo.percentage} color="#f59e0b" icon={<HourglassEmpty />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="In Progress" count={statusStats.inProgress.count} total={allTasks.length} percentage={statusStats.inProgress.percentage} color="#3b82f6" icon={<PlayCircle />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Completed" count={statusStats.closed.count} total={allTasks.length} percentage={statusStats.closed.percentage} color="#10b981" icon={<CheckCircle />} />
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3, borderRadius: 3, p: 2, overflow: 'hidden' }} elevation={0}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
          <Tabs value={selected} onChange={(e, v) => setSelected(v)} sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48 }, '& .Mui-selected': { color: '#2563eb' } }}>
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
                startAdornment: (<InputAdornment position="start"><MdOutlineSearch color="action" /></InputAdornment>),
                endAdornment: searchTerm && (<InputAdornment position="end"><IconButton size="small" onClick={handleClearSearch}><MdClose /></IconButton></InputAdornment>)
              }}
              sx={{ width: { xs: '100%', md: 240 }, bgcolor: '#f1f5f9', borderRadius: 2, '& fieldset': { border: 'none' } }}
            />
            <TextField
              select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              size="small"
              InputProps={{ startAdornment: (<InputAdornment position="start"><FaSortAmountDown color="action" size={14} /></InputAdornment>) }}
              sx={{ minWidth: 150, bgcolor: '#f1f5f9', borderRadius: 2, '& fieldset': { border: 'none' } }}
            >
              <MenuItem value="newest">Newest First</MenuItem>
              <MenuItem value="oldest">Oldest First</MenuItem>
            </TextField>
          </Stack>
        </Stack>
      </Paper>

      {selected === 0 ? (
        <Box>
          {filteredTasks.length === 0 ? (
            <Box textAlign="center" py={10}><Typography variant="h6" color="textSecondary">No tasks found</Typography></Box>
          ) : (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: isSmallScreen ? '1fr' : isMediumScreen ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: 3 }}>
                {filteredTasks.map((task, index) => (
                  <TaskCard
                    key={`task-${task._id}-${index}`}
                    task={task}
                    users={users}
                    handleTaskUpdate={handleTaskUpdate}
                    handleTaskDelete={(id) => handleTaskDelete(id)}
                    handleTaskArchive={(id) => handleTaskArchive(id)}
                    handleFavoriteClick={handleFavoriteClick}
                    setUpdateStateDuringSave={setUpdateStateDuringSave}
                  />
                ))}
              </Box>
              <Box sx={{ my: 4, display: 'flex', justifyContent: 'center' }} ref={ref}>
                {isFetchingNextPage && <PulseLoader speedMultiplier={2} size={10} color="#2563eb" />}
              </Box>
            </>
          )}
        </Box>
      ) : (
        <Paper sx={{ height: 600, width: '100%', borderRadius: 3, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <DataGrid
            rows={filteredTasks}
            columns={columns}
            getRowId={(row) => row._id}
            initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
            pageSizeOptions={[5, 10, 25]}
            checkboxSelection
            disableRowSelectionOnClick
            slots={{ toolbar: GridToolbar }}
            sx={{ border: 'none', '& .MuiDataGrid-cell': { borderBottom: '1px solid #f1f5f9' }, '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc', fontWeight: 'bold' } }}
          />
        </Paper>
      )}

      <AddTask open={open} setOpen={setOpen} setUpdateRefetchTasks={setUpdateRefetchTasks} />
    </Box>
  );
};

export default AssignedNeutral;