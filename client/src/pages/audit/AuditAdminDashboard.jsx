import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
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
  Avatar,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup
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
import CloudDownloadIcon from "@mui/icons-material/CloudDownload"; // Added
import axios from "axios";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import JSZip from 'jszip';
import { saveAs } from 'file-saver'; // Added

import { ThemeProvider, alpha } from "@mui/material/styles";
import auditTheme from "../../theme/auditTheme";
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { format, startOfWeek, endOfWeek, subDays, subWeeks, subMonths, getISOWeek, isWithinInterval } from 'date-fns';
import api from "../../api/api";
import { getCustomWeekNumber } from "../../utils/helpers";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import GroupsIcon from "@mui/icons-material/Groups";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HomeIcon from "@mui/icons-material/Home";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import { logoutAuditUser } from "../../redux/slices/auditSlice";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';


// Modern Glass Stat Card
const StatCard = ({ title, value, color, icon, subtext }) => (
  <Paper
    sx={{
      p: 3,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#0a0a0a',
      borderLeft: `4px solid ${color}`,
      borderRadius: 0,
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'default',
      '&:hover': {
        background: 'rgba(255,255,255,0.04)',
        borderColor: color,
        transform: 'translateY(-4px)',
        '& .stat-icon': {
          transform: 'scale(1.2) rotate(-10deg)',
          color: color
        }
      }
    }}
  >
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800 }}>
        {title}
      </Typography>
      <Typography variant="h3" sx={{ mt: 1, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>
        {value}
      </Typography>
      {subtext && <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, opacity: 0.6, fontWeight: 600 }}>{subtext}</Typography>}
    </Box>
    <Avatar className="stat-icon" sx={{ bgcolor: `${color}15`, color: color, width: 56, height: 56, borderRadius: 0, transition: 'all 0.3s ease' }}>
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
  const [slidExists, setSlidExists] = useState(false);
  const [checkingSlid, setCheckingSlid] = useState(false);

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

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (task.slid && task.slid.trim() !== "") {
        setCheckingSlid(true);
        try {
          const config = { headers: { Authorization: `Bearer ${token}` } };
          const { data } = await axios.get(`${apiUrl}/check-slid/${task.slid.trim()}`, config);
          setSlidExists(data.exists);
        } catch (error) {
          console.error("SLID check failed", error);
        } finally {
          setCheckingSlid(false);
        }
      } else {
        setSlidExists(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [task.slid, apiUrl, token]);

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
        slid: "", auditorId: "", req_no: "", customer_name: "",
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
          <TextField
            fullWidth
            label="SLID"
            name="slid"
            required
            value={task.slid}
            onChange={handleChange}
            error={slidExists}
            helperText={slidExists ? "This SLID already exists in the system!" : (checkingSlid ? "Checking..." : "")}
            InputProps={{
              endAdornment: checkingSlid && (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ),
            }}
          />
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


        <Grid item xs={12} sm={8}>
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
        <Button
          variant="contained"
          size="large"
          onClick={handleSubmit}
          startIcon={<AddCircleIcon />}
          fullWidth
          disabled={slidExists || checkingSlid || !task.slid}
        >
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
  const [previewImage, setPreviewImage] = useState(null); // State for full image view

  const fetchSubmitted = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${apiUrl}/all-tasks`, config);
      setSubmittedTasks(data.filter(t => t.status === "Submitted" || t.status === "Approved"));
    } catch (error) {
      console.error("Fetch submitted failed", error);
    }
  };

  useEffect(() => {
    if (token && token !== "undefined" && token !== "null") {
      fetchSubmitted();
    }
  }, [token]);

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

    // Track used filenames to handle duplicates
    const usedNames = {};

    // Use for...of loop for sequential processing to simplify name tracking (though parallel is faster, this is safer for naming)
    const downloadPromises = selectedTask.photos.map(async (photo) => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5001"}${photo.url}`);
        if (!response.ok) throw new Error("Network response was not ok");
        const blob = await response.blob();
        const extension = photo.url.split('.').pop().split(/\#|\?/)[0] || 'jpg';

        // Construct Initial Filename
        let baseName = photo.description && photo.description.includes('.') ? photo.description : `${selectedTask.slid}-${photo.checkpointName}-${auditorName}-${scheduledDate}.${extension}`;

        // Handle Duplicates
        if (usedNames[baseName] !== undefined) {
          usedNames[baseName]++;
          const nameParts = baseName.lastIndexOf(".");
          if (nameParts !== -1) {
            baseName = `${baseName.substring(0, nameParts)}_(${usedNames[baseName]})${baseName.substring(nameParts)}`;
          } else {
            baseName = `${baseName}_(${usedNames[baseName]})`;
          }
        } else {
          usedNames[baseName] = 0; // Initialize
        }

        folder.file(baseName, blob);
      } catch (err) { console.error("Failed to download photo:", photo.url, err); }
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
      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} fullScreen>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: '#000' }}>
          Audit Report: {selectedTask?.slid}
          <IconButton onClick={() => setOpenDetail(false)} sx={{ color: '#000' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#000', p: 0 }}>
          {selectedTask && (
            <Box id="printable-section" sx={{ p: 4, maxWidth: 1000, margin: 'auto' }}>
              {/* Report Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 6, borderBottom: '2px solid', borderColor: 'primary.main', pb: 2 }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -1, color: '#fff' }}>
                    AUDIT <span style={{ color: auditTheme.palette.primary.main }}>REPORT</span>
                  </Typography>
                  <Typography variant="subtitle1" sx={{ opacity: 0.6, fontWeight: 600 }}>SITE INSPECTION CERTIFICATE</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{selectedTask.slid}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', opacity: 0.5 }}>REF: AUD-{selectedTask._id.slice(-6).toUpperCase()}</Typography>
                </Box>
              </Box>

              {/* Score & Summary Row */}
              <Grid container spacing={4} sx={{ mb: 6 }}>
                <Grid item xs={12} md={4}>
                  <Box sx={{
                    p: 4,
                    bgcolor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%'
                  }}>
                    <Typography variant="caption" sx={{ mb: 2, fontWeight: 800, color: 'primary.main', textTransform: 'uppercase' }}>Compliance Score</Typography>
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress
                        variant="determinate"
                        value={(() => {
                          const ok = selectedTask.checklist.filter(c => c.status === 'OK').length;
                          return Math.round((ok / selectedTask.checklist.length) * 100);
                        })()}
                        size={120}
                        thickness={2}
                        sx={{ color: 'primary.main' }}
                      />
                      <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="h4" component="div" sx={{ color: '#fff', fontWeight: 900 }}>
                          {(() => {
                            const ok = selectedTask.checklist.filter(c => c.status === 'OK').length;
                            return Math.round((ok / selectedTask.checklist.length) * 100);
                          })()}%
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={(() => {
                        const ok = selectedTask.checklist.filter(c => c.status === 'OK').length;
                        const score = Math.round((ok / selectedTask.checklist.length) * 100);
                        return score > 85 ? "GRADE A: EXCELLENT" : score > 70 ? "GRADE B: GOOD" : "GRADE F: FAILED";
                      })()}
                      color={(() => {
                        const ok = selectedTask.checklist.filter(c => c.status === 'OK').length;
                        const score = Math.round((ok / selectedTask.checklist.length) * 100);
                        return score > 70 ? "success" : "error";
                      })()}
                      sx={{ mt: 3, fontWeight: 900, borderRadius: 0 }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="button" sx={{ color: 'primary.main', fontWeight: 800, mb: 1, display: 'block' }}>Identification & Ownership</Typography>
                    </Grid>
                    {[
                      { l: 'SLID', v: selectedTask.slid },
                      { l: 'Auditor', v: selectedTask.auditor?.name },
                      { l: 'Town', v: selectedTask.siteDetails?.TOWN },
                      { l: 'District', v: selectedTask.siteDetails?.DISTRICT },
                      { l: 'Customer', v: selectedTask.siteDetails?.["CUST NAME"] },
                      { l: 'Contact', v: selectedTask.siteDetails?.["CUST CONT"] },
                      { l: 'Scheduled', v: new Date(selectedTask.scheduledDate).toLocaleDateString() },
                      { l: 'Submitted', v: new Date(selectedTask.updatedAt).toLocaleDateString() }
                    ].map(item => (
                      <Grid item xs={6} sm={3} key={item.l}>
                        <Paper sx={{ p: 2, bgcolor: 'transparent', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 0 }}>
                          <Typography variant="caption" sx={{ display: 'block', opacity: 0.5, fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' }}>{item.l}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>{item.v || '-'}</Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>

              {/* Checklist Section */}
              <Box sx={{ mb: 6 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 3, borderLeft: '4px solid', borderColor: 'primary.main', pl: 2 }}>CHECKLIST VERIFICATION</Typography>
                <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'transparent', borderRadius: 0, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Table>
                    <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                      <TableRow>
                        <TableCell sx={{ color: 'primary.main', fontWeight: 900 }}>CHECKPOINT</TableCell>
                        <TableCell sx={{ color: 'primary.main', fontWeight: 900 }}>RESULT</TableCell>
                        <TableCell sx={{ color: 'primary.main', fontWeight: 900 }}>NOTES / REMARKS</TableCell>
                        <TableCell sx={{ color: 'primary.main', fontWeight: 900, textAlign: 'center' }}>MEDIA</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedTask.checklist.map((item, idx) => {
                        const photo = selectedTask.photos?.find(p => p.checkpointName === item.checkpointName);
                        const isFail = item.status === 'N.OK';
                        return (
                          <TableRow key={idx} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.01)' } }}>
                            <TableCell sx={{ fontWeight: 800 }}>{item.checkpointName}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isFail ? 'error.main' : 'success.main' }} />
                                <Typography variant="body2" sx={{ fontWeight: 900, color: isFail ? 'error.main' : 'success.main' }}>{item.status}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ maxWidth: 300 }}>
                              <Typography variant="body2" color="text.secondary">{item.notes || "Consistent with standards."}</Typography>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center', minWidth: 100 }}>
                              <Box sx={{
                                display: 'flex',
                                gap: 0.5,
                                justifyContent: 'center',
                                maxWidth: 120,
                                overflowX: 'auto',
                                pb: 0.5,
                                '&::-webkit-scrollbar': { height: 4 },
                                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }
                              }}>
                                {(() => {
                                  const checkpointsPhotos = selectedTask.photos?.filter(p => p.checkpointName === item.checkpointName) || [];
                                  if (checkpointsPhotos.length > 0) {
                                    return checkpointsPhotos.map((p, pIdx) => (
                                      <IconButton
                                        key={pIdx}
                                        size="small"
                                        onClick={() => setPreviewImage(p)}
                                        sx={{
                                          color: 'primary.main',
                                          bgcolor: 'rgba(62, 166, 255, 0.05)',
                                          '&:hover': { bgcolor: 'rgba(62, 166, 255, 0.1)' }
                                        }}
                                      >
                                        <VisibilityIcon fontSize="small" />
                                      </IconButton>
                                    ));
                                  }
                                  return <Typography variant="caption" sx={{ opacity: 0.3 }}>N/A</Typography>;
                                })()}
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Evidence Gallery */}
              {selectedTask.photos && selectedTask.photos.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, borderLeft: '4px solid', borderColor: 'primary.main', pl: 2 }}>VISUAL EVIDENCE GALLERY</Typography>
                    <Tooltip title="Download High-Res Zip">
                      <IconButton onClick={handleDownloadAll} color="primary" sx={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                        <CloudDownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Grid container spacing={1}>
                    {selectedTask.photos.map((photo, index) => (
                      <Grid item xs={12} sm={6} md={3} key={index}>
                        <Paper
                          sx={{
                            p: 0.5,
                            bgcolor: '#1a1a1a',
                            borderRadius: 0,
                            cursor: 'pointer',
                            '&:hover': { opacity: 0.8 }
                          }}
                          onClick={() => setPreviewImage(photo)}
                        >
                          <img
                            src={`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5001"}${photo.url}`}
                            alt={photo.checkpointName}
                            style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                          />
                          <Box sx={{ p: 1 }}>
                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: 'primary.main', textTransform: 'uppercase', fontSize: '0.6rem' }}>
                              {photo.checkpointName}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', opacity: 0.5, fontSize: '0.55rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {photo.description !== `Photo for ${photo.checkpointName}` ? photo.description : 'NO FILENAME'}
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* Footer */}
              <Box sx={{ mt: 10, pt: 4, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ opacity: 0.3 }}>Generated by Reach Audit Intelligence System • Secure Verification Protocol</Typography>
              </Box>
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

      {/* Full Image Preview Dialog */}
      <Dialog
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        fullScreen
        sx={{ zIndex: 99999 }}
        PaperProps={{
          sx: { bgcolor: '#000', border: '1px solid #333' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {previewImage?.checkpointName}
            </Typography>
            <Typography variant="caption" color="gray">
              SLID: {selectedTask?.slid}
            </Typography>
          </Box>
          <IconButton onClick={() => setPreviewImage(null)} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 0, bgcolor: '#0a0a0a' }}>
          {previewImage && (
            <img
              src={`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5001"}${previewImage.url}`}
              alt={previewImage.checkpointName}
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
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

  useEffect(() => {
    if (token && token !== "undefined" && token !== "null") {
      fetchUsers();
    }
  }, [token]);

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

// Analytics Components
const AnalyticsCharts = ({ tasks, settings }) => {
  const [interval, setInterval] = useState('daily');

  // 1. Trend Data (Dynamic based on interval)
  const getTrendData = () => {
    const submitted = tasks.filter(t => t.status === 'Submitted');

    if (interval === 'daily') {
      const days = [...Array(14)].map((_, i) => {
        const d = subDays(new Date(), i);
        return format(d, 'yyyy-MM-dd');
      }).reverse();

      return days.map(date => {
        const count = submitted.filter(t => t.updatedAt?.split('T')[0] === date).length;
        return { label: format(new Date(date), 'MM/dd'), count };
      });
    }

    if (interval === 'weekly') {
      const weeks = [...Array(8)].map((_, i) => {
        const d = subWeeks(new Date(), i);
        const weekStartDay = settings?.weekStartDay || 0;
        const start = startOfWeek(d, { weekStartsOn: weekStartDay });

        // Use custom project week number
        const weekNum = getCustomWeekNumber(start, start.getFullYear(), settings || {});

        return {
          start: start,
          end: endOfWeek(d, { weekStartsOn: weekStartDay }),
          label: `W${String(weekNum).padStart(2, '0')}`
        };
      }).reverse();

      return weeks.map(w => {
        const count = submitted.filter(t => {
          const d = new Date(t.updatedAt);
          return isWithinInterval(d, { start: w.start, end: w.end });
        }).length;
        return { label: w.label, count };
      });
    }

    if (interval === 'monthly') {
      const months = [...Array(6)].map((_, i) => {
        const d = subMonths(new Date(), i);
        return {
          label: format(d, 'MMM'),
          month: d.getMonth(),
          year: d.getFullYear()
        };
      }).reverse();

      return months.map(m => {
        const count = submitted.filter(t => {
          const d = new Date(t.updatedAt);
          return d.getMonth() === m.month && d.getFullYear() === m.year;
        }).length;
        return { label: m.label, count };
      });
    }
  };

  // 2. Issue Distribution (Failed Checkpoints)
  const getIssueData = () => {
    const issues = {};
    tasks.filter(t => t.status === 'Submitted').forEach(t => {
      t.checklist?.filter(c => c.status === 'N.OK').forEach(c => {
        issues[c.checkpointName] = (issues[c.checkpointName] || 0) + 1;
      });
    });
    return Object.entries(issues)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  };

  // 3. Overall Compliance (Pass/Fail Ratio)
  const getComplianceData = () => {
    let ok = 0, nok = 0;
    tasks.filter(t => t.status === 'Submitted').forEach(t => {
      t.checklist?.forEach(c => {
        if (c.status === 'OK') ok++;
        else if (c.status === 'N.OK') nok++;
      });
    });
    return [
      { name: 'Pass', value: ok, color: '#00f5d4' },
      { name: 'Fail', value: nok, color: '#f44336' }
    ];
  };

  // 4. Auditor Grade Distribution
  const getGradeData = () => {
    const auditors = {};
    tasks.filter(t => t.status === 'Submitted').forEach(t => {
      const email = t.auditor?.email || 'Unknown';
      if (!auditors[email]) auditors[email] = { ok: 0, total: 0 };
      t.checklist?.forEach(c => {
        auditors[email].total++;
        if (c.status === 'OK') auditors[email].ok++;
      });
    });

    let gradeA = 0, gradeB = 0, gradeF = 0;
    Object.values(auditors).forEach(stats => {
      const score = (stats.ok / stats.total) * 100;
      if (score > 85) gradeA++;
      else if (score > 70) gradeB++;
      else gradeF++;
    });

    return [
      { name: 'Grade A (>85%)', value: gradeA, color: '#00f5d4' },
      { name: 'Grade B (70-85%)', value: gradeB, color: '#ffc107' },
      { name: 'Grade F (<70%)', value: gradeF, color: '#f44336' }
    ];
  };

  const trendData = getTrendData();
  const issueData = getIssueData();
  const complianceData = getComplianceData();
  const gradeData = getGradeData();

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Trend Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 400, bgcolor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase' }}>
                Audit Volume Trend
              </Typography>
              <ToggleButtonGroup
                size="small"
                value={interval}
                exclusive
                onChange={(e, val) => val && setInterval(val)}
                sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}
              >
                <ToggleButton value="daily" sx={{ px: 2, py: 0, color: 'text.secondary' }}>Daily</ToggleButton>
                <ToggleButton value="weekly" sx={{ px: 2, py: 0, color: 'text.secondary' }}>Weekly</ToggleButton>
                <ToggleButton value="monthly" sx={{ px: 2, py: 0, color: 'text.secondary' }}>Monthly</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip
                  contentStyle={{ bgcolor: '#1a1a1a', border: 'none', borderRadius: 4 }}
                  itemStyle={{ color: '#3ea6ff' }}
                />
                <Line type="monotone" dataKey="count" stroke="#3ea6ff" strokeWidth={3} dot={{ r: 4, fill: '#3ea6ff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Auditor Grade Distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 400, bgcolor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase' }}>
              Auditor Grade Distribution
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={gradeData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {gradeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Global Stats Cards */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 350, bgcolor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Typography variant="h6" color="primary.main" sx={{ fontWeight: 900 }}>SYSTEM HEALTH</Typography>
            <Typography variant="h2" sx={{ fontWeight: 900, my: 2 }}>
              {(() => {
                let total = 0, ok = 0;
                tasks.filter(t => t.status === 'Submitted').forEach(t => {
                  t.checklist?.forEach(c => {
                    total++; if (c.status === 'OK') ok++;
                  });
                });
                return total > 0 ? Math.round((ok / total) * 100) : 0;
              })()}%
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>Avg Compliance Score</Typography>
            <Box sx={{ mt: 4, width: '100%' }}>
              <LinearProgress variant="determinate" value={90} sx={{ height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.05)' }} />
              <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'right', opacity: 0.5 }}>Target: 90%</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Issue Bar Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 350, bgcolor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase' }}>
              Top Issues Identified (Failed Checkpoints)
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={issueData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={12} hide />
                <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.7)" fontSize={11} width={150} tickLine={false} axisLine={false} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ bgcolor: '#1a1a1a', border: 'none', borderRadius: 4 }}
                />
                <Bar dataKey="value" fill="#f44336" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

const UserStatsTable = ({ stats }) => {
  const columns = [
    {
      field: 'name',
      headerName: 'Auditor',
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: '0.8rem', borderRadius: 0 }}>
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
              sx={{ flexGrow: 1, height: 4, borderRadius: 0, bgcolor: 'rgba(255,255,255,0.05)' }}
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
          border: 'none',
          '& .MuiDataGrid-columnHeaders': {
            bgcolor: 'rgba(255,255,255,0.02)',
            borderRadius: 0,
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          },
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          },
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

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [auditorFilter, setAuditorFilter] = useState("All");
  const [townFilter, setTownFilter] = useState("All");

  const [uniqueTowns, setUniqueTowns] = useState([]);
  const [uniqueAuditors, setUniqueAuditors] = useState([]);

  const fetchTasks = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`${apiUrl}/all-tasks?date=${selectedDate}`, config);
      setTasks(data);

      // Extract unique towns and auditors for filters
      const towns = [...new Set(data.map(t => t.siteDetails?.TOWN || t.siteDetails?.town).filter(Boolean))].sort();
      setUniqueTowns(towns);

      const auditors = [...new Set(data.map(t => t.auditor?.name).filter(Boolean))].sort();
      setUniqueAuditors(auditors);
    } catch (error) {
      console.error(error);
      if (error.response && error.response.status === 401) {
        dispatch(logoutAuditUser());
        window.location.href = '/audit/login';
      }
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.slid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.siteDetails?.["CUST NAME"] || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || task.status === statusFilter;
    const matchesAuditor = auditorFilter === "All" || task.auditor?.name === auditorFilter;
    const matchesTown = townFilter === "All" || (task.siteDetails?.TOWN || task.siteDetails?.town) === townFilter;

    return matchesSearch && matchesStatus && matchesAuditor && matchesTown;
  });

  const handleDateChange = (days) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  useEffect(() => {
    if (token && token !== "undefined" && token !== "null") {
      fetchTasks();
    }
  }, [token, selectedDate]);


  const handleFileChange = (e) => setCsvFile(e.target.files[0]);

  const handleUpload = () => {
    if (!csvFile) return;
    Papa.parse(csvFile, {
      header: true,
      complete: async (results) => {
        try {
          const config = { headers: { Authorization: `Bearer ${token}` } };
          const { data } = await axios.post(`${apiUrl}/upload-tasks`, { tasks: results.data, scheduledDate: selectedDate }, config);
          alert(data.message);
          setOpenUpload(false);
          fetchTasks();
        } catch (error) {
          alert(error.response?.data?.message || "Upload failed");
          if (error.response && error.response.status === 401) {
            dispatch(logoutAuditUser());
            window.location.href = '/audit/login';
          }
        }
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
      field: 'contact_number', headerName: 'Contact', width: 120,
      renderCell: (p) => <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{p.row.siteDetails?.["CUST CONT"] || '-'}</Typography>
    },
    {
      field: 'auditor', headerName: 'Auditor', width: 150,
      renderCell: (p) => p.row.auditor ? <Chip label={p.row.auditor.name} size="small" /> : <Typography variant="caption" color="text.secondary">Unassigned</Typography>
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (p) => {
        let color = 'default';
        if (p.value === 'Submitted') color = 'success';
        if (p.value === 'In Progress') color = 'primary';
        if (p.value === 'Pending') color = 'warning';
        return <Chip label={p.value} size="small" color={color} variant={p.value === 'Pending' ? 'outlined' : 'filled'} />;
      }
    },
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
      <Paper sx={{ p: 2, mb: 4, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Top Row: Date & Bulk Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              <Chip label={`${filteredTasks.length} Visible / ${tasks.length} Total`} color="primary" sx={{ fontWeight: 800 }} />
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small" color="inherit" onClick={() => handleBulkVisibility(false)}>Hide All</Button>
              <Button variant="outlined" size="small" onClick={() => handleBulkVisibility(true)}>Show All</Button>
              <Button variant="contained" size="small" startIcon={<CloudUploadIcon />} onClick={() => setOpenUpload(true)}>Import CSV</Button>
            </Box>
          </Box>

          {/* Bottom Row: Search & Advanced Filters */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search SLID or Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flexGrow: 1, minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon size="small" sx={{ opacity: 0.5 }} />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="All">All Statuses</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Submitted">Submitted</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
                <MenuItem value="Re-Audit">Re-Audit</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="town-filter-label">Town</InputLabel>
              <Select
                labelId="town-filter-label"
                value={townFilter}
                label="Town"
                onChange={(e) => setTownFilter(e.target.value)}
              >
                <MenuItem value="All">All Towns</MenuItem>
                {uniqueTowns.map(town => (
                  <MenuItem key={town} value={town}>{town}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="auditor-filter-label">Auditor</InputLabel>
              <Select
                labelId="auditor-filter-label"
                value={auditorFilter}
                label="Auditor"
                onChange={(e) => setAuditorFilter(e.target.value)}
              >
                <MenuItem value="All">All Auditors</MenuItem>
                {uniqueAuditors.map(auditor => (
                  <MenuItem key={auditor} value={auditor}>{auditor}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {(searchQuery || statusFilter !== "All" || townFilter !== "All" || auditorFilter !== "All") && (
              <Button
                size="small"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("All");
                  setTownFilter("All");
                  setAuditorFilter("All");
                }}
              >
                Clear Filters
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}><ManualTaskForm apiUrl={apiUrl} token={token} onSuccess={fetchTasks} defaultDate={selectedDate} /></Grid>
        <Grid item xs={12} md={8} sx={{ height: 600 }}><DataGrid rows={filteredTasks} columns={columns} getRowId={r => r._id} density="compact" slots={{ toolbar: GridToolbar }} /></Grid>
      </Grid>
      <RescheduleDialog open={openReschedule} onClose={() => setOpenReschedule(false)} onConfirm={handleReschedule} initialDate={taskToReschedule?.scheduledDate?.split("T")[0]} />
      <Dialog open={openUpload} onClose={() => setOpenUpload(false)} fullScreen>
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
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    activeAuditors: 0
  });
  const [auditorStats, setAuditorStats] = useState([]);
  const [allTasks, setAllTasks] = useState([]); // Store all tasks for analytics
  const [settings, setSettings] = useState(null);


  const { auditUser } = useSelector((state) => state.audit);

  const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5001"}/api/audit`;

  // Hardened token computation with fallback
  const token = (auditUser?.token && auditUser.token !== "undefined" && auditUser.token !== "null")
    ? auditUser.token
    : (localStorage.getItem("accessToken") && localStorage.getItem("accessToken") !== "undefined" && localStorage.getItem("accessToken") !== "null")
      ? localStorage.getItem("accessToken")
      : null;

  // Fetch Dashboard Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };

        // 1. Fetch Key Metrics (Using All Tasks to capture unassigned ones too)
        const tasksReq = axios.get(`${API_URL}/all-tasks`, config);
        // 2. Fetch Auditor Performance
        const statsReq = axios.get(`${API_URL}/stats`, config);
        // 3. Fetch Settings
        const settingsReq = api.get("/settings");

        const [tasksRes, statsRes, settingsRes] = await Promise.all([tasksReq, statsReq, settingsReq]);
        const tasks = tasksRes.data;
        const stats = statsRes.data;
        const settingsData = settingsRes.data;

        // Compute Totals form All Tasks
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'Submitted' || t.status === 'Approved').length;
        const pending = tasks.length - completed;

        // Active auditors from stats
        const activeAuditors = stats.length;

        setDashboardStats({ total, pending, completed, activeAuditors });
        setAuditorStats(stats);
        setAllTasks(tasks);
        setSettings(settingsData);

      } catch (error) {
        console.error("Dashboard fetch failed", error);
        if (error.response && error.response.status === 401) {
          dispatch(logoutAuditUser());
          navigate('/audit/login');
        }
      }
    };

    if (token && token !== "undefined" && token !== "null") {
      fetchData();
    }
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
        <Box sx={{ mt: 4 }}>
          {tabIndex === 0 && (
            <Box>
              <AnalyticsCharts tasks={allTasks} settings={settings} />
              <Typography variant="h6" sx={{ mb: 3, mt: 6, fontWeight: 800 }}>Detailed Auditor Performance</Typography>
              <UserStatsTable stats={auditorStats} />
            </Box>
          )}
          {tabIndex === 1 && <TaskManagement apiUrl={API_URL} token={token} />}
          {tabIndex === 2 && <DetailedTaskReview apiUrl={API_URL} token={token} />}
          {tabIndex === 3 && <UserManagement apiUrl={API_URL} token={token} />}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default AuditAdminDashboard;
