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
} from '@mui/material';
import * as XLSX from 'xlsx';
import { MdClose, MdContentCopy, MdFileDownload } from 'react-icons/md';
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
      textToCopy += `Evaluation Score: ${task.evaluationScore} (${task.evaluationScore >= 9 ? 'Promoter' :
        task.evaluationScore >= 7 ? 'Neutral' : 'Detractor'})\n`;
      textToCopy += `Customer Feedback: ${task.customerFeedback}\n`;
      textToCopy += `Reason: ${task.reason}\n\n`;

      textToCopy += `Progress:\n`;
      task.subTasks.forEach((subtask, subIndex) => {
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

  const exportToExcel = () => {
    const data = tasks.map((task) => ({
      'Request Number': task.requestNumber,
      'SLID': task.slid,
      'PIS Date': new Date(task.pisDate).toLocaleString(),
      'Evaluation Score': task.evaluationScore,
      'Customer Name': task.customerName,
      'Contact Number': task.contactNumber,
      'Tariff Name': task.tarrifName,
      'Customer Feedback': task.customerFeedback,
      'Reason': task.reason,
      'Customer Type': task.customerType,
      'Governorate': task.governorate,
      'District': task.district,
      'Action taken by assigned user': task.subTasks.map((sub, index) => `Step ${index + 1}: ${sub.note}`).join('\n'),
      'Team Name': task.teamName,
      'Team Company': task.teamCompany,
      'Interview Date': new Date(task.interviewDate).toLocaleString(),
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
      fullScreen={isMobile}
      fullWidth
      maxWidth="md"
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: '#1e1e1e',
          boxShadow: 'none',
          borderRadius: isMobile ? 0 : '8px',
        }
      }}
    >
      <DialogTitle sx={{
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        borderBottom: '1px solid #444',
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

      <Divider sx={{ backgroundColor: '#444' }} />

      <DialogContent dividers sx={{
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        padding: isMobile ? '12px 16px' : '20px 24px',
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#444',
          borderRadius: '2px',
        },
      }}>
        <Stack spacing={isMobile ? 2 : 3}>
          {tasks.map((task, index) => (
            <Box key={index} sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 2 : 3, backgroundColor: '#353535', padding: isMobile ? 1 : 2, border: '1px solid #444', borderRadius: 2 }}>
              {/* Basic Information Section */}
              <Paper elevation={0} sx={{
                p: isMobile ? 1.5 : 2,
                backgroundColor: '#272727',
                borderRadius: 2,
                border: '1px solid #444'
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#3ea6ff' }}>
                  Basic Info
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: isMobile ? 1.5 : 2
                }}>
                  <DetailRow label="Request Number" value={task.requestNumber} isMobile={isMobile} />
                  <DetailRow label="SLID" value={task.slid} isMobile={isMobile} />
                  <DetailRow label="Customer Name" value={task.customerName} isMobile={isMobile} />
                  <DetailRow label="Contact Number" value={task.contactNumber} isMobile={isMobile} />
                  <DetailRow label="PIS Date" value={moment(task.pisDate).format("YYYY-MM-DD")} isMobile={isMobile} />
                  <DetailRow label="Tariff Name" value={task.tarrifName} isMobile={isMobile} />
                  <DetailRow label="Customer Type" value={task.customerType} isMobile={isMobile} />
                  <DetailRow label="Interview Date" value={moment(task.interviewDate).format("YYYY-MM-DD")} isMobile={isMobile} />
                </Box>
              </Paper>

              {/* Location Information Section */}
              <Paper elevation={0} sx={{
                p: isMobile ? 1.5 : 2,
                backgroundColor: '#272727',
                borderRadius: 2,
                border: '1px solid #444'
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#3ea6ff' }}>
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
                backgroundColor: '#272727',
                borderRadius: 2,
                border: '1px solid #444'
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#3ea6ff' }}>
                  Team Info
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: isMobile ? 1.5 : 2
                }}>
                  <DetailRow label="Team Name" value={task.teamName} isMobile={isMobile} />
                  <DetailRow label="Team Company" value={task.teamCompany} isMobile={isMobile} />
                </Box>
              </Paper>

              {/* Evaluation Section */}
              <Paper elevation={0} sx={{
                p: isMobile ? 1.5 : 2,
                backgroundColor: '#272727',
                borderRadius: 2,
                border: '1px solid #444'
              }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#3ea6ff' }}>
                  Evaluation
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: isMobile ? 1.5 : 2
                }}>
                  <DetailRow
                    label="Evaluation Score"
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
                                task.evaluationScore >= 7 ? '#9e9e9e' : '#f44336',
                            fontWeight: 'bold'
                          }}
                        />
                      </Box>
                    }
                    isMobile={isMobile}
                  />
                  <DetailRow label="Customer Feedback" value={task.customerFeedback} isMobile={isMobile} />
                  <DetailRow label="Reason" value={task.reason} isMobile={isMobile} />
                </Box>
              </Paper>

              {/* Progress Section */}
              {task.subTasks[0].note && (
                <Paper elevation={0} sx={{
                  p: isMobile ? 1.5 : 2,
                  backgroundColor: '#272727',
                  borderRadius: 2,
                  border: '1px solid #444'
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#3ea6ff' }}>
                    Progress
                  </Typography>

                  {/* Progress Bar with Assigned Team Members */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant={isMobile ? "caption" : "body2"} sx={{ color: '#eff5ff' }}>
                        Progress: {Math.round((100 / task.subTasks.length) * task.subTasks.filter(t => t.note).length)}%
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
                              {user.name
                                .split(' ')
                                .map((part, i) => i < 2 ? part.charAt(0) : '')
                                .join('')}
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
                          backgroundColor: '#3ea6ff'
                        }
                      }}
                    />
                  </Box>

                  {/* Detailed Action Items */}
                  <Paper sx={{
                    p: isMobile ? 1 : 2,
                    backgroundColor: '#333',
                    border: '1px solid #444',
                    borderRadius: '8px'
                  }}>
                    {task.subTasks.map((subtask, index) => (
                      <Box
                        key={index}
                        sx={{
                          mb: index < task.subTasks.length - 1 ? 2 : 0,
                          pb: index < task.subTasks.length - 1 ? 2 : 0,
                          borderBottom: index < task.subTasks.length - 1 ? '1px solid #444' : 'none'
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant={isMobile ? "body2" : "h6"} sx={{ color: '#eff5ff', fontWeight: 500 }}>
                            {index + 1}. ${subtask.title || `Step ${index + 1}`}
                          </Typography>
                          {subtask.completedBy && (
                            <Chip
                              size={isMobile ? "small" : "medium"}
                              sx={{
                                backgroundColor: '#3a4044',
                                color: 'white',
                                '& .MuiChip-avatar': {
                                  width: isMobile ? 20 : 24,
                                  height: isMobile ? 20 : 24,
                                  fontSize: isMobile ? '0.65rem' : '0.75rem'
                                }
                              }}
                              avatar={
                                <Avatar sx={{
                                  backgroundColor: task.assignedTo.some(u => u._id === subtask.completedBy._id)
                                    ? '#3ea6ff'
                                    : '#f44336',
                                  width: isMobile ? 20 : 24,
                                  height: isMobile ? 20 : 24,
                                  fontSize: isMobile ? '0.65rem' : '0.75rem'
                                }}>
                                  {subtask.completedBy.name
                                    .split(' ')
                                    .map((part, i) => i < 2 ? part.charAt(0) : '')
                                    .join('')}
                                </Avatar>
                              }
                              label={`${isMobile ? '' : 'Action by: '}${subtask.completedBy.name}`}
                            />
                          )}
                        </Stack>

                        <Box sx={{
                          backgroundColor: '#2a2a2a',
                          p: isMobile ? 1 : 2,
                          borderRadius: 1,
                          borderLeft: '3px solid',
                          borderColor: subtask.note ? '#3ea6ff' : 'transparent'
                        }}>
                          <Typography variant={isMobile ? "caption" : "body1"} sx={{
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
                            color: 'gray',
                            display: 'block',
                            mt: 0.5,
                            textAlign: 'right',
                            fontSize: isMobile ? '0.65rem' : '0.75rem'
                          }}>
                            Completed: {subtask.dateTime}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Paper>
                </Paper>
              )}
            </Box>
          ))}
        </Stack>
      </DialogContent>

      <Divider sx={{ backgroundColor: '#444' }} />

      <DialogActions sx={{
        backgroundColor: '#1e1e1e',
        borderTop: '1px solid #444',
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
        color: '#aaaaaa',
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