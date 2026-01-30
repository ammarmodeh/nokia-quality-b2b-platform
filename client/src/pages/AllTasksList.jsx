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
  ButtonGroup,
  Autocomplete,
  alpha
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
  MdHourglassEmpty,
  MdPhoneMissed,
  MdCalendarToday,
  MdBlock,
  MdError,
  MdBarChart,
  MdTimeline,
  MdDateRange,
  MdAssignmentTurnedIn,
  MdHistory,
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
import RecordTicketDialog from '../components/task/RecordTicketDialog';
import { TaskDetailsDialog } from '../components/TaskDetailsDialog';
import { getCustomWeekNumber as getAggregatedWeekNumber } from '../utils/helpers';
import { utils, writeFile } from 'xlsx';
import AddTask from '../components/task/AddTask';
import AdvancedSearch from '../components/common/AdvancedSearch';
import moment from 'moment';

const DEFAULT_SETTINGS_STATE = { settings: {} };

const AllTasksList = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const user = useSelector((state) => state?.auth?.user);

  // --- Consolidated State ---
  const { settings } = useSelector((state) => state.settings || DEFAULT_SETTINGS_STATE);

  const getWeekDisplay = (date) => {
    if (!date) return "-";
    try {
      return getAggregatedWeekNumber(new Date(date), new Date(date).getFullYear(), settings);
    } catch (e) {
      return "-";
    }
  };

  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
  const [confirmSlid, setConfirmSlid] = useState('');
  const [openAddTask, setOpenAddTask] = useState(false);
  const [updateRefetchTasks, setUpdateRefetchTasks] = useState(false);

  const [selectedRowId, setSelectedRowId] = useState(null);
  const [dialogContent, setDialogContent] = useState('');
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const [dropdownOptions, setDropdownOptions] = useState({});
  const [favoriteTasks, setFavoriteTasks] = useState([]);
  // const [visitedRowIds, setVisitedRowIds] = useState([]); // Removed in favor of backend persistence
  const [hiddenSeries, setHiddenSeries] = useState(new Set());
  const [recordTicketDialogOpen, setRecordTicketDialogOpen] = useState(false);
  const [ticketTask, setTicketTask] = useState(null);

  // Advanced Search State
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [advSearchFields, setAdvSearchFields] = useState({
    slid: '',
    gaiaId: '',
    requestNumber: '',
    customerName: '',
    contactNumber: ''
  });
  const [activeAdvSearch, setActiveAdvSearch] = useState(false);

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
      setError(null);
      try {
        const results = await Promise.allSettled([
          api.get("/tasks/get-all-tasks"),
          api.get('/dropdown-options/all'),
          api.get("/favourites/get-favourites")
        ]);

        const [tasksRes, optionsRes, favRes] = results;

        if (tasksRes.status === 'fulfilled') {
          const tasksData = Array.isArray(tasksRes.value.data)
            ? tasksRes.value.data
            : (tasksRes.value.data.tasks || []);
          setAllTasks(tasksData);
        } else {
          console.error("Error fetching tasks:", tasksRes.reason);
          setError("Failed to load task data. Please check your connection.");
        }

        if (optionsRes.status === 'fulfilled') {
          setDropdownOptions(optionsRes.value.data);
        } else {
          console.error("Error fetching options:", optionsRes.reason);
        }



        if (favRes.status === 'fulfilled') {
          setFavoriteTasks(favRes.value.data.favourites || []);
        } else {
          console.error("Error fetching favorites:", favRes.reason);
        }

      } catch (err) {
        console.error("Unexpected error fetching data:", err);
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

  // Extract unique districts from all tasks
  const uniqueDistricts = useMemo(() => {
    const districts = new Set();
    allTasks.forEach(task => {
      if (task.district && task.district.trim()) {
        districts.add(task.district.trim());
      }
    });
    return Array.from(districts).sort();
  }, [allTasks]);

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


      // 10. Advanced Search
      if (activeAdvSearch) {
        if (advSearchFields.slid && !task.slid?.toLowerCase().includes(advSearchFields.slid.toLowerCase())) return false;
        if (advSearchFields.gaiaId && !task.latestGaia?.ticketId?.toLowerCase().includes(advSearchFields.gaiaId.toLowerCase())) return false;
        if (advSearchFields.requestNumber && !String(task.requestNumber || '').includes(advSearchFields.requestNumber)) return false;
        if (advSearchFields.customerName && !task.customerName?.toLowerCase().includes(advSearchFields.customerName.toLowerCase())) return false;
        if (advSearchFields.contactNumber && !String(task.contactNumber || '').includes(advSearchFields.contactNumber)) return false;
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
  }, [allTasks, priorityFilter, statusFilter, governorateFilter, districtFilter, subconFilter, supervisorFilter, teamNameFilter, validationFilter, filter, dateFilter, advSearchFields, activeAdvSearch]);

  // Pagination
  const paginatedTasks = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredTasks.slice(start, start + rowsPerPage);
  }, [filteredTasks, page, rowsPerPage]);









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
      'GAIA Type': task.latestGaia?.transactionType || 'N/A',
      'GAIA State': task.latestGaia?.transactionState || 'N/A',
      'GAIA Reason': task.latestGaia?.unfReasonCode || 'N/A',
      'Follow-up Needed': task.technicalDetails?.followUpRequired ? 'Yes' : 'No',
      'Follow-up Date': task.technicalDetails?.followUpDate ? format(new Date(task.technicalDetails.followUpDate), 'yyyy-MM-dd') : 'N/A',
      'Validation Status': task.validationStatus || 'Pending',
      'Customer Feedback': task.customer?.customerFeedback || 'N/A',
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

  const renderResolutionIcon = (status) => {
    switch (status) {
      case "No Answer":
        return (
          <Tooltip title="No Answer">
            <IconButton size="small" sx={{ color: '#ff9800', p: 0.5, cursor: 'default' }}>
              <MdPhoneMissed size={20} />
            </IconButton>
          </Tooltip>
        );
      case "Answered and resolved":
        return (
          <Tooltip title="Answered and resolved">
            <IconButton size="small" sx={{ color: '#4caf50', p: 0.5, cursor: 'default' }}>
              <MdCheckCircle size={20} />
            </IconButton>
          </Tooltip>
        );
      case "Appointment scheduled":
        return (
          <Tooltip title="Appointment scheduled">
            <IconButton size="small" sx={{ color: '#2196f3', p: 0.5, cursor: 'default' }}>
              <MdCalendarToday size={20} />
            </IconButton>
          </Tooltip>
        );
      case "No action taken":
        return (
          <Tooltip title="No action taken">
            <IconButton size="small" sx={{ color: '#f44336', p: 0.5, cursor: 'default' }}>
              <MdBlock size={20} />
            </IconButton>
          </Tooltip>
        );
      default:
        return (
          <Tooltip title="Pending">
            <IconButton size="small" sx={{ color: '#7b68ee', p: 0.5, cursor: 'default' }}>
              <MdHourglassEmpty size={20} />
            </IconButton>
          </Tooltip>
        );
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

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 3, width: '100%', overflowX: 'hidden' }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%', overflowX: 'auto', flexWrap: { xs: 'nowrap', md: 'wrap' } }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main', display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              <MdDateRange /> Date Filter:
            </Typography>
            <Box sx={{
              display: 'flex',
              gap: 1,
              flexWrap: 'wrap',
              flexShrink: 0,
              '& .MuiButton-root': {
                whiteSpace: 'nowrap',
                minWidth: 'auto',
                px: 1.5,
                borderRadius: '20px',
                textTransform: 'none',
                fontWeight: 600
              }
            }}>
              <Button onClick={() => setDateFilter({ start: startOfWeek(subWeeks(new Date(), 2)), end: endOfWeek(new Date()), type: 'latest3Weeks' })} variant={dateFilter.type === 'latest3Weeks' ? 'contained' : 'outlined'} size="small">Latest 3 Weeks</Button>
              <Button onClick={() => setDateFilter({ start: startOfWeek(new Date()), end: endOfWeek(new Date()), type: 'thisWeek' })} variant={dateFilter.type === 'thisWeek' ? 'contained' : 'outlined'} size="small">This Week</Button>
              <Button onClick={() => setDateFilter({ start: startOfMonth(new Date()), end: endOfMonth(new Date()), type: 'thisMonth' })} variant={dateFilter.type === 'thisMonth' ? 'contained' : 'outlined'} size="small">This Month</Button>
              <Button onClick={() => setDateFilter({ start: startOfYear(new Date()), end: endOfYear(new Date()), type: 'thisYear' })} variant={dateFilter.type === 'thisYear' ? 'contained' : 'outlined'} size="small">This Year</Button>
              <Button onClick={() => setDateFilter({ start: null, end: null, type: 'all' })} variant={dateFilter.type === 'all' ? 'contained' : 'outlined'} size="small">All Time</Button>
            </Box>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
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
                  sx={{ borderRadius: '20px', textTransform: 'none', flexShrink: 0 }}
                >
                  Apply
                </Button>
              </Box>
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
                  <BarChart data={analyticsData.reason} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
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
                  <BarChart data={analyticsData.subReason} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
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
                  <BarChart data={analyticsData.rootCause} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
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

        <FormControl size="small" sx={{ minWidth: isMobile ? undefined : 120, width: isMobile ? '100%' : undefined }}>
          <InputLabel id="district-filter-label" sx={{ color: '#b3b3b3' }}>
            District
          </InputLabel>
          <Select
            labelId="district-filter-label"
            id="district-filter"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            label="District"
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
            <MenuItem value="all">All Districts</MenuItem>
            {uniqueDistricts.map(district => (
              <MenuItem key={district} value={district}>{district}</MenuItem>
            ))}
          </Select>
        </FormControl>

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

        <Autocomplete
          size="small"
          sx={{ minWidth: isMobile ? '100%' : 150 }}
          options={['all', ...(dropdownOptions['FIELD_TEAMS']?.map(opt => opt.value) || [])]}
          getOptionLabel={(option) => option === 'all' ? 'All Teams' : option}
          value={teamNameFilter}
          onChange={(event, newValue) => {
            setTeamNameFilter(newValue || 'all');
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Team Name"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '20px',
                  backgroundColor: '#2d2d2d',
                  color: '#ffffff',
                  '& fieldset': { border: 'none' },
                  '&:hover fieldset': { border: '1px solid #666 !important' },
                  '&.Mui-focused fieldset': { border: '1px solid #7b68ee !important' },
                },
                '& .MuiInputLabel-root': { color: '#b3b3b3' },
                '& .MuiSvgIcon-root': { color: '#ffffff' }
              }}
            />
          )}
          slotProps={{
            paper: {
              sx: {
                backgroundColor: '#2d2d2d',
                color: '#ffffff',
              }
            }
          }}
        />

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

        <Box sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          width: isMobile ? '100%' : 'auto',
          flexGrow: 1
        }}>
          <Button
            variant="contained"
            startIcon={<MdSearch />}
            onClick={() => setAdvancedSearchOpen(true)}
            sx={{
              bgcolor: activeAdvSearch ? '#4caf50' : '#7b68ee',
              color: '#fff',
              borderRadius: '20px',
              px: 3,
              '&:hover': {
                bgcolor: activeAdvSearch ? '#388e3c' : '#6854d9'
              },
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}
          >
            {activeAdvSearch ? "Advanced Filers Active" : "Advanced Search"}
          </Button>

          {activeAdvSearch && (
            <Button
              variant="text"
              startIcon={<MdClose />}
              onClick={() => {
                setAdvSearchFields({ slid: '', gaiaId: '', requestNumber: '', customerName: '', contactNumber: '' });
                setActiveAdvSearch(false);
              }}
              sx={{
                color: '#f44336',
                fontWeight: 'bold',
                '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.08)' }
              }}
            >
              Clear Search
            </Button>
          )}

          <Box sx={{
            display: 'flex',
            gap: 1,
            width: isMobile ? '100%' : 'auto',
            justifyContent: isMobile ? 'space-between' : 'flex-start',
            flexWrap: 'wrap'
          }}>
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
                flexGrow: isMobile ? 1 : 0
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
                  flexGrow: isMobile ? 1 : 0
                }}
              >
                Create Task
              </Button>
            )}
          </Box>
        </Box>
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
              <TableCell style={{ fontSize: '0.875rem', width: 120 }}>SLID / REQ #</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 150 }}>Customer Info</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 200 }}>Feedback</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 150 }}>Operation / Tariff</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 100 }}>Priority</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 100 }}>Status</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 150 }}>Location</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 150 }}>Team / Subcon</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 150 }}>Root Cause</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 80 }}>Score</TableCell>
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
                      onClick={(e) => {
                        if (!e.defaultPrevented) {
                          setSelectedRowId(task._id);
                        }
                      }}
                      sx={{
                        backgroundColor: task._id === selectedRowId
                          ? 'rgba(123, 104, 238, 0.15) !important'
                          : task.readBy?.includes(user?._id)
                            ? '#f0f0f0'
                            : '#ffffff',
                        transition: '0.2s',
                        borderLeft: task.readBy?.includes(user?._id) ? '6px solid #7b68ee' : '6px solid transparent',
                        '&:hover': { backgroundColor: '#f5f5f5' }
                      }}
                    >
                      <TableCell style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" flexDirection="column" gap={0.5}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{task.slid || "-"}</Typography>
                          <Typography variant="caption" sx={{ color: '#7b68ee', fontWeight: 'bold' }}>
                            REQ: {task.requestNumber || "-"}
                          </Typography>
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
                        <Box display="flex" flexDirection="column" gap={0.2}>
                          <Typography fontWeight={700} sx={{ direction: 'rtl', textAlign: 'right', fontSize: '0.85rem' }}>
                            {task.customerName || task.customer?.customerName || "-"}
                          </Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', opacity: 0.7 }}>
                            {task.contactNumber || task.customer?.contactNumber || '-'}
                          </Typography>
                          <Typography variant="caption" color="primary" sx={{ fontSize: '0.7rem' }}>
                            {task.customerType || "-"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ direction: 'rtl', textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                            {(() => {
                              const feedback = task.customerFeedback || task.customer?.customerFeedback;
                              if (feedback) {
                                return feedback.length > 80 ? (
                                  <>
                                    {feedback.substring(0, 80)}...
                                    <Button
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDialogTitle("Customer Feedback");
                                        setDialogContent(feedback);
                                        setDialogOpen(true);
                                      }}
                                      sx={{
                                        minWidth: 'auto',
                                        p: 0,
                                        ml: 1,
                                        textTransform: 'none',
                                        color: '#7b68ee',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        '&:hover': { background: 'transparent', textDecoration: 'underline' }
                                      }}
                                    >
                                      Read More
                                    </Button>
                                  </>
                                ) : (
                                  feedback
                                );
                              }
                              return <Typography variant="caption" sx={{ color: '#aaa' }}>-</Typography>;
                            })()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#2196f3' }}>
                          {task.operation || task.technicalDetails?.operation || "-"}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: '#9c27b0', fontWeight: 'bold' }}>
                          {task.tarrifName || "-"}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">{task.category}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={task.priority || "Normal"}
                          size="small"
                          sx={{
                            fontWeight: 'bold',
                            fontSize: '0.7rem',
                            height: '24px',
                            backgroundColor: task.priority === 'High' ? 'rgba(244, 67, 54, 0.15)' :
                              task.priority === 'Medium' ? 'rgba(255, 152, 0, 0.15)' :
                                task.priority === 'Low' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: task.priority === 'High' ? '#f44336' :
                              task.priority === 'Medium' ? '#ff9800' :
                                task.priority === 'Low' ? '#4caf50' : '#fff',
                            border: '1px solid',
                            borderColor: 'divider'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={task.status}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            borderRadius: '6px',
                            bgcolor: (task.status === 'Closed' || task.status === 'Completed') ? 'rgba(76, 175, 80, 0.15)' :
                              task.status === 'In Progress' ? 'rgba(33, 150, 243, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: (task.status === 'Closed' || task.status === 'Completed') ? '#4caf50' :
                              task.status === 'In Progress' ? '#2196f3' : '#fff',
                            border: '1px solid',
                            borderColor: 'divider'
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {task.governorate || "-"}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {task.district || "-"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#7b68ee' }}>
                            {task.teamName || "-"}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                            {task.teamCompany || "-"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#f44336', fontSize: '0.8rem' }}>
                          {task.rootCause || task.technicalDetails?.rootCause || task.reason || "-"}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', opacity: 0.7, fontSize: '0.7rem' }}>
                          {task.subReason || task.technicalDetails?.subReason || ""}
                        </Typography>
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
                          <Tooltip title={task.readBy?.includes(user?._id) ? "Mark as Unread" : "Mark as Read"}>
                            <IconButton
                              size="small"
                              onClick={async (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const isRead = task.readBy?.includes(user?._id);
                                const newReadBy = isRead
                                  ? (task.readBy || []).filter(id => id !== user?._id)
                                  : [...(task.readBy || []), user?._id];

                                // Optimistic update
                                setAllTasks(prev => prev.map(t =>
                                  t._id === task._id ? { ...t, readBy: newReadBy } : t
                                ));

                                try {
                                  await api.put(`/tasks/update-task/${task._id}`, { readBy: newReadBy });
                                } catch (err) {
                                  console.error("Failed to update read status", err);
                                }
                              }}
                              sx={{
                                color: task.readBy?.includes(user?._id) ? '#7b68ee' : '#b0b0b0',
                                '&:hover': {
                                  color: task.readBy?.includes(user?._id) ? '#6854d9' : '#7b68ee'
                                }
                              }}
                            >
                              {task.readBy?.includes(user?._id) ? <MdCheckCircle /> : <MdRadioButtonUnchecked />}
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
                          <Tooltip title="Record Performance Ticket / History">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTicketTask(task);
                                setRecordTicketDialogOpen(true);
                              }}
                              sx={{
                                color: '#10b981',
                                '&:hover': { color: '#059669' }
                              }}
                            >
                              <MdHistory />
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
                                      setConfirmSlid('');
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
                  {activeAdvSearch ? 'No matching tasks found for your advanced search' : 'No tasks available'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer >

      {/* Pagination */}
      < Box sx={{
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
      </Box >

      {/* Edit Task Dialog */}
      {
        selectedTask && (
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
        )
      }

      {/* View Task Dialog */}
      {
        selectedTask && (
          <TaskDetailsDialog
            open={viewDialogOpen}
            onClose={() => {
              setViewDialogOpen(false);
              setSelectedTask(null);
            }}
            tasks={[selectedTask]}
            teamName={selectedTask.teamName || "Unknown Team"}
          />
        )
      }

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
            borderRadius: isMobile ? 0 : '12px',
            border: '1px solid #3d3d3d'
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          backgroundColor: '#2d2d2d',
          color: '#f44336',
          borderBottom: '1px solid #3d3d3d',
          padding: isMobile ? '12px 16px' : '20px 24px',
        }}>
          <MdDelete size={28} />
          <Typography variant={isMobile ? "subtitle1" : "h6"} component="div" sx={{ fontWeight: 900, letterSpacing: -0.5 }}>
            Critical Protocol: Confirm Deletion
          </Typography>
        </DialogTitle>

        <DialogContent sx={{
          backgroundColor: '#2d2d2d',
          padding: isMobile ? '16px' : '24px 24px',
        }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="body1" sx={{ color: '#ffffff', mb: 1.5, fontWeight: 500 }}>
                Are you sure you want to delete this task?
              </Typography>
              <Box sx={{
                p: 1.5,
                bgcolor: alpha('#f44336', 0.1),
                borderRadius: 2,
                border: '1px solid',
                borderColor: alpha('#f44336', 0.3),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2
              }}>
                <Typography variant="caption" sx={{ color: '#aaa', fontWeight: 900, textTransform: 'uppercase' }}>Target SLID:</Typography>
                <Typography variant="h6" sx={{ color: '#f44336', fontWeight: 900, fontFamily: 'monospace' }}>{taskToDelete?.slid}</Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#aaa' }}>
                This action will move the task and all its technical sub-logs to the trash. It will no longer appear in active dashboards.
              </Typography>
            </Box>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha('#f44336', 0.05), borderStyle: 'dashed', borderColor: '#f44336' }}>
              <Typography variant="caption" sx={{ color: '#f44336', fontWeight: 900, display: 'block', mb: 1, textTransform: 'uppercase' }}>
                Required Authorization
              </Typography>
              <TextField
                fullWidth
                label="Enter SLID to Confirm"
                placeholder={taskToDelete?.slid}
                value={confirmSlid}
                onChange={(e) => setConfirmSlid(e.target.value)}
                autoFocus
                size="small"
                variant="outlined"
                helperText="Enter the exact SLID displayed above to enable deletion."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: alpha('#fff', 0.2) },
                    '&:hover fieldset': { borderColor: '#f44336' },
                    '&.Mui-focused fieldset': { borderColor: '#f44336' }
                  },
                  '& .MuiInputLabel-root': { color: '#aaa' },
                  '& .MuiFormHelperText-root': { color: '#888' }
                }}
              />
            </Paper>
          </Stack>
        </DialogContent>

        <DialogActions sx={{
          backgroundColor: alpha('#000', 0.2),
          borderTop: '1px solid #3d3d3d',
          padding: isMobile ? '8px 16px' : '16px 24px',
        }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{
              color: '#aaa',
              fontWeight: 900,
              '&:hover': { color: '#fff' }
            }}
          >
            ABORT
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            onClick={handleDeleteTask}
            variant="contained"
            color="error"
            disabled={confirmSlid !== taskToDelete?.slid}
            sx={{
              backgroundColor: '#f44336',
              fontWeight: 900,
              px: 4,
              '&:hover': {
                backgroundColor: '#d32f2f',
              },
              '&.Mui-disabled': {
                backgroundColor: alpha('#f44336', 0.1),
                color: alpha('#fff', 0.2)
              }
            }}
          >
            CONFIRM PURGE
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

      {/* Record Performance Ticket Dialog */}
      <RecordTicketDialog
        key={ticketTask?._id || 'ticket-dialog'}
        open={recordTicketDialogOpen}
        onClose={() => {
          setRecordTicketDialogOpen(false);
          setTicketTask(null);
        }}
        task={ticketTask}
        onTicketAdded={() => setUpdateRefetchTasks(prev => !prev)}
      />

      {/* Advanced Search Dialog */}
      <AdvancedSearch
        open={advancedSearchOpen}
        onClose={() => setAdvancedSearchOpen(false)}
        fields={advSearchFields}
        setFields={setAdvSearchFields}
        onInitiate={() => {
          setActiveAdvSearch(true);
          setAdvancedSearchOpen(false);
        }}
        onClear={() => {
          setAdvSearchFields({ slid: '', gaiaId: '', requestNumber: '', customerName: '', contactNumber: '' });
          setActiveAdvSearch(false);
          setAdvancedSearchOpen(false);
        }}
      />
    </Box >
  );
};

export default AllTasksList;