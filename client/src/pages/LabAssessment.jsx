import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Checkbox,
  TextField,
  MenuItem,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Autocomplete,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Assessment as AssessmentIcon,
  ListAlt as ListAltIcon,
  BarChart as BarChartIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Note as NoteIcon,
} from "@mui/icons-material";
import { InputAdornment } from "@mui/material";
import api from "../api/api";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import ONTTypeManagement from "../components/ONTTypeManagement";


const LabAssessment = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [fieldTeams, setFieldTeams] = useState([]);
  const [ontTypes, setOntTypes] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);

  // States for Team History Dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedHistoryTeam, setSelectedHistoryTeam] = useState(null);
  const [teamHistory, setTeamHistory] = useState([]);

  // Assessment Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null); // Changed to object for Autocomplete
  const [comments, setComments] = useState("");
  const [splicingMachineStatus, setSplicingMachineStatus] = useState("Good");
  const [electrodeLifetime, setElectrodeLifetime] = useState(0);
  const [assessmentType, setAssessmentType] = useState("Technical"); // Technical or Infrastructure

  const technicalCheckpoints = [
    { name: "SSID Configuration", isCompleted: false, score: 0, notes: "" },
    { name: "Channel Selection", isCompleted: false, score: 0, notes: "" },
    { name: "Encryption Mode", isCompleted: false, score: 0, notes: "" },
    { name: "ONT Labeling", isCompleted: false, score: 0, notes: "" },
    { name: "OTO Labeling", isCompleted: false, score: 0, notes: "" },
    { name: "Repeater Location", isCompleted: false, score: 0, notes: "" },
    { name: "Repeater Configuration", isCompleted: false, score: 0, notes: "" },
    { name: "WiFi Signal Meter App Used", isCompleted: false, score: 0, notes: "" },
  ];

  const infrastructureCheckpoints = [
    { name: "Fiber Organization at FDB", isCompleted: false, score: 0, notes: "" },
    { name: "Fiber Organization at BEP", isCompleted: false, score: 0, notes: "" },
    { name: "Fiber Organization at OTO", isCompleted: false, score: 0, notes: "" },
    { name: "Outdoor Labeling cable at FDB", isCompleted: false, score: 0, notes: "" },
    { name: "Pigtail Labeling at FDB", isCompleted: false, score: 0, notes: "" },
    { name: "Outdoor labeling at BEP", isCompleted: false, score: 0, notes: "" },
    { name: "Indoor labeling at BEP", isCompleted: false, score: 0, notes: "" },
    { name: "Backcover labeling at BEP", isCompleted: false, score: 0, notes: "" },
  ];

  const [checkpoints, setCheckpoints] = useState(technicalCheckpoints);
  const [selectedOntType, setSelectedOntType] = useState("");

  const colors = {
    background: "#1a1a1a",
    surface: "#252525",
    border: "#3d3d3d",
    primary: "#7b68ee",
    textPrimary: "#ffffff",
    textSecondary: "#b3b3b3",
    success: "#4caf50",
    error: "#f44336",
    warning: "#ff9800",
  };

  const [settings, setSettings] = useState(null);

  const getAssessmentStatus = (score) => {
    const thresholds = settings?.thresholds || { pass: 85, average: 70, fail: 50, labPassScore: 75 };
    const passThreshold = thresholds.labPassScore || 75;

    if (score >= passThreshold) return { label: "Excellent", color: "#2e7d32" };
    if (score >= thresholds.average) return { label: "Pass (Minor Comments)", color: "#66bb6a" };
    if (score >= thresholds.fail) return { label: "Pass (With Comments)", color: "#ffa726" };
    return { label: "Fail", color: "#d32f2f" };
  };

  useEffect(() => {
    fetchTeams();
    fetchONTTypes();
    fetchAssessments();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get("/settings");
      setSettings(response.data);
    } catch (error) {
      console.error("Failed to fetch settings");
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await api.get("/field-teams/get-field-teams");
      setFieldTeams(response.data);
    } catch (error) {
      toast.error("Failed to fetch field teams");
    }
  };

  const fetchONTTypes = async () => {
    try {
      const response = await api.get("/ont-types");
      setOntTypes(response.data);
    } catch (error) {
      toast.error("Failed to fetch ONT types");
    }
  };

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const response = await api.get("/lab-assessments");
      setAssessments(response.data);
    } catch (error) {
      toast.error("Failed to fetch assessments");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // If switching away from assessment tab and was editing, maybe warn or reset? 
    // For now, let's keep state.
  };

  // --- Assessment Form Handlers ---
  const handleCheckpointChange = (index, field, value) => {
    // Validate score input to be within 0-5 range
    if (field === "score") {
      if (value > 5) return;
      if (value < 0) value = 0;
    }

    const newCheckpoints = [...checkpoints];
    newCheckpoints[index][field] = value;
    setCheckpoints(newCheckpoints);
  };

  const resetForm = () => {
    setComments("");
    setSplicingMachineStatus("Good");
    setElectrodeLifetime(0);
    setSelectedTeam(null);
    setSelectedOntType("");
    setAssessmentType("Technical");
    setCheckpoints(technicalCheckpoints);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!selectedTeam) {
      toast.error("Please select a team");
      return;
    }
    if (assessmentType === "Technical" && !selectedOntType) {
      toast.error("Please select an ONT type for Technical Assessment");
      return;
    }

    const totalScore = (checkpoints.reduce((sum, cp) => sum + (Number(cp.score) || 0), 0) / (checkpoints.length * 5)) * 100;

    const payload = {
      fieldTeamId: selectedTeam._id,
      ontType: assessmentType === "Technical" ? selectedOntType : undefined,
      assessmentType: assessmentType,
      checkpoints: checkpoints,
      comments: comments,
      splicingMachineStatus: assessmentType === "Infrastructure" ? splicingMachineStatus : undefined,
      electrodeLifetime: assessmentType === "Infrastructure" ? Number(electrodeLifetime) : undefined,
      totalScore: Math.round(totalScore),
    };

    try {
      if (isEditing) {
        await api.put(`/lab-assessments/${editingId}`, payload);
        toast.success("Assessment updated successfully");
      } else {
        await api.post("/lab-assessments", payload);
        toast.success("Lab Assessment submitted successfully");
      }

      resetForm();
      fetchAssessments(); // Refresh lists
      setActiveTab(1); // Switch to tracking tab
    } catch (error) {
      toast.error(isEditing ? "Failed to update assessment" : "Failed to submit assessment");
    }
  };

  // Tracking Filters
  const [trackingFilter, setTrackingFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // --- Tracking & Stats Logic ---
  const trackingData = useMemo(() => {
    let data = fieldTeams.map(team => {
      // Find latest assessment for this team
      const teamAssessments = assessments.filter(a =>
        (a.fieldTeamId?._id === team._id) || (a.fieldTeamId === team._id)
      );
      // Sort by date desc
      teamAssessments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const latest = teamAssessments[0];

      return {
        ...team,
        isTested: !!latest,
        lastAssessment: latest,
        assessmentCount: teamAssessments.length,
        allAssessments: teamAssessments,
      };
    });

    // Apply Filter Tab
    if (trackingFilter === "tested") {
      data = data.filter(t => t.isTested);
    } else if (trackingFilter === "pending") {
      data = data.filter(t => !t.isTested);
    } else if (trackingFilter === "passed") {
      const failThreshold = settings?.thresholds?.fail || 50;
      data = data.filter(t => t.isTested && t.lastAssessment.totalScore >= failThreshold);
    } else if (trackingFilter === "failed") {
      const failThreshold = settings?.thresholds?.fail || 50;
      data = data.filter(t => t.isTested && t.lastAssessment.totalScore < failThreshold);
    }

    // Apply Search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      data = data.filter(t =>
        t.teamName.toLowerCase().includes(lowerQuery) ||
        t.teamCompany.toLowerCase().includes(lowerQuery)
      );
    }

    return data;
  }, [fieldTeams, assessments, trackingFilter, searchQuery]);

  const stats = useMemo(() => {
    const totalTeams = fieldTeams.length;
    const testedTeams = trackingData.filter(t => t.isTested).length;
    const pendingTeams = totalTeams - testedTeams;
    const completionRate = totalTeams ? Math.round((testedTeams / totalTeams) * 100) : 0;

    // Average of all assessments, or average of latest per team? Usually avg of current status.
    const latestScores = trackingData.filter(t => t.isTested).map(t => t.lastAssessment.totalScore);
    const avgScore = latestScores.length ? Math.round(latestScores.reduce((a, b) => a + b, 0) / latestScores.length) : 0;

    return { totalTeams, testedTeams, pendingTeams, completionRate, avgScore };
  }, [trackingData, fieldTeams]);

  // --- History & Actions ---
  const handleOpenHistory = (team) => {
    setSelectedHistoryTeam(team);
    setTeamHistory(team.allAssessments || []);
    setHistoryDialogOpen(true);
  };

  const handleDeleteAssessment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this assessment? This action cannot be undone.")) return;
    try {
      await api.delete(`/lab-assessments/${id}`);
      toast.success("Assessment deleted");

      // Update local state if dialog is open
      setTeamHistory(prev => prev.filter(a => a._id !== id));
      fetchAssessments(); // Global refresh
    } catch (error) {
      toast.error("Failed to delete assessment");
    }
  };

  const handleEditAssessment = (assessment) => {
    // Populate form
    const team = fieldTeams.find(t => t._id === (assessment.fieldTeamId._id || assessment.fieldTeamId));
    setSelectedTeam(team);
    setAssessmentType(assessment.assessmentType || "Technical");
    setSelectedOntType(assessment.ontType ? (assessment.ontType._id || assessment.ontType) : "");
    setCheckpoints(assessment.checkpoints);
    setComments(assessment.comments || "");
    setSplicingMachineStatus(assessment.splicingMachineStatus || "Good");
    setElectrodeLifetime(assessment.electrodeLifetime || 0);
    setIsEditing(true);
    setEditingId(assessment._id);

    // Switch to assessment tab
    setHistoryDialogOpen(false);
    setActiveTab(0);
  };

  const handleNewAssessment = (teamRow) => {
    resetForm();
    const team = fieldTeams.find(t => t._id === teamRow._id) || teamRow;
    setSelectedTeam(team);
    setActiveTab(0);
  };


  // --- Advanced Statistics Logic ---
  const calculateCheckpointStats = (data) => {
    if (!data || data.length === 0) return { strengths: [], weaknesses: [], ranking: [] };

    const checkpointMap = {};

    data.forEach(assessment => {
      assessment.checkpoints.forEach(cp => {
        if (!checkpointMap[cp.name]) {
          checkpointMap[cp.name] = { name: cp.name, totalScore: 0, count: 0, completedCount: 0, passCount: 0, failCount: 0 };
        }
        const score = Number(cp.score) || 0;
        checkpointMap[cp.name].totalScore += score;
        checkpointMap[cp.name].count += 1;
        if (cp.isCompleted) checkpointMap[cp.name].completedCount += 1;

        if (score >= 2.5) {
          checkpointMap[cp.name].passCount += 1;
        } else {
          checkpointMap[cp.name].failCount += 1;
        }
      });
    });

    const statsArray = Object.values(checkpointMap).map(cp => ({
      name: cp.name,
      avgScore: cp.count ? (cp.totalScore / cp.count).toFixed(1) : 0,
      passRate: cp.count ? Math.round((cp.passCount / cp.count) * 100) : 0, // Changed to use score-based pass count
      passCount: cp.passCount,
      failCount: cp.failCount,
      totalCount: cp.count
    }));

    // Sort by Average Score (descending)
    statsArray.sort((a, b) => b.avgScore - a.avgScore);

    return {
      ranking: statsArray,
      strengths: statsArray.slice(0, 3),
      weaknesses: statsArray.slice(-3).reverse(), // Bottom 3, reversed so worst is first
    };
  };

  const globalCheckpointStats = useMemo(() => {
    return calculateCheckpointStats(assessments);
  }, [assessments]);


  const [historyStats, setHistoryStats] = useState({ strengths: [], weaknesses: [], ranking: [] });
  // Update stats when selectedHistoryTeam changes
  useEffect(() => {
    if (selectedHistoryTeam && teamHistory) {
      setHistoryStats(calculateCheckpointStats(teamHistory));
    }
  }, [teamHistory, selectedHistoryTeam])


  return (
    <Box sx={{ minHeight: "100vh", bgcolor: colors.background }}>
      <Typography variant="h4" sx={{ color: colors.primary, fontWeight: "bold", mb: 4 }}>
        Lab Assessment
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: colors.border, mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            "& .MuiTab-root": { color: colors.textSecondary, fontSize: "1rem" },
            "& .Mui-selected": { color: colors.primary }
          }}
        >
          <Tab icon={<AssessmentIcon />} iconPosition="start" label={isEditing ? "Edit Assessment" : "New Assessment"} />
          <Tab icon={<ListAltIcon />} iconPosition="start" label="Tracking" />
          <Tab icon={<BarChartIcon />} iconPosition="start" label="Statistics" />
        </Tabs>
      </Box>

      {/* TAB 1: ASSESSMENT FORM */}
      {activeTab === 0 && (
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 4, bgcolor: colors.surface, borderRadius: "12px", border: `1px solid ${colors.border}` }}>
              <Stack spacing={3}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" sx={{ color: colors.textPrimary }}>
                    {isEditing ? "Edit Assessment" : "New Assessment"}
                  </Typography>
                  {isEditing && (
                    <Button size="small" variant="outlined" color="error" onClick={resetForm}>
                      Cancel Edit
                    </Button>
                  )}
                </Stack>

                <Tabs
                  value={assessmentType}
                  onChange={(e, v) => {
                    setAssessmentType(v);
                    setCheckpoints(v === "Technical" ? technicalCheckpoints : infrastructureCheckpoints);
                  }}
                  sx={{
                    mb: 2,
                    '& .MuiTab-root': { color: colors.textSecondary },
                    '& .Mui-selected': { color: colors.primary },
                    '& .MuiTabs-indicator': { backgroundColor: colors.primary },
                  }}
                >
                  <Tab label="Technical Assessment" value="Technical" />
                  <Tab label="Infrastructure Assessment" value="Infrastructure" />
                </Tabs>

                <Autocomplete
                  options={fieldTeams}
                  getOptionLabel={(option) => `${option.teamName} (${option.teamCompany})`}
                  value={selectedTeam}
                  onChange={(event, newValue) => setSelectedTeam(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Team Member"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { borderColor: colors.border },
                          "&:hover fieldset": { borderColor: colors.primary },
                          "&.Mui-focused fieldset": { borderColor: colors.primary },
                        },
                        "& .MuiInputLabel-root": { color: colors.textSecondary },
                        input: { color: colors.textPrimary },
                      }}
                    />
                  )}
                />

                {assessmentType === "Technical" && (
                  <TextField
                    select
                    fullWidth
                    label="Select ONT Type"
                    value={selectedOntType}
                    onChange={(e) => setSelectedOntType(e.target.value)}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: colors.border },
                        "&:hover fieldset": { borderColor: colors.primary },
                        "&.Mui-focused fieldset": { borderColor: colors.primary },
                      },
                      "& .MuiInputLabel-root": { color: colors.textSecondary },
                      select: { color: colors.textPrimary },
                    }}
                  >
                    {ontTypes.map((type) => (
                      <MenuItem key={type._id} value={type._id}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}

                {assessmentType === "Infrastructure" && (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      select
                      fullWidth
                      label="Splicing Machine Status"
                      value={splicingMachineStatus}
                      onChange={(e) => setSplicingMachineStatus(e.target.value)}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { borderColor: colors.border },
                          "&:hover fieldset": { borderColor: colors.primary },
                          "&.Mui-focused fieldset": { borderColor: colors.primary },
                        },
                        "& .MuiInputLabel-root": { color: colors.textSecondary },
                        select: { color: colors.textPrimary },
                      }}
                    >
                      <MenuItem value="Good">Good</MenuItem>
                      <MenuItem value="Fair">Fair</MenuItem>
                      <MenuItem value="Poor">Poor</MenuItem>
                      <MenuItem value="Under Maintenance">Under Maintenance</MenuItem>
                    </TextField>
                    <TextField
                      fullWidth
                      type="number"
                      label="Remaining Splices (Electrode Lifetime)"
                      value={electrodeLifetime}
                      onChange={(e) => setElectrodeLifetime(e.target.value)}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { borderColor: colors.border },
                          "&:hover fieldset": { borderColor: colors.primary },
                          "&.Mui-focused fieldset": { borderColor: colors.primary },
                        },
                        "& .MuiInputLabel-root": { color: colors.textSecondary },
                        input: { color: colors.textPrimary },
                      }}
                    />
                  </Stack>
                )}

                <Divider sx={{ borderColor: colors.border }} />

                {selectedTeam && (assessmentType === "Infrastructure" || selectedOntType) && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, p: 2, bgcolor: colors.surfaceElevated, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                      <Typography variant="h6" sx={{ color: colors.primary }}>Assessment In Progress</Typography>
                    </Box>

                    <Typography variant="subtitle1" sx={{ color: colors.primary }}>
                      Configuration Checks
                    </Typography>

                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ color: colors.textSecondary, borderBottom: `1px solid ${colors.border}` }}>Checkpoint</TableCell>
                            <TableCell align="center" sx={{ color: colors.textSecondary, borderBottom: `1px solid ${colors.border}` }}>Completed</TableCell>
                            <TableCell align="center" sx={{ color: colors.textSecondary, borderBottom: `1px solid ${colors.border}` }}>Score (0-5)</TableCell>
                            <TableCell sx={{ color: colors.textSecondary, borderBottom: `1px solid ${colors.border}` }}>Notes</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {checkpoints.map((cp, index) => (
                            <TableRow key={index}>
                              <TableCell sx={{ color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>{cp.name}</TableCell>
                              <TableCell align="center" sx={{ borderBottom: `1px solid ${colors.border}` }}>
                                <Checkbox
                                  checked={cp.isCompleted}
                                  onChange={(e) => handleCheckpointChange(index, "isCompleted", e.target.checked)}
                                  sx={{ color: colors.primary, '&.Mui-checked': { color: colors.primary } }}
                                />
                              </TableCell>
                              <TableCell align="center" sx={{ borderBottom: `1px solid ${colors.border}` }}>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={cp.score}
                                  onChange={(e) => handleCheckpointChange(index, "score", Number(e.target.value))}
                                  inputProps={{ min: 0, max: 5 }}
                                  sx={{
                                    width: "80px",
                                    "& .MuiOutlinedInput-root": {
                                      "& fieldset": { borderColor: colors.border },
                                      "&:hover fieldset": { borderColor: colors.primary },
                                      "&.Mui-focused fieldset": { borderColor: colors.primary },
                                    },
                                    input: { color: colors.textPrimary, textAlign: "center" },
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ borderBottom: `1px solid ${colors.border}` }}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  placeholder="Add notes..."
                                  value={cp.notes}
                                  onChange={(e) => handleCheckpointChange(index, "notes", e.target.value)}
                                  sx={{
                                    "& .MuiOutlinedInput-root": {
                                      "& fieldset": { borderColor: colors.border },
                                      "&:hover fieldset": { borderColor: colors.primary },
                                      "&.Mui-focused fieldset": { borderColor: colors.primary },
                                    },
                                    input: { color: colors.textPrimary },
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Overall Comments"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { borderColor: colors.border },
                          "&:hover fieldset": { borderColor: colors.primary },
                          "&.Mui-focused fieldset": { borderColor: colors.primary },
                        },
                        "& .MuiInputLabel-root": { color: colors.textSecondary },
                        input: { color: colors.textPrimary },
                        textarea: { color: colors.textPrimary },
                      }}
                    />

                    <Button
                      variant="contained"
                      onClick={handleSubmit}
                      sx={{ bgcolor: colors.primary, "&:hover": { bgcolor: "#6a5acd" }, py: 1.5, fontSize: "1.1rem" }}
                    >
                      {isEditing ? "Update Assessment" : "Submit Assessment"}
                    </Button>
                  </>
                )}
              </Stack>
            </Paper>
          </Grid >

          <Grid item xs={12} md={4}>
            <ONTTypeManagement onTypeChange={fetchONTTypes} />
          </Grid>
        </Grid >
      )}

      {/* TAB 2: TRACKING */}
      {
        activeTab === 1 && (
          <Stack spacing={3}>
            <Paper sx={{ p: 2, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "12px", display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Tabs
                value={trackingFilter}
                onChange={(e, v) => setTrackingFilter(v)}
                textColor="primary"
                indicatorColor="primary"
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{ minHeight: 'auto', '& .MuiTab-root': { minHeight: 48, fontSize: '0.95rem' } }}
              >
                <Tab label="All Teams" value="all" />
                <Tab label="Evaluated" value="tested" />
                <Tab label="Pending" value="pending" />
                <Tab label="Passed" value="passed" />
                <Tab label="Failed" value="failed" />
              </Tabs>

              <TextField
                placeholder="Search teams or companies..."
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: colors.textSecondary }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: { xs: '100%', sm: 300 },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: colors.border },
                    "&:hover fieldset": { borderColor: colors.primary },
                    "&.Mui-focused fieldset": { borderColor: colors.primary },
                  },
                  input: { color: colors.textPrimary },
                }}
              />
            </Paper>

            <Paper sx={{ width: '100%', height: 600, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "12px" }}>
              <DataGrid
                rows={trackingData}
                getRowId={(row) => row._id}
                columns={[
                  { field: 'teamName', headerName: 'Team Name', flex: 1, minWidth: 150 },
                  { field: 'teamCompany', headerName: 'Company', flex: 1, minWidth: 120 },
                  {
                    field: 'lastAssessmentType',
                    headerName: 'Last Test Type',
                    width: 130,
                    valueGetter: (value, row) => row.isTested ? row.lastAssessment.assessmentType : "-",
                  },
                  {
                    field: 'statusText',
                    headerName: 'Result',
                    width: 180,
                    valueGetter: (value, row) => row.isTested ? getAssessmentStatus(row.lastAssessment.totalScore).label : "-",
                    renderCell: (params) => {
                      if (params.row.isTested) {
                        const status = getAssessmentStatus(params.row.lastAssessment.totalScore);
                        return <Typography variant="body2" sx={{ color: status.color, fontWeight: 500 }}>{status.label}</Typography>
                      }
                      return "-";
                    }
                  },
                  { field: 'assessmentCount', headerName: 'Total Tests', type: 'number', width: 100, align: 'center', headerAlign: 'center' },
                  {
                    field: 'splicingMachineStatus',
                    headerName: 'Splicing Status',
                    width: 130,
                    valueGetter: (value, row) => row.isTested ? row.lastAssessment.splicingMachineStatus : "-",
                  },
                  {
                    field: 'electrodeLifetime',
                    headerName: 'Splices Rem.',
                    width: 100,
                    type: 'number',
                    valueGetter: (value, row) => row.isTested ? row.lastAssessment.electrodeLifetime : null,
                  },
                  {
                    field: 'lastAssessmentScore',
                    headerName: 'Latest Score',
                    width: 120,
                    align: 'center',
                    headerAlign: 'center',
                    valueGetter: (value, row) => row.isTested ? row.lastAssessment.totalScore : null,
                    renderCell: (params) => {
                      if (params.value === null) return "-";
                      const status = getAssessmentStatus(params.value);
                      return (
                        <Chip
                          label={`${params.value}%`}
                          size="small"
                          sx={{
                            bgcolor: `${status.color}22`,
                            color: status.color,
                            fontWeight: 'bold',
                            border: `1px solid ${status.color}`
                          }}
                        />
                      );
                    }
                  },
                  {
                    field: 'lastAssessmentDate',
                    headerName: 'Latest Assessment',
                    flex: 1,
                    minWidth: 180,
                    valueGetter: (value, row) => row.isTested ? row.lastAssessment.createdAt : null,
                    valueFormatter: (value) => value ? new Date(value).toLocaleString() : "-"
                  },
                  {
                    field: 'actions',
                    headerName: 'Actions',
                    width: 120,
                    sortable: false,
                    renderCell: (params) => (
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Start New Assessment">
                          <IconButton onClick={() => handleNewAssessment(params.row)} sx={{ color: colors.success }}>
                            <AssessmentIcon />
                          </IconButton>
                        </Tooltip>
                        {params.row.isTested && (
                          <Tooltip title="View History & Manage">
                            <IconButton onClick={() => handleOpenHistory(params.row)} sx={{ color: colors.primary }}>
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    )
                  }
                ]}
                loading={loading}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 10 } },
                }}
                sx={{
                  border: 'none',
                  color: colors.textPrimary,
                  "& .MuiDataGrid-cell": { borderBottom: `1px solid ${colors.border}` },
                  "& .MuiDataGrid-columnHeaders": { bgcolor: colors.surface, borderBottom: `1px solid ${colors.border}`, color: colors.textSecondary },
                  "& .MuiDataGrid-virtualScroller": { bgcolor: colors.background },
                  "& .MuiDataGrid-footerContainer": { borderTop: `1px solid ${colors.border}`, bgcolor: colors.surface, color: colors.textSecondary },
                  "& .MuiTablePagination-root": { color: colors.textSecondary },
                  "& .MuiButtonBase-root": { color: colors.textSecondary },
                }}
              />
            </Paper>
          </Stack>
        )
      }

      {/* TAB 3: STATISTICS */}
      {
        activeTab === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}` }}>
                <CardContent>
                  <Typography color={colors.textSecondary} gutterBottom>Total Teams</Typography>
                  <Typography variant="h3" color={colors.textPrimary}>{stats.totalTeams}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}` }}>
                <CardContent>
                  <Typography color={colors.textSecondary} gutterBottom>Teams Tested</Typography>
                  <Typography variant="h3" color={colors.success}>{stats.testedTeams}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}` }}>
                <CardContent>
                  <Typography color={colors.textSecondary} gutterBottom>Pending</Typography>
                  <Typography variant="h3" color={colors.error}>{stats.pendingTeams}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}` }}>
                <CardContent>
                  <Typography color={colors.textSecondary} gutterBottom>Completion Rate</Typography>
                  <Typography variant="h3" color={colors.primary}>{stats.completionRate}%</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "12px", height: '100%' }}>
                <Typography variant="h6" color={colors.textPrimary} gutterBottom>Average Score (Latest Tests)</Typography>
                <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress variant="determinate" value={stats.avgScore} size={160} thickness={4} sx={{ color: getAssessmentStatus(stats.avgScore).color }} />
                    <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="h3" component="div" color={colors.textPrimary}>{stats.avgScore}%</Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "12px", height: '100%' }}>
                <Typography variant="h6" color={colors.textPrimary} gutterBottom>Recent Activity</Typography>
                <Stack spacing={2} mt={2}>
                  {assessments.slice(0, 4).map(assess => {
                    const status = getAssessmentStatus(assess.totalScore);
                    return (
                      <Box key={assess._id} sx={{ p: 2, border: `1px solid ${colors.border}`, borderRadius: "8px", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography color={colors.textPrimary} variant="subtitle1">{assess.fieldTeamId?.teamName}</Typography>
                          <Typography color={colors.textSecondary} variant="caption">{new Date(assess.createdAt).toLocaleString()}</Typography>
                          <Typography variant="caption" display="block" sx={{ color: status.color }}>{status.label}</Typography>
                        </Box>
                        <Chip label={`${assess.totalScore}%`} size="small" sx={{ bgcolor: `${status.color}22`, color: status.color, border: `1px solid ${status.color}` }} />
                      </Box>
                    );
                  })}
                  {assessments.length === 0 && <Typography color={colors.textSecondary}>No assessments recorded yet.</Typography>}
                </Stack>
              </Paper>
            </Grid>

            {/* ADVANCED STATS: GLOBAL STRENGTHS & WEAKNESSES */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "12px", height: '100%' }}>
                <Typography variant="h6" color={colors.success} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon /> Top Strengths (Global)
                </Typography>
                <Stack spacing={2} mt={2}>
                  {globalCheckpointStats.strengths.map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}`, pb: 1 }}>
                      <Typography color={colors.textPrimary}>{s.name}</Typography>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle2" color={colors.success}>{s.avgScore}/10</Typography>
                        <Typography variant="caption" color={colors.textSecondary}>Pass Rate: {s.passRate}%</Typography>
                      </Box>
                    </Box>
                  ))}
                  {globalCheckpointStats.strengths.length === 0 && <Typography color={colors.textSecondary}>Not enough data.</Typography>}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "12px", height: '100%' }}>
                <Typography variant="h6" color={colors.error} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CancelIcon /> Areas for Improvement (Global)
                </Typography>
                <Stack spacing={2} mt={2}>
                  {globalCheckpointStats.weaknesses.map((w, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}`, pb: 1 }}>
                      <Typography color={colors.textPrimary}>{w.name}</Typography>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle2" color={colors.error}>{w.avgScore}/10</Typography>
                        <Typography variant="caption" color={colors.textSecondary}>Pass Rate: {w.passRate}%</Typography>
                      </Box>
                    </Box>
                  ))}
                  {globalCheckpointStats.weaknesses.length === 0 && <Typography color={colors.textSecondary}>Not enough data.</Typography>}
                </Stack>
              </Paper>
            </Grid>

            {/* Detailed Checkpoint Statistics Table */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3, bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "12px" }}>
                <Typography variant="h6" color={colors.textPrimary} gutterBottom>
                  Checkpoint Performance Details
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: colors.textSecondary, borderBottom: `1px solid ${colors.border}` }}>Checkpoint Name</TableCell>
                        <TableCell align="center" sx={{ color: colors.textSecondary, borderBottom: `1px solid ${colors.border}` }}>Avg Score</TableCell>
                        <TableCell align="center" sx={{ color: colors.success, borderBottom: `1px solid ${colors.border}` }}>Pass (≥5)</TableCell>
                        <TableCell align="center" sx={{ color: colors.error, borderBottom: `1px solid ${colors.border}` }}>Fail (&lt;5)</TableCell>
                        <TableCell align="center" sx={{ color: colors.textSecondary, borderBottom: `1px solid ${colors.border}` }}>Pass Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {globalCheckpointStats.ranking.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell sx={{ color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>{row.name}</TableCell>
                          <TableCell align="center" sx={{ color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>{row.avgScore}</TableCell>
                          <TableCell align="center" sx={{ color: colors.success, borderBottom: `1px solid ${colors.border}` }}>{row.passCount}</TableCell>
                          <TableCell align="center" sx={{ color: colors.error, borderBottom: `1px solid ${colors.border}` }}>{row.failCount}</TableCell>
                          <TableCell align="center" sx={{ borderBottom: `1px solid ${colors.border}` }}>
                            <Chip
                              label={`${row.passRate}%`}
                              size="small"
                              sx={{
                                bgcolor: row.passRate >= 80 ? `${colors.success}22` : row.passRate >= 50 ? `${colors.warning}22` : `${colors.error}22`,
                                color: row.passRate >= 80 ? colors.success : row.passRate >= 50 ? colors.warning : colors.error
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        )
      }

      {/* TEAM HISTORY DIALOG */}
      <Dialog
        fullScreen
        open={historyDialogOpen}
        onClose={() => setHistoryStats({ strengths: [], weaknesses: [], ranking: [] }) || setHistoryDialogOpen(false)}
        PaperProps={{ sx: { bgcolor: colors.background, color: colors.textPrimary } }}
      >
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: colors.primary }}>
              {selectedHistoryTeam?.teamName}
            </Typography>
            <Typography variant="body2" color={colors.textSecondary}>{selectedHistoryTeam?.teamCompany} - Assessment History</Typography>
          </Box>
          <Button variant="outlined" onClick={() => setHistoryDialogOpen(false)} sx={{ color: colors.textSecondary, borderColor: colors.border }}>
            Close
          </Button>
        </Box>
        <DialogContent sx={{ p: 4 }}>
          <Stack spacing={3} mt={1}>
            {/* TEAM SPECIFIC STATS */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: colors.background, border: `1px solid ${colors.border}` }}>
                  <Typography variant="subtitle1" color={colors.success} gutterBottom>Top Strengths</Typography>
                  {historyStats.strengths.length > 0 ? (
                    historyStats.strengths.map((s, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color={colors.textSecondary}>{s.name}</Typography>
                        <Typography variant="body2" color={colors.success}>{s.avgScore} (avg)</Typography>
                      </Box>
                    ))
                  ) : (<Typography variant="caption" color={colors.textSecondary}>No data</Typography>)}
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: colors.background, border: `1px solid ${colors.border}` }}>
                  <Typography variant="subtitle1" color={colors.error} gutterBottom>Weaknesses</Typography>
                  {historyStats.weaknesses.length > 0 ? (
                    historyStats.weaknesses.map((w, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color={colors.textSecondary}>{w.name}</Typography>
                        <Typography variant="body2" color={colors.error}>{w.avgScore} (avg)</Typography>
                      </Box>
                    ))
                  ) : (<Typography variant="caption" color={colors.textSecondary}>No data</Typography>)}
                </Paper>
              </Grid>
            </Grid>

            {/* CHARTS SECTION */}
            {teamHistory.length > 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 2, bgcolor: colors.background, border: `1px solid ${colors.border}`, height: 300 }}>
                    <Typography variant="subtitle2" color={colors.textSecondary} gutterBottom>Score Trend</Typography>
                    <ResponsiveContainer width="100%" height="90%">
                      <AreaChart data={[...teamHistory].reverse().map(a => ({
                        date: new Date(a.createdAt).toLocaleDateString(),
                        score: a.totalScore
                      }))}>
                        <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                        <XAxis dataKey="date" stroke={colors.textSecondary} fontSize={10} />
                        <YAxis domain={[0, 100]} stroke={colors.textSecondary} fontSize={10} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: '#252525',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '12px',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                            color: colors.textPrimary
                          }}
                          itemStyle={{ color: colors.primary }}
                          cursor={{ stroke: colors.primary, strokeWidth: 1 }}
                        />
                        <Area type="monotone" dataKey="score" stroke={colors.primary} fillOpacity={1} fill="url(#colorScore)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, bgcolor: colors.background, border: `1px solid ${colors.border}`, height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="subtitle2" color={colors.textSecondary} gutterBottom>Status Distribution</Typography>
                    <ResponsiveContainer width="100%" height="80%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Excellent', value: teamHistory.filter(a => a.totalScore === 100).length },
                            { name: 'Pass (Minor)', value: teamHistory.filter(a => a.totalScore >= 85 && a.totalScore < 100).length },
                            { name: 'Pass', value: teamHistory.filter(a => a.totalScore >= 50 && a.totalScore < 85).length },
                            { name: 'Fail', value: teamHistory.filter(a => a.totalScore < 50).length },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#2e7d32" />
                          <Cell fill="#66bb6a" />
                          <Cell fill="#ffa726" />
                          <Cell fill="#d32f2f" />
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: '#252525',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '12px',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                            color: colors.textPrimary
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <Typography variant="caption" color={colors.textSecondary}>Total Assessments: {teamHistory.length}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            )}

            <Divider sx={{ borderColor: colors.border }} />

            {teamHistory.length === 0 ? (
              <Typography color={colors.textSecondary}>No history found.</Typography>
            ) : (
              <TableContainer component={Paper} sx={{ bgcolor: colors.surface }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: colors.textSecondary }}>Date</TableCell>
                      <TableCell sx={{ color: colors.textSecondary }}>Type</TableCell>
                      <TableCell sx={{ color: colors.textSecondary }}>ONT Type</TableCell>
                      <TableCell sx={{ color: colors.textSecondary }}>Splicing Status</TableCell>
                      <TableCell sx={{ color: colors.textSecondary }}>Electrode Lifetime</TableCell>
                      <TableCell sx={{ color: colors.textSecondary }}>Score</TableCell>
                      <TableCell sx={{ color: colors.textSecondary }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {teamHistory.map((assess) => (
                      <TableRow key={assess._id}>
                        <TableCell sx={{ color: colors.textPrimary }}>{new Date(assess.createdAt).toLocaleString()}</TableCell>
                        <TableCell sx={{ color: colors.textPrimary }}>
                          <Chip label={assess.assessmentType || "Technical"} size="small" variant="outlined" sx={{ borderColor: colors.primary, color: colors.primary }} />
                        </TableCell>
                        <TableCell sx={{ color: colors.textPrimary }}>{assess.ontType?.name || "-"}</TableCell>
                        <TableCell sx={{ color: colors.textPrimary }}>{assess.splicingMachineStatus || "Good"}</TableCell>
                        <TableCell sx={{ color: colors.textPrimary }}>{assess.electrodeLifetime || 0}</TableCell>
                        <TableCell sx={{ color: getAssessmentStatus(assess.totalScore).color, fontWeight: 'bold' }}>{assess.totalScore}%</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleEditAssessment(assess)} sx={{ color: colors.primary }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteAssessment(assess._id)} sx={{ color: colors.error }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Checkpoint Notes Section */}
            {teamHistory.some(a => a.checkpoints?.some(cp => cp.notes?.trim())) && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(255, 167, 38, 0.05)', borderRadius: '12px', border: '1px dashed #ffa726' }}>
                <Typography variant="h6" sx={{ color: "#ffa726", mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NoteIcon fontSize="small" /> Checkpoint Observations (Notes)
                </Typography>
                <Stack spacing={2}>
                  {teamHistory.map((assess) => {
                    const notesWithContent = assess.checkpoints?.filter(cp => cp.notes?.trim());
                    if (notesWithContent?.length === 0) return null;

                    return (
                      <Box key={`notes-${assess._id}`} sx={{ mb: 1 }}>
                        <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                          {new Date(assess.createdAt).toLocaleDateString()} - {assess.ontType?.name || "N/A"}
                        </Typography>
                        <Stack spacing={0.5}>
                          {notesWithContent.map((cp, idx) => (
                            <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                              <Typography variant="body2" sx={{ color: colors.primary, minWidth: '150px', fontWeight: 500 }}>
                                • {cp.name}:
                              </Typography>
                              <Typography variant="body2" sx={{ color: colors.textPrimary, fontStyle: 'italic' }}>
                                "{cp.notes}"
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {/* Simple stats for this team */}
            <Box sx={{ display: 'flex', gap: 2, pt: 2, alignItems: 'center' }}>
              <Chip label={`Total Tests: ${teamHistory.length}`} variant="outlined" sx={{ color: colors.textPrimary, borderColor: colors.border }} />
              {(() => {
                const currentScore = teamHistory[0]?.totalScore || 0;
                const prevScores = teamHistory.slice(1);
                const avgPrev = prevScores.length > 0
                  ? Math.round(prevScores.reduce((a, b) => a + b.totalScore, 0) / prevScores.length)
                  : currentScore;

                const diff = currentScore - avgPrev;
                const status = getAssessmentStatus(currentScore);

                return (
                  <>
                    <Chip
                      label={`Latest: ${currentScore}%`}
                      variant="outlined"
                      sx={{ color: status.color, borderColor: status.color }}
                    />
                    {teamHistory.length > 1 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {diff > 0 ? (
                          <Typography variant="caption" sx={{ color: colors.success, display: 'flex', alignItems: 'center' }}>
                            <CheckCircleIcon sx={{ fontSize: 14, mr: 0.5 }} /> +{diff}% Improvement
                          </Typography>
                        ) : diff < 0 ? (
                          <Typography variant="caption" sx={{ color: colors.error, display: 'flex', alignItems: 'center' }}>
                            <CancelIcon sx={{ fontSize: 14, mr: 0.5 }} /> {diff}% Degradation
                          </Typography>
                        ) : (
                          <Typography variant="caption" color={colors.textSecondary}>Stable</Typography>
                        )}
                      </Box>
                    )}
                  </>
                );
              })()}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)} sx={{ color: colors.textSecondary }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
};

export default LabAssessment;
