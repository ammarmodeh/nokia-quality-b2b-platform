import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Alert,
  useMediaQuery,
} from "@mui/material";
import { ArrowBack } from '@mui/icons-material';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Legend } from 'chart.js';
import api from "../api/api";
import { useSelector } from "react-redux";
import AssessmentDetail from "../components/AssessmentDetail";
import AssessmentForm from "../components/AssessmentForm";
import StatsOverview from "../components/StatsOverview";
import TeamList from "../components/TeamList";
import UndoNotification from "../components/UndoNotification";
import TeamSelector from "../components/TeamSelector";
import AssessmentList from "../components/AssessmentList";

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Legend);

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
  const [showUndo, setShowUndo] = useState(false);
  const [deletedAssessment, setDeletedAssessment] = useState(null);
  const [undoTimeout, setUndoTimeout] = useState(null);
  // console.log('OnTheJobAssessment Triggered');

  const [supervisorStats, setSupervisorStats] = useState({});

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
      "Equipment": 0.10,
      "Splicing": 0.25,
      "Configuration": 0.20,
      "Validation": 0.10,
      "Customer": 0.20,
      "Service": 0.25
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

  useEffect(() => {
    return () => {
      if (undoTimeout) clearTimeout(undoTimeout);
    };
  }, [undoTimeout]);

  useEffect(() => {
    const pendingUndo = localStorage.getItem('pendingUndo');
    if (pendingUndo) {
      const { assessmentId, deletionTime, teamId } = JSON.parse(pendingUndo);

      const deletionDate = new Date(deletionTime);
      const now = new Date();
      const hoursSinceDeletion = (now - deletionDate) / (1000 * 60 * 60);

      if (hoursSinceDeletion < 24) {
        setDeletedAssessment(assessmentId);
        setShowUndo(true);

        const remainingMs = 24 * 60 * 60 * 1000 - (now - deletionDate);

        const timeout = setTimeout(() => {
          localStorage.removeItem('pendingUndo');
          setShowUndo(false);
          setDeletedAssessment(null);
        }, remainingMs);

        setUndoTimeout(timeout);

        if (selectedTeam?._id !== teamId) {
          // navigate(`/path-to-team-assessments/${teamId}`);
        }
      } else {
        localStorage.removeItem('pendingUndo');
      }
    }
  }, [selectedTeam]);

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

      console.log({ payload });

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

  // const calculateOverallScore = useCallback((checkPoints, categoryWeights = {}) => {
  //   if (!checkPoints || checkPoints.length === 0) return 0;

  //   const defaultWeights = {
  //     "Equipment": 0.10,
  //     "Splicing": 0.25,
  //     "Configuration": 0.20,
  //     "Validation": 0.10,
  //     "Customer": 0.20,
  //     "Service": 0.25
  //   };

  //   const weights = Object.keys(categoryWeights).length > 0 ? categoryWeights : defaultWeights;

  //   const categories = checkPoints.reduce((acc, checkpoint) => {
  //     const category = checkpoint.category;
  //     if (!acc[category]) {
  //       acc[category] = [];
  //     }
  //     acc[category].push(checkpoint);
  //     return acc;
  //   }, {});

  //   let weightedSum = 0;

  //   Object.entries(categories).forEach(([category, points]) => {
  //     const categoryScore = points.reduce((sum, point) => sum + point.score, 0) / points.length;
  //     const weight = weights[category] || 0;
  //     weightedSum += categoryScore * weight;
  //   });

  //   return Math.round(weightedSum);
  // }, []);

  const calculateOverallScore = useCallback((checkPoints) => {
    if (!checkPoints || checkPoints.length === 0) return 0;

    // Calculate the total score by summing all checkpoint scores
    const totalScore = checkPoints.reduce((sum, checkpoint) => sum + checkpoint.score, 0);
    console.log({ totalScore });

    // Calculate the average score
    const averageScore = totalScore / checkPoints.length;
    console.log({ averageScore });

    // Log the total score and average score for debugging
    console.log("Total Score:", totalScore);
    console.log("Average Score (before rounding):", averageScore);

    // Return the average score, optionally rounded
    return Math.round(averageScore); // You can remove Math.round if you want the exact value
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

  const handleDeleteAssessment = async (assessmentId) => {
    if (user.role !== 'Admin') {
      alert("You do not have permission to delete the assessments.");
      return;
    }

    const confirmation = confirm("Are you sure you want to delete this assessment?");
    if (!confirmation) return;

    try {
      setLoading(true);
      setError(null);

      const deletedAssessment = assessments.find(a => a._id === assessmentId);
      setAssessments(prev => prev.filter(a => a._id !== assessmentId));
      setAllAssessments(prev => prev.filter(a => a._id !== assessmentId));
      setStats(prev => ({
        ...prev,
        overallStats: {
          ...prev.overallStats,
          totalAssessments: prev.overallStats.totalAssessments - 1
        }
      }));

      const response = await api.patch(
        `/on-the-job-assessments/${assessmentId}/soft-delete`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );

      const deletionInfo = {
        assessmentId,
        assessmentData: deletedAssessment,
        deletionTime: new Date().toISOString(),
        teamId: selectedTeam._id
      };
      localStorage.setItem('pendingUndo', JSON.stringify(deletionInfo));

      setDeletedAssessment(assessmentId);
      setShowUndo(true);

      const timeout = setTimeout(() => {
        localStorage.removeItem('pendingUndo');
        setShowUndo(false);
        setDeletedAssessment(null);
      }, 24 * 60 * 60 * 1000);
      setUndoTimeout(timeout);

      if (response.data.stats) {
        setStats(prev => ({
          ...prev,
          overallStats: response.data.stats
        }));
      }

    } catch (error) {
      console.error("Error deleting assessment:", error);
      setError("Failed to delete assessment");

      if (deletedAssessment) {
        setAssessments(prev => [...prev, deletedAssessment]);
        setAllAssessments(prev => [...prev, deletedAssessment]);
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

  const handleUndoDelete = async () => {
    try {
      setLoading(true);
      setError(null);

      const pendingUndo = JSON.parse(localStorage.getItem('pendingUndo'));
      if (!pendingUndo) {
        setError("No assessment to undo");
        return;
      }

      const { assessmentId, assessmentData, teamId } = pendingUndo;

      setAssessments(prev => [...prev, assessmentData]);
      setAllAssessments(prev => [...prev, assessmentData]);
      setStats(prev => ({
        ...prev,
        overallStats: {
          ...prev.overallStats,
          totalAssessments: (prev.overallStats.totalAssessments || 0) + 1
        }
      }));

      const response = await api.patch(
        `/on-the-job-assessments/${assessmentId}/restore`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      localStorage.removeItem('pendingUndo');
      if (undoTimeout) clearTimeout(undoTimeout);

      setShowUndo(false);
      setDeletedAssessment(null);
      setError(null);

      const [statsResponse, assessmentsResponse] = await Promise.all([
        api.get("/on-the-job-assessments/stats", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }),
        api.get(`/on-the-job-assessments/field-team/${teamId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        })
      ]);

      setStats(statsResponse.data);
      setAssessments(assessmentsResponse.data);
    } catch (error) {
      console.error("Error undoing delete:", error);
      setError(error.response?.data?.message || "Failed to undo delete");

      if (deletedAssessment) {
        setAssessments(prev => prev.filter(a => a._id !== deletedAssessment._id));
        setAllAssessments(prev => prev.filter(a => a._id !== deletedAssessment._id));
        setStats(prev => ({
          ...prev,
          overallStats: {
            ...prev.overallStats,
            totalAssessments: (prev.overallStats.totalAssessments || 0) - 1
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

      {error && !showUndo && (
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

      {showUndo && (
        <UndoNotification
          showUndo={showUndo}
          onUndo={handleUndoDelete}
          colors={colors}
        />
      )}
    </Box>
  );
};

export default OnTheJobAssessment;
