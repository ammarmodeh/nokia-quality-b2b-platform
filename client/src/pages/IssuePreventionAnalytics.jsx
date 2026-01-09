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

const IssuePreventionAnalytics = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedComparison, setSelectedComparison] = useState(null);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get("/tasks/prevention-stats", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        setData(response.data);
      } catch (error) {
        console.error("Error fetching prevention stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

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
      valueGetter: (value, row) => moment(row.reports[0].createdAt).format("MMM DD, YYYY"),
    },
    {
      field: "interviewDate",
      headerName: "Interview Date",
      width: 150,
      valueGetter: (value, row) => moment(row.task.interviewDate).format("MMM DD, YYYY"),
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
      field: "source",
      headerName: "Main Source",
      width: 150,
      valueGetter: (value, row) => row.reports[0]?.fromMain || "N/A",
    },
    {
      field: "reporter",
      headerName: "Reporter",
      width: 150,
      valueGetter: (value, row) => row.reports[0]?.reporter || "N/A",
    },
    {
      field: "teamCompany",
      headerName: "Team Company",
      width: 150,
      valueGetter: (value, row) => row.task.teamCompany || "N/A",
    },
    {
      field: "reason",
      headerName: "Reason",
      width: 150,
      valueGetter: (value, row) => row.task.reason || "N/A",
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
        const reportDate = moment(row.reports[0].createdAt);
        const interviewDate = moment(row.task.interviewDate);
        return interviewDate.diff(reportDate, 'days');
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
            setSelectedTask(params.row.task);
            setShowTaskDialog(true);
          }}>
            <VisibilityIcon fontSize="small" sx={{ color: "grey.400" }} />
          </IconButton>
        </Tooltip>
      )
    }
  ];

  const StatCard = ({ title, value, icon, color }) => (
    <MuiCard sx={{ height: '100%', borderRadius: 3, bgcolor: alpha(color, 0.05), border: `1px solid ${alpha(color, 0.2)}` }} elevation={0}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="800" sx={{ color: color }}>
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>
            {icon}
          </Avatar>
        </Stack>
      </CardContent>
    </MuiCard>
  );

  return (
    <Container maxWidth="xl" sx={{ pt: 3, pb: 6 }}>
      {/* Header */}
      <Box mb={4}>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 1 }}>
          <Link underline="hover" color="inherit" href="/" sx={{ display: 'flex', alignItems: 'center' }}>
            Home
          </Link>
          <Typography color="text.primary">Analytics</Typography>
          <Typography color="text.primary" sx={{ fontWeight: 'bold' }}>Issue Prevention</Typography>
        </Breadcrumbs>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: theme.palette.success.main, width: 56, height: 56 }}>
            <VerifiedIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="800" color="text.primary">
              Issue Prevention Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cross-referencing reported issues with subsequent Detractor/Neutral outcomes to improve service delivery.
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* KPI Section */}
      <Grid container spacing={3} mb={5}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Critical Tasks"
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
            title="System Alert"
            value={data?.reportedOverlapCount > 0 ? "High Risk" : "Normal"}
            icon={<ErrorIcon />}
            color={data?.reportedOverlapCount > 10 ? theme.palette.error.dark : theme.palette.success.main}
          />
        </Grid>
      </Grid>


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

      {/* Deep Dive Analysis: Root Cause & Vendor Performance */}
      <Grid container spacing={4} mb={5}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" fontWeight="700" mb={3}>
            Root Cause Deep Dive (Failures by Reason)
          </Typography>
          <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', height: '100%' }}>
            <Box sx={{ height: 350 }}>
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
        <Grid item xs={12} md={6}>
          <Typography variant="h6" fontWeight="700" mb={3}>
            Vendor Ecosystem (Failures by Team Company)
          </Typography>
          <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', height: '100%' }}>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={companyChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                  <XAxis type="number" stroke="#cbd5e1" tick={{ fill: '#94a3b8' }} />
                  <YAxis dataKey="name" type="category" stroke="#cbd5e1" width={100} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <RechartsTooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} contentStyle={{ backgroundColor: '#262626', border: '1px solid #333', color: '#fff' }} />
                  <Bar dataKey="value" fill="#00C49F" name="Failed Preventions" radius={[0, 4, 4, 0]}>
                    <Cell fill="#00C49F" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
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

      {/* Prevention Trend Analysis */}
      <Box my={5}>
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
      </Box>

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
        maxWidth="md"
        fullWidth
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
                      <TableCell sx={{ color: 'grey.400', border: 'none' }}>First Reported:</TableCell>
                      <TableCell sx={{ color: 'grey.100', border: 'none', fontWeight: 'bold' }}>
                        {moment(selectedComparison.reports[0].createdAt).format("MMM DD, YYYY HH:mm")}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: 'grey.400', border: 'none' }}>Interview Date:</TableCell>
                      <TableCell sx={{ color: 'grey.100', border: 'none', fontWeight: 'bold' }}>
                        {moment(selectedComparison.task.interviewDate).format("MMM DD, YYYY HH:mm")}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ color: 'grey.400', border: 'none' }}>Prevention Gap:</TableCell>
                      <TableCell sx={{ border: 'none' }}>
                        <Chip
                          label={`${moment(selectedComparison.task.interviewDate).diff(moment(selectedComparison.reports[0].createdAt), 'days')} days`}
                          size="small"
                          sx={{
                            backgroundColor: moment(selectedComparison.task.interviewDate).diff(moment(selectedComparison.reports[0].createdAt), 'days') > 7 ? "#d32f2f" : "#ed6c02",
                            color: "white",
                            fontWeight: "bold"
                          }}
                        />
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
                      {moment(selectedComparison.task.interviewDate).diff(moment(selectedComparison.reports[0].createdAt), 'days') > 7
                        ? "High - Issue was reported well in advance but escalated to negative feedback."
                        : "Medium - Short window between report and interview suggests rapid escalation."}
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
    </Container>
  );
};

export default IssuePreventionAnalytics;
