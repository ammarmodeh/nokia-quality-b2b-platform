import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { Box, Button, InputBase, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ConfirmationNumberOutlined from "@mui/icons-material/ConfirmationNumberOutlined";
import { format } from "date-fns";
import SectionCard from "../../components/ui/SectionCard";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import FilterChip from "../../components/ui/FilterChip";
import SegmentedControl from "../../components/ui/SegmentedControl";
import SkeletonRows from "../../components/ui/SkeletonRows";
import Badge from "../../components/ui/Badge";
import TicketPanel from "./TicketPanel";
import MaintenanceTaskSheet from "./MaintenanceTaskSheet";
import MaintenanceTaskForm from "./MaintenanceTaskForm";
import { PRIORITY_TONE, STATUS_TONE, errMsg, maintenanceApi, useMaintenanceTeams } from "./maintenanceApi";

/** Process maintenance tasks: a queue of open tasks (least recently worked first) and the record-step panel. */
const MaintenanceProcessingPage = () => {
  const { refreshOverview } = useOutletContext() || {};
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("task");
  const scope = params.get("scope") || "open";
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [teamFilter, setTeamFilter] = useState([]);
  const { teams } = useMaintenanceTeams();
  const [queue, setQueue] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detailsId, setDetailsId] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(() => {
    maintenanceApi.tasks
      .queue({ status: scope === "open" ? "Todo,In Progress" : "Closed", q: q || undefined, team: teamFilter.length === 1 ? teamFilter[0] : undefined })
      .then((rows) => {
        setQueue(rows);
        setError(null);
      })
      .catch((e) => setError(errMsg(e, "Couldn't load the processing queue")));
  }, [scope, q, teamFilter]);
  useEffect(load, [load]);

  // Selected task (full record, so the panel knows its status).
  const loadSelected = useCallback(() => {
    if (!selectedId) return setSelected(null);
    maintenanceApi.tasks.get(selectedId).then(setSelected).catch(() => setSelected(null));
  }, [selectedId]);
  useEffect(loadSelected, [loadSelected]);

  const select = (id) => setParams((p) => { const n = new URLSearchParams(p); if (id) n.set("task", id); else n.delete("task"); return n; }, { replace: true });
  const teamOptions = useMemo(() => teams.map((t) => ({ value: t._id, label: t.teamName })), [teams]);
  const changed = () => {
    load();
    loadSelected();
    refreshOverview?.();
  };

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(320px, 2fr) 3fr" }, gap: 2, alignItems: "start" }}>
      <SectionCard
        title="Queue"
        description={queue ? `${queue.length} task${queue.length === 1 ? "" : "s"} · least recently worked first` : "Loading…"}
        padding={0}
        actions={<SegmentedControl size="sm" ariaLabel="Queue scope" value={scope} onChange={(v) => setParams((p) => { const n = new URLSearchParams(p); if (v === "open") n.delete("scope"); else n.set("scope", v); return n; }, { replace: true })} options={[{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }]} />}
      >
        <Box sx={{ display: "flex", gap: 1, p: 1.25, borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, height: 30, px: 1, border: "1px solid var(--border)", borderRadius: "6px", flex: 1, minWidth: 140 }}>
            <SearchIcon sx={{ fontSize: 16, color: "var(--text-muted)" }} />
            <InputBase value={search} onChange={(e) => setSearch(e.target.value)} placeholder="SLID, task, customer…" sx={{ fontSize: 13, flex: 1 }} inputProps={{ "aria-label": "Search the queue" }} />
          </Box>
          <FilterChip label="Team" single options={teamOptions} value={teamFilter} onChange={setTeamFilter} searchable />
        </Box>
        {error ? (
          <Box sx={{ p: 2 }}><ErrorState message={error} onRetry={load} /></Box>
        ) : !queue ? (
          <SkeletonRows rows={6} height={56} />
        ) : !queue.length ? (
          <EmptyState minHeight={200} icon={<ConfirmationNumberOutlined sx={{ fontSize: 20 }} />} title={scope === "open" ? "Nothing to process" : "No closed tasks"} description={scope === "open" ? "Open maintenance tasks appear here." : undefined} />
        ) : (
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, maxHeight: { lg: "calc(100vh - 320px)" }, overflowY: "auto" }}>
            {queue.map((t) => {
              const active = t._id === selectedId;
              const overdue = t.dueDate && t.status !== "Closed" && new Date(t.dueDate) < new Date();
              return (
                <Box component="li" key={t._id}>
                  <Box component="button" type="button" onClick={() => select(t._id)} aria-current={active ? "true" : undefined} sx={{ display: "block", width: "100%", textAlign: "left", font: "inherit", border: 0, borderBottom: "1px solid var(--border)", px: 1.75, py: 1.25, cursor: "pointer", backgroundColor: active ? "var(--accent-subtle)" : "transparent", "&:hover": { backgroundColor: active ? "var(--accent-subtle)" : "var(--surface-hover)" } }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{t.slid}</Typography>
                      <Typography sx={{ fontSize: 11.5, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{t.taskNumber}</Typography>
                      <Box sx={{ flex: 1 }} />
                      {overdue && <Badge tone="danger">Overdue</Badge>}
                      <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                    </Box>
                    <Typography sx={{ fontSize: 12, color: "var(--text-secondary)", mt: 0.25 }}>
                      {[t.customerName, t.team?.teamName].filter(Boolean).join(" · ") || "—"}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.5, fontSize: 12, color: "var(--text-muted)" }}>
                      <Badge tone={STATUS_TONE[t.status]} dot>{t.status}</Badge>
                      {t.lastStep ? <span>{t.lastStep.transactionType}{t.lastStep.transactionState ? ` · ${t.lastStep.transactionState}` : ""} · {format(new Date(t.lastStep.eventDate || t.lastTicketAt), "d MMM")}</span> : <span>No steps yet · created {format(new Date(t.createdAt), "d MMM")}</span>}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </SectionCard>

      <SectionCard
        title={selected ? `${selected.slid} · ${selected.taskNumber}` : "Record tickets"}
        description={selected ? [selected.customerName, selected.team?.teamName, selected.faultType].filter(Boolean).join(" · ") : "Pick a task from the queue."}
        actions={selected && <Button variant="outlined" size="small" onClick={() => setDetailsId(selected._id)}>Task details</Button>}
      >
        {selected ? (
          <TicketPanel key={selected._id} task={selected} onChanged={changed} />
        ) : (
          <EmptyState minHeight={260} icon={<ConfirmationNumberOutlined sx={{ fontSize: 20 }} />} title="No task selected" description="Each step you record is added to the task's processing log and sets its status." />
        )}
      </SectionCard>

      <MaintenanceTaskSheet key={detailsId || "none"} taskId={detailsId} onClose={() => setDetailsId(null)} onEdit={(t) => { setDetailsId(null); setEditing(t); }} onChanged={changed} />
      <MaintenanceTaskForm open={Boolean(editing)} task={editing} teams={teams} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); changed(); }} />
    </Box>
  );
};

export default MaintenanceProcessingPage;
