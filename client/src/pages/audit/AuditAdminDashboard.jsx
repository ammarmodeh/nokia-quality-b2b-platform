import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Avatar
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import AssessmentIcon from "@mui/icons-material/Assessment";
import RateReviewIcon from "@mui/icons-material/RateReview";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import axios from "axios";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

import { ThemeProvider } from "@mui/material/styles";
import auditTheme from "../../theme/auditTheme";
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import GroupsIcon from "@mui/icons-material/Groups";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HomeIcon from "@mui/icons-material/Home";


// Modern Glass Stat Card
const StatCard = ({ title, value, color, icon, subtext }) => (
  <Paper
    sx={{
      p: 3,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      position: 'relative',
      overflow: 'hidden',
      '&:before': {
        content: '""',
        position: 'absolute',
        top: 0, left: 0, width: '4px', height: '100%',
        backgroundColor: color
      }
    }}
  >
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="h3" sx={{ mt: 1, fontWeight: 800, color: '#fff' }}>
        {value}
      </Typography>
      {subtext && <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>{subtext}</Typography>}
    </Box>
    <Avatar sx={{ bgcolor: `${color}15`, color: color, width: 56, height: 56 }}>
      {icon}
    </Avatar>
  </Paper>
);




const ManualTaskForm = ({ apiUrl, token, onSuccess, defaultDate }) => {
  // Initial State including generic fields
  const [task, setTask] = useState({
    slid: "",
    auditorId: "",
    req_no: "",
    int_no: "",
    customer_name: "",
    contact_number: "",
    governorate: "",
    town: "",
    district: "",
    street: "",
    building: "",
    speed: "",
    modem_type: "",
    ont_sn: "",
    lat: "",
    long: "",
    scheduledDate: defaultDate || (() => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })()
  });

  const [auditors, setAuditors] = useState([]);

  useEffect(() => {
    // Update date if defaultDate prop changes (e.g. user changes dashboard date)
    if (defaultDate) {
      setTask(prev => ({ ...prev, scheduledDate: defaultDate }));
    }
  }, [defaultDate]);

  useEffect(() => {
    const fetchAuditors = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const { data } = await axios.get(`${apiUrl}/stats`, config);
        setAuditors(data);
      } catch (error) {
        console.error("Failed to fetch auditors", error);
      }
    };
    fetchAuditors();
  }, [apiUrl, token]);


  const handleChange = (e) => {
    setTask({ ...task, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      // Map flat fields to siteDetails structure
      const payload = {
        slid: task.slid,
        auditorId: task.auditorId,
        scheduledDate: task.scheduledDate, // Send explicitly
        siteDetails: {
          "REQ #": task.req_no,
          "INT #": task.int_no,
          "CUST NAME": task.customer_name,
          "CUST CONT": task.contact_number,
          "Governorate": task.governorate,
          "TOWN": task.town,
          "DISTRICT": task.district,
          "STREET": task.street,
          "BUILDING": task.building,
          "SPEED": task.speed,
          "MODEM TYPE": task.modem_type,
          "ONT SN": task.ont_sn,
          "Lat": task.lat,
          "Long": task.long
        }
      };
      await axios.post(`${apiUrl}/manual-task`, payload, config);
      alert("Task created manually for " + task.scheduledDate);
      setTask({
        slid: "", auditorId: "", req_no: "", int_no: "", customer_name: "",
        contact_number: "", governorate: "", town: "", district: "", street: "",
        building: "", speed: "", modem_type: "", ont_sn: "", lat: "", long: "",
        scheduledDate: defaultDate // Reset to current default
      });
      onSuccess();
    } catch (error) {
      alert("Error: " + (error.response?.data?.message || error.message));
    }
  };

  return (
    <Paper sx={{ p: 4, mb: 4 }}>
      <Typography variant="h6" gutterBottom color="primary" sx={{ mb: 3 }}>
        Create New Field Audit Task
      </Typography>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>Job Identification</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="SLID" name="slid" required value={task.slid} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            type="date"
            fullWidth
            label="Scheduled Date"
            name="scheduledDate"
            value={task.scheduledDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            required
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="REQ #" name="req_no" value={task.req_no} onChange={handleChange} />
        </Grid>


        <Grid item xs={12} sm={6}>
          <TextField
            select fullWidth label="Assign Auditor" name="auditorId"
            value={task.auditorId} onChange={handleChange}
            SelectProps={{ native: true }} InputLabelProps={{ shrink: true }}
          >
            <option value="">-- None (Pending) --</option>
            {auditors.map((auditor) => (
              <option key={auditor._id} value={auditor._id}>{auditor.name}</option>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="INT #" name="int_no" value={task.int_no} onChange={handleChange} />
        </Grid>
      </Grid>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>Customer & Location</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Customer Name" name="customer_name" value={task.customer_name} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Contact Number" name="contact_number" value={task.contact_number} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="Governorate" name="governorate" value={task.governorate} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="Town" name="town" value={task.town} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="District" name="district" value={task.district} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Street" name="street" value={task.street} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Building" name="building" value={task.building} onChange={handleChange} />
        </Grid>
      </Grid>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>Technical Details</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="Speed / Plan" name="speed" value={task.speed} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="Modem Type" name="modem_type" value={task.modem_type} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="ONT SN" name="ont_sn" value={task.ont_sn} onChange={handleChange} />
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Button variant="contained" size="large" onClick={handleSubmit} startIcon={<AddCircleIcon />} fullWidth>
          Create & Assign Task
        </Button>
      </Box>
    </Paper>
  );
};

// Reschedule Dialog Component
const RescheduleDialog = ({ open, onClose, onConfirm, initialDate }) => {
  const [newDate, setNewDate] = useState(initialDate || "");
  useEffect(() => { if (open && initialDate) setNewDate(initialDate); }, [open, initialDate]);

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: 4, background: '#0a0a0a' } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>Reschedule Task</DialogTitle>
      <DialogContent sx={{ minWidth: 320, pt: 1 }}>
        <Typography variant="body2" sx={{ mb: 3, opacity: 0.7 }}>
          Select a new deployment date for this audit task.
        </Typography>
        <TextField
          type="date"
          fullWidth
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          variant="filled"
          sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}
        />
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={() => onConfirm(newDate)} variant="contained" sx={{ px: 4 }}>Confirm Move</Button>
      </DialogActions>
    </Dialog>
  );
};

// Detailed Task Review Component
const DetailedTaskReview = ({ apiUrl, token }) => {
  const [submittedTasks, setSubmittedTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [openDetail, setOpenDetail] = useState(false);

  const fetchSubmitted = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${apiUrl}/all-tasks`, config);
      setSubmittedTasks(data.filter(t => t.status === "Submitted" || t.status === "Approved"));
    } catch (error) {
      console.error("Fetch submitted failed", error);
    }
  };

  useEffect(() => { fetchSubmitted(); }, [token]);

  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    if (!selectedTask) return;
    const allRows = [
      { Section: "METADATA", Item: "SLID", Value: selectedTask.slid },
      { Section: "METADATA", Item: "Auditor", Value: selectedTask.auditor?.name || "Unknown" },
      { Section: "METADATA", Item: "Date", Value: new Date(selectedTask.updatedAt).toLocaleDateString() },
      {},
      ...Object.entries(selectedTask.siteDetails || {}).map(([key, value]) => ({ Section: "Site Details", Item: key, Value: value })),
      {},
      ...(selectedTask.checklist || []).map(item => {
        const photo = selectedTask.photos?.find(p => p.checkpointName === item.checkpointName);
        return {
          Section: "Checklist",
          Item: item.checkpointName,
          Value: item.status,
          Notes: item.notes || "",
          Evidence: photo ? `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5001"}${photo.url}` : ""
        };
      })
    ];
    const worksheet = XLSX.utils.json_to_sheet(allRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Audit_${selectedTask.slid}`);
    XLSX.writeFile(workbook, `Reach${selectedTask.slid}.xlsx`);
  };

  const handleDownloadAll = async () => {
    if (!selectedTask || !selectedTask.photos || selectedTask.photos.length === 0) return;
    const zip = new JSZip();
    const folder = zip.folder(`Evidence_${selectedTask.slid}`);
    const auditorName = selectedTask.auditor?.name || "Auditor";
    const scheduledDate = selectedTask.scheduledDate ? new Date(selectedTask.scheduledDate).toISOString().split('T')[0] : "NoDate";
    const downloadPromises = selectedTask.photos.map(async (photo) => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5001"}${photo.url}`);
        const blob = await response.blob();
        const extension = photo.url.split('.').pop().split(/\#|\?/)[0] || 'jpg';
        const fileName = `${selectedTask.slid}-${photo.checkpointName}-${auditorName}-${scheduledDate}.${extension}`;
        folder.file(fileName, blob);
      } catch (err) { console.error(err); }
    });
    await Promise.all(downloadPromises);
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `Reach_Audit_Evidence_${selectedTask.slid}.zip`);
  };


  const columns = [
    { field: 'slid', headerName: 'SLID', width: 150, renderCell: (p) => <Typography sx={{ fontWeight: 800, color: 'primary.main' }}>{p.value}</Typography> },
    { field: 'auditor', headerName: 'Auditor', width: 200, renderCell: (p) => p.row.auditor?.name || "Unknown" },
    {
      field: 'updatedAt',
      headerName: 'Submitted Date',
      width: 180,
      renderCell: (p) => new Date(p.value).toLocaleString()
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (p) => <Chip label={p.value} color="success" size="small" sx={{ fontWeight: 800 }} />
    },
    {
      field: 'action',
      headerName: 'Action',
      width: 150,
      renderCell: (p) => (
        <Button size="small" variant="contained" onClick={() => { setSelectedTask(p.row); setOpenDetail(true); }}>
          View Report
        </Button>
      )
    }
  ];

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <DataGrid rows={submittedTasks} columns={columns} getRowId={(r) => r._id} slots={{ toolbar: GridToolbar }} />
      {/* Detail Dialog */}
      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: '#000' }}>
          Audit Report: {selectedTask?.slid}
          <IconButton onClick={() => setOpenDetail(false)} sx={{ color: '#000' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedTask && (
            <Box id="printable-section">
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
                          <TableCell fontSize="0.8rem">{item.notes || "-"}</TableCell>
                          <TableCell>
                            {photo && (
                              <Button
                                size="small"
                                variant="text"
                                href={`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5001"}${photo.url}`}
                                target="_blank"
                                sx={{ '@media print': { display: 'none' }, minWidth: 0, p: 0 }}
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
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handlePrint} startIcon={<VisibilityIcon />}>Print View</Button>
          <Button variant="contained" color="success" onClick={handleExportExcel} startIcon={<CloudUploadIcon sx={{ transform: 'rotate(180deg)' }} />}>
            Export Excel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// User Management Component
const UserManagement = ({ apiUrl, token }) => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: "", username: "", password: "", role: "Auditor" });
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: "", username: "", password: "" });

  const fetchUsers = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${apiUrl}/stats`, config);
      setUsers(data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchUsers(); }, [token]);

  const handleRegister = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${apiUrl}/register`, newUser, config);
      alert("Auditor registered!");
      setNewUser({ name: "", username: "", password: "", role: "Auditor" });
      fetchUsers();
    } catch (error) { alert(error.response?.data?.message || "Registration failed"); }
  };

  const handleUpdate = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = { ...editFormData };
      if (!payload.password) delete payload.password;
      await axios.put(`${apiUrl}/users/${editingUser._id}`, payload, config);
      alert("Updated!");
      setEditOpen(false);
      fetchUsers();
    } catch (error) { alert(error.response?.data?.message || "Update failed"); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete auditor?")) {
      await axios.delete(`${apiUrl}/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchUsers();
    }
  };

  const columns = [
    { field: 'name', headerName: 'Full Name', flex: 1, renderCell: (p) => <Typography sx={{ fontWeight: 600 }}>{p.value}</Typography> },
    { field: 'username', headerName: 'Username', width: 150 },
    {
      field: 'stats',
      headerName: 'Stats',
      width: 200,
      renderCell: (p) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label={`${p.row.totalTasks || 0} T`} size="small" />
          <Chip label={`${p.row.submittedTasks || 0} D`} size="small" color="success" />
        </Box>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (p) => (
        <Box>
          <IconButton color="primary" onClick={() => { setEditingUser(p.row); setEditFormData({ name: p.row.name, username: p.row.username, password: "" }); setEditOpen(true); }}>
            <EditIcon size="small" />
          </IconButton>
          <IconButton color="error" onClick={() => handleDelete(p.row._id)}>
            <DeleteIcon size="small" />
          </IconButton>
        </Box>
      )
    }
  ];

  return (
    <Grid container spacing={4}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 4, background: 'rgba(255,255,255,0.02)' }}>
          <Typography variant="h6" gutterBottom><PersonAddIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> New Auditor</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField label="Name" fullWidth value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
            <TextField label="Username" fullWidth value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
            <TextField label="Password" type="password" fullWidth value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
            <Button variant="contained" onClick={handleRegister}>Register Account</Button>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        <Box sx={{ height: 500, width: '100%' }}>
          <DataGrid rows={users} columns={columns} getRowId={(r) => r._id} disableRowSelectionOnClick />
        </Box>
      </Grid>
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} PaperProps={{ sx: { background: '#0a0a0a' } }}>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent sx={{ minWidth: 320, pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Name" fullWidth value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} />
            <TextField label="Username" fullWidth value={editFormData.username} onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })} />
            <TextField label="New Password (optional)" type="password" fullWidth value={editFormData.password} onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions><Button onClick={() => setEditOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleUpdate}>Save Changes</Button></DialogActions>
      </Dialog>
    </Grid>
  );
};

// Advanced User Stats Table
const UserStatsTable = ({ stats }) => {
  const columns = [
    {
      field: 'name',
      headerName: 'Auditor',
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: '0.8rem' }}>
            {params.value.charAt(0)}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{params.value}</Typography>
        </Box>
      )
    },
    { field: 'totalTasks', headerName: 'Assigned', width: 120, type: 'number' },
    { field: 'pendingTasks', headerName: 'Pending', width: 120, type: 'number' },
    { field: 'submittedTasks', headerName: 'Completed', width: 120, type: 'number' },
    {
      field: 'performance',
      headerName: 'Performance',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => {
        const value = params.row.totalTasks > 0 ? (params.row.submittedTasks / params.row.totalTasks) * 100 : 0;
        return (
          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', height: '100%', gap: 2 }}>
            <LinearProgress
              variant="determinate"
              value={value}
              sx={{ flexGrow: 1, height: 8, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.05)' }}
              color={value > 80 ? "success" : value > 50 ? "warning" : "error"}
            />
            <Typography variant="body2" sx={{ minWidth: 40, fontWeight: 700 }}>{Math.round(value)}%</Typography>
          </Box>
        );
      }
    }
  ];

  return (
    <Box sx={{ height: 500, width: '100%' }}>
      <DataGrid
        rows={stats}
        columns={columns}
        getRowId={(row) => row._id}
        pageSizeOptions={[5, 10, 25]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        disableRowSelectionOnClick
        slots={{ toolbar: GridToolbar }}
        slotProps={{
          toolbar: { showQuickFilter: true, printOptions: { disableToolbarButton: true } },
        }}
        sx={{
          '& .MuiDataGrid-cell:focus': { outline: 'none' },
          '& .MuiDataGrid-columnHeader:focus': { outline: 'none' },
        }}
      />
    </Box>
  );
};

const TaskManagement = ({ apiUrl, token }) => {
  const [tasks, setTasks] = useState([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [openReschedule, setOpenReschedule] = useState(false);
  const [taskToReschedule, setTaskToReschedule] = useState(null);

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const fetchTasks = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${apiUrl}/all-tasks?date=${selectedDate}`, config);
      setTasks(data);
    } catch (error) { console.error(error); }
  };

  const handleDateChange = (days) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  useEffect(() => { fetchTasks(); }, [token, selectedDate]);


  const handleFileChange = (e) => setCsvFile(e.target.files[0]);

  const handleUpload = () => {
    if (!csvFile) return;
    Papa.parse(csvFile, {
      header: true,
      complete: async (results) => {
        try {
          const config = { headers: { Authorization: `Bearer ${token}` } };
          await axios.post(`${apiUrl}/upload-tasks`, { tasks: results.data, scheduledDate: selectedDate }, config);
          alert("Tasks uploaded!");
          setOpenUpload(false);
          fetchTasks();
        } catch (error) { alert(error.response?.data?.message || "Upload failed"); }
      }
    });
  };

  const handleVisibilityToggle = async (task) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${apiUrl}/tasks/${task._id}/visibility`, {}, config);
      fetchTasks();
    } catch (error) { console.error(error); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete task?")) {
      await axios.delete(`${apiUrl}/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchTasks();
    }
  };

  const handleReschedule = async (newDate) => {
    if (!newDate) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${apiUrl}/tasks/${taskToReschedule._id}/reschedule`, { scheduledDate: newDate }, config);
      setOpenReschedule(false);
      fetchTasks();
    } catch (error) { alert("Reschedule failed"); }
  };

  const handleBulkVisibility = async (visible) => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const promises = tasks.filter(t => t.isVisible !== visible).map(t => axios.put(`${apiUrl}/tasks/${t._id}/visibility`, {}, config));
    await Promise.all(promises);
    fetchTasks();
  };

  const columns = [
    { field: 'slid', headerName: 'SLID', width: 130, renderCell: (p) => <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>{p.value}</Typography> },
    {
      field: 'customer', headerName: 'Cust. / Location', flex: 1.5,
      renderCell: (p) => (
        <Box sx={{ py: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{p.row.siteDetails?.["CUST NAME"] || ' - '}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{p.row.siteDetails?.TOWN}</Typography>
        </Box>
      )
    },
    {
      field: 'auditor', headerName: 'Auditor', width: 150,
      renderCell: (p) => p.row.auditor ? <Chip label={p.row.auditor.name} size="small" /> : <Typography variant="caption" color="text.secondary">Unassigned</Typography>
    },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <Chip label={p.value} size="small" color={p.value === 'Submitted' ? 'success' : 'default'} /> },
    {
      field: 'isVisible', headerName: 'Vis', width: 80,
      renderCell: (p) => (
        <IconButton size="small" onClick={() => handleVisibilityToggle(p.row)} color={p.value === false ? "default" : "primary"}>
          {p.value === false ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
        </IconButton>
      )
    },
    {
      field: 'actions', headerName: 'Actions', width: 120,
      renderCell: (p) => (
        <Box>
          <IconButton color="primary" size="small" onClick={() => { setTaskToReschedule(p.row); setOpenReschedule(true); }}><CalendarTodayIcon fontSize="small" /></IconButton>
          <IconButton color="error" size="small" onClick={() => handleDelete(p.row._id)}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      )
    }
  ];

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => handleDateChange(-1)} size="small" sx={{ color: 'primary.main', bgcolor: 'rgba(62, 166, 255, 0.05)' }}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, borderRadius: 2, bgcolor: 'rgba(62, 166, 255, 0.1)' }}>
              <CalendarTodayIcon sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontWeight: 700 }} />
            </Box>
            <IconButton onClick={() => handleDateChange(1)} size="small" sx={{ color: 'primary.main', bgcolor: 'rgba(62, 166, 255, 0.05)' }}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Box>
          <Chip label={`${tasks.length} Active`} color="primary" />
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" color="inherit" onClick={() => handleBulkVisibility(false)}>Hide All</Button>
          <Button variant="outlined" size="small" onClick={() => handleBulkVisibility(true)}>Show All</Button>
          <Button variant="contained" size="small" startIcon={<CloudUploadIcon />} onClick={() => setOpenUpload(true)}>Import CSV</Button>
        </Box>
      </Paper>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}><ManualTaskForm apiUrl={apiUrl} token={token} onSuccess={fetchTasks} defaultDate={selectedDate} /></Grid>
        <Grid item xs={12} md={8} sx={{ height: 600 }}><DataGrid rows={tasks} columns={columns} getRowId={r => r._id} slots={{ toolbar: GridToolbar }} /></Grid>
      </Grid>
      <RescheduleDialog open={openReschedule} onClose={() => setOpenReschedule(false)} onConfirm={handleReschedule} initialDate={taskToReschedule?.scheduledDate?.split("T")[0]} />
      <Dialog open={openUpload} onClose={() => setOpenUpload(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Tasks</DialogTitle>
        <DialogContent dividers sx={{ textAlign: 'center', p: 4 }}>
          <CloudUploadIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
          <input type="file" accept=".csv" onChange={handleFileChange} style={{ width: '100%' }} />
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenUpload(false)}>Cancel</Button><Button variant="contained" onClick={handleUpload}>Start Upload</Button></DialogActions>
      </Dialog>
    </Box>
  );
};


// Main Dashboard
const AuditAdminDashboard = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [dashboardStats, setDashboardStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    activeAuditors: 0
  });
  const [auditorStats, setAuditorStats] = useState([]);
  const navigate = useNavigate();


  const { auditUser } = useSelector((state) => state.audit);

  const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5001"}/api/audit`;
  const token = auditUser?.token;

  // Fetch Dashboard Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };

        // 1. Fetch Key Metrics (Using All Tasks to capture unassigned ones too)
        const tasksReq = axios.get(`${API_URL}/all-tasks`, config);
        // 2. Fetch Auditor Performance
        const statsReq = axios.get(`${API_URL}/stats`, config);

        const [tasksRes, statsRes] = await Promise.all([tasksReq, statsReq]);
        const tasks = tasksRes.data;
        const stats = statsRes.data;

        // Compute Totals form All Tasks
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'Submitted' || t.status === 'Approved').length;
        const pending = tasks.length - completed;

        // Active auditors from stats
        const activeAuditors = stats.length;

        setDashboardStats({ total, pending, completed, activeAuditors });
        setAuditorStats(stats);

      } catch (error) {
        console.error("Dashboard fetch failed", error);
      }
    };

    if (token) fetchData();
  }, [token, API_URL]);


  const handleChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  return (
    <ThemeProvider theme={auditTheme}>
      <Box sx={{ width: "100%", bgcolor: 'background.default', minHeight: '100vh', p: 3 }}>

        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom>Overview</Typography>
            <Typography variant="subtitle1" color="text.secondary">Welcome back, {auditUser?.name}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<HomeIcon />}
              onClick={() => navigate("/dashboard")}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                borderWidth: 2,
                '&:hover': { borderWidth: 2 }
              }}
            >
              Main Dashboard
            </Button>
          </Box>
        </Box>


        {/* Top Stats Row */}
        {tabIndex === 0 && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Total Tasks" value={dashboardStats.total} color="#3ea6ff" icon={<AssignmentTurnedInIcon />} subtext="System lifetime" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Pending" value={dashboardStats.pending} color="#f44336" icon={<PendingActionsIcon />} subtext="Awaiting audit" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Completed" value={dashboardStats.completed} color="#00f5d4" icon={<TrendingUpIcon />} subtext="Success rate" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Active Team" value={dashboardStats.activeAuditors} color="#7c4dff" icon={<GroupsIcon />} subtext="Registered auditors" />
            </Grid>
          </Grid>
        )}

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabIndex}
            onChange={handleChange}
            aria-label="admin tabs"
            indicatorColor="primary"
            textColor="primary"
            sx={{ px: 2, borderBottom: '1px solid #f0f0f0' }}
          >
            <Tab label="Team Performance" icon={<AssessmentIcon fontSize="small" />} iconPosition="start" />
            <Tab label="Task Operations" icon={<CloudUploadIcon fontSize="small" />} iconPosition="start" />
            <Tab label="Review Reports" icon={<RateReviewIcon fontSize="small" />} iconPosition="start" />
            <Tab label="User Management" icon={<PersonAddIcon fontSize="small" />} iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Content Area */}
        <Box sx={{ mt: 2 }}>
          {tabIndex === 0 && <UserStatsTable stats={auditorStats} />}
          {tabIndex === 1 && <TaskManagement apiUrl={API_URL} token={token} />}
          {tabIndex === 2 && <DetailedTaskReview apiUrl={API_URL} token={token} />}
          {tabIndex === 3 && <UserManagement apiUrl={API_URL} token={token} />}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default AuditAdminDashboard;
