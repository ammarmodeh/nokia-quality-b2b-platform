import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { format, differenceInMinutes } from "date-fns";
import {
  Paper, Typography, Avatar, Chip, CircularProgress, Stack, Box, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, LinearProgress,
  Stepper, Step, StepLabel, StepContent, Tooltip, IconButton
} from "@mui/material";
import { useSelector } from "react-redux";
import { FaEdit, FaEye } from "react-icons/fa";
import { MdClose, MdDeleteForever, MdContentCopy } from "react-icons/md";
import api from "../api/api";
import EditTaskDialog from "../components/task/EditTaskDialog";

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
  // const { createdBy, ...rest } = task;
  return task;
};

const TaskViewPage = () => {
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
  const location = useLocation();
  const from = location.state?.from || "/dashboard";
  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(20);

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
        console.error("Error fetching task details:", error);
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
        console.error("Error fetching assigned users:", error);
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
        console.error("Error fetching whom it may concern users:", error);
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
        console.log("Failed to update subtasks");
      }
    } catch (error) {
      console.error("Error updating subtasks:", error);
    }
    handleNoteDialogClose();
  };

  const handleEditTask = (updatedTask) => {
    if (!updatedTask) {
      console.error("Updated task is undefined");
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
          // console.log("Deleted task:", res.data);

          navigate("/tasks");
        }
      } else {
        alert("Failed to add task to trash.");
      }
    } catch (error) {
      console.error("Error Adding task to trash:", error);
    }
  };

  const handleExpand = () => {
    setRows((prev) => prev + 1);
    setCols((prev) => prev + 10);
  };

  const handleShrink = () => {
    if (rows > 1) {
      setRows((prev) => prev - 1);
    }
    if (cols > 20) {
      setCols((prev) => prev - 10);
    }
  };

  const handleCopyDetails = () => {
    const detailsText = `Task Details:
      ID: ${task._id}
      Request Number: ${task.requestNumber}
      SLID: ${task.slid}
      Tarrif Name: ${task.tarrifName}
      Evaluation Score: ${task.evaluationScore}
      Priority: ${task.priority}
      Category: ${task.category}
      PIS Date: ${formattedPISDate}
      Due Date: ${formattedDate}
      Customer Name: ${task.customerName || "N/A"}
      Contact Number: ${task.contactNumber || "N/A"}
      Customer Type: ${task.customerType || "N/A"}
      Governorate: ${task.governorate || "N/A"}
      District: ${task.district || "N/A"}
      Team Name: ${task.teamName || "N/A"}
      Team Company: ${task.teamCompany || "N/A"}`;

    navigator.clipboard.writeText(detailsText)
      .then(() => alert('Task details copied to clipboard!'))
      .catch(() => alert('Failed to copy details'));
  };

  if (loading) return <CircularProgress />;
  if (!task) return <Typography>No task found</Typography>;

  return (
    <Box sx={{
      backgroundColor: '#1e1e1e',
      minHeight: '100vh',
      p: 3,
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
          p: 2,
          borderBottom: '1px solid #444',
          backgroundColor: '#272727'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Link to={from} style={{ textDecoration: 'none' }}>
              <Button variant="outlined" sx={{ color: '#ffffff', borderColor: '#444' }}>
                Back
              </Button>
            </Link>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'dodgerblue' }}>
              Task Details
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Copy Details">
              <IconButton onClick={handleCopyDetails} sx={{ color: '#ffffff' }}>
                <MdContentCopy />
              </IconButton>
            </Tooltip>

            {task.createdBy._id === user._id && (
              <>
                <Tooltip title="Edit Task">
                  <IconButton onClick={() => handleEditTask(task)} sx={{ color: '#ffffff' }}>
                    <FaEdit />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Delete Task">
                  <IconButton onClick={() => handleTaskDelete(task._id)} sx={{ color: '#f44336' }}>
                    <MdDeleteForever />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>

        {/* Main Content */}
        <Box sx={{ p: 3 }}>
          {/* Basic Information Section */}
          <Paper elevation={0} sx={{
            p: 3,
            mb: 3,
            backgroundColor: '#272727',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Basic Information
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              <DetailRow label="Issue ID" value={task._id} />
              <DetailRow label="Request Number" value={task.requestNumber} />
              <DetailRow label="SLID" value={task.slid} />
              <DetailRow label="Tarrif Name" value={task.tarrifName} />
              <DetailRow label="Evaluation Score" value={
                <Chip
                  label={task.evaluationScore}
                  sx={{
                    backgroundColor: task.evaluationScore <= 6 ? '#bf0c0c' : 'gray',
                    color: 'white'
                  }}
                />
              } />
            </Box>
          </Paper>

          {/* Priority and Dates Section */}
          <Paper elevation={0} sx={{
            p: 3,
            mb: 3,
            backgroundColor: '#272727',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Priority & Dates
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              <DetailRow label="Priority" value={
                <Chip
                  label={task.priority}
                  color={priorityColors[task.priority] || "default"}
                />
              } />
              <DetailRow label="Category" value={task.category} />
              <DetailRow label="PIS Date" value={formattedPISDate} />
              <DetailRow label="Due Date" value={
                <>
                  {formattedDate}
                  {remainingMinutes !== null && (
                    <Typography variant="caption" sx={{
                      ml: 1,
                      color: remainingMinutes > 0 ? '#4caf50' : '#f44336'
                    }}>
                      ({remainingMinutes > 0 ?
                        `${Math.floor(remainingMinutes / 1440)} days, ${Math.floor((remainingMinutes % 1440) / 60)} hours, ${remainingMinutes % 60} minutes left` :
                        `${Math.floor(Math.abs(remainingMinutes) / 1440)} days, ${Math.floor((Math.abs(remainingMinutes) % 1440) / 60)} hours, ${Math.abs(remainingMinutes) % 60} minutes overdue`})
                    </Typography>
                  )}
                </>
              } />
            </Box>
          </Paper>

          {/* Customer Information Section */}
          <Paper elevation={0} sx={{
            p: 3,
            mb: 3,
            backgroundColor: '#272727',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Customer Information
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              <DetailRow label="Customer Name" value={task.customerName || "N/A"} />
              <DetailRow label="Contact Number" value={task.contactNumber || "N/A"} />
              <DetailRow label="Customer Type" value={task.customerType || "N/A"} />
              <DetailRow label="Customer Feedback" value={task.customerFeedback || "N/A"} />
              <DetailRow label="Interview Date" value={
                task.interviewDate ? format(new Date(task.interviewDate), "MMMM dd, yyyy") : "N/A"
              } />
            </Box>
          </Paper>

          {/* Location and Team Information */}
          <Paper elevation={0} sx={{
            p: 3,
            mb: 3,
            backgroundColor: '#272727',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Location & Team Information
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              <DetailRow label="Governorate" value={task.governorate || "N/A"} />
              <DetailRow label="District" value={task.district || "N/A"} />
              <DetailRow label="Team Name" value={task.teamName || "N/A"} />
              <DetailRow label="Team Company" value={task.teamCompany || "N/A"} />
            </Box>
          </Paper>

          {/* Task Details Section */}
          <Paper elevation={0} sx={{
            p: 3,
            mb: 3,
            backgroundColor: '#272727',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'cornflowerblue' }}>
              Task Details
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              <DetailRow label="Reason" value={task.reason || "N/A"} />
              <DetailRow label="Validation Category" value={task.validationCat || "N/A"} />
              <DetailRow label="Validation Status" value={task.validationStatus || "N/A"} />
              <DetailRow label="Responsibility" value={task.responsibility || "N/A"} />
            </Box>
          </Paper>

          {/* Assigned Users Section */}
          <Paper elevation={0} sx={{
            p: 3,
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
                    sx={{ backgroundColor: "#3a4044", color: "white" }}
                    avatar={
                      <Avatar>
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
                    label={user.name}
                  />
                ))
              ) : (
                <Typography variant="body2" sx={{ color: "darkgray" }}>No assigned users</Typography>
              )}
            </Box>
          </Paper>

          {/* Concerned Users Section */}
          <Paper elevation={0} sx={{
            p: 3,
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
                    sx={{ backgroundColor: "#3a4044", color: "white" }}
                    avatar={
                      <Avatar>
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
                    label={user.name}
                  />
                ))
              ) : (
                <Typography variant="body2" sx={{ color: "darkgray" }}>No users in this list</Typography>
              )}
            </Box>
          </Paper>

          {/* Progress Section */}
          <Paper elevation={0} sx={{
            p: 3,
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
                  <Typography variant="h6" sx={{ mb: 1, color: '#eff5ff' }}>
                    {index + 1}. {subtask.title}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1, direction: 'rtl', textAlign: 'right', color: '#eff5ff' }}>
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
            p: 3,
            backgroundColor: '#272727',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#6495ED' }}>
              Metadata
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              <DetailRow
                label="Created by"
                value={`${task.createdBy?.name} on ${new Date(task.createdAt).toLocaleString()}`}
              />
              <DetailRow
                label="Last updated"
                value={new Date(task.updatedAt).toLocaleString()}
              />
            </Box>
          </Paper>
        </Box>
      </Paper>

      {/* Subtasks Dialog */}
      <Dialog
        open={noteDialogOpen}
        onClose={handleNoteDialogClose}
        PaperProps={{
          sx: {
            backgroundColor: "#1e1e1e",
            color: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.5)",
            border: '1px solid #444'
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

        <DialogContent dividers sx={{
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          padding: '20px 24px',
        }}>
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
                      color: "#ffffff",
                      "& .MuiStepIcon-root": { color: "#3f51b5" },
                      "& .MuiStepIcon-completed": { color: "#4caf50" },
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
                      multiline
                      rows={rows}
                      value={note[index] || ""}
                      onChange={(e) => {
                        const newNote = [...note];
                        newNote[index] = e.target.value;
                        setNote(newNote);
                      }}
                      sx={{
                        color: "#ffffff",
                        "& .MuiInputBase-input": { color: "#ffffff" },
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { borderColor: "#555" },
                          "&:hover fieldset": { borderColor: "#3ea6ff" },
                          "&.Mui-focused fieldset": { borderColor: "#3ea6ff" },
                        },
                        backgroundColor: '#272727',
                        borderRadius: '4px'
                      }}
                      InputLabelProps={{
                        sx: { color: "#b3b3b3" },
                      }}
                      InputProps={{
                        sx: { color: "#ffffff" },
                      }}
                    />
                    <Box sx={{ mt: 1 }}>
                      <Button
                        onClick={handleExpand}
                        sx={{
                          mr: 1,
                          color: '#3ea6ff',
                          '&:hover': {
                            backgroundColor: 'rgba(62, 166, 255, 0.1)',
                          }
                        }}
                      >
                        Expand
                      </Button>
                      <Button
                        onClick={handleShrink}
                        disabled={rows <= 1 && cols <= 20}
                        sx={{
                          color: '#3ea6ff',
                          '&:hover': {
                            backgroundColor: 'rgba(62, 166, 255, 0.1)',
                          }
                        }}
                      >
                        Shrink
                      </Button>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        sx={{
                          mt: 1,
                          mr: 1,
                          backgroundColor: "#3f51b5",
                          color: "#ffffff",
                          '&:hover': {
                            backgroundColor: "#303f9f",
                          }
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
                            color: "#ffffff",
                            '&:hover': {
                              backgroundColor: "#2a2a2a",
                            }
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
                  backgroundColor: "#272727",
                  color: "#ffffff",
                  borderRadius: "8px",
                  border: '1px solid #444'
                }}
              >
                <Typography>All steps completed - you&apos;re finished</Typography>
                <Button
                  onClick={handleReset}
                  sx={{
                    mt: 1,
                    mr: 1,
                    color: "#ffffff",
                    '&:hover': {
                      backgroundColor: "#2a2a2a",
                    }
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
              onClick={handleSaveNote}
              sx={{
                backgroundColor: "#3f51b5",
                color: "#ffffff",
                '&:hover': {
                  backgroundColor: "#303f9f",
                }
              }}
            >
              Save
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <EditTaskDialog open={editDialogOpen} setOpen={setEditDialogOpen} task={task} handleTaskUpdate={handleEditTask} />
    </Box>
  );
};

// Helper component for consistent detail rows
const DetailRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Typography
      component="div"  // Change from default 'p' to 'div'
      variant="subtitle1"
      sx={{
        fontWeight: '500',
        color: '#aaaaaa'
      }}
    >
      {label}:
    </Typography>
    <Box
      sx={{
        maxWidth: '60%',
        textAlign: 'right',
        color: '#ffffff'
      }}
      component="div"
    >
      {typeof value === 'string' || typeof value === 'number' ? (
        <Typography component="span">{value || 'N/A'}</Typography>
      ) : (
        value || 'N/A'
      )}
    </Box>
  </Box>
);

export default TaskViewPage;