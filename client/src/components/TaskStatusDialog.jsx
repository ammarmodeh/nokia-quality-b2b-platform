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
  LinearProgress,
  Avatar,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Edit, Visibility, Delete, ContentCopy, WhatsApp, Close, Search } from "@mui/icons-material";
import api from "../api/api";
import { useSelector } from "react-redux";
import EditTaskDialog from "./task/EditTaskDialog";
import { MdClose } from "react-icons/md";
import moment from "moment";
import { RiFileExcel2Fill } from "react-icons/ri";

const TaskStatusDialog = ({ open, onClose, tasks: initialTasks, title, setUpdateTasksList }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const currentUser = useSelector((state) => state?.auth?.user?._id);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState(initialTasks);
  const [filteredTasks, setFilteredTasks] = useState(initialTasks);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [taskToView, setTaskToView] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  // const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    if (initialTasks) {
      const sortedTasks = [...initialTasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTasks(sortedTasks);
      setFilteredTasks(sortedTasks);
    }
  }, [initialTasks]);

  // Debounce search term


  // Handle search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTasks(tasks);
    } else {
      const lowerSearch = searchTerm.toLowerCase();
      const filtered = tasks.filter(task =>
        task.customerName?.toLowerCase().includes(lowerSearch) ||
        task.slid?.toLowerCase().includes(lowerSearch)
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
    reason: { displayName: "Reason (Level 1)" },
    subReason: { displayName: "Sub Reason (Level 2)" },
    rootCause: { displayName: "Root Cause (Level 3)" },
    responsible: { displayName: "Responsibility" },
    priority: { displayName: "Priority" },
    assignedTo: {
      displayName: "Assigned To",
      format: (value) => value?.map ? value.map(item => item.name).join(', ') : 'N/A'
    },
    createdBy: {
      displayName: "Created By",
      format: (value) => value?.name || 'N/A'
    },
    evaluationScore: { displayName: "Satisfaction Score" },
    subTasks: {
      displayName: "Subtasks",
      format: (value) => value?.map ? value.map(sub => `• ${sub.title}: ${sub.note || 'No note'}`).join('\n') : 'N/A'
    },
    ontType: { displayName: "ONT Type" },
    freeExtender: { displayName: "Free Extender" },
    extenderType: { displayName: "Extender Type" },
    extenderNumber: { displayName: "Number of Extenders" },
    closureCallEvaluation: { displayName: "Closure Call Evaluation" },
    closureCallFeedback: { displayName: "Closure Call Feedback" },
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
    'responsible',
    'reason',
    'subReason',
    'rootCause',
    'assignedTo',
    'evaluationScore',
    'ontType',
    'freeExtender',
    'extenderType',
    'extenderNumber',
    'closureCallEvaluation',
    'closureCallFeedback',
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
      'Satisfaction Score': task.evaluationScore,
      'Governorate': task.governorate,
      'District': task.district,
      'Tariff Name': task.tarrifName,
      'Customer Feedback': task.customerFeedback || 'N/A',
      'Responsibility': task.responsible,
      'Reason (Level 1)': task.reason,
      'Sub Reason (Level 2)': task.subReason,
      'Root Cause (Level 3)': task.rootCause,
      'Team Name': task.teamName,
      'Team Company': task.teamCompany,
      'ONT Type': task.ontType || 'N/A',
      'Free Extender': task.freeExtender || 'No',
      'Extender Type': task.extenderType || 'N/A',
      'Extender Number': task.extenderNumber || 0,
      'Closure Call Evaluation': task.closureCallEvaluation || 'N/A',
      'Closure Call Feedback': task.closureCallFeedback || 'N/A',
      'Assigned To': task.assignedTo?.map ? task.assignedTo.map(item => item.name).join(', ') : 'N/A',
      'Assignee Feedback': task.subTasks?.map ? task.subTasks.map(sub => `${sub.title}: ${sub.note || 'No note'}`).join('; ') : 'N/A',
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
  const handleView = async (task) => {
    setViewDialogOpen(true);
    setViewLoading(true);
    try {
      const { data } = await api.get(`/tasks/get-task/${task._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      // Merge with task from list to ensure we have populated fields like assignedTo/createdBy if missing
      setTaskToView({ ...task, ...data });
    } catch (error) {
      console.error("Error fetching task details:", error);
      setTaskToView(task); // Fallback to list data
    } finally {
      setViewLoading(false);
    }
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
      .catch(err => {
        console.error('Failed to copy text: ', err)
      });
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
      {/* Main Dialog - Mobile Optimized */}
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen
        // fullWidth
        // maxWidth="md"
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: "#131111",
            color: "white",
            boxShadow: "none",
            [theme.breakpoints.down('sm')]: {
              margin: 0,
              borderRadius: 0,
            },
          },
        }}
      >
        <DialogTitle component="div" sx={{
          backgroundColor: "#998e8e24",
          color: "white",
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: isMobile ? 1 : 2,
          px: isMobile ? 1 : 3,
        }}>
          <Typography variant={isMobile ? "subtitle1" : "h6"} component="div" sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                <RiFileExcel2Fill fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
            </Tooltip>
            <IconButton
              onClick={onClose}
              size={isMobile ? "small" : "medium"}
              sx={{
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <MdClose />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{
          "&.MuiDialogContent-root": {
            padding: 0,
            display: "flex",
            flexDirection: "column",
            height: isMobile ? "calc(100vh - 112px)" : "70vh",
          }
        }}>
          {/* Search Bar - Mobile Optimized */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              py: isMobile ? 0.5 : 1,
              px: isMobile ? 1 : 2,
              gap: 1,
              backgroundColor: "#2d2d2d",
              borderBottom: "1px solid #e5e7eb",
              "&:focus-within": {
                borderColor: "#7b68ee",
              },
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <Box sx={{ color: "#b3b3b3" }}>
              <Search fontSize={isMobile ? "small" : "medium"} />
            </Box>
            <TextField
              fullWidth
              variant="standard"
              placeholder="Search by name or SLID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                "& .MuiInputBase-root": {
                  backgroundColor: "transparent",
                  color: "#ffffff",
                },
                "& .MuiInputBase-input": {
                  fontSize: isMobile ? "13px" : "14px",
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
                    sx={{ color: "#b3b3b3", "&:hover": { color: "#ffffff" } }}
                  >
                    <Close fontSize={isMobile ? "small" : "medium"} />
                  </IconButton>
                ),
              }}
            />
          </Box>

          {/* Scrollable content - Mobile Optimized */}
          <Box sx={{
            overflowY: "auto",
            flex: 1,
            padding: isMobile ? 1 : 2,
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#e5e7eb',
              borderRadius: '2px',
            },
          }}>
            <Stack spacing={isMobile ? 1.5 : 2}>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task, index) => (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{
                      p: isMobile ? 1 : 2,
                      backgroundColor: '#2d2d2d',
                      borderRadius: 1,
                      border: '1px solid #f3f4f6',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant={isMobile ? "subtitle2" : "h6"} sx={{ fontWeight: 500, color: '#ffffff' }}>
                          {task.customerName}
                        </Typography>
                        <Typography variant={isMobile ? "caption" : "body2"} sx={{ color: '#aaa' }}>
                          SLID: {task.slid}
                        </Typography>
                        <Typography variant={isMobile ? "caption" : "body2"} sx={{ display: 'block', mt: 0.5, color: '#aaa' }}>
                          <Box component="span">Score:</Box> {task.evaluationScore}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant={isMobile ? "caption" : "body2"} sx={{ color: '#aaa' }}>
                            <Box component="span">Assignee:</Box>
                          </Typography>
                          <Chip
                            label={task.assignedTo?.[0]?.name || "Not Assigned"}
                            size="small"
                            sx={{
                              color: '#ffffff',
                              backgroundColor: task.assignedTo?.[0] ? 'primary.main' : 'grey.600',
                              fontSize: isMobile ? '0.75rem' : '0.8125rem'
                            }}
                          />
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={isMobile ? 0.5 : 1}>
                        <Tooltip title="Copy">
                          <IconButton
                            onClick={() => handleCopy(task)}
                            size={isMobile ? "small" : "medium"}
                            sx={{ color: '#7b68ee' }}
                          >
                            <ContentCopy fontSize={isMobile ? "small" : "medium"} />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="WhatsApp">
                          <IconButton
                            onClick={() => handleWhatsAppShare(task)}
                            size={isMobile ? "small" : "medium"}
                            sx={{ color: '#25D366' }}
                          >
                            <WhatsApp fontSize={isMobile ? "small" : "medium"} />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="View">
                          <IconButton
                            onClick={() => handleView(task)}
                            size={isMobile ? "small" : "medium"}
                            sx={{ color: '#ffffff' }}
                          >
                            <Visibility fontSize={isMobile ? "small" : "medium"} />
                          </IconButton>
                        </Tooltip>

                        {currentUser === (task.createdBy._id || task.createdBy) && (
                          <>
                            <Tooltip title="Edit">
                              <IconButton
                                onClick={() => handleEdit(task)}
                                size={isMobile ? "small" : "medium"}
                                sx={{ color: 'beige' }}
                              >
                                <Edit fontSize={isMobile ? "small" : "medium"} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                onClick={() => handleTaskDelete(task._id)}
                                size={isMobile ? "small" : "medium"}
                                sx={{ color: '#f44336' }}
                              >
                                <Delete fontSize={isMobile ? "small" : "medium"} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                ))
              ) : (
                <Typography variant="body2" sx={{ textAlign: 'center', py: 3, color: '#aaa' }}>
                  No tasks found matching your search
                </Typography>
              )}
            </Stack>
          </Box>
        </DialogContent>

        {isMobile && (
          <DialogActions sx={{
            backgroundColor: '#2d2d2d',
            borderTop: '1px solid #e5e7eb',
            px: 2,
            py: 1,
          }}>
            <Button
              onClick={onClose}
              size="small"
              sx={{
                color: '#ffffff',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              Close
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Task Details View Dialog - Mobile Optimized */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        fullScreen
        // fullWidth
        // maxWidth="md"
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: '#2d2d2d',
            boxShadow: 'none',
            borderRadius: isMobile ? 0 : '8px',
          }
        }}
      >
        <DialogTitle component="div" sx={{
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: isMobile ? '12px 16px' : '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant={isMobile ? "subtitle1" : "h6"} component="div" sx={{ fontWeight: 500 }}>
              Task Details
            </Typography>
            {taskToView?.customerName && (
              <Typography
                variant={isMobile ? "caption" : "subtitle1"}
                component="div"
                sx={{
                  color: '#7b68ee',
                  fontStyle: 'italic'
                }}
              >
                {taskToView.customerName}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Copy">
              <IconButton
                onClick={() => handleCopy(taskToView)}
                size={isMobile ? "small" : "medium"}
                sx={{
                  mr: 1,
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#2a2a2a',
                  }
                }}
              >
                <ContentCopy fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
            </Tooltip>
            <IconButton
              onClick={() => setViewDialogOpen(false)}
              size={isMobile ? "small" : "medium"}
              sx={{
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#2a2a2a',
                }
              }}
            >
              <MdClose fontSize={isMobile ? "18px" : "24px"} />
            </IconButton>
          </Box>
        </DialogTitle>

        <Divider sx={{ backgroundColor: '#e5e7eb' }} />

        <DialogContent dividers sx={{
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          padding: isMobile ? '12px 16px' : '20px 24px',
          minHeight: '200px',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#e5e7eb',
            borderRadius: '2px',
          },
        }}>
          {viewLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '200px' }}>
              <Typography sx={{ color: '#aaa' }}>Loading details...</Typography>
            </Box>
          ) : taskToView && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 2 : 3 }}>
              {/* Basic Information Section */}
              <Paper elevation={0} sx={{
                p: isMobile ? 1.5 : 2,
                backgroundColor: '#2d2d2d',
                borderRadius: 2,
                border: '1px solid #3d3d3d'
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee' }}>
                  Basic Info
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: isMobile ? 1.5 : 2
                }}>
                  <DetailRow label="Request Number" value={taskToView.requestNumber} isMobile={isMobile} />
                  <DetailRow label="SLID" value={taskToView.slid} isMobile={isMobile} />
                  <DetailRow label="Customer Name" value={taskToView.customerName} isMobile={isMobile} />
                  <DetailRow label="Contact Number" value={taskToView.contactNumber} isMobile={isMobile} />
                  <DetailRow label="PIS Date" value={moment(taskToView.pisDate).format("YYYY-MM-DD")} isMobile={isMobile} />
                  <DetailRow label="Tariff Name" value={taskToView.tarrifName} isMobile={isMobile} />
                  <DetailRow label="Customer Type" value={taskToView.customerType} isMobile={isMobile} />
                  <DetailRow label="Interview Date" value={moment(taskToView.interviewDate).format("YYYY-MM-DD")} isMobile={isMobile} />
                </Box>
              </Paper>

              {/* Location Information Section */}
              <Paper elevation={0} sx={{
                p: isMobile ? 1.5 : 2,
                backgroundColor: '#2d2d2d',
                borderRadius: 2,
                border: '1px solid #3d3d3d'
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee' }}>
                  Location
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: isMobile ? 1.5 : 2
                }}>
                  <DetailRow label="Governorate" value={taskToView.governorate} isMobile={isMobile} />
                  <DetailRow label="District" value={taskToView.district} isMobile={isMobile} />
                </Box>
              </Paper>

              {/* Team Information Section */}
              <Paper elevation={0} sx={{
                p: isMobile ? 1.5 : 2,
                backgroundColor: '#2d2d2d',
                borderRadius: 2,
                border: '1px solid #3d3d3d'
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee' }}>
                  Team Info
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: isMobile ? 1.5 : 2
                }}>
                  <DetailRow label="Team Name" value={taskToView.teamName} isMobile={isMobile} />
                  <DetailRow label="Team Company" value={taskToView.teamCompany} isMobile={isMobile} />
                </Box>
              </Paper>

              {/* Evaluation Section */}
              <Paper elevation={0} sx={{
                p: isMobile ? 1.5 : 2,
                backgroundColor: '#2d2d2d',
                borderRadius: 2,
                border: '1px solid #3d3d3d'
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee' }}>
                  Evaluation
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: isMobile ? 1.5 : 2
                }}>
                  <DetailRow
                    label="Satisfaction Score"
                    value={
                      <Box component="span">
                        <Chip
                          label={`${taskToView.evaluationScore} (${taskToView.evaluationScore >= 9 ? 'Promoter' :
                            taskToView.evaluationScore >= 7 ? 'Neutral' : 'Detractor'
                            })`}
                          size={isMobile ? "small" : "medium"}
                          sx={{
                            color: '#ffffff',
                            backgroundColor:
                              taskToView.evaluationScore >= 9 ? '#4caf50' :
                                taskToView.evaluationScore >= 7 ? '#6b7280' : '#f44336',
                            fontWeight: 'bold'
                          }}
                        />
                      </Box>
                    }
                    isMobile={isMobile}
                  />
                  <DetailRow label="Customer Feedback" value={taskToView.customerFeedback} isMobile={isMobile} />
                  <DetailRow label="Reason" value={taskToView.reason} isMobile={isMobile} />
                </Box>
              </Paper>

              {/* Progress Section */}
              {taskToView?.subTasks?.[0]?.note && (
                <Paper elevation={0} sx={{
                  p: isMobile ? 1.5 : 2,
                  backgroundColor: '#2d2d2d',
                  borderRadius: 2,
                  border: '1px solid #3d3d3d'
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee' }}>
                    Progress
                  </Typography>

                  {/* Progress Bar with Assigned Team Members */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant={isMobile ? "caption" : "body2"} sx={{ color: '#eff5ff' }}>
                        Progress: {taskToView?.subTasks?.length > 0 ? Math.round((100 / taskToView.subTasks.length) * taskToView.subTasks.filter(t => t.note).length) : 0}%
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {taskToView.assignedTo?.map((user, index) => (
                          <Tooltip key={index} title={user.name}>
                            <Avatar sx={{
                              width: isMobile ? 24 : 28,
                              height: isMobile ? 24 : 28,
                              fontSize: isMobile ? '0.7rem' : '0.8rem',
                              backgroundColor: '#3a4044',
                              border: '2px solid',
                              borderColor: taskToView?.subTasks?.some(t => t.completedBy?._id === user._id) ? '#4caf50' : '#f44336'
                            }}>
                              {user?.name
                                ?.split(' ')
                                .map((part, i) => i < 2 ? part.charAt(0) : '')
                                .join('') || '?'}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={taskToView?.subTasks?.length > 0 ? Math.round((100 / taskToView.subTasks.length) * taskToView.subTasks.filter(t => t.note).length) : 0}
                      sx={{
                        height: isMobile ? 8 : 10,
                        borderRadius: 5,
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 5,
                          backgroundColor: '#7b68ee'
                        }
                      }}
                    />
                  </Box>

                  {/* Detailed Action Items */}
                  <Paper sx={{
                    p: isMobile ? 1 : 2,
                    backgroundColor: '#2d2d2d',
                    border: '1px solid #3d3d3d',
                    borderRadius: '8px'
                  }}>
                    {taskToView?.subTasks?.map((subtask, index) => (
                      <Box
                        key={index}
                        sx={{
                          mb: index < taskToView.subTasks.length - 1 ? 2 : 0,
                          pb: index < taskToView.subTasks.length - 1 ? 2 : 0,
                          borderBottom: index < taskToView.subTasks.length - 1 ? '1px solid #e5e7eb' : 'none'
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant={isMobile ? "body2" : "h6"} sx={{ color: '#eff5ff', fontWeight: 500 }}>
                            {index + 1}. {subtask.title}
                          </Typography>
                          {subtask.completedBy && (
                            <Chip
                              size={isMobile ? "small" : "medium"}
                              sx={{
                                backgroundColor: '#3a4044',
                                color: 'white',
                                '& .MuiChip-avatar': {
                                  width: isMobile ? 20 : 24,
                                  height: isMobile ? 20 : 24,
                                  fontSize: isMobile ? '0.65rem' : '0.75rem'
                                }
                              }}
                              avatar={
                                <Avatar sx={{
                                  backgroundColor: taskToView.assignedTo.some(u => u._id === subtask.completedBy._id)
                                    ? '#7b68ee'
                                    : '#f44336',
                                  width: isMobile ? 20 : 24,
                                  height: isMobile ? 20 : 24,
                                  fontSize: isMobile ? '0.65rem' : '0.75rem'
                                }}>
                                  {subtask.completedBy?.name
                                    ?.split(' ')
                                    .map((part, i) => i < 2 ? part.charAt(0) : '')
                                    .join('') || '?'}
                                </Avatar>
                              }
                              label={`${isMobile ? '' : 'Action by: '}${subtask.completedBy.name}`}
                            />
                          )}
                        </Stack>

                        <Box sx={{
                          backgroundColor: '#2a2a2a',
                          p: isMobile ? 1 : 2,
                          borderRadius: 1,
                          borderLeft: '3px solid',
                          borderColor: subtask.note ? '#7b68ee' : 'transparent'
                        }}>
                          <Typography variant={isMobile ? "caption" : "body1"} sx={{
                            direction: 'rtl',
                            textAlign: 'right',
                            color: '#eff5ff',
                            fontStyle: subtask.note ? 'normal' : 'italic'
                          }}>
                            {subtask.note || 'No action taken yet'}
                          </Typography>
                        </Box>

                        {subtask.dateTime && (
                          <Typography variant="caption" sx={{
                            color: 'gray',
                            display: 'block',
                            mt: 0.5,
                            textAlign: 'right',
                            fontSize: isMobile ? '0.65rem' : '0.75rem'
                          }}>
                            Completed: {subtask.dateTime}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Paper>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>

        <Divider sx={{ backgroundColor: '#e5e7eb' }} />

        <DialogActions sx={{
          backgroundColor: '#2d2d2d',
          borderTop: '1px solid #e5e7eb',
          padding: isMobile ? '8px 16px' : '12px 24px',
        }}>
          <Button
            onClick={() => setViewDialogOpen(false)}
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

      {/* EditTaskDialog */}
      {
        selectedTask && (
          <EditTaskDialog
            open={editDialogOpen}
            setOpen={setEditDialogOpen}
            task={selectedTask}
            handleTaskUpdate={handleTaskUpdate}
            isMobile={isMobile}
          />
        )
      }
    </>
  );
};

const DetailRow = ({ label, value, isMobile }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
    <Typography
      variant={isMobile ? "caption" : "body2"}
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
        variant={isMobile ? "body2" : "body1"}
        component="div"
        sx={{
          color: '#ffffff',
          wordBreak: 'break-word',
          fontSize: isMobile ? '0.875rem' : '1rem',
          textAlign: label === "Customer Feedback" ? "right" : "left",
          direction: label === "Customer Feedback" ? "rtl" : "ltr"
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