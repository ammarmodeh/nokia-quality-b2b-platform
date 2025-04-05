import { lazy, Suspense, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";
import { Box, Stack, Typography } from "@mui/material";
import { MoonLoader } from "react-spinners";

// Lazy load components
const ReasonTrend = lazy(() => import("../components/ReasonTrend"));
const TeamViolationTrend = lazy(() => import("../components/TeamViolationTrend"));

const BenchmarkTables = () => {
  // Safely get user from Redux store with default value
  const { user } = useSelector((state) => state?.auth || {});
  const location = useLocation() || {};
  const navigate = useNavigate();

  // State with proper initial values
  const [tasks, setTasks] = useState([]);
  const [teamsData, setTeamsData] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [tasksError, setTasksError] = useState(null);
  const [teamsError, setTeamsError] = useState(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken") || "";
        const response = await api.get("/tasks/get-all-tasks", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setTasks(response?.data || []);
      } catch (error) {
        setTasksError(error instanceof Error ? error : new Error('Failed to fetch tasks'));
      } finally {
        setTasksLoading(false);
      }
    };

    const fetchTeams = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken") || "";
        const response = await api.get('/field-teams/get-field-teams', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const teams = (response?.data || []).map(team => ({
          ...team,
          evaluationScore: team.evaluationScore || 0,
          isEvaluated: team.isEvaluated || false,
        }));
        setTeamsData(teams);
      } catch (error) {
        setTeamsError(error instanceof Error ? error : new Error('Failed to fetch teams'));
      } finally {
        setTeamsLoading(false);
      }
    };

    fetchTasks();
    fetchTeams();
  }, []);

  useEffect(() => {
    // Safely check location.state and user
    if ((location?.state?.showSnackbar) && user) {
      navigate(location.pathname || "/", {
        replace: true,
        state: {}
      });
    }
  }, [location?.state, user, navigate, location?.pathname]);

  // Handle loading and error states
  if (tasksLoading || teamsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <MoonLoader color="#959595" size={50} />
      </Box>
    );
  }

  if (tasksError || teamsError) {
    return (
      <Box padding="20px" color="error.main">
        <Typography variant="h6">Error loading data</Typography>
        <Typography>
          {tasksError?.message || teamsError?.message || "Unknown error occurred"}
        </Typography>
      </Box>
    );
  }

  return (
    <div style={{
      padding: "0px 20px",
      backgroundColor: "#121212",
      maxWidth: "1000px",
      margin: "0 auto",
      minHeight: "calc(100vh - 55px)",
      color: "#ffffff"
    }}>
      {/* Reason Trends */}
      <Stack sx={{ margin: "20px 0" }}>
        <Typography sx={{ padding: "16px 0", color: "#ffffff" }} variant="h5">
          Reason Table
        </Typography>
        <Suspense fallback={<MoonLoader color="#959595" size={30} />}>
          <ReasonTrend tasks={tasks || []} />
        </Suspense>
      </Stack>

      {/* Team Violation Trends */}
      <Box sx={{ margin: "20px 0" }}>
        <Typography sx={{ padding: "16px 0", color: "#ffffff" }} variant="h5">
          Team Violations Table
        </Typography>
        <Suspense fallback={<MoonLoader color="#959595" size={30} />}>
          <TeamViolationTrend tasks={tasks || []} teams={teamsData || []} />
        </Suspense>
      </Box>
    </div>
  );
};

export default BenchmarkTables;