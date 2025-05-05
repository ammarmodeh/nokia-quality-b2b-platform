import { useMemo } from "react";
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarColumnsButton,
  GridToolbarDensitySelector
} from "@mui/x-data-grid";
import { Paper, Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import {
  MdAdd,
  MdHistory,
  MdReport
} from "react-icons/md";
import { newFormatDate } from "../utils/helpers";
import TeamStatusBadge from "./ViolationTeamStatusBadge";
import ViolationThresholdBadge from "./ViolationThresholdBadge";

const CustomToolbar = () => {
  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
    </GridToolbarContainer>
  );
};

const ViolationDataGrid = ({
  rows,
  user,
  paginationModel,
  onPaginationModelChange,
  onTeamNameClick,
  onAddSessionClick,
  onViewSessionsClick,
  onReportAbsenceClick,
}) => {
  const columns = useMemo(() => [
    {
      field: "teamName",
      headerName: "Team Name",
      width: 200,
      renderCell: (params) => (
        <Button
          onClick={() => onTeamNameClick(params.value)}
          sx={{
            color: '#3ea6ff',
            textTransform: 'none',
            '&:hover': { backgroundColor: 'rgba(62, 166, 255, 0.1)' }
          }}
        >
          {params.value}
        </Button>
      ),
    },
    {
      field: "teamCompany",
      headerName: "Group",
      width: 100,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: "detractorCount",
      headerName: "Detractors",
      width: 100,
      renderCell: (params) => (
        <Box sx={{ color: params.value > 0 ? '#f44336' : '#aaaaaa' }}>
          {params.value}
        </Box>
      )
    },
    {
      field: "neutralCount",
      headerName: "Neutrals",
      width: 100,
      renderCell: (params) => (
        <Box sx={{ color: params.value > 0 ? '#ff9800' : '#aaaaaa' }}>
          {params.value}
        </Box>
      )
    },
    {
      field: "equivalentDetractorCount",
      headerName: "Eq. Detractors",
      width: 120,
      renderCell: (params) => (
        <Box sx={{
          fontWeight: params.value >= 3 ? 'bold' : 'normal',
          color: params.value >= 3 ? '#f44336' :
            params.value === 2 ? '#ff9800' : '#4caf50'
        }}>
          {params.value}
        </Box>
      )
    },
    {
      field: "totalViolations",
      headerName: "Total Violations",
      width: 120,
      renderCell: (params) => (
        <Box sx={{
          fontWeight: 'bold',
          color: params.value > 0 ? '#f44336' : '#aaaaaa',
          backgroundColor: '#383838',
          padding: '4px 8px'
        }}>
          {params.value}
        </Box>
      )
    },
    {
      field: "dateReachedLimit",
      headerName: "Limit Date",
      width: 120,
      renderCell: (params) => (
        <Box sx={{
          color: params.value ? '#f44336' : '#aaaaaa',
          fontWeight: params.value ? 'bold' : 'normal'
        }}>
          {params.value ? newFormatDate(params.value) : '--'}
        </Box>
      )
    },
    {
      field: "thresholdDescription",
      headerName: "How Reached",
      width: 200,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'left', px: 1, overflowX: 'auto' }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: "consequenceApplied",
      headerName: "Consequence",
      width: 200,
      renderCell: (params) => (
        <Box sx={{
          color: params.value?.includes('suspension') ? '#f44336' :
            params.value?.includes('warning') ? '#ff9800' : '#4caf50',
          fontWeight: 'bold',
          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'left', px: 1, overflowX: 'auto'
        }}>
          <Typography sx={{ fontSize: '0.8rem', }}>
            {params.value || '--'}
          </Typography>
        </Box>
      )
    },
    {
      field: "notes",
      headerName: "Notes",
      width: 250,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'left', px: 1, overflowX: 'auto' }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: "validationStatus",
      headerName: "Team Status",
      width: 120,
      renderCell: (params) => <TeamStatusBadge status={params.value} />
    },
    {
      field: "isEvaluated",
      headerName: "Evaluated",
      width: 100,
      renderCell: (params) => (
        <Box>{params.value ? 'Yes' : 'No'}</Box>
      )
    },
    {
      field: "evaluationScore",
      headerName: "Score",
      width: 100,
      renderCell: (params) => (
        <Box>{params.value || 'N/A'}</Box>
      )
    },
    {
      field: "violationStatus",
      headerName: "Violation Threshold",
      width: 120,
      renderCell: (params) => (
        <ViolationThresholdBadge count={params.row.equivalentDetractorCount} />
      )
    },
    {
      field: "hasTraining",
      headerName: "Trained",
      width: 100,
      renderCell: (params) => (
        <Box>{params.value ? 'Yes' : 'No'}</Box>
      )
    },
    {
      field: "mostRecentCompletedSession",
      headerName: "Last Completed",
      width: 140,
      renderCell: (params) => (
        <Box sx={{
          fontStyle: params.value === "No completed sessions" ? "italic" : "normal",
          color: params.value === "No completed sessions" ? '#aaaaaa' : '#4caf50',
          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'left', px: 1, overflowX: 'auto'
        }}>
          <Typography sx={{ fontSize: '0.8rem', }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "mostRecentMissedCanceledSession",
      headerName: "Last Missed/Canceled",
      width: 160,
      renderCell: (params) => (
        <Box sx={{
          fontStyle: params.value === "No missed/canceled sessions" ? "italic" : "normal",
          color: params.value === "No missed/canceled sessions" ? '#aaaaaa' :
            params.value.includes("Missed") ? '#f44336' : '#ff9800',
          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'left', px: 1, overflowX: 'auto'
        }}>
          <Typography sx={{ fontSize: '0.8rem', }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 250,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Add Session">
            <IconButton
              disabled={user.role !== "Admin"}
              onClick={() => onAddSessionClick(params.row.teamName, params.row.id)}
              sx={{
                color: '#4caf50',
                '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.1)' },
                '&.Mui-disabled': { color: '#666' }
              }}
            >
              <MdAdd />
            </IconButton>
          </Tooltip>

          <Tooltip title="Report Absence">
            <IconButton
              disabled={user.role !== "Admin"}
              onClick={() => onReportAbsenceClick(params.row.teamName, params.row.id)}
              sx={{
                color: '#f44336',
                '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.1)' },
                '&.Mui-disabled': { color: '#666' }
              }}
            >
              <MdReport />
            </IconButton>
          </Tooltip>

          <Tooltip title="View Sessions">
            <IconButton
              onClick={() => onViewSessionsClick(params.row.id)}
              sx={{
                color: '#2196f3',
                '&:hover': { backgroundColor: 'rgba(33, 150, 243, 0.1)' }
              }}
            >
              <MdHistory />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [user.role, onTeamNameClick, onAddSessionClick, onViewSessionsClick, onReportAbsenceClick]);

  return (
    <Paper sx={{ height: 400, width: "100%", backgroundColor: "#272727" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSizeOptions={[5, 10, 25]}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        disableSelectionOnClick
        slots={{ toolbar: CustomToolbar }}
        sx={{
          border: 0,
          color: "#ffffff",
          "& .MuiDataGrid-main": { backgroundColor: "#272727" },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "#333",
            color: "#9e9e9e",
            fontSize: "0.875rem",
            fontWeight: "bold",
            borderBottom: "1px solid #444",
          },
          "& .MuiDataGrid-container--top [role=row]": {
            backgroundColor: '#3f3f3f'
          },
          "& .MuiDataGrid-cell": { borderBottom: "1px solid #444" },
          "& .MuiDataGrid-row": {
            backgroundColor: "#272727",
            "&:hover": { backgroundColor: "#333" },
          },
          "& .MuiDataGrid-footerContainer": {
            backgroundColor: "#333",
            color: "#ffffff",
            borderTop: "1px solid #444",
          },
          "& .MuiTablePagination-root": { color: "#ffffff" },
          "& .MuiDataGrid-columnHeaderTitle": {
            fontWeight: "bold",
            // color: "#ffffff !important",
          },
        }}
      />
    </Paper>
  );
};

export default ViolationDataGrid;