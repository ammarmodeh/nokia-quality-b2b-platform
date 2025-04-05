import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export default function DownloadDialog({ open, onClose, onPasscodeValid }) {
  const [passcode, setPasscode] = React.useState('');
  const [error, setError] = React.useState('');

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
      PaperProps={{
        sx: {
          borderRadius: "8px",
          backgroundColor: '#1e1e1e',
        },
      }}
      slotProps={{
        paper: {
          component: 'form',
          onSubmit: handleSubmit,
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: "dimgray",
          color: "#ffffff",
          borderBottom: "1px solid #444",
        }}
      >
        Enter Passcode
      </DialogTitle>
      <DialogContent sx={{ backgroundColor: '#141414ed', padding: '20px' }}>
        <DialogContentText sx={{ color: '#aaaaaa', mb: 2 }}>
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
                borderColor: '#1976d2',
              },
            },
            '& .MuiFormHelperText-root': {
              color: error ? '#f44336' : '#aaaaaa',
            },
          }}
          InputProps={{
            sx: {
              borderRadius: '4px',
            }
          }}
        />
      </DialogContent>
      <DialogActions
        sx={{
          backgroundColor: "dimgray",
          display: "flex",
          justifyContent: "flex-end",
          padding: '10px 20px',
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            color: "aliceblue",
            backgroundColor: "gray",
            '&:hover': {
              backgroundColor: '#555',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          sx={{
            color: "aliceblue",
            backgroundColor: "#1976d2",
            '&:hover': {
              backgroundColor: '#1565c0',
            },
          }}
        >
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
}