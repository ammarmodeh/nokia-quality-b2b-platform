import {
  Box,
  Button,
  Collapse,
  DialogContent,
  Stack,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
  IconButton,
} from "@mui/material";
import { FaEye } from "react-icons/fa";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { useEffect } from "react";

const SubtaskManager = ({
  subtasks,
  note,
  setNote,
  activeStep,
  handleNext,
  handleBack,
  handleReset,
  expandedNotes = [],
  setExpandedNotes,
  toggleNoteExpand,
}) => {
  // Convert expandedNotes to array if it's an object (for backward compatibility)
  const normalizedExpandedNotes = Array.isArray(expandedNotes)
    ? expandedNotes
    : subtasks.map((_, index) => expandedNotes[index] || false);

  // Initialize expanded notes on first render
  useEffect(() => {
    if (normalizedExpandedNotes.length === 0 && subtasks.length > 0) {
      // Always expand the current active step first
      const newExpandedNotes = Array(subtasks.length).fill(false);
      newExpandedNotes[activeStep] = true;

      // Additionally, expand the last empty note if it's different from activeStep
      let lastEmptyIndex = -1;
      for (let i = subtasks.length - 1; i >= 0; i--) {
        if (!note[i] || note[i].trim() === "") {
          lastEmptyIndex = i;
          break;
        }
      }

      // If all notes are empty and activeStep is not the first one, expand first note
      if (lastEmptyIndex === -1 && activeStep !== 0) {
        lastEmptyIndex = 0;
      }

      if (lastEmptyIndex !== -1 && lastEmptyIndex !== activeStep) {
        newExpandedNotes[lastEmptyIndex] = true;
      }

      setExpandedNotes(newExpandedNotes);
    }
  }, []);

  // Expand current step's notes when activeStep changes
  useEffect(() => {
    if (normalizedExpandedNotes.length > 0) {
      const newExpandedNotes = [...normalizedExpandedNotes];
      newExpandedNotes[activeStep] = true;
      setExpandedNotes(newExpandedNotes);
    }
  }, [activeStep]);

  return (
    <DialogContent>
      <Box sx={{ maxWidth: 400 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {subtasks.map((subtask, index) => (
            <Step key={index}>
              <StepLabel
                optional={
                  index === subtasks.length - 1 ? (
                    <Typography variant="caption" sx={{ color: "#b3b3b3" }}>
                      Last step
                    </Typography>
                  ) : null
                }
                sx={{
                  color: "#ffffff",
                  "& .MuiStepIcon-root": { color: "darkblue" },
                  "& .MuiStepIcon-completed": { color: "#4caf50" },
                }}
              >
                <Stack direction={"row"} alignItems={"center"} gap={4} justifyContent={"space-between"}>
                  <Typography variant="caption" sx={{ color: "#ffffff" }}>
                    {subtask.title}
                  </Typography>
                  <Stack direction="row" alignItems="center">
                    <Tooltip title={<span style={{ direction: 'rtl', textAlign: 'right', display: 'block', fontSize: '15px' }}>{subtask.note}</span>}
                      placement="bottom-end"
                    >
                      <FaEye color="#3ea6ff" cursor="pointer" size={20} />
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={() => toggleNoteExpand(index)}
                      sx={{ color: "#3ea6ff" }}
                    >
                      {normalizedExpandedNotes[index] ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Stack>
                </Stack>
                {subtask.dateTime && (
                  <Typography variant="caption" sx={{ color: "#b3b3b3", display: "block" }}>
                    Completed on: {subtask.dateTime}
                  </Typography>
                )}
              </StepLabel>
              <StepContent>
                <Collapse in={normalizedExpandedNotes[index]}>
                  <Typography sx={{ mb: 1, color: "#ffffff" }}>{subtask.note}</Typography>
                  <TextField
                    margin="dense"
                    label="Note"
                    type="text"
                    fullWidth
                    multiline
                    rows={4}
                    value={note[index] || ""}
                    onChange={(e) => {
                      const newNote = [...note];
                      newNote[index] = e.target.value;
                      setNote(newNote);
                    }}
                    sx={{
                      color: "#ffffff",
                      "& .MuiInputBase-input": { color: "#ffffff" },
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: "#555" },
                        "&:hover fieldset": { borderColor: "#3ea6ff" },
                        "&.Mui-focused fieldset": { borderColor: "#3ea6ff" },
                      },
                    }}
                    InputLabelProps={{
                      sx: { color: "#b3b3b3" },
                    }}
                    InputProps={{
                      sx: { color: "#ffffff" },
                    }}
                  />
                </Collapse>
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    sx={{
                      mt: 1,
                      mr: 1,
                      backgroundColor: "darkblue",
                      color: "#ffffff",
                      "&:hover": { backgroundColor: "darkblue" },
                      "&:focus": { outline: "none" },
                      transition: "background-color 0.2s ease",
                    }}
                  >
                    {index === subtasks.length - 1 ? "Finish" : "Continue"}
                  </Button>
                  {index !== 0 && (
                    <Button
                      disabled={index === 0}
                      onClick={handleBack}
                      sx={{
                        mt: 1,
                        mr: 1,
                        color: "#ffffff",
                        "&:hover": { backgroundColor: "#333" },
                        "&:focus": { outline: "none" },
                        transition: "background-color 0.2s ease",
                      }}
                    >
                      Back
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
        {activeStep === subtasks.length && (
          <Box
            sx={{
              p: 3,
              backgroundColor: "#1e1e1e",
              color: "#ffffff",
              borderRadius: "8px",
              boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.3)",
            }}
          >
            <Typography>All steps completed - you&apos;re finished</Typography>
            <Button
              onClick={handleReset}
              sx={{
                mt: 1,
                mr: 1,
                color: "#ffffff",
                "&:hover": { backgroundColor: "#333" },
                "&:focus": { outline: "none" },
                transition: "background-color 0.2s ease",
              }}
            >
              Reset
            </Button>
          </Box>
        )}
      </Box>
    </DialogContent>
  );
};

export default SubtaskManager;