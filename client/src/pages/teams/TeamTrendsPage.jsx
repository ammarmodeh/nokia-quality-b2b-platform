import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Box, Button, InputBase, Switch, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import TrendingUpOutlined from "@mui/icons-material/TrendingUpOutlined";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import { toast } from "sonner";
import api from "../../api/api";
import PageHeader from "../../components/ui/PageHeader";
import PeriodPicker from "../../components/ui/PeriodPicker";
import SegmentedControl from "../../components/ui/SegmentedControl";
import FilterChip from "../../components/ui/FilterChip";
import StatCard from "../../components/ui/StatCard";
import SectionCard from "../../components/ui/SectionCard";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import PageLoader from "../../components/ui/PageLoader";
import Badge from "../../components/ui/Badge";
import { exportRows } from "../../utils/exportRows";
import { resolvePeriod } from "../dashboard/npsPeriods";
import { TREND_METRICS, TREND_PERIODS, effectiveMetric, monthsCovered, trendQuery } from "./trendPeriods";

const WORST_COUNT = 5; // teams flagged as "worst" in the table and chart

const fmtPct = (v) => (v == null ? "—" : `${v}%`);
const fmtNum = (v) => (v == null ? "—" : v.toLocaleString());

const COLUMNS = [
  { key: "rank", label: "Rank", align: "right", get: (r) => r.rank ?? Infinity, render: (r) => r.rank ?? "—" },
  { key: "teamName", label: "Team", get: (r) => r.teamName.toLowerCase() },
  { key: "perSamplePct", label: "DVOC / sample", align: "right", get: (r) => r.perSamplePct, render: (r) => fmtPct(r.perSamplePct), title: "Accountable DVOC ÷ (survey samples − non-accountable)" },
  { key: "perOnlinePct", label: "DVOC / online", align: "right", get: (r) => r.perOnlinePct, render: (r) => fmtPct(r.perOnlinePct), title: "Accountable DVOC ÷ online transactions" },
  { key: "reachAccountable", label: "REACH owned", align: "right", get: (r) => r.reachAccountable, render: (r) => fmtNum(r.reachAccountable), title: "Accountable DVOC where REACH is the responsible owner" },
  { key: "accountable", label: "Accountable", align: "right", get: (r) => r.accountable, render: (r) => fmtNum(r.accountable) },
  { key: "dvoc", label: "All DVOC", align: "right", get: (r) => r.dvoc, render: (r) => fmtNum(r.dvoc) },
  { key: "samples", label: "Samples", align: "right", get: (r) => r.samples, render: (r) => fmtNum(r.samples) },
  { key: "online", label: "Online", align: "right", get: (r) => r.online, render: (r) => fmtNum(r.online) },
  { key: "change", label: "vs previous", align: "right", get: (r) => r.change, render: null },
];

const useTrends = (period, metric, settings, refresh) => {
  const [state, setState] = useState({ current: null, previous: null, loading: true, error: null });
  const curQ = period ? trendQuery(period.current, metric) : null;
  const prevQ = period ? trendQuery(period.previous, metric) : null;
  const key = JSON.stringify([curQ, prevQ]);
  useEffect(() => {
    if (!settings || !curQ) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    // Current and previous period in parallel; the previous one only feeds the "vs previous" column.
    Promise.all([api.get("/team-trends", { params: curQ }), api.get("/team-trends", { params: prevQ }).catch(() => ({ data: null }))])
      .then(([c, p]) => !cancelled && setState({ current: c.data, previous: p.data, loading: false, error: null }))
      .catch((e) => !cancelled && setState({ current: null, previous: null, loading: false, error: e?.response?.data?.message || "Check your connection and try again." }));
    return () => {
      cancelled = true;
    };
  }, [key, settings, refresh]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
};

const ChartTooltip = ({ active, payload, metric }) => {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <Box sx={{ p: 1.25, borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", boxShadow: "var(--shadow-md)", minWidth: 200 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>#{r.rank} · {r.teamName}</Typography>
      <Typography sx={{ fontSize: 12, color: "var(--text-secondary)", mt: 0.5 }}>{metric.label}: <strong>{metric.format(r[metric.field])}</strong></Typography>
      <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)", mt: 0.25 }}>
        {r.accountable} accountable of {r.dvoc} DVOC{r.samples != null ? ` · ${r.samples} samples` : ""}{r.online != null ? ` · ${r.online.toLocaleString()} online` : ""}
      </Typography>
    </Box>
  );
};

const Change = ({ value, metric }) => {
  if (value == null) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  if (value === 0) return <span style={{ color: "var(--text-muted)" }}>0</span>;
  const worse = value > 0; // higher is worse for every metric here
  const Arrow = worse ? ArrowUpward : ArrowDownward;
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, fontWeight: 600, color: worse ? "var(--danger)" : "var(--success)" }}>
      <Arrow sx={{ fontSize: 13 }} />
      {Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}{metric.rate ? " pts" : ""}
    </Box>
  );
};

const TeamTrendsPage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const periodKey = params.get("period") || "lastWeek";
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const metricKey = params.get("metric") || "perSample";
  const companyFilter = useMemo(() => (params.get("company") ? params.get("company").split(",").filter(Boolean) : []), [params]);
  const [q, setQ] = useState("");
  const [showIdle, setShowIdle] = useState(false);
  const [sort, setSort] = useState({ key: "rank", dir: "asc" });
  const [settings, setSettings] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const setQuery = useCallback(
    (patch) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            const isDefault = (k === "period" && v === "lastWeek") || (k === "metric" && v === "perSample");
            if (!v || (Array.isArray(v) && !v.length) || isDefault) next.delete(k);
            else next.set(k, Array.isArray(v) ? v.join(",") : v);
          }
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );

  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data || {})).catch(() => setSettings({}));
  }, []);

  const period = useMemo(() => (settings ? resolvePeriod(periodKey, settings, { from, to }) : null), [periodKey, settings, from, to]);
  const months = useMemo(() => (period ? monthsCovered(period.current.start, period.current.end) : []), [period]);
  const metric = effectiveMetric(metricKey, months);
  const requested = TREND_METRICS.find((m) => m.value === metricKey) || TREND_METRICS[0];
  const fellBack = metric.value !== requested.value;

  const { current, previous, loading, error } = useTrends(period, metric.value, settings, refresh);

  // Previous-period value per team, for the "vs previous" column.
  const prevByTeam = useMemo(() => new Map((previous?.rows || []).map((r) => [r.key, r])), [previous]);
  const rows = useMemo(() => {
    const list = (current?.rows || []).map((r) => {
      const p = prevByTeam.get(r.key);
      const now = r[metric.field];
      const before = p ? p[metric.field] : null;
      return { ...r, change: now != null && before != null ? +(now - before).toFixed(2) : null };
    });
    return list;
  }, [current, prevByTeam, metric.field]);

  const companyOptions = useMemo(() => {
    const c = new Map();
    for (const r of rows) {
      const k = r.teamCompany || "Not set";
      c.set(k, (c.get(k) || 0) + 1);
    }
    return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => ({ value: v, label: v, hint: n }));
  }, [rows]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = rows.filter((r) => (showIdle || r.dvoc > 0 || r.samples || r.online) && (!needle || r.teamName.toLowerCase().includes(needle) || (r.teamCode || "").toLowerCase().includes(needle)) && (!companyFilter.length || companyFilter.includes(r.teamCompany || "Not set")));
    const col = COLUMNS.find((c) => c.key === sort.key) || COLUMNS[0];
    list = [...list].sort((a, b) => {
      const av = col.get(a);
      const bv = col.get(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // missing values always last
      if (bv == null) return -1;
      const d = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === "asc" ? d : -d;
    });
    return list;
  }, [rows, q, showIdle, companyFilter, sort]);

  const ranked = useMemo(() => rows.filter((r) => r.rank != null && r[metric.field] > 0), [rows, metric.field]);
  const chartRows = ranked.slice(0, 10);
  const worst = ranked[0];
  const summary = current?.summary;
  const prevSummary = previous?.summary;
  const delta = (k) => (summary?.[k] != null && prevSummary?.[k] != null ? +(summary[k] - prevSummary[k]).toFixed(2) : undefined);

  const onSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "teamName" || key === "rank" ? "asc" : "desc" }));

  const onExport = () => {
    try {
      const name = exportRows(
        visible,
        [
          ["Rank", (r) => r.rank],
          ["Team", (r) => r.teamName],
          ["Team code", (r) => r.teamCode],
          ["Company", (r) => r.teamCompany],
          ["Accountable DVOC / survey sample %", (r) => r.perSamplePct],
          ["Accountable DVOC / online %", (r) => r.perOnlinePct],
          ["Accountable DVOC · REACH ownership", (r) => r.reachAccountable],
          ["Accountable DVOC", (r) => r.accountable],
          ["Non-accountable DVOC", (r) => r.notAccountable],
          ["All DVOC", (r) => r.dvoc],
          ["Survey samples", (r) => r.samples],
          ["Adjusted samples", (r) => r.adjustedSamples],
          ["Online transactions", (r) => r.online],
          [`Change vs previous (${metric.label})`, (r) => r.change],
        ],
        { filename: `team-trends-${metric.value}`, sheet: "Team trends" }
      );
      toast.success(`Exported ${name}`);
    } catch {
      toast.error("Couldn't build the export");
    }
  };

  return (
    <Box>
      <PageHeader
        title="Team trends"
        description="Teams with the worst accountable DVOC for the period, worst first."
        actions={
          <>
            <Button variant="outlined" startIcon={<FileDownloadOutlined sx={{ fontSize: 17 }} />} onClick={onExport} disabled={!visible.length}>
              Export
            </Button>
            <PeriodPicker key={`${periodKey}-${from}-${to}`} periods={TREND_PERIODS} value={periodKey} from={from} to={to} onChange={setQuery} />
          </>
        }
      >
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <SegmentedControl ariaLabel="Ranking metric" value={metricKey} onChange={(v) => setQuery({ metric: v })} options={TREND_METRICS.map((m) => ({ value: m.value, label: m.label }))} />
          {period && <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)", ml: 0.5 }}>{period.current.label} · {period.current.sub}</Typography>}
        </Box>
      </PageHeader>

      {fellBack && (
        <Box role="note" sx={{ display: "flex", gap: 1, alignItems: "flex-start", p: 1.5, mb: 2, borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface-subtle)" }}>
          <InfoOutlined sx={{ fontSize: 17, color: "var(--text-secondary)", mt: "1px" }} />
          <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
            Survey samples and online transactions are recorded per team per month, so “{requested.label}” needs a whole-month period. Ranking by total accountable DVOC instead. Pick Last month, Current month or a custom range of whole months to see rates.
          </Typography>
        </Box>
      )}

      {error && <ErrorState title="Team trends didn't load" message={error} onRetry={() => setRefresh((r) => r + 1)} sx={{ mb: 3 }} />}

      {!current && loading ? (
        <PageLoader minHeight={420} variant="cards" />
      ) : (
        current && (
          <Box sx={{ opacity: loading ? 0.6 : 1, transition: "opacity .15s" }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" }, gap: 1.5, mb: 2 }}>
              <StatCard label="Worst team" value={worst ? worst.teamName : "—"} hint={worst ? `${metric.format(worst[metric.field])} · ${metric.label.toLowerCase()}` : "No accountable DVOC"} sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }} icon={<TrendingUpOutlined sx={{ fontSize: 15 }} />} />
              <StatCard label="Accountable DVOC" value={fmtNum(summary.accountable)} hint={`of ${fmtNum(summary.dvoc)} DVOC`} delta={delta("accountable")} goodWhen="down" />
              <StatCard label="DVOC / survey sample" value={fmtPct(summary.perSamplePct)} hint={summary.samples != null ? `${fmtNum(summary.samples)} samples` : months.length ? "No samples entered" : "Needs whole months"} delta={delta("perSamplePct")} deltaSuffix=" pts" goodWhen="down" />
              <StatCard label="DVOC / online" value={fmtPct(summary.perOnlinePct)} hint={summary.online != null ? `${fmtNum(summary.online)} online` : months.length ? "No online data" : "Needs whole months"} delta={delta("perOnlinePct")} deltaSuffix=" pts" goodWhen="down" />
              <StatCard label="REACH ownership" value={fmtNum(summary.reachAccountable)} hint="accountable, REACH owner" delta={delta("reachAccountable")} goodWhen="down" />
            </Box>

            <SectionCard title={`Worst ${Math.min(10, chartRows.length) || ""} teams · ${metric.label}`} description={metric.description} sx={{ mb: 2 }}>
              {chartRows.length ? (
                <Box sx={{ height: Math.max(180, chartRows.length * 34 + 30) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRows} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
                      <CartesianGrid horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 11.5, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => (metric.rate ? `${v}%` : v)} allowDecimals={metric.rate} />
                      <YAxis type="category" dataKey="teamName" width={140} tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: "var(--surface-hover)" }} content={<ChartTooltip metric={metric} />} />
                      <Bar dataKey={metric.field} radius={[0, 4, 4, 0]} barSize={18} onClick={(d) => d?.teamId && navigate(`/team-analysis/${d.teamId}`)} style={{ cursor: "pointer" }}>
                        {chartRows.map((r) => (
                          <Cell key={r.key} fill={r.rank <= WORST_COUNT ? "var(--danger)" : "var(--warning)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <EmptyState minHeight={180} title="No accountable DVOC in this period" description={metric.rate && !summary.samples && metric.value === "perSample" ? "No team survey samples are entered for these months." : "Every team is at zero for this metric."} />
              )}
            </SectionCard>

            <SectionCard
              title="All teams"
              description={`${visible.length.toLocaleString()} of ${rows.length.toLocaleString()} teams · ranked by ${metric.label.toLowerCase()}`}
              padding={0}
              actions={
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, height: 30, px: 1, border: "1px solid var(--border)", borderRadius: "6px", backgroundColor: "var(--surface)", width: { xs: 150, sm: 200 } }}>
                    <SearchIcon sx={{ fontSize: 16, color: "var(--text-muted)" }} />
                    <InputBase value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team or code" sx={{ fontSize: 13, flex: 1 }} inputProps={{ "aria-label": "Search teams" }} />
                  </Box>
                  <FilterChip label="Company" options={companyOptions} value={companyFilter} onChange={(v) => setQuery({ company: v })} />
                  <Box component="label" sx={{ display: "flex", alignItems: "center", fontSize: 12.5, color: "var(--text-secondary)", cursor: "pointer" }}>
                    <Switch size="small" checked={showIdle} onChange={(e) => setShowIdle(e.target.checked)} />
                    No activity
                  </Box>
                </Box>
              }
            >
              {visible.length ? (
                <Box sx={{ overflowX: "auto" }}>
                  <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 13, "& th, & td": { px: 1.5, py: 1, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }, "& tbody tr:hover": { backgroundColor: "var(--surface-hover)" } }}>
                    <thead>
                      <tr>
                        {COLUMNS.map((c) => (
                          <Box component="th" key={c.key} scope="col" title={c.title} aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} sx={{ textAlign: c.align || "left", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", backgroundColor: "var(--surface-subtle)", position: "sticky", top: 0 }}>
                            <Box component="button" type="button" onClick={() => onSort(c.key)} sx={{ border: 0, background: "none", font: "inherit", color: c.key === metric.field || (c.key === "rank" && sort.key === "rank") ? "var(--text)" : "inherit", cursor: "pointer", p: 0, display: "inline-flex", alignItems: "center", gap: 0.25 }}>
                              {c.label}
                              {sort.key === c.key && (sort.dir === "asc" ? <ArrowUpward sx={{ fontSize: 12 }} /> : <ArrowDownward sx={{ fontSize: 12 }} />)}
                            </Box>
                          </Box>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((r) => (
                        <Box component="tr" key={r.key} onClick={() => r.teamId && navigate(`/team-analysis/${r.teamId}`)} sx={{ cursor: r.teamId ? "pointer" : "default" }}>
                          {COLUMNS.map((c) => (
                            <Box component="td" key={c.key} sx={{ textAlign: c.align || "left", fontVariantNumeric: "tabular-nums", fontWeight: c.key === metric.field ? 600 : 400, color: c.key === metric.field ? "var(--text)" : "var(--text-secondary)" }}>
                              {c.key === "teamName" ? (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <span style={{ color: "var(--text)", fontWeight: 500 }}>{r.teamName}</span>
                                  {r.rank != null && r.rank <= WORST_COUNT && r[metric.field] > 0 && <Badge tone="danger">Worst {WORST_COUNT}</Badge>}
                                  {r.isTerminated && <Badge>Terminated</Badge>}
                                  {r.teamCompany && <Typography component="span" sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>{r.teamCompany}</Typography>}
                                </Box>
                              ) : c.key === "change" ? (
                                <Change value={r.change} metric={metric} />
                              ) : (
                                c.render(r)
                              )}
                            </Box>
                          ))}
                        </Box>
                      ))}
                    </tbody>
                  </Box>
                </Box>
              ) : (
                <EmptyState minHeight={200} title={rows.length ? "No teams match" : "No team activity in this period"} description={rows.length ? "Try another search or company, or include teams with no activity." : "No DVOC, samples or online data were recorded for any team."} />
              )}
            </SectionCard>
            <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)", mt: 1.5 }}>
              DVOC = survey tasks with an interview date in the period. A task counts once per team. “—” means the denominator wasn’t entered or is zero, so no rate is shown; those teams aren’t ranked on rate metrics.
            </Typography>
          </Box>
        )
      )}
    </Box>
  );
};

export default TeamTrendsPage;
