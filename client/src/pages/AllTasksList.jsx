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

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO, format, subWeeks, subMonths, eachWeekOfInterval } from 'date-fns';
import { IoMdAdd } from "react-icons/io";
import api from '../api/api';
import EditTaskDialog from '../components/task/EditTaskDialog';
import RecordTicketDialog from '../components/task/RecordTicketDialog';
import GaiaStepsDialog from '../components/task/GaiaStepsDialog';
import { TaskDetailsDialog } from '../components/TaskDetailsDialog';
import { getCustomWeekNumber as getAggregatedWeekNumber, getCustomWeekRange, generateWeekRanges, groupDataByWeek, getMonthNumber, groupDataByMonth, getWeekNumber } from '../utils/helpers';
import {
  aggregateSamples
} from '../utils/dateFilterHelpers';
import XLSX from 'xlsx-js-style';
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
  
  // 1. Helper for weeks interval (for range fallback looking)
  const weeksInterval = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const start = startOfYear(new Date(currentYear, 0, 1));
    const end = endOfYear(new Date(currentYear, 11, 31));
    return eachWeekOfInterval({ start, end }, { weekStartsOn: settings?.weekStartDay || 0 });
  }, [settings]);

  // Calculate Total Samples from Token Data (using synchronized utility)
  const totalSamplesToken = useMemo(() => {
    if (!dateFilter.start || !dateFilter.end) return 0;
    
    let type = 'range';
    let value = { start: dateFilter.start, end: dateFilter.end, weeksInterval };
    
    if (dateFilter.type === 'all') {
      type = 'all';
    } else if (['thisWeek', 'lastWeek'].includes(dateFilter.type)) {
      type = 'week';
      const weekNum = getAggregatedWeekNumber(dateFilter.start, new Date(dateFilter.start).getFullYear(), settings);
      value = { 
        weekNumber: weekNum, 
        year: new Date(dateFilter.start).getFullYear(), 
        startDate: dateFilter.start 
      };
    } else if (['thisMonth', 'lastMonth'].includes(dateFilter.type)) {
      type = 'month';
      const d = new Date(dateFilter.start);
      value = { month: d.getMonth() + 1, year: d.getFullYear() };
    } else if (dateFilter.start && dateFilter.end) {
      // Robust detection: if range is exactly a calendar month, treat as month type
      const dStart = new Date(dateFilter.start);
      const dEnd = new Date(dateFilter.end);
      if (dStart.getDate() === 1 && dEnd.getDate() >= 28 && dStart.getMonth() === dEnd.getMonth()) {
        type = 'month';
        value = { month: dStart.getMonth() + 1, year: dStart.getFullYear() };
      }
    }

    return aggregateSamples(
      samplesTokenData, 
      type, 
      value, 
      settings
    );
  }, [samplesTokenData, dateFilter.start, dateFilter.end, dateFilter.type, settings, weeksInterval]);

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
  const [updateRefetchTasks, setUpdateRefetchTasks] = useState(0);

  const [selectedRowId, setSelectedRowId] = useState(null);
  const [dialogContent, setDialogContent] = useState('');
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const [dropdownOptions, setDropdownOptions] = useState({});
  const [favoriteTasks, setFavoriteTasks] = useState([]);
  // const [visitedRowIds, setVisitedRowIds] = useState([]); // Removed in favor of backend persistence

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


  // --- ADVANCED KPI CALCULATIONS ---
  // --- ADVANCED KPI CALCULATIONS (Synchronized with Dashboard) ---
  const dashboardStats = useMemo(() => {
    const totalSamples = totalSamplesToken > 0 ? totalSamplesToken : filteredTasks.length;
    
    if (totalSamples === 0) return {
      total: 0,
      complianceRate: 0,
      promoterRate: 0,
      neutralRate: 0,
      detractorRate: 0,
      avgScore: 0,
      nps: 0
    };

    const actualAudits = filteredTasks.length;
    const validatedCount = filteredTasks.filter(t => t.validationStatus === 'Validated').length;
    
    // Explicit scores audit (strictly >= 1 to exclude un-audited/errors)
    const detractors = filteredTasks.filter(t => t.evaluationScore >= 1 && t.evaluationScore <= 6).length;
    const neutrals = filteredTasks.filter(t => t.evaluationScore >= 7 && t.evaluationScore <= 8).length;
    
    // Derived promoters (same as Dashboard logic)
    const promoters = Math.max(0, totalSamples - (detractors + neutrals));

    const scores = filteredTasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined).map(t => t.evaluationScore);
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;

    const promoterRate = totalSamples > 0 ? Math.round((promoters / totalSamples) * 100) : 0;
    const detractorRate = totalSamples > 0 ? Math.round((detractors / totalSamples) * 100) : 0;
    const neutralRate = totalSamples > 0 ? Math.round((neutrals / totalSamples) * 100) : 0;
    const nps = promoterRate - detractorRate;

    return {
      total: actualAudits,
      totalSamples,
      complianceRate: actualAudits > 0 ? ((validatedCount / actualAudits) * 100).toFixed(1) : 0,
      promoterRate,
      neutralRate,
      detractorRate,
      avgScore,
      nps
    };
  }, [filteredTasks, totalSamplesToken]);

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

  const exportToExcel = async () => {
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

    const workbook = XLSX.utils.book_new();

    // Helper functions for styling
    const applyHeaderStyle = (ws, range, bg = "1F2937", color = "FFFFFF") => {
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) continue;
          ws[cellAddress].s = {
            font: { bold: true, color: { rgb: color } },
            fill: { fgColor: { rgb: bg } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          };
        }
      }
    };

    const applyDataRowStyle = (ws, range) => {
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) continue;
          ws[cellAddress].s = {
            alignment: { vertical: "center" },
            border: { bottom: { style: "thin", color: { rgb: "E5E7EB" } } }
          };
        }
      }
    };

    const addTitle = (ws, titleText, endCol) => {
      ws['A1'] = { v: titleText, t: 's', s: { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "7B68EE" } }, alignment: { horizontal: "center", vertical: "center" } } };
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: endCol } });
    };

    const getHierarchicalRCA = (tasks, ownerFilter = null) => {
      const tree = {};
      const normalize = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) {
          return val.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
        }
        if (typeof val === 'string' && val.trim()) {
          return val.split(',').map(s => s.trim()).filter(Boolean);
        }
        return [String(val).trim()];
      };

      tasks.forEach(t => {
        const reasons = normalize(t.reason);
        const subReasons = normalize(t.subReason);
        const rootCauses = normalize(t.rootCause);
        const resps = normalize(t.responsible);
        
        const max = Math.max(reasons.length, subReasons.length, rootCauses.length, resps.length);
        for (let i = 0; i < max; i++) {
          const resp = (resps[i] || resps[0] || 'Unknown').trim();
          if (ownerFilter && resp !== ownerFilter) continue;

          const r = (reasons[i] || reasons[0] || 'Unknown').trim() || 'Unknown';
          const sr = (subReasons[i] || subReasons[0] || 'Unknown').trim() || 'Unknown';
          const rc = (rootCauses[i] || 'Unknown').trim() || 'Unknown';
          
          if (!tree[r]) tree[r] = { total: 0, subs: {} };
          tree[r].total++;
          if (!tree[r].subs[sr]) tree[r].subs[sr] = { total: 0, rcs: {} };
          tree[r].subs[sr].total++;
          tree[r].subs[sr].rcs[rc] = (tree[r].subs[sr].rcs[rc] || 0) + 1;
        }
      });
      return tree;
    };

    const fixSheetRange = (ws) => {
      const cells = Object.keys(ws).filter(k => k[0] !== '!');
      if (cells.length === 0) return;
      const range = { s: { r: 1000000, c: 1000000 }, e: { r: 0, c: 0 } };
      cells.forEach(addr => {
        const c = XLSX.utils.decode_cell(addr);
        if (c.r < range.s.r) range.s.r = c.r;
        if (c.r > range.e.r) range.e.r = c.r;
        if (c.c < range.s.c) range.s.c = c.c;
        if (c.c > range.e.c) range.e.c = c.c;
      });
      ws['!ref'] = XLSX.utils.encode_range(range);
    };

    const addHierarchicalRCA = (ws, tree, originCell, title, colorHex) => {
      const startR = XLSX.utils.decode_cell(originCell).r;
      const startC = XLSX.utils.decode_cell(originCell).c;
      
      // Title Row
      const titleAddr = XLSX.utils.encode_cell({ r: startR, c: startC });
      ws[titleAddr] = { v: title, t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: colorHex } }, alignment: { horizontal: "center" } } };
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: startR, c: startC }, e: { r: startR, c: startC + 5 } });

      // Header Row
      const headers = ["Reason", "Total", "Sub reason", "Cases", "RC", "Cases"];
      headers.forEach((h, i) => {
        const cell = XLSX.utils.encode_cell({ r: startR + 1, c: startC + i });
        ws[cell] = { v: h, t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "374151" } }, alignment: { horizontal: "center" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } };
      });

      let currentR = startR + 2;
      Object.entries(tree).sort((a, b) => b[1].total - a[1].total).forEach(([reason, reasonData]) => {
        const reasonStartR = currentR;
        Object.entries(reasonData.subs).sort((a, b) => b[1].total - a[1].total).forEach(([sub, subData]) => {
          const subStartR = currentR;
          Object.entries(subData.rcs).sort((a, b) => b[1] - a[1]).forEach(([rc, rcCount]) => {
            XLSX.utils.sheet_add_aoa(ws, [[rc]], { origin: { r: currentR, c: startC + 4 } });
            XLSX.utils.sheet_add_aoa(ws, [[rcCount]], { origin: { r: currentR, c: startC + 5 } });
            currentR++;
          });
          const subEndR = currentR - 1;
          XLSX.utils.sheet_add_aoa(ws, [[sub]], { origin: { r: subStartR, c: startC + 2 } });
          ws[XLSX.utils.encode_cell({ r: subStartR, c: startC + 2 })].s = { alignment: { vertical: 'center', horizontal: 'center', wrapText: true } };
          XLSX.utils.sheet_add_aoa(ws, [[subData.total]], { origin: { r: subStartR, c: startC + 3 } });
          ws[XLSX.utils.encode_cell({ r: subStartR, c: startC + 3 })].s = { alignment: { vertical: 'center', horizontal: 'center' } };
          
          if (subEndR > subStartR) {
            ws['!merges'].push({ s: { r: subStartR, c: startC + 2 }, e: { r: subEndR, c: startC + 2 } });
            ws['!merges'].push({ s: { r: subStartR, c: startC + 3 }, e: { r: subEndR, c: startC + 3 } });
          }
        });
        const reasonEndR = currentR - 1;
        XLSX.utils.sheet_add_aoa(ws, [[reason]], { origin: { r: reasonStartR, c: startC } });
        ws[XLSX.utils.encode_cell({ r: reasonStartR, c: startC })].s = { font: { bold: true }, alignment: { vertical: 'center', horizontal: 'center', wrapText: true } };
        XLSX.utils.sheet_add_aoa(ws, [[reasonData.total]], { origin: { r: reasonStartR, c: startC + 1 } });
        ws[XLSX.utils.encode_cell({ r: reasonStartR, c: startC + 1 })].s = { font: { bold: true }, alignment: { vertical: 'center', horizontal: 'center' } };
        
        if (reasonEndR > reasonStartR) {
          ws['!merges'].push({ s: { r: reasonStartR, c: startC }, e: { r: reasonEndR, c: startC } });
          ws['!merges'].push({ s: { r: reasonStartR, c: startC + 1 }, e: { r: reasonEndR, c: startC + 1 } });
        }
      });

      // Borders
      for (let r = startR + 1; r < currentR; r++) {
        for (let c = startC; c < startC + 6; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          if (!ws[addr]) ws[addr] = { v: '', t: 's' };
          if (!ws[addr].s) ws[addr].s = {};
          ws[addr].s.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
          if (!ws[addr].s.alignment) ws[addr].s.alignment = { vertical: 'center' };
        }
      }
      return currentR;
    };

    const addTableToSheet = (ws, data, originCell, title, colorHex) => {
      XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: originCell });
      XLSX.utils.sheet_add_json(ws, data, { origin: XLSX.utils.encode_cell({ c: XLSX.utils.decode_cell(originCell).c, r: XLSX.utils.decode_cell(originCell).r + 1 }), skipHeader: false });
      
      const startR = XLSX.utils.decode_cell(originCell).r + 1;
      const startC = XLSX.utils.decode_cell(originCell).c;
      
      // Title style
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: startR - 1, c: startC }, e: { r: startR - 1, c: startC + 2 } });
      ws[originCell].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: colorHex } }, alignment: { horizontal: "center" } };

      // Header style
      applyHeaderStyle(ws, { s: { r: startR, c: startC }, e: { r: startR, c: startC + 2 } }, "4B5563");
      applyDataRowStyle(ws, { s: { r: startR, c: startC }, e: { r: startR + data.length, c: startC + 2 } });
    };

    // 2. Executive Summary Sheet
    const totalSamples = dashboardStats.totalSamples || filteredTasks.length;
    const auditedTasks = filteredTasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== 'N/A');
    const totalAudited = auditedTasks.length;
    const validatedCount = filteredTasks.filter(t => t.validationStatus === 'Validated').length;
    
    // Exact count of detractors and neutrals matching dashboard logic
    const detractors = auditedTasks.filter(t => Number(t.evaluationScore) <= 6).length;
    const neutrals = auditedTasks.filter(t => Number(t.evaluationScore) >= 7 && Number(t.evaluationScore) <= 8).length;
    const promoters = Math.max(0, totalSamples - (detractors + neutrals));
    const nps = (totalSamples > 0) ? Math.round(((promoters / totalSamples) - (detractors / totalSamples)) * 100) : 0;

    const todoCount = filteredTasks.filter(t => t.status === 'Todo').length;
    const inProgressCount = filteredTasks.filter(t => t.status === 'In Progress').length;
    const closedCount = filteredTasks.filter(t => t.status === 'Closed').length;

    const validatedDetractors = auditedTasks.filter(t => 
      Number(t.evaluationScore) <= 6 && t.validationStatus === 'Validated'
    ).length;

    const totalIssues = filteredTasks.reduce((acc, t) => {
      const val = t.reason;
      if (!val) return acc;
      let values = [];
      if (Array.isArray(val)) {
        values = val.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
      } else if (typeof val === 'string' && val.trim()) {
        values = val.split(',').map(s => s.trim()).filter(Boolean);
      } else if (val) {
        values = [val];
      }
      return acc + values.length;
    }, 0);

    const avgIssuesPerTask = totalAudited > 0 ? (totalIssues / totalAudited).toFixed(2) : "0.00";

    const summaryData = [
      ["EXECUTIVE AUDIT SUMMARY", "", ""],
      ["Reported Period:", periodStr, ""],
      ["Export Date:", format(new Date(), 'dd/MM/yyyy HH:mm'), ""],
      ["", "", ""],
      ["CORE KEY PERFORMANCE INDICATORS", "VALUE", "PERCENTAGE"],
      ["Total Samples Token", totalSamples, "-"],
      ["Non-Promoter Customers", totalAudited, totalSamples > 0 ? `${((totalAudited / totalSamples) * 100).toFixed(1)}%` : "0%"],
      ["Total Issues Identified", totalIssues, "-"],
      ["Avg. Issues per Task", avgIssuesPerTask, "-"],
      ["Detractors", detractors, totalSamples > 0 ? `${((detractors / totalSamples) * 100).toFixed(1)}%` : "0%"],
      ["Neutrals", neutrals, totalSamples > 0 ? `${((neutrals / totalSamples) * 100).toFixed(1)}%` : "0%"],
      ["Promoters", promoters, totalSamples > 0 ? `${((promoters / totalSamples) * 100).toFixed(1)}%` : "0%"],
      ["NPS", nps, "-"],
      ["", "", ""],
      ["TASK STATUS SUMMARY", "COUNT", "SHARE"],
      ["Todo Tasks", todoCount, totalAudited > 0 ? `${((todoCount / totalAudited) * 100).toFixed(1)}%` : "0%"],
      ["In Progress Tasks", inProgressCount, totalAudited > 0 ? `${((inProgressCount / totalAudited) * 100).toFixed(1)}%` : "0%"],
      ["Closed Tasks", closedCount, totalAudited > 0 ? `${((closedCount / totalAudited) * 100).toFixed(1)}%` : "0%"],
      ["", "", ""],
      ["COMPLIANCE & QUALITY DETAILED BREAKDOWN", "COUNT", "RATE"],
      ["Overall Compliance (Total Samples)", validatedCount, totalSamples > 0 ? `${((validatedCount / totalSamples) * 100).toFixed(1)}%` : "0%"],
      ["Audit Compliance (Validated Tasks)", validatedCount, totalAudited > 0 ? `${((validatedCount / totalAudited) * 100).toFixed(1)}%` : "0%"],
      ["Detractor Compliance Rate", validatedDetractors, detractors > 0 ? `${((validatedDetractors / detractors) * 100).toFixed(1)}%` : "0%"],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Style Executive Summary
    addTitle(wsSummary, "EXECUTIVE AUDIT SUMMARY", 2);
    wsSummary['A2'].s = { font: { bold: true } };
    wsSummary['A3'].s = { font: { bold: true } };
    applyHeaderStyle(wsSummary, { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } }, "374151");
    applyDataRowStyle(wsSummary, { s: { r: 4, c: 0 }, e: { r: 12, c: 2 } });
    
    applyHeaderStyle(wsSummary, { s: { r: 14, c: 0 }, e: { r: 14, c: 2 } }, "374151");
    applyDataRowStyle(wsSummary, { s: { r: 14, c: 0 }, e: { r: 17, c: 2 } });

    applyHeaderStyle(wsSummary, { s: { r: 19, c: 0 }, e: { r: 19, c: 2 } }, "374151");
    applyDataRowStyle(wsSummary, { s: { r: 19, c: 0 }, e: { r: 22, c: 2 } });
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 15 }];
    fixSheetRange(wsSummary);
    
    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Executive Summary');

    // 3. Reason Overview Sheet (with Percentages)
    const getCountsWithPercent = (field, customTasks = filteredTasks) => {
      const counts = {};
      customTasks.forEach(t => {
        const val = t[field];
        let values = [];
        if (Array.isArray(val)) {
          values = val.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
        } else if (typeof val === 'string' && val.trim()) {
          values = val.split(',').map(s => s.trim()).filter(Boolean);
        } else if (val) {
          values = [String(val).trim()];
        }
        values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      });

      const totalItemsCount = Object.values(counts).reduce((acc, curr) => acc + curr, 0);

      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({
          Name: name,
          Count: count,
          Percentage: totalItemsCount > 0 ? `${((count / totalItemsCount) * 100).toFixed(1)}%` : '0%'
        }));
    };

    const owners = getCountsWithPercent('responsible');
    const itnRelated = getCountsWithPercent('itnRelated');
    const subRelated = getCountsWithPercent('relatedToSubscription');
    const globalRootCauses = getCountsWithPercent('rootCause');

    const wsReasons = XLSX.utils.aoa_to_sheet([[`Reported Period: ${periodStr}`]]);
    wsReasons['A1'].s = { font: { bold: true, sz: 14 } };

    const hierarchicalRCA = getHierarchicalRCA(filteredTasks);
    addHierarchicalRCA(wsReasons, hierarchicalRCA, "A3", "ROOT CAUSE BREAKDOWN", "1E3A8A");
    
    addTableToSheet(wsReasons, globalRootCauses, "H3", "ROOT CAUSE SUMMARY", "1E3A8A");
    addTableToSheet(wsReasons, owners, "L3", "OWNER ANALYSIS", "00BCD4");
    addTableToSheet(wsReasons, itnRelated, "P3", "ITN RELATED ANALYSIS", "FF5722");
    addTableToSheet(wsReasons, subRelated, "T3", "SUBSCRIPTION RELATED ANALYSIS", "8BC34A");
    
    wsReasons['!cols'] = Array(26).fill({ wch: 15 });
    wsReasons['!cols'][0] = { wch: 25 }; // Reason
    wsReasons['!cols'][1] = { wch: 8 };  // Total
    wsReasons['!cols'][2] = { wch: 25 }; // Sub-reason
    wsReasons['!cols'][3] = { wch: 8 };  // Cases
    wsReasons['!cols'][4] = { wch: 30 }; // RC
    wsReasons['!cols'][5] = { wch: 8 };  // Cases
    wsReasons['!cols'][7] = { wch: 30 }; // RC Summary Name
    wsReasons['!cols'][11] = { wch: 25 }; // Owner Name
    fixSheetRange(wsReasons);

    XLSX.utils.book_append_sheet(workbook, wsReasons, 'R.C.A - All');

    // 3.5 Special Analytics Window
    const ownerCounts = {};
    filteredTasks.forEach(t => {
      const resp = t.responsible;
      let values = [];
      if (Array.isArray(resp)) {
        values = resp.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
      } else if (typeof resp === 'string' && resp.trim()) {
        values = resp.split(',').map(s => s.trim()).filter(Boolean);
      } else if (resp) {
        values = [resp];
      }
      values.forEach(v => { ownerCounts[v] = (ownerCounts[v] || 0) + 1; });
    });
    
    const sortedOwners = Object.entries(ownerCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const topOwners = sortedOwners; // Take all owners
    
    const wsSpecial = XLSX.utils.aoa_to_sheet([[`OWNERSHIP DISTRIBUTION - Period: ${periodStr}`]]);
    wsSpecial['A1'] = { v: `OWNERSHIP DISTRIBUTION - Period: ${periodStr}`, t: 's', s: { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4B5563" } }, alignment: { horizontal: "center", vertical: "center" } } };
    if (!wsSpecial['!merges']) wsSpecial['!merges'] = [];
    wsSpecial['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 20 } });

    let currentR = 2;

    topOwners.forEach((owner) => {
      // Owner Title
      const ownerCell = XLSX.utils.encode_cell({ r: currentR, c: 0 });
      wsSpecial[ownerCell] = { v: `OWNER: ${owner.toUpperCase()}`, t: 's', s: { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1F2937" } }, alignment: { horizontal: "center" } } };
      wsSpecial['!merges'].push({ s: { r: currentR, c: 0 }, e: { r: currentR, c: 20 } });
      
      // Issue-level statistics for this owner

      const getOwnerStats = (field) => {
        const counts = {};
        let ownerIssuesCount = 0;

        filteredTasks.forEach(t => {
          const resps = Array.isArray(t.responsible) ? t.responsible : (typeof t.responsible === 'string' ? t.responsible.split(',').map(s => s.trim()) : []);
          const vals = Array.isArray(t[field]) ? t[field] : (typeof t[field] === 'string' ? t[field].split(',').map(s => s.trim()) : []);
          
          const max = Math.max(resps.length, vals.length);
          for (let i = 0; i < max; i++) {
            const resp = (resps[i] || resps[0] || 'Unknown').trim();
            if (resp !== owner) continue;
            
            const val = (vals[i] || vals[0] || 'Unknown').trim();
            counts[val] = (counts[val] || 0) + 1;
            ownerIssuesCount++;
          }
        });
        
        return Object.entries(counts).map(([name, count]) => ({
          Name: name,
          Count: count,
          Percentage: ownerIssuesCount > 0 ? `${((count / ownerIssuesCount) * 100).toFixed(1)}%` : "0%"
        })).sort((a, b) => b.Count - a.Count);
      };

      const hierarchicalTree = getHierarchicalRCA(filteredTasks, owner);
      const rcSummary = getOwnerStats('rootCause');
      const itns = getOwnerStats('itnRelated');
      const subs = getOwnerStats('relatedToSubscription');

      const tableStartR = currentR + 2;
      const nextR = addHierarchicalRCA(wsSpecial, hierarchicalTree, XLSX.utils.encode_cell({ r: tableStartR, c: 0 }), "ROOT CAUSE BREAKDOWN", "1E3A8A");
      addTableToSheet(wsSpecial, rcSummary, XLSX.utils.encode_cell({ r: tableStartR, c: 7 }), "ROOT CAUSE SUMMARY", "1E3A8A");
      addTableToSheet(wsSpecial, itns, XLSX.utils.encode_cell({ r: tableStartR, c: 11 }), "ITN RELATED", "FF5722");
      addTableToSheet(wsSpecial, subs, XLSX.utils.encode_cell({ r: tableStartR, c: 15 }), "SUBSCRIPTION", "8BC34A");

      currentR = Math.max(nextR, tableStartR + Math.max(rcSummary.length, itns.length, subs.length) + 2) + 5;
    });
    
    wsSpecial['!cols'] = Array(21).fill({ wch: 15 });
    wsSpecial['!cols'][0] = { wch: 25 };
    wsSpecial['!cols'][1] = { wch: 8 };
    wsSpecial['!cols'][2] = { wch: 25 };
    wsSpecial['!cols'][3] = { wch: 8 };
    wsSpecial['!cols'][4] = { wch: 30 };
    wsSpecial['!cols'][5] = { wch: 8 };
    wsSpecial['!cols'][7] = { wch: 30 };
    fixSheetRange(wsSpecial);

    XLSX.utils.book_append_sheet(workbook, wsSpecial, 'Ownership Distribution');

    // Helper functions for raw data subsets
    const getSeverityStats = (tasks) => {
      const counts = { 'Low': 0, 'Normal': 0, 'Medium': 0, 'High': 0 };
      let total = tasks.length;
      tasks.forEach(t => {
        const p = (t.priority || 'Normal').trim();
        const key = Object.keys(counts).find(k => k.toLowerCase() === p.toLowerCase()) || p;
        if (counts[key] !== undefined) counts[key]++;
        else counts[key] = 1;
      });
      return Object.entries(counts).filter(([_, c]) => c > 0 || ['Low', 'Normal', 'Medium', 'High'].includes(_)).map(([name, count]) => ({
        Severity: name,
        Count: count,
        Percentage: total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0%'
      })).sort((a, b) => b.Count - a.Count);
    };

    const getFieldStats = (tasks, field) => {
      const counts = {};
      let total = 0;
      tasks.forEach(t => {
        const val = t[field];
        let values = [];
        if (Array.isArray(val)) values = val.map(v => String(v).trim()).filter(Boolean);
        else if (typeof val === 'string' && val.trim()) values = val.split(',').map(s => s.trim()).filter(Boolean);
        else if (val) values = [String(val).trim()];
        
        values.forEach(v => {
          counts[v] = (counts[v] || 0) + 1;
          total++;
        });
      });
      return Object.entries(counts).map(([name, count]) => ({
        Name: name,
        Count: count,
        Percentage: total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0%'
      })).sort((a, b) => b.Count - a.Count);
    };

    const addSubsetSummary = (ws, tasks, startR, titleColorHex, headerColorHex) => {
      if (tasks.length === 0) return startR;
      const sevStats = getSeverityStats(tasks);
      const reasonStats = getFieldStats(tasks, 'reason').slice(0, 5);
      const rcStats = getFieldStats(tasks, 'rootCause').slice(0, 5);

      addTableToSheet(ws, sevStats, XLSX.utils.encode_cell({ r: startR, c: 0 }), "SEVERITY BREAKDOWN", titleColorHex);
      addTableToSheet(ws, reasonStats, XLSX.utils.encode_cell({ r: startR, c: 4 }), "TOP REASONS", titleColorHex);
      addTableToSheet(ws, rcStats, XLSX.utils.encode_cell({ r: startR, c: 8 }), "TOP ROOT CAUSES", titleColorHex);
      
      applyHeaderStyle(ws, { s: { r: startR + 1, c: 0 }, e: { r: startR + 1, c: 2 } }, headerColorHex);
      applyHeaderStyle(ws, { s: { r: startR + 1, c: 4 }, e: { r: startR + 1, c: 6 } }, headerColorHex);
      applyHeaderStyle(ws, { s: { r: startR + 1, c: 8 }, e: { r: startR + 1, c: 10 } }, headerColorHex);

      const maxRows = Math.max(sevStats.length, reasonStats.length, rcStats.length);
      return startR + maxRows + 3;
    };

    // 3.6 Detractor Special Analytics Window
    const detTasks = filteredTasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== 'N/A' && t.evaluationScore <= 6);
    const detOwnerCounts = {};
    detTasks.forEach(t => {
      const resp = t.responsible;
      let values = [];
      if (Array.isArray(resp)) values = resp.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
      else if (typeof resp === 'string') values = resp.split(',').map(s => s.trim()).filter(Boolean);
      else if (resp) values = [resp];
      values.forEach(v => { detOwnerCounts[v] = (detOwnerCounts[v] || 0) + 1; });
    });
    
    const sortedDetOwners = Object.entries(detOwnerCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const topDetOwners = sortedDetOwners; // Take all owners
    
    const wsDetSpecial = XLSX.utils.aoa_to_sheet([[`INDIVIDUAL DETRACTOR ANALYTICS - Period: ${periodStr}`]]);
    wsDetSpecial['A1'] = { v: `INDIVIDUAL DETRACTOR ANALYTICS - Period: ${periodStr}`, t: 's', s: { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "B91C1C" } }, alignment: { horizontal: "center", vertical: "center" } } };
    if (!wsDetSpecial['!merges']) wsDetSpecial['!merges'] = [];
    wsDetSpecial['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 20 } });

    // 1. Overall Detractor Owner Distribution Table
    const totalDetTasks = detTasks.length;
    const allDetOwnersData = Object.entries(detOwnerCounts)
      .map(([name, count]) => ({
        Owner: name,
        'Detractor Count': count,
        'Share %': totalDetTasks > 0 ? `${((count / totalDetTasks) * 100).toFixed(1)}%` : "0%"
      }))
      .sort((a, b) => b['Detractor Count'] - a['Detractor Count']);

    XLSX.utils.sheet_add_aoa(wsDetSpecial, [["OVERALL DETRACTOR OWNER DISTRIBUTION"]], { origin: "A3" });
    wsDetSpecial['A3'] = { v: "OVERALL DETRACTOR OWNER DISTRIBUTION", t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "450a0a" } }, alignment: { horizontal: "center" } } };
    wsDetSpecial['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 2 } });
    XLSX.utils.sheet_add_json(wsDetSpecial, allDetOwnersData, { origin: "A4", skipHeader: false });
    applyHeaderStyle(wsDetSpecial, { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } }, "B91C1C");
    applyDataRowStyle(wsDetSpecial, { s: { r: 3, c: 0 }, e: { r: 3 + allDetOwnersData.length, c: 2 } });

    let detCurrentR = Math.max(allDetOwnersData.length + 6, 8);

    topDetOwners.forEach((owner) => {
      const ownerCell = XLSX.utils.encode_cell({ r: detCurrentR, c: 0 });
      wsDetSpecial[ownerCell] = { v: `OWNER: ${owner.toUpperCase()}`, t: 's', s: { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "7F1D1D" } }, alignment: { horizontal: "center" } } };
      wsDetSpecial['!merges'].push({ s: { r: detCurrentR, c: 0 }, e: { r: detCurrentR, c: 20 } });
      
      // Issue-level statistics for this owner (Detractors)

      const getDetOwnerStats = (field) => {
        const counts = {};
        let ownerIssuesCount = 0;

        detTasks.forEach(t => {
          const resps = Array.isArray(t.responsible) ? t.responsible : (typeof t.responsible === 'string' ? t.responsible.split(',').map(s => s.trim()) : []);
          const vals = Array.isArray(t[field]) ? t[field] : (typeof t[field] === 'string' ? t[field].split(',').map(s => s.trim()) : []);
          
          const max = Math.max(resps.length, vals.length);
          for (let i = 0; i < max; i++) {
            const resp = (resps[i] || resps[0] || 'Unknown').trim();
            if (resp !== owner) continue;
            
            const val = (vals[i] || vals[0] || 'Unknown').trim();
            counts[val] = (counts[val] || 0) + 1;
            ownerIssuesCount++;
          }
        });
        
        return Object.entries(counts).map(([name, count]) => ({
          Name: name,
          Count: count,
          Percentage: ownerIssuesCount > 0 ? `${((count / ownerIssuesCount) * 100).toFixed(1)}%` : "0%"
        })).sort((a, b) => b.Count - a.Count);
      };

      const hierarchicalTree = getHierarchicalRCA(detTasks, owner);
      const rcSummary = getDetOwnerStats('rootCause');
      const itns = getDetOwnerStats('itnRelated');
      const subs = getDetOwnerStats('relatedToSubscription');

      const tableStartR = detCurrentR + 2;
      const nextR = addHierarchicalRCA(wsDetSpecial, hierarchicalTree, XLSX.utils.encode_cell({ r: tableStartR, c: 0 }), "ROOT CAUSE BREAKDOWN (DET)", "B91C1C");
      addTableToSheet(wsDetSpecial, rcSummary, XLSX.utils.encode_cell({ r: tableStartR, c: 7 }), "ROOT CAUSE SUMMARY (DET)", "991B1B");
      addTableToSheet(wsDetSpecial, itns, XLSX.utils.encode_cell({ r: tableStartR, c: 11 }), "ITN RELATED (DET)", "B91C1C");
      addTableToSheet(wsDetSpecial, subs, XLSX.utils.encode_cell({ r: tableStartR, c: 15 }), "SUBSCRIPTION (DET)", "DC2626");

      detCurrentR = Math.max(nextR, tableStartR + Math.max(rcSummary.length, itns.length, subs.length) + 2) + 5;

      // ── Raw data breakdown tables — OWNER: REACH only ───────────────────────
      if (owner.toLowerCase() === 'reach') {
        const reachDetTasks = detTasks.filter(t => {
          const resps = Array.isArray(t.responsible)
            ? t.responsible
            : (typeof t.responsible === 'string' ? t.responsible.split(',').map(s => s.trim()) : []);
          return resps.some(r => r.trim().toLowerCase() === 'reach');
        });

        const reachNoAccTasks = reachDetTasks.filter(t => !t.teamAccountability?.includes('Yes'));
        const reachYesAccTasks = reachDetTasks.filter(t => t.teamAccountability?.includes('Yes'));

        const buildReachRawRows = (tasks) => tasks.map(task => ({
          'SLID': task.slid || 'N/A',
          'Request Number': task.requestNumber || 'N/A',
          'Status': task.status || 'N/A',
          'Team Accountability': task.teamAccountability || 'N/A',
          'Q1-Score': task.evaluationScore !== null ? task.evaluationScore : 'N/A',
          'Q1 - Scale Comment': task.customerFeedback || 'N/A',
          'Severity': task.priority || 'Normal',
          'Satisfaction Category': (() => {
            if (task.evaluationScore === null || task.evaluationScore === 'N/A') return 'N/A';
            const score = Number(task.evaluationScore);
            if (score <= 6) return 'Detractor';
            if (score >= 7 && score <= 8) return 'Neutral';
            if (score >= 9) return 'Promoter';
            return 'N/A';
          })(),
          'Customer Name': task.customerName || 'N/A',
          'Contact Number': task.contactNumber || 'N/A',
          'Governorate': task.governorate || 'N/A',
          'District': task.district || 'N/A',
          'Operation': task.operation || 'N/A',
          'Tariff Name': task.tarrifName || 'N/A',
          'Validation Status': task.validationStatus || 'Not validated',
          'Reason': Array.isArray(task.reason) ? task.reason.join(', ') : (task.reason || 'N/A'),
          'Sub-Reason': Array.isArray(task.subReason) ? task.subReason.join(', ') : (task.subReason || 'N/A'),
          'Root Cause': Array.isArray(task.rootCause) ? task.rootCause.join(', ') : (task.rootCause || 'N/A'),
          'ITN Related': Array.isArray(task.itnRelated) ? task.itnRelated.join(', ') : (task.itnRelated || 'N/A'),
          'Subscription Related': Array.isArray(task.relatedToSubscription) ? task.relatedToSubscription.join(', ') : (task.relatedToSubscription || 'N/A'),
          'Field Team Name': task.teamName || 'N/A',
          'Request Date': task.contractDate ? format(new Date(task.contractDate), 'yyyy-MM-dd') : 'N/A',
          'PIS Date': task.pisDate ? format(new Date(task.pisDate), 'yyyy-MM-dd') : 'N/A',
          'Interview Date': task.interviewDate ? format(new Date(task.interviewDate), 'yyyy-MM-dd') : 'N/A',
          'Close Date': task.closeDate ? format(new Date(task.closeDate), 'yyyy-MM-dd') : 'N/A',
        }));

        const rawNoAccData = buildReachRawRows(reachNoAccTasks);
        const rawYesAccData = buildReachRawRows(reachYesAccTasks);

        // Section separator header
        const rawSectionTitleR = detCurrentR;
        const rawSectionTitleCell = XLSX.utils.encode_cell({ r: rawSectionTitleR, c: 0 });
        wsDetSpecial[rawSectionTitleCell] = {
          v: 'REACH RAW DATA BREAKDOWN — BY TEAM ACCOUNTABILITY',
          t: 's',
          s: { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '450a0a' } }, alignment: { horizontal: 'center', vertical: 'center' } }
        };
        if (!wsDetSpecial['!merges']) wsDetSpecial['!merges'] = [];
        wsDetSpecial['!merges'].push({ s: { r: rawSectionTitleR, c: 0 }, e: { r: rawSectionTitleR, c: 24 } });

        // Table 1: Team Accountability = No
        const noAccTitleR = rawSectionTitleR + 2;
        const noAccTitleCell = XLSX.utils.encode_cell({ r: noAccTitleR, c: 0 });
        wsDetSpecial[noAccTitleCell] = {
          v: `REACH DETRACTOR RAW DATA — TEAM ACCOUNTABILITY: NO  (${rawNoAccData.length} record${rawNoAccData.length !== 1 ? 's' : ''})`,
          t: 's',
          s: { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '7F1D1D' } }, alignment: { horizontal: 'center', vertical: 'center' } }
        };
        wsDetSpecial['!merges'].push({ s: { r: noAccTitleR, c: 0 }, e: { r: noAccTitleR, c: 24 } });

        let noAccEndR = noAccTitleR + 1;
        if (rawNoAccData.length > 0) {
          const rawStartR = addSubsetSummary(wsDetSpecial, reachNoAccTasks, noAccTitleR + 2, "7F1D1D", "B91C1C");
          XLSX.utils.sheet_add_json(wsDetSpecial, rawNoAccData, { origin: XLSX.utils.encode_cell({ r: rawStartR, c: 0 }), skipHeader: false });
          const noAccKeys = Object.keys(rawNoAccData[0]);
          applyHeaderStyle(wsDetSpecial, { s: { r: rawStartR, c: 0 }, e: { r: rawStartR, c: noAccKeys.length - 1 } }, 'B91C1C');
          applyDataRowStyle(wsDetSpecial, { s: { r: rawStartR, c: 0 }, e: { r: rawStartR + rawNoAccData.length, c: noAccKeys.length - 1 } });
          noAccEndR = rawStartR + rawNoAccData.length;
        }

        // Table 2: Team Accountability = Yes
        const yesAccTitleR = noAccEndR + 3;
        const yesAccTitleCell = XLSX.utils.encode_cell({ r: yesAccTitleR, c: 0 });
        wsDetSpecial[yesAccTitleCell] = {
          v: `REACH DETRACTOR RAW DATA — TEAM ACCOUNTABILITY: YES  (${rawYesAccData.length} record${rawYesAccData.length !== 1 ? 's' : ''})`,
          t: 's',
          s: { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '14532D' } }, alignment: { horizontal: 'center', vertical: 'center' } }
        };
        wsDetSpecial['!merges'].push({ s: { r: yesAccTitleR, c: 0 }, e: { r: yesAccTitleR, c: 24 } });

        let yesAccEndR = yesAccTitleR + 1;
        if (rawYesAccData.length > 0) {
          const rawStartR = addSubsetSummary(wsDetSpecial, reachYesAccTasks, yesAccTitleR + 2, "14532D", "166534");
          XLSX.utils.sheet_add_json(wsDetSpecial, rawYesAccData, { origin: XLSX.utils.encode_cell({ r: rawStartR, c: 0 }), skipHeader: false });
          const yesAccKeys = Object.keys(rawYesAccData[0]);
          applyHeaderStyle(wsDetSpecial, { s: { r: rawStartR, c: 0 }, e: { r: rawStartR, c: yesAccKeys.length - 1 } }, '166534');
          applyDataRowStyle(wsDetSpecial, { s: { r: rawStartR, c: 0 }, e: { r: rawStartR + rawYesAccData.length, c: yesAccKeys.length - 1 } });
          yesAccEndR = rawStartR + rawYesAccData.length;
        }

        detCurrentR = yesAccEndR + 5;
      }
    });
    
    wsDetSpecial['!cols'] = Array(25).fill({ wch: 15 });
    wsDetSpecial['!cols'][0] = { wch: 20 };  // SLID / Reason
    wsDetSpecial['!cols'][1] = { wch: 8 };   // Total / Request Number
    wsDetSpecial['!cols'][2] = { wch: 22 };  // Sub-Reason / Status
    wsDetSpecial['!cols'][3] = { wch: 8 };   // Cases / Team Accountability
    wsDetSpecial['!cols'][4] = { wch: 28 };  // RC / Q1-Score
    wsDetSpecial['!cols'][5] = { wch: 55 };  // Cases / Q1 - Scale Comment
    wsDetSpecial['!cols'][6] = { wch: 12 };  // Severity
    wsDetSpecial['!cols'][7] = { wch: 20 };  // RC Summary / Satisfaction Category
    wsDetSpecial['!cols'][8] = { wch: 22 };  // Customer Name
    wsDetSpecial['!cols'][9] = { wch: 15 };  // Contact Number
    wsDetSpecial['!cols'][10] = { wch: 18 }; // Governorate
    wsDetSpecial['!cols'][11] = { wch: 18 }; // District
    wsDetSpecial['!cols'][12] = { wch: 18 }; // Operation
    wsDetSpecial['!cols'][13] = { wch: 18 }; // Tariff Name
    wsDetSpecial['!cols'][14] = { wch: 16 }; // Validation Status
    wsDetSpecial['!cols'][15] = { wch: 25 }; // Reason (raw)
    wsDetSpecial['!cols'][16] = { wch: 25 }; // Sub-Reason (raw)
    wsDetSpecial['!cols'][17] = { wch: 28 }; // Root Cause (raw)
    wsDetSpecial['!cols'][18] = { wch: 18 }; // ITN Related
    wsDetSpecial['!cols'][19] = { wch: 22 }; // Subscription Related
    wsDetSpecial['!cols'][20] = { wch: 22 }; // Field Team Name
    wsDetSpecial['!cols'][21] = { wch: 14 }; // Request Date
    wsDetSpecial['!cols'][22] = { wch: 14 }; // PIS Date
    wsDetSpecial['!cols'][23] = { wch: 14 }; // Interview Date
    wsDetSpecial['!cols'][24] = { wch: 14 }; // Close Date
    fixSheetRange(wsDetSpecial);

    XLSX.utils.book_append_sheet(workbook, wsDetSpecial, 'Detractor Special Analytics');
    
    // 3.7 Neutral Special Analytics Window
    const neuTasks = filteredTasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== 'N/A' && t.evaluationScore >= 7 && t.evaluationScore <= 8);
    const neuOwnerCounts = {};
    neuTasks.forEach(t => {
      const resp = t.responsible;
      let values = [];
      if (Array.isArray(resp)) values = resp.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
      else if (typeof resp === 'string') values = resp.split(',').map(s => s.trim()).filter(Boolean);
      else if (resp) values = [resp];
      values.forEach(v => { neuOwnerCounts[v] = (neuOwnerCounts[v] || 0) + 1; });
    });
    
    const sortedNeuOwners = Object.entries(neuOwnerCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const topNeuOwners = sortedNeuOwners; // Take all owners
    
    const wsNeuSpecial = XLSX.utils.aoa_to_sheet([[`INDIVIDUAL NEUTRAL ANALYTICS - Period: ${periodStr}`]]);
    wsNeuSpecial['A1'] = { v: `INDIVIDUAL NEUTRAL ANALYTICS - Period: ${periodStr}`, t: 's', s: { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "D97706" } }, alignment: { horizontal: "center", vertical: "center" } } };
    if (!wsNeuSpecial['!merges']) wsNeuSpecial['!merges'] = [];
    wsNeuSpecial['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 20 } });

    // 1. Overall Neutral Owner Distribution Table
    const totalNeuTasks = neuTasks.length;
    const allNeuOwnersData = Object.entries(neuOwnerCounts)
      .map(([name, count]) => ({
        Owner: name,
        'Neutral Count': count,
        'Share %': totalNeuTasks > 0 ? `${((count / totalNeuTasks) * 100).toFixed(1)}%` : "0%"
      }))
      .sort((a, b) => b['Neutral Count'] - a['Neutral Count']);

    XLSX.utils.sheet_add_aoa(wsNeuSpecial, [["OVERALL NEUTRAL OWNER DISTRIBUTION"]], { origin: "A3" });
    wsNeuSpecial['A3'] = { v: "OVERALL NEUTRAL OWNER DISTRIBUTION", t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "92400E" } }, alignment: { horizontal: "center" } } };
    wsNeuSpecial['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 2 } });
    XLSX.utils.sheet_add_json(wsNeuSpecial, allNeuOwnersData, { origin: "A4", skipHeader: false });
    applyHeaderStyle(wsNeuSpecial, { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } }, "D97706");
    applyDataRowStyle(wsNeuSpecial, { s: { r: 3, c: 0 }, e: { r: 3 + allNeuOwnersData.length, c: 2 } });

    let neuCurrentR = Math.max(allNeuOwnersData.length + 6, 8);

    topNeuOwners.forEach((owner) => {
      const ownerCell = XLSX.utils.encode_cell({ r: neuCurrentR, c: 0 });
      wsNeuSpecial[ownerCell] = { v: `OWNER: ${owner.toUpperCase()}`, t: 's', s: { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "B45309" } }, alignment: { horizontal: "center" } } };
      wsNeuSpecial['!merges'].push({ s: { r: neuCurrentR, c: 0 }, e: { r: neuCurrentR, c: 20 } });
      
      // Issue-level statistics for this owner (Neutrals)

      const getNeuOwnerStats = (field) => {
        const counts = {};
        let ownerIssuesCount = 0;

        neuTasks.forEach(t => {
          const resps = Array.isArray(t.responsible) ? t.responsible : (typeof t.responsible === 'string' ? t.responsible.split(',').map(s => s.trim()) : []);
          const vals = Array.isArray(t[field]) ? t[field] : (typeof t[field] === 'string' ? t[field].split(',').map(s => s.trim()) : []);
          
          const max = Math.max(resps.length, vals.length);
          for (let i = 0; i < max; i++) {
            const resp = (resps[i] || resps[0] || 'Unknown').trim();
            if (resp !== owner) continue;
            
            const val = (vals[i] || vals[0] || 'Unknown').trim();
            counts[val] = (counts[val] || 0) + 1;
            ownerIssuesCount++;
          }
        });
        
        return Object.entries(counts).map(([name, count]) => ({
          Name: name,
          Count: count,
          Percentage: ownerIssuesCount > 0 ? `${((count / ownerIssuesCount) * 100).toFixed(1)}%` : "0%"
        })).sort((a, b) => b.Count - a.Count);
      };

      const hierarchicalTreeData = getHierarchicalRCA(neuTasks, owner);
      const rcSummary = getNeuOwnerStats('rootCause');
      const itns = getNeuOwnerStats('itnRelated');
      const subs = getNeuOwnerStats('relatedToSubscription');

      const tableStartR = neuCurrentR + 2;
      const nextR = addHierarchicalRCA(wsNeuSpecial, hierarchicalTreeData, XLSX.utils.encode_cell({ r: tableStartR, c: 0 }), "ROOT CAUSE BREAKDOWN (NEU)", "D97706");
      addTableToSheet(wsNeuSpecial, rcSummary, XLSX.utils.encode_cell({ r: tableStartR, c: 7 }), "ROOT CAUSE SUMMARY (NEU)", "92400E");
      addTableToSheet(wsNeuSpecial, itns, XLSX.utils.encode_cell({ r: tableStartR, c: 11 }), "ITN RELATED (NEU)", "B45309");
      addTableToSheet(wsNeuSpecial, subs, XLSX.utils.encode_cell({ r: tableStartR, c: 15 }), "SUBSCRIPTION (NEU)", "92400E");

      neuCurrentR = Math.max(nextR, tableStartR + Math.max(rcSummary.length, itns.length, subs.length) + 2) + 5;

      // ── Raw data breakdown tables — OWNER: REACH only ───────────────────────
      if (owner.toLowerCase() === 'reach') {
        const reachNeuTasks = neuTasks.filter(t => {
          const resps = Array.isArray(t.responsible)
            ? t.responsible
            : (typeof t.responsible === 'string' ? t.responsible.split(',').map(s => s.trim()) : []);
          return resps.some(r => r.trim().toLowerCase() === 'reach');
        });

        const reachNoAccTasks = reachNeuTasks.filter(t => !t.teamAccountability?.includes('Yes'));
        const reachYesAccTasks = reachNeuTasks.filter(t => t.teamAccountability?.includes('Yes'));

        const buildReachRawRows = (tasks) => tasks.map(task => ({
          'SLID': task.slid || 'N/A',
          'Request Number': task.requestNumber || 'N/A',
          'Status': task.status || 'N/A',
          'Team Accountability': task.teamAccountability || 'N/A',
          'Q1-Score': task.evaluationScore !== null ? task.evaluationScore : 'N/A',
          'Q1 - Scale Comment': task.customerFeedback || 'N/A',
          'Severity': task.priority || 'Normal',
          'Satisfaction Category': (() => {
            if (task.evaluationScore === null || task.evaluationScore === 'N/A') return 'N/A';
            const score = Number(task.evaluationScore);
            if (score <= 6) return 'Detractor';
            if (score >= 7 && score <= 8) return 'Neutral';
            if (score >= 9) return 'Promoter';
            return 'N/A';
          })(),
          'Customer Name': task.customerName || 'N/A',
          'Contact Number': task.contactNumber || 'N/A',
          'Governorate': task.governorate || 'N/A',
          'District': task.district || 'N/A',
          'Operation': task.operation || 'N/A',
          'Tariff Name': task.tarrifName || 'N/A',
          'Validation Status': task.validationStatus || 'Not validated',
          'Reason': Array.isArray(task.reason) ? task.reason.join(', ') : (task.reason || 'N/A'),
          'Sub-Reason': Array.isArray(task.subReason) ? task.subReason.join(', ') : (task.subReason || 'N/A'),
          'Root Cause': Array.isArray(task.rootCause) ? task.rootCause.join(', ') : (task.rootCause || 'N/A'),
          'ITN Related': Array.isArray(task.itnRelated) ? task.itnRelated.join(', ') : (task.itnRelated || 'N/A'),
          'Subscription Related': Array.isArray(task.relatedToSubscription) ? task.relatedToSubscription.join(', ') : (task.relatedToSubscription || 'N/A'),
          'Field Team Name': task.teamName || 'N/A',
          'Request Date': task.contractDate ? format(new Date(task.contractDate), 'yyyy-MM-dd') : 'N/A',
          'PIS Date': task.pisDate ? format(new Date(task.pisDate), 'yyyy-MM-dd') : 'N/A',
          'Interview Date': task.interviewDate ? format(new Date(task.interviewDate), 'yyyy-MM-dd') : 'N/A',
          'Close Date': task.closeDate ? format(new Date(task.closeDate), 'yyyy-MM-dd') : 'N/A',
        }));

        const rawNoAccData = buildReachRawRows(reachNoAccTasks);
        const rawYesAccData = buildReachRawRows(reachYesAccTasks);

        // Section separator header
        const rawSectionTitleR = neuCurrentR;
        const rawSectionTitleCell = XLSX.utils.encode_cell({ r: rawSectionTitleR, c: 0 });
        wsNeuSpecial[rawSectionTitleCell] = {
          v: 'REACH RAW DATA BREAKDOWN — BY TEAM ACCOUNTABILITY',
          t: 's',
          s: { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '78350f' } }, alignment: { horizontal: 'center', vertical: 'center' } }
        };
        if (!wsNeuSpecial['!merges']) wsNeuSpecial['!merges'] = [];
        wsNeuSpecial['!merges'].push({ s: { r: rawSectionTitleR, c: 0 }, e: { r: rawSectionTitleR, c: 24 } });

        // Table 1: Team Accountability = No
        const noAccTitleR = rawSectionTitleR + 2;
        const noAccTitleCell = XLSX.utils.encode_cell({ r: noAccTitleR, c: 0 });
        wsNeuSpecial[noAccTitleCell] = {
          v: `REACH NEUTRAL RAW DATA — TEAM ACCOUNTABILITY: NO  (${rawNoAccData.length} record${rawNoAccData.length !== 1 ? 's' : ''})`,
          t: 's',
          s: { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '92400E' } }, alignment: { horizontal: 'center', vertical: 'center' } }
        };
        wsNeuSpecial['!merges'].push({ s: { r: noAccTitleR, c: 0 }, e: { r: noAccTitleR, c: 24 } });

        let noAccEndR = noAccTitleR + 1;
        if (rawNoAccData.length > 0) {
          const rawStartR = addSubsetSummary(wsNeuSpecial, reachNoAccTasks, noAccTitleR + 2, "92400E", "B45309");
          XLSX.utils.sheet_add_json(wsNeuSpecial, rawNoAccData, { origin: XLSX.utils.encode_cell({ r: rawStartR, c: 0 }), skipHeader: false });
          const noAccKeys = Object.keys(rawNoAccData[0]);
          applyHeaderStyle(wsNeuSpecial, { s: { r: rawStartR, c: 0 }, e: { r: rawStartR, c: noAccKeys.length - 1 } }, 'B45309');
          applyDataRowStyle(wsNeuSpecial, { s: { r: rawStartR, c: 0 }, e: { r: rawStartR + rawNoAccData.length, c: noAccKeys.length - 1 } });
          noAccEndR = rawStartR + rawNoAccData.length;
        }

        // Table 2: Team Accountability = Yes
        const yesAccTitleR = noAccEndR + 3;
        const yesAccTitleCell = XLSX.utils.encode_cell({ r: yesAccTitleR, c: 0 });
        wsNeuSpecial[yesAccTitleCell] = {
          v: `REACH NEUTRAL RAW DATA — TEAM ACCOUNTABILITY: YES  (${rawYesAccData.length} record${rawYesAccData.length !== 1 ? 's' : ''})`,
          t: 's',
          s: { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '14532D' } }, alignment: { horizontal: 'center', vertical: 'center' } }
        };
        wsNeuSpecial['!merges'].push({ s: { r: yesAccTitleR, c: 0 }, e: { r: yesAccTitleR, c: 24 } });

        let yesAccEndR = yesAccTitleR + 1;
        if (rawYesAccData.length > 0) {
          const rawStartR = addSubsetSummary(wsNeuSpecial, reachYesAccTasks, yesAccTitleR + 2, "14532D", "166534");
          XLSX.utils.sheet_add_json(wsNeuSpecial, rawYesAccData, { origin: XLSX.utils.encode_cell({ r: rawStartR, c: 0 }), skipHeader: false });
          const yesAccKeys = Object.keys(rawYesAccData[0]);
          applyHeaderStyle(wsNeuSpecial, { s: { r: rawStartR, c: 0 }, e: { r: rawStartR, c: yesAccKeys.length - 1 } }, '166534');
          applyDataRowStyle(wsNeuSpecial, { s: { r: rawStartR, c: 0 }, e: { r: rawStartR + rawYesAccData.length, c: yesAccKeys.length - 1 } });
          yesAccEndR = rawStartR + rawYesAccData.length;
        }

        neuCurrentR = yesAccEndR + 5;
      }
    });
    
    wsNeuSpecial['!cols'] = Array(25).fill({ wch: 15 });
    wsNeuSpecial['!cols'][0] = { wch: 20 };  // SLID / Reason
    wsNeuSpecial['!cols'][1] = { wch: 8 };   // Total / Request Number
    wsNeuSpecial['!cols'][2] = { wch: 22 };  // Sub-Reason / Status
    wsNeuSpecial['!cols'][3] = { wch: 8 };   // Cases / Team Accountability
    wsNeuSpecial['!cols'][4] = { wch: 28 };  // RC / Q1-Score
    wsNeuSpecial['!cols'][5] = { wch: 55 };  // Cases / Q1 - Scale Comment
    wsNeuSpecial['!cols'][6] = { wch: 12 };  // Severity
    wsNeuSpecial['!cols'][7] = { wch: 20 };  // RC Summary / Satisfaction Category
    wsNeuSpecial['!cols'][8] = { wch: 22 };  // Customer Name
    wsNeuSpecial['!cols'][9] = { wch: 15 };  // Contact Number
    wsNeuSpecial['!cols'][10] = { wch: 18 }; // Governorate
    wsNeuSpecial['!cols'][11] = { wch: 18 }; // District
    wsNeuSpecial['!cols'][12] = { wch: 18 }; // Operation
    wsNeuSpecial['!cols'][13] = { wch: 18 }; // Tariff Name
    wsNeuSpecial['!cols'][14] = { wch: 16 }; // Validation Status
    wsNeuSpecial['!cols'][15] = { wch: 25 }; // Reason (raw)
    wsNeuSpecial['!cols'][16] = { wch: 25 }; // Sub-Reason (raw)
    wsNeuSpecial['!cols'][17] = { wch: 28 }; // Root Cause (raw)
    wsNeuSpecial['!cols'][18] = { wch: 18 }; // ITN Related
    wsNeuSpecial['!cols'][19] = { wch: 22 }; // Subscription Related
    wsNeuSpecial['!cols'][20] = { wch: 22 }; // Field Team Name
    wsNeuSpecial['!cols'][21] = { wch: 14 }; // Request Date
    wsNeuSpecial['!cols'][22] = { wch: 14 }; // PIS Date
    wsNeuSpecial['!cols'][23] = { wch: 14 }; // Interview Date
    wsNeuSpecial['!cols'][24] = { wch: 14 }; // Close Date
    fixSheetRange(wsNeuSpecial);

    XLSX.utils.book_append_sheet(workbook, wsNeuSpecial, 'Neutral Special Analytics');


    // 4. Team Performance Sheet
    let fieldTeams = [];
    try {
      // Inline fetch for field teams to compute Team Performance logic
      const { data } = await api.get('/field-teams/get-field-teams');
      fieldTeams = data || [];
    } catch (e) {
      console.error("Failed to fetch field teams for export", e);
    }

    const teamPerfData = [];
    const cohortAggregates = {};
    const trainingAggregates = { 
      'Trained': { Count: 0, Tasks: 0, Reach: 0, DetReach: 0 }, 
      'Untrained': { Count: 0, Tasks: 0, Reach: 0, DetReach: 0 } 
    };

    const globalTotalAcc = filteredTasks.filter(t => t.teamAccountability?.includes("Yes")).length;
    const globalDetAcc = filteredTasks.filter(t => {
      const score = t.evaluationScore || 0;
      const normalized = score <= 10 ? score * 10 : score;
      return normalized > 0 && normalized <= 60 && t.teamAccountability?.includes("Yes");
    }).length;
    
    // Helpers for Team Performance
    const fieldContainsReach = (value) => {
      if (!value) return false;
      const normalizeText = (v) => Array.isArray(v) ? v.join(' ') : String(v);
      if (Array.isArray(value)) return value.some(v => normalizeText(v).toLowerCase().includes('reach'));
      return normalizeText(value).toLowerCase().includes('reach');
    };

    const getCohortLabel = (team) => {
      if (!team) return 'Unknown';
      if (team.cohort) return team.cohort;
      const isNewToInstallation = !!team.isNewToInstallation;
      const isNewToActivation = !!team.isNewToActivation;
      if (!isNewToInstallation && !isNewToActivation) return 'Expert';
      if (isNewToInstallation && !isNewToActivation) return 'New to Installation';
      if (!isNewToInstallation && isNewToActivation) return 'New to Activation';
      if (isNewToInstallation && isNewToActivation) return 'New to Installation & Activation';
      return 'Unknown';
    };

    // Group tasks by teamName
    const teamStatsMap = {};
    filteredTasks.forEach(t => {
      const teamName = t.teamName || 'Unknown Team';
      if (!teamStatsMap[teamName]) {
         teamStatsMap[teamName] = { teamName, tasks: [] };
      }
      teamStatsMap[teamName].tasks.push(t);
    });
    
    Object.values(teamStatsMap).forEach(ts => {
       const teamDoc = fieldTeams.find(ft => {
         const t1 = (ft.teamName || '').trim().replace(/\s+/g, ' ').toLowerCase();
         const t2 = (ts.teamName || '').trim().replace(/\s+/g, ' ').toLowerCase();
         return t1 === t2;
       });
       const sessions = Array.isArray(teamDoc?.sessionHistory) ? teamDoc.sessionHistory : [];
       const datedSessions = sessions.filter(s => s?.sessionDate).map(s => new Date(s.sessionDate)).filter(d => !Number.isNaN(d.getTime())).sort((a, b) => b - a);
       const latestSessionDate = datedSessions.length > 0 ? datedSessions[0] : null;
       const trained = !!latestSessionDate;

       const totalTasks = ts.tasks.length;
       const reachCount = ts.tasks.filter(t => t.teamAccountability?.includes("Yes")).length;
       
       const teamDetractors = ts.tasks.filter(t => {
         const score = t.evaluationScore;
          if (score === null || score === 'N/A') return false;
         const normalized = score <= 10 ? score * 10 : score;
         return normalized >= 0 && normalized <= 60;
       }).length;
       const teamNeutrals = ts.tasks.filter(t => {
         const score = t.evaluationScore;
          if (score === null || score === 'N/A') return false;
         const normalized = score <= 10 ? score * 10 : score;
         return normalized > 60 && normalized <= 80;
       }).length;
       
       const reachDetractors = ts.tasks.filter(t => {
         const score = t.evaluationScore;
          if (score === null || score === 'N/A') return false;
         const normalized = score <= 10 ? score * 10 : score;
         return normalized >= 0 && normalized <= 60 && t.teamAccountability?.includes("Yes");
       }).length;
       const reachNeutrals = ts.tasks.filter(t => {
         const score = t.evaluationScore;
          if (score === null || score === 'N/A') return false;
         const normalized = score <= 10 ? score * 10 : score;
         return normalized > 60 && normalized <= 80 && t.teamAccountability?.includes("Yes");
       }).length;

       // Aggregate Cohort Stats
       const cohort = getCohortLabel(teamDoc);
       if (!cohortAggregates[cohort]) {
         cohortAggregates[cohort] = { Cohort: cohort, 'Total Teams': 0, 'Total Tasks': 0, 'Total Acc.': 0, 'Acc. Det.': 0, 'Acc. Neu.': 0 };
       }
       cohortAggregates[cohort]['Total Teams'] += 1;
       cohortAggregates[cohort]['Total Tasks'] += totalTasks;
       cohortAggregates[cohort]['Total Acc.'] += reachCount;
       cohortAggregates[cohort]['Acc. Det.'] += reachDetractors;
       cohortAggregates[cohort]['Acc. Neu.'] += reachNeutrals;

       // Aggregate Training Stats
       const trKey = trained ? 'Trained' : 'Untrained';
       trainingAggregates[trKey].Count += 1;
       trainingAggregates[trKey].Tasks += totalTasks;
       trainingAggregates[trKey].Reach += reachCount;
       trainingAggregates[trKey].DetReach += reachDetractors;


       let postSessionTotal = 0;
       let postSessionDetractors = 0;
       let postSessionNeutrals = 0;
       let postSessionReach = 0;
       let postSessionReachDetractors = 0;
       let postSessionReachNeutrals = 0;
       let postSessionOwnerReachDetractors = 0;
       let postSessionOwnerReachNeutrals = 0;
       let improvementRate = 0;
       
       if (trained) {
           const postTasks = ts.tasks.filter(t => {
               const date = t.interviewDate ? new Date(t.interviewDate) : (t.pisDate ? new Date(t.pisDate) : (t.createdAt ? new Date(t.createdAt) : null));
               return date && date > latestSessionDate;
           });
           
           postSessionTotal = postTasks.length;
           postSessionDetractors = postTasks.filter(t => {
             const score = t.evaluationScore;
          if (score === null || score === 'N/A') return false;
             const normalized = score <= 10 ? score * 10 : score;
             return normalized >= 0 && normalized <= 60;
           }).length;
           postSessionNeutrals = postTasks.filter(t => {
             const score = t.evaluationScore;
          if (score === null || score === 'N/A') return false;
             const normalized = score <= 10 ? score * 10 : score;
             return normalized > 60 && normalized <= 80;
           }).length;
           
           postSessionReach = postTasks.filter(t => t.teamAccountability?.includes("Yes")).length;
           postSessionReachDetractors = postTasks.filter(t => {
             const score = t.evaluationScore;
          if (score === null || score === 'N/A') return false;
             const normalized = score <= 10 ? score * 10 : score;
             return normalized >= 0 && normalized <= 60 && t.teamAccountability?.includes("Yes");
           }).length;
           postSessionReachNeutrals = postTasks.filter(t => {
             const score = t.evaluationScore;
          if (score === null || score === 'N/A') return false;
             const normalized = score <= 10 ? score * 10 : score;
             return normalized > 60 && normalized <= 80 && t.teamAccountability?.includes("Yes");
           }).length;

           postSessionOwnerReachDetractors = postTasks.filter(t => {
             const score = t.evaluationScore;
          if (score === null || score === 'N/A') return false;
             const normalized = score <= 10 ? score * 10 : score;
             return normalized >= 0 && normalized <= 60 && fieldContainsReach(t.responsible);
           }).length;
           postSessionOwnerReachNeutrals = postTasks.filter(t => {
             const score = t.evaluationScore;
          if (score === null || score === 'N/A') return false;
             const normalized = score <= 10 ? score * 10 : score;
             return normalized > 60 && normalized <= 80 && fieldContainsReach(t.responsible);
           }).length;

           // Improvement Rate Logic
           const yearStart = new Date(latestSessionDate.getFullYear(), 0, 1);
           const daysBefore = Math.max(1, Math.ceil((latestSessionDate - yearStart) / (1000 * 60 * 60 * 24)));
           const daysAfter = Math.max(1, Math.ceil((new Date() - latestSessionDate) / (1000 * 60 * 60 * 24)));
           
           const tasksBefore = ts.tasks.filter(t => {
               const date = t.interviewDate ? new Date(t.interviewDate) : (t.pisDate ? new Date(t.pisDate) : null);
               return date && date >= yearStart && date < latestSessionDate;
           }).length;
           
           const avgBefore = tasksBefore / daysBefore;
           const avgAfter = postSessionTotal / daysAfter;
           
           if (avgBefore > 0) {
               improvementRate = Math.round(((avgBefore - avgAfter) / avgBefore) * 100);
           }
       }

       const latestPisDate = ts.tasks.length > 0 
         ? ts.tasks.filter(t => t.pisDate).map(t => new Date(t.pisDate)).filter(d => !isNaN(d.getTime())).sort((a, b) => b - a)[0]
         : null;

       teamPerfData.push({
           'Team Name': ts.teamName,
           'Cohort': getCohortLabel(teamDoc),
           'Total Tasks': totalTasks,
           'Acc. %': totalTasks > 0 ? `${Math.round((reachCount / totalTasks) * 100)}%` : '0%',
           'Acc. Share %': globalTotalAcc > 0 ? `${Math.round((reachCount / globalTotalAcc) * 100)}%` : '0%',
           'Team Det.': teamDetractors,
           'Team Neu.': teamNeutrals,
           'Total Acc.': reachCount,
           'Acc. Det.': reachDetractors,
           'Acc. Neu.': reachNeutrals,
           'Latest Session': latestSessionDate ? format(latestSessionDate, 'dd/MM/yyyy') : 'No session',
           'Post Total': postSessionTotal,
           'Post Det.': postSessionDetractors,
           'Post Neu.': postSessionNeutrals,
           'Post Reach Det.': postSessionOwnerReachDetractors,
           'Post Reach Neu.': postSessionOwnerReachNeutrals,
           'Post Acc.': postSessionReach,
           'Post Acc. Det.': postSessionReachDetractors,
           'Post Acc. Neu.': postSessionReachNeutrals,
           'Post Acc. %': postSessionTotal > 0 ? `${Math.round((postSessionReach / postSessionTotal) * 100)}%` : '0%',
           'Improve %': trained ? (improvementRate >= 0 ? `+${improvementRate}%` : `${improvementRate}%`) : 'N/A',
           'After Latest': postSessionTotal,
           'Latest PIS': latestPisDate ? format(latestPisDate, 'dd/MM/yyyy') : '-'
       });
    });

    teamPerfData.sort((a, b) => b['Total Tasks'] - a['Total Tasks']);

    const wsTeamPerf = XLSX.utils.aoa_to_sheet([[`TEAM ACCOUNTABILITY & PERFORMANCE ANALYTICS - Period: ${periodStr}`]]);
    wsTeamPerf['A1'] = { v: `TEAM ACCOUNTABILITY & PERFORMANCE ANALYTICS - Period: ${periodStr}`, t: 's', s: { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4F46E5" } }, alignment: { horizontal: "center", vertical: "center" } } };
    if (!wsTeamPerf['!merges']) wsTeamPerf['!merges'] = [];
    wsTeamPerf['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 20 } });

    // 1. Cohort Summary Table

    const cohortTableData = Object.values(cohortAggregates).map(c => ({
       Cohort: c.Cohort,
       'Total Teams': c['Total Teams'],
       'Total Tasks': c['Total Tasks'],
       'Total Acc.': c['Total Acc.'],
       'Acc. Det.': c['Acc. Det.'],
       'Acc. Neu.': c['Acc. Neu.'],
       'Acc. %': c['Total Tasks'] > 0 ? `${Math.round((c['Total Acc.'] / c['Total Tasks']) * 100)}%` : '0%',
       'Acc. Share %': globalTotalAcc > 0 ? `${Math.round((c['Total Acc.'] / globalTotalAcc) * 100)}%` : '0%'
    })).sort((a, b) => b['Total Tasks'] - a['Total Tasks']);
    
    // 1.5 Detractor Cohort Summary
    const detCohortTableData = Object.values(cohortAggregates).map(c => ({
       Cohort: c.Cohort,
       'Acc. Det.': c['Acc. Det.'],
       'Det. Share %': globalDetAcc > 0 ? `${Math.round((c['Acc. Det.'] / globalDetAcc) * 100)}%` : '0%'
    })).sort((a, b) => b['Acc. Det.'] - a['Acc. Det.']);

    XLSX.utils.sheet_add_aoa(wsTeamPerf, [["COHORT ACCOUNTABILITY SUMMARY"]], { origin: "A3" });
    wsTeamPerf['A3'] = { v: "COHORT ACCOUNTABILITY SUMMARY", t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1F2937" } }, alignment: { horizontal: "center" } } };
    wsTeamPerf['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 7 } });
    XLSX.utils.sheet_add_json(wsTeamPerf, cohortTableData, { origin: "A4", skipHeader: false });
    applyHeaderStyle(wsTeamPerf, { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } }, "4B5563");
    applyDataRowStyle(wsTeamPerf, { s: { r: 3, c: 0 }, e: { r: 3 + cohortTableData.length, c: 7 } });

    XLSX.utils.sheet_add_aoa(wsTeamPerf, [["COHORT DETRACTOR ANALYSIS"]], { origin: "A12" });
    wsTeamPerf['A12'] = { v: "COHORT DETRACTOR ANALYSIS", t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "DC2626" } }, alignment: { horizontal: "center" } } };
    wsTeamPerf['!merges'].push({ s: { r: 11, c: 0 }, e: { r: 11, c: 2 } });
    XLSX.utils.sheet_add_json(wsTeamPerf, detCohortTableData, { origin: "A13", skipHeader: false });
    applyHeaderStyle(wsTeamPerf, { s: { r: 12, c: 0 }, e: { r: 12, c: 2 } }, "B91C1C");
    applyDataRowStyle(wsTeamPerf, { s: { r: 12, c: 0 }, e: { r: 12 + detCohortTableData.length, c: 2 } });

    // 2. Training Summary Table
    const trainingTableData = Object.entries(trainingAggregates).map(([status, data]) => ({
       'Training Status': status,
       'Team Count': data.Count,
       'Total Tasks': data.Tasks,
       'Total Acc.': data.Reach,
       'Acc. %': data.Tasks > 0 ? `${Math.round((data.Reach / data.Tasks) * 100)}%` : '0%',
       'Acc. Share %': globalTotalAcc > 0 ? `${Math.round((data.Reach / globalTotalAcc) * 100)}%` : '0%'
    }));

    // 2.5 Training Detractor Summary
    const globalDetReach = Object.values(trainingAggregates).reduce((sum, d) => sum + d.Reach, 0); // This is total reach, wait
    // We need detractor reach
    const trainingDetTableData = Object.entries(trainingAggregates).map(([status, data]) => {
      // Need to find detractor reach in aggregates? 
      // I should have added DetReach to trainingAggregates
      return {
        'Training Status': status,
        'Acc. Det.': data.DetReach || 0,
        'Det. Share %': globalDetAcc > 0 ? `${Math.round(((data.DetReach || 0) / globalDetAcc) * 100)}%` : '0%'
      };
    });

    XLSX.utils.sheet_add_aoa(wsTeamPerf, [["TRAINING STATUS OVERVIEW"]], { origin: "J3" });
    wsTeamPerf['J3'] = { v: "TRAINING STATUS OVERVIEW", t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "059669" } }, alignment: { horizontal: "center" } } };
    wsTeamPerf['!merges'].push({ s: { r: 2, c: 9 }, e: { r: 2, c: 14 } });
    XLSX.utils.sheet_add_json(wsTeamPerf, trainingTableData, { origin: "J4", skipHeader: false });
    applyHeaderStyle(wsTeamPerf, { s: { r: 3, c: 9 }, e: { r: 3, c: 14 } }, "4B5563");
    applyDataRowStyle(wsTeamPerf, { s: { r: 3, c: 9 }, e: { r: 3 + trainingTableData.length, c: 14 } });

    XLSX.utils.sheet_add_aoa(wsTeamPerf, [["TRAINING DETRACTOR ANALYSIS"]], { origin: "J12" });
    wsTeamPerf['J12'] = { v: "TRAINING DETRACTOR ANALYSIS", t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "EA580C" } }, alignment: { horizontal: "center" } } };
    wsTeamPerf['!merges'].push({ s: { r: 11, c: 9 }, e: { r: 11, c: 11 } });
    XLSX.utils.sheet_add_json(wsTeamPerf, trainingDetTableData, { origin: "J13", skipHeader: false });
    applyHeaderStyle(wsTeamPerf, { s: { r: 12, c: 9 }, e: { r: 12, c: 11 } }, "C2410C");
    applyDataRowStyle(wsTeamPerf, { s: { r: 12, c: 9 }, e: { r: 12 + trainingDetTableData.length, c: 11 } });

    // 3. Main Detailed Table
    const mainTableStartR = 22; // Hardcoded space for 4 summary tables
    const titleCell = XLSX.utils.encode_cell({ r: mainTableStartR - 1, c: 0 });
    XLSX.utils.sheet_add_aoa(wsTeamPerf, [["DETAILED TEAM PERFORMANCE & SESSION COMPARISON"]], { origin: titleCell });
    wsTeamPerf[titleCell] = { v: "DETAILED TEAM PERFORMANCE & SESSION COMPARISON", t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "7C3AED" } }, alignment: { horizontal: "center" } } };
    wsTeamPerf['!merges'].push({ s: { r: mainTableStartR - 1, c: 0 }, e: { r: mainTableStartR - 1, c: 20 } });
    
    XLSX.utils.sheet_add_json(wsTeamPerf, teamPerfData, { origin: `A${mainTableStartR + 1}`, skipHeader: false });
    
    const teamPerfKeysCount = Object.keys(teamPerfData[0] || {}).length;
    applyHeaderStyle(wsTeamPerf, { s: { r: mainTableStartR, c: 0 }, e: { r: mainTableStartR, c: Math.max(0, teamPerfKeysCount - 1) } });
    applyDataRowStyle(wsTeamPerf, { s: { r: mainTableStartR, c: 0 }, e: { r: mainTableStartR + teamPerfData.length, c: Math.max(0, teamPerfKeysCount - 1) } });
    
    wsTeamPerf['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
    
    XLSX.utils.book_append_sheet(workbook, wsTeamPerf, 'Team Performance');

    // 6. Deep Raw Data Sheet
    const maxTickets = filteredTasks.reduce((max, t) => Math.max(max, (t.tickets || []).length), 0);

    const multiValueFieldsMapping = [
      { field: 'reason', label: 'Reason' },
      { field: 'subReason', label: 'Sub-Reason' },
      { field: 'rootCause', label: 'Root Cause' },
      { field: 'responsible', label: 'Owner' },
      { field: 'itnRelated', label: 'ITN Related' },
      { field: 'relatedToSubscription', label: 'Related to Subscription' }
    ];

    const fieldMaxCounts = {};
    multiValueFieldsMapping.forEach(({ field }) => {
      fieldMaxCounts[field] = filteredTasks.reduce((max, t) => {
        const val = t[field];
        if (Array.isArray(val)) return Math.max(max, val.length);
        if (typeof val === 'string' && val.trim()) return Math.max(max, val.split(',').length);
        return Math.max(max, val ? 1 : 0);
      }, 0);
    });

    const rawData = filteredTasks.map(task => {
      const baseData = {
        'SLID': task.slid || 'N/A',
        'Request Number': task.requestNumber || 'N/A',
        'Status': task.status || 'N/A',
        'Severity': task.priority || 'Normal',
        'Operation': task.operation || 'N/A',
        'Tariff Name': task.tarrifName || 'N/A',
        'Validation Status': task.validationStatus || 'Not validated',
        'Customer Name': task.customerName || 'N/A',
        'Customer Type': task.customerType || 'N/A',
        'Contact Number': task.contactNumber || 'N/A',
        'Governorate': task.governorate || 'N/A',
        'District': task.district || 'N/A',
        'Q1-Score': task.evaluationScore !== null ? task.evaluationScore : 'N/A',
        'Satisfaction Category': (() => {
          if (task.evaluationScore === null || task.evaluationScore === 'N/A') return 'N/A';
          const score = Number(task.evaluationScore);
          if (score <= 6) return 'Detractor';
          if (score >= 7 && score <= 8) return 'Neutral';
          if (score >= 9) return 'Promoter';
          return 'N/A';
        })(),
        'Q1-Verbatim': task.customerFeedback || 'N/A',
        'ONT Type': task.ontType || 'N/A',
        'Free Extender': task.freeExtender || 'N/A',
        'Extender Type': task.extenderType || 'N/A',
        'Extender Count': task.extenderNumber || 0,
        'GAIA Check': task.gaiaCheck || 'N/A',
        'GAIA Content': task.gaiaContent || 'N/A',
      };

      const interleavedFields = [
        { field: 'reason', label: 'Reason' },
        { field: 'subReason', label: 'Sub-Reason' },
        { field: 'rootCause', label: 'Root Cause' },
        { field: 'responsible', label: 'Owner' },
        { field: 'itnRelated', label: 'ITN Related' },
        { field: 'relatedToSubscription', label: 'Related to Subscription' }
      ];

      const maxInterleaved = interleavedFields.reduce((max, { field }) => Math.max(max, fieldMaxCounts[field]), 0);
      for (let i = 0; i < maxInterleaved; i++) {
        interleavedFields.forEach(({ field, label }) => {
          const val = task[field];
          let values = [];
          if (Array.isArray(val)) {
            values = val.map(v => String(v).trim()).filter(Boolean);
          } else if (typeof val === 'string' && val.trim()) {
            values = val.split(',').map(s => s.trim()).filter(Boolean);
          } else if (val) {
            values = [String(val).trim()];
          }
          baseData[`${label} ${i + 1}`] = values[i] || '';
        });
      }

      Object.assign(baseData, {
        'Field Team Name': task.teamName || 'N/A',
      });

      const sortedTickets = [...(task.tickets || [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      for (let i = 0; i < maxTickets; i++) {
        baseData[`Agent Note ${i + 1}`] = sortedTickets[i]?.note || '';
      }

      const ivDate = task.interviewDate ? new Date(task.interviewDate) : null;
      const pisDate = task.pisDate ? new Date(task.pisDate) : null;
      const closeDate = task.closeDate ? new Date(task.closeDate) : null;
      
      const interviewToPis = ivDate && pisDate ? Math.max(0, Math.round((ivDate - pisDate) / (1000 * 60 * 60 * 24))) : 'N/A';
      const pisToClose = pisDate && closeDate ? Math.max(0, Math.round((pisDate - closeDate) / (1000 * 60 * 60 * 24))) : 'N/A';

      const timelineData = {
        'Request Date': task.contractDate ? format(new Date(task.contractDate), 'yyyy-MM-dd') : 'N/A',
        'FE Date': task.feDate ? format(new Date(task.feDate), 'yyyy-MM-dd') : (task.appDate ? format(new Date(task.appDate), 'yyyy-MM-dd') : 'N/A'),
        'In Date (Dispatched to Cont.)': task.inDate ? format(new Date(task.inDate), 'yyyy-MM-dd') : 'N/A',
        'Close Date': task.closeDate ? format(new Date(task.closeDate), 'yyyy-MM-dd') : 'N/A',
        'PIS Date': task.pisDate ? format(new Date(task.pisDate), 'yyyy-MM-dd') : 'N/A',
        'Interview Date': task.interviewDate ? format(new Date(task.interviewDate), 'yyyy-MM-dd') : 'N/A',
        'Interview to PIS (Days)': interviewToPis,
        'PIS to Close (Days)': pisToClose,
        'Interview Week': getWeekDisplay(task.interviewDate)
      };

      return { ...baseData, ...timelineData };
    });

    const wsRaw = XLSX.utils.json_to_sheet(rawData, { origin: "A2" });
    const rawKeys = Object.keys(rawData[0] || {});
    addTitle(wsRaw, `DEEP RAW AUDIT DATA - ${periodStr}`, Math.max(0, rawKeys.length - 1));
    applyHeaderStyle(wsRaw, { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(0, rawKeys.length - 1) } });
    applyDataRowStyle(wsRaw, { s: { r: 1, c: 0 }, e: { r: 1 + rawData.length, c: Math.max(0, rawKeys.length - 1) } });
    
    wsRaw['!cols'] = Array(rawKeys.length).fill({ wch: 15 });
    const getColIndex = (name) => rawKeys.indexOf(name);
    if (getColIndex('SLID') !== -1) wsRaw['!cols'][getColIndex('SLID')] = { wch: 15 };
    if (getColIndex('Customer Name') !== -1) wsRaw['!cols'][getColIndex('Customer Name')] = { wch: 25 };
    if (getColIndex('Q1-Verbatim') !== -1) wsRaw['!cols'][getColIndex('Q1-Verbatim')] = { wch: 60 };
    if (getColIndex('Customer Type') !== -1) wsRaw['!cols'][getColIndex('Customer Type')] = { wch: 10 };
    if (getColIndex('ONT Type') !== -1) wsRaw['!cols'][getColIndex('ONT Type')] = { wch: 10 };

    XLSX.utils.book_append_sheet(workbook, wsRaw, 'Deep Raw Data');

    // 7. YTD Analysis Sheet
    const allWeeksYTD = generateWeekRanges(allTasks, settings);
    const displayWeeks = allWeeksYTD;
    const weeklyData = groupDataByWeek(allTasks, displayWeeks, settings, samplesTokenData);

    const ytdTableData = displayWeeks.map((weekKey, index) => {
      const stats = weeklyData[weekKey] || { Promoters: 0, Detractors: 0, Neutrals: 0, sampleSize: 0 };
      const prevWeekKey = index > 0 ? displayWeeks[index - 1] : null;
      const prevStats = prevWeekKey ? weeklyData[prevWeekKey] : null;

      const nps = stats.Promoters - stats.Detractors;
      const prevNps = prevStats ? (prevStats.Promoters - prevStats.Detractors) : null;
      const delta = prevNps !== null ? (nps - prevNps) : "";

      const proDelta = prevStats ? (stats.Promoters - prevStats.Promoters) : "";
      const detDelta = prevStats ? (stats.Detractors - prevStats.Detractors) : "";
      const neuDelta = prevStats ? (stats.Neutrals - prevStats.Neutrals) : "";

      return {
        'Week': weekKey,
        'NPS Score': nps,
        'Δ': delta,
        'Target Status': nps >= 67 ? 'Met Target' : 'Below Target',
        'Samples Count': stats.sampleSize,
        'Promoters %': `${stats.Promoters}.00%`,
        'Promoters Δ': proDelta !== "" ? (proDelta >= 0 ? `+${proDelta}` : proDelta) : "",
        'Detractors %': `${stats.Detractors}.00%`,
        'Detractors Δ': detDelta !== "" ? (detDelta >= 0 ? `+${detDelta}` : detDelta) : "",
        'Passives %': `${stats.Neutrals}.00%`,
        'Passives Δ': neuDelta !== "" ? (neuDelta >= 0 ? `+${neuDelta}` : neuDelta) : ""
      };
    });

    const wsYTD = XLSX.utils.aoa_to_sheet([["YTD Performance Breakdown (Full Year)"]]);
    wsYTD['A1'].s = { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "3b82f6" } }, alignment: { horizontal: "center", vertical: "center" } };
    wsYTD['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }];
    XLSX.utils.sheet_add_json(wsYTD, ytdTableData, { origin: "A2", skipHeader: false });

    applyHeaderStyle(wsYTD, { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }, "1f2937");
    
    for (let r = 0; r < ytdTableData.length; r++) {
      const rowIndex = r + 2;
      const npsValue = ytdTableData[r]['NPS Score'];
      const targetStatus = ytdTableData[r]['Target Status'];

      const weekCell = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
      if (wsYTD[weekCell]) wsYTD[weekCell].s = { font: { bold: true }, alignment: { horizontal: "center" }, border: { bottom: { style: 'thin', color: { rgb: 'E5E7EB' } } } };

      const npsCell = XLSX.utils.encode_cell({ r: rowIndex, c: 1 });
      if (wsYTD[npsCell]) {
        wsYTD[npsCell].s = {
          font: { bold: true, color: { rgb: npsValue >= 67 ? "059669" : "DC2626" } },
          fill: { fgColor: { rgb: npsValue >= 67 ? "ECFDF5" : "FEF2F2" } },
          alignment: { horizontal: "center" },
          border: { bottom: { style: 'thin', color: { rgb: 'E5E7EB' } } }
        };
      }

      const deltaCell = XLSX.utils.encode_cell({ r: rowIndex, c: 2 });
      if (wsYTD[deltaCell]) {
        const deltaVal = ytdTableData[r]['Δ'];
        wsYTD[deltaCell].s = {
          font: { bold: true, color: { rgb: deltaVal > 0 ? "059669" : (deltaVal < 0 ? "DC2626" : "000000") } },
          alignment: { horizontal: "center" },
          border: { bottom: { style: 'thin', color: { rgb: 'E5E7EB' } } }
        };
      }

      const statusCell = XLSX.utils.encode_cell({ r: rowIndex, c: 3 });
      if (wsYTD[statusCell]) {
        wsYTD[statusCell].s = {
          font: { bold: true, color: { rgb: targetStatus === 'Met Target' ? "059669" : "DC2626" } },
          alignment: { horizontal: "center" },
          border: { bottom: { style: 'thin', color: { rgb: 'E5E7EB' } } }
        };
      }

      [5, 7, 9].forEach(c => {
        const cell = XLSX.utils.encode_cell({ r: rowIndex, c });
        if (wsYTD[cell]) wsYTD[cell].s = { alignment: { horizontal: "center" }, border: { bottom: { style: 'thin', color: { rgb: 'E5E7EB' } } } };
      });
      
      [6, 8, 10].forEach(c => {
        const cell = XLSX.utils.encode_cell({ r: rowIndex, c });
        if (wsYTD[cell]) {
          const val = wsYTD[cell].v;
          wsYTD[cell].s = {
            font: { color: { rgb: val.toString().startsWith('+') ? "059669" : (val.toString().startsWith('-') ? "DC2626" : "000000") } },
            alignment: { horizontal: "center" },
            border: { bottom: { style: 'thin', color: { rgb: 'E5E7EB' } } }
          };
        }
      });
    }

    wsYTD['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, wsYTD, 'YTD Analysis');

    // 8. Monthly Performance Summary Sheet
    const monthlyData = groupDataByMonth(allTasks, null, settings, samplesTokenData);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Detailed monthly performance helper
    const getMonthlyCounts = (field) => {
      const fieldData = {};
      allTasks.forEach(t => {
        if (!t.interviewDate) return;
        const monthInfo = getMonthNumber(t.interviewDate, settings);
        if (!monthInfo) return;
        const monthKey = monthInfo.key;
        const val = t[field];
        let values = [];
        if (Array.isArray(val)) {
          values = val.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
        } else if (typeof val === 'string' && val.trim()) {
          values = val.split(',').map(s => s.trim()).filter(Boolean);
        } else if (val) {
          values = [String(val).trim()];
        }
        values.forEach(v => {
          if (!fieldData[v]) fieldData[v] = {};
          fieldData[v][monthKey] = (fieldData[v][monthKey] || 0) + 1;
        });
      });
      return Object.entries(fieldData).map(([name, months]) => {
        const row = [name];
        let total = 0;
        for (let i = 1; i <= 12; i++) {
          const count = months[`Month-${i}`] || 0;
          row.push(count);
          total += count;
        }
        row.push(total);
        return row;
      }).sort((a, b) => b[13] - a[13]);
    };

    const reasonPerformance = getMonthlyCounts('reason');
    const subReasonPerformance = getMonthlyCounts('subReason');
    const ownerPerformance = getMonthlyCounts('responsible');
    const rootCausePerformance = getMonthlyCounts('rootCause');
    const monthsHeader = ["Item Name", ...monthNames.map(m => m.slice(0, 3)), "Total"];

    const monthlyTableRows = monthNames.map((name, i) => {
      const stats = monthlyData[`Month-${i + 1}`] || { Promoters: 0, Detractors: 0, Neutrals: 0, sampleSize: 0 };
      const nps = stats.Promoters - stats.Detractors;
      
      const npsTarget = 67;
      const proTarget = settings?.npsTargets?.promoters ?? 75;
      const detTarget = settings?.npsTargets?.detractors ?? 8;
      
      const npsStatus = nps >= npsTarget ? "Met" : "Below";
      const proStatus = stats.Promoters >= proTarget ? "Met" : "Below";
      const detStatus = stats.Detractors <= detTarget ? "Met" : "Below";

      return [
        name, 
        nps, `${npsTarget}%`, npsStatus,
        stats.sampleSize, 
        `${stats.Promoters}%`, `${proTarget}%`, proStatus,
        `${stats.Detractors}%`, `${detTarget}%`, detStatus,
        `${stats.Neutrals}%`
      ];
    });

    const wsCharts = XLSX.utils.aoa_to_sheet([
      ["Monthly Performance Summary"],
      ["Month", "NPS Score", "NPS Target", "NPS Status", "Samples", "Promoters %", "Promoter Target", "Promoter Status", "Detractors %", "Detractor Target", "Detractor Status", "Neutrals %"]
    ]);

    wsCharts['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }];
    wsCharts['A1'].s = { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4f46e5" } }, alignment: { horizontal: "center" } };

    XLSX.utils.sheet_add_aoa(wsCharts, monthlyTableRows, { origin: "A3" });
    applyHeaderStyle(wsCharts, { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }, "1f2937");
    applyDataRowStyle(wsCharts, { s: { r: 2, c: 0 }, e: { r: 2 + monthlyTableRows.length, c: 11 } });

    // Conditional formatting for status columns
    for (let r = 0; r < monthlyTableRows.length; r++) {
      const rowIdx = r + 2;
      const statuses = [
        { col: 3, val: monthlyTableRows[r][3] },
        { col: 7, val: monthlyTableRows[r][7] },
        { col: 10, val: monthlyTableRows[r][10] }
      ];

      statuses.forEach(s => {
        const cell = XLSX.utils.encode_cell({ r: rowIdx, c: s.col });
        if (wsCharts[cell]) {
          wsCharts[cell].s = {
            ...wsCharts[cell].s,
            font: { bold: true, color: { rgb: s.val === "Met" ? "059669" : "DC2626" } },
            fill: { fgColor: { rgb: s.val === "Met" ? "ECFDF5" : "FEF2F2" } }
          };
        }
      });
    }

    wsCharts['!cols'] = [
      { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, 
      { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }
    ];

    let currentSheetR = 17; // 2 (header) + 12 (months) + 3 (padding)

    const addDetailedMonthlyTable = (ws, data, title, startRow, colorHex) => {
      XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: `A${startRow}` });
      ws[`A${startRow}`].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: colorHex } }, alignment: { horizontal: "center" } };
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: startRow - 1, c: 0 }, e: { r: startRow - 1, c: 13 } });
      
      XLSX.utils.sheet_add_aoa(ws, [monthsHeader], { origin: `A${startRow + 1}` });
      applyHeaderStyle(ws, { s: { r: startRow, c: 0 }, e: { r: startRow, c: 13 } }, "374151");
      
      XLSX.utils.sheet_add_aoa(ws, data, { origin: `A${startRow + 2}` });
      applyDataRowStyle(ws, { s: { r: startRow + 1, c: 0 }, e: { r: startRow + 1 + data.length, c: 13 } });
      
      return startRow + data.length + 4;
    };

    currentSheetR = addDetailedMonthlyTable(wsCharts, reasonPerformance, "DETAILED REASON PERFORMANCE BY MONTH", currentSheetR, "1E3A8A");
    currentSheetR = addDetailedMonthlyTable(wsCharts, subReasonPerformance, "DETAILED SUB-REASON PERFORMANCE BY MONTH", currentSheetR, "1F2937");
    currentSheetR = addDetailedMonthlyTable(wsCharts, ownerPerformance, "DETAILED OWNER PERFORMANCE BY MONTH", currentSheetR, "0891B2");
    currentSheetR = addDetailedMonthlyTable(wsCharts, rootCausePerformance, "DETAILED ROOT CAUSE PERFORMANCE BY MONTH", currentSheetR, "4F46E5");

    // NEW: Monthly Top Categories Summary
    const monthlyTopSummary = monthNames.map((name, i) => {
      const monthKey = `Month-${i+1}`;
      const monthTasks = allTasks.filter(t => {
        if (!t.interviewDate) return false;
        const info = getMonthNumber(t.interviewDate, settings);
        return info && info.key === monthKey;
      });
      
      const getTop = (tasks, field) => {
        const counts = {};
        tasks.forEach(t => {
          const val = t[field];
          let values = [];
          if (Array.isArray(val)) values = val.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
          else if (typeof val === 'string') values = val.split(',').map(s => s.trim()).filter(Boolean);
          else if (val) values = [String(val).trim()];
          values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
        });
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        return top ? `${top[0]} (${top[1]})` : "-";
      };

      return [name, getTop(monthTasks, 'reason'), getTop(monthTasks, 'rootCause'), getTop(monthTasks, 'responsible')];
    });

    currentSheetR += 2;
    XLSX.utils.sheet_add_aoa(wsCharts, [["MONTHLY TOP CATEGORIES SUMMARY"]], { origin: `A${currentSheetR}` });
    wsCharts[`A${currentSheetR}`].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "111827" } }, alignment: { horizontal: "center" } };
    wsCharts['!merges'].push({ s: { r: currentSheetR - 1, c: 0 }, e: { r: currentSheetR - 1, c: 3 } });
    
    XLSX.utils.sheet_add_aoa(wsCharts, [["Month", "Top Reason", "Top Root Cause", "Top Owner"]], { origin: `A${currentSheetR + 1}` });
    applyHeaderStyle(wsCharts, { s: { r: currentSheetR, c: 0 }, e: { r: currentSheetR, c: 3 } }, "4B5563");
    
    XLSX.utils.sheet_add_json(wsCharts, monthlyTopSummary.map(r => ({ Month: r[0], 'Top Reason': r[1], 'Top Root Cause': r[2], 'Top Owner': r[3] })), { origin: `A${currentSheetR + 2}`, skipHeader: true });
    applyDataRowStyle(wsCharts, { s: { r: currentSheetR + 1, c: 0 }, e: { r: currentSheetR + 1 + monthlyTopSummary.length, c: 3 } });

    // NEW: Weekly Top Categories Summary
    const weeklyTopSummary = displayWeeks.map(weekKey => {
      const weekTasks = allTasks.filter(t => {
        if (!t.interviewDate) return false;
        const { key } = getWeekNumber(t.interviewDate, settings.weekStartDay, settings.week1StartDate, settings.week1EndDate, settings.startWeekNumber);
        return key === weekKey;
      });

      const getTop = (tasks, field) => {
        const counts = {};
        tasks.forEach(t => {
          const val = t[field];
          let values = [];
          if (Array.isArray(val)) values = val.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
          else if (typeof val === 'string') values = val.split(',').map(s => s.trim()).filter(Boolean);
          else if (val) values = [String(val).trim()];
          values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
        });
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        return top ? `${top[0]} (${top[1]})` : "-";
      };

      return [weekKey, getTop(weekTasks, 'reason'), getTop(weekTasks, 'rootCause'), getTop(weekTasks, 'responsible')];
    });

    currentSheetR += monthlyTopSummary.length + 5;
    XLSX.utils.sheet_add_aoa(wsCharts, [["WEEKLY TOP CATEGORIES SUMMARY"]], { origin: `A${currentSheetR}` });
    wsCharts[`A${currentSheetR}`].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "111827" } }, alignment: { horizontal: "center" } };
    wsCharts['!merges'].push({ s: { r: currentSheetR - 1, c: 0 }, e: { r: currentSheetR - 1, c: 3 } });
    
    XLSX.utils.sheet_add_aoa(wsCharts, [["Week", "Top Reason", "Top Root Cause", "Top Owner"]], { origin: `A${currentSheetR + 1}` });
    applyHeaderStyle(wsCharts, { s: { r: currentSheetR, c: 0 }, e: { r: currentSheetR, c: 3 } }, "4B5563");
    
    XLSX.utils.sheet_add_aoa(wsCharts, weeklyTopSummary, { origin: `A${currentSheetR + 2}` });
    applyDataRowStyle(wsCharts, { s: { r: currentSheetR + 1, c: 0 }, e: { r: currentSheetR + 1 + weeklyTopSummary.length, c: 3 } });

    XLSX.utils.book_append_sheet(workbook, wsCharts, 'Monthly Performance Summary');

    // 8. Save Workbook
    XLSX.writeFile(workbook, `Executive_Audit_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
  // Calculate Stats dynamically based on dashboardStats memo
  const { totalSamples, total: actualAudits, promoterRate, detractorRate, neutralRate, nps } = dashboardStats;

  // Helper to get top K items
  const getTopK = (field, k = 5) => {
    const counts = {};
    filteredTasks.forEach(t => {
      const val = t[field];
      // Distribute logic: handle arrays and comma-separated strings
      let values = [];
      if (Array.isArray(val)) {
        values = val.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
      } else if (typeof val === 'string' && val.trim()) {
        values = val.split(',').map(s => s.trim()).filter(Boolean);
      } else if (val) {
        values = [val];
      }
      values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    });

    const totalCount = Object.values(counts).reduce((acc, curr) => acc + curr, 0);

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
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
              value={loadingSamples ? "..." : totalSamples}
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
            <Button onClick={() => setDateFilter({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)), type: 'lastMonth' })} variant={dateFilter.type === 'lastMonth' ? 'contained' : 'outlined'} size="small">Last Month</Button>
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
            <MenuItem value="Completed">
              <Box display="flex" alignItems="center" gap={1}>
                <MdCheckCircle style={{ color: '#4caf50' }} />
                <span>Completed</span>
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
              <TableCell sx={{ p: '4px !important' }} />{/* Week column */}
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
              <TableCell sx={{ p: '4px !important' }} />{/* GAIA Content column */}
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
              <TableCell sx={{ p: '4px !important' }} />{/* GAIA Content column */}
              <TableCell sx={{ p: '4px !important' }} />{/* Steps */}
              <TableCell sx={{ p: '4px !important' }} />{/* Actions */}
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
            onTaskUpdated={() => setUpdateRefetchTasks(prev => prev + 1)}
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
              OJO Snags List
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
    </Box>
  );
};

export default AllTasksList;
