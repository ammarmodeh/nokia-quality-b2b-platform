import { useState } from "react";
import {
  Box,
  Checkbox,
  Divider,
  DialogContent,
  FormControlLabel,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  Collapse,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Stack,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import api from "../api/api";

const SIMPLE_QUESTIONS = [
  "Post-Service Follow-Up Instructions",
  "Service Rating Instructions"
  // Add other simple question names here
];

const SubtaskManager = ({
  subtasks,
  notes,
  expandedNotes,
  toggleNoteExpand,
  handleSaveNote,
  checkpoints,
  setCheckpoints,
  handleCheckpointToggle,
  selectedTaskId,
  selectedOption,
  handleOptionChange,
  predefinedOptions,
  handleNoteChange,
  handleShortNoteChange,
  setSubtasks,
  setAdditionalInfo,
  resolutionStatus,
  setResolutionStatus,
}) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const colors = {
    primary: "#1976d2",
    primaryDark: "#1565c0",
    secondary: "#7b68ee",
    success: "#4caf50",
    warning: "#ff9800",
    error: "#f44336",
    bg: "#1e1e1e",
    card: "#2d2d2d",
    border: "#3d3d3d",
    textPrimary: "#ffffff",
    textSecondary: "#b3b3b3",
  };

  const handleConditionalOptionChange = (subtaskIndex, checkpointIndex, value, fieldPath = 'selected') => {
    const updatedCheckpoints = [...checkpoints];
    const checkpoint = updatedCheckpoints[subtaskIndex]?.[checkpointIndex];

    if (!checkpoint?.options) return;

    // Handle nested field paths (e.g., actionTaken.justification.selected)
    const pathParts = fieldPath.split('.');
    let current = checkpoint.options;

    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) current[pathParts[i]] = {};
      current = current[pathParts[i]];
    }

    current[pathParts[pathParts.length - 1]] = value;

    // Clear dependent fields when needed
    if (fieldPath === 'actionTaken.selected' && value !== 'no_action') {
      if (checkpoint.options.actionTaken?.justification) {
        checkpoint.options.actionTaken.justification.selected = null;
        checkpoint.options.actionTaken.justification.notes.value = "";
      }
    }

    setCheckpoints(updatedCheckpoints);
  };

  const handleJustificationNotesChange = (subtaskIndex, checkpointIndex, value, fieldPath) => {
    const updatedCheckpoints = [...checkpoints];
    const checkpoint = updatedCheckpoints[subtaskIndex]?.[checkpointIndex];

    if (!checkpoint?.options) return;

    const pathParts = fieldPath.split('.');
    let current = checkpoint.options;

    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) current[pathParts[i]] = {};
      current = current[pathParts[i]];
    }

    current[pathParts[pathParts.length - 1]] = value;
    setCheckpoints(updatedCheckpoints);
  };

  const handleSignalTestNotesChange = (subtaskIndex, checkpointIndex, value) => {
    const updatedCheckpoints = [...checkpoints];
    if (
      updatedCheckpoints[subtaskIndex] &&
      updatedCheckpoints[subtaskIndex][checkpointIndex]
    ) {
      updatedCheckpoints[subtaskIndex][checkpointIndex].signalTestNotes = value;
      setCheckpoints(updatedCheckpoints);
    }
  };

  const handleRepeaterLocationChange = (subtaskIndex, checkpointIndex, value) => {
    const updatedCheckpoints = [...checkpoints];
    if (
      updatedCheckpoints[subtaskIndex] &&
      updatedCheckpoints[subtaskIndex][checkpointIndex] &&
      updatedCheckpoints[subtaskIndex][checkpointIndex].options
    ) {
      updatedCheckpoints[subtaskIndex][checkpointIndex].options.followUpQuestion.selected = value;
      // Clear actionTaken if changing to a non-issue option
      if (value === "acceptable" || value === "optimal") {
        if (updatedCheckpoints[subtaskIndex][checkpointIndex].options.followUpQuestion.actionTaken) {
          updatedCheckpoints[subtaskIndex][checkpointIndex].options.followUpQuestion.actionTaken.selected = null;
        }
      }
      setCheckpoints(updatedCheckpoints);
    }
  };

  const handleActionTakenChange = (subtaskIndex, checkpointIndex, value, isFollowUp = false) => {
    const updatedCheckpoints = [...checkpoints];
    if (
      updatedCheckpoints[subtaskIndex] &&
      updatedCheckpoints[subtaskIndex][checkpointIndex] &&
      updatedCheckpoints[subtaskIndex][checkpointIndex].options
    ) {
      if (isFollowUp) {
        if (updatedCheckpoints[subtaskIndex][checkpointIndex].options.followUpQuestion) {
          updatedCheckpoints[subtaskIndex][checkpointIndex].options.followUpQuestion.actionTaken.selected = value;
        }
      } else {
        updatedCheckpoints[subtaskIndex][checkpointIndex].options.actionTaken.selected = value;
      }
      setCheckpoints(updatedCheckpoints);
    }
  };

  const handleStatusUpdate = async (subtaskIndex, newStatus) => {
    if (!selectedTaskId) {
      console.error("Error: selectedTaskId is undefined");
      alert("Cannot update subtask: Task ID is missing. Please try again or contact support.");
      return;
    }

    const updatedSubtasks = subtasks.map((subtask, idx) => ({
      ...subtask,
      status: idx === subtaskIndex ? newStatus : subtask.status,
      dateTime: idx === subtaskIndex ? (newStatus === "Closed" ? new Date().toISOString() : null) : subtask.dateTime,
      shortNote: subtask.shortNote,
      checkpoints: checkpoints[idx] ? checkpoints[idx].map(cp => {
        const checkpointData = {
          ...cp,
          options: cp.options ? {
            ...cp.options,
            selected: cp.options.selected || null,
            actionTaken: cp.options.actionTaken ? {
              ...cp.options.actionTaken,
              selected: cp.options.actionTaken.selected || null,
              justification: cp.options.actionTaken.justification ? {
                ...cp.options.actionTaken.justification,
                selected: cp.options.actionTaken.justification.selected || null,
                notes: cp.options.actionTaken.justification.notes ? {
                  ...cp.options.actionTaken.justification.notes,
                  value: cp.options.actionTaken.justification.notes.value || ""
                } : null
              } : null
            } : null,
            generalJustification: cp.options.generalJustification ? {
              ...cp.options.generalJustification,
              selected: cp.options.generalJustification.selected || null,
              notes: cp.options.generalJustification.notes ? {
                ...cp.options.generalJustification.notes,
                value: cp.options.generalJustification.notes.value || ""
              } : null
            } : null
          } : null
        };
        return checkpointData;
      }) : []
    }));

    try {
      await api.put(
        `/tasks/update-subtask/${selectedTaskId}`,
        {
          subtasks: updatedSubtasks,
          notify: true,
          subtaskType: selectedOption,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      handleSaveNote(updatedSubtasks);
      setEditingIndex(null);
    } catch (error) {
      console.error(`Error updating subtask status to ${newStatus}:`, error);
      alert("Failed to update subtask status. Please try again.");
    }
  };

  const isSubtaskClosable = (subtaskIndex) => {
    const cps = checkpoints[subtaskIndex];
    if (!cps || cps.length === 0) return true; // For subtasks like "Task Reception"
    return cps.every((checkpoint) => checkpoint.checked);
  };

  const renderCheckpointOptions = (subtaskIndex, checkpointIndex, checkpoint, isClosed) => {
    if (SIMPLE_QUESTIONS.includes(checkpoint.name)) {
      return (
        <Box sx={{ mt: 2, p: 2, bgcolor: "rgba(255,255,255,0.03)", border: `1px solid ${colors.border}` }}>
          <Typography variant="caption" sx={{ color: colors.textSecondary, mb: 1, display: 'block', fontWeight: 'bold' }}>
            {checkpoint.options.question}
          </Typography>
          <RadioGroup
            row
            value={checkpoint.options.selected || ""}
            onChange={(e) => handleConditionalOptionChange(subtaskIndex, checkpointIndex, e.target.value)}
            disabled={isClosed}
          >
            {checkpoint.options.choices.map((choice) => (
              <FormControlLabel
                key={choice.value}
                value={choice.value}
                control={<Radio size="small" sx={{ color: colors.primary, '&.Mui-checked': { color: colors.primary } }} />}
                label={<Typography variant="body2" sx={{ color: colors.textPrimary }}>{choice.label}</Typography>}
              />
            ))}
          </RadioGroup>
        </Box>
      );
    }

    if (checkpoint.options?.type === "conditional") {
      const showActionTaken = checkpoint.options.actionTaken &&
        ["incorrect", "partial", "not_using", "not_discussed", "low", "weak", "low_power", "none", "minimal", "no", "not_delivered", "incomplete_unclear", "unacceptable_conduct", "rushed_service", "yes"].includes(checkpoint.options.selected);

      return (
        <Box sx={{ mt: 1 }}>
          <Box sx={{ p: 2, bgcolor: "rgba(255,255,255,0.03)", border: `1px solid ${colors.border}`, mb: showActionTaken ? 2 : 0 }}>
            <Typography variant="caption" sx={{ color: colors.textSecondary, mb: 1, display: 'block', fontWeight: 'bold' }}>
              {checkpoint.options.question}
            </Typography>
            <RadioGroup
              value={checkpoint.options.selected || ""}
              onChange={(e) => handleConditionalOptionChange(subtaskIndex, checkpointIndex, e.target.value)}
              disabled={isClosed}
            >
              <Grid container>
                {checkpoint.options.choices.map((choice) => (
                  <Grid item xs={12} sm={6} key={choice.value}>
                    <FormControlLabel
                      value={choice.value}
                      control={<Radio size="small" sx={{ color: colors.primary }} />}
                      label={<Typography variant="body2" sx={{ color: colors.textPrimary }}>{choice.label}</Typography>}
                    />
                  </Grid>
                ))}
              </Grid>
            </RadioGroup>
          </Box>

          {showActionTaken && (
            <Collapse in={showActionTaken}>
              <Box sx={{ p: 2, bgcolor: "rgba(25, 118, 210, 0.05)", border: `1px solid ${colors.primary}44` }}>
                <Typography variant="caption" sx={{ color: colors.primary, mb: 1, display: 'block', fontWeight: 'bold' }}>
                  {checkpoint.options.actionTaken.question}
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={checkpoint.options.actionTaken.selected || ""}
                    onChange={(e) => handleConditionalOptionChange(subtaskIndex, checkpointIndex, e.target.value, 'actionTaken.selected')}
                    disabled={isClosed}
                    sx={{
                      color: colors.textPrimary,
                      bgcolor: colors.bg,
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.border },
                    }}
                  >
                    {checkpoint.options.actionTaken.choices.map((choice) => (
                      <MenuItem key={choice.value} value={choice.value}>{choice.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {checkpoint.options.actionTaken.justification && checkpoint.options.actionTaken.selected === 'no_action' && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" sx={{ color: colors.warning, mb: 1, display: 'block', fontWeight: 'bold' }}>
                      {checkpoint.options.actionTaken.justification.question}
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={checkpoint.options.actionTaken.justification.selected || ""}
                        onChange={(e) => handleConditionalOptionChange(subtaskIndex, checkpointIndex, e.target.value, 'actionTaken.justification.selected')}
                        disabled={isClosed}
                        sx={{ color: colors.textPrimary, bgcolor: colors.bg }}
                      >
                        {checkpoint.options.actionTaken.justification.choices.map((choice) => (
                          <MenuItem key={choice.value} value={choice.value}>{choice.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {checkpoint.options.actionTaken.justification.notes && (
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                        placeholder={checkpoint.options.actionTaken.justification.notes.question}
                        value={checkpoint.options.actionTaken.justification.notes.value || ""}
                        onChange={(e) => handleJustificationNotesChange(subtaskIndex, checkpointIndex, e.target.value, 'actionTaken.justification.notes.value')}
                        disabled={isClosed}
                        sx={{ mt: 2, bgcolor: colors.bg, borderRadius: 1 }}
                      />
                    )}
                  </Box>
                )}
              </Box>
            </Collapse>
          )}

          {checkpoint.options.generalJustification && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "rgba(123, 104, 238, 0.05)", border: `1px solid ${colors.secondary}44` }}>
              <Typography variant="caption" sx={{ color: colors.secondary, mb: 1, display: 'block', fontWeight: 'bold' }}>
                {checkpoint.options.generalJustification.question}
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={checkpoint.options.generalJustification.selected || ""}
                  onChange={(e) => handleConditionalOptionChange(subtaskIndex, checkpointIndex, e.target.value, 'generalJustification.selected')}
                  disabled={isClosed}
                  sx={{ color: colors.textPrimary, bgcolor: colors.bg }}
                >
                  {checkpoint.options.generalJustification.choices.map((choice) => (
                    <MenuItem key={choice.value} value={choice.value}>{choice.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {checkpoint.options.generalJustification.notes && (
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  placeholder={checkpoint.options.generalJustification.notes.question}
                  value={checkpoint.options.generalJustification.notes.value || ""}
                  onChange={(e) => handleJustificationNotesChange(subtaskIndex, checkpointIndex, e.target.value, 'generalJustification.notes.value')}
                  disabled={isClosed}
                  sx={{ mt: 2, bgcolor: colors.bg, borderRadius: 1 }}
                />
              )}
            </Box>
          )}

          {checkpoint.name === "Wi-Fi Repeater Setup" && checkpoint.options?.selected === "yes_working" && checkpoint.options?.followUpQuestion?.question && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "rgba(46, 125, 80, 0.05)", border: `1px solid ${colors.success}44` }}>
              <Typography variant="caption" sx={{ color: colors.success, mb: 1, display: 'block', fontWeight: 'bold' }}>
                {checkpoint.options.followUpQuestion.question}
              </Typography>
              <RadioGroup
                value={checkpoint.options.followUpQuestion.selected || ""}
                onChange={(e) => handleRepeaterLocationChange(subtaskIndex, checkpointIndex, e.target.value)}
                disabled={isClosed}
              >
                {checkpoint.options.followUpQuestion.choices.map((choice) => (
                  <FormControlLabel
                    key={choice.value}
                    value={choice.value}
                    control={<Radio size="small" sx={{ color: colors.success }} />}
                    label={<Typography variant="body2" sx={{ color: colors.textPrimary }}>{choice.label}</Typography>}
                  />
                ))}
              </RadioGroup>
            </Box>
          )}
        </Box>
      );
    } else if (checkpoint.options?.type === "text") {
      return (
        <TextField
          fullWidth
          size="small"
          multiline
          rows={3}
          placeholder={checkpoint.options.question}
          value={checkpoint.options.value || ""}
          onChange={(e) => handleConditionalOptionChange(subtaskIndex, checkpointIndex, e.target.value, "value")}
          disabled={isClosed}
          sx={{ mt: 2, bgcolor: colors.bg, borderRadius: 1, direction: "rtl", textAlign: "right" }}
        />
      );
    } else if (checkpoint.name === "Rx Optics Signal Quality") {
      return (
        <TextField
          fullWidth
          size="small"
          placeholder="Enter the Rx optics signal, in dBm"
          value={checkpoint.signalTestNotes || ""}
          onChange={(e) => handleSignalTestNotesChange(subtaskIndex, checkpointIndex, e.target.value)}
          disabled={isClosed}
          sx={{ mt: 2, bgcolor: colors.bg, borderRadius: 1 }}
        />
      );
    }
    return null;
  };

  return (
    <DialogContent sx={{ padding: 0, overflowY: "auto", bgcolor: colors.bg }}>
      <Box sx={{ maxWidth: "100%" }}>
        <Stack spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
          <Box sx={{
            p: 0.5,
            bgcolor: colors.card,
            border: `1px solid ${colors.border}`,
            display: 'inline-flex'
          }}>
            <RadioGroup row value={selectedOption} onChange={handleOptionChange}>
              {predefinedOptions?.map((option) => (
                <FormControlLabel
                  key={option}
                  value={option}
                  control={<Radio size="small" sx={{ display: 'none' }} />}
                  label={
                    <Typography variant="body2" sx={{
                      fontWeight: "bold",
                      fontSize: '0.75rem',
                      color: selectedOption === option ? '#fff' : colors.textSecondary
                    }}>
                      {option.toUpperCase()}
                    </Typography>
                  }
                  sx={{
                    px: 2, py: 0.5, m: 0,
                    bgcolor: selectedOption === option ? colors.primary : 'transparent',
                    '&:hover': { bgcolor: selectedOption === option ? colors.primaryDark : 'rgba(255,255,255,0.05)' }
                  }}
                />
              ))}
            </RadioGroup>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="subtitle2" sx={{ color: colors.textPrimary, fontWeight: 'bold' }}>
              Subtask Execution Status: {selectedOption.toUpperCase()}
            </Typography>
          </Box>
        </Stack>

        {/* Resolution Status Selection */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            backgroundColor: 'rgba(123, 104, 238, 0.05)',
            border: `1px dashed ${colors.secondary}`,
            borderRadius: 0,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              color: colors.secondary,
              mb: 2,
              fontWeight: "bold",
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            Resolution Outcome
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {[
              "No Answer",
              "Answered and resolved",
              "Appointment scheduled",
              "No action taken",
              "Pending"
            ].map((status) => (
              <Chip
                key={status}
                label={status}
                onClick={() => setResolutionStatus(status)}
                sx={{
                  borderRadius: 0,
                  bgcolor: resolutionStatus === status ? colors.secondary : 'transparent',
                  color: resolutionStatus === status ? '#fff' : colors.textSecondary,
                  border: `1px solid ${resolutionStatus === status ? colors.secondary : colors.border}`,
                  fontWeight: 'bold',
                  '&:hover': {
                    bgcolor: resolutionStatus === status ? colors.secondary : 'rgba(255,255,255,0.05)',
                  }
                }}
              />
            ))}
          </Box>
        </Paper>

        <List sx={{ width: "100%" }}>
          {subtasks.map((subtask, subtaskIndex) => {
            const isExpanded = expandedNotes[subtaskIndex];
            const isClosed = subtask.status === "Closed";
            const inProgress = subtask.status === "In Progress";

            return (
              <Paper
                key={subtaskIndex}
                elevation={0}
                sx={{
                  mb: 1.5,
                  backgroundColor: colors.card,
                  borderRadius: 0,
                  overflow: "hidden",
                  border: `1px solid ${colors.border}`,
                  borderLeft: isExpanded ? `4px solid ${colors.primary}` : `4px solid ${isClosed ? colors.success : inProgress ? colors.primary : colors.border}`,
                }}
              >
                <ListItemButton
                  onClick={() => toggleNoteExpand(subtaskIndex)}
                  sx={{
                    p: 1.5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: isExpanded ? "rgba(255,255,255,0.02)" : "transparent",
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: isClosed ? colors.success : inProgress ? colors.primary : colors.bg,
                        color: "#fff",
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                        {subtaskIndex + 1}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: colors.textPrimary, fontWeight: "bold" }}>
                        {subtask.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                        {isClosed ? `Updated: ${new Date(subtask.dateTime).toLocaleDateString()}` : (subtask.optional ? "Optional Phase" : "Required Action")}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      label={subtask.status}
                      size="small"
                      sx={{
                        bgcolor: "transparent",
                        color: isClosed ? colors.success : inProgress ? colors.primary : colors.textSecondary,
                        fontWeight: "bold",
                        fontSize: '0.7rem',
                        border: `1px solid ${isClosed ? colors.success : inProgress ? colors.primary : colors.border}`,
                        borderRadius: 0
                      }}
                    />
                    {isExpanded ? <ExpandLess sx={{ color: colors.primary }} /> : <ExpandMore sx={{ color: colors.textSecondary }} />}
                  </Box>
                </ListItemButton>

                <Collapse in={isExpanded}>
                  <Box sx={{ px: 2, pb: 2, pt: 1 }}>
                    <Divider sx={{ mb: 2, borderColor: `${colors.border}44` }} />

                    <Typography variant="overline" sx={{ color: colors.primary, fontWeight: 'bold', letterSpacing: 1.5 }}>
                      Checkpoints Checklisting
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                      {checkpoints[subtaskIndex]?.map((checkpoint, checkpointIndex) => (
                        <Box
                          key={checkpointIndex}
                          sx={{
                            p: 1,
                            borderRadius: 0,
                            bgcolor: "transparent",
                            border: `1px solid ${colors.border}`,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <ListItemButton
                            dense
                            onClick={() => (subtask.status !== "Closed" || editingIndex === subtaskIndex) && handleCheckpointToggle(subtaskIndex, checkpointIndex)}
                            disabled={subtask.status === "Closed" && editingIndex !== subtaskIndex}
                            sx={{ borderRadius: 2 }}
                          >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              <Checkbox
                                edge="start"
                                checked={checkpoint.checked}
                                sx={{
                                  color: colors.border,
                                  '&.Mui-checked': { color: colors.success },
                                }}
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="body2" sx={{ color: colors.textPrimary, fontWeight: 500 }}>
                                  {checkpoint.name}
                                </Typography>
                              }
                            />
                          </ListItemButton>

                          <Box sx={{ pl: 5, pr: 2 }}>
                            {renderCheckpointOptions(subtaskIndex, checkpointIndex, checkpoint, subtask.status === "Closed" && editingIndex !== subtaskIndex)}
                          </Box>
                        </Box>
                      ))}
                    </Box>

                    <Box sx={{ mt: 2 }}>
                      <TextField
                        fullWidth
                        variant="outlined"
                        label={selectedOption === "others" ? "Explain reasoning" : "Audit Feedback"}
                        multiline
                        rows={2}
                        value={notes[subtaskIndex] || ""}
                        onChange={(e) => handleNoteChange(subtaskIndex, e.target.value)}
                        disabled={isClosed && editingIndex !== subtaskIndex}
                        sx={{
                          bgcolor: 'transparent',
                          '& .MuiInputBase-root': { borderRadius: 0, color: colors.textPrimary },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.border },
                          direction: "rtl",
                          textAlign: "right",
                        }}
                      />
                    </Box>

                    {subtask.title === "Task Reception" && (
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        placeholder="Short summary..."
                        label="DASHBOARD NOTE"
                        value={subtask.shortNote || ""}
                        onChange={(e) => handleShortNoteChange(subtaskIndex, e.target.value)}
                        disabled={isClosed && editingIndex !== subtaskIndex}
                        sx={{ mt: 2, bgcolor: 'transparent' }}
                      />
                    )}

                    <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
                      {editingIndex === subtaskIndex ? (
                        <>
                          <Button
                            fullWidth
                            variant="contained"
                            disabled={!isSubtaskClosable(subtaskIndex)}
                            onClick={() => handleStatusUpdate(subtaskIndex, "Closed")}
                            sx={{
                              py: 1,
                              borderRadius: 0,
                              bgcolor: colors.success,
                              '&:hover': {
                                bgcolor: colors.success,
                              },
                              fontWeight: "bold",
                              textTransform: 'none',
                              boxShadow: 'none',
                            }}
                          >
                            Mark Subtask Closed
                          </Button>
                          <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => setEditingIndex(null)}
                            sx={{
                              py: 1,
                              borderRadius: 0,
                              color: colors.textSecondary,
                              borderColor: colors.border,
                              fontWeight: "bold",
                              textTransform: 'none',
                              '&:hover': {
                                borderColor: colors.textPrimary,
                                bgcolor: 'rgba(255,255,255,0.05)'
                              }
                            }}
                          >
                            Cancel Edit
                          </Button>
                        </>
                      ) : (
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={() => setEditingIndex(subtaskIndex)}
                          sx={{
                            py: 1,
                            borderRadius: 0,
                            bgcolor: isClosed ? colors.textSecondary : colors.primary,
                            '&:hover': {
                              bgcolor: isClosed ? colors.textSecondary : colors.primaryDark,
                            },
                            color: '#fff',
                            fontWeight: "bold",
                            textTransform: 'none',
                            boxShadow: 'none',
                          }}
                        >
                          {isClosed ? "Modify Data" : "Begin Verification"}
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Collapse>
              </Paper>
            );
          })}
        </List>

        {/* Additional Info Section */}
        {(selectedOption === "visit" || selectedOption === "phone") && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2,
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 0,
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                color: colors.primary,
                mb: 2,
                fontWeight: "bold",
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}
            >
              Hardware & Equipment Specification
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: colors.textSecondary }}>ONT MODEL TYPE</InputLabel>
                  <Select
                    value={subtasks[0]?.ontType || ""}
                    onChange={(e) => {
                      const updatedSubtasks = [...subtasks];
                      updatedSubtasks[0] = { ...updatedSubtasks[0], ontType: e.target.value };
                      setSubtasks(updatedSubtasks);
                      setAdditionalInfo(prev => ({ ...prev, ontType: e.target.value }));
                    }}
                    label="ONT MODEL TYPE"
                    sx={{
                      color: colors.textPrimary,
                      bgcolor: colors.bg,
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.border },
                    }}
                  >
                    <MenuItem value="">Select Type</MenuItem>
                    <MenuItem value="Nokia G-140W-H">Nokia G-140W-H</MenuItem>
                    <MenuItem value="Nokia G-140W-c">Nokia G-140W-C</MenuItem>
                    <MenuItem value="Nokia G-240W-c">Nokia G-240W-C</MenuItem>
                    <MenuItem value="Nokia G-2426G-p">Nokia G-2426G-P</MenuItem>
                    <MenuItem value="Sagemcom">Sagemcom</MenuItem>
                    <MenuItem value="ZTE wifi6 (1G)">ZTE WiFi6 (1G)</MenuItem>
                    <MenuItem value="ZTE wifi6 (2G)">ZTE WiFi6 (2G)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="CONNECTION SPEED (MBPS)"
                  type="number"
                  value={subtasks[0]?.speed || ""}
                  onChange={(e) => {
                    const numericValue = e.target.value === "" ? null : Number(e.target.value);
                    const updatedSubtasks = [...subtasks];
                    updatedSubtasks[0] = { ...updatedSubtasks[0], speed: numericValue };
                    setSubtasks(updatedSubtasks);
                    setAdditionalInfo(prev => ({ ...prev, speed: numericValue }));
                  }}
                  sx={{ bgcolor: 'transparent', '& .MuiInputBase-root': { borderRadius: 0, color: colors.textPrimary }, '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.border } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: colors.textSecondary }}>RECIPIENT (INITIAL SETUP)</InputLabel>
                  <Select
                    value={subtasks[0]?.serviceRecipientInitial || ""}
                    onChange={(e) => {
                      const updatedSubtasks = [...subtasks];
                      updatedSubtasks[0] = { ...updatedSubtasks[0], serviceRecipientInitial: e.target.value };
                      setSubtasks(updatedSubtasks);
                      setAdditionalInfo(prev => ({ ...prev, serviceRecipientInitial: e.target.value }));
                    }}
                    label="RECIPIENT (INITIAL SETUP)"
                    sx={{ color: colors.textPrimary, bgcolor: colors.bg }}
                  >
                    <MenuItem value="">Select Recipient</MenuItem>
                    <MenuItem value="Authorized Representative">Authorized Representative</MenuItem>
                    <MenuItem value="Primary Subscriber">Primary Subscriber</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {selectedOption === "visit" && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: colors.textSecondary }}>RECIPIENT (QOS VISIT)</InputLabel>
                    <Select
                      value={subtasks[0]?.serviceRecipientQoS || ""}
                      onChange={(e) => {
                        const updatedSubtasks = [...subtasks];
                        updatedSubtasks[0] = { ...updatedSubtasks[0], serviceRecipientQoS: e.target.value };
                        setSubtasks(updatedSubtasks);
                        setAdditionalInfo(prev => ({ ...prev, serviceRecipientQoS: e.target.value }));
                      }}
                      label="RECIPIENT (QOS VISIT)"
                      sx={{ color: colors.textPrimary, bgcolor: colors.bg }}
                    >
                      <MenuItem value="">Select Recipient</MenuItem>
                      <MenuItem value="Authorized Representative">Authorized Representative</MenuItem>
                      <MenuItem value="Primary Subscriber">Primary Subscriber</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}
      </Box>
    </DialogContent>
  );
};

export default SubtaskManager;