import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Box, Button, Typography } from "@mui/material";
import { toast } from "sonner";
import { format } from "date-fns";
import Sheet from "../../components/ui/Sheet";
import Badge from "../../components/ui/Badge";
import ErrorState from "../../components/ui/ErrorState";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import SegmentedControl from "../../components/ui/SegmentedControl";
import TicketPanel from "./TicketPanel";
import { PRIORITY_TONE, STATUS_TONE, errMsg, maintenanceApi, monthLabel } from "./maintenanceApi";

const fmt = (d) => (d ? format(new Date(d), "d MMM yyyy") : null);
const Detail = ({ label, children }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 1, py: 0.75, fontSize: 13, borderBottom: "1px solid var(--border)" }}>
    <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{label}</Typography>
    <Box sx={{ color: "var(--text)", minWidth: 0, wordBreak: "break-word" }}>{children || "—"}</Box>
  </Box>
);

/** Maintenance task details, its processing log and audit history. */
const MaintenanceTaskSheet = ({ taskId, onClose, onEdit, onChanged, initialTab = "details" }) => {
  const isAdmin = useSelector((s) => s?.auth?.user?.role) === "Admin";
  const [task, setTask] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(initialTab);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!taskId) return;
    maintenanceApi.tasks.get(taskId).then((t) => { setTask(t); setError(null); }).catch((e) => setError(errMsg(e, "Couldn't load the task")));
  }, [taskId]);
  useEffect(() => {
    setTask(null);
    setTab(initialTab);
    load();
  }, [load, initialTab]);

  const changed = () => {
    load();
    onChanged?.();
  };

  return (
    <Sheet
      open={Boolean(taskId)}
      onClose={onClose}
      width={620}
      title={task ? `${task.taskNumber} · ${task.slid}` : "Maintenance task"}
      description={task ? [task.customerName, task.team?.teamName].filter(Boolean).join(" · ") : undefined}
      actions={
        task && (
          <Box sx={{ display: "flex", gap: 1 }}>
            {isAdmin && <Button variant="text" color="error" onClick={() => setDeleting(true)}>Delete</Button>}
            <Button variant="outlined" onClick={() => onEdit(task)}>Edit</Button>
          </Box>
        )
      }
    >
      {error && <ErrorState message={error} onRetry={load} />}
      {task && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Badge tone={STATUS_TONE[task.status]} dot>{task.status}</Badge>
            <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
            {task.dueDate && task.status !== "Closed" && new Date(task.dueDate) < new Date() && <Badge tone="danger">Overdue</Badge>}
            <Box sx={{ flex: 1 }} />
            <SegmentedControl size="sm" ariaLabel="Task view" value={tab} onChange={setTab} options={[{ value: "details", label: "Details" }, { value: "processing", label: `Processing${task.ticketCount ? ` · ${task.ticketCount}` : ""}` }, { value: "history", label: "History" }]} />
          </Box>

          {tab === "details" && (
            <Box>
              <Detail label="SLID">{task.slid}</Detail>
              <Detail label="Fault ticket">{task.ticketNumber}</Detail>
              <Detail label="Customer">{[task.customerName, task.contactNumber].filter(Boolean).join(" · ")}</Detail>
              <Detail label="Location">{[task.governorate, task.district].filter(Boolean).join(" · ")}</Detail>
              <Detail label="Team">{task.team ? `${task.team.teamName}${task.team.status === "Inactive" ? " (inactive)" : ""}` : null}</Detail>
              <Detail label="Survey month">{task.surveySample ? `${monthLabel(task.surveySample.year, task.surveySample.month)} · ${task.surveySample.sampleSize} samples` : null}</Detail>
              <Detail label="Score">{task.evaluationScore ?? null}</Detail>
              <Detail label="Interview">{fmt(task.interviewDate)}</Detail>
              <Detail label="Fault type">{task.faultType}</Detail>
              <Detail label="Fault / due">{[fmt(task.faultDate), fmt(task.dueDate)].map((x) => x || "—").join(" → ")}</Detail>
              <Detail label="Assigned">{(task.assignedTo || []).map((u) => u.name).join(", ")}</Detail>
              {task.customerFeedback && <Detail label="Feedback"><span dir="auto" style={{ whiteSpace: "pre-wrap" }}>{task.customerFeedback}</span></Detail>}
              {task.rca?.length > 0 && (
                <Detail label="Root cause">
                  {task.rca.map((r, i) => (
                    <Box key={i} sx={{ fontSize: 12.5, py: 0.25 }}>
                      {[r.reason, r.subReason, r.rootCause].filter(Boolean).join(" › ") || "—"}{r.responsible ? ` · owner ${r.responsible}` : ""} · accountable {r.teamAccountability}
                    </Box>
                  ))}
                </Detail>
              )}
              {task.notes && <Detail label="Notes"><span dir="auto" style={{ whiteSpace: "pre-wrap" }}>{task.notes}</span></Detail>}
              <Detail label="Created">{`${fmt(task.createdAt)}${task.createdBy?.name ? ` by ${task.createdBy.name}` : ""}`}</Detail>
              {task.closedAt && <Detail label="Closed">{fmt(task.closedAt)}</Detail>}
            </Box>
          )}
          {tab === "processing" && <TicketPanel task={task} onChanged={changed} />}
          {tab === "history" && (
            <Box>
              {task.history?.length ? task.history.map((h) => (
                <Box key={h._id} sx={{ py: 0.75, borderBottom: "1px solid var(--border)" }}>
                  <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>{format(new Date(h.createdAt), "d MMM yyyy, HH:mm")} · {h.userName || "Someone"}</Typography>
                  <Typography sx={{ fontSize: 13 }}>{h.summary || h.action}</Typography>
                  {h.changes && Object.entries(h.changes).map(([k, c]) => (
                    <Typography key={k} sx={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {k}: {String(c.from ?? "—").slice(0, 60)} → {String(c.to ?? "—").slice(0, 60)}
                    </Typography>
                  ))}
                </Box>
              )) : <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>No changes recorded.</Typography>}
            </Box>
          )}
        </Box>
      )}
      <ConfirmDialog
        open={deleting}
        danger
        title={`Delete ${task?.taskNumber}?`}
        description={`This also deletes its ${task?.ticketCount || 0} processing step(s). The deletion is kept in the audit log.`}
        confirmLabel="Delete task"
        loading={busy}
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await maintenanceApi.tasks.remove(task._id);
            toast.success(`${task.taskNumber} deleted`);
            setDeleting(false);
            onChanged?.();
            onClose();
          } catch (e) {
            toast.error(errMsg(e, "Couldn't delete the task"));
          } finally {
            setBusy(false);
          }
        }}
      />
    </Sheet>
  );
};

export default MaintenanceTaskSheet;
