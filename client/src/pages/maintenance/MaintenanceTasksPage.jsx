import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useOutletContext, useSearchParams } from "react-router-dom";
import { Box, Button, InputBase, Pagination, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import BarChartOutlined from "@mui/icons-material/BarChartOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import { toast } from "sonner";
import { format } from "date-fns";
import SectionCard from "../../components/ui/SectionCard";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import FilterChip from "../../components/ui/FilterChip";
import Badge from "../../components/ui/Badge";
import MTable from "./MTable";
import MaintenanceTaskForm from "./MaintenanceTaskForm";
import MaintenanceTaskSheet from "./MaintenanceTaskSheet";
import MaintenanceUploadDialog from "./MaintenanceUploadDialog";
import { errMsg, maintenanceApi, useMaintenanceTeams } from "./maintenanceApi";
import { getTaskRcaRows } from "./maintenanceRca";
import { exportMaintenanceTasks } from "./maintenanceTasksExport";

/** RCA rows as on the reports register: Reason › Sub-reason › Root cause (Owner). */
const RcaCell = ({ task }) => {
  const rows = getTaskRcaRows(task);
  if (!rows.length) return "—";
  return (
    <Box sx={{ whiteSpace: "normal", minWidth: 200, maxWidth: 300, fontSize: 11.5, lineHeight: 1.35 }}>
      {rows.map((r, i) => (
        <Box key={i} sx={{ mb: i < rows.length - 1 ? 0.5 : 0 }}>
          <span style={{ fontWeight: 600, color: "var(--text)" }}>{r.reason}</span>
          {r.subReason && ` › ${r.subReason}`}
          {r.hasRootCause && <span style={{ color: "#DB2777" }}> › {r.rootCause}</span>}
          {r.responsible && <span style={{ color: "var(--text-muted)" }}> ({r.responsible})</span>}
        </Box>
      ))}
    </Box>
  );
};

const LIMIT = 25;

/** Maintenance tasks: server-side paging, search and filters; create from here. All tasks in a single view. */
const MaintenanceTasksPage = () => {
  const { refreshOverview } = useOutletContext() || {};
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") || 1);
  const q = params.get("q") || "";
  const teamFilter = useMemo(() => (params.get("team") ? params.get("team").split(",") : []), [params]);
  const sort = params.get("sort") || "newest";
  const openId = params.get("task");
  const [search, setSearch] = useState(q);
  const { teams, reload: reloadTeams } = useMaintenanceTeams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | task
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sheetVersion, setSheetVersion] = useState(0); // remounts the sheet after an edit
  const [exporting, setExporting] = useState(false);

  const setQuery = useCallback(
    (patch) =>
      setParams((prev) => {
        const n = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === "" || v == null || (Array.isArray(v) && !v.length) || (k === "status") || (k === "page" && v === 1) || (k === "sort" && v === "newest")) n.delete(k);
          else n.set(k, Array.isArray(v) ? v.join(",") : String(v));
        }
        return n;
      }, { replace: true }),
    [setParams]
  );

  // Debounced search → URL (and back to page 1).
  useEffect(() => {
    const id = setTimeout(() => search !== q && setQuery({ q: search, page: 1 }), 300);
    return () => clearTimeout(id);
  }, [search, q, setQuery]);

  const teamKey = teamFilter.join(",");
  const load = useCallback(() => {
    setLoading(true);
    maintenanceApi.tasks
      .list({ page, limit: LIMIT, q: q || undefined, team: teamKey || undefined, sort })
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(errMsg(e, "Couldn't load maintenance tasks")))
      .finally(() => setLoading(false));
  }, [page, q, teamKey, sort]);
  useEffect(load, [load]);

  const teamOptions = useMemo(() => teams.map((t) => ({ value: t._id, label: t.teamName })), [teams]);

  const columns = [
    { key: "taskNumber", label: "Task", render: (t) => <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)" }}>{t.taskNumber}</span> },
    { key: "slid", label: "SLID", render: (t) => <span style={{ color: "var(--text)", fontWeight: 500 }}>{t.slid}</span> },
    { key: "customer", label: "Customer", render: (t) => t.customerName || "—" },
    { key: "team", label: "Team", render: (t) => t.team?.teamName || "—" },
    { key: "faultType", label: "Fault", render: (t) => t.faultType || "—" },
    { key: "rca", label: "R.C.A", render: (t) => <RcaCell task={t} /> },
    { key: "fiber", label: "Fiber", render: (t) => t.fiberCategory ? <Badge tone={t.fiberCategory === "FTTHW" ? "success" : "warning"}>{t.fiberCategory}</Badge> : "—" },
    { key: "ncf", label: "NCF", render: (t) => t.ncf ? <Badge tone="warning">NCF</Badge> : "—" },
    { key: "hc", label: "HC", render: (t) => t.hcResponsibility ? <Badge tone="danger">HC</Badge> : "—" },
    { key: "resolved", label: "Resolved", render: (t) => t.resolvedAfterVisit && t.resolvedAfterVisit !== "Not specified" ? <Badge tone={t.resolvedAfterVisit === "Yes" ? "success" : "danger"}>{t.resolvedAfterVisit}</Badge> : "—" },
    { key: "followUp", label: "Follow-up", render: (t) => (t.customerFollowUp ? <Badge tone={t.customerFollowUp === "Yes" ? "warning" : "neutral"}>{t.customerFollowUp}</Badge> : "—") },
    { key: "steps", label: "Steps", align: "right", render: (t) => t.ticketCount || 0 },
    { key: "reported", label: "Reporting", render: (t) => (t.faultDate ? format(new Date(t.faultDate), "d MMM HH:mm") : "—") },
    { key: "created", label: "Created", render: (t) => (t.creationDate || t.createdAt ? format(new Date(t.creationDate || t.createdAt), "d MMM yyyy, HH:mm") : "—") },
    { key: "due", label: "Clearance", render: (t) => (t.dueDate ? format(new Date(t.dueDate), "d MMM HH:mm") : "—") },
  ];

  // Exports every task matching the current search, team filter and sort (not just this page).
  const exportXlsx = async () => {
    setExporting(true);
    try {
      const all = await maintenanceApi.tasks.list({ limit: "all", q: q || undefined, team: teamKey || undefined, sort });
      if (!all.rows.length) {
        toast.info("No tasks to export");
        return;
      }
      const teamNames = teamFilter.map((id) => teams.find((t) => t._id === id)?.teamName).filter(Boolean);
      exportMaintenanceTasks(all.rows, { filterNote: [q && `search "${q}"`, teamNames.length && `teams: ${teamNames.join(", ")}`].filter(Boolean).join(" · ") });
      toast.success(`Exported ${all.rows.length.toLocaleString()} task${all.rows.length === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(errMsg(e, "Couldn't export the tasks"));
    } finally {
      setExporting(false);
    }
  };

  const changed = () => {
    load();
    refreshOverview?.();
  };

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Button variant="outlined" component={RouterLink} to="/dvoc-maintenance/reports" startIcon={<BarChartOutlined sx={{ fontSize: 18 }} />}>Analysis & Reports</Button>
        <Button variant="outlined" startIcon={<FileDownloadOutlined sx={{ fontSize: 18 }} />} onClick={exportXlsx} disabled={exporting || !data?.total}>{exporting ? "Exporting…" : "Export xlsx"}</Button>
        <Button variant="outlined" startIcon={<UploadFileOutlined sx={{ fontSize: 18 }} />} onClick={() => setUploadOpen(true)}>Upload sheet</Button>
        <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 18 }} />} onClick={() => setEditing("new")}>Create task</Button>
      </Box>
      <SectionCard
        title="Maintenance tasks"
        description={data ? `${data.total.toLocaleString()} task${data.total === 1 ? "" : "s"}` : "Loading…"}
        padding={0}
        actions={
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, height: 30, px: 1, border: "1px solid var(--border)", borderRadius: "6px", width: { xs: 150, sm: 240 } }}>
              <SearchIcon sx={{ fontSize: 16, color: "var(--text-muted)" }} />
              <InputBase value={search} onChange={(e) => setSearch(e.target.value)} placeholder="SLID, task, ticket, customer…" sx={{ fontSize: 13, flex: 1 }} inputProps={{ "aria-label": "Search maintenance tasks" }} />
            </Box>
            <FilterChip label="Team" options={teamOptions} value={teamFilter} onChange={(v) => setQuery({ team: v, page: 1 })} searchable />
            <FilterChip label="Sort" single options={[{ value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }, { value: "due", label: "Clearance date" }, { value: "updated", label: "Recently updated" }]} value={[sort]} onChange={(v) => setQuery({ sort: v[0] || "newest", page: 1 })} />
          </Box>
        }
      >
        {error ? (
          <Box sx={{ p: 2 }}><ErrorState message={error} onRetry={load} /></Box>
        ) : (
          <MTable
            ariaLabel="Maintenance tasks"
            columns={columns}
            rows={data?.rows || []}
            loading={loading}
            onRowClick={(t) => setQuery({ task: t._id })}
            empty={<EmptyState icon={<AssignmentOutlined sx={{ fontSize: 20 }} />} title={q || teamFilter.length ? "No tasks match" : "No maintenance tasks"} description={!teams.length ? "Create a maintenance team first, under All teams." : "Create a task for each maintenance case that needs follow-up."} action={teams.length > 0 && <Button variant="outlined" onClick={() => setEditing("new")}>Create task</Button>} />}
          />
        )}
        {data && data.pages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, py: 1.25, borderTop: "1px solid var(--border)" }}>
            <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
              {(data.page - 1) * data.limit + 1}–{Math.min(data.total, data.page * data.limit)} of {data.total.toLocaleString()}
            </Typography>
            <Pagination size="small" count={data.pages} page={data.page} onChange={(_e, p) => setQuery({ page: p })} />
          </Box>
        )}
      </SectionCard>

      <MaintenanceTaskForm
        open={Boolean(editing)}
        task={editing === "new" ? null : editing}
        teams={teams}
        defaultTeam={teamFilter.length === 1 ? teamFilter[0] : ""}
        onClose={() => setEditing(null)}
        onOpenExisting={(id) => { setEditing(null); setQuery({ task: id }); }}
        onSaved={(t) => {
          setEditing(null);
          changed();
          reloadTeams();
          setSheetVersion((n) => n + 1);
          if (!openId && t?._id) setQuery({ task: t._id });
        }}
      />
      <MaintenanceTaskSheet key={`${openId || "none"}-${sheetVersion}`} taskId={openId} onClose={() => setQuery({ task: "" })} onEdit={(t) => setEditing(t)} onChanged={changed} />
      <MaintenanceUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        teams={teams}
        defaultTeam={teamFilter.length === 1 ? teamFilter[0] : ""}
        onSuccess={changed}
      />
    </>
  );
};

export default MaintenanceTasksPage;
