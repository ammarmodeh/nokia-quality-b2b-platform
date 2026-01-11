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
import { ArrowBack, Circle, Download } from '@mui/icons-material';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import * as XLSX from 'xlsx';
import api from "../api/api";
import { useSelector } from "react-redux";
import { toast } from "sonner";
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
  const [openAssessmentDialog, setOpenAssessmentDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
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

  // Consistent scoring labels function
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        setSettings(response.data);
      } catch (err) {
        console.error('Failed to fetch settings');
      }
    };
    fetchSettings();
  }, []);

  const getScoreLabel = useCallback((score) => {
    // Thresholds adjusted for 0-100 percentage scale
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Satisfactory';
    if (score >= 40) return 'Needs Improvement';
    return 'Poor';
  }, []);

  const getLabelForCheckpoint = useCallback((checkpointName, score) => {
    if (checkpointName === "Consumables Availability") {
      if (score >= 5) return "Fully Available";
      if (score >= 4) return "Mostly Available";
      if (score >= 3) return "Partially Available";
      if (score >= 2) return "Limited";
      return "Not Available";
    }
    if (checkpointName.includes("Equipment Condition") || checkpointName.includes("Tools Condition")) {
      if (score >= 5) return "Excellent Condition";
      if (score >= 4) return "Good";
      if (score >= 3) return "Fair / Functional";
      if (score >= 2) return "Substandard";
      return "Defective / Non-Functional";
    }
    if (checkpointName === "Patience and Precision") {
      if (score >= 5) return "Meticulous / Patient";
      if (score >= 4) return "Precise";
      if (score >= 3) return "Adequate";
      if (score >= 2) return "Poor Precision";
      return "Rushed / Careless";
    }
    if (checkpointName === "Communication") {
      if (score >= 5) return "Exceptional";
      if (score >= 4) return "Professional";
      if (score >= 3) return "Average";
      if (score >= 2) return "Minimal";
      return "Poor";
    }
    if (checkpointName === "Appearance") {
      if (score >= 5) return "Flawless";
      if (score >= 4) return "Neat / Professional";
      if (score >= 3) return "Acceptable";
      if (score >= 2) return "Incomplete Uniform";
      return "Unprofessional / Untidy";
    }

    if (score >= 4.5) return "Excellent";
    if (score >= 3.5) return "Good";
    if (score >= 2.5) return "Satisfactory";
    if (score >= 1.5) return "Needs Improvement";
    return "Poor";
  }, []);

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

  // Auto-open new assessment dialog when a team is selected
  useEffect(() => {
    if (selectedTeam && user.title === "Field Technical Support - QoS") {
      setOpenAssessmentDialog(true);
    }
  }, [selectedTeam]);

  const initialAssessmentData = useMemo(() => ({
    conductedBy: "",
    checkPoints: [
      // Category A: Splicing & Testing Equipment
      {
        name: "Splicing Equipment Condition (FSM)",
        description: "Verifies proper condition and functionality of the splicing machine, cleaver, and fiber stripper before use.",
        category: "Splicing & Testing Equipment",
        isCompleted: false,
        score: 1,
        notes: "",
      },
      {
        name: "Testing Tools Condition (OPM and VFL)",
        description: "Optical power meter, laser source functionality check",
        category: "Splicing & Testing Equipment",
        isCompleted: false,
        score: 1,
        notes: "",
      },
      {
        name: "Consumables Availability",
        description: "Confirms the availability of essential consumables including cleaning solution, fiber wipes, and protection sleeves.",
        category: "Splicing & Testing Equipment",
        isCompleted: false,
        score: 1,
        notes: "",
      },
      // Category B: Fiber Optic Splicing Skills (25%)
      {
        name: "Splicing Process Execution",
        description: "Correct process of splicing fiber optic cables",
        category: "Fiber Optic Splicing Skills",
        isCompleted: false,
        score: 1,
        notes: "",
      },
      {
        name: "Fiber Loop Management",
        description: "Proper fiber loop at splice tray (FDB - BEP - OTO)",
        category: "Fiber Optic Splicing Skills",
        isCompleted: false,
        score: 1,
        notes: "",
      },
      {
        name: "Power Thresholds and link-loss Management",
        description: "Ensures proper power levels and effective link-loss management to maintain optimal signal quality and network performance.",
        category: "Fiber Optic Splicing Skills",
        isCompleted: false,
        score: 1,
        notes: "",
      },
      {
        name: "Standard Labelling",
        description: "Follows standard-based labelling procedures",
        category: "Fiber Optic Splicing Skills",
        isCompleted: false,
        score: 1,
        notes: "",
      },
      // Category C: ONT Placement, Configuration and testing (20%)
      {
        name: "ONT and Repeater Placement",
        description: "Verifying the best location for ONT and Wi-Fi repeater",
        category: "ONT Placement, Configuration and testing",
        isCompleted: false,
        score: 1,
        notes: "",
      },
      {
        name: "ONT and Repeater Configuration",
        description: "Configures the ONT and Wi-Fi repeater according to standard network guidelines, ensuring optimal performance, coverage, and security.",
        category: "ONT Placement, Configuration and testing",
        isCompleted: false,
        score: 1,
        notes: "",
      },
      {
        name: "Speed Test Verification",
        description: "Performs speed tests using technician and customer devices over both Ethernet and Wi-Fi (2.4GHz and 5GHz). Ensures results align with service plan expectations and documents any discrepancies.",
        category: "ONT Placement, Configuration and testing",
        isCompleted: false,
        score: 1,
        notes: "",
      },
      // Category E: Customer Education (20%)
      {
        name: "Wi-Fi Education",
        description: "Explains Wi-Fi coverage limits, affecting factors, and speed expectations",
        category: "Customer Education",
        isCompleted: false,
        score: 1,
        notes: "",
      },
      {
        name: "Troubleshooting Support",
        description: "Demonstrates the ability to accurately diagnose IPTV and VPN-related issues and guide the customer through clear, step-by-step solutions using non-technical language when appropriate.",
        category: "Customer Education",
        isCompleted: false,
        score: 1,
        notes: "",
      },
      {
        name: "Delivering the Evaluation Message to the Client",
        description: "Ensure the team effectively communicates the evaluation system to the client, explaining that a rating of 9 or 10 means satisfaction, and below that indicates dissatisfaction.",
        category: "Customer Education",
        isCompleted: false,
        score: 1,
        notes: "",
      },
      // Category F: Customer Service Skills (25%)
      {
        name: "Appearance",
        description: "Maintains appropriate professional appearance",
        category: "Customer Service Skills",
        isCompleted: false,
        score: 1,
        notes: "",
      },
      {
        name: "Communication",
        description: "Demonstrates clear, respectful, and effective communication with the customer and team member(s) throughout the service process.",
        category: "Customer Service Skills",
        isCompleted: false,
        score: 1,
        notes: "",
      },
      {
        name: "Patience and Precision",
        description: "Ensure the team takes adequate time to address customer needs thoroughly, avoiding rushing through tasks.",
        category: "Customer Service Skills",
        isCompleted: false,
        score: 1,
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
    background: 'transparent', // Deeper, more modern dark
    surface: 'rgba(23, 23, 28, 0.7)', // Glass surface
    surfaceElevated: 'rgba(30, 30, 40, 0.8)',
    border: 'rgba(255, 255, 255, 0.08)',
    primary: '#6366f1', // Indigo (Modern Premium)
    primaryHover: 'rgba(99, 102, 241, 0.15)',
    secondary: '#a855f7', // Purple accent
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    chartCorrect: '#10b981',
    chartIncorrect: '#ef4444',
    glass: 'backdrop-filter: blur(16px) saturate(180%);',
    shadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37);'
  }), []);

  const glassStyle = {
    background: colors.surface,
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    border: `1px solid ${colors.border}`,
    borderRadius: '16px',
    boxShadow: colors.shadow,
  };

  const headerGradient = {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      total + (Number(assessment.overallScore) || 0), 0);
    return Math.round(sum / teamAssessments.length);
  }, [teamAssessmentsMap]);

  const analyzeCategoryPerformance = useCallback((checkPoints, categoryWeights = {}) => {
    const categoryStats = checkPoints.reduce((acc, point) => {
      if (!acc[point.category]) {
        acc[point.category] = {
          totalScore: 0,
          count: 0,
          weight: categoryWeights[point.category] || 0.20
        };
      }
      acc[point.category].totalScore += point.score;
      acc[point.category].count += 1;
      return acc;
    }, {});

    const categoryList = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      score: Number((stats.totalScore / stats.count).toFixed(1))
    }));

    // Updated to use consistent thresholds (3.5/5 is roughly 70%)
    const strengths = categoryList.filter(cat => cat.score >= 3.5).sort((a, b) => b.score - a.score);
    const improvements = categoryList.filter(cat => cat.score < 3.5).sort((a, b) => a.score - b.score);

    return { strengths, improvements, categoryList };
  }, []);

  // Helper to create safe sheet names (max 31 chars, no invalid chars)
  const createSafeSheetName = useCallback((teamName) => {
    // Replace invalid characters
    let safeName = teamName.replace(/[\\/:*?"<>|]/g, '_').trim();
    // Truncate to 31 chars if needed
    if (safeName.length > 31) {
      safeName = safeName.substring(0, 31);
    }
    return safeName;
  }, []);

  // Helper to ensure scores are shown on 1-5 scale in exports
  const formatScoreForExport = useCallback((score) => {
    const numScore = Number(score) || 0;
    // If score is > 5, it's likely a percentage (0-100)
    if (numScore > 5) {
      return (numScore / 20).toFixed(1);
    }
    return numScore.toFixed(1);
  }, []);

  // XLSX Export Helpers
  const handleExportTeamSummary = useCallback(() => {
    const exportDate = new Date().toISOString().split('T')[0];
    const filename = `all_teams_otj-assessment_summary_${exportDate}.xlsx`;

    const wb = XLSX.utils.book_new();

    // Overall Summary Sheet
    const summaryData = Array.from(assessedTeamIds).map(teamId => {
      const team = fieldTeams.find(t => t._id.toString() === teamId);
      const numAssessments = teamAssessmentsMap[teamId]?.length || 0;
      const avgScore = getTeamAverageScore(teamId);
      // Find the most recent assessment date for the team
      const teamAssessments = teamAssessmentsMap[teamId] || [];
      const latestAssessment = teamAssessments.reduce((latest, assessment) => {
        const assessmentDate = assessment.assessmentDate || assessment.createdAt;
        if (!assessmentDate) return latest;
        const currentDate = new Date(assessmentDate);
        if (!latest || currentDate > new Date(latest.assessmentDate || latest.createdAt)) {
          return assessment;
        }
        return latest;
      }, null);
      const latestDateTime = latestAssessment
        ? new Date(latestAssessment.assessmentDate || latestAssessment.createdAt).toLocaleString()
        : 'N/A';
      return [
        team?.teamName || 'Unknown',
        numAssessments,
        `${Math.round(avgScore)}%`,
        getScoreLabel(avgScore),
        latestDateTime
      ];
    });

    const ws_overall = XLSX.utils.aoa_to_sheet([
      ['Team Name', 'Number of Assessments', 'Average Score', 'Performance Label', 'Latest Assessment Date and Time'], // Updated header
      ...summaryData
    ]);
    ws_overall['!cols'] = [
      { wch: 30 }, // Team Name
      { wch: 20 }, // Number of Assessments
      { wch: 15 }, // Average Score
      { wch: 20 }, // Performance Label
      { wch: 20 }  // Latest Assessment Date and Time
    ];
    XLSX.utils.book_append_sheet(wb, ws_overall, 'Overall Summary');

    // Category weights (fixed)
    const categoryWeights = {
      "Splicing & Testing Equipment": 0.20,
      "Fiber Optic Splicing Skills": 0.20,
      "ONT Placement, Configuration and testing": 0.20,
      "Customer Education": 0.20,
      "Customer Service Skills": 0.20
    };

    // For each assessed team, create a single detailed sheet
    Array.from(assessedTeamIds).forEach(teamId => {
      const team = fieldTeams.find(t => t._id.toString() === teamId);
      if (!team) return;

      const teamName = team.teamName;
      const teamAssessments = teamAssessmentsMap[teamId] || [];
      const numAssessments = teamAssessments.length;
      const avgScore = getTeamAverageScore(teamId);

      // Compute category stats
      const categoryTotals = {};
      teamAssessments.forEach(assessment => {
        assessment.checkPoints.forEach(point => {
          const cat = point.category;
          if (!categoryTotals[cat]) {
            categoryTotals[cat] = { totalScore: 0, count: 0, weight: categoryWeights[cat] || 0.20 };
          }
          categoryTotals[cat].totalScore += point.score;
          categoryTotals[cat].count += 1;
        });
      });

      const categoryList = Object.entries(categoryTotals).map(([category, stats]) => {
        const avg = stats.totalScore / stats.count;
        return {
          category,
          average: avg,
          // If the raw score average is > 5, it's already a percentage
          percentage: avg > 5 ? avg : (avg / 5) * 100
        };
      });

      const categoryRows = categoryList.map(c => [
        c.category,
        `${Math.round(c.percentage)}%`,
        getScoreLabel(c.percentage)
      ]);

      // Compute checkpoint details (no date here to avoid repetition)
      const checkpointDetails = [];
      teamAssessments.forEach(assessment => {
        assessment.checkPoints.forEach(cp => {
          checkpointDetails.push({
            category: cp.category,
            name: cp.name,
            description: cp.description || 'No description available',
            score: cp.score,
            label: getScoreLabel(cp.score)
          });
        });
      });

      // Aggregate checkpoint averages for strengths and improvements
      const checkpointTotals = {};
      checkpointDetails.forEach(cp => {
        const key = cp.name;
        if (!checkpointTotals[key]) {
          checkpointTotals[key] = {
            sum: 0,
            count: 0,
            category: cp.category,
            description: cp.description
          };
        }
        checkpointTotals[key].sum += cp.score;
        checkpointTotals[key].count += 1;
      });

      const checkpointList = Object.entries(checkpointTotals).map(([name, stats]) => {
        const avg = Number((stats.sum / stats.count).toFixed(1));
        return {
          name,
          average: avg,
          category: stats.category,
          description: stats.description
        };
      });

      const checkpointStrengths = checkpointList
        .filter(cp => cp.average >= 4 || (cp.average > 5 && cp.average >= 80)) // Handle both scales
        .sort((a, b) => b.average - a.average)
        .map(cp => [cp.name, `${formatScoreForExport(cp.average)}/5`]);

      const checkpointImprovements = checkpointList
        .filter(cp => cp.average < 3 || (cp.average > 5 && cp.average < 60)) // Handle both scales
        .sort((a, b) => a.average - b.average)
        .map(cp => [cp.name, `${formatScoreForExport(cp.average)}/5`]);

      // Detailed rows without assessment date to avoid repetition
      const detailRows = checkpointDetails.map(cp => [
        cp.category,
        cp.name,
        cp.description,
        `${formatScoreForExport(cp.score)}/5`
      ]);

      // Single sheet data combining summary, strengths/improvements, and details
      const teamSheetData = [
        [`Team Summary for ${teamName}`],
        [],
        ['Number of Assessments', numAssessments],
        ['Overall Average Score', `${Math.round(avgScore)}%`],
        [],
        ['Category Averages'],
        ['Category', 'Average Score (%)'],
        ...categoryRows,
        [],
        ['Checkpoint Strengths (Average Score >= 4)'],
        ['Checkpoint', 'Average Score (1-5)'],
        ...checkpointStrengths,
        [],
        ['Checkpoint Areas for Improvement (Average Score < 3)'],
        ['Checkpoint', 'Average Score (1-5)'],
        ...checkpointImprovements,
        [],
        ['Detailed Checkpoint Scores'],
        ['Category', 'Checkpoint Name', 'Description', 'Score (1-5)'], // No date here
        ...detailRows
      ];

      const ws_team = XLSX.utils.aoa_to_sheet(teamSheetData);
      const safeSheetName = createSafeSheetName(teamName);
      XLSX.utils.book_append_sheet(wb, ws_team, safeSheetName);
      ws_team['!cols'] = [
        { wch: 30 }, // Category
        { wch: 25 }, // Checkpoint Name
        { wch: 50 }, // Description
        { wch: 12 }  // Score
      ];
    });

    XLSX.writeFile(wb, filename);
  }, [assessedTeamIds, fieldTeams, teamAssessmentsMap, getTeamAverageScore, createSafeSheetName, getScoreLabel]);

  const handleExportIndividualAssessment = useCallback((assessment, teamName) => {
    // Format date and time
    const dateTime = assessment.assessmentDate
      ? new Date(assessment.assessmentDate).toLocaleString()
      : (assessment.createdAt ? new Date(assessment.createdAt).toLocaleString() : 'N/A');

    // Compute category statistics for detailed export
    const categoryStats = assessment.checkPoints.reduce((acc, point) => {
      if (!acc[point.category]) {
        acc[point.category] = {
          totalScore: 0,
          count: 0,
          weight: assessment.categoryWeights[point.category] || 0.20
        };
      }
      acc[point.category].totalScore += point.score;
      acc[point.category].count += 1;
      return acc;
    }, {});

    const categoryList = Object.entries(categoryStats).map(([category, stats]) => {
      const avg = stats.totalScore / stats.count;
      return {
        category,
        average: avg,
        percentage: avg > 5 ? avg : (avg / 5) * 100
      };
    });

    const categoryRows = categoryList.map(c => [c.category, `${Math.round(c.percentage)}%`]);

    // Updated thresholds to match numeric scale
    const checkpointStrengths = assessment.checkPoints
      .filter(cp => cp.score >= 4 || (cp.score > 5 && cp.score >= 80))
      .sort((a, b) => b.score - a.score)
      .map(cp => [cp.name, `${formatScoreForExport(cp.score)}/5`]);

    const checkpointImprovements = assessment.checkPoints
      .filter(cp => cp.score < 3 || (cp.score > 5 && cp.score < 60))
      .sort((a, b) => a.score - b.score)
      .map(cp => [cp.name, `${formatScoreForExport(cp.score)}/5`]);

    // Summary Sheet Data - include date and time in a single cell
    // Summary Sheet Data - include date and time in a single cell
    const summaryData = [
      [`Assessment Summary for ${teamName}`],
      [],
      ['Team Name', teamName],
      ['Conducted By', assessment.conductedBy || 'N/A'],
      ['Assessment Date and Time', dateTime], // Date and time in a single cell
      ['Overall Score', `${Math.round(assessment.overallScore || 0)}%`],
      [],
      ['Category Averages'],
      ['Category', 'Average Score (%)'],
      ...categoryRows,
      [],
      ['Feedback'],
      [assessment.feedback || 'No feedback provided.']
    ];

    // Checkpoints Sheet Data - no date repetition
    const detailHeaders = ['Category', 'Checkpoint Name', 'Description', 'Completed', 'Score (1-5)', 'Notes'];
    const detailRows = assessment.checkPoints.map(cp => {
      const label = getLabelForCheckpoint(cp.name, cp.score); // Changed line
      const isSpecial = ["Consumables Availability"].includes(cp.name) ||
        cp.name.includes("Equipment Condition") ||
        cp.name.includes("Tools Condition") ||
        ["Appearance", "Communication", "Patience and Precision"].includes(cp.name);

      return [
        cp.category,
        cp.name,
        cp.description || 'No description available',
        cp.isCompleted ? 'Yes' : 'No',
        isSpecial ? label : `${formatScoreForExport(cp.score)}/5`,
        cp.notes || ''
      ];
    });

    const checkpointsSheetData = [
      [`Checkpoints for ${teamName}`],
      [], // Removed date from here to avoid repetition
      ['Checkpoint Strengths (Score >= 3.5 - Good/Excellent)'],
      ['Checkpoint', 'Score (1-5)'],
      ...checkpointStrengths,
      [],
      ['Checkpoint Areas for Improvement (Score < 3.5)'],
      ['Checkpoint', 'Score (1-5)'],
      ...checkpointImprovements,
      [],
      detailHeaders,
      ...detailRows
    ];

    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const ws_summary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws_summary, 'Summary');
    ws_summary['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 20 }];

    // Checkpoints Sheet
    const ws_details = XLSX.utils.aoa_to_sheet(checkpointsSheetData);
    XLSX.utils.book_append_sheet(wb, ws_details, 'Checkpoints');
    ws_details['!cols'] = [
      { wch: 30 },
      { wch: 25 },
      { wch: 50 },
      { wch: 10 },
      { wch: 12 },
      { wch: 30 }
    ];

    // Use date only (no time) for filename to keep it concise
    const dateForFilename = assessment.assessmentDate
      ? new Date(assessment.assessmentDate).toLocaleDateString().replace(/\//g, '-')
      : (assessment.createdAt ? new Date(assessment.createdAt).toLocaleDateString().replace(/\//g, '-') : 'unknown');
    const filename = `${teamName}_OTJ-Assessment_${dateForFilename}.xlsx`;

    XLSX.writeFile(wb, filename);
  }, [getScoreLabel]);

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
      setOpenAssessmentDialog(false); // Close the dialog after successful submission

      // Refresh all data to update global stats and other components
      await fetchData();
      toast.success("Assessment submitted and statistics updated!");
    } catch (error) {
      console.error("Error submitting assessment:", error);
      setError(error.response?.data?.message || "Failed to submit assessment");
      toast.error("Failed to submit assessment");
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, fetchData]);

  const calculateOverallScore = useCallback((checkPoints) => {
    if (!checkPoints || checkPoints.length === 0) return 0;

    // Calculate overall score as percentage (0-100)
    // Each checkpoint is on 1-5 scale, so max sum is length * 5
    const sum = checkPoints.reduce((acc, cp) => acc + (cp.score || 0), 0);
    const maxPossible = checkPoints.length * 5;
    const percentage = (sum / maxPossible) * 100;

    return Math.round(percentage);
  }, []);

  const getPerformanceColor = useCallback((score) => {
    // scale 0-100 (percentage)
    if (score >= 80) return 'success'; // Good & Excellent
    if (score >= 60) return 'warning'; // Satisfactory
    if (score >= 40) return 'warning'; // Needs Improvement
    return 'error'; // Poor
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
    const scores = labels.map(category => {
      const s = categoryData[category].score;
      // Normalize to 0-100 scale for the Proficiency chart
      return s > 5 ? s : s * 20;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Proficiency (%)',
          data: scores,
          backgroundColor: colors.primary,
          borderRadius: 8,
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
        max: 5,
        ticks: {
          color: colors.textPrimary,
          stepSize: 1,
          precision: 1,
          callback: function (value) {
            return value;
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

  const handleNewAssessment = useCallback(() => {
    if (user.title === "Field Technical Support - QoS") {
      setOpenAssessmentDialog(true);
    }
  }, [user.title]);

  const handleSelectAssessment = useCallback((assessment) => {
    setSelectedAssessment(assessment);
    setOpenDetailDialog(true);
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
    if (!assessmentToDelete) return;

    // Check if the entered team name matches
    if (teamNameConfirmation !== selectedTeam?.teamName) {
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

      // Make API call to delete permanently
      await api.delete(
        `/on-the-job-assessments/${assessmentToDelete._id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );

      // Reset dialog state
      setDeleteDialogOpen(false);
      setTeamNameConfirmation("");
      setAssessmentToDelete(null);

      // Refresh all data to update global stats
      await fetchData();
      toast.success("Assessment deleted successfully");
    } catch (error) {
      console.error("Error deleting assessment:", error);
      setError("Failed to delete assessment");
      toast.error("Failed to delete assessment");

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
    setOpenEditDialog(true);
  };

  const handleUpdateAssessment = useCallback(async (updatedAssessment) => {
    try {
      setLoading(true);

      // Calculate overall score before sending
      const overallScore = calculateOverallScore(updatedAssessment.checkPoints);

      const payload = {
        ...updatedAssessment,
        overallScore
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
      setOpenEditDialog(false);
      setError(null);

      // Refresh all data to update global stats
      await fetchData();
      toast.success("Assessment updated successfully!");
    } catch (error) {
      console.error("Error updating assessment:", error);
      setError("Failed to update assessment");
      toast.error("Failed to update assessment");
    } finally {
      setLoading(false);
    }
  }, [selectedAssessment?._id, selectedTeam?._id, calculateOverallScore, fetchData]);

  const MemoizedAssessmentForm = React.memo(AssessmentForm);

  return (
    <Box sx={{
      backgroundColor: colors.background,
      minHeight: '100vh',
      color: colors.textPrimary,
      // p: { xs: 2, md: 4 },
      transition: 'background-color 0.3s ease'
    }}>
      <Box sx={{ maxWidth: '1400px', mx: 'auto' }}>
        {/* Modern Header Section */}
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          mb: 5,
          gap: 2
        }}>
          <Box>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/')}
              sx={{
                mb: 1,
                color: colors.textSecondary,
                textTransform: 'none',
                '&:hover': {
                  color: colors.primary,
                  backgroundColor: colors.primaryHover
                }
              }}
            >
              Back to Dashboard
            </Button>
            <Typography variant="h3" sx={{
              fontWeight: 800,
              letterSpacing: '-0.025em',
              ...headerGradient,
              mb: 1
            }}>
              Field Performance
            </Typography>
            <Typography variant="body1" sx={{ color: colors.textSecondary, fontWeight: 500 }}>
              On-The-Job Assessments & Team Analytics
            </Typography>
          </Box>

          {/* Global Actions */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              onClick={handleExportTeamSummary}
              variant="outlined"
              startIcon={<Download />}
              sx={{
                borderColor: colors.border,
                color: colors.textPrimary,
                borderRadius: '12px',
                textTransform: 'none',
                px: 3,
                py: 1,
                ...glassStyle,
                '&:hover': {
                  borderColor: colors.primary,
                  backgroundColor: colors.primaryHover
                }
              }}
            >
              Export Global Summary
            </Button>
          </Box>
        </Box>

        {/* Improved Team Selector with Glass Effect */}
        <Box sx={{
          ...glassStyle,
          p: 3,
          mb: 5,
          background: 'linear-gradient(110deg, rgba(30, 30, 45, 0.4) 0%, rgba(20, 20, 30, 0.4) 100%)'
        }}>
          <Typography variant="subtitle1" sx={{ color: colors.primary, fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Circle sx={{ fontSize: 10 }} /> Select Operational Team
          </Typography>
          <TeamSelector
            fieldTeams={fieldTeams}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
            loading={loading}
            colors={colors}
          />
        </Box>

        {selectedTeam && !selectedAssessment && (
          <AssessmentList
            assessments={assessments}
            colors={colors}
            getPerformanceColor={getPerformanceColor}
            getScoreLabel={getScoreLabel}
            onSelectAssessment={handleSelectAssessment}
            onEditAssessment={handleEditAssessment}
            onDeleteAssessment={handleDeleteAssessment}
            onNewAssessment={user.title === "Field Technical Support - QoS" ? handleNewAssessment : undefined}
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
        )}

        {/* Detail Dialog */}
        {selectedAssessment && selectedTeam && !editMode && openDetailDialog && (
          <Dialog
            open={openDetailDialog}
            onClose={() => {
              setOpenDetailDialog(false);
              setSelectedAssessment(null);
            }}
            fullScreen
            PaperProps={{
              sx: {
                backgroundColor: colors.surface,
                color: colors.textPrimary
              }
            }}
          >
            <DialogTitle sx={{ color: colors.primary, fontWeight: 'bold' }}>
              Assessment Details for {selectedTeam.teamName}
            </DialogTitle>
            <DialogContent>
              <AssessmentDetail
                assessment={selectedAssessment}
                team={selectedTeam}
                colors={colors}
                getPerformanceColor={getPerformanceColor}
                getCategoryChartData={getCategoryChartData}
                horizontalChartOptions={horizontalChartOptions}
                analyzeCategoryPerformance={analyzeCategoryPerformance}
                getLabelForCheckpoint={getLabelForCheckpoint}
                getScoreLabel={getScoreLabel}
                isMobile={isMobile}
                onBack={() => {
                  setOpenDetailDialog(false);
                  setSelectedAssessment(null);
                }}
                onEdit={() => {
                  setEditMode(true);
                  setOpenDetailDialog(false);
                  setOpenEditDialog(true);
                }}
                onExportExcel={() => handleExportIndividualAssessment(selectedAssessment, selectedTeam.teamName)}
              />
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => handleExportIndividualAssessment(selectedAssessment, selectedTeam.teamName)}
                startIcon={<Download />}
                sx={{ color: colors.primary }}
              >
                Export Assessment
              </Button>
              <Button
                onClick={() => {
                  setOpenDetailDialog(false);
                  setSelectedAssessment(null);
                }}
                sx={{ color: colors.textSecondary }}
              >
                Close
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* New Assessment Dialog */}
        {user.title === "Field Technical Support - QoS" && selectedTeam && (
          <Dialog
            open={openAssessmentDialog}
            onClose={() => setOpenAssessmentDialog(false)}
            fullScreen
            PaperProps={{
              sx: {
                backgroundColor: colors.surface,
                color: colors.textPrimary,
              }
            }}
          >
            <DialogTitle sx={{ color: colors.primary, fontWeight: 'bold' }}>
              New Assessment for {selectedTeam.teamName}
            </DialogTitle>
            <DialogContent sx={{ p: 1 }}>
              <Box sx={{ mb: 2, p: 2, bgcolor: colors.surfaceElevated, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                <Typography variant="h6" sx={{ color: colors.primary }}>Assessment In Progress</Typography>
              </Box>
              <MemoizedAssessmentForm
                key={selectedTeam?._id || 'new-assessment'}
                initialAssessment={initialAssessmentData}
                loading={loading}
                colors={colors}
                onSubmit={handleSubmitAssessment}
                calculateOverallScore={calculateOverallScore}
                getPerformanceColor={getPerformanceColor}
                editMode={false}
                getScoreLabel={getScoreLabel}
              />
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setOpenAssessmentDialog(false)}
                sx={{ color: colors.textSecondary }}
              >
                Cancel
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Edit Assessment Dialog */}
        {editMode && selectedAssessment && selectedTeam && (
          <Dialog
            open={openEditDialog}
            onClose={() => {
              setEditMode(false);
              setSelectedAssessment(null);
              setOpenEditDialog(false);
            }}
            fullScreen
            PaperProps={{
              sx: {
                backgroundColor: colors.surface,
                color: colors.textPrimary
              }
            }}
          >
            <DialogTitle sx={{ color: colors.primary, fontWeight: 'bold' }}>
              Edit Assessment for {selectedTeam.teamName}
            </DialogTitle>
            <DialogContent>
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
                  setOpenEditDialog(false);
                }}
                getScoreLabel={getScoreLabel}
              />
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setEditMode(false);
                  setSelectedAssessment(null);
                  setOpenEditDialog(false);
                }}
                sx={{ color: colors.textSecondary }}
              >
                Cancel
              </Button>
            </DialogActions>
          </Dialog>
        )}

        <StatsOverview
          key={JSON.stringify(stats) + JSON.stringify(supervisorStats)}
          stats={stats}
          supervisorStats={supervisorStats}
          colors={colors}
          isMobile={isMobile}
          getScoreLabel={getScoreLabel}
        />

        {/* Export Team Summary Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            onClick={handleExportTeamSummary}
            variant="contained"
            startIcon={<Download />}
            sx={{
              backgroundColor: colors.primary,
              '&:hover': {
                backgroundColor: '#1d4ed8',
              }
            }}
          >
            Export Team Summary
          </Button>
        </Box>

        {fieldTeams.length > 0 && (
          <TeamList
            fieldTeams={fieldTeams}
            colors={colors}
            isTeamAssessed={isTeamAssessed}
            teamAssessmentsMap={teamAssessmentsMap}
            getTeamAverageScore={getTeamAverageScore}
            getPerformanceColor={getPerformanceColor}
            getScoreLabel={getScoreLabel}
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
              To confirm, please enter the team name: <strong>{selectedTeam?.teamName}</strong>
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
    </Box>
  );
};

export default OnTheJobAssessment;