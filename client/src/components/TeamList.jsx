import { useState } from 'react';
import { Box, InputBase, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import Badge from "./ui/Badge";
import EmptyState from "./ui/EmptyState";
import { gridSx } from "../pages/tasks/gridSx";

const TONE = { success: 'success', warning: 'warning', error: 'danger', info: 'info' };

/** Field teams with their on-the-job assessment count and average; click a row to open the team. */
const TeamList = ({
  fieldTeams,
  teamAssessmentsMap,
  getTeamAverageScore,
  getPerformanceColor,
  getScoreLabel,
  loading,
  onSelectTeam,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const rows = (fieldTeams || []).filter((team) => (team.teamName || '').toLowerCase().includes(searchTerm.toLowerCase()));
  const countOf = (team) => (teamAssessmentsMap[String(team._id)] || []).length;

  const columns = [
    {
      field: 'teamName', headerName: 'Team', flex: 1, minWidth: 180,
      renderCell: ({ row }) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap dir="auto" sx={{ fontSize: 13, fontWeight: 500 }}>{row.teamName}</Typography>
          <Typography noWrap sx={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{row.teamCompany || `ID ${String(row._id).slice(-6).toUpperCase()}`}</Typography>
        </Box>
      ),
    },
    { field: 'count', headerName: 'Assessments', type: 'number', width: 130, align: 'left', headerAlign: 'left', valueGetter: (_v, row) => countOf(row) },
    {
      field: 'average', headerName: 'Average', type: 'number', width: 110, align: 'left', headerAlign: 'left',
      valueGetter: (_v, row) => (countOf(row) ? Math.round(getTeamAverageScore(row._id)) : null),
      renderCell: ({ value }) => (value === null ? <Typography sx={{ fontSize: 12.5, color: 'var(--text-muted)' }}>—</Typography> : `${value}%`),
    },
    {
      field: 'result', headerName: 'Result', width: 160,
      valueGetter: (_v, row) => (countOf(row) ? getScoreLabel(getTeamAverageScore(row._id)) : 'Not assessed'),
      renderCell: ({ row, value }) => (countOf(row)
        ? <Badge tone={TONE[getPerformanceColor(getTeamAverageScore(row._id))] || 'neutral'} dot>{value}</Badge>
        : <Badge>{value}</Badge>),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 32, px: 1.25, width: { xs: '100%', sm: 260 }, mb: 1.5, borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', boxShadow: 'var(--shadow-xs)', '&:focus-within': { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-ring)' } }}>
        <SearchIcon sx={{ fontSize: 17, color: 'var(--text-muted)' }} />
        <InputBase value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search teams…" inputProps={{ 'aria-label': 'Search teams' }} sx={{ flex: 1, fontSize: 13 }} />
      </Box>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => r._id}
        loading={loading}
        onRowClick={({ row }) => onSelectTeam(row)}
        disableRowSelectionOnClick
        autoHeight
        rowHeight={52}
        columnHeaderHeight={40}
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } }, sorting: { sortModel: [{ field: 'count', sort: 'desc' }] } }}
        slots={{ noRowsOverlay: () => <EmptyState title="No teams match" minHeight={180} /> }}
        sx={{ ...gridSx, minHeight: 260 }}
      />
    </Box>
  );
};

export default TeamList;
