import { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Menu, MenuItem, ListItemIcon, ListItemText, IconButton, Tooltip, Paper, Stack, AvatarGroup, Avatar, Typography, LinearProgress, Box, Chip } from "@mui/material";
import { MoreVert as MoreVertIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as VisibilityIcon, HourglassEmpty, PlayCircle, CheckCircle, Cancel } from "@mui/icons-material";
import { FaRegCopy, FaStar } from "react-icons/fa";
import { useSelector } from "react-redux";
import api from "../api/api";
import { format, differenceInMinutes } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EditTaskDialog from "./task/EditTaskDialog";
import { IoMdMagnet } from "react-icons/io";
import { MdClose } from "react-icons/md";
import SubtaskManager from "./SubtaskManager";
import { RiProgress4Fill } from "react-icons/ri";

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [subtasks, setSubtasks] = useState(task.subtasks && task.subtasks.length > 0 ? task.subtasks : predefinedSubtasks);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [note, setNote] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [cancelState, setCancelState] = useState(false);
  // const [expandedNotes, setExpandedNotes] = useState({});
  const [expandedNotes, setExpandedNotes] = useState([]);
  const [creatorColor, setCreatorColor] = useState([]);
  const [usersToNotify, setUsersToNotify] = useState([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const formattedDate = task?.date ? format(new Date(task.date), "MMM dd, yyyy HH:mm") : "No Date";
  const remainingMinutes = task?.date ? differenceInMinutes(new Date(task.date), new Date()) : null;

  // Ensure task.subtasks and task.whomItMayConcern are initialized
  task.subtasks = task.subtasks || [];
  task.whomItMayConcern = task.whomItMayConcern || [];

  const assignedUsers = users.filter(user => task.assignedTo.some(assignedUser => assignedUser._id === user._id || assignedUser === user._id));
  const creator = users.find(user => user._id === task.createdBy._id || user._id === task.createdBy) || {};

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  // const toggleNoteExpand = (index) => {
  //   setExpandedNotes(prev => ({
  //     ...prev,
  //     [index]: !prev[index]
  //   }));
  // };

  const toggleNoteExpand = (index) => {
    setExpandedNotes(prev => {
      const newExpanded = Array.isArray(prev) ? [...prev] : Array(subtasks.length).fill(false);
      newExpanded[index] = !newExpanded[index];
      return newExpanded;
    });
  };

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
  }, [task._id, cancelState]);

  useEffect(() => {
    if (users.length > 0 && creatorColor.length === 0) {
      setCreatorColor(users.map(user => ({ id: user._id, color: user.color })));
    }
  }, [users, creatorColor]);

  const handleAction = (action) => {
    handleMenuClose();
    if (action === "edit") setEditDialogOpen(true);
    if (action === "delete") handleTaskDelete(task._id);
    if (action === "favorite") handleFavoriteClick(task);
    if (action === "view") navigate(`/tasks/view-task/${task._id}`, { state: { from: location.pathname } });
    if (action === "archive") handleTaskArchive(task._id);
  };

  const handleNoteDialogOpen = () => {
    setNote(subtasks.map((subtask) => subtask.note || ""));
    setNoteDialogOpen(true);
  };

  const handleNoteDialogClose = () => {
    setNoteDialogOpen(false);
    setCancelState(prevState => !prevState);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleReset = async () => {
    const confirmation = confirm("Are you sure you want to reset the subTasks and notes?");
    if (!confirmation) return;

    // Reset notes, active step, and clear dateTime for all subtasks
    setNote([]);
    setActiveStep(0);
    setSubtasks(predefinedSubtasks.map(subtask => ({
      ...subtask,
      dateTime: null  // Clear the completion date
    })));

    try {
      // Clear notifications by calling the new API endpoint
      const response = await api.put(
        `/tasks/${task._id}/clear-notifications`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.status === 200) {
        // console.log("Notifications cleared successfully");
      } else {
        // console.error("Failed to clear notifications");
      }
    } catch (error) {
      // console.error("Error clearing notifications:", error);
    }
  };

  const handleSaveNote = async () => {
    try {
      // Map through subtasks and update the note and progress fields
      const updatedSubtasks = subtasks.map((subtask, index) => ({
        ...subtask,
        note: note[index] || "",
        progress: note[index]?.trim() ? 25 : 0,
        dateTime: subtask.dateTime || null,
      }));

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
        // console.log("Failed to update subtasks");
      }
    } catch (error) {
      // console.error("Error updating subtasks:", error);
    }
  };

  const handleSaveAndNotify = async () => {
    // Ensure task.subtasks and task.whomItMayConcern are defined
    if (!task.subtasks || !task.whomItMayConcern) {
      // console.error("Task subtasks or whomItMayConcern is not defined.");
      return;
    }

    // Combine assigned users and whom it may concern users, removing duplicates
    const allConcernedUsers = [
      ...new Set([
        ...task.assignedTo.map(user => typeof user === 'string' ? user : user._id),
        ...task.whomItMayConcern.map(user => typeof user === 'string' ? user : user._id)
      ])
    ];

    // Filter out the current user (they don't need to be notified of their own changes)
    const usersToNotifyIds = allConcernedUsers.filter(userId => userId !== user._id);

    // Get the full user objects for these IDs
    const usersToNotifyObjects = users.filter(user =>
      usersToNotifyIds.includes(user._id)
    );

    setUsersToNotify(usersToNotifyObjects);
    setConfirmDialogOpen(true);
  };

  const confirmSaveAndNotify = async () => {
    setConfirmDialogOpen(false);

    try {
      // Map through subtasks and update the note and progress fields
      const updatedSubtasks = subtasks.map((subtask, index) => ({
        ...subtask,
        note: note[index] || "",
        progress: note[index]?.trim() ? 25 : 0,
        dateTime: subtask.dateTime || null,
      }));

      // First, update the subtasks
      const updateResponse = await api.put(
        `/tasks/update-subtask/${task._id}`,
        updatedSubtasks,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (updateResponse.status === 200) {
        setSubtasks(updatedSubtasks);
        setUpdateStateDuringSave(prev => !prev);

        // Clear existing notifications
        await api.put(
          `/tasks/${task._id}/clear-notifications`,
          {},
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );

        // Send new notifications to each user in usersToNotify
        await Promise.all(
          usersToNotify.map(user =>
            api.post(
              `/tasks/${task._id}/notifications`,
              {
                recipient: user._id,
                // The progress must be the total progress of subtasks elements
                message: `Task ${task.slid} has been updated, and its progress is now at ${updatedSubtasks.reduce((total, subtask) => total + subtask.progress, 0)}%. Please review the changes.`,
              },
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
              }
            )
          )
        );
      } else {
        // console.log("Failed to update subtasks");
      }
    } catch (error) {
      // console.error("Error in handleSaveAndNotify:", error);
    } finally {
      handleNoteDialogClose();
    }
  };

  const handleNext = () => {
    if (activeStep < subtasks.length - 1) {
      const updatedSubtasks = [...subtasks];
      updatedSubtasks[activeStep].dateTime = new Date().toLocaleString(); // Capture current date and time
      setSubtasks(updatedSubtasks);
      setActiveStep((prev) => prev + 1);

      // Save progress without notifying and keep the dialog open
      handleSaveNote();
    } else {
      // When "Finish" is clicked, set the current date and time for the last subtask
      const updatedSubtasks = [...subtasks];
      updatedSubtasks[activeStep].dateTime = new Date().toLocaleString(); // Capture current date and time
      setSubtasks(updatedSubtasks);
      setActiveStep((prev) => prev + 1);

      // Save progress without notifying and keep the dialog open
      handleSaveNote();
    }
  };

  return (
    <>
      <Paper elevation={2} className="w-full p-5 rounded-lg border border-gray-400 hover:shadow-md transition-all duration-300" sx={{ backgroundColor: "#121111", borderRadius: isMobile ? 0 : "8px" }}>
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

              <Stack direction="row">
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
                  <MenuItem onClick={() => handleAction("favorite")}>
                    <ListItemIcon><FaStar size={16} color="#ffffff" /></ListItemIcon>
                    <ListItemText>Add to favorite</ListItemText>
                  </MenuItem>
                  {user.role === "Admin" && (
                    <MenuItem onClick={() => handleAction("archive")}>
                      <ListItemIcon><IoMdMagnet size={16} color="#ffffff" /></ListItemIcon>
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
                  <MenuItem onClick={() => handleAction("favorite")}>
                    <ListItemIcon><FaStar size={16} color="#ffffff" /></ListItemIcon>
                    <ListItemText>Add to favorite</ListItemText>
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
                {activeStep !== subtasks.length && remainingMinutes !== null && (
                  <span className={`ml-2 ${remainingMinutes > 0 ? "text-green-600" : "text-red-600"}`}>
                    {remainingMinutes > 0
                      ? `${Math.floor(remainingMinutes / 1440)} days, ${Math.floor((remainingMinutes % 1440) / 60)} hours, ${remainingMinutes % 60} minutes left`
                      : `${Math.floor(Math.abs(remainingMinutes) / 1440)} days, ${Math.floor((Math.abs(remainingMinutes) % 1440) / 60)} hours, ${Math.abs(remainingMinutes) % 60} minutes overdue`
                    }
                  </span>
                )}
              </p>
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
          <Stack>
            <div className="mt-3 text-xs text-gray-400">
              <div>
                <p className="text-sm text-[#bdb5b5] font-medium">Progress: ({(100 / subtasks.length) * activeStep}%)</p>
                <LinearProgress variant="determinate" value={(100 / subtasks.length) * activeStep} sx={{ backgroundColor: "#333", "& .MuiLinearProgress-bar": { backgroundColor: "#3ea6ff" } }} />
                {user && (user._id === task.assignedTo[0]._id || user._id === task.assignedTo[0]) && (
                  <>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleNoteDialogOpen}
                      sx={{ mt: 2, backgroundColor: "#01013d" }}
                    >
                      <RiProgress4Fill size={20} className="mr-2" />
                      Manage Subtasks
                    </Button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Avatar
                  sx={{
                    backgroundColor: creatorColor.find(user => user.id === task.createdBy._id || user.id === task.createdBy)?.color || "#8D6E63",
                    fontSize: "12px",
                    width: 28,  // Set the desired width
                    height: 28  // Set the desired height
                  }}
                >
                  {creator.name?.slice(0, 2).toUpperCase()}
                </Avatar>
                <p><span className="font-medium text-[#bdb5b5]">Created By:</span> {creator.name || "Unknown"}</p>
              </div>
            </div>
          </Stack>
        </Stack>
      </Paper>

      <EditTaskDialog open={editDialogOpen} setOpen={setEditDialogOpen} task={task} handleTaskUpdate={handleTaskUpdate} />

      {/* Subtasks Dialog */}
      <Dialog
        open={noteDialogOpen}
        onClose={handleNoteDialogClose}
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            backgroundColor: "#1e1e1e",
            color: "#ffffff",
            borderRadius: isMobile ? 0 : "8px",
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.5)",
            border: '1px solid #444',
            width: isMobile ? '100%' : 'auto',
            maxWidth: isMobile ? '100%' : 'md'
          },
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#272727',
          color: '#ffffff',
          borderBottom: '1px solid #444',
          padding: '16px 24px',
        }}>
          <Typography variant="h6" component="div">
            Manage Subtasks
          </Typography>
          <IconButton
            onClick={handleNoteDialogClose}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#2a2a2a',
              }
            }}
          >
            <MdClose />
          </IconButton>
        </DialogTitle>

        <SubtaskManager
          subtasks={subtasks}
          note={note}
          setNote={setNote}
          activeStep={activeStep}
          setActiveStep={setActiveStep}
          handleNext={handleNext}
          handleBack={handleBack}
          handleSaveNote={handleSaveNote}
          handleReset={handleReset}
          expandedNotes={expandedNotes}
          setExpandedNotes={setExpandedNotes}
          toggleNoteExpand={toggleNoteExpand}
        />

        <DialogActions sx={{
          display: "flex",
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          backgroundColor: '#272727',
          borderTop: '1px solid #444'
        }}>
          <Button
            onClick={handleReset}
            sx={{
              color: '#f44336',
              '&:hover': {
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
              }
            }}
          >
            Reset
          </Button>
          <Box sx={{ display: "flex", gap: "8px" }}>
            <Button
              onClick={handleNoteDialogClose}
              sx={{
                color: "#ffffff",
                '&:hover': {
                  backgroundColor: "#2a2a2a",
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAndNotify}
              sx={{
                backgroundColor: "#3f51b5",
                color: "#ffffff",
                '&:hover': {
                  backgroundColor: "#303f9f",
                }
              }}
            >
              Save & Notify
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#121212",
            color: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.5)",
          },
        }}
      >
        <DialogTitle sx={{ color: "#ffffff", fontWeight: "600", fontSize: "1.25rem" }}>
          Confirm Save and Notify
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to save the changes and notify the following users?
          </Typography>
          <Box sx={{ maxHeight: '200px', overflow: 'auto', p: 1 }}>
            <Stack spacing={1}>
              {usersToNotify.map(user => (
                <Box key={user._id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    src={user.avatar}
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: creatorColor.find(c => c.id === user._id)?.color || '#8D6E63'
                    }}
                  >
                    {!user.avatar && user.name.slice(0, 2).toUpperCase()}
                  </Avatar>
                  <Typography>{user.name}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
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
            onClick={confirmSaveAndNotify}
            sx={{
              backgroundColor: "darkblue",
              color: "#ffffff",
              "&:hover": { backgroundColor: "darkblue" },
              "&:focus": { outline: "none" },
              transition: "background-color 0.2s ease",
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskCard;
