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
  Divider
} from "@mui/material";
import {
  ArrowBack,
  Quiz,
  Assignment,
  BarChart,
} from '@mui/icons-material';
import api from "../api/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart as RechartsBarChart,
  Bar,
  ResponsiveContainer
} from 'recharts';
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

  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');

  // Colors for dark mode UI consistency
  const colors = {
    background: '#121212',
    surface: '#1e1e1e',
    surfaceElevated: '#252525',
    border: '#444',
    primary: '#3ea6ff',
    primaryHover: 'rgba(62, 166, 255, 0.08)',
    textPrimary: '#ffffff',
    textSecondary: '#9e9e9e',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    tableBg: '#1a1a1a',
    tableHeaderBg: '#252525',
    tableRowHover: '#2a2a2a',
    chartGrid: '#333333',
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
    }
  }, [selectedTeam]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'error';
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

  const renderLineChart = (data, dataKey) => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} style={{ backgroundColor: colors.surfaceElevated, borderRadius: '8px', padding: '10px' }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} />
        <XAxis dataKey="date" stroke={colors.textSecondary} />
        <YAxis stroke={colors.textSecondary} />
        <Tooltip
          contentStyle={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }}
          labelStyle={{ color: colors.textPrimary }}
        />
        <Legend wrapperStyle={{ color: colors.textPrimary }} />
        <Line type="monotone" dataKey={dataKey} stroke={colors.primary} activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderBarChart = (data) => (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data} style={{ backgroundColor: colors.surfaceElevated, borderRadius: '8px', padding: '10px' }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} />
        <XAxis dataKey="range" stroke={colors.textSecondary} />
        <YAxis stroke={colors.textSecondary} />
        <Tooltip
          contentStyle={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }}
          labelStyle={{ color: colors.textPrimary }}
        />
        <Legend wrapperStyle={{ color: colors.textPrimary }} />
        <Bar dataKey="count" fill={colors.primary} />
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
      backgroundColor: colors.background,
      minHeight: '100vh',
      // maxWidth: '100vw',
      overflowX: 'hidden',
      color: colors.textPrimary,
      p: isMobile ? 2 : 3,
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
              label="Theoretical Assessments"
              icon={<Quiz fontSize="small" />}
              iconPosition="start"
            />
            <Tab
              label="Practical Assessments"
              icon={<Assignment fontSize="small" />}
              iconPosition="start"
            />
          </Tabs>

          {/* Theoretical (Quiz) Assessments */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h5" gutterBottom sx={{
                color: colors.primary,
                mb: 2
              }}>
                Theoretical Assessments
              </Typography>

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
                                  color={getPerformanceColor(result.percentage)}
                                  variant="outlined"
                                  sx={darkThemeStyles.chip}
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
          {activeTab === 1 && (
            <Box>
              <Typography variant="h5" gutterBottom sx={{
                color: colors.primary,
                mb: 2
              }}>
                Practical Assessments
              </Typography>

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
                                  color={getPerformanceColor(assessment.overallScore)}
                                  variant="outlined"
                                  sx={darkThemeStyles.chip}
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

          {/* Performance Summary Card */}
          {(quizResults.length > 0 || jobAssessments.length > 0) && (
            <Card sx={{ mt: 3, ...darkThemeStyles.card }}>
              <CardContent>
                <Typography variant="h6" sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: colors.primary,
                  mb: 2
                }}>
                  <BarChart /> Performance Summary
                </Typography>

                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2
                }}>
                  {/* Quiz Performance */}
                  {quizResults.length > 0 && (
                    <Box>
                      <Typography variant="subtitle1" sx={{ color: colors.textSecondary }}>
                        Theoretical Assessment Statistics
                      </Typography>
                      <Typography sx={{ color: colors.textPrimary }}>
                        Average Score: {Math.round(calculateAverageScore(quizResults))}%
                      </Typography>
                      <Typography sx={{ color: colors.textPrimary }}>
                        Median Score: {Math.round(calculateMedianScore(quizResults))}%
                      </Typography>
                      <Typography sx={{ color: colors.textPrimary }}>
                        Standard Deviation: {Math.round(calculateStandardDeviation(quizResults))}%
                      </Typography>
                      <Typography sx={{ color: colors.textPrimary }}>
                        Above 80%: {Math.round(calculatePercentageAboveThreshold(quizResults, 80))}%
                      </Typography>
                      <Typography sx={{ color: colors.textPrimary }}>
                        Highest Score: {calculateHighestScore(quizResults)}%
                      </Typography>
                      <Typography sx={{ color: colors.textPrimary }}>
                        Lowest Score: {calculateLowestScore(quizResults)}%
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                        Based on {quizResults.length} assessment(s)
                      </Typography>
                    </Box>
                  )}

                  {/* Job Performance */}
                  {jobAssessments.length > 0 && (
                    <Box>
                      <Typography variant="subtitle1" sx={{ color: colors.textSecondary }}>
                        Practical Assessment Statistics
                      </Typography>
                      <Typography sx={{ color: colors.textPrimary }}>
                        Average Score: {Math.round(calculateAverageScore(jobAssessments))}%
                      </Typography>
                      <Typography sx={{ color: colors.textPrimary }}>
                        Median Score: {Math.round(calculateMedianScore(jobAssessments))}%
                      </Typography>
                      <Typography sx={{ color: colors.textPrimary }}>
                        Standard Deviation: {Math.round(calculateStandardDeviation(jobAssessments))}%
                      </Typography>
                      <Typography sx={{ color: colors.textPrimary }}>
                        Above 80%: {Math.round(calculatePercentageAboveThreshold(jobAssessments, 80))}%
                      </Typography>
                      <Typography sx={{ color: colors.textPrimary }}>
                        Highest Score: {calculateHighestScore(jobAssessments)}%
                      </Typography>
                      <Typography sx={{ color: colors.textPrimary }}>
                        Lowest Score: {calculateLowestScore(jobAssessments)}%
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                        Based on {jobAssessments.length} assessment(s)
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          {(quizResults.length > 0 || jobAssessments.length > 0) && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{
                color: colors.primary,
                mb: 2
              }}>
                Performance Charts
              </Typography>

              {/* Average Scores Over Time */}
              {quizResults.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: colors.textSecondary, mb: 1 }}>
                    Theoretical Assessment Scores Over Time
                  </Typography>
                  {renderLineChart(quizData, 'score', 'Theoretical Assessment Scores Over Time')}
                </Box>
              )}

              {jobAssessments.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: colors.textSecondary, mb: 1 }}>
                    Practical Assessment Scores Over Time
                  </Typography>
                  {renderLineChart(jobData, 'score', 'Practical Assessment Scores Over Time')}
                </Box>
              )}

              {/* Performance Distribution */}
              {quizResults.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: colors.textSecondary, mb: 1 }}>
                    Theoretical Assessment Score Distribution
                  </Typography>
                  {renderBarChart(quizDistributionData, 'Theoretical Assessment Score Distribution')}
                </Box>
              )}

              {jobAssessments.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: colors.textSecondary, mb: 1 }}>
                    Practical Assessment Score Distribution
                  </Typography>
                  {renderBarChart(jobDistributionData, 'Practical Assessment Score Distribution')}
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default FieldTeamPortal;