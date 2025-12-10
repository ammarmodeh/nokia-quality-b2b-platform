import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Divider,
  FormHelperText,
  useTheme,
  useMediaQuery
} from "@mui/material";

const AddSessionDialog = ({ open, onClose, onSave, teamName }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [sessionDate, setSessionDate] = useState("");
  const [conductedBy, setConductedBy] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [outlines, setOutlines] = useState("");
  const [errors, setErrors] = useState({
    sessionDate: false,
    conductedBy: false,
    sessionTitle: false,
    outlines: false
  });

  const validateFields = () => {
    const newErrors = {
      sessionDate: !sessionDate,
      conductedBy: !conductedBy.trim(),
      sessionTitle: !sessionTitle.trim(),
      outlines: !outlines.trim()
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSave = () => {
    if (!validateFields()) return;

    const sessionData = {
      sessionDate: new Date(sessionDate).toISOString(),
      conductedBy: conductedBy.trim(),
      sessionTitle: sessionTitle.trim(),
      outlines: outlines.trim(),
    };
    onSave(sessionData);
    onClose();
  };

  const handleFieldChange = (field) => (e) => {
    if (errors[field]) {
      setErrors({ ...errors, [field]: false });
    }
    switch (field) {
      case 'sessionDate': setSessionDate(e.target.value); break;
      case 'conductedBy': setConductedBy(e.target.value); break;
      case 'sessionTitle': setSessionTitle(e.target.value); break;
      case 'outlines': setOutlines(e.target.value); break;
    }
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
        Add Training Session for{" "}
        <Typography component="span" sx={{ fontWeight: "bold", color: '#7b68ee' }}>
          {teamName}
        </Typography>
      </DialogTitle>

      <Divider sx={{ backgroundColor: '#e5e7eb' }} />

      <DialogContent sx={{
        backgroundColor: '#2d2d2d',
        color: '#ffffff',
        padding: '20px 24px',
        '&.MuiDialogContent-root': {
          padding: '20px 24px',
        },
      }}>
        <TextField
          label="Session Date"
          type="date"
          fullWidth
          margin="normal"
          required
          error={errors.sessionDate}
          InputLabelProps={{
            shrink: true,
            style: { color: errors.sessionDate ? '#f44336' : '#6b7280' }
          }}
          value={sessionDate}
          onChange={handleFieldChange('sessionDate')}
          sx={{
            '& .MuiInputBase-root': {
              color: '#ffffff',
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: errors.sessionDate ? '#f44336' : '#e5e7eb',
              },
              '&:hover fieldset': {
                borderColor: errors.sessionDate ? '#f44336' : '#666',
              },
              '&.Mui-focused fieldset': {
                borderColor: errors.sessionDate ? '#f44336' : '#7b68ee',
              },
            },
          }}
        />
        {errors.sessionDate && (
          <FormHelperText error sx={{ mt: -1, mb: 1, color: '#f44336' }}>
            Session date is required
          </FormHelperText>
        )}

        <TextField
          label="Conducted By"
          fullWidth
          margin="normal"
          required
          error={errors.conductedBy}
          value={conductedBy}
          onChange={handleFieldChange('conductedBy')}
          sx={{
            '& .MuiInputBase-root': {
              color: '#ffffff',
            },
            '& .MuiInputLabel-root': {
              color: errors.conductedBy ? '#f44336' : '#6b7280',
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: errors.conductedBy ? '#f44336' : '#e5e7eb',
              },
              '&:hover fieldset': {
                borderColor: errors.conductedBy ? '#f44336' : '#666',
              },
              '&.Mui-focused fieldset': {
                borderColor: errors.conductedBy ? '#f44336' : '#7b68ee',
              },
            },
          }}
        />
        {errors.conductedBy && (
          <FormHelperText error sx={{ mt: -1, mb: 1, color: '#f44336' }}>
            Conducted by is required
          </FormHelperText>
        )}

        <TextField
          label="Session Title"
          fullWidth
          margin="normal"
          required
          error={errors.sessionTitle}
          value={sessionTitle}
          onChange={handleFieldChange('sessionTitle')}
          sx={{
            '& .MuiInputBase-root': {
              color: '#ffffff',
            },
            '& .MuiInputLabel-root': {
              color: errors.sessionTitle ? '#f44336' : '#6b7280',
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: errors.sessionTitle ? '#f44336' : '#e5e7eb',
              },
              '&:hover fieldset': {
                borderColor: errors.sessionTitle ? '#f44336' : '#666',
              },
              '&.Mui-focused fieldset': {
                borderColor: errors.sessionTitle ? '#f44336' : '#7b68ee',
              },
            },
          }}
        />
        {errors.sessionTitle && (
          <FormHelperText error sx={{ mt: -1, mb: 1, color: '#f44336' }}>
            Session title is required
          </FormHelperText>
        )}

        <TextField
          label="Training Outlines"
          fullWidth
          margin="normal"
          required
          error={errors.outlines}
          multiline
          rows={4}
          value={outlines}
          onChange={handleFieldChange('outlines')}
          placeholder="Enter the main points covered in this session (separated by commas or bullet points)"
          sx={{
            '& .MuiInputBase-root': {
              color: '#ffffff',
            },
            '& .MuiInputLabel-root': {
              color: errors.outlines ? '#f44336' : '#6b7280',
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: errors.outlines ? '#f44336' : '#e5e7eb',
              },
              '&:hover fieldset': {
                borderColor: errors.outlines ? '#f44336' : '#666',
              },
              '&.Mui-focused fieldset': {
                borderColor: errors.outlines ? '#f44336' : '#7b68ee',
              },
            },
          }}
        />
        {errors.outlines && (
          <FormHelperText error sx={{ mt: -1, mb: 1, color: '#f44336' }}>
            Training outlines are required
          </FormHelperText>
        )}
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
          onClick={handleSave}
          variant="contained"
          sx={{
            backgroundColor: '#1976d2',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#1565c0',
            }
          }}
        >
          Save Session
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddSessionDialog;