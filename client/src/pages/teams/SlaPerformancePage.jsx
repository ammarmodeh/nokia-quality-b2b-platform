import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Box, Button, InputBase, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import TimerOffOutlined from "@mui/icons-material/TimerOffOutlined";
import { toast } from "sonner";
import { endOfDay, format } from "date-fns";
import api from "../../api/api";
import { slaApi } from "../../api/slaApi";
import PageHeader from "../../components/ui/PageHeader";
import PeriodPicker from "../../components/ui/PeriodPicker";
import FilterChip from "../../components/ui/FilterChip";
import StatCard from "../../components/ui/StatCard";
import SectionCard from "../../components/ui/SectionCard";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import PageLoader from "../../components/ui/PageLoader";
import Badge from "../../components/ui/Badge";
import Sheet from "../../components/ui/Sheet";
import { exportRows } from "../../utils/exportRows";
import { PERIODS, resolvePeriod } from "../dashboard/npsPeriods";

const SLA_PERIODS = [...PERIODS.filter((p) => p.value !== "custom"), { value: "all", label: "All time" }, { value: "custom", label: "Custom range" }];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const KINDS = [
  { value: "task", label: "DVOC tasks" },
  { value: "issue", label: "OJO snags / complaints" },
  { value: "row", label: "Tracker rows" },
];

/** Hours → "5 h" / "3.2 d". */
const fmtH = (v) => (v == null ? "—" : v < 48 ? `${Math.round(v * 10) / 10} h` : `${Math.round((v / 24) * 10) / 10} d`);
const fmtPct = (v) => (v == null ? "—" : `${v}%`);
const fmtN = (v) => (v == null ? "—" : v.toLocaleString());

const COLUMNS = [
  { key: "rank", label: "Rank", align: "right", get: (r) => r.rank ?? Infinity, render: (r) => r.rank ?? "—" },
  { key: "teamName", label: "Team", get: (r) => r.teamName.toLowerCase() },
  { key: "breachRate", label: "Breach rate", align: "right", get: (r) => r.breachRate, render: (r) => fmtPct(r.breachRate), title: "Breached ÷ (met + breached)" },
  { key: "breached", label: "Breached", align: "right", get: (r) => r.breached },
  { key: "overdueOpen", label: "Overdue now", align: "right", get: (r) => r.overdueOpen, title: "Still open past the deadline (included in Breached)" },
  { key: "met", label: "Met", align: "right", get: (r) => r.met },
  { key: "open", label: "Open, on time", align: "right", get: (r) => r.open },
  { key: "total", label: "Total", align: "right", get: (r) => r.total },
  { key: "avgResponseHours", label: "Avg response", align: "right", get: (r) => r.avgResponseHours, render: (r) => fmtH(r.avgResponseHours), title: "Ticket creation → team response, answered tickets only" },
  { key: "medianResponseHours", label: "Median", align: "right", get: (r) => r.medianResponseHours, render: (r) => fmtH(r.medianResponseHours) },
  { key: "p90ResponseHours", label: "90th pct", align: "right", get: (r) => r.p90ResponseHours, render: (r) => fmtH(r.p90ResponseHours), title: "9 in 10 responses were at least this fast" },
  { key: "avgOverrunHours", label: "Avg overrun", align: "right", get: (r) => r.avgOverrunHours, render: (r) => fmtH(r.avgOverrunHours), title: "Average time past the deadline on breached SLAs" },
  { key: "worstOpenOverdueHours", label: "Longest overdue", align: "right", get: (r) => r.worstOpenOverdueHours, render: (r) => (r.overdueOpen ? fmtH(r.worstOpenOverdueHours) : "—") },
  { key: "noResponse", label: "No response", align: "right", get: (r) => r.noResponse },
  { key: "exempt", label: "Customer resched.", align: "right", get: (r) => r.exempt, title: "Customer-requested reschedules — not counted against the team" },
];

const TipRow = ({ label, value, color }) => (
  <Box sx={{ display: "flex", gap: 2, fontSize: 12, py: 0.2 }}>
    <span style={{ flex: 1, color: "var(--text-secondary)" }}>{label}</span>
    <span style={{ fontWeight: 600, color: color || "var(--text)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
  </Box>
);
const TeamTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <Box sx={{ p: 1.25, borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", boxShadow: "var(--shadow-md)", minWidth: 220 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.5 }}>#{r.rank} · {r.teamName}</Typography>
      <TipRow label="Breached" value={`${r.breached} (${fmtPct(r.breachRate)})`} color="var(--danger)" />
      <TipRow label="… still overdue now" value={r.overdueOpen} />
      <TipRow label="Met" value={r.met} color="var(--success)" />
      <TipRow label="Open, on time" value={r.open} />
      <TipRow label="Avg / median response" value={`${fmtH(r.avgResponseHours)} / ${fmtH(r.medianResponseHours)}`} />
      <TipRow label="Avg overrun" value={fmtH(r.avgOverrunHours)} />
    </Box>
  );
};
const TrendTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <Box sx={{ p: 1.25, borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", boxShadow: "var(--shadow-md)", minWidth: 200 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.5 }}>Week of {format(new Date(r.week), "d MMM yyyy")}</Typography>
      <TipRow label="Met" value={r.met} color="var(--success)" />
      <TipRow label="Breached" value={r.breached} color="var(--danger)" />
      <TipRow label="Open, on time" value={r.open} />
      <TipRow label="Breach rate" value={fmtPct(r.breachRate)} />
      <TipRow label="Median response" value={fmtH(r.medianResponseHours)} />
    </Box>
  );
};

const BreakdownTable = ({ rows }) => (
  <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, "& th, & td": { px: 1, py: 0.75, borderBottom: "1px solid var(--border)", textAlign: "right", whiteSpace: "nowrap" }, "& th:first-of-type, & td:first-of-type": { textAlign: "left", whiteSpace: "normal" }, "& th": { color: "var(--text-secondary)", fontWeight: 600, fontSize: 12 } }}>
    <thead><tr><th>Group</th><th>Total</th><th>Breached</th><th>Breach rate</th><th>Median response</th></tr></thead>
    <tbody>
      {rows.map((r) => (
        <tr key={r.label}><td>{r.label}</td><td>{r.total}</td><td style={{ color: r.breached ? "var(--danger)" : undefined }}>{r.breached}</td><td>{fmtPct(r.breachRate)}</td><td>{fmtH(r.medianResponseHours)}</td></tr>
      ))}
    </tbody>
  </Box>
);

const TeamSlaSheet = ({ team, onClose, navigate }) => {
  const [items, setItems] = useState(null);
  useEffect(() => {
    if (!team?.teamId) return setItems(team ? [] : null);
    setItems(null);
    slaApi.list({ teamId: team.teamId, limit: 200 }).then(setItems).catch(() => setItems([]));
  }, [team]);
  const STATUS = { breached: ["danger", "Breached"], about_to_breach: ["warning", "Due soon"], active: ["accent", "Open"], met: ["success", "Met"], cancelled: ["neutral", "Cancelled"], rescheduled: ["neutral", "Rescheduled"] };
  return (
    <Sheet open={Boolean(team)} onClose={onClose} width={640} title={team?.teamName || ""} description={team ? `${team.total} SLAs · ${fmtPct(team.breachRate)} breached · median response ${fmtH(team.medianResponseHours)}` : ""} actions={team?.teamId && <Button variant="outlined" onClick={() => navigate(`/team-analysis/${team.teamId}`)}>Team analysis</Button>}>
      {!team?.teamId ? (
        <Typography sx={{ fontSize: 13, color: "var(--text-muted)" }}>These SLAs aren’t linked to a field team.</Typography>
      ) : !items ? (
        <Typography sx={{ fontSize: 13, color: "var(--text-muted)" }}>Loading…</Typography>
      ) : !items.length ? (
        <Typography sx={{ fontSize: 13, color: "var(--text-muted)" }}>No SLA records.</Typography>
      ) : (
        <Box>
          <Typography sx={{ fontSize: 12, color: "var(--text-muted)", mb: 1 }}>All of this team’s SLAs (latest 200, any period), earliest deadline first.</Typography>
          {items.map((s) => {
            const [tone, label] = STATUS[s.teamExempt && s.computedStatus !== "met" ? "met" : s.computedStatus] || ["neutral", s.computedStatus];
            return (
              <Box key={s._id} sx={{ py: 1, borderBottom: "1px solid var(--border)" }}>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{s.slid || "—"}</Typography>
                  <Typography dir="auto" sx={{ fontSize: 12.5, color: "var(--text-secondary)", flex: 1, minWidth: 0 }}>{s.title}</Typography>
                  <Badge tone={tone} dot>{label}</Badge>
                  {s.teamExempt && <Badge>Customer resched.</Badge>}
                </Box>
                <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {[s.issueCategory, s.issueSubCategory].filter(Boolean).join(" · ")} · {s.priority} · {s.slaHours} h SLA · deadline {format(new Date(s.targetDate), "d MMM yyyy, HH:mm")}
                  {s.computedStatus === "breached" && s.status === "active" ? ` · overdue ${fmtH(-s.hoursRemaining)}` : ""}
                  {s.responseDate ? ` · responded ${format(new Date(s.responseDate), "d MMM, HH:mm")}` : ""}
                  {s.noResponse ? " · no response" : ""}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Sheet>
  );
};

const SlaPerformancePage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const periodKey = params.get("period") || "ytd";
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const list = (k) => (params.get(k) ? params.get(k).split(",").filter(Boolean) : []);
  const categories = list("category");
  const priorities = list("priority");
  const kinds = list("kind");
  const companies = list("company");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "rank", dir: "asc" });
  const [settings, setSettings] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [openTeam, setOpenTeam] = useState(null);

  const setQuery = useCallback(
    (patch) =>
      setParams((prev) => {
        const n = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (!v || (Array.isArray(v) && !v.length) || (k === "period" && v === "ytd")) n.delete(k);
          else n.set(k, Array.isArray(v) ? v.join(",") : v);
        }
        return n;
      }, { replace: true }),
    [setParams]
  );

  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data || {})).catch(() => setSettings({}));
  }, []);

  const period = useMemo(() => (settings && periodKey !== "all" ? resolvePeriod(periodKey, settings, { from, to }).current : null), [settings, periodKey, from, to]);
  const queryKey = JSON.stringify([period?.start, period?.end, params.get("category"), params.get("priority"), params.get("kind"), refresh]);

  useEffect(() => {
    if (!settings) return undefined;
    let cancelled = false;
    setLoading(true);
    slaApi
      .analytics({
        from: period ? period.start.toISOString() : undefined,
        to: period ? endOfDay(period.end).toISOString() : undefined,
        category: params.get("category") || undefined,
        priority: params.get("priority") || undefined,
        kind: params.get("kind") || undefined,
      })
      .then((d) => !cancelled && (setData(d), setError(null)))
      .catch((e) => !cancelled && setError(e?.response?.data?.message || "Check your connection and try again."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [queryKey, settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const teams = useMemo(() => data?.teams || [], [data]);
  const companyOptions = useMemo(() => {
    const c = new Map();
    for (const t of teams) c.set(t.teamCompany || "Not set", (c.get(t.teamCompany || "Not set") || 0) + 1);
    return [...c.entries()].map(([value, n]) => ({ value, label: value, hint: n }));
  }, [teams]);
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const col = COLUMNS.find((c) => c.key === sort.key) || COLUMNS[0];
    return teams
      .filter((t) => (!needle || t.teamName.toLowerCase().includes(needle) || (t.teamCode || "").toLowerCase().includes(needle)) && (!companies.length || companies.includes(t.teamCompany || "Not set")))
      .sort((a, b) => {
        const av = col.get(a);
        const bv = col.get(b);
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const d = av < bv ? -1 : av > bv ? 1 : 0;
        return sort.dir === "asc" ? d : -d;
      });
  }, [teams, q, sort, companies]);

  const s = data?.summary;
  const chartTeams = teams.filter((t) => t.breached > 0).slice(0, 12);
  const trend = (data?.trend || []).slice(-26).map((w) => ({ ...w, label: format(new Date(w.week), "d MMM") }));
  const onSort = (key) => setSort((x) => (x.key === key ? { key, dir: x.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "teamName" || key === "rank" ? "asc" : "desc" }));
  const periodLabel = period ? `${period.label} · ${period.sub}` : "All time";

  const onExport = () => {
    try {
      const name = exportRows(visible, [
        ["Rank", (r) => r.rank],
        ["Team", (r) => r.teamName],
        ["Team code", (r) => r.teamCode],
        ["Company", (r) => r.teamCompany],
        ["Total SLAs", (r) => r.total],
        ["Met", (r) => r.met],
        ["Breached", (r) => r.breached],
        ["Overdue now", (r) => r.overdueOpen],
        ["Open on time", (r) => r.open],
        ["Breach rate %", (r) => r.breachRate],
        ["Compliance %", (r) => r.complianceRate],
        ["Avg response (h)", (r) => r.avgResponseHours],
        ["Median response (h)", (r) => r.medianResponseHours],
        ["90th pct response (h)", (r) => r.p90ResponseHours],
        ["Avg overrun (h)", (r) => r.avgOverrunHours],
        ["Max overrun (h)", (r) => r.maxOverrunHours],
        ["Longest open overdue (h)", (r) => (r.overdueOpen ? r.worstOpenOverdueHours : null)],
        ["No response", (r) => r.noResponse],
        ["Customer rescheduled", (r) => r.exempt],
        ["Low volume (< 3 closed)", (r) => (r.lowVolume ? "Yes" : "")],
      ], { filename: "sla-team-performance", sheet: "SLA by team" });
      toast.success(`Exported ${name}`);
    } catch {
      toast.error("Couldn't build the export");
    }
  };

  return (
    <Box>
      <PageHeader
        title="SLA performance"
        description="How quickly each team responds within its SLA — teams with the most breaches first."
        actions={
          <>
            <Button variant="outlined" startIcon={<FileDownloadOutlined sx={{ fontSize: 17 }} />} onClick={onExport} disabled={!visible.length}>Export</Button>
            <PeriodPicker key={`${periodKey}-${from}-${to}`} periods={SLA_PERIODS} value={periodKey} from={from} to={to} onChange={setQuery} />
          </>
        }
      >
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
          <FilterChip label="Category" options={(data?.categories || []).map((c) => ({ value: c, label: c }))} value={categories} onChange={(v) => setQuery({ category: v })} />
          <FilterChip label="Priority" options={PRIORITIES.map((p) => ({ value: p, label: p }))} value={priorities} onChange={(v) => setQuery({ priority: v })} />
          <FilterChip label="Source" options={KINDS} value={kinds} onChange={(v) => setQuery({ kind: v })} />
          <FilterChip label="Company" options={companyOptions} value={companies} onChange={(v) => setQuery({ company: v })} />
          <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)", ml: 0.5 }}>{periodLabel} · by ticket creation date</Typography>
        </Box>
      </PageHeader>

      {error && <ErrorState title="SLA performance didn't load" message={error} onRetry={() => setRefresh((r) => r + 1)} sx={{ mb: 3 }} />}

      {!data && loading ? (
        <PageLoader minHeight={420} variant="cards" />
      ) : data && !s.total ? (
        <EmptyState icon={<TimerOffOutlined sx={{ fontSize: 20 }} />} title="No SLAs in this period" description="SLAs are set on tickets from the SLA button on a task, snag or tracker row. Try a wider period or clear the filters." />
      ) : (
        data && (
          <Box sx={{ opacity: loading ? 0.6 : 1, transition: "opacity .15s" }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" }, gap: 1.5, mb: 2 }}>
              <StatCard label="Compliance" value={fmtPct(s.complianceRate)} hint={`${s.met} met of ${s.closed} closed`} />
              <StatCard label="Breached" value={fmtN(s.breached)} hint={`${fmtPct(s.breachRate)} · ${s.teamsWithBreaches} of ${s.teams} teams`} />
              <StatCard label="Overdue right now" value={fmtN(s.overdueOpen)} hint={s.overdueOpen ? `longest ${fmtH(s.worstOpenOverdueHours)}` : "none open past deadline"} />
              <StatCard label="Median response" value={fmtH(s.medianResponseHours)} hint={`avg ${fmtH(s.avgResponseHours)} · 90% within ${fmtH(s.p90ResponseHours)}`} />
              <StatCard label="Avg overrun" value={fmtH(s.avgOverrunHours)} hint="past the deadline, breached SLAs" />
              <StatCard label="No response" value={fmtN(s.noResponse)} hint={`${s.exempt} customer reschedules not counted`} />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "3fr 2fr" }, gap: 2, mb: 2 }}>
              <SectionCard title="Teams with the most SLA breaches" description="Worst breach rate first · red = breached (incl. overdue now), green = met, grey = open on time">
                {chartTeams.length ? (
                  <Box sx={{ height: Math.max(200, chartTeams.length * 34 + 40) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartTeams} layout="vertical" margin={{ top: 4, right: 70, bottom: 4, left: 8 }}>
                        <CartesianGrid horizontal={false} stroke="var(--border)" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11.5, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="teamName" width={160} tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "var(--surface-hover)" }} content={<TeamTip />} />
                        <Bar dataKey="breached" stackId="s" fill="var(--danger)" barSize={18} onClick={(d) => setOpenTeam(d)} style={{ cursor: "pointer" }} />
                        <Bar dataKey="met" stackId="s" fill="var(--success)" barSize={18} onClick={(d) => setOpenTeam(d)} style={{ cursor: "pointer" }} />
                        <Bar dataKey="open" stackId="s" fill="var(--border-strong)" barSize={18} radius={[0, 4, 4, 0]} onClick={(d) => setOpenTeam(d)} style={{ cursor: "pointer" }}>
                          <LabelList dataKey="breachRate" position="right" formatter={(v) => (v == null ? "" : `${v}%`)} style={{ fontSize: 11.5, fill: "var(--text-secondary)" }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <EmptyState minHeight={200} title="No breaches in this period" description="Every closed SLA was met." />
                )}
              </SectionCard>
              <SectionCard title="Response time vs SLA" description="Answered tickets, by how long the team took relative to its SLA hours">
                <Box sx={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.responseBuckets} margin={{ top: 16, right: 8, bottom: 4, left: -16 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="label" interval={0} tick={{ fontSize: 10.5, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} height={44} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11.5, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: "var(--surface-hover)" }} />
                      <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]} fill="var(--accent)">
                        <LabelList dataKey="count" position="top" style={{ fontSize: 11.5, fill: "var(--text-secondary)" }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </SectionCard>
            </Box>

            <SectionCard title="Weekly trend" description="SLAs by the week the ticket was created · bars = outcomes, line = breach rate" sx={{ mb: 2 }}>
              {trend.length > 1 ? (
                <Box sx={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trend} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="n" allowDecimals={false} tick={{ fontSize: 11.5, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="p" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11.5, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<TrendTip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar yAxisId="n" dataKey="met" name="Met" stackId="w" fill="var(--success)" barSize={16} />
                      <Bar yAxisId="n" dataKey="breached" name="Breached" stackId="w" fill="var(--danger)" barSize={16} />
                      <Bar yAxisId="n" dataKey="open" name="Open, on time" stackId="w" fill="var(--border-strong)" barSize={16} />
                      <Line yAxisId="p" dataKey="breachRate" name="Breach rate" stroke="var(--text)" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>Pick a longer period to see a weekly trend.</Typography>
              )}
            </SectionCard>

            <SectionCard
              title="All teams"
              description={`${visible.length} of ${teams.length} teams · ${sort.key === "rank" ? "worst breach rate first" : "sorted"}`}
              padding={0}
              sx={{ mb: 2 }}
              actions={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, height: 30, px: 1, border: "1px solid var(--border)", borderRadius: "6px", width: { xs: 160, sm: 220 } }}>
                  <SearchIcon sx={{ fontSize: 16, color: "var(--text-muted)" }} />
                  <InputBase value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team or code" sx={{ fontSize: 13, flex: 1 }} inputProps={{ "aria-label": "Search teams" }} />
                </Box>
              }
            >
              <Box sx={{ overflowX: "auto" }}>
                <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 13, "& th, & td": { px: 1.25, py: 1, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }, "& tbody tr:hover": { backgroundColor: "var(--surface-hover)" } }}>
                  <thead>
                    <tr>
                      {COLUMNS.map((c) => (
                        <Box component="th" key={c.key} scope="col" title={c.title} aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} sx={{ textAlign: c.align || "left", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", backgroundColor: "var(--surface-subtle)" }}>
                          <Box component="button" type="button" onClick={() => onSort(c.key)} sx={{ border: 0, background: "none", font: "inherit", color: "inherit", cursor: "pointer", p: 0, display: "inline-flex", alignItems: "center", gap: 0.25 }}>
                            {c.label}
                            {sort.key === c.key && (sort.dir === "asc" ? <ArrowUpward sx={{ fontSize: 12 }} /> : <ArrowDownward sx={{ fontSize: 12 }} />)}
                          </Box>
                        </Box>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <Box component="tr" key={r.key} onClick={() => setOpenTeam(r)} sx={{ cursor: "pointer" }}>
                        {COLUMNS.map((c) => (
                          <Box component="td" key={c.key} sx={{ textAlign: c.align || "left", fontVariantNumeric: "tabular-nums", color: c.key === "breachRate" || c.key === "breached" ? "var(--text)" : "var(--text-secondary)", fontWeight: c.key === "breachRate" ? 600 : 400 }}>
                            {c.key === "teamName" ? (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <span dir="auto" style={{ color: "var(--text)", fontWeight: 500 }}>{r.teamName}</span>
                                {r.rank != null && r.rank <= 5 && r.breached > 0 && <Badge tone="danger">Worst 5</Badge>}
                                {r.lowVolume && <Badge title="Fewer than 3 closed SLAs — compare with care">Low volume</Badge>}
                                {r.teamCompany && <Typography component="span" sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>{r.teamCompany}</Typography>}
                              </Box>
                            ) : c.key === "overdueOpen" ? (
                              <span style={{ color: r.overdueOpen ? "var(--danger)" : undefined, fontWeight: r.overdueOpen ? 600 : 400 }}>{r.overdueOpen}</span>
                            ) : c.render ? (
                              c.render(r)
                            ) : (
                              fmtN(c.get(r))
                            )}
                          </Box>
                        ))}
                      </Box>
                    ))}
                  </tbody>
                </Box>
              </Box>
            </SectionCard>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "3fr 2fr" }, gap: 2, mb: 2 }}>
              <SectionCard title={`Overdue right now · ${data.overdueNow.length}`} description="Open SLAs past their deadline, longest overdue first" padding={0}>
                {data.overdueNow.length ? (
                  <Box sx={{ maxHeight: 420, overflowY: "auto" }}>
                    {data.overdueNow.slice(0, 100).map((o) => (
                      <Box key={o.id} component="button" type="button" onClick={() => navigate(o.link)} sx={{ display: "flex", width: "100%", gap: 1.5, alignItems: "center", textAlign: "left", font: "inherit", border: 0, borderBottom: "1px solid var(--border)", backgroundColor: "transparent", px: 2, py: 1, cursor: "pointer", "&:hover": { backgroundColor: "var(--surface-hover)" } }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography dir="auto" sx={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{o.title || o.slid}</Typography>
                          <Typography dir="auto" sx={{ fontSize: 12, color: "var(--text-secondary)" }}>{[o.slid, o.teamName, o.category, o.priority].filter(Boolean).join(" · ")}</Typography>
                        </Box>
                        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "var(--danger)" }}>{fmtH(o.overdueHours)} over</Typography>
                          <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>due {format(new Date(o.targetDate), "d MMM, HH:mm")}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <EmptyState minHeight={160} title="Nothing overdue" description="No open SLA is past its deadline." />
                )}
              </SectionCard>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <SectionCard title="By category"><BreakdownTable rows={data.byCategory} /></SectionCard>
                <SectionCard title="By priority"><BreakdownTable rows={data.byPriority} /></SectionCard>
              </Box>
            </Box>
            <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              Rules (same as the SLA badge and team analysis): met = responded within the SLA or rescheduled at the customer’s request; breached = responded late, no response, or still open past the deadline. Breach rate = breached ÷ (met + breached). Response = ticket creation → response, answered tickets only.
            </Typography>
          </Box>
        )
      )}
      <TeamSlaSheet team={openTeam} onClose={() => setOpenTeam(null)} navigate={navigate} />
    </Box>
  );
};

export default SlaPerformancePage;
