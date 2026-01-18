import { useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import { Paper, Box, Chip, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

export const DataTable = ({ groupedData }) => {
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  const sortedWeeksDescending = Object.keys(groupedData).sort((a, b) => {
    const matchA = a.match(/Wk-(\d+) \((\d+)\)/);
    const matchB = b.match(/Wk-(\d+) \((\d+)\)/);
    if (!matchA || !matchB) return 0;
    const yearA = parseInt(matchA[2], 10);
    const yearB = parseInt(matchB[2], 10);
    const weekA = parseInt(matchA[1], 10);
    const weekB = parseInt(matchB[1], 10);
    if (yearA !== yearB) return yearB - yearA;
    return weekB - weekA;
  });

  const rows = sortedWeeksDescending.map((week, index) => {
    const previousWeek = sortedWeeksDescending[index + 1];
    const current = groupedData[week];
    const previous = previousWeek ? groupedData[previousWeek] : null;

    const npsValue = (current.Promoters || 0) - (current.Detractors || 0);
    const prevNpsValue = previous ? (previous.Promoters || 0) - (previous.Detractors || 0) : null;

    const getTrendIcon = (currentValue, previousValue, inverse = false) => {
      if (!previousValue && previousValue !== 0) return null;
      const diff = currentValue - previousValue;

      if (inverse) {
        if (diff > 0) return <TrendingDownIcon sx={{ fontSize: 16, color: '#ef4444' }} />;
        if (diff < 0) return <TrendingUpIcon sx={{ fontSize: 16, color: '#10b981' }} />;
      } else {
        if (diff > 0) return <TrendingUpIcon sx={{ fontSize: 16, color: '#10b981' }} />;
        if (diff < 0) return <TrendingDownIcon sx={{ fontSize: 16, color: '#ef4444' }} />;
      }
      return <TrendingFlatIcon sx={{ fontSize: 16, color: '#94a3b8' }} />;
    };

    const getChangeValue = (currentValue, previousValue) => {
      if (!previousValue && previousValue !== 0) return '';
      const diff = currentValue - previousValue;
      const sign = diff > 0 ? '+' : '';
      return `${sign}${diff}`;
    };

    const getNPSStatus = (nps) => {
      if (nps >= 66) return { label: 'Met Target', color: '#10b981' };
      return { label: 'Out of Target', color: '#ef4444' };
    };

    const npsStatus = getNPSStatus(npsValue);

    return {
      id: week,
      week,
      sampleSize: current.sampleSize || 0,
      nps: npsValue,
      npsChange: getChangeValue(npsValue, prevNpsValue),
      npsTrend: getTrendIcon(npsValue, prevNpsValue),
      npsStatus: npsStatus,
      promoters: current.Promoters || 0,
      promotersChange: previous ? getChangeValue(current.Promoters, previous.Promoters) : '',
      promotersTrend: previous ? getTrendIcon(current.Promoters, previous.Promoters) : null,
      detractors: current.Detractors || 0,
      detractorsChange: previous ? getChangeValue(current.Detractors, previous.Detractors) : '',
      detractorsTrend: previous ? getTrendIcon(current.Detractors, previous.Detractors, true) : null,
      neutrals: current.Neutrals || 0,
      neutralsChange: previous ? getChangeValue(current.Neutrals, previous.Neutrals) : '',
      neutralsTrend: previous ? getTrendIcon(current.Neutrals, previous.Neutrals, true) : null,
    };
  });

  const columns = [
    {
      field: 'week',
      headerName: 'Week',
      flex: 1.2,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="700" color="#e0e0e0">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'sampleSize',
      headerName: 'Samples',
      flex: 0.8,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            bgcolor: 'rgba(59, 130, 246, 0.15)',
            color: '#3b82f6',
            fontWeight: 600,
            fontSize: '0.75rem'
          }}
        />
      )
    },
    {
      field: 'nps',
      headerName: 'NPS',
      flex: 1.2,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <Typography variant="body2" fontWeight="700" color={params.row.npsStatus.color}>
            {params.value}%
          </Typography>
          {params.row.npsTrend}
          {params.row.npsChange && (
            <Typography variant="caption" color="#94a3b8" sx={{ ml: 0.5 }}>
              ({params.row.npsChange})
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'npsStatus',
      headerName: 'Status',
      flex: 1,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Chip
          label={params.value.label}
          size="small"
          sx={{
            bgcolor: `${params.value.color}20`,
            color: params.value.color,
            fontWeight: 700,
            fontSize: '0.7rem',
            borderRadius: 2
          }}
        />
      ),
    },
    {
      field: 'promoters',
      headerName: 'Promoters %',
      flex: 1.2,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <Typography variant="body2" color="#10b981" fontWeight="600">
            {params.value}%
          </Typography>
          {params.row.promotersTrend}
          {params.row.promotersChange && (
            <Typography variant="caption" color="#94a3b8">
              ({params.row.promotersChange})
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'detractors',
      headerName: 'Detractors %',
      flex: 1.2,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <Typography variant="body2" color="#ef4444" fontWeight="600">
            {params.value}%
          </Typography>
          {params.row.detractorsTrend}
          {params.row.detractorsChange && (
            <Typography variant="caption" color="#94a3b8">
              ({params.row.detractorsChange})
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'neutrals',
      headerName: 'Neutrals %',
      flex: 1.2,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <Typography variant="body2" color="#fb923c" fontWeight="600">
            {params.value}%
          </Typography>
          {params.row.neutralsTrend}
          {params.row.neutralsChange && (
            <Typography variant="caption" color="#94a3b8">
              ({params.row.neutralsChange})
            </Typography>
          )}
        </Box>
      ),
    },
  ];

  return (
    <div style={{ width: '100%' }}>
      <Paper sx={{
        minHeight: 400,
        width: "100%",
        backgroundColor: "#1e1e1e",
        overflow: "hidden",
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 3
      }}>
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Typography variant="subtitle2" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            Weekly Performance Details
          </Typography>
        </Box>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowHeight={() => 52}
          pageSizeOptions={[5, 10, 25, 50]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          disableColumnResize
          disableVirtualization={true}
          sx={{
            border: 0,
            color: '#ffffff',
            '& .MuiDataGrid-container--top [role="row"]': {
              background: 'none',
            },
            '& .MuiDataGrid-row': {
              '&:hover': {
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
              },
            },
            "&.MuiDataGrid-root": {
              background: 'none'
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#1e1e1e',
              fontSize: '0.75rem',
              fontWeight: 700,
              overflow: 'hidden',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            },
            '& .MuiDataGrid-columnHeader': {
              backgroundColor: 'rgba(59, 130, 246, 0.05)',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
            },
            '& .MuiDataGrid-footerContainer': {
              minHeight: '64px',
              backgroundColor: '#1e1e1e',
              borderTop: '1px solid rgba(255,255,255,0.05)',
            },
            '& .MuiDataGrid-virtualScroller': {
              overflow: 'auto',
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#3b82f6',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(255,255,255,0.05)',
              },
            },
            '& .MuiDataGrid-scrollbarFiller': {
              backgroundColor: '#1e1e1e',
            },
          }}
        />
      </Paper>
    </div>
  );
};