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
import { getAvailableMonths, filterTasksByMonth, filterTasksByDateRange } from '../utils/dateFilterHelpers';
import { format, startOfWeek } from 'date-fns';
import { getCustomWeekNumber } from '../utils/helpers';
import * as XLSX from 'xlsx';
import { MdFileDownload } from 'react-icons/md';
import { IconButton, Tooltip } from '@mui/material';
import AIAnalysisButton from './AIAnalysisButton';
import ViolationDetailsDialog from './ViolationDetailsDialog';
import { MdVisibility } from 'react-icons/md';

const CustomToolbar = () => {
  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
    </GridToolbarContainer>
  );
};

const MonthlySummaryTable = ({ tasks, fieldTeams = [] }) => {
  const isMobile = useMediaQuery('(max-width:503px)');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  // Get available months from tasks
  const availableMonths = useMemo(() => getAvailableMonths(tasks), [tasks]);

  // Set initial month to most recent
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth && !isCustomRange) {
      setSelectedMonth(availableMonths[0].key);
    }
  }, [availableMonths, selectedMonth, isCustomRange]);

  // Filter tasks by selected month or custom range
  const filteredTasks = useMemo(() => {
    if (isCustomRange) {
      if (!customStart || !customEnd) return [];
      return filterTasksByDateRange(tasks, customStart, customEnd);
    } else {
      if (!selectedMonth) return [];
      const month = availableMonths.find(m => m.key === selectedMonth);
      if (!month) return [];
      return filterTasksByMonth(tasks, month.year, month.month);
    }
  }, [tasks, selectedMonth, availableMonths, isCustomRange, customStart, customEnd]);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState(null);

  // Calculate violation data for each team
  const rows = useMemo(() => {
    const teamViolations = {};

    // Initialize all teams
    fieldTeams.forEach(team => {
      teamViolations[team.teamName] = {
        id: team._id,
        teamName: team.teamName,
        teamCompany: team.teamCompany || 'N/A',
        detractorCount: 0,
        neutralCount: 0,
        lowPriorityCount: 0,
        mediumPriorityCount: 0,
        highPriorityCount: 0,
        tasks: [] // Store tasks for this team
      };
    });

    // Count violations from filtered tasks
    filteredTasks.forEach(task => {
      const teamName = task.teamName;
      if (!teamViolations[teamName]) {
        teamViolations[teamName] = {
          id: `temp-${teamName}`,
          teamName,
          teamCompany: 'N/A',
          detractorCount: 0,
          neutralCount: 0,
          lowPriorityCount: 0,
          mediumPriorityCount: 0,
          highPriorityCount: 0,
          tasks: []
        };
      }

      // Add task to specific team list
      teamViolations[teamName].tasks.push(task);

      // Count by evaluation score
      if (task.evaluationScore >= 1 && task.evaluationScore <= 6) {
        teamViolations[teamName].detractorCount++;
      } else if (task.evaluationScore >= 7 && task.evaluationScore <= 8) {
        teamViolations[teamName].neutralCount++;
      }

      // Count by priority
      if (task.priority === 'Low') {
        teamViolations[teamName].lowPriorityCount++;
      } else if (task.priority === 'Medium') {
        teamViolations[teamName].mediumPriorityCount++;
      } else if (task.priority === 'High') {
        teamViolations[teamName].highPriorityCount++;
      }
    });

    // Calculate totals and equivalent detractors
    return Object.values(teamViolations).map(team => ({
      ...team,
      totalViolations: team.detractorCount + team.neutralCount,
      equivalentDetractorCount: team.detractorCount + Math.floor(team.neutralCount / 3),
    })).filter(team => team.totalViolations > 0).sort((a, b) => {
      if (b.totalViolations !== a.totalViolations) {
        return b.totalViolations - a.totalViolations;
      }
      return b.equivalentDetractorCount - a.equivalentDetractorCount;
    });
  }, [filteredTasks, fieldTeams]);

  const handleViewDetails = (row) => {
    setSelectedRowData(row);
    setDetailsOpen(true);
  };

  const columns = useMemo(() => [
    {
      field: 'teamName',
      headerName: 'Team Name',
      width: 200,
      renderCell: (params) => (
        <Typography sx={{ color: '#ffffff', fontWeight: 500 }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'teamCompany',
      headerName: 'Group',
      width: 100,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ color: '#ffffff' }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'slids',
      headerName: 'SLID(s)',
      width: 150,
      renderCell: (params) => {
        const slids = params.row.tasks.map(t => t.slid).filter(Boolean);
        const text = slids.join(', ');
        return (
          <Tooltip title={text} arrow>
            <span style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block'
            }}>
              {text || 'N/A'}
            </span>
          </Tooltip>
        );
      }
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
      field: 'equivalentDetractorCount',
      headerName: 'Eq. Detractors',
      width: 140,
      renderCell: (params) => (
        <Box sx={{
          fontWeight: 'bold',
          color: params.value >= 3 ? '#f44336' :
            params.value === 2 ? '#ff9800' : '#4caf50'
        }}>
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
      const month = availableMonths.find(m => m.key === selectedMonth);
      periodLabel = month?.label.replace(/[^a-z0-9]/gi, '_');
    }

    const exportData = [];

    rows.forEach(row => {
      // Base summary data
      const teamSummary = {
        'Team Name': row.teamName,
        'Group': row.teamCompany,
        'Detractors (Count)': row.detractorCount,
        'Neutrals (Count)': row.neutralCount,
        'Eq. Detractors': row.equivalentDetractorCount,
        'Total Violations': row.totalViolations,
        'Low Impact (Count)': row.lowPriorityCount,
        'Medium Impact (Count)': row.mediumPriorityCount,
        'High Impact (Count)': row.highPriorityCount,
      };

      // Only export teams that have violations/tasks in the selected period
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
            'Team Name': teamSummary['Team Name'],
            'Group': teamSummary['Group'],
            'Week': weekStr,
            'Interview Date': dateStr,
            'SLID': task.slid || 'N/A',
            'Customer Feedback': task.customerFeedback || '',
            'Score': task.evaluationScore,
            'Impact': task.priority,
            'Detractors': teamSummary['Detractors (Count)'],
            'Neutrals': teamSummary['Neutrals (Count)'],
            'Eq. Detractors': teamSummary['Eq. Detractors'],
            'Total Violations': teamSummary['Total Violations'],
            'Low Impact': teamSummary['Low Impact (Count)'],
            'Medium Impact': teamSummary['Medium Impact (Count)'],
            'High Impact': teamSummary['High Impact (Count)'],
          });
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Summary');
    const fileName = `Monthly_Summary_${periodLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName, { compression: true });
  };

  return (
    <Box sx={{ my: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexDirection: isMobile ? 'column' : 'row', gap: 2 }}>
        <Typography variant="h6" sx={{ color: '#c2c2c2', fontWeight: 'bold' }}>
          Monthly Summary Table
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
              <InputLabel sx={{ color: '#b3b3b3' }}>Select Month</InputLabel>
              <Select
                value={selectedMonth || ''}
                onChange={(e) => setSelectedMonth(e.target.value)}
                label="Select Month"
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
                {availableMonths.map((month) => (
                  <MenuItem key={month.key} value={month.key}>
                    {month.label}
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

          <AIAnalysisButton
            data={rows}
            title={`Monthly Summary - ${selectedMonth ? availableMonths.find(m => m.key === selectedMonth)?.label : 'Custom Range'}`}
            context={`Detailed monthly performance analysis for ${rows.length} teams. Period: ${selectedMonth ? availableMonths.find(m => m.key === selectedMonth)?.label : 'Custom Range'}`}
          />
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
          title={`Detailed Violations - ${selectedRowData.teamName}`}
          teamName={selectedRowData.teamName}
          tasks={selectedRowData.tasks}
        />
      )}
    </Box>
  );
};

export default MonthlySummaryTable;
