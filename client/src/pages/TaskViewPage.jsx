import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { format, differenceInMinutes } from "date-fns";
import {
  Paper, Typography, Avatar, Chip, Stack, Box, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip, IconButton,
  useMediaQuery, useTheme
} from "@mui/material";
import { useSelector } from "react-redux";
import { FaEdit } from "react-icons/fa";
import { MdClose, MdDeleteForever, MdContentCopy } from "react-icons/md";
import api from "../api/api";
import EditTaskDialog from "../components/task/EditTaskDialog";
import LoadingSpinner from '../components/common/LoadingSpinner';
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
  const [expandedNotes, setExpandedNotes] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [additionalInfo, setAdditionalInfo] = useState({
    ontType: null,
    speed: null,
    serviceRecipientInitial: null,
    serviceRecipientQoS: null,
  });

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
        setCheckpoints(subtasks.map(st => st.checkpoints || []));
        setAdditionalInfo({
          ontType: filledTask.ontType || null,
          speed: filledTask.speed || null,
          serviceRecipientInitial: filledTask.serviceRecipientInitial || null,
          serviceRecipientQoS: filledTask.serviceRecipientQoS || null,
        });
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

  // const handleNoteDialogOpen = () => {
  //   setNote(subtasks.map((subtask) => subtask.note || ""));
  //   setNoteDialogOpen(true);
  // };

  const handleNoteDialogClose = () => {
    setNoteDialogOpen(false);
  };

  const handleNoteChange = (index, value) => {
    const newNotes = [...note];
    newNotes[index] = value;
    setNote(newNotes);
  };

  const handleCheckpointToggle = (subtaskIndex, cpIdx) => {
    const updatedCheckpoints = [...checkpoints];
    if (updatedCheckpoints[subtaskIndex] && updatedCheckpoints[subtaskIndex][cpIdx]) {
      updatedCheckpoints[subtaskIndex][cpIdx].checked = !updatedCheckpoints[subtaskIndex][cpIdx].checked;
      setCheckpoints(updatedCheckpoints);
    }
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

  const handleSaveNote = async (updatedSubtasksFromManager) => {
    try {
      const subtasksToSave = updatedSubtasksFromManager || subtasks.map((subtask, index) => ({
        ...subtask,
        note: note[index] || "",
        progress: note[index]?.trim() ? 25 : 0,
        dateTime: subtask.dateTime || null,
        checkpoints: checkpoints[index] || [],
      }));

      const response = await api.put(
        `/tasks/update-subtask/${task._id}`,
        {
          subtasks: subtasksToSave,
          notify: false,
          subtaskType: task.subtaskType || "original",
          ontType: additionalInfo.ontType,
          speed: additionalInfo.speed,
          serviceRecipientInitial: additionalInfo.serviceRecipientInitial,
          serviceRecipientQoS: additionalInfo.serviceRecipientQoS,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.status === 200) {
        setSubtasks(subtasksToSave);
        setTask(response.data);
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
        checkpoints: checkpoints[index] || [],
      }));

      const updateResponse = await api.put(
        `/tasks/update-subtask/${task._id}`,
        {
          subtasks: updatedSubtasks,
          notify: true,
          subtaskType: task.subtaskType || "original",
          ontType: additionalInfo.ontType,
          speed: additionalInfo.speed,
          serviceRecipientInitial: additionalInfo.serviceRecipientInitial,
          serviceRecipientQoS: additionalInfo.serviceRecipientQoS,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (updateResponse.status === 200) {
        setSubtasks(updatedSubtasks);
        setTask(updateResponse.data);

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
      console.log(error);
    }
    handleNoteDialogClose();
  };

  const handleTaskUpdate = (updatedTask) => {
    if (!updatedTask) {
      console.error("Updated task is undefined");
      return;
    }

    // Preserve createdBy if it's an object in the current task but not in the updated task
    let finalTask = { ...updatedTask };
    if (task?.createdBy && typeof task.createdBy === 'object' &&
      (!updatedTask.createdBy || typeof updatedTask.createdBy !== 'object')) {
      finalTask.createdBy = task.createdBy;
    }

    const filledTask = fillTaskExceptCreatedFields(finalTask);
    setTask(filledTask);
  };

  const handleOpenEditDialog = () => {
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
      Operation: ${task.operation || "N/A"}
      SLID: ${task.slid}
      Tariff Name: ${task.tarrifName}
      Satisfaction Score: ${task.evaluationScore}
      PIS Date: ${formattedPISDate}
      Due Date: ${formattedDate}
      Customer Name: ${task.customerName || "N/A"}
      Contact Number: ${task.contactNumber || "N/A"}
      Contact Feedback: ${task.customerFeedback || "N/A"}
      Customer Type: ${task.customerType || "N/A"}
      Governorate: ${task.governorate || "N/A"}
      District: ${task.district || "N/A"}
      Team Name: ${task.teamName || "N/A"}
      Subcon: ${task.teamCompany || "N/A"}`;

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

  if (loading) return <LoadingSpinner variant="page" />;
  if (!task) return <Typography>No task found</Typography>;

  return (
    <Box sx={{
      // backgroundColor: '#2d2d2d',
      minHeight: '100vh',
      p: isMobile ? 1 : 3,
      color: '#ffffff'
    }}>
      <Paper elevation={0} sx={{
        // backgroundColor: '#2d2d2d',
        borderRadius: '8px',
        border: '1px solid #3d3d3d',
        overflow: 'hidden'
      }}>
        {/* Header Section */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: isMobile ? 1 : 2,
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#2d2d2d',
          gap: isMobile ? 1 : 0
        }}>
          <Link to={from} style={{ textDecoration: 'none' }}>
            <Button variant="outlined" size={isMobile ? "small" : "medium"} sx={{ color: '#ffffff', borderColor: '#3d3d3d' }}>
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
                  <IconButton onClick={handleOpenEditDialog} sx={{ color: '#ffffff' }}>
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
            backgroundColor: '#2d2d2d',
            borderRadius: '8px',
            border: '1px solid #3d3d3d'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Basic Information
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              <DetailRow label="Issue ID" value={task._id} isMobile={isMobile} />
              <DetailRow label="Request Number" value={task.requestNumber} isMobile={isMobile} />
              <DetailRow label="Operation" value={task.operation || "N/A"} isMobile={isMobile} />
              <DetailRow label="SLID" value={task.slid} isMobile={isMobile} />
              <DetailRow label="Tariff Name" value={task.tarrifName} isMobile={isMobile} />
              <DetailRow label="Satisfaction Score" value={
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
            backgroundColor: '#2d2d2d',
            borderRadius: '8px',
            border: '1px solid #3d3d3d'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Feedback Severity & Dates
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              <DetailRow label="Feedback Severity" value={
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
            backgroundColor: '#2d2d2d',
            borderRadius: '8px',
            border: '1px solid #3d3d3d'
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
            backgroundColor: '#2d2d2d',
            borderRadius: '8px',
            border: '1px solid #3d3d3d'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Location & Team Information
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              <DetailRow label="Governorate" value={task.governorate || "N/A"} isMobile={isMobile} />
              <DetailRow label="District" value={task.district || "N/A"} isMobile={isMobile} />
              <DetailRow label="Team Name" value={task.teamName || "N/A"} isMobile={isMobile} />
              <DetailRow label="Subcon" value={task.teamCompany || "N/A"} isMobile={isMobile} />
            </Box>
          </Paper>

          {/* Task Details Section */}
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 3,
            mb: 3,
            backgroundColor: '#2d2d2d',
            borderRadius: '8px',
            border: '1px solid #3d3d3d'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Task Details
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              <DetailRow label="Owner" value={task.responsible || "N/A"} isMobile={isMobile} />
              <DetailRow label="Reason (Level 1)" value={task.reason || "N/A"} isMobile={isMobile} />
              <DetailRow label="Sub Reason (Level 2)" value={task.subReason || "N/A"} isMobile={isMobile} />
              <DetailRow label="Root Cause (Level 3)" value={task.rootCause || "N/A"} isMobile={isMobile} />
              <DetailRow label="Validation Status" value={task.validationStatus || "N/A"} isMobile={isMobile} />
            </Box>
          </Paper>

          {/* Equipment & Verification Section */}
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 3,
            mb: 3,
            backgroundColor: '#2d2d2d',
            borderRadius: '8px',
            border: '1px solid #3d3d3d'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Equipment & Verification
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              <DetailRow label="ONT Type" value={task.ontType || "N/A"} isMobile={isMobile} />
              <DetailRow label="Speed Plan" value={task.speed ? `${task.speed} Mbps` : "N/A"} isMobile={isMobile} />
              <DetailRow label="Service Recipient" value={task.serviceRecipientInitial || "N/A"} isMobile={isMobile} />
              <DetailRow label="Recipient QoS" value={task.serviceRecipientQoS || "N/A"} isMobile={isMobile} />
              <DetailRow label="Free Extender" value={task.freeExtender || "No"} isMobile={isMobile} />
              {task.freeExtender === 'Yes' && (
                <>
                  <DetailRow label="Extender Type" value={task.extenderType || "N/A"} isMobile={isMobile} />
                  <DetailRow label="Number of Extenders" value={task.extenderNumber || 0} isMobile={isMobile} />
                </>
              )}
              <DetailRow label="Closure Call Evaluation" value={task.closureCallEvaluation || "N/A"} isMobile={isMobile} />
              <DetailRow label="Closure Call Feedback" value={task.closureCallFeedback || "N/A"} isMobile={isMobile} />
            </Box>
          </Paper>

          {/* Assigned Users Section */}
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 3,
            mb: 3,
            backgroundColor: '#2d2d2d',
            borderRadius: '8px',
            border: '1px solid #3d3d3d'
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
                    label={isMobile ? user.name?.split(' ')[0] || '?' : user.name || 'Unknown'}
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
            backgroundColor: '#2d2d2d',
            borderRadius: '8px',
            border: '1px solid #3d3d3d'
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
                    label={isMobile ? user.name?.split(' ')[0] || '?' : user.name || 'Unknown'}
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
            backgroundColor: '#2d2d2d',
            borderRadius: '8px',
            border: '1px solid #3d3d3d'
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
              backgroundColor: '#2d2d2d',
              border: '1px solid #3d3d3d',
              borderRadius: '8px'
            }}>
              {subtasks.map((subtask, index) => (
                <Box key={index} sx={{ mb: index < subtasks.length - 1 ? 3 : 0, pb: index < subtasks.length - 1 ? 3 : 0, borderBottom: index < subtasks.length - 1 ? '1px solid #3d3d3d' : 'none' }}>
                  <Typography variant={isMobile ? "body1" : "h6"} sx={{ mb: 1, color: '#eff5ff', fontWeight: 'bold' }}>
                    {index + 1}. {subtask.title}
                  </Typography>

                  {subtask.note && (
                    <Typography variant="body2" sx={{ mb: 1, direction: 'rtl', textAlign: 'right', color: '#eff5ff', p: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                      {subtask.note}
                    </Typography>
                  )}

                  {subtask.shortNote && (
                    <Box sx={{ mb: 2, p: 1.5, backgroundColor: 'rgba(33, 150, 243, 0.05)', borderRadius: '4px', borderRight: '4px solid #2196f3' }}>
                      <Typography variant="caption" sx={{ color: '#2196f3', fontWeight: 'bold', display: 'block', mb: 0.5, textAlign: 'right' }}>
                        Reception Summary:
                      </Typography>
                      <Typography variant="body2" sx={{ direction: 'rtl', textAlign: 'right', color: '#ffffff', fontWeight: '500' }}>
                        {subtask.shortNote}
                      </Typography>
                    </Box>
                  )}

                  {subtask.checkpoints && subtask.checkpoints.length > 0 && (
                    <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #3d3d3d' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, color: '#6495ED', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Checkpoints & Results
                      </Typography>
                      {subtask.checkpoints.map((cp, cpIdx) => (
                        <Box key={cpIdx} sx={{ mb: 1.5 }}>
                          <Typography variant="body2" sx={{
                            color: cp.checked ? '#4caf50' : '#f44336',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            fontWeight: '500'
                          }}>
                            {cp.checked ? '✓' : '✗'} {cp.name}
                          </Typography>

                          {cp.signalTestNotes && (
                            <Typography variant="caption" display="block" sx={{ color: '#bdb5b5', ml: 3 }}>
                              Signal: {cp.signalTestNotes} dBm
                            </Typography>
                          )}

                          {cp.options?.selected && (
                            <Box sx={{ ml: 3, mt: 0.5 }}>
                              <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
                                Result: <span style={{ color: '#ffffff' }}>
                                  {cp.options.choices?.find(c => c.value === cp.options.selected)?.label || cp.options.selected}
                                </span>
                              </Typography>

                              {/* Action Taken */}
                              {cp.options.actionTaken?.selected && (
                                <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
                                  Action: <span style={{ color: '#6495ED' }}>
                                    {cp.options.actionTaken.choices?.find(c => c.value === cp.options.actionTaken.selected)?.label || cp.options.actionTaken.selected}
                                  </span>
                                </Typography>
                              )}

                              {/* Justification */}
                              {cp.options.actionTaken?.justification?.selected && (
                                <Box sx={{ mt: 0.5, p: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                                  <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
                                    Justification: <span style={{ color: '#fbc02d' }}>
                                      {cp.options.actionTaken.justification.choices?.find(c => c.value === cp.options.actionTaken.justification.selected)?.label || cp.options.actionTaken.justification.selected}
                                    </span>
                                  </Typography>
                                  {cp.options.actionTaken.justification.notes?.value && (
                                    <Typography variant="caption" sx={{ color: '#bdb5b5', display: 'block', fontStyle: 'italic', mt: 0.5 }}>
                                      Notes: {cp.options.actionTaken.justification.notes.value}
                                    </Typography>
                                  )}
                                </Box>
                              )}

                              {/* Follow Up Questions */}
                              {cp.options.followUpQuestion?.selected && (
                                <Box sx={{ mt: 0.5, ml: 1, pl: 1, borderLeft: '1px dashed #4b5563' }}>
                                  <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
                                    Follow-up: <span style={{ color: '#ffffff' }}>
                                      {cp.options.followUpQuestion.choices?.find(c => c.value === cp.options.followUpQuestion.selected)?.label || cp.options.followUpQuestion.selected}
                                    </span>
                                  </Typography>
                                  {cp.options.followUpQuestion.actionTaken?.selected && (
                                    <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
                                      Follow-up Action: <span style={{ color: '#6495ED' }}>
                                        {cp.options.followUpQuestion.actionTaken.choices?.find(c => c.value === cp.options.followUpQuestion.actionTaken.selected)?.label || cp.options.followUpQuestion.actionTaken.selected}
                                      </span>
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </Box>
                          )}

                          {cp.options?.type === 'text' && cp.options.value && (
                            <Typography variant="caption" display="block" sx={{ color: '#bdb5b5', ml: 3, fontStyle: 'italic', direction: 'rtl', textAlign: 'right' }}>
                              Answer: {cp.options.value}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  )}

                  {index === subtasks.length - 1 && (task.subtaskType === "visit" || task.subtaskType === "phone") && (
                    <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #6495ED' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, color: '#6495ED', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Additional Assessment Details
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 1, ml: 1 }}>
                        {task.ontType && (
                          <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
                            ONT Type: <span style={{ color: '#ffffff' }}>{task.ontType}</span>
                          </Typography>
                        )}
                        {task.speed && (
                          <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
                            Speed Plan: <span style={{ color: '#ffffff' }}>{task.speed} Mbps</span>
                          </Typography>
                        )}
                        {task.serviceRecipientInitial && (
                          <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
                            Service Recipient (Initial): <span style={{ color: '#ffffff' }}>{task.serviceRecipientInitial}</span>
                          </Typography>
                        )}
                        {task.serviceRecipientQoS && (
                          <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block' }}>
                            Service Recipient (QoS): <span style={{ color: '#ffffff' }}>{task.serviceRecipientQoS}</span>
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}

                  {subtask.dateTime && (
                    <Typography variant="caption" sx={{ color: 'gray', display: 'block', mt: 1 }}>
                      Last updated on: {new Date(subtask.dateTime).toLocaleString()}
                    </Typography>
                  )}
                </Box>
              ))}
            </Paper>

            {/* {user && task.assignedTo[0] === user._id && (
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
            )} */}
          </Paper>

          {/* Metadata Section */}
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 3,
            backgroundColor: '#2d2d2d',
            borderRadius: '8px',
            border: '1px solid #3d3d3d'
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
            backgroundColor: "#2d2d2d",
            color: "#ffffff",
            borderRadius: isMobile ? 0 : "8px",
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.5)",
            border: '1px solid #3d3d3d',
            width: isMobile ? '100%' : 'auto',
            maxWidth: isMobile ? '100%' : 'md'
          },
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
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
          notes={note}
          setNote={setNote}
          checkpoints={checkpoints}
          setCheckpoints={setCheckpoints}
          handleCheckpointToggle={handleCheckpointToggle}
          handleNoteChange={handleNoteChange}
          setSubtasks={setSubtasks}
          setAdditionalInfo={setAdditionalInfo}
          handleSaveNote={handleSaveNote}
          handleReset={handleReset}
          expandedNotes={expandedNotes}
          setExpandedNotes={setExpandedNotes}
          toggleNoteExpand={toggleNoteExpand}
          isMobile={isMobile}
          selectedTaskId={task._id}
          selectedOption={task.subtaskType || "original"}
        />

        <DialogActions sx={{
          display: "flex",
          justifyContent: 'space-between',
          alignItems: 'center',
          p: isMobile ? 1 : 2,
          backgroundColor: '#2d2d2d',
          borderTop: '1px solid #e5e7eb'
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
            backgroundColor: "#2d2d2d",
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
              "&:hover": { backgroundColor: "#2d2d2d" },
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

      <EditTaskDialog open={editDialogOpen} setOpen={setEditDialogOpen} task={task} handleTaskUpdate={handleTaskUpdate} />
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
        color: '#b3b3b3'
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