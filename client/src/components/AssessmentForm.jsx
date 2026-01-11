import { useCallback, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Chip,
  Grid,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  FormLabel,
  RadioGroup,
  Radio,
  Alert,
  Tooltip
} from "@mui/material";
import {
  ExpandMore,
  ExpandLess,
  CheckCircle,
  ErrorOutline,
  Info,
  Assignment,
  Psychology,
  Handyman,
  SupportAgent,
  EmojiEvents
} from '@mui/icons-material';
import { useSelector } from "react-redux";

const AssessmentForm = ({
  initialAssessment,
  loading,
  colors,
  onSubmit,
  calculateOverallScore,
  getPerformanceColor,
  editMode,

  onCancel,
  isMobile
}) => {
  const [feedback, setFeedback] = useState(initialAssessment.feedback);
  const [checkPoints, setCheckPoints] = useState(initialAssessment.checkPoints);
  const [expandedNotes, setExpandedNotes] = useState({});
  const user = useSelector((state) => state?.auth?.user);

  const glassStyle = {
    background: colors.surface,
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    border: `1px solid ${colors.border}`,
    borderRadius: '24px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
  };

  const checkpointStyle = {
    p: isMobile ? 1.5 : 3,
    mb: isMobile ? 1.5 : 2.5,
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: `1px solid ${colors.border}`,
    borderRadius: '16px',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderColor: colors.primary
    }
  };

  const handleCheckPointChange = useCallback((index, field, value) => {
    setCheckPoints(prevCheckPoints => {
      const updated = [...prevCheckPoints];
      updated[index][field] = value;
      if (field === 'isAvailable' && value === false) {
        updated[index].score = 0;
      }
      return updated;
    });
  }, []);

  const toggleNotes = (index) => {
    setExpandedNotes(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const getCheckpointScoreOptions = (checkpointName) => {
    const labels = {
      "Consumables Availability": ["Not Available", "Limited", "Partially Available", "Mostly Available", "Fully Available"],
      "Splicing Equipment": ["Defective / Non-Functional", "Poor / Manual Workaround", "Fair", "Good", "Excellent"],
      "Testing Tools": ["Defective", "Poor", "Fair", "Good", "Excellent"],
      "Patience and Precision": ["Rushed", "Poor Precision", "Adequate", "Precise", "Meticulous"],
      "Communication": ["Unprofessional", "Minimal", "Average", "Professional", "Exceptional"],
      "Appearance": ["Untidy", "Incomplete", "Acceptable", "Professional", "Flawless"]
    };

    const key = Object.keys(labels).find(k => checkpointName.includes(k));
    if (key) {
      return labels[key].map((label, i) => ({ value: i + 1, label }));
    }
    return null;
  };

  const isEquipmentCheckpoint = (name) => name.includes("Equipment") || name.includes("Tools");

  const categoryIcons = {
    "Splicing & Testing Equipment": <Handyman />,
    "Fiber Optic Splicing Skills": <Psychology />,
    "ONT Placement, Configuration and testing": <CheckCircle />,
    "Customer Education": <Info />,
    "Customer Service Skills": <SupportAgent />
  };

  const validateForm = () => {
    if (!feedback?.trim()) return false;
    return checkPoints.every(p => p.score > 0 ? p.isCompleted : true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      conductedBy: user.name,
      conductedById: user._id,
      feedback,
      checkPoints,
      overallScore: calculateOverallScore(checkPoints)
    });
  };

  const overallPercentage = calculateOverallScore(checkPoints);

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ ...glassStyle, p: { xs: 3, md: 5 }, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 5 }}>
        <Box>
          <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 800, color: colors.textPrimary, mb: 1 }}>
            {editMode ? "Refine Assessment" : "Operational Audit"}
          </Typography>
          <Typography variant="body2" sx={{ color: colors.textSecondary }}>
            Logged as specialist: <strong>{user.name}</strong>
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block', mb: 1 }}>Calculated Score</Typography>
          <Chip
            icon={<EmojiEvents sx={{ color: 'inherit !important' }} />}
            label={`${overallPercentage}%`}
            sx={{
              height: 48,
              fontSize: '1.25rem',
              fontWeight: 800,
              bgcolor: `${colors[getPerformanceColor(overallPercentage)]}20`,
              color: colors[getPerformanceColor(overallPercentage)],
              border: `2px solid ${colors[getPerformanceColor(overallPercentage)]}40`,
              px: 2
            }}
          />
        </Box>
      </Box>

      {/* Checkpoints Groups */}
      {["Splicing & Testing Equipment", "Fiber Optic Splicing Skills", "ONT Placement, Configuration and testing", "Customer Education", "Customer Service Skills"].map(category => (
        <Box key={category} sx={{ mb: 6 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, borderBottom: `1px solid ${colors.border}`, pb: 1.5 }}>
            <Box sx={{ color: colors.primary }}>{categoryIcons[category] || <Assignment />}</Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: colors.textPrimary }}>{category}</Typography>
          </Box>

          {checkPoints.filter(p => p.category === category).map((point, idx) => {
            const realIndex = checkPoints.findIndex(cp => cp === point);
            return (
              <Box key={idx} sx={checkpointStyle}>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} md={5}>
                    <Typography variant={isMobile ? "subtitle2" : "subtitle1"} sx={{ fontWeight: 700, mb: 0.5 }}>{point.name}</Typography>
                    <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 2, fontSize: isMobile ? '0.75rem' : '0.875rem' }}>{point.description}</Typography>

                    {isEquipmentCheckpoint(point.name) && (
                      <RadioGroup
                        row
                        value={point.isAvailable !== false ? "available" : "notAvailable"}
                        onChange={(e) => handleCheckPointChange(realIndex, 'isAvailable', e.target.value === 'available')}
                      >
                        <FormControlLabel value="available" control={<Radio size="small" />} label={<Typography variant="caption">Functional</Typography>} />
                        <FormControlLabel value="notAvailable" control={<Radio size="small" color="error" />} label={<Typography variant="caption">Missing/Defective</Typography>} />
                      </RadioGroup>
                    )}
                  </Grid>

                  <Grid item xs={6} md={2}>
                    <FormControlLabel
                      control={<Checkbox checked={point.isCompleted} disabled={point.isAvailable === false} size={isMobile ? "small" : "medium"} onChange={(e) => handleCheckPointChange(realIndex, "isCompleted", e.target.checked)} />}
                      label={<Typography variant="body2" sx={{ fontWeight: 600, fontSize: isMobile ? '0.8rem' : '1rem' }}>Validated</Typography>}
                    />
                  </Grid>

                  <Grid item xs={6} md={5}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: colors.textSecondary }}>Performance Metric</InputLabel>
                      <Select
                        value={point.score}
                        label="Performance Metric"
                        size={isMobile ? "small" : "medium"}
                        disabled={point.isAvailable === false}
                        onChange={(e) => handleCheckPointChange(realIndex, "score", e.target.value)}
                        sx={{ borderRadius: '12px', fontSize: isMobile ? '0.8rem' : '1rem' }}
                      >
                        {point.isAvailable === false ? (
                          <MenuItem value={0}>Score Fixed to 0 (Not Available)</MenuItem>
                        ) : (getCheckpointScoreOptions(point.name) || [1, 2, 3, 4, 5].map(v => ({ value: v, label: v }))).map(opt => (
                          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        placeholder="Add specialist notes (Arabic supported)..."
                        fullWidth
                        multiline
                        rows={expandedNotes[realIndex] ? 4 : 1}
                        value={point.notes || ""}
                        onChange={(e) => handleCheckPointChange(realIndex, "notes", e.target.value)}
                        disabled={point.isAvailable === false}
                        sx={{ direction: 'rtl', '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                      />
                      <IconButton onClick={() => toggleNotes(realIndex)} sx={{ color: colors.textSecondary }}>
                        {expandedNotes[realIndex] ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            );
          })}
        </Box>
      ))}

      {/* Footer / Feedback Section */}
      <Box sx={{ mt: 4, pt: 4, borderTop: `1px solid ${colors.border}` }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Final Observations</Typography>
        <TextField
          label="Comprehensive Auditor Feedback"
          fullWidth
          multiline
          rows={5}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Summarize the overall quality and key recommendations..."
          sx={{ mb: 4, direction: 'rtl', '& .MuiOutlinedInput-root': { borderRadius: '16px' } }}
          error={!feedback?.trim()}
          helperText={!feedback?.trim() ? "Feedback/Synthesis is mandatory for data quality" : ""}
        />

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          {editMode && (
            <Button onClick={onCancel} sx={{ px: 4, borderRadius: '12px', color: colors.textSecondary }}>
              Discard Changes
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !validateForm()}
            sx={{
              px: 6,
              py: 1.5,
              borderRadius: '12px',
              bgcolor: colors.primary,
              boxShadow: `0 8px 16px ${colors.primary}40`,
              '&:hover': { bgcolor: colors.primary, boxShadow: `0 12px 24px ${colors.primary}60` }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : editMode ? "Commit Updates" : "Finalize Assessment"}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default AssessmentForm;