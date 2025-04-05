import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography
} from '@mui/material';
import { parseISO, isValid } from 'date-fns';

const ReportAbsenceDialog = ({ open, onClose, onSave, teamName }) => {
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Report Absence for {teamName}
      </DialogTitle>
      <DialogContent>
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
          />

        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          color="error"
          variant="contained"
          disabled={!!dateError}
        >
          Report Absence
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportAbsenceDialog;
