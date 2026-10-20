import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { formatDistanceToNow } from "date-fns";
import { Box, Button, Skeleton, Typography } from "@mui/material";
import Add from "@mui/icons-material/Add";
import TableChartOutlined from "@mui/icons-material/TableChartOutlined";
import UnarchiveOutlined from "@mui/icons-material/UnarchiveOutlined";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { tablesApi } from "./tablesApi";

const NewTableDialog = lazy(() => import("./NewTableDialog"));

export const notifyTablesChanged = () => window.dispatchEvent(new CustomEvent("custom-tables-changed"));

/**
 * The custom tables of one tracker (optionally one sub-category), as cards.
 * Admins can create tables and restore archived ones.
 */
const CategoryTables = ({ category, sub, title = "Tables", compact = false }) => {
  const isAdmin = useSelector((s) => s?.auth?.user?.role) === "Admin";
  const [tables, setTables] = useState(null);
  const [archived, setArchived] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const params = { category, ...(sub ? { sub } : {}) };
      const [live, old] = await Promise.all([tablesApi.list(params), isAdmin ? tablesApi.list({ ...params, archived: true }) : Promise.resolve([])]);
      setTables(live);
      setArchived(old);
      setError(null);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
      setTables([]);
    }
  }, [category, sub, isAdmin]);
  useEffect(() => {
    load();
    window.addEventListener("custom-tables-changed", load);
    return () => window.removeEventListener("custom-tables-changed", load);
  }, [load]);

  const restore = async (t) => {
    await tablesApi.update(t._id, { archived: false });
    load();
    notifyTablesChanged();
  };

  return (
    <Box sx={{ mb: compact ? 2 : 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{title}</Typography>
        {tables && <Badge>{tables.length}</Badge>}
        <Box sx={{ flex: 1 }} />
        {isAdmin && archived.length > 0 && <Button size="small" variant="text" onClick={() => setShowArchived((x) => !x)}>{showArchived ? "Hide archived" : `Archived (${archived.length})`}</Button>}
        {isAdmin && <Button size="small" variant="outlined" startIcon={<Add sx={{ fontSize: 16 }} />} onClick={() => setCreating(true)}>New table</Button>}
      </Box>
      {error && <Typography sx={{ fontSize: 12.5, color: "var(--danger)", mb: 1 }}>{error}</Typography>}
      {!tables ? (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 1.25 }}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={92} />)}</Box>
      ) : tables.length === 0 ? (
        compact ? (
          <Typography sx={{ fontSize: 13, color: "var(--text-muted)" }}>No custom tables yet{isAdmin ? " — create one from a template, a file or from scratch." : "."}</Typography>
        ) : (
          <EmptyState
            icon={<TableChartOutlined />}
            title="No tables yet"
            description={isAdmin ? "Create a working sheet for this tracker: start from the built-in template, upload the Excel file you use today, or build one from scratch." : "An admin can create tables for this tracker."}
            action={isAdmin ? <Button variant="contained" startIcon={<Add />} onClick={() => setCreating(true)}>New table</Button> : undefined}
            minHeight={200}
          />
        )
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 1.25 }}>
          {tables.map((t) => (
            <Box key={t._id} component={RouterLink} to={`/tables/${t._id}`}
              sx={{ p: 1.75, borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 0.75, boxShadow: "var(--shadow-xs)", "&:hover": { borderColor: "var(--border-strong)", boxShadow: "var(--shadow-sm)" }, "&:focus-visible": { outline: "2px solid var(--focus-ring)" } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TableChartOutlined sx={{ fontSize: 18, color: "var(--accent-text)" }} />
                <Typography dir="auto" sx={{ fontSize: 13.5, fontWeight: 600, flex: 1 }} noWrap>{t.name}</Typography>
              </Box>
              {t.description && <Typography sx={{ fontSize: 12, color: "var(--text-secondary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.description}</Typography>}
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: "auto" }}>
                {t.issueSubCategory && <Badge>{t.issueSubCategory}</Badge>}
                <Badge>{t.rowCount} rows</Badge>
                <Badge>{t.fields.filter((f) => !f.archived).length} fields</Badge>
              </Box>
              <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>Updated {formatDistanceToNow(new Date(t.lastActivity), { addSuffix: true })}</Typography>
            </Box>
          ))}
        </Box>
      )}
      {showArchived && (
        <Box sx={{ mt: 1.5, border: "1px solid var(--border)", borderRadius: "10px" }}>
          {archived.map((t) => (
            <Box key={t._id} sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, borderBottom: "1px solid var(--border)", "&:last-of-type": { borderBottom: 0 } }}>
              <Typography sx={{ fontSize: 13, flex: 1, color: "var(--text-secondary)" }}>{t.name} · {t.rowCount} rows</Typography>
              <Button size="small" startIcon={<UnarchiveOutlined sx={{ fontSize: 16 }} />} onClick={() => restore(t)}>Restore</Button>
            </Box>
          ))}
        </Box>
      )}
      <Suspense fallback={null}>
        {creating && <NewTableDialog open onClose={() => setCreating(false)} category={category} sub={sub || undefined} onCreated={notifyTablesChanged} />}
      </Suspense>
    </Box>
  );
};

export default CategoryTables;
