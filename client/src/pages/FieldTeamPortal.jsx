import { useState, useEffect, useMemo } from "react";
import { alpha } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box, Typography, TextField, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, Chip, Card, CardContent,
  TablePagination, Autocomplete, Tabs, Tab, useMediaQuery, Button, Divider,
  Grid, FormControl, Select, MenuItem, LinearProgress, Stack, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, TableSortLabel,
  InputLabel, Collapse, Pagination, Badge, Avatar,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip as MuiTooltip
} from "@mui/material";
import {
  ArrowBack, Quiz, Assignment, BarChart as BarChartIconMUI, SupportAgent,
  Warning, CheckCircle, Schedule, Info, PriorityHigh, Assessment, Timeline,
  Leaderboard as LeaderboardIcon, Close as CloseIcon, TrendingUp, TrendingDown,
  TrendingFlat, PieChart as PieChartIcon, CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon, PictureAsPdf as PictureAsPdfIcon, TableChart as TableChartIcon,
  Search as SearchIcon, FilterList as FilterListIcon, CalendarToday as CalendarTodayIcon,
  Event as EventIcon, Update as UpdateIcon, Visibility as VisibilityIcon
} from '@mui/icons-material';
import moment from "moment";
import { subDays, isAfter, format } from 'date-fns';
import { generateWeekRanges, getWeekNumber, getMonthNumber, generateMonthRanges } from "../utils/helpers";
import api from "../api/api";
import {
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart as RechartsPieChart,
  Pie as RechartsPie,
  XAxis,
  YAxis,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend as RechartsLegend,
  LineChart,
  Line
} from 'recharts';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  TimeScale
} from 'chart.js';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Bar, Doughnut } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { FaCheckCircle, FaExclamationCircle, FaClipboardList, FaChartLine, FaFilter, FaSearch, FaTimes, FaCalendarAlt, FaUserTie, FaFileExcel, FaFileExport, FaEnvelope } from 'react-icons/fa';
import { MdInsights } from 'react-icons/md';
import ViewIssueDetailsDialog from "../components/ViewIssueDetailsDialog";
import { TaskDetailsDialog } from "../components/TaskDetailsDialog";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  TimeScale
);

import * as XLSX from 'xlsx';
import FieldTeamTicketsForPortalReview from "../components/FieldTeamTicketsForPortalReview";


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
          {percentage ? percentage.toFixed(0) : 0}%
        </Typography>
      </Box>
      <Typography variant="caption" color="#64748b">
        {count} of {total} tasks
      </Typography>
    </CardContent>
  </Card>
);

// --- Compact Data Table Helper ---
const CompactDataTable = ({ data, total }) => (
  <TableContainer sx={{
    mt: 2,
    maxHeight: 200,
    overflowY: 'auto',
    '&::-webkit-scrollbar': { width: '4px' },
    '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }
  }}>
    <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' } }}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Category Item</TableCell>
          <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Count</TableCell>
          <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>%</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((row, i) => (
          <TableRow key={i} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
            <TableCell sx={{ color: '#e2e8f0' }}>{row.name}</TableCell>
            <TableCell align="right" sx={{ color: '#e2e8f0', fontWeight: 'bold' }}>{row.value}</TableCell>
            <TableCell align="right" sx={{ color: '#94a3b8' }}>{((row.value / total) * 100).toFixed(1)}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

const FieldTeamPortal = () => {
  // const user = useSelector((state) => state?.auth?.user);
  const { teamId } = useParams();
  const navigate = useNavigate();

  // Field Teams state
  const [fieldTeams, setFieldTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  // console.log({ selectedTeam });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Quiz results state
  const [quizResults, setQuizResults] = useState([]);
  const [quizPage, setQuizPage] = useState(0);
  const [quizRowsPerPage, setQuizRowsPerPage] = useState(10);

  // On-the-job assessments state
  const [jobAssessments, setJobAssessments] = useState([]);
  const [jobPage, setJobPage] = useState(0);
  const [jobRowsPerPage, setJobRowsPerPage] = useState(10);

  // Lab assessments state
  const [labAssessments, setLabAssessments] = useState([]);
  const [labPage, setLabPage] = useState(0);
  const [labRowsPerPage, setLabRowsPerPage] = useState(10);

  // Navigation and UI state
  const [activeTab, setActiveTab] = useState(0);
  const [generatingReport, setGeneratingReport] = useState(false);
  const isMobile = useMediaQuery('(max-width:600px)');
  const isMedium = useMediaQuery('(max-width:960px)');

  // Drill-down state
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownItems, setDrillDownItems] = useState([]);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [drillDownType, setDrillDownType] = useState('issue'); // 'issue', 'task', 'mixed'
  const [drillDownTab, setDrillDownTab] = useState('tasks'); // 'tasks', 'issues'

  // View Issue Details State
  const [selectedDetailIssue, setSelectedDetailIssue] = useState(null);
  const [detailIssueOpen, setDetailIssueOpen] = useState(false);

  // Customer Issues state
  const [customerIssues, setCustomerIssues] = useState([]);
  const [technicalTasks, setTechnicalTasks] = useState([]);
  const [issuesPage, setIssuesPage] = useState(0);
  const [issuesRowsPerPage, setIssuesRowsPerPage] = useState(10);

  // Cross-team data for Leaderboard
  const [allTechnicalTasksGlobal, setAllTechnicalTasksGlobal] = useState([]);
  const [allCustomerIssuesGlobal, setAllCustomerIssuesGlobal] = useState([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  // Leaderboard 'Magic Table' state
  const [leaderboardSearchQuery, setLeaderboardSearchQuery] = useState('');
  const [leaderboardStatusQuery, setLeaderboardStatusQuery] = useState('all');
  const [selectedLeaderboardDetail, setSelectedLeaderboardDetail] = useState(null);
  const [leaderboardDialogOpen, setLeaderboardDialogOpen] = useState(false);
  const [chartDialog, setChartDialog] = useState({ open: false, title: '', data: [], type: 'area', stackKeys: [] });
  const [leaderboardPage, setLeaderboardPage] = useState(0);
  const [leaderboardRowsPerPage, setLeaderboardRowsPerPage] = useState(10);
  const [leaderboardSort, setLeaderboardSort] = useState({ field: 'totalPoints', direction: 'desc' });
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [leaderboardDateFilter, setLeaderboardDateFilter] = useState({ start: '', end: '' });
  const [leaderboardThresholds, setLeaderboardThresholds] = useState({ minIssues: '', minSuccessRate: '' });

  // NEW: State for Global Analytics Tab
  const [globalTab, setGlobalTab] = useState(0);
  const [analyticsSubTab, setAnalyticsSubTab] = useState(0); // 0: All, 1: Detractors, 2: Neutrals
  const [offendersPage, setOffendersPage] = useState(1);

  // Analytics Drill-Down State
  const [analyticsDrillDown, setAnalyticsDrillDown] = useState({
    open: false,
    title: '',
    tasks: []
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Updated Premium Colors & Glassmorphism Theme
  const colors = {
    background: '#121212', // Deep dark background
    surface: 'rgba(30, 30, 30, 0.6)', // Glassy surface
    surfaceElevated: 'rgba(255, 255, 255, 0.05)', // Lighter glass
    border: 'rgba(255, 255, 255, 0.12)',
    primary: '#8b5cf6', // Vivid Violet
    primaryGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    secondary: '#10b981', // Emerald
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    chartGrid: 'rgba(255, 255, 255, 0.05)',
    glass: {
      background: 'rgba(30, 30, 30, 0.7)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    }
  };

  // --- Global Analytics Time Filtering State ---
  const [timeFilterMode, setTimeFilterMode] = useState('all'); // 'all', 'days', 'weeks', 'months', 'custom'
  const [recentDaysValue, setRecentDaysValue] = useState(70);
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [weekRanges, setWeekRanges] = useState([]);
  const [monthOptions, setMonthOptions] = useState([]);
  const [settings, setSettings] = useState(null);

  const glassCardProps = {
    sx: {
      ...colors.glass,
      borderRadius: '24px',
      color: colors.textPrimary,
      overflow: 'hidden',
      transition: 'all 0.3s ease-in-out',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
        border: `1px solid ${colors.primary}50`
      }
    }
  };

  // --- Customer Issues Alignment State ---
  const [trendTimeframe, setTrendTimeframe] = useState('day');
  const [trendChartType, setTrendChartType] = useState('mixed');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  // --- Statistics Calculation (Ported from CustomerIssuesAnalytics.jsx) ---
  const filteredIssuesByDate = useMemo(() => {
    return customerIssues.filter(issue => {
      // 1. Team filter: Only include issues belonging to the selected team
      if (selectedTeam) {
        const teamName = selectedTeam.teamName?.toLowerCase();
        const installingTeam = issue.installingTeam?.toLowerCase();
        const assignedTo = issue.assignedTo?.toLowerCase();

        // Check if either field matches the selected team name
        if (installingTeam !== teamName && assignedTo !== teamName) {
          return false;
        }
      }

      // 2. Date filter
      if (!dateFilter.start && !dateFilter.end) return true;
      const reportDate = new Date(issue.date || issue.createdAt);
      const start = dateFilter.start ? new Date(dateFilter.start) : null;
      const end = dateFilter.end ? new Date(dateFilter.end) : null;
      if (start && reportDate < start) return false;
      if (end) {
        const endDay = new Date(end);
        endDay.setHours(23, 59, 59, 999);
        if (reportDate > endDay) return false;
      }
      return true;
    });
  }, [customerIssues, dateFilter, selectedTeam]);

  // Fetch Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get("/settings");
        setSettings(response.data);
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, []);

  // Update Week/Month Options when tasks or settings change
  useEffect(() => {
    if (Array.isArray(allTechnicalTasksGlobal) && allTechnicalTasksGlobal.length > 0 && settings) {
      const weeks = generateWeekRanges(allTechnicalTasksGlobal, settings);
      setWeekRanges(weeks.filter(r => /Wk-\d+ \(\d+\)/.test(r)).reverse());

      const months = generateMonthRanges(allTechnicalTasksGlobal, settings);
      setMonthOptions(months);
    }
  }, [allTechnicalTasksGlobal, settings]);

  // --- NEW: Global Analytics Logic ---
  const globalAnalytics = useMemo(() => {
    // 1. Time Filtering
    const techTasks = Array.isArray(allTechnicalTasksGlobal) ? allTechnicalTasksGlobal : [];
    let timeFiltered = techTasks;
    if (timeFilterMode === 'days') {
      const cutoff = subDays(new Date(), recentDaysValue);
      timeFiltered = techTasks.filter(t => t.interviewDate && isAfter(new Date(t.interviewDate), cutoff));
    } else if (timeFilterMode === 'weeks' && selectedWeeks.length > 0) {
      timeFiltered = techTasks.filter(t => {
        if (!t.interviewDate) return false;
        const { key } = getWeekNumber(t.interviewDate, settings?.weekStartDay, settings?.week1StartDate, settings?.week1EndDate, settings?.startWeekNumber);
        return selectedWeeks.includes(key);
      });
    } else if (timeFilterMode === 'months' && selectedMonths.length > 0) {
      timeFiltered = techTasks.filter(t => {
        if (!t.interviewDate) return false;
        const monthInfo = getMonthNumber(t.interviewDate, settings);
        return monthInfo && selectedMonths.includes(monthInfo.key);
      });
    } else if (timeFilterMode === 'custom' && customDateRange.start && customDateRange.end) {
      const start = new Date(customDateRange.start);
      const end = new Date(customDateRange.end);
      end.setHours(23, 59, 59, 999);
      timeFiltered = techTasks.filter(t => {
        const d = new Date(t.interviewDate || t.createdAt);
        return d >= start && d <= end;
      });
    }

    // 2. Sub-tab Filtering (All/Detractors/Neutrals)
    let tasksToProcess = timeFiltered;
    if (analyticsSubTab === 1) { // Detractors
      tasksToProcess = timeFiltered.filter(t => {
        let score = t.evaluationScore;
        if (score && score > 0) {
          if (score <= 10) score = score * 10;
          return score <= 60;
        }
        return false;
      });
    } else if (analyticsSubTab === 2) { // Neutrals
      tasksToProcess = timeFiltered.filter(t => {
        let score = t.evaluationScore;
        if (score && score > 0) {
          if (score <= 10) score = score * 10;
          return score > 60 && score <= 80;
        }
        return false;
      });
    }

    const stats = {
      byOwner: {},
      byReason: {},
      bySubReason: {},
      byRootCause: {},
      byFieldTeam: {},
      fieldTeamDetails: {},
      contributionMatrix: {}, // Owner vs Reason
      rootCauseMatrix: {},    // Owner vs Root Cause
      sentiment: { Promoter: 0, Neutral: 0, Detractor: 0, NotEvaluated: 0 },
      // NEW: Detailed tracking for Advanced Analytics Tables
      detailedOwners: {},
      detailedReasons: {},
      detailedSubReasons: {},
      detailedRootCauses: {}
    };

    // Create a lookup map for scoring keys: Label -> Points
    const scoringKeysMap = (settings?.scoringKeys || []).reduce((acc, key) => {
      acc[key.label] = key.points || 0;
      return acc;
    }, {});

    // Use Global Technical Tasks (NPS Tickets) as primary source
    tasksToProcess.forEach(task => {
      // Helper to split multi-select strings or handle arrays
      const splitValues = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val.filter(v => v && v !== 'N/A' && v !== 'Unknown');
        return String(val).split(/[,/]+/).map(s => s.trim()).filter(s => s && s !== 'N/A' && s !== 'Unknown');
      };

      const increment = (map, value) => {
        const items = splitValues(value);
        if (items.length === 0) {
          // map['Unknown'] = (map['Unknown'] || 0) + 1; // Optional: handle unknown
          return;
        }
        items.forEach(v => {
          map[v] = (map[v] || 0) + 1;
        });
      };

      const owners = splitValues(task.responsible || task.assignedTo?.name);
      if (owners.length === 0) owners.push('Empty');

      const reasons = splitValues(task.reason);
      if (reasons.length === 0) reasons.push('Empty');

      const subReasons = splitValues(task.subReason);
      if (subReasons.length === 0) subReasons.push('Empty');

      const rootCauses = splitValues(task.rootCause);
      if (rootCauses.length === 0) rootCauses.push('Empty');

      const fieldTeam = task.teamName || 'Unknown';
      const category = task.category || 'N/A';

      // Check if ANY of the split indicators are "Yes"
      const isITN = splitValues(task.itnRelated).some(v => v === 'Yes' || v === true);
      const isSubscription = splitValues(task.relatedToSubscription).some(v => v === 'Yes' || v === true);

      owners.forEach(o => increment(stats.byOwner, o));
      reasons.forEach(r => increment(stats.byReason, r));
      subReasons.forEach(sr => increment(stats.bySubReason, sr));
      rootCauses.forEach(rc => increment(stats.byRootCause, rc));

      // Calculate Points for this task
      let taskPoints = 0;
      if (Array.isArray(task.scoringKeys)) {
        task.scoringKeys.forEach(keyLabel => {
          if (scoringKeysMap[keyLabel]) {
            taskPoints += scoringKeysMap[keyLabel];
          }
        });
      }

      // --- Detailed Tracking for Advanced Analytics Tables ---
      // Track Owner details
      owners.forEach(o => {
        if (!stats.detailedOwners[o]) {
          stats.detailedOwners[o] = { total: 0, itn: 0, subscription: 0, points: 0, ownerBreakdown: {} };
        }
        stats.detailedOwners[o].total++;
        stats.detailedOwners[o].points += taskPoints;
        if (isITN) stats.detailedOwners[o].itn++;
        if (isSubscription) stats.detailedOwners[o].subscription++;
      });

      // Track Reason details with owner contributions
      reasons.forEach(r => {
        if (!stats.detailedReasons[r]) {
          stats.detailedReasons[r] = { total: 0, itn: 0, subscription: 0, ownerBreakdown: {} };
        }
        stats.detailedReasons[r].total++;
        if (isITN) stats.detailedReasons[r].itn++;
        if (isSubscription) stats.detailedReasons[r].subscription++;
        owners.forEach(o => {
          stats.detailedReasons[r].ownerBreakdown[o] = (stats.detailedReasons[r].ownerBreakdown[o] || 0) + 1;
        });
      });

      // Track Sub-Reason details with owner contributions
      subReasons.forEach(sr => {
        if (!stats.detailedSubReasons[sr]) {
          stats.detailedSubReasons[sr] = { total: 0, itn: 0, subscription: 0, ownerBreakdown: {} };
        }
        stats.detailedSubReasons[sr].total++;
        if (isITN) stats.detailedSubReasons[sr].itn++;
        if (isSubscription) stats.detailedSubReasons[sr].subscription++;
        owners.forEach(o => {
          stats.detailedSubReasons[sr].ownerBreakdown[o] = (stats.detailedSubReasons[sr].ownerBreakdown[o] || 0) + 1;
        });
      });

      // Track Root Cause details with owner contributions
      rootCauses.forEach(rc => {
        if (!stats.detailedRootCauses[rc]) {
          stats.detailedRootCauses[rc] = { total: 0, itn: 0, subscription: 0, ownerBreakdown: {} };
        }
        stats.detailedRootCauses[rc].total++;
        if (isITN) stats.detailedRootCauses[rc].itn++;
        if (isSubscription) stats.detailedRootCauses[rc].subscription++;
        owners.forEach(o => {
          stats.detailedRootCauses[rc].ownerBreakdown[o] = (stats.detailedRootCauses[rc].ownerBreakdown[o] || 0) + 1;
        });
      });

      // --- Matrix Logic ---
      // Owner vs Reason
      reasons.forEach(r => {
        if (!stats.contributionMatrix[r]) stats.contributionMatrix[r] = { total: 0 };
        owners.forEach(o => {
          stats.contributionMatrix[r][o] = (stats.contributionMatrix[r][o] || 0) + 1;
          stats.contributionMatrix[r].total++;
        });
      });

      // Owner vs Root Cause
      rootCauses.forEach(rc => {
        if (!stats.rootCauseMatrix[rc]) stats.rootCauseMatrix[rc] = { total: 0 };
        owners.forEach(o => {
          stats.rootCauseMatrix[rc][o] = (stats.rootCauseMatrix[rc][o] || 0) + 1;
          stats.rootCauseMatrix[rc].total++;
        });
      });

      stats.byFieldTeam[fieldTeam] = (stats.byFieldTeam[fieldTeam] || 0) + 1;

      if (!stats.fieldTeamDetails[fieldTeam]) {
        stats.fieldTeamDetails[fieldTeam] = {
          total: 0,
          byCategory: {},
          byOwner: {},
          byReason: {},
          bySubReason: {},
          byRootCause: {},
          npsBreakdown: { Detractor: 0, Neutral: 0, Promoter: 0, NotEvaluated: 0 }
        };
      }

      const teamStats = stats.fieldTeamDetails[fieldTeam];
      teamStats.total += 1;
      teamStats.byCategory[category] = (teamStats.byCategory[category] || 0) + 1;

      owners.forEach(o => increment(teamStats.byOwner, o));
      reasons.forEach(r => increment(teamStats.byReason, r));
      subReasons.forEach(sr => increment(teamStats.bySubReason, sr));
      rootCauses.forEach(rc => increment(teamStats.byRootCause, rc));

      // Calculate NPS stats
      let score = task.evaluationScore;
      if (score && score > 0) {
        if (score <= 10) score = score * 10; // Normalize
        if (score <= 60) {
          teamStats.npsBreakdown.Detractor++;
          stats.sentiment.Detractor++;
        } else if (score <= 80) {
          teamStats.npsBreakdown.Neutral++;
          stats.sentiment.Neutral++;
        } else {
          teamStats.npsBreakdown.Promoter++;
          stats.sentiment.Promoter++;
        }
      } else {
        teamStats.npsBreakdown.NotEvaluated++;
        stats.sentiment.NotEvaluated++;
      }
    });

    const toChartData = (obj) => {
      const entries = Object.entries(obj).map(([name, value]) => ({ name, value }));
      const categoryTotal = entries.reduce((sum, item) => sum + item.value, 0);

      // Calculate float percentages
      let items = entries.map(item => ({
        ...item,
        floatPct: categoryTotal > 0 ? (item.value / categoryTotal) * 100 : 0,
        contribution: tasksToProcess.length > 0 ? ((item.value / tasksToProcess.length) * 100).toFixed(1) : 0
      }));

      // Largest Remainder Method for precise 100% sum
      const floorSum = items.reduce((sum, item) => sum + Math.floor(item.floatPct), 0);
      const diff = 100 - floorSum;
      if (categoryTotal > 0 && diff > 0 && diff < items.length) {
        items = items
          .map(item => ({ ...item, remainder: item.floatPct - Math.floor(item.floatPct) }))
          .sort((a, b) => b.remainder - a.remainder);

        for (let i = 0; i < diff; i++) {
          items[i].percentage = (Math.floor(items[i].floatPct) + 1).toFixed(1);
        }
        for (let i = diff; i < items.length; i++) {
          items[i].percentage = Math.floor(items[i].floatPct).toFixed(1);
        }
      } else {
        items = items.map(item => ({
          ...item,
          percentage: item.floatPct.toFixed(1)
        }));
      }

      return items.sort((a, b) => b.value - a.value);
    };

    const toDetailedTableData = (statsObj) => {
      const entries = Object.entries(statsObj).map(([key, data]) => ({ name: key, ...data }));
      const totalHits = entries.reduce((sum, item) => sum + item.total, 0);

      let items = entries.map(item => ({
        ...item,
        floatPct: totalHits > 0 ? (item.total / totalHits) * 100 : 0
      }));

      const floorSum = items.reduce((sum, item) => sum + Math.floor(item.floatPct), 0);
      const diff = 100 - floorSum;
      if (totalHits > 0 && diff > 0 && diff < items.length) {
        items = items
          .map(item => ({ ...item, remainder: item.floatPct - Math.floor(item.floatPct) }))
          .sort((a, b) => b.remainder - a.remainder);
        for (let i = 0; i < diff; i++) items[i].percentage = (Math.floor(items[i].floatPct) + 1).toFixed(1);
        for (let i = diff; i < items.length; i++) items[i].percentage = Math.floor(items[i].floatPct).toFixed(1);
      } else {
        items = items.map(item => ({ ...item, percentage: item.floatPct.toFixed(1) }));
      }

      return items.sort((a, b) => b.total - a.total);
    };

    const topFieldTeams = toChartData(stats.byFieldTeam);

    const fieldTeamAnalytics = topFieldTeams.map(team => ({
      teamName: team.name,
      totalIssues: team.value,
      categories: toChartData(stats.fieldTeamDetails[team.name]?.byCategory || {}),
      owners: toChartData(stats.fieldTeamDetails[team.name]?.byOwner || {}),
      reasons: toChartData(stats.fieldTeamDetails[team.name]?.byReason || {}),
      subReasons: toChartData(stats.fieldTeamDetails[team.name]?.bySubReason || {}),
      rootCauses: toChartData(stats.fieldTeamDetails[team.name]?.byRootCause || {}),
      npsBreakdown: [
        { name: 'Detractor', value: stats.fieldTeamDetails[team.name]?.npsBreakdown?.Detractor || 0, color: '#ef4444' },
        { name: 'Neutral', value: stats.fieldTeamDetails[team.name]?.npsBreakdown?.Neutral || 0, color: '#f59e0b' }
      ]
    }));

    // Matrix Summary & Dynamic Owners List
    const priorityOwners = ['Reach', 'OJO', 'GAM', 'Customer', 'Empty'];
    const otherOwnersFound = Object.keys(stats.byOwner).filter(o => !priorityOwners.includes(o));
    otherOwnersFound.sort((a, b) => stats.byOwner[b] - stats.byOwner[a]);

    // Construct the list of owners to show as distinct columns
    // Include priority owners (if they have data or we want them always) + top 3 others
    const matrixOwners = [
      ...priorityOwners.filter(o => stats.byOwner[o] > 0 || priorityOwners.slice(0, 4).includes(o)),
      ...otherOwnersFound.slice(0, 3)
    ];

    return {
      ownerData: toChartData(stats.byOwner).sort((a, b) => {
        const idxA = priorityOwners.indexOf(a.name);
        const idxB = priorityOwners.indexOf(b.name);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return b.value - a.value;
      }),
      reasonData: toChartData(stats.byReason),
      subReasonData: toChartData(stats.bySubReason),
      rootCauseData: toChartData(stats.byRootCause),
      sentimentData: (() => {
        const totalSentiment = stats.sentiment.Promoter + stats.sentiment.Neutral + stats.sentiment.Detractor;
        const entries = [
          { name: 'Promoters', value: stats.sentiment.Promoter, color: '#10b981' },
          { name: 'Neutrals', value: stats.sentiment.Neutral, color: '#f59e0b' },
          { name: 'Detractors', value: stats.sentiment.Detractor, color: '#ef4444' }
        ].filter(s => s.value > 0);

        const total = entries.reduce((sum, item) => sum + item.value, 0);
        let items = entries.map(item => ({
          ...item,
          floatPct: total > 0 ? (item.value / total) * 100 : 0
        }));

        const floorSum = items.reduce((sum, item) => sum + Math.floor(item.floatPct), 0);
        const diff = 100 - floorSum;
        if (total > 0 && diff > 0 && diff < items.length) {
          items = items
            .map(item => ({ ...item, remainder: item.floatPct - Math.floor(item.floatPct) }))
            .sort((a, b) => b.remainder - a.remainder);
          for (let i = 0; i < diff; i++) items[i].percentage = (Math.floor(items[i].floatPct) + 1).toFixed(1);
          for (let i = diff; i < items.length; i++) items[i].percentage = Math.floor(items[i].floatPct).toFixed(1);
        } else {
          items = items.map(item => ({ ...item, percentage: item.floatPct.toFixed(1) }));
        }
        return items;
      })(),
      matrixOwners,
      contributionMatrix: {
        matrix: stats.contributionMatrix,
        topOwners: matrixOwners
      },
      rootCauseMatrix: {
        matrix: stats.rootCauseMatrix,
        topOwners: matrixOwners
      },
      // Pre-calculated detailed stats with LRM
      detailedOwners: toDetailedTableData(stats.detailedOwners).sort((a, b) => {
        const idxA = priorityOwners.indexOf(a.name);
        const idxB = priorityOwners.indexOf(b.name);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return b.total - a.total;
      }),
      detailedReasons: toDetailedTableData(stats.detailedReasons),
      detailedSubReasons: toDetailedTableData(stats.detailedSubReasons),
      detailedRootCauses: toDetailedTableData(stats.detailedRootCauses),
      fieldTeamAnalytics,
      totalProcessed: tasksToProcess.length,
      categoryTotals: {
        owners: Object.values(stats.byOwner).reduce((a, b) => a + b, 0),
        reasons: Object.values(stats.byReason).reduce((a, b) => a + b, 0),
        subReasons: Object.values(stats.bySubReason).reduce((a, b) => a + b, 0),
        rootCauses: Object.values(stats.byRootCause).reduce((a, b) => a + b, 0)
      }
    };
  }, [allTechnicalTasksGlobal, analyticsSubTab, timeFilterMode, recentDaysValue, selectedWeeks, selectedMonths, customDateRange, settings]);

  const calculateItemPoints = (item, type = 'task') => {
    let points = 0;

    // 1. Dynamic Scoring Rules
    if (settings?.scoringRules && Array.isArray(settings.scoringRules)) {
      const evaluateRule = (item, rule) => {
        if (!rule.isActive) return 0;
        let itemValue = item[rule.field];
        const ruleValue = rule.value;

        const compare = (a, b, op) => {
          switch (op) {
            case 'equals': return a == b;
            case 'notEquals': return a != b;
            case 'greaterThan': return Number(a) > Number(b);
            case 'lessThan': return Number(a) < Number(b);
            case 'contains': return String(a).toLowerCase().includes(String(b).toLowerCase());
            default: return false;
          }
        };

        return compare(itemValue, ruleValue, rule.operator) ? Number(rule.points) : 0;
      };

      settings.scoringRules.filter(r => r.type === type).forEach(rule => {
        points += evaluateRule(item, rule);
      });
    }

    // 2. Manual Scoring Keys
    if (settings?.scoringKeys && Array.isArray(settings.scoringKeys) && Array.isArray(item.scoringKeys)) {
      item.scoringKeys.forEach(keyLabel => {
        const keyConfig = settings.scoringKeys.find(k => k.label === keyLabel);
        if (keyConfig) points += Number(keyConfig.points);
      });
    }

    return points;
  };

  const mapItemToExcelRow = (item, type) => {
    let displayScore = 'Not Evaluated';
    let satisfaction = 'N/A';
    let score = item.evaluationScore || 0;
    if (score > 0) {
      const isSmallScale = score <= 10;
      displayScore = `${score}${isSmallScale ? '/10' : '%'}`;
      const normalized = isSmallScale ? score * 10 : score;
      if (normalized <= 60) satisfaction = 'Detractor';
      else if (normalized <= 80) satisfaction = 'Neutral';
      else satisfaction = 'Promoter';
    }

    return {
      'Type': type === 'task' ? 'NPS Ticket' : 'Customer Issue',
      'Team': item.teamName,
      'SLID': item.slid,
      'Customer': item.customerName || 'N/A',
      'Reason': Array.isArray(item.reason) ? item.reason.join(", ") : (item.reason || '-'),
      'Sub-Reason': Array.isArray(item.subReason) ? item.subReason.join(", ") : (item.subReason || '-'),
      'Root Cause': Array.isArray(item.rootCause) ? item.rootCause.join(", ") : (item.rootCause || '-'),
      'Owner/Responsible': item.responsible || item.assignedTo?.name || (item.assignedTo && typeof item.assignedTo === 'string' ? item.assignedTo : '-'),
      'Technician': item.technician || item.primaryTechnician || '-',
      'Status': item.validationStatus || (item.solved === 'yes' ? 'Solved' : 'Open'),
      'Score': displayScore,
      'Satisfaction': satisfaction,
      'Points': calculateItemPoints(item, type),
      'Customer Feedback': (type === 'task' ? (item.customerFeedback || '-') : (item.reporterNote || '-')),
      'Our Actions/Resolution': (type === 'issue' ? (item.resolutionDetails || item.assigneeNote || '-') : '-'),
      'ITN Related': ((Array.isArray(item.itnRelated) && item.itnRelated.includes('Yes')) || item.itnRelated === 'Yes' || item.itnRelated === true) ? 'Yes' : 'No',
      'Subscription Related': ((Array.isArray(item.relatedToSubscription) && item.relatedToSubscription.includes('Yes')) || item.relatedToSubscription === 'Yes' || item.relatedToSubscription === true) ? 'Yes' : 'No',
      'Date': new Date(item.interviewDate || item.date || item.createdAt).toLocaleDateString(),
      'Contract Date': item.contractDate ? new Date(item.contractDate).toLocaleDateString() : '-',
      'UN Date': item.unDate ? new Date(item.unDate).toLocaleDateString() : '-',
      'FE Date': item.feDate ? new Date(item.feDate).toLocaleDateString() : (item.appDate ? new Date(item.appDate).toLocaleDateString() : '-'),
      'In Date': item.inDate ? new Date(item.inDate).toLocaleDateString() : '-',
      'Close Date': item.closeDate ? new Date(item.closeDate).toLocaleDateString() : '-'
    };
  };

  const handleExportIndividualTeam = (team) => {
    // 0. Calculate Global Totals for Comparative Analysis
    const globalTotals = leaderboardData.reduce((acc, t) => {
      acc.totalDetractors += (t.npsDetractors || 0);
      acc.totalNeutrals += (t.npsNeutrals || 0);
      acc.totalIssues += (t.issueViolations || 0);
      acc.totalViolations += (t.totalViolations || 0);
      acc.totalPoints += (t.totalPoints || 0);
      return acc;
    }, { totalDetractors: 0, totalNeutrals: 0, totalIssues: 0, totalViolations: 0, totalPoints: 0 });

    // 1. Team Summary Data with Comparative Metrics
    const summaryData = [{
      'Team Name': team.teamName,
      'Company': team.teamCompany,
      'Total NPS Tasks': team.totalNpsTickets,
      'NPS Detractors': team.npsDetractors,
      '% of Global Detractors': globalTotals.totalDetractors > 0 ? ((team.npsDetractors / globalTotals.totalDetractors) * 100).toFixed(1) + '%' : '0.0%',
      'NPS Neutrals': team.npsNeutrals,
      '% of Global Neutrals': globalTotals.totalNeutrals > 0 ? ((team.npsNeutrals / globalTotals.totalNeutrals) * 100).toFixed(1) + '%' : '0.0%',
      'Total Issues': team.issueViolations,
      '% of Global Issues': globalTotals.totalIssues > 0 ? ((team.issueViolations / globalTotals.totalIssues) * 100).toFixed(1) + '%' : '0.0%',
      'Open Cases': team.openCount,
      'Avg Resolution Time (Days)': team.avgResolutionTime,
      'Resolution Rate (%)': team.resPercent,
      'Total Violations': team.totalViolations,
      '% of Global Total Violations': globalTotals.totalViolations > 0 ? ((team.totalViolations / globalTotals.totalViolations) * 100).toFixed(1) + '%' : '0.0%',
      'Total Points': team.totalPoints,
      '% of Global Total Points': globalTotals.totalPoints > 0 ? ((team.totalPoints / globalTotals.totalPoints) * 100).toFixed(1) + '%' : '0.0%',
    }];

    // 2. Detailed Data
    const detailedData = [
      ...team.rawDetractors.map(t => mapItemToExcelRow(t, 'task')),
      ...team.rawNeutrals.map(t => mapItemToExcelRow(t, 'task')),
      ...team.rawIssues.map(i => mapItemToExcelRow(i, 'issue'))
    ];

    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Team Performance Summary");

    // Detailed Sheet
    const wsDetails = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, wsDetails, "Detailed Feedback & Actions");

    // Auto-size columns
    [wsSummary, wsDetails].forEach(ws => {
      const range = XLSX.utils.decode_range(ws['!ref']);
      const cols = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxLen = 10;
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
          if (cell && cell.v) {
            const len = cell.v.toString().length;
            if (len > maxLen) maxLen = len;
          }
        }
        cols.push({ wch: Math.min(maxLen + 2, 50) }); // Cap at 50 for readability
      }
      ws['!cols'] = cols;
    });

    XLSX.writeFile(wb, `${team.teamName}_Detailed_Quality_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportTeamViolations = (team) => {
    // Filter tasks and issues for this team
    const teamTasks = (Array.isArray(allTechnicalTasksGlobal) ? allTechnicalTasksGlobal : [])
      .filter(t => t.teamName === team.teamName)
      .map(t => mapItemToExcelRow(t, 'task'));

    const teamIssues = (Array.isArray(filteredIssuesByDate) ? filteredIssuesByDate : [])
      .filter(i => i.teamName === team.teamName)
      .map(i => mapItemToExcelRow(i, 'issue'));

    const data = [...teamTasks, ...teamIssues];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Violations Details");
    XLSX.writeFile(wb, `${team.teamName}_Violations_DeepDive_Report.xlsx`);
  };

  const handleExportAllTeamsViolations = () => {
    const allTasks = (Array.isArray(allTechnicalTasksGlobal) ? allTechnicalTasksGlobal : [])
      .map(t => mapItemToExcelRow(t, 'task'));

    const allIssues = (Array.isArray(filteredIssuesByDate) ? filteredIssuesByDate : [])
      .map(i => mapItemToExcelRow(i, 'issue'));

    const data = [...allTasks, ...allIssues];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Global Violations Report");
    XLSX.writeFile(wb, `Global_Violations_DeepDive_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Analytics Drill-Down Handler
  const handleAnalyticsDrillDown = (filters = {}) => {
    let filtered = [];

    // Apply time filtering first
    const techTasks = Array.isArray(allTechnicalTasksGlobal) ? allTechnicalTasksGlobal : [];
    let timeFiltered = techTasks;
    if (timeFilterMode === 'days') {
      const cutoff = subDays(new Date(), recentDaysValue);
      timeFiltered = techTasks.filter(t => t.interviewDate && isAfter(new Date(t.interviewDate), cutoff));
    } else if (timeFilterMode === 'weeks' && selectedWeeks.length > 0) {
      timeFiltered = techTasks.filter(t => {
        if (!t.interviewDate) return false;
        const { key } = getWeekNumber(t.interviewDate, settings?.weekStartDay, settings?.week1StartDate, settings?.week1EndDate, settings?.startWeekNumber);
        return selectedWeeks.includes(key);
      });
    } else if (timeFilterMode === 'months' && selectedMonths.length > 0) {
      timeFiltered = techTasks.filter(t => {
        if (!t.interviewDate) return false;
        const monthInfo = getMonthNumber(t.interviewDate, settings);
        return monthInfo && selectedMonths.includes(monthInfo.key);
      });
    } else if (timeFilterMode === 'custom' && customDateRange.start && customDateRange.end) {
      const start = new Date(customDateRange.start);
      const end = new Date(customDateRange.end);
      end.setHours(23, 59, 59, 999);
      timeFiltered = techTasks.filter(t => {
        const d = new Date(t.interviewDate || t.createdAt);
        return d >= start && d <= end;
      });
    }

    // Apply sub-tab filtering (All/Detractors/Neutrals)
    let tasksToProcess = timeFiltered;
    if (analyticsSubTab === 1) { // Detractors
      tasksToProcess = timeFiltered.filter(t => {
        let score = t.evaluationScore;
        if (score && score > 0) {
          if (score <= 10) score = score * 10;
          return score <= 60;
        }
        return false;
      });
    } else if (analyticsSubTab === 2) { // Neutrals
      tasksToProcess = timeFiltered.filter(t => {
        let score = t.evaluationScore;
        if (score && score > 0) {
          if (score <= 10) score = score * 10;
          return score > 60 && score <= 80;
        }
        return false;
      });
    }

    // Apply specific filters
    filtered = tasksToProcess.filter(task => {
      let match = true;

      if (filters.owner) {
        const owners = Array.isArray(task.responsible) ? task.responsible : [task.responsible || task.assignedTo?.name || 'Unknown'];
        if (!owners.includes(filters.owner)) match = false;
      }

      if (filters.reason) {
        const reasons = Array.isArray(task.reason) ? task.reason : [task.reason || 'Unknown'];
        if (!reasons.includes(filters.reason)) match = false;
      }

      if (filters.subReason) {
        const subReasons = Array.isArray(task.subReason) ? task.subReason : [task.subReason || 'Unknown'];
        if (!subReasons.includes(filters.subReason)) match = false;
      }

      if (filters.rootCause) {
        const rootCauses = Array.isArray(task.rootCause) ? task.rootCause : [task.rootCause || 'Unknown'];
        if (!rootCauses.includes(filters.rootCause)) match = false;
      }

      if (filters.itn) {
        if (!(task.itnRelated === true || task.itnRelated === 'Yes')) match = false;
      }

      if (filters.subscription) {
        if (!(task.relatedToSubscription === true || task.relatedToSubscription === 'Yes')) match = false;
      }

      return match;
    });

    // Generate Title
    const titleParts = [];
    if (filters.owner) titleParts.push(`Owner: ${filters.owner}`);
    if (filters.reason) titleParts.push(`Reason: ${filters.reason}`);
    if (filters.subReason) titleParts.push(`Sub-Reason: ${filters.subReason}`);
    if (filters.rootCause) titleParts.push(`Root Cause: ${filters.rootCause}`);
    if (filters.itn) titleParts.push(`ITN Related`);
    if (filters.subscription) titleParts.push(`Subscription Related`);

    setAnalyticsDrillDown({
      open: true,
      title: titleParts.join(' | ') || 'Filtered Tasks',
      tasks: filtered
    });
  };

  const stats = useMemo(() => {
    const issuesToProcess = filteredIssuesByDate;
    const totalTransactions = issuesToProcess.length;
    let totalIssuesHighlighted = 0;
    const closed = issuesToProcess.filter(i => i.solved === 'yes').length;
    const open = totalTransactions - closed;
    const resolutionRate = totalTransactions > 0 ? ((closed / totalTransactions) * 100).toFixed(1) : 0;

    issuesToProcess.forEach(issue => {
      if (issue.issues && Array.isArray(issue.issues)) {
        totalIssuesHighlighted += issue.issues.length;
      } else if (issue.issueCategory) {
        totalIssuesHighlighted += 1;
      }
    });

    const issueDensity = totalTransactions > 0 ? (totalIssuesHighlighted / totalTransactions).toFixed(2) : 0;

    // --- NPS / Detractor / Neutral Calculations ---
    let technicalDetractors = 0;
    let technicalNeutrals = 0;
    let totalDetractors = 0;
    let totalNeutrals = 0;

    // Quiz evaluation
    quizResults.forEach(r => {
      const score = r.percentage || 0;
      if (score < 70) totalDetractors++;
      else if (score >= 70 && score < 85) totalNeutrals++;
    });

    // Practical evaluation
    jobAssessments.forEach(a => {
      const score = a.overallScore || 0;
      if (score < 3.5) totalDetractors++;
      else if (score >= 3.5 && score < 4.5) totalNeutrals++;
    });

    // NPS Tickets evaluation
    technicalTasks.forEach(t => {
      let score = t.evaluationScore || 0;
      if (score > 0) { // Only count if evaluated
        // Normalize 1-10 scale to 0-100
        if (score <= 10) score = score * 10;

        if (score <= 60) {
          technicalDetractors++;
          totalDetractors++;
        }
        else if (score > 60 && score <= 80) {
          technicalNeutrals++;
          totalNeutrals++;
        }
      }
    });

    // Process Efficiency Calculations
    let totalDispatchTime = 0;
    let countDispatch = 0;
    let totalResolutionTime = 0;
    let countResolution = 0;
    let totalLifecycleTime = 0;
    let countLifecycle = 0;
    const now = new Date();

    issuesToProcess.forEach(issue => {
      const reportDate = new Date(issue.date || issue.createdAt);

      // 1. Dispatch Speed
      let dispatchEnd = issue.dispatchedAt ? new Date(issue.dispatchedAt) : (issue.dispatched === 'no' ? now : null);
      if (!dispatchEnd && issue.dispatched === 'yes') dispatchEnd = reportDate;
      if (dispatchEnd && dispatchEnd >= reportDate) {
        const time = (dispatchEnd - reportDate) / (1000 * 60 * 60 * 24);
        totalDispatchTime += time;
        countDispatch++;
      }

      // 2. Resolution Speed
      if (issue.dispatchedAt || issue.dispatched === 'yes') {
        let resStart = issue.dispatchedAt ? new Date(issue.dispatchedAt) : reportDate;
        let resEnd = issue.resolveDate ? new Date(issue.resolveDate) : (issue.solved === 'no' ? now : null);
        if (resStart && resEnd && resEnd >= resStart) {
          const resTime = (resEnd - resStart) / (1000 * 60 * 60 * 24);
          totalResolutionTime += resTime;
          countResolution++;
        }
      }

      // 3. Lifecycle
      let lifecycleEnd = issue.closedAt ? new Date(issue.closedAt) : (issue.solved === 'no' ? now : null);
      if (lifecycleEnd && lifecycleEnd >= reportDate) {
        const lifeTime = (lifecycleEnd - reportDate) / (1000 * 60 * 60 * 24);
        totalLifecycleTime += lifeTime;
        countLifecycle++;
      }
    });

    return {
      totalTransactions,
      totalIssuesHighlighted,
      closed,
      open,
      resolutionRate,
      issueDensity,
      detractors: totalDetractors,
      neutrals: totalNeutrals,
      technicalTasksCount: technicalTasks.length,
      technicalDetractors,
      technicalNeutrals,
      customerIssuesCount: totalTransactions,
      totalTasks: totalTransactions + quizResults.length + jobAssessments.length + technicalTasks.length,
      avgDispatchTime: countDispatch > 0 ? (totalDispatchTime / countDispatch).toFixed(1) : 0,
      avgResolutionTime: countResolution > 0 ? (totalResolutionTime / countResolution).toFixed(1) : 0,
      avgLifecycleTime: countLifecycle > 0 ? (totalLifecycleTime / countLifecycle).toFixed(1) : 0
    };
  }, [filteredIssuesByDate, quizResults, jobAssessments, technicalTasks]);

  const operationalEfficiencyData = useMemo(() => {
    const totalReported = stats.customerIssuesCount + stats.technicalTasksCount;
    const totalResolved = stats.closed;
    const resolutionRate = Number(stats.resolutionRate);

    // Responsivity Score: 100 - (avgDispatchTime * 10), capped at 0-100
    // Shorter dispatch time = Higher score
    const responsivityScore = Math.max(0, Math.min(100, 100 - (parseFloat(stats.avgDispatchTime) * 10)));

    // Completion Score: NPS Tickets with evaluation score > 0
    const taskCompletionRate = stats.technicalTasksCount > 0
      ? (technicalTasks.filter(t => (t.evaluationScore || 0) > 0).length / stats.technicalTasksCount) * 100
      : 0;

    return [
      { name: 'Resolution Success', value: resolutionRate, full: 100, color: colors.secondary },
      { name: 'Team Responsivity', value: responsivityScore, full: 100, color: colors.primary },
      { name: 'Operational Volume', value: totalReported, full: Math.max(totalReported, 20), color: colors.info },
      { name: 'Task Completion', value: taskCompletionRate, full: 100, color: colors.success },
    ];
  }, [stats, technicalTasks, colors]);

  const deepStats = useMemo(() => {
    // Calculate critical insights
    const agingIssues = filteredIssuesByDate.filter(i => i.solved === 'no' && (new Date() - new Date(i.date || i.createdAt)) / (1000 * 60 * 60 * 24) > 7).length;
    const expressResolution = filteredIssuesByDate.filter(i => {
      if (!i.resolveDate || !i.date) return false;
      return (new Date(i.resolveDate) - new Date(i.date)) / (1000 * 60 * 60 * 24) <= 1;
    }).length;

    return {
      highAgingCount: agingIssues,
      expressResolutionCount: expressResolution,
      avgResolutionSpeed: stats.avgResolutionTime,
      reliabilityIndex: Math.max(0, 100 - (agingIssues * 5)).toFixed(1)
    };
  }, [filteredIssuesByDate, stats]);

  const allActivities = useMemo(() => {
    const activities = [
      ...filteredIssuesByDate.map(i => ({
        id: i._id,
        type: 'issue',
        title: 'Customer Issue',
        detail: `${i.slid} - ${i.issueCategory || 'General'}`,
        date: i.date || i.createdAt,
        color: i.solved === 'yes' ? colors.success : colors.error,
        icon: <SupportAgent sx={{ fontSize: '1.2rem' }} />,
        status: i.solved === 'yes' ? 'Closed' : 'Open',
        priority: i.priority || 'Medium',
        metadata: `Reporter: ${i.reporter || 'N/A'} | Area: ${i.area || 'N/A'}`
      })),
      ...technicalTasks.map(t => {
        const isSmallScale = t.evaluationScore && t.evaluationScore <= 10;
        return {
          id: t._id,
          type: 'task',
          title: 'Technical Task',
          detail: `${t.slid} - ${t.customerName}`,
          date: t.pisDate || t.createdAt,
          color: colors.warning,
          icon: <Assignment sx={{ fontSize: '1.2rem' }} />,
          status: t.validationStatus || 'Pending',
          priority: t.priority || 'Medium',
          metadata: t.evaluationScore ? `Score: ${t.evaluationScore}${isSmallScale ? '/10' : '%'} | Tech: ${t.technician || 'N/A'}` : `Tech: ${t.technician || 'N/A'}`
        };
      }),
      ...quizResults.map(q => ({
        id: q._id,
        type: 'quiz',
        title: 'Theoretical Assessment',
        detail: `${q.quizCode}`,
        date: q.submittedAt,
        color: q.percentage >= 70 ? colors.secondary : colors.error,
        icon: <Quiz sx={{ fontSize: '1.2rem' }} />,
        status: q.percentage >= 70 ? 'Passed' : 'Failed',
        metadata: `Score: ${q.percentage}% | Mark: ${q.score}`
      })),
      ...jobAssessments.map(a => ({
        id: a._id,
        type: 'practical',
        title: 'Practical Assessment',
        detail: `Field Performance Evaluation`,
        date: a.assessmentDate,
        color: colors.success,
        icon: <CheckCircle sx={{ fontSize: '1.2rem' }} />,
        status: getAssessmentStatus(a.overallScore, 'practical').label,
        metadata: `Score: ${Number(a.overallScore).toFixed(1)}/5 | Evaluator: ${a.conductedBy}`
      })),
      ...labAssessments.map(l => ({
        id: l._id,
        type: 'lab',
        title: 'Lab Assessment',
        detail: `${l.assessmentType || 'Standard'}`,
        date: l.createdAt,
        color: colors.info,
        icon: <Assessment sx={{ fontSize: '1.2rem' }} />,
        status: `${l.totalScore}% Proficiency`,
        metadata: `ONT: ${l.ontType?.name || 'N/A'} | Comments: ${l.comments ? 'Yes' : 'None'}`
      }))
    ];

    return activities.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredIssuesByDate, technicalTasks, quizResults, jobAssessments, labAssessments]);

  const trendData = useMemo(() => {
    const countsByDate = {};
    const sortedIssues = [...filteredIssuesByDate].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedIssues.forEach(issue => {
      if (!issue.date) return;
      const d = new Date(issue.date);
      let key = '';
      if (trendTimeframe === 'day') key = d.toISOString().split('T')[0];
      else if (trendTimeframe === 'week') {
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        key = `Week of ${startOfWeek.toISOString().split('T')[0]}`;
      } else if (trendTimeframe === 'month') key = d.toISOString().slice(0, 7);
      else key = d.toISOString().split('T')[0];

      countsByDate[key] = (countsByDate[key] || 0) + 1;
    });

    const labels = Object.keys(countsByDate);
    const data = Object.values(countsByDate);
    const datasets = [];

    if (trendChartType === 'mixed' || trendChartType === 'bar') {
      datasets.push({
        type: 'bar',
        label: 'Volume',
        data: data,
        backgroundColor: 'rgba(123, 104, 238, 0.5)',
        borderColor: 'rgba(123, 104, 238, 1)',
        borderWidth: 1,
        order: 2
      });
    }

    if (trendChartType === 'mixed' || trendChartType === 'line') {
      datasets.push({
        type: 'line',
        label: 'Trend',
        data: data,
        borderColor: '#4caf50',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        order: 1,
        fill: trendChartType === 'line' ? { target: 'origin', above: 'rgba(76, 175, 80, 0.1)' } : false
      });
    }

    return { labels, datasets };
  }, [filteredIssuesByDate, trendTimeframe, trendChartType]);

  const statusData = useMemo(() => ({
    labels: ['Closed', 'Open'],
    datasets: [{
      data: [stats.closed, stats.open],
      backgroundColor: ['#4caf50', '#f44336'],
      borderWidth: 0,
    }],
  }), [stats]);

  const categoryData = useMemo(() => {
    const counts = {};
    filteredIssuesByDate.forEach(issue => {
      if (issue.issues && issue.issues.length > 0) {
        issue.issues.forEach(i => {
          const category = i.category || 'Uncategorized';
          counts[category] = (counts[category] || 0) + 1;
        });
      } else {
        const category = issue.issueCategory || 'Uncategorized';
        counts[category] = (counts[category] || 0) + 1;
      }
    });
    const sortedCategories = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    let finalLabels = [];
    let finalData = [];
    if (sortedCategories.length > 6) {
      const top5 = sortedCategories.slice(0, 5);
      const othersCount = sortedCategories.slice(5).reduce((acc, curr) => acc + curr[1], 0);
      finalLabels = [...top5.map(i => i[0]), 'Others'];
      finalData = [...top5.map(i => i[1]), othersCount];
    } else {
      finalLabels = sortedCategories.map(i => i[0]);
      finalData = sortedCategories.map(i => i[1]);
    }
    return {
      labels: finalLabels,
      datasets: [{
        data: finalData,
        backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796'],
        borderWidth: 1,
      }],
      totalCount: Object.values(counts).reduce((a, b) => a + b, 0),
      allCategories: Object.keys(counts).sort()
    };
  }, [filteredIssuesByDate]);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'bottom', labels: { color: '#b3b3b3', usePointStyle: true, padding: 20 } }
    }
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { color: '#ffffff' } } },
    scales: {
      x: { ticks: { color: '#b3b3b3' }, grid: { color: '#3d3d3d' } },
      y: { beginAtZero: true, ticks: { color: '#b3b3b3', stepSize: 1, precision: 0 }, grid: { color: '#3d3d3d' } }
    }
  };

  const StatCard = ({ title, value, icon, color, subtext }) => (
    <Card sx={{ bgcolor: '#2d2d2d', color: '#fff', height: '100%', border: '1px solid #3d3d3d' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
        <Box>
          <Typography variant="body2" color="#b3b3b3" gutterBottom>{title}</Typography>
          <Typography variant="h4" fontWeight="bold">{value}</Typography>
          {subtext && <Typography variant="caption" color={color}>{subtext}</Typography>}
        </Box>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}20`, color: color, fontSize: '1.5rem', display: 'flex' }}>
          {icon}
        </Box>
      </CardContent>
    </Card>
  );




  const fetchFieldTeams = async () => {
    try {
      setLoading(true);
      // Fetch from both endpoints and combine results
      const [fieldTeamsRes, quizTeamsRes] = await Promise.all([
        api.get("/field-teams/get-field-teams", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }),
        api.get("/quiz-results/teams/all", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        })
      ]);

      // Combine and deduplicate teams
      const combinedTeams = [
        ...fieldTeamsRes.data,
        ...quizTeamsRes.data.data.map(qt => ({
          _id: qt.teamId,
          teamName: qt.teamName,
          teamCompany: "N/A" // Default value for quiz teams
        }))
      ];

      // Remove duplicates
      const uniqueTeams = combinedTeams.reduce((acc, team) => {
        if (!acc.some(t => t._id === team._id)) {
          acc.push(team);
        }
        return acc;
      }, []);

      setFieldTeams(uniqueTeams);
    } catch (error) {
      console.error("Error fetching field teams:", error);
      setError("Failed to fetch field teams");
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalData = async () => {
    try {
      setLoadingGlobal(true);
      const [techRes, issuesRes] = await Promise.all([
        api.get("/tasks/get-all-tasks", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        }),
        api.get("/customer-issues", {
          params: { limit: 10000 },
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        })
      ]);
      const techData = techRes.data?.data || techRes.data || [];
      setAllTechnicalTasksGlobal(Array.isArray(techData) ? techData : []);
      // Ensure we always have an array even if structure is different
      const issuesData = issuesRes.data?.data || issuesRes.data || [];
      setAllCustomerIssuesGlobal(Array.isArray(issuesData) ? issuesData : []);
    } catch (err) {
      console.error("Error fetching global leaderboard data:", err);
    } finally {
      setLoadingGlobal(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
    fetchFieldTeams();
  }, []);

  const handleDrillDown = (team, type) => {
    let items = [];
    let title = '';
    let dataType = 'issue';
    let defaultTab = 'tasks';

    if (type === 'detractors') {
      items = team.rawDetractors;
      title = `${team.teamName} - NPS Detractors`;
      dataType = 'task';
      defaultTab = 'tasks';
    } else if (type === 'neutrals') {
      items = team.rawNeutrals;
      title = `${team.teamName} - NPS Neutrals`;
      dataType = 'task';
      defaultTab = 'tasks';
    } else if (type === 'open') {
      items = team.rawOpen;
      title = `${team.teamName} - Total Open Cases (Dispatched but not closed)`;
      dataType = 'issue';
      defaultTab = 'issues';
    } else if (type === 'issues') {
      items = team.rawIssues;
      title = `${team.teamName} - Total Customer Issues (Snags & Complaints)`;
      dataType = 'issue';
      defaultTab = 'issues';
    } else if (type === 'violations') {
      items = [
        ...team.rawIssues.map(i => ({ ...i, __drillType: 'issue' })),
        ...team.rawDetractors.map(t => ({ ...t, __drillType: 'task' })),
        ...team.rawNeutrals.map(t => ({ ...t, __drillType: 'task' }))
      ];
      title = `${team.teamName} - Total Violations Detail`;
      dataType = 'mixed';
      // If there are issues, default to tasks but let user switch
      defaultTab = team.rawDetractors.length + team.rawNeutrals.length > 0 ? 'tasks' : 'issues';
    }

    setDrillDownItems(items);
    setDrillDownTitle(title);
    setDrillDownType(dataType);
    setDrillDownTab(defaultTab);
    setDrillDownOpen(true);
  };

  const handleTeamSelect = (team) => {
    navigate(`/fieldTeams-portal/${team._id}`);
  };

  // Sync selectedTeam with URL teamId
  useEffect(() => {
    if (teamId && fieldTeams.length > 0) {
      const team = fieldTeams.find(t => t._id === teamId);
      if (team) {
        setSelectedTeam(team);
      }
    } else if (!teamId) {
      setSelectedTeam(null);
    }
  }, [teamId, fieldTeams]);

  useEffect(() => {
    if (selectedTeam) {
      const fetchTeamAssessments = async () => {
        try {
          setLoading(true);
          const [quizRes, jobRes] = await Promise.all([
            api.get(`/quiz-results?teamId=${selectedTeam._id}`, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              }
            }),
            api.get(`/on-the-job-assessments/field-team/${selectedTeam._id}`, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              }
            })
          ]);

          // Fetch Customer Issues if teamCompany is available
          if (selectedTeam.teamCompany && selectedTeam.teamCompany !== 'N/A') {
            try {
              const issuesRes = await api.get('/customer-issues', {
                params: {
                  teamCompany: selectedTeam.teamCompany,
                  limit: 1000 // Fetch a reasonable amount for analysis
                },
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                }
              });
              setCustomerIssues(issuesRes.data.data || []);
            } catch (err) {
              console.error("Error fetching customer issues:", err);
              // Don't block other data if this fails
            }
          } else {
            setCustomerIssues([]);
          }

          // console.log("Quiz Results:", quizRes.data);
          // console.log("Job Assessments:", jobRes.data);

          // Correctly set the quizResults state
          setQuizResults(quizRes.data.data);
          setJobAssessments(jobRes.data);

          // Fetch Lab Assessments
          const labRes = await api.get(`/lab-assessments/team/${selectedTeam._id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            }
          });
          setLabAssessments(labRes.data);

          // Fetch NPS Tickets
          try {
            const techRes = await api.get(`/tasks/get-all-tasks`, {
              params: { teamId: selectedTeam._id },
              headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              }
            });
            // Filter to ensure only this team's tasks are set if not done by backend
            setTechnicalTasks(techRes.data.filter(task => task.teamId === selectedTeam._id) || []);
          } catch (err) {
            console.error("Error fetching NPS tickets:", err);
          }

        } catch (error) {
          console.error("Error fetching assessments:", error);
          setError("Failed to fetch assessments");
        } finally {
          setLoading(false);
        }
      };

      fetchTeamAssessments();
    } else {
      setQuizResults([]);
      setJobAssessments([]);
      setLabAssessments([]);
      setCustomerIssues([]);
    }
  }, [selectedTeam]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getAssessmentStatus = (score, type = 'general') => {
    const thresholds = settings?.thresholds || { pass: 85, average: 70, fail: 50, quizPassScore: 70, labPassScore: 75 };

    if (type === 'practical') {
      // 1-5 Scale
      if (score >= 4.5) return { label: "Excellent", color: "#2e7d32" };
      if (score >= 3.5) return { label: "Good", color: "#66bb6a" };
      if (score >= 2.5) return { label: "Satisfactory", color: "#ffa726" };
      if (score >= 1.5) return { label: "Needs Improvement", color: "#ff9800" };
      return { label: "Poor", color: "#d32f2f" };
    }

    let passThreshold = thresholds.pass;
    if (type === 'quiz') passThreshold = thresholds.quizPassScore || 70;
    if (type === 'lab') passThreshold = thresholds.labPassScore || 75;

    if (score >= passThreshold) return { label: "Excellent", color: "#2e7d32" };
    if (score >= thresholds.average) return { label: "Pass (Minor Comments)", color: "#66bb6a" };
    if (score >= thresholds.fail) return { label: "Pass (With Comments)", color: "#ffa726" };
    return { label: "Fail", color: "#d32f2f" };
  };

  const getPerformanceColor = (score, type = 'general') => {
    return getAssessmentStatus(score, type).color;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateAverageScore = (results) => {
    if (results.length === 0) return 0;
    const totalScore = results.reduce((sum, result) => {
      return sum + (result.overallScore || result.percentage || 0);
    }, 0);
    return totalScore / results.length;
  };

  const calculateMedianScore = (results) => {
    const scores = results.map((result) => result.overallScore || result.percentage || 0).sort((a, b) => a - b);
    const mid = Math.floor(scores.length / 2);
    return scores.length % 2 !== 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
  };

  const calculateStandardDeviation = (results) => {
    const average = calculateAverageScore(results);
    const variance = results.reduce((sum, result) => {
      const score = result.overallScore || result.percentage || 0;
      return sum + Math.pow(score - average, 2);
    }, 0) / results.length;
    return Math.sqrt(variance);
  };

  const calculatePercentageAboveThreshold = (data, threshold) => {
    if (!data || data.length === 0) return 0;
    const above = data.filter(item => (item.percentage || item.overallScore || item.totalScore || 0) >= threshold);
    return (above.length / data.length) * 100;
  };

  const getHeatmapColor = (value, min = 0, max = 100, type = 'blue') => {
    const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
    const colors = {
      green: `rgba(16, 185, 129, ${percentage * 0.4 + 0.05})`,
      blue: `rgba(59, 130, 246, ${percentage * 0.4 + 0.05})`,
      orange: `rgba(245, 158, 11, ${percentage * 0.4 + 0.05})`,
      red: `rgba(239, 68, 68, ${percentage * 0.4 + 0.05})`,
      purple: `rgba(139, 92, 246, ${percentage * 0.4 + 0.05})`
    };
    return colors[type] || colors.blue;
  };

  const calculateHighestScore = (results) => {
    if (results.length === 0) return 0;
    return Math.max(...results.map(result => result.overallScore || result.percentage || 0));
  };

  const calculateLowestScore = (results) => {
    if (results.length === 0) return 0;
    return Math.min(...results.map(result => result.overallScore || result.percentage || 0));
  };

  const getScoreDistribution = (results) => {
    const distribution = {
      '0-49': 0,
      '50-74': 0,
      '75-89': 0,
      '90-100': 0
    };

    results.forEach(result => {
      const score = result.overallScore || result.percentage || 0;
      if (score >= 90) {
        distribution['90-100']++;
      } else if (score >= 75) {
        distribution['75-89']++;
      } else if (score >= 50) {
        distribution['50-74']++;
      } else {
        distribution['0-49']++;
      }
    });

    return distribution;
  };

  const identifyStrengthsAndWeaknesses = () => {
    const categories = {};

    // Aggregate from quizzes
    quizResults.forEach(res => {
      res.userAnswers?.forEach(ans => {
        if (!ans.category) return;
        if (!categories[ans.category]) categories[ans.category] = { total: 0, count: 0, type: 'theoretical' };
        categories[ans.category].total += (ans.score || 0);
        categories[ans.category].count += 2; // Each MCQ is 2 points
      });
    });

    // Aggregate from practicals
    jobAssessments.forEach(res => {
      res.checkpoints?.forEach(cp => {
        if (!cp.category) return;
        if (!categories[cp.category]) categories[cp.category] = { total: 0, count: 0, type: 'practical' };
        categories[cp.category].total += (cp.score || 0);
        categories[cp.category].count += 5; // practical scale 0-5
      });
    });

    const analysis = Object.keys(categories).map(cat => ({
      name: cat,
      score: (categories[cat].total / categories[cat].count) * 100,
      type: categories[cat].type
    })).sort((a, b) => b.score - a.score);

    return {
      strengths: analysis.slice(0, 3).filter(a => a.score >= 75),
      weaknesses: analysis.slice(-3).reverse().filter(a => a.score < 60)
    };
  };

  const handleGenerateFullReport = async () => {
    try {
      setGeneratingReport(true);
      const { strengths, weaknesses } = identifyStrengthsAndWeaknesses();
      const theoreticalAvg = quizResults.length > 0 ? calculateAverageScore(quizResults) : null;
      const practicalAvg = jobAssessments.length > 0 ? calculateAverageScore(jobAssessments) : null;
      const labAvg = labAssessments.length > 0 ? calculateAverageScore(labAssessments) : null;

      const assessedCount = [theoreticalAvg, practicalAvg, labAvg].filter(v => v !== null).length;
      if (assessedCount === 0) {
        alert('No assessments available for this team.');
        setGeneratingReport(false);
        return;
      }

      const markdown = `
**Team Name:** ${selectedTeam.teamName}
**Company:** ${selectedTeam.teamCompany}
**Date:** ${new Date().toLocaleDateString()}


---

## 1. PERFORMANCE SUMMARY
This report provides a comprehensive analysis of the team's proficiency across Theoretical knowledge, Practical field application, and Lab environments.

| Assessment Type | Average Score | Status |
| :--- | :--- | :--- |
| **Theoretical (Quiz)** | ${theoreticalAvg !== null ? `${Math.round(theoreticalAvg)}%` : 'Not Assessed'} | ${theoreticalAvg !== null ? getAssessmentStatus(theoreticalAvg, 'quiz').label : 'N/A'} |
| **Practical (Field)** | ${practicalAvg !== null ? `${Number(practicalAvg).toFixed(1)}/5` : 'Not Assessed'} | ${practicalAvg !== null ? getAssessmentStatus(practicalAvg, 'practical').label : 'N/A'} |
| **Lab Assessment** | ${labAvg !== null ? `${Math.round(labAvg)}%` : 'Not Assessed'} | ${labAvg !== null ? getAssessmentStatus(labAvg, 'lab').label : 'N/A'} |

---

## 2. ADVANCED ANALYTICS
**Mastery Level:** ${Math.round(([theoreticalAvg, practicalAvg ? practicalAvg * 20 : null, labAvg].filter(v => v !== null).reduce((a, b) => a + b, 0)) / assessedCount)}%

### Key Strengths
${strengths.map(s => `- **${s.name}**: Demonstrating mastery with ${Math.round(s.score)}% proficiency.`).join('\n') || 'N/A'}

### Areas for Improvement
${weaknesses.map(w => `- **${w.name}**: Scoring ${Math.round(w.score)}%. Focused training recommended.`).join('\n') || 'N/A'}

---

## 3. TREND ANALYSIS
- **Theoretical Trend:** ${quizResults.length > 1 ? (quizResults[0].percentage > quizResults[1].percentage ? 'Improving' : 'Declining') : theoreticalAvg !== null ? 'Stable' : 'Not Assessed'}
- **Practical Consistency:** ${jobAssessments.length > 0 ? (calculateStandardDeviation(jobAssessments) < 10 ? 'High (Low Variance)' : 'Variable (High Variance)') : 'Not Assessed'}

---

## 4. FINAL RECOMMENDATIONS
${([theoreticalAvg, practicalAvg ? practicalAvg * 20 : null, labAvg].filter(v => v !== null).reduce((a, b) => a + b, 0)) / assessedCount > 85
          ? "The team shows excellent alignment with quality standards. Recommend for high-complexity projects."
          : "Focused technical workshops and practical drills are recommended to bridge identified gaps."}

---
*Report generated automatically by Reach Quality Management System*
      `;

      const response = await api.post("/ai/report/download", {
        reportContent: markdown,
        format: 'pdf',
        title: `Full Evaluation - ${selectedTeam.teamName}`
      }, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Final_Evaluation_${selectedTeam.teamName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Report generation failed:", err);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Export functions for individual test types
  const exportTheoreticalToExcel = () => {
    const data = quizResults.map(r => ({
      'Date': formatDate(r.submittedAt),
      'Quiz Code': r.quizCode,
      'Score': r.score,
      'Correct Answers': `${r.correctAnswers}/${r.totalQuestions}`,
      'Percentage': `${r.percentage}%`
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Theoretical");
    XLSX.writeFile(wb, `${selectedTeam.teamName}_Theoretical_Assessments.xlsx`);
  };

  const exportPracticalToExcel = () => {
    const data = jobAssessments.map(a => ({
      'Date': formatDate(a.assessmentDate),
      'Conducted By': a.conductedBy,
      'Score': `${Number(a.overallScore).toFixed(1)}/5`,
      'Status': getAssessmentStatus(a.overallScore, 'practical').label
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Practical");
    XLSX.writeFile(wb, `${selectedTeam.teamName}_Practical_Assessments.xlsx`);
  };

  const exportLabToExcel = () => {
    const data = labAssessments.map(a => ({
      'Date': formatDate(a.createdAt),
      'Type': a.assessmentType || 'Technical',
      'ONT Type': a.ontType?.name || 'N/A',
      'Score': `${a.totalScore}%`,
      'Comments': a.comments || '-'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lab");
    XLSX.writeFile(wb, `${selectedTeam.teamName}_Lab_Assessments.xlsx`);
  };

  const exportTestToPDF = async (testType, data) => {
    try {
      let markdown = '';
      if (testType === 'theoretical') {
        markdown = `
** Team:** ${selectedTeam.teamName}
** Company:** ${selectedTeam.teamCompany}
** Date:** ${new Date().toLocaleDateString()}

## Summary
          - ** Total Assessments:** ${data.length}
- ** Average Score:** ${Math.round(calculateAverageScore(data))}%
- ** Highest Score:** ${calculateHighestScore(data)}%
- ** Lowest Score:** ${calculateLowestScore(data)}%

## Assessment History
${data.map((r, i) => `
### ${i + 1}. ${formatDate(r.submittedAt)}
- **Quiz Code:** ${r.quizCode}
- **Score:** ${r.score}
- **Percentage:** ${r.percentage}%
`).join('\n')
          }
        `;
      } else if (testType === 'practical') {
        markdown = `
**Team:** ${selectedTeam.teamName}
**Company:** ${selectedTeam.teamCompany}
**Date:** ${new Date().toLocaleDateString()}

## Summary
- **Total Assessments:** ${data.length}
- **Average Score:** ${Number(calculateAverageScore(data)).toFixed(1)}/5
- **Highest Score:** ${Number(calculateHighestScore(data)).toFixed(1)}/5
- **Lowest Score:** ${Number(calculateLowestScore(data)).toFixed(1)}/5

## Assessment History
${data.map((a, i) => `
### ${i + 1}. ${formatDate(a.assessmentDate)}
- **Conducted By:** ${a.conductedBy}
- **Score:** ${Number(a.overallScore).toFixed(1)}/5
- **Status:** ${getAssessmentStatus(a.overallScore, 'practical').label}
`).join('\n')}
        `;
      } else if (testType === 'lab') {
        markdown = `
** Team:** ${selectedTeam.teamName}
** Company:** ${selectedTeam.teamCompany}
** Date:** ${new Date().toLocaleDateString()}

## Summary
          - ** Total Assessments:** ${data.length}
- ** Average Score:** ${Math.round(calculateAverageScore(data))}%
- ** Highest Score:** ${calculateHighestScore(data)}%
- ** Lowest Score:** ${calculateLowestScore(data)}%

## Assessment History
${data.map((a, i) => `
### ${i + 1}. ${formatDate(a.createdAt)}
- **Type:** ${a.assessmentType || 'Technical'}
- **ONT Type:** ${a.ontType?.name || 'N/A'}
- **Score:** ${a.totalScore}%
- **Comments:** ${a.comments || 'N/A'}
`).join('\n')
          }
        `;
      }

      const response = await api.post("/ai/report/download", {
        reportContent: markdown,
        format: 'pdf',
        title: `${testType.toUpperCase()} ASSESSMENT - ${selectedTeam.teamName} `
      }, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')} `,
        }
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedTeam.teamName}_${testType.charAt(0).toUpperCase() + testType.slice(1)} _Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`${testType} PDF export failed: `, err);
    }
  };



  const handleExportFullPerformanceToExcel = () => {
    if (!selectedTeam) return;

    const wb = XLSX.utils.book_new();

    // 1. Overview Summary Sheet
    const summaryData = [
      { Metric: 'Team Name', Value: selectedTeam.teamName },
      { Metric: 'Company', Value: selectedTeam.teamCompany },
      { Metric: 'Export Date', Value: new Date().toLocaleString() },
      { Metric: '', Value: '' },
      { Metric: '--- KEY PERFORMANCE INDICATORS ---', Value: '' },
      { Metric: 'Total NPS Tickets', Value: stats.technicalTasksCount },
      { Metric: 'Total Detractors (Score <= 60)', Value: stats.technicalDetractors },
      { Metric: 'Total Neutrals (Score 61-80)', Value: stats.technicalNeutrals },
      { Metric: 'Total Customer Issues (Snags & Complaints)', Value: stats.customerIssuesCount },
      { Metric: 'Issue Resolution Rate', Value: `${stats.resolutionRate}% ` },
      { Metric: 'Theoretical Avg Score', Value: `${Math.round(calculateAverageScore(quizResults))}% ` },
      {
        Metric: 'Practical Avg Score', Value: `${Number(calculateAverageScore(jobAssessments)).toFixed(2)}/5`
      },
      { Metric: 'Lab Avg Score', Value: `${Math.round(calculateAverageScore(labAssessments))}%` },
      { Metric: 'Avg Dispatch Time (Days)', Value: stats.avgDispatchTime },
      { Metric: 'Avg Resolution Time (Days)', Value: stats.avgResolutionTime },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Overview Summary");

    // 2. NPS Tickets Sheet
    const techTasksData = technicalTasks.map(t => mapItemToExcelRow(t, 'task'));
    const wsTech = XLSX.utils.json_to_sheet(techTasksData);
    XLSX.utils.book_append_sheet(wb, wsTech, "NPS Tickets");

    // 3. Customer Issues Sheet
    const issuesData = filteredIssuesByDate.map(i => mapItemToExcelRow(i, 'issue'));
    const wsIssues = XLSX.utils.json_to_sheet(issuesData);
    XLSX.utils.book_append_sheet(wb, wsIssues, "Customer Issues");

    // 4. Assessments Sheet (Theoretical/Practical/Lab Combined)
    const quizData = quizResults.map(q => ({
      Type: 'Theoretical',
      Date: formatDate(q.submittedAt),
      Identifier: q.quizCode,
      Score: `${q.percentage}%`,
      Result: q.percentage >= 70 ? 'Pass' : 'Fail'
    }));
    const practicalData = jobAssessments.map(a => ({
      Type: 'Practical',
      Date: formatDate(a.assessmentDate),
      Identifier: `By ${a.conductedBy}`,
      Score: `${Number(a.overallScore).toFixed(1)}/5`,
      Result: getAssessmentStatus(a.overallScore, 'practical').label
    }));
    const labData = labAssessments.map(l => ({
      Type: 'Lab',
      Date: formatDate(l.createdAt),
      Identifier: l.assessmentType || 'General',
      Score: `${l.totalScore}%`,
      Result: getAssessmentStatus(l.totalScore, 'lab').label
    }));
    const consolidatedAssessments = [...quizData, ...practicalData, ...labData];
    const wsAssessments = XLSX.utils.json_to_sheet(consolidatedAssessments);
    XLSX.utils.book_append_sheet(wb, wsAssessments, "Assessments History");

    XLSX.writeFile(wb, `${selectedTeam.teamName.replace(/\s+/g, '_')}_Full_Performance_Report.xlsx`);
  };



  const handleExportLeaderboard = () => {
    // 1. Summary Ranking Data
    const summaryData = leaderboardData.map((team, index) => ({
      'Rank': index + 1,
      'Team Name': team.teamName,
      'Company': team.teamCompany,
      // 'Region': team.governorate,
      'Total NPS Tasks': team.totalNpsTickets,
      'NPS Detractors': team.npsDetractors,
      'Detractor Rate %': team.totalNpsTickets > 0 ? ((team.npsDetractors / team.totalNpsTickets) * 100).toFixed(1) : '0.0',
      'NPS Neutrals': team.npsNeutrals,
      'Total Issues': team.issueViolations,
      'Open Cases': team.openCount,
      'Avg Resolution Time (Days)': team.avgResolutionTime,
      'Resolution Rate (%)': team.resPercent,
      'Total Violations (Tasks + Issues)': team.totalViolations,
      'Total Points': team.totalPoints,
      // 'Performance Score': Math.max(0, 100 - (team.totalPoints / 10)).toFixed(1) // Simple heuristic
    }));

    // 2. Global Deep Dive Data (All violations from all teams)
    const allViolations = [];
    leaderboardData.forEach(team => {
      team.rawDetractors.forEach(t => allViolations.push(mapItemToExcelRow(t, 'task')));
      team.rawNeutrals.forEach(t => allViolations.push(mapItemToExcelRow(t, 'task')));
      team.rawIssues.forEach(i => allViolations.push(mapItemToExcelRow(i, 'issue')));
    });

    const wb = XLSX.utils.book_new();

    // Add Summary Sheet
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Performance Ranking");

    // Add Detailed Sheet
    const wsDetails = XLSX.utils.json_to_sheet(allViolations);
    XLSX.utils.book_append_sheet(wb, wsDetails, "Global Violation Deep-Dive");

    // Auto-size columns for both sheets
    [wsSummary, wsDetails].forEach(ws => {
      const range = XLSX.utils.decode_range(ws['!ref']);
      const cols = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxLen = 10;
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
          if (cell && cell.v) {
            const len = cell.v.toString().length;
            if (len > maxLen) maxLen = len;
          }
        }
        cols.push({ wch: maxLen + 2 });
      }
      ws['!cols'] = cols;
    });

    XLSX.writeFile(wb, `Team_Performance_Ranking_DeepDive_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const renderLineChart = (data, dataKey, color = colors.primary) => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} style={{ backgroundColor: colors.surfaceElevated, borderRadius: '12px', padding: '10px' }}>
        <defs>
          <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} vertical={false} />
        <XAxis
          dataKey="date"
          stroke={colors.textSecondary}
          fontSize={10}
          tick={{ fill: colors.textSecondary }}
        />
        <YAxis
          stroke={colors.textSecondary}
          fontSize={10}
          tick={{ fill: colors.textSecondary }}
          domain={[0, 100]}
        />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: '#252525',
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
            color: colors.textPrimary
          }}
          itemStyle={{ color: color }}
          cursor={{ stroke: color, strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fillOpacity={1}
          fill={`url(#color${dataKey})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderBarChart = (data) => (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data} style={{ backgroundColor: colors.surfaceElevated, borderRadius: '12px', padding: '10px' }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} vertical={false} />
        <XAxis
          dataKey="range"
          stroke={colors.textSecondary}
          fontSize={10}
        />
        <YAxis
          stroke={colors.textSecondary}
          fontSize={10}
        />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: '#252525',
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
            color: colors.textPrimary
          }}
        />
        <RechartsBar dataKey="count" fill={colors.primary} radius={[4, 4, 0, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );

  const quizData = quizResults.map(result => ({
    date: result.submittedAt ? formatDate(result.submittedAt) : 'N/A',
    score: result.percentage
  }));

  const jobData = jobAssessments.map(assessment => ({
    date: formatDate(assessment.assessmentDate),
    score: assessment.overallScore
  }));

  const quizDistribution = getScoreDistribution(quizResults);
  const jobDistribution = getScoreDistribution(jobAssessments);

  const quizDistributionData = Object.keys(quizDistribution).map(range => ({
    range,
    count: quizDistribution[range]
  }));

  const jobDistributionData = Object.keys(jobDistribution).map(range => ({
    range,
    count: jobDistribution[range]
  }));

  const leaderboardData = useMemo(() => {
    if (!fieldTeams.length) return [];

    const processed = fieldTeams.map(team => {
      // 1. Technical Tasks Filter (NPS) with Date Filter
      const teamTechTasks = (Array.isArray(allTechnicalTasksGlobal) ? allTechnicalTasksGlobal : []).filter(t => {
        const isTeam = t.teamId === team._id || t.teamName === team.teamName;
        if (!isTeam) return false;

        if (leaderboardDateFilter.start || leaderboardDateFilter.end) {
          const taskDate = new Date(t.executionDate || t.createdAt);
          if (leaderboardDateFilter.start && taskDate < new Date(leaderboardDateFilter.start)) return false;
          if (leaderboardDateFilter.end) {
            const end = new Date(leaderboardDateFilter.end);
            end.setHours(23, 59, 59, 999);
            if (taskDate > end) return false;
          }
        }
        return true;
      });

      // 2. Customer Issues Filter with Date Filter
      const teamIssues = (Array.isArray(allCustomerIssuesGlobal) ? allCustomerIssuesGlobal : []).filter(i => {
        const isTeam = i.installingTeam === team.teamName || i.assignedTo === team.teamName || i.teamName === team.teamName;
        if (!isTeam) return false;

        if (leaderboardDateFilter.start || leaderboardDateFilter.end) {
          const issueDate = new Date(i.date || i.createdAt);
          if (leaderboardDateFilter.start && issueDate < new Date(leaderboardDateFilter.start)) return false;
          if (leaderboardDateFilter.end) {
            const end = new Date(leaderboardDateFilter.end);
            end.setHours(23, 59, 59, 999);
            if (issueDate > end) return false;
          }
        }
        return true;
      });

      // NPS Violations Breakdown
      const npsDetractors = teamTechTasks.filter(t => {
        let score = t.evaluationScore || 0;
        if (score > 0) {
          if (score <= 10) score = score * 10;
          return score <= 60;
        }
        return false;
      });

      const npsNeutrals = teamTechTasks.filter(t => {
        let score = t.evaluationScore || 0;
        if (score > 0) {
          if (score <= 10) score = score * 10;
          return score > 60 && score <= 80;
        }
        return false;
      });

      // Customer Issues Breakdown
      const totalIssues = teamIssues.length;
      const resolvedCount = teamIssues.filter(i => i.solved === 'yes').length;
      const resPercent = totalIssues > 0 ? ((resolvedCount / totalIssues) * 100).toFixed(1) : 0;

      const openCases = teamIssues.filter(i => {
        return i.dispatched === 'yes' && i.solved === 'no';
      });

      const totalNpsTickets = teamTechTasks.length;

      const reachViolationsCount = [
        ...npsDetractors,
        ...npsNeutrals
      ].filter(t => (t.responsible && t.responsible.includes('Reach')) || t.owner === 'Reach').length;

      // Avg Resolution Time (Days)
      const solvedIssuesForAvg = teamIssues.filter(i => i.solved === 'yes' && i.resolveDate && (i.pisDate || i.createdAt));
      const totalDays = solvedIssuesForAvg.reduce((sum, i) => {
        const reportDate = new Date(i.pisDate || i.createdAt);
        const resolvedDate = new Date(i.resolveDate);
        return sum + (resolvedDate - reportDate) / (1000 * 60 * 60 * 24);
      }, 0);
      const avgResolutionTime = solvedIssuesForAvg.length > 0 ? (totalDays / solvedIssuesForAvg.length).toFixed(1) : '-';

      return {
        ...team,
        totalNpsTickets,
        reachViolationsCount,
        npsDetractors: npsDetractors.length,
        npsNeutrals: npsNeutrals.length,
        issueViolations: totalIssues,
        resPercent,
        openCount: openCases.length,
        avgResolutionTime,
        totalViolations: totalNpsTickets + totalIssues, // Total violations = Total NPS Tickets + Total Customer Issues

        // Calculate Total Points using the helper
        totalPoints: (() => {
          let points = 0;
          teamTechTasks.forEach(t => { points += calculateItemPoints(t, 'task'); });
          teamIssues.forEach(i => { points += calculateItemPoints(i, 'issue'); });
          return points;
        })(),

        // Raw data for drill-down
        rawDetractors: npsDetractors,
        rawNeutrals: npsNeutrals,
        rawIssues: teamIssues,
        rawOpen: openCases
      };
    });

    // Apply basic search filter
    let filtered = processed.filter(team =>
      team.teamName?.toLowerCase().includes(leaderboardSearchQuery.toLowerCase()) ||
      team.teamCompany?.toLowerCase().includes(leaderboardSearchQuery.toLowerCase()) ||
      team.governorate?.toLowerCase().includes(leaderboardSearchQuery.toLowerCase())
    );

    // Apply status filter
    if (leaderboardStatusQuery === 'detractors') {
      filtered = filtered.filter(team => team.npsDetractors > 0);
    } else if (leaderboardStatusQuery === 'issues') {
      filtered = filtered.filter(team => team.issueViolations > 0);
    } else if (leaderboardStatusQuery === 'open') {
      filtered = filtered.filter(team => team.openCount > 0);
    }

    // Apply Advanced threshold filters
    if (leaderboardThresholds.minIssues) {
      filtered = filtered.filter(team => team.issueViolations >= parseFloat(leaderboardThresholds.minIssues));
    }
    if (leaderboardThresholds.minSuccessRate) {
      filtered = filtered.filter(team => parseFloat(team.resPercent) >= parseFloat(leaderboardThresholds.minSuccessRate));
    }

    return filtered.sort((a, b) => {
      let valA = a[leaderboardSort.field], valB = b[leaderboardSort.field];
      if (['totalNpsTickets', 'npsDetractors', 'npsNeutrals', 'issueViolations', 'openCount', 'resPercent', 'totalViolations', 'totalPoints'].includes(leaderboardSort.field)) {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      }
      if (leaderboardSort.field === 'avgResolutionTime') {
        valA = valA === '-' ? Infinity : parseFloat(valA);
        valB = valB === '-' ? Infinity : parseFloat(valB);
        // For speed, lower is usually better, but let's keep it consistent with the user's expectation of ranking.
      }
      return leaderboardSort.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [fieldTeams, allTechnicalTasksGlobal, allCustomerIssuesGlobal, leaderboardSearchQuery, leaderboardStatusQuery, leaderboardSort, leaderboardDateFilter, leaderboardThresholds, settings, calculateItemPoints]);

  const paginatedLeaderboardData = useMemo(() => {
    const startIndex = leaderboardPage * leaderboardRowsPerPage;
    return leaderboardData.slice(startIndex, startIndex + leaderboardRowsPerPage);
  }, [leaderboardData, leaderboardPage, leaderboardRowsPerPage]);

  // Custom styles for MUI components to ensure dark mode consistency
  const darkThemeStyles = {
    paper: {
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      border: `1px solid ${colors.border}`,
    },
    table: {
      backgroundColor: colors.tableBg,
    },
    tableHead: {
      backgroundColor: colors.tableHeaderBg,
    },
    tableCell: {
      color: colors.textPrimary,
      borderBottom: `1px solid ${colors.border}`,
    },
    tablePagination: {
      color: colors.textPrimary,
      "& .MuiSvgIcon-root": {
        color: colors.textPrimary,
      },
    },
    card: {
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      border: `1px solid ${colors.border}`,
    },
    tabs: {
      backgroundColor: colors.surface,
      "& .MuiTab-root": {
        color: colors.textSecondary,
      },
      "& .Mui-selected": {
        color: colors.primary,
      },
      "& .MuiTabs-indicator": {
        backgroundColor: colors.primary,
      },
    },
    autocomplete: {
      "& .MuiOutlinedInput-root": {
        backgroundColor: colors.surfaceElevated,
        "& fieldset": {
          borderColor: colors.border,
        },
        "&:hover fieldset": {
          borderColor: colors.primary,
        },
      },
      "& .MuiAutocomplete-paper": {
        backgroundColor: colors.surface,
        color: colors.textPrimary,
      },
    },
    chip: {
      borderColor: colors.border,
    },
  };

  return (
    <Box sx={{
      // backgroundColor: colors.background,
      minHeight: '100vh',
      // maxWidth: '1100px',
      mx: 'auto',
      overflowX: 'hidden',
      color: colors.textPrimary,
      p: 2,
      px: isMobile ? 0 : undefined
    }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/')}
        sx={{
          mb: 2,
          color: colors.primary,
          '&:hover': {
            backgroundColor: colors.primaryHover
          }
        }}
      >
        Back to Dashboard
      </Button>

      {/* Header with Premium Gradient */}
      <Box sx={{
        mb: 4,
        p: 4,
        background: `linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)`, // Deep tech gradient
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
      }}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h3" sx={{
            background: 'linear-gradient(90deg, #fff 0%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: '900',
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            letterSpacing: '-1px'
          }}>
            Field Team Portal
          </Typography>
          <Typography variant="h6" sx={{ color: colors.textSecondary, fontWeight: 400 }}>
            Advanced Performance Analytics & Operational Intelligence
          </Typography>
        </Box>
        {/* Decorative Circle */}
        <Box sx={{
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '300px',
          height: '300px',
          background: colors.primary,
          filter: 'blur(100px)',
          opacity: 0.2,
          borderRadius: '50%'
        }} />
      </Box>

      {/* Team Selection with Glass Effect */}
      <Paper sx={{
        p: 3,
        mb: 4,
        ...colors.glass,
        borderRadius: '20px',
      }}>
        <Autocomplete
          options={fieldTeams}
          getOptionLabel={(option) => `${option.teamName} (${option.teamCompany})`}
          value={selectedTeam}
          onChange={(event, newValue) => {
            if (newValue) {
              navigate(`/fieldTeams-portal/${newValue._id}`);
            } else {
              navigate('/fieldTeams-portal');
            }
            setQuizPage(0);
            setJobPage(0);
          }}
          disabled={loading}
          fullWidth
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Field Team to Analyze"
              variant="outlined"
              placeholder="Search by team name..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '12px',
                  color: '#fff',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                  '&:hover fieldset': { borderColor: colors.primary },
                  '&.Mui-focused fieldset': { borderColor: colors.primary, borderWidth: '2px' },
                },
                '& .MuiInputLabel-root': { color: colors.textSecondary },
                '& .MuiInputLabel-root.Mui-focused': { color: colors.primary }
              }}
            />
          )}
          PaperComponent={({ children }) => (
            <Paper sx={{ ...colors.glass, bgcolor: '#1a1a1a', mt: 1 }}>{children}</Paper>
          )}
        />
      </Paper>

      {/* 8. LEADERBOARD (Visible only when no team is selected) */}
      {!selectedTeam && (
        <Box sx={{ animation: 'fadeIn 0.5s ease-in', mb: 6 }}>
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" sx={{ color: '#fff', fontWeight: 900, letterSpacing: -1 }}>
                Team <span style={{ color: colors.primary }}>Leaderboard</span>
              </Typography>
              <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                Global ranking of teams by total violations (NPS Detractors + Customer Issues)
              </Typography>
            </Box>
            {loadingGlobal && <CircularProgress size={24} sx={{ color: colors.primary }} />}
          </Box>

          {/* Global View Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)', mb: 3 }}>
            <Tabs
              value={globalTab}
              onChange={(e, v) => setGlobalTab(v)}
              sx={{
                '& .MuiTab-root': { color: colors.textSecondary, textTransform: 'none', fontSize: '1rem', fontWeight: 500, minHeight: 48 },
                '& .Mui-selected': { color: colors.primary },
                '& .MuiTabs-indicator': { bgcolor: colors.primary }
              }}
            >
              <Tab label="Leaderboard" icon={<LeaderboardIcon />} iconPosition="start" />
              <Tab label="Global Analytics" icon={<BarChartIconMUI />} iconPosition="start" />
            </Tabs>
          </Box>

          {/* TAB 0: LEADERBOARD */}
          {globalTab === 0 && (
            <>
              {/* Magic Table Controls: Advanced Search & Filter */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'stretch', mb: 2 }}>
                  <Paper sx={{
                    p: 2,
                    flex: 1,
                    minWidth: '300px',
                    ...colors.glass,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <SearchIcon sx={{ color: colors.primary, mr: 2, fontSize: '1.2rem' }} />
                    <TextField
                      placeholder="Search by Team Name, Company, or Region..."
                      variant="standard"
                      fullWidth
                      value={leaderboardSearchQuery}
                      onChange={(e) => {
                        setLeaderboardSearchQuery(e.target.value);
                        setLeaderboardPage(0); // Reset to first page on search
                      }}
                      InputProps={{
                        disableUnderline: true,
                        sx: { color: '#fff', fontSize: '1rem', fontWeight: 300, letterSpacing: '0.5px' }
                      }}
                    />
                    {leaderboardSearchQuery && (
                      <IconButton size="small" onClick={() => setLeaderboardSearchQuery('')} sx={{ color: colors.textSecondary }}>
                        <FaTimes />
                      </IconButton>
                    )}
                  </Paper>

                  <FormControl sx={{ minWidth: 200, ...colors.glass, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Select
                      value={leaderboardStatusQuery}
                      onChange={(e) => {
                        setLeaderboardStatusQuery(e.target.value);
                        setLeaderboardPage(0);
                      }}
                      displayEmpty
                      variant="standard"
                      disableUnderline
                      sx={{
                        height: '100%',
                        px: 2,
                        color: '#fff',
                        fontWeight: 300,
                        '& .MuiSelect-select': { py: 1.5 }
                      }}
                    >
                      <MenuItem value="all">All Rankings</MenuItem>
                      <MenuItem value="detractors">Has Detractors</MenuItem>
                      <MenuItem value="issues">Has Key Issues</MenuItem>
                      <MenuItem value="open">Has Open Cases</MenuItem>
                    </Select>
                  </FormControl>

                  <Button
                    variant="outlined"
                    startIcon={<FaFilter />}
                    onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
                    sx={{
                      borderRadius: '16px',
                      color: advancedFiltersOpen ? colors.primary : colors.textSecondary,
                      borderColor: advancedFiltersOpen ? colors.primary : 'rgba(255,255,255,0.1)',
                      background: advancedFiltersOpen ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                      textTransform: 'none',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: colors.primary, background: 'rgba(139, 92, 246, 0.1)' }
                    }}
                  >
                    Advanced
                  </Button>

                  <Button
                    variant="contained"
                    startIcon={<TableChartIcon />}
                    onClick={handleExportLeaderboard}
                    sx={{
                      borderRadius: '16px',
                      px: 3,
                      background: colors.primaryGradient,
                      textTransform: 'none',
                      fontWeight: 700,
                      boxShadow: `0 8px 20px ${colors.primary}40`,
                      '&:hover': { transform: 'translateY(-2px)', filter: 'brightness(1.1)' },
                      transition: 'all 0.2s'
                    }}
                  >
                    Export Ranking
                  </Button>
                </Box>

                {advancedFiltersOpen && (
                  <Box sx={{
                    p: 3,
                    mb: 3,
                    ...colors.glass,
                    borderRadius: '20px',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    animation: 'slideDown 0.3s ease-out'
                  }}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 900, mb: 1, display: 'block' }}>START DATE</Typography>
                        <TextField
                          type="date"
                          fullWidth
                          variant="standard"
                          InputProps={{ disableUnderline: true, sx: { color: '#fff', fontWeight: 300 } }}
                          value={leaderboardDateFilter.start}
                          onChange={(e) => {
                            setLeaderboardDateFilter({ ...leaderboardDateFilter, start: e.target.value });
                            setLeaderboardPage(0);
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 900, mb: 1, display: 'block' }}>END DATE</Typography>
                        <TextField
                          type="date"
                          fullWidth
                          variant="standard"
                          InputProps={{ disableUnderline: true, sx: { color: '#fff', fontWeight: 300 } }}
                          value={leaderboardDateFilter.end}
                          onChange={(e) => {
                            setLeaderboardDateFilter({ ...leaderboardDateFilter, end: e.target.value });
                            setLeaderboardPage(0);
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 900, mb: 1, display: 'block' }}>MIN ISSUES</Typography>
                        <TextField
                          placeholder="e.g. 5"
                          type="number"
                          fullWidth
                          variant="standard"
                          InputProps={{ disableUnderline: true, sx: { color: '#fff', fontWeight: 300 } }}
                          value={leaderboardThresholds.minIssues}
                          onChange={(e) => {
                            setLeaderboardThresholds({ ...leaderboardThresholds, minIssues: e.target.value });
                            setLeaderboardPage(0);
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 900, mb: 1, display: 'block' }}>MIN SUCCESS %</Typography>
                        <TextField
                          placeholder="e.g. 80"
                          type="number"
                          fullWidth
                          variant="standard"
                          InputProps={{ disableUnderline: true, sx: { color: '#fff', fontWeight: 300 } }}
                          value={leaderboardThresholds.minSuccessRate}
                          onChange={(e) => {
                            setLeaderboardThresholds({ ...leaderboardThresholds, minSuccessRate: e.target.value });
                            setLeaderboardPage(0);
                          }}
                        />
                      </Grid>
                    </Grid>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        sx={{ color: colors.error, fontWeight: 700 }}
                        onClick={() => {
                          setLeaderboardDateFilter({ start: '', end: '' });
                          setLeaderboardThresholds({ minIssues: '', minSuccessRate: '' });
                        }}
                      >
                        Clear All Filters
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>

              <TableContainer component={Paper} sx={{
                ...colors.glass,
                borderRadius: '24px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                    <TableRow>
                      <TableCell sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>RANK</TableCell>
                      <TableCell sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'teamName', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>TEAM NAME</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'totalNpsTickets', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>TOTAL NPS</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'npsDetractors', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>DETRACTORS</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'npsNeutrals', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>NEUTRALS</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'issueViolations', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>KEY ISSUES</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'openCount', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>OPEN CASES</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'avgResolutionTime', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>AVG SPEED</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'resPercent', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>SUCCESS %</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'totalPoints', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>TOTAL POINTS</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setLeaderboardSort({ field: 'totalViolations', direction: leaderboardSort.direction === 'desc' ? 'asc' : 'desc' })}>TOTAL VIOLATIONS</TableCell>
                      <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>ACTIONS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedLeaderboardData.map((team, index) => {
                      const actualRank = (leaderboardPage * leaderboardRowsPerPage) + index + 1;
                      return (
                        <TableRow
                          key={team._id}
                          sx={{
                            bgcolor: 'transparent',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                            transition: 'background 0.2s'
                          }}
                        >
                          <TableCell sx={{ color: colors.textSecondary, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', py: 1 }}>
                            <Box sx={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: index + (leaderboardPage * leaderboardRowsPerPage) === 0 ? 'rgba(245, 158, 11, 0.2)' : index + (leaderboardPage * leaderboardRowsPerPage) === 1 ? 'rgba(209, 213, 219, 0.2)' : index + (leaderboardPage * leaderboardRowsPerPage) === 2 ? 'rgba(180, 83, 9, 0.2)' : 'rgba(255,255,255,0.05)',
                              color: index + (leaderboardPage * leaderboardRowsPerPage) === 0 ? '#f59e0b' : index + (leaderboardPage * leaderboardRowsPerPage) === 1 ? '#d1d5db' : index + (leaderboardPage * leaderboardRowsPerPage) === 2 ? '#b45309' : colors.textSecondary,
                              fontWeight: 800,
                              fontSize: '0.75rem'
                            }}>
                              {actualRank}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1 }}>
                            <Box sx={{ cursor: 'pointer' }} onClick={() => handleTeamSelect(team)}>
                              <Typography sx={{ color: '#fff', fontWeight: 300, fontSize: '0.85rem' }}>{team.teamName}</Typography>
                              <Typography variant="caption" sx={{ color: colors.textSecondary, fontSize: '0.7rem' }}>{team.teamCompany} | {team.governorate}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center" sx={{ color: colors.info, fontWeight: 300, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>{team.totalNpsTickets}</TableCell>
                          <TableCell align="center" onClick={() => handleDrillDown(team, 'detractors')} sx={{ color: colors.error, fontWeight: 300, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', cursor: 'pointer' }}>{team.npsDetractors}</TableCell>
                          <TableCell align="center" onClick={() => handleDrillDown(team, 'neutrals')} sx={{ color: colors.warning, fontWeight: 300, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', cursor: 'pointer' }}>{team.npsNeutrals}</TableCell>
                          <TableCell align="center" onClick={() => handleDrillDown(team, 'issues')} sx={{ color: '#3b82f6', fontWeight: 300, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', cursor: 'pointer' }}>{team.issueViolations}</TableCell>
                          <TableCell align="center" onClick={() => team.openCount > 0 && handleDrillDown(team, 'open')} sx={{ color: team.openCount > 0 ? colors.error : colors.textSecondary, fontWeight: 300, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', cursor: team.openCount > 0 ? 'pointer' : 'default' }}>{team.openCount}</TableCell>
                          <TableCell align="center" sx={{ color: colors.info, fontWeight: 300, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>{team.avgResolutionTime}d</TableCell>
                          <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                            <Typography variant="body2" sx={{
                              color: team.resPercent > 90 ? colors.success : team.resPercent > 70 ? colors.warning : colors.error,
                              fontWeight: 500,
                              fontSize: '0.8rem'
                            }}>
                              {team.resPercent}%
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                            <Chip
                              label={team.totalPoints}
                              size="small"
                              sx={{
                                background: 'rgba(139, 92, 246, 0.1)',
                                color: colors.primary,
                                fontWeight: 800,
                                borderRadius: '8px',
                                height: '22px',
                                fontSize: '0.75rem',
                              }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                            <Chip
                              label={team.totalViolations}
                              onClick={() => handleDrillDown(team, 'violations')}
                              size="small"
                              sx={{
                                background: team.totalViolations === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: team.totalViolations === 0 ? colors.success : colors.error,
                                fontWeight: 700,
                                borderRadius: '8px',
                                height: '22px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                '&:hover': { transform: 'scale(1.1)' }
                              }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1 }}>
                            <MuiTooltip title="Export Detailed Team Report">
                              <IconButton
                                size="small"
                                onClick={() => handleExportIndividualTeam(team)}
                                sx={{
                                  color: colors.success,
                                  bgcolor: 'rgba(16, 185, 129, 0.1)',
                                  '&:hover': {
                                    bgcolor: 'rgba(16, 185, 129, 0.2)',
                                    transform: 'scale(1.1)'
                                  },
                                  transition: 'all 0.2s'
                                }}
                              >
                                <FaFileExcel size={14} />
                              </IconButton>
                            </MuiTooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <TablePagination
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  component="div"
                  count={leaderboardData.length}
                  rowsPerPage={leaderboardRowsPerPage}
                  page={leaderboardPage}
                  onPageChange={(e, newPage) => setLeaderboardPage(newPage)}
                  onRowsPerPageChange={(e) => {
                    setLeaderboardRowsPerPage(parseInt(e.target.value, 10));
                    setLeaderboardPage(0);
                  }}
                  sx={{
                    color: colors.textSecondary,
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    '& .MuiTablePagination-selectIcon': { color: colors.textSecondary },
                    '& .MuiIconButton-root': { color: colors.primary }
                  }}
                />
              </TableContainer >
            </>
          )}

          {/* TAB 1: GLOBAL ANALYTICS */}
          {globalTab === 1 && (
            <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
              <Box sx={{
                display: 'flex',
                flexDirection: isMedium ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMedium ? 'start' : 'center',
                gap: 2,
                mb: 3,
                pb: 1,
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}>
                <Tabs
                  value={analyticsSubTab}
                  onChange={(e, v) => setAnalyticsSubTab(v)}
                  sx={{
                    minHeight: '40px',
                    '& .MuiTab-root': {
                      color: colors.textSecondary,
                      minHeight: '40px',
                      py: 0.5,
                      fontSize: '0.85rem',
                      textTransform: 'none'
                    },
                    '& .Mui-selected': { color: '#fff !important', fontWeight: 'bold' },
                    '& .MuiTabs-indicator': { backgroundColor: '#3b82f6' }
                  }}
                >
                  <Tab label="All Analysis" />
                  <Tab label="Detractors" />
                  <Tab label="Neutrals" />
                </Tabs>

                <Box sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: '20px',
                  bgcolor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                  <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.85rem' }}>
                    <span style={{ color: '#94a3b8' }}>Analyzing:</span> <span style={{ fontWeight: '800', color: '#3b82f6' }}>{globalAnalytics.totalProcessed}</span> <span style={{ color: '#94a3b8' }}>Tasks</span>
                  </Typography>
                </Box>
              </Box>
              <Paper sx={{ p: 2, mb: 3, ...colors.glass, borderRadius: 3 }} elevation={0}>
                <Stack direction={isMedium ? "column" : "row"} spacing={3} alignItems={isMedium ? "start" : "center"}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FilterListIcon sx={{ color: colors.primary }} />
                    <Typography variant="subtitle2" sx={{ color: colors.textSecondary, fontWeight: 700, minWidth: '80px' }}>
                      Time Filter:
                    </Typography>
                  </Box>

                  <ToggleButtonGroup
                    value={timeFilterMode}
                    exclusive
                    onChange={(e, val) => val && setTimeFilterMode(val)}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(0,0,0,0.2)',
                      '& .MuiToggleButton-root': {
                        color: '#94a3b8',
                        borderColor: 'rgba(255,255,255,0.05)',
                        px: 2,
                        py: 0.5,
                        fontSize: '0.75rem',
                        textTransform: 'none',
                        fontWeight: 600,
                        '&.Mui-selected': {
                          bgcolor: 'rgba(139, 92, 246, 0.1)',
                          color: colors.primary,
                          borderColor: 'rgba(139, 92, 246, 0.3)',
                          '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.2)' }
                        }
                      }
                    }}
                  >
                    <ToggleButton value="all" sx={{ gap: 1 }}><CalendarTodayIcon sx={{ fontSize: 16 }} /> All Time</ToggleButton>
                    <ToggleButton value="weeks" sx={{ gap: 1 }}><EventIcon sx={{ fontSize: 16 }} /> Weeks</ToggleButton>
                    <ToggleButton value="months" sx={{ gap: 1 }}><CalendarTodayIcon sx={{ fontSize: 16 }} /> Months</ToggleButton>
                    <ToggleButton value="days" sx={{ gap: 1 }}><UpdateIcon sx={{ fontSize: 16 }} /> Recent Days</ToggleButton>
                    <ToggleButton value="custom" sx={{ gap: 1 }}><FilterListIcon sx={{ fontSize: 16 }} /> Custom</ToggleButton>
                  </ToggleButtonGroup>

                  <Box sx={{ flexGrow: 1, width: '100%' }}>
                    {timeFilterMode === 'days' && (
                      <Stack direction="row" spacing={3} alignItems="center">
                        <Slider
                          value={recentDaysValue}
                          onChange={(e, val) => setRecentDaysValue(val)}
                          min={7}
                          max={365}
                          sx={{ flexGrow: 1, color: colors.primary }}
                          valueLabelDisplay="auto"
                        />
                        <TextField
                          size="small"
                          label="Days"
                          type="number"
                          value={recentDaysValue}
                          onChange={(e) => setRecentDaysValue(Number(e.target.value))}
                          sx={{
                            width: 80,
                            '& .MuiOutlinedInput-root': { color: '#fff', fontSize: '0.8rem' },
                            '& .MuiInputLabel-root': { color: '#94a3b8', fontSize: '0.8rem' }
                          }}
                        />
                      </Stack>
                    )}

                    {timeFilterMode === 'weeks' && (
                      <Autocomplete
                        multiple
                        size="small"
                        options={weekRanges}
                        value={selectedWeeks}
                        onChange={(e, newVal) => setSelectedWeeks(newVal)}
                        renderInput={(params) => (
                          <TextField {...params} label="Select Weeks" variant="outlined" placeholder="Search weeks..." />
                        )}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff', fontSize: '0.8rem',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }
                          },
                          '& .MuiInputLabel-root': { color: '#94a3b8', fontSize: '0.8rem' }
                        }}
                      />
                    )}

                    {timeFilterMode === 'months' && (
                      <Autocomplete
                        multiple
                        size="small"
                        options={monthOptions}
                        getOptionLabel={(option) => option.label}
                        value={monthOptions.filter(m => selectedMonths.includes(m.key))}
                        onChange={(e, newVal) => setSelectedMonths(newVal.map(v => v.key))}
                        renderInput={(params) => (
                          <TextField {...params} label="Select Monthly Periods" variant="outlined" placeholder="Search months..." />
                        )}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff', fontSize: '0.8rem',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }
                          },
                          '& .MuiInputLabel-root': { color: '#94a3b8', fontSize: '0.8rem' }
                        }}
                      />
                    )}

                    {timeFilterMode === 'custom' && (
                      <Stack direction="row" spacing={2}>
                        <TextField
                          size="small"
                          label="Start Date"
                          type="date"
                          value={customDateRange.start}
                          onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                          InputLabelProps={{ shrink: true }}
                          sx={{
                            '& .MuiOutlinedInput-root': { color: '#fff', fontSize: '0.8rem' },
                            '& .MuiInputLabel-root': { color: '#94a3b8', fontSize: '0.8rem' }
                          }}
                        />
                        <TextField
                          size="small"
                          label="End Date"
                          type="date"
                          value={customDateRange.end}
                          onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                          InputLabelProps={{ shrink: true }}
                          sx={{
                            '& .MuiOutlinedInput-root': { color: '#fff', fontSize: '0.8rem' },
                            '& .MuiInputLabel-root': { color: '#94a3b8', fontSize: '0.8rem' }
                          }}
                        />
                      </Stack>
                    )}
                  </Box>

                  <Button
                    size="small"
                    sx={{ color: colors.textSecondary, textTransform: 'none', minWidth: '80px' }}
                  >
                    Reset Filter
                  </Button>
                </Stack>
              </Paper>

              {/* 1. Global Sentiment Segmentation - Deep Dive Port */}
              <Grid container spacing={4} sx={{ mb: 6 }}>
                <Grid item xs={12} md={7}>
                  <Paper sx={{ p: 2.5, ...colors.glass, borderRadius: 4, border: '1px solid rgba(139, 92, 246, 0.2)' }} elevation={0}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 3, height: 20, bgcolor: '#8b5cf6', borderRadius: 4 }} />
                        <Typography variant="h6" fontWeight="800" color="#fff" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.95rem' }}>
                          Sentiment Segmentation <span style={{ color: alpha('#fff', 0.5), fontSize: '0.75rem' }}>Deep Analysis</span>
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => setChartDialog({ open: true, title: 'Sentiment Analysis', data: globalAnalytics.sentimentData, type: 'pie' })}
                          sx={{ color: '#8b5cf6', bgcolor: 'rgba(139, 92, 246, 0.1)', '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.2)' } }}
                        >
                          <MdInsights size={18} />
                        </IconButton>
                      </Box>
                    </Box>
                    <TableContainer sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, fontSize: '0.75rem' } }}>
                        <TableHead>
                          <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: 'rgba(255,255,255,0.03)', color: '#94a3b8', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)' } }}>
                            <TableCell>Customer Sentiment</TableCell>
                            <TableCell align="right">Hit Count</TableCell>
                            <TableCell align="right">Matrix Share</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {globalAnalytics.sentimentData.map((row) => (
                            <TableRow key={row.name} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                              <TableCell sx={{ color: row.color, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.name}</TableCell>
                              <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.value}</TableCell>
                              <TableCell align="right" sx={{
                                bgcolor: getHeatmapColor(parseFloat(row.percentage), 0, 100, row.name === 'Promoters' ? 'green' : row.name === 'Neutrals' ? 'orange' : 'red'),
                                color: '#fff', fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.05)'
                              }}>
                                {row.percentage}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={5}>
                  <Paper sx={{ p: 2.5, ...colors.glass, borderRadius: 4, border: '1px solid rgba(139, 92, 246, 0.1)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} elevation={0}>
                    <ResponsiveContainer width="100%" height={220}>
                      <RechartsPieChart>
                        <RechartsPie
                          data={globalAnalytics.sentimentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={6}
                          dataKey="value"
                          label={({ name, percentage }) => `${percentage}%`}
                        >
                          {globalAnalytics.sentimentData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </RechartsPie>
                        <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }} />
                        <RechartsLegend verticalAlign="bottom" height={30} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
              </Grid>

              {/* Analytical Matrices removed */}


              <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Divider sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                <Typography variant="h6" sx={{ color: '#3b82f6', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>Advanced Analytics Charts & Tables</Typography>
                <Divider sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
              </Box>

              {/* Advanced Analytics Charts & Tables */}
              <Grid container spacing={3}>
                {/* Owner Analysis */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, ...colors.glass, borderRadius: 3, border: '1px solid rgba(59, 130, 246, 0.2)' }} elevation={0}>
                    <Typography variant="h6" fontWeight="700" mb={3} color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SupportAgent sx={{ color: '#3b82f6' }} /> Owner Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={280}>
                      <RechartsBarChart data={globalAnalytics.ownerData}>
                        <defs>
                          <linearGradient id="ownerGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                        <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                        <RechartsTooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <Paper sx={{ p: 1.5, bgcolor: '#1e293b', border: '1px solid #334155', borderRadius: 2, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
                                  <Typography sx={{ color: '#fff', fontWeight: 'bold', fontSize: '0.8rem', mb: 0.5 }}>{label}</Typography>
                                  <Typography sx={{ color: '#3b82f6', fontSize: '0.75rem' }}>Count: <strong>{payload[0].value}</strong></Typography>
                                  <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>Contribution: {payload[0].payload.percentage}%</Typography>
                                </Paper>
                              );
                            }
                            return null;
                          }}
                        />
                        <RechartsBar dataKey="value" fill="url(#ownerGradient)" radius={[6, 6, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                    {/* Detailed Owner Table - Compact Style */}
                    <TableContainer sx={{ mt: 2, maxHeight: 200, overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' } }}>
                      <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Owner</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Points</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Total</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>ITN</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Sub</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>%</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {globalAnalytics.detailedOwners.map((data) => (
                            <TableRow key={data.name} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                              <TableCell sx={{ color: '#e2e8f0' }}>{data.name}</TableCell>
                              <TableCell align="right" sx={{ color: '#10b981', fontWeight: 'bold' }}>{data.points}</TableCell>
                              <TableCell
                                align="right"
                                onClick={() => handleAnalyticsDrillDown({ owner: data.name })}
                                sx={{
                                  color: '#e2e8f0',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }
                                }}
                              >
                                {data.total}
                              </TableCell>
                              <TableCell
                                align="right"
                                onClick={() => data.itn > 0 && handleAnalyticsDrillDown({ owner: data.name, itn: true })}
                                sx={{
                                  color: data.itn > 0 ? '#f59e0b' : '#64748b',
                                  cursor: data.itn > 0 ? 'pointer' : 'default',
                                  '&:hover': data.itn > 0 ? { bgcolor: 'rgba(245, 158, 11, 0.2)' } : {}
                                }}
                              >
                                {data.itn}
                              </TableCell>
                              <TableCell
                                align="right"
                                onClick={() => data.subscription > 0 && handleAnalyticsDrillDown({ owner: data.name, subscription: true })}
                                sx={{
                                  color: data.subscription > 0 ? '#10b981' : '#64748b',
                                  cursor: data.subscription > 0 ? 'pointer' : 'default',
                                  '&:hover': data.subscription > 0 ? { bgcolor: 'rgba(16, 185, 129, 0.2)' } : {}
                                }}
                              >
                                {data.subscription}
                              </TableCell>
                              <TableCell align="right" sx={{ color: '#94a3b8' }}>{data.percentage}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                  </Paper>
                </Grid>

                {/* Reason Breakdown */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, ...colors.glass, borderRadius: 3, border: '1px solid rgba(16, 185, 129, 0.2)' }} elevation={0}>
                    <Typography variant="h6" fontWeight="700" mb={3} color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PriorityHigh sx={{ color: '#10b981' }} /> Reason Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={280}>
                      <RechartsPieChart>
                        <RechartsPie
                          data={globalAnalytics.reasonData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {globalAnalytics.reasonData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'][index % 8]} />
                          ))}
                        </RechartsPie>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <Paper sx={{ p: 1.5, bgcolor: '#1e293b', border: '1px solid #334155', borderRadius: 2 }}>
                                  <Typography sx={{ color: '#fff', fontWeight: 'bold', fontSize: '0.8rem', mb: 0.5 }}>{payload[0].name}</Typography>
                                  <Typography sx={{ color: payload[0].payload.fill, fontSize: '0.75rem' }}>Count: <strong>{payload[0].value}</strong></Typography>
                                  <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>Weight: {payload[0].payload.percentage}%</Typography>
                                </Paper>
                              );
                            }
                            return null;
                          }}
                        />
                        <RechartsLegend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.7rem', color: '#94a3b8' }} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    {/* Detailed Reason Table - Compact Style */}
                    <TableContainer sx={{ mt: 2, maxHeight: 200, overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' } }}>
                      <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Reason</TableCell>
                            {globalAnalytics.matrixOwners.map(owner => (
                              <TableCell key={owner} align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold', fontSize: '0.65rem' }}>{owner}</TableCell>
                            ))}
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold', fontSize: '0.65rem' }}>Others</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>ITN</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Sub</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Total</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>%</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {globalAnalytics.detailedReasons.slice(0, 15).map((data) => {
                            const matrixOwners = globalAnalytics.matrixOwners;
                            const matrixSum = matrixOwners.reduce((sum, owner) => sum + (data.ownerBreakdown[owner] || 0), 0);
                            const allOwnersSum = Object.values(data.ownerBreakdown).reduce((sum, count) => sum + count, 0);
                            const otherCount = allOwnersSum - matrixSum;
                            return (
                              <TableRow key={data.name} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                <TableCell
                                  onClick={() => handleAnalyticsDrillDown({ reason: data.name })}
                                  sx={{ color: '#e2e8f0', cursor: 'pointer', '&:hover': { color: '#3b82f6' } }}
                                >
                                  {data.name}
                                </TableCell>
                                {globalAnalytics.matrixOwners.map(owner => {
                                  const count = data.ownerBreakdown[owner] || 0;
                                  const pct = allOwnersSum > 0 ? ((count / allOwnersSum) * 100).toFixed(0) : 0;
                                  return (
                                    <TableCell
                                      key={owner}
                                      align="right"
                                      onClick={() => count > 0 && handleAnalyticsDrillDown({ reason: data.name, owner })}
                                      sx={{
                                        color: count > 0 ? '#e2e8f0' : 'rgba(255,255,255,0.1)',
                                        fontWeight: count > 0 ? 'bold' : 'normal',
                                        cursor: count > 0 ? 'pointer' : 'default',
                                        '&:hover': count > 0 ? { bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' } : {}
                                      }}
                                    >
                                      {count}
                                      {count > 0 && <span style={{ fontSize: '0.6rem', color: '#64748b', marginLeft: 4 }}>({pct}%)</span>}
                                    </TableCell>
                                  );
                                })}
                                <TableCell
                                  align="right"
                                  onClick={() => otherCount > 0 && handleAnalyticsDrillDown({ reason: data.name })}
                                  sx={{ color: '#94a3b8', cursor: otherCount > 0 ? 'pointer' : 'default' }}
                                >
                                  {otherCount}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  onClick={() => data.itn > 0 && handleAnalyticsDrillDown({ reason: data.name, itn: true })}
                                  sx={{
                                    color: data.itn > 0 ? '#f59e0b' : '#64748b',
                                    cursor: data.itn > 0 ? 'pointer' : 'default',
                                    '&:hover': data.itn > 0 ? { bgcolor: 'rgba(245, 158, 11, 0.2)' } : {}
                                  }}
                                >
                                  {data.itn}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  onClick={() => data.subscription > 0 && handleAnalyticsDrillDown({ reason: data.name, subscription: true })}
                                  sx={{
                                    color: data.subscription > 0 ? '#10b981' : '#64748b',
                                    cursor: data.subscription > 0 ? 'pointer' : 'default',
                                    '&:hover': data.subscription > 0 ? { bgcolor: 'rgba(16, 185, 129, 0.2)' } : {}
                                  }}
                                >
                                  {data.subscription}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  onClick={() => handleAnalyticsDrillDown({ reason: data.name })}
                                  sx={{ color: '#e2e8f0', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                  {data.total}
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#94a3b8' }}>{data.percentage}%</TableCell>
                              </TableRow>
                            );
                          })}
                          {/* Total Row */}
                          <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                            <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>TOTAL</TableCell>
                            {globalAnalytics.matrixOwners.map(owner => {
                              const totalForOwner = Object.values(globalAnalytics.detailedReasons).reduce((sum, data) => sum + (data.ownerBreakdown[owner] || 0), 0);
                              return (
                                <TableCell key={owner} align="right" sx={{ color: '#3b82f6', fontWeight: 'bold' }}>{totalForOwner}</TableCell>
                              );
                            })}
                            <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedReasons).reduce((sum, data) => {
                                const matrixSum = globalAnalytics.matrixOwners.reduce((s, owner) => s + (data.ownerBreakdown[owner] || 0), 0);
                                const allSum = Object.values(data.ownerBreakdown).reduce((s, count) => s + count, 0);
                                return sum + (allSum - matrixSum);
                              }, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedReasons).reduce((sum, data) => sum + data.itn, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedReasons).reduce((sum, data) => sum + data.subscription, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedReasons).reduce((sum, data) => sum + data.total, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 'bold' }}>100%</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>

                  </Paper>
                </Grid>

                {/* Sub-reason Analysis */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, ...colors.glass, borderRadius: 3, border: '1px solid rgba(245, 158, 11, 0.2)' }} elevation={0}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6" fontWeight="700" color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assignment sx={{ color: '#f59e0b' }} /> Sub-Reason Breakdown
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setChartDialog({ open: true, title: 'Sub-Reason Analysis', data: globalAnalytics.subReasonData, type: 'bar' })}
                        sx={{ color: '#f59e0b', bgcolor: 'rgba(245, 158, 11, 0.1)' }}
                      >
                        <MdInsights size={20} />
                      </IconButton>
                    </Box>
                    <ResponsiveContainer width="100%" height={280}>
                      <RechartsBarChart data={globalAnalytics.subReasonData}>
                        <defs>
                          <linearGradient id="subReasonGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                        <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                        <RechartsTooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <Paper sx={{ p: 1.5, bgcolor: '#1e293b', border: '1px solid #334155', borderRadius: 2 }}>
                                  <Typography sx={{ color: '#fff', fontWeight: 'bold', fontSize: '0.8rem', mb: 0.5 }}>{label}</Typography>
                                  <Typography sx={{ color: '#f59e0b', fontSize: '0.75rem' }}>Count: <strong>{payload[0].value}</strong></Typography>
                                  <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>Contribution: {payload[0].payload.percentage}%</Typography>
                                </Paper>
                              );
                            }
                            return null;
                          }}
                        />
                        <RechartsBar dataKey="value" fill="url(#subReasonGradient)" radius={[6, 6, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                    {/* Detailed Sub-Reason Table - Compact Style */}
                    <TableContainer sx={{ mt: 2, maxHeight: 200, overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' } }}>
                      <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Sub-Reason</TableCell>
                            {globalAnalytics.matrixOwners.map(owner => (
                              <TableCell key={owner} align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold', fontSize: '0.65rem' }}>{owner}</TableCell>
                            ))}
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold', fontSize: '0.65rem' }}>Other</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>ITN</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Sub</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Total</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>%</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {globalAnalytics.detailedSubReasons.slice(0, 15).map((data) => {
                            const matrixOwners = globalAnalytics.matrixOwners;
                            const matrixSum = matrixOwners.reduce((sum, owner) => sum + (data.ownerBreakdown[owner] || 0), 0);
                            const allOwnersSum = Object.values(data.ownerBreakdown).reduce((sum, count) => sum + count, 0);
                            const otherCount = allOwnersSum - matrixSum;
                            return (
                              <TableRow key={data.name} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                <TableCell
                                  onClick={() => handleAnalyticsDrillDown({ subReason: data.name })}
                                  sx={{ color: '#e2e8f0', cursor: 'pointer', '&:hover': { color: '#3b82f6' } }}
                                >
                                  {data.name}
                                </TableCell>
                                {globalAnalytics.matrixOwners.map(owner => {
                                  const count = data.ownerBreakdown[owner] || 0;
                                  const pct = allOwnersSum > 0 ? ((count / allOwnersSum) * 100).toFixed(0) : 0;
                                  return (
                                    <TableCell
                                      key={owner}
                                      align="right"
                                      onClick={() => count > 0 && handleAnalyticsDrillDown({ subReason: data.name, owner })}
                                      sx={{
                                        color: count > 0 ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                                        fontWeight: count > 0 ? 'bold' : 'normal',
                                        cursor: count > 0 ? 'pointer' : 'default',
                                        '&:hover': count > 0 ? { bgcolor: 'rgba(245, 158, 11, 0.2)', color: '#fff' } : {}
                                      }}
                                    >
                                      {count}
                                      {count > 0 && <span style={{ fontSize: '0.6rem', color: '#64748b', marginLeft: 4 }}>({pct}%)</span>}
                                    </TableCell>
                                  );
                                })}
                                <TableCell
                                  align="right"
                                  onClick={() => otherCount > 0 && handleAnalyticsDrillDown({ subReason: data.name })}
                                  sx={{ color: '#94a3b8', cursor: otherCount > 0 ? 'pointer' : 'default' }}
                                >
                                  {otherCount}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  onClick={() => data.itn > 0 && handleAnalyticsDrillDown({ subReason: data.name, itn: true })}
                                  sx={{
                                    color: data.itn > 0 ? '#f59e0b' : '#64748b',
                                    cursor: data.itn > 0 ? 'pointer' : 'default',
                                    '&:hover': data.itn > 0 ? { bgcolor: 'rgba(245, 158, 11, 0.2)' } : {}
                                  }}
                                >
                                  {data.itn}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  onClick={() => data.subscription > 0 && handleAnalyticsDrillDown({ subReason: data.name, subscription: true })}
                                  sx={{
                                    color: data.subscription > 0 ? '#10b981' : '#64748b',
                                    cursor: data.subscription > 0 ? 'pointer' : 'default',
                                    '&:hover': data.subscription > 0 ? { bgcolor: 'rgba(16, 185, 129, 0.2)' } : {}
                                  }}
                                >
                                  {data.subscription}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  onClick={() => handleAnalyticsDrillDown({ subReason: data.name })}
                                  sx={{ color: '#e2e8f0', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                  {data.total}
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#94a3b8' }}>{data.percentage}%</TableCell>
                              </TableRow>
                            );
                          })}
                          {/* Total Row */}
                          <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                            <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>TOTAL</TableCell>
                            {globalAnalytics.matrixOwners.map(owner => {
                              const totalForOwner = Object.values(globalAnalytics.detailedSubReasons).reduce((sum, data) => sum + (data.ownerBreakdown[owner] || 0), 0);
                              return (
                                <TableCell key={owner} align="right" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>{totalForOwner}</TableCell>
                              );
                            })}
                            <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedSubReasons).reduce((sum, data) => {
                                const matrixSum = globalAnalytics.matrixOwners.reduce((s, owner) => s + (data.ownerBreakdown[owner] || 0), 0);
                                const allSum = Object.values(data.ownerBreakdown).reduce((s, count) => s + count, 0);
                                return sum + (allSum - matrixSum);
                              }, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedSubReasons).reduce((sum, data) => sum + data.itn, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedSubReasons).reduce((sum, data) => sum + data.subscription, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedSubReasons).reduce((sum, data) => sum + data.total, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 'bold' }}>100%</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>

                  </Paper>
                </Grid>

                {/* Root Cause Analysis */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, ...colors.glass, borderRadius: 3, border: '1px solid rgba(139, 92, 246, 0.2)' }} elevation={0}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6" fontWeight="700" color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SearchIcon sx={{ color: '#8b5cf6' }} /> Root Cause Matrix
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setChartDialog({ open: true, title: 'Root Cause Analysis', data: globalAnalytics.rootCauseData, type: 'area' })}
                        sx={{ color: '#8b5cf6', bgcolor: 'rgba(139, 92, 246, 0.1)' }}
                      >
                        <MdInsights size={20} />
                      </IconButton>
                    </Box>
                    <ResponsiveContainer width="100%" height={280}>
                      <RechartsBarChart data={globalAnalytics.rootCauseData}>
                        <defs>
                          <linearGradient id="rootCauseGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                        <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                        <RechartsTooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <Paper sx={{ p: 1.5, bgcolor: '#1e293b', border: '1px solid #334155', borderRadius: 2 }}>
                                  <Typography sx={{ color: '#fff', fontWeight: 'bold', fontSize: '0.8rem', mb: 0.5 }}>{label}</Typography>
                                  <Typography sx={{ color: '#8b5cf6', fontSize: '0.75rem' }}>Count: <strong>{payload[0].value}</strong></Typography>
                                  <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>Contribution: {payload[0].payload.percentage}%</Typography>
                                </Paper>
                              );
                            }
                            return null;
                          }}
                        />
                        <RechartsBar dataKey="value" fill="url(#rootCauseGradient)" radius={[6, 6, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                    {/* Detailed Root Cause Table - Compact Style */}
                    <TableContainer sx={{ mt: 2, maxHeight: 200, overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' } }}>
                      <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Root Cause</TableCell>
                            {globalAnalytics.matrixOwners.map(owner => (
                              <TableCell key={owner} align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold', fontSize: '0.65rem' }}>{owner}</TableCell>
                            ))}
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold', fontSize: '0.65rem' }}>Other</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>ITN</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Sub</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Total</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>%</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {globalAnalytics.detailedRootCauses.slice(0, 15).map((data) => {
                            const matrixOwners = globalAnalytics.matrixOwners;
                            const matrixSum = matrixOwners.reduce((sum, owner) => sum + (data.ownerBreakdown[owner] || 0), 0);
                            const allOwnersSum = Object.values(data.ownerBreakdown).reduce((sum, count) => sum + count, 0);
                            const otherCount = allOwnersSum - matrixSum;
                            return (
                              <TableRow key={data.name} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                <TableCell
                                  onClick={() => handleAnalyticsDrillDown({ rootCause: data.name })}
                                  sx={{ color: '#e2e8f0', cursor: 'pointer', '&:hover': { color: '#3b82f6' } }}
                                >
                                  {data.name}
                                </TableCell>
                                {globalAnalytics.matrixOwners.map(owner => {
                                  const count = data.ownerBreakdown[owner] || 0;
                                  const pct = allOwnersSum > 0 ? ((count / allOwnersSum) * 100).toFixed(0) : 0;
                                  return (
                                    <TableCell
                                      key={owner}
                                      align="right"
                                      onClick={() => count > 0 && handleAnalyticsDrillDown({ rootCause: data.name, owner })}
                                      sx={{
                                        color: count > 0 ? '#e2e8f0' : 'rgba(255,255,255,0.1)',
                                        fontWeight: count > 0 ? 'bold' : 'normal',
                                        cursor: count > 0 ? 'pointer' : 'default',
                                        '&:hover': count > 0 ? { bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' } : {}
                                      }}
                                    >
                                      {count}
                                      {count > 0 && <span style={{ fontSize: '0.6rem', color: '#64748b', marginLeft: 4 }}>({pct}%)</span>}
                                    </TableCell>
                                  );
                                })}
                                <TableCell
                                  align="right"
                                  onClick={() => otherCount > 0 && handleAnalyticsDrillDown({ rootCause: data.name })}
                                  sx={{ color: '#94a3b8', cursor: otherCount > 0 ? 'pointer' : 'default' }}
                                >
                                  {otherCount}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  onClick={() => data.itn > 0 && handleAnalyticsDrillDown({ rootCause: data.name, itn: true })}
                                  sx={{
                                    color: data.itn > 0 ? '#f59e0b' : '#64748b',
                                    cursor: data.itn > 0 ? 'pointer' : 'default',
                                    '&:hover': data.itn > 0 ? { bgcolor: 'rgba(245, 158, 11, 0.2)' } : {}
                                  }}
                                >
                                  {data.itn}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  onClick={() => data.subscription > 0 && handleAnalyticsDrillDown({ rootCause: data.name, subscription: true })}
                                  sx={{
                                    color: data.subscription > 0 ? '#10b981' : '#64748b',
                                    cursor: data.subscription > 0 ? 'pointer' : 'default',
                                    '&:hover': data.subscription > 0 ? { bgcolor: 'rgba(16, 185, 129, 0.2)' } : {}
                                  }}
                                >
                                  {data.subscription}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  onClick={() => handleAnalyticsDrillDown({ rootCause: data.name })}
                                  sx={{ color: '#e2e8f0', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                  {data.total}
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#94a3b8' }}>{data.percentage}%</TableCell>
                              </TableRow>
                            );
                          })}
                          {/* Total Row */}
                          <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                            <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>TOTAL</TableCell>
                            {globalAnalytics.matrixOwners.map(owner => {
                              const totalForOwner = Object.values(globalAnalytics.detailedRootCauses).reduce((sum, data) => sum + (data.ownerBreakdown[owner] || 0), 0);
                              return (
                                <TableCell key={owner} align="right" sx={{ color: '#8b5cf6', fontWeight: 'bold' }}>{totalForOwner}</TableCell>
                              );
                            })}
                            <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedRootCauses).reduce((sum, data) => {
                                const matrixSum = globalAnalytics.matrixOwners.reduce((s, owner) => s + (data.ownerBreakdown[owner] || 0), 0);
                                const allSum = Object.values(data.ownerBreakdown).reduce((s, count) => s + count, 0);
                                return sum + (allSum - matrixSum);
                              }, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedRootCauses).reduce((sum, data) => sum + data.itn, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedRootCauses).reduce((sum, data) => sum + data.subscription, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>
                              {Object.values(globalAnalytics.detailedRootCauses).reduce((sum, data) => sum + data.total, 0)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 'bold' }}>100%</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>

                  </Paper>
                </Grid>
              </Grid>

              {/* Field Team Analysis Section using Blue Theme */}
              <Box sx={{ mt: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" fontWeight="700" color="#3b82f6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Field Team Offenders Analysis
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<FaFileExcel />}
                    onClick={handleExportAllTeamsViolations}
                    sx={{ borderColor: '#10b981', color: '#10b981', '&:hover': { borderColor: '#059669', bgcolor: 'rgba(16, 185, 129, 0.1)' } }}
                  >
                    Export All Teams Detailed Report
                  </Button>
                </Box>

                {globalAnalytics.fieldTeamAnalytics && globalAnalytics.fieldTeamAnalytics.length > 0 ? (
                  <Grid container spacing={2}>
                    {globalAnalytics.fieldTeamAnalytics
                      .slice((offendersPage - 1) * 10, offendersPage * 10)
                      .map((team, idx) => (
                        <Grid item xs={12} key={idx}>
                          <Paper sx={{
                            p: 2,
                            ...colors.glass,
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
                              <Button
                                size="small"
                                startIcon={<FaFileExcel />}
                                onClick={() => handleExportTeamViolations(team)}
                                sx={{ color: '#94a3b8', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                              >
                                Export
                              </Button>
                            </Box>

                            {/* Analysis Grid */}
                            <Grid container spacing={4}>
                              {/* Left Column: People & Reasons */}
                              <Grid item xs={12} md={4}>
                                <Stack spacing={3}>
                                  <Box>
                                    <Typography variant="subtitle2" fontWeight="700" mb={1.5} color="#3b82f6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <SupportAgent sx={{ fontSize: 18 }} /> Responsible Owners
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 300, overflowY: 'auto', pr: 1 }}>
                                      {team.owners.map((owner, i) => (
                                        <Box key={i} sx={{ position: 'relative' }}>
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, px: 1 }}>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#e2e8f0' }}>{owner.name}</Typography>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'bold' }}>{owner.value}</Typography>
                                          </Box>
                                          <LinearProgress
                                            variant="determinate"
                                            value={(owner.value / team.totalIssues) * 100}
                                            sx={{
                                              height: 4,
                                              borderRadius: 2,
                                              bgcolor: 'rgba(59, 130, 246, 0.1)',
                                              '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6' }
                                            }}
                                          />
                                        </Box>
                                      ))}
                                    </Box>
                                  </Box>
                                  <Box>
                                    <Typography variant="subtitle2" fontWeight="700" mb={1.5} color="#f59e0b" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <PriorityHigh sx={{ fontSize: 18 }} /> Issue Reasons
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 300, overflowY: 'auto', pr: 1 }}>
                                      {team.reasons.map((reason, i) => (
                                        <Box key={i}>
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, px: 1 }}>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#e2e8f0' }}>{reason.name}</Typography>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 'bold' }}>{reason.value}</Typography>
                                          </Box>
                                          <LinearProgress
                                            variant="determinate"
                                            value={(reason.value / team.totalIssues) * 100}
                                            sx={{
                                              height: 4,
                                              borderRadius: 2,
                                              bgcolor: 'rgba(245, 158, 11, 0.1)',
                                              '& .MuiLinearProgress-bar': { bgcolor: '#f59e0b' }
                                            }}
                                          />
                                        </Box>
                                      ))}
                                    </Box>
                                  </Box>
                                </Stack>
                              </Grid>

                              {/* Middle Column: Root Causes & Sub-reasons */}
                              <Grid item xs={12} md={4}>
                                <Stack spacing={3}>
                                  <Box>
                                    <Typography variant="subtitle2" fontWeight="700" mb={1.5} color="#10b981" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <SearchIcon sx={{ fontSize: 18 }} /> Root Cause Distribution
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 300, overflowY: 'auto', pr: 1 }}>
                                      {team.rootCauses.map((rc, i) => (
                                        <Box key={i}>
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, px: 1 }}>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#e2e8f0' }}>{rc.name}</Typography>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>{rc.value}</Typography>
                                          </Box>
                                          <LinearProgress
                                            variant="determinate"
                                            value={(rc.value / team.totalIssues) * 100}
                                            sx={{
                                              height: 4,
                                              borderRadius: 2,
                                              bgcolor: 'rgba(16, 185, 129, 0.1)',
                                              '& .MuiLinearProgress-bar': { bgcolor: '#10b981' }
                                            }}
                                          />
                                        </Box>
                                      ))}
                                    </Box>
                                  </Box>
                                  <Box>
                                    <Typography variant="subtitle2" fontWeight="700" mb={1.5} color="#8b5cf6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Assignment sx={{ fontSize: 18 }} /> Sub-Reason Analysis
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 300, overflowY: 'auto', pr: 1 }}>
                                      {team.subReasons.map((sr, i) => (
                                        <Box key={i}>
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, px: 1 }}>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#e2e8f0' }}>{sr.name}</Typography>
                                            <Typography sx={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 'bold' }}>{sr.value}</Typography>
                                          </Box>
                                          <LinearProgress
                                            variant="determinate"
                                            value={(sr.value / team.totalIssues) * 100}
                                            sx={{
                                              height: 4,
                                              borderRadius: 2,
                                              bgcolor: 'rgba(139, 92, 246, 0.1)',
                                              '& .MuiLinearProgress-bar': { bgcolor: '#8b5cf6' }
                                            }}
                                          />
                                        </Box>
                                      ))}
                                    </Box>
                                  </Box>
                                </Stack>
                              </Grid>

                              {/* Right Column: NPS Satisfaction */}
                              <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2" fontWeight="700" mb={2} color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <TrendingUp sx={{ fontSize: 18 }} /> Customer Satisfaction (NPS)
                                </Typography>
                                <Paper sx={{
                                  p: 2,
                                  bgcolor: 'rgba(15, 23, 42, 0.6)',
                                  borderRadius: 3,
                                  border: '1px solid rgba(255,255,255,0.05)',
                                  height: '240px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center'
                                }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <RechartsBarChart data={team.npsBreakdown} layout="vertical" margin={{ left: 20 }}>
                                      <XAxis type="number" hide />
                                      <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={80}
                                        stroke="#94a3b8"
                                        fontSize={11}
                                        fontWeight={600}
                                      />
                                      <RechartsTooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                                        itemStyle={{ color: '#fff', fontSize: '0.8rem' }}
                                      />
                                      <RechartsBar dataKey="value" radius={[0, 6, 6, 0]} barSize={32}>
                                        {team.npsBreakdown.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                      </RechartsBar>
                                    </RechartsBarChart>
                                  </ResponsiveContainer>
                                  <Box sx={{ mt: 1, px: 1, display: 'flex', justifyContent: 'space-around' }}>
                                    {team.npsBreakdown.map((entry, i) => (
                                      <Stack key={i} direction="row" spacing={1} alignItems="center">
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color }} />
                                        <Typography sx={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                          {entry.name}: <strong>{entry.value}</strong>
                                        </Typography>
                                      </Stack>
                                    ))}
                                  </Box>
                                </Paper>
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
                {globalAnalytics.fieldTeamAnalytics && globalAnalytics.fieldTeamAnalytics.length > 10 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
                    <Pagination
                      count={Math.ceil(globalAnalytics.fieldTeamAnalytics.length / 10)}
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

        </Box >
      )
      }

      {/* Drill-down Transaction Dialog */}
      <Dialog
        open={drillDownOpen}
        onClose={() => setDrillDownOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            ...colors.glass,
            bgcolor: '#1a1a1a',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.1)',
            minHeight: '60vh'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800 }}>{drillDownTitle}</Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              Related {drillDownItems.length} transaction records
            </Typography>
          </Box>
          <IconButton onClick={() => setDrillDownOpen(false)} sx={{ color: colors.textSecondary }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {drillDownType === 'mixed' && (
            <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)', px: 2, bgcolor: '#1a1a1a' }}>
              <Tabs
                value={drillDownTab}
                onChange={(e, val) => setDrillDownTab(val)}
                sx={{
                  '& .MuiTab-root': {
                    color: 'rgba(255,255,255,0.5)',
                    minHeight: 48,
                    fontWeight: 500,
                    fontSize: '0.8rem',
                    textTransform: 'none'
                  },
                  '& .Mui-selected': { color: colors.primary + ' !important' },
                  '& .MuiTabs-indicator': { bgcolor: colors.primary }
                }}
              >
                <Tab
                  label={`TASKS (${drillDownItems.filter(i => i.__drillType === 'task' || (drillDownType === 'task')).length})`}
                  value="tasks"
                />
                <Tab
                  label={`ISSUES (${drillDownItems.filter(i => i.__drillType === 'issue' || (drillDownType === 'issue')).length})`}
                  value="issues"
                />
              </Tabs>
            </Box>
          )}
          <TableContainer sx={{ maxHeight: '70vh' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>TYPE</TableCell>
                  <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>SLID</TableCell>
                  <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>DATE</TableCell>
                  <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>CATEGORY / SUMMARY</TableCell>
                  {(drillDownType === 'task' || (drillDownType === 'mixed' && drillDownTab === 'tasks')) && (
                    <>
                      <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>REASON/SUB</TableCell>
                      <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>RC</TableCell>
                      <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>OWNER</TableCell>
                      <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>FEEDBACK (VERBATIM)</TableCell>
                    </>
                  )}
                  <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>STATUS</TableCell>
                  <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>POINTS</TableCell>
                  <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>SCORE / INFO</TableCell>
                  <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {drillDownItems
                  .filter(item => {
                    if (drillDownType === 'mixed') {
                      const itemType = item.__drillType || 'task';
                      return itemType === (drillDownTab === 'tasks' ? 'task' : 'issue');
                    }
                    if (drillDownType === 'issue') return (item.__drillType || 'issue') === 'issue';
                    if (drillDownType === 'task') return (item.__drillType || 'task') === 'task';
                    return true;
                  })
                  .map((item, idx) => {
                    const isIssue = item.__drillType === 'issue' || drillDownType === 'issue';
                    const date = isIssue ? (item.date || item.createdAt) : (item.pisDate || item.createdAt);
                    const status = isIssue ? (item.solved === 'yes' ? 'Solved' : 'Open') : (item.validationStatus || 'Pending');
                    const score = !isIssue ? (item.evaluationScore ? `${item.evaluationScore}${item.evaluationScore <= 10 ? '/10' : '%'}` : 'N/A') : (item.priority || 'Medium');

                    return (
                      <TableRow
                        key={item._id || idx}
                        onClick={() => {
                          if (isIssue) {
                            setSelectedDetailIssue(item);
                            setDetailIssueOpen(true);
                          } else {
                            setSelectedTask(item);
                            setViewDialogOpen(true);
                          }
                        }}
                        sx={{
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.03)', cursor: 'pointer' }
                        }}
                      >
                        <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <Chip
                            label={isIssue ? 'ISSUE' : 'TASK'}
                            size="small"
                            sx={{
                              bgcolor: isIssue ? `${colors.error}20` : `${colors.primary}20`,
                              color: isIssue ? colors.error : colors.primary,
                              fontWeight: 800,
                              fontSize: '0.6rem'
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{item.slid}</TableCell>
                        <TableCell sx={{ color: colors.textSecondary, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{formatDate(date)}</TableCell>
                        <TableCell sx={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {isIssue ? (item.issueCategory || (item.issues?.[0]?.category) || 'Technical Issue') : (item.customerName || 'N/A')}
                          <Typography variant="caption" sx={{ display: 'block', color: colors.textSecondary }}>
                            {isIssue ? (item.issueDetails || item.reporterNote || item.assigneeNote || '').substring(0, 80) : item.faultDescription?.substring(0, 50)}
                            {isIssue && (item.issueDetails || item.reporterNote || item.assigneeNote || '').length > 80 ? '...' : ''}
                          </Typography>
                        </TableCell>
                        {!isIssue && (
                          <>
                            <TableCell sx={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', maxWidth: '150px' }}>
                              {item.reason || '-'}
                              <Typography variant="caption" sx={{ display: 'block', color: colors.textSecondary }}>
                                {item.subReason}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              {item.RC || item.rootCause || '-'}
                            </TableCell>
                            <TableCell sx={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              {item.responsible || item.owner || '-'}
                            </TableCell>
                            <TableCell sx={{ color: `${colors.warning}cc`, borderBottom: '1px solid rgba(255,255,255,0.05)', fontStyle: 'italic', maxWidth: '250px' }}>
                              "{item.customerFeedback || item.feedback || 'No verbatim feedback provided'}"
                            </TableCell>
                          </>
                        )}
                        <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <Chip
                            label={status}
                            size="small"
                            sx={{
                              bgcolor: status === 'Solved' || status === 'Approved' ? `${colors.success}20` : status === 'Open' ? `${colors.error}20` : 'rgba(255,255,255,0.1)',
                              color: status === 'Solved' || status === 'Approved' ? colors.success : status === 'Open' ? colors.error : colors.textSecondary,
                              fontWeight: 700
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <Chip
                            label={calculateItemPoints(item, isIssue ? 'issue' : 'task')}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(139, 92, 246, 0.1)',
                              color: colors.primary,
                              fontWeight: 800,
                              borderRadius: '8px',
                              height: '24px',
                              fontSize: '0.75rem',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: colors.textPrimary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {score}
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                          <MuiTooltip title="View Full Details">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isIssue) {
                                  setSelectedDetailIssue(item);
                                  setDetailIssueOpen(true);
                                } else {
                                  setSelectedTask(item);
                                  setViewDialogOpen(true);
                                }
                              }}
                              sx={{
                                color: colors.primary,
                                '&:hover': { bgcolor: `${colors.primary}20` }
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </MuiTooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button onClick={() => setDrillDownOpen(false)} sx={{ color: colors.textSecondary }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Main Content Area */}
      {
        selectedTeam && (
          <Box sx={{ animation: 'fadeIn 0.5s ease-out' }}>

            {/* Navigation Tabs */}
            <Paper sx={{
              mb: 4,
              bgcolor: 'transparent',
              boxShadow: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    color: colors.textSecondary,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 500,
                    py: 3,
                    px: 4,
                    minHeight: 64,
                    transition: '0.3s',
                    '&.Mui-selected': { color: colors.primary, fontWeight: 700 }
                  },
                  '& .MuiTabs-indicator': {
                    height: '4px',
                    borderRadius: '4px 4px 0 0',
                    background: colors.primaryGradient
                  }
                }}
              >
                <Tab label="Executive Overview" icon={<BarChartIconMUI />} iconPosition="start" />
                <Tab label="Customer Issues" icon={<SupportAgent />} iconPosition="start" />
                <Tab label="Tasks & Tickets" icon={<Assignment />} iconPosition="start" />
                <Tab label="Theoretical" icon={<Quiz />} iconPosition="start" />
                <Tab label="Practical" icon={<CheckCircle />} iconPosition="start" />
                <Tab label="Lab" icon={<Assessment />} iconPosition="start" />
                <Tab label="Smart Reports" icon={<Timeline />} iconPosition="start" />
              </Tabs>
            </Paper>

            {/* TAB PANELS */}

            {/* 1. EXECUTIVE OVERVIEW */}
            {activeTab === 0 && (
              <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>
                    Executive Overview: <span style={{ color: colors.primary }}>{selectedTeam?.teamName}</span>
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<FaFileExport />}
                    onClick={handleExportFullPerformanceToExcel}
                    sx={{
                      background: colors.primaryGradient,
                      borderRadius: '12px',
                      px: 3,
                      py: 1,
                      textTransform: 'none',
                      fontWeight: 600,
                      boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                      '&:hover': {
                        boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    Export Full Performance Data
                  </Button>
                </Box>

                <Grid container spacing={3}>
                  {/* High Level KPI Cards */}
                  {[
                    {
                      title: 'NPS Tickets',
                      value: stats.technicalTasksCount,
                      unit: 'Total',
                      desc: `Detractors: ${stats.technicalDetractors} | Neutrals: ${stats.technicalNeutrals}`,
                      color: colors.warning,
                      icon: <Assignment />
                    },
                    {
                      title: 'Customer Issues (Snags and Complaints)',
                      value: stats.customerIssuesCount,
                      unit: 'Reported',
                      desc: `${stats.resolutionRate}% Resolution Rate`,
                      color: colors.error,
                      icon: <SupportAgent />
                    },
                    {
                      title: 'Theoretical Score',
                      value: calculateAverageScore(quizResults),
                      max: 100,
                      unit: '%',
                      desc: 'Average Quiz Performance',
                      color: colors.primary,
                      icon: <Quiz />
                    },
                    {
                      title: 'Practical Score',
                      value: calculateAverageScore(jobAssessments),
                      max: 5,
                      unit: '/ 5',
                      desc: 'Field Assessment Proficiency',
                      color: colors.success,
                      icon: <CheckCircle />
                    },
                    {
                      title: 'Lab Score',
                      value: calculateAverageScore(labAssessments),
                      max: 100,
                      unit: '%',
                      desc: 'Average Lab Proficiency',
                      color: colors.info,
                      icon: <Assessment />
                    },
                  ].map((kpi, i) => (
                    <Grid item xs={12} sm={6} md={2.4} key={i}>
                      <Paper {...glassCardProps} sx={{ ...glassCardProps.sx, p: 3, position: 'relative', height: '100%' }}>
                        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: kpi.color }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography variant="overline" sx={{ color: colors.textSecondary, letterSpacing: 1.2, fontWeight: 600 }}>
                            {kpi.title}
                          </Typography>
                          <Box sx={{ color: kpi.color, opacity: 0.8 }}>
                            {kpi.icon}
                          </Box>
                        </Box>
                        <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', mb: 0.5 }}>
                          {typeof kpi.value === 'number' ?
                            (kpi.max === 5 ? kpi.value.toFixed(1) : Math.round(kpi.value))
                            : kpi.value}
                          <Typography component="span" variant="h6" sx={{ color: colors.textSecondary, ml: 1 }}>{kpi.unit}</Typography>
                        </Typography>
                        <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block' }}>
                          {kpi.desc}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}

                  {/* Operational Efficiency & Deep Stats */}
                  <Grid item xs={12} md={8}>
                    <Paper {...glassCardProps} sx={{ ...glassCardProps.sx, p: 4, height: 450, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>Operational Efficiency & Responsivity</Typography>
                        <Chip
                          label="Live Operational Data"
                          size="small"
                          sx={{ bgcolor: `${colors.primary}20`, color: colors.primary, fontWeight: 700, border: `1px solid ${colors.primary}40` }}
                        />
                      </Box>
                      <Box sx={{ flex: 1, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart
                            data={operationalEfficiencyData}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis
                              type="category"
                              dataKey="name"
                              stroke={colors.textSecondary}
                              fontSize={12}
                              width={120}
                            />
                            <RechartsTooltip
                              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            />
                            <RechartsBar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                              {operationalEfficiencyData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </RechartsBar>
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </Box>

                      {/* Deep Stats Sub-grid */}
                      <Grid container spacing={2} sx={{ mt: 2 }}>
                        {[
                          { label: 'Reliability Index', value: `${deepStats.reliabilityIndex}%`, icon: <TrendingUpIcon fontSize="small" />, color: colors.secondary },
                          { label: 'Avg Resolution', value: `${deepStats.avgResolutionSpeed}d`, icon: <Schedule fontSize="small" />, color: colors.info },
                          { label: 'Aging Issues', value: deepStats.highAgingCount, icon: <Warning fontSize="small" />, color: colors.error },
                          { label: 'Express Fixes', value: deepStats.expressResolutionCount, icon: <CheckCircleIcon fontSize="small" />, color: colors.success },
                        ].map((s, i) => (
                          <Grid item xs={3} key={i}>
                            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                                <Box sx={{ color: s.color, display: 'flex' }}>{s.icon}</Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{s.value}</Typography>
                              </Box>
                              <Typography variant="caption" sx={{ color: colors.textSecondary, fontSize: '0.65rem', display: 'block' }}>{s.label}</Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Paper {...glassCardProps} sx={{ ...glassCardProps.sx, p: 4, height: 450, display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="h6" sx={{ mb: 3, color: '#fff', fontWeight: 600 }}>Recent Activity</Typography>
                      <Box sx={{ flex: 1, overflowY: 'auto', pr: 1, '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' } }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {allActivities.slice(0, 15).map((activity, idx) => (
                            <Box key={activity.id || idx} sx={{
                              p: 2,
                              borderRadius: '16px',
                              bgcolor: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.05)',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              position: 'relative',
                              overflow: 'hidden',
                              '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.04)',
                                borderColor: `${activity.color}40`,
                                transform: 'translateX(4px)'
                              }
                            }}>
                              {/* Vertical Accent */}
                              <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', bgcolor: activity.color, opacity: 0.6 }} />

                              <Stack spacing={1}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box sx={{
                                      p: 1,
                                      borderRadius: '10px',
                                      bgcolor: `${activity.color}15`,
                                      color: activity.color,
                                      display: 'flex',
                                      backdropFilter: 'blur(4px)'
                                    }}>
                                      {activity.icon}
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.2, fontSize: '0.65rem' }}>
                                        {activity.title}
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, lineHeight: 1.3 }}>
                                        {activity.detail}
                                      </Typography>
                                    </Box>
                                  </Stack>
                                  <Typography variant="caption" sx={{ color: colors.textSecondary, whiteSpace: 'nowrap', fontSize: '0.7rem', opacity: 0.7 }}>
                                    {formatDate(activity.date)}
                                  </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 400 }}>
                                    {activity.metadata}
                                  </Typography>
                                  {activity.status && (
                                    <Chip
                                      label={activity.status}
                                      size="small"
                                      sx={{
                                        height: '20px',
                                        fontSize: '0.62rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        bgcolor: `${activity.color}15`,
                                        color: activity.color,
                                        border: `1px solid ${activity.color}30`,
                                        '& .MuiChip-label': { px: 1 }
                                      }}
                                    />
                                  )}
                                </Box>
                              </Stack>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* 2. CUSTOMER ISSUES TAB (Deep Insights) */}
            {activeTab === 1 && (
              <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#fff' }}>Customer Issues Dashboard</Typography>
                    <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                      Technical analysis and performance metrics for {selectedTeam?.teamName}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#2d2d2d', px: 2, py: 1, borderRadius: 2, border: '1px solid #3d3d3d', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ color: '#b3b3b3', fontSize: '0.8rem' }}>From:</Typography>
                        <TextField
                          type="date"
                          size="small"
                          value={dateFilter.start}
                          onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                          sx={{
                            bgcolor: '#1a1a1a',
                            borderRadius: 1,
                            '& input': { color: '#fff', fontSize: '0.8rem', p: '6px 8px' },
                            '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ color: '#b3b3b3', fontSize: '0.8rem' }}>To:</Typography>
                        <TextField
                          type="date"
                          size="small"
                          value={dateFilter.end}
                          onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                          sx={{
                            bgcolor: '#1a1a1a',
                            borderRadius: 1,
                            '& input': { color: '#fff', fontSize: '0.8rem', p: '6px 8px' },
                            '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                          }}
                        />
                      </Box>
                      {(dateFilter.start || dateFilter.end) && (
                        <Button size="small" onClick={() => setDateFilter({ start: '', end: '' })} sx={{ color: '#f44336', minWidth: 0, p: 0.5 }}>
                          Clear
                        </Button>
                      )}
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<FaFileExport />}
                      disabled
                      sx={{ bgcolor: '#4e73df', '&:hover': { bgcolor: '#2e59d9' } }}
                    >
                      Email Report
                    </Button>
                  </Box>
                </Box>

                {/* KPI Section - Match Reference Layout */}
                <Grid container spacing={2} mb={4}>
                  <Grid item xs={12} sm={6} md={2.4}><StatCard title="Total Transactions" value={stats.totalTransactions} icon={<FaClipboardList />} color="#2196f3" subtext="Total records" /></Grid>
                  <Grid item xs={12} sm={6} md={2.4}><StatCard title="Issues Highlighted" value={stats.totalIssuesHighlighted} icon={<FaExclamationCircle />} color="#ffc107" subtext={`Avg: ${stats.issueDensity} per txn`} /></Grid>
                  <Grid item xs={12} sm={6} md={2.4}><StatCard title="Closed" value={stats.closed} icon={<FaCheckCircle />} color="#4caf50" subtext={`${stats.resolutionRate}% Rate`} /></Grid>
                  <Grid item xs={12} sm={6} md={2.4}><StatCard title="Open" value={stats.open} icon={<FaExclamationCircle />} color="#f44336" subtext="Require attention" /></Grid>
                  <Grid item xs={12} sm={6} md={2.4}><StatCard title="Avg. Daily Issues" value={(stats.totalTransactions / (trendData.labels.length || 1)).toFixed(1)} icon={<FaChartLine />} color="#ff9800" subtext="Trend metric" /></Grid>
                </Grid>

                {/* Process Efficiency Spotlight - Match Reference Layout */}
                <Box mb={4}>
                  <Grid container spacing={4}>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', height: '100%', border: '1px solid #3d3d3d' }}>
                        <Typography variant="subtitle2" color="grey.500" mb={1}>SUPERVISOR DISPATCH SPEED (Incl. Aging)</Typography>
                        <Typography variant="h3" fontWeight="800" color={Number(stats.avgDispatchTime) > 1 ? "warning.main" : "info.main"}>
                          {stats.avgDispatchTime}<span style={{ fontSize: '1rem', color: '#888' }}> days</span>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          Avg time from <b>Reported</b> → <b>Dispatched</b> (Or <b>Reported</b> → <b>Now</b> if pending)
                        </Typography>
                        <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, border: '1px dashed #444' }}>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#888', fontStyle: 'italic', lineHeight: 1.2 }}>
                            * Calculation: (Dispatched Date - Reported Date) OR (Now - Reported Date) if undispatched.
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', height: '100%', border: '1px solid #3d3d3d' }}>
                        <Typography variant="subtitle2" color="grey.500" mb={1}>FIELD RESOLUTION SPEED (Incl. Aging)</Typography>
                        <Typography variant="h3" fontWeight="800" color="success.main">
                          {stats.avgResolutionTime}<span style={{ fontSize: '1rem', color: '#888' }}> days</span>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          Avg time from <b>Dispatched</b> → <b>Resolved</b> (Or <b>Reported</b> → <b>Now</b> if pending)
                        </Typography>
                        <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, border: '1px dashed #444' }}>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#888', fontStyle: 'italic', lineHeight: 1.2 }}>
                            * Calculation: Resolved cases use (Resolved - Dispatched). Pending cases use (Now - Reported) to reflect negligence.
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', height: '100%', border: '1px solid #3d3d3d' }}>
                        <Typography variant="subtitle2" color="grey.500" mb={1}>TOTAL LIFECYCLE (Accountability)</Typography>
                        <Typography variant="h3" fontWeight="800" color="white">
                          {stats.avgLifecycleTime}<span style={{ fontSize: '1rem', color: '#888' }}> days</span>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          Total time from <b>Initial Report</b> → <b>Closed/Now</b>
                        </Typography>
                        <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, border: '1px dashed #444' }}>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#888', fontStyle: 'italic', lineHeight: 1.2 }}>
                            * Calculation: Full duration from (Report Date) to (Closed Date) OR (Now) if the case is still open.
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>

                {/* Charts - Match Reference Layout */}
                <Grid container spacing={3} mb={4}>
                  <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold">Issue Reporting Trend</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <FormControl size="small" variant="outlined">
                            <Select
                              value={trendTimeframe}
                              onChange={(e) => setTrendTimeframe(e.target.value)}
                              sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#3d3d3d' }, fontSize: '0.8rem', height: 32 }}
                            >
                              <MenuItem value="day">Daily</MenuItem>
                              <MenuItem value="week">Weekly</MenuItem>
                              <MenuItem value="month">Monthly</MenuItem>
                            </Select>
                          </FormControl>
                          <FormControl size="small" variant="outlined">
                            <Select
                              value={trendChartType}
                              onChange={(e) => setTrendChartType(e.target.value)}
                              sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#3d3d3d' }, fontSize: '0.8rem', height: 32 }}
                            >
                              <MenuItem value="mixed">Mixed</MenuItem>
                              <MenuItem value="bar">Bar</MenuItem>
                              <MenuItem value="line">Line</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
                      </Box>
                      <Box sx={{ height: 300 }}><Bar data={trendData} options={commonOptions} /></Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d', height: '100%' }}>
                      <Typography variant="h6" gutterBottom fontWeight="bold">Resolution Status</Typography>
                      <Box sx={{ height: 260, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Doughnut data={statusData} options={doughnutOptions} />
                        <Box sx={{ position: 'absolute', textAlign: 'center' }}>
                          <Typography variant="h4" fontWeight="bold" sx={{ color: '#1cc88a' }}>{stats.resolutionRate}%</Typography>
                          <Typography variant="caption" color="#b3b3b3">Resolved</Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Detailed Issue Registry - Styled like Supervisor Performance Table */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 0,
                    bgcolor: '#1e293b',
                    borderRadius: 3,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    overflow: 'hidden',
                    background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)' }}>
                    <Box>
                      <Typography variant="h6" fontWeight="700" color="#f8fafc">
                        Issue History & Registry
                      </Typography>
                      <Typography variant="body2" color="#94a3b8" sx={{ mt: 0.5 }}>
                        Full list of issues associated with this team
                      </Typography>
                    </Box>
                    <Chip
                      label={`${filteredIssuesByDate.length} Records`}
                      size="small"
                      sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)', fontWeight: 600 }}
                    />
                  </Box>
                  <Box sx={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                      <thead>
                        <tr style={{ background: '#0f172a' }}>
                          <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Date</th>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>SLID</th>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Reporter</th>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Category</th>
                          <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredIssuesByDate
                          .slice(issuesPage * issuesRowsPerPage, issuesPage * issuesRowsPerPage + issuesRowsPerPage)
                          .map((issue) => (
                            <tr
                              key={issue._id}
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background-color 0.2s ease' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <td style={{ padding: '16px 24px', color: '#f8fafc', fontSize: '0.85rem' }}>{formatDate(issue.date || issue.createdAt)}</td>
                              <td style={{ padding: '16px', color: '#60a5fa', fontWeight: 'bold', fontSize: '0.85rem' }}>{issue.slid}</td>
                              <td style={{ padding: '16px', color: '#f8fafc', fontSize: '0.85rem' }}>{issue.reporter || 'N/A'}</td>
                              <td style={{ padding: '16px', color: '#94a3b8', fontSize: '0.85rem' }}>
                                {issue.issues?.[0]?.category || issue.issueCategory || 'Uncategorized'}
                                <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>{issue.issues?.[0]?.subCategory || '-'}</Typography>
                              </td>
                              <td style={{ padding: '16px', textAlign: 'center' }}>
                                <Chip
                                  label={issue.solved === 'yes' ? 'Closed' : 'Open'}
                                  size="small"
                                  sx={{
                                    bgcolor: issue.solved === 'yes' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: issue.solved === 'yes' ? '#4ade80' : '#f87171',
                                    border: `1px solid ${issue.solved === 'yes' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                    fontWeight: 600
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    <TablePagination
                      rowsPerPageOptions={[10, 25, 50]}
                      component="div"
                      count={filteredIssuesByDate.length}
                      rowsPerPage={issuesRowsPerPage}
                      page={issuesPage}
                      onPageChange={(e, p) => setIssuesPage(p)}
                      onRowsPerPageChange={(e) => {
                        setIssuesRowsPerPage(parseInt(e.target.value, 10));
                        setIssuesPage(0);
                      }}
                      sx={{ color: '#94a3b8' }}
                    />
                  </Box>
                </Paper>
              </Box>
            )}

            {/* 3. TASKS & TICKETS TAB (Full Premium Dashboard) */}
            {activeTab === 2 && (
              <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#fff' }}>NPS Tickets</Typography>
                    <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                      Operational workload and technical assessment registry for {selectedTeam?.teamName}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<FaFileExcel />}
                      sx={{ color: colors.success, borderColor: colors.success }}
                      onClick={() => {
                        const data = technicalTasks.map(t => ({
                          SLID: t.slid,
                          'Request Number': t.requestNumber,
                          'Customer Name': t.customerName,
                          'PIS Date': t.pisDate ? new Date(t.pisDate).toLocaleDateString() : 'N/A',
                          Priority: t.priority,
                          Status: t.validationStatus,
                          Score: t.evaluationScore || 'N/A'
                        }));
                        const ws = XLSX.utils.json_to_sheet(data);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Tasks");
                        XLSX.writeFile(wb, `${selectedTeam.teamName}_Technical_Tasks.xlsx`);
                      }}
                    >
                      Export Excel
                    </Button>
                  </Box>
                </Box>

                {/* Technical KPI Section */}
                <Grid container spacing={2} mb={4}>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Total Tasks"
                      value={technicalTasks.length}
                      icon={<FaClipboardList />}
                      color={colors.primary}
                      subtext="Technical workload"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="High Priority"
                      value={technicalTasks.filter(t => t.priority === 'High').length}
                      icon={<PriorityHigh />}
                      color={colors.error}
                      subtext="Requires urgent action"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Detractors"
                      value={technicalTasks.filter(t => t.evaluationScore > 0 && t.evaluationScore <= 60).length}
                      icon={<FaExclamationCircle />}
                      color={colors.warning}
                      subtext="Score below 60%"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                      title="Avg. Quality"
                      value={(() => {
                        const evaluated = technicalTasks.filter(t => t.evaluationScore > 0);
                        return evaluated.length > 0 ? (evaluated.reduce((a, b) => a + b.evaluationScore, 0) / evaluated.length).toFixed(1) : 'N/A';
                      })()}
                      icon={<CheckCircle />}
                      color={colors.success}
                      subtext="Technical score avg"
                    />
                  </Grid>
                </Grid>

                {/* Technical Charts */}
                <Grid container spacing={3} mb={4}>
                  <Grid item xs={12} lg={6}>
                    <Paper sx={{ p: 3, ...darkThemeStyles.paper, height: '100%' }}>
                      <Typography variant="h6" sx={{ mb: 2, color: colors.primary }}>Task Distribution by Priority</Typography>
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={[
                            { name: 'High', value: technicalTasks.filter(t => t.priority === 'High').length, color: colors.error },
                            { name: 'Medium', value: technicalTasks.filter(t => t.priority === 'Medium').length, color: colors.warning },
                            { name: 'Low', value: technicalTasks.filter(t => t.priority === 'Low').length, color: colors.success },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} vertical={false} />
                            <XAxis dataKey="name" stroke={colors.textSecondary} fontSize={12} />
                            <YAxis stroke={colors.textSecondary} fontSize={12} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#252525', border: `1px solid ${colors.border}`, borderRadius: '12px' }} />
                            <RechartsBar dataKey="value" radius={[4, 4, 0, 0]}>
                              {[colors.error, colors.warning, colors.success].map((color, idx) => <Cell key={`cell-${idx}`} fill={color} />)}
                            </RechartsBar>
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} lg={6}>
                    <Paper sx={{ p: 3, ...darkThemeStyles.paper, height: '100%' }}>
                      <Typography variant="h6" sx={{ mb: 2, color: colors.primary }}>Operational Status</Typography>
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <RechartsPie
                              data={[
                                { name: 'Validated', value: technicalTasks.filter(t => t.validationStatus === 'Validated').length, color: colors.success },
                                { name: 'Pending', value: technicalTasks.filter(t => t.validationStatus === 'Pending').length, color: colors.warning },
                                { name: 'Rejected', value: technicalTasks.filter(t => t.validationStatus === 'Rejected').length, color: colors.error },
                              ].filter(d => d.value > 0)}
                              cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                            >
                              {[colors.success, colors.warning, colors.error].map((color, idx) => <Cell key={`cell-${idx}`} fill={color} />)}
                            </RechartsPie>
                            <RechartsTooltip contentStyle={{ backgroundColor: '#252525', border: `1px solid ${colors.border}`, borderRadius: '12px' }} />
                            <RechartsLegend verticalAlign="bottom" height={36} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Task Registry Table */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 0,
                    bgcolor: '#1e293b',
                    borderRadius: 3,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    overflow: 'hidden',
                    background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                  }}
                >
                  <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight="700" color="#f8fafc">Technical Task Registry</Typography>
                    <Chip label={`${technicalTasks.length} Tasks`} size="small" sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }} />
                  </Box>
                  <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ background: '#0f172a' }}>
                        <tr>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>REQUEST NO</th>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>CUSTOMER</th>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>SLID</th>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>PIS DATE</th>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>PRIORITY</th>
                          <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>STATUS</th>
                          <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>SCORE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {technicalTasks.map((task) => (
                          <tr key={task._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: '0.2s', '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                            <td style={{ padding: '16px', color: '#fff', fontSize: '0.85rem' }}>{task.requestNumber || 'N/A'}</td>
                            <td style={{ padding: '16px', color: '#f8fafc', fontSize: '0.85rem' }}>{task.customerName}</td>
                            <td style={{ padding: '16px', color: colors.primary, fontWeight: 'bold' }}>{task.slid}</td>
                            <td style={{ padding: '16px', color: '#94a3b8', fontSize: '0.85rem' }}>{formatDate(task.pisDate || task.createdAt)}</td>
                            <td style={{ padding: '16px' }}>
                              <Chip label={task.priority} size="small" color={task.priority === 'High' ? 'error' : task.priority === 'Medium' ? 'warning' : 'success'} variant="outlined" />
                            </td>
                            <td style={{ padding: '16px' }}>
                              <Chip
                                label={task.validationStatus}
                                size="small"
                                sx={{
                                  bgcolor: task.validationStatus === 'Validated' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                                  color: task.validationStatus === 'Validated' ? '#4ade80' : '#facc15',
                                  border: `1px solid ${task.validationStatus === 'Validated' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)'}`
                                }}
                              />
                            </td>
                            <td style={{ padding: '16px', textAlign: 'center', fontWeight: 'bold', color: (task.evaluationScore && (task.evaluationScore > 80 || (task.evaluationScore <= 10 && task.evaluationScore > 8))) ? colors.success : colors.warning }}>
                              {task.evaluationScore ? `${task.evaluationScore}${task.evaluationScore <= 10 ? '/10' : '%'}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Paper>
              </Box>
            )}

            {/* 4. THEORETICAL ASSESSMENTS (Updated Styling) */}
            {activeTab === 3 && (
              <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h5" sx={{ color: colors.primary }}>Theoretical Assessments</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<TableChartIcon />}
                        onClick={exportTheoreticalToExcel}
                        disabled={quizResults.length === 0}
                        sx={{ color: colors.success, borderColor: colors.success, '&:hover': { borderColor: colors.success, bgcolor: `${colors.success}11` } }}
                      >
                        Pro Excel
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={() => exportTestToPDF('theoretical', quizResults)}
                        disabled={quizResults.length === 0}
                        sx={{ color: colors.error, borderColor: colors.error, '&:hover': { borderColor: colors.error, bgcolor: `${colors.error}11` } }}
                      >
                        Pro PDF Report
                      </Button>
                    </Box>
                  </Box>
                  <Chip
                    label={`Avg: ${Math.round(calculateAverageScore(quizResults))}%`}
                    variant="outlined"
                    sx={{ borderColor: getPerformanceColor(calculateAverageScore(quizResults), 'quiz'), color: getPerformanceColor(calculateAverageScore(quizResults), 'quiz') }}
                  />
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress sx={{ color: colors.primary }} />
                  </Box>
                ) : quizResults.length > 0 ? (
                  <>
                    <TableContainer component={Paper} sx={{
                      mb: 2,
                      ...darkThemeStyles.paper,
                      "& .MuiTable-root": darkThemeStyles.table
                    }}>
                      <Table>
                        <TableHead sx={darkThemeStyles.tableHead}>
                          <TableRow>
                            <TableCell sx={darkThemeStyles.tableCell}>Date</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Quiz Code</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Score</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Correct Answers</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Percentage</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {quizResults
                            .slice(quizPage * quizRowsPerPage, quizPage * quizRowsPerPage + quizRowsPerPage)
                            .map((result) => (
                              <TableRow key={result._id}
                                sx={{
                                  "&:hover": {
                                    backgroundColor: colors.tableRowHover
                                  }
                                }}
                              >
                                <TableCell sx={darkThemeStyles.tableCell}>{formatDate(result.submittedAt)}</TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>{result.quizCode}</TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>
                                  <Chip
                                    label={result.score}
                                    sx={{
                                      bgcolor: `${getPerformanceColor(result.percentage)}22`,
                                      color: getPerformanceColor(result.percentage),
                                      borderColor: getPerformanceColor(result.percentage),
                                      fontWeight: 'bold'
                                    }}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>{result.correctAnswers}/{result.totalQuestions}</TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>{result.percentage}%</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      rowsPerPageOptions={[10, 25, 50]}
                      component="div"
                      count={quizResults.length}
                      rowsPerPage={quizRowsPerPage}
                      page={quizPage}
                      onPageChange={(e, newPage) => setQuizPage(newPage)}
                      onRowsPerPageChange={(e) => {
                        setQuizRowsPerPage(parseInt(e.target.value, 10));
                        setQuizPage(0);
                      }}
                      sx={{
                        ...darkThemeStyles.tablePagination,
                        color: colors.textPrimary,
                        "& .MuiTablePagination-select": {
                          color: colors.textPrimary
                        },
                        "& .MuiTablePagination-selectIcon": {
                          color: colors.textPrimary
                        }
                      }}
                      labelRowsPerPage={
                        <Typography color={colors.textPrimary}>Rows per page:</Typography>
                      }
                    />
                  </>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center', ...darkThemeStyles.paper }}>
                    <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                      No theoretical assessments found for this team
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            {/* 5. PRACTICAL ASSESSMENTS (Updated Styling) */}
            {activeTab === 4 && (
              <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h5" sx={{ color: colors.primary }}>Practical Assessments</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<TableChartIcon />}
                        onClick={exportPracticalToExcel}
                        disabled={jobAssessments.length === 0}
                        sx={{ color: colors.success, borderColor: colors.success, '&:hover': { borderColor: colors.success, bgcolor: `${colors.success}11` } }}
                      >
                        Pro Excel
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={() => exportTestToPDF('practical', jobAssessments)}
                        disabled={jobAssessments.length === 0}
                        sx={{ color: colors.error, borderColor: colors.error, '&:hover': { borderColor: colors.error, bgcolor: `${colors.error}11` } }}
                      >
                        Pro PDF Report
                      </Button>
                    </Box>
                  </Box>
                  <Chip
                    label={`Avg: ${Number(calculateAverageScore(jobAssessments)).toFixed(1)}/5`}
                    variant="outlined"
                    sx={{ borderColor: getPerformanceColor(calculateAverageScore(jobAssessments), 'practical'), color: getPerformanceColor(calculateAverageScore(jobAssessments), 'practical') }}
                  />
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress sx={{ color: colors.primary }} />
                  </Box>
                ) : jobAssessments.length > 0 ? (
                  <>
                    <TableContainer component={Paper} sx={{
                      mb: 2,
                      ...darkThemeStyles.paper,
                      "& .MuiTable-root": darkThemeStyles.table
                    }}>
                      <Table>
                        <TableHead sx={darkThemeStyles.tableHead}>
                          <TableRow>
                            <TableCell sx={darkThemeStyles.tableCell}>Date</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Conducted By</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Score</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {jobAssessments
                            .slice(jobPage * jobRowsPerPage, jobPage * jobRowsPerPage + jobRowsPerPage)
                            .map((assessment) => (
                              <TableRow key={assessment._id}
                                sx={{
                                  "&:hover": {
                                    backgroundColor: colors.tableRowHover
                                  }
                                }}
                              >
                                <TableCell sx={darkThemeStyles.tableCell}>{formatDate(assessment.assessmentDate)}</TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>{assessment.conductedBy}</TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>
                                  <Chip
                                    label={`${Number(assessment.overallScore).toFixed(1)}/5`}
                                    sx={{
                                      bgcolor: `${getAssessmentStatus(assessment.overallScore, 'practical').color}22`,
                                      color: getAssessmentStatus(assessment.overallScore, 'practical').color,
                                      borderColor: getAssessmentStatus(assessment.overallScore, 'practical').color,
                                      border: '1px solid',
                                      fontWeight: 'bold'
                                    }}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>
                                  <Chip
                                    label={getAssessmentStatus(assessment.overallScore, 'practical').label}
                                    size="small"
                                    sx={{
                                      borderColor: getAssessmentStatus(assessment.overallScore, 'practical').color,
                                      color: getAssessmentStatus(assessment.overallScore, 'practical').color,
                                      border: '1px solid'
                                    }}
                                    variant="outlined"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      rowsPerPageOptions={[10, 25, 50]}
                      component="div"
                      count={jobAssessments.length}
                      rowsPerPage={jobRowsPerPage}
                      page={jobPage}
                      onPageChange={(e, newPage) => setJobPage(newPage)}
                      onRowsPerPageChange={(e) => {
                        setJobRowsPerPage(parseInt(e.target.value, 10));
                        setJobPage(0);
                      }}
                      sx={{
                        ...darkThemeStyles.tablePagination,
                        color: colors.textPrimary,
                        "& .MuiTablePagination-select": {
                          color: colors.textPrimary
                        },
                        "& .MuiTablePagination-selectIcon": {
                          color: colors.textPrimary
                        }
                      }}
                      labelRowsPerPage={
                        <Typography color={colors.textPrimary}>Rows per page:</Typography>
                      }
                    />
                  </>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center', ...darkThemeStyles.paper }}>
                    <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                      No practical assessments found for this team
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            {/* 6. LAB ASSESSMENTS (Updated Styling) */}
            {activeTab === 5 && (
              <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="h5" sx={{ color: colors.primary }}>Lab Assessments</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<TableChartIcon />}
                        onClick={exportLabToExcel}
                        disabled={labAssessments.length === 0}
                        sx={{ color: colors.success, borderColor: colors.success, '&:hover': { borderColor: colors.success, bgcolor: `${colors.success}11` } }}
                      >
                        Pro Excel
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={() => exportTestToPDF('lab', labAssessments)}
                        disabled={labAssessments.length === 0}
                        sx={{ color: colors.error, borderColor: colors.error, '&:hover': { borderColor: colors.error, bgcolor: `${colors.error}11` } }}
                      >
                        Pro PDF Report
                      </Button>
                    </Box>
                  </Box>
                  <Chip
                    label={`Avg: ${Math.round(calculateAverageScore(labAssessments))}%`}
                    variant="outlined"
                    sx={{ borderColor: getPerformanceColor(calculateAverageScore(labAssessments)), color: getPerformanceColor(calculateAverageScore(labAssessments)) }}
                  />
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress sx={{ color: colors.primary }} />
                  </Box>
                ) : labAssessments.length > 0 ? (
                  <>
                    <TableContainer component={Paper} sx={{
                      mb: 2,
                      ...darkThemeStyles.paper,
                      "& .MuiTable-root": darkThemeStyles.table
                    }}>
                      <Table>
                        <TableHead sx={darkThemeStyles.tableHead}>
                          <TableRow>
                            <TableCell sx={darkThemeStyles.tableCell}>Date</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Type</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>ONT Type</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Splicing Status</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Score</TableCell>
                            <TableCell sx={darkThemeStyles.tableCell}>Comments</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {labAssessments
                            .slice(labPage * labRowsPerPage, labPage * labRowsPerPage + labRowsPerPage)
                            .map((assessment) => (
                              <TableRow key={assessment._id}
                                sx={{
                                  "&:hover": {
                                    backgroundColor: colors.tableRowHover
                                  }
                                }}
                              >
                                <TableCell sx={darkThemeStyles.tableCell}>{formatDate(assessment.createdAt)}</TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>
                                  <Chip label={assessment.assessmentType || 'Technical'} size="small" variant="outlined" sx={{ color: colors.primary, borderColor: colors.primary }} />
                                </TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>{assessment.ontType?.name || 'N/A'}</TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>
                                  {assessment.assessmentType === 'Infrastructure' ? (
                                    <Chip
                                      label={assessment.splicingMachineStatus || 'Good'}
                                      size="small"
                                      sx={{
                                        bgcolor: assessment.splicingMachineStatus === 'Poor' ? `${colors.error}22` : assessment.splicingMachineStatus === 'Fair' ? `${colors.warning}22` : `${colors.success}22`,
                                        color: assessment.splicingMachineStatus === 'Poor' ? colors.error : assessment.splicingMachineStatus === 'Fair' ? colors.warning : colors.success,
                                        borderColor: assessment.splicingMachineStatus === 'Poor' ? colors.error : assessment.splicingMachineStatus === 'Fair' ? colors.warning : colors.success,
                                      }}
                                      variant="outlined"
                                    />
                                  ) : 'N/A'}
                                </TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>
                                  <Chip
                                    label={`${assessment.totalScore}%`}
                                    sx={{
                                      bgcolor: `${getPerformanceColor(assessment.totalScore)}22`,
                                      color: getPerformanceColor(assessment.totalScore),
                                      borderColor: getPerformanceColor(assessment.totalScore),
                                      fontWeight: 'bold'
                                    }}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell sx={darkThemeStyles.tableCell}>{assessment.comments || '-'}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      rowsPerPageOptions={[10, 25, 50]}
                      component="div"
                      count={labAssessments.length}
                      rowsPerPage={labRowsPerPage}
                      page={labPage}
                      onPageChange={(e, newPage) => setLabPage(newPage)}
                      onRowsPerPageChange={(e) => {
                        setLabRowsPerPage(parseInt(e.target.value, 10));
                        setLabPage(0);
                      }}
                      sx={{
                        ...darkThemeStyles.tablePagination,
                        color: colors.textPrimary,
                        "& .MuiTablePagination-select": {
                          color: colors.textPrimary
                        },
                        "& .MuiTablePagination-selectIcon": {
                          color: colors.textPrimary
                        }
                      }}
                      labelRowsPerPage={
                        <Typography color={colors.textPrimary}>Rows per page:</Typography>
                      }
                    />
                  </>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center', ...darkThemeStyles.paper }}>
                    <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                      No lab assessments found for this team
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            {/* Tab index 6 now corresponds to Smart Reports */}

            {/* 8. REPORTS (Index 6 after removal of Leaderboard tab) */}
            {activeTab === 6 && (
              <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" sx={{ color: colors.primary }}>Advanced Analytics & Reporting</Typography>
                  <Button
                    variant="contained"
                    startIcon={generatingReport ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <PictureAsPdfIcon />}
                    onClick={handleGenerateFullReport}
                    disabled={generatingReport || (quizResults.length === 0 && jobAssessments.length === 0 && labAssessments.length === 0)}
                    sx={{
                      bgcolor: colors.primary,
                      '&:hover': { bgcolor: colors.primary, opacity: 0.9 },
                      '&:disabled': { bgcolor: colors.textSecondary }
                    }}
                  >
                    {generatingReport ? 'Generating...' : 'Generate Full Evaluation'}
                  </Button>
                </Box>

                <Grid container spacing={3}>
                  {/* Strategic Benchmarking */}
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, ...darkThemeStyles.paper, height: '100%', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)' }}>
                      <Typography variant="h6" sx={{ mb: 2, color: colors.primary, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUpIcon /> Strategic Benchmarking
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {(() => {
                          const avgMastery = Math.round((calculateAverageScore(quizResults) + (calculateAverageScore(jobAssessments) * 20) + calculateAverageScore(labAssessments)) / 3);
                          const isMaster = avgMastery >= 85;
                          return (
                            <>
                              <Box>
                                <Typography variant="caption" color={colors.textSecondary}>Current Status</Typography>
                                <Typography variant="h5" sx={{ fontWeight: 700, color: isMaster ? colors.success : colors.warning }}>
                                  {isMaster ? 'Mastery Level' : 'Development Phase'}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color={colors.textSecondary}>Distance to Top Tier</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                  {avgMastery >= 90 ? 'Elite (Top 5%)' : `${90 - avgMastery}% to Elite`}
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(100, (avgMastery / 90) * 100)}
                                  sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { bgcolor: colors.primary } }}
                                />
                              </Box>
                              <Box sx={{ mt: 1, p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <Typography variant="caption" sx={{ color: colors.textSecondary, fontStyle: 'italic' }}>
                                  {avgMastery < 70 ? 'Recommendation: Remedial training required in core domains.'
                                    : avgMastery < 85 ? 'Recommendation: Focus on consistency and error reduction.'
                                      : 'Recommendation: Maintain performance; mentor other teams.'}
                                </Typography>
                              </Box>
                            </>
                          );
                        })()}
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Operational Balance Radar */}
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, ...darkThemeStyles.paper, height: '100%' }}>
                      <Typography variant="h6" sx={{ mb: 2, color: colors.primary }}>Performance Balance</Typography>
                      <ResponsiveContainer width="100%" height={280}>
                        <RadarChart data={[
                          {
                            subject: 'Theoretical',
                            score: calculateAverageScore(quizResults),
                            fullMark: 100
                          },
                          {
                            subject: 'Practical',
                            score: calculateAverageScore(jobAssessments) * 20, // Scale to 100
                            fullMark: 100
                          },
                          {
                            subject: 'Lab',
                            score: calculateAverageScore(labAssessments),
                            fullMark: 100
                          }
                        ]}>
                          <PolarGrid stroke={colors.border} />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: colors.textPrimary, fontSize: 10 }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: colors.textSecondary, fontSize: 8 }} />
                          <Radar name="Score" dataKey="score" stroke={colors.primary} fill={colors.primary} fillOpacity={0.3} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#252525', border: `1px solid ${colors.border}`, borderRadius: '12px' }}
                            formatter={(value) => `${Math.round(value)}%`}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>

                  {/* Strengths & Weaknesses */}
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, ...darkThemeStyles.paper, height: '100%' }}>
                      <Typography variant="h6" sx={{ mb: 2, color: colors.primary }}>Strengths & Weaknesses</Typography>
                      {(() => {
                        const { strengths, weaknesses } = identifyStrengthsAndWeaknesses();
                        return (
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: colors.success, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CheckCircleIcon fontSize="small" /> Top Strengths
                            </Typography>
                            {strengths.length > 0 ? (
                              <Box sx={{ mb: 3 }}>
                                {strengths.map((s, i) => (
                                  <Chip
                                    key={i}
                                    label={`${s.name}: ${Math.round(s.score)}%`}
                                    size="small"
                                    sx={{ m: 0.5, bgcolor: `${colors.success}22`, color: colors.success, borderColor: colors.success }}
                                    variant="outlined"
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color={colors.textSecondary} sx={{ mb: 3 }}>No data available</Typography>
                            )}

                            <Typography variant="subtitle2" sx={{ color: colors.error, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CancelIcon fontSize="small" /> Areas for Improvement
                            </Typography>
                            {weaknesses.length > 0 ? (
                              <Box>
                                {weaknesses.map((w, i) => (
                                  <Chip
                                    key={i}
                                    label={`${w.name}: ${Math.round(w.score)}%`}
                                    size="small"
                                    sx={{ m: 0.5, bgcolor: `${colors.error}22`, color: colors.error, borderColor: colors.error }}
                                    variant="outlined"
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color={colors.textSecondary}>No data available</Typography>
                            )}
                          </Box>
                        );
                      })()}
                    </Paper>
                  </Grid>

                  {/* Mastery & Consistency Metrics */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, ...darkThemeStyles.paper, height: '100%' }}>
                      <Typography variant="h6" sx={{ mb: 2, color: colors.primary }}>Consistency & Mastery Analysis</Typography>
                      <Grid container spacing={2}>
                        {[
                          { label: 'Overall Mastery', value: `${Math.round((calculateAverageScore(quizResults) + (calculateAverageScore(jobAssessments) * 20) + calculateAverageScore(labAssessments)) / 3)}%`, color: colors.primary },
                          { label: 'Theoretical Volatility', value: `${Math.round(calculateStandardDeviation(quizResults))}%`, color: colors.warning },
                          { label: 'Practical Consistency', value: calculateStandardDeviation(jobAssessments) < 10 ? 'High' : 'Variable', color: colors.success },
                          { label: 'Lab Mastery Rate', value: `${Math.round(calculatePercentageAboveThreshold(labAssessments, 80))}%`, color: colors.primary }
                        ].map((metric, i) => (
                          <Grid item xs={6} key={i}>
                            <Card sx={{ bgcolor: colors.surfaceElevated, border: `1px solid ${colors.border}` }}>
                              <CardContent sx={{ p: 2 }}>
                                <Typography variant="caption" color={colors.textSecondary}>{metric.label}</Typography>
                                <Typography variant="h6" sx={{ color: metric.color, fontWeight: 'bold' }}>{metric.value}</Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  </Grid>

                  {/* Process Efficiency Analysis */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, ...darkThemeStyles.paper, height: '100%' }}>
                      <Typography variant="h6" sx={{ mb: 2, color: colors.primary }}>Process Efficiency Analysis</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {[
                          { label: 'Avg Dispatch Speed', value: stats.avgDispatchTime, unit: 'days', color: colors.info },
                          { label: 'Avg Resolution Speed', value: stats.avgResolutionTime, unit: 'days', color: colors.success },
                          { label: 'Full Lifecycle Time', value: stats.avgLifecycleTime, unit: 'days', color: colors.warning }
                        ].map((metric, i) => (
                          <Box key={i}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2" color={colors.textSecondary}>{metric.label}</Typography>
                              <Typography variant="body2" fontWeight="bold" sx={{ color: metric.color }}>{metric.value} {metric.unit}</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(100, (metric.value / 10) * 100)}
                              sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { bgcolor: metric.color } }}
                            />
                          </Box>
                        ))}
                        <Box sx={{ mt: 1, p: 2, bgcolor: 'rgba(59, 130, 246, 0.05)', borderRadius: 2, border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                          <Typography variant="caption" sx={{ color: colors.info, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Info sx={{ fontSize: '1rem' }} /> Values normalized against 10-day benchmark.
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Performance Summary Section */}
            {(quizResults.length > 0 || jobAssessments.length > 0 || labAssessments.length > 0) && (
              <Box sx={{ mt: 5 }}>
                <Typography variant="h5" sx={{ color: colors.primary, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assessment /> Advanced Analytics
                </Typography>

                <Grid container spacing={3}>
                  {[
                    { name: 'Theoretical', data: quizResults, color: colors.primary },
                    { name: 'Practical', data: jobAssessments, color: colors.success },
                    { name: 'Lab', data: labAssessments, color: colors.warning }
                  ].filter(group => group.data.length > 0).map((group, idx) => (
                    <Grid item xs={12} key={idx}>
                      <Paper sx={{ p: 3, ...darkThemeStyles.paper, position: 'relative' }}>
                        <Typography variant="h6" sx={{ color: group.color, mb: 2 }}>{group.name} Analytics</Typography>
                        <Grid container spacing={4}>
                          <Grid item xs={12} md={4}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography color={colors.textSecondary}>Median Score</Typography>
                                <Typography fontWeight="bold">{Math.round(calculateMedianScore(group.data))}%</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography color={colors.textSecondary}>Volatility (StdDev)</Typography>
                                <Typography fontWeight="bold">{Math.round(calculateStandardDeviation(group.data))}%</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography color={colors.textSecondary}>Top Score</Typography>
                                <Typography sx={{ color: colors.success }} fontWeight="bold">{calculateHighestScore(group.data)}%</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography color={colors.textSecondary}>Mastery Rate ({'>'}80%)</Typography>
                                <Typography fontWeight="bold">{Math.round(calculatePercentageAboveThreshold(group.data, 80))}%</Typography>
                              </Box>
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={8}>
                            <Box sx={{ height: 200 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={group.data.map(item => ({
                                  date: formatDate(item.submittedAt || item.assessmentDate || item.createdAt),
                                  score: item.percentage || item.overallScore || item.totalScore || 0
                                })).reverse()}>
                                  <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} vertical={false} />
                                  <XAxis dataKey="date" hide />
                                  <YAxis domain={[0, 100]} hide />
                                  <RechartsTooltip contentStyle={{ backgroundColor: '#252525', border: `1px solid ${colors.border}`, borderRadius: '12px' }} />
                                  <Area
                                    type="monotone"
                                    dataKey="score"
                                    stroke={group.color}
                                    fill={group.color}
                                    fillOpacity={0.1}
                                    strokeWidth={2}
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </Box>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Box>
        )
      }
      <ViewIssueDetailsDialog
        open={detailIssueOpen}
        onClose={() => setDetailIssueOpen(false)}
        issue={selectedDetailIssue}
        onUpdate={() => {
          // Refresh data if needed, but since we are in drill-down,
          // maybe just update local state or dispatch global refresh
          window.dispatchEvent(new CustomEvent('cin-refresh'));
        }}
      />

      <ProfessionalChartDialog
        open={chartDialog.open}
        onClose={() => setChartDialog({ ...chartDialog, open: false })}
        title={chartDialog.title}
        data={chartDialog.data}
        type={chartDialog.type}
        stackKeys={chartDialog.stackKeys}
      />

      {/* Analytics Drill-Down Dialog */}
      <Dialog
        open={analyticsDrillDown.open}
        onClose={() => setAnalyticsDrillDown(prev => ({ ...prev, open: false }))}
        fullWidth
        maxWidth="lg"
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
              {analyticsDrillDown.title} ({analyticsDrillDown.tasks.length} Tasks)
            </Typography>
          </Box>
          <IconButton onClick={() => setAnalyticsDrillDown(prev => ({ ...prev, open: false }))} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                  <TableCell sx={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Week</TableCell>
                  <TableCell sx={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>SLID</TableCell>
                  <TableCell sx={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Customer</TableCell>
                  <TableCell sx={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Reason</TableCell>
                  <TableCell sx={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Owner</TableCell>
                  <TableCell sx={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Feedback</TableCell>
                  <TableCell sx={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Score</TableCell>
                  <TableCell sx={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }} align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analyticsDrillDown.tasks.map((task) => (
                  <TableRow key={task._id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                    <TableCell sx={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      {task.interviewDate ? getWeekNumber(task.interviewDate, settings?.weekStartDay, settings?.week1StartDate, settings?.week1EndDate, settings?.startWeekNumber).week : '-'}
                    </TableCell>
                    <TableCell sx={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>{task.slid}</TableCell>
                    <TableCell sx={{ color: '#fff', fontSize: '0.8rem' }}>{task.customerName}</TableCell>
                    <TableCell sx={{ color: alpha('#fff', 0.8), fontSize: '0.75rem' }}>
                      {Array.isArray(task.reason) ? task.reason.join(', ') : task.reason || '-'}
                    </TableCell>
                    <TableCell sx={{ color: alpha('#fff', 0.8), fontSize: '0.75rem' }}>
                      {Array.isArray(task.responsible) ? task.responsible.join(', ') : task.responsible || '-'}
                    </TableCell>
                    <TableCell sx={{ color: alpha('#fff', 0.6), fontSize: '0.7rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.customerFeedback || '-'}
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

      {/* Task Details Dialog */}
      {selectedTask && (
        <TaskDetailsDialog
          open={viewDialogOpen}
          onClose={() => {
            setViewDialogOpen(false);
            setSelectedTask(null);
          }}
          tasks={[selectedTask]}
          teamName={selectedTask.teamName || "Unknown Team"}
          onTaskUpdated={fetchGlobalData}
        />
      )}

    </Box >
  );
};

// --- Professional Chart Dialog Ported from Deep Dive ---
const ProfessionalChartDialog = ({ open, onClose, title, data, type: initialType = 'line', stackKeys = [] }) => {
  const [chartType, setChartType] = useState(initialType);

  useEffect(() => {
    if (open) setChartType(initialType);
  }, [open, initialType]);

  const renderChart = () => {
    const labelStyle = { fill: '#fff', fontSize: 10, fontWeight: 600 };
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

    switch (chartType) {
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={450}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#94a3b8', fontSize: 8 }} />
              <Radar name="Primary Metric" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }} />
            </RadarChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={450}>
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={450}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={450}>
            <RechartsPieChart>
              <RechartsPie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={140}
                paddingAngle={5}
                dataKey="value"
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </RechartsPie>
              <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }} />
              <RechartsLegend verticalAlign="bottom" height={36} />
            </RechartsPieChart>
          </ResponsiveContainer>
        );
      case 'bar':
      default:
        return (
          <ResponsiveContainer width="100%" height={450}>
            <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }} />
              <RechartsBar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Dialog fullWidth maxWidth="lg" open={open} onClose={onClose} PaperProps={{ sx: { bgcolor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', py: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>{title} Analytical Insight</Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>Advanced Pattern & Distribution Analysis</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {[
            { type: 'bar', icon: <BarChartIconMUI /> },
            { type: 'line', icon: <Timeline /> },
            { type: 'area', icon: <TrendingUp /> },
            { type: 'radar', icon: <Assessment /> },
            { type: 'pie', icon: <PieChartIcon /> }
          ].map(opt => (
            <IconButton
              key={opt.type}
              size="small"
              onClick={() => setChartType(opt.type)}
              sx={{
                color: chartType === opt.type ? '#fff' : '#94a3b8',
                bgcolor: chartType === opt.type ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                '&:hover': { bgcolor: '#3b82f6' },
                borderRadius: 2
              }}
            >
              {opt.icon}
            </IconButton>
          ))}
          <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
          <IconButton onClick={onClose} sx={{ color: '#94a3b8' }}><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 4 }}>
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          {renderChart()}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default FieldTeamPortal;
