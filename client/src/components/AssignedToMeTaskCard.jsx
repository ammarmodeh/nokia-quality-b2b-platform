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
import { useSelector } from "react-redux";
import api from "../api/api";
import { BiArchive } from "react-icons/bi";

const predefinedSubtasks = [
  { title: "Receive the task", progress: 0, note: "" },
  { title: "Called to the customer and specify an appointment", progress: 0, note: "" },
  { title: "Reach at the customer and solve the problem", progress: 0, note: "" },
  { title: "If the customer refuses the visit to close the task", progress: 0, note: "" },
];

const statusConfig = {
  Todo: { icon: <HourglassEmpty className="text-yellow-600" />, color: "bg-yellow-100 text-yellow-800" },
  "In Progress": { icon: <PlayCircle className="text-blue-600" />, color: "bg-blue-100 text-blue-800" },
  Closed: { icon: <CheckCircle className="text-green-600" />, color: "bg-green-100 text-green-800" },
  Cancelled: { icon: <Cancel className="text-gray-500" />, color: "bg-[#2d2d2d] text-gray-300" },
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
    task.subtasks && task.subtasks.length > 0 ? task.subtasks : predefinedSubtasks
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
  const assignedUsers = users.filter(user => task.assignedTo.some(assignedUser => assignedUser._id === user._id || assignedUser === user._id));
  const [creatorColor, setCreatorColor] = useState([]);
  const formattedDate = task?.date ? format(new Date(task.date), "MMM dd, yyyy HH:mm") : "No Date";
  const remainingMinutes = task?.date ? differenceInMinutes(new Date(task.date), new Date()) : null;

  const formatTaskForWhatsApp = () => {
    const formattedMessage = `
      **SLID**: ${task.slid}
      **Operation**: ${task.operation || 'N/A'}
      **Satisfaction Score**: ${task.evaluationScore}
      **Status**: ${task.status}
      **Due Date**: ${formattedDate}
      **Remaining Time**: ${remainingMinutes > 0 ? `${Math.floor(remainingMinutes / 1440)} days, ${Math.floor((remainingMinutes % 1440) / 60)} hours, ${remainingMinutes % 60} minutes left` : `${Math.floor(Math.abs(remainingMinutes) / 1440)} days, ${Math.floor((Math.abs(remainingMinutes) % 1440) / 60)} hours, ${Math.abs(remainingMinutes) % 60} minutes overdue`}
      **Category**: ${task.category}
      **Assigned To**: ${assignedUsers.map(user => user.name).join(", ")}
      **Progress**: ${(100 / subtasks.length) * activeStep}%
      **Subtasks**:
        ${subtasks.map((subtask, index) => `
        ${index + 1}. ${subtask.title}
          - Note: ${subtask.note}
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
      setSubtasks(predefinedSubtasks);

      // Call the API to save the reset state
      const response = await api.put(
        `/tasks/update-subtask/${task._id}`,
        predefinedSubtasks,
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
        progress: note[index]?.trim() ? 25 : 0, // Set progress to 25 if note is not empty
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
      <Paper elevation={2} className="w-full p-5 rounded-lg border hover:shadow-md transition-all duration-300" sx={{ backgroundColor: "#2d2d2d", borderColor: "#3d3d3d" }}>
        <Stack spacing={2} sx={{ height: "100%", justifyContent: "space-between" }}>
          <Stack>
            <div className="flex justify-between items-center">
              <Chip
                label={`${task?.priority} Priority`}
                sx={{
                  backgroundColor: "#414141",
                  color: "#ffffff",
                  fontWeight: "bold",
                  fontSize: "12px",
                }}
              />

              <Stack direction="row" >
                <Tooltip title="Copy Task Details">
                  <IconButton onClick={copyToClipboard} sx={{ color: "#ffffff" }}>
                    <FaRegCopy />
                  </IconButton>
                </Tooltip>
                <IconButton onClick={handleMenuOpen} sx={{ color: "#ffffff" }}>
                  <MoreVertIcon />
                </IconButton>
              </Stack>

              {currentUser._id === task.createdBy._id || currentUser._id === task.createdBy ? (
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: {
                      backgroundColor: "#2d2d2d",
                      color: "#ffffff",
                    },
                  }}
                >
                  <MenuItem onClick={() => handleAction("edit")}>
                    <ListItemIcon><EditIcon fontSize="small" sx={{ color: "#ffffff" }} /></ListItemIcon>
                    <ListItemText>Edit</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => handleAction("delete")}>
                    <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: "#ffffff" }} /></ListItemIcon>
                    <ListItemText>Delete</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => handleAction("view")}>
                    <ListItemIcon><VisibilityIcon fontSize="small" sx={{ color: "#ffffff" }} /></ListItemIcon>
                    <ListItemText>View</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => handleAction("favourite")}>
                    <ListItemIcon><FaStar size={16} color="#ffffff" /></ListItemIcon>
                    <ListItemText>Add to favourite</ListItemText>
                  </MenuItem>
                </Menu>
              ) : (
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: {
                      backgroundColor: "#2d2d2d",
                      color: "#ffffff",
                    },
                  }}
                >
                  <MenuItem onClick={() => handleAction("view")}>
                    <ListItemIcon><VisibilityIcon fontSize="small" sx={{ color: "#ffffff" }} /></ListItemIcon>
                    <ListItemText>View</ListItemText>
                  </MenuItem>

                  {task.subTasks.reduce((acc, subTask) => acc + (subTask.progress || 0), 0) === 100 && (
                    <MenuItem onClick={() => handleAction("archive")}>
                      <ListItemIcon><BiArchive size={20} color="#ffffff" /></ListItemIcon>
                      <ListItemText>Archive</ListItemText>
                    </MenuItem>
                  )}

                  <MenuItem onClick={() => handleAction("favourite")}>
                    <ListItemIcon><FaStar size={16} color="#ffffff" /></ListItemIcon>
                    <ListItemText>Add to favourite</ListItemText>
                  </MenuItem>
                </Menu>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <h4 className="text-lg font-semibold text-[#bdb5b5]">{task?.slid}</h4>
              {/* <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${statusConfig[task?.status]?.color || "bg-gray-200 text-gray-300"}`}> */}
              {activeStep === 0 ? <div>{statusConfig['Todo'].icon}</div> : activeStep === subtasks.length ? <div>{statusConfig['Closed'].icon}</div> : <div>{statusConfig['In Progress'].icon}</div>}
              {/* </div> */}
            </div>

            <div className="text-sm text-gray-300 mt-2 space-y-1">
              <p><span className="font-medium text-[#bdb5b5]">Due Date:</span> {formattedDate} {remainingMinutes !== null && (
                <span className={`ml-2 ${remainingMinutes > 0 ? "text-green-600" : "text-red-600"}`}>
                  ({remainingMinutes > 0 ? `${Math.floor(remainingMinutes / 1440)} days, ${Math.floor((remainingMinutes % 1440) / 60)} hours, ${remainingMinutes % 60} minutes left` : `${Math.floor(Math.abs(remainingMinutes) / 1440)} days, ${Math.floor((Math.abs(remainingMinutes) % 1440) / 60)} hours, ${Math.abs(remainingMinutes) % 60} minutes overdue`})
                </span>
              )}</p>
              <p><span className="font-medium text-[#bdb5b5]">Category:</span> {task?.category}</p>
              <p><span className="font-medium text-[#bdb5b5]">Operation:</span> {task?.operation || 'N/A'}</p>
            </div>

          </Stack>
          <Stack >
            <div className="mt-3 text-xs text-gray-400">
              <div>
                <p className="text-sm text-[#bdb5b5] font-medium">Progress: ({(100 / subtasks.length) * activeStep}%)</p>
                <LinearProgress variant="determinate" value={(100 / subtasks.length) * activeStep} sx={{ backgroundColor: "#2d2d2d", "& .MuiLinearProgress-bar": { backgroundColor: "#7b68ee" } }} />
                {user && (user._id === task.assignedTo[0]._id || user._id === task.assignedTo[0]) && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleNoteDialogOpen}
                    sx={{ mt: 2, backgroundColor: "#01013d" }}
                  >
                    Manage Subtasks
                  </Button>
                )}
              </div>
            </div>
          </Stack>
        </Stack>
      </Paper>

      <EditTaskDialog open={editDialogOpen} setOpen={setEditDialogOpen} task={task} onUpdate={onUpdate} />

      <Dialog
        open={noteDialogOpen}
        onClose={handleNoteDialogClose}
        PaperProps={{
          sx: {
            backgroundColor: "#2d2d2d", // Darker background for better contrast
            color: "#ffffff", // White text
            borderRadius: "8px", // Rounded corners
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.5)", // Subtle shadow
          },
        }}
      >
        <DialogTitle sx={{ color: "#ffffff", fontWeight: "600", fontSize: "1.25rem" }}>
          Manage Subtasks
        </DialogTitle>
        <DialogContent>
          <Box sx={{ maxWidth: 400 }}>
            <Stepper activeStep={activeStep} orientation="vertical">
              {subtasks.map((subtask, index) => (
                <Step key={index}>
                  <StepLabel
                    optional={
                      index === subtasks.length - 1 ? (
                        <Typography variant="caption" sx={{ color: "#b3b3b3" }}>
                          Last step
                        </Typography>
                      ) : null
                    }
                    sx={{
                      color: "#ffffff", // White text
                      "& .MuiStepIcon-root": { color: "darkblue" }, // Blue step icons
                      "& .MuiStepIcon-completed": { color: "#4caf50" }, // Green for completed steps
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "#ffffff" }}>
                      {subtask.title}
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography sx={{ mb: 1, color: "#ffffff" }}>{subtask.note}</Typography>
                    <TextField
                      margin="dense"
                      label="Note"
                      type="text"
                      fullWidth
                      value={note[index] || ""}
                      onChange={(e) => {
                        const newNote = [...note];
                        newNote[index] = e.target.value;
                        setNote(newNote);
                      }}
                      sx={{
                        color: "#ffffff", // White text for input
                        "& .MuiInputBase-input": { color: "#ffffff" }, // White text for input
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { borderColor: "#555" }, // Border color
                          "&:hover fieldset": { borderColor: "#7b68ee" }, // Hover border color
                          "&.Mui-focused fieldset": { borderColor: "#7b68ee" }, // Focus border color
                        },
                      }}
                      InputLabelProps={{
                        sx: { color: "#b3b3b3" }, // Light gray for label
                      }}
                      InputProps={{
                        sx: { color: "#ffffff" }, // White text for input
                      }}
                    />
                    <Box sx={{ mb: 2 }}>
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        sx={{
                          mt: 1,
                          mr: 1,
                          backgroundColor: "darkblue", // Blue background
                          color: "#ffffff", // White text
                          "&:hover": { backgroundColor: "darkblue" }, // Darker blue on hover
                          "&:focus": { outline: "none" }, // Remove focus outline
                          transition: "background-color 0.2s ease", // Smooth transition
                        }}
                      >
                        {index === subtasks.length - 1 ? "Finish" : "Continue"}
                      </Button>
                      {index !== 0 && (
                        <Button
                          disabled={index === 0}
                          onClick={handleBack}
                          sx={{
                            mt: 1,
                            mr: 1,
                            color: "#ffffff", // White text
                            "&:hover": { backgroundColor: "#2d2d2d" }, // Dark background on hover
                            "&:focus": { outline: "none" }, // Remove focus outline
                            transition: "background-color 0.2s ease", // Smooth transition
                          }}
                        >
                          Back
                        </Button>
                      )}
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
            {activeStep === subtasks.length && (
              <Paper
                square
                elevation={0}
                sx={{
                  p: 3,
                  backgroundColor: "#2d2d2d", // Dark background
                  color: "#ffffff", // White text
                  borderRadius: "8px", // Rounded corners
                  boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.3)", // Subtle shadow
                }}
              >
                <Typography>All steps completed - you&apos;re finished</Typography>
                <Button
                  onClick={handleReset}
                  sx={{
                    mt: 1,
                    mr: 1,
                    color: "#ffffff", // White text
                    "&:hover": { backgroundColor: "#2d2d2d" }, // Dark background on hover
                    "&:focus": { outline: "none" }, // Remove focus outline
                    transition: "background-color 0.2s ease", // Smooth transition
                  }}
                >
                  Reset
                </Button>
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleNoteDialogClose}
            sx={{
              color: "#ffffff", // White text
              "&:hover": { backgroundColor: "#2d2d2d" }, // Dark background on hover
              "&:focus": { outline: "none" }, // Remove focus outline
              transition: "background-color 0.2s ease", // Smooth transition
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveNote}
            sx={{
              color: "#ffffff", // White text
              "&:hover": { backgroundColor: "#2d2d2d" }, // Dark background on hover
              "&:focus": { outline: "none" }, // Remove focus outline
              transition: "background-color 0.2s ease", // Smooth transition
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AssignedToMeTaskCard;