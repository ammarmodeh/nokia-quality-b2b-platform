import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { DataGrid, GridToolbarColumnsButton, GridToolbarContainer, GridToolbarDensitySelector } from "@mui/x-data-grid";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { gridSx } from "../tasks/gridSx";
import { taxonomyByLabel } from "../../constants/taxonomy";
import { categoriesOf, fmt, reportedDate, snagTypeOf, sourceOf, statusOf } from "./snagUtils";

const ojo = taxonomyByLabel["OJO Snags"];

const Toolbar = () => (
  <GridToolbarContainer>
    <GridToolbarColumnsButton />
    <GridToolbarDensitySelector />
  </GridToolbarContainer>
);

const SnagTable = ({ rows, loading, onOpen }) => {
  const columns = useMemo(
    () => [
      {
        field: "slid", headerName: "SLID", width: 140,
        renderCell: ({ row }) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{row.slid}</Typography>
            {row.ticketId && <Typography noWrap sx={{ fontSize: 11, color: "var(--text-muted)" }}>{row.ticketId}</Typography>}
          </Box>
        ),
      },
      {
        field: "customerName", headerName: "Customer", flex: 1, minWidth: 170,
        renderCell: ({ row }) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap dir="auto" sx={{ fontSize: 13, fontWeight: 500 }}>{row.customerName || "—"}</Typography>
            <Typography noWrap dir="auto" sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>{row.area || row.customerContact || ""}</Typography>
          </Box>
        ),
      },
      {
        field: "snagType", headerName: "Type", width: 160, valueGetter: (_v, row) => snagTypeOf(row),
        renderCell: ({ value }) => <Badge color={ojo?.color}>OJO · {value}</Badge>,
      },
      {
        field: "categories", headerName: "Issues", flex: 1, minWidth: 200, sortable: false,
        valueGetter: (_v, row) => categoriesOf(row).join(", "),
        renderCell: ({ row }) => {
          const cats = categoriesOf(row);
          const subs = (row.issues || []).map((i) => i?.subCategory).filter(Boolean);
          return (
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: "flex", gap: 0.5, overflow: "hidden" }}>
                {cats.slice(0, 2).map((c) => <Badge key={c} outline sx={{ height: 20, fontSize: 11 }}>{c}</Badge>)}
                {cats.length > 2 && <Badge sx={{ height: 20, fontSize: 11 }}>+{cats.length - 2}</Badge>}
              </Box>
              {subs.length > 0 && <Typography noWrap dir="auto" sx={{ fontSize: 11.5, color: "var(--text-muted)", mt: 0.25 }}>{subs.join(" · ")}</Typography>}
            </Box>
          );
        },
      },
      { field: "teamName", headerName: "Field team", width: 170, renderCell: ({ value }) => <Typography noWrap dir="auto" sx={{ fontSize: 13 }}>{value || "—"}</Typography> },
      {
        field: "status", headerName: "Status", width: 120, valueGetter: (_v, row) => statusOf(row).label,
        renderCell: ({ row }) => { const s = statusOf(row); return <Badge tone={s.tone} dot>{s.label}</Badge>; },
      },
      { field: "reported", headerName: "Reported", width: 120, type: "date", valueGetter: (_v, row) => (reportedDate(row) ? new Date(reportedDate(row)) : null), renderCell: ({ value }) => fmt(value) },
      { field: "resolveDate", headerName: "Resolved", width: 120, type: "date", valueGetter: (v) => (v ? new Date(v) : null), renderCell: ({ value }) => fmt(value) },
      { field: "source", headerName: "Source", width: 130, valueGetter: (_v, row) => sourceOf(row) },
      { field: "reporter", headerName: "Reporter", width: 150, valueGetter: (v) => v || "—" },
      { field: "resolvedBy", headerName: "Resolved by", width: 110, valueGetter: (v) => v || "—" },
    ],
    []
  );

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      getRowId={(r) => r._id}
      loading={loading}
      onRowClick={({ row }) => onOpen(row)}
      disableRowSelectionOnClick
      initialState={{
        pagination: { paginationModel: { pageSize: 25 } },
        sorting: { sortModel: [{ field: "reported", sort: "desc" }] },
        columns: { columnVisibilityModel: { source: false, reporter: false, resolvedBy: false } },
      }}
      pageSizeOptions={[25, 50, 100]}
      rowHeight={52}
      columnHeaderHeight={40}
      autoHeight
      slots={{ toolbar: Toolbar, noRowsOverlay: () => <EmptyState title="No snags match" description="Try another tab or clear the filters." minHeight={200} /> }}
      sx={{ ...gridSx, minHeight: 360 }}
    />
  );
};

export default SnagTable;
