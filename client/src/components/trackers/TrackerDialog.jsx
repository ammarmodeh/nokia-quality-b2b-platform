import { useState } from "react";
import { Autocomplete, Box, Chip, TextField, Typography } from "@mui/material";
import AppDialog from "../ui/AppDialog";
import { trackersApi } from "../../api/qops";
import { reloadTrackers } from "../../hooks/useTrackers";

export const TRACKER_COLORS = ["#2563EB", "#0891B2", "#7C3AED", "#EA580C", "#DB2777", "#16A34A", "#CA8A04", "#DC2626", "#0D9488", "#475569"];

/**
 * Add a tracker (like Closure Call, DVOC, TRC) or edit one added earlier. Its records are
 * custom tables: map a SLID and a Team code field in them and every row counts towards the
 * field team in Team analysis.
 */
const TrackerDialog = ({ open, onClose, tracker = null, onSaved }) => {
  const [name, setName] = useState(tracker?.name || tracker?.label || "");
  const [description, setDescription] = useState(tracker?.description || "");
  const [color, setColor] = useState(tracker?.color || TRACKER_COLORS[0]);
  const [subs, setSubs] = useState(tracker?.subs || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    if (!name.trim()) return setError("Name the tracker");
    setBusy(true);
    setError(null);
    try {
      const body = { name: name.trim(), description, color, subs };
      const id = tracker?._id || tracker?.id;
      const saved = id ? await trackersApi.update(id, body) : await trackersApi.create(body);
      await reloadTrackers();
      window.dispatchEvent(new CustomEvent("custom-tables-changed"));
      onSaved?.(saved);
    } catch (e) {
      setError(e?.response?.data?.message || "Couldn't save the tracker");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      size="sm"
      title={tracker ? `Edit “${tracker.name || tracker.label}”` : "Add a tracker"}
      description={tracker ? undefined : "A new tracker sits next to Closure Call, DVOC and TRC, with its own tables."}
      error={error}
      onSubmit={save}
      primary={{ label: tracker ? "Save changes" : "Add tracker", loading: busy }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField autoFocus label="Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Field Inspections" inputProps={{ maxLength: 40, dir: "auto" }}
          helperText={tracker ? "Renaming moves its tables with it." : undefined} />
        <TextField label="Description" multiline minRows={2} value={description} onChange={(e) => setDescription(e.target.value)} inputProps={{ dir: "auto" }} />
        <Autocomplete
          multiple
          freeSolo
          options={[]}
          value={subs}
          onChange={(_e, v) => setSubs([...new Set(v.map((x) => String(x).trim()).filter(Boolean))])}
          renderTags={(value, getTagProps) => value.map((option, index) => { const { key, ...p } = getTagProps({ index }); return <Chip key={key} size="small" label={option} {...p} />; })}
          renderInput={(params) => <TextField {...params} label="Sub-categories (optional)" placeholder="Type one and press Enter" helperText="e.g. Installation, Maintenance. Tables are filed under one of them." />}
        />
        <Box>
          <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mb: 0.75 }}>Colour</Typography>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {TRACKER_COLORS.map((c) => (
              <Box key={c} component="button" type="button" aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => setColor(c)}
                sx={{ width: 26, height: 26, borderRadius: "50%", border: 0, cursor: "pointer", backgroundColor: c, outline: color === c ? "2px solid var(--text)" : "none", outlineOffset: 2 }} />
            ))}
          </Box>
        </Box>
        {!tracker && (
          <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", p: 1.25, borderRadius: "8px", backgroundColor: "var(--surface-subtle)", border: "1px solid var(--border)" }}>
            Tip: in its tables, set one field to feed <b>SLID</b> and one to feed <b>Team code</b> (Fields → edit field → “Feeds the app’s”). Each row is then counted for the team that held the code on the row’s date.
          </Typography>
        )}
      </Box>
    </AppDialog>
  );
};

export default TrackerDialog;
