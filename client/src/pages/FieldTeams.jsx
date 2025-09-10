import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box, TextField, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Tooltip, Typography, IconButton,
  useMediaQuery, List, ListItem, ListItemText, Chip,
} from '@mui/material';
import {
  Edit as EditIcon, Delete as DeleteIcon, PauseCircleOutline as PauseCircleOutlineIcon, Block as BlockIcon,
  PlayCircleOutline as PlayCircleOutlineIcon, BeachAccess as BeachAccessIcon, CheckCircleOutline as CheckCircleOutlineIcon,
  Cancel as CancelIcon, CancelOutlined as CancelOutlinedIcon, History as HistoryIcon, Phone as PhoneIcon,
  DeviceHub as DeviceHubIcon, Laptop as LaptopIcon, CheckCircle as CheckCircleIcon, TaskAlt as TaskAltIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import * as XLSX from 'xlsx';
import { useSelector } from 'react-redux';
import { FaSignOutAlt } from 'react-icons/fa';
import { MdClose, MdOutlineSearch } from 'react-icons/md';
import { SuspendTeamDialog } from '../components/SuspendTeamDialog';
import { TerminateTeamDialog } from '../components/TerminateTeamDialog';
import { ReactivateTeamDialog } from '../components/ReactivateTeamDialog';
import EditTeamDialog from '../components/EditTeamDialog';
import AddTeamForm from '../components/AddTeamForm';
import api from '../api/api';
import CopyMUICell from '../components/CopyMUICell';
import { RiFileExcel2Fill } from 'react-icons/ri';

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
  const isMobile = useMediaQuery('(max-width: 503px)');

  const handleAddTeam = async (data) => {
    try {
      const formData = {
        teamName: [data.firstName, data.secondName, data.thirdName, data.surname]
          .filter(Boolean)
          .join(' ')
          .trim(),
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
        setUpdateState((prev) => !prev);
      } else {
        setErrorMessage('There was an error submitting the information.');
      }
    } catch (error) {
      setErrorMessage('There was an error submitting the information.');
    }
  };

  // Fetch teams and evaluation data
  useEffect(() => {
    const fetchTeamsAndEvaluations = async () => {
      setLoading(true);
      try {
        // Fetch FieldTeams
        const teamsResponse = await api.get('/field-teams/get-field-teams', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        // Fetch Evaluation Data
        const evalResponse = await api.get('/quiz-results/teams/evaluation', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (teamsResponse.status === 200 && evalResponse.status === 200) {
          const evalData = evalResponse.data.data;
          const updatedTeams = teamsResponse.data.map(team => {
            const evalTeam = evalData.find(e => e.teamId === team._id) || {};
            const history = evalTeam.history || [];
            const latestEval = history.length > 0 ? history[0] : null;
            return {
              ...team,
              evaluationScore: team.evaluationScore || 0,
              isEvaluated: team.isEvaluated || !!latestEval,
              lastEvaluationDate: latestEval ? new Date(latestEval.submittedAt) : team.lastEvaluationDate,
              quizCode: latestEval ? latestEval.quizCode : team.quizCode,
              evaluationHistory: history,
            };
          });
          setTeams(updatedTeams);
        } else {
          setErrorMessage('Failed to fetch teams or evaluation data');
        }
      } catch (error) {
        setErrorMessage('Error fetching data: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamsAndEvaluations();
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
        setUpdateState((prev) => !prev);
      } else {
        alert('Failed to update quiz permission');
      }
    } catch (error) {
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
      const response = await api.put(`/field-teams/update-field-team/${editTeam._id}`, updatedData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.status === 200) {
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

          alert('Team information updated successfully!' +
            (updateTasksResponse.data.updatedCount > 0
              ? ` ${updateTasksResponse.data.updatedCount} related tasks were also updated.`
              : ' No related tasks needed updating.')
          );

          setUpdateState((prev) => !prev);
          setOpenEditDialog(false);
        } catch (taskError) {
          alert('Team information updated successfully, but there was an error updating related tasks.');
        }
      } else {
        setErrorMessage('There was an error updating the information.');
      }
    } catch (error) {
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
      LastEvaluationDate: team.lastEvaluationDate ? new Date(team.lastEvaluationDate).toLocaleDateString() : 'Never',
      LatestEvaluationPercentage: team.evaluationHistory?.[0]?.percentage || 'N/A',
      QuizCode: team.quizCode || 'N/A',
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
  const handleViewHistoryClick = useCallback((teamId) => {
    const team = teams.find(t => t._id === teamId);
    if (team && team.evaluationHistory) {
      setEvaluationHistory(team.evaluationHistory);
      setSelectedTeamId(teamId);
      setOpenHistoryDialog(true);
    } else {
      alert('No evaluation history available for this team.');
    }
  }, [teams]);

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
    {
      field: 'teamName',
      headerName: 'Team Name',
      flex: 1,
      headerClassName: 'dark-header',
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
      minWidth: 200,
    },
    {
      field: 'teamCompany',
      headerName: 'Team Company',
      flex: 1,
      headerClassName: 'dark-header',
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
      minWidth: 120,
    },
    {
      field: 'contactNumber',
      headerName: 'Contact Number',
      flex: 1,
      headerClassName: 'dark-header',
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <PhoneIcon fontSize="small" sx={{ mr: 1, color: '#4caf50' }} />
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
      minWidth: 200,
    },
    {
      field: 'fsmSerialNumber',
      headerName: 'FSM Serial Number',
      flex: 1,
      headerClassName: 'dark-header',
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <DeviceHubIcon fontSize="small" sx={{ mr: 1, color: '#ff9800' }} />
          <Typography variant="body2">{params.row.fsmSerialNumber || 'N/A'}</Typography>
        </Box>
      ),
      minWidth: 200,
    },
    {
      field: 'laptopSerialNumber',
      headerName: 'Laptop Serial Number',
      flex: 1,
      headerClassName: 'dark-header',
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <LaptopIcon fontSize="small" sx={{ mr: 1, color: '#607d8b' }} />
          <Typography variant="body2">{params.row.laptopSerialNumber || 'N/A'}</Typography>
        </Box>
      ),
      minWidth: 200,
    },
    // REMOVED the evaluationScore column
    {
      field: 'isEvaluated',
      headerName: 'Evaluated',
      flex: 1,
      headerClassName: 'dark-header',
      type: 'boolean',
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          color: params.value ? '#4caf50' : '#FF9800'
        }}>
          {params.value ? (
            <>
              <TaskAltIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body2">Completed</Typography>
            </>
          ) : (
            <>
              <PendingIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body2">Pending</Typography>
            </>
          )}
        </Box>
      ),
      minWidth: 120,
    },
    {
      field: 'lastEvaluation',
      headerName: 'Latest Evaluation',
      flex: 1,
      headerClassName: 'dark-header',
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const latestEval = params.row.evaluationHistory?.[0];
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2">
              {latestEval
                ? `${latestEval.percentage}% (${new Date(latestEval.submittedAt).toLocaleDateString()})`
                : 'Never'}
            </Typography>
          </Box>
        );
      },
      minWidth: 150,
    },
    {
      field: 'viewHistory',
      headerName: 'Evaluation History',
      flex: 1,
      align: 'center',
      headerAlign: 'center',
      headerClassName: 'dark-header',
      renderCell: (params) => (
        <Tooltip title="View evaluation history" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <IconButton
            color="info"
            onClick={() => handleViewHistoryClick(params.row._id)}
            sx={{
              '&:hover': { backgroundColor: 'rgba(2, 136, 209, 0.1)' },
              color: '#0288d1'
            }}
          >
            <HistoryIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
      minWidth: 100,
    },
    {
      field: 'canTakeQuiz',
      headerName: 'Quiz Allowed',
      flex: 1,
      headerClassName: 'dark-header',
      type: 'boolean',
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          color: params.value ? '#4caf50' : '#f44336'
        }}>
          {params.value ? (
            <>
              <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body2">Allowed</Typography>
            </>
          ) : (
            <>
              <CancelIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body2">Blocked</Typography>
            </>
          )}
        </Box>
      ),
      minWidth: 120,
    },
    ...(user.role === 'Admin'
      ? [
        {
          field: '_id',
          headerName: 'Team ID',
          minWidth: 230,
          align: 'center',
          headerAlign: 'center',
          headerClassName: 'dark-header',
          renderCell: (params) => <CopyMUICell value={params.value} />,
        },
        {
          field: 'quizCode',
          headerName: 'Quiz Code',
          flex: 1,
          align: 'center',
          headerAlign: 'center',
          headerClassName: 'dark-header',
          minWidth: 140,
          renderCell: (params) => <CopyMUICell value={params.value} />,
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
              <Tooltip title="Edit">
                <span>
                  <IconButton
                    color="primary"
                    disabled={user.role !== 'Admin'}
                    onClick={() => handleEditClick(params.row)}
                    sx={{
                      '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' },
                      color: '#1976d2'
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Delete">
                <span>
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteClick(params.row._id)}
                    disabled={user.role !== 'Admin'}
                    sx={{
                      '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.1)' },
                      color: '#d32f2f'
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Suspend">
                <span>
                  <IconButton
                    color="warning"
                    disabled={user.role !== 'Admin'}
                    onClick={() => handleSuspendClick(params.row._id)}
                    sx={{
                      '&:hover': { backgroundColor: 'rgba(237, 108, 2, 0.1)' },
                      color: '#ed6c02'
                    }}
                  >
                    <PauseCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Terminate">
                <span>
                  <IconButton
                    color="error"
                    disabled={user.role !== 'Admin'}
                    onClick={() => handleTerminateClick(params.row._id)}
                    sx={{
                      '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.1)' },
                      color: '#d32f2f'
                    }}
                  >
                    <BlockIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Reactivate">
                <span>
                  <IconButton
                    color="success"
                    disabled={user.role !== 'Admin'}
                    onClick={() => handleReactivateClick(params.row._id)}
                    sx={{
                      '&:hover': { backgroundColor: 'rgba(46, 125, 50, 0.1)' },
                      color: '#2e7d32'
                    }}
                  >
                    <PlayCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="On Leave">
                <span>
                  <IconButton
                    color="info"
                    disabled={user.role !== 'Admin'}
                    onClick={() => handleOnLeaveClick(params.row._id)}
                    sx={{
                      '&:hover': { backgroundColor: 'rgba(2, 136, 209, 0.1)' },
                      color: '#0288d1'
                    }}
                  >
                    <BeachAccessIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Resigned">
                <span>
                  <IconButton
                    color="secondary"
                    disabled={user.role !== 'Admin'}
                    onClick={() => handleResignedClick(params.row._id)}
                    sx={{
                      '&:hover': { backgroundColor: 'rgba(123, 31, 162, 0.1)' },
                      color: '#7b1fa2'
                    }}
                  >
                    <FaSignOutAlt fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={params.row.canTakeQuiz ? "Disallow Quiz" : "Allow Quiz"}>
                <span>
                  <IconButton
                    color={params.row.canTakeQuiz ? "success" : "error"}
                    disabled={user.role !== 'Admin'}
                    onClick={() => handleToggleQuizPermission(params.row._id, !params.row.canTakeQuiz)}
                    sx={{
                      '&:hover': {
                        backgroundColor: params.row.canTakeQuiz
                          ? 'rgba(46, 125, 50, 0.2)'
                          : 'rgba(211, 47, 47, 0.2)',
                      },
                      backgroundColor: params.row.canTakeQuiz
                        ? 'rgba(46, 125, 50, 0.1)'
                        : 'rgba(211, 47, 47, 0.1)',
                    }}
                  >
                    {params.row.canTakeQuiz ? (
                      <CheckCircleOutlineIcon fontSize="small" />
                    ) : (
                      <CancelIcon fontSize="small" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          ),
          minWidth: 400,
        },
      ]
      : []),
    {
      field: 'isActive',
      headerName: 'Team Status',
      flex: 1,
      headerClassName: 'dark-header',
      type: 'boolean',
      renderCell: (params) => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          color: params.value ? '#2e7d32' : '#d32f2f'
        }}>
          {params.value ? (
            <>
              <CheckCircleOutlineIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body2">Active</Typography>
            </>
          ) : (
            <>
              <CancelOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="body2">Inactive</Typography>
            </>
          )}
        </Box>
      ),
      minWidth: 120,
    },
    {
      field: 'stateLogs',
      headerName: 'State Logs',
      flex: 2,
      headerClassName: 'dark-header',
      renderCell: (params) => (
        <Tooltip title="View state change history">
          <IconButton
            color="info"
            onClick={() => handleViewLogsClick(params.row._id)}
            sx={{
              '&:hover': { backgroundColor: 'rgba(2, 136, 209, 0.1)' },
              color: '#0288d1'
            }}
          >
            <HistoryIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
      minWidth: 100,
    },
  ], [handleDeleteClick, handleEditClick, handleOnLeaveClick, handleReactivateClick, handleResignedClick, handleSuspendClick, handleTerminateClick, handleToggleQuizPermission, handleViewHistoryClick, handleViewLogsClick, user.role]);

  return (
    <Box
      sx={{
        maxWidth: '1100px',
        mx: 'auto',
        p: 2,
        px: isMobile ? 0 : undefined
      }}
    >
      <Box sx={{ backgroundColor: '#121212', minHeight: '100vh', py: 3, color: '#ffffff' }}>
        {loading && <Typography>Loading...</Typography>}
        {errorMessage && <Typography color="error">{errorMessage}</Typography>}
        <AddTeamForm onSubmit={handleAddTeam} errorMessage={errorMessage} user={user} />
        <Divider sx={{ my: 4, backgroundColor: '#444' }} />
        <Box sx={{ mt: 4 }}>
          <Stack direction="row" flexDirection={'row'} justifyContent="space-between" gap={2} alignItems="center" sx={{ mb: 2 }}>
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
            <Tooltip title="Export to Excel">
              <IconButton
                onClick={handleExportToExcel}
                size={isMobile ? "small" : "medium"}
                sx={{
                  color: '#4caf50',
                  '&:hover': {
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  }
                }}
              >
                <RiFileExcel2Fill fontSize={isMobile ? "16px" : "20px"} />
              </IconButton>
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
              getRowId={(row) => row._id} // Changed to use _id for unique row ID
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
                  "& .MuiDataGrid-columnHeaderTitleContainerContent": {
                    "& span": {
                      color: '#848484',
                    }
                  }
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #444',
                  "& span": {
                    color: '#ffffff99',
                  }
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

        {/* Suspend Team Dialog */}
        <SuspendTeamDialog
          open={openSuspendDialog}
          onClose={handleCloseDialogs}
          teamId={selectedTeamId}
          setUpdateTeamStatus={setUpdateTeamStatus}
        />

        {/* Terminate Team Dialog */}
        <TerminateTeamDialog
          open={openTerminateDialog}
          onClose={handleCloseDialogs}
          teamId={selectedTeamId}
          setUpdateTeamStatus={setUpdateTeamStatus}
        />

        {/* Reactivate Team Dialog */}
        <ReactivateTeamDialog
          open={openReactivateDialog}
          onClose={handleCloseDialogs}
          teamId={selectedTeamId}
          setUpdateTeamStatus={setUpdateTeamStatus}
        />

        {/* Evaluation History Dialog */}
        <Dialog
          open={openHistoryDialog}
          onClose={() => setOpenHistoryDialog(false)}
          fullScreen={isMobile}
          fullWidth
          maxWidth="md" // Reduced from lg to md since we're showing less information
          sx={{
            "& .MuiDialog-paper": {
              backgroundColor: '#1e1e1e',
              boxShadow: 'none',
              borderRadius: isMobile ? 0 : '8px',
              border: isMobile ? 'none' : '1px solid #444',
              margin: 0,
              width: isMobile ? '100%' : '60%', // Reduced width
              maxWidth: '100%'
            }
          }}
        >
          <DialogTitle sx={{
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            borderBottom: '1px solid #444',
            padding: isMobile ? '12px 16px' : '16px 24px',
            fontWeight: 500,
            position: 'sticky',
            top: 0,
            zIndex: 1
          }}>
            Evaluation History - {teams.find(team => team._id === selectedTeamId)?.teamName || 'Team'}
          </DialogTitle>
          <DialogContent sx={{
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            padding: isMobile ? '12px 16px' : '20px 24px',
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#444',
              borderRadius: '2px',
            },
            "&.MuiDialogContent-root": {
              paddingTop: 3,
            }
          }}>
            {evaluationHistory.length === 0 ? (
              <Typography variant="body1" sx={{ color: '#aaaaaa' }}>No evaluation history available</Typography>
            ) : (
              <List sx={{ width: '100%' }}>
                {evaluationHistory.map((quiz, index) => (
                  <ListItem key={quiz._id} sx={{
                    padding: isMobile ? '8px 0' : '12px 0',
                    borderBottom: index < evaluationHistory.length - 1 ? '1px solid #444' : 'none',
                    flexDirection: 'column',
                    alignItems: 'flex-start'
                  }}>
                    <ListItemText
                      primary={
                        <Typography variant={isMobile ? "body2" : "body1"} sx={{ color: '#ffffff' }}>
                          {new Date(quiz.submittedAt).toLocaleString()}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography
                            variant={isMobile ? "caption" : "body2"}
                            component="span"
                            sx={{ color: '#aaaaaa' }}
                          >
                            Score: <Chip
                              label={`${quiz.score} (${quiz.percentage}%)`}
                              size={isMobile ? "small" : "medium"}
                              sx={{
                                backgroundColor: quiz.percentage >= 90 ? '#4caf50' :
                                  quiz.percentage >= 70 ? '#ff9800' : '#f44336',
                                color: '#ffffff',
                                fontWeight: 'bold',
                                ml: 1,
                                fontSize: isMobile ? '0.75rem' : '0.875rem'
                              }}
                            />
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions sx={{
            backgroundColor: '#1e1e1e',
            borderTop: '1px solid #444',
            padding: isMobile ? '8px 16px' : '12px 24px',
            position: 'sticky',
            bottom: 0
          }}>
            <Button
              onClick={() => setOpenHistoryDialog(false)}
              size={isMobile ? "small" : "medium"}
              sx={{
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#2a2a2a',
                }
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Logs Dialog */}
        <Dialog
          open={openLogsDialog}
          onClose={handleCloseLogsDialog}
          fullScreen={isMobile}
          fullWidth
          maxWidth="md"
          sx={{
            "& .MuiDialog-paper": {
              backgroundColor: '#1e1e1e',
              boxShadow: 'none',
              borderRadius: isMobile ? 0 : '8px',
              border: isMobile ? 'none' : '1px solid #444',
              margin: 0,
              width: isMobile ? '100%' : '70%',
              maxWidth: '100%'
            }
          }}
        >
          <DialogTitle sx={{
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            borderBottom: '1px solid #444',
            padding: isMobile ? '12px 16px' : '16px 24px',
            fontWeight: 500,
            position: 'sticky',
            top: 0,
            zIndex: 1
          }}>
            State Logs
          </DialogTitle>
          <DialogContent sx={{
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            padding: isMobile ? '12px 16px' : '20px 24px',
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#444',
              borderRadius: '2px',
            },
            "&.MuiDialogContent-root": {
              paddingTop: 3,
            }
          }}>
            {selectedLogs.length === 0 ? (
              <Typography variant="body1" sx={{ color: '#aaaaaa' }}>No logs available</Typography>
            ) : (
              <List>
                {selectedLogs.map((log, index) => (
                  <Box key={log._id?.$oid || index} sx={{ mb: isMobile ? 2 : 3 }}>
                    <Box sx={{
                      backgroundColor: '#272727',
                      p: isMobile ? 1.5 : 2,
                      borderRadius: '4px',
                      borderLeft: '3px solid #3ea6ff'
                    }}>
                      <Typography variant={isMobile ? "body2" : "subtitle1"} sx={{ color: '#3ea6ff', mb: 1 }}>
                        {log.state}
                      </Typography>
                      <Typography variant={isMobile ? "caption" : "body2"} sx={{ color: '#ffffff', mb: 0.5 }}>
                        <Box component="span" sx={{ color: '#aaaaaa' }}>Reason:</Box> {log.reason || 'N/A'}
                      </Typography>
                      <Typography variant={isMobile ? "caption" : "body2"} sx={{ color: '#ffffff', mb: 0.5 }}>
                        <Box component="span" sx={{ color: '#aaaaaa' }}>Start Date:</Box> {log.startDate ? new Date(log.startDate).toLocaleString() : 'N/A'}
                      </Typography>
                      <Typography variant={isMobile ? "caption" : "body2"} sx={{ color: '#ffffff', mb: 0.5 }}>
                        <Box component="span" sx={{ color: '#aaaaaa' }}>End Date:</Box> {log.endDate ? new Date(log.endDate).toLocaleString() : 'N/A'}
                      </Typography>
                      <Typography variant={isMobile ? "caption" : "body2"} sx={{ color: '#ffffff' }}>
                        <Box component="span" sx={{ color: '#aaaaaa' }}>Changed At:</Box> {new Date(log.changedAt).toLocaleString()}
                      </Typography>
                    </Box>
                    {index < selectedLogs.length - 1 && <Divider sx={{ mt: isMobile ? 1 : 2, backgroundColor: '#444' }} />}
                  </Box>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions sx={{
            backgroundColor: '#1e1e1e',
            borderTop: '1px solid #444',
            padding: isMobile ? '8px 16px' : '12px 24px',
            position: 'sticky',
            bottom: 0
          }}>
            <Button
              onClick={handleCloseLogsDialog}
              size={isMobile ? "small" : "medium"}
              sx={{
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#2a2a2a',
                }
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* On Leave Dialog */}
        <Dialog
          open={openOnLeaveDialog}
          onClose={() => setOpenOnLeaveDialog(false)}
          fullScreen={isMobile}
          fullWidth
          maxWidth="sm"
          sx={{
            "& .MuiDialog-paper": {
              backgroundColor: '#1e1e1e',
              boxShadow: 'none',
              borderRadius: isMobile ? 0 : '8px',
              border: isMobile ? 'none' : '1px solid #444',
              margin: 0,
              width: isMobile ? '100%' : '70%',
              maxWidth: '100%'
            }
          }}
        >
          <DialogTitle sx={{
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            borderBottom: '1px solid #444',
            padding: isMobile ? '12px 16px' : '16px 24px',
            fontWeight: 500,
            position: 'sticky',
            top: 0,
            zIndex: 1
          }}>
            Mark Team as On Leave
          </DialogTitle>
          <DialogContent sx={{
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            padding: isMobile ? '12px 16px' : '20px 24px',
            "&.MuiDialogContent-root": {
              paddingTop: 3,
            }
          }}>
            <TextField
              autoFocus
              margin="dense"
              label="Leave Reason"
              fullWidth
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              sx={{
                mb: 2,
                '& .MuiInputBase-root': {
                  color: '#ffffff',
                },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#444',
                  },
                  '&:hover fieldset': {
                    borderColor: '#3ea6ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3ea6ff',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#aaaaaa',
                  fontSize: isMobile ? '0.875rem' : '1rem'
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#3ea6ff',
                },
              }}
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
              sx={{
                mb: 2,
                '& .MuiInputBase-root': {
                  color: '#ffffff',
                },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#444',
                  },
                  '&:hover fieldset': {
                    borderColor: '#3ea6ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3ea6ff',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#aaaaaa',
                  fontSize: isMobile ? '0.875rem' : '1rem'
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#3ea6ff',
                },
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
              sx={{
                '& .MuiInputBase-root': {
                  color: '#ffffff',
                },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#444',
                  },
                  '&:hover fieldset': {
                    borderColor: '#3ea6ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3ea6ff',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#aaaaaa',
                  fontSize: isMobile ? '0.875rem' : '1rem'
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#3ea6ff',
                },
              }}
            />
          </DialogContent>
          <DialogActions sx={{
            backgroundColor: '#1e1e1e',
            borderTop: '1px solid #444',
            padding: isMobile ? '8px 16px' : '12px 24px',
            position: 'sticky',
            bottom: 0
          }}>
            <Button
              onClick={() => setOpenOnLeaveDialog(false)}
              size={isMobile ? "small" : "medium"}
              sx={{
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#2a2a2a',
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmOnLeave}
              size={isMobile ? "small" : "medium"}
              sx={{
                color: '#3ea6ff',
                '&:hover': {
                  backgroundColor: 'rgba(62, 166, 255, 0.1)',
                }
              }}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        {/* Resigned Dialog */}
        <Dialog
          open={openResignedDialog}
          onClose={() => setOpenResignedDialog(false)}
          fullScreen={isMobile}
          fullWidth
          maxWidth="sm"
          sx={{
            "& .MuiDialog-paper": {
              backgroundColor: '#1e1e1e',
              boxShadow: 'none',
              borderRadius: isMobile ? 0 : '8px',
              border: isMobile ? 'none' : '1px solid #444',
              margin: 0,
              width: isMobile ? '100%' : '70%',
              maxWidth: '100%'
            }
          }}
        >
          <DialogTitle sx={{
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            borderBottom: '1px solid #444',
            padding: isMobile ? '12px 16px' : '16px 24px',
            fontWeight: 500,
            position: 'sticky',
            top: 0,
            zIndex: 1
          }}>
            Mark Team as Resigned
          </DialogTitle>
          <DialogContent sx={{
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            padding: isMobile ? '12px 16px' : '20px 24px',
            "&.MuiDialogContent-root": {
              paddingTop: 3,
            }
          }}>
            <TextField
              autoFocus
              margin="dense"
              label="Resignation Reason"
              fullWidth
              value={resignationReason}
              onChange={(e) => setResignationReason(e.target.value)}
              sx={{
                '& .MuiInputBase-root': {
                  color: '#ffffff',
                },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#444',
                  },
                  '&:hover fieldset': {
                    borderColor: '#3ea6ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3ea6ff',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#aaaaaa',
                  fontSize: isMobile ? '0.875rem' : '1rem'
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#3ea6ff',
                },
              }}
            />
          </DialogContent>
          <DialogActions sx={{
            backgroundColor: '#1e1e1e',
            borderTop: '1px solid #444',
            padding: isMobile ? '8px 16px' : '12px 24px',
            position: 'sticky',
            bottom: 0
          }}>
            <Button
              onClick={() => setOpenResignedDialog(false)}
              size={isMobile ? "small" : "medium"}
              sx={{
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#2a2a2a',
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmResigned}
              size={isMobile ? "small" : "medium"}
              sx={{
                color: '#3ea6ff',
                '&:hover': {
                  backgroundColor: 'rgba(62, 166, 255, 0.1)',
                }
              }}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default FieldTeamForm;