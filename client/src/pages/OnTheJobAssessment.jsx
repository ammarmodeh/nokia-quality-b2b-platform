import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Button,
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
  Divider,
  Card,
  CardContent,
  TablePagination,
  Autocomplete,
  FormControlLabel,
  Checkbox,
  Grid,
  useMediaQuery
} from "@mui/material";
import {
  ArrowBack,
  BarChart,
  TrendingUp,
  TrendingDown,
  BarChartOutlined,
} from '@mui/icons-material';
import api from "../api/api";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useSelector } from "react-redux";

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

const OnTheJobAssessment = () => {
  const user = useSelector((state) => state?.auth?.user);
  const [fieldTeams, setFieldTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  // console.log({ selectedTeam });
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
  // New state to store assessment status and scores for each team
  const [teamAssessments, setTeamAssessments] = useState({});
  const [newAssessment, setNewAssessment] = useState({
    conductedBy: "",
    checkPoints: [
      // Category A: Equipment and Tools
      {
        name: "Splicing Equipment",
        description: "Splicing machine, cleaver, stripper condition validation",
        category: "Equipment",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Testing Equipment",
        description: "Optical power meter, laser source functionality check",
        category: "Equipment",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Consumables",
        description: "Cleaning solution, fiber wipes, protection sleeves availability",
        category: "Equipment",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      // Category B: Fiber Optic Splicing Skills (25%)
      {
        name: "Splicing Process Execution",
        description: "Correct process of splicing fiber optic cables",
        category: "Splicing",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Fiber Loop Management",
        description: "Proper fiber loop at splice tray (FDB - BEP - OTO)",
        category: "Splicing",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Standard Labelling",
        description: "Follows standard-based labelling procedures",
        category: "Splicing",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      // Category C: ONT Configuration (20%)
      {
        name: "ONT Placement",
        description: "Verifying the best location for ONT and Wi-Fi repeater",
        category: "Configuration",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Device Settings",
        description: "ONT and Wi-Fi repeater configuration based on recommended settings",
        category: "Configuration",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Speed Testing",
        description: "Performing Wi-Fi and Ethernet speed tests with proper equipment",
        category: "Configuration",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      // Category D: Link Validation (10%)
      {
        name: "Power Thresholds",
        description: "Understanding endpoints' maximum and minimum power thresholds",
        category: "Validation",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Link-loss Management",
        description: "P2P Link-loss power management skills",
        category: "Validation",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      // Category E: Customer Education (20%)
      {
        name: "Product Knowledge",
        description: "Demonstrates knowledge of product details and offerings",
        category: "Customer",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Wi-Fi Education",
        description: "Explains Wi-Fi coverage limits, affecting factors, and speed expectations",
        category: "Customer",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Troubleshooting Guidance",
        description: "Ability to identify and explain IPTV and VPN service difficulties",
        category: "Customer",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      // Category F: Customer Service Skills (25%)
      {
        name: "Professional Appearance",
        description: "Maintains appropriate professional appearance",
        category: "Service",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Technical Proficiency",
        description: "Overall technical knowledge and installation skills",
        category: "Service",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Patience and Communication",
        description: "Demonstrates patience and effective communication with customers",
        category: "Service",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Responsiveness",
        description: "Available when needed within the guarantee period",
        category: "Service",
        isCompleted: false,
        score: 0,
        notes: "",
      },
    ],
    feedback: "",
    categoryWeights: {
      "Equipment": 0.10,  // 10%
      "Splicing": 0.25,   // 25%
      "Configuration": 0.20, // 20%
      "Validation": 0.10, // 10%
      "Customer": 0.20,   // 20%
      "Service": 0.25     // 25%
    }
  });
  // For Field Teams table
  const [teamsPage, setTeamsPage] = useState(0);
  const [teamsRowsPerPage, setTeamsRowsPerPage] = useState(10);

  // For Assessments table
  const [assessmentsPage, setAssessmentsPage] = useState(0);
  const [assessmentsRowsPerPage, setAssessmentsRowsPerPage] = useState(10);

  useEffect(() => {
    if (selectedTeam && teamAssessments[selectedTeam._id]) {
      setAssessments(teamAssessments[selectedTeam._id]);
    } else {
      setAssessments([]);
    }
  }, [selectedTeam, teamAssessments]);

  // Memoize the CheckpointsByCategory component
  const CheckpointsByCategory = useCallback(({ checkPoints, handleCheckPointChange, colors }) => {
    const categories = checkPoints.reduce((acc, checkpoint, index) => {
      const category = checkpoint.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({ ...checkpoint, index });
      return acc;
    }, {});

    const categoryTitles = {
      "Equipment": "Equipment and Tools (10%)",
      "Splicing": "Fiber Optic Splicing Skills (25%)",
      "Configuration": "ONT Configuration (20%)",
      "Validation": "Link Validation (10%)",
      "Customer": "Customer Education (20%)",
      "Service": "Customer Service Skills (25%)"
    };

    const categoryOrder = ["Equipment", "Splicing", "Configuration", "Validation", "Customer", "Service"];

    return (
      <>
        {categoryOrder.map(category => (
          <Box key={category} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{
              color: colors.primary,
              mb: 2,
              borderBottom: `1px solid ${colors.border}`,
              pb: 1
            }}>
              {categoryTitles[category]}
            </Typography>

            {categories[category]?.map(point => (
              <Paper key={point.index} sx={{
                p: 2,
                mb: 2,
                backgroundColor: colors.surfaceElevated,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px'
              }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle1" sx={{ color: colors.textPrimary }}>
                      {point.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                      {point.description}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={point.isCompleted}
                          onChange={(e) => handleCheckPointChange(point.index, "isCompleted", e.target.checked)}
                          sx={{
                            color: colors.primary,
                            '&.Mui-checked': {
                              color: colors.primary,
                            },
                          }}
                        />
                      }
                      label="Completed"
                      sx={{ color: colors.textPrimary }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      label="Score (0-100)"
                      type="number"
                      fullWidth
                      inputProps={{ min: 0, max: 100 }}
                      value={point.score}
                      onChange={(e) => handleCheckPointChange(point.index, "score", parseInt(e.target.value) || 0)}
                      InputLabelProps={{
                        style: { color: colors.textSecondary }
                      }}
                      InputProps={{
                        style: { color: colors.textPrimary }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Notes"
                      fullWidth
                      value={point.notes}
                      onChange={(e) => handleCheckPointChange(point.index, "notes", e.target.value)}
                      InputLabelProps={{
                        style: { color: colors.textSecondary }
                      }}
                      InputProps={{
                        style: { color: colors.textPrimary }
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Box>
        ))}
      </>
    );
  }, []);

  const colors = useMemo(() => ({
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
    chartCorrect: '#4caf50',
    chartIncorrect: '#f44336',
  }), []);

  useEffect(() => {
    const fetchFieldTeams = async () => {
      try {
        // console.log("Fetching field teams...");
        setLoading(true);
        const response = await api.get("/field-teams/get-field-teams", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        setFieldTeams(response.data);
        // console.log("Field teams fetched successfully.");
      } catch (error) {
        console.error("Error fetching field teams:", error);
        setError("Failed to fetch field teams");
      } finally {
        setLoading(false);
      }
    };

    const fetchStats = async () => {
      try {
        // console.log("Fetching stats...");
        const response = await api.get("/on-the-job-assessments/stats", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        setStats(response.data);
        // console.log("Stats fetched successfully.");
      } catch (error) {
        console.error("Error fetching stats:", error);
        setError("Failed to fetch assessment statistics");
      }
    };

    fetchFieldTeams();
    fetchStats();
  }, []);

  useEffect(() => {
    if (fieldTeams.length > 0) {
      const fetchAllAssessments = async () => {
        try {
          // console.log("Fetching assessments for all teams...");
          setLoading(true);
          const assessmentsData = {};

          const promises = fieldTeams.map(async (team) => {
            const response = await api.get(
              `/on-the-job-assessments/field-team/${team._id}`, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              },
            });
            assessmentsData[team._id] = response.data;
          });

          await Promise.all(promises);
          setTeamAssessments(assessmentsData);
          // console.log("Assessments fetched successfully.");
        } catch (error) {
          console.error("Error fetching assessments:", error);
          setError("Failed to fetch assessments");
        } finally {
          setLoading(false);
        }
      };
      fetchAllAssessments();
    }
  }, [fieldTeams]);

  const handleCheckPointChange = useCallback((index, field, value) => {
    setNewAssessment(prevState => {
      const updatedCheckPoints = [...prevState.checkPoints];
      updatedCheckPoints[index][field] = value;
      return { ...prevState, checkPoints: updatedCheckPoints };
    });
  }, []);

  const handleSubmitAssessment = async () => {
    try {
      setLoading(true);
      const payload = {
        fieldTeamId: selectedTeam._id,
        conductedBy: newAssessment.conductedBy,
        checkPoints: newAssessment.checkPoints,
        feedback: newAssessment.feedback,
      };

      await api.post(
        "/on-the-job-assessments",
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      // Refresh assessments list
      const assessmentsResponse = await api.get(
        `/on-the-job-assessments/field-team/${selectedTeam._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      setAssessments(assessmentsResponse.data);

      // Update team assessments
      setTeamAssessments(prevState => ({
        ...prevState,
        [selectedTeam._id]: assessmentsResponse.data
      }));

      // Reset form
      setNewAssessment(prevState => ({
        ...prevState,
        conductedBy: "",
        checkPoints: prevState.checkPoints.map((cp) => ({
          ...cp,
          isCompleted: false,
          score: 0,
          notes: "",
        })),
        feedback: "",
      }));

      setError(null);
    } catch (error) {
      console.error("Error submitting assessment:", error);
      setError("Failed to submit assessment");
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallScore = useCallback((checkPoints, categoryWeights = {}) => {
    if (!checkPoints || checkPoints.length === 0) return 0;

    const defaultWeights = {
      "Equipment": 0.10,
      "Splicing": 0.25,
      "Configuration": 0.20,
      "Validation": 0.10,
      "Customer": 0.20,
      "Service": 0.25
    };

    const weights = Object.keys(categoryWeights).length > 0 ? categoryWeights : defaultWeights;

    const categories = checkPoints.reduce((acc, checkpoint) => {
      const category = checkpoint.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(checkpoint);
      return acc;
    }, {});

    let weightedSum = 0;

    Object.entries(categories).forEach(([category, points]) => {
      const categoryScore = points.reduce((sum, point) => sum + point.score, 0) / points.length;
      const weight = weights[category] || 0;
      weightedSum += categoryScore * weight;
    });

    return Math.round(weightedSum);
  }, []);

  const getPerformanceColor = useCallback((score) => {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'error';
  }, []);

  const getCategoryChartData = useCallback(() => {
    if (!selectedAssessment) return null;

    const categoryData = selectedAssessment.checkPoints.reduce((acc, point) => {
      if (!acc[point.name]) {
        acc[point.name] = { score: 0 };
      }
      acc[point.name].score = point.score;
      return acc;
    }, {});

    const labels = Object.keys(categoryData);
    const scores = labels.map(category => categoryData[category].score);

    return {
      labels,
      datasets: [
        {
          label: 'Scores',
          data: scores,
          backgroundColor: colors.primary,
        },
      ],
    };
  }, [selectedAssessment, colors]);

  const horizontalChartOptions = useMemo(() => ({
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: colors.textPrimary
        }
      },
      title: {
        display: true,
        text: 'Category Performance',
        color: colors.textPrimary
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || '';
            const value = context.raw;
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      x: {
        min: 0,
        max: 100,  // Set maximum x-axis value to 100
        ticks: {
          color: colors.textPrimary,
          stepSize: 10,
          precision: 0,
          callback: function (value) {
            return value + '%';  // Add percentage sign to x-axis labels
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y: {
        ticks: {
          color: colors.textPrimary,
          font: {
            size: isMobile ? 10 : 12
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
    },
  }), [colors, isMobile]);

  const analyzeCategoryPerformance = useCallback((checkPoints) => {
    const categoryStats = checkPoints.reduce((acc, point) => {
      if (!acc[point.name]) {
        acc[point.name] = { score: 0 };
      }
      acc[point.name].score = point.score;
      return acc;
    }, {});

    const strengths = [];
    const improvements = [];

    Object.entries(categoryStats).forEach(([category, stats]) => {
      if (stats.score >= 80) {
        strengths.push({
          category,
          score: stats.score,
        });
      } else {
        improvements.push({
          category,
          score: stats.score,
        });
      }
    });

    strengths.sort((a, b) => b.score - a.score);
    improvements.sort((a, b) => a.score - b.score);

    return { strengths, improvements };
  }, []);

  return (
    <Box sx={{
      backgroundColor: colors.background,
      minHeight: '100vh',
      color: colors.textPrimary,
      // p: isMobile ? 2 : 3
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
        On-The-Job Assessments
      </Typography>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            {
              title: "Total Assessments",
              value: stats.overallStats.totalAssessments || 0,
              unit: ""
            },
            {
              title: "Average Score",
              value: stats.overallStats.averageScore || 0,
              unit: "%"
            },
            {
              title: "Top Team",
              value: stats.fieldTeamStats[0]?.teamName || "N/A",
              subtitle: `${stats.fieldTeamStats[0]?.averageScore || 0}%`
            },
            // {
            //   title: "Completed",
            //   value: stats.overallStats.completedAssessments || 0,
            //   unit: ""
            // }
          ].map((stat, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                height: '100%'
              }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{
                    color: colors.textSecondary,
                    mb: 1,
                    fontSize: isMobile ? '0.875rem' : '1rem'
                  }}>
                    {stat.title}
                  </Typography>
                  <Typography variant="h4" sx={{
                    color: colors.textPrimary,
                    fontWeight: 'bold',
                    fontSize: isMobile ? '0.8rem' : '1.2rem',
                    mb: 2
                  }}>
                    {stat.value}{stat.unit || ''}
                  </Typography>
                  {stat.subtitle && (
                    <Typography variant="body2" sx={{
                      color: colors.textSecondary,
                      mt: 1,
                      fontSize: isMobile ? '0.75rem' : '0.875rem'
                    }}>
                      {stat.subtitle}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Search Section */}
      <Paper sx={{
        p: 3,
        mb: 3,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
          <Autocomplete
            options={fieldTeams}
            getOptionLabel={(option) => `${option.teamName} (${option.teamCompany})`}
            value={selectedTeam}
            onChange={(event, newValue) => setSelectedTeam(newValue)}
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
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{
          mb: 3,
          backgroundColor: '#2d0000',
          color: '#ff6e6e',
          border: '1px solid #ff3d3d',
          borderRadius: '8px'
        }}>
          {error}
        </Alert>
      )}

      {/* Loading Indicator */}
      {/* {loading && (
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          p: 4,
          backgroundColor: colors.surface,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`
        }}>
          <CircularProgress sx={{ color: colors.primary }} />
        </Box>
      )} */}

      {/* Main Content */}
      {!selectedTeam && (
        user.title === 'Field Technical Support - QoS' && (
          <>
            {/* Field Teams Table */}
            <Typography variant="h5" gutterBottom sx={{
              color: colors.primary,
              fontWeight: 'bold',
              mb: 2
            }}>
              Field Teams Assessment Status
            </Typography>

            {loading ? (
              <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                p: 4,
                backgroundColor: colors.surface,
                borderRadius: '8px',
                border: `1px solid ${colors.border}`
              }}>
                <CircularProgress sx={{ color: colors.primary }} />
              </Box>
            ) : (
              <>
                <TableContainer component={Paper} sx={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px',
                  borderBottomLeftRadius: '0px',
                  borderBottomRightRadius: '0px',
                  "& .MuiTableHead-root": {
                    backgroundColor: colors.surfaceElevated,
                    "& .MuiTableCell-root": {
                      color: colors.textSecondary,
                      fontWeight: "bold",
                      borderBottom: `1px solid ${colors.border}`,
                    }
                  },
                  "& .MuiTableBody-root": {
                    "& .MuiTableCell-root": {
                      borderBottom: `1px solid ${colors.border}`,
                      color: colors.textPrimary,
                    },
                    "& .MuiTableRow-root": {
                      backgroundColor: colors.surface,
                      "&:hover": {
                        backgroundColor: colors.surfaceElevated,
                      },
                    }
                  },
                }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Team Name</TableCell>
                        <TableCell>Company</TableCell>
                        <TableCell>Assessment Status</TableCell>
                        <TableCell>Score</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fieldTeams
                        .slice(teamsPage * teamsRowsPerPage, teamsPage * teamsRowsPerPage + teamsRowsPerPage)
                        .map((team) => (
                          <TableRow key={team._id} hover>
                            <TableCell>{team.teamName}</TableCell>
                            <TableCell>{team.teamCompany}</TableCell>
                            <TableCell>
                              {teamAssessments[team._id] && teamAssessments[team._id].length > 0 ? (
                                <Chip label="Assessed" color="success" variant="outlined" />
                              ) : (
                                <Chip label="Not Assessed" color="error" variant="outlined" />
                              )}
                            </TableCell>
                            <TableCell>
                              {teamAssessments[team._id] && teamAssessments[team._id].length > 0 ? (
                                <Chip
                                  label={`${Math.round(teamAssessments[team._id].reduce((sum, assessment) => sum + assessment.overallScore, 0) / teamAssessments[team._id].length)}%`}
                                  color={getPerformanceColor(Math.round(teamAssessments[team._id].reduce((sum, assessment) => sum + assessment.overallScore, 0) / teamAssessments[team._id].length))}
                                  variant="outlined"
                                />
                              ) : (
                                "N/A"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  rowsPerPageOptions={[10, 25, 50]}
                  component="div"
                  count={fieldTeams.length}
                  rowsPerPage={teamsRowsPerPage}
                  page={teamsPage}
                  onPageChange={(e, newPage) => setTeamsPage(newPage)}
                  onRowsPerPageChange={(e) => {
                    setTeamsRowsPerPage(parseInt(e.target.value, 10));
                    setTeamsPage(0);
                  }}
                  sx={{
                    color: colors.textPrimary,
                    '& .MuiTablePagination-selectIcon': {
                      color: colors.textPrimary
                    },
                    '& .MuiSvgIcon-root': {
                      color: colors.textPrimary
                    },
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderTop: 'none',
                    borderBottomLeftRadius: '8px',
                    borderBottomRightRadius: '8px'
                  }}
                />
              </>
            )}
          </>
        )
      )}

      {selectedTeam && !selectedAssessment && (
        <>
          {/* New Assessment Section */}
          <Paper sx={{
            p: 3,
            mb: 4,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px'
          }}>
            <Typography variant="h5" gutterBottom sx={{
              color: colors.primary,
              fontWeight: 'bold',
              mb: 3
            }}>
              New Assessment
            </Typography>

            <TextField
              label="Conducted By"
              fullWidth
              value={newAssessment.conductedBy}
              onChange={(e) => setNewAssessment(prevState => ({ ...prevState, conductedBy: e.target.value }))}
              sx={{ mb: 2 }}
              InputLabelProps={{
                style: { color: colors.textSecondary }
              }}
              InputProps={{
                style: { color: colors.textPrimary }
              }}
            />

            <Typography variant="h6" gutterBottom sx={{
              color: colors.textPrimary,
              mb: 2
            }}>
              Assessment Check Points
            </Typography>

            <CheckpointsByCategory
              checkPoints={newAssessment.checkPoints}
              handleCheckPointChange={handleCheckPointChange}
              colors={colors}
            />

            <Typography variant="h6" sx={{
              mt: 2,
              color: colors.textPrimary
            }}>
              Overall Score: <Chip
                label={`${calculateOverallScore(newAssessment.checkPoints, newAssessment.categoryWeights)}%`}
                color={getPerformanceColor(calculateOverallScore(newAssessment.checkPoints, newAssessment.categoryWeights))}
                variant="outlined"
                sx={{ ml: 1 }}
              />
            </Typography>

            <TextField
              label="Feedback"
              fullWidth
              multiline
              rows={4}
              value={newAssessment.feedback}
              onChange={(e) => setNewAssessment(prevState => ({ ...prevState, feedback: e.target.value }))}
              sx={{ mt: 2, mb: 2 }}
              InputLabelProps={{
                style: { color: colors.textSecondary }
              }}
              InputProps={{
                style: { color: colors.textPrimary }
              }}
            />

            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmitAssessment}
              disabled={loading || !newAssessment.conductedBy}
              sx={{
                backgroundColor: colors.primary,
                '&:hover': {
                  backgroundColor: '#1d4ed8',
                },
                '&:disabled': {
                  backgroundColor: '#555',
                  color: '#999'
                }
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: colors.textPrimary }} /> : "Submit Assessment"}
            </Button>
          </Paper>

          {/* Previous Assessments Table */}
          <Typography variant="h5" gutterBottom sx={{
            color: colors.primary,
            fontWeight: 'bold',
            mb: 2
          }}>
            Previous Assessments
          </Typography>

          {assessments && assessments.length > 0 ? (
            <>
              <TableContainer component={Paper} sx={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
                borderBottomLeftRadius: '0px',
                borderBottomRightRadius: '0px',
                "& .MuiTableHead-root": {
                  backgroundColor: colors.surfaceElevated,
                  "& .MuiTableCell-root": {
                    color: colors.textSecondary,
                    fontWeight: "bold",
                    borderBottom: `1px solid ${colors.border}`,
                  }
                },
                "& .MuiTableBody-root": {
                  "& .MuiTableCell-root": {
                    borderBottom: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                  },
                  "& .MuiTableRow-root": {
                    backgroundColor: colors.surface,
                    "&:hover": {
                      backgroundColor: colors.surfaceElevated,
                    },
                  }
                },
              }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Conducted By</TableCell>
                      <TableCell>Score</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assessments
                      .slice(assessmentsPage * assessmentsRowsPerPage, assessmentsPage * assessmentsRowsPerPage + assessmentsRowsPerPage)
                      .map((assessment) => (
                        <TableRow key={assessment._id} hover>
                          <TableCell>
                            {new Date(assessment.assessmentDate).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </TableCell>
                          <TableCell>{assessment.conductedBy}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${assessment.overallScore}%`}
                              color={getPerformanceColor(assessment.overallScore)}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{assessment.status}</TableCell>
                          <TableCell>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => setSelectedAssessment(assessment)}
                              sx={{
                                color: colors.primary,
                                borderColor: colors.primary,
                                '&:hover': {
                                  backgroundColor: colors.primaryHover,
                                  borderColor: colors.primary,
                                }
                              }}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={assessments.length}
                rowsPerPage={assessmentsRowsPerPage}
                page={assessmentsPage}
                onPageChange={(e, newPage) => setAssessmentsPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setAssessmentsRowsPerPage(parseInt(e.target.value, 10));
                  setAssessmentsPage(0);
                }}
                sx={{
                  color: colors.textPrimary,
                  '& .MuiTablePagination-selectIcon': {
                    color: colors.textPrimary
                  },
                  '& .MuiSvgIcon-root': {
                    color: colors.textPrimary
                  },
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderTop: 'none',
                  borderBottomLeftRadius: '8px',
                  borderBottomRightRadius: '8px',
                }}
              />
            </>
          ) : (
            <Paper sx={{
              p: 3,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                No assessments found for this team
              </Typography>
            </Paper>
          )}
        </>
      )}

      {/* Assessment Detail View */}
      {selectedAssessment && selectedTeam && (
        <Box sx={{ mt: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => setSelectedAssessment(null)}
            sx={{
              mb: 2,
              color: colors.primary,
              '&:hover': {
                backgroundColor: colors.primaryHover
              }
            }}
          >
            Back to Assessments List
          </Button>

          {/* Summary Card */}
          <Card sx={{
            mb: 3,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px'
          }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{
                color: colors.primary,
                mb: 3
              }}>
                Assessment Summary
              </Typography>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
                gap: 3,
                '& > div': {
                  minWidth: '150px'
                }
              }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Team Name</Typography>
                  <Typography sx={{ color: "white" }}>{selectedTeam.teamName}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Conducted By</Typography>
                  <Typography sx={{ color: "white" }}>{selectedAssessment.conductedBy}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Date</Typography>
                  <Typography sx={{ color: "white" }}>
                    {new Date(selectedAssessment.assessmentDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Overall Score</Typography>
                  <Chip
                    label={`${selectedAssessment.overallScore}%`}
                    color={getPerformanceColor(selectedAssessment.overallScore)}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Status</Typography>
                  <Typography sx={{ color: "white" }}>{selectedAssessment.status}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Performance Analysis & Charts Row */}
          <Box sx={{
            display: 'flex',
            gap: 3,
            flexDirection: 'column',
            mb: 3
          }}>
            {/* Performance Overview*/}
            <Paper sx={{
              p: 2,
              flex: 1,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <Typography variant="h6" gutterBottom sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: colors.primary,
                mb: 2,
                fontSize: isMobile ? '1.1rem' : '1.25rem'
              }}>
                <BarChart fontSize={isMobile ? 'small' : 'medium'} />
                {isMobile ? 'Performance' : 'Performance Overview'}
              </Typography>
              {getCategoryChartData() && (
                <Box sx={{
                  height: isMobile ? '250px' : '300px',
                  position: 'relative',
                  width: '100%'
                }}>
                  <Bar
                    data={getCategoryChartData()}
                    options={{
                      ...horizontalChartOptions,
                      plugins: {
                        ...horizontalChartOptions.plugins,
                        title: {
                          ...horizontalChartOptions.plugins.title,
                          display: !isMobile
                        },
                        legend: {
                          ...horizontalChartOptions.plugins.legend,
                          position: isMobile ? 'bottom' : 'top'
                        }
                      }
                    }}
                  />
                </Box>
              )}
            </Paper>

            {/* Performance Analysis */}
            <Paper sx={{
              p: 2,
              flex: 1,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
            }}>
              <Typography variant="h6" gutterBottom sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: colors.primary,
                mb: 2,
                fontSize: isMobile ? '1.1rem' : '1.25rem'
              }}>
                <BarChartOutlined fontSize={isMobile ? 'small' : 'medium'} />
                Performance Analysis
              </Typography>

              {selectedAssessment && (
                <>
                  {(() => {
                    const analysis = analyzeCategoryPerformance(selectedAssessment.checkPoints);
                    return (
                      <Box sx={{ mt: 2 }}>
                        {/* Strengths */}
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle1" sx={{
                            display: 'flex',
                            alignItems: 'center',
                            color: colors.success,
                            fontWeight: 'medium',
                            mb: 1
                          }}>
                            <TrendingUp fontSize="small" sx={{ mr: 1 }} />
                            Areas of Strength
                          </Typography>

                          {analysis.strengths.length > 0 ? (
                            <Box sx={{ pl: 2 }}>
                              {analysis.strengths.map((item, index) => (
                                <Box key={index} sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  py: 1,
                                  borderBottom: index < analysis.strengths.length - 1 ? `1px solid ${colors.border}` : 'none'
                                }}>
                                  <Typography variant="body2" sx={{ color: colors.textPrimary }}>
                                    {item.category}
                                  </Typography>
                                  <Chip
                                    label={`${item.score}%`}
                                    color="success"
                                    size="small"
                                    variant="outlined"
                                  />
                                </Box>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ color: colors.textSecondary, pl: 2 }}>
                              No significant strengths identified.
                            </Typography>
                          )}
                        </Box>

                        {/* Areas for Improvement */}
                        <Box>
                          <Typography variant="subtitle1" sx={{
                            display: 'flex',
                            alignItems: 'center',
                            color: colors.warning,
                            fontWeight: 'medium',
                            mb: 1
                          }}>
                            <TrendingDown fontSize="small" sx={{ mr: 1 }} />
                            Areas for Improvement
                          </Typography>

                          {analysis.improvements.length > 0 ? (
                            <Box sx={{ pl: 2 }}>
                              {analysis.improvements.map((item, index) => (
                                <Box key={index} sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  py: 1,
                                  borderBottom: index < analysis.improvements.length - 1 ? `1px solid ${colors.border}` : 'none'
                                }}>
                                  <Typography variant="body2" sx={{ color: colors.textPrimary }}>
                                    {item.category}
                                  </Typography>
                                  <Chip
                                    label={`${item.score}%`}
                                    color={item.score < 50 ? "error" : "warning"}
                                    size="small"
                                    variant="outlined"
                                  />
                                </Box>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ color: colors.textSecondary, pl: 2 }}>
                              No significant areas for improvement.
                            </Typography>
                          )}
                        </Box>

                        {/* Recommendations */}
                        <Box sx={{ mt: 3, pt: 2, borderTop: `1px dashed ${colors.border}` }}>
                          <Typography variant="subtitle1" sx={{
                            color: colors.primary,
                            fontWeight: 'medium',
                            mb: 1
                          }}>
                            Recommendations
                          </Typography>

                          {(() => {
                            // Filter for critical areas (score <= 50%)
                            const criticalAreas = analysis.improvements.filter(item => item.score <= 60);

                            if (criticalAreas.length > 0) {
                              return (
                                <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                                  Focus training efforts on {criticalAreas.map(i => i.category).join(', ')},
                                  which {criticalAreas.length === 1 ? 'shows' : 'show'} critical need for improvement with {criticalAreas.length === 1 ? 'a score' : 'scores'} at or below 60%.
                                </Typography>
                              );
                            } else {
                              // If no areas are at or below 50%
                              return (
                                <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                                  No critical areas identified. Continue working on {analysis.improvements.slice(0, 2).map(i => i.category).join(' and ')}
                                  to further enhance overall performance.
                                </Typography>
                              );
                            }
                          })()}
                        </Box>
                      </Box>
                    );
                  })()}
                </>
              )}
            </Paper>
          </Box>

          {/* Check Points Details */}
          <Paper sx={{
            p: 3,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            mb: 3
          }}>
            <Typography variant="h6" gutterBottom sx={{
              color: colors.primary,
              mb: 2
            }}>
              Check Points Details
            </Typography>

            {selectedAssessment.checkPoints.map((point, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 1
                }}>
                  <Typography variant="subtitle1" sx={{
                    color: colors.textPrimary,
                    fontWeight: '500'
                  }}>
                    {point.name}
                  </Typography>
                  <Chip
                    label={`${point.score}%`}
                    color={getPerformanceColor(point.score)}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Typography sx={{ color: colors.textSecondary, mb: 1 }}>
                  {point.description}
                </Typography>

                <Box sx={{ my: 2, backgroundColor: '#2f2f2f', p: 2, borderRadius: '8px' }}>
                  <Typography variant="body2" sx={{
                    color: colors.textPrimary,
                    mb: 1
                  }}>
                    <strong style={{ color: colors.textSecondary }}>Notes:</strong> <br />
                    <span style={{ display: 'flex', direction: point.notes ? 'rtl' : 'ltr', textAlign: point.notes ? 'right' : 'left' }}>{point.notes || "No notes provided"}</span>
                  </Typography>
                </Box>

                {index < selectedAssessment.checkPoints.length - 1 && (
                  <Divider sx={{
                    mt: 2,
                    backgroundColor: colors.border
                  }} />
                )}
              </Box>
            ))}
          </Paper>

          {/* Feedback Section */}
          <Paper sx={{
            p: 3,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px'
          }}>
            <Typography variant="h6" gutterBottom sx={{
              color: colors.primary,
              mb: 2
            }}>
              Feedback
            </Typography>
            <TextField
              label="Feedback"
              fullWidth
              multiline
              rows={4}
              value={selectedAssessment.feedback}
              // disabled
              InputLabelProps={{
                style: { color: colors.textSecondary }
              }}
              InputProps={{
                style: {
                  color: colors.textPrimary,
                  direction: 'rtl',
                  textAlign: 'right'
                }
              }}
            />
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default OnTheJobAssessment;
