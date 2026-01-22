import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";

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
  ToggleButtonGroup,
  Autocomplete,
  Alert,
  Badge,
  Divider // Added
} from "@mui/material";
import { styled } from "@mui/material/styles"; // Added for ScrollView
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import AssessmentIcon from "@mui/icons-material/Assessment";
import RateReviewIcon from "@mui/icons-material/RateReview";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera"; // Added
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
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
import AuditAssignmentWizard from './AuditAssignmentWizard';


// Expandable Note Component for long checklist comments
const ExpandableNote = ({ text }) => {
  const [expanded, setExpanded] = React.useState(false);
  const maxLength = 60;

  if (!text) return <Typography variant="body2" color="text.secondary">Consistent with standards.</Typography>;

  const shouldShowMore = text.length > maxLength;
  const displayedText = expanded ? text : text.slice(0, maxLength);

  return (
    <Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          display: 'inline',
          fontWeight: 400
        }}
      >
        {displayedText}
        {!expanded && shouldShowMore && "..."}
      </Typography>
      {shouldShowMore && (
        <Button
          size="small"
          onClick={() => setExpanded(!expanded)}
          sx={{
            display: 'inline-block',
            ml: 0.5,
            p: 0,
            minWidth: 'auto',
            textTransform: 'none',
            fontSize: '0.7rem',
            color: 'primary.main',
            verticalAlign: 'baseline',
            height: 'auto',
            '&:hover': { background: 'transparent', textDecoration: 'underline' }
          }}
        >
          {expanded ? "read less" : "read more"}
        </Button>
      )}
    </Box>
  );
};

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





// Import Dialog Component
// Helper to parse Excel dates
const parseExcelDate = (value) => {
  if (!value) return null;
  // If number (Excel serial date)
  if (typeof value === 'number') {
    return new Date(Math.round((value - 25569) * 86400 * 1000)).toISOString().split('T')[0];
  }
  // If string, try standard parsing
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
};

// Normalize keys (fuzzy match)
const normalizeKey = (key) => {
  const k = key.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (['slid', 'siteid', 'site'].includes(k)) return 'slid';
  if (['int', 'int#', 'intno', 'internalid'].includes(k)) return 'slid';
  if (['scheduleddate', 'date', 'schedule', 'auditdate'].includes(k)) return 'scheduledDate';
  if (['auditor', 'auditorname', 'assignedto'].includes(k)) return 'auditorName';
  return key.toString().trim();
};

const ImportTaskDialog = ({ open, onClose, onSuccess, apiUrl, token }) => {
  const [file, setFile] = useState(null);
  const [analyzedData, setAnalyzedData] = useState({ valid: [], invalid: [], keys: [] });
  const [uploading, setUploading] = useState(false);
  const [assignmentStrategy, setAssignmentStrategy] = useState('round-robin');
  const [step, setStep] = useState(0);

  const resetState = () => {
    setFile(null);
    setAnalyzedData({ valid: [], invalid: [], keys: [] });
    setStep(0);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // Use defval: "" to ensure we get explicit empty strings for cells
        const rawData = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const processed = { valid: [], invalid: [], keys: new Set() };

        rawData.forEach((row, index) => {
          // 1. Strict Empty Row Check: Join all values and check if empty
          const rowString = Object.values(row).map(v => v.toString().trim()).join('');
          if (rowString.length === 0) return;

          const newRow = {};
          let idValue = null;
          let dateValue = null;

          // Pass 1: Copy ALL data to newRow with trimmed keys AND look for ID/Date
          Object.keys(row).forEach(key => {
            const cleanVal = row[key];
            const trimmedKey = key.trim();
            if (!trimmedKey) return;

            // Add to dynamic keys list for preview
            processed.keys.add(trimmedKey);

            // Always preserve original data
            newRow[trimmedKey] = cleanVal;

            // Check for Special meanings
            const normKey = normalizeKey(trimmedKey);

            if (normKey === 'slid') {
              if (cleanVal && cleanVal.toString().trim().length > 0 && cleanVal.toString().trim() !== '-') {
                idValue = cleanVal.toString().trim();
              }
            }
            if (normKey === 'scheduledDate') {
              const parsedDate = parseExcelDate(cleanVal);
              if (parsedDate) dateValue = parsedDate;
            }
          });

          // Pass 2: Assign core fields (slid, scheduledDate)
          if (idValue) newRow.slid = idValue;
          newRow.scheduledDate = dateValue || new Date().toISOString().split('T')[0]; // Default to today

          // Store
          if (newRow.slid) {
            processed.valid.push(newRow);
          } else {
            processed.invalid.push({ row: index + 2, reason: "Missing / Invalid SLID or INT#", data: row });
          }
        });

        setAnalyzedData({
          valid: processed.valid,
          invalid: processed.invalid,
          keys: Array.from(processed.keys)
        });
        setStep(1);

      } catch (err) {
        alert("Error parsing file: " + err.message);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleUpload = async () => {
    if (analyzedData.valid.length === 0) return;
    setUploading(true);
    try {
      const payload = {
        tasks: analyzedData.valid,
        assignmentStrategy,
        autoAssign: true
      };

      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`${apiUrl}/upload-tasks`, payload, config);

      alert(`Successfully imported ${res.data.count || analyzedData.valid.length} tasks!`);
      onSuccess();
      onClose();
      resetState();
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed: " + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => { onClose(); resetState(); }} fullWidth maxWidth="lg" PaperProps={{ sx: { background: '#0a0a0a', border: '1px solid #333', minHeight: '60vh' } }}>
      <DialogTitle sx={{ color: '#fff', borderBottom: '1px solid #333' }}>
        Bulk Task Import
        {step === 1 && <Chip label={`${analyzedData.valid.length} Tasks Ready`} color="success" size="small" sx={{ ml: 2, fontWeight: 800 }} />}
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {step === 0 && (
          <Box sx={{ p: 4, textAlign: 'center', mt: 4 }}>
            <input accept=".xlsx, .xls, .csv" style={{ display: 'none' }} id="upload-file-input" type="file" onChange={handleFileChange} />
            <label htmlFor="upload-file-input">
              <Button variant="outlined" component="span" sx={{ p: 4, border: '2px dashed #444', borderRadius: 4, width: '100%', textTransform: 'none' }}>
                <Box>
                  <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.primary">Click to Select Excel File</Typography>
                  <Typography variant="body2" color="text.secondary">Supported: .xlsx, .xls</Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 2, color: 'info.main' }}>
                    Supports <b>SLID</b>, <b>INT#</b>, or <b>Site ID</b> as Identifier
                  </Typography>
                </Box>
              </Button>
            </label>
          </Box>
        )}

        {step === 1 && (
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', height: '100%' }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase' }}>Configuration</Typography>
                  <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                    <InputLabel>Assignment Strategy</InputLabel>
                    <Select value={assignmentStrategy} label="Assignment Strategy" onChange={(e) => setAssignmentStrategy(e.target.value)}>
                      <MenuItem value="round-robin">Round Robin</MenuItem>
                      <MenuItem value="workload-balanced">Workload Balanced</MenuItem>
                      <MenuItem value="geographic">Geographic (Town)</MenuItem>
                    </Select>
                  </FormControl>

                  <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

                  <Typography variant="subtitle2" color="error" sx={{ mb: 1 }}>Skipped Rows ({analyzedData.invalid.length})</Typography>
                  <ScrollView sx={{ maxHeight: 200, overflowY: 'auto' }}>
                    {analyzedData.invalid.slice(0, 100).map((err, i) => (
                      <Typography key={i} variant="caption" display="block" color="error" sx={{ mb: 0.5 }}>
                        Row {err.row}: {err.reason}
                      </Typography>
                    ))}
                    {analyzedData.invalid.length > 100 && <Typography variant="caption" color="text.secondary">...and {analyzedData.invalid.length - 100} more</Typography>}
                    {analyzedData.invalid.length === 0 && <Typography variant="caption" color="text.secondary">No errors found.</Typography>}
                  </ScrollView>
                </Paper>
              </Grid>

              <Grid item xs={12} md={9}>
                <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                  Preview ({analyzedData.valid.length} rows ready)
                </Typography>
                <TableContainer component={Paper} sx={{ height: 400, bgcolor: 'transparent', border: '1px solid #333' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ bgcolor: '#111', color: '#fff', fontWeight: 800 }}>ID (SLID/INT#)</TableCell>
                        <TableCell sx={{ bgcolor: '#111', color: '#fff', fontWeight: 800 }}>Date</TableCell>
                        {analyzedData.keys.slice(0, 6).map(k => (
                          <TableCell key={k} sx={{ bgcolor: '#111', color: '#aaa', whiteSpace: 'nowrap' }}>{k}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analyzedData.valid.slice(0, 100).map((row, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ color: '#fff', fontWeight: 700 }}>{row.slid}</TableCell>
                          <TableCell sx={{ color: '#aaa' }}>{row.scheduledDate}</TableCell>
                          {analyzedData.keys.slice(0, 6).map((k, j) => (
                            <TableCell key={j} sx={{ color: '#aaa', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row[k]?.toString() || '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'right', color: 'text.secondary' }}>
                  * Showing first 100 tasks only
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #333' }}>
        {step === 1 && <Button onClick={resetState} color="inherit">Back to Select File</Button>}
        <Button onClick={() => { onClose(); resetState(); }} color="inherit">Cancel</Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={step === 0 || analyzedData.valid.length === 0 || uploading}
          startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
          sx={{ fontWeight: 800, px: 4 }}
        >
          {uploading ? "Importing..." : `Import ${analyzedData.valid.length} Tasks`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
const ScrollView = styled(Box)({});

const ManualTaskForm = ({ apiUrl, token, onSuccess, defaultDate }) => {
  // Core Meta Fields
  const [meta, setMeta] = useState({
    slid: "",
    auditorId: "",
    scheduledDate: defaultDate || new Date().toISOString().split('T')[0]
  });

  // Dynamic Site Details - Initialized with empty strings for controlled inputs
  const [details, setDetails] = useState({
    "INSTALLATION TEAM": "", "SPLICING TEAM": "", "REQ #": "", "INT #": "", "OPERATION": "",
    "CBU/EBU": "", "VOIP": "", "MODEM TYPE": "", "FREE AirTies": "", "CUST NAME": "",
    "FEEDBACK FOR ORANGE": "", "FEEDBACK DETAILS": "", "CUST CONT": "", "Governorate": "",
    "TOWN": "", "DISTRICT": "", "STREET": "", "BUILDING": "", "SPEED": "", "USERNAME": "",
    "PW": "", "DISPATSHER NAME": "", "APP DATE": "", "APP TIME": "", "ORANGE COMMENT": "",
    "FDB #": "", "Splitter #": "", "Splitter Port #": "", "BEP #": "", "BEP Port #": "",
    "Comment": "", "New / Change": "", "Drop Cable": "", "No Of Drop Cable": "",
    "L1083-4 CABLE IMM 4FO MODULO 4 FTTH (N9730A)Drop Indoor/Outdoor": "",
    "Indoor Cable Type": "", "Indoor Cable": "", "Galvanized Steel Hook": "",
    "Drop Anchor": "", "Splicing Qty": "", "Poles": "", "Microtrenching": "",
    "Digging Asphalt": "", "Digging": "", "PVC Pipe": "",
    "BEP Floor MOUNTED BOX up to 12 Splices - Verthor Box": "", "Trunk": "", "Patch Cord": "",
    "Fiber Termination Box, 1 fibers (OTO)": "", "Plastic Elbow": "", "Rainy Protection Box": "",
    "PVC Coupler": "", "U gard": "", "ONT SN": "", "ONT Type": "", "Power ((-)dbm)": "",
    "Pigtail": "", "BEP STICKER": "", "AIRTIES SN": "", "Suspension Console": "",
    "EXT-Type": "", "OTO approval": "", "Area": "", "Lat": "", "Long": ""
  });

  const [fieldTeams, setFieldTeams] = useState([]);
  const [auditors, setAuditors] = useState([]);
  const [slidExists, setSlidExists] = useState(false);
  const [checkingSlid, setCheckingSlid] = useState(false);

  useEffect(() => {
    if (defaultDate) setMeta(prev => ({ ...prev, scheduledDate: defaultDate }));
  }, [defaultDate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const [audData, teamData] = await Promise.all([
          axios.get(`${apiUrl}/stats`, config),
          api.get('/field-teams/get-field-teams')
        ]);
        setAuditors(audData.data);
        setFieldTeams(teamData.data);
      } catch (error) { console.error("Fetch Data Error", error); }
    };
    fetchData();
  }, [apiUrl, token]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (meta.slid && meta.slid.trim() !== "") {
        setCheckingSlid(true);
        try {
          const config = { headers: { Authorization: `Bearer ${token}` } };
          const { data } = await axios.get(`${apiUrl}/check-slid/${meta.slid.trim()}`, config);
          setSlidExists(data.exists);
        } catch (error) { console.error("SLID check failed", error); }
        finally { setCheckingSlid(false); }
      } else { setSlidExists(false); }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [meta.slid, apiUrl, token]);

  const handleMetaChange = (e) => setMeta({ ...meta, [e.target.name]: e.target.value });
  const handleDetailChange = (e) => setDetails({ ...details, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        slid: meta.slid,
        auditorId: meta.auditorId,
        scheduledDate: meta.scheduledDate,
        siteDetails: details
      };
      await axios.post(`${apiUrl}/manual-task`, payload, config);
      alert("Task created manually!");

      // Reset
      setMeta(p => ({ ...p, slid: "", auditorId: "" })); // Keep date
      const resetDetails = Object.keys(details).reduce((acc, key) => ({ ...acc, [key]: "" }), {});
      setDetails(resetDetails);

      onSuccess();
    } catch (error) {
      alert("Error: " + (error.response?.data?.message || error.message));
    }
  };

  const renderTextField = (label, name, width = 4) => (
    <Grid item xs={12} sm={width} key={name}>
      <TextField
        fullWidth size="small"
        label={label} name={name}
        value={details[name] || ""}
        onChange={handleDetailChange}
        InputLabelProps={{ style: { fontSize: '0.8rem' } }}
      />
    </Grid>
  );

  return (
    <Paper sx={{ p: 4, mb: 4, border: '1px solid rgba(255,255,255,0.1)' }}>
      <Typography variant="h6" gutterBottom color="primary" sx={{ mb: 3, fontWeight: 800 }}>
        Create New Field Audit Task
      </Typography>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, mt: 1, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1 }}>Job Identification</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth size="small" label="SLID" name="slid" required
            value={meta.slid} onChange={handleMetaChange}
            error={slidExists} helperText={slidExists ? "Exists!" : ""}
            InputProps={{ endAdornment: checkingSlid && <CircularProgress size={15} /> }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            type="date" fullWidth size="small" label="Scheduled Date" name="scheduledDate"
            value={meta.scheduledDate} onChange={handleMetaChange}
            InputLabelProps={{ shrink: true }} required
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField select fullWidth size="small" label="Auditor" name="auditorId" value={meta.auditorId} onChange={handleMetaChange} SelectProps={{ native: true }} InputLabelProps={{ shrink: true }}>
            <option value="">-- Pending --</option>
            {auditors.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
          </TextField>
        </Grid>
        {renderTextField("REQ #", "REQ #", 3)}
        {renderTextField("INT #", "INT #", 3)}
        {renderTextField("Operation", "OPERATION", 3)}
        {renderTextField("CBU/EBU", "CBU/EBU", 3)}
        {renderTextField("App Date", "APP DATE", 3)}
        {renderTextField("App Time", "APP TIME", 3)}
        {renderTextField("Dispatcher", "DISPATSHER NAME", 3)}
      </Grid>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1 }}>Customer & Location</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {renderTextField("Customer Name", "CUST NAME", 6)}
        {renderTextField("Contact #", "CUST CONT", 6)}
        {renderTextField("Username", "USERNAME", 4)}
        {renderTextField("Password", "PW", 4)}
        {renderTextField("Governorate", "Governorate", 4)}
        {renderTextField("Town", "TOWN", 4)}
        {renderTextField("District", "DISTRICT", 4)}
        {renderTextField("Area", "Area", 4)}
        {renderTextField("Street", "STREET", 6)}
        {renderTextField("Building", "BUILDING", 6)}
        {renderTextField("Latitude", "Lat", 3)}
        {renderTextField("Longitude", "Long", 3)}
      </Grid>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1 }}>Technical Specifications</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {renderTextField("Speed", "SPEED", 3)}
        {renderTextField("Modem Type", "MODEM TYPE", 3)}
        {renderTextField("VOIP", "VOIP", 3)}
        {renderTextField("ONT Type", "ONT Type", 3)}
        {renderTextField("ONT SN", "ONT SN", 4)}
        {renderTextField("Power (dBm)", "Power ((-)dbm)", 4)}
        {renderTextField("Pigtail", "Pigtail", 4)}
        {renderTextField("Free AirTies", "FREE AirTies", 3)}
        {renderTextField("AirTies SN", "AIRTIES SN", 3)}
        {renderTextField("Extender Type", "EXT-Type", 3)}
        {renderTextField("Suspension Console", "Suspension Console", 3)}
      </Grid>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1 }}>Infrastructure & Materials</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Autocomplete
            options={fieldTeams} getOptionLabel={(o) => o.teamName || ""}
            value={fieldTeams.find(t => t.teamName === details["INSTALLATION TEAM"]) || null}
            onChange={(e, v) => setDetails({ ...details, "INSTALLATION TEAM": v ? v.teamName : "" })}
            renderInput={(params) => <TextField {...params} label="Install Team" size="small" />}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Autocomplete
            options={fieldTeams} getOptionLabel={(o) => o.teamName || ""}
            value={fieldTeams.find(t => t.teamName === details["SPLICING TEAM"]) || null}
            onChange={(e, v) => setDetails({ ...details, "SPLICING TEAM": v ? v.teamName : "" })}
            renderInput={(params) => <TextField {...params} label="Splice Team" size="small" />}
          />
        </Grid>
        {renderTextField("Splitter #", "Splitter #", 4)}
        {renderTextField("Splitter Port", "Splitter Port #", 3)}
        {renderTextField("BEP #", "BEP #", 3)}
        {renderTextField("BEP Port", "BEP Port #", 3)}
        {renderTextField("FDB #", "FDB #", 3)}
        {renderTextField("Trunk", "Trunk", 3)}
        {renderTextField("Fiber Box (OTO)", "Fiber Termination Box, 1 fibers (OTO)", 3)}
        {renderTextField("OTO Approval", "OTO approval", 3)}
        {renderTextField("Drop Cable", "Drop Cable", 3)}
        {renderTextField("Num Drop Cable", "No Of Drop Cable", 3)}
        {renderTextField("Indoor Cable", "Indoor Cable", 3)}
        {renderTextField("Poles", "Poles", 2)}
        {renderTextField("Digging", "Digging", 2)}
        {renderTextField("PVC Pipe", "PVC Pipe", 2)}
        {renderTextField("Patch Cord", "Patch Cord", 3)}
        {renderTextField("Galvanized Hook", "Galvanized Steel Hook", 3)}
        {renderTextField("Drop Anchor", "Drop Anchor", 3)}
        {renderTextField("Plastic Elbow", "Plastic Elbow", 3)}
        {renderTextField("U-Guard", "U gard", 3)}
        {renderTextField("Rainy Box", "Rainy Protection Box", 3)}
        {renderTextField("BEP Sticker", "BEP STICKER", 3)}
      </Grid>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1 }}>Feedback</Typography>
      <Grid container spacing={2}>
        {renderTextField("Feedback for Orange", "FEEDBACK FOR ORANGE", 6)}
        {renderTextField("Details", "FEEDBACK DETAILS", 6)}
        {renderTextField("Orange Comment", "ORANGE COMMENT", 6)}
        {renderTextField("General Comment", "Comment", 6)}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Button
          variant="contained" size="large" onClick={handleSubmit} startIcon={<AddCircleIcon />} fullWidth
          disabled={slidExists || checkingSlid || !meta.slid}
          sx={{ fontWeight: 800, borderRadius: 2 }}
        >
          Create Task
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
      { Section: "METADATA", Item: "Final Feedback", Value: selectedTask.finalFeedback || "" },
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
          Evidence: photo ? (photo.url.startsWith('http') ? photo.url : `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}${photo.url}`) : ""
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
        const imageUrl = photo.url.startsWith('http') ? photo.url : `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}${photo.url}`;
        const response = await fetch(imageUrl);
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
    { field: 'slid', headerName: 'SLID', width: 130, renderCell: (p) => <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main', fontFamily: 'monospace' }}>{p.value}</Typography> },
    {
      field: 'auditor',
      headerName: 'Auditor',
      width: 180,
      renderCell: (p) => p.row.auditor ?
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'secondary.main' }}>{p.row.auditor.name.charAt(0)}</Avatar>
          <Typography variant="body2">{p.row.auditor.name}</Typography>
        </Box> : "Unknown"
    },
    {
      field: 'compliance',
      headerName: 'Compliance',
      width: 140,
      valueGetter: (params) => {
        if (!params.row.checklist) return 0;
        const total = params.row.checklist.length;
        const ok = params.row.checklist.filter(c => c.status === 'OK').length;
        return total > 0 ? (ok / total) * 100 : 0;
      },
      renderCell: (p) => (
        <Box sx={{ width: '100%', pr: 2 }}>
          <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 700, color: p.value >= 90 ? '#00f5d4' : '#f44336' }}>
            {Math.round(p.value)}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={p.value}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': { bgcolor: p.value >= 90 ? '#00f5d4' : '#f44336' }
            }}
          />
        </Box>
      )
    },
    {
      field: 'issues',
      headerName: 'Issues (N.OK)',
      width: 130,
      valueGetter: (params) => params.row.checklist?.filter(c => c.status === 'N.OK').length || 0,
      renderCell: (p) => p.value > 0 ? <Chip label={`${p.value} Issues`} size="small" color="error" variant="outlined" /> : <Chip label="Pass" size="small" color="success" variant="outlined" />
    },
    {
      field: 'photos',
      headerName: 'Evidence',
      width: 100,
      renderCell: (p) => (
        <Badge badgeContent={p.row.photos?.length || 0} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 16, minWidth: 16 } }}>
          <PhotoCameraIcon sx={{ color: 'text.secondary' }} />
        </Badge>
      )
    },
    {
      field: 'updatedAt',
      headerName: 'Submitted',
      width: 150,
      renderCell: (p) => <Typography variant="caption" color="text.secondary">{new Date(p.value).toLocaleDateString()} {new Date(p.value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (p) => <Chip label={p.value} color={p.value === 'Approved' ? "success" : "info"} size="small" sx={{ fontWeight: 800 }} />
    },
    {
      field: 'action',
      headerName: 'Action',
      width: 140,
      renderCell: (p) => (
        <Button size="small" variant="contained" onClick={() => { setSelectedTask(p.row); setOpenDetail(true); }} sx={{ textTransform: 'none', borderRadius: 1 }}>
          View Report
        </Button>
      )
    }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Audit Reports Portfolio</Typography>
        <Tooltip title="Refresh Reports">
          <IconButton onClick={fetchSubmitted} color="primary" sx={{ border: '1px solid', borderColor: 'divider' }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={submittedTasks}
          columns={columns}
          getRowId={(r) => r._id}
          density="compact"
          slots={{ toolbar: GridToolbar }}
          checkboxSelection
          disableRowSelectionOnClick
        />
      </Box>
      {/* Detail Dialog */}
      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} fullScreen>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: '#000' }}>
          <Typography variant="h6" component="span" fontWeight="bold">Audit Report: {selectedTask?.slid}</Typography>
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
                      <Typography variant="button" sx={{ color: 'primary.main', fontWeight: 800, mb: 1, display: 'block' }}>Identification & Site Details</Typography>
                    </Grid>
                    {/* Render Primary Fields plus ALL dynamic details */}
                    {[
                      { l: 'SLID', v: selectedTask.slid },
                      { l: 'Auditor', v: selectedTask.auditor?.name },
                      { l: 'Scheduled', v: new Date(selectedTask.scheduledDate).toLocaleDateString() },
                      { l: 'Submitted', v: new Date(selectedTask.updatedAt).toLocaleDateString() },
                      // Spread all other siteDetails here
                      ...Object.entries(selectedTask.siteDetails || {}).filter(([k]) => k !== 'SLID').map(([k, v]) => ({ l: k, v }))
                    ].map(item => (
                      <Grid item xs={6} sm={4} md={3} key={item.l}>
                        <Paper sx={{ p: 2, bgcolor: 'transparent', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 0, height: '100%' }}>
                          <Typography variant="caption" sx={{ display: 'block', opacity: 0.5, fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', mb: 0.5 }}>{item.l}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, wordBreak: 'break-word', fontSize: '0.8rem' }}>{item.v || '-'}</Typography>
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
                            <TableCell sx={{ maxWidth: 350 }}>
                              <ExpandableNote text={item.notes} />
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
                            src={photo.url.startsWith('http') ? photo.url : `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}${photo.url}`}
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

              {/* Final Feedback Section */}
              {selectedTask.finalFeedback && (
                <Box sx={{ mt: 6, mb: 4 }}>
                  <Typography variant="h6" sx={{ fontWeight: 900, borderLeft: '4px solid', borderColor: 'primary.main', pl: 2, mb: 2 }}>FINAL AUDITOR FEEDBACK</Typography>
                  <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 0 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, opacity: 0.9 }}>
                      {selectedTask.finalFeedback}
                    </Typography>
                  </Paper>
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
            <Typography variant="h6" component="span" fontWeight="bold">
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
              src={previewImage.url.startsWith('http') ? previewImage.url : `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}${previewImage.url}`}
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

  const handleDelete = async (user) => {
    if (window.confirm(`Are you sure you want to delete auditor: ${user.name}?\n\nThis action cannot be undone.`)) {
      try {
        const { data } = await axios.delete(`${apiUrl}/users/${user._id}`, { headers: { Authorization: `Bearer ${token}` } });
        alert(data.message || "Auditor deleted successfully");
        fetchUsers();
      } catch (error) {
        if (error.response?.status === 400) {
          // Validation error - auditor has assigned tasks
          const { message, assignedTasks, suggestion } = error.response.data;
          alert(`${message}\n\n${suggestion}`);
        } else {
          alert(error.response?.data?.message || "Failed to delete auditor");
        }
      }
    }
  };

  const columns = [
    { field: 'username', headerName: 'Username', width: 120, renderCell: (p) => <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main', fontFamily: 'monospace' }}>{p.value}</Typography> },
    {
      field: 'name',
      headerName: 'Full Name',
      flex: 1,
      renderCell: (p) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'secondary.main', width: 28, height: 28, fontSize: '0.75rem' }}>{p.value.charAt(0)}</Avatar>
          <Typography variant="body2" fontWeight="600">{p.value}</Typography>
        </Box>
      )
    },
    { field: 'email', headerName: 'Email', flex: 1.2, renderCell: (p) => <Typography variant="caption" color="text.secondary">{p.value}</Typography> },
    {
      field: 'role',
      headerName: 'Role',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          variant="outlined"
          color={params.value === 'admin' ? "error" : "default"}
          sx={{ borderColor: params.value === 'admin' ? 'error.main' : 'rgba(255,255,255,0.2)', fontWeight: 700 }}
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Box>
          <IconButton color="primary" size="small" onClick={() => { setEditingUser(params.row); setEditFormData({ name: params.row.name, username: params.row.username, password: "" }); setEditOpen(true); }} sx={{ mr: 1, bgcolor: 'rgba(62,166,255,0.1)' }}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton color="error" size="small" onClick={() => handleDelete(params.row)} sx={{ bgcolor: 'rgba(244,67,54,0.1)' }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      )
    }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>User & Access Control</Typography>
        <Tooltip title="Refresh User List">
          <IconButton onClick={fetchUsers} color="primary" sx={{ border: '1px solid', borderColor: 'divider' }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
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
    </Box>
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

const UserStatsTable = ({ tasks = [] }) => { // Changed prop from stats to tasks

  // Compute aggregated stats per auditor
  const rows = React.useMemo(() => {
    const auditorMap = {};

    tasks.forEach(task => {
      if (!task.auditor) return;
      const id = task.auditor._id || task.auditor.id || task.auditor.email;
      const name = task.auditor.name || task.auditor.email || "Unknown";

      if (!auditorMap[id]) {
        auditorMap[id] = {
          id,
          name,
          email: task.auditor.email,
          total: 0,
          pending: 0,
          completed: 0,
          okChecks: 0,
          totalChecks: 0,
          lastActive: null
        };
      }

      const auditor = auditorMap[id];
      auditor.total++;

      if (task.status === 'Submitted' || task.status === 'Approved') {
        auditor.completed++;
        // Compliance calc
        if (task.checklist) {
          task.checklist.forEach(c => {
            auditor.totalChecks++;
            if (c.status === 'OK') auditor.okChecks++;
          });
        }
      } else {
        auditor.pending++;
      }

      // Last Active
      const taskDate = new Date(task.updatedAt);
      if (!auditor.lastActive || taskDate > auditor.lastActive) {
        auditor.lastActive = taskDate;
      }
    });

    return Object.values(auditorMap).map(a => {
      const compliance = a.totalChecks > 0 ? (a.okChecks / a.totalChecks) * 100 : 0;
      let grade = 'F';
      if (compliance >= 95) grade = 'A+';
      else if (compliance >= 90) grade = 'A';
      else if (compliance >= 80) grade = 'B';
      else if (compliance >= 70) grade = 'C';

      return {
        ...a,
        compliance,
        grade,
        successRate: a.total > 0 ? (a.completed / a.total) * 100 : 0
      };
    });
  }, [tasks]);

  const columns = [
    {
      field: 'name',
      headerName: 'Auditor',
      width: 250,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#333', color: '#fff', width: 32, height: 32, fontSize: '0.8rem', borderRadius: 1, border: '1px solid #444' }}>
            {params.value.charAt(0)}
          </Avatar>
          <Box sx={{ lineHeight: 1.2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>{params.value}</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>{params.row.email}</Typography>
          </Box>
        </Box>
      )
    },
    {
      field: 'grade',
      headerName: 'Grade',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (p) => {
        const color = p.value.startsWith('A') ? '#00f5d4' : p.value === 'B' ? '#4caf50' : p.value === 'C' ? '#ff9800' : '#f44336';
        return (
          <Box sx={{
            bgcolor: `${color}22`,
            color: color,
            border: `1px solid ${color}44`,
            borderRadius: 1,
            width: 36,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.85rem'
          }}>
            {p.value}
          </Box>
        )
      }
    },
    {
      field: 'compliance',
      headerName: 'Compliance',
      width: 140,
      renderCell: (p) => (
        <Box sx={{ width: '100%' }}>
          <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 700, color: p.value >= 90 ? '#00f5d4' : '#f44336' }}>
            {Math.round(p.value)}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={p.value}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': { bgcolor: p.value >= 90 ? '#00f5d4' : '#f44336' }
            }}
          />
        </Box>
      )
    },
    { field: 'total', headerName: 'Total', width: 90, type: 'number', headerAlign: 'center', align: 'center' },
    { field: 'completed', headerName: 'Done', width: 90, type: 'number', headerAlign: 'center', align: 'center', renderCell: p => <span style={{ color: '#aaa' }}>{p.value}</span> },
    { field: 'pending', headerName: 'Pending', width: 90, type: 'number', headerAlign: 'center', align: 'center', renderCell: p => <span style={{ color: '#f44336' }}>{p.value}</span> },
    {
      field: 'lastActive',
      headerName: 'Last Active',
      flex: 1,
      minWidth: 150,
      renderCell: (p) => p.value ? <Typography variant="caption" sx={{ color: '#aaa' }}>{format(p.value, 'MMM dd, HH:mm')}</Typography> : '-'
    }
  ];

  return (
    <Box sx={{ height: 500, width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
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

const TaskManagement = ({ apiUrl, token, auditors }) => {
  const [tasks, setTasks] = useState([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [openReschedule, setOpenReschedule] = useState(false);
  const [taskToReschedule, setTaskToReschedule] = useState(null);

  // New Features States
  const [openImport, setOpenImport] = useState(false);
  const [selectionModel, setSelectionModel] = useState([]);
  const [openBulkAssign, setOpenBulkAssign] = useState(false);
  const [bulkAuditorId, setBulkAuditorId] = useState("");

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
  const [teamFilter, setTeamFilter] = useState("All");

  const [uniqueTowns, setUniqueTowns] = useState([]);
  const [uniqueAuditors, setUniqueAuditors] = useState([]);
  const [uniqueTeams, setUniqueTeams] = useState([]);

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

      const teams = [...new Set(data.map(t => t.siteDetails?.["INSTALLATION TEAM"]).filter(Boolean))].sort();
      setUniqueTeams(teams);
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
      (task.siteDetails?.["CUST NAME"] || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.siteDetails?.["CUST CONT"] || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || task.status === statusFilter;
    const matchesAuditor = auditorFilter === "All" || task.auditor?.name === auditorFilter;
    const matchesTown = townFilter === "All" || (task.siteDetails?.TOWN || task.siteDetails?.town) === townFilter;
    const matchesTeam = teamFilter === "All" || task.siteDetails?.["INSTALLATION TEAM"] === teamFilter;

    return matchesSearch && matchesStatus && matchesAuditor && matchesTown && matchesTeam;
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


  const handleVisibilityToggle = async (task) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${apiUrl}/tasks/${task._id}/visibility`, {}, config);
      fetchTasks();
    } catch (error) { console.error(error); }
  };

  const handleDelete = async (task) => {
    if (window.confirm(`Are you sure you want to delete task: ${task.slid}?\n\nThis will permanently remove the task and all associated photos from the system.`)) {
      await axios.delete(`${apiUrl}/tasks/${task._id}`, { headers: { Authorization: `Bearer ${token}` } });
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

  const handleBulkAssign = async () => {
    if (!bulkAuditorId || selectionModel.length === 0) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await Promise.all(selectionModel.map(id => axios.put(`${apiUrl}/tasks/${id}/assign`, { auditorId: bulkAuditorId }, config)));
      alert(`Successfully assigned ${selectionModel.length} tasks.`);
      setOpenBulkAssign(false);
      setSelectionModel([]);
      setBulkAuditorId("");
      fetchTasks();
    } catch (error) { alert("Bulk assignment failed."); }
  };

  const columns = [
    { field: 'slid', headerName: 'SLID', width: 130, renderCell: (p) => <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main', fontFamily: 'monospace' }}>{p.value}</Typography> },
    {
      field: 'customer', headerName: 'Cust. / Location', flex: 1.5, minWidth: 200,
      renderCell: (p) => (
        <Box sx={{ py: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#fff' }}>{p.row.siteDetails?.["CUST NAME"] || ' - '}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PlaceIcon sx={{ fontSize: 10 }} />
            {p.row.siteDetails?.TOWN}
          </Typography>
        </Box>
      )
    },
    {
      field: 'installTeam',
      headerName: 'Installation Team',
      width: 150,
      valueGetter: (params) => params.row?.siteDetails?.["INSTALLATION TEAM"] || "N/A",
      renderCell: (p) => <Chip label={p.value} size="small" variant="outlined" sx={{ borderRadius: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
    },
    {
      field: 'daysPending',
      headerName: 'Age',
      width: 100,
      valueGetter: (params) => {
        const date = new Date(params.row.createdAt);
        const diffTime = Math.abs(new Date() - date);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      },
      renderCell: (p) => (
        <Typography variant="caption" sx={{
          color: p.value > 7 ? '#f44336' : p.value > 3 ? '#ff9800' : 'text.secondary',
          fontWeight: 700
        }}>
          {p.value} days
        </Typography>
      )
    },
    {
      field: 'auditor', headerName: 'Auditor', width: 150,
      renderCell: (p) => p.row.auditor ?
        <Chip
          avatar={<Avatar sx={{ bgcolor: 'primary.dark' }}>{p.row.auditor.name.charAt(0)}</Avatar>}
          label={p.row.auditor.name}
          size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}
        /> :
        <Chip label="Unassigned" size="small" variant="outlined" color="error" />
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
        return <Chip label={p.value} size="small" color={color} variant={p.value === 'Pending' ? 'outlined' : 'filled'} sx={{ fontWeight: 700 }} />;
      }
    },
    {
      field: 'updatedAt',
      headerName: 'Last Updated',
      width: 120,
      renderCell: (p) => <Typography variant="caption" color="text.secondary">{new Date(p.value).toLocaleDateString()}</Typography>
    },
    {
      field: 'isVisible', headerName: 'Vis', width: 60,
      renderCell: (p) => (
        <IconButton size="small" onClick={() => handleVisibilityToggle(p.row)} sx={{ opacity: p.value === false ? 0.3 : 1, color: p.value === false ? 'inherit' : 'primary.main' }}>
          {p.value === false ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
        </IconButton>
      )
    },
    {
      field: 'actions', headerName: 'Actions', width: 100,
      renderCell: (p) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Reschedule">
            <IconButton color="primary" size="small" onClick={() => { setTaskToReschedule(p.row); setOpenReschedule(true); }} sx={{ bgcolor: 'rgba(62, 166, 255, 0.1)' }}>
              <CalendarTodayIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton color="error" size="small" onClick={() => handleDelete(p.row)} sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)' }}>
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 4, bgcolor: 'background.paper', border: '1px solid rgba(255, 255, 255, 0.12)', boxShadow: 'none' }}>
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
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'inherit', outline: 'none', fontWeight: 700 }} />
                </Box>
                <IconButton onClick={() => handleDateChange(1)} size="small" sx={{ color: 'primary.main', bgcolor: 'rgba(62, 166, 255, 0.05)' }}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Box>
              <Chip label={`${filteredTasks.length} Visible / ${tasks.length} Total`} color="primary" sx={{ fontWeight: 800 }} />
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Refresh Tasks">
                <IconButton onClick={fetchTasks} color="primary" size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Button variant="outlined" size="small" color="inherit" onClick={() => handleBulkVisibility(false)}>Hide All</Button>
              <Button variant="outlined" size="small" onClick={() => handleBulkVisibility(true)}>Show All</Button>
              {selectionModel.length > 0 && (
                <Button variant="contained" color="secondary" size="small" onClick={() => setOpenBulkAssign(true)} startIcon={<PersonAddIcon />}>
                  Assign ({selectionModel.length})
                </Button>
              )}
              <Button variant="contained" size="small" startIcon={<CloudUploadIcon />} onClick={() => setOpenImport(true)}>Import</Button>
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

            <Autocomplete
              size="small"
              sx={{ minWidth: 200 }}
              options={["All", ...uniqueTeams]}
              value={teamFilter}
              onChange={(event, newValue) => {
                setTeamFilter(newValue || "All");
              }}
              renderInput={(params) => <TextField {...params} label="Team" />}
            />

            {(searchQuery || statusFilter !== "All" || townFilter !== "All" || auditorFilter !== "All" || teamFilter !== "All") && (
              <Button
                size="small"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("All");
                  setTownFilter("All");
                  setAuditorFilter("All");
                  setTeamFilter("All");
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
        <Grid item xs={12} md={8} sx={{ height: 600 }}>
          <DataGrid
            rows={filteredTasks}
            columns={columns}
            getRowId={r => r._id}
            density="compact"
            slots={{ toolbar: GridToolbar }}
            checkboxSelection
            disableRowSelectionOnClick
            rowSelectionModel={selectionModel}
            onRowSelectionModelChange={(newSelection) => setSelectionModel(newSelection)}
          />
        </Grid>
      </Grid>
      <RescheduleDialog open={openReschedule} onClose={() => setOpenReschedule(false)} onConfirm={handleReschedule} initialDate={taskToReschedule?.scheduledDate?.split("T")[0]} />
      <AuditAssignmentWizard
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        onSuccess={() => { fetchTasks(); setOpenUpload(false); }}
        apiUrl={apiUrl}
        token={token}
        auditors={auditors}
      />

      {/* New Import Dialog */}
      <ImportTaskDialog
        open={openImport}
        onClose={() => setOpenImport(false)}
        onSuccess={() => { fetchTasks(); setOpenImport(false); }}
        apiUrl={apiUrl}
        token={token}
      />

      {/* Bulk Assign Dialog */}
      <Dialog open={openBulkAssign} onClose={() => setOpenBulkAssign(false)} PaperProps={{ sx: { bgcolor: '#0a0a0a', border: '1px solid #333' } }}>
        <DialogTitle sx={{ color: '#fff' }}>Assign {selectionModel.length} Tasks</DialogTitle>
        <DialogContent sx={{ pt: 2, minWidth: 300 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Select an auditor to assign the selected tasks to.</Typography>
          <TextField
            select fullWidth label="Select Auditor"
            value={bulkAuditorId} onChange={(e) => setBulkAuditorId(e.target.value)}
            SelectProps={{ native: true }}
            variant="filled"
            sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}
          >
            <option value="">-- Select Auditor --</option>
            {auditors.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBulkAssign(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleBulkAssign} disabled={!bulkAuditorId}>Assign</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};


// Main Dashboard
const AuditAdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  // Route-to-Index Map
  const routes = ["performance", "tasks", "reports", "users"];
  const currentPath = location.pathname.split("/").pop();
  const initialTab = routes.indexOf(currentPath) !== -1 ? routes.indexOf(currentPath) : 0;

  const [tabIndex, setTabIndex] = useState(initialTab);
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

  const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/audit`;

  // Hardened token computation with fallback
  const token = (auditUser?.token && auditUser.token !== "undefined" && auditUser.token !== "null")
    ? auditUser.token
    : (localStorage.getItem("accessToken") && localStorage.getItem("accessToken") !== "undefined" && localStorage.getItem("accessToken") !== "null")
      ? localStorage.getItem("accessToken")
      : null;

  // Reusable Fetch
  const fetchData = async () => {
    if (!token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const tasksReq = axios.get(`${API_URL}/all-tasks`, config);
      const statsReq = axios.get(`${API_URL}/stats`, config);
      const settingsReq = api.get("/settings");

      const [tasksRes, statsRes, settingsRes] = await Promise.all([tasksReq, statsReq, settingsReq]);
      const tasks = tasksRes.data;
      const stats = statsRes.data;
      const settingsData = settingsRes.data;

      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'Submitted' || t.status === 'Approved').length;
      const pending = tasks.length - completed;
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

  useEffect(() => {
    fetchData();
  }, [token, API_URL]);

  // Sync tab with route on path change (e.g. back button)
  useEffect(() => {
    const idx = routes.indexOf(currentPath);
    if (idx !== -1 && idx !== tabIndex) {
      setTabIndex(idx);
    }
  }, [currentPath]);

  const handleChange = (event, newValue) => {
    setTabIndex(newValue);
    navigate(`/audit/admin/${routes[newValue]}`);
  };

  return (
    <ThemeProvider theme={auditTheme}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '90vh', p: 3, bgcolor: 'background.default' }}>

        {/* Professional Header */}
        {/* Professional Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 700, letterSpacing: '-0.5px' }}>
              Field Audit Admin Portal
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
              Welcome back, <span style={{ color: '#fff', fontWeight: 600 }}>{auditUser?.name}</span>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={() => navigate("/dashboard")}
              sx={{
                color: 'text.secondary',
                borderColor: 'divider',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  bgcolor: 'rgba(255,255,255,0.05)'
                }
              }}
            >
              Main Dashboard
            </Button>
          </Box>
        </Box>

        {/* Stats Row (Only on Performance Tab) */}
        {tabIndex === 0 && (
          <Grid container spacing={2} sx={{ mb: 4 }}>
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

        {/* Navigation Tabs */}
        <Paper sx={{ mb: 3, bgcolor: 'background.paper', color: 'text.primary', borderRadius: 0, overflow: 'hidden', borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
          <Tabs
            value={tabIndex}
            onChange={handleChange}
            aria-label="admin tabs"
            indicatorColor="primary"
            textColor="inherit"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontSize: '0.95rem',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.7)',
                '&.Mui-selected': { color: '#fff', fontWeight: 700 }
              }
            }}
          >
            <Tab label="Team Performance" icon={<AssessmentIcon fontSize="small" sx={{ mb: 0.5 }} />} iconPosition="start" />
            <Tab label="Task Operations" icon={<CloudUploadIcon fontSize="small" sx={{ mb: 0.5 }} />} iconPosition="start" />
            <Tab label="Review Reports" icon={<RateReviewIcon fontSize="small" sx={{ mb: 0.5 }} />} iconPosition="start" />
            <Tab label="User Management" icon={<PersonAddIcon fontSize="small" sx={{ mb: 0.5 }} />} iconPosition="start" />
          </Tabs>
        </Paper>

        {/* Main Content Area */}
        <Box sx={{ flexGrow: 1 }}>
          {tabIndex === 0 && (
            <Box>
              <AnalyticsCharts tasks={allTasks} settings={settings} />
              <Paper sx={{ p: 0, mt: 4, bgcolor: 'background.paper', overflow: 'hidden' }}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700 }}>Detailed Auditor Performance</Typography>
                  <Tooltip title="Refresh Auditor Stats">
                    <IconButton onClick={fetchData} sx={{ color: 'action.active' }}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                <UserStatsTable tasks={allTasks} />
              </Paper>
            </Box>
          )}
          {tabIndex === 1 && <TaskManagement apiUrl={API_URL} token={token} auditors={auditorStats} />}
          {tabIndex === 2 && <DetailedTaskReview apiUrl={API_URL} token={token} />}
          {tabIndex === 3 && <UserManagement apiUrl={API_URL} token={token} />}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default AuditAdminDashboard;
