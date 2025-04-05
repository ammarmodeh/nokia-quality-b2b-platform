import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  Box,
  TextField,
  DialogActions,
  Button,
  Chip,
  Paper,
} from "@mui/material";
import { Edit, Visibility, Delete, ContentCopy, WhatsApp, Close, Search } from "@mui/icons-material";
import api from "../api/api";
import { useSelector } from "react-redux";
import EditTaskDialog from "./task/EditTaskDialog";
import { MdClose } from "react-icons/md";
import moment from "moment";
import { RiFileExcel2Fill } from "react-icons/ri";

const TaskStatusDialog = ({ open, onClose, tasks: initialTasks, title, setUpdateTasksList }) => {
  const currentUser = useSelector((state) => state?.auth?.user?._id);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState(initialTasks);
  const [filteredTasks, setFilteredTasks] = useState(initialTasks);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [taskToView, setTaskToView] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (initialTasks) {
      const sortedTasks = [...initialTasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTasks(sortedTasks);
      setFilteredTasks(sortedTasks);
    }
  }, [initialTasks]);

  // Handle search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTasks(tasks);
    } else {
      const filtered = tasks.filter(task =>
        task.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.slid?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTasks(filtered);
    }
  }, [searchTerm, tasks]);

  // Custom field display configuration
  const fieldDisplayConfig = {
    customerName: { displayName: "Customer Name" },
    slid: { displayName: "SLID" },
    contactNumber: { displayName: "Contact Number", format: (value) => value || 'N/A' },
    governorate: { displayName: "Governorate" },
    district: { displayName: "District" },
    teamName: { displayName: "Team Name" },
    teamCompany: { displayName: "Team Company" },
    pisDate: {
      displayName: "PIS Date",
      format: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    interviewDate: {
      displayName: "Interview Date",
      format: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    tarrifName: { displayName: "Tariff Name" },
    customerType: { displayName: "Customer Type" },
    customerFeedback: { displayName: "Customer Feedback" },
    reason: { displayName: "Reason" },
    priority: { displayName: "Priority" },
    assignedTo: {
      displayName: "Assigned To",
      format: (value) => value?.map ? value.map(item => item.name).join(', ') : 'N/A'
    },
    createdBy: {
      displayName: "Created By",
      format: (value) => value?.name || 'N/A'
    },
    evaluationScore: { displayName: "Evaluation Score" },
    subTasks: {
      displayName: "Subtasks",
      format: (value) => value?.map ? value.map(sub => `• ${sub.title}: ${sub.note || 'No note'}`).join('\n') : 'N/A'
    },
    validationCat: { displayName: "Validation Category" },
    teamId: { displayName: "Team ID" }
  };

  // Order of fields to display in the view dialog
  const fieldDisplayOrder = [
    'slid',
    'pisDate',
    'customerName',
    'contactNumber',
    'governorate',
    'district',
    'teamName',
    'teamCompany',
    'interviewDate',
    'tarrifName',
    'customerType',
    'customerFeedback',
    'reason',
    'assignedTo',
    'evaluationScore',
    'subTasks'
  ];

  // Format task data for copy/share using the same order as display
  const formatTaskForCopy = (task) => {
    const formattedData = [];

    fieldDisplayOrder.forEach(field => {
      if (task[field] === undefined || task[field] === null) return;

      const config = fieldDisplayConfig[field] || { displayName: field };
      const value = config.format ? config.format(task[field]) : task[field];

      formattedData.push({
        displayName: config.displayName,
        value: value
      });
    });

    return formattedData;
  };

  // Export all tasks to Excel
  const exportToExcel = () => {
    // Prepare the data for Excel
    const data = tasks.map(task => ({
      'SLID': task.slid,
      'PIS Date': task.pisDate ? moment(task.pisDate).format("YYYY-MM-DD") : 'N/A',
      'Interview Date': task.interviewDate ? moment(task.interviewDate).format("YYYY-MM-DD") : 'N/A',
      'Customer Name': task.customerName,
      'Contact Number': task.contactNumber || 'N/A',
      'Customer Type': task.customerType,
      'Evaluation Score': task.evaluationScore,
      'Governorate': task.governorate,
      'District': task.district,
      'Tariff Name': task.tarrifName,
      'Customer Feedback': task.customerFeedback || 'N/A',
      'Reason': task.reason,
      'Team Name': task.teamName,
      'Team Company': task.teamCompany,
      'Assigned To': task.assignedTo?.map ? task.assignedTo.map(item => item.name).join(', ') : 'N/A',
      'Assignee Feedback': task.subTasks?.map ? task.subTasks.map(sub => `${sub.title}: ${sub.note || 'No note'}`).join('; ') : 'N/A',
      // 'Created By': task.createdBy?.name || 'N/A',
      // 'Priority': task.priority,
      // 'Status': task.status
    }));

    // Create a worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Create a workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");

    // Generate the Excel file
    XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${moment().format('YYYY-MM-DD')}.xlsx`);
  };

  // Handle View button click - shows details in dialog
  const handleView = (task) => {
    setTaskToView(task);
    setViewDialogOpen(true);
  };

  // Handle Copy button click
  const handleCopy = (task) => {
    const formattedFields = formatTaskForCopy(task);
    let textToCopy = '';

    formattedFields.forEach(field => {
      textToCopy += `${field.displayName}: ${field.value}\n`;
    });

    navigator.clipboard.writeText(textToCopy)
      .then(() => alert('Task details copied to clipboard!'))
      .catch(err => console.error('Failed to copy text: ', err));
  };

  // Handle WhatsApp share button click
  const handleWhatsAppShare = (task) => {
    const formattedFields = formatTaskForCopy(task);
    let message = 'Task Details:\n\n';

    formattedFields.forEach(field => {
      message += `*${field.displayName}:* ${field.value}\n`;
    });

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleTaskUpdate = (updatedTask) => {
    const updatedTasks = tasks.map((task) =>
      task._id === updatedTask._id ? { ...updatedTask } : task
    );
    setTasks(updatedTasks);
    setFilteredTasks(updatedTasks);
    setEditDialogOpen(false);
  };

  const handleTaskDelete = async (taskId) => {
    const confirmDelete = confirm("Are you sure you want to delete this task?");
    if (!confirmDelete) return;

    try {
      const { data } = await api.get(`/tasks/get-task/${taskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      if (data) {
        const response = await api.post(`/trash/add-trash`, data, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });

        if (response.status === 200) {
          alert("Task added to trash successfully! You can check the trash page.");
          await api.delete(`/tasks/delete-task/${taskId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          });
          const updatedTasks = tasks.filter((task) => task._id !== taskId);
          setTasks(updatedTasks);
          setFilteredTasks(updatedTasks);
          setUpdateTasksList((prevUpdateTasksList) => !prevUpdateTasksList);
        }
      } else {
        alert("Failed to add task to trash.");
      }
    } catch (error) {
      console.error("Error adding task to trash:", error);
    }
  };

  // Clear search input
  const handleClearSearch = () => {
    setSearchTerm("");
  };

  return (
    <>
      {/* Main Dialog */}
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md"
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: "#131111",
            color: "white",
            boxShadow: "none",
          },
        }}
      >
        <DialogTitle sx={{
          backgroundColor: "#998e8e24",
          color: "white",
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{title}</span>
          <Tooltip title="Export to Excel">
            <IconButton
              onClick={exportToExcel}
              sx={{
                color: '#4caf50',
                '&:hover': {
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                }
              }}
            >
              <RiFileExcel2Fill />
            </IconButton>
          </Tooltip>
        </DialogTitle>
        <DialogContent sx={{
          "&.MuiDialogContent-root": {
            padding: 0,
            display: "flex",
            flexDirection: "column",
            height: "70vh" // Adjust this as needed
          }
        }}>
          {/* Search Bar - Fixed position */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              py: 1,
              px: 2,
              gap: 1,
              borderRadius: "0px", // Changed from rounded to square
              backgroundColor: "#121212",
              borderBottom: "1px solid #444",
              "&:focus-within": {
                borderColor: "#3ea6ff",
              },
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <Box sx={{ color: "#9e9e9e" }}>
              <Search />
            </Box>
            <TextField
              fullWidth
              variant="standard"
              placeholder="Search by customer name or SLID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                "& .MuiInputBase-root": {
                  backgroundColor: "transparent",
                  color: "#ffffff",
                },
                "& .MuiInputBase-input": {
                  fontSize: "14px",
                  color: "#ffffff",
                  padding: 0,
                },
                "& .MuiInput-root:before": {
                  borderBottom: "none",
                },
                "& .MuiInput-root:after": {
                  borderBottom: "none",
                },
                "& .MuiInput-root:hover:not(.Mui-disabled):before": {
                  borderBottom: "none",
                },
              }}
              InputProps={{
                disableUnderline: true,
                style: { color: "#ffffff" },
                endAdornment: searchTerm && (
                  <IconButton
                    size="small"
                    onClick={handleClearSearch}
                    sx={{ color: "#9e9e9e", "&:hover": { color: "#ffffff" } }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                ),
              }}
            />
          </Box>

          {/* Scrollable content */}
          <Box sx={{ overflowY: "auto", flex: 1, padding: 2 }}>
            <Stack spacing={2}>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task, index) => (
                  <div key={index}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6">{task.customerName}</Typography>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Copy Task Details">
                          <IconButton onClick={() => handleCopy(task)} color="primary">
                            <ContentCopy />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Share via WhatsApp">
                          <IconButton onClick={() => handleWhatsAppShare(task)} color="success">
                            <WhatsApp />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="View Task Details">
                          <IconButton onClick={() => handleView(task)} color="primary">
                            <Visibility />
                          </IconButton>
                        </Tooltip>

                        {currentUser === (task.createdBy._id || task.createdBy) && (
                          <>
                            <Tooltip title="Edit Task">
                              <IconButton onClick={() => handleEdit(task)} sx={{ color: 'beige' }}>
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Task">
                              <IconButton onClick={() => handleTaskDelete(task._id)} color="error">
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </Stack>
                    <Typography variant="body1">
                      <strong>SLID:</strong> {task.slid}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Customer Name:</strong> {task.customerName}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Customer Feedback:</strong> {task.customerFeedback || 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Evaluation Score:</strong> {task.evaluationScore}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                  </div>
                ))
              ) : (
                <Typography variant="body1" sx={{ textAlign: 'center', py: 3 }}>
                  No tasks found matching your search criteria
                </Typography>
              )}
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Task Details View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        fullWidth
        maxWidth="md"
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: '#1e1e1e',
            boxShadow: 'none',
            borderRadius: '8px',
          }
        }}
      >
        <DialogTitle sx={{
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          borderBottom: '1px solid #444',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" component="div">
              Task Details
            </Typography>
            {taskToView?.customerName && (
              <Typography
                variant="subtitle1"
                sx={{
                  color: '#3ea6ff',
                  fontStyle: 'italic'
                }}
              >
                {taskToView.customerName}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              display: 'flex',
              ml: 2
            }}
          >
            <Tooltip title="Copy Task Details">
              <IconButton
                onClick={() => handleCopy(taskToView)}
                sx={{
                  mr: 1,
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#2a2a2a',
                  }
                }}
              >
                <ContentCopy />
              </IconButton>
            </Tooltip>
            <IconButton
              onClick={() => setViewDialogOpen(false)}
              sx={{
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#2a2a2a',
                }
              }}
            >
              <MdClose />
            </IconButton>
          </Box>
        </DialogTitle>

        <Divider sx={{ backgroundColor: '#444' }} />

        <DialogContent dividers sx={{
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          padding: '20px 24px',
        }}>
          {taskToView && (
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
                  <DetailRow label="Request Number" value={taskToView.requestNumber} />
                  <DetailRow label="SLID" value={taskToView.slid} />
                  <DetailRow label="Customer Name" value={taskToView.customerName} />
                  <DetailRow label="Contact Number" value={taskToView.contactNumber} />
                  <DetailRow label="PIS Date" value={moment(taskToView.pisDate).format("YYYY-MM-DD")} />
                  <DetailRow label="Tariff Name" value={taskToView.tarrifName} />
                  <DetailRow label="Customer Type" value={taskToView.customerType} />
                  <DetailRow label="Interview Date" value={moment(taskToView.interviewDate).format("YYYY-MM-DD")} />
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
                  <DetailRow label="Governorate" value={taskToView.governorate} />
                  <DetailRow label="District" value={taskToView.district} />
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
                  <DetailRow label="Team Name" value={taskToView.teamName} />
                  <DetailRow label="Team Company" value={taskToView.teamCompany} />
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
                          label={`${taskToView.evaluationScore} (${taskToView.evaluationScore >= 9 ? 'Promoter' :
                            taskToView.evaluationScore >= 7 ? 'Neutral' : 'Detractor'
                            })`}
                          sx={{
                            color: '#ffffff',
                            backgroundColor:
                              taskToView.evaluationScore >= 9 ? '#4caf50' :
                                taskToView.evaluationScore >= 7 ? '#9e9e9e' : '#f44336',
                            fontWeight: 'bold'
                          }}
                        />
                      </Box>
                    }
                  />
                  <DetailRow label="Customer Feedback" value={taskToView.customerFeedback} />
                  <DetailRow label="Reason" value={taskToView.reason} />
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
            onClick={() => setViewDialogOpen(false)}
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

      {/* EditTaskDialog */}
      {selectedTask && (
        <EditTaskDialog
          open={editDialogOpen}
          setOpen={setEditDialogOpen}
          task={selectedTask}
          handleTaskUpdate={handleTaskUpdate}
        />
      )}
    </>
  );
};

const DetailRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
    <Typography
      variant="body2"
      component="div"
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

export default TaskStatusDialog;