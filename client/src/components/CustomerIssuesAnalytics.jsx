import { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  useTheme,
  useMediaQuery,
  Paper,
  Stack
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
import { FaCheckCircle, FaExclamationCircle, FaClipboardList, FaChartLine } from 'react-icons/fa';

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

  // --- Chart Data Preparation ---

  // 1. Issues by Team (Bar Chart)
  const teamData = useMemo(() => {
    const counts = {};
    issues.forEach(issue => {
      const team = issue.from || 'Unknown';
      counts[team] = (counts[team] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const data = Object.values(counts);

    return {
      labels,
      datasets: [
        {
          label: 'Issues Reported',
          data,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [issues]);

  // 2. Issues by Category (Doughnut Chart)
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

    // Sort by count desc and limit to top 5 + Others
    const sortedCategories = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    let finalLabels = [];
    let finalData = [];

    if (sortedCategories.length > 6) {
      const top5 = sortedCategories.slice(0, 5);
      const othersCount = sortedCategories.slice(5).reduce((acc, curr) => acc + curr[1], 0);

      finalLabels = top5.map(i => i[0]);
      finalData = top5.map(i => i[1]);

      finalLabels.push('Others');
      finalData.push(othersCount);
    } else {
      finalLabels = sortedCategories.map(i => i[0]);
      finalData = sortedCategories.map(i => i[1]);
    }

    const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

    return {
      labels: finalLabels,
      datasets: [
        {
          data: finalData,
          backgroundColor: [
            '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796'
          ],
          hoverBackgroundColor: [
            '#2e59d9', '#17a673', '#2c9faf', '#dda20a', '#be2617', '#60616f'
          ],
          borderWidth: 1,
        },
      ],
      totalCount
    };
  }, [issues]);

  // 3. Resolution Status (Doughnut Chart)
  const statusData = useMemo(() => {
    return {
      labels: ['Resolved', 'Unresolved'],
      datasets: [
        {
          data: [stats.resolved, stats.unresolved],
          backgroundColor: ['#4caf50', '#f44336'], // Green for Resolved, Red for Unresolved
          borderWidth: 0,
        },
      ],
    };
  }, [stats]);

  // 4. Closures by Person (Horizontal Bar Chart)
  const closureData = useMemo(() => {
    const counts = {};
    issues.forEach(issue => {
      if (issue.solved === 'yes' && issue.closedBy) {
        counts[issue.closedBy] = (counts[issue.closedBy] || 0) + 1;
      }
    });

    const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const data = labels.map(label => counts[label]);

    return {
      labels,
      datasets: [
        {
          label: 'Issues Closed',
          data,
          backgroundColor: 'rgba(76, 175, 80, 0.6)',
          borderColor: 'rgba(76, 175, 80, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [issues]);

  // 5. Issues by Assignee (Bar Chart)
  const assigneeData = useMemo(() => {
    const counts = {};
    issues.forEach(issue => {
      const assignee = issue.assignedTo || 'Unassigned';
      counts[assignee] = (counts[assignee] || 0) + 1;
    });

    const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 10);
    const data = labels.map(label => counts[label]);

    return {
      labels,
      datasets: [
        {
          label: 'Issues Assigned',
          data,
          backgroundColor: 'rgba(78, 115, 223, 0.6)',
          borderColor: 'rgba(78, 115, 223, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [issues]);

  // 6. Issues by Reporter (Bar Chart)
  const reporterData = useMemo(() => {
    const counts = {};
    issues.forEach(issue => {
      const reporter = issue.reporter || 'Unknown';
      counts[reporter] = (counts[reporter] || 0) + 1;
    });

    const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 10);
    const data = labels.map(label => counts[label]);

    return {
      labels,
      datasets: [
        {
          label: 'Issues Reported',
          data,
          backgroundColor: 'rgba(54, 185, 204, 0.6)',
          borderColor: 'rgba(54, 185, 204, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [issues]);


  // 4. Trend Analysis (Line Chart - Issues over time)
  const trendData = useMemo(() => {
    // Group by Date (YYYY-MM-DD)
    const countsByDate = {};

    // Sort issues by date
    const sortedIssues = [...issues].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Get date range (last 30 days if many data points, or all if small) - for simple view we show all
    sortedIssues.forEach(issue => {
      // Using simplified date string for grouping
      const d = issue.date ? new Date(issue.date).toISOString().split('T')[0] : 'Unknown';
      countsByDate[d] = (countsByDate[d] || 0) + 1;
    });

    const labels = Object.keys(countsByDate);
    const data = Object.values(countsByDate);

    return {
      labels,
      datasets: [
        {
          label: 'Daily Reported Issues',
          data,
          fill: true,
          backgroundColor: 'rgba(123, 104, 238, 0.2)', // Purple tint
          borderColor: 'rgba(123, 104, 238, 1)',
          tension: 0.4, // Smooth curve
        },
      ],
    };
  }, [issues]);

  // --- Chart Options ---
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#ffffff' }
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        ticks: { color: '#b3b3b3' },
        grid: { color: '#3d3d3d' }
      },
      y: {
        ticks: { color: '#b3b3b3' },
        grid: { color: '#3d3d3d' }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#b3b3b3',
          usePointStyle: true,
          padding: 20,
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: '#1a1a1a',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#3d3d3d',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return ` ${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };


  // --- Helper Components ---
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
      {/* KPI Cards */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Total Transactions"
            value={stats.totalTransactions}
            icon={<FaClipboardList />}
            color="#2196f3"
            subtext="Total records"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Issues Highlighted"
            value={stats.totalIssuesHighlighted}
            icon={<FaExclamationCircle />}
            color="#ffc107"
            subtext={`Avg: ${stats.issueDensity} per txn`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Resolved"
            value={stats.resolved}
            icon={<FaCheckCircle />}
            color="#4caf50"
            subtext={`${stats.resolutionRate}% Rate`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Unresolved"
            value={stats.unresolved}
            icon={<FaExclamationCircle />}
            color="#f44336"
            subtext="Require attention"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Avg. Daily Issues"
            value={(stats.totalTransactions / (Object.keys(trendData.labels || {}).length || 1)).toFixed(1)}
            icon={<FaChartLine />}
            color="#ff9800"
            subtext="Trend metric"
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Trend Analysis */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d' }}>
            <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>Issue Reporting Trend</Typography>
            <Box sx={{ height: 300 }}>
              <Line data={trendData} options={{ ...commonOptions, plugins: { ...commonOptions.plugins, legend: { display: false } } }} />
            </Box>
          </Paper>
        </Grid>

        {/* Resolution Status */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d', height: '100%' }}>
            <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>Resolution Status</Typography>
            <Box sx={{ height: 260, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Doughnut data={statusData} options={doughnutOptions} />
              <Box sx={{ position: 'absolute', textAlign: 'center', top: '48%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#1cc88a' }}>{stats.resolutionRate}%</Typography>
                <Typography variant="caption" color="#b3b3b3">Resolved</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Issues by Reporter */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d' }}>
            <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>Top Reporters</Typography>
            <Box sx={{ height: 300 }}>
              <Bar data={reporterData} options={commonOptions} />
            </Box>
          </Paper>
        </Grid>

        {/* Issues by Team */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d' }}>
            <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>Issues by From Team</Typography>
            <Box sx={{ height: 300 }}>
              <Bar data={teamData} options={commonOptions} />
            </Box>
          </Paper>
        </Grid>

        {/* Issues by Category */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d' }}>
            <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>Issue Breakdown (Categories)</Typography>
            <Box sx={{ height: 260, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Doughnut data={categoryData} options={doughnutOptions} />
              <Box sx={{ position: 'absolute', textAlign: 'center', top: '48%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: '#4e73df' }}>{categoryData.totalCount}</Typography>
                <Typography variant="caption" color="#b3b3b3">Total Issues</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Closures by Supervisor */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d' }}>
            <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>Quality Supervisor</Typography>
            <Box sx={{ height: 350 }}>
              <Bar
                data={closureData}
                options={{
                  ...commonOptions,
                  indexAxis: 'y',
                  plugins: { ...commonOptions.plugins, legend: { display: false } }
                }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Issues by Assignee */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, border: '1px solid #3d3d3d' }}>
            <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>Top Assignees Distribution</Typography>
            <Box sx={{ height: 350 }}>
              <Bar data={assigneeData} options={commonOptions} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CustomerIssuesAnalytics;
