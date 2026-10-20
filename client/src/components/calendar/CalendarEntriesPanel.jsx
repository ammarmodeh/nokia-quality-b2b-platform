import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import EventAvailableOutlined from "@mui/icons-material/EventAvailableOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import Close from "@mui/icons-material/Close";
import Badge from "../ui/Badge";
import ConfirmDialog from "../ui/ConfirmDialog";
import CalendarEntryDialog from "./CalendarEntryDialog";
import { calendarEntriesApi } from "../../api/qops";

const TONE = { planned: "accent", done: "success", cancelled: undefined };

/**
 * The calendar entries of one ticket, with "Put on calendar". Used in table rows,
 * snags / complaints and DVOC tasks. target = { kind, id, tableId? }
 */
const CalendarEntriesPanel = ({ target, title, canEdit = true, sx }) => {
  const [entries, setEntries] = useState(null);
  const [editing, setEditing] = useState(null); // {} new | entry
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    if (!target?.id) return;
    calendarEntriesApi.forTarget(target.id).then(setEntries).catch(() => setEntries([]));
  }, [target?.id]);
  useEffect(() => { setEntries(null); load(); }, [load]);

  const markDone = async (e) => {
    try {
      const saved = await calendarEntriesApi.update(e._id, { status: e.status === "done" ? "planned" : "done" });
      setEntries((l) => l.map((x) => (x._id === saved._id ? { ...x, ...saved } : x)));
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't update the entry");
    }
  };

  return (
    <Box sx={{ p: 1.5, borderRadius: "10px", border: "1px solid var(--border)", ...sx }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: entries?.length ? 1 : 0 }}>
        <EventAvailableOutlined sx={{ fontSize: 18, color: "var(--text-muted)" }} />
        <Typography sx={{ fontSize: 13, flex: 1 }}>
          {entries === null ? "Calendar…" : entries.length ? `On the calendar ${entries.length === 1 ? "once" : `${entries.length} times`}` : "Not on the calendar"}
        </Typography>
        {canEdit && <Button size="small" variant="outlined" onClick={() => setEditing({})}>Put on calendar</Button>}
      </Box>
      {error && <Typography sx={{ fontSize: 12.5, color: "var(--danger)", mb: 0.5 }}>{error}</Typography>}
      {entries?.map((e) => (
        <Box key={e._id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.75, borderTop: "1px solid var(--border)" }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
              <Typography sx={{ fontSize: 13, fontWeight: 500, textDecoration: e.status === "cancelled" ? "line-through" : "none" }}>{format(new Date(e.date), "EEE d MMM yyyy")}{e.time ? ` · ${e.time}` : ""}</Typography>
              <Badge tone={TONE[e.status]}>{e.type}</Badge>
              {e.status !== "planned" && <Badge tone={TONE[e.status]}>{e.status}</Badge>}
            </Box>
            {e.note && <Typography dir="auto" sx={{ fontSize: 12.5, color: "var(--text-secondary)", mt: 0.25 }}>{e.note}</Typography>}
          </Box>
          {canEdit && (
            <>
              <Tooltip title={e.status === "done" ? "Mark as planned" : "Mark as done"}><IconButton size="small" aria-label="Toggle done" onClick={() => markDone(e)}><CheckCircleOutline sx={{ fontSize: 17, color: e.status === "done" ? "var(--success)" : "var(--text-muted)" }} /></IconButton></Tooltip>
              <Tooltip title="Edit"><IconButton size="small" aria-label="Edit calendar entry" onClick={() => setEditing(e)}><EditOutlined sx={{ fontSize: 16 }} /></IconButton></Tooltip>
              <Tooltip title="Remove from calendar"><IconButton size="small" aria-label="Remove from calendar" onClick={() => setRemoving(e)}><Close sx={{ fontSize: 16 }} /></IconButton></Tooltip>
            </>
          )}
        </Box>
      ))}
      {entries?.length > 0 && <Button size="small" component={RouterLink} to={`/calendar?date=${format(new Date(entries[0].date), "yyyy-MM-dd")}`} sx={{ mt: 0.5 }}>Open the calendar</Button>}

      {editing && (
        <CalendarEntryDialog open target={target} entry={editing._id ? editing : null} title={title}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
      <ConfirmDialog open={Boolean(removing)} title="Remove from the calendar?" confirmLabel="Remove" danger
        description={removing ? `The ${removing.type.toLowerCase()} on ${format(new Date(removing.date), "d MMM yyyy")} leaves the calendar. The ticket itself isn't changed.` : ""}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          try { await calendarEntriesApi.remove(removing._id); setEntries((l) => l.filter((x) => x._id !== removing._id)); }
          catch (err) { setError(err?.response?.data?.message || "Couldn't remove the entry"); }
          setRemoving(null);
        }} />
    </Box>
  );
};

export default CalendarEntriesPanel;
