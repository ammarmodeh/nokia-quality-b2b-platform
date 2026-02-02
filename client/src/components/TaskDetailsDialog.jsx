import React from 'react';
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
  MdAssignment
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa6';
import moment from 'moment';

// Reusable Detail Item
const DetailItem = ({ label, value, icon }) => (
  <Box sx={{
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5,
    p: 1.5,
    borderRadius: '8px',
    bgcolor: (theme) => alpha(theme.palette.background.default, 0.05),
    border: '1px solid',
    borderColor: (theme) => alpha(theme.palette.divider, 0.1),
    height: '100%'
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

export const TaskDetailsDialog = ({ open, onClose, tasks, title, teamName }) => {
  const theme = useTheme();
  // Use sm breakpoint for mobile check to match passed props usage or standard hook
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Use title prop if provided, else fall back to teamName logic
  const displayTitle = title || `All Tasks for Team: ${teamName || 'Unknown'}`;

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
      textToCopy += `Root Cause: ${task.rootCause || 'N/A'}\n\n`;

      textToCopy += `Progress:\n`;
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
      'Customer Name': task.customerName,
      'Customer Feedback': task.customerFeedback,
      'Satisfaction Score': task.evaluationScore,
      'Feedback Severity': task.priority || 'Not specified',
      'Contact Number': task.contactNumber,
      'Tariff Name': task.tarrifName,
      'Reason': task.reason,
      'Sub Reason': task.subReason || 'N/A',
      'Root Cause': task.rootCause || 'N/A',
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
                  {task.slid && (
                    <Chip
                      label={task.slid}
                      variant="outlined"
                      size="small"
                      sx={{ borderColor: '#555', color: '#aaa', fontWeight: 500 }}
                    />
                  )}
                </Stack>
                <Typography variant="body2" sx={{ color: '#aaa', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MdTimer />
                  PIS: {task.pisDate ? moment(task.pisDate).format("MMM DD, YYYY") : 'N/A'}
                </Typography>
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
                    </Stack>
                  </Grid>

                  {/* Column 2: Issue Details */}
                  <Grid item xs={12} md={4}>
                    <SectionHeader title="Issue Details" icon={<MdInfoOutline size={16} />} />
                    <Stack spacing={2}>
                      <DetailItem label="Tariff" value={task.tarrifName} />
                      <DetailItem label="Reason" value={task.reason} />
                      <DetailItem label="Sub Reason" value={task.subReason} />
                      <DetailItem label="Root Cause" value={task.rootCause} />
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
                      <DetailItem label="Owner" value={task.responsible || 'N/A'} icon={<MdPerson size={14} />} />
                      <DetailItem label="Team" value={task.teamName} />
                      <DetailItem label="Company" value={task.teamCompany} />
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
                    </Stack>
                  </Grid>

                  {/* Subtasks / Activity */}
                  {task.subTasks && task.subTasks.length > 0 && (
                    <Grid item xs={12}>
                      <Box sx={{ mt: 2, p: 2, bgcolor: '#252525', borderRadius: '12px', border: '1px solid #333' }}>
                        <Typography variant="caption" fontWeight="bold" color="gray" sx={{ mb: 2, display: 'block', textTransform: 'uppercase' }}>
                          ACTION STEPS TAKEN
                        </Typography>
                        <Stack spacing={1}>
                          {task.subTasks.map((sub, idx) => (
                            <Box key={idx} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                              <Chip label={idx + 1} size="small" sx={{ minWidth: 24, height: 24, fontSize: '0.7rem' }} />
                              <Box>
                                <Typography variant="body2" color="white" fontWeight="500">
                                  {sub.title || `Step ${idx + 1}`}
                                </Typography>
                                {sub.note && (
                                  <Typography variant="body2" color="gray">
                                    {sub.note}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    </Grid>
                  )}
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
    </Dialog>
  );
};