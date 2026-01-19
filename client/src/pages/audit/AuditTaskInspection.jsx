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
  AccordionSummary,
  AccordionDetails,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SaveIcon from '@mui/icons-material/Save';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

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

  const getAuthHeader = () => {
    const userStr = localStorage.getItem('auditUser');
    const token = userStr ? JSON.parse(userStr).token : null;
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
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
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('checkpointName', checkpointName);
    formData.append('description', `Photo for ${checkpointName}`);

    setUploading(true);
    try {
      const { data } = await axios.post(`${API_URL}/tasks/${task._id}/photo`, formData, {
        ...getAuthHeader().headers ? { headers: { ...getAuthHeader().headers, 'Content-Type': 'multipart/form-data' } } : {}
      });
      setTask({ ...task, photos: data.photos });
    } catch (error) {
      console.error("Photo upload failed", error);
      alert("Upload failed");
    } finally {
      setUploading(false);
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
    const pendingItems = task.checklist.some(item => item.status === 'Pending');
    if (pendingItems) {
      alert("Please complete all checklist items before submitting.");
      return;
    }
    setOpenSubmitDialog(true);
    setSubmitError("");
    setVerificationSlid("");
  };

  const confirmSubmit = async () => {
    if (verificationSlid.trim() !== task.slid.trim()) {
      setSubmitError("SLID does not match! Please verify you are inspecting the correct site.");
      return;
    }

    try {
      await axios.put(`${API_URL}/tasks/${task._id}/submit`, { processSlid: verificationSlid }, getAuthHeader());
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
      <Paper sx={{ p: 2, mb: 3, background: 'linear-gradient(135deg, #0a2342 0%, #1c3b65 100%)', color: 'white' }}>
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

      <Accordion defaultExpanded sx={{ mb: 3, boxShadow: 1 }}>
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

      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        Checklist (Page {page + 1} of {Math.ceil(task.checklist.length / 10)})
      </Typography>

      {task.checklist.slice(page * 10, (page + 1) * 10).map((item, i) => {
        const globalIndex = page * 10 + i;
        return (
          <Paper key={globalIndex} sx={{ p: 2.5, mb: 2, borderRadius: 3, borderLeft: item.status === 'Pending' ? '4px solid #aaa' : item.status === 'OK' ? '4px solid #2e7d32' : '4px solid #d32f2f' }}>
            <Typography variant="subtitle1" fontWeight="600" gutterBottom>{item.checkpointName}</Typography>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                row
                value={item.status}
                onChange={(e) => handleChecklistChange(globalIndex, "status", e.target.value)}
                sx={{ justifyContent: 'space-between' }}
              >
                <FormControlLabel value="OK" control={<Radio color="success" />} label="OK" />
                <FormControlLabel value="N.OK" control={<Radio color="error" />} label="N.OK" />
                <FormControlLabel value="N/A" control={<Radio color="default" />} label="N/A" />
              </RadioGroup>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              label="Notes / Remarks"
              variant="outlined"
              value={item.notes || ""}
              onChange={(e) => handleChecklistChange(globalIndex, "notes", e.target.value)}
              sx={{ mt: 1, mb: 1, bgcolor: 'background.paper' }}
            />

            {item.status === 'N.OK' && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'error.main', opacity: 0.9, borderRadius: 2, border: '1px dashed', borderColor: 'error.light' }}>
                <Button
                  variant="outlined"
                  component="label"
                  color="error"
                  startIcon={<PhotoCameraIcon />}
                  fullWidth
                  disabled={uploading}
                  sx={{ mb: 1 }}
                >
                  {uploading ? "Uploading..." : "Upload Evidence"}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handlePhotoUpload(e, item.checkpointName)}
                  />
                </Button>

                {task.photos.filter(p => p.checkpointName === item.checkpointName).map((photo, pIdx) => (
                  <Box key={pIdx} sx={{ mt: 1, position: 'relative' }}>
                    <img
                      src={`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5001"}${photo.url}`}
                      alt="evidence"
                      style={{ width: '100%', borderRadius: '8px', maxHeight: '200px', objectFit: 'cover' }}
                    />
                    <Typography variant="caption" display="block" color="text.secondary">Uploaded: {new Date(photo.uploadedAt).toLocaleTimeString()}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        );
      })}

      <Paper
        elevation={6}
        sx={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          p: 2, display: 'flex', gap: 2, justifyContent: 'space-between',
          zIndex: 1000, bgcolor: 'background.paper'
        }}
      >
        <Button
          disabled={page === 0}
          onClick={() => setPage(p => p - 1)}
          variant="outlined"
        >
          Back
        </Button>

        {page < Math.ceil(task.checklist.length / 10) - 1 ? (
          <Button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setPage(p => p + 1);
            }}
            variant="contained"
          >
            Next
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<SaveIcon />} onClick={handleSave}>
              Save
            </Button>
            <Button variant="contained" startIcon={<CheckCircleIcon />} onClick={initiateSubmit}>
              Submit
            </Button>
          </Box>
        )}
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

    </Box>
  );
};

export default AuditTaskInspection;
