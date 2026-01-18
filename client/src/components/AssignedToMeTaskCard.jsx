import { useEffect, useMemo, useState } from "react";
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Chip, Tooltip, Paper, Stack, Button, LinearProgress, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { MoreVert as MoreVertIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as VisibilityIcon } from "@mui/icons-material";
import { HourglassEmpty, PlayCircle, CheckCircle, Cancel } from "@mui/icons-material"; // Status Icons
import EditTaskDialog from "./task/EditTaskDialog";
import { format, differenceInMinutes } from "date-fns";
import { useNavigate } from "react-router-dom";
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import Typography from '@mui/material/Typography';
import { FaRegCopy, FaStar } from "react-icons/fa";
import { FaWhatsapp } from "react-icons/fa6";
import { useSelector } from "react-redux";
import api from "../api/api";
import { BiArchive } from "react-icons/bi";
import { RiProgress4Fill } from "react-icons/ri";
import { predefinedSubtasks as allPredefinedSubtasks } from "../constants/subtaskData";

const defaultSubtasks = [
  { title: "Receive the task", progress: 0, note: "" },
  { title: "Called to the customer and specify an appointment", progress: 0, note: "" },
  { title: "Reach at the customer and solve the problem", progress: 0, note: "" },
  { title: "If the customer refuses the visit to close the task", progress: 0, note: "" },
];

const statusConfig = {
  Todo: { icon: <HourglassEmpty />, color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  "In Progress": { icon: <PlayCircle />, color: "bg-sky-500/10 text-sky-500 border-sky-500/20" },
  Closed: { icon: <CheckCircle />, color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  Cancelled: { icon: <Cancel />, color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
};

const AssignedToMeTaskCard = ({
  task,
  users,
  onUpdate,
  onDelete,
  handleTaskArchive, // Ensure this is correctly destructured
  handleFavoriteClick,
  setUpdateSubtaskProgress }) => {
  const navigate = useNavigate();
  const user = useSelector((state) => state?.auth?.user);
  const [anchorEl, setAnchorEl] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [subtasks, setSubtasks] = useState(
    task.subtasks && task.subtasks.length > 0 ? task.subtasks : defaultSubtasks
  );
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [note, setNote] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [cancelState, setCancelState] = useState(false);
  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const currentUser = useMemo(() => {
    return JSON.parse(localStorage.getItem("userInfo"));
  }, []);
  const assignedUsers = Array.isArray(task?.assignedTo)
    ? users.filter(user => task.assignedTo.some(assignedUser => (assignedUser?._id || assignedUser) === user._id))
    : [];
  const [creatorColor, setCreatorColor] = useState([]);
  const formattedDate = task?.date ? format(new Date(task.date), "MMM dd, yyyy HH:mm") : "No Date";
  const remainingMinutes = task?.date ? differenceInMinutes(new Date(task.date), new Date()) : null;

  const formatTaskForWhatsApp = () => {
    const formattedMessage = `
      **SLID**: ${task.slid}
      **Operation**: ${task.operation || 'N/A'}
      **Satisfaction Score**: ${task.evaluationScore || 0}
      **Status**: ${task.status}
      **Due Date**: ${formattedDate}
      **Remaining Time**: ${remainingMinutes > 0 ? `${Math.floor(remainingMinutes / 1440)} days, ${Math.floor((remainingMinutes % 1440) / 60)} hours, ${remainingMinutes % 60} minutes left` : `${Math.floor(Math.abs(remainingMinutes) / 1440)} days, ${Math.floor((Math.abs(remainingMinutes) % 1440) / 60)} hours, ${Math.abs(remainingMinutes) % 60} minutes overdue`}
      **Category**: ${task.category || 'N/A'}
      **Field Team**: ${task.teamName || "N/A"} (${task.teamCompany || "N/A"})
      **Assigned To**: ${assignedUsers.map(user => user.name).join(", ") || 'No assignees'}
      **Progress**: ${Math.round((100 / subtasks.length) * activeStep)}%
      **Subtasks**:
        ${subtasks.map((subtask, index) => `
        ${index + 1}. ${subtask.title}
          - Note: ${subtask.note || 'None'}
        `).join("")}`;
    return formattedMessage;
  };

  const copyToClipboard = () => {
    const formattedMessage = formatTaskForWhatsApp();
    navigator.clipboard.writeText(formattedMessage).then(() => {
      alert('Task details copied to clipboard!');
    }).catch(err => {
      // console.error('Failed to copy: ', err);
    });
  };

  const redirectToWhatsApp = () => {
    const formattedMessage = formatTaskForWhatsApp();

    // Get phone number from populated teamId
    let phoneNumber = task.teamId?.contactNumber;

    if (!phoneNumber) {
      alert('Team contact number not available');
      return;
    }

    // Clean and validate phone number
    let cleanNumber = phoneNumber.toString().trim();
    const hasPlus = cleanNumber.startsWith('+');
    cleanNumber = cleanNumber.replace(/[^0-9]/g, '');
    if (hasPlus && cleanNumber) cleanNumber = '+' + cleanNumber;

    const digitsOnly = cleanNumber.replace(/\+/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      alert('Invalid team phone number');
      return;
    }

    // Copy to clipboard first
    navigator.clipboard.writeText(formattedMessage).catch(() => { });

    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(formattedMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  useEffect(() => {
    const fetchSubtasks = async () => {
      try {
        const response = await api.get(`/tasks/get-task/${task._id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        setSubtasks(response.data.subTasks);
        const activeSteps = response.data.subTasks.filter((subtask) => subtask.note !== "").length;
        setActiveStep(activeSteps);
        setNote(response.data.subTasks.map((subtask) => subtask.note));
      } catch (error) {
        // console.error("Error fetching subtasks:", error);
      }
    };
    fetchSubtasks();
  }, [task._id, cancelState]); // Add task._id as a dependency to refetch when task ID changes

  const handleToggleComplete = async (isCompleting) => {
    try {
      const newStatus = isCompleting ? "Closed" : "In Progress";

      // Update Task Status
      await api.put(`/tasks/update-task/${task._id}`, { ...task, status: newStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      // Update Subtasks
      const updatedSubtasks = subtasks.map(st => ({
        ...st,
        status: isCompleting ? "Closed" : "Open",
        progress: isCompleting ? (st.optional ? 0 : 100 / subtasks.filter(s => !s.optional).length) : 0,
        // For simplicity, just reset progress on undo, or max it on complete. 
        // Actually, if we mark as complete, we should set progress to 100% effectively? 
        // The card calculates progress dynamically. If status is Closed, it counts as done.
        // So just setting status is enough for the calculation logic we added: `st.status === 'Closed'`
      }));

      await api.put(
        `/tasks/update-subtask/${task._id}`,
        updatedSubtasks,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      // Trigger updates
      if (onUpdate) onUpdate({ ...task, status: newStatus });
      setUpdateSubtaskProgress(prev => !prev);
      setCancelState(prev => !prev); // Force refetch

    } catch (error) {
      console.error("Error toggling completion:", error);
      alert("Failed to update status");
    }
  };

  useEffect(() => {
    if (users.length > 0 && creatorColor.length === 0) {
      setCreatorColor(users.map(user => ({ id: user._id, color: user.color })));
    }
  }, [users, creatorColor]);

  const handleAction = (action) => {
    handleMenuClose();
    if (action === "edit") setEditDialogOpen(true);
    if (action === "delete") onDelete(task._id);
    if (action === "favourite") handleFavoriteClick(task);
    if (action === "archive") handleTaskArchive(task._id);
    if (action === "view") navigate(`/tasks/view-task/${task._id}`, { state: { from: location.pathname } });
    if (action === "complete") handleToggleComplete(true);
    if (action === "undo_complete") handleToggleComplete(false);
  };

  const handleNoteDialogOpen = () => {
    setNote(subtasks.map((subtask2) => subtask2.note || ""));
    setNoteDialogOpen(true);
  };

  const handleNoteDialogClose = () => {
    setNoteDialogOpen(false);
    setCancelState(prevState => !prevState);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => {
      const nextStep = prevActiveStep + 1;
      return nextStep >= subtasks.length ? subtasks.length : nextStep;
    });
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => {
      const prevStep = prevActiveStep - 1;
      return prevStep < 0 ? 0 : prevStep;
    });
  };

  const handleReset = async () => {
    try {
      // Reset local state
      setNote([]);
      setActiveStep(0);
      // Determine reset subtasks based on type
      const resetSubtasks = (task.subtaskType && allPredefinedSubtasks[task.subtaskType])
        ? allPredefinedSubtasks[task.subtaskType]
        : defaultSubtasks;

      setSubtasks(resetSubtasks);

      // Call the API to save the reset state
      const response = await api.put(
        `/tasks/update-subtask/${task._id}`,
        resetSubtasks,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.status === 200) {
        // console.log("Subtasks reset successfully:", response.data);
        setUpdateSubtaskProgress(prev => !prev);
      } else {
        // console.log("Failed to reset subtasks");
      }
    } catch (error) {
      // console.error("Error resetting subtasks:", error);
    }
  };

  const handleSaveNote = async () => {
    try {
      const updatedSubtasks = subtasks.map((subtask, index) => ({
        ...subtask,
        note: note[index] || "",
        progress: note[index]?.trim() ? (100 / subtasks.length) : 0,
      }));

      // console.log("Updated Subtasks:", updatedSubtasks);

      const response = await api.put(
        `/tasks/update-subtask/${task._id}`,
        updatedSubtasks,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.status === 200) {
        // console.log("Subtasks updated successfully:", response.data);
        setSubtasks(updatedSubtasks);
        const activeSteps = updatedSubtasks.filter((subtask) => subtask.note.trim() !== "").length;
        setActiveStep(activeSteps);
        setUpdateSubtaskProgress(prev => !prev);
      } else {
        // console.log("Failed to update subtasks");
      }
    } catch (error) {
      // console.error("Error updating subtasks:", error);
    }
    handleNoteDialogClose();
  };

  return (
    <>
      <Paper
        elevation={0}
        className="w-full p-6 rounded-3xl border transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/10 group relative overflow-hidden"
        sx={{
          backgroundColor: "#1e293b",
          borderColor: "#334155",
          "&:hover": { borderColor: "#0ea5e955" }
        }}
      >
        {/* Background Decoration */}
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl group-hover:bg-sky-500/10 transition-all duration-500"></div>

        <Stack spacing={2} sx={{ height: "100%", justifyContent: "space-between", position: 'relative', zIndex: 1 }}>
          <Stack>
            <div className="flex justify-between items-center mb-2">
              <div className="flex gap-2">
                <Chip
                  label={(task?.priority || "Normal").toUpperCase()}
                  size="small"
                  sx={{
                    backgroundColor: task?.priority === "High" ? "rgba(239, 68, 68, 0.1)" : "rgba(14, 165, 233, 0.1)",
                    color: task?.priority === "High" ? "#ef4444" : "#0ea5e9",
                    fontWeight: "900",
                    fontSize: "10px",
                    letterSpacing: "0.5px",
                    border: `1px solid ${task?.priority === "High" ? "rgba(239, 68, 68, 0.2)" : "rgba(14, 165, 233, 0.2)"}`,
                  }}
                />
                <Chip
                  label={task?.status}
                  size="small"
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "#94a3b8",
                    fontWeight: "bold",
                    fontSize: "10px",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
              </div>

              <Stack direction="row" spacing={0.5}>
                <Tooltip title="Copy Task Details">
                  <IconButton
                    size="small"
                    onClick={copyToClipboard}
                    sx={{ color: "#94a3b8", '&:hover': { color: "#0ea5e9", bgcolor: 'rgba(14, 165, 233, 0.1)' } }}
                  >
                    <FaRegCopy size={16} />
                  </IconButton>
                </Tooltip>
                {task.teamId?.contactNumber && (
                  <Tooltip title="WhatsApp Team">
                    <IconButton
                      size="small"
                      onClick={redirectToWhatsApp}
                      sx={{ color: "#94a3b8", '&:hover': { color: "#22c55e", bgcolor: 'rgba(34, 197, 94, 0.1)' } }}
                    >
                      <FaWhatsapp size={18} />
                    </IconButton>
                  </Tooltip>
                )}



                <IconButton
                  size="small"
                  onClick={handleMenuOpen}
                  sx={{ color: "#94a3b8", '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                >
                  <MoreVertIcon size={18} />
                </IconButton>
              </Stack>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: {
                    backgroundColor: "#1e293b",
                    color: "#f8fafc",
                    border: "1px solid #334155",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
                    borderRadius: 2,
                    mt: 1,
                    "& .MuiMenuItem-root": {
                      fontSize: '13px',
                      fontWeight: '500',
                      py: 1,
                      px: 2,
                      "&:hover": { bgcolor: "rgba(14, 165, 233, 0.1)", color: "#0ea5e9" },
                    },
                  },
                }}
              >
                {(currentUser._id === (task.createdBy._id || task.createdBy)) && (
                  <>
                    <MenuItem onClick={() => handleAction("edit")}>
                      <ListItemIcon><EditIcon fontSize="small" sx={{ color: "inherit" }} /></ListItemIcon>
                      <ListItemText>Modify Specification</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => handleAction("delete")}>
                      <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: "inherit" }} /></ListItemIcon>
                      <ListItemText>Withdraw Task</ListItemText>
                    </MenuItem>
                  </>
                )}
                <MenuItem onClick={() => handleAction("view")}>
                  <ListItemIcon><VisibilityIcon fontSize="small" sx={{ color: "inherit" }} /></ListItemIcon>
                  <ListItemText>Deep Dive View</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleAction("favourite")}>
                  <ListItemIcon><FaStar size={16} color="inherit" /></ListItemIcon>
                  <ListItemText>Tag as Priority</ListItemText>
                </MenuItem>

                {task.subTasks.every(st => (st.progress > 0 || st.note || st.status === 'Closed' || st.optional)) && (
                  <MenuItem onClick={() => handleAction("archive")}>
                    <ListItemIcon><BiArchive size={18} color="inherit" /></ListItemIcon>
                    <ListItemText>Move to Archive</ListItemText>
                  </MenuItem>
                )}
              </Menu>
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <Typography variant="h5" sx={{ fontWeight: '900', color: "#f8fafc", letterSpacing: -1, mb: 0.5 }}>
                    {task?.slid}
                  </Typography>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${activeStep === subtasks.length ? 'bg-emerald-500' : 'bg-sky-500'}`}></span>
                    <Typography variant="body2" sx={{ color: "#94a3b8", fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: 1 }}>
                      {activeStep === 0 ? "Pending Commencement" : activeStep === subtasks.length ? "Execution Finalized" : "Field Activity Underway"}
                    </Typography>
                  </div>
                </div>
                <div className={`p-3 rounded-2xl ${activeStep === subtasks.length ? 'bg-emerald-500/10 text-emerald-500' : 'bg-sky-500/10 text-sky-500'}`}>
                  {activeStep === 0 ? statusConfig['Todo'].icon : activeStep === subtasks.length ? statusConfig['Closed'].icon : statusConfig['In Progress'].icon}
                </div>
              </div>

              {/* Dynamic Feedback Chip */}
              <div className="min-h-[32px]">
                {task.status !== "Closed" ? (
                  subtasks?.find(st => st.title === "Task Reception")?.shortNote && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/5 border border-sky-500/10 text-sky-400 text-[10px] font-bold uppercase tracking-wider">
                      < RiProgress4Fill className="animate-spin-slow" />
                      {subtasks.find(st => st.title === "Task Reception").shortNote}
                    </div>
                  )
                ) : (
                  task.closureCallFeedback && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                      <CheckCircle size={12} />
                      Result: {task.closureCallFeedback}
                    </div>
                  )
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 'bold', textTransform: 'uppercase', display: 'block' }}>Field Logistics</Typography>
                  <Typography variant="body2" sx={{ color: "#f1f5f9", fontWeight: '600' }}>{task?.teamName || "Unassigned"}</Typography>
                  <Typography variant="caption" sx={{ color: "#94a3b8", display: 'block' }}>{task?.teamCompany || "Internal"}</Typography>
                </div>
                <div className="space-y-1">
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 'bold', textTransform: 'uppercase', display: 'block' }}>Operation Context</Typography>
                  <Typography variant="body2" sx={{ color: "#f1f5f9", fontWeight: '600' }}>{task?.operation || 'General'}</Typography>
                  <Typography variant="caption" sx={{ color: "#94a3b8", display: 'block' }}>{task?.category}</Typography>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/50">
                <div className="flex justify-between items-center mb-2">
                  <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 'bold' }}>SLA COMPLIANCE</Typography>
                  <Typography variant="caption" sx={{
                    color: remainingMinutes > 0 ? "#10b981" : "#ef4444",
                    fontWeight: 'black',
                    bgcolor: remainingMinutes > 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                    px: 1, py: 0.5, borderRadius: 1
                  }}>
                    {remainingMinutes > 0 ? `${Math.floor(remainingMinutes / 60)}H LEFT` : `${Math.floor(Math.abs(remainingMinutes) / 60)}H OVERDUE`}
                  </Typography>
                </div>
                <Typography variant="caption" sx={{ color: "#64748b", display: 'block', mb: 1 }}>{formattedDate}</Typography>
              </div>
            </div>
          </Stack>

          <Stack>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ color: "#0ea5e9", fontWeight: '900', fontSize: '18px' }}>
                {Math.min(100, Math.round((subtasks.filter(st => st.note || st.status === 'Closed' || (st.optional && st.progress > 0)).length / Math.max(1, subtasks.filter(st => !st.optional).length)) * 100))}%
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 'bold' }}>
                {activeStep}/{subtasks.length} SUBTASKS
              </Typography>
            </div>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (subtasks.filter(st => st.note || st.status === 'Closed' || (st.optional && st.progress > 0)).length / Math.max(1, subtasks.filter(st => !st.optional).length)) * 100)}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: "rgba(255,255,255,0.05)",
                "& .MuiLinearProgress-bar": {
                  backgroundColor: "#0ea5e9",
                  borderRadius: 4,
                  boxShadow: "0 0 10px rgba(14, 165, 233, 0.5)"
                }
              }}
            />

            {user && (user.role === 'Admin' || (task.assignedTo?.[0] && (user._id === task.assignedTo[0]._id || user._id === task.assignedTo[0]))) && (
              <Button
                fullWidth
                variant="contained"
                onClick={handleNoteDialogOpen}
                startIcon={<RiProgress4Fill />}
                sx={{
                  mt: 3,
                  py: 1.5,
                  borderRadius: 3,
                  backgroundColor: "#0ea5e9",
                  color: "#fff",
                  fontWeight: "bold",
                  textTransform: 'none',
                  boxShadow: "0 4px 15px rgba(14, 165, 233, 0.3)",
                  "&:hover": {
                    backgroundColor: "#0284c7",
                    transform: 'translateY(-1px)',
                    boxShadow: "0 6px 20px rgba(14, 165, 233, 0.4)",
                  },
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                Subtask Audit Terminal
              </Button>
            )}
          </Box>
        </Stack>
      </Stack>
    </Paper >

      <EditTaskDialog open={editDialogOpen} setOpen={setEditDialogOpen} task={task} onUpdate={onUpdate} />

      <Dialog
        open={noteDialogOpen}
        onClose={handleNoteDialogClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "#0f172a",
            color: "#f8fafc",
            borderRadius: "24px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            border: "1px solid #334155",
            backgroundImage: 'none',
          },
        }}
      >
        <DialogTitle sx={{
          fontSize: "1.5rem",
          fontWeight: "900",
          textAlign: 'center',
          pt: 4,
          pb: 2,
          letterSpacing: -1,
          color: "#0ea5e9"
        }}>
          SUBTASK AUDIT TERMINAL
          <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 'bold', mt: 0.5 }}>
            REF: {task?.slid}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 4, py: 2 }}>
          <Box sx={{ py: 2 }}>
            <Stepper activeStep={activeStep} orientation="vertical" sx={{
              "& .MuiStepConnector-line": {
                borderColor: "#334155",
                borderLeftWidth: 2,
              }
            }}>
              {subtasks.map((subtask, index) => (
                <Step key={index}>
                  <StepLabel
                    StepIconProps={{
                      sx: {
                        "&.Mui-active": { color: "#0ea5e9" },
                        "&.Mui-completed": { color: "#10b981" },
                        "& .MuiStepIcon-text": { fontWeight: 'bold' }
                      }
                    }}
                  >
                    <Typography variant="body2" sx={{
                      fontWeight: activeStep === index ? 'bold' : '500',
                      color: activeStep === index ? "#f8fafc" : "#94a3b8",
                      transition: 'all 0.2s'
                    }}>
                      {subtask.title?.toUpperCase()}
                    </Typography>
                  </StepLabel>
                  <StepContent sx={{ borderLeft: '2px solid #334155', ml: '11px', pl: 3 }}>
                    <TextField
                      autoFocus={activeStep === index}
                      margin="normal"
                      placeholder="Add observations or technical notes..."
                      type="text"
                      fullWidth
                      multiline
                      rows={2}
                      value={note[index] || ""}
                      onChange={(e) => {
                        const newNote = [...note];
                        newNote[index] = e.target.value;
                        setNote(newNote);
                      }}
                      sx={{
                        backgroundColor: "rgba(255,255,255,0.03)",
                        borderRadius: "12px",
                        "& .MuiOutlinedInput-root": {
                          color: "#f8fafc",
                          fontSize: '14px',
                          "& fieldset": { borderColor: "#334155" },
                          "&:hover fieldset": { borderColor: "#0ea5e955" },
                          "&.Mui-focused fieldset": { borderColor: "#0ea5e9" },
                        },
                      }}
                    />
                    <Box sx={{ mt: 2, mb: 1, display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        size="small"
                        sx={{
                          py: 1,
                          px: 3,
                          borderRadius: "8px",
                          backgroundColor: "#0ea5e9",
                          fontWeight: "bold",
                          textTransform: 'none',
                          "&:hover": { backgroundColor: "#0284c7" },
                        }}
                      >
                        {index === subtasks.length - 1 ? "Complete Audit" : "Next Milestone"}
                      </Button>
                      <Button
                        disabled={index === 0}
                        onClick={handleBack}
                        size="small"
                        sx={{
                          color: "#94a3b8",
                          fontWeight: "bold",
                          textTransform: 'none',
                          "&:hover": { backgroundColor: "rgba(255,255,255,0.05)" },
                        }}
                      >
                        Back
                      </Button>
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
            {subtasks.every(st => (st.note || st.status === 'Closed' || st.optional)) && (
              <Box
                sx={{
                  p: 3,
                  mt: 2,
                  backgroundColor: "rgba(16, 185, 129, 0.05)",
                  border: "1px dashed rgba(16, 185, 129, 0.2)",
                  borderRadius: "16px",
                  textAlign: 'center'
                }}
              >
                <CheckCircle sx={{ color: "#10b981", fontSize: 40, mb: 1 }} />
                <Typography sx={{ fontWeight: 'bold', color: "#f8fafc", mb: 2 }}>
                  Task Audit Sequence Finalized
                </Typography>
                <Button
                  onClick={handleReset}
                  size="small"
                  sx={{
                    color: "#ef4444",
                    fontWeight: "bold",
                    textTransform: 'none',
                    "&:hover": { backgroundColor: "rgba(239, 68, 68, 0.1)" },
                  }}
                >
                  Clear All Data
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 4, pt: 0, justifyContent: 'center', gap: 2 }}>
          <Button
            onClick={handleNoteDialogClose}
            sx={{
              color: "#94a3b8",
              fontWeight: "bold",
              textTransform: 'none',
              px: 4,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveNote}
            sx={{
              backgroundColor: "#10b981",
              color: "#fff",
              fontWeight: "black",
              textTransform: 'none',
              borderRadius: "12px",
              px: 6,
              py: 1.5,
              fontSize: '15px',
              boxShadow: "0 10px 15px -3px rgba(16, 185, 129, 0.3)",
              "&:hover": { backgroundColor: "#059669" },
            }}
          >
            Finalize Updates
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AssignedToMeTaskCard;