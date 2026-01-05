import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box, TextField, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Tooltip, Typography, IconButton,
  useMediaQuery, List, ListItem, ListItemText, Chip,
  Avatar, Menu, MenuItem, ListItemIcon
} from '@mui/material';
import {
  Edit as EditIcon, Delete as DeleteIcon, PauseCircleOutline as PauseCircleOutlineIcon, Block as BlockIcon,
  PlayCircleOutline as PlayCircleOutlineIcon, BeachAccess as BeachAccessIcon, CheckCircleOutline as CheckCircleOutlineIcon,
  Cancel as CancelIcon, CancelOutlined as CancelOutlinedIcon, History as HistoryIcon, Phone as PhoneIcon,
  DeviceHub as DeviceHubIcon, Laptop as LaptopIcon, CheckCircle as CheckCircleIcon, TaskAlt as TaskAltIcon,
  Pending as PendingIcon, Refresh as RefreshIcon, Visibility,
  MoreVert,
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
import FieldTeamDetailsDialog from '../components/FieldTeamDetailsDialog';
import api from '../api/api';
import CopyMUICell from '../components/CopyMUICell';
import { RiFileExcel2Fill } from 'react-icons/ri';
import {
  DialogContentText,
} from '@mui/material';

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

  // NEW: State for View Details and Delete Confirmation
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [teamToView, setTeamToView] = useState(null);
  const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");

  // Menu State
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuTeam, setMenuTeam] = useState(null);

  const handleMenuOpen = (event, team) => {
    setAnchorEl(event.currentTarget);
    setMenuTeam(team);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuTeam(null);
  };

  const isMobile = useMediaQuery('(max-width: 503px)');

  const handleAddTeam = async (data) => {
    try {
      setLoading(true);
      setErrorMessage('');
      const formData = {
        teamName: [data.firstName, data.secondName, data.thirdName, data.surname]
          .filter(Boolean)
          .join(' ')
          .trim(),
        firstName: data.firstName,
        secondName: data.secondName,
        thirdName: data.thirdName,
        surname: data.surname,
        teamCompany: data.teamCompany,
        contactNumber: data.contactNumber,
        teamCode: data.teamCode,
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
    } finally {
      setLoading(false);
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

  // Handle view details click
  const handleViewDetailsClick = useCallback((team) => {
    setTeamToView(team);
    setOpenDetailsDialog(true);
  }, []);

  // Handle delete click (Updated to open confirmation dialog)
  const handleDeleteClick = useCallback((team) => {
    setTeamToDelete(team);
    setOpenDeleteConfirmDialog(true);
    setDeleteConfirmationName("");
  }, []);

  // Handle confirm delete
  const handleConfirmDeleteTeam = async () => {
    if (!teamToDelete) return;

    if (deleteConfirmationName !== teamToDelete.teamName) {
      alert("Team name does not match. Deletion cancelled.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.delete(`/field-teams/delete-field-team/${teamToDelete._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.status === 200) {
        alert('Team deleted successfully!');
        setUpdateState((prev) => !prev);
        setOpenDeleteConfirmDialog(false);
        setTeamToDelete(null);
        setDeleteConfirmationName("");
      } else {
        alert('Failed to delete the team.');
      }
    } catch (error) {
      alert('An error occurred while deleting the team.');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit submission
  const onEditSubmit = useCallback(async (data) => {
    setLoading(true);
    setErrorMessage('');

    const updatedData = {
      teamName: [data.firstName, data.secondName, data.thirdName, data.surname]
        .filter(Boolean)
        .join(' ')
        .trim(),
      firstName: data.firstName,
      secondName: data.secondName,
      thirdName: data.thirdName,
      surname: data.surname,
      teamCompany: data.teamCompany,
      contactNumber: data.contactNumber,
      teamCode: data.teamCode,
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

  // Handle delete evaluation
  const handleDeleteEvaluation = useCallback(async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this evaluation result? This action cannot be undone.')) return;

    try {
      const response = await api.delete(`/quiz-results/${quizId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.status === 200) {
        alert('Evaluation result deleted successfully!');
        setUpdateState((prev) => !prev);
        setEvaluationHistory(prev => prev.filter(q => q._id !== quizId));
      } else {
        alert('Failed to delete evaluation result.');
      }
    } catch (error) {
      alert('An error occurred while deleting the evaluation result.');
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
      flex: 1.5,
      headerClassName: 'dark-header',
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#7b68ee', width: 32, height: 32, fontSize: '0.875rem' }}>
            {params.value.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 500, color: '#fff' }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    ...(user.role === 'Admin' ? [
      {
        field: 'teamCode',
        headerName: 'Team ID',
        width: 130,
        headerClassName: 'dark-header',
        renderCell: (params) => <CopyMUICell value={params.value || 'N/A'} />,
      },
      {
        field: 'quizCode',
        headerName: 'Quiz Code',
        width: 130,
        headerClassName: 'dark-header',
        renderCell: (params) => <CopyMUICell value={params.value} />,
      }
    ] : []),
    {
      field: 'teamStatus',
      headerName: 'Status',
      width: 120,
      headerClassName: 'dark-header',
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        let color = '#757575'; // Default Grey
        let label = 'N/A';

        if (params.row.isTerminated) {
          color = '#d32f2f'; // Red
          label = 'Terminated';
        } else if (params.row.isSuspended) {
          color = '#ed6c02'; // Orange
          label = 'Suspended';
        } else if (params.row.isOnLeave) {
          color = '#9c27b0'; // Purple
          label = 'On Leave';
        } else if (params.row.isActive) {
          color = '#2e7d32'; // Green
          label = 'Active';
        } else {
          label = 'Inactive';
        }

        return (
          <Chip
            label={label}
            size="small"
            sx={{
              bgcolor: `${color}22`,
              color: color,
              border: `1px solid ${color}44`,
              fontWeight: 600,
              fontSize: '0.75rem',
              height: 24
            }}
          />
        );
      },
    },
    {
      field: 'canTakeQuiz',
      headerName: 'Quiz Access',
      width: 120,
      headerClassName: 'dark-header',
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip
          label={params.value ? "Allowed" : "Blocked"}
          size="small"
          icon={params.value ? <CheckCircleIcon style={{ fontSize: 14 }} /> : <CancelIcon style={{ fontSize: 14 }} />}
          sx={{
            bgcolor: params.value ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
            color: params.value ? '#4caf50' : '#f44336',
            border: params.value ? '1px solid #4caf5040' : '1px solid #f4433640',
            height: 24,
            '& .MuiChip-icon': { color: 'inherit' }
          }}
        />
      ),
    },
    {
      field: 'teamCompany',
      headerName: 'Company',
      width: 140,
      headerClassName: 'dark-header',
      renderCell: (params) => (
        <Chip
          label={params.value || 'N/A'}
          size="small"
          sx={{
            bgcolor: '#333',
            color: '#ccc',
            border: '1px solid #444',
            height: 24,
            fontSize: '0.75rem'
          }}
        />
      ),
    },
    {
      field: 'contactNumber',
      headerName: 'Contact',
      minWidth: 140,
      flex: 1,
      headerClassName: 'dark-header',
      renderCell: (params) => (
        <Stack direction="row" spacing={1} alignItems="center" height="100%">
          <PhoneIcon sx={{ fontSize: 16, color: '#666' }} />
          <Typography variant="body2" sx={{ color: '#aaa' }}>{params.value}</Typography>
        </Stack>
      ),
    },
    {
      field: 'lastEvaluation',
      headerName: 'Performance',
      minWidth: 160,
      flex: 1,
      headerClassName: 'dark-header',
      renderCell: (params) => {
        const latestEval = params.row.evaluationHistory?.[0];
        if (!latestEval) return <Typography variant="caption" sx={{ color: '#666' }}>No Data</Typography>;

        return (
          <Stack direction="column" justifyContent="center" height="100%">
            <Typography variant="body2" sx={{ fontWeight: 600, color: latestEval.percentage >= 90 ? '#4caf50' : latestEval.percentage >= 70 ? '#ff9800' : '#f44336' }}>
              {latestEval.percentage}%
            </Typography>
            <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
              {new Date(latestEval.submittedAt).toLocaleDateString()}
            </Typography>
          </Stack>
        );
      },
    },
    ...(user.role === 'Admin' ? [{
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      headerClassName: 'dark-header',
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center" height="100%">
          <Tooltip title="View History">
            <IconButton size="small" onClick={() => handleViewHistoryClick(params.row._id)} sx={{ color: '#0288d1', '&:hover': { bgcolor: '#0288d122' } }}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={params.row.canTakeQuiz ? "Block Quiz" : "Allow Quiz"}>
            <IconButton
              size="small"
              onClick={() => handleToggleQuizPermission(params.row._id, !params.row.canTakeQuiz)}
              sx={{
                color: params.row.canTakeQuiz ? '#f44336' : '#4caf50',
                '&:hover': { bgcolor: params.row.canTakeQuiz ? '#f4433622' : '#4caf5022' }
              }}
            >
              {params.row.canTakeQuiz ? <CancelIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Edit Team">
            <IconButton size="small" onClick={() => handleEditClick(params.row)} sx={{ color: '#7b68ee', '&:hover': { bgcolor: '#7b68ee22' } }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="More Actions">
            <IconButton size="small" onClick={(e) => handleMenuOpen(e, params.row)} sx={{ color: '#aaa', '&:hover': { bgcolor: '#ffffff11', color: '#fff' } }}>
              <MoreVert fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    }] : []),

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
      <Box sx={{ minHeight: '100vh', py: 3, color: '#ffffff' }}>
        {loading && <Typography>Loading...</Typography>}
        {errorMessage && <Typography color="error">{errorMessage}</Typography>}
        <AddTeamForm onAddTeam={handleAddTeam} loading={loading} errorMessage={errorMessage} user={user} />
        <Divider sx={{ my: 4, backgroundColor: '#e5e7eb' }} />
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
                backgroundColor: '#2d2d2d',
                border: '1px solid #3d3d3d',
                '&:focus-within': {
                  borderColor: '#7b68ee',
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
                      sx={{ color: '#b3b3b3', '&:hover': { color: '#ffffff' } }}
                    >
                      <MdClose className="text-xl" />
                    </IconButton>
                  ),
                }}
              />
            </Box>
            <Tooltip title="Refresh Data">
              <IconButton
                onClick={() => setUpdateState(prev => !prev)}
                disabled={loading}
                sx={{
                  color: '#7b68ee',
                  '&:hover': {
                    backgroundColor: 'rgba(123, 104, 238, 0.1)',
                  },
                  animation: loading ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
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
              backgroundColor: '#111',
              borderRadius: 1,
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #333',
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
                color: '#fff',
                bgcolor: '#111',
                '& .MuiDataGrid-main': {
                  bgcolor: '#111',
                },
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: '#1a1a1a',
                  color: '#aaa',
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  borderBottom: '1px solid #333',
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  fontWeight: 600,
                  color: '#ddd'
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #222',
                  display: 'flex',
                  alignItems: 'center',
                  '&:focus': {
                    outline: 'none',
                  },
                },
                '& .MuiDataGrid-row': {
                  bgcolor: '#111',
                  '&:hover': {
                    bgcolor: '#1a1a1a',
                  },
                  '&.Mui-selected': {
                    bgcolor: 'rgba(123, 104, 238, 0.08)',
                    '&:hover': {
                      bgcolor: 'rgba(123, 104, 238, 0.12)',
                    },
                  },
                },
                '& .MuiDataGrid-footerContainer': {
                  bgcolor: '#1a1a1a',
                  borderTop: '1px solid #333',
                  '& .MuiTablePagination-root': {
                    color: '#aaa',
                  },
                  '& .MuiTablePagination-selectIcon': {
                    color: '#aaa',
                  },
                  '& .MuiIconButton-root': {
                    color: '#aaa',
                    '&.Mui-disabled': {
                      color: '#444',
                    },
                  },
                },
                '& .MuiCheckbox-root': {
                  color: '#555',
                  '&.Mui-checked': {
                    color: '#7b68ee',
                  }
                },
                '& .MuiDataGrid-virtualScroller': {
                  '&::-webkit-scrollbar': {
                    width: '6px',
                    height: '6px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#333',
                    borderRadius: '3px',
                    '&:hover': {
                      backgroundColor: '#555'
                    }
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: '#111',
                  },
                }
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
        {/* Evaluation History Dialog */}
        <Dialog
          open={openHistoryDialog}
          onClose={() => setOpenHistoryDialog(false)}
          fullScreen={isMobile}
          fullWidth
          maxWidth="md"
          sx={{
            "& .MuiDialog-paper": {
              backgroundColor: '#000',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              borderRadius: isMobile ? 0 : 3,
              border: isMobile ? 'none' : '1px solid #333',
              width: isMobile ? '100%' : '70%',
            },
            "& .MuiBackdrop-root": { bgcolor: 'rgba(0,0,0,0.8)' }
          }}
        >
          <DialogTitle sx={{
            bgcolor: '#111',
            borderBottom: '1px solid #333',
            color: '#fff',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <HistoryIcon sx={{ color: '#0288d1' }} /> Evaluation History
          </DialogTitle>
          <DialogContent sx={{ bgcolor: '#000', color: '#fff', p: 3 }}>
            {evaluationHistory.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5, color: '#666' }}>
                <HistoryIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                <Typography>No evaluation history found</Typography>
              </Box>
            ) : (
              <Stack spacing={2} sx={{ mt: 1 }}>
                {evaluationHistory.map((evalItem, index) => (
                  <Box key={evalItem._id} sx={{
                    bgcolor: '#111',
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid #222',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2" sx={{ color: '#7b68ee', fontWeight: 'bold' }}>
                        Attempt #{evaluationHistory.length - index}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#666' }}>
                        {new Date(evalItem.submittedAt).toLocaleString()}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{
                        width: 50, height: 50, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: evalItem.percentage >= 90 ? 'rgba(76, 175, 80, 0.1)' : evalItem.percentage >= 70 ? 'rgba(255, 152, 0, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                        border: evalItem.percentage >= 90 ? '1px solid #4caf50' : evalItem.percentage >= 70 ? '1px solid #ff9800' : '1px solid #f44336'
                      }}>
                        <Typography sx={{ fontWeight: 'bold', color: evalItem.percentage >= 90 ? '#4caf50' : evalItem.percentage >= 70 ? '#ff9800' : '#f44336' }}>
                          {evalItem.percentage}%
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ color: '#ccc' }}>
                          Score: {evalItem.score}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#888' }}>
                          Quiz Code: <span style={{ fontFamily: 'monospace', color: '#fff' }}>{evalItem.quizCode}</span>
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteEvaluation(evalItem._id)}
                        sx={{ textTransform: 'none' }}
                      >
                        Delete Result
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ bgcolor: '#111', borderTop: '1px solid #333', p: 2 }}>
            <Button onClick={() => setOpenHistoryDialog(false)} sx={{ color: '#fff' }}>Close</Button>
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
              backgroundColor: '#000',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              borderRadius: isMobile ? 0 : 3,
              border: isMobile ? 'none' : '1px solid #333',
              width: isMobile ? '100%' : '70%',
            },
            "& .MuiBackdrop-root": { bgcolor: 'rgba(0,0,0,0.8)' }
          }}
        >
          <DialogTitle sx={{
            bgcolor: '#111',
            borderBottom: '1px solid #333',
            color: '#fff',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <HistoryIcon sx={{ color: '#7b68ee' }} /> State Logs
          </DialogTitle>
          <DialogContent sx={{ bgcolor: '#000', color: '#fff', p: 3 }}>
            {selectedLogs.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5, color: '#666' }}>
                <HistoryIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                <Typography>No activities recorded</Typography>
              </Box>
            ) : (
              <Stack spacing={2} sx={{ mt: 1 }}>
                {selectedLogs.map((log, index) => (
                  <Box key={log._id?.$oid || index} sx={{
                    position: 'relative',
                    pl: 3,
                    '&:before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 4,
                      bgcolor: log.state === 'Active' ? '#4caf50' : log.state === 'Suspended' ? '#ed6c02' : log.state === 'Terminated' ? '#d32f2f' : '#9c27b0',
                      borderRadius: 2
                    },
                    bgcolor: '#111',
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid #222'
                  }}>
                    <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 'bold', mb: 0.5 }}>
                      {log.state}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#aaa', mb: 1 }}>
                      {new Date(log.changedAt).toLocaleString()}
                    </Typography>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, fontSize: '0.8rem', color: '#888' }}>
                      <Box>
                        Reason: <span style={{ color: '#ddd' }}>{log.reason || 'N/A'}</span>
                      </Box>
                      {log.duration && (
                        <Box>Duration: <span style={{ color: '#ddd' }}>{log.duration}</span></Box>
                      )}
                      {log.startDate && (
                        <Box>Start: <span style={{ color: '#ddd' }}>{new Date(log.startDate).toLocaleDateString()}</span></Box>
                      )}
                      {log.endDate && (
                        <Box>End: <span style={{ color: '#ddd' }}>{new Date(log.endDate).toLocaleDateString()}</span></Box>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ bgcolor: '#111', borderTop: '1px solid #333', p: 2 }}>
            <Button onClick={handleCloseLogsDialog} sx={{ color: '#fff' }}>Close</Button>
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
              backgroundColor: '#000',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              borderRadius: isMobile ? 0 : 3,
              border: isMobile ? 'none' : '1px solid #333',
              width: isMobile ? '100%' : '70%',
            },
            "& .MuiBackdrop-root": { bgcolor: 'rgba(0,0,0,0.8)' }
          }}
        >
          <DialogTitle sx={{
            bgcolor: '#111',
            borderBottom: '1px solid #333',
            color: '#fff',
            fontWeight: 600,
          }}>
            Mark Team as On Leave
          </DialogTitle>
          <DialogContent sx={{ bgcolor: '#000', color: '#fff', p: 3 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Leave Reason"
                fullWidth
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#1a1a1a',
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#0288d1' },
                    '&.Mui-focused fieldset': { borderColor: '#0288d1' },
                    '& input': { color: '#fff' }
                  },
                  '& .MuiInputLabel-root': { color: '#888' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#0288d1' }
                }}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  label="Start Date"
                  type="date"
                  fullWidth
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#1a1a1a',
                      '& fieldset': { borderColor: '#333' },
                      '&:hover fieldset': { borderColor: '#0288d1' },
                      '&.Mui-focused fieldset': { borderColor: '#0288d1' },
                      '& input': { color: '#fff' }
                    },
                    '& .MuiInputLabel-root': { color: '#888' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#0288d1' }
                  }}
                />
                <TextField
                  label="End Date"
                  type="date"
                  fullWidth
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#1a1a1a',
                      '& fieldset': { borderColor: '#333' },
                      '&:hover fieldset': { borderColor: '#0288d1' },
                      '&.Mui-focused fieldset': { borderColor: '#0288d1' },
                      '& input': { color: '#fff' }
                    },
                    '& .MuiInputLabel-root': { color: '#888' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#0288d1' }
                  }}
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ bgcolor: '#111', borderTop: '1px solid #333', p: 2 }}>
            <Button onClick={() => setOpenOnLeaveDialog(false)} sx={{ color: '#fff' }}>Cancel</Button>
            <Button onClick={handleConfirmOnLeave} variant="contained" sx={{ bgcolor: '#0288d1', '&:hover': { bgcolor: '#0277bd' } }}>
              Confirm Leave
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
              backgroundColor: '#000',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              borderRadius: isMobile ? 0 : 3,
              border: isMobile ? 'none' : '1px solid #333',
              width: isMobile ? '100%' : '70%',
            },
            "& .MuiBackdrop-root": { bgcolor: 'rgba(0,0,0,0.8)' }
          }}
        >
          <DialogTitle sx={{
            bgcolor: '#111',
            borderBottom: '1px solid #333',
            color: '#fff',
            fontWeight: 600,
          }}>
            Mark Team as Resigned
          </DialogTitle>
          <DialogContent sx={{ bgcolor: '#000', color: '#fff', p: 3 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Resignation Reason"
                fullWidth
                value={resignationReason}
                onChange={(e) => setResignationReason(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#1a1a1a',
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#9c27b0' },
                    '&.Mui-focused fieldset': { borderColor: '#9c27b0' },
                    '& input': { color: '#fff' }
                  },
                  '& .MuiInputLabel-root': { color: '#888' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#9c27b0' }
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ bgcolor: '#111', borderTop: '1px solid #333', p: 2 }}>
            <Button onClick={() => setOpenResignedDialog(false)} sx={{ color: '#fff' }}>Cancel</Button>
            <Button onClick={handleConfirmResigned} variant="contained" sx={{ bgcolor: '#9c27b0', '&:hover': { bgcolor: '#7b1fa2' } }}>
              Confirm Resignation
            </Button>
          </DialogActions>
        </Dialog>

        {/* More Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              bgcolor: '#1a1a1a',
              color: '#fff',
              border: '1px solid #333',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
              minWidth: 180,
              '& .MuiMenuItem-root': {
                fontSize: '0.875rem',
                py: 1,
                px: 2,
                '&:hover': { bgcolor: '#333' }
              },
              '& .MuiListItemIcon-root': {
                minWidth: 32,
                color: '#aaa'
              }
            }
          }}
        >
          {menuTeam?.isSuspended && (
            <MenuItem onClick={() => { handleReactivateClick(menuTeam._id); handleMenuClose(); }}>
              <ListItemIcon><PlayCircleOutlineIcon fontSize="small" sx={{ color: '#4caf50' }} /></ListItemIcon>
              Reactivate
            </MenuItem>
          )}

          {!menuTeam?.isSuspended && !menuTeam?.isTerminated && !menuTeam?.isResigned && (
            <MenuItem onClick={() => { handleSuspendClick(menuTeam._id); handleMenuClose(); }}>
              <ListItemIcon><PauseCircleOutlineIcon fontSize="small" sx={{ color: '#ed6c02' }} /></ListItemIcon>
              Suspend
            </MenuItem>
          )}

          {!menuTeam?.isTerminated && (
            <MenuItem onClick={() => { handleTerminateClick(menuTeam._id); handleMenuClose(); }}>
              <ListItemIcon><BlockIcon fontSize="small" sx={{ color: '#d32f2f' }} /></ListItemIcon>
              Terminate
            </MenuItem>
          )}

          {!menuTeam?.isOnLeave && !menuTeam?.isTerminated && !menuTeam?.isResigned && (
            <MenuItem onClick={() => { handleOnLeaveClick(menuTeam._id); handleMenuClose(); }}>
              <ListItemIcon><BeachAccessIcon fontSize="small" sx={{ color: '#0288d1' }} /></ListItemIcon>
              On Leave
            </MenuItem>
          )}

          {!menuTeam?.isResigned && !menuTeam?.isTerminated && (
            <MenuItem onClick={() => { handleResignedClick(menuTeam._id); handleMenuClose(); }}>
              <ListItemIcon><FaSignOutAlt fontSize="small" color="#9c27b0" /></ListItemIcon>
              Resigned
            </MenuItem>
          )}

          <Divider sx={{ borderColor: '#333', my: 0.5 }} />

          <MenuItem onClick={() => { handleViewDetailsClick(menuTeam); handleMenuClose(); }}>
            <ListItemIcon><Visibility fontSize="small" sx={{ color: '#7b68ee' }} /></ListItemIcon>
            View Full Details
          </MenuItem>

          <MenuItem onClick={() => { handleViewLogsClick(menuTeam._id); handleMenuClose(); }}>
            <ListItemIcon><HistoryIcon fontSize="small" sx={{ color: '#aaa' }} /></ListItemIcon>
            View State Logs
          </MenuItem>

          {user.role === 'Admin' && (
            <>
              <Divider sx={{ borderColor: '#333', my: 0.5 }} />
              <MenuItem onClick={() => { handleDeleteClick(menuTeam); handleMenuClose(); }} sx={{ color: '#f44336' }}>
                <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: '#f44336' }} /></ListItemIcon>
                Delete Team permanently
              </MenuItem>
            </>
          )}
        </Menu>

        {/* View Details Dialog */}
        <FieldTeamDetailsDialog
          open={openDetailsDialog}
          onClose={() => setOpenDetailsDialog(false)}
          team={teamToView}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={openDeleteConfirmDialog}
          onClose={() => setOpenDeleteConfirmDialog(false)}
          PaperProps={{
            sx: {
              bgcolor: '#111',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: 2
            }
          }}
        >
          <DialogTitle sx={{ borderBottom: '1px solid #222', p: 2 }}>Confirm Deletion</DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <DialogContentText sx={{ color: '#aaa', mb: 2 }}>
              Are you sure you want to delete <strong>{teamToDelete?.teamName}</strong>? This action is permanent and cannot be undone.
            </DialogContentText>
            <DialogContentText sx={{ color: '#666', mb: 2, fontSize: '0.875rem' }}>
              To confirm, please type the team name exactly as shown above.
            </DialogContentText>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Type team name here"
              value={deleteConfirmationName}
              onChange={(e) => setDeleteConfirmationName(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1a1a1a',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#f44336' },
                  '&.Mui-focused fieldset': { borderColor: '#f44336' },
                  '& input': { color: '#fff' }
                }
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: '1px solid #222' }}>
            <Button onClick={() => setOpenDeleteConfirmDialog(false)} sx={{ color: '#888' }}>Cancel</Button>
            <Button
              onClick={handleConfirmDeleteTeam}
              variant="contained"
              disabled={deleteConfirmationName !== teamToDelete?.teamName}
              sx={{
                bgcolor: '#f44336',
                '&:hover': { bgcolor: '#d32f2f' },
                '&.Mui-disabled': { bgcolor: '#222', color: '#444' }
              }}
            >
              Confirm Permanent Deletion
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </Box>
  );
};

export default FieldTeamForm;