import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';
import { MdClose, MdFileDownload } from 'react-icons/md';
import * as XLSX from 'xlsx';
import { getAvailableWeeks, getAvailableMonths, filterTasksByWeek, filterTasksByMonth } from '../utils/dateFilterHelpers';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);

const TrendsSummaryModal = ({ open, onClose, tasks, period = 'week' }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Calculate Trend Data (Mode)
  const rows = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const availablePeriods = period === 'week'
      ? getAvailableWeeks(tasks)
      : getAvailableMonths(tasks);

    return availablePeriods.map((periodInfo, index) => {
      const filteredTasks = period === 'week'
        ? filterTasksByWeek(tasks, periodInfo.year, periodInfo.week)
        : filterTasksByMonth(tasks, periodInfo.year, periodInfo.month);

      // Helper to find mode
      const findMode = (items, keyExtractor) => {
        if (!items || items.length === 0) return { name: 'N/A', count: 0 };

        const counts = {};
        items.forEach(item => {
          const key = keyExtractor(item);
          if (key) {
            counts[key] = (counts[key] || 0) + 1;
          }
        });

        let maxCount = 0;
        let mode = 'N/A';

        Object.entries(counts).forEach(([key, count]) => {
          if (count > maxCount) {
            maxCount = count;
            mode = key;
          }
        });

        return { name: mode, count: maxCount };
      };

      // 1. Most Frequent Field Team
      // We only care about violations effectively, but typically checks all tasks in window
      // Let's filter for relevant tasks if needed, but usually trend implies volume of issues
      // Assuming we count all tasks in the list provided (which are usually violations)
      const topTeam = findMode(filteredTasks, t => t.teamName);

      // 2. Most Frequent Reason
      const topReason = findMode(filteredTasks, t => t.reason);

      return {
        id: periodInfo.key,
        periodLabel: period === 'week' ? `W${periodInfo.week} (${periodInfo.year})` : periodInfo.label.split('(')[0].trim(),
        fullLabel: periodInfo.label, // For export/tooltip
        topTeamName: topTeam.name,
        topTeamCount: topTeam.count,
        topReasonName: topReason.name,
        topReasonCount: topReason.count
      };
    });
  }, [tasks, period]);

  const columns = [
    {
      field: 'periodLabel',
      headerName: period === 'week' ? 'Week' : 'Month',
      width: 150,
      renderCell: (params) => (
        <Tooltip title={params.row.fullLabel}>
          <span>{params.value}</span>
        </Tooltip>
      )
    },
    {
      field: 'topTeamName',
      headerName: 'Top Team (Trend)',
      width: 250,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="bold">{params.value}</Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.topTeamCount} violations
          </Typography>
        </Box>
      )
    },
    {
      field: 'topReasonName',
      headerName: 'Top Reason (Trend)',
      width: 300,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="bold">{params.value}</Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.topReasonCount} occurrences
          </Typography>
        </Box>
      )
    }
  ];

  // Chart Data
  const chartData = useMemo(() => {
    // Reverse for chronological order in chart (typically left to right = old to new)
    // The rows are usually sorted newest first. Let's reverse them for the chart.
    const chartRows = [...rows].reverse();

    return {
      labels: chartRows.map(r => r.periodLabel),
      datasets: [
        {
          label: 'Top Team Violations',
          data: chartRows.map(r => r.topTeamCount),
          backgroundColor: 'rgba(244, 67, 54, 0.6)',
          borderColor: 'rgba(244, 67, 54, 1)',
          borderWidth: 1,
        },
        {
          label: 'Top Reason Occurrences',
          data: chartRows.map(r => r.topReasonCount),
          backgroundColor: 'rgba(33, 150, 243, 0.6)',
          borderColor: 'rgba(33, 150, 243, 1)',
          borderWidth: 1,
        }
      ]
    };
  }, [rows]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#fff',
          font: { size: 14 }
        }
      },
      title: {
        display: true,
        text: `${period === 'week' ? 'Weekly' : 'Monthly'} Trend Volume`,
        color: '#fff',
        font: { size: 20 }
      },
      tooltip: {
        callbacks: {
          afterBody: (context) => {
            const index = context[0].dataIndex;
            // Rows are reversed for chart, so we need access to the reversed array or map back
            const chartRows = [...rows].reverse();
            const row = chartRows[index];
            return `Team: ${row.topTeamName}\nReason: ${row.topReasonName}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#fff',
          font: { size: 14 }
        },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      x: {
        ticks: {
          color: '#fff',
          font: { size: 14 }
        },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      }
    }
  };

  const handleExport = () => {
    const exportData = rows.map(row => ({
      Period: row.fullLabel,
      'Top Team': row.topTeamName,
      'Top Team Count': row.topTeamCount,
      'Top Reason': row.topReasonName,
      'Top Reason Count': row.topReasonCount
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trends');
    XLSX.writeFile(wb, `${period}_trends_summary.xlsx`);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      // maxWidth="lg"
      // fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1e1e1e',
          color: '#fff',
          minHeight: '80vh'
        }
      }}
    >
      <DialogTitle component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
        <Typography variant="h6" component="div" fontWeight="bold">
          {period === 'week' ? 'Weekly' : 'Monthly'} Trend Analysis
        </Typography>
        <Box>
          <IconButton onClick={handleExport} sx={{ color: '#4caf50', mr: 1 }} title="Export Table">
            <MdFileDownload />
          </IconButton>
          <IconButton onClick={onClose} sx={{ color: '#aaa' }}>
            <MdClose />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* Chart Section */}
        <Paper sx={{ p: 2, backgroundColor: '#2d2d2d', height: '1200px' }}>
          <Box sx={{ position: 'relative', height: '400px', width: '100%' }}>
            <Bar data={chartData} options={chartOptions} />
          </Box>
        </Paper>

        {/* Table Section */}
        <Box sx={{ height: 400, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
            sx={{
              border: 0,
              color: '#ffffff',
              '& .MuiDataGrid-main': { backgroundColor: '#2d2d2d' },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#333',
                color: '#b3b3b3',
                fontWeight: 'bold',
                borderBottom: '1px solid #444',
              },
              '& .MuiDataGrid-cell': { borderBottom: '1px solid #444' },
              '& .MuiDataGrid-row:hover': { backgroundColor: '#3d3d3d' },
              '& .MuiDataGrid-footerContainer': {
                backgroundColor: '#333',
                borderTop: '1px solid #444',
                color: '#fff'
              },
              '& .MuiTablePagination-root': { color: '#fff' },
              '& .MuiSvgIcon-root': { color: '#fff' }
            }}
          />
        </Box>

      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid #333', p: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ color: '#aaa', borderColor: '#aaa' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TrendsSummaryModal;
