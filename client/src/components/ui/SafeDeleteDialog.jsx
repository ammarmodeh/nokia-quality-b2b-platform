import { useEffect, useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import DeleteForeverOutlined from "@mui/icons-material/DeleteForeverOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import CheckCircle from "@mui/icons-material/CheckCircle";
import { toast } from "sonner";
import AppDialog from "./AppDialog";
import ErrorState from "./ErrorState";
import { exportRows } from "../../utils/exportRows";

export const DELETE_PHRASE = "permanent delete";
const SHOW_NAMES = 50;

const Step = ({ n, done, title, children }) => (
  <Box sx={{ display: "flex", gap: 1.25, mt: 2 }}>
    <Box sx={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 11.5, fontWeight: 600, backgroundColor: done ? "var(--success)" : "var(--surface-active)", color: done ? "#fff" : "var(--text-secondary)" }}>
      {done ? <CheckCircle sx={{ fontSize: 16 }} /> : n}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "var(--text)", mb: 0.75 }}>{title}</Typography>
      {children}
    </Box>
  </Box>
);

/**
 * Permanent delete with a backup first, for one record or many.
 *
 * 1. Lists the records and their count, and says it can't be undone.
 * 2. The user exports every selected record to .xlsx (all `exportColumns`, one file).
 *    If the export throws, the delete stays locked.
 * 3. The user types "permanent delete"; only then the delete button turns on.
 * 4. `onDelete(records)` must resolve after the server confirmed, with
 *    { deleted: [ids], failed: [{ id, message }] } (or throw). Success is shown only
 *    for what the server deleted; failures stay listed and the data is kept.
 *
 * noun: { one: "task", many: "tasks" } · nameOf(record) → label · idOf(record) → id
 */
const SafeDeleteDialog = ({ open, onClose, records = [], noun = { one: "record", many: "records" }, nameOf = (r) => r?.name || r?._id, idOf = (r) => r?._id, exportColumns, exportFilename = "deleted-records", onDelete, onDeleted }) => {
  const [exported, setExported] = useState(null); // filename
  const [exportError, setExportError] = useState(null);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [failed, setFailed] = useState([]); // [{ id, message }]

  useEffect(() => {
    if (open) {
      setExported(null);
      setExportError(null);
      setPhrase("");
      setError(null);
      setFailed([]);
    }
  }, [open]);

  const count = records.length;
  const label = count === 1 ? noun.one : noun.many;
  const ready = Boolean(exported) && phrase.trim() === DELETE_PHRASE && count > 0 && !failed.length;

  const doExport = () => {
    setExportError(null);
    try {
      if (!exportColumns?.length) throw new Error("No columns to export");
      const file = exportRows(records, exportColumns, { format: "xlsx", filename: `${exportFilename}-backup` });
      setExported(file || `${exportFilename}-backup.xlsx`);
    } catch (e) {
      setExported(null);
      setExportError(e?.message || "The file couldn't be created");
    }
  };

  const doDelete = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = (await onDelete(records)) || {};
      const bad = res.failed || [];
      const ok = res.deleted ? res.deleted.length : count - bad.length;
      onDeleted?.({ deleted: res.deleted || [], failed: bad });
      if (bad.length) {
        setFailed(bad);
        if (ok) toast.success(`${ok} ${ok === 1 ? noun.one : noun.many} permanently deleted`);
      } else {
        toast.success(`${ok} ${ok === 1 ? noun.one : noun.many} permanently deleted`);
        onClose?.();
      }
    } catch (e) {
      setError({ title: "Nothing was deleted", message: `${e?.response?.data?.message || e?.message || "The server didn't respond"}. Your data is unchanged — check your connection or permissions and try again.` });
    } finally {
      setBusy(false);
    }
  };

  const byId = Object.fromEntries(records.map((r) => [String(idOf(r)), r]));

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      size="sm"
      icon={<DeleteForeverOutlined sx={{ color: "var(--danger)" }} />}
      title={`Permanently delete ${count} ${label}?`}
      description="This removes them from the database. It can't be undone."
      error={error}
      secondary={{ label: failed.length ? "Close" : "Cancel" }}
      primary={failed.length ? undefined : { label: `Delete ${count} ${label}`, loadingLabel: "Deleting…", onClick: doDelete, disabled: !ready, loading: busy, danger: true }}
      actions={failed.length ? <Button variant="outlined" onClick={onClose}>Close</Button> : undefined}
    >
      <Box sx={{ border: "1px solid var(--border)", borderRadius: "8px", maxHeight: 168, overflowY: "auto", backgroundColor: "var(--surface-subtle)" }}>
        {records.slice(0, SHOW_NAMES).map((r) => (
          <Typography key={String(idOf(r))} dir="auto" noWrap sx={{ px: 1.25, py: 0.6, fontSize: 12.5, borderBottom: "1px solid var(--border)", "&:last-of-type": { borderBottom: 0 } }}>
            {nameOf(r) || String(idOf(r))}
          </Typography>
        ))}
        {count > SHOW_NAMES && <Typography sx={{ px: 1.25, py: 0.6, fontSize: 12, color: "var(--text-muted)" }}>…and {count - SHOW_NAMES} more (all are in the export)</Typography>}
      </Box>

      {failed.length > 0 ? (
        <ErrorState
          sx={{ mt: 2 }}
          title={`${failed.length} of ${count} ${label} weren't deleted`}
          message={
            <Box component="span" sx={{ display: "block" }}>
              They are unchanged. {count - failed.length > 0 ? "The others were deleted. " : ""}
              {failed.slice(0, 8).map((f) => (
                <Box component="span" key={String(f.id)} sx={{ display: "block" }}>• {nameOf(byId[String(f.id)]) || f.id}: {f.message}</Box>
              ))}
            </Box>
          }
        />
      ) : (
        <>
          <Step n={1} done={Boolean(exported)} title="Export a backup">
            <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mb: 1 }}>Download all {count} {label} with every column to one .xlsx file before deleting.</Typography>
            <Button variant="outlined" startIcon={<FileDownloadOutlined sx={{ fontSize: 16 }} />} onClick={doExport} disabled={busy}>
              {exported ? "Download again" : `Export ${count} ${label} (.xlsx)`}
            </Button>
            {exported && <Typography sx={{ mt: 0.75, fontSize: 12, color: "var(--success)" }}>Downloaded {exported}</Typography>}
            {exportError && <ErrorState sx={{ mt: 1 }} title="Export failed — delete is locked" message={`${exportError}. Try again; nothing has been deleted.`} />}
          </Step>
          <Step n={2} done={phrase.trim() === DELETE_PHRASE} title="Confirm">
            <TextField
              fullWidth
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              disabled={!exported || busy}
              placeholder={DELETE_PHRASE}
              autoComplete="off"
              helperText={exported ? <>Type <strong>{DELETE_PHRASE}</strong> to turn on the delete button.</> : "Export the backup first."}
              slotProps={{ htmlInput: { "aria-label": `Type ${DELETE_PHRASE} to confirm`, spellCheck: false } }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doDelete(); } }}
            />
          </Step>
        </>
      )}
    </AppDialog>
  );
};

export default SafeDeleteDialog;
