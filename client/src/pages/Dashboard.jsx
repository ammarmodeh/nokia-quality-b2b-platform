// src/Dashboard.js
import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Typography, Box, Divider, Snackbar, Alert, Stack, useMediaQuery, Breadcrumbs, Link, Container, Paper } from "@mui/material";
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DashboardIcon from '@mui/icons-material/Dashboard';
import api from "../api/api";
import { useSelector } from "react-redux";
import { MoonLoader } from "react-spinners";
// import { SnackbarProvider } from "notistack";
// import { CompanyViolationTable } from "../components/CompanyViolationTable";
import { AllReasonsTable } from "../components/AllReasonsTable";
import IssueCategoriesDialog from "../components/IssueCategoriesDialog";
import ReasonCategoriesDialog from "../components/ReasonCategoriesDialog";
import AIInsightButton from "../components/AIInsightButton";
import ActionPlanButton from "../components/ActionPlanButton";
import AIHistoryButton from "../components/AIHistoryButton";

// Lazy load components
const Chart = lazy(() => import("../components/Chart"));
const Card = lazy(() => import("../components/Card"));
const TaskTable = lazy(() => import("../components/TaskTable"));
const TeamViolationTracker = lazy(() => import("../components/TeamViolationTracker"));
const WeeklySummaryTable = lazy(() => import("../components/WeeklySummaryTable"));
const MonthlySummaryTable = lazy(() => import("../components/MonthlySummaryTable"));
const WeeklyReasonTable = lazy(() => import("../components/WeeklyReasonTable"));
const MonthlyReasonTable = lazy(() => import("../components/MonthlyReasonTable"));
const TrendStatistics = lazy(() => import("../components/TrendStatistics"));
const SamplesTokenFloatingButton = lazy(() => import("../components/SamplesTokenFloatingButton"));

const Dashboard = () => {
  const { user } = useSelector((state) => state?.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [updateTasksList, setUpdateTasksList] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [teamsData, setTeamsData] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [tasksError, setTasksError] = useState(null);
  const [teamsError, setTeamsError] = useState(null);

  const isMediumScreen = useMediaQuery('(max-width: 900px)');
  const isMobile = useMediaQuery('(max-width: 600px)');

  useEffect(() => {
    const fetchTasks = async () => {
      // console.time("fetchTasks Duration");
      try {
        const response = await api.get("/tasks/get-all-tasks", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        setTasks(response.data);
      } catch (error) {
        setTasksError(error);
      } finally {
        setTasksLoading(false);
        // console.timeEnd("fetchTasks Duration");
      }
    };

    const fetchTeams = async () => {
      try {
        const response = await api.get('/field-teams/get-field-teams', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        const teams = response.data.map(team => ({
          ...team,
          evaluationScore: team.evaluationScore || 0,
          isEvaluated: team.isEvaluated || false,
        }));
        setTeamsData(teams);
      } catch (error) {
        setTeamsError(error);
      } finally {
        setTeamsLoading(false);
      }
    };

    fetchTasks();
    fetchTeams();
  }, [updateTasksList]);

  useEffect(() => {
    if (location.state?.showSnackbar && user) {
      setSnackbarOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, user, navigate, location.pathname]);

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const currentYear = new Date().getFullYear();
  const todayDate = new Date().toLocaleDateString();

  if (tasksLoading || teamsLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: '100vh' }}>
        <MoonLoader color="#3b82f6" size={50} />
      </Box>
    );
  }

  if (tasksError || teamsError) return <Box p={4}><Typography color="error">Error fetching data</Typography></Box>;

  return (
    <Box sx={{ pb: 4, minHeight: "100vh" }}>
      <Container sx={{ pt: 3, px: 0 }}>
        {/* Welcome Snackbar */}
        <Snackbar open={snackbarOpen} autoHideDuration={5000} onClose={handleSnackbarClose}>
          <Alert onClose={handleSnackbarClose} severity="success" variant="filled">
            Hello, {user?.name}!
          </Alert>
        </Snackbar>

        {/* Header Section */}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'start', sm: 'center' }} mb={4} spacing={2}>
          <Box>
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb" sx={{ mb: 1 }}>
              <Link underline="hover" key="1" color="inherit" href="/" sx={{ display: 'flex', alignItems: 'center' }}>
                <DashboardIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Home
              </Link>
              <Typography key="3" color="text.primary">
                Dashboard
              </Typography>
            </Breadcrumbs>
            <Typography variant={isMobile ? "h5" : "h4"} fontWeight="800" color="#1e293b" gutterBottom>
              Overview
            </Typography>
            <Typography variant="body2" color="textSecondary">
              QoS-related tickets statistics from {currentYear} until {todayDate}.
            </Typography>
          </Box>
        </Stack>

        {/* Key Metrics Cards */}
        <Box mb={5}>
          <Suspense fallback={<MoonLoader color="#3b82f6" size={30} />}>
            <Card tasks={tasks} setUpdateTasksList={setUpdateTasksList} />
          </Suspense>
        </Box>

        {/* Charts & Analytics Section */}
        <Box mb={5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" fontWeight="700" color="#334155">
              Weekly QoS Trends
            </Typography>
            <Stack direction="row" spacing={1}>
              <AIInsightButton />
              <ActionPlanButton />
              <AIHistoryButton />
            </Stack>
          </Box>
          <Paper sx={{ p: 0, overflow: 'hidden', borderRadius: 3, bgcolor: '#1a1a1a', border: '1px solid #e2e8f0' }} elevation={0}>
            <Box p={3}>
              <Suspense fallback={<MoonLoader color="#959595" size={30} />}>
                <Chart tasks={tasks} />
              </Suspense>
            </Box>
          </Paper>
        </Box>

        {/* Categories Analysis Tables */}
        <Box mb={5}>
          <Typography variant="h6" fontWeight="700" color="#334155" mb={3}>
            Violation & Reason Analysis
          </Typography>

          <Stack spacing={4}>
            {/* Row 1: Reasons */}
            <Stack direction={isMediumScreen ? "column" : "row"} spacing={3}>
              <Box flex={1}>
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <AllReasonsTable tasks={tasks} />
                </Box>
              </Box>
            </Stack>


          </Stack>
        </Box>

        {/* Detailed Task Management */}
        <Box mb={5}>
          <Typography variant="h6" fontWeight="700" color="#334155" mb={3}>
            Recent Activity & Violations
          </Typography>
          <Stack spacing={4}>
            <Suspense fallback={<MoonLoader color="#3b82f6" size={30} />}>
              <TaskTable tasks={tasks} fieldTeams={teamsData} />
              <TeamViolationTracker tasks={tasks} initialFieldTeams={teamsData} />
            </Suspense>
          </Stack>
        </Box>

        {/* Weekly & Monthly Reports */}
        <Stack spacing={5} mb={5}>
          <Box>
            <Typography variant="h6" fontWeight="700" color="#334155" mb={2}>Weekly Reports</Typography>
            <Suspense fallback={<MoonLoader color="#3b82f6" size={30} />}>
              <WeeklySummaryTable tasks={tasks} fieldTeams={teamsData} />
              <Box mt={3}>
                <WeeklyReasonTable tasks={tasks} />
              </Box>
            </Suspense>
          </Box>

          <Box>
            <Typography variant="h6" fontWeight="700" color="#334155" mb={2}>Monthly Reports</Typography>
            <Suspense fallback={<MoonLoader color="#3b82f6" size={30} />}>
              <MonthlySummaryTable tasks={tasks} fieldTeams={teamsData} />
              <Box mt={3}>
                <MonthlyReasonTable tasks={tasks} />
              </Box>
            </Suspense>
          </Box>
        </Stack>

        {/* Trend Statistics */}
        <Box mb={10}>
          <Typography variant="h6" fontWeight="700" color="#334155" mb={2}>Long-term Trends</Typography>
          <Suspense fallback={<MoonLoader color="#3b82f6" size={30} />}>
            <TrendStatistics tasks={tasks} />
          </Suspense>
        </Box>

        {/* Floating Action Button */}
        <Suspense fallback={null}>
          <SamplesTokenFloatingButton />
        </Suspense>
      </Container>
    </Box>
  );
};

export default Dashboard;