import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import Add from "@mui/icons-material/Add";
import EditOutlined from "@mui/icons-material/EditOutlined";
import ArchiveOutlined from "@mui/icons-material/ArchiveOutlined";
import UnarchiveOutlined from "@mui/icons-material/UnarchiveOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import SectionCard from "../ui/SectionCard";
import Badge from "../ui/Badge";
import ConfirmDialog from "../ui/ConfirmDialog";
import ErrorState from "../ui/ErrorState";
import TrackerDialog from "./TrackerDialog";
import { trackersApi } from "../../api/qops";
import { reloadTrackers } from "../../hooks/useTrackers";
import { TAXONOMY, BUILT_IN_COUNT } from "../../constants/taxonomy";

/** Settings → Trackers: the built-in trackers and the ones added online (add, edit, archive, restore). */
const TrackersSettings = () => {
  const isAdmin = useSelector((s) => s?.auth?.user?.role) === "Admin";
  const [live, setLive] = useState(null);
  const [archived, setArchived] = useState([]);
  const [editing, setEditing] = useState(null); // {} new | tracker
  const [confirm, setConfirm] = useState(null); // { kind, tracker }
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([trackersApi.list(), isAdmin ? trackersApi.list({ archived: true }) : []]);
      setLive(a);
      setArchived(b);
    } catch (e) {
      setError(e?.response?.data?.message || "Couldn't load the trackers");
    }
  }, [isAdmin]);
  useEffect(() => { load(); }, [load]);

  const act = async () => {
    const { kind, tracker } = confirm;
    setBusy(true);
    try {
      if (kind === "delete") await trackersApi.remove(tracker._id);
      else await trackersApi.update(tracker._id, { archived: kind === "archive" });
      await reloadTrackers();
      await load();
      setConfirm(null);
    } catch (e) {
      setConfirm((c) => ({ ...c, error: e?.response?.data?.message || "That didn't work" }));
    } finally {
      setBusy(false);
    }
  };

  const Row = ({ t, builtIn }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 1, borderBottom: "1px solid var(--border)", "&:last-child": { borderBottom: 0 } }}>
      <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: t.color, flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography dir="auto" sx={{ fontSize: 13.5, fontWeight: 500 }}>
          {builtIn ? t.label : t.archived ? t.name : <Box component={RouterLink} to={`/trackers/${t.key}`} sx={{ color: "inherit" }}>{t.name}</Box>}
        </Typography>
        <Typography sx={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {(t.subs || []).length ? t.subs.join(" · ") : "No sub-categories"}{!builtIn ? ` · ${t.tableCount} table${t.tableCount === 1 ? "" : "s"}` : ""}
        </Typography>
      </Box>
      {builtIn ? <Badge>built-in</Badge> : isAdmin && (
        t.archived ? (
          <>
            <Tooltip title="Restore"><IconButton size="small" aria-label={`Restore ${t.name}`} onClick={() => setConfirm({ kind: "restore", tracker: t })}><UnarchiveOutlined sx={{ fontSize: 17 }} /></IconButton></Tooltip>
            <Tooltip title={t.tableCount ? "Has tables, so it can only be archived" : "Delete permanently"}>
              <span><IconButton size="small" aria-label={`Delete ${t.name}`} disabled={t.tableCount > 0} onClick={() => setConfirm({ kind: "delete", tracker: t })}><DeleteOutline sx={{ fontSize: 17 }} /></IconButton></span>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip title="Edit"><IconButton size="small" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}><EditOutlined sx={{ fontSize: 17 }} /></IconButton></Tooltip>
            <Tooltip title="Archive"><IconButton size="small" aria-label={`Archive ${t.name}`} onClick={() => setConfirm({ kind: "archive", tracker: t })}><ArchiveOutlined sx={{ fontSize: 17 }} /></IconButton></Tooltip>
          </>
        )
      )}
    </Box>
  );

  const C = confirm && {
    archive: { title: `Archive “${confirm.tracker.name}”?`, body: "It leaves the sidebar. Its tables and rows are kept; restore it here any time.", label: "Archive", danger: true },
    restore: { title: `Restore “${confirm.tracker.name}”?`, body: "It comes back to the sidebar with its tables.", label: "Restore", danger: false },
    delete: { title: `Delete “${confirm.tracker.name}” permanently?`, body: "It has no tables. This can't be undone.", label: "Delete permanently", danger: true },
  }[confirm.kind];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {error && <ErrorState title="Something went wrong" message={error} onRetry={() => { setError(null); load(); }} />}
      <SectionCard title="Trackers" description="Each tracker has its own page and tables. Records count for field teams in Team analysis through their SLID and team code."
        actions={isAdmin && <Button variant="contained" startIcon={<Add />} onClick={() => setEditing({})}>Add tracker</Button>}>
        {TAXONOMY.slice(0, BUILT_IN_COUNT).map((t) => <Row key={t.label} t={t} builtIn />)}
        {(live || []).map((t) => <Row key={t._id} t={t} />)}
      </SectionCard>
      {archived.length > 0 && (
        <SectionCard title="Archived trackers">
          {archived.map((t) => <Row key={t._id} t={t} />)}
        </SectionCard>
      )}
      {editing && <TrackerDialog open tracker={editing._id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {confirm && <ConfirmDialog open title={C.title} description={C.body} confirmLabel={C.label} danger={C.danger} loading={busy} error={confirm.error} onClose={() => setConfirm(null)} onConfirm={act} />}
    </Box>
  );
};

export default TrackersSettings;
