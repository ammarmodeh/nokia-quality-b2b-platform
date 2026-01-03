import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  TablePagination,
  Autocomplete,
  Tabs,
  Tab,
  useMediaQuery,
  Button,
  Divider,
  Grid
} from "@mui/material";
import {
  ArrowBack,
  Quiz,
  Assignment,
  BarChart,
} from '@mui/icons-material';
import api from "../api/api";
import {
  BarChart as RechartsBarChart,
  Bar,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart,
  Pie,
  XAxis,
  YAxis
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Assessment,
  Timeline,
  PieChart as PieChartIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import FieldTeamTicketsForPortalReview from "../components/FieldTeamTicketsForPortalReview";

const FieldTeamPortal = () => {
  // const user = useSelector((state) => state?.auth?.user);
  const [fieldTeams, setFieldTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  // console.log({ selectedTeam });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Quiz results state
  const [quizResults, setQuizResults] = useState([]);
  const [quizPage, setQuizPage] = useState(0);
  const [quizRowsPerPage, setQuizRowsPerPage] = useState(10);

  // On-the-job assessments state
  const [jobAssessments, setJobAssessments] = useState([]);
  const [jobPage, setJobPage] = useState(0);
  const [jobRowsPerPage, setJobRowsPerPage] = useState(10);

  // Lab assessments state
  const [labAssessments, setLabAssessments] = useState([]);
  const [labPage, setLabPage] = useState(0);
  const [labRowsPerPage, setLabRowsPerPage] = useState(10);

  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');

  // Colors for dark mode UI consistency
  const colors = {
    background: '#2d2d2d',
    // surface: '#ffffff',
    surfaceElevated: '#252525',
    border: '#e5e7eb',
    primary: '#7b68ee',
    primaryHover: 'rgba(62, 166, 255, 0.08)',
    textPrimary: '#ffffff',
    textSecondary: '#6b7280',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    tableBg: '#2d2d2d',
    tableHeaderBg: '#252525',
    tableRowHover: '#2a2a2a',
    chartGrid: '#f3f4f6333',
  };

  useEffect(() => {
    const fetchFieldTeams = async () => {
      try {
        setLoading(true);
        // Fetch from both endpoints and combine results
        const [fieldTeamsRes, quizTeamsRes] = await Promise.all([
          api.get("/field-teams/get-field-teams", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }),
          api.get("/quiz-results/teams/all", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          })
        ]);

        // console.log({ fieldTeamsRes, quizTeamsRes });

        // Combine and deduplicate teams
        const combinedTeams = [
          ...fieldTeamsRes.data,
          ...quizTeamsRes.data.data.map(qt => ({
            _id: qt.teamId,
            teamName: qt.teamName,
            teamCompany: "N/A" // Default value for quiz teams
          }))
        ];

        // Remove duplicates
        const uniqueTeams = combinedTeams.reduce((acc, team) => {
          if (!acc.some(t => t._id === team._id)) {
            acc.push(team);
          }
          return acc;
        }, []);

        setFieldTeams(uniqueTeams);
      } catch (error) {
        console.error("Error fetching field teams:", error);
        setError("Failed to fetch field teams");
      } finally {
        setLoading(false);
      }
    };

    fetchFieldTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      const fetchTeamAssessments = async () => {
        try {
          setLoading(true);
          const [quizRes, jobRes] = await Promise.all([
            api.get(`/quiz-results?teamId=${selectedTeam._id}`, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              }
            }),
            api.get(`/on-the-job-assessments/field-team/${selectedTeam._id}`, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              }
            })
          ]);

          // console.log("Quiz Results:", quizRes.data);
          // console.log("Job Assessments:", jobRes.data);

          // Correctly set the quizResults state
          setQuizResults(quizRes.data.data);
          setJobAssessments(jobRes.data);

          // Fetch Lab Assessments
          const labRes = await api.get(`/lab-assessments/team/${selectedTeam._id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            }
          });
          setLabAssessments(labRes.data);

        } catch (error) {
          console.error("Error fetching assessments:", error);
          setError("Failed to fetch assessments");
        } finally {
          setLoading(false);
        }
      };

      fetchTeamAssessments();
    } else {
      setQuizResults([]);
      setJobAssessments([]);
      setLabAssessments([]);
    }
  }, [selectedTeam]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get("/settings");
        setSettings(response.data);
      } catch (err) {
        console.error("Failed to fetch settings");
      }
    };
    fetchSettings();
  }, []);

  const getAssessmentStatus = (score, type = 'general') => {
    const thresholds = settings?.thresholds || { pass: 85, average: 70, fail: 50, quizPassScore: 70, labPassScore: 75 };

    let passThreshold = thresholds.pass;
    if (type === 'quiz') passThreshold = thresholds.quizPassScore || 70;
    if (type === 'lab') passThreshold = thresholds.labPassScore || 75;

    if (score >= passThreshold) return { label: "Excellent", color: "#2e7d32" };
    if (score >= thresholds.average) return { label: "Pass (Minor Comments)", color: "#66bb6a" };
    if (score >= thresholds.fail) return { label: "Pass (With Comments)", color: "#ffa726" };
    return { label: "Fail", color: "#d32f2f" };
  };

  const getPerformanceColor = (score, type = 'general') => {
    return getAssessmentStatus(score, type).color;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateAverageScore = (results) => {
    if (results.length === 0) return 0;
    const totalScore = results.reduce((sum, result) => {
      return sum + (result.overallScore || result.percentage || 0);
    }, 0);
    return totalScore / results.length;
  };

  const calculateMedianScore = (results) => {
    const scores = results.map((result) => result.overallScore || result.percentage || 0).sort((a, b) => a - b);
    const mid = Math.floor(scores.length / 2);
    return scores.length % 2 !== 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
  };

  const calculateStandardDeviation = (results) => {
    const average = calculateAverageScore(results);
    const variance = results.reduce((sum, result) => {
      const score = result.overallScore || result.percentage || 0;
      return sum + Math.pow(score - average, 2);
    }, 0) / results.length;
    return Math.sqrt(variance);
  };

  const calculatePercentageAboveThreshold = (results, threshold) => {
    const aboveThreshold = results.filter((result) => (result.overallScore || result.percentage || 0) >= threshold).length;
    return (aboveThreshold / results.length) * 100;
  };

  const calculateHighestScore = (results) => {
    if (results.length === 0) return 0;
    return Math.max(...results.map(result => result.overallScore || result.percentage || 0));
  };

  const calculateLowestScore = (results) => {
    if (results.length === 0) return 0;
    return Math.min(...results.map(result => result.overallScore || result.percentage || 0));
  };

  const getScoreDistribution = (results) => {
    const distribution = {
      '0-49': 0,
      '50-74': 0,
      '75-89': 0,
      '90-100': 0
    };

    results.forEach(result => {
      const score = result.overallScore || result.percentage || 0;
      if (score >= 90) {
        distribution['90-100']++;
      } else if (score >= 75) {
        distribution['75-89']++;
      } else if (score >= 50) {
        distribution['50-74']++;
      } else {
        distribution['0-49']++;
      }
    });

    return distribution;
  };

  const renderLineChart = (data, dataKey, color = colors.primary) => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} style={{ backgroundColor: colors.surfaceElevated, borderRadius: '12px', padding: '10px' }}>
        <defs>
          <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} vertical={false} />
        <XAxis
          dataKey="date"
          stroke={colors.textSecondary}
          fontSize={10}
          tick={{ fill: colors.textSecondary }}
        />
        <YAxis
          stroke={colors.textSecondary}
          fontSize={10}
          tick={{ fill: colors.textSecondary }}
          domain={[0, 100]}
        />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: '#252525',
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
            color: colors.textPrimary
          }}
          itemStyle={{ color: color }}
          cursor={{ stroke: color, strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fillOpacity={1}
          fill={`url(#color${dataKey})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderBarChart = (data) => (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data} style={{ backgroundColor: colors.surfaceElevated, borderRadius: '12px', padding: '10px' }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} vertical={false} />
        <XAxis
          dataKey="range"
          stroke={colors.textSecondary}
          fontSize={10}
        />
        <YAxis
          stroke={colors.textSecondary}
          fontSize={10}
        />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: '#252525',
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
            color: colors.textPrimary
          }}
        />
        <Bar dataKey="count" fill={colors.primary} radius={[4, 4, 0, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );

  const quizData = quizResults.map(result => ({
    date: result.submittedAt ? formatDate(result.submittedAt) : 'N/A',
    score: result.percentage
  }));

  const jobData = jobAssessments.map(assessment => ({
    date: formatDate(assessment.assessmentDate),
    score: assessment.overallScore
  }));

  const quizDistribution = getScoreDistribution(quizResults);
  const jobDistribution = getScoreDistribution(jobAssessments);

  const quizDistributionData = Object.keys(quizDistribution).map(range => ({
    range,
    count: quizDistribution[range]
  }));

  const jobDistributionData = Object.keys(jobDistribution).map(range => ({
    range,
    count: jobDistribution[range]
  }));

  // Custom styles for MUI components to ensure dark mode consistency
  const darkThemeStyles = {
    paper: {
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      border: `1px solid ${colors.border}`,
    },
    table: {
      backgroundColor: colors.tableBg,
    },
    tableHead: {
      backgroundColor: colors.tableHeaderBg,
    },
    tableCell: {
      color: colors.textPrimary,
      borderBottom: `1px solid ${colors.border}`,
    },
    tablePagination: {
      color: colors.textPrimary,
      "& .MuiSvgIcon-root": {
        color: colors.textPrimary,
      },
    },
    card: {
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      border: `1px solid ${colors.border}`,
    },
    tabs: {
      backgroundColor: colors.surface,
      "& .MuiTab-root": {
        color: colors.textSecondary,
      },
      "& .Mui-selected": {
        color: colors.primary,
      },
      "& .MuiTabs-indicator": {
        backgroundColor: colors.primary,
      },
    },
    autocomplete: {
      "& .MuiOutlinedInput-root": {
        backgroundColor: colors.surfaceElevated,
        "& fieldset": {
          borderColor: colors.border,
        },
        "&:hover fieldset": {
          borderColor: colors.primary,
        },
      },
      "& .MuiAutocomplete-paper": {
        backgroundColor: colors.surface,
        color: colors.textPrimary,
      },
    },
    chip: {
      borderColor: colors.border,
    },
  };

  return (
    <Box sx={{
      // backgroundColor: colors.background,
      minHeight: '100vh',
      maxWidth: '1100px',
      mx: 'auto',
      overflowX: 'hidden',
      color: colors.textPrimary,
      p: 2,
      px: isMobile ? 0 : undefined
    }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/')}
        sx={{
          mb: 2,
          color: colors.primary,
          '&:hover': {
            backgroundColor: colors.primaryHover
          }
        }}
      >
        Back to Dashboard
      </Button>

      {/* Header */}
      <Typography variant="h4" gutterBottom sx={{
        color: colors.primary,
        fontWeight: 'bold',
        mb: 4
      }}>
        Field Team Assessment Portal
      </Typography>

      {/* Team Selection */}
      <Paper sx={{
        p: 3,
        mb: 3,
        ...darkThemeStyles.paper,
      }}>
        <Autocomplete
          options={fieldTeams}
          getOptionLabel={(option) => `${option.teamName} (${option.teamCompany})`}
          value={selectedTeam}
          onChange={(event, newValue) => {
            setSelectedTeam(newValue);
            // Reset pagination when team changes
            setQuizPage(0);
            setJobPage(0);
          }}
          disabled={loading}
          fullWidth
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Field Team"
              variant="outlined"
              InputLabelProps={{
                style: {
                  color: colors.textSecondary,
                  fontSize: '0.8rem',
                  top: '-7px',
                },
              }}
              InputProps={{
                ...params.InputProps,
                style: {
                  color: colors.textPrimary,
                  height: '36px',
                  fontSize: '0.8rem',
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: colors.border,
                  },
                  '&:hover fieldset': {
                    borderColor: colors.primary,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: colors.primary,
                  },
                  '&.Mui-disabled fieldset': {
                    borderColor: `${colors.border}80`,
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '8px 12px',
                  height: 'auto',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: colors.primary,
                  top: '1px',
                },
                '& input': {
                  caretColor: colors.primary,
                },
                '& input:-webkit-autofill': {
                  WebkitBoxShadow: `0 0 0 1000px ${colors.surface} inset`,
                  WebkitTextFillColor: colors.textPrimary,
                  transition: 'background-color 5000s ease-in-out 0s',
                },
              }}
            />
          )}
          sx={{
            '& .MuiAutocomplete-popupIndicator': {
              color: colors.textSecondary,
              '&:hover': {
                backgroundColor: colors.primaryHover,
              }
            },
            '& .MuiAutocomplete-clearIndicator': {
              color: colors.textSecondary,
              '&:hover': {
                backgroundColor: colors.primaryHover,
              }
            },
          }}
          componentsProps={{
            paper: {
              sx: {
                backgroundColor: colors.surfaceElevated,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
                marginTop: '4px',
                '& .MuiAutocomplete-option': {
                  '&[aria-selected="true"]': {
                    backgroundColor: `${colors.primary}22`,
                  },
                  '&[aria-selected="true"].Mui-focused': {
                    backgroundColor: `${colors.primary}33`,
                  },
                  '&.Mui-focused': {
                    backgroundColor: colors.primaryHover,
                  },
                },
              },
            },
            popper: {
              sx: {
                '& .MuiAutocomplete-listbox': {
                  backgroundColor: colors.surfaceElevated,
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: colors.surface,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: colors.border,
                    borderRadius: '4px',
                  },
                },
              },
            },
          }}
        />
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, backgroundColor: colors.surfaceElevated, color: colors.textPrimary }}>
          {error}
        </Alert>
      )}

      {selectedTeam && (
        <>
          <FieldTeamTicketsForPortalReview teamId={selectedTeam?._id} teamName={selectedTeam?.teamName} />
          <Divider sx={{ my: 4, borderColor: colors.border }} />
        </>
      )}

      {/* Assessment Content */}
      {selectedTeam && (
        <Box>
          {/* Tabs for different assessment types */}
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{ mb: 3, ...darkThemeStyles.tabs, }}
          >
            <Tab
              label="Overview"
              icon={<BarChart fontSize="small" />}
              iconPosition="start"
            />
            <Tab
              label="Theoretical"
              icon={<Quiz fontSize="small" />}
              iconPosition="start"
            />
            <Tab
              label="Practical"
              icon={<Assignment fontSize="small" />}
              iconPosition="start"
            />
            <Tab
              label="Lab"
              icon={<Assessment fontSize="small" />}
              iconPosition="start"
            />
          </Tabs>

          {/* OVERVIEW TAB */}
          {activeTab === 0 && (
            <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
              <Grid container spacing={3}>
                {/* Scorecards */}
                {[
                  { title: 'Theoretical Avg', score: calculateAverageScore(quizResults), icon: <Quiz />, color: colors.primary, data: quizResults, type: 'quiz' },
                  { title: 'Practical Avg', score: calculateAverageScore(jobAssessments), icon: <Assignment />, color: colors.success, data: jobAssessments, type: 'general' },
                  { title: 'Lab Avg', score: calculateAverageScore(labAssessments), icon: <Assessment />, color: colors.warning, data: labAssessments, type: 'lab' }
                ].map((card, i) => (
                  <Grid item xs={12} md={4} key={i}>
                    <Paper sx={{
                      p: 3,
                      ...darkThemeStyles.paper,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '4px',
                        height: '100%',
                        bgcolor: card.color
                      }
                    }}>
                      <Typography variant="overline" color={colors.textSecondary}>{card.title}</Typography>
                      <Typography variant="h3" sx={{ fontWeight: 'bold', color: getAssessmentStatus(card.score, card.type).color, my: 1 }}>
                        {Math.round(card.score)}%
                      </Typography>
                      <Chip
                        label={getAssessmentStatus(card.score, card.type).label}
                        size="small"
                        sx={{ bgcolor: `${getAssessmentStatus(card.score, card.type).color}22`, color: getAssessmentStatus(card.score, card.type).color, border: `1px solid ${getAssessmentStatus(card.score, card.type).color}` }}
                      />
                      {card.data.length > 1 && (() => {
                        const current = card.data[0]?.percentage || card.data[0]?.overallScore || card.data[0]?.totalScore || 0;
                        const prev = card.data[1]?.percentage || card.data[1]?.overallScore || card.data[1]?.totalScore || 0;
                        const diff = current - prev;
                        return (
                          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {diff > 0 ? (
                              <Typography variant="caption" sx={{ color: colors.success, display: 'flex', alignItems: 'center' }}>
                                <TrendingUp fontSize="inherit" /> +{diff}% Improvement
                              </Typography>
                            ) : diff < 0 ? (
                              <Typography variant="caption" sx={{ color: colors.error, display: 'flex', alignItems: 'center' }}>
                                <TrendingDown fontSize="inherit" /> {diff}% Degradation
                              </Typography>
                            ) : (
                              <Typography variant="caption" color={colors.textSecondary}>Stable</Typography>
                            )}
                          </Box>
                        );
                      })()}
                    </Paper>
                  </Grid>
                ))}

                {/* Combined Trend Chart */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, ...darkThemeStyles.paper }}>
                    <Typography variant="h6" sx={{ mb: 2, color: colors.primary }}>Performance Overview</Typography>
                    <Box sx={{ height: 350 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={Array.from({ length: Math.max(quizResults.length, jobAssessments.length, labAssessments.length) }).map((_, i) => ({
                          index: i,
                          theoretical: quizResults[i]?.percentage || null,
                          practical: jobAssessments[i]?.overallScore || null,
                          lab: labAssessments[i]?.totalScore || null,
                        })).reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} vertical={false} />
                          <XAxis dataKey="index" hide />
                          <YAxis domain={[0, 100]} stroke={colors.textSecondary} fontSize={10} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#252525', border: `1px solid ${colors.border}`, borderRadius: '12px' }} />
                          <Area type="monotone" dataKey="theoretical" stroke={colors.primary} fill={colors.primary} fillOpacity={0.1} strokeWidth={2} name="Theoretical" />
                          <Area type="monotone" dataKey="practical" stroke={colors.success} fill={colors.success} fillOpacity={0.1} strokeWidth={2} name="Practical" />
                          <Area type="monotone" dataKey="lab" stroke={colors.warning} fill={colors.warning} fillOpacity={0.1} strokeWidth={2} name="Lab" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Theoretical (Quiz) Assessments */}
          {activeTab === 1 && (
            <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" sx={{ color: colors.primary }}>Theoretical Assessments</Typography>
                <Chip
                  label={`Avg: ${Math.round(calculateAverageScore(quizResults))}%`}
                  variant="outlined"
                  sx={{ borderColor: getPerformanceColor(calculateAverageScore(quizResults), 'quiz'), color: getPerformanceColor(calculateAverageScore(quizResults), 'quiz') }}
                />
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress sx={{ color: colors.primary }} />
                </Box>
              ) : quizResults.length > 0 ? (
                <>
                  <TableContainer component={Paper} sx={{
                    mb: 2,
                    ...darkThemeStyles.paper,
                    "& .MuiTable-root": darkThemeStyles.table
                  }}>
                    <Table>
                      <TableHead sx={darkThemeStyles.tableHead}>
                        <TableRow>
                          <TableCell sx={darkThemeStyles.tableCell}>Date</TableCell>
                          <TableCell sx={darkThemeStyles.tableCell}>Quiz Code</TableCell>
                          <TableCell sx={darkThemeStyles.tableCell}>Score</TableCell>
                          <TableCell sx={darkThemeStyles.tableCell}>Correct Answers</TableCell>
                          <TableCell sx={darkThemeStyles.tableCell}>Percentage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {quizResults
                          .slice(quizPage * quizRowsPerPage, quizPage * quizRowsPerPage + quizRowsPerPage)
                          .map((result) => (
                            <TableRow key={result._id}
                              sx={{
                                "&:hover": {
                                  backgroundColor: colors.tableRowHover
                                }
                              }}
                            >
                              <TableCell sx={darkThemeStyles.tableCell}>{formatDate(result.submittedAt)}</TableCell>
                              <TableCell sx={darkThemeStyles.tableCell}>{result.quizCode}</TableCell>
                              <TableCell sx={darkThemeStyles.tableCell}>
                                <Chip
                                  label={result.score}
                                  sx={{
                                    bgcolor: `${getPerformanceColor(result.percentage)}22`,
                                    color: getPerformanceColor(result.percentage),
                                    borderColor: getPerformanceColor(result.percentage),
                                    fontWeight: 'bold'
                                  }}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell sx={darkThemeStyles.tableCell}>{result.correctAnswers}/{result.totalQuestions}</TableCell>
                              <TableCell sx={darkThemeStyles.tableCell}>{result.percentage}%</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    rowsPerPageOptions={[10, 25, 50]}
                    component="div"
                    count={quizResults.length}
                    rowsPerPage={quizRowsPerPage}
                    page={quizPage}
                    onPageChange={(e, newPage) => setQuizPage(newPage)}
                    onRowsPerPageChange={(e) => {
                      setQuizRowsPerPage(parseInt(e.target.value, 10));
                      setQuizPage(0);
                    }}
                    sx={{
                      ...darkThemeStyles.tablePagination,
                      color: colors.textPrimary,
                      "& .MuiTablePagination-select": {
                        color: colors.textPrimary
                      },
                      "& .MuiTablePagination-selectIcon": {
                        color: colors.textPrimary
                      }
                    }}
                    labelRowsPerPage={
                      <Typography color={colors.textPrimary}>Rows per page:</Typography>
                    }
                  />
                </>
              ) : (
                <Paper sx={{ p: 3, textAlign: 'center', ...darkThemeStyles.paper }}>
                  <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                    No theoretical assessments found for this team
                  </Typography>
                </Paper>
              )}
            </Box>
          )}

          {/* Practical (On-the-Job) Assessments */}
          {activeTab === 2 && (
            <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" sx={{ color: colors.primary }}>Practical Assessments</Typography>
                <Chip
                  label={`Avg: ${Math.round(calculateAverageScore(jobAssessments))}%`}
                  variant="outlined"
                  sx={{ borderColor: getPerformanceColor(calculateAverageScore(jobAssessments)), color: getPerformanceColor(calculateAverageScore(jobAssessments)) }}
                />
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress sx={{ color: colors.primary }} />
                </Box>
              ) : jobAssessments.length > 0 ? (
                <>
                  <TableContainer component={Paper} sx={{
                    mb: 2,
                    ...darkThemeStyles.paper,
                    "& .MuiTable-root": darkThemeStyles.table
                  }}>
                    <Table>
                      <TableHead sx={darkThemeStyles.tableHead}>
                        <TableRow>
                          <TableCell sx={darkThemeStyles.tableCell}>Date</TableCell>
                          <TableCell sx={darkThemeStyles.tableCell}>Conducted By</TableCell>
                          <TableCell sx={darkThemeStyles.tableCell}>Score</TableCell>
                          <TableCell sx={darkThemeStyles.tableCell}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {jobAssessments
                          .slice(jobPage * jobRowsPerPage, jobPage * jobRowsPerPage + jobRowsPerPage)
                          .map((assessment) => (
                            <TableRow key={assessment._id}
                              sx={{
                                "&:hover": {
                                  backgroundColor: colors.tableRowHover
                                }
                              }}
                            >
                              <TableCell sx={darkThemeStyles.tableCell}>{formatDate(assessment.assessmentDate)}</TableCell>
                              <TableCell sx={darkThemeStyles.tableCell}>{assessment.conductedBy}</TableCell>
                              <TableCell sx={darkThemeStyles.tableCell}>
                                <Chip
                                  label={`${assessment.overallScore}%`}
                                  sx={{
                                    bgcolor: `${getPerformanceColor(assessment.overallScore)}22`,
                                    color: getPerformanceColor(assessment.overallScore),
                                    borderColor: getPerformanceColor(assessment.overallScore),
                                    fontWeight: 'bold'
                                  }}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell sx={darkThemeStyles.tableCell}>{assessment.status}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    rowsPerPageOptions={[10, 25, 50]}
                    component="div"
                    count={jobAssessments.length}
                    rowsPerPage={jobRowsPerPage}
                    page={jobPage}
                    onPageChange={(e, newPage) => setJobPage(newPage)}
                    onRowsPerPageChange={(e) => {
                      setJobRowsPerPage(parseInt(e.target.value, 10));
                      setJobPage(0);
                    }}
                    sx={{
                      ...darkThemeStyles.tablePagination,
                      color: colors.textPrimary,
                      "& .MuiTablePagination-select": {
                        color: colors.textPrimary
                      },
                      "& .MuiTablePagination-selectIcon": {
                        color: colors.textPrimary
                      }
                    }}
                    labelRowsPerPage={
                      <Typography color={colors.textPrimary}>Rows per page:</Typography>
                    }
                  />
                </>
              ) : (
                <Paper sx={{ p: 3, textAlign: 'center', ...darkThemeStyles.paper }}>
                  <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                    No practical assessments found for this team
                  </Typography>
                </Paper>
              )}
            </Box>
          )}

          {/* Lab Assessments */}
          {activeTab === 3 && (
            <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" sx={{ color: colors.primary }}>Lab Assessments</Typography>
                <Chip
                  label={`Avg: ${Math.round(calculateAverageScore(labAssessments))}%`}
                  variant="outlined"
                  sx={{ borderColor: getPerformanceColor(calculateAverageScore(labAssessments)), color: getPerformanceColor(calculateAverageScore(labAssessments)) }}
                />
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress sx={{ color: colors.primary }} />
                </Box>
              ) : labAssessments.length > 0 ? (
                <>
                  <TableContainer component={Paper} sx={{
                    mb: 2,
                    ...darkThemeStyles.paper,
                    "& .MuiTable-root": darkThemeStyles.table
                  }}>
                    <Table>
                      <TableHead sx={darkThemeStyles.tableHead}>
                        <TableRow>
                          <TableCell sx={darkThemeStyles.tableCell}>Date</TableCell>
                          <TableCell sx={darkThemeStyles.tableCell}>Type</TableCell>
                          <TableCell sx={darkThemeStyles.tableCell}>ONT Type</TableCell>
                          <TableCell sx={darkThemeStyles.tableCell}>Splicing Status</TableCell>
                          <TableCell sx={darkThemeStyles.tableCell}>Score</TableCell>
                          <TableCell sx={darkThemeStyles.tableCell}>Comments</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {labAssessments
                          .slice(labPage * labRowsPerPage, labPage * labRowsPerPage + labRowsPerPage)
                          .map((assessment) => (
                            <TableRow key={assessment._id}
                              sx={{
                                "&:hover": {
                                  backgroundColor: colors.tableRowHover
                                }
                              }}
                            >
                              <TableCell sx={darkThemeStyles.tableCell}>{formatDate(assessment.createdAt)}</TableCell>
                              <TableCell sx={darkThemeStyles.tableCell}>
                                <Chip label={assessment.assessmentType || 'Technical'} size="small" variant="outlined" sx={{ color: colors.primary, borderColor: colors.primary }} />
                              </TableCell>
                              <TableCell sx={darkThemeStyles.tableCell}>{assessment.ontType?.name || 'N/A'}</TableCell>
                              <TableCell sx={darkThemeStyles.tableCell}>
                                {assessment.assessmentType === 'Infrastructure' ? (
                                  <Chip
                                    label={assessment.splicingMachineStatus || 'Good'}
                                    size="small"
                                    sx={{
                                      bgcolor: assessment.splicingMachineStatus === 'Poor' ? `${colors.error}22` : assessment.splicingMachineStatus === 'Fair' ? `${colors.warning}22` : `${colors.success}22`,
                                      color: assessment.splicingMachineStatus === 'Poor' ? colors.error : assessment.splicingMachineStatus === 'Fair' ? colors.warning : colors.success,
                                      borderColor: assessment.splicingMachineStatus === 'Poor' ? colors.error : assessment.splicingMachineStatus === 'Fair' ? colors.warning : colors.success,
                                    }}
                                    variant="outlined"
                                  />
                                ) : 'N/A'}
                              </TableCell>
                              <TableCell sx={darkThemeStyles.tableCell}>
                                <Chip
                                  label={`${assessment.totalScore}%`}
                                  sx={{
                                    bgcolor: `${getPerformanceColor(assessment.totalScore)}22`,
                                    color: getPerformanceColor(assessment.totalScore),
                                    borderColor: getPerformanceColor(assessment.totalScore),
                                    fontWeight: 'bold'
                                  }}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell sx={darkThemeStyles.tableCell}>{assessment.comments || '-'}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    rowsPerPageOptions={[10, 25, 50]}
                    component="div"
                    count={labAssessments.length}
                    rowsPerPage={labRowsPerPage}
                    page={labPage}
                    onPageChange={(e, newPage) => setLabPage(newPage)}
                    onRowsPerPageChange={(e) => {
                      setLabRowsPerPage(parseInt(e.target.value, 10));
                      setLabPage(0);
                    }}
                    sx={{
                      ...darkThemeStyles.tablePagination,
                      color: colors.textPrimary,
                      "& .MuiTablePagination-select": {
                        color: colors.textPrimary
                      },
                      "& .MuiTablePagination-selectIcon": {
                        color: colors.textPrimary
                      }
                    }}
                    labelRowsPerPage={
                      <Typography color={colors.textPrimary}>Rows per page:</Typography>
                    }
                  />
                </>
              ) : (
                <Paper sx={{ p: 3, textAlign: 'center', ...darkThemeStyles.paper }}>
                  <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                    No lab assessments found for this team
                  </Typography>
                </Paper>
              )}
            </Box>
          )}

          {/* Performance Summary Section */}
          {(quizResults.length > 0 || jobAssessments.length > 0 || labAssessments.length > 0) && (
            <Box sx={{ mt: 5 }}>
              <Typography variant="h5" sx={{ color: colors.primary, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment /> Advanced Analytics
              </Typography>

              <Grid container spacing={3}>
                {[
                  { name: 'Theoretical', data: quizResults, color: colors.primary },
                  { name: 'Practical', data: jobAssessments, color: colors.success },
                  { name: 'Lab', data: labAssessments, color: colors.warning }
                ].filter(group => group.data.length > 0).map((group, idx) => (
                  <Grid item xs={12} key={idx}>
                    <Paper sx={{ p: 3, ...darkThemeStyles.paper, position: 'relative' }}>
                      <Typography variant="h6" sx={{ color: group.color, mb: 2 }}>{group.name} Analytics</Typography>
                      <Grid container spacing={4}>
                        <Grid item xs={12} md={4}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography color={colors.textSecondary}>Median Score</Typography>
                              <Typography fontWeight="bold">{Math.round(calculateMedianScore(group.data))}%</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography color={colors.textSecondary}>Volatility (StdDev)</Typography>
                              <Typography fontWeight="bold">{Math.round(calculateStandardDeviation(group.data))}%</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography color={colors.textSecondary}>Top Score</Typography>
                              <Typography sx={{ color: colors.success }} fontWeight="bold">{calculateHighestScore(group.data)}%</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography color={colors.textSecondary}>Mastery Rate ({'>'}80%)</Typography>
                              <Typography fontWeight="bold">{Math.round(calculatePercentageAboveThreshold(group.data, 80))}%</Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={8}>
                          <Box sx={{ height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={group.data.map(item => ({
                                date: formatDate(item.submittedAt || item.assessmentDate || item.createdAt),
                                score: item.percentage || item.overallScore || item.totalScore || 0
                              })).reverse()}>
                                <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} vertical={false} />
                                <XAxis dataKey="date" hide />
                                <YAxis domain={[0, 100]} hide />
                                <RechartsTooltip contentStyle={{ backgroundColor: '#252525', border: `1px solid ${colors.border}`, borderRadius: '12px' }} />
                                <Area
                                  type="monotone"
                                  dataKey="score"
                                  stroke={group.color}
                                  fill={group.color}
                                  fillOpacity={0.1}
                                  strokeWidth={2}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

        </Box>
      )}
    </Box>
  );
};

export default FieldTeamPortal;