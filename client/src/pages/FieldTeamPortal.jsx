import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  TablePagination,
  Autocomplete,
  Tabs,
  Tab,
  useMediaQuery,
  Button,
  Divider,
  Grid,
  FormControl,
  Select,
  MenuItem,
  LinearProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from "@mui/material";
import {
  ArrowBack,
  Quiz,
  Assignment,
  BarChart,
  SupportAgent,
  Warning,
  CheckCircle,
  Schedule,
  Info,
  PriorityHigh,
  Leaderboard as LeaderboardIcon,
  Close as CloseIcon,
  Assessment,
  Timeline,
} from '@mui/icons-material';
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
  Legend as RechartsLegend
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
import ViewIssueDetailsDialog from "../components/ViewIssueDetailsDialog";

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
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  PieChart as PieChartIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PictureAsPdf as PictureAsPdfIcon,
  TableChart as TableChartIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import FieldTeamTicketsForPortalReview from "../components/FieldTeamTicketsForPortalReview";

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
  const [leaderboardPage, setLeaderboardPage] = useState(0);
  const [leaderboardRowsPerPage, setLeaderboardRowsPerPage] = useState(10);

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




  useEffect(() => {
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

        // console.log({ fieldTeamsRes, quizTeamsRes });

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
          api.get("/customer-issues-notifications", {
            params: { limit: 10000 },
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          })
        ]);
        setAllTechnicalTasksGlobal(techRes.data || []);
        setAllCustomerIssuesGlobal(issuesRes.data.data || []);
      } catch (err) {
        console.error("Error fetching global leaderboard data:", err);
      } finally {
        setLoadingGlobal(false);
      }
    };

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
              const issuesRes = await api.get('/customer-issues-notifications', {
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

  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get("/settings");
        setSettings(response.data);
      } catch (err) {
        console.error("Failed to fetch settings");
      }
    };
    fetchSettings();
  }, []);

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

  const calculatePercentageAboveThreshold = (results, threshold) => {
    const aboveThreshold = results.filter((result) => (result.overallScore || result.percentage || 0) >= threshold).length;
    return (aboveThreshold / results.length) * 100;
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
    const techTasksData = technicalTasks.map(t => {
      let score = t.evaluationScore || 0;
      let satisfaction = 'N/A';
      let displayScore = 'Not Evaluated';

      if (score > 0) {
        const isSmallScale = score <= 10;
        displayScore = `${score}${isSmallScale ? '/10' : '%'}`;

        // Normalize for calculation
        const normalizedScore = isSmallScale ? score * 10 : score;

        if (normalizedScore <= 60) satisfaction = 'Detractor';
        else if (normalizedScore <= 80) satisfaction = 'Neutral';
        else satisfaction = 'Promoter';
      }

      return {
        'Ticket Request': t.requestNumber || 'N/A',
        'Ticket ID': t.ticketId || '-',
        'Customer Name': t.customerName,
        'Customer Contact': t.customerContact || 'N/A',
        'Customer Feedback': t.customerFeedback || '-',
        'SLID': t.slid,
        'PIS Date': t.pisDate ? new Date(t.pisDate).toLocaleDateString() : 'N/A',
        'Task Date': formatDate(t.createdAt),
        'Priority': t.priority,
        'Status': t.validationStatus,
        'Validation Notes': t.validationNotes || '-',
        'Evaluation Score': displayScore,
        'Satisfaction Level': satisfaction,
        'Technician': t.technician || t.primaryTechnician || '-',
        'Subtasks Count': t.subtasks?.length || 0,
        'Region': t.governorate || '-',
        'City': t.city || '-'
      };
    });
    const wsTech = XLSX.utils.json_to_sheet(techTasksData);
    XLSX.utils.book_append_sheet(wb, wsTech, "NPS Tickets");

    // 3. Customer Issues Sheet
    const issuesData = filteredIssuesByDate.map(i => ({
      'SLID': i.slid,
      'Category': i.issueCategory || 'General',
      'Sub-Category': i.issueSubCategory || '-',
      'Status': i.solved === 'yes' ? 'Closed' : 'Open',
      'Customer Name': i.customerName || 'N/A',
      'Customer Contact': i.customerContact || 'N/A',
      'Reporter': i.reporter || 'N/A',
      'Source': i.fromMain || i.reports?.[0]?.fromMain || '-',
      'Report Date': formatDate(i.date || i.createdAt),
      'Dispatched': i.dispatched,
      'Dispatched Time': i.dispatchedAt ? formatDate(i.dispatchedAt) : (i.dispatched === 'yes' ? 'IMMEDIATE' : '-'),
      'Resolution Date': i.resolveDate ? formatDate(i.resolveDate) : 'N/A',
      'Closed By': i.closedBy || i.supervisor || '-',
      'Closed Date': i.closedAt ? formatDate(i.closedAt) : '-',
      'Resolution Details': i.resolutionDetails || '-',
      'Issue Note/Details': i.issueDetails || i.reporterNote || '-',
      'Aging (Days)': i.date ? Math.floor((new Date() - new Date(i.date)) / (1000 * 60 * 60 * 24)) : 'N/A',
      'Is QoS?': i.isQoS ? 'Yes' : 'No',
      'Is Install?': i.isInstall ? 'Yes' : 'No'
    }));
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
        <Bar dataKey="count" fill={colors.primary} radius={[4, 4, 0, 0]} />
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
      const teamTechTasks = allTechnicalTasksGlobal.filter(t => t.teamId === team._id || t.teamName === team.teamName);
      const teamIssues = allCustomerIssuesGlobal.filter(i => i.installingTeam === team.teamName || i.assignedTo === team.teamName);

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
        // Raw data for drill-down
        rawDetractors: npsDetractors,
        rawNeutrals: npsNeutrals,
        rawIssues: teamIssues,
        rawOpen: openCases
      };
    });

    // Apply search filter
    const filtered = processed.filter(team =>
      team.teamName?.toLowerCase().includes(leaderboardSearchQuery.toLowerCase()) ||
      team.teamCompany?.toLowerCase().includes(leaderboardSearchQuery.toLowerCase()) ||
      team.governorate?.toLowerCase().includes(leaderboardSearchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => b.totalViolations - a.totalViolations);
  }, [fieldTeams, allTechnicalTasksGlobal, allCustomerIssuesGlobal, leaderboardSearchQuery]);

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

          {/* Magic Table Controls: Advanced Search */}
          <Paper sx={{
            p: 2,
            mb: 3,
            ...colors.glass,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <FaSearch style={{ color: colors.primary, marginRight: '16px', fontSize: '1.2rem' }} />
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
                sx: { color: '#fff', fontSize: '1.1rem', fontWeight: 500 }
              }}
            />
            {leaderboardSearchQuery && (
              <IconButton onClick={() => setLeaderboardSearchQuery('')} sx={{ color: colors.textSecondary }}>
                <FaTimes />
              </IconButton>
            )}
            <Divider orientation="vertical" flexItem sx={{ mx: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', color: colors.textSecondary }}>
              <FaFilter style={{ marginRight: '8px' }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {leaderboardData.length} Results
              </Typography>
            </Box>
          </Paper>

          <TableContainer component={Paper} sx={{
            ...colors.glass,
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <Table>
              <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                <TableRow>
                  <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>RANK</TableCell>
                  <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>TEAM NAME</TableCell>
                  <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>TOTAL NPS</TableCell>
                  <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>NPS DETRACTORS</TableCell>
                  <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>NPS NEUTRALS</TableCell>
                  <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>TOTAL ISSUES</TableCell>
                  <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>OPEN CASES</TableCell>
                  <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>AVG RESOLUTION</TableCell>
                  <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>ISSUE RES %</TableCell>
                  <TableCell sx={{ color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>TOTAL VIOLATIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedLeaderboardData.map((team, index) => (
                  <TableRow
                    key={team._id}
                    sx={{
                      bgcolor: 'transparent',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                      transition: 'background 0.2s'
                    }}
                  >
                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <Box sx={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: index + (leaderboardPage * leaderboardRowsPerPage) === 0 ? 'rgba(245, 158, 11, 0.2)' : index + (leaderboardPage * leaderboardRowsPerPage) === 1 ? 'rgba(209, 213, 219, 0.2)' : index + (leaderboardPage * leaderboardRowsPerPage) === 2 ? 'rgba(180, 83, 9, 0.2)' : 'rgba(255,255,255,0.05)',
                        color: index + (leaderboardPage * leaderboardRowsPerPage) === 0 ? '#f59e0b' : index + (leaderboardPage * leaderboardRowsPerPage) === 1 ? '#d1d5db' : index + (leaderboardPage * leaderboardRowsPerPage) === 2 ? '#b45309' : colors.textSecondary,
                        fontWeight: 800
                      }}>
                        {index + 1 + (leaderboardPage * leaderboardRowsPerPage)}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <Box sx={{ cursor: 'pointer' }} onClick={() => navigate(`/fieldTeams-portal/${team._id}`)}>
                        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>{team.teamName}</Typography>
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>{team.teamCompany} | {team.governorate}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: colors.info, fontWeight: 800 }}>
                      {team.totalNpsTickets}
                      {team.reachViolationsCount > 0 && (
                        <span style={{ color: colors.warning, marginLeft: '4px', fontSize: '0.85rem' }}>
                          ({team.reachViolationsCount})
                        </span>
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: colors.error, fontWeight: 800, cursor: 'pointer' }} onClick={() => handleDrillDown(team, 'detractors')}>
                      {team.npsDetractors}
                    </TableCell>
                    <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: colors.warning, fontWeight: 800, cursor: 'pointer' }} onClick={() => handleDrillDown(team, 'neutrals')}>
                      {team.npsNeutrals}
                    </TableCell>
                    <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#3b82f6', fontWeight: 800, cursor: 'pointer' }} onClick={() => handleDrillDown(team, 'issues')}>
                      {team.issueViolations}
                    </TableCell>
                    <TableCell align="center" sx={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      color: team.openCount > 0 ? colors.error : colors.textSecondary,
                      fontWeight: 800,
                      cursor: team.openCount > 0 ? 'pointer' : 'default'
                    }} onClick={() => team.openCount > 0 && handleDrillDown(team, 'open')}>
                      {team.openCount}
                    </TableCell>
                    <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#fff', fontWeight: 600 }}>
                      {team.avgResolutionTime !== '-' ? `${team.avgResolutionTime} d` : '-'}
                    </TableCell>
                    <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <Typography sx={{
                          color: team.resPercent >= 80 ? colors.success : team.resPercent >= 50 ? colors.warning : colors.error,
                          fontWeight: 800
                        }}>
                          {team.resPercent}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Number(team.resPercent)}
                          sx={{
                            width: '40px',
                            height: '6px',
                            borderRadius: '3px',
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: team.resPercent >= 80 ? colors.success : team.resPercent >= 50 ? colors.warning : colors.error,
                            }
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <Chip
                        label={team.totalViolations}
                        onClick={() => handleDrillDown(team, 'violations')}
                        sx={{
                          bgcolor: team.totalViolations > 10 ? `${colors.error}20` : team.totalViolations > 5 ? `${colors.warning}20` : `${colors.success}20`,
                          color: team.totalViolations > 10 ? colors.error : team.totalViolations > 5 ? colors.warning : colors.success,
                          fontWeight: 900,
                          fontSize: '0.9rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          '&:hover': { transform: 'scale(1.1)' },
                          transition: 'transform 0.2s'
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[10]}
              component="div"
              count={leaderboardData.length}
              rowsPerPage={leaderboardRowsPerPage}
              page={leaderboardPage}
              onPageChange={(e, newPage) => setLeaderboardPage(newPage)}
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
                  <TableCell sx={{ bgcolor: '#1a1a1a', color: colors.textSecondary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>SCORE / INFO</TableCell>
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
                          }
                        }}
                        sx={{
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.03)', cursor: isIssue ? 'pointer' : 'default' }
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
                        <TableCell sx={{ color: colors.textPrimary, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {score}
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
      {selectedTeam && (
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
              <Tab label="Executive Overview" icon={<BarChart />} iconPosition="start" />
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
    </Box>
  );
};

export default FieldTeamPortal;
