import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Divider,
  FormHelperText
} from "@mui/material";

const EditSessionDialog = ({ open, onClose, session, onSave }) => {
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

  // Initialize state with session data when the dialog opens
  useEffect(() => {
    if (session) {
      setSessionDate(session.sessionDate?.split("T")[0] || "");
      setConductedBy(session.conductedBy || "");
      setSessionTitle(session.sessionTitle || "");
      setOutlines(session.outlines || "");
    }
  }, [session]);

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

    const updatedSession = {
      ...session,
      sessionDate: new Date(sessionDate).toISOString(),
      conductedBy: conductedBy.trim(),
      sessionTitle: sessionTitle.trim(),
      outlines: outlines.trim(),
      updatedAt: new Date().toISOString()
    };
    onSave(updatedSession);
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
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: '#1e1e1e',
          boxShadow: 'none',
          borderRadius: '8px',
        }
      }}
    >
      <DialogTitle sx={{
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        borderBottom: '1px solid #444',
        padding: '16px 24px',
      }}>
        Edit Training Session
      </DialogTitle>

      <Divider sx={{ backgroundColor: '#444' }} />

      <DialogContent sx={{
        backgroundColor: '#1e1e1e',
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
            style: { color: errors.sessionDate ? '#f44336' : '#aaaaaa' }
          }}
          value={sessionDate}
          onChange={handleFieldChange('sessionDate')}
          sx={{
            '& .MuiInputBase-root': {
              color: '#ffffff',
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: errors.sessionDate ? '#f44336' : '#444',
              },
              '&:hover fieldset': {
                borderColor: errors.sessionDate ? '#f44336' : '#666',
              },
              '&.Mui-focused fieldset': {
                borderColor: errors.sessionDate ? '#f44336' : '#3ea6ff',
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
              color: errors.conductedBy ? '#f44336' : '#aaaaaa',
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: errors.conductedBy ? '#f44336' : '#444',
              },
              '&:hover fieldset': {
                borderColor: errors.conductedBy ? '#f44336' : '#666',
              },
              '&.Mui-focused fieldset': {
                borderColor: errors.conductedBy ? '#f44336' : '#3ea6ff',
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
              color: errors.sessionTitle ? '#f44336' : '#aaaaaa',
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: errors.sessionTitle ? '#f44336' : '#444',
              },
              '&:hover fieldset': {
                borderColor: errors.sessionTitle ? '#f44336' : '#666',
              },
              '&.Mui-focused fieldset': {
                borderColor: errors.sessionTitle ? '#f44336' : '#3ea6ff',
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
          placeholder="Enter the main points covered in this session"
          sx={{
            '& .MuiInputBase-root': {
              color: '#ffffff',
            },
            '& .MuiInputLabel-root': {
              color: errors.outlines ? '#f44336' : '#aaaaaa',
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: errors.outlines ? '#f44336' : '#444',
              },
              '&:hover fieldset': {
                borderColor: errors.outlines ? '#f44336' : '#666',
              },
              '&.Mui-focused fieldset': {
                borderColor: errors.outlines ? '#f44336' : '#3ea6ff',
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

      <Divider sx={{ backgroundColor: '#444' }} />

      <DialogActions sx={{
        backgroundColor: '#1e1e1e',
        borderTop: '1px solid #444',
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
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditSessionDialog;