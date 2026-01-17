import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  useTheme,
  useMediaQuery,
  Paper,
  Stack,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton,
  TablePagination,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  TimeScale
} from 'chart.js';
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { FaCheckCircle, FaExclamationCircle, FaClipboardList, FaChartLine, FaFilter, FaSearch, FaTimes, FaCalendarAlt, FaUserTie, FaFileExcel, FaFileExport, FaInfoCircle } from 'react-icons/fa';
import { utils, writeFile } from 'xlsx';
import ViewIssueDetailsDialog from './ViewIssueDetailsDialog';
import ManagementEmailDialog from './ManagementEmailDialog';
import { FaEnvelope, FaLanguage } from 'react-icons/fa';
import { alpha } from '@mui/material/styles';
import { ReportedIssueCardDialog } from './ReportedIssueCardDialog';
import { Email as EmailIconUI } from '@mui/icons-material';
import api from '../api/api';
import { toast } from 'sonner';
import { FaWhatsapp } from 'react-icons/fa6';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  TimeScale
);

const CustomerIssuesAnalytics = ({ issues = [] }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [assigneeSort, setAssigneeSort] = useState({ field: 'total', direction: 'desc' });
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    minIssues: 0
  });

  const [installingTeamFilters, setInstallingTeamFilters] = useState({
    status: 'all',
    category: 'all',
    minIssues: 0
  });
  const [installingTeamSearch, setInstallingTeamSearch] = useState('');
  const [installingTeamSort, setInstallingTeamSort] = useState({ field: 'total', direction: 'desc' });

  const [selectedDetailedIssue, setSelectedDetailedIssue] = useState(null);
  const [isIssueViewOpen, setIsIssueViewOpen] = useState(false);

  const [trendTimeframe, setTrendTimeframe] = useState('day'); // 'day', 'week', 'month'
  const [trendChartType, setTrendChartType] = useState('mixed'); // 'mixed', 'bar', 'line'

  const [negligencePage, setNegligencePage] = useState(0);
  const [negligenceRowsPerPage, setNegligenceRowsPerPage] = useState(5);
  const [negligenceSearch, setNegligenceSearch] = useState('');
  const [negligenceSupervisorFilter, setNegligenceSupervisorFilter] = useState('all');
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  const [dateFilter, setDateFilter] = useState({
    start: '',
    end: ''
  });

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportDialogTitle, setReportDialogTitle] = useState('');
  const [reportDialogIssues, setReportDialogIssues] = useState([]);

  const handleStatusClick = (issues, title) => {
    if (issues && issues.length > 0) {
      setReportDialogIssues(issues);
      setReportDialogTitle(title);
      setReportDialogOpen(true);
    }
  };


  const handleViewIssue = (issue) => {
    setSelectedDetailedIssue(issue);
    setIsIssueViewOpen(true);
  };

  // --- Statistics Calculation ---
  const filteredIssuesByDate = useMemo(() => {
    return issues.filter(issue => {
      if (!dateFilter.start && !dateFilter.end) return true;
      const reportDate = new Date(issue.date || issue.createdAt);
      const start = dateFilter.start ? new Date(dateFilter.start) : null;
      const end = dateFilter.end ? new Date(dateFilter.end) : null;
      if (start && reportDate < start) return false;
      if (end) {
        // Set end to end of day
        const endDay = new Date(end);
        endDay.setHours(23, 59, 59, 999);
        if (reportDate > endDay) return false;
      }
      return true;
    });
  }, [issues, dateFilter]);

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

    // Process Efficiency Calculations
    let totalDispatchTime = 0;
    let countDispatch = 0;
    let totalResolutionTime = 0;
    let countResolution = 0;
    let totalLifecycleTime = 0;
    let countLifecycle = 0;

    const now = new Date();
    const pendingBottlenecks = [];

    issuesToProcess.forEach(issue => {
      const reportDate = new Date(issue.date || issue.createdAt);

      // 1. Supervisor Dispatch Speed (Reported -> Dispatched OR Reported -> Now)
      let dispatchEnd = issue.dispatchedAt ? new Date(issue.dispatchedAt) : (issue.dispatched === 'no' ? now : null);

      // Fallback for historical cases: if dispatchedAt is missing but dispatched is 'yes', 
      // we assume it was dispatched on the report date (speed = 0)
      if (!dispatchEnd && issue.dispatched === 'yes') dispatchEnd = reportDate;

      if (dispatchEnd && dispatchEnd >= reportDate) {
        const time = (dispatchEnd - reportDate) / (1000 * 60 * 60 * 24);
        totalDispatchTime += time;
        countDispatch++;
      }

      // 2. Field Resolution Speed (Dispatched -> Resolved OR Dispatched -> Now)
      // Only measure field speed if a dispatch event exists
      if (issue.dispatchedAt || issue.dispatched === 'yes') {
        let resStart = issue.dispatchedAt ? new Date(issue.dispatchedAt) : reportDate;
        let resEnd = issue.resolveDate ? new Date(issue.resolveDate) : (issue.solved === 'no' ? now : null);

        if (resStart && resEnd && resEnd >= resStart) {
          const resTime = (resEnd - resStart) / (1000 * 60 * 60 * 24);
          totalResolutionTime += resTime;
          countResolution++;
        }
      }

      // 3. Total Lifecycle (Reported -> Closed OR Reported -> Now)
      let lifecycleEnd = issue.closedAt ? new Date(issue.closedAt) : (issue.solved === 'no' ? now : null);
      if (lifecycleEnd && lifecycleEnd >= reportDate) {
        const lifeTime = (lifecycleEnd - reportDate) / (1000 * 60 * 60 * 24);
        totalLifecycleTime += lifeTime;
        countLifecycle++;
      }

      // Bottleneck Detection: Capture aging for open issues
      if (issue.solved === 'no') {
        const currentAge = (now - reportDate) / (1000 * 60 * 60 * 24);
        pendingBottlenecks.push({
          slid: issue.slid,
          age: currentAge.toFixed(1),
          stage: issue.dispatched === 'no' ? 'Awaiting Dispatch' : 'In Progress (Dispatched)',
          assignedTo: issue.assignedTo || 'Unassigned',
          supervisor: issue.closedBy || 'Unassigned',
          reportDate: issue.date || issue.createdAt,
          originalIssue: issue // Full object for viewing
        });
      }
    });

    const avgDispatchTime = countDispatch > 0 ? (totalDispatchTime / countDispatch).toFixed(1) : 0;
    const avgResolutionTime = countResolution > 0 ? (totalResolutionTime / countResolution).toFixed(1) : 0;
    const avgLifecycleTime = countLifecycle > 0 ? (totalLifecycleTime / countLifecycle).toFixed(1) : 0;

    // Sort bottlenecks by age
    const oldestPending = pendingBottlenecks.sort((a, b) => b.age - a.age);

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
      oldestPending
    };
  }, [filteredIssuesByDate]);

  // --- Export Handlers ---
  const handleExportAllAssignees = () => {
    const data = assigneeStats.detailedList.map(stat => ({
      'Assignee Name': stat.name,
      'Total Issues': stat.total,
      'Closed': stat.resolved,
      'Open': stat.unresolved,
      'Top Category': stat.topCategory,
      'Top Sub-category': stat.topSubCategory,
      'Resolution Rate (%)': stat.rate
    }));

    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Assignee Performance");

    const maxWidths = {};
    data.forEach(row => {
      Object.keys(row).forEach(key => {
        const val = row[key] ? row[key].toString() : '';
        maxWidths[key] = Math.max(maxWidths[key] || 10, val.length + 2);
      });
    });
    worksheet['!cols'] = Object.keys(maxWidths).map(key => ({ wch: maxWidths[key] }));

    writeFile(workbook, `Assignee_Performance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportSelectedAssignee = (team) => {
    if (!team || !team.relatedIssues) return;

    const data = team.relatedIssues.map(issue => ({
      'Date': new Date(issue.date).toLocaleDateString(),
      'SLID': issue.slid,
      'Category': issue.issues?.[0]?.category || 'N/A',
      'Sub-category': issue.issues?.[0]?.subCategory || 'N/A',
      'Status': issue.solved === 'yes' ? 'Closed' : (issue.dispatched === 'yes' ? 'In Progress' : 'Pending'),
      'Reporter': issue.reporter,
      'From (Main)': issue.fromMain || issue.from || 'N/A',
      'From (Sub)': issue.fromSub || 'N/A'
    }));

    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Issue History");

    const maxWidths = {};
    data.forEach(row => {
      Object.keys(row).forEach(key => {
        const val = row[key] ? row[key].toString() : '';
        maxWidths[key] = Math.max(maxWidths[key] || 10, val.length + 2);
      });
    });
    worksheet['!cols'] = Object.keys(maxWidths).map(key => ({ wch: maxWidths[key] }));

    writeFile(workbook, `${team.name.replace(/\s+/g, '_')}_Issues_Report.xlsx`);
  };

  // --- Data Hookups ---

  const teamData = useMemo(() => {
    const counts = {};
    filteredIssuesByDate.forEach(issue => {
      const team = issue.fromMain || issue.from || 'Unknown';
      counts[team] = (counts[team] || 0) + 1;
    });
    const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const data = labels.map(label => counts[label]);
    return {
      labels,
      datasets: [{
        label: 'Issues Reported (Main)',
        data,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      }],
    };
  }, [filteredIssuesByDate]);

  const subTeamData = useMemo(() => {
    const counts = {};
    filteredIssuesByDate.forEach(issue => {
      if (issue.fromSub) {
        const team = issue.fromSub;
        counts[team] = (counts[team] || 0) + 1;
      }
    });
    const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const data = labels.map(label => counts[label]);
    return {
      labels,
      datasets: [{
        label: 'Issues Reported (Sub)',
        data,
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      }],
    };
  }, [filteredIssuesByDate]);

  const installingTeamChartData = useMemo(() => {
    const counts = {};
    filteredIssuesByDate.forEach(issue => {
      const team = issue.installingTeam || 'Unknown';
      counts[team] = (counts[team] || 0) + 1;
    });
    const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const data = labels.map(label => counts[label]);
    return {
      labels,
      datasets: [{
        label: 'Issues by Installing Team',
        data,
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1,
      }],
    };
  }, [filteredIssuesByDate]);

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

  const statusData = useMemo(() => ({
    labels: ['Closed', 'Open'],
    datasets: [{
      data: [stats.closed, stats.open],
      backgroundColor: ['#4caf50', '#f44336'],
      borderWidth: 0,
    }],
  }), [stats]);

  const closureData = useMemo(() => {
    const counts = {};
    filteredIssuesByDate.forEach(issue => {
      if (issue.solved === 'yes' && issue.closedBy) {
        counts[issue.closedBy] = (counts[issue.closedBy] || 0) + 1;
      }
    });
    const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return {
      labels,
      datasets: [{
        label: 'Issues Closed',
        data: labels.map(label => counts[label]),
        backgroundColor: 'rgba(76, 175, 80, 0.6)',
        borderColor: 'rgba(76, 175, 80, 1)',
        borderWidth: 1,
      }],
    };
  }, [filteredIssuesByDate]);

  const assigneeStats = useMemo(() => {
    const statsMap = {};
    filteredIssuesByDate.forEach(issue => {
      const assignee = issue.assignedTo || 'Unassigned';
      if (!statsMap[assignee]) {
        statsMap[assignee] = {
          total: 0,
          resolved: 0,
          unresolved: 0,
          dispatched: 0,
          openDispatched: 0,
          openUndispatched: 0,
          categories: {},
          subCategories: {},
          issuesTotal: [],
          issuesResolved: [],
          issuesUnresolved: [],
          issuesDispatched: [],
          issuesOpenDispatched: [],
          issuesOpenUndispatched: []
        };
      }
      statsMap[assignee].total += 1;
      statsMap[assignee].issuesTotal.push(issue);

      if (issue.solved === 'yes') {
        statsMap[assignee].resolved += 1;
        statsMap[assignee].issuesResolved.push(issue);
      } else {
        statsMap[assignee].unresolved += 1;
        statsMap[assignee].issuesUnresolved.push(issue);

        // Breakdown Open Issues
        if (issue.dispatched === 'yes') {
          statsMap[assignee].openDispatched += 1;
          statsMap[assignee].issuesOpenDispatched.push(issue);
        } else {
          statsMap[assignee].openUndispatched += 1;
          statsMap[assignee].issuesOpenUndispatched.push(issue);
        }
      }

      if (issue.dispatched === 'yes') {
        statsMap[assignee].dispatched += 1;
        statsMap[assignee].issuesDispatched.push(issue);
      }

      if (issue.issues) {
        issue.issues.forEach(i => {
          if (i.category) statsMap[assignee].categories[i.category] = (statsMap[assignee].categories[i.category] || 0) + 1;
          if (i.subCategory) statsMap[assignee].subCategories[i.subCategory] = (statsMap[assignee].subCategories[i.subCategory] || 0) + 1;
        });
      }
    });

    const sortedAssignees = Object.keys(statsMap).sort((a, b) => statsMap[b].total - statsMap[a].total);
    let detailedList = sortedAssignees.map(name => {
      const topCat = Object.entries(statsMap[name].categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
      const topSub = Object.entries(statsMap[name].subCategories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      // Calculate Resolution Speed for this assignee
      // Calculate Resolution Speed for this assignee using collected issues
      const issuesForAssignee = statsMap[name].issuesTotal;
      let totalResTime = 0;
      let countRes = 0;
      const now = new Date();

      issuesForAssignee.forEach(i => {
        // ... (existing logic works on 'i')
        if (i.dispatchedAt || i.dispatched === 'yes') {
          let start = null;
          let end = null;
          if (i.resolveDate) {
            start = new Date(i.dispatchedAt || i.date || i.createdAt);
            end = new Date(i.resolveDate);
          } else if (i.solved === 'no') {
            start = new Date(i.date || i.createdAt);
            end = now;
          }
          if (start && end && end >= start) {
            totalResTime += (end - start) / (1000 * 60 * 60 * 24);
            countRes++;
          }
        }
      });
      const avgResSpeed = countRes > 0 ? (totalResTime / countRes).toFixed(1) : 'N/A';

      return {
        name,
        ...statsMap[name],
        topCategory: topCat,
        topSubCategory: topSub,
        rate: ((statsMap[name].resolved / statsMap[name].total) * 100).toFixed(1),
        relatedIssues: issuesForAssignee,
        avgResolutionSpeed: avgResSpeed,
        type: 'Assignee'
      };
    });

    if (assigneeSearch.trim()) {
      const term = assigneeSearch.toLowerCase();
      detailedList = detailedList.filter(item => item.name.toLowerCase().includes(term) || item.topCategory.toLowerCase().includes(term));
    }
    if (filters.status !== 'all') {
      detailedList = detailedList.filter(item => filters.status === 'resolved' ? item.resolved > 0 : item.unresolved > 0);
    }

    if (assigneeSort.field) {
      detailedList.sort((a, b) => {
        let valA = a[assigneeSort.field], valB = b[assigneeSort.field];
        if (assigneeSort.field === 'rate' || assigneeSort.field === 'avgResolutionSpeed') {
          valA = parseFloat(valA) || 0;
          valB = parseFloat(valB) || 0;
        }
        return assigneeSort.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
    }

    return {
      totals: {
        total: detailedList.reduce((acc, curr) => acc + curr.total, 0),
        resolved: detailedList.reduce((acc, curr) => acc + curr.resolved, 0),
        unresolved: detailedList.reduce((acc, curr) => acc + curr.unresolved, 0)
      },
      chartData: {
        labels: sortedAssignees.slice(0, 10),
        datasets: [{
          label: 'Issues Assigned',
          data: sortedAssignees.slice(0, 10).map(n => statsMap[n].total),
          backgroundColor: 'rgba(78, 115, 223, 0.6)',
          borderColor: 'rgba(78, 115, 223, 1)',
          borderWidth: 1
        }]
      },
      detailedList
    };
  }, [filteredIssuesByDate, assigneeSearch, assigneeSort, filters]);

  const supervisorStats = useMemo(() => {
    const statsMap = {};
    const now = new Date();
    filteredIssuesByDate.forEach(issue => {
      const supervisor = issue.closedBy || 'Unknown';
      if (!statsMap[supervisor]) {
        statsMap[supervisor] = {
          total: 0,
          resolved: 0,
          unresolved: 0,
          dispatched: 0,
          openDispatched: 0,
          openUndispatched: 0,
          issuesTotal: [],
          issuesResolved: [],
          issuesUnresolved: [],
          issuesDispatched: [],
          issuesOpenDispatched: [],
          issuesOpenUndispatched: [],
          dispatchSum: 0,
          dispatchCount: 0,
          resolutionSum: 0,
          resolutionCount: 0,
          lifecycleSum: 0,
          lifecycleCount: 0,
          agingCount: 0
        };
      }
      statsMap[supervisor].total += 1;
      statsMap[supervisor].issuesTotal.push(issue);

      if (issue.solved === 'yes') {
        statsMap[supervisor].resolved += 1;
        statsMap[supervisor].issuesResolved.push(issue);
      } else {
        statsMap[supervisor].unresolved += 1;
        statsMap[supervisor].issuesUnresolved.push(issue);

        // Breakdown Open Issues
        if (issue.dispatched === 'yes') {
          statsMap[supervisor].openDispatched += 1;
          statsMap[supervisor].issuesOpenDispatched.push(issue);
        } else {
          statsMap[supervisor].openUndispatched += 1;
          statsMap[supervisor].issuesOpenUndispatched.push(issue);
        }
      }

      if (issue.dispatched === 'yes') {
        statsMap[supervisor].dispatched += 1;
        statsMap[supervisor].issuesDispatched.push(issue);
      }

      const reportDate = new Date(issue.date || issue.createdAt);

      // 1. Supervisor Dispatch Speed
      let dispatchEnd = issue.dispatchedAt ? new Date(issue.dispatchedAt) : (issue.dispatched === 'no' ? now : null);
      if (!dispatchEnd && issue.dispatched === 'yes') dispatchEnd = reportDate;
      if (dispatchEnd && dispatchEnd >= reportDate) {
        statsMap[supervisor].dispatchSum += (dispatchEnd - reportDate) / (1000 * 60 * 60 * 24);
        statsMap[supervisor].dispatchCount += 1;
        // Aging check for dispatch: undispatched and > 1 day
        if (issue.dispatched === 'no' && ((now - reportDate) / (1000 * 60 * 60 * 24)) > 1) {
          statsMap[supervisor].agingCount += 1;
        }
      }

      // 2. Field Resolution Speed
      if (issue.dispatchedAt || issue.dispatched === 'yes') {
        let resStart = issue.dispatchedAt ? new Date(issue.dispatchedAt) : reportDate;
        let resEnd = issue.resolveDate ? new Date(issue.resolveDate) : (issue.solved === 'no' ? now : null);
        if (resStart && resEnd && resEnd >= resStart) {
          statsMap[supervisor].resolutionSum += (resEnd - resStart) / (1000 * 60 * 60 * 24);
          statsMap[supervisor].resolutionCount += 1;
        }
      }

      // 3. Total Lifecycle
      let lifecycleEnd = issue.closedAt ? new Date(issue.closedAt) : (issue.solved === 'no' ? now : null);
      if (lifecycleEnd && lifecycleEnd >= reportDate) {
        statsMap[supervisor].lifecycleSum += (lifecycleEnd - reportDate) / (1000 * 60 * 60 * 24);
        statsMap[supervisor].lifecycleCount += 1;
      }
    });

    return Object.entries(statsMap)
      .map(([name, data]) => ({
        name,
        total: data.total,
        resolved: data.resolved,
        unresolved: data.unresolved,
        dispatched: data.dispatched, // Total dispatched (history)
        openDispatched: data.openDispatched,
        openUndispatched: data.openUndispatched,
        issuesTotal: data.issuesTotal,
        issuesResolved: data.issuesResolved,
        issuesUnresolved: data.issuesUnresolved,
        issuesDispatched: data.issuesDispatched,
        issuesOpenDispatched: data.issuesOpenDispatched,
        issuesOpenUndispatched: data.issuesOpenUndispatched,
        rate: data.total > 0 ? ((data.resolved / data.total) * 100).toFixed(1) : 0,
        avgDispatchSpeed: data.dispatchCount > 0 ? (data.dispatchSum / data.dispatchCount).toFixed(1) : 'N/A',
        avgResolutionSpeed: data.resolutionCount > 0 ? (data.resolutionSum / data.resolutionCount).toFixed(1) : 'N/A',
        avgLifecycleTime: data.lifecycleCount > 0 ? (data.lifecycleSum / data.lifecycleCount).toFixed(1) : 'N/A',
        agingCount: data.agingCount
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredIssuesByDate]);

  const installingTeamStats = useMemo(() => {
    const statsMap = {};
    const now = new Date();
    filteredIssuesByDate.forEach(issue => {
      const team = issue.installingTeam || 'Unknown';
      if (!statsMap[team]) {
        statsMap[team] = {
          total: 0,
          resolved: 0,
          unresolved: 0,
          categories: {},
          subCategories: {},
          dispatchSum: 0,
          dispatchCount: 0,
          resSum: 0,
          resCount: 0,
          lifecycleSum: 0,
          lifecycleCount: 0
        };
      }
      statsMap[team].total += 1;
      issue.solved === 'yes' ? statsMap[team].resolved += 1 : statsMap[team].unresolved += 1;
      if (issue.issues) {
        issue.issues.forEach(i => {
          if (i.category) statsMap[team].categories[i.category] = (statsMap[team].categories[i.category] || 0) + 1;
          if (i.subCategory) statsMap[team].subCategories[i.subCategory] = (statsMap[team].subCategories[i.subCategory] || 0) + 1;
        });
      }

      const reportDate = new Date(issue.date || issue.createdAt);

      // Speed Metrics for Team
      // 1. Dispatch
      let dEnd = issue.dispatchedAt ? new Date(issue.dispatchedAt) : (issue.dispatched === 'no' ? now : null);
      if (!dEnd && issue.dispatched === 'yes') dEnd = reportDate;
      if (dEnd && dEnd >= reportDate) {
        statsMap[team].dispatchSum += (dEnd - reportDate) / (1000 * 60 * 60 * 24);
        statsMap[team].dispatchCount += 1;
      }

      // 2. Resolution (Field)
      if (issue.dispatchedAt || issue.dispatched === 'yes') {
        let rStart = issue.dispatchedAt ? new Date(issue.dispatchedAt) : reportDate;
        let rEnd = issue.resolveDate ? new Date(issue.resolveDate) : (issue.solved === 'no' ? now : null);
        if (rStart && rEnd && rEnd >= rStart) {
          statsMap[team].resSum += (rEnd - rStart) / (1000 * 60 * 60 * 24);
          statsMap[team].resCount += 1;
        }
      }

      // 3. End-to-End Lifecycle
      let lEnd = issue.closedAt ? new Date(issue.closedAt) : (issue.solved === 'no' ? now : null);
      if (lEnd && lEnd >= reportDate) {
        statsMap[team].lifecycleSum += (lEnd - reportDate) / (1000 * 60 * 60 * 24);
        statsMap[team].lifecycleCount += 1;
      }
    });

    let detailedList = Object.keys(statsMap).map(name => {
      const stats = statsMap[name];
      const topCat = Object.entries(stats.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
      const topSub = Object.entries(stats.subCategories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
      return {
        name,
        ...stats,
        topCategory: topCat,
        topSubCategory: topSub,
        rate: ((stats.resolved / stats.total) * 100).toFixed(1),
        avgDispatchSpeed: stats.dispatchCount > 0 ? (stats.dispatchSum / stats.dispatchCount).toFixed(1) : 'N/A',
        avgResolutionSpeed: stats.resCount > 0 ? (stats.resSum / stats.resCount).toFixed(1) : 'N/A',
        avgLifecycleTime: stats.lifecycleCount > 0 ? (stats.lifecycleSum / stats.lifecycleCount).toFixed(1) : 'N/A',
        relatedIssues: filteredIssuesByDate.filter(i => (i.installingTeam || 'Unknown') === name),
        type: 'Installing Team'
      };
    });

    if (installingTeamSearch.trim()) {
      detailedList = detailedList.filter(item => item.name.toLowerCase().includes(installingTeamSearch.toLowerCase()));
    }
    if (installingTeamFilters.status !== 'all') {
      detailedList = detailedList.filter(item => installingTeamFilters.status === 'resolved' ? item.resolved > 0 : item.unresolved > 0);
    }
    if (installingTeamSort.field) {
      detailedList.sort((a, b) => {
        let valA = a[installingTeamSort.field], valB = b[installingTeamSort.field];
        if (['rate', 'avgDispatchSpeed', 'avgResolutionSpeed', 'avgLifecycleTime'].includes(installingTeamSort.field)) {
          valA = valA === 'N/A' ? 999 : parseFloat(valA);
          valB = valB === 'N/A' ? 999 : parseFloat(valB);
        }
        return installingTeamSort.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
    }

    return detailedList;
  }, [filteredIssuesByDate, installingTeamSearch, installingTeamSort, installingTeamFilters]);

  const reporterData = useMemo(() => {
    const counts = {};
    filteredIssuesByDate.forEach(issue => {
      const reporter = issue.reporter || 'Unknown';
      counts[reporter] = (counts[reporter] || 0) + 1;
    });
    const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 10);
    return {
      labels,
      datasets: [{
        label: 'Issues Reported',
        data: labels.map(l => counts[l]),
        backgroundColor: 'rgba(54, 185, 204, 0.6)',
        borderColor: 'rgba(54, 185, 204, 1)',
        borderWidth: 1
      }]
    };
  }, [filteredIssuesByDate]);

  const trendData = useMemo(() => {
    const countsByDate = {};
    const sortedIssues = [...filteredIssuesByDate].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedIssues.forEach(issue => {
      if (!issue.date) return;
      const d = new Date(issue.date);
      let key = '';

      if (trendTimeframe === 'day') {
        key = d.toISOString().split('T')[0];
      } else if (trendTimeframe === 'week') {
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay()); // Start on Sunday
        key = `Week of ${startOfWeek.toISOString().split('T')[0]}`;
      } else if (trendTimeframe === 'month') {
        key = d.toISOString().slice(0, 7); // YYYY-MM
      } else {
        key = d.toISOString().split('T')[0];
      }

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

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { color: '#ffffff' } } },
    scales: {
      x: { ticks: { color: '#b3b3b3' }, grid: { color: '#3d3d3d' } },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#b3b3b3',
          stepSize: 1,
          precision: 0
        },
        grid: { color: '#3d3d3d' }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'bottom', labels: { color: '#b3b3b3', usePointStyle: true, padding: 20 } }
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

  const [logPage, setLogPage] = useState(0);
  const [logRowsPerPage, setLogRowsPerPage] = useState(10);

  const filteredLogIssues = useMemo(() => {
    return filteredIssuesByDate
      .filter(i => {
        const term = assigneeSearch.toLowerCase();
        const matchSearch = i.slid.toLowerCase().includes(term) ||
          (i.assignedTo && i.assignedTo.toLowerCase().includes(term)) ||
          (i.installingTeam && i.installingTeam.toLowerCase().includes(term));
        const matchStatus = filters.status === 'all' || (filters.status === 'resolved' ? i.solved === 'yes' : i.solved === 'no');
        return matchSearch && matchStatus;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredIssuesByDate, assigneeSearch, filters.status]);

  const handleChangeLogPage = (event, newPage) => {
    setLogPage(newPage);
  };

  const handleChangeLogRowsPerPage = (event) => {
    setLogRowsPerPage(parseInt(event.target.value, 10));
    setLogPage(0);
  };

  const handleWhatsAppContact = async (issue) => {
    // Build comprehensive message
    let formattedMessage = `*🔔 Issue Report*\n\n`;

    formattedMessage += `*SLID:* ${issue.slid}\n`;
    formattedMessage += `*👤 Customer Info*\n`;
    formattedMessage += `Name: ${issue.customerName || 'N/A'}\n`;
    formattedMessage += `Contact: ${issue.customerContact || 'N/A'}\n`;
    if (issue.ticketId) formattedMessage += `*Ticket ID:* ${issue.ticketId}\n`;
    formattedMessage += `*Status:* ${issue.solved === 'yes' ? '✅ Resolved' : '⚠️ Open'}\n\n`;

    formattedMessage += `*📍 Source & Team*\n`;
    formattedMessage += `Team Company: ${issue.teamCompany}\n`;
    formattedMessage += `Installing Team: ${issue.installingTeam || 'N/A'}\n`;
    formattedMessage += `Assigned To: ${issue.assignedTo || 'Unassigned'}\n\n`;

    formattedMessage += `*🔍 Issue Details*\n`;
    formattedMessage += `Categories: ${issue.issues?.map(i => i.category + (i.subCategory ? ` (${i.subCategory})` : '')).join(', ') || 'N/A'}\n`;
    if (issue.reporterNote) formattedMessage += `Reporter Note: ${issue.reporterNote}\n`;
    if (issue.assigneeNote) formattedMessage += `Assignee Note: ${issue.assigneeNote}\n`;
    formattedMessage += `\n`;

    formattedMessage += `*📅 Timeline*\n`;
    formattedMessage += `Reported: ${new Date(issue.date).toLocaleDateString()}\n`;
    if (issue.pisDate) formattedMessage += `PIS Date: ${new Date(issue.pisDate).toLocaleDateString()}\n`;
    if (issue.dispatched === 'yes') {
      formattedMessage += `Dispatched: ${issue.dispatchedAt ? new Date(issue.dispatchedAt).toLocaleDateString() : 'Yes'}\n`;
    }

    if (issue.solved === 'yes') {
      formattedMessage += `\n*✅ Resolution*\n`;
      if (issue.resolveDate) formattedMessage += `Resolved: ${new Date(issue.resolveDate).toLocaleDateString()}\n`;
      if (issue.resolvedBy) formattedMessage += `Method: ${issue.resolvedBy}\n`;
      if (issue.closedBy) formattedMessage += `Supervisor: ${issue.closedBy}\n`;
      if (issue.closedAt) formattedMessage += `Closed: ${new Date(issue.closedAt).toLocaleDateString()}\n`;
      if (issue.resolutionDetails) formattedMessage += `Details: ${issue.resolutionDetails}\n`;
    }

    const installingTeamName = issue.installingTeam;

    if (!installingTeamName) {
      toast.error('Installing team not specified');
      return;
    }

    try {
      console.log('Fetching field teams for WhatsApp contact...');
      // Fetch field team data to get contact number
      const response = await api.get('/field-teams/get-field-teams', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      console.log('Target Installing Team:', installingTeamName);

      const fieldTeam = response.data.find(team =>
        team.teamName?.trim().toLowerCase() === installingTeamName.trim().toLowerCase()
      );

      console.log('Found Field Team:', fieldTeam);

      if (!fieldTeam || !fieldTeam.contactNumber) {
        toast.error('Team contact number not found');
        return;
      }

      let phoneNumber = fieldTeam.contactNumber;

      // Clean and validate phone number
      let cleanNumber = phoneNumber.toString().trim();
      const hasPlus = cleanNumber.startsWith('+');
      cleanNumber = cleanNumber.replace(/[^0-9]/g, '');
      if (hasPlus && cleanNumber) cleanNumber = '+' + cleanNumber;

      const digitsOnly = cleanNumber.replace(/\+/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        toast.error('Invalid phone number format');
        console.error('Invalid phone number:', phoneNumber, 'cleaned to:', cleanNumber);
        return;
      }

      navigator.clipboard.writeText(formattedMessage).catch(() => { });

      const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(formattedMessage)}`;
      console.log('Opening WhatsApp URL:', whatsappUrl);
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Failed to fetch team contact information');
    }
  };

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      {/* Top Controls: Period Filter & Email Report */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h5" fontWeight="bold">Customer Issues Dashboard</Typography>
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
        </Box>
        <Button
          variant="contained"
          startIcon={<FaFileExport />}
          onClick={() => setShowEmailDialog(true)}
          sx={{
            bgcolor: '#4e73df',
            '&:hover': { bgcolor: '#2e59d9' },
            borderRadius: 2,
            textTransform: 'none',
            px: 3
          }}
        >
          Email Report
        </Button>
      </Box>
      {/* KPI Section */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={6} md={2.4}><StatCard title="Total Transactions" value={stats.totalTransactions} icon={<FaClipboardList />} color="#2196f3" subtext="Total records" /></Grid>
        <Grid item xs={12} sm={6} md={2.4}><StatCard title="Issues Highlighted" value={stats.totalIssuesHighlighted} icon={<FaExclamationCircle />} color="#ffc107" subtext={`Avg: ${stats.issueDensity} per txn`} /></Grid>
        <Grid item xs={12} sm={6} md={2.4}><StatCard title="Closed" value={stats.closed} icon={<FaCheckCircle />} color="#4caf50" subtext={`${stats.resolutionRate}% Rate`} /></Grid>
        <Grid item xs={12} sm={6} md={2.4}><StatCard title="Open" value={stats.open} icon={<FaExclamationCircle />} color="#f44336" subtext="Require attention" /></Grid>
        <Grid item xs={12} sm={6} md={2.4}><StatCard title="Avg. Daily Issues" value={(stats.totalTransactions / (trendData.labels.length || 1)).toFixed(1)} icon={<FaChartLine />} color="#ff9800" subtext="Trend metric" /></Grid>
      </Grid>

      {/* Process Efficiency Spotlight */}
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

          {/* Supervisor Performance Table - Vertical Stack */}
          {/* Supervisor Performance Table - Vertical Stack */}
          <Grid item xs={12}>
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
              <Box sx={{
                p: 3,
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.02)'
              }}>
                <Box>
                  <Typography variant="h6" fontWeight="700" color="#f8fafc">
                    Supervisor Performance
                  </Typography>
                  <Typography variant="body2" color="#94a3b8" sx={{ mt: 0.5 }}>
                    Aging impact and workload distribution
                  </Typography>
                </Box>
                <Chip
                  label={`${supervisorStats.length} Supervisors`}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(59, 130, 246, 0.1)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    fontWeight: 600
                  }}
                />
              </Box>
              <Box sx={{ width: '100%', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ background: '#0f172a' }}>
                      <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Supervisor</th>
                      <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Total</th>
                      <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Closed</th>
                      <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Open</th>
                      <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          Dispatched
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#3b82f6' }} />
                        </Box>
                      </th>
                      <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          Undispatched
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                        </Box>
                      </th>
                      <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          Rate
                          <Tooltip title="Resolution Rate (%): Percentage of closed issues out of total assigned." arrow>
                            <Box component="span" sx={{ display: 'inline-flex', cursor: 'help' }}>
                              <FaInfoCircle size={10} style={{ opacity: 0.6 }} />
                            </Box>
                          </Tooltip>
                        </Box>
                      </th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          Dispatch
                          <Tooltip title="Avg. Dispatch Speed (Days): Average time taken from report date to issue dispatch." arrow>
                            <Box component="span" sx={{ display: 'inline-flex', cursor: 'help' }}>
                              <FaInfoCircle size={10} style={{ opacity: 0.6 }} />
                            </Box>
                          </Tooltip>
                        </Box>
                      </th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          Resol.
                          <Tooltip title="Avg. Field Resolution Speed (Days): Average time taken from dispatch to field resolution." arrow>
                            <Box component="span" sx={{ display: 'inline-flex', cursor: 'help' }}>
                              <FaInfoCircle size={10} style={{ opacity: 0.6 }} />
                            </Box>
                          </Tooltip>
                        </Box>
                      </th>
                      <th style={{ padding: '16px', textAlign: 'right', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          Life
                          <Tooltip title="Avg. Total Lifecycle (Days): Total duration from report date to final closure (or now if open)." arrow>
                            <Box component="span" sx={{ display: 'inline-flex', cursor: 'help' }}>
                              <FaInfoCircle size={10} style={{ opacity: 0.6 }} />
                            </Box>
                          </Tooltip>
                        </Box>
                      </th>
                      <th style={{ padding: '16px 24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          Aging
                          <Tooltip title="Aging Bottlenecks: Count of undispatched issues pending for more than 1 day." arrow>
                            <Box component="span" sx={{ display: 'inline-flex', cursor: 'help' }}>
                              <FaInfoCircle size={10} style={{ opacity: 0.6 }} />
                            </Box>
                          </Tooltip>
                        </Box>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {supervisorStats.map((sup, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '16px 24px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                bgcolor: 'rgba(255,255,255,0.05)',
                                color: '#f8fafc',
                                fontSize: '0.85rem',
                                border: '1px solid rgba(255,255,255,0.1)'
                              }}
                            >
                              {sup.name.charAt(0)}
                            </Avatar>
                            <Typography variant="body2" fontWeight="600" color="#f8fafc">
                              {sup.name}
                            </Typography>
                          </Box>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            color="#94a3b8"
                            sx={{
                              cursor: 'pointer',
                              transition: 'color 0.2s',
                              '&:hover': { color: '#f8fafc', textDecoration: 'underline' }
                            }}
                            onClick={() => handleStatusClick(sup.issuesTotal, `${sup.name} - All Issues`)}
                          >
                            {sup.total}
                          </Typography>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            color="#22c55e"
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              px: 1, py: 0.5, borderRadius: 1,
                              '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.1)' }
                            }}
                            onClick={() => handleStatusClick(sup.issuesResolved, `${sup.name} - Closed Issues`)}
                          >
                            {sup.resolved}
                          </Typography>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            color="#ef4444"
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              px: 1, py: 0.5, borderRadius: 1,
                              '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' }
                            }}
                            onClick={() => handleStatusClick(sup.issuesUnresolved, `${sup.name} - Open Issues`)}
                          >
                            {sup.unresolved}
                          </Typography>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            color="#3b82f6"
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              px: 1, py: 0.5, borderRadius: 1,
                              '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.1)' }
                            }}
                            onClick={() => handleStatusClick(sup.issuesOpenDispatched, `${sup.name} - Open Dispatched (In Progress)`)}
                          >
                            {sup.openDispatched}
                          </Typography>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            color="#f59e0b"
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              px: 1, py: 0.5, borderRadius: 1,
                              '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.1)' }
                            }}
                            onClick={() => handleStatusClick(sup.issuesOpenUndispatched, `${sup.name} - Open Undispatched (Pending)`)}
                          >
                            {sup.openUndispatched}
                          </Typography>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                            <Chip
                              label={`${sup.rate}%`}
                              size="small"
                              sx={{
                                height: 24,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                bgcolor: 'rgba(255,255,255,0.05)',
                                color: parseFloat(sup.rate) >= 80 ? '#22c55e' : parseFloat(sup.rate) >= 50 ? '#f59e0b' : '#ef4444',
                                border: `1px solid ${parseFloat(sup.rate) >= 80 ? 'rgba(34, 197, 94, 0.3)' : parseFloat(sup.rate) >= 50 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                              }}
                            />
                          </Box>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <Typography variant="body2" fontFamily="monospace" color={Number(sup.avgDispatchSpeed) > 1 ? '#f59e0b' : '#94a3b8'}>
                            {sup.avgDispatchSpeed !== 'N/A' ? `${sup.avgDispatchSpeed}d` : '-'}
                          </Typography>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <Typography variant="body2" fontFamily="monospace" color="#94a3b8">
                            {sup.avgResolutionSpeed !== 'N/A' ? `${sup.avgResolutionSpeed}d` : '-'}
                          </Typography>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <Typography variant="body2" fontFamily="monospace" color="#f8fafc">
                            {sup.avgLifecycleTime !== 'N/A' ? `${sup.avgLifecycleTime}d` : '-'}
                          </Typography>
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                          {sup.agingCount > 0 ? (
                            <Chip
                              label={sup.agingCount}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                minWidth: 24,
                                bgcolor: 'rgba(239, 68, 68, 0.2)',
                                color: '#ef4444'
                              }}
                            />
                          ) : <Typography variant="caption" color="rgba(255,255,255,0.1)">-</Typography>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Paper>
          </Grid>

          {/* Aging Bottlenecks List - Table Format with Search & Actions */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: '#1a1a1a', color: '#fff', borderRadius: 2, border: '1px solid #f44336', height: '100%' }}>
              <Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} mb={2} spacing={2}>
                <Typography variant="h6" fontWeight="bold" color="error">Open Cases (Dispatched + Awaiting Dispatch)</Typography>
                <Stack direction={isMobile ? "column" : "row"} spacing={1} sx={{ width: isMobile ? '100%' : 'auto' }}>
                  <FormControl size="small" sx={{ width: isMobile ? '100%' : 200 }}>
                    <Select
                      value={negligenceSupervisorFilter}
                      onChange={(e) => {
                        setNegligenceSupervisorFilter(e.target.value);
                        setNegligencePage(0);
                      }}
                      displayEmpty
                      sx={{
                        bgcolor: '#2d2d2d',
                        color: '#fff',
                        borderRadius: 2,
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                        fontSize: '0.85rem'
                      }}
                    >
                      <MenuItem value="all">All Supervisors</MenuItem>
                      {Array.from(new Set(stats.oldestPending.map(item => item.supervisor))).sort().map(sup => (
                        <MenuItem key={sup} value={sup}>{sup}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    size="small"
                    placeholder="Search SLID or Technician..."
                    variant="outlined"
                    value={negligenceSearch}
                    onChange={(e) => {
                      setNegligenceSearch(e.target.value);
                      setNegligencePage(0);
                    }}
                    InputProps={{
                      startAdornment: <FaSearch style={{ marginRight: 8, color: '#666' }} />,
                      sx: { bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, '& fieldset': { borderColor: '#444' } }
                    }}
                    sx={{ width: isMobile ? '100%' : 250 }}
                  />
                </Stack>
              </Stack>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#b3b3b3', fontSize: '0.75rem', borderBottom: '1px solid #3d3d3d' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Created At</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Report Date</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>SLID</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Age</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Stage</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Personnel</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = stats.oldestPending.filter(item => {
                        const matchesSearch = item.slid.toLowerCase().includes(negligenceSearch.toLowerCase()) ||
                          item.assignedTo.toLowerCase().includes(negligenceSearch.toLowerCase()) ||
                          item.supervisor.toLowerCase().includes(negligenceSearch.toLowerCase());

                        const matchesSupervisor = negligenceSupervisorFilter === 'all' || item.supervisor === negligenceSupervisorFilter;

                        return matchesSearch && matchesSupervisor;
                      });

                      return filtered.length > 0 ? filtered
                        .slice(negligencePage * negligenceRowsPerPage, negligencePage * negligenceRowsPerPage + negligenceRowsPerPage)
                        .map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #333' }}>
                            <td style={{ padding: '8px', color: '#b3b3b3', fontSize: '0.75rem' }}>{new Date(item.originalIssue.createdAt).toLocaleDateString()}</td>
                            <td style={{ padding: '8px', color: '#b3b3b3', fontSize: '0.75rem' }}>{new Date(item.reportDate).toLocaleDateString()}</td>
                            <td style={{ padding: '8px', color: '#4e73df', fontWeight: 'bold', fontSize: '0.85rem' }}>{item.slid}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <Chip label={`${item.age}d`} size="small" color="error" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                            </td>
                            <td style={{ padding: '8px', fontSize: '0.8rem', color: '#ccc' }}>{item.stage}</td>
                            <td style={{ padding: '8px', fontSize: '0.75rem', color: '#999' }}>
                              T: {item.assignedTo}<br />S: {item.supervisor}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                onClick={() => handleViewIssue(item.originalIssue)}
                                sx={{ fontSize: '0.7rem', textTransform: 'none', py: 0.2 }}
                              >
                                View
                              </Button>
                              {item.originalIssue?.installingTeam && (
                                <Tooltip title="Contact Team via WhatsApp">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleWhatsAppContact(item.originalIssue);
                                    }}
                                    sx={{ ml: 1, color: '#25D366', '&:hover': { backgroundColor: 'rgba(37, 211, 102, 0.1)' } }}
                                  >
                                    <FaWhatsapp size={16} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </td>
                          </tr>
                        )) : (
                        <tr style={{ borderBottom: "1px solid #333" }}>
                          <td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "#4caf50" }}>
                            All caught up! No active bottlenecks detected.
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </Box>
              <TablePagination
                component="div"
                count={stats.oldestPending.filter(item => {
                  const matchesSearch = item.slid.toLowerCase().includes(negligenceSearch.toLowerCase()) ||
                    item.assignedTo.toLowerCase().includes(negligenceSearch.toLowerCase()) ||
                    item.supervisor.toLowerCase().includes(negligenceSearch.toLowerCase());

                  const matchesSupervisor = negligenceSupervisorFilter === 'all' || item.supervisor === negligenceSupervisorFilter;

                  return matchesSearch && matchesSupervisor;
                }).length}
                page={negligencePage}
                onPageChange={(e, newPage) => setNegligencePage(newPage)}
                rowsPerPage={negligenceRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setNegligenceRowsPerPage(parseInt(e.target.value, 10));
                  setNegligencePage(0);
                }}
                rowsPerPageOptions={[5, 10, 25]}
                sx={{ color: '#fff' }}
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={3}>
        {/* Trend & Resolution Row */}
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

        {/* Breakdown Row */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d' }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">Top Reporters</Typography>
            <Box sx={{ height: 300 }}><Bar data={reporterData} options={commonOptions} /></Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d', height: '100%' }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">Issue Breakdown (Categories)</Typography>
            <Box sx={{ height: 260, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Doughnut data={categoryData} options={doughnutOptions} />
              <Box sx={{ position: 'absolute', textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#4e73df' }}>{categoryData.totalCount}</Typography>
                <Typography variant="caption" color="#b3b3b3">Total Issues</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>



        {/* Installing Team Distribution - Full Row */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d' }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">Installing Team Distribution</Typography>
            <Box sx={{ height: 300 }}><Bar data={installingTeamChartData} options={commonOptions} /></Box>
          </Paper>
        </Grid>

        {/* Side-by-Side: Issues by From & Assignee Performance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d', height: '100%' }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">Issues by From (Main)</Typography>
            <Box sx={{ height: 300 }}><Bar data={teamData} options={commonOptions} /></Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 0,
              bgcolor: '#1e293b',
              borderRadius: 3,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              height: 400, // Increased height
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', bgcolor: 'rgba(255,255,255,0.02)' }}>
              <Typography variant="h6" fontWeight="700" color="#f8fafc">
                Assignee Performance
              </Typography>
              <Typography variant="body2" color="#94a3b8" sx={{ mt: 0.5 }}>
                Field team resolution metrics
              </Typography>
            </Box>
            <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: '#0f172a' }}>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Assignee</th>
                    <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Total</th>
                    <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Closed</th>
                    <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Open</th>
                    <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        Disp.
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#3b82f6' }} />
                      </Box>
                    </th>
                    <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        Undisp.
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                      </Box>
                    </th>
                    <th style={{ padding: '16px', textAlign: 'right', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Rate</th>
                    <th style={{ padding: '16px 24px', textAlign: 'right', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Avg Speed</th>
                  </tr>
                </thead>
                <tbody>
                  {assigneeStats.detailedList.map((stat, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '16px 24px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              bgcolor: 'rgba(255,255,255,0.05)',
                              color: '#f8fafc',
                              fontSize: '0.75rem',
                              border: '1px solid rgba(255,255,255,0.1)'
                            }}
                          >
                            {stat.name.charAt(0)}
                          </Avatar>
                          <Typography variant="body2" fontWeight="600" color="#f8fafc">
                            {stat.name}
                          </Typography>
                        </Box>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <Typography
                          variant="body2"
                          fontWeight="600"
                          color="#94a3b8"
                          sx={{
                            cursor: 'pointer',
                            transition: 'color 0.2s',
                            '&:hover': { color: '#f8fafc', textDecoration: 'underline' }
                          }}
                          onClick={() => handleStatusClick(stat.issuesTotal, `${stat.name} - All Issues`)}
                        >
                          {stat.total}
                        </Typography>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <Typography
                          variant="body2"
                          fontWeight="600"
                          color="#22c55e"
                          sx={{
                            cursor: 'pointer',
                            transition: 'color 0.2s',
                            '&:hover': { color: '#4ade80', textDecoration: 'underline' }
                          }}
                          onClick={() => handleStatusClick(stat.issuesResolved, `${stat.name} - Closed Issues`)}
                        >
                          {stat.resolved}
                        </Typography>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <Typography
                          variant="body2"
                          fontWeight="600"
                          color="#ef4444"
                          sx={{
                            cursor: 'pointer',
                            transition: 'color 0.2s',
                            '&:hover': { color: '#f87171', textDecoration: 'underline' }
                          }}
                          onClick={() => handleStatusClick(stat.issuesUnresolved, `${stat.name} - Open Issues`)}
                        >
                          {stat.unresolved}
                        </Typography>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <Typography
                          variant="body2"
                          fontWeight="600"
                          color="#3b82f6"
                          sx={{
                            cursor: 'pointer',
                            transition: 'color 0.2s',
                            '&:hover': { color: '#60a5fa', textDecoration: 'underline' }
                          }}
                          onClick={() => handleStatusClick(stat.issuesOpenDispatched, `${stat.name} - Open Dispatched (In Progress)`)}
                        >
                          {stat.openDispatched}
                        </Typography>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <Typography
                          variant="body2"
                          fontWeight="600"
                          color="#f59e0b"
                          sx={{
                            cursor: 'pointer',
                            transition: 'color 0.2s',
                            '&:hover': { color: '#fbbf24', textDecoration: 'underline' }
                          }}
                          onClick={() => handleStatusClick(stat.issuesOpenUndispatched, `${stat.name} - Open Undispatched (Pending)`)}
                        >
                          {stat.openUndispatched}
                        </Typography>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <Chip
                          label={`${stat.rate}%`}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            bgcolor: 'rgba(255,255,255,0.05)',
                            color: parseFloat(stat.rate) >= 80 ? '#22c55e' : parseFloat(stat.rate) >= 50 ? '#f59e0b' : '#ef4444',
                            border: `1px solid ${parseFloat(stat.rate) >= 80 ? 'rgba(34, 197, 94, 0.3)' : parseFloat(stat.rate) >= 50 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                          }}
                        />
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <Typography variant="body2" fontFamily="monospace" color={Number(stat.avgResolutionSpeed) > 1 ? '#f59e0b' : '#94a3b8'}>
                          {stat.avgResolutionSpeed !== 'N/A' ? `${stat.avgResolutionSpeed}d` : '-'}
                        </Typography>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Paper>
        </Grid>

        {/* Unified Issue Log - Replaces separate tables */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight="bold">Consolidated Performance Log</Typography>
                  <Typography variant="caption" color="#b3b3b3">Comprehensive issue tracking: Assignees & Installing Teams</Typography>
                </Box>
                <TextField
                  size="small"
                  placeholder="Seach SLID, Team, or Assignee..."
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                  InputProps={{ startAdornment: <FaSearch style={{ marginRight: 8, color: '#666' }} /> }}
                  sx={{ width: { xs: '100%', sm: '350px' }, '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: '#1a1a1a', '& fieldset': { borderColor: '#3d3d3d' } } }}
                />
              </Box>

              <Box sx={{ p: 2, bgcolor: '#1e1e1e', borderRadius: 2, border: '1px solid #333', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel sx={{ color: '#b3b3b3' }}>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#333' } }}
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="resolved">Closed Only</MenuItem>
                    <MenuItem value="unresolved">Open Only</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  variant="outlined"
                  startIcon={<FaFileExcel />}
                  onClick={() => {
                    const data = issues.map(i => {
                      const categories = i.issues?.map(issue => issue.category).filter(Boolean).join(', ') || 'N/A';
                      const subCategories = i.issues?.map(issue => issue.subCategory).filter(Boolean).join(', ') || 'N/A';
                      const status = i.solved === 'yes' ? 'Closed' : (i.dispatched === 'yes' ? 'In Progress' : 'Pending');

                      return {
                        'Report Date': i.date ? new Date(i.date).toLocaleDateString() : 'N/A',
                        'Created At': i.createdAt ? new Date(i.createdAt).toLocaleString() : 'N/A',
                        'SLID': i.slid,
                        'Customer Name': i.customerName || 'N/A',
                        'Customer Contact': i.customerContact || 'N/A',
                        'Customer Type': i.customerType || 'N/A',
                        'PIS Date': i.pisDate ? new Date(i.pisDate).toLocaleDateString() : 'N/A',
                        'From (Main)': i.fromMain || i.from || 'N/A',
                        'From (Sub)': i.fromSub || 'N/A',
                        'Reporter': i.reporter,
                        'Reporter Note': i.reporterNote || 'N/A',
                        'Contact Method': i.contactMethod || 'N/A',
                        'Team/Company': i.teamCompany || 'N/A',
                        'Assignee': i.assignedTo || 'Unassigned',
                        'Installing Team': i.installingTeam || 'N/A',
                        'Assignee Note': i.assigneeNote || 'N/A',
                        'Status': status,
                        'Categories': categories,
                        'Sub-Categories': subCategories,
                        'Resolution Details': i.resolutionDetails || 'N/A',
                        'Resolved By': i.resolvedBy || 'N/A',
                        'Resolve Date': i.resolveDate ? new Date(i.resolveDate).toLocaleDateString() : 'N/A',
                        'Closed By': i.closedBy || 'N/A',
                        'Closed At': i.closedAt ? new Date(i.closedAt).toLocaleString() : 'N/A',
                        'Dispatched Status': i.dispatched || 'no',
                        'Dispatched At': i.dispatchedAt ? new Date(i.dispatchedAt).toLocaleString() : 'N/A'
                      };
                    });
                    const ws = utils.json_to_sheet(data);
                    const wb = utils.book_new();
                    utils.book_append_sheet(wb, ws, "Consolidated Report");
                    writeFile(wb, `Unified_Performance_Report.xlsx`);
                  }}
                  size="small"
                  sx={{ ml: 'auto', borderColor: '#4caf50', color: '#4caf50' }}
                >
                  Export Detailed Log
                </Button>
              </Box>
            </Box>

            <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                <thead>
                  <tr style={{ color: '#b3b3b3', fontSize: '0.85rem', textAlign: 'left' }}>
                    <th style={{ padding: '0 12px' }}>Created At</th>
                    <th style={{ padding: '0 12px' }}>Report Date</th>
                    <th style={{ padding: '0 12px' }}>SLID</th>
                    <th style={{ padding: '0 12px' }}>Assignee</th>
                    <th style={{ padding: '0 12px' }}>Installing Team</th>
                    <th style={{ padding: '0 12px' }}>Primary Issue</th>
                    <th style={{ padding: '0 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogIssues
                    .slice(logPage * logRowsPerPage, logPage * logRowsPerPage + logRowsPerPage)
                    .map((issue, idx) => (
                      <tr
                        key={idx}
                        onClick={() => handleViewIssue(issue)}
                        style={{ backgroundColor: '#1e1e1e', fontSize: '0.9rem', cursor: 'pointer' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#252525'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1e1e1e'}
                      >
                        <td style={{ padding: '12px', borderRadius: '8px 0 0 8px', color: '#b3b3b3' }}>{new Date(issue.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '12px', color: '#b3b3b3' }}>{new Date(issue.date).toLocaleDateString()}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{issue.slid}</td>
                        <td style={{ padding: '12px' }}>
                          <Box
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const stat = assigneeStats.detailedList.find(s => s.name === issue.assignedTo);
                              stat ? setSelectedTeam(stat) : setSelectedTeam({ name: issue.assignedTo, type: 'Assignee', total: 1, resolved: issue.solved === 'yes' ? 1 : 0, rate: issue.solved === 'yes' ? '100.0' : '0.0', categories: {}, relatedIssues: [issue] });
                            }}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              cursor: 'pointer',
                              color: '#7b68ee',
                              '&:hover': { textDecoration: 'underline' }
                            }}
                          >
                            <FaUserTie size={12} /> {issue.assignedTo || '---'}
                          </Box>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Box
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const stat = installingTeamStats.find(s => s.name === issue.installingTeam);
                              stat ? setSelectedTeam(stat) : setSelectedTeam({ name: issue.installingTeam, type: 'Installing Team', total: 1, resolved: issue.solved === 'yes' ? 1 : 0, rate: issue.solved === 'yes' ? '100.0' : '0.0', categories: {}, relatedIssues: [issue] });
                            }}
                            sx={{
                              cursor: 'pointer',
                              color: '#ff9933',
                              '&:hover': { textDecoration: 'underline' }
                            }}
                          >
                            {issue.installingTeam || '---'}
                          </Box>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Chip label={issue.issues?.[0]?.category || 'N/A'} size="small" sx={{ bgcolor: 'rgba(54, 162, 235, 0.1)', color: '#36a2eb' }} />
                        </td>
                        <td style={{ padding: '12px', borderRadius: '0 8px 8px 0' }}>
                          {issue.solved === 'yes' ? (
                            <Chip label="Closed" size="small" sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50' }} />
                          ) : (
                            <Chip
                              label={issue.dispatched === 'yes' ? 'In Progress' : 'Pending'}
                              size="small"
                              sx={{
                                bgcolor: issue.dispatched === 'yes' ? 'rgba(33, 150, 243, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                                color: issue.dispatched === 'yes' ? '#2196f3' : '#f44336'
                              }}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </Box>
            <TablePagination
              component="div"
              count={filteredLogIssues.length}
              page={logPage}
              onPageChange={handleChangeLogPage}
              rowsPerPage={logRowsPerPage}
              onRowsPerPageChange={handleChangeLogRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              sx={{ color: '#fff', '.MuiTablePagination-selectIcon': { color: '#fff' }, borderTop: '1px solid #3d3d3d' }}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Team/Assignee Drill-down Dashboard */}
      <Dialog
        open={Boolean(selectedTeam)}
        onClose={() => setSelectedTeam(null)}
        // maxWidth="lg"
        fullScreen
        PaperProps={{ sx: { bgcolor: '#1a1a1a', color: '#fff', border: '1px solid #333' } }}
      >
        {selectedTeam && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', p: 3, borderBottom: '1px solid #333' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FaUserTie color="#7b68ee" size={24} />
                <Box>
                  <Typography variant="h6">{selectedTeam.name}</Typography>
                  <Typography variant="caption" color="#b3b3b3">{selectedTeam.type} Dashboard</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FaFileExcel />}
                  onClick={() => {
                    const data = selectedTeam.relatedIssues.map(issue => {
                      const reportDate = new Date(issue.date || issue.createdAt);
                      const closeDate = issue.closedAt ? new Date(issue.closedAt) : (issue.solved === 'no' ? new Date() : null);
                      const lifecycle = closeDate ? ((closeDate - reportDate) / (1000 * 60 * 60 * 24)).toFixed(1) : 'N/A';

                      return {
                        'Created At': new Date(issue.createdAt).toLocaleString(),
                        'Report Date': new Date(issue.date).toLocaleDateString(),
                        'SLID': issue.slid,
                        'Category': issue.issues?.[0]?.category || 'N/A',
                        'Sub-category': issue.issues?.[0]?.subCategory || '-',
                        'Status': issue.solved === 'yes' ? 'Closed' : (issue.dispatched === 'yes' ? 'In Progress' : 'Pending'),
                        'Time to Close (Days)': lifecycle
                      };
                    });
                    const ws = utils.json_to_sheet(data);
                    const wb = utils.book_new();
                    utils.book_append_sheet(wb, ws, "TeamData");
                    writeFile(wb, `${selectedTeam.name}_Performance.xlsx`);
                  }}
                  sx={{ color: '#4caf50', borderColor: '#4caf50', textTransform: 'none', mr: 2 }}
                >
                  Export Data
                </Button>
                <IconButton onClick={() => setSelectedTeam(null)} sx={{ color: '#f44336' }}><FaTimes /></IconButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 3 }}>
              <Grid container spacing={2} mb={4} mt={1}>
                <Grid item xs={12} md={3}>
                  <Box sx={{ p: 2, bgcolor: '#252525', borderRadius: 2, textAlign: 'center', borderBottom: '4px solid #7b68ee' }}>
                    <Typography variant="caption" color="#b3b3b3">Total Capacity</Typography>
                    <Typography variant="h5" fontWeight="bold">{selectedTeam.total}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ p: 2, bgcolor: '#252525', borderRadius: 2, textAlign: 'center', borderBottom: '4px solid #4caf50' }}>
                    <Typography variant="caption" color="#b3b3b3">Resolved</Typography>
                    <Typography variant="h5" fontWeight="bold" color="#4caf50">{selectedTeam.resolved}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ p: 2, bgcolor: '#252525', borderRadius: 2, textAlign: 'center', borderBottom: '4px solid #f44336' }}>
                    <Typography variant="caption" color="#b3b3b3">Success Rate</Typography>
                    <Typography variant="h5" fontWeight="bold" color="#7b68ee">{selectedTeam.rate}%</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ p: 2, bgcolor: '#252525', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="#b3b3b3">Avg. Dispatch</Typography>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: '#ff9800' }}>{selectedTeam.avgDispatchSpeed || 'N/A'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ p: 2, bgcolor: '#252525', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="#b3b3b3">Avg. Resolution</Typography>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: '#4caf50' }}>{selectedTeam.avgResolutionSpeed || 'N/A'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ p: 2, bgcolor: '#252525', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="#b3b3b3">Avg. Lifecycle</Typography>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: '#fff' }}>{selectedTeam.avgLifecycleTime || 'N/A'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ p: 2, bgcolor: '#252525', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="#b3b3b3">Top Category</Typography>
                    <Typography variant="body1" fontWeight="bold" sx={{ color: '#ff9933', fontSize: '0.85rem' }}>{selectedTeam.topCategory}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ p: 2, bgcolor: '#252525', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="#b3b3b3">Top Sub-Category</Typography>
                    <Typography variant="body1" fontWeight="bold" sx={{ color: '#03a9f4', fontSize: '0.85rem' }}>{selectedTeam.topSubCategory || 'N/A'}</Typography>
                  </Box>
                </Grid>
              </Grid>

              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, mt: 4 }}>Recent Issue History (Click to view full details)</Typography>
              <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#b3b3b3', borderBottom: '1px solid #333' }}>
                      <th style={{ padding: '12px' }}>Created At</th>
                      <th style={{ padding: '12px' }}>Report Date</th>
                      <th style={{ padding: '12px' }}>SLID</th>
                      <th style={{ padding: '12px' }}>Category</th>
                      <th style={{ padding: '12px' }}>Sub-category</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px' }}>Life (D)</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTeam.relatedIssues.map((issue, i) => (
                      <tr
                        key={i}
                        onClick={() => handleViewIssue(issue)}
                        style={{ borderBottom: '1px solid #252525', cursor: 'pointer' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#222'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '12px', color: '#b3b3b3' }}>{new Date(issue.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '12px' }}>{new Date(issue.date).toLocaleDateString()}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{issue.slid}</td>
                        <td style={{ padding: '12px' }}>{issue.issues?.[0]?.category || 'N/A'}</td>
                        <td style={{ padding: '12px' }}>{issue.issues?.[0]?.subCategory || '-'}</td>
                        <td style={{ padding: '12px' }}>
                          <Chip label={issue.solved === 'yes' ? 'Success' : 'Active'} size="small" sx={{ bgcolor: issue.solved === 'yes' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 193, 7, 0.1)', color: issue.solved === 'yes' ? '#4caf50' : '#ffc107' }} />
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Typography sx={{
                            fontWeight: 'bold',
                            color: (() => {
                              const rDate = new Date(issue.date || issue.createdAt);
                              const cDate = issue.closedAt ? new Date(issue.closedAt) : (issue.solved === 'no' ? new Date() : null);
                              if (!cDate) return '#b3b3b3';
                              const life = (cDate - rDate) / (1000 * 60 * 60 * 24);
                              return life > 3 ? '#f44336' : life > 1 ? '#ff9800' : '#4caf50';
                            })()
                          }}>
                            {(() => {
                              const rDate = new Date(issue.date || issue.createdAt);
                              const cDate = issue.closedAt ? new Date(issue.closedAt) : (issue.solved === 'no' ? new Date() : null);
                              return cDate ? ((cDate - rDate) / (1000 * 60 * 60 * 24)).toFixed(1) : '-';
                            })()}
                          </Typography>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {issue.installingTeam && (
                            <Tooltip title="Contact Team via WhatsApp">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWhatsAppContact(issue);
                                }}
                                sx={{ color: '#25D366', '&:hover': { backgroundColor: 'rgba(37, 211, 102, 0.1)' } }}
                              >
                                <FaWhatsapp size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Detailed Issue Diagnostics Dialog */}
      <ViewIssueDetailsDialog
        open={isIssueViewOpen}
        onClose={() => setIsIssueViewOpen(false)}
        issue={selectedDetailedIssue}
      />
      <ReportedIssueCardDialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        teamIssues={reportDialogIssues}
        teamName={reportDialogTitle}
      />
      <ManagementEmailDialog
        open={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        data={{
          totalCriticalTasks: stats.totalTransactions,
          reportedOverlapCount: stats.unresolved,
          preventionRate: stats.resolutionRate,
          diagnosisAccuracy: { rate: (stats.resolved / (stats.totalTransactions || 1) * 100).toFixed(1) },
          processEfficiency: {
            avgDispatchTime: stats.avgDispatchTime,
            avgResolutionTime: stats.avgResolutionTime,
            avgLifecycleTime: stats.avgLifecycleTime
          },
          reasonStats: categoryData.labels.reduce((acc, label, idx) => {
            acc[label] = categoryData.datasets[0].data[idx];
            return acc;
          }, {}),
          companyStats: installingTeamChartData.labels.reduce((acc, label, idx) => {
            acc[label] = installingTeamChartData.datasets[0].data[idx];
            return acc;
          }, {})
        }}
      />
    </Box >
  );
};

export default CustomerIssuesAnalytics;
