import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { FaLock } from 'react-icons/fa';
import { useTheme, useMediaQuery, Typography } from '@mui/material';

export default function DownloadDialog({ open, onClose, onPasscodeValid }) {
  const [passcode, setPasscode] = React.useState('');
  const [error, setError] = React.useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const CORRECT_PASSCODE = import.meta.env.VITE_PASSCODE;

  const handleSubmit = (event) => {
    event.preventDefault();
    const correctPasscode = CORRECT_PASSCODE;

    if (passcode === correctPasscode) {
      onPasscodeValid();
      setPasscode(''); // Clear the passcode field
      setError(''); // Clear any previous error
      onClose();
    } else {
      setError("Incorrect passcode. Please try again.");
    }
  };

  // Clear fields when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setPasscode('');
      setError('');
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={isMobile}
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: 'var(--surface)',
          boxShadow: 'none',
          borderRadius: isMobile ? 0 : '8px',
        }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          backgroundColor: 'var(--surface)',
          color: 'var(--text)',
          borderBottom: '1px solid var(--border)',
          padding: isMobile ? '12px 16px' : '16px 24px',
        }}>
          <FaLock color="var(--accent-text)" size={isMobile ? 16 : 20} />
          <Typography variant={isMobile ? "subtitle1" : "h6"} component="div">
            Enter Passcode
          </Typography>
        </DialogTitle>
        <DialogContent sx={{
          backgroundColor: 'var(--surface)',
          padding: isMobile ? '16px' : '20px 24px',
          "&.MuiDialogContent-root": {
            paddingTop: 3
          }
        }}>
          <DialogContentText sx={{
            color: 'var(--text-secondary)',
            mb: 2,
            fontSize: isMobile ? '0.875rem' : '1rem'
          }}>
            To download the file, please enter the shared passcode.
          </DialogContentText>
          <TextField
            autoFocus
            required
            margin="dense"
            id="passcode"
            name="passcode"
            label="Passcode"
            type="password"
            fullWidth
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            error={!!error}
            helperText={error}
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
                  borderColor: '#666',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'var(--accent)',
                },
              },
              '& .MuiFormHelperText-root': {
                color: error ? '#f44336' : '#6b7280',
              },
            }}
            InputProps={{
              sx: {
                borderRadius: '4px',
                backgroundColor: 'var(--surface)',
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{
          backgroundColor: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          padding: isMobile ? '8px 16px' : '12px 24px',
        }}>
          <Button
            onClick={onClose}
            size={isMobile ? "small" : "medium"}
            sx={{
              color: 'var(--text)',
              '&:hover': {
                backgroundColor: 'var(--surface)',
              }
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size={isMobile ? "small" : "medium"}
            sx={{
              color: 'var(--text)',
              backgroundColor: 'var(--accent)',
              '&:hover': {
                backgroundColor: '#1976d2',
              }
            }}
          >
            Submit
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}