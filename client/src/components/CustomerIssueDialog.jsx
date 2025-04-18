import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  Typography,
  useTheme,
  useMediaQuery
} from "@mui/material";
import { useSelector } from "react-redux";

const CustomerIssueDialog = ({ open, onClose, onSubmit }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const user = useSelector((state) => state?.auth?.user);
  const isAdmin = user.role === "Admin";

  const [formData, setFormData] = useState({
    slid: "",
    from: "",
    reporter: "",
    reporterNote: "",
    contactMethod: "",
    issueCategory: "",
    date: new Date().toISOString().split('T')[0],
    pisDate: new Date().toISOString().split('T')[0],
    solved: "no",
    assignedTo: "",
    assignedNote: "",
    teamCompany: '',
    resolutionDetails: ""
  });

  const teams = [
    "Activation Team",
    "Nokia Quality Team",
    "Orange Quality Team",
    "Nokia Closure Team"
  ];

  const contactMethods = [
    "Phone call",
    "WhatsApp private message",
    "WhatsApp group message"
  ];

  const companyTeams = [
    "INH-1",
    "INH-2",
    "INH-3",
    "INH-4",
    'INH-5',
    'INH-6',
    "Al-Dar 2",
    "Orange Team",
    "Others"
  ];

  const handleChange = (e) => {
    if (!isAdmin) return;
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = () => {
    if (!isAdmin) return;
    onSubmit(formData);
    onClose();
  };

  // Style constants with disabled state
  const textFieldStyles = {
    '& .MuiInputBase-root': {
      color: '#ffffff',
      cursor: isAdmin ? 'text' : 'not-allowed',
    },
    '& .MuiInputLabel-root': {
      color: '#aaaaaa',
    },
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: '#444',
      },
      '&:hover fieldset': {
        borderColor: isAdmin ? '#666' : '#444',
      },
      '&.Mui-focused fieldset': {
        borderColor: isAdmin ? '#1976d2' : '#444',
      },
      '&.Mui-disabled': {
        cursor: 'not-allowed',
      }
    },
    '& .MuiFormHelperText-root': {
      color: '#aaaaaa',
    },
  };

  const formControlStyles = {
    '& .MuiInputBase-root': {
      color: '#ffffff',
      cursor: isAdmin ? 'pointer' : 'not-allowed',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: '#444',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: isAdmin ? '#666' : '#444',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: isAdmin ? '#1976d2' : '#444',
    },
  };

  const inputLabelStyles = {
    color: '#aaaaaa',
    '&.Mui-focused': {
      color: isAdmin ? '#1976d2' : '#aaaaaa',
    },
  };

  const selectStyles = {
    '& .MuiSelect-icon': {
      color: '#aaaaaa',
    },
  };

  const menuItemStyles = {
    color: '#ffffff',
    backgroundColor: '#1e1e1e',
    '&:hover': {
      backgroundColor: '#2a2a2a',
    },
    '&.Mui-selected': {
      backgroundColor: '#1976d2',
      '&:hover': {
        backgroundColor: '#1565c0',
      },
    },
  };

  const cancelButtonStyles = {
    color: '#ffffff',
    backgroundColor: '#555',
    '&:hover': {
      backgroundColor: '#666',
    },
  };

  const submitButtonStyles = {
    color: '#ffffff',
    backgroundColor: isAdmin ? '#1976d2' : '#555',
    '&:hover': {
      backgroundColor: isAdmin ? '#1565c0' : '#555',
    },
    cursor: isAdmin ? 'pointer' : 'not-allowed',
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
          backgroundColor: '#1e1e1e',
          boxShadow: 'none',
          borderRadius: fullScreen ? '0px' : '8px', // Remove border radius for mobile view
        }
      }}
    >
      <DialogTitle sx={{
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        borderBottom: '1px solid #444',
        padding: '16px 24px',
      }}>
        <Typography variant="h6" component="div">
          Customer Issue Notification
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        padding: '20px 24px',
        '&.MuiDialogContent-root': {
          padding: '20px 24px',
        },
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="SLID (Subscription Number)"
            name="slid"
            value={formData.slid}
            onChange={handleChange}
            required
            disabled={!isAdmin}
            sx={textFieldStyles}
          />

          <TextField
            fullWidth
            label="PIS Date"
            type="date"
            name="pisDate"
            value={formData.pisDate}
            onChange={handleChange}
            InputLabelProps={{
              shrink: true,
            }}
            disabled={!isAdmin}
            sx={textFieldStyles}
          />

          <FormControl fullWidth required sx={formControlStyles}>
            <InputLabel sx={inputLabelStyles}>From</InputLabel>
            <Select
              name="from"
              value={formData.from}
              label="From"
              onChange={handleChange}
              disabled={!isAdmin}
              sx={selectStyles}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: '#1e1e1e',
                    color: '#ffffff',
                    '& .MuiMenuItem-root': menuItemStyles,
                  },
                },
              }}
            >
              {teams.map(team => (
                <MenuItem key={team} value={team} sx={menuItemStyles}>
                  {team}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Reporter Name"
            name="reporter"
            value={formData.reporter}
            onChange={handleChange}
            required
            disabled={!isAdmin}
            sx={textFieldStyles}
          />

          <TextField
            fullWidth
            label="Reporter Note"
            name="reporterNote"
            value={formData.reporterNote}
            onChange={handleChange}
            multiline
            rows={2}
            disabled={!isAdmin}
            sx={textFieldStyles}
          />

          <FormControl fullWidth required sx={formControlStyles}>
            <InputLabel sx={inputLabelStyles}>Team/Company</InputLabel>
            <Select
              name="teamCompany"
              value={formData.teamCompany}
              label="Team/Company"
              onChange={handleChange}
              disabled={!isAdmin}
              sx={selectStyles}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: '#1e1e1e',
                    color: '#ffffff',
                    '& .MuiMenuItem-root': menuItemStyles,
                  },
                },
              }}
            >
              {companyTeams.map(team => (
                <MenuItem key={team} value={team} sx={menuItemStyles}>
                  {team}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth required sx={formControlStyles}>
            <InputLabel sx={inputLabelStyles}>Contact Method</InputLabel>
            <Select
              name="contactMethod"
              value={formData.contactMethod}
              label="Contact Method"
              onChange={handleChange}
              disabled={!isAdmin}
              sx={selectStyles}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: '#1e1e1e',
                    color: '#ffffff',
                    '& .MuiMenuItem-root': menuItemStyles,
                  },
                },
              }}
            >
              {contactMethods.map(type => (
                <MenuItem key={type} value={type} sx={menuItemStyles}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Issue Category"
            name="issueCategory"
            value={formData.issueCategory}
            onChange={handleChange}
            required
            disabled={!isAdmin}
            sx={textFieldStyles}
          />

          <TextField
            fullWidth
            label="Date"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            InputLabelProps={{
              shrink: true,
            }}
            disabled={!isAdmin}
            sx={textFieldStyles}
          />

          <FormControl fullWidth required sx={formControlStyles}>
            <InputLabel sx={inputLabelStyles}>Solved</InputLabel>
            <Select
              name="solved"
              value={formData.solved}
              label="Solved"
              onChange={handleChange}
              disabled={!isAdmin}
              sx={selectStyles}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: '#1e1e1e',
                    color: '#ffffff',
                    '& .MuiMenuItem-root': menuItemStyles,
                  },
                },
              }}
            >
              <MenuItem value="yes" sx={menuItemStyles}>Yes</MenuItem>
              <MenuItem value="no" sx={menuItemStyles}>No</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Resolution Details"
            name="resolutionDetails"
            value={formData.resolutionDetails}
            onChange={handleChange}
            multiline
            rows={3}
            helperText="Explain the resolution details here."
            disabled={!isAdmin}
            sx={textFieldStyles}
          />

          <TextField
            fullWidth
            label="Assigned To"
            name="assignedTo"
            value={formData.assignedTo}
            onChange={handleChange}
            required
            disabled={!isAdmin}
            sx={textFieldStyles}
          />

          <TextField
            fullWidth
            label="Assigned User Note"
            name="assignedNote"
            value={formData.assignedNote}
            onChange={handleChange}
            multiline
            rows={2}
            disabled={!isAdmin}
            sx={textFieldStyles}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{
        backgroundColor: '#1e1e1e',
        borderTop: '1px solid #444',
        padding: '12px 24px',
      }}>
        <Button
          onClick={onClose}
          sx={cancelButtonStyles}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isAdmin}
          sx={submitButtonStyles}
        >
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomerIssueDialog;
