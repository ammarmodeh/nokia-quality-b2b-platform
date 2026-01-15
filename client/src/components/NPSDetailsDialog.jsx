import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Box,
  Chip,
  useTheme,
  useMediaQuery,
  Tooltip
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { MdClose } from 'react-icons/md';
import { format } from 'date-fns';
import { newFormatDate } from '../utils/helpers';

const NPSDetailsDialog = ({ open, onClose, title, tasks = [] }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const columns = [
    {
      field: 'slid',
      headerName: 'SLID',
      width: 130,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="bold" color="primary">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'evaluationScore',
      headerName: 'Score',
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        let color = '#757575';
        if (params.value <= 6) color = '#ef4444'; // Detractor
        else if (params.value <= 8) color = '#f59e0b'; // Neutral
        else color = '#10b981'; // Promoter

        return (
          <Box
            sx={{
              fontWeight: 'bold',
              color: color,
              border: `1px solid ${color}`,
              borderRadius: '50%',
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem'
            }}
          >
            {params.value}
          </Box>
        );
      }
    },
    {
      field: 'teamName',
      headerName: 'Team Name',
      width: 150,
    },
    {
      field: 'customerName',
      headerName: 'Customer',
      width: 180,
    },
    {
      field: 'customerFeedback',
      headerName: 'Feedback',
      flex: 1,
      minWidth: 250,
      renderCell: (params) => (
        <Tooltip title={params.value || ''}>
          <Typography variant="body2" noWrap>
            {params.value}
          </Typography>
        </Tooltip>
      )
    },
    {
      field: 'reason',
      headerName: 'Reason',
      width: 150,
    },
    {
      field: 'responsible',
      headerName: 'Owner',
      width: 150,
      renderCell: (params) => params.row.responsible || 'N/A'
    },
    {
      field: 'pisDate',
      headerName: 'PIS Date',
      width: 120,
      renderCell: (params) => {
        const dateVal = params.value?.$date || params.value;
        return (
          <Typography variant="body2">
            {newFormatDate(dateVal)}
          </Typography>
        );
      }
    }
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: fullScreen ? 0 : 3,
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${theme.palette.divider}`,
        pb: 2
      }}>
        <Box>
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {tasks.length} tasks found
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <MdClose />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, height: 600 }}>
        <DataGrid
          rows={tasks}
          columns={columns}
          getRowId={(row) => row._id || Math.random()}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
            pagination: {
              labelRowsPerPage: 'Rows:',
            }
          }}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell': {
              borderColor: theme.palette.divider
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
            }
          }}
        />
      </DialogContent>

      <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, p: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NPSDetailsDialog;
