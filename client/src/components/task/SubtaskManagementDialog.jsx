import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  IconButton,
  Typography,
  Box,
  Divider,
} from "@mui/material";
import { Delete, Add, Close } from "@mui/icons-material";
import api from "../../api/api";
import { toast } from "sonner";

const SubtaskManagementDialog = ({ open, onClose, taskId, onUpdate }) => {
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && taskId) {
      fetchSubtasks();
    }
  }, [open, taskId]);

  const fetchSubtasks = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/tasks/get-task/${taskId}`);
      setSubtasks(data.subTasks || []);
    } catch (error) {
      console.error("Error fetching subtasks:", error);
      toast.error("Failed to load subtasks");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    const newSubtask = {
      title: newSubtaskTitle,
      status: "Open",
      note: "",
      dateTime: new Date()
    };

    // Optimistic update
    const updatedSubtasks = [...subtasks, newSubtask];
    setSubtasks(updatedSubtasks);
    setNewSubtaskTitle("");

    await saveSubtasks(updatedSubtasks);
  };

  const handleToggleSubtask = async (index) => {
    const updatedSubtasks = [...subtasks];
    updatedSubtasks[index].status = updatedSubtasks[index].status === "Closed" ? "Open" : "Closed";
    setSubtasks(updatedSubtasks);
    await saveSubtasks(updatedSubtasks);
  };

  const handleDeleteSubtask = async (index) => {
    const updatedSubtasks = subtasks.filter((_, i) => i !== index);
    setSubtasks(updatedSubtasks);
    await saveSubtasks(updatedSubtasks);
  };

  const handleNoteChange = (index, value) => {
    const updatedSubtasks = [...subtasks];
    updatedSubtasks[index].note = value;
    setSubtasks(updatedSubtasks);
  };

  const handleSaveNote = async () => {
    await saveSubtasks(subtasks);
  }


  const saveSubtasks = async (updatedSubtasks) => {
    try {
      await api.put(`/tasks/update-subtask/${taskId}`, { subtasks: updatedSubtasks });
      if (onUpdate) onUpdate(); // Refresh parent list if needed
    } catch (error) {
      console.error("Error updating subtasks:", error);
      toast.error("Failed to update subtasks");
      fetchSubtasks(); // Revert on error
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Manage Subtasks
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="New subtask title..."
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddSubtask()}
          />
          <Button variant="contained" onClick={handleAddSubtask} disabled={loading} startIcon={<Add />}>
            Add
          </Button>
        </Box>

        <List>
          {subtasks.length === 0 ? (
            <Typography variant="body2" color="textSecondary" align="center">
              No subtasks yet.
            </Typography>
          ) : (
            subtasks.map((subtask, index) => (
              <React.Fragment key={index}>
                <ListItem
                  secondaryAction={
                    <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteSubtask(index)}>
                      <Delete />
                    </IconButton>
                  }
                  disablePadding
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={subtask.status === "Closed"}
                      onChange={() => handleToggleSubtask(index)}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body1" sx={{ textDecoration: subtask.status === "Closed" ? "line-through" : "none", color: subtask.status === "Closed" ? 'text.disabled' : 'text.primary' }}>
                        {subtask.title}
                      </Typography>
                    }
                    secondary={
                      <TextField
                        fullWidth
                        variant="standard"
                        placeholder="Add note..."
                        value={subtask.note || ""}
                        onChange={(e) => handleNoteChange(index, e.target.value)}
                        onBlur={handleSaveNote}
                        size="small"
                        InputProps={{ disableUnderline: true, style: { fontSize: '0.875rem', color: '#666' } }}
                      />
                    }
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SubtaskManagementDialog;
