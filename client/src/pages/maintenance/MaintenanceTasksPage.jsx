import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { Box, Button, InputBase, Pagination, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import { format } from "date-fns";
import SectionCard from "../../components/ui/SectionCard";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import FilterChip from "../../components/ui/FilterChip";
import SegmentedControl from "../../components/ui/SegmentedControl";
import Badge from "../../components/ui/Badge";
import MTable from "./MTable";
import MaintenanceTaskForm from "./MaintenanceTaskForm";
import MaintenanceTaskSheet from "./MaintenanceTaskSheet";
import { PRIORITY_TONE, STATUS_TONE, errMsg, maintenanceApi, useMaintenanceTeams } from "./maintenanceApi";

const LIMIT = 25;
const STATUS_TABS = ["open", "Todo", "In Progress", "Closed", "all"];
const statusParam = (s) => (s === "open" ? "Todo,In Progress" : s === "all" ? "" : s);

/** Maintenance tasks: server-side paging, search and filters; create from here. */
const MaintenanceTasksPage = () => {
  const { refreshOverview } = useOutletContext() || {};
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "open";
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
  const [sheetVersion, setSheetVersion] = useState(0); // remounts the sheet after an edit

  const setQuery = useCallback(
    (patch) =>
      setParams((prev) => {
        const n = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === "" || v == null || (Array.isArray(v) && !v.length) || (k === "status" && v === "open") || (k === "page" && v === 1) || (k === "sort" && v === "newest")) n.delete(k);
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
      .list({ page, limit: LIMIT, status: statusParam(status) || undefined, q: q || undefined, team: teamKey || undefined, sort })
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(errMsg(e, "Couldn't load maintenance tasks")))
      .finally(() => setLoading(false));
  }, [page, status, q, teamKey, sort]);
  useEffect(load, [load]);

  const counts = data?.statusCounts || {};
  const countFor = (s) => (s === "open" ? (counts.Todo || 0) + (counts["In Progress"] || 0) : s === "all" ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[s] || 0);
  const teamOptions = useMemo(() => teams.map((t) => ({ value: t._id, label: t.teamName })), [teams]);

  const columns = [
    { key: "taskNumber", label: "Task", render: (t) => <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)" }}>{t.taskNumber}</span> },
    { key: "slid", label: "SLID", render: (t) => <span style={{ color: "var(--text)", fontWeight: 500 }}>{t.slid}</span> },
    { key: "customer", label: "Customer", render: (t) => t.customerName || "—" },
    { key: "team", label: "Team", render: (t) => t.team?.teamName || "—" },
    { key: "faultType", label: "Fault", render: (t) => t.faultType || "—" },
    { key: "priority", label: "Priority", render: (t) => <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge> },
    { key: "status", label: "Status", render: (t) => <Badge tone={STATUS_TONE[t.status]} dot>{t.status}</Badge> },
    { key: "steps", label: "Steps", align: "right", render: (t) => t.ticketCount || 0 },
    { key: "due", label: "Due", render: (t) => (t.dueDate ? <span style={{ color: t.status !== "Closed" && new Date(t.dueDate) < new Date() ? "var(--danger)" : undefined }}>{format(new Date(t.dueDate), "d MMM")}</span> : "—") },
    { key: "created", label: "Created", render: (t) => format(new Date(t.createdAt), "d MMM yyyy") },
  ];

  const changed = () => {
    load();
    refreshOverview?.();
  };

  return (
    <>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", mb: 1.5 }}>
        <SegmentedControl
          ariaLabel="Status"
          value={status}
          onChange={(v) => setQuery({ status: v, page: 1 })}
          options={STATUS_TABS.map((s) => ({ value: s, label: `${s === "open" ? "Open" : s === "all" ? "All" : s}${data ? ` ${countFor(s)}` : ""}` }))}
        />
        <Box sx={{ flex: 1 }} />
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
            <FilterChip label="Sort" single options={[{ value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }, { value: "due", label: "Due date" }, { value: "updated", label: "Recently updated" }]} value={[sort]} onChange={(v) => setQuery({ sort: v[0] || "newest", page: 1 })} />
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
            empty={<EmptyState icon={<AssignmentOutlined sx={{ fontSize: 20 }} />} title={q || teamFilter.length || status !== "open" ? "No tasks match" : "No open maintenance tasks"} description={!teams.length ? "Create a maintenance team first, under All teams." : "Create a task for each maintenance case that needs follow-up."} action={teams.length > 0 && <Button variant="outlined" onClick={() => setEditing("new")}>Create task</Button>} />}
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
    </>
  );
};

export default MaintenanceTasksPage;
