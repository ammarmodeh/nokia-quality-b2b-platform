import { useEffect, useMemo, useRef, useState } from "react";
import { Autocomplete, Box, Button, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import { toast } from "sonner";
import api from "../../api/api";
import AppDialog from "../../components/ui/AppDialog";
import { FreeAutocomplete, Pair, Row, SelectField, SmallLabel } from "../../components/ui/SettingsForm";
import { field } from "../../components/ui/formField";
import { errMsg, fieldErrors, maintenanceApi, monthLabel, newRequestKey, useDropdowns } from "./maintenanceApi";

const toInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const EMPTY = { slid: "", ticketNumber: "", customerName: "", contactNumber: "", governorate: "", district: "", team: "", surveySample: "", evaluationScore: "", customerFeedback: "", interviewDate: "", faultDate: "", dueDate: "", faultType: "", priority: "Medium", status: "Todo", assignedTo: [], rca: [], notes: "" };
const EMPTY_RCA = { reason: "", subReason: "", rootCause: "", responsible: "", teamAccountability: "Not specified" };

const SectionTitle = ({ children }) => <Typography sx={{ fontSize: 13, fontWeight: 600, color: "var(--text)", mt: 2, "&:first-of-type": { mt: 0.5 } }}>{children}</Typography>;

/**
 * Create or edit a maintenance task. Same field conventions as Add Task (SLID required, RCA rows,
 * dropdowns from Dropdown Management), stored in maintenance_tasks.
 */
const MaintenanceTaskForm = ({ open, task, teams, defaultTeam, onClose, onSaved, onOpenExisting }) => {
  const opt = useDropdowns();
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [conflict, setConflict] = useState(null); // { existingId, taskNumber }
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [samples, setSamples] = useState([]);
  const requestKey = useRef(null);

  useEffect(() => {
    if (!open) return;
    requestKey.current = newRequestKey(); // stays the same for every retry of this submission
    setV(
      task
        ? { ...EMPTY, ...task, team: task.team?._id || task.team || "", surveySample: task.surveySample?._id || task.surveySample || "", evaluationScore: task.evaluationScore ?? "", interviewDate: toInput(task.interviewDate), faultDate: toInput(task.faultDate), dueDate: toInput(task.dueDate), assignedTo: task.assignedTo || [], rca: task.rca || [] }
        : { ...EMPTY, team: defaultTeam || "" }
    );
    setErrors({});
    setError(null);
    setConflict(null);
  }, [open, task, defaultTeam]);

  useEffect(() => {
    if (!open || users.length) return;
    api.get("/users/get-all-users").then(({ data }) => setUsers((data || []).filter((u) => u.isActive !== false).map(({ _id, name, email }) => ({ _id, name, email })))).catch(() => {});
  }, [open, users.length]);

  // Survey sample entries of the chosen team, to link the task to its survey month.
  useEffect(() => {
    if (!open || !v.team) {
      setSamples([]);
      return;
    }
    maintenanceApi.samples.list({ team: v.team }).then(setSamples).catch(() => setSamples([]));
  }, [open, v.team]);

  const set = (k) => (val) => setV((s) => ({ ...s, [k]: val?.target ? val.target.value : val }));
  const setRca = (i, k, val) => setV((s) => ({ ...s, rca: s.rca.map((r, j) => (j === i ? { ...r, [k]: val } : r)) }));
  const teamOptions = useMemo(() => teams.filter((t) => t.status === "Active" || t._id === v.team).map((t) => ({ value: t._id, label: t.teamCode ? `${t.teamName} · ${t.teamCode}` : t.teamName })), [teams, v.team]);
  const optValues = (k) => opt(k).map((o) => o.value);

  const submit = async (allowDuplicateSlid = false) => {
    const errs = {};
    if (!v.slid.trim()) errs.slid = "SLID is required";
    if (!v.team) errs.team = "Choose a maintenance team";
    if (v.dueDate && v.faultDate && v.dueDate < v.faultDate) errs.dueDate = "Due date is before the fault date";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setError(null);
    setConflict(null);
    const body = { ...v, assignedTo: v.assignedTo.map((u) => u._id || u), evaluationScore: v.evaluationScore === "" ? null : Number(v.evaluationScore), requestKey: requestKey.current, allowDuplicateSlid };
    try {
      const saved = task ? await maintenanceApi.tasks.update(task._id, body) : await maintenanceApi.tasks.create(body);
      toast.success(task ? "Task updated" : saved.duplicate ? `${saved.taskNumber} was already created` : `${saved.taskNumber} created`);
      onSaved?.(saved);
    } catch (e) {
      const d = e?.response?.data;
      if (d?.code === "OPEN_TASK_EXISTS") setConflict({ existingId: d.existingId, taskNumber: d.taskNumber });
      setErrors(fieldErrors(e));
      setError(errMsg(e, "Couldn't save the task"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      size="lg"
      title={task ? `Edit ${task.taskNumber}` : "Create maintenance task"}
      description="SLID and team are required. Everything else can be filled in later."
      onSubmit={() => submit(false)}
      primary={{ label: task ? "Save changes" : "Create task", loading: saving, type: "submit" }}
      error={error}
      extraActions={
        conflict && (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="text" onClick={() => onOpenExisting?.(conflict.existingId)}>Open {conflict.taskNumber}</Button>
            <Button variant="text" color="warning" onClick={() => submit(true)} disabled={saving}>Create anyway</Button>
          </Box>
        )
      }
    >
      <SectionTitle>Customer</SectionTitle>
      <Row label="SLID" required hint="Service line ID of the customer.">
        <TextField {...field} value={v.slid} onChange={set("slid")} error={!!errors.slid} helperText={errors.slid} placeholder="e.g. INT0419303" autoFocus={!task} slotProps={{ htmlInput: { "aria-label": "SLID" } }} />
      </Row>
      <Row label="Fault ticket & customer" hint="Trouble-ticket number and customer name.">
        <Pair>
          <TextField {...field} value={v.ticketNumber} onChange={set("ticketNumber")} placeholder="Fault ticket number" slotProps={{ htmlInput: { "aria-label": "Fault ticket number" } }} />
          <TextField {...field} value={v.customerName} onChange={set("customerName")} placeholder="Customer name" slotProps={{ htmlInput: { "aria-label": "Customer name" } }} />
        </Pair>
      </Row>
      <Row label="Contact number">
        <TextField {...field} value={v.contactNumber} onChange={set("contactNumber")} slotProps={{ htmlInput: { "aria-label": "Contact number", inputMode: "tel" } }} />
      </Row>
      <Row label="Location" hint="Governorate and district.">
        <Pair>
          <SelectField value={v.governorate} onChange={set("governorate")} options={[{ value: "", label: "Not set" }, ...opt("GOVERNORATES")]} ariaLabel="Governorate" placeholder="Governorate" />
          <TextField {...field} value={v.district} onChange={set("district")} placeholder="District" slotProps={{ htmlInput: { "aria-label": "District" } }} />
        </Pair>
      </Row>

      <SectionTitle>Team & survey</SectionTitle>
      <Row label="Maintenance team" required>
        <SelectField value={v.team} onChange={(val) => setV((s) => ({ ...s, team: val, surveySample: "" }))} options={[{ value: "", label: "Choose a team" }, ...teamOptions]} ariaLabel="Maintenance team" placeholder="Choose a team" />
        {errors.team && <Typography sx={{ fontSize: 12, color: "var(--danger)", mt: 0.5 }}>{errors.team}</Typography>}
      </Row>
      <Row label="Survey sample month" hint={v.team ? (samples.length ? "Link the task to the team's survey month." : "No sample entries for this team yet.") : "Choose a team first."}>
        <SelectField value={v.surveySample} onChange={set("surveySample")} options={[{ value: "", label: "Not linked" }, ...samples.map((s) => ({ value: s._id, label: `${monthLabel(s.year, s.month)} · ${s.sampleSize} samples` }))]} ariaLabel="Survey sample month" placeholder="Not linked" />
        {errors.surveySample && <Typography sx={{ fontSize: 12, color: "var(--danger)", mt: 0.5 }}>{errors.surveySample}</Typography>}
      </Row>
      <Row label="Satisfaction score" hint="1–6 detractor · 7–8 neutral · 9–10 promoter.">
        <Pair>
          <SelectField value={v.evaluationScore} onChange={set("evaluationScore")} options={[{ value: "", label: "Not specified" }, ...Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))]} ariaLabel="Satisfaction score" />
          <TextField {...field} type="date" value={v.interviewDate} onChange={set("interviewDate")} slotProps={{ htmlInput: { "aria-label": "Interview date" } }} />
        </Pair>
      </Row>
      <Row label="Customer feedback" align="start">
        <TextField {...field} multiline minRows={2} value={v.customerFeedback} onChange={set("customerFeedback")} inputProps={{ dir: "auto", "aria-label": "Customer feedback" }} />
      </Row>

      <SectionTitle>Fault & schedule</SectionTitle>
      <Row label="Fault type">
        <FreeAutocomplete options={[...new Set([...optValues("MAINTENANCE_FAULT_TYPE"), "No service", "Slow speed", "Intermittent connection", "Fiber cut", "ONT fault", "Wi-Fi coverage", "Relocation"])]} value={v.faultType} onChange={set("faultType")} ariaLabel="Fault type" />
      </Row>
      <Row label="Fault & due dates" hint="When the fault was reported, and when it must be fixed.">
        <Pair>
          <TextField {...field} type="date" value={v.faultDate} onChange={set("faultDate")} slotProps={{ htmlInput: { "aria-label": "Fault date" } }} />
          <TextField {...field} type="date" value={v.dueDate} onChange={set("dueDate")} error={!!errors.dueDate} helperText={errors.dueDate} slotProps={{ htmlInput: { "aria-label": "Due date" } }} />
        </Pair>
      </Row>
      <Row label={task ? "Priority & status" : "Priority"} hint={task ? "Status normally changes by recording tickets." : undefined}>
        <Pair>
          <SelectField value={v.priority} onChange={set("priority")} options={["High", "Medium", "Low"].map((p) => ({ value: p, label: p }))} ariaLabel="Priority" />
          {task && <SelectField value={v.status} onChange={set("status")} options={["Todo", "In Progress", "Closed"].map((p) => ({ value: p, label: p }))} ariaLabel="Status" />}
        </Pair>
      </Row>
      <Row label="Assigned to">
        <Autocomplete
          multiple
          size="small"
          options={users}
          value={v.assignedTo.map((a) => users.find((u) => u._id === (a._id || a)) || a).filter((a) => a && typeof a === "object")}
          onChange={(_e, val) => set("assignedTo")(val)}
          getOptionLabel={(o) => o.name || o.email || ""}
          isOptionEqualToValue={(o, val) => o._id === val._id}
          renderInput={(p) => <TextField {...p} hiddenLabel placeholder={v.assignedTo.length ? "" : "Choose people"} inputProps={{ ...p.inputProps, "aria-label": "Assigned to" }} />}
          slotProps={{ chip: { size: "small" } }}
        />
      </Row>

      <SectionTitle>Root cause</SectionTitle>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, py: 1.5 }}>
        {v.rca.map((r, i) => (
          <Box key={i} sx={{ p: 1.5, borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--surface-subtle)" }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Cause {i + 1}</Typography>
              <Tooltip title="Remove this cause">
                <IconButton size="small" aria-label={`Remove cause ${i + 1}`} onClick={() => setV((s) => ({ ...s, rca: s.rca.filter((_, j) => j !== i) }))}><DeleteOutline sx={{ fontSize: 17 }} /></IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(5, 1fr)" }, gap: 1 }}>
              <Box><SmallLabel>Main reason</SmallLabel><FreeAutocomplete options={optValues("REASON")} value={r.reason} onChange={(val) => setRca(i, "reason", val || "")} ariaLabel="Main reason" /></Box>
              <Box><SmallLabel>Sub reason</SmallLabel><FreeAutocomplete options={optValues("REASON_SUB")} value={r.subReason} onChange={(val) => setRca(i, "subReason", val || "")} ariaLabel="Sub reason" /></Box>
              <Box><SmallLabel>Root cause</SmallLabel><FreeAutocomplete options={optValues("ROOT_CAUSE")} value={r.rootCause} onChange={(val) => setRca(i, "rootCause", val || "")} ariaLabel="Root cause" /></Box>
              <Box><SmallLabel>Owner</SmallLabel><FreeAutocomplete options={optValues("RESPONSIBILITY")} value={r.responsible} onChange={(val) => setRca(i, "responsible", val || "")} ariaLabel="Owner" /></Box>
              <Box><SmallLabel>Team accountable</SmallLabel><SelectField value={r.teamAccountability || "Not specified"} onChange={(val) => setRca(i, "teamAccountability", val)} options={["Not specified", "Yes", "No"].map((x) => ({ value: x, label: x }))} ariaLabel="Team accountable" /></Box>
            </Box>
          </Box>
        ))}
        <Button variant="outlined" size="small" startIcon={<AddIcon />} sx={{ alignSelf: "flex-start" }} onClick={() => setV((s) => ({ ...s, rca: [...s.rca, { ...EMPTY_RCA }] }))}>
          {v.rca.length ? "Add another cause" : "Add a cause"}
        </Button>
      </Box>

      <Row label="Notes" align="start">
        <TextField {...field} multiline minRows={2} value={v.notes} onChange={set("notes")} inputProps={{ dir: "auto", "aria-label": "Notes" }} />
      </Row>
    </AppDialog>
  );
};

export default MaintenanceTaskForm;
