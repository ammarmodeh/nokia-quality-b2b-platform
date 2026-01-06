import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Divider,
  FormHelperText,
  useTheme,
  useMediaQuery,
  Box,
  IconButton,
  Paper,
  Stack,
  Autocomplete,
  Chip,
  MenuItem
} from "@mui/material";
import ManagedAutocomplete from "./common/ManagedAutocomplete";
import { MdAdd, MdDelete } from 'react-icons/md';



const AddSessionDialog = ({ open, onClose, onSave, teamName }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [sessionDate, setSessionDate] = useState("");
  const [conductedBy, setConductedBy] = useState([]);
  const [sessionTitle, setSessionTitle] = useState("");
  const [location, setLocation] = useState("");
  const [sessionType, setSessionType] = useState("");
  // const [duration, setDuration] = useState(""); // Removed in favor of split fields
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");

  const [outlines, setOutlines] = useState([
    { mainTopic: "", subTopics: [""] }
  ]);
  const [errors, setErrors] = useState({
    sessionDate: false,
    conductedBy: false,
    sessionTitle: false,
    location: false,
    sessionType: false,
    duration: false,
    outlines: false
  });

  const validateFields = () => {
    const hasValidOutlines = outlines.some(outline =>
      outline.mainTopic.trim()
    );

    const newErrors = {
      sessionDate: !sessionDate,
      conductedBy: conductedBy.length === 0,
      sessionTitle: !sessionTitle.trim(),
      location: !location.trim(),
      sessionType: !sessionType,
      duration: (!durationHours && !durationMinutes) || (durationHours === '0' && durationMinutes === '0'),
      outlines: !hasValidOutlines
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSave = () => {
    if (!validateFields()) return;

    // Filter out empty outlines and subtopics
    const filteredOutlines = outlines
      .filter(outline => outline.mainTopic.trim())
      .map(outline => ({
        mainTopic: outline.mainTopic.trim(),
        subTopics: outline.subTopics.filter(sub => sub.trim()).map(sub => sub.trim())
      }));

    // Construct duration string
    let durationString = "";
    if (durationHours && parseInt(durationHours) > 0) durationString += `${durationHours} hr `;
    if (durationMinutes && parseInt(durationMinutes) > 0) durationString += `${durationMinutes} mins`;
    durationString = durationString.trim();


    const sessionData = {
      sessionDate: new Date(sessionDate).toISOString(),
      conductedBy: conductedBy, // Array of strings
      sessionTitle: sessionTitle.trim(),
      location: location.trim(),
      sessionType: sessionType,
      duration: durationString || "0 mins",
      outlines: filteredOutlines,
    };
    onSave(sessionData);
    handleClose();
  };

  const handleClose = () => {
    // Reset form
    setSessionDate("");
    setConductedBy([]);
    setSessionTitle("");
    setLocation("");
    setSessionType("");
    setDurationHours("");
    setDurationMinutes("");
    setOutlines([{ mainTopic: "", subTopics: [""] }]);
    setErrors({
      sessionDate: false,
      conductedBy: false,
      sessionTitle: false,
      location: false,
      sessionType: false,
      duration: false,
      outlines: false
    });
    onClose();
  };

  const handleFieldChange = (field) => (e) => {
    if (errors[field]) {
      setErrors({ ...errors, [field]: false });
    }
    switch (field) {
      case 'sessionDate': setSessionDate(e.target.value); break;
      case 'sessionTitle': setSessionTitle(e.target.value); break;
      case 'location': setLocation(e.target.value); break;
      case 'sessionType': setSessionType(e.target.value); break;
      case 'duration': setDuration(e.target.value); break;
    }
  };

  // Outline management functions
  const addMainTopic = () => {
    setOutlines([...outlines, { mainTopic: "", subTopics: [""] }]);
    if (errors.outlines) {
      setErrors({ ...errors, outlines: false });
    }
  };

  const removeMainTopic = (index) => {
    const newOutlines = outlines.filter((_, i) => i !== index);
    setOutlines(newOutlines.length > 0 ? newOutlines : [{ mainTopic: "", subTopics: [""] }]);
  };

  const updateMainTopic = (index, value) => {
    const newOutlines = [...outlines];
    newOutlines[index].mainTopic = value;
    setOutlines(newOutlines);
    if (errors.outlines) {
      setErrors({ ...errors, outlines: false });
    }
  };

  const addSubTopic = (mainIndex) => {
    const newOutlines = [...outlines];
    newOutlines[mainIndex].subTopics.push("");
    setOutlines(newOutlines);
  };

  const removeSubTopic = (mainIndex, subIndex) => {
    const newOutlines = [...outlines];
    newOutlines[mainIndex].subTopics = newOutlines[mainIndex].subTopics.filter((_, i) => i !== subIndex);
    if (newOutlines[mainIndex].subTopics.length === 0) {
      newOutlines[mainIndex].subTopics = [""];
    }
    setOutlines(newOutlines);
  };

  const updateSubTopic = (mainIndex, subIndex, value) => {
    const newOutlines = [...outlines];
    newOutlines[mainIndex].subTopics[subIndex] = value;
    setOutlines(newOutlines);
    if (errors.outlines) {
      setErrors({ ...errors, outlines: false });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: '#2d2d2d',
          boxShadow: 'none',
          borderRadius: fullScreen ? '0px' : '8px',
        }
      }}
    >
      <DialogTitle sx={{
        backgroundColor: '#2d2d2d',
        color: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px',
      }}>
        Add Training Session for{" "}
        <Typography component="span" sx={{ fontWeight: "bold", color: '#7b68ee' }}>
          {teamName}
        </Typography>
      </DialogTitle>

      <Divider sx={{ backgroundColor: '#e5e7eb' }} />

      <DialogContent sx={{
        backgroundColor: '#2d2d2d',
        color: '#ffffff',
        padding: '20px 24px',
        '&.MuiDialogContent-root': {
          padding: '20px 24px',
        },
      }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <TextField
              label="Session Date"
              type="date"
              fullWidth
              margin="normal"
              required
              error={errors.sessionDate}
              InputLabelProps={{
                shrink: true,
                style: { color: errors.sessionDate ? '#f44336' : '#6b7280' }
              }}
              value={sessionDate}
              onChange={handleFieldChange('sessionDate')}
              sx={{
                '& .MuiInputBase-root': { color: '#ffffff' },
                '& .MuiOutlinedInput-root fieldset': { borderColor: errors.sessionDate ? '#f44336' : '#e5e7eb' },
                '& .MuiOutlinedInput-root:hover fieldset': { borderColor: errors.sessionDate ? '#f44336' : '#666' },
                '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: errors.sessionDate ? '#f44336' : '#7b68ee' },
              }}
            />
            {errors.sessionDate && (
              <FormHelperText error sx={{ mt: -1, mb: 1, color: '#f44336' }}>
                Session date is required
              </FormHelperText>
            )}
          </Box>

          <Box>
            <TextField
              label="Session Location"
              fullWidth
              margin="normal"
              required
              error={errors.location}
              InputLabelProps={{ style: { color: errors.location ? '#f44336' : '#6b7280' } }}
              value={location}
              onChange={handleFieldChange('location')}
              placeholder="e.g. Conference Room A, Site 101"
              sx={{
                '& .MuiInputBase-root': { color: '#ffffff' },
                '& .MuiOutlinedInput-root fieldset': { borderColor: errors.location ? '#f44336' : '#e5e7eb' },
                '& .MuiOutlinedInput-root:hover fieldset': { borderColor: errors.location ? '#f44336' : '#666' },
                '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: errors.location ? '#f44336' : '#7b68ee' },
              }}
            />
            {errors.location && (
              <FormHelperText error sx={{ mt: -1, mb: 1, color: '#f44336' }}>
                Location is required
              </FormHelperText>
            )}
          </Box>
        </Box>

        <ManagedAutocomplete
          category="SUPERVISORS"
          multiple
          freeSolo
          disableCloseOnSelect
          filterSelectedOptions
          label="Conducted By (Supervisors)"
          fullWidth
          value={conductedBy}
          onChange={(newValue) => {
            setConductedBy(newValue);
            if (errors.conductedBy && newValue.length > 0) {
              setErrors({ ...errors, conductedBy: false });
            }
          }}
          required={conductedBy.length === 0}
          error={errors.conductedBy}
          sx={{
            mt: 2,
            mb: 1,
            '& .MuiInputBase-root': { color: '#ffffff' },
            '& .MuiOutlinedInput-root fieldset': { borderColor: errors.conductedBy ? '#f44336' : '#e5e7eb' },
            '& .MuiOutlinedInput-root:hover fieldset': { borderColor: errors.conductedBy ? '#f44336' : '#666' },
            '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: errors.conductedBy ? '#f44336' : '#7b68ee' },
            '& .MuiChip-root': {
              color: '#ffffff',
              borderColor: '#7b68ee',
              '& .MuiChip-deleteIcon': { color: '#f44336' }
            }
          }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                variant="outlined"
                label={option}
                {...getTagProps({ index })}
                sx={{
                  color: '#ffffff',
                  borderColor: '#7b68ee',
                  '& .MuiChip-deleteIcon': { color: '#f44336' }
                }}
              />
            ))
          }
        />
        {errors.conductedBy && (
          <FormHelperText error sx={{ mt: -1, mb: 1, color: '#f44336' }}>
            At least one supervisor is required
          </FormHelperText>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <ManagedAutocomplete
              category="SESSION_TYPE"
              label="Session Type"
              fullWidth
              freeSolo
              required
              error={errors.sessionType}
              value={sessionType}
              onChange={(val) => {
                setSessionType(val);
                if (errors.sessionType) setErrors({ ...errors, sessionType: false });
              }}
              sx={{
                mt: 2,
                mb: 1,
                '& .MuiInputBase-root': { color: '#ffffff' },
                '& .MuiOutlinedInput-root fieldset': { borderColor: errors.sessionType ? '#f44336' : '#e5e7eb' },
                '& .MuiOutlinedInput-root:hover fieldset': { borderColor: errors.sessionType ? '#f44336' : '#666' },
                '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: errors.sessionType ? '#f44336' : '#7b68ee' },
              }}
            />
            {errors.sessionType && (
              <FormHelperText error sx={{ mt: -1, mb: 1, color: '#f44336' }}>
                Session type is required
              </FormHelperText>
            )}
          </Box>


          <Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Hours"
                type="number"
                fullWidth
                margin="normal"
                value={durationHours}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 0) setDurationHours(e.target.value);
                  else if (e.target.value === '') setDurationHours('');
                  if (errors.duration) setErrors({ ...errors, duration: false });
                }}
                sx={{
                  '& .MuiInputBase-root': { color: '#ffffff' },
                  '& .MuiInputLabel-root': { color: errors.duration ? '#f44336' : '#6b7280' },
                  '& .MuiOutlinedInput-root fieldset': { borderColor: errors.duration ? '#f44336' : '#e5e7eb' },
                  '& .MuiOutlinedInput-root:hover fieldset': { borderColor: errors.duration ? '#f44336' : '#666' },
                  '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: errors.duration ? '#f44336' : '#7b68ee' },
                }}
              />
              <TextField
                label="Minutes"
                type="number"
                fullWidth
                margin="normal"
                value={durationMinutes}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 0 && val < 60) setDurationMinutes(e.target.value);
                  else if (e.target.value === '') setDurationMinutes('');
                  if (errors.duration) setErrors({ ...errors, duration: false });
                }}
                sx={{
                  '& .MuiInputBase-root': { color: '#ffffff' },
                  '& .MuiInputLabel-root': { color: errors.duration ? '#f44336' : '#6b7280' },
                  '& .MuiOutlinedInput-root fieldset': { borderColor: errors.duration ? '#f44336' : '#e5e7eb' },
                  '& .MuiOutlinedInput-root:hover fieldset': { borderColor: errors.duration ? '#f44336' : '#666' },
                  '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: errors.duration ? '#f44336' : '#7b68ee' },
                }}
              />
            </Box>
            {errors.duration && (
              <FormHelperText error sx={{ mt: -1, mb: 1, color: '#f44336' }}>
                Duration is required
              </FormHelperText>
            )}
          </Box>
        </Box>

        <TextField
          label="Session Title"
          fullWidth
          margin="normal"
          required
          error={errors.sessionTitle}
          value={sessionTitle}
          onChange={handleFieldChange('sessionTitle')}
          sx={{
            '& .MuiInputBase-root': { color: '#ffffff' },
            '& .MuiInputLabel-root': { color: errors.sessionTitle ? '#f44336' : '#6b7280' },
            '& .MuiOutlinedInput-root fieldset': { borderColor: errors.sessionTitle ? '#f44336' : '#e5e7eb' },
            '& .MuiOutlinedInput-root:hover fieldset': { borderColor: errors.sessionTitle ? '#f44336' : '#666' },
            '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: errors.sessionTitle ? '#f44336' : '#7b68ee' },
          }}
        />
        {errors.sessionTitle && (
          <FormHelperText error sx={{ mt: -1, mb: 1, color: '#f44336' }}>
            Session title is required
          </FormHelperText>
        )}

        {/* Training Outlines Section */}
        <Box sx={{ mt: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ color: '#6b7280', fontWeight: 500 }}>
              Training Outlines *
            </Typography>
            <Button
              startIcon={<MdAdd />}
              onClick={addMainTopic}
              size="small"
              sx={{
                color: '#7b68ee',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(123, 104, 238, 0.1)',
                }
              }}
            >
              Add Main Topic
            </Button>
          </Stack>

          {outlines.map((outline, mainIndex) => (
            <Paper
              key={mainIndex}
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                backgroundColor: '#1a1a1a',
                border: '1px solid #3d3d3d',
                borderRadius: 2
              }}
            >
              {/* Main Topic */}
              <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  placeholder={`Main Topic ${mainIndex + 1}`}
                  value={outline.mainTopic}
                  onChange={(e) => updateMainTopic(mainIndex, e.target.value)}
                  sx={{
                    '& .MuiInputBase-root': {
                      color: '#ffffff',
                      backgroundColor: '#2d2d2d',
                    },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#e5e7eb',
                      },
                      '&:hover fieldset': {
                        borderColor: '#666',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#7b68ee',
                      },
                    },
                  }}
                />
                <IconButton
                  onClick={() => removeMainTopic(mainIndex)}
                  disabled={outlines.length === 1}
                  sx={{
                    color: outlines.length === 1 ? '#666' : '#f44336',
                    '&:hover': {
                      backgroundColor: outlines.length === 1 ? 'transparent' : 'rgba(244, 67, 54, 0.1)',
                    }
                  }}
                >
                  <MdDelete size={20} />
                </IconButton>
              </Stack>

              {/* Subtopics */}
              <Box sx={{ pl: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                    Subtopics
                  </Typography>
                  <Button
                    startIcon={<MdAdd />}
                    onClick={() => addSubTopic(mainIndex)}
                    size="small"
                    sx={{
                      color: '#60a5fa',
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      '&:hover': {
                        backgroundColor: 'rgba(96, 165, 250, 0.1)',
                      }
                    }}
                  >
                    Add Subtopic
                  </Button>
                </Stack>

                {outline.subTopics.map((subTopic, subIndex) => (
                  <Stack key={subIndex} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography sx={{ color: '#9ca3af', minWidth: '20px' }}>•</Typography>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder={`Subtopic ${subIndex + 1}`}
                      value={subTopic}
                      onChange={(e) => updateSubTopic(mainIndex, subIndex, e.target.value)}
                      sx={{
                        '& .MuiInputBase-root': {
                          color: '#ffffff',
                          backgroundColor: '#2d2d2d',
                        },
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: '#4b5563',
                          },
                          '&:hover fieldset': {
                            borderColor: '#666',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#60a5fa',
                          },
                        },
                      }}
                    />
                    <IconButton
                      onClick={() => removeSubTopic(mainIndex, subIndex)}
                      disabled={outline.subTopics.length === 1}
                      size="small"
                      sx={{
                        color: outline.subTopics.length === 1 ? '#666' : '#f87171',
                        '&:hover': {
                          backgroundColor: outline.subTopics.length === 1 ? 'transparent' : 'rgba(248, 113, 113, 0.1)',
                        }
                      }}
                    >
                      <MdDelete size={16} />
                    </IconButton>
                  </Stack>
                ))}
              </Box>
            </Paper>
          ))}

          {errors.outlines && (
            <FormHelperText error sx={{ color: '#f44336', mt: -1 }}>
              At least one main topic with one subtopic is required
            </FormHelperText>
          )}
        </Box>
      </DialogContent>

      <Divider sx={{ backgroundColor: '#e5e7eb' }} />

      <DialogActions sx={{
        backgroundColor: '#2d2d2d',
        borderTop: '1px solid #e5e7eb',
        padding: '12px 24px',
      }}>
        <Button
          onClick={handleClose}
          sx={{
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#2a2a2a',
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{
            backgroundColor: '#1976d2',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#1565c0',
            }
          }}
        >
          Save Session
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddSessionDialog;