// src/Dashboard.js
import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Typography, Box, Divider, Snackbar, Alert, Stack, useMediaQuery, Breadcrumbs, Link, Container, Paper, Button } from "@mui/material";
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DashboardIcon from '@mui/icons-material/Dashboard';
import api from "../api/api";
import { useSelector } from "react-redux";
import { MoonLoader } from "react-spinners";
// import { SnackbarProvider } from "notistack";
// import { CompanyViolationTable } from "../components/CompanyViolationTable";
import { AllReasonsTable } from "../components/AllReasonsTable";
import { AllOwnersTable } from "../components/AllOwnersTable";
import IssueCategoriesDialog from "../components/IssueCategoriesDialog";
import ReasonCategoriesDialog from "../components/ReasonCategoriesDialog";
import AIInsightButton from "../components/AIInsightButton";
import ActionPlanButton from "../components/ActionPlanButton";
import AIHistoryButton from "../components/AIHistoryButton";
import { alpha } from "@mui/material/styles";

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
const NPSSummaryCard = lazy(() => import("../components/NPSSummaryCard"));

const Dashboard = () => {
  const { user } = useSelector((state) => state?.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [updateTasksList, setUpdateTasksList] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [teamsData, setTeamsData] = useState([]);
  const [samplesData, setSamplesData] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [tasksError, setTasksError] = useState(null);
  const [teamsError, setTeamsError] = useState(null);
  const [settings, setSettings] = useState(null);

  const isMediumScreen = useMediaQuery('(max-width: 900px)');
  const isMobile = useMediaQuery('(max-width: 600px)');

  const currentYear = new Date().getFullYear();
  const todayDate = new Date().toLocaleDateString();

  useEffect(() => {
    const fetchTasks = async () => {
      // console.time("fetchTasks Duration");
      try {
        const response = await api.get("/tasks/get-all-tasks", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        setTasks(response.data);
        console.log("Frontend - Sample task data:", {
          slid: response.data[0]?.slid,
          subReason: response.data[0]?.subReason,
          rootCause: response.data[0]?.rootCause,
          reason: response.data[0]?.reason
        });
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

    const fetchSamples = async () => {
      try {
        const response = await api.get(`/samples-token/${currentYear}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        setSamplesData(response.data || []);
      } catch (error) {
        console.error("Error fetching samples:", error);
      }
    };

    const fetchSettings = async () => {
      try {
        const response = await api.get("/settings");
        setSettings(response.data);
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };

    fetchTasks();
    fetchTeams();
    fetchSamples();
    fetchSettings();
  }, [updateTasksList, currentYear]);

  useEffect(() => {
    if (location.state?.showSnackbar && user) {
      setSnackbarOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, user, navigate, location.pathname]);

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };


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
      <Box sx={{ pt: 3 }}>
        {/* Welcome Snackbar */}
        <Snackbar open={snackbarOpen} autoHideDuration={5000} onClose={handleSnackbarClose}>
          <Alert onClose={handleSnackbarClose} severity="success" variant="filled">
            Hello, {user?.name}!
          </Alert>
        </Snackbar>

        {/* Premium Header Section */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            mb: 5,
            borderRadius: 4,
            background: 'linear-gradient(135deg, #0f172a4b 0%, #1e293b 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '4px',
              height: '100%',
              backgroundColor: '#3b82f6',
            }
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={3}
          >
            <Box sx={{ flex: 1 }}>
              <Breadcrumbs
                separator={<NavigateNextIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.3)' }} />}
                aria-label="breadcrumb"
                sx={{ mb: 2 }}
              >
                <Link
                  underline="hover"
                  color="rgba(255,255,255,0.5)"
                  href="/"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    transition: 'color 0.2s',
                    '&:hover': { color: '#3b82f6' }
                  }}
                >
                  <DashboardIcon sx={{ mr: 0.75, fontSize: '1rem' }} />
                  Home
                </Link>
                <Typography
                  sx={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#f8fafc'
                  }}
                >
                  Dashboard
                </Typography>
              </Breadcrumbs>

              <Typography
                variant={isMobile ? "h5" : "h3"}
                fontWeight="600"
                sx={{
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Box component="span" sx={{ color: '#678fcfff', fontWeight: 700, fontFamily: 'Poppins' }}>Reach</Box> Quality Analytics Portal
                {!isMobile && (
                  <Box sx={{
                    height: 8,
                    width: 8,
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    display: 'inline-block',
                    mt: 1
                  }} />
                )}
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: '#94a3b8',
                  fontWeight: 500,
                  maxWidth: '600px',
                  lineHeight: 1.6
                }}
              >
                QoS-related tickets statistics from <span style={{ color: '#ffffff', fontWeight: 700 }}>2026</span> until <span style={{ color: '#ffffff', fontWeight: 700 }}>{todayDate}</span>.
              </Typography>
            </Box>

            {/* Partner Logos Section */}
            <Stack
              direction="row"
              spacing={4}
              alignItems="center"
              sx={{
                p: 2,
                borderRadius: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >

              <Stack direction="row" spacing={3} alignItems="center">
                <Box
                  component="img"
                  src="/images/reach_logo_new.svg"
                  alt="Reach Logo"
                  sx={{
                    height: { xs: 35, md: 45 },
                    filter: 'brightness(0) invert(1)', // Make logo white if it's dark
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      filter: 'none', // Show original colors on hover
                      transform: 'scale(1.05)'
                    }
                  }}
                />
                <Divider orientation="vertical" flexItem sx={{ height: 45, my: 'auto', borderColor: 'rgba(255,255,255,0.1)' }} />
                <Box
                  component="img"
                  src="/images/Orange-Logo.png"
                  alt="Orange Logo"
                  sx={{
                    height: { xs: 30, md: 40 },
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)'
                    }
                  }}
                />
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        {/* Key Metrics Cards */}
        <Box mb={5}>
          <Suspense fallback={<MoonLoader color="#3b82f6" size={30} />}>
            <Card tasks={tasks} setUpdateTasksList={setUpdateTasksList} />
          </Suspense>
        </Box>

        {/* NPS Performance Section */}
        <Box mb={5}>
          <Suspense fallback={<MoonLoader color="#3b82f6" size={30} />}>
            <NPSSummaryCard tasks={tasks} samplesData={samplesData} teamsData={teamsData} settings={settings} />
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
                <Chart tasks={tasks} samplesData={samplesData} />
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
            {/* Row 1: Reasons & Owners */}
            <Stack direction={isMediumScreen ? "column" : "row"} spacing={3}>
              <Box flex={1} minWidth={0}>
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <AllReasonsTable tasks={tasks} />
                </Box>
              </Box>
              <Box flex={1} minWidth={0}>
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <AllOwnersTable tasks={tasks} />
                </Box>
              </Box>
            </Stack>


          </Stack>
        </Box>

        {/* Detailed Task Management */}
        <Box mb={5}>
          {/* <Typography variant="h6" fontWeight="700" color="#334155" mb={3}>
            Recent Activity & Violations
          </Typography> */}
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
            <Typography variant="h5" fontWeight="800" color="#5d79a7ff">
              Weekly Reports Overview
            </Typography>
            <Suspense fallback={<MoonLoader color="#3b82f6" size={30} />}>
              <WeeklySummaryTable tasks={tasks} fieldTeams={teamsData} />
              <Box mt={3}>
                <WeeklyReasonTable tasks={tasks} />
              </Box>
            </Suspense>
          </Box>

          <Box>
            <Typography variant="h5" fontWeight="800" color="#5d79a7ff">
              Monthly Reports Overview
            </Typography>
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
          <Suspense fallback={<MoonLoader color="#3b82f6" size={30} />}>
            <TrendStatistics tasks={tasks} />
          </Suspense>
        </Box>

        {/* Floating Action Button */}
        <Suspense fallback={null}>
          <SamplesTokenFloatingButton />
        </Suspense>
      </Box>
    </Box>
  );
};

export default Dashboard;