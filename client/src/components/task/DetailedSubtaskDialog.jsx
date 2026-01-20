import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Stack,
} from "@mui/material";
import { MdClose, MdCheckCircle, MdCancel } from "react-icons/md";
import SubtaskManager from "../SubtaskManager";
import api from "../../api/api";
import { predefinedSubtasks } from "../../constants/subtaskData";

const DetailedSubtaskDialog = ({ open, onClose, task, setUpdateTasksList }) => {
  const colors = {
    primary: "#1976d2",
    primaryDark: "#1565c0",
    secondary: "#7b68ee",
    success: "#4caf50", // Matching dashboard chip success
    warning: "#ff9800",
    error: "#f44336",
    bg: "#1e1e1e", // Dark background
    card: "#2d2d2d", // Matching dashboard sections
    border: "#3d3d3d", // Matching dashboard borders
    textPrimary: "#ffffff",
    textSecondary: "#b3b3b3",
  };

  // Helper for deep copying to prevent mutation of the imported constant
  const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

  const [selectedOption, setSelectedOption] = useState("visit");
  const [subtasks, setSubtasks] = useState(deepCopy(predefinedSubtasks.visit));
  const [checkpoints, setCheckpoints] = useState(deepCopy(predefinedSubtasks.visit).map((subtask) => (subtask.checkpoints ? [...subtask.checkpoints] : [])));
  const [notes, setNotes] = useState({
    visit: deepCopy(predefinedSubtasks.visit).map(() => ""),
    phone: deepCopy(predefinedSubtasks.phone).map(() => ""),
    original: deepCopy(predefinedSubtasks.original).map(() => ""),
    others: deepCopy(predefinedSubtasks.others).map(() => "")
  });
  const [subtasksByOption, setSubtasksByOption] = useState({
    visit: deepCopy(predefinedSubtasks.visit),
    phone: deepCopy(predefinedSubtasks.phone),
    original: deepCopy(predefinedSubtasks.original),
    others: deepCopy(predefinedSubtasks.others)
  });
  const [checkpointsByOption, setCheckpointsByOption] = useState({
    visit: deepCopy(predefinedSubtasks.visit).map((subtask) => (subtask.checkpoints ? [...subtask.checkpoints] : [])),
    phone: deepCopy(predefinedSubtasks.phone).map((subtask) => (subtask.checkpoints ? [...subtask.checkpoints] : [])),
    original: deepCopy(predefinedSubtasks.original).map((subtask) => [...subtask.checkpoints || []]),
    others: deepCopy(predefinedSubtasks.others).map((subtask) => (subtask.checkpoints ? [...subtask.checkpoints] : []))
  });
  const [additionalInfoByOption, setAdditionalInfoByOption] = useState({
    visit: { ontType: null, speed: null, serviceRecipientInitial: null, serviceRecipientQoS: null },
    phone: { ontType: null, speed: null, serviceRecipientInitial: null, serviceRecipientQoS: null },
    original: { ontType: null, speed: null, serviceRecipientInitial: null, serviceRecipientQoS: null },
    others: { ontType: null, speed: null, serviceRecipientInitial: null, serviceRecipientQoS: null }
  });
  const [additionalInfo, setAdditionalInfo] = useState(additionalInfoByOption.visit);
  const [activeStep, setActiveStep] = useState(0);
  const [expandedNotes, setExpandedNotes] = useState([]);
  const [cancelState, setCancelState] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(task?.status || "Open");

  useEffect(() => {
    if (open && task?._id) {
      setCurrentStatus(task.status); // Reset to prop value on open
      // Reset local state for fresh start
      setSubtasks(deepCopy(predefinedSubtasks[selectedOption || 'visit']));
      setNotes({
        visit: deepCopy(predefinedSubtasks.visit).map(() => ""),
        phone: deepCopy(predefinedSubtasks.phone).map(() => ""),
        original: deepCopy(predefinedSubtasks.original).map(() => ""),
        others: deepCopy(predefinedSubtasks.others).map(() => "")
      });
      // Further resets happen in fetchSubtasks, but we ensure cleanliness here
      fetchSubtasks();
    }
  }, [open, task?._id, cancelState]);

  const fetchSubtasks = async () => {
    if (!task?._id) return;
    try {
      const response = await api.get(`/tasks/get-task/${task._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (response.data.status) {
        setCurrentStatus(response.data.status);
      }

      let matchingOption = response.data.subtaskType || "visit";
      let fetchedSubtasks = response.data.subTasks || [];
      // ... (rest of the logic remains similar but ensures we use currentStatus in UI)

      if (!response.data.subtaskType && fetchedSubtasks.length > 0) {
        matchingOption =
          Object.keys(predefinedSubtasks).find((option) => {
            const predefinedTitles = predefinedSubtasks[option].map((s) => s.title);
            const fetchedTitles = fetchedSubtasks.map((s) => s.title);
            return JSON.stringify(predefinedTitles) === JSON.stringify(fetchedTitles);
          }) || "original";
      }

      if (fetchedSubtasks.length === 0) {
        fetchedSubtasks = deepCopy(predefinedSubtasks[matchingOption]);
      }

      fetchedSubtasks = fetchedSubtasks.map((subtask, index) =>
        index === 0
          ? {
            ...subtask,
            ontType: response.data.ontType || null,
            speed: response.data.speed || null,
            serviceRecipientInitial: response.data.serviceRecipientInitial || null,
            serviceRecipientQoS: response.data.serviceRecipientQoS || null,
          }
          : subtask
      );

      setSubtasksByOption((prev) => ({
        ...prev,
        [matchingOption]: fetchedSubtasks,
      }));
      setCheckpointsByOption((prev) => ({
        ...prev,
        [matchingOption]: fetchedSubtasks.map((subtask) =>
          subtask.checkpoints ? subtask.checkpoints.map((cp) => ({
            ...cp,
            options: cp.options ? {
              ...cp.options,
              followUpQuestion: cp.options.followUpQuestion ? {
                ...cp.options.followUpQuestion,
                actionTaken: cp.options.followUpQuestion.actionTaken ? {
                  ...cp.options.followUpQuestion.actionTaken,
                  selected: cp.options.followUpQuestion.actionTaken.selected || null,
                } : null,
              } : null,
              actionTaken: cp.options.actionTaken ? {
                ...cp.options.actionTaken,
                selected: cp.options.actionTaken.selected || null,
              } : null,
            } : null,
          })) : []
        ),
      }));
      setNotes((prevNotes) => ({
        ...prevNotes,
        [matchingOption]: fetchedSubtasks.map((subtask) => subtask.note || ""),
      }));
      setAdditionalInfoByOption((prev) => ({
        ...prev,
        [matchingOption]: {
          ontType: response.data.ontType || null,
          speed: response.data.speed || null,
          serviceRecipientInitial: response.data.serviceRecipientInitial || null,
          serviceRecipientQoS: response.data.serviceRecipientQoS || null,
        },
      }));

      setSelectedOption(matchingOption);
      setSubtasks(fetchedSubtasks);
      setCheckpoints(
        fetchedSubtasks.map((subtask) => (subtask.checkpoints ? subtask.checkpoints.map((cp) => ({
          ...cp,
          options: cp.options ? {
            ...cp.options,
            followUpQuestion: cp.options.followUpQuestion ? {
              ...cp.options.followUpQuestion,
              actionTaken: cp.options.followUpQuestion.actionTaken ? {
                ...cp.options.followUpQuestion.actionTaken,
                selected: cp.options.followUpQuestion.actionTaken.selected || null,
              } : null,
            } : null,
            actionTaken: cp.options.actionTaken ? {
              ...cp.options.actionTaken,
              selected: cp.options.actionTaken.selected || null,
            } : null,
          } : null,
        })) : []))
      );
      setAdditionalInfo({
        ontType: response.data.ontType || null,
        speed: response.data.speed || null,
        serviceRecipientInitial: response.data.serviceRecipientInitial || null,
        serviceRecipientQoS: response.data.serviceRecipientQoS || null,
      });

      const activeSteps = fetchedSubtasks.filter((subtask) => subtask.note !== "").length || 0;
      setActiveStep(activeSteps);
    } catch (error) {
      console.error("Error fetching subtasks:", error);
    }
  };

  const handleOptionChange = (event) => {
    const option = event.target.value;
    if (predefinedSubtasks[option]) {
      setSelectedOption(option);
      const newSubtasks = subtasksByOption[option].map((subtask, index) =>
        index === 0
          ? {
            ...subtask,
            ontType: additionalInfoByOption[option].ontType,
            speed: additionalInfoByOption[option].speed,
            serviceRecipientInitial: additionalInfoByOption[option].serviceRecipientInitial,
            serviceRecipientQoS: additionalInfoByOption[option].serviceRecipientQoS,
          }
          : subtask
      );
      setSubtasks(newSubtasks);
      setCheckpoints(checkpointsByOption[option]);
      setAdditionalInfo(additionalInfoByOption[option]);
    }
  };

  const handleCheckpointToggle = (subtaskIndex, checkpointIndex) => {
    const updatedCheckpoints = [...checkpoints];
    const checkpoint = updatedCheckpoints[subtaskIndex][checkpointIndex];
    checkpoint.checked = !checkpoint.checked;
    if (checkpoint.score === null) {
      checkpoint.score = checkpoint.checked ? null : 0;
    }
    setCheckpoints(updatedCheckpoints);
    setCheckpointsByOption((prev) => ({
      ...prev,
      [selectedOption]: updatedCheckpoints,
    }));
  };

  const handleNoteChange = (subtaskIndex, value) => {
    const newNotes = [...notes[selectedOption]];
    newNotes[subtaskIndex] = value;
    setNotes((prevNotes) => ({
      ...prevNotes,
      [selectedOption]: newNotes,
    }));
    setSubtasksByOption((prev) => ({
      ...prev,
      [selectedOption]: prev[selectedOption].map((subtask, index) =>
        index === subtaskIndex ? { ...subtask, note: value } : subtask
      ),
    }));
    setSubtasks((prev) =>
      prev.map((subtask, index) => (index === subtaskIndex ? { ...subtask, note: value } : subtask))
    );
  };

  const handleShortNoteChange = (subtaskIndex, value) => {
    setSubtasksByOption((prev) => ({
      ...prev,
      [selectedOption]: prev[selectedOption].map((subtask, index) =>
        index === subtaskIndex ? { ...subtask, shortNote: value } : subtask
      ),
    }));
    setSubtasks((prev) =>
      prev.map((subtask, index) => (index === subtaskIndex ? { ...subtask, shortNote: value } : subtask))
    );
  };

  const toggleNoteExpand = (index) => {
    setExpandedNotes((prev) => {
      const newExpanded = Array.isArray(prev) ? [...prev] : Array(subtasks.length).fill(false);
      newExpanded[index] = !newExpanded[index];
      return newExpanded;
    });
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleReset = async () => {
    const confirmation = window.confirm(`Are you sure you want to reset the ${selectedOption} subtasks and notes?`);
    if (!confirmation) return;

    try {
      // Force reset to 'original' as requested
      const targetOption = "original";
      const resetSubtasks = deepCopy(predefinedSubtasks[targetOption]).map((subtask) => ({
        ...subtask,
        note: "",
        shortNote: "",
        dateTime: null,
        checkpoints: subtask.checkpoints
          ? subtask.checkpoints.map((checkpoint) => ({
            ...checkpoint,
            checked: false,
            score: 0,
            options: checkpoint.options ? {
              ...checkpoint.options,
              selected: null,
              followUpQuestion: checkpoint.options.followUpQuestion ? {
                ...checkpoint.options.followUpQuestion,
                selected: null
              } : null
            } : null
          }))
          : [],
      }));

      const response = await api.put(
        `/tasks/update-subtask/${task._id}`,
        {
          subtasks: resetSubtasks,
          notify: false,
          subtaskType: targetOption,
          ontType: null,
          speed: null,
          serviceRecipientInitial: null,
          serviceRecipientQoS: null,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.status === 200) {
        setCancelState((prev) => !prev);
        if (setUpdateTasksList) {
          setUpdateTasksList((prev) => !prev);
        } else {
          window.dispatchEvent(new CustomEvent('dashboard-refresh'));
        }
        alert(`Subtasks reset to Original successfully!`);
        onClose();
      }
    } catch (error) {
      console.error("Error resetting subtasks:", error);
      alert("Failed to reset subtasks. Please try again.");
    }
  };

  const handleSaveNote = async (updatedSubtasks) => {
    try {
      const subtasksToSave = updatedSubtasks || subtasks.map((subtask, index) => ({
        ...subtask,
        note: notes[selectedOption][index] || "",
        progress: (notes[selectedOption][index] || "").trim() ? (100 / subtasks.length) : 0,
        shortNote: subtask.shortNote || "",
        dateTime: subtask.status === "Closed" ? (subtask.dateTime || new Date().toISOString()) : null,
        checkpoints: checkpoints[index] ? checkpoints[index].map(cp => ({
          ...cp,
          options: cp.options ? {
            ...cp.options,
            followUpQuestion: cp.options.followUpQuestion ? {
              ...cp.options.followUpQuestion,
              selected: cp.options.followUpQuestion.selected || null
            } : null
          } : null
        })) : [],
        ...(index === 0
          ? {
            ontType: additionalInfo.ontType,
            speed: additionalInfo.speed,
            serviceRecipientInitial: additionalInfo.serviceRecipientInitial,
            serviceRecipientQoS: additionalInfo.serviceRecipientQoS,
          }
          : {}),
      }));

      const response = await api.put(
        `/tasks/update-subtask/${task._id}`,
        {
          subtasks: subtasksToSave,
          notify: false,
          subtaskType: selectedOption,
          ontType: additionalInfo.ontType,
          speed: additionalInfo.speed,
          serviceRecipientInitial: additionalInfo.serviceRecipientInitial,
          serviceRecipientQoS: additionalInfo.serviceRecipientQoS,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.status === 200) {
        alert("Subtasks saved successfully!");
        if (setUpdateTasksList) {
          setUpdateTasksList((prev) => !prev);
        } else {
          window.dispatchEvent(new CustomEvent('dashboard-refresh'));
        }
        onClose();
      }
    } catch (error) {
      console.error("Error updating subtasks:", error);
      alert("Failed to save subtasks. Please try again.");
    }
  }


  const handleToggleComplete = async (isCompleting) => {
    try {
      const newStatus = isCompleting ? "Closed" : "In Progress";

      // Update Task Status
      await api.put(`/tasks/update-task/${task._id}`, { ...task, status: newStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      // Update Local State immediately
      setCurrentStatus(newStatus);

      // Update Subtasks
      const updatedSubtasks = subtasks.map(st => ({
        ...st,
        status: isCompleting ? "Closed" : "Open",
        progress: isCompleting ? (st.optional ? 0 : 100 / subtasks.filter(s => !s.optional).length) : 0,
      }));

      await api.put(
        `/tasks/update-subtask/${task._id}`,
        {
          subtasks: updatedSubtasks,
          notify: false,
          subtaskType: selectedOption,
          ontType: additionalInfo.ontType,
          speed: additionalInfo.speed,
          serviceRecipientInitial: additionalInfo.serviceRecipientInitial,
          serviceRecipientQoS: additionalInfo.serviceRecipientQoS,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (setUpdateTasksList) {
        setUpdateTasksList((prev) => !prev);
      } else {
        window.dispatchEvent(new CustomEvent('dashboard-refresh'));
      }
      alert(isCompleting ? "Task marked as completed!" : "Task completion undone!");
      onClose();

    } catch (error) {
      console.error("Error toggling completion:", error);
      alert("Failed to update status");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      TransitionProps={{ unmountOnExit: true }}
      PaperProps={{
        sx: {
          backgroundColor: colors.bg,
          color: colors.textPrimary,
          borderRadius: 0,
        }
      }}
    >
      <DialogTitle
        sx={{
          p: 0,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <Box sx={{
          backgroundColor: "#2d2d2d",
          px: 2,
          py: 1.5,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#ffffff" }}>
              Task Audit & Quality Review
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#b3b3b3" }}>
                ID: <span style={{ color: '#fff' }}>{task?.requestNumber || "N/A"}</span>
              </Typography>
              <Typography variant="caption" sx={{ color: "#b3b3b3" }}>
                SLID: <span style={{ color: '#fff' }}>{task?.slid}</span>
              </Typography>
              <Typography variant="caption" sx={{ color: "#b3b3b3" }}>
                Status: <span style={{ color: currentStatus === 'Closed' ? colors.success : colors.warning }}>{currentStatus}</span>
              </Typography>
            </Stack>
          </Box>

          <IconButton onClick={onClose} sx={{ color: "#ffffff", p: 0.5 }}>
            <MdClose />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2, bgcolor: colors.bg }}>
        <SubtaskManager
          subtasks={subtasks}
          notes={notes[selectedOption]}
          activeStep={activeStep}
          setActiveStep={setActiveStep}
          handleBack={handleBack}
          handleSaveNote={handleSaveNote}
          handleReset={handleReset}
          expandedNotes={expandedNotes}
          setExpandedNotes={setExpandedNotes}
          toggleNoteExpand={toggleNoteExpand}
          checkpoints={checkpoints}
          setCheckpoints={setCheckpoints}
          handleCheckpointToggle={handleCheckpointToggle}
          selectedTaskId={task?._id}
          selectedOption={selectedOption}
          handleOptionChange={handleOptionChange}
          predefinedOptions={Object.keys(predefinedSubtasks)}
          handleNoteChange={handleNoteChange}
          handleShortNoteChange={handleShortNoteChange}
          setSubtasks={setSubtasks}
          additionalInfo={additionalInfo}
          setAdditionalInfo={setAdditionalInfo}
        />
      </DialogContent>

      <DialogActions
        sx={{
          px: 2,
          py: 1,
          bgcolor: colors.card,
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <Button
          onClick={handleReset}
          startIcon={<MdClose />}
          variant="outlined"
          color="inherit"
          sx={{
            fontWeight: "bold",
            borderRadius: 0,
            textTransform: 'none',
          }}
        >
          Reset All Data
        </Button>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {currentStatus !== "Closed" && (
            <Button
              variant="outlined"
              onClick={() => handleToggleComplete(true)}
              startIcon={<MdCheckCircle />}
              sx={{
                color: colors.success,
                borderColor: colors.success,
                fontWeight: "bold",
                borderRadius: 0,
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(46, 125, 50, 0.08)',
                  borderColor: colors.success
                },
              }}
            >
              Mark Task as Completed
            </Button>
          )}

          {currentStatus === "Closed" && (
            <Button
              variant="outlined"
              onClick={() => handleToggleComplete(false)}
              startIcon={<MdCancel />}
              sx={{
                color: colors.error,
                borderColor: colors.error,
                fontWeight: "bold",
                borderRadius: 0,
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(211, 47, 47, 0.08)',
                  borderColor: colors.error
                },
              }}
            >
              Undo Completion
            </Button>
          )}

          <Button
            onClick={onClose}
            sx={{
              color: colors.textSecondary,
              fontWeight: "bold",
              borderRadius: 0,
              textTransform: 'none',
            }}
          >
            Discard Changes
          </Button>

          <Button
            variant="contained"
            color="primary"
            onClick={() => handleSaveNote()}
            sx={{
              fontWeight: "bold",
              px: 4,
              borderRadius: 0,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 'none',
              }
            }}
          >
            Finalize & Save Changes
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default DetailedSubtaskDialog;
