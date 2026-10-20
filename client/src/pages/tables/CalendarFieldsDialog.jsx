import { useEffect, useMemo, useState } from "react";
import { Box, Checkbox, FormControlLabel, Radio, RadioGroup, Typography } from "@mui/material";
import EventAvailableOutlined from "@mui/icons-material/EventAvailableOutlined";
import AppDialog from "../../components/ui/AppDialog";
import Badge from "../../components/ui/Badge";
import { tablesApi } from "./tablesApi";
import { errText } from "./useTable";

// Mirrors calendarFieldsOf() in backend/utils/customFields.js
const SCHEDULE_RX = /appoint|visit|schedul|book|reserv|follow.?up|موعد|زيارة|حجز/i;
const roleOf = (f) => (f.coreMapping === "schedule" || (f.coreMapping !== "date" && SCHEDULE_RX.test(f.label)) ? "schedule" : "date");
const autoCalendarFields = (dateFields) => {
  const out = [];
  const add = (f) => f && !out.includes(f.key) && out.push(f.key);
  add(dateFields.find((f) => f.coreMapping === "schedule"));
  add(dateFields.find((f) => f.coreMapping === "date"));
  dateFields.filter((f) => SCHEDULE_RX.test(f.label)).forEach(add);
  return out;
};
const short = (label) => label.split("|")[0].trim();

/** Choose which date fields put this table's rows on the global calendar. */
const CalendarFieldsDialog = ({ open, onClose, table, onSaved }) => {
  const dateFields = useMemo(() => (table?.fields || []).filter((f) => !f.archived && ["date", "datetime"].includes(f.type)).sort((a, b) => a.order - b.order), [table]);
  const chosen = table?.settings?.calendarFields || [];
  const [mode, setMode] = useState("auto");
  const [keys, setKeys] = useState([]);
  const [show, setShow] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setMode(chosen.length ? "custom" : "auto");
    setKeys(chosen.length ? chosen : autoCalendarFields(dateFields));
    setShow(table?.settings?.showInCalendar !== false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const auto = autoCalendarFields(dateFields);
  const effective = mode === "auto" ? auto : keys;

  const save = async () => {
    if (mode === "custom" && !keys.length) return setError("Pick at least one date field, or switch to automatic.");
    setSaving(true);
    setError(null);
    try {
      const updated = await tablesApi.update(table._id, { settings: { showInCalendar: show, calendarFields: mode === "auto" ? [] : keys } });
      onSaved?.(updated);
      onClose();
    } catch (e) {
      setError(errText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      size="sm"
      icon={<EventAvailableOutlined />}
      title="Calendar dates"
      description="Rows show on the global calendar on each of these dates. Scheduling fields (appointments, visits) are marked as appointments."
      error={error}
      primary={{ label: "Save", onClick: save, loading: saving, disabled: !dateFields.length }}
    >
      {!dateFields.length ? (
        <Typography sx={{ fontSize: 13, color: "var(--text-secondary)" }}>This table has no Date or Date & time field yet. Add one (for example “Appointment date”) to show rows on the calendar.</Typography>
      ) : (
        <>
          <FormControlLabel control={<Checkbox checked={show} onChange={(e) => setShow(e.target.checked)} />} label="Show this table in the global calendar" sx={{ mb: 1 }} />
          <RadioGroup value={mode} onChange={(e) => setMode(e.target.value)}>
            <FormControlLabel value="auto" control={<Radio size="small" />} disabled={!show} label={<Box><Typography sx={{ fontSize: 13 }}>Automatic</Typography><Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>The field mapped to “Scheduled appointment / visit”, the one mapped to “Date”, and date fields named like an appointment or visit.</Typography></Box>} sx={{ alignItems: "flex-start", mb: 1, "& .MuiRadio-root": { mt: -0.5 } }} />
            <FormControlLabel value="custom" control={<Radio size="small" />} disabled={!show} label={<Typography sx={{ fontSize: 13 }}>Choose fields</Typography>} />
          </RadioGroup>
          <Box sx={{ mt: 1, border: "1px solid var(--border)", borderRadius: "8px" }}>
            {dateFields.map((f) => {
              const on = effective.includes(f.key);
              return (
                <Box key={f.key} sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, py: 0.5, borderBottom: "1px solid var(--border)", "&:last-of-type": { borderBottom: 0 } }}>
                  <Checkbox size="small" checked={on} disabled={!show || mode === "auto"} onChange={() => setKeys((k) => (k.includes(f.key) ? k.filter((x) => x !== f.key) : [...k, f.key]))} slotProps={{ input: { "aria-label": short(f.label) } }} />
                  <Typography dir="auto" noWrap sx={{ flex: 1, fontSize: 13 }}>{short(f.label)}</Typography>
                  {roleOf(f) === "schedule" ? <Badge tone="accent">Appointment</Badge> : <Badge>Date</Badge>}
                </Box>
              );
            })}
          </Box>
          {mode === "auto" && !auto.length && show && (
            <Typography sx={{ mt: 1, fontSize: 12, color: "var(--warning)" }}>No field qualifies automatically, so rows won’t show. Map a field to “Scheduled appointment / visit” or choose fields.</Typography>
          )}
        </>
      )}
    </AppDialog>
  );
};

export default CalendarFieldsDialog;
