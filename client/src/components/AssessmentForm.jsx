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
  IconButton
} from "@mui/material";
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { useSelector } from "react-redux";

const AssessmentForm = ({
  initialAssessment,
  loading,
  colors,
  onSubmit,
  calculateOverallScore,
  getPerformanceColor,
  editMode
}) => {
  // Split the state into smaller pieces
  // const [conductedBy, setConductedBy] = useState(initialAssessment.conductedBy);
  const [feedback, setFeedback] = useState(initialAssessment.feedback);
  const [checkPoints, setCheckPoints] = useState(initialAssessment.checkPoints);
  const [expandedNotes, setExpandedNotes] = useState({});
  const user = useSelector((state) => state?.auth?.user);

  // Optimized handler for checkpoint changes
  const handleCheckPointChange = useCallback((index, field, value) => {
    if (field === "notes") {
      // For notes, update immediately without state function for better responsiveness
      const updatedCheckPoints = [...checkPoints];
      updatedCheckPoints[index][field] = value;
      setCheckPoints(updatedCheckPoints);
    } else {
      // For other fields, use the standard approach
      setCheckPoints(prevCheckPoints => {
        const updated = [...prevCheckPoints];
        updated[index][field] = value;
        return updated;
      });
    }
  }, [checkPoints]);

  const toggleNotes = (index) => {
    setExpandedNotes(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const scoreOptions = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  // Memoized CheckpointsByCategory component
  const CheckpointsByCategory = useCallback(({ checkPoints, handleCheckPointChange, colors }) => {
    const categories = checkPoints.reduce((acc, checkpoint, index) => {
      const category = checkpoint.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({ ...checkpoint, index });
      return acc;
    }, {});

    const categoryTitles = {
      "Splicing & Testing Equipment": "Splicing & Testing Equipment",
      "Fiber Optic Splicing Skills": "Fiber Optic Splicing Skills",
      "ONT Placement, Configuration and testing": "ONT Placement, Configuration and testing",
      "Customer Education": "Customer Education",
      "Customer Service Skills": "Customer Service Skills"
    };

    const categoryOrder = ["Splicing & Testing Equipment", "Fiber Optic Splicing Skills", "ONT Placement, Configuration and testing", "Customer Education", "Customer Service Skills"];

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
              {categoryTitles[category]}
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
                  </Grid>
                  <Grid item xs={6} sm={6} md={2}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={point.isCompleted}
                          onChange={(e) => handleCheckPointChange(point.index, "isCompleted", e.target.checked)}
                          sx={{
                            color: colors.primary,
                            '&.Mui-checked': {
                              color: colors.primary,
                            },
                          }}
                        />
                      }
                      label="Completed"
                      sx={{ color: colors.textPrimary }}
                    />
                  </Grid>
                  <Grid item xs={6} sm={6} md={3}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: colors.textSecondary }}>Score</InputLabel>
                      <Select
                        value={point.score}
                        onChange={(e) => handleCheckPointChange(point.index, "score", e.target.value)}
                        label="Score"
                        sx={{
                          color: colors.textPrimary,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: colors.border,
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: colors.primary,
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: colors.primary,
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              backgroundColor: colors.surfaceElevated,
                              color: colors.textPrimary,
                              '& .MuiMenuItem-root': {
                                '&:hover': {
                                  backgroundColor: colors.primaryHover,
                                },
                                '&.Mui-selected': {
                                  backgroundColor: `${colors.primary}22`,
                                },
                                '&.Mui-selected:hover': {
                                  backgroundColor: `${colors.primary}33`,
                                },
                              }
                            }
                          }
                        }}
                      >
                        {scoreOptions.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}%
                          </MenuItem>
                        ))}
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
                        InputLabelProps={{
                          style: { color: colors.textSecondary }
                        }}
                        InputProps={{
                          style: { color: colors.textPrimary }
                        }}
                        sx={{
                          direction: 'rtl',
                          textAlign: 'right',
                        }}
                      />
                      <IconButton
                        onClick={() => toggleNotes(point.index)}
                        size="small"
                        sx={{ ml: 1, color: colors.textSecondary }}
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

  // Combine all state when submitting
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form behavior
    const completeAssessment = {
      conductedBy: user.name, // Use the actual user name
      conductedById: user._id,
      feedback,
      checkPoints,
      categoryWeights: initialAssessment.categoryWeights,
      overallScore: calculateOverallScore(checkPoints, initialAssessment.categoryWeights)
    };
    onSubmit(completeAssessment); // Use the prop name consistently
  };

  const validateForm = () => {
    // Check if user name and feedback exist
    if (!user.name || !feedback) return false;

    // Check all checkpoints
    const allValid = checkPoints.every(point => {
      // If score is > 0, checkbox must be checked
      if (point.score > 0 && !point.isCompleted) return false;

      // If checkbox is checked, score must be > 0
      if (point.isCompleted && point.score <= 0) return false;

      return true;
    });

    return allValid;
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
        // onChange={(e) => setConductedBy(e.target.value)}
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

      <Button
        type="submit"
        variant="contained"
        color="primary"
        onClick={handleSubmit}
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
    </Paper>
  );
};

export default AssessmentForm;