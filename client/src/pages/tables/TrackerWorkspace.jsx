import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, Button, IconButton, ListItemIcon, Menu, MenuItem } from "@mui/material";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import EditOutlined from "@mui/icons-material/EditOutlined";
import ArchiveOutlined from "@mui/icons-material/ArchiveOutlined";
import PageLoader from "../../components/ui/PageLoader";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import TrackerDialog from "../../components/trackers/TrackerDialog";
import { useTrackers, reloadTrackers } from "../../hooks/useTrackers";
import { trackersApi } from "../../api/qops";
import CategoryWorkspace from "./CategoryWorkspace";

/** /trackers/:key — a tracker added online. Admins can edit or archive it here. */
const TrackerWorkspace = () => {
  const { key } = useParams();
  const navigate = useNavigate();
  const isAdmin = useSelector((s) => s?.auth?.user?.role) === "Admin";
  const { custom } = useTrackers();
  const [loaded, setLoaded] = useState(custom.length > 0);
  const [menu, setMenu] = useState(null);
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState(null);
  const tracker = custom.find((t) => t.key === key);

  // a link opened directly: wait for the tracker list before saying it doesn't exist
  useEffect(() => {
    if (!tracker && !loaded) reloadTrackers().then(() => setLoaded(true));
  }, [tracker, loaded]);

  if (!tracker && !loaded) return <PageLoader />;
  if (!tracker) return <EmptyState title="Tracker not found" description="It may have been renamed or archived." action={<Button variant="outlined" onClick={() => navigate("/dashboard")}>Go to the dashboard</Button>} />;

  return (
    <Box>
      <CategoryWorkspace
        key={tracker.label}
        category={tracker.label}
        actions={isAdmin && <IconButton aria-label="Tracker options" onClick={(e) => setMenu(e.currentTarget)}><MoreHoriz /></IconButton>}
      />
      <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
        <MenuItem onClick={() => { setMenu(null); setEditing(true); }}><ListItemIcon><EditOutlined fontSize="small" /></ListItemIcon>Edit tracker</MenuItem>
        <MenuItem onClick={() => { setMenu(null); setArchiving(true); }} sx={{ color: "var(--danger)" }}><ListItemIcon><ArchiveOutlined fontSize="small" sx={{ color: "var(--danger)" }} /></ListItemIcon>Archive tracker</MenuItem>
      </Menu>
      {editing && <TrackerDialog open tracker={{ ...tracker, _id: tracker.id, name: tracker.label }} onClose={() => setEditing(false)} onSaved={(t) => { setEditing(false); if (t.key !== key) navigate(`/trackers/${t.key}`, { replace: true }); }} />}
      <ConfirmDialog
        open={archiving}
        title={`Archive “${tracker.label}”?`}
        description="It leaves the sidebar. Its tables and rows are kept, and an admin can restore it from Settings → Trackers."
        error={error}
        confirmLabel="Archive tracker"
        danger
        onClose={() => { setArchiving(false); setError(null); }}
        onConfirm={async () => {
          try {
            await trackersApi.update(tracker.id, { archived: true });
            await reloadTrackers();
            navigate("/dashboard");
          } catch (e) {
            setError(e?.response?.data?.message || "Couldn't archive the tracker");
          }
        }}
      />
    </Box>
  );
};

export default TrackerWorkspace;
