import { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import {
  Box,
  Typography,
  TextField,
  Button as MuiButton,
  Snackbar,
  Alert,
  Divider,
  IconButton,
  InputAdornment,
  useMediaQuery,
  useTheme,
  Switch,
  FormControlLabel,
  Paper,

  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select as MuiSelect,
  MenuItem as MuiMenuItem,
  TableSortLabel
} from "@mui/material";
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Timer as TimerIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Score as ScoreIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Add,
  Search as SearchIcon,
  ArrowUpward,
  ArrowDownward,
  FilterList as FilterListIcon
} from "@mui/icons-material";
import { HashLoader } from "react-spinners";

const SettingsPage = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [loading, setLoading] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [editMode, setEditMode] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      projectName: "",
      projectBrief: "",
      projectID: "",
      clientName: "",
      projectManager: "",
      globalTimer: 60,
      sessionTimeout: 30,
      thresholds: {
        pass: 85,
        average: 70,
        fail: 50,
        quizPassScore: 70,
        labPassScore: 75,
      },
      npsTargets: {
        promoters: 75,
        detractors: 9,
      },
      notifications: {
        emailAlerts: true,
        pushNotifications: true,
      },
      weekStartDay: 0,
      week1StartDate: null,
      week1EndDate: null,
      startWeekNumber: 1,
      month1StartDate: null,
      month1EndDate: null,

      scoringKeys: [],
    },
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get("/settings");
      const data = response.data;
      // Format dates for input type="date"
      if (data.week1StartDate) data.week1StartDate = new Date(data.week1StartDate).toISOString().split('T')[0];
      if (data.week1EndDate) data.week1EndDate = new Date(data.week1EndDate).toISOString().split('T')[0];
      if (data.month1StartDate) data.month1StartDate = new Date(data.month1StartDate).toISOString().split('T')[0];
      if (data.month1EndDate) data.month1EndDate = new Date(data.month1EndDate).toISOString().split('T')[0];
      reset(data);
    } catch (error) {
      console.error("Error fetching settings:", error);
      setSnackbarMessage("Failed to load settings");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const submitHandler = async (data) => {
    if (user?.role !== "Admin") {
      setSnackbarMessage("Only admins can update settings");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return;
    }

    setLoading(true);
    try {
      await api.put("/settings", data);
      setSnackbarMessage("Settings updated successfully!");
      setSnackbarSeverity("success");
      setOpenSnackbar(true);
      setEditMode(false);
    } catch (error) {
      console.error("Error updating settings:", error);
      setSnackbarMessage(error.response?.data?.message || "Failed to update settings");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setOpenSnackbar(false);
  };

  const SectionHeader = ({ title, icon: Icon }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 3 }}>
      <Icon sx={{ color: '#1976d2' }} />
      <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
        {title}
      </Typography>
    </Box>
  );

  const textFieldStyles = {
    '& .MuiInputBase-root': { color: '#ffffff' },
    '& .MuiInputLabel-root': {
      color: '#b3b3b3',
      '&.Mui-disabled': {
        color: '#b3b3b3'
      }
    },
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: editMode ? '#e5e7eb' : 'transparent' },
      '&:hover fieldset': { borderColor: editMode ? '#666' : 'transparent' },
      '&.Mui-focused fieldset': { borderColor: '#1976d2' },
      backgroundColor: editMode ? '#252525' : 'transparent',
      borderRadius: '4px',
    },
    '& .Mui-disabled': {
      WebkitTextFillColor: '#ffffff !important',
      '& .MuiInputBase-input': {
        WebkitTextFillColor: '#ffffff !important'
      }
    }
  };

  return (
    <Box sx={{ p: isMobile ? 0 : 4, maxWidth: '1000px', margin: '0 auto' }}>
      {loading && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1300 }}>
          <HashLoader color="#1976d2" size={80} />
        </Box>
      )}

      <Paper sx={{ p: isMobile ? 2 : 4, backgroundColor: '#2d2d2d', borderRadius: '12px', border: '1px solid #444' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate(-1)} sx={{ color: '#ffffff' }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
              Project Settings
            </Typography>
          </Box>

          {user?.role === "Admin" && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {editMode ? (
                <>
                  <MuiButton startIcon={<CloseIcon />} onClick={() => { setEditMode(false); fetchSettings(); }} sx={{ color: '#ffffff', backgroundColor: '#555' }}>
                    Cancel
                  </MuiButton>
                  <MuiButton startIcon={<SaveIcon />} onClick={handleSubmit(submitHandler)} sx={{ color: '#ffffff', backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#1565c0' } }}>
                    Save
                  </MuiButton>
                </>
              ) : (
                <MuiButton startIcon={<EditIcon />} onClick={() => setEditMode(true)} sx={{ color: '#ffffff', backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#1565c0' } }}>
                  Edit Settings
                </MuiButton>
              )}
            </Box>
          )}
        </Box>

        <form onSubmit={handleSubmit(submitHandler)}>
          <SectionHeader title="General Information" icon={SettingsIcon} />
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Project Name"
                disabled={!editMode}
                {...register("projectName")}
                InputLabelProps={{ shrink: true }}
                sx={textFieldStyles}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Project ID / Code"
                disabled={!editMode}
                {...register("projectID")}
                InputLabelProps={{ shrink: true }}
                sx={textFieldStyles}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Client Name"
                disabled={!editMode}
                {...register("clientName")}
                InputLabelProps={{ shrink: true }}
                sx={textFieldStyles}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Project Manager"
                disabled={!editMode}
                {...register("projectManager")}
                InputLabelProps={{ shrink: true }}
                sx={textFieldStyles}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Project Brief"
                multiline
                rows={3}
                disabled={!editMode}
                {...register("projectBrief")}
                InputLabelProps={{ shrink: true }}
                sx={textFieldStyles}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 4, borderColor: '#444' }} />

          <SectionHeader title="Timer Configuration" icon={TimerIcon} />
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Global Quiz Timer (Min)"
                disabled={!editMode}
                {...register("globalTimer", { min: 1, max: 180 })}
                error={!!errors.globalTimer}
                helperText={errors.globalTimer ? "Value must be between 1 and 180" : ""}
                sx={textFieldStyles}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><TimerIcon sx={{ color: '#666' }} /></InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Session Timeout (Min)"
                disabled={!editMode}
                {...register("sessionTimeout", { min: 1, max: 1440 })}
                error={!!errors.sessionTimeout}
                helperText={errors.sessionTimeout ? "Value must be between 1 and 1440" : ""}
                sx={textFieldStyles}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><TimerIcon sx={{ color: '#666' }} /></InputAdornment>
                }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 4, borderColor: '#444' }} />

          <SectionHeader title="Status Thresholds (%)" icon={ScoreIcon} />
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Global Pass Threshold"
                disabled={!editMode}
                {...register("thresholds.pass", { min: 0, max: 100 })}
                error={!!errors.thresholds?.pass}
                helperText={errors.thresholds?.pass ? "Value must be between 0 and 100" : ""}
                sx={textFieldStyles}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Global Average Threshold"
                disabled={!editMode}
                {...register("thresholds.average", { min: 0, max: 100 })}
                error={!!errors.thresholds?.average}
                helperText={errors.thresholds?.average ? "Value must be between 0 and 100" : ""}
                sx={textFieldStyles}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Global Fail Threshold"
                disabled={!editMode}
                {...register("thresholds.fail", { min: 0, max: 100 })}
                error={!!errors.thresholds?.fail}
                helperText={errors.thresholds?.fail ? "Value must be between 0 and 100" : ""}
                sx={textFieldStyles}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Quiz Pass Score"
                disabled={!editMode}
                {...register("thresholds.quizPassScore", { min: 0, max: 100 })}
                error={!!errors.thresholds?.quizPassScore}
                helperText={errors.thresholds?.quizPassScore ? "Value must be between 0 and 100" : ""}
                sx={textFieldStyles}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Lab Pass Score"
                disabled={!editMode}
                {...register("thresholds.labPassScore", { min: 0, max: 100 })}
                error={!!errors.thresholds?.labPassScore}
                helperText={errors.thresholds?.labPassScore ? "Value must be between 0 and 100" : ""}
                sx={textFieldStyles}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="NPS Promoters Target (≥)"
                disabled={!editMode}
                {...register("npsTargets.promoters", { min: 0, max: 100 })}
                error={!!errors.npsTargets?.promoters}
                helperText={errors.npsTargets?.promoters ? "Value must be between 0 and 100" : ""}
                sx={textFieldStyles}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="NPS Detractors Target (≤)"
                disabled={!editMode}
                {...register("npsTargets.detractors", { min: 0, max: 100 })}
                error={!!errors.npsTargets?.detractors}
                helperText={errors.npsTargets?.detractors ? "Value must be between 0 and 100" : ""}
                sx={textFieldStyles}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 4, borderColor: '#444' }} />
          <SectionHeader title="Calendar Configuration" icon={SettingsIcon} />
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Week Start Day"
                disabled={!editMode}
                {...register("weekStartDay")}
                InputLabelProps={{ shrink: true }}
                sx={textFieldStyles}
                SelectProps={{
                  native: true,
                }}
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Week 1 Start Date"
                disabled={!editMode}
                {...register("week1StartDate")}
                InputLabelProps={{ shrink: true }}
                sx={textFieldStyles}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Week 1 End Date"
                disabled={!editMode}
                {...register("week1EndDate")}
                InputLabelProps={{ shrink: true }}
                sx={textFieldStyles}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Start Week (Calibration #)"
                disabled={!editMode}
                {...register("startWeekNumber", { min: 1, max: 100 })}
                InputLabelProps={{ shrink: true }}
                sx={textFieldStyles}
                helperText="Which week number should the calibration range be assigned?"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mt: 1, p: 2, bgcolor: 'rgba(25, 118, 210, 0.05)', borderRadius: 1, border: '1px dashed #1976d2' }}>
                <Typography variant="caption" sx={{ color: '#b3b3b3' }}>
                  ℹ️ <strong>How to Calibrate:</strong> Define a date range (e.g., Jan 1 - Jan 5) and assign it a week number (e.g., Week 1). All dates after this range will automatically increment every 7 days based on your chosen <strong>Week Start Day</strong>.
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 4, borderColor: '#444' }} />

          <SectionHeader title="Month Configuration" icon={SettingsIcon} />
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Month 1 Start Date"
                disabled={!editMode}
                {...register("month1StartDate")}
                InputLabelProps={{ shrink: true }}
                sx={textFieldStyles}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Month 1 End Date"
                disabled={!editMode}
                {...register("month1EndDate")}
                InputLabelProps={{ shrink: true }}
                sx={textFieldStyles}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mt: 1, p: 2, bgcolor: 'rgba(25, 118, 210, 0.05)', borderRadius: 1, border: '1px dashed #1976d2' }}>
                <Typography variant="caption" sx={{ color: '#b3b3b8' }}>
                  ℹ️ <strong>Month Configuration:</strong> Define the first month's start and end dates. <br />
                  All subsequent months will be calculated as strict <strong>4-week periods (28 days)</strong>. <br />
                  <em>Note: Since 52 weeks ÷ 4 weeks = 13, this creates a <strong>13-Month Year</strong> to cover the full calendar.</em>
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* <Divider sx={{ my: 4, borderColor: '#444' }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={<Switch checked={watch("notifications.emailAlerts")} disabled={!editMode} onChange={(e) => setValue("notifications.emailAlerts", e.target.checked, { shouldDirty: true })} />}
              label={<Typography sx={{ color: '#ffffff' }}>Enable Email Alerts</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={watch("notifications.pushNotifications")} disabled={!editMode} onChange={(e) => setValue("notifications.pushNotifications", e.target.checked, { shouldDirty: true })} />}
              label={<Typography sx={{ color: '#ffffff' }}>Enable Push Notifications</Typography>}
            />
          </Box> */}

          <Divider sx={{ my: 4, borderColor: '#444' }} />
          <SectionHeader title="Dynamic Scoring Keys" icon={ScoreIcon} />
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#b3b3b3', mb: 2 }}>
              Define scoring keys that can be applied to Tasks and Customer Issues. These keys will appear as selectable options in the respective forms.
            </Typography>
            <ScoringKeysEditor control={control} register={register} errors={errors} editMode={editMode} />
          </Box>
        </form>
      </Paper>

      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};


const ScoringKeysEditor = ({ control, register, errors, editMode }) => {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "scoringKeys"
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Compute displayed fields with original index tracking
  const processedFields = fields
    .map((field, index) => ({ ...field, originalIndex: index }))
    .filter(field =>
      field.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      // Handle numeric sorting for points, string for label
      if (sortConfig.key === 'points') {
        return sortConfig.direction === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleMove = (index, direction) => {
    // index is the processed index, we need original index logic if we were strictly using originalIndex, 
    // but move() takes the current index in the field array.
    // However, since we disable move when sorted/filtered, visual index === real index.
    if (direction === 'up' && index > 0) {
      move(index, index - 1);
    } else if (direction === 'down' && index < fields.length - 1) {
      move(index, index + 1);
    }
  };

  const isReorderDisabled = searchTerm !== "" || sortConfig.key !== null || !editMode;

  const textFieldStyles = {
    '& .MuiInputBase-root': { color: '#ffffff', fontSize: '0.85rem' },
    '& .MuiInputLabel-root': { color: '#b3b3b3' },
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: editMode ? '#444' : 'transparent' },
      '&:hover fieldset': { borderColor: editMode ? '#666' : 'transparent' },
      '&.Mui-focused fieldset': { borderColor: '#1976d2' },
      backgroundColor: editMode ? '#1e1e1e' : 'transparent',
    },
    '& .Mui-disabled': {
      WebkitTextFillColor: '#ffffff !important',
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search keys..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            ...textFieldStyles,
            width: 300,
            '& .MuiOutlinedInput-root': { bgcolor: '#1e1e1e' }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#666' }} />
              </InputAdornment>
            ),
          }}
        />
        {(searchTerm || sortConfig.key) && (
          <MuiButton
            size="small"
            onClick={() => { setSearchTerm(""); setSortConfig({ key: null, direction: 'asc' }); }}
            sx={{ color: '#90caf9' }}
          >
            Clear Filters
          </MuiButton>
        )}
      </Box>

      <TableContainer component={Paper} sx={{ bgcolor: 'transparent', border: '1px solid #444', maxHeight: 400, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead sx={{ bgcolor: '#1e1e1e' }}>
            <TableRow>
              <TableCell sx={{ bgcolor: '#1e1e1e', color: '#b3b3b3', borderBottom: '1px solid #444' }}>
                <TableSortLabel
                  active={sortConfig.key === 'label'}
                  direction={sortConfig.key === 'label' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('label')}
                  sx={{
                    color: '#b3b3b3 !important',
                    '& .MuiTableSortLabel-icon': { color: '#b3b3b3 !important' }
                  }}
                >
                  Key Name (Label)
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ bgcolor: '#1e1e1e', color: '#b3b3b3', borderBottom: '1px solid #444' }}>
                <TableSortLabel
                  active={sortConfig.key === 'points'}
                  direction={sortConfig.key === 'points' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('points')}
                  sx={{
                    color: '#b3b3b3 !important',
                    '& .MuiTableSortLabel-icon': { color: '#b3b3b3 !important' }
                  }}
                >
                  Points
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ bgcolor: '#1e1e1e', color: '#b3b3b3', borderBottom: '1px solid #444' }}>
                <TableSortLabel
                  active={sortConfig.key === 'targetForm'}
                  direction={sortConfig.key === 'targetForm' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('targetForm')}
                  sx={{
                    color: '#b3b3b3 !important',
                    '& .MuiTableSortLabel-icon': { color: '#b3b3b3 !important' }
                  }}
                >
                  Target
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ bgcolor: '#1e1e1e', color: '#b3b3b3', borderBottom: '1px solid #444', textAlign: 'center', width: 140 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {processedFields.map((field, index) => (
              <TableRow key={field.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell sx={{ borderBottom: '1px solid #333', p: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    disabled={!editMode}
                    {...register(`scoringKeys.${field.originalIndex}.label`, { required: true })}
                    sx={textFieldStyles}
                    placeholder="e.g. Critical Issue"
                  />
                </TableCell>
                <TableCell sx={{ borderBottom: '1px solid #333', p: 1, width: 120 }}>
                  <TextField
                    type="number"
                    fullWidth
                    size="small"
                    variant="outlined"
                    disabled={!editMode}
                    {...register(`scoringKeys.${field.originalIndex}.points`, { required: true })}
                    sx={textFieldStyles}
                  />
                </TableCell>
                <TableCell sx={{ borderBottom: '1px solid #333', p: 1, width: 140 }}>
                  <Controller
                    control={control}
                    name={`scoringKeys.${field.originalIndex}.targetForm`}
                    defaultValue={field.targetForm || "Both"}
                    render={({ field: { onChange, value, ref } }) => (
                      <TextField
                        select
                        fullWidth
                        size="small"
                        variant="outlined"
                        disabled={!editMode}
                        inputRef={ref}
                        value={value}
                        onChange={onChange}
                        sx={textFieldStyles}
                        SelectProps={{ native: true }}
                      >
                        <option value="Both">Both</option>
                        <option value="Task">Task</option>
                        <option value="Issue">Issue</option>
                      </TextField>
                    )}
                  />
                </TableCell>
                <TableCell sx={{ borderBottom: '1px solid #333', p: 1, textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                    <IconButton
                      onClick={() => handleMove(index, 'up')}
                      disabled={isReorderDisabled || index === 0}
                      size="small"
                      sx={{ color: isReorderDisabled ? '#444' : '#90caf9' }}
                    >
                      <ArrowUpward fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() => handleMove(index, 'down')}
                      disabled={isReorderDisabled || index === fields.length - 1}
                      size="small"
                      sx={{ color: isReorderDisabled ? '#444' : '#90caf9' }}
                    >
                      <ArrowDownward fontSize="small" />
                    </IconButton>
                    <IconButton onClick={() => remove(field.originalIndex)} disabled={!editMode} color="error" size="small">
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {processedFields.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} sx={{ textAlign: 'center', py: 3, color: '#666' }}>
                  No keys found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {editMode && (
        <MuiButton
          startIcon={<Add />}
          onClick={() => {
            // If sorted/filtered, we append to the end anyway
            append({ label: '', points: 0, targetForm: 'Both' });
            // Optionally clear filters to show the new item, but user might find that annoying.
            // For now, let's keep filters.
          }}
          sx={{ mt: 2, color: '#1976d2', borderColor: '#1976d2' }}
          variant="outlined"
        >
          Add Key
        </MuiButton>
      )
      }
    </Box >
  );
};

export default SettingsPage;
