import { useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import RemoveIcon from '@mui/icons-material/Remove';
import { Paper } from '@mui/material';

export const DataTable = ({ groupedData }) => {
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  // console.log({ groupedData });
  const sortedWeeksDescending = Object.keys(groupedData).sort((a, b) => {
    const weekA = parseInt(a.split('-')[1], 10);
    const weekB = parseInt(b.split('-')[1], 10);
    return weekB - weekA; // Sort in descending order
  });

  const rows = sortedWeeksDescending.map((week, index) => {
    const previousWeek = sortedWeeksDescending[index + 1];
    const currentViolations = groupedData[week].NeutralPassive + groupedData[week].Detractor;
    const previousViolations = previousWeek ?
      (groupedData[previousWeek].NeutralPassive + groupedData[previousWeek].Detractor) : null;

    const getStatusIcon = (currentValue, previousValue, isPositive, useArrow = false) => {
      if (currentValue > previousValue) {
        return useArrow ? (
          <ArrowUpwardIcon sx={{ fontSize: '20px' }} style={{ color: isPositive ? 'green' : 'red', verticalAlign: 'middle' }} />
        ) : (
          <FiberManualRecordIcon sx={{ fontSize: '10px' }} style={{ color: 'red', verticalAlign: 'middle' }} />
        );
      } else if (currentValue < previousValue) {
        return useArrow ? (
          <ArrowDownwardIcon sx={{ fontSize: '20px' }} style={{ color: isPositive ? 'red' : 'green', verticalAlign: 'middle' }} />
        ) : (
          <FiberManualRecordIcon sx={{ fontSize: '10px' }} style={{ color: 'green', verticalAlign: 'middle' }} />
        );
      } else {
        return <RemoveIcon sx={{ fontSize: '15px' }} style={{ color: 'gray', verticalAlign: 'middle' }} />;
      }
    };

    return {
      id: week,
      week,
      Detractor: (
        <>
          {groupedData[week].Detractor}
          {previousWeek ? getStatusIcon(groupedData[week].Detractor, groupedData[previousWeek].Detractor, false) : ''}
        </>
      ),
      NeutralPassive: (
        <>
          {groupedData[week].NeutralPassive}
          {previousWeek ? getStatusIcon(groupedData[week].NeutralPassive, groupedData[previousWeek].NeutralPassive, false) : ''}
        </>
      ),
      TotalViolations: (
        <>
          <span style={{ color: previousWeek && currentViolations > previousViolations ? 'red' : 'inherit' }}>
            {currentViolations}
          </span>
          {previousWeek ? getStatusIcon(currentViolations, previousViolations, false, true) : ''}
        </>
      ),
    };
  });

  const columns = [
    { field: 'week', headerName: 'Week', flex: 1, headerAlign: 'center', align: 'center' },
    {
      field: 'Detractor',
      headerName: 'Detractor',
      type: 'string',
      flex: 1,
      headerAlign: 'center',
      align: 'center',
      cellClassName: 'detractor-cell',
      renderCell: (params) => params.value,
    },
    {
      field: 'NeutralPassive',
      headerName: 'Neutral/Passive',
      type: 'string',
      flex: 1,
      headerAlign: 'center',
      align: 'center',
      cellClassName: 'neutral-cell',
      renderCell: (params) => params.value,
    },
    {
      field: 'TotalViolations',
      headerName: 'Total Violations',
      type: 'string',
      flex: 1,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => params.value,
    },
  ];

  return (
    <div style={{ width: '100%' }}>

      <Paper sx={{
        height: 240,
        width: "100%",
        backgroundColor: "#2d2d2d",
        overflow: "hidden" // Prevent double scrollbars
      }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowHeight={() => 30}
          pageSizeOptions={[5, 10, 25]}
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
                backgroundColor: '#454545',
              },
            },
            "&.MuiDataGrid-root": {
              background: 'none'
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#2d2d2d',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              overflow: 'hidden',
            },
            '& .MuiDataGrid-columnHeader': {
              backgroundColor: '#454545',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #e5e7eb',
            },
            '& .MuiDataGrid-footerContainer': {
              minHeight: '64px',
              backgroundColor: '#2d2d2d',
              color: '#ffffff',
              '& .MuiTablePagination-root': {
                color: '#ffffff',
              },
            },
            '& .MuiDataGrid-virtualScroller': {
              overflow: 'auto',
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#666',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#e5e7eb',
              },
            },
            '& .MuiDataGrid-scrollbarFiller': {
              backgroundColor: '#2d2d2d',
            },
            '& .detractor-cell': { color: 'red' },
            '& .neutral-cell': { color: 'gray' },
          }}
        />
      </Paper>
    </div>
  );
};