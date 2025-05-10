import { useEffect, useMemo, useState } from "react";
import { Box, Stack } from "@mui/material";
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

  // Dialog states
  const [addSessionDialogOpen, setAddSessionDialogOpen] = useState(false);
  const [viewSessionsDialogOpen, setViewSessionsDialogOpen] = useState(false);
  const [reportAbsenceDialogOpen, setReportAbsenceDialogOpen] = useState(false);
  const [violationDialogOpen, setViolationDialogOpen] = useState(false);
  const [selectedTeamSessions, setSelectedTeamSessions] = useState([]);
  const [selectedTeamForSession, setSelectedTeamForSession] = useState(null);
  const [selectedTeamForAbsence, setSelectedTeamForAbsence] = useState(null);

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
    const exportData = rows.map(row => {
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
        'Last Completed Session': row.mostRecentCompletedSession,
        'Last Missed/Canceled Session': row.mostRecentMissedCanceledSession,
        'Completed Sessions': completedSessions.length > 0 ? completedSessions.join('\n\n') : 'None',
        'Missed/Canceled Sessions': missedCanceledSessions.length > 0 ? missedCanceledSessions.join('\n\n') : 'None',
        'Detractor Violations (1-6)': row.detractorCount,
        'Neutral Violations (7-8)': row.neutralCount,
        'Total Violations': row.totalViolations,

        'Low Priority Tickets': row.lowPriorityCount,
        'Medium Priority Tickets': row.mediumPriorityCount,
        'High Priority Tickets': row.highPriorityCount,

        'Date Reached Violation Limit': row.dateReachedLimit || 'N/A',
        'How Threshold Was Reached': row.thresholdDescription,
        'Consequence Applied': row.consequenceApplied,
        'Notes/Comments': row.notes,
        'Team Status': row.validationStatus,
        'Evaluated': row.isEvaluated ? 'Yes' : 'No',
        'Evaluation Score': row.evaluationScore || 'N/A',
        'Violation Status': row.equivalentDetractorCount >= 3 ? 'Violated' :
          row.equivalentDetractorCount === 2 ? 'Warning' : 'OK',
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

        lowPriorityCount: teamViolations.lowPriority,
        mediumPriorityCount: teamViolations.mediumPriority,
        highPriorityCount: teamViolations.highPriority,

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
      if (b.totalViolations !== a.totalViolations) {
        return b.totalViolations - a.totalViolations;
      }
      return b.equivalentDetractorCount - a.equivalentDetractorCount;
    });
  }, [violationData, fieldTeams]);

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
    <Box sx={{ marginBottom: "20px" }}>
      <Stack direction="column" spacing={2}>
        <SearchAndExport
          searchText={searchText}
          setSearchText={setSearchText}
          exportToExcel={exportToExcel}
          onViolationInfoClick={handleViolationDialogOpen}
        />

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