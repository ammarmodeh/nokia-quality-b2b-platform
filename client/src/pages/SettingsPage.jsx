import DashboardCustomizeOutlined from "@mui/icons-material/DashboardCustomizeOutlined";
import { lazy, Suspense, useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { useColorScheme } from "@mui/material/styles";
import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import PageLoader from "../components/ui/PageLoader";
import Profile from "./Profile";
import ChangePassword from "./ChangePassword";
import Users from "./Users";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import KeyOutlined from "@mui/icons-material/KeyOutlined";
import PersonOutline from "@mui/icons-material/PersonOutline";
import LockOutlined from "@mui/icons-material/LockOutlined";
import ManageAccountsOutlined from "@mui/icons-material/ManageAccountsOutlined";
import ContrastOutlined from "@mui/icons-material/ContrastOutlined";
import api from "../api/api";
import {
  Box,
  Typography,
  TextField,
  Button as MuiButton,
  Snackbar,
  Alert,
  IconButton,
  InputAdornment,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel
} from "@mui/material";
import {
  Save as SaveIcon,
  Timer as TimerIcon,
  Settings as SettingsIcon,
  Score as ScoreIcon,
  Close as CloseIcon,
  Add,
  Search as SearchIcon,
  ArrowUpward,
  ArrowDownward
} from "@mui/icons-material";


const TemplateLibrary = lazy(() => import("./tables/TemplateLibrary"));
const SettingsPage = () => {
  const { user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [, setEditMode] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
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
      reset(data);
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

  const isAdmin = user?.role === "Admin";
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "general";
  const setTab = (t) => setSearchParams((p) => { const n = new URLSearchParams(p); if (t === "general") n.delete("tab"); else n.set("tab", t); return n; }, { replace: true });
  const { mode, setMode } = useColorScheme();
  const workspaceTabs = ["general", "assessment", "targets", "calendar", "scoring"];
  const isWorkspaceTab = workspaceTabs.includes(tab);

  const NAV = [
    { group: "Workspace", items: [
      { key: "general", label: "General", icon: SettingsIcon },
      { key: "assessment", label: "Assessment & timers", icon: TimerIcon },
      { key: "targets", label: "Targets & thresholds", icon: ScoreIcon },
      { key: "calendar", label: "Calendar", icon: CalendarMonthOutlined },
      { key: "scoring", label: "Scoring keys", icon: KeyOutlined },
    ] },
    { group: "Account", items: [
      { key: "profile", label: "Profile", icon: PersonOutline },
      { key: "security", label: "Security", icon: LockOutlined },
      ...(isAdmin ? [{ key: "users", label: "Users & roles", icon: ManageAccountsOutlined }] : []),
      { key: "appearance", label: "Appearance", icon: ContrastOutlined },
    ] },
    { group: "Data", items: [{ key: "templates", label: "Table templates", icon: DashboardCustomizeOutlined }] },
  ];

  const field = (name, label, props = {}) => (
    <TextField fullWidth label={label} disabled={!isAdmin} {...register(name, props.rules)} InputLabelProps={{ shrink: true }} {...props.extra} />
  );
  const num = (name, label, min, max, extra = {}) => (
    <TextField
      fullWidth
      type="number"
      label={label}
      disabled={!isAdmin}
      {...register(name, { min, max })}
      error={!!name.split(".").reduce((o, k) => o?.[k], errors)}
      helperText={name.split(".").reduce((o, k) => o?.[k], errors) ? `Value must be between ${min} and ${max}` : extra.helperText}
      InputLabelProps={{ shrink: true }}
    />
  );
  const Note = ({ children }) => (
    <Box sx={{ mt: 2, p: 1.5, borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface-subtle)", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.55 }}>{children}</Box>
  );

  return (
    <Box>
      <PageHeader title="Settings" description="Workspace configuration, your account and appearance." />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" }, gap: { xs: 2, md: 4 }, alignItems: "start" }}>
        {/* Vertical tabs */}
        <Box component="nav" aria-label="Settings sections" sx={{ position: { md: "sticky" }, top: { md: 72 }, display: "flex", flexDirection: { xs: "row", md: "column" }, gap: { xs: 0.5, md: 2 }, overflowX: { xs: "auto", md: "visible" }, pb: { xs: 1, md: 0 } }}>
          {NAV.map((g) => (
            <Box key={g.group} sx={{ display: "flex", flexDirection: { xs: "row", md: "column" }, gap: "2px" }}>
              <Typography sx={{ display: { xs: "none", md: "block" }, px: 1.25, mb: 0.5, fontSize: 11, fontWeight: 500, color: "var(--text-muted)" }}>{g.group}</Typography>
              {g.items.map((it) => {
                const Icon = it.icon;
                const active = tab === it.key;
                return (
                  <Box
                    key={it.key}
                    component="button"
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => setTab(it.key)}
                    sx={{
                      display: "flex", alignItems: "center", gap: 1.25, height: 32, px: 1.25, borderRadius: "6px", border: 0, cursor: "pointer",
                      font: "inherit", fontSize: 13, fontWeight: 500, textAlign: "left", whiteSpace: "nowrap", flexShrink: 0,
                      color: active ? "var(--text)" : "var(--text-secondary)",
                      backgroundColor: active ? "var(--surface-active)" : "transparent",
                      "&:hover": { backgroundColor: active ? "var(--surface-active)" : "var(--surface-hover)", color: "var(--text)" },
                      "& svg": { fontSize: 17, color: active ? "var(--accent-text)" : "var(--text-muted)" },
                      "&:focus-visible": { outline: "2px solid var(--focus-ring)" },
                    }}
                  >
                    <Icon />
                    {it.label}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>

        {/* Content */}
        <Box sx={{ minWidth: 0 }}>
          {isWorkspaceTab && !isAdmin && (
            <Note>Only admins can change workspace settings. You can view the current values below.</Note>
          )}
          {isWorkspaceTab && loading && <PageLoader minHeight={240} />}

          <Box component="form" onSubmit={handleSubmit(submitHandler)} sx={{ display: isWorkspaceTab && !loading ? "flex" : "none", flexDirection: "column", gap: 2, mt: isAdmin ? 0 : 2 }}>
            {tab === "general" && (
              <SectionCard title="General" description="Project identity shown across the app and on the field-team login.">
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>{field("projectName", "Project name")}</Grid>
                  <Grid item xs={12} sm={6}>{field("projectID", "Project ID / code")}</Grid>
                  <Grid item xs={12} sm={6}>{field("clientName", "Client name")}</Grid>
                  <Grid item xs={12} sm={6}>{field("projectManager", "Project manager")}</Grid>
                  <Grid item xs={12}>{field("projectBrief", "Project brief", { extra: { multiline: true, rows: 3 } })}</Grid>
                </Grid>
              </SectionCard>
            )}

            {tab === "assessment" && (
              <SectionCard title="Assessment & timers" description="Quiz timing and session length for the field-team technical assessment.">
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>{num("globalTimer", "Global quiz timer (min)", 1, 180)}</Grid>
                  <Grid item xs={12} sm={6}>{num("sessionTimeout", "Session timeout (min)", 1, 1440)}</Grid>
                  <Grid item xs={12} sm={6}>{num("thresholds.quizPassScore", "Quiz pass score (%)", 0, 100)}</Grid>
                  <Grid item xs={12} sm={6}>{num("thresholds.labPassScore", "Lab pass score (%)", 0, 100)}</Grid>
                </Grid>
              </SectionCard>
            )}

            {tab === "targets" && (
              <>
                <SectionCard title="NPS targets" description="Used by the dashboard KPI goals and trend target lines.">
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>{num("npsTargets.promoters", "Promoters target (≥ %)", 0, 100)}</Grid>
                    <Grid item xs={12} sm={6}>{num("npsTargets.detractors", "Detractors target (≤ %)", 0, 100)}</Grid>
                  </Grid>
                </SectionCard>
                <SectionCard title="Status thresholds" description="Global score bands (%).">
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>{num("thresholds.pass", "Pass", 0, 100)}</Grid>
                    <Grid item xs={12} sm={4}>{num("thresholds.average", "Average", 0, 100)}</Grid>
                    <Grid item xs={12} sm={4}>{num("thresholds.fail", "Fail", 0, 100)}</Grid>
                  </Grid>
                </SectionCard>
              </>
            )}

            {tab === "calendar" && (
              <>
                <SectionCard title="Weeks" description="How reporting weeks are numbered across dashboards and exports.">
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField select fullWidth label="Week start day" disabled={!isAdmin} {...register("weekStartDay")} InputLabelProps={{ shrink: true }} SelectProps={{ native: true }}>
                        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => <option key={d} value={i}>{d}</option>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>{num("startWeekNumber", "Calibration week number", 1, 100, { helperText: "Week number assigned to the calibration range" })}</Grid>
                    <Grid item xs={12} sm={6}>{field("week1StartDate", "Calibration start date", { extra: { type: "date" } })}</Grid>
                    <Grid item xs={12} sm={6}>{field("week1EndDate", "Calibration end date", { extra: { type: "date" } })}</Grid>
                  </Grid>
                  <Note>Define a date range (e.g. Jan 1 – Jan 5) and give it a week number (e.g. Week 1). Later dates advance one week every 7 days from the chosen week start day.</Note>
                </SectionCard>
                <SectionCard title="Months" description="First reporting month for month-based views.">
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>{field("month1StartDate", "Month 1 start date", { extra: { type: "date" } })}</Grid>
                    <Grid item xs={12} sm={6}>{field("month1EndDate", "Month 1 end date", { extra: { type: "date" } })}</Grid>
                  </Grid>
                  <Note>Following months are strict 4-week (28-day) periods, which gives a 13-month year.</Note>
                </SectionCard>
              </>
            )}

            {tab === "scoring" && (
              <SectionCard title="Scoring keys" description="Keys that can be applied to tasks and OJO snags; they appear as options in those forms.">
                <ScoringKeysEditor control={control} register={register} errors={errors} editMode={isAdmin} />
              </SectionCard>
            )}

            {isAdmin && isDirty && (
              <Box sx={{ position: "sticky", bottom: 16, zIndex: 5, display: "flex", alignItems: "center", gap: 1, p: 1.25, pl: 2, borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", boxShadow: "var(--shadow-md)" }}>
                <Typography sx={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>You have unsaved changes.</Typography>
                <MuiButton variant="outlined" onClick={() => fetchSettings()}>Discard</MuiButton>
                <MuiButton variant="contained" type="submit" startIcon={<SaveIcon sx={{ fontSize: 17 }} />}>Save changes</MuiButton>
              </Box>
            )}
          </Box>

          {tab === "profile" && <Profile embedded />}
          {tab === "security" && <ChangePassword embedded />}
          {tab === "users" && isAdmin && <Users embedded />}
          {tab === "templates" && <Suspense fallback={null}><TemplateLibrary /></Suspense>}
          {tab === "appearance" && (
            <SectionCard title="Appearance" description="Choose how QOps Tracker looks on this device.">
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.5 }}>
                {[
                  { value: "light", label: "Light", bg: "#FAFAFA", fg: "#FFFFFF", line: "#E5E7EB" },
                  { value: "dark", label: "Dark", bg: "#0B0B0F", fg: "#131318", line: "#26262E" },
                  { value: "system", label: "System", bg: "linear-gradient(90deg, #FAFAFA 50%, #0B0B0F 50%)", fg: "transparent", line: "#9394A1" },
                ].map((o) => {
                  const active = (mode || "system") === o.value;
                  return (
                    <Box key={o.value} component="button" type="button" onClick={() => setMode(o.value)} aria-pressed={active}
                      sx={{ p: 1, borderRadius: "10px", cursor: "pointer", font: "inherit", textAlign: "left", backgroundColor: "var(--surface)", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`, boxShadow: active ? "0 0 0 3px var(--accent-ring)" : "none" }}>
                      <Box sx={{ height: 84, borderRadius: "6px", background: o.bg, border: "1px solid var(--border)", p: 1, display: "flex", gap: 0.75 }}>
                        <Box sx={{ width: "28%", borderRadius: "4px", backgroundColor: o.fg, border: `1px solid ${o.line}` }} />
                        <Box sx={{ flex: 1, borderRadius: "4px", backgroundColor: o.fg, border: `1px solid ${o.line}` }} />
                      </Box>
                      <Typography sx={{ mt: 1, px: 0.5, fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{o.label}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </SectionCard>
          )}
        </Box>
      </Box>

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
    '& .MuiInputBase-root': { color: 'var(--text)', fontSize: '0.85rem' },
    '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: editMode ? 'var(--border)' : 'transparent' },
      '&:hover fieldset': { borderColor: editMode ? 'var(--border-strong)' : 'transparent' },
      '&.Mui-focused fieldset': { borderColor: '#1976d2' },
      backgroundColor: editMode ? 'var(--surface)' : 'transparent',
    },
    '& .Mui-disabled': {
      WebkitTextFillColor: 'var(--text) !important',
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
            '& .MuiOutlinedInput-root': { bgcolor: 'var(--surface)' }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'var(--text-muted)' }} />
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

      <TableContainer component={Paper} sx={{ bgcolor: 'transparent', border: '1px solid var(--border)', maxHeight: 400, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead sx={{ bgcolor: 'var(--surface)' }}>
            <TableRow>
              <TableCell sx={{ bgcolor: 'var(--surface)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                <TableSortLabel
                  active={sortConfig.key === 'label'}
                  direction={sortConfig.key === 'label' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('label')}
                  sx={{
                    color: 'var(--text-secondary) !important',
                    '& .MuiTableSortLabel-icon': { color: 'var(--text-secondary) !important' }
                  }}
                >
                  Key Name (Label)
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ bgcolor: 'var(--surface)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                <TableSortLabel
                  active={sortConfig.key === 'points'}
                  direction={sortConfig.key === 'points' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('points')}
                  sx={{
                    color: 'var(--text-secondary) !important',
                    '& .MuiTableSortLabel-icon': { color: 'var(--text-secondary) !important' }
                  }}
                >
                  Points
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ bgcolor: 'var(--surface)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                <TableSortLabel
                  active={sortConfig.key === 'targetForm'}
                  direction={sortConfig.key === 'targetForm' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('targetForm')}
                  sx={{
                    color: 'var(--text-secondary) !important',
                    '& .MuiTableSortLabel-icon': { color: 'var(--text-secondary) !important' }
                  }}
                >
                  Target
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ bgcolor: 'var(--surface)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'center', width: 140 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {processedFields.map((field, index) => (
              <TableRow key={field.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell sx={{ borderBottom: '1px solid var(--border)', p: 1 }}>
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
                <TableCell sx={{ borderBottom: '1px solid var(--border)', p: 1, width: 120 }}>
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
                <TableCell sx={{ borderBottom: '1px solid var(--border)', p: 1, width: 140 }}>
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
                <TableCell sx={{ borderBottom: '1px solid var(--border)', p: 1, textAlign: 'center' }}>
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
                <TableCell colSpan={3} sx={{ textAlign: 'center', py: 3, color: 'var(--text-muted)' }}>
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
