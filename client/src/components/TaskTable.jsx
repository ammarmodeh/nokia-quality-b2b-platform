import React from "react";
import * as XLSX from "xlsx";
import moment from "moment";
import {
  Paper,
  Typography,
  Box,
  Button,
  Stack,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import { getWeekNumberForTaksTable, newFormatDate } from "../utils/helpers";
import { useEffect, useState, useMemo } from "react";
import { FaCopy, FaTimes } from "react-icons/fa";
import { RiFileExcel2Fill } from "react-icons/ri";
import { Assignment, AssignmentTurnedIn } from "@mui/icons-material";
import api from "../api/api";

const handleCopyTaskData = (taskData) => {
  // Format the data for copying
  const formattedData = `
    Request Number: ${taskData.requestNumber}
    SLID: ${taskData.slid}
    Customer Name: ${taskData.customerName}
    Contact Number: ${taskData.contactNumber}
    PIS Date: ${new Date(taskData.pisDate).toLocaleDateString()}
    Governorate: ${taskData.governorate}
    District: ${taskData.district}
    Team Name: ${taskData.teamName}
    Team Group: ${taskData.teamCompany}
    Tariff Name: ${taskData.tarrifName}
    Customer Type: ${taskData.customerType}
    Customer Feedback: ${taskData.customerFeedback}
    Reason: ${taskData.reason}
    Sub Reason: ${taskData.subReason || 'N/A'}
    Root Cause: ${taskData.rootCause || 'N/A'}
    Satisfaction Score: ${taskData.evaluationScore}
    Feedback Severity: ${taskData.impactLevel || taskData.priority || 'Not specified'}
    Interview Date: ${new Date(taskData.interviewDate).toLocaleDateString()}
    Week Number: ${getWeekNumberForTaksTable(new Date(taskData.interviewDate))}
    Team Evaluation Score: ${taskData.teamData?.evaluationScore || 'N/A'}
    Team Status: ${taskData.teamData?.isActive ? 'Active' : 'Inactive'}
    Team Evaluated: ${taskData.teamData?.isEvaluated ? 'Yes' : 'No'}
  `.trim();

  // Copy to clipboard
  navigator.clipboard.writeText(formattedData)
    .then(() => {
      alert("Task data copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
      alert("Failed to copy data to clipboard");
    });
};

const TaskTable = ({ tasks, fieldTeams }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [teamsData, setTeamsData] = useState(fieldTeams || []);
  const [evaluationData, setEvaluationData] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get("/settings");
        setSettings(response.data);
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const isMobile = useMediaQuery('(max-width:503px)');

  // Sync teamsData with fieldTeams prop
  useEffect(() => {
    if (fieldTeams) {
      setTeamsData(fieldTeams);
      setLoadingTeams(false);
    }
  }, [fieldTeams]);

  // Fetch evaluation data for theoretical satisfaction scores
  useEffect(() => {
    const fetchEvaluationData = async () => {
      try {
        const response = await api.get('/quiz-results/teams/evaluation', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (response.status === 200) {
          setEvaluationData(response.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching evaluation data:', error);
      }
    };

    fetchEvaluationData();
  }, []);

  // Function to get theoretical satisfaction score for a team
  const getTheoreticalSatisfactionScore = (teamName) => {
    const teamEvaluation = evaluationData.find(team =>
      team.teamName === teamName || team.teamId === teamName
    );

    if (teamEvaluation && teamEvaluation.history && teamEvaluation.history.length > 0) {
      const latestEvaluation = teamEvaluation.history[0];
      return latestEvaluation.percentage !== null ? `${latestEvaluation.percentage}%` : 'N/A';
    }

    return 'N/A';
  };

  // Helper function to get team data by ID
  const getTeamData = (teamId) => {
    if (!teamsData || !teamId) return null;
    return teamsData.find(team => team._id === teamId);
  };

  const handleClickOpen = (task) => {
    const teamData = getTeamData(task.teamId);
    setSelectedTask({
      ...task,
      teamData
    });
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
    setSelectedTask(null);
  };

  // Function to export data to Excel
  const exportToExcel = () => {
    try {
      // First, calculate team statistics including Feedback Severitys
      const teamStats = {};

      tasks.forEach(task => {
        const teamId = task.teamId?.$oid || task.teamId;
        if (!teamStats[teamId]) {
          teamStats[teamId] = {
            totalViolations: 0,
            neutrals: 0,
            detractors: 0,
            lowImpact: 0,
            mediumImpact: 0,
            highImpact: 0,
            teamName: task.teamName,
            teamCompany: task.teamCompany
          };
        }

        teamStats[teamId].totalViolations++;

        // Count by score type
        const score = task.evaluationScore || 0;
        if (score >= 7 && score <= 8) {
          teamStats[teamId].neutrals++;
        } else if (score <= 6) {
          teamStats[teamId].detractors++;
        }

        // Count by priority level
        const priority = task.priority;
        if (priority === 'Low') {
          teamStats[teamId].lowImpact++;
        } else if (priority === 'Medium') {
          teamStats[teamId].mediumImpact++;
        } else if (priority === 'High') {
          teamStats[teamId].highImpact++;
        }
      });

      // Define the export columns
      const exportColumns = [
        { header: "SLID", field: "slid" },
        { header: "Operation", field: "operation" },
        { header: "Week", field: "weekNumber" },
        { header: "Customer", field: "customerName" },
        { header: "Feedback", field: "customerFeedback" },
        { header: "Score", field: "evaluationScore" },
        { header: "Feedback Severity", field: "impactLevel" },
        { header: "Team", field: "teamName" },
        { header: "Group", field: "teamCompany" },
        { header: "PIS Date", field: "pisDate" },
        { header: "Last Session", field: "lastSession" },
        { header: "Neutrals (7-8)", field: "neutrals" },
        { header: "Detractors (0-6)", field: "detractors" },
        { header: "Total Violations", field: "totalViolations" },
        // Add new columns for Feedback Severitys
        { header: "Low Priority", field: "lowImpact" },
        { header: "Medium Priority", field: "mediumImpact" },
        { header: "High Priority", field: "highImpact" },
        { header: "Evaluated", field: "isEvaluated" },
        { header: "Team Score", field: "teamEvaluationScore" },
      ];

      // Prepare the data for export
      const exportData = tasks.map(task => {
        const teamId = task.teamId?.$oid || task.teamId;
        const stats = teamStats[teamId] || {
          totalViolations: 0,
          neutrals: 0,
          detractors: 0,
          lowImpact: 0,
          mediumImpact: 0,
          highImpact: 0
        };

        // Calculate week number
        const weekNumber = getWeekNumberForTaksTable(new Date(task.interviewDate?.$date || task.interviewDate), settings || {});

        // Get team data if available
        const teamData = getTeamData(teamId);

        // Get theoretical satisfaction score
        const teamEvaluationScore = getTheoreticalSatisfactionScore(task.teamName);

        // Initialize session variables
        let lastSession = null;
        let sessionInfo = 'No sessions';
        let sessionStatus = 'N/A';

        // Process session history if exists
        if (teamData?.sessionHistory?.length > 0) {
          // Find all completed sessions (sorted by date, newest first)
          const completedSessions = teamData.sessionHistory
            .filter(session => session.status === 'Completed')
            .sort((a, b) =>
              new Date(b.sessionDate?.$date || b.sessionDate) -
              new Date(a.sessionDate?.$date || a.sessionDate)
            );

          // Find all other sessions (sorted by date, newest first)
          const otherSessions = teamData.sessionHistory
            .filter(session => session.status !== 'Completed')
            .sort((a, b) =>
              new Date(b.sessionDate?.$date || b.sessionDate) -
              new Date(a.sessionDate?.$date || a.sessionDate)
            );

          // Priority 1: Use most recent completed session if available
          if (completedSessions.length > 0) {
            lastSession = completedSessions[0];
            sessionStatus = 'Completed';
            sessionInfo = `Completed (${moment(lastSession.sessionDate?.$date || lastSession.sessionDate).format('YYYY-MM-DD')})`;
          }
          // Priority 2: Use most recent other session if no completed sessions
          else if (otherSessions.length > 0) {
            lastSession = otherSessions[0];
            sessionStatus = 'Missed';
            sessionInfo = `Missed (${moment(lastSession.sessionDate?.$date || lastSession.sessionDate).format('YYYY-MM-DD')})`;
          }
        }

        return {
          slid: task.slid,
          operation: task.operation || 'N/A',
          weekNumber: weekNumber,
          customerName: task.customerName,
          customerFeedback: task.customerFeedback,
          evaluationScore: task.evaluationScore,
          impactLevel: task.priority,
          teamName: task.teamName,
          teamCompany: task.teamCompany,
          pisDate: newFormatDate(task.pisDate?.$date || task.pisDate),
          lastSession: sessionInfo,
          isEvaluated: teamData ? (teamData.isEvaluated ? 'Yes' : 'No') : 'N/A',
          teamEvaluationScore: teamEvaluationScore,
          neutrals: stats.neutrals,
          detractors: stats.detractors,
          totalViolations: stats.totalViolations,
          lowImpact: stats.lowImpact,
          mediumImpact: stats.mediumImpact,
          highImpact: stats.highImpact,
        };
      });

      // Create worksheet with headers
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Auto-size columns
      const wscols = exportColumns.map(col => ({
        width: Math.min(Math.max(col.header.length + 2, 10), 30)
      }));
      worksheet['!cols'] = wscols;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "All Violations");

      // Generate file with timestamp
      const timestamp = moment().format("YYYYMMDD_HHmmss");
      XLSX.writeFile(workbook, `all_violations_exported_${timestamp}.xlsx`);

    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Failed to export to Excel. Please try again.");
    }
  };

  // Ensure valid tasks and calculate week numbers using getWeekNumberForTaksTable
  const filteredTasks = useMemo(() => tasks.filter(task => {
    const interviewDate = new Date(task.interviewDate);
    if (isNaN(interviewDate)) {
      return false;
    }

    return getWeekNumberForTaksTable(interviewDate, settings || {}) !== null;
  }), [tasks, settings]);

  const sortedTasks = useMemo(() => filteredTasks.sort((a, b) => new Date(b.interviewDate) - new Date(a.interviewDate)), [filteredTasks]);

  const taskColumns = [
    {
      field: "slid",
      headerName: "SLID",
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Button
          onClick={() => handleClickOpen(params.row)}
          disableRipple
          disableTouchRipple
          disableFocusRipple
          sx={{
            color: '#7b68ee',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: 'rgba(62, 166, 255, 0.1)'
            }
          }}
        >
          {params.value}
        </Button>
      ),
    },
    {
      field: "operation",
      headerName: "Operation",
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {params.value || 'N/A'}
        </Box>
      ),
    },
    {
      field: "weekNumber",
      headerName: "Week",
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.1)', // Translucent light
            color: '#cbd5e1', // Light gray
            borderRadius: '50%',
            width: 30,
            height: 30,
            fontWeight: 'bold',
            fontSize: '0.75rem'
          }}>
            {params.value}
          </Box>
        </Box>
      ),
    },
    {
      field: "customerName",
      headerName: "Customer",
      minWidth: 200,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => params.value,
    },
    {
      field: "customerFeedback",
      headerName: "Feedback",
      minWidth: 200,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => params.value,
    },
    {
      field: "subReason",
      headerName: "Sub Reason",
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Tooltip title={params.value || 'N/A'}>
          <span>{params.value || 'N/A'}</span>
        </Tooltip>
      ),
    },
    {
      field: "rootCause",
      headerName: "Root Cause",
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Tooltip title={params.value || 'N/A'}>
          <span>{params.value || 'N/A'}</span>
        </Tooltip>
      ),
    },
    {
      field: "evaluationScore",
      headerName: "Score",
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const score = params.value;
        let color = "#f44336";
        let label = "Detractor";

        if (score >= 7 && score <= 8) {
          color = "#ff9800";
          label = "Neutral";
        } else if (score >= 9 && score <= 10) {
          color = "#4caf50";
          label = "Promoter";
        }

        return (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            fontWeight: "bold"
          }}>
            {score}
          </Box>
        );
      },
    },
    {
      field: "impactLevel",
      headerName: "Feedback Severity",
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const value = params.value;
        let color = '';

        switch (value) {
          case 'Low':
            color = '#569256';
            break;
          case 'Medium':
            color = '#ca9433';
            break;
          case 'High':
            color = '#d33131';
            break;
          default:
            color = 'gray';
        }

        return (
          <span style={{ color, fontWeight: 'bold', textTransform: 'capitalize' }}>
            {value}
          </span>
        );
      },
    },
    {
      field: "team",
      headerName: "Team",
      minWidth: 200,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {params.value}
        </Box>
      )
    },
    {
      field: "company",
      headerName: "Group",
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {params.value}
        </Box>
      )
    },
    {
      field: "pisDate",
      headerName: "PIS Date",
      align: 'center',
      headerAlign: 'center',
      minWidth: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {newFormatDate(params.value)}
        </Box>
      ),
    },
    {
      field: "lastSession",
      headerName: "Last Session",
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const teamData = getTeamData(params.row.teamId);
        const lastSession = teamData?.sessionHistory?.[0];
        return (
          <Tooltip
            title={lastSession ? `${lastSession.sessionTitle} (${moment(lastSession.sessionDate).format('YYYY-MM-DD')})` : 'No sessions'}
            placement="top"
          >
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: lastSession ? '#7b68ee' : '#6b7280',
              fontStyle: lastSession ? 'normal' : 'italic'
            }}>
              {lastSession ? moment(lastSession.sessionDate).format('MMM D') : 'No sessions'}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: "isEvaluated",
      headerName: "Evaluated",
      minWidth: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const teamData = getTeamData(params.row.teamId);
        return (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: teamData?.isEvaluated ? '#4caf50' : '#f44336',
            fontWeight: 'bold'
          }}>
            {teamData ? (teamData.isEvaluated ? 'Yes' : 'No') : 'N/A'}
          </Box>
        );
      },
    },
    {
      field: "teamEvaluationScore",
      headerName: "Team Score",
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const teamEvaluationScore = getTheoreticalSatisfactionScore(params.row.teamName);
        return (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#cbd5e1', // Light gray for dark theme
            fontWeight: 'bold'
          }}>
            {teamEvaluationScore}
          </Box>
        );
      },
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Button
          onClick={() => navigate(`/tasks/view-task/${params.row.status}`)}
          sx={{
            color: '#7b68ee',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: 'rgba(62, 166, 255, 0.1)'
            },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          View Status
        </Button>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const [copied, setCopied] = useState(false);

        const handleCopyTaskData = () => {
          const formattedData = `
            Request Number: ${params.row.requestNumber}
            Operation: ${params.row.operation || 'N/A'}
            SLID: ${params.row.slid}
            Customer Name: ${params.row.customerName}
            Contact Number: ${params.row.contactNumber}
            PIS Date: ${moment(params.row.pisDate).format("YYYY-MM-DD")}
            Governorate: ${params.row.governorate}
            District: ${params.row.district}
            Team Name: ${params.row.teamName}
            Team Group: ${params.row.teamCompany}
            Tariff Name: ${params.row.tarrifName}
            Customer Type: ${params.row.customerType}
            Customer Feedback: ${params.row.customerFeedback}
            Reason: ${params.row.reason}
            Sub Reason: ${params.row.subReason || 'N/A'}
            Root Cause: ${params.row.rootCause || 'N/A'}
            Satisfaction Score: ${params.row.evaluationScore}
            Feedback Severity: ${params.row.impactLevel || params.row.priority || 'Not specified'}
            Interview Date: ${moment(params.row.interviewDate).format("YYYY-MM-DD")}
            Week Number: ${params.row.weekNumber}
          `.trim();

          navigator.clipboard.writeText(formattedData);
          setCopied(true);
          setCopied(true);
        };

        return (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%'
          }}>
            <Tooltip
              title={copied ? "Copied!" : "Copy task data"}
              placement="top"
            >
              <IconButton
                onClick={handleCopyTaskData}
                size="small"
                sx={{
                  color: '#9c27b0',
                  '&:hover': {
                    backgroundColor: 'rgba(156, 39, 176, 0.1)'
                  }
                }}
              >
                {copied ? <AssignmentTurnedIn fontSize="small" /> : <Assignment fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    }
  ];

  // Map tasks correctly with the new week numbering system
  const rows = useMemo(() => sortedTasks.map((task, index) => ({
    id: index + 1,
    slid: task.slid,
    operation: task.operation,
    customerName: task.customerName,
    customerFeedback: task.customerFeedback,
    impactLevel: task.priority,
    priority: task.priority,
    weekNumber: getWeekNumberForTaksTable(new Date(task.interviewDate), settings || {}),
    evaluationScore: task.evaluationScore,
    team: task.teamName,
    company: task.teamCompany,
    pisDate: task.pisDate,
    status: task._id,
    teamId: task.teamId?.$oid || task.teamId,
    contactNumber: task.contactNumber,
    requestNumber: task.requestNumber,
    governorate: task.governorate,
    district: task.district,
    teamName: task.teamName,
    teamCompany: task.teamCompany,
    tarrifName: task.tarrifName,
    customerType: task.customerType,
    reason: task.reason,
    subReason: task.subReason,
    rootCause: task.rootCause,
    interviewDate: task.interviewDate,
  })), [sortedTasks, settings]);

  return (
    <Box sx={{ marginBottom: "20px" }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          marginBottom: "10px",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography
          variant="h6"
          fontWeight="bold"
          sx={{
            color: "#c2c2c2",
            fontSize: isMobile ? "0.9rem" : "1rem",
            fontWeight: "600"
          }}
        >
          Recent Violations Overview
        </Typography>
        <Tooltip title="Export to Excel">
          <IconButton
            onClick={exportToExcel}
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
      <Paper sx={{
        height: 400,
        width: "100%",
        // backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        overflow: "hidden",
      }}>
        <DataGrid
          rows={rows}
          columns={taskColumns}
          getRowHeight={() => 40}
          disableColumnResize
          pageSizeOptions={[5, 10, 25]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          sx={{
            border: 0,
            color: "#cbd5e1", // Light gray for dark theme
            fontFamily: "'Inter', sans-serif",
            "& .MuiDataGrid-overlay": {
              color: "#64748b",
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#f8fafc",
              color: "#475569",
              fontSize: "0.75rem",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              borderBottom: "1px solid #e2e8f0",
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#f8fafc",
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid #f1f5f9",
            },
            "& .MuiDataGrid-row": {
              "&:hover": {
                backgroundColor: "rgba(100, 116, 139, 0.08)",
              },
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "1px solid #e2e8f0",
              // backgroundColor: "#ffffff",
              color: "#475569",
            },
            "& .MuiTablePagination-root": {
              color: "#475569",
            },
            "& .MuiDataGrid-toolbarContainer": {
              padding: "12px",
              borderBottom: "1px solid #e2e8f0",
              // backgroundColor: "#ffffff",
              gap: 2,
              "& .MuiButton-root": {
                color: "#64748b",
                fontSize: "0.80rem",
              }
            }
          }}
        />
      </Paper>

      {/* Task Details Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleClose}
        fullScreen
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: '#2d2d2d',
            boxShadow: 'none',
            borderRadius: fullScreen ? '0px' : '8px',
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 24px',
        }}>
          <Typography variant="h6" component="div">
            Task Details
          </Typography>
          <Box
            sx={{
              display: 'flex',
              ml: 2
            }}
          >
            <Tooltip title="Copy Details">
              <IconButton
                onClick={() => handleCopyTaskData(selectedTask)}
                sx={{
                  mr: 1,
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#2a2a2a',
                  }
                }}
              >
                <FaCopy />
              </IconButton>
            </Tooltip>
            <IconButton
              onClick={handleClose}
              sx={{
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#2a2a2a',
                }
              }}
            >
              <FaTimes />
            </IconButton>
          </Box>
        </DialogTitle>

        <Divider sx={{ backgroundColor: '#e5e7eb' }} />

        <DialogContent dividers sx={{
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          padding: '20px 24px',
        }}>
          {selectedTask && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Basic Information Section */}
              <Paper elevation={0} sx={{
                p: 2,
                backgroundColor: '#2d2d2d',
                borderRadius: 2,
                border: '1px solid #3d3d3d'
              }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#7b68ee' }}>
                  Basic Information
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <DetailRow label="Request Number" value={selectedTask.requestNumber} />
                  <DetailRow label="Operation" value={selectedTask.operation} />
                  <DetailRow label="SLID" value={selectedTask.slid} />
                  <DetailRow label="Customer Name" value={selectedTask.customerName} />
                  <DetailRow label="Contact Number" value={selectedTask.contactNumber} />
                  <DetailRow label="PIS Date" value={moment(selectedTask.pisDate).format("YYYY-MM-DD")} />
                  <DetailRow label="Tariff Name" value={selectedTask.tarrifName} />
                  <DetailRow label="Customer Type" value={selectedTask.customerType} />
                  <DetailRow label="Interview Date" value={moment(selectedTask.interviewDate).format("YYYY-MM-DD")} />
                </Box>
              </Paper>

              {/* Location Information Section */}
              <Paper elevation={0} sx={{
                p: 2,
                backgroundColor: '#2d2d2d',
                borderRadius: 2,
                border: '1px solid #3d3d3d'
              }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#7b68ee' }}>
                  Location Information
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <DetailRow label="Governorate" value={selectedTask.governorate} />
                  <DetailRow label="District" value={selectedTask.district} />
                </Box>
              </Paper>

              {/* Team Information Section */}
              <Paper elevation={0} sx={{
                p: 2,
                backgroundColor: '#2d2d2d',
                borderRadius: 2,
                border: '1px solid #3d3d3d'
              }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#7b68ee' }}>
                  Team Information
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <DetailRow label="Team Name" value={selectedTask.teamName} />
                  <DetailRow label="Team Group" value={selectedTask.teamCompany} />
                </Box>
              </Paper>

              {/* Team Status Section */}
              <Paper elevation={0} sx={{
                p: 2,
                backgroundColor: '#2d2d2d',
                borderRadius: 2,
                border: '1px solid #3d3d3d'
              }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#7b68ee' }}>
                  Team Status
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <DetailRow
                    label="Active Status"
                    value={
                      <Chip
                        label={selectedTask.teamData?.isActive ? 'Active' : 'Inactive'}
                        sx={{
                          color: '#ffffff',
                          backgroundColor: selectedTask.teamData?.isActive ? '#4caf50' : '#f44336',
                          fontWeight: 'bold'
                        }}
                      />
                    }
                  />
                  <DetailRow
                    label="Evaluation Status"
                    value={
                      <Chip
                        label={selectedTask.teamData?.isEvaluated ? 'Evaluated' : 'Not Evaluated'}
                        sx={{
                          color: '#ffffff',
                          backgroundColor: selectedTask.teamData?.isEvaluated ? '#4caf50' : '#f44336',
                          fontWeight: 'bold'
                        }}
                      />
                    }
                  />
                  <DetailRow label="Team Satisfaction Score" value={selectedTask.teamData?.evaluationScore || 'N/A'} />
                  {selectedTask.teamData?.sessionHistory?.[0] && (
                    <DetailRow
                      label="Last Session"
                      value={
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body1" sx={{ color: '#ffffff' }}>
                            {selectedTask.teamData.sessionHistory[0].sessionTitle}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                            {moment(selectedTask.teamData.sessionHistory[0].sessionDate).format('YYYY-MM-DD')}
                          </Typography>
                        </Box>
                      }
                    />
                  )}
                </Box>
              </Paper>

              {/* Evaluation Section */}
              <Paper elevation={0} sx={{
                p: 2,
                backgroundColor: '#2d2d2d',
                borderRadius: 2,
                border: '1px solid #3d3d3d'
              }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#7b68ee' }}>
                  Evaluation
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <DetailRow
                    label="Satisfaction Score"
                    value={
                      <Box component="span">
                        <Chip
                          label={`${selectedTask.evaluationScore} (${selectedTask.evaluationScore >= 9 ? 'Promoter' :
                            selectedTask.evaluationScore >= 7 ? 'Neutral' : 'Detractor'
                            })`}
                          sx={{
                            color: '#ffffff',
                            backgroundColor:
                              selectedTask.evaluationScore >= 9 ? '#4caf50' :
                                selectedTask.evaluationScore >= 7 ? '#6b7280' : '#f44336',
                            fontWeight: 'bold'
                          }}
                        />
                      </Box>
                    }
                  />
                  <DetailRow label="Customer Feedback" value={selectedTask.customerFeedback} />
                  <DetailRow label="Reason" value={selectedTask.reason} />
                  <DetailRow label="Customer Feedback" value={selectedTask.priority} />
                </Box>
              </Paper>
            </Box>
          )}
        </DialogContent>

        <Divider sx={{ backgroundColor: '#e5e7eb' }} />

        <DialogActions sx={{
          backgroundColor: '#2d2d2d',
          borderTop: '1px solid #e5e7eb',
          padding: '12px 24px',
        }}>
          <Button
            onClick={handleClose}
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
    </Box>
  );
};

// Helper component for consistent detail rows
const DetailRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
    <Typography
      variant="body2"
      component="div"
      sx={{
        fontWeight: '500',
        color: '#b3b3b3'
      }}
    >
      {label}
    </Typography>
    {typeof value === 'string' || typeof value === 'number' ? (
      <Typography
        variant="body1"
        component="div"
        sx={{
          color: '#ffffff',
          wordBreak: 'break-word'
        }}
      >
        {value || 'N/A'}
      </Typography>
    ) : (
      <Box sx={{ display: 'inline-block' }}>
        {value}
      </Box>
    )}
  </Box>
);

export default React.memo(TaskTable);