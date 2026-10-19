import { useEffect, useMemo, useState } from "react";
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, TextField, Typography } from "@mui/material";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import { format } from "date-fns";
import SegmentedControl from "../ui/SegmentedControl";
import ErrorState from "../ui/ErrorState";
import { ENTITIES, ENTITY_KEYS } from "./entities";
import { downloadWorkbook } from "./parse";
import { exportSheetsFor, SPLITS } from "./exportUtils";

/**
 * Export the current view, the selection or everything; optional extra
 * entities as more sheets; choose columns, order, format and how to split.
 */
const ExportDialog = ({ open, onClose, entity, viewRows, selectedRows = [], filename }) => {
  const [scope, setScope] = useState("view");
  const [fmt, setFmt] = useState("xlsx");
  const [split, setSplit] = useState("none");
  const [extra, setExtra] = useState([]);
  const [cols, setCols] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setScope(selectedRows.length ? "selected" : viewRows ? "view" : "all");
    setError(null);
    setCols((c) => {
      const next = { ...c };
      for (const e of ENTITY_KEYS) if (!next[e]) next[e] = ENTITIES[e].fields.map((f) => ({ key: f.key, label: f.label, on: true }));
      return next;
    });
  }, [open, selectedRows.length, viewRows]);

  const sheetsIncluded = [entity, ...extra];
  const columns = cols[entity] || [];
  const move = (i, d) =>
    setCols((c) => {
      const list = [...c[entity]];
      const j = i + d;
      if (j < 0 || j >= list.length) return c;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...c, [entity]: list };
    });

  const counts = useMemo(() => ({ view: viewRows?.length ?? 0, selected: selectedRows.length }), [viewRows, selectedRows]);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const sheets = [];
      for (const e of sheetsIncluded) {
        const rows = e === entity && scope === "view" ? viewRows : e === entity && scope === "selected" ? selectedRows : await ENTITIES[e].fetch();
        sheets.push(...exportSheetsFor(e, rows || [], (cols[e] || []).filter((c) => c.on), fmt === "xlsx" ? split : "none"));
      }
      if (!sheets.length) throw new Error("Nothing to export");
      downloadWorkbook(fmt === "csv" ? sheets.slice(0, 1) : sheets, filename || ENTITIES[entity].short.toLowerCase().replace(/\s+/g, "-"), fmt);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>Export {ENTITIES[entity].label}</DialogTitle>
      <DialogContent>
        {error && <ErrorState title="Export failed" message={error} sx={{ mb: 2 }} />}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.75 }}>Rows</Typography>
              <SegmentedControl
                value={scope}
                onChange={setScope}
                options={[
                  ...(viewRows ? [{ value: "view", label: `Current view (${counts.view})` }] : []),
                  ...(selectedRows.length ? [{ value: "selected", label: `Selected (${counts.selected})` }] : []),
                  { value: "all", label: "Everything" },
                ]}
              />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.75 }}>Format</Typography>
              <SegmentedControl value={fmt} onChange={setFmt} options={[{ value: "xlsx", label: "Excel (.xlsx)" }, { value: "csv", label: "CSV" }, { value: "json", label: "JSON" }]} />
            </Box>
            <TextField select label="Split into sheets" value={split} onChange={(e) => setSplit(e.target.value)} disabled={fmt !== "xlsx"} helperText={fmt === "csv" ? "CSV exports one sheet" : " "}>
              {SPLITS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>
            <Box>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.5 }}>Add more sheets (everything in each)</Typography>
              {ENTITY_KEYS.filter((e) => e !== entity).map((e) => (
                <Box key={e} component="label" sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 13, cursor: "pointer" }}>
                  <Checkbox size="small" checked={extra.includes(e)} disabled={fmt === "csv"} onChange={(ev) => setExtra((x) => (ev.target.checked ? [...x, e] : x.filter((y) => y !== e)))} />
                  {ENTITIES[e].label}
                </Box>
              ))}
            </Box>
          </Box>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 0.75 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>Columns & order</Typography>
              <Button size="small" variant="text" onClick={() => setCols((c) => ({ ...c, [entity]: c[entity].map((x) => ({ ...x, on: !c[entity].every((y) => y.on) })) }))}>
                {columns.every((c) => c.on) ? "Clear all" : "Select all"}
              </Button>
            </Box>
            <Box sx={{ maxHeight: 360, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "8px" }}>
              {columns.map((c, i) => (
                <Box key={c.key} sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 0.5, borderBottom: "1px solid var(--border)", "&:last-of-type": { borderBottom: 0 } }}>
                  <Checkbox size="small" checked={c.on} onChange={(e) => setCols((x) => ({ ...x, [entity]: x[entity].map((y, j) => (j === i ? { ...y, on: e.target.checked } : y)) }))} inputProps={{ "aria-label": c.label }} />
                  <Typography sx={{ fontSize: 13, flex: 1, color: c.on ? "var(--text)" : "var(--text-muted)" }}>{c.label}</Typography>
                  <IconButton size="small" aria-label={`Move ${c.label} up`} onClick={() => move(i, -1)} disabled={i === 0}><ArrowUpward sx={{ fontSize: 15 }} /></IconButton>
                  <IconButton size="small" aria-label={`Move ${c.label} down`} onClick={() => move(i, 1)} disabled={i === columns.length - 1}><ArrowDownward sx={{ fontSize: 15 }} /></IconButton>
                </Box>
              ))}
            </Box>
            <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)", mt: 0.75 }}>Exports use readable labels (team names, tracker labels), bold frozen headers, filters and date formatting. File name gets {format(new Date(), "yyyy-MM-dd")}.</Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={run} disabled={busy || !columns.some((c) => c.on)}>{busy ? "Preparing…" : "Export"}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;
