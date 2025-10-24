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
  Alert
} from "@mui/material";
import { ExpandMore, ExpandLess, Circle } from '@mui/icons-material';
import { useSelector } from "react-redux";

const AssessmentForm = ({
  initialAssessment,
  loading,
  colors,
  onSubmit,
  calculateOverallScore,
  getPerformanceColor,
  editMode,
  onCancel
}) => {
  const [feedback, setFeedback] = useState(initialAssessment.feedback);
  const [checkPoints, setCheckPoints] = useState(initialAssessment.checkPoints);
  const [expandedNotes, setExpandedNotes] = useState({});
  const user = useSelector((state) => state?.auth?.user);

  const handleCheckPointChange = useCallback((index, field, value) => {
    setCheckPoints(prevCheckPoints => {
      const updated = [...prevCheckPoints];
      updated[index][field] = value;

      // If marking as not available, set score to 0
      if (field === 'isAvailable' && value === false) {
        updated[index].score = 0;
      }
      return updated;
    });
  }, [])

  const toggleNotes = (index) => {
    setExpandedNotes(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const scoreOptions = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  const getCheckpointScoreOptions = (checkpointName) => {
    // Equipment Condition (4 levels)
    if (checkpointName === "Splicing Equipment Condition (FSM)" ||
      checkpointName === "Testing Tools Condition (OPM and VFL)") {
      return [
        { value: 0, label: "Defective", color: "error" },
        { value: 50, label: "Marginal", color: "warning" },
        { value: 75, label: "Good", color: "success" },
        { value: 100, label: "Excellent", color: "success" }
      ];
    }

    // Consumables Availability (3 levels)
    if (checkpointName === "Consumables Availability") {
      return [
        { value: 0, label: "Not Available", color: "error" },
        { value: 50, label: "Partially Available", color: "warning" },
        { value: 100, label: "Fully Available", color: "success" }
      ];
    }

    // Customer Service Skills - Appearance
    if (checkpointName === "Appearance") {
      return [
        { value: 0, label: "Unprofessional", color: "error", description: "Inappropriate attire, poor grooming" },
        { value: 30, label: "Needs Improvement", color: "warning", description: "Basic but could be more professional" },
        { value: 70, label: "Professional", color: "success", description: "Neat and appropriate for the job" },
        { value: 100, label: "Exemplary", color: "success", description: "Exceeds professional standards" }
      ];
    }

    // Customer Service Skills - Communication
    if (checkpointName === "Communication") {
      return [
        { value: 0, label: "Poor", color: "error", description: "Unclear, unprofessional language" },
        { value: 40, label: "Basic", color: "warning", description: "Understandable but could improve" },
        { value: 80, label: "Effective", color: "success", description: "Clear and professional" },
        { value: 100, label: "Exceptional", color: "success", description: "Excellent listening and explanation skills" }
      ];
    }

    // Customer Service Skills - Patience and Precision
    if (checkpointName === "Patience and Precision") {
      return [
        { value: 0, label: "Rushed", color: "error", description: "Hurried through tasks, missed details" },
        { value: 50, label: "Adequate", color: "warning", description: "Took time but could be more thorough" },
        { value: 85, label: "Thorough", color: "success", description: "Patient and precise in work" },
        { value: 100, label: "Meticulous", color: "success", description: "Exceptional attention to detail" }
      ];
    }

    return null; // Default to percentage-based
  };

  const isEquipmentCheckpoint = (checkpointName) => {
    return [
      "Splicing Equipment Condition (FSM)",
      "Testing Tools Condition (OPM and VFL)"
    ].includes(checkpointName);
  };

  const isSpecialScoringCheckpoint = (checkpointName) => {
    return [
      "Splicing Equipment Condition (FSM)",
      "Testing Tools Condition (OPM and VFL)",
      "Consumables Availability"
    ].includes(checkpointName);
  };

  const CheckpointsByCategory = useCallback(({ checkPoints, handleCheckPointChange, colors }) => {
    const categories = checkPoints.reduce((acc, checkpoint, index) => {
      const category = checkpoint.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({ ...checkpoint, index });
      return acc;
    }, {});

    const categoryOrder = [
      "Splicing & Testing Equipment",
      "Fiber Optic Splicing Skills",
      "ONT Placement, Configuration and testing",
      "Customer Education",
      "Customer Service Skills"
    ];

    return (
      <>
        {categoryOrder.map(category => (
          <Box key={category} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{
              color: colors.primary,
              mb: 2,
              borderBottom: `1px solid ${colors.border}`,
              pb: 1
            }}>
              {category}
            </Typography>

            {categories[category]?.map(point => (
              <Paper key={point.index} sx={{
                p: 2,
                mb: 2,
                backgroundColor: colors.surfaceElevated,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px'
              }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle1" sx={{ color: colors.textPrimary }}>
                      {point.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                      {point.description}
                    </Typography>

                    {/* Availability Toggle for Equipment */}
                    {isEquipmentCheckpoint(point.name) && (
                      <Box sx={{ mt: 1 }}>
                        <FormControl component="fieldset">
                          <FormLabel component="legend" sx={{ color: colors.textPrimary }}>
                            Equipment Status
                          </FormLabel>
                          <RadioGroup
                            row
                            value={point.isAvailable !== false ? "available" : "notAvailable"}
                            onChange={(e) => handleCheckPointChange(
                              point.index,
                              'isAvailable',
                              e.target.value === 'available'
                            )}
                          >
                            <FormControlLabel
                              value="available"
                              control={<Radio sx={{ color: colors.primary }} />}
                              label="Available"
                              sx={{ color: colors.textPrimary }}
                            />
                            <FormControlLabel
                              value="notAvailable"
                              control={<Radio sx={{ color: colors.error }} />}
                              label="Not Available"
                              sx={{ color: colors.textPrimary }}
                            />
                          </RadioGroup>
                        </FormControl>
                      </Box>
                    )}
                  </Grid>

                  <Grid item xs={6} sm={6} md={2}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={point.isCompleted}
                          onChange={(e) => handleCheckPointChange(point.index, "isCompleted", e.target.checked)}
                          disabled={point.isAvailable === false}
                          sx={{
                            color: colors.primary,
                            '&.Mui-checked': {
                              color: colors.primary,
                            },
                            '&.Mui-disabled': {
                              color: colors.textSecondary,
                            },
                          }}
                        />
                      }
                      label="Completed"
                      sx={{
                        color: point.isAvailable === false ? colors.textSecondary : colors.textPrimary
                      }}
                    />
                  </Grid>

                  <Grid item xs={6} sm={6} md={3}>
                    <FormControl fullWidth>
                      <InputLabel sx={{
                        color: point.isAvailable === false ? colors.textSecondary : colors.textPrimary
                      }}>
                        {isSpecialScoringCheckpoint(point.name) ?
                          (point.name === "Consumables Availability" ? "Availability" : "Condition") :
                          "Score"}
                      </InputLabel>
                      <Select
                        value={point.score}
                        onChange={(e) => handleCheckPointChange(point.index, "score", e.target.value)}
                        label={isSpecialScoringCheckpoint(point.name) ?
                          (point.name === "Consumables Availability" ? "Availability" : "Condition") :
                          "Score"}
                        disabled={point.isAvailable === false}
                        sx={{
                          color: point.isAvailable === false ? colors.textSecondary : colors.textPrimary,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: point.isAvailable === false ? colors.border : colors.primary,
                          },
                          '&.Mui-disabled': {
                            backgroundColor: colors.surface,
                          }
                        }}
                      >
                        {point.isAvailable === false ? (
                          <MenuItem value={0} sx={{ color: colors.error }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Circle sx={{
                                color: colors.error,
                                fontSize: '1rem',
                                mr: 1
                              }} />
                              Not Available
                            </Box>
                          </MenuItem>
                        ) : getCheckpointScoreOptions(point.name) ? (
                          getCheckpointScoreOptions(point.name).map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.value}
                              sx={{ color: colors[option.color] }}
                            >
                              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Circle sx={{
                                    color: colors[option.color],
                                    fontSize: '1rem',
                                    mr: 1
                                  }} />
                                  <Typography>{option.label}</Typography>
                                </Box>
                                {option.description && (
                                  <Typography variant="caption" sx={{
                                    color: colors.textSecondary,
                                    ml: '24px', // Match icon width + margin
                                    fontStyle: 'italic'
                                  }}>
                                    {option.description}
                                  </Typography>
                                )}
                              </Box>
                            </MenuItem>
                          ))
                        ) : (
                          scoreOptions.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}%
                            </MenuItem>
                          ))
                        )}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} md={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TextField
                        label="Notes"
                        fullWidth
                        multiline
                        rows={expandedNotes[point.index] ? 5 : 1}
                        value={point.notes}
                        onChange={(e) => handleCheckPointChange(point.index, "notes", e.target.value)}
                        disabled={point.isAvailable === false}
                        InputLabelProps={{
                          style: {
                            color: point.isAvailable === false ? colors.textSecondary : colors.textPrimary
                          }
                        }}
                        InputProps={{
                          style: {
                            color: point.isAvailable === false ? colors.textSecondary : colors.textPrimary
                          }
                        }}
                        sx={{
                          direction: 'rtl',
                          textAlign: 'right',
                          '& .MuiOutlinedInput-root.Mui-disabled': {
                            backgroundColor: colors.surface,
                          }
                        }}
                      />
                      <IconButton
                        onClick={() => toggleNotes(point.index)}
                        size="small"
                        disabled={point.isAvailable === false}
                        sx={{
                          ml: 1,
                          color: point.isAvailable === false ? colors.textSecondary : colors.textPrimary
                        }}
                      >
                        {expandedNotes[point.index] ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Box>
        ))}
      </>
    );
  }, [expandedNotes]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const completeAssessment = {
      conductedBy: user.name,
      conductedById: user._id,
      feedback,
      checkPoints,
      categoryWeights: initialAssessment.categoryWeights,
      overallScore: calculateOverallScore(checkPoints, initialAssessment.categoryWeights)
    };
    onSubmit(completeAssessment);
  };

  const validateForm = () => {
    if (!user.name || !feedback?.trim()) return false;

    let isValid = true;
    const warnings = []; // Optional: Collect warnings for UI feedback

    checkPoints.forEach(point => {
      if (point.score > 0 && !point.isCompleted) {
        isValid = false;
        warnings.push(`${point.name}: Score given but not marked as completed.`);
      }
      // Remove or soften this: Allow completed + low score, but warn
      if (point.isCompleted && point.score <= 0) {
        // isValid = false; // Comment out to allow submission
        warnings.push(`${point.name}: Marked as completed but score is 0—consider if this fits.`);
      }
    });

    return isValid;
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 3,
        mb: 4,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px'
      }}>
      <Typography variant="h5" gutterBottom sx={{
        color: colors.primary,
        fontWeight: 'bold',
        mb: 3
      }}>
        {editMode ? "Edit Assessment" : "New Assessment"}
      </Typography>

      <TextField
        label="Conducted By"
        fullWidth
        value={user.name}
        sx={{ mb: 2 }}
        InputLabelProps={{
          style: { color: colors.textSecondary }
        }}
        InputProps={{
          style: { color: colors.textPrimary }
        }}
      />

      <Typography variant="h6" gutterBottom sx={{
        color: colors.textPrimary,
        mb: 2
      }}>
        Assessment Check Points
      </Typography>

      <CheckpointsByCategory
        checkPoints={checkPoints}
        handleCheckPointChange={handleCheckPointChange}
        colors={colors}
      />

      <Typography variant="h6" sx={{
        mt: 2,
        color: colors.textPrimary
      }}>
        Overall Score: <Chip
          label={`${calculateOverallScore(checkPoints, initialAssessment.categoryWeights)}%`}
          color={getPerformanceColor(calculateOverallScore(checkPoints, initialAssessment.categoryWeights))}
          variant="outlined"
          sx={{ ml: 1 }}
        />
      </Typography>

      {!feedback?.trim() && (
        <Alert severity="warning" sx={{ mt: 1, mb: 2 }}>
          Feedback is required to submit the assessment.
        </Alert>
      )}

      <TextField
        label="Feedback"
        fullWidth
        multiline
        rows={4}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        sx={{ mt: 2, mb: 2, direction: 'rtl', textAlign: 'right' }}
        InputLabelProps={{
          style: { color: colors.textSecondary }
        }}
        InputProps={{
          style: { color: colors.textPrimary }
        }}
      />

      <Box sx={{ display: 'flex', gap: 2 }}>
        {editMode && (
          <Button
            variant="outlined"
            onClick={onCancel}
            sx={{
              color: colors.textPrimary,
              borderColor: colors.border,
              '&:hover': {
                borderColor: colors.primary
              }
            }}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading || !validateForm()}
          sx={{
            backgroundColor: colors.primary,
            '&:hover': {
              backgroundColor: '#1d4ed8',
            },
            '&:disabled': {
              backgroundColor: '#555',
              color: '#999'
            }
          }}
        >
          {loading ? <CircularProgress size={24} sx={{ color: colors.textPrimary }} /> : editMode ? "Update Assessment" : "Submit Assessment"}
        </Button>
      </Box>
    </Paper>
  );
};

export default AssessmentForm;