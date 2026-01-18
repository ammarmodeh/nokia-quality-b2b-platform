import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { format, differenceInMinutes } from "date-fns";
import {
  Paper, Typography, Avatar, Chip, Stack, Box, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress, Tooltip, IconButton,
  useMediaQuery, useTheme, alpha
} from "@mui/material";
import { useSelector } from "react-redux";
import { FaEdit } from "react-icons/fa";
import { MdClose, MdDeleteForever, MdContentCopy, MdVisibility } from "react-icons/md";
import api from "../api/api";
import EditTaskDialog from "../components/task/EditTaskDialog";
import DetailedSubtaskDialog from "../components/task/DetailedSubtaskDialog";
import TaskProgressDialog from "../components/task/TaskProgressDialog";
import LoadingSpinner from '../components/common/LoadingSpinner';

const TaskViewPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const user = useSelector((state) => state?.auth?.user);
  const { id } = useParams();
  const location = useLocation();
  const from = location.state?.from || "/dashboard";

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [whomItMayConcernUsers, setWhomItMayConcernUsers] = useState([]);
  const [subtasks, setSubtasks] = useState([]);

  // Dialog States
  const [manageSubtasksOpen, setManageSubtasksOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Derived state
  const [activeStep, setActiveStep] = useState(0);
  const [refetchTrigger, setRefetchTrigger] = useState(false);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const { data } = await api.get(`/tasks/view-task/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });

        const taskData = data;
        const taskSubtasks = taskData.subTasks && Array.isArray(taskData.subTasks) ? taskData.subTasks : [];

        setTask(taskData);
        setSubtasks(taskSubtasks);

        const completedSteps = taskSubtasks.filter((subtask) => subtask.note !== "").length;
        setActiveStep(completedSteps);

      } catch (error) {
        console.error("Error fetching task details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [id, refetchTrigger]);

  useEffect(() => {
    const fetchUsers = async (userIds, setter) => {
      if (!userIds?.length) return;
      try {
        const { data } = await api.post(
          `/users/get-users-by-ids`,
          { userIds },
          { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
        );
        setter(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    if (task) {
      fetchUsers(task.assignedTo, setAssignedUsers);
      fetchUsers(task.whomItMayConcern, setWhomItMayConcernUsers);
    }
  }, [task]);

  const handleTaskUpdate = (updatedTask) => {
    if (!updatedTask) return;

    // Preserve createdBy if needed (similar to previous logic)
    let finalTask = { ...updatedTask };
    if (task?.createdBy && typeof task.createdBy === 'object' &&
      (!updatedTask.createdBy || typeof updatedTask.createdBy !== 'object')) {
      finalTask.createdBy = task.createdBy;
    }

    setTask(finalTask);
    const updatedSubtasks = finalTask.subTasks || [];
    setSubtasks(updatedSubtasks);
    setActiveStep(updatedSubtasks.filter((st) => st.note !== "").length);
  };

  const handleTaskDelete = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    try {
      const { data } = await api.get(`/tasks/get-task/${taskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      if (data) {
        await api.post(`/trash/add-trash`, data, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        await api.delete(`/tasks/delete-task/${taskId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        alert("Task moved to trash successfully.");
        navigate("/tasks");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task.");
    }
  };

  const handleCopyDetails = () => {
    if (!task) return;
    const detailsText = `Task Details:
      ID: ${task._id}
      SLID: ${task.slid}
      Customer: ${task.customerName || "N/A"}
      Status: ${task.status}
      ...`; // Simplified for brevity in clipboard, or keep full if preferred

    // Keep full details as before
    const fullDetails = `Task Details:
      ID: ${task._id}
      Request Number: ${task.requestNumber}
      Operation: ${task.operation || "N/A"}
      SLID: ${task.slid}
      Tariff Name: ${task.tarrifName}
      Satisfaction Score: ${task.evaluationScore}
      PIS Date: ${task.pisDate ? format(new Date(task.pisDate), "MMMM dd, yyyy") : "N/A"}
      Due Date: ${task.date ? format(new Date(task.date), "MMM dd, yyyy HH:mm") : "N/A"}
      Customer Name: ${task.customerName || "N/A"}
      Contact Number: ${task.contactNumber || "N/A"}
      Contact Feedback: ${task.customerFeedback || "N/A"}
      Customer Type: ${task.customerType || "N/A"}
      Governorate: ${task.governorate || "N/A"}
      District: ${task.district || "N/A"}
      Team Name: ${task.teamName || "N/A"}
      Subcon: ${task.teamCompany || "N/A"}`;

    navigator.clipboard.writeText(fullDetails)
      .then(() => alert('Task details copied!'))
      .catch(() => alert('Failed to copy'));
  };

  if (loading) return <LoadingSpinner variant="page" />;
  if (!task) return <Typography sx={{ p: 4, color: 'text.secondary' }}>No task found.</Typography>;

  return (
    <Box sx={{
      minHeight: '100vh',
      p: isMobile ? 1 : 4,
      // bgcolor: theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc',
      color: theme.palette.text.primary
    }}>
      <Paper elevation={0} sx={{
        bgcolor: theme.palette.background.paper,
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: theme.shadows[3]
      }}>
        {/* Header Section */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: isMobile ? 2 : 3,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 2 : 0
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: isMobile ? '100%' : 'auto' }}>
            <Link to={from} style={{ textDecoration: 'none' }}>
              <IconButton sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                <MdClose />
              </IconButton>
            </Link>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}>SLID | REQ #</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'monospace' }}>
                {task.slid} <span style={{ color: alpha(theme.palette.text.secondary, 0.5), fontSize: '1.2rem' }}>#{task.requestNumber}</span>
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={() => setProgressDialogOpen(true)}
              startIcon={<MdVisibility />}
              sx={{
                fontWeight: 600,
                borderRadius: 2,
                px: 2,
                textTransform: 'none'
              }}
            >
              View Progress
            </Button>

            <Button
              variant="contained"
              onClick={() => setManageSubtasksOpen(true)}
              startIcon={<FaEdit />}
              sx={{
                bgcolor: theme.palette.primary.main,
                color: '#fff',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                px: 3,
                py: 1,
                boxShadow: `0 8px 16px ${theme.palette.primary.main}40`,
                '&:hover': { bgcolor: theme.palette.primary.dark }
              }}
            >
              Manage Subtasks
            </Button>

            <Tooltip title="Copy Details">
              <IconButton onClick={handleCopyDetails} sx={{ color: 'text.secondary' }}>
                <MdContentCopy />
              </IconButton>
            </Tooltip>

            {task.createdBy?._id === user?._id && (
              <Tooltip title="Delete Task">
                <IconButton onClick={() => handleTaskDelete(task._id)} sx={{ color: theme.palette.error.main }}>
                  <MdDeleteForever />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Main Content */}
        <Box sx={{ p: isMobile ? 2 : 4 }}>
          <Stack spacing={4}>
            {/* Top Row: Status & Metrics */}
            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: 3 }}>
              <MetricCard label="Status" value={task.status} color="primary" />
              <MetricCard label="Priority" value={task.priority} color={task.priority === 'High' ? 'error' : 'warning'} />
              <MetricCard label="Score" value={task.evaluationScore} color={task.evaluationScore >= 7 ? 'success' : task.evaluationScore < 4 ? 'error' : 'warning'} />
              <MetricCard label="Progress" value={`${Math.round((100 / (subtasks.length || 1)) * activeStep)}%`} color="info" />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 4 }}>
              {/* Left Column: Details */}
              <Stack spacing={4}>
                <Section title="Customer Information">
                  <DetailGrid>
                    <DetailItem label="Name" value={task.customerName} />
                    <DetailItem label="Contact" value={task.contactNumber} />
                    <DetailItem label="Type" value={task.customerType} />
                    <DetailItem label="Feedback" value={task.customerFeedback} fullWidth />
                  </DetailGrid>
                </Section>

                <Section title="Location & Operations">
                  <DetailGrid>
                    <DetailItem label="Governorate" value={task.governorate} />
                    <DetailItem label="District" value={task.district} />
                    <DetailItem label="Operation" value={task.operation} />
                    <DetailItem label="Category" value={task.category} />
                    <DetailItem label="Team" value={task.teamName} />
                    <DetailItem label="Subcon" value={task.teamCompany} />
                  </DetailGrid>
                </Section>

                <Section title="Technical Details">
                  <DetailGrid>
                    <DetailItem label="Tariff Name" value={task.tarrifName} />
                    <DetailItem label="Reason" value={task.reason} />
                    <DetailItem label="Sub-Reason" value={task.subReason} />
                    <DetailItem label="Root Cause" value={task.rootCause} />
                    <DetailItem label="Speed" value={task.speed ? `${task.speed} Mbps` : null} />
                    <DetailItem label="ONT Type" value={task.ontType} />
                    <DetailItem label="Extender" value={task.freeExtender === 'Yes' ? `${task.extenderType} (x${task.extenderNumber})` : 'No'} />
                    <DetailItem label="Validation" value={task.validationStatus} />
                  </DetailGrid>
                </Section>

                <Section title="Evaluation & Quality">
                  <DetailGrid>
                    <DetailItem label="Closure Score" value={task.closureCallEvaluation ? `${task.closureCallEvaluation}/10` : null} />
                    <DetailItem label="Closure Feedback" value={task.closureCallFeedback} />
                    <DetailItem label="Svc Recipient" value={task.serviceRecipientInitial} />
                    <DetailItem label="Recipient QoS" value={task.serviceRecipientQoS} />
                  </DetailGrid>
                </Section>
              </Stack>

              {/* Right Column: Timeline & Meta */}
              <Stack spacing={4}>
                <Paper elevation={0} sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Timeline</Typography>
                  <TimelineItem label="Created" date={task.createdAt} />
                  <TimelineItem label="PIS Date" date={task.pisDate} />
                  <TimelineItem label="Due Date" date={task.date} highlight />
                  <TimelineItem label="Interview" date={task.interviewDate} />
                  <TimelineItem label="Last Updated" date={task.updatedAt} />
                </Paper>

                <Paper elevation={0} sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Assignments</Typography>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>Responsible</Typography>
                  <Chip label={task.responsible || "Unassigned"} sx={{ mb: 3 }} />

                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>Assigned To</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {assignedUsers.map(u => (
                      <Chip key={u._id} avatar={<Avatar>{u.name[0]}</Avatar>} label={u.name.split(' ')[0]} />
                    ))}
                  </Box>
                </Paper>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Paper>

      {/* VIEW PROGRESS DIALOG (Read Only) */}
      <Dialog
        open={progressDialogOpen}
        onClose={() => setProgressDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: theme.palette.background.paper,
            boxShadow: theme.shadows[10],
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Task Progress & Details</Typography>
          <IconButton onClick={() => setProgressDialogOpen(false)}>
            <MdClose />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Overall Completion</Typography>
              <Typography variant="h6" color="primary.main">{Math.round((100 / (subtasks.length || 1)) * activeStep)}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(100 / subtasks.length) * activeStep}
              sx={{ height: 10, borderRadius: 5, mb: 4, bgcolor: alpha(theme.palette.primary.main, 0.1) }}
            />

            <Stack spacing={3}>
              {subtasks.map((subtask, index) => (
                <Box key={index} sx={{
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: alpha(theme.palette.background.default, 0.5)
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: subtask.note ? 'success.main' : 'text.primary' }}>
                      {index + 1}. {subtask.title}
                    </Typography>
                    {subtask.dateTime && (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {new Date(subtask.dateTime).toLocaleString()}
                      </Typography>
                    )}
                  </Box>

                  {/* Notes */}
                  {subtask.note && (
                    <Box sx={{ mt: 1, p: 2, bgcolor: alpha(theme.palette.success.main, 0.05), borderLeft: `4px solid ${theme.palette.success.main}`, borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.primary' }}>
                        "{subtask.note}"
                      </Typography>
                    </Box>
                  )}

                  {/* Reception Summary */}
                  {subtask.shortNote && (
                    <Box sx={{ mt: 1, p: 2, bgcolor: alpha(theme.palette.info.main, 0.05), borderLeft: `4px solid ${theme.palette.info.main}`, borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 700, display: 'block' }}>RECEPTION SUMMARY</Typography>
                      <Typography variant="body2">{subtask.shortNote}</Typography>
                    </Box>
                  )}

                  {/* Checkpoints */}
                  {subtask.checkpoints && subtask.checkpoints.length > 0 && (
                    <Box sx={{ mt: 2, pl: 2 }}>
                      {subtask.checkpoints.map((cp, cpIdx) => (
                        <Box key={cpIdx} sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ color: cp.checked ? 'success.main' : 'text.secondary', fontWeight: cp.checked ? 600 : 400 }}>
                              {cp.checked ? '✓' : '○'} {cp.name}
                            </Typography>
                          </Box>

                          {/* Nested Checkpoint Data Display (read-only) */}
                          {cp.options?.selected && (
                            <Typography variant="caption" sx={{ display: 'block', ml: 3, color: 'text.secondary' }}>
                              Result: {cp.options.choices?.find(c => c.value === cp.options.selected)?.label || cp.options.selected}
                            </Typography>
                          )}
                          {cp.options?.actionTaken?.selected && (
                            <Typography variant="caption" sx={{ display: 'block', ml: 3, color: 'info.main' }}>
                              Action: {cp.options.actionTaken.choices?.find(c => c.value === cp.options.actionTaken.selected)?.label || cp.options.actionTaken.selected}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProgressDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* MANAGE SUBTASKS DIALOG */}
      <DetailedSubtaskDialog
        open={manageSubtasksOpen}
        onClose={() => setManageSubtasksOpen(false)}
        task={task}
        setUpdateTasksList={setRefetchTrigger}
      />

      {/* EDIT TASK DIALOG */}
      <EditTaskDialog
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
        task={task}
        handleTaskUpdate={handleTaskUpdate}
      />
    </Box>
  );
};

// --- Helper Components ---

const Section = ({ title, children }) => (
  <Box>
    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: 'text.primary' }}>{title}</Typography>
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      {children}
    </Paper>
  </Box>
);

const DetailGrid = ({ children }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 3 }}>
    {children}
  </Box>
);

const DetailItem = ({ label, value, fullWidth }) => (
  <Box sx={{ gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.5 }}>
      {label.toUpperCase()}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', wordBreak: 'break-word' }}>
      {value || "N/A"}
    </Typography>
  </Box>
);

const MetricCard = ({ label, value, color }) => {
  const theme = useTheme();
  return (
    <Paper elevation={0} sx={{
      p: 2,
      bgcolor: alpha(theme.palette[color].main, 0.1),
      color: theme.palette[color].main,
      border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`,
      borderRadius: 3,
      textAlign: 'center'
    }}>
      <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8 }}>{label.toUpperCase()}</Typography>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>{value}</Typography>
    </Paper>
  );
}

const TimelineItem = ({ label, date, highlight }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: highlight ? 800 : 600, color: highlight ? 'error.main' : 'text.primary' }}>
      {date ? format(new Date(date), "MMM dd, yyyy") : "N/A"}
    </Typography>
  </Box>
);

export default TaskViewPage;