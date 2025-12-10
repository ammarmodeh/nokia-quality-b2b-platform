import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  Divider
} from '@mui/material';
import { parseISO, isValid } from 'date-fns';

const ReportAbsenceDialog = ({ open, onClose, onSave, teamName }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [sessionDate, setSessionDate] = useState('');
  const [reason, setReason] = useState('');
  const [dateError, setDateError] = useState('');

  const handleDateChange = (e) => {
    const value = e.target.value;
    setSessionDate(value);

    // Validate date format (YYYY-MM-DD)
    if (value) {
      try {
        const parsedDate = parseISO(value);
        if (!isValid(parsedDate)) {
          setDateError('Please enter a valid date in YYYY-MM-DD format');
        } else {
          setDateError('');
        }
      } catch (error) {
        setDateError('Invalid date format');
      }
    } else {
      setDateError('');
    }
  };

  const handleSubmit = () => {
    if (!sessionDate) {
      setDateError('Session date is required');
      return;
    }

    const parsedDate = parseISO(sessionDate);
    if (!isValid(parsedDate)) {
      setDateError('Please enter a valid date in YYYY-MM-DD format');
      return;
    }

    onSave({
      sessionDate: parsedDate.toISOString(),
      reason
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: '#2d2d2d',
          boxShadow: 'none',
          borderRadius: fullScreen ? '0px' : '8px', // Remove border radius for mobile view
        }
      }}
    >
      <DialogTitle sx={{
        backgroundColor: '#2d2d2d',
        color: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px',
      }}>
        Report Absence for {teamName}
      </DialogTitle>

      <Divider sx={{ backgroundColor: '#e5e7eb' }} />

      <DialogContent sx={{
        backgroundColor: '#2d2d2d',
        color: '#ffffff',
        padding: '20px 24px',
      }}>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            Use this form to report when a team failed to attend a confirmed training session.
            This will record a violation for unprofessional behavior.
          </Typography>

          <TextField
            label="Session Date"
            fullWidth
            margin="normal"
            value={sessionDate}
            onChange={handleDateChange}
            error={!!dateError}
            helperText={dateError}
            type="date"
            InputLabelProps={{
              shrink: true,
              style: { color: dateError ? '#f44336' : '#6b7280' }
            }}
            sx={{
              '& .MuiInputBase-root': {
                color: '#ffffff',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: dateError ? '#f44336' : '#e5e7eb',
                },
                '&:hover fieldset': {
                  borderColor: dateError ? '#f44336' : '#666',
                },
                '&.Mui-focused fieldset': {
                  borderColor: dateError ? '#f44336' : '#7b68ee',
                },
              },
            }}
          />

          <TextField
            label="Reason for Absence (if known)"
            fullWidth
            margin="normal"
            multiline
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter any details about why the team was absent..."
            sx={{
              '& .MuiInputBase-root': {
                color: '#ffffff',
              },
              '& .MuiInputLabel-root': {
                color: '#b3b3b3',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#3d3d3d',
                },
                '&:hover fieldset': {
                  borderColor: '#666',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#7b68ee',
                },
              },
            }}
          />
        </Box>
      </DialogContent>

      <Divider sx={{ backgroundColor: '#e5e7eb' }} />

      <DialogActions sx={{
        backgroundColor: '#2d2d2d',
        borderTop: '1px solid #e5e7eb',
        padding: '12px 24px',
      }}>
        <Button
          onClick={onClose}
          sx={{
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#2a2a2a',
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          color="error"
          variant="contained"
          disabled={!!dateError}
          sx={{
            backgroundColor: '#f44336',
            '&:hover': {
              backgroundColor: '#e57373',
            }
          }}
        >
          Report Absence
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportAbsenceDialog;
