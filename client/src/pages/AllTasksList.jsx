import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import AppDialog from "../components/ui/AppDialog";
import SafeDeleteDialog from "../components/ui/SafeDeleteDialog";
import { bulkDelete, DELETE_PATHS } from "../api/bulkDelete";
import { TASK_COLUMNS } from "./tasks/exportTasks";
import { Link as RouterLink } from "react-router-dom";
import { MdArrowBack } from "react-icons/md";
import { alpha } from "../theme/colorFns";
import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, IconButton, Button, useMediaQuery, useTheme, Divider, TablePagination, Tooltip, Chip, MenuItem, Select, FormControl, InputLabel, Stack, Grid, Autocomplete, Accordion, AccordionSummary, AccordionDetails, LinearProgress } from '@mui/material';
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
  MdInsights,
  MdDateRange,
  MdAssignmentTurnedIn,
  MdHistory,
  MdExpandMore,
  MdBarChart,
} from 'react-icons/md';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO, format, subWeeks, subMonths, eachWeekOfInterval, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
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
import { buildOwnerIssueRows } from '../utils/ownerIssueGrouping';

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
    } catch {
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
  const [dailyOnlineSamplesData, setDailyOnlineSamplesData] = useState([]);
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

  // --- Samples Token & Daily Online Fetching ---
  const fetchAllSamplesData = async () => {
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
        }).catch(() => ({ data: [] }))
      );

      const dailyPromises = yearsToFetch.map(year =>
        api.get(`/samples-token/daily-online/${year}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        }).catch(() => ({ data: [] }))
      );

      const [responses, dailyResponses] = await Promise.all([
        Promise.all(promises),
        Promise.all(dailyPromises)
      ]);

      const allSamples = responses.flatMap(res => res.data || []);
      const allDailyOnline = dailyResponses.flatMap(res => res.data || []);
      setSamplesTokenData(allSamples);
      setDailyOnlineSamplesData(allDailyOnline);
    } catch (err) {
      console.error("Error fetching samples token / daily online data:", err);
    } finally {
      setLoadingSamples(false);
    }
  };

  useEffect(() => {
    fetchAllSamplesData();
  }, [dateFilter.start, dateFilter.end]);

  // Listen to dashboard refresh events (e.g. from SamplesTokenDialog save)
  useEffect(() => {
    const handleRefresh = () => {
      fetchAllSamplesData();
    };
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
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

  // Cumulative & Escalation Table Date Filter State
  const [CumulativeDateFilter, setCumulativeDateFilter] = useState({
    start: new Date(2026, 5, 1),
    end: new Date(),
    type: 'default'
  });
  const [tempAccStartDate, setTempAccStartDate] = useState(new Date(2026, 5, 1));
  const [tempAccEndDate, setTempAccEndDate] = useState(new Date());

  // Keep datepickers synchronized with active filter changes
  useEffect(() => {
    if (CumulativeDateFilter.start) setTempAccStartDate(CumulativeDateFilter.start);
    if (CumulativeDateFilter.end) setTempAccEndDate(CumulativeDateFilter.end);
  }, [CumulativeDateFilter]);

  useEffect(() => {
    if (dateFilter.start) setTempStartDate(dateFilter.start);
    else if (dateFilter.type === 'all') setTempStartDate(null);
    if (dateFilter.end) setTempEndDate(dateFilter.end);
    else if (dateFilter.type === 'all') setTempEndDate(null);
  }, [dateFilter]);

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









  // Chart Data Processing


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

  const todoCount = filteredTasks.filter(t => t.status === 'Todo').length;
  const inProgressCount = filteredTasks.filter(t => t.status === 'In Progress').length;
  const closedCount = filteredTasks.filter(t => t.status === 'Closed').length;


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
    } catch {
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

  const exportToExcel = async () => {
    // 1. Determine Reported Period (Filtered Dashboard Data)
    let periodStr = "All Time";
    let periodStart = '';
    let periodEnd = '';

    if (dateFilter.type !== 'all' && dateFilter.start && dateFilter.end) {
      try {
        periodStr = `${format(dateFilter.start, 'dd/MM/yyyy')} - ${format(dateFilter.end, 'dd/MM/yyyy')}`;
        periodStart = format(dateFilter.start, 'ddMMyyyy');
        periodEnd = format(dateFilter.end, 'ddMMyyyy');
      } catch {
        periodStr = "Custom Period";
      }
    } else if (filteredTasks.length > 0) {
      const dates = filteredTasks
        .map(t => t.createdAt ? new Date(t.createdAt) : null)
        .filter(d => d)
        .sort((a, b) => a - b);
      if (dates.length > 0) {
        periodStr = `${format(dates[0], 'dd/MM/yyyy')} - ${format(dates[dates.length - 1], 'dd/MM/yyyy')}`;
        periodStart = format(dates[0], 'ddMMyyyy');
        periodEnd = format(dates[dates.length - 1], 'ddMMyyyy');
      }
    }

    const getExportFileName = () => {
      const now = new Date();
      const exportDate = format(now, 'ddMMyyyy');

      if (!periodStart || !periodEnd) {
        return `NPS Analysis and Feedback - ${exportDate}.xlsx`;
      }

      return `NPS Analysis and Feedback - ${exportDate}-${periodStart}to${periodEnd}.xlsx`;
    };

    const workbook = XLSX.utils.book_new();
    const monthColorPalette = ["1E40AF", "0D9488", "7C3AED", "C026D3", "EA580C", "4B5563", "0284C7", "B45309", "059669", "4338CA", "BE123C", "374151"];

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

    const formatCommentColumnInTable = (ws, startDataR, endDataR, colIdx, colWidth = 60) => {
      if (colIdx === -1 || colIdx === undefined || !ws) return;
      if (!ws['!cols']) ws['!cols'] = [];
      if (!ws['!cols'][colIdx] || (ws['!cols'][colIdx].wch || 0) < colWidth) {
        ws['!cols'][colIdx] = { wch: colWidth };
      }

      for (let r = startDataR; r <= endDataR; r++) {
        const cellAddr = XLSX.utils.encode_cell({ r, c: colIdx });
        if (!ws[cellAddr]) continue;
        ws[cellAddr].s = ws[cellAddr].s || {};
        ws[cellAddr].s.alignment = {
          ...(ws[cellAddr].s.alignment || {}),
          horizontal: 'right',
          vertical: 'center',
          wrapText: true,
          readingOrder: 2
        };
      }
    };

    const addTitle = (ws, titleText, endCol) => {
      ws['A1'] = { v: titleText, t: 's', s: { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "7B68EE" } }, alignment: { horizontal: "center", vertical: "center" } } };
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: endCol } });
    };

    const getHierarchicalRCA = (tasks, ownerFilter = null, accFilter = null) => {
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
        const accs = normalize(t.teamAccountability);

        const max = Math.max(reasons.length, subReasons.length, rootCauses.length, resps.length, accs.length);
        for (let i = 0; i < max; i++) {
          let resp = 'Unknown';
          if (resps.length > 0) {
            resp = resps[i] || resps[0];
          }
          resp = resp.trim();

          if (ownerFilter && resp.toUpperCase() !== ownerFilter.toUpperCase()) continue;

          let acc = accs[i] || (accs.length > 0 ? accs[0] : 'Unknown');
          acc = String(acc).trim().toLowerCase();
          const isAccYes = acc.startsWith('yes') || acc === 'y';

          if (accFilter === 'yes' && !isAccYes) continue;
          if (accFilter === 'no' && isAccYes) continue;

          const r = reasons[i] ? reasons[i].trim() : 'Unknown';
          const sr = subReasons[i] ? subReasons[i].trim() : 'Unknown';
          const rc = rootCauses[i] ? rootCauses[i].trim() : 'Unknown';

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

    // Exact count of detractors and neutrals matching dashboard logic
    const detractors = auditedTasks.filter(t => Number(t.evaluationScore) <= 6).length;
    const neutrals = auditedTasks.filter(t => Number(t.evaluationScore) >= 7 && Number(t.evaluationScore) <= 8).length;
    const promoters = Math.max(0, totalSamples - (detractors + neutrals));
    const nps = (totalSamples > 0) ? Math.round(((promoters / totalSamples) - (detractors / totalSamples)) * 100) : 0;


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
    const detractorRate = totalSamples > 0 ? `${((detractors / totalSamples) * 100).toFixed(1)}%` : "0.0%";
    const neutralRate = totalSamples > 0 ? `${((neutrals / totalSamples) * 100).toFixed(1)}%` : "0.0%";
    const promoterRate = totalSamples > 0 ? `${((promoters / totalSamples) * 100).toFixed(1)}%` : "0.0%";
    const auditedRate = totalSamples > 0 ? `${((totalAudited / totalSamples) * 100).toFixed(1)}%` : "0.0%";

    const todoShare = totalAudited > 0 ? `${((todoCount / totalAudited) * 100).toFixed(1)}%` : "0.0%";
    const inProgressShare = totalAudited > 0 ? `${((inProgressCount / totalAudited) * 100).toFixed(1)}%` : "0.0%";
    const closedShare = totalAudited > 0 ? `${((closedCount / totalAudited) * 100).toFixed(1)}%` : "0.0%";

    const summaryData = [
      ["NPS, QUALITY ISSUES & WORKFLOW STATUS", "", "", ""],
      [`Reported Period: ${periodStr}  |  Export Date: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, "", "", ""],
      ["", "", "", ""],
      ["CORE KEY PERFORMANCE INDICATORS & NPS ANALYSIS", "", "", ""],
      ["Performance Indicator", "Value", "Rate / Share", "Benchmark & Status"],
      ["Total Samples Token", totalSamples],
      ["Non-Promoter Customers", totalAudited, auditedRate, "Requires Quality Investigation"],
      ["Total Quality Issues Identified", totalIssues, "-", "Root Causes & Defects Logged"],
      ["Avg. Issues per Audited Task", avgIssuesPerTask, "-", "Issue Density Index"],
      ["Detractors (Score: 0 - 6)", detractors, detractorRate, "Critical Attention (Target ≤ 8%)"],
      ["Neutrals (Score: 7 - 8)", neutrals, neutralRate],
      ["Promoters (Score: 9 - 10)", promoters, promoterRate, "Customer Loyalty (Target ≥ 75%)"],
      ["Net Promoter Score (NPS)", nps, "-", `${nps >= 67 ? "Met Target" : "Below Target"} (Target: ≥ 67)`],
      ["", "", "", ""],
      ["TASK EXECUTION & WORKFLOW LIFECYCLE", "", "", ""],
      ["Workflow Status", "Task Count", "Distribution Share", "Operational State"],
      ["Todo (Pending Action)", todoCount, todoShare, "Awaiting Team Assignment"],
      ["In Progress", inProgressCount, inProgressShare, "Active RCA & Customer Contact"],
      ["Closed (Resolved)", closedCount, closedShare, "Resolved & Verified"],
      ["TOTAL", totalAudited, "100.0%"],
      // ["", "", "", ""],
      // ["EXECUTIVE QUALITY OBSERVATIONS & BENCHMARKS", "", "", ""],
      // ["Quality Observation", "Value / Score", "Status Indicator", "Operational Guidance"],
      // ["Audit Defect Ratio", `${avgIssuesPerTask} issues/task`, totalIssues > 0 ? "Action Recommended" : "Optimal", "Monitor repeat reasons and team execution"],
      // ["NPS Health Classification", nps >= 50 ? "Tier 1 - Excellent" : nps >= 0 ? "Tier 2 - Fair" : "Tier 3 - Critical", nps >= 50 ? "🟢 Green Zone" : nps >= 0 ? "🟡 Warning Zone" : "🔴 Alert Zone", nps >= 50 ? "Maintain operational excellence" : "Initiate immediate corrective actions"],
      // ["Promoter to Detractor Ratio", detractors > 0 ? `${(promoters / detractors).toFixed(2)} : 1` : promoters > 0 ? "100% Promoters" : "N/A", detractors === 0 ? "Outstanding" : (promoters / detractors) >= 4 ? "Healthy" : "Unfavorable", "Target ratio: > 4.0 Promoters per Detractor"]
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

    // Setup Merges
    if (!wsSummary['!merges']) wsSummary['!merges'] = [];
    wsSummary['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }); // Title
    wsSummary['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }); // Subtitle
    wsSummary['!merges'].push({ s: { r: 3, c: 0 }, e: { r: 3, c: 3 } }); // KPI Header
    wsSummary['!merges'].push({ s: { r: 14, c: 0 }, e: { r: 14, c: 3 } }); // Workflow Header
    wsSummary['!merges'].push({ s: { r: 21, c: 0 }, e: { r: 21, c: 3 } }); // Observations Header

    // Cell Styling Helper for wsSummary
    const thinBorder = {
      top: { style: 'thin', color: { rgb: "D1D5DB" } },
      bottom: { style: 'thin', color: { rgb: "D1D5DB" } },
      left: { style: 'thin', color: { rgb: "D1D5DB" } },
      right: { style: 'thin', color: { rgb: "D1D5DB" } }
    };
    const doubleBottomBorder = {
      top: { style: 'thin', color: { rgb: "9CA3AF" } },
      bottom: { style: 'double', color: { rgb: "111827" } },
      left: { style: 'thin', color: { rgb: "9CA3AF" } },
      right: { style: 'thin', color: { rgb: "9CA3AF" } }
    };

    // Title Row 0
    if (wsSummary['A1']) {
      wsSummary['A1'].s = {
        font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E3A8A" } },
        alignment: { horizontal: "left", vertical: "center", indent: 1 }
      };
    }

    // Subtitle Row 1
    if (wsSummary['A2']) {
      wsSummary['A2'].s = {
        font: { bold: true, sz: 10, color: { rgb: "1E40AF" } },
        fill: { fgColor: { rgb: "EFF6FF" } },
        alignment: { horizontal: "left", vertical: "center", indent: 1 }
      };
    }

    // Section 1 Header Row 3
    if (wsSummary['A4']) {
      wsSummary['A4'].s = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E40AF" } },
        alignment: { horizontal: "left", vertical: "center", indent: 1 }
      };
    }
    // Table 1 Column Headers (Row 4)
    applyHeaderStyle(wsSummary, { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } }, "374151");

    // Table 1 Data Rows (Rows 5 to 12)
    const kpiRowBg = [
      "F0F9FF", // Total Samples
      "F5F3FF", // Non-promoters
      "FAF5FF", // Total Issues
      "F8FAFC", // Avg issues
      "FEF2F2", // Detractors (Soft Red)
      "FFFBEB", // Neutrals (Soft Amber)
      "F0FDF4", // Promoters (Soft Green)
      nps >= 50 ? "DCFCE7" : nps >= 0 ? "FEF3C7" : "FEE2E2" // NPS
    ];

    for (let r = 5; r <= 12; r++) {
      const bg = kpiRowBg[r - 5] || "FFFFFF";
      for (let c = 0; c <= 3; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!wsSummary[addr]) wsSummary[addr] = { v: '', t: 's' };
        const isNpsRow = (r === 12);
        const isDetractor = (r === 9);
        const isNeutral = (r === 10);
        const isPromoter = (r === 11);

        let fontColor = "111827";
        if (isDetractor && (c === 0 || c === 1 || c === 2)) fontColor = "991B1B";
        if (isNeutral && (c === 0 || c === 1 || c === 2)) fontColor = "92400E";
        if (isPromoter && (c === 0 || c === 1 || c === 2)) fontColor = "166534";
        if (isNpsRow) fontColor = nps >= 50 ? "166534" : nps >= 0 ? "92400E" : "991B1B";

        wsSummary[addr].s = {
          font: {
            bold: (c === 0 || c === 1 || isNpsRow),
            sz: isNpsRow ? 11 : 10,
            color: { rgb: fontColor }
          },
          fill: { fgColor: { rgb: bg } },
          alignment: {
            horizontal: c === 0 ? "left" : c === 3 ? "left" : "center",
            vertical: "center"
          },
          border: thinBorder
        };
      }
    }

    // Section 2 Header Row 14
    if (wsSummary['A15']) {
      wsSummary['A15'].s = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F46E5" } },
        alignment: { horizontal: "left", vertical: "center", indent: 1 }
      };
    }
    // Table 2 Column Headers (Row 15)
    applyHeaderStyle(wsSummary, { s: { r: 15, c: 0 }, e: { r: 15, c: 3 } }, "374151");

    // Table 2 Data Rows (Rows 16 to 19)
    const workflowBg = ["F8FAFC", "FFFBEB", "F0FDF4", "E2E8F0"];
    for (let r = 16; r <= 19; r++) {
      const bg = workflowBg[r - 16] || "FFFFFF";
      const isTotal = (r === 19);
      for (let c = 0; c <= 3; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!wsSummary[addr]) wsSummary[addr] = { v: '', t: 's' };
        wsSummary[addr].s = {
          font: { bold: (c === 0 || c === 1 || isTotal), sz: 10, color: { rgb: isTotal ? "0F172A" : "334155" } },
          fill: { fgColor: { rgb: bg } },
          alignment: {
            horizontal: c === 0 ? "left" : c === 3 ? "left" : "center",
            vertical: "center"
          },
          border: isTotal ? doubleBottomBorder : thinBorder
        };
      }
    }

    // Section 3 Header Row 21
    if (wsSummary['A22']) {
      wsSummary['A22'].s = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0F766E" } },
        alignment: { horizontal: "left", vertical: "center", indent: 1 }
      };
    }
    // Table 3 Column Headers (Row 22)
    applyHeaderStyle(wsSummary, { s: { r: 22, c: 0 }, e: { r: 22, c: 3 } }, "374151");

    // Table 3 Data Rows (Rows 23 to 25)
    for (let r = 23; r <= 25; r++) {
      for (let c = 0; c <= 3; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!wsSummary[addr]) wsSummary[addr] = { v: '', t: 's' };
        wsSummary[addr].s = {
          font: { bold: (c === 0 || c === 1), sz: 10, color: { rgb: "1E293B" } },
          fill: { fgColor: { rgb: r % 2 === 1 ? "F8FAFC" : "FFFFFF" } },
          alignment: {
            horizontal: c === 0 ? "left" : c === 3 ? "left" : "center",
            vertical: "center"
          },
          border: thinBorder
        };
      }
    }

    wsSummary['!cols'] = [{ wch: 42 }, { wch: 18 }, { wch: 18 }, { wch: 38 }];
    fixSheetRange(wsSummary);

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
    const reasonStats = getCountsWithPercent('reason');
    const subReasonStats = getCountsWithPercent('subReason');

    const wsReasons = XLSX.utils.aoa_to_sheet([[`Reported Period: ${periodStr}`]]);
    wsReasons['A1'].s = { font: { bold: true, sz: 14 } };

    const hierarchicalRCA = getHierarchicalRCA(filteredTasks);
    addHierarchicalRCA(wsReasons, hierarchicalRCA, "A3", "ROOT CAUSE BREAKDOWN", "1E3A8A");

    addTableToSheet(wsReasons, globalRootCauses, "H3", "ROOT CAUSE SUMMARY", "1E3A8A");
    addTableToSheet(wsReasons, reasonStats, "L3", "REASON SUMMARY", "2563EB");
    addTableToSheet(wsReasons, subReasonStats, "P3", "SUB-REASON SUMMARY", "1D4ED8");
    addTableToSheet(wsReasons, owners, "T3", "OWNER ANALYSIS", "00BCD4");
    addTableToSheet(wsReasons, itnRelated, "X3", "ITN RELATED ANALYSIS", "FF5722");
    addTableToSheet(wsReasons, subRelated, "AB3", "SUBSCRIPTION RELATED ANALYSIS", "8BC34A");

    wsReasons['!cols'] = Array(28).fill({ wch: 15 });
    wsReasons['!cols'][0] = { wch: 25 }; // Reason
    wsReasons['!cols'][1] = { wch: 8 };  // Total
    wsReasons['!cols'][2] = { wch: 25 }; // Sub-reason
    wsReasons['!cols'][3] = { wch: 8 };  // Cases
    wsReasons['!cols'][4] = { wch: 30 }; // RC
    wsReasons['!cols'][5] = { wch: 8 };  // Cases
    wsReasons['!cols'][7] = { wch: 30 }; // RC Summary Name
    wsReasons['!cols'][11] = { wch: 25 }; // Reason Summary Name
    wsReasons['!cols'][15] = { wch: 25 }; // Sub-Reason Summary Name
    wsReasons['!cols'][19] = { wch: 25 }; // Owner Name
    wsReasons['!cols'][23] = { wch: 22 }; // ITN Related
    wsReasons['!cols'][27] = { wch: 22 }; // Subscription Related
    fixSheetRange(wsReasons);

    // 3.1 Category Matrix Analysis Subsheet
    const getMatrixData = (tasks, rowField) => {
      const ownerCounts = {};
      const uniqueOwners = new Set();
      const catStats = {};
      const rowTotalByCategory = {};

      tasks.forEach((t) => {
        const resp = t.responsible;
        let owners = [];
        if (Array.isArray(resp)) {
          owners = resp.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
        } else if (typeof resp === 'string' && resp.trim()) {
          owners = resp.split(',').map(s => s.trim()).filter(Boolean);
        } else if (resp) {
          owners = [resp];
        }
        if (owners.length === 0) owners = ['Unknown'];

        owners.forEach(owner => uniqueOwners.add(owner));

        const val = t[rowField];
        let values = [];
        if (Array.isArray(val)) {
          values = val.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
        } else if (typeof val === 'string' && val.trim()) {
          values = val.split(',').map(s => s.trim()).filter(Boolean);
        } else if (val) {
          values = [String(val).trim()];
        }
        if (values.length === 0) values = ['Unknown'];

        const score = t.evaluationScore;
        let isDetractor = false;
        let isNeutral = false;
        if (score !== null && score !== 'N/A' && score !== undefined && score !== '') {
          const numScore = Number(score);
          if (!isNaN(numScore)) {
            if (numScore <= 6) isDetractor = true;
            else if (numScore >= 7 && numScore <= 8) isNeutral = true;
          }
        }

        values.forEach(v => {
          rowTotalByCategory[v] = (rowTotalByCategory[v] || 0) + 1;

          if (!ownerCounts[v]) ownerCounts[v] = {};
          if (!catStats[v]) catStats[v] = { detractors: 0, neutrals: 0 };

          owners.forEach(owner => {
            ownerCounts[v][owner] = (ownerCounts[v][owner] || 0) + 1;
          });

          if (isDetractor) catStats[v].detractors = (catStats[v].detractors || 0) + 1;
          if (isNeutral) catStats[v].neutrals = (catStats[v].neutrals || 0) + 1;
        });
      });

      const totalFieldOccurrences = Object.values(rowTotalByCategory).reduce((sum, count) => sum + count, 0);
      const sortedOwners = Array.from(uniqueOwners).sort();

      const matrix = Object.entries(ownerCounts).map(([rowName, oCounts]) => {
        const row = { 'Category': rowName };
        const rowTotal = rowTotalByCategory[rowName] || 0;

        row['Total'] = rowTotal;
        row['%'] = totalFieldOccurrences > 0 ? `${((rowTotal / totalFieldOccurrences) * 100).toFixed(1)}%` : '0%';

        sortedOwners.forEach(owner => {
          const count = oCounts[owner] || 0;
          row[owner] = count;
          row[`${owner} %`] = rowTotal > 0 ? `${((count / rowTotal) * 100).toFixed(1)}%` : '0%';
        });

        const stats = catStats[rowName] || { detractors: 0, neutrals: 0 };
        row['Detractors'] = stats.detractors;
        row['Detractors %'] = rowTotal > 0 ? `${((stats.detractors / rowTotal) * 100).toFixed(1)}%` : '0%';
        row['Neutrals'] = stats.neutrals;
        row['Neutrals %'] = rowTotal > 0 ? `${((stats.neutrals / rowTotal) * 100).toFixed(1)}%` : '0%';

        return row;
      }).sort((a, b) => b['Total'] - a['Total']);

      return { data: matrix, owners: sortedOwners };
    };

    const reasonMatrix = getMatrixData(filteredTasks, 'reason');
    const subReasonMatrix = getMatrixData(filteredTasks, 'subReason');
    const rootCauseMatrix = getMatrixData(filteredTasks, 'rootCause');

    const wsMatrix = XLSX.utils.aoa_to_sheet([[`CATEGORY MATRIX ANALYSIS - Period: ${periodStr}`]]);
    wsMatrix['A1'] = { v: `CATEGORY MATRIX ANALYSIS - Period: ${periodStr}`, t: 's', s: { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "111827" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } } };
    if (!wsMatrix['!merges']) wsMatrix['!merges'] = [];
    wsMatrix['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 15 } });

    let currentMatrixR = 2;
    const addMatrixTable = (ws, matrixResult, title, colorHex, startR) => {
      const { data, owners } = matrixResult;
      if (data.length === 0) return startR;

      const totalCols = 1 + 2 + owners.length * 2 + 2 + 2; // Category + Overall(2) + Owners(2*N) + Det(2) + Neu(2)
      const maxColIdx = totalCols - 1;

      // Title Banner
      const titleCell = XLSX.utils.encode_cell({ r: startR, c: 0 });
      ws[titleCell] = {
        v: title,
        t: 's',
        s: { font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: colorHex } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } }
      };
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: startR, c: 0 }, e: { r: startR, c: maxColIdx } });

      const headerR1 = startR + 1;
      const headerR2 = startR + 2;
      const dataStartR = startR + 3;

      // Level 1 Header
      const lvl1 = ["Category / Item", "OVERALL VOLUME", ""];
      owners.forEach(o => {
        lvl1.push(o.toUpperCase(), "");
      });
      lvl1.push("DETRACTORS", "", "NEUTRALS", "");

      // Level 2 Sub-Headers
      const lvl2 = ["Category / Item", "Total", "% Total"];
      owners.forEach(() => {
        lvl2.push("Count", "% Share");
      });
      lvl2.push("Detractors", "Detractor %", "Neutrals", "Neutral %");

      // Add Headers
      XLSX.utils.sheet_add_aoa(ws, [lvl1, lvl2], { origin: XLSX.utils.encode_cell({ r: headerR1, c: 0 }) });

      // Convert data to AOA
      const dataAoa = data.map(r => {
        const rowArr = [r['Category'], r['Total'], r['%']];
        owners.forEach(o => {
          rowArr.push(r[o] || 0, r[`${o} %`] || '0%');
        });
        rowArr.push(r['Detractors'] || 0, r['Detractors %'] || '0%', r['Neutrals'] || 0, r['Neutrals %'] || '0%');
        return rowArr;
      });
      XLSX.utils.sheet_add_aoa(ws, dataAoa, { origin: XLSX.utils.encode_cell({ r: dataStartR, c: 0 }) });

      // Merge Category vertically
      ws['!merges'].push({ s: { r: headerR1, c: 0 }, e: { r: headerR2, c: 0 } });
      ws[XLSX.utils.encode_cell({ r: headerR1, c: 0 })] = {
        v: "Category / Item",
        t: 's',
        s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E293B" } }, alignment: { horizontal: "center", vertical: "center" } }
      };

      // Overall Volume Merge & Style (Cols 1-2)
      ws['!merges'].push({ s: { r: headerR1, c: 1 }, e: { r: headerR1, c: 2 } });
      for (let c = 1; c <= 2; c++) {
        const cell = XLSX.utils.encode_cell({ r: headerR1, c });
        ws[cell] = {
          v: c === 1 ? "OVERALL VOLUME" : "",
          t: 's',
          s: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E40AF" } }, alignment: { horizontal: "center", vertical: "center" } }
        };
      }

      // Owners Merges & Styles
      const ownerPalette = ["4338CA", "0D9488", "7C3AED", "C026D3", "EA580C", "4B5563", "0284C7", "B45309", "059669", "374151", "BE123C", "1E3A8A"];
      owners.forEach((o, oIdx) => {
        const colStart = 3 + oIdx * 2;
        const colEnd = colStart + 1;
        const oColor = ownerPalette[oIdx % ownerPalette.length];
        ws['!merges'].push({ s: { r: headerR1, c: colStart }, e: { r: headerR1, c: colEnd } });
        for (let c = colStart; c <= colEnd; c++) {
          const cell = XLSX.utils.encode_cell({ r: headerR1, c });
          ws[cell] = {
            v: c === colStart ? o.toUpperCase() : "",
            t: 's',
            s: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: oColor } }, alignment: { horizontal: "center", vertical: "center" } }
          };
        }
      });

      // Detractors Merge & Style
      const detColStart = 3 + owners.length * 2;
      const detColEnd = detColStart + 1;
      ws['!merges'].push({ s: { r: headerR1, c: detColStart }, e: { r: headerR1, c: detColEnd } });
      for (let c = detColStart; c <= detColEnd; c++) {
        const cell = XLSX.utils.encode_cell({ r: headerR1, c });
        ws[cell] = {
          v: c === detColStart ? "DETRACTORS" : "",
          t: 's',
          s: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "B91C1C" } }, alignment: { horizontal: "center", vertical: "center" } }
        };
      }

      // Neutrals Merge & Style
      const neuColStart = detColStart + 2;
      const neuColEnd = neuColStart + 1;
      ws['!merges'].push({ s: { r: headerR1, c: neuColStart }, e: { r: headerR1, c: neuColEnd } });
      for (let c = neuColStart; c <= neuColEnd; c++) {
        const cell = XLSX.utils.encode_cell({ r: headerR1, c });
        ws[cell] = {
          v: c === neuColStart ? "NEUTRALS" : "",
          t: 's',
          s: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "D97706" } }, alignment: { horizontal: "center", vertical: "center" } }
        };
      }

      // Level 2 Sub-Headers Styles
      // Overall (Cols 1-2)
      [1, 2].forEach(c => {
        const cell = XLSX.utils.encode_cell({ r: headerR2, c });
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "2563EB" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: { style: 'thin', color: { rgb: '93C5FD' } }, bottom: { style: 'medium', color: { rgb: '1E3A8A' } }, left: { style: 'thin', color: { rgb: '60A5FA' } }, right: { style: 'thin', color: { rgb: '60A5FA' } } }
          };
        }
      });

      // Owners (Count, %)
      for (let oIdx = 0; oIdx < owners.length; oIdx++) {
        const c1 = 3 + oIdx * 2;
        const c2 = c1 + 1;

        const cell1 = XLSX.utils.encode_cell({ r: headerR2, c: c1 });
        if (ws[cell1]) {
          ws[cell1].s = {
            font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "334155" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: { style: 'thin', color: { rgb: 'CBD5E1' } }, bottom: { style: 'medium', color: { rgb: '0F172A' } }, left: { style: 'thin', color: { rgb: '94A3B8' } }, right: { style: 'thin', color: { rgb: '94A3B8' } } }
          };
        }

        const cell2 = XLSX.utils.encode_cell({ r: headerR2, c: c2 });
        if (ws[cell2]) {
          ws[cell2].s = {
            font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "475569" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: { style: 'thin', color: { rgb: 'CBD5E1' } }, bottom: { style: 'medium', color: { rgb: '0F172A' } }, left: { style: 'thin', color: { rgb: '94A3B8' } }, right: { style: 'thin', color: { rgb: '94A3B8' } } }
          };
        }
      }

      // Detractors Sub-Headers
      [detColStart, detColEnd].forEach(c => {
        const cell = XLSX.utils.encode_cell({ r: headerR2, c });
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "DC2626" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: { style: 'thin', color: { rgb: 'FCA5A5' } }, bottom: { style: 'medium', color: { rgb: '7F1D1D' } }, left: { style: 'thin', color: { rgb: 'F87171' } }, right: { style: 'thin', color: { rgb: 'F87171' } } }
          };
        }
      });

      // Neutrals Sub-Headers
      [neuColStart, neuColEnd].forEach(c => {
        const cell = XLSX.utils.encode_cell({ r: headerR2, c });
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "F59E0B" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: { style: 'thin', color: { rgb: 'FDE68A' } }, bottom: { style: 'medium', color: { rgb: '92400E' } }, left: { style: 'thin', color: { rgb: 'FBBF24' } }, right: { style: 'thin', color: { rgb: 'FBBF24' } } }
          };
        }
      });

      // Data Rows Formatting
      for (let r = 0; r < dataAoa.length; r++) {
        const rowIdx = dataStartR + r;
        for (let c = 0; c <= maxColIdx; c++) {
          const cell = XLSX.utils.encode_cell({ r: rowIdx, c });
          if (!ws[cell]) continue;

          let fontColor = "1E293B";
          let bgColor = "FFFFFF";

          if (c === 0) {
            fontColor = "1E293B";
          } else if (c === 1 || c === 2) {
            fontColor = "1E40AF";
            bgColor = "F8FAFC";
          } else if (c === detColStart || c === detColEnd) {
            fontColor = "B91C1C";
            if (c === detColStart && dataAoa[r][c] > 0) bgColor = "FEF2F2";
          } else if (c === neuColStart || c === neuColEnd) {
            fontColor = "D97706";
            if (c === neuColStart && dataAoa[r][c] > 0) bgColor = "FFFBEB";
          }

          ws[cell].s = {
            font: { bold: c === 0 || c === 1 || c === detColStart || c === neuColStart, color: { rgb: fontColor } },
            fill: { fgColor: { rgb: bgColor } },
            alignment: { horizontal: c === 0 ? "left" : "center", vertical: "center" },
            border: { top: { style: 'thin', color: { rgb: 'E2E8F0' } }, bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }, left: { style: 'thin', color: { rgb: 'E2E8F0' } }, right: { style: 'thin', color: { rgb: 'CBD5E1' } } }
          };
        }
      }

      return dataStartR + dataAoa.length + 4;
    };

    currentMatrixR = addMatrixTable(wsMatrix, reasonMatrix, "REASON DISTRIBUTION BY OWNERSHIP", "1E3A8A", currentMatrixR);
    currentMatrixR = addMatrixTable(wsMatrix, subReasonMatrix, "SUB-REASON BREAKDOWN BY OWNERSHIP", "B45309", currentMatrixR);
    currentMatrixR = addMatrixTable(wsMatrix, rootCauseMatrix, "ROOT CAUSE MATRIX", "4C1D95", currentMatrixR);

    const maxCols = Math.max(reasonMatrix.owners.length, subReasonMatrix.owners.length, rootCauseMatrix.owners.length) * 2 + 7;
    wsMatrix['!cols'] = Array(maxCols).fill({ wch: 12 });
    wsMatrix['!cols'][0] = { wch: 30 };
    fixSheetRange(wsMatrix);

    // 3.5 Special Analytics Window
    const ownerCounts = {};
    const ownerCustomerCounts = {};

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
      if (values.length === 0) values = ['Unknown'];
      
      // Total occurrences / issues identified count across all tasks
      values.forEach(v => { ownerCounts[v] = (ownerCounts[v] || 0) + 1; });

      // Unique customers per owner
      const uniqueOwnersInTask = new Set(values);
      uniqueOwnersInTask.forEach(v => {
        ownerCustomerCounts[v] = (ownerCustomerCounts[v] || 0) + 1;
      });
    });

    const sortedOwners = Object.entries(ownerCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const topOwners = sortedOwners; // Take all owners

    const wsSpecial = XLSX.utils.aoa_to_sheet([[`OWNERSHIP DISTRIBUTION - Period: ${periodStr}`]]);
    wsSpecial['A1'] = { v: `OWNERSHIP DISTRIBUTION - Period: ${periodStr}`, t: 's', s: { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4B5563" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } } };
    if (!wsSpecial['!merges']) wsSpecial['!merges'] = [];
    wsSpecial['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 29 } });

    // Build team accountability breakdown per owner for the summary table
    const ownerAccBreakdown = {};
    filteredTasks.forEach(t => {
      let resps = normalizeArrayField(t.responsible);
      if (resps.length === 0) resps = ['Unknown'];

      const accRaw = t.teamAccountability;
      let accVals = normalizeArrayField(accRaw);
      if (accVals.length === 0) accVals = ['Unknown'];

      const score = t.evaluationScore;
      let isDetractor = false;
      let isNeutral = false;
      if (score !== null && score !== 'N/A' && score !== undefined && score !== '') {
        const numScore = Number(score);
        if (!isNaN(numScore)) {
          if (numScore <= 6) isDetractor = true;
          else if (numScore >= 7 && numScore <= 8) isNeutral = true;
        }
      }

      const maxIssues = Math.max(resps.length, accVals.length);
      for (let i = 0; i < maxIssues; i++) {
        const resp = resps[i] || (resps.length === 1 ? resps[0] : 'Unknown');
        const acc = accVals[i] || (accVals.length === 1 ? accVals[0] : 'Unknown');
        const key = (resp || 'Unknown').trim();
        const isReach = key.toUpperCase() === 'REACH';

        if (!ownerAccBreakdown[key]) ownerAccBreakdown[key] = { yes: 0, no: 0, total: 0, detractors: 0, neutrals: 0 };
        ownerAccBreakdown[key].total++;

        const lower = acc.toLowerCase();
        // Team accountability Yes is strictly an evaluation metric for Reach field teams
        if (isReach && (lower.startsWith('yes') || lower === 'y')) {
          ownerAccBreakdown[key].yes++;
        } else {
          ownerAccBreakdown[key].no++;
        }

        if (isDetractor) ownerAccBreakdown[key].detractors++;
        if (isNeutral) ownerAccBreakdown[key].neutrals++;
      }
    });

    const totalOwnerOccurrences = Object.values(ownerCounts).reduce((sum, count) => sum + count, 0);

    const sumTotalIssues = totalOwnerOccurrences;
    const sumTotalAccYes = Object.values(ownerAccBreakdown).reduce((sum, a) => sum + (a.yes || 0), 0);
    const sumTotalAccNo = Object.values(ownerAccBreakdown).reduce((sum, a) => sum + (a.no || 0), 0);
    const sumTotalDetractors = Object.values(ownerAccBreakdown).reduce((sum, a) => sum + (a.detractors || 0), 0);
    const sumTotalNeutrals = Object.values(ownerAccBreakdown).reduce((sum, a) => sum + (a.neutrals || 0), 0);

    const ownerDistributionData = Object.entries(ownerCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([owner, count]) => {
        const acc = ownerAccBreakdown[owner] || { yes: 0, no: 0, total: count, detractors: 0, neutrals: 0 };
        const yesCount = acc.yes;
        const noCount = acc.no;
        const detCount = acc.detractors;
        const neuCount = acc.neutrals;
        const base = acc.total || count;
        return {
          Owner: owner,
          Count: count,
          Percentage: totalOwnerOccurrences > 0 ? `${((count / totalOwnerOccurrences) * 100).toFixed(1)}%` : '0%',
          'Team Acc. Yes': yesCount,
          'Yes %': base > 0 ? `${((yesCount / base) * 100).toFixed(1)}%` : '0%',
          'Team Acc. No': noCount,
          'No %': base > 0 ? `${((noCount / base) * 100).toFixed(1)}%` : '0%',
          'Detractors': detCount,
          'Detractors %': base > 0 ? `${((detCount / base) * 100).toFixed(1)}%` : '0%',
          'Neutrals': neuCount,
          'Neutrals %': base > 0 ? `${((neuCount / base) * 100).toFixed(1)}%` : '0%'
        };
      });

    // Append Total Summary Row
    if (ownerDistributionData.length > 0) {
      ownerDistributionData.push({
        Owner: 'TOTAL',
        Count: sumTotalIssues,
        Percentage: '100.0%',
        'Team Acc. Yes': sumTotalAccYes,
        'Yes %': sumTotalIssues > 0 ? `${((sumTotalAccYes / sumTotalIssues) * 100).toFixed(1)}%` : '0%',
        'Team Acc. No': sumTotalAccNo,
        'No %': sumTotalIssues > 0 ? `${((sumTotalAccNo / sumTotalIssues) * 100).toFixed(1)}%` : '0%',
        'Detractors': sumTotalDetractors,
        'Detractors %': sumTotalIssues > 0 ? `${((sumTotalDetractors / sumTotalIssues) * 100).toFixed(1)}%` : '0%',
        'Neutrals': sumTotalNeutrals,
        'Neutrals %': sumTotalIssues > 0 ? `${((sumTotalNeutrals / sumTotalIssues) * 100).toFixed(1)}%` : '0%'
      });
    }

    // Add 2-level grouped headers for OWNER DISTRIBUTION SUMMARY
    const ownerDistLvl1 = [
      "Owner / Entity",
      "TOTAL ISSUES IDENTIFIED (100% DISTRIBUTION)", "",
      "ACCOUNTABLE (YES)", "",
      "NON-ACCOUNTABLE (NO)", "",
      "DETRACTORS", "",
      "NEUTRALS", ""
    ];

    const ownerDistLvl2Keys = [
      'Owner',
      'Count',
      'Percentage',
      'Team Acc. Yes',
      'Yes %',
      'Team Acc. No',
      'No %',
      'Detractors',
      'Detractors %',
      'Neutrals',
      'Neutrals %'
    ];

    const ownerDistLvl2Labels = [
      'Owner',
      'Count',
      'Percentage',
      'Team Acc. Yes',
      'Yes %',
      'Team Acc. No',
      'No %',
      'Detractors',
      'Detractors %',
      'Neutrals',
      'Neutrals %'
    ];

    wsSpecial['A2'] = { v: 'OWNER DISTRIBUTION SUMMARY', t: 's', s: { font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1F2937' } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } } };
    wsSpecial['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 10 } });

    XLSX.utils.sheet_add_aoa(wsSpecial, [ownerDistLvl1, ownerDistLvl2Labels], { origin: 'A3' });

    const ownerDataAoa = ownerDistributionData.map(r => ownerDistLvl2Keys.map(k => r[k] !== undefined ? r[k] : ""));
    XLSX.utils.sheet_add_aoa(wsSpecial, ownerDataAoa, { origin: 'A5' });

    // Merge Owner vertically
    wsSpecial['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 3, c: 0 } });
    wsSpecial['A3'] = { v: "Owner / Entity", t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E293B" } }, alignment: { horizontal: "center", vertical: "center" } } };

    // Level 1 Merges & Styles
    const ownerDistGroups = [
      { start: 1, end: 2, label: "TOTAL ISSUES IDENTIFIED (100% DISTRIBUTION)", color: "1E40AF" },
      { start: 3, end: 4, label: "ACCOUNTABLE (YES)", color: "3730A3" },
      { start: 5, end: 6, label: "NON-ACCOUNTABLE (NO)", color: "9F1239" },
      { start: 7, end: 8, label: "DETRACTORS", color: "B91C1C" },
      { start: 9, end: 10, label: "NEUTRALS", color: "D97706" }
    ];

    ownerDistGroups.forEach(g => {
      wsSpecial['!merges'].push({ s: { r: 2, c: g.start }, e: { r: 2, c: g.end } });
      for (let c = g.start; c <= g.end; c++) {
        const cell = XLSX.utils.encode_cell({ r: 2, c });
        wsSpecial[cell] = {
          v: c === g.start ? g.label : "",
          t: 's',
          s: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: g.color } }, alignment: { horizontal: "center", vertical: "center" } }
        };
      }
    });

    // Level 2 Sub-Headers
    const ownerLvl2Colors = [
      "1E293B",
      "2563EB", "1D4ED8",
      "4F46E5", "4338CA",
      "E11D48", "BE123C",
      "DC2626", "B91C1C",
      "F59E0B", "D97706"
    ];
    for (let c = 1; c <= 10; c++) {
      const cell = XLSX.utils.encode_cell({ r: 3, c });
      if (wsSpecial[cell]) {
        wsSpecial[cell].s = {
          font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: ownerLvl2Colors[c] || "374151" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { top: { style: 'thin', color: { rgb: 'CBD5E1' } }, bottom: { style: 'medium', color: { rgb: '0F172A' } }, left: { style: 'thin', color: { rgb: '94A3B8' } }, right: { style: 'thin', color: { rgb: '94A3B8' } } }
        };
      }
    }

    // Style Data Rows
    for (let r = 0; r < ownerDataAoa.length; r++) {
      const rowIdx = 4 + r;
      const isTotalRow = r === ownerDataAoa.length - 1 && ownerDataAoa[r][0] === 'TOTAL';
      for (let c = 0; c <= 10; c++) {
        const cell = XLSX.utils.encode_cell({ r: rowIdx, c });
        if (!wsSpecial[cell]) continue;

        let fontColor = "1E293B";
        let bgColor = isTotalRow ? "F1F5F9" : "FFFFFF";

        if (isTotalRow) {
          fontColor = "0F172A";
        } else if (c === 1 || c === 2) {
          fontColor = "1E40AF";
          bgColor = "F8FAFC";
        } else if (c === 3 || c === 4) {
          fontColor = "3730A3";
        } else if (c === 5 || c === 6) {
          fontColor = "9F1239";
        } else if (c === 7 || c === 8) {
          fontColor = "B91C1C";
          if (c === 7 && ownerDataAoa[r][c] > 0) bgColor = "FEF2F2";
        } else if (c === 9 || c === 10) {
          fontColor = "D97706";
          if (c === 9 && ownerDataAoa[r][c] > 0) bgColor = "FFFBEB";
        }

        wsSpecial[cell].s = {
          font: { bold: isTotalRow || c === 0 || c === 1 || c === 3 || c === 5 || c === 7 || c === 9, color: { rgb: fontColor } },
          fill: { fgColor: { rgb: bgColor } },
          alignment: { horizontal: c === 0 ? "left" : "center", vertical: "center" },
          border: {
            top: { style: isTotalRow ? 'medium' : 'thin', color: { rgb: isTotalRow ? '0F172A' : 'E2E8F0' } },
            bottom: { style: isTotalRow ? 'medium' : 'thin', color: { rgb: isTotalRow ? '0F172A' : 'E2E8F0' } },
            left: { style: 'thin', color: { rgb: 'E2E8F0' } },
            right: { style: 'thin', color: { rgb: 'CBD5E1' } }
          }
        };
      }
    }

    let currentR = 4 + ownerDataAoa.length + 3;

    topOwners.forEach((owner, ownerIdx) => {
      const isReach = owner.toUpperCase() === 'REACH';

      const renderOwnerSuite = (title, headerBgColor, ownerFilter, accFilter, tag = "") => {
        // Owner Title
        const ownerCell = XLSX.utils.encode_cell({ r: currentR, c: 0 });
        wsSpecial[ownerCell] = {
          v: title,
          t: 's',
          s: { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: headerBgColor } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } }
        };
        if (!wsSpecial['!merges']) wsSpecial['!merges'] = [];
        wsSpecial['!merges'].push({ s: { r: currentR, c: 0 }, e: { r: currentR, c: 29 } });

        const getOwnerStats = (field) => {
          const counts = {};
          let ownerIssuesCount = 0;

          filteredTasks.forEach(t => {
            const resps = Array.isArray(t.responsible) ? t.responsible : (typeof t.responsible === 'string' ? t.responsible.split(',').map(s => s.trim()) : []);
            const vals = Array.isArray(t[field]) ? t[field] : (typeof t[field] === 'string' ? t[field].split(',').map(s => s.trim()) : []);
            const accs = Array.isArray(t.teamAccountability) ? t.teamAccountability : (typeof t.teamAccountability === 'string' ? t.teamAccountability.split(',').map(s => s.trim()) : []);

            const max = Math.max(resps.length, vals.length, accs.length);
            for (let i = 0; i < max; i++) {
              let resp = 'Unknown';
              if (resps.length > 0) {
                resp = resps[i] || resps[0];
              }
              resp = resp.trim();

              if (resp.toUpperCase() !== ownerFilter.toUpperCase()) continue;

              let acc = accs[i] || (accs.length > 0 ? accs[0] : 'Unknown');
              acc = String(acc).trim().toLowerCase();
              const isAccYes = acc.startsWith('yes') || acc === 'y';

              if (accFilter === 'yes' && !isAccYes) continue;
              if (accFilter === 'no' && isAccYes) continue;

              let val = vals[i] ? vals[i].trim() : 'Unknown';
              if (field === 'teamAccountability') {
                if (ownerFilter.toUpperCase() !== 'REACH') {
                  val = 'No';
                } else {
                  val = isAccYes ? 'Yes' : 'No';
                }
              }
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

        const hierarchicalTree = getHierarchicalRCA(filteredTasks, ownerFilter, accFilter);
        const reasonSummary = getOwnerStats('reason');
        const subReasonSummary = getOwnerStats('subReason');
        const rcSummary = getOwnerStats('rootCause');
        const itns = getOwnerStats('itnRelated');
        const subs = getOwnerStats('relatedToSubscription');
        const accStats = (!accFilter || ownerFilter.toUpperCase() === 'REACH') ? getOwnerStats('teamAccountability') : [];

        const tableStartR = currentR + 2;
        const rcaColor = accFilter === 'yes' ? "B91C1C" : (accFilter === 'no' ? "047857" : "1E3A8A");
        const rcSumColor = accFilter === 'yes' ? "991B1B" : (accFilter === 'no' ? "065F46" : "4C1D95");
        const reasonColor = accFilter === 'yes' ? "B91C1C" : (accFilter === 'no' ? "047857" : "1E3A8A");

        const rcaTitle = tag ? `ROOT CAUSE BREAKDOWN (${tag})` : "ROOT CAUSE BREAKDOWN";
        const rcSumTitle = tag ? `ROOT CAUSE SUMMARY (${tag})` : "ROOT CAUSE SUMMARY";
        const reasonTitle = tag ? `REASON SUMMARY (${tag})` : "REASON SUMMARY";
        const subReasonTitle = tag ? `SUB-REASON SUMMARY (${tag})` : "SUB-REASON SUMMARY";
        const itnTitle = tag ? `ITN RELATED (${tag})` : "ITN RELATED";
        const subTitle = tag ? `SUBSCRIPTION (${tag})` : "SUBSCRIPTION";
        const accTitle = tag ? `TEAM ACCOUNTABILITY (${tag})` : "TEAM ACCOUNTABILITY";

        const nextR = addHierarchicalRCA(wsSpecial, hierarchicalTree, XLSX.utils.encode_cell({ r: tableStartR, c: 0 }), rcaTitle, rcaColor);
        addTableToSheet(wsSpecial, rcSummary, XLSX.utils.encode_cell({ r: tableStartR, c: 7 }), rcSumTitle, rcSumColor);
        addTableToSheet(wsSpecial, reasonSummary, XLSX.utils.encode_cell({ r: tableStartR, c: 11 }), reasonTitle, reasonColor);
        addTableToSheet(wsSpecial, subReasonSummary, XLSX.utils.encode_cell({ r: tableStartR, c: 15 }), subReasonTitle, "B45309");
        addTableToSheet(wsSpecial, itns, XLSX.utils.encode_cell({ r: tableStartR, c: 19 }), itnTitle, "FF5722");
        addTableToSheet(wsSpecial, subs, XLSX.utils.encode_cell({ r: tableStartR, c: 23 }), subTitle, "8BC34A");

        if (accStats && accStats.length > 0 && !accFilter) {
          addTableToSheet(wsSpecial, accStats, XLSX.utils.encode_cell({ r: tableStartR, c: 27 }), accTitle, "7F1D1D");
        }

        const maxSummaryLen = Math.max(
          reasonSummary.length,
          subReasonSummary.length,
          rcSummary.length,
          itns.length,
          subs.length,
          (!accFilter && accStats) ? accStats.length : 0,
          1
        );
        currentR = Math.max(nextR, tableStartR + maxSummaryLen + 2) + 2;
      };

      if (isReach) {
        // Part 1: Reach All Cases
        renderOwnerSuite(`OWNER: REACH (ALL CASES - COMBINED)`, "1F2937", owner, null, "ALL");

        // Divider
        let sepR = currentR;
        let sepCell = XLSX.utils.encode_cell({ r: sepR, c: 0 });
        wsSpecial[sepCell] = {
          v: "------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------",
          t: 's',
          s: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "374151" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } }
        };
        wsSpecial['!merges'].push({ s: { r: sepR, c: 0 }, e: { r: sepR, c: 29 } });
        currentR += 2;

        // Part 2: Reach Accountable (Yes)
        renderOwnerSuite(`OWNER: REACH — ACCOUNTABLE (FIELD TEAMS / TEAM ACCOUNTABILITY: YES)`, "7F1D1D", owner, 'yes', "ACCOUNTABLE");

        // Divider
        sepR = currentR;
        sepCell = XLSX.utils.encode_cell({ r: sepR, c: 0 });
        wsSpecial[sepCell] = {
          v: "------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------",
          t: 's',
          s: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "374151" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } }
        };
        wsSpecial['!merges'].push({ s: { r: sepR, c: 0 }, e: { r: sepR, c: 29 } });
        currentR += 2;

        // Part 3: Reach Non-Accountable (No)
        renderOwnerSuite(`OWNER: REACH — NON-ACCOUNTABLE (DISPATCHING, CIVIL & SUPPORT / TEAM ACCOUNTABILITY: NO)`, "065F46", owner, 'no', "NON-ACCOUNTABLE");
      } else {
        // Standard Owner
        renderOwnerSuite(`OWNER: ${owner.toUpperCase()}`, "1F2937", owner, null);
      }

      // Interceptor / Divider between Owner sections
      if (ownerIdx < topOwners.length - 1) {
        const sepR = currentR;
        const sepCell = XLSX.utils.encode_cell({ r: sepR, c: 0 });
        wsSpecial[sepCell] = {
          v: "========================================================================================================================================================================================================================",
          t: 's',
          s: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "000000" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } }
        };
        wsSpecial['!merges'].push({ s: { r: sepR, c: 0 }, e: { r: sepR, c: 29 } });
        currentR += 2;
      }
    });

    wsSpecial['!cols'] = Array(32).fill({ wch: 15 });
    wsSpecial['!cols'][0] = { wch: 25 }; // Reason / Col 0
    wsSpecial['!cols'][1] = { wch: 8 };  // Total
    wsSpecial['!cols'][2] = { wch: 25 }; // Sub-reason
    wsSpecial['!cols'][3] = { wch: 8 };  // Cases
    wsSpecial['!cols'][4] = { wch: 30 }; // RC
    wsSpecial['!cols'][5] = { wch: 8 };  // Cases
    wsSpecial['!cols'][7] = { wch: 28 }; // RC Summary Name
    wsSpecial['!cols'][8] = { wch: 8 };  // Total
    wsSpecial['!cols'][9] = { wch: 10 }; // %
    wsSpecial['!cols'][11] = { wch: 28 }; // Reason Summary Name
    wsSpecial['!cols'][12] = { wch: 8 };  // Total
    wsSpecial['!cols'][13] = { wch: 10 }; // %
    wsSpecial['!cols'][15] = { wch: 30 }; // Sub-Reason Summary Name
    wsSpecial['!cols'][16] = { wch: 8 };  // Total
    wsSpecial['!cols'][17] = { wch: 10 }; // %
    wsSpecial['!cols'][19] = { wch: 22 }; // ITN Related
    wsSpecial['!cols'][20] = { wch: 8 };  // Total
    wsSpecial['!cols'][21] = { wch: 10 }; // %
    wsSpecial['!cols'][23] = { wch: 22 }; // Subscription
    wsSpecial['!cols'][24] = { wch: 8 };  // Total
    wsSpecial['!cols'][25] = { wch: 10 }; // %
    wsSpecial['!cols'][27] = { wch: 24 }; // Team Accountability Name
    wsSpecial['!cols'][28] = { wch: 8 };  // Total
    wsSpecial['!cols'][29] = { wch: 10 }; // %
    fixSheetRange(wsSpecial);

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

    function normalizeArrayField(val) {
      if (!val) return [];
      if (Array.isArray(val)) {
        return val.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v]))
          .map(String)
          .map(s => s.trim())
          .filter(Boolean);
      }
      if (typeof val === 'string') {
        return val.split(',').map(s => s.trim()).filter(Boolean);
      }
      return [String(val).trim()].filter(Boolean);
    }


    const buildInterleavedFieldColumns = (task, fieldGroups, maxCount) => {
      const cols = {};
      for (let i = 0; i < maxCount; i += 1) {
        fieldGroups.forEach(({ field, baseName }) => {
          const values = normalizeArrayField(task[field]);
          cols[`${baseName} ${i + 1}`] = values[i] || 'N/A';
        });
      }
      return cols;
    };

    const hasOwnerAccountabilityIssue = (task, targetOwner, targetAcc = null) => {
      if (!task) return false;
      const normOwner = String(targetOwner || '').trim().toUpperCase();
      const resps = normalizeArrayField(task.responsible);
      const accs = normalizeArrayField(task.teamAccountability);
      const max = Math.max(resps.length, accs.length);

      for (let i = 0; i < max; i++) {
        let resp = resps[i] || resps[0] || 'Unknown';
        resp = String(resp).trim().toUpperCase();
        if (resp !== normOwner) continue;

        let acc = accs[i] || (accs.length > 0 ? accs[0] : 'Unknown');
        acc = String(acc).trim().toLowerCase();
        const isAccYes = acc.startsWith('yes') || acc === 'y';

        if (targetAcc === 'yes' && isAccYes) return true;
        if (targetAcc === 'no' && !isAccYes) return true;
        if (!targetAcc) return true;
      }
      return false;
    };

    function getScopedFieldStats(tasks, field, ownerFilter = null, accFilter = null) {
      const counts = {};
      let total = 0;
      const normOwner = ownerFilter ? String(ownerFilter).trim().toUpperCase() : null;

      tasks.forEach(t => {
        const resps = normalizeArrayField(t.responsible);
        const accs = normalizeArrayField(t.teamAccountability);
        const vals = normalizeArrayField(t[field]);
        const max = Math.max(resps.length, vals.length, accs.length);

        for (let i = 0; i < max; i++) {
          let resp = resps[i] || resps[0] || 'Unknown';
          resp = String(resp).trim().toUpperCase();

          if (normOwner && resp !== normOwner) continue;

          let acc = accs[i] || (accs.length > 0 ? accs[0] : 'Unknown');
          acc = String(acc).trim().toLowerCase();
          const isAccYes = acc.startsWith('yes') || acc === 'y';

          if (accFilter === 'yes' && !isAccYes) continue;
          if (accFilter === 'no' && isAccYes) continue;

          let val = vals[i] || vals[0] || 'Unknown';
          val = String(val).trim();
          if (!val) continue;

          counts[val] = (counts[val] || 0) + 1;
          total++;
        }
      });

      return Object.entries(counts).map(([name, count]) => ({
        Name: name,
        Count: count,
        Percentage: total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0%'
      })).sort((a, b) => b.Count - a.Count);
    }


    const addSubsetSummary = (ws, tasks, startR, titleColorHex, headerColorHex, ownerFilter = null, accFilter = null) => {
      if (tasks.length === 0) return startR;
      const sevStats = getSeverityStats(tasks);
      const reasonStats = getScopedFieldStats(tasks, 'reason', ownerFilter, accFilter);
      const subReasonStats = getScopedFieldStats(tasks, 'subReason', ownerFilter, accFilter);
      const rcStats = getScopedFieldStats(tasks, 'rootCause', ownerFilter, accFilter);

      addTableToSheet(ws, sevStats, XLSX.utils.encode_cell({ r: startR, c: 0 }), "SEVERITY BREAKDOWN", titleColorHex);
      addTableToSheet(ws, reasonStats, XLSX.utils.encode_cell({ r: startR, c: 4 }), "REASONS", titleColorHex);
      addTableToSheet(ws, subReasonStats, XLSX.utils.encode_cell({ r: startR, c: 8 }), "SUB-REASONS", titleColorHex);
      addTableToSheet(ws, rcStats, XLSX.utils.encode_cell({ r: startR, c: 12 }), "ROOT CAUSES", titleColorHex);

      applyHeaderStyle(ws, { s: { r: startR + 1, c: 0 }, e: { r: startR + 1, c: 2 } }, headerColorHex);
      applyHeaderStyle(ws, { s: { r: startR + 1, c: 4 }, e: { r: startR + 1, c: 6 } }, headerColorHex);
      applyHeaderStyle(ws, { s: { r: startR + 1, c: 8 }, e: { r: startR + 1, c: 10 } }, headerColorHex);
      applyHeaderStyle(ws, { s: { r: startR + 1, c: 12 }, e: { r: startR + 1, c: 14 } }, headerColorHex);

      const maxRows = Math.max(sevStats.length, reasonStats.length, subReasonStats.length, rcStats.length);
      return startR + maxRows + 3;
    };

    const getOverlapHappyUnhappy = (task) => {
      const techScore = Number(task.technicalTeamEvaluation);
      const serviceScore = Number(task.serviceEvaluation);
      const status = String(task.callStatus || '').trim().toLowerCase();
      const technicalBad = !isNaN(techScore) && techScore <= 8;
      const serviceBad = !isNaN(serviceScore) && serviceScore <= 8;
      const closureNotDone = status === 'not done';
      return technicalBad || serviceBad || closureNotDone ? 'Unhappy' : 'Happy';
    };

    const getDissatisfactionCategory = (task) => {
      return task.categoryOfDissatisfaction || 'N/A';
    };

    const getReason = (task) => {
      const formatArrayLike = (value) => {
        if (Array.isArray(value) && value.length) return value.join(', ');
        if (typeof value === 'string' && value.trim()) return value.trim();
        return null;
      };
      return formatArrayLike(task.reason) || formatArrayLike(task.rootCause) || 'N/A';
    };

    const getRootCause = (task) => {
      const formatArrayLike = (value) => {
        if (Array.isArray(value) && value.length) return value.join(', ');
        if (typeof value === 'string' && value.trim()) return value.trim();
        return null;
      };
      return formatArrayLike(task.rootCause) || 'N/A';
    };

    const getOwnership = (task) => {
      if (Array.isArray(task.responsible) && task.responsible.length) return task.responsible.join(', ');
      if (typeof task.responsible === 'string' && task.responsible.trim()) return task.responsible;
      return 'N/A';
    };

    const getTeamAccountability = (task) => {
      if (Array.isArray(task.teamAccountability) && task.teamAccountability.length) return task.teamAccountability.join(', ');
      if (typeof task.teamAccountability === 'string' && task.teamAccountability.trim()) return task.teamAccountability;
      return 'N/A';
    };

    const getFieldTeam = (task) => {
      return task.teamName || 'N/A';
    };

    const getSecondCallDispatchDate = (task) => {
      return task.secondCallDispatchDate ? format(new Date(task.secondCallDispatchDate), 'yyyy-MM-dd') : 'N/A';
    };

    const getSecondCallResolutionDate = (task) => {
      return task.secondCallResolutionDate ? format(new Date(task.secondCallResolutionDate), 'yyyy-MM-dd') : 'N/A';
    };

    const buildDvocCcOverlapRow = (task) => ({
      SLID: task.slid || 'N/A',
      'PIS Date': task.pisDate ? format(new Date(task.pisDate), 'yyyy-MM-dd') : 'N/A',
      'Ticket Status': task.status || 'N/A',
      Status: task.callStatus || 'N/A',
      Comment: task.closureComment || 'N/A',
      'Closure requested by field team': task.closureRequestedByFieldTeam || 'N/A',
      'Technical team evaluation': task.technicalTeamEvaluation || 'N/A',
      'Service evaluation': task.serviceEvaluation || 'N/A',
      'Custom question/answer fields': Array.isArray(task.customFields) && task.customFields.length > 0 ? task.customFields.map(cf => `${cf.question || 'Question'}: ${cf.answer || 'N/A'}`).join(' | ') : 'N/A',
      'Happy Vs Unhappy': getOverlapHappyUnhappy(task),
      'Category of dissatisfaction': getDissatisfactionCategory(task),
      'Second Call Initiated': task.secondCallInitiated || 'N/A',
      'Second Call Status': task.secondCallStatus || 'N/A',
      'Second Call Category': task.secondCallCategory || 'N/A',
      'Second Call Action': task.secondCallAction || 'N/A',
      'Second Call Team': task.secondCallTeam || 'N/A',
      'Second Call Dispatch Date': getSecondCallDispatchDate(task),
      'Second Call Secondary Status': task.secondCallSecondaryStatus || 'N/A',
      'Second Call Resolution Method': task.secondCallResolutionMethod || 'N/A',
      'Second Call Resolved By': task.secondCallResolvedBy || 'N/A',
      'Second Call Root Cause': task.secondCallRootCause || 'N/A',
      'Second Call Resolution Date': getSecondCallResolutionDate(task),
      'Second Call Resolved Before Survey': task.secondCallResolvedBeforeSurvey || 'N/A',
      'Customer Feedback / Comment': task.customerFeedback || 'N/A',
      'Satisfaction Score': task.evaluationScore !== null && task.evaluationScore !== 'N/A' ? task.evaluationScore : 'N/A',
      'Reason': getReason(task),
      'Root Cause': getRootCause(task),
      'Ownership': getOwnership(task),
      'Team Accountability': getTeamAccountability(task),
      'Field Team': getFieldTeam(task)
    });

    const dvocCcOverlapTasks = filteredTasks.filter(t => {
      const score = Number(t.evaluationScore);
      return !isNaN(score) && score <= 8;
    });

    const dvocCcDetractors = dvocCcOverlapTasks.filter(t => Number(t.evaluationScore) <= 6);
    const dvocCcNeutrals = dvocCcOverlapTasks.filter(t => {
      const score = Number(t.evaluationScore);
      return score >= 7 && score <= 8;
    });

    const wsDvocCcOverlap = XLSX.utils.aoa_to_sheet([[]]);
    wsDvocCcOverlap['A1'] = {
      v: `DVOC-CC OVERLAP - Period: ${periodStr}`,
      t: 's',
      s: { font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1F2937' } }, alignment: { horizontal: 'center', vertical: 'center' } }
    };
    const dvocHeaderCount = Object.keys(dvocCcDetractors.length ? dvocCcDetractors[0] : dvocCcNeutrals[0] || {}).length || 30;
    wsDvocCcOverlap['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: dvocHeaderCount - 1 } }];

    let overlapStartR = 2;

    const addDvocDeepDive = (ws, tasks, startR, title, colorHex) => {
      if (!tasks || tasks.length === 0) return startR;

      const techScores = {};
      const servScores = {};
      const teamStats = {};

      tasks.forEach(t => {
        const team = t.teamName || 'Unknown';
        if (!teamStats[team]) {
          teamStats[team] = { techSum: 0, techCount: 0, servSum: 0, servCount: 0, scores: { tech: {}, serv: {} } };
        }

        const techRaw = t.technicalTeamEvaluation;
        if (techRaw !== null && techRaw !== undefined && techRaw !== 'N/A') {
          const s = Number(techRaw);
          if (!isNaN(s)) {
            techScores[s] = (techScores[s] || 0) + 1;
            teamStats[team].techSum += s;
            teamStats[team].techCount++;
            teamStats[team].scores.tech[s] = (teamStats[team].scores.tech[s] || 0) + 1;
          }
        }

        const servRaw = t.serviceEvaluation;
        if (servRaw !== null && servRaw !== undefined && servRaw !== 'N/A') {
          const s = Number(servRaw);
          if (!isNaN(s)) {
            servScores[s] = (servScores[s] || 0) + 1;
            teamStats[team].servSum += s;
            teamStats[team].servCount++;
            teamStats[team].scores.serv[s] = (teamStats[team].scores.serv[s] || 0) + 1;
          }
        }
      });

      const buildStatsTable = (scoresObj) => {
        return Object.entries(scoresObj)
          .map(([score, count]) => ({
            'Score': Number(score),
            'Count': count,
          }))
          .sort((a, b) => b.Score - a.Score);
      };

      const techTable = buildStatsTable(techScores);
      const servTable = buildStatsTable(servScores);

      // Use fixed score values from 10 down to 1
      const allTechScores = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
      const allServScores = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

      const teamRows = Object.entries(teamStats).map(([team, stats]) => {
        const techAvg = stats.techCount > 0 ? Number((stats.techSum / stats.techCount).toFixed(1)) : 'N/A';
        const servAvg = stats.servCount > 0 ? Number((stats.servSum / stats.servCount).toFixed(1)) : 'N/A';

        const row = { 'Team': team, 'Avg Technical Score': techAvg };
        allTechScores.forEach(s => { row[`Tech ${s}`] = stats.scores.tech[s] || 0; });
        row['Avg Service Score'] = servAvg;
        allServScores.forEach(s => { row[`Serv ${s}`] = stats.scores.serv[s] || 0; });
        return row;
      }).sort((a, b) => {
        const avgA = a['Avg Technical Score'] !== 'N/A' ? Number(a['Avg Technical Score']) : 0;
        const avgB = b['Avg Technical Score'] !== 'N/A' ? Number(b['Avg Technical Score']) : 0;
        return avgB - avgA;
      });

      // Section Title
      XLSX.utils.sheet_add_aoa(ws, [[`${title} - DEEP DIVE ANALYTICS`]], { origin: XLSX.utils.encode_cell({ r: startR, c: 0 }) });
      ws[XLSX.utils.encode_cell({ r: startR, c: 0 })] = { v: `${title} - DEEP DIVE ANALYTICS`, t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 }, fill: { fgColor: { rgb: colorHex } }, alignment: { horizontal: "center", vertical: "center" } } };
      ws['!merges'].push({ s: { r: startR, c: 0 }, e: { r: startR, c: 8 } });

      let currentR = startR + 2;

      // Tech and Serv Tables side by side
      addTableToSheet(ws, techTable, XLSX.utils.encode_cell({ r: currentR, c: 0 }), "TECHNICAL EVALUATION SCORES", colorHex);
      addTableToSheet(ws, servTable, XLSX.utils.encode_cell({ r: currentR, c: 4 }), "SERVICE EVALUATION SCORES", colorHex);

      const maxScoreRows = Math.max(techTable.length, servTable.length);
      currentR += maxScoreRows + 3;

      // Team Averages Table
      addTableToSheet(ws, teamRows, XLSX.utils.encode_cell({ r: currentR, c: 0 }), "TEAM AVERAGE SCORES & BREAKDOWN", colorHex);

      const teamKeys = Object.keys(teamRows[0] || {});
      if (teamKeys.length > 0) {
        applyHeaderStyle(ws, { s: { r: currentR + 1, c: 0 }, e: { r: currentR + 1, c: teamKeys.length - 1 } }, "374151");
        applyDataRowStyle(ws, { s: { r: currentR + 1, c: 0 }, e: { r: currentR + 1 + teamRows.length, c: teamKeys.length - 1 } });
      }

      currentR += teamRows.length + 4;
      return currentR;
    };

    overlapStartR = addDvocDeepDive(wsDvocCcOverlap, dvocCcDetractors, overlapStartR, "DETRACTOR TASKS", "B91C1C");
    overlapStartR = addDvocDeepDive(wsDvocCcOverlap, dvocCcNeutrals, overlapStartR, "NEUTRAL TASKS", "D97706");
    overlapStartR = addDvocDeepDive(wsDvocCcOverlap, dvocCcOverlapTasks, overlapStartR, "COMBINED (ALL OVERLAP)", "4B5563");
    const appendOverlapSection = (title, rows, titleColor) => {
      const titleRow = overlapStartR + 1;
      const titleCell = XLSX.utils.encode_cell({ r: titleRow, c: 0 });
      wsDvocCcOverlap[titleCell] = {
        v: title,
        t: 's',
        s: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: titleColor } }, alignment: { horizontal: 'center' } }
      };
      wsDvocCcOverlap['!merges'].push({ s: { r: titleRow, c: 0 }, e: { r: titleRow, c: dvocHeaderCount - 1 } });

      const dataStartR = titleRow + 1;
      if (rows.length > 0) {
        const groupRowR = titleRow + 1;
        const headerRowR = titleRow + 2;
        const columns = Object.keys(rows[0]);

        const addGroupHeader = (label, startCol, endCol) => {
          const cell = XLSX.utils.encode_cell({ r: groupRowR, c: startCol });
          wsDvocCcOverlap[cell] = {
            v: label,
            t: 's',
            s: {
              font: { bold: true, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '9D174D' } },
              alignment: { horizontal: 'center', vertical: 'center' }
            }
          };
          wsDvocCcOverlap['!merges'].push({ s: { r: groupRowR, c: startCol }, e: { r: groupRowR, c: endCol } });
        };

        addGroupHeader('FMC Closure', 3, 10);
        addGroupHeader('Second Call initiated by Jawad', 11, 22);
        addGroupHeader('DVOC Results', 23, columns.length - 1);

        XLSX.utils.sheet_add_json(wsDvocCcOverlap, rows, { origin: XLSX.utils.encode_cell({ r: headerRowR, c: 0 }), skipHeader: false });
        const headerRange = { s: { r: headerRowR, c: 0 }, e: { r: headerRowR, c: columns.length - 1 } };
        applyHeaderStyle(wsDvocCcOverlap, headerRange, titleColor);
        applyDataRowStyle(wsDvocCcOverlap, { s: { r: headerRowR + 1, c: 0 }, e: { r: headerRowR + rows.length, c: columns.length - 1 } });
        overlapStartR = headerRowR + rows.length + 2;
      } else {
        const noDataCell = XLSX.utils.encode_cell({ r: dataStartR, c: 0 });
        wsDvocCcOverlap[noDataCell] = { v: 'No records available', t: 's', s: { font: { italic: true }, alignment: { horizontal: 'left' } } };
        overlapStartR = dataStartR + 2;
      }
    };

    appendOverlapSection('DETRACTOR TASKS', dvocCcDetractors.map(buildDvocCcOverlapRow), 'B91C1C');
    appendOverlapSection('NEUTRAL TASKS', dvocCcNeutrals.map(buildDvocCcOverlapRow), 'D97706');

    wsDvocCcOverlap['!cols'] = Array(dvocHeaderCount).fill({ wch: 22 });
    wsDvocCcOverlap['!cols'][0] = { wch: 15 };
    wsDvocCcOverlap['!cols'][1] = { wch: 14 };
    wsDvocCcOverlap['!cols'][2] = { wch: 16 };
    wsDvocCcOverlap['!cols'][3] = { wch: 16 };
    wsDvocCcOverlap['!cols'][4] = { wch: 25 };
    wsDvocCcOverlap['!cols'][5] = { wch: 26 };
    wsDvocCcOverlap['!cols'][6] = { wch: 26 };
    wsDvocCcOverlap['!cols'][7] = { wch: 24 };
    wsDvocCcOverlap['!cols'][8] = { wch: 30 };
    wsDvocCcOverlap['!cols'][9] = { wch: 40 };
    wsDvocCcOverlap['!cols'][10] = { wch: 18 };
    wsDvocCcOverlap['!cols'][11] = { wch: 30 };
    wsDvocCcOverlap['!cols'][12] = { wch: 20 };
    wsDvocCcOverlap['!cols'][13] = { wch: 20 };
    wsDvocCcOverlap['!cols'][14] = { wch: 20 };
    wsDvocCcOverlap['!cols'][15] = { wch: 20 };
    wsDvocCcOverlap['!cols'][16] = { wch: 20 };
    wsDvocCcOverlap['!cols'][17] = { wch: 20 };
    wsDvocCcOverlap['!cols'][18] = { wch: 25 };
    wsDvocCcOverlap['!cols'][19] = { wch: 25 };
    wsDvocCcOverlap['!cols'][20] = { wch: 20 };
    wsDvocCcOverlap['!cols'][21] = { wch: 25 };
    wsDvocCcOverlap['!cols'][22] = { wch: 20 };
    wsDvocCcOverlap['!cols'][23] = { wch: 25 };
    wsDvocCcOverlap['!cols'][24] = { wch: 30 };
    wsDvocCcOverlap['!cols'][25] = { wch: 20 };
    wsDvocCcOverlap['!cols'][26] = { wch: 20 };
    wsDvocCcOverlap['!cols'][27] = { wch: 20 };
    wsDvocCcOverlap['!cols'][28] = { wch: 20 };
    if (dvocHeaderCount > 29) {
      wsDvocCcOverlap['!cols'][29] = { wch: 20 };
    }
    fixSheetRange(wsDvocCcOverlap);
    // XLSX.utils.book_append_sheet(workbook, wsDvocCcOverlap, 'DVOC-CC Overlap'); // Disabled for now

    // 3.6 Detractor Special Analytics Window
    const detTasks = filteredTasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== 'N/A' && t.evaluationScore <= 6);
    const detOwnerCounts = {};
    const detOwnerDisplay = {};
    detTasks.forEach(t => {
      const resp = t.responsible;
      let values = [];
      if (Array.isArray(resp)) values = resp.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
      else if (typeof resp === 'string') values = resp.split(',').map(s => s.trim()).filter(Boolean);
      else if (resp) values = [resp];
      values.forEach(v => {
        const norm = (v || 'Unknown').toString().trim().toUpperCase();
        detOwnerDisplay[norm] = detOwnerDisplay[norm] || v;
        detOwnerCounts[norm] = (detOwnerCounts[norm] || 0) + 1;
      });
    });

    const sortedDetOwners = Object.entries(detOwnerCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const topDetOwners = sortedDetOwners; // Take all owners (normalized keys)

    const wsDetSpecial = XLSX.utils.aoa_to_sheet([[`INDIVIDUAL DETRACTOR ANALYTICS - Period: ${periodStr}`]]);
    wsDetSpecial['A1'] = { v: `INDIVIDUAL DETRACTOR ANALYTICS - Period: ${periodStr}`, t: 's', s: { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "B91C1C" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } } };
    if (!wsDetSpecial['!merges']) wsDetSpecial['!merges'] = [];
    wsDetSpecial['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 24 } });

    // 1. Overall Detractor Owner Distribution Table
    const totalDetOwnerOccurrences = Object.values(detOwnerCounts).reduce((sum, count) => sum + count, 0);
    const totalDetTasks = detTasks.length;
    const totalDetIssues = detTasks.reduce((sum, t) => {
      const val = t.reason;
      let values = [];
      if (Array.isArray(val)) {
        values = val.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
      } else if (typeof val === 'string' && val.trim()) {
        values = val.split(',').map(s => s.trim()).filter(Boolean);
      } else if (val) {
        values = [val];
      }
      return sum + values.length;
    }, 0);
    const allDetOwnersData = Object.entries(detOwnerCounts)
      .map(([name, count]) => ({
        Owner: name,
        'Detractor Count': count,
        'Share %': totalDetOwnerOccurrences > 0 ? `${((count / totalDetOwnerOccurrences) * 100).toFixed(1)}%` : "0%"
      }))
      .sort((a, b) => b['Detractor Count'] - a['Detractor Count']);

    const globalDetTree = getHierarchicalRCA(detTasks);
    const globalDetRCARows = addHierarchicalRCA(wsDetSpecial, globalDetTree, "A3", "GLOBAL ROOT CAUSE BREAKDOWN (DETRACTORS)", "1E3A8A");

    const globalDetRootCauses = getCountsWithPercent('rootCause', detTasks);
    addTableToSheet(wsDetSpecial, globalDetRootCauses, "H3", "GLOBAL ROOT CAUSE SUMMARY (DETRACTORS)", "1E3A8A");

    const ownerDistStartR = Math.max(globalDetRCARows, 4 + globalDetRootCauses.length) + 2;
    XLSX.utils.sheet_add_aoa(wsDetSpecial, [["OVERALL DETRACTOR OWNER DISTRIBUTION"]], { origin: XLSX.utils.encode_cell({ r: ownerDistStartR, c: 0 }) });
    wsDetSpecial[XLSX.utils.encode_cell({ r: ownerDistStartR, c: 0 })] = { v: "OVERALL DETRACTOR OWNER DISTRIBUTION", t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "450a0a" } }, alignment: { horizontal: "center" } } };
    wsDetSpecial['!merges'].push({ s: { r: ownerDistStartR, c: 0 }, e: { r: ownerDistStartR, c: 2 } });
    XLSX.utils.sheet_add_aoa(wsDetSpecial, [["Total Samples/Tasks", totalDetTasks], ["Total Issues Identified", totalDetIssues]], { origin: XLSX.utils.encode_cell({ r: ownerDistStartR + 1, c: 0 }) });
    XLSX.utils.sheet_add_json(wsDetSpecial, allDetOwnersData, { origin: XLSX.utils.encode_cell({ r: ownerDistStartR + 4, c: 0 }), skipHeader: false });
    applyHeaderStyle(wsDetSpecial, { s: { r: ownerDistStartR + 3, c: 0 }, e: { r: ownerDistStartR + 3, c: 2 } }, "B91C1C");
    applyDataRowStyle(wsDetSpecial, { s: { r: ownerDistStartR + 3, c: 0 }, e: { r: ownerDistStartR + 3 + allDetOwnersData.length, c: 2 } });

    // Team Accountability Distribution for Detractors
    const detTeamAccCounts = {};
    detTasks.forEach(t => {
      const accRaw = t.teamAccountability;
      let vals = [];
      if (Array.isArray(accRaw)) vals = accRaw.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
      else if (typeof accRaw === 'string') vals = accRaw.split(',').map(s => s.trim()).filter(Boolean);
      else if (accRaw) vals = [accRaw];
      if (vals.length === 0) vals = ['Unknown'];
      vals.forEach(v => { detTeamAccCounts[v] = (detTeamAccCounts[v] || 0) + 1; });
    });
    const detTeamAccTotal = Object.values(detTeamAccCounts).reduce((sum, count) => sum + count, 0);
    const detTeamAccData = Object.entries(detTeamAccCounts)
      .map(([acc, count]) => ({
        'Team Accountability': acc,
        'Detractor Count': count,
        'Share %': detTeamAccTotal > 0 ? `${((count / detTeamAccTotal) * 100).toFixed(1)}%` : "0%"
      }))
      .sort((a, b) => b['Detractor Count'] - a['Detractor Count']);

    const detAccStartR = ownerDistStartR + 5 + allDetOwnersData.length;
    XLSX.utils.sheet_add_aoa(wsDetSpecial, [["TEAM ACCOUNTABILITY DISTRIBUTION (DET)"]], { origin: XLSX.utils.encode_cell({ r: detAccStartR, c: 0 }) });
    wsDetSpecial[XLSX.utils.encode_cell({ r: detAccStartR, c: 0 })] = { v: "TEAM ACCOUNTABILITY DISTRIBUTION (DET)", t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "7F1D1D" } }, alignment: { horizontal: "center" } } };
    wsDetSpecial['!merges'].push({ s: { r: detAccStartR, c: 0 }, e: { r: detAccStartR, c: 2 } });
    XLSX.utils.sheet_add_json(wsDetSpecial, detTeamAccData, { origin: XLSX.utils.encode_cell({ r: detAccStartR + 1, c: 0 }), skipHeader: false });
    applyHeaderStyle(wsDetSpecial, { s: { r: detAccStartR + 1, c: 0 }, e: { r: detAccStartR + 1, c: 2 } }, "B91C1C");
    applyDataRowStyle(wsDetSpecial, { s: { r: detAccStartR + 1, c: 0 }, e: { r: detAccStartR + 1 + detTeamAccData.length, c: 2 } });

    let detCurrentR = Math.max(detAccStartR + detTeamAccData.length + 6, 8);

    topDetOwners.forEach((owner, ownerIdx) => {
      const ownerDisplay = detOwnerDisplay[owner] || owner;
      const ownerCell = XLSX.utils.encode_cell({ r: detCurrentR, c: 0 });
      wsDetSpecial[ownerCell] = { v: `OWNER: ${ownerDisplay.toString().toUpperCase()}`, t: 's', s: { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "7F1D1D" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } } };
      wsDetSpecial['!merges'].push({ s: { r: detCurrentR, c: 0 }, e: { r: detCurrentR, c: 24 } });

      // Issue-level statistics for this owner (Detractors)

      const getDetOwnerStats = (field, ownerKey) => {
        const counts = {};
        let ownerIssuesCount = 0;

        detTasks.forEach(t => {
          const resps = Array.isArray(t.responsible) ? t.responsible : (typeof t.responsible === 'string' ? t.responsible.split(',').map(s => s.trim()) : []);
          const vals = Array.isArray(t[field]) ? t[field] : (typeof t[field] === 'string' ? t[field].split(',').map(s => s.trim()) : []);

          const max = Math.max(resps.length, vals.length);
          for (let i = 0; i < max; i++) {
            const respRaw = resps[i] ? resps[i].toString().trim() : 'Unknown';
            const resp = respRaw.toUpperCase();
            if (resp !== ownerKey) continue;

            let val = vals[i] ? vals[i].toString().trim() : 'Unknown';
            if (field === 'teamAccountability' && ownerKey !== 'REACH') {
              val = 'No';
            }
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

      const hierarchicalTree = getHierarchicalRCA(detTasks, ownerDisplay);
      const rcSummary = getDetOwnerStats('rootCause', owner);
      const accStats = getDetOwnerStats('teamAccountability', owner);
      const itns = getDetOwnerStats('itnRelated', owner);
      const subs = getDetOwnerStats('relatedToSubscription', owner);

      const tableStartR = detCurrentR + 2;
      const nextR = addHierarchicalRCA(wsDetSpecial, hierarchicalTree, XLSX.utils.encode_cell({ r: tableStartR, c: 0 }), "ROOT CAUSE BREAKDOWN (DET)", "B91C1C");
      addTableToSheet(wsDetSpecial, rcSummary, XLSX.utils.encode_cell({ r: tableStartR, c: 7 }), "ROOT CAUSE SUMMARY (DET)", "991B1B");
      addTableToSheet(wsDetSpecial, accStats, XLSX.utils.encode_cell({ r: tableStartR, c: 11 }), "TEAM ACCOUNTABILITY (DET)", "7F1D1D");
      addTableToSheet(wsDetSpecial, itns, XLSX.utils.encode_cell({ r: tableStartR, c: 15 }), "ITN RELATED (DET)", "B91C1C");
      addTableToSheet(wsDetSpecial, subs, XLSX.utils.encode_cell({ r: tableStartR, c: 19 }), "SUBSCRIPTION (DET)", "DC2626");

      const maxSummaryCount = Math.max(rcSummary.length, accStats.length, itns.length, subs.length, 1);
      const rcaEndR = Math.max(nextR, tableStartR + maxSummaryCount + 2);

      // ── Raw data breakdown tables ───────────────────────
      const isReach = (ownerDisplay || '').toString().trim().toUpperCase() === 'REACH';
      const ownerDetTasks = detTasks.filter((task) => {
        const resps = normalizeArrayField(task.responsible);
        if (resps.length === 0 && task.responsible) {
          return String(task.responsible).trim().toUpperCase() === owner.toUpperCase();
        }
        return resps.some(r => String(r).trim().toUpperCase() === owner.toUpperCase());
      });

      const buildReachRawRows = (tasks) => {
        const maxReasonCount = Math.max(1, ...tasks.map(task => normalizeArrayField(task.reason).length));
        const maxSubReasonCount = Math.max(1, ...tasks.map(task => normalizeArrayField(task.subReason).length));
        const maxRootCauseCount = Math.max(1, ...tasks.map(task => normalizeArrayField(task.rootCause).length));
        const maxOwnershipCount = Math.max(1, ...tasks.map(task => normalizeArrayField(task.responsible).length));
        const maxItnCount = Math.max(1, ...tasks.map(task => normalizeArrayField(task.itnRelated).length));
        const maxSubRelCount = Math.max(1, ...tasks.map(task => normalizeArrayField(task.relatedToSubscription).length));
        const maxTeamAccCount = Math.max(1, ...tasks.map(task => normalizeArrayField(task.teamAccountability).length));
        const maxGroupCount = Math.max(maxReasonCount, maxSubReasonCount, maxRootCauseCount, maxOwnershipCount, maxItnCount, maxSubRelCount, maxTeamAccCount);
        const fieldGroups = [
          { field: 'reason', baseName: 'Reason' },
          { field: 'subReason', baseName: 'Sub-Reason' },
          { field: 'rootCause', baseName: 'Root Cause' },
          { field: 'responsible', baseName: 'Owner' },
          { field: 'itnRelated', baseName: 'ITN Related' },
          { field: 'relatedToSubscription', baseName: 'Related to Subscription' },
          { field: 'teamAccountability', baseName: 'Team Accountability' }
        ];

        const maxTaskTickets = Math.max(1, ...tasks.map(t => (t.tickets || []).length));

        return tasks.map(task => {
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
            'Q1-Score': task.evaluationScore !== null && task.evaluationScore !== undefined ? task.evaluationScore : 'N/A',
            'Satisfaction Category': (() => {
              if (task.evaluationScore === null || task.evaluationScore === 'N/A' || task.evaluationScore === undefined) return 'N/A';
              const score = Number(task.evaluationScore);
              if (score <= 6) return 'Detractor';
              if (score >= 7 && score <= 8) return 'Neutral';
              if (score >= 9) return 'Promoter';
              return 'N/A';
            })(),
            'Q1 - Scale Comment': task.customerFeedback || 'N/A',
            'ONT Type': task.ontType || 'N/A',
            'Free Extender': task.freeExtender || 'N/A',
            'Extender Type': task.extenderType || 'N/A',
            'Extender Count': task.extenderNumber || 0,
            'GAIA Check': task.gaiaCheck || 'N/A',
            'GAIA Content': task.gaiaContent || 'N/A',
            ...buildInterleavedFieldColumns(task, fieldGroups, maxGroupCount),
            'Field Team Name': task.teamName || 'N/A',
          };

          const sortedTickets = [...(task.tickets || [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          for (let i = 0; i < maxTaskTickets; i++) {
            baseData[`Note ${i + 1}`] = sortedTickets[i]?.note || '';
          }

          const ivDate = task.interviewDate ? new Date(task.interviewDate) : null;
          const pisDate = task.pisDate ? new Date(task.pisDate) : null;
          const closeDate = task.closeDate ? new Date(task.closeDate) : null;
          const requestDate = task.contractDate ? new Date(task.contractDate) : null;

          const interviewToPis = ivDate && pisDate ? Math.max(0, Math.round((ivDate - pisDate) / (1000 * 60 * 60 * 24))) : 'N/A';
          const pisToClose = pisDate && closeDate ? Math.max(0, Math.round((pisDate - closeDate) / (1000 * 60 * 60 * 24))) : 'N/A';
          const requestToClose = requestDate && closeDate ? Math.max(0, Math.round((closeDate - requestDate) / (1000 * 60 * 60 * 24))) : 'N/A';

          const timelineData = {
            'Request Date': task.contractDate ? format(new Date(task.contractDate), 'yyyy-MM-dd') : 'N/A',
            'FE Date': task.feDate ? format(new Date(task.feDate), 'yyyy-MM-dd') : (task.appDate ? format(new Date(task.appDate), 'yyyy-MM-dd') : 'N/A'),
            'In Date (Dispatched to Cont.)': task.inDate ? format(new Date(task.inDate), 'yyyy-MM-dd') : 'N/A',
            'Close Date': task.closeDate ? format(new Date(task.closeDate), 'yyyy-MM-dd') : 'N/A',
            'PIS Date': task.pisDate ? format(new Date(task.pisDate), 'yyyy-MM-dd') : 'N/A',
            'Interview Date': task.interviewDate ? format(new Date(task.interviewDate), 'yyyy-MM-dd') : 'N/A',
            'PIS to Interview (Days)': interviewToPis,
            'Close to PIS (Days)': pisToClose,
            'Request to Close (Days)': requestToClose,
            'Interview Week': getWeekDisplay(task.interviewDate)
          };

          return { ...baseData, ...timelineData };
        });
      };

      if (ownerDetTasks.length > 0) {
        if (isReach) {
          // ── REACH ONLY: BY TEAM ACCOUNTABILITY (NO and YES tables) ──
          const reachNoAccTasks = ownerDetTasks.filter((task) => hasOwnerAccountabilityIssue(task, 'REACH', 'no'));
          const reachYesAccTasks = ownerDetTasks.filter((task) => hasOwnerAccountabilityIssue(task, 'REACH', 'yes'));

          const rawNoAccData = buildReachRawRows(reachNoAccTasks);
          const rawYesAccData = buildReachRawRows(reachYesAccTasks);
          const maxRawCols = Math.max(24, Object.keys(rawNoAccData[0] || rawYesAccData[0] || {}).length - 1);

          // Section separator header
          const rawSectionTitleR = rcaEndR + 2;
          const rawSectionTitleCell = XLSX.utils.encode_cell({ r: rawSectionTitleR, c: 0 });
          wsDetSpecial[rawSectionTitleCell] = {
            v: `REACH RAW DATA BREAKDOWN — BY TEAM ACCOUNTABILITY`,
            t: 's',
            s: { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '450a0a' } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } }
          };
          if (!wsDetSpecial['!merges']) wsDetSpecial['!merges'] = [];
          wsDetSpecial['!merges'].push({ s: { r: rawSectionTitleR, c: 0 }, e: { r: rawSectionTitleR, c: maxRawCols } });

          let currentSectionR = rawSectionTitleR + 2;

          // Table 1: Team Accountability = No
          const noAccTitleCell = XLSX.utils.encode_cell({ r: currentSectionR, c: 0 });
          wsDetSpecial[noAccTitleCell] = {
            v: `REACH DETRACTOR RAW DATA — TEAM ACCOUNTABILITY: NO  (${rawNoAccData.length} record${rawNoAccData.length !== 1 ? 's' : ''})`,
            t: 's',
            s: { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '14532D' } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } }
          };
          wsDetSpecial['!merges'].push({ s: { r: currentSectionR, c: 0 }, e: { r: currentSectionR, c: maxRawCols } });

          if (rawNoAccData.length > 0) {
            const subsetEndR = addSubsetSummary(wsDetSpecial, reachNoAccTasks, currentSectionR + 2, "14532D", "166534", "REACH", "no");
            XLSX.utils.sheet_add_json(wsDetSpecial, rawNoAccData, { origin: XLSX.utils.encode_cell({ r: subsetEndR, c: 0 }), skipHeader: false });
            const noAccKeys = Object.keys(rawNoAccData[0]);
            applyHeaderStyle(wsDetSpecial, { s: { r: subsetEndR, c: 0 }, e: { r: subsetEndR, c: noAccKeys.length - 1 } }, '166534');
            applyDataRowStyle(wsDetSpecial, { s: { r: subsetEndR, c: 0 }, e: { r: subsetEndR + rawNoAccData.length, c: noAccKeys.length - 1 } });
            formatCommentColumnInTable(wsDetSpecial, subsetEndR + 1, subsetEndR + rawNoAccData.length, noAccKeys.indexOf('Q1 - Scale Comment') !== -1 ? noAccKeys.indexOf('Q1 - Scale Comment') : noAccKeys.indexOf('Q1-Verbatim'));
            currentSectionR = subsetEndR + rawNoAccData.length + 2;
          } else {
            currentSectionR += 2;
          }

          // Table 2: Team Accountability = Yes
          const yesAccTitleCell = XLSX.utils.encode_cell({ r: currentSectionR, c: 0 });
          wsDetSpecial[yesAccTitleCell] = {
            v: `REACH DETRACTOR RAW DATA — TEAM ACCOUNTABILITY: YES  (${rawYesAccData.length} record${rawYesAccData.length !== 1 ? 's' : ''})`,
            t: 's',
            s: { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '7F1D1D' } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } }
          };
          wsDetSpecial['!merges'].push({ s: { r: currentSectionR, c: 0 }, e: { r: currentSectionR, c: maxRawCols } });

          if (rawYesAccData.length > 0) {
            const subsetEndR = addSubsetSummary(wsDetSpecial, reachYesAccTasks, currentSectionR + 2, "7F1D1D", "B91C1C", "REACH", "yes");
            XLSX.utils.sheet_add_json(wsDetSpecial, rawYesAccData, { origin: XLSX.utils.encode_cell({ r: subsetEndR, c: 0 }), skipHeader: false });
            const yesAccKeys = Object.keys(rawYesAccData[0]);
            applyHeaderStyle(wsDetSpecial, { s: { r: subsetEndR, c: 0 }, e: { r: subsetEndR, c: yesAccKeys.length - 1 } }, 'B91C1C');
            applyDataRowStyle(wsDetSpecial, { s: { r: subsetEndR, c: 0 }, e: { r: subsetEndR + rawYesAccData.length, c: yesAccKeys.length - 1 } });
            formatCommentColumnInTable(wsDetSpecial, subsetEndR + 1, subsetEndR + rawYesAccData.length, yesAccKeys.indexOf('Q1 - Scale Comment') !== -1 ? yesAccKeys.indexOf('Q1 - Scale Comment') : yesAccKeys.indexOf('Q1-Verbatim'));
            detCurrentR = subsetEndR + rawYesAccData.length + 3;
          } else {
            detCurrentR = currentSectionR + 2;
          }
        } else {
          // ── OTHER OWNERS (e.g. OJO): STANDARD RAW DATA BREAKDOWN (NO "By Team Accountability") ──
          const rawOwnerData = buildReachRawRows(ownerDetTasks);
          const maxRawCols = Math.max(24, Object.keys(rawOwnerData[0] || {}).length - 1);
          const rawSectionTitleR = rcaEndR + 2;
          const rawSectionTitleCell = XLSX.utils.encode_cell({ r: rawSectionTitleR, c: 0 });
          wsDetSpecial[rawSectionTitleCell] = {
            v: `${ownerDisplay.toString().toUpperCase()} DETRACTOR RAW DATA BREAKDOWN  (${rawOwnerData.length} record${rawOwnerData.length !== 1 ? 's' : ''})`,
            t: 's',
            s: { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '450a0a' } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } }
          };
          if (!wsDetSpecial['!merges']) wsDetSpecial['!merges'] = [];
          wsDetSpecial['!merges'].push({ s: { r: rawSectionTitleR, c: 0 }, e: { r: rawSectionTitleR, c: maxRawCols } });

          const subsetEndR = addSubsetSummary(wsDetSpecial, ownerDetTasks, rawSectionTitleR + 2, "7F1D1D", "B91C1C", owner, null);
          XLSX.utils.sheet_add_json(wsDetSpecial, rawOwnerData, { origin: XLSX.utils.encode_cell({ r: subsetEndR, c: 0 }), skipHeader: false });
          const rawKeys = Object.keys(rawOwnerData[0]);
          applyHeaderStyle(wsDetSpecial, { s: { r: subsetEndR, c: 0 }, e: { r: subsetEndR, c: rawKeys.length - 1 } }, 'B91C1C');
          applyDataRowStyle(wsDetSpecial, { s: { r: subsetEndR, c: 0 }, e: { r: subsetEndR + rawOwnerData.length, c: rawKeys.length - 1 } });
          formatCommentColumnInTable(wsDetSpecial, subsetEndR + 1, subsetEndR + rawOwnerData.length, rawKeys.indexOf('Q1 - Scale Comment') !== -1 ? rawKeys.indexOf('Q1 - Scale Comment') : rawKeys.indexOf('Q1-Verbatim'));
          detCurrentR = subsetEndR + rawOwnerData.length + 3;
        }
      } else {
        detCurrentR = rcaEndR + 3;
      }

      // Interceptor / Divider between Owner sections
      if (ownerIdx < topDetOwners.length - 1) {
        const sepR = detCurrentR;
        const sepCell = XLSX.utils.encode_cell({ r: sepR, c: 0 });
        wsDetSpecial[sepCell] = {
          v: "------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------",
          t: 's',
          s: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "000000" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } }
        };
        wsDetSpecial['!merges'].push({ s: { r: sepR, c: 0 }, e: { r: sepR, c: 24 } });
        detCurrentR += 2;
      }
    });

    wsDetSpecial['!cols'] = Array(80).fill({ wch: 18 });
    wsDetSpecial['!cols'][0] = { wch: 20 };  // SLID / Reason
    wsDetSpecial['!cols'][1] = { wch: 15 };  // Request Number / Total
    wsDetSpecial['!cols'][2] = { wch: 22 };  // Status / Sub-Reason
    wsDetSpecial['!cols'][3] = { wch: 12 };  // Severity / Cases
    wsDetSpecial['!cols'][4] = { wch: 25 };  // Operation / RC
    wsDetSpecial['!cols'][5] = { wch: 20 };  // Tariff Name / Cases
    wsDetSpecial['!cols'][6] = { wch: 16 };  // Validation Status
    wsDetSpecial['!cols'][7] = { wch: 25 };  // Customer Name / RC Summary
    wsDetSpecial['!cols'][8] = { wch: 16 };  // Customer Type / Total
    wsDetSpecial['!cols'][9] = { wch: 16 };  // Contact Number / %
    wsDetSpecial['!cols'][10] = { wch: 18 }; // Governorate
    wsDetSpecial['!cols'][11] = { wch: 25 }; // District / Reason Summary Name
    wsDetSpecial['!cols'][12] = { wch: 10 }; // Q1-Score / Total
    wsDetSpecial['!cols'][13] = { wch: 20 }; // Satisfaction Category / %
    wsDetSpecial['!cols'][14] = { wch: 60 }; // Q1 - Scale Comment
    wsDetSpecial['!cols'][15] = { wch: 25 }; // ONT Type / Sub-Reason Summary Name
    wsDetSpecial['!cols'][16] = { wch: 14 }; // Free Extender / Total
    wsDetSpecial['!cols'][17] = { wch: 16 }; // Extender Type / %
    wsDetSpecial['!cols'][18] = { wch: 14 }; // Extender Count
    wsDetSpecial['!cols'][19] = { wch: 22 }; // GAIA Check / ITN Related Name
    wsDetSpecial['!cols'][20] = { wch: 25 }; // GAIA Content / Total
    wsDetSpecial['!cols'][21] = { wch: 10 }; // %
    wsDetSpecial['!cols'][23] = { wch: 22 }; // Subscription Name
    wsDetSpecial['!cols'][24] = { wch: 10 }; // Total
    wsDetSpecial['!cols'][25] = { wch: 10 }; // %
    fixSheetRange(wsDetSpecial);

    // 3.7 Neutral Special Analytics Window
    const neuTasks = filteredTasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== 'N/A' && t.evaluationScore >= 7 && t.evaluationScore <= 8);
    const neuOwnerCounts = {};
    const neuOwnerDisplay = {};
    neuTasks.forEach(t => {
      const resp = t.responsible;
      let values = [];
      if (Array.isArray(resp)) values = resp.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
      else if (typeof resp === 'string') values = resp.split(',').map(s => s.trim()).filter(Boolean);
      else if (resp) values = [resp];
      values.forEach(v => {
        const norm = (v || 'Unknown').toString().trim().toUpperCase();
        neuOwnerDisplay[norm] = neuOwnerDisplay[norm] || v;
        neuOwnerCounts[norm] = (neuOwnerCounts[norm] || 0) + 1;
      });
    });

    const sortedNeuOwners = Object.entries(neuOwnerCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const topNeuOwners = sortedNeuOwners; // Take all owners (normalized keys)

    const wsNeuSpecial = XLSX.utils.aoa_to_sheet([[`INDIVIDUAL NEUTRAL ANALYTICS - Period: ${periodStr}`]]);
    wsNeuSpecial['A1'] = { v: `INDIVIDUAL NEUTRAL ANALYTICS - Period: ${periodStr}`, t: 's', s: { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "D97706" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } } };
    if (!wsNeuSpecial['!merges']) wsNeuSpecial['!merges'] = [];
    wsNeuSpecial['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 24 } });

    // 1. Overall Neutral Owner Distribution Table
    const totalNeuOwnerOccurrences = Object.values(neuOwnerCounts).reduce((sum, count) => sum + count, 0);
    const totalNeuTasks = neuTasks.length;
    const totalNeuIssues = neuTasks.reduce((sum, t) => {
      const val = t.reason;
      let values = [];
      if (Array.isArray(val)) {
        values = val.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
      } else if (typeof val === 'string' && val.trim()) {
        values = val.split(',').map(s => s.trim()).filter(Boolean);
      } else if (val) {
        values = [val];
      }
      return sum + values.length;
    }, 0);
    const allNeuOwnersData = Object.entries(neuOwnerCounts)
      .map(([name, count]) => ({
        Owner: name,
        'Neutral Count': count,
        'Share %': totalNeuOwnerOccurrences > 0 ? `${((count / totalNeuOwnerOccurrences) * 100).toFixed(1)}%` : "0%"
      }))
      .sort((a, b) => b['Neutral Count'] - a['Neutral Count']);

    const globalNeuTree = getHierarchicalRCA(neuTasks);
    const globalNeuRCARows = addHierarchicalRCA(wsNeuSpecial, globalNeuTree, "A3", "GLOBAL ROOT CAUSE BREAKDOWN (NEUTRALS)", "1E3A8A");

    const globalNeuRootCauses = getCountsWithPercent('rootCause', neuTasks);
    addTableToSheet(wsNeuSpecial, globalNeuRootCauses, "H3", "GLOBAL ROOT CAUSE SUMMARY (NEUTRALS)", "1E3A8A");

    const neuOwnerDistStartR = Math.max(globalNeuRCARows, 4 + globalNeuRootCauses.length) + 2;
    XLSX.utils.sheet_add_aoa(wsNeuSpecial, [["OVERALL NEUTRAL OWNER DISTRIBUTION"]], { origin: XLSX.utils.encode_cell({ r: neuOwnerDistStartR, c: 0 }) });
    wsNeuSpecial[XLSX.utils.encode_cell({ r: neuOwnerDistStartR, c: 0 })] = { v: "OVERALL NEUTRAL OWNER DISTRIBUTION", t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "92400E" } }, alignment: { horizontal: "center" } } };
    wsNeuSpecial['!merges'].push({ s: { r: neuOwnerDistStartR, c: 0 }, e: { r: neuOwnerDistStartR, c: 2 } });
    XLSX.utils.sheet_add_aoa(wsNeuSpecial, [["Total Samples/Tasks", totalNeuTasks], ["Total Issues Identified", totalNeuIssues]], { origin: XLSX.utils.encode_cell({ r: neuOwnerDistStartR + 1, c: 0 }) });
    XLSX.utils.sheet_add_json(wsNeuSpecial, allNeuOwnersData, { origin: XLSX.utils.encode_cell({ r: neuOwnerDistStartR + 4, c: 0 }), skipHeader: false });
    applyHeaderStyle(wsNeuSpecial, { s: { r: neuOwnerDistStartR + 3, c: 0 }, e: { r: neuOwnerDistStartR + 3, c: 2 } }, "D97706");
    applyDataRowStyle(wsNeuSpecial, { s: { r: neuOwnerDistStartR + 3, c: 0 }, e: { r: neuOwnerDistStartR + 3 + allNeuOwnersData.length, c: 2 } });

    // Team Accountability Distribution for Neutrals
    const neuTeamAccCounts = {};
    neuTasks.forEach(t => {
      const accRaw = t.teamAccountability;
      let vals = [];
      if (Array.isArray(accRaw)) vals = accRaw.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
      else if (typeof accRaw === 'string') vals = accRaw.split(',').map(s => s.trim()).filter(Boolean);
      else if (accRaw) vals = [accRaw];
      if (vals.length === 0) vals = ['Unknown'];
      vals.forEach(v => { neuTeamAccCounts[v] = (neuTeamAccCounts[v] || 0) + 1; });
    });
    const neuTeamAccTotal = Object.values(neuTeamAccCounts).reduce((sum, count) => sum + count, 0);
    const neuTeamAccData = Object.entries(neuTeamAccCounts)
      .map(([acc, count]) => ({
        'Team Accountability': acc,
        'Neutral Count': count,
        'Share %': neuTeamAccTotal > 0 ? `${((count / neuTeamAccTotal) * 100).toFixed(1)}%` : "0%"
      }))
      .sort((a, b) => b['Neutral Count'] - a['Neutral Count']);

    const neuAccStartR = neuOwnerDistStartR + 5 + allNeuOwnersData.length;
    XLSX.utils.sheet_add_aoa(wsNeuSpecial, [["TEAM ACCOUNTABILITY DISTRIBUTION (NEU)"]], { origin: XLSX.utils.encode_cell({ r: neuAccStartR, c: 0 }) });
    wsNeuSpecial[XLSX.utils.encode_cell({ r: neuAccStartR, c: 0 })] = { v: "TEAM ACCOUNTABILITY DISTRIBUTION (NEU)", t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "B45309" } }, alignment: { horizontal: "center" } } };
    wsNeuSpecial['!merges'].push({ s: { r: neuAccStartR, c: 0 }, e: { r: neuAccStartR, c: 2 } });
    XLSX.utils.sheet_add_json(wsNeuSpecial, neuTeamAccData, { origin: XLSX.utils.encode_cell({ r: neuAccStartR + 1, c: 0 }), skipHeader: false });
    applyHeaderStyle(wsNeuSpecial, { s: { r: neuAccStartR + 1, c: 0 }, e: { r: neuAccStartR + 1, c: 2 } }, "D97706");
    applyDataRowStyle(wsNeuSpecial, { s: { r: neuAccStartR + 1, c: 0 }, e: { r: neuAccStartR + 1 + neuTeamAccData.length, c: 2 } });

    let neuCurrentR = Math.max(neuAccStartR + neuTeamAccData.length + 6, 8);

    topNeuOwners.forEach((owner, ownerIdx) => {
      const ownerDisplay = neuOwnerDisplay[owner] || owner;
      const ownerCell = XLSX.utils.encode_cell({ r: neuCurrentR, c: 0 });
      wsNeuSpecial[ownerCell] = { v: `OWNER: ${ownerDisplay.toString().toUpperCase()}`, t: 's', s: { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "B45309" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } } };
      wsNeuSpecial['!merges'].push({ s: { r: neuCurrentR, c: 0 }, e: { r: neuCurrentR, c: 24 } });

      // Issue-level statistics for this owner (Neutrals)

      const getNeuOwnerStats = (field, ownerKey) => {
        const counts = {};
        let ownerIssuesCount = 0;

        neuTasks.forEach(t => {
          const resps = Array.isArray(t.responsible) ? t.responsible : (typeof t.responsible === 'string' ? t.responsible.split(',').map(s => s.trim()) : []);
          const vals = Array.isArray(t[field]) ? t[field] : (typeof t[field] === 'string' ? t[field].split(',').map(s => s.trim()) : []);

          const max = Math.max(resps.length, vals.length);
          for (let i = 0; i < max; i++) {
            const respRaw = resps[i] ? resps[i].toString().trim() : 'Unknown';
            const resp = respRaw.toUpperCase();
            if (resp !== ownerKey) continue;

            let val = vals[i] ? vals[i].toString().trim() : 'Unknown';
            if (field === 'teamAccountability' && ownerKey !== 'REACH') {
              val = 'No';
            }
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

      const hierarchicalTreeData = getHierarchicalRCA(neuTasks, ownerDisplay);
      const rcSummary = getNeuOwnerStats('rootCause', owner);
      const accStats = getNeuOwnerStats('teamAccountability', owner);
      const itns = getNeuOwnerStats('itnRelated', owner);
      const subs = getNeuOwnerStats('relatedToSubscription', owner);

      const tableStartR = neuCurrentR + 2;
      const nextR = addHierarchicalRCA(wsNeuSpecial, hierarchicalTreeData, XLSX.utils.encode_cell({ r: tableStartR, c: 0 }), "ROOT CAUSE BREAKDOWN (NEU)", "D97706");
      addTableToSheet(wsNeuSpecial, rcSummary, XLSX.utils.encode_cell({ r: tableStartR, c: 7 }), "ROOT CAUSE SUMMARY (NEU)", "92400E");
      addTableToSheet(wsNeuSpecial, accStats, XLSX.utils.encode_cell({ r: tableStartR, c: 11 }), "TEAM ACCOUNTABILITY (NEU)", "78350F");
      addTableToSheet(wsNeuSpecial, itns, XLSX.utils.encode_cell({ r: tableStartR, c: 15 }), "ITN RELATED (NEU)", "B45309");
      addTableToSheet(wsNeuSpecial, subs, XLSX.utils.encode_cell({ r: tableStartR, c: 19 }), "SUBSCRIPTION (NEU)", "92400E");

      const maxSummaryCount = Math.max(rcSummary.length, accStats.length, itns.length, subs.length, 1);
      const rcaEndR = Math.max(nextR, tableStartR + maxSummaryCount + 2);

      // ── Raw data breakdown tables ───────────────────────
      const isReach = (ownerDisplay || '').toString().trim().toUpperCase() === 'REACH';
      const ownerNeuTasks = neuTasks.filter((task) => {
        const resps = normalizeArrayField(task.responsible);
        if (resps.length === 0 && task.responsible) {
          return String(task.responsible).trim().toUpperCase() === owner.toUpperCase();
        }
        return resps.some(r => String(r).trim().toUpperCase() === owner.toUpperCase());
      });

      const buildReachRawRows = (tasks) => {
        const maxReasonCount = Math.max(1, ...tasks.map(task => normalizeArrayField(task.reason).length));
        const maxSubReasonCount = Math.max(1, ...tasks.map(task => normalizeArrayField(task.subReason).length));
        const maxRootCauseCount = Math.max(1, ...tasks.map(task => normalizeArrayField(task.rootCause).length));
        const maxOwnershipCount = Math.max(1, ...tasks.map(task => normalizeArrayField(task.responsible).length));
        const maxItnCount = Math.max(1, ...tasks.map(task => normalizeArrayField(task.itnRelated).length));
        const maxSubRelCount = Math.max(1, ...tasks.map(task => normalizeArrayField(task.relatedToSubscription).length));
        const maxTeamAccCount = Math.max(1, ...tasks.map(task => normalizeArrayField(task.teamAccountability).length));
        const maxGroupCount = Math.max(maxReasonCount, maxSubReasonCount, maxRootCauseCount, maxOwnershipCount, maxItnCount, maxSubRelCount, maxTeamAccCount);
        const fieldGroups = [
          { field: 'reason', baseName: 'Reason' },
          { field: 'subReason', baseName: 'Sub-Reason' },
          { field: 'rootCause', baseName: 'Root Cause' },
          { field: 'responsible', baseName: 'Owner' },
          { field: 'itnRelated', baseName: 'ITN Related' },
          { field: 'relatedToSubscription', baseName: 'Related to Subscription' },
          { field: 'teamAccountability', baseName: 'Team Accountability' }
        ];

        const maxTaskTickets = Math.max(1, ...tasks.map(t => (t.tickets || []).length));

        return tasks.map(task => {
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
            'Q1-Score': task.evaluationScore !== null && task.evaluationScore !== undefined ? task.evaluationScore : 'N/A',
            'Satisfaction Category': (() => {
              if (task.evaluationScore === null || task.evaluationScore === 'N/A' || task.evaluationScore === undefined) return 'N/A';
              const score = Number(task.evaluationScore);
              if (score <= 6) return 'Detractor';
              if (score >= 7 && score <= 8) return 'Neutral';
              if (score >= 9) return 'Promoter';
              return 'N/A';
            })(),
            'Q1 - Scale Comment': task.customerFeedback || 'N/A',
            'ONT Type': task.ontType || 'N/A',
            'Free Extender': task.freeExtender || 'N/A',
            'Extender Type': task.extenderType || 'N/A',
            'Extender Count': task.extenderNumber || 0,
            'GAIA Check': task.gaiaCheck || 'N/A',
            'GAIA Content': task.gaiaContent || 'N/A',
            ...buildInterleavedFieldColumns(task, fieldGroups, maxGroupCount),
            'Field Team Name': task.teamName || 'N/A',
          };

          const sortedTickets = [...(task.tickets || [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          for (let i = 0; i < maxTaskTickets; i++) {
            baseData[`Note ${i + 1}`] = sortedTickets[i]?.note || '';
          }

          const ivDate = task.interviewDate ? new Date(task.interviewDate) : null;
          const pisDate = task.pisDate ? new Date(task.pisDate) : null;
          const closeDate = task.closeDate ? new Date(task.closeDate) : null;
          const requestDate = task.contractDate ? new Date(task.contractDate) : null;

          const interviewToPis = ivDate && pisDate ? Math.max(0, Math.round((ivDate - pisDate) / (1000 * 60 * 60 * 24))) : 'N/A';
          const pisToClose = pisDate && closeDate ? Math.max(0, Math.round((pisDate - closeDate) / (1000 * 60 * 60 * 24))) : 'N/A';
          const requestToClose = requestDate && closeDate ? Math.max(0, Math.round((closeDate - requestDate) / (1000 * 60 * 60 * 24))) : 'N/A';

          const timelineData = {
            'Request Date': task.contractDate ? format(new Date(task.contractDate), 'yyyy-MM-dd') : 'N/A',
            'FE Date': task.feDate ? format(new Date(task.feDate), 'yyyy-MM-dd') : (task.appDate ? format(new Date(task.appDate), 'yyyy-MM-dd') : 'N/A'),
            'In Date (Dispatched to Cont.)': task.inDate ? format(new Date(task.inDate), 'yyyy-MM-dd') : 'N/A',
            'Close Date': task.closeDate ? format(new Date(task.closeDate), 'yyyy-MM-dd') : 'N/A',
            'PIS Date': task.pisDate ? format(new Date(task.pisDate), 'yyyy-MM-dd') : 'N/A',
            'Interview Date': task.interviewDate ? format(new Date(task.interviewDate), 'yyyy-MM-dd') : 'N/A',
            'PIS to Interview (Days)': interviewToPis,
            'Close to PIS (Days)': pisToClose,
            'Request to Close (Days)': requestToClose,
            'Interview Week': getWeekDisplay(task.interviewDate)
          };

          return { ...baseData, ...timelineData };
        });
      };

      if (ownerNeuTasks.length > 0) {
        if (isReach) {
          // ── REACH ONLY: BY TEAM ACCOUNTABILITY (NO and YES tables) ──
          const reachNoAccTasks = ownerNeuTasks.filter((task) => hasOwnerAccountabilityIssue(task, 'REACH', 'no'));
          const reachYesAccTasks = ownerNeuTasks.filter((task) => hasOwnerAccountabilityIssue(task, 'REACH', 'yes'));

          const rawNoAccData = buildReachRawRows(reachNoAccTasks);
          const rawYesAccData = buildReachRawRows(reachYesAccTasks);
          const maxRawCols = Math.max(24, Object.keys(rawNoAccData[0] || rawYesAccData[0] || {}).length - 1);

          // Section separator header
          const rawSectionTitleR = rcaEndR + 2;
          const rawSectionTitleCell = XLSX.utils.encode_cell({ r: rawSectionTitleR, c: 0 });
          wsNeuSpecial[rawSectionTitleCell] = {
            v: `REACH RAW DATA BREAKDOWN — BY TEAM ACCOUNTABILITY`,
            t: 's',
            s: { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '78350f' } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } }
          };
          if (!wsNeuSpecial['!merges']) wsNeuSpecial['!merges'] = [];
          wsNeuSpecial['!merges'].push({ s: { r: rawSectionTitleR, c: 0 }, e: { r: rawSectionTitleR, c: maxRawCols } });

          let currentSectionR = rawSectionTitleR + 2;

          // Table 1: Team Accountability = No
          const noAccTitleCell = XLSX.utils.encode_cell({ r: currentSectionR, c: 0 });
          wsNeuSpecial[noAccTitleCell] = {
            v: `REACH NEUTRAL RAW DATA — TEAM ACCOUNTABILITY: NO  (${rawNoAccData.length} record${rawNoAccData.length !== 1 ? 's' : ''})`,
            t: 's',
            s: { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '14532D' } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } }
          };
          wsNeuSpecial['!merges'].push({ s: { r: currentSectionR, c: 0 }, e: { r: currentSectionR, c: maxRawCols } });

          if (rawNoAccData.length > 0) {
            const subsetEndR = addSubsetSummary(wsNeuSpecial, reachNoAccTasks, currentSectionR + 2, "14532D", "166534", "REACH", "no");
            XLSX.utils.sheet_add_json(wsNeuSpecial, rawNoAccData, { origin: XLSX.utils.encode_cell({ r: subsetEndR, c: 0 }), skipHeader: false });
            const noAccKeys = Object.keys(rawNoAccData[0]);
            applyHeaderStyle(wsNeuSpecial, { s: { r: subsetEndR, c: 0 }, e: { r: subsetEndR, c: noAccKeys.length - 1 } }, '166534');
            applyDataRowStyle(wsNeuSpecial, { s: { r: subsetEndR, c: 0 }, e: { r: subsetEndR + rawNoAccData.length, c: noAccKeys.length - 1 } });
            formatCommentColumnInTable(wsNeuSpecial, subsetEndR + 1, subsetEndR + rawNoAccData.length, noAccKeys.indexOf('Q1 - Scale Comment') !== -1 ? noAccKeys.indexOf('Q1 - Scale Comment') : noAccKeys.indexOf('Q1-Verbatim'));
            currentSectionR = subsetEndR + rawNoAccData.length + 2;
          } else {
            currentSectionR += 2;
          }

          // Table 2: Team Accountability = Yes
          const yesAccTitleCell = XLSX.utils.encode_cell({ r: currentSectionR, c: 0 });
          wsNeuSpecial[yesAccTitleCell] = {
            v: `REACH NEUTRAL RAW DATA — TEAM ACCOUNTABILITY: YES  (${rawYesAccData.length} record${rawYesAccData.length !== 1 ? 's' : ''})`,
            t: 's',
            s: { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '92400E' } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } }
          };
          wsNeuSpecial['!merges'].push({ s: { r: currentSectionR, c: 0 }, e: { r: currentSectionR, c: maxRawCols } });

          if (rawYesAccData.length > 0) {
            const subsetEndR = addSubsetSummary(wsNeuSpecial, reachYesAccTasks, currentSectionR + 2, "92400E", "B45309", "REACH", "yes");
            XLSX.utils.sheet_add_json(wsNeuSpecial, rawYesAccData, { origin: XLSX.utils.encode_cell({ r: subsetEndR, c: 0 }), skipHeader: false });
            const yesAccKeys = Object.keys(rawYesAccData[0]);
            applyHeaderStyle(wsNeuSpecial, { s: { r: subsetEndR, c: 0 }, e: { r: subsetEndR, c: yesAccKeys.length - 1 } }, 'B45309');
            applyDataRowStyle(wsNeuSpecial, { s: { r: subsetEndR, c: 0 }, e: { r: subsetEndR + rawYesAccData.length, c: yesAccKeys.length - 1 } });
            formatCommentColumnInTable(wsNeuSpecial, subsetEndR + 1, subsetEndR + rawYesAccData.length, yesAccKeys.indexOf('Q1 - Scale Comment') !== -1 ? yesAccKeys.indexOf('Q1 - Scale Comment') : yesAccKeys.indexOf('Q1-Verbatim'));
            neuCurrentR = subsetEndR + rawYesAccData.length + 3;
          } else {
            neuCurrentR = currentSectionR + 2;
          }
        } else {
          // ── OTHER OWNERS (e.g. OJO): STANDARD RAW DATA BREAKDOWN (NO "By Team Accountability") ──
          const rawOwnerData = buildReachRawRows(ownerNeuTasks);
          const maxRawCols = Math.max(24, Object.keys(rawOwnerData[0] || {}).length - 1);
          const rawSectionTitleR = rcaEndR + 2;
          const rawSectionTitleCell = XLSX.utils.encode_cell({ r: rawSectionTitleR, c: 0 });
          wsNeuSpecial[rawSectionTitleCell] = {
            v: `${ownerDisplay.toString().toUpperCase()} NEUTRAL RAW DATA BREAKDOWN  (${rawOwnerData.length} record${rawOwnerData.length !== 1 ? 's' : ''})`,
            t: 's',
            s: { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '78350f' } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } }
          };
          if (!wsNeuSpecial['!merges']) wsNeuSpecial['!merges'] = [];
          wsNeuSpecial['!merges'].push({ s: { r: rawSectionTitleR, c: 0 }, e: { r: rawSectionTitleR, c: maxRawCols } });

          const subsetEndR = addSubsetSummary(wsNeuSpecial, ownerNeuTasks, rawSectionTitleR + 2, "78350F", "92400E", owner, null);
          XLSX.utils.sheet_add_json(wsNeuSpecial, rawOwnerData, { origin: XLSX.utils.encode_cell({ r: subsetEndR, c: 0 }), skipHeader: false });
          const rawKeys = Object.keys(rawOwnerData[0]);
          applyHeaderStyle(wsNeuSpecial, { s: { r: subsetEndR, c: 0 }, e: { r: subsetEndR, c: rawKeys.length - 1 } }, '92400E');
          applyDataRowStyle(wsNeuSpecial, { s: { r: subsetEndR, c: 0 }, e: { r: subsetEndR + rawOwnerData.length, c: rawKeys.length - 1 } });
          formatCommentColumnInTable(wsNeuSpecial, subsetEndR + 1, subsetEndR + rawOwnerData.length, rawKeys.indexOf('Q1 - Scale Comment') !== -1 ? rawKeys.indexOf('Q1 - Scale Comment') : rawKeys.indexOf('Q1-Verbatim'));
          neuCurrentR = subsetEndR + rawOwnerData.length + 3;
        }
      } else {
        neuCurrentR = rcaEndR + 3;
      }

      // Interceptor / Divider between Owner sections
      if (ownerIdx < topNeuOwners.length - 1) {
        const sepR = neuCurrentR;
        const sepCell = XLSX.utils.encode_cell({ r: sepR, c: 0 });
        wsNeuSpecial[sepCell] = {
          v: "------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------",
          t: 's',
          s: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "000000" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } }
        };
        wsNeuSpecial['!merges'].push({ s: { r: sepR, c: 0 }, e: { r: sepR, c: 24 } });
        neuCurrentR += 2;
      }
    });

    wsNeuSpecial['!cols'] = Array(80).fill({ wch: 18 });
    wsNeuSpecial['!cols'][0] = { wch: 20 };  // SLID / Reason
    wsNeuSpecial['!cols'][1] = { wch: 15 };  // Request Number / Total
    wsNeuSpecial['!cols'][2] = { wch: 22 };  // Status / Sub-Reason
    wsNeuSpecial['!cols'][3] = { wch: 12 };  // Severity / Cases
    wsNeuSpecial['!cols'][4] = { wch: 25 };  // Operation / RC
    wsNeuSpecial['!cols'][5] = { wch: 20 };  // Tariff Name / Cases
    wsNeuSpecial['!cols'][6] = { wch: 16 };  // Validation Status
    wsNeuSpecial['!cols'][7] = { wch: 25 };  // Customer Name / RC Summary
    wsNeuSpecial['!cols'][8] = { wch: 16 };  // Customer Type / Total
    wsNeuSpecial['!cols'][9] = { wch: 16 };  // Contact Number / %
    wsNeuSpecial['!cols'][10] = { wch: 18 }; // Governorate
    wsNeuSpecial['!cols'][11] = { wch: 25 }; // District / Reason Summary Name
    wsNeuSpecial['!cols'][12] = { wch: 10 }; // Q1-Score / Total
    wsNeuSpecial['!cols'][13] = { wch: 20 }; // Satisfaction Category / %
    wsNeuSpecial['!cols'][14] = { wch: 60 }; // Q1 - Scale Comment
    wsNeuSpecial['!cols'][15] = { wch: 25 }; // ONT Type / Sub-Reason Summary Name
    wsNeuSpecial['!cols'][16] = { wch: 14 }; // Free Extender / Total
    wsNeuSpecial['!cols'][17] = { wch: 16 }; // Extender Type / %
    wsNeuSpecial['!cols'][18] = { wch: 14 }; // Extender Count
    wsNeuSpecial['!cols'][19] = { wch: 22 }; // GAIA Check / ITN Related Name
    wsNeuSpecial['!cols'][20] = { wch: 25 }; // GAIA Content / Total
    wsNeuSpecial['!cols'][21] = { wch: 10 }; // %
    wsNeuSpecial['!cols'][23] = { wch: 22 }; // Subscription Name
    wsNeuSpecial['!cols'][24] = { wch: 10 }; // Total
    wsNeuSpecial['!cols'][25] = { wch: 10 }; // %
    fixSheetRange(wsNeuSpecial);


    // 4. Team Performance Sheet & Team Monthly Samples Token
    let fieldTeams = [];
    let allTeamSamples = [];
    let allQuizResults = [];
    let allOtjAssessments = [];
    let allLabAssessments = [];
    let allTrainingSessions = [];

    try {
      // Determine relevant export year(s)
      let exportYears = [new Date().getFullYear()];
      if (dateFilter.type !== 'all' && dateFilter.start) {
        const startYr = new Date(dateFilter.start).getFullYear();
        const endYr = dateFilter.end ? new Date(dateFilter.end).getFullYear() : startYr;
        exportYears = Array.from(new Set([startYr, endYr]));
      } else if (filteredTasks.length > 0) {
        const taskYears = filteredTasks.map(t => {
          const raw = t.interviewDate || t.pisDate || t.createdAt;
          return raw ? new Date(raw).getFullYear() : null;
        }).filter(Boolean);
        if (taskYears.length > 0) {
          exportYears = Array.from(new Set(taskYears));
        }
      }

      // Inline fetch for field teams, team samples, assessments, and training sessions
      const [
        { data: ftData },
        quizResponse,
        otjResponse,
        labResponse,
        trainingResponse,
        ...tsResponses
      ] = await Promise.all([
        api.get('/field-teams/get-field-teams').catch(() => ({ data: [] })),
        api.get('/quiz-results').catch(() => ({ data: [] })),
        api.get('/on-the-job-assessments').catch(() => ({ data: [] })),
        api.get('/lab-assessments').catch(() => ({ data: [] })),
        api.get('/training-sessions').catch(() => ({ data: [] })),
        ...exportYears.map(yr => api.get(`/samples-token/team-samples/${yr}`).catch(() => ({ data: [] })))
      ]);

      const rawFieldTeams = ftData || [];
      const isTeamActive = (t) => t && !t.isTerminated && !t.isResigned && !t.isSuspended && !t.isOnLeave && t.isActive !== false;
      fieldTeams = rawFieldTeams.filter(isTeamActive);

      allTeamSamples = tsResponses.flatMap(r => r.data || []);
      allQuizResults = Array.isArray(quizResponse?.data)
        ? quizResponse.data
        : (Array.isArray(quizResponse?.data?.data) ? quizResponse.data.data : []);
      allOtjAssessments = Array.isArray(otjResponse?.data)
        ? otjResponse.data
        : (Array.isArray(otjResponse?.data?.data) ? otjResponse.data.data : []);
      allLabAssessments = Array.isArray(labResponse?.data)
        ? labResponse.data
        : (Array.isArray(labResponse?.data?.data) ? labResponse.data.data : []);
      allTrainingSessions = Array.isArray(trainingResponse?.data)
        ? trainingResponse.data
        : (Array.isArray(trainingResponse?.data?.data) ? trainingResponse.data.data : []);
    } catch (e) {
      console.error("Failed to fetch field teams, assessments, or training sessions for export", e);
    }

    const activeTeamNamesSet = new Set(fieldTeams.map(ft => (ft.teamName || '').trim().replace(/\s+/g, ' ').toLowerCase()));
    const activeTeamIdsSet = new Set(fieldTeams.map(ft => ft._id?.toString()).filter(Boolean));
    const isTeamNameOrIdActive = (tName, tId) => {
      const normName = (tName || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const idStr = tId ? tId.toString() : '';
      return (normName && activeTeamNamesSet.has(normName)) || (idStr && activeTeamIdsSet.has(idStr));
    };

    const teamPerfData = [];
    const cohortAggregates = {};
    const trainingAggregates = {
      'Trained': { Count: 0, Tasks: 0, Reach: 0, DetReach: 0, NeuReach: 0 },
      'Untrained': { Count: 0, Tasks: 0, Reach: 0, DetReach: 0, NeuReach: 0 }
    };

    const otjLatestAssessments = {};
    const theoreticalLatestById = {};
    const theoreticalLatestByName = {};
    const normalizeTeamName = (value) => value ? String(value).trim().replace(/\s+/g, ' ').toLowerCase() : null;
    const parseScoreValue = (score) => {
      if (score === null || score === undefined) return null;
      if (typeof score === 'string') {
        const parsed = Number(score.replace(/[^0-9.-]+/g, ''));
        return Number.isNaN(parsed) ? null : parsed;
      }
      const numeric = Number(score);
      return Number.isNaN(numeric) ? null : numeric;
    };
    const formatScoreValue = (score) => {
      if (score === null || score === undefined || Number.isNaN(Number(score))) return 'N/A';
      return `${Math.round(Number(score))}%`;
    };

    const setTheoreticalScore = (map, key, entry) => {
      if (!key || !entry) return;
      const existing = map[key];
      if (!existing || !existing.date || (entry.date && existing.date && entry.date > existing.date)) {
        map[key] = entry;
      }
    };

    if (Array.isArray(allOtjAssessments)) {
      allOtjAssessments.forEach(assessment => {
        if (!assessment || assessment.isDeleted || assessment.status !== 'Completed') return;
        const assessmentDate = assessment.assessmentDate ? new Date(assessment.assessmentDate) : null;
        if (!assessmentDate || Number.isNaN(assessmentDate.getTime())) return;

        const score = assessment.overallScore !== undefined && assessment.overallScore !== null
          ? Number(assessment.overallScore)
          : null;
        if (score === null || Number.isNaN(score)) return;

        const idKey = assessment.fieldTeamId?._id?.toString();
        const nameKey = normalizeTeamName(assessment.fieldTeamName || assessment.fieldTeamId?.teamName);
        const trySetLatest = (key) => {
          if (!key) return;
          const existing = otjLatestAssessments[key];
          if (!existing || assessmentDate > existing.date) {
            otjLatestAssessments[key] = { score, date: assessmentDate };
          }
        };

        trySetLatest(idKey);
        trySetLatest(nameKey);
      });
    }

    if (Array.isArray(allQuizResults)) {
      allQuizResults.forEach(result => {
        if (!result) return;
        const scoreValue = result.percentage ?? result.score ?? null;
        const parsedScore = parseScoreValue(scoreValue);
        if (parsedScore === null) return;

        const submittedAt = result.submittedAt ? new Date(result.submittedAt) : (result.createdAt ? new Date(result.createdAt) : null);
        const resultDate = submittedAt && !Number.isNaN(submittedAt.getTime()) ? submittedAt : null;
        const scoreData = { score: parsedScore, date: resultDate, teamName: result.teamName };

        const idKey = result.teamId?._id?.toString() || result.teamId?.toString();
        const nameKey = normalizeTeamName(result.teamName);

        setTheoreticalScore(theoreticalLatestById, idKey, scoreData);
        setTheoreticalScore(theoreticalLatestByName, nameKey, scoreData);
      });
    }

    // Helper function to apply proportional rounding (ensures percentages sum to 100%)
    const getProportionalRounding = (values, total) => {
      if (!values || values.length === 0 || !total || total <= 0) {
        return (values || []).map(() => 0);
      }

      const valSum = values.reduce((a, b) => a + (Number(b) || 0), 0);
      if (valSum === 0) {
        return values.map(() => 0);
      }

      const percentages = values.map(v => ((Number(v) || 0) / total) * 100);
      const integers = percentages.map(p => Math.floor(p));
      const remainders = percentages.map((p, i) => ({
        index: i,
        remainder: p - integers[i]
      }));

      // Only perform largest-remainder rounding adjustment if values actually represent the complete partition of total
      if (Math.round(valSum) === Math.round(total)) {
        const intSum = integers.reduce((a, b) => a + b, 0);
        const diff = 100 - intSum;

        remainders.sort((a, b) => b.remainder - a.remainder);
        for (let i = 0; i < diff && i < remainders.length; i++) {
          if (remainders[i] && integers[remainders[i].index] !== undefined) {
            integers[remainders[i].index]++;
          }
        }
        return integers;
      }

      // If values do not sum to total (e.g. subset/cohorts), use standard rounding
      return percentages.map(p => Math.round(p));
    };

    const isTaskAccountable = (t) => {
      if (!t) return false;
      const acc = t.teamAccountability;
      if (Array.isArray(acc)) {
        return acc.some(v => v && (String(v).trim().toLowerCase().startsWith('yes') || String(v).trim().toLowerCase() === 'y'));
      }
      if (typeof acc === 'string') {
        return acc.trim().toLowerCase().startsWith('yes') || acc.trim().toLowerCase() === 'y';
      }
      return false;
    };

    const getTaskInterviewDate = (task) => {
      if (!task) return null;
      const raw = task.interviewDate || task.pisDate || task.createdAt || task.closeDate || task.contractDate;
      if (!raw) return null;
      if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
        if (dmyMatch) {
          const day = parseInt(dmyMatch[1], 10);
          const month = parseInt(dmyMatch[2], 10) - 1;
          const year = parseInt(dmyMatch[3], 10);
          const d = new Date(year, month, day);
          if (!Number.isNaN(d.getTime())) return d;
        }
        const ymdMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
        if (ymdMatch) {
          const year = parseInt(ymdMatch[1], 10);
          const month = parseInt(ymdMatch[2], 10) - 1;
          const day = parseInt(ymdMatch[3], 10);
          const d = new Date(year, month, day);
          if (!Number.isNaN(d.getTime())) return d;
        }
      }
      const d = new Date(raw);
      return !Number.isNaN(d.getTime()) ? d : null;
    };

    const globalTotalAcc = filteredTasks.filter(t => isTaskAccountable(t)).length;
    const globalDetAcc = filteredTasks.filter(t => {
      const score = t.evaluationScore || 0;
      const normalized = score <= 10 ? score * 10 : score;
      return normalized > 0 && normalized <= 60 && isTaskAccountable(t);
    }).length;

    // Helpers for Team Performance & Samples Token
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

    // Helper to get initial team token samples for the export period
    const getTeamTokenForPeriod = (teamName) => {
      const normT = (teamName || '').trim().toLowerCase();
      const matches = allTeamSamples.filter(s => (s.teamName || '').trim().toLowerCase() === normT);
      if (matches.length === 0) return 0;

      // 1. If explicit month & year filter
      if (dateFilter?.type === 'month' && dateFilter.month && dateFilter.year) {
        const targetM = Number(dateFilter.month);
        const targetY = Number(dateFilter.year);
        const m = matches.find(s => Number(s.month) === targetM && Number(s.year) === targetY);
        return m ? (parseFloat(m.sampleSize) || 0) : 0;
      }

      // 2. If date range (e.g. 01/06/2026 - 30/06/2026)
      if (dateFilter?.type !== 'all' && dateFilter?.start && dateFilter?.end) {
        const startD = new Date(dateFilter.start);
        const endD = new Date(dateFilter.end);
        const startM = startD.getMonth() + 1;
        const startY = startD.getFullYear();
        const endM = endD.getMonth() + 1;
        const endY = endD.getFullYear();

        const filteredMatches = matches.filter(s => {
          const sDate = new Date(s.year, s.month - 1, 15);
          return sDate >= new Date(startY, startM - 1, 1) && sDate <= new Date(endY, endM, 0);
        });
        return filteredMatches.reduce((sum, s) => sum + (parseFloat(s.sampleSize) || 0), 0);
      }

      // 3. Check months present in filteredTasks
      const taskMonths = new Set();
      filteredTasks.forEach(t => {
        const rawDate = t.interviewDate || t.pisDate || t.createdAt;
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            taskMonths.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
          }
        }
      });

      if (taskMonths.size > 0) {
        const periodMatches = matches.filter(s => taskMonths.has(`${s.year}-${s.month}`));
        if (periodMatches.length > 0) {
          return periodMatches.reduce((sum, s) => sum + (parseFloat(s.sampleSize) || 0), 0);
        }
      }

      return matches.reduce((sum, s) => sum + (parseFloat(s.sampleSize) || 0), 0);
    };

    // Group tasks by teamName and initialize all active field teams & configured sample teams
    const teamStatsMap = {};

    // 1. Initialize registered active field teams
    fieldTeams.forEach(ft => {
      const tName = ft.teamName?.trim();
      if (tName && !teamStatsMap[tName]) {
        teamStatsMap[tName] = { teamName: tName, tasks: [], teamId: ft._id?.toString() || null };
      }
    });

    // 2. Initialize teams present in sample tokens (active only)
    allTeamSamples.forEach(st => {
      const tName = st.teamName?.trim();
      const tId = st.teamId?.toString() || null;
      if (tName && isTeamNameOrIdActive(tName, tId) && !teamStatsMap[tName]) {
        teamStatsMap[tName] = { teamName: tName, tasks: [], teamId: tId };
      }
    });

    // 3. Map filteredTasks to their corresponding team (active only)
    filteredTasks.forEach(t => {
      const teamName = t.teamName?.trim();
      const teamId = t.teamId?._id?.toString() || t.teamId?.toString() || null;
      if (teamName && isTeamNameOrIdActive(teamName, teamId)) {
        if (!teamStatsMap[teamName]) {
          teamStatsMap[teamName] = { teamName, tasks: [], teamId };
        }
        if (!teamStatsMap[teamName].teamId && teamId) {
          teamStatsMap[teamName].teamId = teamId;
        }
        teamStatsMap[teamName].tasks.push(t);
      }
    });

    const teamTotalAccByTeamName = Object.values(teamStatsMap).reduce((sum, ts) => {
      return sum + ts.tasks.filter(t => isTaskAccountable(t)).length;
    }, 0);
    const denomTotalAcc = teamTotalAccByTeamName > 0 ? teamTotalAccByTeamName : globalTotalAcc;

    const otjAggregates = {
      'With OTJ': { 'OTJ Status': 'With OTJ', 'Team Count': 0, 'Total Tasks': 0, 'Total Acc.': 0, 'Acc. Det.': 0, 'Acc. Neu.': 0 },
      'Without OTJ': { 'OTJ Status': 'Without OTJ', 'Team Count': 0, 'Total Tasks': 0, 'Total Acc.': 0, 'Acc. Det.': 0, 'Acc. Neu.': 0 }
    };

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

      const otjScoreKey = teamDoc?._id?.toString() || normalizeTeamName(ts.teamName);
      const otjScoreEntry = otjScoreKey ? otjLatestAssessments[otjScoreKey] : null;
      const otjAssessmentScore = otjScoreEntry ? formatScoreValue(otjScoreEntry.score) : 'N/A';

      const teamGroupId = ts.teamId || teamDoc?._id?.toString();
      const theoreticalScoreById = teamGroupId ? theoreticalLatestById[teamGroupId] : null;
      const theoreticalScoreByName = normalizeTeamName(ts.teamName) ? theoreticalLatestByName[normalizeTeamName(ts.teamName)] : null;
      const theoreticalScoreEntry = theoreticalScoreById || theoreticalScoreByName || Object.values(theoreticalLatestByName).find(entry => entry && normalizeTeamName(entry.teamName) === normalizeTeamName(ts.teamName));
      const theoreticalAssessmentScore = theoreticalScoreEntry ? formatScoreValue(theoreticalScoreEntry.score) : 'N/A';

      const totalTasks = ts.tasks.length;
      const reachCount = ts.tasks.filter(t => isTaskAccountable(t)).length;

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
        return normalized >= 0 && normalized <= 60 && isTaskAccountable(t);
      }).length;
      const reachNeutrals = ts.tasks.filter(t => {
        const score = t.evaluationScore;
        if (score === null || score === 'N/A') return false;
        const normalized = score <= 10 ? score * 10 : score;
        return normalized > 60 && normalized <= 80 && isTaskAccountable(t);
      }).length;

      // Sample tokens and non-accountable deduction calculations
      const nonAccDetractors = teamDetractors - reachDetractors;
      const nonAccNeutrals = teamNeutrals - reachNeutrals;
      const totalNonAccRemoved = nonAccDetractors + nonAccNeutrals;

      const rawTokenSamples = getTeamTokenForPeriod(ts.teamName);
      const initialSamples = rawTokenSamples > 0 ? rawTokenSamples : totalTasks;
      const finalTotalSamples = Math.max(0, initialSamples - totalNonAccRemoved);
      const finalPromoters = Math.max(0, finalTotalSamples - reachDetractors - reachNeutrals);

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
      trainingAggregates[trKey].NeuReach += reachNeutrals;

      const hasOtjAssessment = Boolean(otjScoreEntry);
      const otjKey = hasOtjAssessment ? 'With OTJ' : 'Without OTJ';
      otjAggregates[otjKey]['Team Count'] += 1;
      otjAggregates[otjKey]['Total Tasks'] += totalTasks;
      otjAggregates[otjKey]['Total Acc.'] += reachCount;
      otjAggregates[otjKey]['Acc. Det.'] += reachDetractors;
      otjAggregates[otjKey]['Acc. Neu.'] += reachNeutrals;

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

        postSessionReach = postTasks.filter(t => isTaskAccountable(t)).length;
        postSessionReachDetractors = postTasks.filter(t => {
          const score = t.evaluationScore;
          if (score === null || score === 'N/A') return false;
          const normalized = score <= 10 ? score * 10 : score;
          return normalized >= 0 && normalized <= 60 && isTaskAccountable(t);
        }).length;
        postSessionReachNeutrals = postTasks.filter(t => {
          const score = t.evaluationScore;
          if (score === null || score === 'N/A') return false;
          const normalized = score <= 10 ? score * 10 : score;
          return normalized > 60 && normalized <= 80 && isTaskAccountable(t);
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

      const historyCount = (teamDoc?.escalationHistory || []).length;
      const notesVal = teamDoc?.escalationNotes || (historyCount > 0 ? teamDoc.escalationHistory[0]?.notes : '') || '-';

      teamPerfData.push({
        'Team Name': ts.teamName,
        'Cohort': getCohortLabel(teamDoc),
        'Initial Samples': initialSamples,
        'Non-Acc. Deducted': totalNonAccRemoved,
        'Final Total Samples': finalTotalSamples,
        'Total Tasks': totalTasks,
        'Acc. %': totalTasks > 0 ? `${Math.round((reachCount / totalTasks) * 100)}%` : '0%',
        'Acc. Share %': denomTotalAcc > 0 ? `${Math.round((reachCount / denomTotalAcc) * 100)}%` : '0%',
        'Detractors': teamDetractors,
        'Neutrals': teamNeutrals,
        'Total Acc.': reachCount,
        'Acc. Det.': reachDetractors,
        'Acc. Neu.': reachNeutrals,
        'Final Promoters': finalPromoters,
        'Final Promoters %': finalTotalSamples > 0 ? `${((finalPromoters / finalTotalSamples) * 100).toFixed(1)}%` : '0%',
        'Latest Session': latestSessionDate ? format(latestSessionDate, 'dd/MM/yyyy') : 'No session',
        'On-The-Job Assessment': otjAssessmentScore,
        'Theoretical Assessment': theoreticalAssessmentScore,
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
        'Latest PIS': latestPisDate ? format(latestPisDate, 'dd/MM/yyyy') : '-',
        'Disciplinary & Policy Notes': notesVal
      });
    });

    teamPerfData.sort((a, b) => b['Final Total Samples'] - a['Final Total Samples']);

    // Fix share percentages using proportional rounding
    if (globalTotalAcc > 0) {
      const accValues = teamPerfData.map(t => t['Total Acc.']);
      const accShares = getProportionalRounding(accValues, globalTotalAcc);
      teamPerfData.forEach((t, idx) => {
        t['Acc. Share %'] = `${accShares[idx]}%`;
      });
    }

    if (globalDetAcc > 0) {
      const detValues = teamPerfData.map(t => t['Acc. Det.']);
      const detShares = getProportionalRounding(detValues, globalDetAcc);
      teamPerfData.forEach((t, idx) => {
        t['Det. Share %'] = `${detShares[idx]}%`;
      });
    }


    const wsTeamPerf = XLSX.utils.aoa_to_sheet([[`TEAM ACCOUNTABILITY & PERFORMANCE ANALYTICS - Period: ${periodStr}`]]);
    wsTeamPerf['A1'] = { v: `TEAM ACCOUNTABILITY & PERFORMANCE ANALYTICS - Period: ${periodStr}`, t: 's', s: { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4F46E5" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } } };
    if (!wsTeamPerf['!merges']) wsTeamPerf['!merges'] = [];
    wsTeamPerf['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 23 } });

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

    // Fix cohort share percentages using proportional rounding
    if (globalTotalAcc > 0) {
      const cohortAccValues = cohortTableData.map(c => c['Total Acc.']);
      const cohortAccShares = getProportionalRounding(cohortAccValues, globalTotalAcc);
      cohortTableData.forEach((c, idx) => {
        c['Acc. Share %'] = `${cohortAccShares[idx]}%`;
      });
    }

    if (globalDetAcc > 0) {
      const detCohortValues = detCohortTableData.map(c => c['Acc. Det.']);
      const detCohortShares = getProportionalRounding(detCohortValues, globalDetAcc);
      detCohortTableData.forEach((c, idx) => {
        c['Det. Share %'] = `${detCohortShares[idx]}%`;
      });
    }

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
 // This is total reach, wait
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

    // 2.6 Training Neutral Summary
    const globalNeuAcc = filteredTasks.filter(t => {
      const score = t.evaluationScore || 0;
      const normalized = score <= 10 ? score * 10 : score;
      return normalized > 60 && normalized <= 80 && t.teamAccountability?.includes("Yes");
    }).length;
    const trainingNeuTableData = Object.entries(trainingAggregates).map(([status, data]) => ({
      'Training Status': status,
      'Acc. Neu.': data.NeuReach || 0,
      'Neu. Share %': globalNeuAcc > 0 ? `${Math.round(((data.NeuReach || 0) / globalNeuAcc) * 100)}%` : '0%'
    }));

    const otjTableData = Object.values(otjAggregates).map(data => ({
      'OTJ Status': data['OTJ Status'],
      'Team Count': data['Team Count'],
      'Total Tasks': data['Total Tasks'],
      'Total Acc.': data['Total Acc.'],
      'Acc. %': data['Total Tasks'] > 0 ? `${Math.round((data['Total Acc.'] / data['Total Tasks']) * 100)}%` : '0%',
      'Acc. Share %': globalTotalAcc > 0 ? `${Math.round((data['Total Acc.'] / globalTotalAcc) * 100)}%` : '0%'
    }));

    const otjDetTableData = Object.values(otjAggregates).map(data => ({
      'OTJ Status': data['OTJ Status'],
      'Acc. Det.': data['Acc. Det.'],
      'Det. Share %': globalDetAcc > 0 ? `${Math.round((data['Acc. Det.'] / globalDetAcc) * 100)}%` : '0%'
    }));

    const otjNeuTableData = Object.values(otjAggregates).map(data => ({
      'OTJ Status': data['OTJ Status'],
      'Acc. Neu.': data['Acc. Neu.'],
      'Neu. Share %': globalNeuAcc > 0 ? `${Math.round((data['Acc. Neu.'] / globalNeuAcc) * 100)}%` : '0%'
    }));

    // Fix training table share percentages
    if (globalTotalAcc > 0) {
      const trainingAccValues = trainingTableData.map(t => t['Total Acc.']);
      const trainingAccShares = getProportionalRounding(trainingAccValues, globalTotalAcc);
      trainingTableData.forEach((t, idx) => {
        t['Acc. Share %'] = `${trainingAccShares[idx]}%`;
      });
    }

    if (globalDetAcc > 0) {
      const trainingDetValues = trainingDetTableData.map(t => t['Acc. Det.']);
      const trainingDetShares = getProportionalRounding(trainingDetValues, globalDetAcc);
      trainingDetTableData.forEach((t, idx) => {
        t['Det. Share %'] = `${trainingDetShares[idx]}%`;
      });
    }

    if (globalNeuAcc > 0) {
      const trainingNeuValues = trainingNeuTableData.map(t => t['Acc. Neu.']);
      const trainingNeuShares = getProportionalRounding(trainingNeuValues, globalNeuAcc);
      trainingNeuTableData.forEach((t, idx) => {
        t['Neu. Share %'] = `${trainingNeuShares[idx]}%`;
      });
    }

    // Fix OTJ table share percentages
    if (globalTotalAcc > 0) {
      const otjAccValues = otjTableData.map(o => o['Total Acc.']);
      const otjAccShares = getProportionalRounding(otjAccValues, globalTotalAcc);
      otjTableData.forEach((o, idx) => {
        o['Acc. Share %'] = `${otjAccShares[idx]}%`;
      });
    }

    if (globalDetAcc > 0) {
      const otjDetValues = otjDetTableData.map(o => o['Acc. Det.']);
      const otjDetShares = getProportionalRounding(otjDetValues, globalDetAcc);
      otjDetTableData.forEach((o, idx) => {
        o['Det. Share %'] = `${otjDetShares[idx]}%`;
      });
    }

    if (globalNeuAcc > 0) {
      const otjNeuValues = otjNeuTableData.map(o => o['Acc. Neu.']);
      const otjNeuShares = getProportionalRounding(otjNeuValues, globalNeuAcc);
      otjNeuTableData.forEach((o, idx) => {
        o['Neu. Share %'] = `${otjNeuShares[idx]}%`;
      });
    }

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

    const neuTableStartR = 12 + trainingDetTableData.length + 2;
    XLSX.utils.sheet_add_aoa(wsTeamPerf, [["TRAINING NEUTRAL ANALYSIS"]], { origin: `J${neuTableStartR}` });
    wsTeamPerf[`J${neuTableStartR}`] = { v: "TRAINING NEUTRAL ANALYSIS", t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "D97706" } }, alignment: { horizontal: "center" } } };
    wsTeamPerf['!merges'].push({ s: { r: neuTableStartR - 1, c: 9 }, e: { r: neuTableStartR - 1, c: 11 } });
    XLSX.utils.sheet_add_json(wsTeamPerf, trainingNeuTableData, { origin: `J${neuTableStartR + 1}`, skipHeader: false });
    applyHeaderStyle(wsTeamPerf, { s: { r: neuTableStartR, c: 9 }, e: { r: neuTableStartR, c: 11 } }, "92400E");
    applyDataRowStyle(wsTeamPerf, { s: { r: neuTableStartR, c: 9 }, e: { r: neuTableStartR + trainingNeuTableData.length, c: 11 } });

    const otjSectionStartR = neuTableStartR + trainingNeuTableData.length + 3;
    XLSX.utils.sheet_add_aoa(wsTeamPerf, [["OTJ ASSESSMENT SUMMARY"]], { origin: `A${otjSectionStartR}` });
    wsTeamPerf[`A${otjSectionStartR}`] = { v: "OTJ ASSESSMENT SUMMARY", t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "0F766E" } }, alignment: { horizontal: "center" } } };
    wsTeamPerf['!merges'].push({ s: { r: otjSectionStartR - 1, c: 0 }, e: { r: otjSectionStartR - 1, c: 5 } });
    XLSX.utils.sheet_add_json(wsTeamPerf, otjTableData, { origin: `A${otjSectionStartR + 1}`, skipHeader: false });
    applyHeaderStyle(wsTeamPerf, { s: { r: otjSectionStartR, c: 0 }, e: { r: otjSectionStartR, c: 5 } }, "134E4A");
    applyDataRowStyle(wsTeamPerf, { s: { r: otjSectionStartR, c: 0 }, e: { r: otjSectionStartR + otjTableData.length, c: 5 } });

    const otjDetStartR = otjSectionStartR + otjTableData.length + 3;
    XLSX.utils.sheet_add_aoa(wsTeamPerf, [["OTJ DETRACTOR ANALYSIS"]], { origin: `A${otjDetStartR}` });
    wsTeamPerf[`A${otjDetStartR}`] = { v: "OTJ DETRACTOR ANALYSIS", t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "B91C1C" } }, alignment: { horizontal: "center" } } };
    wsTeamPerf['!merges'].push({ s: { r: otjDetStartR - 1, c: 0 }, e: { r: otjDetStartR - 1, c: 2 } });
    XLSX.utils.sheet_add_json(wsTeamPerf, otjDetTableData, { origin: `A${otjDetStartR + 1}`, skipHeader: false });
    applyHeaderStyle(wsTeamPerf, { s: { r: otjDetStartR, c: 0 }, e: { r: otjDetStartR, c: 2 } }, "7F1D1D");
    applyDataRowStyle(wsTeamPerf, { s: { r: otjDetStartR, c: 0 }, e: { r: otjDetStartR + otjDetTableData.length, c: 2 } });

    const otjNeuStartR = otjDetStartR + otjDetTableData.length + 3;
    XLSX.utils.sheet_add_aoa(wsTeamPerf, [["OTJ NEUTRAL ANALYSIS"]], { origin: `A${otjNeuStartR}` });
    wsTeamPerf[`A${otjNeuStartR}`] = { v: "OTJ NEUTRAL ANALYSIS", t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "C2410C" } }, alignment: { horizontal: "center" } } };
    wsTeamPerf['!merges'].push({ s: { r: otjNeuStartR - 1, c: 0 }, e: { r: otjNeuStartR - 1, c: 2 } });
    XLSX.utils.sheet_add_json(wsTeamPerf, otjNeuTableData, { origin: `A${otjNeuStartR + 1}`, skipHeader: false });
    applyHeaderStyle(wsTeamPerf, { s: { r: otjNeuStartR, c: 0 }, e: { r: otjNeuStartR, c: 2 } }, "7C2D12");
    applyDataRowStyle(wsTeamPerf, { s: { r: otjNeuStartR, c: 0 }, e: { r: otjNeuStartR + otjNeuTableData.length, c: 2 } });

    const mainTableStartR = otjNeuStartR + otjNeuTableData.length + 4;
    const titleCell = XLSX.utils.encode_cell({ r: mainTableStartR - 1, c: 0 });
    XLSX.utils.sheet_add_aoa(wsTeamPerf, [["DETAILED TEAM PERFORMANCE & SESSION COMPARISON"]], { origin: titleCell });
    wsTeamPerf[titleCell] = { v: "DETAILED TEAM PERFORMANCE & SESSION COMPARISON", t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "7C3AED" } }, alignment: { horizontal: "center" } } };
    wsTeamPerf['!merges'].push({ s: { r: mainTableStartR - 1, c: 0 }, e: { r: mainTableStartR - 1, c: 23 } });

    XLSX.utils.sheet_add_json(wsTeamPerf, teamPerfData, { origin: `A${mainTableStartR + 1}`, skipHeader: false });

    const teamPerfKeysCount = Object.keys(teamPerfData[0] || {}).length;
    applyHeaderStyle(wsTeamPerf, { s: { r: mainTableStartR, c: 0 }, e: { r: mainTableStartR, c: Math.max(0, teamPerfKeysCount - 1) } });
    applyDataRowStyle(wsTeamPerf, { s: { r: mainTableStartR, c: 0 }, e: { r: mainTableStartR + teamPerfData.length, c: Math.max(0, teamPerfKeysCount - 1) } });

    wsTeamPerf['!cols'] = [
      { wch: 25 }, // Team Name
      { wch: 25 }, // Cohort
      { wch: 12 }, // Total Tasks
      { wch: 10 }, // Acc. %
      { wch: 10 }, // Acc. Share %
      { wch: 10 }, // Detractors
      { wch: 10 }, // Neutrals
      { wch: 10 }, // Total Acc.
      { wch: 15 }, // Acc. Det.
      { wch: 10 }, // Acc. Neu.
      { wch: 15 }, // Latest Session
      { wch: 18 }, // On-The-Job Assessment
      { wch: 10 }, // Post Total
      { wch: 12 }, // Post Det.
      { wch: 12 }, // Post Neu.
      { wch: 12 }, // Post Reach Det.
      { wch: 12 }, // Post Reach Neu.
      { wch: 10 }, // Post Acc.
      { wch: 12 }, // Post Acc. Det.
      { wch: 12 }, // Post Acc. Neu.
      { wch: 12 }, // Post Acc. %
      { wch: 12 }, // Improve %
      { wch: 12 }, // After Latest
      { wch: 15 }, // Latest PIS
      { wch: 45 }  // Disciplinary & Policy Notes
    ];

    // Add raw data breakdown for each team by Team Accountability
    let teamRawCurrentR = mainTableStartR + teamPerfData.length + 3;
    const buildTeamRawRows = (tasks) => tasks.map(task => ({
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

    const computeIssuesCount = (tasks) => {
      return tasks.reduce((acc, t) => {
        const val = t.reason;
        if (!val) return acc;
        let values = [];
        if (Array.isArray(val)) values = val.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v])).filter(Boolean);
        else if (typeof val === 'string' && val.trim()) values = val.split(',').map(s => s.trim()).filter(Boolean);
        else if (val) values = [String(val).trim()];
        return acc + values.length;
      }, 0);
    };

    teamPerfData.forEach(teamData => {
      const teamName = teamData['Team Name'];
      const teamTasks = filteredTasks.filter(t => t.teamName === teamName);
      if (teamTasks.length === 0) return;

      const teamAccTasks = teamTasks.filter(t => t.teamAccountability?.includes('Yes'));
      const teamNonAccTasks = teamTasks.filter(t => !t.teamAccountability?.includes('Yes'));

      // Section separator header
      const sectionTitleR = teamRawCurrentR;
      const sectionTitleCell = XLSX.utils.encode_cell({ r: sectionTitleR, c: 0 });
      wsTeamPerf[sectionTitleCell] = {
        v: `${teamName.toUpperCase()} — RAW DATA BREAKDOWN BY TEAM ACCOUNTABILITY`,
        t: 's',
        s: { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4F46E5' } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } }
      };
      if (!wsTeamPerf['!merges']) wsTeamPerf['!merges'] = [];
      wsTeamPerf['!merges'].push({ s: { r: sectionTitleR, c: 0 }, e: { r: sectionTitleR, c: 24 } });

      // --- NEW: Overall team summary (Accountable + Non-accountable) ---
      const overallTotalTasks = teamTasks.length;
      const overallTotalIssues = computeIssuesCount(teamTasks);
      const overallDetractors = teamTasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined && Number(t.evaluationScore) <= 6).length;
      const overallNeutrals = teamTasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined && Number(t.evaluationScore) >= 7 && Number(t.evaluationScore) <= 8).length;
      const overallDetPlusNeu = overallDetractors + overallNeutrals;

      const overallSummaryStartR = sectionTitleR + 2;
      XLSX.utils.sheet_add_aoa(wsTeamPerf, [[`${teamName.toUpperCase()} - OVERALL SUMMARY`]], { origin: XLSX.utils.encode_cell({ r: overallSummaryStartR, c: 0 }) });
      wsTeamPerf[XLSX.utils.encode_cell({ r: overallSummaryStartR, c: 0 })] = { v: `${teamName.toUpperCase()} - OVERALL SUMMARY`, t: 's', s: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1F2937' } }, alignment: { horizontal: 'center' } } };
      if (!wsTeamPerf['!merges']) wsTeamPerf['!merges'] = [];
      wsTeamPerf['!merges'].push({ s: { r: overallSummaryStartR, c: 0 }, e: { r: overallSummaryStartR, c: 3 } });

      const overallSummaryRows = [
        { Metric: 'Total Tasks', Count: overallTotalTasks },
        { Metric: 'Total Issues', Count: overallTotalIssues },
        { Metric: 'Detractors', Count: overallDetractors },
        { Metric: 'Neutrals', Count: overallNeutrals },
        { Metric: 'Detractors + Neutrals', Count: overallDetPlusNeu }
      ];
      XLSX.utils.sheet_add_json(wsTeamPerf, overallSummaryRows, { origin: XLSX.utils.encode_cell({ r: overallSummaryStartR + 1, c: 0 }), skipHeader: false });
      applyHeaderStyle(wsTeamPerf, { s: { r: overallSummaryStartR + 1, c: 0 }, e: { r: overallSummaryStartR + 1, c: 1 } }, '374151');
      applyDataRowStyle(wsTeamPerf, { s: { r: overallSummaryStartR + 1, c: 0 }, e: { r: overallSummaryStartR + 1 + overallSummaryRows.length, c: 1 } });

      // --- NEW: Detractors+Neutrals mini-tables for Accountable and Non-Accountable ---

      const detNeuFor = (tasks) => ({
        'Det+Neu Count': tasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined && Number(t.evaluationScore) <= 8).length,
        'Det Count': tasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined && Number(t.evaluationScore) <= 6).length,
        'Neu Count': tasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined && Number(t.evaluationScore) >= 7 && Number(t.evaluationScore) <= 8).length,
        'Total Issues': computeIssuesCount(tasks)
      });

      const detNeuAcc = detNeuFor(teamAccTasks);
      const detNeuNonAcc = detNeuFor(teamNonAccTasks);

      const detNeuStartR = overallSummaryStartR + 1 + overallSummaryRows.length + 2;
      XLSX.utils.sheet_add_aoa(wsTeamPerf, [[`DETRACTOR+NEUTRAL SUMMARY (ACCOUNTABLE)`]], { origin: XLSX.utils.encode_cell({ r: detNeuStartR, c: 0 }) });
      wsTeamPerf[XLSX.utils.encode_cell({ r: detNeuStartR, c: 0 })] = { v: `DETRACTOR+NEUTRAL SUMMARY (ACCOUNTABLE)`, t: 's', s: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'B91C1C' } }, alignment: { horizontal: 'center' } } };
      wsTeamPerf['!merges'].push({ s: { r: detNeuStartR, c: 0 }, e: { r: detNeuStartR, c: 3 } });
      XLSX.utils.sheet_add_json(wsTeamPerf, [detNeuAcc], { origin: XLSX.utils.encode_cell({ r: detNeuStartR + 1, c: 0 }), skipHeader: false });
      applyHeaderStyle(wsTeamPerf, { s: { r: detNeuStartR + 1, c: 0 }, e: { r: detNeuStartR + 1, c: 3 } }, '7F1D1D');
      applyDataRowStyle(wsTeamPerf, { s: { r: detNeuStartR + 1, c: 0 }, e: { r: detNeuStartR + 1 + 1, c: 3 } });

      const detNeuNonStartR = detNeuStartR + 4;
      XLSX.utils.sheet_add_aoa(wsTeamPerf, [[`DETRACTOR+NEUTRAL SUMMARY (NON-ACCOUNTABLE)`]], { origin: XLSX.utils.encode_cell({ r: detNeuNonStartR, c: 0 }) });
      wsTeamPerf[XLSX.utils.encode_cell({ r: detNeuNonStartR, c: 0 })] = { v: `DETRACTOR+NEUTRAL SUMMARY (NON-ACCOUNTABLE)`, t: 's', s: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '059669' } }, alignment: { horizontal: 'center' } } };
      wsTeamPerf['!merges'].push({ s: { r: detNeuNonStartR, c: 0 }, e: { r: detNeuNonStartR, c: 3 } });
      XLSX.utils.sheet_add_json(wsTeamPerf, [detNeuNonAcc], { origin: XLSX.utils.encode_cell({ r: detNeuNonStartR + 1, c: 0 }), skipHeader: false });
      applyHeaderStyle(wsTeamPerf, { s: { r: detNeuNonStartR + 1, c: 0 }, e: { r: detNeuNonStartR + 1, c: 3 } }, '047857');
      applyDataRowStyle(wsTeamPerf, { s: { r: detNeuNonStartR + 1, c: 0 }, e: { r: detNeuNonStartR + 1 + 1, c: 3 } });

      // move downstream start pointer after inserted summaries
      let teamSubsetsStartR = detNeuNonStartR + 4;

      if (teamAccTasks.length > 0) {
        teamSubsetsStartR = addSubsetSummary(wsTeamPerf, teamAccTasks, teamSubsetsStartR, "7F1D1D", "B91C1C");
      }

      // Table 1: Team Accountability = Yes (Accountable) - Red
      const accTitleR = teamSubsetsStartR;
      const accTitleCell = XLSX.utils.encode_cell({ r: accTitleR, c: 0 });
      wsTeamPerf[accTitleCell] = {
        v: `${teamName.toUpperCase()} ACCOUNTABLE RAW DATA (${teamAccTasks.length} record${teamAccTasks.length !== 1 ? 's' : ''})`,
        t: 's',
        s: { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'DC2626' } }, alignment: { horizontal: 'center', vertical: 'center' } }
      };
      wsTeamPerf['!merges'].push({ s: { r: accTitleR, c: 0 }, e: { r: accTitleR, c: 24 } });

      let accEndR = accTitleR + 1;
      if (teamAccTasks.length > 0) {
        const rawAccData = buildTeamRawRows(teamAccTasks);
        XLSX.utils.sheet_add_json(wsTeamPerf, rawAccData, { origin: XLSX.utils.encode_cell({ r: accTitleR + 1, c: 0 }), skipHeader: false });
        const accKeys = Object.keys(rawAccData[0]);
        applyHeaderStyle(wsTeamPerf, { s: { r: accTitleR + 1, c: 0 }, e: { r: accTitleR + 1, c: accKeys.length - 1 } }, 'B91C1C');
        applyDataRowStyle(wsTeamPerf, { s: { r: accTitleR + 1, c: 0 }, e: { r: accTitleR + 1 + rawAccData.length, c: accKeys.length - 1 } });
        formatCommentColumnInTable(wsTeamPerf, accTitleR + 2, accTitleR + 1 + rawAccData.length, accKeys.indexOf('Q1 - Scale Comment') !== -1 ? accKeys.indexOf('Q1 - Scale Comment') : accKeys.indexOf('Q1-Verbatim'));
        accEndR = accTitleR + 1 + rawAccData.length;
      }

      let nonAccSubsetsStartR = accEndR + 3;
      if (teamNonAccTasks.length > 0) {
        nonAccSubsetsStartR = addSubsetSummary(wsTeamPerf, teamNonAccTasks, nonAccSubsetsStartR, "047857", "059669");
      }

      // Table 2: Team Accountability = No (Non-Accountable) - Green
      const nonAccTitleR = nonAccSubsetsStartR;
      const nonAccTitleCell = XLSX.utils.encode_cell({ r: nonAccTitleR, c: 0 });
      wsTeamPerf[nonAccTitleCell] = {
        v: `${teamName.toUpperCase()} NON-ACCOUNTABLE RAW DATA (${teamNonAccTasks.length} record${teamNonAccTasks.length !== 1 ? 's' : ''})`,
        t: 's',
        s: { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '059669' } }, alignment: { horizontal: 'center', vertical: 'center' } }
      };
      wsTeamPerf['!merges'].push({ s: { r: nonAccTitleR, c: 0 }, e: { r: nonAccTitleR, c: 24 } });

      let nonAccEndR = nonAccTitleR + 1;
      if (teamNonAccTasks.length > 0) {
        const rawNonAccData = buildTeamRawRows(teamNonAccTasks);
        XLSX.utils.sheet_add_json(wsTeamPerf, rawNonAccData, { origin: XLSX.utils.encode_cell({ r: nonAccTitleR + 1, c: 0 }), skipHeader: false });
        const nonAccKeys = Object.keys(rawNonAccData[0]);
        applyHeaderStyle(wsTeamPerf, { s: { r: nonAccTitleR + 1, c: 0 }, e: { r: nonAccTitleR + 1, c: nonAccKeys.length - 1 } }, '047857');
        applyDataRowStyle(wsTeamPerf, { s: { r: nonAccTitleR + 1, c: 0 }, e: { r: nonAccTitleR + 1 + rawNonAccData.length, c: nonAccKeys.length - 1 } });
        formatCommentColumnInTable(wsTeamPerf, nonAccTitleR + 2, nonAccTitleR + 1 + rawNonAccData.length, nonAccKeys.indexOf('Q1 - Scale Comment') !== -1 ? nonAccKeys.indexOf('Q1 - Scale Comment') : nonAccKeys.indexOf('Q1-Verbatim'));
        nonAccEndR = nonAccTitleR + 1 + rawNonAccData.length;
      }

      teamRawCurrentR = nonAccEndR + 5;
    });

    const DEFAULT_CUMULATIVE_START_DATE = new Date(2026, 5, 1, 0, 0, 0, 0); // 01/06/2026 00:00:00 default

    const cumulativeStartDate = (() => {
      if (CumulativeDateFilter?.start) {
        const d = new Date(CumulativeDateFilter.start);
        if (!Number.isNaN(d.getTime())) {
          return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        }
      }
      return DEFAULT_CUMULATIVE_START_DATE;
    })();

    const cumulativeEndDate = (() => {
      if (CumulativeDateFilter?.end) {
        const d = new Date(CumulativeDateFilter.end);
        if (!Number.isNaN(d.getTime())) {
          return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        }
      }
      const latestDate = allTasks
        .map(task => getTaskInterviewDate(task))
        .filter(date => date && !Number.isNaN(date.getTime()))
        .sort((a, b) => a - b);
      if (latestDate.length > 0) {
        const last = latestDate[latestDate.length - 1];
        return new Date(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59, 59, 999);
      }
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    })();

    const cumulativeTasks = allTasks.filter(task => {
      const taskDate = getTaskInterviewDate(task);
      if (!taskDate) return false;
      return taskDate >= cumulativeStartDate && taskDate <= cumulativeEndDate;
    });

    // Escalation Matrix consequence calculation helper
    const getEscalationConsequence = (accDet, accNeu) => {
      const points = accDet + Math.floor(accNeu / 2);
      if (points === 0) {
        if (accNeu === 1) return 'No Consequence (1 Neutral)';
        return 'No Violation (Compliant)';
      }
      if (points === 1) return '1st Offense: Verbal Warning';
      if (points === 2) return '1st Offense (Repeated): Mandatory Intensive Training (3 Hours)';
      if (points === 3) return '2nd Offense: First Formal Warning';
      if (points === 4) return '3rd Offense: Second Formal Warning + Deduction';
      if (points === 5) return '4th Offense: Third Formal Warning + Deduction 1 Week Suspension';
      return '5th Offense & Beyond: 1 Month Suspension (Next = Termination)';
    };

    const escalationMatrixRef = [
      ["2. ESCALATION MATRIX POLICY (REFERENCE)", "", ""],
      ["Offense Level", "Trigger", "Consequences"],
      ["1st Offense", "1 Detractor OR 2 Neutrals", "Verbal Warning"],
      ["1st Offense (Repeated) or Intermediate Step", "As defined by policy", "Mandatory Intensive Training (3 Hours)"],
      ["2nd Offense", "Next Detractor OR next 2 Neutrals", "First Formal Warning"],
      ["3rd Offense", "Next Detractor OR next 2 Neutrals", "Second Formal Warning + Deduction"],
      ["4th Offense", "Next Detractor OR next 2 Neutrals", "Third Formal Warning + Deduction 1 Week Suspension"],
      ["5th Offense & Beyond", "Any further Detractor OR equivalent Neutrals", "1 Month Suspension Any violation after completing the 1-month suspension = Termination"]
    ];

    // Helper to compute standard breakdown rows
    const computeBreakdownRows = (statsMap, tokenGetter) => {
      return Object.values(statsMap).map(ts => {
        const totalTasks = ts.tasks.length;
        const rawToken = tokenGetter(ts.teamName);
        const initialSamples = rawToken > 0 ? rawToken : totalTasks;

        if (initialSamples === 0 && totalTasks === 0) return null;

        const totalDet = ts.tasks.filter(t => {
          const score = t.evaluationScore;
          if (score === null || score === 'N/A' || score === undefined || score === '') return false;
          const normalized = Number(score) <= 10 ? Number(score) * 10 : Number(score);
          return normalized >= 0 && normalized <= 60;
        }).length;

        const totalNeu = ts.tasks.filter(t => {
          const score = t.evaluationScore;
          if (score === null || score === 'N/A' || score === undefined || score === '') return false;
          const normalized = Number(score) <= 10 ? Number(score) * 10 : Number(score);
          return normalized > 60 && normalized <= 80;
        }).length;

        const accDet = ts.tasks.filter(t => {
          const score = t.evaluationScore;
          if (score === null || score === 'N/A' || score === undefined || score === '') return false;
          const normalized = Number(score) <= 10 ? Number(score) * 10 : Number(score);
          return normalized >= 0 && normalized <= 60 && isTaskAccountable(t);
        }).length;

        const accNeu = ts.tasks.filter(t => {
          const score = t.evaluationScore;
          if (score === null || score === 'N/A' || score === undefined || score === '') return false;
          const normalized = Number(score) <= 10 ? Number(score) * 10 : Number(score);
          return normalized > 60 && normalized <= 80 && isTaskAccountable(t);
        }).length;

        const nonAccDet = totalDet - accDet;
        const nonAccNeu = totalNeu - accNeu;
        const totalNonAccRemoved = nonAccDet + nonAccNeu;

        const finalTotalSamples = Math.max(0, initialSamples - totalNonAccRemoved);
        const finalPromoters = Math.max(0, finalTotalSamples - accDet - accNeu);

        const promoterPct = finalTotalSamples > 0 ? `${((finalPromoters / finalTotalSamples) * 100).toFixed(1)}%` : '0%';
        const detractorPct = finalTotalSamples > 0 ? `${((accDet / finalTotalSamples) * 100).toFixed(1)}%` : '0%';
        const neutralPct = finalTotalSamples > 0 ? `${((accNeu / finalTotalSamples) * 100).toFixed(1)}%` : '0%';

        const consequence = getEscalationConsequence(accDet, accNeu);
        const normT = (ts.teamName || '').trim().toLowerCase();
        const ftMatch = (fieldTeams || []).find(ft => (ft.teamName || '').trim().toLowerCase() === normT);
        const actionVal = ftMatch?.escalationAction || ftMatch?.action || '-';
        const actionDateVal = ftMatch?.escalationDate ? format(new Date(ftMatch.escalationDate), 'dd/MM/yyyy') : '-';
        const statusVal = ftMatch?.escalationStatus || ftMatch?.status || (accDet + Math.floor(accNeu / 2) > 0 ? 'Pending' : 'Compliant');
        const historyCount = (ftMatch?.escalationHistory || []).length;
        const notesVal = ftMatch?.escalationNotes || (historyCount > 0 ? ftMatch.escalationHistory[0]?.notes : '') || '-';

        return {
          'Team Name': ts.teamName,
          'Initial Samples (Token)': initialSamples,
          'Total Detractors': totalDet,
          'Total Neutrals': totalNeu,
          'Non-Acc. Detractors (Removed)': nonAccDet,
          'Non-Acc. Neutrals (Removed)': nonAccNeu,
          'Total Non-Acc. Deducted': totalNonAccRemoved,
          'Final Total Samples': finalTotalSamples,
          'Final Detractors (Accountable)': accDet,
          'Final Neutrals (Accountable)': accNeu,
          'Final Promoters': finalPromoters,
          'Promoter %': promoterPct,
          'Detractor %': detractorPct,
          'Neutral %': neutralPct,
          'Correct Consequence (Escalation Matrix)': consequence,
          'Action': actionVal,
          'Action Date': actionDateVal,
          'Status': statusVal,
          'Disciplinary & Policy Notes': notesVal
        };
      }).filter(Boolean).sort((a, b) => {
        const aAccDet = Number(a['Final Detractors (Accountable)']) || 0;
        const bAccDet = Number(b['Final Detractors (Accountable)']) || 0;
        if (bAccDet !== aAccDet) return bAccDet - aAccDet; // highest detractors first

        const aDetPct = parseFloat(a['Detractor %']) || 0;
        const bDetPct = parseFloat(b['Detractor %']) || 0;
        if (bDetPct !== aDetPct) return bDetPct - aDetPct; // highest detractor % first

        const aPromPct = parseFloat(a['Promoter %']) || 0;
        const bPromPct = parseFloat(b['Promoter %']) || 0;
        if (aPromPct !== bPromPct) return aPromPct - bPromPct; // lowest promoter % first

        const aAccNeu = Number(a['Final Neutrals (Accountable)']) || 0;
        const bAccNeu = Number(b['Final Neutrals (Accountable)']) || 0;
        if (bAccNeu !== aAccNeu) return bAccNeu - aAccNeu; // highest neutrals first

        return (a['Team Name'] || '').localeCompare(b['Team Name'] || '');
      });
    };

    // ═════════════════════════════════════════════════════════════════════════
    // 5. Cumulative & Monthly Breakdown: Team Performance - Cumulative (From 01/06/2026)
    // ═════════════════════════════════════════════════════════════════════════
    const wsTeamPerfCumulative = XLSX.utils.aoa_to_sheet([[]]);
    const cumulativeRangeLabel = `${format(cumulativeStartDate, 'dd/MM/yyyy')} - ${format(cumulativeEndDate, 'dd/MM/yyyy')}`;

    wsTeamPerfCumulative['A1'] = {
      v: `TEAM SAMPLES & ESCALATION MATRIX ANALYSIS - Cumulative: ${cumulativeRangeLabel}`,
      t: 's',
      s: { font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4F46E5' } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } }
    };
    if (!wsTeamPerfCumulative['!merges']) wsTeamPerfCumulative['!merges'] = [];
    wsTeamPerfCumulative['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 17 } });

    // Determine monthly periods from 01/06/2026 up to cumulativeEndDate
    const startYear = cumulativeStartDate.getFullYear(); // 2026
    const startMonth = cumulativeStartDate.getMonth() + 1; // 6 (June)
    const endYear = cumulativeEndDate.getFullYear();
    const endMonth = cumulativeEndDate.getMonth() + 1;

    const monthlyPeriods = [];
    let curY = startYear;
    let curM = startMonth;
    while (curY < endYear || (curY === endYear && curM <= endMonth)) {
      monthlyPeriods.push({ year: curY, month: curM });
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }

    // Helper to get cumulative team sample token across all months in the range
    const getCumulativeTeamToken = (teamName) => {
      const normT = (teamName || '').trim().toLowerCase();
      const matches = allTeamSamples.filter(s => (s.teamName || '').trim().toLowerCase() === normT);
      const filtered = matches.filter(s => {
        const sM = Number(s.month);
        const sY = Number(s.year);
        return monthlyPeriods.some(p => p.year === sY && p.month === sM);
      });
      return filtered.reduce((sum, s) => sum + (parseFloat(s.sampleSize) || 0), 0);
    };

    // Helper to get team sample token for a specific month
    const getMonthlyTeamToken = (teamName, year, month) => {
      const normT = (teamName || '').trim().toLowerCase();
      const match = allTeamSamples.find(s => (s.teamName || '').trim().toLowerCase() === normT && Number(s.month) === month && Number(s.year) === year);
      return match ? (parseFloat(match.sampleSize) || 0) : 0;
    };

    // Build cumulative stats map for all teams
    const cumulativeTeamStatsMap = {};
    fieldTeams.forEach(ft => {
      const tName = ft.teamName?.trim();
      if (tName && !cumulativeTeamStatsMap[tName]) {
        cumulativeTeamStatsMap[tName] = { teamName: tName, tasks: [], teamId: ft._id?.toString() || null };
      }
    });
    allTeamSamples.forEach(st => {
      const tName = st.teamName?.trim();
      if (tName && !cumulativeTeamStatsMap[tName]) {
        cumulativeTeamStatsMap[tName] = { teamName: tName, tasks: [], teamId: st.teamId?.toString() || null };
      }
    });
    cumulativeTasks.forEach(t => {
      const teamName = t.teamName?.trim() || 'Unknown Team';
      const teamId = t.teamId?._id?.toString() || t.teamId?.toString() || null;
      if (!cumulativeTeamStatsMap[teamName]) {
        cumulativeTeamStatsMap[teamName] = { teamName, tasks: [], teamId };
      }
      cumulativeTeamStatsMap[teamName].tasks.push(t);
    });

    const cumulativeBreakdownRows = computeBreakdownRows(cumulativeTeamStatsMap, getCumulativeTeamToken);

    // Cumulative Summary Totals
    // Add Escalation Matrix Policy Reference Table (Columns A-C)
    XLSX.utils.sheet_add_aoa(wsTeamPerfCumulative, escalationMatrixRef, { origin: "A3" });
    wsTeamPerfCumulative['A3'] = {
      v: "ESCALATION MATRIX POLICY (REFERENCE)",
      t: 's',
      s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E40AF" } }, alignment: { horizontal: "center" } }
    };
    wsTeamPerfCumulative['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 2 } });
    applyHeaderStyle(wsTeamPerfCumulative, { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } }, "2563EB");
    applyDataRowStyle(wsTeamPerfCumulative, { s: { r: 4, c: 0 }, e: { r: 3 + escalationMatrixRef.length - 1, c: 2 } });

    const addGroupedTeamBreakdownTable = (ws, rows, startR, title, titleColorHex = "4F46E5", firstColHeader = "Team Name") => {
      const titleR = startR + 1;
      const headerR1 = startR + 2;
      const headerR2 = startR + 3;
      const dataStartR = startR + 4;

      const hasPolicy = rows.some(r => r['Correct Consequence (Escalation Matrix)'] !== undefined);
      const totalCols = hasPolicy ? 19 : 14;

      // 1. Table Title (A1/TitleR)
      const titleCell = XLSX.utils.encode_cell({ r: titleR, c: 0 });
      ws[titleCell] = {
        v: title,
        t: 's',
        s: {
          font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: titleColorHex } },
          alignment: { horizontal: "left", vertical: "center", indent: 1 }
        }
      };
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: titleR, c: 0 }, e: { r: titleR, c: totalCols - 1 } });

      const lvl1Headers = hasPolicy
        ? [
          firstColHeader,
          "INITIAL SAMPLES & RAW ISSUES", "", "",
          "NON-ACCOUNTABLE DEDUCTIONS", "", "",
          "FINAL ACCOUNTABLE BREAKDOWN", "", "", "",
          "PERFORMANCE METRICS", "", "",
          "POLICY & ESCALATION", "", "", "", ""
        ]
        : [
          firstColHeader,
          "INITIAL SAMPLES & RAW ISSUES", "", "",
          "NON-ACCOUNTABLE DEDUCTIONS", "", "",
          "FINAL ACCOUNTABLE BREAKDOWN", "", "", "",
          "PERFORMANCE METRICS", "", ""
        ];

      const lvl2Headers = [
        firstColHeader,
        "Initial Samples (Token)",
        "Total Detractors",
        "Total Neutrals",
        "Non-Acc. Detractors (Removed)",
        "Non-Acc. Neutrals (Removed)",
        "Total Non-Acc. Deducted",
        "Final Total Samples",
        "Final Detractors (Accountable)",
        "Final Neutrals (Accountable)",
        "Final Promoters",
        "Promoter %",
        "Detractor %",
        "Neutral %",
        ...(hasPolicy ? [
          "Correct Consequence (Escalation Matrix)",
          "Action",
          "Action Date",
          "Status",
          "Disciplinary & Policy Notes"
        ] : [])
      ];

      // Add Headers
      XLSX.utils.sheet_add_aoa(ws, [lvl1Headers, lvl2Headers], { origin: XLSX.utils.encode_cell({ r: headerR1, c: 0 }) });

      // Add Data (convert objects to AOA according to keys)
      const dataAoa = rows.map(r => lvl2Headers.map(h => {
        if (h === firstColHeader) return r[firstColHeader] || r['Team Name'] || r['Month / Period'] || r['Month'] || '';
        return r[h] !== undefined ? r[h] : '';
      }));
      XLSX.utils.sheet_add_aoa(ws, dataAoa, { origin: XLSX.utils.encode_cell({ r: dataStartR, c: 0 }) });

      // Merge first column header vertically
      ws['!merges'].push({ s: { r: headerR1, c: 0 }, e: { r: headerR2, c: 0 } });
      ws[XLSX.utils.encode_cell({ r: headerR1, c: 0 })] = {
        v: firstColHeader,
        t: 's',
        s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E293B" } }, alignment: { horizontal: "center", vertical: "center" } }
      };

      // Level 1 Merges & Styles
      const lvl1Groups = [
        { start: 1, end: 3, label: "INITIAL SAMPLES & RAW ISSUES", color: "1E40AF" },
        { start: 4, end: 6, label: "NON-ACCOUNTABLE DEDUCTIONS", color: "9F1239" },
        { start: 7, end: 10, label: "FINAL ACCOUNTABLE BREAKDOWN", color: "3730A3" },
        { start: 11, end: 13, label: "PERFORMANCE METRICS", color: "065F46" },
        ...(hasPolicy ? [{ start: 14, end: 18, label: "POLICY & ESCALATION", color: "581C87" }] : [])
      ];

      lvl1Groups.forEach(g => {
        if (g.start < g.end) {
          ws['!merges'].push({ s: { r: headerR1, c: g.start }, e: { r: headerR1, c: g.end } });
        }
        for (let c = g.start; c <= g.end; c++) {
          const cell = XLSX.utils.encode_cell({ r: headerR1, c });
          ws[cell] = {
            v: c === g.start ? g.label : "",
            t: 's',
            s: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: g.color } }, alignment: { horizontal: "center", vertical: "center" } }
          };
        }
      });

      // Level 2 Sub-Headers Styling
      const lvl2Styles = {
        1: { fill: "2563EB" }, // Initial Samples
        2: { fill: "DC2626" }, // Total Detractors
        3: { fill: "D97706" }, // Total Neutrals
        4: { fill: "BE123C" }, // Non-Acc Det
        5: { fill: "BE123C" }, // Non-Acc Neu
        6: { fill: "881337" }, // Total Non-Acc
        7: { fill: "4338CA" }, // Final Samples
        8: { fill: "B91C1C" }, // Final Det
        9: { fill: "B45309" }, // Final Neu
        10: { fill: "059669" }, // Final Prom
        11: { fill: "047857" }, // Prom %
        12: { fill: "991B1B" }, // Det %
        13: { fill: "92400E" }, // Neu %
        14: { fill: "6B21A8" }, // Consequence
        15: { fill: "4C1D95" }, // Action
        16: { fill: "581C87" }, // Action Date
        17: { fill: "3B0764" }, // Status
        18: { fill: "475569" }  // Disciplinary & Policy Notes
      };

      for (let c = 1; c < totalCols; c++) {
        const cell = XLSX.utils.encode_cell({ r: headerR2, c });
        const conf = lvl2Styles[c] || { fill: "374151" };
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: conf.fill } },
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
            border: { top: { style: 'thin', color: { rgb: 'CBD5E1' } }, bottom: { style: 'medium', color: { rgb: '0F172A' } }, left: { style: 'thin', color: { rgb: '94A3B8' } }, right: { style: 'thin', color: { rgb: '94A3B8' } } }
          };
        }
      }

      // Data Rows Styling
      for (let r = 0; r < dataAoa.length; r++) {
        const rowIdx = dataStartR + r;
        const isTotalRow = r === dataAoa.length - 1;

        for (let c = 0; c < totalCols; c++) {
          const cell = XLSX.utils.encode_cell({ r: rowIdx, c });
          if (!ws[cell]) continue;

          let fontColor = "1E293B";
          let bgColor = isTotalRow ? "F1F5F9" : (r % 2 === 1 ? "F8FAFC" : "FFFFFF");

          if (c === 0) {
            fontColor = isTotalRow ? "0F172A" : "1E293B";
          } else if (c === 1 || c === 7) {
            fontColor = "1E40AF";
            if (!isTotalRow) bgColor = "F8FAFC";
          } else if (c === 2 || c === 8 || c === 12) {
            fontColor = "B91C1C";
            if (!isTotalRow && c === 8) bgColor = "FEF2F2";
          } else if (c === 3 || c === 9 || c === 13) {
            fontColor = "D97706";
            if (!isTotalRow && c === 9) bgColor = "FFFBEB";
          } else if (c === 4 || c === 5 || c === 6) {
            fontColor = "9F1239";
          } else if (c === 10 || c === 11) {
            fontColor = "047857";
            if (!isTotalRow && c === 10) bgColor = "ECFDF5";
          } else if (c === 14) {
            fontColor = "581C87";
            if (!isTotalRow) bgColor = "FAF5FF";
          } else if (c === 15) {
            fontColor = "4C1D95";
          } else if (c === 16) {
            fontColor = "581C87";
          } else if (c === 17) {
            fontColor = "3B0764";
          } else if (c === 18) {
            fontColor = "475569";
          }

          ws[cell].s = {
            font: { bold: isTotalRow || c === 0 || c === 7 || c === 11 || c === 12 || c === 14 || c === 17, sz: 9.5, color: { rgb: fontColor } },
            fill: { fgColor: { rgb: bgColor } },
            alignment: { horizontal: c === 0 || (hasPolicy && (c === 14 || c === 18)) ? "left" : "center", vertical: "center" },
            border: {
              top: { style: isTotalRow ? 'medium' : 'thin', color: { rgb: isTotalRow ? '334155' : 'E2E8F0' } },
              bottom: { style: isTotalRow ? 'medium' : 'thin', color: { rgb: isTotalRow ? '334155' : 'E2E8F0' } },
              left: { style: 'thin', color: { rgb: 'E2E8F0' } },
              right: { style: 'thin', color: { rgb: 'CBD5E1' } }
            }
          };
        }
      }

      return dataStartR + dataAoa.length;
    };

    let currentSheetRow = 3 + escalationMatrixRef.length + 2;

    // 1. OVERALL Cumulative TABLE
    currentSheetRow = addGroupedTeamBreakdownTable(
      wsTeamPerfCumulative,
      cumulativeBreakdownRows,
      currentSheetRow - 1,
      `1. OVERALL Cumulative SAMPLES & ESCALATION ANALYSIS (${cumulativeRangeLabel})`,
      "4F46E5"
    ) + 3;

    // --- 2. CUMULATIVE RAW DATA BREAKDOWN BY TEAM ACCOUNTABILITY ---
    cumulativeBreakdownRows.forEach(teamData => {
      const teamName = teamData['Team Name'];
      const teamTasks = cumulativeTasks.filter(t => t.teamName === teamName);
      if (teamTasks.length === 0) return;

      const teamAccTasks = teamTasks.filter(t => isTaskAccountable(t));
      const teamNonAccTasks = teamTasks.filter(t => !isTaskAccountable(t));

      // Section separator header
      const sectionTitleR = currentSheetRow;
      const sectionTitleCell = XLSX.utils.encode_cell({ r: sectionTitleR, c: 0 });
      wsTeamPerfCumulative[sectionTitleCell] = {
        v: `${teamName.toUpperCase()} — CUMULATIVE RAW DATA BREAKDOWN BY TEAM ACCOUNTABILITY`,
        t: 's',
        s: { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4F46E5' } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } }
      };
      if (!wsTeamPerfCumulative['!merges']) wsTeamPerfCumulative['!merges'] = [];
      wsTeamPerfCumulative['!merges'].push({ s: { r: sectionTitleR, c: 0 }, e: { r: sectionTitleR, c: 24 } });

      const overallTotalTasks = teamTasks.length;
      const overallTotalIssues = computeIssuesCount(teamTasks);
      const overallDetractors = teamTasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined && Number(t.evaluationScore) <= 6).length;
      const overallNeutrals = teamTasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined && Number(t.evaluationScore) >= 7 && Number(t.evaluationScore) <= 8).length;
      const overallDetPlusNeu = overallDetractors + overallNeutrals;

      const overallSummaryStartR = sectionTitleR + 2;
      XLSX.utils.sheet_add_aoa(wsTeamPerfCumulative, [[`${teamName.toUpperCase()} - CUMULATIVE OVERALL SUMMARY`]], { origin: XLSX.utils.encode_cell({ r: overallSummaryStartR, c: 0 }) });
      wsTeamPerfCumulative[XLSX.utils.encode_cell({ r: overallSummaryStartR, c: 0 })] = { v: `${teamName.toUpperCase()} - CUMULATIVE OVERALL SUMMARY`, t: 's', s: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1F2937' } }, alignment: { horizontal: 'center' } } };
      wsTeamPerfCumulative['!merges'].push({ s: { r: overallSummaryStartR, c: 0 }, e: { r: overallSummaryStartR, c: 3 } });

      const overallSummaryRows = [
        { Metric: 'Total Tasks', Count: overallTotalTasks },
        { Metric: 'Total Issues', Count: overallTotalIssues },
        { Metric: 'Detractors', Count: overallDetractors },
        { Metric: 'Neutrals', Count: overallNeutrals },
        { Metric: 'Detractors + Neutrals', Count: overallDetPlusNeu }
      ];
      XLSX.utils.sheet_add_json(wsTeamPerfCumulative, overallSummaryRows, { origin: XLSX.utils.encode_cell({ r: overallSummaryStartR + 1, c: 0 }), skipHeader: false });
      applyHeaderStyle(wsTeamPerfCumulative, { s: { r: overallSummaryStartR + 1, c: 0 }, e: { r: overallSummaryStartR + 1, c: 1 } }, '374151');
      applyDataRowStyle(wsTeamPerfCumulative, { s: { r: overallSummaryStartR + 1, c: 0 }, e: { r: overallSummaryStartR + 1 + overallSummaryRows.length, c: 1 } });

      const detNeuFor = (tasks) => ({
        'Det+Neu Count': tasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined && Number(t.evaluationScore) <= 8).length,
        'Det Count': tasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined && Number(t.evaluationScore) <= 6).length,
        'Neu Count': tasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined && Number(t.evaluationScore) >= 7 && Number(t.evaluationScore) <= 8).length,
        'Total Issues': computeIssuesCount(tasks)
      });

      const detNeuAcc = detNeuFor(teamAccTasks);
      const detNeuNonAcc = detNeuFor(teamNonAccTasks);

      const detNeuStartR = overallSummaryStartR + 1 + overallSummaryRows.length + 2;
      XLSX.utils.sheet_add_aoa(wsTeamPerfCumulative, [[`DETRACTOR+NEUTRAL SUMMARY (ACCOUNTABLE)`]], { origin: XLSX.utils.encode_cell({ r: detNeuStartR, c: 0 }) });
      wsTeamPerfCumulative[XLSX.utils.encode_cell({ r: detNeuStartR, c: 0 })] = { v: `DETRACTOR+NEUTRAL SUMMARY (ACCOUNTABLE)`, t: 's', s: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'B91C1C' } }, alignment: { horizontal: 'center' } } };
      wsTeamPerfCumulative['!merges'].push({ s: { r: detNeuStartR, c: 0 }, e: { r: detNeuStartR, c: 3 } });
      XLSX.utils.sheet_add_json(wsTeamPerfCumulative, [detNeuAcc], { origin: XLSX.utils.encode_cell({ r: detNeuStartR + 1, c: 0 }), skipHeader: false });
      applyHeaderStyle(wsTeamPerfCumulative, { s: { r: detNeuStartR + 1, c: 0 }, e: { r: detNeuStartR + 1, c: 3 } }, '7F1D1D');
      applyDataRowStyle(wsTeamPerfCumulative, { s: { r: detNeuStartR + 1, c: 0 }, e: { r: detNeuStartR + 1 + 1, c: 3 } });

      const detNeuNonStartR = detNeuStartR + 4;
      XLSX.utils.sheet_add_aoa(wsTeamPerfCumulative, [[`DETRACTOR+NEUTRAL SUMMARY (NON-ACCOUNTABLE)`]], { origin: XLSX.utils.encode_cell({ r: detNeuNonStartR, c: 0 }) });
      wsTeamPerfCumulative[XLSX.utils.encode_cell({ r: detNeuNonStartR, c: 0 })] = { v: `DETRACTOR+NEUTRAL SUMMARY (NON-ACCOUNTABLE)`, t: 's', s: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '059669' } }, alignment: { horizontal: 'center' } } };
      wsTeamPerfCumulative['!merges'].push({ s: { r: detNeuNonStartR, c: 0 }, e: { r: detNeuNonStartR, c: 3 } });
      XLSX.utils.sheet_add_json(wsTeamPerfCumulative, [detNeuNonAcc], { origin: XLSX.utils.encode_cell({ r: detNeuNonStartR + 1, c: 0 }), skipHeader: false });
      applyHeaderStyle(wsTeamPerfCumulative, { s: { r: detNeuNonStartR + 1, c: 0 }, e: { r: detNeuNonStartR + 1, c: 3 } }, '047857');
      applyDataRowStyle(wsTeamPerfCumulative, { s: { r: detNeuNonStartR + 1, c: 0 }, e: { r: detNeuNonStartR + 1 + 1, c: 3 } });

      // --- OWNERSHIP-STYLE TABLES FOR THIS TEAM: ROOT CAUSE BREAKDOWN & SUMMARIES ---
      const getTeamFieldStats = (field) => {
        const counts = {};
        let teamIssuesCount = 0;

        teamTasks.forEach(t => {
          const vals = Array.isArray(t[field]) ? t[field] : (typeof t[field] === 'string' ? t[field].split(',').map(s => s.trim()) : []);
          vals.forEach(v => {
            if (!v) return;
            const normV = String(v).trim();
            if (!normV) return;
            counts[normV] = (counts[normV] || 0) + 1;
            teamIssuesCount++;
          });
        });

        return Object.entries(counts).map(([name, count]) => ({
          Name: name,
          Count: count,
          Percentage: teamIssuesCount > 0 ? `${((count / teamIssuesCount) * 100).toFixed(1)}%` : "0%"
        })).sort((a, b) => b.Count - a.Count);
      };

      const hierarchicalTree = getHierarchicalRCA(teamTasks);
      const reasonSummary = getTeamFieldStats('reason');
      const subReasonSummary = getTeamFieldStats('subReason');
      const rcSummary = getTeamFieldStats('rootCause');
      const itns = getTeamFieldStats('itnRelated');
      const subs = getTeamFieldStats('relatedToSubscription');

      const tableStartR = detNeuNonStartR + 4;
      const nextR = addHierarchicalRCA(wsTeamPerfCumulative, hierarchicalTree, XLSX.utils.encode_cell({ r: tableStartR, c: 0 }), "ROOT CAUSE BREAKDOWN", "1E3A8A");
      addTableToSheet(wsTeamPerfCumulative, rcSummary, XLSX.utils.encode_cell({ r: tableStartR, c: 7 }), "ROOT CAUSE SUMMARY", "4C1D95");
      addTableToSheet(wsTeamPerfCumulative, reasonSummary, XLSX.utils.encode_cell({ r: tableStartR, c: 11 }), "REASON SUMMARY", "1E3A8A");
      addTableToSheet(wsTeamPerfCumulative, subReasonSummary, XLSX.utils.encode_cell({ r: tableStartR, c: 15 }), "SUB-REASON SUMMARY", "B45309");
      addTableToSheet(wsTeamPerfCumulative, itns, XLSX.utils.encode_cell({ r: tableStartR, c: 19 }), "ITN RELATED", "FF5722");
      addTableToSheet(wsTeamPerfCumulative, subs, XLSX.utils.encode_cell({ r: tableStartR, c: 23 }), "SUBSCRIPTION", "8BC34A");

      const maxSummaryLen = Math.max(reasonSummary.length, subReasonSummary.length, rcSummary.length, itns.length, subs.length, 1);
      let teamSubsetsStartR = Math.max(nextR, tableStartR + maxSummaryLen + 2) + 2;


      // Table 1: Accountable Raw Data (Red)
      const accTitleR = teamSubsetsStartR;
      const accTitleCell = XLSX.utils.encode_cell({ r: accTitleR, c: 0 });
      wsTeamPerfCumulative[accTitleCell] = {
        v: `${teamName.toUpperCase()} ACCOUNTABLE RAW DATA (${teamAccTasks.length} record${teamAccTasks.length !== 1 ? 's' : ''})`,
        t: 's',
        s: { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'DC2626' } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } }
      };
      wsTeamPerfCumulative['!merges'].push({ s: { r: accTitleR, c: 0 }, e: { r: accTitleR, c: 24 } });

      let accEndR = accTitleR + 1;
      if (teamAccTasks.length > 0) {
        const rawAccData = buildTeamRawRows(teamAccTasks);
        XLSX.utils.sheet_add_json(wsTeamPerfCumulative, rawAccData, { origin: XLSX.utils.encode_cell({ r: accTitleR + 1, c: 0 }), skipHeader: false });
        const accKeys = Object.keys(rawAccData[0]);
        applyHeaderStyle(wsTeamPerfCumulative, { s: { r: accTitleR + 1, c: 0 }, e: { r: accTitleR + 1, c: accKeys.length - 1 } }, 'B91C1C');
        applyDataRowStyle(wsTeamPerfCumulative, { s: { r: accTitleR + 1, c: 0 }, e: { r: accTitleR + 1 + rawAccData.length, c: accKeys.length - 1 } });
        formatCommentColumnInTable(wsTeamPerfCumulative, accTitleR + 2, accTitleR + 1 + rawAccData.length, accKeys.indexOf('Q1 - Scale Comment') !== -1 ? accKeys.indexOf('Q1 - Scale Comment') : accKeys.indexOf('Q1-Verbatim'));
        accEndR = accTitleR + 1 + rawAccData.length;
      }

      let nonAccSubsetsStartR = accEndR + 3;

      // Table 2: Non-Accountable Raw Data (Green)
      const nonAccTitleR = nonAccSubsetsStartR;
      const nonAccTitleCell = XLSX.utils.encode_cell({ r: nonAccTitleR, c: 0 });
      wsTeamPerfCumulative[nonAccTitleCell] = {
        v: `${teamName.toUpperCase()} NON-ACCOUNTABLE RAW DATA (${teamNonAccTasks.length} record${teamNonAccTasks.length !== 1 ? 's' : ''})`,
        t: 's',
        s: { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '059669' } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } }
      };
      wsTeamPerfCumulative['!merges'].push({ s: { r: nonAccTitleR, c: 0 }, e: { r: nonAccTitleR, c: 24 } });

      let nonAccEndR = nonAccTitleR + 1;
      if (teamNonAccTasks.length > 0) {
        const rawNonAccData = buildTeamRawRows(teamNonAccTasks);
        XLSX.utils.sheet_add_json(wsTeamPerfCumulative, rawNonAccData, { origin: XLSX.utils.encode_cell({ r: nonAccTitleR + 1, c: 0 }), skipHeader: false });
        const nonAccKeys = Object.keys(rawNonAccData[0]);
        applyHeaderStyle(wsTeamPerfCumulative, { s: { r: nonAccTitleR + 1, c: 0 }, e: { r: nonAccTitleR + 1, c: nonAccKeys.length - 1 } }, '047857');
        applyDataRowStyle(wsTeamPerfCumulative, { s: { r: nonAccTitleR + 1, c: 0 }, e: { r: nonAccTitleR + 1 + rawNonAccData.length, c: nonAccKeys.length - 1 } });
        formatCommentColumnInTable(wsTeamPerfCumulative, nonAccTitleR + 2, nonAccTitleR + 1 + rawNonAccData.length, nonAccKeys.indexOf('Q1 - Scale Comment') !== -1 ? nonAccKeys.indexOf('Q1 - Scale Comment') : nonAccKeys.indexOf('Q1-Verbatim'));
        nonAccEndR = nonAccTitleR + 1 + rawNonAccData.length;
      }

      currentSheetRow = nonAccEndR + 5;
    });

    wsTeamPerfCumulative['!cols'] = Array(28).fill({ wch: 15 });
    wsTeamPerfCumulative['!cols'][0] = { wch: 25 }; // Reason / Col 0
    wsTeamPerfCumulative['!cols'][1] = { wch: 8 };  // Total
    wsTeamPerfCumulative['!cols'][2] = { wch: 25 }; // Sub-reason
    wsTeamPerfCumulative['!cols'][3] = { wch: 8 };  // Cases
    wsTeamPerfCumulative['!cols'][4] = { wch: 25 }; // RC
    wsTeamPerfCumulative['!cols'][5] = { wch: 8 };  // Cases
    wsTeamPerfCumulative['!cols'][7] = { wch: 28 }; // RC Summary Name
    wsTeamPerfCumulative['!cols'][8] = { wch: 8 };  // Total
    wsTeamPerfCumulative['!cols'][9] = { wch: 10 }; // %
    wsTeamPerfCumulative['!cols'][11] = { wch: 28 }; // Reason Summary Name
    wsTeamPerfCumulative['!cols'][12] = { wch: 8 };  // Total
    wsTeamPerfCumulative['!cols'][13] = { wch: 10 }; // %
    wsTeamPerfCumulative['!cols'][15] = { wch: 28 }; // Sub-Reason Summary Name
    wsTeamPerfCumulative['!cols'][16] = { wch: 8 };  // Total
    wsTeamPerfCumulative['!cols'][17] = { wch: 10 }; // %
    wsTeamPerfCumulative['!cols'][19] = { wch: 22 }; // ITN Related
    wsTeamPerfCumulative['!cols'][20] = { wch: 8 };  // Total
    wsTeamPerfCumulative['!cols'][21] = { wch: 10 }; // %
    wsTeamPerfCumulative['!cols'][23] = { wch: 22 }; // Subscription
    wsTeamPerfCumulative['!cols'][24] = { wch: 8 };  // Total
    wsTeamPerfCumulative['!cols'][25] = { wch: 10 }; // %
    fixSheetRange(wsTeamPerfCumulative);

    // 4.5 Dedicated Team Samples & NPS Analysis Subsheet (Filtered Period)
    const wsTeamSamplesNPS = XLSX.utils.aoa_to_sheet([[]]);
    wsTeamSamplesNPS['A1'] = {
      v: `TEAM SAMPLES TOKEN & NPS DEDUCTION ANALYSIS - Period: ${periodStr}`,
      t: 's',
      s: {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '059669' } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
      }
    };
    if (!wsTeamSamplesNPS['!merges']) wsTeamSamplesNPS['!merges'] = [];
    wsTeamSamplesNPS['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 14 } });

    // Build data rows for filtered period
    const teamSamplesNpsRows = computeBreakdownRows(teamStatsMap, getTeamTokenForPeriod);

    // Add Escalation Matrix Policy Reference Table (Columns A-C)
    XLSX.utils.sheet_add_aoa(wsTeamSamplesNPS, escalationMatrixRef, { origin: "A3" });
    wsTeamSamplesNPS['A3'] = {
      v: "ESCALATION MATRIX POLICY (REFERENCE)",
      t: 's',
      s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E40AF" } }, alignment: { horizontal: "center" } }
    };
    wsTeamSamplesNPS['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 2 } });
    applyHeaderStyle(wsTeamSamplesNPS, { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } }, "2563EB");
    applyDataRowStyle(wsTeamSamplesNPS, { s: { r: 4, c: 0 }, e: { r: 3 + escalationMatrixRef.length - 1, c: 2 } });

    const npsTableStartR = 3 + escalationMatrixRef.length + 2;

    const npsTableEndR = addGroupedTeamBreakdownTable(
      wsTeamSamplesNPS,
      teamSamplesNpsRows,
      npsTableStartR - 1,
      "DETAILED TEAM SAMPLES & NPS DEDUCTION BREAKDOWN",
      "059669"
    );

    // --- RAW DATA BREAKDOWN BY TEAM ACCOUNTABILITY IN wsTeamSamplesNPS ---
    let npsRawCurrentR = npsTableEndR + 3;
    teamSamplesNpsRows.forEach(teamData => {
      const teamName = teamData['Team Name'];
      const teamTasks = filteredTasks.filter(t => t.teamName === teamName);
      if (teamTasks.length === 0) return;

      const teamAccTasks = teamTasks.filter(t => isTaskAccountable(t));
      const teamNonAccTasks = teamTasks.filter(t => !isTaskAccountable(t));

      // Section separator header
      const sectionTitleR = npsRawCurrentR;
      const sectionTitleCell = XLSX.utils.encode_cell({ r: sectionTitleR, c: 0 });
      wsTeamSamplesNPS[sectionTitleCell] = {
        v: `${teamName.toUpperCase()} — RAW DATA BREAKDOWN BY TEAM ACCOUNTABILITY`,
        t: 's',
        s: { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4F46E5' } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } }
      };
      if (!wsTeamSamplesNPS['!merges']) wsTeamSamplesNPS['!merges'] = [];
      wsTeamSamplesNPS['!merges'].push({ s: { r: sectionTitleR, c: 0 }, e: { r: sectionTitleR, c: 24 } });

      const overallTotalTasks = teamTasks.length;
      const overallTotalIssues = computeIssuesCount(teamTasks);
      const overallDetractors = teamTasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined && Number(t.evaluationScore) <= 6).length;
      const overallNeutrals = teamTasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined && Number(t.evaluationScore) >= 7 && Number(t.evaluationScore) <= 8).length;
      const overallDetPlusNeu = overallDetractors + overallNeutrals;

      const overallSummaryStartR = sectionTitleR + 2;
      XLSX.utils.sheet_add_aoa(wsTeamSamplesNPS, [[`${teamName.toUpperCase()} - OVERALL SUMMARY`]], { origin: XLSX.utils.encode_cell({ r: overallSummaryStartR, c: 0 }) });
      wsTeamSamplesNPS[XLSX.utils.encode_cell({ r: overallSummaryStartR, c: 0 })] = { v: `${teamName.toUpperCase()} - OVERALL SUMMARY`, t: 's', s: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1F2937' } }, alignment: { horizontal: 'center' } } };
      wsTeamSamplesNPS['!merges'].push({ s: { r: overallSummaryStartR, c: 0 }, e: { r: overallSummaryStartR, c: 3 } });

      const overallSummaryRows = [
        { Metric: 'Total Tasks', Count: overallTotalTasks },
        { Metric: 'Total Issues', Count: overallTotalIssues },
        { Metric: 'Detractors', Count: overallDetractors },
        { Metric: 'Neutrals', Count: overallNeutrals },
        { Metric: 'Detractors + Neutrals', Count: overallDetPlusNeu }
      ];
      XLSX.utils.sheet_add_json(wsTeamSamplesNPS, overallSummaryRows, { origin: XLSX.utils.encode_cell({ r: overallSummaryStartR + 1, c: 0 }), skipHeader: false });
      applyHeaderStyle(wsTeamSamplesNPS, { s: { r: overallSummaryStartR + 1, c: 0 }, e: { r: overallSummaryStartR + 1, c: 1 } }, '374151');
      applyDataRowStyle(wsTeamSamplesNPS, { s: { r: overallSummaryStartR + 1, c: 0 }, e: { r: overallSummaryStartR + 1 + overallSummaryRows.length, c: 1 } });

      const detNeuFor = (tasks) => ({
        'Det+Neu Count': tasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined && Number(t.evaluationScore) <= 8).length,
        'Det Count': tasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined && Number(t.evaluationScore) <= 6).length,
        'Neu Count': tasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined && Number(t.evaluationScore) >= 7 && Number(t.evaluationScore) <= 8).length,
        'Total Issues': computeIssuesCount(tasks)
      });

      const detNeuAcc = detNeuFor(teamAccTasks);
      const detNeuNonAcc = detNeuFor(teamNonAccTasks);

      const detNeuStartR = overallSummaryStartR + 1 + overallSummaryRows.length + 2;
      XLSX.utils.sheet_add_aoa(wsTeamSamplesNPS, [[`DETRACTOR+NEUTRAL SUMMARY (ACCOUNTABLE)`]], { origin: XLSX.utils.encode_cell({ r: detNeuStartR, c: 0 }) });
      wsTeamSamplesNPS[XLSX.utils.encode_cell({ r: detNeuStartR, c: 0 })] = { v: `DETRACTOR+NEUTRAL SUMMARY (ACCOUNTABLE)`, t: 's', s: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'B91C1C' } }, alignment: { horizontal: 'center' } } };
      wsTeamSamplesNPS['!merges'].push({ s: { r: detNeuStartR, c: 0 }, e: { r: detNeuStartR, c: 3 } });
      XLSX.utils.sheet_add_json(wsTeamSamplesNPS, [detNeuAcc], { origin: XLSX.utils.encode_cell({ r: detNeuStartR + 1, c: 0 }), skipHeader: false });
      applyHeaderStyle(wsTeamSamplesNPS, { s: { r: detNeuStartR + 1, c: 0 }, e: { r: detNeuStartR + 1, c: 3 } }, '7F1D1D');
      applyDataRowStyle(wsTeamSamplesNPS, { s: { r: detNeuStartR + 1, c: 0 }, e: { r: detNeuStartR + 1 + 1, c: 3 } });

      const detNeuNonStartR = detNeuStartR + 4;
      XLSX.utils.sheet_add_aoa(wsTeamSamplesNPS, [[`DETRACTOR+NEUTRAL SUMMARY (NON-ACCOUNTABLE)`]], { origin: XLSX.utils.encode_cell({ r: detNeuNonStartR, c: 0 }) });
      wsTeamSamplesNPS[XLSX.utils.encode_cell({ r: detNeuNonStartR, c: 0 })] = { v: `DETRACTOR+NEUTRAL SUMMARY (NON-ACCOUNTABLE)`, t: 's', s: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '059669' } }, alignment: { horizontal: 'center' } } };
      wsTeamSamplesNPS['!merges'].push({ s: { r: detNeuNonStartR, c: 0 }, e: { r: detNeuNonStartR, c: 3 } });
      XLSX.utils.sheet_add_json(wsTeamSamplesNPS, [detNeuNonAcc], { origin: XLSX.utils.encode_cell({ r: detNeuNonStartR + 1, c: 0 }), skipHeader: false });
      applyHeaderStyle(wsTeamSamplesNPS, { s: { r: detNeuNonStartR + 1, c: 0 }, e: { r: detNeuNonStartR + 1, c: 3 } }, '047857');
      applyDataRowStyle(wsTeamSamplesNPS, { s: { r: detNeuNonStartR + 1, c: 0 }, e: { r: detNeuNonStartR + 1 + 1, c: 3 } });

      // --- OWNERSHIP-STYLE TABLES FOR THIS TEAM: ROOT CAUSE BREAKDOWN & SUMMARIES ---
      const getTeamFieldStats = (field) => {
        const counts = {};
        let teamIssuesCount = 0;

        teamTasks.forEach(t => {
          const vals = Array.isArray(t[field]) ? t[field] : (typeof t[field] === 'string' ? t[field].split(',').map(s => s.trim()) : []);
          vals.forEach(v => {
            if (!v) return;
            const normV = String(v).trim();
            if (!normV) return;
            counts[normV] = (counts[normV] || 0) + 1;
            teamIssuesCount++;
          });
        });

        return Object.entries(counts).map(([name, count]) => ({
          Name: name,
          Count: count,
          Percentage: teamIssuesCount > 0 ? `${((count / teamIssuesCount) * 100).toFixed(1)}%` : "0%"
        })).sort((a, b) => b.Count - a.Count);
      };

      const hierarchicalTree = getHierarchicalRCA(teamTasks);
      const reasonSummary = getTeamFieldStats('reason');
      const subReasonSummary = getTeamFieldStats('subReason');
      const rcSummary = getTeamFieldStats('rootCause');
      const itns = getTeamFieldStats('itnRelated');
      const subs = getTeamFieldStats('relatedToSubscription');

      const tableStartR = detNeuNonStartR + 4;
      const nextR = addHierarchicalRCA(wsTeamSamplesNPS, hierarchicalTree, XLSX.utils.encode_cell({ r: tableStartR, c: 0 }), "ROOT CAUSE BREAKDOWN", "1E3A8A");
      addTableToSheet(wsTeamSamplesNPS, rcSummary, XLSX.utils.encode_cell({ r: tableStartR, c: 7 }), "ROOT CAUSE SUMMARY", "4C1D95");
      addTableToSheet(wsTeamSamplesNPS, reasonSummary, XLSX.utils.encode_cell({ r: tableStartR, c: 11 }), "REASON SUMMARY", "1E3A8A");
      addTableToSheet(wsTeamSamplesNPS, subReasonSummary, XLSX.utils.encode_cell({ r: tableStartR, c: 15 }), "SUB-REASON SUMMARY", "B45309");
      addTableToSheet(wsTeamSamplesNPS, itns, XLSX.utils.encode_cell({ r: tableStartR, c: 19 }), "ITN RELATED", "FF5722");
      addTableToSheet(wsTeamSamplesNPS, subs, XLSX.utils.encode_cell({ r: tableStartR, c: 23 }), "SUBSCRIPTION", "8BC34A");

      const maxSummaryLen = Math.max(reasonSummary.length, subReasonSummary.length, rcSummary.length, itns.length, subs.length, 1);
      let teamSubsetsStartR = Math.max(nextR, tableStartR + maxSummaryLen + 2) + 2;

      // Table 1: Accountable Raw Data (Red)
      const accTitleR = teamSubsetsStartR;
      const accTitleCell = XLSX.utils.encode_cell({ r: accTitleR, c: 0 });
      wsTeamSamplesNPS[accTitleCell] = {
        v: `${teamName.toUpperCase()} ACCOUNTABLE RAW DATA (${teamAccTasks.length} record${teamAccTasks.length !== 1 ? 's' : ''})`,
        t: 's',
        s: { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'DC2626' } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } }
      };
      wsTeamSamplesNPS['!merges'].push({ s: { r: accTitleR, c: 0 }, e: { r: accTitleR, c: 24 } });

      let accEndR = accTitleR + 1;
      if (teamAccTasks.length > 0) {
        const rawAccData = buildTeamRawRows(teamAccTasks);
        XLSX.utils.sheet_add_json(wsTeamSamplesNPS, rawAccData, { origin: XLSX.utils.encode_cell({ r: accTitleR + 1, c: 0 }), skipHeader: false });
        const accKeys = Object.keys(rawAccData[0]);
        applyHeaderStyle(wsTeamSamplesNPS, { s: { r: accTitleR + 1, c: 0 }, e: { r: accTitleR + 1, c: accKeys.length - 1 } }, 'B91C1C');
        applyDataRowStyle(wsTeamSamplesNPS, { s: { r: accTitleR + 1, c: 0 }, e: { r: accTitleR + 1 + rawAccData.length, c: accKeys.length - 1 } });
        formatCommentColumnInTable(wsTeamSamplesNPS, accTitleR + 2, accTitleR + 1 + rawAccData.length, accKeys.indexOf('Q1 - Scale Comment') !== -1 ? accKeys.indexOf('Q1 - Scale Comment') : accKeys.indexOf('Q1-Verbatim'));
        accEndR = accTitleR + 1 + rawAccData.length;
      }

      let nonAccSubsetsStartR = accEndR + 3;

      // Table 2: Non-Accountable Raw Data (Green)
      const nonAccTitleR = nonAccSubsetsStartR;
      const nonAccTitleCell = XLSX.utils.encode_cell({ r: nonAccTitleR, c: 0 });
      wsTeamSamplesNPS[nonAccTitleCell] = {
        v: `${teamName.toUpperCase()} NON-ACCOUNTABLE RAW DATA (${teamNonAccTasks.length} record${teamNonAccTasks.length !== 1 ? 's' : ''})`,
        t: 's',
        s: { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '059669' } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } }
      };
      wsTeamSamplesNPS['!merges'].push({ s: { r: nonAccTitleR, c: 0 }, e: { r: nonAccTitleR, c: 24 } });

      let nonAccEndR = nonAccTitleR + 1;
      if (teamNonAccTasks.length > 0) {
        const rawNonAccData = buildTeamRawRows(teamNonAccTasks);
        XLSX.utils.sheet_add_json(wsTeamSamplesNPS, rawNonAccData, { origin: XLSX.utils.encode_cell({ r: nonAccTitleR + 1, c: 0 }), skipHeader: false });
        const nonAccKeys = Object.keys(rawNonAccData[0]);
        applyHeaderStyle(wsTeamSamplesNPS, { s: { r: nonAccTitleR + 1, c: 0 }, e: { r: nonAccTitleR + 1, c: nonAccKeys.length - 1 } }, '047857');
        applyDataRowStyle(wsTeamSamplesNPS, { s: { r: nonAccTitleR + 1, c: 0 }, e: { r: nonAccTitleR + 1 + rawNonAccData.length, c: nonAccKeys.length - 1 } });
        formatCommentColumnInTable(wsTeamSamplesNPS, nonAccTitleR + 2, nonAccTitleR + 1 + rawNonAccData.length, nonAccKeys.indexOf('Q1 - Scale Comment') !== -1 ? nonAccKeys.indexOf('Q1 - Scale Comment') : nonAccKeys.indexOf('Q1-Verbatim'));
        nonAccEndR = nonAccTitleR + 1 + rawNonAccData.length;
      }

      npsRawCurrentR = nonAccEndR + 5;
    });

    wsTeamSamplesNPS['!cols'] = Array(28).fill({ wch: 15 });
    wsTeamSamplesNPS['!cols'][0] = { wch: 25 }; // Reason / Col 0
    wsTeamSamplesNPS['!cols'][1] = { wch: 8 };  // Total
    wsTeamSamplesNPS['!cols'][2] = { wch: 25 }; // Sub-reason
    wsTeamSamplesNPS['!cols'][3] = { wch: 8 };  // Cases
    wsTeamSamplesNPS['!cols'][4] = { wch: 30 }; // RC
    wsTeamSamplesNPS['!cols'][5] = { wch: 60 }; // Q1 - Scale Comment
    wsTeamSamplesNPS['!cols'][7] = { wch: 30 }; // Root Cause Summary Name
    wsTeamSamplesNPS['!cols'][11] = { wch: 28 }; // Reason Summary Name
    wsTeamSamplesNPS['!cols'][15] = { wch: 28 }; // Sub-Reason Summary Name
    wsTeamSamplesNPS['!cols'][19] = { wch: 22 }; // ITN Related
    wsTeamSamplesNPS['!cols'][23] = { wch: 22 }; // Subscription
    fixSheetRange(wsTeamSamplesNPS);

    // ═════════════════════════════════════════════════════════════════════════
    // 5.4 NEW Subsheet: Monthly Performance - Teams (All Monthly Breakdown Tables)
    // ═════════════════════════════════════════════════════════════════════════
    // 5.5 Monthly Breakdown Subsheet: Team Performance by Month (From 01/06/2026)
    // ═════════════════════════════════════════════════════════════════════════
    const wsMonthlyTeamPerf = XLSX.utils.aoa_to_sheet([[]]);
    wsMonthlyTeamPerf['A1'] = {
      v: `MONTHLY SAMPLES & TEAM ESCALATION ANALYSIS (FROM 01/06/2026)`,
      t: 's',
      s: {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E1B4B' } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
      }
    };
    if (!wsMonthlyTeamPerf['!merges']) wsMonthlyTeamPerf['!merges'] = [];
    wsMonthlyTeamPerf['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 14 } });

    // Escalation Matrix Reference Box
    XLSX.utils.sheet_add_aoa(wsMonthlyTeamPerf, escalationMatrixRef, { origin: "A3" });
    wsMonthlyTeamPerf['A3'] = {
      v: "REFERENCE: ACCOUNTABILITY & ESCALATION CONSEQUENCE MATRIX",
      t: 's',
      s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E40AF" } }, alignment: { horizontal: "center", vertical: "center" } }
    };
    wsMonthlyTeamPerf['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 2 } });
    applyHeaderStyle(wsMonthlyTeamPerf, { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } }, "2563EB");
    applyDataRowStyle(wsMonthlyTeamPerf, { s: { r: 4, c: 0 }, e: { r: 3 + escalationMatrixRef.length - 1, c: 2 } });

    let mSheetRow = 3 + escalationMatrixRef.length + 2;

    monthlyPeriods.forEach((p, pIdx) => {
      const mDate = new Date(p.year, p.month - 1, 1, 0, 0, 0, 0);
      const mEnd = new Date(p.year, p.month, 0, 23, 59, 59, 999);
      const mFull = format(mDate, 'MMMM yyyy');
      const mColor = monthColorPalette[pIdx % monthColorPalette.length];

      const mTasks = cumulativeTasks.filter(task => {
        const d = getTaskInterviewDate(task);
        return d && d >= mDate && d <= mEnd;
      });

      const mTeamStatsMap = {};
      fieldTeams.forEach(ft => {
        const tName = ft.teamName?.trim();
        if (tName && !mTeamStatsMap[tName]) mTeamStatsMap[tName] = { teamName: tName, tasks: [], teamId: ft._id?.toString() || null };
      });
      allTeamSamples.filter(s => Number(s.year) === p.year && Number(s.month) === p.month && isTeamNameOrIdActive(s.teamName, s.teamId)).forEach(st => {
        const tName = st.teamName?.trim();
        const tId = st.teamId?.toString() || null;
        if (tName && !mTeamStatsMap[tName]) mTeamStatsMap[tName] = { teamName: tName, tasks: [], teamId: tId };
      });
      mTasks.forEach(t => {
        const teamName = t.teamName?.trim();
        const teamId = t.teamId?._id?.toString() || t.teamId?.toString() || null;
        if (teamName && isTeamNameOrIdActive(teamName, teamId)) {
          if (!mTeamStatsMap[teamName]) mTeamStatsMap[teamName] = { teamName, tasks: [], teamId };
          mTeamStatsMap[teamName].tasks.push(t);
        }
      });

      const mBreakdownRows = computeBreakdownRows(mTeamStatsMap, (tName) => getMonthlyTeamToken(tName, p.year, p.month));

      // Total Row for this month
      const sumInitial = mBreakdownRows.reduce((s, r) => s + (Number(r['Initial Samples (Token)']) || 0), 0);
      const sumTotDet = mBreakdownRows.reduce((s, r) => s + (Number(r['Total Detractors']) || 0), 0);
      const sumTotNeu = mBreakdownRows.reduce((s, r) => s + (Number(r['Total Neutrals']) || 0), 0);
      const sumNonAccDet = mBreakdownRows.reduce((s, r) => s + (Number(r['Non-Acc. Detractors (Removed)']) || 0), 0);
      const sumNonAccNeu = mBreakdownRows.reduce((s, r) => s + (Number(r['Non-Acc. Neutrals (Removed)']) || 0), 0);
      const sumNonAccDeducted = mBreakdownRows.reduce((s, r) => s + (Number(r['Total Non-Acc. Deducted']) || 0), 0);
      const sumFinal = mBreakdownRows.reduce((s, r) => s + (Number(r['Final Total Samples']) || 0), 0);
      const sumAccDet = mBreakdownRows.reduce((s, r) => s + (Number(r['Final Detractors (Accountable)']) || 0), 0);
      const sumAccNeu = mBreakdownRows.reduce((s, r) => s + (Number(r['Final Neutrals (Accountable)']) || 0), 0);
      const sumPromoters = mBreakdownRows.reduce((s, r) => s + (Number(r['Final Promoters']) || 0), 0);

      mBreakdownRows.push({
        'Team Name': 'TOTAL',
        'Initial Samples (Token)': sumInitial,
        'Total Detractors': sumTotDet,
        'Total Neutrals': sumTotNeu,
        'Non-Acc. Detractors (Removed)': sumNonAccDet,
        'Non-Acc. Neutrals (Removed)': sumNonAccNeu,
        'Total Non-Acc. Deducted': sumNonAccDeducted,
        'Final Total Samples': sumFinal,
        'Final Detractors (Accountable)': sumAccDet,
        'Final Neutrals (Accountable)': sumAccNeu,
        'Final Promoters': sumPromoters,
        'Promoter %': sumFinal > 0 ? `${((sumPromoters / sumFinal) * 100).toFixed(1)}%` : '0%',
        'Detractor %': sumFinal > 0 ? `${((sumAccDet / sumFinal) * 100).toFixed(1)}%` : '0%',
        'Neutral %': sumFinal > 0 ? `${((sumAccNeu / sumFinal) * 100).toFixed(1)}%` : '0%',
        'Correct Consequence (Escalation Matrix)': '-',
        'Action': '-',
        'Action Date': '-',
        'Status': '-',
        'Disciplinary & Policy Notes': '-'
      });

      mSheetRow = addGroupedTeamBreakdownTable(
        wsMonthlyTeamPerf,
        mBreakdownRows,
        mSheetRow,
        `${pIdx + 1}. ${mFull.toUpperCase()} — MONTHLY SAMPLES & ESCALATION ANALYSIS`,
        mColor
      ) + 3;
    });

    wsMonthlyTeamPerf['!cols'] = [
      { wch: 25 }, // Team Name
      { wch: 15 }, // Initial Samples
      { wch: 15 }, // Total Detractors
      { wch: 15 }, // Total Neutrals
      { wch: 16 }, // Non-Acc Detractors
      { wch: 16 }, // Non-Acc Neutrals
      { wch: 16 }, // Total Non-Acc
      { wch: 15 }, // Final Samples
      { wch: 16 }, // Final Detractors
      { wch: 16 }, // Final Neutrals
      { wch: 15 }, // Final Promoters
      { wch: 14 }, // Promoter %
      { wch: 14 }, // Detractor %
      { wch: 14 }, // Neutral %
      { wch: 46 }, // Consequence
      { wch: 25 }, // Action
      { wch: 15 }, // Action Date
      { wch: 18 }, // Status
      { wch: 45 }  // Disciplinary & Policy Notes
    ];
    fixSheetRange(wsMonthlyTeamPerf);

    // ═════════════════════════════════════════════════════════════════════════
    // 5.5.5 REACH OWNERSHIP ANALYSIS - TEAMS CONTRIBUTION & RCA BREAKDOWN
    // Period: Cumulative Benchmark (${cumulativeRangeLabel})
    // ═════════════════════════════════════════════════════════════════════════
    const wsReachOwnershipAnalysis = XLSX.utils.aoa_to_sheet([[]]);
    wsReachOwnershipAnalysis['A1'] = {
      v: `REACH OWNERSHIP — FIELD TEAMS ACCOUNTABLE CONTRIBUTION & ROOT CAUSE ANALYSIS`,
      t: 's',
      s: {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E1B4B' } }, // Deep Indigo
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
      }
    };
    if (!wsReachOwnershipAnalysis['!merges']) wsReachOwnershipAnalysis['!merges'] = [];
    wsReachOwnershipAnalysis['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 14 } });

    wsReachOwnershipAnalysis['A2'] = {
      v: `Cumulative Benchmark Period: ${cumulativeRangeLabel} | Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Evaluated Tasks: ${cumulativeTasks.length}`,
      t: 's',
      s: {
        font: { bold: true, sz: 10, color: { rgb: '3730A3' } },
        fill: { fgColor: { rgb: 'EEF2FF' } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
      }
    };
    wsReachOwnershipAnalysis['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 14 } });

    // Helper to normalize multi-value fields
    const getReachNormVals = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) {
        return val.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [String(v).trim()])).filter(Boolean);
      }
      if (typeof val === 'string') {
        return val.split(',').map(s => s.trim()).filter(Boolean);
      }
      return [String(val).trim()].filter(Boolean);
    };

    // 1. Data Extraction across cumulativeTasks
    let totalCumPeriodIssues = 0;
    let totalCumReachIssues = 0;
    let totalCumReachDet = 0;
    let totalCumReachNeu = 0;
    let totalCumReachPro = 0;
    let totalCumReachAccYes = 0;
    let totalCumReachAccNo = 0;
    let totalCumReachAccDet = 0;
    let totalCumReachAccNeu = 0;
    let totalCumReachAccPro = 0;

    const reachTeamsDataMap = {};

    cumulativeTasks.forEach(task => {
      const reasons = getReachNormVals(task.reason);
      const subReasons = getReachNormVals(task.subReason);
      const rootCauses = getReachNormVals(task.rootCause);
      const resps = getReachNormVals(task.responsible);
      const accs = getReachNormVals(task.teamAccountability);
      const itns = getReachNormVals(task.itnRelated);
      const subs = getReachNormVals(task.relatedToSubscription);

      const maxIssues = Math.max(reasons.length, subReasons.length, rootCauses.length, resps.length, accs.length, itns.length, subs.length);
      const numIssues = maxIssues > 0 ? maxIssues : (task.evaluationScore !== null && task.evaluationScore !== undefined && task.evaluationScore !== '' ? 1 : 0);

      for (let i = 0; i < numIssues; i++) {
        totalCumPeriodIssues++;

        let resp = resps[i] || (resps.length > 0 ? resps[0] : 'Unknown');
        resp = String(resp).trim();
        const isReach = resp.toUpperCase() === 'REACH';

        if (!isReach) continue;

        totalCumReachIssues++;

        let acc = accs[i] || (accs.length > 0 ? accs[0] : 'Unknown');
        const isAccYes = String(acc).trim().toLowerCase().startsWith('yes') || String(acc).trim().toLowerCase() === 'y';
        if (isAccYes) totalCumReachAccYes++;
        else totalCumReachAccNo++;

        const scoreVal = task.evaluationScore !== null && task.evaluationScore !== undefined && task.evaluationScore !== '' ? Number(task.evaluationScore) : null;
        const normScore = scoreVal !== null && !isNaN(scoreVal) ? (scoreVal <= 10 ? scoreVal * 10 : scoreVal) : null;

        let sentiment = 'Neutral';
        if (normScore !== null) {
          if (normScore <= 60) {
            sentiment = 'Detractor';
            totalCumReachDet++;
            if (isAccYes) totalCumReachAccDet++;
          } else if (normScore <= 80) {
            sentiment = 'Neutral';
            totalCumReachNeu++;
            if (isAccYes) totalCumReachAccNeu++;
          } else {
            sentiment = 'Promoter';
            totalCumReachPro++;
            if (isAccYes) totalCumReachAccPro++;
          }
        } else {
          totalCumReachNeu++;
          if (isAccYes) totalCumReachAccNeu++;
        }

        const teamName = (task.teamName || '').trim() || 'Unknown Team';
        if (!reachTeamsDataMap[teamName]) {
          reachTeamsDataMap[teamName] = {
            teamName,
            totalReachIssues: 0,
            allDetractors: 0,
            allNeutrals: 0,
            allPromoters: 0,
            accIssuesCount: 0,
            accDetractors: 0,
            accNeutrals: 0,
            accPromoters: 0,
            nonAccIssuesCount: 0,
            nonAccDetractors: 0,
            nonAccNeutrals: 0,
            accIssues: [],
            allIssues: [],
            accTasks: [],
            allTasks: []
          };
        }

        const teamObj = reachTeamsDataMap[teamName];
        teamObj.totalReachIssues++;
        if (sentiment === 'Detractor') teamObj.allDetractors++;
        else if (sentiment === 'Neutral') teamObj.allNeutrals++;
        else if (sentiment === 'Promoter') teamObj.allPromoters++;

        const issueItem = {
          issueIndex: i + 1,
          reason: reasons[i] || (reasons.length > 0 ? reasons[0] : 'Unknown'),
          subReason: subReasons[i] || (subReasons.length > 0 ? subReasons[0] : 'Unknown'),
          rootCause: rootCauses[i] || (rootCauses.length > 0 ? rootCauses[0] : 'Unknown'),
          accountability: isAccYes ? 'Yes' : 'No',
          itnRelated: itns[i] || (itns.length > 0 ? itns[0] : 'N/A'),
          relatedToSubscription: subs[i] || (subs.length > 0 ? subs[0] : 'N/A'),
          sentiment,
          task
        };

        teamObj.allIssues.push(issueItem);
        if (!teamObj.allTasks.includes(task)) {
          teamObj.allTasks.push(task);
        }

        if (isAccYes) {
          teamObj.accIssuesCount++;
          if (sentiment === 'Detractor') teamObj.accDetractors++;
          else if (sentiment === 'Neutral') teamObj.accNeutrals++;
          else if (sentiment === 'Promoter') teamObj.accPromoters++;

          teamObj.accIssues.push(issueItem);
          if (!teamObj.accTasks.includes(task)) {
            teamObj.accTasks.push(task);
          }
        } else {
          teamObj.nonAccIssuesCount++;
          if (sentiment === 'Detractor') teamObj.nonAccDetractors++;
          else if (sentiment === 'Neutral') teamObj.nonAccNeutrals++;
        }
      }
    });

    // Only teams with at least 1 Accountable Reach issue, ranked by Accountable Reach Issues descending
    const sortedAccReachTeams = Object.values(reachTeamsDataMap)
      .filter(t => t.accIssuesCount > 0)
      .sort((a, b) => {
        if (b.accIssuesCount !== a.accIssuesCount) return b.accIssuesCount - a.accIssuesCount;
        if (b.accDetractors !== a.accDetractors) return b.accDetractors - a.accDetractors;
        return a.teamName.localeCompare(b.teamName);
      });

    // 2. Executive KPI Block (Overall Reference: Total + Accountable)
    const reachSharePctStr = totalCumPeriodIssues > 0 ? `${((totalCumReachIssues / totalCumPeriodIssues) * 100).toFixed(1)}%` : '0.0%';
    const reachAccShareOfReachStr = totalCumReachIssues > 0 ? `${((totalCumReachAccYes / totalCumReachIssues) * 100).toFixed(1)}%` : '0.0%';
    const reachAccShareOfPeriodStr = totalCumPeriodIssues > 0 ? `${((totalCumReachAccYes / totalCumPeriodIssues) * 100).toFixed(1)}%` : '0.0%';
    const reachAccDetShareStr = totalCumReachAccYes > 0 ? `${((totalCumReachAccDet / totalCumReachAccYes) * 100).toFixed(1)}%` : '0.0%';
    const reachAccNeuShareStr = totalCumReachAccYes > 0 ? `${((totalCumReachAccNeu / totalCumReachAccYes) * 100).toFixed(1)}%` : '0.0%';
    const reachNonAccShareStr = totalCumReachIssues > 0 ? `${((totalCumReachAccNo / totalCumReachIssues) * 100).toFixed(1)}%` : '0.0%';

    const reachKpiHeaders = [
      ['EXECUTIVE KPI SUMMARY: REACH OWNERSHIP METRICS (ALL ISSUES & ACCOUNTABLE BENCHMARK)', '', '', ''],
      ['Key Performance Indicator', 'Value / Count', 'Share / Breakdown Ratio', 'Benchmark Description & Operational Directive'],
      ['Total Period Issues Identified (All Owners)', totalCumPeriodIssues, '100.0%', 'Full cumulative benchmark issues logged across all responsible owners'],
      ['Total REACH Ownership Issues (All: Acc + Non-Acc)', totalCumReachIssues, `${reachSharePctStr} of all issues (${totalCumReachIssues} of ${totalCumPeriodIssues})`, `Overall Reach ownership volume across both accountable and non-accountable cases`],
      ['REACH Accountable Issues (Team Accountability: Yes)', totalCumReachAccYes, `${reachAccShareOfReachStr} of Reach | ${reachAccShareOfPeriodStr} of Period`, `Direct field team workmanship, Wi-Fi placement, configuration & customer education defects`],
      ['Accountable Detractor Issues (Score: 0 - 6)', totalCumReachAccDet, `${reachAccDetShareStr} of Acc. Reach (${totalCumReachAccDet} of ${totalCumReachAccYes})`, 'Critical field quality detractor items requiring direct team corrective intervention'],
      ['Accountable Neutral Issues (Score: 7 - 8)', totalCumReachAccNeu, `${reachAccNeuShareStr} of Acc. Reach (${totalCumReachAccNeu} of ${totalCumReachAccYes})`, 'Passive customer issues with immediate conversion potential to Promoters'],
      ['REACH Non-Accountable Issues (Team Accountability: No)', totalCumReachAccNo, `${reachNonAccShareStr} of Reach (${totalCumReachAccNo} of ${totalCumReachIssues})`, 'Civil, dispatching, infrastructure or subscriber-related non-controllable issues (Excluded from team scoring)'],
      ['Field Teams Contributing to Accountable REACH', `${sortedAccReachTeams.length} Active Teams`, '-', `Number of field units having 1 or more Accountable Reach defect items`]
    ];

    let reachCurrentR = 4;
    XLSX.utils.sheet_add_aoa(wsReachOwnershipAnalysis, reachKpiHeaders, { origin: `A${reachCurrentR}` });
    wsReachOwnershipAnalysis[`A${reachCurrentR}`].s = {
      font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '312E81' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    wsReachOwnershipAnalysis['!merges'].push({ s: { r: reachCurrentR - 1, c: 0 }, e: { r: reachCurrentR - 1, c: 3 } });

    applyHeaderStyle(wsReachOwnershipAnalysis, { s: { r: reachCurrentR, c: 0 }, e: { r: reachCurrentR, c: 3 } }, '1E293B');
    applyDataRowStyle(wsReachOwnershipAnalysis, { s: { r: reachCurrentR + 1, c: 0 }, e: { r: reachCurrentR + reachKpiHeaders.length - 1, c: 3 } });

    // 3. Contributing Field Teams Summary Table (ACCOUNTABLE REACH ISSUES ONLY)
    reachCurrentR += reachKpiHeaders.length + 2;

    const reachTeamTableHeaders = [
      'Rank',
      'Field Team Name',
      'Accountable Reach Issues',
      'Share of Acc. Reach (%)',
      'Share of Total Issues (%)',
      'Acc. Detractors (≤6)',
      'Detractor %',
      'Acc. Neutrals (7-8)',
      'Neutral %',
      'Total Reach Issues (All)',
      'Non-Acc. (Excluded)',
      'Top Acc. Reason',
      'Top Acc. Sub-Reason',
      'Top Acc. Root Cause (Ratio)',
      'Operational Corrective Directive'
    ];

    const teamContributionRows = sortedAccReachTeams.map((team, idx) => {
      const accIssuesCount = team.accIssuesCount;
      const shareOfAccReach = totalCumReachAccYes > 0 ? `${((accIssuesCount / totalCumReachAccYes) * 100).toFixed(1)}%` : '0.0%';
      const shareOfTotalPeriod = totalCumPeriodIssues > 0 ? `${((accIssuesCount / totalCumPeriodIssues) * 100).toFixed(1)}%` : '0.0%';
      const detPct = accIssuesCount > 0 ? `${((team.accDetractors / accIssuesCount) * 100).toFixed(1)}%` : '0.0%';
      const neuPct = accIssuesCount > 0 ? `${((team.accNeutrals / accIssuesCount) * 100).toFixed(1)}%` : '0.0%';

      // Find top reason, subreason, root cause strictly among accountable issues
      const rMap = {};
      const srMap = {};
      const rcMap = {};
      team.accIssues.forEach(iss => {
        rMap[iss.reason] = (rMap[iss.reason] || 0) + 1;
        srMap[iss.subReason] = (srMap[iss.subReason] || 0) + 1;
        rcMap[iss.rootCause] = (rcMap[iss.rootCause] || 0) + 1;
      });

      const topR = Object.entries(rMap).sort((a, b) => b[1] - a[1])[0];
      const topSR = Object.entries(srMap).sort((a, b) => b[1] - a[1])[0];
      const topRC = Object.entries(rcMap).sort((a, b) => b[1] - a[1])[0];

      const topRStr = topR ? `${topR[0]} (${topR[1]}/${accIssuesCount})` : '-';
      const topSRStr = topSR ? `${topSR[0]} (${topSR[1]}/${accIssuesCount})` : '-';
      const topRCStr = topRC ? `${topRC[0]} (${topRC[1]}/${accIssuesCount})` : '-';

      const directive = team.accDetractors > 0
        ? `Remediate ${team.accDetractors} accountable detractors & ${team.accNeutrals} neutrals. Primary focus: ${topRC ? topRC[0] : 'Quality workmanship'}`
        : `Convert ${team.accNeutrals} accountable neutrals to Promoters. Primary driver: ${topRC ? topRC[0] : 'Customer education'}`;

      return [
        `#${idx + 1}`,
        team.teamName,
        accIssuesCount,
        shareOfAccReach,
        shareOfTotalPeriod,
        team.accDetractors,
        detPct,
        team.accNeutrals,
        neuPct,
        team.totalReachIssues,
        team.nonAccIssuesCount,
        topRStr,
        topSRStr,
        topRCStr,
        directive
      ];
    });

    const reachTeamTableTitleR = reachCurrentR;
    XLSX.utils.sheet_add_aoa(wsReachOwnershipAnalysis, [[`FIELD TEAMS CONTRIBUTING TO REACH OWNERSHIP (ACCOUNTABLE ISSUES: ${sortedAccReachTeams.length} TEAMS | ${totalCumReachAccYes} ACC. REACH ISSUES)`]], { origin: `A${reachTeamTableTitleR}` });
    wsReachOwnershipAnalysis[`A${reachTeamTableTitleR}`].s = {
      font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '312E81' } }, // Indigo
      alignment: { horizontal: 'center', vertical: 'center' }
    };
    wsReachOwnershipAnalysis['!merges'].push({ s: { r: reachTeamTableTitleR - 1, c: 0 }, e: { r: reachTeamTableTitleR - 1, c: 14 } });

    XLSX.utils.sheet_add_aoa(wsReachOwnershipAnalysis, [reachTeamTableHeaders], { origin: `A${reachTeamTableTitleR + 1}` });

    // ── Colour-coded column header styling (matches reference design) ──────────
    // Col 0 (Rank)                  → Deep Navy
    // Col 1 (Field Team Name)        → Deep Navy
    // Col 2-4 (Acc. Issues & Share)  → Indigo
    // Col 5-6 (Detractors)           → Crimson Red
    // Col 7-8 (Neutrals)             → Teal
    // Col 9-10 (Total / Non-Acc.)    → Dark Slate
    // Col 11-13 (Top RCA columns)    → Dark Purple
    // Col 14 (Directive)             → Dark Green
    const reachHdrRowR = reachTeamTableTitleR; // 0-indexed row of the header row
    const reachHdrColColors = [
      { cols: [0, 1],        bg: '0F172A', fg: 'FFFFFF' }, // Deep Navy  — Identity
      { cols: [2, 3, 4],    bg: '3730A3', fg: 'FFFFFF' }, // Indigo     — Acc. Reach & Share
      { cols: [5, 6],       bg: 'B91C1C', fg: 'FFFFFF' }, // Crimson    — Detractor block
      { cols: [7, 8],       bg: '0F766E', fg: 'FFFFFF' }, // Teal       — Neutral block
      { cols: [9, 10],      bg: '334155', fg: 'FFFFFF' }, // Slate      — Total / Non-Acc.
      { cols: [11, 12, 13], bg: '6D28D9', fg: 'FFFFFF' }, // Purple     — Top RCA Analysis
      { cols: [14],         bg: '065F46', fg: 'FFFFFF' }  // Green      — Directive
    ];
    reachHdrColColors.forEach(({ cols, bg, fg }) => {
      cols.forEach(c => {
        const cellRef = XLSX.utils.encode_cell({ r: reachHdrRowR, c });
        if (!wsReachOwnershipAnalysis[cellRef]) return;
        wsReachOwnershipAnalysis[cellRef].s = {
          font: { bold: true, sz: 10, color: { rgb: fg } },
          fill: { fgColor: { rgb: bg } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: {
            top:    { style: 'medium', color: { rgb: '000000' } },
            bottom: { style: 'medium', color: { rgb: '000000' } },
            left:   { style: 'thin',   color: { rgb: '1E293B' } },
            right:  { style: 'thin',   color: { rgb: '1E293B' } }
          }
        };
      });
    });
    // ────────────────────────────────────────────────────────────────────────────

    XLSX.utils.sheet_add_aoa(wsReachOwnershipAnalysis, teamContributionRows, { origin: `A${reachTeamTableTitleR + 2}` });
    applyDataRowStyle(wsReachOwnershipAnalysis, { s: { r: reachTeamTableTitleR + 1, c: 0 }, e: { r: reachTeamTableTitleR + 1 + teamContributionRows.length, c: 14 } });

    // Total Row for Team Contribution Table
    const teamTotalRow = [
      'TOTAL ACCOUNTABLE REACH',
      `All ${sortedAccReachTeams.length} Accountable Field Teams`,
      totalCumReachAccYes,
      '100.0%',
      reachAccShareOfPeriodStr,
      totalCumReachAccDet,
      reachAccDetShareStr,
      totalCumReachAccNeu,
      reachAccNeuShareStr,
      totalCumReachIssues,
      totalCumReachAccNo,
      'Full Accountable Reasons Portfolio',
      'Full Accountable Sub-Reasons Portfolio',
      'Full Accountable Root Causes Portfolio',
      `Cumulative Accountable Reach: ${totalCumReachAccYes} accountable issues (${totalCumReachAccDet} det, ${totalCumReachAccNeu} neu) across ${sortedAccReachTeams.length} field teams`
    ];

    const teamTotalRowR = reachTeamTableTitleR + 2 + teamContributionRows.length;
    XLSX.utils.sheet_add_aoa(wsReachOwnershipAnalysis, [teamTotalRow], { origin: `A${teamTotalRowR}` });
    for (let c = 0; c < 15; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: teamTotalRowR - 1, c });
      if (wsReachOwnershipAnalysis[cellRef]) {
        wsReachOwnershipAnalysis[cellRef].s = {
          font: { bold: true, color: { rgb: '1E1B4B' } },
          fill: { fgColor: { rgb: 'E0E7FF' } }, // Soft Indigo
          border: {
            top: { style: 'thin', color: { rgb: '4338CA' } },
            bottom: { style: 'double', color: { rgb: '4338CA' } }
          },
          alignment: { horizontal: c === 0 || c === 1 || c === 11 || c === 12 || c === 13 || c === 14 ? 'left' : 'center' }
        };
      }
    }

    reachCurrentR = teamTotalRowR + 3;

    // 4. Global Reach Root Cause & Categorization Breakdown (ACCOUNTABLE ONLY)
    const allAccReachIssues = sortedAccReachTeams.flatMap(t => t.accIssues);

    const getReachIssuesStats = (issues, field) => {
      const counts = {};
      const tot = issues.length;
      issues.forEach(iss => {
        const val = iss[field] || 'Unknown';
        counts[val] = (counts[val] || 0) + 1;
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({
          'Name': name,
          'Count': count,
          'Ratio': `${count} of ${tot}`,
          'Percentage': tot > 0 ? `${((count / tot) * 100).toFixed(1)}%` : '0.0%'
        }));
    };

    const globalReachTree = getHierarchicalRCA(cumulativeTasks, 'REACH', 'yes');
    const globalReachReasons = getReachIssuesStats(allAccReachIssues, 'reason');
    const globalReachSubReasons = getReachIssuesStats(allAccReachIssues, 'subReason');
    const globalReachRootCauses = getReachIssuesStats(allAccReachIssues, 'rootCause');
    const globalReachAcc = getReachIssuesStats(allAccReachIssues, 'accountability');

    const globalSectionTitleR = reachCurrentR;
    XLSX.utils.sheet_add_aoa(wsReachOwnershipAnalysis, [[`GLOBAL ACCOUNTABLE REACH ROOT CAUSE BREAKDOWN & SUMMARIES (ALL ${sortedAccReachTeams.length} TEAMS COMBINED — ${totalCumReachAccYes} ACCOUNTABLE REACH ISSUES)`]], { origin: `A${globalSectionTitleR}` });
    wsReachOwnershipAnalysis[`A${globalSectionTitleR}`].s = {
      font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E1B4B' } },
      alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
    };
    wsReachOwnershipAnalysis['!merges'].push({ s: { r: globalSectionTitleR - 1, c: 0 }, e: { r: globalSectionTitleR - 1, c: 24 } });

    const globalTableStartR = globalSectionTitleR + 2;
    const globalRcaNextR = addHierarchicalRCA(wsReachOwnershipAnalysis, globalReachTree, XLSX.utils.encode_cell({ r: globalTableStartR - 1, c: 0 }), "GLOBAL ROOT CAUSE BREAKDOWN (ACCOUNTABLE)", "1E3A8A");

    // Helper for styled 4-column summary tables
    const addReachSummaryTable = (ws, data, originCell, title, colorHex) => {
      const origC = XLSX.utils.decode_cell(originCell).c;
      const origR = XLSX.utils.decode_cell(originCell).r;

      XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: originCell });
      ws[originCell].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: colorHex } }, alignment: { horizontal: "center" } };
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: origR, c: origC }, e: { r: origR, c: origC + 3 } });

      XLSX.utils.sheet_add_json(ws, data, { origin: XLSX.utils.encode_cell({ r: origR + 1, c: origC }), skipHeader: false });
      applyHeaderStyle(ws, { s: { r: origR + 1, c: origC }, e: { r: origR + 1, c: origC + 3 } }, "374151");
      applyDataRowStyle(ws, { s: { r: origR + 1, c: origC }, e: { r: origR + 1 + data.length, c: origC + 3 } });
    };

    addReachSummaryTable(wsReachOwnershipAnalysis, globalReachReasons, XLSX.utils.encode_cell({ r: globalTableStartR - 1, c: 7 }), "REASON SUMMARY (ACCOUNTABLE)", "1E3A8A");
    addReachSummaryTable(wsReachOwnershipAnalysis, globalReachSubReasons, XLSX.utils.encode_cell({ r: globalTableStartR - 1, c: 12 }), "SUB-REASON SUMMARY (ACCOUNTABLE)", "B45309");
    addReachSummaryTable(wsReachOwnershipAnalysis, globalReachRootCauses, XLSX.utils.encode_cell({ r: globalTableStartR - 1, c: 17 }), "ROOT CAUSE SUMMARY (ACCOUNTABLE)", "4C1D95");
    addReachSummaryTable(wsReachOwnershipAnalysis, globalReachAcc, XLSX.utils.encode_cell({ r: globalTableStartR - 1, c: 22 }), "TEAM ACCOUNTABILITY", "7F1D1D");

    const globalMaxLen = Math.max(globalReachReasons.length, globalReachSubReasons.length, globalReachRootCauses.length, globalReachAcc.length, 1);
    reachCurrentR = Math.max(globalRcaNextR, globalTableStartR + globalMaxLen + 2) + 2;

    // 5. Team-by-Team Deep Dive Sections (ACCOUNTABLE ONLY)
    sortedAccReachTeams.forEach((teamEntry, tIdx) => {
      const teamName = teamEntry.teamName;
      const accTot = teamEntry.accIssuesCount;
      const teamShare = totalCumReachAccYes > 0 ? `${((accTot / totalCumReachAccYes) * 100).toFixed(1)}%` : '0.0%';

      // Section separator header
      const teamSecTitleR = reachCurrentR;
      const teamSecCell = XLSX.utils.encode_cell({ r: teamSecTitleR - 1, c: 0 });
      wsReachOwnershipAnalysis[teamSecCell] = {
        v: `TEAM #${tIdx + 1}: ${teamName.toUpperCase()} — ACCOUNTABLE REACH RCA BREAKDOWN (${accTot} Accountable Issues [${teamShare} of Acc Reach] | ${teamEntry.accDetractors} Detractors, ${teamEntry.accNeutrals} Neutrals)`,
        t: 's',
        s: {
          font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4338CA' } }, // Indigo
          alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
        }
      };
      wsReachOwnershipAnalysis['!merges'].push({ s: { r: teamSecTitleR - 1, c: 0 }, e: { r: teamSecTitleR - 1, c: 24 } });

      // Team KPI Summary Box
      const teamSummaryRows = [
        { 'Metric': 'Accountable REACH Issues', 'Value': accTot, 'Breakdown Ratio': `${accTot} of ${totalCumReachAccYes} Acc Reach Issues`, 'Share %': teamShare },
        { 'Metric': 'Accountable Detractor Issues (≤6)', 'Value': teamEntry.accDetractors, 'Breakdown Ratio': `${teamEntry.accDetractors} of ${accTot} issues`, 'Share %': accTot > 0 ? `${((teamEntry.accDetractors / accTot) * 100).toFixed(1)}%` : '0.0%' },
        { 'Metric': 'Accountable Neutral Issues (7-8)', 'Value': teamEntry.accNeutrals, 'Breakdown Ratio': `${teamEntry.accNeutrals} of ${accTot} issues`, 'Share %': accTot > 0 ? `${((teamEntry.accNeutrals / accTot) * 100).toFixed(1)}%` : '0.0%' },
        { 'Metric': 'Total REACH Issues (All)', 'Value': teamEntry.totalReachIssues, 'Breakdown Ratio': `${teamEntry.totalReachIssues} of ${totalCumReachIssues} Reach Issues`, 'Share %': totalCumReachIssues > 0 ? `${((teamEntry.totalReachIssues / totalCumReachIssues) * 100).toFixed(1)}%` : '0.0%' },
        { 'Metric': 'Non-Accountable (Excluded)', 'Value': teamEntry.nonAccIssuesCount, 'Breakdown Ratio': `${teamEntry.nonAccIssuesCount} of ${teamEntry.totalReachIssues} team Reach issues`, 'Share %': teamEntry.totalReachIssues > 0 ? `${((teamEntry.nonAccIssuesCount / teamEntry.totalReachIssues) * 100).toFixed(1)}%` : '0.0%' }
      ];

      const teamKpiStartR = teamSecTitleR + 2;
      XLSX.utils.sheet_add_aoa(wsReachOwnershipAnalysis, [[`${teamName.toUpperCase()} - ACCOUNTABLE REACH KPI SUMMARY`]], { origin: XLSX.utils.encode_cell({ r: teamKpiStartR - 1, c: 0 }) });
      wsReachOwnershipAnalysis[XLSX.utils.encode_cell({ r: teamKpiStartR - 1, c: 0 })] = {
        v: `${teamName.toUpperCase()} - ACCOUNTABLE REACH KPI SUMMARY`,
        t: 's',
        s: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1E293B' } }, alignment: { horizontal: 'center' } }
      };
      wsReachOwnershipAnalysis['!merges'].push({ s: { r: teamKpiStartR - 1, c: 0 }, e: { r: teamKpiStartR - 1, c: 3 } });
      XLSX.utils.sheet_add_json(wsReachOwnershipAnalysis, teamSummaryRows, { origin: XLSX.utils.encode_cell({ r: teamKpiStartR, c: 0 }), skipHeader: false });
      applyHeaderStyle(wsReachOwnershipAnalysis, { s: { r: teamKpiStartR, c: 0 }, e: { r: teamKpiStartR, c: 3 } }, '374151');
      applyDataRowStyle(wsReachOwnershipAnalysis, { s: { r: teamKpiStartR, c: 0 }, e: { r: teamKpiStartR + teamSummaryRows.length, c: 3 } });

      // Team Tree (Accountable only)
      const teamTree = {};
      teamEntry.accIssues.forEach(iss => {
        const r = iss.reason || 'Unknown';
        const sr = iss.subReason || 'Unknown';
        const rc = iss.rootCause || 'Unknown';
        if (!teamTree[r]) teamTree[r] = { total: 0, subs: {} };
        teamTree[r].total++;
        if (!teamTree[r].subs[sr]) teamTree[r].subs[sr] = { total: 0, rcs: {} };
        teamTree[r].subs[sr].total++;
        teamTree[r].subs[sr].rcs[rc] = (teamTree[r].subs[sr].rcs[rc] || 0) + 1;
      });

      const teamReasons = getReachIssuesStats(teamEntry.accIssues, 'reason');
      const teamSubReasons = getReachIssuesStats(teamEntry.accIssues, 'subReason');
      const teamRootCauses = getReachIssuesStats(teamEntry.accIssues, 'rootCause');
      const teamAcc = getReachIssuesStats(teamEntry.accIssues, 'accountability');

      const teamTablesStartR = teamKpiStartR + teamSummaryRows.length + 3;
      const teamRcaNextR = addHierarchicalRCA(wsReachOwnershipAnalysis, teamTree, XLSX.utils.encode_cell({ r: teamTablesStartR - 1, c: 0 }), "ROOT CAUSE BREAKDOWN (ACCOUNTABLE)", "1E3A8A");

      addReachSummaryTable(wsReachOwnershipAnalysis, teamReasons, XLSX.utils.encode_cell({ r: teamTablesStartR - 1, c: 7 }), "REASON SUMMARY (ACCOUNTABLE)", "1E3A8A");
      addReachSummaryTable(wsReachOwnershipAnalysis, teamSubReasons, XLSX.utils.encode_cell({ r: teamTablesStartR - 1, c: 12 }), "SUB-REASON SUMMARY (ACCOUNTABLE)", "B45309");
      addReachSummaryTable(wsReachOwnershipAnalysis, teamRootCauses, XLSX.utils.encode_cell({ r: teamTablesStartR - 1, c: 17 }), "ROOT CAUSE SUMMARY (ACCOUNTABLE)", "4C1D95");
      addReachSummaryTable(wsReachOwnershipAnalysis, teamAcc, XLSX.utils.encode_cell({ r: teamTablesStartR - 1, c: 22 }), "TEAM ACCOUNTABILITY", "7F1D1D");

      const maxTeamSummaryLen = Math.max(teamReasons.length, teamSubReasons.length, teamRootCauses.length, teamAcc.length, 1);
      let teamRawStartR = Math.max(teamRcaNextR, teamTablesStartR + maxTeamSummaryLen + 2) + 2;

      // Raw Data Table for Team's Accountable Reach Tasks & Issues
      const buildTeamReachRawRows = (issuesList) => issuesList.map((iss, iIdx) => {
        const task = iss.task;
        return {
          '#': iIdx + 1,
          'SLID': task.slid || 'N/A',
          'Request Number': task.requestNumber || 'N/A',
          'Status': task.status || 'N/A',
          'Severity': task.priority || 'Normal',
          'Q1-Score': task.evaluationScore !== null && task.evaluationScore !== undefined ? task.evaluationScore : 'N/A',
          'Satisfaction Category': iss.sentiment,
          'Q1 - Scale Comment': task.customerFeedback || 'N/A',
          'Reason': iss.reason,
          'Sub-Reason': iss.subReason,
          'Root Cause': iss.rootCause,
          'Team Accountability': iss.accountability,
          'ITN Related': iss.itnRelated,
          'Subscription Related': iss.relatedToSubscription,
          'Customer Name': task.customerName || 'N/A',
          'Contact Number': task.contactNumber || 'N/A',
          'Governorate': task.governorate || 'N/A',
          'District': task.district || 'N/A',
          'Operation': task.operation || 'N/A',
          'Tariff Name': task.tarrifName || 'N/A',
          'Validation Status': task.validationStatus || 'Not validated',
          'Request Date': task.contractDate ? format(new Date(task.contractDate), 'yyyy-MM-dd') : 'N/A',
          'PIS Date': task.pisDate ? format(new Date(task.pisDate), 'yyyy-MM-dd') : 'N/A',
          'Interview Date': task.interviewDate ? format(new Date(task.interviewDate), 'yyyy-MM-dd') : 'N/A',
          'Close Date': task.closeDate ? format(new Date(task.closeDate), 'yyyy-MM-dd') : 'N/A'
        };
      });

      const teamRawData = buildTeamReachRawRows(teamEntry.accIssues);
      const rawTitleCell = XLSX.utils.encode_cell({ r: teamRawStartR - 1, c: 0 });
      wsReachOwnershipAnalysis[rawTitleCell] = {
        v: `${teamName.toUpperCase()} — ACCOUNTABLE REACH RAW DATA LOG (${teamRawData.length} Acc Issue${teamRawData.length !== 1 ? 's' : ''} across ${teamEntry.accTasks.length} tasks)`,
        t: 's',
        s: {
          font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: teamEntry.accDetractors > 0 ? 'DC2626' : 'D97706' } },
          alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
        }
      };
      wsReachOwnershipAnalysis['!merges'].push({ s: { r: teamRawStartR - 1, c: 0 }, e: { r: teamRawStartR - 1, c: 24 } });

      XLSX.utils.sheet_add_json(wsReachOwnershipAnalysis, teamRawData, { origin: XLSX.utils.encode_cell({ r: teamRawStartR, c: 0 }), skipHeader: false });
      const rawKeys = Object.keys(teamRawData[0] || {});
      if (rawKeys.length > 0) {
        applyHeaderStyle(wsReachOwnershipAnalysis, { s: { r: teamRawStartR, c: 0 }, e: { r: teamRawStartR, c: rawKeys.length - 1 } }, teamEntry.accDetractors > 0 ? '991B1B' : 'B45309');
        applyDataRowStyle(wsReachOwnershipAnalysis, { s: { r: teamRawStartR, c: 0 }, e: { r: teamRawStartR + teamRawData.length, c: rawKeys.length - 1 } });
        formatCommentColumnInTable(wsReachOwnershipAnalysis, teamRawStartR + 1, teamRawStartR + teamRawData.length, rawKeys.indexOf('Q1 - Scale Comment'));
      }

      reachCurrentR = teamRawStartR + teamRawData.length + 4;
    });

    wsReachOwnershipAnalysis['!cols'] = [
      { wch: 8 },  // Col 0: Rank / # / Reason
      { wch: 28 }, // Col 1: Field Team Name / Total / SLID
      { wch: 24 }, // Col 2: Acc Reach Issues / Sub Reason / Request Number
      { wch: 22 }, // Col 3: Share of Acc Reach (%) / Cases / Status
      { wch: 24 }, // Col 4: Share of Total Issues (%) / RC / Severity
      { wch: 20 }, // Col 5: Detractor Issues (≤6) / Cases / Q1-Score
      { wch: 18 }, // Col 6: Detractor % / Satisfaction Category
      { wch: 32 }, // Col 7: Neutral Issues (7-8) / Reason Name / Q1 - Scale Comment
      { wch: 16 }, // Col 8: Neutral % / Count
      { wch: 22 }, // Col 9: Total Reach (All) / Ratio
      { wch: 20 }, // Col 10: Non-Acc. (Excluded) / %
      { wch: 30 }, // Col 11: Top Reason / Sub-Reason Name
      { wch: 30 }, // Col 12: Top Sub-Reason / Count
      { wch: 32 }, // Col 13: Top Root Cause / Ratio
      { wch: 65 }, // Col 14: Directive / %
      { wch: 32 }, // Col 15: Root Cause Name
      { wch: 16 }, // Col 16: Count
      { wch: 18 }, // Col 17: Ratio
      { wch: 16 }, // Col 18: %
      { wch: 22 }, // Col 19: Accountability Name
      { wch: 14 }, // Col 20: Count
      { wch: 18 }, // Col 21: Ratio
      { wch: 16 }, // Col 22: %
      { wch: 25 }, // Col 23: Extra
      { wch: 25 }  // Col 24: Extra
    ];
    fixSheetRange(wsReachOwnershipAnalysis);

    // ═════════════════════════════════════════════════════════════════════════
    // 5.6 NEW Subsheet: Worst Performing Teams by Month (Ranked Accountable Impact)
    // ═════════════════════════════════════════════════════════════════════════
    const wsWorstTeams = XLSX.utils.aoa_to_sheet([[]]);
    wsWorstTeams['A1'] = {
      v: `MONTHLY WORST PERFORMING TEAMS & UNDERPERFORMANCE ANALYSIS (${format(cumulativeStartDate, 'dd/MM/yyyy')} - ${format(cumulativeEndDate, 'dd/MM/yyyy')})`,
      t: 's',
      s: {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E1B4B' } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
      }
    };
    if (!wsWorstTeams['!merges']) wsWorstTeams['!merges'] = [];
    wsWorstTeams['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } });

    // 1. Criteria Reference Box (Management Targets & Team Underperformance Criteria)
    const criteriaRefAoa = [
      ["1. QUALITY & PERFORMANCE BENCHMARK TARGETS (MANAGEMENT STANDARDS & TEAM THRESHOLDS)", "", "", ""],
      ["Performance Level / Dimension", "Benchmark Standard Target", "Underperformance / Breach Trigger", "Evaluation Directive & Escalation Impact"],
      ["Management Overall Promoters Target", "≥ 75.0% Promoters", "Overall Promoter Rate < 75.0%", "Company-wide Promoter performance KPI standard"],
      ["Management Overall Detractors Target", "≤ 8.0% Detractors", "Overall Detractor Rate > 8.0%", "Company-wide Detractor containment KPI standard"],
      ["Management Overall NPS Target", "≥ 67 NPS Score", "Overall NPS Score < 67 NPS", "Company-wide customer satisfaction NPS standard"],
      ["Field Team Promoter Standard", "≥ 80.0% Promoters", "Team Promoter Rate < 80.0%", "Team fails to achieve the 80% Promoter performance threshold"],
      ["Field Team Detractor Standard", "≤ 2.0% Detractors", "Team Detractor Rate ≥ 2.0%", "Team breaches the 2.0% Detractor violation threshold"],
      ["Worst Team Monthly Qualification", "Both Team Targets Met", "Promoters < 80%  OR  Detractors ≥ 2%", "Qualified into Monthly Worst Performing Teams Review Table"]
    ];

    XLSX.utils.sheet_add_aoa(wsWorstTeams, criteriaRefAoa, { origin: "A3" });
    wsWorstTeams['A3'] = {
      v: "1. UNDERPERFORMANCE MEASUREMENT CRITERIA (HOW WORST TEAMS ARE QUALIFIED)",
      t: 's',
      s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E40AF" } }, alignment: { horizontal: "center", vertical: "center" } }
    };
    wsWorstTeams['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 3 } });
    applyHeaderStyle(wsWorstTeams, { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } }, "2563EB");
    applyDataRowStyle(wsWorstTeams, { s: { r: 4, c: 0 }, e: { r: 3 + criteriaRefAoa.length - 1, c: 3 } });

    // Style Criteria Data Rows
    for (let cr = 4; cr <= 3 + criteriaRefAoa.length - 1; cr++) {
      for (let cc = 0; cc <= 3; cc++) {
        const cell = XLSX.utils.encode_cell({ r: cr, c: cc });
        if (!wsWorstTeams[cell]) continue;
        wsWorstTeams[cell].s = {
          font: { bold: cc === 0 || cc === 2, color: { rgb: cc === 2 ? "B91C1C" : "1E293B" } },
          fill: { fgColor: { rgb: cc === 2 ? "FEF2F2" : (cr === 6 ? "EFF6FF" : "FFFFFF") } },
          alignment: { horizontal: cc === 0 || cc === 3 ? "left" : "center", vertical: "center" },
          border: { top: { style: 'thin', color: { rgb: 'CBD5E1' } }, bottom: { style: 'thin', color: { rgb: 'CBD5E1' } }, left: { style: 'thin', color: { rgb: 'CBD5E1' } }, right: { style: 'thin', color: { rgb: 'CBD5E1' } } }
        };
      }
    }

    let worstSheetRow = 3 + criteriaRefAoa.length + 2; // Row 9

    // Compute monthly data for each team and rank them worst to best
    const monthlyTeamRankings = [];

    monthlyPeriods.forEach(p => {
      const mDate = new Date(p.year, p.month - 1, 1, 0, 0, 0, 0);
      const mEnd = new Date(p.year, p.month, 0, 23, 59, 59, 999);
      const mFull = format(mDate, 'MMMM yyyy');
      const mShort = format(mDate, 'MMM yyyy');

      const mTasks = cumulativeTasks.filter(task => {
        const d = getTaskInterviewDate(task);
        return d && d >= mDate && d <= mEnd;
      });

      const mTeamStatsMap = {};
      fieldTeams.forEach(ft => {
        const tName = ft.teamName?.trim();
        if (tName && !mTeamStatsMap[tName]) mTeamStatsMap[tName] = { teamName: tName, tasks: [], teamId: ft._id?.toString() || null };
      });
      allTeamSamples.filter(s => Number(s.year) === p.year && Number(s.month) === p.month && isTeamNameOrIdActive(s.teamName, s.teamId)).forEach(st => {
        const tName = st.teamName?.trim();
        const tId = st.teamId?.toString() || null;
        if (tName && !mTeamStatsMap[tName]) mTeamStatsMap[tName] = { teamName: tName, tasks: [], teamId: tId };
      });
      mTasks.forEach(t => {
        const teamName = t.teamName?.trim();
        const teamId = t.teamId?._id?.toString() || t.teamId?.toString() || null;
        if (teamName && isTeamNameOrIdActive(teamName, teamId)) {
          if (!mTeamStatsMap[teamName]) mTeamStatsMap[teamName] = { teamName, tasks: [], teamId };
          mTeamStatsMap[teamName].tasks.push(t);
        }
      });

      const allTeamsData = computeBreakdownRows(mTeamStatsMap, (tName) => getMonthlyTeamToken(tName, p.year, p.month));

      // Filter only teams that breached underperformance criteria (Promoters < 80% OR Detractors >= 2% or accDet >= 1)
      const underperformingTeams = allTeamsData.filter(t => {
        const promPct = parseFloat(t['Promoter %']) || 0;
        const detPct = parseFloat(t['Detractor %']) || 0;
        const accDet = Number(t['Final Detractors (Accountable)']) || 0;
        const accNeu = Number(t['Final Neutrals (Accountable)']) || 0;
        return (promPct < 80.0) || (detPct >= 2.0) || (accDet >= 1) || (accNeu >= 1);
      });

      // Sort from WORST to LEAST WORST:
      underperformingTeams.sort((a, b) => {
        const aAccDet = Number(a['Final Detractors (Accountable)']) || 0;
        const bAccDet = Number(b['Final Detractors (Accountable)']) || 0;
        if (bAccDet !== aAccDet) return bAccDet - aAccDet;

        const aDetPct = parseFloat(a['Detractor %']) || 0;
        const bDetPct = parseFloat(b['Detractor %']) || 0;
        if (bDetPct !== aDetPct) return bDetPct - aDetPct;

        const aPromPct = parseFloat(a['Promoter %']) || 0;
        const bPromPct = parseFloat(b['Promoter %']) || 0;
        if (aPromPct !== bPromPct) return aPromPct - bPromPct;

        const aAccNeu = Number(a['Final Neutrals (Accountable)']) || 0;
        const bAccNeu = Number(b['Final Neutrals (Accountable)']) || 0;
        return bAccNeu - aAccNeu;
      });

      // Add Rank label
      const rankedTeams = underperformingTeams.map((t, idx) => {
        let rankLabel = `#${idx + 1}`;
        if (idx === 0) rankLabel = '#1 Worst';
        else if (idx === 1) rankLabel = '#2 Worst';
        else if (idx === 2) rankLabel = '#3 Worst';

        const accDet = Number(t['Final Detractors (Accountable)']) || 0;
        const accNeu = Number(t['Final Neutrals (Accountable)']) || 0;
        const detPct = parseFloat(t['Detractor %']) || 0;
        const promPct = parseFloat(t['Promoter %']) || 0;

        // Compute descriptive breached threshold text
        const triggers = [];
        if (accDet >= 1) triggers.push(`${accDet} Acc. Detractor${accDet > 1 ? 's' : ''}`);
        if (detPct >= 2.0) triggers.push(`Detractor Rate (${t['Detractor %']}) ≥ 2%`);
        if (promPct < 80.0) triggers.push(`Promoter Rate (${t['Promoter %']}) < 80%`);
        if (accNeu >= 2) triggers.push(`${accNeu} Acc. Neutrals`);
        const triggerReason = triggers.join(' | ') || 'Underperforming';

        return {
          rank: rankLabel,
          teamName: t['Team Name'],
          initial: Number(t['Initial Samples (Token)']) || 0,
          nonAccDeducted: Number(t['Total Non-Acc. Deducted']) || 0,
          finalSamples: Number(t['Final Total Samples']) || 0,
          accDet: accDet,
          detractorPct: t['Detractor %'] || '0.0%',
          accNeu: accNeu,
          neutralPct: t['Neutral %'] || '0.0%',
          promoters: Number(t['Final Promoters']) || 0,
          promoterPct: t['Promoter %'] || '0.0%',
          triggerReason: triggerReason,
          consequence: t['Correct Consequence (Escalation Matrix)'] || getEscalationConsequence(accDet, accNeu),
          action: t['Action'] || '-',
          actionDate: t['Action Date'] || '-',
          status: t['Status'] || '-',
          notes: t['Disciplinary & Policy Notes'] || '-'
        };
      });

      // Compute Month Totals (For all month teams)
      const monthSumInitial = allTeamsData.reduce((s, t) => s + (Number(t['Initial Samples (Token)']) || 0), 0);
      const monthSumNonAcc = allTeamsData.reduce((s, t) => s + (Number(t['Total Non-Acc. Deducted']) || 0), 0);
      const monthSumFinal = allTeamsData.reduce((s, t) => s + (Number(t['Final Total Samples']) || 0), 0);
      const monthSumAccDet = allTeamsData.reduce((s, t) => s + (Number(t['Final Detractors (Accountable)']) || 0), 0);
      const monthSumAccNeu = allTeamsData.reduce((s, t) => s + (Number(t['Final Neutrals (Accountable)']) || 0), 0);
      const monthSumProm = allTeamsData.reduce((s, t) => s + (Number(t['Final Promoters']) || 0), 0);

      monthlyTeamRankings.push({
        period: p,
        monthFull: mFull,
        monthShort: mShort,
        rankedTeams,
        allTeamsCount: allTeamsData.length,
        breachedCount: underperformingTeams.length,
        summary: {
          initial: monthSumInitial,
          nonAcc: monthSumNonAcc,
          final: monthSumFinal,
          accDet: monthSumAccDet,
          accNeu: monthSumAccNeu,
          promoters: monthSumProm
        }
      });
    });

    // 2. TOP EXECUTIVE TIMELINE TABLE: MONTHLY UNDERPERFORMING TEAMS SUMMARY (ALL TEAMS)
    const maxBreachedCount = Math.max(3, ...monthlyTeamRankings.map(mr => mr.rankedTeams.length));
    const totalExecCols = 9 + maxBreachedCount; // cols 0..8 + dynamic ranks (#1..#N)

    const execTitleCell = XLSX.utils.encode_cell({ r: worstSheetRow, c: 0 });
    wsWorstTeams[execTitleCell] = {
      v: "2. EXECUTIVE TIMELINE: MONTHLY UNDERPERFORMING TEAMS SUMMARY (ALL BREACHED TEAMS)",
      t: 's',
      s: { font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "0F172A" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } }
    };
    wsWorstTeams['!merges'].push({ s: { r: worstSheetRow, c: 0 }, e: { r: worstSheetRow, c: totalExecCols - 1 } });

    const execLvl1 = [
      "MONTH / PERIOD",
      "OVERALL MONTHLY SAMPLES & ACC. METRICS", "", "", "", "", "", "",
      "ALL UNDERPERFORMING TEAMS (PROMOTERS < 80% OR DETRACTORS ≥ 2%)"
    ];
    while (execLvl1.length < totalExecCols) {
      execLvl1.push("");
    }

    const execLvl2 = [
      "Month",
      "Total Token",
      "Final Samples",
      "Acc. Detractors",
      "Detractor %",
      "Acc. Neutrals",
      "Promoters",
      "Promoter %",
      "Teams Breached"
    ];

    for (let k = 1; k <= maxBreachedCount; k++) {
      execLvl2.push(`#${k} Worst Team`);
    }

    XLSX.utils.sheet_add_aoa(wsWorstTeams, [execLvl1, execLvl2], { origin: XLSX.utils.encode_cell({ r: worstSheetRow + 1, c: 0 }) });

    // Merges for Executive Level 1
    wsWorstTeams['!merges'].push({ s: { r: worstSheetRow + 1, c: 0 }, e: { r: worstSheetRow + 2, c: 0 } });
    wsWorstTeams[XLSX.utils.encode_cell({ r: worstSheetRow + 1, c: 0 })] = {
      v: "Month",
      t: 's',
      s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E293B" } }, alignment: { horizontal: "center", vertical: "center" } }
    };

    wsWorstTeams['!merges'].push({ s: { r: worstSheetRow + 1, c: 1 }, e: { r: worstSheetRow + 1, c: 7 } });
    for (let c = 1; c <= 7; c++) {
      const cell = XLSX.utils.encode_cell({ r: worstSheetRow + 1, c });
      wsWorstTeams[cell] = {
        v: c === 1 ? "OVERALL MONTHLY SAMPLES & ACC. METRICS" : "",
        t: 's',
        s: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E40AF" } }, alignment: { horizontal: "center", vertical: "center" } }
      };
    }

    wsWorstTeams['!merges'].push({ s: { r: worstSheetRow + 1, c: 8 }, e: { r: worstSheetRow + 1, c: totalExecCols - 1 } });
    for (let c = 8; c < totalExecCols; c++) {
      const cell = XLSX.utils.encode_cell({ r: worstSheetRow + 1, c });
      wsWorstTeams[cell] = {
        v: c === 8 ? "ALL UNDERPERFORMING TEAMS (PROMOTERS < 80% OR DETRACTORS ≥ 2%)" : "",
        t: 's',
        s: { font: { bold: true, sz: 10, color: { rgb: "B91C1C" } }, fill: { fgColor: { rgb: "B91C1C" } }, alignment: { horizontal: "center", vertical: "center" } }
      };
    }

    // Exec Level 2 Sub-Headers Styling
    const baseLvl2Colors = ["1E293B", "2563EB", "4338CA", "DC2626", "B91C1C", "D97706", "059669", "047857", "9F1239"];
    const rankColors = ["991B1B", "C2410C", "D97706", "B45309", "92400E", "78350F", "451A03", "374151", "1F2937", "111827"];

    for (let c = 1; c < totalExecCols; c++) {
      const cell = XLSX.utils.encode_cell({ r: worstSheetRow + 2, c });
      const color = c < 9 ? baseLvl2Colors[c] : (rankColors[(c - 9) % rankColors.length] || "374151");
      if (wsWorstTeams[cell]) {
        wsWorstTeams[cell].s = {
          font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: color } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: { top: { style: 'thin', color: { rgb: 'CBD5E1' } }, bottom: { style: 'medium', color: { rgb: '0F172A' } }, left: { style: 'thin', color: { rgb: '94A3B8' } }, right: { style: 'thin', color: { rgb: '94A3B8' } } }
        };
      }
    }

    // Exec Data Rows
    const execRowsAoa = monthlyTeamRankings.map(mr => {
      const row = [
        mr.monthShort,
        mr.summary.initial,
        mr.summary.final,
        mr.summary.accDet,
        mr.summary.final > 0 ? `${((mr.summary.accDet / mr.summary.final) * 100).toFixed(1)}%` : '0%',
        mr.summary.accNeu,
        mr.summary.promoters,
        mr.summary.final > 0 ? `${((mr.summary.promoters / mr.summary.final) * 100).toFixed(1)}%` : '0%',
        `${mr.breachedCount} of ${mr.allTeamsCount} Teams`
      ];

      for (let k = 0; k < maxBreachedCount; k++) {
        if (mr.rankedTeams[k]) {
          const t = mr.rankedTeams[k];
          row.push(`${t.teamName} (${t.accDet} Det, ${t.promoterPct})`);
        } else {
          row.push('-');
        }
      }

      return row;
    });

    XLSX.utils.sheet_add_aoa(wsWorstTeams, execRowsAoa, { origin: XLSX.utils.encode_cell({ r: worstSheetRow + 3, c: 0 }) });

    for (let r = 0; r < execRowsAoa.length; r++) {
      const rowIdx = worstSheetRow + 3 + r;
      for (let c = 0; c < totalExecCols; c++) {
        const cell = XLSX.utils.encode_cell({ r: rowIdx, c });
        if (!wsWorstTeams[cell]) continue;

        let fontColor = "1E293B";
        let bgColor = "FFFFFF";

        if (c === 0) {
          fontColor = "1E293B";
        } else if (c === 1 || c === 2) {
          fontColor = "1E40AF";
          bgColor = "F8FAFC";
        } else if (c === 3 || c === 4) {
          fontColor = "B91C1C";
          bgColor = "FEF2F2";
        } else if (c === 6 || c === 7) {
          fontColor = "047857";
          bgColor = "ECFDF5";
        } else if (c === 8) {
          fontColor = "9F1239";
          bgColor = "FFF1F2";
        } else if (c === 9) {
          fontColor = "991B1B";
          bgColor = "FEE2E2"; // Red tint for #1 worst
        } else if (c === 10) {
          fontColor = "C2410C";
          bgColor = "FFEDD5"; // Orange tint for #2 worst
        } else if (c === 11) {
          fontColor = "D97706";
          bgColor = "FEF3C7"; // Amber tint for #3 worst
        } else if (c > 11) {
          fontColor = "374151";
          bgColor = "F8FAFC";
        }

        wsWorstTeams[cell].s = {
          font: { bold: c === 0 || c >= 8, color: { rgb: fontColor } },
          fill: { fgColor: { rgb: bgColor } },
          alignment: { horizontal: c === 0 || c >= 9 ? "left" : "center", vertical: "center" },
          border: { top: { style: 'thin', color: { rgb: 'E2E8F0' } }, bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }, left: { style: 'thin', color: { rgb: 'E2E8F0' } }, right: { style: 'thin', color: { rgb: 'CBD5E1' } } }
        };
      }
    }

    worstSheetRow += 3 + execRowsAoa.length + 3;

    // 3. DETAILED MONTH-BY-MONTH RANKED TABLES FOR UNDERPERFORMING TEAMS
    monthlyTeamRankings.forEach((mr, pIdx) => {
      const mColor = monthColorPalette[pIdx % monthColorPalette.length];
      const startR = worstSheetRow;

      // Table Title Banner
      const titleCell = XLSX.utils.encode_cell({ r: startR, c: 0 });
      wsWorstTeams[titleCell] = {
        v: `${mr.monthFull.toUpperCase()} — UNDERPERFORMING TEAMS REVIEW (PROMOTERS < 80% OR DETRACTORS ≥ 2%)`,
        t: 's',
        s: { font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: mColor } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } }
      };
      wsWorstTeams['!merges'].push({ s: { r: startR, c: 0 }, e: { r: startR, c: 12 } });

      const headerR1 = startR + 1;
      const headerR2 = startR + 2;
      const dataStartR = startR + 3;

      // Level 1 Header (13 columns)
      const tableLvl1 = [
        "RANK & TEAM", "",
        "INITIAL SAMPLES & DEDUCTIONS", "", "",
        "ACCOUNTABLE DETRACTORS", "",
        "ACCOUNTABLE NEUTRALS", "",
        "PROMOTERS PERFORMANCE", "",
        "CRITERIA BREACH STATUS",
        "POLICY & ESCALATION"
      ];

      // Level 2 Sub-Headers
      const tableLvl2 = [
        "Rank",
        "Team Name",
        "Initial Token",
        "Non-Acc. Deducted",
        "Final Samples",
        "Acc. Detractors",
        "Detractor %",
        "Acc. Neutrals",
        "Neutral %",
        "Promoters",
        "Promoter %",
        "Breached Threshold(s)",
        "Correct Consequence (Escalation Matrix)"
      ];

      XLSX.utils.sheet_add_aoa(wsWorstTeams, [tableLvl1, tableLvl2], { origin: XLSX.utils.encode_cell({ r: headerR1, c: 0 }) });

      // Level 1 Merges & Styles
      const lvl1Groups = [
        { start: 0, end: 1, label: "RANK & TEAM", color: "1E293B" },
        { start: 2, end: 4, label: "INITIAL SAMPLES & DEDUCTIONS", color: "1E40AF" },
        { start: 5, end: 6, label: "ACCOUNTABLE DETRACTORS", color: "B91C1C" },
        { start: 7, end: 8, label: "ACCOUNTABLE NEUTRALS", color: "D97706" },
        { start: 9, end: 10, label: "PROMOTERS PERFORMANCE", color: "047857" },
        { start: 11, end: 11, label: "CRITERIA BREACH STATUS", color: "9F1239" },
        { start: 12, end: 12, label: "POLICY & ESCALATION", color: "581C87" }
      ];

      lvl1Groups.forEach(g => {
        if (g.start < g.end) {
          wsWorstTeams['!merges'].push({ s: { r: headerR1, c: g.start }, e: { r: headerR1, c: g.end } });
        }
        for (let c = g.start; c <= g.end; c++) {
          const cell = XLSX.utils.encode_cell({ r: headerR1, c });
          wsWorstTeams[cell] = {
            v: c === g.start ? g.label : "",
            t: 's',
            s: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: g.color } }, alignment: { horizontal: "center", vertical: "center" } }
          };
        }
      });

      // Level 2 Sub-Headers Styling
      const lvl2Colors = ["1E293B", "334155", "2563EB", "9F1239", "4338CA", "DC2626", "B91C1C", "F59E0B", "D97706", "059669", "047857", "BE123C", "6B21A8"];
      for (let c = 0; c <= 12; c++) {
        const cell = XLSX.utils.encode_cell({ r: headerR2, c });
        if (wsWorstTeams[cell]) {
          wsWorstTeams[cell].s = {
            font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: lvl2Colors[c] || "374151" } },
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
            border: { top: { style: 'thin', color: { rgb: 'CBD5E1' } }, bottom: { style: 'medium', color: { rgb: '0F172A' } }, left: { style: 'thin', color: { rgb: '94A3B8' } }, right: { style: 'thin', color: { rgb: '94A3B8' } } }
          };
        }
      }

      let fullTableAoa = [];
      if (mr.rankedTeams.length === 0) {
        fullTableAoa = [
          ["-", "All teams compliant (Promoters ≥ 80% and Detractors < 2%)", "-", "-", "-", "-", "-", "-", "-", "-", "-", "🟢 All Targets Met", "-"]
        ];
      } else {
        const rankedAoa = mr.rankedTeams.map(t => [
          t.rank,
          t.teamName,
          t.initial,
          t.nonAccDeducted,
          t.finalSamples,
          t.accDet,
          t.detractorPct,
          t.accNeu,
          t.neutralPct,
          t.promoters,
          t.promoterPct,
          t.triggerReason,
          t.consequence
        ]);

        const totalRow = [
          "TOTAL",
          `UNDERPERFORMING SUB-TOTAL (${mr.rankedTeams.length} TEAMS)`,
          mr.rankedTeams.reduce((s, t) => s + t.initial, 0),
          mr.rankedTeams.reduce((s, t) => s + t.nonAccDeducted, 0),
          mr.rankedTeams.reduce((s, t) => s + t.finalSamples, 0),
          mr.rankedTeams.reduce((s, t) => s + t.accDet, 0),
          "-",
          mr.rankedTeams.reduce((s, t) => s + t.accNeu, 0),
          "-",
          mr.rankedTeams.reduce((s, t) => s + t.promoters, 0),
          "-",
          `🔴 ${mr.rankedTeams.length} of ${mr.allTeamsCount} Teams Breached Benchmark`,
          "-"
        ];

        fullTableAoa = [...rankedAoa, totalRow];
      }

      XLSX.utils.sheet_add_aoa(wsWorstTeams, fullTableAoa, { origin: XLSX.utils.encode_cell({ r: dataStartR, c: 0 }) });

      // Style Data Rows
      for (let r = 0; r < fullTableAoa.length; r++) {
        const rowIdx = dataStartR + r;
        const isTotal = mr.rankedTeams.length > 0 && r === fullTableAoa.length - 1;
        const isWorst1 = !isTotal && mr.rankedTeams.length > 0 && r === 0;
        const isWorst2 = !isTotal && mr.rankedTeams.length > 0 && r === 1;
        const isWorst3 = !isTotal && mr.rankedTeams.length > 0 && r === 2;

        for (let c = 0; c <= 12; c++) {
          const cell = XLSX.utils.encode_cell({ r: rowIdx, c });
          if (!wsWorstTeams[cell]) continue;

          let fontColor = "1E293B";
          let bgColor = "FFFFFF";

          if (isTotal) {
            bgColor = "F1F5F9";
            fontColor = "0F172A";
          } else if (isWorst1) {
            bgColor = (c === 0 || c === 1 || c === 5 || c === 11) ? "FEE2E2" : "FFF5F5";
            fontColor = (c === 0 || c === 5 || c === 11) ? "991B1B" : "1E293B";
          } else if (isWorst2) {
            bgColor = (c === 0 || c === 1 || c === 5 || c === 11) ? "FFEDD5" : "FFFAF0";
            fontColor = (c === 0 || c === 5 || c === 11) ? "C2410C" : "1E293B";
          } else if (isWorst3) {
            bgColor = (c === 0 || c === 1 || c === 5 || c === 11) ? "FEF3C7" : "FFFDF0";
            fontColor = (c === 0 || c === 5 || c === 11) ? "D97706" : "1E293B";
          } else {
            if (c === 2 || c === 4) {
              fontColor = "1E40AF";
              bgColor = "F8FAFC";
            } else if (c === 5 || c === 6) {
              fontColor = "B91C1C";
              if (fullTableAoa[r][5] > 0) bgColor = "FEF2F2";
            } else if (c === 7 || c === 8) {
              fontColor = "D97706";
              if (fullTableAoa[r][7] > 0) bgColor = "FFFBEB";
            } else if (c === 9 || c === 10) {
              fontColor = "047857";
              bgColor = "ECFDF5";
            } else if (c === 11) {
              fontColor = "9F1239";
              bgColor = "FFF1F2";
            } else if (c === 12) {
              fontColor = "581C87";
              bgColor = "FAF5FF";
            }
          }

          wsWorstTeams[cell].s = {
            font: { bold: isTotal || isWorst1 || isWorst2 || isWorst3 || c === 0 || c === 1 || c === 4 || c === 11, color: { rgb: fontColor } },
            fill: { fgColor: { rgb: bgColor } },
            alignment: { horizontal: c === 1 || c === 11 || c === 12 ? "left" : "center", vertical: "center" },
            border: {
              top: { style: isTotal ? 'medium' : 'thin', color: { rgb: isTotal ? '334155' : 'E2E8F0' } },
              bottom: { style: isTotal ? 'medium' : 'thin', color: { rgb: isTotal ? '334155' : 'E2E8F0' } },
              left: { style: 'thin', color: { rgb: 'E2E8F0' } },
              right: { style: 'thin', color: { rgb: 'CBD5E1' } }
            }
          };
        }
      }

      worstSheetRow = dataStartR + fullTableAoa.length + 4;
    });

    const worstCols = [
      { wch: 12 }, // Col 0: Rank / Month
      { wch: 25 }, // Col 1: Team Name / Total Token
      { wch: 15 }, // Col 2: Initial Token / Final Samples
      { wch: 18 }, // Col 3: Non-Acc. Deducted / Acc. Detractors
      { wch: 15 }, // Col 4: Final Samples / Detractor %
      { wch: 16 }, // Col 5: Acc. Detractors / Acc. Neutrals
      { wch: 14 }, // Col 6: Detractor % / Promoters
      { wch: 16 }, // Col 7: Acc. Neutrals / Promoter %
      { wch: 18 }, // Col 8: Neutral % / Teams Breached
      { wch: 55 }, // Col 9: Promoters / All Underperforming Teams Complete Summary
      { wch: 32 }, // Col 10: Promoter % / #1 Worst Team
      { wch: 42 }, // Col 11: Breached Threshold(s) / #2 Worst Team
      { wch: 46 }  // Col 12: Policy & Escalation / #3 Worst Team
    ];
    while (worstCols.length < totalExecCols) {
      worstCols.push({ wch: 32 });
    }
    wsWorstTeams['!cols'] = worstCols;
    fixSheetRange(wsWorstTeams);

    // ═════════════════════════════════════════════════════════════════════════
    // 5.6 Team Development, Assessments & Action Logs Subsheet
    // ═════════════════════════════════════════════════════════════════════════
    const wsTeamDevLogs = XLSX.utils.aoa_to_sheet([[]]);
    wsTeamDevLogs['A1'] = {
      v: `TEAM DEVELOPMENT, ASSESSMENTS & ACTION LOGS - Completed Evaluations, Lab Audits, OTJ & Training Logs`,
      t: 's',
      s: {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '0F172A' } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
      }
    };
    if (!wsTeamDevLogs['!merges']) wsTeamDevLogs['!merges'] = [];
    wsTeamDevLogs['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 17 } });

    let devSheetRow = 2;

    // Helper to extract and merge all training sessions for a team from both team.sessionHistory and global allTrainingSessions
    const getMergedTeamTrainingSessions = (team) => {
      if (!team) return [];
      const idStr = team._id ? team._id.toString() : '';
      const normName = normalizeTeamName(team.teamName);

      // 1. Embedded sessions in team.sessionHistory
      const embedded = (Array.isArray(team.sessionHistory) ? team.sessionHistory : [])
        .filter(s => s && (s.sessionDate || s.createdAt))
        .map(s => ({
          _id: s._id?.toString() || `${team.teamName}_${s.sessionDate || s.createdAt}`,
          sessionTitle: s.sessionTitle || 'Training Workshop',
          sessionType: s.sessionType || 'Classroom & Practical',
          sessionDate: s.sessionDate || s.createdAt,
          duration: s.duration || '2 Hours',
          conductedBy: s.conductedBy || 'Trainer',
          location: s.location || 'Nokia Training Center',
          outlines: s.outlines,
          notes: s.notes || '',
          status: s.status || 'Completed',
          participants: [team],
          attendedTeams: [team.teamName || 'Unknown Team']
        }));

      // 2. Global sessions from allTrainingSessions where this team is participant
      const global = allTrainingSessions.filter(ts => {
        const parts = Array.isArray(ts.participants) ? ts.participants : [];
        return parts.some(p => {
          const pId = p?._id?.toString() || p?.toString();
          const pName = normalizeTeamName(p?.teamName || (typeof p === 'string' ? p : ''));
          return (idStr && pId === idStr) || (normName && pName === normName);
        });
      }).map(ts => ({
        _id: ts._id?.toString(),
        sessionTitle: ts.sessionTitle || 'Training Workshop',
        sessionType: ts.sessionType || 'Classroom & Practical',
        sessionDate: ts.sessionDate || ts.createdAt,
        duration: ts.duration || '2 Hours',
        conductedBy: ts.conductedBy || 'Trainer',
        location: ts.location || 'Nokia Training Center',
        outlines: ts.outlines,
        notes: ts.notes || '',
        status: ts.status || 'Completed',
        participants: ts.participants || [team],
        attendedTeams: (Array.isArray(ts.participants) ? ts.participants : [])
          .map(p => p?.teamName || (typeof p === 'string' ? p : team.teamName))
          .filter(Boolean)
      }));

      // Combine & Deduplicate by ID or (Title + Date)
      const sessionMap = new Map();
      embedded.forEach(s => {
        const dStr = s.sessionDate ? new Date(s.sessionDate).toISOString().split('T')[0] : '';
        const key = s._id || `${s.sessionTitle}_${dStr}`;
        sessionMap.set(key, s);
      });
      global.forEach(s => {
        const dStr = s.sessionDate ? new Date(s.sessionDate).toISOString().split('T')[0] : '';
        const key = s._id || `${s.sessionTitle}_${dStr}`;
        if (!sessionMap.has(key)) {
          sessionMap.set(key, s);
        } else {
          const existing = sessionMap.get(key);
          const mergedTeams = Array.from(new Set([...(existing.attendedTeams || []), ...(s.attendedTeams || [])]));
          existing.attendedTeams = mergedTeams;
        }
      });

      return Array.from(sessionMap.values()).sort((a, b) => new Date(b.sessionDate || 0) - new Date(a.sessionDate || 0));
    };

    // Build per-team comprehensive action logs
    const teamActionMatrix = fieldTeams.map((team, idx) => {
      const idStr = team._id ? team._id.toString() : '';
      const normName = normalizeTeamName(team.teamName);

      // 1. Online Test
      const teamQuizResults = allQuizResults.filter(q => {
        const qId = q.teamId?._id?.toString() || q.teamId?.toString();
        const qName = normalizeTeamName(q.teamName);
        return (idStr && qId === idStr) || (normName && qName === normName);
      }).sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0));

      const hasQuiz = teamQuizResults.length > 0;
      const latestQuiz = hasQuiz ? teamQuizResults[0] : null;
      const quizScore = latestQuiz ? Math.round(parseScoreValue(latestQuiz.percentage ?? latestQuiz.score) || 0) : null;
      const quizDate = latestQuiz?.submittedAt || latestQuiz?.createdAt ? format(new Date(latestQuiz.submittedAt || latestQuiz.createdAt), 'dd/MM/yyyy') : 'N/A';

      // 2. Lab Assessment
      const teamLabAssessments = allLabAssessments.filter(l => {
        const lId = l.fieldTeamId?._id?.toString() || l.fieldTeamId?.toString();
        const lName = normalizeTeamName(l.fieldTeamId?.teamName || l.fieldTeamName);
        return (idStr && lId === idStr) || (normName && lName === normName);
      }).sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));

      const hasLab = teamLabAssessments.length > 0;
      const latestLab = hasLab ? teamLabAssessments[0] : null;
      const labScore = latestLab && latestLab.totalScore !== undefined ? Math.round(Number(latestLab.totalScore)) : null;
      const labDate = latestLab?.date || latestLab?.createdAt ? format(new Date(latestLab.date || latestLab.createdAt), 'dd/MM/yyyy') : 'N/A';

      // 3. OTJ Assessment
      const teamOtjAssessments = allOtjAssessments.filter(o => {
        if (o.isDeleted) return false;
        const oId = o.fieldTeamId?._id?.toString() || o.fieldTeamId?.toString();
        const oName = normalizeTeamName(o.fieldTeamName || o.fieldTeamId?.teamName);
        return (idStr && oId === idStr) || (normName && oName === normName);
      }).sort((a, b) => new Date(b.assessmentDate || b.createdAt || 0) - new Date(a.assessmentDate || a.createdAt || 0));

      const hasOtj = teamOtjAssessments.length > 0;
      const latestOtj = hasOtj ? teamOtjAssessments[0] : null;
      const otjScore = latestOtj && latestOtj.overallScore !== undefined ? Math.round(Number(latestOtj.overallScore)) : null;
      const otjDate = latestOtj?.assessmentDate || latestOtj?.createdAt ? format(new Date(latestOtj.assessmentDate || latestOtj.createdAt), 'dd/MM/yyyy') : 'N/A';

      // 4. Training Sessions (Merged from team.sessionHistory and global allTrainingSessions)
      const teamTrainingSessions = getMergedTeamTrainingSessions(team);
      const hasTraining = teamTrainingSessions.length > 0;
      const latestTraining = hasTraining ? teamTrainingSessions[0] : null;
      const trainingDate = latestTraining?.sessionDate ? format(new Date(latestTraining.sessionDate), 'dd/MM/yyyy') : 'N/A';

      // Count completed pillars (out of 4)
      const completedPillars = (hasQuiz ? 1 : 0) + (hasLab ? 1 : 0) + (hasOtj ? 1 : 0) + (hasTraining ? 1 : 0);
      let complianceStatus = 'Pending Development Actions (0/4)';
      let complianceColor = 'B91C1C'; // Red
      if (completedPillars === 4) {
        complianceStatus = '🟢 Fully Qualified (4/4 Completed)';
        complianceColor = '047857'; // Green
      } else if (completedPillars === 3) {
        complianceStatus = '🔵 High Compliance (3/4 Completed)';
        complianceColor = '1E40AF'; // Blue
      } else if (completedPillars === 2) {
        complianceStatus = '🟡 Moderate Compliance (2/4 Completed)';
        complianceColor = 'D97706'; // Amber
      } else if (completedPillars === 1) {
        complianceStatus = '🟠 Partial Compliance (1/4 Completed)';
        complianceColor = 'EA580C'; // Orange
      }

      const getTeamStatusBadge = (t) => {
        if (!t) return '🟢 Active';
        if (t.isTerminated) return '🔴 Terminated';
        if (t.isResigned) return '⚪ Resigned';
        if (t.isSuspended) return '🟠 Suspended';
        if (t.isOnLeave) return '🟡 On Leave';
        return '🟢 Active';
      };

      const teamStatus = getTeamStatusBadge(team);

      return {
        teamCode: team.teamCode || `FT-${idx + 1}`,
        teamName: team.teamName || 'Unknown Team',
        company: team.teamCompany || 'Reach',
        contactNumber: team.contactNumber || 'N/A',
        teamStatus,
        hasQuiz,
        quizScore: quizScore !== null ? `${quizScore}%` : 'N/A',
        quizDate,
        hasLab,
        labScore: labScore !== null ? `${labScore}%` : 'N/A',
        labDate,
        hasOtj,
        otjScore: otjScore !== null ? `${otjScore}%` : 'N/A',
        otjDate,
        hasTraining,
        trainingCount: teamTrainingSessions.length,
        trainingDate,
        completedPillars,
        complianceStatus,
        complianceColor
      };
    });

    // 1. Executive Summary Table
    const totalTeamsCount = teamActionMatrix.length;
    const quizCompletedCount = teamActionMatrix.filter(t => t.hasQuiz).length;
    const labCompletedCount = teamActionMatrix.filter(t => t.hasLab).length;
    const otjCompletedCount = teamActionMatrix.filter(t => t.hasOtj).length;
    const trainingAttendedCount = teamActionMatrix.filter(t => t.hasTraining).length;
    const fullCertifiedCount = teamActionMatrix.filter(t => t.completedPillars === 4).length;

    const summaryHeaders = ['Action / Assessment Dimension', 'Description & Scope', 'Completed Teams Count', 'Total Teams', 'Completion Rate (%)', 'ISP Operational Compliance Status'];
    const summaryRows = [
      ['Online Test (Theoretical Knowledge)', 'Theoretical QA evaluation & online assessment', quizCompletedCount, totalTeamsCount, totalTeamsCount > 0 ? `${((quizCompletedCount / totalTeamsCount) * 100).toFixed(1)}%` : '0%', quizCompletedCount >= totalTeamsCount * 0.8 ? '🟢 High Coverage (≥ 80%)' : '🟠 In Progress'],
      ['Lab Assessment (Technical & Splicing)', 'Hands-on practical lab audit, splicing & equipment verification', labCompletedCount, totalTeamsCount, totalTeamsCount > 0 ? `${((labCompletedCount / totalTeamsCount) * 100).toFixed(1)}%` : '0%', labCompletedCount >= totalTeamsCount * 0.8 ? '🟢 High Coverage (≥ 80%)' : '🟠 In Progress'],
      ['On-The-Job (OTJ) Practical Assessment', 'Live on-site field installation audit & quality check', otjCompletedCount, totalTeamsCount, totalTeamsCount > 0 ? `${((otjCompletedCount / totalTeamsCount) * 100).toFixed(1)}%` : '0%', otjCompletedCount >= totalTeamsCount * 0.8 ? '🟢 High Coverage (≥ 80%)' : '🟠 In Progress'],
      ['Training Sessions & Upskilling', 'Conducted training workshops, refresher courses & corrective sessions', trainingAttendedCount, totalTeamsCount, totalTeamsCount > 0 ? `${((trainingAttendedCount / totalTeamsCount) * 100).toFixed(1)}%` : '0%', trainingAttendedCount >= totalTeamsCount * 0.8 ? '🟢 High Coverage (≥ 80%)' : '🟠 In Progress'],
      ['Fully Qualified Teams (All 4 Completed)', 'Field teams that completed all 4 development pillars', fullCertifiedCount, totalTeamsCount, totalTeamsCount > 0 ? `${((fullCertifiedCount / totalTeamsCount) * 100).toFixed(1)}%` : '0%', fullCertifiedCount >= totalTeamsCount * 0.6 ? '🟢 Compliant' : '🟡 In Progress']
    ];

    // Add Table 1: Executive KPI Overview
    const addActionTable = (ws, title, titleColorHex, headers, dataRows, startR) => {
      const titleCell = XLSX.utils.encode_cell({ r: startR, c: 0 });
      ws[titleCell] = {
        v: title,
        t: 's',
        s: {
          font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: titleColorHex } },
          alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
        }
      };
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: startR, c: 0 }, e: { r: startR, c: headers.length - 1 } });

      const headerRowIdx = startR + 1;
      XLSX.utils.sheet_add_aoa(ws, [headers], { origin: XLSX.utils.encode_cell({ r: headerRowIdx, c: 0 }) });
      for (let c = 0; c < headers.length; c++) {
        const hCell = XLSX.utils.encode_cell({ r: headerRowIdx, c });
        if (ws[hCell]) {
          ws[hCell].s = {
            font: { bold: true, sz: 9.5, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '1E293B' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: { top: { style: 'thin', color: { rgb: 'CBD5E1' } }, bottom: { style: 'medium', color: { rgb: '0F172A' } }, left: { style: 'thin', color: { rgb: '94A3B8' } }, right: { style: 'thin', color: { rgb: '94A3B8' } } }
          };
        }
      }

      const dataStartRowIdx = startR + 2;
      XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: XLSX.utils.encode_cell({ r: dataStartRowIdx, c: 0 }) });

      for (let r = 0; r < dataRows.length; r++) {
        const rowIdx = dataStartRowIdx + r;
        for (let c = 0; c < headers.length; c++) {
          const dCell = XLSX.utils.encode_cell({ r: rowIdx, c });
          if (!ws[dCell]) continue;

          let fontColor = '1E293B';
          let bgColor = (r % 2 === 1) ? 'F8FAFC' : 'FFFFFF';
          let isBold = c === 0 || c === 1 || c === 2 || c === headers.length - 1;

          ws[dCell].s = {
            font: { bold: isBold, sz: 9.5, color: { rgb: fontColor } },
            fill: { fgColor: { rgb: bgColor } },
            alignment: { horizontal: (c === 0 || c === 1 || c === headers.length - 1) ? 'left' : 'center', vertical: 'center' },
            border: { top: { style: 'thin', color: { rgb: 'E2E8F0' } }, bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }, left: { style: 'thin', color: { rgb: 'E2E8F0' } }, right: { style: 'thin', color: { rgb: 'CBD5E1' } } }
          };
        }
      }

      return dataStartRowIdx + dataRows.length;
    };

    // Helper for adding interceptor between tables
    const addSheetInterceptor = (ws, rowIdx, maxCols = 19) => {
      const sepCell = XLSX.utils.encode_cell({ r: rowIdx, c: 0 });
      ws[sepCell] = {
        v: "------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------",
        t: 's',
        s: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "000000" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } }
      };
      ws['!merges'].push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: maxCols - 1 } });
    };

    // Table 1: Executive KPI Overview
    devSheetRow = addActionTable(
      wsTeamDevLogs,
      '1. EXECUTIVE SUMMARY: FIELD TEAMS DEVELOPMENT & ACTION COMPLETION RATES',
      '1E1B4B',
      summaryHeaders,
      summaryRows,
      devSheetRow
    ) + 2;

    addSheetInterceptor(wsTeamDevLogs, devSheetRow, 19);
    devSheetRow += 2;

    // Table 2: Master Field Team Action Matrix
    const masterHeaders = [
      '#', 'Team Code', 'Team Name', 'Subcontractor / Company', 'Contact Number', 'Operational Status',
      'Online Test Status', 'Online Test Score', 'Online Test Date',
      'Lab Audit Status', 'Lab Audit Score', 'Lab Audit Date',
      'OTJ Audit Status', 'OTJ Audit Score', 'OTJ Audit Date',
      'Training Status', 'Attended Sessions', 'Latest Training Date',
      'Overall Action & Qualification Status'
    ];

    const masterRows = teamActionMatrix.map((t, i) => [
      i + 1,
      t.teamCode,
      t.teamName,
      t.company,
      t.contactNumber,
      t.teamStatus,
      t.hasQuiz ? 'Completed' : 'Pending',
      t.quizScore,
      t.quizDate,
      t.hasLab ? 'Completed' : 'Pending',
      t.labScore,
      t.labDate,
      t.hasOtj ? 'Completed' : 'Pending',
      t.otjScore,
      t.otjDate,
      t.hasTraining ? 'Attended' : 'Not Attended',
      t.trainingCount,
      t.trainingDate,
      t.complianceStatus
    ]);

    devSheetRow = addActionTable(
      wsTeamDevLogs,
      '2. MASTER FIELD TEAM ACTION & QUALIFICATION MATRIX (ALL TEAMS & 4 DEVELOPMENT PILLARS)',
      '0F172A',
      masterHeaders,
      masterRows,
      devSheetRow
    ) + 2;

    addSheetInterceptor(wsTeamDevLogs, devSheetRow, 19);
    devSheetRow += 2;

    // Table 3: Detailed Online Test Results Logs (Active Teams Only)
    const activeQuizResults = allQuizResults.filter(q => isTeamNameOrIdActive(q.teamName || q.teamId?.teamName, q.teamId?._id || q.teamId));
    const quizLogsHeaders = ['#', 'Team Name', 'Company', 'Quiz Code / Title', 'Score (%)', 'Result / Status', 'Date Taken'];
    const quizLogsRows = activeQuizResults.map((q, i) => [
      i + 1,
      q.teamName || q.teamId?.teamName || 'Unknown',
      q.teamId?.teamCompany || 'Reach',
      q.quizTitle || q.quizCode || 'Online Test',
      q.percentage !== undefined ? `${Math.round(Number(q.percentage))}%` : (q.score !== undefined ? `${Math.round(Number(q.score))}%` : 'N/A'),
      q.passed ? 'Passed' : 'Completed',
      q.submittedAt || q.createdAt ? format(new Date(q.submittedAt || q.createdAt), 'dd/MM/yyyy') : 'N/A'
    ]);

    devSheetRow = addActionTable(
      wsTeamDevLogs,
      `3. ONLINE TEST (THEORETICAL) DETAILED LOGS (${quizLogsRows.length} Records)`,
      '0D9488',
      quizLogsHeaders,
      quizLogsRows.length > 0 ? quizLogsRows : [[1, 'No Quiz Records Found', '-', '-', '-', '-', '-']],
      devSheetRow
    ) + 2;

    addSheetInterceptor(wsTeamDevLogs, devSheetRow, 18);
    devSheetRow += 2;

    // Table 4: Detailed Lab Assessment Logs (Active Teams Only)
    const activeLabAssessments = allLabAssessments.filter(l => isTeamNameOrIdActive(l.fieldTeamId?.teamName || l.fieldTeamName, l.fieldTeamId?._id || l.fieldTeamId));
    const labLogsHeaders = ['#', 'Team Name', 'Assessment Type', 'ONT Model / Setup', 'Total Score (%)', 'Splicing Machine', 'Electrode Lifetime', 'Assessor', 'Date', 'Comments / Action Log'];
    const labLogsRows = activeLabAssessments.map((l, i) => [
      i + 1,
      l.fieldTeamId?.teamName || l.fieldTeamName || 'Unknown',
      l.assessmentType || 'Technical',
      l.ontType?.name || 'Standard',
      l.totalScore !== undefined ? `${Math.round(Number(l.totalScore))}%` : 'N/A',
      l.splicingMachineStatus || 'Good',
      l.electrodeLifetime || 0,
      l.assessorId?.name || 'Assessor',
      l.date || l.createdAt ? format(new Date(l.date || l.createdAt), 'dd/MM/yyyy') : 'N/A',
      l.comments || 'Assessment completed successfully'
    ]);

    devSheetRow = addActionTable(
      wsTeamDevLogs,
      `4. LAB AUDIT & ASSESSMENT DETAILED LOGS (${labLogsRows.length} Records)`,
      'B45309',
      labLogsHeaders,
      labLogsRows.length > 0 ? labLogsRows : [[1, 'No Lab Assessment Records Found', '-', '-', '-', '-', '-', '-', '-', '-']],
      devSheetRow
    ) + 2;

    addSheetInterceptor(wsTeamDevLogs, devSheetRow, 18);
    devSheetRow += 2;

    // Helper functions for OTJ checkpoint analysis
    const getOtjCheckpointLabel = (checkpointName = '', score = 0) => {
      const name = String(checkpointName);
      if (name === "Consumables Availability") {
        if (score >= 5) return "Fully Available";
        if (score >= 4) return "Mostly Available";
        if (score >= 3) return "Partially Available";
        if (score >= 2) return "Limited";
        return "Not Available";
      }
      if (name.includes("Equipment Condition") || name.includes("Tools Condition")) {
        if (score >= 5) return "Excellent Condition";
        if (score >= 4) return "Good";
        if (score >= 3) return "Fair / Functional";
        if (score >= 2) return "Substandard";
        return "Defective / Non-Functional";
      }
      if (name === "Patience and Precision") {
        if (score >= 5) return "Meticulous / Patient";
        if (score >= 4) return "Precise";
        if (score >= 3) return "Adequate";
        if (score >= 2) return "Poor Precision";
        return "Rushed / Careless";
      }
      if (name === "Communication") {
        if (score >= 5) return "Exceptional";
        if (score >= 4) return "Professional";
        if (score >= 3) return "Average";
        if (score >= 2) return "Minimal";
        return "Poor";
      }
      if (name === "Appearance") {
        if (score >= 5) return "Flawless";
        if (score >= 4) return "Neat / Professional";
        if (score >= 3) return "Acceptable";
        if (score >= 2) return "Incomplete Uniform";
        return "Unprofessional / Untidy";
      }

      if (score >= 4.5) return "Excellent";
      if (score >= 3.5) return "Good";
      if (score >= 2.5) return "Satisfactory";
      if (score >= 1.5) return "Needs Improvement";
      return "Poor";
    };

    const analyzeOtjAssessment = (assessment) => {
      const checkPoints = Array.isArray(assessment?.checkPoints) ? assessment.checkPoints : [];
      if (checkPoints.length === 0) {
        return {
          strengthsSummary: 'N/A',
          weaknessesSummary: 'N/A',
          categoryProficiency: 'N/A',
          topStrength: 'N/A',
          topWeakness: 'N/A',
          proficiencyLevel: 'No Data'
        };
      }

      const scoreNum = Number(assessment.overallScore || 0);
      let proficiencyLevel = 'Satisfactory';
      if (scoreNum >= 85) proficiencyLevel = 'Mastered (≥ 85%)';
      else if (scoreNum >= 75) proficiencyLevel = 'Competent (75-84%)';
      else if (scoreNum >= 60) proficiencyLevel = 'Satisfactory (60-74%)';
      else proficiencyLevel = 'Needs Improvement (< 60%)';

      // Sort checkpoints
      const sortedDesc = [...checkPoints].sort((a, b) => (b.score || 0) - (a.score || 0));
      const sortedAsc = [...checkPoints].sort((a, b) => (a.score || 0) - (b.score || 0));

      const strengthItems = sortedDesc
        .filter(cp => (cp.score || 0) >= 4)
        .slice(0, 3)
        .map(cp => `🟢 ${cp.name} [${cp.score}/5: ${getOtjCheckpointLabel(cp.name, cp.score)}]`);

      const finalStrengths = strengthItems.length > 0
        ? strengthItems
        : sortedDesc.slice(0, 2).map(cp => `🟢 ${cp.name} [${cp.score}/5]`);

      const weaknessItems = sortedAsc
        .filter(cp => (cp.score || 0) <= 2)
        .slice(0, 3)
        .map(cp => `🔴 ${cp.name} [${cp.score}/5: ${getOtjCheckpointLabel(cp.name, cp.score)}]`);

      const finalWeaknesses = weaknessItems.length > 0
        ? weaknessItems
        : sortedAsc.slice(0, 2).map(cp => `🔴 ${cp.name} [${cp.score}/5]`);

      // Category stats
      const catStats = {};
      checkPoints.forEach(cp => {
        const cat = cp.category || 'General';
        if (!catStats[cat]) catStats[cat] = { earned: 0, max: 0 };
        catStats[cat].earned += (cp.score || 0);
        catStats[cat].max += 5;
      });

      const categoryProficiency = Object.entries(catStats)
        .map(([cat, val]) => `${cat}: ${Math.round((val.earned / val.max) * 100)}%`)
        .join(' | ');

      return {
        strengthsSummary: finalStrengths.join('\n'),
        weaknessesSummary: finalWeaknesses.join('\n'),
        categoryProficiency,
        topStrength: finalStrengths[0] || 'N/A',
        topWeakness: finalWeaknesses[0] || 'N/A',
        proficiencyLevel
      };
    };

    // Table 5: Detailed OTJ Practical Assessment Logs with Cognitive Insights (Active Teams Only)
    const otjLogsHeaders = [
      '#', 'Team Name', 'Company', 'Overall Score (%)', 'Proficiency Level',
      '🏆 Core Strengths (Strongest Areas)', '🛠️ Growth Opportunities (Weakest Areas)',
      '📊 Category Proficiency Breakdown', 'Inspector', 'Assessment Date', 'Specialist Feedback & Action Notes'
    ];

    const activeOtjAssessments = allOtjAssessments.filter(o => !o.isDeleted && isTeamNameOrIdActive(o.fieldTeamName || o.fieldTeamId?.teamName, o.fieldTeamId?._id || o.fieldTeamId));
    const otjLogsRows = activeOtjAssessments.map((o, i) => {
      const analysis = analyzeOtjAssessment(o);
      const teamComp = o.fieldTeamId?.teamCompany || 'Reach';
      const teamNameStr = o.fieldTeamName || o.fieldTeamId?.teamName || 'Unknown Team';
      const overallPct = o.overallScore !== undefined ? `${Math.round(Number(o.overallScore))}%` : 'N/A';
      const auditDateStr = o.assessmentDate || o.createdAt ? format(new Date(o.assessmentDate || o.createdAt), 'dd/MM/yyyy') : 'N/A';

      return [
        i + 1,
        teamNameStr,
        teamComp,
        overallPct,
        analysis.proficiencyLevel,
        analysis.strengthsSummary,
        analysis.weaknessesSummary,
        analysis.categoryProficiency,
        o.conductedBy || 'Auditor',
        auditDateStr,
        o.feedback || 'Field quality audit completed'
      ];
    });

    devSheetRow = addActionTable(
      wsTeamDevLogs,
      `5. ON-THE-JOB (OTJ) PRACTICAL AUDIT LOGS — STRENGTHS, WEAKNESSES & COGNITIVE INSIGHTS (${otjLogsRows.length} Records)`,
      '7C3AED',
      otjLogsHeaders,
      otjLogsRows.length > 0 ? otjLogsRows : [[1, 'No OTJ Audit Records Found', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
      devSheetRow
    ) + 2;

    addSheetInterceptor(wsTeamDevLogs, devSheetRow, 18);
    devSheetRow += 2;

    // Table 5.1: Systemic Field Vulnerability & Strengths Aggregate Analysis
    const checkpointAggregates = {};
    activeOtjAssessments.forEach(o => {
      const cps = Array.isArray(o.checkPoints) ? o.checkPoints : [];
      cps.forEach(cp => {
        const cpName = cp.name;
        if (!cpName) return;
        if (!checkpointAggregates[cpName]) {
          checkpointAggregates[cpName] = {
            name: cpName,
            category: cp.category || 'General',
            totalScore: 0,
            count: 0,
            strengthsCount: 0,
            weaknessesCount: 0
          };
        }
        const s = Number(cp.score || 0);
        checkpointAggregates[cpName].totalScore += s;
        checkpointAggregates[cpName].count += 1;
        if (s >= 4) checkpointAggregates[cpName].strengthsCount += 1;
        if (s <= 2) checkpointAggregates[cpName].weaknessesCount += 1;
      });
    });

    const systemicBenchmarkRows = Object.values(checkpointAggregates)
      .map(cp => {
        const avgScore = cp.count > 0 ? (cp.totalScore / cp.count) : 0;
        const profPct = Math.round((avgScore / 5) * 100);
        let riskPriority = '🟢 Low Risk (Solid Strength)';
        if (profPct < 50 || cp.weaknessesCount >= Math.ceil(cp.count * 0.35)) {
          riskPriority = '🔴 Critical Vulnerability — Immediate Retraining Required';
        } else if (profPct < 70 || cp.weaknessesCount >= Math.ceil(cp.count * 0.2)) {
          riskPriority = '🟠 Moderate Vulnerability — Coaching Focus';
        } else if (profPct >= 85) {
          riskPriority = '🟢 Core Operational Strength';
        }

        return {
          name: cp.name,
          category: cp.category,
          avgScore: avgScore.toFixed(2),
          profPct: `${profPct}%`,
          profPctNum: profPct,
          strengthsCount: `${cp.strengthsCount} team${cp.strengthsCount !== 1 ? 's' : ''} (${cp.count > 0 ? Math.round((cp.strengthsCount / cp.count) * 100) : 0}%)`,
          weaknessesCount: `${cp.weaknessesCount} team${cp.weaknessesCount !== 1 ? 's' : ''} (${cp.count > 0 ? Math.round((cp.weaknessesCount / cp.count) * 100) : 0}%)`,
          riskPriority
        };
      })
      .sort((a, b) => a.profPctNum - b.profPctNum) // Ascending: worst weaknesses at top
      .map((row, idx) => [
        idx + 1,
        row.name,
        row.category,
        `${row.avgScore} / 5.00`,
        row.profPct,
        row.strengthsCount,
        row.weaknessesCount,
        row.riskPriority
      ]);

    const systemicHeaders = [
      '# Rank', 'Operational Checkpoint / Area', 'Skill Category', 'Average Score (/5)',
      'Proficiency Rate (%)', 'Teams Showing Strength (≥ 4/5)', 'Teams Requiring Improvement (≤ 2/5)', 'Systemic Risk & Priority Recommendation'
    ];

    devSheetRow = addActionTable(
      wsTeamDevLogs,
      `5.1 SYSTEMIC FIELD VULNERABILITY & STRENGTHS BENCHMARK (AGGREGATE AUDIT ANALYSIS)`,
      '5B21B6',
      systemicHeaders,
      systemicBenchmarkRows.length > 0 ? systemicBenchmarkRows : [[1, 'No Audit Checkpoints Data', '-', '-', '-', '-', '-', '-']],
      devSheetRow
    ) + 2;

    addSheetInterceptor(wsTeamDevLogs, devSheetRow, 18);
    devSheetRow += 2;

    // Table 6: Detailed Training Sessions Logs (Aggregated from both global and team-embedded sessions)
    const allUnifiedTrainingSessionsMap = new Map();

    // 1. Add all global training sessions
    allTrainingSessions.forEach(ts => {
      const parts = Array.isArray(ts.participants) ? ts.participants : [];
      const teamNames = parts.map(p => p?.teamName || (typeof p === 'string' ? p : '')).filter(Boolean);
      const dStr = ts.sessionDate ? new Date(ts.sessionDate).toISOString().split('T')[0] : '';
      const key = ts._id?.toString() || `${ts.sessionTitle || 'Training'}_${dStr}`;

      allUnifiedTrainingSessionsMap.set(key, {
        _id: ts._id?.toString(),
        sessionTitle: ts.sessionTitle || 'Training Workshop',
        sessionType: ts.sessionType || 'Classroom & Practical',
        sessionDate: ts.sessionDate,
        duration: ts.duration || '2 Hours',
        conductedBy: ts.conductedBy || 'Trainer',
        location: ts.location || 'Nokia Training Center',
        outlines: ts.outlines,
        notes: ts.notes || '',
        attendedTeams: teamNames
      });
    });

    // 2. Add all embedded sessions from each field team
    fieldTeams.forEach(ft => {
      const embedded = Array.isArray(ft.sessionHistory) ? ft.sessionHistory : [];
      embedded.forEach(s => {
        if (!s || (!s.sessionDate && !s.createdAt)) return;
        const dStr = (s.sessionDate || s.createdAt) ? new Date(s.sessionDate || s.createdAt).toISOString().split('T')[0] : '';
        const key = s._id?.toString() || `${s.sessionTitle || 'Training'}_${dStr}`;
        const tName = ft.teamName || 'Unknown Team';

        if (allUnifiedTrainingSessionsMap.has(key)) {
          const existing = allUnifiedTrainingSessionsMap.get(key);
          if (!existing.attendedTeams.includes(tName)) {
            existing.attendedTeams.push(tName);
          }
        } else {
          allUnifiedTrainingSessionsMap.set(key, {
            _id: s._id?.toString(),
            sessionTitle: s.sessionTitle || 'Training Workshop',
            sessionType: s.sessionType || 'Classroom & Practical',
            sessionDate: s.sessionDate || s.createdAt,
            duration: s.duration || '2 Hours',
            conductedBy: s.conductedBy || 'Trainer',
            location: s.location || 'Nokia Training Center',
            outlines: s.outlines,
            notes: s.notes || '',
            attendedTeams: [tName]
          });
        }
      });
    });

    const allUnifiedTrainingSessions = Array.from(allUnifiedTrainingSessionsMap.values())
      .sort((a, b) => new Date(b.sessionDate || 0) - new Date(a.sessionDate || 0));

    const trainingLogsHeaders = ['#', 'Session Title', 'Session Type', 'Session Date', 'Duration', 'Conducted By / Trainer', 'Location / Mode', 'Attended Teams Count', 'Attended Teams List', 'Topics & Outlines'];
    const trainingLogsRows = allUnifiedTrainingSessions.map((ts, i) => {
      const teamNamesList = ts.attendedTeams.join(', ');
      const topicsList = Array.isArray(ts.outlines) ? ts.outlines.map(o => o.mainTopic || (typeof o === 'string' ? o : '')).filter(Boolean).join('; ') : (ts.notes || 'General Training');

      return [
        i + 1,
        ts.sessionTitle || 'Training Workshop',
        ts.sessionType || 'Classroom & Practical',
        ts.sessionDate ? format(new Date(ts.sessionDate), 'dd/MM/yyyy') : 'N/A',
        ts.duration || '2 Hours',
        Array.isArray(ts.conductedBy) ? ts.conductedBy.join(', ') : (ts.conductedBy || 'Trainer'),
        ts.location || 'Nokia Training Center',
        ts.attendedTeams.length,
        teamNamesList || 'N/A',
        topicsList || 'N/A'
      ];
    });

    devSheetRow = addActionTable(
      wsTeamDevLogs,
      `6. TRAINING SESSIONS & ATTENDANCE LOGS (${trainingLogsRows.length} Sessions Conducted)`,
      '059669',
      trainingLogsHeaders,
      trainingLogsRows.length > 0 ? trainingLogsRows : [[1, 'No Training Session Records Found', '-', '-', '-', '-', '-', '-', '-', '-']],
      devSheetRow
    ) + 2;

    addSheetInterceptor(wsTeamDevLogs, devSheetRow, 18);
    devSheetRow += 2;

    // Table 6.1: Individual Field Teams Training Attendance Roster & Participation Logs
    const individualTrainingRows = fieldTeams.map((team, idx) => {
      const teamSessions = getMergedTeamTrainingSessions(team);
      const sessionsCount = teamSessions.length;
      const isTrained = sessionsCount > 0;
      const latestSession = isTrained ? teamSessions[0] : null;
      const latestDateStr = latestSession?.sessionDate ? format(new Date(latestSession.sessionDate), 'dd/MM/yyyy') : 'N/A';
      const latestTrainer = latestSession ? (Array.isArray(latestSession.conductedBy) ? latestSession.conductedBy.join(', ') : (latestSession.conductedBy || 'Trainer')) : 'N/A';

      const sessionsHistoryStr = isTrained
        ? teamSessions.map((s, sIdx) => {
          const sDate = s.sessionDate ? format(new Date(s.sessionDate), 'dd/MM/yyyy') : 'Date N/A';
          return `${sIdx + 1}. [${sDate}] ${s.sessionTitle || 'Training'}`;
        }).join('; ')
        : 'No training sessions attended yet';

      let complianceBadge = '🔴 Untrained (Pending Session Allocation)';
      if (sessionsCount >= 2) {
        complianceBadge = '🟢 Fully Trained (≥ 2 Sessions Completed)';
      } else if (sessionsCount === 1) {
        complianceBadge = '🔵 Trained (1 Session Completed)';
      }

      const getTeamStatusBadge = (t) => {
        if (!t) return '🟢 Active';
        if (t.isTerminated) return '🔴 Terminated';
        if (t.isResigned) return '⚪ Resigned';
        if (t.isSuspended) return '🟠 Suspended';
        if (t.isOnLeave) return '🟡 On Leave';
        return '🟢 Active';
      };

      return {
        teamCode: team.teamCode || `FT-${idx + 1}`,
        teamName: team.teamName || 'Unknown Team',
        company: team.teamCompany || 'Reach',
        contact: team.contactNumber || 'N/A',
        teamStatus: getTeamStatusBadge(team),
        isTrained,
        sessionsCount,
        sessionsCountStr: `${sessionsCount} session${sessionsCount !== 1 ? 's' : ''}`,
        latestDateStr,
        latestTrainer,
        sessionsHistoryStr,
        complianceBadge
      };
    });

    // Count totals
    const totalRosterCount = fieldTeams.length;
    const trainedTeamsList = individualTrainingRows.filter(t => t.isTrained);
    const trainedTeamsCount = trainedTeamsList.length;
    const untrainedTeamsCount = totalRosterCount - trainedTeamsCount;
    const totalAttendanceInstances = trainedTeamsList.reduce((sum, t) => sum + t.sessionsCount, 0);

    const individualTrainingHeaders = [
      '#', 'Team Code', 'Team Name', 'Company', 'Contact Number', 'Operational Status',
      'Training Attendance Status', 'Total Sessions Attended', 'Latest Training Date',
      'Latest Trainer / Specialist', 'Attended Training Sessions History & Topics', 'Training Compliance Status'
    ];

    const individualTrainingDataRows = trainedTeamsList.map((t, idx) => [
      idx + 1,
      t.teamCode,
      t.teamName,
      t.company,
      t.contact,
      t.teamStatus,
      '🟢 Trained / Attended',
      t.sessionsCountStr,
      t.latestDateStr,
      t.latestTrainer,
      t.sessionsHistoryStr,
      t.complianceBadge
    ]);

    // Add Summary Row at bottom
    if (individualTrainingDataRows.length > 0) {
      individualTrainingDataRows.push([
        'TOTAL TRAINED TEAMS',
        `${trainedTeamsCount} Teams`,
        `Trained Coverage: ${totalRosterCount > 0 ? ((trainedTeamsCount / totalRosterCount) * 100).toFixed(1) : 0}% (${trainedTeamsCount}/${totalRosterCount})`,
        `Untrained: ${untrainedTeamsCount} Teams`,
        '-',
        '🟢 Active Roster',
        '🟢 Certified Training Attendance',
        `${totalAttendanceInstances} Total Participations`,
        '-',
        '-',
        `All ${allTrainingSessions.length} Conducted Workshops Distributed Across ${trainedTeamsCount} Trained Field Teams`,
        `Roster Coverage: ${totalRosterCount > 0 ? ((trainedTeamsCount / totalRosterCount) * 100).toFixed(1) : 0}%`
      ]);
    }

    devSheetRow = addActionTable(
      wsTeamDevLogs,
      `6.1 TRAINED FIELD TEAMS ROSTER & PARTICIPATION LOGS (TOTAL TRAINED: ${trainedTeamsCount} / ${totalRosterCount} TEAMS)`,
      '047857',
      individualTrainingHeaders,
      individualTrainingDataRows.length > 0 ? individualTrainingDataRows : [[1, '-', 'No Trained Teams Recorded', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
      devSheetRow
    ) + 2;

    addSheetInterceptor(wsTeamDevLogs, devSheetRow, 18);
    devSheetRow += 2;

    wsTeamDevLogs['!cols'] = [
      { wch: 6 },  // Col 0: # / Rank
      { wch: 22 }, // Col 1: Team Code / Checkpoint
      { wch: 28 }, // Col 2: Team Name / Category
      { wch: 20 }, // Col 3: Company / Overall Score
      { wch: 20 }, // Col 4: Contact / Proficiency Level
      { wch: 18 }, // Col 5: Operational Status
      { wch: 20 }, // Col 6: Online Test Status / Core Strengths
      { wch: 18 }, // Col 7: Online Test Score / Growth Opportunities
      { wch: 18 }, // Col 8: Online Test Date / Category Breakdown
      { wch: 20 }, // Col 9: Lab Audit Status / Auditor
      { wch: 18 }, // Col 10: Lab Audit Score / Audit Date
      { wch: 18 }, // Col 11: Lab Audit Date / Feedback & Action Notes
      { wch: 18 }, // Col 12: OTJ Status
      { wch: 16 }, // Col 13: OTJ Score
      { wch: 16 }, // Col 14: OTJ Date
      { wch: 18 }, // Col 15: Training Status
      { wch: 20 }, // Col 16: Attended Sessions
      { wch: 20 }, // Col 17: Latest Training Date
      { wch: 45 }  // Col 18: Overall Action & Compliance Status
    ];

    fixSheetRange(wsTeamDevLogs);

    // 6. R.C & Team Impact Analysis Sheet
    const getScoreBucketCounts = (tasks, totalSampleCount = tasks.length) => {
      const counts = { promoters: 0, detractors: 0, neutrals: 0 };
      tasks.forEach(task => {
        const score = task.evaluationScore;
        if (score === null || score === 'N/A' || score === undefined || score === '') return;
        const numScore = Number(score);
        if (isNaN(numScore)) return;
        const norm = numScore <= 10 ? numScore * 10 : numScore;
        if (norm >= 0 && norm <= 60) counts.detractors += 1;
        else if (norm > 60 && norm <= 80) counts.neutrals += 1;
        else if (norm > 80) counts.promoters += 1;
      });

      const nonPromoters = counts.detractors + counts.neutrals;
      counts.promoters = Math.max(0, totalSampleCount - nonPromoters);
      return counts;
    };

    const getNormalizedFieldValues = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) {
        return val.flatMap(v => (typeof v === 'string' ? v.split(',').map(s => s.trim()) : [String(v).trim()])).filter(Boolean);
      }
      if (typeof val === 'string') {
        return val.split(',').map(s => s.trim()).filter(Boolean);
      }
      return [String(val).trim()].filter(Boolean);
    };

    const getFieldCountsByScore = (tasks, field) => {
      const map = {};
      tasks.forEach(task => {
        const score = task.evaluationScore;
        if (score === null || score === 'N/A' || score === undefined || score === '') return;
        const numScore = Number(score);
        if (isNaN(numScore)) return;
        const norm = numScore <= 10 ? numScore * 10 : numScore;
        const values = getNormalizedFieldValues(task[field]);

        values.forEach(val => {
          if (!map[val]) map[val] = { name: val, detractors: 0, neutrals: 0, promoters: 0, total: 0 };
          if (norm >= 0 && norm <= 60) {
            map[val].detractors += 1;
            map[val].total += 1;
          } else if (norm > 60 && norm <= 80) {
            map[val].neutrals += 1;
            map[val].total += 1;
          } else if (norm > 80) {
            map[val].promoters += 1;
          }
        });
      });
      return Object.values(map);
    };

    const totalSampleCount = totalSamplesToken > 0 ? totalSamplesToken : filteredTasks.length;
    const currentCounts = getScoreBucketCounts(filteredTasks, totalSampleCount);
    const beforePromoterPctNum = totalSampleCount > 0 ? (currentCounts.promoters / totalSampleCount) * 100 : 0;
    const beforeDetractorPctNum = totalSampleCount > 0 ? (currentCounts.detractors / totalSampleCount) * 100 : 0;
    const beforeNeutralPctNum = totalSampleCount > 0 ? (currentCounts.neutrals / totalSampleCount) * 100 : 0;
    const baseNPS = Math.round(beforePromoterPctNum - beforeDetractorPctNum);

    const simulateScenario = (detractorsToConvert, neutralsToConvert) => {
      const detConverted = Math.min(Math.max(0, detractorsToConvert || 0), currentCounts.detractors);
      const neuConverted = Math.min(Math.max(0, neutralsToConvert || 0), currentCounts.neutrals);
      const totalConverted = detConverted + neuConverted;

      const afterPromoters = currentCounts.promoters + totalConverted;
      const afterDetractors = currentCounts.detractors - detConverted;
      const afterNeutrals = currentCounts.neutrals - neuConverted;
      const total = totalSampleCount || 1;

      const afterPromoterPctNum = (afterPromoters / total) * 100;
      const afterDetractorPctNum = (afterDetractors / total) * 100;
      const afterNeutralPctNum = (afterNeutrals / total) * 100;
      const afterNPS = Math.round(afterPromoterPctNum - afterDetractorPctNum);

      const npsGain = afterNPS - baseNPS;

      // Base visual numbers (1 decimal place)
      const beforePromStr = beforePromoterPctNum.toFixed(1);
      const beforeDetStr = beforeDetractorPctNum.toFixed(1);
      const afterPromStr = afterPromoterPctNum.toFixed(1);
      const afterDetStr = afterDetractorPctNum.toFixed(1);

      // Compute display deltas directly from displayed 1-decimal values for visual consistency
      const promGain = +(parseFloat(afterPromStr) - parseFloat(beforePromStr)).toFixed(1);
      const detRed = +(parseFloat(beforeDetStr) - parseFloat(afterDetStr)).toFixed(1);

      return {
        detConverted,
        neuConverted,
        totalConverted,
        afterPromoters,
        afterPromotersPct: `${afterPromStr}%`,
        afterDetractors,
        afterDetractorsPct: `${afterDetStr}%`,
        afterNeutrals,
        afterNeutralsPct: `${afterNeutralPctNum.toFixed(1)}%`,
        afterNPS,
        npsImpact: npsGain >= 0 ? `+${npsGain}` : `${npsGain}`,
        promoterGain: promGain > 0 ? `+${promGain.toFixed(1)}%` : (promGain < 0 ? `-${Math.abs(promGain).toFixed(1)}%` : '0.0%'),
        detractorRed: detRed > 0 ? `-${detRed.toFixed(1)}%` : (detRed < 0 ? `+${Math.abs(detRed).toFixed(1)}%` : '0.0%')
      };
    };

    // 6. R.C & Team Impact Analysis Sheet (Modular Indicator-Focused Tables)
    const wsTextAnalysis = XLSX.utils.aoa_to_sheet([['R.C & Team Impact Analysis']]);
    wsTextAnalysis['A1'] = {
      v: 'R.C & TEAM IMPACT & KPI SIMULATION SUITE (MODULAR INDICATOR TABLES)',
      t: 's',
      s: {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '0F172A' } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
      }
    };
    if (!wsTextAnalysis['!merges']) wsTextAnalysis['!merges'] = [];
    wsTextAnalysis['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } });

    let impactSheetRow = 2; // Row 3 (0-indexed: 2)

    // Data Extraction for Indicator Tables (Gathering all affecting cases)
    const allRootCausesList = getFieldCountsByScore(filteredTasks, 'rootCause');

    // All root causes by Detractors (all causes with detractors > 0)
    const impactAllRootCausesDetractors = allRootCausesList
      .filter(rc => rc.detractors > 0)
      .sort((a, b) => b.detractors - a.detractors);

    // All root causes by Neutrals (all causes with neutrals > 0)
    const impactAllRootCausesNeutrals = allRootCausesList
      .filter(rc => rc.neutrals > 0)
      .sort((a, b) => b.neutrals - a.neutrals);

    // All root causes by Total (Detractors + Neutrals)
    const impactAllRootCausesCombined = allRootCausesList
      .filter(rc => rc.total > 0)
      .sort((a, b) => b.total - a.total);

    // All Owners by Total with identified issues

    const periodBreakdownRows = computeBreakdownRows(teamStatsMap, getTeamTokenForPeriod);


    // Helper to add a styled indicator table
    const addIndicatorTable = (titleText, titleColorHex, headers, dataRows, colStylesConfig) => {
      // 1. Title Banner
      const titleCell = XLSX.utils.encode_cell({ r: impactSheetRow, c: 0 });
      wsTextAnalysis[titleCell] = {
        v: titleText,
        t: 's',
        s: {
          font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: titleColorHex } },
          alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
        }
      };
      wsTextAnalysis['!merges'].push({ s: { r: impactSheetRow, c: 0 }, e: { r: impactSheetRow, c: headers.length - 1 } });
      for (let c = 1; c < headers.length; c++) {
        const cCell = XLSX.utils.encode_cell({ r: impactSheetRow, c });
        wsTextAnalysis[cCell] = { v: '', t: 's', s: { fill: { fgColor: { rgb: titleColorHex } } } };
      }

      // 2. Column Headers
      const headerRowIdx = impactSheetRow + 1;
      XLSX.utils.sheet_add_aoa(wsTextAnalysis, [headers], { origin: XLSX.utils.encode_cell({ r: headerRowIdx, c: 0 }) });
      for (let c = 0; c < headers.length; c++) {
        const hCell = XLSX.utils.encode_cell({ r: headerRowIdx, c });
        if (wsTextAnalysis[hCell]) {
          wsTextAnalysis[hCell].s = {
            font: { bold: true, sz: 9, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '334155' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: { top: { style: 'thin', color: { rgb: 'CBD5E1' } }, bottom: { style: 'medium', color: { rgb: '0F172A' } }, left: { style: 'thin', color: { rgb: '94A3B8' } }, right: { style: 'thin', color: { rgb: '94A3B8' } } }
          };
        }
      }

      // 3. Data Rows
      const dataStartRowIdx = impactSheetRow + 2;
      XLSX.utils.sheet_add_aoa(wsTextAnalysis, dataRows, { origin: XLSX.utils.encode_cell({ r: dataStartRowIdx, c: 0 }) });

      for (let r = 0; r < dataRows.length; r++) {
        const rowIdx = dataStartRowIdx + r;
        for (let c = 0; c < headers.length; c++) {
          const dCell = XLSX.utils.encode_cell({ r: rowIdx, c });
          if (!wsTextAnalysis[dCell]) continue;

          let fontColor = '1E293B';
          let bgColor = (r % 2 === 1) ? 'F8FAFC' : 'FFFFFF';
          let isBold = false;
          let align = (c === 0 || c === 1 || c === headers.length - 1) ? 'left' : 'center';

          if (colStylesConfig && colStylesConfig[c]) {
            const cfg = colStylesConfig[c](dataRows[r][c], dataRows[r], r);
            if (cfg.fontColor) fontColor = cfg.fontColor;
            if (cfg.bgColor) bgColor = cfg.bgColor;
            if (cfg.isBold !== undefined) isBold = cfg.isBold;
            if (cfg.align) align = cfg.align;
          }

          wsTextAnalysis[dCell].s = {
            font: { bold: isBold, sz: 9.5, color: { rgb: fontColor } },
            fill: { fgColor: { rgb: bgColor } },
            alignment: { horizontal: align, vertical: 'center' },
            border: { top: { style: 'thin', color: { rgb: 'E2E8F0' } }, bottom: { style: 'thin', color: { rgb: 'E2E8F0' } }, left: { style: 'thin', color: { rgb: 'E2E8F0' } }, right: { style: 'thin', color: { rgb: 'CBD5E1' } } }
          };
        }
      }

      impactSheetRow = dataStartRowIdx + dataRows.length + 2; // Advance with spacing
    };

    // ─────────────────────────────────────────────────────────────────────────
    // TABLE 1: BASELINE OVERALL PERFORMANCE (STARTING KPI STATUS)
    // ─────────────────────────────────────────────────────────────────────────
    const baseHeaders = [
      'Performance Dimension',
      'Evaluation Category / Score Range',
      'Sample Count',
      'Current Baseline Rate (%)',
      'Management KPI Target',
      'Status vs. Management Target'
    ];
    const baseDataRows = [
      [
        'Total Evaluated Feedback Pool',
        'Evaluated customer sample pool in filtered period',
        totalSampleCount
      ],
      [
        'Promoters (Positive Customer Feedback)',
        'Score 9-10 (Extremely Satisfied Customers)',
        currentCounts.promoters,
        `${beforePromoterPctNum.toFixed(1)}%`,
        '≥ 75.0% Standard Target',
        beforePromoterPctNum >= 75.0 ? 'Achieved (Compliant)' : `Under Target (Gap: -${(75.0 - beforePromoterPctNum).toFixed(1)}%)`
      ],
      [
        'Detractors (Customer Dissatisfaction)',
        'Score 0-6 (Complaints & Negative Feedback)',
        currentCounts.detractors,
        `${beforeDetractorPctNum.toFixed(1)}%`,
        '≤ 8.0% Containment Target',
        beforeDetractorPctNum <= 8.0 ? 'Within Limit (Compliant)' : `Exceeded Target (Gap: +${(beforeDetractorPctNum - 8.0).toFixed(1)}%)`
      ],
      [
        'Neutrals (Passive Experience)',
        'Score 7-8 (Passive / Potential Promoters)',
        currentCounts.neutrals,
        `${beforeNeutralPctNum.toFixed(1)}%`
      ],
      [
        'Net Promoter Score (NPS)',
        'Overall Starting NPS = Promoter % - Detractor %',
        '-',
        `${baseNPS}`,
        '≥ 67 NPS Standard Target',
        baseNPS >= 67 ? 'Target Met (Compliant)' : `Below Target (Gap: -${67 - baseNPS} pts)`
      ]
    ];

    addIndicatorTable(
      '1. BASELINE OVERALL PERFORMANCE (STARTING KPI STATUS)',
      '1E293B',
      baseHeaders,
      baseDataRows,
      {
        0: () => ({ isBold: true, fontColor: '0F172A' }),
        2: () => ({ isBold: true }),
        3: (_, row, r) => ({ isBold: true, fontColor: r === 1 ? '047857' : (r === 2 ? 'B91C1C' : (r === 3 ? 'D97706' : (r === 4 ? '1E40AF' : '1E293B'))), bgColor: r === 4 ? 'EFF6FF' : (r === 1 ? 'ECFDF5' : (r === 2 ? 'FEF2F2' : 'FFFFFF')) }),
        4: () => ({ isBold: true, fontColor: '475569' }),
        5: (_, row, r) => ({ isBold: true, fontColor: r === 1 ? (beforePromoterPctNum >= 75.0 ? '047857' : 'B91C1C') : (r === 2 ? (beforeDetractorPctNum <= 8.0 ? '047857' : 'B91C1C') : (r === 4 ? (baseNPS >= 67 ? '047857' : 'B91C1C') : '64748B')) })
      }
    );

    // ─────────────────────────────────────────────────────────────────────────
    // TABLE 2: ROOT CAUSE IMPACT ON DETRACTORS (DETRACTOR KPI REDUCTION)
    // ─────────────────────────────────────────────────────────────────────────
    const rcDetHeaders = [
      'Rank & Root Cause',
      'Focus Category',
      'Detractors Affected',
      'Before Detractor %',
      'After Detractor %',
      'Detractor Reduction (-%)',
      'Before NPS',
      'After NPS',
      'NPS Gain (+pts)',
      'Strategic Detractor Action Plan'
    ];

    const rcDetRows = impactAllRootCausesDetractors.map((rc, idx) => {
      const sim = simulateScenario(rc.detractors, 0);
      return [
        `#${idx + 1} Root Cause: ${rc.name}`,
        'Root Cause Detractors Elimination',
        rc.detractors,
        `${beforeDetractorPctNum.toFixed(1)}%`,
        sim.afterDetractorsPct,
        sim.detractorRed,
        baseNPS,
        sim.afterNPS,
        sim.npsImpact,
        `Eliminate all ${rc.detractors} detractors caused by ${rc.name} → Cuts detractor rate by ${sim.detractorRed} and boosts NPS from ${baseNPS} to ${sim.afterNPS}`
      ];
    });

    addIndicatorTable(
      '2. ROOT CAUSE IMPACT ON DETRACTORS (DETRACTOR KPI REDUCTION & NPS RECOVERY)',
      '991B1B',
      rcDetHeaders,
      rcDetRows,
      {
        0: () => ({ isBold: true, fontColor: '991B1B' }),
        2: (val) => ({ isBold: true, fontColor: 'B91C1C', bgColor: Number(val) > 0 ? 'FEF2F2' : 'FFFFFF' }),
        3: () => ({ fontColor: '64748B' }),
        4: () => ({ fontColor: 'B91C1C' }),
        5: () => ({ isBold: true, fontColor: 'B91C1C', bgColor: 'FEF2F2' }),
        6: () => ({ fontColor: '64748B' }),
        7: () => ({ isBold: true, fontColor: '1E40AF', bgColor: 'EFF6FF' }),
        8: () => ({ isBold: true, fontColor: '7C3AED', bgColor: 'F5F3FF' }),
        9: () => ({ fontColor: '475569' })
      }
    );

    // ─────────────────────────────────────────────────────────────────────────
    // TABLE 3: ROOT CAUSE IMPACT ON PROMOTERS (PROMOTER KPI GAIN)
    // ─────────────────────────────────────────────────────────────────────────
    const rcNeuHeaders = [
      'Rank & Root Cause',
      'Focus Category',
      'Neutrals Affected',
      'Before Promoter %',
      'After Promoter %',
      'Promoter Gain (+%)',
      'Before NPS',
      'After NPS',
      'NPS Gain (+pts)',
      'Strategic Promoter Action Plan'
    ];

    const rcNeuRows = impactAllRootCausesNeutrals.map((rc, idx) => {
      const sim = simulateScenario(0, rc.neutrals);
      return [
        `#${idx + 1} Root Cause: ${rc.name}`,
        'Neutral into Promoter Conversion',
        rc.neutrals,
        `${beforePromoterPctNum.toFixed(1)}%`,
        sim.afterPromotersPct,
        sim.promoterGain,
        baseNPS,
        sim.afterNPS,
        sim.npsImpact,
        `Elevate all ${rc.neutrals} passive neutrals under ${rc.name} to promoters → Increases promoter rate by ${sim.promoterGain} and boosts NPS from ${baseNPS} to ${sim.afterNPS}`
      ];
    });

    addIndicatorTable(
      '3. ROOT CAUSE IMPACT ON PROMOTERS (CONVERTING NEUTRALS TO PROMOTERS)',
      '047857',
      rcNeuHeaders,
      rcNeuRows,
      {
        0: () => ({ isBold: true, fontColor: '047857' }),
        2: (val) => ({ isBold: true, fontColor: 'D97706', bgColor: Number(val) > 0 ? 'FFFBEB' : 'FFFFFF' }),
        3: () => ({ fontColor: '64748B' }),
        4: () => ({ fontColor: '047857' }),
        5: () => ({ isBold: true, fontColor: '047857', bgColor: 'ECFDF5' }),
        6: () => ({ fontColor: '64748B' }),
        7: () => ({ isBold: true, fontColor: '1E40AF', bgColor: 'EFF6FF' }),
        8: () => ({ isBold: true, fontColor: '7C3AED', bgColor: 'F5F3FF' }),
        9: () => ({ fontColor: '475569' })
      }
    );

    // ─────────────────────────────────────────────────────────────────────────
    // TABLE 4: ROOT CAUSE FULL RESOLUTION SCENARIOS (COMBINED IMPACT)
    // ─────────────────────────────────────────────────────────────────────────
    const rcFullHeaders = [
      'Simulation Scenario',
      'Root Cause(s) Addressed',
      'Detractors Resolved',
      'Neutrals Elevated',
      'Total Issues Fixed',
      'Before NPS',
      'After NPS',
      'Total NPS Gain (+pts)',
      'Before Promoter %',
      'After Promoter %',
      'Promoter Gain (+%)',
      'Before Detractor %',
      'After Detractor %',
      'Detractor Reduction (-%)',
      'Comprehensive Strategic Impact'
    ];

    const rcFullRows = [];
    // All Individual Root Causes (ranked #1..#N)
    impactAllRootCausesCombined.forEach((rc, idx) => {
      const sim = simulateScenario(rc.detractors, rc.neutrals);
      rcFullRows.push([
        `#${idx + 1} RC Full Resolution Alone`,
        rc.name,
        rc.detractors,
        rc.neutrals,
        rc.total,
        baseNPS,
        sim.afterNPS,
        sim.npsImpact,
        `${beforePromoterPctNum.toFixed(1)}%`,
        sim.afterPromotersPct,
        sim.promoterGain,
        `${beforeDetractorPctNum.toFixed(1)}%`,
        sim.afterDetractorsPct,
        sim.detractorRed,
        `Full resolution of ${rc.total} items under ${rc.name} (${rc.detractors} det + ${rc.neutrals} neu) → NPS increases from ${baseNPS} to ${sim.afterNPS}`
      ]);
    });

    // Combined Bundles (Top 2..5)
    const maxComboBundles = Math.min(5, impactAllRootCausesCombined.length);
    for (let i = 2; i <= maxComboBundles; i++) {
      const selectedRCs = impactAllRootCausesCombined.slice(0, i);
      const comboDet = selectedRCs.reduce((sum, rc) => sum + rc.detractors, 0);
      const comboNeu = selectedRCs.reduce((sum, rc) => sum + rc.neutrals, 0);
      const comboTot = comboDet + comboNeu;
      const names = selectedRCs.map(rc => rc.name).join(' + ');
      const sim = simulateScenario(comboDet, comboNeu);

      rcFullRows.push([
        `Top ${i} Root Causes Combined (Full Resolution)`,
        names,
        comboDet,
        comboNeu,
        comboTot,
        baseNPS,
        sim.afterNPS,
        sim.npsImpact,
        `${beforePromoterPctNum.toFixed(1)}%`,
        sim.afterPromotersPct,
        sim.promoterGain,
        `${beforeDetractorPctNum.toFixed(1)}%`,
        sim.afterDetractorsPct,
        sim.detractorRed,
        `Multi-cause resolution across Top ${i} Causes (${comboTot} issues fixed) → NPS surges by ${sim.npsImpact} pts from ${baseNPS} to ${sim.afterNPS}`
      ]);
    }

    addIndicatorTable(
      '4. ROOT CAUSE FULL RESOLUTION SCENARIOS (COMBINED DETRACTORS + NEUTRALS & TOP CAUSE BUNDLES)',
      '4338CA',
      rcFullHeaders,
      rcFullRows,
      {
        0: (_, row) => ({ isBold: true, fontColor: String(row[0]).includes('Combined') ? '4338CA' : '1E293B', bgColor: String(row[0]).includes('Combined') ? 'EEF2FF' : 'FFFFFF' }),
        2: () => ({ fontColor: 'B91C1C' }),
        3: () => ({ fontColor: 'D97706' }),
        4: () => ({ isBold: true, fontColor: '581C87', bgColor: 'FAF5FF' }),
        5: () => ({ fontColor: '64748B' }),
        6: () => ({ isBold: true, fontColor: '1E40AF', bgColor: 'EFF6FF' }),
        7: () => ({ isBold: true, fontColor: '7C3AED', bgColor: 'F5F3FF' }),
        8: () => ({ fontColor: '64748B' }),
        9: () => ({ fontColor: '047857' }),
        10: () => ({ isBold: true, fontColor: '047857', bgColor: 'ECFDF5' }),
        11: () => ({ fontColor: '64748B' }),
        12: () => ({ fontColor: 'B91C1C' }),
        13: () => ({ isBold: true, fontColor: 'B91C1C', bgColor: 'FEF2F2' }),
        14: () => ({ fontColor: '475569' })
      }
    );

    // Helper to format numbers cleanly (integer if whole, 1 decimal if fraction)
    const fmtNum = (n) => {
      if (typeof n !== 'number') return n;
      return Number.isInteger(n) ? String(n) : n.toFixed(1);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // TABLE 5: RESPONSIBLE OWNERSHIP & DEPARTMENTAL IMPACT (TOTAL ISSUES IDENTIFIED DISTRIBUTION)
    // ─────────────────────────────────────────────────────────────────────────
    const ownerHeaders = [
      'Responsible Owner / Dept',
      'Resolution Scope',
      '# of Issues Identified',
      'Before Detractor %',
      'After Detractor %',
      'Detractor Reduction (-%)',
      'Before Promoter %',
      'After Promoter %',
      'Promoter Gain (+%)',
      'Before NPS',
      'After NPS',
      'NPS Impact (+pts)',
      'Ownership Accountability Directive'
    ];

    // Calculate Owner Impact metrics using total identified issues and shared-owner weighted allocation
    const ownerImpactMap = {};
    let reachYesImpact = { rawDet: 0, weightedDet: 0, rawNeu: 0, weightedNeu: 0, totalWeighted: 0 };
    let reachNoImpact = { rawDet: 0, weightedDet: 0, rawNeu: 0, weightedNeu: 0, totalWeighted: 0 };

    filteredTasks.forEach((task) => {
      const score = task.evaluationScore;
      if (score === null || score === 'N/A' || score === undefined || score === '') return;
      const numScore = Number(score);
      if (isNaN(numScore)) return;
      const norm = numScore <= 10 ? numScore * 10 : numScore;
      const isDetractor = norm >= 0 && norm <= 60;
      const isNeutral = norm > 60 && norm <= 80;
      if (!isDetractor && !isNeutral) return;

      const owners = normalizeArrayField(task.responsible);
      const accs = normalizeArrayField(task.teamAccountability);
      const ownerCount = Math.max(1, owners.length);
      const weight = 1 / ownerCount;

      owners.forEach((ownerName, i) => {
        const normOwner = ownerName.trim().toUpperCase();
        if (!ownerImpactMap[normOwner]) {
          ownerImpactMap[normOwner] = {
            name: ownerName.trim(),
            rawDet: 0,
            weightedDet: 0,
            rawNeu: 0,
            weightedNeu: 0,
            totalWeighted: 0
          };
        }

        const acc = accs[i] || (accs.length > 0 ? accs[0] : 'Unknown');
        const isAccYes = String(acc).trim().toLowerCase().startsWith('yes') || String(acc).trim().toLowerCase() === 'y';

        if (isDetractor) {
          ownerImpactMap[normOwner].rawDet += 1;
          ownerImpactMap[normOwner].weightedDet += weight;
          ownerImpactMap[normOwner].totalWeighted += weight;

          if (normOwner === 'REACH') {
            if (isAccYes) {
              reachYesImpact.rawDet += 1;
              reachYesImpact.weightedDet += weight;
              reachYesImpact.totalWeighted += weight;
            } else {
              reachNoImpact.rawDet += 1;
              reachNoImpact.weightedDet += weight;
              reachNoImpact.totalWeighted += weight;
            }
          }
        } else if (isNeutral) {
          ownerImpactMap[normOwner].rawNeu += 1;
          ownerImpactMap[normOwner].weightedNeu += weight;
          ownerImpactMap[normOwner].totalWeighted += weight;

          if (normOwner === 'REACH') {
            if (isAccYes) {
              reachYesImpact.rawNeu += 1;
              reachYesImpact.weightedNeu += weight;
              reachYesImpact.totalWeighted += weight;
            } else {
              reachNoImpact.rawNeu += 1;
              reachNoImpact.weightedNeu += weight;
              reachNoImpact.totalWeighted += weight;
            }
          }
        }
      });
    });

    const impactTopOwnersList = Object.values(ownerImpactMap)
      .filter(o => (o.rawDet + o.rawNeu) > 0)
      .sort((a, b) => (b.rawDet + b.rawNeu) - (a.rawDet + a.rawNeu));

    const ownerRows = [];
    const beforeDetPctStr = `${beforeDetractorPctNum.toFixed(1)}%`;
    const beforePromPctStr = `${beforePromoterPctNum.toFixed(1)}%`;

    impactTopOwnersList.forEach((owner, idx) => {
      const simTot = simulateScenario(owner.weightedDet, owner.weightedNeu);
      const totalRawIssues = owner.rawDet + owner.rawNeu;

      // Full Combined (Both Detractor and Neutral Conversion to Promoters)
      ownerRows.push([
        `#${idx + 1} Owner: ${owner.name}`,
        'Full Combined Resolution (Det + Neu)',
        totalRawIssues,
        beforeDetPctStr,
        owner.weightedDet > 0 ? simTot.afterDetractorsPct : '-',
        owner.weightedDet > 0 ? simTot.detractorRed : '-',
        beforePromPctStr,
        owner.weightedNeu > 0 ? simTot.afterPromotersPct : '-',
        owner.weightedNeu > 0 ? simTot.promoterGain : '-',
        baseNPS,
        simTot.afterNPS,
        simTot.npsImpact,
        `Full departmental resolution of ${totalRawIssues} identified issues (${owner.rawDet} det + ${owner.rawNeu} neu) under ${owner.name} → NPS surges to ${simTot.afterNPS} (${simTot.npsImpact} pts)`
      ]);

      // ── SPECIAL BREAKDOWN FOR OWNER: REACH ONLY ───────────────────────────
      const isReachOwner = (owner.name || '').toString().trim().toUpperCase() === 'REACH';
      if (isReachOwner) {
        // 1. Reach Field Teams (Accountable / Took Responsibility)
        const reachYesRaw = reachYesImpact.rawDet + reachYesImpact.rawNeu;
        if (reachYesRaw > 0) {
          const simYesTot = simulateScenario(reachYesImpact.weightedDet, reachYesImpact.weightedNeu);

          ownerRows.push([
            `  ↳ Reach: Field Teams (Accountable / Took Responsibility)`,
            'Full Combined Resolution (Det + Neu)',
            reachYesRaw,
            beforeDetPctStr,
            reachYesImpact.weightedDet > 0 ? simYesTot.afterDetractorsPct : '-',
            reachYesImpact.weightedDet > 0 ? simYesTot.detractorRed : '-',
            beforePromPctStr,
            reachYesImpact.weightedNeu > 0 ? simYesTot.afterPromotersPct : '-',
            reachYesImpact.weightedNeu > 0 ? simYesTot.promoterGain : '-',
            baseNPS,
            simYesTot.afterNPS,
            simYesTot.npsImpact,
            `Full field-accountable resolution of ${reachYesRaw} identified issues (${reachYesImpact.rawDet} det + ${reachYesImpact.rawNeu} neu) under Reach Field Teams → NPS surges to ${simYesTot.afterNPS} (${simYesTot.npsImpact} pts)`
          ]);
        }

        // 2. Reach Non-Accountable (Dispatching, Civil & Support Teams)
        const reachNoRaw = reachNoImpact.rawDet + reachNoImpact.rawNeu;
        if (reachNoRaw > 0) {
          const simNoTot = simulateScenario(reachNoImpact.weightedDet, reachNoImpact.weightedNeu);

          ownerRows.push([
            `  ↳ Reach: Non-Accountable (Dispatching, Civil & Support Teams)`,
            'Full Combined Resolution (Det + Neu)',
            reachNoRaw,
            beforeDetPctStr,
            reachNoImpact.weightedDet > 0 ? simNoTot.afterDetractorsPct : '-',
            reachNoImpact.weightedDet > 0 ? simNoTot.detractorRed : '-',
            beforePromPctStr,
            reachNoImpact.weightedNeu > 0 ? simNoTot.afterPromotersPct : '-',
            reachNoImpact.weightedNeu > 0 ? simNoTot.promoterGain : '-',
            baseNPS,
            simNoTot.afterNPS,
            simNoTot.npsImpact,
            `Full non-accountable resolution of ${reachNoRaw} identified issues (${reachNoImpact.rawDet} det + ${reachNoImpact.rawNeu} neu) under Reach (dispatching/civil) → NPS surges to ${simNoTot.afterNPS} (${simNoTot.npsImpact} pts)`
          ]);
        }
      }
    });

    // Combined Top 2..N Owners Full Resolution Bundles
    for (let i = 2; i <= impactTopOwnersList.length; i++) {
      const selectedOwners = impactTopOwnersList.slice(0, i);
      const comboWeightedDet = selectedOwners.reduce((sum, o) => sum + o.weightedDet, 0);
      const comboWeightedNeu = selectedOwners.reduce((sum, o) => sum + o.weightedNeu, 0);
      const comboTotRaw = selectedOwners.reduce((sum, o) => sum + (o.rawDet + o.rawNeu), 0);
      const sim = simulateScenario(comboWeightedDet, comboWeightedNeu);

      ownerRows.push([
        `Top ${i} Owners Combined`,
        'Full Cross-Departmental Resolution',
        comboTotRaw,
        beforeDetPctStr,
        comboWeightedDet > 0 ? sim.afterDetractorsPct : '-',
        comboWeightedDet > 0 ? sim.detractorRed : '-',
        beforePromPctStr,
        comboWeightedNeu > 0 ? sim.afterPromotersPct : '-',
        comboWeightedNeu > 0 ? sim.promoterGain : '-',
        baseNPS,
        sim.afterNPS,
        sim.npsImpact,
        `Combined cross-departmental resolution across Top ${i} Owners (${comboTotRaw} identified issues) pushes overall NPS from ${baseNPS} to ${sim.afterNPS} (${sim.npsImpact} pts)`
      ]);
    }

    addIndicatorTable(
      '5. RESPONSIBLE OWNERSHIP & DEPARTMENTAL IMPACT (TOTAL ISSUES IDENTIFIED DISTRIBUTION)',
      '6B21A8',
      ownerHeaders,
      ownerRows,
      {
        0: (_, row) => ({
          isBold: true,
          fontColor: String(row[0]).includes('Combined') ? '6B21A8' : (String(row[0]).includes('↳') ? '0369A1' : '1E293B'),
          bgColor: String(row[0]).includes('Combined') ? 'FAF5FF' : (String(row[0]).includes('↳') ? 'F0F9FF' : 'FFFFFF')
        }),
        1: (_, row) => ({ isBold: true, fontColor: String(row[1]).includes('Detractors') ? 'B91C1C' : (String(row[1]).includes('Neutrals') ? '047857' : '4338CA') }),
        2: () => ({ isBold: true }),
        3: (val) => ({ fontColor: val === '-' ? '94A3B8' : '64748B' }),
        4: (val) => ({ fontColor: val === '-' ? '94A3B8' : 'B91C1C' }),
        5: (val) => ({ isBold: val !== '-', fontColor: val === '-' ? '94A3B8' : 'B91C1C', bgColor: val === '-' ? 'FFFFFF' : 'FEF2F2' }),
        6: (val) => ({ fontColor: val === '-' ? '94A3B8' : '64748B' }),
        7: (val) => ({ fontColor: val === '-' ? '94A3B8' : '047857' }),
        8: (val) => ({ isBold: val !== '-', fontColor: val === '-' ? '94A3B8' : '047857', bgColor: val === '-' ? 'FFFFFF' : 'ECFDF5' }),
        9: () => ({ fontColor: '64748B' }),
        10: () => ({ isBold: true, fontColor: '1E40AF', bgColor: 'EFF6FF' }),
        11: () => ({ isBold: true, fontColor: '7C3AED', bgColor: 'F5F3FF' }),
        12: () => ({ fontColor: '475569' })
      }
    );

    // ─────────────────────────────────────────────────────────────────────────
    // TABLE 6, 7 & 8: WORST PERFORMING TEAMS IMPACT SIMULATIONS (SHARED-OWNER WEIGHTED)
    // ─────────────────────────────────────────────────────────────────────────
    const getTaskOwnerWeight = (task) => {
      const owners = normalizeArrayField(task.responsible);
      if (owners.length === 0) return 1;
      return 1 / owners.length;
    };

    // 1. Gather all unique team names from periodBreakdownRows and filteredTasks
    const allUniqueTeamNames = Array.from(new Set([
      ...periodBreakdownRows.map(r => r['Team Name']).filter(Boolean),
      ...filteredTasks.map(t => t.teamName).filter(Boolean)
    ]));

    // 2. Compute allocation and simulation metrics for each team
    const teamAllocationsList = allUniqueTeamNames.map(teamName => {
      const normName = teamName.trim().replace(/\s+/g, ' ').toLowerCase();
      const teamTasks = filteredTasks.filter(t => (t.teamName || '').trim().replace(/\s+/g, ' ').toLowerCase() === normName);

      const teamAccDetTasks = teamTasks.filter(t => isTaskAccountable(t) && (() => {
        const score = t.evaluationScore;
        if (score === null || score === 'N/A' || score === undefined || score === '') return false;
        const norm = Number(score) <= 10 ? Number(score) * 10 : Number(score);
        return norm >= 0 && norm <= 60;
      })());

      const teamAccNeuTasks = teamTasks.filter(t => isTaskAccountable(t) && (() => {
        const score = t.evaluationScore;
        if (score === null || score === 'N/A' || score === undefined || score === '') return false;
        const norm = Number(score) <= 10 ? Number(score) * 10 : Number(score);
        return norm > 60 && norm <= 80;
      })());

      const rawDet = teamAccDetTasks.length;
      const weightedDet = teamAccDetTasks.reduce((sum, t) => sum + getTaskOwnerWeight(t), 0);

      const rawNeu = teamAccNeuTasks.length;
      const weightedNeu = teamAccNeuTasks.reduce((sum, t) => sum + getTaskOwnerWeight(t), 0);

      const totalWeighted = weightedDet + weightedNeu;

      // Individual simulations
      const simDet = simulateScenario(weightedDet, 0);
      const simNeu = simulateScenario(0, weightedNeu);
      const simComb = simulateScenario(weightedDet, weightedNeu);

      const periodRow = periodBreakdownRows.find(r => (r['Team Name'] || '').trim().replace(/\s+/g, ' ').toLowerCase() === normName) || {};

      return {
        teamName,
        normName,
        rawDet,
        weightedDet,
        rawNeu,
        weightedNeu,
        totalWeighted,
        simDet,
        simNeu,
        simComb,
        detNpsGain: parseFloat(simDet.npsImpact) || 0,
        neuNpsGain: parseFloat(simNeu.npsImpact) || 0,
        combNpsGain: parseFloat(simComb.npsImpact) || 0,
        promoterPct: periodRow['Promoter %'] || 'N/A',
        detractorPct: periodRow['Detractor %'] || 'N/A'
      };
    });

    // ── Table 6: Worst Performing Teams Detractor Impact Simulation (Highest to Lowest) ──
    const detSortedTeams = teamAllocationsList
      .filter(t => t.weightedDet > 0 || t.rawDet > 0)
      .sort((a, b) => b.weightedDet - a.weightedDet || b.rawDet - a.rawDet || b.detNpsGain - a.detNpsGain);

    const worstTeamDetHeaders = [
      'Worst Team Rank',
      'Team Name',
      'Accountable Detractors (Raw)',
      'Weighted Detractors (Shared)',
      'Before Detractor %',
      'After Detractor %',
      'Detractor Reduction (-%)',
      'Baseline NPS',
      'Simulated NPS',
      'Team NPS Gain (+pts)',
      'Strategic Detractor Directive'
    ];

    const worstTeamDetRows = [];
    if (detSortedTeams.length > 0) {
      detSortedTeams.forEach((team, idx) => {
        const sharedDiff = team.rawDet - team.weightedDet;
        const sharedNote = sharedDiff > 0.01 ? ` (${sharedDiff.toFixed(1)} shared points allocated)` : '';

        worstTeamDetRows.push([
          `#${idx + 1} Detractor Team`,
          team.teamName,
          team.rawDet,
          fmtNum(team.weightedDet),
          `${beforeDetractorPctNum.toFixed(1)}%`,
          team.weightedDet > 0 ? team.simDet.afterDetractorsPct : '-',
          team.weightedDet > 0 ? team.simDet.detractorRed : '-',
          baseNPS,
          team.simDet.afterNPS,
          team.simDet.npsImpact,
          team.weightedDet > 0
            ? `Remediating ${fmtNum(team.weightedDet)} weighted detractors${sharedNote} from ${team.teamName} cuts overall detractor rate by ${team.simDet.detractorRed} and yields +${team.simDet.npsImpact} pts NPS recovery`
            : `Compliant (No accountable detractors)`
        ]);
      });

      if (detSortedTeams.length >= 2) {
        for (let i = 2; i <= detSortedTeams.length; i++) {
          const selectedTeams = detSortedTeams.slice(0, i);
          const comboRawDet = selectedTeams.reduce((sum, t) => sum + t.rawDet, 0);
          const comboWeightedDet = selectedTeams.reduce((sum, t) => sum + t.weightedDet, 0);
          const names = selectedTeams.map(t => t.teamName).join(' + ');
          const sim = simulateScenario(comboWeightedDet, 0);

          worstTeamDetRows.push([
            i === detSortedTeams.length ? `All ${detSortedTeams.length} Detractor Teams Combined` : `Top ${i} Detractor Teams Combined`,
            names,
            comboRawDet,
            fmtNum(comboWeightedDet),
            `${beforeDetractorPctNum.toFixed(1)}%`,
            comboWeightedDet > 0 ? sim.afterDetractorsPct : '-',
            comboWeightedDet > 0 ? sim.detractorRed : '-',
            baseNPS,
            sim.afterNPS,
            sim.npsImpact,
            `Collective detractor remediation across Top ${i} teams (${fmtNum(comboWeightedDet)} weighted det) raises overall NPS to ${sim.afterNPS} (${sim.npsImpact} pts gain)`
          ]);
        }
      }

      // Final Row: All Detractor Teams — Full Combined Remediation (Detractors + Related Neutrals)
      const allDetTeamsTotalWeightedDet = detSortedTeams.reduce((sum, t) => sum + t.weightedDet, 0);
      const allDetTeamsTotalWeightedNeu = detSortedTeams.reduce((sum, t) => sum + t.weightedNeu, 0);
      const allDetTeamsTotalRawDet = detSortedTeams.reduce((sum, t) => sum + t.rawDet, 0);
      const allDetTeamsTotalRawNeu = detSortedTeams.reduce((sum, t) => sum + t.rawNeu, 0);
      const allDetTeamsTotalRawIssues = allDetTeamsTotalRawDet + allDetTeamsTotalRawNeu;
      const allDetTeamsTotalWeighted = allDetTeamsTotalWeightedDet + allDetTeamsTotalWeightedNeu;
      const simDetFull = simulateScenario(allDetTeamsTotalWeightedDet, allDetTeamsTotalWeightedNeu);

      worstTeamDetRows.push([
        `All ${detSortedTeams.length} Detractor Teams — Full Combined (${fmtNum(allDetTeamsTotalWeightedDet)} Acc Detractors + ${fmtNum(allDetTeamsTotalWeightedNeu)} Neutrals = ${fmtNum(allDetTeamsTotalWeighted)} All Issues)`,
        detSortedTeams.map(t => t.teamName).join(' + '),
        `${allDetTeamsTotalRawDet} Det (${allDetTeamsTotalRawIssues} All Issues)`,
        `${fmtNum(allDetTeamsTotalWeightedDet)} Det (${fmtNum(allDetTeamsTotalWeighted)} All Issues)`,
        `${beforeDetractorPctNum.toFixed(1)}%`,
        allDetTeamsTotalWeightedDet > 0 ? simDetFull.afterDetractorsPct : '-',
        allDetTeamsTotalWeightedDet > 0 ? simDetFull.detractorRed : '-',
        baseNPS,
        simDetFull.afterNPS,
        simDetFull.npsImpact,
        `Full remediation across all ${detSortedTeams.length} detractor teams: resolving ${allDetTeamsTotalRawDet} raw (${fmtNum(allDetTeamsTotalWeightedDet)} weighted) accountable detractors + converting ${allDetTeamsTotalRawNeu} raw (${fmtNum(allDetTeamsTotalWeightedNeu)} weighted) related neutrals (${allDetTeamsTotalRawIssues} raw / ${fmtNum(allDetTeamsTotalWeighted)} weighted all issues) pushes NPS from ${baseNPS} to ${simDetFull.afterNPS} (${simDetFull.npsImpact} pts gain)`
      ]);
    } else {
      worstTeamDetRows.push([
        'All Teams Compliant',
        'No Accountable Detractors',
        0,
        0,
        `${beforeDetractorPctNum.toFixed(1)}%`,
        '-',
        '-',
        baseNPS,
        baseNPS,
        '+0.0',
        'No field teams with accountable detractors in this period.'
      ]);
    }

    addIndicatorTable(
      `6. WORST PERFORMING TEAMS DETRACTOR IMPACT SIMULATION (ALL ${detSortedTeams.length} DETRACTOR TEAMS & CUMULATIVE RECOVERY)`,
      '991B1B',
      worstTeamDetHeaders,
      worstTeamDetRows,
      {
        0: (_, row) => ({
          isBold: true,
          fontColor: String(row[0]).includes('Full Combined') ? '4C1D95' : (String(row[0]).includes('Combined') ? '7F1D1D' : '991B1B'),
          bgColor: String(row[0]).includes('Full Combined') ? 'F5F3FF' : (String(row[0]).includes('Combined') ? 'FEF2F2' : 'FFFFFF')
        }),
        2: () => ({ isBold: true, fontColor: '991B1B' }),
        3: () => ({ isBold: true, fontColor: 'B91C1C', bgColor: 'FEF2F2' }),
        4: () => ({ fontColor: '64748B' }),
        5: () => ({ fontColor: 'B91C1C' }),
        6: (val) => ({ isBold: val !== '-', fontColor: val === '-' ? '94A3B8' : 'B91C1C', bgColor: val === '-' ? 'FFFFFF' : 'FEF2F2' }),
        7: () => ({ fontColor: '64748B' }),
        8: () => ({ isBold: true, fontColor: '1E40AF', bgColor: 'EFF6FF' }),
        9: () => ({ isBold: true, fontColor: '7C3AED', bgColor: 'F5F3FF' }),
        10: () => ({ fontColor: '475569' })
      }
    );

    // ── Table 7: Worst Performing Teams Neutral Impact Simulation (Highest to Lowest) ──
    const neuSortedTeams = teamAllocationsList
      .filter(t => t.weightedNeu > 0 || t.rawNeu > 0)
      .sort((a, b) => b.weightedNeu - a.weightedNeu || b.rawNeu - a.rawNeu || b.neuNpsGain - a.neuNpsGain);

    const worstTeamNeuHeaders = [
      'Worst Team Rank',
      'Team Name',
      'Accountable Neutrals (Raw)',
      'Weighted Neutrals (Shared)',
      'Before Neutral %',
      'After Neutral %',
      'Promoter Gain (+%)',
      'Baseline NPS',
      'Simulated NPS',
      'Team NPS Gain (+pts)',
      'Strategic Neutral Directive'
    ];

    const worstTeamNeuRows = [];
    if (neuSortedTeams.length > 0) {
      neuSortedTeams.forEach((team, idx) => {
        const sharedDiff = team.rawNeu - team.weightedNeu;
        const sharedNote = sharedDiff > 0.01 ? ` (${sharedDiff.toFixed(1)} shared points allocated)` : '';

        worstTeamNeuRows.push([
          `#${idx + 1} Neutral Team`,
          team.teamName,
          team.rawNeu,
          fmtNum(team.weightedNeu),
          `${beforeNeutralPctNum.toFixed(1)}%`,
          team.weightedNeu > 0 ? team.simNeu.afterNeutralsPct : '-',
          team.weightedNeu > 0 ? team.simNeu.promoterGain : '-',
          baseNPS,
          team.simNeu.afterNPS,
          team.simNeu.npsImpact,
          team.weightedNeu > 0
            ? `Converting ${fmtNum(team.weightedNeu)} weighted neutrals${sharedNote} from ${team.teamName} to promoters adds +${team.simNeu.promoterGain} promoter share and yields +${team.simNeu.npsImpact} pts NPS recovery`
            : `Compliant (No accountable neutrals)`
        ]);
      });

      if (neuSortedTeams.length >= 2) {
        for (let i = 2; i <= neuSortedTeams.length; i++) {
          const selectedTeams = neuSortedTeams.slice(0, i);
          const comboRawNeu = selectedTeams.reduce((sum, t) => sum + t.rawNeu, 0);
          const comboWeightedNeu = selectedTeams.reduce((sum, t) => sum + t.weightedNeu, 0);
          const names = selectedTeams.map(t => t.teamName).join(' + ');
          const sim = simulateScenario(0, comboWeightedNeu);

          worstTeamNeuRows.push([
            i === neuSortedTeams.length ? `All ${neuSortedTeams.length} Neutral Teams Combined` : `Top ${i} Neutral Teams Combined`,
            names,
            comboRawNeu,
            fmtNum(comboWeightedNeu),
            `${beforeNeutralPctNum.toFixed(1)}%`,
            comboWeightedNeu > 0 ? sim.afterNeutralsPct : '-',
            comboWeightedNeu > 0 ? sim.promoterGain : '-',
            baseNPS,
            sim.afterNPS,
            sim.npsImpact,
            `Collective neutral conversion across Top ${i} teams (${fmtNum(comboWeightedNeu)} weighted neu) elevates overall NPS to ${sim.afterNPS} (${sim.npsImpact} pts gain)`
          ]);
        }
      }

      // Final Row: All Neutral Teams — Full Combined Remediation (Neutrals + Related Detractors)
      const allNeuTeamsTotalWeightedNeu = neuSortedTeams.reduce((sum, t) => sum + t.weightedNeu, 0);
      const allNeuTeamsTotalWeightedDet = neuSortedTeams.reduce((sum, t) => sum + t.weightedDet, 0);
      const allNeuTeamsTotalRawNeu = neuSortedTeams.reduce((sum, t) => sum + t.rawNeu, 0);
      const allNeuTeamsTotalRawDet = neuSortedTeams.reduce((sum, t) => sum + t.rawDet, 0);
      const allNeuTeamsTotalRawIssues = allNeuTeamsTotalRawNeu + allNeuTeamsTotalRawDet;
      const allNeuTeamsTotalWeighted = allNeuTeamsTotalWeightedNeu + allNeuTeamsTotalWeightedDet;
      const simNeuFull = simulateScenario(allNeuTeamsTotalWeightedDet, allNeuTeamsTotalWeightedNeu);

      worstTeamNeuRows.push([
        `All ${neuSortedTeams.length} Neutral Teams — Full Combined (${fmtNum(allNeuTeamsTotalWeightedNeu)} Acc Neutrals + ${fmtNum(allNeuTeamsTotalWeightedDet)} Detractors = ${fmtNum(allNeuTeamsTotalWeighted)} All Issues)`,
        neuSortedTeams.map(t => t.teamName).join(' + '),
        `${allNeuTeamsTotalRawNeu} Neu (${allNeuTeamsTotalRawIssues} All Issues)`,
        `${fmtNum(allNeuTeamsTotalWeightedNeu)} Neu (${fmtNum(allNeuTeamsTotalWeighted)} All Issues)`,
        `${beforeNeutralPctNum.toFixed(1)}%`,
        allNeuTeamsTotalWeightedNeu > 0 ? simNeuFull.afterNeutralsPct : '-',
        allNeuTeamsTotalWeightedNeu > 0 ? simNeuFull.promoterGain : '-',
        baseNPS,
        simNeuFull.afterNPS,
        simNeuFull.npsImpact,
        `Full remediation across all ${neuSortedTeams.length} neutral teams: converting ${allNeuTeamsTotalRawNeu} raw (${fmtNum(allNeuTeamsTotalWeightedNeu)} weighted) accountable neutrals + resolving ${allNeuTeamsTotalRawDet} raw (${fmtNum(allNeuTeamsTotalWeightedDet)} weighted) related detractors (${allNeuTeamsTotalRawIssues} raw / ${fmtNum(allNeuTeamsTotalWeighted)} weighted all issues) elevates NPS from ${baseNPS} to ${simNeuFull.afterNPS} (${simNeuFull.npsImpact} pts gain)`
      ]);
    } else {
      worstTeamNeuRows.push([
        'All Teams Compliant',
        'No Accountable Neutrals',
        0,
        0,
        `${beforeNeutralPctNum.toFixed(1)}%`,
        '-',
        '-',
        baseNPS,
        baseNPS,
        '+0.0',
        'No field teams with accountable neutrals in this period.'
      ]);
    }

    addIndicatorTable(
      `7. WORST PERFORMING TEAMS NEUTRAL IMPACT SIMULATION (ALL ${neuSortedTeams.length} NEUTRAL TEAMS & CUMULATIVE RECOVERY)`,
      'B45309',
      worstTeamNeuHeaders,
      worstTeamNeuRows,
      {
        0: (_, row) => ({
          isBold: true,
          fontColor: String(row[0]).includes('Full Combined') ? '4C1D95' : (String(row[0]).includes('Combined') ? '065F46' : '047857'),
          bgColor: String(row[0]).includes('Full Combined') ? 'F5F3FF' : (String(row[0]).includes('Combined') ? 'ECFDF5' : 'FFFFFF')
        }),
        2: () => ({ isBold: true, fontColor: 'B45309' }),
        3: () => ({ isBold: true, fontColor: 'D97706', bgColor: 'FFFBEB' }),
        4: () => ({ fontColor: '64748B' }),
        5: () => ({ fontColor: '047857' }),
        6: (val) => ({ isBold: val !== '-', fontColor: val === '-' ? '94A3B8' : '047857', bgColor: val === '-' ? 'FFFFFF' : 'ECFDF5' }),
        7: () => ({ fontColor: '64748B' }),
        8: () => ({ isBold: true, fontColor: '1E40AF', bgColor: 'EFF6FF' }),
        9: () => ({ isBold: true, fontColor: '7C3AED', bgColor: 'F5F3FF' }),
        10: () => ({ fontColor: '475569' })
      }
    );

    // ── Table 8: Worst Performing Teams Full Combined Impact Simulation (Ranked by NPS Recovery Impact) ──
    const combSortedTeams = teamAllocationsList
      .filter(t => t.totalWeighted > 0)
      .sort((a, b) => b.combNpsGain - a.combNpsGain || b.totalWeighted - a.totalWeighted || b.weightedDet - a.weightedDet);

    const worstTeamCombHeaders = [
      'Worst Team Rank',
      'Team Name',
      'Weighted Detractors',
      'Detractor Impact (-%)',
      'Weighted Neutrals',
      'Promoter Gain (+%)',
      'Total Weighted Issues',
      'Baseline NPS',
      'Simulated NPS',
      'Team NPS Gain (+pts)',
      'Escalation Status & Team Improvement Directive'
    ];

    const worstTeamCombRows = [];
    if (combSortedTeams.length > 0) {
      combSortedTeams.forEach((team, idx) => {
        worstTeamCombRows.push([
          `#${idx + 1} Impact Team`,
          team.teamName,
          fmtNum(team.weightedDet),
          team.weightedDet > 0 ? team.simComb.detractorRed : '-',
          fmtNum(team.weightedNeu),
          team.weightedNeu > 0 ? team.simComb.promoterGain : '-',
          fmtNum(team.totalWeighted),
          baseNPS,
          team.simComb.afterNPS,
          team.simComb.npsImpact,
          `Current Status: ${team.detractorPct} Detractors, ${team.promoterPct} Promoters. Resolving ${fmtNum(team.totalWeighted)} weighted issues (${fmtNum(team.weightedDet)} det + ${fmtNum(team.weightedNeu)} neu) provides +${team.simComb.npsImpact} pts overall NPS lift`
        ]);
      });

      if (combSortedTeams.length >= 2) {
        for (let i = 2; i <= combSortedTeams.length; i++) {
          const selectedTeams = combSortedTeams.slice(0, i);
          const comboWeightedDet = selectedTeams.reduce((sum, t) => sum + t.weightedDet, 0);
          const comboWeightedNeu = selectedTeams.reduce((sum, t) => sum + t.weightedNeu, 0);
          const comboTotalWeighted = comboWeightedDet + comboWeightedNeu;
          const names = selectedTeams.map(t => t.teamName).join(' + ');
          const sim = simulateScenario(comboWeightedDet, comboWeightedNeu);

          worstTeamCombRows.push([
            i === combSortedTeams.length ? `All ${combSortedTeams.length} Accountable Teams Combined` : `Top ${i} Impact Teams Combined`,
            names,
            fmtNum(comboWeightedDet),
            comboWeightedDet > 0 ? sim.detractorRed : '-',
            fmtNum(comboWeightedNeu),
            comboWeightedNeu > 0 ? sim.promoterGain : '-',
            fmtNum(comboTotalWeighted),
            baseNPS,
            sim.afterNPS,
            sim.npsImpact,
            `Collective remediation across Top ${i} underperforming field teams (${fmtNum(comboTotalWeighted)} weighted items) raises overall NPS to ${sim.afterNPS} (${sim.npsImpact} pts gain)`
          ]);
        }
      }
    } else {
      worstTeamCombRows.push([
        'All Teams Compliant',
        'No Accountable Issues',
        0,
        '-',
        0,
        '-',
        0,
        baseNPS,
        baseNPS,
        '+0.0',
        'No field teams with accountable issues in this period.'
      ]);
    }

    addIndicatorTable(
      `8. WORST PERFORMING TEAMS FULL COMBINED IMPACT SIMULATION (ALL ${combSortedTeams.length} ACCOUNTABLE TEAMS & CUMULATIVE RECOVERY)`,
      '7F1D1D',
      worstTeamCombHeaders,
      worstTeamCombRows,
      {
        0: (_, row) => ({ isBold: true, fontColor: String(row[0]).includes('Combined') ? '7F1D1D' : '991B1B', bgColor: String(row[0]).includes('Combined') ? 'FEF2F2' : 'FFFFFF' }),
        2: () => ({ fontColor: 'B91C1C' }),
        3: (val) => ({ isBold: val !== '-', fontColor: val === '-' ? '94A3B8' : 'B91C1C', bgColor: val === '-' ? 'FFFFFF' : 'FEF2F2' }),
        4: () => ({ fontColor: 'D97706' }),
        5: (val) => ({ isBold: val !== '-', fontColor: val === '-' ? '94A3B8' : '047857', bgColor: val === '-' ? 'FFFFFF' : 'ECFDF5' }),
        6: () => ({ isBold: true, fontColor: '581C87', bgColor: 'FAF5FF' }),
        8: () => ({ isBold: true, fontColor: '1E40AF', bgColor: 'EFF6FF' }),
        9: () => ({ isBold: true, fontColor: '7C3AED', bgColor: 'F5F3FF' }),
        10: () => ({ fontColor: '475569' })
      }
    );

    wsTextAnalysis['!cols'] = [
      { wch: 36 }, // Col 0: Scenario / Rank / Focus
      { wch: 32 }, // Col 1: Category / Name / Definition
      { wch: 20 }, // Col 2: Detractors (Raw / Resolved)
      { wch: 20 }, // Col 3: Weighted Detractors / Neutrals Elevated / Before Det %
      { wch: 20 }, // Col 4: Neutrals / Total Issues Fixed / After Det %
      { wch: 18 }, // Col 5: Before NPS / Weighted Neutrals
      { wch: 18 }, // Col 6: After NPS / Total Issues
      { wch: 18 }, // Col 7: Total NPS Gain (+pts)
      { wch: 18 }, // Col 8: Before Promoter %
      { wch: 18 }, // Col 9: After Promoter %
      { wch: 20 }, // Col 10: Promoter Gain (+%)
      { wch: 18 }, // Col 11: Before Detractor %
      { wch: 18 }, // Col 12: After Detractor %
      { wch: 22 }, // Col 13: Detractor Reduction (-%)
      { wch: 65 }  // Col 14: Strategic Directive / Notes
    ];
    fixSheetRange(wsTextAnalysis);

    // ══════════════════════════════════════════════════════════════════════════
    // SUBSHEET: DAILY ONLINE & DVOC ANALYSIS
    // ══════════════════════════════════════════════════════════════════════════
    const startDateFormatted = dateFilter.start ? format(new Date(dateFilter.start), 'dd/MM/yyyy') : 'All Time';
    const endDateFormatted = dateFilter.end ? format(new Date(dateFilter.end), 'dd/MM/yyyy') : 'All Time';

    const wsDailyOnline = XLSX.utils.aoa_to_sheet([
      [`DAILY ONLINE TRANSACTIONS, SAMPLES TOKEN & DVOC INCIDENT ANALYSIS (PIS DATE BASIS) (${startDateFormatted} - ${endDateFormatted})`]
    ]);

    wsDailyOnline['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 22 } }
    ];

    wsDailyOnline['A1'].s = {
      font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0E7490" } }, // Deep Cyan
      alignment: { horizontal: "left", vertical: "center", indent: 1 }
    };

    // Index daily online & samples token into map: { 'YYYY-MM-DD': { onlineSamples, samplesToken, note } }
    const dailyOnlineMap = {};
    (dailyOnlineSamplesData || []).forEach(item => {
      if (item.date) {
        dailyOnlineMap[item.date] = {
          onlineSamples: parseFloat(item.onlineSamples) || 0,
          samplesToken: parseFloat(item.samplesToken) || 0,
          note: item.note || ''
        };
      }
    });

    // Determine interval days for analysis
    const intervalStartDate = dateFilter.start ? startOfDay(new Date(dateFilter.start)) : startOfDay(new Date());
    const intervalEndDate = dateFilter.end ? endOfDay(new Date(dateFilter.end)) : endOfDay(new Date());

    let dailyInterval = [];
    try {
      dailyInterval = eachDayOfInterval({ start: intervalStartDate, end: intervalEndDate });
    } catch {
      dailyInterval = [intervalStartDate];
    }

    // Process daily breakdown records
    let totalOnlineVol = 0;
    let totalDailySamplesToken = 0;
    let totalDvocTasks = 0;
    let totalDvocIssues = 0;
    let totalReachIssues = 0;
    let totalReachAccYes = 0;
    let totalReachAccNo = 0;
    let totalOtherIssues = 0;
    let totalDetractors = 0;
    let totalNeutrals = 0;
    let totalPromoters = 0;

    const dailyBreakdownRows = [];

    dailyInterval.forEach(dayDate => {
      const dateStr = format(dayDate, 'yyyy-MM-dd');
      const dateDisplay = format(dayDate, 'dd/MM/yyyy');
      const dayOfWeek = format(dayDate, 'EEEE');

      const onlineEntry = dailyOnlineMap[dateStr] || { onlineSamples: 0, samplesToken: 0, note: '' };
      const onlineSamples = onlineEntry.onlineSamples || 0;
      const samplesToken = onlineEntry.samplesToken || 0;
      const note = onlineEntry.note || '';

      // Tasks for this date mapped strictly to task.pisDate
      const dayTasks = (allTasks || []).filter(t => {
        if (!t.pisDate) return false;
        try {
          return format(new Date(t.pisDate), 'yyyy-MM-dd') === dateStr;
        } catch {
          return false;
        }
      });

      const dayTasksCount = dayTasks.length;
      let dayIssuesCount = 0;
      let dayReachCount = 0;
      let dayReachAccYesCount = 0;
      let dayReachAccNoCount = 0;
      let dayOtherCount = 0;
      let dayDetCount = 0;
      let dayNeuCount = 0;
      let dayProCount = 0;

      dayTasks.forEach(t => {
        const score = Number(t.evaluationScore);
        if (!isNaN(score)) {
          if (score <= 6) dayDetCount++;
          else if (score >= 7 && score <= 8) dayNeuCount++;
          else if (score >= 9) dayProCount++;
        }

        const owners = normalizeArrayField(t.responsible);
        const accs = normalizeArrayField(t.teamAccountability);

        owners.forEach((owner, i) => {
          dayIssuesCount++;
          const normOwner = String(owner).trim().toUpperCase();
          const acc = accs[i] || (accs.length > 0 ? accs[0] : 'Unknown');
          const isAccYes = String(acc).trim().toLowerCase().startsWith('yes') || String(acc).trim().toLowerCase() === 'y';
          const isAccNo = String(acc).trim().toLowerCase().startsWith('no') || String(acc).trim().toLowerCase() === 'n';

          if (normOwner === 'REACH') {
            dayReachCount++;
            if (isAccYes) dayReachAccYesCount++;
            else if (isAccNo) dayReachAccNoCount++;
            else dayReachAccNoCount++;
          } else {
            dayOtherCount++;
          }
        });
      });

      // Accumulate totals
      totalOnlineVol += onlineSamples;
      totalDailySamplesToken += samplesToken;
      totalDvocTasks += dayTasksCount;
      totalDvocIssues += dayIssuesCount;
      totalReachIssues += dayReachCount;
      totalReachAccYes += dayReachAccYesCount;
      totalReachAccNo += dayReachAccNoCount;
      totalOtherIssues += dayOtherCount;
      totalDetractors += dayDetCount;
      totalNeutrals += dayNeuCount;
      totalPromoters += dayProCount;

      // Calculate comparative ratios
      const tokenVsOnline = onlineSamples > 0 ? ((samplesToken / onlineSamples) * 100).toFixed(2) + '%' : '-';
      const tasksVsToken = samplesToken > 0 ? ((dayTasksCount / samplesToken) * 100).toFixed(2) + '%' : '-';
      const tasksVsOnline = onlineSamples > 0 ? ((dayTasksCount / onlineSamples) * 100).toFixed(2) + '%' : '-';
      const issuesVsToken = samplesToken > 0 ? ((dayIssuesCount / samplesToken) * 100).toFixed(2) + '%' : '-';
      const issuesVsOnline = onlineSamples > 0 ? ((dayIssuesCount / onlineSamples) * 100).toFixed(2) + '%' : '-';
      const reachVsToken = samplesToken > 0 ? ((dayReachCount / samplesToken) * 100).toFixed(2) + '%' : '-';
      const reachVsOnline = onlineSamples > 0 ? ((dayReachCount / onlineSamples) * 100).toFixed(2) + '%' : '-';
      const reachAccYesVsOnline = onlineSamples > 0 ? ((dayReachAccYesCount / onlineSamples) * 100).toFixed(2) + '%' : '-';
      const reachAccNoVsOnline = onlineSamples > 0 ? ((dayReachAccNoCount / onlineSamples) * 100).toFixed(2) + '%' : '-';
      const reachShareOfIssues = dayIssuesCount > 0 ? ((dayReachCount / dayIssuesCount) * 100).toFixed(1) + '%' : '-';

      dailyBreakdownRows.push([
        dateDisplay,
        dayOfWeek,
        onlineSamples > 0 ? onlineSamples : 0,
        samplesToken > 0 ? samplesToken : 0,
        dayTasksCount,
        dayIssuesCount,
        dayReachCount,
        dayReachAccYesCount,
        dayReachAccNoCount,
        dayOtherCount,
        dayDetCount,
        dayNeuCount,
        dayProCount,
        tokenVsOnline,
        tasksVsToken,
        tasksVsOnline,
        issuesVsToken,
        issuesVsOnline,
        reachVsToken,
        reachVsOnline,
        reachAccYesVsOnline,
        reachAccNoVsOnline,
        reachShareOfIssues,
        note
      ]);
    });

    // Executive KPI Block (Row 3 to 9)
    const kpiReachShare = totalDvocIssues > 0 ? `${((totalReachIssues / totalDvocIssues) * 100).toFixed(1)}%` : '0.0%';
    const kpiReachAccYesShare = totalDvocIssues > 0 ? `${((totalReachAccYes / totalDvocIssues) * 100).toFixed(1)}%` : '0.0%';
    const kpiReachAccNoShare = totalDvocIssues > 0 ? `${((totalReachAccNo / totalDvocIssues) * 100).toFixed(1)}%` : '0.0%';

    const kpiHeaders = [
      ['EXECUTIVE KPI SUMMARY — ONLINE TRANSACTIONS, SAMPLES TOKEN & DVOC INCIDENT METRICS (PIS BASIS)', '', '', '', '', '', '', ''],
      [
        'Total Daily Online Volume',
        'Total Daily Samples Token (Taken)',
        'Total non-promoters customers (PIS)',
        'Total issues identified',
        'Total REACH Issues',
        'REACH Share of Issues (%)',
        'REACH Acc (Yes) Issues',
        'REACH Acc (Yes) Share of Issues (%)'
      ],
      [
        totalOnlineVol.toLocaleString(),
        totalDailySamplesToken.toLocaleString(),
        totalDvocTasks.toLocaleString(),
        totalDvocIssues.toLocaleString(),
        totalReachIssues.toLocaleString(),
        kpiReachShare,
        totalReachAccYes.toLocaleString(),
        kpiReachAccYesShare
      ],
      [
        'Samples Token % of Online',
        'Sampling Fulfillment % (non-promoters / total samples token)',
        'Actual non-promoters % of Online',
        'Total Issues / Total Samples Token (%)',
        'REACH Issues / Total Samples Token (%)',
        'REACH Acc (Yes) / Total Samples Token (%)',
        'REACH Acc (No) / Total Samples Token (%)',
        'REACH Non-Acc Share of Issues (%)'
      ],
      [
        totalOnlineVol > 0 ? `${((totalDailySamplesToken / totalOnlineVol) * 100).toFixed(2)}%` : '0.00%',
        totalDailySamplesToken > 0 ? `${((totalDvocTasks / totalDailySamplesToken) * 100).toFixed(2)}%` : '0.00%',
        totalOnlineVol > 0 ? `${((totalDvocTasks / totalOnlineVol) * 100).toFixed(2)}%` : '0.00%',
        totalDailySamplesToken > 0 ? `${((totalDvocIssues / totalDailySamplesToken) * 100).toFixed(2)}%` : '0.00%',
        totalDailySamplesToken > 0 ? `${((totalReachIssues / totalDailySamplesToken) * 100).toFixed(2)}%` : '0.00%',
        totalDailySamplesToken > 0 ? `${((totalReachAccYes / totalDailySamplesToken) * 100).toFixed(2)}%` : '0.00%',
        totalDailySamplesToken > 0 ? `${((totalReachAccNo / totalDailySamplesToken) * 100).toFixed(2)}%` : '0.00%',
        kpiReachAccNoShare
      ],
      [
        'Total Issues / Online (%)',
        'REACH Issues / Online (%)',
        'REACH Acc (Yes) / Online (%)',
        'REACH Acc (No) / Online (%)',
        '* Statistical Reference Note on Online-Based Incident Ratios',
        '', '', ''
      ],
      [
        totalOnlineVol > 0 ? `${((totalDvocIssues / totalOnlineVol) * 100).toFixed(2)}%` : '0.00%',
        totalOnlineVol > 0 ? `${((totalReachIssues / totalOnlineVol) * 100).toFixed(2)}%` : '0.00%',
        totalOnlineVol > 0 ? `${((totalReachAccYes / totalOnlineVol) * 100).toFixed(2)}%` : '0.00%',
        totalOnlineVol > 0 ? `${((totalReachAccNo / totalOnlineVol) * 100).toFixed(2)}%` : '0.00%',
        '* Note: Online-based incident ratios (Issues / Online) are indicative only and not direct failure rates, because DVOC sampling is conducted exclusively on token samples, not all online transactions.',
        '', '', ''
      ]
    ];

    XLSX.utils.sheet_add_aoa(wsDailyOnline, kpiHeaders, { origin: "A3" });
    wsDailyOnline['!merges'].push(
      { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
      { s: { r: 7, c: 4 }, e: { r: 7, c: 7 } },
      { s: { r: 8, c: 4 }, e: { r: 8, c: 7 } }
    );
    wsDailyOnline['A3'].s = { font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E293B" } }, alignment: { horizontal: "center" } };
    applyHeaderStyle(wsDailyOnline, { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } }, "334155");
    applyDataRowStyle(wsDailyOnline, { s: { r: 4, c: 0 }, e: { r: 4, c: 7 } });
    applyHeaderStyle(wsDailyOnline, { s: { r: 5, c: 0 }, e: { r: 5, c: 7 } }, "334155");
    applyDataRowStyle(wsDailyOnline, { s: { r: 6, c: 0 }, e: { r: 6, c: 7 } });
    applyHeaderStyle(wsDailyOnline, { s: { r: 7, c: 0 }, e: { r: 7, c: 3 } }, "475569");
    applyHeaderStyle(wsDailyOnline, { s: { r: 7, c: 4 }, e: { r: 7, c: 7 } }, "475569");
    applyDataRowStyle(wsDailyOnline, { s: { r: 8, c: 0 }, e: { r: 8, c: 3 } });
    
    // Format the note cell
    if (wsDailyOnline['E9']) {
      wsDailyOnline['E9'].s = {
        font: { italic: true, sz: 9, color: { rgb: "475569" } },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { horizontal: "left", vertical: "center", wrapText: true }
      };
    }

    // Table 1: Daily Breakdown Table
    const dailyTableHeaders = [
      'Date (DD/MM/YYYY)',
      'Day of Week',
      'Daily Online Volume',
      'Daily Samples Token (Taken)',
      'Total non-promoters customers (PIS Date)',
      'Total issues identified',
      'REACH Total Issues',
      'REACH Accountable (Yes)',
      'REACH Non-Accountable (No)',
      'Other Owners Issues',
      'Detractors (≤6)',
      'Neutrals (7-8)',
      'Promoters (≥9)',
      'Samples Token % of Online',
      'Sampling Fulfillment % (non-promoters / total samples token)',
      'Actual non-promoters % of Online',
      'Total Issues / Total Samples Token (%)',
      'Total Issues / Online (%)',
      'REACH Issues / Total Samples Token (%)',
      'REACH Issues / Online (%)',
      'REACH Acc (Yes) / Online (%)',
      'REACH Acc (No) / Online (%)',
      'REACH Share of Issues (%)',
      'Operational Notes'
    ];

    let onlineSheetR = 11;
    XLSX.utils.sheet_add_aoa(wsDailyOnline, [['DAILY CHRONOLOGICAL ONLINE, SAMPLES TOKEN & DVOC BREAKDOWN (BY PIS DATE)']], { origin: `A${onlineSheetR}` });
    wsDailyOnline[`A${onlineSheetR}`].s = { font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "0E7490" } }, alignment: { horizontal: "center" } };
    wsDailyOnline['!merges'].push({ s: { r: onlineSheetR - 1, c: 0 }, e: { r: onlineSheetR - 1, c: 23 } });

    XLSX.utils.sheet_add_aoa(wsDailyOnline, [dailyTableHeaders], { origin: `A${onlineSheetR + 1}` });
    applyHeaderStyle(wsDailyOnline, { s: { r: onlineSheetR, c: 0 }, e: { r: onlineSheetR, c: 23 } }, "1E293B");

    XLSX.utils.sheet_add_aoa(wsDailyOnline, dailyBreakdownRows, { origin: `A${onlineSheetR + 2}` });
    applyDataRowStyle(wsDailyOnline, { s: { r: onlineSheetR + 1, c: 0 }, e: { r: onlineSheetR + 1 + dailyBreakdownRows.length, c: 23 } });

    const dailyTotalRow = [
      'TOTAL / OVERALL PERIOD',
      `${dailyInterval.length} Days`,
      totalOnlineVol,
      totalDailySamplesToken,
      totalDvocTasks,
      totalDvocIssues,
      totalReachIssues,
      totalReachAccYes,
      totalReachAccNo,
      totalOtherIssues,
      totalDetractors,
      totalNeutrals,
      totalPromoters,
      totalOnlineVol > 0 ? `${((totalDailySamplesToken / totalOnlineVol) * 100).toFixed(2)}%` : '0.00%',
      totalDailySamplesToken > 0 ? `${((totalDvocTasks / totalDailySamplesToken) * 100).toFixed(2)}%` : '0.00%',
      totalOnlineVol > 0 ? `${((totalDvocTasks / totalOnlineVol) * 100).toFixed(2)}%` : '0.00%',
      totalDailySamplesToken > 0 ? `${((totalDvocIssues / totalDailySamplesToken) * 100).toFixed(2)}%` : '0.00%',
      totalOnlineVol > 0 ? `${((totalDvocIssues / totalOnlineVol) * 100).toFixed(2)}%` : '0.00%',
      totalDailySamplesToken > 0 ? `${((totalReachIssues / totalDailySamplesToken) * 100).toFixed(2)}%` : '0.00%',
      totalOnlineVol > 0 ? `${((totalReachIssues / totalOnlineVol) * 100).toFixed(2)}%` : '0.00%',
      totalOnlineVol > 0 ? `${((totalReachAccYes / totalOnlineVol) * 100).toFixed(2)}%` : '0.00%',
      totalOnlineVol > 0 ? `${((totalReachAccNo / totalOnlineVol) * 100).toFixed(2)}%` : '0.00%',
      totalDvocIssues > 0 ? `${((totalReachIssues / totalDvocIssues) * 100).toFixed(1)}%` : '0.0%',
      `Full period summary over ${dailyInterval.length} days (Tasks matched by PIS Date)`
    ];

    const totalRowR = onlineSheetR + 2 + dailyBreakdownRows.length;
    XLSX.utils.sheet_add_aoa(wsDailyOnline, [dailyTotalRow], { origin: `A${totalRowR}` });
    for (let c = 0; c < 24; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: totalRowR - 1, c });
      if (wsDailyOnline[cellRef]) {
        wsDailyOnline[cellRef].s = {
          font: { bold: true, color: { rgb: "000000" } },
          fill: { fgColor: { rgb: "E0F2FE" } }, // Light cyan highlight
          border: {
            top: { style: 'thin', color: { rgb: "0284C7" } },
            bottom: { style: 'double', color: { rgb: "0284C7" } }
          },
          alignment: { horizontal: c === 0 || c === 1 || c === 23 ? "left" : "center" }
        };
      }
    }

    // Table 2: Monthly Aggregated Online, Samples Token & DVOC Summary (By PIS Date)
    // Dynamic month interval covering all months from Cumulative Benchmark start (01/06/2026) to present/filter end
    const benchmarkStartDate = new Date(2026, 5, 1); // 01/06/2026 (June 2026)
    let benchmarkEndDate = new Date(2026, 7, 31); // Default to at least August 2026
    if (intervalEndDate && intervalEndDate > benchmarkEndDate) {
      benchmarkEndDate = intervalEndDate;
    }
    if (CumulativeDateFilter?.end && new Date(CumulativeDateFilter.end) > benchmarkEndDate) {
      benchmarkEndDate = new Date(CumulativeDateFilter.end);
    }
    (dailyOnlineSamplesData || []).forEach(d => {
      if (d.date) {
        const dd = new Date(d.date);
        if (!isNaN(dd) && dd > benchmarkEndDate) benchmarkEndDate = dd;
      }
    });
    (allTasks || []).forEach(t => {
      if (t.pisDate) {
        const td = new Date(t.pisDate);
        if (!isNaN(td) && td > benchmarkEndDate) benchmarkEndDate = td;
      }
    });

    const monthlyInterval = [];
    let curMonthCursor = startOfMonth(benchmarkStartDate);
    const lastMonthLimit = endOfMonth(benchmarkEndDate);
    while (curMonthCursor <= lastMonthLimit) {
      monthlyInterval.push(new Date(curMonthCursor));
      curMonthCursor = new Date(curMonthCursor.getFullYear(), curMonthCursor.getMonth() + 1, 1);
    }

    let cumBenchmarkOnline = 0;
    let cumBenchmarkTasks = 0;
    let cumBenchmarkIssues = 0;
    let cumBenchmarkReach = 0;
    let cumBenchmarkReachAccYes = 0;
    let cumBenchmarkReachAccNo = 0;
    const cumBenchmarkOwnersMap = {};

    const monthlyAggRows = [];
    monthlyInterval.forEach(mDate => {
      const monthKey = format(mDate, 'MMMM yyyy');
      const monthPrefix = format(mDate, 'yyyy-MM');

      // 1. Sum online for this month
      let mOnline = 0;
      Object.keys(dailyOnlineMap).forEach(dStr => {
        if (dStr.startsWith(monthPrefix)) {
          mOnline += dailyOnlineMap[dStr].onlineSamples || 0;
        }
      });

      // 2. Tasks strictly matching pisDate in this month
      const mTasks = (allTasks || []).filter(t => {
        if (!t.pisDate) return false;
        try {
          return format(new Date(t.pisDate), 'yyyy-MM') === monthPrefix;
        } catch {
          return false;
        }
      });

      const mTasksCount = mTasks.length;
      let mIssuesCount = 0;
      let mReachCount = 0;
      let mReachAccYes = 0;
      let mReachAccNo = 0;
      const mOwnerCounts = {};

      mTasks.forEach(t => {
        const owners = normalizeArrayField(t.responsible);
        const accs = normalizeArrayField(t.teamAccountability);

        owners.forEach((owner, i) => {
          mIssuesCount++;
          const normOwner = String(owner).trim().toUpperCase();
          const acc = accs[i] || (accs.length > 0 ? accs[0] : 'Unknown');
          const isAccYes = String(acc).trim().toLowerCase().startsWith('yes') || String(acc).trim().toLowerCase() === 'y';

          if (normOwner === 'REACH') {
            mReachCount++;
            if (isAccYes) mReachAccYes++;
            else mReachAccNo++;
          } else {
            const displayOwner = String(owner).trim() || 'Other';
            mOwnerCounts[displayOwner] = (mOwnerCounts[displayOwner] || 0) + 1;
            cumBenchmarkOwnersMap[displayOwner] = (cumBenchmarkOwnersMap[displayOwner] || 0) + 1;
          }
        });
      });

      // Accumulate for cumulative total row
      cumBenchmarkOnline += mOnline;
      cumBenchmarkTasks += mTasksCount;
      cumBenchmarkIssues += mIssuesCount;
      cumBenchmarkReach += mReachCount;
      cumBenchmarkReachAccYes += mReachAccYes;
      cumBenchmarkReachAccNo += mReachAccNo;

      // Identify 2nd Most Responsible Owner with issues (1st non-REACH owner)
      const sortedNonReachOwners = Object.entries(mOwnerCounts).sort((a, b) => b[1] - a[1]);
      let top2OwnerName = '-';
      let top2OwnerIssues = 0;
      let top2OwnerShare = '0.0%';

      if (sortedNonReachOwners.length > 0) {
        top2OwnerName = sortedNonReachOwners[0][0];
        top2OwnerIssues = sortedNonReachOwners[0][1];
        top2OwnerShare = mIssuesCount > 0 ? `${((top2OwnerIssues / mIssuesCount) * 100).toFixed(1)}%` : '0.0%';
      }

      // Other owners issues (remaining non-REACH owners after 2nd top owner)
      const otherOwnersIssues = Math.max(0, mIssuesCount - mReachCount - top2OwnerIssues);
      const otherOwnersShare = mIssuesCount > 0 ? `${((otherOwnersIssues / mIssuesCount) * 100).toFixed(1)}%` : '0.0%';

      // Monthly KPI calculations
      const mActualNonPromotersVsOnline = mOnline > 0 ? `${((mTasksCount / mOnline) * 100).toFixed(2)}%` : '-';
      const mReachAccShare = mIssuesCount > 0 ? `${((mReachAccYes / mIssuesCount) * 100).toFixed(1)}%` : '-';
      const mReachNonAccShare = mIssuesCount > 0 ? `${((mReachAccNo / mIssuesCount) * 100).toFixed(1)}%` : '-';
      const mReachTotalShare = mIssuesCount > 0 ? `${((mReachCount / mIssuesCount) * 100).toFixed(1)}%` : '-';

      monthlyAggRows.push([
        monthKey,
        mOnline > 0 ? mOnline : 0,
        mTasksCount,
        mActualNonPromotersVsOnline,
        mIssuesCount,
        mReachCount,
        mReachTotalShare,
        mReachAccYes,
        mReachAccShare,
        mReachAccNo,
        mReachNonAccShare,
        top2OwnerName,
        top2OwnerIssues,
        top2OwnerShare,
        otherOwnersIssues,
        otherOwnersShare
      ]);
    });

    const monthlyHeaders = [
      'Month',
      'Monthly Online Volume',
      'Total non-promoters customers (PIS Date)',
      'Actual non-promoters % of Online',
      'Total issues identified',
      'REACH Total Issues',
      'REACH Share of Issues (%)',
      'REACH Accountable (Yes)',
      'REACH Acc Share of Issues (%)',
      'REACH Non-Accountable (No)',
      'REACH Non-Acc Share of Issues (%)',
      '2nd Top Responsible Owner',
      '2nd Owner Issues',
      '2nd Owner Share of Issues (%)',
      'Other Owners Issues',
      'Other Owners Share of Issues (%)'
    ];

    let monthlySummaryR = totalRowR + 3;
    XLSX.utils.sheet_add_aoa(wsDailyOnline, [['MONTHLY AGGREGATED ONLINE & DVOC SUMMARY (BY PIS DATE)']], { origin: `A${monthlySummaryR}` });
    wsDailyOnline[`A${monthlySummaryR}`].s = { font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "0369A1" } }, alignment: { horizontal: "center" } };
    wsDailyOnline['!merges'].push({ s: { r: monthlySummaryR - 1, c: 0 }, e: { r: monthlySummaryR - 1, c: 15 } });

    XLSX.utils.sheet_add_aoa(wsDailyOnline, [monthlyHeaders], { origin: `A${monthlySummaryR + 1}` });
    applyHeaderStyle(wsDailyOnline, { s: { r: monthlySummaryR, c: 0 }, e: { r: monthlySummaryR, c: 15 } }, "1E293B");

    XLSX.utils.sheet_add_aoa(wsDailyOnline, monthlyAggRows, { origin: `A${monthlySummaryR + 2}` });
    applyDataRowStyle(wsDailyOnline, { s: { r: monthlySummaryR + 1, c: 0 }, e: { r: monthlySummaryR + 1 + monthlyAggRows.length, c: 15 } });

    // Total row for Monthly Aggregated Table (Cumulative Benchmark Summary)
    const sortedCumNonReach = Object.entries(cumBenchmarkOwnersMap).sort((a, b) => b[1] - a[1]);
    const cumTop2Name = sortedCumNonReach.length > 0 ? sortedCumNonReach[0][0] : '-';
    const cumTop2Issues = sortedCumNonReach.length > 0 ? sortedCumNonReach[0][1] : 0;
    const cumTop2Share = cumBenchmarkIssues > 0 ? `${((cumTop2Issues / cumBenchmarkIssues) * 100).toFixed(1)}%` : '0.0%';
    const cumOtherIssues = Math.max(0, cumBenchmarkIssues - cumBenchmarkReach - cumTop2Issues);
    const cumOtherShare = cumBenchmarkIssues > 0 ? `${((cumOtherIssues / cumBenchmarkIssues) * 100).toFixed(1)}%` : '0.0%';

    const monthlyTotalRow = [
      'TOTAL CUMULATIVE BENCHMARK',
      cumBenchmarkOnline,
      cumBenchmarkTasks,
      cumBenchmarkOnline > 0 ? `${((cumBenchmarkTasks / cumBenchmarkOnline) * 100).toFixed(2)}%` : '0.00%',
      cumBenchmarkIssues,
      cumBenchmarkReach,
      cumBenchmarkIssues > 0 ? `${((cumBenchmarkReach / cumBenchmarkIssues) * 100).toFixed(1)}%` : '0.0%',
      cumBenchmarkReachAccYes,
      cumBenchmarkIssues > 0 ? `${((cumBenchmarkReachAccYes / cumBenchmarkIssues) * 100).toFixed(1)}%` : '0.0%',
      cumBenchmarkReachAccNo,
      cumBenchmarkIssues > 0 ? `${((cumBenchmarkReachAccNo / cumBenchmarkIssues) * 100).toFixed(1)}%` : '0.0%',
      cumTop2Name,
      cumTop2Issues,
      cumTop2Share,
      cumOtherIssues,
      cumOtherShare
    ];

    const monthlyTotalRowR = monthlySummaryR + 2 + monthlyAggRows.length;
    XLSX.utils.sheet_add_aoa(wsDailyOnline, [monthlyTotalRow], { origin: `A${monthlyTotalRowR}` });
    for (let c = 0; c < 16; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: monthlyTotalRowR - 1, c });
      if (wsDailyOnline[cellRef]) {
        wsDailyOnline[cellRef].s = {
          font: { bold: true, color: { rgb: "000000" } },
          fill: { fgColor: { rgb: "E0F2FE" } },
          border: {
            top: { style: 'thin', color: { rgb: "0284C7" } },
            bottom: { style: 'double', color: { rgb: "0284C7" } }
          },
          alignment: { horizontal: c === 0 || c === 11 ? "left" : "center" }
        };
      }
    }

    // Set Column Widths for wsDailyOnline
    wsDailyOnline['!cols'] = [
      { wch: 18 }, // Col 0: Date / Month
      { wch: 22 }, // Col 1: Day of Week / Monthly Online Volume
      { wch: 26 }, // Col 2: Daily Online Volume / Total non-promoters customers
      { wch: 28 }, // Col 3: Daily Samples Token (Taken) / Actual non-promoters % of Online
      { wch: 28 }, // Col 4: Total non-promoters customers (PIS Date) / Total issues identified
      { wch: 22 }, // Col 5: Total issues identified / REACH Total Issues
      { wch: 20 }, // Col 6: REACH Total Issues / REACH Share of Issues (%)
      { wch: 22 }, // Col 7: REACH Accountable (Yes) / REACH Accountable (Yes)
      { wch: 24 }, // Col 8: REACH Non-Accountable (No) / REACH Acc Share of Issues (%)
      { wch: 24 }, // Col 9: 2nd Top Responsible Owner / REACH Non-Accountable (No)
      { wch: 24 }, // Col 10: 2nd Owner Issues / REACH Non-Acc Share of Issues (%)
      { wch: 24 }, // Col 11: 2nd Owner Share % / 2nd Top Responsible Owner
      { wch: 20 }, // Col 12: Other Owners Issues / 2nd Owner Issues
      { wch: 24 }, // Col 13: Other Owners Share % / 2nd Owner Share of Issues (%)
      { wch: 22 }, // Col 14: Other Owners Issues
      { wch: 24 }, // Col 15: Other Owners Share of Issues (%)
      { wch: 28 }, // Col 16: Total Issues / Total Samples Token (%)
      { wch: 28 }, // Col 17: REACH Issues / Total Samples Token (%)
      { wch: 26 }, // Col 18: REACH Acc Share of Issues (%)
      { wch: 26 }, // Col 19: REACH Non-Acc Share of Issues (%)
      { wch: 24 }, // Col 20: REACH Share of Issues (%)
      { wch: 24 }, // Col 21: REACH Acc (Yes) / Online (%)
      { wch: 24 }, // Col 22: REACH Acc (No) / Online (%)
      { wch: 35 }  // Col 23: Operational Notes
    ];

    fixSheetRange(wsDailyOnline);

    // 7. Deep Raw Data Sheet
    const maxTickets = filteredTasks.reduce((max, t) => Math.max(max, (t.tickets || []).length), 0);

    const multiValueFieldsMapping = [
      { field: 'reason', label: 'Reason' },
      { field: 'subReason', label: 'Sub-Reason' },
      { field: 'rootCause', label: 'Root Cause' },
      { field: 'responsible', label: 'Owner' },
      { field: 'itnRelated', label: 'ITN Related' },
      { field: 'relatedToSubscription', label: 'Related to Subscription' },
      { field: 'teamAccountability', label: 'Team Accountability' }
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

    const getDeepRawHeaderStyle = (columnName) => {
      // 1. Blue: SLID to District
      const blueCols = [
        'SLID', 'Request Number', 'Status', 'Severity', 'Operation', 'Tariff Name',
        'Validation Status', 'Customer Name', 'Customer Type', 'Contact Number',
        'Governorate', 'District'
      ];
      if (blueCols.includes(columnName)) {
        return { bg: '2F5597', color: 'FFFFFF' };
      }

      // 2. Orange: Q1-Score -> Q1-Verbatim -> Satisfaction Category
      const orangeCols = ['Q1-Score', 'Q1-Verbatim', 'Satisfaction Category'];
      if (orangeCols.includes(columnName)) {
        return { bg: 'ED7D31', color: 'FFFFFF' };
      }

      // 3. Tan, Background 2, Darker 75%: ONT Type to Extender Count
      const tanCols = ['ONT Type', 'Free Extender', 'Extender Type', 'Extender Count'];
      if (tanCols.includes(columnName)) {
        return { bg: '4A452A', color: 'FFFFFF' };
      }

      // 4. GAIA Check and GAIA Content: Orange, Accent 6, Lighter 65%, with black text color
      if (columnName === 'GAIA Check' || columnName === 'GAIA Content') {
        return { bg: 'FCE4D6', color: '000000' };
      }

      // 5. Purple, Accent 4, Darker 25%: Reason to Owner
      if (
        columnName === 'Reason' || columnName.startsWith('Reason ') ||
        columnName === 'Sub-Reason' || columnName.startsWith('Sub-Reason ') ||
        columnName === 'Root Cause' || columnName.startsWith('Root Cause ') ||
        columnName === 'Owner' || columnName.startsWith('Owner ')
      ) {
        return { bg: '5F497A', color: 'FFFFFF' };
      }

      // 6. Purple, Accent 4, Lighter 40%: ITN Related to Team Accountability
      if (
        columnName === 'ITN Related' || columnName.startsWith('ITN Related ') ||
        columnName === 'Related to Subscription' || columnName.startsWith('Related to Subscription ') ||
        columnName === 'Team Accountability' || columnName.startsWith('Team Accountability ')
      ) {
        return { bg: 'B1A0C7', color: '000000' };
      }

      // 7. Field Team Name: Orange, Accent 6, Darker 25%
      if (columnName === 'Field Team Name') {
        return { bg: 'C65911', color: 'FFFFFF' };
      }

      // 8. Note columns: Black
      if (columnName.startsWith('Note')) {
        return { bg: '000000', color: 'FFFFFF' };
      }

      // 9. Aqua, Accent 5, Darker 25%: Request Date, In Date (Dispatched to Cont.), PIS Date, Request to Dispatched, Dispatched to Close (Days), Request to Close (Days)
      const aquaCols = [
        'Request Date',
        'In Date (Dispatched to Cont.)',
        'PIS Date',
        'Request to Dispatched - Dispatched to Contractor (Days)',
        'Request to Dispatched - Dispatched to Contreactor (Days)',
        'Dispatched to Close (Days)',
        'Request to Close (Days)'
      ];
      if (aquaCols.includes(columnName) || columnName.startsWith('Request to Dispatched')) {
        return { bg: '31859C', color: 'FFFFFF' };
      }

      // 10. Orange Accent 6, Darker 50%: Interview Date, PIS to Interview (Days), Close to PIS (Days), Interview Week
      const darkOrangeCols = [
        'Interview Date',
        'PIS to Interview (Days)',
        'Close to PIS (Days)',
        'Interview Week'
      ];
      if (darkOrangeCols.includes(columnName)) {
        return { bg: '833C0C', color: 'FFFFFF' };
      }

      return { bg: '1F2937', color: 'FFFFFF' };
    };

    const applyDeepRawHeaderRowStyle = (ws, rowIdx, colKeys) => {
      colKeys.forEach((key, colIdx) => {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
        if (!ws[cellAddress]) {
          ws[cellAddress] = { t: 's', v: key };
        }
        const style = getDeepRawHeaderStyle(key);
        ws[cellAddress].s = {
          font: { bold: true, color: { rgb: style.color } },
          fill: { fgColor: { rgb: style.bg } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        };
      });
    };

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
        'Q1-Verbatim': task.customerFeedback || 'N/A',
        'Satisfaction Category': (() => {
          if (task.evaluationScore === null || task.evaluationScore === 'N/A') return 'N/A';
          const score = Number(task.evaluationScore);
          if (score <= 6) return 'Detractor';
          if (score >= 7 && score <= 8) return 'Neutral';
          if (score >= 9) return 'Promoter';
          return 'N/A';
        })(),
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
        { field: 'relatedToSubscription', label: 'Related to Subscription' },
        { field: 'teamAccountability', label: 'Team Accountability' }
      ];

      const maxInterleaved = interleavedFields.reduce((max, { field }) => Math.max(max, fieldMaxCounts[field]), 0);
      for (let i = 0; i < maxInterleaved; i++) {
        const reasonVals = normalizeArrayField(task.reason);
        const ownerVals = normalizeArrayField(task.responsible);
        const subReasonVals = normalizeArrayField(task.subReason);
        const rootCauseVals = normalizeArrayField(task.rootCause);
        const itnVals = normalizeArrayField(task.itnRelated);
        const subRelVals = normalizeArrayField(task.relatedToSubscription);
        const teamAccVals = normalizeArrayField(task.teamAccountability);

        const hasIssueAtIndex = (reasonVals[i] !== undefined) || 
                                (ownerVals[i] !== undefined) || 
                                (subReasonVals[i] !== undefined) || 
                                (rootCauseVals[i] !== undefined) ||
                                (itnVals[i] !== undefined) ||
                                (subRelVals[i] !== undefined) ||
                                (teamAccVals[i] !== undefined);

        interleavedFields.forEach(({ field, label }) => {
          const values = normalizeArrayField(task[field]);
          if (hasIssueAtIndex) {
            baseData[`${label} ${i + 1}`] = values[i] !== undefined ? values[i] : (values.length === 1 ? values[0] : (values[0] || 'N/A'));
          } else {
            baseData[`${label} ${i + 1}`] = values[i] || '';
          }
        });
      }

      Object.assign(baseData, {
        'Field Team Name': task.teamName || 'N/A',
      });

      const sortedTickets = [...(task.tickets || [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      for (let i = 2; i < maxTickets; i++) {
        baseData[`Note ${i + 1}`] = sortedTickets[i]?.note || '';
      }

      const ivDate = task.interviewDate ? new Date(task.interviewDate) : null;
      const pisDate = task.pisDate ? new Date(task.pisDate) : null;
      const inDate = task.inDate ? new Date(task.inDate) : null;
      const closeDate = task.closeDate ? new Date(task.closeDate) : null;
      const requestDate = task.contractDate ? new Date(task.contractDate) : null;

      const interviewToPis = ivDate && pisDate ? Math.max(0, Math.round((ivDate - pisDate) / (1000 * 60 * 60 * 24))) : 'N/A';
      const pisToClose = pisDate && closeDate ? Math.max(0, Math.round((pisDate - closeDate) / (1000 * 60 * 60 * 24))) : 'N/A';
      const requestToClose = requestDate && closeDate ? Math.max(0, Math.round((closeDate - requestDate) / (1000 * 60 * 60 * 24))) : 'N/A';
      const requestToDispatched = requestDate && inDate ? Math.max(0, Math.round((inDate - requestDate) / (1000 * 60 * 60 * 24))) : 'N/A';
      const dispatchedToClose = inDate && closeDate ? Math.max(0, Math.round((closeDate - inDate) / (1000 * 60 * 60 * 24))) : 'N/A';

      const timelineData = {
        'Request Date': task.contractDate ? format(new Date(task.contractDate), 'yyyy-MM-dd') : 'N/A',
        'In Date (Dispatched to Cont.)': task.inDate ? format(new Date(task.inDate), 'yyyy-MM-dd') : 'N/A',
        'PIS Date': task.pisDate ? format(new Date(task.pisDate), 'yyyy-MM-dd') : 'N/A',
        'Request to Dispatched - Dispatched to Contractor (Days)': requestToDispatched,
        'Dispatched to Close (Days)': dispatchedToClose,
        'Request to Close (Days)': requestToClose,
        'Interview Date': task.interviewDate ? format(new Date(task.interviewDate), 'yyyy-MM-dd') : 'N/A',
        'PIS to Interview (Days)': interviewToPis,
        'Close to PIS (Days)': pisToClose,
        'Interview Week': getWeekDisplay(task.interviewDate)
      };

      return { ...baseData, ...timelineData };
    });

    const wsRaw = XLSX.utils.json_to_sheet(rawData, { origin: "A2" });
    const rawKeys = Object.keys(rawData[0] || {});
    const maxColIdx = Math.max(0, rawKeys.length - 1);
    addTitle(wsRaw, `DEEP RAW AUDIT DATA - ${periodStr}`, maxColIdx);
    applyDeepRawHeaderRowStyle(wsRaw, 1, rawKeys);

    if (!wsRaw['!rows']) wsRaw['!rows'] = [];
    wsRaw['!rows'][0] = { hpt: 24 }; // Title
    wsRaw['!rows'][1] = { hpt: 20 }; // Master Header

    // Fast-path Arabic RTL Alignment for Master Table (only non-empty feedback cells)
    const q1MasterCol = rawKeys.indexOf('Q1-Verbatim');
    if (q1MasterCol !== -1) {
      for (let row = 2; row <= 1 + rawData.length; row += 1) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: q1MasterCol });
        if (wsRaw[cellAddress] && wsRaw[cellAddress].v && wsRaw[cellAddress].v !== 'N/A') {
          wsRaw[cellAddress].s = {
            alignment: {
              horizontal: 'right',
              vertical: 'center',
              readingOrder: 2
            }
          };
        }
      }
    }

    // ── Build Per-Owner Deep Raw Data Tables (Duplicating Tasks with Multiple Owner Issues) ──
    const allUniqueOwners = [];
    const ownerCountsMap = {};
    filteredTasks.forEach(task => {
      const respVals = normalizeArrayField(task.responsible);
      if (respVals.length === 0 && task.responsible) {
        respVals.push(String(task.responsible).trim());
      }
      respVals.forEach(r => {
        const norm = (r || 'Unknown').toString().trim().toUpperCase();
        if (!ownerCountsMap[norm]) {
          ownerCountsMap[norm] = 0;
          allUniqueOwners.push(norm);
        }
        ownerCountsMap[norm]++;
      });
    });
    allUniqueOwners.sort((a, b) => (ownerCountsMap[b] || 0) - (ownerCountsMap[a] || 0));

    const ownerColorPalette = [
      { banner: "1E3A8A", header: "2563EB" }, // Navy / Blue (e.g. REACH)
      { banner: "4C1D95", header: "6D28D9" }, // Purple (e.g. OJO)
      { banner: "065F46", header: "059669" }, // Emerald (e.g. NOKIA)
      { banner: "9F1239", header: "E11D48" }, // Rose
      { banner: "92400E", header: "D97706" }, // Amber
      { banner: "1F2937", header: "374151" }, // Slate
    ];

    let currentRawR = 1 + rawData.length + 3;

    allUniqueOwners.forEach((ownerKey, ownerIdx) => {
      const ownerTasks = filteredTasks.flatMap(task =>
        buildOwnerIssueRows(task, ownerKey).map(row => ({ ...task, ...row }))
      );

      if (ownerTasks.length === 0) return;

      const ownerRows = ownerTasks.map(task => {
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
          'Q1-Verbatim': task.customerFeedback || 'N/A',
          'Satisfaction Category': (() => {
            if (task.evaluationScore === null || task.evaluationScore === 'N/A') return 'N/A';
            const score = Number(task.evaluationScore);
            if (score <= 6) return 'Detractor';
            if (score >= 7 && score <= 8) return 'Neutral';
            if (score >= 9) return 'Promoter';
            return 'N/A';
          })(),
          'ONT Type': task.ontType || 'N/A',
          'Free Extender': task.freeExtender || 'N/A',
          'Extender Type': task.extenderType || 'N/A',
          'Extender Count': task.extenderNumber || 0,
          'GAIA Check': task.gaiaCheck || 'N/A',
          'GAIA Content': task.gaiaContent || 'N/A',
          'Reason': task.reason || 'N/A',
          'Sub-Reason': task.subReason || 'N/A',
          'Root Cause': task.rootCause || 'N/A',
          'Owner': task.responsible || ownerKey,
          'ITN Related': task.itnRelated || 'N/A',
          'Related to Subscription': task.relatedToSubscription || 'N/A',
          'Team Accountability': task.teamAccountability || (ownerKey === 'REACH' ? 'N/A' : 'No'),
          'Field Team Name': task.teamName || 'N/A',
        };

        const sortedTickets = [...(task.tickets || [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        for (let i = 2; i < maxTickets; i++) {
          baseData[`Note ${i + 1}`] = sortedTickets[i]?.note || '';
        }

        const ivDate = task.interviewDate ? new Date(task.interviewDate) : null;
        const pisDate = task.pisDate ? new Date(task.pisDate) : null;
        const inDate = task.inDate ? new Date(task.inDate) : null;
        const closeDate = task.closeDate ? new Date(task.closeDate) : null;
        const requestDate = task.contractDate ? new Date(task.contractDate) : null;

        const interviewToPis = ivDate && pisDate ? Math.max(0, Math.round((ivDate - pisDate) / (1000 * 60 * 60 * 24))) : 'N/A';
        const pisToClose = pisDate && closeDate ? Math.max(0, Math.round((pisDate - closeDate) / (1000 * 60 * 60 * 24))) : 'N/A';
        const requestToClose = requestDate && closeDate ? Math.max(0, Math.round((closeDate - requestDate) / (1000 * 60 * 60 * 24))) : 'N/A';
        const requestToDispatched = requestDate && inDate ? Math.max(0, Math.round((inDate - requestDate) / (1000 * 60 * 60 * 24))) : 'N/A';
        const dispatchedToClose = inDate && closeDate ? Math.max(0, Math.round((closeDate - inDate) / (1000 * 60 * 60 * 24))) : 'N/A';

        const timelineData = {
          'Request Date': task.contractDate ? format(new Date(task.contractDate), 'yyyy-MM-dd') : 'N/A',
          'In Date (Dispatched to Cont.)': task.inDate ? format(new Date(task.inDate), 'yyyy-MM-dd') : 'N/A',
          'PIS Date': task.pisDate ? format(new Date(task.pisDate), 'yyyy-MM-dd') : 'N/A',
          'Request to Dispatched - Dispatched to Contractor (Days)': requestToDispatched,
          'Dispatched to Close (Days)': dispatchedToClose,
          'Request to Close (Days)': requestToClose,
          'Interview Date': task.interviewDate ? format(new Date(task.interviewDate), 'yyyy-MM-dd') : 'N/A',
          'PIS to Interview (Days)': interviewToPis,
          'Close to PIS (Days)': pisToClose,
          'Interview Week': getWeekDisplay(task.interviewDate)
        };

        return { ...baseData, ...timelineData };
      });

      const colorPair = ownerColorPalette[ownerIdx % ownerColorPalette.length];
      const ownerKeys = Object.keys(ownerRows[0] || {});
      const ownerMaxColIdx = Math.max(0, ownerKeys.length - 1);

      // 1. Owner Title Banner
      const titleCell = XLSX.utils.encode_cell({ r: currentRawR, c: 0 });
      wsRaw[titleCell] = {
        v: `OWNER: ${ownerKey} RAW AUDIT DATA (${ownerRows.length} record${ownerRows.length !== 1 ? 's' : ''}) - ${periodStr}`,
        t: 's',
        s: {
          font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: colorPair.banner } },
          alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
        }
      };
      if (!wsRaw['!merges']) wsRaw['!merges'] = [];
      wsRaw['!merges'].push({ s: { r: currentRawR, c: 0 }, e: { r: currentRawR, c: ownerMaxColIdx } });

      // 2. Add Header & Data Rows (Lightweight, No Individual Cell Border Overhead)
      XLSX.utils.sheet_add_json(wsRaw, ownerRows, { origin: XLSX.utils.encode_cell({ r: currentRawR + 1, c: 0 }), skipHeader: false });
      applyDeepRawHeaderRowStyle(wsRaw, currentRawR + 1, ownerKeys);

      // Set Banner and Header Row Heights
      wsRaw['!rows'][currentRawR] = { hpt: 22 };
      wsRaw['!rows'][currentRawR + 1] = { hpt: 18 };

      // 3. Fast-path Arabic RTL Alignment for Owner Table
      const q1ColIdx = ownerKeys.indexOf('Q1-Verbatim');
      if (q1ColIdx !== -1) {
        for (let r = currentRawR + 2; r <= currentRawR + 1 + ownerRows.length; r++) {
          const cellAddr = XLSX.utils.encode_cell({ r, c: q1ColIdx });
          if (wsRaw[cellAddr] && wsRaw[cellAddr].v && wsRaw[cellAddr].v !== 'N/A') {
            wsRaw[cellAddr].s = {
              alignment: {
                horizontal: 'right',
                vertical: 'center',
                readingOrder: 2
              }
            };
          }
        }
      }

      currentRawR = currentRawR + 1 + ownerRows.length + 3;
    });

    wsRaw['!cols'] = rawKeys.map(key => {
      if (key === 'SLID') return { wch: 15 };
      if (key === 'Request Number') return { wch: 18 };
      if (key === 'Status') return { wch: 14 };
      if (key === 'Severity') return { wch: 12 };
      if (key === 'Operation') return { wch: 16 };
      if (key === 'Tariff Name') return { wch: 22 };
      if (key === 'Validation Status') return { wch: 18 };
      if (key === 'Customer Name') return { wch: 25 };
      if (key === 'Customer Type') return { wch: 14 };
      if (key === 'Contact Number') return { wch: 16 };
      if (key === 'Governorate') return { wch: 16 };
      if (key === 'District') return { wch: 18 };
      if (key === 'Q1-Score') return { wch: 12 };
      if (key === 'Q1-Verbatim') return { wch: 60 };
      if (key === 'Satisfaction Category') return { wch: 20 };
      if (key === 'ONT Type') return { wch: 14 };
      if (key === 'Free Extender') return { wch: 14 };
      if (key === 'Extender Type') return { wch: 16 };
      if (key === 'Extender Count') return { wch: 14 };
      if (key === 'GAIA Check') return { wch: 14 };
      if (key === 'GAIA Content') return { wch: 16 };
      if (key.startsWith('Reason')) return { wch: 20 };
      if (key.startsWith('Sub-Reason')) return { wch: 20 };
      if (key.startsWith('Root Cause')) return { wch: 22 };
      if (key.startsWith('Owner')) return { wch: 16 };
      if (key.startsWith('ITN Related')) return { wch: 14 };
      if (key.startsWith('Related to Subscription')) return { wch: 22 };
      if (key.startsWith('Team Accountability')) return { wch: 20 };
      if (key === 'Field Team Name') return { wch: 24 };
      if (key.startsWith('Note')) return { wch: 35 };
      if (key === 'Request Date') return { wch: 15 };
      if (key === 'In Date (Dispatched to Cont.)') return { wch: 26 };
      if (key === 'PIS Date') return { wch: 15 };
      if (key.startsWith('Request to Dispatched')) return { wch: 34 };
      if (key === 'Dispatched to Close (Days)') return { wch: 24 };
      if (key === 'Request to Close (Days)') return { wch: 22 };
      if (key === 'Interview Date') return { wch: 15 };
      if (key === 'PIS to Interview (Days)') return { wch: 22 };
      if (key === 'Close to PIS (Days)') return { wch: 18 };
      if (key === 'Interview Week') return { wch: 16 };
      return { wch: 15 };
    });
    fixSheetRange(wsRaw);

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
    wsYTD['A1'].s = { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "3b82f6" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } };
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
    fixSheetRange(wsYTD);

    // 8. Monthly Performance Summary Sheet
    const monthlyData = groupDataByMonth(allTasks, null, settings, samplesTokenData);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const monthSamplesMap = {};
    let totalAllMonthsSampleSize = 0;
    for (let i = 1; i <= 12; i++) {
      const stats = monthlyData[`Month-${i}`];
      let sampleSize = (stats && stats.sampleSize) ? Number(stats.sampleSize) : 0;
      if (sampleSize <= 0) {
        const tokenSum = allTeamSamples
          .filter(s => Number(s.month) === i)
          .reduce((sum, s) => sum + (parseFloat(s.sampleSize) || 0), 0);
        if (tokenSum > 0) {
          sampleSize = tokenSum;
        } else {
          sampleSize = allTasks.filter(t => {
            if (!t.interviewDate) return false;
            const info = getMonthNumber(t.interviewDate, settings);
            return info && info.key === `Month-${i}`;
          }).length;
        }
      }
      monthSamplesMap[i] = sampleSize;
      totalAllMonthsSampleSize += sampleSize;
    }

    const monthsHeader = ["Item Name"];
    for (let i = 0; i < monthNames.length; i++) {
      const shortName = monthNames[i].slice(0, 3);
      monthsHeader.push(shortName);
      monthsHeader.push(`${shortName} %`);
    }
    monthsHeader.push("Total Count");
    monthsHeader.push("Total %");

    // Detailed monthly performance helper
    const getMonthlyCounts = (field, useTotalFieldIssues = false) => {
      const fieldData = {};
      const monthlyTotalIssuesMap = {};
      for (let i = 1; i <= 12; i++) monthlyTotalIssuesMap[i] = 0;
      let totalAllMonthsFieldIssues = 0;

      allTasks.forEach(t => {
        if (!t.interviewDate) return;
        const monthInfo = getMonthNumber(t.interviewDate, settings);
        if (!monthInfo) return;
        const monthKey = monthInfo.key;
        const monthNum = monthInfo.number || parseInt(monthKey.replace('Month-', ''), 10);
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
          if (monthNum >= 1 && monthNum <= 12) {
            monthlyTotalIssuesMap[monthNum] = (monthlyTotalIssuesMap[monthNum] || 0) + 1;
          }
          totalAllMonthsFieldIssues += 1;
        });
      });

      const rows = Object.entries(fieldData).map(([name, months]) => {
        const row = [name];
        let totalCount = 0;
        for (let i = 1; i <= 12; i++) {
          const count = months[`Month-${i}`] || 0;
          const denom = useTotalFieldIssues ? (monthlyTotalIssuesMap[i] || 0) : (monthSamplesMap[i] || 0);
          const pct = denom > 0 ? `${((count / denom) * 100).toFixed(1)}%` : "0.0%";
          row.push(count);
          row.push(pct);
          totalCount += count;
        }
        const totalDenom = useTotalFieldIssues ? totalAllMonthsFieldIssues : totalAllMonthsSampleSize;
        const totalPct = totalDenom > 0 ? `${((totalCount / totalDenom) * 100).toFixed(1)}%` : "0.0%";
        row.push(totalCount);
        row.push(totalPct);
        return row;
      }).sort((a, b) => b[25] - a[25]);

      return {
        rows,
        monthlyTotalIssuesMap,
        totalAllMonthsFieldIssues
      };
    };

    const reasonPerfResult = getMonthlyCounts('reason', false);
    const subReasonPerfResult = getMonthlyCounts('subReason', false);
    const ownerPerfResult = getMonthlyCounts('responsible', true);
    const rootCausePerfResult = getMonthlyCounts('rootCause', false);

    const reasonPerformance = reasonPerfResult.rows;
    const subReasonPerformance = subReasonPerfResult.rows;
    const ownerPerformance = ownerPerfResult.rows;
    const rootCausePerformance = rootCausePerfResult.rows;

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
    wsCharts['A1'].s = { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4f46e5" } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } };

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

    let currentSheetR = 17; // 2 (header) + 12 (months) + 3 (padding)

    const addDetailedMonthlyTable = (ws, data, title, startRow, colorHex, baselineRowTitle = "TOTAL SAMPLES (TOKEN)", baselineDenominatorMap = null, baselineTotalAllMonths = null) => {
      const maxColIdx = 26; // 1 + 12*2 + 2 - 1 = 26

      // 1. Table Title Banner
      const titleCell = XLSX.utils.encode_cell({ r: startRow - 1, c: 0 });
      ws[titleCell] = {
        v: title,
        t: 's',
        s: { font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: colorHex } }, alignment: { horizontal: "left", vertical: "center", indent: 1 } }
      };
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: startRow - 1, c: 0 }, e: { r: startRow - 1, c: maxColIdx } });

      const headerR1 = startRow;
      const headerR2 = startRow + 1;
      const dataStartR = startRow + 2;

      // 2. Level 1 Header (Month Super-Headers)
      const lvl1 = ["Item Name"];
      monthNames.forEach(m => {
        lvl1.push(m.toUpperCase(), "");
      });
      lvl1.push("TOTAL FULL YEAR", "");

      // 3. Level 2 Header (Sub-headers: Count, % Share)
      const lvl2 = ["Item Name"];
      monthNames.forEach(m => {
        const short = m.slice(0, 3);
        lvl2.push(`${short} Count`, `${short} %`);
      });
      lvl2.push("Total Count", "Total %");

      // Add Headers
      XLSX.utils.sheet_add_aoa(ws, [lvl1, lvl2], { origin: XLSX.utils.encode_cell({ r: headerR1, c: 0 }) });

      // Merge Item Name vertically
      ws['!merges'].push({ s: { r: headerR1, c: 0 }, e: { r: headerR2, c: 0 } });
      ws[XLSX.utils.encode_cell({ r: headerR1, c: 0 })] = {
        v: "Item Name",
        t: 's',
        s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E293B" } }, alignment: { horizontal: "center", vertical: "center" } }
      };

      // Merge & Style Level 1 Month Headers
      for (let i = 0; i < 12; i++) {
        const colStart = 1 + i * 2;
        const colEnd = colStart + 1;
        const mColor = monthColorPalette[i % monthColorPalette.length];
        ws['!merges'].push({ s: { r: headerR1, c: colStart }, e: { r: headerR1, c: colEnd } });
        for (let c = colStart; c <= colEnd; c++) {
          const cell = XLSX.utils.encode_cell({ r: headerR1, c });
          ws[cell] = {
            v: c === colStart ? monthNames[i].toUpperCase() : "",
            t: 's',
            s: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: mColor } }, alignment: { horizontal: "center", vertical: "center" } }
          };
        }
      }

      // Summary Level 1
      ws['!merges'].push({ s: { r: headerR1, c: 25 }, e: { r: headerR1, c: 26 } });
      for (let c = 25; c <= 26; c++) {
        const cell = XLSX.utils.encode_cell({ r: headerR1, c });
        ws[cell] = {
          v: c === 25 ? "TOTAL FULL YEAR" : "",
          t: 's',
          s: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "111827" } }, alignment: { horizontal: "center", vertical: "center" } }
        };
      }

      // Level 2 Sub-Headers Styling
      for (let i = 0; i < 12; i++) {
        const colCount = 1 + i * 2;
        const colPct = colCount + 1;

        const cellCount = XLSX.utils.encode_cell({ r: headerR2, c: colCount });
        if (ws[cellCount]) {
          ws[cellCount].s = {
            font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "334155" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: { style: 'thin', color: { rgb: '94A3B8' } }, bottom: { style: 'medium', color: { rgb: '0F172A' } }, left: { style: 'thin', color: { rgb: '64748B' } }, right: { style: 'thin', color: { rgb: '64748B' } } }
          };
        }

        const cellPct = XLSX.utils.encode_cell({ r: headerR2, c: colPct });
        if (ws[cellPct]) {
          ws[cellPct].s = {
            font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "0D9488" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: { style: 'thin', color: { rgb: '94A3B8' } }, bottom: { style: 'medium', color: { rgb: '0F172A' } }, left: { style: 'thin', color: { rgb: '64748B' } }, right: { style: 'thin', color: { rgb: '64748B' } } }
          };
        }
      }

      // Summary Level 2 Styling
      const cellTotCount = XLSX.utils.encode_cell({ r: headerR2, c: 25 });
      if (ws[cellTotCount]) {
        ws[cellTotCount].s = {
          font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1F2937" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { top: { style: 'thin', color: { rgb: '94A3B8' } }, bottom: { style: 'medium', color: { rgb: '0F172A' } }, left: { style: 'thin', color: { rgb: '64748B' } }, right: { style: 'thin', color: { rgb: '64748B' } } }
        };
      }
      const cellTotPct = XLSX.utils.encode_cell({ r: headerR2, c: 26 });
      if (ws[cellTotPct]) {
        ws[cellTotPct].s = {
          font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "047857" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { top: { style: 'thin', color: { rgb: '94A3B8' } }, bottom: { style: 'medium', color: { rgb: '0F172A' } }, left: { style: 'thin', color: { rgb: '64748B' } }, right: { style: 'thin', color: { rgb: '64748B' } } }
        };
      }

      // Prepend Baseline (TOTAL SAMPLES / TOTAL ISSUES) row
      const totalMonthlySamplesRow = [baselineRowTitle];
      for (let i = 1; i <= 12; i++) {
        const sSize = baselineDenominatorMap ? (baselineDenominatorMap[i] || 0) : (monthSamplesMap[i] || 0);
        totalMonthlySamplesRow.push(sSize);
        totalMonthlySamplesRow.push(sSize > 0 ? "100.0%" : "0.0%");
      }
      const totalDenom = baselineTotalAllMonths !== null && baselineTotalAllMonths !== undefined ? baselineTotalAllMonths : totalAllMonthsSampleSize;
      totalMonthlySamplesRow.push(totalDenom);
      totalMonthlySamplesRow.push(totalDenom > 0 ? "100.0%" : "0.0%");

      const tableDataWithTotals = [totalMonthlySamplesRow, ...data];
      XLSX.utils.sheet_add_aoa(ws, tableDataWithTotals, { origin: XLSX.utils.encode_cell({ r: dataStartR, c: 0 }) });

      // Highlight the TOTAL SAMPLES (TOKEN) baseline row
      for (let c = 0; c <= maxColIdx; c++) {
        const cell = XLSX.utils.encode_cell({ r: dataStartR, c });
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true, color: { rgb: "1E3A8A" } },
            fill: { fgColor: { rgb: "EEF2FF" } },
            alignment: { horizontal: c === 0 ? "left" : "center", vertical: "center" },
            border: {
              top: { style: 'thin', color: { rgb: '93C5FD' } },
              bottom: { style: 'medium', color: { rgb: '3B82F6' } },
              left: { style: 'thin', color: { rgb: 'E5E7EB' } },
              right: { style: 'thin', color: { rgb: 'CBD5E1' } }
            }
          };
        }
      }

      // Style remaining data rows
      for (let r = 1; r < tableDataWithTotals.length; r++) {
        const rowIdx = dataStartR + r;
        for (let c = 0; c <= maxColIdx; c++) {
          const cell = XLSX.utils.encode_cell({ r: rowIdx, c });
          if (!ws[cell]) continue;

          ws[cell].s = {
            font: { bold: c === 0 || c >= 25, color: { rgb: c === 0 ? "1E293B" : (c >= 25 ? "0F172A" : "334155") } },
            fill: { fgColor: { rgb: c >= 25 ? "F8FAFC" : "FFFFFF" } },
            alignment: { horizontal: c === 0 ? "left" : "center", vertical: "center" },
            border: {
              top: { style: 'thin', color: { rgb: 'E2E8F0' } },
              bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
              left: { style: 'thin', color: { rgb: 'E2E8F0' } },
              right: { style: 'thin', color: { rgb: 'CBD5E1' } }
            }
          };
        }
      }

      return dataStartR + tableDataWithTotals.length + 4;
    };

    currentSheetR = addDetailedMonthlyTable(wsCharts, reasonPerformance, "DETAILED REASON PERFORMANCE BY MONTH", currentSheetR, "1E3A8A");
    currentSheetR = addDetailedMonthlyTable(wsCharts, subReasonPerformance, "DETAILED SUB-REASON PERFORMANCE BY MONTH", currentSheetR, "1F2937");
    currentSheetR = addDetailedMonthlyTable(
      wsCharts,
      ownerPerformance,
      "DETAILED OWNER PERFORMANCE BY MONTH",
      currentSheetR,
      "0891B2",
      "TOTAL ISSUES (ALL OWNERS)",
      ownerPerfResult.monthlyTotalIssuesMap,
      ownerPerfResult.totalAllMonthsFieldIssues
    );
    currentSheetR = addDetailedMonthlyTable(wsCharts, rootCausePerformance, "DETAILED ROOT CAUSE PERFORMANCE BY MONTH", currentSheetR, "4F46E5");

    // NEW: Monthly Top Categories Summary
    const monthlyTopSummary = monthNames.map((name, i) => {
      const monthKey = `Month-${i + 1}`;
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

    currentSheetR += weeklyTopSummary.length + 5;
    XLSX.utils.sheet_add_aoa(wsCharts, [["WEEKLY TOP CATEGORIES SUMMARY"]], { origin: `A${currentSheetR}` });
    wsCharts[`A${currentSheetR}`].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "111827" } }, alignment: { horizontal: "center" } };
    wsCharts['!merges'].push({ s: { r: currentSheetR - 1, c: 0 }, e: { r: currentSheetR - 1, c: 3 } });

    XLSX.utils.sheet_add_aoa(wsCharts, [["Week", "Top Reason", "Top Root Cause", "Top Owner"]], { origin: `A${currentSheetR + 1}` });
    applyHeaderStyle(wsCharts, { s: { r: currentSheetR, c: 0 }, e: { r: currentSheetR, c: 3 } }, "4B5563");
    XLSX.utils.sheet_add_aoa(wsCharts, weeklyTopSummary, { origin: `A${currentSheetR + 2}` });
    applyDataRowStyle(wsCharts, { s: { r: currentSheetR + 1, c: 0 }, e: { r: currentSheetR + 1 + weeklyTopSummary.length, c: 3 } });

    // ─────────────────────────────────────────────────────────────────────────
    // NEW: Monthly Responsible Ownership Satisfaction & NPS Breakdown (By PIS Date)
    // ─────────────────────────────────────────────────────────────────────────
    currentSheetR += weeklyTopSummary.length + 5;
    const ownerNpsHeaders = [
      'Month',
      'Responsible Owner / Department',
      'Total Issues Identified',
      'Share of Month Issues (%)',
      'Detractors (≤6)',
      'Detractor % of Owner',
      'Share of Month Detractors (%)',
      'Neutrals (7-8)',
      'Neutral % of Owner',
      'Share of Month Neutrals (%)',
      'Promoters (≥9)',
      'Promoter % of Owner',
      'Share of Month Promoters (%)',
      'Total Evaluated Tasks',
      'Owner Net Promoter Score (NPS)',
      'Remediation & Strategic Directive'
    ];

    // Build monthly interval starting from beginning of year (01/01/2026) up to current period
    const yearStartDate = new Date(2026, 0, 1); // January 1, 2026
    let yearEndDate = new Date(2026, 7, 31); // Default to at least August 2026
    if (intervalEndDate && intervalEndDate > yearEndDate) yearEndDate = intervalEndDate;
    if (CumulativeDateFilter?.end && new Date(CumulativeDateFilter.end) > yearEndDate) yearEndDate = new Date(CumulativeDateFilter.end);
    (allTasks || []).forEach(t => {
      if (t.pisDate) {
        const td = new Date(t.pisDate);
        if (!isNaN(td) && td > yearEndDate) yearEndDate = td;
      }
    });

    const fullYearMonthlyInterval = [];
    let curFullYearCursor = startOfMonth(yearStartDate);
    const lastFullYearLimit = endOfMonth(yearEndDate);
    while (curFullYearCursor <= lastFullYearLimit) {
      fullYearMonthlyInterval.push(new Date(curFullYearCursor));
      curFullYearCursor = new Date(curFullYearCursor.getFullYear(), curFullYearCursor.getMonth() + 1, 1);
    }

    const ownerNpsRows = [];
    const cumOwnerStats = {};

    fullYearMonthlyInterval.forEach(mDate => {
      const monthKey = format(mDate, 'MMMM yyyy');
      const monthPrefix = format(mDate, 'yyyy-MM');

      const mTasks = (allTasks || []).filter(t => {
        if (!t.pisDate) return false;
        try {
          return format(new Date(t.pisDate), 'yyyy-MM') === monthPrefix;
        } catch {
          return false;
        }
      });

      let mMonthTotalIssues = 0;
      let mMonthTotalDet = 0;
      let mMonthTotalNeu = 0;
      let mMonthTotalPro = 0;

      const mOwnerStats = {};
      const ensureOwner = (key, name) => {
        if (!mOwnerStats[key]) {
          mOwnerStats[key] = { key, name, issues: 0, det: 0, neu: 0, pro: 0, tasks: 0 };
        }
        if (!cumOwnerStats[key]) {
          cumOwnerStats[key] = { key, name, issues: 0, det: 0, neu: 0, pro: 0, tasks: 0 };
        }
      };

      ensureOwner('REACH_TOTAL', 'REACH (Total)');
      ensureOwner('REACH_ACC_YES', '↳ REACH - Accountable (Yes)');
      ensureOwner('REACH_ACC_NO', '↳ REACH - Non-Accountable (No)');

      mTasks.forEach(t => {
        let isDet = false;
        let isNeu = false;
        let isPro = false;
        const score = Number(t.evaluationScore);
        if (!isNaN(score)) {
          if (score <= 6) { isDet = true; mMonthTotalDet++; }
          else if (score >= 7 && score <= 8) { isNeu = true; mMonthTotalNeu++; }
          else if (score >= 9) { isPro = true; mMonthTotalPro++; }
        }

        const owners = normalizeArrayField(t.responsible);
        const accs = normalizeArrayField(t.teamAccountability);

        owners.forEach((owner, i) => {
          mMonthTotalIssues++;
          const normOwner = String(owner).trim().toUpperCase();
          const acc = accs[i] || (accs.length > 0 ? accs[0] : 'Unknown');
          const isAccYes = String(acc).trim().toLowerCase().startsWith('yes') || String(acc).trim().toLowerCase() === 'y';

          if (normOwner === 'REACH') {
            mOwnerStats['REACH_TOTAL'].issues++;
            cumOwnerStats['REACH_TOTAL'].issues++;
            if (isDet) { mOwnerStats['REACH_TOTAL'].det++; cumOwnerStats['REACH_TOTAL'].det++; }
            if (isNeu) { mOwnerStats['REACH_TOTAL'].neu++; cumOwnerStats['REACH_TOTAL'].neu++; }
            if (isPro) { mOwnerStats['REACH_TOTAL'].pro++; cumOwnerStats['REACH_TOTAL'].pro++; }
            mOwnerStats['REACH_TOTAL'].tasks++;
            cumOwnerStats['REACH_TOTAL'].tasks++;

            if (isAccYes) {
              mOwnerStats['REACH_ACC_YES'].issues++;
              cumOwnerStats['REACH_ACC_YES'].issues++;
              if (isDet) { mOwnerStats['REACH_ACC_YES'].det++; cumOwnerStats['REACH_ACC_YES'].det++; }
              if (isNeu) { mOwnerStats['REACH_ACC_YES'].neu++; cumOwnerStats['REACH_ACC_YES'].neu++; }
              if (isPro) { mOwnerStats['REACH_ACC_YES'].pro++; cumOwnerStats['REACH_ACC_YES'].pro++; }
              mOwnerStats['REACH_ACC_YES'].tasks++;
              cumOwnerStats['REACH_ACC_YES'].tasks++;
            } else {
              mOwnerStats['REACH_ACC_NO'].issues++;
              cumOwnerStats['REACH_ACC_NO'].issues++;
              if (isDet) { mOwnerStats['REACH_ACC_NO'].det++; cumOwnerStats['REACH_ACC_NO'].det++; }
              if (isNeu) { mOwnerStats['REACH_ACC_NO'].neu++; cumOwnerStats['REACH_ACC_NO'].neu++; }
              if (isPro) { mOwnerStats['REACH_ACC_NO'].pro++; cumOwnerStats['REACH_ACC_NO'].pro++; }
              mOwnerStats['REACH_ACC_NO'].tasks++;
              cumOwnerStats['REACH_ACC_NO'].tasks++;
            }
          } else {
            const displayOwner = String(owner).trim() || 'Other';
            const ownerKey = `OWNER_${normOwner}`;
            ensureOwner(ownerKey, displayOwner);
            mOwnerStats[ownerKey].issues++;
            cumOwnerStats[ownerKey].issues++;
            if (isDet) { mOwnerStats[ownerKey].det++; cumOwnerStats[ownerKey].det++; }
            if (isNeu) { mOwnerStats[ownerKey].neu++; cumOwnerStats[ownerKey].neu++; }
            if (isPro) { mOwnerStats[ownerKey].pro++; cumOwnerStats[ownerKey].pro++; }
            mOwnerStats[ownerKey].tasks++;
            cumOwnerStats[ownerKey].tasks++;
          }
        });
      });

      // Overall Month Row
      const mTotEval = mMonthTotalDet + mMonthTotalNeu + mMonthTotalPro;
      const mMonthNps = mTotEval > 0 ? (((mMonthTotalPro - mMonthTotalDet) / mTotEval) * 100).toFixed(1) : (mTasks.length > 0 ? '-100.0' : '-');
      const mMonthDetRate = mTotEval > 0 ? `${((mMonthTotalDet / mTotEval) * 100).toFixed(1)}%` : '0.0%';
      const mMonthNeuRate = mTotEval > 0 ? `${((mMonthTotalNeu / mTotEval) * 100).toFixed(1)}%` : '0.0%';
      const mMonthProRate = mTotEval > 0 ? `${((mMonthTotalPro / mTotEval) * 100).toFixed(1)}%` : '0.0%';

      ownerNpsRows.push([
        monthKey,
        `✦ ALL RESPONSIBLE OWNERS TOTAL (${monthKey})`,
        mMonthTotalIssues,
        mMonthTotalIssues > 0 ? '100.0%' : '0.0%',
        mMonthTotalDet,
        mMonthDetRate,
        mMonthTotalDet > 0 ? '100.0%' : '0.0%',
        mMonthTotalNeu,
        mMonthNeuRate,
        mMonthTotalNeu > 0 ? '100.0%' : '0.0%',
        mMonthTotalPro,
        mMonthProRate,
        mMonthTotalPro > 0 ? '100.0%' : '0.0%',
        mTotEval,
        mMonthNps,
        mTotEval > 0
          ? `Month overall benchmark: NPS is ${mMonthNps} (${mMonthTotalDet} Detractors, ${mMonthTotalNeu} Neutrals, ${mMonthTotalPro} Promoters)`
          : `No DVOC non-promoter incidents recorded in ${monthKey}`
      ]);

      if (mTasks.length > 0) {
        // REACH Total & Sub-scopes
        ['REACH_TOTAL', 'REACH_ACC_YES', 'REACH_ACC_NO'].forEach(rKey => {
          const st = mOwnerStats[rKey];
          if (st) {
            const totEval = st.det + st.neu + st.pro;
            const nps = totEval > 0 ? (((st.pro - st.det) / totEval) * 100).toFixed(1) : (st.issues > 0 ? '-100.0' : '-');
            const issueShare = mMonthTotalIssues > 0 ? `${((st.issues / mMonthTotalIssues) * 100).toFixed(1)}%` : '0.0%';
            const detRate = totEval > 0 ? `${((st.det / totEval) * 100).toFixed(1)}%` : '0.0%';
            const shareOfMonthDet = mMonthTotalDet > 0 ? `${((st.det / mMonthTotalDet) * 100).toFixed(1)}%` : '0.0%';
            const neuRate = totEval > 0 ? `${((st.neu / totEval) * 100).toFixed(1)}%` : '0.0%';
            const shareOfMonthNeu = mMonthTotalNeu > 0 ? `${((st.neu / mMonthTotalNeu) * 100).toFixed(1)}%` : '0.0%';
            const proRate = totEval > 0 ? `${((st.pro / totEval) * 100).toFixed(1)}%` : '0.0%';
            const shareOfMonthPro = mMonthTotalPro > 0 ? `${((st.pro / mMonthTotalPro) * 100).toFixed(1)}%` : '0.0%';

            let directive = '';
            if (rKey === 'REACH_TOTAL') directive = `REACH caused ${shareOfMonthDet} of month detractors (${st.det}/${mMonthTotalDet}) and ${shareOfMonthNeu} of neutrals (${st.neu}/${mMonthTotalNeu})`;
            else if (rKey === 'REACH_ACC_YES') directive = `Accountable field/installation: Direct quality intervention (${st.det} detractors, ${st.neu} neutrals)`;
            else directive = `Non-accountable dispatch/network: Workflow and handover optimization (${st.det} detractors, ${st.neu} neutrals)`;

            ownerNpsRows.push([
              monthKey,
              st.name,
              st.issues,
              issueShare,
              st.det,
              detRate,
              shareOfMonthDet,
              st.neu,
              neuRate,
              shareOfMonthNeu,
              st.pro,
              proRate,
              shareOfMonthPro,
              totEval,
              nps,
              directive
            ]);
          }
        });

        // Other non-REACH owners sorted by issue volume
        const nonReachOwners = Object.keys(mOwnerStats)
          .filter(k => !k.startsWith('REACH_') && mOwnerStats[k].issues > 0)
          .sort((a, b) => mOwnerStats[b].issues - mOwnerStats[a].issues);

        nonReachOwners.forEach(k => {
          const st = mOwnerStats[k];
          const totEval = st.det + st.neu + st.pro;
          const nps = totEval > 0 ? (((st.pro - st.det) / totEval) * 100).toFixed(1) : (st.issues > 0 ? '-100.0' : '-');
          const issueShare = mMonthTotalIssues > 0 ? `${((st.issues / mMonthTotalIssues) * 100).toFixed(1)}%` : '0.0%';
          const detRate = totEval > 0 ? `${((st.det / totEval) * 100).toFixed(1)}%` : '0.0%';
          const shareOfMonthDet = mMonthTotalDet > 0 ? `${((st.det / mMonthTotalDet) * 100).toFixed(1)}%` : '0.0%';
          const neuRate = totEval > 0 ? `${((st.neu / totEval) * 100).toFixed(1)}%` : '0.0%';
          const shareOfMonthNeu = mMonthTotalNeu > 0 ? `${((st.neu / mMonthTotalNeu) * 100).toFixed(1)}%` : '0.0%';
          const proRate = totEval > 0 ? `${((st.pro / totEval) * 100).toFixed(1)}%` : '0.0%';
          const shareOfMonthPro = mMonthTotalPro > 0 ? `${((st.pro / mMonthTotalPro) * 100).toFixed(1)}%` : '0.0%';

          ownerNpsRows.push([
            monthKey,
            st.name,
            st.issues,
            issueShare,
            st.det,
            detRate,
            shareOfMonthDet,
            st.neu,
            neuRate,
            shareOfMonthNeu,
            st.pro,
            proRate,
            shareOfMonthPro,
            totEval,
            nps,
            `Responsible for ${shareOfMonthDet} of month detractors (${st.det}/${mMonthTotalDet}) and ${shareOfMonthNeu} of neutrals (${st.neu}/${mMonthTotalNeu}) → NPS is ${nps}`
          ]);
        });
      }
    });

    // Cumulative summary by Owner across all full year periods
    let cumAllIssues = 0;
    let cumAllDet = 0;
    let cumAllNeu = 0;
    let cumAllPro = 0;

    Object.keys(cumOwnerStats).forEach(k => {
      if (!k.startsWith('REACH_ACC_') && k !== 'REACH_TOTAL') {
        cumAllIssues += cumOwnerStats[k].issues;
        cumAllDet += cumOwnerStats[k].det;
        cumAllNeu += cumOwnerStats[k].neu;
        cumAllPro += cumOwnerStats[k].pro;
      }
    });
    if (cumOwnerStats['REACH_TOTAL']) {
      cumAllIssues += cumOwnerStats['REACH_TOTAL'].issues;
      cumAllDet += cumOwnerStats['REACH_TOTAL'].det;
      cumAllNeu += cumOwnerStats['REACH_TOTAL'].neu;
      cumAllPro += cumOwnerStats['REACH_TOTAL'].pro;
    }

    const cumTotEval = cumAllDet + cumAllNeu + cumAllPro;
    const cumTotNps = cumTotEval > 0 ? (((cumAllPro - cumAllDet) / cumTotEval) * 100).toFixed(1) : '-100.0';
    const cumTotDetRate = cumTotEval > 0 ? `${((cumAllDet / cumTotEval) * 100).toFixed(1)}%` : '0.0%';
    const cumTotNeuRate = cumTotEval > 0 ? `${((cumAllNeu / cumTotEval) * 100).toFixed(1)}%` : '0.0%';
    const cumTotProRate = cumTotEval > 0 ? `${((cumAllPro / cumTotEval) * 100).toFixed(1)}%` : '0.0%';

    ownerNpsRows.push([
      'TOTAL CUMULATIVE',
      '✦ ALL RESPONSIBLE OWNERS CUMULATIVE TOTAL',
      cumAllIssues,
      '100.0%',
      cumAllDet,
      cumTotDetRate,
      cumAllDet > 0 ? '100.0%' : '0.0%',
      cumAllNeu,
      cumTotNeuRate,
      cumAllNeu > 0 ? '100.0%' : '0.0%',
      cumAllPro,
      cumTotProRate,
      cumAllPro > 0 ? '100.0%' : '0.0%',
      cumTotEval,
      cumTotNps,
      `Full cumulative benchmark summary: Overall NPS is ${cumTotNps} across ${cumTotEval} evaluated tasks (${cumAllDet} detractors, ${cumAllNeu} neutrals, ${cumAllPro} promoters)`
    ]);

    ['REACH_TOTAL', 'REACH_ACC_YES', 'REACH_ACC_NO'].forEach(rKey => {
      const st = cumOwnerStats[rKey];
      if (st) {
        const totEval = st.det + st.neu + st.pro;
        const nps = totEval > 0 ? (((st.pro - st.det) / totEval) * 100).toFixed(1) : (st.issues > 0 ? '-100.0' : '-');
        const issueShare = cumAllIssues > 0 ? `${((st.issues / cumAllIssues) * 100).toFixed(1)}%` : '0.0%';
        const detRate = totEval > 0 ? `${((st.det / totEval) * 100).toFixed(1)}%` : '0.0%';
        const cumShareDet = cumAllDet > 0 ? `${((st.det / cumAllDet) * 100).toFixed(1)}%` : '0.0%';
        const neuRate = totEval > 0 ? `${((st.neu / totEval) * 100).toFixed(1)}%` : '0.0%';
        const cumShareNeu = cumAllNeu > 0 ? `${((st.neu / cumAllNeu) * 100).toFixed(1)}%` : '0.0%';
        const proRate = totEval > 0 ? `${((st.pro / totEval) * 100).toFixed(1)}%` : '0.0%';
        const cumSharePro = cumAllPro > 0 ? `${((st.pro / cumAllPro) * 100).toFixed(1)}%` : '0.0%';

        ownerNpsRows.push([
          'TOTAL CUMULATIVE',
          st.name,
          st.issues,
          issueShare,
          st.det,
          detRate,
          cumShareDet,
          st.neu,
          neuRate,
          cumShareNeu,
          st.pro,
          proRate,
          cumSharePro,
          totEval,
          nps,
          `Cumulative ${st.name}: ${st.issues} total issues, ${cumShareDet} of all detractors (${st.det}/${cumAllDet}) → NPS is ${nps}`
        ]);
      }
    });

    const cumNonReach = Object.keys(cumOwnerStats)
      .filter(k => !k.startsWith('REACH_') && cumOwnerStats[k].issues > 0)
      .sort((a, b) => cumOwnerStats[b].issues - cumOwnerStats[a].issues);

    cumNonReach.forEach(k => {
      const st = cumOwnerStats[k];
      const totEval = st.det + st.neu + st.pro;
      const nps = totEval > 0 ? (((st.pro - st.det) / totEval) * 100).toFixed(1) : (st.issues > 0 ? '-100.0' : '-');
      const issueShare = cumAllIssues > 0 ? `${((st.issues / cumAllIssues) * 100).toFixed(1)}%` : '0.0%';
      const detRate = totEval > 0 ? `${((st.det / totEval) * 100).toFixed(1)}%` : '0.0%';
      const cumShareDet = cumAllDet > 0 ? `${((st.det / cumAllDet) * 100).toFixed(1)}%` : '0.0%';
      const neuRate = totEval > 0 ? `${((st.neu / totEval) * 100).toFixed(1)}%` : '0.0%';
      const cumShareNeu = cumAllNeu > 0 ? `${((st.neu / cumAllNeu) * 100).toFixed(1)}%` : '0.0%';
      const proRate = totEval > 0 ? `${((st.pro / totEval) * 100).toFixed(1)}%` : '0.0%';
      const cumSharePro = cumAllPro > 0 ? `${((st.pro / cumAllPro) * 100).toFixed(1)}%` : '0.0%';

      ownerNpsRows.push([
        'TOTAL CUMULATIVE',
        st.name,
        st.issues,
        issueShare,
        st.det,
        detRate,
        cumShareDet,
        st.neu,
        neuRate,
        cumShareNeu,
        st.pro,
        proRate,
        cumSharePro,
        totEval,
        nps,
        `Cumulative ${st.name}: ${st.issues} issues, ${cumShareDet} of all detractors (${st.det}/${cumAllDet}), ${cumShareNeu} of neutrals (${st.neu}/${cumAllNeu}) → NPS is ${nps}`
      ]);
    });

    XLSX.utils.sheet_add_aoa(wsCharts, [['MONTHLY RESPONSIBLE OWNERSHIP DVOC SATISFACTION & NPS BREAKDOWN (BY PIS DATE)']], { origin: `A${currentSheetR}` });
    wsCharts[`A${currentSheetR}`].s = { font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "581C87" } }, alignment: { horizontal: "center" } };
    wsCharts['!merges'].push({ s: { r: currentSheetR - 1, c: 0 }, e: { r: currentSheetR - 1, c: 15 } });

    XLSX.utils.sheet_add_aoa(wsCharts, [ownerNpsHeaders], { origin: `A${currentSheetR + 1}` });
    applyHeaderStyle(wsCharts, { s: { r: currentSheetR, c: 0 }, e: { r: currentSheetR, c: 15 } }, "1E293B");

    XLSX.utils.sheet_add_aoa(wsCharts, ownerNpsRows, { origin: `A${currentSheetR + 2}` });
    applyDataRowStyle(wsCharts, { s: { r: currentSheetR + 1, c: 0 }, e: { r: currentSheetR + 1 + ownerNpsRows.length, c: 15 } });

    // Format summary rows in Owner NPS table on wsCharts
    for (let rIdx = 0; rIdx < ownerNpsRows.length; rIdx++) {
      const rowItem = ownerNpsRows[rIdx];
      const isTotalRow = String(rowItem[1]).includes('ALL RESPONSIBLE OWNERS') || String(rowItem[0]).includes('TOTAL CUMULATIVE');
      const isReachMain = String(rowItem[1]) === 'REACH (Total)';
      if (isTotalRow || isReachMain) {
        const rowNum = currentSheetR + 2 + rIdx;
        for (let c = 0; c < 16; c++) {
          const cellRef = XLSX.utils.encode_cell({ r: rowNum - 1, c });
          if (wsCharts[cellRef]) {
            wsCharts[cellRef].s = {
              font: { bold: true, color: { rgb: isTotalRow ? "4C1D95" : "0F172A" } },
              fill: { fgColor: { rgb: isTotalRow ? "F3E8FF" : "F1F5F9" } },
              border: {
                top: { style: 'thin', color: { rgb: isTotalRow ? "7C3AED" : "CBD5E1" } },
                bottom: { style: 'thin', color: { rgb: isTotalRow ? "7C3AED" : "CBD5E1" } }
              },
              alignment: { horizontal: c === 0 || c === 1 || c === 15 ? "left" : "center" }
            };
          }
        }
      }
    }

    wsCharts['!cols'] = [
      { wch: 32 }, // Col 0: Month / Item Name
      { wch: 36 }, // Col 1: Responsible Owner / Department
      { wch: 24 }, // Col 2: Total Issues Identified
      { wch: 24 }, // Col 3: Share of Month Issues (%)
      { wch: 18 }, // Col 4: Detractors (≤6)
      { wch: 22 }, // Col 5: Detractor % of Owner
      { wch: 28 }, // Col 6: Share of Month Detractors (%)
      { wch: 18 }, // Col 7: Neutrals (7-8)
      { wch: 22 }, // Col 8: Neutral % of Owner
      { wch: 28 }, // Col 9: Share of Month Neutrals (%)
      { wch: 18 }, // Col 10: Promoters (≥9)
      { wch: 22 }, // Col 11: Promoter % of Owner
      { wch: 28 }, // Col 12: Share of Month Promoters (%)
      { wch: 22 }, // Col 13: Total Evaluated Tasks
      { wch: 28 }, // Col 14: Owner Net Promoter Score (NPS)
      { wch: 70 }, // Col 15: Remediation & Strategic Directive
      ...Array.from({ length: 12 }, () => [{ wch: 12 }, { wch: 12 }]).flat()
    ];
    fixSheetRange(wsCharts);

    // 8. Append All Subsheets in Strict Natural Sequence
    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Executive Summary');
    XLSX.utils.book_append_sheet(workbook, wsReasons, 'R.C.A - All');
    XLSX.utils.book_append_sheet(workbook, wsMatrix, 'Category Matrix Analysis');
    XLSX.utils.book_append_sheet(workbook, wsSpecial, 'Ownership Distribution');
    XLSX.utils.book_append_sheet(workbook, wsReachOwnershipAnalysis, 'Team Ownership Vs Reach issues');
    XLSX.utils.book_append_sheet(workbook, wsDetSpecial, 'Detractor Special Analytics');
    XLSX.utils.book_append_sheet(workbook, wsNeuSpecial, 'Neutral Special Analytics');
    XLSX.utils.book_append_sheet(workbook, wsTextAnalysis, 'R.C & Team Impact Analysis');
    XLSX.utils.book_append_sheet(workbook, wsDailyOnline, 'Daily Online & DVOC Analysis');
    XLSX.utils.book_append_sheet(workbook, wsTeamSamplesNPS, 'Team Samples & NPS Analysis');
    XLSX.utils.book_append_sheet(workbook, wsTeamPerfCumulative, 'Team Performance - Cumulative');
    XLSX.utils.book_append_sheet(workbook, wsMonthlyTeamPerf, 'Monthly Performance - Teams');
    XLSX.utils.book_append_sheet(workbook, wsWorstTeams, 'Worst Performing Teams');
    XLSX.utils.book_append_sheet(workbook, wsTeamDevLogs, 'Team Development & Actions');
    XLSX.utils.book_append_sheet(workbook, wsRaw, 'Deep Raw Data');
    XLSX.utils.book_append_sheet(workbook, wsYTD, 'YTD Analysis');
    XLSX.utils.book_append_sheet(workbook, wsCharts, 'Monthly Performance Summary');

    // 9. Hide ONLY "Note 1" and "Note 2" columns across ALL subsheets.
    //    Note 3, Note 4, etc. remain visible.
    workbook.SheetNames.forEach(sheetName => {
      const ws = workbook.Sheets[sheetName];
      if (!ws || !ws['!ref']) return;
      const range = XLSX.utils.decode_range(ws['!ref']);
      if (!ws['!cols']) ws['!cols'] = [];

      for (let c = range.s.c; c <= range.e.c; c++) {
        let isHiddenNoteCol = false;
        // Search header rows (rows 0 through 15) for Note 1 or Note 2 exactly
        for (let r = range.s.r; r <= Math.min(range.e.r, 15); r++) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (cell && typeof cell.v === 'string') {
            const val = cell.v.trim();
            // Only hide "Note 1" and "Note 2" — not Note 3, Note 4, etc.
            if (/^Note\s*[12]$/i.test(val)) {
              isHiddenNoteCol = true;
              break;
            }
          }
        }
        if (isHiddenNoteCol) {
          while (ws['!cols'].length <= c) {
            ws['!cols'].push({ wch: 15 });
          }
          ws['!cols'][c] = { ...(ws['!cols'][c] || {}), hidden: true, wch: 0 };
        }
      }
    });

    // 10. Save Workbook
    XLSX.writeFile(workbook, getExportFileName());
  };

  const handleTableContainerClick = (e) => {
    // Check if we're clicking directly on the container (not a child element that might stop propagation)
    if (e.target === e.currentTarget) {
      setSelectedRowId(null);
    }
  };


  // --- Statistics Dashboard Logic ---

  // Calculate Stats dynamically based on filteredTasks
  // Calculate Stats dynamically based on dashboardStats memo
  const { totalSamples, promoterRate, detractorRate, neutralRate, nps } = dashboardStats;

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

  const totalIssues = useMemo(() => {
    return filteredTasks.reduce((acc, task) => {
      const val = task.reason;
      if (!val) return acc;

      let values = [];
      if (Array.isArray(val)) {
        values = val.flatMap(v => typeof v === 'string' ? v.split(',').map(s => s.trim()) : [v]).filter(Boolean);
      } else if (typeof val === 'string' && val.trim()) {
        values = val.split(',').map(s => s.trim()).filter(Boolean);
      } else if (val) {
        values = [String(val).trim()];
      }

      return acc + values.length;
    }, 0);
  }, [filteredTasks]);

  const totalTasks = useMemo(() => filteredTasks.length, [filteredTasks]);
  const detractorsCount = useMemo(() => filteredTasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined && Number(t.evaluationScore) >= 1 && Number(t.evaluationScore) <= 6).length, [filteredTasks]);
  const neutralsCount = useMemo(() => filteredTasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== undefined && Number(t.evaluationScore) >= 7 && Number(t.evaluationScore) <= 8).length, [filteredTasks]);

  // KPI tile in the shared StatCard style; `color` marks the label icon only
  const StatBar = ({ label, value, color, icon, subLabel }) => (
    <StatCard sx={{ flex: 1, minWidth: 140 }} label={label} value={value} hint={subLabel} icon={icon ? <Box component="span" sx={{ display: 'inline-flex', color, fontSize: 15 }}>{icon}</Box> : undefined} />
  );

  const MiniTable = ({ title, data, color, category }) => (
    <Box sx={{ bgcolor: 'var(--overlay-subtle)', borderRadius: 2, p: 2, height: '100%' }}>
      <Typography variant="subtitle2" sx={{ color: color, fontWeight: '600', mb: 2, borderBottom: `1px solid ${alpha(color, 0.2)}`, pb: 1 }}>
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
              <Typography variant="caption" sx={{ color: 'var(--text)', fontWeight: 500 }}>{item.name}</Typography>
              <Typography variant="caption" sx={{ color: color }}>{item.count} ({item.percentage}%)</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={item.percentage}
              sx={{
                height: 4,
                borderRadius: 2,
                bgcolor: 'var(--overlay-subtle)',
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
    <Box>
      <PageHeader
        title="Tasks audit reports"
        description="DVOC · Installation NPS audit: KPIs, breakdowns, escalation and cumulative benchmarks, and the full task register."
        actions={<Button variant="outlined" component={RouterLink} to="/tasks-list" startIcon={<MdArrowBack />}>Back to tasks</Button>}
      />

      {/* Advanced Analytics & Filter Section */}
      <Box sx={{ mb: 2 }}>

        {/* Consolidated Premium KPI Cards */}
        {/* Comprehensive Statistics Dashboard */}
        <Box sx={{ mb: 4 }}>

          {/* Summary Stats Row */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <StatBar
              label="Total Samples"
              value={loadingSamples ? "..." : totalSamples}
              color="var(--accent-text)"
              icon={<MdHistory />}
            // subLabel={`Actual Audits: ${actualAudits}`}
            />
            <StatBar label="NPS Score" value={nps} color={nps >= 50 ? "#16A34A" : nps >= 0 ? "#D97706" : "#DC2626"} icon={<MdInsights />} />
            <StatBar label="Promoters" value={`${promoterRate}%`} color="#16A34A" icon={<MdStar />} />
            <StatBar label="Detractors" value={`${detractorRate}%`} color="#DC2626" icon={<MdError />} />
            <StatBar label="Neutrals" value={`${neutralRate}%`} color="#D97706" icon={<MdRadioButtonUnchecked />} />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <StatBar label="Total Tasks" value={totalTasks} color="var(--accent-text)" icon={<MdAssignmentTurnedIn />} />
            <StatBar label="Total Issues" value={totalIssues} color="var(--accent-text)" icon={<MdAssignmentTurnedIn />} />
            <StatBar label="Detractors" value={detractorsCount} color="#DC2626" icon={<MdError />} />
            <StatBar label="Neutrals" value={neutralsCount} color="#D97706" icon={<MdRadioButtonUnchecked />} />
          </Stack>

          {/* Expandable Detailed Stats */}
          <Accordion sx={{ bgcolor: 'var(--overlay-subtle)', color: 'var(--text)', '&:before': { display: 'none' }, boxShadow: 'none' }}>
            <AccordionSummary expandIcon={<MdExpandMore style={{ color: 'var(--text)' }} />} sx={{ borderBottom: '1px solid var(--border)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MdBarChart style={{ color: 'var(--accent-text)' }} />
                <Typography fontWeight="600">Detailed Breakdown (Top 5 Results)</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <MiniTable title="Top Reasons" data={topReasons} color="#2563EB" category="reason" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <MiniTable title="Top Sub-Reasons" data={topSubReasons} color="#6C47FF" category="subReason" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <MiniTable title="Top Root Causes" data={topRootCauses} color="#DB2777" category="rootCause" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <MiniTable title="Top Owners" data={topOwners} color="#2563EB" category="responsible" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <MiniTable title="ITN Related" data={topITN} color="#D97706" category="itnRelated" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <MiniTable title="Subscription Related" data={topSubRel} color="#8bc34a" category="relatedToSubscription" />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Box>
      </Box>

      {/* Search and Export Bar */}
      <Box sx={{
        backgroundColor: 'var(--surface)',
        p: 2,
        borderRadius: '8px',
        border: '1px solid var(--border)',
        mb: 2,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'center',
        overflowX: 'auto',
        overflowY: 'hidden',
        '&::-webkit-scrollbar': { height: '4px' },
        '&::-webkit-scrollbar-track': { background: 'var(--surface)' },
        '&::-webkit-scrollbar-thumb': { background: 'var(--border-strong)', borderRadius: '4px' }
      }}>
        {/* Date Filters Merged */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
          <Typography variant="caption" sx={{ fontWeight: '600', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
              borderRadius: "10px",
              textTransform: 'none',
              fontSize: '0.72rem',
              fontWeight: 600,
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
              '&:hover': { borderColor: 'var(--accent)', backgroundColor: 'rgba(108, 71, 255, 0.08)' },
              '&.MuiButton-contained': {
                backgroundColor: 'var(--accent)',
                color: 'var(--on-accent)',
                '&:hover': { backgroundColor: 'var(--accent-hover)' }
              }
            }
          }}>
            <Button onClick={() => {
              const range = getCustomWeekRange(new Date(), settings);
              setDateFilter({ ...range, type: 'thisWeek' });
              setTempStartDate(range.start);
              setTempEndDate(range.end);
            }} variant={dateFilter.type === 'thisWeek' ? 'contained' : 'outlined'} size="small">This Week</Button>
            <Button onClick={() => {
              const range = getCustomWeekRange(subWeeks(new Date(), 1), settings);
              setDateFilter({ ...range, type: 'lastWeek' });
              setTempStartDate(range.start);
              setTempEndDate(range.end);
            }} variant={dateFilter.type === 'lastWeek' ? 'contained' : 'outlined'} size="small">Last Week</Button>
            <Button onClick={() => {
              const start = startOfMonth(subMonths(new Date(), 1));
              const end = endOfMonth(subMonths(new Date(), 1));
              setDateFilter({ start, end, type: 'lastMonth' });
              setTempStartDate(start);
              setTempEndDate(end);
            }} variant={dateFilter.type === 'lastMonth' ? 'contained' : 'outlined'} size="small">Last Month</Button>
            <Button onClick={() => {
              const start = startOfMonth(new Date());
              const end = endOfMonth(new Date());
              setDateFilter({ start, end, type: 'thisMonth' });
              setTempStartDate(start);
              setTempEndDate(end);
            }} variant={dateFilter.type === 'thisMonth' ? 'contained' : 'outlined'} size="small">This Month</Button>
            <Button onClick={() => {
              setDateFilter({ start: null, end: null, type: 'all' });
              setTempStartDate(null);
              setTempEndDate(null);
            }} variant={dateFilter.type === 'all' ? 'contained' : 'outlined'} size="small">All Time</Button>
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
                      width: 140,
                      '& .MuiInputBase-root': {
                        fontSize: '0.75rem',
                        backgroundColor: 'var(--surface)',
                        borderRadius: "10px",
                        color: 'var(--text)'
                      },
                      '& .MuiInputLabel-root': { fontSize: '0.75rem', color: 'var(--text-secondary)' },
                      '& .MuiOutlinedInput-notchedOutline': { border: '1px solid var(--border)' }
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
                      width: 140,
                      '& .MuiInputBase-root': {
                        fontSize: '0.75rem',
                        backgroundColor: 'var(--surface)',
                        borderRadius: "10px",
                        color: 'var(--text)'
                      },
                      '& .MuiInputLabel-root': { fontSize: '0.75rem', color: 'var(--text-secondary)' },
                      '& .MuiOutlinedInput-notchedOutline': { border: '1px solid var(--border)' }
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
                sx={{ flexShrink: 0, fontSize: '0.75rem', '&:hover': { backgroundColor: 'var(--accent-hover)' } }}
              >
                Apply
              </Button>
            </Box>
          </LocalizationProvider>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: 'var(--border)' }} />

        {/* Dedicated Cumulative & Escalation Analysis Date Filter Bar */}
        <Box sx={{
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          flexShrink: 0,
          p: 0.5,
          px: 1.2,
          borderRadius: "10px",
          backgroundColor: 'var(--surface-subtle)',
          border: '1px solid var(--border)'
        }}>
          <Typography variant="caption" sx={{ fontWeight: '600', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}>
            <MdHistory /> Cumulative Benchmark:
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
              borderRadius: '10px',
              textTransform: 'none',
              fontSize: '0.72rem',
              fontWeight: 600,
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
              '&:hover': { borderColor: 'var(--accent-text)', backgroundColor: 'var(--accent-subtle)' },
              '&.MuiButton-contained': {
                backgroundColor: 'var(--accent)',
                color: 'var(--on-accent)',
                '&:hover': { backgroundColor: 'var(--accent-hover)' }
              }
            }
          }}>
            <Button onClick={() => {
              const start = new Date(2026, 5, 1);
              const end = new Date();
              setCumulativeDateFilter({ start, end, type: 'default' });
              setTempAccStartDate(start);
              setTempAccEndDate(end);
            }} variant={CumulativeDateFilter.type === 'default' ? 'contained' : 'outlined'} size="small">
              From 01/06/2026 (Default)
            </Button>
            <Button onClick={() => {
              const start = new Date(2026, 5, 1);
              const end = new Date(2026, 5, 30, 23, 59, 59);
              setCumulativeDateFilter({ start, end, type: 'jun2026' });
              setTempAccStartDate(start);
              setTempAccEndDate(end);
            }} variant={CumulativeDateFilter.type === 'jun2026' ? 'contained' : 'outlined'} size="small">
              Jun 2026
            </Button>
            <Button onClick={() => {
              const start = new Date(2026, 6, 1);
              const end = new Date(2026, 6, 31, 23, 59, 59);
              setCumulativeDateFilter({ start, end, type: 'jul2026' });
              setTempAccStartDate(start);
              setTempAccEndDate(end);
            }} variant={CumulativeDateFilter.type === 'jul2026' ? 'contained' : 'outlined'} size="small">
              Jul 2026
            </Button>
            <Button onClick={() => {
              const start = new Date(2026, 7, 1);
              const end = new Date(2026, 7, 31, 23, 59, 59);
              setCumulativeDateFilter({ start, end, type: 'aug2026' });
              setTempAccStartDate(start);
              setTempAccEndDate(end);
            }} variant={CumulativeDateFilter.type === 'aug2026' ? 'contained' : 'outlined'} size="small">
              Aug 2026
            </Button>
          </Box>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
              <DatePicker
                label="Acc. Start"
                value={tempAccStartDate}
                onChange={(v) => setTempAccStartDate(v)}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: {
                      width: 140,
                      '& .MuiInputBase-root': {
                        fontSize: '0.75rem',
                        backgroundColor: 'var(--surface)',
                        borderRadius: '10px',
                        color: 'var(--text)'
                      },
                      '& .MuiInputLabel-root': { fontSize: '0.75rem', color: 'var(--accent-text)' },
                      '& .MuiOutlinedInput-notchedOutline': { border: '1px solid var(--border)' }
                    }
                  }
                }}
              />
              <DatePicker
                label="Acc. End"
                value={tempAccEndDate}
                onChange={(v) => setTempAccEndDate(v)}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: {
                      width: 140,
                      '& .MuiInputBase-root': {
                        fontSize: '0.75rem',
                        backgroundColor: 'var(--surface)',
                        borderRadius: '10px',
                        color: 'var(--text)'
                      },
                      '& .MuiInputLabel-root': { fontSize: '0.75rem', color: 'var(--accent-text)' },
                      '& .MuiOutlinedInput-notchedOutline': { border: '1px solid var(--border)' }
                    }
                  }
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  setCumulativeDateFilter({ start: tempAccStartDate, end: tempAccEndDate, type: 'custom' });
                }}
                sx={{ flexShrink: 0, fontSize: '0.75rem', '&:hover': { backgroundColor: 'var(--accent-hover)' } }}
              >
                Apply Acc.
              </Button>
            </Box>
          </LocalizationProvider>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: 'var(--border)' }} />
        <Tooltip title="Refresh data">
          <IconButton
            onClick={() => setUpdateRefetchTasks(prev => !prev)}
            disabled={loading}
            sx={{
              color: 'var(--accent-text)',
              '&:hover': { backgroundColor: 'rgba(108, 71, 255, 0.08)' }
            }}
          >
            <MdRefresh className={loading ? 'animate-spin' : ''} />
          </IconButton>
        </Tooltip>


        <FormControl size="small" sx={{ minWidth: isMobile ? undefined : 120, width: isMobile ? '100%' : undefined }}>
          <InputLabel id="filter-select-label" sx={{ color: 'var(--text-secondary)' }}>
            Eval Score
          </InputLabel>
          <Select
            labelId="filter-select-label"
            id="filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            label="Filter"
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
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
          <InputLabel id="priority-filter-label" sx={{ color: 'var(--text-secondary)' }}>
            Feedback Severity
          </InputLabel>
          <Select
            labelId="priority-filter-label"
            id="priority-filter"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            label="Feedback Severity"
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
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
          <InputLabel id="status-filter-label" sx={{ color: 'var(--text-secondary)' }}>
            Task Status
          </InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Task Status"
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
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
                <MdError style={{ color: '#D97706' }} />
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
                <MdCheckCircle style={{ color: '#16A34A' }} />
                <span>Closed</span>
              </Box>
            </MenuItem>
            <MenuItem value="Completed">
              <Box display="flex" alignItems="center" gap={1}>
                <MdCheckCircle style={{ color: '#16A34A' }} />
                <span>Completed</span>
              </Box>
            </MenuItem>

          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: isMobile ? undefined : 120, width: isMobile ? '100%' : undefined }}>
          <InputLabel id="governorate-filter-label" sx={{ color: 'var(--text-secondary)' }}>
            Governorate
          </InputLabel>
          <Select
            labelId="governorate-filter-label"
            id="governorate-filter"
            value={governorateFilter}
            onChange={(e) => setGovernorateFilter(e.target.value)}
            label="Governorate"
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
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
          <InputLabel id="district-filter-label" sx={{ color: 'var(--text-secondary)' }}>
            District
          </InputLabel>
          <Select
            labelId="district-filter-label"
            id="district-filter"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            label="District"
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
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
          <InputLabel id="subcon-filter-label" sx={{ color: 'var(--text-secondary)' }}>
            Subcon
          </InputLabel>
          <Select
            labelId="subcon-filter-label"
            id="subcon-filter"
            value={subconFilter}
            onChange={(e) => setSubconFilter(e.target.value)}
            label="Subcon"
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
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
          <InputLabel id="supervisor-filter-label" sx={{ color: 'var(--text-secondary)' }}>
            Supervisor
          </InputLabel>
          <Select
            labelId="supervisor-filter-label"
            id="supervisor-filter"
            value={supervisorFilter}
            onChange={(e) => setSupervisorFilter(e.target.value)}
            label="Supervisor"
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
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
                  borderRadius: "10px",
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  '& fieldset': { border: 'none' },
                  '&:hover fieldset': { border: '1px solid var(--text-muted) !important' },
                  '&.Mui-focused fieldset': { border: '1px solid var(--accent) !important' },
                },
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiSvgIcon-root': { color: 'var(--text)' }
              }}
            />
          )}
          slotProps={{
            paper: {
              sx: {
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
              }
            }
          }}
        />

        <FormControl size="small" sx={{ minWidth: isMobile ? undefined : 120, width: isMobile ? '100%' : undefined }}>
          <InputLabel id="validation-filter-label" sx={{ color: 'var(--text-secondary)' }}>
            Validation
          </InputLabel>
          <Select
            labelId="validation-filter-label"
            id="validation-filter"
            value={validationFilter}
            onChange={(e) => setValidationFilter(e.target.value)}
            label="Validation"
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
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
            variant={activeAdvSearch ? "contained" : "outlined"}
            startIcon={<MdSearch />}
            onClick={() => setAdvancedSearchOpen(true)}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {activeAdvSearch ? "Advanced filters on" : "Advanced search"}
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
                color: '#DC2626',
                fontWeight: '600',
                '&:hover': { bgcolor: 'rgba(220, 38, 38, 0.08)' }
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
                borderColor: 'var(--border)',
                color: '#2563EB',
                '&:hover': {
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  borderColor: 'var(--text-muted)',
                },
                textTransform: 'none',
                borderRadius: "10px",
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
                  borderColor: 'var(--border)',
                  color: '#16A34A',
                  '&:hover': {
                    backgroundColor: 'rgba(22, 163, 74, 0.08)',
                    borderColor: 'var(--text-muted)',
                  },
                  textTransform: 'none',
                  borderRadius: "10px",
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
      <Box sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        mb: 1,
        p: 1,
        borderRadius: 2,
        backgroundColor: 'var(--overlay-subtle)',
        border: '1px solid var(--border)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
          <Typography variant="subtitle2" sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Status Summary:</Typography>
        </Box>
        {[{
          label: 'Closed',
          count: closedCount,
          color: '#16A34A'
        }, {
          label: 'In Progress',
          count: inProgressCount,
          color: '#2563EB'
        }, {
          label: 'Todo',
          count: todoCount,
          color: '#ffb300'
        }].map((item) => (
          <Box
            key={item.label}
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 2,
              py: 0.75,
              borderRadius: 2,
              bgcolor: 'var(--overlay-subtle)',
              border: `1px solid ${item.color}33`,
              minWidth: 120,
              justifyContent: 'space-between'
            }}
          >
            <Typography variant="body2" sx={{ color: 'var(--text)', fontWeight: 600 }}>{item.label}</Typography>
            <Typography variant="subtitle2" sx={{ color: item.color, fontWeight: 600 }}>{item.count}</Typography>
          </Box>
        ))}
      </Box>
      <TableContainer component={Paper} onClick={handleTableContainerClick}
        sx={{
          mt: 2,
          maxWidth: '100%',
          overflowX: 'auto',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '0px',
          "& .MuiTable-root": {
            backgroundColor: "var(--surface)",
          },
          "& .MuiTableHead-root": {
            backgroundColor: "var(--surface)",
            "& .MuiTableCell-root": {
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              fontWeight: "600",
              borderBottom: "1px solid var(--border)",
            }
          },
          "& .MuiTableBody-root": {
            "& .MuiTableCell-root": {
              borderBottom: "1px solid var(--border)",
              color: "var(--text)",
            },
            // "& .MuiTableRow-root": {
            //   backgroundColor: "var(--surface)",
            //   "&:hover": {
            //     backgroundColor: "var(--surface)",
            //   },
            // }
          },
          "&::-webkit-scrollbar": {
            width: "8px",
            height: "8px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "var(--text-muted)",
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
            <TableRow sx={{ backgroundColor: 'var(--overlay-subtle)' }}>
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
                            color: 'var(--text)',
                            backgroundColor: 'var(--overlay-subtle)',
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
                            color: 'var(--text)',
                            backgroundColor: 'var(--overlay-subtle)',
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
                            color: 'var(--text)',
                            backgroundColor: 'var(--overlay-subtle)',
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
                          ? 'rgba(108, 71, 255, 0.15) !important'
                          : task.readBy?.includes(user?._id)
                            ? '#f0f0f0'
                            : '#ffffff',
                        transition: '0.2s',
                        borderLeft: task.readBy?.includes(user?._id) ? '6px solid #6C47FF' : '6px solid transparent',
                        '&:hover': { backgroundColor: '#f5f5f5' }
                      }}
                    >
                      <TableCell style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" flexDirection="column" gap={0.5}>
                          <Typography variant="body2" sx={{ fontWeight: '600' }}>{task.slid || "-"}</Typography>
                          <Typography variant="caption" sx={{ color: 'var(--accent-text)', fontWeight: '600' }}>
                            REQ: {task.requestNumber || "-"}
                          </Typography>
                          {task.validationStatus === 'Validated' ? (
                            <Chip
                              label="Validated"
                              size="small"
                              icon={<MdCheckCircle style={{ color: 'var(--text)' }} />}
                              sx={{
                                backgroundColor: '#16A34A',
                                color: 'var(--text)',
                                height: '20px',
                                fontSize: '0.65rem',
                                '& .MuiChip-icon': { fontSize: '14px' }
                              }}
                            />
                          ) : task.validationStatus === 'Not validated' ? (
                            <Chip
                              label="Not Validated"
                              size="small"
                              icon={<MdError style={{ color: 'var(--text)' }} />}
                              sx={{
                                backgroundColor: '#D97706',
                                color: 'var(--text)',
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
                          <Typography fontWeight={600} sx={{ direction: 'rtl', textAlign: 'right', fontSize: '0.85rem' }}>
                            {task.customerName || task.customer?.customerName || "-"}
                          </Typography>
                          <Typography variant="caption" color="primary" sx={{ fontSize: '0.7rem' }}>
                            {task.customerType || "-"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: '600' }}>
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
                                        color: 'var(--accent-text)',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
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
                              return <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>-</Typography>;
                            })()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#2563EB' }}>
                          {task.operation || task.technicalDetails?.operation || "-"}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: '#6C47FF', fontWeight: '600' }}>
                          {task.tarrifName || "-"}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">{task.category}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={task.priority || "Normal"}
                          size="small"
                          sx={{
                            fontWeight: '600',
                            fontSize: '0.7rem',
                            height: '24px',
                            backgroundColor: task.priority === 'High' ? 'rgba(220, 38, 38, 0.15)' :
                              task.priority === 'Medium' ? 'rgba(217, 119, 6, 0.15)' :
                                task.priority === 'Low' ? 'rgba(22, 163, 74, 0.15)' : 'var(--overlay-subtle)',
                            color: task.priority === 'High' ? '#DC2626' :
                              task.priority === 'Medium' ? '#D97706' :
                                task.priority === 'Low' ? '#16A34A' : 'var(--text)',
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
                            fontWeight: 600,
                            borderRadius: '6px',
                            bgcolor: (task.status === 'Closed' || task.status === 'Completed') ? 'rgba(22, 163, 74, 0.15)' :
                              task.status === 'In Progress' ? 'rgba(37, 99, 235, 0.15)' : 'var(--overlay-subtle)',
                            color: (task.status === 'Closed' || task.status === 'Completed') ? '#16A34A' :
                              task.status === 'In Progress' ? '#2563EB' : 'var(--text)',
                            border: '1px solid',
                            borderColor: 'divider'
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: '600' }}>
                            {task.governorate || "-"}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {task.district || "-"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: '600', color: 'var(--accent-text)' }}>
                            {task.teamName || "-"}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: '600', color: 'text.secondary' }}>
                            {task.teamCompany || "-"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ fontWeight: '600' }}>
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
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#DC2626', fontSize: '0.8rem' }}>
                          {Array.isArray(task.rootCause) ? task.rootCause.join(", ") : (task.rootCause || task.technicalDetails?.rootCause || "-")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: '600', fontSize: '0.7rem', color: 'var(--accent-text)' }}>
                          {Array.isArray(task.responsible) ? task.responsible.join(", ") : (task.responsible || "-")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={Array.isArray(task.itnRelated) ? task.itnRelated.join(", ") : (task.itnRelated || "-")}
                          size="small"
                          sx={{
                            fontWeight: '600',
                            fontSize: '0.7rem',
                            bgcolor: (Array.isArray(task.itnRelated) && task.itnRelated.includes('Yes')) || task.itnRelated === 'Yes' ? 'rgba(22, 163, 74, 0.15)' : 'var(--overlay-subtle)',
                            color: (Array.isArray(task.itnRelated) && task.itnRelated.includes('Yes')) || task.itnRelated === 'Yes' ? '#16A34A' : 'var(--text)',
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
                            fontWeight: '600',
                            fontSize: '0.7rem',
                            bgcolor: task.gaiaCheck === 'Yes' ? 'rgba(22, 163, 74, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                            color: task.gaiaCheck === 'Yes' ? '#16A34A' : '#DC2626',
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
                                color: 'var(--accent-text)',
                                fontSize: '0.75rem',
                                fontWeight: '600',
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
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem' }}>
                              {task.latestGaia?.transactionType || "-"}
                            </Typography>
                          </Tooltip>
                          <Tooltip title={dropdownOptions['TRANSACTION_STATE']?.find(opt => opt.value === task.latestGaia?.transactionState)?.label || task.latestGaia?.transactionState || "N/A"}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mt: -0.5, fontSize: '0.7rem' }}>
                              {task.latestGaia?.transactionState || "-"}
                            </Typography>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={dropdownOptions['UNF_REASON_CODE']?.find(opt => opt.value === task.latestGaia?.unfReasonCode)?.label || task.latestGaia?.unfReasonCode || "N/A"}>
                          <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 600, fontSize: '0.8rem' }}>
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
                            borderColor: 'var(--accent)',
                            color: 'var(--accent-text)',
                            '&:hover': {
                              borderColor: 'var(--accent-hover)',
                              backgroundColor: 'rgba(108, 71, 255, 0.08)'
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
                                color: task.readBy?.includes(user?._id) ? '#6C47FF' : '#b0b0b0',
                                '&:hover': {
                                  color: task.readBy?.includes(user?._id) ? 'var(--accent-hover)' : '#6C47FF'
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
                                color: isFavorited ? '#D97706' : '#6b7280',
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
                                color: '#16A34A',
                                '&:hover': { color: '#16A34A' }
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
                              sx={{ color: 'var(--accent-text)' }}
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
                                    sx={{ color: '#D97706' }}
                                  >
                                    <MdEdit />
                                  </IconButton>
                                </Tooltip>
                                {user?.role === 'Admin' && <Tooltip title="Delete permanently…">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTaskToDelete(task);
                                      setDeleteDialogOpen(true);
                                    }}
                                    sx={{ color: '#DC2626' }}
                                  >
                                    <MdDelete />
                                  </IconButton>
                                </Tooltip>}
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
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'var(--text)' }}>
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
          color: 'var(--text)',
        },
        '& .MuiTablePagination-selectIcon': {
          color: 'var(--text)',
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
            // borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            display: 'flex',
            justifyContent: 'flex-start',
            width: '100%',
            color: 'var(--text)',
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              color: 'var(--text)',
              marginBottom: 0
            },
            '& .MuiSelect-select, & .MuiInputBase-root': {
              color: 'var(--text)',
            },
            '& .MuiSvgIcon-root': {
              color: 'var(--text)',
            },
            '& .MuiButtonBase-root': {
              color: 'var(--text)',
              '&:disabled': {
                color: 'var(--text-muted)'
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
      <AppDialog
        open={drillDownState.open}
        onClose={() => setDrillDownState(prev => ({ ...prev, open: false }))}
        size="xl"
        title="Tasks in this breakdown"
        description={`${drillDownState.title} · ${drillDownState.tasks.length} task${drillDownState.tasks.length === 1 ? '' : 's'}`}
        actions={<Button variant="outlined" onClick={() => setDrillDownState(prev => ({ ...prev, open: false }))}>Close</Button>}
        bodySx={{ p: 0 }}
      >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'var(--overlay-subtle)' }}>
                  <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.75rem' }}>Date</TableCell>
                  <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.75rem' }}>Week</TableCell>
                  <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.75rem' }}>SLID</TableCell>
                  <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.75rem' }}>Customer</TableCell>
                  <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.75rem' }}>Verbatim</TableCell>
                  <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.75rem' }}>Reason</TableCell>
                  <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.75rem' }}>Root Cause</TableCell>
                  <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.75rem' }}>Team Name</TableCell>
                  <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.75rem' }}>Owner</TableCell>
                  <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.75rem' }}>Score</TableCell>
                  <TableCell sx={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.75rem' }} align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {drillDownState.tasks.map((task) => (
                  <TableRow key={task._id}>
                    <TableCell sx={{ color: 'var(--text)', fontSize: '0.8rem' }}>
                      {task.interviewDate ? format(new Date(task.interviewDate), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell sx={{ color: 'var(--text)', fontSize: '0.8rem' }}>
                      {task.interviewDate ? getWeekDisplay(task.interviewDate) : '-'}
                    </TableCell>
                    <TableCell sx={{ color: 'var(--text)', fontSize: '0.8rem', fontWeight: '600' }}>{task.slid}</TableCell>
                    <TableCell sx={{ color: 'var(--text)', fontSize: '0.8rem' }}>{task.customerName}</TableCell>
                    <TableCell sx={{ color: 'var(--text-secondary)', fontSize: '0.75rem', maxWidth: 280, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {task.customerFeedback || task.feedback || task.verbatim || '-'}
                    </TableCell>
                    <TableCell sx={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      {Array.isArray(task.reason) ? task.reason.join(', ') : task.reason || '-'}
                    </TableCell>
                    <TableCell sx={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      {Array.isArray(task.rootCause) ? task.rootCause.join(', ') : task.rootCause || task.technicalDetails?.rootCause || '-'}
                    </TableCell>
                    <TableCell sx={{ color: 'var(--text)', fontSize: '0.8rem' }}>{task.teamName || '-'}</TableCell>
                    <TableCell sx={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
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
                            fontWeight: '600',
                            bgcolor: task.evaluationScore >= 9 ? 'rgba(22, 163, 74, 0.2)' :
                              task.evaluationScore >= 7 ? 'rgba(217, 119, 6, 0.2)' : 'rgba(220, 38, 38, 0.2)',
                            color: task.evaluationScore >= 9 ? '#16A34A' :
                              task.evaluationScore >= 7 ? '#D97706' : '#DC2626'
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
                          color: 'var(--accent-text)',
                          fontWeight: '600',
                          '&:hover': { bgcolor: alpha('#6C47FF', 0.1) }
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
      </AppDialog>

      {/* Permanent delete: backup export + typed confirmation */}
      <SafeDeleteDialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setTaskToDelete(null); }}
        records={taskToDelete ? [taskToDelete] : []}
        noun={{ one: 'task', many: 'tasks' }}
        nameOf={(t) => [t.slid, t.customerName].filter(Boolean).join(' · ')}
        exportColumns={TASK_COLUMNS}
        exportFilename="dvoc-task"
        onDelete={(list) => bulkDelete(DELETE_PATHS.tasks, list.map((t) => t._id))}
        onDeleted={({ deleted }) => {
          setAllTasks((prev) => prev.filter((t) => !deleted.includes(t._id)));
          window.dispatchEvent(new CustomEvent('dashboard-refresh'));
        }}
      />

      {/* Add Task Dialog */}
      <AddTask
        open={openAddTask}
        setOpen={setOpenAddTask}
        setUpdateRefetchTasks={() => setUpdateRefetchTasks(prev => prev + 1)}
      />
      {/* Read More Dialog */}
      <AppDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={dialogTitle}
        actions={<Button variant="outlined" onClick={() => setDialogOpen(false)}>Close</Button>}
      >
        <Typography dir={dialogTitle === "GAIA Content" ? 'ltr' : 'rtl'} sx={{ whiteSpace: 'pre-wrap', fontSize: 13.5 }}>
          {dialogContent || "No content available."}
        </Typography>
      </AppDialog>

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
