import { useState } from 'react';
import AsyncButton from './ui/AsyncButton';
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

  const handleSubmit = async () => {
    if (!sessionDate) {
      setDateError('Session date is required');
      return;
    }

    const parsedDate = parseISO(sessionDate);
    if (!isValid(parsedDate)) {
      setDateError('Please enter a valid date in YYYY-MM-DD format');
      return;
    }

    return onSave({
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
    >
      <DialogTitle sx={{ padding: '16px 24px' }}>
        Report Absence for {teamName}
      </DialogTitle>


      <DialogContent sx={{ padding: '20px 24px' }}>
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
              style: { color: dateError ? '#DC2626' : '#6b7280' }
            }}
            sx={{
              '& .MuiInputBase-root': {
                color: 'var(--text)',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: dateError ? '#DC2626' : '#e5e7eb',
                },
                '&:hover fieldset': {
                  borderColor: dateError ? '#DC2626' : 'var(--text-muted)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: dateError ? '#DC2626' : '#6C47FF',
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
                color: 'var(--text)',
              },
              '& .MuiInputLabel-root': {
                color: 'var(--text-secondary)',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'var(--border)',
                },
                '&:hover fieldset': {
                  borderColor: 'var(--text-muted)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'var(--accent)',
                },
              },
            }}
          />
        </Box>
      </DialogContent>

      <Divider sx={{ backgroundColor: '#e5e7eb' }} />

      <DialogActions sx={{ padding: '12px 24px' }}>
        <Button
          onClick={onClose}
          sx={{
            color: 'var(--text)',
            '&:hover': {
              backgroundColor: 'var(--surface)',
            }
          }}
        >
          Cancel
        </Button>
        <AsyncButton
          pendingLabel="Saving…"
          onClick={handleSubmit}
          color="error"
          variant="contained"
          disabled={!!dateError}
        >
          Report Absence
        </AsyncButton>
      </DialogActions>
    </Dialog>
  );
};

export default ReportAbsenceDialog;
