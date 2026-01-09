import { lazy, Suspense, useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";
import {
  Box,
  Stack,
  Typography,
  Grid,
  Card,
  CardContent,
  Autocomplete,
  TextField,
  Divider,
  Fade,
  Skeleton
} from "@mui/material";
import { MoonLoader } from "react-spinners";
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { groupTasksByWeek, calculateReasonTrends, calculateTeamViolationTrends, getWeekDateRange } from "../utils/benchmarkUtils";

// Lazy load components
const ReasonTrend = lazy(() => import("../components/ReasonTrend"));
const TeamViolationTrend = lazy(() => import("../components/TeamViolationTrend"));

const BenchmarkTables = () => {
  const { user } = useSelector((state) => state?.auth || {});
  const location = useLocation() || {};
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [teamsData, setTeamsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(null);

  // Dashboard state
  const [selectedWeek, setSelectedWeek] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken") || "";
        const [tasksRes, teamsRes, settingsRes] = await Promise.all([
          api.get("/tasks/get-all-tasks", { headers: { Authorization: `Bearer ${accessToken}` } }),
          api.get('/field-teams/get-field-teams', { headers: { Authorization: `Bearer ${accessToken}` } }),
          api.get('/settings', { headers: { Authorization: `Bearer ${accessToken}` } })
        ]);

        const tasksData = tasksRes?.data || [];
        const settingsData = settingsRes?.data || null;
        setTasks(tasksData);
        setTeamsData(teamsRes?.data || []);
        setSettings(settingsData);

        // Initialize selected week to the latest week available
        const grouped = groupTasksByWeek(tasksData, settingsData || {});
        const weeks = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));
        if (weeks.length > 0) {
          setSelectedWeek(Number(weeks[0]));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const trends = useMemo(() => {
    if (tasks.length === 0) return { reasons: [], violations: [] };
    const grouped = groupTasksByWeek(tasks, settings || {});
    return {
      reasons: calculateReasonTrends(grouped),
      violations: calculateTeamViolationTrends(grouped)
    };
  }, [tasks, settings]);

  const availableWeeks = useMemo(() => {
    return trends.reasons.map(t => ({
      value: t.week,
      label: `Week ${t.week} (${getWeekDateRange(t.week, settings || {})})`
    })).sort((a, b) => b.value - a.value);
  }, [trends.reasons, settings]);

  const currentStats = useMemo(() => {
    const trend = trends.reasons.find(t => t.week === selectedWeek);
    if (!trend) return null;

    const topReason = Object.entries(trend.reasons).sort((a, b) => b[1] - a[1])[0];
    const violationTrend = trends.violations.find(v => v.week === selectedWeek);
    const topOffender = violationTrend?.violations.sort((a, b) => b.currentWeekViolations - a.currentWeekViolations)[0];

    return {
      totalTasks: trend.totalTasks,
      detractors: trend.categories.detractor,
      topReason: topReason ? topReason[0] : 'N/A',
      topOffender: topOffender ? topOffender.teamName : 'N/A'
    };
  }, [selectedWeek, trends]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="90vh">
        <MoonLoader color="#7b68ee" size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4} display="flex" justifyContent="center">
        <Card sx={{ bgcolor: '#2d2d2d', border: '1px solid #f44336' }}>
          <CardContent>
            <Typography variant="h6" color="error">Error loading data</Typography>
            <Typography color="#b3b3b3">{error.message}</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const colors = {
    primary: "#7b68ee",
    background: "#1a1a1a",
    surface: "#252525",
    border: "#3d3d3d",
    textPrimary: "#ffffff",
    textSecondary: "#b3b3b3",
    success: "#4caf50",
    error: "#f44336",
    warning: "#ff9800",
  };

  return (
    <Box sx={{
      p: { xs: 2, md: 4 },
      bgcolor: colors.background,
      minHeight: "100vh",
      color: colors.textPrimary
    }}>
      <Fade in={true} timeout={800}>
        <Stack spacing={4}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: colors.primary, letterSpacing: '-0.02em' }}>
                Benchmark Analytics
              </Typography>
              <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                Deep dive into weekly performance and violation trends
              </Typography>
            </Box>

            <Autocomplete
              options={availableWeeks}
              value={availableWeeks.find(w => w.value === selectedWeek) || null}
              onChange={(e, v) => setSelectedWeek(v?.value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Analysis Week"
                  sx={{
                    minWidth: 300,
                    "& .MuiOutlinedInput-root": {
                      bgcolor: colors.surface,
                      "& fieldset": { borderColor: colors.border },
                      "&:hover fieldset": { borderColor: colors.primary },
                    },
                    "& .MuiInputLabel-root": { color: colors.textSecondary },
                    "& input": { color: colors.textPrimary }
                  }}
                />
              )}
            />
          </Stack>

          <Divider sx={{ borderColor: colors.border }} />

          {/* Key Metrics */}
          <Grid container spacing={3}>
            {[
              { label: 'Total Assessments', value: currentStats?.totalTasks, icon: <AssignmentIcon />, color: colors.primary },
              { label: 'Total Detractors', value: currentStats?.detractors, icon: <ErrorOutlineIcon />, color: colors.error },
              { label: 'Top Root Cause', value: currentStats?.topReason, icon: <TrendingUpIcon />, color: colors.warning },
              { label: 'Main Offender', value: currentStats?.topOffender, icon: <PeopleIcon />, color: colors.success },
            ].map((stat, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 4 }}>
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${stat.color}15`, color: stat.color }}>
                        {stat.icon}
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 600, textTransform: 'uppercase' }}>
                          {stat.label}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: colors.textPrimary }}>
                          {stat.value}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Analysis Sections */}
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 4, overflow: 'visible' }}>
                <CardContent sx={{ p: 0 }}>
                  <Typography variant="h6" sx={{ p: 3, fontWeight: 700, borderBottom: `1px solid ${colors.border}` }}>
                    Reason Analysis & Trends
                  </Typography>
                  <Suspense fallback={<Box p={4}><Skeleton variant="rectangular" height={400} sx={{ bgcolor: colors.border }} /></Box>}>
                    <ReasonTrend tasks={tasks} selectedWeek={selectedWeek} settings={settings} />
                  </Suspense>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 4, overflow: 'visible' }}>
                <CardContent sx={{ p: 0 }}>
                  <Typography variant="h6" sx={{ p: 3, fontWeight: 700, borderBottom: `1px solid ${colors.border}` }}>
                    Team Violation Repository
                  </Typography>
                  <Suspense fallback={<Box p={4}><Skeleton variant="rectangular" height={400} sx={{ bgcolor: colors.border }} /></Box>}>
                    <TeamViolationTrend tasks={tasks} selectedWeek={selectedWeek} settings={settings} />
                  </Suspense>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </Fade>
    </Box>
  );
};

export default BenchmarkTables;