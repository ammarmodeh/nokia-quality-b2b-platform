import { useEffect, useMemo, useState } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { startOfWeek } from "date-fns";
import { getCustomWeekNumber } from "../utils/helpers";
import { useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import ViolationDataGrid from "./ViolationDataGrid";
import SessionDialogs from "./ViolationSessionDialogs";
import api from "../api/api";
import * as XLSX from 'xlsx';
import SearchAndExport from "./ViolationSearchAndExport";

const TeamViolationTracker = ({ tasks, initialFieldTeams = [] }) => {
  const { enqueueSnackbar } = useSnackbar();
  const user = useSelector((state) => state?.auth?.user);
  const [fieldTeams, setFieldTeams] = useState(initialFieldTeams);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedTeamIdForSession, setSelectedTeamIdForSession] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  const [evaluationData, setEvaluationData] = useState([]);

  // Dialog states
  const [addSessionDialogOpen, setAddSessionDialogOpen] = useState(false);
  const [viewSessionsDialogOpen, setViewSessionsDialogOpen] = useState(false);
  const [reportAbsenceDialogOpen, setReportAbsenceDialogOpen] = useState(false);
  const [violationDialogOpen, setViolationDialogOpen] = useState(false);
  const [selectedTeamSessions, setSelectedTeamSessions] = useState([]);
  const [selectedTeamForSession, setSelectedTeamForSession] = useState(null);
  const [selectedTeamForAbsence, setSelectedTeamForAbsence] = useState(null);
  const [assessments, setAssessments] = useState([]);

  const [samplesTokenData, setSamplesTokenData] = useState({});

  // Fetch samples token data (replacing localStorage)
  useEffect(() => {
    const fetchSamplesData = async () => {
      try {
        const yearsToFetch = new Set();
        const currentYear = new Date().getFullYear();
        yearsToFetch.add(currentYear);

        tasks.forEach(task => {
          if (task.interviewDate) {
            yearsToFetch.add(new Date(task.interviewDate).getFullYear());
          }
        });

        const promises = Array.from(yearsToFetch).map(year =>
          api.get(`/samples-token/${year}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          }).then(res => ({ year, data: res.data || [] }))
            .catch(err => {
              console.error(`Error fetching samples for ${year}:`, err);
              return { year, data: [] };
            })
        );

        const results = await Promise.all(promises);
        const newData = {};
        results.forEach(({ year, data }) => {
          newData[year] = {};
          data.forEach(item => {
            newData[year][`W${item.weekNumber}`] = item;
          });
        });

        setSamplesTokenData(newData);
      } catch (error) {
        console.error("Error fetching samples token data:", error);
      }
    };

    fetchSamplesData();
  }, [tasks]);

  // Calculate total samples from fetched state based on task weeks
  const totalGlobalSamples = useMemo(() => {
    try {
      const uniqueWeeks = new Set();

      tasks.forEach(task => {
        if (task.interviewDate) {
          const date = new Date(task.interviewDate);
          const start = startOfWeek(date, { weekStartsOn: 0 });
          const year = start.getFullYear();
          const weekNum = getCustomWeekNumber(start, year);
          uniqueWeeks.add(`${year}-W${weekNum}`);
        }
      });

      let total = 0;
      uniqueWeeks.forEach(key => {
        const [year, weekKey] = key.split('-');
        if (samplesTokenData[year] && samplesTokenData[year][weekKey]) {
          total += parseFloat(samplesTokenData[year][weekKey].sampleSize) || 0;
        }
      });

      return total;
    } catch (error) {
      console.error("Error calculating total samples:", error);
      return 0;
    }
  }, [tasks, samplesTokenData]);

  // Calculate YEAR-TO-DATE total samples for threshold calculation
  const ytdTotalSamples = useMemo(() => {
    try {
      const currentYear = new Date().getFullYear();
      const currentWeek = getCustomWeekNumber(new Date(), currentYear);
      const yearData = samplesTokenData[currentYear] || {};

      let total = 0;
      Object.keys(yearData).forEach(weekKey => {
        const weekNum = parseInt(weekKey.replace('W', ''), 10);
        if (!isNaN(weekNum) && weekNum <= currentWeek) {
          total += parseFloat(yearData[weekKey].sampleSize) || 0;
        }
      });

      if (total === 0 && totalGlobalSamples > 0) {
        return totalGlobalSamples;
      }

      return total;
    } catch (error) {
      console.error("Error calculating YTD samples:", error);
      return totalGlobalSamples;
    }
  }, [totalGlobalSamples, samplesTokenData]);

  // Calculate FULL YEAR total samples (all entered weeks)
  const yearlyTotalSamples = useMemo(() => {
    try {
      const currentYear = new Date().getFullYear();
      const yearData = samplesTokenData[currentYear] || {};
      let total = 0;
      Object.keys(yearData).forEach(weekKey => {
        total += parseFloat(yearData[weekKey].sampleSize) || 0;
      });
      return total || ytdTotalSamples;
    } catch (error) {
      return ytdTotalSamples;
    }
  }, [samplesTokenData, ytdTotalSamples]);

  useEffect(() => {
    const fetchEvaluationData = async () => {
      try {
        const response = await api.get('/quiz-results/teams/evaluation', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (response.status === 200) {
          setEvaluationData(response.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching evaluation data:', error);
      }
    };

    fetchEvaluationData();
  }, []);

  const getTheoreticalSatisfactionScore = (teamName) => {
    const teamEvaluation = evaluationData.find(team =>
      team.teamName === teamName || team.teamId === teamName
    );

    if (teamEvaluation && teamEvaluation.history && teamEvaluation.history.length > 0) {
      const latestEvaluation = teamEvaluation.history[0];
      return latestEvaluation.percentage || 'N/A';
    }

    return 'N/A';
  };

  const activeTeamsCount = useMemo(() => {
    return fieldTeams.filter(t => !t.isTerminated).length || 1;
  }, [fieldTeams]);

  const { teamDetractorLimit, teamNeutralLimit, calculationBreakdown } = useMemo(() => {
    // Step 1: Year-to-Date allowed violations (Global)
    const ytdDetractorLimitGlobal = ytdTotalSamples * 0.09;
    const ytdNeutralLimitGlobal = ytdTotalSamples * 0.16;

    // Step 2: Per-team YTD limits (Used for compliance status)
    const ytdDetractorPerTeam = activeTeamsCount > 0 ? ytdDetractorLimitGlobal / activeTeamsCount : 0;
    const ytdNeutralPerTeam = activeTeamsCount > 0 ? ytdNeutralLimitGlobal / activeTeamsCount : 0;

    // Step 3: Yearly Limits (Based on all entered samples)
    const yearlyDetractorLimitGlobal = yearlyTotalSamples * 0.09;
    const yearlyNeutralLimitGlobal = yearlyTotalSamples * 0.16;

    const yearlyDetractorPerTeam = activeTeamsCount > 0 ? yearlyDetractorLimitGlobal / activeTeamsCount : 0;
    const yearlyNeutralPerTeam = activeTeamsCount > 0 ? yearlyNeutralLimitGlobal / activeTeamsCount : 0;

    // Step 4: Monthly Limits (Informative)
    const monthlyDetractorPerTeam = yearlyDetractorPerTeam / 12;
    const monthlyNeutralPerTeam = yearlyNeutralPerTeam / 12;

    return {
      teamDetractorLimit: Math.floor(ytdDetractorPerTeam),
      teamNeutralLimit: Math.floor(ytdNeutralPerTeam),
      calculationBreakdown: {
        ytdTotal: ytdTotalSamples,
        ytdDetractorLimitGlobal: ytdDetractorLimitGlobal.toFixed(1),
        ytdNeutralLimitGlobal: ytdNeutralLimitGlobal.toFixed(1),
        ytdDetractorPerTeam: ytdDetractorPerTeam.toFixed(2),
        ytdNeutralPerTeam: ytdNeutralPerTeam.toFixed(2),

        yearlyTotal: yearlyTotalSamples,
        yearlyDetractorLimit: yearlyDetractorLimitGlobal.toFixed(1),
        yearlyNeutralLimit: yearlyNeutralLimitGlobal.toFixed(1),
        yearlyDetractorPerTeam: yearlyDetractorPerTeam.toFixed(2),
        yearlyNeutralPerTeam: yearlyNeutralPerTeam.toFixed(2),

        monthlyDetractorPerTeam: monthlyDetractorPerTeam.toFixed(2),
        monthlyNeutralPerTeam: monthlyNeutralPerTeam.toFixed(2),

        activeTeams: activeTeamsCount,
        note: "Limits are dynamic based on accumulated Year-to-Date samples."
      }
    };
  }, [ytdTotalSamples, yearlyTotalSamples, activeTeamsCount]);

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const response = await api.get('/on-the-job-assessments', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          }
        });
        setAssessments(response.data);
      } catch (error) {
        console.error('Failed to fetch assessments:', error);
      }
    };
    fetchAssessments();
  }, []);

  // Keep selectedTeamSessions in sync
  useEffect(() => {
    if (viewSessionsDialogOpen && selectedTeamIdForSession) {
      const team = fieldTeams.find(t => t._id === selectedTeamIdForSession);
      if (team) {
        setSelectedTeamSessions(team.sessionHistory || []);
      }
    }
  }, [fieldTeams, viewSessionsDialogOpen, selectedTeamIdForSession]);

  const exportToExcel = () => {
    // Enhance rows with theoretical Online Test Score for export
    const enhancedExportRows = rows.map(row => ({
      ...row,
      evaluationScore: getTheoreticalSatisfactionScore(row.teamName)
    }));

    const exportData = enhancedExportRows.map(row => {
      const team = fieldTeams.find(t => t._id === row.id);
      const allSessions = team?.sessionHistory || [];

      const completedSessions = allSessions
        .filter(session => session.status === "Completed")
        .map((session, index) =>
          `${index + 1}. ${new Date(session.sessionDate).toLocaleDateString()} - ${session.sessionTitle || 'Training'}${session.notes ? ` (${session.notes})` : ''}`
        );

      const missedCanceledSessions = allSessions
        .filter(session => session.status === "Missed" || session.status === "Cancelled")
        .map((session, index) =>
          `${index + 1}. ${new Date(session.sessionDate).toLocaleDateString()} - ${session.status}${session.reason ? ` (Reason: ${session.reason})` : ''}`
        );

      return {
        'Team Name': row.teamName,
        'Team Company': row.teamCompany || 'N/A',
        'Trained': row.hasTraining ? 'Yes' : 'No',

        'Detractors': row.detractorCount,
        'Detractor Excess': row.detractorExcess > 0 ? `+${row.detractorExcess}` : '--',
        // 'Detractor Rate (%)': `${row.detractorRate}%`,
        'Neutrals': row.neutralCount,
        'Neutral Excess': row.neutralExcess > 0 ? `+${row.neutralExcess}` : '--',
        // 'Neutral Rate (%)': `${row.neutralRate}%`,

        'Total Violations': row.totalViolations,
        'Low Impact Tickets': row.lowPriorityCount,
        'Medium Impact Tickets': row.mediumPriorityCount,
        'High Impact Tickets': row.highPriorityCount,

        'Detractor Status': row.violatesDetractorThreshold ? 'FAIL' : 'OK',
        'Neutral Status': row.violatesNeutralThreshold ? 'FAIL' : 'OK',
        // 'Review Status': row.detractorCount > teamDetractorLimit ? 'Violated' : 'OK',

        'Notes': row.notes || 'None',
        'Recovery Advice': row.advice || 'On Track',
        'Consequence': row.consequenceApplied || 'None',

        'Completed Sessions': completedSessions.length > 0 ? completedSessions.join('\n\n') : 'None',
        'Last Completed Session': row.mostRecentCompletedSession,
        'Missed/Canceled Sessions': missedCanceledSessions.length > 0 ? missedCanceledSessions.join('\n\n') : 'None',
        'Last Missed/Canceled Session': row.mostRecentMissedCanceledSession,

        // 'Date Reached Violation Limit': row.dateReachedLimit || 'N/A',
        // 'How Threshold Was Reached': row.thresholdDescription,
        'Team Status': row.validationStatus,

        'Online Test Score': row.evaluationScore !== 'N/A' ? `${row.evaluationScore}%` : row.evaluationScore,

        'OTJ Assessment Result': row.otjAssessmentResult !== 'N/A' ? `${row.otjAssessmentResult}%` : row.otjAssessmentResult,
        'OTJ Assessment Date': row.otjAssessmentDate,
        'OTJ Assessment Feedback': row.otjAssessmentFeedback,
        'Conducted By': row.otjAssessmentConductedBy,

        'Exported Date': new Date().toLocaleDateString()
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Team Violations");
    const fileName = `Team_Violations_${new Date().toISOString().slice(0, 10)}_${new Date().getHours()}${new Date().getMinutes()}.xlsx`;
    XLSX.writeFile(workbook, fileName, { compression: true });
  };

  const handleEditSession = async (updatedSession) => {
    try {
      const response = await api.put(
        `/field-teams/${selectedTeamIdForSession}/update-session/${updatedSession._id}`,
        updatedSession, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      }
      );

      if (!response.data.success) throw new Error("Failed to update session");

      const updatedSessions = selectedTeamSessions.map(session =>
        session._id === updatedSession._id ? response.data.session : session
      );
      setSelectedTeamSessions(updatedSessions);

      const updatedFieldTeams = fieldTeams.map(team => {
        if (team._id === selectedTeamIdForSession) {
          return {
            ...team,
            sessionHistory: team.sessionHistory.map(session =>
              session._id === updatedSession._id ? response.data.session : session
            ),
          };
        }
        return team;
      });
      setFieldTeams(updatedFieldTeams);

      enqueueSnackbar("Session updated successfully!", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || "Update failed", { variant: "error" });
    }
  };

  const handleDeleteSession = async (sessionToDelete) => {
    if (!confirm(`Delete this ${sessionToDelete.status.toLowerCase()} session?`)) return;

    try {
      const response = await api.delete(
        `/field-teams/${selectedTeamIdForSession}/delete-session/${sessionToDelete._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        }
      }
      );

      if (!response.data.success) throw new Error("Failed to delete session");

      const updatedSessions = selectedTeamSessions.filter(
        session => session._id !== sessionToDelete._id
      );
      setSelectedTeamSessions(updatedSessions);

      const updatedFieldTeams = fieldTeams.map(team => {
        if (team._id === selectedTeamIdForSession) {
          return {
            ...team,
            sessionHistory: team.sessionHistory.filter(
              session => session._id !== sessionToDelete._id
            ),
            totalViolationPoints: response.data.updatedViolationPoints
          };
        }
        return team;
      });
      setFieldTeams(updatedFieldTeams);

      enqueueSnackbar(`Session deleted successfully`, { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || "Deletion failed", { variant: "error" });
    }
  };

  const handleViewSessionsClick = (teamId) => {
    const team = fieldTeams.find((t) => t._id === teamId);
    if (team) {
      setSelectedTeamSessions(team.sessionHistory || []);
      setSelectedTeamIdForSession(teamId);
      setViewSessionsDialogOpen(true);
    }
  };

  const handleViewSessionsDialogClose = () => {
    setViewSessionsDialogOpen(false);
    setSelectedTeamSessions([]);
    setSelectedTeamIdForSession(null);
  };

  const handleTeamNameClick = (teamName) => {
    setSelectedTeam(teamName);
  };

  const handleClose = () => {
    setSelectedTeam(null);
  };

  const handleAddSessionClick = (teamName, teamId) => {
    setSelectedTeamForSession(teamName);
    setSelectedTeamIdForSession(teamId);
    setAddSessionDialogOpen(true);
  };

  const handleAddSessionDialogClose = () => {
    setAddSessionDialogOpen(false);
    setSelectedTeamForSession(null);
  };

  const handleSaveSession = async (sessionData) => {
    try {
      const tempSessionId = `temp-${Date.now()}`;
      const optimisticSession = {
        ...sessionData,
        _id: tempSessionId,
        createdAt: new Date().toISOString()
      };

      const updatedFieldTeams = fieldTeams.map((team) => {
        if (team._id === selectedTeamIdForSession) {
          return {
            ...team,
            sessionHistory: [...(team.sessionHistory || []), optimisticSession],
          };
        }
        return team;
      });
      setFieldTeams(updatedFieldTeams);

      if (viewSessionsDialogOpen) {
        setSelectedTeamSessions(prev => [...(prev || []), optimisticSession]);
      }

      const response = await api.post(
        `/field-teams/${selectedTeamIdForSession}/add-session`,
        sessionData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          }
        }
      );

      if (!response.data?.success) {
        const revertedFieldTeams = fieldTeams.map((team) => {
          if (team._id === selectedTeamIdForSession) {
            return {
              ...team,
              sessionHistory: (team.sessionHistory || []).filter(s => s._id !== tempSessionId),
            };
          }
          return team;
        });
        setFieldTeams(revertedFieldTeams);

        if (viewSessionsDialogOpen) {
          setSelectedTeamSessions(prev => prev.filter(s => s._id !== tempSessionId));
        }

        throw new Error(response.data?.message || "Failed to save session");
      }

      const finalFieldTeams = updatedFieldTeams.map((team) => {
        if (team._id === selectedTeamIdForSession) {
          return {
            ...team,
            sessionHistory: team.sessionHistory.map(s =>
              s._id === tempSessionId ? response.data.session : s
            ),
          };
        }
        return team;
      });
      setFieldTeams(finalFieldTeams);

      if (viewSessionsDialogOpen) {
        setSelectedTeamSessions(prev =>
          prev.map(s => s._id === tempSessionId ? response.data.session : s)
        );
      }

      enqueueSnackbar("Session added successfully!", { variant: "success" });
      setAddSessionDialogOpen(false);
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.message ||
        error.message ||
        "Failed to add session. Please try again.",
        { variant: "error" }
      );
    }
  };

  const violationData = useMemo(() => {
    const teamViolations = {};

    tasks.forEach((task) => {
      const { teamName, evaluationScore, interviewDate, priority } = task; // Include both interviewDate and priority
      if (!teamViolations[teamName]) {
        teamViolations[teamName] = {
          detractor: 0,
          neutral: 0,
          lowPriority: 0,    // New: Count of Low priority tickets
          mediumPriority: 0, // New: Count of Medium priority tickets
          highPriority: 0,   // New: Count of High priority tickets
          violations: []
        };
      }
      teamViolations[teamName].violations.push({
        score: evaluationScore,
        date: interviewDate,  // Keep using interviewDate as in original
        priority: priority    // New: Store priority level
      });

      // Original score classification
      if (evaluationScore >= 1 && evaluationScore <= 6) {
        teamViolations[teamName].detractor += 1;
      } else if (evaluationScore >= 7 && evaluationScore <= 8) {
        teamViolations[teamName].neutral += 1;
      }

      // New: Count priority levels
      if (priority === 'Low') {
        teamViolations[teamName].lowPriority += 1;
      } else if (priority === 'Medium') {
        teamViolations[teamName].mediumPriority += 1;
      } else if (priority === 'High') {
        teamViolations[teamName].highPriority += 1;
      }
    });

    return teamViolations;
  }, [tasks]);

  const rows = useMemo(() => {
    const rowsData = fieldTeams.map((team) => {
      const teamName = team.teamName;
      // Get assessments for this team
      const teamAssessments = assessments.filter(a =>
        a.fieldTeamId?._id === team._id || a.fieldTeamId === team._id
      ).sort((a, b) => new Date(b.assessmentDate) - new Date(a.assessmentDate));

      const latestAssessment = teamAssessments[0];
      const teamViolations = violationData[teamName] || {
        detractor: 0,
        neutral: 0,
        lowPriority: 0,
        mediumPriority: 0,
        highPriority: 0,
        violations: []
      };
      const violations = teamViolations.violations;
      const sortedViolations = [...violations].sort((a, b) =>
        new Date(a.date) - new Date(b.date)
      );

      const detractorCount = teamViolations.detractor;
      const neutralCount = teamViolations.neutral;
      const totalViolations = detractorCount + neutralCount;

      const hasTraining = team?.sessionHistory?.some(
        session => session.status === "Completed"
      );

      const completedSessions = team?.sessionHistory?.filter(session => session.status === "Completed") || [];
      const missedOrCanceledSessions = team?.sessionHistory?.filter(session =>
        session.status === "Missed" || session.status === "Cancelled"
      ) || [];

      let dateReachedLimit = null;
      let runningDetractors = 0;
      let runningNeutrals = 0;
      let equivalentDetractors = 0;
      let thresholdCrossed = false;
      let violationPath = [];
      let thresholdCombo = null;

      for (const violation of sortedViolations) {
        const score = violation.score;
        let type = '';

        if (score >= 1 && score <= 6) {
          runningDetractors += 1;
          type = 'detractor';
        } else if (score >= 7 && score <= 8) {
          runningNeutrals += 1;
          type = 'neutral';
        }

        equivalentDetractors = runningDetractors + Math.floor(runningNeutrals / 3);

        violationPath.push({
          date: violation.date,
          type,
          runningDetractors,
          runningNeutrals,
          equivalentDetractors
        });

        // Note: usage of 3 here might need to be dynamic or kept as "soft" threshold for history
        if (equivalentDetractors >= 3 && !thresholdCrossed) {
          dateReachedLimit = violation.date;
          thresholdCrossed = true;

          const neutralsUsed = Math.min(runningNeutrals, (3 - runningDetractors) * 3);
          thresholdCombo = {
            detractors: runningDetractors,
            neutrals: neutralsUsed,
            remainingNeutrals: runningNeutrals - neutralsUsed
          };

          runningDetractors = 0;
          runningNeutrals = thresholdCombo.remainingNeutrals;
          equivalentDetractors = Math.floor(runningNeutrals / 3);
        }
      }

      const totalDetractors = teamViolations.detractor;
      const totalNeutrals = teamViolations.neutral;
      const currentEquivalent = totalDetractors + Math.floor(totalNeutrals / 3);

      let thresholdDescription = "Not reached";
      if (dateReachedLimit) {
        if (thresholdCombo) {
          const parts = [];
          if (thresholdCombo.detractors > 0) {
            parts.push(`${thresholdCombo.detractors} detractor(s)`);
          }
          if (thresholdCombo.neutrals > 0) {
            parts.push(`${thresholdCombo.neutrals} neutral(s)`);
          }
          thresholdDescription = `Reached via ${parts.join(' + ')}`;

          if (thresholdCombo.remainingNeutrals > 0) {
            thresholdDescription += ` (${thresholdCombo.remainingNeutrals} neutral(s) carried over)`;
          }
        }
      }

      const curDate = new Date();
      const currentWeek = getCustomWeekNumber(curDate, curDate.getFullYear());
      const avgSamplesPerWeek = currentWeek > 0 && ytdTotalSamples > 0
        ? ytdTotalSamples / currentWeek
        : (totalGlobalSamples / 52); // fallback

      // Use YTD Samples for accurate rate calculation relative to current time
      // If YTD is 0, fall back to global or 1 to prevent division by zero
      const sampleBase = ytdTotalSamples > 0 ? ytdTotalSamples : (totalGlobalSamples > 0 ? totalGlobalSamples : 1);

      const detractorRate = ((totalDetractors / sampleBase) * 100).toFixed(1);
      const neutralRate = ((totalNeutrals / sampleBase) * 100).toFixed(1);

      // Violation checks against Dynamic Limits
      const isDetractorViolated = totalDetractors > teamDetractorLimit;
      const isNeutralViolated = totalNeutrals > teamNeutralLimit;

      let validationStatus = "Active";
      let notes = "";
      let consequence = [];
      let advice = "On Track";

      // Advice Calculation
      const activeTeamsCount = calculationBreakdown?.activeTeams || 1; // Default to 1 to prevent division by zero
      if (isDetractorViolated || isNeutralViolated) {
        let neededSamples = 0;

        if (isDetractorViolated) {
          // Formula: Count <= (NewTotal * 0.09) / Teams
          // NewTotal >= (Count * Teams) / 0.09
          const targetYTD = (totalDetractors * activeTeamsCount) / 0.09;
          const requiredAdditional = Math.max(0, targetYTD - sampleBase);
          neededSamples = Math.max(neededSamples, requiredAdditional);
        }

        if (isNeutralViolated) {
          // Formula: Count <= (NewTotal * 0.16) / Teams
          // NewTotal >= (Count * Teams) / 0.16
          const targetYTD = (totalNeutrals * activeTeamsCount) / 0.16;
          const requiredAdditional = Math.max(0, targetYTD - sampleBase);
          neededSamples = Math.max(neededSamples, requiredAdditional);
        }

        const neededWeeks = avgSamplesPerWeek > 0
          ? Math.ceil(neededSamples / avgSamplesPerWeek)
          : 0;

        advice = `Needs ~${Math.ceil(neededSamples).toLocaleString()} clean samples (~${neededWeeks} weeks)`;
      }

      if (team?.isTerminated) {
        validationStatus = "Terminated";
        notes = `Terminated. Reason: ${team.terminationReason || "N/A"}`;
        advice = "Terminated";
      } else if (team?.isSuspended) {
        validationStatus = "Suspended";
        notes = `Suspended until ${team.suspensionEndDate || "N/A"}. Reason: ${team.suspensionReason || "N/A"}`;
        advice = "Suspended";
      } else if (team?.isResigned) {
        validationStatus = "Resigned";
        notes = `Resigned. Reason: ${team.resignationReason || "N/A"}`;
        advice = "Resigned";
      } else if (team?.isOnLeave) {
        validationStatus = "On Leave";
        notes = "Team is currently on leave";
        advice = "On Leave";
      } else {
        validationStatus = "Active";

        if (isDetractorViolated) {
          consequence.push("Detractor Limit Exceeded");
        }

        if (isNeutralViolated) {
          consequence.push("Neutral Limit Exceeded");
        }

        if (consequence.length > 0) {
          notes = consequence.join(" & ");
        } else {
          notes = "Within limits";
        }
      }

      const mostRecentCompletedSession = completedSessions.length > 0
        ? new Date(
          Math.max(
            ...completedSessions
              .map((session) => new Date(session.sessionDate))
          )
        )
        : null;

      const mostRecentMissedCanceledSession = missedOrCanceledSessions.length > 0
        ? new Date(
          Math.max(
            ...missedOrCanceledSessions
              .map((session) => new Date(session.sessionDate))
          )
        )
        : null;

      return {
        id: team._id,
        teamName,
        teamCompany: team.teamCompany || 'N/A',
        hasTraining,
        detractorCount: totalDetractors,
        neutralCount: totalNeutrals,
        totalViolations,
        equivalentDetractorCount: currentEquivalent,
        detractorRate, // Now uses YTD or global as fallback
        neutralRate,
        promoterRate: sampleBase > 0 ? (75.0).toFixed(1) : '0.0', // Placeholder
        nps: sampleBase > 0 ? (75.0 - ((totalDetractors / sampleBase) * 100)).toFixed(1) : '0.0',

        // Critical: Status now driven by comparison to Dynamic Limit
        violatesDetractorThreshold: isDetractorViolated,
        violatesNeutralThreshold: isNeutralViolated,

        detractorExcess: Math.max(0, totalDetractors - teamDetractorLimit),
        neutralExcess: Math.max(0, totalNeutrals - teamNeutralLimit),

        lowPriorityCount: teamViolations.lowPriority,
        mediumPriorityCount: teamViolations.mediumPriority,
        highPriorityCount: teamViolations.highPriority,

        // Add assessment data
        otjAssessmentResult: latestAssessment?.overallScore || 'N/A',
        otjAssessmentDate: latestAssessment?.assessmentDate
          ? new Date(latestAssessment.assessmentDate).toLocaleDateString()
          : 'N/A',
        otjAssessmentFeedback: latestAssessment?.feedback || 'N/A',
        otjAssessmentConductedBy: latestAssessment?.conductedBy || 'N/A',

        dateReachedLimit: dateReachedLimit
          ? new Date(dateReachedLimit).toLocaleDateString()
          : currentEquivalent >= 3 ? "Threshold not recorded" : null,
        thresholdDescription,
        consequenceApplied: consequence,
        notes,
        advice,
        validationStatus,
        isEvaluated: team.isEvaluated,
        evaluationScore: team.evaluationScore || 'N/A',
        mostRecentCompletedSession: mostRecentCompletedSession
          ? mostRecentCompletedSession.toLocaleDateString()
          : "No completed sessions",
        mostRecentMissedCanceledSession: mostRecentMissedCanceledSession
          ? mostRecentMissedCanceledSession.toLocaleDateString()
          : "No missed/canceled sessions",
      };
    });

    return rowsData.sort((a, b) => {
      // Sort logic prioritizing violations
      if (a.violatesDetractorThreshold !== b.violatesDetractorThreshold) {
        return a.violatesDetractorThreshold ? -1 : 1;
      }
      if (b.totalViolations !== a.totalViolations) {
        return b.totalViolations - a.totalViolations;
      }
      return b.equivalentDetractorCount - a.equivalentDetractorCount;
    });
  }, [fieldTeams, assessments, violationData, ytdTotalSamples, totalGlobalSamples, teamDetractorLimit, teamNeutralLimit]);

  const handleReportAbsence = async (absenceData) => {
    try {
      const response = await api.post(
        `/field-teams/${selectedTeamIdForSession}/report-absence`,
        {
          sessionDate: absenceData.sessionDate,
          reason: absenceData.reason
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          }
        }
      );

      if (!response.data.success) {
        throw new Error("Failed to report absence");
      }

      const teamResponse = await api.get(`/field-teams/get-field-teams`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        }
      });
      setFieldTeams(teamResponse.data);

      enqueueSnackbar("Absence reported successfully! Violation recorded.", {
        variant: "success"
      });
      setReportAbsenceDialogOpen(false);
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || "Failed to report absence. Please try again.", {
        variant: "error"
      });
    }
  };

  const selectedTeamTasks = useMemo(() => {
    if (!selectedTeam) return [];
    return tasks.filter((task) => task.teamName === selectedTeam);
  }, [selectedTeam, tasks]);

  const filteredRows = useMemo(() => {
    if (!searchText) return rows;

    const searchLower = searchText.toLowerCase();

    return rows.filter(row => {
      return Object.keys(row).some(key => {
        const value = row[key];
        if (value === null || value === undefined) return false;

        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchLower);
        }
        if (typeof value === 'number') {
          return value.toString().includes(searchText);
        }
        if (typeof value === 'boolean') {
          return (value ? 'yes' : 'no').includes(searchLower);
        }
        return false;
      });
    });
  }, [rows, searchText]);

  const handleViolationDialogOpen = () => setViolationDialogOpen(true);
  const handleViolationDialogClose = () => setViolationDialogOpen(false);

  return (
    <Box sx={{ my: "40px" }}>
      <Stack direction="column" spacing={2}>
        <SearchAndExport
          searchText={searchText}
          setSearchText={setSearchText}
          exportToExcel={exportToExcel}
          onViolationInfoClick={handleViolationDialogOpen}
          tasks={tasks}
          fieldTeams={fieldTeams}
          teamDetractorLimit={teamDetractorLimit}
          teamNeutralLimit={teamNeutralLimit}
          totalGlobalSamples={totalGlobalSamples}
          calculationBreakdown={calculationBreakdown}
        />

        {/* Info Card */}
        <Paper sx={{ p: 2, backgroundColor: '#1e1e1e', border: '1px solid #333' }}>
          <Typography variant="h6" sx={{ color: '#fff', mb: 2, fontSize: '1rem', fontWeight: 600 }}>
            📊 Year-to-Date Dynamic Limits
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ color: '#b3b3b3', mb: 1 }}>
                <strong style={{ color: '#4caf50' }}>✓ Dynamic Limit:</strong> Limits grow as year progresses (Samples × Limit %) / Active Teams.
              </Typography>
              <Typography variant="body2" sx={{ color: '#b3b3b3', mb: 1 }}>
                <strong style={{ color: '#f44336' }}>⚠ Violation:</strong> Total year-to-date violations exceed the current dynamic allowed limit.
              </Typography>
            </Box>
            <Box sx={{ borderLeft: '1px solid #444', pl: 2 }}>
              <Typography variant="body2" sx={{ color: '#b3b3b3', mb: 0.5 }}>
                Current YTD Total Samples: <strong style={{ color: '#fff' }}>{calculationBreakdown?.ytdTotal}</strong>
              </Typography>
              <Typography variant="body2" sx={{ color: '#b3b3b3', mb: 0.5 }}>
                Global YTD Allowed: <strong style={{ color: '#f44336' }}>{calculationBreakdown?.ytdDetractorLimitGlobal} Detractors</strong> | <strong style={{ color: '#ff9800' }}>{calculationBreakdown?.ytdNeutralLimitGlobal} Neutrals</strong>
              </Typography>
              <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                Per Team Limit (Active: {calculationBreakdown?.activeTeams}): <strong style={{ color: '#f44336' }}>{teamDetractorLimit} Detractors</strong> | <strong style={{ color: '#ff9800' }}>{teamNeutralLimit} Neutrals</strong>
              </Typography>
            </Box>
          </Box>
        </Paper>

        <ViolationDataGrid
          rows={filteredRows}
          user={user}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          onTeamNameClick={handleTeamNameClick}
          onAddSessionClick={handleAddSessionClick}
          onViewSessionsClick={handleViewSessionsClick}
          onReportAbsenceClick={(teamName, teamId) => {
            setSelectedTeamForAbsence(teamName);
            setSelectedTeamIdForSession(teamId);
            setReportAbsenceDialogOpen(true);
          }}
        />
      </Stack>

      <SessionDialogs
        open={!!selectedTeam}
        onClose={handleClose}
        selectedTeamTasks={selectedTeamTasks}
        selectedTeam={selectedTeam}
        addSessionDialogOpen={addSessionDialogOpen}
        onAddSessionDialogClose={handleAddSessionDialogClose}
        onSaveSession={handleSaveSession}
        selectedTeamForSession={selectedTeamForSession}
        viewSessionsDialogOpen={viewSessionsDialogOpen}
        onViewSessionsDialogClose={handleViewSessionsDialogClose}
        selectedTeamSessions={selectedTeamSessions}
        onEditSession={handleEditSession}
        onDeleteSession={handleDeleteSession}
        reportAbsenceDialogOpen={reportAbsenceDialogOpen}
        onReportAbsenceClose={() => setReportAbsenceDialogOpen(false)}
        onReportAbsence={handleReportAbsence}
        selectedTeamForAbsence={selectedTeamForAbsence}
        violationDialogOpen={violationDialogOpen}
        onViolationDialogClose={handleViolationDialogClose}
      />
    </Box>
  );
};

export default TeamViolationTracker;