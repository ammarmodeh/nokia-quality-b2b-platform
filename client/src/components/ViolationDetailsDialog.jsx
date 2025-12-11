import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Chip,
  Tooltip
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { MdClose, MdFileDownload } from 'react-icons/md';
import { format, startOfWeek } from 'date-fns';
import { getCustomWeekNumber } from '../utils/helpers';
import * as XLSX from 'xlsx';

const ViolationDetailsDialog = ({ open, onClose, title, tasks, teamName }) => {

  const columns = [
    {
      field: 'week',
      headerName: 'Week',
      width: 80,
      valueGetter: (value, row) => {
        if (!row.interviewDate) return 'N/A';
        try {
          const date = new Date(row.interviewDate);
          const start = startOfWeek(date, { weekStartsOn: 0 });
          const year = start.getFullYear();
          const weekNum = getCustomWeekNumber(start, year);
          return weekNum;
        } catch (e) {
          return 'N/A';
        }
      },
      renderCell: (params) => (
        <Box sx={{ fontWeight: 'bold', color: '#b3b3b3' }}>
          W{params.value}
        </Box>
      )
    },
    {
      field: 'interviewDate',
      headerName: 'Interview Date',
      width: 120,
      valueFormatter: (value) => {
        if (!value) return 'N/A';
        try {
          return format(new Date(value), 'yyyy-MM-dd');
        } catch (e) {
          return value;
        }
      }
    },
    {
      field: 'evaluationScore',
      headerName: 'Score',
      width: 80,
      renderCell: (params) => (
        <Box sx={{
          color: params.value <= 6 ? '#f44336' : params.value <= 8 ? '#ff9800' : '#4caf50',
          fontWeight: 'bold'
        }}>
          {params.value}
        </Box>
      )
    },
    {
      field: 'slid',
      headerName: 'SLID',
      width: 120,
    },
    {
      field: 'reason',
      headerName: 'Violation Reason',
      width: 200,
      flex: 1,
    },
    {
      field: 'customerFeedback',
      headerName: 'Customer Feedback',
      width: 250,
      flex: 1,
      renderCell: (params) => (
        <Tooltip title={params.value || ''} arrow>
          <span style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block'
          }}>
            {params.value}
          </span>
        </Tooltip>
      )
    },
    {
      field: 'priority',
      headerName: 'Impact',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value || 'N/A'}
          size="small"
          sx={{
            bgcolor: params.value === 'High' ? 'rgba(244, 67, 54, 0.2)' :
              params.value === 'Medium' ? 'rgba(255, 152, 0, 0.2)' :
                'rgba(76, 175, 80, 0.2)',
            color: params.value === 'High' ? '#f44336' :
              params.value === 'Medium' ? '#ff9800' :
                '#4caf50',
            fontWeight: 500
          }}
        />
      )
    },
    {
      field: 'validationStatus',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Typography variant="caption" sx={{ color: '#b3b3b3' }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: 'teamName',
      headerName: 'Team Name',
      width: 150,
      valueGetter: (value, row) => row.teamName || teamName || 'N/A'
    }
  ];

  const exportToExcel = () => {
    if (!tasks || !tasks.length) return;

    const exportData = tasks.map(task => {
      let weekStr = 'N/A';
      let dateStr = 'N/A';

      if (task.interviewDate) {
        try {
          const date = new Date(task.interviewDate);
          const start = startOfWeek(date, { weekStartsOn: 0 });
          weekStr = `W${getCustomWeekNumber(start, start.getFullYear())}`;
          dateStr = format(date, 'yyyy-MM-dd');
        } catch (e) {
          // Keep defaults
        }
      }

      return {
        'Week': weekStr,
        'Interview Date': dateStr,
        'SLID': task.slid || 'N/A',
        'Score': task.evaluationScore,
        'Violation Reason': task.reason,
        'Customer Feedback': task.customerFeedback || '',
        'Impact': task.priority,
        'Status': task.validationStatus || 'Not validated',
        'Team Name': task.teamName || teamName || 'N/A'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Detailed Violations');

    // Auto-width columns
    const wscols = Object.keys(exportData[0]).map(k => ({ wch: 20 }));
    // Custom width adjustments
    wscols[0] = { wch: 10 }; // Week
    wscols[1] = { wch: 20 }; // Interview Date
    wscols[2] = { wch: 10 }; // SLID
    wscols[3] = { wch: 10 }; // Score
    wscols[3] = { wch: 10 }; // Score
    wscols[7] = { wch: 20 }; // Team Name
    worksheet['!cols'] = wscols;

    const namePrefix = teamName || title || 'Detailed';
    const fileName = `${namePrefix.replace(/[\\/:*?"<>|]/g, '_')}_Violations_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Export to Excel">
            <IconButton onClick={exportToExcel} size="small" sx={{ color: '#4caf50', '&:hover': { bgcolor: 'rgba(76,175,80,0.1)' } }}>
              <MdFileDownload />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} size="small" sx={{ color: '#999' }}>
            <MdClose />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, height: 500 }}>
        <DataGrid
          rows={tasks || []}
          columns={columns}
          getRowId={(row) => row._id || Math.random()}
          slots={{ toolbar: GridToolbar }}
          disableRowSelectionOnClick
          sx={{
            border: 0,
            color: '#fff',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#252525',
              color: '#b0b0b0',
              borderBottom: '1px solid #333'
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #333'
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: '#2a2a2a'
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid #333'
            },
            '& .MuiTablePagination-root': {
              color: '#fff'
            }
          }}
        />
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid #333', p: 1.5 }}>
        <Button onClick={onClose} sx={{ color: '#fff' }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ViolationDetailsDialog;
