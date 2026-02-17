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
  alpha,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
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
  MdTimeline,
  MdInsights,
  MdDateRange,
  MdAssignmentTurnedIn,
  MdHistory,
  MdExpandMore,
  MdBarChart
} from 'react-icons/md';
import {
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
import GaiaStepsDialog from '../components/task/GaiaStepsDialog';
import { TaskDetailsDialog } from '../components/TaskDetailsDialog';
import { getCustomWeekNumber as getAggregatedWeekNumber, getCustomWeekRange } from '../utils/helpers';
import { utils, writeFile } from 'xlsx';
import AddTask from '../components/task/AddTask';
import AdvancedSearch from '../components/common/AdvancedSearch';
import moment from 'moment';
import AllTasksDeepDiveAnalytics from '../components/task/AllTasksDeepDiveAnalytics';

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
    start: null, // Will be set in useEffect once settings load
    end: null,
    type: 'thisWeek'
  });
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);

  // Drill-down State
  const [drillDownState, setDrillDownState] = useState({
    open: false,
    title: '',
    category: '',
    value: '',
    tasks: []
  });

  const handleDrillDownRowClick = (filters, customTitle) => {
    const drillTasks = filteredTasks.filter(t => {
      return Object.entries(filters).every(([key, value]) => {
        const taskVal = t[key];
        if (Array.isArray(taskVal)) return taskVal.includes(value);
        return taskVal === value;
      });
    });
    setDrillDownState({
      open: true,
      title: customTitle,
      filters,
      tasks: drillTasks
    });
  };



  // --- Samples Token Integration State ---
  const [samplesTokenData, setSamplesTokenData] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(false);

  // Sync initial date filter with settings
  useEffect(() => {
    if (settings) {
      const today = new Date();
      const thisWeek = getCustomWeekRange(today, settings);
      setDateFilter(prev => {
        if (prev.type === 'thisWeek' && !prev.start) {
          return { ...thisWeek, type: 'thisWeek' };
        }
        return prev;
      });
      if (!tempStartDate) {
        setTempStartDate(thisWeek.start);
        setTempEndDate(thisWeek.end);
      }
    }
  }, [settings]);

  // --- Samples Token Fetching ---
  useEffect(() => {
    const fetchSamplesToken = async () => {
      if (!dateFilter.start || !dateFilter.end) return;

      setLoadingSamples(true);
      try {
        const startYear = new Date(dateFilter.start).getFullYear();
        const endYear = new Date(dateFilter.end).getFullYear();
        const yearsToFetch = Array.from(
          { length: endYear - startYear + 1 },
          (_, i) => startYear + i
        );

        const promises = yearsToFetch.map(year =>
          api.get(`/samples-token/${year}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          }).catch(err => ({ data: [] }))
        );

        const responses = await Promise.all(promises);
        const allSamples = responses.flatMap(res => res.data || []);
        setSamplesTokenData(allSamples);
      } catch (err) {
        console.error("Error fetching samples token:", err);
      } finally {
        setLoadingSamples(false);
      }
    };

    fetchSamplesToken();
  }, [dateFilter.start, dateFilter.end]);

  // Calculate Total Samples from Token Data
  const totalSamplesToken = useMemo(() => {
    if (!dateFilter.start || !dateFilter.end) return 0;
    const start = new Date(dateFilter.start);
    const end = new Date(dateFilter.end);

    return samplesTokenData.reduce((sum, sample) => {
      const sampleYear = parseInt(sample.year || new Date(dateFilter.start).getFullYear());
      const sampleWeek = sample.weekNumber;
      const sampleY = sample.year;

      const startWeekNum = getAggregatedWeekNumber(start, start.getFullYear(), settings || {});
      const endWeekNum = getAggregatedWeekNumber(end, end.getFullYear(), settings || {});

      // Handle year crossing
      const startCode = start.getFullYear() * 100 + startWeekNum;
      const endCode = end.getFullYear() * 100 + endWeekNum;
      const sampleCode = sampleY * 100 + sampleWeek;

      if (sampleCode >= startCode && sampleCode <= endCode) {
        return sum + (parseFloat(sample.sampleSize) || 0);
      }
      return sum;
    }, 0);
  }, [samplesTokenData, dateFilter.start, dateFilter.end, settings]);

  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [governorateFilter, setGovernorateFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [subconFilter, setSubconFilter] = useState('all');
  const [supervisorFilter, setSupervisorFilter] = useState('all');
  const [teamNameFilter, setTeamNameFilter] = useState('all');
  const [validationFilter, setValidationFilter] = useState('all');
  const [filter, setFilter] = useState('all'); // Eval score filter
  const [analyticsView, setAnalyticsView] = useState('basic'); // 'basic' or 'deep'

  // Dialogs & Selection
  const [selectedTask, setSelectedTask] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [confirmSlid, setConfirmSlid] = useState('');
  const [openAddTask, setOpenAddTask] = useState(false);
  const [updateRefetchTasks, setUpdateRefetchTasks] = useState(0);

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
  const [gaiaStepsDialogOpen, setGaiaStepsDialogOpen] = useState(false);
  const [gaiaStepsTask, setGaiaStepsTask] = useState(null);

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

  // Column Filters State
  const [columnFilters, setColumnFilters] = useState({
    createdAt: '',
    slid: '',
    customerName: '',
    contactNumber: '',
    customerFeedback: '',
    operation: '',
    priority: '',
    status: '',
    location: '',
    team: '',
    rootCause: '',
    reason: '',
    subReason: '',
    responsible: '',
    evaluationScore: '',
    gaiaCheck: '',
    latestGaiaType: '',
    latestGaiaReason: '',
    itnRelated: '',
    relatedToSubscription: ''
  });

  const handleColumnFilterChange = (column, value) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
    setPage(0); // Reset to first page when filtering
  };

  // Unique Options for Autocomplete Filters
  const columnUniqueOptions = useMemo(() => {
    const options = {
      createdAt: new Set(),
      slid: new Set(),
      customerName: new Set(),
      contactNumber: new Set(),
      customerFeedback: new Set(),
      operation: new Set(),
      priority: new Set(),
      status: new Set(),
      location: new Set(),
      team: new Set(),
      rootCause: new Set(),
      reason: new Set(),
      subReason: new Set(),
      responsible: new Set(),
      evaluationScore: new Set(),
      gaiaCheck: new Set(),
      latestGaiaType: new Set(),
      latestGaiaReason: new Set(),
      itnRelated: new Set(),
      relatedToSubscription: new Set()
    };

    allTasks.forEach(task => {
      if (task.createdAt) options.createdAt.add(format(new Date(task.createdAt), 'dd/MM/yyyy'));
      if (task.slid) options.slid.add(task.slid);
      if (task.requestNumber) options.slid.add(String(task.requestNumber));

      const cName = task.customerName || task.customer?.customerName;
      if (cName) options.customerName.add(cName);

      const cNumber = task.contactNumber || task.customer?.contactNumber;
      if (cNumber) options.contactNumber.add(String(cNumber));

      const feedback = task.customerFeedback || task.customer?.customerFeedback;
      if (feedback) options.customerFeedback.add(feedback);

      if (task.operation) options.operation.add(task.operation);
      if (task.tarrifName) options.operation.add(task.tarrifName);

      options.priority.add(task.priority || "Normal");
      if (task.status) options.status.add(task.status);

      if (task.governorate) options.location.add(task.governorate);
      if (task.district) options.location.add(task.district);

      if (task.teamName) options.team.add(String(task.teamName));
      if (task.teamCompany) options.team.add(String(task.teamCompany));

      const addToSet = (set, val) => {
        if (!val) return;
        if (Array.isArray(val)) {
          val.forEach(v => {
            if (v && typeof v === 'string' && v.trim()) set.add(v.trim());
          });
        } else if (typeof val === 'string' && val.trim()) {
          set.add(val.trim());
        }
      };

      addToSet(options.reason, task.reason);
      addToSet(options.subReason, task.subReason);
      addToSet(options.rootCause, task.rootCause);
      addToSet(options.responsible, task.responsible);

      if (task.technicalDetails) {
        addToSet(options.rootCause, task.technicalDetails.rootCause);
        addToSet(options.subReason, task.technicalDetails.subReason);
      }

      if (task.evaluationScore !== null && task.evaluationScore !== undefined) options.evaluationScore.add(String(task.evaluationScore));

      options.gaiaCheck.add(task.gaiaCheck || "No");

      if (task.latestGaia?.transactionType) options.latestGaiaType.add(task.latestGaia.transactionType);
      if (task.latestGaia?.unfReasonCode) options.latestGaiaReason.add(task.latestGaia.unfReasonCode);

      addToSet(options.itnRelated, task.itnRelated);
      addToSet(options.relatedToSubscription, task.relatedToSubscription);
    });

    // Convert Sets to sorted Arrays
    const result = {};
    Object.keys(options).forEach(key => {
      result[key] = Array.from(options[key]).sort();
    });
    return result;
  }, [allTasks]);

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
    const handleGlobalRefresh = () => setUpdateRefetchTasks(prev => prev + 1);
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

      // 11. Column Filters
      if (columnFilters.createdAt && !format(new Date(task.createdAt), 'dd/MM/yyyy').includes(columnFilters.createdAt)) return false;
      if (columnFilters.slid && !(task.slid || "").toLowerCase().includes(columnFilters.slid.toLowerCase()) && !(task.requestNumber || "").toString().toLowerCase().includes(columnFilters.slid.toLowerCase())) return false;
      if (columnFilters.customerName && !(task.customerName || task.customer?.customerName || "").toLowerCase().includes(columnFilters.customerName.toLowerCase())) return false;
      if (columnFilters.contactNumber && !(task.contactNumber || task.customer?.contactNumber || "").toString().toLowerCase().includes(columnFilters.contactNumber.toLowerCase())) return false;
      if (columnFilters.customerFeedback && !(task.customerFeedback || task.customer?.customerFeedback || "").toLowerCase().includes(columnFilters.customerFeedback.toLowerCase())) return false;
      if (columnFilters.operation && !(task.operation || "").toLowerCase().includes(columnFilters.operation.toLowerCase()) && !(task.tarrifName || "").toLowerCase().includes(columnFilters.operation.toLowerCase())) return false;
      if (columnFilters.priority && !(task.priority || "Normal").toLowerCase().includes(columnFilters.priority.toLowerCase())) return false;
      if (columnFilters.status && !(task.status || "").toLowerCase().includes(columnFilters.status.toLowerCase())) return false;
      if (columnFilters.location && !(task.governorate || "").toLowerCase().includes(columnFilters.location.toLowerCase()) && !(task.district || "").toLowerCase().includes(columnFilters.location.toLowerCase())) return false;
      if (columnFilters.team && !(task.teamName || "").toLowerCase().includes(columnFilters.team.toLowerCase()) && !(task.teamCompany || "").toLowerCase().includes(columnFilters.team.toLowerCase())) return false;

      const checkArrayOrString = (val, filter) => {
        if (!val) return false;
        if (Array.isArray(val)) {
          return val.some(v => v && v.toString().toLowerCase().includes(filter.toLowerCase()));
        }
        return val.toString().toLowerCase().includes(filter.toLowerCase());
      };

      if (columnFilters.reason && !checkArrayOrString(task.reason, columnFilters.reason)) return false;
      if (columnFilters.subReason && !checkArrayOrString(task.subReason, columnFilters.subReason) && !checkArrayOrString(task.technicalDetails?.subReason, columnFilters.subReason)) return false;
      if (columnFilters.rootCause && !checkArrayOrString(task.rootCause, columnFilters.rootCause) && !checkArrayOrString(task.technicalDetails?.rootCause, columnFilters.rootCause)) return false;
      if (columnFilters.responsible && !checkArrayOrString(task.responsible, columnFilters.responsible)) return false;
      if (columnFilters.evaluationScore && !(task.evaluationScore || "").toString().toLowerCase().includes(columnFilters.evaluationScore.toLowerCase())) return false;
      if (columnFilters.gaiaCheck && !(task.gaiaCheck || "No").toLowerCase().includes(columnFilters.gaiaCheck.toLowerCase())) return false;
      if (columnFilters.latestGaiaType && !(task.latestGaia?.transactionType || "").toLowerCase().includes(columnFilters.latestGaiaType.toLowerCase())) return false;
      if (columnFilters.latestGaiaReason && !(task.latestGaia?.unfReasonCode || "").toLowerCase().includes(columnFilters.latestGaiaReason.toLowerCase())) return false;

      if (columnFilters.itnRelated && !checkArrayOrString(task.itnRelated, columnFilters.itnRelated)) return false;
      if (columnFilters.relatedToSubscription && !checkArrayOrString(task.relatedToSubscription, columnFilters.relatedToSubscription)) return false;

      return true;
    });
  }, [allTasks, priorityFilter, statusFilter, governorateFilter, districtFilter, subconFilter, supervisorFilter, teamNameFilter, validationFilter, filter, dateFilter, advSearchFields, activeAdvSearch, columnFilters]);

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
  };  // Chart Data Processing
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

  // --- ADVANCED KPI CALCULATIONS ---
  const dashboardStats = useMemo(() => {
    const total = filteredTasks.length;
    if (total === 0) return {
      total: 0,
      complianceRate: 0,
      promoterRate: 0,
      neutralRate: 0,
      detractorRate: 0,
      avgScore: 0
    };

    const validatedCount = filteredTasks.filter(t => t.validationStatus === 'Validated').length;
    const promoterCount = filteredTasks.filter(t => t.evaluationScore >= 9).length;
    const neutralCount = filteredTasks.filter(t => t.evaluationScore >= 7 && t.evaluationScore <= 8).length;
    const detractorCount = filteredTasks.filter(t => t.evaluationScore !== null && t.evaluationScore <= 6).length;
    const scores = filteredTasks.filter(t => t.evaluationScore !== null).map(t => t.evaluationScore);
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;

    return {
      total,
      complianceRate: ((validatedCount / total) * 100).toFixed(1),
      promoterRate: ((promoterCount / total) * 100).toFixed(1),
      neutralRate: ((neutralCount / total) * 100).toFixed(1),
      detractorRate: ((detractorCount / total) * 100).toFixed(1),
      avgScore
    };
  }, [filteredTasks]);

  const StatCard = ({ title, value, icon, color, subtitle, extra }) => (
    <Card sx={{
      background: 'rgba(45, 45, 45, 0.6)',
      backdropFilter: 'blur(10px)',
      border: `1px solid ${alpha(color, 0.3)}`,
      borderRadius: '24px',
      color: '#fff',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      '&:hover': {
        transform: 'translateY(-8px)',
        boxShadow: `0 15px 30px ${alpha(color, 0.3)}`,
        borderColor: color,
        '& .stat-icon': {
          transform: 'scale(1.1) rotate(5deg)',
          boxShadow: `0 0 20px ${alpha(color, 0.4)}`,
        }
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        right: 0,
        width: '100px',
        height: '100px',
        background: `radial-gradient(circle at top right, ${alpha(color, 0.1)}, transparent 70%)`,
        zIndex: 0
      }
    }}>
      <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box className="stat-icon" sx={{
            p: 1.5,
            borderRadius: '16px',
            background: alpha(color, 0.15),
            color: color,
            display: 'flex',
            transition: 'all 0.3s ease',
            border: `1px solid ${alpha(color, 0.2)}`
          }}>
            {icon}
          </Box>
          {subtitle && (
            <Typography variant="overline" sx={{ color: alpha('#fff', 0.5), fontWeight: 900, fontSize: '0.65rem', letterSpacing: 1.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Typography variant="h3" sx={{ fontWeight: 900, mb: 0.5, letterSpacing: '-1.5px', color: '#fff' }}>
          {value}
        </Typography>
        <Typography variant="subtitle2" sx={{ color: alpha('#fff', 0.6), fontWeight: 700, mb: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </Typography>
        {extra && (
          <Box sx={{ mt: 'auto', pt: 2, borderTop: `1px solid ${alpha('#fff', 0.05)}` }}>
            {extra}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  // Weekly Trend Data Processing
  const trendData = useMemo(() => {
    if (!filteredTasks.length) return { data: [], topReasons: [], topOwners: [] };

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

    // 4. Owner & Team Performance Sheet
    const ownerStats = {};
    filteredTasks.forEach(t => {
      const responsibles = Array.isArray(t.responsible) && t.responsible.length > 0 ? t.responsible : ['Unspecified'];
      const fieldTeam = t.teamName || 'Unknown Team';

      responsibles.forEach(resp => {
        const key = `${resp} | ${fieldTeam}`;
        if (!ownerStats[key]) {
          ownerStats[key] = {
            'Responsible (Owner)': resp,
            'Field Team': fieldTeam,
            'Total Tasks': 0,
            'Validated': 0,
            'Pending/Failed': 0,
            'Detractors': 0
          };
        }
        ownerStats[key]['Total Tasks']++;
        if (t.validationStatus === 'Validated') ownerStats[key]['Validated']++;
        if (t.validationStatus === 'Not validated' || t.validationStatus === 'Pending') ownerStats[key]['Pending/Failed']++;
        if (t.evaluationScore !== null && t.evaluationScore <= 6) ownerStats[key]['Detractors']++;
      });
    });

    const ownerData = Object.values(ownerStats)
      .sort((a, b) => b['Total Tasks'] - a['Total Tasks'])
      .map(o => ({
        ...o,
        'Compliance %': o['Total Tasks'] > 0 ? `${((o['Validated'] / o['Total Tasks']) * 100).toFixed(1)}%` : "0%",
        'Detractor %': o['Total Tasks'] > 0 ? `${((o['Detractors'] / o['Total Tasks']) * 100).toFixed(1)}%` : "0%"
      }));

    const wsOwners = utils.json_to_sheet(ownerData, { origin: "A2" });
    utils.sheet_add_aoa(wsOwners, [[`Owner & Team Performance Analysis - Period: ${periodStr}`]], { origin: "A1" });
    utils.book_append_sheet(workbook, wsOwners, 'Owner Performance');

    // 5. Trend Analysis Sheet (Weekly Breakdown)
    if (trendData.data?.length > 0) {
      const wsTrends = utils.json_to_sheet(trendData.data, { origin: "A2" });
      utils.sheet_add_aoa(wsTrends, [[`Weekly Volume Trend - Reported Period: ${periodStr}`]], { origin: "A1" });
      utils.book_append_sheet(workbook, wsTrends, 'Historical Trends');
    }

    // 6. Deep Raw Data Sheet
    const maxTickets = filteredTasks.reduce((max, t) => Math.max(max, (t.tickets || []).length), 0);

    const rawData = filteredTasks.map(task => {
      const baseData = {
        // --- TASK CORE ---
        'SLID': task.slid || 'N/A',
        'Request Number': task.requestNumber || 'N/A',
        'Status': task.status || 'N/A',
        'Priority': task.priority || 'Normal',
        'Operation': task.operation || 'N/A',
        'Tariff Name': task.tarrifName || 'N/A',
        'Speed (Mbps)': task.speed || 'N/A',
        'Validation Status': task.validationStatus || 'Pending',
        'Evaluation Score': task.evaluationScore !== null ? task.evaluationScore : 'N/A',

        // --- CUSTOMER DETAILS ---
        'Customer Name': task.customerName || 'N/A',
        'Customer Type': task.customerType || 'N/A',
        'Contact Number': task.contactNumber || 'N/A',
        'Governorate': task.governorate || 'N/A',
        'District': task.district || 'N/A',
        'Customer Feedback': task.customerFeedback || 'N/A',

        // --- TECHNICAL DETAILS ---
        'ONT Type': task.ontType || 'N/A',
        'Free Extender': task.freeExtender || 'N/A',
        'Extender Type': task.extenderType || 'N/A',
        'Extender Count': task.extenderNumber || 0,
        'GAIA Check': task.gaiaCheck || 'N/A',
        'GAIA Content': task.gaiaContent || 'N/A',

        // --- AUDIT METADATA ---
        'Reasons': Array.isArray(task.reason) ? task.reason.join(', ') : (task.reason || 'N/A'),
        'Sub-Reasons': Array.isArray(task.subReason) ? task.subReason.join(', ') : (task.subReason || 'N/A'),
        'Root Causes': Array.isArray(task.rootCause) ? task.rootCause.join(', ') : (task.rootCause || 'N/A'),
        'Responsible Party': Array.isArray(task.responsible) ? task.responsible.join(', ') : (task.responsible || 'N/A'),
        'ITN Related': Array.isArray(task.itnRelated) ? task.itnRelated.join(', ') : (task.itnRelated || 'N/A'),
        'Related to Subscription': Array.isArray(task.relatedToSubscription) ? task.relatedToSubscription.join(', ') : (task.relatedToSubscription || 'N/A'),

        // --- TEAM & ASSIGNMENT ---
        'Field Team Name': task.teamName || 'N/A',
        'Team Company': task.teamCompany || 'N/A',
        'Assigned To': task.assignedTo?.map(u => u.name).join(', ') || 'Unassigned',
        'Created By': task.createdBy?.name || 'System',

        // --- LATEST GAIA STATUS (Latest Ticket) ---
        'Latest GAIA Type': task.latestGaia?.transactionType || 'N/A',
        'Latest GAIA State': task.latestGaia?.transactionState || 'N/A',
        'Latest GAIA Reason Code': task.latestGaia?.unfReasonCode || 'N/A',
        'Latest Action Taken': task.latestGaia?.actionTaken || 'N/A',
      };

      // --- ALL AGENT NOTES ---
      const sortedTickets = [...(task.tickets || [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      for (let i = 0; i < maxTickets; i++) {
        baseData[`Agent Note ${i + 1}`] = sortedTickets[i]?.note || '';
      }

      const timelineData = {
        // --- TIMELINE ---
        'Created At': task.createdAt ? format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm') : '-',
        'Contract Date': task.contractDate ? format(new Date(task.contractDate), 'yyyy-MM-dd') : 'N/A',
        'In Date': task.inDate ? format(new Date(task.inDate), 'yyyy-MM-dd') : 'N/A',
        'App Date': task.appDate ? format(new Date(task.appDate), 'yyyy-MM-dd') : 'N/A',
        'Close Date': task.closeDate ? format(new Date(task.closeDate), 'yyyy-MM-dd') : 'N/A',
        'PIS Date': task.pisDate ? format(new Date(task.pisDate), 'yyyy-MM-dd') : 'N/A',
        'Interview Date': task.interviewDate ? format(new Date(task.interviewDate), 'yyyy-MM-dd') : 'N/A',
      };

      return { ...baseData, ...timelineData };
    });

    const wsRaw = utils.json_to_sheet(rawData, { origin: "A2" });
    utils.sheet_add_aoa(wsRaw, [[`DEEP RAW AUDIT DATA - ${periodStr}`]], { origin: "A1" });
    utils.book_append_sheet(workbook, wsRaw, 'Deep Raw Data');

    // 7. Full Ticket History Sheet
    const ticketHistoryData = [];
    filteredTasks.forEach(task => {
      const tickets = task.tickets || [];
      tickets.forEach(ticket => {
        ticketHistoryData.push({
          'Request Number': task.requestNumber,
          'SLID': task.slid,
          'Ticket ID': ticket.ticketId || 'N/A',
          'Date': ticket.timestamp ? format(new Date(ticket.timestamp), 'yyyy-MM-dd HH:mm') : '-',
          'Category': ticket.mainCategory || 'N/A',
          'Transaction Type': ticket.transactionType || 'N/A',
          'Transaction State': ticket.transactionState || 'N/A',
          'Reason Code': ticket.unfReasonCode || 'N/A',
          'Status': ticket.status || 'N/A',
          'Action Taken': ticket.actionTaken || 'N/A',
          'Agent Note': ticket.note || 'N/A',
          'Recorded By User ID': ticket.recordedBy || 'N/A'
        });
      });
    });

    if (ticketHistoryData.length > 0) {
      const wsHistory = utils.json_to_sheet(ticketHistoryData, { origin: "A2" });
      utils.sheet_add_aoa(wsHistory, [[`COMPLETE TRANSACTION LOG HISTORY - ${periodStr}`]], { origin: "A1" });
      utils.book_append_sheet(workbook, wsHistory, 'Ticket History');
    }

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

  // --- Statistics Dashboard Logic ---

  // Calculate Stats dynamically based on filteredTasks
  const totalSamples = totalSamplesToken > 0 ? totalSamplesToken : filteredTasks.length;
  const actualAudits = filteredTasks.length;

  const promoters = filteredTasks.filter(t => (t.evaluationScore || 0) >= 9).length;
  const detractors = filteredTasks.filter(t => (t.evaluationScore || 0) >= 0 && (t.evaluationScore || 0) <= 6 && t.evaluationScore !== null).length;
  const neutrals = filteredTasks.filter(t => (t.evaluationScore || 0) >= 7 && (t.evaluationScore || 0) <= 8).length;

  const promoterRate = totalSamples > 0 ? Math.round(((promoters + (totalSamples - actualAudits)) / totalSamples) * 100) : 0;
  const detractorRate = totalSamples > 0 ? Math.round((detractors / totalSamples) * 100) : 0;
  const neutralRate = totalSamples > 0 ? Math.round((neutrals / totalSamples) * 100) : 0;
  const nps = promoterRate - detractorRate;

  // Helper to get top K items
  const getTopK = (field, k = 5) => {
    const counts = {};
    filteredTasks.forEach(t => {
      const values = Array.isArray(t[field]) ? t[field] : [t[field]];
      values.forEach(v => {
        if (v) counts[v] = (counts[v] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / actualAudits) * 100)
      }));
  };

  const topReasons = getTopK('reason');
  const topSubReasons = getTopK('subReason');
  const topRootCauses = getTopK('rootCause');
  const topOwners = getTopK('responsible');
  const topITN = getTopK('itnRelated');
  const topSubRel = getTopK('relatedToSubscription');

  const StatBar = ({ label, value, color, icon, subLabel }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2, bgcolor: alpha(color, 0.1), borderRadius: 2, minWidth: 100, flex: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: color }}>
        {icon}
        <Typography variant="body2" fontWeight="bold">{label}</Typography>
      </Box>
      <Typography variant="h4" fontWeight="900" sx={{ color: '#fff' }}>
        {value}
      </Typography>
      {subLabel && <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), mt: 0.5 }}>{subLabel}</Typography>}
    </Box>
  );

  const MiniTable = ({ title, data, color, category }) => (
    <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, p: 2, height: '100%' }}>
      <Typography variant="subtitle2" sx={{ color: color, fontWeight: 'bold', mb: 2, borderBottom: `1px solid ${alpha(color, 0.2)}`, pb: 1 }}>
        {title}
      </Typography>
      <Stack spacing={1.5}>
        {data.map((item, idx) => (
          <Box
            key={idx}
            onClick={() => handleDrillDownRowClick({ [category]: item.name }, `${category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1')}: ${item.name}`)}
            sx={{
              cursor: 'pointer',
              p: 0.5,
              borderRadius: 1,
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: alpha(color, 0.1),
                transform: 'translateX(4px)'
              }
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: '#fff', fontWeight: 500 }}>{item.name}</Typography>
              <Typography variant="caption" sx={{ color: color }}>{item.count} ({item.percentage}%)</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={item.percentage}
              sx={{
                height: 4,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.1)',
                '& .MuiLinearProgress-bar': { bgcolor: color }
              }}
            />
          </Box>
        ))}
        {data.length === 0 && <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>No data</Typography>}
      </Stack>
    </Box>
  );

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

        {/* Consolidated Premium KPI Cards */}
        {/* Comprehensive Statistics Dashboard */}
        <Box sx={{ mb: 4 }}>








          {/* Summary Stats Row */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <StatBar
              label="Total Samples"
              value={loadingSamples ? "..." : totalSamplesToken}
              color="#7b68ee"
              icon={<MdHistory />}
              subLabel={`Actual Audits: ${actualAudits}`}
            />
            <StatBar label="NPS Score" value={nps} color={nps >= 50 ? "#4caf50" : nps >= 0 ? "#ff9800" : "#f44336"} icon={<MdInsights />} />
            <StatBar label="Promoters" value={`${promoterRate}%`} color="#4caf50" icon={<MdStar />} />
            <StatBar label="Detractors" value={`${detractorRate}%`} color="#f44336" icon={<MdError />} />
            <StatBar label="Neutrals" value={`${neutralRate}%`} color="#ff9800" icon={<MdRadioButtonUnchecked />} />
          </Stack>

          {/* Expandable Detailed Stats */}
          <Accordion sx={{ bgcolor: 'rgba(255,255,255,0.02)', color: '#fff', '&:before': { display: 'none' }, boxShadow: 'none' }}>
            <AccordionSummary expandIcon={<MdExpandMore style={{ color: '#fff' }} />} sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MdBarChart style={{ color: '#7b68ee' }} />
                <Typography fontWeight="bold">Detailed Breakdown (Top 5 Results)</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <MiniTable title="Top Reasons" data={topReasons} color="#2196f3" category="reason" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <MiniTable title="Top Sub-Reasons" data={topSubReasons} color="#9c27b0" category="subReason" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <MiniTable title="Top Root Causes" data={topRootCauses} color="#e91e63" category="rootCause" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <MiniTable title="Top Owners" data={topOwners} color="#00bcd4" category="responsible" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <MiniTable title="ITN Related" data={topITN} color="#ff5722" category="itnRelated" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <MiniTable title="Subscription Related" data={topSubRel} color="#8bc34a" category="relatedToSubscription" />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Box>


        {/* View Selection Toggle */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <ButtonGroup variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden', mb: 2 }}>
            <Button
              onClick={() => setAnalyticsView('basic')}
              variant={analyticsView === 'basic' ? 'contained' : 'outlined'}
              sx={{ px: 4, py: 1, textTransform: 'none', fontWeight: 600 }}
              startIcon={<MdInsights />}
            >
              Basic Overview
            </Button>
            <Button
              onClick={() => setAnalyticsView('deep')}
              variant={analyticsView === 'deep' ? 'contained' : 'outlined'}
              sx={{ px: 4, py: 1, textTransform: 'none', fontWeight: 600 }}
              startIcon={<MdVisibility />}
            >
              Deep Dive Analysis
            </Button>
          </ButtonGroup>

          <Typography variant="caption" sx={{ color: alpha('#fff', 0.4), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            Reporting Period: <span style={{ color: '#7b68ee' }}>{
              dateFilter.label || (dateFilter.type === 'all' ? 'All Time' : `${format(dateFilter.start, 'dd MMM')} - ${format(dateFilter.end, 'dd MMM')}`)
            }</span>
          </Typography>
        </Box>

        {/* Basic Analytics Dashboard */}
        {analyticsView === 'basic' && (
          <>
            <Box sx={{ mt: 3 }}>
              <Grid container spacing={3}>
                {/* Reason Chart */}
                <Grid item xs={12} md={4}>
                  <Paper sx={{
                    p: 2.5,
                    borderRadius: '20px',
                    background: 'rgba(45, 45, 45, 0.4)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid #3d3d3d',
                    height: 400,
                    color: '#fff'
                  }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, color: '#7b68ee' }}>Top Reasons Analysis</Typography>
                    <ResponsiveContainer width="100%" height="85%">
                      <AreaChart data={analyticsData.reason} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorReason" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7b68ee" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#7b68ee" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3d3d3d" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#b3b3b3' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#b3b3b3' }} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #3d3d3d', borderRadius: '12px', color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#7b68ee" strokeWidth={3} fillOpacity={1} fill="url(#colorReason)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
                {/* Sub-Reason Chart */}
                <Grid item xs={12} md={4}>
                  <Paper sx={{
                    p: 2.5,
                    borderRadius: '20px',
                    background: 'rgba(45, 45, 45, 0.4)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid #3d3d3d',
                    height: 400,
                    color: '#fff'
                  }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, color: '#10b981' }}>Sub-Reason Breakdown</Typography>
                    <ResponsiveContainer width="100%" height="85%">
                      <AreaChart data={analyticsData.subReason} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3d3d3d" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#b3b3b3' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#b3b3b3' }} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #3d3d3d', borderRadius: '12px', color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSub)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
                {/* Root Cause Chart */}
                <Grid item xs={12} md={4}>
                  <Paper sx={{
                    p: 2.5,
                    borderRadius: '20px',
                    background: 'rgba(45, 45, 45, 0.4)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid #3d3d3d',
                    height: 400,
                    color: '#fff'
                  }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, color: '#f59e0b' }}>Root Cause Identification</Typography>
                    <ResponsiveContainer width="100%" height="85%">
                      <AreaChart data={analyticsData.rootCause} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRoot" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3d3d3d" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#b3b3b3' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#b3b3b3' }} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #3d3d3d', borderRadius: '12px', color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorRoot)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* Weekly Trend Analytics (NEW) */}
            {trendData.data?.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, color: '#7b68ee', letterSpacing: '-0.5px' }}>
                  <MdTimeline /> Weekly Performance Insights
                </Typography>
                <Grid container spacing={3}>
                  {/* Reason Trends */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{
                      p: 3,
                      borderRadius: '20px',
                      background: 'rgba(45, 45, 45, 0.4)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid #3d3d3d',
                      height: 450,
                      color: '#fff'
                    }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3 }}>Categorized Trend Analysis</Typography>
                      <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={trendData.data}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3d3d3d" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#b3b3b3' }} axisLine={{ stroke: '#3d3d3d' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#b3b3b3' }} axisLine={{ stroke: '#3d3d3d' }} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #3d3d3d', borderRadius: '12px', color: '#fff' }}
                          />
                          <Legend
                            iconType="circle"
                            wrapperStyle={{ fontSize: '11px', paddingTop: '20px', cursor: 'pointer' }}
                            onClick={handleLegendClick}
                            formatter={(value) => {
                              const item = trendData.topReasons.find(r => r.name === value);
                              const isHidden = hiddenSeries.has(value);
                              return (
                                <span style={{ color: isHidden ? '#666' : '#fff', textDecoration: isHidden ? 'line-through' : 'none' }}>
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
                              stroke={['#7b68ee', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'][index % 5]}
                              strokeWidth={3}
                              dot={{ r: 4, fill: '#2d2d2d', strokeWidth: 2 }}
                              activeDot={{ r: 6, strokeWidth: 0 }}
                              hide={hiddenSeries.has(item.name)}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>

                  {/* Owner Trends */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{
                      p: 3,
                      borderRadius: '20px',
                      background: 'rgba(45, 45, 45, 0.4)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid #3d3d3d',
                      height: 450,
                      color: '#fff'
                    }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3 }}>Team Operational Load</Typography>
                      <ResponsiveContainer width="100%" height="85%">
                        <AreaChart data={trendData.data}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3d3d3d" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#b3b3b3' }} axisLine={{ stroke: '#3d3d3d' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#b3b3b3' }} axisLine={{ stroke: '#3d3d3d' }} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #3d3d3d', borderRadius: '12px', color: '#fff' }}
                          />
                          <Legend
                            iconType="circle"
                            wrapperStyle={{ fontSize: '11px', paddingTop: '20px', cursor: 'pointer' }}
                            onClick={handleLegendClick}
                            formatter={(value) => {
                              const item = trendData.topOwners.find(o => o.name === value);
                              const isHidden = hiddenSeries.has(value);
                              return (
                                <span style={{ color: isHidden ? '#666' : '#fff', textDecoration: isHidden ? 'line-through' : 'none' }}>
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
                              stroke={['#7b68ee', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'][index % 5]}
                              fill={['#7b68ee', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'][index % 5]}
                              fillOpacity={0.4}
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
          </>
        )}

        {/* Deep Dive Analytics Component */}
        {analyticsView === 'deep' && (
          <AllTasksDeepDiveAnalytics
            tasks={filteredTasks}
            periodLabel={dateFilter.label || (dateFilter.type === 'all' ? 'All Time' : `${format(dateFilter.start, 'dd MMM')} - ${format(dateFilter.end, 'dd MMM')}`)}
            onDrillDown={handleDrillDownRowClick}
          />
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
        alignItems: 'center',
        overflowX: 'auto',
        overflowY: 'hidden',
        '&::-webkit-scrollbar': { height: '4px' },
        '&::-webkit-scrollbar-track': { background: '#1e1e1e' },
        '&::-webkit-scrollbar-thumb': { background: '#555', borderRadius: '4px' }
      }}>
        {/* Date Filters Merged */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#7b68ee', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <MdDateRange /> Date:
          </Typography>
          <Box sx={{
            display: 'flex',
            gap: 0.5,
            flexShrink: 0,
            '& .MuiButton-root': {
              whiteSpace: 'nowrap',
              minWidth: 'auto',
              px: 1,
              py: 0.5,
              borderRadius: '12px',
              textTransform: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: '#1e1e1e',
              borderColor: '#3d3d3d',
              color: '#b3b3b3',
              '&:hover': { borderColor: '#7b68ee', backgroundColor: 'rgba(123, 104, 238, 0.08)' },
              '&.MuiButton-contained': {
                backgroundColor: '#7b68ee',
                color: '#fff',
                '&:hover': { backgroundColor: '#6854d9' }
              }
            }
          }}>
            <Button onClick={() => setDateFilter({ ...getCustomWeekRange(new Date(), settings), type: 'thisWeek' })} variant={dateFilter.type === 'thisWeek' ? 'contained' : 'outlined'} size="small">This Week</Button>
            <Button onClick={() => setDateFilter({ ...getCustomWeekRange(subWeeks(new Date(), 1), settings), type: 'lastWeek' })} variant={dateFilter.type === 'lastWeek' ? 'contained' : 'outlined'} size="small">Last Week</Button>
            <Button onClick={() => setDateFilter({ start: getCustomWeekRange(subWeeks(new Date(), 2), settings).start, end: getCustomWeekRange(new Date(), settings).end, type: 'latest3Weeks' })} variant={dateFilter.type === 'latest3Weeks' ? 'contained' : 'outlined'} size="small">Latest 3W</Button>
            <Button onClick={() => setDateFilter({ start: startOfMonth(new Date()), end: endOfMonth(new Date()), type: 'thisMonth' })} variant={dateFilter.type === 'thisMonth' ? 'contained' : 'outlined'} size="small">This Month</Button>
            <Button onClick={() => setDateFilter({ start: null, end: null, type: 'all' })} variant={dateFilter.type === 'all' ? 'contained' : 'outlined'} size="small">All Time</Button>
          </Box>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
              <DatePicker
                label="Start"
                value={tempStartDate}
                onChange={(v) => setTempStartDate(v)}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: {
                      width: 110,
                      '& .MuiInputBase-root': {
                        fontSize: '0.75rem',
                        backgroundColor: '#1e1e1e',
                        borderRadius: '12px',
                        color: '#fff'
                      },
                      '& .MuiInputLabel-root': { fontSize: '0.75rem', color: '#b3b3b3' },
                      '& .MuiOutlinedInput-notchedOutline': { border: '1px solid #3d3d3d' }
                    }
                  }
                }}
              />
              <DatePicker
                label="End"
                value={tempEndDate}
                onChange={(v) => setTempEndDate(v)}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: {
                      width: 110,
                      '& .MuiInputBase-root': {
                        fontSize: '0.75rem',
                        backgroundColor: '#1e1e1e',
                        borderRadius: '12px',
                        color: '#fff'
                      },
                      '& .MuiInputLabel-root': { fontSize: '0.75rem', color: '#b3b3b3' },
                      '& .MuiOutlinedInput-notchedOutline': { border: '1px solid #3d3d3d' }
                    }
                  }
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  setDateFilter({ start: tempStartDate, end: tempEndDate, type: 'custom' });
                }}
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  flexShrink: 0,
                  fontSize: '0.75rem',
                  backgroundColor: '#7b68ee',
                  '&:hover': { backgroundColor: '#6854d9' }
                }}
              >
                Apply
              </Button>
            </Box>
          </LocalizationProvider>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: '#3d3d3d' }} />
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
              <TableCell style={{ fontSize: '0.875rem', minWidth: 150 }}>Customer Name</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 120 }}>Contact Number</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 200 }}>Feedback</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 150 }}>Operation / Tariff</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 100 }}>Priority</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 100 }}>Status</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 150 }}>Location</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 150 }}>Team / Subcon</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 150 }}>Reason</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 150 }}>Sub Reason</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 150 }}>Root Cause</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 150 }}>Owner</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 100 }}>ITN Related</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 120 }}>Related to Subscription</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 80 }}>Score</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 80 }}>Week</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 100 }}>GAIA Check</TableCell>
              <TableCell style={{ fontSize: '0.875rem', minWidth: 150 }}>GAIA Content</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 120 }}>Q-Ops Status</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 120 }}>Q-Ops Reason</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 120 }}>Q-OPS Steps</TableCell>
              <TableCell style={{ fontSize: '0.875rem', width: 120 }}>Actions</TableCell>
            </TableRow>
            <TableRow sx={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
              {[
                { key: 'createdAt', placeholder: 'Date' },
                { key: 'slid', placeholder: 'SLID/REQ' },
                { key: 'customerName', placeholder: 'Name' },
                { key: 'contactNumber', placeholder: 'Contact' },
                { key: 'customerFeedback', placeholder: 'Feedback' },
                { key: 'operation', placeholder: 'Op/Tariff' },
                { key: 'priority', placeholder: 'Priority' },
                { key: 'status', placeholder: 'Status' },
                { key: 'location', placeholder: 'Location' },
                { key: 'team', placeholder: 'Team/Sub' },
                { key: 'reason', placeholder: 'Reason' },
                { key: 'subReason', placeholder: 'Sub Reason' },
                { key: 'rootCause', placeholder: 'Root Cause' },
                { key: 'responsible', placeholder: 'Owner' },
                { key: 'itnRelated', placeholder: 'ITN Related' },
                { key: 'relatedToSubscription', placeholder: 'Related to Subscription' },
                { key: 'evaluationScore', placeholder: 'Score' }
              ].map((col) => (
                <TableCell key={col.key} sx={{ p: '4px !important', minWidth: 100 }}>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={columnUniqueOptions[col.key] || []}
                    value={columnFilters[col.key]}
                    onInputChange={(event, newValue) => handleColumnFilterChange(col.key, newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={col.placeholder}
                        sx={{
                          '& .MuiInputBase-root': {
                            fontSize: '0.7rem',
                            color: '#fff',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderRadius: '4px'
                          },
                          '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                        }}
                      />
                    )}
                  />
                </TableCell>
              ))}
              <TableCell sx={{ p: '4px !important' }} /> {/* Week column */}
              {[
                { key: 'gaiaCheck', placeholder: 'GAIA' }
              ].map((col) => (
                <TableCell key={col.key} sx={{ p: '4px !important', minWidth: 100 }}>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={columnUniqueOptions[col.key] || []}
                    value={columnFilters[col.key]}
                    onInputChange={(event, newValue) => handleColumnFilterChange(col.key, newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={col.placeholder}
                        sx={{
                          '& .MuiInputBase-root': {
                            fontSize: '0.7rem',
                            color: '#fff',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderRadius: '4px'
                          },
                          '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                        }}
                      />
                    )}
                  />
                </TableCell>
              ))}
              <TableCell sx={{ p: '4px !important' }} /> {/* GAIA Content column */}
              {[
                { key: 'latestGaiaType', placeholder: 'Type' },
                { key: 'latestGaiaReason', placeholder: 'Reason' }
              ].map((col) => (
                <TableCell key={col.key} sx={{ p: '4px !important', minWidth: 100 }}>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={columnUniqueOptions[col.key] || []}
                    value={columnFilters[col.key]}
                    onInputChange={(event, newValue) => handleColumnFilterChange(col.key, newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={col.placeholder}
                        sx={{
                          '& .MuiInputBase-root': {
                            fontSize: '0.7rem',
                            color: '#fff',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderRadius: '4px'
                          },
                          '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                        }}
                      />
                    )}
                  />
                </TableCell>
              ))}
              <TableCell sx={{ p: '4px !important' }} /> {/* GAIA Content column */}
              <TableCell sx={{ p: '4px !important' }} /> {/* Steps */}
              <TableCell sx={{ p: '4px !important' }} /> {/* Actions */}
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
                          <Typography variant="caption" color="primary" sx={{ fontSize: '0.7rem' }}>
                            {task.customerType || "-"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                          {task.contactNumber || task.customer?.contactNumber || '-'}
                        </Typography>
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
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {Array.isArray(task.reason) ? task.reason.join(", ") : (task.reason || "-")}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ display: 'block', opacity: 0.7, fontSize: '0.7rem' }}>
                          {Array.isArray(task.subReason) ? task.subReason.join(", ") : (task.subReason || task.technicalDetails?.subReason || "-")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#f44336', fontSize: '0.8rem' }}>
                          {Array.isArray(task.rootCause) ? task.rootCause.join(", ") : (task.rootCause || task.technicalDetails?.rootCause || "-")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', fontSize: '0.7rem', color: '#7b68ee' }}>
                          {Array.isArray(task.responsible) ? task.responsible.join(", ") : (task.responsible || "-")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={Array.isArray(task.itnRelated) ? task.itnRelated.join(", ") : (task.itnRelated || "-")}
                          size="small"
                          sx={{
                            fontWeight: 'bold',
                            fontSize: '0.7rem',
                            bgcolor: (Array.isArray(task.itnRelated) && task.itnRelated.includes('Yes')) || task.itnRelated === 'Yes' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: (Array.isArray(task.itnRelated) && task.itnRelated.includes('Yes')) || task.itnRelated === 'Yes' ? '#4caf50' : '#fff',
                            border: '1px solid',
                            borderColor: 'divider'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ display: 'block', fontSize: '0.75rem' }}>
                          {Array.isArray(task.relatedToSubscription) ? task.relatedToSubscription.join(", ") : (task.relatedToSubscription || "-")}
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
                        <Chip
                          label={task.gaiaCheck || "No"}
                          size="small"
                          sx={{
                            fontWeight: 'bold',
                            fontSize: '0.7rem',
                            bgcolor: task.gaiaCheck === 'Yes' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)',
                            color: task.gaiaCheck === 'Yes' ? '#4caf50' : '#f44336',
                            border: '1px solid',
                            borderColor: 'divider'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ direction: 'ltr', textAlign: 'left', minWidth: 200 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: '0.8rem',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              whiteSpace: 'pre-wrap',
                              lineHeight: '1.2em',
                              maxHeight: '3.6em',
                              direction: 'ltr',
                            }}
                          >
                            {task.gaiaContent || "-"}
                          </Typography>
                          {task.gaiaContent && (task.gaiaContent.length > 60 || task.gaiaContent.split('\n').length > 3) && (
                            <Button
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDialogTitle("GAIA Content");
                                setDialogContent(task.gaiaContent);
                                setDialogOpen(true);
                              }}
                              sx={{
                                minWidth: 'auto',
                                p: 0,
                                mt: 0.5,
                                textTransform: 'none',
                                color: '#7b68ee',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                '&:hover': { background: 'transparent', textDecoration: 'underline' }
                              }}
                            >
                              Read More
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Tooltip title={dropdownOptions['TRANSACTION_TYPE']?.find(opt => opt.value === task.latestGaia?.transactionType)?.label || task.latestGaia?.transactionType || "N/A"}>
                            <Typography variant="body2" sx={{ fontWeight: 900, color: 'primary.main', fontSize: '0.85rem' }}>
                              {task.latestGaia?.transactionType || "-"}
                            </Typography>
                          </Tooltip>
                          <Tooltip title={dropdownOptions['TRANSACTION_STATE']?.find(opt => opt.value === task.latestGaia?.transactionState)?.label || task.latestGaia?.transactionState || "N/A"}>
                            <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', mt: -0.5, fontSize: '0.7rem' }}>
                              {task.latestGaia?.transactionState || "-"}
                            </Typography>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={dropdownOptions['UNF_REASON_CODE']?.find(opt => opt.value === task.latestGaia?.unfReasonCode)?.label || task.latestGaia?.unfReasonCode || "N/A"}>
                          <Typography variant="caption" sx={{ color: '#FF5722', fontWeight: 900, fontSize: '0.8rem' }}>
                            {task.latestGaia?.unfReasonCode || "—"}
                          </Typography>
                        </Tooltip>
                        <Typography variant="caption" sx={{ display: 'block', fontSize: '0.65rem', opacity: 0.6 }}>
                          {task.latestGaia?.agentName || ""}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            setGaiaStepsTask(task);
                            setGaiaStepsDialogOpen(true);
                          }}
                          sx={{
                            fontSize: '0.7rem',
                            textTransform: 'none',
                            borderColor: '#7b68ee',
                            color: '#7b68ee',
                            '&:hover': {
                              borderColor: '#6854d9',
                              backgroundColor: 'rgba(123, 104, 238, 0.08)'
                            }
                          }}
                        >
                          View Log
                        </Button>
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

      {/* Categorical Drill-down Dialog */}
      <Dialog
        open={drillDownState.open}
        onClose={() => setDrillDownState(prev => ({ ...prev, open: false }))}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            backgroundColor: '#1a1a1a',
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.1)',
            minHeight: '60vh'
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 900, mb: 0.5 }}>
              Task List
            </Typography>
            <Typography variant="caption" sx={{ color: '#7b68ee', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              {drillDownState.title} ({drillDownState.tasks.length} Tasks)
            </Typography>
          </Box>
          <IconButton onClick={() => setDrillDownState(prev => ({ ...prev, open: false }))} sx={{ color: '#fff' }}>
            <MdClose />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                  <TableCell sx={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Date</TableCell>
                  <TableCell sx={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>SLID</TableCell>
                  <TableCell sx={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Customer</TableCell>
                  <TableCell sx={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Reason</TableCell>
                  <TableCell sx={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Owner</TableCell>
                  <TableCell sx={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Score</TableCell>
                  <TableCell sx={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }} align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {drillDownState.tasks.map((task) => (
                  <TableRow key={task._id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                    <TableCell sx={{ color: '#fff', fontSize: '0.8rem' }}>
                      {task.interviewDate ? format(new Date(task.interviewDate), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell sx={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>{task.slid}</TableCell>
                    <TableCell sx={{ color: '#fff', fontSize: '0.8rem' }}>{task.customerName}</TableCell>
                    <TableCell sx={{ color: alpha('#fff', 0.8), fontSize: '0.75rem' }}>
                      {Array.isArray(task.reason) ? task.reason.join(', ') : task.reason || '-'}
                    </TableCell>
                    <TableCell sx={{ color: alpha('#fff', 0.8), fontSize: '0.75rem' }}>
                      {Array.isArray(task.responsible) ? task.responsible.join(', ') : task.responsible || '-'}
                    </TableCell>
                    <TableCell>
                      {task.evaluationScore !== undefined && task.evaluationScore !== null && (
                        <Chip
                          label={task.evaluationScore}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            bgcolor: task.evaluationScore >= 9 ? 'rgba(76, 175, 80, 0.2)' :
                              task.evaluationScore >= 7 ? 'rgba(255, 152, 0, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                            color: task.evaluationScore >= 9 ? '#4caf50' :
                              task.evaluationScore >= 7 ? '#ff9800' : '#f44336'
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => {
                          setSelectedTask(task);
                          setViewDialogOpen(true);
                        }}
                        sx={{
                          textTransform: 'none',
                          color: '#7b68ee',
                          fontWeight: 'bold',
                          '&:hover': { bgcolor: alpha('#7b68ee', 0.1) }
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>

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
        setUpdateRefetchTasks={() => setUpdateRefetchTasks(prev => prev + 1)}
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
        <DialogContent sx={{
          mt: 2,
          direction: dialogTitle === "GAIA Content" ? 'ltr' : 'rtl',
          textAlign: dialogTitle === "GAIA Content" ? 'left' : 'right'
        }}>
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
        onTicketAdded={() => setUpdateRefetchTasks(prev => prev + 1)}
      />

      {/* GAIA Steps Dialog */}
      <GaiaStepsDialog
        open={gaiaStepsDialogOpen}
        onClose={() => {
          setGaiaStepsDialogOpen(false);
          setGaiaStepsTask(null);
        }}
        task={gaiaStepsTask}
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