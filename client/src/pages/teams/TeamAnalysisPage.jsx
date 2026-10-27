import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { Box, Button, Drawer, IconButton, InputBase, MenuItem, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import ArrowBack from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import SectionCard from "../../components/ui/SectionCard";
import ErrorState from "../../components/ui/ErrorState";
import EmptyState from "../../components/ui/EmptyState";
import PageLoader from "../../components/ui/PageLoader";
import Badge from "../../components/ui/Badge";
import TaxonomyBadge from "../../components/ui/TaxonomyBadge";
import { gridSx } from "../tasks/gridSx";
import { downloadWorkbook } from "../../components/dataio/parse";
import { teamAnalyticsApi } from "../../api/qops";
import { slaApi } from "../../api/slaApi";
import { taxonomyByLabel, taxonomyLabel } from "../../constants/taxonomy";
import { useTrackers } from "../../hooks/useTrackers";
import OnlineSectionManager from "../../components/OnlineSectionManager";
import TaskSheet from "../tasks/TaskSheet";
import api from "../../api/api";

// Samples and online data are entered per month, so periods are whole months. Default: this year
// (a manager-chosen period, not "all time", so teams are compared over the same months).
const PERIODS = [
  { value: "year", label: "This year" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "3m", label: "Last 3 months" },
  { value: "12m", label: "Last 12 months" },
  { value: "custom", label: "Choose months…" },
  { value: "all", label: "All time" },
];
const DEFAULT_PERIOD = "year";
const utcMonthStart = (y, m) => new Date(Date.UTC(y, m, 1));
const utcMonthEnd = (y, m) => new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
/** "2026-03" (or a legacy "2026-03-15") → [year, monthIndex] */
const ym = (s) => { const [y, m] = String(s).split("-").map(Number); return [y, m - 1]; };
const rangeFor = (period, from, to) => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  // Use UTC-based boundaries so local timezone offset doesn't bleed into the previous month
  if (period === "month") return { from: utcMonthStart(y, m) };
  if (period === "lastMonth") return { from: utcMonthStart(y, m - 1), to: utcMonthEnd(y, m - 1) };
  if (period === "3m")    return { from: utcMonthStart(y, m - 3) };
  if (period === "12m")   return { from: utcMonthStart(y, m - 12) };
  if (period === "year")  return { from: new Date(Date.UTC(y, 0, 1)) };
  if (period === "custom") return { from: from ? utcMonthStart(...ym(from)) : undefined, to: to ? utcMonthEnd(...ym(to)) : undefined };
  return {};
};
const rangeLabel = (range) => {
  if (!range.from && !range.to) return "all time";
  const f = (d) => format(new Date(d.getUTCFullYear(), d.getUTCMonth(), 1), "MMM yyyy");
  return `${range.from ? f(range.from) : "the start"} – ${range.to ? f(range.to) : "now"}`;
};
const pct = (x) => (x?.average === null || x?.average === undefined ? "—" : `${x.average}%`);
const taxOf = (category, sub) => ({ category, subCategory: sub, color: taxonomyByLabel[category]?.color, label: taxonomyLabel(category, sub) });

/** Period picker shared by both views; kept in the URL so links keep their range. */
const usePeriod = () => {
  const [params, setParams] = useSearchParams();
  const period = params.get("period") || DEFAULT_PERIOD;
  const from = (params.get("from") || "").slice(0, 7);
  const to = (params.get("to") || "").slice(0, 7);
  const set = (patch) => setParams((p) => { const n = new URLSearchParams(p); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); return n; }, { replace: true });
  const range = rangeFor(period, from, to);
  const query = { ...(range.from ? { from: range.from.toISOString() } : {}), ...(range.to ? { to: range.to.toISOString() } : {}) };
  const control = (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
      <TextField select size="small" value={period} onChange={(e) => set({ period: e.target.value === DEFAULT_PERIOD ? null : e.target.value })} sx={{ width: 170 }} slotProps={{ htmlInput: { "aria-label": "Period" } }}>
        {PERIODS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
      </TextField>
      {period === "custom" && (
        <>
          <TextField size="small" type="month" label="From month" value={from} onChange={(e) => set({ from: e.target.value })} slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: to || undefined } }} />
          <TextField size="small" type="month" label="To month" value={to} onChange={(e) => set({ to: e.target.value })} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: from || undefined } }} />
        </>
      )}
    </Box>
  );
  return { query, control, key: JSON.stringify(query), qs: params.toString(), label: rangeLabel(range), isAll: period === "all" };
};

const Bars = ({ items, total }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
    {items.map((it) => (
      <Box key={it.key} sx={{ display: "grid", gridTemplateColumns: "minmax(110px, 40%) 1fr 48px", alignItems: "center", gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>{it.label}</Box>
        <Box sx={{ height: 8, borderRadius: 4, backgroundColor: "var(--surface-active)", overflow: "hidden" }}>
          <Box sx={{ height: "100%", width: `${total ? (it.count / total) * 100 : 0}%`, backgroundColor: it.color || "var(--accent)", borderRadius: 4 }} />
        </Box>
        <Typography sx={{ fontSize: 12.5, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{it.count.toLocaleString()}</Typography>
      </Box>
    ))}
  </Box>
);

// ------------------------------------------------------------------ monthly performance chart
const MonthlyPerformanceChart = ({ months }) => {
  if (!months || months.length === 0) return null;

  const chartData = months.map((m) => ({
    label: format(new Date(`${m.month}-01T00:00:00`), "MMM yy"),
    Total: m.count,
    DVOC: m.dvocCount || 0,
    Snags: m.snagsCount || 0,
    Tables: m.tableCount || 0,
    Samples: m.samplesToken || 0,
    accountable: m.accountableCount || 0,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <Box sx={{ p: 1.5, borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", boxShadow: "0 4px 16px rgba(0,0,0,.18)", minWidth: 180 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.75 }}>{label}</Typography>
        {payload.map((p) => (
          <Box key={p.dataKey} sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 12, py: 0.2 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "2px", backgroundColor: p.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: "var(--text-secondary)" }}>{p.dataKey}</span>
            <strong>{p.value?.toLocaleString()}</strong>
          </Box>
        ))}
      </Box>
    );
  };

  const hasSamples = chartData.some((d) => d.Samples > 0);

  return (
    <Box sx={{ mb: 2, p: 2, borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--surface)" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
        <Box>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>Monthly Performance</Typography>
          <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>Task count by type per month{hasSamples ? " · samples token line" : ""}</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {[
            { color: "#3B82F6", label: "DVOC" },
            { color: "#F59E0B", label: "Snags" },
            { color: "#8B5CF6", label: "Tables" },
            ...(hasSamples ? [{ color: "#10B981", label: "Samples" }] : []),
          ].map((s) => (
            <Box key={s.label} sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 11.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "2px", backgroundColor: s.color }} />
              <span style={{ color: "var(--text-secondary)" }}>{s.label}</span>
            </Box>
          ))}
        </Box>
      </Box>
      <ResponsiveContainer width="100%" height={months.length > 6 ? 220 : 180}>
        <ComposedChart data={chartData} barGap={2} margin={{ top: 4, right: hasSamples ? 48 : 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
          {hasSamples && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#10B981" }} axisLine={false} tickLine={false} width={44} allowDecimals={false} />}
          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar yAxisId="left" dataKey="DVOC" stackId="a" fill="#3B82F6" radius={[0,0,0,0]} maxBarSize={36} />
          <Bar yAxisId="left" dataKey="Snags" stackId="a" fill="#F59E0B" radius={[0,0,0,0]} maxBarSize={36} />
          <Bar yAxisId="left" dataKey="Tables" stackId="a" fill="#8B5CF6" radius={[4,4,0,0]} maxBarSize={36} />
          {hasSamples && <Line yAxisId="right" type="monotone" dataKey="Samples" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: "#10B981" }} />}
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};

// ------------------------------------------------------------------ all teams
// "Rank by" options for the team table filters (highest first).
const RANK_BY = [
  { value: "accountable", label: "Accountable DVOC" },
  { value: "dvocSamplePct", label: "DVOC / Sample %" },
  { value: "dvocOnlinePct", label: "DVOC / Online %" },
  { value: "dvoc", label: "DVOC" },
  { value: "unmatchedDvoc", label: "DVOC without samples" },
  { value: "samplesToken", label: "Samples token" },
  { value: "onlineTotal", label: "Total online" },
];
const TOP_N = [{ value: 0, label: "All teams" }, { value: 5, label: "Top 5" }, { value: 10, label: "Top 10" }, { value: 20, label: "Top 20" }, { value: 50, label: "Top 50" }];

const TeamMatrix = () => {
  const navigate = useNavigate();
  const { query, control, key, qs, label: periodLabel, isAll } = usePeriod();
  const { all } = useTrackers();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [hideEmpty, setHideEmpty] = useState(true);
  const [rankBy, setRankBy] = useState("accountable");
  const [topN, setTopN] = useState(0);
  const [company, setCompany] = useState("");
  const [onlyWithSamples, setOnlyWithSamples] = useState(false);
  const [sortModel, setSortModel] = useState([{ field: "accountable", sort: "desc" }]);

  useEffect(() => {
    let off = false;
    setData(null);
    setError(null);
    teamAnalyticsApi.matrix(query).then((d) => !off && setData(d)).catch((e) => !off && setError(e?.response?.data?.message || e.message));
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const categories = useMemo(() => all.map((t) => t.label), [all]);
  const otherCategories = useMemo(() => categories.filter((c) => c !== "DVOC"), [categories]);
  const companies = useMemo(() => [...new Set((data?.teams || []).map((t) => t.teamCompany).filter(Boolean))].sort(), [data]);

  const rows = useMemo(() => {
    const list = (data?.teams || [])
      .filter((t) => !hideEmpty || t.total || t.samplesToken || t.onlineTotal || t.lab.count || t.ojt.count || t.technical.count)
      .filter((t) => !q || `${t.teamName} ${t.teamCode} ${t.teamCompany}`.toLowerCase().includes(q.toLowerCase()))
      .filter((t) => !company || t.teamCompany === company)
      .filter((t) => !onlyWithSamples || t.sampleMonths > 0)
      .map((t) => ({ id: t.fieldTeamId, ...t, ...Object.fromEntries(categories.map((c) => [`c:${c}`, t.byCategory?.[c] || 0])) }));
    if (!topN) return list;
    // Top N by the chosen measure, highest first; teams without a value don't qualify.
    return list.filter((t) => t[rankBy] != null && t[rankBy] > 0).sort((a, b) => b[rankBy] - a[rankBy]).slice(0, topN);
  }, [data, q, hideEmpty, categories, company, onlyWithSamples, topN, rankBy]);

  const pickRank = (v) => {
    setRankBy(v);
    setSortModel([{ field: v, sort: "desc" }]);
  };

  const num = (p) => (p.value ? p.value.toLocaleString() : "—");
  const pctCell = (p) => (p.value !== null && p.value !== undefined ? `${p.value}%` : "—");
  const columns = [
    { field: "teamName", headerName: "Team", flex: 1, minWidth: 180, renderCell: (p) => <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}><Typography noWrap dir="auto" sx={{ fontSize: 13, fontWeight: 500 }}>{p.value}</Typography>{p.row.isTerminated && <Badge>left</Badge>}</Box> },
    { field: "teamCode", headerName: "Current code", width: 110 },
    { field: "teamCompany", headerName: "Company", width: 120 },
    { field: "samplesToken", headerName: "Samples token", type: "number", width: 120, valueGetter: (v) => v || 0, renderCell: num },
    {
      field: "dvoc",
      headerName: "DVOC",
      type: "number",
      width: 90,
      renderHeader: () => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: taxonomyByLabel["DVOC"]?.color || "#3B82F6" }} />
          <span>DVOC</span>
        </Box>
      ),
      valueGetter: (v) => v || 0,
      renderCell: num,
    },
    { field: "accountable", headerName: "Accountable DVOC", type: "number", width: 140, valueGetter: (v) => v || 0, renderCell: num },
    {
      field: "sampleMonths",
      headerName: "Months with samples",
      description: "Months with team samples entered, out of months with DVOC or samples. Rates only use months with samples.",
      type: "number",
      width: 150,
      valueGetter: (v) => v || 0,
      renderCell: (p) => {
        const gap = p.row.dvocMonths > p.row.sampleMonths;
        return (
          <Box component="span" sx={{ color: gap ? "var(--warning)" : "inherit", fontWeight: gap ? 600 : 400 }} title={gap ? `Samples missing for months that have DVOC` : undefined}>
            {p.row.sampleMonths} / {Math.max(p.row.dvocMonths, p.row.sampleMonths)}
          </Box>
        );
      },
    },
    { field: "unmatchedDvoc", headerName: "DVOC without samples", description: "DVOC in months where no team samples are entered — left out of DVOC / Sample %", type: "number", width: 160, valueGetter: (v) => v || 0, renderCell: (p) => (p.value ? <Box component="span" sx={{ color: "var(--warning)", fontWeight: 600 }}>{p.value}</Box> : "—") },
    { field: "adjustedSamples", headerName: "Adjusted samples", description: "Samples − non-accountable DVOC, months with samples only", type: "number", width: 140, valueGetter: (v) => v || 0, renderCell: num },
    { field: "dvocSamplePct", headerName: "DVOC / Sample %", description: "Accountable ÷ adjusted samples, over months that have samples", type: "number", width: 135, valueGetter: (v) => (v !== null && v !== undefined ? v : null), renderCell: pctCell },
    { field: "onlineTotal", headerName: "Total online", type: "number", width: 115, valueGetter: (v) => v || 0, renderCell: num },
    { field: "dvocOnlinePct", headerName: "DVOC / Online %", description: "Accountable ÷ online transactions, over months that have online data", type: "number", width: 135, valueGetter: (v) => (v !== null && v !== undefined ? v : null), renderCell: pctCell },
    { field: "total", headerName: "Tracker records", type: "number", width: 130, valueGetter: (v) => v || 0, renderCell: num },
    ...otherCategories.map((c) => ({ field: `c:${c}`, headerName: c, type: "number", width: 120, renderHeader: () => <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: taxonomyByLabel[c]?.color }} /><span>{c}</span></Box> })),
    { field: "lab", headerName: "Lab avg", width: 100, valueGetter: (v) => v?.average ?? null, renderCell: (p) => pct(p.row.lab) },
    { field: "ojt", headerName: "OJT avg", width: 100, valueGetter: (v) => v?.average ?? null, renderCell: (p) => pct(p.row.ojt) },
    { field: "technical", headerName: "Technical avg", width: 120, valueGetter: (v) => v?.average ?? null, renderCell: (p) => pct(p.row.technical) },
  ];

  // Export what's on screen, in the on-screen order.
  const exportXlsx = () => {
    const field = sortModel[0]?.field;
    const dir = sortModel[0]?.sort === "asc" ? 1 : -1;
    const val = (r) => (r[field] == null ? -Infinity : r[field]);
    const ordered = field ? [...rows].sort((a, b) => (val(a) > val(b) ? dir : val(a) < val(b) ? -dir : 0)) : rows;
    downloadWorkbook([{
      name: "Teams",
      header: [
        "Team", "Current code", "Company", "Period",
        "Samples token", "DVOC", "Accountable DVOC", "Months with samples", "Months with DVOC", "DVOC without samples", "Adjusted samples", "DVOC / Sample %",
        "Total online", "DVOC / Online %",
        "Tracker records",
        ...otherCategories,
        "Lab avg %", "Lab count", "OJT avg %", "OJT count", "Technical avg %", "Technical count",
      ],
      rows: ordered.map((t) => [
        t.teamName, t.teamCode, t.teamCompany, periodLabel,
        t.samplesToken || 0, t.dvoc || 0, t.accountable || 0, t.sampleMonths || 0, t.dvocMonths || 0, t.unmatchedDvoc || 0, t.adjustedSamples || 0,
        t.dvocSamplePct != null ? `${t.dvocSamplePct}%` : "",
        t.onlineTotal || 0,
        t.dvocOnlinePct != null ? `${t.dvocOnlinePct}%` : "",
        t.total || 0,
        ...otherCategories.map((c) => t.byCategory?.[c] || 0),
        t.lab.average ?? "", t.lab.count,
        t.ojt.average ?? "", t.ojt.count,
        t.technical.average ?? "", t.technical.count,
      ]),
    }], topN ? `team-analysis-top${topN}-${rankBy}` : "team-analysis");
  };

  const gaps = (data?.teams || []).filter((t) => t.unmatchedDvoc > 0).length;
  const rankLabel = RANK_BY.find((r) => r.value === rankBy)?.label;

  return (
    <Box>
      <PageHeader title="Team analysis" description="Every SLID recorded in any tracker counts for the team that held its team code on the record's date, next to the team's lab, on-the-job and technical assessments."
        actions={<Button variant="outlined" startIcon={<FileDownloadOutlined sx={{ fontSize: 17 }} />} onClick={exportXlsx} disabled={!rows.length}>Export</Button>} />
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: 32, px: 1.25, width: { xs: "100%", sm: 240 }, borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--surface)" }}>
          <SearchIcon sx={{ fontSize: 17, color: "var(--text-muted)" }} />
          <InputBase value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team, code, company" inputProps={{ "aria-label": "Search teams" }} sx={{ flex: 1, fontSize: 13 }} />
        </Box>
        {control}
        <TextField select size="small" label="Rank by" value={rankBy} onChange={(e) => pickRank(e.target.value)} sx={{ width: 190 }}>
          {RANK_BY.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Show" value={topN} onChange={(e) => setTopN(Number(e.target.value))} sx={{ width: 120 }}>
          {TOP_N.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
        </TextField>
        {companies.length > 1 && (
          <TextField select size="small" label="Company" value={company} onChange={(e) => setCompany(e.target.value)} sx={{ width: 140 }}>
            <MenuItem value="">All</MenuItem>
            {companies.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
        )}
        <Button size="small" variant={onlyWithSamples ? "contained" : "outlined"} onClick={() => setOnlyWithSamples((x) => !x)}>Only teams with samples</Button>
        <Button size="small" variant={hideEmpty ? "outlined" : "contained"} onClick={() => setHideEmpty((x) => !x)}>{hideEmpty ? "Show teams with nothing" : "Hide teams with nothing"}</Button>
      </Box>
      <Box sx={{ p: 1.25, mb: 1.5, borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface-subtle)" }}>
        <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
          <strong>Cumulative</strong> per team for <strong>{periodLabel}</strong>. DVOC / Sample % and DVOC / Online % only use months where that team’s samples / online data are entered, so missing months don’t inflate the rate.
          {gaps > 0 && <> {gaps} team{gaps === 1 ? " has" : "s have"} DVOC in months without samples — see “DVOC without samples”.</>}
          {isAll && <> “All time” mixes years with very different data; pick a period to compare teams fairly.</>}
          {topN ? <> Showing the top {topN} by {rankLabel}.</> : null}
        </Typography>
      </Box>
      {error ? <ErrorState title="Couldn't load the analysis" message={error} /> : !data ? <PageLoader variant="table" /> : !rows.length ? (
        <EmptyState title="No team matches" description="Nothing recorded for the filtered teams in this period. Try another period or clear the filters." />
      ) : (
        <Box sx={{ height: "calc(100vh - 330px)", minHeight: 420 }}>
          <DataGrid rows={rows} columns={columns} density="compact" sx={gridSx} disableRowSelectionOnClick sortModel={sortModel} onSortModelChange={setSortModel}
            onRowClick={(p) => navigate(`/team-analysis/${p.id}${qs ? `?${qs}` : ""}`)} getRowClassName={() => "clickable"} />
        </Box>
      )}

      {/* Online Section — one row per team per month */}
      <Box sx={{ mt: 3 }}>
        <OnlineSectionManager />
      </Box>
    </Box>
  );
};

// ------------------------------------------------------------------ record drawer
const RecordDrawer = ({ record, onClose, fmt }) => {
  if (!record) return null;
  const score = record.evaluationScore !== null && record.evaluationScore !== undefined && record.evaluationScore !== '' ? Number(record.evaluationScore) : null;
  const scoreTone = score !== null ? (score >= 9 ? 'success' : score >= 7 ? 'warning' : 'danger') : null;
  const accTone  = record.accountability === 'accountable' ? 'danger' : record.accountability === 'not' ? 'success' : null;
  const accLabel = record.accountability === 'accountable' ? 'Team accountable' : record.accountability === 'not' ? 'Not accountable' : null;

  const Field = ({ label, children }) => (
    <Box sx={{ mb: 1.75 }}>
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.5 }}>{label}</Typography>
      <Box sx={{ fontSize: 13, color: 'var(--text-primary)' }}>{children}</Box>
    </Box>
  );

  const TagList = ({ items, tone }) => {
    const arr = Array.isArray(items) ? items : items ? [items] : [];
    if (!arr.length) return <Typography sx={{ fontSize: 13, color: 'var(--text-muted)' }}>—</Typography>;
    return (
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {arr.map((t, i) => <Badge key={i} tone={tone}>{t}</Badge>)}
      </Box>
    );
  };

  return (
    <Drawer
      anchor="right"
      open={!!record}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: 500 },
          backgroundColor: 'var(--surface)',
          color: 'var(--text-primary)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
        }
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 2, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 1, flexShrink: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <TaxonomyBadge tax={{ category: record.category, subCategory: record.sub, color: taxonomyByLabel[record.category]?.color, label: taxonomyLabel(record.category, record.sub) }} />
          <Typography sx={{ fontSize: 16, fontWeight: 700, mt: 0.75, wordBreak: 'break-word', lineHeight: 1.3 }} dir="auto">
            {record.title || record.slid || '—'}
          </Typography>
          {record.slid && (
            <Typography sx={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', mt: 0.3 }}>
              {record.slid}
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ mt: -0.5, ml: 0.5, color: 'var(--text-muted)', flexShrink: 0 }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Scrollable body */}
      <Box sx={{ px: 2.5, py: 2.5, overflowY: 'auto', flex: 1 }}>

        {/* Quick-facts grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2.5, p: 1.5, borderRadius: '8px', backgroundColor: 'var(--surface-active)', border: '1px solid var(--border)' }}>
          <Box>
            <Typography sx={{ fontSize: 10.5, color: 'var(--text-muted)', mb: 0.3 }}>Date</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{record.date ? fmt(record.date) : '—'}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 10.5, color: 'var(--text-muted)', mb: 0.3 }}>Code at time</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{record.code || '—'}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 10.5, color: 'var(--text-muted)', mb: 0.3 }}>NPS Score</Typography>
            {score !== null
              ? <Badge tone={scoreTone}>{score} / 10</Badge>
              : <Typography sx={{ fontSize: 13, color: 'var(--text-muted)' }}>—</Typography>}
          </Box>
          <Box>
            <Typography sx={{ fontSize: 10.5, color: 'var(--text-muted)', mb: 0.3 }}>Accountability</Typography>
            {accTone
              ? <Badge tone={accTone}>{accLabel}</Badge>
              : <Typography sx={{ fontSize: 13, color: 'var(--text-muted)' }}>—</Typography>}
          </Box>
          {record.status && (
            <Box>
              <Typography sx={{ fontSize: 10.5, color: 'var(--text-muted)', mb: 0.3 }}>Status</Typography>
              <Badge>{record.status}</Badge>
            </Box>
          )}
          {record.priority && record.priority !== 'Not specified' && (
            <Box>
              <Typography sx={{ fontSize: 10.5, color: 'var(--text-muted)', mb: 0.3 }}>Priority</Typography>
              <Badge tone={record.priority === 'High' ? 'danger' : record.priority === 'Medium' ? 'warning' : undefined}>
                {record.priority}
              </Badge>
            </Box>
          )}
        </Box>

        <Field label="Root Cause(s)">
          <TagList items={record.rootCause} tone="warning" />
        </Field>

        <Field label="Reason(s)">
          <TagList items={record.reason} tone="info" />
        </Field>

        <Field label="Sub-Reason(s)">
          <TagList items={record.subReason} />
        </Field>

        {record.customerFeedback && (
          <Field label="Customer Feedback">
            <Box sx={{ p: 1.5, borderRadius: '6px', backgroundColor: 'var(--surface-active)', border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} dir="auto">
              {record.customerFeedback}
            </Box>
          </Field>
        )}

        {record.tableName && (
          <Field label="Table / Source">
            <Typography sx={{ fontSize: 13 }}>{record.tableName}</Typography>
          </Field>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ px: 2.5, py: 2, borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 1 }}>
        <Button
          component={RouterLink}
          to={record.link}
          variant="contained"
          fullWidth
          sx={{ fontWeight: 600, fontSize: 13 }}
        >
          Open full record
        </Button>
        <Button variant="outlined" onClick={onClose} sx={{ minWidth: 80 }}>Close</Button>
      </Box>
    </Drawer>
  );
};

// ------------------------------------------------------------------ one team
const TeamDetail = ({ teamId }) => {
  const { query, control, key, qs } = usePeriod();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterSource, setFilterSource] = useState("all");
  const [filterAcc, setFilterAcc] = useState("all");
  const [tableSearch, setTableSearch] = useState("");
  // Record detail: full task sheet for DVOC tasks, fallback drawer for others
  const [selectedRecord, setSelectedRecord] = useState(null);  // fallback drawer
  const [sheetTask, setSheetTask]   = useState(null);          // full TaskSheet
  const [sheetUsers, setSheetUsers] = useState([]);            // users for TaskSheet

  // Load users once so TaskSheet can resolve assignee names
  useEffect(() => {
    api.get("/users/get-all-users").then((r) => {
      const list = Array.isArray(r.data) ? r.data : (r.data?.users || []);
      setSheetUsers(list.filter((u) => u.isActive !== false).map(({ _id, name, email, color, role }) => ({ _id, name, email, color, role })));
    }).catch(() => {});
  }, []);
  const [slaPerf, setSlaPerf] = useState(null);

  useEffect(() => {
    let off = false;
    setLoading(true);
    setError(null);
    teamAnalyticsApi.team(teamId, query)
      .then((d) => { if (!off) { setData(d); setLoading(false); } })
      .catch((e) => { if (!off) { setError(e?.response?.data?.message || e.message); setLoading(false); } });
    const fetchPerf = slaApi.getTeamPerformance || slaApi.teamPerformance;
    if (typeof fetchPerf === "function") {
      fetchPerf(teamId).then((p) => !off && setSlaPerf(p)).catch(() => !off && setSlaPerf(null));
    }
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, key]);

  const back = <Button component={RouterLink} to={`/team-analysis${qs ? `?${qs}` : ""}`} startIcon={<ArrowBack sx={{ fontSize: 17 }} />} variant="outlined">All teams</Button>;
  if (error) return <Box><PageHeader title="Team analysis" actions={back} /><ErrorState title="Couldn't load this team" message={error} /></Box>;
  // First load — show skeleton
  if (!data) return <PageLoader variant="cards" />;
  const { team, dvocAnalytics } = data;
  const fmt = (d) => (d ? format(new Date(d), "d MMM yyyy") : "now");

  const exportXlsx = () => downloadWorkbook([
    {
      name: "Records",
      header: ["Date", "Tracker", "Sub-category", "SLID", "Record", "Team code", "Root Cause", "Reason", "Sub-reason", "Accountability", "NPS Score", "Feedback", "Source"],
      rows: data.records.map((r) => [
        new Date(r.date),
        r.category,
        r.sub || "",
        r.slid,
        r.title,
        r.code || "",
        Array.isArray(r.rootCause) ? r.rootCause.join("; ") : r.rootCause || "",
        Array.isArray(r.reason) ? r.reason.join("; ") : r.reason || "",
        Array.isArray(r.subReason) ? r.subReason.join("; ") : r.subReason || "",
        r.accountability === "accountable" ? "Team Accountable" : r.accountability === "not" ? "Not Accountable" : "Unset",
        r.evaluationScore ?? "",
        r.customerFeedback || "",
        r.tableName || r.source,
      ]),
    },
    { name: "Code history", header: ["Code", "From", "To"], rows: data.codes.map((c) => [c.code, c.from ? new Date(c.from) : "", c.to ? new Date(c.to) : ""]) },
  ], `team-${team.teamName}`.toLowerCase().replace(/[^\w]+/g, "-"));

  const filteredRecords = (data.records || []).filter((r) => {
    if (filterSource !== "all" && r.source !== filterSource) return false;
    if (filterAcc === "accountable" && r.accountability !== "accountable") return false;
    if (filterAcc === "not" && r.accountability !== "not") return false;
    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      const match = `${r.slid} ${r.title} ${r.category} ${(r.rootCause || []).join(" ")} ${(r.reason || []).join(" ")}`.toLowerCase();
      if (!match.includes(q)) return false;
    }
    return true;
  });

  const recordCols = [
    { field: "date", headerName: "Date", width: 110, valueGetter: (v) => (v ? new Date(v) : null), renderCell: (p) => (p.value ? format(p.value, "d MMM yyyy") : "") },
    { field: "category", headerName: "Tracker", width: 170, renderCell: (p) => <TaxonomyBadge tax={taxOf(p.row.category, p.row.sub)} /> },
    { field: "slid", headerName: "SLID", width: 120 },
    { field: "title", headerName: "Customer / Record", minWidth: 170, flex: 1, renderCell: (p) => <Typography noWrap dir="auto" sx={{ fontSize: 13 }}>{p.value}</Typography> },
    {
      field: "rootCause",
      headerName: "Root cause",
      minWidth: 160,
      flex: 1,
      renderCell: (p) => {
        const rc = Array.isArray(p.value) ? p.value : p.value ? [p.value] : [];
        if (!rc.length) return <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>—</Typography>;
        return (
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: "center" }}>
            {rc.map((c, i) => (
              <Badge key={i} tone="warning" sx={{ fontSize: 11, py: 0.25 }}>{c}</Badge>
            ))}
          </Box>
        );
      },
    },
    {
      field: "reason",
      headerName: "Reason · Sub-reason",
      minWidth: 160,
      renderCell: (p) => {
        const r = Array.isArray(p.row.reason) ? p.row.reason.join(", ") : p.row.reason;
        const sr = Array.isArray(p.row.subReason) ? p.row.subReason.join(", ") : p.row.subReason;
        if (!r && !sr) return <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>—</Typography>;
        return (
          <Typography noWrap dir="auto" sx={{ fontSize: 12.5 }}>
            {r && <strong>{r}</strong>}{r && sr ? " · " : ""}{sr || ""}
          </Typography>
        );
      },
    },
    {
      field: "accountability",
      headerName: "Accountability",
      width: 150,
      renderCell: (p) => {
        if (p.value === "accountable") return <Badge tone="danger">Team accountable</Badge>;
        if (p.value === "not") return <Badge tone="success">Not accountable</Badge>;
        return <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>—</Typography>;
      },
    },
    {
      field: "evaluationScore",
      headerName: "Score",
      width: 80,
      renderCell: (p) => {
        const s = Number(p.value);
        if (!Number.isFinite(s) || p.value === null || p.value === undefined || p.value === "") return "—";
        return <Badge tone={s >= 9 ? "success" : s >= 7 ? "warning" : "danger"}>{s}</Badge>;
      },
    },
    { field: "code", headerName: "Code then", width: 100 },
    { field: "tableName", headerName: "Table / Source", width: 140, valueGetter: (v, r) => v || r.source },
  ];

  return (
    <Box>
      <PageHeader
        title={team.teamName}
        description={`${team.teamCompany || ""}${team.teamCode ? ` · current code ${team.teamCode}` : ""}${team.isTerminated ? " · left" : ""}`}
        actions={<>{back}<Button variant="outlined" startIcon={<FileDownloadOutlined sx={{ fontSize: 17 }} />} onClick={exportXlsx}>Export</Button></>}
      />
      <Box sx={{ mb: 2 }}>{control}</Box>

      {/* Refetch loading indicator — thin bar, keeps content visible */}
      {loading && (
        <Box sx={{ height: 3, borderRadius: 2, overflow: "hidden", mb: 1.5, backgroundColor: "var(--border)" }}>
          <Box sx={{
            height: "100%", width: "40%", borderRadius: 2,
            backgroundColor: "var(--accent)",
            animation: "slide-loading 1.2s ease-in-out infinite",
            "@keyframes slide-loading": {
              "0%":   { transform: "translateX(-100%)" },
              "100%": { transform: "translateX(350%)" },
            },
          }} />
        </Box>
      )}

      {/* Monthly Performance Chart */}
      {data.months.length > 0 && <MonthlyPerformanceChart months={data.months} />}

      {/* Primary KPI Stat Cards */}
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)", lg: "repeat(5, 1fr)" }, mb: 2 }}>
        <StatCard label="Tracker records" value={data.total.toLocaleString()} hint={`${data.repeatSlids.length} SLIDs repeat`} />
        <StatCard
          label="SLA Compliance"
          value={slaPerf && slaPerf.total > 0 ? `${slaPerf.complianceRate}%` : "—"}
          hint={slaPerf && slaPerf.total > 0 ? `${slaPerf.met} met · ${slaPerf.breached} breached${slaPerf.customerRescheduled ? ` · ${slaPerf.customerRescheduled} cust. exempt` : ""}` : "No SLAs tracked"}
        />
        <StatCard label="Lab assessment" value={pct(data.assessments.lab)} hint={`${data.assessments.lab.count} done${data.assessments.lab.last ? ` · last ${fmt(data.assessments.lab.last)}` : ""}`} />
        <StatCard label="On-the-job assessment" value={pct(data.assessments.ojt)} hint={`${data.assessments.ojt.count} done${data.assessments.ojt.last ? ` · last ${fmt(data.assessments.ojt.last)}` : ""}`} />
        <StatCard label="Technical assessment" value={pct(data.assessments.technical)} hint={`${data.assessments.technical.count} taken${data.assessments.technical.last ? ` · last ${fmt(data.assessments.technical.last)}` : ""}`} />
      </Box>

      {/* DVOC Deep-Dive Analytics (Accountability, Root Causes, Reasons, Sentiment) */}
      {dvocAnalytics?.totalDvoc > 0 && (
        <Box sx={{ mb: 2 }}>
          {(() => {
            const rawSamples = dvocAnalytics.totalSamplesToken || 0;
            const nonAcc = dvocAnalytics.accountability.not || 0;
            const adjustedSamples = Math.max(0, rawSamples - nonAcc);
            return (
              <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, mb: 1.5 }}>
                <StatCard
                  label="DVOC Total Tasks"
                  value={dvocAnalytics.totalDvoc}
                  hint={`${dvocAnalytics.accountability.accountable} accountable · ${nonAcc} not fault`}
                />
                <StatCard
                  label="Team Accountability"
                  value={`${dvocAnalytics.accountability.pct}%`}
                  hint={`${dvocAnalytics.accountability.accountable} of ${dvocAnalytics.totalDvoc} team fault`}
                />
                <StatCard
                  label="Total Samples Token"
                  value={rawSamples > 0 ? rawSamples.toLocaleString() : "—"}
                  hint={rawSamples > 0 ? "Total survey samples" : "No samples recorded yet"}
                />
                <StatCard
                  label="Adjusted Samples"
                  value={rawSamples > 0 ? adjustedSamples.toLocaleString() : "—"}
                  hint={rawSamples > 0 ? `${rawSamples} total - ${nonAcc} non-accountable` : "No samples recorded yet"}
                />
              </Box>
            );
          })()}

          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "1.2fr 1fr 0.8fr" } }}>
            {/* Top Root Causes */}
            <SectionCard title="Most Frequent Root Causes" description="RCA identified during DVOC customer interviews.">
              {dvocAnalytics.rootCauses.length ? (
                <Bars total={dvocAnalytics.totalDvoc} items={dvocAnalytics.rootCauses.slice(0, 8).map((rc) => ({
                  key: rc.name,
                  label: <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 500 }} title={rc.name}>{rc.name}</Typography>,
                  count: rc.count,
                  color: "#F59E0B",
                }))} />
              ) : <Typography sx={{ fontSize: 13, color: "var(--text-muted)" }}>No root causes recorded.</Typography>}
            </SectionCard>

            {/* Reasons & Sub-Reasons */}
            <SectionCard title="Top Reasons & Sub-Reasons" description="Categorization of survey complaints.">
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", mb: 0.75 }}>Reasons</Typography>
              {dvocAnalytics.reasons.length ? (
                <Bars total={dvocAnalytics.totalDvoc} items={dvocAnalytics.reasons.slice(0, 5).map((r) => ({
                  key: r.name,
                  label: <Typography noWrap sx={{ fontSize: 12 }} title={r.name}>{r.name}</Typography>,
                  count: r.count,
                  color: "#3B82F6",
                }))} />
              ) : <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>None</Typography>}

              {dvocAnalytics.subReasons.length > 0 && (
                <Box sx={{ mt: 1.5, pt: 1.25, borderTop: "1px solid var(--border)" }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", mb: 0.75 }}>Sub-Reasons</Typography>
                  <Bars total={dvocAnalytics.totalDvoc} items={dvocAnalytics.subReasons.slice(0, 5).map((sr) => ({
                    key: sr.name,
                    label: <Typography noWrap sx={{ fontSize: 12 }} title={sr.name}>{sr.name}</Typography>,
                    count: sr.count,
                    color: "#8B5CF6",
                  }))} />
                </Box>
              )}
            </SectionCard>

            {/* Accountability & Customer Feedback breakdown */}
            <SectionCard title="Accountability & Sentiment" description="Survey score and responsibility split.">
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Box sx={{ p: 1.25, borderRadius: "6px", backgroundColor: "var(--surface-active)" }}>
                  <Typography sx={{ fontSize: 12, color: "var(--text-secondary)", mb: 0.5 }}>Accountability Split</Typography>
                  <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 500, mb: 0.5 }}>
                    <span style={{ color: "var(--danger)" }}>Team fault: {dvocAnalytics.accountability.accountable}</span>
                    <span style={{ color: "var(--success)" }}>Not fault: {dvocAnalytics.accountability.not}</span>
                  </Box>
                  <Box sx={{ height: 8, borderRadius: 4, backgroundColor: "var(--border)", overflow: "hidden", display: "flex" }}>
                    <Box sx={{ height: "100%", width: `${dvocAnalytics.accountability.pct}%`, backgroundColor: "var(--danger)" }} />
                    <Box sx={{ height: "100%", width: `${100 - dvocAnalytics.accountability.pct}%`, backgroundColor: "var(--success)" }} />
                  </Box>
                </Box>

                <Box sx={{ p: 1.25, borderRadius: "6px", backgroundColor: "var(--surface-active)" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography sx={{ fontSize: 12, color: "var(--text-secondary)" }}>Sentiment Distribution</Typography>
                  </Box>
                  {(() => {
                    const rawTotal = dvocAnalytics.totalSamplesToken || 0;
                    const nonAcc = dvocAnalytics.accountability.not || 0;
                    const adjustedTotal = Math.max(0, rawTotal - nonAcc);
                    const accDet = dvocAnalytics.accountability.accountable;
                    const pas = dvocAnalytics.nps.passives || 0;
                    // Promoters = adjusted total samples - accountable detractors - passives
                    const pro = adjustedTotal > 0 ? Math.max(0, adjustedTotal - accDet - pas) : Math.max(0, (dvocAnalytics.nps.promoters || 0) - nonAcc);
                    const pctOf = (n) => adjustedTotal > 0 ? ` (${Math.round((n / adjustedTotal) * 100)}%)` : '';
                    return (
                      <>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                          <Badge tone="success">Promoters (9-10): {pro}{pctOf(pro)}</Badge>
                          <Badge tone="warning">Passives (7-8): {pas}{pctOf(pas)}</Badge>
                          <Badge tone="danger">Detractors (0-6): {accDet}{pctOf(accDet)}</Badge>
                        </Box>
                        {rawTotal > 0 && (
                          <Typography sx={{ fontSize: 11, color: "var(--text-muted)", mt: 0.75 }}>
                            Based on {adjustedTotal} adjusted samples ({rawTotal} total - {nonAcc} non-accountable)
                          </Typography>
                        )}
                      </>
                    );
                  })()}
                  {dvocAnalytics.nps.avgScore !== null && (
                    <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)", mt: 0.5 }}>
                      Avg. score: {dvocAnalytics.nps.avgScore} · {dvocAnalytics.nps.totalWithScore} tasks with score
                    </Typography>
                  )}
                </Box>
              </Box>
            </SectionCard>
          </Box>
        </Box>
      )}

      {/* Tracker Overview & Code History */}
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, mb: 2 }}>
        <SectionCard title="By tracker" description="Closure Call, OJO snags, DVOC, TCRM, TRC, FAT and trackers added online.">
          {data.trackers.length ? (
            <Bars total={data.total} items={data.trackers.map((t) => ({ key: `${t.category}|${t.sub}`, label: <TaxonomyBadge tax={taxOf(t.category, t.sub)} />, count: t.count, color: taxonomyByLabel[t.category]?.color }))} />
          ) : <Typography sx={{ fontSize: 13, color: "var(--text-muted)" }}>No tracker records in this period.</Typography>}
          {data.trackers.some((t) => t.tables.length) && (
            <Box sx={{ mt: 1.5, pt: 1.25, borderTop: "1px solid var(--border)" }}>
              <Typography sx={{ fontSize: 12, color: "var(--text-secondary)", mb: 0.75 }}>Tables</Typography>
              {data.trackers.flatMap((t) => t.tables).map((tb) => (
                <Box key={tb.tableId} sx={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, py: 0.25 }}>
                  <Box component={RouterLink} to={`/tables/${tb.tableId}`} sx={{ color: "var(--accent-text)" }} dir="auto">{tb.name}</Box><span>{tb.count.toLocaleString()}</span>
                </Box>
              ))}
            </Box>
          )}
        </SectionCard>
        <SectionCard title="Team code history" description="Records count for this team only for the dates it held each code.">
          {data.codes.map((c, i) => (
            <Box key={c._id || i} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.75, borderBottom: "1px solid var(--border)", "&:last-child": { borderBottom: 0 } }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)", minWidth: 70 }}>{c.code}</Typography>
              <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", flex: 1 }}>{c.implicit ? "No recorded history yet: holds it now" : `${c.from && new Date(c.from).getUTCFullYear() > 2000 ? fmt(c.from) : "since records began"} → ${fmt(c.to)}`}</Typography>
              {!c.to && !c.implicit && <Badge tone="success">current</Badge>}
            </Box>
          ))}
          {data.repeatSlids.length > 0 && (
            <Box sx={{ mt: 1.5, pt: 1.25, borderTop: "1px solid var(--border)" }}>
              <Typography sx={{ fontSize: 12, color: "var(--text-secondary)", mb: 0.75 }}>SLIDs that come back</Typography>
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                {data.repeatSlids.map((s) => <Badge key={s.slid}>{s.slid} × {s.count}</Badge>)}
              </Box>
            </Box>
          )}
        </SectionCard>
      </Box>

      {/* Filterable Detailed Records Table */}
      <SectionCard title={`Records (${filteredRecords.length}${data.records.length >= 500 ? " of 500+" : ""})`} padding={0}>
        <Box sx={{ p: 1.5, borderBottom: "1px solid var(--border)", display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: 32, px: 1.25, width: { xs: "100%", sm: 220 }, borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--surface)" }}>
            <SearchIcon sx={{ fontSize: 17, color: "var(--text-muted)" }} />
            <InputBase value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} placeholder="Search records…" sx={{ flex: 1, fontSize: 13 }} />
          </Box>
          <TextField select size="small" value={filterSource} onChange={(e) => setFilterSource(e.target.value)} sx={{ width: 140 }}>
            <MenuItem value="all">All sources</MenuItem>
            <MenuItem value="task">DVOC only</MenuItem>
            <MenuItem value="issue">OJO Snags only</MenuItem>
            <MenuItem value="table">Tables only</MenuItem>
          </TextField>
          <TextField select size="small" value={filterAcc} onChange={(e) => setFilterAcc(e.target.value)} sx={{ width: 170 }}>
            <MenuItem value="all">All accountability</MenuItem>
            <MenuItem value="accountable">Team accountable</MenuItem>
            <MenuItem value="not">Not accountable</MenuItem>
          </TextField>
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            Showing {filteredRecords.length} record{filteredRecords.length === 1 ? "" : "s"}
          </Typography>
        </Box>
        {filteredRecords.length ? (
          <Box sx={{ height: 560 }}>
            <DataGrid
              rows={filteredRecords.map((r, i) => ({ id: i, ...r }))}
              columns={recordCols}
              density="compact"
              sx={{ ...gridSx, border: 0, '& .MuiDataGrid-row': { cursor: 'pointer' } }}
              disableRowSelectionOnClick
              onRowClick={async (params) => {
                const row = params.row;
                if (row.source === 'task') {
                  // Fetch full task then open TaskSheet
                  try {
                    // extract task id from the link: /dvoc-installations?task=<id>
                    const taskId = row.link?.split('task=')[1];
                    if (taskId) {
                      const res = await api.get(`/tasks/get-task/${taskId}`);
                      setSheetTask(res.data?.task || res.data);
                    } else {
                      setSelectedRecord(row);
                    }
                  } catch {
                    setSelectedRecord(row); // fallback to simple drawer on error
                  }
                } else {
                  setSelectedRecord(row);
                }
              }}
            />
          </Box>
        ) : <EmptyState title="No records match your filter" minHeight={160} />}
      </SectionCard>

      {/* Online Section — shows this team's online transaction data */}
      <Box sx={{ mt: 2 }}>
        <OnlineSectionManager
          sx={{}}
          defaultFilterTeam={data.teamName}
        />
      </Box>

      {/* Full TaskSheet for DVOC task records */}
      <TaskSheet
        task={sheetTask}
        open={Boolean(sheetTask)}
        onClose={() => setSheetTask(null)}
        users={sheetUsers}
        onPatch={() => {}}
        onEdit={() => {}}
        onRecordTicket={() => {}}
        onDelete={() => {}}
        canDelete={false}
      />

      {/* Fallback drawer for non-task records (OJO snags, tables) */}
      <RecordDrawer record={selectedRecord} onClose={() => setSelectedRecord(null)} fmt={fmt} />
    </Box>
  );
};

const TeamAnalysisPage = () => {
  const { teamId } = useParams();
  return teamId ? <TeamDetail teamId={teamId} /> : <TeamMatrix />;
};

export default TeamAnalysisPage;
