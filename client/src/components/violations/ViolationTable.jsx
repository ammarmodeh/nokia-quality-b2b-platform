import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, IconButton, InputBase, ListItemIcon, Menu, MenuItem, Popover, Tooltip, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import EventAvailableOutlined from "@mui/icons-material/EventAvailableOutlined";
import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import PersonOffOutlined from "@mui/icons-material/PersonOffOutlined";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import ReportGmailerrorredOutlined from "@mui/icons-material/ReportGmailerrorredOutlined";
import AddIcon from "@mui/icons-material/Add";
import { addDays, startOfWeek } from "date-fns";
import Badge from "../ui/Badge";
import FilterChip from "../ui/FilterChip";
import SectionCard from "../ui/SectionCard";
import EmptyState from "../ui/EmptyState";
import { gridSx } from "../../pages/tasks/gridSx";
import { TASK_TAXONOMY, taxonomyByLabel, taxonomyLabel } from "../../constants/taxonomy";

const WEEKS = 8;
const STATUS_TONE = { Active: "success", Suspended: "warning", "On Leave": "info", Resigned: "neutral", Terminated: "danger" };

const shortName = (name = "") => (name.length > 12 ? `${name.slice(0, 11)}…` : name);

// Violations per tracker category in the selected period (survey tasks + custom tables).
const CategoryStrip = ({ data }) => {
  if (!data) return null;
  const items = [
    { key: "dvoc", label: taxonomyLabel(TASK_TAXONOMY.category, TASK_TAXONOMY.subCategory), color: taxonomyByLabel[TASK_TAXONOMY.category]?.color, count: data.dvoc, hint: "Detractors and neutrals from survey tasks" },
    ...data.custom.map((c) => ({ key: `${c.issueCategory}|${c.issueSubCategory || ""}`, label: taxonomyLabel(c.issueCategory, c.issueSubCategory), color: taxonomyByLabel[c.issueCategory]?.color, count: c.count, hint: c.tables.map((t) => `${t.name}: ${t.count}`).join(" · ") })),
  ];
  // custom DVOC · Installation rows fold into the survey item
  const merged = [];
  for (const it of items) {
    const same = merged.find((m) => m.label === it.label);
    if (same) Object.assign(same, { count: same.count + it.count, hint: `${same.hint} · ${it.hint}` });
    else merged.push({ ...it });
  }
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", px: 2, py: 1, borderBottom: "1px solid var(--border)" }}>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", mr: 0.5 }}>By tracker · {data.label}</Typography>
      {merged.map((it) => (
        <Tooltip key={it.key} title={it.hint}>
          <span><Badge color={it.color} sx={{ fontVariantNumeric: "tabular-nums" }}>{it.label} {it.count}</Badge></span>
        </Tooltip>
      ))}
      {data.unmatched > 0 && (
        <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>{data.unmatched} custom-table row{data.unmatched > 1 ? "s" : ""} name a team that isn&apos;t in Field Teams</Typography>
      )}
    </Box>
  );
};

const Sparkline = ({ values }) => {
  const max = Math.max(1, ...values);
  const w = 72, h = 22, step = w / (values.length - 1 || 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(" ");
  const last = values[values.length - 1];
  const rising = values.length > 1 && last > values[values.length - 2];
  return (
    <Tooltip title={`Violations per week, last ${values.length} weeks: ${values.join(", ")}`}>
      <svg width={w} height={h} role="img" aria-label={`Weekly violations trend: ${values.join(", ")}`} style={{ overflow: "visible" }}>
        <polyline points={pts} fill="none" stroke={rising ? "var(--danger)" : "var(--text-muted)"} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={(values.length - 1) * step} cy={h - 2 - (last / max) * (h - 4)} r="2.5" fill={rising ? "var(--danger)" : "var(--text-secondary)"} />
      </svg>
    </Tooltip>
  );
};

const CountVsLimit = ({ count, limit, violated }) => {
  const tone = violated ? "danger" : count === limit && count > 0 ? "warning" : count > 0 ? "neutral" : "neutral";
  return (
    <Tooltip title={violated ? `Over the limit by ${count - limit}` : count === limit && count > 0 ? "At the limit" : "Within limit"}>
      <Box sx={{ display: "inline-flex", alignItems: "baseline", gap: 0.5 }}>
        <Badge tone={tone} sx={{ minWidth: 28, justifyContent: "center", fontVariantNumeric: "tabular-nums" }}>{count}</Badge>
        <Typography component="span" sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>/ {limit}</Typography>
      </Box>
    </Tooltip>
  );
};

const RowMenu = ({ row, onViewTasks, onAddSession, onViewSessions, onReportAbsence, onDetails }) => {
  const [anchor, setAnchor] = useState(null);
  const run = (fn) => () => {
    setAnchor(null);
    fn();
  };
  return (
    <>
      <IconButton size="small" aria-label={`Actions for ${row.teamName}`} onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }} sx={{ color: "var(--text-muted)" }}>
        <MoreHoriz fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} onClick={(e) => e.stopPropagation()} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
        <MenuItem onClick={run(onDetails)}><ListItemIcon><ReportGmailerrorredOutlined fontSize="small" /></ListItemIcon>Violation details</MenuItem>
        <MenuItem onClick={run(onViewTasks)}><ListItemIcon><AssignmentOutlined fontSize="small" /></ListItemIcon>Open in Tasks</MenuItem>
        <MenuItem onClick={run(onAddSession)}><ListItemIcon><EventAvailableOutlined fontSize="small" /></ListItemIcon>Add training session</MenuItem>
        <MenuItem onClick={run(onViewSessions)}><ListItemIcon><HistoryOutlined fontSize="small" /></ListItemIcon>View sessions</MenuItem>
        <MenuItem onClick={run(onReportAbsence)}><ListItemIcon><PersonOffOutlined fontSize="small" /></ListItemIcon>Report absence</MenuItem>
      </Menu>
    </>
  );
};

/**
 * Presentational table for the Team Violation Tracker. All calculations stay
 * in TeamViolationTracker; this only renders rows and forwards actions.
 */
const ViolationTable = ({
  rows, tasks, weekStartDay = 0, detractorLimit, neutralLimit, breakdown, categoryBreakdown,
  search, onSearch, statusFilter, onStatusFilter, teamStatus, onTeamStatus,
  selection, onSelection, onBulkAddSession, onExport,
  onTeamDetails, onAddSession, onViewSessions, onReportAbsence,
}) => {
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const tax = taxonomyByLabel[TASK_TAXONOMY.category];

  // Weekly violation counts per team for the sparkline (last 8 weeks)
  const trend = useMemo(() => {
    const thisWeek = startOfWeek(new Date(), { weekStartsOn: weekStartDay });
    const starts = Array.from({ length: WEEKS }, (_, i) => addDays(thisWeek, -7 * (WEEKS - 1 - i)).getTime());
    const map = new Map();
    for (const t of tasks) {
      if (!t.interviewDate || !(t.evaluationScore >= 1 && t.evaluationScore <= 8)) continue;
      const ws = startOfWeek(new Date(t.interviewDate), { weekStartsOn: weekStartDay }).getTime();
      const idx = starts.indexOf(ws);
      if (idx < 0) continue;
      if (!map.has(t.teamName)) map.set(t.teamName, Array(WEEKS).fill(0));
      map.get(t.teamName)[idx]++;
    }
    return map;
  }, [tasks, weekStartDay]);

  const shown = useMemo(() => (teamStatus.length ? rows.filter((r) => teamStatus.includes(r.validationStatus)) : rows), [rows, teamStatus]);
  const overCount = rows.filter((r) => r.violatesDetractorThreshold || r.violatesNeutralThreshold).length;

  const columns = useMemo(
    () => [
      {
        field: "rank", headerName: "#", width: 52, sortable: false,
        renderCell: (p) => <Typography sx={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{p.api.getRowIndexRelativeToVisibleRows(p.id) + 1}</Typography>,
      },
      {
        field: "teamName", headerName: "Field team", flex: 1, minWidth: 200,
        renderCell: ({ row }) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap dir="auto" sx={{ fontSize: 13, fontWeight: 500 }}>{row.teamName}</Typography>
            <Typography noWrap sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>{row.teamCompany}</Typography>
          </Box>
        ),
      },
      { field: "validationStatus", headerName: "Status", width: 116, renderCell: ({ value }) => <Badge tone={STATUS_TONE[value] || "neutral"} dot>{value}</Badge> },
      {
        field: "detractorCount", headerName: "Detractors", width: 112, type: "number", align: "left", headerAlign: "left",
        renderCell: ({ row }) => <CountVsLimit count={row.detractorCount} limit={detractorLimit} violated={row.violatesDetractorThreshold} />,
      },
      {
        field: "neutralCount", headerName: "Neutrals", width: 104, type: "number", align: "left", headerAlign: "left",
        renderCell: ({ row }) => <CountVsLimit count={row.neutralCount} limit={neutralLimit} violated={row.violatesNeutralThreshold} />,
      },
      {
        field: "equivalentDetractorCount", headerName: "Weighted", width: 96, type: "number", align: "left", headerAlign: "left",
        description: "Detractors + one per 3 neutrals",
        renderCell: ({ value }) => <Typography sx={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>,
      },
      {
        field: "accountableCount", headerName: "Accountable", width: 124, type: "number", align: "left", headerAlign: "left",
        description: "Detractors and neutrals the team is accountable for · registered but not accountable",
        renderCell: ({ row }) => (
          <Tooltip title={`${row.accountableCount ?? 0} team-accountable · ${row.notAccountableCount ?? 0} not accountable`}>
            <Box component="span" sx={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
              <strong>{row.accountableCount ?? 0}</strong>
              <Box component="span" sx={{ color: "var(--text-muted)" }}> · {row.notAccountableCount ?? 0} not</Box>
            </Box>
          </Tooltip>
        ),
      },
      {
        field: "byTracker", headerName: "By tracker", width: 190, sortable: false,
        description: "DVOC · Installation violations year to date, plus custom-table rows in the selected period",
        renderCell: ({ row }) => {
          const custom = row.customByTracker || [];
          if (!row.totalViolations && !custom.length) return <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>—</Typography>;
          const extra = custom.slice(row.totalViolations ? 1 : 2);
          return (
            <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", minWidth: 0 }}>
              {row.totalViolations > 0 && <Badge color={tax?.color} title={taxonomyLabel(TASK_TAXONOMY.category, TASK_TAXONOMY.subCategory)}>DVOC · Inst. {row.totalViolations}</Badge>}
              {custom.slice(0, row.totalViolations ? 1 : 2).map((c) => (
                <Badge key={c.tableId} color={taxonomyByLabel[c.issueCategory]?.color} title={`${c.name} · ${taxonomyLabel(c.issueCategory, c.issueSubCategory)}`}>{shortName(c.name)} {c.count}</Badge>
              ))}
              {extra.length > 0 && (
                <Tooltip title={extra.map((c) => `${c.name}: ${c.count}`).join(" · ")}>
                  <span><Badge tone="neutral">+{extra.length}</Badge></span>
                </Tooltip>
              )}
            </Box>
          );
        },
      },
      { field: "trend", headerName: `Last ${WEEKS} wks`, width: 104, sortable: false, renderCell: ({ row }) => <Sparkline values={trend.get(row.teamName) || Array(WEEKS).fill(0)} /> },
      {
        field: "priority", headerName: "Priority mix", width: 120, sortable: false,
        renderCell: ({ row }) => (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {[["H", row.highPriorityCount, "danger"], ["M", row.mediumPriorityCount, "warning"], ["L", row.lowPriorityCount, "neutral"]].map(([k, v, t]) => (
              <Tooltip key={k} title={`${{ H: "High", M: "Medium", L: "Low" }[k]} priority`}>
                <span><Badge tone={v ? t : "neutral"} sx={{ height: 20, fontSize: 11, opacity: v ? 1 : 0.5 }}>{k} {v}</Badge></span>
              </Tooltip>
            ))}
          </Box>
        ),
      },
      {
        field: "advice", headerName: "Guidance", flex: 1, minWidth: 200,
        renderCell: ({ row }) => (
          <Tooltip title={row.thresholdDescription !== "Not reached" ? `${row.thresholdDescription}${row.dateReachedLimit ? ` · ${row.dateReachedLimit}` : ""}` : row.notes}>
            <Typography noWrap sx={{ fontSize: 12.5, color: row.violatesDetractorThreshold || row.violatesNeutralThreshold ? "var(--text)" : "var(--text-muted)" }}>{row.advice}</Typography>
          </Tooltip>
        ),
      },
      {
        field: "actions", headerName: "", width: 52, sortable: false, align: "right",
        renderCell: ({ row }) => (
          <RowMenu
            row={row}
            onDetails={() => onTeamDetails(row.teamName)}
            onViewTasks={() => navigate(`/dvoc-installations?view=table&team=${encodeURIComponent(row.teamName)}`)}
            onAddSession={() => onAddSession(row.teamName, row.id)}
            onViewSessions={() => onViewSessions(row.id)}
            onReportAbsence={() => onReportAbsence(row.teamName, row.id)}
          />
        ),
      },
    ],
    [detractorLimit, neutralLimit, trend, tax, navigate, onTeamDetails, onAddSession, onViewSessions, onReportAbsence]
  );

  return (
    <SectionCard
      title="Team violation tracker"
      description={`${overCount} of ${rows.length} teams over their year-to-date limit · limits ${detractorLimit} detractors / ${neutralLimit} neutrals per team`}
      actions={
        <>
          <Tooltip title="How limits are calculated">
            <IconButton size="small" aria-label="How limits are calculated" onClick={(e) => setInfo(e.currentTarget)} sx={{ border: "1px solid var(--border)" }}>
              <InfoOutlined sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<FileDownloadOutlined sx={{ fontSize: 16 }} />} onClick={onExport}>Export</Button>
        </>
      }
      bodySx={{ p: 0 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", px: 2, py: 1.25, borderBottom: "1px solid var(--border)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: 30, px: 1.25, width: { xs: "100%", sm: 240 }, borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", mr: 0.5 }}>
          <SearchIcon sx={{ fontSize: 16, color: "var(--text-muted)" }} />
          <InputBase value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search teams…" inputProps={{ "aria-label": "Search teams" }} sx={{ fontSize: 13, flex: 1 }} />
        </Box>
        <FilterChip
          label="Limit"
          single
          options={[
            { value: "detractorFail", label: "Detractor limit exceeded" },
            { value: "neutralFail", label: "Neutral limit exceeded" },
            { value: "bothFail", label: "Both exceeded" },
          ]}
          value={statusFilter === "all" ? [] : [statusFilter]}
          onChange={(v) => onStatusFilter(v[0] || "all")}
        />
        <FilterChip
          label="Team status"
          options={Object.keys(STATUS_TONE).map((s) => ({ value: s, label: s, hint: rows.filter((r) => r.validationStatus === s).length }))}
          value={teamStatus}
          onChange={onTeamStatus}
        />
        <Box sx={{ flex: 1 }} />
        {selection.length > 0 && (
          <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 17 }} />} onClick={onBulkAddSession}>
            Add session for {selection.length} team{selection.length > 1 ? "s" : ""}
          </Button>
        )}
      </Box>
      <CategoryStrip data={categoryBreakdown} />
      <DataGrid
        rows={shown}
        columns={columns}
        checkboxSelection
        disableRowSelectionOnClick
        rowSelectionModel={selection}
        onRowSelectionModelChange={onSelection}
        onRowClick={({ row }) => onTeamDetails(row.teamName)}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        pageSizeOptions={[10, 25, 50]}
        rowHeight={52}
        columnHeaderHeight={40}
        autoHeight
        disableColumnMenu
        slots={{ noRowsOverlay: () => <EmptyState title="No teams match" description="Clear the filters to see every team." minHeight={180} /> }}
        sx={{ ...gridSx, border: 0, borderRadius: 0, boxShadow: "none", borderBottomLeftRadius: "10px", borderBottomRightRadius: "10px" }}
      />

      <Popover open={Boolean(info)} anchorEl={info} onClose={() => setInfo(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { p: 2, width: 360, mt: 0.75 } } }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 600, mb: 1 }}>{breakdown?.modelName}</Typography>
        <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mb: 1.25 }}>{breakdown?.note}</Typography>
        {[
          ["Year-to-date samples", breakdown?.ytdTotal?.toLocaleString?.() ?? breakdown?.ytdTotal],
          ["Active teams", breakdown?.activeTeams],
          ["Fair share per team", breakdown?.activeTeams ? `${(breakdown.ytdTotal / breakdown.activeTeams).toFixed(1)} samples` : "—"],
          ["Targets", `≤ ${((breakdown?.targetDetractor || 0) * 100).toFixed(0)}% detractors · ≤ ${((breakdown?.targetNeutral || 0) * 100).toFixed(0)}% neutrals`],
          ["Baseline grace", `${breakdown?.baselineDetractors} detractor · ${breakdown?.baselineNeutrals} neutrals`],
          ["Enforced limit per team", `${detractorLimit} detractors · ${neutralLimit} neutrals`],
        ].map(([k, v]) => (
          <Box key={k} sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.5, borderTop: "1px solid var(--border)", fontSize: 12.5 }}>
            <span style={{ color: "var(--text-secondary)" }}>{k}</span>
            <strong style={{ textAlign: "right" }}>{v}</strong>
          </Box>
        ))}
      </Popover>
    </SectionCard>
  );
};

export default ViolationTable;
