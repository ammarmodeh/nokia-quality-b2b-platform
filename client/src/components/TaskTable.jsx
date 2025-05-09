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
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import { getWeekNumberForTaksTable, newFormatDate } from "../utils/helpers";
import { useEffect, useState } from "react";
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
    Team Company: ${taskData.teamCompany}
    Tariff Name: ${taskData.tarrifName}
    Customer Type: ${taskData.customerType}
    Customer Feedback: ${taskData.customerFeedback}
    Reason: ${taskData.reason}
    Evaluation Score: ${taskData.evaluationScore}
    Impact Level: ${taskData.impactLevel || taskData.priority || 'Not specified'}
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

const TaskTable = ({ tasks }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [teamsData, setTeamsData] = useState([]);
  // console.log({ teamsData });
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const isMobile = useMediaQuery('(max-width:503px)');

  // Fetch teams data when component mounts
  useEffect(() => {
    const fetchTeamsData = async () => {
      try {
        const response = await api.get('/field-teams/get-field-teams', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        setTeamsData(response.data);
        setLoadingTeams(false);
      } catch (error) {
        console.error("Failed to fetch teams data:", error);
        setLoadingTeams(false);
      }
    };

    fetchTeamsData();
  }, []);

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
      // First, calculate team statistics including impact levels
      const teamStats = {};

      tasks.forEach(task => {
        const teamId = task.teamId?.$oid || task.teamId;
        if (!teamStats[teamId]) {
          teamStats[teamId] = {
            totalViolations: 0,
            neutrals: 0,
            detractors: 0,
            lowPriority: 0,
            mediumPriority: 0,
            highPriority: 0,
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
          teamStats[teamId].lowPriority++;
        } else if (priority === 'Medium') {
          teamStats[teamId].mediumPriority++;
        } else if (priority === 'High') {
          teamStats[teamId].highPriority++;
        }
      });

      // Define the export columns
      const exportColumns = [
        { header: "SLID", field: "slid" },
        { header: "Week", field: "weekNumber" },
        { header: "Customer", field: "customerName" },
        { header: "Feedback", field: "customerFeedback" },
        { header: "Score", field: "evaluationScore" },
        { header: "Impact Level", field: "impactLevel" },
        { header: "Team", field: "teamName" },
        { header: "Company", field: "teamCompany" },
        { header: "PIS Date", field: "pisDate" },
        { header: "Last Session", field: "lastSession" },
        { header: "Neutrals (7-8)", field: "neutrals" },
        { header: "Detractors (0-6)", field: "detractors" },
        { header: "Total Violations", field: "totalViolations" },
        // Add new columns for impact levels
        { header: "Low Priority", field: "lowPriority" },
        { header: "Medium Priority", field: "mediumPriority" },
        { header: "High Priority", field: "highPriority" },
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
          lowPriority: 0,
          mediumPriority: 0,
          highPriority: 0
        };

        // Calculate week number
        const weekNumber = getWeekNumberForTaksTable(new Date(task.interviewDate?.$date || task.interviewDate));

        // Get team data if available
        const teamData = getTeamData(teamId);

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
            sessionInfo = `Completed (${moment(lastSession.sessionDate?.$date || lastSession.sessionDate).format('YYYY-MM-DD')}`;
          }
          // Priority 2: Use most recent other session if no completed sessions
          else if (otherSessions.length > 0) {
            lastSession = otherSessions[0];
            sessionStatus = 'Missed';
            sessionInfo = `Missed (${moment(lastSession.sessionDate?.$date || lastSession.sessionDate).format('YYYY-MM-DD')}`;
          }
        }

        return {
          slid: task.slid,
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
          teamEvaluationScore: teamData?.evaluationScore || 'N/A',
          neutrals: stats.neutrals,
          detractors: stats.detractors,
          totalViolations: stats.totalViolations,
          lowPriority: stats.lowPriority,
          mediumPriority: stats.mediumPriority,
          highPriority: stats.highPriority,
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
  const filteredTasks = tasks.filter(task => {
    const interviewDate = new Date(task.interviewDate);
    if (isNaN(interviewDate)) {
      // console.error("Invalid interviewDate for task:", task);
      return false;
    }

    return getWeekNumberForTaksTable(interviewDate) !== null; // Ensures tasks belong to a valid week
  });

  const sortedTasks = filteredTasks.sort((a, b) => new Date(b.interviewDate) - new Date(a.interviewDate));
  // console.log({ sortedTasks });

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
            color: '#3ea6ff',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: 'rgba(62, 166, 255, 0.1)'
            }
          }}
        // startIcon={<MdRequestPage />}
        >
          {params.value}
        </Button>
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
            backgroundColor: '#333',
            color: '#ffffff',
            borderRadius: '50%',
            width: 30,
            height: 30
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
            {/* <MdAssessment sx={{ mr: 1 }} /> */}
            {/* {score} ({label}) */}
            {score}
          </Box>
        );
      },
    },
    {
      field: "impactLevel",
      headerName: "Impact Level",
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
          {/* <MdGroups sx={{ mr: 1, color: '#9c27b0' }} /> */}
          {params.value}
        </Box>
      )
    },
    {
      field: "company",
      headerName: "Company",
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* <Box sx={{ mr: 1, color: '#fffff' }}>
            <MdBusiness />
          </Box> */}
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
          {/* <Box sx={{ mr: 1, color: '#fffff' }}>
            <MdDateRange />
          </Box> */}
          {newFormatDate(params.value)}
        </Box>
      ),
    },
    // {
    //   field: "isActive",
    //   headerName: "Team Status",
    //   minWidth: 100,
    //   align: 'center',
    //   headerAlign: 'center',
    //   renderCell: (params) => {
    //     const teamData = getTeamData(params.row.teamId);
    //     return (
    //       <Box sx={{
    //         display: 'flex',
    //         alignItems: 'center',
    //         justifyContent: 'center',
    //         color: teamData?.isActive ? '#4caf50' : '#f44336',
    //         fontWeight: 'bold'
    //       }}>
    //         {teamData ? (teamData.isActive ? 'Active' : 'Inactive') : 'N/A'}
    //       </Box>
    //     );
    //   },
    // },
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
              color: lastSession ? '#3ea6ff' : '#9e9e9e',
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
        const teamData = getTeamData(params.row.teamId);
        return (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 'bold'
          }}>
            {teamData?.evaluationScore || 'N/A'}
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
            color: '#3ea6ff',
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
            SLID: ${params.row.slid}
            Customer Name: ${params.row.customerName}
            Contact Number: ${params.row.contactNumber}
            PIS Date: ${moment(params.row.pisDate).format("YYYY-MM-DD")}
            Governorate: ${params.row.governorate}
            District: ${params.row.district}
            Team Name: ${params.row.teamName}
            Team Company: ${params.row.teamCompany}
            Tariff Name: ${params.row.tarrifName}
            Customer Type: ${params.row.customerType}
            Customer Feedback: ${params.row.customerFeedback}
            Reason: ${params.row.reason}
            Evaluation Score: ${params.row.evaluationScore}
            Impact Level: ${params.row.impactLevel || params.row.priority || 'Not specified'}
            Interview Date: ${moment(params.row.interviewDate).format("YYYY-MM-DD")}
            Week Number: ${params.row.weekNumber}
          `.trim();

          navigator.clipboard.writeText(formattedData);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
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
  // Map tasks correctly with the new week numbering system
  const rows = sortedTasks.map((task, index) => ({
    id: index + 1,
    slid: task.slid,
    customerName: task.customerName,
    customerFeedback: task.customerFeedback,
    impactLevel: task.priority,  // This ensures the field is available as impactLevel
    priority: task.priority,     // Keep the original field as well for compatibility
    weekNumber: getWeekNumberForTaksTable(new Date(task.interviewDate)),
    evaluationScore: task.evaluationScore,
    team: task.teamName,
    company: task.teamCompany,
    pisDate: task.pisDate,
    status: task._id,
    teamId: task.teamId?.$oid || task.teamId,
    // Add all the fields needed for copying
    contactNumber: task.contactNumber,
    requestNumber: task.requestNumber,
    governorate: task.governorate,
    district: task.district,
    teamName: task.teamName,
    teamCompany: task.teamCompany,
    tarrifName: task.tarrifName,
    customerType: task.customerType,
    reason: task.reason,
    interviewDate: task.interviewDate,
  }));

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
      <Paper sx={{ height: 400, width: "100%", backgroundColor: "#272727" }}>
        <DataGrid
          rows={rows}
          columns={taskColumns}
          getRowHeight={() => 40}
          disableColumnResize
          pageSizeOptions={[5, 10, 25]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel} // Handle updates
          disableVirtualization={true}
          sx={{
            border: 0,
            color: "#ffffff", // Ensure text color is white
            "& .MuiDataGrid-filler": {
              backgroundColor: "#333", // This changes the filler area color
            },
            "& .MuiDataGrid-main": {
              backgroundColor: "#272727", // Dark background for the entire table
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#333", // Darker background for headers
              color: "#9e9e9e", // Light gray text for headers
              fontSize: "0.875rem", // Smaller font size for headers
              fontWeight: "bold", // Bold text for headers
              borderBottom: "1px solid #444", // Add border below headers
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#333", // Ensure individual headers also have the dark background
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid #444", // Add border between rows
            },
            "& .MuiDataGrid-row": {
              backgroundColor: "#272727", // Dark background for rows
              "&:hover": {
                backgroundColor: "#333", // Darker background on row hover
              },
            },
            "& .MuiDataGrid-footerContainer": {
              minHeight: "64px", // Set the height of the footer
              backgroundColor: "#333", // Darker background for footer
              color: "#ffffff", // Ensure text color in footer is white
              borderTop: "1px solid #444", // Add border above footer
              "& .MuiTablePagination-root": {
                color: "#ffffff", // Ensure pagination text color is white
              },
            },
            "& .MuiDataGrid-virtualScroller": {
              overflow: "auto", // Allow scrolling for the body
              "&::-webkit-scrollbar": {
                width: "8px", // Set scrollbar width
                height: "8px", // Set scrollbar height
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#666", // Dark gray scrollbar thumb
                borderRadius: "4px", // Rounded corners for the thumb
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "#444", // Dark gray scrollbar track
              },
            },
            // Fix for the white scrollbar filler
            "& .MuiDataGrid-scrollbarFiller": {
              backgroundColor: "#333", // Match the header background color
            },
          }}
        />
      </Paper>

      {/* Task Details Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: '#1e1e1e',
            boxShadow: 'none',
            borderRadius: fullScreen ? '0px' : '8px', // Remove border radius for mobile view
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          borderBottom: '1px solid #444',
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

        <Divider sx={{ backgroundColor: '#444' }} />

        <DialogContent dividers sx={{
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          padding: '20px 24px',
        }}>
          {selectedTask && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Basic Information Section */}
              <Paper elevation={0} sx={{
                p: 2,
                backgroundColor: '#272727',
                borderRadius: 2,
                border: '1px solid #444'
              }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#3ea6ff' }}>
                  Basic Information
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <DetailRow label="Request Number" value={selectedTask.requestNumber} />
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
                backgroundColor: '#272727',
                borderRadius: 2,
                border: '1px solid #444'
              }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#3ea6ff' }}>
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
                backgroundColor: '#272727',
                borderRadius: 2,
                border: '1px solid #444'
              }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#3ea6ff' }}>
                  Team Information
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <DetailRow label="Team Name" value={selectedTask.teamName} />
                  <DetailRow label="Team Company" value={selectedTask.teamCompany} />
                </Box>
              </Paper>

              {/* Team Status Section */}
              <Paper elevation={0} sx={{
                p: 2,
                backgroundColor: '#272727',
                borderRadius: 2,
                border: '1px solid #444'
              }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#3ea6ff' }}>
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
                  <DetailRow label="Team Evaluation Score" value={selectedTask.teamData?.evaluationScore || 'N/A'} />
                  {selectedTask.teamData?.sessionHistory?.[0] && (
                    <DetailRow
                      label="Last Session"
                      value={
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body1" sx={{ color: '#ffffff' }}>
                            {selectedTask.teamData.sessionHistory[0].sessionTitle}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#aaaaaa' }}>
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
                backgroundColor: '#272727',
                borderRadius: 2,
                border: '1px solid #444'
              }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#3ea6ff' }}>
                  Evaluation
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <DetailRow
                    label="Evaluation Score"
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
                                selectedTask.evaluationScore >= 7 ? '#9e9e9e' : '#f44336',
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

        <Divider sx={{ backgroundColor: '#444' }} />

        <DialogActions sx={{
          backgroundColor: '#1e1e1e',
          borderTop: '1px solid #444',
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
      component="div" // Add this to change from <p> to <div>
      sx={{
        fontWeight: '500',
        color: '#aaaaaa'
      }}
    >
      {label}
    </Typography>
    {typeof value === 'string' || typeof value === 'number' ? (
      <Typography
        variant="body1"
        component="div" // Add this to change from <p> to <div>
        sx={{
          color: '#ffffff',
          wordBreak: 'break-word'
        }}
      >
        {value || 'N/A'}
      </Typography>
    ) : (
      // For non-string values (like the Chip component)
      <Box sx={{ display: 'inline-block' }}>
        {value}
      </Box>
    )}
  </Box>
);

export default TaskTable;
