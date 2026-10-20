import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { format, startOfMonth, startOfYear, subMonths } from "date-fns";
import { Box, Button, InputBase, MenuItem, TextField, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import ArrowBack from "@mui/icons-material/ArrowBack";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import SearchIcon from "@mui/icons-material/Search";
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
import { taxonomyByLabel, taxonomyLabel } from "../../constants/taxonomy";
import { useTrackers } from "../../hooks/useTrackers";

const PERIODS = [
  { value: "all", label: "All time" },
  { value: "month", label: "This month" },
  { value: "3m", label: "Last 3 months" },
  { value: "12m", label: "Last 12 months" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom range" },
];
const rangeFor = (period, from, to) => {
  const now = new Date();
  if (period === "month") return { from: startOfMonth(now) };
  if (period === "3m") return { from: subMonths(now, 3) };
  if (period === "12m") return { from: subMonths(now, 12) };
  if (period === "year") return { from: startOfYear(now) };
  if (period === "custom") return { from: from ? new Date(from) : undefined, to: to ? new Date(`${to}T23:59:59`) : undefined };
  return {};
};
const pct = (x) => (x?.average === null || x?.average === undefined ? "—" : `${x.average}%`);
const taxOf = (category, sub) => ({ category, subCategory: sub, color: taxonomyByLabel[category]?.color, label: taxonomyLabel(category, sub) });

/** Period picker shared by both views; kept in the URL so links keep their range. */
const usePeriod = () => {
  const [params, setParams] = useSearchParams();
  const period = params.get("period") || "all";
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const set = (patch) => setParams((p) => { const n = new URLSearchParams(p); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); return n; }, { replace: true });
  const range = rangeFor(period, from, to);
  const query = { ...(range.from ? { from: range.from.toISOString() } : {}), ...(range.to ? { to: range.to.toISOString() } : {}) };
  const control = (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
      <TextField select size="small" value={period} onChange={(e) => set({ period: e.target.value === "all" ? null : e.target.value })} sx={{ width: 170 }} slotProps={{ htmlInput: { "aria-label": "Period" } }}>
        {PERIODS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
      </TextField>
      {period === "custom" && (
        <>
          <TextField size="small" type="date" label="From" value={from} onChange={(e) => set({ from: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" type="date" label="To" value={to} onChange={(e) => set({ to: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        </>
      )}
    </Box>
  );
  return { query, control, key: JSON.stringify(query), qs: params.toString() };
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

// ------------------------------------------------------------------ all teams
const TeamMatrix = () => {
  const navigate = useNavigate();
  const { query, control, key, qs } = usePeriod();
  const { all } = useTrackers();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [hideEmpty, setHideEmpty] = useState(true);

  useEffect(() => {
    let off = false;
    setData(null);
    setError(null);
    teamAnalyticsApi.matrix(query).then((d) => !off && setData(d)).catch((e) => !off && setError(e?.response?.data?.message || e.message));
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const categories = useMemo(() => all.map((t) => t.label), [all]);
  const rows = useMemo(() => (data?.teams || [])
    .filter((t) => !hideEmpty || t.total || t.lab.count || t.ojt.count || t.technical.count)
    .filter((t) => !q || `${t.teamName} ${t.teamCode} ${t.teamCompany}`.toLowerCase().includes(q.toLowerCase()))
    .map((t) => ({ id: t.fieldTeamId, ...t, ...Object.fromEntries(categories.map((c) => [`c:${c}`, t.byCategory[c] || 0])) })), [data, q, hideEmpty, categories]);

  const columns = [
    { field: "teamName", headerName: "Team", flex: 1, minWidth: 180, renderCell: (p) => <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}><Typography noWrap dir="auto" sx={{ fontSize: 13, fontWeight: 500 }}>{p.value}</Typography>{p.row.isTerminated && <Badge>left</Badge>}</Box> },
    { field: "teamCode", headerName: "Current code", width: 110 },
    { field: "teamCompany", headerName: "Company", width: 130 },
    { field: "total", headerName: "Tracker records", type: "number", width: 130 },
    ...categories.map((c) => ({ field: `c:${c}`, headerName: c, type: "number", width: 120, renderHeader: () => <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: taxonomyByLabel[c]?.color }} /><span>{c}</span></Box> })),
    { field: "lab", headerName: "Lab avg", width: 100, valueGetter: (v) => v?.average ?? null, renderCell: (p) => pct(p.row.lab) },
    { field: "ojt", headerName: "OJT avg", width: 100, valueGetter: (v) => v?.average ?? null, renderCell: (p) => pct(p.row.ojt) },
    { field: "technical", headerName: "Technical avg", width: 120, valueGetter: (v) => v?.average ?? null, renderCell: (p) => pct(p.row.technical) },
  ];

  const exportXlsx = () => downloadWorkbook([{
    name: "Teams",
    header: ["Team", "Current code", "Company", "Tracker records", ...categories, "Lab avg %", "Lab count", "OJT avg %", "OJT count", "Technical avg %", "Technical count"],
    rows: rows.map((t) => [t.teamName, t.teamCode, t.teamCompany, t.total, ...categories.map((c) => t.byCategory[c] || 0), t.lab.average ?? "", t.lab.count, t.ojt.average ?? "", t.ojt.count, t.technical.average ?? "", t.technical.count]),
  }], "team-analysis");

  return (
    <Box>
      <PageHeader title="Team analysis" description="Every SLID recorded in any tracker counts for the team that held its team code on the record's date, next to the team's lab, on-the-job and technical assessments."
        actions={<Button variant="outlined" startIcon={<FileDownloadOutlined sx={{ fontSize: 17 }} />} onClick={exportXlsx} disabled={!rows.length}>Export</Button>} />
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: 32, px: 1.25, width: { xs: "100%", sm: 260 }, borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--surface)" }}>
          <SearchIcon sx={{ fontSize: 17, color: "var(--text-muted)" }} />
          <InputBase value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team, code, company" inputProps={{ "aria-label": "Search teams" }} sx={{ flex: 1, fontSize: 13 }} />
        </Box>
        {control}
        <Button size="small" variant={hideEmpty ? "outlined" : "contained"} onClick={() => setHideEmpty((x) => !x)}>{hideEmpty ? "Show teams with nothing" : "Hide teams with nothing"}</Button>
      </Box>
      {error ? <ErrorState title="Couldn't load the analysis" message={error} /> : !data ? <PageLoader variant="table" /> : !rows.length ? (
        <EmptyState title="Nothing recorded for any team in this period" description="Rows count for a team when their table maps a Team code (or Field team) field, and snags, complaints and tasks carry a team." />
      ) : (
        <Box sx={{ height: "calc(100vh - 290px)", minHeight: 420 }}>
          <DataGrid rows={rows} columns={columns} density="compact" sx={gridSx} disableRowSelectionOnClick initialState={{ sorting: { sortModel: [{ field: "total", sort: "desc" }] } }}
            onRowClick={(p) => navigate(`/team-analysis/${p.id}${qs ? `?${qs}` : ""}`)} getRowClassName={() => "clickable"} />
        </Box>
      )}
    </Box>
  );
};

// ------------------------------------------------------------------ one team
const TeamDetail = ({ teamId }) => {
  const { query, control, key, qs } = usePeriod();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let off = false;
    setData(null);
    setError(null);
    teamAnalyticsApi.team(teamId, query).then((d) => !off && setData(d)).catch((e) => !off && setError(e?.response?.data?.message || e.message));
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, key]);

  const back = <Button component={RouterLink} to={`/team-analysis${qs ? `?${qs}` : ""}`} startIcon={<ArrowBack sx={{ fontSize: 17 }} />} variant="outlined">All teams</Button>;
  if (error) return <Box><PageHeader title="Team analysis" actions={back} /><ErrorState title="Couldn't load this team" message={error} /></Box>;
  if (!data) return <PageLoader variant="cards" />;
  const { team } = data;
  const fmt = (d) => (d ? format(new Date(d), "d MMM yyyy") : "now");

  const exportXlsx = () => downloadWorkbook([
    { name: "Records", header: ["Date", "Tracker", "Sub-category", "SLID", "Record", "Team code", "Source"], rows: data.records.map((r) => [new Date(r.date), r.category, r.sub || "", r.slid, r.title, r.code || "", r.tableName || r.source]) },
    { name: "Code history", header: ["Code", "From", "To"], rows: data.codes.map((c) => [c.code, c.from ? new Date(c.from) : "", c.to ? new Date(c.to) : ""]) },
  ], `team-${team.teamName}`.toLowerCase().replace(/[^\w]+/g, "-"));

  const recordCols = [
    { field: "date", headerName: "Date", width: 120, valueGetter: (v) => (v ? new Date(v) : null), renderCell: (p) => (p.value ? format(p.value, "d MMM yyyy") : "") },
    { field: "category", headerName: "Tracker", width: 190, renderCell: (p) => <TaxonomyBadge tax={taxOf(p.row.category, p.row.sub)} /> },
    { field: "slid", headerName: "SLID", width: 130 },
    { field: "title", headerName: "Record", flex: 1, minWidth: 160, renderCell: (p) => <Box component={RouterLink} to={p.row.link} sx={{ color: "var(--accent-text)", fontSize: 13 }} dir="auto">{p.value}</Box> },
    { field: "code", headerName: "Code then", width: 110 },
    { field: "tableName", headerName: "Table", width: 180 },
  ];

  return (
    <Box>
      <PageHeader title={team.teamName} description={`${team.teamCompany || ""}${team.teamCode ? ` · current code ${team.teamCode}` : ""}${team.isTerminated ? " · left" : ""}`}
        actions={<>{back}<Button variant="outlined" startIcon={<FileDownloadOutlined sx={{ fontSize: 17 }} />} onClick={exportXlsx}>Export</Button></>} />
      <Box sx={{ mb: 2 }}>{control}</Box>
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, mb: 2 }}>
        <StatCard label="Tracker records" value={data.total.toLocaleString()} hint={`${data.repeatSlids.length} SLIDs repeat`} />
        <StatCard label="Lab assessment" value={pct(data.assessments.lab)} hint={`${data.assessments.lab.count} done${data.assessments.lab.last ? ` · last ${fmt(data.assessments.lab.last)}` : ""}`} />
        <StatCard label="On-the-job assessment" value={pct(data.assessments.ojt)} hint={`${data.assessments.ojt.count} done${data.assessments.ojt.last ? ` · last ${fmt(data.assessments.ojt.last)}` : ""}`} />
        <StatCard label="Technical assessment" value={pct(data.assessments.technical)} hint={`${data.assessments.technical.count} taken${data.assessments.technical.last ? ` · last ${fmt(data.assessments.technical.last)}` : ""}`} />
      </Box>
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
        {data.months.length > 1 && (
          <SectionCard title="By month" sx={{ gridColumn: { lg: "1 / -1" } }}>
            <Bars total={Math.max(...data.months.map((m) => m.count))} items={data.months.map((m) => ({ key: m.month, label: <Typography sx={{ fontSize: 12.5 }}>{format(new Date(`${m.month}-01T00:00:00`), "MMM yyyy")}</Typography>, count: m.count }))} />
          </SectionCard>
        )}
      </Box>
      <SectionCard title={`Records${data.records.length >= 500 ? " (latest 500)" : ""}`} padding={0}>
        {data.records.length ? (
          <Box sx={{ height: 520 }}>
            <DataGrid rows={data.records.map((r, i) => ({ id: i, ...r }))} columns={recordCols} density="compact" sx={{ ...gridSx, border: 0 }} disableRowSelectionOnClick />
          </Box>
        ) : <EmptyState title="No records in this period" minHeight={160} />}
      </SectionCard>
    </Box>
  );
};

const TeamAnalysisPage = () => {
  const { teamId } = useParams();
  return teamId ? <TeamDetail teamId={teamId} /> : <TeamMatrix />;
};

export default TeamAnalysisPage;
