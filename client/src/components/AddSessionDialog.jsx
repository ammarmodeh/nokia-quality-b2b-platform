import { useState, useEffect } from "react";
import api from "../api/api";
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
} from "@mui/material";
import ManagedAutocomplete from "./common/ManagedAutocomplete";
import { MdAdd, MdDelete } from 'react-icons/md';



const AddSessionDialog = ({ open, onClose, onSave, teamName }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await api.get('/field-teams/get-recent-sessions', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        if (response.data?.success) {
          setTemplates(response.data.sessions || []);
        }
      } catch (error) {
        console.error("Error fetching session templates:", error);
      }
    };

    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const handleApplyTemplate = (template) => {
    if (!template) return;
    setSelectedTemplate(template);
    setSessionTitle(template.sessionTitle || "");
    setLocation(template.location || "");
    setSessionType(template.sessionType || "");
    setConductedBy(template.conductedBy || []);
    
    // Parse duration string (e.g., "1 hr 30 mins")
    const duration = template.duration || "";
    const hoursMatch = duration.match(/(\d+)\s*hr/);
    const minutesMatch = duration.match(/(\d+)\s*mins/);
    
    setDurationHours(hoursMatch ? hoursMatch[1] : "");
    setDurationMinutes(minutesMatch ? minutesMatch[1] : "");
    
    if (template.outlines) {
      setOutlines(template.outlines.map(o => ({
        mainTopic: o.mainTopic || "",
        subTopics: o.subTopics && o.subTopics.length > 0 ? o.subTopics : [""]
      })));
    }
  };

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
      isTemplate: saveAsTemplate
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
    setSelectedTemplate(null);
    setSaveAsTemplate(false);
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
     
    >
      <DialogTitle sx={{ padding: '16px 24px' }}>
        Add Training Session for{" "}
        <Typography component="span" sx={{ fontWeight: "600", color: 'var(--accent-text)' }}>
          {teamName}
        </Typography>
      </DialogTitle>

      <Divider sx={{ backgroundColor: '#e5e7eb' }} />

      <DialogContent sx={{ padding: '20px 24px', '&.MuiDialogContent-root': {
          padding: '20px 24px',
        } }}>
        {/* Template Selection */}
        <Box sx={{ mb: 3 }}>
          <Autocomplete
            options={templates}
            getOptionLabel={(option) => `${option.sessionTitle} (${option.sessionType || 'Training'}) - ${new Date(option.createdAt).toLocaleDateString()}`}
            value={selectedTemplate}
            onChange={(e, newValue) => handleApplyTemplate(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Quick Fill: Load from Past Sessions"
                placeholder="Search past sessions..."
                sx={{
                  '& .MuiInputBase-root': { color: 'var(--text)' },
                  '& .MuiInputLabel-root': { color: 'var(--text-muted)' },
                  '& .MuiOutlinedInput-root fieldset': { borderColor: 'var(--border)' },
                  '& .MuiOutlinedInput-root:hover fieldset': { borderColor: 'var(--text-muted)' },
                  '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: 'var(--accent)' },
                }}
              />
            )}
            sx={{
              '& .MuiAutocomplete-endAdornment .MuiIconButton-root': { color: 'var(--text-muted)' },
            }}
            componentsProps={{
              paper: {
                sx: {
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  '& .MuiAutocomplete-option': {
                    fontSize: '0.85rem',
                    '&:hover': { backgroundColor: 'rgba(108, 71, 255, 0.15)' },
                    '&[aria-selected="true"]': { backgroundColor: 'rgba(108, 71, 255, 0.25)' },
                  }
                }
              }
            }}
          />
          <Typography variant="caption" sx={{ color: 'var(--text-muted)', mt: 1, display: 'block' }}>
            Select a previous session to automatically fill the form fields below.
          </Typography>
        </Box>
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
                style: { color: errors.sessionDate ? '#DC2626' : '#6b7280' }
              }}
              value={sessionDate}
              onChange={handleFieldChange('sessionDate')}
              sx={{
                '& .MuiInputBase-root': { color: 'var(--text)' },
                '& .MuiOutlinedInput-root fieldset': { borderColor: errors.sessionDate ? '#DC2626' : '#e5e7eb' },
                '& .MuiOutlinedInput-root:hover fieldset': { borderColor: errors.sessionDate ? '#DC2626' : 'var(--text-muted)' },
                '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: errors.sessionDate ? '#DC2626' : '#6C47FF' },
              }}
            />
            {errors.sessionDate && (
              <FormHelperText error sx={{ mt: -1, mb: 1, color: '#DC2626' }}>
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
              InputLabelProps={{ style: { color: errors.location ? '#DC2626' : '#6b7280' } }}
              value={location}
              onChange={handleFieldChange('location')}
              placeholder="e.g. Conference Room A, Site 101"
              sx={{
                '& .MuiInputBase-root': { color: 'var(--text)' },
                '& .MuiOutlinedInput-root fieldset': { borderColor: errors.location ? '#DC2626' : '#e5e7eb' },
                '& .MuiOutlinedInput-root:hover fieldset': { borderColor: errors.location ? '#DC2626' : 'var(--text-muted)' },
                '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: errors.location ? '#DC2626' : '#6C47FF' },
              }}
            />
            {errors.location && (
              <FormHelperText error sx={{ mt: -1, mb: 1, color: '#DC2626' }}>
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
            '& .MuiInputBase-root': { color: 'var(--text)' },
            '& .MuiOutlinedInput-root fieldset': { borderColor: errors.conductedBy ? '#DC2626' : '#e5e7eb' },
            '& .MuiOutlinedInput-root:hover fieldset': { borderColor: errors.conductedBy ? '#DC2626' : 'var(--text-muted)' },
            '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: errors.conductedBy ? '#DC2626' : '#6C47FF' },
            '& .MuiChip-root': {
              color: 'var(--text)',
              borderColor: 'var(--accent)',
              '& .MuiChip-deleteIcon': { color: '#DC2626' }
            }
          }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                variant="outlined"
                label={option}
                {...getTagProps({ index })}
                sx={{
                  color: 'var(--text)',
                  borderColor: 'var(--accent)',
                  '& .MuiChip-deleteIcon': { color: '#DC2626' }
                }}
              />
            ))
          }
        />
        {errors.conductedBy && (
          <FormHelperText error sx={{ mt: -1, mb: 1, color: '#DC2626' }}>
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
                '& .MuiInputBase-root': { color: 'var(--text)' },
                '& .MuiOutlinedInput-root fieldset': { borderColor: errors.sessionType ? '#DC2626' : '#e5e7eb' },
                '& .MuiOutlinedInput-root:hover fieldset': { borderColor: errors.sessionType ? '#DC2626' : 'var(--text-muted)' },
                '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: errors.sessionType ? '#DC2626' : '#6C47FF' },
              }}
            />
            {errors.sessionType && (
              <FormHelperText error sx={{ mt: -1, mb: 1, color: '#DC2626' }}>
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
                  '& .MuiInputBase-root': { color: 'var(--text)' },
                  '& .MuiInputLabel-root': { color: errors.duration ? '#DC2626' : '#6b7280' },
                  '& .MuiOutlinedInput-root fieldset': { borderColor: errors.duration ? '#DC2626' : '#e5e7eb' },
                  '& .MuiOutlinedInput-root:hover fieldset': { borderColor: errors.duration ? '#DC2626' : 'var(--text-muted)' },
                  '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: errors.duration ? '#DC2626' : '#6C47FF' },
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
                  '& .MuiInputBase-root': { color: 'var(--text)' },
                  '& .MuiInputLabel-root': { color: errors.duration ? '#DC2626' : '#6b7280' },
                  '& .MuiOutlinedInput-root fieldset': { borderColor: errors.duration ? '#DC2626' : '#e5e7eb' },
                  '& .MuiOutlinedInput-root:hover fieldset': { borderColor: errors.duration ? '#DC2626' : 'var(--text-muted)' },
                  '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: errors.duration ? '#DC2626' : '#6C47FF' },
                }}
              />
            </Box>
            {errors.duration && (
              <FormHelperText error sx={{ mt: -1, mb: 1, color: '#DC2626' }}>
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
            '& .MuiInputBase-root': { color: 'var(--text)' },
            '& .MuiInputLabel-root': { color: errors.sessionTitle ? '#DC2626' : '#6b7280' },
            '& .MuiOutlinedInput-root fieldset': { borderColor: errors.sessionTitle ? '#DC2626' : '#e5e7eb' },
            '& .MuiOutlinedInput-root:hover fieldset': { borderColor: errors.sessionTitle ? '#DC2626' : 'var(--text-muted)' },
            '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: errors.sessionTitle ? '#DC2626' : '#6C47FF' },
          }}
        />
        {errors.sessionTitle && (
          <FormHelperText error sx={{ mt: -1, mb: 1, color: '#DC2626' }}>
            Session title is required
          </FormHelperText>
        )}

        {/* Training Outlines Section */}
        <Box sx={{ mt: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ color: 'var(--text-muted)', fontWeight: 500 }}>
              Training Outlines *
            </Typography>
            <Button
              startIcon={<MdAdd />}
              onClick={addMainTopic}
              size="small"
              sx={{
                color: 'var(--accent-text)',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(108, 71, 255, 0.1)',
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
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
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
                      color: 'var(--text)',
                      backgroundColor: 'var(--surface)',
                    },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'var(--border)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'var(--text-muted)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'var(--accent)',
                      },
                    },
                  }}
                />
                <IconButton
                  onClick={() => removeMainTopic(mainIndex)}
                  disabled={outlines.length === 1}
                  sx={{
                    color: outlines.length === 1 ? 'var(--text-muted)' : '#DC2626',
                    '&:hover': {
                      backgroundColor: outlines.length === 1 ? 'transparent' : 'rgba(220, 38, 38, 0.1)',
                    }
                  }}
                >
                  <MdDelete size={20} />
                </IconButton>
              </Stack>

              {/* Subtopics */}
              <Box sx={{ pl: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                    Subtopics
                  </Typography>
                  <Button
                    startIcon={<MdAdd />}
                    onClick={() => addSubTopic(mainIndex)}
                    size="small"
                    sx={{
                      color: '#2563EB',
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      '&:hover': {
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                      }
                    }}
                  >
                    Add Subtopic
                  </Button>
                </Stack>

                {outline.subTopics.map((subTopic, subIndex) => (
                  <Stack key={subIndex} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography sx={{ color: 'var(--text-secondary)', minWidth: '20px' }}>•</Typography>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder={`Subtopic ${subIndex + 1}`}
                      value={subTopic}
                      onChange={(e) => updateSubTopic(mainIndex, subIndex, e.target.value)}
                      sx={{
                        '& .MuiInputBase-root': {
                          color: 'var(--text)',
                          backgroundColor: 'var(--surface)',
                        },
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: 'var(--border)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'var(--text-muted)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#2563EB',
                          },
                        },
                      }}
                    />
                    <IconButton
                      onClick={() => removeSubTopic(mainIndex, subIndex)}
                      disabled={outline.subTopics.length === 1}
                      size="small"
                      sx={{
                        color: outline.subTopics.length === 1 ? 'var(--text-muted)' : '#f87171',
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
            <FormHelperText error sx={{ color: '#DC2626', mt: -1 }}>
              At least one main topic with one subtopic is required
            </FormHelperText>
          )}
        </Box>
      </DialogContent>

      <Divider sx={{ backgroundColor: '#e5e7eb' }} />

      <DialogActions sx={{ padding: '12px 24px', display: 'flex', alignItems: 'center' }}>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', ml: 1 }}>
          <Box
            component="label"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              '&:hover': { color: 'var(--text)' }
            }}
          >
            <input
              type="checkbox"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#6C47FF',
                cursor: 'pointer'
              }}
            />
            Save as Template for future use
          </Box>
        </Box>
        <Button
          onClick={handleClose}
          sx={{
            color: 'var(--text)',
            '&:hover': {
              backgroundColor: 'var(--surface)',
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{ '&:hover': {
              backgroundColor: '#1565c0',
            } }}
        >
          Save Session
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddSessionDialog;