import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
  Grid
} from "@mui/material";
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Timer as TimerIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Score as ScoreIcon,
  Edit as EditIcon,
  Close as CloseIcon
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
    <Box sx={{ p: isMobile ? 2 : 4, maxWidth: '1000px', margin: '0 auto' }}>
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

          <Divider sx={{ my: 4, borderColor: '#444' }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={<Switch checked={watch("notifications.emailAlerts")} disabled={!editMode} onChange={(e) => setValue("notifications.emailAlerts", e.target.checked, { shouldDirty: true })} />}
              label={<Typography sx={{ color: '#ffffff' }}>Enable Email Alerts</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={watch("notifications.pushNotifications")} disabled={!editMode} onChange={(e) => setValue("notifications.pushNotifications", e.target.checked, { shouldDirty: true })} />}
              label={<Typography sx={{ color: '#ffffff' }}>Enable Push Notifications</Typography>}
            />
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

export default SettingsPage;
