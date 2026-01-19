import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  TextField,
  InputAdornment,
  Container,
  Paper,
  Avatar,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PlaceIcon from '@mui/icons-material/Place';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';


const AuditorDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [tabIndex, setTabIndex] = useState(0); // 0: Tasks, 1: Performance

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }); // Default to Today (Local)

  // Confirm/Report Dialogs
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null);



  const navigate = useNavigate();

  const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5001"}/api/audit`;

  // Fetch Tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const userStr = localStorage.getItem('auditUser');
        const token = userStr ? JSON.parse(userStr).token : null;
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

        // Pass date filter to backend for scheduledDate filtering
        const url = `${API_URL}/my-tasks${dateFilter ? `?date=${dateFilter}` : ''}`;
        const { data } = await axios.get(url, config);
        setTasks(data);
        setFilteredTasks(data);
      } catch (error) {
        console.error("Failed to fetch tasks", error);
      }
    };
    fetchTasks();
  }, [dateFilter]); // Refetch when date changes

  // Filter Logic (Client-side for Search/Status only)
  useEffect(() => {
    let result = tasks;

    // Search
    if (searchTerm) {
      result = result.filter(t => t.slid.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Status Filter
    if (statusFilter !== 'All') {
      result = result.filter(t => t.status === statusFilter);
    }

    setFilteredTasks(result);
  }, [tasks, searchTerm, statusFilter]);


  // Handlers
  const handleTaskClick = (task) => {
    if (task.status === 'Submitted' || task.status === 'Approved') {
      setSelectedTask(task);
      setChoiceOpen(true);
    } else {
      setTaskToEdit(task);
      setConfirmOpen(true);
    }
  };

  const handleActionChoice = (action) => {
    setChoiceOpen(false);
    if (action === 'view') {
      setReportOpen(true);
    } else if (action === 'edit') {
      navigate(`/audit/tasks/${selectedTask.slid}`);
    }
  };


  const handleConfirmEdit = () => {
    if (taskToEdit) {
      navigate(`/audit/tasks/${taskToEdit.slid}`);
    }
    setConfirmOpen(false);
  };

  const handleDateChange = (days) => {
    const current = new Date(dateFilter);
    current.setDate(current.getDate() + days);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    setDateFilter(`${year}-${month}-${day}`);
  };

  const handleDownloadAll = async () => {
    if (!selectedTask || !selectedTask.photos || selectedTask.photos.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder(`Evidence_${selectedTask.slid}`);

    // SLID-[the check point]-[auditor]-[scheduled date]
    const auditorName = selectedTask.auditor?.name || "Auditor";
    const scheduledDate = selectedTask.scheduledDate ? new Date(selectedTask.scheduledDate).toISOString().split('T')[0] : "NoDate";

    const downloadPromises = selectedTask.photos.map(async (photo) => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5001"}${photo.url}`);
        const blob = await response.blob();
        const extension = photo.url.split('.').pop().split(/\#|\?/)[0] || 'jpg';
        const fileName = `${selectedTask.slid}-${photo.checkpointName}-${auditorName}-${scheduledDate}.${extension}`;
        folder.file(fileName, blob);
      } catch (err) {
        console.error("Failed to download image", photo.url, err);
      }
    });

    await Promise.all(downloadPromises);
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `Reach_Audit_Evidence_${selectedTask.slid}.zip`);
  };



  // Stats Calcs
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'Submitted').length,
    pending: tasks.filter(t => t.status !== 'Submitted').length,
    completionRate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'Submitted').length / tasks.length) * 100) : 0
  };

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>Auditor Workspace</Typography>
      </Box>

      {/* Main Tabs */}
      <Paper sx={{ mb: 4 }}>
        <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} centered textColor="primary" indicatorColor="primary">
          <Tab label="My Tasks" icon={<AssignmentIcon />} iconPosition="start" />
          <Tab label="My Performance" icon={<AssessmentIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* TASKS TAB */}
      {tabIndex === 0 && (
        <Box>
          {/* Filters Bar */}
          <Paper sx={{ p: 2, mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', bgcolor: 'background.subtle', borderRadius: 1, px: 2 }}>
              <SearchIcon color="action" />
              <TextField
                fullWidth placeholder="Search by SLID..." variant="standard"
                InputProps={{ disableUnderline: true }}
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Box>
            <TextField
              select
              label="Status"
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              SelectProps={{ native: true }}
              sx={{ minWidth: 150 }}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Submitted">Submitted</option>
            </TextField>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={() => handleDateChange(-1)} size="small" sx={{ color: 'primary.main', bgcolor: 'rgba(62, 166, 255, 0.05)', '&:hover': { bgcolor: 'rgba(62, 166, 255, 0.15)' } }}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <TextField
                type="date"
                label="Date"
                size="small"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150 }}
              />
              <IconButton onClick={() => handleDateChange(1)} size="small" sx={{ color: 'primary.main', bgcolor: 'rgba(62, 166, 255, 0.05)', '&:hover': { bgcolor: 'rgba(62, 166, 255, 0.15)' } }}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>


          </Paper>

          {/* Task Grid */}
          <Grid container spacing={3}>
            {filteredTasks.map((task) => (
              <Grid item xs={12} sm={6} md={4} key={task._id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  <Box sx={{
                    position: 'absolute', top: 0, left: 0, width: '6px', height: '100%',
                    bgcolor: task.status === 'Submitted' ? 'success.main' : 'warning.main'
                  }} />
                  <CardActionArea onClick={() => handleTaskClick(task)} sx={{ flexGrow: 1 }}>
                    <CardContent sx={{ pl: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Chip
                          label={task.status}
                          color={task.status === 'Submitted' ? 'success' : 'warning'}
                          size="small"
                        />
                      </Box>

                      <Typography variant="h5" fontWeight="bold" gutterBottom>{task.slid}</Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <PlaceIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {task.siteDetails?.TOWN || 'Location N/A'}
                        </Typography>
                      </Box>

                      {/* Detailed Dates */}
                      <Box sx={{ bgcolor: 'action.hover', p: 1, borderRadius: 1 }}>
                        <Typography variant="caption" display="block" color="text.secondary">
                          <strong>Created:</strong> {new Date(task.createdAt).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" display="block" color="primary">
                          <strong>Scheduled:</strong> {task.scheduledDate ? new Date(task.scheduledDate).toLocaleDateString() : 'Immediate'}
                        </Typography>
                        {task.status === 'Submitted' && (
                          <Typography variant="caption" display="block" color="success.main">
                            <strong>Submitted:</strong> {new Date(task.updatedAt).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>

                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
            {filteredTasks.length === 0 && (
              <Box sx={{ width: '100%', textAlign: 'center', mt: 4, opacity: 0.6 }}>
                <Typography variant="h6">No tasks match your filters.</Typography>
              </Box>
            )}
          </Grid>
        </Box>
      )}

      {/* STATS TAB */}
      {/* STATS TAB */}
      {tabIndex === 1 && (
        <Box>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Global Compliance Score */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center', borderTop: '4px solid #9c27b0', height: '100%' }}>
                <Typography variant="h3" color="secondary.main">
                  {(() => {
                    const submitted = tasks.filter(t => t.status === 'Submitted');
                    if (submitted.length === 0) return "0%";
                    let totalChecks = 0;
                    let totalOK = 0;
                    submitted.forEach(t => {
                      if (t.checklist) {
                        totalChecks += t.checklist.length;
                        totalOK += t.checklist.filter(c => c.status === 'OK').length;
                      }
                    });
                    return totalChecks > 0 ? Math.round((totalOK / totalChecks) * 100) + "%" : "0%";
                  })()}
                </Typography>
                <Typography color="text.secondary">Global Compliance Rate</Typography>
              </Paper>
            </Grid>

            {/* Total Issues Found */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center', borderTop: '4px solid #f44336', height: '100%' }}>
                <Typography variant="h3" color="error.main">
                  {(() => {
                    const submitted = tasks.filter(t => t.status === 'Submitted');
                    let totalIssues = 0;
                    submitted.forEach(t => {
                      if (t.checklist) {
                        totalIssues += t.checklist.filter(c => c.status === 'N.OK').length;
                      }
                    });
                    return totalIssues;
                  })()}
                </Typography>
                <Typography color="text.secondary">Total Issues Identified</Typography>
              </Paper>
            </Grid>

            {/* Completed Reviews */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center', borderTop: '4px solid #2e7d32', height: '100%' }}>
                <Typography variant="h3" color="success.main">{stats.completed}</Typography>
                <Typography color="text.secondary">Audits Completed</Typography>
              </Paper>
            </Grid>

            {/* Completion Rate */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center', borderTop: '4px solid #ed6c02', height: '100%' }}>
                <Typography variant="h3" color="warning.main">{stats.completionRate}%</Typography>
                <Typography color="text.secondary">Assignment Completion</Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Recent Activity Section */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>Recent Activity History</Typography>
          <Paper sx={{ width: '100%', overflow: 'hidden', bgcolor: 'transparent', boxShadow: 'none' }}>
            <Grid container spacing={2}>
              {tasks.filter(t => t.status === 'Submitted').sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5).map((task) => {
                // Calc score for this specific task
                const checks = task.checklist || [];
                const ok = checks.filter(c => c.status === 'OK').length;
                const score = checks.length > 0 ? Math.round((ok / checks.length) * 100) : 0;
                const issues = checks.filter(c => c.status === 'N.OK').length;

                return (
                  <Grid item xs={12} key={task._id}>
                    <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <AssignmentIcon color={score > 85 ? "success" : score > 50 ? "warning" : "error"} />
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">{task.slid}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(task.updatedAt).toLocaleDateString()} • {task.siteDetails?.TOWN || 'Unknown'}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 3, textAlign: 'right' }}>
                        <Box>
                          <Typography variant="h6" color={score > 85 ? "success.main" : "warning.main"}>{score}%</Typography>
                          <Typography variant="caption" color="text.secondary">Score</Typography>
                        </Box>
                        <Box>
                          <Typography variant="h6" color="error.main">{issues}</Typography>
                          <Typography variant="caption" color="text.secondary">Issues</Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
              {tasks.filter(t => t.status === 'Submitted').length === 0 && (
                <Grid item xs={12}><Typography align="center" color="text.secondary">No submitted audits yet.</Typography></Grid>
              )}
            </Grid>
          </Paper>
        </Box>
      )}

      {/* Edit Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Start Inspection?</DialogTitle>
        <DialogContent>
          <Typography>
            You are about to edit task <b>{taskToEdit?.slid}</b>.
            Ensure you are at the correct site before proceeding.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmEdit} variant="contained" autoFocus>
            Yes, Start Audit
          </Button>
        </DialogActions>
      </Dialog>


      {/* Action Choice Dialog */}
      <Dialog open={choiceOpen} onClose={() => setChoiceOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Task Options</DialogTitle>
        <DialogContent>
          <Typography align="center" sx={{ mb: 2 }}>
            What would you like to do with task <b>{selectedTask?.slid}</b>?
          </Typography>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<VisibilityIcon />}
              onClick={() => handleActionChoice('view')}
              sx={{ py: 1.5, textTransform: 'none', fontWeight: 700 }}
            >
              Review Audit Report
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AssignmentIcon />}
              onClick={() => handleActionChoice('edit')}
              sx={{ py: 1.5, textTransform: 'none', fontWeight: 700 }}
            >
              Modify / Continue Audit
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChoiceOpen(false)} fullWidth color="inherit">Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Detailed Report Dialog */}
      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: '#000' }}>
          <Typography variant="h6" fontWeight="bold">Audit Report: {selectedTask?.slid}</Typography>
          <IconButton onClick={() => setReportOpen(false)} sx={{ color: '#000' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#000' }}>
          {selectedTask && (
            <Box>
              <Typography variant="h6" color="primary" gutterBottom sx={{ fontWeight: 800, mt: 1 }}>Job Details</Typography>
              <Paper sx={{ p: 2, mb: 3, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Grid container spacing={2}>
                  {Object.entries(selectedTask.siteDetails || {}).map(([k, v]) => (
                    <Grid item xs={6} sm={3} key={k}>
                      <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, textTransform: 'uppercase' }}>{k}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{v || '-'}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              <Typography variant="h6" color="primary" gutterBottom sx={{ fontWeight: 800 }}>Checklist Verification</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, background: 'transparent' }}>
                <Table size="small">
                  <TableHead><TableRow sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}><TableCell sx={{ fontWeight: 800 }}>Checkpoint</TableCell><TableCell sx={{ fontWeight: 800 }}>Status</TableCell><TableCell sx={{ fontWeight: 800 }}>Notes</TableCell><TableCell sx={{ fontWeight: 800 }}>Evidence</TableCell></TableRow></TableHead>
                  <TableBody>
                    {selectedTask.checklist.map((item, idx) => {
                      const photo = selectedTask.photos?.find(p => p.checkpointName === item.checkpointName);
                      return (
                        <TableRow key={idx} sx={{ bgcolor: item.status === 'N.OK' ? 'rgba(244, 67, 54, 0.1)' : 'transparent' }}>
                          <TableCell sx={{ fontWeight: 600 }}>{item.checkpointName}</TableCell>
                          <TableCell><Chip label={item.status} size="small" color={item.status === 'OK' ? 'success' : 'error'} sx={{ fontWeight: 800, height: 20 }} /></TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{item.notes || "-"}</TableCell>
                          <TableCell>
                            {photo && (
                              <Button
                                size="small"
                                variant="text"
                                href={`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5001"}${photo.url}`}
                                target="_blank"
                                sx={{ minWidth: 0, p: 0 }}
                              >
                                View Photo
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Photo Gallery Section */}
              {selectedTask.photos && selectedTask.photos.length > 0 && (
                <Box sx={{ mt: 4, pb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 800 }}>Evidence Gallery</Typography>
                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      onClick={handleDownloadAll}
                      startIcon={<VisibilityIcon sx={{ transform: 'rotate(180deg)' }} />}
                    >
                      Download All Images (Zip)
                    </Button>
                  </Box>
                  <Grid container spacing={2}>

                    {selectedTask.photos.map((photo, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Paper sx={{ p: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                          <img
                            src={`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5001"}${photo.url}`}
                            alt={photo.checkpointName}
                            style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                          <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center', color: 'text.secondary' }}>
                            {photo.checkpointName}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#000', p: 2 }}>
          <Button onClick={() => setReportOpen(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>

  );
};

export default AuditorDashboard;
