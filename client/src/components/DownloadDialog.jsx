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
          backgroundColor: '#1e1e1e',
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
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          borderBottom: '1px solid #444',
          padding: isMobile ? '12px 16px' : '16px 24px',
        }}>
          <FaLock color="#3ea6ff" size={isMobile ? 16 : 20} />
          <Typography variant={isMobile ? "subtitle1" : "h6"} component="div">
            Enter Passcode
          </Typography>
        </DialogTitle>
        <DialogContent sx={{
          backgroundColor: '#1e1e1e',
          padding: isMobile ? '16px' : '20px 24px',
          "&.MuiDialogContent-root": {
            paddingTop: 3
          }
        }}>
          <DialogContentText sx={{
            color: '#aaaaaa',
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
                color: '#aaaaaa',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#444',
                },
                '&:hover fieldset': {
                  borderColor: '#666',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#3ea6ff',
                },
              },
              '& .MuiFormHelperText-root': {
                color: error ? '#f44336' : '#aaaaaa',
              },
            }}
            InputProps={{
              sx: {
                borderRadius: '4px',
                backgroundColor: '#272727',
              }
            }}
          />
        </DialogContent>
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
              backgroundColor: '#3ea6ff',
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