import AddSessionDialog from "./AddSessionDialog";
import ReportAbsenceDialog from "./ResportAbsenseDialog";
import { TaskDetailsDialog } from "./TaskDetailsDialog";
import ViewSessionsDialog from "./ViewSessionsDialog";
import ViolationEvaluationDialog from "./ViolationEvaluationDialog";


const SessionDialogs = ({
  open,
  onClose,
  selectedTeamTasks,
  selectedTeam,
  addSessionDialogOpen,
  onAddSessionDialogClose,
  onSaveSession,
  selectedTeamForSession,
  viewSessionsDialogOpen,
  onViewSessionsDialogClose,
  selectedTeamSessions,
  onEditSession,
  onDeleteSession,
  reportAbsenceDialogOpen,
  onReportAbsenceClose,
  onReportAbsence,
  selectedTeamForAbsence,
  violationDialogOpen,
  onViolationDialogClose,
  onTaskUpdated,
}) => {
  return (
    <>
      <TaskDetailsDialog
        open={open}
        onClose={onClose}
        tasks={selectedTeamTasks}
        teamName={selectedTeam}
        onTaskUpdated={onTaskUpdated}
      />

      <AddSessionDialog
        open={addSessionDialogOpen}
        onClose={onAddSessionDialogClose}
        onSave={onSaveSession}
        teamName={selectedTeamForSession}
      />

      <ViewSessionsDialog
        open={viewSessionsDialogOpen}
        onClose={onViewSessionsDialogClose}
        sessions={selectedTeamSessions}
        onEditSession={onEditSession}
        onDeleteSession={onDeleteSession}
        teamName={selectedTeam || selectedTeamForSession}
      />

      <ReportAbsenceDialog
        open={reportAbsenceDialogOpen}
        onClose={onReportAbsenceClose}
        onSave={onReportAbsence}
        teamName={selectedTeamForAbsence}
      />

      <ViolationEvaluationDialog
        open={violationDialogOpen}
        onClose={onViolationDialogClose}
      />
    </>
  );
};

export default SessionDialogs;