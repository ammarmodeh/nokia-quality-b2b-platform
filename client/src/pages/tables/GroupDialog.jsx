import { useState } from "react";
import { Box, TextField, Typography } from "@mui/material";
import AppDialog from "../../components/ui/AppDialog";
import SegmentedControl from "../../components/ui/SegmentedControl";
import { FilterButton } from "./ViewControls";
import { CHOICE_COLORS } from "./fieldTypes";

export const GROUP_COLORS = ["violet", "blue", "green", "amber", "pink", "teal", "red", "gray"];
export const groupColor = (name) => CHOICE_COLORS[name] || CHOICE_COLORS.gray;

/**
 * Create or edit a row group ("a table inside the table").
 * Members are picked rows; a rule (filters) also pulls in every row that matches it.
 */
const GroupDialog = ({ open, onClose, group = null, fields, lookups, selectedCount = 0, currentFilters = [], onSave }) => {
  const [name, setName] = useState(group?.name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [color, setColor] = useState(group?.color || "violet");
  const [mode, setMode] = useState(group ? (group.filters?.length ? "rule" : "manual") : selectedCount ? "selected" : currentFilters.length ? "rule" : "manual");
  const [filters, setFilters] = useState(group?.filters?.length ? group.filters : currentFilters);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const modes = group
    ? [{ value: "manual", label: "Picked rows only" }, { value: "rule", label: "Picked rows + a rule" }]
    : [
        ...(selectedCount ? [{ value: "selected", label: `The ${selectedCount} selected row${selectedCount === 1 ? "" : "s"}` }] : []),
        { value: "rule", label: "Rows matching a rule" },
        { value: "manual", label: "Start empty" },
      ];

  const save = async () => {
    if (!name.trim()) return setError("Name the group");
    if (mode === "rule" && !filters.length) return setError("Add at least one filter for the rule, or pick rows instead");
    setBusy(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), description, color, filters: mode === "rule" ? filters : [], withSelection: mode === "selected" });
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Couldn't save the group");
      setBusy(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      size="sm"
      title={group ? `Edit “${group.name}”` : "New group"}
      description={group ? undefined : "A group is its own tab in this table, with its own rows, filters, analysis and export. Rows aren't copied: they stay in the table."}
      error={error}
      onSubmit={save}
      primary={{ label: group ? "Save changes" : "Create group", loading: busy }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField autoFocus required label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mid. Quality Audit Aug.26" inputProps={{ dir: "auto", maxLength: 80 }} />
        <TextField label="Description" multiline minRows={2} value={description} onChange={(e) => setDescription(e.target.value)} inputProps={{ dir: "auto" }} />
        <Box>
          <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mb: 0.75 }}>Colour</Typography>
          <Box sx={{ display: "flex", gap: 0.75 }}>
            {GROUP_COLORS.map((c) => (
              <Box key={c} component="button" type="button" aria-label={c} aria-pressed={color === c} onClick={() => setColor(c)}
                sx={{ width: 22, height: 22, borderRadius: "50%", border: 0, cursor: "pointer", backgroundColor: groupColor(c), outline: color === c ? "2px solid var(--text)" : "none", outlineOffset: 2 }} />
            ))}
          </Box>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mb: 0.75 }}>Which rows</Typography>
          <SegmentedControl value={mode} onChange={setMode} options={modes} size="sm" ariaLabel="Which rows" />
          {mode === "rule" && (
            <Box sx={{ mt: 1.25, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <FilterButton fields={fields} filters={filters} onChange={setFilters} lookups={lookups} />
              <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                {filters.length ? "Rows that match now and later join automatically." : "Add the conditions rows must match."}
              </Typography>
            </Box>
          )}
          {mode === "manual" && !group && <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mt: 1 }}>Select rows in the table later and choose “Add to group”.</Typography>}
          {group && <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mt: 1 }}>Rows you added by hand stay in the group either way.</Typography>}
        </Box>
      </Box>
    </AppDialog>
  );
};

export default GroupDialog;
