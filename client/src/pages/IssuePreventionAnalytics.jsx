import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Container,
  Breadcrumbs,
  Link,
  Grid,
  Card as MuiCard,
  CardContent,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Button,
  TablePagination,
  TextField,
  FormControl,
  Select,
  MenuItem,
  useMediaQuery,
  TableHead,
} from "@mui/material";
import {
  NavigateNext as NavigateNextIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  ErrorOutline as ErrorIcon,
  VerifiedUser as VerifiedIcon,
  ContentPaste as ReportIcon,
  Visibility as VisibilityIcon,
  CompareArrows as CompareIcon,
  TrendingDown as TrendingDownIcon,
  Explore,
  Search as SearchIcon,
} from "@mui/icons-material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import api from "../api/api";
import { MoonLoader } from "react-spinners";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { TaskDetailsDialog } from "../components/TaskDetailsDialog";
import ManagementEmailDialog from "../components/ManagementEmailDialog";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Email as EmailIconUI, FilterList as FilterIcon } from "@mui/icons-material";

const IssuePreventionAnalytics = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedComparison, setSelectedComparison] = useState(null);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  const [negligencePage, setNegligencePage] = useState(0);
  const [negligenceRowsPerPage, setNegligenceRowsPerPage] = useState(5);
  const [negligenceSearch, setNegligenceSearch] = useState('');
  const [negligenceSupervisorFilter, setNegligenceSupervisorFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({
    start: moment().startOf('month').toDate(),
    end: moment().endOf('day').toDate()
  });
  const fetchStats = async (startArg, endArg) => {
    setLoading(true);
    try {
      const params = {};
      const start = startArg !== undefined ? startArg : dateFilter.start;
      const end = endArg !== undefined ? endArg : dateFilter.end;

      if (start) params.startDate = start;
      if (end) params.endDate = end;

      const response = await api.get("/tasks/prevention-stats", {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        params
      });
      setData(response.data);
    } catch (error) {
      console.error("Error fetching prevention stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);
  // ... (skipping unchanged code) ...

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <MoonLoader color={theme.palette.primary.main} size={50} />
      </Box>
    );
  }

  // Prepare data for the pie chart
  const pieData = data?.sourceBreakdown
    ? Object.entries(data.sourceBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  // Prepare data for Reporter chart
  const reporterData = data?.reporterStats
    ? Object.entries(data.reporterStats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
    : [];

  // Prepare Trend Data
  const trendChartData = data?.trendData
    ? Object.entries(data.trendData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => moment(a.name, "MMM YYYY").toDate() - moment(b.name, "MMM YYYY").toDate())
    : [];

  // Prepare Reason Data
  const reasonChartData = data?.reasonStats
    ? Object.entries(data.reasonStats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
    : [];

  // Prepare Company Data
  const companyChartData = data?.companyStats
    ? Object.entries(data.companyStats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
    : [];

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF"];

  const columns = [
    {
      field: "slid",
      headerName: "SLID",
      width: 120,
      valueGetter: (value, row) => row.task.slid,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: "reportedDate",
      headerName: "First Reported",
      width: 150,
      valueGetter: (value, row) => moment(row.reports[0].date || row.reports[0].createdAt).format("MMM DD, YYYY"),
    },
    {
      field: "interviewDate",
      headerName: "Interview Date",
      width: 150,
      valueGetter: (value, row) => moment(row.task.interviewDate).format("MMM DD, YYYY"),
    },
    {
      field: "dispatched",
      headerName: "Dispatched",
      width: 100,
      valueGetter: (value, row) => row.reports[0]?.dispatched === 'yes' ? 'Yes' : 'No',
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'Yes' ? "success" : "default"}
          variant="outlined"
        />
      )
    },
    {
      field: "resolveDate",
      headerName: "Resolved Date",
      width: 150,
      valueGetter: (value, row) => row.reports[0]?.resolveDate ? moment(row.reports[0].resolveDate).format("MMM DD, YYYY") : "-",
    },
    {
      field: "closedAt",
      headerName: "Closed Date",
      width: 150,
      valueGetter: (value, row) => row.reports[0]?.closedAt ? moment(row.reports[0].closedAt).format("MMM DD, YYYY") : "-",
    },
    {
      field: "score",
      headerName: "Final Score",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.row.task.evaluationScore}
          size="small"
          sx={{
            backgroundColor: params.row.task.evaluationScore <= 4 ? "#d32f2f" : "#ed6c02",
            color: "white",
            fontWeight: "bold"
          }}
        />
      )
    },
    {
      field: "reports",
      headerName: "Prior Reports",
      width: 120,
      valueGetter: (value, row) => row.reports.length,
    },
    {
      field: "sourceMain",
      headerName: "From (Main)",
      width: 150,
      valueGetter: (value, row) => row.reports[0]?.fromMain || "N/A",
    },
    {
      field: "sourceSub",
      headerName: "From (Sub)",
      width: 150,
      valueGetter: (value, row) => row.reports[0]?.fromSub || "N/A",
    },
    {
      field: "reason",
      headerName: "Reason",
      width: 150,
      valueGetter: (value, row) => row.task.reason || "N/A",
    },
    {
      field: "rootCause",
      headerName: "Root Cause",
      width: 200,
      valueGetter: (value, row) => row.task.rootCause || "N/A",
    },
    {
      field: "subReason",
      headerName: "Sub Reason",
      width: 150,
      valueGetter: (value, row) => row.task.subReason || "N/A",
    },
    {
      field: "comparison",
      headerName: "Feedback Comparison",
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="View Detailed Comparison">
          <IconButton
            size="small"
            onClick={() => {
              setSelectedComparison(params.row);
              setShowComparisonDialog(true);
            }}
            sx={{ color: theme.palette.warning.main }}
          >
            <CompareIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )
    },
    {
      field: "preventionGap",
      headerName: "Prevention Gap",
      width: 140,
      valueGetter: (value, row) => {
        const reportDate = moment(row.reports[0].date || row.reports[0].createdAt).startOf('day');
        const interviewDate = moment(row.task.interviewDate).startOf('day');
        return Math.abs(interviewDate.diff(reportDate, 'days'));
      },
      renderCell: (params) => (
        <Chip
          icon={<TrendingDownIcon />}
          label={`${params.value} days`}
          size="small"
          sx={{
            backgroundColor: params.value > 7 ? "#d32f2f" : params.value > 3 ? "#ed6c02" : "#4caf50",
            color: "white",
            fontWeight: "bold"
          }}
        />
      )
    },
    {
      field: "actions",
      headerName: "View",
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="View Task Details">
          <IconButton onClick={() => {
            // Inject report details into task for viewing
            const enrichedTask = {
              ...params.row.task,
              relatedIssues: params.row.reports
            };
            setSelectedTask(enrichedTask);
            setShowTaskDialog(true);
          }}>
            <VisibilityIcon fontSize="small" sx={{ color: "grey.400" }} />
          </IconButton>
        </Tooltip>
      )
    }
  ];

  const StatCard = ({ title, value, icon, color, description, subStats }) => (
    <MuiCard sx={{ height: '100%', borderRadius: 3, bgcolor: alpha(color, 0.05), border: `1px solid ${alpha(color, 0.2)}` }} elevation={0}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {title}
                </Typography>
                {description && (
                  <Tooltip title={description} arrow>
                    <IconButton size="small" sx={{ mb: 0.5 }}>
                      <FilterIcon sx={{ fontSize: 14, color: 'grey.500' }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
              <Typography variant="h4" fontWeight="800" sx={{ color: color }}>
                {value}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>
              {icon}
            </Avatar>
          </Stack>

          {subStats && subStats.length > 0 && (
            <Box>
              <Divider sx={{ mb: 1, opacity: 0.05 }} />
              <Stack spacing={0.5}>
                {subStats.map((stat, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.68rem' }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                      {stat.value} ({stat.percentage}%)
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </CardContent>
    </MuiCard>
  );

  return (
    <Box sx={{ pt: 3, pb: 6, px: 2 }}>
      {/* Header */}
      <Box mb={4}>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 1 }}>
          <Link underline="hover" color="inherit" href="/" sx={{ display: 'flex', alignItems: 'center' }}>
            Home
          </Link>
          <Typography color="text.primary">Analytics</Typography>
          <Typography color="text.primary" sx={{ fontWeight: 'bold' }}>Issue Prevention</Typography>
        </Breadcrumbs>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Avatar sx={{ bgcolor: theme.palette.success.main, width: 56, height: 56 }}>
            <VerifiedIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" fontWeight="800" color="text.primary">
              Issue Prevention Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cross-referencing reported issues with subsequent Detractor/Neutral outcomes to improve service delivery.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<EmailIconUI />}
            onClick={() => setShowEmailDialog(true)}
            sx={{
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 'bold',
              px: 3,
              height: 48,
              boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
              '&:hover': {
                boxShadow: `0 12px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
              }
            }}
          >
            Generate Report
          </Button>
        </Stack>

        {/* Date Filters */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 4,
            mt: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
            borderRadius: 2
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <Typography variant="body2" fontWeight="bold" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon fontSize="small" /> Filter Period:
            </Typography>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={dateFilter.start}
                onChange={(newValue) => setDateFilter(prev => ({ ...prev, start: newValue }))}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: { bgcolor: 'background.paper', width: 200 }
                  }
                }}
              />
              <Typography color="text.secondary">-</Typography>
              <DatePicker
                label="End Date"
                value={dateFilter.end}
                onChange={(newValue) => setDateFilter(prev => ({ ...prev, end: newValue }))}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: { bgcolor: 'background.paper', width: 200 }
                  }
                }}
              />
            </LocalizationProvider>

            <Button
              variant="contained"
              size="small"
              onClick={() => fetchStats()}
              disabled={loading}
              sx={{ height: 40, px: 3 }}
            >
              Apply Filter
            </Button>

            {(dateFilter.start || dateFilter.end) && (
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setDateFilter({ start: null, end: null });
                  fetchStats(null, null);
                }}
                sx={{ height: 40 }}
              >
                Clear
              </Button>
            )}
          </Stack>
        </Paper>
      </Box>

      {/* KPI Section */}
      <Grid container spacing={3} mb={5}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Tasks (Det/Neu)"
            value={data?.totalCriticalTasks}
            icon={<AssessmentIcon />}
            color={theme.palette.error.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Reported Overlaps"
            value={data?.reportedOverlapCount}
            icon={<ReportIcon />}
            color={theme.palette.warning.main}
            subStats={(() => {
              const stats = [];
              if (data?.overlapMainBreakdown) {
                // Get top categories if many, or all if few. Let's just show top 1 or 2.
                const mainEntries = Object.entries(data.overlapMainBreakdown).sort((a, b) => b[1] - a[1]);
                mainEntries.slice(0, 2).forEach(([label, val]) => {
                  stats.push({
                    label: `Main: ${label}`,
                    value: val,
                    percentage: data.reportedOverlapCount > 0 ? ((val / data.reportedOverlapCount) * 100).toFixed(0) : 0
                  });
                });
              }
              if (data?.overlapSubBreakdown) {
                const subEntries = Object.entries(data.overlapSubBreakdown).sort((a, b) => b[1] - a[1]);
                subEntries.slice(0, 2).forEach(([label, val]) => {
                  if (label && label !== 'null' && label !== 'undefined') {
                    stats.push({
                      label: `Sub: ${label}`,
                      value: val,
                      percentage: data.reportedOverlapCount > 0 ? ((val / data.reportedOverlapCount) * 100).toFixed(0) : 0
                    });
                  }
                });
              }
              return stats;
            })()}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Overlap Rate"
            value={`${data?.preventionRate}%`}
            icon={<TimelineIcon />}
            color={theme.palette.info.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Diagnosis Accuracy"
            value={`${data?.diagnosisAccuracy?.rate || 0}%`}
            icon={<VerifiedIcon />}
            color={theme.palette.success.main}
            description="Measures the alignment between the reasons reported by customers (Initial Category) and the finalized root causes identified after technical resolution."
          />
        </Grid>
      </Grid>

      {/* Process Efficiency Spotlight */}
      <Box mb={5}>
        <Typography variant="h6" fontWeight="700" mb={3}>
          Process Efficiency: Resolution vs. Closure
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', height: '100%', border: '1px solid #333' }}>
              <Typography variant="subtitle2" color="grey.500" mb={1}>FIELD RESOLUTION SPEED (Incl. Aging)</Typography>
              <Typography variant="h3" fontWeight="800" color="success.main">
                {data?.processEfficiency?.avgResolutionTime || 0}<span style={{ fontSize: '1rem', color: '#888' }}> days</span>
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
            <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', height: '100%', border: '1px solid #333' }}>
              <Typography variant="subtitle2" color="grey.500" mb={1}>SUPERVISOR DISPATCH SPEED (Incl. Aging)</Typography>
              <Typography variant="h3" fontWeight="800" color={Number(data?.processEfficiency?.avgDispatchTime) > 1 ? "warning.main" : "info.main"}>
                {data?.processEfficiency?.avgDispatchTime || 0}<span style={{ fontSize: '1rem', color: '#888' }}> days</span>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Avg time from <b>Reported</b> → <b>Dispatched</b> (Uses Now if pending)
              </Typography>
              <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, border: '1px dashed #444' }}>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#888', fontStyle: 'italic', lineHeight: 1.2 }}>
                  * Calculation: (Dispatched Date - Reported Date) OR (Now - Reported Date) if undispatched.
                </Typography>
              </Box>
              {Number(data?.processEfficiency?.avgClosureTime) > Number(data?.processEfficiency?.avgResolutionTime) && (
                <Chip label="Bottleneck detected" color="warning" size="small" sx={{ mt: 1, height: 20, fontSize: 10 }} />
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', height: '100%', border: '1px solid #333' }}>
              <Typography variant="subtitle2" color="grey.500" mb={1}>TOTAL LIFECYCLE (Accountability)</Typography>
              <Typography variant="h3" fontWeight="800" color="white">
                {data?.processEfficiency?.avgLifecycleTime || 0}<span style={{ fontSize: '1rem', color: '#888' }}> days</span>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Total time from <b>Initial Report</b> → <b>Final Closure/Now</b>
              </Typography>
              <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, border: '1px dashed #444' }}>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#888', fontStyle: 'italic', lineHeight: 1.2 }}>
                  * Calculation: Full duration from (Report Date) to (Closed Date) OR (Now) if the case is still open.
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Aging Bottlenecks List - Table Format with Search & View */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: '#1a1a1a', color: '#fff', borderRadius: 2, border: '1px solid #f44336' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2} spacing={2}>
                <Typography variant="h6" fontWeight="bold" color="error">Aging Bottlenecks List</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  <FormControl size="small" sx={{ width: { xs: '100%', sm: 200 } }}>
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
                      {Array.from(new Set((data?.processEfficiency?.oldestPending || []).map(item => item.supervisor))).sort().map(sup => (
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
                      startAdornment: <SearchIcon sx={{ mr: 1, color: 'grey.500' }} />,
                      sx: { bgcolor: '#2d2d2d', color: '#fff', borderRadius: 2, '& fieldset': { borderColor: '#444' } }
                    }}
                    sx={{ width: { xs: '100%', sm: 250 } }}
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
                      const filtered = (data?.processEfficiency?.oldestPending || []).filter(item => {
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
                            <td style={{ padding: '8px', color: '#b3b3b3', fontSize: '0.75rem' }}>{new Date(item.originalReport?.task?.createdAt || item.reportDate).toLocaleDateString()}</td>
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
                                onClick={() => {
                                  // The originalReport has the full data structure needed for TaskDetailsDialog
                                  // We need to inject the report back into the format expected by handleViewTask
                                  // However, IssuePreventionAnalytics usually shows the "Failed Prevention" context.
                                  // Let's find the full row in data.priorReports if possible, or use the originalReport.
                                  const report = item.originalReport;
                                  setSelectedTask({
                                    ...report.task,
                                    relatedIssues: [report] // Wrap it so TaskDetailsDialog sees the history context
                                  });
                                  setShowTaskDialog(true);
                                }}
                                sx={{ fontSize: '0.7rem', textTransform: 'none', py: 0.2 }}
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                        )) : (
                        <tr>
                          <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#4caf50' }}>No pending delays detected.</td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </Box>
              <TablePagination
                component="div"
                count={(data?.processEfficiency?.oldestPending || []).filter(item => {
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

      <Grid container spacing={4} mb={5}>
        {/* Source Distribution Chart */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', height: '100%' }}>
            <Typography variant="h6" fontWeight="700" mb={3}>
              Report Source Distribution
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Prevention Insights */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight="700" mb={3}>
              Prevention Insights
            </Typography>
            <Box flex={1}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Critical Understanding
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Currently, <strong>{data?.reportedOverlapCount}</strong> SLIDs were reported as issues before they became detractors or neutrals. This indicates a window of opportunity where proactive intervention could have prevented the negative feedback.
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" color="warning.main" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Action Plan Recommendation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Focus on the top reporting sources (see chart) to optimize the hand-over process. Issues reported via these channels are more likely to result in dissatisfaction if not resolved within 48 hours.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Diagnosis & QoS Deep Dive */}
      <Box mb={5}>
        <Typography variant="h6" fontWeight="700" mb={3}>
          Diagnosis Accuracy & QoS Matrix
        </Typography>
        <Grid container spacing={3}>

          {/* QoS Spotlight Matrix */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', height: '100%', border: '1px solid #333' }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <Typography variant="subtitle1" fontWeight="bold" color="warning.main">
                  QoS Spotlight
                </Typography>
                <Tooltip title="Analyzing how accurately 'QoS' issues are identified.">
                  <IconButton size="small"><Explore fontSize="small" sx={{ color: 'grey.500' }} /></IconButton>
                </Tooltip>
              </Stack>

              {(() => {
                const confirmed = data?.qosMatrix?.confirmed || 0;
                const falseAlarm = data?.qosMatrix?.falseAlarm || 0;
                const missed = data?.qosMatrix?.missed || 0;
                const totalReported = confirmed + falseAlarm;
                const totalActual = confirmed + missed;

                return (
                  <Stack spacing={2}>
                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 2, border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight="bold">CONFIRMED QoS</Typography>
                          <Typography variant="h4" color="success.main" fontWeight="800">{confirmed}</Typography>
                        </Box>
                        <Chip
                          label={totalReported > 0 ? `${((confirmed / totalReported) * 100).toFixed(0)}% Precision` : "0% Precision"}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ height: 20, fontSize: 10 }}
                        />
                      </Stack>
                      <Typography variant="caption" color="grey.400" display="block" mt={1}>
                        Reporter said QoS → Issue WAS QoS <br />
                        <span style={{ opacity: 0.7 }}>(Correctly identified out of {totalReported} total QoS reports)</span>
                      </Typography>
                    </Box>

                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 2, border: `1px solid ${alpha(theme.palette.error.main, 0.2)}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight="bold">RECLASSIFIED (Reported ≠ Actual)</Typography>
                          <Typography variant="h4" color="error.main" fontWeight="800">{falseAlarm}</Typography>
                        </Box>
                        <Chip
                          label={totalReported > 0 ? `${((falseAlarm / totalReported) * 100).toFixed(0)}% Mismatch` : "0% Mismatch"}
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ height: 20, fontSize: 10 }}
                        />
                      </Stack>
                      <Typography variant="caption" color="grey.400" display="block" mt={1}>
                        Reported as QoS → Actual Reason: OTHER <br />
                        <span style={{ opacity: 0.7 }}>(Issue valid, but category updated)</span>
                      </Typography>
                    </Box>

                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 2, border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight="bold">UNIDENTIFIED (Actual  ≠ Reported)</Typography>
                          <Typography variant="h4" color="info.main" fontWeight="800">{missed}</Typography>
                        </Box>
                        <Chip
                          label={totalActual > 0 ? `${((missed / totalActual) * 100).toFixed(0)}% Unidentified` : "0% Unidentified"}
                          size="small"
                          color="info"
                          variant="outlined"
                          sx={{ height: 20, fontSize: 10 }}
                        />
                      </Stack>
                      <Typography variant="caption" color="grey.400" display="block" mt={1}>
                        Reported as OTHER → Actual Reason: QoS <br />
                        <span style={{ opacity: 0.7 }}>(QoS nature discovered during resolution)</span>
                      </Typography>
                    </Box>
                  </Stack>
                );
              })()}
            </Paper>
          </Grid>

          {/* Installation Spotlight Matrix */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', height: '100%', border: '1px solid #333' }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <Typography variant="subtitle1" fontWeight="bold" color="info.main">
                  Installation Spotlight
                </Typography>
                <Tooltip title="Analyzing how accurately 'Installation' issues are identified.">
                  <IconButton size="small"><Explore fontSize="small" sx={{ color: 'grey.500' }} /></IconButton>
                </Tooltip>
              </Stack>

              {(() => {
                const confirmed = data?.installationMatrix?.confirmed || 0;
                const falseAlarm = data?.installationMatrix?.falseAlarm || 0;
                const missed = data?.installationMatrix?.missed || 0;
                const totalReported = confirmed + falseAlarm;
                const totalActual = confirmed + missed;

                return (
                  <Stack spacing={2}>
                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 2, border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight="bold">CONFIRMED INSTALL</Typography>
                          <Typography variant="h4" color="success.main" fontWeight="800">{confirmed}</Typography>
                        </Box>
                        <Chip
                          label={totalReported > 0 ? `${((confirmed / totalReported) * 100).toFixed(0)}% Precision` : "0% Precision"}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ height: 20, fontSize: 10 }}
                        />
                      </Stack>
                      <Typography variant="caption" color="grey.400" display="block" mt={1}>
                        Reporter said Install → Issue WAS Install <br />
                        <span style={{ opacity: 0.7 }}>(Correctly identified out of {totalReported} total Install reports)</span>
                      </Typography>
                    </Box>

                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 2, border: `1px solid ${alpha(theme.palette.error.main, 0.2)}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight="bold">RECLASSIFIED (Reported ≠ Actual)</Typography>
                          <Typography variant="h4" color="error.main" fontWeight="800">{falseAlarm}</Typography>
                        </Box>
                        <Chip
                          label={totalReported > 0 ? `${((falseAlarm / totalReported) * 100).toFixed(0)}% Mismatch` : "0% Mismatch"}
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ height: 20, fontSize: 10 }}
                        />
                      </Stack>
                      <Typography variant="caption" color="grey.400" display="block" mt={1}>
                        Reported as Install → Actual Reason: OTHER <br />
                        <span style={{ opacity: 0.7 }}>(Issue valid, but category updated)</span>
                      </Typography>
                    </Box>

                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 2, border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight="bold">UNIDENTIFIED (Actual ≠ Reported)</Typography>
                          <Typography variant="h4" color="info.main" fontWeight="800">{missed}</Typography>
                        </Box>
                        <Chip
                          label={totalActual > 0 ? `${((missed / totalActual) * 100).toFixed(0)}% Unidentified` : "0% Unidentified"}
                          size="small"
                          color="info"
                          variant="outlined"
                          sx={{ height: 20, fontSize: 10 }}
                        />
                      </Stack>
                      <Typography variant="caption" color="grey.400" display="block" mt={1}>
                        Reported as OTHER → Actual Reason: Install <br />
                        <span style={{ opacity: 0.7 }}>(Install nature discovered during resolution)</span>
                      </Typography>
                    </Box>
                  </Stack>
                );
              })()}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Global Category Accuracy Matrix */}
      <Box mb={10}>
        <Stack direction="row" alignItems="center" spacing={1} mb={3}>
          <Typography variant="h6" fontWeight="700">
            Global Category Accuracy Deep Dive
          </Typography>
          <Tooltip title="Mapping initially reported categories (from Issues page) to the finalized reasons (from Tasks). Green chips indicate matches, red indicates reclassifications.">
            <IconButton size="small"><Explore fontSize="small" sx={{ color: 'grey.500' }} /></IconButton>
          </Tooltip>
        </Stack>
        <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', border: '1px solid #333' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'primary.main', fontWeight: 'bold', borderBottom: '2px solid #333', py: 2 }}>Initial Reported Category</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 'bold', borderBottom: '2px solid #333', py: 2 }}>Final Resolution Distribution</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(data?.globalCategoryReasonMatrix || {}).length > 0 ? (
                Object.entries(data?.globalCategoryReasonMatrix || {}).map(([category, reasons], idx) => (
                  <TableRow key={idx} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell sx={{ borderBottom: '1px solid #333', color: 'grey.300', fontWeight: 'bold', width: '30%' }}>
                      {category}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #333', py: 2 }}>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {Object.entries(reasons).map(([reason, count], i) => (
                          <Chip
                            key={i}
                            label={`${reason}: ${count}`}
                            size="small"
                            sx={{
                              bgcolor: category.toLowerCase().includes(reason.toLowerCase()) || reason.toLowerCase().includes(category.toLowerCase())
                                ? alpha(theme.palette.success.main, 0.1)
                                : alpha(theme.palette.error.main, 0.1),
                              color: category.toLowerCase().includes(reason.toLowerCase()) || reason.toLowerCase().includes(category.toLowerCase())
                                ? 'success.main'
                                : 'error.main',
                              border: '1px solid currentColor',
                              fontWeight: 'bold',
                              fontSize: '0.7rem'
                            }}
                          />
                        ))}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} align="center" sx={{ border: 'none', py: 4, color: 'grey.500' }}>
                    No mapping data available for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      {/* Deep Dive Analysis: Root Cause & Vendor Performance */}
      <Grid item xs={12}>
        <Typography variant="h6" fontWeight="700" mb={3}>
          Root Cause Deep Dive (Failures by Reason)
        </Typography>
        <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', height: 450 }}>
          <Box sx={{ height: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis type="number" stroke="#cbd5e1" tick={{ fill: '#94a3b8' }} />
                <YAxis dataKey="name" type="category" stroke="#cbd5e1" width={100} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <RechartsTooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} contentStyle={{ backgroundColor: '#262626', border: '1px solid #333', color: '#fff' }} />
                <Bar dataKey="value" fill="#FF8042" name="Failed Preventions" radius={[0, 4, 4, 0]}>
                  <Cell fill="#FF8042" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Grid>

      {/* Top Non-Preventive Reporters */}
      <Box mt={10}>
        <Typography variant="h6" fontWeight="700" my={3}>
          Top Non-Preventive Reporters (Most Overlaps)
        </Typography>
        <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a' }}>
          <Box sx={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reporterData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#cbd5e1"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis stroke="#cbd5e1" tick={{ fill: '#94a3b8' }} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ backgroundColor: '#262626', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="value" fill="#8884d8" name="Failed Preventions" radius={[4, 4, 0, 0]}>
                  {reporterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Box>

      {/* New Section: Top Reporters Deep Dive */}
      <Box mt={10} mb={5}>
        <Typography variant="h6" fontWeight="700" mb={3}>
          Top Reporters: Reported vs Actual Analysis (What did they miss?)
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Analyzing the discrepancy between what was reported (category) vs the actual root cause found (reason).
        </Typography>

        <Grid container spacing={3}>
          {data?.reporterComparisonStats?.map((reporter, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#1a1a1a', height: '100%', border: '1px solid #333' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                      {reporter.reporterName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {reporter.totalNonPrevented} Non-Prevented Issues
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: alpha(COLORS[index % COLORS.length], 0.2), color: COLORS[index % COLORS.length], width: 32, height: 32, fontSize: 14 }}>
                    #{index + 1}
                  </Avatar>
                </Stack>
                <Divider sx={{ mb: 2, borderColor: '#333' }} />

                <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                  <Table size="small">
                    <TableBody>
                      {reporter.comparisons.map((comp, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ borderBottom: '1px solid #333', color: 'grey.400', py: 1 }}>
                            <Stack>
                              <Typography variant="caption" color="warning.main">Reported: {comp.reportedCategory}</Typography>
                              <Typography variant="caption" color="success.main">Actual: {comp.actualReason}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right" sx={{ borderBottom: '1px solid #333', color: 'grey.100', fontWeight: 'bold' }}>
                            {comp.count}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Paper>
            </Grid>
          ))}
          {(!data?.reporterComparisonStats || data.reporterComparisonStats.length === 0) && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#1a1a1a', borderRadius: 3 }}>
                <Typography color="text.secondary">No detailed comparison data available.</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Prevention Trend Analysis */}
      {/* <Box my={5}>
        <Typography variant="h6" fontWeight="700" mb={3}>
          Prevention Trend Analysis (Missed Opportunities)
        </Typography>
        <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a' }}>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#262626', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="value" stroke="#8884d8" fillOpacity={1} fill="url(#colorTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Box> */}

      {/* Detailed Overlap Table */}
      <Box>
        <Typography variant="h6" fontWeight="700" mb={3}>
          Overlapping Case Details
        </Typography>
        <Paper sx={{ height: 600, width: '100%', borderRadius: 4, overflow: 'hidden', bgcolor: '#1a1a1a' }}>
          <DataGrid
            rows={data?.overlaps.map((item, idx) => ({ id: idx, ...item })) || []}
            columns={columns}
            getRowId={(row) => row.id}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10 },
              },
            }}
            pageSizeOptions={[10, 25, 50]}
            checkboxSelection
            disableSelectionOnClick
            slots={{ toolbar: GridToolbar }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                color: 'grey.300',
                borderBottom: '1px solid #333'
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#262626',
                color: 'grey.100',
                fontSize: 14,
                fontWeight: 'bold',
                borderBottom: '2px solid #333'
              },
              '& .MuiDataGrid-footerContainer': {
                backgroundColor: '#262626',
                borderTop: '2px solid #333'
              },
              '& .MuiDataGrid-toolbarContainer': {
                p: 2,
                backgroundColor: '#1a1a1a'
              },
              '& .MuiButton-textPrimary': {
                color: theme.palette.primary.main
              }
            }}
          />
        </Paper>
      </Box>
      <TaskDetailsDialog
        open={showTaskDialog}
        onClose={() => setShowTaskDialog(false)}
        tasks={selectedTask ? [selectedTask] : []}
        teamName={selectedTask?.teamName || "Task Details"}
      />

      {/* Detailed Comparison Dialog */}
      <Dialog
        open={showComparisonDialog}
        onClose={() => setShowComparisonDialog(false)}
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #333', pb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: theme.palette.info.main }}>
              <CompareIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="700">
                Issue Prevention Analysis
              </Typography>
              <Typography variant="caption" color="text.secondary">
                SLID: {selectedComparison?.task.slid}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedComparison && (
            <Stack spacing={3}>
              {/* Timeline Insight */}
              <Paper sx={{ p: 2, bgcolor: '#262626', borderRadius: 2 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Timeline Analysis
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ color: 'grey.400', border: 'none' }}>PIS Date:</TableCell>
                      <TableCell sx={{ color: 'grey.100', border: 'none', fontWeight: 'bold' }}>
                        {selectedComparison.task.pisDate ? moment(selectedComparison.task.pisDate).format("MMM DD, YYYY") : "N/A"}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: 'grey.400', border: 'none' }}>From (Main):</TableCell>
                      <TableCell sx={{ color: 'grey.100', border: 'none', fontWeight: 'bold' }}>
                        {selectedComparison.reports[0].fromMain || "N/A"}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: 'grey.400', border: 'none' }}>From (Sub):</TableCell>
                      <TableCell sx={{ color: 'grey.100', border: 'none', fontWeight: 'bold' }}>
                        {selectedComparison.reports[0].fromSub || "-"}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: 'grey.400', border: 'none' }}>First Reported:</TableCell>
                      <TableCell sx={{ color: 'grey.100', border: 'none', fontWeight: 'bold' }}>
                        {moment(selectedComparison.reports[0].date || selectedComparison.reports[0].createdAt).format("MMM DD, YYYY HH:mm")}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: 'grey.400', border: 'none' }}>Interview Date:</TableCell>
                      <TableCell sx={{ color: 'grey.100', border: 'none', fontWeight: 'bold' }}>
                        {moment(selectedComparison.task.interviewDate).format("MMM DD, YYYY HH:mm")}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: 'grey.400', border: 'none' }}>Resolved Date:</TableCell>
                      <TableCell sx={{ color: 'grey.100', border: 'none', fontWeight: 'bold' }}>
                        {selectedComparison.reports[0].resolveDate ? moment(selectedComparison.reports[0].resolveDate).format("MMM DD, YYYY HH:mm") : "N/A"}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: 'grey.400', border: 'none' }}>Technical Delay (Reported vs Resolved):</TableCell>
                      <TableCell sx={{ border: 'none' }}>
                        {(() => {
                          if (!selectedComparison.reports[0].resolveDate) return "N/A";
                          const reportDate = moment(selectedComparison.reports[0].date || selectedComparison.reports[0].createdAt).startOf('day');
                          const resolveDate = moment(selectedComparison.reports[0].resolveDate).startOf('day');
                          const techDelay = Math.abs(resolveDate.diff(reportDate, 'days'));
                          return (
                            <Chip
                              label={`${techDelay} days`}
                              size="small"
                              variant="outlined"
                              sx={{
                                color: techDelay > 3 ? "#ed6c02" : "#4caf50",
                                borderColor: techDelay > 3 ? "#ed6c02" : "#4caf50",
                                fontWeight: "bold"
                              }}
                            />
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: 'grey.400', border: 'none' }}>Prevention Gap (Reported vs Interview):</TableCell>
                      <TableCell sx={{ border: 'none' }}>
                        {(() => {
                          const reportDate = moment(selectedComparison.reports[0].date || selectedComparison.reports[0].createdAt).startOf('day');
                          const interviewDate = moment(selectedComparison.task.interviewDate).startOf('day');
                          const gap = Math.abs(interviewDate.diff(reportDate, 'days'));
                          return (
                            <Chip
                              label={`${gap} days`}
                              size="small"
                              sx={{
                                backgroundColor: gap > 7 ? "#d32f2f" : "#ed6c02",
                                color: "white",
                                fontWeight: "bold"
                              }}
                            />
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Paper>

              {/* Feedback Comparison */}
              <Paper sx={{ p: 2, bgcolor: '#262626', borderRadius: 2 }}>
                <Typography variant="subtitle2" color="warning.main" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Feedback Comparison
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: '#1a1a1a', borderRadius: 2, border: '1px solid #333' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                        Initial Report (from {selectedComparison.reports[0].fromMain}, by <span style={{ color: '#90caf9' }}>{selectedComparison.reports[0].reporter}</span>)
                      </Typography>
                      <Typography variant="body2" color="grey.300" sx={{ mt: 1 }}>
                        {selectedComparison.reports[0].reporterNote || "No note provided"}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: '#1a1a1a', borderRadius: 2, border: '1px solid #333' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                        Final Customer Feedback
                      </Typography>
                      <Typography variant="body2" color="grey.300" sx={{ mt: 1 }}>
                        {selectedComparison.task.customerFeedback || "No feedback provided"}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Classification Comparison */}
              <Paper sx={{ p: 2, bgcolor: '#262626', borderRadius: 2 }}>
                <Typography variant="subtitle2" color="info.main" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Classification Comparison
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: '#1a1a1a', borderRadius: 2, border: '1px solid #333' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                        Reported Categories
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                        {(selectedComparison.reports[0].issues || []).map((issue, idx) => (
                          <Chip
                            key={idx}
                            label={issue.category}
                            size="small"
                            sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main', border: '1px solid rgba(237, 108, 2, 0.2)' }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: '#1a1a1a', borderRadius: 2, border: '1px solid #333' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                        Finalized Task Reason
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          label={selectedComparison.task.reason || "N/A"}
                          size="small"
                          sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main', border: '1px solid rgba(76, 175, 80, 0.2)' }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Professional Insights */}
              <Paper sx={{ p: 2, bgcolor: '#262626', borderRadius: 2 }}>
                <Typography variant="subtitle2" color="success.main" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Professional Insights
                </Typography>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold' }}>
                      • Severity Assessment:
                    </Typography>
                    <Typography variant="body2" color="grey.300" sx={{ ml: 2 }}>
                      Final NPS Score: <strong>{selectedComparison.task.evaluationScore}</strong> ({selectedComparison.task.evaluationScore <= 4 ? 'Detractor' : 'Neutral'})
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold' }}>
                      • Prevention Opportunity:
                    </Typography>
                    <Typography variant="body2" color="grey.300" sx={{ ml: 2 }}>
                      {(() => {
                        const reportDate = moment(selectedComparison.reports[0].date || selectedComparison.reports[0].createdAt).startOf('day');
                        const interviewDate = moment(selectedComparison.task.interviewDate).startOf('day');
                        const gap = Math.abs(interviewDate.diff(reportDate, 'days'));
                        return gap > 7
                          ? "High - Issue was reported well in advance but escalated to negative feedback."
                          : "Medium - Short window between report and interview suggests rapid escalation.";
                      })()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold' }}>
                      • Recommended Action:
                    </Typography>
                    <Typography variant="body2" color="grey.300" sx={{ ml: 2 }}>
                      Establish proactive follow-up protocols for issues from "{selectedComparison.reports[0].fromMain}" to prevent similar escalations.
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #333', pt: 2 }}>
          <Button onClick={() => setShowComparisonDialog(false)} variant="contained" sx={{ bgcolor: '#333' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>


      <ManagementEmailDialog
        open={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        data={data}
        type="prevention"
        startDate={dateFilter.start}
        endDate={dateFilter.end}
      />
    </Box >
  );
};

export default IssuePreventionAnalytics;
