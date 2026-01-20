import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
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
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PlaceIcon from '@mui/icons-material/Place';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress } from '@mui/material';
import { logoutAuditUser } from '../../redux/slices/auditSlice';
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
import { format, startOfWeek, endOfWeek, subDays, subWeeks, subMonths, getISOWeek, isWithinInterval } from 'date-fns';
import api from "../../api/api";
import { getCustomWeekNumber } from "../../utils/helpers";


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

const PersonalAnalytics = ({ tasks, settings }) => {
  const [interval, setInterval] = useState('daily');
  const submitted = tasks.filter(t => t.status === 'Submitted');

  // 1. Performance Trend (Score per Period)
  const getTrendData = () => {
    if (interval === 'daily') {
      return submitted
        .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
        .slice(-14)
        .map(task => {
          const checks = task.checklist || [];
          const ok = checks.filter(c => c.status === 'OK').length;
          const score = checks.length > 0 ? Math.round((ok / checks.length) * 100) : 0;
          return { label: task.slid, score };
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
        const periods = submitted.filter(t => {
          const d = new Date(t.updatedAt);
          return isWithinInterval(d, { start: w.start, end: w.end });
        });

        let totalScore = 0;
        periods.forEach(t => {
          const ok = t.checklist?.filter(c => c.status === 'OK').length || 0;
          totalScore += t.checklist ? Math.round((ok / t.checklist.length) * 100) : 0;
        });

        return {
          label: w.label,
          score: periods.length > 0 ? Math.round(totalScore / periods.length) : 0
        };
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
        const periods = submitted.filter(t => {
          const d = new Date(t.updatedAt);
          return d.getMonth() === m.month && d.getFullYear() === m.year;
        });

        let totalScore = 0;
        periods.forEach(t => {
          const ok = t.checklist?.filter(c => c.status === 'OK').length || 0;
          totalScore += t.checklist ? Math.round((ok / t.checklist.length) * 100) : 0;
        });

        return {
          label: m.label,
          score: periods.length > 0 ? Math.round(totalScore / periods.length) : 0
        };
      });
    }
  };

  // 2. Compliance Distribution
  const getComplianceData = () => {
    let ok = 0, nok = 0;
    submitted.forEach(t => {
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

  // 3. Most Frequent Mistakes
  const getMistakeData = () => {
    const mistakes = {};
    submitted.forEach(t => {
      t.checklist?.filter(c => c.status === 'N.OK').forEach(c => {
        mistakes[c.checkpointName] = (mistakes[c.checkpointName] || 0) + 1;
      });
    });
    return Object.entries(mistakes)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const trendData = getTrendData();
  const complianceData = getComplianceData();
  const mistakeData = getMistakeData();

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 400, bgcolor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase' }}>
                Quality Performance Trend
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
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <RechartsTooltip
                  contentStyle={{ bgcolor: '#1a1a1a', border: 'none', borderRadius: 4 }}
                />
                <Line type="monotone" dataKey="score" stroke="#00f5d4" strokeWidth={3} dot={{ r: 4, fill: '#00f5d4' }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 400, bgcolor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase' }}>
              Life-time Compliance
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={complianceData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {complianceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Deep Personal Stats: Mistake Breakdown */}
        {mistakeData.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Typography variant="subtitle2" sx={{ mb: 3, color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase' }}>
                Top Areas Needing Improvement (Most Frequent Mistakes)
              </Typography>
              <Grid container spacing={2}>
                {mistakeData.map((m, idx) => (
                  <Grid item xs={12} sm={6} md={2.4} key={idx}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(244, 67, 54, 0.05)', border: '1px solid rgba(244, 67, 54, 0.1)' }}>
                      <Typography variant="h4" color="error.main" sx={{ fontWeight: 900 }}>{m.value}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.7, display: 'block', height: 40, overflow: 'hidden' }}>{m.name}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

const AuditorDashboard = () => {
  const dispatch = useDispatch();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [tabIndex, setTabIndex] = useState(0); // 0: Tasks, 1: Performance
  const [settings, setSettings] = useState(null);

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
  const [previewImage, setPreviewImage] = useState(null); // State for full image view



  const navigate = useNavigate();

  const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/audit`;

  const [loading, setLoading] = useState(false);

  // Fetch Tasks
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('auditUser');
      let token = userStr ? JSON.parse(userStr).token : null;

      // Fallback to main dashboard token for Admin bypass
      if (!token || token === "undefined" || token === "null") {
        token = localStorage.getItem('accessToken');
      }

      const config = (token && token !== "undefined" && token !== "null") ? { headers: { Authorization: `Bearer ${token}` } } : {};

      // Pass date filter to backend for scheduledDate filtering
      const url = `${API_URL}/my-tasks${dateFilter ? `?date=${dateFilter}` : ''}`;
      const { data } = await axios.get(url, config);
      setTasks(data);
      setFilteredTasks(data);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
      if (error.response && error.response.status === 401) {
        dispatch(logoutAuditUser());
        navigate('/audit/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    // Fetch Settings
    const fetchSettings = async () => {
      try {
        const { data } = await api.get("/settings");
        setSettings(data);
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
    };
    fetchSettings();
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

    const auditorName = selectedTask.auditor?.name || "Auditor";
    const scheduledDate = selectedTask.scheduledDate ? new Date(selectedTask.scheduledDate).toISOString().split('T')[0] : "NoDate";

    // Track used filenames to handle duplicates
    const usedNames = {};

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
            <Box sx={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', bgcolor: 'background.subtle', borderRadius: 0, px: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
              <SearchIcon color="action" />
              <TextField
                fullWidth placeholder="Search by SLID..." variant="standard"
                InputProps={{ disableUnderline: true }}
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ ml: 1 }}
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
              <IconButton onClick={() => handleDateChange(-1)} size="small" sx={{ borderRadius: 0, color: 'primary.main', border: '1px solid rgba(255, 255, 255, 0.1)', '&:hover': { bgcolor: 'rgba(62, 166, 255, 0.05)' } }}>
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
              <IconButton onClick={() => handleDateChange(1)} size="small" sx={{ borderRadius: 0, color: 'primary.main', border: '1px solid rgba(255, 255, 255, 0.1)', '&:hover': { bgcolor: 'rgba(62, 166, 255, 0.05)' } }}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>

            <IconButton
              onClick={fetchTasks}
              disabled={loading}
              title="Refresh Tasks"
              sx={{
                color: 'primary.main',
                borderRadius: 0,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                '&:hover': { bgcolor: 'rgba(62, 166, 255, 0.05)' },
                width: 40,
                height: 40
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
            </IconButton>


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
      {tabIndex === 1 && (
        <Box>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Global Compliance Score */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#0a0a0a', borderLeft: '4px solid #9c27b0', height: '100%', borderRadius: 0 }}>
                <Typography variant="h3" color="secondary.main" sx={{ fontWeight: 800 }}>
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
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Global Compliance Rate</Typography>
              </Paper>
            </Grid>

            {/* Total Issues Found */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#0a0a0a', borderLeft: '4px solid #f44336', height: '100%', borderRadius: 0 }}>
                <Typography variant="h3" color="error.main" sx={{ fontWeight: 800 }}>
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
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Issues Identified</Typography>
              </Paper>
            </Grid>

            {/* Completed Reviews */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#0a0a0a', borderLeft: '4px solid #2e7d32', height: '100%', borderRadius: 0 }}>
                <Typography variant="h3" color="success.main" sx={{ fontWeight: 800 }}>{stats.completed}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Audits Completed</Typography>
              </Paper>
            </Grid>

            {/* Completion Rate */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#0a0a0a', borderLeft: '4px solid #ed6c02', height: '100%', borderRadius: 0 }}>
                <Typography variant="h3" color="warning.main" sx={{ fontWeight: 800 }}>{stats.completionRate}%</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Assignment Completion</Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Visual Analytics */}
          <PersonalAnalytics tasks={tasks} settings={settings} />

          {/* Recent Activity Section */}
          <Typography variant="h6" gutterBottom sx={{ mt: 6, mb: 3, fontWeight: 800 }}>Recent Submission History</Typography>
          <Paper sx={{ width: '100%', overflow: 'hidden', bgcolor: 'transparent', boxShadow: 'none' }}>
            <Grid container spacing={2}>
              {tasks.filter(t => t.status === 'Submitted' || t.status === 'Approved').sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5).map((task) => {
                // Calc score for this specific task
                const checks = task.checklist || [];
                const ok = checks.filter(c => c.status === 'OK').length;
                const score = checks.length > 0 ? Math.round((ok / checks.length) * 100) : 0;
                const issues = checks.filter(c => c.status === 'N.OK').length;

                return (
                  <Grid item xs={12} key={task._id}>
                    <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Avatar sx={{ bgcolor: score > 85 ? "success.main" : score > 50 ? "warning.main" : "error.main", borderRadius: 0 }}>
                          <AssignmentIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">{task.slid}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                            {new Date(task.updatedAt).toLocaleDateString()} • {task.siteDetails?.TOWN || 'Unknown'}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 4, textAlign: 'right' }}>
                        <Box>
                          <Typography variant="h5" color={score > 85 ? "success.main" : "warning.main"} sx={{ fontWeight: 800 }}>{score}%</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>SCORE</Typography>
                        </Box>
                        <Box>
                          <Typography variant="h5" color="error.main" sx={{ fontWeight: 800 }}>{issues}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>ISSUES</Typography>
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
      <Dialog open={choiceOpen} onClose={() => setChoiceOpen(false)} fullScreen>
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
      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} fullScreen>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: '#000' }}>
          <Typography variant="h6" component="span" fontWeight="bold">Audit Report: {selectedTask?.slid}</Typography>
          <IconButton onClick={() => setReportOpen(false)} sx={{ color: '#000' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#000', p: 0 }}>
          {selectedTask && (
            <Box id="printable-section" sx={{ p: 4, maxWidth: 1000, margin: 'auto' }}>
              {/* Report Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 6, borderBottom: '2px solid', borderColor: 'primary.main', pb: 2 }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -1, color: '#fff' }}>
                    AUDIT <span style={{ color: '#3ea6ff' }}>REPORT</span>
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

              {/* Footer */}
              <Box sx={{ mt: 10, pt: 4, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ opacity: 0.3 }}>Generated by Reach Audit Intelligence System • Secure Verification Protocol</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#000', p: 2 }}>
          <Button onClick={() => setReportOpen(false)} variant="contained">Close</Button>
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

export default AuditorDashboard;
