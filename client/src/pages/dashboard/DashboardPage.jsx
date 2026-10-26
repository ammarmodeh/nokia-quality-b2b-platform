import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Button, IconButton, Popover, TextField, Tooltip, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import PollOutlined from "@mui/icons-material/PollOutlined";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { endOfDay, format } from "date-fns";
import api from "../../api/api";
import { useTaskSummaries } from "../../api/taskStore";
import { cachedGet, clearCachedGet } from "../../api/requestCache";
import PageHeader from "../../components/ui/PageHeader";
import FilterChip from "../../components/ui/FilterChip";
import ErrorState from "../../components/ui/ErrorState";
import PageLoader from "../../components/ui/PageLoader";
import NpsPerformance from "./NpsPerformance";
import NpsTrends from "./NpsTrends";
import { PERIODS, resolvePeriod, yearsNeeded } from "./npsPeriods";
import { ACCOUNTABILITY_OPTIONS, accountabilityOf, filterByAccountability } from "../../utils/accountability";

const TeamViolationTracker = lazy(() => import("../../components/TeamViolationTracker"));
const SamplesTokenDialog = lazy(() => import("../../components/SamplesTokenDialog"));

const PeriodPicker = ({ value, from, to, onChange }) => {
  const [anchor, setAnchor] = useState(null);
  const [draft, setDraft] = useState({ from: from || "", to: to || "" });
  const label = value === "custom" && from && to ? `${format(new Date(from), "MMM d")} – ${format(new Date(to), "MMM d, yyyy")}` : PERIODS.find((p) => p.value === value)?.label || "This week";
  return (
    <>
      <Button variant="outlined" startIcon={<CalendarMonthOutlined sx={{ fontSize: 17 }} />} endIcon={<ExpandMore sx={{ fontSize: 17 }} />} onClick={(e) => setAnchor(e.currentTarget)} aria-haspopup="dialog">
        {label}
      </Button>
      <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { mt: 0.75, width: 280, p: 0.5 } } }}>
        {PERIODS.filter((p) => p.value !== "custom").map((p) => (
          <Box
            key={p.value}
            component="button"
            type="button"
            onClick={() => {
              onChange({ period: p.value, from: "", to: "" });
              setAnchor(null);
            }}
            sx={{ display: "flex", width: "100%", border: 0, background: value === p.value ? "var(--accent-subtle)" : "none", font: "inherit", fontSize: 13, textAlign: "left", cursor: "pointer", px: 1.25, height: 32, alignItems: "center", borderRadius: "5px", color: value === p.value ? "var(--accent-text)" : "var(--text)", fontWeight: value === p.value ? 600 : 400, "&:hover": { backgroundColor: value === p.value ? "var(--accent-subtle)" : "var(--surface-hover)" } }}
          >
            {p.label}
          </Box>
        ))}
        <Box sx={{ borderTop: "1px solid var(--border)", mt: 0.5, p: 1.25 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", mb: 1 }}>Custom range</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
            <TextField type="date" label="From" value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="date" label="To" value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
          </Box>
          <Button
            fullWidth
            variant="contained"
            sx={{ mt: 1.25 }}
            disabled={!draft.from || !draft.to || draft.from > draft.to}
            onClick={() => {
              onChange({ period: "custom", ...draft });
              setAnchor(null);
            }}
          >
            Apply range
          </Button>
        </Box>
      </Popover>
    </>
  );
};

const DashboardPage = () => {
  const [params, setParams] = useSearchParams();
  const period = params.get("period") || "week";
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const grain = params.get("grain") || "week";
  const teamFilter = useMemo(() => (params.get("team") ? params.get("team").split(",").filter(Boolean) : []), [params]);
  const accFilter = useMemo(() => (params.get("acc") ? params.get("acc").split(",").filter(Boolean) : []), [params]);

  const setQuery = useCallback(
    (patch) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            const isDefault = (k === "period" && v === "week") || (k === "grain" && v === "week");
            if (!v || (Array.isArray(v) && !v.length) || isDefault) next.delete(k);
            else next.set(k, Array.isArray(v) ? v.join(",") : v);
          }
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );

  const [teams, setTeams] = useState([]);
  const [samples, setSamples] = useState([]);
  const [settings, setSettings] = useState(null);
  const [refLoading, setRefLoading] = useState(true);
  const [refError, setRefError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [samplesOpen, setSamplesOpen] = useState(false);
  // Explicit refresh: drop cached reference data so the dashboard and tracker share one fresh request each.
  const reload = useCallback(() => {
    clearCachedGet("/samples-token/");
    setRefresh((r) => r + 1);
  }, []);

  useEffect(() => {
    const onRefresh = () => reload();
    window.addEventListener("dashboard-refresh", onRefresh);
    return () => window.removeEventListener("dashboard-refresh", onRefresh);
  }, [reload]);

  // Slim task rows from the shared cache: a revisit renders instantly and revalidates (304 when unchanged).
  const { data: taskRows, error: tasksError } = useTaskSummaries({}, refresh);
  const tasks = useMemo(() => taskRows || [], [taskRows]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRefError(null);
      try {
        const [ft, st, ...yrs] = await Promise.all([
          api.get("/field-teams/get-field-teams"),
          api.get("/settings"),
          ...yearsNeeded().map((y) => cachedGet(`/samples-token/${y}`).catch(() => ({ data: [] }))),
        ]);
        if (cancelled) return;
        setTeams((ft.data || []).map((team) => ({ ...team, evaluationScore: team.evaluationScore || 0, isEvaluated: team.isEvaluated || false })));
        setSettings(st.data || {});
        setSamples(yrs.flatMap((r) => r.data || []));
      } catch (e) {
        if (!cancelled) setRefError(e?.response?.data?.message || "Check your connection and try again.");
      } finally {
        if (!cancelled) setRefLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    if (taskRows) setUpdatedAt(new Date());
  }, [taskRows]);

  const loading = refLoading || (!taskRows && !tasksError);
  const error = refError || (tasksError ? tasksError?.response?.data?.message || "Check your connection and try again." : null);

  const resolved = useMemo(() => resolvePeriod(period, settings || {}, { from, to }), [period, settings, from, to]);
  const [customSummary, setCustomSummary] = useState(null);
  const rangeFrom = resolved.current.start?.toISOString();
  const rangeTo = resolved.current.end ? endOfDay(resolved.current.end).toISOString() : undefined;
  const teamKey = teamFilter.join(",");
  const periodLabel = resolved.current.label;
  useEffect(() => {
    if (!settings) return undefined;
    let cancelled = false;
    // Custom tables with a mapped date (and optionally field team) roll into the tracker for the selected period.
    api
      .get("/custom-tables/summary", { params: { from: rangeFrom, to: rangeTo, team: teamKey || undefined } })
      .then((r) => !cancelled && setCustomSummary({ ...r.data, label: periodLabel }))
      .catch(() => !cancelled && setCustomSummary(null));
    return () => {
      cancelled = true;
    };
  }, [settings, rangeFrom, rangeTo, teamKey, refresh, periodLabel]);
  // accountability applies to every section; the field-team filter as before
  const accTasks = useMemo(() => filterByAccountability(tasks, accFilter), [tasks, accFilter]);
  const scopedTasks = useMemo(() => (teamFilter.length ? accTasks.filter((t) => teamFilter.includes(t.teamName)) : accTasks), [accTasks, teamFilter]);
  const accOptions = useMemo(() => {
    const c = {};
    for (const t of teamFilter.length ? tasks.filter((x) => teamFilter.includes(x.teamName)) : tasks) c[accountabilityOf(t)] = (c[accountabilityOf(t)] || 0) + 1;
    return ACCOUNTABILITY_OPTIONS.map((o) => ({ ...o, hint: c[o.value] || 0 }));
  }, [tasks, teamFilter]);

  const teamOptions = useMemo(() => {
    const counts = new Map();
    for (const t of tasks) if (t.teamName) counts.set(t.teamName, (counts.get(t.teamName) || 0) + 1);
    return teams
      .filter((t) => t.teamName)
      .map((t) => ({ value: t.teamName, label: t.teamName, hint: counts.get(t.teamName) || undefined }))
      .sort((a, b) => (b.hint || 0) - (a.hint || 0));
  }, [teams, tasks]);

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        description="How FTTH installation quality is tracking right now."
        actions={
          <>
            {updatedAt && (
              <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)", alignSelf: "center", mr: 0.5, display: { xs: "none", md: "block" } }}>
                Updated {format(updatedAt, "h:mm a")}
              </Typography>
            )}
            <Tooltip title="Refresh">
              <IconButton aria-label="Refresh dashboard" onClick={() => reload()} sx={{ width: 32, height: 32, border: "1px solid var(--border)", backgroundColor: "var(--surface)", boxShadow: "var(--shadow-xs)" }}>
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Button variant="outlined" startIcon={<PollOutlined sx={{ fontSize: 17 }} />} onClick={() => setSamplesOpen(true)}>
              Survey samples
            </Button>
            <PeriodPicker key={`${period}-${from}-${to}`} value={period} from={from} to={to} onChange={setQuery} />
          </>
        }
      >
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
          <FilterChip label="Field team" options={teamOptions} value={teamFilter} onChange={(v) => setQuery({ team: v })} searchable />
          <FilterChip label="Accountability" options={accOptions} value={accFilter} onChange={(v) => setQuery({ acc: v })} />
          {(teamFilter.length > 0 || accFilter.length > 0) && (
            <Button variant="text" size="small" onClick={() => setQuery({ team: [], acc: [] })} sx={{ color: "var(--text-secondary)", height: 28 }}>
              Clear
            </Button>
          )}
        </Box>
      </PageHeader>

      {error && <ErrorState title="The dashboard didn't load" message={error} onRetry={() => { setRefLoading(true); reload(); }} sx={{ mb: 3 }} />}

      {loading ? (
        <PageLoader minHeight={420} variant="cards" />
      ) : (
        !error && (
          <>
            <NpsPerformance tasks={scopedTasks} samples={samples} settings={settings} period={resolved} teamFilter={teamFilter} />
            <NpsTrends tasks={scopedTasks} samples={samples} settings={settings} grain={grain} onGrainChange={(g) => setQuery({ grain: g })} />
            <Suspense fallback={<PageLoader minHeight={240} variant="table" rows={5} />}>
              <TeamViolationTracker tasks={accTasks} initialFieldTeams={teams} teamFilter={teamFilter} customSummary={customSummary} period={resolved.current} reloadKey={refresh} onTaskUpdated={() => reload()} />
            </Suspense>
          </>
        )
      )}

      <Suspense fallback={null}>
        {samplesOpen && (
          <SamplesTokenDialog
            open={samplesOpen}
            onClose={() => {
              setSamplesOpen(false);
              reload();
            }}
          />
        )}
      </Suspense>
    </Box>
  );
};

export default DashboardPage;
