import { useEffect, useMemo, useState } from "react";
import { Box, Button, IconButton, InputAdornment, Paper, Stack, TextField, Tooltip, Typography, useMediaQuery } from "@mui/material";
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
import { MdAdd, MdHistory, MdReport, MdSearch } from "react-icons/md";
import { BeachAccess, Block, CheckCircle, ExitToApp, Grade, PauseCircleOutline, Pending, Warning } from "@mui/icons-material";
import { newFormatDate } from "../utils/helpers";

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
  const [searchText, setSearchText] = useState('');
  const isMobile = useMediaQuery('(max-width:503px)');
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

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
      // const sessionHistory = team?.sessionHistory || [];
      // const trainingSessions = team?.trainingSessions || [];
      const allSessions = team?.sessionHistory || [];

      // Format session history with clear separation
      // const formattedSessions = sessionHistory.length > 0
      //   ? sessionHistory.map((session, index) =>
      //     `${index + 1}. ${new Date(session.sessionDate).toLocaleDateString()} - ${session.status}${session.notes ? ` (${session.notes})` : ''
      //     }`
      //   ).join('\n\n')  // Double line breaks for better separation
      //   : 'No sessions recorded';

      // Format training sessions
      // const formattedTrainingSessions = trainingSessions.length > 0
      //   ? trainingSessions.map((session, index) =>
      //     `${index + 1}. ${new Date(session.date).toLocaleDateString()} - ${session.type}${session.notes ? ` (${session.notes})` : ''}`
      //   ).join('\n\n')
      //   : 'No training sessions';

      // Format completed sessions
      const completedSessions = allSessions
        .filter(session => session.status === "Completed")
        .map((session, index) =>
          `${index + 1}. ${new Date(session.sessionDate).toLocaleDateString()} - ${session.sessionTitle || 'Training'}${session.notes ? ` (${session.notes})` : ''}`
        );

      // Format missed/canceled sessions
      const missedCanceledSessions = allSessions
        .filter(session => session.status === "Missed" || session.status === "Cancelled")
        .map((session, index) =>
          `${index + 1}. ${new Date(session.sessionDate).toLocaleDateString()} - ${session.status}${session.reason ? ` (Reason: ${session.reason})` : ''}`
        );

      return {
        'Team Name': row.teamName,
        'Team Company': row.teamCompany || 'N/A',
        'Trained': row.hasTraining ? 'Yes' : 'No',
        // 'Training Sessions': formattedTrainingSessions,
        'Last Completed Session': row.mostRecentCompletedSession,
        'Last Missed/Canceled Session': row.mostRecentMissedCanceledSession,
        'Completed Sessions': completedSessions.length > 0 ? completedSessions.join('\n\n') : 'None',
        'Missed/Canceled Sessions': missedCanceledSessions.length > 0 ? missedCanceledSessions.join('\n\n') : 'None',
        'Detractor Violations (1-6)': row.detractorCount,
        'Neutral Violations (7-8)': row.neutralCount,
        'Total Violations': row.totalViolations,
        // 'Equivalent Detractors': row.equivalentDetractorCount,
        'Date Reached Violation Limit': row.dateReachedLimit || 'N/A',
        'How Threshold Was Reached': row.thresholdDescription,
        'Consequence Applied': row.consequenceApplied,
        'Notes/Comments': row.notes,
        'Team Status': row.validationStatus,
        'Evaluated': row.isEvaluated ? 'Yes' : 'No',
        'Evaluation Score': row.evaluationScore || 'N/A',
        'Violation Status': row.equivalentDetractorCount >= 3 ? 'Violated' :
          row.equivalentDetractorCount === 2 ? 'Warning' : 'OK',
        // 'Most Recent Session': row.mostRecentSession,
        // 'Session History': formattedSessions,
        'Exported Date': new Date().toLocaleDateString()
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();

    // Set optimal column widths
    worksheet['!cols'] = [
      { wch: 25 },  // Team Name
      { wch: 25 },  // Team Company
      { wch: 12 },  // Has Training
      { wch: 30 },  // Training Sessions
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
        const sessionCell = XLSX.utils.encode_cell({ r: R, c: 17 }); // Session History column
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

    const rowsData = fieldTeams.map((team) => {
      const teamName = team.teamName;
      const teamViolations = violationData[teamName] || { detractor: 0, neutral: 0, violations: [] };
      const violations = teamViolations.violations;
      const sortedViolations = [...violations].sort((a, b) =>
        new Date(a.date) - new Date(b.date)
      );

      // Calculate violation counts
      const detractorCount = teamViolations.detractor;
      const neutralCount = teamViolations.neutral;
      const totalViolations = detractorCount + neutralCount; // New simple sum

      const hasTraining = team?.sessionHistory?.some(
        session => session.status === "Completed"
      );

      // Filter sessions by status
      const completedSessions = team?.sessionHistory?.filter(session => session.status === "Completed") || [];
      const missedOrCanceledSessions = team?.sessionHistory?.filter(session =>
        session.status === "Missed" || session.status === "Cancelled"
      ) || [];

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

      const totalDetractors = teamViolations.detractor;
      const totalNeutrals = teamViolations.neutral;
      const currentEquivalent = totalDetractors + Math.floor(totalNeutrals / 3);

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

      // Determine team status
      let validationStatus = "Active";
      let notes = "";
      let consequence = "";

      if (team?.isTerminated) {
        validationStatus = "Terminated";
        notes = `Terminated. Reason: ${team.terminationReason || "N/A"}`;
      } else if (team?.isSuspended) {
        validationStatus = "Suspended";
        notes = `Suspended until ${team.suspensionEndDate || "N/A"}. Reason: ${team.suspensionReason || "N/A"}`;
      } else if (team?.isResigned) {
        validationStatus = "Resigned";
        notes = `Resigned. Reason: ${team.resignationReason || "N/A"}`;
      } else if (team?.isOnLeave) {
        validationStatus = "On Leave";
        notes = "Team is currently on leave";
      } else {
        // Only check violations if the team is ACTIVE (not suspended, terminated, resigned, or on leave)
        validationStatus = "Active";

        // Determine consequences based on violations
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

      // Get most recent completed session
      const mostRecentCompletedSession = completedSessions.length > 0
        ? new Date(
          Math.max(
            ...completedSessions
              .map((session) => new Date(session.sessionDate))
              .filter((date) => !isNaN(date))
          )
        )
        : null;

      // Get most recent missed/canceled session
      const mostRecentMissedCanceledSession = missedOrCanceledSessions.length > 0
        ? new Date(
          Math.max(
            ...missedOrCanceledSessions
              .map((session) => new Date(session.sessionDate))
              .filter((date) => !isNaN(date))
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
        totalViolations, // Add the new simple sum
        equivalentDetractorCount: currentEquivalent,
        // totalViolations: violations.length,
        dateReachedLimit: dateReachedLimit
          ? new Date(dateReachedLimit).toLocaleDateString()
          : currentEquivalent >= 3 ? "Threshold not recorded" : null,
        thresholdDescription,
        consequenceApplied: consequence,
        notes,
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
      // Sort by total violations (descending), then by equivalent detractors (descending)
      if (b.totalViolations !== a.totalViolations) {
        return b.totalViolations - a.totalViolations;
      }
      return b.equivalentDetractorCount - a.equivalentDetractorCount;
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
          disableRipple
          disableTouchRipple
          disableFocusRipple
          sx={{
            color: '#3ea6ff',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: 'rgba(62, 166, 255, 0.1)'
            }
          }}
        >
          {params.value}
        </Button>
      ),
    },
    {
      field: "teamCompany",
      headerName: "Group",
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          {params.value}
        </Typography>
      )
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
          {params.value}
        </Box>
      )
    },
    {
      field: "totalViolations",
      headerName: "Total Violations",
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          color: params.value > 0 ? '#f44336' : '#aaaaaa',
          backgroundColor: '#383838',
          // borderRadius: '4px',
          padding: '4px 8px'
        }}>
          {params.value}
        </Box>
      )
    },
    // {
    //   field: "equivalentDetractorCount",
    //   headerName: "Eq. Detractors",
    //   width: 120,
    //   align: 'center',
    //   headerAlign: 'center',
    //   renderCell: (params) => (
    //     <Box sx={{
    //       display: 'flex',
    //       alignItems: 'center',
    //       justifyContent: 'center',
    //       fontWeight: params.value >= 3 ? 'bold' : 'normal',
    //       color: params.value >= 3 ? '#f44336' :
    //         params.value === 2 ? '#ff9800' : '#4caf50'
    //     }}>
    //       {/* <Assessment fontSize="small" sx={{ mr: 0.5 }} /> */}
    //       {params.value}
    //     </Box>
    //   )
    // },
    {
      field: "dateReachedLimit",
      headerName: "Limit Date",
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        if (!params.value) {
          return (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#aaaaaa',
              fontStyle: 'italic'
            }}>
              --
            </Box>
          );
        }

        // Check if the date is valid
        const date = new Date(params.value);
        const isValidDate = !isNaN(date.getTime());

        return (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isValidDate ? '#f44336' : '#aaaaaa',
            fontWeight: isValidDate ? 'bold' : 'normal'
          }}>
            {isValidDate ? newFormatDate(params.value) : 'Invalid date'}
          </Box>
        );
      }
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
              params.value === 'Resigned' ? '#9c27b0' : // Purple for resigned
                params.value === 'On Leave' ? '#2196f3' : // Blue for on leave
                  params.value === 'Active' ? '#4caf50' : '#ff9800',
          fontSize: '0.8rem',
        }}>
          {
            params.value === 'Suspended' ? <PauseCircleOutline sx={{ mr: 0.5, fontSize: '1.1rem' }} /> :
              params.value === 'Terminated' ? <Block sx={{ mr: 0.5, fontSize: '1.1rem' }} /> :
                params.value === 'Resigned' ? <ExitToApp sx={{ mr: 0.5, fontSize: '1.1rem' }} /> : // Icon for resigned
                  params.value === 'On Leave' ? <BeachAccess sx={{ mr: 0.5, fontSize: '1.1rem' }} /> : // Icon for on leave
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
      field: "hasTraining",
      headerName: "Trained",
      width: 100,
      align: 'center',
      headerAlign: 'center',
      type: "boolean",
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: params.value ? '#4caf50' : '#f44336'
        }}>
          {params.value ? 'Yes' : 'No'}
        </Box>
      )
    },
    {
      field: "mostRecentCompletedSession",
      headerName: "Last Completed",
      width: 140,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontStyle: params.value === "No completed sessions" ? "italic" : "normal",
          color: params.value === "No completed sessions" ? '#aaaaaa' : '#4caf50',
          fontSize: '0.8rem'
        }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: "mostRecentMissedCanceledSession",
      headerName: "Last Missed/Canceled",
      width: 160,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontStyle: params.value === "No missed/canceled sessions" ? "italic" : "normal",
          color: params.value === "No missed/canceled sessions" ? '#aaaaaa' :
            params.value.includes("Missed") ? '#f44336' : '#ff9800',
          fontSize: '0.8rem'
        }}>
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

  // Filter rows based on search text
  const filteredRows = useMemo(() => {
    if (!searchText) return rows;

    const searchLower = searchText.toLowerCase();

    return rows.filter(row => {
      return Object.keys(row).some(key => {
        const value = row[key];
        if (value === null || value === undefined) return false;

        // Handle different data types
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

  useEffect(() => {
    if (viewSessionsDialogOpen && selectedTeamIdForSession) {
      const team = fieldTeams.find(t => t._id === selectedTeamIdForSession);
      if (team) {
        setSelectedTeamSessions(team.sessionHistory || []);
      }
    }
  }, [fieldTeams, viewSessionsDialogOpen, selectedTeamIdForSession]);

  return (
    <Box sx={{ marginBottom: "20px" }} >
      <Stack
        direction={"column"}
        justifyContent="space-between"
        // alignItems={isMobile ? "flex-start" : "center"}
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
            color: "#c2c2c2",
            fontSize: isMobile ? "0.9rem" : "1rem",
          }}
        >
          Team Violation Tracker
        </Typography>

        <Stack direction="row" gap={2} alignItems="center" justifyContent={'space-between'} sx={{ width: "100%" }}>
          <TextField
            variant="outlined"
            size="small"

            placeholder="Search teams, violations, status..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{
              backgroundColor: '#333',
              borderRadius: '4px',
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#444',
                },
                '&:hover fieldset': {
                  borderColor: '#555',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#3ea6ff',
                },
              },
              '& .MuiInputBase-input': {
                color: '#fff',
                fontSize: '0.875rem',
                padding: '8.5px 14px',
              },
              // minWidth: isMobile ? '100%' : '300px',
              flexGrow: 1
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MdSearch style={{ color: '#9e9e9e' }} />
                </InputAdornment>
              ),
            }}
          />

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
      </Stack>

      <Paper sx={{ height: 400, width: "100%", backgroundColor: "#272727" }}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          pageSizeOptions={[5, 10, 25]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
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