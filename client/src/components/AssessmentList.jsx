import { useState } from 'react';
import { Box, IconButton, InputBase, Tooltip, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import Add from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import Badge from "./ui/Badge";
import EmptyState from "./ui/EmptyState";
import { UserAvatar } from "./ui/AvatarGroup";
import { gridSx } from "../pages/tasks/gridSx";

const TONE = { success: 'success', warning: 'warning', error: 'danger', info: 'info' };

/** On-the-job assessments of one team: searchable, sortable, paginated, with row actions. */
const AssessmentList = ({
  assessments,
  onSelectAssessment,
  onEditAssessment,
  onDeleteAssessment,
  onNewAssessment,
  getPerformanceColor,
  getScoreLabel,
  user,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const q = searchTerm.toLowerCase();
  const rows = (assessments || []).filter((a) =>
    (a.conductedBy || '').toLowerCase().includes(q) || (getScoreLabel(a.overallScore) || '').toLowerCase().includes(q)
  );

  const columns = [
    { field: 'assessmentDate', headerName: 'Date', type: 'date', width: 130, valueGetter: (v) => (v ? new Date(v) : null), renderCell: ({ value }) => (value ? value.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—') },
    {
      field: 'conductedBy', headerName: 'Assessor', flex: 1, minWidth: 170,
      renderCell: ({ value }) => <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><UserAvatar user={{ name: value }} size={24} /><Typography noWrap sx={{ fontSize: 13 }}>{value || '—'}</Typography></Box>,
    },
    { field: 'overallScore', headerName: 'Score', type: 'number', width: 100, align: 'left', headerAlign: 'left', valueGetter: (v) => Math.round(v || 0), renderCell: ({ value }) => `${value}%` },
    { field: 'label', headerName: 'Result', width: 150, valueGetter: (_v, row) => getScoreLabel(row.overallScore), renderCell: ({ row, value }) => <Badge tone={TONE[getPerformanceColor(row.overallScore)] || 'neutral'} dot>{value}</Badge> },
    {
      field: 'actions', headerName: '', width: 120, sortable: false, filterable: false, align: 'right',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.25 }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="View report"><IconButton size="small" aria-label="View report" onClick={() => onSelectAssessment(row)}><VisibilityOutlined fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Edit"><IconButton size="small" aria-label="Edit assessment" onClick={() => onEditAssessment(row)}><EditOutlined fontSize="small" /></IconButton></Tooltip>
          {user?.role === 'Admin' && (
            <Tooltip title="Delete permanently…"><IconButton size="small" aria-label="Delete assessment" onClick={() => onDeleteAssessment(row._id)} sx={{ color: 'var(--danger)' }}><DeleteOutline fontSize="small" /></IconButton></Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
        <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600, mr: 1 }}>Assessment history</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 32, px: 1.25, width: { xs: '100%', sm: 260 }, borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', boxShadow: 'var(--shadow-xs)', '&:focus-within': { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-ring)' } }}>
          <SearchIcon sx={{ fontSize: 17, color: 'var(--text-muted)' }} />
          <InputBase value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search assessor or result…" inputProps={{ 'aria-label': 'Search assessments' }} sx={{ flex: 1, fontSize: 13 }} />
        </Box>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{rows.length} assessment{rows.length === 1 ? '' : 's'}</Typography>
        {onNewAssessment && <Button variant="contained" startIcon={<Add sx={{ fontSize: 18 }} />} onClick={onNewAssessment}>New assessment</Button>}
      </Box>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => r._id}
        loading={loading}
        onRowClick={({ row }) => onSelectAssessment(row)}
        disableRowSelectionOnClick
        autoHeight
        rowHeight={48}
        columnHeaderHeight={40}
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } }, sorting: { sortModel: [{ field: 'assessmentDate', sort: 'desc' }] } }}
        slots={{ noRowsOverlay: () => <EmptyState title="No assessments for this team yet" description={onNewAssessment ? 'Start one with “New assessment”.' : undefined} minHeight={180} /> }}
        sx={{ ...gridSx, minHeight: 240 }}
      />
    </Box>
  );
};

export default AssessmentList;
