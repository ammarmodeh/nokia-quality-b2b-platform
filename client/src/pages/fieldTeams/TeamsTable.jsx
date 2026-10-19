import { useMemo } from "react";
import { Avatar, Box, IconButton, Switch, Tooltip, Typography } from "@mui/material";
import { DataGrid, GridToolbarColumnsButton, GridToolbarContainer, GridToolbarDensitySelector } from "@mui/x-data-grid";
import MoreHoriz from "@mui/icons-material/MoreHoriz";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { gridSx } from "../tasks/gridSx";
import { escalationTone, evalTone, fmtDate, latestEval, teamStatusOf } from "./teamUtils";

const Toolbar = () => (
  <GridToolbarContainer>
    <GridToolbarColumnsButton />
    <GridToolbarDensitySelector />
  </GridToolbarContainer>
);

const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("") || "?";

/** Field teams list. Calculations (metrics, escalation) come from the page. */
const TeamsTable = ({ rows, metrics, isAdmin, selection, onSelection, onOpen, onToggleQuiz, onMenu, onWarnings }) => {
  const columns = useMemo(
    () => [
      {
        field: "teamName", headerName: "Team", flex: 1.4, minWidth: 220,
        renderCell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
            <Avatar sx={{ width: 30, height: 30, fontSize: 12, fontWeight: 600, bgcolor: "var(--accent-subtle)", color: "var(--accent-text)" }}>{initials(row.teamName)}</Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap dir="auto" sx={{ fontSize: 13, fontWeight: 500 }}>{row.teamName}</Typography>
              <Typography noWrap sx={{ fontSize: 11.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{row.teamCode || "—"}</Typography>
            </Box>
          </Box>
        ),
      },
      {
        field: "status", headerName: "Status", width: 118, valueGetter: (_v, row) => teamStatusOf(row).label,
        renderCell: ({ row }) => { const s = teamStatusOf(row); return <Badge tone={s.tone} dot>{s.label}</Badge>; },
      },
      { field: "teamCompany", headerName: "Company", width: 120, valueGetter: (v) => v || "—" },
      {
        field: "performance", headerName: "Last quiz", width: 116, type: "number", align: "left", headerAlign: "left",
        valueGetter: (_v, row) => latestEval(row)?.percentage ?? null,
        renderCell: ({ row }) => {
          const e = latestEval(row);
          if (!e) return <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>No data</Typography>;
          return (
            <Tooltip title={`Submitted ${fmtDate(e.submittedAt)}`}>
              <span><Badge tone={evalTone(e.percentage)}>{e.percentage}%</Badge></span>
            </Tooltip>
          );
        },
      },
      {
        field: "accIssues", headerName: "Accountable", width: 128, type: "number", align: "left", headerAlign: "left",
        description: "Accountable detractors / neutrals in the analysis period",
        valueGetter: (_v, row) => metrics[row._id]?.points ?? 0,
        renderCell: ({ row }) => {
          const m = metrics[row._id];
          if (!m) return "—";
          return (
            <Tooltip title={`${m.accDet} detractor(s) · ${m.accNeu} neutral(s) · ${m.points} point(s)`}>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <Badge tone={m.accDet ? "danger" : "neutral"} sx={{ height: 20, fontSize: 11 }}>D {m.accDet}</Badge>
                <Badge tone={m.accNeu ? "warning" : "neutral"} sx={{ height: 20, fontSize: 11 }}>N {m.accNeu}</Badge>
              </Box>
            </Tooltip>
          );
        },
      },
      {
        field: "requiredEscalation", headerName: "Required escalation", flex: 1.2, minWidth: 220,
        valueGetter: (_v, row) => metrics[row._id]?.consequenceLevel ?? 0,
        renderCell: ({ row }) => {
          const m = metrics[row._id];
          if (!m) return "—";
          return (
            <Tooltip title={m.requiredConsequence}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                <Badge tone={escalationTone(m.consequenceLevel)} sx={{ flexShrink: 0 }}>L{m.consequenceLevel}</Badge>
                <Typography noWrap sx={{ fontSize: 12.5, color: m.consequenceLevel ? "var(--text)" : "var(--text-muted)" }}>{m.requiredConsequence}</Typography>
              </Box>
            </Tooltip>
          );
        },
      },
      {
        field: "escalationAction", headerName: "Latest action", flex: 1, minWidth: 180,
        renderCell: ({ row }) =>
          row.escalationAction ? (
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 12.5 }}>{row.escalationAction}</Typography>
              <Typography noWrap sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>{row.escalationStatus || "Pending"} · {fmtDate(row.escalationDate)}</Typography>
            </Box>
          ) : (
            <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>None</Typography>
          ),
      },
      {
        field: "escalationHistory", headerName: "Warnings", width: 100, type: "number", align: "left", headerAlign: "left",
        valueGetter: (v) => (v || []).length,
        renderCell: ({ row, value }) => (
          <Box
            component="button"
            type="button"
            onClick={(e) => { e.stopPropagation(); onWarnings(row); }}
            sx={{ border: 0, background: "none", p: 0, cursor: "pointer", font: "inherit" }}
            aria-label={`${value} warnings for ${row.teamName}`}
          >
            <Badge tone={value ? "danger" : "neutral"}>{value}</Badge>
          </Box>
        ),
      },
      { field: "contactNumber", headerName: "Contact", width: 130, valueGetter: (v) => v || "—" },
      { field: "quizCode", headerName: "Quiz code", width: 110, renderCell: ({ value }) => <Typography sx={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>{value || "—"}</Typography> },
      ...(isAdmin
        ? [
            {
              field: "canTakeQuiz", headerName: "Quiz access", width: 108, type: "boolean",
              renderCell: ({ row }) => (
                <Tooltip title={row.canTakeQuiz ? "Can take the quiz — click to block" : "Blocked — click to allow"}>
                  <Switch size="small" checked={!!row.canTakeQuiz} onClick={(e) => e.stopPropagation()} onChange={(e) => onToggleQuiz(row._id, e.target.checked)} inputProps={{ "aria-label": `Quiz access for ${row.teamName}` }} />
                </Tooltip>
              ),
            },
          ]
        : []),
      {
        field: "actions", headerName: "", width: 52, sortable: false, align: "right", disableColumnMenu: true,
        renderCell: ({ row }) => (
          <IconButton size="small" aria-label={`Actions for ${row.teamName}`} onClick={(e) => { e.stopPropagation(); onMenu(e, row); }} sx={{ color: "var(--text-muted)" }}>
            <MoreHoriz fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [metrics, isAdmin, onToggleQuiz, onMenu, onWarnings]
  );

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      getRowId={(r) => r._id}
      checkboxSelection
      disableRowSelectionOnClick
      rowSelectionModel={selection}
      onRowSelectionModelChange={onSelection}
      onRowClick={({ row }) => onOpen(row)}
      initialState={{
        pagination: { paginationModel: { pageSize: 25 } },
        sorting: { sortModel: [{ field: "requiredEscalation", sort: "desc" }] },
        columns: { columnVisibilityModel: { contactNumber: false, quizCode: false } },
      }}
      pageSizeOptions={[10, 25, 50, 100]}
      rowHeight={54}
      columnHeaderHeight={40}
      autoHeight
      slots={{ toolbar: Toolbar, noRowsOverlay: () => <EmptyState title="No teams match" description="Clear the filters or add a team." minHeight={200} /> }}
      sx={{ ...gridSx, minHeight: 360 }}
    />
  );
};

export default TeamsTable;
