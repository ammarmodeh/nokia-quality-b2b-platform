import { useState } from "react";
import { format } from "date-fns";
import { Autocomplete, Box, MenuItem, TextField } from "@mui/material";
import AppDialog from "../ui/AppDialog";
import { calendarEntriesApi } from "../../api/qops";

export const ENTRY_TYPES = ["Visit", "Follow-up", "Callback", "Re-visit", "Audit", "Installation", "Maintenance", "Meeting"];
export const ENTRY_STATUS = [
  { value: "planned", label: "Planned" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

/**
 * Put a ticket on the calendar, or edit an entry. `target` = { kind: "row" | "issue" | "task", id, tableId? }.
 * The calendar shows tickets only through these entries, never from a table's date columns.
 */
const CalendarEntryDialog = ({ open, onClose, target, entry = null, defaultDate, title, onSaved }) => {
  const [date, setDate] = useState(entry ? format(new Date(entry.date), "yyyy-MM-dd") : defaultDate ? format(new Date(defaultDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState(entry?.time || "");
  const [type, setType] = useState(entry?.type || "Visit");
  const [note, setNote] = useState(entry?.note || "");
  const [status, setStatus] = useState(entry?.status || "planned");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    if (!date) return setError("Choose a date");
    setBusy(true);
    setError(null);
    // a calendar day, stored at UTC midnight so it shows on the same day everywhere
    const [y, m, d] = date.split("-").map(Number);
    const body = { date: new Date(Date.UTC(y, m - 1, d)).toISOString(), time, type, note, status };
    try {
      const saved = entry ? await calendarEntriesApi.update(entry._id, body) : await calendarEntriesApi.create({ target, ...body });
      onSaved?.(saved);
    } catch (e) {
      setError(e?.response?.data?.message || "Couldn't save the calendar entry");
      setBusy(false);
    }
  };

  return (
    <AppDialog open={open} onClose={onClose} size="sm" title={entry ? "Edit calendar entry" : "Put on calendar"} description={title} error={error} onSubmit={save}
      primary={{ label: entry ? "Save changes" : "Add to calendar", loading: busy }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField autoFocus required type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="time" label="Time (optional)" value={time} onChange={(e) => setTime(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <Autocomplete freeSolo options={ENTRY_TYPES} value={type} onInputChange={(_e, v) => setType(v)} renderInput={(p) => <TextField {...p} label="Type" />} />
        <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          {ENTRY_STATUS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
        </TextField>
        <TextField label="Note" multiline minRows={2} value={note} onChange={(e) => setNote(e.target.value)} inputProps={{ dir: "auto" }} sx={{ gridColumn: "1 / -1" }} placeholder="What has to happen, who to call…" />
      </Box>
    </AppDialog>
  );
};

export default CalendarEntryDialog;
