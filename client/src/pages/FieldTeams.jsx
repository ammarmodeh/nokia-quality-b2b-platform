import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box, TextField, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Tooltip, Typography, IconButton,
  useMediaQuery,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import * as XLSX from 'xlsx';
import { useSelector } from 'react-redux';
import { FaEye } from 'react-icons/fa';
import { MdClose, MdOutlineSearch } from 'react-icons/md';
import { SuspendTeamDialog } from '../components/SuspendTeamDialog';
import { TerminateTeamDialog } from '../components/TerminateTeamDialog';
import { ReactivateTeamDialog } from '../components/ReactivateTeamDialog';
import EditTeamDialog from '../components/EditTeamDialog';
import AddTeamForm from '../components/AddTeamForm';
import api from '../api/api';

const FieldTeamForm = () => {
  const user = useSelector((state) => state?.auth?.user);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [teams, setTeams] = useState([]);
  const [stateUpdate, setUpdateState] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [editTeam, setEditTeam] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [evaluationHistory, setEvaluationHistory] = useState([]);
  const [openSuspendDialog, setOpenSuspendDialog] = useState(false);
  const [openTerminateDialog, setOpenTerminateDialog] = useState(false);
  const [openReactivateDialog, setOpenReactivateDialog] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  // console.log({ selectedTeamId });
  const [updateTeamStatus, setUpdateTeamStatus] = useState(false);
  const [openLogsDialog, setOpenLogsDialog] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [openOnLeaveDialog, setOpenOnLeaveDialog] = useState(false);
  const [openResignedDialog, setOpenResignedDialog] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [resignationReason, setResignationReason] = useState('');
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  const isMobileScreen = useMediaQuery('(max-width: 503px)');

  const handleAddTeam = async (data) => {
    try {
      const formData = {
        teamName: [data.firstName, data.secondName, data.thirdName, data.surname]
          .filter(Boolean) // Remove empty strings
          .join(' ') // Join with a single space
          .trim(), // Trim any leading or trailing spaces
        teamCompany: data.teamCompany,
        contactNumber: data.contactNumber,
        fsmSerialNumber: data.fsmSerialNumber || 'N/A',
        laptopSerialNumber: data.laptopSerialNumber || 'N/A',
      };

      const response = await api.post('/field-teams/add-field-team', formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.status === 201) {
        alert('Team information submitted successfully!');
        setUpdateState((prev) => !prev); // Refresh the teams list
      } else {
        setErrorMessage('There was an error submitting the information.');
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('There was an error submitting the information.');
    }
  };

  // Fetch teams
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await api.get('/field-teams/get-field-teams', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (response.status === 200) {
          setTeams(response.data.map(team => ({
            ...team,
            evaluationScore: team.evaluationScore || 0,
            isEvaluated: team.isEvaluated || false,
          })));
        } else {
          console.error('Failed to fetch teams');
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
      }
    };

    fetchTeams();
  }, [stateUpdate, updateTeamStatus]);

  // Handle edit click
  const handleEditClick = useCallback((team) => {
    setEditTeam(team);
    setOpenEditDialog(true);
  }, []);

  const handleToggleQuizPermission = useCallback(async (teamId, newStatus) => {
    try {
      const response = await api.put(
        `/field-teams/toggle-quiz-permission/${teamId}`,
        { canTakeQuiz: newStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );

      if (response.status === 200) {
        setUpdateState((prev) => !prev); // Refresh the teams list
      } else {
        alert('Failed to update quiz permission');
      }
    } catch (error) {
      console.error('Error toggling quiz permission:', error);
      alert('An error occurred while updating quiz permission');
    }
  }, []);

  // Handle delete click
  const handleDeleteClick = useCallback(async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;

    try {
      const response = await api.delete(`/field-teams/delete-field-team/${teamId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.status === 200) {
        alert('Team deleted successfully!');
        setUpdateState((prev) => !prev);
      } else {
        alert('Failed to delete the team.');
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('An error occurred while deleting the team.');
    }
  }, []);

  // Handle edit submission
  const onEditSubmit = useCallback(async (data) => {
    setLoading(true);
    setErrorMessage('');

    const updatedData = {
      teamName: [data.firstName, data.secondName, data.thirdName, data.surname]
        .filter(Boolean)
        .join(' ')
        .trim(),
      teamCompany: data.teamCompany,
      contactNumber: data.contactNumber,
      fsmSerialNumber: data.fsmSerialNumber || 'N/A',
      laptopSerialNumber: data.laptopSerialNumber || 'N/A',
    };

    try {
      // Step 1: Update the FieldTeams document
      const response = await api.put(`/field-teams/update-field-team/${editTeam._id}`, updatedData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.status === 200) {
        // Step 2: Update all Task documents with the matching teamId
        try {
          const updateTasksResponse = await api.put(
            `/tasks/update-tasks-by-team-id/${editTeam._id}`,
            { teamName: updatedData.teamName },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
              },
            }
          );

          // This will now succeed even if no tasks were found
          alert('Team information updated successfully!' +
            (updateTasksResponse.data.updatedCount > 0
              ? ` ${updateTasksResponse.data.updatedCount} related tasks were also updated.`
              : ' No related tasks needed updating.')
          );

          setUpdateState((prev) => !prev);
          setOpenEditDialog(false);
        } catch (taskError) {
          // This will only catch actual errors, not the "no tasks" case
          console.error('Task update error:', taskError);
          alert('Team information updated successfully, but there was an error updating related tasks.');
        }
      } else {
        setErrorMessage('There was an error updating the information.');
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('There was an error updating the information.');
    } finally {
      setLoading(false);
    }
  }, [editTeam]);

  // Handle export to Excel
  const handleExportToExcel = useCallback(() => {
    const dataToExport = teams.map(team => ({
      TeamName: team.teamName,
      TeamCompany: team.teamCompany,
      ContactNumber: team.contactNumber,
      FSMSerialNumber: team.fsmSerialNumber,
      LaptopSerialNumber: team.laptopSerialNumber,
      EvaluationScore: team.evaluationScore || 0,
      IsEvaluated: team.isEvaluated ? 'Yes' : 'No',
      LastEvaluationDate: team.lastEvaluationDate ? new Date(team.lastEvaluationDate).toLocaleDateString() : '',
      quizCode: team.quizCode,
      IsSuspended: team.isSuspended ? 'Yes' : 'No',
      SuspensionDuration: team.suspensionDuration || '',
      SuspensionReason: team.suspensionReason || '',
      IsTerminated: team.isTerminated ? 'Yes' : 'No',
      TerminationReason: team.terminationReason || '',
      IsActive: team.isActive ? 'Yes' : 'No',
      StateLogs: team.stateLogs.map(log => `${log.state} - ${log.reason || ''} - ${log.duration || ''} - ${new Date(log.changedAt).toLocaleString()}`).join(' | '),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Teams');
    XLSX.writeFile(workbook, 'teams.xlsx');
  }, [teams]);

  // Handle view history click
  const handleViewHistoryClick = useCallback(async (teamId) => {
    try {
      const response = await api.get(`/field-teams/get-evaluation-history/${teamId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (response.status === 200) {
        setEvaluationHistory(response.data);
        setSelectedTeamId(teamId);
        setOpenHistoryDialog(true);
      } else {
        alert('Failed to fetch evaluation history');
      }
    } catch (error) {
      console.error('Error fetching evaluation history:', error);
      alert('Error fetching evaluation history');
    }
  }, []);

  // Handle suspend, terminate, reactivate, on leave, and resigned clicks
  const handleSuspendClick = useCallback((teamId) => {
    setSelectedTeamId(teamId);
    setOpenSuspendDialog(true);
  }, []);

  const handleTerminateClick = useCallback((teamId) => {
    setSelectedTeamId(teamId);
    setOpenTerminateDialog(true);
  }, []);

  const handleReactivateClick = useCallback((teamId) => {
    setSelectedTeamId(teamId);
    setOpenReactivateDialog(true);
  }, []);

  const handleOnLeaveClick = useCallback((teamId) => {
    setSelectedTeamId(teamId);
    setOpenOnLeaveDialog(true);
  }, []);

  const handleResignedClick = useCallback((teamId) => {
    setSelectedTeamId(teamId);
    setOpenResignedDialog(true);
  }, []);

  // Handle confirm on leave and resigned
  const handleConfirmOnLeave = useCallback(async () => {
    try {
      const response = await api.post(`/field-teams/on-leave-field-team/${selectedTeamId}`, {
        leaveReason,
        leaveStartDate,
        leaveEndDate,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.status === 200) {
        alert('Team marked as on leave successfully!');
        setUpdateTeamStatus((prev) => !prev);
        setOpenOnLeaveDialog(false);
      } else {
        alert('Failed to mark team as on leave.');
      }
    } catch (error) {
      console.error('Error marking team as on leave:', error);
      alert('An error occurred while marking the team as on leave.');
    }
  }, [leaveReason, leaveStartDate, leaveEndDate, selectedTeamId]);

  const handleConfirmResigned = useCallback(async () => {
    try {
      const response = await api.post(`/field-teams/resigned-field-team/${selectedTeamId}`, {
        resignationReason,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.status === 200) {
        alert('Team marked as resigned successfully!');
        setUpdateTeamStatus((prev) => !prev);
        setOpenResignedDialog(false);
      } else {
        alert('Failed to mark team as resigned.');
      }
    } catch (error) {
      console.error('Error marking team as resigned:', error);
      alert('An error occurred while marking the team as resigned.');
    }
  }, [resignationReason, selectedTeamId]);

  // Handle view logs click
  const handleViewLogsClick = useCallback((teamId) => {
    const team = teams.find(team => team._id === teamId);
    if (team && team.stateLogs) {
      setSelectedLogs(team.stateLogs);
      setOpenLogsDialog(true);
    } else {
      alert('No logs found for this team.');
    }
  }, [teams]);

  // Handle close dialogs
  const handleCloseDialogs = useCallback(() => {
    setOpenSuspendDialog(false);
    setOpenTerminateDialog(false);
    setOpenReactivateDialog(false);
    setSelectedTeamId(null);
  }, []);

  // Handle close logs dialog
  const handleCloseLogsDialog = useCallback(() => {
    setOpenLogsDialog(false);
    setSelectedLogs([]);
  }, []);

  // Memoize filtered teams
  const filteredTeams = useMemo(() => {
    return teams.filter(team =>
      team.teamName && team.teamName.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [teams, searchText]);

  // Columns for DataGrid
  const columns = useMemo(() => [
    { field: 'teamName', headerName: 'Team Name', flex: 1, headerClassName: 'dark-header', minWidth: 200 },
    { field: 'teamCompany', headerName: 'Team Company', flex: 1, headerClassName: 'dark-header', minWidth: 120 },
    { field: 'contactNumber', headerName: 'Contact Number', flex: 1, headerClassName: 'dark-header', minWidth: 200 },
    {
      field: 'fsmSerialNumber',
      headerName: 'FSM Serial Number',
      flex: 1,
      headerClassName: 'dark-header',
      renderCell: (params) => params.row.fsmSerialNumber || 'N/A',
      minWidth: 200,
    },
    {
      field: 'laptopSerialNumber',
      headerName: 'Laptop Serial Number',
      flex: 1,
      headerClassName: 'dark-header',
      renderCell: (params) => params.row.laptopSerialNumber || 'N/A',
      minWidth: 200,
    },
    {
      field: 'canTakeQuiz',
      headerName: 'Quiz Allowed',
      flex: 1,
      headerClassName: 'dark-header',
      type: 'boolean',
      renderCell: (params) => params.value ? '✅ Yes' : '❌ No',
      minWidth: 120,
    },
    {
      field: 'evaluationScore',
      headerName: 'Evaluation Score',
      flex: 1,
      headerClassName: 'dark-header',
      type: 'number',
      valueFormatter: (params) => `${params || 'N/A'}`,
      minWidth: 120,
    },
    {
      field: 'isEvaluated',
      headerName: 'Evaluated',
      flex: 1,
      headerClassName: 'dark-header',
      type: 'boolean',
      renderCell: (params) => params.value ? 'Yes' : 'No',
      minWidth: 100,
    },
    {
      field: 'lastEvaluationDate',
      headerName: 'Last Evaluation Date',
      flex: 1,
      headerClassName: 'dark-header',
      valueFormatter: (params) => params ? new Date(params).toLocaleDateString() : '',
      minWidth: 200,
    },
    {
      field: 'viewHistory',
      headerName: 'View History',
      flex: 1,
      headerClassName: 'dark-header',
      renderCell: (params) => (
        <Button
          variant="text"
          color="info"
          onClick={() => handleViewHistoryClick(params.row._id)}
          sx={{ height: '30px' }}
        >
          <FaEye />
        </Button>
      ),
      minWidth: 120,
    },
    {
      field: 'quizCode',
      headerName: 'Quiz Code',
      flex: 1,
      headerClassName: 'dark-header',
      minWidth: 130,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 2,
      headerClassName: 'dark-header',
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Stack direction="row" spacing={1} height="100%" justifyContent="center" alignItems="center">
          <Button
            variant="text"
            color="primary"
            disabled={user.role !== 'Admin'}
            onClick={() => handleEditClick(params.row)}
            sx={{ height: '20px', py: 1, px: 0, fontSize: '12px' }}
          >
            Edit
          </Button>
          <Button
            variant="text"
            color="error"
            onClick={() => handleDeleteClick(params.row._id)}
            disabled={user.role !== 'Admin'}
            sx={{ height: '20px', py: 1, px: 0, fontSize: '12px' }}
          >
            Delete
          </Button>
          <Button
            variant="text"
            color="warning"
            disabled={user.role !== 'Admin'}
            onClick={() => handleSuspendClick(params.row._id)}
          >
            Suspend
          </Button>
          <Button
            variant="text"
            color="error"
            disabled={user.role !== 'Admin'}
            onClick={() => handleTerminateClick(params.row._id)}
          >
            Terminate
          </Button>
          <Button
            variant="text"
            color="success"
            disabled={user.role !== 'Admin'}
            onClick={() => handleReactivateClick(params.row._id)}
          >
            Reactivate
          </Button>
          <Button
            variant="text"
            color="info"
            disabled={user.role !== 'Admin'}
            onClick={() => handleOnLeaveClick(params.row._id)}
          >
            On Leave
          </Button>
          <Button
            variant="text"
            color="secondary"
            disabled={user.role !== 'Admin'}
            onClick={() => handleResignedClick(params.row._id)}
          >
            Resigned
          </Button>
          <Tooltip title={params.row.canTakeQuiz ? "Disallow Quiz" : "Allow Quiz"}>
            <Button
              variant="text"
              color={params.row.canTakeQuiz ? "success" : "error"}
              disabled={user.role !== 'Admin'}
              onClick={() => handleToggleQuizPermission(params.row._id, !params.row.canTakeQuiz)}
              sx={{
                height: '20px',
                py: 1,
                px: 0,
                fontSize: '12px',
                minWidth: '100px',
                backgroundColor: params.row.canTakeQuiz ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)',
                '&:hover': {
                  backgroundColor: params.row.canTakeQuiz ? 'rgba(46, 125, 50, 0.2)' : 'rgba(211, 47, 47, 0.2)',
                }
              }}
            >
              {params.row.canTakeQuiz ? "Allowed" : "Disallowed"}
            </Button>
          </Tooltip>
        </Stack>
      ),
      minWidth: 700,
    },
    {
      field: 'isSuspended',
      headerName: 'Suspended',
      flex: 1,
      headerClassName: 'dark-header',
      type: 'boolean',
      renderCell: (params) => params.value ? 'Yes' : 'No',
      minWidth: 100,
    },
    {
      field: 'suspensionDuration',
      headerName: 'Suspension Duration',
      flex: 1,
      headerClassName: 'dark-header',
      minWidth: 200,
    },
    {
      field: 'suspensionReason',
      headerName: 'Suspension Reason',
      flex: 1,
      headerClassName: 'dark-header',
      minWidth: 200,
    },
    {
      field: 'terminationReason',
      headerName: 'Termination Reason',
      flex: 1,
      headerClassName: 'dark-header',
      minWidth: 200,
    },
    {
      field: 'isActive',
      headerName: 'Active',
      flex: 1,
      headerClassName: 'dark-header',
      type: 'boolean',
      renderCell: (params) => params.value ? '✅ Yes' : '❌ No',
      minWidth: 100,
    },
    {
      field: 'stateLogs',
      headerName: 'State Logs',
      flex: 2,
      headerClassName: 'dark-header',
      renderCell: (params) => (
        <Button variant="text" color="info" onClick={() => handleViewLogsClick(params.row._id)}>
          View Logs
        </Button>

      ),
      minWidth: 120,
    },
  ], [handleDeleteClick, handleEditClick, handleOnLeaveClick, handleReactivateClick, handleResignedClick, handleSuspendClick, handleTerminateClick, handleToggleQuizPermission, handleViewHistoryClick, handleViewLogsClick, user.role]);

  return (
    <div className="max-w-[1000px] mx-auto">
      <Box sx={{ backgroundColor: '#121212', minHeight: '100vh', p: 3, color: '#ffffff' }}>
        {/* Add Team Form */}
        <AddTeamForm onSubmit={handleAddTeam} errorMessage={errorMessage} user={user} />

        <Divider sx={{ my: 4, backgroundColor: '#444' }} />

        {/* MUI Table */}
        <Box sx={{ mt: 4 }}>
          <Stack direction="row" flexDirection={isMobileScreen ? 'column' : 'row'} justifyContent="space-between" gap={2} alignItems="center" sx={{ mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                maxWidth: '600px',
                py: 1,
                px: 2,
                gap: 1,
                borderRadius: '999px',
                backgroundColor: '#121212',
                border: '1px solid #444',
                '&:focus-within': {
                  borderColor: '#3ea6ff',
                },
              }}
            >
              <MdOutlineSearch className="text-gray-400 text-xl" />
              <TextField
                fullWidth
                variant="standard"
                placeholder="Search by team name"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                sx={{
                  '& .MuiInputBase-root': {
                    backgroundColor: 'transparent',
                    color: '#ffffff',
                  },
                  '& .MuiInputBase-input': {
                    fontSize: '14px',
                    color: '#ffffff',
                    padding: 0,
                  },
                  '& .MuiInput-root:before': {
                    borderBottom: 'none',
                  },
                  '& .MuiInput-root:after': {
                    borderBottom: 'none',
                  },
                  '& .MuiInput-root:hover:not(.Mui-disabled):before': {
                    borderBottom: 'none',
                  },
                }}
                InputProps={{
                  disableUnderline: true,
                  style: { color: '#ffffff' },
                  endAdornment: searchText && (
                    <IconButton
                      size="small"
                      onClick={() => setSearchText('')}
                      sx={{ color: '#9e9e9e', '&:hover': { color: '#ffffff' } }}
                    >
                      <MdClose className="text-xl" />
                    </IconButton>
                  ),
                }}
              />
            </Box>
            <Tooltip title="Export to Excel Sheet">
              <Button
                variant="contained"
                onClick={handleExportToExcel}
                sx={{ backgroundColor: '#3ea6ff', color: '#121212', padding: '0px 20px', alignSelf: 'end', '&:hover': { backgroundColor: '#1d4ed8' } }}
              >
                Export CSV
              </Button>
            </Tooltip>
          </Stack>
          <Box
            sx={{
              width: '100%',
              height: '400px',
              overflow: 'hidden',
              backgroundColor: '#272727',
              borderRadius: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <DataGrid
              rows={filteredTeams}
              columns={columns}
              getRowId={(row) => row.teamName}
              pageSizeOptions={[5, 10, 25]}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              checkboxSelection
              disableRowSelectionOnClick
              sx={{
                flex: 1,
                width: '100%',
                border: 0,
                color: '#ffffff',
                '& .MuiDataGrid-main': {
                  backgroundColor: '#272727',
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: '#333',
                  color: '#9e9e9e',
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  borderBottom: '1px solid #444',
                },
                '& .MuiDataGrid-columnHeader': {
                  backgroundColor: '#333',
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #444',
                },
                '& .MuiDataGrid-row': {
                  backgroundColor: '#272727',
                  '&:hover': {
                    backgroundColor: '#333',
                  },
                },
                '& .MuiDataGrid-footerContainer': {
                  minHeight: '64px',
                  backgroundColor: '#333',
                  color: '#ffffff',
                  borderTop: '1px solid #444',
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
                    backgroundColor: '#444',
                  },
                },
                '& .MuiDataGrid-scrollbarFiller': {
                  backgroundColor: '#333',
                },
              }}
            />
          </Box>
        </Box>

        {/* Edit Dialog */}
        <EditTeamDialog
          open={openEditDialog}
          onClose={() => setOpenEditDialog(false)}
          team={editTeam}
          onSubmit={onEditSubmit}
          errorMessage={errorMessage}
        />

        {/* History Dialog */}
        <Dialog
          open={openHistoryDialog}
          onClose={() => setOpenHistoryDialog(false)}
          sx={{
            "& .MuiDialog-paper": {
              backgroundColor: '#1e1e1e',
              boxShadow: 'none',
              // minWidth: '600px', // Make the dialog wider
              // maxWidth: '800px', // Set a maximum width
              width: '90%' // Take up 80% of the screen width
            }
          }}
        >
          <DialogTitle sx={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>
            Evaluation History - {teams.find(team => team._id === selectedTeamId)?.teamName || 'Team'}
          </DialogTitle>
          <DialogContent sx={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>
            {evaluationHistory.length === 0 ? (
              <Typography>No evaluation history available</Typography>
            ) : (
              <ul style={{ paddingLeft: '20px' }}>
                {evaluationHistory.map((evaluation, index) => (
                  <li key={index} style={{ marginBottom: '10px' }}>
                    <strong>Date:</strong> {new Date(evaluation.date).toLocaleString()} | <strong>Score:</strong> {evaluation.score}
                  </li>
                ))}
              </ul>
            )}
          </DialogContent>
          <DialogActions sx={{ backgroundColor: '#1e1e1e' }}>
            <Button onClick={() => setOpenHistoryDialog(false)} sx={{ color: '#ffffff' }}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Logs Dialog */}
        <Dialog open={openLogsDialog} onClose={handleCloseLogsDialog} sx={{ "& .MuiDialog-paper": { backgroundColor: '#1e1e1e', boxShadow: 'none' } }}>
          <DialogTitle sx={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>State Logs</DialogTitle>
          <DialogContent sx={{ backgroundColor: '#1e1e1e', color: '#ffffff', minWidth: '300px', maxWidth: '600px' }}>
            {selectedLogs.length === 0 ? (
              <Typography>No logs available</Typography>
            ) : (
              <ul>
                {selectedLogs.map((log, index) => (
                  <li key={log._id.$oid || index}>
                    <strong>State:</strong> {log.state} <br />
                    <strong>Reason:</strong> {log.reason || 'N/A'} <br />
                    <strong>Start Date:</strong> {log.startDate ? new Date(log.startDate).toLocaleString() : 'N/A'} <br />
                    <strong>End Date:</strong> {log.endDate ? new Date(log.endDate).toLocaleString() : 'N/A'} <br />
                    <strong>Changed At:</strong> {new Date(log.changedAt).toLocaleString()} <br />
                    <strong>ID:</strong> {log._id} <br />
                    <hr />
                  </li>
                ))}
              </ul>
            )}
          </DialogContent>
          <DialogActions sx={{ backgroundColor: '#1e1e1e' }}>
            <Button onClick={handleCloseLogsDialog} sx={{ color: '#ffffff' }}>Close</Button>
          </DialogActions>
        </Dialog>

        <SuspendTeamDialog
          open={openSuspendDialog}
          onClose={handleCloseDialogs}
          teamId={selectedTeamId}
          setUpdateTeamStatus={setUpdateTeamStatus}
        />
        <TerminateTeamDialog
          open={openTerminateDialog}
          onClose={handleCloseDialogs}
          teamId={selectedTeamId}
          setUpdateTeamStatus={setUpdateTeamStatus}
        />
        <ReactivateTeamDialog
          open={openReactivateDialog}
          onClose={handleCloseDialogs}
          teamId={selectedTeamId}
          setUpdateTeamStatus={setUpdateTeamStatus}
        />

        {/* On Leave Dialog */}
        <Dialog open={openOnLeaveDialog} onClose={() => setOpenOnLeaveDialog(false)}>
          <DialogTitle>Mark Team as On Leave</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Leave Reason"
              fullWidth
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
            />
            <TextField
              margin="dense"
              label="Leave Start Date"
              type="date"
              fullWidth
              value={leaveStartDate}
              onChange={(e) => setLeaveStartDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              margin="dense"
              label="Leave End Date"
              type="date"
              fullWidth
              value={leaveEndDate}
              onChange={(e) => setLeaveEndDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenOnLeaveDialog(false)} color="primary">
              Cancel
            </Button>
            <Button onClick={handleConfirmOnLeave} color="primary">
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        {/* Resigned Dialog */}
        <Dialog open={openResignedDialog} onClose={() => setOpenResignedDialog(false)}>
          <DialogTitle>Mark Team as Resigned</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Resignation Reason"
              fullWidth
              value={resignationReason}
              onChange={(e) => setResignationReason(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenResignedDialog(false)} color="primary">
              Cancel
            </Button>
            <Button onClick={handleConfirmResigned} color="primary">
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </div>
  );
};

export default FieldTeamForm;