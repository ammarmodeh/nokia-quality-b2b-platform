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
  Button,
} from "@mui/material";
import {
  NavigateNext as NavigateNextIcon,
  Assessment as AssessmentIcon,
  Visibility as VisibilityIcon,
  Build as BuildIcon,
  Gavel as GavelIcon,
  Analytics as AnalyticsIcon,
  BugReport as BugReportIcon,
  FilterList as FilterIcon,
  Timeline as TimelineIcon,
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
} from "recharts";
import api from "../api/api";
import { MoonLoader } from "react-spinners";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { TaskDetailsDialog } from "../components/TaskDetailsDialog";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const PreventionDeepDive = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [dateFilter, setDateFilter] = useState({ start: null, end: null });

  const prettifyLabel = (str) => {
    if (!str) return 'N/A';
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const fetchDeepDiveStats = async (startArg, endArg) => {
    setLoading(true);
    try {
      const params = {};
      const start = startArg !== undefined ? startArg : dateFilter.start;
      const end = endArg !== undefined ? endArg : dateFilter.end;

      if (start) params.startDate = start;
      if (end) params.endDate = end;

      const response = await api.get("/tasks/prevention-deep-dive", {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        params
      });

      // Prettify data for charts
      const processedData = {
        ...response.data,
        actionTakenStats: response.data.actionTakenStats.map(item => ({
          ...item,
          displayName: prettifyLabel(item.name)
        })),
        justificationStats: response.data.justificationStats.map(item => ({
          ...item,
          displayName: prettifyLabel(item.name)
        })),
        reasonStats: response.data.reasonStats.map(item => ({
          ...item,
          displayName: prettifyLabel(item.name)
        })),
        companyStats: response.data.companyStats.map(item => ({
          ...item,
          displayName: prettifyLabel(item.name)
        }))
      };

      setData(processedData);
    } catch (error) {
      console.error("Error fetching deep dive stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeepDiveStats();
  }, []);

  if (loading && !data) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <MoonLoader color={theme.palette.primary.main} size={50} />
      </Box>
    );
  }

  // Premium Vibrant Palette
  const COLORS = ["#3ea6ff", "#00e396", "#feb019", "#ff4560", "#775dd0", "#33b2df", "#546e7a", "#d4526e"];

  const columns = [
    {
      field: "slid",
      headerName: "SLID",
      width: 140,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => {
        const status = params.value || "Todo";
        const isClosed = status === "Closed";
        const isInProgress = status === "In Progress";

        return (
          <Chip
            label={status}
            size="small"
            variant="outlined"
            sx={{
              borderColor: isClosed ? theme.palette.success.main : isInProgress ? theme.palette.warning.main : theme.palette.error.main,
              color: isClosed ? theme.palette.success.main : isInProgress ? theme.palette.warning.main : theme.palette.error.main,
              fontWeight: "bold",
              fontSize: "0.75rem"
            }}
          />
        );
      }
    },
    {
      field: "evaluationScore",
      headerName: "Score",
      width: 80,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            backgroundColor: params.value <= 4 ? "#d32f2f" : "#ed6c02",
            color: "white",
            fontWeight: "bold"
          }}
        />
      )
    },
    {
      field: "priority",
      headerName: "Priority",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value || "Medium"}
          size="small"
          sx={{
            backgroundColor: params.value === "High" ? alpha(theme.palette.error.main, 0.15) :
              params.value === "Low" ? alpha(theme.palette.success.main, 0.15) :
                alpha(theme.palette.warning.main, 0.15),
            color: params.value === "High" ? theme.palette.error.main :
              params.value === "Low" ? theme.palette.success.main :
                theme.palette.warning.main,
            fontWeight: "bold",
            border: `1px solid ${params.value === "High" ? theme.palette.error.main : params.value === "Low" ? theme.palette.success.main : theme.palette.warning.main}`
          }}
        />
      )
    },
    {
      field: "assignedTo",
      headerName: "Assigned To",
      width: 180,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} sx={{ overflow: 'hidden' }}>
          {(params.value || []).slice(0, 2).map((user, i) => (
            <Tooltip key={i} title={user.name}>
              <Avatar
                sx={{
                  width: 24,
                  height: 24,
                  fontSize: '0.65rem',
                  bgcolor: theme.palette.primary.main,
                  border: `1px solid ${theme.palette.background.paper}`
                }}
              >
                {user.name.charAt(0)}
              </Avatar>
            </Tooltip>
          ))}
          {(params.value || []).length > 2 && (
            <Typography variant="caption" sx={{ alignSelf: 'center', color: 'text.secondary' }}>
              +{(params.value.length - 2)}
            </Typography>
          )}
        </Stack>
      )
    },
    {
      field: "rootCause",
      headerName: "Root Cause",
      width: 180,
      valueGetter: (value, row) => row.rootCause || row.reason || "N/A"
    },
    {
      field: "teamCompany",
      headerName: "Subcon",
      width: 130,
      valueGetter: (value) => value || "N/A"
    },
    {
      field: "progress",
      headerName: "Progress",
      width: 120,
      renderCell: (params) => {
        const subtasks = params.row.subTasks || [];
        const completed = subtasks.filter(t => t.note).length;
        const total = subtasks.length || 1;
        const progress = Math.round((completed / total) * 100);

        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flexGrow: 1, height: 6, bgcolor: alpha(theme.palette.divider, 0.5), borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ width: `${progress}%`, height: '100%', bgcolor: theme.palette.primary.main, transition: 'width 0.3s ease' }} />
            </Box>
            <Typography variant="caption" sx={{ minWidth: 25, fontWeight: 'bold' }}>{progress}%</Typography>
          </Box>
        );
      }
    },
    {
      field: "createdAt",
      headerName: "Date",
      width: 120,
      valueGetter: (value) => moment(value).format("MMM DD, YYYY")
    },
    {
      field: "view",
      headerName: "View",
      width: 70,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="View Task Details">
          <IconButton onClick={() => {
            setSelectedTask(params.row);
            setShowTaskDialog(true);
          }}>
            <VisibilityIcon fontSize="small" sx={{ color: "grey.400" }} />
          </IconButton>
        </Tooltip>
      )
    }
  ];

  const StatCard = ({ title, value, icon, color }) => (
    <MuiCard sx={{ height: '100%', borderRadius: 4, bgcolor: alpha(color, 0.05), border: `1px solid ${alpha(color, 0.1)}` }} elevation={0}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: color, width: 48, height: 48, boxShadow: `0 4px 12px ${alpha(color, 0.3)}` }}>
            {icon}
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="800" sx={{ color: 'text.primary', mt: 0.5 }}>
              {value}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </MuiCard>
  );

  return (
    <Container maxWidth="xl" sx={{ pt: 4, pb: 8, px: 0 }}>
      {/* Header */}
      <Box mb={5}>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
          <Link underline="hover" color="inherit" onClick={() => navigate("/")} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            Home
          </Link>
          <Typography color="text.primary">Analytics</Typography>
          <Typography color="text.primary" sx={{ fontWeight: 'bold' }}>Prevention Deep Dive</Typography>
        </Breadcrumbs>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="h3" fontWeight="900" color="text.primary" sx={{ letterSpacing: '-0.02em' }}>
              Prevention Deep Dive
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 600 }}>
              Analyzing subtask outcomes and justifications for tasks scored 1-8 to identify recurring issues and refine prevention strategies.
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
              borderRadius: 3,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              gap: 2,
              width: { xs: '100%', md: 'auto' }
            }}
          >
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start"
                value={dateFilter.start}
                onChange={(newValue) => setDateFilter(prev => ({ ...prev, start: newValue }))}
                slotProps={{ textField: { size: 'small', sx: { width: { xs: '100%', sm: 150 } } } }}
              />
              <DatePicker
                label="End"
                value={dateFilter.end}
                onChange={(newValue) => setDateFilter(prev => ({ ...prev, end: newValue }))}
                slotProps={{ textField: { size: 'small', sx: { width: { xs: '100%', sm: 150 } } } }}
              />
            </LocalizationProvider>
            <Button
              variant="contained"
              size="medium"
              onClick={() => fetchDeepDiveStats()}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 'bold',
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              Filter
            </Button>
          </Paper>
        </Stack>
      </Box>

      {/* KPI Section */}
      <Grid container spacing={3} mb={6}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Low-Score Tasks"
            value={data?.totalTasks}
            icon={<AssessmentIcon />}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Actions Taken"
            value={data?.actionTakenStats?.reduce((acc, curr) => acc + curr.value, 0) || 0}
            icon={<BuildIcon />}
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Justifications Provided"
            value={data?.justificationStats?.reduce((acc, curr) => acc + curr.value, 0) || 0}
            icon={<GavelIcon />}
            color={theme.palette.warning.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Avg. Score"
            value={(data?.recentTasks?.reduce((acc, curr) => acc + curr.evaluationScore, 0) / (data?.recentTasks?.length || 1)).toFixed(1)}
            icon={<AnalyticsIcon />}
            color={theme.palette.info.main}
          />
        </Grid>
      </Grid>

      <Grid container spacing={4} mb={6}>
        {/* Score Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, borderRadius: 5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight="800" mb={4} display="flex" alignItems="center" gap={1}>
              <AssessmentIcon color="primary" /> Score Distribution (1-8)
            </Typography>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.scoreDistribution}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.divider, 0.5)} />
                  <XAxis dataKey="name" fontSize={12} stroke={theme.palette.text.secondary} axisLine={false} tickLine={false} />
                  <YAxis fontSize={12} stroke={theme.palette.text.secondary} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', backgroundColor: '#1e1e1e' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="url(#scoreGradient)" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Most Frequent Actions */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, borderRadius: 5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight="800" mb={4} display="flex" alignItems="center" gap={1}>
              <BuildIcon color="success" /> Top Corrective Actions Taken
            </Typography>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.actionTakenStats}
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={8}
                    dataKey="value"
                    nameKey="displayName"
                    stroke="none"
                  >
                    {data?.actionTakenStats?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', backgroundColor: '#1e1e1e' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Justification Reasons */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, borderRadius: 5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight="800" mb={4} display="flex" alignItems="center" gap={1}>
              <GavelIcon color="warning" /> Justifications for No Action
            </Typography>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.justificationStats} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={alpha(theme.palette.divider, 0.5)} />
                  <XAxis type="number" fontSize={12} stroke={theme.palette.text.secondary} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="displayName" fontSize={11} width={150} stroke={theme.palette.text.secondary} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', backgroundColor: '#1e1e1e' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" fill={theme.palette.warning.main} radius={[0, 4, 4, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Root Cause Analysis */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, borderRadius: 5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight="800" mb={4} display="flex" alignItems="center" gap={1}>
              <BugReportIcon color="error" /> Primary Root Causes (Top 10)
            </Typography>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.reasonStats}>
                  <defs>
                    <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.divider, 0.5)} />
                  <XAxis dataKey="name" fontSize={10} stroke={theme.palette.text.secondary} angle={-30} textAnchor="end" height={80} axisLine={false} tickLine={false} />
                  <YAxis fontSize={12} stroke={theme.palette.text.secondary} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', backgroundColor: '#1e1e1e' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="url(#errorGradient)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Detailed Tasks Explorer */}
      <Box mb={4}>
        <Typography variant="h5" fontWeight="900" mb={3} display="flex" alignItems="center" gap={1.5}>
          <TimelineIcon color="primary" /> Detailed Tasks Explorer
        </Typography>
        <Paper sx={{
          width: '100%',
          borderRadius: 5,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}>
          <DataGrid
            rows={data?.recentTasks || []}
            columns={columns}
            getRowId={(row) => row._id}
            slots={{ toolbar: GridToolbar }}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            autoHeight
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': { borderColor: 'divider' },
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: alpha(theme.palette.primary.main, 0.02),
                borderBottom: '2px solid',
                borderColor: 'divider',
              },
              '& .MuiDataGrid-footerContainer': { borderTop: '2px solid', borderColor: 'divider' },
            }}
          />
        </Paper>
      </Box>

      {selectedTask && (
        <TaskDetailsDialog
          open={showTaskDialog}
          onClose={() => setShowTaskDialog(false)}
          tasks={[selectedTask]}
          teamName={selectedTask?.teamCompany || "Deep Dive Result"}
        />
      )}
    </Container>
  );
};

export default PreventionDeepDive;
