import { useEffect, useMemo, useState } from "react";
import { Box, Button, IconButton, Paper, Stack, Tooltip, Typography, useMediaQuery } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { TaskDetailsDialog } from './TaskDetailsDialog';
import AddSessionDialog from "./AddSessionDialog";
import api from "../api/api";
import { useSnackbar } from "notistack";
import ViewSessionsDialog from "./ViewSessionsDialog";
import * as XLSX from 'xlsx';
import { useSelector } from "react-redux";
import ReportAbsenceDialog from "./ResportAbsenseDialog";
import { RiFileExcel2Fill } from "react-icons/ri";
import { MdAdd, MdGroups, MdHistory, MdReport } from "react-icons/md";
import { Assessment, Block, CheckCircle, Event, Grade, InfoOutlined, PauseCircleOutline, Pending, Warning } from "@mui/icons-material";

const TeamViolationTracker = ({ tasks, initialFieldTeams = [] }) => {
  const { enqueueSnackbar } = useSnackbar();
  const user = useSelector((state) => state?.auth?.user);
  const [open, setOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [addSessionDialogOpen, setAddSessionDialogOpen] = useState(false);
  const [selectedTeamForSession, setSelectedTeamForSession] = useState(null);
  const [selectedTeamIdForSession, setSelectedTeamIdForSession] = useState(null);
  const [viewSessionsDialogOpen, setViewSessionsDialogOpen] = useState(false);
  const [selectedTeamSessions, setSelectedTeamSessions] = useState([]);
  const [fieldTeams, setFieldTeams] = useState(initialFieldTeams);
  const [reportAbsenceDialogOpen, setReportAbsenceDialogOpen] = useState(false);
  const [selectedTeamForAbsence, setSelectedTeamForAbsence] = useState(null);
  const isMobile = useMediaQuery('(max-width:503px)');

  // Keep selectedTeamSessions in sync with fieldTeams when dialog is open
  useEffect(() => {
    if (viewSessionsDialogOpen && selectedTeamIdForSession) {
      const team = fieldTeams.find(t => t._id === selectedTeamIdForSession);
      if (team) {
        setSelectedTeamSessions(team.sessionHistory || []);
      }
    }
  }, [fieldTeams, viewSessionsDialogOpen, selectedTeamIdForSession]);

  const exportToExcel = () => {
    const exportData = rows.map(row => {
      const team = fieldTeams.find(t => t._id === row.id);
      const sessionHistory = team?.sessionHistory || [];

      // Format session history with clear separation
      const formattedSessions = sessionHistory.length > 0
        ? sessionHistory.map((session, index) =>
          `${index + 1}. ${new Date(session.sessionDate).toLocaleDateString()} - ${session.status}${session.notes ? ` (${session.notes})` : ''
          }`
        ).join('\n\n')  // Double line breaks for better separation
        : 'No sessions recorded';

      return {
        'Team Name': row.teamName,
        'Detractor Violations (1-6)': row.detractorCount,
        'Neutral Violations (7-8)': row.neutralCount,
        'Equivalent Detractors': row.equivalentDetractorCount,
        'Total Violations': row.totalViolations,
        'Date Reached Violation Limit': row.dateReachedLimit || 'N/A',
        'How Threshold Was Reached': row.thresholdDescription,
        'Consequence Applied': row.consequenceApplied,
        'Notes/Comments': row.notes,
        'Status': row.validationStatus,
        'Evaluated': row.isEvaluated ? 'Yes' : 'No',
        'Evaluation Score': row.evaluationScore || 'N/A',
        'Violation Status': row.equivalentDetractorCount >= 3 ? 'Violated' :
          row.equivalentDetractorCount === 2 ? 'Warning' : 'OK',
        'Most Recent Session': row.mostRecentSession,
        'Session History': formattedSessions,
        'Exported Date': new Date().toLocaleDateString()
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();

    // Set optimal column widths
    worksheet['!cols'] = [
      { wch: 25 },  // Team Name
      { wch: 12 },  // Detractor Violations
      { wch: 12 },  // Neutral Violations
      { wch: 12 },  // Equivalent Detractors
      { wch: 10 },  // Total Violations
      { wch: 15 },  // Date Reached Limit
      { wch: 25 },  // How Threshold Was Reached
      { wch: 25 },  // Consequence Applied
      { wch: 30 },  // Notes/Comments
      { wch: 12 },  // Status
      { wch: 10 },  // Evaluated
      { wch: 15 },  // Evaluation Score
      { wch: 15 },  // Violation Status
      { wch: 15 },  // Most Recent Session
      { wch: 60 },  // Session History (wider for multi-line content)
      { wch: 15 }   // Exported Date
    ];

    // Format headers
    if (worksheet['!ref']) {
      const range = XLSX.utils.decode_range(worksheet['!ref']);

      // Style headers
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerCell = XLSX.utils.encode_cell({ r: range.s.r, c: C });
        if (!worksheet[headerCell]) continue;
        worksheet[headerCell].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4472C4" } },  // Blue background
          alignment: { wrapText: true }
        };
      }

      // Style session history cells for better readability
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const sessionCell = XLSX.utils.encode_cell({ r: R, c: 14 }); // Session History column
        if (worksheet[sessionCell]) {
          worksheet[sessionCell].s = {
            alignment: {
              wrapText: true,
              vertical: 'top',
              shrinkToFit: true
            },
            font: { sz: 10 }  // Slightly smaller font for session history
          };
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, "Team Violations");

    // Generate filename with timestamp
    const fileName = `Team_Violations_${new Date().toISOString().slice(0, 10)}_${new Date().getHours()}${new Date().getMinutes()}.xlsx`;
    XLSX.writeFile(workbook, fileName, { compression: true });
  };

  const handleEditSession = async (updatedSession) => {
    // console.log("Editing session:", updatedSession); // Debug log

    if (!updatedSession._id) {
      enqueueSnackbar("Session ID is missing - cannot update", { variant: "error" });
      return;
    }

    try {
      const response = await api.put(
        `/field-teams/${selectedTeamIdForSession}/update-session/${updatedSession._id}`,
        updatedSession,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (!response.data.success) throw new Error("Failed to update session");

      // Update local state
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
      // console.error("Update error:", error);
      enqueueSnackbar(error.response?.data?.message || "Update failed", { variant: "error" });
    }
  };

  const handleDeleteSession = async (sessionToDelete) => {
    if (!confirm(`Delete this ${sessionToDelete.status.toLowerCase()} session?`)) return;

    try {
      const response = await api.delete(
        `/field-teams/${selectedTeamIdForSession}/delete-session/${sessionToDelete._id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (!response.data.success) throw new Error("Failed to delete session");

      // Update local state
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

      enqueueSnackbar(
        `Session deleted successfully`,
        { variant: "success" }
      );
    } catch (error) {
      // console.error("Delete error:", error);
      enqueueSnackbar(
        error.response?.data?.message || "Deletion failed",
        { variant: "error" }
      );
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
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
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
      // Optimistic update with temporary ID
      const tempSessionId = `temp-${Date.now()}`;
      const optimisticSession = {
        ...sessionData,
        _id: tempSessionId,
        createdAt: new Date().toISOString()
      };

      // Update both states optimistically
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

      // Send to backend
      const response = await api.post(
        `/field-teams/${selectedTeamIdForSession}/add-session`,
        sessionData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (!response.data?.success) {
        // Revert optimistic updates if failed
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

      // Replace temporary session with actual session from backend
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
      // console.error("Error saving session:", error);
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
      const { teamName, evaluationScore, interviewDate } = task;
      if (!teamViolations[teamName]) {
        teamViolations[teamName] = {
          detractor: 0,
          neutral: 0,
          violations: []
        };
      }
      teamViolations[teamName].violations.push({
        score: evaluationScore,
        date: interviewDate
      });

      if (evaluationScore >= 1 && evaluationScore <= 6) {
        teamViolations[teamName].detractor += 1;
      } else if (evaluationScore >= 7 && evaluationScore <= 8) {
        teamViolations[teamName].neutral += 1;
      }
    });

    return teamViolations;
  }, [tasks]);

  const rows = useMemo(() => {
    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    const rowsData = Object.keys(violationData).map((teamName) => {
      const team = fieldTeams.find((t) => t.teamName === teamName);
      if (!team) {
        // console.warn(`Team not found: ${teamName}`);
        return null;
      }

      const violations = violationData[teamName].violations;
      const sortedViolations = [...violations].sort((a, b) =>
        new Date(a.date) - new Date(b.date)
      );

      // Track violation threshold (3 equivalent detractors)
      let dateReachedLimit = null;
      let runningDetractors = 0;
      let runningNeutrals = 0;
      let equivalentDetractors = 0;
      let thresholdCrossed = false;
      let violationPath = []; // Track how threshold was reached
      let thresholdCombo = null; // Track the exact combination that reached threshold

      for (const violation of sortedViolations) {
        const score = violation.score;
        let type = '';

        // Update running counts
        if (score >= 1 && score <= 6) {
          runningDetractors += 1;
          type = 'detractor';
        } else if (score >= 7 && score <= 8) {
          runningNeutrals += 1;
          type = 'neutral';
        }

        // Calculate current equivalent detractors
        equivalentDetractors = runningDetractors + Math.floor(runningNeutrals / 3);

        // Record the path to threshold
        violationPath.push({
          date: violation.date,
          type,
          runningDetractors,
          runningNeutrals,
          equivalentDetractors
        });

        // Check if we've crossed the threshold for the first time
        if (equivalentDetractors >= 3 && !thresholdCrossed) {
          dateReachedLimit = violation.date;
          thresholdCrossed = true;

          // Calculate the exact combination that reached the threshold
          const neutralsUsed = Math.min(runningNeutrals, (3 - runningDetractors) * 3);
          thresholdCombo = {
            detractors: runningDetractors,
            neutrals: neutralsUsed,
            remainingNeutrals: runningNeutrals - neutralsUsed
          };

          // Reset counters after reaching threshold (carry over unused neutrals)
          runningDetractors = 0;
          runningNeutrals = thresholdCombo.remainingNeutrals;
          equivalentDetractors = Math.floor(runningNeutrals / 3);
        }
      }

      // Get counts for last 3 months
      const recentDetractors = violations.filter(
        (v) => v.score >= 1 && v.score <= 6 && new Date(v.date) >= threeMonthsAgo
      ).length;
      const recentNeutrals = violations.filter(
        (v) => v.score >= 7 && v.score <= 8 && new Date(v.date) >= threeMonthsAgo
      ).length;

      const currentEquivalent = recentDetractors + Math.floor(recentNeutrals / 3);

      // Determine how the threshold was reached (if applicable)
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

          // Add info about unused neutrals if any
          if (thresholdCombo.remainingNeutrals > 0) {
            thresholdDescription += ` (${thresholdCombo.remainingNeutrals} neutral(s) carried over)`;
          }
        } else {
          // Fallback if thresholdCombo wasn't set
          const thresholdState = violationPath.find(v =>
            new Date(v.date).getTime() === new Date(dateReachedLimit).getTime()
          );
          if (thresholdState) {
            thresholdDescription = `Reached via ${thresholdState.runningDetractors > 0
              ? `${thresholdState.runningDetractors} detractor(s)`
              : ''
              }${thresholdState.runningDetractors > 0 && thresholdState.runningNeutrals >= 3
                ? ' + '
                : ''
              }${thresholdState.runningNeutrals >= 3
                ? `${Math.floor(thresholdState.runningNeutrals / 3)} neutral group(s)`
                : ''
              }`;
          }
        }
      }

      // Determine consequences
      let consequence = "";
      let notes = "";
      let validationStatus = "Active";

      if (team?.isSuspended) {
        validationStatus = "Suspended";
        notes = `Suspended until ${team.suspensionEndDate || "N/A"}. Reason: ${team.suspensionReason || "N/A"}`;
      } else if (team?.isTerminated) {
        validationStatus = "Terminated";
        notes = `Terminated. Reason: ${team.terminationReason || "N/A"}`;
      } else {
        validationStatus = "Active";

        if (currentEquivalent >= 3) {
          consequence = "Immediate suspension pending review";
          notes = `Violation limit reached (${currentEquivalent} equivalent detractors). ${thresholdDescription}`;
        } else if (currentEquivalent === 2) {
          consequence = "Formal warning";
          notes = "Approaching violation limit (2 equivalent detractors)";
        } else if (currentEquivalent === 1) {
          consequence = "Verbal warning";
          notes = "1 equivalent detractor recorded";
        } else {
          notes = "No violations recorded";
        }
      }

      const mostRecentSession = team?.sessionHistory?.length > 0
        ? new Date(
          Math.max(
            ...team.sessionHistory
              .map((session) => new Date(session?.sessionDate))
              .filter((date) => !isNaN(date))
          )
        )
        : null;

      return {
        id: team._id,
        teamName,
        detractorCount: recentDetractors,
        neutralCount: recentNeutrals,
        equivalentDetractorCount: currentEquivalent,
        totalViolations: violations.length,
        dateReachedLimit: dateReachedLimit
          ? new Date(dateReachedLimit).toLocaleDateString()
          : currentEquivalent >= 3 ? "Threshold not recorded" : null,
        thresholdDescription,
        consequenceApplied: consequence,
        notes,
        validationStatus,
        isEvaluated: team.isEvaluated,
        evaluationScore: team.evaluationScore || 'N/A',
        mostRecentSession: mostRecentSession ? mostRecentSession.toLocaleDateString() : "No sessions",
      };
    }).filter(Boolean);

    return rowsData.sort((a, b) => {
      // Sort by equivalent detractors (descending), then by whether limit was reached
      if (b.equivalentDetractorCount !== a.equivalentDetractorCount) {
        return b.equivalentDetractorCount - a.equivalentDetractorCount;
      }
      return (b.dateReachedLimit ? 1 : 0) - (a.dateReachedLimit ? 1 : 0);
    });
  }, [violationData, fieldTeams]);

  const columns = [
    {
      field: "teamName",
      headerName: "Team Name",
      width: 200,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Button
          onClick={() => handleTeamNameClick(params.value)}
          sx={{
            color: '#3ea6ff',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: 'rgba(62, 166, 255, 0.1)'
            }
          }}
          startIcon={<MdGroups />}
        >
          {params.value}
        </Button>
      ),
    },
    {
      field: "detractorCount",
      headerName: "Detractors",
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: params.value > 0 ? '#f44336' : '#aaaaaa'
        }}>
          <Warning fontSize="small" sx={{ mr: 0.5 }} />
          {params.value}
        </Box>
      )
    },
    {
      field: "neutralCount",
      headerName: "Neutrals",
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: params.value > 0 ? '#ff9800' : '#aaaaaa'
        }}>
          <InfoOutlined fontSize="small" sx={{ mr: 0.5 }} />
          {params.value}
          <Typography variant="caption" sx={{ ml: 0.5 }}>
            ({Math.floor(params.value / 3)} eq.)
          </Typography>
        </Box>
      )
    },
    {
      field: "equivalentDetractorCount",
      headerName: "Eq. Detractors",
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: params.value >= 3 ? 'bold' : 'normal',
          color: params.value >= 3 ? '#f44336' :
            params.value === 2 ? '#ff9800' : '#4caf50'
        }}>
          <Assessment fontSize="small" sx={{ mr: 0.5 }} />
          {params.value}
        </Box>
      )
    },
    {
      field: "dateReachedLimit",
      headerName: "Limit Date",
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: params.value ? '#f44336' : '#aaaaaa',
          fontWeight: params.value ? 'bold' : 'normal'
        }}>
          <Event fontSize="small" sx={{ mr: 0.5 }} />
          {params.value || '--'}
        </Box>
      )
    },
    {
      field: "thresholdDescription",
      headerName: "How Reached",
      width: 200,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontStyle: params.value === "Not reached" ? 'italic' : 'normal',
            color: params.value === "Not reached" ? '#aaaaaa' : '#ffffff',
            fontSize: '0.8rem', display: 'flex', alignItems: 'center', height: '100%'
          }}
        >
          {params.value}
        </Typography>
      )
    },
    {
      field: "consequenceApplied",
      headerName: "Consequence",
      width: 200,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{
          color: params.value.includes('suspension') ? '#f44336' :
            params.value.includes('warning') ? '#ff9800' : '#4caf50',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center'
        }}>
          {params.value.includes('suspension') ? <Block sx={{ mr: 0.5 }} /> :
            params.value.includes('warning') ? <Warning sx={{ mr: 0.5 }} /> :
              <CheckCircle sx={{ mr: 0.5 }} />}
          {params.value || '--'}
        </Box>
      )
    },
    {
      field: "notes",
      headerName: "Notes",
      width: 250,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', height: '100%' }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: "validationStatus",
      headerName: "Team Status",
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: params.value === 'Suspended' ? '#f44336' :
            params.value === 'Terminated' ? '#f44336' :
              params.value === 'Active' ? '#4caf50' : '#ff9800',
          fontSize: '0.8rem',
        }}>
          {
            params.value === 'Suspended' ? <PauseCircleOutline sx={{ mr: 0.5, fontSize: '1.1rem' }} /> :
              params.value === 'Terminated' ? <Block sx={{ mr: 0.5, fontSize: '1.1rem' }} /> :
                <CheckCircle sx={{ mr: 0.5, fontSize: '1.1rem' }} />
          }
          {params.value}
        </Box>
      )
    },
    {
      field: "isEvaluated",
      headerName: "Evaluated",
      width: 100,
      align: 'center',
      headerAlign: 'center',
      type: "boolean",
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: params.value ? '#4caf50' : '#ff9800'
        }}>
          {params.value ? <CheckCircle sx={{ mr: 0.5, fontSize: '1.1rem' }} /> : <Pending sx={{ mr: 0.5, fontSize: '1.1rem' }} />}
          {params.value ? 'Yes' : 'No'}
        </Box>
      )
    },
    {
      field: "evaluationScore",
      headerName: "Score",
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: params.value >= 9 ? '#4caf50' :
            params.value >= 7 ? '#ff9800' : '#f44336'
        }}>
          <Grade sx={{ mr: 0.5, fontSize: '1.1rem' }} />
          {params.value || 'N/A'}
        </Box>
      )
    },
    {
      field: "violationStatus",
      headerName: "Status",
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const equivalentDetractorCount = params.row.equivalentDetractorCount;
        return (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: equivalentDetractorCount >= 3 ? "#f44336" :
              equivalentDetractorCount === 2 ? "#ff9800" : "#4caf50",
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
            fontWeight: 'bold',
            fontSize: '0.8rem'
          }}>
            {equivalentDetractorCount >= 3 ? <Block sx={{ mr: 0.5, fontSize: '1.1rem' }} /> :
              equivalentDetractorCount === 2 ? <Warning sx={{ mr: 0.5, fontSize: '1.1rem' }} /> :
                <CheckCircle sx={{ mr: 0.5, fontSize: '1.1rem' }} />}
            {equivalentDetractorCount >= 3 ? 'VIOLATED' :
              equivalentDetractorCount === 2 ? 'WARNING' : 'OK'}
          </Box>
        );
      },
    },
    {
      field: "mostRecentSession",
      headerName: "Last Session",
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontStyle: params.value === "No sessions" ? "italic" : "normal",
          color: params.value === "No sessions" ? '#aaaaaa' : '#ffffff',
          fontSize: '0.8rem'
        }}>
          <Event sx={{ mr: 0.5, fontSize: '1.1rem' }} />
          {params.value}
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 250,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        return (
          <Box sx={{
            display: 'flex',
            gap: 1,
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%'
          }}>
            <Tooltip title="Add Session">
              <IconButton
                disabled={user.role !== "Admin"}
                onClick={() => handleAddSessionClick(params.row.teamName, params.row.id)}
                sx={{
                  color: '#4caf50',
                  '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.1)' },
                  '&.Mui-disabled': { color: '#666' }
                }}
              >
                <MdAdd />
              </IconButton>
            </Tooltip>

            <Tooltip title="Report Absence">
              <IconButton
                disabled={user.role !== "Admin"}
                onClick={() => {
                  setSelectedTeamForAbsence(params.row.teamName);
                  setSelectedTeamIdForSession(params.row.id);
                  setReportAbsenceDialogOpen(true);
                }}
                sx={{
                  color: '#f44336',
                  '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.1)' },
                  '&.Mui-disabled': { color: '#666' }
                }}
              >
                <MdReport />
              </IconButton>
            </Tooltip>

            <Tooltip title="View Sessions">
              <IconButton
                onClick={() => handleViewSessionsClick(params.row.id)}
                sx={{
                  color: '#2196f3',
                  '&:hover': { backgroundColor: 'rgba(33, 150, 243, 0.1)' }
                }}
              >
                <MdHistory />
              </IconButton>
            </Tooltip>
          </Box>
        )
      },
    },
  ];

  const handleReportAbsence = async (absenceData) => {
    // console.log({ absenceData });
    try {
      const response = await api.post(
        `/field-teams/${selectedTeamIdForSession}/report-absence`,
        {
          sessionDate: absenceData.sessionDate,
          reason: absenceData.reason
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (!response.data.success) {
        throw new Error("Failed to report absence");
      }

      // Refresh team data
      const teamResponse = await api.get(`/field-teams/get-field-teams`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      setFieldTeams(teamResponse.data);

      enqueueSnackbar("Absence reported successfully! Violation recorded.", {
        variant: "success"
      });
      setReportAbsenceDialogOpen(false);
    } catch (error) {
      // console.error("Error reporting absence:", error);
      enqueueSnackbar(error.response?.data?.message || "Failed to report absence. Please try again.", {
        variant: "error"
      });
    }
  };

  const selectedTeamTasks = useMemo(() => {
    if (!selectedTeam) return [];
    return tasks.filter((task) => task.teamName === selectedTeam);
  }, [selectedTeam, tasks]);

  return (
    <Box sx={{ marginBottom: "20px" }} >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          marginBottom: "10px",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography
          variant="h6"
          fontWeight="bold"
          sx={{
            color: "#ffffff",
            fontSize: isMobile ? "0.9rem" : "1rem",
          }}
        >
          Team Violation Tracker
        </Typography>
        <Tooltip title="Export to Excel">
          <IconButton
            onClick={exportToExcel}
            size={isMobile ? "small" : "medium"}
            sx={{
              color: '#4caf50',
              '&:hover': {
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
              }
            }}
          >
            <RiFileExcel2Fill fontSize={isMobile ? "16px" : "20px"} />
          </IconButton>
        </Tooltip>
      </Stack>
      <Paper sx={{ height: 400, width: "100%", backgroundColor: "#272727" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={5}
          rowsPerPageOptions={[5]}
          disableSelectionOnClick
          sx={{
            flex: 1,
            width: "100%",
            border: 0,
            color: "#ffffff",
            "& .MuiDataGrid-main": {
              backgroundColor: "#272727",
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#333",
              color: "#9e9e9e",
              fontSize: "0.875rem",
              fontWeight: "bold",
              borderBottom: "1px solid #444",
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#333",
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid #444",
            },
            "& .MuiDataGrid-row": {
              backgroundColor: "#272727",
              "&:hover": {
                backgroundColor: "#333",
              },
            },
            "& .MuiDataGrid-footerContainer": {
              minHeight: "64px",
              backgroundColor: "#333",
              color: "#ffffff",
              borderTop: "1px solid #444",
              "& .MuiTablePagination-root": {
                color: "#ffffff",
              },
            },
            "& .MuiDataGrid-virtualScroller": {
              overflow: "auto",
              "&::-webkit-scrollbar": {
                width: "8px",
                height: "8px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#666",
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "#444",
              },
            },
            "& .MuiDataGrid-scrollbarFiller": {
              backgroundColor: "#333",
            },
          }}
        />
      </Paper>
      <TaskDetailsDialog
        open={open}
        onClose={handleClose}
        tasks={selectedTeamTasks}
        teamName={selectedTeam}
      />

      <AddSessionDialog
        open={addSessionDialogOpen}
        onClose={handleAddSessionDialogClose}
        onSave={handleSaveSession}
        teamName={selectedTeamForSession}
      />

      <ViewSessionsDialog
        open={viewSessionsDialogOpen}
        onClose={handleViewSessionsDialogClose}
        sessions={selectedTeamSessions}
        onEditSession={handleEditSession}
        onDeleteSession={handleDeleteSession}
      />

      <ReportAbsenceDialog
        open={reportAbsenceDialogOpen}
        onClose={() => setReportAbsenceDialogOpen(false)}
        onSave={handleReportAbsence}
        teamName={selectedTeamForAbsence}
      />
    </Box>
  );
};

export default TeamViolationTracker;