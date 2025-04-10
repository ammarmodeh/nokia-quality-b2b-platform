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
} from '@mui/material';
import * as XLSX from 'xlsx';
import { MdClose, MdFileDownload } from 'react-icons/md';
import { useTheme, useMediaQuery } from '@mui/material';

export const TaskDetailsDialog = ({ open, onClose, tasks, teamName }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
    XLSX.writeFile(workbook, `${teamName}_Tasks.xlsx`);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: '#1e1e1e',
          boxShadow: 'none',
          borderRadius: fullScreen ? '0px' : '8px', // Remove border radius for mobile view
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        borderBottom: '1px solid #444',
        padding: '16px 24px',
      }}>
        <Typography variant="h6" component="div">
          All Tasks for Team: {teamName}
        </Typography>
        <IconButton
          onClick={onClose}
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

      <Divider sx={{ backgroundColor: '#444' }} />

      <DialogContent dividers sx={{
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        padding: '20px 24px',
      }}>
        <Stack spacing={3}>
          {tasks.map((task, index) => (
            <Paper
              key={index}
              elevation={0}
              sx={{
                p: 3,
                backgroundColor: '#272727',
                borderRadius: 2,
                border: '1px solid #444'
              }}
            >
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#3ea6ff' }}>
                Task {index + 1}
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                {/* Column 1 */}
                <Box>
                  <DetailRow label="Request Number" value={task.requestNumber} />
                  <DetailRow label="SLID" value={task.slid} />
                  <DetailRow label="PIS Date" value={new Date(task.pisDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric'
                  })} />
                  <DetailRow
                    label="Evaluation Score"
                    value={
                      <Chip
                        label={task.evaluationScore}
                        sx={{
                          color: '#ffffff',
                          backgroundColor:
                            task.evaluationScore >= 9 ? '#4caf50' :
                              task.evaluationScore >= 7 ? '#9e9e9e' : '#f44336',
                          fontWeight: 'bold'
                        }}
                      />
                    }
                  />
                  <DetailRow label="Customer Name" value={task.customerName} />
                  <DetailRow label="Contact Number" value={task.contactNumber} />
                </Box>

                {/* Column 2 */}
                <Box>
                  <DetailRow label="Tariff Name" value={task.tarrifName} />
                  <DetailRow label="Customer Feedback" value={task.customerFeedback} />
                  <DetailRow label="Reason" value={task.reason} />
                  <DetailRow label="Customer Type" value={task.customerType} />
                  <DetailRow label="Governorate" value={task.governorate} />
                  <DetailRow label="District" value={task.district} />
                </Box>
              </Box>

              {/* Subtasks section */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#3ea6ff', mb: 1 }}>
                  Action Taken by Assigned User
                </Typography>
                <Box sx={{
                  backgroundColor: '#333',
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid #444'
                }}>
                  {task.subTasks.map((sub, index) => (
                    <Box key={index} sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ color: '#ffffff' }}>
                        <strong>Step {index + 1}:</strong> {sub.note}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Team info at bottom */}
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mt: 3,
                pt: 2,
                borderTop: '1px solid #444'
              }}>
                <DetailRow label="Team Name" value={task.teamName} />
                <DetailRow label="Team Company" value={task.teamCompany} />
                <DetailRow label="Interview Date" value={new Date(task.interviewDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'numeric',
                  day: 'numeric'
                })} />
              </Box>
            </Paper>
          ))}
        </Stack>
      </DialogContent>

      <Divider sx={{ backgroundColor: '#444' }} />

      <DialogActions sx={{
        backgroundColor: '#1e1e1e',
        borderTop: '1px solid #444',
        padding: '12px 24px',
      }}>
        <Button
          onClick={exportToExcel}
          variant="contained"
          startIcon={<MdFileDownload />}
          sx={{
            backgroundColor: '#1d4ed8',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#1e40af',
            }
          }}
        >
          Export to Excel
        </Button>
        <Button
          onClick={onClose}
          sx={{
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#2a2a2a',
            }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Reusable DetailRow component
const DetailRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', mb: 2 }}>
    <Typography
      variant="body2"
      component="div"
      sx={{
        fontWeight: '500',
        color: '#aaaaaa'
      }}
    >
      {label}
    </Typography>
    {typeof value === 'string' || typeof value === 'number' ? (
      <Typography
        variant="body1"
        component="div"
        sx={{
          color: '#ffffff',
          wordBreak: 'break-word'
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
