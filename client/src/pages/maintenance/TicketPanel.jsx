import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Box, Button, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import EditOutlined from "@mui/icons-material/EditOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import { toast } from "sonner";
import { format } from "date-fns";
import Badge from "../../components/ui/Badge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import ErrorState from "../../components/ui/ErrorState";
import AsyncButton from "../../components/ui/AsyncButton";
import { FreeAutocomplete, Pair, SelectField, SmallLabel } from "../../components/ui/SettingsForm";
import { field } from "../../components/ui/formField";
import { STATUS_TONE, errMsg, fieldErrors, maintenanceApi, newRequestKey, useDropdowns } from "./maintenanceApi";

// The maintenance processing flow follows the Q-Ops transaction log: INIT → CONTACT → REFLECT → VISIT → RESOLVE.
const FLOW = ["INIT", "CONTACT", "REFLECT", "VISIT", "RESOLVE"];
const FALLBACK_TYPES = [
  { value: "INIT", label: "Ticket initiated" },
  { value: "CONTACT", label: "Customer contacted" },
  { value: "REFLECT", label: "Reflected to team" },
  { value: "VISIT", label: "Site visit" },
  { value: "RESOLVE", label: "Resolved" },
];
const PRESETS = [
  { label: "No answer", type: "CONTACT", state: "NO_ANSWER", status: "In Progress", note: "Called customer; no answer." },
  { label: "Visit scheduled", type: "CONTACT", state: "APPT_SET", status: "In Progress", note: "Customer contacted; visit scheduled." },
  { label: "Reflected to team", type: "REFLECT", state: "APPT_SET", status: "In Progress", note: "Task reflected to the maintenance team for a visit." },
  { label: "Visit: resolved", type: "VISIT", state: "ISSUE_RESOLVED", status: "Closed", note: "Team visited; fault fixed." },
  { label: "Resolved by phone", type: "CONTACT", state: "SOLVED_REMOTE", status: "Closed", note: "Fault solved remotely by phone." },
];
const today = () => format(new Date(), "yyyy-MM-dd"); // local day, not UTC
const nextType = (tickets) => {
  const last = tickets[tickets.length - 1]?.transactionType;
  if (!last) return "INIT";
  const i = FLOW.indexOf(last);
  return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : "CONTACT";
};
const blank = (tickets, status) => ({ transactionType: nextType(tickets), transactionState: "", unfReasonCode: "", gaiaTicket: "", status: status === "Todo" ? "In Progress" : status || "In Progress", eventDate: today(), followUpDate: "", note: "" });

/**
 * Processing log for one maintenance task plus the form to record the next step.
 * Recording a step sets the task status (server side, in one transaction).
 */
const TicketPanel = ({ task, onChanged }) => {
  const me = useSelector((s) => s?.auth?.user);
  const isAdmin = me?.role === "Admin";
  const opt = useDropdowns();
  const [tickets, setTickets] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [v, setV] = useState(() => blank([], task?.status));
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const requestKey = useRef(newRequestKey());

  const load = useCallback(() => {
    if (!task?._id) return;
    maintenanceApi.tickets
      .list(task._id)
      .then((t) => {
        setTickets(t);
        setLoadError(null);
      })
      .catch((e) => setLoadError(errMsg(e, "Couldn't load the processing log")));
  }, [task?._id]);
  useEffect(load, [load]);
  useEffect(() => {
    if (tickets && !editing) setV(blank(tickets, task?.status));
  }, [tickets, task?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const types = useMemo(() => (opt("TRANSACTION_TYPE").length ? opt("TRANSACTION_TYPE") : FALLBACK_TYPES), [opt]);
  const set = (k) => (val) => setV((s) => ({ ...s, [k]: val?.target ? val.target.value : val }));

  const save = async () => {
    const errs = {};
    if (!v.transactionType) errs.transactionType = "Choose a transaction type";
    if (v.eventDate && v.eventDate > today()) errs.eventDate = "Can't be in the future";
    if (v.followUpDate && v.eventDate && v.followUpDate < v.eventDate) errs.followUpDate = "Before the event date";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setError(null);
    try {
      if (editing) {
        await maintenanceApi.tickets.update(editing._id, v);
        toast.success(`${editing.ticketId} updated`);
      } else {
        const t = await maintenanceApi.tickets.record(task._id, { ...v, requestKey: requestKey.current });
        toast.success(t.duplicate ? "That step was already recorded" : `${t.ticketId} recorded`);
      }
      requestKey.current = newRequestKey(); // next submission is a new step
      setEditing(null);
      load();
      onChanged?.();
    } catch (e) {
      setErrors(fieldErrors(e));
      setError(errMsg(e, "Couldn't save the step"));
    }
  };

  const startEdit = (t) => {
    setEditing(t);
    setErrors({});
    setError(null);
    setV({ transactionType: t.transactionType, transactionState: t.transactionState || "", unfReasonCode: t.unfReasonCode || "", gaiaTicket: t.gaiaTicket || "", status: t.status, eventDate: t.eventDate ? t.eventDate.slice(0, 10) : "", followUpDate: t.followUpDate ? t.followUpDate.slice(0, 10) : "", note: t.note || "" });
  };

  if (loadError) return <ErrorState message={loadError} onRetry={load} />;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>Processing log{tickets?.length ? ` · ${tickets.length}` : ""}</Typography>
        {!tickets ? (
          <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>Loading…</Typography>
        ) : !tickets.length ? (
          <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>No steps recorded yet. Record the first one below.</Typography>
        ) : (
          <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, position: "relative", "&::before": { content: '""', position: "absolute", left: 5, top: 8, bottom: 8, width: "1px", backgroundColor: "var(--border)" } }}>
            {tickets.map((t) => (
              <Box component="li" key={t._id} sx={{ position: "relative", pl: 3, pb: 1.5 }}>
                <Box sx={{ position: "absolute", left: 0, top: 5, width: 11, height: 11, borderRadius: "50%", border: "2px solid var(--surface)", backgroundColor: t.status === "Closed" ? "var(--success)" : "var(--accent)" }} />
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{t.transactionType}{t.transactionState ? ` · ${t.transactionState}` : ""}</Typography>
                  <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                  <Typography sx={{ fontSize: 11.5, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{t.ticketId}</Typography>
                  <Box sx={{ flex: 1 }} />
                  {(isAdmin || t.recordedBy?._id === me?._id) && (
                    <Tooltip title="Edit step"><IconButton size="small" aria-label={`Edit ${t.ticketId}`} onClick={() => startEdit(t)}><EditOutlined sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                  )}
                  {isAdmin && <Tooltip title="Delete step"><IconButton size="small" aria-label={`Delete ${t.ticketId}`} onClick={() => setDeleting(t)}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton></Tooltip>}
                </Box>
                <Typography sx={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {t.eventDate ? format(new Date(t.eventDate), "d MMM yyyy") : "No date"} · {t.agentName || t.recordedBy?.name || "—"}
                  {t.unfReasonCode ? ` · reason ${t.unfReasonCode}` : ""}{t.gaiaTicket ? ` · GAIA ${t.gaiaTicket}` : ""}{t.followUpDate ? ` · follow-up ${format(new Date(t.followUpDate), "d MMM")}` : ""}
                  {t.editedAt ? ` · edited by ${t.editedBy?.name || "someone"}` : ""}
                </Typography>
                {t.note && <Typography dir="auto" sx={{ fontSize: 12.5, mt: 0.25, whiteSpace: "pre-wrap" }}>{t.note}</Typography>}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Box component="form" onSubmit={(e) => e.preventDefault()} sx={{ p: 1.75, borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--surface-subtle)" }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{editing ? `Edit ${editing.ticketId}` : "Record next step"}</Typography>
          {editing && <Button size="small" variant="text" onClick={() => { setEditing(null); setV(blank(tickets || [], task?.status)); }}>Cancel edit</Button>}
        </Box>
        {!editing && (
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1.25 }}>
            {PRESETS.map((p) => (
              <Button key={p.label} size="small" variant="outlined" sx={{ height: 26, fontSize: 12 }} onClick={() => setV((s) => ({ ...s, transactionType: p.type, transactionState: p.state, status: p.status, note: p.note }))}>
                {p.label}
              </Button>
            ))}
          </Box>
        )}
        {error && <ErrorState message={error} sx={{ mb: 1.25 }} />}
        <Box sx={{ display: "grid", gap: 1.25 }}>
          <Pair>
            <Box>
              <SmallLabel>Transaction type *</SmallLabel>
              <SelectField value={v.transactionType} onChange={set("transactionType")} options={types} ariaLabel="Transaction type" />
              {errors.transactionType && <Typography sx={{ fontSize: 12, color: "var(--danger)", mt: 0.5 }}>{errors.transactionType}</Typography>}
            </Box>
            <Box><SmallLabel>State</SmallLabel><FreeAutocomplete options={opt("TRANSACTION_STATE").map((o) => o.value)} value={v.transactionState} onChange={set("transactionState")} ariaLabel="Transaction state" /></Box>
          </Pair>
          <Pair>
            <Box><SmallLabel>Reason code</SmallLabel><FreeAutocomplete options={opt("UNF_REASON_CODE").map((o) => o.value)} value={v.unfReasonCode} onChange={set("unfReasonCode")} ariaLabel="Reason code" /></Box>
            <Box><SmallLabel>GAIA / external ticket</SmallLabel><TextField {...field} value={v.gaiaTicket} onChange={set("gaiaTicket")} slotProps={{ htmlInput: { "aria-label": "GAIA ticket" } }} /></Box>
          </Pair>
          <Pair>
            <Box><SmallLabel>Event date</SmallLabel><TextField {...field} type="date" value={v.eventDate} onChange={set("eventDate")} error={!!errors.eventDate} helperText={errors.eventDate} slotProps={{ htmlInput: { "aria-label": "Event date", max: today() } }} /></Box>
            <Box><SmallLabel>Follow-up / visit date</SmallLabel><TextField {...field} type="date" value={v.followUpDate} onChange={set("followUpDate")} error={!!errors.followUpDate} helperText={errors.followUpDate} slotProps={{ htmlInput: { "aria-label": "Follow-up date" } }} /></Box>
          </Pair>
          <Box>
            <SmallLabel>Task status after this step *</SmallLabel>
            <SelectField value={v.status} onChange={set("status")} options={["Todo", "In Progress", "Closed"].map((s) => ({ value: s, label: s }))} ariaLabel="Task status after this step" />
          </Box>
          <Box><SmallLabel>Note</SmallLabel><TextField {...field} multiline minRows={2} value={v.note} onChange={set("note")} inputProps={{ dir: "auto", "aria-label": "Note" }} /></Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <AsyncButton variant="contained" onClick={save} pendingLabel="Saving…">{editing ? "Save step" : "Record step"}</AsyncButton>
          </Box>
        </Box>
      </Box>

      <ConfirmDialog
        open={Boolean(deleting)}
        danger
        title={`Delete ${deleting?.ticketId}?`}
        description="The task's status goes back to what the previous step set."
        confirmLabel="Delete step"
        loading={busy}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await maintenanceApi.tickets.remove(deleting._id);
            toast.success("Step deleted");
            setDeleting(null);
            load();
            onChanged?.();
          } catch (e) {
            toast.error(errMsg(e, "Couldn't delete the step"));
          } finally {
            setBusy(false);
          }
        }}
      />
    </Box>
  );
};

export default TicketPanel;
