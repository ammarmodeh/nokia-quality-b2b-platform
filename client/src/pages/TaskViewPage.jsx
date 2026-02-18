import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  Paper, Typography, Avatar, Chip, Stack, Box, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, IconButton,
  useMediaQuery, useTheme, alpha, Tabs, Tab, Divider, TextField, MenuItem,
  List, ListItem, ListItemText, ListItemAvatar, Grid
} from "@mui/material";
import { useSelector } from "react-redux";
import { FaEdit, FaHistory, FaTools, FaInfoCircle, FaClipboardList } from "react-icons/fa";
import { MdClose, MdDeleteForever, MdContentCopy, MdVisibility, MdAdd, MdCheckCircle, MdSchedule } from "react-icons/md";
import api from "../api/api";
import EditTaskDialog from "../components/task/EditTaskDialog";
import RecordTicketDialog from "../components/task/RecordTicketDialog";
import LoadingSpinner from '../components/common/LoadingSpinner';

const TaskViewPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const loggedInUser = useSelector((state) => state?.auth?.user);
  const { id } = useParams();
  const location = useLocation();
  const from = location.state?.from || "/dashboard";

  const [task, setTask] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  // Dialog States
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);



  const fetchTaskData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/tasks/view-task/${id}`);
      setTask(data.task);
      setTickets(data.tickets || []);
    } catch (error) {
      console.error("Error fetching task details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskData();
  }, [id]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTicketAdded = (newTicket) => {
    // For TaskViewPage, we specifically want to update the history tab.
    // Since updates and deletes are now triggering this, we should handle them.
    if (newTicket && newTicket._id) {
      // Check if it's an update
      const exists = tickets.find(t => t._id === newTicket._id);
      if (exists) {
        setTickets(prev => prev.map(t => t._id === newTicket._id ? newTicket : t));
      } else {
        setTickets(prev => [newTicket, ...prev]);
      }
      setTask(prev => ({ ...prev, status: newTicket.status }));
    } else {
      // It's a deletion or we don't have the ticket object, refetch everything
      fetchTaskData();
    }
  };

  const handleTaskDelete = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`/tasks/soft-delete-task/${taskId}`);
      alert("Task moved to trash successfully.");
      navigate("/tasks");
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task.");
    }
  };

  const handleCopyDetails = () => {
    if (!task) return;
    const fullDetails = `Task Details:
      SLID: ${task.slid}
      REQ #: ${task.requestNumber}
      Customer: ${task.customerName || "N/A"}
      Status: ${task.status}
      ... (Details copied)`;
    navigator.clipboard.writeText(fullDetails)
      .then(() => alert('Task details copied!'))
      .catch(() => alert('Failed to copy'));
  };

  if (loading) return <LoadingSpinner variant="page" />;
  if (!task) return <Typography sx={{ p: 4, color: 'text.secondary' }}>No task found.</Typography>;

  return (
    <Box sx={{ minHeight: '100vh', p: isMobile ? 1 : 4 }}>
      <Paper elevation={0} sx={{
        bgcolor: theme.palette.background.paper,
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: `0 20px 50px ${alpha(theme.palette.common.black, 0.1)}`,
        border: `1px solid ${theme.palette.divider}`
      }}>
        {/* Modern GAIA-style Header */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: isMobile ? 2 : 3,
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(90deg, #1e293b 0%, #0f172a 100%)`
            : `linear-gradient(90deg, #f1f5f9 0%, #ffffff 100%)`,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Link to={from} style={{ textDecoration: 'none' }}>
              <IconButton sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                <MdClose />
              </IconButton>
            </Link>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.5, color: theme.palette.text.primary }}>
                {task.slid} <span style={{ color: alpha(theme.palette.text.primary, 0.3) }}>/</span> {task.requestNumber}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={task.status}
                  size="small"
                  sx={{
                    bgcolor: alpha(task.status === 'Closed' ? theme.palette.success.main : theme.palette.primary.main, 0.15),
                    color: task.status === 'Closed' ? theme.palette.success.main : theme.palette.primary.main,
                    fontWeight: 800,
                    borderRadius: 1
                  }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Created: {format(new Date(task.createdAt), "MMM dd, yyyy")}</Typography>
              </Stack>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<MdAdd />}
              onClick={() => setTicketDialogOpen(true)}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
              }}
            >
              Add Ticket
            </Button>
            <IconButton onClick={handleCopyDetails} sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <MdContentCopy />
            </IconButton>
            {task.createdBy?._id === loggedInUser?._id && (
              <>
                <IconButton onClick={() => setEditDialogOpen(true)} color="primary" sx={{ border: `1px solid ${theme.palette.divider}` }}>
                  <FaEdit />
                </IconButton>
                <IconButton onClick={() => handleTaskDelete(task._id)} color="error" sx={{ border: `1px solid ${theme.palette.divider}` }}>
                  <MdDeleteForever />
                </IconButton>
              </>
            )}
          </Stack>
        </Box>

        {/* Navigation Tabs */}
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            px: 3,
            borderBottom: `1px solid ${theme.palette.divider}`,
            '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minWidth: 100, fontSize: '0.95rem' }
          }}
        >
          <Tab icon={<FaInfoCircle />} iconPosition="start" label="Overview" />
          <Tab icon={<FaTools />} iconPosition="start" label="Technical" />
          <Tab icon={<FaHistory />} iconPosition="start" label="History" />
          <Tab icon={<FaClipboardList />} iconPosition="start" label="Audit" />
        </Tabs>

        {/* Tab Content Panels */}
        <Box sx={{ p: isMobile ? 2 : 4, minHeight: 400 }}>
          {tabValue === 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 4 }}>
              <Stack spacing={4}>
                <DataSection title="Customer Information">
                  <DetailGrid>
                    <DetailItem label="Full Name" value={task.customerName} />
                    <DetailItem label="Contact #" value={task.contactNumber} />
                    <DetailItem label="Type" value={task.customerType} />
                    <DetailItem label="Location" value={`${task.governorate || ''}${task.governorate && task.district ? ', ' : ''}${task.district || ''}`} />
                    <DetailItem label="Contract Date" value={task.contractDate ? format(new Date(task.contractDate), "MMM dd, yyyy") : '—'} />
                    <DetailItem label="App Date" value={task.appDate ? format(new Date(task.appDate), "MMM dd, yyyy") : '—'} />
                    <DetailItem label="In Date" value={task.inDate ? format(new Date(task.inDate), "MMM dd, yyyy") : '—'} />
                    <DetailItem label="Close Date" value={task.closeDate ? format(new Date(task.closeDate), "MMM dd, yyyy") : '—'} />
                    <DetailItem label="PIS Date" value={task.pisDate ? format(new Date(task.pisDate), "MMM dd, yyyy") : '—'} />
                    <DetailItem label="Interview Date" value={task.interviewDate ? format(new Date(task.interviewDate), "MMM dd, yyyy") : '—'} />
                    <DetailItem label="Initial Feedback" value={task.customerFeedback} fullWidth />
                  </DetailGrid>
                </DataSection>
                <DataSection title="Operations">
                  <DetailGrid>
                    <DetailItem label="Operation Type" value={task.operation} />
                    <DetailItem label="Category" value={task.category} />
                    <DetailItem label="Priority" value={task.priority} />
                    <DetailItem label="Team" value={task.teamName} />
                  </DetailGrid>
                </DataSection>
              </Stack>
              <Stack spacing={3}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 800 }}>Task Breakdown</Typography>
                  <MetricRow label="Satisfaction" value={task.evaluationScore} color="primary" icon={<MdCheckCircle />} />
                  <Divider sx={{ my: 1.5 }} />
                  <MetricRow label="Svc Recipient" value={task.serviceRecipientInitial} color="info" icon={<MdVisibility />} />
                  <Divider sx={{ my: 1.5 }} />
                  <MetricRow label="Last Update" value={format(new Date(task.updatedAt), "HH:mm, MMM dd")} color="warning" icon={<MdSchedule />} />
                </Paper>
              </Stack>
            </Box>
          )}

          {tabValue === 1 && (
            <DataSection title="Technical Details">
              <DetailGrid>
                <DetailItem label="Tariff Name" value={task.tarrifName} />
                <DetailItem label="Speed (Mbps)" value={task.speed} />
                <DetailItem label="ONT Type" value={task.ontType} />
                <DetailItem label="Extender" value={task.freeExtender === 'Yes' ? `${task.extenderType} (x${task.extenderNumber})` : 'No'} />
                <DetailItem label="GAIA Content" value={task.gaiaContent} fullWidth direction="ltr" />
              </DetailGrid>

              <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.05)' }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                ROOT CAUSE ANALYSIS
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <DetailItem label="Main Reason" value={task.reason} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <DetailItem label="Sub Reason" value={task.subReason} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <DetailItem label="Root Cause" value={task.rootCause} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <DetailItem label="Owner" value={task.responsible} />
                </Grid>
              </Grid>
            </DataSection>
          )}

          {tabValue === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Tracking History</Typography>
                <Button startIcon={<MdAdd />} onClick={() => setTicketDialogOpen(true)}>Record New Event</Button>
              </Box>
              <List sx={{ p: 0 }}>
                {tickets.map((ticket, index) => (
                  <ListItem key={ticket._id} alignItems="flex-start" sx={{
                    mb: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    bgcolor: theme.palette.background.default,
                    transition: 'all 0.2s',
                    '&:hover': { transform: 'translateX(5px)', borderColor: theme.palette.primary.main }
                  }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: alpha(getTicketColor(ticket.mainCategory, theme), 0.1), color: getTicketColor(ticket.mainCategory, theme) }}>
                        <FaHistory size={18} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{ticket.mainCategory}</Typography>
                          <Chip label={ticket.status} size="small" variant="outlined" />
                          <Typography variant="caption" sx={{ color: 'text.secondary', flexGrow: 1, textAlign: 'right' }}>
                            {format(new Date(ticket.timestamp), "MMM dd, yyyy HH:mm")}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Box sx={{ mt: 1.5 }}>
                          <Typography variant="body2" color="text.primary" sx={{ fontStyle: ticket.note ? 'normal' : 'italic', mb: 1, fontWeight: 500 }}>
                            {ticket.note || "No details recorded."}
                          </Typography>

                          <Grid container spacing={1} sx={{ mt: 1 }}>
                            {ticket.eventDate && (
                              <Grid item xs={12} sm={4}>
                                <Typography variant="caption" color="text.secondary">Event Date: </Typography>
                                <Typography variant="caption" fontWeight={700}>{format(new Date(ticket.eventDate), "MMM dd, yyyy")}</Typography>
                              </Grid>
                            )}
                            {ticket.rootCause && (
                              <Grid item xs={12} sm={4}>
                                <Typography variant="caption" color="text.secondary">Root Cause: </Typography>
                                <Typography variant="caption" fontWeight={700}>{ticket.rootCause}</Typography>
                              </Grid>
                            )}
                            {ticket.actionTaken && (
                              <Grid item xs={12} sm={4}>
                                <Typography variant="caption" color="text.secondary">Action: </Typography>
                                <Typography variant="caption" fontWeight={700}>{ticket.actionTaken}</Typography>
                              </Grid>
                            )}
                            {ticket.resolutionDate && (
                              <Grid item xs={12} sm={4}>
                                <Typography variant="caption" color="text.secondary">Resolved: </Typography>
                                <Typography variant="caption" fontWeight={700}>{format(new Date(ticket.resolutionDate), "MMM dd, yyyy")}</Typography>
                              </Grid>
                            )}
                            {ticket.closureDate && (
                              <Grid item xs={12} sm={4}>
                                <Typography variant="caption" color="text.secondary">Closed: </Typography>
                                <Typography variant="caption" fontWeight={700}>{format(new Date(ticket.closureDate), "MMM dd, yyyy")}</Typography>
                              </Grid>
                            )}
                            {ticket.followUpRequired && (
                              <Grid item xs={12}>
                                <Chip
                                  size="small"
                                  label={`Follow-up: ${ticket.followUpDate ? format(new Date(ticket.followUpDate), "MMM dd") : 'Required'}`}
                                  color="warning"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                                />
                              </Grid>
                            )}
                          </Grid>

                          <Typography variant="caption" sx={{ display: 'block', mt: 2, color: theme.palette.primary.main, fontWeight: 700, borderTop: `1px dashed ${theme.palette.divider}`, pt: 1 }}>
                            Logged by: {ticket.recordedBy?.name}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {tabValue === 3 && (
            <DataSection title="Quality Audit & Validation">
              <DetailGrid>
                <DetailItem label="Validation Status" value={task.validationStatus} />
                <DetailItem label="Closure Score" value={task.evaluationScore} />
              </DetailGrid>
            </DataSection>
          )}
        </Box>
      </Paper>

      {/* Ticket Recording Dialog */}
      <RecordTicketDialog
        open={ticketDialogOpen}
        onClose={() => setTicketDialogOpen(false)}
        task={task}
        onTicketAdded={handleTicketAdded}
      />

      <EditTaskDialog
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
        task={task}
        handleTaskUpdate={(val) => setTask(val)}
      />
    </Box>
  );
};

// --- Helper Components & Functions ---

const DataSection = ({ title, children }) => (
  <Box>
    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Typography>
    <Box>{children}</Box>
  </Box>
);

const DetailGrid = ({ children }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 3 }}>
    {children}
  </Box>
);

const DetailItem = ({ label, value, fullWidth, direction }) => (
  <Box sx={{ gridColumn: fullWidth ? '1 / -1' : 'auto', direction: direction || 'inherit' }}>
    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>{label}</Typography>
    {Array.isArray(value) && value.length > 0 ? (
      <Stack direction="column" spacing={1} alignItems="flex-start">
        {value.map((item, index) => (
          <Chip
            key={index}
            label={item}
            size="small"
            sx={{
              height: 'auto',
              py: 0.5,
              whiteSpace: 'normal',
              textAlign: 'left',
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          />
        ))}
      </Stack>
    ) : (
      <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5, textAlign: direction === 'ltr' ? 'left' : 'inherit' }}>{value || "—"}</Typography>
    )}
  </Box>
);

const MetricRow = ({ label, value, color, icon }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ color }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
    </Stack>
    <Typography variant="body2" sx={{ fontWeight: 800 }}>{value || "N/A"}</Typography>
  </Stack>
);

const getTicketColor = (category, theme) => {
  switch (category) {
    case 'Resolved': case 'Closed': return theme.palette.success.main;
    case 'Postponed': case 'No Answer': return theme.palette.warning.main;
    case 'Ticket Reopened': return theme.palette.error.main;
    default: return theme.palette.primary.main;
  }
};

export default TaskViewPage;