import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  TextField,
  Button,
  Stack,
  Card,
  CardContent,
  CardActions,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Grid
} from "@mui/material";
import {
  MdClose,
  MdAdd,
  MdPushPin,
  MdOutlinePushPin,
  MdDeleteOutline,
  MdEditNote,
  MdOutlineSearch,
  MdColorLens,
  MdLabel,
  MdFilterList
} from "react-icons/md";
import { format } from "date-fns";
import api from "../api/api";
import { toast } from "sonner";

const NOTE_COLORS = [
  "#2d2d2d", // Default
  "#4d2a2a", // Reddish
  "#2a4d2a", // Greenish
  "#2a2a4d", // Bluish
  "#4d4d2a", // Yellowish
  "#4d2a4d", // Purplish
  "#2a4d4d", // Cyan
];

const UserNotesDrawer = ({ open, onClose }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState(null);

  // Note Form State
  const [noteForm, setNoteForm] = useState({
    title: "",
    content: "",
    category: "General",
    priority: "Low",
    tags: "",
    color: "#2d2d2d",
    isPinned: false
  });

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/user-notes");
      setNotes(response.data);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchNotes();
    }
  }, [open, fetchNotes]);

  const handleCreateOrUpdateNote = async () => {
    if (!noteForm.title || !noteForm.content) {
      toast.warning("Title and content are required");
      return;
    }

    try {
      const payload = {
        ...noteForm,
        tags: noteForm.tags.split(",").map(tag => tag.trim()).filter(Boolean)
      };

      if (currentNote) {
        await api.put(`/user-notes/${currentNote._id}`, payload);
        toast.success("Note updated");
      } else {
        await api.post("/user-notes", payload);
        toast.success("Note created");
      }

      setEditDialogOpen(false);
      resetForm();
      fetchNotes();
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note");
    }
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    try {
      await api.delete(`/user-notes/${id}`);
      toast.success("Note deleted");
      fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  const handleTogglePin = async (note) => {
    try {
      await api.patch(`/user-notes/${note._id}/pin`);
      fetchNotes();
    } catch (error) {
      console.error("Error toggling pin:", error);
    }
  };

  const resetForm = () => {
    setNoteForm({
      title: "",
      content: "",
      category: "General",
      priority: "Low",
      tags: "",
      color: "#2d2d2d",
      isPinned: false
    });
    setCurrentNote(null);
  };

  const handleEditNote = (note) => {
    setCurrentNote(note);
    setNoteForm({
      title: note.title,
      content: note.content,
      category: note.category,
      priority: note.priority,
      tags: note.tags.join(", "),
      color: note.color,
      isPinned: note.isPinned
    });
    setEditDialogOpen(true);
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === "All" || note.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["All", ...new Set(notes.map(n => n.category))];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: "450px" },
          backgroundColor: "#1a1a1a",
          color: "#ffffff",
          borderLeft: "1px solid #333",
        }
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #333" }}>
          <Typography variant="h6" fontWeight="bold">Personal Notes</Typography>
          <IconButton onClick={onClose} sx={{ color: "#888" }}>
            <MdClose size={24} />
          </IconButton>
        </Box>

        {/* Toolbar */}
        <Box sx={{ p: 2, borderBottom: "1px solid #333" }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MdOutlineSearch color="#666" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2, backgroundColor: "#2d2d2d", color: "white" }
              }}
            />

            <Stack direction="row" spacing={1} overflow="auto" sx={{ pb: 1 }}>
              {categories.map(cat => (
                <Chip
                  key={cat}
                  label={cat}
                  onClick={() => setFilterCategory(cat)}
                  sx={{
                    backgroundColor: filterCategory === cat ? "#7b68ee" : "#2d2d2d",
                    color: "white",
                    "&:hover": { backgroundColor: "#8b78ee" }
                  }}
                  size="small"
                />
              ))}
            </Stack>

            <Button
              variant="contained"
              fullWidth
              startIcon={<MdAdd />}
              onClick={() => { resetForm(); setEditDialogOpen(true); }}
              sx={{ backgroundColor: "#7b68ee", "&:hover": { backgroundColor: "#8b78ee" }, borderRadius: 2 }}
            >
              Add New Note
            </Button>
          </Stack>
        </Box>

        {/* Notes List */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
          ) : filteredNotes.length === 0 ? (
            <Box display={"flex"} flexDirection={"column"} justifyContent={"center"} alignItems={"center"} py={8}>
              <MdEditNote size={64} color="#333" />
              <Typography color="text.secondary">No notes found</Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {filteredNotes.map((note) => (
                <Grid item xs={12} key={note._id}>
                  <Card sx={{
                    backgroundColor: note.color || "#2d2d2d",
                    color: "white",
                    borderRadius: 3,
                    border: "1px solid rgba(255,255,255,0.05)",
                    transition: "transform 0.2s",
                    "&:hover": { transform: "translateY(-4px)", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }
                  }}>
                    <CardContent sx={{ pb: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="subtitle1" fontWeight="bold" noWrap sx={{ maxWidth: "80%" }}>
                          {note.title}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleTogglePin(note)}
                          sx={{ color: note.isPinned ? "#7b68ee" : "#888" }}
                        >
                          {note.isPinned ? <MdPushPin /> : <MdOutlinePushPin />}
                        </IconButton>
                      </Box>
                      <Typography variant="body2" sx={{ my: 1, opacity: 0.8, whiteSpace: "pre-wrap" }}>
                        {note.content}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                        <Chip label={note.category} sx={{ height: 16, fontSize: "10px", backgroundColor: "rgba(255,255,255,0.1)", color: "white", "& .MuiChip-label": { px: 1 } }} />
                        {note.tags.map(tag => (
                          <Chip key={tag} label={`#${tag}`} sx={{ height: 16, fontSize: "10px", backgroundColor: "rgba(255,255,255,0.05)", color: "#aaa", "& .MuiChip-label": { px: 1 } }} />
                        ))}
                      </Stack>
                    </CardContent>
                    <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
                      <Typography variant="caption" sx={{ opacity: 0.5 }}>
                        {format(new Date(note.updatedAt), "MMM dd, HH:mm")}
                      </Typography>
                      <Box>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEditNote(note)} sx={{ color: "#aaa" }}>
                            <MdEditNote />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDeleteNote(note._id)} sx={{ color: "#f44336" }}>
                            <MdDeleteOutline />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        PaperProps={{
          sx: { backgroundColor: "#1a1a1a", color: "white", borderRadius: 4, width: "100%", maxWidth: "500px" }
        }}
      >
        <DialogTitle>{currentNote ? "Edit Note" : "New Note"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              variant="outlined"
              size="small"
              value={noteForm.title}
              onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
              sx={{ input: { color: "white" }, "& .MuiInputLabel-root": { color: "#888" } }}
            />
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={noteForm.content}
              onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
              sx={{ textarea: { color: "white" }, "& .MuiInputLabel-root": { color: "#888" } }}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Category"
                  fullWidth
                  size="small"
                  value={noteForm.category}
                  onChange={(e) => setNoteForm({ ...noteForm, category: e.target.value })}
                  sx={{ input: { color: "white" }, "& .MuiInputLabel-root": { color: "#888" } }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: "#888" }}>Priority</InputLabel>
                  <Select
                    value={noteForm.priority}
                    label="Priority"
                    onChange={(e) => setNoteForm({ ...noteForm, priority: e.target.value })}
                    sx={{ color: "white", ".MuiOutlinedInput-notchedOutline": { borderColor: "#333" } }}
                  >
                    <MenuItem value="Low">Low</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="High">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField
              label="Tags (comma separated)"
              fullWidth
              size="small"
              value={noteForm.tags}
              onChange={(e) => setNoteForm({ ...noteForm, tags: e.target.value })}
              sx={{ input: { color: "white" }, "& .MuiInputLabel-root": { color: "#888" } }}
            />
            <Box>
              <Typography variant="caption" sx={{ color: "#888", display: "block", mb: 1 }}>Note Color</Typography>
              <Stack direction="row" spacing={1}>
                {NOTE_COLORS.map(color => (
                  <Box
                    key={color}
                    onClick={() => setNoteForm({ ...noteForm, color })}
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      backgroundColor: color,
                      cursor: "pointer",
                      border: noteForm.color === color ? "2px solid #7b68ee" : "1px solid transparent",
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setEditDialogOpen(false)} sx={{ color: "#888" }}>Cancel</Button>
          <Button onClick={handleCreateOrUpdateNote} variant="contained" sx={{ backgroundColor: "#7b68ee" }}>
            {currentNote ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default UserNotesDrawer;
