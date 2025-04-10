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
import { getWeekNumberForTaksTable } from "../utils/helpers";
import { useState } from "react";
import { FaCopy, FaTimes } from "react-icons/fa";

const handleCopyTaskData = (taskData) => {
  // Format the data for copying
  const formattedData = `
    Request Number: ${taskData.requestNumber}
    SLID: ${taskData.slid}
    Customer Name: ${taskData.customerName}
    Contact Number: ${taskData.contactNumber}
    PIS Date: ${moment(taskData.pisDate).format("YYYY-MM-DD")}
    Governorate: ${taskData.governorate}
    District: ${taskData.district}
    Team Name: ${taskData.teamName}
    Team Company: ${taskData.teamCompany}
    Tariff Name: ${taskData.tarrifName}
    Customer Type: ${taskData.customerType}
    Customer Feedback: ${taskData.customerFeedback}
    Reason: ${taskData.reason}
    Evaluation Score: ${taskData.evaluationScore}
    Interview Date: ${moment(taskData.interviewDate).format("YYYY-MM-DD")}
  `.trim();

  // Copy to clipboard
  navigator.clipboard.writeText(formattedData)
    .then(() => {
      alert("Task data copied to clipboard!");
    })
    .catch((err) => {
      // console.error("Failed to copy: ", err);
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
  const [selectedTask, setSelectedTask] = useState(null);

  const handleClickOpen = (task) => {
    setSelectedTask(task);
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
    setSelectedTask(null);
  };

  const exportToExcel = (rows, columns) => {
    const headers = columns.map(column => column.headerName);
    const data = rows.map(row => columns.map(column => row[column.field] || ""));

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

    XLSX.writeFile(workbook, "tasks_overview.xlsx");
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
      renderCell: (params) => (
        <div
          style={{ cursor: "pointer", textDecoration: "underline" }}
          onClick={() => handleClickOpen(params.row)}
        >
          {params.value}
        </div>
      ),
    },
    {
      field: "weekNumber",
      headerName: "Wk",
      flex: 0.5,
      valueGetter: (params) => {
        return params; // Corrected
      },
    },
    {
      field: "evaluationScore",
      headerName: "Evaluation Score",
      flex: 2.5,
      renderCell: (params) => {
        const score = params.value;
        let color = "black";
        let label = "Unknown";

        if (score >= 1 && score <= 6) {
          color = "red";
          label = "Detractor";
        } else if (score >= 7 && score <= 8) {
          color = "gray";
          label = "Neutral";
        } else if (score >= 9 && score <= 10) {
          color = "green";
          label = "Promoter";
        }

        return <span style={{ color, fontWeight: "bold" }}>{score} ({label})</span>;
      },
    },
    { field: "team", headerName: "Team Name", flex: 3, sortable: false },
    { field: "company", headerName: "Team Farm", minWidth: 100, sortable: false },
    {
      field: "pisDate",
      headerName: "PIS Date",
      minWidth: 150,
      valueGetter: (params) => {
        return moment(params).format("YYYY-MM-DD");
      },
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 100,
      renderCell: (params) => (
        <div
          className="cursor-pointer text-blue-500 font-bold underline"
          onClick={() => navigate(`/tasks/view-task/${params.row.status}`)}
        >
          check status
        </div>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      renderCell: (params) => (
        <Typography
          sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <IconButton>
            <FaCopy size={20} style={{ cursor: "pointer", color: '#d6c0c0' }} onClick={() => handleCopyTaskData(params.row)} />
          </IconButton>
        </Typography>
      ),
    },
  ];

  // Map tasks correctly with the new week numbering system
  const rows = sortedTasks.map((task, index) => ({
    id: index + 1,
    slid: task.slid,
    weekNumber: getWeekNumberForTaksTable(new Date(task.interviewDate)),
    evaluationScore: task.evaluationScore,
    team: task.teamName,
    company: task.teamCompany,
    pisDate: task.pisDate,
    status: task._id,
    // Add all the fields needed for copying
    contactNumber: task.contactNumber,
    requestNumber: task.requestNumber,
    governorate: task.governorate,
    district: task.district,
    teamName: task.teamName,
    teamCompany: task.teamCompany,
    tarrifName: task.tarrifName,
    customerType: task.customerType,
    customerFeedback: task.customerFeedback,
    customerName: task.customerName,
    reason: task.reason,
    interviewDate: task.interviewDate,
  }));

  return (
    <Box sx={{ marginBottom: "20px" }}>
      <Stack direction={"row"} justifyContent={"space-between"} alignItems={"center"} sx={{ marginBottom: "10px" }}>
        <Typography variant="h6" fontWeight="bold" sx={{ color: "#ffffff" }}>
          Tasks Overview
        </Typography>
        <Button
          variant="contained"
          sx={{ backgroundColor: '#1D4ED8', py: 1, lineHeight: 1, fontSize: '0.8rem' }}
          color="primary"
          onClick={() => {
            const columnsWithoutStatus = taskColumns.filter(column => column.field !== "status");
            exportToExcel(rows, columnsWithoutStatus);
          }}
        >
          Export CSV
        </Button>
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
