import { useState, useEffect } from "react";
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
  useMediaQuery,
  IconButton,
  Grid,
  Checkbox,
  FormControlLabel,
  Tooltip,
  alpha
} from "@mui/material";
import { useSelector } from "react-redux";
import ManagedAutocomplete from "./common/ManagedAutocomplete";
import { MdAdd, MdDelete, MdHistory, MdTerminal } from "react-icons/md";
import CustomerIssueLogTerminal from "./CustomerIssueLogTerminal";
import api from "../api/api";

const CustomerIssueDialog = ({ open, onClose, onSubmit, issue = null }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const user = useSelector((state) => state?.auth?.user);
  const isAdmin = user.role === "Admin";

  const initialFormState = {
    slid: "",
    fromMain: "",
    fromSub: "",
    reporter: "",
    reporterNote: "",
    contactMethod: "",
    issues: [{ category: '', subCategory: '' }],
    pisDateKnown: true,
    pisDate: new Date().toISOString().split('T')[0],
    date: new Date().toISOString().split('T')[0],
    solved: "no",
    assignedTo: "",
    installingTeam: "",
    teamCompany: '',
    customerName: '',
    customerContact: '',
    assigneeNote: '',
    resolvedBy: '',
    resolveDate: '',
    closedBy: "",
    closedAt: "",
    dispatched: "no",
    dispatchedAt: "",
    resolutionDetails: ""
  };

  const [formData, setFormData] = useState(initialFormState);
  const [openLogTerminal, setOpenLogTerminal] = useState(false);
  const [duplicateIssues, setDuplicateIssues] = useState([]);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);

  // Persistence & Edit Logic
  useEffect(() => {
    if (open) {
      if (issue) {
        // If editing, populate with issue data
        setFormData({
          ...initialFormState,
          ...issue,
          pisDateKnown: !!issue.pisDate,
          pisDate: issue.pisDate ? new Date(issue.pisDate).toISOString().split('T')[0] : initialFormState.pisDate,
          date: issue.date ? new Date(issue.date).toISOString().split('T')[0] : initialFormState.date,
          resolveDate: issue.resolveDate ? new Date(issue.resolveDate).toISOString().split('T')[0] : initialFormState.resolveDate,
          closedAt: issue.closedAt ? new Date(issue.closedAt).toISOString().split('T')[0] : initialFormState.closedAt,
          dispatched: issue.dispatched || 'no',
          dispatchedAt: issue.dispatchedAt ? new Date(issue.dispatchedAt).toISOString().split('T')[0] : initialFormState.dispatchedAt,
          issues: issue.issues && issue.issues.length > 0 ? issue.issues : [{ category: '', subCategory: '' }]
        });
      } else {
        // If creating, check local storage
        const savedData = localStorage.getItem('customerIssueFormData');
        const today = new Date().toISOString().split('T')[0];
        if (savedData) {
          const parsed = JSON.parse(savedData);
          setFormData(prev => ({
            ...prev,
            ...parsed,
            pisDate: today, // Always default to today for new entries
            date: today     // Always default to today for new entries
          }));
        } else {
          setFormData({
            ...initialFormState,
            pisDate: today,
            date: today
          });
        }
      }
    }
  }, [open, issue]);

  useEffect(() => {
    if (open && !issue) {
      // Debounce localStorage save to prevent excessive updates
      const timeoutId = setTimeout(() => {
        localStorage.setItem('customerIssueFormData', JSON.stringify(formData));
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [formData, open, issue]);

  const checkExistingIssues = async (manual = false) => {
    // Only check if creating a new issue or if the SLID has changed significantly
    // And avoid checking if we are editing the same issue (though backend filter handles exact match)
    if (formData.slid && formData.slid.length > 2 && !issue) {
      try {
        const res = await api.get('/customer-issues-notifications', {
          params: { slid: formData.slid }, // Uses the new exact match filter backend
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });

        if (res.data.data && res.data.data.length > 0) {
          setDuplicateIssues(res.data.data);
          setDuplicateDialogOpen(true);
        } else {
          setDuplicateIssues([]);
          if (manual) {
            alert("No existing issues found for this SLID.");
          }
        }
      } catch (err) {
        console.error("Duplicate check failed", err);
      }
    } else if (manual && (!formData.slid || formData.slid.length <= 2)) {
      alert("Please enter a valid SLID (at least 3 characters) to check.");
    }
  };

  useEffect(() => {
    const checkExistingIssues = async () => {
      // Only check if creating a new issue or if the SLID has changed significantly
      // And avoid checking if we are editing the same issue (though backend filter handles exact match)
      if (formData.slid && formData.slid.length > 5 && !issue) {
        try {
          const res = await api.get('/customer-issues-notifications', {
            params: { slid: formData.slid }, // Uses the new exact match filter backend
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          });

          if (res.data.data && res.data.data.length > 0) {
            setDuplicateIssues(res.data.data);
            setDuplicateDialogOpen(true);
          } else {
            setDuplicateIssues([]);
          }
        } catch (err) {
          console.error("Duplicate check failed", err);
        }
      }
    };

    // Debounce the API call
    const timer = setTimeout(() => {
      checkExistingIssues();
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.slid, issue]);

  const handleChange = (e) => {
    if (!isAdmin) return;
    const { name, value, type, checked } = e.target;

    setFormData(prev => {
      let updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Reset resolution/closure fields if ticket is toggled back to "Open"
      if (name === 'solved' && value === 'no') {
        updated = {
          ...updated,
          resolvedBy: '',
          resolveDate: '',
          resolutionDetails: '',
          closedBy: '',
          closedAt: ''
        };
      }

      // Reset dispatch date if dispatched is set to "no"
      if (name === 'dispatched' && value === 'no') {
        updated = {
          ...updated,
          dispatchedAt: ''
        };
      }

      return updated;
    });
  };

  // Issue Management
  const handleIssueChange = (index, field, value) => {
    const updatedIssues = [...formData.issues];
    updatedIssues[index][field] = value;
    setFormData(prev => ({ ...prev, issues: updatedIssues }));
  };

  const addIssueRow = () => {
    setFormData(prev => ({
      ...prev,
      issues: [...prev.issues, { category: '', subCategory: '' }]
    }));
  };

  const removeIssueRow = (index) => {
    if (formData.issues.length > 1) {
      setFormData(prev => ({
        ...prev,
        issues: prev.issues.filter((_, i) => i !== index)
      }));
    }
  };

  const validateForm = () => {
    const requiredFields = [
      { field: 'slid', label: 'SLID' },
      { field: 'fromMain', label: 'From (Main)' },
      { field: 'reporter', label: 'Reporter Name' },
      { field: 'contactMethod', label: 'Contact Method' },
      { field: 'teamCompany', label: 'Team/Company' },
      { field: 'assignedTo', label: 'Assigned To' }
    ];

    for (const { field, label } of requiredFields) {
      if (!formData[field] || (typeof formData[field] === 'string' && !formData[field].trim())) {
        alert(`${label} is required.`);
        return false;
      }
    }

    if (!formData.issues || formData.issues.length === 0) {
      alert("At least one issue is required.");
      return false;
    }

    for (let i = 0; i < formData.issues.length; i++) {
      if (!formData.issues[i].category || !formData.issues[i].category.trim()) {
        alert(`Category for Issue ${i + 1} is required.`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = () => {
    if (!isAdmin) return;

    if (!validateForm()) return;

    const submitData = {
      ...formData,
      pisDate: formData.pisDateKnown ? formData.pisDate : null
    };
    onSubmit(submitData, issue?._id); // Pass ID if editing
    if (!issue) localStorage.removeItem('customerIssueFormData');
    onClose();
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset the form? This will clear all entered data.")) {
      localStorage.removeItem('customerIssueFormData');
      setFormData(initialFormState);
    }
  };

  const handleClose = () => {
    // Persist data is already handled by useEffect, so just close
    onClose();
  }

  // Style constants with disabled state
  const textFieldStyles = {
    '& .MuiInputBase-root': {
      color: '#ffffff',
      cursor: isAdmin ? 'text' : 'not-allowed',
    },
    '& .MuiInputLabel-root': {
      color: '#b3b3b3',
    },
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: '#3d3d3d',
      },
      '&:hover fieldset': {
        borderColor: isAdmin ? '#666' : '#e5e7eb',
      },
      '&.Mui-focused fieldset': {
        borderColor: isAdmin ? '#1976d2' : '#e5e7eb',
      },
      '&.Mui-disabled': {
        cursor: 'not-allowed',
      }
    },
    '& .MuiFormHelperText-root': {
      color: '#b3b3b3',
    },
  };

  const formControlStyles = {
    '& .MuiInputBase-root': {
      color: '#ffffff',
      cursor: isAdmin ? 'pointer' : 'not-allowed',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: '#3d3d3d',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: isAdmin ? '#666' : '#e5e7eb',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: isAdmin ? '#1976d2' : '#e5e7eb',
    },
  };

  const inputLabelStyles = {
    color: '#b3b3b3',
    '&.Mui-focused': {
      color: isAdmin ? '#1976d2' : '#6b7280',
    },
  };

  const selectStyles = {
    '& .MuiSelect-icon': {
      color: '#b3b3b3',
    },
  };

  const menuItemStyles = {
    color: '#ffffff',
    backgroundColor: '#2d2d2d',
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

  const resetButtonStyle = {
    color: '#ffffff',
    backgroundColor: '#b91c1c', // Deep Red
    '&:hover': {
      backgroundColor: '#991b1b', // Darker Red
    },
    mr: 'auto' // Push to the left
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: '#2d2d2d',
          boxShadow: 'none',
          borderRadius: fullScreen ? '0px' : '8px',
        }
      }}
    >
      <DialogTitle sx={{
        backgroundColor: '#2d2d2d',
        color: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px',
      }}>
        <Typography variant="h6" component="div">
          {issue ? 'Edit Customer Issue' : 'Customer Issue Notification'}
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{
        backgroundColor: '#2d2d2d',
        color: '#ffffff',
        padding: '20px 24px',
        '&.MuiDialogContent-root': {
          padding: '20px 24px',
        },
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Customer Information Block */}
          <Box sx={{ border: '1px solid #3d3d3d', borderRadius: 2, p: 2, mb: 1 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ color: '#7b68ee', mb: 2 }}>Customer Information</Typography>

            <TextField
              fullWidth
              label="Ticket ID (Optional)"
              name="ticketId"
              value={formData.ticketId || ''}
              onChange={handleChange}
              disabled={!isAdmin}
              sx={{ ...textFieldStyles, mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
              <TextField
                fullWidth
                label="SLID (Subscription Number)"
                name="slid"
                value={formData.slid || ''}
                onChange={handleChange}
                required
                disabled={!isAdmin}
                sx={{ ...textFieldStyles }}
              />
              <Tooltip title="Check Existing Issues in Database">
                <IconButton
                  onClick={() => checkExistingIssues(true)} // Manual check
                  sx={{
                    mt: 1,
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    color: '#f59e0b',
                    '&:hover': { backgroundColor: 'rgba(245, 158, 11, 0.2)' }
                  }}
                >
                  <MdHistory />
                </IconButton>
              </Tooltip>
            </Box>



            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.pisDateKnown}
                    onChange={handleChange}
                    name="pisDateKnown"
                    sx={{ color: '#b3b3b3', '&.Mui-checked': { color: '#7b68ee' } }}
                  />
                }
                label="PIS Date Known"
                sx={{ color: '#ffffff' }}
              />
              {formData.pisDateKnown && (
                <TextField
                  fullWidth
                  label="PIS Date"
                  type="date"
                  name="pisDate"
                  value={formData.pisDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  disabled={!isAdmin}
                  sx={textFieldStyles}
                />
              )}
            </Box>

            <TextField
              fullWidth
              label="Customer Name"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              required
              disabled={!isAdmin}
              sx={{ ...textFieldStyles, mb: 2 }}
            />

            <TextField
              fullWidth
              label="Customer Contact Info"
              name="customerContact"
              value={formData.customerContact}
              onChange={handleChange}
              required
              disabled={!isAdmin}
              sx={textFieldStyles}
            />
          </Box>

          {/* Reporter Information Block */}
          <Box sx={{ border: '1px solid #3d3d3d', borderRadius: 2, p: 2, mb: 1 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ color: '#7b68ee', mb: 2 }}>Reporter Information</Typography>

            <TextField
              fullWidth
              label="Reported Date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              disabled={!isAdmin}
              sx={{ ...textFieldStyles, mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <ManagedAutocomplete
                category="ISSUE_FROM_MAIN"
                label="From (Main)"
                fullWidth
                required
                value={formData.fromMain}
                onChange={(val) => handleChange({ target: { name: 'fromMain', value: val } })}
                disabled={!isAdmin}
                sx={{ ...textFieldStyles }}
              />

              <ManagedAutocomplete
                category="ISSUE_FROM_SUB"
                label="From (Sub)"
                fullWidth
                value={formData.fromSub}
                onChange={(val) => handleChange({ target: { name: 'fromSub', value: val } })}
                disabled={!isAdmin}
                sx={{ ...textFieldStyles }}
              />
            </Box>

            <ManagedAutocomplete
              category="REPORTERS"
              label="Reporter Name"
              fullWidth
              required
              freeSolo
              value={formData.reporter}
              onChange={(val) => handleChange({ target: { name: 'reporter', value: val } })}
              disabled={!isAdmin}
              sx={{ ...textFieldStyles, mb: 2 }}
            />

            <TextField
              fullWidth
              label="Reporter Note"
              name="reporterNote"
              value={formData.reporterNote}
              onChange={handleChange}
              multiline
              rows={2}
              dir="rtl"
              disabled={!isAdmin}
              sx={{ ...textFieldStyles, mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <ManagedAutocomplete
                category="CONTACT_METHOD"
                label="Contact Method"
                fullWidth
                required
                freeSolo
                value={formData.contactMethod}
                onChange={(val) => handleChange({ target: { name: 'contactMethod', value: val } })}
                disabled={!isAdmin}
                sx={{ ...textFieldStyles }}
              />
              <Tooltip title="Use Reporter Name as Contact Method">
                <Button
                  onClick={() => handleChange({ target: { name: 'contactMethod', value: formData.reporter } })}
                  disabled={!isAdmin || !formData.reporter}
                  variant="outlined"
                  size="small"
                  sx={{
                    mt: 1,
                    minWidth: '100px',
                    borderColor: '#3d3d3d',
                    color: '#7b68ee',
                    fontSize: '0.65rem',
                    textTransform: 'none',
                    '&:hover': { borderColor: '#7b68ee', backgroundColor: alpha('#7b68ee', 0.05) }
                  }}
                >
                  Use Reporter
                </Button>
              </Tooltip>
            </Box>
          </Box>

          {/* Team/Company Assignment Block */}
          <Box sx={{ border: '1px solid #3d3d3d', borderRadius: 2, p: 2, mb: 1 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ color: '#7b68ee', mb: 2 }}>Team Assignment</Typography>

            <ManagedAutocomplete
              category="TEAM_COMPANY"
              label="Team/Company"
              fullWidth
              required
              value={formData.teamCompany}
              onChange={(val) => handleChange({ target: { name: 'teamCompany', value: val } })}
              disabled={!isAdmin}
              sx={{ ...textFieldStyles, mb: 2 }}
            />

            <ManagedAutocomplete
              category="FIELD_TEAMS"
              label="Assigned To"
              fullWidth
              required
              freeSolo
              value={formData.assignedTo}
              onChange={(val) => handleChange({ target: { name: 'assignedTo', value: val } })}
              disabled={!isAdmin}
              sx={{ ...textFieldStyles, mb: 2 }}
            />

            <ManagedAutocomplete
              category="FIELD_TEAMS"
              label="Installing Team"
              fullWidth
              freeSolo
              value={formData.installingTeam}
              onChange={(val) => handleChange({ target: { name: 'installingTeam', value: val } })}
              disabled={!isAdmin}
              sx={{ ...textFieldStyles, mb: 2 }}
            />

            <TextField
              fullWidth
              label="Assignee Note"
              name="assigneeNote"
              value={formData.assigneeNote}
              onChange={handleChange}
              multiline
              rows={2}
              placeholder="e.g., Called customer, appointment scheduled for..."
              disabled={!isAdmin}
              sx={textFieldStyles}
            />
          </Box>

          {/* Issues Block */}
          <Box sx={{ border: '1px solid #3d3d3d', borderRadius: 2, p: 2, mb: 1 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ color: '#7b68ee' }}>Issues</Typography>
            {formData.issues.map((issue, index) => (
              <Grid container spacing={2} key={index} alignItems="center" sx={{ mb: 2 }}>
                <Grid item xs={11}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <ManagedAutocomplete
                        category="ISSUE_CATEGORY"
                        label={`Category ${index + 1}`}
                        fullWidth
                        required
                        freeSolo
                        value={issue.category}
                        onChange={(val) => handleIssueChange(index, 'category', val)}
                        disabled={!isAdmin}
                        sx={{ ...textFieldStyles }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <ManagedAutocomplete
                        category="ISSUE_SUB_CATEGORY"
                        label={`Sub Category ${index + 1}`}
                        fullWidth
                        freeSolo
                        value={issue.subCategory}
                        onChange={(val) => handleIssueChange(index, 'subCategory', val)}
                        disabled={!isAdmin}
                        sx={{ ...textFieldStyles }}
                      />
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={1}>
                  <IconButton onClick={() => removeIssueRow(index)} disabled={formData.issues.length === 1 || !isAdmin}>
                    <MdDelete color="#f44336" />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            <Button startIcon={<MdAdd />} onClick={addIssueRow} disabled={!isAdmin} sx={{ color: '#7b68ee' }}>
              Add Another Issue
            </Button>
          </Box>

          {/* Closure Block */}
          <Box sx={{ border: '1px solid #3d3d3d', borderRadius: 2, p: 2, mb: 1 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ color: '#7b68ee', mb: 2 }}>Closure</Typography>

            <FormControl fullWidth sx={{ ...formControlStyles, mb: 2 }}>
              <InputLabel sx={inputLabelStyles}>Dispatched</InputLabel>
              <Select
                name="dispatched"
                value={formData.dispatched || 'no'}
                label="Dispatched"
                onChange={handleChange}
                disabled={!isAdmin}
                sx={selectStyles}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: '#2d2d2d',
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

            {formData.dispatched === 'yes' && (
              <TextField
                fullWidth
                label="Dispatched Date"
                type="date"
                name="dispatchedAt"
                value={formData.dispatchedAt || ''}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                disabled={!isAdmin}
                sx={{ ...textFieldStyles, mb: 2 }}
              />
            )}

            <ManagedAutocomplete
              category="CIN_SUPERVISORS"
              label="Supervisor"
              fullWidth
              freeSolo
              value={formData.closedBy || ''}
              onChange={(val) => handleChange({ target: { name: 'closedBy', value: val } })}
              disabled={!isAdmin}
              sx={{ ...textFieldStyles }}
            />
          </Box>

          {/* Status Block */}
          <Box sx={{ border: '1px solid #3d3d3d', borderRadius: 2, p: 2, mb: 1 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ color: '#7b68ee', mb: 2 }}>Status</Typography>

            <FormControl fullWidth required sx={{ ...formControlStyles, mb: 2 }}>
              <InputLabel sx={inputLabelStyles}>Status</InputLabel>
              <Select
                name="solved"
                value={formData.solved}
                label="Status"
                onChange={handleChange}
                disabled={!isAdmin}
                sx={selectStyles}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: '#2d2d2d',
                      color: '#ffffff',
                      '& .MuiMenuItem-root': menuItemStyles,
                    },
                  },
                }}
              >
                <MenuItem value="yes" sx={menuItemStyles}>Closed</MenuItem>
                <MenuItem value="no" sx={menuItemStyles}>Open</MenuItem>
              </Select>
            </FormControl>

            {formData.solved === 'yes' && (
              <>
                <FormControl fullWidth sx={{ ...formControlStyles, mb: 2 }}>
                  <InputLabel sx={inputLabelStyles}>Resolution Method</InputLabel>
                  <Select
                    name="resolvedBy"
                    value={formData.resolvedBy}
                    label="Resolution Method"
                    onChange={handleChange}
                    disabled={!isAdmin}
                    sx={selectStyles}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          backgroundColor: '#2d2d2d',
                          color: '#ffffff',
                          '& .MuiMenuItem-root': menuItemStyles,
                        },
                      },
                    }}
                  >
                    <MenuItem value="" sx={menuItemStyles}>Not Specified</MenuItem>
                    <MenuItem value="Phone" sx={menuItemStyles}>Phone</MenuItem>
                    <MenuItem value="Visit" sx={menuItemStyles}>Visit</MenuItem>
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
                  dir="rtl"
                  disabled={!isAdmin}
                  sx={{ ...textFieldStyles, mb: 2 }}
                />
              </>
            )}

            {formData.solved === 'yes' && (
              <TextField
                fullWidth
                label="Close Date"
                type="date"
                name="closedAt"
                value={formData.closedAt || ''}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                disabled={!isAdmin}
                sx={{ ...textFieldStyles }}
              />
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{
        backgroundColor: '#2d2d2d',
        borderTop: '1px solid #e5e7eb',
        padding: '12px 24px',
        justifyContent: 'space-between' // Ensure space between reset and other buttons
      }}>
        <Button
          onClick={handleReset}
          sx={resetButtonStyle}
          disabled={!isAdmin}
        >
          Reset Form
        </Button>
        <Box>
          <Button
            onClick={handleClose}
            sx={{ ...cancelButtonStyles, mr: 1 }}
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
        </Box>
      </DialogActions>
      <CustomerIssueLogTerminal
        open={openLogTerminal}
        onClose={() => setOpenLogTerminal(false)}
        slidFilter={formData.slid}
      />

      {/* Duplicate Issue Warning Dialog */}
      <Dialog
        open={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: '#1e1e1e', // Darker background for warning
            color: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #f59e0b', // Amber warning border
          }
        }}
      >
        <DialogTitle sx={{
          backgroundColor: 'rgba(245, 158, 11, 0.15)', // Amber tint
          color: '#f59e0b',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid rgba(245, 158, 11, 0.3)'
        }}>
          <MdHistory size={24} />
          <Typography variant="h6" fontWeight="bold">
            Existing Issue(s) Found
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 3 }}>
            This SLID <strong>({formData.slid})</strong> already exists in the database. Please review the details below before proceeding to avoid creating duplicates.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {duplicateIssues.map((issue, index) => (
              <Box key={issue._id || index} sx={{
                p: 2,
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="#b3b3b3">Reported Date</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {issue.date ? new Date(issue.date).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="#b3b3b3">Reporter</Typography>
                    <Typography variant="body2" fontWeight="bold">{issue.reporter}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="#b3b3b3">Assigned To</Typography>
                    <Typography variant="body2" fontWeight="bold">{issue.assignedTo}</Typography>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="#b3b3b3">Customer Name</Typography>
                    <Typography variant="body2">{issue.customerName || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="#b3b3b3">Status</Typography>
                    <Typography variant="body2" sx={{
                      color: issue.solved === 'yes' ? '#4caf50' : '#f44336',
                      fontWeight: 'bold',
                      textTransform: 'capitalize'
                    }}>
                      {issue.solved === 'yes' ? 'Closed' : 'Open'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="#b3b3b3">Category</Typography>
                    <Typography variant="body2">
                      {issue.issues?.[0]?.category || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Button
            onClick={() => setDuplicateDialogOpen(false)}
            variant="contained"
            sx={{
              backgroundColor: '#f59e0b',
              color: '#000',
              fontWeight: 'bold',
              '&:hover': { backgroundColor: '#d97706' }
            }}
          >
            Acknowledge & Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default CustomerIssueDialog;
