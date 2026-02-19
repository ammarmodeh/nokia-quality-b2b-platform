import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  Typography,
  Box,
  Divider,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Avatar,
  Grid,
  useTheme,
  useMediaQuery,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress
} from '@mui/material';
import * as XLSX from 'xlsx';
import {
  MdClose,
  MdContentCopy,
  MdFileDownload,
  MdPerson,
  MdTimer,
  MdInfoOutline,
  MdBusiness,
  MdLocationOn,
  MdAssignment,
  MdHistory,
  MdEdit
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa6';
import moment from 'moment';
import api from '../api/api';
import { getWeekNumber } from '../utils/helpers';
import EditTaskDialog from './task/EditTaskDialog';

// Reusable Detail Item
const DetailItem = ({ label, value, icon, fullWidth = false }) => (
  <Box sx={{
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5,
    p: 1.5,
    borderRadius: '8px',
    bgcolor: (theme) => alpha(theme.palette.background.default, 0.05),
    border: '1px solid',
    borderColor: (theme) => alpha(theme.palette.divider, 0.1),
    height: '100%',
    gridColumn: fullWidth ? '1 / -1' : 'auto'
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', mb: 0.5 }}>
      {icon && <Box sx={{ display: 'flex', color: 'primary.main', opacity: 0.8 }}>{icon}</Box>}
      <Typography variant="caption" fontWeight="600" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
    </Box>
    <Box>
      {Array.isArray(value) ? (
        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', wordBreak: 'break-word' }}>
          {value.length > 0 ? value.join(", ") : 'N/A'}
        </Typography>
      ) : (typeof value === 'string' || typeof value === 'number' ? (
        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', wordBreak: 'break-word' }}>
          {value || 'N/A'}
        </Typography>
      ) : (
        value
      ))}
    </Box>
  </Box>
);

// Section Header
const SectionHeader = ({ title, icon }) => (
  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
    <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: 'primary.main', color: 'white', display: 'flex' }}>
      {icon}
    </Box>
    <Typography variant="subtitle2" fontWeight="700" color="text.primary">
      {title}
    </Typography>
  </Stack>
);

// Expandable Note for Table Cells
const ExpandableNote = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = text && text.length > 80;

  if (!text) return '-';

  return (
    <Box sx={{ direction: 'rtl', textAlign: 'right' }}>
      <Typography variant="body2" sx={{
        color: '#aaa',
        whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: 250,
        fontSize: '0.75rem',
        lineHeight: 1.4
      }}>
        {text}
      </Typography>
      {shouldTruncate && (
        <Button
          size="small"
          onClick={() => setIsExpanded(!isExpanded)}
          sx={{
            p: 0,
            minWidth: 0,
            color: 'primary.main',
            fontSize: '0.7rem',
            mt: 0.2,
            textTransform: 'none',
            '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }
          }}
        >
          {isExpanded ? 'Read Less' : 'Read More'}
        </Button>
      )}
    </Box>
  );
};

export const TaskDetailsDialog = ({ open, onClose, tasks, title, teamName, onTaskUpdated }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [qopsLogs, setQopsLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [settings, setSettings] = useState(null);

  // Edit states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTaskToEdit, setSelectedTaskToEdit] = useState(null);

  // Fetch Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get("/settings");
        setSettings(response.data);
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, []);

  // Use title prop if provided, else fall back to teamName logic
  const displayTitle = title || `All Tasks for Team: ${teamName || 'Unknown'}`;

  // Fetch QOps logs when dialog opens and there is a single task (usual case for drill-down)
  useEffect(() => {
    if (open && tasks.length === 1 && tasks[0]._id) {
      fetchTickets(tasks[0]._id);
    } else {
      setQopsLogs([]);
    }
  }, [open, tasks]);

  const fetchTickets = async (taskId) => {
    setLoadingLogs(true);
    try {
      const { data } = await api.get(`/tasks/tickets/${taskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      // Sort: Event Date (asc) -> Created At (asc)
      const sorted = (data || []).sort((a, b) => {
        const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
        const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      setQopsLogs(sorted);
    } catch (error) {
      console.error('Error fetching QOps tickets:', error);
      setQopsLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleEditClick = (task) => {
    setSelectedTaskToEdit(task);
    setEditDialogOpen(true);
  };

  const handleTaskUpdateSuccess = (updatedTask) => {
    setEditDialogOpen(false);
    setSelectedTaskToEdit(null);
    if (onTaskUpdated) onTaskUpdated(updatedTask);
    // Refresh logs if it's a single task view
    if (tasks.length === 1) {
      fetchTickets(tasks[0]._id);
    }
  };

  const copyToClipboard = () => {
    let textToCopy = `${displayTitle}\n\n`;

    tasks.forEach((task, index) => {
      textToCopy += `=== Task ${index + 1} ===\n`;
      textToCopy += `Request Number: ${task.requestNumber}\n`;
      textToCopy += `Operation: ${task.operation || 'N/A'}\n`;
      textToCopy += `SLID: ${task.slid}\n`;
      textToCopy += `Customer Name: ${task.customerName}\n`;
      textToCopy += `Contact Number: ${task.contactNumber}\n`;
      textToCopy += `PIS Date: ${moment(task.pisDate).format("YYYY-MM-DD")}\n`;
      textToCopy += `Contract Date: ${moment(task.contractDate).format("YYYY-MM-DD")}\n`;
      textToCopy += `UN Date: ${task.unDate ? moment(task.unDate).format("YYYY-MM-DD") : 'N/A'}\n`;
      textToCopy += `FE Date: ${task.feDate ? moment(task.feDate).format("YYYY-MM-DD") : (task.appDate ? moment(task.appDate).format("YYYY-MM-DD") : 'N/A')}\n`;
      textToCopy += `In Date: ${moment(task.inDate).format("YYYY-MM-DD")}\n`;
      textToCopy += `Close Date: ${moment(task.closeDate).format("YYYY-MM-DD")}\n`;
      textToCopy += `Tariff Name: ${task.tarrifName}\n`;
      textToCopy += `Customer Type: ${task.customerType}\n`;
      textToCopy += `Interview Date: ${moment(task.interviewDate).format("YYYY-MM-DD")}\n`;
      textToCopy += `Governorate: ${task.governorate}\n`;
      textToCopy += `District: ${task.district}\n`;
      textToCopy += `Team Name: ${task.teamName}\n`;
      textToCopy += `Team Company: ${task.teamCompany}\n`;
      textToCopy += `Satisfaction Score: ${task.evaluationScore} (${task.evaluationScore >= 9 ? 'Promoter' :
        task.evaluationScore >= 7 ? 'Neutral' : 'Detractor'})\n`;
      textToCopy += `Feedback Severity: ${task.priority || 'Not specified'}\n`;
      textToCopy += `Customer Feedback: ${task.customerFeedback}\n`;
      textToCopy += `Reason: ${task.reason}\n`;
      textToCopy += `Sub Reason: ${task.subReason || 'N/A'}\n`;
      textToCopy += `Root Cause: ${task.rootCause || 'N/A'}\n`;
      textToCopy += `GAIA Check: ${task.gaiaCheck || 'N/A'}\n`;
      textToCopy += `Latest QOps Type: ${task.latestGaia?.transactionType || 'N/A'}\n`;
      textToCopy += `Latest QOps State: ${task.latestGaia?.transactionState || 'N/A'}\n`;
      textToCopy += `Latest QOps Reason: ${task.latestGaia?.unfReasonCode || 'N/A'}\n\n`;


      textToCopy += `Progress & Logs:\n`;
      // Combine logs if available, else subtasks
      const logsToExport = qopsLogs.length > 0 ? qopsLogs : (task.subTasks || []);

      if (qopsLogs.length > 0) {
        textToCopy += `--- Q-Ops Transaction Log ---\n`;
        qopsLogs.forEach((log, idx) => {
          textToCopy += `${idx + 1}. Date: ${log.eventDate ? moment(log.eventDate).format('DD/MM/YYYY') : '-'} | Type: ${log.transactionType || log.mainCategory || 'N/A'} | State: ${log.transactionState || 'N/A'} | Agent: ${log.agentName || 'N/A'} | Note: ${log.note || '-'}\n`;
        });
      } else {
        textToCopy += `--- Subtasks ---\n`;
        task.subTasks?.forEach((subtask, subIndex) => {
          textToCopy += `${subIndex + 1}. ${subtask.title || `Step ${subIndex + 1}`}\n`;
          textToCopy += `Action: ${subtask.note || 'No action taken yet'}\n`;
          if (subtask.completedBy) {
            textToCopy += `Completed by: ${subtask.completedBy.name}\n`;
          }
          if (subtask.dateTime) {
            textToCopy += `Completed on: ${subtask.dateTime}\n`;
          }
          textToCopy += '\n';
        });
      }

      textToCopy += '\n';
    });

    navigator.clipboard.writeText(textToCopy).then(() => {
      // In a real app we might want a snackbar, but keeping alert for now as per previous code
      alert('Task details copied to clipboard! You can now paste it anywhere.');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy text. Please try again.');
    });
  };

  const redirectToWhatsApp = () => {
    const textToCopy = `${displayTitle}\n\n`;
    let formattedMessage = textToCopy;

    tasks.forEach((task, index) => {
      formattedMessage += `=== Task ${index + 1} ===\n`;
      formattedMessage += `Request Number: ${task.requestNumber}\n`;
      formattedMessage += `SLID: ${task.slid}\n`;
      formattedMessage += `Customer: ${task.customerName}\n`;
      formattedMessage += `Contact: ${task.contactNumber}\n`;
      formattedMessage += `Score: ${task.evaluationScore}\n`;
      formattedMessage += `Status: ${task.status}\n\n`;
    });

    // Get phone from first task's populated teamId
    let phoneNumber = tasks[0]?.teamId?.contactNumber;

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

    navigator.clipboard.writeText(formattedMessage).catch(() => { });

    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(formattedMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const exportToExcel = () => {
    const data = tasks.map((task) => ({
      'Request Number': task.requestNumber,
      'Operation': task.operation || 'N/A',
      'SLID': task.slid,
      'PIS Date': new Date(task.pisDate).toLocaleString(),
      'Contract Date': task.contractDate ? new Date(task.contractDate).toLocaleDateString() : 'N/A',
      'FE Date': task.feDate ? new Date(task.feDate).toLocaleDateString() : (task.appDate ? new Date(task.appDate).toLocaleDateString() : 'N/A'),
      'UN Date': task.unDate ? new Date(task.unDate).toLocaleDateString() : 'N/A',
      'In Date': task.inDate ? new Date(task.inDate).toLocaleDateString() : 'N/A',
      'Close Date': task.closeDate ? new Date(task.closeDate).toLocaleDateString() : 'N/A',
      'Customer Name': task.customerName,
      'Customer Feedback': task.customerFeedback,
      'Satisfaction Score': task.evaluationScore,
      'Feedback Severity': task.priority || 'Not specified',
      'Contact Number': task.contactNumber,
      'Tariff Name': task.tarrifName,
      'Reason': task.reason,
      'Sub Reason': task.subReason || 'N/A',
      'Root Cause': task.rootCause || 'N/A',
      'ITN Related': task.itnRelated || 'N/A',
      'Related to Current Subscription': task.relatedToSubscription || 'N/A',
      'GAIA Check': task.gaiaCheck || 'N/A',
      'Latest QOps Type': task.latestGaia?.transactionType || 'N/A',
      'Latest QOps State': task.latestGaia?.transactionState || 'N/A',
      'Latest QOps Reason': task.latestGaia?.unfReasonCode || 'N/A',
      'Customer Type': task.customerType,
      'Governorate': task.governorate,
      'District': task.district,
      'Action taken by assigned user': task.subTasks?.map((sub, index) => `Step ${index + 1}: ${sub.note}`).join('\n') || '',
      'Team Name': task.teamName,
      'Team Company': task.teamCompany,
      'Interview Date': new Date(task.interviewDate).toLocaleString(),
      // Handle optional chaining safely
      'Dispatched': task.relatedIssues?.[0]?.dispatched === 'yes' ? 'Yes' : 'No',
      'Resolved Date': task.relatedIssues?.[0]?.resolveDate ? new Date(task.relatedIssues[0].resolveDate).toLocaleDateString() : 'N/A',
      'Closed Date': task.relatedIssues?.[0]?.closedAt ? new Date(task.relatedIssues[0].closedAt).toLocaleDateString() : 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0]).map((key) => ({ wch: key.length + 5 }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    // Sanitize sheet name if needed
    const sheetName = tasks[0]?.slid ? String(tasks[0].slid).substring(0, 30) : 'Tasks';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const fileName = title ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx` : `${tasks[0]?.slid || 'tasks'}_${teamName || 'export'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            backgroundImage: 'none'
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: '#252525',
          borderBottom: '1px solid #333',
          py: 2,
          px: 3
        }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.2),
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.palette.primary.main
            }}>
              <MdAssignment size={24} />
            </Box>
            <Box>
              <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight="bold" color="white">
                {displayTitle}
              </Typography>
              <Typography variant="caption" color="gray">
                Showing {tasks.length} tasks details
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Copy to Clipboard">
              <IconButton onClick={copyToClipboard} sx={{ mr: 1, color: 'gray', '&:hover': { color: 'white' } }}>
                <MdContentCopy />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export to Excel">
              <IconButton onClick={exportToExcel} sx={{ mr: 1, color: 'gray', '&:hover': { color: 'white' } }}>
                <MdFileDownload />
              </IconButton>
            </Tooltip>
            {tasks[0]?.teamId?.contactNumber && (
              <Tooltip title="Contact via WhatsApp">
                <IconButton onClick={redirectToWhatsApp} sx={{ mr: 1, color: '#25D366', '&:hover': { bgcolor: alpha('#25D366', 0.1) } }}>
                  <FaWhatsapp />
                </IconButton>
              </Tooltip>
            )}
            <IconButton onClick={onClose} sx={{ color: 'gray', '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}>
              <MdClose />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ bgcolor: '#121212', p: { xs: 2, md: 4 } }}>
          <Stack spacing={4}>
            {tasks.map((task, index) => (
              <Paper
                key={index}
                elevation={0}
                sx={{
                  p: 0,
                  bgcolor: '#1e1e1e',
                  borderRadius: '16px',
                  border: '1px solid #333',
                  overflow: 'hidden',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.5)}`
                  }
                }}
              >
                {/* Task Header Bar */}
                <Box sx={{
                  p: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  borderBottom: '1px solid #333',
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 2,
                  alignItems: 'center'
                }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Chip
                      label={`#${index + 1}`}
                      size="small"
                      sx={{
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        bgcolor: theme.palette.primary.main,
                        color: 'white'
                      }}
                    />
                    <Typography variant="subtitle1" fontWeight="bold" color="white">
                      Request #{task.requestNumber}
                    </Typography>
                    {task.interviewDate && (
                      <Chip
                        label={`Week ${getWeekNumber(task.interviewDate, settings?.weekStartDay, settings?.week1StartDate, settings?.week1EndDate, settings?.startWeekNumber).week}`}
                        size="small"
                        sx={{
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          bgcolor: alpha(theme.palette.secondary.main, 0.2),
                          color: theme.palette.secondary.main,
                          border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`
                        }}
                      />
                    )}
                    {task.slid && (
                      <Chip
                        label={task.slid}
                        variant="outlined"
                        size="small"
                        sx={{ borderColor: '#555', color: '#aaa', fontWeight: 500 }}
                      />
                    )}
                  </Stack>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2" sx={{ color: '#aaa', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MdTimer />
                      PIS: {task.pisDate ? moment(task.pisDate).format("MMM DD, YYYY") : 'N/A'}
                    </Typography>
                    <Button
                      startIcon={<MdEdit />}
                      size="small"
                      onClick={() => handleEditClick(task)}
                      sx={{
                        color: theme.palette.primary.main,
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) }
                      }}
                    >
                      Edit Task
                    </Button>
                  </Stack>
                </Box>

                <Box sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    {/* Column 1: Customer & Location */}
                    <Grid item xs={12} md={4}>
                      <SectionHeader title="Customer & Location" icon={<MdPerson size={16} />} />
                      <Stack spacing={2}>
                        <DetailItem label="Customer Name" value={task.customerName} />
                        <DetailItem label="Contact" value={task.contactNumber} />
                        <DetailItem label="Type" value={task.customerType} />
                        <DetailItem
                          label="Location"
                          icon={<MdLocationOn size={14} />}
                          value={`${task.governorate || ''}${task.governorate && task.district ? ', ' : ''}${task.district || ''}`}
                        />
                        <DetailItem label="Contract Date" value={task.contractDate ? moment(task.contractDate).format("MMM DD, YYYY") : 'N/A'} />
                        <DetailItem label="FE Date" value={task.feDate ? moment(task.feDate).format("MMM DD, YYYY") : (task.appDate ? moment(task.appDate).format("MMM DD, YYYY") : 'N/A')} />
                        <DetailItem label="UN Date" value={task.unDate ? moment(task.unDate).format("MMM DD, YYYY") : 'N/A'} />
                        <DetailItem label="In Date" value={task.inDate ? moment(task.inDate).format("MMM DD, YYYY") : 'N/A'} />
                        <DetailItem label="Close Date" value={task.closeDate ? moment(task.closeDate).format("MMM DD, YYYY") : 'N/A'} />
                      </Stack>
                    </Grid>

                    {/* Column 2: Issue Details */}
                    <Grid item xs={12} md={4}>
                      <SectionHeader title="Issue Details" icon={<MdInfoOutline size={16} />} />
                      <Stack spacing={2}>
                        <DetailItem
                          label="Satisfaction Score"
                          value={
                            <Chip
                              label={`${task.evaluationScore} (${task.evaluationScore >= 9 ? 'Promoter' :
                                task.evaluationScore >= 7 ? 'Neutral' : 'Detractor'})`}
                              size="small"
                              sx={{
                                fontWeight: 'bold',
                                color: 'white',
                                bgcolor: task.evaluationScore >= 9 ? '#10b981' :
                                  task.evaluationScore >= 7 ? '#64748b' : '#ef4444'
                              }}
                            />
                          }
                        />
                        <DetailItem label="Tariff" value={task.tarrifName} />
                        <DetailItem label="Reason" value={task.reason} />
                        <DetailItem label="Sub Reason" value={task.subReason} />
                        <DetailItem
                          label="Customer Feedback"
                          value={task.customerFeedback}
                        />
                      </Stack>
                    </Grid>

                    {/* Column 3: Outcome & Team */}
                    <Grid item xs={12} md={4}>
                      <SectionHeader title="Outcome & Team" icon={<MdBusiness size={16} />} />
                      <Stack spacing={2}>
                        <DetailItem label="Root Cause" value={task.rootCause} />
                        <DetailItem label="Owner" value={task.responsible || 'N/A'} icon={<MdPerson size={14} />} />
                        <DetailItem label="ITN Related" value={task.itnRelated} />
                        <DetailItem label="Related to Current Subscription" value={task.relatedToSubscription} />
                        <DetailItem
                          label="Validation"
                          value={
                            <Chip
                              label={task.validationStatus || 'Not Validated'}
                              size="small"
                              sx={{
                                bgcolor: task.validationStatus === 'Validated' ? alpha('#10b981', 0.2) : alpha('#ef4444', 0.2),
                                color: task.validationStatus === 'Validated' ? '#10b981' : '#ef4444',
                                fontWeight: 'bold'
                              }}
                            />
                          }
                        />
                        <DetailItem label="Team" value={task.teamName} />
                        <DetailItem label="Company" value={task.teamCompany} />
                      </Stack>
                    </Grid>

                    {/* Column 4: Q-Ops & GAIA (New Section) */}
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <SectionHeader title="Q-Ops Transaction Logs" icon={<MdHistory size={16} />} />
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                          <Stack spacing={2}>
                            <DetailItem label="GAIA Check" value={task.gaiaCheck || "N/A"}
                              valueStyle={task.gaiaCheck === 'Yes' ? { color: 'green', fontWeight: 'bold' }
                                : {}}
                            />
                            {task.latestGaia && (
                              <>
                                <DetailItem label="Latest QOps Type" value={task.latestGaia.transactionType || "N/A"} />
                                <DetailItem label="Latest QOps State" value={task.latestGaia.transactionState || "N/A"} />
                                <DetailItem label="Latest QOps Reason" value={task.latestGaia.unfReasonCode || "N/A"} />
                              </>
                            )}
                          </Stack>
                        </Grid>
                        <Grid item xs={12} md={8}>
                          <Box sx={{ border: '1px solid #333', borderRadius: 2, overflow: 'hidden' }}>
                            <TableContainer sx={{ maxHeight: 300 }}>
                              <Table size="small" stickyHeader>
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ bgcolor: '#2c2c2c', color: '#aaa', fontWeight: 'bold' }}>Execution Date</TableCell>
                                    <TableCell sx={{ bgcolor: '#2c2c2c', color: '#aaa', fontWeight: 'bold' }}>Type / State</TableCell>
                                    <TableCell sx={{ bgcolor: '#2c2c2c', color: '#aaa', fontWeight: 'bold' }}>Agent</TableCell>
                                    <TableCell sx={{ bgcolor: '#2c2c2c', color: '#aaa', fontWeight: 'bold' }}>Note</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {loadingLogs ? (
                                    <TableRow>
                                      <TableCell colSpan={4} align="center" sx={{ color: '#aaa', py: 3 }}>
                                        <CircularProgress size={20} sx={{ mr: 1 }} /> Loading logs...
                                      </TableCell>
                                    </TableRow>
                                  ) : qopsLogs.length > 0 ? (
                                    qopsLogs.map((log, i) => (
                                      <TableRow key={i} sx={{ '&:hover': { bgcolor: '#2a2a2a' } }}>
                                        <TableCell sx={{ color: '#fff' }}>{log.eventDate ? moment(log.eventDate).format('DD/MM/YYYY') : '-'}</TableCell>
                                        <TableCell sx={{ color: '#fff' }}>
                                          <Typography variant="body2" fontSize="0.75rem">{log.transactionType || log.mainCategory}</Typography>
                                          <Typography variant="caption" color="gray">{log.transactionState}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ color: '#fff' }}>{log.agentName || '-'}</TableCell>
                                        <TableCell sx={{ color: '#aaa', maxWidth: 250 }}>
                                          <ExpandableNote text={log.note} />
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow>
                                      <TableCell colSpan={4} align="center" sx={{ color: '#aaa', py: 3 }}>
                                        No Q-Ops logs found.
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Box>
                        </Grid>
                      </Grid>
                    </Grid>

                    {/* Original Subtasks Section - Keeping just in case, but QOps is priority */}
                    {/* {task.subTasks && task.subTasks.length > 0 && ...} */}

                  </Grid>
                </Box>
              </Paper>
            ))}
          </Stack>
        </DialogContent>

        <DialogActions sx={{
          bgcolor: '#252525',
          borderTop: '1px solid #333',
          p: 2,
          justifyContent: 'space-between'
        }}>
          <Button onClick={onClose} sx={{ color: 'gray' }}>
            Close Preview
          </Button>
          <Button
            onClick={exportToExcel}
            variant="contained"
            startIcon={<MdFileDownload />}
            sx={{
              bgcolor: theme.palette.primary.main,
              '&:hover': { bgcolor: theme.palette.primary.dark }
            }}
          >
            Export Details to Excel
          </Button>
        </DialogActions>
      </Dialog >

      {selectedTaskToEdit && (
        <EditTaskDialog
          open={editDialogOpen}
          setOpen={setEditDialogOpen}
          task={selectedTaskToEdit}
          handleTaskUpdate={handleTaskUpdateSuccess}
        />
      )}
    </>
  );
};