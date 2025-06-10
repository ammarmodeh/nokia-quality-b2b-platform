import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Alert,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
} from "@mui/material";
import { ArrowBack } from '@mui/icons-material';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import api from "../api/api";
import { useSelector } from "react-redux";
import AssessmentDetail from "../components/AssessmentDetail";
import AssessmentForm from "../components/AssessmentForm";
import StatsOverview from "../components/StatsOverview";
import TeamList from "../components/TeamList";
import TeamSelector from "../components/TeamSelector";
import AssessmentList from "../components/AssessmentList";

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Legend, ChartDataLabels);

const OnTheJobAssessment = () => {
  const user = useSelector((state) => state?.auth?.user);
  const [fieldTeams, setFieldTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:503px)');
  const [teamsPage, setTeamsPage] = useState(0);
  const [teamsRowsPerPage, setTeamsRowsPerPage] = useState(10);
  const [assessmentsPage, setAssessmentsPage] = useState(0);
  const [assessmentsRowsPerPage, setAssessmentsRowsPerPage] = useState(10);
  const [allAssessments, setAllAssessments] = useState([]);
  const [supervisorStats, setSupervisorStats] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState(null);
  const [teamNameConfirmation, setTeamNameConfirmation] = useState("");

  const calculateSupervisorStats = useCallback((assessments) => {
    return assessments.reduce((acc, assessment) => {
      const key = assessment.conductedById;
      if (!acc[key]) {
        acc[key] = {
          id: assessment.conductedById,
          name: assessment.conductedBy,
          assessmentCount: 1,
        };
      } else {
        acc[key].assessmentCount += 1;
      }
      return acc;
    }, {});
  }, []);

  useEffect(() => {
    setSupervisorStats(calculateSupervisorStats(allAssessments));
  }, [allAssessments, calculateSupervisorStats]);

  const initialAssessmentData = useMemo(() => ({
    conductedBy: "",
    checkPoints: [
      // Category A: Splicing & Testing Equipment
      {
        name: "Splicing Equipment Condition (FSM)",
        description: "Verifies proper condition and functionality of the splicing machine, cleaver, and fiber stripper before use.",
        category: "Splicing & Testing Equipment",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Testing Tools Condition (OPM and VFL)",
        description: "Optical power meter, laser source functionality check",
        category: "Splicing & Testing Equipment",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Consumables Availability",
        description: "Confirms the availability of essential consumables including cleaning solution, fiber wipes, and protection sleeves.",
        category: "Splicing & Testing Equipment",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      // Category B: Fiber Optic Splicing Skills (25%)
      {
        name: "Splicing Process Execution",
        description: "Correct process of splicing fiber optic cables",
        category: "Fiber Optic Splicing Skills",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Fiber Loop Management",
        description: "Proper fiber loop at splice tray (FDB - BEP - OTO)",
        category: "Fiber Optic Splicing Skills",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Power Thresholds and link-loss Management",
        description: "Ensures proper power levels and effective link-loss management to maintain optimal signal quality and network performance.",
        category: "Fiber Optic Splicing Skills",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Standard Labelling",
        description: "Follows standard-based labelling procedures",
        category: "Fiber Optic Splicing Skills",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      // Category C: ONT Placement, Configuration and testing (20%)
      {
        name: "ONT and Repeater Placement",
        description: "Verifying the best location for ONT and Wi-Fi repeater",
        category: "ONT Placement, Configuration and testing",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "ONT and Repeater Configuration",
        description: "Configures the ONT and Wi-Fi repeater according to standard network guidelines, ensuring optimal performance, coverage, and security.",
        category: "ONT Placement, Configuration and testing",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Speed Test Verification",
        description: "Performs speed tests using technician and customer devices over both Ethernet and Wi-Fi (2.4GHz and 5GHz). Ensures results align with service plan expectations and documents any discrepancies.",
        category: "ONT Placement, Configuration and testing",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      // Category E: Customer Education (20%)
      {
        name: "Wi-Fi Education",
        description: "Explains Wi-Fi coverage limits, affecting factors, and speed expectations",
        category: "Customer Education",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Troubleshooting Support",
        description: "Demonstrates the ability to accurately diagnose IPTV and VPN-related issues and guide the customer through clear, step-by-step solutions using non-technical language when appropriate.",
        category: "Customer Education",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Delivering the Evaluation Message to the Client",
        description: "Ensure the team effectively communicates the evaluation system to the client, explaining that a rating of 9 or 10 means satisfaction, and below that indicates dissatisfaction.",
        category: "Customer Education",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      // Category F: Customer Service Skills (25%)
      {
        name: "Appearance",
        description: "Maintains appropriate professional appearance",
        category: "Customer Service Skills",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Communication",
        description: "Demonstrates clear, respectful, and effective communication with the customer and team member(s) throughout the service process.",
        category: "Customer Service Skills",
        isCompleted: false,
        score: 0,
        notes: "",
      },
      {
        name: "Patience and Precision",
        description: "Ensure the team takes adequate time to address customer needs thoroughly, avoiding rushing through tasks.",
        category: "Customer Service Skills",
        isCompleted: false,
        score: 0,
        notes: "",
      }
    ],
    feedback: "",
    categoryWeights: {
      "Splicing & Testing Equipment": 0.20,
      "Fiber Optic Splicing Skills": 0.20,
      "ONT Placement, Configuration and testing": 0.20,
      "Customer Education": 0.20,
      "Customer Service Skills": 0.20
    }
  }), []);

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
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [teamsResponse, assessmentsResponse, statsResponse] = await Promise.all([
          api.get("/field-teams/get-field-teams", {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          }),
          api.get("/on-the-job-assessments", {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          }),
          api.get("/on-the-job-assessments/stats", {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          })
        ]);

        setFieldTeams(teamsResponse.data);
        setAllAssessments(assessmentsResponse.data);
        setStats(statsResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch data. Please check the console for more details.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const teamAssessmentsMap = useMemo(() => {
    const map = {};
    allAssessments.forEach(assessment => {
      const teamId = assessment.fieldTeamId?._id?.toString() ||
        assessment.fieldTeamId?.toString();

      if (teamId) {
        if (!map[teamId]) {
          map[teamId] = [];
        }
        map[teamId].push(assessment);
      }
    });
    return map;
  }, [allAssessments]);

  useEffect(() => {
    if (selectedTeam) {
      const teamId = selectedTeam._id.toString();
      setAssessments(teamAssessmentsMap[teamId] || []);
    } else {
      setAssessments([]);
    }
  }, [selectedTeam, teamAssessmentsMap]);

  const assessedTeamIds = useMemo(() => {
    return new Set(
      allAssessments.map(assessment =>
        assessment.fieldTeamId?._id?.toString() ||
        assessment.fieldTeamId?.toString()
      ).filter(Boolean)
    );
  }, [allAssessments]);

  const isTeamAssessed = useCallback((teamId) => {
    return assessedTeamIds.has(teamId.toString());
  }, [assessedTeamIds]);

  const getTeamAverageScore = useCallback((teamId) => {
    const teamAssessments = teamAssessmentsMap[teamId.toString()];
    if (!teamAssessments || teamAssessments.length === 0) return 0;

    const sum = teamAssessments.reduce((total, assessment) =>
      total + (assessment.overallScore || 0), 0);
    return Math.round(sum / teamAssessments.length);
  }, [teamAssessmentsMap]);

  const handleSubmitAssessment = useCallback(async (completeAssessment) => {
    try {
      setLoading(true);
      setError(null);

      if (!selectedTeam) {
        setError("Please select a team first");
        setLoading(false);
        return;
      }

      const payload = {
        fieldTeamId: selectedTeam._id,
        ...completeAssessment
      };

      const response = await api.post(
        "/on-the-job-assessments",
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      const assessmentsResponse = await api.get(
        `/on-the-job-assessments/field-team/${selectedTeam._id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      setAssessments(assessmentsResponse.data);

    } catch (error) {
      console.error("Error submitting assessment:", error);
      setError(error.response?.data?.message || "Failed to submit assessment");
    } finally {
      setLoading(false);
    }
  }, [selectedTeam]);

  const calculateOverallScore = useCallback((checkPoints) => {
    if (!checkPoints || checkPoints.length === 0) return 0;

    const totalScore = checkPoints.reduce((sum, checkpoint) => sum + checkpoint.score, 0);
    const averageScore = totalScore / checkPoints.length;
    return Math.round(averageScore);
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
        max: 100,
        ticks: {
          color: colors.textPrimary,
          stepSize: 10,
          precision: 0,
          callback: function (value) {
            return value + '%';
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

  const handleDeleteAssessment = (assessmentId) => {
    if (user.role !== 'Admin') {
      alert("You do not have permission to delete the assessments.");
      return;
    }

    const assessment = assessments.find(a => a._id === assessmentId);
    setAssessmentToDelete(assessment);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAssessment = async () => {
    // console.log({ assessmentToDelete });
    if (!assessmentToDelete) return;

    // Check if the entered team name matches
    if (teamNameConfirmation !== selectedTeam?.teamName) {
      // console.log({ teamNameConfirmation, selectedTeam });
      setError("Team name does not match. Please enter the exact team name to confirm deletion.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Remove from local state first
      setAssessments(prev => prev.filter(a => a._id !== assessmentToDelete._id));
      setAllAssessments(prev => prev.filter(a => a._id !== assessmentToDelete._id));
      setStats(prev => ({
        ...prev,
        overallStats: {
          ...prev.overallStats,
          totalAssessments: prev.overallStats.totalAssessments - 1
        }
      }));

      // Make API call to delete
      await api.patch(
        `/on-the-job-assessments/${assessmentToDelete._id}/soft-delete`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );

      // Reset dialog state
      setDeleteDialogOpen(false);
      setTeamNameConfirmation("");
      setAssessmentToDelete(null);

    } catch (error) {
      console.error("Error deleting assessment:", error);
      setError("Failed to delete assessment");

      // Revert local state if deletion fails
      if (assessmentToDelete) {
        setAssessments(prev => [...prev, assessmentToDelete]);
        setAllAssessments(prev => [...prev, assessmentToDelete]);
        setStats(prev => ({
          ...prev,
          overallStats: {
            ...prev.overallStats,
            totalAssessments: prev.overallStats.totalAssessments + 1
          }
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditAssessment = (assessment) => {
    setSelectedAssessment(assessment);
    setEditMode(true);
  };

  const handleUpdateAssessment = useCallback(async (updatedAssessment) => {
    try {
      setLoading(true);

      const payload = {
        ...updatedAssessment,
        overallScore: calculateOverallScore(updatedAssessment.checkPoints, updatedAssessment.categoryWeights)
      };

      await api.put(
        `/on-the-job-assessments/${selectedAssessment._id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      const assessmentsResponse = await api.get(
        `/on-the-job-assessments/field-team/${selectedTeam._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      setAssessments(assessmentsResponse.data);
      setEditMode(false);
      setSelectedAssessment(null);
      setError(null);
    } catch (error) {
      console.error("Error updating assessment:", error);
      setError("Failed to update assessment");
    } finally {
      setLoading(false);
    }
  }, [selectedAssessment?._id, selectedTeam?._id, calculateOverallScore]);

  const MemoizedAssessmentForm = React.memo(AssessmentForm);

  return (
    <Box sx={{
      backgroundColor: colors.background,
      minHeight: '100vh',
      maxWidth: '1100px',
      mx: 'auto',
      color: colors.textPrimary,
      p: 2,
      px: isMobile ? 0 : undefined
    }}>
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

      <Typography variant="h4" gutterBottom sx={{
        color: colors.primary,
        fontWeight: 'bold',
        mb: 4
      }}>
        On-The-Job Assessments
      </Typography>

      <TeamSelector
        fieldTeams={fieldTeams}
        selectedTeam={selectedTeam}
        setSelectedTeam={setSelectedTeam}
        loading={loading}
        colors={colors}
      />

      {selectedTeam && !selectedAssessment && (
        <>
          {user.title === "Field Technical Support - QoS" && (
            <MemoizedAssessmentForm
              key={selectedTeam?._id || 'new-assessment'}
              initialAssessment={initialAssessmentData}
              loading={loading}
              colors={colors}
              onSubmit={handleSubmitAssessment}
              calculateOverallScore={calculateOverallScore}
              getPerformanceColor={getPerformanceColor}
              editMode={editMode}
            />
          )}

          <AssessmentList
            assessments={assessments}
            colors={colors}
            getPerformanceColor={getPerformanceColor}
            onSelectAssessment={setSelectedAssessment}
            onEditAssessment={handleEditAssessment}
            onDeleteAssessment={handleDeleteAssessment}
            user={user}
            page={assessmentsPage}
            rowsPerPage={assessmentsRowsPerPage}
            onPageChange={(e, newPage) => setAssessmentsPage(newPage)}
            onRowsPerPageChange={(e) => {
              setAssessmentsRowsPerPage(parseInt(e.target.value, 10));
              setAssessmentsPage(0);
            }}
            loading={loading}
          />
        </>
      )}

      {selectedAssessment && selectedTeam && !editMode && (
        <AssessmentDetail
          assessment={selectedAssessment}
          team={selectedTeam}
          colors={colors}
          getPerformanceColor={getPerformanceColor}
          getCategoryChartData={getCategoryChartData}
          horizontalChartOptions={horizontalChartOptions}
          analyzeCategoryPerformance={analyzeCategoryPerformance}
          isMobile={isMobile}
          onBack={() => {
            setSelectedAssessment(null);
            setEditMode(false);
          }}
          onEdit={() => setEditMode(true)}
        />
      )}

      {editMode && selectedAssessment && (
        <AssessmentForm
          initialAssessment={selectedAssessment}
          loading={loading}
          colors={colors}
          onSubmit={handleUpdateAssessment}
          calculateOverallScore={calculateOverallScore}
          getPerformanceColor={getPerformanceColor}
          editMode={editMode}
          onCancel={() => {
            setEditMode(false);
            setSelectedAssessment(null);
          }}
        />
      )}

      <StatsOverview
        key={JSON.stringify(stats) + JSON.stringify(supervisorStats)}
        stats={stats}
        supervisorStats={supervisorStats}
        colors={colors}
        isMobile={isMobile}
      />

      {fieldTeams.length > 0 && (
        <TeamList
          fieldTeams={fieldTeams}
          colors={colors}
          isTeamAssessed={isTeamAssessed}
          teamAssessmentsMap={teamAssessmentsMap}
          getTeamAverageScore={getTeamAverageScore}
          getPerformanceColor={getPerformanceColor}
          loading={loading}
          page={teamsPage}
          rowsPerPage={teamsRowsPerPage}
          onPageChange={(e, newPage) => setTeamsPage(newPage)}
          onRowsPerPageChange={(e) => {
            setTeamsRowsPerPage(parseInt(e.target.value, 10));
            setTeamsPage(0);
          }}
          onSelectTeam={setSelectedTeam}
        />
      )}

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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setTeamNameConfirmation("");
        }}
        aria-labelledby="delete-dialog-title"
        PaperProps={{
          sx: {
            backgroundColor: colors.surface,
            color: colors.textPrimary
          }
        }}
      >
        <DialogTitle id="delete-dialog-title">Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: colors.textSecondary, mb: 2 }}>
            Are you sure you want to delete this assessment? This action cannot be undone.
          </DialogContentText>
          <DialogContentText sx={{ color: colors.textSecondary, mb: 2 }}>
            To confirm, please enter the team name: <strong>{selectedTeam?.name}</strong>
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="team-name"
            label="Team Name"
            type="text"
            fullWidth
            variant="outlined"
            value={teamNameConfirmation}
            onChange={(e) => setTeamNameConfirmation(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: colors.border,
                },
                '&:hover fieldset': {
                  borderColor: colors.primary,
                },
              },
              '& .MuiInputLabel-root': {
                color: colors.textSecondary,
              },
              '& .MuiInputBase-input': {
                color: colors.textPrimary,
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setTeamNameConfirmation("");
            }}
            sx={{ color: colors.textSecondary }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteAssessment}
            disabled={teamNameConfirmation !== selectedTeam?.teamName}
            sx={{ color: colors.error }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OnTheJobAssessment;