import { useEffect, useState } from "react";
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Chip, Tooltip, Paper, Stack, Button, LinearProgress, TextField, Dialog, DialogTitle, DialogContent, DialogActions, AvatarGroup, Avatar } from "@mui/material";
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
import { FaEye, FaRegCopy, FaStar } from "react-icons/fa";
import { useSelector } from "react-redux";
import api from "../api/api";
import { MdManageAccounts } from "react-icons/md";

const predefinedSubtasks = [
  { title: "Receive the task", progress: 0, note: "", dateTime: null },
  { title: "Called to the customer and specify an appointment", progress: 0, note: "", dateTime: null },
  { title: "Reach at the customer and solve the problem", progress: 0, note: "", dateTime: null },
  { title: "If the customer refuses the visit to close the task", progress: 0, note: "", dateTime: null },
];

const statusConfig = {
  Todo: { icon: <HourglassEmpty fontSize="small" className="text-yellow-600" />, color: "bg-yellow-100 text-yellow-800" },
  "In Progress": { icon: <PlayCircle className="text-blue-600" />, color: "bg-blue-100 text-blue-800" },
  Closed: { icon: <CheckCircle className="text-green-600" />, color: "bg-green-100 text-green-800" },
  Cancelled: { icon: <Cancel className="text-gray-500" />, color: "bg-gray-100 text-gray-700" },
};

const TaskCard = ({ task, users, setUpdateStateDuringSave, handleTaskUpdate, handleTaskDelete, handleFavoriteClick, handleTaskArchive }) => {
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
  const assignedUsers = users.filter(user => task.assignedTo.some(assignedUser => assignedUser._id === user._id || assignedUser === user._id));
  const creator = users.find(user => user._id === task.createdBy._id || user._id === task.createdBy) || {};
  const [creatorColor, setCreatorColor] = useState([]);
  const formattedDate = task?.date ? format(new Date(task.date), "MMM dd, yyyy HH:mm") : "No Date";
  const remainingMinutes = task?.date ? differenceInMinutes(new Date(task.date), new Date()) : null;

  // Copy task details to clipboard
  const copyToClipboard = () => {
    const formattedMessage = `
      **SLID**: ${task.slid}
      **Evaluation Score**: ${task.evaluationScore}
      **Status**: ${task.status}
      **Due Date**: ${formattedDate}
      **Remaining Time**: ${remainingMinutes > 0 ? `${Math.floor(remainingMinutes / 1440)} days, ${Math.floor((remainingMinutes % 1440) / 60)} hours, ${remainingMinutes % 60} minutes left` : `${Math.floor(Math.abs(remainingMinutes) / 1440)} days, ${Math.floor((Math.abs(remainingMinutes) % 1440) / 60)} hours, ${Math.abs(remainingMinutes) % 60} minutes overdue`}
      **Category**: ${task.category}
      **Assigned To**:
      **Progress**: ${(100 / subtasks.length) * activeStep}%
      **Subtasks**:
        ${subtasks.map((subtask, index) => `
        ${index + 1}. ${subtask.title}
          - Note: ${subtask.note}
        `).join("")}`;
    navigator.clipboard.writeText(formattedMessage).then(() => {
      alert('Task details copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy: ', err);
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
        console.error("Error fetching subtasks:", error);
      }
    };
    fetchSubtasks();
  }, [task._id, cancelState]);

  useEffect(() => {
    if (users.length > 0 && creatorColor.length === 0) {
      setCreatorColor(users.map(user => ({ id: user._id, color: user.color })));
    }
  }, [users, creatorColor]);

  const handleAction = (action) => {
    console.log({ action });
    handleMenuClose();
    if (action === "edit") setEditDialogOpen(true);
    if (action === "delete") handleTaskDelete(task._id);
    if (action === "favourite") handleFavoriteClick(task);
    if (action === "view") navigate(`/tasks/view-task/${task._id}`, { state: { from: location.pathname } });
    if (action === "archive") handleTaskArchive(task._id);
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
    if (activeStep < subtasks.length - 1) {
      const updatedSubtasks = [...subtasks];
      updatedSubtasks[activeStep].dateTime = new Date().toLocaleString(); // Capture current date and time
      setSubtasks(updatedSubtasks);
      setActiveStep((prev) => prev + 1);
    } else {
      // When "Finish" is clicked, set the current date and time for the last subtask
      const updatedSubtasks = [...subtasks];
      updatedSubtasks[activeStep].dateTime = new Date().toLocaleString(); // Capture current date and time
      setSubtasks(updatedSubtasks);
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleReset = () => {
    const confirmation = confirm("Are you sure you want to reset the subTasks and notes?")
    if (!confirmation) return
    setNote([]); // Reset notes
    setActiveStep(0); // Reset active step
    setSubtasks(predefinedSubtasks); // Reset subtasks to initial state with dateTime cleared
  };

  const handleSaveNote = async () => {
    try {
      // Map through subtasks and update the note and progress fields
      const updatedSubtasks = subtasks.map((subtask, index) => ({
        ...subtask, // Preserve all existing fields except dateTime
        note: note[index] || "", // Update the note field
        progress: note[index]?.trim() ? 25 : 0, // Update the progress field
        dateTime: subtask.dateTime || null, // Preserve dateTime if already set
      }));

      console.log({ updatedSubtasks });

      // Send the updated subtasks to the backend
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
        // Update the local state with the new subtasks
        setSubtasks(updatedSubtasks);
        setUpdateStateDuringSave(prev => !prev); // Trigger state update
      } else {
        console.log("Failed to update subtasks");
      }
    } catch (error) {
      console.error("Error updating subtasks:", error);
    }
    handleNoteDialogClose(); // Close the dialog after saving
  };

  return (
    <>
      <Paper elevation={2} className="w-full p-5 rounded-lg border border-gray-400 hover:shadow-md transition-all duration-300" sx={{ backgroundColor: "#121111" }}>
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

              {user._id === task.createdBy._id || user._id === task.createdBy ? (
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: {
                      backgroundColor: "#333",
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
                  {user.role === "Admin" && (
                    <MenuItem onClick={() => handleAction("archive")}>
                      <ListItemIcon><MdManageAccounts size={16} color="#ffffff" /></ListItemIcon>
                      <ListItemText>Archive</ListItemText>
                    </MenuItem>
                  )}
                </Menu>
              ) : (
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: {
                      backgroundColor: "#333",
                      color: "#ffffff",
                    },
                  }}
                >
                  <MenuItem onClick={() => handleAction("view")}>
                    <ListItemIcon><VisibilityIcon fontSize="small" sx={{ color: "#ffffff" }} /></ListItemIcon>
                    <ListItemText>View</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => handleAction("favourite")}>
                    <ListItemIcon><FaStar size={16} color="#ffffff" /></ListItemIcon>
                    <ListItemText>Add to favourite</ListItemText>
                  </MenuItem>
                </Menu>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <h4 className="text-lg font-semibold text-[#bdb5b5]">{task?.slid}</h4>
              {activeStep === 0 ? <div>{statusConfig['Todo'].icon}</div> : activeStep === subtasks.length ? <div>{statusConfig['Closed'].icon}</div> : <div>{statusConfig['In Progress'].icon}</div>}
            </div>

            <div className="text-sm text-gray-300 mt-2 space-y-1">
              <p>
                <span className="font-medium text-[#bdb5b5]">Due Date: &#160;</span>
                {formattedDate}
                {!activeStep === subtasks.length && remainingMinutes !== null && (
                  <span className={`ml-2 ${remainingMinutes > 0 ? "text-green-600" : "text-red-600"}`}>
                    {remainingMinutes > 0
                      ? `${Math.floor(remainingMinutes / 1440)} days, ${Math.floor((remainingMinutes % 1440) / 60)} hours, ${remainingMinutes % 60} minutes left`
                      : `${Math.floor(Math.abs(remainingMinutes) / 1440)} days, ${Math.floor((Math.abs(remainingMinutes) % 1440) / 60)} hours, ${Math.abs(remainingMinutes) % 60} minutes overdue`
                    }
                  </span>
                )}
              </p>
              {/* <p><span className="font-medium text-[#bdb5b5]">Category:</span> {task?.category}</p> */}
            </div>

            <div className="mt-3 flex items-center justify-start gap-4">
              <p className="text-sm text-[#bdb5b5] font-medium">Assigned To:</p>
              <AvatarGroup max={3} className="">
                {assignedUsers.length > 0 ? (
                  assignedUsers.map((user) => (
                    <Tooltip key={user._id} title={user.name} arrow>
                      <Avatar
                        src={user.avatar}
                        sx={{
                          backgroundColor: creatorColor.find((user2) => user2.id === user._id)?.color || "#8D6E63",
                          fontSize: "12px",
                          width: 28,  // Set the desired width
                          height: 28  // Set the desired height
                        }}
                      >
                        {!user.avatar ? user.name.slice(0, 2).toUpperCase() : null}
                      </Avatar>
                    </Tooltip>
                  ))
                ) : (
                  <p className="text-gray-500 text-xs">No assignees</p>
                )}
              </AvatarGroup>
            </div>

          </Stack>
          <Stack >
            <div className="mt-3 text-xs text-gray-400">
              <div>
                <p className="text-sm text-[#bdb5b5] font-medium">Progress: ({(100 / subtasks.length) * activeStep}%)</p>
                <LinearProgress variant="determinate" value={(100 / subtasks.length) * activeStep} sx={{ backgroundColor: "#333", "& .MuiLinearProgress-bar": { backgroundColor: "#3ea6ff" } }} />
                {user && (user._id === task.assignedTo[0]._id || user._id === task.assignedTo[0]) && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleNoteDialogOpen}
                    sx={{ mt: 2, backgroundColor: "#01013d", }}
                  >
                    <MdManageAccounts size={20} className="mr-2" />
                    Manage Subtasks
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Avatar
                  sx={{
                    backgroundColor: creatorColor.find(user => user.id === task.createdBy._id || user.id === task.createdBy)?.color || "#8D6E63",
                    fontSize: "12px",
                    width: 28,  // Set the desired width
                    height: 28  // Set the desired height
                  }}>
                  {creator.name?.slice(0, 2).toUpperCase()}
                </Avatar>
                <p><span className="font-medium text-[#bdb5b5]">Created By:</span> {creator.name || "Unknown"}</p>
              </div>
            </div>
          </Stack>
        </Stack>
      </Paper>

      <EditTaskDialog open={editDialogOpen} setOpen={setEditDialogOpen} task={task} handleTaskUpdate={handleTaskUpdate} />

      <Dialog
        open={noteDialogOpen}
        onClose={handleNoteDialogClose}
        PaperProps={{
          sx: {
            backgroundColor: "#121212", // Darker background for better contrast
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
                    <Stack direction={"row"} alignItems={"center"} gap={4} justifyContent={"space-between"}>
                      <Typography variant="caption" sx={{ color: "#ffffff" }}>
                        {subtask.title}
                      </Typography>
                      <Tooltip title={<span style={{ direction: 'rtl', textAlign: 'right', display: 'block', fontSize: '15px' }}>{subtask.note}</span>}
                        placement="bottom-end"
                      >
                        <FaEye color="#3ea6ff" cursor="pointer" size={20} />
                      </Tooltip>
                    </Stack>
                    {subtask.dateTime && (
                      <Typography variant="caption" sx={{ color: "#b3b3b3", display: "block" }}>
                        Completed on: {subtask.dateTime}
                      </Typography>
                    )}
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
                          "&:hover fieldset": { borderColor: "#3ea6ff" }, // Hover border color
                          "&.Mui-focused fieldset": { borderColor: "#3ea6ff" }, // Focus border color
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
                            "&:hover": { backgroundColor: "#333" }, // Dark background on hover
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
                  backgroundColor: "#1e1e1e", // Dark background
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
                    "&:hover": { backgroundColor: "#333" }, // Dark background on hover
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
        <DialogActions sx={{
          display: "flex",
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 2
        }}>
          <Button
            onClick={handleReset}
            sx={{
              color: "brown",
              "&:hover": { backgroundColor: "#333" },
              "&:focus": { outline: "none" },
              transition: "background-color 0.2s ease",
            }}
          >
            Reset
          </Button>
          <Box sx={{ display: "flex", gap: "8px" }}>
            <Button
              onClick={handleNoteDialogClose}
              sx={{
                color: "#ffffff",
                "&:hover": { backgroundColor: "#333" },
                "&:focus": { outline: "none" },
                transition: "background-color 0.2s ease",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNote}
              sx={{
                color: "#ffffff",
                "&:hover": { backgroundColor: "#333" },
                "&:focus": { outline: "none" },
                transition: "background-color 0.2s ease",
              }}
            >
              Save
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskCard;