import { useState, useEffect, useRef, useMemo } from "react";
import { IoMdAdd } from "react-icons/io";
import { FaList, FaUserClock, FaRegCalendarAlt, FaSortAmountDown } from "react-icons/fa";
import { MdClose, MdGridView, MdOutlineSearch, MdFilterList, MdBarChart } from "react-icons/md";
import {
  Tabs, Tab, Stack, Typography, TextField, IconButton, Box, Button,
  CircularProgress, useMediaQuery, Card, CardContent, Grid, LinearProgress,
  MenuItem, Select, InputAdornment, Chip, Tooltip, Avatar,
  Paper, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, Divider, FormControl, InputLabel, Collapse, Pagination, Badge
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
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

// --- Components ---

const StatCard = ({ title, count, total, color, icon, percentage }) => (
  <Card sx={{
    height: '100%',
    position: 'relative',
    overflow: 'visible',
    borderRadius: 3,
    bgcolor: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)'
  }}>
    <CardContent sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="start" mb={2}>
        <Box>
          <Typography variant="subtitle2" color="#94a3b8" fontWeight="600" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="800" color="#fff">
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
      <Typography variant="caption" color="#64748b">
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
  const [selected, setSelected] = useState(0);
  const [offendersPage, setOffendersPage] = useState(1);
  // 0 = Board, 1 = List
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

  // Analytics aggregation
  const analytics = useMemo(() => {
    const stats = {
      byOwner: {},
      byReason: {},
      bySubReason: {},
      byRootCause: {},
      byFieldTeam: {},
      fieldTeamDetails: {}
    };

    filteredTasks.forEach(task => {
      // For AssignedToMe, "owner" is usually me, but maybe we want "Responsible" or "Created By"? 
      // Let's stick to the same pattern: responsible or assignedTo name.
      const owner = task.responsible || task.assignedTo?.name || 'Unassigned';
      const reason = task.reason || 'N/A';
      const subReason = task.subReason || 'N/A';
      const rootCause = task.rootCause || 'N/A';
      const fieldTeam = task.teamName || 'Unassigned';
      const category = task.category || 'N/A';

      stats.byOwner[owner] = (stats.byOwner[owner] || 0) + 1;
      stats.byReason[reason] = (stats.byReason[reason] || 0) + 1;
      stats.bySubReason[subReason] = (stats.bySubReason[subReason] || 0) + 1;
      stats.byRootCause[rootCause] = (stats.byRootCause[rootCause] || 0) + 1;
      stats.byFieldTeam[fieldTeam] = (stats.byFieldTeam[fieldTeam] || 0) + 1;

      if (!stats.fieldTeamDetails[fieldTeam]) {
        stats.fieldTeamDetails[fieldTeam] = {
          total: 0,
          byCategory: {},
          byOwner: {},
          byReason: {},
          bySubReason: {},
          byRootCause: {}
        };
      }

      const teamStats = stats.fieldTeamDetails[fieldTeam];
      teamStats.total += 1;
      teamStats.byCategory[category] = (teamStats.byCategory[category] || 0) + 1;
      teamStats.byOwner[owner] = (teamStats.byOwner[owner] || 0) + 1;
      teamStats.byReason[reason] = (teamStats.byReason[reason] || 0) + 1;
      teamStats.bySubReason[subReason] = (teamStats.bySubReason[subReason] || 0) + 1;
      teamStats.byRootCause[rootCause] = (teamStats.byRootCause[rootCause] || 0) + 1;
    });

    const toChartData = (obj) => Object.entries(obj)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Get all field teams (offenders)
    const topFieldTeams = toChartData(stats.byFieldTeam);

    const fieldTeamAnalytics = topFieldTeams.map(team => ({
      teamName: team.name,
      totalIssues: team.value,
      categories: toChartData(stats.fieldTeamDetails[team.name]?.byCategory || {}),
      owners: toChartData(stats.fieldTeamDetails[team.name]?.byOwner || {}).slice(0, 5),
      reasons: toChartData(stats.fieldTeamDetails[team.name]?.byReason || {}).slice(0, 5),
      subReasons: toChartData(stats.fieldTeamDetails[team.name]?.bySubReason || {}).slice(0, 5),
      rootCauses: toChartData(stats.fieldTeamDetails[team.name]?.byRootCause || {}).slice(0, 5)
    }));

    return {
      ownerData: toChartData(stats.byOwner).slice(0, 10),
      reasonData: toChartData(stats.byReason).slice(0, 8),
      subReasonData: toChartData(stats.bySubReason).slice(0, 10),
      rootCauseData: toChartData(stats.byRootCause).slice(0, 10),
      fieldTeamAnalytics
    };
  }, [filteredTasks]);

  const handleSearch = (term) => {
    setSearchTerm(term);

    // Sort logic
    let source = searchTerm || selected === 1 ? allTasks : infiniteTasks; // If searching or list view, use allTasks
    if (selected === 1) source = allTasks; // Always use all data for DataGrid for now to enable client-side sort/filter

    let filtered = source;

    if (term) {
      const lowerTerm = term.toLowerCase();
      filtered = source.filter((task) =>
        task.slid?.toLowerCase().includes(lowerTerm) ||
        task.customerName?.toLowerCase().includes(lowerTerm) ||
        task.governorate?.toLowerCase().includes(lowerTerm) ||
        task.teamName?.toLowerCase().includes(lowerTerm) ||
        task.teamCompany?.toLowerCase().includes(lowerTerm) ||
        task.category?.toLowerCase().includes(lowerTerm) ||
        task.priority?.toLowerCase().includes(lowerTerm)
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
    // When switching to List view (1) or Analytics view (2), show all tasks
    // When switching to Board view (0), show infinite scroll tasks or filtered result
    if (newValue === 1 || newValue === 2) {
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
    {
      field: 'teamName',
      headerName: 'Field Team',
      width: 180,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="600">{params.row.teamName || "N/A"}</Typography>
          <Typography variant="caption" color="textSecondary">{params.row.teamCompany}</Typography>
        </Box>
      )
    },
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
      <Paper sx={{
        mb: 3,
        borderRadius: 3,
        p: 2,
        overflow: 'hidden',
        bgcolor: 'rgba(30, 41, 59, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }} elevation={0}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>

          <Tabs
            value={selected}
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48, color: 'rgba(255, 255, 255, 0.6)' },
              '& .Mui-selected': { color: '#3b82f6' },
              '& .MuiTabs-indicator': { bgcolor: '#3b82f6' }
            }}
          >
            <Tab icon={<MdGridView />} iconPosition="start" label="Board View" />
            <Tab icon={<FaList />} iconPosition="start" label="List View" />
            <Tab icon={<MdBarChart />} iconPosition="start" label="Analytics" />
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
                    <MdOutlineSearch color="inherit" sx={{ opacity: 0.6 }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch} sx={{ color: '#fff', opacity: 0.6 }}><MdClose /></IconButton>
                  </InputAdornment>
                )
              }}
              sx={{
                width: { xs: '100%', md: 240 },
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 2,
                '& .MuiOutlinedInput-root': { color: '#fff' },
                '& fieldset': { border: 'none' }
              }}
            />

            <TextField
              select
              label="Validation"
              value={validationFilter}
              onChange={(e) => setValidationFilter(e.target.value)}
              size="small"
              sx={{
                minWidth: 150,
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 2,
                '& .MuiOutlinedInput-root': { color: '#fff' },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.5)' },
                '& fieldset': { border: 'none' }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MdFilterList color="inherit" sx={{ opacity: 0.6 }} size={18} />
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
              sx={{
                minWidth: 150,
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 2,
                '& .MuiOutlinedInput-root': { color: '#fff' },
                '& fieldset': { border: 'none' }
              }}
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
      ) : selected === 1 ? (
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
              '& .MuiDataGrid-columnHeaders': { bgcolor: 'rgba(30, 41, 59, 0.8)', color: '#fff', fontWeight: 'bold' }
            }}
          />
        </Paper>
      ) : (
        // Analytics View
        <Box sx={{
          p: 2,
          mb: 2,
          bgcolor: 'rgba(30, 41, 59, 0.5)',
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)'
        }}>
          <Grid container spacing={3}>
            {/* Owner Analysis */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'rgba(0, 0, 0, 0.2)', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.05)' }} elevation={0}>
                <Typography variant="h6" fontWeight="700" mb={2} color="#fff">
                  Owner Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.ownerData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Reason Breakdown */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'rgba(0, 0, 0, 0.2)', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.05)' }} elevation={0}>
                <Typography variant="h6" fontWeight="700" mb={2} color="#fff">
                  Reason Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={analytics.reasonData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.reasonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'][index % 8]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Sub-reason Distribution */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'rgba(0, 0, 0, 0.2)', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.05)' }} elevation={0}>
                <Typography variant="h6" fontWeight="700" mb={2} color="#fff">
                  Sub-reason Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.subReasonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                    <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Root Cause Analysis */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'rgba(0, 0, 0, 0.2)', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.05)' }} elevation={0}>
                <Typography variant="h6" fontWeight="700" mb={2} color="#fff">
                  Root Cause Analysis
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.rootCauseData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* Field Team Offenders Section using Blue Theme */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" fontWeight="700" mb={3} color="#3b82f6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              🚨 Top Field Team Offenders
            </Typography>

            {analytics.fieldTeamAnalytics && analytics.fieldTeamAnalytics.length > 0 ? (
              <Grid container spacing={2}>
                {analytics.fieldTeamAnalytics
                  .slice((offendersPage - 1) * 10, offendersPage * 10)
                  .map((team, idx) => (
                    <Grid item xs={12} key={idx}>
                      <Paper sx={{
                        p: 2,
                        bgcolor: 'rgba(30,30,30,0.8)',
                        borderRadius: 2,
                        border: '2px solid rgba(59, 130, 246, 0.3)',
                        '&:hover': { borderColor: 'rgba(59, 130, 246, 0.6)' }
                      }} elevation={0}>
                        {/* Team Header */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Box>
                            <Typography variant="h6" fontWeight="700" color="#fff">
                              #{(offendersPage - 1) * 10 + idx + 1} {team.teamName}
                            </Typography>
                            <Typography variant="body2" color="#b3b3b3">
                              Total Issues: <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{team.totalIssues}</span>
                            </Typography>
                          </Box>
                        </Box>

                        {/* Categories Breakdown */}
                        <Grid container spacing={2}>
                          {/* Category Distribution */}
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" fontWeight="600" mb={1} color="#f59e0b">
                              📊 Issue Categories
                            </Typography>
                            <ResponsiveContainer width="100%" height={150}>
                              <PieChart>
                                <Pie
                                  data={team.categories}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                  outerRadius={50}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {team.categories.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][index % 5]} />
                                  ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ backgroundColor: '#1e1e1e', border: 'none' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </Grid>

                          {/* Top Owners - Show all but scrollable if many */}
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" fontWeight="600" mb={1} color="#3b82f6">
                              👤 Top Owners
                            </Typography>
                            <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
                              {team.owners.map((owner, i) => (
                                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, p: 0.5, bgcolor: 'rgba(59, 130, 246, 0.1)', borderRadius: 1 }}>
                                  <Typography variant="caption" color="#fff">{owner.name}</Typography>
                                  <Typography variant="caption" fontWeight="bold" color="#3b82f6">{owner.value}</Typography>
                                </Box>
                              ))}
                            </Box>
                          </Grid>

                          {/* Top Reasons */}
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" fontWeight="600" mb={1} color="#f59e0b">
                              📋 Top Reasons
                            </Typography>
                            <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
                              {team.reasons.map((reason, i) => (
                                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, p: 0.5, bgcolor: 'rgba(245, 158, 11, 0.1)', borderRadius: 1 }}>
                                  <Typography variant="caption" color="#fff">{reason.name}</Typography>
                                  <Typography variant="caption" fontWeight="bold" color="#f59e0b">{reason.value}</Typography>
                                </Box>
                              ))}
                            </Box>
                          </Grid>

                          {/* Top Sub-reasons */}
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" fontWeight="600" mb={1} color="#a78bfa">
                              📌 Top Sub-reasons
                            </Typography>
                            <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
                              {team.subReasons.map((subReason, i) => (
                                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, p: 0.5, bgcolor: 'rgba(167, 139, 250, 0.1)', borderRadius: 1 }}>
                                  <Typography variant="caption" color="#fff">{subReason.name}</Typography>
                                  <Typography variant="caption" fontWeight="bold" color="#a78bfa">{subReason.value}</Typography>
                                </Box>
                              ))}
                            </Box>
                          </Grid>

                          {/* Top Root Causes */}
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" fontWeight="600" mb={1} color="#10b981">
                              🔍 Top Root Causes
                            </Typography>
                            <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
                              {team.rootCauses.map((rootCause, i) => (
                                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, p: 0.5, bgcolor: 'rgba(16, 185, 129, 0.1)', borderRadius: 1 }}>
                                  <Typography variant="caption" color="#fff">{rootCause.name}</Typography>
                                  <Typography variant="caption" fontWeight="bold" color="#10b981">{rootCause.value}</Typography>
                                </Box>
                              ))}
                            </Box>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  ))}
              </Grid>
            ) : (
              <Typography variant="body2" color="#b3b3b3" textAlign="center" py={4}>
                No field team data available
              </Typography>
            )}

            {/* Pagination Controls */}
            {analytics.fieldTeamAnalytics && analytics.fieldTeamAnalytics.length > 10 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
                <Pagination
                  count={Math.ceil(analytics.fieldTeamAnalytics.length / 10)}
                  page={offendersPage}
                  onChange={(e, v) => setOffendersPage(v)}
                  color="primary"
                  sx={{
                    '& .MuiPaginationItem-root': { color: '#fff' },
                    '& .Mui-selected': { bgcolor: 'rgba(59, 130, 246, 0.3) !important' }
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>
      )}

      <AddTask open={open} setOpen={setOpen} setUpdateRefetchTasks={setUpdateRefetchTasks} />
    </Box>
  );
};

export default AssignedToMe;