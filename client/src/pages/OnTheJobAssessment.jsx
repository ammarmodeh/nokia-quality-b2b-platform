import { tok } from "../theme/tokens";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  useMediaQuery,
} from "@mui/material";
import { Download } from '@mui/icons-material';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import api from "../api/api";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import AssessmentDetail from "../components/AssessmentDetail";
import AssessmentForm from "../components/AssessmentForm";
import StatsOverview from "../components/StatsOverview";
import TeamList from "../components/TeamList";
import TeamSelector from "../components/TeamSelector";
import AssessmentList from "../components/AssessmentList";
import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import FilterChip from "../components/ui/FilterChip";
import ErrorState from "../components/ui/ErrorState";
import AppDialog from "../components/ui/AppDialog";
import SafeDeleteDialog from "../components/ui/SafeDeleteDialog";
import { bulkDelete, DELETE_PATHS } from "../api/bulkDelete";

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Legend, ChartDataLabels);

// Every field of an on-the-job assessment, for the backup taken before a permanent delete.
const OJT_BACKUP_COLUMNS = [
  ["Team", (a) => a.fieldTeamName || a.fieldTeamId?.teamName],
  ["Assessment date", (a) => (a.assessmentDate ? new Date(a.assessmentDate) : "")],
  ["Conducted by", (a) => a.conductedBy || ""],
  ["Overall score (%)", (a) => a.overallScore ?? ""],
  ["Status", (a) => a.status || ""],
  ["Category scores", (a) => Object.entries(a.categoryScores || {}).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join("; ")],
  ["Checkpoints", (a) => (a.checkPoints || []).map((c) => `${c.name} (${c.category}): ${c.score}${c.isCompleted ? " ✓" : ""}${c.notes ? ` — ${c.notes}` : ""}`).join("; ")],
  ["Feedback", (a) => a.feedback || ""],
  ["Created", (a) => (a.createdAt ? new Date(a.createdAt) : "")],
  ["Record ID", (a) => a._id],
];

const OnTheJobAssessment = () => {
  const user = useSelector((state) => state?.auth?.user);
  const [searchParams] = useSearchParams();
  const urlEditId = searchParams.get("editId") || searchParams.get("id");
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
  const isMobile = useMediaQuery('(max-width:503px)');
  const [teamsPage, setTeamsPage] = useState(0);
  const [teamsRowsPerPage, setTeamsRowsPerPage] = useState(10);
  const [assessmentsPage, setAssessmentsPage] = useState(0);
  const [assessmentsRowsPerPage, setAssessmentsRowsPerPage] = useState(10);
  const [allAssessments, setAllAssessments] = useState([]);
  const [supervisorStats, setSupervisorStats] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState(null);
  const [otjFilterStatus, setOtjFilterStatus] = useState('all'); // 'all', 'with', 'without'

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

  // Handle URL editId deep-link
  useEffect(() => {
    if (urlEditId) {
      const loadForEdit = async () => {
        try {
          const res = await api.get(`/on-the-job-assessments/${urlEditId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
          });
          if (res.data) {
            setSelectedAssessment(res.data);
            if (res.data.fieldTeamId) {
              setSelectedTeam(typeof res.data.fieldTeamId === 'object' ? res.data.fieldTeamId : { _id: res.data.fieldTeamId, teamName: res.data.fieldTeamName });
            }
            setEditMode(true);
            setOpenEditDialog(true);
          }
        } catch (err) {
          console.error("Failed to load OTJ assessment for editing:", err);
        }
      };
      loadForEdit();
    }
  }, [urlEditId]);

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
    background: 'transparent',
    surface: tok('--surface'),
    surfaceElevated: tok('--surface-subtle'),
    border: tok('--border'),
    primary: tok('--accent'),
    primaryHover: tok('--surface-hover'),
    secondary: tok('--accent'),
    textPrimary: tok('--text'),
    textSecondary: tok('--text-secondary'),
    success: tok('--success'),
    warning: tok('--warning'),
    error: tok('--danger'),
    chartCorrect: tok('--success'),
    chartIncorrect: tok('--danger'),
    shadow: 'var(--shadow-xs)'
  }), []);



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

  // Helper to fix sheet range
  const fixSheetRange = (ws) => {
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    Object.keys(ws).forEach(k => {
      if (k.startsWith('!')) return;
      try {
        const decoded = XLSX.utils.decode_cell(k);
        if (decoded.r < minR) minR = decoded.r;
        if (decoded.r > maxR) maxR = decoded.r;
        if (decoded.c < minC) minC = decoded.c;
        if (decoded.c > maxC) maxC = decoded.c;
      } catch {
        /* not a cell address */
      }
    });
    if (minR !== Infinity) {
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: minR, c: minC }, e: { r: maxR, c: maxC } });
    }
  };

  // Helper to add styled tables with headers, borders, and zebra striping
  const addStyledExportTable = (ws, title, titleColorHex, headers, dataRows, startR, alignMap = {}) => {
    if (!ws['!merges']) ws['!merges'] = [];

    // Title Row
    const titleCell = XLSX.utils.encode_cell({ r: startR, c: 0 });
    ws[titleCell] = {
      v: title,
      t: 's',
      s: {
        font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: titleColorHex || '0F172A' } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
      }
    };
    ws['!merges'].push({ s: { r: startR, c: 0 }, e: { r: startR, c: headers.length - 1 } });

    // Headers Row
    const headerRowIdx = startR + 1;
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: XLSX.utils.encode_cell({ r: headerRowIdx, c: 0 }) });
    for (let c = 0; c < headers.length; c++) {
      const hCell = XLSX.utils.encode_cell({ r: headerRowIdx, c });
      if (ws[hCell]) {
        ws[hCell].s = {
          font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1E293B' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: {
            top: { style: 'thin', color: { rgb: 'CBD5E1' } },
            bottom: { style: 'medium', color: { rgb: '0F172A' } },
            left: { style: 'thin', color: { rgb: '94A3B8' } },
            right: { style: 'thin', color: { rgb: '94A3B8' } }
          }
        };
      }
    }

    // Data Rows
    const dataStartRowIdx = startR + 2;
    XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: XLSX.utils.encode_cell({ r: dataStartRowIdx, c: 0 }) });

    for (let r = 0; r < dataRows.length; r++) {
      const rowIdx = dataStartRowIdx + r;
      const isTotal = String(dataRows[r][0] || '').toUpperCase().includes('TOTAL');

      for (let c = 0; c < headers.length; c++) {
        const dCell = XLSX.utils.encode_cell({ r: rowIdx, c });
        if (!ws[dCell]) continue;

        let fontColor = '1E293B';
        let bgColor = isTotal ? 'EEF2FF' : (r % 2 === 1 ? 'F8FAFC' : 'FFFFFF');
        let isBold = isTotal || c === 0 || c === 1;
        const cellValueStr = String(ws[dCell].v || '');

        // Badge color coding for scores and status
        if (cellValueStr.includes('Excellent') || cellValueStr.includes('Mastered') || cellValueStr.includes('🟢') || cellValueStr.includes('Good')) {
          fontColor = '047857';
          bgColor = isTotal ? bgColor : 'ECFDF5';
        } else if (cellValueStr.includes('Satisfactory') || cellValueStr.includes('🟡') || cellValueStr.includes('Competent')) {
          fontColor = 'B45309';
          bgColor = isTotal ? bgColor : 'FFFBEB';
        } else if (cellValueStr.includes('Needs Improvement') || cellValueStr.includes('Poor') || cellValueStr.includes('🔴') || cellValueStr.includes('Untrained')) {
          fontColor = 'B91C1C';
          bgColor = isTotal ? bgColor : 'FEF2F2';
        }

        const align = alignMap[c] || (c === 0 ? 'center' : (c === 1 || c === 2 || c === headers.length - 1 ? 'left' : 'center'));

        ws[dCell].s = {
          font: { bold: isBold, sz: 9.5, color: { rgb: fontColor } },
          fill: { fgColor: { rgb: bgColor } },
          alignment: { horizontal: align, vertical: 'center', wrapText: true },
          border: {
            top: { style: isTotal ? 'medium' : 'thin', color: { rgb: isTotal ? '334155' : 'E2E8F0' } },
            bottom: { style: isTotal ? 'medium' : 'thin', color: { rgb: isTotal ? '334155' : 'E2E8F0' } },
            left: { style: 'thin', color: { rgb: 'E2E8F0' } },
            right: { style: 'thin', color: { rgb: 'CBD5E1' } }
          }
        };
      }
    }

    return dataStartRowIdx + dataRows.length;
  };

  // Helper to add black interceptor with white dashes
  const addInterceptor = (ws, rowIdx, maxCols = 10) => {
    if (!ws['!merges']) ws['!merges'] = [];
    const sepCell = XLSX.utils.encode_cell({ r: rowIdx, c: 0 });
    ws[sepCell] = {
      v: "------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------",
      t: 's',
      s: {
        font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "000000" } },
        alignment: { horizontal: "left", vertical: "center", indent: 1 }
      }
    };
    ws['!merges'].push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: maxCols - 1 } });
  };

  // 1. Global All Teams OTJ Summary Export
  const handleExportTeamSummary = useCallback(() => {
    const exportDate = new Date().toISOString().split('T')[0];
    const filename = `Nokia_OTJ_Field_Performance_Master_Benchmark_${exportDate}.xlsx`;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Master Overall Summary & Benchmark
    const ws_overall = XLSX.utils.aoa_to_sheet([[]]);
    ws_overall['A1'] = {
      v: `FIELD PERFORMANCE & ON-THE-JOB AUDIT MASTER BENCHMARK (ALL OPERATIONAL TEAMS)`,
      t: 's',
      s: {
        font: { bold: true, sz: 15, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '0F172A' } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
      }
    };
    if (!ws_overall['!merges']) ws_overall['!merges'] = [];
    ws_overall['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } });

    let sheetRow = 2;

    // Executive KPI Summary Table
    const totalTeams = fieldTeams.length;
    const assessedCount = assessedTeamIds.size;
    const unassessedCount = Math.max(0, totalTeams - assessedCount);
    const avgFieldScore = assessedCount > 0
      ? Math.round(Array.from(assessedTeamIds).reduce((sum, id) => sum + getTeamAverageScore(id), 0) / assessedCount)
      : 0;

    const summaryHeaders = ['Operational Dimension', 'Scope & Definition', 'Metric Value', 'Benchmark Status'];
    const summaryRows = [
      ['Total Registered Field Teams', 'Full contractor field workforce registered in portal', `${totalTeams} Teams`, '100% Roster Active'],
      ['Evaluated Operational Teams', 'Teams with completed On-The-Job field quality audits', `${assessedCount} Teams (${totalTeams > 0 ? Math.round((assessedCount / totalTeams) * 100) : 0}%)`, assessedCount >= totalTeams * 0.8 ? '🟢 High Coverage (≥ 80%)' : '🟠 In Progress'],
      ['Pending Audit Teams', 'Operational teams awaiting baseline field audit', `${unassessedCount} Teams (${totalTeams > 0 ? Math.round((unassessedCount / totalTeams) * 100) : 0}%)`, unassessedCount === 0 ? '🟢 Fully Audited' : '🟡 Audit Scheduling Needed'],
      ['Average Field Quality Score', 'Weighted average score across all field checkpoints', `${avgFieldScore}%`, avgFieldScore >= 80 ? '🟢 High Proficiency' : (avgFieldScore >= 60 ? '🟡 Satisfactory' : '🔴 Needs Improvement')]
    ];

    sheetRow = addStyledExportTable(
      ws_overall,
      '1. EXECUTIVE SUMMARY: FIELD AUDIT COVERAGE & PROFICIENCY BENCHMARK',
      '1E1B4B',
      summaryHeaders,
      summaryRows,
      sheetRow
    ) + 2;

    addInterceptor(ws_overall, sheetRow, 10);
    sheetRow += 2;

    // Master Team Performance Table
    const masterHeaders = [
      '# Rank', 'Team Code', 'Team Name', 'Company', 'Audits Conducted',
      'Average Score (%)', 'Proficiency Classification', '🏆 Top Core Strength',
      '🛠️ Primary Growth Area', 'Latest Audit Date & Time'
    ];

    const allAssessedTeams = Array.from(assessedTeamIds).map((teamId) => {
      const team = fieldTeams.find(t => t._id.toString() === teamId);
      const teamAssessments = teamAssessmentsMap[teamId] || [];
      const numAssessments = teamAssessments.length;
      const avgScore = getTeamAverageScore(teamId);

      // Latest assessment
      const latestAssessment = teamAssessments.reduce((latest, assessment) => {
        const d = assessment.assessmentDate || assessment.createdAt;
        if (!d) return latest;
        const cur = new Date(d);
        if (!latest || cur > new Date(latest.assessmentDate || latest.createdAt)) return assessment;
        return latest;
      }, null);

      const latestDateTime = latestAssessment
        ? new Date(latestAssessment.assessmentDate || latestAssessment.createdAt).toLocaleDateString()
        : 'N/A';

      // Checkpoint aggregates for strengths/weaknesses
      const checkpointTotals = {};
      teamAssessments.forEach(a => {
        const cps = Array.isArray(a.checkPoints) ? a.checkPoints : [];
        cps.forEach(cp => {
          if (!checkpointTotals[cp.name]) checkpointTotals[cp.name] = { sum: 0, count: 0 };
          checkpointTotals[cp.name].sum += (cp.score || 0);
          checkpointTotals[cp.name].count += 1;
        });
      });

      const sortedCPs = Object.entries(checkpointTotals).map(([name, val]) => ({
        name,
        avg: val.count > 0 ? (val.sum / val.count) : 0
      })).sort((a, b) => b.avg - a.avg);

      const topStrength = sortedCPs.length > 0 ? `🟢 ${sortedCPs[0].name} (${sortedCPs[0].avg.toFixed(1)}/5)` : 'N/A';
      const topWeakness = sortedCPs.length > 0 ? `🔴 ${sortedCPs[sortedCPs.length - 1].name} (${sortedCPs[sortedCPs.length - 1].avg.toFixed(1)}/5)` : 'N/A';

      let profBadge = 'Satisfactory (60-79%)';
      if (avgScore >= 80) profBadge = '🟢 Excellent (≥ 80%)';
      else if (avgScore >= 60) profBadge = '🟡 Satisfactory (60-79%)';
      else profBadge = '🔴 Needs Improvement (< 60%)';

      return {
        teamCode: team?.teamCode || 'FT-N/A',
        teamName: team?.teamName || 'Unknown Team',
        company: team?.teamCompany || 'Reach',
        numAssessments,
        avgScore: Math.round(avgScore),
        profBadge,
        topStrength,
        topWeakness,
        latestDateTime
      };
    }).sort((a, b) => b.avgScore - a.avgScore);

    const masterDataRows = allAssessedTeams.map((t, idx) => [
      idx + 1,
      t.teamCode,
      t.teamName,
      t.company,
      `${t.numAssessments} audit${t.numAssessments !== 1 ? 's' : ''}`,
      `${t.avgScore}%`,
      t.profBadge,
      t.topStrength,
      t.topWeakness,
      t.latestDateTime
    ]);

    sheetRow = addStyledExportTable(
      ws_overall,
      `2. OPERATIONAL TEAMS PERFORMANCE & ON-THE-JOB AUDIT RANKINGS (${masterDataRows.length} Teams Evaluated)`,
      '0F172A',
      masterHeaders,
      masterDataRows.length > 0 ? masterDataRows : [[1, '-', 'No Teams Evaluated Yet', '-', '-', '-', '-', '-', '-', '-']],
      sheetRow
    ) + 2;

    ws_overall['!cols'] = [
      { wch: 8 },  // #
      { wch: 15 }, // Team Code
      { wch: 28 }, // Team Name
      { wch: 20 }, // Company
      { wch: 18 }, // Audits
      { wch: 18 }, // Average Score
      { wch: 26 }, // Classification
      { wch: 45 }, // Top Strength
      { wch: 45 }, // Top Weakness
      { wch: 22 }  // Date
    ];

    fixSheetRange(ws_overall);
    XLSX.utils.book_append_sheet(wb, ws_overall, 'Overall Summary');

    // For each assessed team, create a dedicated stylized audit sheet
    Array.from(assessedTeamIds).forEach(teamId => {
      const team = fieldTeams.find(t => t._id.toString() === teamId);
      if (!team) return;

      const teamName = team.teamName;
      const teamAssessments = teamAssessmentsMap[teamId] || [];
      const avgScore = getTeamAverageScore(teamId);

      const ws_team = XLSX.utils.aoa_to_sheet([[]]);
      ws_team['A1'] = {
        v: `ON-THE-JOB PERFORMANCE AUDIT & COGNITIVE INSIGHTS: ${teamName}`,
        t: 's',
        s: {
          font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1E1B4B' } },
          alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
        }
      };
      if (!ws_team['!merges']) ws_team['!merges'] = [];
      ws_team['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });

      let tRow = 2;

      // Table 1: Team Audit Summary Info
      const tInfoHeaders = ['Dimension', 'Audit Metric Value', 'Performance Status'];
      const tInfoRows = [
        ['Team Name & Code', `${teamName} (${team.teamCode || 'FT-N/A'})`, 'Registered Field Team'],
        ['Subcontractor / Company', team.teamCompany || 'Reach', 'Field Operations'],
        ['Total On-Site Audits Conducted', `${teamAssessments.length} Completed Audits`, teamAssessments.length > 0 ? '🟢 Active Evaluation' : 'Pending'],
        ['Cumulative Proficiency Score', `${Math.round(avgScore)}%`, avgScore >= 80 ? '🟢 Excellent' : (avgScore >= 60 ? '🟡 Satisfactory' : '🔴 Needs Improvement')]
      ];

      tRow = addStyledExportTable(
        ws_team,
        `1. FIELD UNIT PROFILE & CUMULATIVE BENCHMARK: ${teamName}`,
        '0F172A',
        tInfoHeaders,
        tInfoRows,
        tRow
      ) + 2;

      addInterceptor(ws_team, tRow, 6);
      tRow += 2;

      // Category Mastery Table
      const catTotals = {};
      teamAssessments.forEach(a => {
        const cps = Array.isArray(a.checkPoints) ? a.checkPoints : [];
        cps.forEach(p => {
          const cat = p.category || 'General Operations';
          if (!catTotals[cat]) catTotals[cat] = { sum: 0, count: 0 };
          catTotals[cat].sum += (p.score || 0);
          catTotals[cat].count += 1;
        });
      });

      const catRows = Object.entries(catTotals).map(([cat, val]) => {
        const catAvg = val.count > 0 ? (val.sum / val.count) : 0;
        const catPct = Math.round((catAvg / 5) * 100);
        let statusBadge = 'Satisfactory';
        if (catPct >= 80) statusBadge = '🟢 Mastered (≥ 80%)';
        else if (catPct >= 60) statusBadge = '🟡 Competent (60-79%)';
        else statusBadge = '🔴 Needs Improvement (< 60%)';

        return [
          cat,
          `${val.count} Checks`,
          `${catAvg.toFixed(1)} / 5.00`,
          `${catPct}%`,
          statusBadge
        ];
      });

      tRow = addStyledExportTable(
        ws_team,
        '2. OPERATIONAL DOMAIN & CATEGORY MASTERY BREAKDOWN',
        '7C3AED',
        ['Operational Category', 'Evaluated Points', 'Average Score (/5)', 'Category Mastery (%)', 'Proficiency Status'],
        catRows,
        tRow
      ) + 2;

      addInterceptor(ws_team, tRow, 6);
      tRow += 2;

      // Detailed Checkpoints Table
      const cpHeaders = ['Category', 'Operational Checkpoint', 'Description', 'Score (/5)', 'Rating', 'Status'];
      const cpRows = [];
      teamAssessments.forEach(a => {
        const cps = Array.isArray(a.checkPoints) ? a.checkPoints : [];
        cps.forEach(cp => {
          const s = cp.score || 0;
          const label = getLabelForCheckpoint(cp.name, s);
          cpRows.push([
            cp.category || 'General',
            cp.name,
            cp.description || 'No description available',
            `${s}/5`,
            label,
            s >= 4 ? '🟢 Solid' : (s >= 3 ? '🟡 Meets Baseline' : '🔴 Deficit')
          ]);
        });
      });

      tRow = addStyledExportTable(
        ws_team,
        `3. DETAILED CHECKPOINT AUDIT LOGS & SPECIALIST RATINGS (${cpRows.length} Checkpoints Evaluated)`,
        '059669',
        cpHeaders,
        cpRows.length > 0 ? cpRows : [['-', 'No Checkpoints Found', '-', '-', '-', '-']],
        tRow
      ) + 2;

      ws_team['!cols'] = [
        { wch: 30 }, // Category
        { wch: 32 }, // Checkpoint
        { wch: 45 }, // Description
        { wch: 14 }, // Score
        { wch: 22 }, // Rating
        { wch: 20 }  // Status
      ];

      fixSheetRange(ws_team);
      const safeSheetName = createSafeSheetName(teamName);
      XLSX.utils.book_append_sheet(wb, ws_team, safeSheetName);
    });

    XLSX.writeFile(wb, filename);
  }, [assessedTeamIds, fieldTeams, teamAssessmentsMap, getTeamAverageScore, createSafeSheetName, getScoreLabel, getLabelForCheckpoint]);

  // 2. Individual Assessment Export
  const handleExportIndividualAssessment = useCallback((assessment, teamName) => {
    if (!assessment) return;

    const dateTime = assessment.assessmentDate
      ? new Date(assessment.assessmentDate).toLocaleString()
      : (assessment.createdAt ? new Date(assessment.createdAt).toLocaleString() : 'N/A');

    const dateStr = assessment.assessmentDate
      ? format(new Date(assessment.assessmentDate), 'dd-MM-yyyy')
      : 'N/A';

    const filename = `${teamName}_OTJ_Assessment_Report_${dateStr}.xlsx`;
    const wb = XLSX.utils.book_new();

    // ═════════════════════════════════════════════════════════════════════════
    // Sheet 1: Assessment Executive Summary & Cognitive Insights
    // ═════════════════════════════════════════════════════════════════════════
    const ws_summary = XLSX.utils.aoa_to_sheet([[]]);
    ws_summary['A1'] = {
      v: `NOKIA QUALITY - FIELD PERFORMANCE AUDIT REPORT: ${teamName}`,
      t: 's',
      s: {
        font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '0F172A' } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
      }
    };
    if (!ws_summary['!merges']) ws_summary['!merges'] = [];
    ws_summary['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });

    let sRow = 2;

    // Table 1: Audit Profile Cards
    const overallScoreNum = Math.round(Number(assessment.overallScore || 0));
    let profBadge = 'Satisfactory';
    if (overallScoreNum >= 85) profBadge = '🟢 Mastered / High Quality (≥ 85%)';
    else if (overallScoreNum >= 75) profBadge = '🟢 Competent / Good (75-84%)';
    else if (overallScoreNum >= 60) profBadge = '🟡 Satisfactory / Meets Standard (60-74%)';
    else profBadge = '🔴 Needs Improvement (< 60%)';

    const infoHeaders = ['Audit Parameter', 'Parameter Details', 'Compliance & Quality Verification'];
    const infoRows = [
      ['Operational Team Name', teamName, 'Field Unit'],
      ['Auditing Specialist', assessment.conductedBy || 'Quality Assurance Lead', 'Audit Oversight'],
      ['Audit Timestamp', dateTime, 'Official Record'],
      ['Overall Quality Proficiency Score', `${overallScoreNum}%`, profBadge],
      ['Audit Verification Status', assessment.status || 'Compliance Validated', 'Audit Complete']
    ];

    sRow = addStyledExportTable(
      ws_summary,
      `1. AUDIT PROFILE & QUALITY VERIFICATION: ${teamName}`,
      '1E1B4B',
      infoHeaders,
      infoRows,
      sRow
    ) + 2;

    addInterceptor(ws_summary, sRow, 5);
    sRow += 2;

    // Table 2: Category Proficiency Breakdown
    const checkPoints = Array.isArray(assessment.checkPoints) ? assessment.checkPoints : [];
    const catTotals = {};
    checkPoints.forEach(cp => {
      const cat = cp.category || 'General Operations';
      if (!catTotals[cat]) catTotals[cat] = { earned: 0, max: 0, count: 0 };
      catTotals[cat].earned += (cp.score || 0);
      catTotals[cat].max += 5;
      catTotals[cat].count += 1;
    });

    const catRows = Object.entries(catTotals).map(([cat, val]) => {
      const avg = val.count > 0 ? (val.earned / val.count) : 0;
      const pct = Math.round((val.earned / val.max) * 100);
      let catStatus = 'Satisfactory';
      if (pct >= 80) catStatus = '🟢 Mastered (≥ 80%)';
      else if (pct >= 60) catStatus = '🟡 Competent (60-79%)';
      else catStatus = '🔴 Deficit (< 60%)';

      return [
        cat,
        `${val.count} Checkpoints`,
        `${avg.toFixed(1)} / 5.00`,
        `${pct}%`,
        catStatus
      ];
    });

    sRow = addStyledExportTable(
      ws_summary,
      '2. OPERATIONAL DOMAIN & CATEGORY PROFICIENCY BREAKDOWN',
      '7C3AED',
      ['Skill Category', 'Evaluated Checkpoints', 'Average Score (/5)', 'Mastery Rate (%)', 'Proficiency Status'],
      catRows,
      sRow
    ) + 2;

    addInterceptor(ws_summary, sRow, 5);
    sRow += 2;

    // Table 3: Cognitive Insights (Strengths & Growth Opportunities)
    const sortedDesc = [...checkPoints].sort((a, b) => (b.score || 0) - (a.score || 0));
    const sortedAsc = [...checkPoints].sort((a, b) => (a.score || 0) - (b.score || 0));

    const strengthRows = sortedDesc
      .filter(cp => (cp.score || 0) >= 4)
      .map(cp => [
        '🏆 Core Strength',
        cp.name,
        cp.category || 'General',
        `${cp.score}/5`,
        getLabelForCheckpoint(cp.name, cp.score)
      ]);

    const weaknessRows = sortedAsc
      .filter(cp => (cp.score || 0) <= 2)
      .map(cp => [
        '🛠️ Growth Opportunity',
        cp.name,
        cp.category || 'General',
        `${cp.score}/5`,
        getLabelForCheckpoint(cp.name, cp.score)
      ]);

    const insightRows = [...strengthRows, ...weaknessRows];

    sRow = addStyledExportTable(
      ws_summary,
      '3. COGNITIVE INSIGHTS: CORE STRENGTHS & TARGETED GROWTH OPPORTUNITIES',
      '047857',
      ['Insight Classification', 'Operational Checkpoint', 'Category', 'Score (/5)', 'Specialist Rating'],
      insightRows.length > 0 ? insightRows : [['🏆 Core Strength', 'Standard Baseline Achieved', 'General', '3/5', 'Satisfactory']],
      sRow
    ) + 2;

    addInterceptor(ws_summary, sRow, 5);
    sRow += 2;

    // Table 4: Qualitative Observations & Corrective Action Plan
    const feedbackHeaders = ['Observation Area', 'Specialist Observation & Action Plan'];
    const feedbackRows = [
      ['Auditor Comments & Action Plan', assessment.feedback || 'Field assessment successfully completed with standard installation protocol compliance validated.']
    ];

    sRow = addStyledExportTable(
      ws_summary,
      '4. SPECIALIST QUALITATIVE OBSERVATIONS & CORRECTIVE ACTION PLAN',
      '0F172A',
      feedbackHeaders,
      feedbackRows,
      sRow
    ) + 2;

    ws_summary['!cols'] = [
      { wch: 32 }, // Col 0
      { wch: 38 }, // Col 1
      { wch: 28 }, // Col 2
      { wch: 18 }, // Col 3
      { wch: 30 }  // Col 4
    ];

    fixSheetRange(ws_summary);
    XLSX.utils.book_append_sheet(wb, ws_summary, 'Audit Summary');

    // ═════════════════════════════════════════════════════════════════════════
    // Sheet 2: Detailed Checkpoint Logs
    // ═════════════════════════════════════════════════════════════════════════
    const ws_details = XLSX.utils.aoa_to_sheet([[]]);
    ws_details['A1'] = {
      v: `DETAILED CHECKPOINT AUDIT LOGS & SCORING BREAKDOWN: ${teamName}`,
      t: 's',
      s: {
        font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '5B21B6' } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
      }
    };
    if (!ws_details['!merges']) ws_details['!merges'] = [];
    ws_details['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } });

    const detailHeaders = [
      '#', 'Skill Category', 'Operational Checkpoint', 'Checkpoint Description / Scope',
      'Proficiency Score (/5)', 'Specialist Rating', 'Auditor Observations & Notes'
    ];

    const detailDataRows = checkPoints.map((cp, idx) => {
      const s = cp.score || 0;
      const label = getLabelForCheckpoint(cp.name, s);

      return [
        idx + 1,
        cp.category || 'General Operations',
        cp.name,
        cp.description || 'Quality checkpoint validation',
        `${s} / 5.00`,
        label,
        cp.notes || 'Checkpoint validated on-site.'
      ];
    });

    addStyledExportTable(
      ws_details,
      `COMPLETE CHECKPOINT AUDIT REGISTRY (${detailDataRows.length} Points Evaluated)`,
      '0F172A',
      detailHeaders,
      detailDataRows,
      2
    );

    ws_details['!cols'] = [
      { wch: 6 },  // #
      { wch: 30 }, // Category
      { wch: 35 }, // Checkpoint
      { wch: 45 }, // Description
      { wch: 22 }, // Score
      { wch: 24 }, // Rating
      { wch: 45 }  // Notes
    ];

    fixSheetRange(ws_details);
    XLSX.utils.book_append_sheet(wb, ws_details, 'Detailed Checkpoints');

    XLSX.writeFile(wb, filename);
  }, [getLabelForCheckpoint]);

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

      await api.post(
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
          color: tok('--overlay-subtle')
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
          color: tok('--overlay-subtle')
        }
      },
    },
  }), [colors, isMobile]);

  const handleNewAssessment = useCallback(() => {
    if (!selectedTeam) {
      toast.warning("Please select an operational team first");
      return;
    }
    if (user?.title === "Field Technical Support - QoS" || user?.role === "Admin") {
      setOpenAssessmentDialog(true);
    } else {
      toast.error("You do not have permission to conduct assessments");
    }
  }, [user, selectedTeam]);

  const handleSelectAssessment = useCallback((assessment) => {
    setSelectedAssessment(assessment);
    setOpenDetailDialog(true);
  }, []);

  const handleDeleteAssessment = (assessmentId) => {
    if (user?.role !== "Admin") {
      toast.error("Only admins can delete assessments");
      return;
    }
    setAssessmentToDelete(assessments.find((a) => a._id === assessmentId) || null);
    setDeleteDialogOpen(true);
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

  const canAssess = user?.title === "Field Technical Support - QoS" || user?.role === "Admin";
  const assessedCount = fieldTeams.filter((team) => teamAssessmentsMap[team._id]?.length > 0).length;
  const closeDetail = () => { setOpenDetailDialog(false); setSelectedAssessment(null); };
  const closeEdit = () => { setEditMode(false); setSelectedAssessment(null); setOpenEditDialog(false); };

  return (
    <Box>
      <PageHeader
        title="On-the-Job Assessment"
        description="Field observations of technicians on live jobs, with scores and team analytics."
        actions={<Button variant="outlined" startIcon={<Download sx={{ fontSize: 16 }} />} onClick={handleExportTeamSummary}>Export summary</Button>}
      />

      {error && <ErrorState title="Something went wrong" message={error} onRetry={() => fetchData()} sx={{ mb: 2 }} />}

      <SectionCard title="Team" description="Pick a field team to see and record its on-the-job assessments." sx={{ mb: 2 }}>
        <TeamSelector
          fieldTeams={fieldTeams}
          selectedTeam={selectedTeam}
          setSelectedTeam={setSelectedTeam}
          loading={loading}
          colors={colors}
          onNewAssessment={handleNewAssessment}
          canAssess={canAssess}
        />
      </SectionCard>

      {selectedTeam && !selectedAssessment && (
        <Box sx={{ mb: 2 }}>
          <AssessmentList
            assessments={assessments}
            colors={colors}
            getPerformanceColor={getPerformanceColor}
            getScoreLabel={getScoreLabel}
            onSelectAssessment={handleSelectAssessment}
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
        </Box>
      )}

      {/* Detail */}
      <AppDialog
        open={Boolean(selectedAssessment && selectedTeam && !editMode && openDetailDialog)}
        onClose={closeDetail}
        size="xl"
        title={selectedTeam ? `Assessment · ${selectedTeam.teamName}` : "Assessment"}
        description={selectedAssessment?.assessmentDate ? format(new Date(selectedAssessment.assessmentDate), "d MMM yyyy") : undefined}
        extraActions={selectedAssessment && selectedTeam && (
          <Button variant="outlined" startIcon={<Download sx={{ fontSize: 16 }} />} onClick={() => handleExportIndividualAssessment(selectedAssessment, selectedTeam.teamName)}>Export</Button>
        )}
        actions={<Button variant="outlined" onClick={closeDetail}>Close</Button>}
      >
        {selectedAssessment && selectedTeam && (
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
            onBack={closeDetail}
            onEdit={() => {
              setEditMode(true);
              setOpenDetailDialog(false);
              setOpenEditDialog(true);
            }}
            onExportExcel={() => handleExportIndividualAssessment(selectedAssessment, selectedTeam.teamName)}
          />
        )}
      </AppDialog>

      {/* New */}
      {canAssess && selectedTeam && (
        <AppDialog
          open={openAssessmentDialog}
          onClose={() => setOpenAssessmentDialog(false)}
          size="xl"
          title={`New assessment · ${selectedTeam.teamName}`}
          description="Score each checkpoint; the overall score updates as you go."
          actions={<Button variant="outlined" onClick={() => setOpenAssessmentDialog(false)}>Cancel</Button>}
        >
          <MemoizedAssessmentForm
            key={selectedTeam?._id || "new-assessment"}
            initialAssessment={initialAssessmentData}
            loading={loading}
            colors={colors}
            onSubmit={handleSubmitAssessment}
            calculateOverallScore={calculateOverallScore}
            getPerformanceColor={getPerformanceColor}
            editMode={false}
            getScoreLabel={getScoreLabel}
            isMobile={isMobile}
          />
        </AppDialog>
      )}

      {/* Edit */}
      <AppDialog
        open={Boolean(editMode && selectedAssessment && selectedTeam && openEditDialog)}
        onClose={closeEdit}
        size="xl"
        title={selectedTeam ? `Edit assessment · ${selectedTeam.teamName}` : "Edit assessment"}
        actions={<Button variant="outlined" onClick={closeEdit}>Cancel</Button>}
      >
        {editMode && selectedAssessment && selectedTeam && (
          <AssessmentForm
            initialAssessment={selectedAssessment}
            loading={loading}
            colors={colors}
            onSubmit={handleUpdateAssessment}
            calculateOverallScore={calculateOverallScore}
            getPerformanceColor={getPerformanceColor}
            editMode={editMode}
            onCancel={closeEdit}
            getScoreLabel={getScoreLabel}
            isMobile={isMobile}
          />
        )}
      </AppDialog>

      <StatsOverview
        key={JSON.stringify(stats) + JSON.stringify(supervisorStats)}
        stats={stats}
        supervisorStats={supervisorStats}
        colors={colors}
        isMobile={isMobile}
        getScoreLabel={getScoreLabel}
      />

      {fieldTeams.length > 0 && (
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mt: 3, mb: 1.5 }}>
            <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600, mr: 1 }}>Teams</Typography>
            <FilterChip
              label="OTJ assessment"
              single
              value={otjFilterStatus === "all" ? [] : [otjFilterStatus]}
              onChange={(v) => setOtjFilterStatus(v[0] || "all")}
              options={[
                { value: "with", label: "Assessed", hint: assessedCount },
                { value: "without", label: "Not assessed yet", hint: fieldTeams.length - assessedCount },
              ]}
            />
            <Box sx={{ flex: 1 }} />
            <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>{assessedCount} of {fieldTeams.length} teams assessed</Typography>
          </Box>
          <TeamList
            fieldTeams={fieldTeams.filter((team) => {
              if (otjFilterStatus === "with") return teamAssessmentsMap[team._id]?.length > 0;
              if (otjFilterStatus === "without") return !teamAssessmentsMap[team._id]?.length;
              return true;
            })}
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
            isMobile={isMobile}
          />
        </>
      )}

      <SafeDeleteDialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setAssessmentToDelete(null); }}
        records={assessmentToDelete ? [assessmentToDelete] : []}
        noun={{ one: "on-the-job assessment", many: "on-the-job assessments" }}
        nameOf={(a) => `${a.fieldTeamName || selectedTeam?.teamName || "Team"} · ${a.assessmentDate ? format(new Date(a.assessmentDate), "d MMM yyyy") : ""} · ${a.overallScore ?? 0}%`}
        exportColumns={OJT_BACKUP_COLUMNS}
        exportFilename="on-the-job-assessment"
        onDelete={(list) => bulkDelete(DELETE_PATHS.ojt, list.map((a) => a._id))}
        onDeleted={({ deleted }) => {
          setAssessments((prev) => prev.filter((a) => !deleted.includes(a._id)));
          setAllAssessments((prev) => prev.filter((a) => !deleted.includes(a._id)));
          fetchData();
        }}
      />
    </Box>
  );
};

export default OnTheJobAssessment;
