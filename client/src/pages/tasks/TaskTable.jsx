import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { DataGrid, GridToolbarColumnsButton, GridToolbarContainer, GridToolbarDensitySelector } from "@mui/x-data-grid";
import Badge from "../../components/ui/Badge";
import AvatarGroup from "../../components/ui/AvatarGroup";
import EmptyState from "../../components/ui/EmptyState";
import { gridSx } from "./gridSx";
import { npsType, priorityMeta, statusMeta, taskDate, fmtDate } from "./taskUtils";


const Toolbar = () => (
  <GridToolbarContainer>
    <GridToolbarColumnsButton />
    <GridToolbarDensitySelector />
  </GridToolbarContainer>
);

const NoRows = () => <EmptyState title="No tasks match" description="Try clearing filters or widening the date range." minHeight={200} />;

const TaskTable = ({ tasks, loading, selection, onSelectionChange, onOpen }) => {
  const columns = useMemo(
    () => [
      { field: "slid", headerName: "SLID", width: 130, renderCell: ({ value }) => <Typography sx={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{value}</Typography> },
      {
        field: "customerName", headerName: "Customer", flex: 1, minWidth: 180,
        renderCell: ({ row }) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 13, fontWeight: 500 }}>{row.customerName || "—"}</Typography>
            <Typography noWrap sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>Req. {row.requestNumber}</Typography>
          </Box>
        ),
      },
      {
        field: "status", headerName: "Status", width: 130,
        renderCell: ({ value }) => { const s = statusMeta(value); return <Badge tone={s.tone} dot>{s.label}</Badge>; },
      },
      {
        field: "evaluationScore", headerName: "Score", width: 130, type: "number", align: "left", headerAlign: "left",
        valueGetter: (v) => (Number.isFinite(Number(v)) ? Number(v) : null),
        renderCell: ({ value }) => { const n = npsType(value); return n ? <Badge tone={n.tone}>{n.label} · {value}</Badge> : "—"; },
      },
      {
        field: "priority", headerName: "Priority", width: 120,
        renderCell: ({ value }) => (!value || value === "Not specified" ? <Typography sx={{ color: "var(--text-muted)", fontSize: 12.5 }}>—</Typography> : <Badge tone={priorityMeta(value).tone}>{value}</Badge>),
      },
      { field: "teamName", headerName: "Field team", width: 170, valueGetter: (v) => v || "—" },
      {
        field: "assignedTo", headerName: "Assignees", width: 130, sortable: false,
        valueGetter: (v) => (v || []).map((u) => u?.name).filter(Boolean).join(", "),
        renderCell: ({ row }) => <AvatarGroup users={row.assignedTo} max={4} size={24} />,
      },
      { field: "governorate", headerName: "Governorate", width: 130, valueGetter: (v) => v || "—" },
      {
        field: "interviewDate", headerName: "Interview date", width: 130, type: "date",
        valueGetter: (_v, row) => (taskDate(row) ? new Date(taskDate(row)) : null),
        renderCell: ({ value }) => fmtDate(value),
      },
      { field: "validationStatus", headerName: "Validation", width: 130, valueGetter: (v) => v || "—" },
    ],
    []
  );

  return (
    <DataGrid
      rows={tasks}
      columns={columns}
      getRowId={(r) => r._id}
      loading={loading}
      checkboxSelection
      disableRowSelectionOnClick
      rowSelectionModel={selection}
      onRowSelectionModelChange={onSelectionChange}
      onRowClick={({ row }) => onOpen(row)}
      initialState={{
        pagination: { paginationModel: { pageSize: 25 } },
        columns: { columnVisibilityModel: { governorate: false, validationStatus: false } },
        sorting: { sortModel: [{ field: "interviewDate", sort: "desc" }] },
      }}
      pageSizeOptions={[25, 50, 100]}
      rowHeight={48}
      columnHeaderHeight={40}
      slots={{ toolbar: Toolbar, noRowsOverlay: NoRows }}
      sx={{ ...gridSx, minHeight: 420 }}
      autoHeight
    />
  );
};

export default TaskTable;
