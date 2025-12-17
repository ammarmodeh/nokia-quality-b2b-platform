// src/Dashboard.js
import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Typography, Box, Divider, Snackbar, Alert, Stack, useMediaQuery } from "@mui/material";
import api from "../api/api";
import { useSelector } from "react-redux";
import { MoonLoader } from "react-spinners";
import { SnackbarProvider } from "notistack";
// import { CompanyViolationTable } from "../components/CompanyViolationTable";
import { ActivationTeamRespTable } from "../components/ActivationTeamRespTable";
import { AllReasonsTable } from "../components/AllReasonsTable";
// import { AllResponsiblesTable } from "../components/AllResponsiblesTable";
import { KnowledgeGapReasonsTable } from "../components/KnowledgeGapReasonsTable";
import { CustomerEducationReasonsTable } from "../components/CustomerEducationReasonsTable";
import IssueCategoriesDialog from "../components/IssueCategoriesDialog";
import ReasonCategoriesDialog from "../components/ReasonCategoriesDialog";
// import { prepareWeeklyAnalyticsData } from "../utils/analyticsHelper";
// import ResponsibilityCategoriesDialog from "../components/ResponsibilityCategoriesDialog";
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

  const isMediumScreen = useMediaQuery('(max-width: 760px)');

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await api.get("/tasks/get-all-tasks", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        setTasks(response.data);
      } catch (error) {
        setTasksError(error);
      } finally {
        setTasksLoading(false);
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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: '100%' }}>
        <MoonLoader color="#959595" size={50} />
      </div>
    );
  }

  if (tasksError || teamsError) return <div>Error fetching data</div>;

  return (
    <div style={{ padding: "0", backgroundColor: "#1a1a1a", maxWidth: "1100px", margin: "0 auto", minHeight: "calc(100vh - 55px)", color: "#ffffff" }}>
      {/* Welcome Snackbar */}
      <Snackbar open={snackbarOpen} autoHideDuration={5000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity="success" variant="filled">
          Hello, {user?.name}!
        </Alert>
      </Snackbar>

      {/* Card Section */}
      <Typography variant="h6" align="center" gutterBottom sx={{ fontWeight: 600, color: "#b3b3b3", textAlign: "left", fontSize: "0.75rem" }}>
        These statistics, which are for QoS-related tickets, are recorded from the beginning of {currentYear} until {todayDate}.
      </Typography>
      <Suspense fallback={<MoonLoader color="#959595" size={30} />}>
        <Card tasks={tasks} setUpdateTasksList={setUpdateTasksList} />
      </Suspense>

      <Divider sx={{ margin: "20px 0", borderColor: "#3d3d3d" }} />

      {/* Weekly Count of QoS-Related Detractor & Neutral Customers Section */}
      <Box sx={{ margin: "20px 0" }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 1, mb: isMediumScreen ? "4px" : "20px" }}>
          <Typography sx={{ color: "#b3b3b3", fontSize: isMediumScreen ? "12px" : "15px" }}>
            Weekly Count of QoS-Related Detractor & Neutral Customers
          </Typography>
          <AIInsightButton />
          <ActionPlanButton />
          <AIHistoryButton />
        </Box>
        <Suspense fallback={<MoonLoader color="#959595" size={30} />}>
          <Chart tasks={tasks} />
        </Suspense>
      </Box>

      <Divider sx={{ margin: "20px 0", borderColor: "#3d3d3d" }} />

      {/* Responsive Tables Section */}
      <Box sx={{ margin: "40px 0" }}>
        <Stack spacing={4}>
          {/* Row 1 */}
          <Stack
            direction={isMediumScreen ? "column" : "row"}
            spacing={2}
            alignItems="stretch"
          >
            {/* <Box sx={{ width: isMediumScreen ? "100%" : "50%" }}>
              <CompanyViolationTable tasks={tasks} />
              </Box> */}
            <Box sx={{ width: isMediumScreen ? "100%" : "50%" }}>
              <ActivationTeamRespTable tasks={tasks} />
            </Box>
            <Box sx={{ width: isMediumScreen ? "100%" : "50%" }}>
              <Stack
                // backgroundColor="#ffffff"
                padding={2}
                borderRadius={2}
                direction={'column'}
                sx={{ border: '1px solid #3d3d3d' }}
              >
                <AllReasonsTable tasks={tasks} />
                <Box sx={{
                  backgroundColor: '#2d2d2d',
                  p: 2,
                  borderRadius: '8px',
                  border: '1px solid #3d3d3d',
                  mt: 2
                }}>
                  <Typography variant="body2" sx={{
                    color: '#ffffff',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    How we categorize feedback reasons
                    <ReasonCategoriesDialog />
                  </Typography>
                  <Typography variant="caption" sx={{
                    color: '#b3b3b3',
                    display: 'block',
                    mt: 1
                  }}>
                    Click the info icon to understand our reason categorization methodology.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>

          {/* Row 3 */}
          <Stack
            // backgroundColor="#ffffff"
            padding={2}
            borderRadius={2}
            direction={'column'}
            sx={{ border: '1px solid #3d3d3d' }}
          >
            <Stack
              direction={isMediumScreen ? "column" : "row"}
              spacing={2}
              alignItems="stretch"
            >
              <Box sx={{ width: isMediumScreen ? "100%" : "50%" }}>
                <KnowledgeGapReasonsTable tasks={tasks} />
              </Box>
              <Box sx={{ width: isMediumScreen ? "100%" : "50%" }}>
                <CustomerEducationReasonsTable tasks={tasks} />
              </Box>
            </Stack>
            <Box sx={{
              backgroundColor: '#2d2d2d',
              p: 2,
              borderRadius: '8px',
              border: '1px solid #3d3d3d',
              mt: 2
            }}>
              <Typography variant="body2" sx={{
                color: '#ffffff',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                How we categorize issues
                <IssueCategoriesDialog />
              </Typography>
              <Typography variant="caption" sx={{
                color: '#b3b3b3',
                display: 'block',
                mt: 1
              }}>
                Click the info icon to understand our categorization methodology for customer education vs. technical skills issues.
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Box>

      <Divider sx={{ margin: "20px 0", borderColor: "#3d3d3d" }} />

      <Box sx={{ gap: "20px", display: "flex", flexDirection: "column" }}>
        {/* Tasks Overview */}
        <Suspense fallback={<MoonLoader color="#959595" size={30} />}>
          <TaskTable tasks={tasks} />
          <TeamViolationTracker tasks={tasks} initialFieldTeams={teamsData} />
        </Suspense>
      </Box >

      <Divider sx={{ margin: "20px 0", borderColor: "#3d3d3d" }} />

      {/* Weekly Summary Table */}
      <Box sx={{ margin: "20px 0" }}>
        <Suspense fallback={<MoonLoader color="#959595" size={30} />}>
          <WeeklySummaryTable tasks={tasks} fieldTeams={teamsData} />
          <WeeklyReasonTable tasks={tasks} />
        </Suspense>
      </Box>

      <Divider sx={{ margin: "20px 0", borderColor: "#3d3d3d" }} />

      {/* Monthly Summary Table */}
      <Box sx={{ margin: "20px 0" }}>
        <Suspense fallback={<MoonLoader color="#959595" size={30} />}>
          <MonthlySummaryTable tasks={tasks} fieldTeams={teamsData} />
          <MonthlyReasonTable tasks={tasks} />
        </Suspense>
      </Box>

      <Divider sx={{ margin: "20px 0", borderColor: "#3d3d3d" }} />

      {/* Trend Statistics */}
      <Box sx={{ margin: "20px 0" }}>
        <Suspense fallback={<MoonLoader color="#959595" size={30} />}>
          <TrendStatistics tasks={tasks} />
        </Suspense>
      </Box>

      {/* Samples Token Floating Button */}
      <Suspense fallback={null}>
        <SamplesTokenFloatingButton />
      </Suspense>
    </div >
  );
};

export default Dashboard;