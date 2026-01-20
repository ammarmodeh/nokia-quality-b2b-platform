import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Accordion,
  TextField,
  IconButton,
  InputAdornment,
  Stack,
  Chip,
  CircularProgress,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Switch
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SaveIcon from '@mui/icons-material/Save';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Snackbar, Alert, Tooltip } from '@mui/material';

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5001"}/api/audit`;

const AuditTaskInspection = () => {
  const { slid } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Slid Verification State
  const [openSubmitDialog, setOpenSubmitDialog] = useState(false);
  const [verificationSlid, setVerificationSlid] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Filtered Checklist logic
  const filteredChecklist = task ? task.checklist.map((item, originalIndex) => ({ ...item, originalIndex }))
    .filter(item => {
      const matchesSearch = item.checkpointName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    }) : [];

  const totalPages = Math.ceil(filteredChecklist.length / 10);
  const displayItems = filteredChecklist.slice(page * 10, (page + 1) * 10);

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
  }, [searchQuery, statusFilter]);

  const getAuthHeader = () => {
    const userStr = localStorage.getItem('auditUser');
    let token = userStr ? JSON.parse(userStr).token : null;

    // Fallback to main dashboard token for Admin bypass
    if (!token || token === "undefined" || token === "null") {
      token = localStorage.getItem('accessToken');
    }

    return (token && token !== "undefined" && token !== "null") ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/tasks/${slid}`, getAuthHeader());
        setTask(data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch task", error);
        setLoading(false);
      }
    };
    fetchTask();
  }, [slid]);

  const handleChecklistChange = (index, field, value) => {
    const updatedChecklist = [...task.checklist];
    updatedChecklist[index][field] = value;
    setTask({ ...task, checklist: updatedChecklist });
  };

  const handlePhotoUpload = async (event, checkpointName) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('checkpointName', checkpointName);
        formData.append('description', file.name); // Use filename as description

        const { data } = await axios.post(`${API_URL}/tasks/${task._id}/photo`, formData, {
          ...getAuthHeader().headers ? { headers: { ...getAuthHeader().headers, 'Content-Type': 'multipart/form-data' } } : {}
        });
        setTask(prev => ({ ...data, checklist: prev.checklist })); // Preserve local checklist state
      }
    } catch (error) {
      console.error("Photo upload failed", error);
      alert("Upload failed partially or fully");
    } finally {
      setUploading(false);
      event.target.value = null; // Clear input
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm("Are you sure you want to remove this photo?")) return;
    try {
      const { data } = await axios.delete(`${API_URL}/tasks/${task._id}/photo/${photoId}`, getAuthHeader());
      setTask(prev => ({ ...data, checklist: prev.checklist })); // Preserve local checklist state
    } catch (error) {
      console.error("Failed to delete photo", error);
      alert("Delete failed");
    }
  };

  const handleSave = async () => {
    try {
      await axios.put(`${API_URL}/tasks/${task._id}/checklist`, { checklist: task.checklist }, getAuthHeader());
      alert("Progress saved!");
    } catch (error) {
      console.error("Save failed", error);
    }
  };

  const initiateSubmit = () => {
    // Note: Pending items are now considered "OK" as per user request
    setOpenSubmitDialog(true);
    setSubmitError("");
    setVerificationSlid("");
  };

  // Copy individual N.OK item
  const handleCopyItem = (item) => {
    const text = `❌ ${item.checkpointName}\nNotes: ${item.notes || 'No notes'}\nSLID: ${task.slid}`;
    navigator.clipboard.writeText(text).then(() => {
      setSnackbar({ open: true, message: 'Item copied to clipboard!', severity: 'success' });
    }).catch(() => {
      setSnackbar({ open: true, message: 'Failed to copy', severity: 'error' });
    });
  };

  // Copy all N.OK items
  const handleCopyAllNOK = () => {
    const nokItems = task.checklist.filter(item => item.status === 'N.OK');
    if (nokItems.length === 0) {
      setSnackbar({ open: true, message: 'No N.OK items to copy', severity: 'info' });
      return;
    }

    const scheduledDate = task.scheduledDate ? new Date(task.scheduledDate).toLocaleDateString() : 'N/A';
    const location = task.siteDetails?.TOWN || task.siteDetails?.Governorate || 'Unknown';

    let text = `🚨 AUDIT ISSUES - SLID: ${task.slid}\n`;
    text += `Site: ${location}\n`;
    text += `Date: ${scheduledDate}\n\n`;

    nokItems.forEach((item, index) => {
      text += `❌ ${item.checkpointName}\n`;
      text += `Notes: ${item.notes || 'No notes'}\n`;
      if (index < nokItems.length - 1) text += '\n';
    });

    text += `\nTotal Issues: ${nokItems.length}`;

    navigator.clipboard.writeText(text).then(() => {
      setSnackbar({ open: true, message: `Copied ${nokItems.length} N.OK items!`, severity: 'success' });
    }).catch(() => {
      setSnackbar({ open: true, message: 'Failed to copy', severity: 'error' });
    });
  };

  const confirmSubmit = async () => {
    if (verificationSlid.trim() !== task.slid.trim()) {
      setSubmitError("SLID does not match! Please verify you are inspecting the correct site.");
      return;
    }

    try {
      await axios.put(`${API_URL}/tasks/${task._id}/submit`, { processSlid: verificationSlid, checklist: task.checklist }, getAuthHeader());
      alert("Audit submitted successfully!");
      navigate('/audit/tasks');
    } catch (error) {
      setSubmitError(error.response?.data?.message || "Submission failed");
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (!task) return <Typography>Task not found</Typography>;

  return (
    <Box sx={{ pb: 12 }}>
      <Paper sx={{ p: 2, mb: 3, background: 'linear-gradient(135deg, #001f3f 0%, #001122 100%)', color: 'white', borderRadius: 0, border: 'none' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <IconButton onClick={() => navigate('/audit/tasks')} sx={{ color: 'white', mr: 1, p: 0 }}>
            {/* want back icon from material ui */}
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="overline" color="secondary.light">Audit Inspection</Typography>
        </Box>
        <Typography variant="h5" fontWeight="bold">SLID: {task.slid}</Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          {task.siteDetails?.TOWN || task.siteDetails?.town || 'Unknown Town'}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {task.checklist.filter(i => i.status !== 'Pending').length} / {task.checklist.length} Checkpoints Completed
          </Typography>
        </Box>
      </Paper>

      <Accordion defaultExpanded sx={{ mb: 3, boxShadow: 'none', borderRadius: 0, '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="bold" color="primary">Site Details</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {Object.entries(task.siteDetails || {}).map(([key, value]) => (
              key !== "_id" && key !== "id" && key !== "__v" && (
                <Grid item xs={6} key={key}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600 }}>{key}</Typography>
                  <Typography variant="body2">{String(value)}</Typography>
                </Grid>
              )
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search checkpoints..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 2, bgcolor: 'background.paper', borderRadius: 0 }}
          InputProps={{
            sx: { borderRadius: 0 },
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
          {["All", "Pending", "OK", "N.OK", "N/A"].map((status) => (
            <Chip
              key={status}
              label={status}
              clickable
              color={statusFilter === status ? "primary" : "default"}
              variant={statusFilter === status ? "filled" : "outlined"}
              onClick={() => setStatusFilter(status)}
              sx={{ fontWeight: '500' }}
            />
          ))}
        </Stack>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Checklist
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Showing {filteredChecklist.length} results (Page {page + 1} of {Math.max(1, totalPages)})
          </Typography>

          {/* Remote Service Assessment Toggle */}
          {task.checklist.some(i => i.checkpointName === "Reported Speed Verification") && (
            <FormControlLabel
              control={
                <Switch
                  checked={!task.checklist.some(i => i.checkpointName === "Reported Speed Verification" && i.status === "N/A")}
                  onChange={(e) => {
                    const shouldEnable = e.target.checked;
                    const remoteItems = [
                      "Wi-Fi Coverage Evaluation",
                      "Reported Speed Verification",
                      "Wi-Fi Frequency Explanation (2.4GHz vs 5GHz)",
                      "Internet-Based Applications (e.g., IPTV, VPN, ....)",
                      "Service Rating Instructions",
                      "Post-Service Follow-Up Instructions"
                    ];

                    const updatedChecklist = task.checklist.map(item => {
                      if (remoteItems.includes(item.checkpointName)) {
                        return { ...item, status: shouldEnable ? "Pending" : "N/A", notes: shouldEnable ? item.notes : "Skipped: Remote Assessment not performed" };
                      }
                      return item;
                    });
                    setTask({ ...task, checklist: updatedChecklist });
                  }}
                  color="primary"
                />
              }
              label={<Typography variant="body2" fontWeight="bold">Include Remote Service Assessment</Typography>}
              sx={{ border: '1px solid rgba(255,255,255,0.1)', pr: 2, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.02)' }}
            />
          )}

          {task.checklist.filter(item => item.status === 'N.OK').length > 0 && (
            <Tooltip title="Copy all N.OK items to clipboard">
              <Button
                size="small"
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyAllNOK}
                sx={{ borderRadius: 0, textTransform: 'none' }}
              >
                Copy All N.OK ({task.checklist.filter(item => item.status === 'N.OK').length})
              </Button>
            </Tooltip>
          )}
        </Box>
      </Box>

      {displayItems.length > 0 ? (
        displayItems.map((item) => (
          <Paper key={item.originalIndex} sx={{ p: 2.5, mb: 2, borderRadius: 0, borderLeft: item.status === 'Pending' ? '4px solid #777' : item.status === 'OK' ? '4px solid #2e7d32' : '4px solid #d32f2f' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="600">{item.checkpointName}</Typography>
              {item.status === 'N.OK' && (
                <Tooltip title="Copy this item to clipboard">
                  <IconButton
                    size="small"
                    onClick={() => handleCopyItem(item)}
                    sx={{ borderRadius: 0 }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                row
                value={item.status}
                onChange={(e) => handleChecklistChange(item.originalIndex, "status", e.target.value)}
                sx={{ justifyContent: 'space-between' }}
              >
                <FormControlLabel value="OK" control={<Radio color="success" />} label="OK" />
                <FormControlLabel value="N.OK" control={<Radio color="error" />} label="N.OK" />
                <FormControlLabel value="N/A" control={<Radio color="default" />} label="N/A" />
              </RadioGroup>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Add observation/details..."
              value={item.notes || ""}
              onChange={(e) => handleChecklistChange(item.originalIndex, "notes", e.target.value)}
              sx={{ mt: 1, mb: 1, bgcolor: 'background.paper' }}
            />

            {/* Photo & Evidence Section - Always show if photos exist, or show upload button if N.OK */}
            {(item.status === 'N.OK' || task.photos.some(p => p.checkpointName === item.checkpointName)) && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                {item.status === 'N.OK' && (
                  <Button
                    variant="contained"
                    component="label"
                    color="primary"
                    startIcon={<PhotoCameraIcon />}
                    fullWidth
                    disabled={uploading}
                    sx={{ mb: 2, py: 1, fontWeight: 'bold' }}
                  >
                    {uploading ? "Uploading..." : "Upload Evidence"}
                    <input
                      type="file"
                      hidden
                      multiple
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoUpload(e, item.checkpointName)}
                    />
                  </Button>
                )}

                <Grid container spacing={1}>
                  {task.photos.filter(p => p.checkpointName === item.checkpointName).map((photo, pIdx) => (
                    <Grid item xs={12} sm={6} key={pIdx}>
                      <Box sx={{ position: 'relative', borderRadius: 0, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                        <img
                          src={`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5001"}${photo.url}`}
                          alt="evidence"
                          style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleDeletePhoto(photo._id)}
                          sx={{
                            position: 'absolute', top: 5, right: 5,
                            borderRadius: 0,
                            bgcolor: 'rgba(211, 47, 47, 0.8)', color: 'white',
                            '&:hover': { bgcolor: 'error.main' }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        <Box sx={{ p: 0.5, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', textAlign: 'center' }}>
                          <Typography variant="caption">{new Date(photo.uploadedAt).toLocaleTimeString()}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Paper>
        ))
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center', opacity: 0.6 }}>
          <Typography>No checkpoints match your filters</Typography>
        </Paper>
      )}

      <Paper
        elevation={6}
        sx={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          p: 2, display: 'flex', gap: 1, justifyContent: 'space-between',
          zIndex: 1000, bgcolor: 'background.paper',
          borderRadius: 0,
          borderTop: '1px solid', borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            variant="outlined"
            size="small"
          >
            Back
          </Button>

          <Typography variant="body2" sx={{ fontWeight: '600', px: 1, minWidth: '80px', textAlign: 'center' }}>
            {page + 1} / {Math.max(1, totalPages)}
          </Typography>

          {page < totalPages - 1 && (
            <Button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setPage(p => p + 1);
              }}
              variant="contained"
              size="small"
            >
              Next
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<SaveIcon />} onClick={handleSave} size="small">
            Save
          </Button>
          <Button variant="contained" startIcon={<CheckCircleIcon />} onClick={initiateSubmit} color="success" size="small">
            Submit
          </Button>
        </Box>
      </Paper>

      {/* Validation Dialog */}
      <Dialog open={openSubmitDialog} onClose={() => setOpenSubmitDialog(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" /> Verify Site Link ID
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            To ensure you are inspecting the correct site, please re-enter the SLID found on-site or in your work order.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="slid-verify"
            label="Enter SLID to Validate"
            fullWidth
            variant="outlined"
            value={verificationSlid}
            onChange={(e) => setVerificationSlid(e.target.value)}
            error={!!submitError}
            helperText={submitError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSubmitDialog(false)}>Cancel</Button>
          <Button onClick={confirmSubmit} variant="contained" color="primary">
            Verify & Close Task
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for copy feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 0 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

    </Box>
  );
};

export default AuditTaskInspection;
