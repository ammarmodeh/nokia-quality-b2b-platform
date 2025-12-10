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
  handleNoteChange,
  setSubtasks,
  setAdditionalInfo,
}) => {
  const colors = {
    primary: "#3b82f6",
    textPrimary: "#ffffff",
    textSecondary: "#9ca3af",
    // surface: "#ffffff",
    surfaceElevated: "#2a2a2a",
    border: "#e5e7eb",
    primaryHover: "#1d4ed8",
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

  const handleSaveAndClose = async (subtaskIndex) => {
    if (!selectedTaskId) {
      console.error("Error: selectedTaskId is undefined");
      alert("Cannot close subtask: Task ID is missing. Please try again or contact support.");
      return;
    }

    const updatedSubtasks = subtasks.map((subtask, idx) => ({
      ...subtask,
      status: idx === subtaskIndex ? "Closed" : subtask.status,
      dateTime: idx === subtaskIndex ? new Date().toISOString() : subtask.dateTime,
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
      alert("Subtask closed successfully!");
    } catch (error) {
      console.error("Error saving and closing subtask:", error);
      alert("Failed to close subtask. Please try again.");
    }
  };

  const isSubtaskClosable = (subtaskIndex) => {
    return checkpoints[subtaskIndex]?.every((checkpoint) => checkpoint.checked);
  };

  const renderCheckpointOptions = (subtaskIndex, checkpointIndex, checkpoint) => {

    if (SIMPLE_QUESTIONS.includes(checkpoint.name)) {
      return (
        <>
          <Divider sx={{ my: 2, bgcolor: colors.border }} />
          <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 1 }}>
            {checkpoint.options.question}
          </Typography>
          <RadioGroup
            value={checkpoint.options.selected || ""}
            onChange={(e) => handleConditionalOptionChange(subtaskIndex, checkpointIndex, e.target.value)}
          >
            {checkpoint.options.choices.map((choice) => (
              <FormControlLabel
                key={choice.value}
                value={choice.value}
                control={<Radio sx={{ color: colors.primary }} />}
                label={<Typography variant="body2">{choice.label}</Typography>}
              />
            ))}
          </RadioGroup>
        </>
      );
    }

    if (checkpoint.options?.type === "conditional") {
      const showActionTaken = checkpoint.options.actionTaken &&
        (checkpoint.options.selected === "incorrect" ||
          checkpoint.options.selected === "partial" ||
          checkpoint.options.selected === "not_using" ||
          checkpoint.options.selected === "not_discussed" ||
          checkpoint.options.selected === "low" ||
          checkpoint.options.selected === "weak" ||
          checkpoint.options.selected === "low_power" ||
          checkpoint.options.selected === "none" ||
          checkpoint.options.selected === "minimal" ||
          checkpoint.options.selected === "no" ||
          checkpoint.options.selected === "not_delivered" ||
          checkpoint.options.selected === "incomplete_unclear" ||
          checkpoint.options.selected === "unacceptable_conduct" ||
          checkpoint.options.selected === "rushed_service" ||
          checkpoint.options.selected === "yes");

      return (
        <>
          <Divider sx={{ my: 2, bgcolor: colors.border }} />
          <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 1 }}>
            {checkpoint.options.question}
          </Typography>
          <RadioGroup
            value={checkpoint.options.selected || ""}
            onChange={(e) =>
              handleConditionalOptionChange(subtaskIndex, checkpointIndex, e.target.value)
            }
          >
            {checkpoint.options.choices.map((choice) => (
              <FormControlLabel
                key={choice.value}
                value={choice.value}
                control={
                  <Radio
                    sx={{
                      color: colors.primary,
                      "&.Mui-checked": {
                        color: colors.primary,
                      },
                    }}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: colors.textPrimary }}>
                    {choice.label}
                  </Typography>
                }
                sx={{ ml: 0 }}
              />
            ))}
          </RadioGroup>

          {/* Conditionally render Action Taken section */}
          {showActionTaken && (
            <>
              <Divider sx={{ my: 2, bgcolor: colors.border }} />
              <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 1 }}>
                {checkpoint.options.actionTaken.question}
              </Typography>
              <FormControl fullWidth>
                <InputLabel sx={{ color: colors.textSecondary }}>
                  Select Action Taken
                </InputLabel>
                <Select
                  value={checkpoint.options.actionTaken.selected || ""}
                  onChange={(e) =>
                    handleConditionalOptionChange(
                      subtaskIndex,
                      checkpointIndex,
                      e.target.value,
                      'actionTaken.selected'
                    )
                  }
                  label="Select Action Taken"
                  sx={{
                    color: colors.textPrimary,
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: colors.border,
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: colors.primary,
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: colors.primary,
                    },
                    backgroundColor: colors.surface,
                  }}
                >
                  {checkpoint.options.actionTaken.choices.map((choice) => (
                    <MenuItem key={choice.value} value={choice.value}>
                      {choice.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Justification section (only shown when no_action is selected) */}
              {checkpoint.options.actionTaken.justification &&
                checkpoint.options.actionTaken.selected === 'no_action' && (
                  <>
                    <Divider sx={{ my: 2, bgcolor: colors.border }} />
                    <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 1 }}>
                      {checkpoint.options.actionTaken.justification.question}
                    </Typography>
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: colors.textSecondary }}>
                        Select Justification
                      </InputLabel>
                      <Select
                        value={checkpoint.options.actionTaken.justification.selected || ""}
                        onChange={(e) =>
                          handleConditionalOptionChange(
                            subtaskIndex,
                            checkpointIndex,
                            e.target.value,
                            'actionTaken.justification.selected'
                          )
                        }
                        label="Select Justification"
                        sx={{
                          color: colors.textPrimary,
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: colors.border,
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: colors.primary,
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: colors.primary,
                          },
                          backgroundColor: colors.surface,
                        }}
                      >
                        {checkpoint.options.actionTaken.justification.choices.map((choice) => (
                          <MenuItem key={choice.value} value={choice.value}>
                            {choice.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Justification notes */}
                    {checkpoint.options.actionTaken.justification.notes && (
                      <TextField
                        fullWidth
                        variant="outlined"
                        label={checkpoint.options.actionTaken.justification.notes.question}
                        multiline
                        rows={2}
                        value={checkpoint.options.actionTaken.justification.notes.value || ""}
                        onChange={(e) =>
                          handleJustificationNotesChange(
                            subtaskIndex,
                            checkpointIndex,
                            e.target.value,
                            'actionTaken.justification.notes.value'
                          )
                        }
                        sx={{ mt: 2 }}
                      />
                    )}
                  </>
                )}

              {/* General justification section (shown for all speed test results) */}
              {checkpoint.options.generalJustification && (
                <>
                  <Divider sx={{ my: 2, bgcolor: colors.border }} />
                  <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 1 }}>
                    {checkpoint.options.generalJustification.question}
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: colors.textSecondary }}>
                      Technical Assessment
                    </InputLabel>
                    <Select
                      value={checkpoint.options.generalJustification.selected || ""}
                      onChange={(e) =>
                        handleConditionalOptionChange(
                          subtaskIndex,
                          checkpointIndex,
                          e.target.value,
                          'generalJustification.selected'
                        )
                      }
                      label="Technical Assessment"
                      sx={{
                        color: colors.textPrimary,
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: colors.border,
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: colors.primary,
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: colors.primary,
                        },
                        backgroundColor: colors.surface,
                      }}
                    >
                      {checkpoint.options.generalJustification.choices.map((choice) => (
                        <MenuItem key={choice.value} value={choice.value}>
                          {choice.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Technical notes */}
                  {checkpoint.options.generalJustification.notes && (
                    <TextField
                      fullWidth
                      variant="outlined"
                      label={checkpoint.options.generalJustification.notes.question}
                      multiline
                      rows={2}
                      value={checkpoint.options.generalJustification.notes.value || ""}
                      onChange={(e) =>
                        handleJustificationNotesChange(
                          subtaskIndex,
                          checkpointIndex,
                          e.target.value,
                          'generalJustification.notes.value'
                        )
                      }
                      sx={{ mt: 2 }}
                    />
                  )}
                </>
              )}
            </>
          )}

          {/* Follow-up question for Wi-Fi Repeater Setup */}
          {checkpoint.name === "Wi-Fi Repeater Setup" &&
            checkpoint.options?.selected === "yes_working" &&
            checkpoint.options?.followUpQuestion?.question && (
              <>
                <Divider sx={{ my: 2, bgcolor: colors.border }} />
                <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 1 }}>
                  {checkpoint.options.followUpQuestion.question}
                </Typography>
                <RadioGroup
                  value={checkpoint.options.followUpQuestion.selected || ""}
                  onChange={(e) =>
                    handleRepeaterLocationChange(subtaskIndex, checkpointIndex, e.target.value)
                  }
                >
                  {checkpoint.options.followUpQuestion.choices.map((choice) => (
                    <FormControlLabel
                      key={choice.value}
                      value={choice.value}
                      control={
                        <Radio
                          sx={{
                            color: colors.primary,
                            "&.Mui-checked": {
                              color: colors.primary,
                            },
                          }}
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ color: colors.textPrimary }}>
                          {choice.label}
                        </Typography>
                      }
                      sx={{ ml: 0 }}
                    />
                  ))}
                </RadioGroup>

                {/* Action Taken for Wi-Fi Repeater Setup follow-up question */}
                {checkpoint.options.followUpQuestion.selected === "incorrect" &&
                  checkpoint.options.followUpQuestion.actionTaken && (
                    <>
                      <Divider sx={{ my: 2, bgcolor: colors.border }} />
                      <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 1 }}>
                        {checkpoint.options.followUpQuestion.actionTaken.question}
                      </Typography>
                      <FormControl fullWidth>
                        <InputLabel sx={{ color: colors.textSecondary }}>
                          Select Action Taken
                        </InputLabel>
                        <Select
                          value={checkpoint.options.followUpQuestion.actionTaken.selected || ""}
                          onChange={(e) =>
                            handleActionTakenChange(subtaskIndex, checkpointIndex, e.target.value, true)
                          }
                          label="Select Action Taken"
                          sx={{
                            color: colors.textPrimary,
                            "& .MuiOutlinedInput-notchedOutline": {
                              borderColor: colors.border,
                            },
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                              borderColor: colors.primary,
                            },
                            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                              borderColor: colors.primary,
                            },
                            backgroundColor: colors.surface,
                          }}
                        >
                          <MenuItem value="">Select an action</MenuItem>
                          {checkpoint.options.followUpQuestion.actionTaken.choices.map((choice) => (
                            <MenuItem key={choice.value} value={choice.value}>
                              {choice.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Justification for No Corrective Action */}
                      {checkpoint.options.followUpQuestion.actionTaken.selected === "no_action" && (
                        <>
                          <Divider sx={{ my: 2, bgcolor: colors.border }} />
                          <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 1 }}>
                            Reason for not relocating the repeater:
                          </Typography>
                          <FormControl fullWidth>
                            <InputLabel sx={{ color: colors.textSecondary }}>
                              Select Justification
                            </InputLabel>
                            <Select
                              value={checkpoint.options.followUpQuestion.actionTaken.justification?.selected || ""}
                              onChange={(e) =>
                                handleConditionalOptionChange(
                                  subtaskIndex,
                                  checkpointIndex,
                                  e.target.value,
                                  'followUpQuestion.actionTaken.justification.selected'
                                )
                              }
                              label="Select Justification"
                              sx={{
                                color: colors.textPrimary,
                                "& .MuiOutlinedInput-notchedOutline": {
                                  borderColor: colors.border,
                                },
                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                  borderColor: colors.primary,
                                },
                                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                  borderColor: colors.primary,
                                },
                                backgroundColor: colors.surface,
                              }}
                            >
                              <MenuItem value="">Select justification</MenuItem>
                              <MenuItem value="customer_preference">Customer prefers current location</MenuItem>
                              <MenuItem value="structural_limitation">Structural limitations prevent relocation</MenuItem>
                              <MenuItem value="temporary_solution">Temporary solution until better location is available</MenuItem>
                              <MenuItem value="minimal_impact">Minimal impact on performance expected</MenuItem>
                            </Select>
                          </FormControl>

                          {/* Additional notes field */}
                          {checkpoint.options.followUpQuestion.actionTaken.justification?.selected && (
                            <TextField
                              fullWidth
                              variant="outlined"
                              label="Additional notes about repeater placement"
                              multiline
                              rows={2}
                              value={checkpoint.options.followUpQuestion.actionTaken.justification.notes?.value || ""}
                              onChange={(e) =>
                                handleJustificationNotesChange(
                                  subtaskIndex,
                                  checkpointIndex,
                                  e.target.value,
                                  'followUpQuestion.actionTaken.justification.notes.value'
                                )
                              }
                              sx={{ mt: 2 }}
                            />
                          )}
                        </>
                      )}
                    </>
                  )}
              </>
            )}
        </>
      );
    } else if (checkpoint.options?.type === "text") {
      return (
        <>
          <Divider sx={{ my: 2, bgcolor: colors.border }} />
          <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 1 }}>
            {checkpoint.options.question}
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            multiline
            rows={2}
            value={checkpoint.options.value || ""}
            onChange={(e) =>
              handleConditionalOptionChange(subtaskIndex, checkpointIndex, e.target.value)
            }
            InputLabelProps={{
              style: { color: colors.textSecondary },
            }}
            InputProps={{
              style: { color: colors.textPrimary },
            }}
            sx={{
              mt: 1,
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: colors.border },
                "&:hover fieldset": { borderColor: colors.primary },
                "&.Mui-focused fieldset": { borderColor: colors.primary },
                backgroundColor: colors.surface,
              },
              direction: "rtl",
              textAlign: "right",
            }}
          />
        </>
      );
    } else if (checkpoint.name === "Rx Optics Signal Quality") {
      return (
        <>
          <Divider sx={{ my: 2, bgcolor: colors.border }} />
          <TextField
            fullWidth
            variant="outlined"
            label="Enter the Rx optics signal, in dBm"
            multiline
            rows={1}
            value={checkpoint.signalTestNotes || ""}
            onChange={(e) =>
              handleSignalTestNotesChange(subtaskIndex, checkpointIndex, e.target.value)
            }
            InputLabelProps={{
              style: { color: colors.textSecondary },
            }}
            InputProps={{
              style: { color: colors.textPrimary },
            }}
            sx={{
              mt: 2,
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: colors.border },
                "&:hover fieldset": { borderColor: colors.primary },
                "&.Mui-focused fieldset": { borderColor: colors.primary },
                backgroundColor: colors.surface,
              },
            }}
          />
        </>
      );
    }
    return null;
  };

  return (
    <DialogContent sx={{ padding: 0, height: "calc(100vh - 128px)", overflowY: "auto" }}>
      <Box sx={{ maxWidth: "100%", padding: 2 }}>
        <List sx={{ width: "100%" }}>
          {subtasks.map((subtask, subtaskIndex) => (
            <Paper
              key={subtaskIndex}
              elevation={2}
              sx={{
                mb: 3,
                backgroundColor: colors.surfaceElevated,
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <ListItemButton
                onClick={() => toggleNoteExpand(subtaskIndex)}
                sx={{
                  backgroundColor: expandedNotes[subtaskIndex] ? "rgba(63, 81, 181, 0.1)" : "inherit",
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" sx={{ color: colors.textPrimary }}>
                      {subtask.title} - {subtask.status}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                      {subtask.dateTime ? `Completed on: ${new Date(subtask.dateTime).toLocaleString()}` : "Not completed yet"}
                    </Typography>
                  }
                />
                {expandedNotes[subtaskIndex] ? <ExpandLess sx={{ color: colors.textPrimary }} /> : <ExpandMore sx={{ color: colors.textPrimary }} />}
              </ListItemButton>

              <Collapse in={expandedNotes[subtaskIndex]}>
                <Box sx={{ px: 2, pb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: colors.textPrimary, mb: 1, mt: 1 }}>
                    Checkpoints:
                  </Typography>

                  <List sx={{ width: "100%" }}>
                    {checkpoints[subtaskIndex]?.map((checkpoint, checkpointIndex) => (
                      <Paper
                        key={checkpointIndex}
                        elevation={0}
                        sx={{
                          mb: 2,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "8px",
                          overflow: "hidden",
                        }}
                      >
                        <ListItemButton
                          onClick={() => handleCheckpointToggle(subtaskIndex, checkpointIndex)}
                          sx={{
                            borderLeft: `4px solid ${checkpoint.checked ? "#4caf50" : "#f44336"}`,
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <Checkbox
                              edge="start"
                              checked={checkpoint.checked}
                              tabIndex={-1}
                              disableRipple
                              sx={{
                                color: colors.primary,
                                "&.Mui-checked": { color: colors.primary },
                              }}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body1" sx={{ color: colors.textPrimary }}>
                                {checkpoint.name}
                              </Typography>
                            }
                          />
                        </ListItemButton>

                        <Box sx={{ px: 3, pb: 2 }}>
                          {renderCheckpointOptions(subtaskIndex, checkpointIndex, checkpoint)}
                        </Box>
                      </Paper>
                    ))}
                  </List>

                  {selectedOption !== "others" && (
                    <TextField
                      fullWidth
                      variant="outlined"
                      label="Additional Notes"
                      multiline
                      rows={4}
                      value={notes[subtaskIndex] || ""}
                      onChange={(e) => handleNoteChange(subtaskIndex, e.target.value)}
                      InputLabelProps={{
                        style: { color: colors.textSecondary },
                      }}
                      InputProps={{
                        style: { color: colors.textPrimary },
                      }}
                      sx={{
                        mt: 2,
                        direction: "rtl",
                        textAlign: "right",
                        // "& .MuiOutlinedInput-root": {
                        //   "& fieldset": { borderColor: colors.border },
                        //   "&:hover fieldset": { borderColor: colors.primary },
                        //   "&.Mui-focused fieldset": { borderColor: colors.primary },
                        //   backgroundColor: colors.surface,
                        // },
                      }}
                    />
                  )}

                  {isSubtaskClosable(subtaskIndex) && subtask.status !== "Closed" && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleSaveAndClose(subtaskIndex)}
                      sx={{
                        mt: 2,
                        backgroundColor: colors.primary,
                        "&:hover": {
                          backgroundColor: colors.primaryHover,
                        },
                      }}
                    >
                      Save and Close Subtask
                    </Button>
                  )}
                </Box>
              </Collapse>
            </Paper>
          ))}
        </List>

        {/* Additional Info Section */}
        {(selectedOption === "visit" || selectedOption === "phone") && (
          <Paper
            sx={{
              p: 3,
              mb: 4,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: colors.primary,
                mb: 2,
                borderBottom: `1px solid ${colors.border}`,
                pb: 1,
              }}
            >
              Additional Info
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: colors.textSecondary }}>ONT Type</InputLabel>
                  <Select
                    value={subtasks[0]?.ontType || ""}
                    onChange={(e) => {
                      const updatedSubtasks = [...subtasks];
                      updatedSubtasks[0] = { ...updatedSubtasks[0], ontType: e.target.value };
                      setSubtasks(updatedSubtasks);
                      setAdditionalInfo(prev => ({ ...prev, ontType: e.target.value }));
                    }}
                    label="ONT Type"
                    sx={{
                      color: colors.textPrimary,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: colors.border,
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: colors.primary,
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: colors.primary,
                      },
                      backgroundColor: colors.surface,
                      direction: "rtl",
                      textAlign: "right",
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          backgroundColor: colors.surfaceElevated,
                          color: colors.textPrimary,
                          "& .MuiMenuItem-root": {
                            "&:hover": {
                              backgroundColor: colors.primaryHover,
                            },
                            "&.Mui-selected": {
                              backgroundColor: `${colors.primary}22`,
                            },
                            "&.Mui-selected:hover": {
                              backgroundColor: `${colors.primary}33`,
                            },
                          },
                        },
                      },
                    }}
                  >
                    <MenuItem value="">Select ONT Type</MenuItem>
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
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Speed (Mbps)"
                  type="number"
                  value={subtasks[0]?.speed || ""}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    // Use Number() instead of parseInt for better decimal handling
                    const numericValue = inputValue === "" ? null : Number(inputValue);

                    const updatedSubtasks = [...subtasks];
                    updatedSubtasks[0] = {
                      ...updatedSubtasks[0],
                      speed: numericValue
                    };

                    setSubtasks(updatedSubtasks);
                    setAdditionalInfo(prev => ({
                      ...prev,
                      speed: numericValue
                    }));
                  }}
                  InputLabelProps={{
                    style: { color: colors.textSecondary },
                  }}
                  InputProps={{
                    style: { color: colors.textPrimary },
                  }}
                  sx={{
                    mt: 2,
                    direction: "rtl",
                    textAlign: "right",
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: colors.border },
                      "&:hover fieldset": { borderColor: colors.primary },
                      "&.Mui-focused fieldset": { borderColor: colors.primary },
                      backgroundColor: colors.surface,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: colors.textSecondary }}>Service Recipient (Initial Setup)</InputLabel>
                  <Select
                    value={subtasks[0]?.serviceRecipientInitial || ""}
                    onChange={(e) => {
                      const updatedSubtasks = [...subtasks];
                      updatedSubtasks[0] = {
                        ...updatedSubtasks[0],
                        serviceRecipientInitial: e.target.value,
                      };
                      setSubtasks(updatedSubtasks);
                      setAdditionalInfo(prev => ({
                        ...prev,
                        serviceRecipientInitial: e.target.value,
                      }));
                    }}
                    label="Service Recipient (Initial Setup)"
                    sx={{
                      color: colors.textPrimary,
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: colors.border,
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: colors.primary,
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: colors.primary,
                      },
                      backgroundColor: colors.surface,
                      direction: "rtl",
                      textAlign: "right",
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          backgroundColor: colors.surfaceElevated,
                          color: colors.textPrimary,
                          "& .MuiMenuItem-root": {
                            "&:hover": {
                              backgroundColor: colors.primaryHover,
                            },
                            "&.Mui-selected": {
                              backgroundColor: `${colors.primary}22`,
                            },
                            "&.Mui-selected:hover": {
                              backgroundColor: `${colors.primary}33`,
                            },
                          },
                        },
                      },
                    }}
                  >
                    <MenuItem value="">Select Service Recipient</MenuItem>
                    <MenuItem value="Authorized Representative">Authorized Representative</MenuItem>
                    <MenuItem value="Primary Subscriber">Primary Subscriber</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {(selectedOption === "visit") && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: colors.textSecondary }}>Service Recipient (QoS Team Visit)</InputLabel>
                    <Select
                      value={subtasks[0]?.serviceRecipientQoS || ""}
                      onChange={(e) => {
                        const updatedSubtasks = [...subtasks];
                        updatedSubtasks[0] = {
                          ...updatedSubtasks[0],
                          serviceRecipientQoS: e.target.value,
                        };
                        setSubtasks(updatedSubtasks);
                        setAdditionalInfo(prev => ({
                          ...prev,
                          serviceRecipientQoS: e.target.value,
                        }));
                      }}
                      label="Service Recipient (QoS Team Visit)"
                      sx={{
                        color: colors.textPrimary,
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: colors.border,
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: colors.primary,
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: colors.primary,
                        },
                        backgroundColor: colors.surface,
                        direction: "rtl",
                        textAlign: "right",
                      }}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            backgroundColor: colors.surfaceElevated,
                            color: colors.textPrimary,
                            "& .MuiMenuItem-root": {
                              "&:hover": {
                                backgroundColor: colors.primaryHover,
                              },
                              "&.Mui-selected": {
                                backgroundColor: `${colors.primary}22`,
                              },
                              "&.Mui-selected:hover": {
                                backgroundColor: `${colors.primary}33`,
                              },
                            },
                          },
                        },
                      }}
                    >
                      <MenuItem value="">Select Service Recipient</MenuItem>
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