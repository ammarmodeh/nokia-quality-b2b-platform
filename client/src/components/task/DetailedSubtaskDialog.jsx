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
} from "@mui/material";
import { MdClose, MdCheckCircle, MdCancel } from "react-icons/md";
import SubtaskManager from "../SubtaskManager";
import api from "../../api/api";
import { predefinedSubtasks } from "../../constants/subtaskData";

const DetailedSubtaskDialog = ({ open, onClose, task, setUpdateTasksList }) => {
  const colors = {
    primary: "#0ea5e9",
    primaryDark: "#0369a1",
    secondary: "#6366f1",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    bg: "#0f172a", // Darker slate
    card: "#1e293b",
    border: "#334155",
    textPrimary: "#f8fafc",
    textSecondary: "#94a3b8",
  };

  const [selectedOption, setSelectedOption] = useState("visit");
  const [subtasks, setSubtasks] = useState(predefinedSubtasks.visit);
  const [checkpoints, setCheckpoints] = useState(predefinedSubtasks.visit.map((subtask) => (subtask.checkpoints ? [...subtask.checkpoints] : [])));
  const [notes, setNotes] = useState({
    visit: predefinedSubtasks.visit.map(() => ""),
    phone: predefinedSubtasks.phone.map(() => ""),
    original: predefinedSubtasks.original.map(() => ""),
    others: predefinedSubtasks.others.map(() => "")
  });
  const [subtasksByOption, setSubtasksByOption] = useState({
    visit: predefinedSubtasks.visit,
    phone: predefinedSubtasks.phone,
    original: predefinedSubtasks.original,
    others: predefinedSubtasks.others
  });
  const [checkpointsByOption, setCheckpointsByOption] = useState({
    visit: predefinedSubtasks.visit.map((subtask) => (subtask.checkpoints ? [...subtask.checkpoints] : [])),
    phone: predefinedSubtasks.phone.map((subtask) => (subtask.checkpoints ? [...subtask.checkpoints] : [])),
    original: predefinedSubtasks.original.map((subtask) => [...subtask.checkpoints || []]),
    others: predefinedSubtasks.others.map((subtask) => (subtask.checkpoints ? [...subtask.checkpoints] : []))
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

  useEffect(() => {
    if (open && task?._id) {
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

      let matchingOption = response.data.subtaskType || "visit";
      let fetchedSubtasks = response.data.subTasks || [];

      if (!response.data.subtaskType && fetchedSubtasks.length > 0) {
        matchingOption =
          Object.keys(predefinedSubtasks).find((option) => {
            const predefinedTitles = predefinedSubtasks[option].map((s) => s.title);
            const fetchedTitles = fetchedSubtasks.map((s) => s.title);
            return JSON.stringify(predefinedTitles) === JSON.stringify(fetchedTitles);
          }) || "visit";
      }

      if (fetchedSubtasks.length === 0) {
        fetchedSubtasks = predefinedSubtasks[matchingOption];
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
      const resetSubtasks = predefinedSubtasks[selectedOption].map((subtask) => ({
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
          subtaskType: selectedOption,
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
        if (setUpdateTasksList) setUpdateTasksList((prev) => !prev);
        window.dispatchEvent(new CustomEvent('dashboard-refresh'));
        alert(`${selectedOption.charAt(0).toUpperCase() + selectedOption.slice(1)} subtasks reset successfully!`);
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
        if (setUpdateTasksList) setUpdateTasksList((prev) => !prev);
        window.dispatchEvent(new CustomEvent('dashboard-refresh'));
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

      if (setUpdateTasksList) setUpdateTasksList((prev) => !prev);
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
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
          backgroundImage: 'none',
        }
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: colors.card,
          borderBottom: `1px solid ${colors.border}`,
          px: 4,
          py: 2,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 'black', color: colors.textPrimary, letterSpacing: -0.5 }}>
            TASK AUDIT & QUALITY CONTROL
          </Typography>
          <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 'bold' }}>
            Reference: {task?.slid} • {task?.customerName}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: colors.textSecondary,
            bgcolor: 'rgba(255,255,255,0.05)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.1)',
              color: colors.error,
            },
          }}
        >
          <MdClose />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, bgcolor: colors.bg }}>
        <Box sx={{ p: 4 }}>
          <Box sx={{ mb: 4, p: 1, bgcolor: colors.card, borderRadius: 3, display: 'inline-flex', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <RadioGroup row value={selectedOption} onChange={handleOptionChange}>
              {Object.keys(predefinedSubtasks).map((option) => (
                <FormControlLabel
                  key={option}
                  value={option}
                  control={<Radio size="small" sx={{ color: colors.primary }} />}
                  label={
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 'bold',
                        color: selectedOption === option ? colors.primary : colors.textSecondary,
                        mr: 1
                      }}
                    >
                      {option === "no_answer" ? "No Answer" :
                        option === "others" ? "Others" :
                          option.toUpperCase()}
                    </Typography>
                  }
                  sx={{
                    px: 2,
                    py: 0.5,
                    m: 0,
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    bgcolor: selectedOption === option ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(14, 165, 233, 0.05)' }
                  }}
                />
              ))}
            </RadioGroup>
          </Box>

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
            handleNoteChange={handleNoteChange}
            handleShortNoteChange={handleShortNoteChange}
            setSubtasks={setSubtasks}
            additionalInfo={additionalInfo}
            setAdditionalInfo={setAdditionalInfo}
          />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 4,
          py: 3,
          bgcolor: colors.card,
          borderTop: `1px solid ${colors.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          bottom: 0,
          zIndex: 10,
        }}
      >
        <Button
          onClick={handleReset}
          startIcon={<MdClose />}
          sx={{
            color: colors.error,
            fontWeight: 'bold',
            px: 3,
            '&:hover': {
              bgcolor: 'rgba(239, 68, 68, 0.1)',
            },
            textTransform: 'none',
          }}
        >
          Reset All Data
        </Button>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {task?.status !== "Closed" && (
            <Button
              variant="outlined"
              onClick={() => handleToggleComplete(true)}
              startIcon={<MdCheckCircle />}
              sx={{
                color: colors.success,
                borderColor: colors.success,
                '&:hover': {
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderColor: colors.success
                }
              }}
            >
              Mark as Completed
            </Button>
          )}

          {task?.status === "Closed" && (
            <Button
              variant="outlined"
              onClick={() => handleToggleComplete(false)}
              startIcon={<MdCancel />}
              sx={{
                color: colors.error,
                borderColor: colors.error,
                '&:hover': {
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderColor: colors.error
                }
              }}
            >
              Undo Completion
            </Button>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            onClick={onClose}
            sx={{
              color: colors.textSecondary,
              fontWeight: 'bold',
              px: 4,
              textTransform: 'none',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
            }}
          >
            Close Dialog
          </Button>
          <Button
            variant="contained"
            onClick={() => handleSaveNote()}
            sx={{
              bgcolor: colors.primary,
              '&:hover': { bgcolor: colors.primaryDark },
              fontWeight: 'bold',
              px: 6,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: `0 8px 16px ${colors.primary}44`,
            }}
          >
            Finalize & Save Progress
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default DetailedSubtaskDialog;
