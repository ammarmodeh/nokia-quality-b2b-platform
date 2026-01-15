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
  LinearProgress,
  alpha,
} from '@mui/material';
import * as XLSX from 'xlsx';
import { MdClose, MdContentCopy, MdFileDownload } from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa6';
import { useTheme, useMediaQuery } from '@mui/material';
import moment from 'moment';

export const TaskDetailsDialog = ({ open, onClose, tasks, teamName }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const copyToClipboard = () => {
    let textToCopy = `All Tasks for Team: ${teamName}\n\n`;

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
      alert('Task details copied to clipboard! You can now paste it anywhere.');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy text. Please try again.');
    });
  };

  const redirectToWhatsApp = () => {
    const textToCopy = `All Tasks for Team: ${teamName}\n\n`;
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
      'Dispatched': task.relatedIssues?.[0]?.dispatched === 'yes' ? 'Yes' : 'No',
      'Resolved Date': task.relatedIssues?.[0]?.resolveDate ? new Date(task.relatedIssues[0].resolveDate).toLocaleDateString() : 'N/A',
      'Closed Date': task.relatedIssues?.[0]?.closedAt ? new Date(task.relatedIssues[0].closedAt).toLocaleDateString() : 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0]).map((key) => ({ wch: key.length + 5 }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${tasks[0].slid}`);
    XLSX.writeFile(workbook, `${tasks[0].slid}_${teamName}.xlsx`);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      // fullWidth
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: '#2d2d2d',
          boxShadow: 'none',
          borderRadius: isMobile ? 0 : '8px',
        }
      }}
    >
      <DialogTitle sx={{
        backgroundColor: '#2d2d2d',
        color: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: isMobile ? '12px 16px' : '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant={isMobile ? "subtitle1" : "h6"} component="div" sx={{ fontWeight: 500 }}>
            All Tasks for Team: {teamName} ({tasks.length})
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Copy to Clipboard">
            <IconButton
              onClick={copyToClipboard}
              size={isMobile ? "small" : "medium"}
              sx={{
                mr: 1,
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#2a2a2a',
                }
              }}
            >
              <MdContentCopy fontSize={isMobile ? "18px" : "24px"} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export to Excel">
            <IconButton
              onClick={exportToExcel}
              size={isMobile ? "small" : "medium"}
              sx={{
                mr: 1,
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#2a2a2a',
                }
              }}
            >
              <MdFileDownload fontSize={isMobile ? "18px" : "24px"} />
            </IconButton>
          </Tooltip>
          {tasks[0]?.teamId?.contactNumber && (
            <Tooltip title="Contact via WhatsApp">
              <IconButton
                onClick={redirectToWhatsApp}
                size={isMobile ? "small" : "medium"}
                sx={{
                  mr: 1,
                  color: '#25D366',
                  '&:hover': {
                    backgroundColor: '#2a2a2a',
                  }
                }}
              >
                <FaWhatsapp fontSize={isMobile ? "18px" : "24px"} />
              </IconButton>
            </Tooltip>
          )}
          <IconButton
            onClick={onClose}
            size={isMobile ? "small" : "medium"}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#2a2a2a',
              }
            }}
          >
            <MdClose fontSize={isMobile ? "18px" : "24px"} />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider sx={{ backgroundColor: '#e5e7eb' }} />

      <DialogContent dividers sx={{
        backgroundColor: '#2d2d2d',
        color: '#ffffff',
        padding: isMobile ? '12px 16px' : '20px 24px',
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#e5e7eb',
          borderRadius: '2px',
        },
      }}>
        <Stack spacing={isMobile ? 3 : 4}>
          {tasks.map((task, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#353535',
                borderRadius: 2,
                border: '1px solid #454545',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.14)',
                overflow: 'hidden',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  borderColor: '#7b68ee',
                }
              }}
            >
              {/* Task Header */}
              <Box sx={{
                p: 2,
                backgroundColor: alpha('#7b68ee', 0.1),
                borderBottom: '1px solid #454545',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#7b68ee' }}>
                  TASK #{index + 1} - {task.requestNumber}
                </Typography>
                <Chip
                  label={task.evaluationScore >= 9 ? 'Promoter' : task.evaluationScore >= 7 ? 'Neutral' : 'Detractor'}
                  size="small"
                  sx={{
                    color: '#ffffff',
                    backgroundColor:
                      task.evaluationScore >= 9 ? '#4caf50' :
                        task.evaluationScore >= 7 ? '#6b7280' : '#f44336',
                    fontWeight: 'bold',
                    fontSize: '0.65rem'
                  }}
                />
              </Box>

              <Box sx={{ p: isMobile ? 1.5 : 3, display: 'flex', flexDirection: 'column', gap: isMobile ? 2 : 3 }}>
                {/* Basic Information Section */}
                <Paper elevation={0} sx={{
                  p: isMobile ? 1.5 : 2,
                  backgroundColor: '#2d2d2d',
                  borderRadius: 2,
                  border: '1px solid #3d3d3d'
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                    Basic Info
                  </Typography>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: isMobile ? 1.5 : 2
                  }}>
                    <DetailRow label="Request Number" value={task.requestNumber} isMobile={isMobile} />
                    <DetailRow label="Operation" value={task.operation} isMobile={isMobile} />
                    <DetailRow label="SLID" value={task.slid} isMobile={isMobile} />
                    <DetailRow label="Category" value={task.category} isMobile={isMobile} />
                    <DetailRow label="Customer Name" value={task.customerName} isMobile={isMobile} />
                    <DetailRow label="Contact Number" value={task.contactNumber} isMobile={isMobile} />
                    <DetailRow label="PIS Date" value={moment(task.pisDate).format("YYYY-MM-DD")} isMobile={isMobile} />
                    <DetailRow label="Tariff Name" value={task.tarrifName} isMobile={isMobile} />
                    <DetailRow label="Customer Type" value={task.customerType} isMobile={isMobile} />
                    <DetailRow label="Interview Date" value={moment(task.interviewDate).format("YYYY-MM-DD")} isMobile={isMobile} />
                  </Box>
                </Paper>

                <Paper elevation={0} sx={{
                  p: isMobile ? 1.5 : 2,
                  backgroundColor: '#2d2d2d',
                  borderRadius: 2,
                  border: '1px solid #3d3d3d'
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                    Technical Details
                  </Typography>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: isMobile ? 1.5 : 2
                  }}>
                    <DetailRow label="ONT Type" value={task.ontType} isMobile={isMobile} />
                    <DetailRow label="Speed Plan" value={task.speed ? `${task.speed} Mbps` : 'N/A'} isMobile={isMobile} />
                    <DetailRow label="Free Extender" value={task.freeExtender} isMobile={isMobile} />
                    {task.freeExtender === 'Yes' && (
                      <>
                        <DetailRow label="Extender Type" value={task.extenderType} isMobile={isMobile} />
                        <DetailRow label="Number of Extenders" value={task.extenderNumber} isMobile={isMobile} />
                      </>
                    )}
                  </Box>
                </Paper>

                <Paper elevation={0} sx={{
                  p: isMobile ? 1.5 : 2,
                  backgroundColor: '#2d2d2d',
                  borderRadius: 2,
                  border: '1px solid #3d3d3d'
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                    Service Quality
                  </Typography>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: isMobile ? 1.5 : 2
                  }}>
                    <DetailRow label="Service Recipient (Initial)" value={task.serviceRecipientInitial} isMobile={isMobile} />
                    <DetailRow label="Service Recipient (QoS)" value={task.serviceRecipientQoS} isMobile={isMobile} />
                    <DetailRow label="Closure Call Evaluation" value={task.closureCallEvaluation} isMobile={isMobile} />
                    <DetailRow label="Closure Call Feedback" value={task.closureCallFeedback} isMobile={isMobile} />
                  </Box>
                </Paper>

                {/* Location Information Section */}
                <Paper elevation={0} sx={{
                  p: isMobile ? 1.5 : 2,
                  backgroundColor: '#2d2d2d',
                  borderRadius: 2,
                  border: '1px solid #3d3d3d'
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                    Location
                  </Typography>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: isMobile ? 1.5 : 2
                  }}>
                    <DetailRow label="Governorate" value={task.governorate} isMobile={isMobile} />
                    <DetailRow label="District" value={task.district} isMobile={isMobile} />
                  </Box>
                </Paper>

                {/* Team Information Section */}
                <Paper elevation={0} sx={{
                  p: isMobile ? 1.5 : 2,
                  backgroundColor: '#2d2d2d',
                  borderRadius: 2,
                  border: '1px solid #3d3d3d'
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                    Team Info
                  </Typography>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: isMobile ? 1.5 : 2
                  }}>
                    <DetailRow label="Team Name" value={task.teamName} isMobile={isMobile} />
                    <DetailRow label="Team Company" value={task.teamCompany} isMobile={isMobile} />
                    <DetailRow label="Responsible (Owner)" value={task.responsible} isMobile={isMobile} />
                  </Box>
                </Paper>

                {/* Linked Customer Issue Stats (If Available) */}
                {task.relatedIssues && task.relatedIssues.length > 0 && (
                  <Paper elevation={0} sx={{
                    p: isMobile ? 1.5 : 2,
                    backgroundColor: alpha('#7b68ee', 0.05),
                    borderRadius: 2,
                    border: `1px solid ${alpha('#7b68ee', 0.2)}`
                  }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                      Linked Customer Issue
                    </Typography>
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                      gap: isMobile ? 1.5 : 2
                    }}>
                      <DetailRow label="Dispatched?" value={task.relatedIssues[0].dispatched === 'yes' ? 'Yes' : 'No'} isMobile={isMobile} />
                      <DetailRow
                        label="Resolved on"
                        value={task.relatedIssues[0].resolveDate ? moment(task.relatedIssues[0].resolveDate).format("MMM DD, YYYY") : 'Not Resolved'}
                        isMobile={isMobile}
                      />
                      <DetailRow
                        label="Closed on"
                        value={task.relatedIssues[0].closedAt ? moment(task.relatedIssues[0].closedAt).format("MMM DD, YYYY") : 'Not Closed'}
                        isMobile={isMobile}
                      />
                      <DetailRow
                        label="Report Source"
                        value={`${task.relatedIssues[0].fromMain} (${task.relatedIssues[0].reporter})`}
                        isMobile={isMobile}
                      />
                    </Box>
                  </Paper>
                )}

                {/* Evaluation Section */}
                <Paper elevation={0} sx={{
                  p: isMobile ? 1.5 : 2,
                  backgroundColor: '#2d2d2d',
                  borderRadius: 2,
                  border: '1px solid #3d3d3d'
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                    Evaluation
                  </Typography>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: isMobile ? 1.5 : 2
                  }}>
                    <DetailRow
                      label="Satisfaction Score"
                      value={
                        <Box component="span">
                          <Chip
                            label={`${task.evaluationScore} (${task.evaluationScore >= 9 ? 'Promoter' :
                              task.evaluationScore >= 7 ? 'Neutral' : 'Detractor'
                              })`}
                            size={isMobile ? "small" : "medium"}
                            sx={{
                              color: '#ffffff',
                              backgroundColor:
                                task.evaluationScore >= 9 ? '#4caf50' :
                                  task.evaluationScore >= 7 ? '#6b7280' : '#f44336',
                              fontWeight: 'bold'
                            }}
                          />
                        </Box>
                      }
                      isMobile={isMobile}
                    />
                    <DetailRow label="Customer Feedback" value={task.customerFeedback} isMobile={isMobile} />
                    <DetailRow label="Reason" value={task.reason} isMobile={isMobile} />
                    <DetailRow label="Sub Reason" value={task.subReason} isMobile={isMobile} />
                    <DetailRow label="Root Cause" value={task.rootCause} isMobile={isMobile} />
                    <DetailRow
                      label="Feedback Severity"
                      value={
                        <Chip
                          label={task.priority || 'Not specified'}
                          size={isMobile ? "small" : "medium"}
                          sx={{
                            color: '#ffffff',
                            backgroundColor:
                              task.priority === 'High' ? '#f44336' :
                                task.priority === 'Medium' ? '#ff9800' : '#4caf50',
                            fontWeight: 'bold'
                          }}
                        />
                      }
                      isMobile={isMobile}
                    />
                    <DetailRow
                      label="Validation Status"
                      value={
                        <Chip
                          label={task.validationStatus || 'Not specified'}
                          size={isMobile ? "small" : "medium"}
                          sx={{
                            color: '#ffffff',
                            backgroundColor:
                              task.validationStatus === 'Validated' ? '#4caf50' :
                                task.validationStatus === 'Not validated' ? '#ff9800' : '#6b7280',
                            fontWeight: 'bold'
                          }}
                        />
                      }
                      isMobile={isMobile}
                    />
                  </Box>
                </Paper>

                {/* Metadata Section */}
                <Paper elevation={0} sx={{
                  p: isMobile ? 1.5 : 2,
                  backgroundColor: '#2d2d2d',
                  borderRadius: 2,
                  border: '1px solid #3d3d3d'
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                    Metadata
                  </Typography>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: isMobile ? 1.5 : 2
                  }}>
                    <DetailRow
                      label="Created By"
                      value={
                        task.createdBy ? (
                          <Chip
                            label={task.createdBy.name}
                            size="small"
                            sx={{ backgroundColor: '#3a4044', color: 'white' }}
                            avatar={<Avatar sx={{ bgcolor: '#7b68ee' }}>{task.createdBy.name?.charAt(0)}</Avatar>}
                          />
                        ) : 'N/A'
                      }
                      isMobile={isMobile}
                    />
                    <DetailRow
                      label="Created At"
                      value={moment(task.createdAt).format("YYYY-MM-DD HH:mm")}
                      isMobile={isMobile}
                    />
                    <DetailRow
                      label="Whom It May Concern"
                      value={
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {task.whomItMayConcern?.length > 0 ? (
                            task.whomItMayConcern.map((user, i) => (
                              <Chip
                                key={i}
                                label={user.name}
                                size="small"
                                sx={{ backgroundColor: '#2d2d2d', border: '1px solid #3d3d3d', color: '#ffffff' }}
                              />
                            ))
                          ) : 'None'}
                        </Box>
                      }
                      isMobile={isMobile}
                    />
                  </Box>
                </Paper>

                {/* Progress Section */}
                {task.subTasks?.[0]?.note && (
                  <Paper elevation={0} sx={{
                    p: isMobile ? 1.5 : 2,
                    backgroundColor: '#2d2d2d',
                    borderRadius: 2,
                    border: '1px solid #3d3d3d'
                  }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#7b68ee', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                      Progress
                    </Typography>

                    {/* Progress Bar with Assigned Team Members */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant={isMobile ? "caption" : "body2"} sx={{ color: '#eff5ff' }}>
                          Status: {Math.round((100 / task.subTasks.length) * task.subTasks.filter(t => t.note).length)}%
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {task.assignedTo?.map((user, index) => (
                            <Tooltip key={index} title={user.name}>
                              <Avatar sx={{
                                width: isMobile ? 24 : 28,
                                height: isMobile ? 24 : 28,
                                fontSize: isMobile ? '0.7rem' : '0.8rem',
                                backgroundColor: '#3a4044',
                                border: '2px solid',
                                borderColor: task.subTasks.some(t => t.completedBy?._id === user._id) ? '#4caf50' : '#f44336'
                              }}>
                                {user?.name
                                  ?.split(' ')
                                  .map((part, i) => i < 2 ? part.charAt(0) : '')
                                  .join('') || '?'}
                              </Avatar>
                            </Tooltip>
                          ))}
                        </Box>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.round((100 / task.subTasks.length) * task.subTasks.filter(t => t.note).length)}
                        sx={{
                          height: isMobile ? 8 : 10,
                          borderRadius: 5,
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 5,
                            backgroundColor: '#7b68ee'
                          }
                        }}
                      />
                    </Box>

                    {/* Detailed Action Items */}
                    <Paper sx={{
                      p: isMobile ? 1 : 2,
                      backgroundColor: '#2d2d2d',
                      border: '1px solid #3d3d3d',
                      borderRadius: '8px'
                    }}>
                      {task.subTasks.map((subtask, index) => (
                        <Box
                          key={index}
                          sx={{
                            mb: index < task.subTasks.length - 1 ? 2 : 0,
                            pb: index < task.subTasks.length - 1 ? 2 : 0,
                            borderBottom: index < task.subTasks.length - 1 ? '1px solid #3d3d3d' : 'none'
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant={isMobile ? "body2" : "subtitle1"} sx={{ color: '#eff5ff', fontWeight: 600 }}>
                              {index + 1}. {subtask.title || `Step ${index + 1}`}
                            </Typography>
                            {subtask.completedBy && (
                              <Chip
                                size="small"
                                sx={{
                                  backgroundColor: '#3a4044',
                                  color: 'white',
                                  fontSize: '0.7rem',
                                  '& .MuiChip-avatar': {
                                    width: 20,
                                    height: 20,
                                  }
                                }}
                                avatar={
                                  <Avatar sx={{
                                    backgroundColor: task.assignedTo?.some(u => u._id === subtask.completedBy._id)
                                      ? '#7b68ee'
                                      : '#f44336',
                                    fontSize: '0.65rem'
                                  }}>
                                    {subtask.completedBy?.name
                                      ?.split(' ')
                                      .map((part, i) => i < 2 ? part.charAt(0) : '')
                                      .join('') || '?'}
                                  </Avatar>
                                }
                                label={subtask.completedBy.name}
                              />
                            )}
                          </Stack>

                          <Box sx={{
                            backgroundColor: '#252525',
                            p: isMobile ? 1 : 1.5,
                            borderRadius: 1,
                            borderLeft: '3px solid',
                            borderColor: subtask.note ? '#7b68ee' : 'transparent'
                          }}>
                            <Typography variant={isMobile ? "caption" : "body2"} sx={{
                              direction: 'rtl',
                              textAlign: 'right',
                              color: '#eff5ff',
                              fontStyle: subtask.note ? 'normal' : 'italic'
                            }}>
                              {subtask.note || 'No action taken yet'}
                            </Typography>
                          </Box>

                          {subtask.dateTime && (
                            <Typography variant="caption" sx={{
                              color: '#888',
                              display: 'block',
                              mt: 0.5,
                              textAlign: 'right',
                              fontSize: '0.65rem'
                            }}>
                              {subtask.dateTime}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Paper>
                  </Paper>
                )}
              </Box>
            </Box>
          ))}
        </Stack>

      </DialogContent>

      <Divider sx={{ backgroundColor: '#e5e7eb' }} />

      <DialogActions sx={{
        backgroundColor: '#2d2d2d',
        borderTop: '1px solid #e5e7eb',
        padding: isMobile ? '8px 16px' : '12px 24px',
      }}>
        <Button
          onClick={onClose}
          size={isMobile ? "small" : "medium"}
          sx={{
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#2a2a2a',
            },
            ml: 1
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Reusable DetailRow component with isMobile prop
const DetailRow = ({ label, value, isMobile }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
    <Typography
      variant={isMobile ? "caption" : "body2"}
      component="div"
      sx={{
        fontWeight: '500',
        color: '#b3b3b3',
      }}
    >
      {label}
    </Typography>
    {typeof value === 'string' || typeof value === 'number' ? (
      <Typography
        variant={isMobile ? "body2" : "body1"}
        component="div"
        sx={{
          color: '#ffffff',
          wordBreak: 'break-word',
          textAlign: label === "Customer Feedback" ? "right" : "left",
          direction: label === "Customer Feedback" ? "rtl" : "ltr"
        }}
      >
        {value || 'N/A'}
      </Typography>
    ) : (
      <Box sx={{ display: 'inline-block', mt: 0.5 }}>
        {value}
      </Box>
    )}
  </Box>
);