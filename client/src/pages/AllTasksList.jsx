import { useState, useEffect, useMemo } from 'react';
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
  InputLabel,
  Stack,
  Grid,
  Collapse,
  ButtonGroup
} from '@mui/material';
import { MoonLoader } from 'react-spinners';
import LoadingSpinner from '../components/common/LoadingSpinner';
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
  MdFilterList,
  MdCheckCircle,
  MdRadioButtonUnchecked,
  MdError,
  MdBarChart, // New Import
  MdTimeline, // New Import
  MdDateRange, // New Import
  MdAssignmentTurnedIn // New Import
} from 'react-icons/md';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO, format, subWeeks } from 'date-fns';
import { IoMdAdd } from "react-icons/io";
import api from '../api/api';
import EditTaskDialog from '../components/task/EditTaskDialog';
import DetailedSubtaskDialog from '../components/task/DetailedSubtaskDialog';
import { TaskDetailsDialog } from '../components/TaskDetailsDialog';
import { getCustomWeekNumber as getAggregatedWeekNumber } from '../utils/helpers';
import { utils, writeFile } from 'xlsx';
import AddTask from '../components/task/AddTask';
import moment from 'moment';

const AllTasksList = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const user = useSelector((state) => state?.auth?.user);

  // --- Consolidated State ---
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Filter State
  const [dateFilter, setDateFilter] = useState({
    start: startOfWeek(subWeeks(new Date(), 2)),
    end: endOfWeek(new Date()),
    type: 'latest3Weeks'
  });
  const [tempStartDate, setTempStartDate] = useState(startOfWeek(subWeeks(new Date(), 2)));
  const [tempEndDate, setTempEndDate] = useState(endOfWeek(new Date()));

  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [governorateFilter, setGovernorateFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [subconFilter, setSubconFilter] = useState('all');
  const [supervisorFilter, setSupervisorFilter] = useState('all');
  const [teamNameFilter, setTeamNameFilter] = useState('all');
  const [validationFilter, setValidationFilter] = useState('all');
  const [filter, setFilter] = useState('all'); // Eval score filter

  // Dialogs & Selection
  const [selectedTask, setSelectedTask] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [openAddTask, setOpenAddTask] = useState(false);
  const [updateRefetchTasks, setUpdateRefetchTasks] = useState(false);

  const [selectedRowId, setSelectedRowId] = useState(null);
  const [dialogContent, setDialogContent] = useState('');
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const [dropdownOptions, setDropdownOptions] = useState({});
  const [settings, setSettings] = useState(null);
  const [favoriteTasks, setFavoriteTasks] = useState([]);
  const [visitedRowIds, setVisitedRowIds] = useState([]);
  const [hiddenSeries, setHiddenSeries] = useState(new Set());
  const [manageSubtasksDialogOpen, setManageSubtasksDialogOpen] = useState(false);
  const [subtaskTask, setSubtaskTask] = useState(null);

  const handleLegendClick = (e) => {
    const { dataKey } = e;
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  };

  // Fetch ALL Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tasksRes, optionsRes, settingsRes, favRes] = await Promise.all([
          api.get("/tasks/get-all-tasks"),
          api.get('/dropdown-options/all'),
          api.get("/settings"),
          api.get("/favourites/get-favourites")
        ]);

        const tasksData = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.tasks || []);
        setAllTasks(tasksData);
        setDropdownOptions(optionsRes.data);
        setSettings(settingsRes.data);
        setFavoriteTasks(favRes.data.favourites || []);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [updateRefetchTasks]);

  // Global refresh listener for navbar-based task creation
  useEffect(() => {
    const handleGlobalRefresh = () => setUpdateRefetchTasks(prev => !prev);
    window.addEventListener('dashboard-refresh', handleGlobalRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleGlobalRefresh);
  }, []);

  // Sync Temp Dates
  useEffect(() => {
    setTempStartDate(dateFilter.start);
    setTempEndDate(dateFilter.end);
  }, [dateFilter]);

  // --- UNIFIED FILTERING LOGIC ---
  const filteredTasks = useMemo(() => {
    if (!allTasks.length) return [];

    return allTasks.filter(task => {
      // 1. Priority
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

      // 2. Status
      if (statusFilter !== 'all') {
        if (task.status !== statusFilter) return false;
      }

      // 3. Location
      if (governorateFilter !== 'all' && task.governorate !== governorateFilter) return false;
      if (districtFilter !== 'all' && task.district !== districtFilter) return false;

      // 4. Teams
      if (subconFilter !== 'all' && task.teamCompany !== subconFilter) return false;
      if (teamNameFilter !== 'all' && task.teamName !== teamNameFilter) return false;

      // 5. Validation
      if (validationFilter !== 'all') {
        if (validationFilter === 'Pending' && task.validationStatus === 'Validated') return false;
        if (validationFilter !== 'Pending' && task.validationStatus !== validationFilter) return false;
      }

      // 6. Supervisor
      if (supervisorFilter !== 'all') {
        const assigned = task.assignedTo;
        if (Array.isArray(assigned)) {
          if (!assigned.some(u => (u._id || u) === supervisorFilter)) return false;
        } else {
          if ((assigned?._id || assigned) !== supervisorFilter) return false;
        }
      }

      // 7. Eval Score (Legacy 'filter' state)
      // 'neutrals' (7-8), 'detractors' (0-6)
      if (filter === 'neutrals') {
        if (task.evaluationScore < 7 || task.evaluationScore > 8) return false;
      } else if (filter === 'detractors') {
        if (task.evaluationScore > 6) return false;
      }

      // 8. Search
      if (debouncedSearchTerm) {
        const lower = debouncedSearchTerm.toLowerCase();
        const searchMatch = (
          (task.slid?.toLowerCase().includes(lower)) ||
          (task.customerName?.toLowerCase().includes(lower)) ||
          (task.teamName?.toLowerCase().includes(lower)) ||
          (task.operation?.toLowerCase().includes(lower)) ||
          (String(task.requestNumber || '').includes(lower))
        );
        if (!searchMatch) return false;
      }

      // 9. Date Filter
      if (dateFilter.type !== 'all') {
        if (!task.interviewDate) return false;
        const taskDate = parseISO(task.interviewDate);
        if (dateFilter.start && dateFilter.end) {
          if (!isWithinInterval(taskDate, { start: dateFilter.start, end: dateFilter.end })) return false;
        }
      }

      return true;
    });
  }, [allTasks, priorityFilter, statusFilter, governorateFilter, districtFilter, subconFilter, supervisorFilter, teamNameFilter, validationFilter, filter, debouncedSearchTerm, dateFilter]);

  // Pagination
  const paginatedTasks = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredTasks.slice(start, start + rowsPerPage);
  }, [filteredTasks, page, rowsPerPage]);







  const getWeekDisplay = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = moment(dateString);
      const year = date.year();
      const weekNum = getAggregatedWeekNumber(date.toDate(), year, settings || {});
      return `${weekNum}`;
    } catch (e) {
      return "-";
    }
  };

  const handleRowClick = (taskId) => {
    setSelectedRowId(prevId => {
      // If clicking the same row, toggle selection
      if (prevId === taskId) {
        return null;
      }
      // Otherwise select the new row
      return taskId;
    });
  };

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(0); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);



  // Chart Data Processing
  const analyticsData = useMemo(() => {
    const sourceData = filteredTasks;
    if (!sourceData.length) return { reason: [], subReason: [], rootCause: [] };

    // Helper to count frequencies
    const count = (key) => {
      const map = {};
      sourceData.forEach(t => {
        const val = t[key] || 'Unknown';
        map[val] = (map[val] || 0) + 1;
      });
      return Object.entries(map)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    };

    return {
      reason: count('reason'),
      subReason: count('subReason'),
      rootCause: count('rootCause')
    };
  }, [filteredTasks]);

  // Weekly Trend Data Processing
  const trendData = useMemo(() => {
    if (!filteredTasks.length) return [];

    // 1. Group by Week
    const weekMap = {};
    filteredTasks.forEach(t => {
      const week = getWeekDisplay(t.interviewDate);
      if (week === "-") return;
      if (!weekMap[week]) weekMap[week] = { week, tasks: [] };
      weekMap[week].tasks.push(t);
    });

    // 2. Sort weeks chronologically (simplified assuming "W1", "W2" format or similar)
    // For robust sorting, we might need the actual date, but let's stick to the labels for now
    const sortedWeeks = Object.keys(weekMap).sort((a, b) => parseInt(a) - parseInt(b));

    // 3. Find top Reasons/Owners across all data to track them
    const getTopKeys = (field, limit = 5) => {
      const counts = {};
      filteredTasks.forEach(t => {
        const val = t[field] || 'Unknown';
        counts[val] = (counts[val] || 0) + 1;
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([key, total]) => ({ name: key, total }));
    };

    const topReasons = getTopKeys('reason');
    const topOwners = getTopKeys('teamName');

    // 4. Transform into Recharts format
    const data = sortedWeeks.map(weekLabel => {
      const dataPoint = { name: `W${weekLabel}` };
      const tasksInWeek = weekMap[weekLabel].tasks;

      topReasons.forEach(reasonObj => {
        dataPoint[reasonObj.name] = tasksInWeek.filter(t => (t.reason || 'Unknown') === reasonObj.name).length;
      });

      topOwners.forEach(ownerObj => {
        dataPoint[ownerObj.name] = tasksInWeek.filter(t => (t.teamName || 'Unknown') === ownerObj.name).length;
      });

      return dataPoint;
    });

    return { data, topReasons, topOwners };
  }, [filteredTasks, settings]); // settings needed for getWeekDisplay





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
        setAllTasks(prev => prev.filter(task => task._id !== taskToDelete._id));
        setDeleteDialogOpen(false);
        setTaskToDelete(null);

        alert("Task moved to trash successfully");
      } else {
        throw new Error("Failed to move task to trash");
      }
    } catch (err) {
      // console.error("Error deleting task:", err);
      setError("Failed to delete task. Please try again.");
      console.log('error message:', err);
    }
  };

  const exportToExcel = () => {
    // 1. Determine Reported Period
    let periodStr = "All Time";
    if (dateFilter.type !== 'all' && dateFilter.start && dateFilter.end) {
      try {
        periodStr = `${format(dateFilter.start, 'dd/MM/yyyy')} - ${format(dateFilter.end, 'dd/MM/yyyy')}`;
      } catch (e) {
        periodStr = "Custom Period";
      }
    } else if (filteredTasks.length > 0) {
      const dates = filteredTasks
        .map(t => t.createdAt ? new Date(t.createdAt) : null)
        .filter(d => d)
        .sort((a, b) => a - b);
      if (dates.length > 0) {
        periodStr = `${format(dates[0], 'dd/MM/yyyy')} - ${format(dates[dates.length - 1], 'dd/MM/yyyy')}`;
      }
    }

    const workbook = utils.book_new();

    // 2. Executive Summary Sheet
    const totalTasks = filteredTasks.length;
    const validatedCount = filteredTasks.filter(t => t.validationStatus === 'Validated').length;
    const detractorCount = filteredTasks.filter(t => t.evaluationScore !== null && t.evaluationScore <= 6).length;
    const neutralCount = filteredTasks.filter(t => t.evaluationScore >= 7 && t.evaluationScore <= 8).length;
    const promoterCount = filteredTasks.filter(t => t.evaluationScore >= 9).length;

    const summaryData = [
      ["EXECUTIVE AUDIT SUMMARY", ""],
      ["Reported Period:", periodStr],
      ["Export Date:", format(new Date(), 'dd/MM/yyyy HH:mm')],
      ["", ""],
      ["CORE KEY PERFORMANCE INDICATORS", "VALUE", "PERCENTAGE"],
      ["Total Tasks Audited", totalTasks, "100%"],
      ["Compliance Rate (Validated)", validatedCount, totalTasks > 0 ? `${((validatedCount / totalTasks) * 100).toFixed(1)}%` : "0%"],
      ["Detractor Rate (Score <= 6)", detractorCount, totalTasks > 0 ? `${((detractorCount / totalTasks) * 100).toFixed(1)}%` : "0%"],
      ["Promoter Rate (Score >= 9)", promoterCount, totalTasks > 0 ? `${((promoterCount / totalTasks) * 100).toFixed(1)}%` : "0%"],
      ["", ""],
      ["SCORE BREAKDOWN", "COUNT", "SHARE"],
      ["Promoters (9-10)", promoterCount, totalTasks > 0 ? `${((promoterCount / totalTasks) * 100).toFixed(1)}%` : "0%"],
      ["Neutrals (7-8)", neutralCount, totalTasks > 0 ? `${((neutralCount / totalTasks) * 100).toFixed(1)}%` : "0%"],
      ["Detractors (0-6)", detractorCount, totalTasks > 0 ? `${((detractorCount / totalTasks) * 100).toFixed(1)}%` : "0%"],
    ];

    const wsSummary = utils.aoa_to_sheet(summaryData);
    utils.book_append_sheet(workbook, wsSummary, 'Executive Summary');

    // 3. Reason Overview Sheet (with Percentages)
    const getCountsWithPercent = (field) => {
      const counts = {};
      filteredTasks.forEach(t => {
        const val = t[field] || 'Unknown';
        counts[val] = (counts[val] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, count]) => ({
          Name: name,
          Count: count,
          Percentage: totalTasks > 0 ? `${((count / totalTasks) * 100).toFixed(1)}%` : "0%"
        }))
        .sort((a, b) => b.Count - a.Count);
    };

    const reasons = getCountsWithPercent('reason');
    const subReasons = getCountsWithPercent('subReason');
    const rootCauses = getCountsWithPercent('rootCause');

    const wsReasons = utils.aoa_to_sheet([[`Reported Period: ${periodStr}`]]);
    utils.sheet_add_aoa(wsReasons, [["REASON ANALYSIS"]], { origin: "A3" });
    utils.sheet_add_json(wsReasons, reasons, { origin: "A4", skipHeader: false });
    utils.sheet_add_aoa(wsReasons, [["SUB-REASON ANALYSIS"]], { origin: "E3" });
    utils.sheet_add_json(wsReasons, subReasons, { origin: "E4", skipHeader: false });
    utils.sheet_add_aoa(wsReasons, [["ROOT CAUSE ANALYSIS"]], { origin: "I3" });
    utils.sheet_add_json(wsReasons, rootCauses, { origin: "I4", skipHeader: false });
    utils.book_append_sheet(workbook, wsReasons, 'Reason Analytics');

    // 4. Owner Overview Sheet (Enhanced)
    const ownerStats = {};
    filteredTasks.forEach(t => {
      const owner = t.teamName || 'Unknown';
      if (!ownerStats[owner]) {
        ownerStats[owner] = {
          'Owner': owner,
          'Total Tasks': 0,
          'Validated': 0,
          'Pending': 0,
          'Detractors': 0
        };
      }
      ownerStats[owner]['Total Tasks']++;
      if (t.validationStatus === 'Validated') ownerStats[owner]['Validated']++;
      if (t.validationStatus === 'Not validated' || t.validationStatus === 'Pending') ownerStats[owner]['Pending']++;
      if (t.evaluationScore !== null && t.evaluationScore <= 6) ownerStats[owner]['Detractors']++;
    });

    const ownerData = Object.values(ownerStats)
      .sort((a, b) => b['Total Tasks'] - a['Total Tasks'])
      .map(o => ({
        ...o,
        'Compliance %': o['Total Tasks'] > 0 ? `${((o['Validated'] / o['Total Tasks']) * 100).toFixed(1)}%` : "0%",
        'Detractor %': o['Total Tasks'] > 0 ? `${((o['Detractors'] / o['Total Tasks']) * 100).toFixed(1)}%` : "0%"
      }));

    const wsOwners = utils.json_to_sheet(ownerData, { origin: "A2" });
    utils.sheet_add_aoa(wsOwners, [[`Reported Period: ${periodStr}`]], { origin: "A1" });
    utils.book_append_sheet(workbook, wsOwners, 'Owner Performance');

    // 5. Trend Analysis Sheet (Weekly Breakdown)
    if (trendData.data?.length > 0) {
      const wsTrends = utils.json_to_sheet(trendData.data, { origin: "A2" });
      utils.sheet_add_aoa(wsTrends, [[`Weekly Volume Trend - Reported Period: ${periodStr}`]], { origin: "A1" });
      utils.book_append_sheet(workbook, wsTrends, 'Historical Trends');
    }

    // 6. Raw Data Sheet
    const rawData = filteredTasks.map(task => ({
      'Created At': task.createdAt ? new Date(task.createdAt).toLocaleString() : '-',
      'Request Number': task.requestNumber || 'N/A',
      'SLID': task.slid || 'N/A',
      'Status': task.status || 'N/A',
      'PIS Date': task.pisDate ? new Date(task.pisDate).toLocaleDateString() : 'N/A',
      'Customer Name': task.customerName || 'N/A',
      'Contact': task.contactNumber || 'N/A',
      'Governorate': task.governorate || 'N/A',
      'District': task.district || 'N/A',
      'Team Name': task.teamName || 'N/A',
      'Subcon': task.teamCompany || 'N/A',
      'Satisfaction Score': task.evaluationScore || 'N/A',
      'Feedback Severity': task.priority || 'N/A',
      'Reason': task.reason || 'N/A',
      'Sub-Reason': task.subReason || 'N/A',
      'Root Cause': task.rootCause || 'N/A',
      'Validation Status': task.validationStatus || 'Pending',
      'Customer Feedback': task.customerFeedback || 'N/A',
      'Management Note': task.subTasks?.filter(st => st.note).map(st => st.note).join(" | ") || 'N/A'
    }));

    const wsRaw = utils.json_to_sheet(rawData, { origin: "A2" });
    utils.sheet_add_aoa(wsRaw, [[`Raw Audit Data - ${periodStr}`]], { origin: "A1" });
    utils.book_append_sheet(workbook, wsRaw, 'Raw Data');

    // 7. Save Workbook
    writeFile(workbook, `Executive_Audit_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleTableContainerClick = (e) => {
    // Check if we're clicking directly on the container (not a child element that might stop propagation)
    if (e.target === e.currentTarget) {
      setSelectedRowId(null);
    }
  };

  if (loading && allTasks.length === 0) {
    return <LoadingSpinner variant="page" />;
  }

  if (error) {
    return (
      <Box p={4}>
        <Typography color="error">{error}</Typography>
        <Button
          onClick={() => setUpdateRefetchTasks(prev => !prev)}
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
      // maxWidth: '1200px',
      mx: 'auto',
      p: 2,
      px: isMobile ? 0 : undefined
    }}>
      <Typography variant="h5" gutterBottom sx={{
        color: '#7b68ee',
        fontWeight: 'bold',
        fontSize: isMobile ? '1.2rem' : '1.5rem',
        mb: 2
      }}>
        Tasks Audit Dashboard
      </Typography>

      {/* Advanced Analytics & Filter Section */}
      <Paper sx={{ mb: 3, p: 2, borderRadius: 3, border: '1px dashed #6366f1', bgcolor: 'rgba(99, 102, 241, 0.04)' }}>

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#2d2d2d', color: '#fff' }}>
              <Typography variant="h4" color="primary">{filteredTasks.length}</Typography>
              <Typography variant="caption" color="gray">Tasks Found</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#2d2d2d', color: '#fff' }}>
              <Typography variant="h4" color="secondary">
                {filteredTasks.filter(t => t.validationStatus === 'Validated').length}
              </Typography>
              <Typography variant="caption" color="gray">Validated</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#2d2d2d', color: '#fff' }}>
              <Typography variant="h4" sx={{ color: '#ff9800' }}>
                {filteredTasks.filter(t => ['Todo', 'In Progress'].includes(t.status)).length}
              </Typography>
              <Typography variant="caption" color="gray">Open Issues</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#2d2d2d', color: '#fff' }}>
              <Typography variant="h4" color="error">
                {filteredTasks.filter(t => t.evaluationScore <= 6).length}
              </Typography>
              <Typography variant="caption" color="gray">Detractors</Typography>
            </Paper>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2, borderColor: '#6366f1' }} />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MdDateRange /> Date Filter:
            </Typography>
            <ButtonGroup size="small" variant="outlined">
              <Button onClick={() => setDateFilter({ start: startOfWeek(subWeeks(new Date(), 2)), end: endOfWeek(new Date()), type: 'latest3Weeks' })} variant={dateFilter.type === 'latest3Weeks' ? 'contained' : 'outlined'}>Latest 3 Weeks</Button>
              <Button onClick={() => setDateFilter({ start: startOfWeek(new Date()), end: endOfWeek(new Date()), type: 'thisWeek' })} variant={dateFilter.type === 'thisWeek' ? 'contained' : 'outlined'}>This Week</Button>
              <Button onClick={() => setDateFilter({ start: startOfMonth(new Date()), end: endOfMonth(new Date()), type: 'thisMonth' })} variant={dateFilter.type === 'thisMonth' ? 'contained' : 'outlined'}>This Month</Button>
              <Button onClick={() => setDateFilter({ start: startOfYear(new Date()), end: endOfYear(new Date()), type: 'thisYear' })} variant={dateFilter.type === 'thisYear' ? 'contained' : 'outlined'}>This Year</Button>
              <Button onClick={() => setDateFilter({ start: null, end: null, type: 'all' })} variant={dateFilter.type === 'all' ? 'contained' : 'outlined'}>All Time</Button>
            </ButtonGroup>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start"
                value={tempStartDate}
                onChange={(v) => setTempStartDate(v)}
                slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
              />
              <DatePicker
                label="End"
                value={tempEndDate}
                onChange={(v) => setTempEndDate(v)}
                slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  setDateFilter({ start: tempStartDate, end: tempEndDate, type: 'custom' });
                }}
                sx={{ borderRadius: '20px', textTransform: 'none' }}
              >
                Apply
              </Button>
            </LocalizationProvider>
          </Box>
        </Stack>

        {/* Analytics Dashboard (Always Visible) */}
        <Box sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            {/* Reason Chart */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #eee', height: 350 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>Top Reasons</Typography>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={analyticsData.reason} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                      {analyticsData.reason.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff8042'][index % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            {/* Sub-Reason Chart */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #eee', height: 350 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>Top Sub-Reasons</Typography>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={analyticsData.subReason} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#82ca9d" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            {/* Root Cause Chart */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #eee', height: 350 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>Top Root Causes</Typography>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={analyticsData.rootCause} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#ffc658" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Weekly Trend Analytics (NEW) */}
        {trendData.data?.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 3, display: 'flex', alignItems: 'center', gap: 1, color: '#7b68ee' }}>
              <MdTimeline /> Weekly Performance Trends
            </Typography>
            <Grid container spacing={3}>
              {/* Reason Trends */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #eee', height: 400 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>Top Reasons Trend (Volume)</Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={trendData.data}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px', cursor: 'pointer' }}
                        onClick={handleLegendClick}
                        formatter={(value) => {
                          const item = trendData.topReasons.find(r => r.name === value);
                          const isHidden = hiddenSeries.has(value);
                          return (
                            <span style={{ color: isHidden ? '#999' : 'inherit', textDecoration: isHidden ? 'line-through' : 'none' }}>
                              {value} ({item?.total || 0})
                            </span>
                          );
                        }}
                      />
                      {trendData.topReasons.map((item, index) => (
                        <Line
                          key={item.name}
                          type="monotone"
                          dataKey={item.name}
                          stroke={['#6366f1', '#10b981', '#f59e0b', '#d946ef', '#ec4899'][index % 5]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                          hide={hiddenSeries.has(item.name)}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Owner Trends */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #eee', height: 400 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>Top Owners Load Trend</Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <AreaChart data={trendData.data}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px', cursor: 'pointer' }}
                        onClick={handleLegendClick}
                        formatter={(value) => {
                          const item = trendData.topOwners.find(o => o.name === value);
                          const isHidden = hiddenSeries.has(value);
                          return (
                            <span style={{ color: isHidden ? '#999' : 'inherit', textDecoration: isHidden ? 'line-through' : 'none' }}>
                              {value} ({item?.total || 0})
                            </span>
                          );
                        }}
                      />
                      {trendData.topOwners.map((item, index) => (
                        <Area
                          key={item.name}
                          type="monotone"
                          dataKey={item.name}
                          stackId="1"
                          stroke={['#0369a1', '#15803d', '#a16207', '#be123c', '#6d28d9'][index % 5]}
                          fill={['#0369a1', '#15803d', '#a16207', '#be123c', '#6d28d9'][index % 5]}
                          fillOpacity={0.6}
                          hide={hiddenSeries.has(item.name)}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>


      {/* Search and Export Bar */}
      <Box sx={{
        backgroundColor: '#2d2d2d',
        p: 2,
        borderRadius: '8px',
        border: '1px solid #3d3d3d',
        mb: 2,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'center'
      }}>
        <Tooltip title="Refresh data">
          <IconButton
            onClick={() => setUpdateRefetchTasks(prev => !prev)}
            disabled={loading}
            sx={{
              color: '#7b68ee',
              '&:hover': { backgroundColor: 'rgba(123, 104, 238, 0.08)' }
            }}
          >
            <MdRefresh className={loading ? 'animate-spin' : ''} />
          </IconButton>
        </Tooltip>

        <TextField
          variant="outlined"
          size="small"
          placeholder="Search by SLID, Name, Contact, or Feedback..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
                border: '1px solid #7b68ee !important',
              },
            },
          }}
        />

        <FormControl size="small" sx={{ minWidth: isMobile ? undefined : 120, width: isMobile ? '100%' : undefined }}>
          <InputLabel id="filter-select-label" sx={{ color: '#b3b3b3' }}>
            Eval Score
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
              backgroundColor: '#2d2d2d',
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #666 !important',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #7b68ee !important',
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: '#2d2d2d',
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

        <FormControl size="small" sx={{ minWidth: isMobile ? undefined : 120, width: isMobile ? '100%' : undefined }}>
          <InputLabel id="priority-filter-label" sx={{ color: '#b3b3b3' }}>
            Feedback Severity
          </InputLabel>
          <Select
            labelId="priority-filter-label"
            id="priority-filter"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            label="Feedback Severity"
            sx={{
              color: '#ffffff',
              borderRadius: '20px',
              backgroundColor: '#2d2d2d',
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #666 !important',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #7b68ee !important',
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: '#2d2d2d',
                  color: '#ffffff',
                },
              },
            }}
          >
            <MenuItem value="all">
              <Box display="flex" alignItems="center" gap={1}>
                <MdFilterList />
                <span>All Levels</span>
              </Box>
            </MenuItem>
            <MenuItem value="High">
              <Box display="flex" alignItems="center" gap={1}>
                <Chip label="High" size="small" color="error" />
              </Box>
            </MenuItem>
            <MenuItem value="Medium">
              <Box display="flex" alignItems="center" gap={1}>
                <Chip label="Medium" size="small" color="warning" />
              </Box>
            </MenuItem>
            <MenuItem value="Low">
              <Box display="flex" alignItems="center" gap={1}>
                <Chip label="Low" size="small" color="success" />
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: isMobile ? undefined : 120, width: isMobile ? '100%' : undefined }}>
          <InputLabel id="status-filter-label" sx={{ color: '#b3b3b3' }}>
            Task Status
          </InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Task Status"
            sx={{
              color: '#ffffff',
              borderRadius: '20px',
              backgroundColor: '#2d2d2d',
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #666 !important',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #7b68ee !important',
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: '#2d2d2d',
                  color: '#ffffff',
                },
              },
            }}
          >
            <MenuItem value="all">
              <Box display="flex" alignItems="center" gap={1}>
                <MdFilterList />
                <span>All Status</span>
              </Box>
            </MenuItem>
            <MenuItem value="Todo">
              <Box display="flex" alignItems="center" gap={1}>
                <MdError style={{ color: '#ff9800' }} />
                <span>Todo</span>
              </Box>
            </MenuItem>
            <MenuItem value="In Progress">
              <Box display="flex" alignItems="center" gap={1}>
                <LoadingSpinner variant="button" size={16} />
                <span>In Progress</span>
              </Box>
            </MenuItem>
            <MenuItem value="Closed">
              <Box display="flex" alignItems="center" gap={1}>
                <MdCheckCircle style={{ color: '#4caf50' }} />
                <span>Closed</span>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: isMobile ? undefined : 120, width: isMobile ? '100%' : undefined }}>
          <InputLabel id="governorate-filter-label" sx={{ color: '#b3b3b3' }}>
            Governorate
          </InputLabel>
          <Select
            labelId="governorate-filter-label"
            id="governorate-filter"
            value={governorateFilter}
            onChange={(e) => setGovernorateFilter(e.target.value)}
            label="Governorate"
            sx={{
              color: '#ffffff',
              borderRadius: '20px',
              backgroundColor: '#2d2d2d',
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #666 !important',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #7b68ee !important',
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: '#2d2d2d',
                  color: '#ffffff',
                },
              },
            }}
          >
            <MenuItem value="all">All Govs</MenuItem>
            {dropdownOptions['GOVERNORATES']?.map(opt => (
              <MenuItem key={opt._id} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          variant="outlined"
          size="small"
          placeholder="District..."
          value={districtFilter === 'all' ? '' : districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value || 'all')}
          sx={{
            minWidth: isMobile ? '100%' : 120,
            '& .MuiOutlinedInput-root': {
              borderRadius: '20px',
              backgroundColor: '#2d2d2d',
              color: '#ffffff',
              '& fieldset': { border: 'none' },
              '&:hover fieldset': { border: '1px solid #666 !important' },
              '&.Mui-focused fieldset': { border: '1px solid #7b68ee !important' },
            },
            '& .MuiInputBase-input::placeholder': { color: '#b3b3b3', fontSize: '0.8rem' }
          }}
        />

        <FormControl size="small" sx={{ minWidth: isMobile ? undefined : 120, width: isMobile ? '100%' : undefined }}>
          <InputLabel id="subcon-filter-label" sx={{ color: '#b3b3b3' }}>
            Subcon
          </InputLabel>
          <Select
            labelId="subcon-filter-label"
            id="subcon-filter"
            value={subconFilter}
            onChange={(e) => setSubconFilter(e.target.value)}
            label="Subcon"
            sx={{
              color: '#ffffff',
              borderRadius: '20px',
              backgroundColor: '#2d2d2d',
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #666 !important',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #7b68ee !important',
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: '#2d2d2d',
                  color: '#ffffff',
                },
              },
            }}
          >
            <MenuItem value="all">All Subcons</MenuItem>
            {dropdownOptions['TEAM_COMPANY']?.map(opt => (
              <MenuItem key={opt._id} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: isMobile ? undefined : 120, width: isMobile ? '100%' : undefined }}>
          <InputLabel id="supervisor-filter-label" sx={{ color: '#b3b3b3' }}>
            Supervisor
          </InputLabel>
          <Select
            labelId="supervisor-filter-label"
            id="supervisor-filter"
            value={supervisorFilter}
            onChange={(e) => setSupervisorFilter(e.target.value)}
            label="Supervisor"
            sx={{
              color: '#ffffff',
              borderRadius: '20px',
              backgroundColor: '#2d2d2d',
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #666 !important',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #7b68ee !important',
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: '#2d2d2d',
                  color: '#ffffff',
                },
              },
            }}
          >
            <MenuItem value="all">All Supervisors</MenuItem>
            {dropdownOptions['SUPERVISORS']?.map(opt => (
              <MenuItem key={opt._id} value={opt._id}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: isMobile ? undefined : 120, width: isMobile ? '100%' : undefined }}>
          <InputLabel id="team-name-filter-label" sx={{ color: '#b3b3b3' }}>
            Team Name
          </InputLabel>
          <Select
            labelId="team-name-filter-label"
            id="team-name-filter"
            value={teamNameFilter}
            onChange={(e) => setTeamNameFilter(e.target.value)}
            label="Team Name"
            sx={{
              color: '#ffffff',
              borderRadius: '20px',
              backgroundColor: '#2d2d2d',
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #666 !important',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #7b68ee !important',
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: '#2d2d2d',
                  color: '#ffffff',
                },
              },
            }}
          >
            <MenuItem value="all">All Teams</MenuItem>
            {dropdownOptions['FIELD_TEAMS']?.map(opt => (
              <MenuItem key={opt._id} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: isMobile ? undefined : 120, width: isMobile ? '100%' : undefined }}>
          <InputLabel id="validation-filter-label" sx={{ color: '#b3b3b3' }}>
            Validation
          </InputLabel>
          <Select
            labelId="validation-filter-label"
            id="validation-filter"
            value={validationFilter}
            onChange={(e) => setValidationFilter(e.target.value)}
            label="Validation"
            sx={{
              color: '#ffffff',
              borderRadius: '20px',
              backgroundColor: '#2d2d2d',
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #666 !important',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                border: '1px solid #7b68ee !important',
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: '#2d2d2d',
                  color: '#ffffff',
                },
              },
            }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="Validated">Validated</MenuItem>
            <MenuItem value="Not validated">Not Validated</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          onClick={exportToExcel}
          startIcon={<MdFileDownload />}
          sx={{
            borderColor: '#3d3d3d',
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
              borderColor: '#3d3d3d',
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
      <TableContainer component={Paper} onClick={handleTableContainerClick}
        sx={{
          mt: 2,
          maxWidth: '100%',
          overflowX: 'auto',
          backgroundColor: '#2d2d2d',
          border: '1px solid #3d3d3d',
          borderRadius: '0px',
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
            // "& .MuiTableRow-root": {
            //   backgroundColor: "#2d2d2d",
            //   "&:hover": {
            //     backgroundColor: "#2d2d2d",
            //   },
            // }
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
            backgroundColor: "#e5e7eb",
          },
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell style={{ fontSize: '0.875rem', width: 100 }}>Created At</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 100 }}>SLID</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 120 }}>Customer Name</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 120 }}>Contact</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 200, maxWidth: 300 }}>Customer Feedback</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 200, maxWidth: 300 }}>Management Note</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 150, maxWidth: 200 }}>Summary</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 100 }}>Status</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 100 }}>Feedback Severity</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 80 }}>Eval Score</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 80 }}>Week</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTasks.length > 0 ? (
              paginatedTasks
                .map((task) => {
                  const { isFavorited } = getFavoriteStatus(task._id);
                  return (
                    <TableRow
                      key={task._id}
                      sx={{
                        backgroundColor: task._id === selectedRowId ? '#eef2ff' : visitedRowIds.includes(task._id) ? '#fafafa' : '#ffffff',
                        transition: '0.2s',
                        borderLeft: visitedRowIds.includes(task._id) ? '6px solid #7b68ee' : '6px solid transparent',
                        '&:hover': { backgroundColor: '#f5f5f5' }
                      }}
                    >
                      <TableCell style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" flexDirection="column" gap={0.5}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{task.slid || "-"}</Typography>
                          {task.validationStatus === 'Validated' ? (
                            <Chip
                              label="Validated"
                              size="small"
                              icon={<MdCheckCircle style={{ color: '#ffffff' }} />}
                              sx={{
                                backgroundColor: '#4caf50',
                                color: '#ffffff',
                                height: '20px',
                                fontSize: '0.65rem',
                                '& .MuiChip-icon': { fontSize: '14px' }
                              }}
                            />
                          ) : task.validationStatus === 'Not validated' ? (
                            <Chip
                              label="Not Validated"
                              size="small"
                              icon={<MdError style={{ color: '#ffffff' }} />}
                              sx={{
                                backgroundColor: '#ff9800',
                                color: '#ffffff',
                                height: '20px',
                                fontSize: '0.65rem',
                                '& .MuiChip-icon': { fontSize: '14px' }
                              }}
                            />
                          ) : null}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={500} sx={{ direction: 'rtl', textAlign: 'right', fontSize: '0.8rem' }}>
                          {task.customerName || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{task.contactNumber || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        {task.customerFeedback ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: 300 }}>
                            <Typography
                              sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                textAlign: 'right',
                                direction: 'rtl',
                                fontSize: '0.8rem'
                              }}
                            >
                              {task.customerFeedback}
                            </Typography>
                            <Tooltip title="Read More">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDialogContent(task.customerFeedback);
                                  setDialogTitle('Customer Feedback');
                                  setDialogOpen(true);
                                }}
                                sx={{ color: '#fff', p: 0.5 }}
                              >
                                <MdVisibility size={16} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: 300 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: '0.8rem',
                              color: '#4caf50',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {task.subTasks?.filter(st => st.note).map(st => st.note).join(" | ") || "-"}
                          </Typography>
                          {task.subTasks?.some(st => st.note) && (
                            <Tooltip title="Read More">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const fullNote = task.subTasks?.filter(st => st.note).map(st => st.note).join(" | ");
                                  setDialogContent(fullNote);
                                  setDialogTitle('Management Note');
                                  setDialogOpen(true);
                                }}
                                sx={{ color: '#4caf50', p: 0.5 }}
                              >
                                <MdVisibility size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: 200 }}>
                          <Typography variant="caption" sx={{
                            color: '#2196f3',
                            fontWeight: '500',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {task.subTasks?.[0]?.title === "Task Reception" ? task.subTasks[0].shortNote : ""}
                          </Typography>
                          {task.subTasks?.[0]?.title === "Task Reception" && task.subTasks[0].shortNote && (
                            <Tooltip title="Read More">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDialogContent(task.subTasks[0].shortNote);
                                  setDialogTitle('Summary');
                                  setDialogOpen(true);
                                }}
                                sx={{ color: '#2196f3', p: 0.5 }}
                              >
                                <MdVisibility size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={task.status}
                          size="small"
                          color={task.status === 'Completed' ? 'success' : task.status === 'In Progress' ? 'primary' : 'default'}
                          variant={task.status === 'Todo' ? 'outlined' : 'filled'}
                        />
                      </TableCell>
                      <TableCell>
                        {task.priority ? (
                          <Chip
                            label={task.priority}
                            size="small"
                            color={
                              task.priority === 'High' ? 'error' :
                                task.priority === 'Medium' ? 'warning' :
                                  task.priority === 'Low' ? 'success' : 'default'
                            }
                            sx={{
                              fontWeight: 'bold',
                              minWidth: 80
                            }}
                          />
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
                        {getWeekDisplay(task.interviewDate)}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Tooltip title={visitedRowIds.includes(task._id) ? "Mark as Unread" : "Mark as Read"}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVisitedRowIds(prev =>
                                  prev.includes(task._id)
                                    ? prev.filter(id => id !== task._id)
                                    : [...prev, task._id]
                                );
                              }}
                              sx={{
                                color: visitedRowIds.includes(task._id) ? '#7b68ee' : '#b0b0b0',
                                '&:hover': {
                                  color: visitedRowIds.includes(task._id) ? '#6854d9' : '#7b68ee'
                                }
                              }}
                            >
                              {visitedRowIds.includes(task._id) ? <MdCheckCircle /> : <MdRadioButtonUnchecked />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={isFavorited ? "Remove from Favorites" : "Add to Favorites"}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(task);
                              }}
                              sx={{
                                color: isFavorited ? '#ffc107' : '#6b7280',
                                '&:hover': {
                                  color: isFavorited ? '#ffd700' : '#ffffff'
                                }
                              }}
                            >
                              {isFavorited ? <MdStar /> : <MdStarOutline />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Manage Subtasks">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSubtaskTask(task);
                                setManageSubtasksDialogOpen(true);
                              }}
                              sx={{
                                color: '#10b981',
                                '&:hover': { color: '#059669' }
                              }}
                            >
                              <MdAssignmentTurnedIn />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTask(task);
                                setViewDialogOpen(true);
                              }}
                              sx={{ color: '#7b68ee' }}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
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
                                    onClick={(e) => {
                                      e.stopPropagation();
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
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#ffffff' }}>
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
        justifyContent: 'flex-start',
        mt: 0,
        width: '100%',
        '& .MuiTablePagination-root': {
          color: '#ffffff',
        },
        '& .MuiTablePagination-selectIcon': {
          color: '#ffffff',
        }
      }}>
        <TablePagination
          component="div"
          count={filteredTasks.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{
            // borderTop: '1px solid #e5e7eb',
            backgroundColor: '#2d2d2d',
            display: 'flex',
            justifyContent: 'flex-start',
            width: '100%',
            color: '#ffffff',
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              color: '#ffffff',
              marginBottom: 0
            },
            '& .MuiSelect-select, & .MuiInputBase-root': {
              color: '#ffffff',
            },
            '& .MuiSvgIcon-root': {
              color: '#ffffff',
            },
            '& .MuiButtonBase-root': {
              color: '#ffffff',
              '&:disabled': {
                color: '#666666'
              }
            }
          }}
        />
      </Box>

      {/* Edit Task Dialog */}
      {selectedTask && (
        <EditTaskDialog
          open={editDialogOpen}
          setOpen={setEditDialogOpen}
          task={selectedTask}
          handleTaskUpdate={(updatedTask) => {
            setAllTasks(allTasks.map(t =>
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
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: '#2d2d2d',
            boxShadow: 'none',
            borderRadius: isMobile ? 0 : '8px',
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: isMobile ? '12px 16px' : '16px 24px',
        }}>
          <Typography variant={isMobile ? "subtitle1" : "h6"} component="div" sx={{ fontWeight: 500 }}>
            Confirm Deletion
          </Typography>
        </DialogTitle>

        <Divider sx={{ backgroundColor: '#e5e7eb' }} />

        <DialogContent sx={{
          backgroundColor: '#2d2d2d',
          padding: isMobile ? '16px' : '20px 24px',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#e5e7eb',
            borderRadius: '2px',
          },
        }}>
          <Typography variant={isMobile ? "body2" : "body1"} sx={{ color: '#ffffff' }}>
            Are you sure you want to delete task {taskToDelete?.slid}?
          </Typography>
          <Typography
            variant={isMobile ? "caption" : "body2"}
            color="error"
            sx={{
              mt: 2,
              display: 'inline-block',
              padding: '8px 12px',
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              borderRadius: '4px',
              borderLeft: '3px solid #f44336'
            }}
          >
            This action will move the task to trash and cannot be undone.
          </Typography>
        </DialogContent>

        <Divider sx={{ backgroundColor: '#e5e7eb' }} />

        <DialogActions sx={{
          backgroundColor: '#2d2d2d',
          borderTop: '1px solid #e5e7eb',
          padding: isMobile ? '8px 16px' : '12px 24px',
        }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            size={isMobile ? "small" : "medium"}
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
            size={isMobile ? "small" : "medium"}
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
      {/* Read More Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#2d2d2d',
            color: '#fff',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #444' }}>
          {dialogTitle}
          <IconButton
            onClick={() => setDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8, color: '#aaa' }}
          >
            <MdClose />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2, direction: 'rtl', textAlign: 'right' }}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {dialogContent || "No content available."}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #444' }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#fff' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Detailed Subtask Dialog */}
      <DetailedSubtaskDialog
        key={subtaskTask?._id || 'subtasks-dialog'}
        open={manageSubtasksDialogOpen}
        onClose={() => {
          setManageSubtasksDialogOpen(false);
          setSubtaskTask(null);
        }}
        task={subtaskTask}
        setUpdateTasksList={setUpdateRefetchTasks}
      />
    </Box>
  );
};

export default AllTasksList;