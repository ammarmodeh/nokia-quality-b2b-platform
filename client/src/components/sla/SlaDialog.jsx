import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import Close from "@mui/icons-material/Close";
import AccessTimeOutlined from "@mui/icons-material/AccessTimeOutlined";
import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import CalculateOutlined from "@mui/icons-material/CalculateOutlined";
import Badge from "../ui/Badge";
import { slaApi } from "../../api/slaApi";
import { toast } from "sonner";

const SLA_HOURS_OPTIONS = [
  { label: "12 Hours", value: 12 },
  { label: "24 Hours (1 Day)", value: 24 },
  { label: "48 Hours (2 Days)", value: 48 },
  { label: "72 Hours (3 Days)", value: 72 },
  { label: "96 Hours (4 Days)", value: 96 },
  { label: "120 Hours (5 Days)", value: 120 },
];

const RESCHEDULE_REASONS = [
  "Customer requested reschedule / later appointment",
  "Customer not available / premises closed",
  "Customer requested callback later",
  "Customer delayed building / access permit",
  "Customer requested technical inspection change",
  "Other customer reason",
];

const calculateDifference = (startStr, endStr) => {
  if (!startStr || !endStr) return { diffHours: "", diffText: "" };
  const s = new Date(startStr).getTime();
  const e = new Date(endStr).getTime();
  if (isNaN(s) || isNaN(e) || e < s) return { diffHours: "0", diffText: "0h 0m" };
  const diffMs = e - s;
  const diffHours = +((diffMs) / 3600000).toFixed(1);
  const totalMins = Math.floor(diffMs / 60000);
  const d = Math.floor(totalMins / (24 * 60));
  const h = Math.floor((totalMins % (24 * 60)) / 60);
  const m = totalMins % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return { diffHours: String(diffHours), diffText: parts.join(" ") };
};

/**
 * Manual SLA Window for DVOC, OJO, Closure Call, Custom Tables.
 * Allows entering:
 * - Ticket creation date to the team
 * - Response date
 * - Live SLA difference (with manual override of hours)
 * - Flag: Team didn't respond at all
 * - Closed by field
 * - Customer Reschedule / Exemption option
 * - Calendar integration
 */
const SlaDialog = ({ open, onClose, target, title, slid, onUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [sla, setSla] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Manual SLA fields
  const [ticketCreationDate, setTicketCreationDate] = useState("");
  const [responseDate, setResponseDate] = useState("");
  const [noResponse, setNoResponse] = useState(false);
  const [slaHours, setSlaHours] = useState(24);
  const [slaDifferenceHours, setSlaDifferenceHours] = useState("");
  const [slaDifferenceText, setSlaDifferenceText] = useState("");
  const [closedBy, setClosedBy] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [addToCalendar, setAddToCalendar] = useState(true);
  const [isCustomerRequested, setIsCustomerRequested] = useState(false);
  const [note, setNote] = useState("");

  // Customer Reschedule modal state
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState(RESCHEDULE_REASONS[0]);
  const [rescheduleNote, setRescheduleNote] = useState("");

  const loadSla = async () => {
    if (!target?.kind || !target?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await slaApi.forTarget(target.kind, target.id);
      setSla(data);

      const nowIso = format(new Date(), "yyyy-MM-dd'T'HH:mm");
      if (data) {
        setTicketCreationDate(
          data.ticketCreationDate
            ? format(new Date(data.ticketCreationDate), "yyyy-MM-dd'T'HH:mm")
            : data.startDate
            ? format(new Date(data.startDate), "yyyy-MM-dd'T'HH:mm")
            : nowIso
        );
        setResponseDate(data.responseDate ? format(new Date(data.responseDate), "yyyy-MM-dd'T'HH:mm") : "");
        setNoResponse(Boolean(data.noResponse));
        setSlaHours(data.slaHours || 24);
        setSlaDifferenceHours(
          data.slaDifferenceHours !== null && data.slaDifferenceHours !== undefined
            ? String(data.slaDifferenceHours)
            : ""
        );
        setSlaDifferenceText(data.slaDifferenceText || "");
        setClosedBy(data.closedBy || "");
        setPriority(data.priority || "Medium");
        setIsCustomerRequested(Boolean(data.teamExempt));
        setNote(data.resolutionNote || "");
      } else {
        setTicketCreationDate(nowIso);
        setResponseDate("");
        setNoResponse(false);
        setSlaHours(24);
        setSlaDifferenceHours("");
        setSlaDifferenceText("");
        setClosedBy("");
        setPriority("Medium");
        setIsCustomerRequested(false);
        setNote("");
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load SLA details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadSla();
      setRescheduleOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.kind, target?.id]);

  // Recalculate difference when dates change
  const handleCreationDateChange = (val) => {
    setTicketCreationDate(val);
    if (responseDate && !noResponse) {
      const { diffHours, diffText } = calculateDifference(val, responseDate);
      setSlaDifferenceHours(diffHours);
      setSlaDifferenceText(diffText);
    }
  };

  const handleResponseDateChange = (val) => {
    setResponseDate(val);
    if (ticketCreationDate && !noResponse) {
      const { diffHours, diffText } = calculateDifference(ticketCreationDate, val);
      setSlaDifferenceHours(diffHours);
      setSlaDifferenceText(diffText);
    }
  };

  const handleNoResponseToggle = (checked) => {
    setNoResponse(checked);
    if (checked) {
      setResponseDate("");
      setSlaDifferenceHours("");
      setSlaDifferenceText("No response from team");
    } else {
      setSlaDifferenceText("");
    }
  };

  const handleSaveSla = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const startMs = ticketCreationDate ? new Date(ticketCreationDate).getTime() : Date.now();
      const targetDeadline = new Date(startMs + Number(slaHours || 24) * 3600 * 1000).toISOString();

      await slaApi.apply({
        target,
        ticketCreationDate: ticketCreationDate ? new Date(ticketCreationDate).toISOString() : new Date().toISOString(),
        responseDate: !noResponse && responseDate ? new Date(responseDate).toISOString() : null,
        noResponse,
        slaHours: Number(slaHours) || 24,
        targetDate: targetDeadline,
        slaDifferenceHours: slaDifferenceHours !== "" ? Number(slaDifferenceHours) : null,
        slaDifferenceText,
        closedBy,
        priority,
        addToCalendar,
        isCustomerRequested,
        note,
      });

      toast.success("SLA calculated and saved successfully");
      await loadSla();
      onUpdated?.();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save SLA");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) return setError("Select a new rescheduled target date & time");
    setSubmitting(true);
    setError(null);
    try {
      await slaApi.renew(sla._id, {
        newTargetDate: new Date(rescheduleDate).toISOString(),
        reason: rescheduleReason,
        isCustomerRequested: true,
        note: rescheduleNote,
      });

      toast.success("SLA renewed (Customer reschedule — Team exempt)");
      setRescheduleOpen(false);
      await loadSla();
      onUpdated?.();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to renew SLA");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (d) => (d ? format(new Date(d), "d MMM yyyy, HH:mm") : "—");

  // Determine computed status preview
  let previewTone = "info";
  let previewLabel = "Active / In Progress";
  if (noResponse) {
    if (isCustomerRequested) {
      previewTone = "success";
      previewLabel = "Team Exempt (Customer Rescheduled)";
    } else {
      previewTone = "danger";
      previewLabel = "No Response From Team (Breached)";
    }
  } else if (slaDifferenceHours !== "" && !isNaN(Number(slaDifferenceHours))) {
    const diff = Number(slaDifferenceHours);
    const allowed = Number(slaHours) || 24;
    if (diff <= allowed || isCustomerRequested) {
      previewTone = "success";
      previewLabel = `SLA Met On-Time (${diff}h / ${allowed}h allowed)`;
    } else {
      previewTone = "danger";
      previewLabel = `SLA Breached (${diff}h > ${allowed}h allowed)`;
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" slotProps={{ paper: { sx: { borderRadius: "12px" } } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AccessTimeOutlined sx={{ color: "var(--accent)", fontSize: 22 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 600 }}>Manual SLA & Performance Management</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        {title && (
          <Box sx={{ mb: 2, p: 1.5, borderRadius: "8px", backgroundColor: "var(--surface-active)" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }} dir="auto">{title}</Typography>
            <Box sx={{ display: "flex", gap: 1.5, mt: 0.5, flexWrap: "wrap", fontSize: 12, color: "var(--text-secondary)" }}>
              {slid && <span>SLID: <strong>{slid}</strong></span>}
              {target?.kind && <span>Tracker: <strong>{target.kind.toUpperCase()}</strong></span>}
              {sla?.teamName && <span>Team: <strong>{sla.teamName}</strong></span>}
              {sla?.teamCode && <span>Code: <strong>{sla.teamCode}</strong></span>}
            </Box>
          </Box>
        )}

        {error && (
          <Box sx={{ mb: 2, p: 1.25, borderRadius: "6px", backgroundColor: "var(--danger-subtle)", color: "var(--danger)", fontSize: 13, display: "flex", gap: 1, alignItems: "center" }}>
            <ErrorOutline sx={{ fontSize: 18 }} />
            {error}
          </Box>
        )}

        {/* Live Calculation Preview Banner */}
        <Box sx={{ mb: 2.5, p: 1.5, borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CalculateOutlined sx={{ fontSize: 20, color: "var(--accent)" }} />
            <Box>
              <Typography sx={{ fontSize: 11.5, color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>
                SLA Compliance Evaluation
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                {previewLabel}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {slaDifferenceHours !== "" && (
              <Badge tone={previewTone} sx={{ fontSize: 12, py: 0.5 }}>
                {slaDifferenceHours} hrs {slaDifferenceText ? `(${slaDifferenceText})` : ""}
              </Badge>
            )}
            <Badge tone={previewTone} dot>
              {previewTone === "success" ? "Compliant" : previewTone === "danger" ? "Non-Compliant" : "Pending"}
            </Badge>
          </Box>
        </Box>

        {/* Manual Input Fields Grid */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 2 }}>
          {/* 1. Ticket Creation Date to the Team */}
          <TextField
            type="datetime-local"
            size="small"
            label="Ticket Creation Date to Team"
            value={ticketCreationDate}
            onChange={(e) => handleCreationDateChange(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            helperText="When the ticket was assigned/sent to field team"
          />

          {/* 2. Response Date */}
          <TextField
            type="datetime-local"
            size="small"
            label="Team Response Date"
            value={responseDate}
            disabled={noResponse}
            onChange={(e) => handleResponseDateChange(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            helperText={noResponse ? "Disabled (Team did not respond)" : "When team responded / visited"}
          />

          {/* 3. SLA Difference (Hours) - Auto-calculated with manual fine-tuning */}
          <TextField
            type="number"
            size="small"
            label="SLA Difference (Hours)"
            value={slaDifferenceHours}
            disabled={noResponse}
            onChange={(e) => setSlaDifferenceHours(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 0.1 } }}
            helperText="Auto-computed difference; you can also override manually"
          />

          {/* 4. Target SLA Allowance */}
          <TextField
            select
            size="small"
            label="Target SLA Allowance"
            value={slaHours}
            onChange={(e) => setSlaHours(Number(e.target.value))}
            helperText="Allowed resolution window"
          >
            {SLA_HOURS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>

          {/* 5. Closed By Field */}
          <TextField
            size="small"
            label="Closed By (Supervisor / Agent)"
            placeholder="e.g. Ahmad / Quality Supervisor"
            value={closedBy}
            onChange={(e) => setClosedBy(e.target.value)}
            helperText="Person who confirmed ticket closure"
          />

          {/* 6. Priority */}
          <TextField
            select
            size="small"
            label="Priority Level"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <MenuItem value="Critical">Critical</MenuItem>
            <MenuItem value="High">High</MenuItem>
            <MenuItem value="Medium">Medium</MenuItem>
            <MenuItem value="Low">Low</MenuItem>
          </TextField>
        </Box>

        {/* Checkbox Options */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, p: 1.5, borderRadius: "8px", backgroundColor: "var(--surface-subtle)", border: "1px solid var(--border)", mb: 2 }}>
          {/* Team didn't respond at all */}
          <FormControlLabel
            control={
              <Checkbox
                checked={noResponse}
                color="error"
                onChange={(e) => handleNoResponseToggle(e.target.checked)}
              />
            }
            label={
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: noResponse ? "var(--danger)" : "inherit" }}>
                Team didn't respond at all (No Response Flag)
              </Typography>
            }
          />

          {/* Customer Requested Reschedule / Exemption */}
          <FormControlLabel
            control={
              <Checkbox
                checked={isCustomerRequested}
                color="success"
                onChange={(e) => setIsCustomerRequested(e.target.checked)}
              />
            }
            label={
              <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                Customer requested reschedule (Exempt team from responsibility / no breach penalty)
              </Typography>
            }
          />

          {/* Calendar Sync */}
          <FormControlLabel
            control={
              <Checkbox
                checked={addToCalendar}
                onChange={(e) => setAddToCalendar(e.target.checked)}
              />
            }
            label={
              <Typography sx={{ fontSize: 13 }}>
                Sync SLA deadline with Global Calendar
              </Typography>
            }
          />
        </Box>

        {/* Resolution or Instructions Note */}
        <TextField
          fullWidth
          size="small"
          multiline
          rows={2}
          label="Resolution Note / Instructions"
          placeholder="Details on response, root causes, or customer communication…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          sx={{ mb: 2 }}
        />

        {/* Existing Renewals & Customer Reschedule History */}
        {sla?.renewals?.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)", mb: 1, display: "flex", alignItems: "center", gap: 0.5 }}>
              <HistoryOutlined sx={{ fontSize: 16 }} /> Reschedule & Renewal History ({sla.renewals.length})
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {sla.renewals.map((ren, idx) => (
                <Box key={idx} sx={{ p: 1.25, borderRadius: "6px", border: "1px solid var(--border)", fontSize: 12.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <strong>{ren.reason}</strong>
                    {ren.isCustomerRequested && <Badge tone="success">Customer Fault / Team Exempt</Badge>}
                  </Box>
                  <Box sx={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    Extended to {fmt(ren.newTargetDate)}
                    {ren.renewedBy?.name && ` by ${ren.renewedBy.name}`}
                  </Box>
                  {ren.note && <Typography sx={{ fontSize: 12, mt: 0.5, fontStyle: "italic" }}>"{ren.note}"</Typography>}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Customer Reschedule Quick Button & Panel */}
        {sla && !rescheduleOpen && (
          <Box sx={{ mt: 1.5 }}>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={() => {
                setRescheduleOpen(true);
                setRescheduleDate(format(new Date(Date.now() + 48 * 3600 * 1000), "yyyy-MM-dd'T'HH:mm"));
              }}
            >
              Add Customer Reschedule / Renew SLA
            </Button>
          </Box>
        )}

        {rescheduleOpen && (
          <Box sx={{ mt: 2, p: 2, borderRadius: "10px", border: "1px solid var(--accent)", backgroundColor: "var(--surface-active)" }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>Reschedule SLA (Customer Request)</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <TextField select size="small" label="Reschedule Reason" value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)}>
                {RESCHEDULE_REASONS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>

              <TextField
                type="datetime-local"
                size="small"
                label="New Target Date & Time"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <TextField
                size="small"
                multiline
                rows={2}
                placeholder="Reschedule notes…"
                value={rescheduleNote}
                onChange={(e) => setRescheduleNote(e.target.value)}
              />

              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <Button variant="outlined" size="small" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
                <Button variant="contained" size="small" loading={submitting} onClick={handleReschedule}>Confirm Reschedule</Button>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button variant="outlined" onClick={onClose}>Close</Button>
        <Button variant="contained" loading={submitting} onClick={handleSaveSla}>
          Save SLA Record
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SlaDialog;
