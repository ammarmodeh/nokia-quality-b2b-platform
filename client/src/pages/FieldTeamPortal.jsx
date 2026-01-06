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
  YAxis,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Assessment,
  Timeline,
  PieChart as PieChartIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PictureAsPdf as PictureAsPdfIcon,
  TableChart as TableChartIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
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
  const [generatingReport, setGeneratingReport] = useState(false);
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

    if (type === 'practical') {
      // 1-5 Scale
      if (score >= 4.5) return { label: "Excellent", color: "#2e7d32" };
      if (score >= 3.5) return { label: "Good", color: "#66bb6a" };
      if (score >= 2.5) return { label: "Satisfactory", color: "#ffa726" };
      if (score >= 1.5) return { label: "Needs Improvement", color: "#ff9800" };
      return { label: "Poor", color: "#d32f2f" };
    }

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

  const identifyStrengthsAndWeaknesses = () => {
    const categories = {};

    // Aggregate from quizzes
    quizResults.forEach(res => {
      res.userAnswers?.forEach(ans => {
        if (!ans.category) return;
        if (!categories[ans.category]) categories[ans.category] = { total: 0, count: 0, type: 'theoretical' };
        categories[ans.category].total += (ans.score || 0);
        categories[ans.category].count += 2; // Each MCQ is 2 points
      });
    });

    // Aggregate from practicals
    jobAssessments.forEach(res => {
      res.checkpoints?.forEach(cp => {
        if (!cp.category) return;
        if (!categories[cp.category]) categories[cp.category] = { total: 0, count: 0, type: 'practical' };
        categories[cp.category].total += (cp.score || 0);
        categories[cp.category].count += 5; // practical scale 0-5
      });
    });

    const analysis = Object.keys(categories).map(cat => ({
      name: cat,
      score: (categories[cat].total / categories[cat].count) * 100,
      type: categories[cat].type
    })).sort((a, b) => b.score - a.score);

    return {
      strengths: analysis.slice(0, 3).filter(a => a.score >= 75),
      weaknesses: analysis.slice(-3).reverse().filter(a => a.score < 60)
    };
  };

  const handleGenerateFullReport = async () => {
    try {
      setGeneratingReport(true);
      const { strengths, weaknesses } = identifyStrengthsAndWeaknesses();
      const theoreticalAvg = quizResults.length > 0 ? calculateAverageScore(quizResults) : null;
      const practicalAvg = jobAssessments.length > 0 ? calculateAverageScore(jobAssessments) : null;
      const labAvg = labAssessments.length > 0 ? calculateAverageScore(labAssessments) : null;

      const assessedCount = [theoreticalAvg, practicalAvg, labAvg].filter(v => v !== null).length;
      if (assessedCount === 0) {
        alert('No assessments available for this team.');
        setGeneratingReport(false);
        return;
      }

      const markdown = `
# HOLISTIC PERFORMANCE EVALUATION - FINAL REPORT
**Team Name:** ${selectedTeam.teamName}
**Company:** ${selectedTeam.teamCompany}
**Date:** ${new Date().toLocaleDateString()}

---

## 1. PERFORMANCE SUMMARY
This report provides a comprehensive analysis of the team's proficiency across Theoretical knowledge, Practical field application, and Lab environments.

| Assessment Type | Average Score | Status |
| :--- | :--- | :--- |
| **Theoretical (Quiz)** | ${theoreticalAvg !== null ? `${Math.round(theoreticalAvg)}%` : 'Not Assessed'} | ${theoreticalAvg !== null ? getAssessmentStatus(theoreticalAvg, 'quiz').label : 'N/A'} |
| **Practical (Field)** | ${practicalAvg !== null ? `${Number(practicalAvg).toFixed(1)}/5` : 'Not Assessed'} | ${practicalAvg !== null ? getAssessmentStatus(practicalAvg, 'practical').label : 'N/A'} |
| **Lab Assessment** | ${labAvg !== null ? `${Math.round(labAvg)}%` : 'Not Assessed'} | ${labAvg !== null ? getAssessmentStatus(labAvg, 'lab').label : 'N/A'} |

---

## 2. ADVANCED ANALYTICS
**Mastery Level:** ${Math.round(([theoreticalAvg, practicalAvg ? practicalAvg * 20 : null, labAvg].filter(v => v !== null).reduce((a, b) => a + b, 0)) / assessedCount)}%

### Key Strengths
${strengths.map(s => `- **${s.name}**: Demonstrating mastery with ${Math.round(s.score)}% proficiency.`).join('\n') || 'N/A'}

### Areas for Improvement
${weaknesses.map(w => `- **${w.name}**: Scoring ${Math.round(w.score)}%. Focused training recommended.`).join('\n') || 'N/A'}

---

## 3. TREND ANALYSIS
- **Theoretical Trend:** ${quizResults.length > 1 ? (quizResults[0].percentage > quizResults[1].percentage ? 'Improving' : 'Declining') : theoreticalAvg !== null ? 'Stable' : 'Not Assessed'}
- **Practical Consistency:** ${jobAssessments.length > 0 ? (calculateStandardDeviation(jobAssessments) < 10 ? 'High (Low Variance)' : 'Variable (High Variance)') : 'Not Assessed'}

---

## 4. FINAL RECOMMENDATIONS
${([theoreticalAvg, practicalAvg ? practicalAvg * 20 : null, labAvg].filter(v => v !== null).reduce((a, b) => a + b, 0)) / assessedCount > 85
          ? "The team shows excellent alignment with quality standards. Recommend for high-complexity projects."
          : "Focused technical workshops and practical drills are recommended to bridge identified gaps."}

---
*Report generated automatically by Nokia Quality Management System*
      `;

      const response = await api.post("/ai/report/download", {
        reportContent: markdown,
        format: 'pdf',
        title: `Full Evaluation - ${selectedTeam.teamName}`
      }, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Final_Evaluation_${selectedTeam.teamName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Report generation failed:", err);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Export functions for individual test types
  const exportTheoreticalToExcel = () => {
    const data = quizResults.map(r => ({
      'Date': formatDate(r.submittedAt),
      'Quiz Code': r.quizCode,
      'Score': r.score,
      'Correct Answers': `${r.correctAnswers}/${r.totalQuestions}`,
      'Percentage': `${r.percentage}%`
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Theoretical");
    XLSX.writeFile(wb, `${selectedTeam.teamName}_Theoretical_Assessments.xlsx`);
  };

  const exportPracticalToExcel = () => {
    const data = jobAssessments.map(a => ({
      'Date': formatDate(a.assessmentDate),
      'Conducted By': a.conductedBy,
      'Score': `${Number(a.overallScore).toFixed(1)}/5`,
      'Status': getAssessmentStatus(a.overallScore, 'practical').label
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Practical");
    XLSX.writeFile(wb, `${selectedTeam.teamName}_Practical_Assessments.xlsx`);
  };

  const exportLabToExcel = () => {
    const data = labAssessments.map(a => ({
      'Date': formatDate(a.createdAt),
      'Type': a.assessmentType || 'Technical',
      'ONT Type': a.ontType?.name || 'N/A',
      'Score': `${a.totalScore}%`,
      'Comments': a.comments || '-'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lab");
    XLSX.writeFile(wb, `${selectedTeam.teamName}_Lab_Assessments.xlsx`);
  };

  const exportTestToPDF = async (testType, data) => {
    try {
      let markdown = '';
      if (testType === 'theoretical') {
        markdown = `
# THEORETICAL ASSESSMENT REPORT
**Team:** ${selectedTeam.teamName}
**Company:** ${selectedTeam.teamCompany}
**Date:** ${new Date().toLocaleDateString()}

## Summary
- **Total Assessments:** ${data.length}
- **Average Score:** ${Math.round(calculateAverageScore(data))}%
- **Highest Score:** ${calculateHighestScore(data)}%
- **Lowest Score:** ${calculateLowestScore(data)}%

## Assessment History
${data.map((r, i) => `
### ${i + 1}. ${formatDate(r.submittedAt)}
- **Quiz Code:** ${r.quizCode}
- **Score:** ${r.score}
- **Percentage:** ${r.percentage}%
`).join('\n')}
        `;
      } else if (testType === 'practical') {
        markdown = `
# PRACTICAL ASSESSMENT REPORT
**Team:** ${selectedTeam.teamName}
**Company:** ${selectedTeam.teamCompany}
**Date:** ${new Date().toLocaleDateString()}

## Summary
- **Total Assessments:** ${data.length}
- **Average Score:** ${Number(calculateAverageScore(data)).toFixed(1)}/5
- **Highest Score:** ${Number(calculateHighestScore(data)).toFixed(1)}/5
- **Lowest Score:** ${Number(calculateLowestScore(data)).toFixed(1)}/5

## Assessment History
${data.map((a, i) => `
### ${i + 1}. ${formatDate(a.assessmentDate)}
- **Conducted By:** ${a.conductedBy}
- **Score:** ${Number(a.overallScore).toFixed(1)}/5
- **Status:** ${getAssessmentStatus(a.overallScore, 'practical').label}
`).join('\n')}
        `;
      } else if (testType === 'lab') {
        markdown = `
# LAB ASSESSMENT REPORT
**Team:** ${selectedTeam.teamName}
**Company:** ${selectedTeam.teamCompany}
**Date:** ${new Date().toLocaleDateString()}

## Summary
- **Total Assessments:** ${data.length}
- **Average Score:** ${Math.round(calculateAverageScore(data))}%
- **Highest Score:** ${calculateHighestScore(data)}%
- **Lowest Score:** ${calculateLowestScore(data)}%

## Assessment History
${data.map((a, i) => `
### ${i + 1}. ${formatDate(a.createdAt)}
- **Type:** ${a.assessmentType || 'Technical'}
- **ONT Type:** ${a.ontType?.name || 'N/A'}
- **Score:** ${a.totalScore}%
- **Comments:** ${a.comments || 'N/A'}
`).join('\n')}
        `;
      }

      const response = await api.post("/ai/report/download", {
        reportContent: markdown,
        format: 'pdf',
        title: `${testType.toUpperCase()} ASSESSMENT - ${selectedTeam.teamName}`
      }, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        }
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedTeam.teamName}_${testType.charAt(0).toUpperCase() + testType.slice(1)}_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`${testType} PDF export failed:`, err);
    }
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
      <Box sx={{
        mb: 4,
        p: 3,
        background: `linear-gradient(135deg, ${colors.primary}22 0%, ${colors.surfaceElevated} 100%)`,
        borderRadius: '16px',
        border: `1px solid ${colors.border}`
      }}>
        <Typography variant="h4" sx={{
          color: colors.primary,
          fontWeight: 'bold',
          mb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Assessment /> Field Team Assessment Portal
        </Typography>
        <Typography variant="body2" sx={{ color: colors.textSecondary }}>
          Comprehensive performance analytics and evaluation reporting
        </Typography>
      </Box>

      {/* Team Selection */}
      <Paper sx={{
        p: 3,
        mb: 3,
        ...darkThemeStyles.paper,
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
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
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              mb: 3,
              ...darkThemeStyles.tabs,
            }}
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
            <Tab
              label="Advanced Analytics"
              icon={<Timeline fontSize="small" />}
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
                  { title: 'Practical Avg', score: calculateAverageScore(jobAssessments), icon: <Assignment />, color: colors.success, data: jobAssessments, type: 'practical', suffix: '/5' },
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
                      borderRadius: '16px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
                      },
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
                      {card.data.length > 0 ? (
                        <>
                          <Typography variant="h3" sx={{ fontWeight: 'bold', color: getAssessmentStatus(card.score, card.type).color, my: 1 }}>
                            {card.type === 'practical' ? Number(card.score).toFixed(1) : Math.round(card.score)}{card.suffix || '%'}
                          </Typography>
                          <Chip
                            label={getAssessmentStatus(card.score, card.type).label}
                            size="small"
                            sx={{ bgcolor: `${getAssessmentStatus(card.score, card.type).color}22`, color: getAssessmentStatus(card.score, card.type).color, border: `1px solid ${getAssessmentStatus(card.score, card.type).color}` }}
                          />
                        </>
                      ) : (
                        <>
                          <Typography variant="h5" sx={{ fontWeight: 'bold', color: colors.textSecondary, my: 1 }}>
                            Not Assessed
                          </Typography>
                          <Chip
                            label="No Data"
                            size="small"
                            sx={{ bgcolor: `${colors.textSecondary}22`, color: colors.textSecondary, border: `1px solid ${colors.textSecondary}` }}
                          />
                        </>
                      )}
                      {card.data.length > 1 && (() => {
                        const current = card.data[0]?.percentage || card.data[0]?.overallScore || card.data[0]?.totalScore || 0;
                        const prev = card.data[1]?.percentage || card.data[1]?.overallScore || card.data[1]?.totalScore || 0;
                        const diff = current - prev;
                        return (
                          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {diff > 0 ? (
                              <Typography variant="caption" sx={{ color: colors.success, display: 'flex', alignItems: 'center' }}>
                                <TrendingUp fontSize="inherit" /> +{card.type === 'practical' ? diff.toFixed(1) : diff}{card.type === 'practical' ? ' pts' : '%'} Improvement
                              </Typography>
                            ) : diff < 0 ? (
                              <Typography variant="caption" sx={{ color: colors.error, display: 'flex', alignItems: 'center' }}>
                                <TrendingDown fontSize="inherit" /> {card.type === 'practical' ? diff.toFixed(1) : diff}{card.type === 'practical' ? ' pts' : '%'} {card.type === 'practical' ? 'Decrease' : 'Degradation'}
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
                          practical: jobAssessments[i]?.overallScore ? (jobAssessments[i].overallScore <= 5 ? jobAssessments[i].overallScore * 20 : jobAssessments[i].overallScore) : null,
                          lab: labAssessments[i]?.totalScore || null,
                        })).reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} vertical={false} />
                          <XAxis dataKey="index" hide />
                          <YAxis domain={[0, 100]} stroke={colors.textSecondary} fontSize={10} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#252525', border: `1px solid ${colors.border}`, borderRadius: '12px' }}
                            formatter={(value, name) => {
                              if (name === "Practical") return [`${(value / 20).toFixed(1)}/5`, name];
                              return [`${Math.round(value)}%`, name];
                            }}
                          />
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
                <Box>
                  <Typography variant="h5" sx={{ color: colors.primary }}>Theoretical Assessments</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<TableChartIcon />}
                      onClick={exportTheoreticalToExcel}
                      disabled={quizResults.length === 0}
                      sx={{ color: colors.success, borderColor: colors.success, '&:hover': { borderColor: colors.success, bgcolor: `${colors.success}11` } }}
                    >
                      Pro Excel
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<PictureAsPdfIcon />}
                      onClick={() => exportTestToPDF('theoretical', quizResults)}
                      disabled={quizResults.length === 0}
                      sx={{ color: colors.error, borderColor: colors.error, '&:hover': { borderColor: colors.error, bgcolor: `${colors.error}11` } }}
                    >
                      Pro PDF Report
                    </Button>
                  </Box>
                </Box>
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
                <Box>
                  <Typography variant="h5" sx={{ color: colors.primary }}>Practical Assessments</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<TableChartIcon />}
                      onClick={exportPracticalToExcel}
                      disabled={jobAssessments.length === 0}
                      sx={{ color: colors.success, borderColor: colors.success, '&:hover': { borderColor: colors.success, bgcolor: `${colors.success}11` } }}
                    >
                      Pro Excel
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<PictureAsPdfIcon />}
                      onClick={() => exportTestToPDF('practical', jobAssessments)}
                      disabled={jobAssessments.length === 0}
                      sx={{ color: colors.error, borderColor: colors.error, '&:hover': { borderColor: colors.error, bgcolor: `${colors.error}11` } }}
                    >
                      Pro PDF Report
                    </Button>
                  </Box>
                </Box>
                <Chip
                  label={`Avg: ${Number(calculateAverageScore(jobAssessments)).toFixed(1)}/5`}
                  variant="outlined"
                  sx={{ borderColor: getPerformanceColor(calculateAverageScore(jobAssessments), 'practical'), color: getPerformanceColor(calculateAverageScore(jobAssessments), 'practical') }}
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
                                  label={`${Number(assessment.overallScore).toFixed(1)}/5`}
                                  sx={{
                                    bgcolor: `${getAssessmentStatus(assessment.overallScore, 'practical').color}22`,
                                    color: getAssessmentStatus(assessment.overallScore, 'practical').color,
                                    borderColor: getAssessmentStatus(assessment.overallScore, 'practical').color,
                                    border: '1px solid',
                                    fontWeight: 'bold'
                                  }}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell sx={darkThemeStyles.tableCell}>
                                <Chip
                                  label={getAssessmentStatus(assessment.overallScore, 'practical').label}
                                  size="small"
                                  sx={{
                                    borderColor: getAssessmentStatus(assessment.overallScore, 'practical').color,
                                    color: getAssessmentStatus(assessment.overallScore, 'practical').color,
                                    border: '1px solid'
                                  }}
                                  variant="outlined"
                                />
                              </TableCell>
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
                <Box>
                  <Typography variant="h5" sx={{ color: colors.primary }}>Lab Assessments</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<TableChartIcon />}
                      onClick={exportLabToExcel}
                      disabled={labAssessments.length === 0}
                      sx={{ color: colors.success, borderColor: colors.success, '&:hover': { borderColor: colors.success, bgcolor: `${colors.success}11` } }}
                    >
                      Pro Excel
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<PictureAsPdfIcon />}
                      onClick={() => exportTestToPDF('lab', labAssessments)}
                      disabled={labAssessments.length === 0}
                      sx={{ color: colors.error, borderColor: colors.error, '&:hover': { borderColor: colors.error, bgcolor: `${colors.error}11` } }}
                    >
                      Pro PDF Report
                    </Button>
                  </Box>
                </Box>
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

          {/* ADVANCED ANALYTICS TAB */}
          {activeTab === 4 && (
            <Box sx={{ animation: 'fadeIn 0.5s ease-in' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ color: colors.primary }}>Advanced Analytics & Reporting</Typography>
                <Button
                  variant="contained"
                  startIcon={generatingReport ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <PictureAsPdfIcon />}
                  onClick={handleGenerateFullReport}
                  disabled={generatingReport || (quizResults.length === 0 && jobAssessments.length === 0 && labAssessments.length === 0)}
                  sx={{
                    bgcolor: colors.primary,
                    '&:hover': { bgcolor: colors.primary, opacity: 0.9 },
                    '&:disabled': { bgcolor: colors.textSecondary }
                  }}
                >
                  {generatingReport ? 'Generating...' : 'Generate Full Evaluation'}
                </Button>
              </Box>

              <Grid container spacing={3}>
                {/* Radar Chart for Multi-Test Comparison */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, ...darkThemeStyles.paper }}>
                    <Typography variant="h6" sx={{ mb: 2, color: colors.primary }}>Performance Balance</Typography>
                    <ResponsiveContainer width="100%" height={350}>
                      <RadarChart data={[
                        {
                          subject: 'Theoretical',
                          score: calculateAverageScore(quizResults),
                          fullMark: 100
                        },
                        {
                          subject: 'Practical',
                          score: calculateAverageScore(jobAssessments) * 20, // Scale to 100
                          fullMark: 100
                        },
                        {
                          subject: 'Lab',
                          score: calculateAverageScore(labAssessments),
                          fullMark: 100
                        }
                      ]}>
                        <PolarGrid stroke={colors.border} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: colors.textPrimary, fontSize: 12 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: colors.textSecondary, fontSize: 10 }} />
                        <Radar name="Score" dataKey="score" stroke={colors.primary} fill={colors.primary} fillOpacity={0.3} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#252525', border: `1px solid ${colors.border}`, borderRadius: '12px' }}
                          formatter={(value) => `${Math.round(value)}%`}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>

                {/* Strengths & Weaknesses */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, ...darkThemeStyles.paper, height: '100%' }}>
                    <Typography variant="h6" sx={{ mb: 2, color: colors.primary }}>Strengths & Weaknesses</Typography>
                    {(() => {
                      const { strengths, weaknesses } = identifyStrengthsAndWeaknesses();
                      return (
                        <Box>
                          <Typography variant="subtitle2" sx={{ color: colors.success, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CheckCircleIcon fontSize="small" /> Top Strengths
                          </Typography>
                          {strengths.length > 0 ? (
                            <Box sx={{ mb: 3 }}>
                              {strengths.map((s, i) => (
                                <Chip
                                  key={i}
                                  label={`${s.name}: ${Math.round(s.score)}%`}
                                  size="small"
                                  sx={{ m: 0.5, bgcolor: `${colors.success}22`, color: colors.success, borderColor: colors.success }}
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color={colors.textSecondary} sx={{ mb: 3 }}>No data available</Typography>
                          )}

                          <Typography variant="subtitle2" sx={{ color: colors.error, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CancelIcon fontSize="small" /> Areas for Improvement
                          </Typography>
                          {weaknesses.length > 0 ? (
                            <Box>
                              {weaknesses.map((w, i) => (
                                <Chip
                                  key={i}
                                  label={`${w.name}: ${Math.round(w.score)}%`}
                                  size="small"
                                  sx={{ m: 0.5, bgcolor: `${colors.error}22`, color: colors.error, borderColor: colors.error }}
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color={colors.textSecondary}>No data available</Typography>
                          )}
                        </Box>
                      );
                    })()}
                  </Paper>
                </Grid>

                {/* Mastery & Consistency Metrics */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, ...darkThemeStyles.paper }}>
                    <Typography variant="h6" sx={{ mb: 2, color: colors.primary }}>Consistency & Mastery Analysis</Typography>
                    <Grid container spacing={2}>
                      {[
                        { label: 'Overall Mastery', value: `${Math.round((calculateAverageScore(quizResults) + (calculateAverageScore(jobAssessments) * 20) + calculateAverageScore(labAssessments)) / 3)}%`, color: colors.primary },
                        { label: 'Theoretical Volatility', value: `${Math.round(calculateStandardDeviation(quizResults))}%`, color: colors.warning },
                        { label: 'Practical Consistency', value: calculateStandardDeviation(jobAssessments) < 10 ? 'High' : 'Variable', color: colors.success },
                        { label: 'Lab Mastery Rate', value: `${Math.round(calculatePercentageAboveThreshold(labAssessments, 80))}%`, color: colors.primary }
                      ].map((metric, i) => (
                        <Grid item xs={6} md={3} key={i}>
                          <Card sx={{ bgcolor: colors.surfaceElevated, border: `1px solid ${colors.border}` }}>
                            <CardContent>
                              <Typography variant="caption" color={colors.textSecondary}>{metric.label}</Typography>
                              <Typography variant="h5" sx={{ color: metric.color, fontWeight: 'bold' }}>{metric.value}</Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
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