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
          backgroundColor: '#2d2d2d',
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
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: isMobile ? '12px 16px' : '16px 24px',
        }}>
          <FaLock color="#7b68ee" size={isMobile ? 16 : 20} />
          <Typography variant={isMobile ? "subtitle1" : "h6"} component="div">
            Enter Passcode
          </Typography>
        </DialogTitle>
        <DialogContent sx={{
          backgroundColor: '#2d2d2d',
          padding: isMobile ? '16px' : '20px 24px',
          "&.MuiDialogContent-root": {
            paddingTop: 3
          }
        }}>
          <DialogContentText sx={{
            color: '#b3b3b3',
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
              '& .MuiFormHelperText-root': {
                color: error ? '#f44336' : '#6b7280',
              },
            }}
            InputProps={{
              sx: {
                borderRadius: '4px',
                backgroundColor: '#2d2d2d',
              }
            }}
          />
        </DialogContent>
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
              }
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size={isMobile ? "small" : "medium"}
            sx={{
              color: '#ffffff',
              backgroundColor: '#7b68ee',
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