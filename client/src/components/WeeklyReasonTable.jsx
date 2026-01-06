import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  Stack,
  FormControlLabel,
  Switch,
  TextField,
  Button
} from '@mui/material';
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarDensitySelector
} from '@mui/x-data-grid';
import { getAvailableWeeks, filterTasksByWeek, filterTasksByDateRange } from '../utils/dateFilterHelpers';
import { format, startOfWeek } from 'date-fns';
import { getCustomWeekNumber } from '../utils/helpers';
import * as XLSX from 'xlsx';
import { MdFileDownload, MdTrendingUp } from 'react-icons/md';
import { IconButton, Tooltip } from '@mui/material';
import ViolationDetailsDialog from './ViolationDetailsDialog';
import TrendsSummaryModal from './TrendsSummaryModal';
import { MdVisibility } from 'react-icons/md';

const CustomToolbar = () => {
  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
    </GridToolbarContainer>
  );
};

const WeeklyReasonTable = ({ tasks }) => {
  const isMobile = useMediaQuery('(max-width:503px)');
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  // Get available weeks from tasks
  const availableWeeks = useMemo(() => getAvailableWeeks(tasks), [tasks]);

  // Set initial week to most recent
  useEffect(() => {
    if (availableWeeks.length > 0 && !selectedWeek && !isCustomRange) {
      setSelectedWeek(availableWeeks[0].key);
    }
  }, [availableWeeks, selectedWeek, isCustomRange]);

  // Filter tasks by selected week or custom range
  const filteredTasks = useMemo(() => {
    if (isCustomRange) {
      if (!customStart || !customEnd) return [];
      return filterTasksByDateRange(tasks, customStart, customEnd);
    } else {
      if (!selectedWeek) return [];
      const week = availableWeeks.find(w => w.key === selectedWeek);
      if (!week) return [];
      return filterTasksByWeek(tasks, week.year, week.week);
    }
  }, [tasks, selectedWeek, availableWeeks, isCustomRange, customStart, customEnd]);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [trendModalOpen, setTrendModalOpen] = useState(false);

  // Calculate violation data for each reason
  const rows = useMemo(() => {
    const reasonViolations = {};

    // Count violations from filtered tasks
    filteredTasks.forEach(task => {
      const reason = task.reason || "Unspecified";
      if (!reasonViolations[reason]) {
        reasonViolations[reason] = {
          id: `reason-${reason}`,
          reason,
          detractorCount: 0,
          neutralCount: 0,
          lowPriorityCount: 0,
          mediumPriorityCount: 0,
          highPriorityCount: 0,
          tasks: []
        };
      }

      // Add task to specific reason list
      reasonViolations[reason].tasks.push(task);

      // Count by evaluation score
      if (task.evaluationScore >= 1 && task.evaluationScore <= 6) {
        reasonViolations[reason].detractorCount++;
      } else if (task.evaluationScore >= 7 && task.evaluationScore <= 8) {
        reasonViolations[reason].neutralCount++;
      }

      // Count by priority
      if (task.priority === 'Low') {
        reasonViolations[reason].lowPriorityCount++;
      } else if (task.priority === 'Medium') {
        reasonViolations[reason].mediumPriorityCount++;
      } else if (task.priority === 'High') {
        reasonViolations[reason].highPriorityCount++;
      }
    });

    // Calculate totals
    return Object.values(reasonViolations).map(item => ({
      ...item,
      totalViolations: item.detractorCount + item.neutralCount,
    })).filter(team => team.totalViolations > 0).sort((a, b) => b.totalViolations - a.totalViolations);
  }, [filteredTasks]);

  const handleViewDetails = (row) => {
    // Adapter for ViolationDetailsDialog which expects teamName
    setSelectedRowData({
      ...row,
      teamName: row.reason
    });
    setDetailsOpen(true);
  };

  const columns = useMemo(() => [
    {
      field: 'reason',
      headerName: 'Reason',
      width: 250,
      renderCell: (params) => (
        <Typography sx={{ color: '#ffffff', fontWeight: 500 }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'detractorCount',
      headerName: 'Detractors',
      width: 120,
      renderCell: (params) => (
        <Box sx={{ color: params.value > 0 ? '#f44336' : '#6b7280', fontWeight: 'bold' }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: 'neutralCount',
      headerName: 'Neutrals',
      width: 120,
      renderCell: (params) => (
        <Box sx={{ color: params.value > 0 ? '#ff9800' : '#6b7280', fontWeight: 'bold' }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: 'totalViolations',
      headerName: 'Total Violations',
      width: 140,
      renderCell: (params) => (
        <Box sx={{
          fontWeight: 'bold',
          color: params.value > 0 ? '#f44336' : '#6b7280',
          backgroundColor: '#383838',
          padding: '4px 8px',
          borderRadius: '4px'
        }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: 'lowPriorityCount',
      headerName: 'Low Impact',
      width: 120,
      renderCell: (params) => (
        <Box sx={{ color: params.value > 0 ? '#4caf50' : '#6b7280' }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: 'mediumPriorityCount',
      headerName: 'Medium Impact',
      width: 140,
      renderCell: (params) => (
        <Box sx={{ color: params.value > 0 ? '#ff9800' : '#6b7280' }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: 'highPriorityCount',
      headerName: 'High Impact',
      width: 120,
      renderCell: (params) => (
        <Box sx={{ color: params.value > 0 ? '#f44336' : '#6b7280' }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Details',
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="View Violation Details">
          <IconButton
            onClick={() => handleViewDetails(params.row)}
            size="small"
            sx={{ color: '#00e5ff' }}
          >
            <MdVisibility />
          </IconButton>
        </Tooltip>
      )
    }
  ], []);

  const exportToExcel = () => {
    if (!rows.length) return;

    let periodLabel = '';
    if (isCustomRange) {
      periodLabel = `Custom_${customStart}_to_${customEnd}`;
    } else {
      const week = availableWeeks.find(w => w.key === selectedWeek);
      periodLabel = week?.label.replace(/[^a-z0-9]/gi, '_');
    }

    const exportData = [];

    rows.forEach(row => {
      // Base summary data
      const reasonSummary = {
        'Reason': row.reason,
        'Detractors (Count)': row.detractorCount,
        'Neutrals (Count)': row.neutralCount,
        'Total Violations': row.totalViolations,
        'Low Impact (Count)': row.lowPriorityCount,
        'Medium Impact (Count)': row.mediumPriorityCount,
        'High Impact (Count)': row.highPriorityCount,
      };

      // Only export rows that have violations/tasks in the selected period
      if (row.tasks && row.tasks.length > 0) {
        row.tasks.forEach(task => {
          let weekStr = 'N/A';
          let dateStr = 'N/A';

          if (task.interviewDate) {
            try {
              const date = new Date(task.interviewDate);
              const start = startOfWeek(date, { weekStartsOn: 0 });
              weekStr = `W${getCustomWeekNumber(start, start.getFullYear())}`;
              dateStr = format(date, 'yyyy-MM-dd');
            } catch (e) {
              // ignore
            }
          }

          exportData.push({
            'Reason': reasonSummary['Reason'],
            'Team Name': task.teamName || 'N/A',
            'Week': weekStr,
            'Interview Date': dateStr,
            'SLID': task.slid || 'N/A',
            'Customer Feedback': task.customerFeedback || '',
            'Sub Reason': task.subReason || 'N/A',
            'Root Cause': task.rootCause || 'N/A',
            'Score': task.evaluationScore,
            'Impact': task.priority,
            'Detractors': reasonSummary['Detractors (Count)'],
            'Neutrals': reasonSummary['Neutrals (Count)'],
            'Total Violations': reasonSummary['Total Violations'],
            'Low Impact': reasonSummary['Low Impact (Count)'],
            'Medium Impact': reasonSummary['Medium Impact (Count)'],
            'High Impact': reasonSummary['High Impact (Count)'],
          });
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Weekly Reason Summary');
    const fileName = `Weekly_Reason_Summary_${periodLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName, { compression: true });
  };

  return (
    <Box sx={{ my: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexDirection: isMobile ? 'column' : 'row', gap: 2 }}>
        <Typography variant="h6" sx={{ color: '#c2c2c2', fontWeight: 'bold' }}>
          Weekly Reason Analysis
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: isMobile ? '100%' : 'auto', flexWrap: 'wrap' }}>

          <FormControlLabel
            control={
              <Switch
                checked={isCustomRange}
                onChange={(e) => setIsCustomRange(e.target.checked)}
                color="secondary"
              />
            }
            label="Custom Date Range"
            sx={{ color: '#fff', whiteSpace: 'nowrap' }}
          />

          {!isCustomRange ? (
            <FormControl sx={{ minWidth: 200, width: isMobile ? '100%' : 'auto' }} size="small">
              <InputLabel sx={{ color: '#b3b3b3' }}>Select Week</InputLabel>
              <Select
                value={selectedWeek || ''}
                onChange={(e) => setSelectedWeek(e.target.value)}
                label="Select Week"
                sx={{
                  backgroundColor: '#2d2d2d',
                  color: '#ffffff',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#3d3d3d' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7b68ee' },
                  '& .MuiSvgIcon-root': { color: '#b3b3b3' },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: '#2d2d2d',
                      color: '#ffffff',
                      '& .MuiMenuItem-root': {
                        '&:hover': { backgroundColor: '#3d3d3d' },
                        '&.Mui-selected': { backgroundColor: '#3d3d3d' },
                      },
                    },
                  },
                }}
              >
                {availableWeeks.map((week) => (
                  <MenuItem key={week.key} value={week.key}>
                    {week.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                type="date"
                label="From"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                InputLabelProps={{ shrink: true, style: { color: '#b3b3b3' } }}
                size="small"
                sx={{
                  input: { color: '#fff' },
                  fieldset: { borderColor: '#555' },
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': { borderColor: '#777' },
                    '&.Mui-focused fieldset': { borderColor: '#7b68ee' }
                  }
                }}
              />
              <TextField
                type="date"
                label="To"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                InputLabelProps={{ shrink: true, style: { color: '#b3b3b3' } }}
                size="small"
                sx={{
                  input: { color: '#fff' },
                  fieldset: { borderColor: '#555' },
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': { borderColor: '#777' },
                    '&.Mui-focused fieldset': { borderColor: '#7b68ee' }
                  }
                }}
              />
            </Stack>
          )}

          <Tooltip title="Export to Excel">
            <IconButton
              onClick={exportToExcel}
              disabled={!rows.length}
              sx={{
                color: '#4caf50',
                '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.1)' },
                '&.Mui-disabled': { color: '#666' }
              }}
            >
              <MdFileDownload fontSize="20px" />
            </IconButton>
          </Tooltip>

          {/* <Tooltip title="View Weekly Trends">
            <IconButton
              onClick={() => setTrendModalOpen(true)}
              sx={{
                color: '#7b68ee',
                '&:hover': { backgroundColor: 'rgba(123, 104, 238, 0.1)' }
              }}
            >
              <MdTrendingUp fontSize="20px" />
            </IconButton>
          </Tooltip> */}
        </Box>
      </Box>

      <Paper sx={{ height: 400, width: '100%', backgroundColor: '#2d2d2d' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSizeOptions={[5, 10, 25]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          disableSelectionOnClick
          slots={{ toolbar: CustomToolbar }}
          sx={{
            border: 0,
            color: '#ffffff',
            '& .MuiDataGrid-main': { backgroundColor: '#2d2d2d' },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#2d2d2d',
              color: '#b3b3b3',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              borderBottom: '1px solid #e5e7eb',
            },
            '& .MuiDataGrid-container--top [role=row]': {
              backgroundColor: '#3f3f3f'
            },
            '& .MuiDataGrid-cell': { borderBottom: '1px solid #e5e7eb' },
            '& .MuiDataGrid-row': {
              backgroundColor: '#2d2d2d',
              '&:hover': { backgroundColor: '#3d3d3d' },
            },
            '& .MuiDataGrid-footerContainer': {
              backgroundColor: '#2d2d2d',
              color: '#ffffff',
              borderTop: '1px solid #e5e7eb',
            },
            '& .MuiTablePagination-root': { color: '#ffffff' },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 'bold',
            },
          }}
        />
      </Paper>

      {selectedRowData && (
        <ViolationDetailsDialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          title={`Detailed Violations - ${selectedRowData.reason}`}
          teamName={selectedRowData.reason}
          tasks={selectedRowData.tasks}
        />
      )}

      {/* <TrendsSummaryModal
        open={trendModalOpen}
        onClose={() => setTrendModalOpen(false)}
        tasks={tasks}
        period="week"
      /> */}
    </Box>
  );
};

export default WeeklyReasonTable;
