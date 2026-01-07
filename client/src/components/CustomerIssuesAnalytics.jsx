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
} from '@mui/material';
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
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { FaCheckCircle, FaExclamationCircle, FaClipboardList, FaChartLine, FaFilter, FaSearch, FaTimes, FaCalendarAlt, FaUserTie, FaFileExcel } from 'react-icons/fa';
import { utils, writeFile } from 'xlsx';
import ViewIssueDetailsDialog from './ViewIssueDetailsDialog';

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

  const handleViewIssue = (issue) => {
    setSelectedDetailedIssue(issue);
    setIsIssueViewOpen(true);
  };

  // --- Statistics Calculation ---
  const stats = useMemo(() => {
    const totalTransactions = issues.length;
    let totalIssuesHighlighted = 0;
    const resolved = issues.filter(i => i.solved === 'yes').length;
    const unresolved = totalTransactions - resolved;
    const resolutionRate = totalTransactions > 0 ? ((resolved / totalTransactions) * 100).toFixed(1) : 0;

    issues.forEach(issue => {
      if (issue.issues && Array.isArray(issue.issues)) {
        totalIssuesHighlighted += issue.issues.length;
      } else if (issue.issueCategory) {
        totalIssuesHighlighted += 1;
      }
    });

    const issueDensity = totalTransactions > 0 ? (totalIssuesHighlighted / totalTransactions).toFixed(2) : 0;

    return { totalTransactions, totalIssuesHighlighted, resolved, unresolved, resolutionRate, issueDensity };
  }, [issues]);

  // --- Export Handlers ---
  const handleExportAllAssignees = () => {
    const data = assigneeStats.detailedList.map(stat => ({
      'Assignee Name': stat.name,
      'Total Issues': stat.total,
      'Resolved': stat.resolved,
      'Unresolved': stat.unresolved,
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
      'Status': issue.solved === 'yes' ? 'Resolved' : 'Unresolved',
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
    issues.forEach(issue => {
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
  }, [issues]);

  const subTeamData = useMemo(() => {
    const counts = {};
    issues.forEach(issue => {
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
  }, [issues]);

  const installingTeamChartData = useMemo(() => {
    const counts = {};
    issues.forEach(issue => {
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
  }, [issues]);

  const categoryData = useMemo(() => {
    const counts = {};
    issues.forEach(issue => {
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
  }, [issues]);

  const statusData = useMemo(() => ({
    labels: ['Resolved', 'Unresolved'],
    datasets: [{
      data: [stats.resolved, stats.unresolved],
      backgroundColor: ['#4caf50', '#f44336'],
      borderWidth: 0,
    }],
  }), [stats]);

  const closureData = useMemo(() => {
    const counts = {};
    issues.forEach(issue => {
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
  }, [issues]);

  const assigneeStats = useMemo(() => {
    const statsMap = {};
    issues.forEach(issue => {
      const assignee = issue.assignedTo || 'Unassigned';
      if (!statsMap[assignee]) {
        statsMap[assignee] = { total: 0, resolved: 0, unresolved: 0, categories: {}, subCategories: {} };
      }
      statsMap[assignee].total += 1;
      issue.solved === 'yes' ? statsMap[assignee].resolved += 1 : statsMap[assignee].unresolved += 1;
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
      return {
        name,
        ...statsMap[name],
        topCategory: topCat,
        topSubCategory: topSub,
        rate: ((statsMap[name].resolved / statsMap[name].total) * 100).toFixed(1),
        relatedIssues: issues.filter(i => (i.assignedTo || 'Unassigned') === name),
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
    if (filters.category !== 'all') {
      detailedList = detailedList.filter(item => item.categories[filters.category] > 0);
    }
    if (filters.minIssues > 0) {
      detailedList = detailedList.filter(item => item.total >= filters.minIssues);
    }
    detailedList.sort((a, b) => {
      let valA = a[assigneeSort.field], valB = b[assigneeSort.field];
      if (assigneeSort.field === 'rate') { valA = parseFloat(valA); valB = parseFloat(valB); }
      return assigneeSort.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    return {
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
  }, [issues, assigneeSearch, assigneeSort, filters]);

  const installingTeamStats = useMemo(() => {
    const statsMap = {};
    issues.forEach(issue => {
      const team = issue.installingTeam || 'Unknown';
      if (!statsMap[team]) {
        statsMap[team] = { total: 0, resolved: 0, unresolved: 0, categories: {} };
      }
      statsMap[team].total += 1;
      issue.solved === 'yes' ? statsMap[team].resolved += 1 : statsMap[team].unresolved += 1;
      if (issue.issues) {
        issue.issues.forEach(i => {
          if (i.category) statsMap[team].categories[i.category] = (statsMap[team].categories[i.category] || 0) + 1;
        });
      }
    });

    let detailedList = Object.keys(statsMap).map(name => {
      const topCat = Object.entries(statsMap[name].categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
      return {
        name,
        ...statsMap[name],
        topCategory: topCat,
        rate: ((statsMap[name].resolved / statsMap[name].total) * 100).toFixed(1),
        relatedIssues: issues.filter(i => (i.installingTeam || 'Unknown') === name),
        type: 'Installing Team'
      };
    });

    if (installingTeamSearch.trim()) {
      detailedList = detailedList.filter(item => item.name.toLowerCase().includes(installingTeamSearch.toLowerCase()));
    }
    if (installingTeamFilters.status !== 'all') {
      detailedList = detailedList.filter(item => installingTeamFilters.status === 'resolved' ? item.resolved > 0 : item.unresolved > 0);
    }
    if (installingTeamFilters.minIssues > 0) {
      detailedList = detailedList.filter(item => item.total >= installingTeamFilters.minIssues);
    }
    detailedList.sort((a, b) => {
      let valA = a[installingTeamSort.field], valB = b[installingTeamSort.field];
      return installingTeamSort.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    return detailedList;
  }, [issues, installingTeamSearch, installingTeamSort, installingTeamFilters]);

  const reporterData = useMemo(() => {
    const counts = {};
    issues.forEach(issue => {
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
  }, [issues]);

  const trendData = useMemo(() => {
    const countsByDate = {};
    const sortedIssues = [...issues].sort((a, b) => new Date(a.date) - new Date(b.date));
    sortedIssues.forEach(issue => {
      const d = issue.date ? new Date(issue.date).toISOString().split('T')[0] : 'Unknown';
      countsByDate[d] = (countsByDate[d] || 0) + 1;
    });
    return {
      labels: Object.keys(countsByDate),
      datasets: [{
        label: 'Daily Reported Issues',
        data: Object.values(countsByDate),
        fill: true,
        backgroundColor: 'rgba(123, 104, 238, 0.2)',
        borderColor: 'rgba(123, 104, 238, 1)',
        tension: 0.4
      }]
    };
  }, [issues]);

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { color: '#ffffff' } } },
    scales: {
      x: { ticks: { color: '#b3b3b3' }, grid: { color: '#3d3d3d' } },
      y: { ticks: { color: '#b3b3b3' }, grid: { color: '#3d3d3d' } }
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

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      {/* KPI Section */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={6} md={2.4}><StatCard title="Total Transactions" value={stats.totalTransactions} icon={<FaClipboardList />} color="#2196f3" subtext="Total records" /></Grid>
        <Grid item xs={12} sm={6} md={2.4}><StatCard title="Issues Highlighted" value={stats.totalIssuesHighlighted} icon={<FaExclamationCircle />} color="#ffc107" subtext={`Avg: ${stats.issueDensity} per txn`} /></Grid>
        <Grid item xs={12} sm={6} md={2.4}><StatCard title="Resolved" value={stats.resolved} icon={<FaCheckCircle />} color="#4caf50" subtext={`${stats.resolutionRate}% Rate`} /></Grid>
        <Grid item xs={12} sm={6} md={2.4}><StatCard title="Unresolved" value={stats.unresolved} icon={<FaExclamationCircle />} color="#f44336" subtext="Require attention" /></Grid>
        <Grid item xs={12} sm={6} md={2.4}><StatCard title="Avg. Daily Issues" value={(stats.totalTransactions / (trendData.labels.length || 1)).toFixed(1)} icon={<FaChartLine />} color="#ff9800" subtext="Trend metric" /></Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Trend & Resolution Row */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d' }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">Issue Reporting Trend</Typography>
            <Box sx={{ height: 300 }}><Line data={trendData} options={commonOptions} /></Box>
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
          <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d' }}>
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

        {/* Team Charts Row */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d' }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">Issues by From (Main)</Typography>
            <Box sx={{ height: 300 }}><Bar data={teamData} options={commonOptions} /></Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d' }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">Installing Team Distribution</Typography>
            <Box sx={{ height: 300 }}><Bar data={installingTeamChartData} options={commonOptions} /></Box>
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
                    <MenuItem value="resolved">Resolved Only</MenuItem>
                    <MenuItem value="unresolved">Unresolved Only</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  variant="outlined"
                  startIcon={<FaFileExcel />}
                  onClick={() => {
                    const data = issues.map(i => ({
                      'Date': new Date(i.date).toLocaleDateString(),
                      'SLID': i.slid,
                      'Category': i.issues?.[0]?.category || 'N/A',
                      'Assignee': i.assignedTo || 'Unassigned',
                      'Installing Team': i.installingTeam || 'N/A',
                      'Reporter': i.reporter,
                      'Status': i.solved === 'yes' ? 'Resolved' : 'Unresolved'
                    }));
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
                    <th style={{ padding: '0 12px' }}>Date</th>
                    <th style={{ padding: '0 12px' }}>SLID</th>
                    <th style={{ padding: '0 12px' }}>Assignee</th>
                    <th style={{ padding: '0 12px' }}>Installing Team</th>
                    <th style={{ padding: '0 12px' }}>Primary Issue</th>
                    <th style={{ padding: '0 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {issues
                    .filter(i => {
                      const term = assigneeSearch.toLowerCase();
                      const matchSearch = i.slid.toLowerCase().includes(term) ||
                        (i.assignedTo && i.assignedTo.toLowerCase().includes(term)) ||
                        (i.installingTeam && i.installingTeam.toLowerCase().includes(term));
                      const matchStatus = filters.status === 'all' || (filters.status === 'resolved' ? i.solved === 'yes' : i.solved === 'no');
                      return matchSearch && matchStatus;
                    })
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((issue, idx) => (
                      <tr
                        key={idx}
                        onClick={() => handleViewIssue(issue)}
                        style={{ backgroundColor: '#1e1e1e', fontSize: '0.9rem', cursor: 'pointer' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#252525'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1e1e1e'}
                      >
                        <td style={{ padding: '12px', borderRadius: '8px 0 0 8px', color: '#b3b3b3' }}>{new Date(issue.date).toLocaleDateString()}</td>
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
                          <Chip
                            label={issue.solved === 'yes' ? 'Resolved' : 'Active'}
                            size="small"
                            sx={{
                              bgcolor: issue.solved === 'yes' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                              color: issue.solved === 'yes' ? '#4caf50' : '#f44336'
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </Box>
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
              <IconButton onClick={() => setSelectedTeam(null)} sx={{ color: '#f44336' }}><FaTimes /></IconButton>
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
                    <Typography variant="caption" color="#b3b3b3">Top Category</Typography>
                    <Typography variant="body1" fontWeight="bold" sx={{ color: '#ff9933' }}>{selectedTeam.topCategory}</Typography>
                  </Box>
                </Grid>
              </Grid>

              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, mt: 4 }}>Recent Issue History (Click to view full details)</Typography>
              <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#b3b3b3', borderBottom: '1px solid #333' }}>
                      <th style={{ padding: '12px' }}>Date</th>
                      <th style={{ padding: '12px' }}>SLID</th>
                      <th style={{ padding: '12px' }}>Category</th>
                      <th style={{ padding: '12px' }}>Sub-category</th>
                      <th style={{ padding: '12px' }}>Status</th>
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
                        <td style={{ padding: '12px' }}>{new Date(issue.date).toLocaleDateString()}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{issue.slid}</td>
                        <td style={{ padding: '12px' }}>{issue.issues?.[0]?.category || 'N/A'}</td>
                        <td style={{ padding: '12px' }}>{issue.issues?.[0]?.subCategory || '-'}</td>
                        <td style={{ padding: '12px' }}>
                          <Chip label={issue.solved === 'yes' ? 'Success' : 'Active'} size="small" sx={{ bgcolor: issue.solved === 'yes' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 193, 7, 0.1)', color: issue.solved === 'yes' ? '#4caf50' : '#ffc107' }} />
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
    </Box>
  );
};

export default CustomerIssuesAnalytics;
