import { useMemo, useState } from "react";
import { Box, Button, Checkbox, MenuItem, TextField, Typography } from "@mui/material";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import Badge from "../ui/Badge";

export const DUP_POLICIES = [
  { value: "update", label: "Update them with the file", hint: "Cells the file fills replace the old values. Empty cells in the file never clear anything." },
  { value: "merge", label: "Only fill their empty cells", hint: "Old values stay; the file only fills cells that are empty today." },
  { value: "skip", label: "Keep the existing rows", hint: "The file's copy is ignored. Nothing changes in those rows." },
  { value: "create", label: "Add them again as new rows", hint: "You'll have two rows with the same value." },
  { value: "custom", label: "Choose row by row", hint: "Pick an action for each duplicate below." },
];
const ROW_ACTIONS = [
  { value: "update", label: "Update" },
  { value: "merge", label: "Fill empty cells" },
  { value: "skip", label: "Keep old" },
  { value: "create", label: "Add as new" },
];
const show = (v) => {
  if (v === null || v === undefined || v === "") return "empty";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return [v.category, v.sub].filter(Boolean).join(" · ") || JSON.stringify(v);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  return String(v);
};

/** What a duplicate row will actually do, from the chosen policy and any per-row choice. */
export const actionFor = (d, policy, decisions, repeatPolicy) => {
  if (decisions[d.row]) return decisions[d.row];
  if (d.repeatOf && !d.existing) return repeatPolicy;
  return policy === "custom" || !policy ? null : policy;
};

/**
 * Duplicate review for a table import: rows whose match value already exists in the table
 * (with what an update would change), and rows that repeat a value earlier in the file.
 * Nothing is imported until a choice is made for the duplicates.
 */
const DuplicateReview = ({
  dups,
  fields,
  keyLabel,
  policy,
  onPolicy,
  decisions,
  onDecide,
  repeatPolicy,
  onRepeatPolicy,
  targetLabel,
  selectedColumns,
  onToggleColumn,
  onSelectAllColumns,
  onDeselectAllColumns,
}) => {
  const [onlyChanged, setOnlyChanged] = useState(false);
  const byKey = useMemo(() => Object.fromEntries(fields.map((f) => [f.key, f])), [fields]);
  const existing = dups.filter((d) => d.existing);
  const repeats = dups.filter((d) => d.repeatOf && !d.existing);
  const withChanges = existing.filter((d) => d.existing.changes.length);
  const list = (onlyChanged ? withChanges : existing).slice(0, 300);

  return (
    <Box sx={{ mb: 2, p: 1.5, borderRadius: "10px", border: "1px solid var(--warning)", backgroundColor: "color-mix(in srgb, var(--warning) 6%, transparent)" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <ContentCopyOutlined sx={{ fontSize: 18, color: "var(--warning)" }} />
        <Typography sx={{ fontSize: 14, fontWeight: 600, flex: 1 }}>
          {existing.length ? `${existing.length.toLocaleString()} row${existing.length === 1 ? "" : "s"} already exist${existing.length === 1 ? "s" : ""} in ${targetLabel}` : "Repeated rows in the file"}
          <Typography component="span" sx={{ fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 400 }}> · matched on {keyLabel}</Typography>
        </Typography>
      </Box>

      {existing.length > 0 && (
        <>
          <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mb: 1 }}>
            {withChanges.length.toLocaleString()} of them differ from what’s in the table; {(existing.length - withChanges.length).toLocaleString()} are identical. What should happen to them?
          </Typography>
          <Box role="radiogroup" aria-label="Duplicates" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(5, 1fr)" }, gap: 0.75, mb: 1.25 }}>
            {DUP_POLICIES.map((p) => {
              const on = policy === p.value;
              return (
                <Box key={p.value} component="button" type="button" role="radio" aria-checked={on} onClick={() => onPolicy(p.value)} title={p.hint}
                  sx={{ textAlign: "left", p: 1, borderRadius: "8px", font: "inherit", cursor: "pointer", border: "1px solid", borderColor: on ? "var(--accent)" : "var(--border)", backgroundColor: on ? "var(--accent-subtle)" : "var(--surface)", outline: on ? "1px solid var(--accent)" : "none" }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: on ? "var(--accent-text)" : "var(--text)" }}>{p.label}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: "var(--text-secondary)", mt: 0.25, lineHeight: 1.35 }}>{p.hint}</Typography>
                </Box>
              );
            })}
          </Box>
          {!policy && <Typography sx={{ fontSize: 12.5, color: "var(--warning)", fontWeight: 500, mb: 1 }}>Choose what to do with the duplicates to continue.</Typography>}

          {/* Flexible Column Selection to Replace / Update */}
          {["update", "merge", "custom"].includes(policy) && (
            <Box sx={{ mb: 1.5, p: 1.25, borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5, flexWrap: "wrap", gap: 1 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                  Select columns to replace / update in existing rows:
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button size="small" onClick={onSelectAllColumns} sx={{ fontSize: 11.5, py: 0.25, minHeight: 0 }}>
                    Select All
                  </Button>
                  <Button size="small" onClick={onDeselectAllColumns} sx={{ fontSize: 11.5, py: 0.25, minHeight: 0, color: "var(--text-secondary)" }}>
                    Clear All
                  </Button>
                </Box>
              </Box>
              <Typography sx={{ fontSize: 11.5, color: "var(--text-secondary)", mb: 1 }}>
                {selectedColumns?.length
                  ? `Only ${selectedColumns.length} selected column(s) will be updated. Unchecked columns in the table will remain untouched.`
                  : "All columns from the uploaded file will update matching records."}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", maxHeight: 110, overflow: "auto", p: 0.5 }}>
                {fields.map((f) => {
                  const isSelected = !selectedColumns || selectedColumns.includes(f.key);
                  return (
                    <Box
                      key={f.key}
                      component="button"
                      type="button"
                      onClick={() => onToggleColumn?.(f.key)}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        px: 1,
                        py: 0.35,
                        borderRadius: "6px",
                        fontSize: 12,
                        cursor: "pointer",
                        border: "1px solid",
                        borderColor: isSelected ? "var(--accent)" : "var(--border)",
                        backgroundColor: isSelected ? "var(--accent-subtle)" : "var(--surface-subtle)",
                        color: isSelected ? "var(--accent-text)" : "var(--text-muted)",
                        fontWeight: isSelected ? 600 : 400,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>{isSelected ? "✓" : "+"}</span>
                      <span>{f.label}</span>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
            <Box component="label" sx={{ display: "flex", alignItems: "center", fontSize: 12.5, color: "var(--text-secondary)", cursor: "pointer" }}>
              <Checkbox size="small" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} />Only rows that differ
            </Box>
          </Box>
          <Box sx={{ maxHeight: 260, overflow: "auto", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--surface)" }}>
            {list.map((d) => {
              const act = actionFor(d, policy, decisions, repeatPolicy);
              const changes = act === "merge" ? d.existing.changes.filter((c) => c.old === null || c.old === "" || (Array.isArray(c.old) && !c.old.length)) : d.existing.changes;
              return (
                <Box key={d.row} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "150px 1fr 150px" }, gap: 1, alignItems: "center", px: 1.25, py: 0.75, borderBottom: "1px solid var(--border)", "&:last-child": { borderBottom: 0 } }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap dir="auto" sx={{ fontSize: 12.5, fontWeight: 500 }}>{show(d.key)}</Typography>
                    <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>file row {d.row} · table #{d.existing.autoNumber}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", minWidth: 0 }}>
                    {!d.existing.changes.length && <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>Same as the table</Typography>}
                    {d.existing.changes.slice(0, 4).map((c) => {
                      const applies = act === "update" || (act === "merge" && changes.includes(c));
                      return (
                        <Box key={c.field} dir="auto" sx={{ fontSize: 11.5, px: 0.75, py: 0.25, borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: applies ? "var(--info-subtle, rgba(37,99,235,.06))" : "var(--surface-subtle)", color: applies ? "var(--text)" : "var(--text-muted)", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          title={`${byKey[c.field]?.label || c.field}: ${show(c.old)} → ${show(c.new)}`}>
                          <b>{byKey[c.field]?.label || c.field}</b>: <span style={{ textDecoration: applies ? "line-through" : "none" }}>{show(c.old)}</span> → {show(c.new)}
                        </Box>
                      );
                    })}
                    {d.existing.changes.length > 4 && <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)", alignSelf: "center" }}>+{d.existing.changes.length - 4} more</Typography>}
                  </Box>
                  <TextField select size="small" value={act || ""} onChange={(e) => onDecide(d.row, e.target.value)} SelectProps={{ displayEmpty: true }} slotProps={{ htmlInput: { "aria-label": `Action for file row ${d.row}` } }}>
                    <MenuItem value="" disabled>Choose…</MenuItem>
                    {ROW_ACTIONS.map((a) => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
                  </TextField>
                </Box>
              );
            })}
            {!list.length && <Typography sx={{ p: 1.5, fontSize: 12.5, color: "var(--text-muted)" }}>No rows differ from the table.</Typography>}
          </Box>
          {(onlyChanged ? withChanges : existing).length > list.length && <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)", mt: 0.5 }}>Showing the first {list.length}; the choice above applies to all of them.</Typography>}
        </>
      )}

      {repeats.length > 0 && (
        <Box sx={{ mt: existing.length ? 1.5 : 0, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Badge tone="warning">{repeats.length.toLocaleString()} repeat{repeats.length === 1 ? "s" : ""}</Badge>
          <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", flex: 1, minWidth: 220 }}>
            {repeats.length === 1 ? "A row repeats" : "Rows repeat"} a {keyLabel} that appears earlier in the file (e.g. row {repeats[0].row} repeats row {repeats[0].repeatOf}).
          </Typography>
          <TextField select size="small" value={repeatPolicy} onChange={(e) => onRepeatPolicy(e.target.value)} sx={{ width: 230 }} slotProps={{ htmlInput: { "aria-label": "Repeated rows" } }}>
            <MenuItem value="skip">Import only the first one</MenuItem>
            <MenuItem value="create">Import every copy</MenuItem>
          </TextField>
        </Box>
      )}
    </Box>
  );
};

export default DuplicateReview;
