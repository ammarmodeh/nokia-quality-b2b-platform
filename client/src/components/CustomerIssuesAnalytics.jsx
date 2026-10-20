import { tok } from "../theme/tokens";
import { useMemo, useState } from 'react';
import { utils, writeFile } from 'xlsx';
import { Box, Button, Checkbox, IconButton, MenuItem, TextField, Tooltip, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
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
import { Bar, Doughnut } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import EmailOutlined from '@mui/icons-material/EmailOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import FilterAltOffOutlined from '@mui/icons-material/FilterAltOffOutlined';
import ViewIssueDetailsDialog from './ViewIssueDetailsDialog';
import ManagementEmailDialog from './ManagementEmailDialog';
import { ReportedIssueCardDialog } from './ReportedIssueCardDialog';
import AppDialog from './ui/AppDialog';
import SectionCard from './ui/SectionCard';
import StatCard from './ui/StatCard';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';
import SegmentedControl from './ui/SegmentedControl';
import { UserAvatar } from './ui/AvatarGroup';
import { gridSx } from '../pages/tasks/gridSx';
import { exportRows } from '../utils/exportRows';
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
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [selectedDetailedIssue, setSelectedDetailedIssue] = useState(null);
  const [isIssueViewOpen, setIsIssueViewOpen] = useState(false);

  const [trendTimeframe, setTrendTimeframe] = useState('week'); // 'day', 'week', 'month'
  const [trendChartType, setTrendChartType] = useState('mixed'); // 'mixed', 'bar', 'line'

  const [negligenceSupervisorFilter, setNegligenceSupervisorFilter] = useState('all');
  const [negligenceSearch, setNegligenceSearch] = useState('');

  // --- Team Leaderboard (Ranking) State ---
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [leaderboardStatusFilter, setLeaderboardStatusFilter] = useState('all');
  const [leaderboardSort] = useState({ field: 'total', direction: 'desc' });

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

  const handleToggleCheck = async (issue) => {
    try {
      const updatedValue = !issue.isChecked;
      const response = await api.put(
        `/customer-issues/${issue._id}`,
        { isChecked: updatedValue },
        { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
      );

      if (response.data.success) {
        // toast.success(`Issue marked as ${updatedValue ? 'checked' : 'unchecked'}`);
        // Dispatch refresh event to update parent state
        window.dispatchEvent(new CustomEvent('cin-refresh'));
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleIssueUpdate = async (formData, id) => {
    try {
      const response = await api.put(`/customer-issues/${id}`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (response.data.success) {
        toast.success("Issue updated successfully");
        window.dispatchEvent(new CustomEvent('cin-refresh'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update issue");
    }
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

    // FIX: Calculate Average Daily Issues based on actual duration
    let durationDays = 1;
    if (dateFilter.start && dateFilter.end) {
      const start = new Date(dateFilter.start);
      const end = new Date(dateFilter.end);
      // Add 1 day to be inclusive
      durationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
    } else if (issuesToProcess.length > 0) {
      const dates = issuesToProcess.map(i => new Date(i.date || i.createdAt).getTime());
      const min = Math.min(...dates);
      const max = Math.max(...dates);
      durationDays = Math.max(1, Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1);
    }

    const avgDailyIssues = (totalIssuesHighlighted / durationDays).toFixed(1);

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
      oldestPending,
      avgDailyIssues // Added field
    };
  }, [filteredIssuesByDate, dateFilter]);

  // --- Export Handlers ---
  const handleExportLeaderboard = () => {
    const data = teamNameStats.map(stat => ({
      'Team Name': stat.name,
      'Total Involvement': stat.total,
      'Resolved': stat.resolved,
      'Active': stat.unresolved,
      'Success Rate (%)': stat.rate,
      'Avg Dispatch Speed (Days)': stat.avgDispatchSpeed,
      'Avg Resolution Speed (Days)': stat.avgResolutionSpeed,
      'Avg Lifecycle Time (Days)': stat.avgLifecycleTime,
      'Top Category': stat.topCategory,
      'Top Sub-category': stat.topSubCategory
    }));

    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Leaderboard Performance");

    const maxWidths = {};
    data.forEach(row => {
      Object.keys(row).forEach(key => {
        const val = row[key] ? row[key].toString() : '';
        maxWidths[key] = Math.max(maxWidths[key] || 10, val.length + 2);
      });
    });
    worksheet['!cols'] = Object.keys(maxWidths).map(key => ({ wch: maxWidths[key] }));

    writeFile(workbook, `Team_Leaderboard_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- Data Hookups ---

  const teamNameStats = useMemo(() => {
    let detailedList = [];
    const statsMap = {};
    const now = new Date();
    filteredIssuesByDate.forEach(issue => {
      const teams = new Set([
        issue.teamName,
        issue.installingTeam,
        issue.assignedTo
      ].filter(Boolean));

      teams.forEach(team => {
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
    });

    detailedList = Object.keys(statsMap).map(name => {
      const stats = statsMap[name];
      const topCat = Object.entries(stats.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
      const topSub = Object.entries(stats.subCategories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
      return {
        name,
        ...stats,
        topCategory: topCat,
        topSubCategory: topSub,
        rate: stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : '0.0',
        avgDispatchSpeed: stats.dispatchCount > 0 ? (stats.dispatchSum / stats.dispatchCount).toFixed(1) : 'N/A',
        avgResolutionSpeed: stats.resCount > 0 ? (stats.resSum / stats.resCount).toFixed(1) : 'N/A',
        avgLifecycleTime: stats.lifecycleCount > 0 ? (stats.lifecycleSum / stats.lifecycleCount).toFixed(1) : 'N/A',
        relatedIssues: filteredIssuesByDate.filter(i =>
          i.teamName === name ||
          i.installingTeam === name
        ),
        type: 'Team Name'
      };
    });

    if (leaderboardSearch.trim()) {
      const term = leaderboardSearch.toLowerCase();
      detailedList = detailedList.filter(item => item.name.toLowerCase().includes(term) || item.topCategory.toLowerCase().includes(term));
    }

    if (leaderboardStatusFilter !== 'all') {
      detailedList = detailedList.filter(item => leaderboardStatusFilter === 'resolved' ? item.resolved > 0 : item.unresolved > 0);
    }

    if (leaderboardSort.field) {
      detailedList.sort((a, b) => {
        let valA = a[leaderboardSort.field], valB = b[leaderboardSort.field];
        if (['total', 'resolved', 'unresolved', 'rate'].includes(leaderboardSort.field)) {
          valA = parseFloat(valA) || 0;
          valB = parseFloat(valB) || 0;
        }
        return leaderboardSort.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
    }

    return detailedList;
  }, [filteredIssuesByDate, leaderboardSearch, leaderboardStatusFilter, leaderboardSort]);

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

  const installingTeamChartData = useMemo(() => {
    // Top 10 teams by total involvement
    const sortedTeams = [...teamNameStats].sort((a, b) => b.total - a.total).slice(0, 10);
    const labels = sortedTeams.map(t => t.name);
    const data = sortedTeams.map(t => t.total);
    return {
      labels,
      datasets: [{
        label: 'Total Issue Volume (Holistic)',
        data,
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1,
      }],
    };
  }, [teamNameStats]);

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
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    let finalLabels = [];
    let finalData = [];
    if (sortedCategories.length > 6) {
      const top5 = sortedCategories.slice(0, 5);
      const othersCount = sortedCategories.slice(5).reduce((acc, curr) => acc + curr[1], 0);
      finalLabels = [
        ...top5.map(i => `${i[0]} (${total > 0 ? ((i[1] / total) * 100).toFixed(1) : 0}%)`),
        `Others (${total > 0 ? ((othersCount / total) * 100).toFixed(1) : 0}%)`
      ];
      finalData = [...top5.map(i => i[1]), othersCount];
    } else {
      finalLabels = sortedCategories.map(i => `${i[0]} (${total > 0 ? ((i[1] / total) * 100).toFixed(1) : 0}%)`);
      finalData = sortedCategories.map(i => i[1]);
    }
    return {
      labels: finalLabels,
      datasets: [{
        data: finalData,
        backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796'],
        borderWidth: 1,
      }],
      totalCount: total,
      allCategories: Object.keys(counts).sort()
    };
  }, [filteredIssuesByDate]);

  const statusData = useMemo(() => {
    const total = stats.closed + stats.open;
    return {
      labels: [
        `Closed (${total > 0 ? ((stats.closed / total) * 100).toFixed(1) : 0}%)`,
        `Open (${total > 0 ? ((stats.open / total) * 100).toFixed(1) : 0}%)`
      ],
      datasets: [{
        data: [stats.closed, stats.open],
        backgroundColor: ['#4caf50', '#f44336'],
        borderWidth: 0,
      }],
    };
  }, [stats]);

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
        tension: 0,
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
    plugins: { legend: { position: 'bottom', labels: { color: tok('--text') } } },
    scales: {
      x: { ticks: { color: tok('--text-secondary') }, grid: { color: tok('--border') } },
      y: {
        beginAtZero: true,
        ticks: {
          color: tok('--text-secondary'),
          stepSize: 1,
          precision: 0
        },
        grid: { color: tok('--border') }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { position: 'bottom', labels: { color: tok('--text-secondary'), usePointStyle: true, padding: 20 } },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw || 0;
            return `${label.split(' (')[0]}: ${value}`;
          }
        }
      }
    }
  };

  const handleWhatsAppContact = async (issue) => {
    // Build comprehensive message
    let formattedMessage = `*Issue Report*\n\n`;

    formattedMessage += `*SLID:* ${issue.slid}\n`;
    formattedMessage += `*Customer Info*\n`;
    formattedMessage += `Name: ${issue.customerName || 'N/A'}\n`;
    formattedMessage += `Contact: ${issue.customerContact || 'N/A'}\n`;
    if (issue.ticketId) formattedMessage += `*Ticket ID:* ${issue.ticketId}\n`;
    formattedMessage += `*Status:* ${issue.solved === 'yes' ? 'Resolved' : 'Open'}\n\n`;

    formattedMessage += `*Source & Team*\n`;
    formattedMessage += `Team Company: ${issue.teamCompany}\n`;
    formattedMessage += `Installing Team: ${issue.installingTeam || 'N/A'}\n`;
    formattedMessage += `Assigned To: ${issue.assignedTo || 'Unassigned'}\n\n`;

    formattedMessage += `*Issue Details*\n`;
    formattedMessage += `Categories: ${issue.issues?.map(i => i.category + (i.subCategory ? ` (${i.subCategory})` : '')).join(', ') || 'N/A'}\n`;
    if (issue.reporterNote) formattedMessage += `Reporter Note: ${issue.reporterNote}\n`;
    if (issue.assigneeNote) formattedMessage += `Assignee Note: ${issue.assigneeNote}\n`;
    formattedMessage += `\n`;

    formattedMessage += `*Timeline*\n`;
    formattedMessage += `Reported: ${new Date(issue.date).toLocaleDateString()}\n`;
    if (issue.pisDate) formattedMessage += `PIS Date: ${new Date(issue.pisDate).toLocaleDateString()}\n`;
    if (issue.dispatched === 'yes') {
      formattedMessage += `Dispatched: ${issue.dispatchedAt ? new Date(issue.dispatchedAt).toLocaleDateString() : 'Yes'}\n`;
    }

    if (issue.solved === 'yes') {
      formattedMessage += `\n*Resolution*\n`;
      if (issue.resolveDate) formattedMessage += `Resolved: ${new Date(issue.resolveDate).toLocaleDateString()}\n`;
      if (issue.resolvedBy) formattedMessage += `Method: ${issue.resolvedBy}\n`;
      if (issue.closedBy) formattedMessage += `Supervisor: ${issue.closedBy}\n`;
      if (issue.closedAt) formattedMessage += `Closed: ${new Date(issue.closedAt).toLocaleDateString()}\n`;
      if (issue.resolutionDetails) formattedMessage += `Details: ${issue.resolutionDetails}\n`;
    }

    const teamToContact = issue.teamName || issue.installingTeam;

    if (!teamToContact) {
      toast.error('Team not specified');
      return;
    }

    try {
      console.log('Fetching field teams for WhatsApp contact...');
      // Fetch field team data to get contact number
      const response = await api.get('/field-teams/get-field-teams', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      console.log('Target Team:', teamToContact);

      const fieldTeam = response.data.find(team =>
        team.teamName?.trim().toLowerCase() === teamToContact.trim().toLowerCase()
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
  const days = (v) => (v === undefined || v === null || v === 'N/A' ? '—' : `${v} days`);
  const rateTone = (r) => (parseFloat(r) >= 80 ? 'success' : parseFloat(r) >= 50 ? 'warning' : 'danger');
  const fmtDay = (d) => (d ? new Date(d).toLocaleDateString() : '—');
  const lifeOf = (issue) => {
    const r = new Date(issue.date || issue.createdAt);
    const c = issue.closedAt ? new Date(issue.closedAt) : issue.solved === 'no' ? new Date() : null;
    return c ? (c - r) / 864e5 : null;
  };
  const CountLink = ({ value, onClick, tone }) => (
    <Box
      component="button"
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={!value}
      sx={{ border: 0, background: 'none', font: 'inherit', fontSize: 13, fontWeight: 600, cursor: value ? 'pointer' : 'default', color: tone ? `var(--${tone})` : 'var(--text)', px: 0.75, py: 0.25, borderRadius: '5px', '&:hover': value ? { backgroundColor: 'var(--surface-hover)', textDecoration: 'underline' } : undefined }}
    >
      {value}
    </Box>
  );
  const Hint = ({ title }) => (
    <Tooltip title={title}><InfoOutlined sx={{ fontSize: 14, color: 'var(--text-muted)', ml: 0.5 }} /></Tooltip>
  );
  const header = (label, hint) => function HeaderWithHint() { return <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>{label}<Hint title={hint} /></Box>; };

  const supervisorColumns = [
    { field: 'name', headerName: 'Supervisor', flex: 1, minWidth: 170, renderCell: ({ value }) => <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><UserAvatar user={{ name: value }} size={24} /><Typography noWrap sx={{ fontSize: 13, fontWeight: 500 }}>{value}</Typography></Box> },
    { field: 'total', headerName: 'Total', type: 'number', width: 80, renderCell: ({ row }) => <CountLink value={row.total} onClick={() => handleStatusClick(row.issuesTotal, `${row.name} - All Issues`)} /> },
    { field: 'resolved', headerName: 'Closed', type: 'number', width: 80, renderCell: ({ row }) => <CountLink tone="success" value={row.resolved} onClick={() => handleStatusClick(row.issuesResolved, `${row.name} - Closed Issues`)} /> },
    { field: 'unresolved', headerName: 'Open', type: 'number', width: 80, renderCell: ({ row }) => <CountLink tone="danger" value={row.unresolved} onClick={() => handleStatusClick(row.issuesUnresolved, `${row.name} - Open Issues`)} /> },
    { field: 'openDispatched', headerName: 'Dispatched', type: 'number', width: 100, renderCell: ({ row }) => <CountLink tone="info" value={row.openDispatched} onClick={() => handleStatusClick(row.issuesOpenDispatched, `${row.name} - Open Dispatched (In Progress)`)} /> },
    { field: 'openUndispatched', headerName: 'Undispatched', type: 'number', width: 110, renderCell: ({ row }) => <CountLink tone="warning" value={row.openUndispatched} onClick={() => handleStatusClick(row.issuesOpenUndispatched, `${row.name} - Open Undispatched (Pending)`)} /> },
    { field: 'rate', headerName: 'Rate', type: 'number', width: 90, valueGetter: (v) => parseFloat(v) || 0, renderHeader: header('Rate', 'Resolution rate: closed issues out of all assigned.'), renderCell: ({ row }) => <Badge tone={rateTone(row.rate)}>{row.rate}%</Badge> },
    { field: 'avgDispatchSpeed', headerName: 'Dispatch', type: 'number', width: 100, valueGetter: (v) => (v === 'N/A' ? null : Number(v)), renderHeader: header('Dispatch', 'Average days from report to dispatch.'), renderCell: ({ value }) => <Typography sx={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', color: value > 1 ? 'var(--warning)' : 'var(--text-secondary)' }}>{value === null ? '—' : `${value}d`}</Typography> },
    { field: 'avgResolutionSpeed', headerName: 'Resolution', type: 'number', width: 100, valueGetter: (v) => (v === 'N/A' ? null : Number(v)), renderHeader: header('Resolution', 'Average days from dispatch to field resolution.'), renderCell: ({ value }) => <Typography sx={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{value === null ? '—' : `${value}d`}</Typography> },
    { field: 'avgLifecycleTime', headerName: 'Lifecycle', type: 'number', width: 100, valueGetter: (v) => (v === 'N/A' ? null : Number(v)), renderHeader: header('Lifecycle', 'Average days from report to closure (or now if open).'), renderCell: ({ value }) => <Typography sx={{ fontSize: 12.5, fontFamily: 'var(--font-mono)' }}>{value === null ? '—' : `${value}d`}</Typography> },
    { field: 'agingCount', headerName: 'Aging', type: 'number', width: 90, renderHeader: header('Aging', 'Undispatched issues pending for more than 1 day.'), renderCell: ({ value }) => (value > 0 ? <Badge tone="danger">{value}</Badge> : <Typography sx={{ color: 'var(--text-muted)', fontSize: 12.5 }}>—</Typography>) },
  ];

  const supervisorsOfPending = Array.from(new Set(stats.oldestPending.map((item) => item.supervisor))).sort();
  const pendingRows = stats.oldestPending.filter((item) => {
    const q = negligenceSearch.toLowerCase();
    const matchesSearch = item.slid.toLowerCase().includes(q) || item.assignedTo.toLowerCase().includes(q) || item.supervisor.toLowerCase().includes(q);
    return matchesSearch && (negligenceSupervisorFilter === 'all' || item.supervisor === negligenceSupervisorFilter);
  });
  const pendingColumns = [
    { field: 'createdAt', headerName: 'Created', type: 'date', width: 110, valueGetter: (_v, row) => new Date(row.originalIssue.createdAt), renderCell: ({ value }) => fmtDay(value) },
    { field: 'reportDate', headerName: 'Reported', type: 'date', width: 110, valueGetter: (v) => (v ? new Date(v) : null), renderCell: ({ value }) => fmtDay(value) },
    { field: 'slid', headerName: 'SLID', width: 140, renderCell: ({ value }) => <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{value}</Typography> },
    { field: 'age', headerName: 'Age', type: 'number', width: 80, renderCell: ({ value }) => <Badge tone="danger">{value}d</Badge> },
    { field: 'stage', headerName: 'Stage', width: 150 },
    { field: 'assignedTo', headerName: 'Technician', flex: 1, minWidth: 140 },
    { field: 'supervisor', headerName: 'Supervisor', flex: 1, minWidth: 140 },
    {
      field: 'actions', headerName: '', width: 150, sortable: false, filterable: false, align: 'right',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title={row.originalIssue.isChecked ? 'Marked as followed up' : 'Mark as followed up'}>
            <Checkbox size="small" checked={row.originalIssue.isChecked || false} onChange={() => handleToggleCheck(row.originalIssue)} slotProps={{ input: { 'aria-label': `Followed up ${row.slid}` } }} />
          </Tooltip>
          <Button size="small" variant="outlined" onClick={() => handleViewIssue(row.originalIssue)}>View</Button>
          {row.originalIssue?.installingTeam && (
            <Tooltip title="Contact the team on WhatsApp">
              <IconButton size="small" aria-label="WhatsApp" onClick={() => handleWhatsAppContact(row.originalIssue)}><FaWhatsapp size={15} /></IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  const leaderboardColumns = [
    { field: 'name', headerName: 'Team', flex: 1, minWidth: 180, renderCell: ({ value }) => <Typography noWrap dir="auto" sx={{ fontSize: 13, fontWeight: 500 }}>{value}</Typography> },
    { field: 'total', headerName: 'Involved', type: 'number', width: 100 },
    { field: 'resolved', headerName: 'Resolved', type: 'number', width: 100, renderCell: ({ value }) => <Typography sx={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>{value}</Typography> },
    { field: 'unresolved', headerName: 'Active', type: 'number', width: 90, renderCell: ({ value }) => <Typography sx={{ fontSize: 13, color: value ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>{value}</Typography> },
    { field: 'rate', headerName: 'Success rate', type: 'number', width: 120, valueGetter: (v) => parseFloat(v) || 0, renderCell: ({ row }) => <Badge tone={rateTone(row.rate)}>{row.rate}%</Badge> },
    { field: 'avgResolutionSpeed', headerName: 'Avg speed', type: 'number', width: 110, valueGetter: (v) => (v === 'N/A' ? null : Number(v)), renderCell: ({ value }) => <Typography sx={{ fontSize: 12.5, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{value === null ? '—' : `${value}d`}</Typography> },
    { field: 'topCategory', headerName: 'Top issue', flex: 1, minWidth: 150 },
  ];

  const teamIssueColumns = [
    { field: 'createdAt', headerName: 'Created', type: 'date', width: 110, valueGetter: (v) => (v ? new Date(v) : null), renderCell: ({ value }) => fmtDay(value) },
    { field: 'date', headerName: 'Reported', type: 'date', width: 110, valueGetter: (v) => (v ? new Date(v) : null), renderCell: ({ value }) => fmtDay(value) },
    { field: 'slid', headerName: 'SLID', width: 140, renderCell: ({ value }) => <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{value}</Typography> },
    { field: 'category', headerName: 'Category', flex: 1, minWidth: 140, valueGetter: (_v, row) => row.issues?.[0]?.category || '—' },
    { field: 'subCategory', headerName: 'Sub-category', flex: 1, minWidth: 140, valueGetter: (_v, row) => row.issues?.[0]?.subCategory || '—' },
    { field: 'status', headerName: 'Status', width: 110, valueGetter: (_v, row) => (row.solved === 'yes' ? 'Closed' : 'Active'), renderCell: ({ value }) => <Badge tone={value === 'Closed' ? 'success' : 'warning'} dot>{value}</Badge> },
    { field: 'life', headerName: 'Life (days)', type: 'number', width: 110, valueGetter: (_v, row) => lifeOf(row), renderCell: ({ value }) => <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: value === null ? 'var(--text-muted)' : value > 3 ? 'var(--danger)' : value > 1 ? 'var(--warning)' : 'var(--success)' }}>{value === null ? '—' : value.toFixed(1)}</Typography> },
    {
      field: 'actions', headerName: '', width: 60, sortable: false, filterable: false,
      renderCell: ({ row }) => (row.teamName || row.installingTeam ? (
        <Tooltip title="Contact the team on WhatsApp">
          <IconButton size="small" aria-label="WhatsApp" onClick={(e) => { e.stopPropagation(); handleWhatsAppContact(row); }}><FaWhatsapp size={15} /></IconButton>
        </Tooltip>
      ) : null),
    },
  ];

  const exportTeam = () => {
    exportRows(selectedTeam.relatedIssues, [
      ['Created', (i) => (i.createdAt ? new Date(i.createdAt) : '')],
      ['Reported', (i) => (i.date ? new Date(i.date) : '')],
      ['SLID', (i) => i.slid],
      ['Category', (i) => i.issues?.[0]?.category || ''],
      ['Sub-category', (i) => i.issues?.[0]?.subCategory || ''],
      ['Status', (i) => (i.solved === 'yes' ? 'Closed' : i.dispatched === 'yes' ? 'In Progress' : 'Pending')],
      ['Time to close (days)', (i) => (lifeOf(i) === null ? '' : Number(lifeOf(i).toFixed(1)))],
    ], { filename: `${selectedTeam.name}-performance` });
  };

  const chartCard = (title, children, actions, sx) => (
    <SectionCard title={title} actions={actions} sx={{ height: '100%', ...sx }} bodySx={{ p: 2 }}>{children}</SectionCard>
  );
  const donutCenter = (value, label) => (
    <Box sx={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none', top: '42%', transform: 'translateY(-50%)' }}>
      <Typography sx={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{value}</Typography>
      <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</Typography>
    </Box>
  );
  const grid = (props) => (
    <DataGrid
      autoHeight
      disableRowSelectionOnClick
      rowHeight={44}
      columnHeaderHeight={38}
      pageSizeOptions={[10, 25, 50]}
      initialState={{ pagination: { paginationModel: { pageSize: 10 } }, ...props.initialState }}
      slots={{ noRowsOverlay: () => <EmptyState title={props.empty || 'Nothing to show'} minHeight={160} /> }}
      sx={{ ...gridSx, border: 0, borderRadius: 0, boxShadow: 'none', minHeight: 220 }}
      {...props}
    />
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Period + report */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <TextField type="date" label="From" value={dateFilter.start} onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} />
        <TextField type="date" label="To" value={dateFilter.end} onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} />
        {(dateFilter.start || dateFilter.end) && (
          <Button variant="text" startIcon={<FilterAltOffOutlined sx={{ fontSize: 16 }} />} onClick={() => setDateFilter({ start: '', end: '' })} sx={{ color: 'var(--text-secondary)' }}>Clear</Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" startIcon={<EmailOutlined sx={{ fontSize: 16 }} />} onClick={() => setShowEmailDialog(true)}>Email report</Button>
      </Box>

      {/* KPIs */}
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, minmax(0, 1fr))' } }}>
        <StatCard label="Records" value={stats.totalTransactions} hint="In the selected period" />
        <StatCard label="Issues highlighted" value={stats.totalIssuesHighlighted} hint={`${stats.issueDensity} per record`} />
        <StatCard label="Closed" value={stats.closed} hint={`${stats.resolutionRate}% resolution rate`} />
        <StatCard label="Open" value={stats.open} hint="Need attention" />
        <StatCard label="Issues per day" value={stats.avgDailyIssues} hint="Daily average" />
      </Box>

      {/* Process speed */}
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
        <Tooltip title="(Dispatched − Reported), or (Now − Reported) while undispatched.">
          <Box sx={{ height: '100%' }}><StatCard sx={{ height: '100%' }} label="Supervisor dispatch speed" value={days(stats.avgDispatchTime)} hint="Reported → dispatched (incl. aging)" /></Box>
        </Tooltip>
        <Tooltip title="Resolved cases use (Resolved − Dispatched); pending cases use (Now − Reported).">
          <Box sx={{ height: '100%' }}><StatCard sx={{ height: '100%' }} label="Field resolution speed" value={days(stats.avgResolutionTime)} hint="Dispatched → resolved (incl. aging)" /></Box>
        </Tooltip>
        <Tooltip title="From the report date to closure, or to now while open.">
          <Box sx={{ height: '100%' }}><StatCard sx={{ height: '100%' }} label="Total lifecycle" value={days(stats.avgLifecycleTime)} hint="Reported → closed / now" /></Box>
        </Tooltip>
      </Box>

      <SectionCard title="Supervisor performance" description="Aging impact and workload. Click a count to see those records." actions={<Badge>{supervisorStats.length} supervisor{supervisorStats.length === 1 ? '' : 's'}</Badge>} padding={0} bodySx={{ p: 0 }}>
        {grid({ rows: supervisorStats, columns: supervisorColumns, getRowId: (r) => r.name, initialState: { sorting: { sortModel: [{ field: 'total', sort: 'desc' }] } }, empty: 'No supervisors in this period' })}
      </SectionCard>

      <SectionCard
        title="Open cases"
        description="Dispatched and awaiting dispatch, oldest first."
        padding={0}
        bodySx={{ p: 0 }}
        actions={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <TextField select value={negligenceSupervisorFilter} onChange={(e) => setNegligenceSupervisorFilter(e.target.value)} sx={{ width: 180 }} slotProps={{ htmlInput: { 'aria-label': 'Supervisor' } }}>
              <MenuItem value="all">All supervisors</MenuItem>
              {supervisorsOfPending.map((sup) => <MenuItem key={sup} value={sup}>{sup}</MenuItem>)}
            </TextField>
            <TextField placeholder="Search SLID or technician…" value={negligenceSearch} onChange={(e) => setNegligenceSearch(e.target.value)} sx={{ width: { xs: '100%', sm: 220 } }} slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: 17, color: 'var(--text-muted)', mr: 0.75 }} /> } }} />
          </Box>
        }
      >
        {grid({ rows: pendingRows, columns: pendingColumns, getRowId: (r) => r.originalIssue._id, onRowClick: ({ row }) => handleViewIssue(row.originalIssue), initialState: { sorting: { sortModel: [{ field: 'age', sort: 'desc' }] } }, empty: 'All caught up — no open cases' })}
      </SectionCard>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' } }}>
        {chartCard(
          'Reporting trend',
          <Box sx={{ height: 300 }}><Bar data={trendData} options={commonOptions} /></Box>,
          <>
            <SegmentedControl size="sm" ariaLabel="Trend period" value={trendTimeframe} onChange={setTrendTimeframe} options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
            <SegmentedControl size="sm" ariaLabel="Chart type" value={trendChartType} onChange={setTrendChartType} options={[{ value: 'mixed', label: 'Mixed' }, { value: 'bar', label: 'Bar' }, { value: 'line', label: 'Line' }]} />
          </>
        )}
        {chartCard('Resolution status', <Box sx={{ height: 300, position: 'relative', display: 'flex', justifyContent: 'center' }}><Doughnut data={statusData} options={doughnutOptions} />{donutCenter(`${stats.resolutionRate}%`, 'Resolved')}</Box>)}
      </Box>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {chartCard('Top reporters', <Box sx={{ height: 300 }}><Bar data={reporterData} options={commonOptions} /></Box>)}
        {chartCard('Issue categories', <Box sx={{ height: 300, position: 'relative', display: 'flex', justifyContent: 'center' }}><Doughnut data={categoryData} options={doughnutOptions} />{donutCenter(categoryData.totalCount, 'Issues')}</Box>)}
        {chartCard('Teams involved (top 10)', <Box sx={{ height: 300 }}><Bar data={installingTeamChartData} options={commonOptions} /></Box>)}
        {chartCard('Issues by source', <Box sx={{ height: 300 }}><Bar data={teamData} options={commonOptions} /></Box>)}
      </Box>

      <SectionCard
        title="Team ranking"
        description="Every team involved in reporting, installation or resolution. Click a team for its dashboard."
        padding={0}
        bodySx={{ p: 0 }}
        actions={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <TextField placeholder="Search team or category…" value={leaderboardSearch} onChange={(e) => setLeaderboardSearch(e.target.value)} sx={{ width: { xs: '100%', sm: 220 } }} slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: 17, color: 'var(--text-muted)', mr: 0.75 }} /> } }} />
            <TextField select value={leaderboardStatusFilter} onChange={(e) => setLeaderboardStatusFilter(e.target.value)} sx={{ width: 150 }} slotProps={{ htmlInput: { 'aria-label': 'Status' } }}>
              <MenuItem value="all">All teams</MenuItem>
              <MenuItem value="resolved">Has resolved</MenuItem>
              <MenuItem value="active">Has active</MenuItem>
            </TextField>
            <Button variant="outlined" startIcon={<FileDownloadOutlined sx={{ fontSize: 16 }} />} onClick={handleExportLeaderboard}>Export</Button>
          </Box>
        }
      >
        {grid({ rows: teamNameStats, columns: leaderboardColumns, getRowId: (r) => r.name, onRowClick: ({ row }) => setSelectedTeam(row), initialState: { sorting: { sortModel: [{ field: 'total', sort: 'desc' }] } }, empty: 'No teams match' })}
      </SectionCard>

      {/* Team drill-down */}
      <AppDialog
        open={Boolean(selectedTeam)}
        onClose={() => setSelectedTeam(null)}
        size="xl"
        title={selectedTeam?.name || ''}
        description={selectedTeam ? `${selectedTeam.type || 'Team'} dashboard` : ''}
        extraActions={<Button variant="outlined" startIcon={<FileDownloadOutlined sx={{ fontSize: 16 }} />} onClick={exportTeam}>Export records</Button>}
        actions={<Button variant="outlined" onClick={() => setSelectedTeam(null)}>Close</Button>}
      >
        {selectedTeam && (
          <>
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' }, mb: 2 }}>
              <StatCard label="Involved" value={selectedTeam.total} />
              <StatCard label="Resolved" value={selectedTeam.resolved} />
              <StatCard label="Success rate" value={`${selectedTeam.rate}%`} />
              <StatCard label="Avg dispatch" value={selectedTeam.avgDispatchSpeed || '—'} />
              <StatCard label="Avg resolution" value={selectedTeam.avgResolutionSpeed || '—'} />
              <StatCard label="Avg lifecycle" value={selectedTeam.avgLifecycleTime || '—'} />
              <StatCard label="Top category" value={<Typography component="span" dir="auto" sx={{ fontSize: 15, fontWeight: 600 }}>{selectedTeam.topCategory || '—'}</Typography>} />
              <StatCard label="Top sub-category" value={<Typography component="span" dir="auto" sx={{ fontSize: 15, fontWeight: 600 }}>{selectedTeam.topSubCategory || '—'}</Typography>} />
            </Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>Issue history <Box component="span" sx={{ color: 'var(--text-muted)', fontWeight: 400 }}>· click a row for details</Box></Typography>
            <DataGrid
              rows={selectedTeam.relatedIssues}
              columns={teamIssueColumns}
              getRowId={(r) => r._id}
              onRowClick={({ row }) => handleViewIssue(row)}
              autoHeight
              disableRowSelectionOnClick
              rowHeight={44}
              columnHeaderHeight={38}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } }, sorting: { sortModel: [{ field: 'date', sort: 'desc' }] } }}
              sx={{ ...gridSx, minHeight: 220 }}
            />
          </>
        )}
      </AppDialog>

      <ViewIssueDetailsDialog open={isIssueViewOpen} onClose={() => setIsIssueViewOpen(false)} issue={selectedDetailedIssue} onUpdate={handleIssueUpdate} />
      <ReportedIssueCardDialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} teamIssues={reportDialogIssues} teamName={reportDialogTitle} />
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
          companyStats: teamNameStats.reduce((acc, team) => {
            acc[team.name] = team.total;
            return acc;
          }, {})
        }}
      />
    </Box>
  );
};

export default CustomerIssuesAnalytics;
