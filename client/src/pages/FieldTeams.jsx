import { useEffect, useState, useMemo, useCallback } from 'react';
import { Box, TextField, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Tooltip, Typography, IconButton, useMediaQuery, Chip, Menu, MenuItem, ListItemIcon, Checkbox, FormControlLabel, Tabs, Tab, Paper } from '@mui/material';
import { Delete as DeleteIcon, PauseCircleOutline as PauseCircleOutlineIcon, Block as BlockIcon, PlayCircleOutline as PlayCircleOutlineIcon, BeachAccess as BeachAccessIcon, History as HistoryIcon, Refresh as RefreshIcon, Visibility, Gavel as GavelIcon, AddCircleOutline as AddCircleOutlineIcon } from '@mui/icons-material';
import XLSX from 'xlsx-js-style';
import { useSelector } from 'react-redux';
import { FaSignOutAlt } from 'react-icons/fa';
import { SuspendTeamDialog } from '../components/SuspendTeamDialog';
import { TerminateTeamDialog } from '../components/TerminateTeamDialog';
import { ReactivateTeamDialog } from '../components/ReactivateTeamDialog';
import EditTeamDialog from '../components/EditTeamDialog';
import AddTeamForm from '../components/AddTeamForm';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import FilterChip from '../components/ui/FilterChip';
import ErrorState from '../components/ui/ErrorState';
import PageLoader from '../components/ui/PageLoader';
import TeamsTable from './fieldTeams/TeamsTable';
import TeamSheet from './fieldTeams/TeamSheet';
import { TEAM_STATUSES, teamStatusOf } from './fieldTeams/teamUtils';
import InputBase from '@mui/material/InputBase';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import FilterAltOffOutlined from '@mui/icons-material/FilterAltOffOutlined';
import FieldTeamDetailsDialog from '../components/FieldTeamDetailsDialog';
import api from '../api/api';
import { DialogContentText } from '@mui/material';

const FieldTeamForm = () => {
  const user = useSelector((state) => state?.auth?.user);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [teams, setTeams] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
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
  const [leaveUseToday, setLeaveUseToday] = useState(false);
  const [resignationReason, setResignationReason] = useState('');

  // NEW: State for View Details and Delete Confirmation
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [teamToView, setTeamToView] = useState(null);
  const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");

  // Dynamic Analysis Period State
  const [escalationPeriod, setEscalationPeriod] = useState('Cumulative');
  const [customStartDate, setCustomStartDate] = useState('2026-06-01');
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Escalation Management Dialog State
  const [openEscalationDialog, setOpenEscalationDialog] = useState(false);
  const [escDialogTab, setEscDialogTab] = useState(0);
  const [escalationTeam, setEscalationTeam] = useState(null);
  const [escOffenseScale, setEscOffenseScale] = useState('1st Offense');
  const [escAction, setEscAction] = useState('');
  const [escStatus, setEscStatus] = useState('Pending');
  const [escNotes, setEscNotes] = useState('');
  const [escDate, setEscDate] = useState('');
  const [escPeriodTag, setEscPeriodTag] = useState('');

  const activeDateRange = useMemo(() => {
    if (escalationPeriod === 'jun_2026') {
      return { start: new Date('2026-06-01T00:00:00'), end: new Date('2026-06-30T23:59:59'), label: 'June 2026' };
    }
    if (escalationPeriod === 'jul_2026') {
      return { start: new Date('2026-07-01T00:00:00'), end: new Date('2026-07-31T23:59:59'), label: 'July 2026' };
    }
    if (escalationPeriod === 'aug_2026') {
      return { start: new Date('2026-08-01T00:00:00'), end: new Date('2026-08-31T23:59:59'), label: 'August 2026' };
    }
    if (escalationPeriod === 'custom') {
      const s = customStartDate ? new Date(`${customStartDate}T00:00:00`) : new Date('2026-06-01T00:00:00');
      const e = customEndDate ? new Date(`${customEndDate}T23:59:59`) : new Date();
      return { start: s, end: e, label: `${customStartDate} to ${customEndDate}` };
    }
    return { start: new Date('2026-06-01T00:00:00'), end: new Date(), label: 'Cumulative (From 01/06/2026)' };
  }, [escalationPeriod, customStartDate, customEndDate]);

  const getEscalationConsequence = (accDet, accNeu) => {
    const points = accDet + Math.floor(accNeu / 2);
    if (points === 0) {
      if (accNeu === 1) return { level: 0, text: 'No Consequence (1 Neutral)', color: '#10b981', points };
      return { level: 0, text: 'Compliant (0 Violation)', color: '#10b981', points };
    }
    if (points === 1) return { level: 1, text: '1st Offense: Verbal Warning', color: '#f59e0b', points };
    if (points === 2) return { level: 2, text: '1st Offense (Repeated): Mandatory Training (3 Hours)', color: '#ea580c', points };
    if (points === 3) return { level: 3, text: '2nd Offense: First Formal Warning', color: '#ef4444', points };
    if (points === 4) return { level: 4, text: '3rd Offense: Second Formal Warning + Deduction', color: '#dc2626', points };
    if (points === 5) return { level: 5, text: '4th Offense: Third Formal Warning + Deduction 1 Week Suspension', color: '#991b1b', points };
    return { level: 6, text: '5th Offense & Beyond: 1 Month Suspension (Next = Termination)', color: '#7f1d1d', points };
  };

  const teamMetricsMap = useMemo(() => {
    const map = {};
    const { start, end } = activeDateRange;

    const filteredTasks = (allTasks || []).filter(task => {
      const rawDate = task.interviewDate || task.pisDate || task.createdAt || task.closeDate || task.contractDate;
      if (!rawDate) return false;
      const tDate = new Date(rawDate);
      if (Number.isNaN(tDate.getTime())) return false;
      return tDate >= start && tDate <= end;
    });

    teams.forEach(team => {
      const normT = (team.teamName || '').trim().toLowerCase();
      const teamIdStr = team._id ? team._id.toString() : '';

      const matchedTasks = filteredTasks.filter(task => {
        const taskT = (task.teamName || '').trim().toLowerCase();
        const taskTeamId = task.teamId?._id?.toString() || task.teamId?.toString() || '';
        return (taskT && taskT === normT) || (taskTeamId && taskTeamId === teamIdStr);
      });

      const accDet = matchedTasks.filter(t => {
        const score = t.evaluationScore;
        if (score === null || score === 'N/A' || score === undefined || score === '') return false;
        const normalized = Number(score) <= 10 ? Number(score) * 10 : Number(score);
        return normalized >= 0 && normalized <= 60 && t.teamAccountability?.includes('Yes');
      }).length;

      const accNeu = matchedTasks.filter(t => {
        const score = t.evaluationScore;
        if (score === null || score === 'N/A' || score === undefined || score === '') return false;
        const normalized = Number(score) <= 10 ? Number(score) * 10 : Number(score);
        return normalized > 60 && normalized <= 80 && t.teamAccountability?.includes('Yes');
      }).length;

      const consequenceObj = getEscalationConsequence(accDet, accNeu);

      map[team._id] = {
        accDet,
        accNeu,
        points: consequenceObj.points,
        requiredConsequence: consequenceObj.text,
        consequenceLevel: consequenceObj.level,
        consequenceColor: consequenceObj.color,
        totalTasks: matchedTasks.length
      };
    });

    return map;
  }, [teams, allTasks, activeDateRange]);

  const handleOpenEscalationDialog = (team, defaultTab = 0) => {
    setEscalationTeam(team);
    setEscDialogTab(defaultTab);
    setEscAction(team?.escalationAction || '');
    setEscStatus(team?.escalationStatus || 'Pending');
    setEscNotes(team?.escalationNotes || '');
    setEscDate(team?.escalationDate ? new Date(team.escalationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setEscPeriodTag(activeDateRange.label);

    const metrics = teamMetricsMap[team?._id];
    if (metrics && metrics.consequenceLevel > 0) {
      if (metrics.consequenceLevel === 1) setEscOffenseScale('1st Offense');
      else if (metrics.consequenceLevel === 2) setEscOffenseScale('1st Offense (Repeated)');
      else if (metrics.consequenceLevel === 3) setEscOffenseScale('2nd Offense');
      else if (metrics.consequenceLevel === 4) setEscOffenseScale('3rd Offense');
      else if (metrics.consequenceLevel === 5) setEscOffenseScale('4th Offense');
      else if (metrics.consequenceLevel >= 6) setEscOffenseScale('5th Offense & Beyond');
    } else {
      setEscOffenseScale('1st Offense');
    }

    setOpenEscalationDialog(true);
  };

  const handleSaveEscalation = async () => {
    if (!escalationTeam) return;
    try {
      setLoading(true);
      const newEntry = {
        offenseScale: escOffenseScale || 'Warning',
        action: escAction || 'Action Taken',
        status: escStatus || 'Pending',
        actionDate: escDate ? new Date(escDate) : new Date(),
        period: escPeriodTag || activeDateRange.label,
        notes: escNotes || '',
        createdAt: new Date(),
      };

      const existingHistory = Array.isArray(escalationTeam.escalationHistory) ? [...escalationTeam.escalationHistory] : [];
      const updatedHistory = [newEntry, ...existingHistory];

      const response = await api.put(`/field-teams/update-field-team/${escalationTeam._id}`, {
        escalationAction: escAction,
        escalationStatus: escStatus,
        escalationNotes: escNotes,
        escalationDate: escDate || null,
        escalationHistory: updatedHistory,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      if (response.status === 200) {
        alert('Escalation Warning recorded and added to history successfully!');
        setUpdateState(prev => !prev);
        setOpenEscalationDialog(false);
      } else {
        alert(response.data?.error || 'Failed to update escalation.');
      }
    } catch (err) {
      alert('Error updating escalation: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEscalationHistoryItem = async (indexToDelete) => {
    if (!escalationTeam) return;
    if (!window.confirm('Are you sure you want to delete this warning record from history?')) return;
    try {
      setLoading(true);
      const updatedHistory = (escalationTeam.escalationHistory || []).filter((_, idx) => idx !== indexToDelete);
      const latest = updatedHistory[0] || null;

      const response = await api.put(`/field-teams/update-field-team/${escalationTeam._id}`, {
        escalationAction: latest ? latest.action : '',
        escalationStatus: latest ? latest.status : 'Pending',
        escalationDate: latest ? latest.actionDate : null,
        escalationNotes: latest ? latest.notes : '',
        escalationHistory: updatedHistory,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      if (response.status === 200) {
        setEscalationTeam(prev => ({ ...prev, escalationHistory: updatedHistory }));
        setUpdateState(prev => !prev);
      }
    } catch (err) {
      alert('Error deleting history record: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

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
        isNewToInstallation: data.isNewToInstallation,
        isNewToActivation: data.isNewToActivation,
        installationStartDate: data.installationStartDate,
        activationStartDate: data.activationStartDate,
        replaceExisting: Boolean(data.replaceExisting),
      };

      const response = await api.post('/field-teams/add-field-team', formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.status === 201) {
        alert('Team information submitted successfully!');
        setUpdateState((prev) => !prev);
        return true; // Success
      } else {
        setErrorMessage(response.data.error || 'There was an error submitting the information.');
        return false; // Failure
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'There was an error submitting the information.';
      setErrorMessage(errorMsg);
      return false; // Failure
    } finally {
      setLoading(false);
    }
  };

  // Fetch teams, evaluations, and tasks
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

        // Fetch Tasks for dynamic escalation calculation
        try {
          const tasksResponse = await api.get('/tasks/get-all-tasks', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });
          if (tasksResponse.status === 200) {
            setAllTasks(tasksResponse.data.tasks || tasksResponse.data || []);
          }
        } catch (taskErr) {
          console.warn('Could not load all tasks for escalation matrix:', taskErr);
        }

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
      isNewToInstallation: data.isNewToInstallation,
      isNewToActivation: data.isNewToActivation,
      installationStartDate: data.installationStartDate,
      activationStartDate: data.activationStartDate,
      forceRegenerateQuizCode: data.forceRegenerateQuizCode,
      escalationAction: data.escalationAction,
      escalationStatus: data.escalationStatus,
      escalationNotes: data.escalationNotes,
      escalationDate: data.escalationDate || null,
    };

    console.log("Submitting team update:", updatedData);
    try {
      const response = await api.put(`/field-teams/update-field-team/${editTeam._id}`, updatedData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.status === 200) {
        let tasksUpdatedCount = 0;
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
          tasksUpdatedCount = updateTasksResponse.data.updatedCount;
        } catch (taskError) {
          console.error("Error updating related tasks:", taskError);
        }

        alert('Team information updated successfully!' +
          (tasksUpdatedCount > 0
            ? ` ${tasksUpdatedCount} related tasks were also updated.`
            : ' No related tasks needed updating.')
        );

        setUpdateState((prev) => !prev);
        setOpenEditDialog(false);
      } else {
        setErrorMessage(response.data.message || response.data.error || 'There was an error updating the information.');
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.response?.data?.error || 'There was an error updating the information.');
    } finally {
      setLoading(false);
    }
  }, [editTeam]);

  // Handle export to Excel
  // Handle export to Excel
  const handleExportToExcel = useCallback(() => {
    // 1. Calculate Stats
    const total = teams.length;
    let active = 0, terminated = 0, resigned = 0, suspended = 0, onLeave = 0, otherInactive = 0;
    teams.forEach(team => {
      if (team.isTerminated) terminated++;
      else if (team.isResigned) resigned++;
      else if (team.isSuspended) suspended++;
      else if (team.isOnLeave) onLeave++;
      else if (team.isActive === false) otherInactive++;
      else active++;
    });
    const inactive = terminated + resigned + suspended + onLeave + otherInactive;

    // Helper functions for styling
    const applyHeaderStyle = (ws, range, bg = "1F2937", color = "FFFFFF") => {
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) continue;
          ws[cellAddress].s = {
            font: { bold: true, color: { rgb: color } },
            fill: { fgColor: { rgb: bg } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          };
        }
      }
    };

    const applyDataRowStyle = (ws, range) => {
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) continue;
          ws[cellAddress].s = {
            alignment: { vertical: "center" },
            border: { bottom: { style: "thin", color: { rgb: "E5E7EB" } } }
          };
        }
      }
    };

    const fixSheetRange = (ws) => {
      let maxR = 0;
      let maxC = 0;
      Object.keys(ws).forEach(key => {
        if (key.startsWith('!')) return;
        try {
          const cell = XLSX.utils.decode_cell(key);
          if (cell.r > maxR) maxR = cell.r;
          if (cell.c > maxC) maxC = cell.c;
        } catch (e) {
          // ignore
        }
      });
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
    };

    const sheetData = [];

    // Title Row
    sheetData.push([`Field Teams Report & Escalation Analysis (${activeDateRange.label})`]);
    sheetData.push([]);

    // Stats Rows
    sheetData.push(["Total Teams", total, "", "Terminated", terminated]);
    sheetData.push(["Active", active, "", "Resigned", resigned]);
    sheetData.push(["Inactive", inactive, "", "Suspended", suspended]);
    sheetData.push(["", "", "", "On Leave", onLeave]);
    sheetData.push([]);

    // Table Headers (Including Escalation Matrix Columns)
    const headers = [
      "Team Name", "Team ID (4-digit)", "Quiz Code", "Status", "Quiz Access",
      "Company", "Contact Number", "Performance (%)",
      "Required Escalation (Matrix)", "Acc. Detractors", "Acc. Neutrals", "Total Acc. Issues", "Matrix Units (Pts)",
      "Latest Action Taken", "Action Date", "Escalation Status", "Warnings in History",
      "New To Installation", "Installation Start",
      "New To Activation", "Activation Start",
      "FSM Serial", "Laptop Serial",
      "State Logs"
    ];
    sheetData.push(headers);

    // Table Data
    teams.forEach(team => {
      const latestEval = team.evaluationHistory?.[0];
      const performance = latestEval ? `${latestEval.percentage}%` : 'No Data';
      const metrics = teamMetricsMap[team._id] || {};

      let status = 'Inactive';
      if (team.isTerminated) status = 'Terminated';
      else if (team.isResigned) status = 'Resigned';
      else if (team.isSuspended) status = 'Suspended';
      else if (team.isOnLeave) status = 'On Leave';
      else if (team.isActive !== false) status = 'Active';

      const quizAccess = team.canTakeQuiz ? 'Allowed' : 'Blocked';

      sheetData.push([
        team.teamName || 'N/A',
        team.teamCode || 'N/A',
        team.quizCode || 'N/A',
        status,
        quizAccess,
        team.teamCompany || 'N/A',
        team.contactNumber || 'N/A',
        performance,
        metrics.requiredConsequence || 'Compliant (0 Violation)',
        metrics.accDet || 0,
        metrics.accNeu || 0,
        (metrics.accDet || 0) + (metrics.accNeu || 0),
        metrics.points || 0,
        team.escalationAction || 'None Assigned',
        team.escalationDate ? new Date(team.escalationDate).toLocaleDateString() : '-',
        team.escalationStatus || (metrics.points > 0 ? 'Pending' : 'Compliant'),
        (team.escalationHistory || []).length,
        team.isNewToInstallation ? 'Yes' : 'No',
        team.installationStartDate ? new Date(team.installationStartDate).toLocaleDateString() : 'N/A',
        team.isNewToActivation ? 'Yes' : 'No',
        team.activationStartDate ? new Date(team.activationStartDate).toLocaleDateString() : 'N/A',
        team.fsmSerialNumber || 'N/A',
        team.laptopSerialNumber || 'N/A',
        team.stateLogs ? team.stateLogs.map(log => `${log.state} (${new Date(log.changedAt).toLocaleDateString()})`).join(' | ') : ''
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // --- Styling Sheet 1 ---
    worksheet['A1'].s = {
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4F46E5" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
    if (!worksheet['!merges']) worksheet['!merges'] = [];
    worksheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } });

    // Stats styling
    const statHeaderStyle = { font: { bold: true, color: { rgb: "333333" } }, fill: { fgColor: { rgb: "E5E7EB" } } };
    const statValueStyle = { font: { bold: true, color: { rgb: "1F2937" } }, alignment: { horizontal: "center" } };

    [2, 3, 4, 5].forEach(r => {
      if (worksheet[XLSX.utils.encode_cell({ r, c: 0 })]) worksheet[XLSX.utils.encode_cell({ r, c: 0 })].s = statHeaderStyle;
      if (worksheet[XLSX.utils.encode_cell({ r, c: 1 })]) worksheet[XLSX.utils.encode_cell({ r, c: 1 })].s = statValueStyle;
      if (worksheet[XLSX.utils.encode_cell({ r, c: 3 })]) worksheet[XLSX.utils.encode_cell({ r, c: 3 })].s = statHeaderStyle;
      if (worksheet[XLSX.utils.encode_cell({ r, c: 4 })]) worksheet[XLSX.utils.encode_cell({ r, c: 4 })].s = statValueStyle;
    });

    // Table Header Styling
    const tableHeaderStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1F2937" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    const headerRow = 7;
    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: headerRow, c });
      if (worksheet[cellRef]) worksheet[cellRef].s = tableHeaderStyle;
    }

    // Data Row Styling
    const dataRowStyle = {
      alignment: { vertical: "center" },
      border: { bottom: { style: "thin", color: { rgb: "E5E7EB" } } }
    };

    const activeStyle = { ...dataRowStyle, font: { color: { rgb: "059669" }, bold: true } };
    const inactiveStyle = { ...dataRowStyle, font: { color: { rgb: "DC2626" }, bold: true } };
    const suspendedStyle = { ...dataRowStyle, font: { color: { rgb: "D97706" }, bold: true } };
    const onLeaveStyle = { ...dataRowStyle, font: { color: { rgb: "7C3AED" }, bold: true } };
    const resignedStyle = { ...dataRowStyle, font: { color: { rgb: "DC2626" }, bold: true } };

    for (let r = headerRow + 1; r < sheetData.length; r++) {
      const statusCellRef = XLSX.utils.encode_cell({ r, c: 3 });
      const statusValue = worksheet[statusCellRef]?.v;

      for (let c = 0; c < headers.length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (worksheet[cellRef]) {
          if (c === 3) {
            if (statusValue === 'Active') worksheet[cellRef].s = activeStyle;
            else if (statusValue === 'Suspended') worksheet[cellRef].s = suspendedStyle;
            else if (statusValue === 'On Leave') worksheet[cellRef].s = onLeaveStyle;
            else if (statusValue === 'Resigned' || statusValue === 'Terminated') worksheet[cellRef].s = resignedStyle;
            else worksheet[cellRef].s = inactiveStyle;
          } else if (c === 8) {
            // Required Escalation
            const val = String(worksheet[cellRef]?.v || '');
            const isCompliant = val.includes('Compliant') || val.includes('No Violation');
            worksheet[cellRef].s = {
              ...dataRowStyle,
              font: { bold: true, color: { rgb: isCompliant ? "047857" : "581C87" } },
              fill: { fgColor: { rgb: isCompliant ? "ECFDF5" : "FAF5FF" } }
            };
          } else if (c === 9 || c === 11 || c === 12) {
            // Detractors & points
            const num = Number(worksheet[cellRef]?.v) || 0;
            worksheet[cellRef].s = {
              ...dataRowStyle,
              alignment: { horizontal: "center", vertical: "center" },
              font: { bold: num > 0, color: { rgb: num > 0 ? "B91C1C" : "1E293B" } },
              fill: { fgColor: { rgb: num > 0 ? "FEF2F2" : "FFFFFF" } }
            };
          } else if (c === 10) {
            // Neutrals
            const num = Number(worksheet[cellRef]?.v) || 0;
            worksheet[cellRef].s = {
              ...dataRowStyle,
              alignment: { horizontal: "center", vertical: "center" },
              font: { bold: num > 0, color: { rgb: num > 0 ? "D97706" : "1E293B" } },
              fill: { fgColor: { rgb: num > 0 ? "FFFBEB" : "FFFFFF" } }
            };
          } else if (c === 16) {
            // Warnings count
            const num = Number(worksheet[cellRef]?.v) || 0;
            worksheet[cellRef].s = {
              ...dataRowStyle,
              alignment: { horizontal: "center", vertical: "center" },
              font: { bold: num > 0, color: { rgb: num > 0 ? "BE123C" : "64748B" } },
              fill: { fgColor: { rgb: num > 0 ? "FFF1F2" : "FFFFFF" } }
            };
          } else {
            worksheet[cellRef].s = dataRowStyle;
          }
        }
      }
    }

    // Set Column Widths for Sheet 1
    worksheet['!cols'] = [
      { wch: 30 }, // Team Name
      { wch: 18 }, // Team ID
      { wch: 15 }, // Quiz Code
      { wch: 15 }, // Status
      { wch: 15 }, // Quiz Access
      { wch: 20 }, // Company
      { wch: 18 }, // Contact Number
      { wch: 18 }, // Performance
      { wch: 46 }, // Required Escalation (Matrix)
      { wch: 16 }, // Acc. Detractors
      { wch: 16 }, // Acc. Neutrals
      { wch: 18 }, // Total Acc. Issues
      { wch: 18 }, // Matrix Units (Pts)
      { wch: 28 }, // Latest Action Taken
      { wch: 15 }, // Action Date
      { wch: 18 }, // Escalation Status
      { wch: 18 }, // Warnings in History
      { wch: 20 }, // New To Installation
      { wch: 20 }, // Installation Start
      { wch: 20 }, // New To Activation
      { wch: 20 }, // Activation Start
      { wch: 20 }, // FSM Serial
      { wch: 20 }, // Laptop Serial
      { wch: 40 }, // State Logs
    ];
    fixSheetRange(worksheet);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Field Teams Overview');
    XLSX.writeFile(workbook, `Field_Teams_Report_${activeDateRange.label.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  }, [teams, allTasks, activeDateRange, teamMetricsMap]);

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
      const startDate = leaveUseToday ? new Date().toISOString().split('T')[0] : leaveStartDate;
      const response = await api.post(`/field-teams/on-leave-field-team/${selectedTeamId}`, {
        leaveReason: leaveReason || null,
        leaveStartDate: startDate,
        leaveEndDate: leaveEndDate || null,
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
  }, [leaveReason, leaveStartDate, leaveEndDate, leaveUseToday, selectedTeamId]);

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

  const handleCloseLogsDialog = useCallback(() => {
    setOpenLogsDialog(false);
    setSelectedLogs([]);
  }, []);

  const teamStatusStats = useMemo(() => {
    const total = (teams || []).length;
    let active = 0;
    let terminated = 0;
    let resigned = 0;
    let suspended = 0;
    let onLeave = 0;
    let otherInactive = 0;

    (teams || []).forEach(team => {
      if (team.isTerminated) terminated++;
      else if (team.isResigned) resigned++;
      else if (team.isSuspended) suspended++;
      else if (team.isOnLeave) onLeave++;
      else if (team.isActive === false) otherInactive++;
      else active++;
    });

    const inactive = terminated + resigned + suspended + onLeave + otherInactive;

    return { total, active, inactive, terminated, resigned, suspended, onLeave, otherInactive };
  }, [teams]);

  // Memoize filtered teams
  const filteredTeams = useMemo(() => {
    if (!searchText) return teams;
    const lowerSearch = searchText.toLowerCase();
    return teams.filter(team =>
      (team.teamName && team.teamName.toLowerCase().includes(lowerSearch)) ||
      (team.teamCode && team.teamCode.toLowerCase().includes(lowerSearch)) ||
      (team.teamCompany && team.teamCompany.toLowerCase().includes(lowerSearch)) ||
      (team.contactNumber && team.contactNumber.toLowerCase().includes(lowerSearch)) ||
      (team.firstName && team.firstName.toLowerCase().includes(lowerSearch)) ||
      (team.surname && team.surname.toLowerCase().includes(lowerSearch))
    );
  }, [teams, searchText]);

  // ---- Presentation state (filters, sheet, add dialog) ----
  const [addOpen, setAddOpen] = useState(false);
  const [sheetTeamId, setSheetTeamId] = useState(null);
  const [statusFilter, setStatusFilter] = useState([]);
  const [companyFilter, setCompanyFilter] = useState([]);
  const [escFilter, setEscFilter] = useState([]);
  const [quizFilter, setQuizFilter] = useState([]);
  const [selection, setSelection] = useState([]);
  const sheetTeam = useMemo(() => teams.find((t) => t._id === sheetTeamId) || null, [teams, sheetTeamId]);
  const companyOptions = useMemo(() => {
    const m = new Map();
    teams.forEach((t) => t.teamCompany && m.set(t.teamCompany, (m.get(t.teamCompany) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => ({ value: v, label: v, hint: n }));
  }, [teams]);
  const visibleTeams = useMemo(() => filteredTeams.filter((t) => {
    if (statusFilter.length && !statusFilter.includes(teamStatusOf(t).label)) return false;
    if (companyFilter.length && !companyFilter.includes(t.teamCompany)) return false;
    if (quizFilter.length && !quizFilter.includes(t.canTakeQuiz ? "Allowed" : "Blocked")) return false;
    if (escFilter.length) {
      const lvl = teamMetricsMap[t._id]?.consequenceLevel ?? 0;
      const bucket = lvl === 0 ? "Compliant" : lvl <= 2 ? "Warning / training" : "Formal warning or worse";
      if (!escFilter.includes(bucket)) return false;
    }
    return true;
  }), [filteredTeams, statusFilter, companyFilter, quizFilter, escFilter, teamMetricsMap]);
  const filtersActive = searchText || statusFilter.length || companyFilter.length || quizFilter.length || escFilter.length;

  return (
    <Box>
      <Box>
        <PageHeader
          title="Field Teams"
          description="Field technicians, their status, assessments and accountability."
          actions={
            <>
              <Tooltip title="Refresh">
                <IconButton aria-label="Refresh" onClick={() => setUpdateState((prev) => !prev)} disabled={loading} sx={{ width: 32, height: 32, border: '1px solid var(--border)', backgroundColor: 'var(--surface)', boxShadow: 'var(--shadow-xs)' }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Button variant="outlined" startIcon={<FileDownloadOutlined sx={{ fontSize: 17 }} />} onClick={handleExportToExcel}>Export</Button>
              {user.role === 'Admin' && (
                <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 18 }} />} onClick={() => setAddOpen(true)}>Add team</Button>
              )}
            </>
          }
        />

        {errorMessage && !addOpen && !openEditDialog && (
          <ErrorState title="Something went wrong" message={errorMessage} onRetry={() => { setErrorMessage(''); setUpdateState((p) => !p); }} sx={{ mb: 2 }} />
        )}

        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' }, mb: 2.5 }}>
          <StatCard label="Total teams" value={teamStatusStats.total} loading={loading && !teams.length} onClick={() => setStatusFilter([])} />
          <StatCard label="Active" value={teamStatusStats.active} loading={loading && !teams.length} onClick={() => setStatusFilter(['Active'])} icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'var(--success)' }} />} />
          <StatCard label="On leave" value={teamStatusStats.onLeave} loading={loading && !teams.length} onClick={() => setStatusFilter(['On leave'])} icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'var(--info)' }} />} />
          <StatCard label="Suspended" value={teamStatusStats.suspended} loading={loading && !teams.length} onClick={() => setStatusFilter(['Suspended'])} icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'var(--warning)' }} />} />
          <StatCard
            label="Left / inactive"
            value={teamStatusStats.terminated + teamStatusStats.resigned + teamStatusStats.otherInactive}
            hint={`${teamStatusStats.terminated} terminated · ${teamStatusStats.resigned} resigned`}
            loading={loading && !teams.length}
            onClick={() => setStatusFilter(['Terminated', 'Resigned', 'Inactive'])}
            sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 32, px: 1.25, width: { xs: '100%', sm: 260 }, mr: 0.5, borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', boxShadow: 'var(--shadow-xs)', '&:focus-within': { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-ring)' } }}>
            <SearchIcon sx={{ fontSize: 17, color: 'var(--text-muted)' }} />
            <InputBase value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search name, code, company, phone…" inputProps={{ 'aria-label': 'Search teams' }} sx={{ flex: 1, fontSize: 13 }} />
            {searchText && (
              <IconButton size="small" aria-label="Clear search" onClick={() => setSearchText('')} sx={{ p: 0.25 }}>
                <CloseIcon sx={{ fontSize: 15 }} />
              </IconButton>
            )}
          </Box>
          <FilterChip label="Status" options={TEAM_STATUSES.map((v) => ({ value: v, label: v, hint: teams.filter((t) => teamStatusOf(t).label === v).length }))} value={statusFilter} onChange={setStatusFilter} />
          <FilterChip label="Company" options={companyOptions} value={companyFilter} onChange={setCompanyFilter} />
          <FilterChip label="Escalation" options={['Compliant', 'Warning / training', 'Formal warning or worse'].map((v) => ({ value: v, label: v }))} value={escFilter} onChange={setEscFilter} />
          <FilterChip label="Quiz access" options={[{ value: 'Allowed', label: 'Allowed' }, { value: 'Blocked', label: 'Blocked' }]} value={quizFilter} onChange={setQuizFilter} />
          {filtersActive ? (
            <Button variant="text" size="small" startIcon={<FilterAltOffOutlined sx={{ fontSize: 16 }} />} onClick={() => { setSearchText(''); setStatusFilter([]); setCompanyFilter([]); setEscFilter([]); setQuizFilter([]); }} sx={{ color: 'var(--text-secondary)', height: 28 }}>
              Clear
            </Button>
          ) : null}
          <Box sx={{ flex: 1 }} />
          <TextField select value={escalationPeriod} onChange={(e) => setEscalationPeriod(e.target.value)} sx={{ width: 250 }} slotProps={{ htmlInput: { 'aria-label': 'Escalation analysis period' } }}>
            <MenuItem value="Cumulative">Escalation period: Cumulative (from Jun 1)</MenuItem>
            <MenuItem value="jun_2026">Escalation period: June 2026</MenuItem>
            <MenuItem value="jul_2026">Escalation period: July 2026</MenuItem>
            <MenuItem value="aug_2026">Escalation period: August 2026</MenuItem>
            <MenuItem value="custom">Escalation period: Custom range…</MenuItem>
          </TextField>
          {escalationPeriod === 'custom' && (
            <>
              <TextField type="date" label="From" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150 }} />
              <TextField type="date" label="To" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150 }} />
            </>
          )}
        </Box>

        {loading && !teams.length ? (
          <PageLoader />
        ) : (
          <TeamsTable
            rows={visibleTeams}
            metrics={teamMetricsMap}
            isAdmin={user.role === 'Admin'}
            selection={selection}
            onSelection={setSelection}
            onOpen={(t) => setSheetTeamId(t._id)}
            onToggleQuiz={handleToggleQuizPermission}
            onMenu={handleMenuOpen}
            onWarnings={(t) => handleOpenEscalationDialog(t, 1)}
          />
        )}

        <TeamSheet
          team={sheetTeam}
          open={Boolean(sheetTeam)}
          onClose={() => setSheetTeamId(null)}
          metrics={sheetTeam ? teamMetricsMap[sheetTeam._id] : null}
          periodLabel={activeDateRange.label}
          tasks={allTasks}
          isAdmin={user.role === 'Admin'}
          onEdit={handleEditClick}
          onMenu={handleMenuOpen}
          onEscalation={handleOpenEscalationDialog}
          onHistory={handleViewHistoryClick}
        />

        <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Add field team</DialogTitle>
          <DialogContent>
            <AddTeamForm
              onAddTeam={async (data) => {
                const ok = await handleAddTeam(data);
                if (ok) setAddOpen(false);
                return ok;
              }}
              loading={loading}
              errorMessage={errorMessage}
              user={user}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <EditTeamDialog
          open={openEditDialog}
          onClose={() => setOpenEditDialog(false)}
          team={editTeam}
          onSubmit={onEditSubmit}
          loading={loading}
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
            bgcolor: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <HistoryIcon sx={{ color: '#0288d1' }} /> Evaluation History
          </DialogTitle>
          <DialogContent sx={{ bgcolor: '#000', color: '#fff', p: 3 }}>
            {evaluationHistory.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5, color: 'var(--text-muted)' }}>
                <HistoryIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                <Typography>No evaluation history found</Typography>
              </Box>
            ) : (
              <Stack spacing={2} sx={{ mt: 1 }}>
                {evaluationHistory.map((evalItem, index) => (
                  <Box key={evalItem._id} sx={{
                    bgcolor: 'var(--bg)',
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid #222',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2" sx={{ color: 'var(--accent-text)', fontWeight: 'bold' }}>
                        Attempt #{evaluationHistory.length - index}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
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
                        <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                          Score: {evalItem.score}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
                          Quiz Code: <span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{evalItem.quizCode}</span>
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
          <DialogActions sx={{ bgcolor: 'var(--bg)', borderTop: '1px solid var(--border)', p: 2 }}>
            <Button onClick={() => setOpenHistoryDialog(false)} sx={{ color: 'var(--text)' }}>Close</Button>
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
            bgcolor: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <HistoryIcon sx={{ color: 'var(--accent-text)' }} /> State Logs
          </DialogTitle>
          <DialogContent sx={{ bgcolor: '#000', color: '#fff', p: 3 }}>
            {selectedLogs.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5, color: 'var(--text-muted)' }}>
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
                    bgcolor: 'var(--bg)',
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid #222'
                  }}>
                    <Typography variant="subtitle2" sx={{ color: 'var(--text)', fontWeight: 'bold', mb: 0.5 }}>
                      {log.state}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 1 }}>
                      {new Date(log.changedAt).toLocaleString()}
                    </Typography>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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
          <DialogActions sx={{ bgcolor: 'var(--bg)', borderTop: '1px solid var(--border)', p: 2 }}>
            <Button onClick={handleCloseLogsDialog} sx={{ color: 'var(--text)' }}>Close</Button>
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
            bgcolor: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text)',
            fontWeight: 600,
          }}>
            Mark Team as On Leave
          </DialogTitle>
          <DialogContent sx={{ bgcolor: '#000', color: '#fff', p: 3 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={leaveUseToday}
                    onChange={(e) => {
                      setLeaveUseToday(e.target.checked);
                      if (e.target.checked) {
                        setLeaveStartDate(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    sx={{ color: 'var(--text)' }}
                  />
                }
                label="Assign today as start date"
                sx={{ color: 'var(--text)' }}
              />
              <TextField
                label="Leave Reason (optional)"
                fullWidth
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'var(--bg)',
                    '& fieldset': { borderColor: 'var(--border)' },
                    '&:hover fieldset': { borderColor: '#0288d1' },
                    '&.Mui-focused fieldset': { borderColor: '#0288d1' },
                    '& input': { color: 'var(--text)' }
                  },
                  '& .MuiInputLabel-root': { color: 'var(--text-muted)' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#0288d1' }
                }}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  label="Start Date"
                  type="date"
                  fullWidth
                  value={leaveStartDate}
                  onChange={(e) => {
                    setLeaveStartDate(e.target.value);
                    if (leaveUseToday && e.target.value !== new Date().toISOString().split('T')[0]) {
                      setLeaveUseToday(false);
                    }
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'var(--bg)',
                      '& fieldset': { borderColor: 'var(--border)' },
                      '&:hover fieldset': { borderColor: '#0288d1' },
                      '&.Mui-focused fieldset': { borderColor: '#0288d1' },
                      '& input': { color: 'var(--text)' }
                    },
                    '& .MuiInputLabel-root': { color: 'var(--text-muted)' },
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
                      bgcolor: 'var(--bg)',
                      '& fieldset': { borderColor: 'var(--border)' },
                      '&:hover fieldset': { borderColor: '#0288d1' },
                      '&.Mui-focused fieldset': { borderColor: '#0288d1' },
                      '& input': { color: 'var(--text)' }
                    },
                    '& .MuiInputLabel-root': { color: 'var(--text-muted)' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#0288d1' }
                  }}
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ bgcolor: 'var(--bg)', borderTop: '1px solid var(--border)', p: 2 }}>
            <Button onClick={() => setOpenOnLeaveDialog(false)} sx={{ color: 'var(--text)' }}>Cancel</Button>
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
            bgcolor: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text)',
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
                    bgcolor: 'var(--bg)',
                    '& fieldset': { borderColor: 'var(--border)' },
                    '&:hover fieldset': { borderColor: '#9c27b0' },
                    '&.Mui-focused fieldset': { borderColor: '#9c27b0' },
                    '& input': { color: 'var(--text)' }
                  },
                  '& .MuiInputLabel-root': { color: 'var(--text-muted)' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#9c27b0' }
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ bgcolor: 'var(--bg)', borderTop: '1px solid var(--border)', p: 2 }}>
            <Button onClick={() => setOpenResignedDialog(false)} sx={{ color: 'var(--text)' }}>Cancel</Button>
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
          slotProps={{ paper: { sx: { minWidth: 220 } } }}
        >
          {(menuTeam?.isSuspended || menuTeam?.isOnLeave) && (
            <MenuItem onClick={() => { handleReactivateClick(menuTeam._id); handleMenuClose(); }}>
              <ListItemIcon><PlayCircleOutlineIcon fontSize="small" sx={{ color: '#4caf50' }} /></ListItemIcon>
              Reactivate
            </MenuItem>
          )}

          {!menuTeam?.isSuspended && !menuTeam?.isOnLeave && !menuTeam?.isTerminated && !menuTeam?.isResigned && (
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

          <Divider sx={{ borderColor: 'var(--border)', my: 0.5 }} />

          <MenuItem onClick={() => { handleOpenEscalationDialog(menuTeam); handleMenuClose(); }}>
            <ListItemIcon><GavelIcon fontSize="small" sx={{ color: '#ec4899' }} /></ListItemIcon>
            Manage Escalation Action & Status
          </MenuItem>

          <MenuItem onClick={() => { handleViewDetailsClick(menuTeam); handleMenuClose(); }}>
            <ListItemIcon><Visibility fontSize="small" sx={{ color: 'var(--accent-text)' }} /></ListItemIcon>
            View Full Details
          </MenuItem>

          <MenuItem onClick={() => { handleViewLogsClick(menuTeam._id); handleMenuClose(); }}>
            <ListItemIcon><HistoryIcon fontSize="small" sx={{ color: 'var(--text-secondary)' }} /></ListItemIcon>
            View State Logs
          </MenuItem>

          {user.role === 'Admin' && <Divider sx={{ borderColor: 'var(--border)', my: 0.5 }} />}
          {user.role === 'Admin' && (
            <MenuItem onClick={() => { handleDeleteClick(menuTeam); handleMenuClose(); }} sx={{ color: '#f44336' }}>
              <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: '#f44336' }} /></ListItemIcon>
              Delete Team permanently
            </MenuItem>
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
              bgcolor: 'var(--bg)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 2
            }
          }}
        >
          <DialogTitle sx={{ borderBottom: '1px solid #222', p: 2 }}>Confirm Deletion</DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <DialogContentText sx={{ color: 'var(--text-secondary)', mb: 2 }}>
              Are you sure you want to delete <strong>{teamToDelete?.teamName}</strong>? This action is permanent and cannot be undone.
            </DialogContentText>
            <DialogContentText sx={{ color: 'var(--text-muted)', mb: 2, fontSize: '0.875rem' }}>
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
                  bgcolor: 'var(--bg)',
                  '& fieldset': { borderColor: 'var(--border)' },
                  '&:hover fieldset': { borderColor: '#f44336' },
                  '&.Mui-focused fieldset': { borderColor: '#f44336' },
                  '& input': { color: 'var(--text)' }
                }
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: '1px solid #222' }}>
            <Button onClick={() => setOpenDeleteConfirmDialog(false)} sx={{ color: 'var(--text-muted)' }}>Cancel</Button>
            <Button
              onClick={handleConfirmDeleteTeam}
              variant="contained"
              disabled={deleteConfirmationName !== teamToDelete?.teamName}
              sx={{
                bgcolor: '#f44336',
                '&:hover': { bgcolor: '#d32f2f' },
                '&.Mui-disabled': { bgcolor: 'var(--surface)', color: '#444' }
              }}
            >
              Confirm Permanent Deletion
            </Button>
          </DialogActions>
        </Dialog>

        {/* Manage Escalation Action & History Dialog */}
        <Dialog
          open={openEscalationDialog}
          onClose={() => setOpenEscalationDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'var(--bg)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
            }
          }}
        >
          <DialogTitle sx={{ borderBottom: '1px solid #222', p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <GavelIcon sx={{ color: '#ec4899', fontSize: 28 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text)', fontSize: '1.1rem' }}>
                  Manage Escalation Action & Warning History
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                  Field Team: <strong style={{ color: '#ec4899' }}>{escalationTeam?.teamName}</strong> ({escalationTeam?.teamCode})
                </Typography>
              </Box>
            </Box>
            {teamMetricsMap[escalationTeam?._id] && (
              <Chip
                label={`Calculated Matrix: ${teamMetricsMap[escalationTeam._id].requiredConsequence}`}
                size="small"
                sx={{
                  bgcolor: `${teamMetricsMap[escalationTeam._id].consequenceColor}22`,
                  color: teamMetricsMap[escalationTeam._id].consequenceColor,
                  border: `1px solid ${teamMetricsMap[escalationTeam._id].consequenceColor}55`,
                  fontWeight: 700,
                  fontSize: '0.75rem'
                }}
              />
            )}
          </DialogTitle>

          <Tabs
            value={escDialogTab}
            onChange={(e, newTab) => setEscDialogTab(newTab)}
            sx={{
              borderBottom: '1px solid #222',
              px: 2.5,
              '& .MuiTab-root': { color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'none', minHeight: 48 },
              '& .Mui-selected': { color: '#ec4899' },
              '& .MuiTabs-indicator': { bgcolor: '#ec4899' }
            }}
          >
            <Tab label="Record New Escalation Warning" icon={<AddCircleOutlineIcon />} iconPosition="start" />
            <Tab
              label={`Warning History Log (${(escalationTeam?.escalationHistory || []).length})`}
              icon={<HistoryIcon />}
              iconPosition="start"
            />
          </Tabs>

          <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {escDialogTab === 0 ? (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', mb: 1, display: 'block', fontWeight: 600 }}>
                  Quick Escalation Presets (Click to apply):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
                  {[
                    { scale: "1st Offense", label: "1st: Verbal Warning", act: "1st Offense: Verbal Warning", st: "Warning Issued" },
                    { scale: "1st Offense (Repeated)", label: "1st (Rep): 3h Training", act: "1st Offense (Repeated): Mandatory Intensive Training (3 Hours)", st: "Training Assigned" },
                    { scale: "2nd Offense", label: "2nd: 1st Formal Warning", act: "2nd Offense: First Formal Warning", st: "Warning Issued" },
                    { scale: "3rd Offense", label: "3rd: 2nd Warning + Deduction", act: "3rd Offense: Second Formal Warning + Deduction", st: "Action Taken" },
                    { scale: "4th Offense", label: "4th: 3rd Warning + 1 Wk Susp.", act: "4th Offense: Third Formal Warning + Deduction 1 Week Suspension", st: "1 Week Suspension" },
                    { scale: "5th Offense & Beyond", label: "5th: 1 Mo. Suspension", act: "5th Offense & Beyond: 1 Month Suspension", st: "1 Month Suspension" },
                    { scale: "5th Offense & Beyond", label: "Termination", act: "Termination - Policy Breach", st: "Termination" },
                    { scale: "Compliant", label: "Compliant / Closed", act: "Compliant - No Violation", st: "Closed" }
                  ].map((preset, idx) => (
                    <Chip
                      key={idx}
                      label={preset.label}
                      size="small"
                      clickable
                      onClick={() => {
                        setEscOffenseScale(preset.scale);
                        setEscAction(preset.act);
                        setEscStatus(preset.st);
                        if (!escDate) setEscDate(new Date().toISOString().split('T')[0]);
                      }}
                      sx={{
                        bgcolor: escAction === preset.act ? '#ec4899' : '#1e293b',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        '&:hover': { bgcolor: '#ec489988' }
                      }}
                    />
                  ))}
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                  <TextField
                    select
                    label="Offense Scale"
                    fullWidth
                    value={escOffenseScale}
                    onChange={(e) => setEscOffenseScale(e.target.value)}
                    SelectProps={{ native: true }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'var(--bg)',
                        '& fieldset': { borderColor: 'var(--border)' },
                        '&:hover fieldset': { borderColor: '#ec4899' },
                        '&.Mui-focused fieldset': { borderColor: '#ec4899' },
                        '& select': { color: 'var(--text)' }
                      },
                      '& .MuiInputLabel-root': { color: 'var(--text-muted)' },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#ec4899' }
                    }}
                  >
                    {[
                      '1st Offense',
                      '1st Offense (Repeated)',
                      '2nd Offense',
                      '3rd Offense',
                      '4th Offense',
                      '5th Offense & Beyond',
                      'Custom Violation / Disciplinary'
                    ].map((scale, idx) => (
                      <option key={idx} value={scale} style={{ backgroundColor: 'var(--bg)', color: '#fff' }}>
                        {scale}
                      </option>
                    ))}
                  </TextField>

                  <TextField
                    label="Period / Month Assigned"
                    fullWidth
                    value={escPeriodTag}
                    onChange={(e) => setEscPeriodTag(e.target.value)}
                    placeholder="e.g. Cumulative (From 01/06/2026) or Aug 2026"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'var(--bg)',
                        '& fieldset': { borderColor: 'var(--border)' },
                        '&:hover fieldset': { borderColor: '#ec4899' },
                        '&.Mui-focused fieldset': { borderColor: '#ec4899' },
                        '& input': { color: 'var(--text)' }
                      },
                      '& .MuiInputLabel-root': { color: 'var(--text-muted)' },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#ec4899' }
                    }}
                  />
                </Box>

                <TextField
                  label="Escalation Action Taken"
                  fullWidth
                  variant="outlined"
                  value={escAction}
                  onChange={(e) => setEscAction(e.target.value)}
                  placeholder="e.g. 1st Offense: Verbal Warning, 3rd Offense: Second Formal Warning + 10% Deduction"
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'var(--bg)',
                      '& fieldset': { borderColor: 'var(--border)' },
                      '&:hover fieldset': { borderColor: '#ec4899' },
                      '&.Mui-focused fieldset': { borderColor: '#ec4899' },
                      '& input': { color: 'var(--text)' }
                    },
                    '& .MuiInputLabel-root': { color: 'var(--text-muted)' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#ec4899' }
                  }}
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                  <TextField
                    select
                    label="Escalation Status"
                    fullWidth
                    value={escStatus}
                    onChange={(e) => setEscStatus(e.target.value)}
                    SelectProps={{ native: true }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'var(--bg)',
                        '& fieldset': { borderColor: 'var(--border)' },
                        '&:hover fieldset': { borderColor: '#ec4899' },
                        '&.Mui-focused fieldset': { borderColor: '#ec4899' },
                        '& select': { color: 'var(--text)' }
                      },
                      '& .MuiInputLabel-root': { color: 'var(--text-muted)' },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#ec4899' }
                    }}
                  >
                    {['Pending', 'Under Review', 'Action Taken', 'Warning Issued', 'Training Assigned', '1 Week Suspension', '1 Month Suspension', 'Termination', 'Completed', 'Closed', 'Waived', 'Compliant'].map((st, idx) => (
                      <option key={idx} value={st} style={{ backgroundColor: 'var(--bg)', color: '#fff' }}>
                        {st}
                      </option>
                    ))}
                  </TextField>

                  <TextField
                    label="Action Date"
                    type="date"
                    fullWidth
                    value={escDate}
                    onChange={(e) => setEscDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'var(--bg)',
                        '& fieldset': { borderColor: 'var(--border)' },
                        '&:hover fieldset': { borderColor: '#ec4899' },
                        '&.Mui-focused fieldset': { borderColor: '#ec4899' },
                        '& input': { color: 'var(--text)' }
                      },
                      '& .MuiInputLabel-root': { color: 'var(--text-muted)' },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#ec4899' }
                    }}
                  />
                </Box>

                <TextField
                  label="Escalation Notes & Action Details"
                  fullWidth
                  multiline
                  rows={3}
                  value={escNotes}
                  onChange={(e) => setEscNotes(e.target.value)}
                  placeholder="Add details regarding date of warning, deduction percentage, trainer details or next review date..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'var(--bg)',
                      '& fieldset': { borderColor: 'var(--border)' },
                      '&:hover fieldset': { borderColor: '#ec4899' },
                      '&.Mui-focused fieldset': { borderColor: '#ec4899' },
                      '& textarea': { color: 'var(--text)' }
                    },
                    '& .MuiInputLabel-root': { color: 'var(--text-muted)' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#ec4899' }
                  }}
                />
              </Box>
            ) : (
              <Box sx={{ mt: 1 }}>
                {(!escalationTeam?.escalationHistory || escalationTeam.escalationHistory.length === 0) ? (
                  <Box sx={{ textAlign: 'center', py: 4, color: 'var(--text-muted)' }}>
                    <HistoryIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>No Escalation Warnings Recorded</Typography>
                    <Typography variant="caption">Use the "Record New Escalation Warning" tab to add warnings and disciplinary actions.</Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {escalationTeam.escalationHistory.map((item, idx) => (
                      <Paper
                        key={idx}
                        sx={{
                          p: 2,
                          bgcolor: 'var(--bg)',
                          border: '1px solid var(--border)',
                          borderRadius: 2,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 2
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
                            <Chip
                              label={item.offenseScale || 'Warning'}
                              size="small"
                              sx={{ bgcolor: '#ec489922', color: '#ec4899', border: '1px solid #ec489955', fontWeight: 700, fontSize: '0.75rem' }}
                            />
                            <Chip
                              label={item.status || 'Action Taken'}
                              size="small"
                              sx={{ bgcolor: '#3b82f622', color: '#60a5fa', border: '1px solid #3b82f655', fontWeight: 600, fontSize: '0.72rem' }}
                            />
                            {item.period && (
                              <Chip
                                label={`Period: ${item.period}`}
                                size="small"
                                sx={{ bgcolor: 'var(--overlay-subtle)', color: 'var(--text-secondary)', fontSize: '0.7rem' }}
                              />
                            )}
                            <Typography variant="caption" sx={{ color: 'var(--text-secondary)', ml: 'auto' }}>
                              Date: <strong style={{ color: 'var(--text)' }}>{item.actionDate ? new Date(item.actionDate).toLocaleDateString() : 'N/A'}</strong>
                            </Typography>
                          </Stack>

                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text)', mb: 0.5 }}>
                            {item.action || 'No Action Specified'}
                          </Typography>

                          {item.notes && (
                            <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', bgcolor: 'var(--bg)', p: 1, borderRadius: 1, border: '1px solid #222' }}>
                              {item.notes}
                            </Typography>
                          )}
                        </Box>

                        <Tooltip title="Delete Warning Record">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteEscalationHistoryItem(idx)}
                            sx={{ color: '#ef4444', '&:hover': { bgcolor: '#ef444422' } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ p: 2.5, borderTop: '1px solid #222', gap: 1.5 }}>
            <Button onClick={() => setOpenEscalationDialog(false)} sx={{ color: 'var(--text-secondary)' }}>
              Close
            </Button>
            {escDialogTab === 0 && (
              <Button
                variant="contained"
                onClick={handleSaveEscalation}
                disabled={loading}
                sx={{
                  bgcolor: '#ec4899',
                  color: 'var(--text)',
                  fontWeight: 700,
                  px: 3,
                  '&:hover': { bgcolor: '#db2777' }
                }}
              >
                Save & Record Warning to History
              </Button>
            )}
          </DialogActions>
        </Dialog>

      </Box>
    </Box>
  );
};

export default FieldTeamForm;