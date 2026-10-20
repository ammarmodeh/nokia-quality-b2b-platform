import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Box, Button, Typography } from "@mui/material";
import Sheet from "../../components/ui/Sheet";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { downloadWorkbook } from "../../components/dataio/parse";
import { filesApi, tablesApi } from "./tablesApi";
import { errText } from "./useTable";

const MODE = { create: "Create only", upsert: "Upsert", skip: "Skip duplicates" };

/** Import batches of a table: counts, original file, error report, view rows, roll back. */
const ImportHistorySheet = ({ open, onClose, table, onShowBatch, onRolledBack, notify }) => {
  const [batches, setBatches] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => tablesApi.batches(table._id).then(setBatches).catch((e) => notify(errText(e))), [table._id, notify]);
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const rollback = async () => {
    setBusy(true);
    try {
      const out = await tablesApi.rollbackBatch(table._id, confirm._id);
      notify(`Rolled back: ${out.removed} row${out.removed === 1 ? "" : "s"} removed, ${out.reverted} reverted${out.conflicts ? `, ${out.conflicts} field${out.conflicts === 1 ? "" : "s"} kept because they were edited after the import` : ""}`, "neutral");
      onRolledBack?.();
      load();
    } catch (e) {
      notify(errText(e));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const errorReport = (b) =>
    downloadWorkbook([{ name: "Errors", header: ["Row", "Error"], rows: b.rowErrors.map((e) => [e.row, e.message]) }], `${table.name}-import-errors-${format(new Date(b.createdAt), "yyyy-MM-dd")}`);

  return (
    <Sheet open={open} onClose={onClose} title="Import history" description="Every import is recorded with its file and can be rolled back." width={560}>
      {batches?.length === 0 && <EmptyState title="No imports yet" description="Rows imported from Excel or CSV appear here, with the original file." minHeight={180} />}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        {(batches || []).map((b) => (
          <Box key={b._id} sx={{ p: 1.5, borderRadius: "10px", border: "1px solid var(--border)", opacity: b.status === "rolled_back" ? 0.7 : 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }} noWrap title={b.fileId?.originalName}>{b.fileId?.originalName || "Pasted / unknown file"}{b.sheet ? ` · ${b.sheet}` : ""}</Typography>
              {b.status === "rolled_back" ? <Badge tone="danger">Rolled back</Badge> : b.status === "running" ? <Badge tone="warning">Incomplete</Badge> : <Badge tone="success">Completed</Badge>}
            </Box>
            <Typography sx={{ fontSize: 12, color: "var(--text-secondary)", mb: 1 }}>
              {format(new Date(b.createdAt), "dd MMM yyyy HH:mm")} · {b.createdBy?.name || "Unknown"} · {MODE[b.mode] || b.mode}
              {b.rolledBackAt ? ` · rolled back ${format(new Date(b.rolledBackAt), "dd MMM HH:mm")}` : ""}
            </Typography>
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1 }}>
              <Badge tone="success">{b.counts.created} created</Badge>
              <Badge tone="info">{b.counts.updated} updated</Badge>
              <Badge>{b.counts.skipped} skipped</Badge>
              <Badge tone={b.counts.failed ? "danger" : "neutral"}>{b.counts.failed} failed</Badge>
            </Box>
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
              <Button size="small" onClick={() => { onShowBatch(b); onClose(); }} disabled={!b.counts.created && !b.counts.updated}>View rows</Button>
              {b.fileId && <Button size="small" onClick={() => filesApi.download(b.fileId)}>Download file</Button>}
              {b.rowErrors?.length > 0 && <Button size="small" onClick={() => errorReport(b)}>Error report</Button>}
              <Box sx={{ flex: 1 }} />
              {b.status !== "rolled_back" && (b.counts.created > 0 || b.counts.updated > 0) && (
                <Button size="small" color="error" onClick={() => setConfirm(b)}>Roll back</Button>
              )}
            </Box>
          </Box>
        ))}
      </Box>
      <ConfirmDialog
        open={Boolean(confirm)}
        title="Roll back this import?"
        description={confirm ? `${confirm.counts.created} row${confirm.counts.created === 1 ? "" : "s"} it created will be deleted (restorable) and ${confirm.counts.updated} updated row${confirm.counts.updated === 1 ? "" : "s"} will get their previous values back. Fields edited after the import are left alone.` : ""}
        confirmLabel="Roll back"
        danger
        loading={busy}
        onClose={() => setConfirm(null)}
        onConfirm={rollback}
      />
    </Sheet>
  );
};

export default ImportHistorySheet;
