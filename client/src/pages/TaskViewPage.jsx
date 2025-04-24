import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { format, differenceInMinutes } from "date-fns";
import {
  Paper, Typography, Avatar, Chip, CircularProgress, Stack, Box, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip, IconButton,
  useMediaQuery, useTheme
} from "@mui/material";
import { useSelector } from "react-redux";
import { FaEdit } from "react-icons/fa";
import { MdClose, MdDeleteForever, MdContentCopy } from "react-icons/md";
import api from "../api/api";
import EditTaskDialog from "../components/task/EditTaskDialog";
import SubtaskManager from "../components/SubtaskManager";

const priorityColors = {
  High: "error",
  Medium: "warning",
  Low: "success",
};

const predefinedSubtasks = [
  { title: "Receive the task", progress: 0, note: "", dateTime: null },
  { title: "Called to the customer and specify an appointment", progress: 0, note: "", dateTime: null },
  { title: "Reach at the customer and solve the problem", progress: 0, note: "", dateTime: null },
  { title: "If the customer refuses the visit to close the task", progress: 0, note: "", dateTime: null },
];

const fillTaskExceptCreatedFields = (task) => {
  return task;
};

const TaskViewPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const user = useSelector((state) => state?.auth?.user);
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [whomItMayConcernUsers, setWhomItMayConcernUsers] = useState([]);
  const [subtasks, setSubtasks] = useState(predefinedSubtasks);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [note, setNote] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [usersToNotify, setUsersToNotify] = useState([]);
  const location = useLocation();
  const from = location.state?.from || "/dashboard";
  // const [expandedNotes, setExpandedNotes] = useState({});
  const [expandedNotes, setExpandedNotes] = useState([]);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const { data } = await api.get(`/tasks/view-task/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });

        const filledTask = fillTaskExceptCreatedFields(data);
        const subtasks = filledTask.subTasks && Array.isArray(filledTask.subTasks) ? filledTask.subTasks : [];
        setTask(filledTask);
        setSubtasks(subtasks);
        const activeSteps = subtasks.filter((subtask) => subtask.note !== "").length;
        setActiveStep(activeSteps);
        setNote(subtasks.map((subtask) => subtask.note));
      } catch (error) {
        // console.error("Error fetching task details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [id]);

  useEffect(() => {
    const fetchAssignedUsers = async () => {
      if (!task?.assignedTo?.length) return;

      const userIds = task?.assignedTo;

      try {
        const { data } = await api.post(
          `/users/get-users-by-ids`,
          { userIds },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          }
        );
        setAssignedUsers(data);
      } catch (error) {
        // console.error("Error fetching assigned users:", error);
      }
    };

    const fetchWhomItMayConcernUsers = async () => {
      if (!task?.whomItMayConcern?.length) return;

      const userIds = task?.whomItMayConcern;

      try {
        const { data } = await api.post(
          `/users/get-users-by-ids`,
          { userIds },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
          }
        );
        setWhomItMayConcernUsers(data);
      } catch (error) {
        // console.error("Error fetching whom it may concern users:", error);
      }
    };

    fetchAssignedUsers();
    fetchWhomItMayConcernUsers();
  }, [task]);

  const formattedPISDate = task?.pisDate ? format(new Date(task.pisDate), "MMMM dd, yyyy") : "No Date";
  const formattedDate = task?.date ? format(new Date(task.date), "MMM dd, yyyy HH:mm") : "No Date";
  const remainingMinutes = task?.date ? differenceInMinutes(new Date(task.date), new Date()) : null;

  const handleNoteDialogOpen = () => {
    setNote(subtasks.map((subtask) => subtask.note || ""));
    setNoteDialogOpen(true);
  };

  const handleNoteDialogClose = () => {
    setNoteDialogOpen(false);
  };

  const handleNext = () => {
    if (activeStep < subtasks.length - 1) {
      const updatedSubtasks = [...subtasks];
      updatedSubtasks[activeStep].dateTime = new Date().toLocaleString();
      setSubtasks(updatedSubtasks);
      setActiveStep((prev) => prev + 1);
    } else {
      const updatedSubtasks = [...subtasks];
      updatedSubtasks[activeStep].dateTime = new Date().toLocaleString();
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
    setNote([]);
    setActiveStep(0);
    setSubtasks(predefinedSubtasks);
  };

  const handleSaveNote = async () => {
    try {
      const updatedSubtasks = subtasks.map((subtask, index) => ({
        ...subtask,
        note: note[index] || "",
        progress: note[index]?.trim() ? 25 : 0,
        dateTime: subtask.dateTime || null,
      }));

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
        setSubtasks(updatedSubtasks);
      } else {
        // console.log("Failed to update subtasks");
      }
    } catch (error) {
      // console.error("Error updating subtasks:", error);
    }
    handleNoteDialogClose();
  };

  const handleSaveAndNotify = async () => {
    if (!task.subTasks || !task.whomItMayConcern) {
      return;
    }

    const allConcernedUsers = [
      ...new Set([
        ...task.assignedTo.map(user => typeof user === 'string' ? user : user._id),
        ...task.whomItMayConcern.map(user => typeof user === 'string' ? user : user._id)
      ])
    ];

    const usersToNotifyIds = allConcernedUsers.filter(userId => userId !== user._id);

    const usersToNotifyObjects = assignedUsers.concat(whomItMayConcernUsers).filter(user =>
      usersToNotifyIds.includes(user._id)
    );

    setUsersToNotify(usersToNotifyObjects);
    setConfirmDialogOpen(true);
  };

  const confirmSaveAndNotify = async () => {
    setConfirmDialogOpen(false);

    try {
      const updatedSubtasks = subtasks.map((subtask, index) => ({
        ...subtask,
        note: note[index] || "",
        progress: note[index]?.trim() ? 25 : 0,
        dateTime: subtask.dateTime || null,
      }));

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

        await api.put(
          `/tasks/${task._id}/clear-notifications`,
          {},
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );

        await Promise.all(
          usersToNotify.map(user =>
            api.post(
              `/tasks/${task._id}/notifications`,
              {
                recipient: user._id,
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

  const handleEditTask = (updatedTask) => {
    if (!updatedTask) {
      // console.error("Updated task is undefined");
      return;
    }
    const filledTask = fillTaskExceptCreatedFields(updatedTask);
    setTask(filledTask);
    setEditDialogOpen(true);
  };

  const handleTaskDelete = async (taskId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this task?");

    if (!confirmDelete) return;

    try {
      const { data } = await api.get(`/tasks/get-task/${taskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      if (data) {
        const response = await api.post(`/trash/add-trash`, data, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });

        if (response.status === 200) {
          alert("Task added to trash successfully! You can check the trash page.");

          const res = await api.delete(`/tasks/delete-task/${taskId}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          });
          navigate("/tasks");
        }
      } else {
        alert("Failed to add task to trash.");
      }
    } catch (error) {
      // console.error("Error Adding task to trash:", error);
    }
  };

  const handleCopyDetails = () => {
    const detailsText = `Task Details:
      ID: ${task._id}
      Request Number: ${task.requestNumber}
      SLID: ${task.slid}
      Tarrif Name: ${task.tarrifName}
      Evaluation Score: ${task.evaluationScore}
      PIS Date: ${formattedPISDate}
      Due Date: ${formattedDate}
      Customer Name: ${task.customerName || "N/A"}
      Contact Number: ${task.contactNumber || "N/A"}
      Contact Feedback: ${task.customerFeedback || "N/A"}
      Customer Type: ${task.customerType || "N/A"}
      Governorate: ${task.governorate || "N/A"}
      District: ${task.district || "N/A"}
      Team Name: ${task.teamName || "N/A"}
      Team Company: ${task.teamCompany || "N/A"}`;

    navigator.clipboard.writeText(detailsText)
      .then(() => alert('Task details copied to clipboard!'))
      .catch(() => alert('Failed to copy details'));
  };

  const toggleNoteExpand = (index) => {
    setExpandedNotes(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (loading) return <CircularProgress />;
  if (!task) return <Typography>No task found</Typography>;

  return (
    <Box sx={{
      backgroundColor: '#1e1e1e',
      minHeight: '100vh',
      p: isMobile ? 1 : 3,
      color: '#ffffff'
    }}>
      <Paper elevation={0} sx={{
        backgroundColor: '#1e1e1e',
        borderRadius: '8px',
        border: '1px solid #444',
        overflow: 'hidden'
      }}>
        {/* Header Section */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: isMobile ? 1 : 2,
          borderBottom: '1px solid #444',
          backgroundColor: '#272727',
          gap: isMobile ? 1 : 0
        }}>
          <Link to={from} style={{ textDecoration: 'none' }}>
            <Button variant="outlined" size={isMobile ? "small" : "medium"} sx={{ color: '#ffffff', borderColor: '#444' }}>
              Back
            </Button>
          </Link>
          {/* <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 'bold', color: 'dodgerblue' }}>
              Task Details
            </Typography> */}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Copy Details">
              <IconButton onClick={handleCopyDetails} sx={{ color: '#ffffff' }}>
                <MdContentCopy size={isMobile ? 18 : 24} />
              </IconButton>
            </Tooltip>

            {task.createdBy._id === user._id && (
              <>
                <Tooltip title="Edit Task">
                  <IconButton onClick={() => handleEditTask(task)} sx={{ color: '#ffffff' }}>
                    <FaEdit size={isMobile ? 18 : 24} />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Delete Task">
                  <IconButton onClick={() => handleTaskDelete(task._id)} sx={{ color: '#f44336' }}>
                    <MdDeleteForever size={isMobile ? 18 : 24} />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>

        {/* Main Content */}
        <Box sx={{ p: isMobile ? 1 : 3 }}>
          {/* Basic Information Section */}
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 3,
            mb: 3,
            backgroundColor: '#272727',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Basic Information
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              <DetailRow label="Issue ID" value={task._id} isMobile={isMobile} />
              <DetailRow label="Request Number" value={task.requestNumber} isMobile={isMobile} />
              <DetailRow label="SLID" value={task.slid} isMobile={isMobile} />
              <DetailRow label="Tarrif Name" value={task.tarrifName} isMobile={isMobile} />
              <DetailRow label="Evaluation Score" value={
                <Chip
                  size={isMobile ? "small" : "medium"}
                  label={task.evaluationScore}
                  sx={{
                    backgroundColor: task.evaluationScore <= 6 ? '#bf0c0c' : 'gray',
                    color: 'white'
                  }}
                />
              } isMobile={isMobile} />
            </Box>
          </Paper>

          {/* Priority and Dates Section */}
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 3,
            mb: 3,
            backgroundColor: '#272727',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Priority & Dates
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              <DetailRow label="Priority" value={
                <Chip
                  size={isMobile ? "small" : "medium"}
                  label={task.priority}
                  color={priorityColors[task.priority] || "default"}
                />
              } isMobile={isMobile} />
              <DetailRow label="Category" value={task.category} isMobile={isMobile} />
              <DetailRow label="PIS Date" value={formattedPISDate} isMobile={isMobile} />
              <DetailRow label="Due Date" value={
                <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-end' : 'center' }}>
                  {formattedDate}
                  {remainingMinutes !== null && (
                    <Typography variant="caption" sx={{
                      ml: isMobile ? 0 : 1,
                      mt: isMobile ? 0.5 : 0,
                      color: remainingMinutes > 0 ? '#4caf50' : '#f44336'
                    }}>
                      ({remainingMinutes > 0 ?
                        `${Math.floor(remainingMinutes / 1440)} days, ${Math.floor((remainingMinutes % 1440) / 60)} hours, ${remainingMinutes % 60} minutes left` :
                        `${Math.floor(Math.abs(remainingMinutes) / 1440)} days, ${Math.floor((Math.abs(remainingMinutes) % 1440) / 60)} hours, ${Math.abs(remainingMinutes) % 60} minutes overdue`})
                    </Typography>
                  )}
                </Box>
              } isMobile={isMobile} />
            </Box>
          </Paper>

          {/* Customer Information Section */}
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 3,
            mb: 3,
            backgroundColor: '#272727',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Customer Information
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              <DetailRow label="Customer Name" value={task.customerName || "N/A"} isMobile={isMobile} />
              <DetailRow label="Contact Number" value={task.contactNumber || "N/A"} isMobile={isMobile} />
              <DetailRow label="Customer Type" value={task.customerType || "N/A"} isMobile={isMobile} />
              <DetailRow label="Customer Feedback" value={task.customerFeedback || "N/A"} isMobile={isMobile} />
              <DetailRow label="Interview Date" value={
                task.interviewDate ? format(new Date(task.interviewDate), "MMMM dd, yyyy") : "N/A"
              } isMobile={isMobile} />
            </Box>
          </Paper>

          {/* Location and Team Information */}
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 3,
            mb: 3,
            backgroundColor: '#272727',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Location & Team Information
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              <DetailRow label="Governorate" value={task.governorate || "N/A"} isMobile={isMobile} />
              <DetailRow label="District" value={task.district || "N/A"} isMobile={isMobile} />
              <DetailRow label="Team Name" value={task.teamName || "N/A"} isMobile={isMobile} />
              <DetailRow label="Team Company" value={task.teamCompany || "N/A"} isMobile={isMobile} />
            </Box>
          </Paper>

          {/* Task Details Section */}
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 3,
            mb: 3,
            backgroundColor: '#272727',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Task Details
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              <DetailRow label="Reason" value={task.reason || "N/A"} isMobile={isMobile} />
              <DetailRow label="Validation Category" value={task.validationCat || "N/A"} isMobile={isMobile} />
              <DetailRow label="Validation Status" value={task.validationStatus || "N/A"} isMobile={isMobile} />
              <DetailRow label="Responsibility" value={task.responsibility || "N/A"} isMobile={isMobile} />
            </Box>
          </Paper>

          {/* Assigned Users Section */}
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 3,
            mb: 3,
            backgroundColor: '#272727',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Assigned Users
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {assignedUsers.length ? (
                assignedUsers.map((user, index) => (
                  <Chip
                    key={index}
                    size={isMobile ? "small" : "medium"}
                    sx={{ backgroundColor: "#3a4044", color: "white" }}
                    avatar={
                      <Avatar sx={{ width: isMobile ? 24 : 32, height: isMobile ? 24 : 32 }}>
                        {user.name
                          ?.split(' ')
                          .map((part, index) => {
                            if (index === 0 || index === 1) {
                              return part.charAt(0)
                            }
                          })
                          .join('')}
                      </Avatar>
                    }
                    label={isMobile ? user.name.split(' ')[0] : user.name}
                  />
                ))
              ) : (
                <Typography variant="body2" sx={{ color: "darkgray" }}>No assigned users</Typography>
              )}
            </Box>
          </Paper>

          {/* Concerned Users Section */}
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 3,
            mb: 3,
            backgroundColor: '#272727',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Whom It May Concern
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {whomItMayConcernUsers.length ? (
                whomItMayConcernUsers.map((user, index) => (
                  <Chip
                    key={index}
                    size={isMobile ? "small" : "medium"}
                    sx={{ backgroundColor: "#3a4044", color: "white" }}
                    avatar={
                      <Avatar sx={{ width: isMobile ? 24 : 32, height: isMobile ? 24 : 32 }}>
                        {user.name
                          ?.split(' ')
                          .map((part, index) => {
                            if (index === 0 || index === 1) {
                              return part.charAt(0)
                            }
                          })
                          .join('')}
                      </Avatar>
                    }
                    label={isMobile ? user.name.split(' ')[0] : user.name}
                  />
                ))
              ) : (
                <Typography variant="body2" sx={{ color: "darkgray" }}>No users in this list</Typography>
              )}
            </Box>
          </Paper>

          {/* Progress Section */}
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 3,
            mb: 3,
            backgroundColor: '#272727',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Progress
            </Typography>

            <Typography sx={{ mb: 1, color: '#eff5ff' }}>Progress: {(100 / subtasks.length) * activeStep}% </Typography>
            <LinearProgress
              variant="determinate"
              value={(100 / subtasks.length) * activeStep}
              sx={{ height: 8, borderRadius: 4, mb: 3 }}
            />

            <Paper sx={{
              p: 2,
              backgroundColor: '#333',
              border: '1px solid #444',
              borderRadius: '8px'
            }}>
              {subtasks.map((subtask, index) => (
                <Box key={index} sx={{ mb: index < subtasks.length - 1 ? 3 : 0, pb: index < subtasks.length - 1 ? 3 : 0, borderBottom: index < subtasks.length - 1 ? '1px solid #444' : 'none' }}>
                  <Typography variant={isMobile ? "body1" : "h6"} sx={{ mb: 1, color: '#eff5ff' }}>
                    {index + 1}. {subtask.title}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, direction: 'rtl', textAlign: 'right', color: '#eff5ff' }}>
                    {subtask.note}
                  </Typography>
                  {subtask.dateTime && (
                    <Typography variant="caption" sx={{ color: 'gray' }}>
                      Completed on: {subtask.dateTime}
                    </Typography>
                  )}
                </Box>
              ))}
            </Paper>

            {user && task.assignedTo[0] === user._id && (
              <Button
                variant="contained"
                onClick={handleNoteDialogOpen}
                size={isMobile ? "small" : "medium"}
                sx={{
                  mt: 2,
                  backgroundColor: '#3f51b5',
                  '&:hover': {
                    backgroundColor: '#303f9f'
                  }
                }}
              >
                Manage Subtasks
              </Button>
            )}
          </Paper>

          {/* Metadata Section */}
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 3,
            backgroundColor: '#272727',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#6495ED' }}>
              Metadata
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              <DetailRow
                label="Created by"
                value={`${task.createdBy?.name} on ${new Date(task.createdAt).toLocaleString()}`}
                isMobile={isMobile}
              />
              <DetailRow
                label="Last updated"
                value={new Date(task.updatedAt).toLocaleString()}
                isMobile={isMobile}
              />
            </Box>
          </Paper>
        </Box>
      </Paper>

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
          padding: isMobile ? '12px 16px' : '16px 24px',
        }}>
          <Typography variant={isMobile ? "subtitle1" : "h6"} component="div">
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
            <MdClose size={isMobile ? 20 : 24} />
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
          isMobile={isMobile}
        />

        <DialogActions sx={{
          display: "flex",
          justifyContent: 'space-between',
          alignItems: 'center',
          p: isMobile ? 1 : 2,
          backgroundColor: '#272727',
          borderTop: '1px solid #444'
        }}>
          <Button
            onClick={handleReset}
            size={isMobile ? "small" : "medium"}
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
              size={isMobile ? "small" : "medium"}
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
              size={isMobile ? "small" : "medium"}
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
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            backgroundColor: "#121212",
            color: "#ffffff",
            borderRadius: isMobile ? 0 : "8px",
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.5)",
            width: isMobile ? '100%' : 'auto'
          },
        }}
      >
        <DialogTitle sx={{ color: "#ffffff", fontWeight: "600", fontSize: isMobile ? "1rem" : "1.25rem" }}>
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
                      width: isMobile ? 28 : 32,
                      height: isMobile ? 28 : 32,
                      bgcolor: '#8D6E63'
                    }}
                  >
                    {!user.avatar && user.name.slice(0, 2).toUpperCase()}
                  </Avatar>
                  <Typography variant={isMobile ? "body2" : "body1"}>{user.name}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            size={isMobile ? "small" : "medium"}
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
            size={isMobile ? "small" : "medium"}
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

      <EditTaskDialog open={editDialogOpen} setOpen={setEditDialogOpen} task={task} handleTaskUpdate={handleEditTask} />
    </Box>
  );
};

// Helper component for consistent detail rows
const DetailRow = ({ label, value, isMobile }) => (
  <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 0.5 : 0 }}>
    <Typography
      component="div"
      variant={isMobile ? "body2" : "subtitle1"}
      sx={{
        fontWeight: '500',
        color: '#aaaaaa'
      }}
    >
      {label}:
    </Typography>
    <Box
      sx={{
        maxWidth: isMobile ? '100%' : '60%',
        textAlign: isMobile ? 'left' : 'right',
        color: '#ffffff',
        wordBreak: 'break-word'
      }}
      component="div"
    >
      {typeof value === 'string' || typeof value === 'number' ? (
        <Typography component="span" variant={isMobile ? "body2" : "body1"}>{value || 'N/A'}</Typography>
      ) : (
        value || 'N/A'
      )}
    </Box>
  </Box>
);

export default TaskViewPage;