import { useState, useEffect, useMemo, useCallback } from "react";
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
  Slider,
  Tooltip as MuiTooltip
} from "@mui/material";
import {
  ArrowBack, Quiz, Assignment, BarChart as BarChartIconMUI, SupportAgent,
  Warning, CheckCircle, Schedule, Info, PriorityHigh, Assessment, Timeline,
  Leaderboard as LeaderboardIcon, Close as CloseIcon, TrendingUp, TrendingDown,
  TrendingFlat, PieChart as PieChartIcon, CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon, PictureAsPdf as PictureAsPdfIcon, TableChart as TableChartIcon,
  Search as SearchIcon, FilterList as FilterListIcon, CalendarToday as CalendarTodayIcon,
  Event as EventIcon, Update as UpdateIcon, Visibility as VisibilityIcon, VerifiedUser,
  LocationOn,
  Shield,
  AutoStories,
  FactCheck,
  BugReport,
  Lightbulb
} from '@mui/icons-material';
import moment from "moment";
import { subDays, isAfter } from 'date-fns';

const normalizeText = (value) => {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(' ').toLowerCase().trim();
  return String(value).toLowerCase().trim();
};

const isTeamAccountable = (task) => Array.isArray(task?.teamAccountability) ? task?.teamAccountability.includes("Yes") : task?.teamAccountability === "Yes";

const calculateTeamExportSummary = (teamTasks, settings, latestSessionDate) => {
  const totalTasks = teamTasks.length;

  const teamDetractors = teamTasks.filter(item => {
    const score = item.evaluationScore || 0;
    const normalized = score <= 10 ? score * 10 : score;
    return normalized <= 60;
  }).length;

  const teamNeutrals = teamTasks.filter(item => {
    const score = item.evaluationScore || 0;
    const normalized = score <= 10 ? score * 10 : score;
    return normalized > 60 && normalized <= 80;
  }).length;

  const reachTasks = teamTasks.filter(item => isTeamAccountable(item));
  
  const reachCount = reachTasks.length;
  const reachDetractors = reachTasks.filter(item => {
    const score = item.evaluationScore || 0;
    const normalized = score <= 10 ? score * 10 : score;
    return normalized <= 60;
  }).length;
  
  const reachNeutrals = reachTasks.filter(item => {
    const score = item.evaluationScore || 0;
    const normalized = score <= 10 ? score * 10 : score;
    return normalized > 60 && normalized <= 80;
  }).length;

  // Snapshot logic for weekly/monthly
  const snapshots = {
    weekly: { total: 0, detractors: 0, neutrals: 0, reach: 0, key: '-' },
    monthly: { total: 0, detractors: 0, neutrals: 0, reach: 0, key: '-' }
  };

  if (totalTasks > 0) {
    // Find latest Week and Month in the data
    const taskDetails = teamTasks.map(t => {
      const d = t.interviewDate || t.pisDate || t.createdAt;
      const wInfo = getWeekNumber(d, settings?.weekStartDay, settings?.week1StartDate, settings?.week1EndDate, settings?.startWeekNumber);
      const mInfo = getMonthNumber(d, settings);
      return { 
        ...t, 
        weekKey: wInfo?.key || 'Unknown', 
        monthKey: mInfo?.key || 'Unknown',
        isReach: isTeamAccountable(t),
        isOwnerReach: fieldContainsReach(t.responsible),
        isDetractor: (() => { const s = t.evaluationScore || 0; return (s <= 10 ? s * 10 : s) <= 60; })(),
        isNeutral: (() => { const s = t.evaluationScore || 0; const n = (s <= 10 ? s * 10 : s); return n > 60 && n <= 80; })()
      };
    });

    const uniqueWeeks = [...new Set(taskDetails.map(t => t.weekKey))].sort().reverse();
    const uniqueMonths = [...new Set(taskDetails.map(t => t.monthKey))].sort().reverse();

    const latestWeek = uniqueWeeks[0];
    const latestMonth = uniqueMonths[0];

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const latestMonthName = latestMonth && latestMonth.startsWith('Month-') 
      ? monthNames[parseInt(latestMonth.split('-')[1]) - 1] 
      : latestMonth;

    const weekTasks = taskDetails.filter(t => t.weekKey === latestWeek);
    const monthTasks = taskDetails.filter(t => t.monthKey === latestMonth);

    snapshots.weekly = {
      key: latestWeek,
      total: weekTasks.length,
      detractors: weekTasks.filter(t => t.isDetractor).length,
      neutrals: weekTasks.filter(t => t.isNeutral).length,
      reach: weekTasks.filter(t => t.isReach).length,
      reachDetractors: weekTasks.filter(t => t.isReach && t.isDetractor).length,
      reachNeutrals: weekTasks.filter(t => t.isReach && t.isNeutral).length,
      ownerReachDetractors: weekTasks.filter(t => t.isOwnerReach && t.isDetractor).length,
      ownerReachNeutrals: weekTasks.filter(t => t.isOwnerReach && t.isNeutral).length
    };

    snapshots.monthly = {
      key: latestMonthName,
      total: monthTasks.length,
      detractors: monthTasks.filter(t => t.isDetractor).length,
      neutrals: monthTasks.filter(t => t.isNeutral).length,
      reach: monthTasks.filter(t => t.isReach).length,
      reachDetractors: monthTasks.filter(t => t.isReach && t.isDetractor).length,
      reachNeutrals: monthTasks.filter(t => t.isReach && t.isNeutral).length,
      ownerReachDetractors: monthTasks.filter(t => t.isOwnerReach && t.isDetractor).length,
      ownerReachNeutrals: monthTasks.filter(t => t.isOwnerReach && t.isNeutral).length
    };

    // Post-Session Snapshots
    if (latestSessionDate) {
      const postTasks = taskDetails.filter(t => {
        const d = t.interviewDate || t.pisDate || t.createdAt;
        return new Date(d) > latestSessionDate;
      });
      snapshots.postSession = {
        total: postTasks.length,
        detractors: postTasks.filter(t => t.isDetractor).length,
        neutrals: postTasks.filter(t => t.isNeutral).length,
        reach: postTasks.filter(t => t.isReach).length,
        reachDetractors: postTasks.filter(t => t.isReach && t.isDetractor).length,
        reachNeutrals: postTasks.filter(t => t.isReach && t.isNeutral).length
      };
    } else {
      snapshots.postSession = { total: 0, detractors: 0, neutrals: 0, reach: 0, reachDetractors: 0, reachNeutrals: 0 };
    }
  }

  return {
    totalTasks,
    teamDetractors,
    teamNeutrals,
    reachCount,
    reachDetractors,
    reachNeutrals,
    reachDetractorsPct: totalTasks > 0 ? Math.round((reachDetractors / totalTasks) * 100) : 0,
    reachNeutralsPct: totalTasks > 0 ? Math.round((reachNeutrals / totalTasks) * 100) : 0,
    snapshots,
    latestSessionDate,
    
    // Comparison Metrics (Before vs After)
    comparison: (() => {
      if (!latestSessionDate) return { improvementRate: 0, violationRateDelta: 0 };
      
      const sessionDate = new Date(latestSessionDate);
      const postTasks = teamTasks.filter(item => {
        const d = item.interviewDate || item.pisDate || item.createdAt;
        return d && new Date(d) > sessionDate;
      });
      const postViolations = postTasks.filter(item => {
        const score = item.evaluationScore || 0;
        const normalized = score <= 10 ? score * 10 : score;
        return normalized > 0 && normalized <= 80;
      }).length;
      
      const yearStart = new Date(sessionDate.getFullYear(), 0, 1);
      const preTasks = teamTasks.filter(item => {
        const d = item.interviewDate || item.pisDate || item.createdAt;
        return d && new Date(d) >= yearStart && new Date(d) < sessionDate;
      });
      const preViolations = preTasks.filter(item => {
        const score = item.evaluationScore || 0;
        const normalized = score <= 10 ? score * 10 : score;
        return normalized > 0 && normalized <= 80;
      }).length;

      const daysSince = Math.max(1, Math.ceil((new Date() - sessionDate) / (1000 * 60 * 60 * 24)));
      const daysBefore = Math.max(1, Math.ceil((sessionDate - yearStart) / (1000 * 60 * 60 * 24)));
      
      const avgPost = postTasks.length / daysSince;
      const avgPre = preTasks.length / daysBefore;
      
      const postRate = postTasks.length > 0 ? Math.round((postViolations / postTasks.length) * 100) : 0;
      const preRate = preTasks.length > 0 ? Math.round((preViolations / preTasks.length) * 100) : 0;

      return {
        improvementRate: avgPre > 0 ? Math.round(((avgPre - avgPost) / avgPre) * 100) : 0,
        violationRateDelta: postRate - preRate
      };
    })()
  };
};

const applySnapshotStyles = (ws, data) => {
  if (!ws || !data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const range = XLSX.utils.decode_range(ws['!ref']);
  
  // Style definitions
  const weeklyStyle = { fill: { fgColor: { rgb: "E3F2FD" } } }; // Very Light Blue
  const monthlyStyle = { fill: { fgColor: { rgb: "F1F8E9" } } }; // Very Light Green
  const postStyle = { fill: { fgColor: { rgb: "F3E5F5" } } };    // Very Light Purple
  const snapshotLabelStyle = { fill: { fgColor: { rgb: "F5F5F5" } }, font: { italic: true } };
  const headerBaseStyle = { 
    font: { bold: true, color: { rgb: "FFFFFF" } }, 
    fill: { fgColor: { rgb: "475569" } }, // Slate-600
    alignment: { horizontal: "center" }
  };

  for (let C = range.s.c; C <= range.e.c; ++C) {
    const colName = headers[C];
    let bodyStyle = null;
    
    if (colName && colName.startsWith('Weekly:')) {
      bodyStyle = weeklyStyle;
    } else if (colName && colName.startsWith('Monthly:')) {
      bodyStyle = monthlyStyle;
    } else if (colName && (colName.startsWith('Post:') || colName === 'Latest Session')) {
      bodyStyle = postStyle;
    } else if (colName === 'Latest Week' || colName === 'Latest Month') {
      bodyStyle = snapshotLabelStyle;
    }

    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) ws[cellRef] = { t: 'z', v: '' }; // Ensure cell exists
      
      if (R === 0) {
        // Header styling
        let headerColor = "475569";
        if (bodyStyle === weeklyStyle) headerColor = "1E88E5"; // Blue-600
        if (bodyStyle === monthlyStyle) headerColor = "43A047"; // Green-600
        if (bodyStyle === postStyle) headerColor = "8E24AA"; // Purple-600
        
        ws[cellRef].s = { 
          ...headerBaseStyle,
          fill: { fgColor: { rgb: headerColor } }
        };
      } else if (bodyStyle) {
        // Body styling for snapshot columns
        ws[cellRef].s = bodyStyle;
      }
    }
  }
};
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
import { FaCheckCircle, FaExclamationCircle, FaClipboardList, FaChartLine, FaFilter, FaSearch, FaTimes, FaCalendarAlt, FaUserTie, FaFileExcel, FaFileExport, FaEnvelope, FaRegSmile, FaEquals } from 'react-icons/fa';
import { MdInsights } from 'react-icons/md';
import ViewIssueDetailsDialog from "../components/ViewIssueDetailsDialog";
import { TaskDetailsDialog } from "../components/TaskDetailsDialog";
import TeamViolationOverview from "../components/FieldTeamPortal/TeamViolationOverview";
import ComparisonAnalytics from "../components/FieldTeamPortal/ComparisonAnalytics";

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

import XLSX from 'xlsx-js-style';
import FieldTeamTicketsForPortalReview from "../components/FieldTeamTicketsForPortalReview";


// --- Components ---

const StatCard = ({ title, count, total, color, icon, percentage, subtext, mainValue }) => (
  <Paper sx={{
    p: 2.5,
    background: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '24px',
    height: '100%',
    position: 'relative'
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
  </Paper>
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

const splitValues = (val) => {
  if (val === undefined || val === null || val === "") return [];
  if (Array.isArray(val)) {
    return val.flatMap(v => {
      if (typeof v === 'string') return v.split(/[,;|]/).map(s => s.trim());
      return v;
    });
  }
  return String(val).split(/[,;|]/).map(s => s.trim());
};

const normalizeValue = (name) => {
  if (!name || typeof name !== 'string') return 'Not specified';
  let n = name.trim();
  if (!n || n.toUpperCase() === 'N/A' || n.toUpperCase() === 'EMPTY' || n.toUpperCase() === 'NIL' || n.toUpperCase() === 'NOT SPECIFIED' || n.toUpperCase() === 'OTHER' || n.toUpperCase() === 'OTHERS') return 'Not specified';

  // Check for prioritized common values but keep their casing or standard format
  const uppercased = n.toUpperCase();
  if (uppercased === 'REACH') return 'Reach';
  if (uppercased === 'OJO') return 'OJO';
  if (uppercased === 'GAM') return 'GAM';
  if (uppercased === 'CUSTOMER') return 'Customer';

  return n;
};

const getViolationCohortLabel = (count) => {
  if (count === 0) return '0';
  if (count <= 4) return '1-4';
  if (count <= 8) return '5-8';
  if (count <= 12) return '9-12';
  if (count <= 16) return '13-16';
  if (count <= 20) return '17-20';
  return '21+';
};

const getTeamStatusLabel = (team) => {
  if (!team) return 'Inactive';
  if (team.isTerminated) return 'Terminated';
  if (team.isResigned) return 'Resigned';
  if (team.isSuspended) return 'Suspended';
  if (team.isOnLeave) return 'On Leave';
  return 'Active';
};

const buildCohortSummary = (teamItems = []) => {
  const summary = {};
  teamItems.forEach((team) => {
    const label = getViolationCohortLabel(team.count);
    if (!summary[label]) {
      summary[label] = { label, teams: 0, trainedTeams: 0, totalViolations: 0, activeTeams: 0, inactiveTeams: 0 };
    }
    summary[label].teams += 1;
    summary[label].totalViolations += team.count;
    if (team.trained) {
      summary[label].trainedTeams += 1;
    }
    if (team.active) {
      summary[label].activeTeams += 1;
    } else {
      summary[label].inactiveTeams += 1;
    }
  });
  return Object.values(summary).sort((a, b) => {
    const parseRange = (label) => {
      if (label === '0') return 0;
      const parts = label.split(/[-+]/);
      return Number(parts[0]) || 0;
    };
    return parseRange(a.label) - parseRange(b.label);
  }).map((item) => ({
    ...item,
    trainedPercent: item.teams > 0 ? Math.round((item.trainedTeams / item.teams) * 100) : 0
  }));
};

const extractOwners = (task) => {
  if (!task) return [];

  // 1. Check responsible array/string (Primary)
  const resp = splitValues(task.responsible);
  if (resp.length > 0 && resp.some(v => v && v !== 'Empty')) {
    return resp.map(normalizeValue);
  }

  return []; // No fallback to assignedTo; globalAnalytics will default to 'Not specified'
};

const FieldTeamPortal = () => {
  // const user = useSelector((state) => state?.auth?.user);
  const { teamId } = useParams();
  const navigate = useNavigate();

  // Field Teams state
  const [activeGlobalOwnershipInsight, setActiveGlobalOwnershipInsight] = useState(null);
  const [feedbackDialog, setFeedbackDialog] = useState({ open: false, content: '' });
  const [fieldTeams, setFieldTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  // console.log({ selectedTeam });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Quiz results state
  const [quizResults, setQuizResults] = useState([]);

  const getAssessmentStatus = (score, type = "quiz") => {
    let thresholds = {
      average: 70,
      fail: 60,
    };

    if (type === "practical") {
      thresholds = {
        average: 3.5,
        fail: 3,
      };
    }

    const passThreshold = type === "practical" ? 4.5 : 85;

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

    results.forEach((result) => {
      const score = result.overallScore || result.percentage || 0;
      if (score < 50) distribution['0-49']++;
      else if (score < 75) distribution['50-74']++;
      else if (score < 90) distribution['75-89']++;
      else distribution['90-100']++;
    });

    return Object.keys(distribution).map((range) => ({
      range,
      count: distribution[range],
    }));
  };

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
  const isMobile = useMediaQuery('(max-width:600px)');
  const isMedium = useMediaQuery('(max-width:960px)');

  // New Analytical States
  const [activeOwnershipInsight, setActiveOwnershipInsight] = useState(null);
  const [showPostSessionRegistry, setShowPostSessionRegistry] = useState(false);
  const [activePostSessionOwner, setActivePostSessionOwner] = useState(null);

  // Drill-down state
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownItems, setDrillDownItems] = useState([]);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [drillDownType, setDrillDownType] = useState('issue'); // 'issue', 'task', 'mixed'
  const [drillDownTab, setDrillDownTab] = useState('tasks'); // 'tasks', 'issues'

  // View Issue Details State
  const [selectedDetailIssue, setSelectedDetailIssue] = useState(null);
  const [detailIssueOpen, setDetailIssueOpen] = useState(false);
  const [verbatimDialogOpen, setVerbatimDialogOpen] = useState(false);
  const [selectedVerbatim, setSelectedVerbatim] = useState("");

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
  const [allTrainingSessionsGlobal, setAllTrainingSessionsGlobal] = useState([]);

  // NEW: State for Global Analytics Tab
  const [globalTab, setGlobalTab] = useState(0);
  const [analyticsSubTab, setAnalyticsSubTab] = useState(0); // 0: All, 1: Detractors, 2: Neutrals
  const [samplesTokenData, setSamplesTokenData] = useState([]);

  // Fetch Samples Token Data for targets
  useEffect(() => {
    const fetchSamplesToken = async () => {
      try {
        const response = await api.get(`/samples-token/${new Date().getFullYear()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        setSamplesTokenData(response.data || []);
      } catch (err) {
        console.error("Error fetching samples token:", err);
      }
    };
    fetchSamplesToken();
  }, []);
  const [offendersPage, setOffendersPage] = useState(1);

  // Analytics Drill-Down State
  const [analyticsDrillDown, setAnalyticsDrillDown] = useState({
    open: false,
    title: '',
    tasks: []
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [cohortDialogOpen, setCohortDialogOpen] = useState(false);
  const [cohortDialogItems, setCohortDialogItems] = useState([]);
  const [cohortDialogLabel, setCohortDialogLabel] = useState('');

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

  // --- Task Overview Filtering State ---
  const [taskTimeFilterMode, setTaskTimeFilterMode] = useState('all');
  const [taskRecentDaysValue, setTaskRecentDaysValue] = useState(30);
  const [taskSelectedWeeks, setTaskSelectedWeeks] = useState([]);
  const [taskSelectedMonths, setTaskSelectedMonths] = useState([]);
  const [taskCustomDateRange, setTaskCustomDateRange] = useState({ start: '', end: '' });

  const filteredTechnicalTasks = useMemo(() => {
    const techTasks = Array.isArray(technicalTasks) ? technicalTasks : [];
    let filtered = techTasks;

    const getDate = (t) => t.pisDate || t.createdAt;
    // For week/month/custom categorization use interviewDate — this is what the rest of the
    // portal uses to assign tasks to a given week (see lines 973, 1778, 6753).
    // Falls back to pisDate or createdAt if interviewDate is absent.
    const getCatDate = (t) => t.interviewDate || t.pisDate || t.createdAt;

    if (taskTimeFilterMode === 'days') {
      const cutoff = subDays(new Date(), taskRecentDaysValue);
      filtered = techTasks.filter(t => getDate(t) && isAfter(new Date(getDate(t)), cutoff));
    } else if (taskTimeFilterMode === 'weeks' && taskSelectedWeeks.length > 0) {
      filtered = techTasks.filter(t => {
        if (!getCatDate(t)) return false;
        const { key } = getWeekNumber(getCatDate(t), settings?.weekStartDay, settings?.week1StartDate, settings?.week1EndDate, settings?.startWeekNumber);
        return taskSelectedWeeks.includes(key);
      });
    } else if (taskTimeFilterMode === 'months' && taskSelectedMonths.length > 0) {
      filtered = techTasks.filter(t => {
        if (!getCatDate(t)) return false;
        const monthInfo = getMonthNumber(getCatDate(t), settings);
        // Handle both string keys and month objects
        return monthInfo && taskSelectedMonths.some(m => (typeof m === 'string' ? m : m.key) === monthInfo.key);
      });
    } else if (taskTimeFilterMode === 'custom' && taskCustomDateRange.start && taskCustomDateRange.end) {
      const start = new Date(taskCustomDateRange.start);
      const end = new Date(taskCustomDateRange.end);
      end.setHours(23, 59, 59, 999);
      filtered = techTasks.filter(t => {
        const d = new Date(getCatDate(t));
        return d >= start && d <= end;
      });
    }
    return filtered;
  }, [technicalTasks, taskTimeFilterMode, taskRecentDaysValue, taskSelectedWeeks, taskSelectedMonths, taskCustomDateRange, settings]);

  // --- Statistics Calculation (Ported from CustomerIssuesAnalytics.jsx) ---
  const individualTeamAnalytics = useMemo(() => {
    const tasksToProcess = filteredTechnicalTasks || [];

    const stats = {
      byOwner: {},
      byReason: {},
      bySubReason: {},
      byRootCause: {},
      detailedOwners: {},
      detailedReasons: {},
      detailedSubReasons: {},
      detailedRootCauses: {},
      sentiment: { Promoter: 0, Neutral: 0, Detractor: 0, NotEvaluated: 0 }
    };

    const scoringKeysMap = (settings?.scoringKeys || [])
      .filter(k => k.targetForm === 'Task' || k.targetForm === 'Both')
      .reduce((acc, key) => {
        acc[key.label] = key.points || 0;
        return acc;
      }, {});

    tasksToProcess.forEach(task => {
      const rawOwners = extractOwners(task);
      const rawReasons = splitValues(task.reason).map(normalizeValue);
      const rawSubReasons = splitValues(task.subReason).map(normalizeValue);
      const rawRootCauses = splitValues(task.rootCause).map(normalizeValue);
      const rawItnRelated = splitValues(task.itnRelated);
      const rawSubscriptionRelated = splitValues(task.relatedToSubscription);

      const maxLen = Math.max(
        rawReasons.length,
        rawSubReasons.length,
        rawRootCauses.length,
        rawOwners.length,
        rawItnRelated.length,
        rawSubscriptionRelated.length,
        1
      );

      const tuples = [];
      for (let i = 0; i < maxLen; i++) {
        const owner = rawOwners[i] || 'Not specified';
        const reason = rawReasons[i] || 'Not specified';
        const subReason = rawSubReasons[i] || 'Not specified';
        const rootCause = rawRootCauses[i] || 'Not specified';
        const itnVal = rawItnRelated[i] || 'No';
        const subVal = rawSubscriptionRelated[i] || 'No';

        const isGarbage = (owner === 'Not specified' || !owner) &&
          (reason === 'Not specified' || !reason) &&
          (subReason === 'Not specified' || !subReason) &&
          (rootCause === 'Not specified' || !rootCause);

        if (!isGarbage || i === 0) {
          tuples.push({
            owner,
            reason,
            subReason,
            rootCause,
            isITN: itnVal === 'Yes' || itnVal === true,
            isSubscription: subVal === 'Yes' || subVal === true
          });
        }
      }

      let taskPoints = 0;
      if (Array.isArray(task.scoringKeys)) {
        task.scoringKeys.forEach(keyLabel => {
          if (scoringKeysMap[keyLabel]) taskPoints += scoringKeysMap[keyLabel];
        });
      }

      tuples.forEach(tuple => {
        const { owner, reason, subReason, rootCause, isITN, isSubscription } = tuple;
        stats.byOwner[owner] = (stats.byOwner[owner] || 0) + 1;
        stats.byReason[reason] = (stats.byReason[reason] || 0) + 1;
        stats.bySubReason[subReason] = (stats.bySubReason[subReason] || 0) + 1;
        stats.byRootCause[rootCause] = (stats.byRootCause[rootCause] || 0) + 1;

        if (!stats.detailedOwners[owner]) {
          stats.detailedOwners[owner] = { total: 0, itn: 0, subscription: 0, points: 0 };
        }
        stats.detailedOwners[owner].total++;
        if (isITN) stats.detailedOwners[owner].itn++;
        if (isSubscription) stats.detailedOwners[owner].subscription++;

        const updateDetail = (map, label) => {
          if (!map[label]) map[label] = { total: 0, itn: 0, subscription: 0, ownerBreakdown: {} };
          map[label].total++;
          if (isITN) map[label].itn++;
          if (isSubscription) map[label].subscription++;
          map[label].ownerBreakdown[owner] = (map[label].ownerBreakdown[owner] || 0) + 1;
        };

        updateDetail(stats.detailedReasons, reason);
        updateDetail(stats.detailedSubReasons, subReason);
        updateDetail(stats.detailedRootCauses, rootCause);
      });

      [...new Set(rawOwners)].forEach(o => {
        if (!stats.detailedOwners[o]) {
          stats.detailedOwners[o] = { total: 0, itn: 0, subscription: 0, points: 0 };
        }
        stats.detailedOwners[o].points += taskPoints;
      });

      let score = task.evaluationScore;
      if (score && score > 0) {
        if (score <= 6) stats.sentiment.Detractor++;
        else if (score >= 7 && score <= 8) stats.sentiment.Neutral++;
        else if (score >= 9) stats.sentiment.Promoter++;
        else stats.sentiment.NotEvaluated++;
      } else {
        stats.sentiment.NotEvaluated++;
      }
    });

    const toChartData = (obj) => {
      const entries = Object.entries(obj).map(([name, value]) => ({ name, value }));
      const total = entries.reduce((sum, item) => sum + item.value, 0);
      return entries.map(item => ({
        ...item,
        percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
      })).sort((a, b) => b.value - a.value);
    };

    const matrixOwners = Object.keys(stats.detailedOwners).sort((a, b) => stats.detailedOwners[b].total - stats.detailedOwners[a].total).slice(0, 5);

    // Calculate focused data if an ownership is selected
    let focusedData = null;
    if (activeOwnershipInsight) {
      const ownerTasks = tasksToProcess.filter(t => extractOwners(t).includes(activeOwnershipInsight));
      const fStats = { byReason: {}, bySubReason: {}, byRootCause: {} };

      ownerTasks.forEach(task => {
        const rawReasons = splitValues(task.reason).map(normalizeValue);
        const rawSubReasons = splitValues(task.subReason).map(normalizeValue);
        const rawRootCauses = splitValues(task.rootCause).map(normalizeValue);

        const mLen = Math.max(rawReasons.length, rawSubReasons.length, rawRootCauses.length, 1);
        for (let i = 0; i < mLen; i++) {
          const r = rawReasons[i] || 'Not specified';
          const sr = rawSubReasons[i] || 'Not specified';
          const rc = rawRootCauses[i] || 'Not specified';

          if (r !== 'Not specified' || sr !== 'Not specified' || rc !== 'Not specified' || i === 0) {
            fStats.byReason[r] = (fStats.byReason[r] || 0) + 1;
            fStats.bySubReason[sr] = (fStats.bySubReason[sr] || 0) + 1;
            fStats.byRootCause[rc] = (fStats.byRootCause[rc] || 0) + 1;
          }
        }
      });

      focusedData = {
        reasonData: toChartData(fStats.byReason),
        subReasonData: toChartData(fStats.bySubReason),
        rootCauseData: toChartData(fStats.byRootCause),
        total: ownerTasks.length
      };
    }

    return {
      totalProcessed: tasksToProcess.length,
      ownerData: toChartData(stats.byOwner),
      reasonData: toChartData(stats.byReason),
      subReasonData: toChartData(stats.bySubReason),
      rootCauseData: toChartData(stats.byRootCause),
      detailedOwners: Object.entries(stats.detailedOwners).map(([name, d]) => ({ name, ...d, percentage: tasksToProcess.length > 0 ? ((d.total / tasksToProcess.length) * 100).toFixed(1) : 0 })).sort((a, b) => b.total - a.total),
      detailedReasons: Object.entries(stats.detailedReasons).map(([name, d]) => ({ name, ...d, percentage: tasksToProcess.length > 0 ? ((d.total / tasksToProcess.length) * 100).toFixed(1) : 0 })).sort((a, b) => b.total - a.total),
      detailedSubReasons: Object.entries(stats.detailedSubReasons).map(([name, d]) => ({ name, ...d, percentage: tasksToProcess.length > 0 ? ((d.total / tasksToProcess.length) * 100).toFixed(1) : 0 })).sort((a, b) => b.total - a.total),
      detailedRootCauses: Object.entries(stats.detailedRootCauses).map(([name, d]) => ({ name, ...d, percentage: tasksToProcess.length > 0 ? ((d.total / tasksToProcess.length) * 100).toFixed(1) : 0 })).sort((a, b) => b.total - a.total),
      sentimentData: [
        { name: 'Promoters', value: stats.sentiment.Promoter, color: '#10b981', percentage: tasksToProcess.length > 0 ? ((stats.sentiment.Promoter / tasksToProcess.length) * 100).toFixed(1) : 0 },
        { name: 'Neutrals', value: stats.sentiment.Neutral, color: '#f59e0b', percentage: tasksToProcess.length > 0 ? ((stats.sentiment.Neutral / tasksToProcess.length) * 100).toFixed(1) : 0 },
        { name: 'Detractors', value: stats.sentiment.Detractor, color: '#ef4444', percentage: tasksToProcess.length > 0 ? ((stats.sentiment.Detractor / tasksToProcess.length) * 100).toFixed(1) : 0 },
      ],
      matrixOwners,
      sentiment: stats.sentiment,
      focusedData
    };
  }, [filteredTechnicalTasks, settings, activeOwnershipInsight]);

  // --- NEW: Post-Session Deep Dive Logic ---
  const postSessionAnalytics = useMemo(() => {
    if (!selectedTeam || !Array.isArray(selectedTeam.sessionHistory) || selectedTeam.sessionHistory.length === 0) {
      return null;
    }

    // 1. Find latest session date
    const sessionDates = selectedTeam.sessionHistory
      .map(s => s.sessionDate)
      .filter(d => d)
      .map(d => new Date(d));

    if (sessionDates.length === 0) return null;
    const latestSessionDate = new Date(Math.max(...sessionDates));

    // 2. Pre-session tasks (BEFORE the session) — used for recurrence detection
    const preSessionTasks = (technicalTasks || []).filter(t => {
      const taskDate = new Date(t.pisDate || t.createdAt);
      return taskDate <= latestSessionDate;
    });

    // Build known pre-session reason/subReason/rootCause sets
    const preReasons = new Set();
    const preSubReasons = new Set();
    const preRootCauses = new Set();
    preSessionTasks.forEach(t => {
      splitValues(t.reason).map(normalizeValue).forEach(v => { if (v !== 'Not specified') preReasons.add(v); });
      splitValues(t.subReason).map(normalizeValue).forEach(v => { if (v !== 'Not specified') preSubReasons.add(v); });
      splitValues(t.rootCause).map(normalizeValue).forEach(v => { if (v !== 'Not specified') preRootCauses.add(v); });
    });

    // 3. Post-session tasks (AFTER latest session)
    const postSessionTasks = (technicalTasks || []).filter(t => {
      const taskDate = new Date(t.pisDate || t.createdAt);
      return isAfter(taskDate, latestSessionDate);
    });

    if (postSessionTasks.length === 0) {
      return {
        hasTasks: false,
        latestSessionDate,
        totalPostTasks: 0
      };
    }

    // 4. Process detailed stats
    const stats = {
      Detractor: 0,
      Neutral: 0,
      Promoter: 0,
      byOwner: {},
      byReason: {},
      bySubReason: {},
      byRootCause: {}
    };

    const toChartDataLocal = (obj) => {
      const entries = Object.entries(obj).map(([name, value]) => ({ name, value }));
      const total = entries.reduce((sum, item) => sum + item.value, 0);
      return entries.map(item => ({
        ...item,
        percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
      })).sort((a, b) => b.value - a.value);
    };

    // Per-owner breakdown map: { ownerName: { byReason, bySubReason, byRootCause } }
    const byOwnerDetail = {};

    const enrichedTasks = postSessionTasks.map(task => {
      let score = task.evaluationScore;
      if (score && score > 0) {
        if (score <= 6) stats.Detractor++;
        else if (score >= 7 && score <= 8) stats.Neutral++;
        else if (score >= 9) stats.Promoter++;
      }

      const owners = extractOwners(task);
      const rawReasons = splitValues(task.reason).map(normalizeValue);
      const rawSubReasons = splitValues(task.subReason).map(normalizeValue);
      const rawRootCauses = splitValues(task.rootCause).map(normalizeValue);

      // Recurrence: true if ALL main reasons/subReasons/rootCauses existed pre-session
      const isRepeatReason = rawReasons.length > 0 && rawReasons.filter(r => r !== 'Not specified').every(r => preReasons.has(r));
      const isRepeatSubReason = rawSubReasons.length > 0 && rawSubReasons.filter(r => r !== 'Not specified').every(r => preSubReasons.has(r));
      const isRepeatRootCause = rawRootCauses.length > 0 && rawRootCauses.filter(r => r !== 'Not specified').every(r => preRootCauses.has(r));
      const isRepeat = isRepeatReason && isRepeatSubReason && isRepeatRootCause;

      owners.forEach(o => {
        stats.byOwner[o] = (stats.byOwner[o] || 0) + 1;
        if (!byOwnerDetail[o]) byOwnerDetail[o] = { byReason: {}, bySubReason: {}, byRootCause: {} };
      });

      const mLen = Math.max(rawReasons.length, rawSubReasons.length, rawRootCauses.length, 1);
      for (let i = 0; i < mLen; i++) {
        const r = rawReasons[i] || 'Not specified';
        const sr = rawSubReasons[i] || 'Not specified';
        const rc = rawRootCauses[i] || 'Not specified';
        if (r !== 'Not specified' || i === 0) stats.byReason[r] = (stats.byReason[r] || 0) + 1;
        if (sr !== 'Not specified' || i === 0) stats.bySubReason[sr] = (stats.bySubReason[sr] || 0) + 1;
        if (rc !== 'Not specified' || i === 0) stats.byRootCause[rc] = (stats.byRootCause[rc] || 0) + 1;

        owners.forEach(o => {
          if (byOwnerDetail[o]) {
            if (r !== 'Not specified' || i === 0) byOwnerDetail[o].byReason[r] = (byOwnerDetail[o].byReason[r] || 0) + 1;
            if (sr !== 'Not specified' || i === 0) byOwnerDetail[o].bySubReason[sr] = (byOwnerDetail[o].bySubReason[sr] || 0) + 1;
            if (rc !== 'Not specified' || i === 0) byOwnerDetail[o].byRootCause[rc] = (byOwnerDetail[o].byRootCause[rc] || 0) + 1;
          }
        });
      }

      return { ...task, isRepeat, isRepeatReason, isRepeatSubReason, isRepeatRootCause };
    });

    const ownerData = toChartDataLocal(stats.byOwner).slice(0, 10);

    // Build per-owner chart data
    const ownerChartData = {};
    Object.entries(byOwnerDetail).forEach(([owner, detail]) => {
      ownerChartData[owner] = {
        reasonData: toChartDataLocal(detail.byReason),
        subReasonData: toChartDataLocal(detail.bySubReason),
        rootCauseData: toChartDataLocal(detail.byRootCause),
      };
    });

    return {
      hasTasks: true,
      latestSessionDate,
      totalPostTasks: postSessionTasks.length,
      sentiment: stats,
      ownerData,
      ownerChartData,
      reasonData: toChartDataLocal(stats.byReason),
      subReasonData: toChartDataLocal(stats.bySubReason),
      rootCauseData: toChartDataLocal(stats.byRootCause),
      tasks: enrichedTasks,
      preReasons,
      preSubReasons,
      preRootCauses,
    };
  }, [selectedTeam, technicalTasks]);

  const handleIndividualAnalyticsDrillDown = useCallback(({ owner, reason, subReason, rootCause, itn, subscription }) => {
    let tasks = filteredTechnicalTasks || [];

    if (owner) {
      tasks = tasks.filter(t => {
        const owners = extractOwners(t);
        return owners.includes(owner);
      });
    }

    if (reason) {
      tasks = tasks.filter(t => splitValues(t.reason).map(normalizeValue).includes(reason));
    }

    if (subReason) {
      tasks = tasks.filter(t => splitValues(t.subReason).map(normalizeValue).includes(subReason));
    }

    if (rootCause) {
      tasks = tasks.filter(t => splitValues(t.rootCause).map(normalizeValue).includes(rootCause));
    }

    if (itn) {
      tasks = tasks.filter(t => splitValues(t.itnRelated).includes('Yes'));
    }

    if (subscription) {
      tasks = tasks.filter(t => splitValues(t.relatedToSubscription).includes('Yes'));
    }

    setAnalyticsDrillDown({
      open: true,
      title: `Team Analytics: ${owner || reason || subReason || rootCause || 'Filtered'}`,
      tasks: tasks.map(t => ({ ...t, __drillType: 'task' }))
    });
  }, [filteredTechnicalTasks]);
  const filteredCustomerIssues = useMemo(() => {
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
    if (analyticsSubTab === 1) { // Detractors (score <= 6)
      tasksToProcess = timeFiltered.filter(t => {
        let score = t.evaluationScore;
        return score && score > 0 && score <= 6;
      });
    } else if (analyticsSubTab === 2) { // Neutrals (score 7-8)
      tasksToProcess = timeFiltered.filter(t => {
        let score = t.evaluationScore;
        return score && score >= 7 && score <= 8;
      });
    }

    const stats = {
      byOwner: {},
      byReason: {},
      bySubReason: {},
      byRootCause: {},
      byGovernorate: {},
      byFieldTeam: {},
      fieldTeamDetails: {},
      contributionMatrix: {}, // Owner vs Reason
      rootCauseMatrix: {},    // Owner vs Root Cause
      sentiment: { Promoter: 0, Neutral: 0, Detractor: 0, NotEvaluated: 0 },
      // NEW: Detailed tracking for Advanced Analytics Tables
      detailedOwners: {},
      detailedReasons: {},
      detailedSubReasons: {},
      detailedRootCauses: {},
      detailedGovernorates: {},
      detailedFieldTeams: {},
      // Global Totals for Contribution Calculations
      totalDetractors: 0,
      totalNeutrals: 0,
      totalReachDetractors: 0,
      totalReachCounts: 0
    };

    // Create a lookup map for scoring keys: Label -> Points (filtered for Task/Both by default as this processes techTasks)
    const scoringKeysMap = (settings?.scoringKeys || [])
      .filter(k => k.targetForm === 'Task' || k.targetForm === 'Both')
      .reduce((acc, key) => {
        acc[key.label] = key.points || 0;
        return acc;
      }, {});

    // Use Global Technical Tasks (NPS Tickets) as primary source
    tasksToProcess.forEach(task => {
      const rawOwners = extractOwners(task);
      const rawReasons = splitValues(task.reason).map(normalizeValue);
      const rawSubReasons = splitValues(task.subReason).map(normalizeValue);
      const rawRootCauses = splitValues(task.rootCause).map(normalizeValue);
      const rawItnRelated = splitValues(task.itnRelated);
      const rawSubscriptionRelated = splitValues(task.relatedToSubscription);

      const maxLen = Math.max(
        rawReasons.length,
        rawSubReasons.length,
        rawRootCauses.length,
        rawOwners.length,
        rawItnRelated.length,
        rawSubscriptionRelated.length,
        1
      );

      // Create Tuples for aligned processing
      const tuples = [];
      for (let i = 0; i < maxLen; i++) {
        const owner = rawOwners[i] || 'Not specified';
        const reason = rawReasons[i] || 'Not specified';
        const subReason = rawSubReasons[i] || 'Not specified';
        const rootCause = rawRootCauses[i] || 'Not specified';
        const itnVal = rawItnRelated[i] || 'No';
        const subVal = rawSubscriptionRelated[i] || 'No';

        // ONLY keep tuple if it's NOT just garbage (all fields empty/Not specified)
        const isGarbage = (owner === 'Not specified' || !owner) &&
          (reason === 'Not specified' || !reason) &&
          (subReason === 'Not specified' || !subReason) &&
          (rootCause === 'Not specified' || !rootCause);

        if (!isGarbage || i === 0) { // Keep 1st row even if empty, or only non-garbage
          tuples.push({
            owner,
            reason,
            subReason,
            rootCause,
            isITN: itnVal === 'Yes' || itnVal === true,
            isSubscription: subVal === 'Yes' || subVal === true
          });
        }
      }

      const governorate = task.governorate ? String(task.governorate).trim() : 'Not specified';
      const fieldTeam = task.teamName || 'Unknown';
      const category = task.category || 'Not specified';

      // Track governorate counts and details
      stats.byGovernorate[governorate] = (stats.byGovernorate[governorate] || 0) + 1;
      const hasITN = tuples.some(t => t.isITN);
      const hasSubscription = tuples.some(t => t.isSubscription);
      if (!stats.detailedGovernorates[governorate]) {
        stats.detailedGovernorates[governorate] = { total: 0, itn: 0, subscription: 0 };
      }
      stats.detailedGovernorates[governorate].total++;
      if (hasITN) stats.detailedGovernorates[governorate].itn++;
      if (hasSubscription) stats.detailedGovernorates[governorate].subscription++;

      // Calculate Points (apply once per task, or shared across owners?)
      // User likely wants points to be associated with the task itself, but we display them per owner.
      let taskPoints = 0;
      if (Array.isArray(task.scoringKeys)) {
        task.scoringKeys.forEach(keyLabel => {
          if (scoringKeysMap[keyLabel]) taskPoints += scoringKeysMap[keyLabel];
        });
      }

      // Track Team/Governorate Stats
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

      // Calculate Task-level NPS/Sentiment metrics
      const score = task.evaluationScore;
      const isDetractor = !!(score && score > 0 && score <= 6);
      const isNeutral = !!(score && score >= 7 && score <= 8);
      const isPromoter = !!(score && score >= 9);
      const isReachTask = Array.isArray(task.teamAccountability) ? task.teamAccountability.includes("Yes") : task.teamAccountability === 'Yes';

      if (isDetractor) {
        teamStats.npsBreakdown.Detractor++;
        stats.sentiment.Detractor++;
        stats.totalDetractors++;
      } else if (isNeutral) {
        teamStats.npsBreakdown.Neutral++;
        stats.sentiment.Neutral++;
        stats.totalNeutrals++;
      } else if (isPromoter) {
        teamStats.npsBreakdown.Promoter++;
        stats.sentiment.Promoter++;
      } else {
        teamStats.npsBreakdown.NotEvaluated++;
        stats.sentiment.NotEvaluated++;
      }

      // Unified Detail Updater Helper
      const updateDetail = (map, label, owner, isITN, isSubscription) => {
        if (!map[label]) {
          map[label] = { 
            total: 0, itn: 0, subscription: 0, 
            detractors: 0, neutrals: 0, 
            reachCounts: 0, reachDetractors: 0,
            ownerBreakdown: {} 
          };
        }
        const slice = map[label];
        slice.total++;
        if (isITN) slice.itn++;
        if (isSubscription) slice.subscription++;
        if (isDetractor) slice.detractors++;
        if (isNeutral) slice.neutrals++;
        if (owner === 'Reach') {
          slice.reachCounts++;
          stats.totalReachCounts++; // This is per-tuple reach contribution
        }
        if (isReachTask && isDetractor) {
          // Note: This logic follows the per-task rule for "Reach Detractors" but can be tuple-aligned if needed.
          // For now, if a task is a Reach Detractor, every tuple associated with it gets one "Reach Detractor" hit.
          slice.reachDetractors++;
        }
        slice.ownerBreakdown[owner] = (slice.ownerBreakdown[owner] || 0) + 1;
      };

      // Process Tuples
      tuples.forEach(tuple => {
        const { owner, reason, subReason, rootCause, isITN, isSubscription } = tuple;

        // Individual Stats
        stats.byOwner[owner] = (stats.byOwner[owner] || 0) + 1;
        stats.byReason[reason] = (stats.byReason[reason] || 0) + 1;
        stats.bySubReason[subReason] = (stats.bySubReason[subReason] || 0) + 1;
        stats.byRootCause[rootCause] = (stats.byRootCause[rootCause] || 0) + 1;

        // Update team-specific stats based on tuples
        teamStats.byOwner[owner] = (teamStats.byOwner[owner] || 0) + 1;
        teamStats.byReason[reason] = (teamStats.byReason[reason] || 0) + 1;
        teamStats.bySubReason[subReason] = (teamStats.bySubReason[subReason] || 0) + 1;
        teamStats.byRootCause[rootCause] = (teamStats.byRootCause[rootCause] || 0) + 1;

        // Matrix Tracking (Owner vs Reason/Root Cause)
        if (!stats.contributionMatrix[reason]) stats.contributionMatrix[reason] = { total: 0 };
        stats.contributionMatrix[reason][owner] = (stats.contributionMatrix[reason][owner] || 0) + 1;
        stats.contributionMatrix[reason].total++;

        if (!stats.rootCauseMatrix[rootCause]) stats.rootCauseMatrix[rootCause] = { total: 0 };
        stats.rootCauseMatrix[rootCause][owner] = (stats.rootCauseMatrix[rootCause][owner] || 0) + 1;
        stats.rootCauseMatrix[rootCause].total++;

        // Global Detail Tracking Across All Dimensions
        updateDetail(stats.detailedOwners, owner, owner, isITN, isSubscription);
        updateDetail(stats.detailedReasons, reason, owner, isITN, isSubscription);
        updateDetail(stats.detailedSubReasons, subReason, owner, isITN, isSubscription);
        updateDetail(stats.detailedRootCauses, rootCause, owner, isITN, isSubscription);
        updateDetail(stats.detailedFieldTeams, fieldTeam, owner, isITN, isSubscription);
      });

      // Special global increment for reach detractors (once per task)
      if (isReachTask && isDetractor) {
        stats.totalReachDetractors++;
      }

      // Distribute points once per unique owner in the task
      [...new Set(rawOwners)].forEach(o => {
        if (!stats.detailedOwners[o]) {
          stats.detailedOwners[o] = { total: 0, itn: 0, subscription: 0, points: 0, ownerBreakdown: {} };
        }
        stats.detailedOwners[o].points += taskPoints;
      });

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

    const teamNameById = new Map((fieldTeams || []).map(team => [team._id?.toString(), team.teamName]));
    const trainedTeamNames = new Set();

    // Use field team session history first, to match the trained count used by the Insights and Performance views.
    (fieldTeams || []).forEach(team => {
      if (Array.isArray(team.sessionHistory) && team.sessionHistory.some(session => session?.sessionDate)) {
        trainedTeamNames.add(normalizeText(team.teamName));
      }
    });

    // Also include any additional training sessions discovered in the global training session source.
    (Array.isArray(allTrainingSessionsGlobal) ? allTrainingSessionsGlobal : []).forEach(session => {
      (session.participants || []).forEach(participant => {
        let teamName = null;
        if (participant && typeof participant === 'object') {
          teamName = participant.teamName || participant.name || teamNameById.get(participant._id?.toString() || participant.teamId?.toString());
        } else if (participant) {
          teamName = teamNameById.get(participant.toString());
        }
        if (teamName) trainedTeamNames.add(normalizeText(teamName));
      });
    });

    const teamCountItems = (fieldTeams || []).map(team => {
      const teamName = team.teamName || 'Unknown Team';
      const count = stats.byFieldTeam[teamName] || 0;
      const status = getTeamStatusLabel(team);
      return {
        teamId: team._id?.toString() || teamName,
        teamName,
        count,
        trained: trainedTeamNames.has(normalizeText(teamName)),
        status,
        active: status === 'Active'
      };
    });

    const fieldTeamCohorts = buildCohortSummary(teamCountItems);
    const fieldTeamCohortDetails = teamCountItems.reduce((acc, item) => {
      const label = getViolationCohortLabel(item.count);
      if (!acc[label]) acc[label] = [];
      acc[label].push(item);
      return acc;
    }, {});
    Object.values(fieldTeamCohortDetails).forEach(list => list.sort((a, b) => b.count - a.count));

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
    // We want dynamic owners for the selected period, but always including 'Not specified'
    const matrixOwners = Object.keys(stats.byOwner)
      .filter(o => o !== 'Not specified' && stats.byOwner[o] > 0)
      .sort((a, b) => stats.byOwner[b] - stats.byOwner[a]);

    // Always include 'Not specified' as the last column
    matrixOwners.push('Not specified');

    // FIX: Data Doubling Bug (1710 vs 855)
    // Deduplicate samplesTokenData based on year and weekNumber
    const uniqueTokensMap = new Map();
    samplesTokenData.forEach(s => {
      const key = `${s.year}-${s.weekNumber}`;
      if (!uniqueTokensMap.has(key)) {
        uniqueTokensMap.set(key, s);
      }
    });
    const cleanTokens = Array.from(uniqueTokensMap.values());

    const totalSamplesTarget = (() => {
      if (timeFilterMode === 'weeks' && selectedWeeks.length > 0) {
        return cleanTokens
          .filter(s => s.weekNumber < 100 && selectedWeeks.some(w => w.includes(`Wk-${s.weekNumber}`)))
          .reduce((sum, s) => sum + (s.sampleSize || 0), 0);
      } else if (timeFilterMode === 'months' && selectedMonths.length > 0) {
        return cleanTokens
          .filter(s => s.weekNumber >= 101 && s.weekNumber <= 112 && selectedMonths.some(m => m.includes(`Month-${s.weekNumber - 100}`)))
          .reduce((sum, s) => sum + (s.sampleSize || 0), 0);
      } else if (timeFilterMode === 'all') {
        return cleanTokens
          .filter(s => s.weekNumber >= 101 && s.weekNumber <= 112)
          .reduce((sum, s) => sum + (s.sampleSize || 0), 0);
      }
      return 0;
    })();

    return {
      ownerData: toChartData(stats.byOwner).sort((a, b) => {
        if (a.name === 'Not specified') return 1;
        if (b.name === 'Not specified') return -1;
        return b.value - a.value;
      }),
      governorateData: toChartData(stats.byGovernorate).sort((a, b) => b.value - a.value),
      reasonData: toChartData(stats.byReason),
      subReasonData: toChartData(stats.bySubReason),
      rootCauseData: toChartData(stats.byRootCause),
      sentimentData: (() => {
        const auditedCount = stats.sentiment.Promoter + stats.sentiment.Neutral + stats.sentiment.Detractor;
        const entries = [
          { name: 'Promoters', value: stats.sentiment.Promoter, color: '#10b981' },
          { name: 'Neutrals', value: stats.sentiment.Neutral, color: '#f59e0b' },
          { name: 'Detractors', value: stats.sentiment.Detractor, color: '#ef4444' }
        ].filter(s => s.value > 0);

        let items = entries.map(item => ({
          ...item,
          floatPct: auditedCount > 0 ? (item.value / auditedCount) * 100 : 0
        }));

        const floorSum = items.reduce((sum, item) => sum + Math.floor(item.floatPct), 0);
        const diff = 100 - floorSum;
        if (auditedCount > 0 && diff > 0 && diff < items.length) {
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
      detailedOwners: toDetailedTableData(stats.detailedOwners).sort((a, b) => {
        if (a.name === 'Not specified') return 1;
        if (b.name === 'Not specified') return -1;
        return b.total - a.total;
      }),
      detailedReasons: toDetailedTableData(stats.detailedReasons),
      detailedSubReasons: toDetailedTableData(stats.detailedSubReasons),
      detailedRootCauses: toDetailedTableData(stats.detailedRootCauses),
      detailedGovernorates: toDetailedTableData(stats.detailedGovernorates),
      detailedFieldTeams: toDetailedTableData(stats.detailedFieldTeams),
      fieldTeamAnalytics,
      fieldTeamCohorts,
      fieldTeamCohortDetails,
      totalProcessed: tasksToProcess.length,
      totalPeriodTasks: timeFiltered.length,
      totalAuditedTransactions: timeFiltered.length,
      totalSamplesTaken: stats.sentiment.Promoter + stats.sentiment.Neutral + stats.sentiment.Detractor,
      totalSamplesTarget,
      totalAuditedLowSatisfaction: stats.sentiment.Neutral + stats.sentiment.Detractor,

      categoryTotals: {
        owners: Object.values(stats.byOwner).reduce((a, b) => a + b, 0),
        reasons: Object.values(stats.byReason).reduce((a, b) => a + b, 0),
        subReasons: Object.values(stats.bySubReason).reduce((a, b) => a + b, 0),
        rootCauses: Object.values(stats.byRootCause).reduce((a, b) => a + b, 0)
      },
      totalReachDetractors: stats.totalReachDetractors,
      totalReachCounts: stats.totalReachCounts,
      totalDetractors: stats.totalDetractors,
      totalNeutrals: stats.totalNeutrals,
      tasks: tasksToProcess,
      teamCohorts: []
    };
  }, [allTechnicalTasksGlobal, analyticsSubTab, timeFilterMode, recentDaysValue, selectedWeeks, selectedMonths, customDateRange, settings, fieldTeams, samplesTokenData]);

  // --- NEW: Focused Global Analytics Logic ---
  const focusedGlobalAnalytics = useMemo(() => {
    if (!activeGlobalOwnershipInsight || !globalAnalytics?.tasks) return null;

    const focusedTasks = globalAnalytics.tasks.filter(t => 
      extractOwners(t).includes(activeGlobalOwnershipInsight)
    );

    const stats = {
      byReason: {},
      bySubReason: {},
      byRootCause: {},
      byGovernorate: {},
      detailedReasons: {},
      detailedSubReasons: {},
      detailedRootCauses: {},
      detailedGovernorates: {}
    };

    const normalizeVal = (val) => {
      if (typeof val === 'string') return val.trim().replace(/^_+|_+$/g, '');
      return val;
    };

    const splitVals = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
      return [val];
    };

    focusedTasks.forEach(task => {
      const rawOwners = extractOwners(task);
      if (!rawOwners.includes(activeGlobalOwnershipInsight)) return;

      const rawReasons = splitVals(task.reason).map(normalizeVal);
      const rawSubReasons = splitVals(task.subReason).map(normalizeVal);
      const rawRootCauses = splitVals(task.rootCause).map(normalizeVal);
      const rawItnRelated = splitVals(task.itnRelated);
      const rawSubscriptionRelated = splitVals(task.relatedToSubscription);
      
      const hasItn = rawItnRelated.some(v => v === 'Yes' || v === true);
      const hasSub = rawSubscriptionRelated.some(v => v === 'Yes' || v === true);
      
      const maxLen = Math.max(
        rawReasons.length,
        rawSubReasons.length,
        rawRootCauses.length,
        1
      );

      for (let i = 0; i < maxLen; i++) {
        const reason = rawReasons[i] !== undefined ? rawReasons[i] : (rawReasons[0] || 'Not specified');
        const subReason = rawSubReasons[i] !== undefined ? rawSubReasons[i] : (rawSubReasons[0] || 'Not specified');
        const rootCause = rawRootCauses[i] !== undefined ? rawRootCauses[i] : (rawRootCauses[0] || 'Not specified');
        
        // Count for Reason
        stats.byReason[reason] = (stats.byReason[reason] || 0) + 1;
        if (!stats.detailedReasons[reason]) stats.detailedReasons[reason] = { count: 0, itn: 0, subscription: 0, ownerBreakdown: {} };
        stats.detailedReasons[reason].count += 1;
        if (hasItn) stats.detailedReasons[reason].itn += 1;
        if (hasSub) stats.detailedReasons[reason].subscription += 1;
        stats.detailedReasons[reason].ownerBreakdown[activeGlobalOwnershipInsight] = (stats.detailedReasons[reason].ownerBreakdown[activeGlobalOwnershipInsight] || 0) + 1;

        // SubReason
        stats.bySubReason[subReason] = (stats.bySubReason[subReason] || 0) + 1;
        if (!stats.detailedSubReasons[subReason]) stats.detailedSubReasons[subReason] = { count: 0, itn: 0, subscription: 0, ownerBreakdown: {} };
        stats.detailedSubReasons[subReason].count += 1;
        if (hasItn) stats.detailedSubReasons[subReason].itn += 1;
        if (hasSub) stats.detailedSubReasons[subReason].subscription += 1;
        stats.detailedSubReasons[subReason].ownerBreakdown[activeGlobalOwnershipInsight] = (stats.detailedSubReasons[subReason].ownerBreakdown[activeGlobalOwnershipInsight] || 0) + 1;

        // Root Cause
        stats.byRootCause[rootCause] = (stats.byRootCause[rootCause] || 0) + 1;
        if (!stats.detailedRootCauses[rootCause]) stats.detailedRootCauses[rootCause] = { count: 0, itn: 0, subscription: 0, ownerBreakdown: {} };
        stats.detailedRootCauses[rootCause].count += 1;
        if (hasItn) stats.detailedRootCauses[rootCause].itn += 1;
        if (hasSub) stats.detailedRootCauses[rootCause].subscription += 1;
        stats.detailedRootCauses[rootCause].ownerBreakdown[activeGlobalOwnershipInsight] = (stats.detailedRootCauses[rootCause].ownerBreakdown[activeGlobalOwnershipInsight] || 0) + 1;
      }

      // Governorate (1 per task)
      const gov = normalizeVal(task.governorate) || 'Not specified';
      stats.byGovernorate[gov] = (stats.byGovernorate[gov] || 0) + 1;
      if (!stats.detailedGovernorates[gov]) stats.detailedGovernorates[gov] = { count: 0, itn: 0, subscription: 0 };
      stats.detailedGovernorates[gov].count += 1;
      if (hasItn) stats.detailedGovernorates[gov].itn += 1;
      if (hasSub) stats.detailedGovernorates[gov].subscription += 1;
    });

    const toDetailedTableData = (detailedObj, totalTasks) => {
      return Object.entries(detailedObj).map(([name, data]) => ({
        name,
        total: data.count,
        percentage: ((data.count / totalTasks) * 100).toFixed(1),
        itn: data.itn,
        subscription: data.subscription,
        ownerBreakdown: data.ownerBreakdown || {}
      })).sort((a, b) => b.total - a.total);
    };

    const toChartData = (obj) => {
      const total = Object.values(obj).reduce((a, b) => a + b, 0);
      return Object.entries(obj).map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
      })).sort((a, b) => b.value - a.value);
    };

    return {
      reasonData: toChartData(stats.byReason),
      subReasonData: toChartData(stats.bySubReason),
      rootCauseData: toChartData(stats.byRootCause),
      governorateData: toChartData(stats.byGovernorate),
      detailedReasons: toDetailedTableData(stats.detailedReasons, focusedTasks.length),
      detailedSubReasons: toDetailedTableData(stats.detailedSubReasons, focusedTasks.length),
      detailedRootCauses: toDetailedTableData(stats.detailedRootCauses, focusedTasks.length),
      detailedGovernorates: toDetailedTableData(stats.detailedGovernorates, focusedTasks.length),
    };
  }, [activeGlobalOwnershipInsight, globalAnalytics?.tasks]);

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
        const keyConfig = settings.scoringKeys.find(k =>
          k.label === keyLabel &&
          (k.targetForm === (type === 'task' ? 'Task' : 'Issue') || k.targetForm === 'Both')
        );
        if (keyConfig) points += Number(keyConfig.points);
      });
    }

    return points;
  };

  const mapItemToExcelRow = (item, type, teamSummary = null) => {
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

    const baseRow = {
      'Type': type === 'task' ? 'NPS Ticket' : 'Customer Issue',
      'SLID': item.slid,
      'Customer': item.customerName || 'N/A',
      'Status': item.validationStatus || (item.solved === 'yes' ? 'Solved' : 'Open'),

      'Governorate': item.governorate || '-',
      'District': item.district || '-',

      'Score': displayScore,
      'Satisfaction': satisfaction,
      'Points': calculateItemPoints(item, type),

      'Customer Feedback': (type === 'task' ? (item.customerFeedback || '-') : (item.reporterNote || '-')),

      // Dynamic Interleaved Columns
      ...(() => {
        const reasons = Array.isArray(item.reason) ? item.reason : (item.reason ? [item.reason] : []);
        const subReasons = Array.isArray(item.subReason) ? item.subReason : (item.subReason ? [item.subReason] : []);
        const rootCauses = Array.isArray(item.rootCause) ? item.rootCause : (item.rootCause ? [item.rootCause] : []);
        const owners = extractOwners(item);

        const maxLen = Math.max(reasons.length, subReasons.length, rootCauses.length, owners.length, 1);
        const dynamicCols = {};

        for (let i = 0; i < maxLen; i++) {
          dynamicCols[`Reason ${i + 1}`] = reasons[i] || 'Not specified';
          dynamicCols[`Sub-Reason ${i + 1}`] = subReasons[i] || 'Not specified';
          dynamicCols[`Root Cause ${i + 1}`] = rootCauses[i] || 'Not specified';
          dynamicCols[`Owner ${i + 1}`] = owners[i] || 'Not specified';
        }
        return dynamicCols;
      })(),


      'GAIA Check': item.gaiaCheck || 'N/A',
      'GAIA Content': item.gaiaContent || '-',
      'Latest QOps Note': item.latestGaia?.note || 'N/A',
      'QOps Transaction History': item.tickets?.map((t, idx) =>
        `[${idx + 1}] ${new Date(t.eventDate || t.createdAt).toLocaleDateString()} | ${t.transactionType || t.mainCategory} (${t.transactionState}) -> Note: ${t.note || 'No note'}`
      ).join('\n') || 'No logs',
      'ITN Related': ((Array.isArray(item.itnRelated) && item.itnRelated.includes('Yes')) || item.itnRelated === 'Yes' || item.itnRelated === true) ? 'Yes' : 'No',
      'Subscription Related': ((Array.isArray(item.relatedToSubscription) && item.relatedToSubscription.includes('Yes')) || item.relatedToSubscription === 'Yes' || item.relatedToSubscription === true) ? 'Yes' : 'No',

      'Team Name': item.teamName,
      // 'Team Company': item.teamCompany || '-',

      'Interview Date': new Date(item.interviewDate || item.date || item.createdAt).toLocaleDateString(),
      'Wk number': (() => {
        const d = item.interviewDate || item.date || item.createdAt;
        if (!d) return '-';
        const { key } = getWeekNumber(d, settings?.weekStartDay, settings?.week1StartDate, settings?.week1EndDate, settings?.startWeekNumber);
        return key;
      })(),
      'Request Date': item.contractDate ? new Date(item.contractDate).toLocaleDateString() : '-',
      'UN Date': item.unDate ? new Date(item.unDate).toLocaleDateString() : '-',
      'FE Date': item.feDate ? new Date(item.feDate).toLocaleDateString() : (item.appDate ? new Date(item.appDate).toLocaleDateString() : '-'),
      'In Date': item.inDate ? new Date(item.inDate).toLocaleDateString() : '-',
      'Close Date': item.closeDate ? new Date(item.closeDate).toLocaleDateString() : '-'
    };

    if (teamSummary) {
      baseRow['Team Total Tasks'] = teamSummary.totalTasks;
      baseRow['Team Detractors'] = teamSummary.teamDetractors;
      baseRow['Team Neutrals'] = teamSummary.teamNeutrals;
      baseRow['Accountability (Yes)'] = teamSummary.reachCount;
      baseRow['Acc. Detractors'] = teamSummary.reachDetractors;
      baseRow['Acc. Neutrals'] = teamSummary.reachNeutrals;
      baseRow['Acc. %'] = `${teamSummary.reachOwnershipPct}%`;
      baseRow['Acc. Detractors %'] = `${teamSummary.reachDetractorsPct}%`;
      baseRow['Acc. Neutrals %'] = `${teamSummary.reachNeutralsPct}%`;

      // New Snapshot Columns at the end
      baseRow['Latest Week'] = teamSummary.snapshots.weekly.key;
      baseRow['Weekly: Total'] = teamSummary.snapshots.weekly.total;
      baseRow['Weekly: Detractors'] = teamSummary.snapshots.weekly.detractors;
      baseRow['Weekly: Neutrals'] = teamSummary.snapshots.weekly.neutrals;
      baseRow['Weekly: Reach Det.'] = teamSummary.snapshots.weekly.ownerReachDetractors || 0;
      baseRow['Weekly: Reach Neu.'] = teamSummary.snapshots.weekly.ownerReachNeutrals || 0;
      baseRow['Weekly: Accountability (Yes)'] = teamSummary.snapshots.weekly.reach;
      baseRow['Weekly: Acc. Det.'] = teamSummary.snapshots.weekly.reachDetractors || 0;
      baseRow['Weekly: Acc. Neu.'] = teamSummary.snapshots.weekly.reachNeutrals || 0;

      baseRow['Latest Month'] = teamSummary.snapshots.monthly.key;
      baseRow['Monthly: Total'] = teamSummary.snapshots.monthly.total;
      baseRow['Monthly: Detractors'] = teamSummary.snapshots.monthly.detractors;
      baseRow['Monthly: Neutrals'] = teamSummary.snapshots.monthly.neutrals;
      baseRow['Monthly: Reach Det.'] = teamSummary.snapshots.monthly.ownerReachDetractors || 0;
      baseRow['Monthly: Reach Neu.'] = teamSummary.snapshots.monthly.ownerReachNeutrals || 0;
      baseRow['Monthly: Accountability (Yes)'] = teamSummary.snapshots.monthly.reach;
      baseRow['Monthly: Acc. Det.'] = teamSummary.snapshots.monthly.reachDetractors || 0;
      baseRow['Monthly: Acc. Neu.'] = teamSummary.snapshots.monthly.reachNeutrals || 0;
      
      // Post-Session Snapshots
      baseRow['Latest Session'] = teamSummary.latestSessionDate ? teamSummary.latestSessionDate.toLocaleDateString() : 'Untrained';
      baseRow['Post: Total'] = teamSummary.snapshots.postSession.total;
      baseRow['Post: Detractors'] = teamSummary.snapshots.postSession.detractors;
      baseRow['Post: Neutrals'] = teamSummary.snapshots.postSession.neutrals;
      baseRow['Post: Accountability (Yes)'] = teamSummary.snapshots.postSession.reach;
      baseRow['Post: Acc. Det.'] = teamSummary.snapshots.postSession.reachDetractors || 0;
      baseRow['Post: Acc. Neu.'] = teamSummary.snapshots.postSession.reachNeutrals || 0;
      baseRow['Post: Acc. %'] = teamSummary.snapshots.postSession.total > 0 ? Math.round((teamSummary.snapshots.postSession.reach / teamSummary.snapshots.postSession.total) * 100) + '%' : '0%';
    }

    return baseRow;
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
      // 'Company': team.teamCompany,
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
    let latestSessionDate = null;
    if (team?.sessionHistory?.length > 0) {
      const dates = team.sessionHistory.map(s => s.sessionDate).filter(d => d).map(d => new Date(d));
      if (dates.length > 0) latestSessionDate = new Date(Math.max(...dates));
    }
    const teamSummary = calculateTeamExportSummary([...team.rawDetractors, ...team.rawNeutrals], settings, latestSessionDate);
    const detailedData = [
      ...team.rawDetractors.map(t => mapItemToExcelRow(t, 'task', teamSummary)),
      ...team.rawNeutrals.map(t => mapItemToExcelRow(t, 'task', teamSummary)),
      ...team.rawIssues.map(i => mapItemToExcelRow(i, 'issue', teamSummary))
    ];

    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    applySnapshotStyles(wsSummary, summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Team Performance Summary");

    // Detailed Sheet
    const wsDetails = XLSX.utils.json_to_sheet(detailedData);
    applySnapshotStyles(wsDetails, detailedData);
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
    const rawTeamTasks = (Array.isArray(allTechnicalTasksGlobal) ? allTechnicalTasksGlobal : [])
      .filter(t => t.teamName === team.teamName);

    let latestSessionDate = null;
    if (team?.sessionHistory?.length > 0) {
      const dates = team.sessionHistory.map(s => s.sessionDate).filter(d => d).map(d => new Date(d));
      if (dates.length > 0) latestSessionDate = new Date(Math.max(...dates));
    }
    const summary = calculateTeamExportSummary(rawTeamTasks, settings, latestSessionDate);

    const teamTasks = rawTeamTasks.map(t => mapItemToExcelRow(t, 'task', summary));

    const teamIssues = (Array.isArray(filteredIssuesByDate) ? filteredIssuesByDate : [])
      .filter(i => i.teamName === team.teamName)
      .map(i => mapItemToExcelRow(i, 'issue', summary));

    const data = [...teamTasks, ...teamIssues];
    const ws = XLSX.utils.json_to_sheet(data);
    applySnapshotStyles(ws, data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Violations Details");
    XLSX.writeFile(wb, `${team.teamName}_Violations_DeepDive_Report.xlsx`);
  };

  const handleExportAllTeamsViolations = () => {
    const tasksByTeam = (Array.isArray(allTechnicalTasksGlobal) ? allTechnicalTasksGlobal : [])
      .reduce((acc, t) => {
        const teamName = t.teamName || 'Unknown';
        if (!acc[teamName]) acc[teamName] = [];
        acc[teamName].push(t);
        return acc;
      }, {});

    const teamSummaries = {};
    Object.keys(tasksByTeam).forEach(teamName => {
      const teamObj = (Array.isArray(fieldTeams) ? fieldTeams : []).find(t => t.teamName === teamName);
      let latestSessionDate = null;
      if (teamObj?.sessionHistory?.length > 0) {
        const sessionDates = teamObj.sessionHistory
          .map(s => s.sessionDate)
          .filter(d => d)
          .map(d => new Date(d));
        if (sessionDates.length > 0) {
          latestSessionDate = new Date(Math.max(...sessionDates));
        }
      }
      teamSummaries[teamName] = calculateTeamExportSummary(tasksByTeam[teamName], settings, latestSessionDate);
    });

    // 1. Team Accountability Summary Sheet
    const summaryRows = Object.keys(teamSummaries).map(teamName => {
      const s = teamSummaries[teamName];
      return {
        'Team Name': teamName,
        'Total Tasks': s.totalTasks,
        'Team Detractors': s.teamDetractors,
        'Team Neutrals': s.teamNeutrals,
        'Accountability (Yes)': s.reachCount,
        'Acc. Detractors': s.reachDetractors,
        'Acc. Neutrals': s.reachNeutrals,
        'Acc. %': `${s.reachOwnershipPct}%`,
        'Acc. Detractors %': `${s.reachDetractorsPct}%`,
        'Acc. Neutrals %': `${s.reachNeutralsPct}%`,
        // Snapshot data
        'Latest Week': s.snapshots.weekly.key,
        'Weekly: Total': s.snapshots.weekly.total,
        'Weekly: Detractors': s.snapshots.weekly.detractors,
        'Weekly: Neutrals': s.snapshots.weekly.neutrals,
        'Weekly: Reach Det.': s.snapshots.weekly.ownerReachDetractors || 0,
        'Weekly: Reach Neu.': s.snapshots.weekly.ownerReachNeutrals || 0,
        'Weekly: Accountability (Yes)': s.snapshots.weekly.reach,
        'Weekly: Acc. Det.': s.snapshots.weekly.reachDetractors || 0,
        'Weekly: Acc. Neu.': s.snapshots.weekly.reachNeutrals || 0,
        'Latest Month': s.snapshots.monthly.key,
        'Monthly: Total': s.snapshots.monthly.total,
        'Monthly: Detractors': s.snapshots.monthly.detractors,
        'Monthly: Neutrals': s.snapshots.monthly.neutrals,
        'Monthly: Reach Det.': s.snapshots.monthly.ownerReachDetractors || 0,
        'Monthly: Reach Neu.': s.snapshots.monthly.ownerReachNeutrals || 0,
        'Monthly: Accountability (Yes)': s.snapshots.monthly.reach,
        'Monthly: Acc. Det.': s.snapshots.monthly.reachDetractors || 0,
        'Monthly: Acc. Neu.': s.snapshots.monthly.reachNeutrals || 0,
        
        // Post-Session Snapshots
        'Latest Session': s.latestSessionDate ? s.latestSessionDate.toLocaleDateString() : 'Untrained',
        'Post: Total': s.snapshots.postSession.total,
        'Post: Detractors': s.snapshots.postSession.detractors,
        'Post: Neutrals': s.snapshots.postSession.neutrals,
        'Post: Accountability (Yes)': s.snapshots.postSession.reach,
        'Post: Acc. Det.': s.snapshots.postSession.reachDetractors || 0,
        'Post: Acc. Neu.': s.snapshots.postSession.reachNeutrals || 0,
        'Post: Acc. %': s.snapshots.postSession.total > 0 ? Math.round((s.snapshots.postSession.reach / s.snapshots.postSession.total) * 100) + '%' : '0%',
        'Post: Improve % (Volume)': `${s.comparison.improvementRate}%`
      };
    }).sort((a, b) => b['Total Tasks'] - a['Total Tasks']);

    // 2. Detailed Sheet
    const allTasks = (Array.isArray(allTechnicalTasksGlobal) ? allTechnicalTasksGlobal : [])
      .map(t => mapItemToExcelRow(t, 'task', teamSummaries[t.teamName || 'Unknown']));

    const allIssues = (Array.isArray(filteredIssuesByDate) ? filteredIssuesByDate : [])
      .map(i => mapItemToExcelRow(i, 'issue', teamSummaries[i.teamName || 'Unknown']));

    const detailedData = [...allTasks, ...allIssues];

    const wb = XLSX.utils.book_new();

    // Add Summary Sheet first as it's the high-level view
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = Object.keys(summaryRows[0] || {}).map(k => ({ wch: Math.max(k.length + 4, 18) }));
    applySnapshotStyles(wsSummary, summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Team Accountability Summary");

    // Add Detailed Sheet
    const wsDetailed = XLSX.utils.json_to_sheet(detailedData);
    applySnapshotStyles(wsDetailed, detailedData);
    XLSX.utils.book_append_sheet(wb, wsDetailed, "Global Violations Report");

    XLSX.writeFile(wb, `Global_Violations_DeepDive_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Analytics Distributions Export
  const handleExportAnalyticsDistributions = () => {
    if (!globalAnalytics) return;

    const wb = XLSX.utils.book_new();

    // Helper: build a data array for simple chart data (ownerData, reasonData, etc.)
    const buildSheetRows = (detailedArr, labelName = 'Label', includeReach = true) => {
      return (detailedArr || []).map(row => {
        const base = {
          [labelName]: row.name,
          'Count': row.total || 0,
          'Detractors': row.detractors || 0,
          'Neutral': row.neutrals || 0,
          'Total Count Contribution (%)': (globalAnalytics.totalProcessed || 0) > 0 ? ((row.total / globalAnalytics.totalProcessed) * 100).toFixed(1) : '0.0',
          'Detractor Contribution (%)': (globalAnalytics.totalDetractors || 0) > 0 ? ((row.detractors / globalAnalytics.totalDetractors) * 100).toFixed(1) : '0.0',
          'Neutral Contribution (%)': (globalAnalytics.totalNeutrals || 0) > 0 ? ((row.neutrals / globalAnalytics.totalNeutrals) * 100).toFixed(1) : '0.0',
        };

        if (includeReach) {
          base['Acc. Share of Detractors (%)'] = (globalAnalytics.totalReachDetractors || 0) > 0 ? ((row.reachDetractors || 0) / globalAnalytics.totalReachDetractors * 100).toFixed(1) : '0.0';
          base['Acc. Share of Total Counts (%)'] = (globalAnalytics.totalReachCounts || 0) > 0 ? ((row.reachCounts || 0) / globalAnalytics.totalReachCounts * 100).toFixed(1) : '0.0';
          base['Acc. Counts'] = row.reachCounts || 0;
        }

        base['ITN Related'] = row.itn || 0;
        base['Subscription Related'] = row.subscription || 0;
        return base;
      });
    };

    // Sheet 1: Owner Distribution
    const ownerRows = buildSheetRows(globalAnalytics.detailedOwners, 'Owner Name', false);
    const wsOwner = XLSX.utils.json_to_sheet(ownerRows);
    wsOwner['!cols'] = Object.keys(ownerRows[0] || {}).map(k => ({ wch: Math.max(k.length + 4, 18) }));
    XLSX.utils.book_append_sheet(wb, wsOwner, 'Owner Distribution');

    // Sheet 2: Reason Distribution
    const reasonRows = buildSheetRows(globalAnalytics.detailedReasons, 'Reason');
    const wsReason = XLSX.utils.json_to_sheet(reasonRows);
    wsReason['!cols'] = Object.keys(reasonRows[0] || {}).map(k => ({ wch: Math.max(k.length + 4, 20) }));
    XLSX.utils.book_append_sheet(wb, wsReason, 'Reason Distribution');

    // Sheet 3: Sub-Reason Breakdown
    const subReasonRows = buildSheetRows(globalAnalytics.detailedSubReasons, 'Sub-Reason');
    const wsSubReason = XLSX.utils.json_to_sheet(subReasonRows);
    wsSubReason['!cols'] = Object.keys(subReasonRows[0] || {}).map(k => ({ wch: Math.max(k.length + 4, 20) }));
    XLSX.utils.book_append_sheet(wb, wsSubReason, 'Sub-Reason Breakdown');

    // Sheet 4: Root Cause Matrix
    const rootCauseRows = buildSheetRows(globalAnalytics.detailedRootCauses, 'Root Cause');
    const wsRootCause = XLSX.utils.json_to_sheet(rootCauseRows);
    wsRootCause['!cols'] = Object.keys(rootCauseRows[0] || {}).map(k => ({ wch: Math.max(k.length + 4, 20) }));
    XLSX.utils.book_append_sheet(wb, wsRootCause, 'Root Cause Matrix');

    // Sheet 5: Field Team Distribution (Offenders)
    const teamRows = buildSheetRows(globalAnalytics.detailedFieldTeams, 'Field Team Name');
    if (teamRows.length > 0) {
      const wsTeam = XLSX.utils.json_to_sheet(teamRows);
      wsTeam['!cols'] = Object.keys(teamRows[0] || {}).map(k => ({ wch: Math.max(k.length + 4, 25) }));
      XLSX.utils.book_append_sheet(wb, wsTeam, 'Field Team Distribution');
    }

    // Sheet 6: Cross-Owner × Reason Contribution Matrix
    const { matrix: contribMatrix, topOwners } = globalAnalytics.contributionMatrix || {};
    if (contribMatrix && topOwners?.length > 0) {
      const reasons = Object.keys(contribMatrix);
      const contribRows = reasons.map(reason => {
        const row = { 'Reason \\ Owner': reason };
        topOwners.forEach(owner => {
          row[owner] = contribMatrix[reason]?.[owner] || 0;
        });
        row['Total'] = topOwners.reduce((s, o) => s + (contribMatrix[reason]?.[o] || 0), 0);
        return row;
      });
      if (contribRows.length > 0) {
        const wsContrib = XLSX.utils.json_to_sheet(contribRows);
        wsContrib['!cols'] = Object.keys(contribRows[0]).map(k => ({ wch: Math.max(k.length + 4, 14) }));
        XLSX.utils.book_append_sheet(wb, wsContrib, 'Contribution Matrix');
      }
    }

    // Sheet 7: Detailed Offenders Log (Raw Data)
    if (globalAnalytics.tasks?.length > 0) {
      const detailedRows = globalAnalytics.tasks.map(t => mapItemToExcelRow(t, 'task'));
      const wsDetailed = XLSX.utils.json_to_sheet(detailedRows);

      // Auto-size columns for the detailed sheet
      const range = XLSX.utils.decode_range(wsDetailed['!ref']);
      const cols = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxLen = 10;
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cell = wsDetailed[XLSX.utils.encode_cell({ r: R, c: C })];
          if (cell && cell.v) {
            const len = cell.v.toString().length;
            if (len > maxLen) maxLen = len;
          }
        }
        cols.push({ wch: Math.min(maxLen + 2, 60) }); // Cap at 60 for better Excel experience
      }
      wsDetailed['!cols'] = cols;

      XLSX.utils.book_append_sheet(wb, wsDetailed, 'Detailed Offenders Log');
    }

    XLSX.writeFile(wb, `Analytics_Distributions_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Analytics Drill-Down Handler
  const handleAnalyticsDrillDown = (filters = {}) => {
    // Apply time filtering first (Must match useMemo logic exactly)
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

    // Apply sub-tab filtering (All/Detractors/Neutrals) - Must match useMemo logic exactly
    let tasksToProcess = timeFiltered;
    if (analyticsSubTab === 1) { // Detractors (score <= 6)
      tasksToProcess = timeFiltered.filter(t => {
        let score = t.evaluationScore;
        return score && score > 0 && score <= 6;
      });
    } else if (analyticsSubTab === 2) { // Neutrals (score 7-8)
      tasksToProcess = timeFiltered.filter(t => {
        let score = t.evaluationScore;
        return score && score >= 7 && score <= 8;
      });
    }

    console.log(`[DrillDown] Mode: ${timeFilterMode}, SubTab: ${analyticsSubTab}`);
    console.log(`[DrillDown] Input Tasks: ${techTasks.length}, Time Filtered: ${timeFiltered.length}, Final Pool: ${tasksToProcess.length}`);

    // Filter tasks based on the tuple logic (Must match useMemo tuple alignment)
    const finalFiltered = tasksToProcess.filter(task => {
      const rawOwners = extractOwners(task);
      const rawReasons = splitValues(task.reason).map(normalizeValue);
      const rawSubReasons = splitValues(task.subReason).map(normalizeValue);
      const rawRootCauses = splitValues(task.rootCause).map(normalizeValue);
      const rawItnRelated = splitValues(task.itnRelated);
      const rawSubRelated = splitValues(task.relatedToSubscription);

      const maxLen = Math.max(
        rawOwners.length,
        rawReasons.length,
        rawSubReasons.length,
        rawRootCauses.length,
        rawItnRelated.length,
        rawSubRelated.length,
        1
      );

      // Create tuples for this specific task
      const tuples = [];
      for (let i = 0; i < maxLen; i++) {
        const owner = rawOwners[i] || 'Not specified';
        const reason = rawReasons[i] || 'Not specified';
        const subReason = rawSubReasons[i] || 'Not specified';
        const rootCause = rawRootCauses[i] || 'Not specified';
        const itnVal = rawItnRelated[i] || 'No';
        const subVal = rawSubRelated[i] || 'No';

        // Filter out garbage tuples
        const isGarbage = (owner === 'Not specified' || !owner) &&
          (reason === 'Not specified' || !reason) &&
          (subReason === 'Not specified' || !subReason) &&
          (rootCause === 'Not specified' || !rootCause);

        if (!isGarbage || i === 0) {
          tuples.push({
            owner,
            reason,
            subReason,
            rootCause,
            isITN: itnVal === 'Yes' || itnVal === true,
            isSubscription: subVal === 'Yes' || subVal === true
          });
        }
      }

      // Check if any tuple matches the filters
      const tupleMatches = tuples.some(tuple => {
        let match = true;
        if (filters.owner && tuple.owner !== filters.owner) match = false;
        if (filters.reason && tuple.reason !== filters.reason) match = false;
        if (filters.subReason && tuple.subReason !== filters.subReason) match = false;
        if (filters.rootCause && tuple.rootCause !== filters.rootCause) match = false;

        if (filters.governorate) {
          const governorate = task.governorate ? String(task.governorate).trim() : 'Not specified';
          if (governorate !== filters.governorate) match = false;
        }

        // Apply ITN/Subscription filters at the tuple level
        if (filters.itn && !tuple.isITN) match = false;
        if (filters.subscription && !tuple.isSubscription) match = false;

        return match;
      });

      return tupleMatches;
    });

    console.log(`[DrillDown] Final Filtered Tasks: ${finalFiltered.length}`);

    // Generate Title
    const titleParts = [];
    if (filters.owner) titleParts.push(`Owner: ${filters.owner}`);
    if (filters.reason) titleParts.push(`Reason: ${filters.reason}`);
    if (filters.subReason) titleParts.push(`Sub-Reason: ${filters.subReason}`);
    if (filters.rootCause) titleParts.push(`Root Cause: ${filters.rootCause}`);
    if (filters.governorate) titleParts.push(`Governorate: ${filters.governorate}`);
    if (filters.itn) titleParts.push(`ITN Related`);
    if (filters.subscription) titleParts.push(`Subscription Related`);

    setAnalyticsDrillDown({
      open: true,
      title: titleParts.join(' | ') || 'Filtered Tasks',
      tasks: finalFiltered
    });
  };

  const filteredIssuesByDate = useMemo(() => {
    return allCustomerIssuesGlobal.filter(issue => {
      // 1. apply basic date filtering
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
  }, [allCustomerIssuesGlobal, dateFilter]);

  const stats = useMemo(() => {
    // Corrected: Use team-aware filteredCustomerIssues when a team is selected, 
    // otherwise fallback to global date-filtered issues.
    const issuesToProcess = selectedTeam ? filteredCustomerIssues : filteredIssuesByDate;
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
        // Evaluation score scale: 0-10
        // Detractors: <= 6, Neutrals: 7-8, Promoters: 9-10
        if (score <= 6) {
          technicalDetractors++;
          totalDetractors++;
        }
        else if (score >= 7 && score <= 8) {
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
        tension: 0,
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

  const MiniStatCard = ({ title, value, icon, color, subtext }) => (
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
      const [fieldTeamsRes, quizTeamsRes] = await Promise.all([
        api.get("/field-teams/get-field-teams", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        }),
        api.get("/quiz-results/teams/all", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        })
      ]);

      const dbTeams = fieldTeamsRes.data || [];
      const quizTeams = (quizTeamsRes.data?.data || []).map(qt => ({
        _id: qt.teamId,
        teamName: qt.teamName,
        teamCompany: "N/A"
      }));

      // Build teamMap keyed by _id. Track ALL names to prevent name-based duplicates.
      const teamMap = new Map();
      const existingNames = new Set();

      const addToMap = (team) => {
        const key = team._id?.toString();
        if (!key || teamMap.has(key)) return;
        teamMap.set(key, team);
      };

      // Priority 1: Official DB records (richest data)
      dbTeams.forEach(addToMap);

      // Priority 2: Quiz teams
      quizTeams.forEach(t => {
        const key = t._id?.toString();
        if (key && !teamMap.has(key)) {
          teamMap.set(key, t);
        }
      });

      // Priority 3: Discovery from global tasks & sessions (orphan teams only)
      const techTasks = Array.isArray(allTechnicalTasksGlobal) ? allTechnicalTasksGlobal : [];
      const sessions = Array.isArray(allTrainingSessionsGlobal) ? allTrainingSessionsGlobal : [];

      techTasks.forEach(task => {
        const name = task.teamName;
        const normName = normalizeText(name);
        if (name && !existingNames.has(normName)) {
          const key = `disc_${normName}`;
          teamMap.set(key, { _id: key, teamName: name, teamCompany: 'Discovery (Task Log)', isDiscovered: true });
          existingNames.add(normName);
        }
      });

      sessions.forEach(s => {
        (s.participants || []).forEach(p => {
          const name = p.teamName || p.name || (typeof p === 'string' ? p : null);
          const id = p._id || p.teamId;
          const normName = name ? normalizeText(name) : null;
          const key = id?.toString() || (normName ? `disc_${normName}` : null);
          if (key && !teamMap.has(key) && (!normName || !existingNames.has(normName))) {
            teamMap.set(key, { _id: key, teamName: name || 'Unknown Team', teamCompany: 'Discovery (Session)', isDiscovered: true });
            if (normName) existingNames.add(normName);
          }
        });
      });

      setFieldTeams(Array.from(teamMap.values()));
    } catch (error) {
      console.error("Error fetching field teams:", error);
      setError("Failed to fetch field teams");
    } finally {
      setLoading(false);
    }
  };

  // Discovery effect: re-run when global data arrives to catch orphan teams
  useEffect(() => {
    if ((allTechnicalTasksGlobal?.length > 0 || allTrainingSessionsGlobal?.length > 0) && fieldTeams.length > 0) {
      const techTasks = allTechnicalTasksGlobal;
      const sessions = allTrainingSessionsGlobal;

      setFieldTeams(prev => {
        const teamMap = new Map();
        const existingNames = new Set();

        // Keep all existing teams, but filter out internal duplicates by name
        prev.forEach(t => {
          const key = t._id?.toString();
          const normName = normalizeText(t.teamName);
          if (key && !teamMap.has(key)) {
            teamMap.set(key, t);
            if (normName) existingNames.add(normName);
          }
        });

        // Discover orphan teams from tasks
        techTasks.forEach(task => {
          const name = task.teamName;
          const normName = normalizeText(name);
          if (name && !existingNames.has(normName)) {
            const key = `disc_${normName}`;
            teamMap.set(key, { _id: key, teamName: name, teamCompany: 'Discovery (Task Log)', isDiscovered: true });
            existingNames.add(normName);
          }
        });

        // Discover orphan teams from sessions
        sessions.forEach(s => {
          (s.participants || []).forEach(p => {
            const name = p.teamName || p.name || (typeof p === 'string' ? p : null);
            const id = p._id || p.teamId;
            const normName = name ? normalizeText(name) : null;
            const key = id?.toString() || (normName ? `disc_${normName}` : null);
            if (key && !teamMap.has(key) && (!normName || !existingNames.has(normName))) {
              teamMap.set(key, { _id: key, teamName: name || 'Unknown Team', teamCompany: 'Discovery (Session)', isDiscovered: true });
              if (normName) existingNames.add(normName);
            }
          });
        });

        return Array.from(teamMap.values());
      });
    }
  }, [allTechnicalTasksGlobal, allTrainingSessionsGlobal]);

  const fetchGlobalData = async () => {
    try {
      setLoadingGlobal(true);
      const [techRes, issuesRes, sessionsRes] = await Promise.all([
        api.get("/tasks/get-all-tasks", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        }),
        api.get("/customer-issues", {
          params: { limit: 10000 },
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        }),
        api.get("/training-sessions", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        })
      ]);
      const techData = techRes.data?.data || techRes.data || [];
      setAllTechnicalTasksGlobal(Array.isArray(techData) ? techData : []);
      const issuesData = issuesRes.data?.data || issuesRes.data || [];
      setAllCustomerIssuesGlobal(Array.isArray(issuesData) ? issuesData : []);
      const sessionsData = sessionsRes.data?.data || sessionsRes.data || [];
      setAllTrainingSessionsGlobal(Array.isArray(sessionsData) ? sessionsData : []);
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

  const handleDrillDown = (item, type) => {
    if (type === 'task' && item) {
      const taskId = item._id || item.id || item.taskId;
      if (taskId) {
        const fetchFullTask = async () => {
          try {
            const response = await api.get(`/tasks/get-task/${taskId}`);
            setSelectedTask(response.data);
            setViewDialogOpen(true);
          } catch (err) {
            console.error('Error fetching task:', err);
            setSelectedTask(item);
            setViewDialogOpen(true);
          }
        };
        fetchFullTask();
        return;
      }

      setSelectedTask(item);
      setViewDialogOpen(true);
      return;
    }

    // Team drill down
    let items = [];
    let title = '';
    let dataType = 'issue';
    let defaultTab = 'tasks';

    if (type === 'detractors') {
      items = item.rawDetractors;
      title = `${item.teamName} - NPS Detractors`;
      dataType = 'task';
      defaultTab = 'tasks';
    } else if (type === 'neutrals') {
      items = item.rawNeutrals;
      title = `${item.teamName} - NPS Neutrals`;
      dataType = 'task';
      defaultTab = 'tasks';
    } else if (type === 'open') {
      items = item.rawOpen;
      title = `${item.teamName} - Total Open Cases (Dispatched but not closed)`;
      dataType = 'issue';
      defaultTab = 'issues';
    } else if (type === 'issues') {
      items = item.rawIssues;
      title = `${item.teamName} - Total Customer Issues (Snags & Complaints)`;
      dataType = 'issue';
      defaultTab = 'issues';
    } else if (type === 'violations') {
      items = [
        ...item.rawIssues.map(i => ({ ...i, __drillType: 'issue' })),
        ...item.rawDetractors.map(t => ({ ...t, __drillType: 'task' })),
        ...item.rawNeutrals.map(t => ({ ...t, __drillType: 'task' }))
      ];
      title = `${item.teamName} - Total Violations Detail`;
      dataType = 'mixed';
      // If there are issues, default to tasks but let user switch
      defaultTab = item.rawDetractors.length + item.rawNeutrals.length > 0 ? 'tasks' : 'issues';
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

  const handleOpenCohortDialog = (label) => {
    const items = globalAnalytics?.fieldTeamCohortDetails?.[label] || [];
    setCohortDialogItems(items);
    setCohortDialogLabel(label);
    setCohortDialogOpen(true);
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
      'Status': team.isTerminated ? 'Terminated' : team.isResigned ? 'Resigned' : team.isSuspended ? 'Suspended' : team.isOnLeave ? 'On Leave' : 'Active',
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
    <>
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
          <>
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
                  <Tab label="Comparison Chart" icon={<Timeline />} iconPosition="start" />
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
                          <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 900, py: 1.5, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>STATUS</TableCell>
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
                              <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1 }}>
                                {(() => {
                                  let label = 'Active';
                                  let bg = 'rgba(16, 185, 129, 0.15)';
                                  let color = '#10b981';
                                  if (team.isTerminated) { label = 'Terminated'; bg = 'rgba(239, 68, 68, 0.15)'; color = '#ef4444'; }
                                  else if (team.isResigned) { label = 'Resigned'; bg = 'rgba(249, 115, 22, 0.15)'; color = '#f97316'; }
                                  else if (team.isSuspended) { label = 'Suspended'; bg = 'rgba(245, 158, 11, 0.15)'; color = '#f59e0b'; }
                                  else if (team.isOnLeave) { label = 'On Leave'; bg = 'rgba(99, 102, 241, 0.15)'; color = '#6366f1'; }
                                  return (
                                    <Chip
                                      label={label}
                                      size="small"
                                      sx={{
                                        background: bg,
                                        color: color,
                                        fontWeight: 700,
                                        borderRadius: '8px',
                                        height: '20px',
                                        fontSize: '0.68rem',
                                        border: `1px solid ${color}40`,
                                        letterSpacing: '0.3px'
                                      }}
                                    />
                                  );
                                })()}
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

                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<FaFileExcel size={13} />}
                      onClick={handleExportAnalyticsDistributions}
                      sx={{
                        borderColor: 'rgba(34, 197, 94, 0.4)',
                        color: '#22c55e',
                        fontSize: '0.75rem',
                        '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.1)', borderColor: '#22c55e' }
                      }}
                    >
                      Export Analytics
                    </Button>
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
                              <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
                                <TableCell sx={{ color: '#e2e8f0', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Total Audited</TableCell>
                                <TableCell align="right" sx={{ color: '#3b82f6', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{globalAnalytics.totalSamplesTaken}</TableCell>
                                <TableCell align="right" sx={{ color: '#3b82f6', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>100%</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>

                        <Box sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <Typography variant="subtitle2" color="#94a3b8" sx={{ mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            Total Audited Tasks
                          </Typography>
                          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, mb: 0.5 }}>
                            {globalAnalytics.totalProcessed}
                          </Typography>
                          <Typography variant="body2" color="#94a3b8">
                            {globalAnalytics.totalProcessed} Audited / {globalAnalytics.totalSamplesTarget} Target
                          </Typography>
                        </Box>

                        <Box sx={{ mt: 3 }}>
                          <Typography variant="subtitle2" color="#94a3b8" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            Violation Cohorts
                          </Typography>
                          <TableContainer sx={{ maxHeight: 240, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: 1, fontSize: '0.75rem' } }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ bgcolor: '#111827', color: '#94a3b8', fontWeight: 'bold' }}>Cohort</TableCell>
                                  <TableCell align="right" sx={{ bgcolor: '#111827', color: '#94a3b8', fontWeight: 'bold' }}>Teams</TableCell>
                                  <TableCell align="right" sx={{ bgcolor: '#111827', color: '#94a3b8', fontWeight: 'bold' }}>Active / Inactive</TableCell>
                                  <TableCell align="right" sx={{ bgcolor: '#111827', color: '#94a3b8', fontWeight: 'bold' }}>Trained %</TableCell>
                                  <TableCell align="right" sx={{ bgcolor: '#111827', color: '#94a3b8', fontWeight: 'bold' }}>Action</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {(globalAnalytics.fieldTeamCohorts || []).map((cohort) => (
                                  <TableRow key={cohort.label} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>{cohort.label}</TableCell>
                                    <TableCell align="right" sx={{ color: '#fff', fontWeight: 700 }}>{cohort.teams}</TableCell>
                                    <TableCell align="right" sx={{ color: '#fff', fontWeight: 700 }}>
                                      {cohort.activeTeams}/{cohort.inactiveTeams}
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: cohort.trainedPercent >= 80 ? '#22c55e' : cohort.trainedPercent >= 50 ? '#f59e0b' : '#f43f5e', fontWeight: 700 }}>
                                      {cohort.trainedPercent}% ({cohort.trainedTeams}/{cohort.teams})
                                    </TableCell>
                                    <TableCell align="right">
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleOpenCohortDialog(cohort.label)}
                                        sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.15)', textTransform: 'none', fontSize: '0.7rem', px: 1.5 }}
                                      >
                                        View teams
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
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
                            <RechartsBar 
                              dataKey="value" 
                              radius={[6, 6, 0, 0]}
                              onClick={(data) => {
                                if (activeGlobalOwnershipInsight === data.name) {
                                  setActiveGlobalOwnershipInsight(null);
                                } else {
                                  setActiveGlobalOwnershipInsight(data.name);
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              {globalAnalytics.ownerData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={activeGlobalOwnershipInsight && activeGlobalOwnershipInsight !== entry.name ? "rgba(59,130,246,0.2)" : "url(#ownerGradient)"} 
                                />
                              ))}
                            </RechartsBar>
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
                                <TableRow 
                                  key={data.name} 
                                  sx={{ 
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                                    bgcolor: activeGlobalOwnershipInsight === data.name ? 'rgba(59,130,246,0.15)' : 'transparent'
                                  }}
                                >
                                  <TableCell 
                                    sx={{ color: activeGlobalOwnershipInsight === data.name ? '#3b82f6' : '#e2e8f0', cursor: 'pointer', fontWeight: activeGlobalOwnershipInsight === data.name ? 'bold' : 'normal' }}
                                    onClick={() => setActiveGlobalOwnershipInsight(activeGlobalOwnershipInsight === data.name ? null : data.name)}
                                  >
                                    {data.name}
                                    {activeGlobalOwnershipInsight === data.name && <Chip label="Filtered" size="small" sx={{ ml: 1, height: 16, fontSize: '0.6rem', bgcolor: '#3b82f6', color: '#fff' }} />}
                                  </TableCell>
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

                    {/* Governorate Distribution */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 3, ...colors.glass, borderRadius: 3, border: '1px solid rgba(14, 165, 233, 0.2)' }} elevation={0}>
                        <Typography variant="h6" fontWeight="700" mb={3} color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationOn sx={{ color: '#0ea5e9' }} /> Governorate Distribution
                        </Typography>
                        <ResponsiveContainer width="100%" height={280}>
                          <RechartsBarChart data={activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.governorateData : globalAnalytics.governorateData}>
                            <defs>
                              <linearGradient id="governorateGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.2} />
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
                                      <Typography sx={{ color: '#0ea5e9', fontSize: '0.75rem' }}>Count: <strong>{payload[0].value}</strong></Typography>
                                      <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>Contribution: {payload[0].payload.percentage}%</Typography>
                                    </Paper>
                                  );
                                }
                                return null;
                              }}
                            />
                            <RechartsBar dataKey="value" fill="url(#governorateGradient)" radius={[6, 6, 0, 0]} />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                        <TableContainer sx={{ mt: 2, maxHeight: 200, overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '4px' } }}>
                          <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' } }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Governorate</TableCell>
                                <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Total</TableCell>
                                <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>ITN</TableCell>
                                <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Sub</TableCell>
                                <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>%</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedGovernorates : globalAnalytics.detailedGovernorates) || []).slice(0, 15).map((data) => (
                                <TableRow key={data.name} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                  <TableCell sx={{ color: '#e2e8f0' }}>{data.name}</TableCell>
                                  <TableCell
                                    align="right"
                                    onClick={() => handleAnalyticsDrillDown({ governorate: data.name })}
                                    sx={{
                                      color: '#e2e8f0',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      '&:hover': { bgcolor: 'rgba(14, 165, 233, 0.2)', color: '#0ea5e9' }
                                    }}
                                  >
                                    {data.total}
                                  </TableCell>
                                  <TableCell align="right" sx={{ color: data.itn > 0 ? '#f59e0b' : '#64748b' }}>{data.itn}</TableCell>
                                  <TableCell align="right" sx={{ color: data.subscription > 0 ? '#10b981' : '#64748b' }}>{data.subscription}</TableCell>
                                  <TableCell align="right" sx={{ color: '#94a3b8' }}>{data.percentage}%</TableCell>
                                </TableRow>
                              ))}
                              <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>TOTAL</TableCell>
                                <TableCell align="right" sx={{ color: '#0ea5e9', fontWeight: 'bold' }}>{((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedGovernorates : globalAnalytics.detailedGovernorates) || []).reduce((sum, item) => sum + item.total, 0)}</TableCell>
                                <TableCell align="right" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>{((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedGovernorates : globalAnalytics.detailedGovernorates) || []).reduce((sum, item) => sum + item.itn, 0)}</TableCell>
                                <TableCell align="right" sx={{ color: '#10b981', fontWeight: 'bold' }}>{((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedGovernorates : globalAnalytics.detailedGovernorates) || []).reduce((sum, item) => sum + item.subscription, 0)}</TableCell>
                                <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 'bold' }}>100%</TableCell>
                              </TableRow>
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
                              data={(activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.reasonData : globalAnalytics.reasonData) || []}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.reasonData : globalAnalytics.reasonData) || []).map((entry, index) => (
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
                                <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>ITN</TableCell>
                                <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Sub</TableCell>
                                <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Total</TableCell>
                                <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>%</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedReasons : globalAnalytics.detailedReasons) || []).slice(0, 15).map((data) => {
                                const rowTotal = Object.values(data.ownerBreakdown).reduce((sum, count) => sum + count, 0);
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
                                      const pct = rowTotal > 0 ? ((count / rowTotal) * 100).toFixed(0) : 0;
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
                                  const totalForOwner = Object.values((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedReasons : globalAnalytics.detailedReasons) || []).reduce((sum, data) => sum + (data.ownerBreakdown[owner] || 0), 0);
                                  return (
                                    <TableCell key={owner} align="right" sx={{ color: '#3b82f6', fontWeight: 'bold' }}>{totalForOwner}</TableCell>
                                  );
                                })}
                                <TableCell align="right" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                                  {Object.values((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedReasons : globalAnalytics.detailedReasons) || []).reduce((sum, data) => sum + data.itn, 0)}
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                                  {Object.values((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedReasons : globalAnalytics.detailedReasons) || []).reduce((sum, data) => sum + data.subscription, 0)}
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>
                                  {Object.values((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedReasons : globalAnalytics.detailedReasons) || []).reduce((sum, data) => sum + data.total, 0)}
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
                            onClick={() => setChartDialog({ open: true, title: 'Sub-Reason Analysis', data: activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.subReasonData : globalAnalytics.subReasonData, type: 'bar' })}
                            sx={{ color: '#f59e0b', bgcolor: 'rgba(245, 158, 11, 0.1)' }}
                          >
                            <MdInsights size={20} />
                          </IconButton>
                        </Box>
                        <ResponsiveContainer width="100%" height={280}>
                          <RechartsBarChart data={activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.subReasonData : globalAnalytics.subReasonData}>
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
                              {((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedSubReasons : globalAnalytics.detailedSubReasons) || []).slice(0, 15).map((data) => {
                                const rowTotal = Object.values(data.ownerBreakdown).reduce((sum, count) => sum + count, 0);
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
                                      const pct = rowTotal > 0 ? ((count / rowTotal) * 100).toFixed(0) : 0;
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
                                  const totalForOwner = Object.values((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedSubReasons : globalAnalytics.detailedSubReasons) || []).reduce((sum, data) => sum + (data.ownerBreakdown[owner] || 0), 0);
                                  return (
                                    <TableCell key={owner} align="right" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>{totalForOwner}</TableCell>
                                  );
                                })}
                                <TableCell align="right" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                                  {Object.values((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedSubReasons : globalAnalytics.detailedSubReasons) || []).reduce((sum, data) => sum + data.itn, 0)}
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                                  {Object.values((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedSubReasons : globalAnalytics.detailedSubReasons) || []).reduce((sum, data) => sum + data.subscription, 0)}
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>
                                  {Object.values((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedSubReasons : globalAnalytics.detailedSubReasons) || []).reduce((sum, data) => sum + data.total, 0)}
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
                            onClick={() => setChartDialog({ open: true, title: 'Root Cause Analysis', data: activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.rootCauseData : globalAnalytics.rootCauseData, type: 'area' })}
                            sx={{ color: '#8b5cf6', bgcolor: 'rgba(139, 92, 246, 0.1)' }}
                          >
                            <MdInsights size={20} />
                          </IconButton>
                        </Box>
                        <ResponsiveContainer width="100%" height={280}>
                          <RechartsBarChart data={activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.rootCauseData : globalAnalytics.rootCauseData}>
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
                                <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>ITN</TableCell>
                                <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Sub</TableCell>
                                <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>Total</TableCell>
                                <TableCell align="right" sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontWeight: 'bold' }}>%</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedRootCauses : globalAnalytics.detailedRootCauses) || []).slice(0, 15).map((data) => {
                                const rowTotal = Object.values(data.ownerBreakdown).reduce((sum, count) => sum + count, 0);
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
                                      const pct = rowTotal > 0 ? ((count / rowTotal) * 100).toFixed(0) : 0;
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
                                  const totalForOwner = Object.values((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedRootCauses : globalAnalytics.detailedRootCauses) || []).reduce((sum, data) => sum + (data.ownerBreakdown[owner] || 0), 0);
                                  return (
                                    <TableCell key={owner} align="right" sx={{ color: '#8b5cf6', fontWeight: 'bold' }}>{totalForOwner}</TableCell>
                                  );
                                })}
                                <TableCell align="right" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                                  {Object.values((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedRootCauses : globalAnalytics.detailedRootCauses) || []).reduce((sum, data) => sum + data.itn, 0)}
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                                  {Object.values((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedRootCauses : globalAnalytics.detailedRootCauses) || []).reduce((sum, data) => sum + data.subscription, 0)}
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>
                                  {Object.values((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedRootCauses : globalAnalytics.detailedRootCauses) || []).reduce((sum, data) => sum + data.total, 0)}
                                </TableCell>
                                <TableCell align="right" sx={{ color: '#94a3b8', fontWeight: 'bold' }}>100%</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>

                      </Paper>
                    </Grid>
                  </Grid>

                  <TeamViolationOverview
                    fieldTeams={fieldTeams}
                    leaderboardData={leaderboardData}
                    allTechnicalTasksGlobal={allTechnicalTasksGlobal}
                    allCustomerIssuesGlobal={allCustomerIssuesGlobal}
                    allTrainingSessionsGlobal={allTrainingSessionsGlobal}
                    handleDrillDown={handleDrillDown}
                    handleExportTeamViolations={handleExportTeamViolations}
                    handleExportAllTeamsViolations={handleExportAllTeamsViolations}
                    colors={colors}
                    settings={settings}
                  />


                </Box>
              )}
            </Box>

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
                        <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>TYPE</TableCell>
                        <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>SLID</TableCell>
                        <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>DATE</TableCell>
                        <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>CUSTOMER / CATEGORY</TableCell>
                        {(drillDownType === 'task' || (drillDownType === 'mixed' && drillDownTab === 'tasks')) && (
                          <>
                            <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>REASON</TableCell>
                            <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>SUB-REASON</TableCell>
                            <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>RC</TableCell>
                            <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>OWNER</TableCell>
                            <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>FEEDBACK (VERBATIM)</TableCell>
                          </>
                        )}
                        <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>STATUS</TableCell>
                        <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>POINTS</TableCell>
                        <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>SCORE / INFO</TableCell>
                        <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', fontSize: '0.75rem', py: 1 }}>ACTIONS</TableCell>
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
                              sx={{
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }
                              }}
                            >
                              <TableCell sx={{ py: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <Chip
                                  label={isIssue ? 'ISSUE' : 'TASK'}
                                  size="small"
                                  sx={{
                                    bgcolor: isIssue ? `${colors.error}20` : `${colors.primary}20`,
                                    color: isIssue ? colors.error : colors.primary,
                                    fontWeight: 800,
                                    fontSize: '0.55rem',
                                    height: '18px'
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 1, color: '#fff', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>{item.slid}</TableCell>
                              <TableCell sx={{ py: 1, color: colors.textSecondary, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>{formatDate(date)}</TableCell>
                              <TableCell sx={{ py: 1, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {isIssue ? (
                                    item.issueCategory || (item.issues?.[0]?.category) || 'Technical Issue'
                                  ) : (
                                    <>
                                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff', fontSize: '0.8rem' }}>
                                        {item.customerName || 'N/A'}
                                      </Typography>
                                      {item.customerType && (
                                        <Chip
                                          label={item.customerType}
                                          size="small"
                                          sx={{
                                            height: '16px',
                                            fontSize: '0.55rem',
                                            bgcolor: 'rgba(255,255,255,0.1)',
                                            color: colors.textSecondary,
                                            borderRadius: '4px'
                                          }}
                                        />
                                      )}
                                    </>
                                  )}
                                </Box>
                                <Typography variant="caption" sx={{ display: 'block', color: colors.textSecondary, fontSize: '0.65rem' }}>
                                  {isIssue ? (item.issueDetails || item.reporterNote || item.assigneeNote || '').substring(0, 50) : item.faultDescription?.substring(0, 30)}
                                  {(isIssue ? (item.issueDetails || item.reporterNote || item.assigneeNote || '').length > 50 : (item.faultDescription || '').length > 30) ? '...' : ''}
                                </Typography>
                              </TableCell>
                              {!isIssue && (() => {
                                const rawOwners = extractOwners(item);
                                const rawReasons = splitValues(item.reason);
                                const rawSubReasons = splitValues(item.subReason);
                                const rawRoots = splitValues(item.rootCause);
                                const maxLen = Math.max(rawOwners.length, rawReasons.length, rawSubReasons.length, rawRoots.length, 1);

                                const validTuples = [];
                                for (let i = 0; i < maxLen; i++) {
                                  const owner = rawOwners[i] || 'Empty';
                                  const reason = rawReasons[i] || 'N/A';
                                  const subReason = rawSubReasons[i] || 'N/A';
                                  const rootCause = rawRoots[i] || 'N/A';

                                  const isGarbage = (owner === 'Empty' || !owner) &&
                                    (reason === 'N/A' || !reason) &&
                                    (subReason === 'N/A' || !subReason) &&
                                    (rootCause === 'N/A' || !rootCause);

                                  if (!isGarbage || i === 0) {
                                    validTuples.push({ owner, reason, subReason, rootCause });
                                  }
                                }

                                const max = validTuples.length;

                                return (
                                  <>
                                    <TableCell sx={{ py: 0.5, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top', fontSize: '0.75rem' }}>
                                      {validTuples.map((tuple, i) => (
                                        <Box key={i} sx={{ minHeight: '1.2em', display: 'flex', alignItems: 'center', borderBottom: i < max - 1 ? '1px dashed rgba(255,255,255,0.05)' : 'none' }}>
                                          {tuple.reason || <span style={{ color: 'rgba(255,255,255,0.2)' }}>N/A</span>}
                                        </Box>
                                      ))}
                                    </TableCell>
                                    <TableCell sx={{ py: 0.5, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top', fontSize: '0.75rem' }}>
                                      {validTuples.map((tuple, i) => (
                                        <Box key={i} sx={{ minHeight: '1.2em', display: 'flex', alignItems: 'center', borderBottom: i < max - 1 ? '1px dashed rgba(255,255,255,0.05)' : 'none' }}>
                                          {tuple.subReason || <span style={{ color: 'rgba(255,255,255,0.2)' }}>N/A</span>}
                                        </Box>
                                      ))}
                                    </TableCell>
                                    <TableCell sx={{ py: 0.5, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top', fontSize: '0.75rem' }}>
                                      {validTuples.map((tuple, i) => (
                                        <Box key={i} sx={{ minHeight: '1.2em', display: 'flex', alignItems: 'center', borderBottom: i < max - 1 ? '1px dashed rgba(255,255,255,0.05)' : 'none' }}>
                                          {tuple.rootCause || <span style={{ color: 'rgba(255,255,255,0.2)' }}>N/A</span>}
                                        </Box>
                                      ))}
                                    </TableCell>
                                    <TableCell sx={{ py: 0.5, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top', fontSize: '0.7rem' }}>
                                      {validTuples.map((tuple, i) => (
                                        <Box key={i} sx={{ minHeight: '1.2em', display: 'flex', alignItems: 'center', borderBottom: i < max - 1 ? '1px dashed rgba(255,255,255,0.05)' : 'none' }}>
                                          <Chip
                                            label={tuple.owner || 'Empty'}
                                            size="small"
                                            sx={{
                                              height: '16px',
                                              fontSize: '0.6rem',
                                              bgcolor: 'rgba(255,255,255,0.05)',
                                              color: tuple.owner !== 'N/A' ? '#fff' : 'rgba(255,255,255,0.3)',
                                              border: '1px solid rgba(255,255,255,0.1)'
                                            }}
                                          />
                                        </Box>
                                      ))}
                                    </TableCell>
                                    <TableCell sx={{ py: 1, color: `${colors.warning}cc`, borderBottom: '1px solid rgba(255,255,255,0.05)', fontStyle: 'italic', maxWidth: '200px', fontSize: '0.75rem' }}>
                                      {(() => {
                                        const feedback = item.customerFeedback || item.feedback || 'No verbatim feedback provided';
                                        return (
                                          <>
                                            {feedback.substring(0, 50)}
                                            {feedback.length > 50 && (
                                              <Button
                                                size="small"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedVerbatim(feedback);
                                                  setVerbatimDialogOpen(true);
                                                }}
                                                sx={{
                                                  textTransform: 'none',
                                                  fontSize: '0.65rem',
                                                  color: colors.primary,
                                                  ml: 1,
                                                  minWidth: 0,
                                                  p: 0,
                                                  '&:hover': { background: 'transparent', textDecoration: 'underline' }
                                                }}
                                              >
                                                Read More
                                              </Button>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </TableCell>
                                  </>
                                );
                              })()}
                              <TableCell sx={{ py: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <Chip
                                  label={status}
                                  size="small"
                                  sx={{
                                    bgcolor: status === 'Solved' || status === 'Approved' ? `${colors.success}20` : status === 'Open' ? `${colors.error}20` : 'rgba(255,255,255,0.1)',
                                    color: status === 'Solved' || status === 'Approved' ? colors.success : status === 'Open' ? colors.error : colors.textSecondary,
                                    fontWeight: 700,
                                    fontSize: '0.7rem',
                                    height: '20px'
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <Chip
                                  label={calculateItemPoints(item, isIssue ? 'issue' : 'task')}
                                  size="small"
                                  sx={{
                                    bgcolor: 'rgba(139, 92, 246, 0.1)',
                                    color: colors.primary,
                                    fontWeight: 800,
                                    borderRadius: '6px',
                                    height: '20px',
                                    fontSize: '0.7rem',
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 1, color: colors.textPrimary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                                {score}
                              </TableCell>
                              <TableCell sx={{ py: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
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
                                      p: 0.5,
                                      '&:hover': { bgcolor: `${colors.primary}20` }
                                    }}
                                  >
                                    <VisibilityIcon sx={{ fontSize: '1.1rem' }} />
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

            {/* Cohort Team List Dialog */}
            <Dialog
              open={cohortDialogOpen}
              onClose={() => setCohortDialogOpen(false)}
              maxWidth="md"
              fullWidth
              PaperProps={{
                sx: {
                  ...colors.glass,
                  bgcolor: '#1a1a1a',
                  borderRadius: '24px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }
              }}
            >
              <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800 }}>Teams in {cohortDialogLabel} Cohort</Typography>
                <IconButton onClick={() => setCohortDialogOpen(false)} sx={{ color: colors.textSecondary }}>
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              <DialogContent>
                <TableContainer sx={{ maxHeight: '50vh' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700 }}>Team</TableCell>
                        <TableCell align="right" sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700 }}>Violations</TableCell>
                        <TableCell align="right" sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700 }}>Trained</TableCell>
                        <TableCell align="right" sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cohortDialogItems.map((item, idx) => (
                        <TableRow key={`${item.teamName}-${idx}`} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                          <TableCell sx={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{item.teamName}</TableCell>
                          <TableCell align="right" sx={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{item.count}</TableCell>
                          <TableCell align="right" sx={{ color: item.trained ? '#22c55e' : '#f43f5e', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            {item.trained ? 'Yes' : 'No'}
                          </TableCell>
                          <TableCell align="right" sx={{ color: item.active ? '#22c55e' : '#f59e0b', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            {item.active ? 'Active' : 'Inactive'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </DialogContent>
              <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <Button onClick={() => setCohortDialogOpen(false)} sx={{ color: colors.textSecondary }}>Close</Button>
              </DialogActions>
            </Dialog>

            {/* Verbatim Feedback Dialog */}
            <Dialog
              open={verbatimDialogOpen}
              onClose={() => setVerbatimDialogOpen(false)}
              PaperProps={{
                sx: {
                  ...colors.glass,
                  bgcolor: '#1a1a1a',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  maxWidth: '500px'
                }
              }}
            >
              <DialogTitle sx={{ color: colors.warning, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                Full Customer Feedback
              </DialogTitle>
              <DialogContent sx={{ p: 4 }}>
                <Typography sx={{ color: '#fff', fontStyle: 'italic', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  "{selectedVerbatim}"
                </Typography>
              </DialogContent>
              <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.05)', p: 2 }}>
                <Button
                  onClick={() => setVerbatimDialogOpen(false)}
                  sx={{
                    color: colors.primary,
                    fontWeight: 700,
                    '&:hover': { background: 'rgba(139, 92, 246, 0.1)' }
                  }}
                >
                  Got it
                </Button>
              </DialogActions>
            </Dialog>

            {/* TAB 2: COMPARISON CHART */}
            {globalTab === 2 && (
              <ComparisonAnalytics
                technicalTasks={allTechnicalTasksGlobal}
                settings={settings}
                colors={colors}
                totalSamplesTarget={globalAnalytics.totalSamplesTarget}
                samplesTokenData={samplesTokenData}
              />
            )}
          </>
        )}

        {/* Main Content Area */}
        {selectedTeam && (
          <>
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
                    <Grid item xs={12} sm={6} md={2.4}><MiniStatCard title="Total Transactions" value={stats.totalTransactions} icon={<FaClipboardList />} color="#2196f3" subtext="Total records" /></Grid>
                    <Grid item xs={12} sm={6} md={2.4}><MiniStatCard title="Issues Highlighted" value={stats.totalIssuesHighlighted} icon={<FaExclamationCircle />} color="#ffc107" subtext={`Avg: ${stats.issueDensity} per txn`} /></Grid>
                    <Grid item xs={12} sm={6} md={2.4}><MiniStatCard title="Closed" value={stats.closed} icon={<FaCheckCircle />} color="#4caf50" subtext={`${stats.resolutionRate}% Rate`} /></Grid>
                    <Grid item xs={12} sm={6} md={2.4}><MiniStatCard title="Open" value={stats.open} icon={<FaExclamationCircle />} color="#f44336" subtext="Require attention" /></Grid>
                    <Grid item xs={12} sm={6} md={2.4}><MiniStatCard title="Avg. Daily Issues" value={(stats.totalTransactions / (trendData.labels.length || 1)).toFixed(1)} icon={<FaChartLine />} color="#ff9800" subtext="Trend metric" /></Grid>
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 3 }}>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: '#fff', mb: 0.5 }}>
                        Advanced Performance Analytics
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                        Operational workload and technical assessment deep-dive for <span style={{ color: colors.primary, fontWeight: 700 }}>{selectedTeam?.teamName}</span>
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Time Filter Controls */}
                      <Paper sx={{
                        display: 'inline-flex',
                        p: 0.5,
                        bgcolor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '14px',
                        backdropFilter: 'blur(10px)'
                      }}>
                        <ToggleButtonGroup
                          value={taskTimeFilterMode}
                          exclusive
                          onChange={(e, val) => val && setTaskTimeFilterMode(val)}
                          size="small"
                          sx={{
                            '& .MuiToggleButton-root': {
                              border: 'none',
                              color: '#64748b',
                              px: 2,
                              borderRadius: '10px !important',
                              textTransform: 'none',
                              fontWeight: 600,
                              '&.Mui-selected': {
                                bgcolor: colors.primary,
                                color: '#fff',
                                '&:hover': { bgcolor: colors.primary }
                              }
                            }
                          }}
                        >
                          <ToggleButton value="all">All</ToggleButton>
                          <ToggleButton value="days">Last {taskRecentDaysValue}d</ToggleButton>
                          <ToggleButton value="weeks">Weeks</ToggleButton>
                          <ToggleButton value="months">Months</ToggleButton>
                          <ToggleButton value="custom">Custom</ToggleButton>
                        </ToggleButtonGroup>
                      </Paper>

                      {/* Mode Specific Controls */}
                      {taskTimeFilterMode === 'days' && (
                        <TextField
                          select
                          size="small"
                          value={taskRecentDaysValue}
                          onChange={(e) => setTaskRecentDaysValue(e.target.value)}
                          sx={{
                            width: 100,
                            '& .MuiOutlinedInput-root': {
                              bgcolor: 'rgba(255,255,255,0.03)',
                              borderRadius: '12px',
                              color: '#fff'
                            }
                          }}
                        >
                          {[1, 7, 30, 60, 90, 180, 365].map(d => (
                            <MenuItem key={d} value={d}>{d} Days</MenuItem>
                          ))}
                        </TextField>
                      )}

                      {taskTimeFilterMode === 'weeks' && (
                        <Autocomplete
                          multiple
                          size="small"
                          options={weekRanges}
                          value={taskSelectedWeeks}
                          onChange={(e, val) => setTaskSelectedWeeks(val)}
                          renderInput={(params) => (
                            <TextField {...params} placeholder="Select Weeks" sx={{ width: 250 }} />
                          )}
                          sx={{
                            '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.03)', borderRadius: '12px' },
                            '& .MuiChip-root': { bgcolor: colors.primary, color: '#fff' }
                          }}
                        />
                      )}

                      {taskTimeFilterMode === 'months' && (
                        <Autocomplete
                          multiple
                          size="small"
                          options={monthOptions}
                          value={taskSelectedMonths}
                          onChange={(e, val) => setTaskSelectedMonths(val)}
                          renderInput={(params) => (
                            <TextField {...params} placeholder="Select Months" sx={{ width: 250 }} />
                          )}
                          sx={{
                            '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.03)', borderRadius: '12px' },
                            '& .MuiChip-root': { bgcolor: colors.primary, color: '#fff' }
                          }}
                        />
                      )}

                      {taskTimeFilterMode === 'custom' && (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <TextField
                            type="date"
                            size="small"
                            value={taskCustomDateRange.start}
                            onChange={(e) => setTaskCustomDateRange({ ...taskCustomDateRange, start: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.03)', borderRadius: '12px', color: '#fff' } }}
                          />
                          <Typography sx={{ color: '#94a3b8' }}>-</Typography>
                          <TextField
                            type="date"
                            size="small"
                            value={taskCustomDateRange.end}
                            onChange={(e) => setTaskCustomDateRange({ ...taskCustomDateRange, end: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.03)', borderRadius: '12px', color: '#fff' } }}
                          />
                        </Box>
                      )}

                      <Button
                        variant="contained"
                        startIcon={<FaFileExcel />}
                        onClick={() => {
                          const data = filteredTechnicalTasks.map(t => ({
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
                          XLSX.writeFile(wb, `${selectedTeam.teamName}_Filtered_Tasks.xlsx`);
                        }}
                        sx={{
                          background: colors.primaryGradient,
                          borderRadius: '12px',
                          textTransform: 'none',
                          fontWeight: 600,
                          px: 3
                        }}
                      >
                        Export Filtered
                      </Button>
                    </Box>
                  </Box>

                  {/* Technical KPI Section */}
                  <Grid container spacing={3} mb={4}>
                    <Grid item xs={12} sm={6} md={4}>
                      <MiniStatCard
                        title="Total NPS Tasks"
                        value={filteredTechnicalTasks.length}
                        icon={<FaClipboardList />}
                        color={colors.primary}
                        subtext="Scoped period tasks"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <MiniStatCard
                        title="NPS Detractors"
                        value={individualTeamAnalytics.sentiment.Detractor}
                        icon={<FaExclamationCircle />}
                        color={colors.error}
                        subtext={`Score below 6/10 (${individualTeamAnalytics.sentimentData.find(d => d.name === 'Detractors')?.percentage || 0}%)`}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <MiniStatCard
                        title="NPS Neutrals"
                        value={individualTeamAnalytics.sentiment.Neutral}
                        icon={<FaEquals />}
                        color={colors.warning}
                        subtext={`Score 7-8/10 (${individualTeamAnalytics.sentimentData.find(d => d.name === 'Neutrals')?.percentage || 0}%)`}
                      />
                    </Grid>
                  </Grid>

                  {/* ADVANCED ANALYTICS CHARTS (Mirroring Global Dashboard) */}
                  <Grid container spacing={3} mb={4}>
                    {/* FOCUSED OWNERSHIP INTELLIGENCE BANNER */}
                    {activeOwnershipInsight && individualTeamAnalytics.focusedData && (
                      <Grid item xs={12}>
                        <Paper sx={{
                          p: 2,
                          mb: 2,
                          background: `linear-gradient(90deg, ${colors.primary}20 0%, transparent 100%)`,
                          border: `1px solid ${colors.primary}40`,
                          borderRadius: '16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ p: 1, bgcolor: colors.primary, borderRadius: '8px' }}>
                              <FaUserTie color="#fff" />
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" sx={{ color: colors.primary, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>Focused Analytical Mode</Typography>
                              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>Ownership: {activeOwnershipInsight}</Typography>
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: 'right', display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Box>
                              <Typography variant="h5" sx={{ color: colors.primary, fontWeight: 900 }}>{individualTeamAnalytics.focusedData.total}</Typography>
                              <Typography variant="caption" sx={{ color: '#94a3b8' }}>TOTAL VIOLATIONS</Typography>
                            </Box>
                            <Button
                              variant="outlined"
                              onClick={() => setActiveOwnershipInsight(null)}
                              sx={{
                                color: '#fff',
                                borderColor: 'rgba(255,255,255,0.2)',
                                borderRadius: '10px',
                                textTransform: 'none'
                              }}
                            >
                              Reset View
                            </Button>
                          </Box>
                        </Paper>
                      </Grid>
                    )}

                    {/* Reason Analysis */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 3, ...colors.glass, borderRadius: '24px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <MdInsights style={{ color: colors.success }} />
                          {activeOwnershipInsight ? `Reason Analysis (${activeOwnershipInsight})` : 'Reason Analysis'}
                        </Typography>
                        <Box sx={{ height: 300 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart
                              data={activeOwnershipInsight ? individualTeamAnalytics.focusedData?.reasonData : individualTeamAnalytics.reasonData.slice(0, 8)}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} angle={-25} textAnchor="end" height={60} />
                              <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                              <RechartsTooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12 }}
                                itemStyle={{ color: colors.secondary }}
                              />
                              <RechartsBar
                                dataKey="value"
                                fill={colors.secondary}
                                radius={[6, 6, 0, 0]}
                                onClick={(data) => handleIndividualAnalyticsDrillDown({ reason: data.name })}
                                style={{ cursor: 'pointer' }}
                              >
                                {individualTeamAnalytics.reasonData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={['#10b981', '#34d399', '#059669', '#065f46'][index % 4]} />
                                ))}
                              </RechartsBar>
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        </Box>
                      </Paper>
                    </Grid>

                    {/* Ownership Selection */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 3, ...colors.glass, borderRadius: '24px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <FaUserTie style={{ color: colors.info }} /> Ownership Distribution
                        </Typography>
                        <Box sx={{ height: 300 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={individualTeamAnalytics.ownerData.slice(0, 8)} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                              <XAxis type="number" stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} width={120} />
                              <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12 }} />
                              <RechartsBar
                                dataKey="value"
                                onClick={(data) => {
                                  if (activeOwnershipInsight === data.name) {
                                    setActiveOwnershipInsight(null);
                                  } else {
                                    setActiveOwnershipInsight(data.name);
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                {individualTeamAnalytics.ownerData.slice(0, 8).map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={activeOwnershipInsight === entry.name ? colors.primary : colors.info}
                                    stroke={activeOwnershipInsight === entry.name ? '#fff' : 'none'}
                                    strokeWidth={2}
                                  />
                                ))}
                              </RechartsBar>
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        </Box>
                      </Paper>
                    </Grid>

                    {/* Sub-Reason Analysis */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 3, ...colors.glass, borderRadius: '24px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <MdInsights style={{ color: colors.warning }} />
                          {activeOwnershipInsight ? `Sub-Reason Breakdown (${activeOwnershipInsight})` : 'Sub-Reason Breakdown'}
                        </Typography>
                        <Box sx={{ height: 300 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart
                              data={activeOwnershipInsight ? individualTeamAnalytics.focusedData?.subReasonData : individualTeamAnalytics.subReasonData.slice(0, 8)}
                              layout="vertical"
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                              <XAxis type="number" stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} width={120} />
                              <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12 }} />
                              <RechartsBar
                                dataKey="value"
                                fill={colors.warning}
                                radius={[0, 6, 6, 0]}
                                onClick={(data) => handleIndividualAnalyticsDrillDown({ subReason: data.name })}
                                style={{ cursor: 'pointer' }}
                              />
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        </Box>
                      </Paper>
                    </Grid>

                    {/* Root Cause Analysis */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 3, ...colors.glass, borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Warning sx={{ color: colors.error }} />
                          {activeOwnershipInsight ? `Root Cause Distribution (${activeOwnershipInsight})` : 'Root Cause Distribution'}
                        </Typography>
                        <Box sx={{ height: 300 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart
                              data={activeOwnershipInsight ? individualTeamAnalytics.focusedData?.rootCauseData : individualTeamAnalytics.rootCauseData.slice(0, 10)}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} angle={-25} textAnchor="end" height={60} />
                              <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                              <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12 }} />
                              <RechartsBar
                                dataKey="value"
                                fill={colors.error}
                                radius={[6, 6, 0, 0]}
                                onClick={(data) => handleIndividualAnalyticsDrillDown({ rootCause: data.name })}
                                style={{ cursor: 'pointer' }}
                              />
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* POST-SESSION DEEP DIVE SECTION */}
                  {postSessionAnalytics && (
                    <Box sx={{ mb: 6 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                        <Box sx={{ p: 1.5, borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: colors.primary }}>
                          <Timeline fontSize="medium" />
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 900 }}>Post-Session Performance Analysis</Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            Analyzing commitment and violations recorded after the latest session ({formatDate(postSessionAnalytics.latestSessionDate)})
                          </Typography>
                        </Box>
                        <Box sx={{ ml: 'auto' }}>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={showPostSessionRegistry ? <VisibilityIcon /> : <TableChartIcon />}
                            onClick={() => setShowPostSessionRegistry(!showPostSessionRegistry)}
                            sx={{
                              bgcolor: colors.primary,
                              borderRadius: '12px',
                              textTransform: 'none',
                              fontWeight: 700,
                              boxShadow: `0 4px 14px 0 ${colors.primary}40`,
                              '&:hover': { bgcolor: colors.primary, boxShadow: `0 6px 20px 0 ${colors.primary}60` }
                            }}
                          >
                            {showPostSessionRegistry ? 'Hide Registry' : 'Detailed Violation Registry'}
                          </Button>
                        </Box>
                      </Box>

                      {postSessionAnalytics.hasTasks ? (
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 3, ...colors.glass, borderRadius: '24px', border: '1px solid rgba(139, 92, 246, 0.1)', height: '100%' }}>
                              <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 2, fontWeight: 700 }}>POST-SESSION SENTIMENT</Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography sx={{ color: colors.error, fontWeight: 600 }}>Detractors</Typography>
                                  <Typography sx={{ color: '#fff', fontWeight: 900 }}>{postSessionAnalytics.sentiment.Detractor} ({((postSessionAnalytics.sentiment.Detractor / postSessionAnalytics.totalPostTasks) * 100).toFixed(1)}%)</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography sx={{ color: colors.warning, fontWeight: 600 }}>Neutrals</Typography>
                                  <Typography sx={{ color: '#fff', fontWeight: 900 }}>{postSessionAnalytics.sentiment.Neutral} ({((postSessionAnalytics.sentiment.Neutral / postSessionAnalytics.totalPostTasks) * 100).toFixed(1)}%)</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography sx={{ color: colors.success, fontWeight: 600 }}>Promoters</Typography>
                                  <Typography sx={{ color: '#fff', fontWeight: 900 }}>{postSessionAnalytics.sentiment.Promoter} ({((postSessionAnalytics.sentiment.Promoter / postSessionAnalytics.totalPostTasks) * 100).toFixed(1)}%)</Typography>
                                </Box>
                                <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.05)' }} />
                                <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                                  Total of {postSessionAnalytics.totalPostTasks} violations recorded since last training.
                                </Typography>
                              </Box>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} md={8}>
                            <Paper sx={{ p: 3, ...colors.glass, borderRadius: '24px', border: `1px solid ${activePostSessionOwner ? colors.primary + '40' : 'rgba(59, 130, 246, 0.1)'}` }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 700 }}>
                                  POST-SESSION OWNERSHIP BREAKDOWN
                                  <Typography component="span" variant="caption" sx={{ ml: 1, color: '#64748b' }}>click a bar to drill down</Typography>
                                </Typography>
                                {activePostSessionOwner && (
                                  <Chip
                                    label={`Focused: ${activePostSessionOwner}`}
                                    size="small"
                                    onDelete={() => setActivePostSessionOwner(null)}
                                    sx={{ bgcolor: `${colors.primary}20`, color: colors.primary, fontWeight: 700, fontSize: '0.7rem' }}
                                  />
                                )}
                              </Box>
                              <Box sx={{ height: 200 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <RechartsBarChart data={postSessionAnalytics.ownerData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={120} />
                                    <RechartsTooltip
                                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12 }}
                                      formatter={(value, name, props) => [value, 'Violations']}
                                    />
                                    <RechartsBar
                                      dataKey="value"
                                      radius={[0, 4, 4, 0]}
                                      style={{ cursor: 'pointer' }}
                                      onClick={(data) => setActivePostSessionOwner(prev => prev === data.name ? null : data.name)}
                                    >
                                      {postSessionAnalytics.ownerData.map((entry, index) => (
                                        <Cell
                                          key={`cell-${index}`}
                                          fill={activePostSessionOwner === entry.name ? colors.primary : colors.info}
                                          stroke={activePostSessionOwner === entry.name ? '#fff' : 'none'}
                                          strokeWidth={activePostSessionOwner === entry.name ? 2 : 0}
                                        />
                                      ))}
                                    </RechartsBar>
                                  </RechartsBarChart>
                                </ResponsiveContainer>
                              </Box>
                            </Paper>
                          </Grid>

                          {/* Owner Drill-Down: Reason / SubReason / RootCause */}
                          {activePostSessionOwner && postSessionAnalytics.ownerChartData[activePostSessionOwner] && (
                            <Grid item xs={12}>
                              <Paper sx={{
                                p: 3,
                                ...colors.glass,
                                borderRadius: '24px',
                                border: `1px solid ${colors.primary}30`,
                                background: `linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(15,23,42,0.9) 100%)`
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                  <Box sx={{ p: 1, borderRadius: '10px', bgcolor: `${colors.primary}20` }}>
                                    <FaUserTie color={colors.primary} />
                                  </Box>
                                  <Box>
                                    <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 800 }}>
                                      Violation Breakdown — {activePostSessionOwner}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                      {postSessionAnalytics.ownerData.find(o => o.name === activePostSessionOwner)?.value || 0} post-session violations attributed to this owner
                                    </Typography>
                                  </Box>
                                </Box>
                                <Grid container spacing={3}>
                                  {/* Reason */}
                                  <Grid item xs={12} md={4}>
                                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1.5 }}>By Reason</Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                      {postSessionAnalytics.ownerChartData[activePostSessionOwner].reasonData.slice(0, 6).map((item, idx) => (
                                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                              <Typography variant="caption" sx={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.78rem' }}>{item.name}</Typography>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 800 }}>{item.value}</Typography>
                                                {postSessionAnalytics.preReasons.has(item.name) ? (
                                                  <Chip label="Repeat" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(239,68,68,0.15)', color: '#f87171', fontWeight: 700, px: 0.3 }} />
                                                ) : (
                                                  <Chip label="New" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(34,197,94,0.15)', color: '#4ade80', fontWeight: 700, px: 0.3 }} />
                                                )}
                                              </Box>
                                            </Box>
                                            <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                              <Box sx={{ height: '100%', width: `${item.percentage}%`, bgcolor: postSessionAnalytics.preReasons.has(item.name) ? colors.error : colors.success, borderRadius: 2, transition: 'width 0.6s ease' }} />
                                            </Box>
                                          </Box>
                                        </Box>
                                      ))}
                                    </Box>
                                  </Grid>
                                  {/* Sub-Reason */}
                                  <Grid item xs={12} md={4}>
                                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1.5 }}>By Sub-Reason</Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                      {postSessionAnalytics.ownerChartData[activePostSessionOwner].subReasonData.slice(0, 6).map((item, idx) => (
                                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                              <Typography variant="caption" sx={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.78rem' }}>{item.name}</Typography>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Typography variant="caption" sx={{ color: colors.warning, fontWeight: 800 }}>{item.value}</Typography>
                                                {postSessionAnalytics.preSubReasons.has(item.name) ? (
                                                  <Chip label="Repeat" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(239,68,68,0.15)', color: '#f87171', fontWeight: 700, px: 0.3 }} />
                                                ) : (
                                                  <Chip label="New" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(34,197,94,0.15)', color: '#4ade80', fontWeight: 700, px: 0.3 }} />
                                                )}
                                              </Box>
                                            </Box>
                                            <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                              <Box sx={{ height: '100%', width: `${item.percentage}%`, bgcolor: postSessionAnalytics.preSubReasons.has(item.name) ? colors.error : colors.success, borderRadius: 2, transition: 'width 0.6s ease' }} />
                                            </Box>
                                          </Box>
                                        </Box>
                                      ))}
                                    </Box>
                                  </Grid>
                                  {/* Root Cause */}
                                  <Grid item xs={12} md={4}>
                                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1.5 }}>By Root Cause</Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                      {postSessionAnalytics.ownerChartData[activePostSessionOwner].rootCauseData.slice(0, 6).map((item, idx) => (
                                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                              <Typography variant="caption" sx={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.78rem' }}>{item.name}</Typography>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Typography variant="caption" sx={{ color: colors.error, fontWeight: 800 }}>{item.value}</Typography>
                                                {postSessionAnalytics.preRootCauses.has(item.name) ? (
                                                  <Chip label="Repeat" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(239,68,68,0.15)', color: '#f87171', fontWeight: 700, px: 0.3 }} />
                                                ) : (
                                                  <Chip label="New" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(34,197,94,0.15)', color: '#4ade80', fontWeight: 700, px: 0.3 }} />
                                                )}
                                              </Box>
                                            </Box>
                                            <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                              <Box sx={{ height: '100%', width: `${item.percentage}%`, bgcolor: postSessionAnalytics.preRootCauses.has(item.name) ? colors.error : colors.success, borderRadius: 2, transition: 'width 0.6s ease' }} />
                                            </Box>
                                          </Box>
                                        </Box>
                                      ))}
                                    </Box>
                                  </Grid>
                                </Grid>
                              </Paper>
                            </Grid>
                          )}
                        </Grid>
                      ) : (
                        <Paper sx={{ p: 4, ...colors.glass, borderRadius: '24px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>
                          <Typography sx={{ color: '#94a3b8' }}>Excellent! No violations recorded since the last session on {formatDate(postSessionAnalytics.latestSessionDate)}.</Typography>
                        </Paper>
                      )}
                    </Box>
                  )}

                  {/* Post-Session Violation Registry — appears BEFORE the Technical Task Registry */}
                  {showPostSessionRegistry && postSessionAnalytics.hasTasks && (
                    <Box sx={{ mb: 4, animation: 'fadeIn 0.5s ease-in' }}>
                      <Paper sx={{
                        p: 0,
                        bgcolor: '#1e293b',
                        borderRadius: 3,
                        border: `1px solid ${colors.primary}40`,
                        overflow: 'hidden',
                        background: `linear-gradient(145deg, #1e293b 0%, ${colors.primary}10 100%)`
                      }}>
                        <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="h6" fontWeight="700" color="#f8fafc">Detailed Violation History</Typography>
                            <Typography variant="caption" sx={{ color: colors.primary }}>Granular view of violations occurring after {formatDate(postSessionAnalytics.latestSessionDate)}</Typography>
                          </Box>
                          <Chip label={`${postSessionAnalytics.totalPostTasks} Violations`} size="small" sx={{ bgcolor: `${colors.primary}20`, color: colors.primary, fontWeight: 800 }} />
                        </Box>
                        <Box sx={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#0f172a' }}>
                              <tr>
                                <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>DATE</th>
                                <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>SLID</th>
                                <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>REASON (PRIMARY)</th>
                                <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>SUB-REASON</th>
                                <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>ROOT CAUSE</th>
                                <th style={{ padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem' }}>OWNERSHIP</th>
                                <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>RECURRENCE</th>
                                <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>SENTIMENT</th>
                                <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>ACTIONS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {postSessionAnalytics.tasks.map((task) => {
                                const reasons = splitValues(task.reason);
                                const subReasons = splitValues(task.subReason);
                                const rootCauses = splitValues(task.rootCause);
                                const owners = extractOwners(task);

                                return (
                                  <tr key={task._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: '0.2s', background: task.isRepeat ? 'rgba(239,68,68,0.03)' : 'rgba(34,197,94,0.03)' }}>
                                    <td style={{ padding: '16px', color: '#94a3b8', fontSize: '0.8rem' }}>{formatDate(task.pisDate || task.createdAt)}</td>
                                    <td style={{ padding: '16px', color: colors.primary, fontWeight: 'bold' }}>{task.slid}</td>
                                    <td style={{ padding: '16px', color: '#fff', fontSize: '0.8rem' }}>
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                                        <span>{reasons[0] || 'N/A'}</span>
                                        {task.isRepeatReason && reasons[0] && reasons[0] !== 'N/A' && (
                                          <Typography variant="caption" sx={{ color: '#f87171', fontSize: '0.6rem' }}>⚠ seen before training session</Typography>
                                        )}
                                      </Box>
                                    </td>
                                    <td style={{ padding: '16px', color: '#fff', fontSize: '0.8rem' }}>{subReasons[0] || 'N/A'}</td>
                                    <td style={{ padding: '16px', color: '#fff', fontSize: '0.8rem' }}>{rootCauses[0] || 'N/A'}</td>
                                    <td style={{ padding: '16px' }}>
                                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {owners.map((o, idx) => (
                                          <Chip key={idx} label={o} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' }} />
                                        ))}
                                      </Box>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                      <Chip
                                        label={task.isRepeat ? '🔄 Repeat' : '🆕 New'}
                                        size="small"
                                        sx={{
                                          height: 20,
                                          fontSize: '0.65rem',
                                          bgcolor: task.isRepeat ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                                          color: task.isRepeat ? '#f87171' : '#4ade80',
                                          fontWeight: 700,
                                          border: `1px solid ${task.isRepeat ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`
                                        }}
                                      />
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                      <Chip
                                        label={task.evaluationScore >= 9 ? 'Promoter' : task.evaluationScore >= 7 ? 'Neutral' : 'Detractor'}
                                        size="small"
                                        sx={{
                                          height: 20,
                                          fontSize: '0.65rem',
                                          bgcolor: task.evaluationScore >= 9 ? `${colors.success}20` : task.evaluationScore >= 7 ? `${colors.warning}20` : `${colors.error}20`,
                                          color: task.evaluationScore >= 9 ? colors.success : task.evaluationScore >= 7 ? colors.warning : colors.error,
                                          fontWeight: 700
                                        }}
                                      />
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => { setSelectedTask(task); setViewDialogOpen(true); }}
                                        sx={{
                                          fontSize: '0.65rem',
                                          py: 0.3,
                                          px: 1.2,
                                          borderRadius: '8px',
                                          borderColor: `${colors.primary}50`,
                                          color: colors.primary,
                                          textTransform: 'none',
                                          fontWeight: 700,
                                          '&:hover': { borderColor: colors.primary, bgcolor: `${colors.primary}10` }
                                        }}
                                      >
                                        View Details
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </Box>
                      </Paper>
                    </Box>
                  )}

                  {/* Technical Task Registry — appears AFTER Violation History */}
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
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {taskTimeFilterMode !== 'all' && (
                          <Chip
                            label="Filter Active"
                            size="small"
                            onDelete={() => setTaskTimeFilterMode('all')}
                            sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', color: colors.warning, fontWeight: 700 }}
                          />
                        )}
                        <Chip label={`${filteredTechnicalTasks.length} Tasks`} size="small" sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }} />
                      </Box>
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
                            <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTechnicalTasks.map((task) => (
                            <tr key={task._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: '0.2s' }}>
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
                              <td style={{ padding: '16px', textAlign: 'center', fontWeight: 'bold', color: (task.evaluationScore && (task.evaluationScore > 8 || (task.evaluationScore > 80))) ? colors.success : colors.warning }}>
                                {task.evaluationScore ? `${task.evaluationScore}${task.evaluationScore <= 10 ? '/10' : '%'}` : '-'}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => { setSelectedTask(task); setViewDialogOpen(true); }}
                                  sx={{
                                    fontSize: '0.65rem',
                                    py: 0.3,
                                    px: 1.2,
                                    borderRadius: '8px',
                                    borderColor: 'rgba(59,130,246,0.4)',
                                    color: '#60a5fa',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    '&:hover': { borderColor: '#60a5fa', bgcolor: 'rgba(59,130,246,0.08)' }
                                  }}
                                >
                                  View Details
                                </Button>
                              </td>
                            </tr>
                          ))}
                          {filteredTechnicalTasks.length === 0 && (
                            <tr>
                              <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                No tasks found matching the selected filters.
                              </td>
                            </tr>
                          )}
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


            </Box>
          </>
        )}
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

        {/* Feedback Read More Dialog */}
        <Dialog
          open={feedbackDialog.open}
          onClose={() => setFeedbackDialog({ open: false, content: '' })}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: '#1a1a1a',
              backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          }}
        >
          <DialogTitle sx={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">Customer Feedback</Typography>
            <IconButton 
              onClick={() => setFeedbackDialog({ open: false, content: '' })}
              sx={{ color: '#aaa', '&:hover': { color: '#fff' } }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Typography variant="body1" sx={{ color: '#e2e8f0', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {feedbackDialog.content}
            </Typography>
          </DialogContent>
        </Dialog>

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
                    <TableCell sx={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Sub-Reason</TableCell>
                    <TableCell sx={{ color: '#aaa', fontWeight: 'bold', fontSize: '0.75rem' }}>Root Cause</TableCell>
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
                        {Array.isArray(task.subReason) ? task.subReason.join(', ') : task.subReason || '-'}
                      </TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.8), fontSize: '0.75rem' }}>
                        {Array.isArray(task.rootCause) ? task.rootCause.join(', ') : task.rootCause || '-'}
                      </TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.8), fontSize: '0.75rem' }}>
                        {[...new Set(splitValues(task.responsible || task.assignedTo?.name))].join(', ') || '-'}
                      </TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.6), fontSize: '0.7rem', maxWidth: 200 }}>
                        {task.customerFeedback ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography noWrap sx={{ maxWidth: 120, fontSize: 'inherit' }}>{task.customerFeedback}</Typography>
                            <Button 
                              size="small" 
                              variant="outlined"
                              sx={{ minWidth: 'auto', p: '2px 6px', fontSize: '0.6rem', ml: 1, borderColor: 'rgba(59,130,246,0.3)', color: '#3b82f6' }}
                              onClick={() => setFeedbackDialog({ open: true, content: task.customerFeedback })}
                            >
                              Read more
                            </Button>
                          </Box>
                        ) : '-'}
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
      </Box>
    </>
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
