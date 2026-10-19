import { alpha } from "../theme/colorFns";
import { tok } from "../theme/tokens";
import { useState, useEffect, useMemo, useCallback } from "react";

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
  Warning, Warning as WarningIcon, CheckCircle, Schedule, Info, PriorityHigh, Assessment, Assessment as AssessmentIcon, Timeline,
  Leaderboard as LeaderboardIcon, Close as CloseIcon, TrendingUp, TrendingDown,
  TrendingFlat, PieChart as PieChartIcon, CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon, PictureAsPdf as PictureAsPdfIcon, TableChart as TableChartIcon,
  Search as SearchIcon, FilterList as FilterListIcon, CalendarToday as CalendarTodayIcon,
  Event as EventIcon, Update as UpdateIcon, Visibility as VisibilityIcon, Delete as DeleteIcon, VerifiedUser,
  Edit as EditIcon, School as SchoolIcon, Psychology as PsychologyIcon,
  LocationOn,
  Shield,
  AutoStories,
  FactCheck,
  BugReport,
  Lightbulb,
  Gavel,
  ThumbUp
} from '@mui/icons-material';
import moment from "moment";
import { subDays, isAfter, format } from 'date-fns';
import LabAssessmentDetailModal from "../components/LabAssessmentDetailModal";
import {
  exportIndividualLabAssessmentReport,
  exportMasterLabAssessmentReport
} from "../utils/labAssessmentExcelExport";
import { formatExperienceDuration, CERTIFICATE_DEFINITIONS } from "./LabAssessment";

const getLabTierStatus = (score) => {
  const s = Number(score) || 0;
  if (s >= 90) return { label: 'Excellent', status: 'Pass', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981', isPass: true, tier: '90-100' };
  if (s >= 80) return { label: 'V.Good', status: 'Pass', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)', borderColor: '#14b8a6', isPass: true, tier: '80-89' };
  if (s >= 70) return { label: 'Need improvements, and close monitoring', status: 'Pass', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', borderColor: '#f59e0b', isPass: true, tier: '70-79' };
  if (s >= 50) return { label: 'Suspension, need training, then re-evaluate the team', status: 'Fail', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', borderColor: '#f97316', isPass: false, tier: '50-69' };
  return { label: 'Ineligible', status: 'Fail', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444', isPass: false, tier: '0-49' };
};

const normalizeText = (value) => {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(' ').toLowerCase().trim();
  return String(value).toLowerCase().trim();
};

const safeFormatDate = (val) => {
  if (!val) return '-';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '-';
    return format(d, 'yyyy-MM-dd');
  } catch (e) {
    return '-';
  }
};

const isIssueForTeam = (issue, team) => {
  if (!team || !issue) return false;
  const tId = team._id ? team._id.toString() : '';
  const tName = normalizeText(team.teamName);
  const tCode = normalizeText(team.teamCode);

  const issueFieldTeam = issue.fieldTeam ? (issue.fieldTeam._id || issue.fieldTeam).toString() : '';
  if (tId && issueFieldTeam && issueFieldTeam === tId) return true;

  const issueTeam = normalizeText(issue.teamName);
  const installing = normalizeText(issue.installingTeam);
  const issueCode = normalizeText(issue.teamCode);

  // If explicit team name or installing team is given, it MUST match the team name
  if (tName && (issueTeam === tName || installing === tName)) return true;

  // Only fallback to teamCode if no explicit team name was specified in the issue
  if (!issueTeam && !installing && tCode && issueCode && issueCode === tCode) return true;

  return false;
};

const isTaskForTeam = (task, team) => {
  if (!team || !task) return false;
  const tId = team._id ? team._id.toString() : '';
  const tName = normalizeText(team.teamName);
  const taskTeamId = task.teamId?._id?.toString() || task.teamId?.toString() || (task.fieldTeam?._id || task.fieldTeam)?.toString();
  const taskTeamName = normalizeText(task.teamName);
  return (tId && taskTeamId === tId) || (tName && taskTeamName === tName);
};

const isTeamAccountable = (task) => Array.isArray(task?.teamAccountability) ? task?.teamAccountability.includes("Yes") : task?.teamAccountability === "Yes";

const fieldContainsReach = (field) => {
  if (Array.isArray(field)) {
    return field.some(item => typeof item === 'string' && item.toLowerCase().includes('reach'));
  }
  return typeof field === 'string' && field.toLowerCase().includes('reach');
};

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
  
  if (!ws['!cols']) ws['!cols'] = [];
  
  // Style definitions
  const weeklyStyle = { fill: { fgColor: { rgb: "E3F2FD" } } }; // Very Light Blue
  const monthlyStyle = { fill: { fgColor: { rgb: "F1F8E9" } } }; // Very Light Green
  const postStyle = { fill: { fgColor: { rgb: "F3E5F5" } } };    // Very Light Purple
  const snapshotLabelStyle = { fill: { fgColor: { rgb: "F5F5F5" } }, font: { italic: true } };
  const headerBaseStyle = { 
    font: { bold: true, color: { rgb: "FFFFFF" } }, 
    fill: { fgColor: { rgb: "475569" } }, // Slate-600
    alignment: { horizontal: "center", vertical: "center" }
  };

  for (let C = range.s.c; C <= range.e.c; ++C) {
    const colName = headers[C];
    let bodyStyle = null;
    const isFeedbackCol = colName === 'Customer Feedback' || colName === 'Customer Feedback / Comment' || colName === 'Q1-Verbatim' || colName === 'reporterNote';
    const isLongTextCol = colName === 'QOps Transaction History' || colName === 'GAIA Content' || colName === 'Latest QOps Note' || colName === 'Action taken by assigned user';
    
    if (isFeedbackCol) {
      if (!ws['!cols'][C] || (ws['!cols'][C].wch || 0) < 60) {
        ws['!cols'][C] = { wch: 60 };
      }
    } else if (isLongTextCol) {
      if (!ws['!cols'][C] || (ws['!cols'][C].wch || 0) < 40) {
        ws['!cols'][C] = { wch: 40 };
      }
    }

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
      } else {
        const existingStyle = ws[cellRef].s || {};

        if (isFeedbackCol) {
          ws[cellRef].s = {
            ...existingStyle,
            ...(bodyStyle || {}),
            alignment: {
              horizontal: 'right',
              vertical: 'center',
              wrapText: true,
              readingOrder: 2
            }
          };
        } else if (isLongTextCol) {
          ws[cellRef].s = {
            ...existingStyle,
            ...(bodyStyle || {}),
            alignment: {
              horizontal: 'left',
              vertical: 'center',
              wrapText: true
            }
          };
        } else if (bodyStyle) {
          // Body styling for snapshot columns
          ws[cellRef].s = {
            ...existingStyle,
            ...bodyStyle
          };
        }
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
import { FaCheckCircle, FaExclamationCircle, FaClipboardList, FaChartLine, FaFilter, FaSearch, FaTimes, FaCalendarAlt, FaUserTie, FaFileExcel, FaFileExport, FaEnvelope, FaRegSmile, FaEquals, FaGavel } from 'react-icons/fa';
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
          <Typography variant="subtitle2" color={tok('--text-secondary')} fontWeight="600" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="800" color={tok('--text')}>
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
      <Typography variant="caption" color={tok('--text-muted')}>
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
    '&::-webkit-scrollbar-thumb': { bgcolor: tok('--overlay-subtle'), borderRadius: '4px' }
  }}>
    <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' } }}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Category Item</TableCell>
          <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Count</TableCell>
          <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>%</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((row, i) => (
          <TableRow key={i} sx={{ '&:hover': { bgcolor: tok('--overlay-subtle') } }}>
            <TableCell sx={{ color: tok('--text-secondary') }}>{row.name}</TableCell>
            <TableCell align="right" sx={{ color: tok('--text-secondary'), fontWeight: 'bold' }}>{row.value}</TableCell>
            <TableCell align="right" sx={{ color: tok('--text-secondary') }}>{((row.value / total) * 100).toFixed(1)}%</TableCell>
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
    if (!results || results.length === 0) return 0;
    const totalScore = results.reduce((sum, result) => {
      const val = result.totalScore !== undefined ? result.totalScore : (result.overallScore !== undefined ? result.overallScore : (result.percentage !== undefined ? result.percentage : 0));
      return sum + Number(val || 0);
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
  const [selectedQuizDetail, setSelectedQuizDetail] = useState(null);
  const [quizDetailOpen, setQuizDetailOpen] = useState(false);
  const [editQuizDialogOpen, setEditQuizDialogOpen] = useState(false);
  const [quizToEdit, setQuizToEdit] = useState(null);
  const [editingQuizScore, setEditingQuizScore] = useState('');
  const [editingQuizCorrect, setEditingQuizCorrect] = useState('');
  const [editingQuizTotal, setEditingQuizTotal] = useState('');
  const [editingQuizRemarks, setEditingQuizRemarks] = useState('');
  const [savingQuizEdit, setSavingQuizEdit] = useState(false);
  const [deleteQuizDialogOpen, setDeleteQuizDialogOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [deletingQuiz, setDeletingQuiz] = useState(false);

  const handleOpenEditQuiz = (quiz) => {
    setQuizToEdit(quiz);
    setEditingQuizScore(quiz.percentage !== undefined ? quiz.percentage : quiz.score || '');
    setEditingQuizCorrect(quiz.correctAnswers !== undefined ? quiz.correctAnswers : '');
    setEditingQuizTotal(quiz.totalQuestions !== undefined ? quiz.totalQuestions : '');
    setEditingQuizRemarks(quiz.remarks || quiz.feedback || '');
    setEditQuizDialogOpen(true);
  };

  const handleSaveQuizEdit = async () => {
    if (!quizToEdit?._id) return;
    setSavingQuizEdit(true);
    try {
      const scoreNum = Number(editingQuizScore) || 0;
      const correctNum = Number(editingQuizCorrect) || 0;
      const totalNum = Number(editingQuizTotal) || 0;
      const payload = {
        percentage: scoreNum,
        score: `${scoreNum}%`,
        correctAnswers: correctNum,
        totalQuestions: totalNum,
        remarks: editingQuizRemarks
      };
      await api.put(`/quiz-results/${quizToEdit._id}`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      toast.success("Online exam result updated successfully");
      setQuizResults(prev => prev.map(q => q._id === quizToEdit._id ? { ...q, ...payload } : q));
      setAllQuizResultsGlobal(prev => prev.map(q => q._id === quizToEdit._id ? { ...q, ...payload } : q));
      setEditQuizDialogOpen(false);
      setQuizToEdit(null);
    } catch (error) {
      console.error("Failed to update quiz result:", error);
      toast.error("Failed to update exam result");
    } finally {
      setSavingQuizEdit(false);
    }
  };

  const confirmDeleteQuiz = async () => {
    if (!quizToDelete?._id) return;
    setDeletingQuiz(true);
    try {
      await api.delete(`/quiz-results/${quizToDelete._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      toast.success("Online exam result permanently deleted");
      setQuizResults(prev => prev.filter(q => q._id !== quizToDelete._id));
      setAllQuizResultsGlobal(prev => prev.filter(q => q._id !== quizToDelete._id));
      setDeleteQuizDialogOpen(false);
      setQuizToDelete(null);
    } catch (error) {
      console.error("Failed to delete quiz result:", error);
      toast.error("Failed to delete exam result");
    } finally {
      setDeletingQuiz(false);
    }
  };

  // On-the-job assessments state
  const [jobAssessments, setJobAssessments] = useState([]);
  const [jobPage, setJobPage] = useState(0);
  const [jobRowsPerPage, setJobRowsPerPage] = useState(10);
  const [selectedJobDetail, setSelectedJobDetail] = useState(null);
  const [jobDetailOpen, setJobDetailOpen] = useState(false);
  const [deleteJobDialogOpen, setDeleteJobDialogOpen] = useState(false);
  const [jobAssessmentToDelete, setJobAssessmentToDelete] = useState(null);
  const [deletingJob, setDeletingJob] = useState(false);

  const confirmDeleteJobAssessment = async () => {
    if (!jobAssessmentToDelete?._id) return;
    setDeletingJob(true);
    try {
      await api.delete(`/on-the-job-assessments/${jobAssessmentToDelete._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      toast.success("OTJ Assessment permanently deleted");
      setJobAssessments((prev) => prev.filter((a) => a._id !== jobAssessmentToDelete._id));
      setAllJobAssessmentsGlobal((prev) => prev.filter((a) => a._id !== jobAssessmentToDelete._id));
      setDeleteJobDialogOpen(false);
      setJobAssessmentToDelete(null);
    } catch (error) {
      console.error("Failed to delete OTJ assessment:", error);
      toast.error("Failed to delete assessment");
    } finally {
      setDeletingJob(false);
    }
  };

  // Lab assessments state
  const [labAssessments, setLabAssessments] = useState([]);
  const [labPage, setLabPage] = useState(0);
  const [labRowsPerPage, setLabRowsPerPage] = useState(10);
  const [selectedLabDetail, setSelectedLabDetail] = useState(null);
  const [labDetailOpen, setLabDetailOpen] = useState(false);
  const [deleteLabDialogOpen, setDeleteLabDialogOpen] = useState(false);
  const [labAssessmentToDelete, setLabAssessmentToDelete] = useState(null);
  const [deletingLab, setDeletingLab] = useState(false);

  const confirmDeleteLabAssessment = async () => {
    if (!labAssessmentToDelete?._id) return;
    setDeletingLab(true);
    try {
      await api.delete(`/lab-assessments/${labAssessmentToDelete._id}`);
      toast.success("Practical Lab Assessment permanently deleted");
      setLabAssessments((prev) => prev.filter((a) => a._id !== labAssessmentToDelete._id));
      setAllLabAssessmentsGlobal((prev) => prev.filter((a) => a._id !== labAssessmentToDelete._id));
      setDeleteLabDialogOpen(false);
      setLabAssessmentToDelete(null);
    } catch (error) {
      console.error("Failed to delete lab assessment:", error);
      toast.error("Failed to delete assessment");
    } finally {
      setDeletingLab(false);
    }
  };

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
  const [allQuizResultsGlobal, setAllQuizResultsGlobal] = useState([]);
  const [allJobAssessmentsGlobal, setAllJobAssessmentsGlobal] = useState([]);
  const [allLabAssessmentsGlobal, setAllLabAssessmentsGlobal] = useState([]);

  // Teams Quality KPI Matrix Controls & Filter State
  const [matrixDateFilterMode, setMatrixDateFilterMode] = useState('all'); // 'all', 'this_month', 'last_month', 'this_quarter', 'this_year', 'custom'
  const [matrixCustomStartDate, setMatrixCustomStartDate] = useState('');
  const [matrixCustomEndDate, setMatrixCustomEndDate] = useState('');
  const [matrixSearchQuery, setMatrixSearchQuery] = useState('');
  const [matrixCompanyFilter, setMatrixCompanyFilter] = useState('all');
  const [matrixStatusFilter, setMatrixStatusFilter] = useState('active'); // 'active', 'all', 'terminated', 'resigned', 'suspended', 'on_leave'
  const [matrixPage, setMatrixPage] = useState(0);
  const [matrixRowsPerPage, setMatrixRowsPerPage] = useState(15);
  const [matrixSort, setMatrixSort] = useState({ field: 'accountableCount', direction: 'desc' });

  // NEW: State for Global Analytics Tab
  const [globalTab, setGlobalTab] = useState(0);
  const [analyticsSubTab, setAnalyticsSubTab] = useState(0); // 0: All, 1: Detractors, 2: Neutrals
  const [samplesTokenData, setSamplesTokenData] = useState([]);
  const [teamSamplesTokens, setTeamSamplesTokens] = useState([]);
  const [activeTeamsOnly, setActiveTeamsOnly] = useState(true);

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
    const fetchTeamSamples = async () => {
      try {
        const response = await api.get(`/samples-token/team-samples/${new Date().getFullYear()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        setTeamSamplesTokens(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Error fetching team samples token:", err);
      }
    };
    fetchSamplesToken();
    fetchTeamSamples();
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
    background: tok('--bg'), // Deep dark background
    surface: 'rgba(30, 30, 30, 0.6)', // Glassy surface
    surfaceElevated: 'rgba(255, 255, 255, 0.05)', // Lighter glass
    border: tok('--border'),
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
      sentiment: { Promoter: 0, Neutral: 0, Detractor: 0, NotEvaluated: 0 },
      accountableSentiment: { Promoter: 0, Neutral: 0, Detractor: 0, NotEvaluated: 0 },
      nonAccountableSentiment: { Promoter: 0, Neutral: 0, Detractor: 0, NotEvaluated: 0 }
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
      const isAcc = isTeamAccountable(task);

      if (score && score > 0) {
        if (score <= 6) {
          stats.sentiment.Detractor++;
          if (isAcc) stats.accountableSentiment.Detractor++;
          else stats.nonAccountableSentiment.Detractor++;
        } else if (score >= 7 && score <= 8) {
          stats.sentiment.Neutral++;
          if (isAcc) stats.accountableSentiment.Neutral++;
          else stats.nonAccountableSentiment.Neutral++;
        } else if (score >= 9) {
          stats.sentiment.Promoter++;
          if (isAcc) stats.accountableSentiment.Promoter++;
          else stats.nonAccountableSentiment.Promoter++;
        } else {
          stats.sentiment.NotEvaluated++;
        }
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

    const accCount = tasksToProcess.filter(t => isTeamAccountable(t)).length;
    const nonAccCount = tasksToProcess.filter(t => !isTeamAccountable(t)).length;

    return {
      totalProcessed: tasksToProcess.length,
      accountableCount: accCount,
      nonAccountableCount: nonAccCount,
      accountableSentiment: stats.accountableSentiment,
      nonAccountableSentiment: stats.nonAccountableSentiment,
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
      accountableSentimentData: [
        { name: 'Detractors', value: stats.accountableSentiment.Detractor, color: '#ef4444', percentage: accCount > 0 ? ((stats.accountableSentiment.Detractor / accCount) * 100).toFixed(1) : 0 },
        { name: 'Neutrals', value: stats.accountableSentiment.Neutral, color: '#f59e0b', percentage: accCount > 0 ? ((stats.accountableSentiment.Neutral / accCount) * 100).toFixed(1) : 0 },
        { name: 'Promoters', value: stats.accountableSentiment.Promoter, color: '#10b981', percentage: accCount > 0 ? ((stats.accountableSentiment.Promoter / accCount) * 100).toFixed(1) : 0 }
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
      // 1. Strict Team filter: Only include issues belonging to the selected team
      if (selectedTeam && !isIssueForTeam(issue, selectedTeam)) return false;

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
    const rawScore = item.evaluationScore !== undefined && item.evaluationScore !== null ? item.evaluationScore : (item.score !== undefined ? item.score : null);
    let numScore = Number(rawScore || 0);
    if (rawScore !== null && rawScore !== '' && !isNaN(numScore) && numScore > 0) {
      displayScore = numScore; // Just show clean number: 1, 6, 8, 10
      const normalized = numScore <= 10 ? numScore * 10 : numScore;
      if (normalized <= 60) satisfaction = 'Detractor';
      else if (normalized <= 80) satisfaction = 'Neutral';
      else satisfaction = 'Promoter';
    }

    const isReachOwner = fieldContainsReach(item.responsible);
    const isAccYes = isTeamAccountable(item);
    const confirmedTeamAcc = (isReachOwner && isAccYes) ? 'Yes' : 'No';

    const baseRow = {
      'Type': type === 'task' ? 'NPS Ticket' : 'Customer Issue',
      'SLID': item.slid,
      'Customer': item.customerName || 'N/A',
      'Status': item.validationStatus || (item.solved === 'yes' ? 'Solved' : 'Open'),

      'Governorate': item.governorate || '-',
      'District': item.district || '-',

      'Score': displayScore,
      'Satisfaction': satisfaction,
      'Team Accountability': isAccYes ? 'Yes' : 'No',
      'Owner REACH': isReachOwner ? 'Yes' : 'No',
      'Confirmed Team Accountable (REACH + Yes)': confirmedTeamAcc,
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

  const exportPremiumTeamQualityReport = (teamToExport) => {
    const team = teamToExport || selectedTeam;
    if (!team) return;

    const wb = XLSX.utils.book_new();

    const tName = normalizeText(team.teamName);
    const tCode = normalizeText(team.teamCode);
    const tId = team._id?.toString();

    // 1. Gather all tasks for this team
    const teamTasks = (Array.isArray(allTechnicalTasksGlobal) ? allTechnicalTasksGlobal : []).filter(task => isTaskForTeam(task, team));

    // 2. Gather all snags / customer issues for this team
    const teamIssues = (Array.isArray(allCustomerIssuesGlobal) ? allCustomerIssuesGlobal : []).filter(issue => isIssueForTeam(issue, team));

    // 3. Gather all training sessions for this team
    const teamSessions = [];
    if (Array.isArray(team.sessionHistory)) {
      team.sessionHistory.forEach(s => {
        if (s && s.sessionDate) {
          teamSessions.push({
            sessionDate: s.sessionDate,
            sessionTitle: s.sessionTitle || 'Quality Coaching & Development',
            sessionType: s.sessionType || 'Remedial / Coaching',
            conductedBy: typeof s.conductedBy === 'object' ? (s.conductedBy.name || 'Quality Team') : (s.conductedBy || 'Quality Team'),
            location: s.location || 'HQ / Field',
            duration: s.duration || '-',
            outlines: Array.isArray(s.outlines) ? s.outlines.join(', ') : (s.outlines || '-'),
            status: s.status || 'Completed',
            notes: s.notes || ''
          });
        }
      });
    }
    (Array.isArray(allTrainingSessionsGlobal) ? allTrainingSessionsGlobal : []).forEach(sess => {
      const isParticipant = (sess.participants || []).some(p => {
        const pName = normalizeText(p.teamName || p.name || p);
        const pId = (p._id || p.teamId)?.toString();
        return (tId && pId === tId) || (tName && pName === tName);
      });
      if (isParticipant && !teamSessions.some(s => new Date(s.sessionDate).getTime() === new Date(sess.sessionDate).getTime())) {
        teamSessions.push({
          sessionDate: sess.sessionDate,
          sessionTitle: sess.sessionTitle || 'Field Quality Standards',
          sessionType: sess.sessionType || 'Workshop / Field',
          conductedBy: sess.trainer || sess.conductedBy || 'Quality Team',
          location: sess.location || 'Training Center',
          duration: sess.duration || '-',
          outlines: Array.isArray(sess.outlines) ? sess.outlines.join(', ') : (sess.outlines || '-'),
          status: sess.status || 'Completed',
          notes: sess.notes || ''
        });
      }
    });
    teamSessions.sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));

    // 4. Monthly Samples Token for this team
    const monthlyTokens = {};
    for (let m = 1; m <= 12; m++) monthlyTokens[m] = 0;
    (teamSamplesTokens || []).forEach(st => {
      const matchName = normalizeText(st.teamName) === tName;
      const matchId = st.teamId && st.teamId.toString() === tId;
      if (matchName || matchId) {
        monthlyTokens[st.month] = (monthlyTokens[st.month] || 0) + (Number(st.sampleSize) || 0);
      }
    });
    const totalTeamSamplesToken = Object.values(monthlyTokens).reduce((a, b) => a + b, 0);

    // Helpers
    const PALETTE = {
      navyDark: "0F172A",
      slateDark: "1E293B",
      slateMedium: "334155",
      slateLight: "475569",
      slateMuted: "64748B",
      blueHeader: "1E40AF",
      blueSub: "3B82F6",
      blueBg: "EFF6FF",
      emeraldHeader: "065F46",
      emeraldBg: "ECFDF5",
      emeraldText: "047857",
      amberHeader: "92400E",
      amberBg: "FFFBEB",
      amberText: "B45309",
      roseHeader: "9F1239",
      roseBg: "FFF1F2",
      roseText: "BE123C",
      purpleHeader: "581C87",
      purpleBg: "FAF5FF",
      zebraBg: "F8FAFC",
      borderLight: "CBD5E1",
      white: "FFFFFF"
    };

    const borderThin = {
      top: { style: "thin", color: { rgb: PALETTE.borderLight } },
      bottom: { style: "thin", color: { rgb: PALETTE.borderLight } },
      left: { style: "thin", color: { rgb: PALETTE.borderLight } },
      right: { style: "thin", color: { rgb: PALETTE.borderLight } }
    };

    const borderHeader = {
      top: { style: "medium", color: { rgb: PALETTE.slateDark } },
      bottom: { style: "medium", color: { rgb: PALETTE.slateDark } },
      left: { style: "thin", color: { rgb: PALETTE.slateMedium } },
      right: { style: "thin", color: { rgb: PALETTE.slateMedium } }
    };

    const borderSummary = {
      top: { style: "medium", color: { rgb: PALETTE.navyDark } },
      bottom: { style: "double", color: { rgb: PALETTE.navyDark } },
      left: { style: "thin", color: { rgb: PALETTE.slateMedium } },
      right: { style: "thin", color: { rgb: PALETTE.slateMedium } }
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

    // Calculate aggregated team metrics
    let totalDetractors = 0;
    let totalNeutrals = 0;
    let totalPromoters = 0;
    let totalIssuesIdentified = 0;
    let totalReachTasks = 0;
    let totalReachAccYes = 0;
    let totalReachAccNo = 0;

    teamTasks.forEach(task => {
      const score = task.evaluationScore || 0;
      const normalized = score <= 10 ? score * 10 : score;
      if (normalized > 0) {
        if (normalized <= 60) totalDetractors++;
        else if (normalized <= 80) totalNeutrals++;
        else totalPromoters++;
      }

      const reasons = splitValues(task.reason).filter(r => r && r !== 'Not specified');
      const subReasons = splitValues(task.subReason).filter(r => r && r !== 'Not specified');
      const rootCauses = splitValues(task.rootCauses || task.rootCause).filter(r => r && r !== 'Not specified');
      const issueCount = Math.max(reasons.length, subReasons.length, rootCauses.length, 1);
      totalIssuesIdentified += issueCount;

      const isReach = fieldContainsReach(task.responsible);
      if (isReach) {
        totalReachTasks++;
        if (isTeamAccountable(task)) totalReachAccYes++;
        else totalReachAccNo++;
      }
    });

    const nonAccountableCount = teamTasks.filter(t => !isTeamAccountable(t)).length;
    const accountableCount = teamTasks.filter(t => isTeamAccountable(t)).length;
    const adjustedNetTokens = Math.max(0, totalTeamSamplesToken - nonAccountableCount);
    const calculatedPromoters = Math.max(0, adjustedNetTokens - accountableCount);
    
    let accDetractors = 0;
    let accNeutrals = 0;
    teamTasks.filter(t => isTeamAccountable(t)).forEach(t => {
      const s = t.evaluationScore || 0;
      const n = s <= 10 ? s * 10 : s;
      if (n > 0) {
        if (n <= 60) accDetractors++;
        else if (n <= 80) accNeutrals++;
      }
    });

    const netPromoterShare = adjustedNetTokens > 0 ? `${((calculatedPromoters / adjustedNetTokens) * 100).toFixed(1)}%` : '0.0%';
    const netAccFailureRate = adjustedNetTokens > 0 ? `${((accountableCount / adjustedNetTokens) * 100).toFixed(1)}%` : '0.0%';
    const netDetractorRate = adjustedNetTokens > 0 ? `${((accDetractors / adjustedNetTokens) * 100).toFixed(1)}%` : '0.0%';
    const netNeutralRate = adjustedNetTokens > 0 ? `${((accNeutrals / adjustedNetTokens) * 100).toFixed(1)}%` : '0.0%';
    const netTeamNps = adjustedNetTokens > 0 ? (((calculatedPromoters - accDetractors) / adjustedNetTokens) * 100).toFixed(1) : '0.0';

    const closedSnags = teamIssues.filter(i => i.solved === 'yes').length;
    const snagResolutionRate = teamIssues.length > 0 ? ((closedSnags / teamIssues.length) * 100).toFixed(1) : '0.0';

    // ─────────────────────────────────────────────────────────────────────────
    // SHEET 1: Executive Summary & Profile
    // ─────────────────────────────────────────────────────────────────────────
    const wsProfile = XLSX.utils.aoa_to_sheet([[]]);
    wsProfile['!merges'] = [];

    // Title banner
    wsProfile['A1'] = {
      v: `FIELD TEAM QUALITY & PERFORMANCE INTELLIGENCE REPORT - ${team.teamName.toUpperCase()}`,
      t: 's',
      s: {
        font: { bold: true, sz: 14, color: { rgb: PALETTE.white } },
        fill: { fgColor: { rgb: PALETTE.navyDark } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    };
    wsProfile['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });

    // Section 1: Team Profile Info
    wsProfile['A3'] = {
      v: 'TEAM PROFILE & OPERATIONAL METADATA',
      t: 's',
      s: { font: { bold: true, sz: 11, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.blueHeader } }, alignment: { horizontal: 'left' } }
    };
    wsProfile['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 7 } });

    const profileRows = [
      ['Team Name', team.teamName || 'N/A', 'Operational Status', getTeamStatusLabel(team)],
      ['Team Code', team.teamCode || 'N/A', 'Contact Phone', team.contactNumber || 'N/A'],
      ['Contractor / Company', team.teamCompany || 'N/A', 'Report Date', format(new Date(), 'yyyy-MM-dd HH:mm')],
      ['FSM Serial Number', team.fsmSerialNumber || 'N/A', 'Total Attended Sessions', teamSessions.length],
      ['Laptop Serial Number', team.laptopSerialNumber || 'N/A', 'Quiz / Exam Code', team.quizCode || 'N/A']
    ];

    profileRows.forEach((row, rIdx) => {
      const rNum = 3 + rIdx;
      wsProfile[XLSX.utils.encode_cell({ r: rNum, c: 0 })] = { v: row[0], t: 's', s: { font: { bold: true, color: { rgb: PALETTE.slateLight } }, fill: { fgColor: { rgb: PALETTE.zebraBg } }, border: borderThin } };
      wsProfile[XLSX.utils.encode_cell({ r: rNum, c: 1 })] = { v: row[1], t: 's', s: { font: { bold: true }, border: borderThin } };
      wsProfile['!merges'].push({ s: { r: rNum, c: 1 }, e: { r: rNum, c: 2 } });
      wsProfile[XLSX.utils.encode_cell({ r: rNum, c: 3 })] = { v: row[2], t: 's', s: { font: { bold: true, color: { rgb: PALETTE.slateLight } }, fill: { fgColor: { rgb: PALETTE.zebraBg } }, border: borderThin } };
      wsProfile[XLSX.utils.encode_cell({ r: rNum, c: 4 })] = { v: row[3], t: 's', s: { font: { bold: true }, border: borderThin } };
      wsProfile['!merges'].push({ s: { r: rNum, c: 4 }, e: { r: rNum, c: 7 } });
    });

    // Section 2: Key Performance Indicators Table
    const kpiStartR = 9;
    wsProfile[`A${kpiStartR + 1}`] = {
      v: 'EXECUTIVE QUALITY PERFORMANCE BENCHMARK KPIS',
      t: 's',
      s: { font: { bold: true, sz: 11, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.emeraldHeader } }, alignment: { horizontal: 'left' } }
    };
    wsProfile['!merges'].push({ s: { r: kpiStartR, c: 0 }, e: { r: kpiStartR, c: 7 } });

    const kpiHeaders = ['KPI Dimension', 'Value', 'Benchmark Target', 'Performance Interpretation', 'Status'];
    kpiHeaders.forEach((h, i) => {
      const cIdx = i === 0 ? 0 : i === 1 ? 2 : i === 2 ? 3 : i === 3 ? 4 : 6;
      const endC = i === 0 ? 1 : i === 3 ? 5 : i === 4 ? 7 : cIdx;
      const cell = XLSX.utils.encode_cell({ r: kpiStartR + 1, c: cIdx });
      wsProfile[cell] = { v: h, t: 's', s: { font: { bold: true, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.slateDark } }, alignment: { horizontal: 'center' }, border: borderThin } };
      if (endC > cIdx) wsProfile['!merges'].push({ s: { r: kpiStartR + 1, c: cIdx }, e: { r: kpiStartR + 1, c: endC } });
    });

    const kpiItems = [
      ['Original Samples Token (Quota)', totalTeamSamplesToken, '100% Target', 'Total assigned quality audit sampling quota', totalTeamSamplesToken > 0 ? 'Assigned' : 'Unassigned'],
      ['Non-Accountable Tasks (No)', nonAccountableCount, '0 Non-Acc', 'Excluded from team base / attributed to other owners', 'Excluded'],
      ['Adjusted Net Samples Token', adjustedNetTokens, 'Net Quota', `Original (${totalTeamSamplesToken}) - Non-Accountable (${nonAccountableCount})`, adjustedNetTokens > 0 ? 'Established' : 'N/A'],
      ['Accountable Tasks (Yes)', accountableCount, '0 Defects', `${netAccFailureRate} failure rate on net tokens (${accDetractors} Det / ${accNeutrals} Neu)`, accountableCount === 0 ? 'Zero Defects' : 'Remediation Req.'],
      ['Team Promoters (Calculated)', calculatedPromoters, '≥ 85.0%', `${netPromoterShare} share on net tokens (${adjustedNetTokens} - ${accountableCount})`, Number(netPromoterShare.replace('%', '')) >= 85 ? 'Target Met' : 'Developing'],
      ['Accountable Detractors (Score ≤ 6)', accDetractors, '0 Detractors', `${netDetractorRate} of net tokens (${accountableCount > 0 ? ((accDetractors / accountableCount) * 100).toFixed(1) : 0}% of accountable)`, accDetractors === 0 ? 'Optimal' : 'Needs Focus'],
      ['Accountable Neutrals (Score 7-8)', accNeutrals, '0 Neutrals', `${netNeutralRate} of net tokens (${accountableCount > 0 ? ((accNeutrals / accountableCount) * 100).toFixed(1) : 0}% of accountable)`, accNeutrals === 0 ? 'Optimal' : 'Moderate'],
      ['Adjusted Team Net Promoter Score (NPS)', `${netTeamNps}`, '≥ +50.0', 'Calculated as % Promoters minus % Detractors on Net Tokens', Number(netTeamNps) >= 50 ? 'High' : Number(netTeamNps) >= 0 ? 'Average' : 'Critical'],
      ['Total Quality Issues Identified', totalIssuesIdentified, '0 Issues', 'Distinct installation and operational snags identified', totalIssuesIdentified === 0 ? 'Zero Defects' : 'Identified'],
      ['Customer Snags & Complaints', teamIssues.length, '0 Snags', `${closedSnags} closed (${snagResolutionRate}% resolution rate)`, teamIssues.length === 0 ? 'Clean' : 'Tracked'],
      ['Online Exam Assessment Average', `${Math.round(calculateAverageScore(quizResults))}%`, '≥ 85.0%', 'Theoretical quiz and online exam proficiency', Math.round(calculateAverageScore(quizResults)) >= 85 ? 'Passed' : 'Training Needed'],
      ['OTJ Assessment Average', `${Math.round(calculateAverageScore(jobAssessments))}%`, '≥ 85.0%', 'On-the-job procedural and field installation audits', Math.round(calculateAverageScore(jobAssessments)) >= 85 ? 'Excellent' : 'Coaching Needed'],
      ['Lab Technical Assessment Average', `${Math.round(calculateAverageScore(labAssessments))}%`, '≥ 90.0%', 'ONT configuration, fiber splicing, and lab tests', Math.round(calculateAverageScore(labAssessments)) >= 90 ? 'Certified' : 'Review Needed']
    ];

    kpiItems.forEach((row, idx) => {
      const rNum = kpiStartR + 2 + idx;
      const isZebra = idx % 2 === 1;
      const rowBg = isZebra ? PALETTE.zebraBg : PALETTE.white;

      wsProfile[XLSX.utils.encode_cell({ r: rNum, c: 0 })] = { v: row[0], t: 's', s: { font: { bold: true, color: { rgb: PALETTE.slateMedium } }, fill: { fgColor: { rgb: rowBg } }, border: borderThin } };
      wsProfile['!merges'].push({ s: { r: rNum, c: 0 }, e: { r: rNum, c: 1 } });
      wsProfile[XLSX.utils.encode_cell({ r: rNum, c: 2 })] = { v: row[1], t: typeof row[1] === 'number' ? 'n' : 's', s: { font: { bold: true }, alignment: { horizontal: 'center' }, fill: { fgColor: { rgb: rowBg } }, border: borderThin } };
      wsProfile[XLSX.utils.encode_cell({ r: rNum, c: 3 })] = { v: row[2], t: 's', s: { font: { italic: true, color: { rgb: PALETTE.slateMuted } }, alignment: { horizontal: 'center' }, fill: { fgColor: { rgb: rowBg } }, border: borderThin } };
      wsProfile[XLSX.utils.encode_cell({ r: rNum, c: 4 })] = { v: row[3], t: 's', s: { fill: { fgColor: { rgb: rowBg } }, border: borderThin } };
      wsProfile['!merges'].push({ s: { r: rNum, c: 4 }, e: { r: rNum, c: 5 } });
      wsProfile[XLSX.utils.encode_cell({ r: rNum, c: 6 })] = { v: row[4], t: 's', s: { font: { bold: true, color: { rgb: PALETTE.blueHeader } }, alignment: { horizontal: 'center' }, fill: { fgColor: { rgb: rowBg } }, border: borderThin } };
      wsProfile['!merges'].push({ s: { r: rNum, c: 6 }, e: { r: rNum, c: 7 } });
    });

    wsProfile['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 32 }, { wch: 10 }, { wch: 16 }, { wch: 12 }];
    fixSheetRange(wsProfile);
    XLSX.utils.book_append_sheet(wb, wsProfile, "Executive Summary & KPIs");

    // ─────────────────────────────────────────────────────────────────────────
    // SHEET 2: Monthly Team Performance Breakdown
    // ─────────────────────────────────────────────────────────────────────────
    const wsMonthly = XLSX.utils.aoa_to_sheet([[]]);
    wsMonthly['!merges'] = [];

    wsMonthly['A1'] = {
      v: `MONTHLY PERFORMANCE, SAMPLE FULFILLMENT & NPS TRENDS (PIS DATE) - ${team.teamName.toUpperCase()}`,
      t: 's',
      s: {
        font: { bold: true, sz: 13, color: { rgb: PALETTE.white } },
        fill: { fgColor: { rgb: PALETTE.navyDark } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    };
    wsMonthly['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 17 } });

    const monthHeaders = [
      'Month',
      'Original Tokens (Quota)',
      'Non-Accountable Tasks (No)',
      'Adjusted Net Tokens',
      'Accountable Tasks (Yes)',
      'Acc. Failure Rate (%)',
      'Acc. Detractors (≤6)',
      'Acc. Detractor % (Net)',
      'Acc. Neutrals (7-8)',
      'Acc. Neutral % (Net)',
      'Team Promoters (Calc)',
      'Promoter % (Net)',
      'Adjusted Team NPS',
      'Sampling Fulfillment %',
      'Total Issues Identified',
      'Customer Snags'
    ];

    monthHeaders.forEach((h, c) => {
      const cell = XLSX.utils.encode_cell({ r: 2, c });
      wsMonthly[cell] = {
        v: h,
        t: 's',
        s: {
          font: { bold: true, sz: 9, color: { rgb: PALETTE.white } },
          fill: { fgColor: { rgb: PALETTE.slateDark } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: borderHeader
        }
      };
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();

    let mTotalOrigToken = 0;
    let mTotalNonAcc = 0;
    let mTotalAdjNetToken = 0;
    let mTotalAccTasks = 0;
    let mTotalAccDet = 0;
    let mTotalAccNeu = 0;
    let mTotalPromoters = 0;
    let mTotalAllTasks = 0;
    let mTotalIssues = 0;
    let mTotalSnags = 0;

    for (let m = 1; m <= 12; m++) {
      const mIdx = m - 1;
      const mLabel = `${monthNames[mIdx]} ${currentYear}`;
      const tokenVal = monthlyTokens[m] || 0;
      mTotalOrigToken += tokenVal;

      const mTasks = teamTasks.filter(t => {
        const d = t.pisDate || t.interviewDate || t.createdAt;
        if (!d) return false;
        const dt = new Date(d);
        return dt.getFullYear() === currentYear && dt.getMonth() === mIdx;
      });

      let mNonAcc = 0;
      let mAcc = 0;
      let mAccDet = 0;
      let mAccNeu = 0;
      let mIssues = 0;

      mTasks.forEach(t => {
        const isAcc = isTeamAccountable(t);
        if (isAcc) {
          mAcc++;
          const score = t.evaluationScore || 0;
          const norm = score <= 10 ? score * 10 : score;
          if (norm > 0) {
            if (norm <= 60) mAccDet++;
            else if (norm <= 80) mAccNeu++;
          }
        } else {
          mNonAcc++;
        }

        const reasons = splitValues(t.reason).filter(r => r && r !== 'Not specified');
        const subReasons = splitValues(t.subReason).filter(r => r && r !== 'Not specified');
        const rootCauses = splitValues(t.rootCauses || t.rootCause).filter(r => r && r !== 'Not specified');
        mIssues += Math.max(reasons.length, subReasons.length, rootCauses.length, 1);
      });

      const mSnags = teamIssues.filter(i => {
        const d = i.date || i.createdAt;
        if (!d) return false;
        const dt = new Date(d);
        return dt.getFullYear() === currentYear && dt.getMonth() === mIdx;
      }).length;

      // Adjusted Net Tokens for this month = tokenVal - mNonAcc
      const mAdjNet = Math.max(0, tokenVal - mNonAcc);
      const mPro = Math.max(0, mAdjNet - mAcc);

      const mAccRate = mAdjNet > 0 ? ((mAcc / mAdjNet) * 100).toFixed(1) : '0.0';
      const mAccDetRate = mAdjNet > 0 ? ((mAccDet / mAdjNet) * 100).toFixed(1) : '0.0';
      const mAccNeuRate = mAdjNet > 0 ? ((mAccNeu / mAdjNet) * 100).toFixed(1) : '0.0';
      const mProRate = mAdjNet > 0 ? ((mPro / mAdjNet) * 100).toFixed(1) : '0.0';
      const mNps = mAdjNet > 0 ? (((mPro - mAccDet) / mAdjNet) * 100).toFixed(1) : '0.0';
      const mFulfill = tokenVal > 0 ? ((mTasks.length / tokenVal) * 100).toFixed(1) : '0.0';

      mTotalNonAcc += mNonAcc;
      mTotalAdjNetToken += mAdjNet;
      mTotalAccTasks += mAcc;
      mTotalAccDet += mAccDet;
      mTotalAccNeu += mAccNeu;
      mTotalPromoters += mPro;
      mTotalAllTasks += mTasks.length;
      mTotalIssues += mIssues;
      mTotalSnags += mSnags;

      const rowValues = [
        mLabel,
        tokenVal,
        mNonAcc,
        mAdjNet,
        mAcc,
        `${mAccRate}%`,
        mAccDet,
        `${mAccDetRate}%`,
        mAccNeu,
        `${mAccNeuRate}%`,
        mPro,
        `${mProRate}%`,
        mNps,
        `${mFulfill}%`,
        mIssues,
        mSnags
      ];

      const rNum = 2 + m;
      const isZebra = m % 2 === 0;
      const rowBg = isZebra ? PALETTE.zebraBg : PALETTE.white;

      rowValues.forEach((val, c) => {
        const cell = XLSX.utils.encode_cell({ r: rNum, c });
        wsMonthly[cell] = {
          v: val,
          t: typeof val === 'number' ? 'n' : 's',
          s: {
            font: { bold: c === 0 || c === 3 || c === 10 || c === 12 },
            alignment: { horizontal: c === 0 ? 'left' : 'center', vertical: 'center' },
            fill: { fgColor: { rgb: rowBg } },
            border: borderThin
          }
        };
      });
    }

    // Benchmark Summary Row
    const sumRNum = 15;
    const cumAccRate = mTotalAdjNetToken > 0 ? ((mTotalAccTasks / mTotalAdjNetToken) * 100).toFixed(1) : '0.0';
    const cumAccDetRate = mTotalAdjNetToken > 0 ? ((mTotalAccDet / mTotalAdjNetToken) * 100).toFixed(1) : '0.0';
    const cumAccNeuRate = mTotalAdjNetToken > 0 ? ((mTotalAccNeu / mTotalAdjNetToken) * 100).toFixed(1) : '0.0';
    const cumProRate = mTotalAdjNetToken > 0 ? ((mTotalPromoters / mTotalAdjNetToken) * 100).toFixed(1) : '0.0';
    const cumNps = mTotalAdjNetToken > 0 ? (((mTotalPromoters - mTotalAccDet) / mTotalAdjNetToken) * 100).toFixed(1) : '0.0';
    const cumFulfill = mTotalOrigToken > 0 ? ((mTotalAllTasks / mTotalOrigToken) * 100).toFixed(1) : '0.0';

    const cumRowValues = [
      'TOTAL FULL YEAR / CUMULATIVE BENCHMARK',
      mTotalOrigToken,
      mTotalNonAcc,
      mTotalAdjNetToken,
      mTotalAccTasks,
      `${cumAccRate}%`,
      mTotalAccDet,
      `${cumAccDetRate}%`,
      mTotalAccNeu,
      `${cumAccNeuRate}%`,
      mTotalPromoters,
      `${cumProRate}%`,
      cumNps,
      `${cumFulfill}%`,
      mTotalIssues,
      mTotalSnags
    ];

    cumRowValues.forEach((val, c) => {
      const cell = XLSX.utils.encode_cell({ r: sumRNum, c });
      wsMonthly[cell] = {
        v: val,
        t: typeof val === 'number' ? 'n' : 's',
        s: {
          font: { bold: true, color: { rgb: PALETTE.white } },
          alignment: { horizontal: c === 0 ? 'left' : 'center', vertical: 'center' },
          fill: { fgColor: { rgb: PALETTE.navyDark } },
          border: borderSummary
        }
      };
    });

    wsMonthly['!cols'] = [
      { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 18 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
      { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
      { wch: 16 }
    ];
    fixSheetRange(wsMonthly);
    XLSX.utils.book_append_sheet(wb, wsMonthly, "Monthly Performance Summary");

    // ─────────────────────────────────────────────────────────────────────────
    // SHEET 3: Reason & Root Cause Deep-Dive
    // ─────────────────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────
    // SHEET 3: Reason & Root Cause Deep-Dive (Strictly REACH Accountable Yes)
    // ─────────────────────────────────────────────────────────────────────────
    const wsRCA = XLSX.utils.aoa_to_sheet([[]]);
    wsRCA['!merges'] = [];

    // Strictly filter to REACH confirmed accountable tasks
    const accountableTasks = teamTasks.filter(t => isTeamAccountable(t) && fieldContainsReach(t.responsible));

    // Title banner
    wsRCA['A1'] = {
      v: `ACCOUNTABLE REASON & ROOT CAUSE DEEP-DIVE INTELLIGENCE - ${team.teamName.toUpperCase()}`,
      t: 's',
      s: { font: { bold: true, sz: 14, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.navyDark } }, alignment: { horizontal: 'center', vertical: 'center' } }
    };
    wsRCA['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } });

    let curRow = 2;

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 1: Cumulative Full-Year Accountable RCA Hierarchy
    // ─────────────────────────────────────────────────────────────────────────
    wsRCA[XLSX.utils.encode_cell({ r: curRow, c: 0 })] = {
      v: '1. CUMULATIVE FULL-YEAR ACCOUNTABLE ROOT CAUSE & DISSATISFACTION HIERARCHY (REACH + YES)',
      t: 's',
      s: { font: { bold: true, sz: 11, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.emeraldHeader } }, alignment: { horizontal: 'left' } }
    };
    wsRCA['!merges'].push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: 9 } });
    curRow++;

    const cumHeaders = [
      'Reason Category',
      'Reason Count',
      'Reason Share %',
      'Sub-Reason',
      'Sub Count',
      'Root Cause',
      'Acc. Cases',
      'Detractors (≤6)',
      'Neutrals (7-8)',
      '% of Total Acc.'
    ];

    cumHeaders.forEach((h, c) => {
      const cell = XLSX.utils.encode_cell({ r: curRow, c });
      wsRCA[cell] = {
        v: h,
        t: 's',
        s: { font: { bold: true, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.slateDark } }, alignment: { horizontal: 'center' }, border: borderHeader }
      };
    });
    curRow++;

    if (accountableTasks.length === 0) {
      wsRCA[XLSX.utils.encode_cell({ r: curRow, c: 0 })] = {
        v: 'Zero confirmed REACH accountable issues recorded for this field team (100% Clean / Zero Defects).',
        t: 's',
        s: { font: { italic: true, bold: true, color: { rgb: PALETTE.emeraldHeader } }, alignment: { horizontal: 'center' } }
      };
      wsRCA['!merges'].push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: 9 } });
      curRow += 2;
    } else {
      // Build Cumulative Tree
      const cumTree = {};
      let totalCumAccCases = 0;

      accountableTasks.forEach(t => {
        const reasons = splitValues(t.reason).map(normalizeValue);
        const subReasons = splitValues(t.subReason).map(normalizeValue);
        const rootCauses = splitValues(t.rootCauses || t.rootCause).map(normalizeValue);
        const maxLen = Math.max(reasons.length, subReasons.length, rootCauses.length, 1);

        const score = t.evaluationScore || 0;
        const norm = score <= 10 ? score * 10 : score;
        const isDet = norm > 0 && norm <= 60;
        const isNeu = norm > 60 && norm <= 80;

        for (let i = 0; i < maxLen; i++) {
          const r = reasons[i] || reasons[0] || 'Not specified';
          const sr = subReasons[i] || subReasons[0] || 'Not specified';
          const rc = rootCauses[i] || rootCauses[0] || 'Not specified';

          if (!cumTree[r]) cumTree[r] = { total: 0, subs: {} };
          cumTree[r].total++;
          if (!cumTree[r].subs[sr]) cumTree[r].subs[sr] = { total: 0, rcs: {} };
          cumTree[r].subs[sr].total++;
          if (!cumTree[r].subs[sr].rcs[rc]) cumTree[r].subs[sr].rcs[rc] = { count: 0, det: 0, neu: 0 };
          cumTree[r].subs[sr].rcs[rc].count++;
          if (isDet) cumTree[r].subs[sr].rcs[rc].det++;
          if (isNeu) cumTree[r].subs[sr].rcs[rc].neu++;
          totalCumAccCases++;
        }
      });

      Object.entries(cumTree).sort((a, b) => b[1].total - a[1].total).forEach(([reason, rData]) => {
        const rStart = curRow;
        const rShare = totalCumAccCases > 0 ? ((rData.total / totalCumAccCases) * 100).toFixed(1) : '0.0';

        Object.entries(rData.subs).sort((a, b) => b[1].total - a[1].total).forEach(([sub, subData]) => {
          const subStart = curRow;

          Object.entries(subData.rcs).sort((a, b) => b[1].count - a[1].count).forEach(([rc, rcInfo]) => {
            const rcPct = totalCumAccCases > 0 ? `${((rcInfo.count / totalCumAccCases) * 100).toFixed(1)}%` : '0.0%';
            wsRCA[XLSX.utils.encode_cell({ r: curRow, c: 5 })] = { v: rc, t: 's', s: { border: borderThin } };
            wsRCA[XLSX.utils.encode_cell({ r: curRow, c: 6 })] = { v: rcInfo.count, t: 'n', s: { font: { bold: true }, alignment: { horizontal: 'center' }, border: borderThin } };
            wsRCA[XLSX.utils.encode_cell({ r: curRow, c: 7 })] = { v: rcInfo.det, t: 'n', s: { alignment: { horizontal: 'center' }, border: borderThin } };
            wsRCA[XLSX.utils.encode_cell({ r: curRow, c: 8 })] = { v: rcInfo.neu, t: 'n', s: { alignment: { horizontal: 'center' }, border: borderThin } };
            wsRCA[XLSX.utils.encode_cell({ r: curRow, c: 9 })] = { v: rcPct, t: 's', s: { alignment: { horizontal: 'center' }, border: borderThin } };
            curRow++;
          });

          const subEnd = curRow - 1;
          wsRCA[XLSX.utils.encode_cell({ r: subStart, c: 3 })] = { v: sub, t: 's', s: { alignment: { vertical: 'center' }, border: borderThin } };
          wsRCA[XLSX.utils.encode_cell({ r: subStart, c: 4 })] = { v: subData.total, t: 'n', s: { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' }, border: borderThin } };
          if (subEnd > subStart) {
            wsRCA['!merges'].push({ s: { r: subStart, c: 3 }, e: { r: subEnd, c: 3 } });
            wsRCA['!merges'].push({ s: { r: subStart, c: 4 }, e: { r: subEnd, c: 4 } });
          }
        });

        const rEnd = curRow - 1;
        wsRCA[XLSX.utils.encode_cell({ r: rStart, c: 0 })] = { v: reason, t: 's', s: { font: { bold: true, color: { rgb: PALETTE.navyDark } }, alignment: { vertical: 'center' }, border: borderThin } };
        wsRCA[XLSX.utils.encode_cell({ r: rStart, c: 1 })] = { v: rData.total, t: 'n', s: { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' }, border: borderThin } };
        wsRCA[XLSX.utils.encode_cell({ r: rStart, c: 2 })] = { v: `${rShare}%`, t: 's', s: { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' }, border: borderThin } };
        if (rEnd > rStart) {
          wsRCA['!merges'].push({ s: { r: rStart, c: 0 }, e: { r: rEnd, c: 0 } });
          wsRCA['!merges'].push({ s: { r: rStart, c: 1 }, e: { r: rEnd, c: 1 } });
          wsRCA['!merges'].push({ s: { r: rStart, c: 2 }, e: { r: rEnd, c: 2 } });
        }
      });
      curRow += 2;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 2: Monthly Root Cause Evolution & Trend Matrix
    // ─────────────────────────────────────────────────────────────────────────
    wsRCA[XLSX.utils.encode_cell({ r: curRow, c: 0 })] = {
      v: '2. MONTHLY ACCOUNTABLE ROOT CAUSE EVOLUTION & TREND MATRIX',
      t: 's',
      s: { font: { bold: true, sz: 11, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.blueHeader } }, alignment: { horizontal: 'left' } }
    };
    wsRCA['!merges'].push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: 15 } });
    curRow++;

    const matrixHeaders = [
      'Root Cause Description',
      'Reason Category',
      'Total Cases',
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      'Trend Status'
    ];

    matrixHeaders.forEach((h, c) => {
      const cell = XLSX.utils.encode_cell({ r: curRow, c });
      wsRCA[cell] = {
        v: h,
        t: 's',
        s: { font: { bold: true, sz: 9, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.slateDark } }, alignment: { horizontal: 'center' }, border: borderHeader }
      };
    });
    curRow++;

    // Calculate monthly root cause occurrences
    const rcMonthMap = {};

    accountableTasks.forEach(t => {
      const d = t.pisDate || t.interviewDate || t.createdAt;
      const mIdx = d ? new Date(d).getMonth() : 0;
      const r = normalizeValue(splitValues(t.reason)[0] || 'General');
      const rootCauses = splitValues(t.rootCauses || t.rootCause).map(normalizeValue);

      rootCauses.forEach(rc => {
        if (!rc || rc === 'Not specified') return;
        if (!rcMonthMap[rc]) {
          rcMonthMap[rc] = { reason: r, total: 0, months: Array(12).fill(0) };
        }
        rcMonthMap[rc].total++;
        rcMonthMap[rc].months[mIdx]++;
      });
    });

    const rcList = Object.entries(rcMonthMap).sort((a, b) => b[1].total - a[1].total);

    if (rcList.length === 0) {
      wsRCA[XLSX.utils.encode_cell({ r: curRow, c: 0 })] = {
        v: 'Zero accountable root causes identified.',
        t: 's',
        s: { font: { italic: true, color: { rgb: PALETTE.slateMuted } }, alignment: { horizontal: 'center' } }
      };
      wsRCA['!merges'].push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: 15 } });
      curRow += 2;
    } else {
      rcList.forEach(([rc, data], idx) => {
        const isZebra = idx % 2 === 1;
        const rowBg = isZebra ? PALETTE.zebraBg : PALETTE.white;

        // Trend calculation (recent 3 months vs prior)
        const recentMonthsSum = data.months.slice(new Date().getMonth() - 2, new Date().getMonth() + 1).reduce((a, b) => a + b, 0);
        const priorMonthsSum = data.total - recentMonthsSum;
        const trendStatus = data.months[new Date().getMonth()] === 0 && data.total > 0 ? 'Resolved / Inactive' :
          recentMonthsSum > priorMonthsSum ? 'Rising Concern' :
          recentMonthsSum < priorMonthsSum ? 'Improving / Decreasing' : 'Persistent';

        const rowVals = [
          rc,
          data.reason,
          data.total,
          ...data.months,
          trendStatus
        ];

        rowVals.forEach((val, c) => {
          const cell = XLSX.utils.encode_cell({ r: curRow, c });
          wsRCA[cell] = {
            v: val,
            t: typeof val === 'number' ? 'n' : 's',
            s: {
              font: { bold: c === 0 || c === 2 || c === 15 },
              alignment: { horizontal: c <= 1 ? 'left' : 'center', vertical: 'center' },
              fill: { fgColor: { rgb: rowBg } },
              border: borderThin
            }
          };
        });
        curRow++;
      });
      curRow += 2;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 3: Monthly Deep-Dive Breakdown per Month
    // ─────────────────────────────────────────────────────────────────────────
    wsRCA[XLSX.utils.encode_cell({ r: curRow, c: 0 })] = {
      v: '3. MONTHLY DISAGGREGATED ACCOUNTABLE RCA BREAKDOWN (MONTH-BY-MONTH DEEP DIVE)',
      t: 's',
      s: { font: { bold: true, sz: 11, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.navyDark } }, alignment: { horizontal: 'left' } }
    };
    wsRCA['!merges'].push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: 9 } });
    curRow++;

    for (let m = 0; m < 12; m++) {
      const mLabel = `${monthNames[m]} ${currentYear}`;
      const mAccTasks = accountableTasks.filter(t => {
        const d = t.pisDate || t.interviewDate || t.createdAt;
        if (!d) return false;
        const dt = new Date(d);
        return dt.getFullYear() === currentYear && dt.getMonth() === m;
      });

      if (mAccTasks.length > 0) {
        // Month Sub-Header
        wsRCA[XLSX.utils.encode_cell({ r: curRow, c: 0 })] = {
          v: `MONTH: ${mLabel.toUpperCase()} - (${mAccTasks.length} Accountable Issues)`,
          t: 's',
          s: { font: { bold: true, sz: 10, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.slateMedium } }, alignment: { horizontal: 'left' } }
        };
        wsRCA['!merges'].push({ s: { r: curRow, c: 0 }, e: { r: curRow, c: 9 } });
        curRow++;

        const mHeaders = [
          'Month',
          'Reason Category',
          'Reason Count',
          'Reason Share %',
          'Sub-Reason',
          'Sub Count',
          'Root Cause',
          'Cases',
          'Detractors (≤6)',
          'Neutrals (7-8)'
        ];

        mHeaders.forEach((h, c) => {
          const cell = XLSX.utils.encode_cell({ r: curRow, c });
          wsRCA[cell] = {
            v: h,
            t: 's',
            s: { font: { bold: true, sz: 9, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.slateDark } }, alignment: { horizontal: 'center' }, border: borderHeader }
          };
        });
        curRow++;

        // Build monthly tree
        const mTree = {};
        let mTotalCases = 0;

        mAccTasks.forEach(t => {
          const reasons = splitValues(t.reason).map(normalizeValue);
          const subReasons = splitValues(t.subReason).map(normalizeValue);
          const rootCauses = splitValues(t.rootCauses || t.rootCause).map(normalizeValue);
          const maxLen = Math.max(reasons.length, subReasons.length, rootCauses.length, 1);

          const score = t.evaluationScore || 0;
          const norm = score <= 10 ? score * 10 : score;
          const isDet = norm > 0 && norm <= 60;
          const isNeu = norm > 60 && norm <= 80;

          for (let i = 0; i < maxLen; i++) {
            const r = reasons[i] || reasons[0] || 'Not specified';
            const sr = subReasons[i] || subReasons[0] || 'Not specified';
            const rc = rootCauses[i] || rootCauses[0] || 'Not specified';

            if (!mTree[r]) mTree[r] = { total: 0, subs: {} };
            mTree[r].total++;
            if (!mTree[r].subs[sr]) mTree[r].subs[sr] = { total: 0, rcs: {} };
            mTree[r].subs[sr].total++;
            if (!mTree[r].subs[sr].rcs[rc]) mTree[r].subs[sr].rcs[rc] = { count: 0, det: 0, neu: 0 };
            mTree[r].subs[sr].rcs[rc].count++;
            if (isDet) mTree[r].subs[sr].rcs[rc].det++;
            if (isNeu) mTree[r].subs[sr].rcs[rc].neu++;
            mTotalCases++;
          }
        });

        Object.entries(mTree).sort((a, b) => b[1].total - a[1].total).forEach(([reason, rData]) => {
          const rShare = mTotalCases > 0 ? `${((rData.total / mTotalCases) * 100).toFixed(1)}%` : '0.0%';

          Object.entries(rData.subs).sort((a, b) => b[1].total - a[1].total).forEach(([sub, subData]) => {
            Object.entries(subData.rcs).sort((a, b) => b[1].count - a[1].count).forEach(([rc, rcInfo]) => {
              const rowValues = [
                mLabel,
                reason,
                rData.total,
                rShare,
                sub,
                subData.total,
                rc,
                rcInfo.count,
                rcInfo.det,
                rcInfo.neu
              ];

              rowValues.forEach((val, c) => {
                const cell = XLSX.utils.encode_cell({ r: curRow, c });
                wsRCA[cell] = {
                  v: val,
                  t: typeof val === 'number' ? 'n' : 's',
                  s: {
                    font: { bold: c === 0 || c === 1 || c === 7 },
                    alignment: { horizontal: c === 0 || c === 1 || c === 4 || c === 6 ? 'left' : 'center', vertical: 'center' },
                    fill: { fgColor: { rgb: PALETTE.zebraBg } },
                    border: borderThin
                  }
                };
              });
              curRow++;
            });
          });
        });
        curRow++;
      }
    }

    wsRCA['!cols'] = [
      { wch: 16 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 28 },
      { wch: 12 }, { wch: 32 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
      { wch: 20 }
    ];
    fixSheetRange(wsRCA);
    XLSX.utils.book_append_sheet(wb, wsRCA, "Reason & Root Cause Deep-Dive");

    // ─────────────────────────────────────────────────────────────────────────
    // SHEET 4: Training & Development History Logs
    // ─────────────────────────────────────────────────────────────────────────
    const wsTraining = XLSX.utils.aoa_to_sheet([[]]);
    wsTraining['!merges'] = [];

    wsTraining['A1'] = {
      v: `TRAINING, QUALITY COACHING & DEVELOPMENT HISTORY - ${team.teamName.toUpperCase()}`,
      t: 's',
      s: { font: { bold: true, sz: 13, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.navyDark } }, alignment: { horizontal: 'center' } }
    };
    wsTraining['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } });

    const trainingHeaders = [
      '#',
      'Session Date',
      'Session Title / Program',
      'Session Type',
      'Conducted By / Trainer',
      'Location / Venue',
      'Duration',
      'Outlines / Modules Covered',
      'Status',
      'Supervisor Notes & Action Plan'
    ];

    trainingHeaders.forEach((h, c) => {
      const cell = XLSX.utils.encode_cell({ r: 2, c });
      wsTraining[cell] = {
        v: h,
        t: 's',
        s: { font: { bold: true, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.slateDark } }, alignment: { horizontal: 'center' }, border: borderHeader }
      };
    });

    if (teamSessions.length === 0) {
      wsTraining['A4'] = { v: 'No training or development sessions recorded for this field team yet.', t: 's', s: { font: { italic: true, color: { rgb: PALETTE.slateMuted } } } };
      wsTraining['!merges'].push({ s: { r: 3, c: 0 }, e: { r: 3, c: 9 } });
    } else {
      teamSessions.forEach((sess, idx) => {
        const rNum = 3 + idx;
        const isZebra = idx % 2 === 1;
        const rowBg = isZebra ? PALETTE.zebraBg : PALETTE.white;

        const rowValues = [
          idx + 1,
          sess.sessionDate ? format(new Date(sess.sessionDate), 'yyyy-MM-dd') : 'N/A',
          sess.sessionTitle,
          sess.sessionType,
          sess.conductedBy,
          sess.location,
          sess.duration,
          sess.outlines,
          sess.status,
          sess.notes || 'Coaching completed successfully'
        ];

        rowValues.forEach((val, c) => {
          const cell = XLSX.utils.encode_cell({ r: rNum, c });
          wsTraining[cell] = {
            v: val,
            t: typeof val === 'number' ? 'n' : 's',
            s: {
              font: { bold: c === 2 },
              alignment: { horizontal: c === 0 || c === 1 || c === 6 || c === 8 ? 'center' : 'left', vertical: 'center', wrapText: true },
              fill: { fgColor: { rgb: rowBg } },
              border: borderThin
            }
          };
        });
      });
    }

    wsTraining['!cols'] = [
      { wch: 6 }, { wch: 14 }, { wch: 28 }, { wch: 20 }, { wch: 22 },
      { wch: 18 }, { wch: 12 }, { wch: 35 }, { wch: 14 }, { wch: 40 }
    ];
    fixSheetRange(wsTraining);
    XLSX.utils.book_append_sheet(wb, wsTraining, "Training & Development Logs");

    // ─────────────────────────────────────────────────────────────────────────
    // SHEET 5: Customer Issues & Snags Log
    // ─────────────────────────────────────────────────────────────────────────
    const wsIssues = XLSX.utils.aoa_to_sheet([[]]);
    wsIssues['!merges'] = [];

    wsIssues['A1'] = {
      v: `CUSTOMER ISSUES, SNAGS & COMPLAINTS REGISTRY - ${team.teamName.toUpperCase()}`,
      t: 's',
      s: { font: { bold: true, sz: 13, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.navyDark } }, alignment: { horizontal: 'center' } }
    };
    wsIssues['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } });

    const snagHeaders = [
      '#',
      'SLID',
      'Ticket ID',
      'Report Date',
      'PIS Date',
      'Category',
      'Sub-Category',
      'Reporter',
      'Contact Method',
      'Status',
      'Area / Governorate',
      'Reporter Note'
    ];

    snagHeaders.forEach((h, c) => {
      const cell = XLSX.utils.encode_cell({ r: 2, c });
      wsIssues[cell] = {
        v: h,
        t: 's',
        s: { font: { bold: true, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.slateDark } }, alignment: { horizontal: 'center' }, border: borderHeader }
      };
    });

    if (teamIssues.length === 0) {
      wsIssues['A4'] = { v: 'Zero customer issues or snags registered for this field team.', t: 's', s: { font: { italic: true, color: { rgb: PALETTE.slateMuted } } } };
      wsIssues['!merges'].push({ s: { r: 3, c: 0 }, e: { r: 3, c: 11 } });
    } else {
      teamIssues.forEach((issue, idx) => {
        const rNum = 3 + idx;
        const isZebra = idx % 2 === 1;
        const rowBg = isZebra ? PALETTE.zebraBg : PALETTE.white;

        const mainCat = Array.isArray(issue.issues) && issue.issues.length > 0
          ? issue.issues.map(i => i.category).join(', ')
          : (issue.issueCategory || issue.fromMain || 'N/A');

        const subCat = Array.isArray(issue.issues) && issue.issues.length > 0
          ? issue.issues.map(i => i.subCategory).join(', ')
          : (issue.fromSub || 'N/A');

        const rowValues = [
          idx + 1,
          issue.slid || 'N/A',
          issue.ticketId || '-',
          safeFormatDate(issue.date || issue.createdAt),
          safeFormatDate(issue.pisDate),
          mainCat,
          subCat,
          issue.reporter || 'Customer',
          issue.contactMethod || '-',
          issue.solved === 'yes' ? 'Solved' : 'Open',
          issue.area || issue.governorate || '-',
          issue.reporterNote || '-'
        ];

        rowValues.forEach((val, c) => {
          const cell = XLSX.utils.encode_cell({ r: rNum, c });
          wsIssues[cell] = {
            v: val !== undefined && val !== null ? val : '-',
            t: typeof val === 'number' ? 'n' : 's',
            s: {
              font: { bold: c === 1, color: { rgb: PALETTE.slateDark } },
              alignment: { horizontal: c === 0 || c === 3 || c === 4 || c === 9 ? 'center' : 'left', vertical: 'center', wrapText: true },
              fill: { fgColor: { rgb: rowBg } },
              border: borderThin
            }
          };
        });
      });
    }

    wsIssues['!cols'] = [
      { wch: 8 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
      { wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 16 }, { wch: 12 },
      { wch: 22 }, { wch: 50 }
    ];
    fixSheetRange(wsIssues);
    XLSX.utils.book_append_sheet(wb, wsIssues, "Customer Issues & Snags");

    // ─────────────────────────────────────────────────────────────────────────
    // SHEETS 6–9: E2E FTTH Practical Lab Assessments (Full Detail)
    // ─────────────────────────────────────────────────────────────────────────
    const teamLabAssessments = (Array.isArray(allLabAssessmentsGlobal) ? allLabAssessmentsGlobal : []).filter(a => {
      const matchId = (a.fieldTeamId?._id || a.fieldTeamId)?.toString() === tId;
      const matchName = normalizeText(a.fieldTeamName) === tName || normalizeText(a.fieldTeamId?.teamName) === tName;
      return matchId || matchName;
    });

    // Helper: compute section score from checkpoint data
    const computeSecScore = (la, secNum) => {
      const scScores = la.sectionScores || {};
      const secKey = `section${secNum}`;
      if (scScores[secKey] !== undefined) {
        return secNum === 8 || secNum === 7 ? `${scScores[secKey]} / 10 Pts` : `${scScores[secKey]}%`;
      }
      if (Array.isArray(la.sections)) {
        const targetSec = la.sections.find(s => s.sectionId === `sec-${secNum}` || s.sectionTitle?.startsWith(`${secNum}.`));
        if (targetSec && targetSec.checkpoints) {
          let tot = 0; let max = 0; let isPts = false;
          targetSec.checkpoints.forEach(cp => {
            if (cp.status !== 'N/A') {
              const cpMax = cp.maxScore || (cp.type === 'points' ? 10 : 5);
              max += cpMax;
              if (cp.type === 'points' || cp.maxScore === 10) {
                isPts = true;
                tot += Number(cp.score !== undefined ? cp.score : cpMax);
              } else {
                if (cp.status === 'Pass') tot += Number(cp.score !== undefined ? cp.score : cpMax);
                else if (cp.status === 'Fail') tot += Number(cp.score > 0 && cp.score < cpMax ? cp.score : 0);
              }
            }
          });
          const p = max > 0 ? Math.round((tot / max) * 100) : 100;
          return isPts ? `${tot} / ${max} Pts (${p}%)` : `${p}%`;
        }
      }
      return '-';
    };

    const CERT_DEFS_LOCAL = [
      { key: 'dd', code: 'DD', title: 'Defensive Driving' },
      { key: 'es', code: 'ES', title: 'Electrical Safety' },
      { key: 'fa', code: 'FA', title: 'First Aid' },
      { key: 'ff', code: 'FF', title: 'Fire Fighting' },
      { key: 'ra', code: 'RA', title: 'Risk Assessment' },
      { key: 'wah', code: 'WAH', title: 'Work at Height' }
    ];

    // ── SHEET 6: Assessment Summary Matrix ──────────────────────────────────
    const wsLab = XLSX.utils.aoa_to_sheet([[]]);
    wsLab['!merges'] = [];

    wsLab['A1'] = {
      v: `E2E FTTH PRACTICAL LAB ASSESSMENTS — OVERVIEW MATRIX - ${team.teamName.toUpperCase()}`,
      t: 's',
      s: { font: { bold: true, sz: 13, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.navyDark } }, alignment: { horizontal: 'center' } }
    };
    wsLab['A2'] = {
      v: `Total Assessments: ${teamLabAssessments.length} | Report Date: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Team: ${team.teamName}`,
      t: 's',
      s: { font: { italic: true, sz: 10, color: { rgb: 'E0E7FF' } }, fill: { fgColor: { rgb: PALETTE.blueHeader } }, alignment: { horizontal: 'center' } }
    };
    wsLab['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 19 } });
    wsLab['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 19 } });

    const labHeaders = [
      '#', 'Assessment Date', 'Assessor / Evaluator', 'ONT Model / Spec',
      'Date of Birth', 'Age', 'Experience',
      'Employment Type', 'Safety Certs Held',
      '1. Safety & PPE', '2. Tools & Readiness',
      '3. FDB Splicing', '4. BEP Splicing',
      '5. Assistant Tools', '6. Customer Edu',
      '7. Awareness', '8. Self-Assessment',
      'Overall Score (%)', '5-Tier Result', 'Pass / Fail',
      'Assessor Notes / Recommendations'
    ];

    labHeaders.forEach((h, c) => {
      const cell = XLSX.utils.encode_cell({ r: 2, c });
      wsLab[cell] = {
        v: h, t: 's',
        s: { font: { bold: true, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.slateDark } }, alignment: { horizontal: 'center', wrapText: true }, border: borderHeader }
      };
    });

    if (teamLabAssessments.length === 0) {
      wsLab['A4'] = { v: 'No practical lab assessments recorded for this field team yet.', t: 's', s: { font: { italic: true, color: { rgb: PALETTE.slateMuted } } } };
      wsLab['!merges'].push({ s: { r: 3, c: 0 }, e: { r: 3, c: 20 } });
    } else {
      teamLabAssessments.forEach((la, idx) => {
        const rNum = 3 + idx;
        const isZebra = idx % 2 === 1;
        const rowBg = isZebra ? PALETTE.zebraBg : PALETTE.white;
        const certsObj = la.certificates || {};
        const heldCerts = CERT_DEFS_LOCAL.filter(cd => certsObj[cd.key]).map(cd => cd.code).join(', ') || 'None';
        const expStr = formatExperienceDuration(la.experienceYears, la.experienceMonths, la.experienceDays, la.yearsOfExperience);
        const tier = getLabTierStatus(la.totalScore !== undefined ? la.totalScore : la.overallScore);
        const dob = la.dateOfBirth || la.fieldTeamId?.dateOfBirth;
        const dobStr = safeFormatDate(dob);
        let ageNum = la.age !== undefined && la.age !== null ? la.age : (la.fieldTeamId?.age !== undefined && la.fieldTeamId?.age !== null ? la.fieldTeamId.age : null);
        if (ageNum === null && dob) {
          const birth = new Date(dob);
          const ref = la.assessmentDate ? new Date(la.assessmentDate) : new Date();
          let a = ref.getFullYear() - birth.getFullYear();
          const m = ref.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) a--;
          ageNum = a >= 0 ? a : null;
        }
        const ageStr = ageNum !== null ? `${ageNum} Yrs` : '-';

        const rowValues = [
          idx + 1,
          safeFormatDate(la.assessmentDate || la.createdAt),
          la.conductedBy || la.assessorId?.name || 'Quality Team',
          la.ontModel || la.ontType?.name || 'ZTE / Nokia',
          dobStr, ageStr, expStr,
          la.employmentType || 'Subcontractor',
          heldCerts,
          computeSecScore(la, 1),
          computeSecScore(la, 2),
          computeSecScore(la, 3),
          computeSecScore(la, 4),
          computeSecScore(la, 5),
          computeSecScore(la, 6),
          computeSecScore(la, 7),
          computeSecScore(la, 8),
          `${la.totalScore !== undefined ? la.totalScore : la.overallScore || 0}%`,
          tier.label,
          tier.status,
          la.feedback || la.comments || '-'
        ];

        rowValues.forEach((val, c) => {
          const cell = XLSX.utils.encode_cell({ r: rNum, c });
          const isPassCol = c === 19;
          const isScoreCol = c === 17;
          wsLab[cell] = {
            v: val !== undefined && val !== null ? val : '-',
            t: typeof val === 'number' ? 'n' : 's',
            s: {
              font: { bold: isScoreCol || isPassCol, color: { rgb: PALETTE.slateDark } },
              alignment: { horizontal: c === 0 || c === 1 || c === 5 || c >= 9 ? 'center' : 'left', vertical: 'center', wrapText: true },
              fill: isPassCol && val === 'Pass' ? { fgColor: { rgb: 'DCFCE7' } } :
                    isPassCol && val === 'Fail' ? { fgColor: { rgb: 'FEE2E2' } } :
                    { fgColor: { rgb: rowBg } },
              border: borderThin
            }
          };
        });
      });
    }

    wsLab['!cols'] = [
      { wch: 5 }, { wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 10 },
      { wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 14 },
      { wch: 48 }, { wch: 12 }, { wch: 50 }
    ];
    fixSheetRange(wsLab);
    XLSX.utils.book_append_sheet(wb, wsLab, 'Lab - Overview Matrix');

    // ── SHEET 7: Detailed Profile + Section Mastery per Assessment ──────────
    const wsLabProfiles = XLSX.utils.aoa_to_sheet([[]]); wsLabProfiles['!merges'] = [];
    wsLabProfiles['A1'] = {
      v: `PRACTICAL ASSESSMENT — DETAILED PROFILES & SECTION MASTERY - ${team.teamName.toUpperCase()}`,
      t: 's',
      s: { font: { bold: true, sz: 13, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: '1E3A8A' } }, alignment: { horizontal: 'center' } }
    };
    wsLabProfiles['A2'] = {
      v: `Full technician profile, experience, safety clearances & section-by-section mastery breakdown`,
      t: 's',
      s: { font: { italic: true, sz: 10, color: { rgb: 'E0E7FF' } }, fill: { fgColor: { rgb: '2563EB' } }, alignment: { horizontal: 'center' } }
    };
    wsLabProfiles['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });
    wsLabProfiles['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } });

    let lpRow = 3;

    if (teamLabAssessments.length === 0) {
      wsLabProfiles[XLSX.utils.encode_cell({ r: lpRow, c: 0 })] = { v: 'No lab assessments recorded.', t: 's', s: { font: { italic: true } } };
    } else {
      teamLabAssessments.forEach((la, idx) => {
        const laScore = la.totalScore !== undefined ? la.totalScore : la.overallScore || 0;
        const laTier = getLabTierStatus(laScore);
        const laExpStr = formatExperienceDuration(la.experienceYears, la.experienceMonths, la.experienceDays, la.yearsOfExperience);
        const laDob = la.dateOfBirth || la.fieldTeamId?.dateOfBirth;
        const ladobStr = safeFormatDate(laDob);
        let laAgeNum = la.age !== undefined && la.age !== null ? la.age : (la.fieldTeamId?.age !== undefined && la.fieldTeamId?.age !== null ? la.fieldTeamId.age : null);
        if (laAgeNum === null && laDob) {
          const birth = new Date(laDob);
          const ref = la.assessmentDate ? new Date(la.assessmentDate) : new Date();
          let a = ref.getFullYear() - birth.getFullYear();
          const m = ref.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) a--;
          laAgeNum = a >= 0 ? a : null;
        }
        const laAgeStr = laAgeNum !== null ? `${laAgeNum} Years` : 'Not Specified';
        const laCertsObj = la.certificates || {};
        const laHeldCerts = CERT_DEFS_LOCAL.filter(cd => laCertsObj[cd.key]).map(cd => `${cd.code} (${cd.title})`).join(', ') || 'None';
        const laCertCount = CERT_DEFS_LOCAL.filter(cd => laCertsObj[cd.key]).length;

        // Assessment banner header
        wsLabProfiles[XLSX.utils.encode_cell({ r: lpRow, c: 0 })] = {
          v: `ASSESSMENT #${idx + 1} — ${safeFormatDate(la.assessmentDate || la.createdAt).toUpperCase()} | ASSESSOR: ${(la.conductedBy || la.assessorId?.name || 'Quality Team').toUpperCase()}`,
          t: 's',
          s: { font: { bold: true, sz: 11, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.blueHeader } }, alignment: { horizontal: 'left' } }
        };
        wsLabProfiles['!merges'].push({ s: { r: lpRow, c: 0 }, e: { r: lpRow, c: 5 } });
        lpRow++;

        // Profile sub-header
        wsLabProfiles[XLSX.utils.encode_cell({ r: lpRow, c: 0 })] = { v: 'PROFILE FIELD', t: 's', s: { font: { bold: true, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.slateDark } }, border: borderHeader } };
        wsLabProfiles[XLSX.utils.encode_cell({ r: lpRow, c: 1 })] = { v: 'VALUE', t: 's', s: { font: { bold: true, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.slateDark } }, alignment: { horizontal: 'center' }, border: borderHeader } };
        wsLabProfiles[XLSX.utils.encode_cell({ r: lpRow, c: 2 })] = { v: 'STANDARD / BENCHMARK', t: 's', s: { font: { bold: true, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.slateDark } }, alignment: { horizontal: 'center' }, border: borderHeader } };
        wsLabProfiles[XLSX.utils.encode_cell({ r: lpRow, c: 3 })] = { v: 'STATUS', t: 's', s: { font: { bold: true, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.slateDark } }, alignment: { horizontal: 'center' }, border: borderHeader } };
        wsLabProfiles['!merges'].push({ s: { r: lpRow, c: 0 }, e: { r: lpRow, c: 0 } });
        wsLabProfiles['!merges'].push({ s: { r: lpRow, c: 1 }, e: { r: lpRow, c: 1 } });
        wsLabProfiles['!merges'].push({ s: { r: lpRow, c: 3 }, e: { r: lpRow, c: 5 } });
        lpRow++;

        const profileRows = [
          ['Field Team Name', team.teamName, 'Verified Identity', 'Active'],
          ['Team Code / ID', team.teamCode || 'N/A', 'System ID', 'Verified'],
          ['Contractor / Company', team.teamCompany || 'N/A', 'Service Partner', 'Verified'],
          ['Employment Type', la.employmentType || 'Subcontractor', 'Contract Classification', 'Verified'],
          ['Date of Birth (DoB)', ladobStr, 'Official HR Record', 'Recorded'],
          ['Technician Age', laAgeStr, 'Standard Working Age', 'Verified'],
          ['Field Experience', laExpStr, 'Years / Months / Days', 'Recorded'],
          ['ONT Model Evaluated', la.ontModel || la.ontType?.name || 'ZTE / Nokia', 'Certified ONT Model', 'Assessed'],
          ['Safety Certs Held', laHeldCerts, '6 Mandatory Clearances', `${laCertCount} / 6 Held`],
          ['Overall Practical Score', `${laScore}%`, '≥ 70.0% Min. Pass', laTier.status],
          ['5-Tier Performance Result', laTier.label, 'Nokia Quality Benchmark', laTier.status],
          ['Assessor Feedback', la.feedback || la.comments || 'Assessment completed.', 'Quality Supervisor Notes', 'Logged'],
        ];

        profileRows.forEach((pRow, pIdx) => {
          const rowBg = pIdx % 2 === 1 ? PALETTE.zebraBg : PALETTE.white;
          wsLabProfiles[XLSX.utils.encode_cell({ r: lpRow, c: 0 })] = {
            v: pRow[0], t: 's',
            s: { font: { bold: true, color: { rgb: PALETTE.slateLight } }, fill: { fgColor: { rgb: rowBg } }, border: borderThin }
          };
          wsLabProfiles[XLSX.utils.encode_cell({ r: lpRow, c: 1 })] = {
            v: pRow[1], t: 's',
            s: { font: { bold: true }, fill: { fgColor: { rgb: rowBg } }, border: borderThin }
          };
          wsLabProfiles[XLSX.utils.encode_cell({ r: lpRow, c: 2 })] = {
            v: pRow[2], t: 's',
            s: { font: { italic: true, color: { rgb: PALETTE.slateMuted } }, alignment: { horizontal: 'center' }, fill: { fgColor: { rgb: rowBg } }, border: borderThin }
          };
          const isPassStatus = pRow[3] === 'Pass' || pRow[3] === 'Verified' || pRow[3] === 'Active' || pRow[3] === 'Logged' || pRow[3] === 'Recorded' || pRow[3] === 'Assessed' || pRow[3] === 'Established';
          const isFailStatus = pRow[3] === 'Fail';
          wsLabProfiles[XLSX.utils.encode_cell({ r: lpRow, c: 3 })] = {
            v: pRow[3], t: 's',
            s: {
              font: { bold: true, color: { rgb: PALETTE.blueHeader } },
              alignment: { horizontal: 'center' },
              fill: isPassStatus ? { fgColor: { rgb: 'DCFCE7' } } : isFailStatus ? { fgColor: { rgb: 'FEE2E2' } } : { fgColor: { rgb: rowBg } },
              border: borderThin
            }
          };
          wsLabProfiles['!merges'].push({ s: { r: lpRow, c: 3 }, e: { r: lpRow, c: 5 } });
          lpRow++;
        });

        // Section mastery sub-header
        wsLabProfiles[XLSX.utils.encode_cell({ r: lpRow, c: 0 })] = {
          v: 'SECTION-BY-SECTION MASTERY BREAKDOWN',
          t: 's',
          s: { font: { bold: true, sz: 10, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.slateMedium } }, alignment: { horizontal: 'left' } }
        };
        wsLabProfiles['!merges'].push({ s: { r: lpRow, c: 0 }, e: { r: lpRow, c: 5 } });
        lpRow++;

        const secHdrs = ['Section #', 'Assessment Domain', 'Total Checkpoints', 'Section Score', 'Pass / Fail'];
        secHdrs.forEach((h, c) => {
          wsLabProfiles[XLSX.utils.encode_cell({ r: lpRow, c })] = {
            v: h, t: 's',
            s: { font: { bold: true, sz: 9, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: '374151' } }, alignment: { horizontal: 'center' }, border: borderHeader }
          };
        });
        lpRow++;

        if (Array.isArray(la.sections) && la.sections.length > 0) {
          la.sections.forEach((sec, sIdx) => {
            const cpCount = sec.checkpoints?.length || 0;
            let totalSc = 0; let maxSc = 0; let isPtsOnly = false;
            (sec.checkpoints || []).forEach(cp => {
              if (cp.status !== 'N/A') {
                const cpMax = cp.maxScore || (cp.type === 'points' ? 10 : 5);
                maxSc += cpMax;
                if (cp.type === 'points' || cp.maxScore === 10) {
                  isPtsOnly = true;
                  totalSc += Number(cp.score !== undefined ? cp.score : cpMax);
                } else {
                  if (cp.status === 'Pass') totalSc += Number(cp.score !== undefined ? cp.score : cpMax);
                  else if (cp.status === 'Fail') totalSc += Number(cp.score > 0 && cp.score < cpMax ? cp.score : 0);
                }
              }
            });
            const pct = maxSc > 0 ? Math.round((totalSc / maxSc) * 100) : 100;
            const isSec7 = sec.sectionId === 'sec-7';
            const secScoreStr = isSec7 ? '100% (Awareness)' : isPtsOnly ? `${totalSc} / ${maxSc} Pts (${pct}%)` : `${pct}%`;
            const secResult = isSec7 ? 'Informational' : pct >= 70 ? 'Pass' : 'Fail';
            const secRowBg = sIdx % 2 === 1 ? PALETTE.zebraBg : PALETTE.white;
            const secRow = [`Section ${sIdx + 1}`, sec.sectionTitle, `${cpCount} Checkpoints`, secScoreStr, secResult];
            secRow.forEach((v, c) => {
              const isResultCol = c === 4;
              wsLabProfiles[XLSX.utils.encode_cell({ r: lpRow, c })] = {
                v: v, t: 's',
                s: {
                  font: { sz: 9, bold: c === 0 || c === 3 },
                  alignment: { horizontal: c === 0 || c === 2 || c === 3 || c === 4 ? 'center' : 'left', vertical: 'center' },
                  fill: isResultCol && secResult === 'Pass' ? { fgColor: { rgb: 'DCFCE7' } } :
                        isResultCol && secResult === 'Fail' ? { fgColor: { rgb: 'FEE2E2' } } :
                        { fgColor: { rgb: secRowBg } },
                  border: borderThin
                }
              };
            });
            lpRow++;
          });
        } else {
          wsLabProfiles[XLSX.utils.encode_cell({ r: lpRow, c: 0 })] = { v: 'No section data available.', t: 's', s: { font: { italic: true, color: { rgb: PALETTE.slateMuted } } } };
          wsLabProfiles['!merges'].push({ s: { r: lpRow, c: 0 }, e: { r: lpRow, c: 5 } });
          lpRow++;
        }
        lpRow += 2; // spacer between assessments
      });
    }

    wsLabProfiles['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 26 }, { wch: 26 }, { wch: 18 }, { wch: 12 }];
    fixSheetRange(wsLabProfiles);
    XLSX.utils.book_append_sheet(wb, wsLabProfiles, 'Lab - Profiles & Mastery');

    // ── SHEET 8: Checkpoint-by-Checkpoint Full Breakdown ────────────────────
    const wsLabCp = XLSX.utils.aoa_to_sheet([[]]); wsLabCp['!merges'] = [];
    wsLabCp['A1'] = {
      v: `PRACTICAL ASSESSMENT — ITEMIZED CHECKPOINTS DEEP DIVE - ${team.teamName.toUpperCase()}`,
      t: 's',
      s: { font: { bold: true, sz: 13, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: '0F172A' } }, alignment: { horizontal: 'center' } }
    };
    wsLabCp['A2'] = {
      v: 'All evaluation criteria across FDB, BEP, ONT (ZTE & Nokia), Tools, Customer Education & Self-Assessment',
      t: 's',
      s: { font: { italic: true, sz: 10, color: { rgb: 'E0E7FF' } }, fill: { fgColor: { rgb: '0D9488' } }, alignment: { horizontal: 'center' } }
    };
    wsLabCp['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });
    wsLabCp['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 7 } });

    let cpRow = 2;
    const cpHeaders = ['Assessment #', 'Assessment Date', 'Section Name', 'SubSection / ONT Model', 'Checkpoint Criteria', 'Result Status', 'Score', 'Max Points', 'Assessor Notes'];
    cpHeaders.forEach((h, c) => {
      wsLabCp[XLSX.utils.encode_cell({ r: cpRow, c })] = {
        v: h, t: 's',
        s: { font: { bold: true, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: '0D9488' } }, alignment: { horizontal: 'center', wrapText: true }, border: borderHeader }
      };
    });
    cpRow++;

    if (teamLabAssessments.length === 0) {
      wsLabCp[XLSX.utils.encode_cell({ r: cpRow, c: 0 })] = { v: 'No checkpoint data available.', t: 's', s: { font: { italic: true } } };
      wsLabCp['!merges'].push({ s: { r: cpRow, c: 0 }, e: { r: cpRow, c: 8 } });
    } else {
      teamLabAssessments.forEach((la, laIdx) => {
        const laDateStr = safeFormatDate(la.assessmentDate || la.createdAt);
        const assessNum = `#${laIdx + 1}`;
        if (Array.isArray(la.sections) && la.sections.length > 0) {
          la.sections.forEach(sec => {
            if (Array.isArray(sec.checkpoints)) {
              sec.checkpoints.forEach((cp, cpIdx) => {
                const cpMax = cp.maxScore || (cp.type === 'points' ? 10 : 5);
                const cpScore = cp.score !== undefined ? cp.score : (cp.status === 'Pass' ? cpMax : 0);
                const cpIsPass = cp.status === 'Pass' || (cp.type === 'points' && cpScore >= 7);
                const cpIsNA = cp.status === 'N/A';
                const isZebra = cpIdx % 2 === 1;
                const rowBg = isZebra ? PALETTE.zebraBg : PALETTE.white;
                const cpRowData = [
                  assessNum,
                  laDateStr,
                  sec.sectionTitle,
                  cp.subSection || '-',
                  cp.name,
                  cp.status || (cp.type === 'points' ? (cpScore >= 7 ? 'Pass' : 'Fail') : 'Pass'),
                  `${cpScore}`,
                  `${cpMax}`,
                  cp.notes || '-'
                ];
                cpRowData.forEach((val, c) => {
                  const isResultCol = c === 5;
                  wsLabCp[XLSX.utils.encode_cell({ r: cpRow, c })] = {
                    v: val, t: 's',
                    s: {
                      font: { sz: 9 },
                      alignment: { horizontal: c === 0 || c === 1 || c === 5 || c === 6 || c === 7 ? 'center' : 'left', vertical: 'center', wrapText: true },
                      fill: isResultCol && cpIsPass ? { fgColor: { rgb: 'DCFCE7' } } :
                            isResultCol && !cpIsPass && !cpIsNA ? { fgColor: { rgb: 'FEE2E2' } } :
                            isResultCol && cpIsNA ? { fgColor: { rgb: 'F3F4F6' } } :
                            { fgColor: { rgb: rowBg } },
                      border: borderThin
                    }
                  };
                });
                cpRow++;
              });
            }
          });
        }
      });
    }

    wsLabCp['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 32 }, { wch: 36 }, { wch: 56 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 45 }
    ];
    fixSheetRange(wsLabCp);
    XLSX.utils.book_append_sheet(wb, wsLabCp, 'Lab - Checkpoints Detail');

    // ── SHEET 9: Safety Clearances & Equipment Inspection ───────────────────
    const wsLabSafe = XLSX.utils.aoa_to_sheet([[]]); wsLabSafe['!merges'] = [];
    wsLabSafe['A1'] = {
      v: `SAFETY CLEARANCES & EQUIPMENT INSPECTION LOG - ${team.teamName.toUpperCase()}`,
      t: 's',
      s: { font: { bold: true, sz: 13, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: '581C87' } }, alignment: { horizontal: 'center' } }
    };
    wsLabSafe['A2'] = {
      v: '6 Mandatory Safety Certifications (DD, ES, FA, FF, RA, WAH) & Equipment Readiness per Assessment',
      t: 's',
      s: { font: { italic: true, sz: 10, color: { rgb: 'EDE9FE' } }, fill: { fgColor: { rgb: '7C3AED' } }, alignment: { horizontal: 'center' } }
    };
    wsLabSafe['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } });
    wsLabSafe['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } });

    let safeRow = 3;

    if (teamLabAssessments.length === 0) {
      wsLabSafe[XLSX.utils.encode_cell({ r: safeRow, c: 0 })] = { v: 'No assessments recorded.', t: 's', s: { font: { italic: true } } };
    } else {
      teamLabAssessments.forEach((la, laIdx) => {
        const laDateStr = safeFormatDate(la.assessmentDate || la.createdAt);
        const laCertsObj = la.certificates || {};

        // Assessment banner
        wsLabSafe[XLSX.utils.encode_cell({ r: safeRow, c: 0 })] = {
          v: `ASSESSMENT #${laIdx + 1} — DATE: ${laDateStr} | ASSESSOR: ${la.conductedBy || la.assessorId?.name || 'Quality Team'}`,
          t: 's',
          s: { font: { bold: true, sz: 10, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: '581C87' } }, alignment: { horizontal: 'left' } }
        };
        wsLabSafe['!merges'].push({ s: { r: safeRow, c: 0 }, e: { r: safeRow, c: 8 } });
        safeRow++;

        // Safety clearances header
        wsLabSafe[XLSX.utils.encode_cell({ r: safeRow, c: 0 })] = { v: 'SAFETY CLEARANCES', t: 's', s: { font: { bold: true, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: '7C3AED' } }, alignment: { horizontal: 'center' }, border: borderHeader } };
        wsLabSafe['!merges'].push({ s: { r: safeRow, c: 0 }, e: { r: safeRow, c: 8 } });
        safeRow++;

        const safeHdrs = ['Code', 'Certificate Title', 'Safety Scope & Description', 'Verification Status', 'Clearance Level'];
        safeHdrs.forEach((h, c) => {
          wsLabSafe[XLSX.utils.encode_cell({ r: safeRow, c })] = {
            v: h, t: 's',
            s: { font: { bold: true, sz: 9, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.slateDark } }, alignment: { horizontal: 'center' }, border: borderHeader }
          };
        });
        safeRow++;

        const certDescriptions = {
          dd: 'Safe vehicle operation, hazard perception & driving compliance',
          es: 'Safe handling of electrical sources, grounding & arc flash prevention',
          fa: 'Emergency first response, CPR & basic trauma management',
          ff: 'Fire extinguisher operation, fire risk prevention & evacuation',
          ra: 'Job site hazard identification, risk evaluation & control measures',
          wah: 'Ladder safety, harness usage, pole climbing & fall arrest systems'
        };

        CERT_DEFS_LOCAL.forEach((cd, cdIdx) => {
          const isCert = Boolean(laCertsObj[cd.key]);
          const certRowBg = cdIdx % 2 === 1 ? PALETTE.zebraBg : PALETTE.white;
          const certRowData = [cd.code, cd.title, certDescriptions[cd.key] || '-', isCert ? 'Certified' : 'Not Certified', isCert ? 'Authorized' : 'Clearance Missing'];
          certRowData.forEach((val, c) => {
            const isStatusCol = c === 3;
            wsLabSafe[XLSX.utils.encode_cell({ r: safeRow, c })] = {
              v: val, t: 's',
              s: {
                font: { sz: 9, bold: c === 0 || isStatusCol },
                alignment: { horizontal: c === 0 || c === 3 || c === 4 ? 'center' : 'left', vertical: 'center' },
                fill: isStatusCol && isCert ? { fgColor: { rgb: 'DCFCE7' } } :
                      isStatusCol && !isCert ? { fgColor: { rgb: 'FEE2E2' } } :
                      { fgColor: { rgb: certRowBg } },
                border: borderThin
              }
            };
          });
          safeRow++;
        });

        // Equipment checklist (if present)
        const eqList = la.equipmentChecklist || [];
        if (eqList.length > 0) {
          safeRow++;
          wsLabSafe[XLSX.utils.encode_cell({ r: safeRow, c: 0 })] = { v: 'EQUIPMENT & TOOLS INSPECTION CHECKLIST', t: 's', s: { font: { bold: true, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: 'EA580C' } }, alignment: { horizontal: 'center' }, border: borderHeader } };
          wsLabSafe['!merges'].push({ s: { r: safeRow, c: 0 }, e: { r: safeRow, c: 8 } });
          safeRow++;
          const eqHdrs = ['#', 'Tool / Equipment Name', 'Readiness & Calibration Status', 'Inspection Result', 'Notes'];
          eqHdrs.forEach((h, c) => {
            wsLabSafe[XLSX.utils.encode_cell({ r: safeRow, c })] = {
              v: h, t: 's',
              s: { font: { bold: true, sz: 9, color: { rgb: PALETTE.white } }, fill: { fgColor: { rgb: PALETTE.slateDark } }, alignment: { horizontal: 'center' }, border: borderHeader }
            };
          });
          safeRow++;
          eqList.forEach((eq, eIdx) => {
            const isGood = eq.status === 'Valid' || eq.status === 'Available';
            const eqRowBg = eIdx % 2 === 1 ? PALETTE.zebraBg : PALETTE.white;
            const eqRowData = [`#${eIdx + 1}`, eq.toolName, eq.status || 'Valid', isGood ? 'Approved for Field Use' : eq.status === 'Need Maintenance' ? 'Maintenance Required' : 'Non-Compliant / Missing', eq.notes || '-'];
            eqRowData.forEach((val, c) => {
              wsLabSafe[XLSX.utils.encode_cell({ r: safeRow, c })] = {
                v: val, t: 's',
                s: {
                  font: { sz: 9 },
                  alignment: { horizontal: c === 0 || c === 2 || c === 3 ? 'center' : 'left', vertical: 'center', wrapText: true },
                  fill: c === 3 && isGood ? { fgColor: { rgb: 'DCFCE7' } } :
                        c === 3 && !isGood ? { fgColor: { rgb: 'FEE2E2' } } :
                        { fgColor: { rgb: eqRowBg } },
                  border: borderThin
                }
              };
            });
            safeRow++;
          });
        }
        safeRow += 2; // spacer between assessments
      });
    }

    wsLabSafe['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 55 }, { wch: 22 }, { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    fixSheetRange(wsLabSafe);
    XLSX.utils.book_append_sheet(wb, wsLabSafe, 'Lab - Safety & Equipment');

    // ─────────────────────────────────────────────────────────────────────────
    // SHEET 10: Deep Raw Audit Data
    // ─────────────────────────────────────────────────────────────────────────
    const detailedData = teamTasks.map(t => mapItemToExcelRow(t, 'task'));
    if (detailedData.length > 0) {
      const wsRaw = XLSX.utils.json_to_sheet(detailedData);
      applySnapshotStyles(wsRaw, detailedData);
      fixSheetRange(wsRaw);
      XLSX.utils.book_append_sheet(wb, wsRaw, "Deep Raw Audit Data");
    }

    // Save File
    const sanitizedName = (team.teamName || 'Field_Team').replace(/[\\/:*?"<>|]/g, '_').trim() || 'Field_Team';
    XLSX.writeFile(wb, `${sanitizedName}_Quality_Performance_DeepDive_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleExportIndividualTeam = (team) => {
    exportPremiumTeamQualityReport(team);
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

  const activeCustomerIssues = useMemo(() => {
    return selectedTeam ? filteredCustomerIssues : filteredIssuesByDate;
  }, [selectedTeam, filteredCustomerIssues, filteredIssuesByDate]);

  const stats = useMemo(() => {
    const issuesToProcess = activeCustomerIssues;
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
    technicalTasks.forEach(task => {
      const score = task.evaluationScore !== undefined && task.evaluationScore !== null ? Number(task.evaluationScore) : 0;
      if (score > 0) {
        const normalized = score <= 10 ? score * 10 : score;
        if (normalized <= 60) {
          technicalDetractors++;
          totalDetractors++;
        } else if (normalized <= 80) {
          technicalNeutrals++;
          totalNeutrals++;
        }
      }
    });

    const technicalTasksCount = technicalTasks.length;

    // Calculations based on requirements
    let totalDispatchSum = 0;
    let dispatchCount = 0;
    let totalResSum = 0;
    let resCount = 0;
    let totalLifecycleSum = 0;
    let lifecycleCount = 0;

    issuesToProcess.forEach(i => {
      const reportDate = i.date ? new Date(i.date) : (i.createdAt ? new Date(i.createdAt) : null);
      if (!reportDate) return;

      const now = new Date();
      const dispatchedDate = i.dispatchedAt ? new Date(i.dispatchedAt) : null;
      const isDispatched = i.dispatched === 'yes' && dispatchedDate;
      const isResolved = i.solved === 'yes' && i.resolveDate;
      const resolveDate = isResolved ? new Date(i.resolveDate) : null;

      // 1. Dispatch Speed
      if (isDispatched) {
        const diff = (dispatchedDate - reportDate) / (1000 * 60 * 60 * 24);
        totalDispatchSum += Math.max(0, diff);
        dispatchCount++;
      } else {
        const diff = (now - reportDate) / (1000 * 60 * 60 * 24);
        totalDispatchSum += Math.max(0, diff);
        dispatchCount++;
      }

      // 2. Resolution Speed
      if (isResolved) {
        const baseStart = isDispatched ? dispatchedDate : reportDate;
        const diff = (resolveDate - baseStart) / (1000 * 60 * 60 * 24);
        totalResSum += Math.max(0, diff);
        resCount++;
      } else {
        const diff = (now - reportDate) / (1000 * 60 * 60 * 24);
        totalResSum += Math.max(0, diff);
        resCount++;
      }

      // 3. Lifecycle Time
      if (isResolved) {
        const diff = (resolveDate - reportDate) / (1000 * 60 * 60 * 24);
        totalLifecycleSum += Math.max(0, diff);
        lifecycleCount++;
      } else {
        const diff = (now - reportDate) / (1000 * 60 * 60 * 24);
        totalLifecycleSum += Math.max(0, diff);
        lifecycleCount++;
      }
    });

    const avgDispatchTime = dispatchCount > 0 ? (totalDispatchSum / dispatchCount).toFixed(1) : "0.0";
    const avgResolutionTime = resCount > 0 ? (totalResSum / resCount).toFixed(1) : "0.0";
    const avgLifecycleTime = lifecycleCount > 0 ? (totalLifecycleSum / lifecycleCount).toFixed(1) : "0.0";

    return {
      totalTransactions,
      totalIssuesHighlighted,
      closed,
      open,
      resolutionRate,
      issueDensity,
      avgDispatchTime,
      avgResolutionTime,
      avgLifecycleTime,
      technicalDetractors,
      technicalNeutrals,
      totalDetractors,
      totalNeutrals,
      technicalTasksCount,
      customerIssuesCount: totalTransactions,
    };
  }, [activeCustomerIssues, technicalTasks, quizResults, jobAssessments]);

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
    const agingIssues = activeCustomerIssues.filter(i => i.solved === 'no' && (new Date() - new Date(i.date || i.createdAt)) / (1000 * 60 * 60 * 24) > 7).length;
    const expressResolution = activeCustomerIssues.filter(i => {
      if (!i.resolveDate || !i.date) return false;
      return (new Date(i.resolveDate) - new Date(i.date)) / (1000 * 60 * 60 * 24) <= 1;
    }).length;

    return {
      highAgingCount: agingIssues,
      expressResolutionCount: expressResolution,
      avgResolutionSpeed: stats.avgResolutionTime,
      reliabilityIndex: Math.max(0, 100 - (agingIssues * 5)).toFixed(1)
    };
  }, [activeCustomerIssues, stats]);

  const allActivities = useMemo(() => {
    const activities = [
      ...activeCustomerIssues.map(i => ({
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
  }, [activeCustomerIssues, technicalTasks, quizResults, jobAssessments, labAssessments]);

  const trendData = useMemo(() => {
    const countsByDate = {};
    const sortedIssues = [...activeCustomerIssues].sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));

    sortedIssues.forEach(issue => {
      const dVal = issue.date || issue.createdAt;
      if (!dVal) return;
      const d = new Date(dVal);
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
  }, [activeCustomerIssues, trendTimeframe, trendChartType]);

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
    activeCustomerIssues.forEach(issue => {
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
  }, [activeCustomerIssues]);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'bottom', labels: { color: tok('--text-secondary'), usePointStyle: true, padding: 20 } }
    }
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { color: tok('--text') } } },
    scales: {
      x: { ticks: { color: tok('--text-secondary') }, grid: { color: '#3d3d3d' } },
      y: { beginAtZero: true, ticks: { color: tok('--text-secondary'), stepSize: 1, precision: 0 }, grid: { color: '#3d3d3d' } }
    }
  };

  const MiniStatCard = ({ title, value, icon, color, subtext }) => (
    <Card sx={{ bgcolor: tok('--surface'), color: tok('--text'), height: '100%', border: '1px solid #3d3d3d' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
        <Box>
          <Typography variant="body2" color={tok('--text-secondary')} gutterBottom>{title}</Typography>
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

      // Build teamMap keyed by normalizeText(teamName) to guarantee 100% UNIQUE teams!
      const teamMap = new Map();

      const addToMap = (team) => {
        if (!team) return;
        const normName = normalizeText(team.teamName);
        if (!normName) return;

        if (teamMap.has(normName)) {
          // If existing entry is placeholder/discovered and new one is real DB, merge & upgrade it
          const existing = teamMap.get(normName);
          if ((existing.isDiscovered || existing.teamCompany === 'N/A') && (!team.isDiscovered && team.teamCompany !== 'N/A')) {
            teamMap.set(normName, { ...existing, ...team });
          }
          return;
        }
        teamMap.set(normName, team);
      };

      // Priority 1: Official DB records (richest data)
      dbTeams.forEach(addToMap);

      // Priority 2: Quiz teams
      quizTeams.forEach(addToMap);

      // Priority 3: Discovery from global tasks & sessions (orphan teams only)
      const techTasks = Array.isArray(allTechnicalTasksGlobal) ? allTechnicalTasksGlobal : [];
      const sessions = Array.isArray(allTrainingSessionsGlobal) ? allTrainingSessionsGlobal : [];

      techTasks.forEach(task => {
        const name = task.teamName;
        const normName = normalizeText(name);
        if (normName && !teamMap.has(normName)) {
          const key = `disc_${normName}`;
          teamMap.set(normName, { _id: key, teamName: name, teamCompany: 'Discovery (Task Log)', isDiscovered: true });
        }
      });

      sessions.forEach(s => {
        (s.participants || []).forEach(p => {
          const name = p.teamName || p.name || (typeof p === 'string' ? p : null);
          const id = p._id || p.teamId;
          const normName = name ? normalizeText(name) : null;
          if (normName && !teamMap.has(normName)) {
            const key = id?.toString() || `disc_${normName}`;
            teamMap.set(normName, { _id: key, teamName: name || 'Unknown Team', teamCompany: 'Discovery (Session)', isDiscovered: true });
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

        // Keep all existing teams keyed by normalized name
        prev.forEach(t => {
          if (!t) return;
          const normName = normalizeText(t.teamName);
          if (normName && !teamMap.has(normName)) {
            teamMap.set(normName, t);
          }
        });

        // Discover orphan teams from tasks
        techTasks.forEach(task => {
          const name = task.teamName;
          const normName = normalizeText(name);
          if (normName && !teamMap.has(normName)) {
            const key = `disc_${normName}`;
            teamMap.set(normName, { _id: key, teamName: name, teamCompany: 'Discovery (Task Log)', isDiscovered: true });
          }
        });

        // Discover orphan teams from sessions
        sessions.forEach(s => {
          (s.participants || []).forEach(p => {
            const name = p.teamName || p.name || (typeof p === 'string' ? p : null);
            const id = p._id || p.teamId;
            const normName = name ? normalizeText(name) : null;
            if (normName && !teamMap.has(normName)) {
              const key = id?.toString() || `disc_${normName}`;
              teamMap.set(normName, { _id: key, teamName: name || 'Unknown Team', teamCompany: 'Discovery (Session)', isDiscovered: true });
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
      const [techRes, issuesRes, sessionsRes, quizRes, jobRes, labRes] = await Promise.all([
        api.get("/tasks/get-all-tasks", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        }),
        api.get("/customer-issues", {
          params: { limit: 10000 },
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        }),
        api.get("/training-sessions", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        }),
        api.get("/quiz-results").catch(() => ({ data: [] })),
        api.get("/on-the-job-assessments").catch(() => ({ data: [] })),
        api.get("/lab-assessments").catch(() => ({ data: [] }))
      ]);
      const techData = techRes.data?.data || techRes.data || [];
      setAllTechnicalTasksGlobal(Array.isArray(techData) ? techData : []);
      const issuesData = issuesRes.data?.data || issuesRes.data || [];
      setAllCustomerIssuesGlobal(Array.isArray(issuesData) ? issuesData : []);
      const sessionsData = sessionsRes.data?.data || sessionsRes.data || [];
      setAllTrainingSessionsGlobal(Array.isArray(sessionsData) ? sessionsData : []);
      const qData = quizRes.data?.data || quizRes.data || [];
      setAllQuizResultsGlobal(Array.isArray(qData) ? qData : []);
      const jData = jobRes.data?.data || jobRes.data || [];
      setAllJobAssessmentsGlobal(Array.isArray(jData) ? jData : []);
      const lData = labRes.data?.data || labRes.data || [];
      setAllLabAssessmentsGlobal(Array.isArray(lData) ? lData : []);
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

          // 1. Quizzes
          try {
            const quizRes = await api.get(`/quiz-results?teamId=${selectedTeam._id}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
            });
            setQuizResults(quizRes.data?.data || []);
          } catch (e) {
            setQuizResults([]);
          }

          // 2. OTJ Assessments
          try {
            const jobRes = await api.get(`/on-the-job-assessments/field-team/${selectedTeam._id}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
            });
            setJobAssessments(jobRes.data || []);
          } catch (e) {
            setJobAssessments([]);
          }

          // 3. Customer Issues
          try {
            const issuesRes = await api.get('/customer-issues', {
              params: { limit: 10000 },
              headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
            });
            const allIssues = issuesRes.data?.data || issuesRes.data || [];
            setCustomerIssues(allIssues.filter(issue => isIssueForTeam(issue, selectedTeam)));
          } catch (err) {
            console.error("Error fetching customer issues:", err);
            setCustomerIssues([]);
          }

          // 4. Lab Assessments
          let teamLab = [];
          try {
            const labRes = await api.get(`/lab-assessments/team/${selectedTeam._id}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
            });
            teamLab = Array.isArray(labRes.data) ? labRes.data : [];
          } catch (err) {
            console.error("Error fetching lab assessments:", err);
          }

          // Fallback to allLabAssessmentsGlobal matching selectedTeam
          if (teamLab.length === 0 && Array.isArray(allLabAssessmentsGlobal)) {
            const sName = normalizeText(selectedTeam.teamName);
            const sId = selectedTeam._id?.toString();
            teamLab = allLabAssessmentsGlobal.filter(a => {
              const aId = (a.fieldTeamId?._id || a.fieldTeamId)?.toString();
              const aName = normalizeText(a.fieldTeamName || a.fieldTeamId?.teamName);
              return (sId && aId === sId) || (sName && aName === sName);
            });
          }
          setLabAssessments(teamLab);

          // 5. NPS Tickets
          try {
            const techRes = await api.get(`/tasks/get-all-tasks`, {
              headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
            });
            const tData = techRes.data?.data || techRes.data || [];
            setTechnicalTasks(tData.filter(task => isTaskForTeam(task, selectedTeam)));
          } catch (err) {
            console.error("Error fetching NPS tickets:", err);
          }

        } catch (error) {
          console.error("Error fetching assessments:", error);
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
      setTechnicalTasks([]);
    }
  }, [selectedTeam, allLabAssessmentsGlobal]);

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
    if (!labAssessments || labAssessments.length === 0) return;
    if (labAssessments.length === 1) {
      exportIndividualLabAssessmentReport(labAssessments[0]);
    } else {
      exportMasterLabAssessmentReport(labAssessments, selectedTeam?.teamName);
    }
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
    exportPremiumTeamQualityReport(selectedTeam);
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

  // Helper function to build detailed task export data
  const buildDetailedTaskRow = (task) => {
    const formatArrayValue = (value) => {
      if (Array.isArray(value) && value.length) return value.join(', ');
      if (typeof value === 'string' && value.trim()) return value.trim();
      return 'N/A';
    };

    return {
      SLID: task.slid || 'N/A',
      'Request Number': task.requestNumber || 'N/A',
      'Customer Name': task.customerName || 'N/A',
      'PIS Date': task.pisDate ? format(new Date(task.pisDate), 'yyyy-MM-dd') : 'N/A',
      Priority: task.priority || 'N/A',
      Status: task.validationStatus || 'N/A',
      'Reason': formatArrayValue(task.reason),
      'Sub Reason': formatArrayValue(task.subReason),
      'Root Cause': formatArrayValue(task.rootCause),
      'Ownership': formatArrayValue(task.responsible),
      'Team Accountability': formatArrayValue(task.teamAccountability),
      'Field Team': task.teamName || 'N/A',
      'Score': task.evaluationScore !== null && task.evaluationScore !== 'N/A' ? task.evaluationScore : 'N/A',
      'Category': task.categoryOfDissatisfaction || 'N/A',
      'Interview Date': task.interviewDate ? format(new Date(task.interviewDate), 'yyyy-MM-dd') : 'N/A',
      'Created Date': task.createdAt ? format(new Date(task.createdAt), 'yyyy-MM-dd') : 'N/A'
    };
  };

  const handleExportFilteredTeamTasks = () => {
    if (!filteredTechnicalTasks || filteredTechnicalTasks.length === 0) {
      alert('No tasks to export');
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Helper styling functions
    const applyHeaderStyle = (ws, range, bg = "1F2937", color = "FFFFFF") => {
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) continue;
          ws[cellAddress].s = {
            font: { bold: true, color: { rgb: color } },
            fill: { fgColor: { rgb: bg } },
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
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
            alignment: { vertical: "center", wrapText: true },
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

    // 1. Summary Sheet
    const auditedTasks = filteredTechnicalTasks.filter(t => t.evaluationScore !== null && t.evaluationScore !== 'N/A');
    const detractors = auditedTasks.filter(t => Number(t.evaluationScore) <= 6).length;
    const neutrals = auditedTasks.filter(t => Number(t.evaluationScore) >= 7 && Number(t.evaluationScore) <= 8).length;
    const promoters = Math.max(0, auditedTasks.length - (detractors + neutrals));

    const summaryData = [
      ["FIELD TEAM TASKS AUDIT SUMMARY", "", ""],
      ["Team Name:", selectedTeam?.teamName || "N/A", ""],
      ["Export Date:", format(new Date(), 'dd/MM/yyyy HH:mm'), ""],
      ["Reported Period:", "Selected Period", ""],
      ["", "", ""],
      ["TASK SUMMARY METRICS", "VALUE", "PERCENTAGE"],
      ["Total Tasks", filteredTechnicalTasks.length, "-"],
      ["Audited Tasks", auditedTasks.length, filteredTechnicalTasks.length > 0 ? `${((auditedTasks.length / filteredTechnicalTasks.length) * 100).toFixed(1)}%` : "0%"],
      ["Detractors (Score ≤ 6)", detractors, auditedTasks.length > 0 ? `${((detractors / auditedTasks.length) * 100).toFixed(1)}%` : "0%"],
      ["Neutrals (Score 7-8)", neutrals, auditedTasks.length > 0 ? `${((neutrals / auditedTasks.length) * 100).toFixed(1)}%` : "0%"],
      ["Promoters (Score ≥ 9)", promoters, auditedTasks.length > 0 ? `${((promoters / auditedTasks.length) * 100).toFixed(1)}%` : "0%"],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    addTitle(wsSummary, `Field Team Tasks - ${selectedTeam?.teamName || "Team"}`, 2);
    wsSummary['A2'].s = { font: { bold: true } };
    wsSummary['A3'].s = { font: { bold: true } };
    applyHeaderStyle(wsSummary, { s: { r: 5, c: 0 }, e: { r: 5, c: 2 } }, "374151");
    applyDataRowStyle(wsSummary, { s: { r: 5, c: 0 }, e: { r: 10, c: 2 } });
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];
    fixSheetRange(wsSummary);

    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Summary');

    // 2. Detailed Tasks Sheet
    const detailedData = filteredTechnicalTasks.map(buildDetailedTaskRow);
    const wsDetailed = XLSX.utils.json_to_sheet(detailedData);

    // Apply styling to detailed sheet
    if (detailedData.length > 0) {
      const headerRange = { s: { r: 0, c: 0 }, e: { r: 0, c: Object.keys(detailedData[0]).length - 1 } };
      applyHeaderStyle(wsDetailed, headerRange, "3B5998");
      applyDataRowStyle(wsDetailed, { s: { r: 0, c: 0 }, e: { r: detailedData.length, c: Object.keys(detailedData[0]).length - 1 } });
    }

    // Auto-size columns
    const range = XLSX.utils.decode_range(wsDetailed['!ref'] || 'A1');
    const cols = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLen = 12;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cell = wsDetailed[XLSX.utils.encode_cell({ r: R, c: C })];
        if (cell && cell.v) {
          const len = cell.v.toString().length;
          if (len > maxLen) maxLen = len;
        }
      }
      cols.push({ wch: Math.min(maxLen + 2, 40) }); // Cap at 40 for readability
    }
    wsDetailed['!cols'] = cols;
    fixSheetRange(wsDetailed);

    XLSX.utils.book_append_sheet(workbook, wsDetailed, 'Tasks');

    // 3. RCA Analysis Sheet
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

    const wsRCA = XLSX.utils.aoa_to_sheet([[]]);
    wsRCA['A1'] = { v: `ROOT CAUSE ANALYSIS - ${selectedTeam?.teamName || "Team"}`, t: 's', s: { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E3A8A" } }, alignment: { horizontal: "center", vertical: "center" } } };
    if (!wsRCA['!merges']) wsRCA['!merges'] = [];
    wsRCA['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });

    const tree = getHierarchicalRCA(filteredTechnicalTasks);
    const headers = ["Reason", "Total", "Sub Reason", "Cases", "Root Cause", "Cases"];
    headers.forEach((h, i) => {
      const cell = XLSX.utils.encode_cell({ r: 2, c: i });
      wsRCA[cell] = { v: h, t: 's', s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "374151" } }, alignment: { horizontal: "center" }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } };
    });

    let currentR = 3;
    Object.entries(tree).sort((a, b) => b[1].total - a[1].total).forEach(([reason, reasonData]) => {
      const reasonStartR = currentR;
      Object.entries(reasonData.subs).sort((a, b) => b[1].total - a[1].total).forEach(([sub, subData]) => {
        const subStartR = currentR;
        Object.entries(subData.rcs).sort((a, b) => b[1] - a[1]).forEach(([rc, rcCount]) => {
          XLSX.utils.sheet_add_aoa(wsRCA, [[rc]], { origin: { r: currentR, c: 4 } });
          XLSX.utils.sheet_add_aoa(wsRCA, [[rcCount]], { origin: { r: currentR, c: 5 } });
          currentR++;
        });
        const subEndR = currentR - 1;
        XLSX.utils.sheet_add_aoa(wsRCA, [[sub]], { origin: { r: subStartR, c: 2 } });
        wsRCA[XLSX.utils.encode_cell({ r: subStartR, c: 2 })].s = { alignment: { vertical: 'center', horizontal: 'center', wrapText: true } };
        XLSX.utils.sheet_add_aoa(wsRCA, [[subData.total]], { origin: { r: subStartR, c: 3 } });
        wsRCA[XLSX.utils.encode_cell({ r: subStartR, c: 3 })].s = { alignment: { vertical: 'center', horizontal: 'center' } };
        
        if (subEndR > subStartR) {
          wsRCA['!merges'].push({ s: { r: subStartR, c: 2 }, e: { r: subEndR, c: 2 } });
          wsRCA['!merges'].push({ s: { r: subStartR, c: 3 }, e: { r: subEndR, c: 3 } });
        }
      });
      const reasonEndR = currentR - 1;
      XLSX.utils.sheet_add_aoa(wsRCA, [[reason]], { origin: { r: reasonStartR, c: 0 } });
      wsRCA[XLSX.utils.encode_cell({ r: reasonStartR, c: 0 })].s = { font: { bold: true }, alignment: { vertical: 'center', horizontal: 'center', wrapText: true } };
      XLSX.utils.sheet_add_aoa(wsRCA, [[reasonData.total]], { origin: { r: reasonStartR, c: 1 } });
      wsRCA[XLSX.utils.encode_cell({ r: reasonStartR, c: 1 })].s = { font: { bold: true }, alignment: { vertical: 'center', horizontal: 'center' } };
      
      if (reasonEndR > reasonStartR) {
        wsRCA['!merges'].push({ s: { r: reasonStartR, c: 0 }, e: { r: reasonEndR, c: 0 } });
        wsRCA['!merges'].push({ s: { r: reasonStartR, c: 1 }, e: { r: reasonEndR, c: 1 } });
      }
    });

    // Add borders
    for (let r = 2; r < currentR; r++) {
      for (let c = 0; c < 6; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!wsRCA[addr]) wsRCA[addr] = { v: '', t: 's' };
        if (!wsRCA[addr].s) wsRCA[addr].s = {};
        wsRCA[addr].s.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        if (!wsRCA[addr].s.alignment) wsRCA[addr].s.alignment = { vertical: 'center' };
      }
    }

    wsRCA['!cols'] = [{ wch: 25 }, { wch: 8 }, { wch: 25 }, { wch: 8 }, { wch: 30 }, { wch: 8 }];
    fixSheetRange(wsRCA);

    XLSX.utils.book_append_sheet(workbook, wsRCA, 'RCA Analysis');

    // Write the file
    XLSX.writeFile(workbook, `${selectedTeam?.teamName || "Team"}_Filtered_Tasks_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
            backgroundColor: tok('--surface'),
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
            backgroundColor: tok('--surface'),
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
        if (!isTaskForTeam(t, team)) return false;

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
        if (!isIssueForTeam(i, team)) return false;

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

  const selectableTeams = useMemo(() => {
    if (activeTeamsOnly) {
      return fieldTeams.filter(t => t.isActive !== false && !t.isTerminated && !t.isResigned && !t.isSuspended && !t.isOnLeave);
    }
    return fieldTeams;
  }, [fieldTeams, activeTeamsOnly]);

  const activeTeamsCount = useMemo(() => {
    return fieldTeams.filter(t => t.isActive !== false && !t.isTerminated && !t.isResigned && !t.isSuspended && !t.isOnLeave).length;
  }, [fieldTeams]);

  const selectedTeamTokenStats = useMemo(() => {
    if (!selectedTeam) return { totalToken: 0, fulfillmentPct: 0, monthlyTokens: {} };
    const tName = normalizeText(selectedTeam.teamName);
    const tId = selectedTeam._id?.toString();
    const monthlyTokens = {};
    for (let m = 1; m <= 12; m++) monthlyTokens[m] = 0;
    (teamSamplesTokens || []).forEach(st => {
      const matchName = normalizeText(st.teamName) === tName;
      const matchId = st.teamId && st.teamId.toString() === tId;
      if (matchName || matchId) {
        monthlyTokens[st.month] = (monthlyTokens[st.month] || 0) + (Number(st.sampleSize) || 0);
      }
    });
    const totalToken = Object.values(monthlyTokens).reduce((a, b) => a + b, 0);
    const totalEval = technicalTasks.length;
    const fulfillmentPct = totalToken > 0 ? ((totalEval / totalToken) * 100).toFixed(1) : '0.0';
    return { totalToken, fulfillmentPct, monthlyTokens };
  }, [selectedTeam, teamSamplesTokens, technicalTasks]);

  // ─────────────────────────────────────────────────────────────────────────
  // TEAMS QUALITY KPI MATRIX CALCULATIONS & STATE MEMOS
  // ─────────────────────────────────────────────────────────────────────────
  const teamsQualityMatrixData = useMemo(() => {
    if (!fieldTeams || fieldTeams.length === 0) return [];

    const isDateMatch = (dateStr) => {
      if (!dateStr || matrixDateFilterMode === 'all') return true;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return true;
      const now = new Date();
      const yr = d.getFullYear();
      const mo = d.getMonth();

      if (matrixDateFilterMode === 'this_month') {
        return yr === now.getFullYear() && mo === now.getMonth();
      }
      if (matrixDateFilterMode === 'last_month') {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const lastMonthYr = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return yr === lastMonthYr && mo === lastMonth;
      }
      if (matrixDateFilterMode === 'this_quarter') {
        const currentQ = Math.floor(now.getMonth() / 3);
        const taskQ = Math.floor(mo / 3);
        return yr === now.getFullYear() && taskQ === currentQ;
      }
      if (matrixDateFilterMode === 'this_year') {
        return yr === now.getFullYear();
      }
      if (matrixDateFilterMode === 'custom') {
        if (matrixCustomStartDate && d < new Date(matrixCustomStartDate)) return false;
        if (matrixCustomEndDate && d > new Date(matrixCustomEndDate + 'T23:59:59')) return false;
        return true;
      }
      return true;
    };

    const getActiveMonths = () => {
      const now = new Date();
      if (matrixDateFilterMode === 'this_month') return [now.getMonth() + 1];
      if (matrixDateFilterMode === 'last_month') return [now.getMonth() === 0 ? 12 : now.getMonth()];
      if (matrixDateFilterMode === 'this_quarter') {
        const q = Math.floor(now.getMonth() / 3);
        return [q * 3 + 1, q * 3 + 2, q * 3 + 3];
      }
      if (matrixDateFilterMode === 'this_year' || matrixDateFilterMode === 'all') {
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      }
      if (matrixDateFilterMode === 'custom') {
        if (!matrixCustomStartDate || !matrixCustomEndDate) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        const s = new Date(matrixCustomStartDate);
        const e = new Date(matrixCustomEndDate);
        const months = new Set();
        let cur = new Date(s.getFullYear(), s.getMonth(), 1);
        while (cur <= e) {
          months.add(cur.getMonth() + 1);
          cur.setMonth(cur.getMonth() + 1);
        }
        return Array.from(months);
      }
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    };

    const activeMonths = getActiveMonths();

    // Deduplicate fieldTeams by normalized name to guarantee 100% unique rows
    const uniqueTeamsMap = new Map();
    fieldTeams.forEach(t => {
      if (!t) return;
      const norm = normalizeText(t.teamName);
      if (!norm) return;
      if (!uniqueTeamsMap.has(norm) || (uniqueTeamsMap.get(norm).isDiscovered && !t.isDiscovered)) {
        uniqueTeamsMap.set(norm, t);
      }
    });
    const uniqueTeams = Array.from(uniqueTeamsMap.values());

    return uniqueTeams.map(team => {
      const normName = normalizeText(team.teamName);
      const teamIdStr = team._id?.toString();

      // Original Tokens
      let origTokens = 0;
      (teamSamplesTokens || []).forEach(st => {
        const matchName = normalizeText(st.teamName) === normName;
        const matchId = st.teamId && st.teamId.toString() === teamIdStr;
        if (matchName || matchId) {
          if (activeMonths.includes(Number(st.month))) {
            origTokens += Number(st.sampleSize) || 0;
          }
        }
      });

      // Filter tasks for this team and date range
      const tTasks = (allTechnicalTasksGlobal || []).filter(t => {
        const match = normalizeText(t.teamName) === normName || (t.fieldTeam && t.fieldTeam.toString() === teamIdStr);
        if (!match) return false;
        const d = t.pisDate || t.interviewDate || t.createdAt;
        return isDateMatch(d);
      });

      const nonAccCount = tTasks.filter(t => !isTeamAccountable(t)).length;
      const adjTokens = Math.max(0, origTokens - nonAccCount);
      const accTasks = tTasks.filter(t => isTeamAccountable(t) && fieldContainsReach(t.responsible));
      const accCount = accTasks.length;
      const calcPromoters = Math.max(0, adjTokens - accCount);

      let accDet = 0;
      let accNeu = 0;
      accTasks.forEach(t => {
        const score = t.evaluationScore || 0;
        const norm = score <= 10 ? score * 10 : score;
        if (norm > 0) {
          if (norm <= 60) accDet++;
          else if (norm <= 80) accNeu++;
        }
      });

      const failureRate = adjTokens > 0 ? ((accCount / adjTokens) * 100).toFixed(1) : '0.0';
      const promoterShare = adjTokens > 0 ? ((calcPromoters / adjTokens) * 100).toFixed(1) : '0.0';
      const detractorRate = adjTokens > 0 ? ((accDet / adjTokens) * 100).toFixed(1) : '0.0';
      const neutralRate = adjTokens > 0 ? ((accNeu / adjTokens) * 100).toFixed(1) : '0.0';
      const nps = adjTokens > 0 ? (((calcPromoters - accDet) / adjTokens) * 100).toFixed(1) : '0.0';

      // Snags
      const tSnags = (allCustomerIssuesGlobal || []).filter(i => {
        if (!isIssueForTeam(i, team)) return false;
        const d = i.date || i.createdAt;
        return isDateMatch(d);
      });
      const closedSnags = tSnags.filter(s => s.solved === 'yes').length;
      const snagResolutionRate = tSnags.length > 0 ? Math.round((closedSnags / tSnags.length) * 100) : 100;

      // Assessments
      const teamQuizzes = (allQuizResultsGlobal || []).filter(q => normalizeText(q.teamName) === normName || (q.teamId && q.teamId.toString() === teamIdStr));
      const teamJobAssessments = (allJobAssessmentsGlobal || []).filter(j => normalizeText(j.teamName) === normName || (j.fieldTeam && j.fieldTeam.toString() === teamIdStr));
      const teamLabAssessments = (allLabAssessmentsGlobal || []).filter(l => normalizeText(l.teamName) === normName || (l.fieldTeam && l.fieldTeam.toString() === teamIdStr));

      const quizAvg = Math.round(calculateAverageScore(teamQuizzes));
      const jobAvg = Math.round(calculateAverageScore(teamJobAssessments));
      const labAvg = Math.round(calculateAverageScore(teamLabAssessments));

      const isActive = team.isActive !== false && !team.isTerminated && !team.isResigned && !team.isSuspended && !team.isOnLeave;

      return {
        team,
        teamId: team._id,
        teamName: team.teamName,
        teamCode: team.teamCode || 'N/A',
        teamCompany: team.teamCompany || 'N/A',
        isActive,
        statusLabel: getTeamStatusLabel(team),
        totalTasks: tTasks.length,
        originalTokens: origTokens,
        nonAccountableCount: nonAccCount,
        adjustedTokens: adjTokens,
        accountableCount: accCount,
        failureRate: Number(failureRate),
        calculatedPromoters: calcPromoters,
        promoterShare: Number(promoterShare),
        accDetractors: accDet,
        detractorRate: Number(detractorRate),
        accNeutrals: accNeu,
        neutralRate: Number(neutralRate),
        totalSnags: tSnags.length,
        closedSnags,
        snagResolutionRate,
        quizAvg,
        jobAvg,
        labAvg,
        teamNps: Number(nps)
      };
    });
  }, [fieldTeams, teamSamplesTokens, allTechnicalTasksGlobal, allCustomerIssuesGlobal, allQuizResultsGlobal, allJobAssessmentsGlobal, allLabAssessmentsGlobal, matrixDateFilterMode, matrixCustomStartDate, matrixCustomEndDate]);

  const uniqueMatrixCompanies = useMemo(() => {
    const companies = new Set();
    (fieldTeams || []).forEach(t => {
      if (t.teamCompany && t.teamCompany !== 'N/A' && t.teamCompany !== 'Discovery (Task Log)' && t.teamCompany !== 'Discovery (Session)') {
        companies.add(t.teamCompany);
      }
    });
    return Array.from(companies).sort();
  }, [fieldTeams]);

  const filteredAndSortedMatrixData = useMemo(() => {
    let list = [...teamsQualityMatrixData];

    // Status filter
    if (matrixStatusFilter === 'active') {
      list = list.filter(t => t.isActive);
    } else if (matrixStatusFilter === 'terminated') {
      list = list.filter(t => t.team.isTerminated);
    } else if (matrixStatusFilter === 'resigned') {
      list = list.filter(t => t.team.isResigned);
    } else if (matrixStatusFilter === 'suspended') {
      list = list.filter(t => t.team.isSuspended);
    } else if (matrixStatusFilter === 'on_leave') {
      list = list.filter(t => t.team.isOnLeave);
    }

    // Company filter
    if (matrixCompanyFilter !== 'all') {
      list = list.filter(t => t.teamCompany === matrixCompanyFilter);
    }

    // Search query
    if (matrixSearchQuery.trim()) {
      const q = matrixSearchQuery.toLowerCase().trim();
      list = list.filter(t =>
        (t.teamName || '').toLowerCase().includes(q) ||
        (t.teamCode || '').toLowerCase().includes(q) ||
        (t.teamCompany || '').toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      let aVal = a[matrixSort.field];
      let bVal = b[matrixSort.field];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
        return matrixSort.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      aVal = Number(aVal || 0);
      bVal = Number(bVal || 0);
      return matrixSort.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return list;
  }, [teamsQualityMatrixData, matrixStatusFilter, matrixCompanyFilter, matrixSearchQuery, matrixSort]);

  const matrixPortfolioTotals = useMemo(() => {
    const totalOrig = filteredAndSortedMatrixData.reduce((a, b) => a + b.originalTokens, 0);
    const totalNonAcc = filteredAndSortedMatrixData.reduce((a, b) => a + b.nonAccountableCount, 0);
    const totalAdj = filteredAndSortedMatrixData.reduce((a, b) => a + b.adjustedTokens, 0);
    const totalAcc = filteredAndSortedMatrixData.reduce((a, b) => a + b.accountableCount, 0);
    const totalPromoters = filteredAndSortedMatrixData.reduce((a, b) => a + b.calculatedPromoters, 0);
    const totalDet = filteredAndSortedMatrixData.reduce((a, b) => a + b.accDetractors, 0);
    const totalNeu = filteredAndSortedMatrixData.reduce((a, b) => a + b.accNeutrals, 0);
    const totalSnags = filteredAndSortedMatrixData.reduce((a, b) => a + b.totalSnags, 0);
    const totalClosedSnags = filteredAndSortedMatrixData.reduce((a, b) => a + b.closedSnags, 0);

    const validQuizTeams = filteredAndSortedMatrixData.filter(t => t.quizAvg > 0);
    const avgQuiz = validQuizTeams.length > 0 ? Math.round(validQuizTeams.reduce((a, b) => a + b.quizAvg, 0) / validQuizTeams.length) : 0;

    const validJobTeams = filteredAndSortedMatrixData.filter(t => t.jobAvg > 0);
    const avgJob = validJobTeams.length > 0 ? Math.round(validJobTeams.reduce((a, b) => a + b.jobAvg, 0) / validJobTeams.length) : 0;

    const validLabTeams = filteredAndSortedMatrixData.filter(t => t.labAvg > 0);
    const avgLab = validLabTeams.length > 0 ? Math.round(validLabTeams.reduce((a, b) => a + b.labAvg, 0) / validLabTeams.length) : 0;

    const failRate = totalAdj > 0 ? ((totalAcc / totalAdj) * 100).toFixed(1) : '0.0';
    const proShare = totalAdj > 0 ? ((totalPromoters / totalAdj) * 100).toFixed(1) : '0.0';
    const detRate = totalAdj > 0 ? ((totalDet / totalAdj) * 100).toFixed(1) : '0.0';
    const neuRate = totalAdj > 0 ? ((totalNeu / totalAdj) * 100).toFixed(1) : '0.0';
    const nps = totalAdj > 0 ? (((totalPromoters - totalDet) / totalAdj) * 100).toFixed(1) : '0.0';
    const snagResRate = totalSnags > 0 ? Math.round((totalClosedSnags / totalSnags) * 100) : 100;

    return {
      totalOrig,
      totalNonAcc,
      totalAdj,
      totalAcc,
      failRate,
      totalPromoters,
      proShare,
      totalDet,
      detRate,
      totalNeu,
      neuRate,
      totalSnags,
      totalClosedSnags,
      snagResRate,
      avgQuiz,
      avgJob,
      avgLab,
      nps
    };
  }, [filteredAndSortedMatrixData]);

  const handleExportQualityMatrixToExcel = () => {
    if (!filteredAndSortedMatrixData || filteredAndSortedMatrixData.length === 0) return;

    const PALETTE = {
      navyDark: "0F172A",
      slateDark: "1E293B",
      slateMedium: "334155",
      slateLight: "475569",
      slateMuted: "64748B",
      blueHeader: "1E40AF",
      blueSub: "3B82F6",
      blueBg: "EFF6FF",
      emeraldHeader: "065F46",
      emeraldBg: "ECFDF5",
      emeraldText: "047857",
      amberHeader: "92400E",
      amberBg: "FFFBEB",
      amberText: "B45309",
      roseHeader: "9F1239",
      roseBg: "FFF1F2",
      roseText: "BE123C",
      purpleHeader: "581C87",
      purpleBg: "FAF5FF",
      zebraBg: "F8FAFC",
      borderLight: "CBD5E1",
      white: "FFFFFF"
    };

    const borderThin = {
      top: { style: "thin", color: { rgb: PALETTE.borderLight } },
      bottom: { style: "thin", color: { rgb: PALETTE.borderLight } },
      left: { style: "thin", color: { rgb: PALETTE.borderLight } },
      right: { style: "thin", color: { rgb: PALETTE.borderLight } }
    };

    const borderHeader = {
      top: { style: "medium", color: { rgb: PALETTE.slateDark } },
      bottom: { style: "medium", color: { rgb: PALETTE.slateDark } },
      left: { style: "thin", color: { rgb: PALETTE.slateMedium } },
      right: { style: "thin", color: { rgb: PALETTE.slateMedium } }
    };

    const borderSummary = {
      top: { style: "medium", color: { rgb: PALETTE.navyDark } },
      bottom: { style: "double", color: { rgb: PALETTE.navyDark } },
      left: { style: "thin", color: { rgb: PALETTE.slateMedium } },
      right: { style: "thin", color: { rgb: PALETTE.slateMedium } }
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

    const wb = XLSX.utils.book_new();

    const headers = [
      'Rank',
      'Team Name',
      'Team Code',
      'Company / Contractor',
      'Operational Status',
      'Original Tokens (Quota)',
      'Non-Accountable Tasks (No)',
      'Adjusted Net Tokens',
      'Accountable Tasks (Yes)',
      'Acc. Failure Rate (%)',
      'Promoters (Calculated)',
      'Promoter Share (%)',
      'Acc. Detractors (≤6)',
      'Acc. Detractor % (Net)',
      'Acc. Neutrals (7-8)',
      'Acc. Neutral % (Net)',
      'Customer Snags (Total)',
      'Customer Snags (Closed)',
      'Snag Resolution Rate (%)',
      'Online Exam Score (%)',
      'OTJ Assessment (%)',
      'Lab Assessment (%)',
      'Team NPS'
    ];

    const aoa = [
      [`ALL FIELD TEAMS QUALITY & SAMPLING KPI BENCHMARK MATRIX - Period: ${matrixDateFilterMode.toUpperCase()}`],
      [],
      headers
    ];

    filteredAndSortedMatrixData.forEach((row, idx) => {
      aoa.push([
        idx + 1,
        row.teamName,
        row.teamCode,
        row.teamCompany,
        row.statusLabel,
        row.originalTokens,
        row.nonAccountableCount,
        row.adjustedTokens,
        row.accountableCount,
        `${row.failureRate}%`,
        row.calculatedPromoters,
        `${row.promoterShare}%`,
        row.accDetractors,
        `${row.detractorRate}%`,
        row.accNeutrals,
        `${row.neutralRate}%`,
        row.totalSnags,
        row.closedSnags,
        `${row.snagResolutionRate}%`,
        `${row.quizAvg}%`,
        `${row.jobAvg}%`,
        `${row.labAvg}%`,
        row.teamNps
      ]);
    });

    // Summary benchmark row
    aoa.push([
      'TOTAL',
      'ALL FILTERED TEAMS CUMULATIVE BENCHMARK',
      '-',
      '-',
      '-',
      matrixPortfolioTotals.totalOrig,
      matrixPortfolioTotals.totalNonAcc,
      matrixPortfolioTotals.totalAdj,
      matrixPortfolioTotals.totalAcc,
      `${matrixPortfolioTotals.failRate}%`,
      matrixPortfolioTotals.totalPromoters,
      `${matrixPortfolioTotals.proShare}%`,
      matrixPortfolioTotals.totalDet,
      `${matrixPortfolioTotals.detRate}%`,
      matrixPortfolioTotals.totalNeu,
      `${matrixPortfolioTotals.neuRate}%`,
      matrixPortfolioTotals.totalSnags,
      matrixPortfolioTotals.totalClosedSnags,
      `${matrixPortfolioTotals.snagResRate}%`,
      `${matrixPortfolioTotals.avgQuiz}%`,
      `${matrixPortfolioTotals.avgJob}%`,
      `${matrixPortfolioTotals.avgLab}%`,
      matrixPortfolioTotals.nps
    ]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }
    ];

    ws['A1'].s = {
      font: { bold: true, sz: 14, color: { rgb: PALETTE.white } },
      fill: { fgColor: { rgb: PALETTE.navyDark } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    headers.forEach((h, c) => {
      const cell = XLSX.utils.encode_cell({ r: 2, c });
      if (ws[cell]) {
        ws[cell].s = {
          font: { bold: true, color: { rgb: PALETTE.white } },
          fill: { fgColor: { rgb: PALETTE.slateDark } },
          alignment: { horizontal: 'center' },
          border: borderHeader
        };
      }
    });

    for (let r = 3; r < aoa.length - 1; r++) {
      const isZebra = r % 2 === 1;
      const rowBg = isZebra ? PALETTE.zebraBg : PALETTE.white;
      for (let c = 0; c < headers.length; c++) {
        const cell = XLSX.utils.encode_cell({ r, c });
        if (ws[cell]) {
          ws[cell].s = {
            alignment: { horizontal: c <= 4 ? 'left' : 'center' },
            fill: { fgColor: { rgb: rowBg } },
            border: borderThin
          };
        }
      }
    }

    const sumRowIdx = aoa.length - 1;
    for (let c = 0; c < headers.length; c++) {
      const cell = XLSX.utils.encode_cell({ r: sumRowIdx, c });
      if (ws[cell]) {
        ws[cell].s = {
          font: { bold: true, color: { rgb: PALETTE.white } },
          alignment: { horizontal: c <= 4 ? 'left' : 'center' },
          fill: { fgColor: { rgb: PALETTE.navyDark } },
          border: borderSummary
        };
      }
    }

    ws['!cols'] = [
      { wch: 8 }, { wch: 26 }, { wch: 14 }, { wch: 22 }, { wch: 16 },
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 },
      { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }
    ];

    fixSheetRange(ws);
    XLSX.utils.book_append_sheet(wb, ws, "Teams Quality KPI Matrix");
    XLSX.writeFile(wb, `Teams_Quality_KPI_Matrix_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ color: tok('--text'), fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Shield sx={{ color: colors.primary, fontSize: '1.3rem' }} />
              Select Target Field Team
            </Typography>
            <ToggleButtonGroup
              size="small"
              value={activeTeamsOnly ? "active" : "all"}
              exclusive
              onChange={(e, val) => {
                if (val !== null) setActiveTeamsOnly(val === "active");
              }}
              sx={{
                bgcolor: 'rgba(0,0,0,0.3)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                '& .MuiToggleButton-root': {
                  color: colors.textSecondary,
                  px: 2,
                  py: 0.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  border: 'none',
                  '&.Mui-selected': {
                    bgcolor: `${colors.primary}33`,
                    color: tok('--text'),
                    borderColor: colors.primary
                  }
                }
              }}
            >
              <ToggleButton value="active">
                Active Teams ({activeTeamsCount})
              </ToggleButton>
              <ToggleButton value="all">
                All Teams ({fieldTeams.length})
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Autocomplete
            options={selectableTeams}
            getOptionLabel={(option) => `${option.teamName} (${option.teamCompany || 'N/A'})`}
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
            renderOption={(props, option) => {
              const status = getTeamStatusLabel(option);
              const isAct = status === 'Active';
              return (
                <li {...props} key={option._id || option.teamName}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', py: 0.5 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: tok('--text') }}>
                        {option.teamName} {option.teamCode ? `[${option.teamCode}]` : ''}
                      </Typography>
                      <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                        {option.teamCompany || 'Company N/A'}
                      </Typography>
                    </Box>
                    <Chip
                      label={status}
                      size="small"
                      sx={{
                        bgcolor: isAct ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isAct ? '#22c55e' : '#f87171',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        height: 22
                      }}
                    />
                  </Box>
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={activeTeamsOnly ? "Select Active Field Team to Analyze" : "Select Field Team to Analyze (All Statuses)"}
                variant="outlined"
                placeholder="Search by team name or code..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderRadius: '12px',
                    color: tok('--text'),
                    '& fieldset': { borderColor: tok('--border') },
                    '&:hover fieldset': { borderColor: colors.primary },
                    '&.Mui-focused fieldset': { borderColor: colors.primary, borderWidth: '2px' },
                  },
                  '& .MuiInputLabel-root': { color: colors.textSecondary },
                  '& .MuiInputLabel-root.Mui-focused': { color: colors.primary }
                }}
              />
            )}
            PaperComponent={({ children }) => (
              <Paper sx={{ ...colors.glass, bgcolor: tok('--bg'), mt: 1 }}>{children}</Paper>
            )}
          />
        </Paper>

        {/* 8. LEADERBOARD (Visible only when no team is selected) */}
        {!selectedTeam && (
          <>
            <Box sx={{ animation: 'fadeIn 0.5s ease-in', mb: 6 }}>
              <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h4" sx={{ color: tok('--text'), fontWeight: 900, letterSpacing: -1 }}>
                    Team <span style={{ color: colors.primary }}>Leaderboard</span>
                  </Typography>
                  <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                    Global ranking of teams by total violations (NPS Detractors + Customer Issues)
                  </Typography>
                </Box>
                {loadingGlobal && <CircularProgress size={24} sx={{ color: colors.primary }} />}
              </Box>

              {/* Global View Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: tok('--border'), mb: 3 }}>
                <Tabs
                  value={globalTab}
                  onChange={(e, v) => setGlobalTab(v)}
                  sx={{
                    '& .MuiTab-root': { color: colors.textSecondary, textTransform: 'none', fontSize: '1rem', fontWeight: 500, minHeight: 48 },
                    '& .Mui-selected': { color: colors.primary },
                    '& .MuiTabs-indicator': { bgcolor: colors.primary }
                  }}
                >
                  <Tab label="Teams Quality KPI Matrix" icon={<Assessment />} iconPosition="start" />
                  <Tab label="Leaderboard" icon={<LeaderboardIcon />} iconPosition="start" />
                  <Tab label="Global Analytics" icon={<BarChartIconMUI />} iconPosition="start" />
                  <Tab label="Comparison Chart" icon={<Timeline />} iconPosition="start" />
                </Tabs>
              </Box>

              {/* TAB 0: TEAMS QUALITY KPI MATRIX */}
              {globalTab === 0 && (
                <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                  {/* Controls & Filter Toolbar */}
                  <Paper sx={{
                    p: 2.5,
                    mb: 3.5,
                    ...colors.glass,
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}>
                    {/* Top Row: Search, Status Filter, Company Filter, Export Button */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Box sx={{
                        flex: 1,
                        minWidth: '260px',
                        display: 'flex',
                        alignItems: 'center',
                        px: 2,
                        py: 0.8,
                        borderRadius: '12px',
                        bgcolor: tok('--overlay-subtle'),
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <SearchIcon sx={{ color: colors.primary, mr: 1.5, fontSize: '1.2rem' }} />
                        <TextField
                          placeholder="Search by Team Name, Code, Contractor..."
                          variant="standard"
                          fullWidth
                          value={matrixSearchQuery}
                          onChange={(e) => {
                            setMatrixSearchQuery(e.target.value);
                            setMatrixPage(0);
                          }}
                          InputProps={{
                            disableUnderline: true,
                            sx: { color: tok('--text'), fontSize: '0.95rem' }
                          }}
                        />
                        {matrixSearchQuery && (
                          <IconButton size="small" onClick={() => setMatrixSearchQuery('')} sx={{ color: colors.textSecondary }}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>

                      {/* Operational Status */}
                      <FormControl size="small" sx={{ minWidth: 170, bgcolor: tok('--overlay-subtle'), borderRadius: '12px' }}>
                        <Select
                          value={matrixStatusFilter}
                          onChange={(e) => {
                            setMatrixStatusFilter(e.target.value);
                            setMatrixPage(0);
                          }}
                          sx={{
                            color: tok('--text'),
                            fontSize: '0.9rem',
                            borderRadius: '12px',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: tok('--border') },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.primary }
                          }}
                        >
                          <MenuItem value="active">Active Teams Only</MenuItem>
                          <MenuItem value="all">All Teams (Incl. Inactive)</MenuItem>
                          <MenuItem value="terminated">Terminated Teams</MenuItem>
                          <MenuItem value="resigned">Resigned Teams</MenuItem>
                          <MenuItem value="suspended">Suspended Teams</MenuItem>
                          <MenuItem value="on_leave">On Leave Teams</MenuItem>
                        </Select>
                      </FormControl>

                      {/* Company Filter */}
                      <FormControl size="small" sx={{ minWidth: 170, bgcolor: tok('--overlay-subtle'), borderRadius: '12px' }}>
                        <Select
                          value={matrixCompanyFilter}
                          onChange={(e) => {
                            setMatrixCompanyFilter(e.target.value);
                            setMatrixPage(0);
                          }}
                          sx={{
                            color: tok('--text'),
                            fontSize: '0.9rem',
                            borderRadius: '12px',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: tok('--border') },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.primary }
                          }}
                        >
                          <MenuItem value="all">All Contractors</MenuItem>
                          {uniqueMatrixCompanies.map(c => (
                            <MenuItem key={c} value={c}>{c}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Export to Excel */}
                      <Button
                        variant="contained"
                        startIcon={<TableChartIcon />}
                        onClick={handleExportQualityMatrixToExcel}
                        sx={{
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: tok('--text'),
                          fontWeight: 700,
                          textTransform: 'none',
                          px: 2.5,
                          py: 1,
                          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)'
                          }
                        }}
                      >
                        Export Matrix to Excel
                      </Button>
                    </Box>

                    {/* Date Customization Row */}
                    <Box sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      pt: 1.5,
                      borderTop: '1px solid rgba(255,255,255,0.06)'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, mr: 1, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                          Period:
                        </Typography>
                        {[
                          { id: 'all', label: 'All Time' },
                          { id: 'this_month', label: 'This Month' },
                          { id: 'last_month', label: 'Last Month' },
                          { id: 'this_quarter', label: 'This Quarter' },
                          { id: 'this_year', label: 'This Year' },
                          { id: 'custom', label: 'Custom Range' }
                        ].map(mode => (
                          <Chip
                            key={mode.id}
                            label={mode.label}
                            clickable
                            size="small"
                            onClick={() => {
                              setMatrixDateFilterMode(mode.id);
                              setMatrixPage(0);
                            }}
                            sx={{
                              bgcolor: matrixDateFilterMode === mode.id ? alpha(colors.primary, 0.25) : 'rgba(255,255,255,0.05)',
                              color: matrixDateFilterMode === mode.id ? '#c4b5fd' : colors.textSecondary,
                              borderColor: matrixDateFilterMode === mode.id ? colors.primary : 'transparent',
                              borderWidth: 1,
                              borderStyle: 'solid',
                              fontWeight: matrixDateFilterMode === mode.id ? 700 : 500,
                              '&:hover': { bgcolor: alpha(colors.primary, 0.18) }
                            }}
                          />
                        ))}
                      </Box>

                      {/* Custom Date Pickers */}
                      {matrixDateFilterMode === 'custom' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <TextField
                            size="small"
                            type="date"
                            label="Start Date"
                            value={matrixCustomStartDate}
                            onChange={(e) => {
                              setMatrixCustomStartDate(e.target.value);
                              setMatrixPage(0);
                            }}
                            InputLabelProps={{ shrink: true, sx: { color: colors.textSecondary } }}
                            inputProps={{ sx: { color: tok('--text'), fontSize: '0.85rem' } }}
                            sx={{
                              width: 155,
                              '& .MuiOutlinedInput-root': {
                                bgcolor: tok('--overlay-subtle'),
                                borderRadius: '10px',
                                '& fieldset': { borderColor: tok('--border') }
                              }
                            }}
                          />
                          <Typography sx={{ color: colors.textSecondary, fontSize: '0.85rem' }}>to</Typography>
                          <TextField
                            size="small"
                            type="date"
                            label="End Date"
                            value={matrixCustomEndDate}
                            onChange={(e) => {
                              setMatrixCustomEndDate(e.target.value);
                              setMatrixPage(0);
                            }}
                            InputLabelProps={{ shrink: true, sx: { color: colors.textSecondary } }}
                            inputProps={{ sx: { color: tok('--text'), fontSize: '0.85rem' } }}
                            sx={{
                              width: 155,
                              '& .MuiOutlinedInput-root': {
                                bgcolor: tok('--overlay-subtle'),
                                borderRadius: '10px',
                                '& fieldset': { borderColor: tok('--border') }
                              }
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  </Paper>

                  {/* 9 EXECUTIVE SUMMARY KPI CARDS (MATCHING ATTACHMENT 1) */}
                  <Grid container spacing={2} sx={{ mb: 4 }}>
                    {/* 1. Original Tokens */}
                    <Grid item xs={12} sm={6} md={3} lg={2.66}>
                      <Card sx={{
                        p: 2.2,
                        height: '100%',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0.04) 100%)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="caption" sx={{ color: '#a5b4fc', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            ORIGINAL SAMPLES TOKEN
                          </Typography>
                          <Avatar sx={{ bgcolor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', width: 34, height: 34 }}>
                            <Assignment fontSize="small" />
                          </Avatar>
                        </Box>
                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 900, color: tok('--text'), mb: 0.5 }}>
                            {matrixPortfolioTotals.totalOrig} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#a5b4fc' }}>Tokens</span>
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                            Assigned Quality Sampling Quota
                          </Typography>
                        </Box>
                      </Card>
                    </Grid>

                    {/* 2. Non-Accountable Tasks */}
                    <Grid item xs={12} sm={6} md={3} lg={2.66}>
                      <Card sx={{
                        p: 2.2,
                        height: '100%',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="caption" sx={{ color: '#fcd34d', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            NON-ACCOUNTABLE TASKS (NO)
                          </Typography>
                          <Avatar sx={{ bgcolor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', width: 34, height: 34 }}>
                            <CancelIcon fontSize="small" />
                          </Avatar>
                        </Box>
                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 900, color: tok('--text'), mb: 0.5 }}>
                            {matrixPortfolioTotals.totalNonAcc} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#fcd34d' }}>Tasks</span>
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                            Deducted from Quota / Other Owners
                          </Typography>
                        </Box>
                      </Card>
                    </Grid>

                    {/* 3. Adjusted Samples Token */}
                    <Grid item xs={12} sm={6} md={3} lg={2.66}>
                      <Card sx={{
                        p: 2.2,
                        height: '100%',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(14, 165, 233, 0.04) 100%)',
                        border: '1px solid rgba(14, 165, 233, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="caption" sx={{ color: '#7dd3fc', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            ADJUSTED SAMPLES TOKEN
                          </Typography>
                          <Avatar sx={{ bgcolor: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8', width: 34, height: 34 }}>
                            <VerifiedUser fontSize="small" />
                          </Avatar>
                        </Box>
                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 900, color: tok('--text'), mb: 0.5 }}>
                            {matrixPortfolioTotals.totalAdj} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#7dd3fc' }}>Net Tokens</span>
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                            Original ({matrixPortfolioTotals.totalOrig}) - Non-Acc ({matrixPortfolioTotals.totalNonAcc})
                          </Typography>
                        </Box>
                      </Card>
                    </Grid>

                    {/* 4. Accountable Tasks (Yes) */}
                    <Grid item xs={12} sm={6} md={3} lg={4}>
                      <Card sx={{
                        p: 2.2,
                        height: '100%',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.04) 100%)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="caption" sx={{ color: '#fca5a5', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            ACCOUNTABLE TASKS (YES)
                          </Typography>
                          <Avatar sx={{ bgcolor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', width: 34, height: 34 }}>
                            <Gavel fontSize="small" />
                          </Avatar>
                        </Box>
                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 900, color: '#f87171', mb: 0.5 }}>
                            {matrixPortfolioTotals.totalAcc} <span style={{ fontSize: '1rem', fontWeight: 600, color: tok('--text') }}>Tasks</span>
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            <strong>{matrixPortfolioTotals.failRate}% Failure Rate</strong> on Net Tokens ({matrixPortfolioTotals.totalDet} Det / {matrixPortfolioTotals.totalNeu} Neu)
                          </Typography>
                        </Box>
                      </Card>
                    </Grid>

                    {/* 5. Promoters (Calculated) */}
                    <Grid item xs={12} sm={6} md={3} lg={4}>
                      <Card sx={{
                        p: 2.2,
                        height: '100%',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.04) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="caption" sx={{ color: '#6ee7b7', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            PROMOTERS (CALCULATED)
                          </Typography>
                          <Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', width: 34, height: 34 }}>
                            <ThumbUp fontSize="small" />
                          </Avatar>
                        </Box>
                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 900, color: '#34d399', mb: 0.5 }}>
                            {matrixPortfolioTotals.totalPromoters} <span style={{ fontSize: '1rem', fontWeight: 600, color: tok('--text') }}>Promoters</span>
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            <strong>{matrixPortfolioTotals.proShare}% Promoter Share</strong> | Net ({matrixPortfolioTotals.totalAdj}) - Acc ({matrixPortfolioTotals.totalAcc})
                          </Typography>
                        </Box>
                      </Card>
                    </Grid>

                    {/* 6. Accountable Detractors */}
                    <Grid item xs={12} sm={6} md={3} lg={4}>
                      <Card sx={{
                        p: 2.2,
                        height: '100%',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.12) 0%, rgba(225, 29, 72, 0.04) 100%)',
                        border: '1px solid rgba(225, 29, 72, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="caption" sx={{ color: '#fda4af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            ACCOUNTABLE DETRACTORS
                          </Typography>
                          <Avatar sx={{ bgcolor: 'rgba(225, 29, 72, 0.2)', color: '#fb7185', width: 34, height: 34 }}>
                            <TrendingDown fontSize="small" />
                          </Avatar>
                        </Box>
                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 900, color: '#fb7185', mb: 0.5 }}>
                            {matrixPortfolioTotals.totalDet} <span style={{ fontSize: '1rem', fontWeight: 600, color: tok('--text') }}>Detractors</span>
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            Score ≤ 6/10 ({matrixPortfolioTotals.detRate}% of Net Tokens)
                          </Typography>
                        </Box>
                      </Card>
                    </Grid>

                    {/* 7. Accountable Neutrals */}
                    <Grid item xs={12} sm={6} md={3} lg={4}>
                      <Card sx={{
                        p: 2.2,
                        height: '100%',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.12) 0%, rgba(234, 179, 8, 0.04) 100%)',
                        border: '1px solid rgba(234, 179, 8, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="caption" sx={{ color: '#fde047', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            ACCOUNTABLE NEUTRALS
                          </Typography>
                          <Avatar sx={{ bgcolor: 'rgba(234, 179, 8, 0.2)', color: '#facc15', width: 34, height: 34 }}>
                            <TrendingFlat fontSize="small" />
                          </Avatar>
                        </Box>
                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 900, color: '#facc15', mb: 0.5 }}>
                            {matrixPortfolioTotals.totalNeu} <span style={{ fontSize: '1rem', fontWeight: 600, color: tok('--text') }}>Neutrals</span>
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            Score 7-8/10 ({matrixPortfolioTotals.neuRate}% of Net Tokens)
                          </Typography>
                        </Box>
                      </Card>
                    </Grid>

                    {/* 8. Customer Snags */}
                    <Grid item xs={12} sm={6} md={3} lg={4}>
                      <Card sx={{
                        p: 2.2,
                        height: '100%',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.12) 0%, rgba(249, 115, 22, 0.04) 100%)',
                        border: '1px solid rgba(249, 115, 22, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="caption" sx={{ color: '#fdba74', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            CUSTOMER SNAGS & COMPLAINTS
                          </Typography>
                          <Avatar sx={{ bgcolor: 'rgba(249, 115, 22, 0.2)', color: '#fb923c', width: 34, height: 34 }}>
                            <BugReport fontSize="small" />
                          </Avatar>
                        </Box>
                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 900, color: tok('--text'), mb: 0.5 }}>
                            {matrixPortfolioTotals.totalSnags} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#fdba74' }}>Snags</span>
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            {matrixPortfolioTotals.snagResRate}% Solved ({matrixPortfolioTotals.totalClosedSnags} Closed Cases)
                          </Typography>
                        </Box>
                      </Card>
                    </Grid>

                    {/* 9. Online Exam Proficiency */}
                    <Grid item xs={12} sm={6} md={3} lg={4}>
                      <Card sx={{
                        p: 2.2,
                        height: '100%',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(168, 85, 247, 0.04) 100%)',
                        border: '1px solid rgba(168, 85, 247, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="caption" sx={{ color: '#d8b4fe', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            ONLINE EXAM SCORE
                          </Typography>
                          <Avatar sx={{ bgcolor: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', width: 34, height: 34 }}>
                            <Quiz fontSize="small" />
                          </Avatar>
                        </Box>
                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 900, color: '#c084fc', mb: 0.5 }}>
                            {matrixPortfolioTotals.avgQuiz}%
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            Average Portfolio Theoretical Proficiency
                          </Typography>
                        </Box>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* ALL TEAMS QUALITY & SAMPLING MATRIX TABLE */}
                  <TableContainer component={Paper} sx={{
                    ...colors.glass,
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    overflowX: 'auto',
                    mb: 4
                  }}>
                    <Table sx={{ minWidth: 1200 }}>
                      <TableHead sx={{ bgcolor: tok('--overlay-subtle') }}>
                        <TableRow>
                          <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.8rem', py: 2 }}>#</TableCell>
                          
                          <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.8rem' }}>
                            <TableSortLabel
                              active={matrixSort.field === 'teamName'}
                              direction={matrixSort.field === 'teamName' ? matrixSort.direction : 'asc'}
                              onClick={() => {
                                setMatrixSort({
                                  field: 'teamName',
                                  direction: matrixSort.field === 'teamName' && matrixSort.direction === 'asc' ? 'desc' : 'asc'
                                });
                              }}
                              sx={{ '& .MuiTableSortLabel-icon': { color: `${colors.primary} !important` } }}
                            >
                              Team Details
                            </TableSortLabel>
                          </TableCell>

                          <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.8rem' }}>
                            <TableSortLabel
                              active={matrixSort.field === 'originalTokens'}
                              direction={matrixSort.field === 'originalTokens' ? matrixSort.direction : 'desc'}
                              onClick={() => {
                                setMatrixSort({
                                  field: 'originalTokens',
                                  direction: matrixSort.field === 'originalTokens' && matrixSort.direction === 'desc' ? 'asc' : 'desc'
                                });
                              }}
                              sx={{ '& .MuiTableSortLabel-icon': { color: `${colors.primary} !important` } }}
                            >
                              Original Quota
                            </TableSortLabel>
                          </TableCell>

                          <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.8rem' }}>
                            <TableSortLabel
                              active={matrixSort.field === 'nonAccountableCount'}
                              direction={matrixSort.field === 'nonAccountableCount' ? matrixSort.direction : 'desc'}
                              onClick={() => {
                                setMatrixSort({
                                  field: 'nonAccountableCount',
                                  direction: matrixSort.field === 'nonAccountableCount' && matrixSort.direction === 'desc' ? 'asc' : 'desc'
                                });
                              }}
                              sx={{ '& .MuiTableSortLabel-icon': { color: `${colors.primary} !important` } }}
                            >
                              Non-Acc (No)
                            </TableSortLabel>
                          </TableCell>

                          <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.8rem' }}>
                            <TableSortLabel
                              active={matrixSort.field === 'adjustedTokens'}
                              direction={matrixSort.field === 'adjustedTokens' ? matrixSort.direction : 'desc'}
                              onClick={() => {
                                setMatrixSort({
                                  field: 'adjustedTokens',
                                  direction: matrixSort.field === 'adjustedTokens' && matrixSort.direction === 'desc' ? 'asc' : 'desc'
                                });
                              }}
                              sx={{ '& .MuiTableSortLabel-icon': { color: `${colors.primary} !important` } }}
                            >
                              Adjusted Net
                            </TableSortLabel>
                          </TableCell>

                          <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.8rem' }}>
                            <TableSortLabel
                              active={matrixSort.field === 'accountableCount'}
                              direction={matrixSort.field === 'accountableCount' ? matrixSort.direction : 'desc'}
                              onClick={() => {
                                setMatrixSort({
                                  field: 'accountableCount',
                                  direction: matrixSort.field === 'accountableCount' && matrixSort.direction === 'desc' ? 'asc' : 'desc'
                                });
                              }}
                              sx={{ '& .MuiTableSortLabel-icon': { color: `${colors.primary} !important` } }}
                            >
                              Acc. Tasks (Yes)
                            </TableSortLabel>
                          </TableCell>

                          <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.8rem' }}>
                            <TableSortLabel
                              active={matrixSort.field === 'calculatedPromoters'}
                              direction={matrixSort.field === 'calculatedPromoters' ? matrixSort.direction : 'desc'}
                              onClick={() => {
                                setMatrixSort({
                                  field: 'calculatedPromoters',
                                  direction: matrixSort.field === 'calculatedPromoters' && matrixSort.direction === 'desc' ? 'asc' : 'desc'
                                });
                              }}
                              sx={{ '& .MuiTableSortLabel-icon': { color: `${colors.primary} !important` } }}
                            >
                              Promoters (Calc)
                            </TableSortLabel>
                          </TableCell>

                          <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.8rem' }}>
                            <TableSortLabel
                              active={matrixSort.field === 'accDetractors'}
                              direction={matrixSort.field === 'accDetractors' ? matrixSort.direction : 'desc'}
                              onClick={() => {
                                setMatrixSort({
                                  field: 'accDetractors',
                                  direction: matrixSort.field === 'accDetractors' && matrixSort.direction === 'desc' ? 'asc' : 'desc'
                                });
                              }}
                              sx={{ '& .MuiTableSortLabel-icon': { color: `${colors.primary} !important` } }}
                            >
                              Acc. Detractors (≤6)
                            </TableSortLabel>
                          </TableCell>

                          <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.8rem' }}>
                            <TableSortLabel
                              active={matrixSort.field === 'accNeutrals'}
                              direction={matrixSort.field === 'accNeutrals' ? matrixSort.direction : 'desc'}
                              onClick={() => {
                                setMatrixSort({
                                  field: 'accNeutrals',
                                  direction: matrixSort.field === 'accNeutrals' && matrixSort.direction === 'desc' ? 'asc' : 'desc'
                                });
                              }}
                              sx={{ '& .MuiTableSortLabel-icon': { color: `${colors.primary} !important` } }}
                            >
                              Acc. Neutrals (7-8)
                            </TableSortLabel>
                          </TableCell>

                          <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.8rem' }}>
                            <TableSortLabel
                              active={matrixSort.field === 'totalSnags'}
                              direction={matrixSort.field === 'totalSnags' ? matrixSort.direction : 'desc'}
                              onClick={() => {
                                setMatrixSort({
                                  field: 'totalSnags',
                                  direction: matrixSort.field === 'totalSnags' && matrixSort.direction === 'desc' ? 'asc' : 'desc'
                                });
                              }}
                              sx={{ '& .MuiTableSortLabel-icon': { color: `${colors.primary} !important` } }}
                            >
                              Customer Snags
                            </TableSortLabel>
                          </TableCell>

                          <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.8rem' }}>
                            <TableSortLabel
                              active={matrixSort.field === 'quizAvg'}
                              direction={matrixSort.field === 'quizAvg' ? matrixSort.direction : 'desc'}
                              onClick={() => {
                                setMatrixSort({
                                  field: 'quizAvg',
                                  direction: matrixSort.field === 'quizAvg' && matrixSort.direction === 'desc' ? 'asc' : 'desc'
                                });
                              }}
                              sx={{ '& .MuiTableSortLabel-icon': { color: `${colors.primary} !important` } }}
                            >
                              Online Exam
                            </TableSortLabel>
                          </TableCell>

                          <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.8rem' }}>
                            <TableSortLabel
                              active={matrixSort.field === 'jobAvg'}
                              direction={matrixSort.field === 'jobAvg' ? matrixSort.direction : 'desc'}
                              onClick={() => {
                                setMatrixSort({
                                  field: 'jobAvg',
                                  direction: matrixSort.field === 'jobAvg' && matrixSort.direction === 'desc' ? 'asc' : 'desc'
                                });
                              }}
                              sx={{ '& .MuiTableSortLabel-icon': { color: `${colors.primary} !important` } }}
                            >
                              OTJ Score
                            </TableSortLabel>
                          </TableCell>

                          <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.8rem' }}>
                            <TableSortLabel
                              active={matrixSort.field === 'labAvg'}
                              direction={matrixSort.field === 'labAvg' ? matrixSort.direction : 'desc'}
                              onClick={() => {
                                setMatrixSort({
                                  field: 'labAvg',
                                  direction: matrixSort.field === 'labAvg' && matrixSort.direction === 'desc' ? 'asc' : 'desc'
                                });
                              }}
                              sx={{ '& .MuiTableSortLabel-icon': { color: `${colors.primary} !important` } }}
                            >
                              Lab Score
                            </TableSortLabel>
                          </TableCell>

                          <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.8rem' }}>
                            <TableSortLabel
                              active={matrixSort.field === 'teamNps'}
                              direction={matrixSort.field === 'teamNps' ? matrixSort.direction : 'desc'}
                              onClick={() => {
                                setMatrixSort({
                                  field: 'teamNps',
                                  direction: matrixSort.field === 'teamNps' && matrixSort.direction === 'desc' ? 'asc' : 'desc'
                                });
                              }}
                              sx={{ '& .MuiTableSortLabel-icon': { color: `${colors.primary} !important` } }}
                            >
                              Team NPS
                            </TableSortLabel>
                          </TableCell>

                          <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.8rem' }}>Action</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {filteredAndSortedMatrixData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={15} align="center" sx={{ py: 6, color: colors.textSecondary }}>
                              No field teams matched the selected filters.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAndSortedMatrixData
                            .slice(matrixPage * matrixRowsPerPage, matrixPage * matrixRowsPerPage + matrixRowsPerPage)
                            .map((row, idx) => {
                              const rank = matrixPage * matrixRowsPerPage + idx + 1;
                              return (
                                <TableRow
                                  key={row.teamId || row.teamName}
                                  hover
                                  sx={{
                                    transition: 'all 0.2s',
                                    '&:hover': { bgcolor: tok('--overlay-subtle') },
                                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                                  }}
                                >
                                  {/* Rank */}
                                  <TableCell sx={{ color: colors.textSecondary, fontWeight: 600, fontSize: '0.85rem' }}>
                                    {rank}
                                  </TableCell>

                                  {/* Team Details */}
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                      <Avatar sx={{ bgcolor: alpha(colors.primary, 0.15), color: colors.primary, width: 34, height: 34, fontSize: '0.85rem', fontWeight: 700 }}>
                                        {row.teamName ? row.teamName.charAt(0).toUpperCase() : 'T'}
                                      </Avatar>
                                      <Box>
                                        <Typography
                                          onClick={() => navigate(`/fieldTeams-portal/${row.teamId}`)}
                                          sx={{
                                            color: tok('--text'),
                                            fontWeight: 700,
                                            fontSize: '0.92rem',
                                            cursor: 'pointer',
                                            '&:hover': { color: colors.primary, textDecoration: 'underline' }
                                          }}
                                        >
                                          {row.teamName}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                                          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                            {row.teamCompany} • {row.teamCode}
                                          </Typography>
                                          <Chip
                                            label={row.statusLabel}
                                            size="small"
                                            sx={{
                                              height: 18,
                                              fontSize: '0.65rem',
                                              fontWeight: 700,
                                              bgcolor: row.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                              color: row.isActive ? '#34d399' : '#f87171',
                                              border: `1px solid ${row.isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                            }}
                                          />
                                        </Box>
                                      </Box>
                                    </Box>
                                  </TableCell>

                                  {/* Original Tokens */}
                                  <TableCell align="center">
                                    <Typography sx={{ color: '#a5b4fc', fontWeight: 700, fontSize: '0.9rem' }}>
                                      {row.originalTokens}
                                    </Typography>
                                  </TableCell>

                                  {/* Non-Accountable (No) */}
                                  <TableCell align="center">
                                    <Chip
                                      label={row.nonAccountableCount}
                                      size="small"
                                      sx={{
                                        fontWeight: 700,
                                        bgcolor: row.nonAccountableCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)',
                                        color: row.nonAccountableCount > 0 ? '#fbbf24' : colors.textSecondary,
                                        border: `1px solid ${row.nonAccountableCount > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.08)'}`
                                      }}
                                    />
                                  </TableCell>

                                  {/* Adjusted Net Tokens */}
                                  <TableCell align="center">
                                    <Typography sx={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.92rem' }}>
                                      {row.adjustedTokens}
                                    </Typography>
                                  </TableCell>

                                  {/* Accountable Tasks (Yes) */}
                                  <TableCell align="center">
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <Chip
                                        label={`${row.accountableCount} (${row.failureRate}%)`}
                                        size="small"
                                        sx={{
                                          fontWeight: 700,
                                          bgcolor: row.accountableCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                          color: row.accountableCount > 0 ? '#f87171' : '#34d399',
                                          border: `1px solid ${row.accountableCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                                        }}
                                      />
                                    </Box>
                                  </TableCell>

                                  {/* Promoters (Calculated) */}
                                  <TableCell align="center">
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <Chip
                                        label={`${row.calculatedPromoters} (${row.promoterShare}%)`}
                                        size="small"
                                        sx={{
                                          fontWeight: 700,
                                          bgcolor: 'rgba(16, 185, 129, 0.15)',
                                          color: '#34d399',
                                          border: '1px solid rgba(16, 185, 129, 0.3)'
                                        }}
                                      />
                                    </Box>
                                  </TableCell>

                                  {/* Accountable Detractors */}
                                  <TableCell align="center">
                                    <Typography sx={{ color: row.accDetractors > 0 ? '#fb7185' : colors.textSecondary, fontWeight: 700, fontSize: '0.88rem' }}>
                                      {row.accDetractors} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>({row.detractorRate}%)</span>
                                    </Typography>
                                  </TableCell>

                                  {/* Accountable Neutrals */}
                                  <TableCell align="center">
                                    <Typography sx={{ color: row.accNeutrals > 0 ? '#facc15' : colors.textSecondary, fontWeight: 700, fontSize: '0.88rem' }}>
                                      {row.accNeutrals} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>({row.neutralRate}%)</span>
                                    </Typography>
                                  </TableCell>

                                  {/* Customer Snags */}
                                  <TableCell align="center">
                                    <Typography sx={{ color: row.totalSnags > 0 ? '#fb923c' : colors.textSecondary, fontWeight: 700, fontSize: '0.88rem' }}>
                                      {row.totalSnags} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>({row.snagResolutionRate}% res)</span>
                                    </Typography>
                                  </TableCell>

                                  {/* Online Exam */}
                                  <TableCell align="center">
                                    <Chip
                                      label={row.quizAvg > 0 ? `${row.quizAvg}%` : 'N/A'}
                                      size="small"
                                      sx={{
                                        fontWeight: 700,
                                        bgcolor: row.quizAvg >= 85 ? 'rgba(16, 185, 129, 0.15)' : (row.quizAvg > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)'),
                                        color: row.quizAvg >= 85 ? '#34d399' : (row.quizAvg > 0 ? '#f87171' : colors.textSecondary),
                                        border: `1px solid ${row.quizAvg >= 85 ? 'rgba(16, 185, 129, 0.3)' : (row.quizAvg > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.08)')}`
                                      }}
                                    />
                                  </TableCell>

                                  {/* OTJ Score */}
                                  <TableCell align="center">
                                    <Chip
                                      label={row.jobAvg > 0 ? `${row.jobAvg}%` : 'N/A'}
                                      size="small"
                                      sx={{
                                        fontWeight: 700,
                                        bgcolor: row.jobAvg >= 85 ? 'rgba(16, 185, 129, 0.15)' : (row.jobAvg > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)'),
                                        color: row.jobAvg >= 85 ? '#34d399' : (row.jobAvg > 0 ? '#fbbf24' : colors.textSecondary),
                                        border: `1px solid ${row.jobAvg >= 85 ? 'rgba(16, 185, 129, 0.3)' : (row.jobAvg > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.08)')}`
                                      }}
                                    />
                                  </TableCell>

                                  {/* Lab Score */}
                                  <TableCell align="center">
                                    <Chip
                                      label={row.labAvg > 0 ? `${row.labAvg}%` : 'N/A'}
                                      size="small"
                                      sx={{
                                        fontWeight: 700,
                                        bgcolor: row.labAvg >= 85 ? 'rgba(16, 185, 129, 0.15)' : (row.labAvg > 0 ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.05)'),
                                        color: row.labAvg >= 85 ? '#34d399' : (row.labAvg > 0 ? '#c084fc' : colors.textSecondary),
                                        border: `1px solid ${row.labAvg >= 85 ? 'rgba(16, 185, 129, 0.3)' : (row.labAvg > 0 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.08)')}`
                                      }}
                                    />
                                  </TableCell>

                                  {/* Team NPS */}
                                  <TableCell align="center">
                                    <Typography sx={{
                                      fontWeight: 900,
                                      fontSize: '0.92rem',
                                      color: row.teamNps >= 50 ? '#34d399' : (row.teamNps >= 0 ? '#fbbf24' : '#f87171')
                                    }}>
                                      {row.teamNps}
                                    </Typography>
                                  </TableCell>

                                  {/* Action */}
                                  <TableCell align="center">
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => navigate(`/fieldTeams-portal/${row.teamId}`)}
                                      sx={{
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        py: 0.4,
                                        px: 1.5,
                                        textTransform: 'none',
                                        borderColor: tok('--border'),
                                        color: tok('--text'),
                                        '&:hover': { borderColor: colors.primary, bgcolor: alpha(colors.primary, 0.1) }
                                      }}
                                    >
                                      View Portal
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                        )}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    <TablePagination
                      rowsPerPageOptions={[10, 15, 25, 50, 100]}
                      component="div"
                      count={filteredAndSortedMatrixData.length}
                      rowsPerPage={matrixRowsPerPage}
                      page={matrixPage}
                      onPageChange={(e, newPage) => setMatrixPage(newPage)}
                      onRowsPerPageChange={(e) => {
                        setMatrixRowsPerPage(parseInt(e.target.value, 10));
                        setMatrixPage(0);
                      }}
                      sx={{
                        color: colors.textSecondary,
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        '& .MuiTablePagination-selectIcon': { color: colors.textSecondary },
                        '& .MuiIconButton-root': { color: colors.primary }
                      }}
                    />
                  </TableContainer>
                </Box>
              )}

              {/* TAB 1: LEADERBOARD */}
              {globalTab === 1 && (
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
                            sx: { color: tok('--text'), fontSize: '1rem', fontWeight: 300, letterSpacing: '0.5px' }
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
                            color: tok('--text'),
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
                              InputProps={{ disableUnderline: true, sx: { color: tok('--text'), fontWeight: 300 } }}
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
                              InputProps={{ disableUnderline: true, sx: { color: tok('--text'), fontWeight: 300 } }}
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
                              InputProps={{ disableUnderline: true, sx: { color: tok('--text'), fontWeight: 300 } }}
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
                              InputProps={{ disableUnderline: true, sx: { color: tok('--text'), fontWeight: 300 } }}
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
                      <TableHead sx={{ bgcolor: tok('--overlay-subtle') }}>
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
                                '&:hover': { bgcolor: tok('--overlay-subtle') },
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
                                  <Typography sx={{ color: tok('--text'), fontWeight: 300, fontSize: '0.85rem' }}>{team.teamName}</Typography>
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

              {/* TAB 2: GLOBAL ANALYTICS */}
              {globalTab === 2 && (
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
                      <Typography variant="body2" sx={{ color: tok('--text'), fontSize: '0.85rem' }}>
                        <span style={{ color: tok('--text-secondary') }}>Analyzing:</span> <span style={{ fontWeight: '800', color: '#3b82f6' }}>{globalAnalytics.totalProcessed}</span> <span style={{ color: tok('--text-secondary') }}>Tasks</span>
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
                            color: tok('--text-secondary'),
                            borderColor: tok('--border'),
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
                                '& .MuiOutlinedInput-root': { color: tok('--text'), fontSize: '0.8rem' },
                                '& .MuiInputLabel-root': { color: tok('--text-secondary'), fontSize: '0.8rem' }
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
                                color: tok('--text'), fontSize: '0.8rem',
                                '& fieldset': { borderColor: tok('--border') }
                              },
                              '& .MuiInputLabel-root': { color: tok('--text-secondary'), fontSize: '0.8rem' }
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
                                color: tok('--text'), fontSize: '0.8rem',
                                '& fieldset': { borderColor: tok('--border') }
                              },
                              '& .MuiInputLabel-root': { color: tok('--text-secondary'), fontSize: '0.8rem' }
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
                                '& .MuiOutlinedInput-root': { color: tok('--text'), fontSize: '0.8rem' },
                                '& .MuiInputLabel-root': { color: tok('--text-secondary'), fontSize: '0.8rem' }
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
                                '& .MuiOutlinedInput-root': { color: tok('--text'), fontSize: '0.8rem' },
                                '& .MuiInputLabel-root': { color: tok('--text-secondary'), fontSize: '0.8rem' }
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
                            <Typography variant="h6" fontWeight="800" color={tok('--text')} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.95rem' }}>
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
                              <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: tok('--overlay-subtle'), color: tok('--text-secondary'), fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)' } }}>
                                <TableCell>Customer Sentiment</TableCell>
                                <TableCell align="right">Hit Count</TableCell>
                                <TableCell align="right">Matrix Share</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {globalAnalytics.sentimentData.map((row) => (
                                <TableRow key={row.name} sx={{ '&:hover': { bgcolor: tok('--overlay-subtle') } }}>
                                  <TableCell sx={{ color: row.color, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.name}</TableCell>
                                  <TableCell align="right" sx={{ color: tok('--text'), fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.value}</TableCell>
                                  <TableCell align="right" sx={{
                                    bgcolor: getHeatmapColor(parseFloat(row.percentage), 0, 100, row.name === 'Promoters' ? 'green' : row.name === 'Neutrals' ? 'orange' : 'red'),
                                    color: tok('--text'), fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.05)'
                                  }}>
                                    {row.percentage}%
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow sx={{ bgcolor: tok('--overlay-subtle'), fontWeight: 'bold' }}>
                                <TableCell sx={{ color: tok('--text-secondary'), fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Total Audited</TableCell>
                                <TableCell align="right" sx={{ color: '#3b82f6', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{globalAnalytics.totalSamplesTaken}</TableCell>
                                <TableCell align="right" sx={{ color: '#3b82f6', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>100%</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>

                        <Box sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <Typography variant="subtitle2" color={tok('--text-secondary')} sx={{ mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            Total Audited Tasks
                          </Typography>
                          <Typography variant="h5" sx={{ color: tok('--text'), fontWeight: 800, mb: 0.5 }}>
                            {globalAnalytics.totalProcessed}
                          </Typography>
                          <Typography variant="body2" color={tok('--text-secondary')}>
                            {globalAnalytics.totalProcessed} Audited / {globalAnalytics.totalSamplesTarget} Target
                          </Typography>
                        </Box>

                        <Box sx={{ mt: 3 }}>
                          <Typography variant="subtitle2" color={tok('--text-secondary')} sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            Violation Cohorts
                          </Typography>
                          <TableContainer sx={{ maxHeight: 240, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { py: 1, fontSize: '0.75rem' } }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ bgcolor: '#111827', color: tok('--text-secondary'), fontWeight: 'bold' }}>Cohort</TableCell>
                                  <TableCell align="right" sx={{ bgcolor: '#111827', color: tok('--text-secondary'), fontWeight: 'bold' }}>Teams</TableCell>
                                  <TableCell align="right" sx={{ bgcolor: '#111827', color: tok('--text-secondary'), fontWeight: 'bold' }}>Active / Inactive</TableCell>
                                  <TableCell align="right" sx={{ bgcolor: '#111827', color: tok('--text-secondary'), fontWeight: 'bold' }}>Trained %</TableCell>
                                  <TableCell align="right" sx={{ bgcolor: '#111827', color: tok('--text-secondary'), fontWeight: 'bold' }}>Action</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {(globalAnalytics.fieldTeamCohorts || []).map((cohort) => (
                                  <TableRow key={cohort.label} sx={{ '&:hover': { bgcolor: tok('--overlay-subtle') } }}>
                                    <TableCell sx={{ color: tok('--text'), fontWeight: 700 }}>{cohort.label}</TableCell>
                                    <TableCell align="right" sx={{ color: tok('--text'), fontWeight: 700 }}>{cohort.teams}</TableCell>
                                    <TableCell align="right" sx={{ color: tok('--text'), fontWeight: 700 }}>
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
                                        sx={{ color: tok('--text'), borderColor: tok('--border'), textTransform: 'none', fontSize: '0.7rem', px: 1.5 }}
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
                            <RechartsTooltip contentStyle={{ backgroundColor: tok('--surface'), border: 'none', borderRadius: 8 }} />
                            <RechartsLegend verticalAlign="bottom" height={30} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Analytical Matrices removed */}


                  <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Divider sx={{ flex: 1, borderColor: tok('--border') }} />
                    <Typography variant="h6" sx={{ color: '#3b82f6', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>Advanced Analytics Charts & Tables</Typography>
                    <Divider sx={{ flex: 1, borderColor: tok('--border') }} />
                  </Box>

                  {/* Advanced Analytics Charts & Tables */}
                  <Grid container spacing={3}>
                    {/* Owner Analysis */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 3, ...colors.glass, borderRadius: 3, border: '1px solid rgba(59, 130, 246, 0.2)' }} elevation={0}>
                        <Typography variant="h6" fontWeight="700" mb={3} color={tok('--text')} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#94a3b8" fontSize={10} tick={{ fill: tok('--text-secondary') }} />
                            <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: tok('--text-secondary') }} />
                            <RechartsTooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <Paper sx={{ p: 1.5, bgcolor: tok('--surface'), border: '1px solid #334155', borderRadius: 2, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
                                      <Typography sx={{ color: tok('--text'), fontWeight: 'bold', fontSize: '0.8rem', mb: 0.5 }}>{label}</Typography>
                                      <Typography sx={{ color: '#3b82f6', fontSize: '0.75rem' }}>Count: <strong>{payload[0].value}</strong></Typography>
                                      <Typography sx={{ color: tok('--text-secondary'), fontSize: '0.7rem' }}>Contribution: {payload[0].payload.percentage}%</Typography>
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
                        <TableContainer sx={{ mt: 2, maxHeight: 200, overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: tok('--overlay-subtle'), borderRadius: '4px' } }}>
                          <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' } }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Owner</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Points</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Total</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>ITN</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Sub</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>%</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {globalAnalytics.detailedOwners.map((data) => (
                                <TableRow 
                                  key={data.name} 
                                  sx={{ 
                                    '&:hover': { bgcolor: tok('--overlay-subtle') },
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
                                      color: tok('--text-secondary'),
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
                                  <TableCell align="right" sx={{ color: tok('--text-secondary') }}>{data.percentage}%</TableCell>
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
                        <Typography variant="h6" fontWeight="700" mb={3} color={tok('--text')} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#94a3b8" fontSize={10} tick={{ fill: tok('--text-secondary') }} />
                            <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: tok('--text-secondary') }} />
                            <RechartsTooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <Paper sx={{ p: 1.5, bgcolor: tok('--surface'), border: '1px solid #334155', borderRadius: 2, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
                                      <Typography sx={{ color: tok('--text'), fontWeight: 'bold', fontSize: '0.8rem', mb: 0.5 }}>{label}</Typography>
                                      <Typography sx={{ color: '#0ea5e9', fontSize: '0.75rem' }}>Count: <strong>{payload[0].value}</strong></Typography>
                                      <Typography sx={{ color: tok('--text-secondary'), fontSize: '0.7rem' }}>Contribution: {payload[0].payload.percentage}%</Typography>
                                    </Paper>
                                  );
                                }
                                return null;
                              }}
                            />
                            <RechartsBar dataKey="value" fill="url(#governorateGradient)" radius={[6, 6, 0, 0]} />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                        <TableContainer sx={{ mt: 2, maxHeight: 200, overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: tok('--overlay-subtle'), borderRadius: '4px' } }}>
                          <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' } }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Governorate</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Total</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>ITN</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Sub</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>%</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedGovernorates : globalAnalytics.detailedGovernorates) || []).slice(0, 15).map((data) => (
                                <TableRow key={data.name} sx={{ '&:hover': { bgcolor: tok('--overlay-subtle') } }}>
                                  <TableCell sx={{ color: tok('--text-secondary') }}>{data.name}</TableCell>
                                  <TableCell
                                    align="right"
                                    onClick={() => handleAnalyticsDrillDown({ governorate: data.name })}
                                    sx={{
                                      color: tok('--text-secondary'),
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      '&:hover': { bgcolor: 'rgba(14, 165, 233, 0.2)', color: '#0ea5e9' }
                                    }}
                                  >
                                    {data.total}
                                  </TableCell>
                                  <TableCell align="right" sx={{ color: data.itn > 0 ? '#f59e0b' : '#64748b' }}>{data.itn}</TableCell>
                                  <TableCell align="right" sx={{ color: data.subscription > 0 ? '#10b981' : '#64748b' }}>{data.subscription}</TableCell>
                                  <TableCell align="right" sx={{ color: tok('--text-secondary') }}>{data.percentage}%</TableCell>
                                </TableRow>
                              ))}
                              <TableRow sx={{ bgcolor: tok('--overlay-subtle'), borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                                <TableCell sx={{ color: tok('--text'), fontWeight: 'bold' }}>TOTAL</TableCell>
                                <TableCell align="right" sx={{ color: '#0ea5e9', fontWeight: 'bold' }}>{((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedGovernorates : globalAnalytics.detailedGovernorates) || []).reduce((sum, item) => sum + item.total, 0)}</TableCell>
                                <TableCell align="right" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>{((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedGovernorates : globalAnalytics.detailedGovernorates) || []).reduce((sum, item) => sum + item.itn, 0)}</TableCell>
                                <TableCell align="right" sx={{ color: '#10b981', fontWeight: 'bold' }}>{((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedGovernorates : globalAnalytics.detailedGovernorates) || []).reduce((sum, item) => sum + item.subscription, 0)}</TableCell>
                                <TableCell align="right" sx={{ color: tok('--text-secondary'), fontWeight: 'bold' }}>100%</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Paper>
                    </Grid>

                    {/* Reason Breakdown */}
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 3, ...colors.glass, borderRadius: 3, border: '1px solid rgba(16, 185, 129, 0.2)' }} elevation={0}>
                        <Typography variant="h6" fontWeight="700" mb={3} color={tok('--text')} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                                    <Paper sx={{ p: 1.5, bgcolor: tok('--surface'), border: '1px solid #334155', borderRadius: 2 }}>
                                      <Typography sx={{ color: tok('--text'), fontWeight: 'bold', fontSize: '0.8rem', mb: 0.5 }}>{payload[0].name}</Typography>
                                      <Typography sx={{ color: payload[0].payload.fill, fontSize: '0.75rem' }}>Count: <strong>{payload[0].value}</strong></Typography>
                                      <Typography sx={{ color: tok('--text-secondary'), fontSize: '0.7rem' }}>Weight: {payload[0].payload.percentage}%</Typography>
                                    </Paper>
                                  );
                                }
                                return null;
                              }}
                            />
                            <RechartsLegend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.7rem', color: tok('--text-secondary') }} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                        {/* Detailed Reason Table - Compact Style */}
                        <TableContainer sx={{ mt: 2, maxHeight: 200, overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: tok('--overlay-subtle'), borderRadius: '4px' } }}>
                          <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' } }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Reason</TableCell>
                                {globalAnalytics.matrixOwners.map(owner => (
                                  <TableCell key={owner} align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold', fontSize: '0.65rem' }}>{owner}</TableCell>
                                ))}
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>ITN</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Sub</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Total</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>%</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedReasons : globalAnalytics.detailedReasons) || []).slice(0, 15).map((data) => {
                                const rowTotal = Object.values(data.ownerBreakdown).reduce((sum, count) => sum + count, 0);
                                return (
                                  <TableRow key={data.name} sx={{ '&:hover': { bgcolor: tok('--overlay-subtle') } }}>
                                    <TableCell
                                      onClick={() => handleAnalyticsDrillDown({ reason: data.name })}
                                      sx={{ color: tok('--text-secondary'), cursor: 'pointer', '&:hover': { color: '#3b82f6' } }}
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
                                          {count > 0 && <span style={{ fontSize: '0.6rem', color: tok('--text-muted'), marginLeft: 4 }}>({pct}%)</span>}
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
                                      sx={{ color: tok('--text-secondary'), fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                      {data.total}
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: tok('--text-secondary') }}>{data.percentage}%</TableCell>
                                  </TableRow>
                                );
                              })}
                              {/* Total Row */}
                              <TableRow sx={{ bgcolor: tok('--overlay-subtle'), borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                                <TableCell sx={{ color: tok('--text'), fontWeight: 'bold' }}>TOTAL</TableCell>
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
                                <TableCell align="right" sx={{ color: tok('--text'), fontWeight: 'bold' }}>
                                  {Object.values((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedReasons : globalAnalytics.detailedReasons) || []).reduce((sum, data) => sum + data.total, 0)}
                                </TableCell>
                                <TableCell align="right" sx={{ color: tok('--text-secondary'), fontWeight: 'bold' }}>100%</TableCell>
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
                          <Typography variant="h6" fontWeight="700" color={tok('--text')} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#94a3b8" fontSize={10} tick={{ fill: tok('--text-secondary') }} />
                            <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: tok('--text-secondary') }} />
                            <RechartsTooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <Paper sx={{ p: 1.5, bgcolor: tok('--surface'), border: '1px solid #334155', borderRadius: 2 }}>
                                      <Typography sx={{ color: tok('--text'), fontWeight: 'bold', fontSize: '0.8rem', mb: 0.5 }}>{label}</Typography>
                                      <Typography sx={{ color: '#f59e0b', fontSize: '0.75rem' }}>Count: <strong>{payload[0].value}</strong></Typography>
                                      <Typography sx={{ color: tok('--text-secondary'), fontSize: '0.7rem' }}>Contribution: {payload[0].payload.percentage}%</Typography>
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
                        <TableContainer sx={{ mt: 2, maxHeight: 200, overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: tok('--overlay-subtle'), borderRadius: '4px' } }}>
                          <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' } }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Sub-Reason</TableCell>
                                {globalAnalytics.matrixOwners.map(owner => (
                                  <TableCell key={owner} align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold', fontSize: '0.65rem' }}>{owner}</TableCell>
                                ))}
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold', fontSize: '0.65rem' }}>Other</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>ITN</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Sub</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Total</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>%</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedSubReasons : globalAnalytics.detailedSubReasons) || []).slice(0, 15).map((data) => {
                                const rowTotal = Object.values(data.ownerBreakdown).reduce((sum, count) => sum + count, 0);
                                return (
                                  <TableRow key={data.name} sx={{ '&:hover': { bgcolor: tok('--overlay-subtle') } }}>
                                    <TableCell
                                      onClick={() => handleAnalyticsDrillDown({ subReason: data.name })}
                                      sx={{ color: tok('--text-secondary'), cursor: 'pointer', '&:hover': { color: '#3b82f6' } }}
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
                                          {count > 0 && <span style={{ fontSize: '0.6rem', color: tok('--text-muted'), marginLeft: 4 }}>({pct}%)</span>}
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
                                      sx={{ color: tok('--text-secondary'), fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                      {data.total}
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: tok('--text-secondary') }}>{data.percentage}%</TableCell>
                                  </TableRow>
                                );
                              })}
                              {/* Total Row */}
                              <TableRow sx={{ bgcolor: tok('--overlay-subtle'), borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                                <TableCell sx={{ color: tok('--text'), fontWeight: 'bold' }}>TOTAL</TableCell>
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
                                <TableCell align="right" sx={{ color: tok('--text'), fontWeight: 'bold' }}>
                                  {Object.values((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedSubReasons : globalAnalytics.detailedSubReasons) || []).reduce((sum, data) => sum + data.total, 0)}
                                </TableCell>
                                <TableCell align="right" sx={{ color: tok('--text-secondary'), fontWeight: 'bold' }}>100%</TableCell>
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
                          <Typography variant="h6" fontWeight="700" color={tok('--text')} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#94a3b8" fontSize={10} tick={{ fill: tok('--text-secondary') }} />
                            <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: tok('--text-secondary') }} />
                            <RechartsTooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <Paper sx={{ p: 1.5, bgcolor: tok('--surface'), border: '1px solid #334155', borderRadius: 2 }}>
                                      <Typography sx={{ color: tok('--text'), fontWeight: 'bold', fontSize: '0.8rem', mb: 0.5 }}>{label}</Typography>
                                      <Typography sx={{ color: '#8b5cf6', fontSize: '0.75rem' }}>Count: <strong>{payload[0].value}</strong></Typography>
                                      <Typography sx={{ color: tok('--text-secondary'), fontSize: '0.7rem' }}>Contribution: {payload[0].payload.percentage}%</Typography>
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
                        <TableContainer sx={{ mt: 2, maxHeight: 200, overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: tok('--overlay-subtle'), borderRadius: '4px' } }}>
                          <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' } }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Root Cause</TableCell>
                                {globalAnalytics.matrixOwners.map(owner => (
                                  <TableCell key={owner} align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold', fontSize: '0.65rem' }}>{owner}</TableCell>
                                ))}
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>ITN</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Sub</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>Total</TableCell>
                                <TableCell align="right" sx={{ bgcolor: tok('--surface'), color: tok('--text-secondary'), fontWeight: 'bold' }}>%</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedRootCauses : globalAnalytics.detailedRootCauses) || []).slice(0, 15).map((data) => {
                                const rowTotal = Object.values(data.ownerBreakdown).reduce((sum, count) => sum + count, 0);
                                return (
                                  <TableRow key={data.name} sx={{ '&:hover': { bgcolor: tok('--overlay-subtle') } }}>
                                    <TableCell
                                      onClick={() => handleAnalyticsDrillDown({ rootCause: data.name })}
                                      sx={{ color: tok('--text-secondary'), cursor: 'pointer', '&:hover': { color: '#3b82f6' } }}
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
                                          {count > 0 && <span style={{ fontSize: '0.6rem', color: tok('--text-muted'), marginLeft: 4 }}>({pct}%)</span>}
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
                                      sx={{ color: tok('--text-secondary'), fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                      {data.total}
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: tok('--text-secondary') }}>{data.percentage}%</TableCell>
                                  </TableRow>
                                );
                              })}
                              {/* Total Row */}
                              <TableRow sx={{ bgcolor: tok('--overlay-subtle'), borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                                <TableCell sx={{ color: tok('--text'), fontWeight: 'bold' }}>TOTAL</TableCell>
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
                                <TableCell align="right" sx={{ color: tok('--text'), fontWeight: 'bold' }}>
                                  {Object.values((activeGlobalOwnershipInsight ? focusedGlobalAnalytics?.detailedRootCauses : globalAnalytics.detailedRootCauses) || []).reduce((sum, data) => sum + data.total, 0)}
                                </TableCell>
                                <TableCell align="right" sx={{ color: tok('--text-secondary'), fontWeight: 'bold' }}>100%</TableCell>
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
                  bgcolor: tok('--bg'),
                  borderRadius: '24px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  minHeight: '60vh'
                }
              }}
            >
              <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Box>
                  <Typography variant="h5" sx={{ color: tok('--text'), fontWeight: 800 }}>{drillDownTitle}</Typography>
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
                  <Box sx={{ borderBottom: 1, borderColor: tok('--border'), px: 2, bgcolor: tok('--bg') }}>
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
                        <TableCell sx={{ bgcolor: tok('--bg'), color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>TYPE</TableCell>
                        <TableCell sx={{ bgcolor: tok('--bg'), color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>SLID</TableCell>
                        <TableCell sx={{ bgcolor: tok('--bg'), color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>DATE</TableCell>
                        <TableCell sx={{ bgcolor: tok('--bg'), color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>CUSTOMER / CATEGORY</TableCell>
                        {(drillDownType === 'task' || (drillDownType === 'mixed' && drillDownTab === 'tasks')) && (
                          <>
                            <TableCell sx={{ bgcolor: tok('--bg'), color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>REASON</TableCell>
                            <TableCell sx={{ bgcolor: tok('--bg'), color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>SUB-REASON</TableCell>
                            <TableCell sx={{ bgcolor: tok('--bg'), color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>RC</TableCell>
                            <TableCell sx={{ bgcolor: tok('--bg'), color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>OWNER</TableCell>
                            <TableCell sx={{ bgcolor: tok('--bg'), color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>FEEDBACK (VERBATIM)</TableCell>
                          </>
                        )}
                        <TableCell sx={{ bgcolor: tok('--bg'), color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>STATUS</TableCell>
                        <TableCell sx={{ bgcolor: tok('--bg'), color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>POINTS</TableCell>
                        <TableCell sx={{ bgcolor: tok('--bg'), color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', py: 1 }}>SCORE / INFO</TableCell>
                        <TableCell sx={{ bgcolor: tok('--bg'), color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', fontSize: '0.75rem', py: 1 }}>ACTIONS</TableCell>
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
                                '&:hover': { bgcolor: tok('--overlay-subtle') }
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
                              <TableCell sx={{ py: 1, color: tok('--text'), fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>{item.slid}</TableCell>
                              <TableCell sx={{ py: 1, color: colors.textSecondary, borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>{formatDate(date)}</TableCell>
                              <TableCell sx={{ py: 1, color: tok('--text'), borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {isIssue ? (
                                    item.issueCategory || (item.issues?.[0]?.category) || 'Technical Issue'
                                  ) : (
                                    <>
                                      <Typography variant="body2" sx={{ fontWeight: 600, color: tok('--text'), fontSize: '0.8rem' }}>
                                        {item.customerName || 'N/A'}
                                      </Typography>
                                      {item.customerType && (
                                        <Chip
                                          label={item.customerType}
                                          size="small"
                                          sx={{
                                            height: '16px',
                                            fontSize: '0.55rem',
                                            bgcolor: tok('--overlay-subtle'),
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
                                    <TableCell sx={{ py: 0.5, color: tok('--text'), borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top', fontSize: '0.75rem' }}>
                                      {validTuples.map((tuple, i) => (
                                        <Box key={i} sx={{ minHeight: '1.2em', display: 'flex', alignItems: 'center', borderBottom: i < max - 1 ? '1px dashed rgba(255,255,255,0.05)' : 'none' }}>
                                          {tuple.reason || <span style={{ color: tok('--overlay-subtle') }}>N/A</span>}
                                        </Box>
                                      ))}
                                    </TableCell>
                                    <TableCell sx={{ py: 0.5, color: tok('--text'), borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top', fontSize: '0.75rem' }}>
                                      {validTuples.map((tuple, i) => (
                                        <Box key={i} sx={{ minHeight: '1.2em', display: 'flex', alignItems: 'center', borderBottom: i < max - 1 ? '1px dashed rgba(255,255,255,0.05)' : 'none' }}>
                                          {tuple.subReason || <span style={{ color: tok('--overlay-subtle') }}>N/A</span>}
                                        </Box>
                                      ))}
                                    </TableCell>
                                    <TableCell sx={{ py: 0.5, color: tok('--text'), borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top', fontSize: '0.75rem' }}>
                                      {validTuples.map((tuple, i) => (
                                        <Box key={i} sx={{ minHeight: '1.2em', display: 'flex', alignItems: 'center', borderBottom: i < max - 1 ? '1px dashed rgba(255,255,255,0.05)' : 'none' }}>
                                          {tuple.rootCause || <span style={{ color: tok('--overlay-subtle') }}>N/A</span>}
                                        </Box>
                                      ))}
                                    </TableCell>
                                    <TableCell sx={{ py: 0.5, color: tok('--text'), borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'top', fontSize: '0.7rem' }}>
                                      {validTuples.map((tuple, i) => (
                                        <Box key={i} sx={{ minHeight: '1.2em', display: 'flex', alignItems: 'center', borderBottom: i < max - 1 ? '1px dashed rgba(255,255,255,0.05)' : 'none' }}>
                                          <Chip
                                            label={tuple.owner || 'Empty'}
                                            size="small"
                                            sx={{
                                              height: '16px',
                                              fontSize: '0.6rem',
                                              bgcolor: tok('--overlay-subtle'),
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
                  bgcolor: tok('--bg'),
                  borderRadius: '24px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }
              }}
            >
              <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Typography variant="h6" sx={{ color: tok('--text'), fontWeight: 800 }}>Teams in {cohortDialogLabel} Cohort</Typography>
                <IconButton onClick={() => setCohortDialogOpen(false)} sx={{ color: colors.textSecondary }}>
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              <DialogContent>
                <TableContainer sx={{ maxHeight: '50vh' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ bgcolor: tok('--bg'), color: colors.textSecondary, fontWeight: 700 }}>Team</TableCell>
                        <TableCell align="right" sx={{ bgcolor: tok('--bg'), color: colors.textSecondary, fontWeight: 700 }}>Violations</TableCell>
                        <TableCell align="right" sx={{ bgcolor: tok('--bg'), color: colors.textSecondary, fontWeight: 700 }}>Trained</TableCell>
                        <TableCell align="right" sx={{ bgcolor: tok('--bg'), color: colors.textSecondary, fontWeight: 700 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cohortDialogItems.map((item, idx) => (
                        <TableRow key={`${item.teamName}-${idx}`} sx={{ '&:hover': { bgcolor: tok('--overlay-subtle') } }}>
                          <TableCell sx={{ color: tok('--text'), borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{item.teamName}</TableCell>
                          <TableCell align="right" sx={{ color: tok('--text'), borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{item.count}</TableCell>
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
                  bgcolor: tok('--bg'),
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
                <Typography sx={{ color: tok('--text'), fontStyle: 'italic', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
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

            {/* TAB 3: COMPARISON CHART */}
            {globalTab === 3 && (
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
                  <Tab label="Online Exam" icon={<Quiz />} iconPosition="start" />
                  <Tab label="OTJ Assessment" icon={<CheckCircle />} iconPosition="start" />
                  <Tab label="Lab Assessment" icon={<Assessment />} iconPosition="start" />
                </Tabs>
              </Paper>

              {/* TAB PANELS */}

              {/* 1. EXECUTIVE OVERVIEW */}
              {activeTab === 0 && (
                <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: tok('--text'), letterSpacing: 0.5 }}>
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

                  <Grid container spacing={2.5}>
                    {/* High Level KPI Cards */}
                    {(() => {
                      const totalOriginalTokens = selectedTeamTokenStats.totalToken || 0;
                      const accTasks = technicalTasks.filter(t => isTeamAccountable(t));
                      const nonAccTasks = technicalTasks.filter(t => !isTeamAccountable(t));
                      const accCount = accTasks.length;
                      const nonAccCount = nonAccTasks.length;

                      // Adjusted Samples Token = Original Tokens - Non-Accountable Tasks
                      const adjustedTokens = Math.max(0, totalOriginalTokens - nonAccCount);

                      let accDetractors = 0;
                      let accNeutrals = 0;
                      accTasks.forEach(t => {
                        const s = t.evaluationScore || 0;
                        if (s > 0) {
                          if (s <= 6) accDetractors++;
                          else if (s >= 7 && s <= 8) accNeutrals++;
                        }
                      });

                      const calculatedPromoters = Math.max(0, adjustedTokens - accCount);
                      const promoterShare = adjustedTokens > 0 ? ((calculatedPromoters / adjustedTokens) * 100).toFixed(1) : '0.0';
                      const accRate = adjustedTokens > 0 ? ((accCount / adjustedTokens) * 100).toFixed(1) : '0.0';
                      const detractorRate = adjustedTokens > 0 ? ((accDetractors / adjustedTokens) * 100).toFixed(1) : '0.0';
                      const neutralRate = adjustedTokens > 0 ? ((accNeutrals / adjustedTokens) * 100).toFixed(1) : '0.0';

                      return [
                        {
                          title: 'Original Samples Token',
                          value: totalOriginalTokens,
                          unit: 'Tokens',
                          desc: 'Assigned Quality Sampling Quota',
                          color: colors.info,
                          icon: <Assessment />
                        },
                        {
                          title: 'Non-Accountable Tasks (No)',
                          value: nonAccCount,
                          unit: 'Tasks',
                          desc: `Excluded / Other Owners (${technicalTasks.length > 0 ? ((nonAccCount / technicalTasks.length) * 100).toFixed(1) : 0}%)`,
                          color: '#818cf8',
                          icon: <VerifiedUser />
                        },
                        {
                          title: 'Adjusted Samples Token',
                          value: adjustedTokens,
                          unit: 'Net Tokens',
                          desc: `Original (${totalOriginalTokens}) - Non-Accountable (${nonAccCount})`,
                          color: colors.primary,
                          icon: <Timeline />
                        },
                        {
                          title: 'Accountable Tasks (Yes)',
                          value: accCount,
                          unit: 'Tasks',
                          desc: `${accRate}% Failure on Net Tokens (${accDetractors} Det / ${accNeutrals} Neu)`,
                          color: colors.error,
                          icon: <Gavel />
                        },
                        {
                          title: 'Promoters (Calculated)',
                          value: calculatedPromoters,
                          unit: 'Promoters',
                          desc: `${promoterShare}% Share | Net Tokens (${adjustedTokens}) - Accountable (${accCount})`,
                          color: colors.success,
                          icon: <TrendingUp />
                        },
                        {
                          title: 'Accountable Detractors',
                          value: accDetractors,
                          unit: 'Detractors',
                          desc: `Score ≤ 6/10 (${detractorRate}% of Net Tokens | ${accCount > 0 ? ((accDetractors / accCount) * 100).toFixed(1) : 0}% of Accountable)`,
                          color: colors.error,
                          icon: <Warning />
                        },
                        {
                          title: 'Accountable Neutrals',
                          value: accNeutrals,
                          unit: 'Neutrals',
                          desc: `Score 7-8/10 (${neutralRate}% of Net Tokens | ${accCount > 0 ? ((accNeutrals / accCount) * 100).toFixed(1) : 0}% of Accountable)`,
                          color: colors.warning,
                          icon: <PriorityHigh />
                        },
                        {
                          title: 'Customer Snags & Complaints',
                          value: stats.customerIssuesCount,
                          unit: 'Reported',
                          desc: `${stats.resolutionRate}% Resolution Rate (${stats.closed || 0} Closed)`,
                          color: '#f97316',
                          icon: <SupportAgent />
                        },
                        {
                          title: 'Online Exam Score',
                          value: Math.round(calculateAverageScore(quizResults)),
                          unit: '%',
                          desc: 'Average Online Exam Performance',
                          color: '#38bdf8',
                          icon: <Quiz />
                        },
                        {
                          title: 'OTJ Assessment',
                          value: Math.round(calculateAverageScore(jobAssessments)),
                          unit: '%',
                          desc: 'On-The-Job Field Audit Average',
                          color: '#34d399',
                          icon: <CheckCircle />
                        },
                        {
                          title: 'Lab Assessment',
                          value: Math.round(calculateAverageScore(labAssessments)),
                          unit: '%',
                          desc: 'Lab Technical Assessment Average',
                          color: '#a855f7',
                          icon: <FactCheck />
                        },
                      ];
                    })().map((kpi, i) => (
                      <Grid item xs={12} sm={6} md={4} key={i}>
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
                          <Typography variant="h3" sx={{ fontWeight: 800, color: tok('--text'), mb: 0.5 }}>
                            {typeof kpi.value === 'number' ? kpi.value : kpi.value}
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
                          <Typography variant="h6" sx={{ color: tok('--text'), fontWeight: 600 }}>Operational Efficiency & Responsivity</Typography>
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
                                cursor={{ fill: tok('--overlay-subtle') }}
                                contentStyle={{ backgroundColor: tok('--bg'), border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
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
                              <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: tok('--overlay-subtle'), border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                                  <Box sx={{ color: s.color, display: 'flex' }}>{s.icon}</Box>
                                  <Typography variant="h6" sx={{ fontWeight: 800, color: tok('--text'), fontSize: '1rem' }}>{s.value}</Typography>
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
                        <Typography variant="h6" sx={{ mb: 3, color: tok('--text'), fontWeight: 600 }}>Recent Activity</Typography>
                        <Box sx={{ flex: 1, overflowY: 'auto', pr: 1, '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: tok('--overlay-subtle'), borderRadius: '4px' } }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {allActivities.slice(0, 15).map((activity, idx) => (
                              <Box key={activity.id || idx} sx={{
                                p: 2,
                                borderRadius: '16px',
                                bgcolor: tok('--overlay-subtle'),
                                border: '1px solid rgba(255,255,255,0.05)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                overflow: 'hidden',
                                '&:hover': {
                                  bgcolor: tok('--overlay-subtle'),
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
                                        <Typography variant="body2" sx={{ color: tok('--text'), fontWeight: 600, lineHeight: 1.3 }}>
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
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: tok('--text') }}>Customer Issues Dashboard</Typography>
                      <Typography variant="body2" sx={{ color: tok('--text-secondary') }}>
                        Technical analysis and performance metrics for {selectedTeam?.teamName}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: tok('--surface'), px: 2, py: 1, borderRadius: 2, border: '1px solid #3d3d3d', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ color: tok('--text-secondary'), fontSize: '0.8rem' }}>From:</Typography>
                          <TextField
                            type="date"
                            size="small"
                            value={dateFilter.start}
                            onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                            sx={{
                              bgcolor: tok('--bg'),
                              borderRadius: 1,
                              '& input': { color: tok('--text'), fontSize: '0.8rem', p: '6px 8px' },
                              '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ color: tok('--text-secondary'), fontSize: '0.8rem' }}>To:</Typography>
                          <TextField
                            type="date"
                            size="small"
                            value={dateFilter.end}
                            onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                            sx={{
                              bgcolor: tok('--bg'),
                              borderRadius: 1,
                              '& input': { color: tok('--text'), fontSize: '0.8rem', p: '6px 8px' },
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
                        <Paper sx={{ p: 3, borderRadius: 4, bgcolor: tok('--bg'), height: '100%', border: '1px solid #3d3d3d' }}>
                          <Typography variant="subtitle2" color="grey.500" mb={1}>SUPERVISOR DISPATCH SPEED (Incl. Aging)</Typography>
                          <Typography variant="h3" fontWeight="800" color={Number(stats.avgDispatchTime) > 1 ? "warning.main" : "info.main"}>
                            {stats.avgDispatchTime}<span style={{ fontSize: '1rem', color: tok('--text-muted') }}> days</span>
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Avg time from <b>Reported</b> → <b>Dispatched</b> (Or <b>Reported</b> → <b>Now</b> if pending)
                          </Typography>
                          <Box sx={{ p: 1, bgcolor: tok('--overlay-subtle'), borderRadius: 1, border: '1px dashed #444' }}>
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: tok('--text-muted'), fontStyle: 'italic', lineHeight: 1.2 }}>
                              * Calculation: (Dispatched Date - Reported Date) OR (Now - Reported Date) if undispatched.
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3, borderRadius: 4, bgcolor: tok('--bg'), height: '100%', border: '1px solid #3d3d3d' }}>
                          <Typography variant="subtitle2" color="grey.500" mb={1}>FIELD RESOLUTION SPEED (Incl. Aging)</Typography>
                          <Typography variant="h3" fontWeight="800" color="success.main">
                            {stats.avgResolutionTime}<span style={{ fontSize: '1rem', color: tok('--text-muted') }}> days</span>
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Avg time from <b>Dispatched</b> → <b>Resolved</b> (Or <b>Reported</b> → <b>Now</b> if pending)
                          </Typography>
                          <Box sx={{ p: 1, bgcolor: tok('--overlay-subtle'), borderRadius: 1, border: '1px dashed #444' }}>
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: tok('--text-muted'), fontStyle: 'italic', lineHeight: 1.2 }}>
                              * Calculation: Resolved cases use (Resolved - Dispatched). Pending cases use (Now - Reported) to reflect negligence.
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3, borderRadius: 4, bgcolor: tok('--bg'), height: '100%', border: '1px solid #3d3d3d' }}>
                          <Typography variant="subtitle2" color="grey.500" mb={1}>TOTAL LIFECYCLE (Accountability)</Typography>
                          <Typography variant="h3" fontWeight="800" color={tok('--text')}>
                            {stats.avgLifecycleTime}<span style={{ fontSize: '1rem', color: tok('--text-muted') }}> days</span>
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Total time from <b>Initial Report</b> → <b>Closed/Now</b>
                          </Typography>
                          <Box sx={{ p: 1, bgcolor: tok('--overlay-subtle'), borderRadius: 1, border: '1px dashed #444' }}>
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: tok('--text-muted'), fontStyle: 'italic', lineHeight: 1.2 }}>
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
                      <Paper sx={{ p: 2, bgcolor: tok('--surface'), color: tok('--text'), borderRadius: 2, border: '1px solid #3d3d3d' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" fontWeight="bold">Issue Reporting Trend</Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <FormControl size="small" variant="outlined">
                              <Select
                                value={trendTimeframe}
                                onChange={(e) => setTrendTimeframe(e.target.value)}
                                sx={{ color: tok('--text'), '.MuiOutlinedInput-notchedOutline': { borderColor: tok('--border') }, fontSize: '0.8rem', height: 32 }}
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
                                sx={{ color: tok('--text'), '.MuiOutlinedInput-notchedOutline': { borderColor: tok('--border') }, fontSize: '0.8rem', height: 32 }}
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
                      <Paper sx={{ p: 2, bgcolor: tok('--surface'), color: tok('--text'), borderRadius: 2, border: '1px solid #3d3d3d', height: '100%' }}>
                        <Typography variant="h6" gutterBottom fontWeight="bold">Resolution Status</Typography>
                        <Box sx={{ height: 260, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <Doughnut data={statusData} options={doughnutOptions} />
                          <Box sx={{ position: 'absolute', textAlign: 'center' }}>
                            <Typography variant="h4" fontWeight="bold" sx={{ color: '#1cc88a' }}>{stats.resolutionRate}%</Typography>
                            <Typography variant="caption" color={tok('--text-secondary')}>Resolved</Typography>
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
                      bgcolor: tok('--surface'),
                      borderRadius: 3,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      overflow: 'hidden',
                      background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                  >
                    <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: tok('--overlay-subtle') }}>
                      <Box>
                        <Typography variant="h6" fontWeight="700" color={tok('--text')}>
                          Issue History & Registry
                        </Typography>
                        <Typography variant="body2" color={tok('--text-secondary')} sx={{ mt: 0.5 }}>
                          Full list of issues associated with this team
                        </Typography>
                      </Box>
                      <Chip
                        label={`${activeCustomerIssues.length} Records`}
                        size="small"
                        sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)', fontWeight: 600 }}
                      />
                    </Box>
                    <Box sx={{ width: '100%', overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                          <tr style={{ background: tok('--bg') }}>
                            <th style={{ padding: '16px 24px', textAlign: 'left', color: tok('--text-secondary'), fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Date</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: tok('--text-secondary'), fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>SLID</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: tok('--text-secondary'), fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Reporter</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: tok('--text-secondary'), fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Category</th>
                            <th style={{ padding: '16px', textAlign: 'center', color: tok('--text-secondary'), fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeCustomerIssues.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: tok('--text-secondary') }}>
                                No customer issues or snags registered for this team.
                              </td>
                            </tr>
                          ) : (
                            activeCustomerIssues
                              .slice(issuesPage * issuesRowsPerPage, issuesPage * issuesRowsPerPage + issuesRowsPerPage)
                              .map((issue) => (
                                <tr
                                  key={issue._id}
                                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background-color 0.2s ease' }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = tok('--overlay-subtle')}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <td style={{ padding: '16px 24px', color: tok('--text'), fontSize: '0.85rem' }}>{formatDate(issue.date || issue.createdAt)}</td>
                                  <td style={{ padding: '16px', color: '#60a5fa', fontWeight: 'bold', fontSize: '0.85rem' }}>{issue.slid}</td>
                                  <td style={{ padding: '16px', color: tok('--text'), fontSize: '0.85rem' }}>{issue.reporter || 'N/A'}</td>
                                  <td style={{ padding: '16px', color: tok('--text-secondary'), fontSize: '0.85rem' }}>
                                    {issue.issues?.[0]?.category || issue.issueCategory || 'Uncategorized'}
                                    <Typography variant="caption" sx={{ display: 'block', color: tok('--text-muted') }}>{issue.issues?.[0]?.subCategory || '-'}</Typography>
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
                              ))
                          )}
                        </tbody>
                      </table>
                      <TablePagination
                        rowsPerPageOptions={[10, 25, 50]}
                        component="div"
                        count={activeCustomerIssues.length}
                        rowsPerPage={issuesRowsPerPage}
                        page={issuesPage}
                        onPageChange={(e, p) => setIssuesPage(p)}
                        onRowsPerPageChange={(e) => {
                          setIssuesRowsPerPage(parseInt(e.target.value, 10));
                          setIssuesPage(0);
                        }}
                        sx={{ color: tok('--text-secondary') }}
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
                      <Typography variant="h5" sx={{ fontWeight: 900, color: tok('--text'), mb: 0.5 }}>
                        Advanced Performance Analytics
                      </Typography>
                      <Typography variant="body2" sx={{ color: tok('--text-secondary'), fontWeight: 500 }}>
                        Operational workload and technical assessment deep-dive for <span style={{ color: colors.primary, fontWeight: 700 }}>{selectedTeam?.teamName}</span>
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Time Filter Controls */}
                      <Paper sx={{
                        display: 'inline-flex',
                        p: 0.5,
                        bgcolor: tok('--overlay-subtle'),
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
                              color: tok('--text-muted'),
                              px: 2,
                              borderRadius: '10px !important',
                              textTransform: 'none',
                              fontWeight: 600,
                              '&.Mui-selected': {
                                bgcolor: colors.primary,
                                color: tok('--text'),
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
                              bgcolor: tok('--overlay-subtle'),
                              borderRadius: '12px',
                              color: tok('--text')
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
                            '& .MuiOutlinedInput-root': { bgcolor: tok('--overlay-subtle'), borderRadius: '12px' },
                            '& .MuiChip-root': { bgcolor: colors.primary, color: tok('--text') }
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
                            '& .MuiOutlinedInput-root': { bgcolor: tok('--overlay-subtle'), borderRadius: '12px' },
                            '& .MuiChip-root': { bgcolor: colors.primary, color: tok('--text') }
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
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: tok('--overlay-subtle'), borderRadius: '12px', color: '#fff' } }}
                          />
                          <Typography sx={{ color: tok('--text-secondary') }}>-</Typography>
                          <TextField
                            type="date"
                            size="small"
                            value={taskCustomDateRange.end}
                            onChange={(e) => setTaskCustomDateRange({ ...taskCustomDateRange, end: e.target.value })}
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: tok('--overlay-subtle'), borderRadius: '12px', color: '#fff' } }}
                          />
                        </Box>
                      )}

                      <Button
                        variant="contained"
                        startIcon={<FaFileExcel />}
                        onClick={handleExportFilteredTeamTasks}
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

                  {/* Technical KPI Section (Original -> Adjusted Net Base -> Accountable KPIs) */}
                  {(() => {
                    const originalTokens = selectedTeamTokenStats.totalToken || 0;
                    const nonAccCount = individualTeamAnalytics.nonAccountableCount;
                    const adjustedNetTokens = Math.max(0, originalTokens - nonAccCount);
                    const accCount = individualTeamAnalytics.accountableCount;
                    const calculatedPromoters = Math.max(0, adjustedNetTokens - accCount);
                    const accDetractors = individualTeamAnalytics.accountableSentiment.Detractor;
                    const accNeutrals = individualTeamAnalytics.accountableSentiment.Neutral;

                    const promoterShare = adjustedNetTokens > 0 ? ((calculatedPromoters / adjustedNetTokens) * 100).toFixed(1) : '0.0';
                    const accRate = adjustedNetTokens > 0 ? ((accCount / adjustedNetTokens) * 100).toFixed(1) : '0.0';
                    const detractorRate = adjustedNetTokens > 0 ? ((accDetractors / adjustedNetTokens) * 100).toFixed(1) : '0.0';
                    const neutralRate = adjustedNetTokens > 0 ? ((accNeutrals / adjustedNetTokens) * 100).toFixed(1) : '0.0';

                    return (
                      <Grid container spacing={2} mb={4}>
                        <Grid item xs={12} sm={6} md={3} lg={1.71}>
                          <MiniStatCard
                            title="Original Tokens"
                            value={originalTokens}
                            icon={<FaClipboardList />}
                            color={colors.info}
                            subtext="Assigned sample quota"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3} lg={1.71}>
                          <MiniStatCard
                            title="Non-Accountable (No)"
                            value={nonAccCount}
                            icon={<FaCheckCircle />}
                            color="#818cf8"
                            subtext={`Excluded from base (${filteredTechnicalTasks.length > 0 ? ((nonAccCount / filteredTechnicalTasks.length) * 100).toFixed(1) : 0}%)`}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3} lg={1.71}>
                          <MiniStatCard
                            title="Adjusted Net Tokens"
                            value={adjustedNetTokens}
                            icon={<FaFilter />}
                            color={colors.primary}
                            subtext={`Base: ${originalTokens} - ${nonAccCount}`}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3} lg={1.71}>
                          <MiniStatCard
                            title="Accountable (Yes)"
                            value={accCount}
                            icon={<FaGavel />}
                            color={colors.error}
                            subtext={`${accRate}% of Net Tokens`}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3} lg={1.71}>
                          <MiniStatCard
                            title="Promoters (Calc)"
                            value={calculatedPromoters}
                            icon={<FaChartLine />}
                            color={colors.success}
                            subtext={`${promoterShare}% Share of Net`}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3} lg={1.71}>
                          <MiniStatCard
                            title="Acc. Detractors"
                            value={accDetractors}
                            icon={<FaExclamationCircle />}
                            color={colors.error}
                            subtext={`Score ≤ 6 (${detractorRate}% Net)`}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3} lg={1.71}>
                          <MiniStatCard
                            title="Acc. Neutrals"
                            value={accNeutrals}
                            icon={<FaEquals />}
                            color={colors.warning}
                            subtext={`Score 7-8 (${neutralRate}% Net)`}
                          />
                        </Grid>
                      </Grid>
                    );
                  })()}

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
                              <FaUserTie color={tok('--text')} />
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" sx={{ color: colors.primary, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>Focused Analytical Mode</Typography>
                              <Typography variant="h6" sx={{ color: tok('--text'), fontWeight: 700 }}>Ownership: {activeOwnershipInsight}</Typography>
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: 'right', display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Box>
                              <Typography variant="h5" sx={{ color: colors.primary, fontWeight: 900 }}>{individualTeamAnalytics.focusedData.total}</Typography>
                              <Typography variant="caption" sx={{ color: tok('--text-secondary') }}>TOTAL VIOLATIONS</Typography>
                            </Box>
                            <Button
                              variant="outlined"
                              onClick={() => setActiveOwnershipInsight(null)}
                              sx={{
                                color: tok('--text'),
                                borderColor: tok('--border'),
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
                        <Typography variant="h6" sx={{ color: tok('--text'), fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <MdInsights style={{ color: colors.success }} />
                          {activeOwnershipInsight ? `Reason Analysis (${activeOwnershipInsight})` : 'Reason Analysis'}
                        </Typography>
                        <Box sx={{ height: 300 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart
                              data={activeOwnershipInsight ? individualTeamAnalytics.focusedData?.reasonData : individualTeamAnalytics.reasonData.slice(0, 8)}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tick={{ fill: tok('--text-secondary') }} angle={-25} textAnchor="end" height={60} />
                              <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: tok('--text-secondary') }} />
                              <RechartsTooltip
                                contentStyle={{ backgroundColor: tok('--surface'), border: 'none', borderRadius: 12 }}
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
                        <Typography variant="h6" sx={{ color: tok('--text'), fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <FaUserTie style={{ color: colors.info }} /> Ownership Distribution
                        </Typography>
                        <Box sx={{ height: 300 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={individualTeamAnalytics.ownerData.slice(0, 8)} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                              <XAxis type="number" stroke="#94a3b8" fontSize={10} tick={{ fill: tok('--text-secondary') }} />
                              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tick={{ fill: tok('--text-secondary') }} width={120} />
                              <RechartsTooltip contentStyle={{ backgroundColor: tok('--surface'), border: 'none', borderRadius: 12 }} />
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
                        <Typography variant="h6" sx={{ color: tok('--text'), fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
                              <XAxis type="number" stroke="#94a3b8" fontSize={10} tick={{ fill: tok('--text-secondary') }} />
                              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tick={{ fill: tok('--text-secondary') }} width={120} />
                              <RechartsTooltip contentStyle={{ backgroundColor: tok('--surface'), border: 'none', borderRadius: 12 }} />
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
                        <Typography variant="h6" sx={{ color: tok('--text'), fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Warning sx={{ color: colors.error }} />
                          {activeOwnershipInsight ? `Root Cause Distribution (${activeOwnershipInsight})` : 'Root Cause Distribution'}
                        </Typography>
                        <Box sx={{ height: 300 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart
                              data={activeOwnershipInsight ? individualTeamAnalytics.focusedData?.rootCauseData : individualTeamAnalytics.rootCauseData.slice(0, 10)}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tick={{ fill: tok('--text-secondary') }} angle={-25} textAnchor="end" height={60} />
                              <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: tok('--text-secondary') }} />
                              <RechartsTooltip contentStyle={{ backgroundColor: tok('--surface'), border: 'none', borderRadius: 12 }} />
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
                          <Typography variant="h6" sx={{ color: tok('--text'), fontWeight: 900 }}>Post-Session Performance Analysis</Typography>
                          <Typography variant="caption" sx={{ color: tok('--text-secondary') }}>
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
                              <Typography variant="subtitle2" sx={{ color: tok('--text-secondary'), mb: 2, fontWeight: 700 }}>POST-SESSION SENTIMENT</Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography sx={{ color: colors.error, fontWeight: 600 }}>Detractors</Typography>
                                  <Typography sx={{ color: tok('--text'), fontWeight: 900 }}>{postSessionAnalytics.sentiment.Detractor} ({((postSessionAnalytics.sentiment.Detractor / postSessionAnalytics.totalPostTasks) * 100).toFixed(1)}%)</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography sx={{ color: colors.warning, fontWeight: 600 }}>Neutrals</Typography>
                                  <Typography sx={{ color: tok('--text'), fontWeight: 900 }}>{postSessionAnalytics.sentiment.Neutral} ({((postSessionAnalytics.sentiment.Neutral / postSessionAnalytics.totalPostTasks) * 100).toFixed(1)}%)</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography sx={{ color: colors.success, fontWeight: 600 }}>Promoters</Typography>
                                  <Typography sx={{ color: tok('--text'), fontWeight: 900 }}>{postSessionAnalytics.sentiment.Promoter} ({((postSessionAnalytics.sentiment.Promoter / postSessionAnalytics.totalPostTasks) * 100).toFixed(1)}%)</Typography>
                                </Box>
                                <Divider sx={{ my: 1, borderColor: tok('--border') }} />
                                <Typography variant="caption" sx={{ color: tok('--text-muted'), fontStyle: 'italic' }}>
                                  Total of {postSessionAnalytics.totalPostTasks} violations recorded since last training.
                                </Typography>
                              </Box>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} md={8}>
                            <Paper sx={{ p: 3, ...colors.glass, borderRadius: '24px', border: `1px solid ${activePostSessionOwner ? colors.primary + '40' : 'rgba(59, 130, 246, 0.1)'}` }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle2" sx={{ color: tok('--text-secondary'), fontWeight: 700 }}>
                                  POST-SESSION OWNERSHIP BREAKDOWN
                                  <Typography component="span" variant="caption" sx={{ ml: 1, color: tok('--text-muted') }}>click a bar to drill down</Typography>
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
                                      contentStyle={{ backgroundColor: tok('--surface'), border: 'none', borderRadius: 12 }}
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
                                    <Typography variant="subtitle1" sx={{ color: tok('--text'), fontWeight: 800 }}>
                                      Violation Breakdown — {activePostSessionOwner}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: tok('--text-secondary') }}>
                                      {postSessionAnalytics.ownerData.find(o => o.name === activePostSessionOwner)?.value || 0} post-session violations attributed to this owner
                                    </Typography>
                                  </Box>
                                </Box>
                                <Grid container spacing={3}>
                                  {/* Reason */}
                                  <Grid item xs={12} md={4}>
                                    <Typography variant="caption" sx={{ color: tok('--text-secondary'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1.5 }}>By Reason</Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                      {postSessionAnalytics.ownerChartData[activePostSessionOwner].reasonData.slice(0, 6).map((item, idx) => (
                                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                              <Typography variant="caption" sx={{ color: tok('--text'), fontWeight: 600, fontSize: '0.78rem' }}>{item.name}</Typography>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 800 }}>{item.value}</Typography>
                                                {postSessionAnalytics.preReasons.has(item.name) ? (
                                                  <Chip label="Repeat" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(239,68,68,0.15)', color: '#f87171', fontWeight: 700, px: 0.3 }} />
                                                ) : (
                                                  <Chip label="New" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(34,197,94,0.15)', color: '#4ade80', fontWeight: 700, px: 0.3 }} />
                                                )}
                                              </Box>
                                            </Box>
                                            <Box sx={{ height: 4, borderRadius: 2, bgcolor: tok('--overlay-subtle'), overflow: 'hidden' }}>
                                              <Box sx={{ height: '100%', width: `${item.percentage}%`, bgcolor: postSessionAnalytics.preReasons.has(item.name) ? colors.error : colors.success, borderRadius: 2, transition: 'width 0.6s ease' }} />
                                            </Box>
                                          </Box>
                                        </Box>
                                      ))}
                                    </Box>
                                  </Grid>
                                  {/* Sub-Reason */}
                                  <Grid item xs={12} md={4}>
                                    <Typography variant="caption" sx={{ color: tok('--text-secondary'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1.5 }}>By Sub-Reason</Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                      {postSessionAnalytics.ownerChartData[activePostSessionOwner].subReasonData.slice(0, 6).map((item, idx) => (
                                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                              <Typography variant="caption" sx={{ color: tok('--text'), fontWeight: 600, fontSize: '0.78rem' }}>{item.name}</Typography>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Typography variant="caption" sx={{ color: colors.warning, fontWeight: 800 }}>{item.value}</Typography>
                                                {postSessionAnalytics.preSubReasons.has(item.name) ? (
                                                  <Chip label="Repeat" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(239,68,68,0.15)', color: '#f87171', fontWeight: 700, px: 0.3 }} />
                                                ) : (
                                                  <Chip label="New" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(34,197,94,0.15)', color: '#4ade80', fontWeight: 700, px: 0.3 }} />
                                                )}
                                              </Box>
                                            </Box>
                                            <Box sx={{ height: 4, borderRadius: 2, bgcolor: tok('--overlay-subtle'), overflow: 'hidden' }}>
                                              <Box sx={{ height: '100%', width: `${item.percentage}%`, bgcolor: postSessionAnalytics.preSubReasons.has(item.name) ? colors.error : colors.success, borderRadius: 2, transition: 'width 0.6s ease' }} />
                                            </Box>
                                          </Box>
                                        </Box>
                                      ))}
                                    </Box>
                                  </Grid>
                                  {/* Root Cause */}
                                  <Grid item xs={12} md={4}>
                                    <Typography variant="caption" sx={{ color: tok('--text-secondary'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1.5 }}>By Root Cause</Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                      {postSessionAnalytics.ownerChartData[activePostSessionOwner].rootCauseData.slice(0, 6).map((item, idx) => (
                                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                              <Typography variant="caption" sx={{ color: tok('--text'), fontWeight: 600, fontSize: '0.78rem' }}>{item.name}</Typography>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Typography variant="caption" sx={{ color: colors.error, fontWeight: 800 }}>{item.value}</Typography>
                                                {postSessionAnalytics.preRootCauses.has(item.name) ? (
                                                  <Chip label="Repeat" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(239,68,68,0.15)', color: '#f87171', fontWeight: 700, px: 0.3 }} />
                                                ) : (
                                                  <Chip label="New" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(34,197,94,0.15)', color: '#4ade80', fontWeight: 700, px: 0.3 }} />
                                                )}
                                              </Box>
                                            </Box>
                                            <Box sx={{ height: 4, borderRadius: 2, bgcolor: tok('--overlay-subtle'), overflow: 'hidden' }}>
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
                          <Typography sx={{ color: tok('--text-secondary') }}>Excellent! No violations recorded since the last session on {formatDate(postSessionAnalytics.latestSessionDate)}.</Typography>
                        </Paper>
                      )}
                    </Box>
                  )}

                  {/* Post-Session Violation Registry — appears BEFORE the Technical Task Registry */}
                  {showPostSessionRegistry && postSessionAnalytics.hasTasks && (
                    <Box sx={{ mb: 4, animation: 'fadeIn 0.5s ease-in' }}>
                      <Paper sx={{
                        p: 0,
                        bgcolor: tok('--surface'),
                        borderRadius: 3,
                        border: `1px solid ${colors.primary}40`,
                        overflow: 'hidden',
                        background: `linear-gradient(145deg, #1e293b 0%, ${colors.primary}10 100%)`
                      }}>
                        <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="h6" fontWeight="700" color={tok('--text')}>Detailed Violation History</Typography>
                            <Typography variant="caption" sx={{ color: colors.primary }}>Granular view of violations occurring after {formatDate(postSessionAnalytics.latestSessionDate)}</Typography>
                          </Box>
                          <Chip label={`${postSessionAnalytics.totalPostTasks} Violations`} size="small" sx={{ bgcolor: `${colors.primary}20`, color: colors.primary, fontWeight: 800 }} />
                        </Box>
                        <Box sx={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: tok('--bg') }}>
                              <tr>
                                <th style={{ padding: '16px', textAlign: 'left', color: tok('--text-secondary'), fontSize: '0.75rem' }}>DATE</th>
                                <th style={{ padding: '16px', textAlign: 'left', color: tok('--text-secondary'), fontSize: '0.75rem' }}>SLID</th>
                                <th style={{ padding: '16px', textAlign: 'left', color: tok('--text-secondary'), fontSize: '0.75rem' }}>REASON (PRIMARY)</th>
                                <th style={{ padding: '16px', textAlign: 'left', color: tok('--text-secondary'), fontSize: '0.75rem' }}>SUB-REASON</th>
                                <th style={{ padding: '16px', textAlign: 'left', color: tok('--text-secondary'), fontSize: '0.75rem' }}>ROOT CAUSE</th>
                                <th style={{ padding: '16px', textAlign: 'left', color: tok('--text-secondary'), fontSize: '0.75rem' }}>OWNERSHIP</th>
                                <th style={{ padding: '16px', textAlign: 'center', color: tok('--text-secondary'), fontSize: '0.75rem' }}>RECURRENCE</th>
                                <th style={{ padding: '16px', textAlign: 'center', color: tok('--text-secondary'), fontSize: '0.75rem' }}>SENTIMENT</th>
                                <th style={{ padding: '16px', textAlign: 'center', color: tok('--text-secondary'), fontSize: '0.75rem' }}>ACTIONS</th>
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
                                    <td style={{ padding: '16px', color: tok('--text-secondary'), fontSize: '0.8rem' }}>{formatDate(task.pisDate || task.createdAt)}</td>
                                    <td style={{ padding: '16px', color: colors.primary, fontWeight: 'bold' }}>{task.slid}</td>
                                    <td style={{ padding: '16px', color: tok('--text'), fontSize: '0.8rem' }}>
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                                        <span>{reasons[0] || 'N/A'}</span>
                                        {task.isRepeatReason && reasons[0] && reasons[0] !== 'N/A' && (
                                          <Typography variant="caption" sx={{ color: '#f87171', fontSize: '0.6rem' }}>⚠ seen before training session</Typography>
                                        )}
                                      </Box>
                                    </td>
                                    <td style={{ padding: '16px', color: tok('--text'), fontSize: '0.8rem' }}>{subReasons[0] || 'N/A'}</td>
                                    <td style={{ padding: '16px', color: tok('--text'), fontSize: '0.8rem' }}>{rootCauses[0] || 'N/A'}</td>
                                    <td style={{ padding: '16px' }}>
                                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {owners.map((o, idx) => (
                                          <Chip key={idx} label={o} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: tok('--overlay-subtle'), color: '#fff' }} />
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
                      bgcolor: tok('--surface'),
                      borderRadius: 3,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      overflow: 'hidden',
                      background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                    }}
                  >
                    <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" fontWeight="700" color={tok('--text')}>Technical Task Registry</Typography>
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
                        <thead style={{ background: tok('--bg') }}>
                          <tr>
                            <th style={{ padding: '16px', textAlign: 'left', color: tok('--text-secondary'), fontSize: '0.75rem' }}>REQUEST NO</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: tok('--text-secondary'), fontSize: '0.75rem' }}>CUSTOMER</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: tok('--text-secondary'), fontSize: '0.75rem' }}>SLID</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: tok('--text-secondary'), fontSize: '0.75rem' }}>PIS DATE</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: tok('--text-secondary'), fontSize: '0.75rem' }}>PRIORITY</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: tok('--text-secondary'), fontSize: '0.75rem' }}>STATUS</th>
                            <th style={{ padding: '16px', textAlign: 'center', color: tok('--text-secondary'), fontSize: '0.75rem' }}>SCORE</th>
                            <th style={{ padding: '16px', textAlign: 'center', color: tok('--text-secondary'), fontSize: '0.75rem' }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTechnicalTasks.map((task) => (
                            <tr key={task._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: '0.2s' }}>
                              <td style={{ padding: '16px', color: tok('--text'), fontSize: '0.85rem' }}>{task.requestNumber || 'N/A'}</td>
                              <td style={{ padding: '16px', color: tok('--text'), fontSize: '0.85rem' }}>{task.customerName}</td>
                              <td style={{ padding: '16px', color: colors.primary, fontWeight: 'bold' }}>{task.slid}</td>
                              <td style={{ padding: '16px', color: tok('--text-secondary'), fontSize: '0.85rem' }}>{formatDate(task.pisDate || task.createdAt)}</td>
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
                              <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: tok('--text-secondary') }}>
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

              {/* 4. ONLINE EXAM ASSESSMENTS */}
              {activeTab === 3 && (
                <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                      <Typography variant="h5" sx={{ color: colors.primary, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PsychologyIcon sx={{ color: colors.primary }} /> Online Theoretical Exam Assessments
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textSecondary, mt: 0.5 }}>
                        Individual theoretical knowledge assessments, technical Q&A scoring, and quality standard compliance
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<TableChartIcon />}
                          onClick={exportTheoreticalToExcel}
                          disabled={quizResults.length === 0}
                          sx={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: tok('--text'),
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: '8px',
                            px: 2,
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                            }
                          }}
                        >
                          Export Exam Report (.xlsx)
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<PictureAsPdfIcon />}
                          onClick={() => exportTestToPDF('theoretical', quizResults)}
                          disabled={quizResults.length === 0}
                          sx={{
                            color: colors.error,
                            borderColor: alpha(colors.error, 0.5),
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: '8px',
                            px: 2,
                            '&:hover': { borderColor: colors.error, bgcolor: `${colors.error}11` }
                          }}
                        >
                          PDF Summary
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AssessmentIcon />}
                          onClick={() => {
                            navigate(`/assessment-dashboard?teamId=${selectedTeam?._id || ''}`, {
                              state: {
                                teamId: selectedTeam?._id,
                                teamName: selectedTeam?.teamName,
                                fromPortal: true
                              }
                            });
                          }}
                          sx={{
                            color: '#c4b5fd',
                            borderColor: 'rgba(139, 92, 246, 0.5)',
                            bgcolor: 'rgba(139, 92, 246, 0.12)',
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: '8px',
                            px: 2,
                            '&:hover': {
                              borderColor: '#a78bfa',
                              bgcolor: 'rgba(139, 92, 246, 0.25)'
                            }
                          }}
                        >
                          Assessment Dashboard
                        </Button>
                      </Box>
                    </Box>

                    {(() => {
                      const avgScore = calculateAverageScore(quizResults);
                      const passedCount = quizResults.filter(q => (q.percentage || 0) >= 80).length;
                      const isPassing = avgScore >= 80;
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Chip
                            label={`Overall Average: ${Math.round(avgScore)}%`}
                            sx={{
                              bgcolor: isPassing ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: isPassing ? '#10b981' : '#ef4444',
                              borderColor: isPassing ? '#10b981' : '#ef4444',
                              borderWidth: 1,
                              borderStyle: 'solid',
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              py: 2.2,
                              px: 1
                            }}
                          />
                          <Chip
                            label={`Pass Rate: ${quizResults.length > 0 ? Math.round((passedCount / quizResults.length) * 100) : 0}% (${passedCount}/${quizResults.length})`}
                            sx={{
                              bgcolor: 'rgba(59, 130, 246, 0.2)',
                              color: '#60a5fa',
                              fontWeight: 700,
                              py: 2.2,
                              px: 1
                            }}
                          />
                        </Box>
                      );
                    })()}
                  </Box>

                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                      <CircularProgress sx={{ color: colors.primary }} />
                    </Box>
                  ) : quizResults.length > 0 ? (
                    <>
                      <TableContainer component={Paper} sx={{
                        mb: 2,
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        bgcolor: 'rgba(20, 20, 25, 0.6)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                        overflow: 'hidden'
                      }}>
                        <Table>
                          <TableHead sx={{ bgcolor: tok('--overlay-subtle') }}>
                            <TableRow>
                              <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Exam Date</TableCell>
                              <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Exam Standard / Quiz Code</TableCell>
                              <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Candidate & Team</TableCell>
                              <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Accuracy & Breakdown</TableCell>
                              <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Score %</TableCell>
                              <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Exam Status</TableCell>
                              <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {quizResults
                              .slice(quizPage * quizRowsPerPage, quizPage * quizRowsPerPage + quizRowsPerPage)
                              .map((result) => {
                                const pct = Number(result.percentage !== undefined ? result.percentage : (String(result.score || '').replace('%', ''))) || 0;
                                const isPass = pct >= 80;
                                const scoreColor = pct >= 90 ? '#10b981' : pct >= 80 ? '#14b8a6' : pct >= 70 ? '#f59e0b' : '#ef4444';
                                const expStr = formatExperienceDuration(
                                  result.fieldTeamId?.experienceYears || selectedTeam?.experienceYears,
                                  result.fieldTeamId?.experienceMonths || selectedTeam?.experienceMonths,
                                  result.fieldTeamId?.experienceDays || selectedTeam?.experienceDays,
                                  result.fieldTeamId?.yearsOfExperience || selectedTeam?.yearsOfExperience
                                );
                                const dobVal = result.fieldTeamId?.dateOfBirth || selectedTeam?.dateOfBirth;
                                let ageNum = result.fieldTeamId?.age !== undefined && result.fieldTeamId?.age !== null ? result.fieldTeamId.age : (selectedTeam?.age !== undefined && selectedTeam?.age !== null ? selectedTeam.age : null);
                                if (ageNum === null && dobVal) {
                                  const birth = new Date(dobVal);
                                  const ref = result.submittedAt ? new Date(result.submittedAt) : new Date();
                                  let a = ref.getFullYear() - birth.getFullYear();
                                  const m = ref.getMonth() - birth.getMonth();
                                  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) a--;
                                  ageNum = a >= 0 ? a : null;
                                }

                                return (
                                  <TableRow
                                    key={result._id || Math.random()}
                                    sx={{
                                      transition: '0.2s',
                                      '&:hover': {
                                        backgroundColor: tok('--overlay-subtle')
                                      }
                                    }}
                                  >
                                    <TableCell sx={{ color: tok('--text'), borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {safeFormatDate(result.submittedAt || result.createdAt)}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                        Online Theoretical Exam
                                      </Typography>
                                    </TableCell>

                                    <TableCell sx={{ color: tok('--text'), borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#60a5fa' }}>
                                        {result.quizCode || 'FTTH-EXAM-STD'}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                        FTTH Quality Standards Quiz
                                      </Typography>
                                    </TableCell>

                                    <TableCell sx={{ color: tok('--text'), borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: tok('--text-secondary') }}>
                                          {result.candidateName || result.fieldTeamName || selectedTeam?.teamName || 'Technician'}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                          {expStr && (
                                            <Chip
                                              label={`Exp: ${expStr}`}
                                              size="small"
                                              sx={{
                                                bgcolor: 'rgba(59, 130, 246, 0.12)',
                                                color: '#60a5fa',
                                                fontWeight: 600,
                                                fontSize: '0.72rem',
                                                height: 20
                                              }}
                                            />
                                          )}
                                          {ageNum !== null && (
                                            <Chip
                                              label={`Age: ${ageNum} Yrs`}
                                              size="small"
                                              sx={{
                                                bgcolor: 'rgba(233, 30, 99, 0.12)',
                                                color: '#f472b6',
                                                fontWeight: 700,
                                                fontSize: '0.72rem',
                                                height: 20
                                              }}
                                            />
                                          )}
                                        </Box>
                                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                          {result.fieldTeamId?.teamCompany || selectedTeam?.teamCompany || 'Subcontractor'}
                                        </Typography>
                                      </Box>
                                    </TableCell>

                                    <TableCell sx={{ color: tok('--text'), borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Chip
                                          label={`${result.correctAnswers || 0} / ${result.totalQuestions || 50} Correct`}
                                          size="small"
                                          sx={{
                                            bgcolor: 'rgba(139, 92, 246, 0.15)',
                                            color: '#c4b5fd',
                                            fontWeight: 700,
                                            fontSize: '0.75rem',
                                            width: 'fit-content'
                                          }}
                                        />
                                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                          Accuracy: {result.totalQuestions ? Math.round(((result.correctAnswers || 0) / result.totalQuestions) * 100) : pct}%
                                        </Typography>
                                      </Box>
                                    </TableCell>

                                    <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 800, color: scoreColor }}>
                                          {pct}%
                                        </Typography>
                                        <LinearProgress
                                          variant="determinate"
                                          value={Math.min(100, Math.max(0, pct))}
                                          sx={{
                                            width: 60,
                                            height: 4,
                                            borderRadius: 2,
                                            bgcolor: tok('--overlay-subtle'),
                                            '& .MuiLinearProgress-bar': {
                                              bgcolor: scoreColor
                                            }
                                          }}
                                        />
                                      </Box>
                                    </TableCell>

                                    <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Chip
                                        label={isPass ? (pct >= 90 ? 'Excellent (Pass)' : 'Passed') : 'Fail (Retake Required)'}
                                        sx={{
                                          bgcolor: isPass ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                          color: isPass ? '#10b981' : '#ef4444',
                                          borderColor: isPass ? '#10b981' : '#ef4444',
                                          borderWidth: 1,
                                          borderStyle: 'solid',
                                          fontWeight: 700,
                                          fontSize: '0.8rem'
                                        }}
                                      />
                                    </TableCell>

                                    <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Stack direction="row" spacing={1} justifyContent="center">
                                        <MuiTooltip title="View Detailed Exam in Assessment Dashboard" arrow>
                                          <Button
                                            size="small"
                                            variant="contained"
                                            onClick={() => {
                                              navigate(`/assessment-dashboard?teamId=${selectedTeam?._id || result.teamId}&resultId=${result._id}`, {
                                                state: {
                                                  teamId: selectedTeam?._id || result.teamId,
                                                  teamName: selectedTeam?.teamName || result.teamName,
                                                  resultId: result._id,
                                                  selectedResult: result,
                                                  fromPortal: true
                                                }
                                              });
                                            }}
                                            sx={{
                                              bgcolor: 'rgba(139, 92, 246, 0.2)',
                                              color: '#c4b5fd',
                                              border: '1px solid rgba(139, 92, 246, 0.4)',
                                              textTransform: 'none',
                                              fontSize: '0.75rem',
                                              fontWeight: 600,
                                              borderRadius: '6px',
                                              minWidth: 32,
                                              px: 1.5,
                                              '&:hover': {
                                                bgcolor: 'rgba(139, 92, 246, 0.4)'
                                              }
                                            }}
                                            startIcon={<VisibilityIcon sx={{ fontSize: '1rem !important' }} />}
                                          >
                                            View
                                          </Button>
                                        </MuiTooltip>
                                        <MuiTooltip title="Edit / Grade Exam in Assessment Dashboard" arrow>
                                          <IconButton
                                            size="small"
                                            onClick={() => {
                                              navigate(`/assessment-dashboard?teamId=${selectedTeam?._id || result.teamId}&resultId=${result._id}&edit=true`, {
                                                state: {
                                                  teamId: selectedTeam?._id || result.teamId,
                                                  teamName: selectedTeam?.teamName || result.teamName,
                                                  resultId: result._id,
                                                  selectedResult: result,
                                                  mode: 'edit',
                                                  fromPortal: true
                                                }
                                              });
                                            }}
                                            sx={{
                                              bgcolor: 'rgba(59, 130, 246, 0.15)',
                                              color: '#60a5fa',
                                              border: '1px solid rgba(59, 130, 246, 0.3)',
                                              borderRadius: '6px',
                                              '&:hover': {
                                                bgcolor: 'rgba(59, 130, 246, 0.3)'
                                              }
                                            }}
                                          >
                                            <EditIcon sx={{ fontSize: '1rem' }} />
                                          </IconButton>
                                        </MuiTooltip>
                                        <MuiTooltip title="Permanently Delete Exam Result" arrow>
                                          <IconButton
                                            size="small"
                                            onClick={() => {
                                              setQuizToDelete(result);
                                              setDeleteQuizDialogOpen(true);
                                            }}
                                            sx={{
                                              bgcolor: 'rgba(239, 68, 68, 0.15)',
                                              color: '#ef4444',
                                              border: '1px solid rgba(239, 68, 68, 0.3)',
                                              borderRadius: '6px',
                                              '&:hover': {
                                                bgcolor: 'rgba(239, 68, 68, 0.3)'
                                              }
                                            }}
                                          >
                                            <DeleteIcon sx={{ fontSize: '1rem' }} />
                                          </IconButton>
                                        </MuiTooltip>
                                      </Stack>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
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
                    <Paper sx={{
                      p: 5,
                      textAlign: 'center',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      bgcolor: 'rgba(25, 25, 30, 0.5)',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <PsychologyIcon sx={{ fontSize: 48, color: alpha(colors.primary, 0.4), mb: 1.5 }} />
                      <Typography variant="h6" sx={{ color: tok('--text'), fontWeight: 700, mb: 0.5 }}>
                        No Online Exam Assessments Recorded for {selectedTeam?.teamName || 'this team'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textSecondary, maxWidth: 500, mx: 'auto' }}>
                        When field technicians complete theoretical knowledge quizzes, their scores and response accuracy will appear here.
                      </Typography>
                    </Paper>
                  )}
                </Box>
              )}

              {/* 5. OTJ ASSESSMENTS */}
              {activeTab === 4 && (
                <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                      <Typography variant="h5" sx={{ color: colors.primary, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleIcon sx={{ color: '#10b981' }} /> On-The-Job (OTJ) Practical Field Assessments
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textSecondary, mt: 0.5 }}>
                        Live customer installation audits, field fiber splicing verification, and on-site HSE compliance
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<TableChartIcon />}
                          onClick={exportPracticalToExcel}
                          disabled={jobAssessments.length === 0}
                          sx={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: tok('--text'),
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: '8px',
                            px: 2,
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                            }
                          }}
                        >
                          Export OTJ Report (.xlsx)
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<PictureAsPdfIcon />}
                          onClick={() => exportTestToPDF('practical', jobAssessments)}
                          disabled={jobAssessments.length === 0}
                          sx={{
                            color: colors.error,
                            borderColor: alpha(colors.error, 0.5),
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: '8px',
                            px: 2,
                            '&:hover': { borderColor: colors.error, bgcolor: `${colors.error}11` }
                          }}
                        >
                          PDF Summary
                        </Button>
                      </Box>
                    </Box>

                    {(() => {
                      const avgScore = calculateAverageScore(jobAssessments);
                      const avgTier = getLabTierStatus(avgScore);
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Chip
                            label={`Overall Average: ${Math.round(avgScore)}%`}
                            sx={{
                              bgcolor: alpha(avgTier.color, 0.15),
                              color: avgTier.color,
                              borderColor: avgTier.color,
                              borderWidth: 1,
                              borderStyle: 'solid',
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              py: 2.2,
                              px: 1
                            }}
                          />
                          <Chip
                            label={`${avgTier.label} (${avgTier.status})`}
                            sx={{
                              bgcolor: alpha(avgTier.color, 0.25),
                              color: tok('--text'),
                              fontWeight: 700,
                              py: 2.2,
                              px: 1
                            }}
                          />
                        </Box>
                      );
                    })()}
                  </Box>

                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                      <CircularProgress sx={{ color: colors.primary }} />
                    </Box>
                  ) : jobAssessments.length > 0 ? (
                    <>
                      <TableContainer component={Paper} sx={{
                        mb: 2,
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        bgcolor: 'rgba(20, 20, 25, 0.6)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                        overflow: 'hidden'
                      }}>
                        <Table>
                          <TableHead sx={{ bgcolor: tok('--overlay-subtle') }}>
                            <TableRow>
                              <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Assessment Date</TableCell>
                              <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Evaluator / Supervisor</TableCell>
                              <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Experience & Role</TableCell>
                              <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Verified Scope & Checkpoints</TableCell>
                              <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Proficiency Score %</TableCell>
                              <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Qualification Status</TableCell>
                              <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {jobAssessments
                              .slice(jobPage * jobRowsPerPage, jobPage * jobRowsPerPage + jobRowsPerPage)
                              .map((assessment) => {
                                const rawScore = Number(assessment.overallScore || assessment.percentage || 0);
                                const scoreVal = rawScore <= 5 ? Math.round((rawScore / 5) * 100) : Math.round(rawScore);
                                const tier = getLabTierStatus(scoreVal);
                                const expStr = formatExperienceDuration(
                                  assessment.fieldTeamId?.experienceYears || selectedTeam?.experienceYears,
                                  assessment.fieldTeamId?.experienceMonths || selectedTeam?.experienceMonths,
                                  assessment.fieldTeamId?.experienceDays || selectedTeam?.experienceDays,
                                  assessment.fieldTeamId?.yearsOfExperience || selectedTeam?.yearsOfExperience
                                );
                                const dobVal = assessment.fieldTeamId?.dateOfBirth || selectedTeam?.dateOfBirth;
                                let ageNum = assessment.fieldTeamId?.age !== undefined && assessment.fieldTeamId?.age !== null ? assessment.fieldTeamId.age : (selectedTeam?.age !== undefined && selectedTeam?.age !== null ? selectedTeam.age : null);
                                if (ageNum === null && dobVal) {
                                  const birth = new Date(dobVal);
                                  const ref = assessment.assessmentDate ? new Date(assessment.assessmentDate) : new Date();
                                  let a = ref.getFullYear() - birth.getFullYear();
                                  const m = ref.getMonth() - birth.getMonth();
                                  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) a--;
                                  ageNum = a >= 0 ? a : null;
                                }
                                const checkPointCount = assessment.checkPoints?.length || 20;

                                return (
                                  <TableRow
                                    key={assessment._id || Math.random()}
                                    sx={{
                                      transition: '0.2s',
                                      '&:hover': {
                                        backgroundColor: tok('--overlay-subtle')
                                      }
                                    }}
                                  >
                                    <TableCell sx={{ color: tok('--text'), borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {safeFormatDate(assessment.assessmentDate || assessment.createdAt)}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                        On-The-Job Field Assessment
                                      </Typography>
                                    </TableCell>

                                    <TableCell sx={{ color: tok('--text'), borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Typography variant="body2" sx={{ fontWeight: 600, color: tok('--text-secondary') }}>
                                        {assessment.conductedBy || 'Quality Field Supervisor'}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                        Nokia Field Quality Assessor
                                      </Typography>
                                    </TableCell>

                                    <TableCell sx={{ color: tok('--text'), borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                          {expStr && (
                                            <Chip
                                              label={`Exp: ${expStr}`}
                                              size="small"
                                              sx={{
                                                bgcolor: 'rgba(59, 130, 246, 0.12)',
                                                color: '#60a5fa',
                                                fontWeight: 600,
                                                fontSize: '0.75rem',
                                                width: 'fit-content'
                                              }}
                                            />
                                          )}
                                          {ageNum !== null && (
                                            <Chip
                                              label={`Age: ${ageNum} Yrs`}
                                              size="small"
                                              sx={{
                                                bgcolor: 'rgba(233, 30, 99, 0.12)',
                                                color: '#f472b6',
                                                fontWeight: 700,
                                                fontSize: '0.72rem',
                                                height: 20
                                              }}
                                            />
                                          )}
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                            {assessment.fieldTeamId?.teamCompany || selectedTeam?.teamCompany || 'Subcontractor'}
                                          </Typography>
                                          {dobVal && (
                                            <Typography variant="caption" sx={{ color: tok('--text-secondary'), fontSize: '0.7rem' }}>
                                              • DoB: {safeFormatDate(dobVal)}
                                            </Typography>
                                          )}
                                        </Box>
                                      </Box>
                                    </TableCell>

                                    <TableCell sx={{ color: tok('--text'), borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 240 }}>
                                        <Chip
                                          label={`${checkPointCount} Checkpoints`}
                                          size="small"
                                          sx={{
                                            bgcolor: 'rgba(16, 185, 129, 0.15)',
                                            color: '#34d399',
                                            fontWeight: 700,
                                            fontSize: '0.72rem',
                                            height: 20
                                          }}
                                        />
                                        <Chip
                                          label="5 Categories Verified"
                                          size="small"
                                          sx={{
                                            bgcolor: 'rgba(139, 92, 246, 0.15)',
                                            color: '#c4b5fd',
                                            fontWeight: 700,
                                            fontSize: '0.72rem',
                                            height: 20
                                          }}
                                        />
                                      </Box>
                                    </TableCell>

                                    <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 800, color: tier.color }}>
                                          {scoreVal}%
                                        </Typography>
                                        <LinearProgress
                                          variant="determinate"
                                          value={Math.min(100, Math.max(0, scoreVal))}
                                          sx={{
                                            width: 60,
                                            height: 4,
                                            borderRadius: 2,
                                            bgcolor: tok('--overlay-subtle'),
                                            '& .MuiLinearProgress-bar': {
                                              bgcolor: tier.color
                                            }
                                          }}
                                        />
                                      </Box>
                                    </TableCell>

                                    <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Chip
                                        label={`${tier.label} (${tier.status})`}
                                        sx={{
                                          bgcolor: tier.bg,
                                          color: tier.color,
                                          borderColor: tier.borderColor,
                                          borderWidth: 1,
                                          borderStyle: 'solid',
                                          fontWeight: 700,
                                          fontSize: '0.8rem'
                                        }}
                                      />
                                    </TableCell>

                                    <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Stack direction="row" spacing={1} justifyContent="center">
                                        <MuiTooltip title="View Comprehensive OTJ Details" arrow>
                                          <Button
                                            size="small"
                                            variant="contained"
                                            onClick={() => {
                                              setSelectedJobDetail(assessment);
                                              setJobDetailOpen(true);
                                            }}
                                            sx={{
                                              bgcolor: 'rgba(139, 92, 246, 0.2)',
                                              color: '#c4b5fd',
                                              border: '1px solid rgba(139, 92, 246, 0.4)',
                                              textTransform: 'none',
                                              fontSize: '0.75rem',
                                              fontWeight: 600,
                                              borderRadius: '6px',
                                              minWidth: 32,
                                              px: 1.5,
                                              '&:hover': {
                                                bgcolor: 'rgba(139, 92, 246, 0.4)'
                                              }
                                            }}
                                            startIcon={<VisibilityIcon sx={{ fontSize: '1rem !important' }} />}
                                          >
                                            View
                                          </Button>
                                        </MuiTooltip>
                                        <MuiTooltip title="Edit OTJ Assessment" arrow>
                                          <IconButton
                                            size="small"
                                            onClick={() => navigate(`/on-the-job-assessment?editId=${assessment._id}`)}
                                            sx={{
                                              bgcolor: 'rgba(59, 130, 246, 0.15)',
                                              color: '#60a5fa',
                                              border: '1px solid rgba(59, 130, 246, 0.3)',
                                              borderRadius: '6px',
                                              '&:hover': {
                                                bgcolor: 'rgba(59, 130, 246, 0.3)'
                                              }
                                            }}
                                          >
                                            <EditIcon sx={{ fontSize: '1rem' }} />
                                          </IconButton>
                                        </MuiTooltip>
                                        <MuiTooltip title="Permanently Delete OTJ Assessment" arrow>
                                          <IconButton
                                            size="small"
                                            onClick={() => {
                                              setJobAssessmentToDelete(assessment);
                                              setDeleteJobDialogOpen(true);
                                            }}
                                            sx={{
                                              bgcolor: 'rgba(239, 68, 68, 0.15)',
                                              color: '#ef4444',
                                              border: '1px solid rgba(239, 68, 68, 0.3)',
                                              borderRadius: '6px',
                                              '&:hover': {
                                                bgcolor: 'rgba(239, 68, 68, 0.3)'
                                              }
                                            }}
                                          >
                                            <DeleteIcon sx={{ fontSize: '1rem' }} />
                                          </IconButton>
                                        </MuiTooltip>
                                      </Stack>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
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
                    <Paper sx={{
                      p: 5,
                      textAlign: 'center',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      bgcolor: 'rgba(25, 25, 30, 0.5)',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <CheckCircleIcon sx={{ fontSize: 48, color: alpha(colors.primary, 0.4), mb: 1.5 }} />
                      <Typography variant="h6" sx={{ color: tok('--text'), fontWeight: 700, mb: 0.5 }}>
                        No Practical OTJ Assessments Recorded for {selectedTeam?.teamName || 'this team'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textSecondary, maxWidth: 500, mx: 'auto' }}>
                        To evaluate this team in the field during live customer installations, head over to the On-The-Job Assessment module.
                      </Typography>
                    </Paper>
                  )}
                </Box>
              )}

              {/* 6. LAB ASSESSMENTS (Modernized E2E FTTH Practical Assessment View) */}
              {activeTab === 5 && (
                <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                      <Typography variant="h5" sx={{ color: colors.primary, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assessment sx={{ color: colors.primary }} /> E2E FTTH Practical Lab Assessments
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textSecondary, mt: 0.5 }}>
                        Comprehensive hands-on evaluation for ONT configuration, fiber splicing, tools readiness & safety compliance
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<TableChartIcon />}
                          onClick={exportLabToExcel}
                          disabled={labAssessments.length === 0}
                          sx={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: tok('--text'),
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: '8px',
                            px: 2,
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                            }
                          }}
                        >
                          Export Lab Report (.xlsx)
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<PictureAsPdfIcon />}
                          onClick={() => exportTestToPDF('lab', labAssessments)}
                          disabled={labAssessments.length === 0}
                          sx={{
                            color: colors.error,
                            borderColor: alpha(colors.error, 0.5),
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: '8px',
                            px: 2,
                            '&:hover': { borderColor: colors.error, bgcolor: `${colors.error}11` }
                          }}
                        >
                          PDF Summary
                        </Button>
                      </Box>
                    </Box>

                    {(() => {
                      const avgScore = calculateAverageScore(labAssessments);
                      const avgTier = getLabTierStatus(avgScore);
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Chip
                            label={`Overall Average: ${Math.round(avgScore)}%`}
                            sx={{
                              bgcolor: alpha(avgTier.color, 0.15),
                              color: avgTier.color,
                              borderColor: avgTier.color,
                              borderWidth: 1,
                              borderStyle: 'solid',
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              py: 2.2,
                              px: 1
                            }}
                          />
                          <Chip
                            label={`${avgTier.label} (${avgTier.status})`}
                            sx={{
                              bgcolor: alpha(avgTier.color, 0.25),
                              color: tok('--text'),
                              fontWeight: 700,
                              py: 2.2,
                              px: 1
                            }}
                          />
                        </Box>
                      );
                    })()}
                  </Box>

                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                      <CircularProgress sx={{ color: colors.primary }} />
                    </Box>
                  ) : labAssessments.length > 0 ? (
                    <>
                      <TableContainer component={Paper} sx={{
                        mb: 2,
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        bgcolor: 'rgba(20, 20, 25, 0.6)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                        overflow: 'hidden'
                      }}>
                        <Table>
                          <TableHead sx={{ bgcolor: tok('--overlay-subtle') }}>
                            <TableRow>
                              <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Assessment Date</TableCell>
                              <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Evaluator / Assessor</TableCell>
                              <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Experience & Role</TableCell>
                              <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Clearances & Certs</TableCell>
                              <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Score %</TableCell>
                              <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Qualification Status</TableCell>
                              <TableCell align="center" sx={{ color: colors.textSecondary, fontWeight: 700, fontSize: '0.85rem' }}>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {labAssessments
                              .slice(labPage * labRowsPerPage, labPage * labRowsPerPage + labRowsPerPage)
                              .map((assessment) => {
                                const scoreVal = assessment.totalScore !== undefined ? assessment.totalScore : (assessment.overallScore || 0);
                                const tier = getLabTierStatus(scoreVal);
                                const expStr = formatExperienceDuration(assessment.experienceYears, assessment.experienceMonths, assessment.experienceDays, assessment.yearsOfExperience);
                                const certsObj = assessment.certificates || {};
                                const certKeys = Object.keys(certsObj).filter(k => certsObj[k]);

                                return (
                                  <TableRow
                                    key={assessment._id || Math.random()}
                                    sx={{
                                      transition: '0.2s',
                                      '&:hover': {
                                        backgroundColor: tok('--overlay-subtle')
                                      }
                                    }}
                                  >
                                    <TableCell sx={{ color: tok('--text'), borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {safeFormatDate(assessment.assessmentDate || assessment.createdAt)}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                        {assessment.assessmentType || 'E2E FTTH Practical Assessment'}
                                      </Typography>
                                    </TableCell>

                                    <TableCell sx={{ color: tok('--text'), borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Typography variant="body2" sx={{ fontWeight: 600, color: tok('--text-secondary') }}>
                                        {assessment.conductedBy || assessment.assessorId?.name || 'Quality Assessor'}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                        {assessment.ontModel ? `ONT: ${assessment.ontModel.split(',')[0]}` : 'Multi-ONT Evaluation'}
                                      </Typography>
                                    </TableCell>

                                    <TableCell sx={{ color: tok('--text'), borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      {(() => {
                                        const dobVal = assessment.dateOfBirth || assessment.fieldTeamId?.dateOfBirth;
                                        let ageNum = assessment.age !== undefined && assessment.age !== null ? assessment.age : (assessment.fieldTeamId?.age !== undefined && assessment.fieldTeamId?.age !== null ? assessment.fieldTeamId.age : null);
                                        if (ageNum === null && dobVal) {
                                          const birth = new Date(dobVal);
                                          const ref = assessment.assessmentDate ? new Date(assessment.assessmentDate) : new Date();
                                          let a = ref.getFullYear() - birth.getFullYear();
                                          const m = ref.getMonth() - birth.getMonth();
                                          if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) a--;
                                          ageNum = a >= 0 ? a : null;
                                        }

                                        return (
                                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                              <Chip
                                                label={`Exp: ${expStr}`}
                                                size="small"
                                                sx={{
                                                  bgcolor: 'rgba(59, 130, 246, 0.12)',
                                                  color: '#60a5fa',
                                                  fontWeight: 600,
                                                  fontSize: '0.75rem',
                                                  width: 'fit-content'
                                                }}
                                              />
                                              {ageNum !== null && (
                                                <Chip
                                                  label={`Age: ${ageNum} Yrs`}
                                                  size="small"
                                                  sx={{
                                                    bgcolor: 'rgba(233, 30, 99, 0.12)',
                                                    color: '#f472b6',
                                                    fontWeight: 700,
                                                    fontSize: '0.72rem',
                                                    height: 20
                                                  }}
                                                />
                                              )}
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                                {assessment.employmentType || 'Subcontractor'}
                                              </Typography>
                                              {dobVal && (
                                                <Typography variant="caption" sx={{ color: tok('--text-secondary'), fontSize: '0.7rem' }}>
                                                  • DoB: {safeFormatDate(dobVal)}
                                                </Typography>
                                              )}
                                            </Box>
                                          </Box>
                                        );
                                      })()}
                                    </TableCell>

                                    <TableCell sx={{ color: tok('--text'), borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      {certKeys.length > 0 ? (
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', maxWidth: 220 }}>
                                          {certKeys.map(k => (
                                            <MuiTooltip key={k} title={CERTIFICATE_DEFINITIONS?.[k] || k} arrow>
                                              <Chip
                                                label={k}
                                                size="small"
                                                sx={{
                                                  bgcolor: 'rgba(139, 92, 246, 0.2)',
                                                  color: '#c4b5fd',
                                                  borderColor: 'rgba(139, 92, 246, 0.4)',
                                                  borderWidth: 1,
                                                  borderStyle: 'solid',
                                                  fontWeight: 700,
                                                  fontSize: '0.7rem',
                                                  height: 20
                                                }}
                                              />
                                            </MuiTooltip>
                                          ))}
                                        </Box>
                                      ) : (
                                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                          None Recorded
                                        </Typography>
                                      )}
                                    </TableCell>

                                    <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 800, color: tier.color }}>
                                          {scoreVal}%
                                        </Typography>
                                        <LinearProgress
                                          variant="determinate"
                                          value={Math.min(100, Math.max(0, scoreVal))}
                                          sx={{
                                            width: 60,
                                            height: 4,
                                            borderRadius: 2,
                                            bgcolor: tok('--overlay-subtle'),
                                            '& .MuiLinearProgress-bar': {
                                              bgcolor: tier.color
                                            }
                                          }}
                                        />
                                      </Box>
                                    </TableCell>

                                    <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Chip
                                        label={`${tier.label} (${tier.status})`}
                                        sx={{
                                          bgcolor: tier.bg,
                                          color: tier.color,
                                          borderColor: tier.borderColor,
                                          borderWidth: 1,
                                          borderStyle: 'solid',
                                          fontWeight: 700,
                                          fontSize: '0.8rem'
                                        }}
                                      />
                                    </TableCell>

                                    <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                      <Stack direction="row" spacing={1} justifyContent="center">
                                        <MuiTooltip title="View Comprehensive Assessment Details" arrow>
                                          <Button
                                            size="small"
                                            variant="contained"
                                            onClick={() => {
                                              setSelectedLabDetail(assessment);
                                              setLabDetailOpen(true);
                                            }}
                                            sx={{
                                              bgcolor: 'rgba(139, 92, 246, 0.2)',
                                              color: '#c4b5fd',
                                              border: '1px solid rgba(139, 92, 246, 0.4)',
                                              textTransform: 'none',
                                              fontSize: '0.75rem',
                                              fontWeight: 600,
                                              borderRadius: '6px',
                                              minWidth: 32,
                                              px: 1.5,
                                              '&:hover': {
                                                bgcolor: 'rgba(139, 92, 246, 0.4)'
                                              }
                                            }}
                                            startIcon={<VisibilityIcon sx={{ fontSize: '1rem !important' }} />}
                                          >
                                            View
                                          </Button>
                                        </MuiTooltip>
                                        <MuiTooltip title="Edit Lab Assessment" arrow>
                                          <IconButton
                                            size="small"
                                            onClick={() => navigate(`/lab-assessment?editId=${assessment._id}`)}
                                            sx={{
                                              bgcolor: 'rgba(59, 130, 246, 0.15)',
                                              color: '#60a5fa',
                                              border: '1px solid rgba(59, 130, 246, 0.3)',
                                              borderRadius: '6px',
                                              '&:hover': {
                                                bgcolor: 'rgba(59, 130, 246, 0.3)'
                                              }
                                            }}
                                          >
                                            <EditIcon sx={{ fontSize: '1rem' }} />
                                          </IconButton>
                                        </MuiTooltip>
                                        <MuiTooltip title="Export Detailed Individual Excel Sheet" arrow>
                                          <IconButton
                                            size="small"
                                            onClick={() => exportIndividualLabAssessmentReport(assessment)}
                                            sx={{
                                              bgcolor: 'rgba(16, 185, 129, 0.15)',
                                              color: '#10b981',
                                              border: '1px solid rgba(16, 185, 129, 0.3)',
                                              borderRadius: '6px',
                                              '&:hover': {
                                                bgcolor: 'rgba(16, 185, 129, 0.3)'
                                              }
                                            }}
                                          >
                                            <TableChartIcon sx={{ fontSize: '1rem' }} />
                                          </IconButton>
                                        </MuiTooltip>
                                        <MuiTooltip title="Permanently Delete Assessment" arrow>
                                          <IconButton
                                            size="small"
                                            onClick={() => {
                                              setLabAssessmentToDelete(assessment);
                                              setDeleteLabDialogOpen(true);
                                            }}
                                            sx={{
                                              bgcolor: 'rgba(239, 68, 68, 0.15)',
                                              color: '#ef4444',
                                              border: '1px solid rgba(239, 68, 68, 0.3)',
                                              borderRadius: '6px',
                                              '&:hover': {
                                                bgcolor: 'rgba(239, 68, 68, 0.3)'
                                              }
                                            }}
                                          >
                                            <DeleteIcon sx={{ fontSize: '1rem' }} />
                                          </IconButton>
                                        </MuiTooltip>
                                      </Stack>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
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
                    <Paper sx={{
                      p: 5,
                      textAlign: 'center',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      bgcolor: 'rgba(25, 25, 30, 0.5)',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <Assessment sx={{ fontSize: 48, color: alpha(colors.primary, 0.4), mb: 1.5 }} />
                      <Typography variant="h6" sx={{ color: tok('--text'), fontWeight: 700, mb: 0.5 }}>
                        No Lab Assessments Recorded for {selectedTeam?.teamName || 'this team'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textSecondary, maxWidth: 500, mx: 'auto' }}>
                        To evaluate and certify this field team in practical fiber splicing and ONT configuration, head over to the Lab Assessment page.
                      </Typography>
                    </Paper>
                  )}
                </Box>
              )}

              {/* Permanent Delete Confirmation Dialog */}
              <Dialog
                open={deleteLabDialogOpen}
                onClose={() => !deletingLab && setDeleteLabDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                  sx: {
                    bgcolor: '#18181b',
                    color: tok('--text'),
                    borderRadius: '20px',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.25)',
                    p: 1
                  }
                }}
              >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1, color: '#ef4444', fontWeight: 800 }}>
                  <WarningIcon sx={{ color: '#ef4444', fontSize: '1.8rem' }} /> Permanent Delete Confirmation
                </DialogTitle>
                <DialogContent sx={{ mt: 1 }}>
                  <Alert severity="error" variant="filled" sx={{ mb: 2.5, borderRadius: '12px', fontWeight: 600 }}>
                    Permanent Delete Warning: This action cannot be undone!
                  </Alert>
                  <Typography variant="body1" sx={{ color: tok('--text-secondary'), mb: 2, lineHeight: 1.6 }}>
                    You are about to permanently delete the <strong>E2E FTTH Practical Assessment</strong> for team{" "}
                    <span style={{ color: '#60a5fa', fontWeight: 700 }}>
                      {labAssessmentToDelete?.fieldTeamName || labAssessmentToDelete?.fieldTeamId?.teamName || selectedTeam?.teamName || 'this team'}
                    </span>.
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: tok('--overlay-subtle'), borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', mb: 2 }}>
                    <Typography variant="caption" sx={{ color: tok('--text-secondary'), display: 'block', mb: 0.5 }}>
                      Assessment Date: <strong>{safeFormatDate(labAssessmentToDelete?.assessmentDate || labAssessmentToDelete?.createdAt)}</strong>
                    </Typography>
                    <Typography variant="caption" sx={{ color: tok('--text-secondary'), display: 'block', mb: 0.5 }}>
                      Assessor / Evaluator: <strong>{labAssessmentToDelete?.conductedBy || labAssessmentToDelete?.assessorId?.name || 'Assessor'}</strong>
                    </Typography>
                    <Typography variant="caption" sx={{ color: tok('--text-secondary'), display: 'block' }}>
                      Score: <strong>{labAssessmentToDelete?.totalScore !== undefined ? labAssessmentToDelete.totalScore : (labAssessmentToDelete?.overallScore || 0)}%</strong>
                    </Typography>
                  </Paper>
                  <Typography variant="body2" sx={{ color: tok('--text-secondary') }}>
                    All evaluation checkpoints, inspection matrices, scores, supervisor comments, and audit records will be permanently removed from the database and exported reports.
                  </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setDeleteLabDialogOpen(false)}
                    disabled={deletingLab}
                    sx={{
                      borderColor: tok('--border'),
                      color: tok('--text-secondary'),
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={confirmDeleteLabAssessment}
                    disabled={deletingLab}
                    startIcon={deletingLab ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
                    sx={{
                      bgcolor: '#dc2626',
                      '&:hover': { bgcolor: '#b91c1c' },
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontWeight: 700,
                      px: 2.5
                    }}
                  >
                    {deletingLab ? "Permanently Deleting..." : "Permanently Delete Assessment"}
                  </Button>
                </DialogActions>
              </Dialog>

              {/* Permanent Delete Confirmation Dialog - OTJ Assessment */}
              <Dialog
                open={deleteJobDialogOpen}
                onClose={() => !deletingJob && setDeleteJobDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                  sx: {
                    bgcolor: '#18181b',
                    color: tok('--text'),
                    borderRadius: '20px',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.25)',
                    p: 1
                  }
                }}
              >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1, color: '#ef4444', fontWeight: 800 }}>
                  <WarningIcon sx={{ color: '#ef4444', fontSize: '1.8rem' }} /> Permanent Delete Confirmation
                </DialogTitle>
                <DialogContent sx={{ mt: 1 }}>
                  <Alert severity="error" variant="filled" sx={{ mb: 2.5, borderRadius: '12px', fontWeight: 600 }}>
                    Permanent Delete Warning: This action cannot be undone!
                  </Alert>
                  <Typography variant="body1" sx={{ color: tok('--text-secondary'), mb: 2, lineHeight: 1.6 }}>
                    You are about to permanently delete the <strong>On-The-Job (OTJ) Practical Field Assessment</strong> for team{" "}
                    <span style={{ color: '#60a5fa', fontWeight: 700 }}>
                      {jobAssessmentToDelete?.fieldTeamName || jobAssessmentToDelete?.fieldTeamId?.teamName || selectedTeam?.teamName || 'this team'}
                    </span>.
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: tok('--overlay-subtle'), borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', mb: 2 }}>
                    <Typography variant="caption" sx={{ color: tok('--text-secondary'), display: 'block', mb: 0.5 }}>
                      Assessment Date: <strong>{safeFormatDate(jobAssessmentToDelete?.assessmentDate || jobAssessmentToDelete?.createdAt)}</strong>
                    </Typography>
                    <Typography variant="caption" sx={{ color: tok('--text-secondary'), display: 'block', mb: 0.5 }}>
                      Supervisor / Evaluator: <strong>{jobAssessmentToDelete?.conductedBy || 'Supervisor'}</strong>
                    </Typography>
                    <Typography variant="caption" sx={{ color: tok('--text-secondary'), display: 'block' }}>
                      Proficiency Score: <strong>{jobAssessmentToDelete?.overallScore || jobAssessmentToDelete?.percentage || 0}%</strong>
                    </Typography>
                  </Paper>
                  <Typography variant="body2" sx={{ color: tok('--text-secondary') }}>
                    All checkpoint scores, category audits, supervisor notes, and historical evaluations will be permanently removed.
                  </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setDeleteJobDialogOpen(false)}
                    disabled={deletingJob}
                    sx={{
                      borderColor: tok('--border'),
                      color: tok('--text-secondary'),
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={confirmDeleteJobAssessment}
                    disabled={deletingJob}
                    startIcon={deletingJob ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
                    sx={{
                      bgcolor: '#dc2626',
                      '&:hover': { bgcolor: '#b91c1c' },
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontWeight: 700,
                      px: 2.5
                    }}
                  >
                    {deletingJob ? "Permanently Deleting..." : "Permanently Delete Assessment"}
                  </Button>
                </DialogActions>
              </Dialog>

              {/* Permanent Delete Confirmation Dialog - Online Exam */}
              <Dialog
                open={deleteQuizDialogOpen}
                onClose={() => !deletingQuiz && setDeleteQuizDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                  sx: {
                    bgcolor: '#18181b',
                    color: tok('--text'),
                    borderRadius: '20px',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.25)',
                    p: 1
                  }
                }}
              >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1, color: '#ef4444', fontWeight: 800 }}>
                  <WarningIcon sx={{ color: '#ef4444', fontSize: '1.8rem' }} /> Permanent Delete Confirmation
                </DialogTitle>
                <DialogContent sx={{ mt: 1 }}>
                  <Alert severity="error" variant="filled" sx={{ mb: 2.5, borderRadius: '12px', fontWeight: 600 }}>
                    Permanent Delete Warning: This action cannot be undone!
                  </Alert>
                  <Typography variant="body1" sx={{ color: tok('--text-secondary'), mb: 2, lineHeight: 1.6 }}>
                    You are about to permanently delete the <strong>Online Theoretical Exam Result</strong> for{" "}
                    <span style={{ color: '#60a5fa', fontWeight: 700 }}>
                      {quizToDelete?.candidateName || quizToDelete?.fieldTeamName || selectedTeam?.teamName || 'this candidate'}
                    </span>.
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: tok('--overlay-subtle'), borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', mb: 2 }}>
                    <Typography variant="caption" sx={{ color: tok('--text-secondary'), display: 'block', mb: 0.5 }}>
                      Exam Date: <strong>{safeFormatDate(quizToDelete?.submittedAt || quizToDelete?.createdAt)}</strong>
                    </Typography>
                    <Typography variant="caption" sx={{ color: tok('--text-secondary'), display: 'block', mb: 0.5 }}>
                      Quiz Code: <strong>{quizToDelete?.quizCode || 'Standard'}</strong>
                    </Typography>
                    <Typography variant="caption" sx={{ color: tok('--text-secondary'), display: 'block' }}>
                      Score: <strong>{quizToDelete?.percentage !== undefined ? quizToDelete.percentage : quizToDelete?.score}% ({quizToDelete?.correctAnswers || 0}/{quizToDelete?.totalQuestions || 50} Correct)</strong>
                    </Typography>
                  </Paper>
                  <Typography variant="body2" sx={{ color: tok('--text-secondary') }}>
                    This exam record, correctness metrics, and historical score will be permanently erased.
                  </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setDeleteQuizDialogOpen(false)}
                    disabled={deletingQuiz}
                    sx={{
                      borderColor: tok('--border'),
                      color: tok('--text-secondary'),
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={confirmDeleteQuiz}
                    disabled={deletingQuiz}
                    startIcon={deletingQuiz ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
                    sx={{
                      bgcolor: '#dc2626',
                      '&:hover': { bgcolor: '#b91c1c' },
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontWeight: 700,
                      px: 2.5
                    }}
                  >
                    {deletingQuiz ? "Permanently Deleting..." : "Permanently Delete Exam"}
                  </Button>
                </DialogActions>
              </Dialog>

              {/* Edit Online Exam Dialog */}
              <Dialog
                open={editQuizDialogOpen}
                onClose={() => !savingQuizEdit && setEditQuizDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                  sx: {
                    bgcolor: '#18181b',
                    color: tok('--text'),
                    borderRadius: '20px',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    p: 1
                  }
                }}
              >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1, color: '#60a5fa', fontWeight: 800 }}>
                  <EditIcon sx={{ color: '#60a5fa', fontSize: '1.6rem' }} /> Edit Online Exam Assessment
                </DialogTitle>
                <DialogContent sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ color: tok('--text-secondary'), mb: 2.5 }}>
                    Modify theoretical examination scores, question correctness breakdown, and assessor remarks for{" "}
                    <strong style={{ color: tok('--text') }}>{quizToEdit?.candidateName || quizToEdit?.fieldTeamName || selectedTeam?.teamName}</strong>.
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Score Percentage (%)"
                        type="number"
                        value={editingQuizScore}
                        onChange={(e) => setEditingQuizScore(e.target.value)}
                        InputProps={{ inputProps: { min: 0, max: 100 } }}
                        sx={{ ...darkThemeStyles.textField }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Correct Answers"
                        type="number"
                        value={editingQuizCorrect}
                        onChange={(e) => setEditingQuizCorrect(e.target.value)}
                        InputProps={{ inputProps: { min: 0 } }}
                        sx={{ ...darkThemeStyles.textField }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Total Questions"
                        type="number"
                        value={editingQuizTotal}
                        onChange={(e) => setEditingQuizTotal(e.target.value)}
                        InputProps={{ inputProps: { min: 1 } }}
                        sx={{ ...darkThemeStyles.textField }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Assessor Remarks & Evaluation Notes"
                        multiline
                        rows={3}
                        value={editingQuizRemarks}
                        onChange={(e) => setEditingQuizRemarks(e.target.value)}
                        sx={{ ...darkThemeStyles.textField }}
                      />
                    </Grid>
                  </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setEditQuizDialogOpen(false);
                      navigate(`/assessment-dashboard?teamId=${selectedTeam?._id || quizToEdit?.teamId}&resultId=${quizToEdit?._id}&edit=true`, {
                        state: {
                          teamId: selectedTeam?._id || quizToEdit?.teamId,
                          teamName: selectedTeam?.teamName || quizToEdit?.teamName,
                          resultId: quizToEdit?._id,
                          selectedResult: quizToEdit,
                          mode: 'edit',
                          fromPortal: true
                        }
                      });
                    }}
                    startIcon={<AssessmentIcon />}
                    sx={{
                      borderColor: 'rgba(139, 92, 246, 0.4)',
                      color: '#c4b5fd',
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': { borderColor: '#a78bfa', bgcolor: 'rgba(139, 92, 246, 0.1)' }
                    }}
                  >
                    Open in Assessment Dashboard
                  </Button>
                  <Box sx={{ flex: '1 1 auto' }} />
                  <Button
                    variant="outlined"
                    onClick={() => setEditQuizDialogOpen(false)}
                    disabled={savingQuizEdit}
                    sx={{
                      borderColor: tok('--border'),
                      color: tok('--text-secondary'),
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSaveQuizEdit}
                    disabled={savingQuizEdit}
                    startIcon={savingQuizEdit ? <CircularProgress size={18} color="inherit" /> : <EditIcon />}
                    sx={{
                      bgcolor: '#3b82f6',
                      '&:hover': { bgcolor: '#2563eb' },
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontWeight: 700,
                      px: 2.5
                    }}
                  >
                    {savingQuizEdit ? "Saving Changes..." : "Save Exam Changes"}
                  </Button>
                </DialogActions>
              </Dialog>

              {/* View Online Exam Details Dialog */}
              <Dialog
                open={quizDetailOpen}
                onClose={() => setQuizDetailOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                  sx: {
                    bgcolor: '#18181b',
                    color: tok('--text'),
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    p: 1
                  }
                }}
              >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <PsychologyIcon sx={{ color: '#60a5fa', fontSize: '1.8rem' }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: tok('--text') }}>
                        Theoretical Online Exam Assessment
                      </Typography>
                      <Typography variant="caption" sx={{ color: tok('--text-secondary') }}>
                        Quiz Code: <strong>{selectedQuizDetail?.quizCode || 'Standard'}</strong> • {safeFormatDate(selectedQuizDetail?.submittedAt || selectedQuizDetail?.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton onClick={() => setQuizDetailOpen(false)} sx={{ color: tok('--text-secondary') }}>
                    <CloseIcon />
                  </IconButton>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                  {selectedQuizDetail && (
                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={4}>
                        <Paper sx={{ p: 2.5, bgcolor: tok('--overlay-subtle'), borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ color: tok('--text-secondary'), textTransform: 'uppercase', fontWeight: 700 }}>
                            Final Score
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 900, color: (Number(String(selectedQuizDetail.percentage || selectedQuizDetail.score || '0').replace('%','')) >= 80) ? '#10b981' : '#ef4444', my: 1 }}>
                            {selectedQuizDetail.percentage !== undefined ? `${selectedQuizDetail.percentage}%` : selectedQuizDetail.score}
                          </Typography>
                          <Chip
                            label={(Number(String(selectedQuizDetail.percentage || selectedQuizDetail.score || '0').replace('%','')) >= 80) ? 'Passed' : 'Needs Improvement'}
                            size="small"
                            sx={{
                              bgcolor: (Number(String(selectedQuizDetail.percentage || selectedQuizDetail.score || '0').replace('%','')) >= 80) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: (Number(String(selectedQuizDetail.percentage || selectedQuizDetail.score || '0').replace('%','')) >= 80) ? '#10b981' : '#ef4444',
                              fontWeight: 700
                            }}
                          />
                        </Paper>
                      </Grid>

                      <Grid item xs={12} sm={8}>
                        <Paper sx={{ p: 2.5, bgcolor: tok('--overlay-subtle'), borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <Typography variant="subtitle2" sx={{ color: '#60a5fa', fontWeight: 700, mb: 1.5 }}>
                            Candidate & Evaluation Breakdown
                          </Typography>
                          <Grid container spacing={1.5}>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: tok('--text-secondary') }}>Candidate / Team</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: tok('--text') }}>
                                {selectedQuizDetail.candidateName || selectedQuizDetail.fieldTeamName || selectedTeam?.teamName || 'Technician'}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: tok('--text-secondary') }}>Correct Answers</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: tok('--text') }}>
                                {selectedQuizDetail.correctAnswers || 0} / {selectedQuizDetail.totalQuestions || 50} Questions
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: tok('--text-secondary') }}>Accuracy Rate</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: tok('--text') }}>
                                {selectedQuizDetail.totalQuestions ? Math.round(((selectedQuizDetail.correctAnswers || 0) / selectedQuizDetail.totalQuestions) * 100) : selectedQuizDetail.percentage || 0}%
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: tok('--text-secondary') }}>Submission Timestamp</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: tok('--text') }}>
                                {selectedQuizDetail.submittedAt ? new Date(selectedQuizDetail.submittedAt).toLocaleString() : '-'}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>

                      {selectedQuizDetail.remarks && (
                        <Grid item xs={12}>
                          <Paper sx={{ p: 2.5, bgcolor: tok('--overlay-subtle'), borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <Typography variant="subtitle2" sx={{ color: '#f59e0b', fontWeight: 700, mb: 1 }}>
                              Assessor Feedback & Remarks
                            </Typography>
                            <Typography variant="body2" sx={{ color: tok('--text-secondary'), lineHeight: 1.6 }}>
                              {selectedQuizDetail.remarks}
                            </Typography>
                          </Paper>
                        </Grid>
                      )}
                    </Grid>
                  )}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setQuizDetailOpen(false);
                      navigate(`/assessment-dashboard?teamId=${selectedTeam?._id || selectedQuizDetail?.teamId}&resultId=${selectedQuizDetail?._id}`, {
                        state: {
                          teamId: selectedTeam?._id || selectedQuizDetail?.teamId,
                          teamName: selectedTeam?.teamName || selectedQuizDetail?.teamName,
                          resultId: selectedQuizDetail?._id,
                          selectedResult: selectedQuizDetail,
                          fromPortal: true
                        }
                      });
                    }}
                    startIcon={<AssessmentIcon />}
                    sx={{ color: '#c4b5fd', borderColor: 'rgba(139, 92, 246, 0.4)', textTransform: 'none', borderRadius: '8px' }}
                  >
                    View in Assessment Dashboard
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setQuizDetailOpen(false);
                      navigate(`/assessment-dashboard?teamId=${selectedTeam?._id || selectedQuizDetail?.teamId}&resultId=${selectedQuizDetail?._id}&edit=true`, {
                        state: {
                          teamId: selectedTeam?._id || selectedQuizDetail?.teamId,
                          teamName: selectedTeam?.teamName || selectedQuizDetail?.teamName,
                          resultId: selectedQuizDetail?._id,
                          selectedResult: selectedQuizDetail,
                          mode: 'edit',
                          fromPortal: true
                        }
                      });
                    }}
                    startIcon={<EditIcon />}
                    sx={{ color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.4)', textTransform: 'none', borderRadius: '8px' }}
                  >
                    Edit in Assessment Dashboard
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setQuizDetailOpen(false)}
                    sx={{ bgcolor: '#3b82f6', textTransform: 'none', borderRadius: '8px', px: 3 }}
                  >
                    Close
                  </Button>
                </DialogActions>
              </Dialog>

              {/* View OTJ Assessment Details Dialog */}
              <Dialog
                open={jobDetailOpen}
                onClose={() => setJobDetailOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                  sx: {
                    bgcolor: '#18181b',
                    color: tok('--text'),
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    p: 1
                  }
                }}
              >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CheckCircleIcon sx={{ color: '#10b981', fontSize: '1.8rem' }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: tok('--text') }}>
                        On-The-Job (OTJ) Assessment Details
                      </Typography>
                      <Typography variant="caption" sx={{ color: tok('--text-secondary') }}>
                        Evaluator: <strong>{selectedJobDetail?.conductedBy || 'Supervisor'}</strong> • {safeFormatDate(selectedJobDetail?.assessmentDate || selectedJobDetail?.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton onClick={() => setJobDetailOpen(false)} sx={{ color: tok('--text-secondary') }}>
                    <CloseIcon />
                  </IconButton>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                  {selectedJobDetail && (() => {
                    const rawScore = Number(selectedJobDetail.overallScore || selectedJobDetail.percentage || 0);
                    const scoreVal = rawScore <= 5 ? Math.round((rawScore / 5) * 100) : Math.round(rawScore);
                    const tier = getLabTierStatus(scoreVal);
                    return (
                      <Grid container spacing={2.5}>
                        <Grid item xs={12} sm={4}>
                          <Paper sx={{ p: 2.5, bgcolor: tok('--overlay-subtle'), borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: tok('--text-secondary'), textTransform: 'uppercase', fontWeight: 700 }}>
                              Proficiency Score
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 900, color: tier.color, my: 1 }}>
                              {scoreVal}%
                            </Typography>
                            <Chip
                              label={`${tier.label} (${tier.status})`}
                              size="small"
                              sx={{
                                bgcolor: tier.bg,
                                color: tier.color,
                                borderColor: tier.borderColor,
                                borderWidth: 1,
                                borderStyle: 'solid',
                                fontWeight: 700
                              }}
                            />
                          </Paper>
                        </Grid>

                        <Grid item xs={12} sm={8}>
                          <Paper sx={{ p: 2.5, bgcolor: tok('--overlay-subtle'), borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <Typography variant="subtitle2" sx={{ color: '#10b981', fontWeight: 700, mb: 1.5 }}>
                              Assessment Metadata & Inspector Details
                            </Typography>
                            <Grid container spacing={1.5}>
                              <Grid item xs={6}>
                                <Typography variant="caption" sx={{ color: tok('--text-secondary') }}>Field Team</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: tok('--text') }}>
                                  {selectedJobDetail.fieldTeamName || selectedJobDetail.fieldTeamId?.teamName || selectedTeam?.teamName || 'Field Team'}
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" sx={{ color: tok('--text-secondary') }}>Assessor / Supervisor</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: tok('--text') }}>
                                  {selectedJobDetail.conductedBy || 'Field Supervisor'}
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" sx={{ color: tok('--text-secondary') }}>Assessment Date</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: tok('--text') }}>
                                  {safeFormatDate(selectedJobDetail.assessmentDate || selectedJobDetail.createdAt)}
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" sx={{ color: tok('--text-secondary') }}>Checkpoints Audited</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: tok('--text') }}>
                                  {selectedJobDetail.checkPoints?.length || 20} Checkpoints (5 Categories)
                                </Typography>
                              </Grid>
                            </Grid>
                          </Paper>
                        </Grid>

                        {selectedJobDetail.checkPoints && selectedJobDetail.checkPoints.length > 0 && (
                          <Grid item xs={12}>
                            <Paper sx={{ p: 2.5, bgcolor: tok('--overlay-subtle'), borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <Typography variant="subtitle2" sx={{ color: '#c4b5fd', fontWeight: 700, mb: 1.5 }}>
                                Category Checkpoints & Scores
                              </Typography>
                              <Box sx={{ maxHeight: 250, overflowY: 'auto' }}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ color: tok('--text-secondary'), fontWeight: 700 }}>Checkpoint</TableCell>
                                      <TableCell sx={{ color: tok('--text-secondary'), fontWeight: 700 }}>Category</TableCell>
                                      <TableCell align="center" sx={{ color: tok('--text-secondary'), fontWeight: 700 }}>Score</TableCell>
                                      <TableCell sx={{ color: tok('--text-secondary'), fontWeight: 700 }}>Notes</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {selectedJobDetail.checkPoints.map((cp, idx) => (
                                      <TableRow key={idx}>
                                        <TableCell sx={{ color: tok('--text'), fontSize: '0.8rem' }}>{cp.name}</TableCell>
                                        <TableCell sx={{ color: tok('--text-secondary'), fontSize: '0.75rem' }}>{cp.category}</TableCell>
                                        <TableCell align="center">
                                          <Chip
                                            label={`${cp.score || 0}/5`}
                                            size="small"
                                            sx={{
                                              bgcolor: (cp.score >= 4) ? 'rgba(16, 185, 129, 0.2)' : (cp.score >= 3) ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                              color: (cp.score >= 4) ? '#34d399' : (cp.score >= 3) ? '#fbbf24' : '#f87171',
                                              fontWeight: 700,
                                              fontSize: '0.7rem',
                                              height: 18
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell sx={{ color: tok('--text-secondary'), fontSize: '0.75rem' }}>{cp.notes || '-'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Paper>
                          </Grid>
                        )}

                        {selectedJobDetail.feedback && (
                          <Grid item xs={12}>
                            <Paper sx={{ p: 2.5, bgcolor: tok('--overlay-subtle'), borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <Typography variant="subtitle2" sx={{ color: '#f59e0b', fontWeight: 700, mb: 1 }}>
                                Supervisor Observations & Field Recommendations
                              </Typography>
                              <Typography variant="body2" sx={{ color: tok('--text-secondary'), lineHeight: 1.6 }}>
                                {selectedJobDetail.feedback}
                              </Typography>
                            </Paper>
                          </Grid>
                        )}
                      </Grid>
                    );
                  })()}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setJobDetailOpen(false);
                      navigate(`/on-the-job-assessment?editId=${selectedJobDetail._id}`);
                    }}
                    startIcon={<EditIcon />}
                    sx={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', textTransform: 'none', borderRadius: '8px' }}
                  >
                    Edit OTJ Assessment
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setJobDetailOpen(false)}
                    sx={{ bgcolor: '#3b82f6', textTransform: 'none', borderRadius: '8px', px: 3 }}
                  >
                    Close
                  </Button>
                </DialogActions>
              </Dialog>
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
              backgroundColor: tok('--bg'),
              backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          }}
        >
          <DialogTitle sx={{ color: tok('--text'), borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">Customer Feedback</Typography>
            <IconButton 
              onClick={() => setFeedbackDialog({ open: false, content: '' })}
              sx={{ color: tok('--text-secondary'), '&:hover': { color: tok('--text') } }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Typography variant="body1" sx={{ color: tok('--text-secondary'), whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
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
              backgroundColor: tok('--bg'),
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
              <Typography variant="h5" sx={{ color: tok('--text'), fontWeight: 900, mb: 0.5 }}>
                Task List
              </Typography>
              <Typography variant="caption" sx={{ color: tok('--accent-text'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                {analyticsDrillDown.title} ({analyticsDrillDown.tasks.length} Tasks)
              </Typography>
            </Box>
            <IconButton onClick={() => setAnalyticsDrillDown(prev => ({ ...prev, open: false }))} sx={{ color: tok('--text') }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: tok('--overlay-subtle') }}>
                    <TableCell sx={{ color: tok('--text-secondary'), fontWeight: 'bold', fontSize: '0.75rem' }}>Week</TableCell>
                    <TableCell sx={{ color: tok('--text-secondary'), fontWeight: 'bold', fontSize: '0.75rem' }}>SLID</TableCell>
                    <TableCell sx={{ color: tok('--text-secondary'), fontWeight: 'bold', fontSize: '0.75rem' }}>Customer</TableCell>
                    <TableCell sx={{ color: tok('--text-secondary'), fontWeight: 'bold', fontSize: '0.75rem' }}>Reason</TableCell>
                    <TableCell sx={{ color: tok('--text-secondary'), fontWeight: 'bold', fontSize: '0.75rem' }}>Sub-Reason</TableCell>
                    <TableCell sx={{ color: tok('--text-secondary'), fontWeight: 'bold', fontSize: '0.75rem' }}>Root Cause</TableCell>
                    <TableCell sx={{ color: tok('--text-secondary'), fontWeight: 'bold', fontSize: '0.75rem' }}>Owner</TableCell>
                    <TableCell sx={{ color: tok('--text-secondary'), fontWeight: 'bold', fontSize: '0.75rem' }}>Feedback</TableCell>
                    <TableCell sx={{ color: tok('--text-secondary'), fontWeight: 'bold', fontSize: '0.75rem' }}>Score</TableCell>
                    <TableCell sx={{ color: tok('--text-secondary'), fontWeight: 'bold', fontSize: '0.75rem' }} align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analyticsDrillDown.tasks.map((task) => (
                    <TableRow key={task._id} sx={{ '&:hover': { bgcolor: tok('--overlay-subtle') } }}>
                      <TableCell sx={{ color: tok('--text'), fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {task.interviewDate ? getWeekNumber(task.interviewDate, settings?.weekStartDay, settings?.week1StartDate, settings?.week1EndDate, settings?.startWeekNumber).week : '-'}
                      </TableCell>
                      <TableCell sx={{ color: tok('--text'), fontSize: '0.8rem', fontWeight: 'bold' }}>{task.slid}</TableCell>
                      <TableCell sx={{ color: tok('--text'), fontSize: '0.8rem' }}>{task.customerName}</TableCell>
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
                            color: tok('--accent-text'),
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

        {/* Lab Assessment Detail Modal */}
        <LabAssessmentDetailModal
          open={labDetailOpen}
          onClose={() => setLabDetailOpen(false)}
          assessment={selectedLabDetail}
          onUpdate={() => {
            fetchGlobalData();
          }}
        />
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
    const labelStyle = { fill: tok('--text'), fontSize: 10, fontWeight: 600 };
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

    switch (chartType) {
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={450}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="name" tick={{ fill: tok('--text-secondary'), fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: tok('--text-secondary'), fontSize: 8 }} />
              <Radar name="Primary Metric" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <RechartsTooltip contentStyle={{ backgroundColor: tok('--surface'), border: 'none', borderRadius: 8, color: '#fff' }} />
            </RadarChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={450}>
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: tok('--text-secondary'), fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fill: tok('--text-secondary'), fontSize: 10 }} />
              <RechartsTooltip contentStyle={{ backgroundColor: tok('--surface'), border: 'none', borderRadius: 8 }} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={450}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: tok('--text-secondary'), fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fill: tok('--text-secondary'), fontSize: 10 }} />
              <RechartsTooltip contentStyle={{ backgroundColor: tok('--surface'), border: 'none', borderRadius: 8 }} />
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
              <RechartsTooltip contentStyle={{ backgroundColor: tok('--surface'), border: 'none', borderRadius: 8 }} />
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
              <XAxis dataKey="name" tick={{ fill: tok('--text-secondary'), fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fill: tok('--text-secondary'), fontSize: 10 }} />
              <RechartsTooltip contentStyle={{ backgroundColor: tok('--surface'), border: 'none', borderRadius: 8 }} />
              <RechartsBar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Dialog fullWidth maxWidth="lg" open={open} onClose={onClose} PaperProps={{ sx: { bgcolor: tok('--bg'), border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', py: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ color: tok('--text'), fontWeight: 700 }}>{title} Analytical Insight</Typography>
          <Typography variant="caption" sx={{ color: tok('--text-secondary') }}>Advanced Pattern & Distribution Analysis</Typography>
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
          <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: tok('--border') }} />
          <IconButton onClick={onClose} sx={{ color: tok('--text-secondary') }}><CloseIcon /></IconButton>
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
