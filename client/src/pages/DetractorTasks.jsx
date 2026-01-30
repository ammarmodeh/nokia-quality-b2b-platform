import { useState, useEffect, useRef, useMemo } from "react";
import { IoMdAdd } from "react-icons/io";
import { FaList, FaWhatsapp, FaFileExcel, FaExchangeAlt, FaRegCalendarAlt } from "react-icons/fa";
import {
  MdClose,
  MdSearch,
  MdViewList,
  MdViewModule,
  MdFilterList,
  MdRefresh,
  MdWarning,
  MdCheckCircle,
  MdPendingActions,
  MdStream,
  MdBarChart
} from "react-icons/md";
import {
  Tabs, Tab, Stack, Typography, TextField, IconButton, Box, Button,
  useMediaQuery, Paper, Chip, Tooltip,
  Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, Divider, MenuItem, FormControl, InputLabel, Select, Grid, Collapse, InputAdornment,
  Badge
} from "@mui/material";
import { HourglassEmpty, PlayCircle, CheckCircle, Warning, Info } from "@mui/icons-material";
import { useTheme } from '@mui/material/styles';
import AddTask from "../components/task/AddTask";
import api from "../api/api";
import { PulseLoader } from "react-spinners";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import TaskCard from "../components/TaskCard";
import { useSelector } from "react-redux";
import * as XLSX from "xlsx";
import moment from "moment";
import { toast } from "sonner";
import LoadingSpinner from "../components/common/LoadingSpinner"; // Assuming this exists or using PulseLoader
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

const statusConfig = {
  Todo: { icon: <HourglassEmpty fontSize="small" />, color: "#eab308", bg: "rgba(234, 179, 8, 0.1)" },
  "In Progress": { icon: <PlayCircle fontSize="small" />, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
  Closed: { icon: <CheckCircle fontSize="small" />, color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" },
};

const priorityConfig = {
  High: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
  Medium: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
  Low: { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
};

const DetractorTasks = () => {
  const user = useSelector((state) => state?.auth?.user);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  // State
  const [users, setUsers] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'list' | 'grid'
  const [open, setOpen] = useState(false);
  const [dateSettings, setDateSettings] = useState({});
  const [updateRefetchTasks, setUpdateRefetchTasks] = useState(false);
  const [updateStateDuringSave, setUpdateStateDuringSave] = useState(false);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [allTasks, setAllTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [fieldTeams, setFieldTeams] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Advanced Filters State
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [validationFilter, setValidationFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");

  const searchInputRef = useRef(null);
  const { ref: loadMoreRef, inView } = useInView();

  // Fetch all users and field teams
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, teamsRes, settingsRes] = await Promise.all([
          api.get("/users/get-all-users", { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }),
          api.get("/field-teams/get-field-teams", { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }),
          api.get("/settings", { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } })
        ]);
        setUsers(usersRes.data);
        setFieldTeams(teamsRes.data);
        setDateSettings(settingsRes.data);
      } catch (error) { }
    };
    fetchData();
  }, []);

  // Fetch ALL detractor tasks for analytics and CSV
  useEffect(() => {
    const fetchAllTasks = async () => {
      try {
        const { data } = await api.get("/tasks/get-detractor-tasks", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        // Verify evaluationScore mapping
        const detractors = data.filter((task) => task.evaluationScore >= 1 && task.evaluationScore <= 6);
        setAllTasks(detractors);
      } catch (error) { }
    };
    fetchAllTasks();
  }, [updateStateDuringSave, updateRefetchTasks]);

  const TASKS_PER_PAGE = 50;

  // Paginated fetch for the infinite scroll
  const fetchTasks = async ({ pageParam = 1 }) => {
    // Note: This backend endpoint might NOT support all the new date filters yet, 
    // so client-side filtering (filteredTasks) is crucial for the "All Tasks" view logic usually used in this app.
    // However, the original code used infinite scroll. I will attempt to pass params, 
    // but if the backend doesn't support them, local filtering on 'allTasks' might be better if the dataset isn't huge.
    // For now, I'll keep the existing logic and apply date filters on the client side 'allTasks' or 'tasks' list if possible.

    // Status filter mapping for backend (Tabs use 'Todo', 'In Progress', 'Closed')
    let backendStatus = statusFilter;
    if (statusFilter === 'all') backendStatus = 'all';

    const params = new URLSearchParams({
      page: pageParam,
      limit: TASKS_PER_PAGE,
      status: backendStatus,
      priority: priorityFilter,
      validationStatus: validationFilter,
      teamId: teamFilter, // Backend uses teamId if provided
      search: searchTerm
    });

    const { data } = await api.get(`/tasks/get-paginated-detractor-tasks?${params.toString()}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
    });
    return data.data || [];
  };

  const { data, status, error, fetchNextPage, isFetchingNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['detractor-tasks', statusFilter, priorityFilter, validationFilter, teamFilter, searchTerm, updateRefetchTasks], // added updateRefetchTasks key
    queryFn: fetchTasks,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length === 0 || lastPage.length < TASKS_PER_PAGE) return undefined;
      return allPages.length + 1;
    }
  });

  const tasks = useMemo(() => (data ? data.pages.flat() : []), [data]);
  const totalFilteredCount = data?.pages?.[0]?.pagination?.total || 0;

  const stats = useMemo(() => {
    return {
      total: allTasks.length,
      validated: allTasks.filter(t => t.validationStatus === 'Validated').length,
      pending: allTasks.filter(t => t.validationStatus !== 'Validated').length,
      open: allTasks.filter(t => ['Todo', 'In Progress'].includes(t.status)).length,
      closed: allTasks.filter(t => t.status === 'Closed').length,
      todo: allTasks.filter(t => t.status === 'Todo').length,
      inProgress: allTasks.filter(t => t.status === 'In Progress').length,
    };
  }, [allTasks]);

  // Analytics aggregation
  const analytics = useMemo(() => {
    const aggregateStats = (taskList) => {
      const stats = {
        byOwner: {},
        byReason: {},
        bySubReason: {},
        byRootCause: {},
        byFieldTeam: {},
        fieldTeamDetails: {} // Detailed breakdown per team
      };

      taskList.forEach(task => {
        const owner = task.responsible || 'Unassigned';
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

        // Detailed breakdown per field team
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

      // Get top 5 field teams (offenders)
      const topFieldTeams = toChartData(stats.byFieldTeam).slice(0, 5);

      // Prepare detailed data for top teams
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
        fieldTeamData: topFieldTeams,
        fieldTeamAnalytics: fieldTeamAnalytics
      };
    };

    return aggregateStats(allTasks);
  }, [allTasks]);

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  // Client-side filtering for Date Range (since backend might not have it tailored)
  useEffect(() => {
    let filtered = tasks;

    // Date Filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(t => new Date(t.date || t.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => new Date(t.date || t.createdAt) <= end);
    }

    setFilteredTasks(filtered);
  }, [tasks, startDate, endDate]);


  const handleTaskUpdate = (updatedTask) => {
    // Optimistic update logic
    setFilteredTasks((prevTasks) =>
      prevTasks.map((task) => (task._id === updatedTask._id ? updatedTask : task))
    );
  };

  // Comprehensive Export Logic
  const exportToExcel = () => {
    const dataToExport = (selectedTasks.length > 0 ? selectedTasks : filteredTasks).map(task => ({
      // Core Identification
      "SLID": task.slid || "",
      "Request Number": task.requestNumber || "",
      "Operation": task.operation || "",

      // Status & Priority
      "Status": task.status || "",
      "Priority": task.priority || "",
      "Validation Status": task.validationStatus || "",
      "Category": task.category || "",

      // Scores & Evaluation
      "Satisfaction Score": task.evaluationScore || "",
      "Speed": task.speed || "",
      "Closure Call Evaluation": task.closureCallEvaluation || "",

      // Customer Information
      "Customer Name": task.customerName || "",
      "Customer Type": task.customerType || "",
      "Customer Feedback": task.customerFeedback || "",
      "Closure Call Feedback": task.closureCallFeedback || "",
      "Contact Number": task.contactNumber || "",

      // Location
      "Governorate": task.governorate || "",
      "District": task.district || "",

      // Team Information
      "Field Team": task.teamName || "",
      "Team Company": task.teamCompany || "",
      "Team Contact": task.teamId?.contactNumber || "",

      // Assignment
      "Assigned To": task.assignedTo?.map(u => u.name || u.email).join(", ") || "",
      "Created By": task.createdBy?.name || task.createdBy?.email || "",
      "Responsible": task.responsible || "",

      // Technical Details
      "Reason": task.reason || "",
      "Sub Reason": task.subReason || "",
      "Root Cause": task.rootCause || "",
      "ONT Type": task.ontType || "",
      "Free Extender": task.freeExtender || "",
      "Extender Type": task.extenderType || "",
      "Extender Number": task.extenderNumber || "",

      // Service Details
      "Tariff Name": task.tarrifName || "",
      "Service Recipient (Initial)": task.serviceRecipientInitial || "",
      "Service Recipient (QoS)": task.serviceRecipientQoS || "",

      // Dates
      "Interview Date": task.interviewDate ? moment(task.interviewDate).format("YYYY-MM-DD") : "",
      "PIS Date": task.pisDate ? moment(task.pisDate).format("YYYY-MM-DD") : "",
      "Task Date": task.date ? moment(task.date).format("YYYY-MM-DD") : "",
      "Created At": task.createdAt ? moment(task.createdAt).format("YYYY-MM-DD HH:mm") : "",
      "Updated At": task.updatedAt ? moment(task.updatedAt).format("YYYY-MM-DD HH:mm") : "",

      // Subtask Information
      "Subtask Type": task.subtaskType || "",
      "Total Subtasks": task.subTasks?.length || 0,
      "Open Subtasks": task.subTasks?.filter(st => st.status === "Open").length || 0,
      "Closed Subtasks": task.subTasks?.filter(st => st.status === "Closed").length || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detractor Tasks");
    XLSX.writeFile(wb, `Detractor_Dispatch_${moment().format("YYYYMMDD_HHmm")}.xlsx`);
  };

  // WhatsApp Dispatch Logic
  const handleWhatsAppDispatch = (task) => {
    const phoneNumber = task.teamId?.contactNumber;
    const cleanNumber = phoneNumber?.replace(/[^0-9]/g, "");

    const message = `*🚨 DETRACTOR DISPATCH 🚨*%0A%0A*SLID:* ${task.slid}%0A*Status:* ${task.status}%0A*Score:* ${task.evaluationScore}%0A*Team:* ${task.teamName}%0A*Gov:* ${task.governorate}%0A%0A_Please prioritize this case immediately._`;

    if (cleanNumber) {
      window.open(`https://wa.me/${cleanNumber}?text=${message}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${message}`, "_blank");
      toast.warning("Team contact missing. Opening general share.");
    }
  };

  // Batch Actions
  const toggleSelectAll = (event) => {
    if (event.target.checked) setSelectedTasks(filteredTasks);
    else setSelectedTasks([]);
  };

  const toggleSelectTask = (task) => {
    const isSelected = selectedTasks.some(t => t._id === task._id);
    if (isSelected) setSelectedTasks(selectedTasks.filter(t => t._id !== task._id));
    else setSelectedTasks([...selectedTasks, task]);
  };

  // Sort Logic
  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);

    const sorted = [...filteredTasks].sort((a, b) => {
      let valA = a[property] || "";
      let valB = b[property] || "";

      if (property === 'createdAt') {
        valA = new Date(valA);
        valB = new Date(valB);
      }

      if (valA < valB) return isAsc ? -1 : 1;
      if (valA > valB) return isAsc ? 1 : -1;
      return 0;
    });
    setFilteredTasks(sorted);
  };

  if (status === "pending") {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <PulseLoader color="#ef4444" size={15} />
      </Box>
    );
  }

  return (
    <Box sx={{ mx: 'auto', p: isMobile ? 1 : 3 }}>
      {/* Header Section */}
      <Box sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? 2 : 0,
        mb: 3
      }}>
        <Typography variant="h5" sx={{
          color: '#ef4444', // Red for Detractors
          fontWeight: 'bold',
          fontSize: isMobile ? '1.2rem' : '1.75rem',
        }}>
          Detractor Command Center
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={() => setOpen(true)}
            startIcon={<IoMdAdd />}
            size={isMobile ? 'small' : 'medium'}
            disabled={user?.role !== 'Admin'}
            sx={{
              backgroundColor: '#1976d2',
              '&:hover': { backgroundColor: '#1565c0' },
              textTransform: 'none',
              borderRadius: '8px',
              px: isMobile ? 1.5 : 3,
            }}
          >
            {isMobile ? 'New' : 'New Task'}
          </Button>
          <Button
            variant="outlined"
            onClick={exportToExcel}
            startIcon={<FaFileExcel />}
            size={isMobile ? 'small' : 'medium'}
            sx={{
              borderColor: '#3d3d3d',
              color: '#4caf50',
              '&:hover': { borderColor: '#4caf50', backgroundColor: 'rgba(76, 175, 80, 0.05)' },
              textTransform: 'none',
              borderRadius: '8px',
              px: isMobile ? 1.5 : 2,
            }}
          >
            {isMobile ? 'Excel' : 'Export'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/neutral-tasks')}
            startIcon={<FaExchangeAlt />}
            size={isMobile ? 'small' : 'medium'}
            sx={{
              borderColor: '#3d3d3d',
              color: '#00f2ff',
              '&:hover': { borderColor: '#00f2ff', backgroundColor: 'rgba(0, 242, 255, 0.05)' },
              textTransform: 'none',
              borderRadius: '8px',
              px: isMobile ? 1.5 : 2,
            }}
          >
            {isMobile ? 'Neutral' : 'Neutral Terminal'}
          </Button>
        </Box>
      </Box>

      {/* Main Content Box */}
      <Box sx={{
        backgroundColor: '#2d2d2d',
        p: 2,
        borderRadius: '12px',
        border: '1px solid #3d3d3d',
        mb: 3,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>

        {/* Stats Row */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Detractors', value: stats.total, color: '#ef4444', icon: <MdWarning /> },
            { label: 'Validated', value: stats.validated, color: '#4caf50', icon: <MdCheckCircle /> },
            { label: 'Pending Validation', value: stats.pending, color: '#ff9800', icon: <MdPendingActions /> },
            { label: 'Open Cases', value: stats.open, color: '#3b82f6', icon: <MdStream /> },
          ].map((stat, index) => (
            <Grid item xs={6} md={3} key={index}>
              <Box sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'rgba(30, 30, 30, 0.6)',
                border: '1px solid #3d3d3d',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-2px)', borderColor: stat.color }
              }}>
                <Box sx={{
                  p: 1.5,
                  borderRadius: '50%',
                  bgcolor: `${stat.color}20`,
                  color: stat.color,
                  display: 'flex',
                  fontSize: '1.5rem'
                }}>
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#fff', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#b3b3b3', fontSize: '0.75rem' }}>
                    {stat.label}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>



        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: '#3d3d3d', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, v) => setActiveTab(v)}
            sx={{
              '& .MuiTab-root': { color: '#b3b3b3', textTransform: 'none', fontWeight: 600 },
              '& .Mui-selected': { color: '#ef4444' },
              '& .MuiTabs-indicator': { backgroundColor: '#ef4444' }
            }}
          >
            <Tab label="Task List" />
            <Tab label="Analytics" />
          </Tabs>
        </Box>

        {/* Analytics Tab Content */}
        {activeTab === 1 && (
          <Box sx={{
            p: 2,
            mb: 2,
            bgcolor: 'rgba(0,0,0,0.2)',
            borderRadius: 2,
            border: "1px solid rgba(239, 68, 68, 0.15)"
          }}>
            <Grid container spacing={2}>
              {/* Owner Analysis */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(30, 30, 30, 0.6)', borderRadius: 2 }}>
                  <Typography variant="h6" fontWeight="700" mb={2} color="#fff">
                    Owner Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analytics.ownerData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#b3b3b3" />
                      <YAxis stroke="#b3b3b3" />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }} />
                      <Bar dataKey="value" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Reason Breakdown */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(30, 30, 30, 0.6)', borderRadius: 2 }}>
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
                          <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF6B9D', '#8884D8', '#82CA9D'][index % 8]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Sub-reason Distribution */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(30, 30, 30, 0.6)', borderRadius: 2 }}>
                  <Typography variant="h6" fontWeight="700" mb={2} color="#fff">
                    Sub-reason Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analytics.subReasonData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#b3b3b3" />
                      <YAxis stroke="#b3b3b3" />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }} />
                      <Bar dataKey="value" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Root Cause Analysis */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(30, 30, 30, 0.6)', borderRadius: 2 }}>
                  <Typography variant="h6" fontWeight="700" mb={2} color="#fff">
                    Root Cause Analysis
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analytics.rootCauseData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3d3d3d" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#b3b3b3" />
                      <YAxis stroke="#b3b3b3" />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }} />
                      <Bar dataKey="value" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>

            {/* Field Team Offenders Section */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h5" fontWeight="700" mb={2} color="#ef4444" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                🚨 Top Field Team Offenders
              </Typography>

              {analytics.fieldTeamAnalytics && analytics.fieldTeamAnalytics.length > 0 ? (
                <Grid container spacing={2}>
                  {analytics.fieldTeamAnalytics.map((team, idx) => (
                    <Grid item xs={12} key={idx}>
                      <Paper sx={{
                        p: 2,
                        bgcolor: 'rgba(30, 30, 30, 0.8)',
                        borderRadius: 2,
                        border: '2px solid rgba(239, 68, 68, 0.3)',
                        '&:hover': { borderColor: 'rgba(239, 68, 68, 0.6)' }
                      }}>
                        {/* Team Header */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Box>
                            <Typography variant="h6" fontWeight="700" color="#fff">
                              #{idx + 1} {team.teamName}
                            </Typography>
                            <Typography variant="body2" color="#b3b3b3">
                              Total Issues: <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{team.totalIssues}</span>
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
                                <RechartsTooltip contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #3d3d3d' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </Grid>

                          {/* Top Owners */}
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
            </Box>
          </Box>
        )}
      </Box>

      {/* Task List Tab Content */}
      {
        activeTab === 0 && (
          <Box>
            {/* Search Row */}
            <Box sx={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 2,
              mb: 2,
              alignItems: isMobile ? 'stretch' : 'center'
            }}>
              <TextField
                variant="outlined"
                size="small"
                placeholder="Search by SLID, Team, Governorate..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth={isMobile}
                sx={{
                  flexGrow: 1,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#1e1e1e',
                    borderRadius: '8px',
                    color: '#ffffff',
                    '& fieldset': { borderColor: '#3d3d3d' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#ef4444' },
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MdSearch style={{ color: '#b3b3b3' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ color: '#b3b3b3' }}>
                      <MdClose />
                    </IconButton>
                  )
                }}
              />

              <Box sx={{
                display: 'flex',
                backgroundColor: '#1e1e1e',
                borderRadius: '8px',
                p: 0.5,
                border: '1px solid #3d3d3d'
              }}>
                {[
                  { id: 'grid', icon: <MdViewModule />, label: 'Grid' },
                  { id: 'list', icon: <MdViewList />, label: 'List' }
                ].map((mode) => (
                  <Tooltip key={mode.id} title={mode.label}>
                    <IconButton
                      size="small"
                      onClick={() => setViewMode(mode.id)}
                      sx={{
                        borderRadius: '6px',
                        color: viewMode === mode.id ? '#ffffff' : '#b3b3b3',
                        backgroundColor: viewMode === mode.id ? '#ef4444' : 'transparent',
                        '&:hover': {
                          backgroundColor: viewMode === mode.id ? '#dc2626' : 'rgba(255,255,255,0.05)'
                        },
                        transition: 'all 0.2s',
                        px: 1,
                        gap: 0.5
                      }}
                    >
                      {mode.icon}
                      {!isMobile && <Typography variant="caption">{mode.label}</Typography>}
                    </IconButton>
                  </Tooltip>
                ))}
              </Box>
            </Box>

            <Divider sx={{ mb: 2, borderColor: '#3d3d3d' }} />

            {/* Date Filters & Advanced Toggle */}
            <Box sx={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 2,
              mb: 2,
              alignItems: isMobile ? 'stretch' : 'center'
            }}>
              <Typography variant="body2" sx={{ color: '#b3b3b3', minWidth: 'fit-content' }}>Filter by Date:</Typography>
              <TextField
                type="date"
                label="From"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{
                  maxWidth: isMobile ? 'none' : '200px',
                  '& .MuiInputBase-root': { color: '#ffffff', backgroundColor: '#1e1e1e' },
                  '& .MuiInputLabel-root': { color: '#b3b3b3' },
                  '& .MuiOutlinedInput-root fieldset': { borderColor: '#3d3d3d' },
                  '&:hover fieldset': { borderColor: '#666' },
                }}
              />
              <TextField
                type="date"
                label="To"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{
                  maxWidth: isMobile ? 'none' : '200px',
                  '& .MuiInputBase-root': { color: '#ffffff', backgroundColor: '#1e1e1e' },
                  '& .MuiInputLabel-root': { color: '#b3b3b3' },
                  '& .MuiOutlinedInput-root fieldset': { borderColor: '#3d3d3d' },
                  '&:hover fieldset': { borderColor: '#666' },
                }}
              />

              {(startDate || endDate) && (
                <Button
                  size="small"
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  sx={{ color: '#f44336', textTransform: 'none' }}
                >
                  Clear Dates
                </Button>
              )}

              <Box sx={{ flexGrow: 1 }} />

              <Button
                onClick={() => setShowFilters(!showFilters)}
                startIcon={<MdFilterList />}
                size="small"
                variant={showFilters ? "contained" : "outlined"}
                sx={{
                  borderColor: '#3d3d3d',
                  color: showFilters ? '#fff' : '#ef4444',
                  bgcolor: showFilters ? '#ef4444' : 'transparent',
                  '&:hover': {
                    borderColor: '#ef4444',
                    bgcolor: showFilters ? '#dc2626' : 'rgba(239, 68, 68, 0.1)'
                  }
                }}
              >
                Advanced Filters
              </Button>
            </Box>

            {/* Collapsible Advanced Filters */}
            <Collapse in={showFilters}>
              <Box sx={{
                p: 2,
                mb: 2,
                bgcolor: 'rgba(0,0,0,0.2)',
                borderRadius: 2,
                border: "1px solid rgba(239, 68, 68, 0.15)"
              }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: "#64748b", "&.Mui-focused": { color: "#ef4444" } }}>Priority Layer</InputLabel>
                      <Select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        label="Priority Layer"
                        sx={{ color: "#fff", ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.1)" }, "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(239, 68, 68, 0.3)" }, "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#ef4444" } }}
                      >
                        <MenuItem value="all">Full Spectrum</MenuItem>
                        <MenuItem value="High">🔴 High Priority</MenuItem>
                        <MenuItem value="Medium">🟠 Medium Priority</MenuItem>
                        <MenuItem value="Low">🔵 Low Priority</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: "#64748b", "&.Mui-focused": { color: "#ef4444" } }}>Validation Status</InputLabel>
                      <Select
                        value={validationFilter}
                        onChange={(e) => setValidationFilter(e.target.value)}
                        label="Validation Status"
                        sx={{ color: "#fff", ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.1)" }, "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(239, 68, 68, 0.3)" }, "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#ef4444" } }}
                      >
                        <MenuItem value="all">All Statuses</MenuItem>
                        <MenuItem value="Validated">🛡️ Validated</MenuItem>
                        <MenuItem value="Pending">🕒 Not Validated</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: "#64748b", "&.Mui-focused": { color: "#ef4444" } }}>Unit Assignment</InputLabel>
                      <Select
                        value={teamFilter}
                        onChange={(e) => setTeamFilter(e.target.value)}
                        label="Unit Assignment"
                        sx={{ color: "#fff", ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.1)" }, "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(239, 68, 68, 0.3)" }, "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#ef4444" } }}
                      >
                        <MenuItem value="all">All Units</MenuItem>
                        {fieldTeams.map(team => (
                          <MenuItem key={team._id} value={team._id}>{team.teamName}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button
                      fullWidth
                      onClick={() => { setStatusFilter("all"); setPriorityFilter("all"); setValidationFilter("all"); setTeamFilter("all"); }}
                      sx={{ color: "#64748b", fontWeight: 800, height: '100%' }}
                    >
                      RESET FILTERS
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Collapse>

            <Divider sx={{ mb: 2, borderColor: '#3d3d3d' }} />

            {/* Status Tabs */}
            <Tabs
              value={statusFilter}
              onChange={(e, val) => setStatusFilter(val)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                '& .MuiTabs-indicator': { backgroundColor: '#ef4444' },
                '& .MuiTab-root': {
                  color: '#b3b3b3',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  '&.Mui-selected': { color: '#ef4444' }
                }
              }}
            >
              {/* > */}
              <Tab value="all" label={`All Tasks (${stats.total})`} />
              <Tab value="Todo" label={`Todo (${stats.todo})`} />
              <Tab value="In Progress" label={`In Progress (${stats.inProgress})`} />
              <Tab value="Closed" label={`Closed (${stats.closed})`} />
            </Tabs>

            {/* Search Results Summary */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Showing {filteredTasks.length} results
              </Typography>
            </Box>

            {/* Content Area */}
            {
              filteredTasks.length === 0 ? (
                <Box sx={{ py: 20, textAlign: 'center', bgcolor: 'rgba(10, 10, 15, 0.4)', borderRadius: 8, border: '2px dashed rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(5px)' }}>
                  <Warning sx={{ fontSize: 60, color: "rgba(239, 68, 68, 0.2)", mb: 2 }} />
                  <Typography variant="h5" sx={{ color: "#475569", fontWeight: 900, textTransform: 'uppercase', letterSpacing: '6px' }}>
                    No Tasks Found
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1e293b", mt: 1, fontWeight: 700 }}>Try adjusting your filters</Typography>
                </Box>
              ) : (
                <>
                  {viewMode === 'grid' ? (
                    /* Enhanced Grid Layout */
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(360px, 1fr))',
                        gap: 3,
                        justifyContent: isMobile ? 'center' : 'flex-start'
                      }}>
                      {filteredTasks.map((task) => (
                        <Box key={task._id} sx={{ height: '100%', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', '&:hover': { transform: 'scale(1.02)', zIndex: 10 } }}>
                          <TaskCard
                            task={task}
                            users={users}
                            handleTaskUpdate={handleTaskUpdate}
                            handleTaskDelete={async (id) => {
                              if (window.confirm("Permanent registry purge?")) {
                                await api.delete(`/tasks/delete-task/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } });
                                setFilteredTasks(prev => prev.filter(t => t._id !== id));
                              }
                            }}
                            handleFavoriteClick={() => toast.info("Flagged for High Priority Recall")}
                            handleTaskArchive={() => toast.info("Relocated to Cold Storage")}
                            setUpdateStateDuringSave={setUpdateStateDuringSave}
                            settings={dateSettings}
                          />
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    /* Table Layout */
                    <Box sx={{ width: '100%', overflowX: 'auto' }}>
                      <TableContainer component={Paper} sx={{ bgcolor: "rgba(10, 10, 15, 0.7)", backdropFilter: 'blur(30px)', borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", overflow: 'visible', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
                        <Table>
                          <TableHead sx={{ bgcolor: "rgba(239, 68, 68, 0.08)" }}>
                            <TableRow>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  indeterminate={selectedTasks.length > 0 && selectedTasks.length < filteredTasks.length}
                                  checked={filteredTasks.length > 0 && selectedTasks.length === filteredTasks.length}
                                  onChange={toggleSelectAll}
                                  sx={{ color: "rgba(255,255,255,0.15)", '&.Mui-checked': { color: "#ef4444" } }}
                                />
                              </TableCell>
                              <TableCell sx={{ color: "#64748b", fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                                <TableSortLabel active={orderBy === 'slid'} direction={order} onClick={() => handleSort('slid')} sx={{ color: '#64748b !important', '& .MuiTableSortLabel-icon': { color: '#ef4444 !important' } }}>SLID</TableSortLabel>
                              </TableCell>
                              <TableCell sx={{ color: "#64748b", fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Category</TableCell>
                              <TableCell sx={{ color: "#64748b", fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Operation</TableCell>
                              <TableCell sx={{ color: "#64748b", fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Intensity</TableCell>
                              <TableCell sx={{ color: "#64748b", fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Network Status</TableCell>
                              <TableCell sx={{ color: "#64748b", fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Field Deployment</TableCell>
                              <TableCell sx={{ color: "#64748b", fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Location</TableCell>
                              <TableCell sx={{ color: "#64748b", fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Priority</TableCell>
                              <TableCell sx={{ color: "#64748b", fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Validation</TableCell>
                              <TableCell sx={{ color: "#64748b", fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Created</TableCell>
                              <TableCell align="right" sx={{ color: "#64748b", fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Tactical</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {filteredTasks.map((task) => {
                              const isSelected = selectedTasks.some(t => t._id === task._id);
                              return (
                                <TableRow key={task._id} hover selected={isSelected} sx={{ transition: 'all 0.2s', '&:hover': { bgcolor: "rgba(255,255,255,0.04) !important" }, '&.Mui-selected': { bgcolor: "rgba(239, 68, 68, 0.08) !important" } }}>
                                  <TableCell padding="checkbox">
                                    <Checkbox checked={isSelected} onChange={() => toggleSelectTask(task)} sx={{ color: "rgba(255,255,255,0.1)", '&.Mui-checked': { color: "#ef4444" } }} />
                                  </TableCell>
                                  <TableCell sx={{ color: "#fff", fontWeight: 900, fontFamily: 'monospace', fontSize: '1.05rem', letterSpacing: '0.5px' }}>{task.slid}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={task.category || "N/A"}
                                      size="small"
                                      sx={{
                                        bgcolor: "rgba(139, 92, 246, 0.1)",
                                        color: "#a78bfa",
                                        border: "1px solid rgba(139, 92, 246, 0.3)",
                                        fontWeight: 800,
                                        fontSize: "0.7rem",
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ color: "#94a3b8", fontWeight: 600, fontSize: "0.85rem" }}>{task.operation || "N/A"}</TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                                      <Box sx={{ width: 70, height: 8, bgcolor: "rgba(255,255,255,0.05)", borderRadius: 10, overflow: 'hidden' }}>
                                        <Box sx={{ width: `${(task.evaluationScore / 10) * 100}%`, height: '100%', bgcolor: "#ef4444", boxShadow: `0 0 15px #ef4444` }} />
                                      </Box>
                                      <Typography variant="body2" sx={{ fontWeight: 1000, color: "#ef4444" }}>{task.evaluationScore}</Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      icon={statusConfig[task.status]?.icon}
                                      label={task.status}
                                      size="small"
                                      sx={{
                                        bgcolor: statusConfig[task.status]?.bg,
                                        color: statusConfig[task.status]?.color,
                                        fontWeight: 1000,
                                        borderRadius: '10px',
                                        fontSize: '0.75rem',
                                        border: `1px solid ${statusConfig[task.status]?.color}44`,
                                        '& .MuiChip-icon': { color: 'inherit' }
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ color: "#cbd5e1", fontWeight: 700 }}>{task.teamName || 'N/A'}</TableCell>
                                  <TableCell sx={{ color: "#94a3b8", fontWeight: 600 }}>{task.governorate}</TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <Box sx={{ width: 12, height: 12, borderRadius: '3px', transform: 'rotate(45deg)', bgcolor: priorityConfig[task.priority]?.color, boxShadow: `0 0 20px ${priorityConfig[task.priority]?.color}` }} />
                                      <Typography variant="body2" sx={{ color: "#f8fafc", fontWeight: 800 }}>{task.priority}</Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={task.validationStatus || "Not validated"}
                                      size="small"
                                      sx={{
                                        bgcolor: task.validationStatus === "Validated" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                        color: task.validationStatus === "Validated" ? "#22c55e" : "#ef4444",
                                        border: `1px solid ${task.validationStatus === "Validated" ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                                        fontWeight: 800,
                                        fontSize: "0.7rem",
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ color: "#64748b", fontWeight: 600, fontSize: "0.8rem" }}>
                                    {task.createdAt ? moment(task.createdAt).format("MMM DD, YYYY") : "N/A"}
                                  </TableCell>
                                  <TableCell align="right">
                                    <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                                      <IconButton onClick={() => handleWhatsAppDispatch(task)} size="small" sx={{ color: "#22c55e", bgcolor: "rgba(34, 197, 94, 0.15)", borderRadius: '10px', "&:hover": { bgcolor: "#22c55e", color: "#fff" } }}>
                                        <FaWhatsapp size={18} />
                                      </IconButton>
                                      <IconButton onClick={() => setSelectedTasks([task]) && exportToExcel()} size="small" sx={{ color: "#fff", bgcolor: "rgba(255, 255, 255, 0.08)", borderRadius: '10px', "&:hover": { bgcolor: "#fff", color: "#000" } }}>
                                        <FaFileExcel size={18} />
                                      </IconButton>
                                    </Stack>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {/* Pagination Loader */}
                  <Box sx={{ my: 8, display: 'flex', justifyContent: 'center' }} ref={loadMoreRef}>
                    {isFetchingNextPage ? (
                      <PulseLoader color="#ef4444" size={14} />
                    ) : hasNextPage && !searchTerm ? (
                      <Typography variant="overline" sx={{ color: "#334155", fontWeight: 1000, letterSpacing: '6px' }}>Synchronizing...</Typography>
                    ) : (
                      <Typography variant="overline" sx={{ color: "#1e293b", fontWeight: 1000, letterSpacing: '6px' }}>End of Registry</Typography>
                    )}
                  </Box>
                </>
              )
            }

          </Box >
        )
      }

      <AddTask open={open} setOpen={setOpen} setUpdateRefetchTasks={setUpdateRefetchTasks} />
    </Box >
  );
};

export default DetractorTasks;
