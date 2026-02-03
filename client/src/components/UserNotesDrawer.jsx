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
  MdFilterList,
  MdArchive,
  MdOutlineArchive,
  MdUnarchive,
  MdSort,
  MdHistory,
  MdPriorityHigh,
  MdCalendarToday,
  MdContentCopy
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
  const [filterPriority, setFilterPriority] = useState("All");
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, priority, title
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);

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
      const response = await api.get(`/user-notes?archived=${showArchived}`);
      setNotes(response.data);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

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
        tags: typeof noteForm.tags === 'string'
          ? noteForm.tags.split(",").map(tag => tag.trim()).filter(Boolean)
          : noteForm.tags
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
      window.dispatchEvent(new CustomEvent('notes-refresh'));
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
      window.dispatchEvent(new CustomEvent('notes-refresh'));
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

  const handleToggleArchive = async (note) => {
    try {
      await api.patch(`/user-notes/${note._id}/archive`);
      toast.success(note.isArchived ? "Note unarchived" : "Note archived");
      fetchNotes();
    } catch (error) {
      console.error("Error toggling archive:", error);
    }
  };

  const handleCopyNote = (note) => {
    const textToCopy = `${note.title}\n\n${note.content}`;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        toast.success("Note copied to clipboard");
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
        toast.error("Failed to copy note");
      });
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

  const filteredAndSortedNotes = notes
    .filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = filterCategory === "All" || note.category === filterCategory;
      const matchesPriority = filterPriority === "All" || note.priority === filterPriority;
      return matchesSearch && matchesCategory && matchesPriority;
    })
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;

      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "priority":
          const priorityMap = { High: 0, Medium: 1, Low: 2 };
          return priorityMap[a.priority] - priorityMap[b.priority];
        case "title":
          return a.title.localeCompare(b.title);
        case "newest":
        default:
          return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
    });

  const categories = ["All", ...new Set(notes.map(n => n.category))];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "#f44336";
      case "Medium": return "#ff9800";
      default: return "#4caf50";
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: "450px" },
          backgroundColor: "#121212",
          color: "#ffffff",
          borderLeft: "1px solid #333",
          backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))"
        }
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #333" }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <MdEditNote size={24} color="#7b68ee" />
            <Typography variant="h6" fontWeight="bold">
              {showArchived ? "Archived Notes" : "Personal Notes"}
            </Typography>
          </Stack>
          <IconButton onClick={onClose} sx={{ color: "#888" }}>
            <MdClose size={24} />
          </IconButton>
        </Box>

        {/* Toolbar */}
        <Box sx={{ p: 2, borderBottom: "1px solid #333", backgroundColor: "rgba(0,0,0,0.2)" }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by title, content or #tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MdOutlineSearch color="#7b68ee" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 3, backgroundColor: "#1e1e1e", color: "white", "& .MuiOutlinedInput-notchedOutline": { borderColor: "#333" } }
              }}
            />

            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} overflow="auto" sx={{ flex: 1, pb: 0.5, "&::-webkit-scrollbar": { display: "none" } }}>
                {categories.map(cat => (
                  <Chip
                    key={cat}
                    label={cat}
                    onClick={() => setFilterCategory(cat)}
                    sx={{
                      backgroundColor: filterCategory === cat ? "#7b68ee" : "#2d2d2d",
                      color: "white",
                      "&:hover": { backgroundColor: filterCategory === cat ? "#8b78ee" : "#3d3d2d" },
                      borderRadius: 1.5,
                      fontWeight: filterCategory === cat ? "bold" : "normal"
                    }}
                    size="small"
                  />
                ))}
              </Stack>
              <IconButton onClick={(e) => setFilterMenuAnchor(e.currentTarget)} size="small" sx={{ color: "#888" }}>
                <MdFilterList />
              </IconButton>
              <IconButton onClick={(e) => setSortMenuAnchor(e.currentTarget)} size="small" sx={{ color: "#888" }}>
                <MdSort />
              </IconButton>
            </Stack>

            <Button
              variant="contained"
              fullWidth
              startIcon={<MdAdd />}
              onClick={() => { resetForm(); setEditDialogOpen(true); }}
              sx={{ backgroundColor: "#7b68ee", "&:hover": { backgroundColor: "#8b78ee" }, borderRadius: 2, textTransform: "none", fontWeight: "bold" }}
            >
              Add New Note
            </Button>
          </Stack>
        </Box>

        {/* Notes List */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 2, backgroundColor: "#121212" }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress size={30} /></Box>
          ) : filteredAndSortedNotes.length === 0 ? (
            <Box display={"flex"} flexDirection={"column"} justifyContent={"center"} alignItems={"center"} height="100%" sx={{ opacity: 0.5 }}>
              <MdEditNote size={80} color="#333" />
              <Typography variant="h6">No notes found</Typography>
              <Typography variant="body2">Try adjusting your filters or search</Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {filteredAndSortedNotes.map((note) => (
                <Grid item xs={12} key={note._id}>
                  <Card sx={{
                    backgroundColor: note.color || "#1e1e1e",
                    color: "white",
                    borderRadius: 3,
                    border: "1px solid rgba(255,255,255,0.05)",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": { transform: "translateY(-4px)", boxShadow: "0 12px 30px rgba(0,0,0,0.5)", border: "1px solid rgba(123, 104, 238, 0.3)" }
                  }}>
                    {/* Priority Bar */}
                    <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: getPriorityColor(note.priority) }} />

                    <CardContent sx={{ pt: 2, pb: 1, pl: 3 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="subtitle1" fontWeight="bold" noWrap sx={{ maxWidth: "80%" }}>
                          {note.title}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleTogglePin(note)}
                          sx={{ color: note.isPinned ? "#7b68ee" : "rgba(255,255,255,0.3)" }}
                        >
                          {note.isPinned ? <MdPushPin /> : <MdOutlinePushPin />}
                        </IconButton>
                      </Box>
                      <Typography variant="body2" sx={{ my: 1.5, opacity: 0.85, whiteSpace: "pre-wrap", minHeight: 40, lineHeight: 1.6 }}>
                        {note.content}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5} sx={{ mb: 1 }}>
                        <Chip
                          label={note.category}
                          size="small"
                          sx={{ height: 20, fontSize: "10px", backgroundColor: "rgba(255,255,255,0.1)", color: "white", fontWeight: "bold" }}
                        />
                        {note.tags.map(tag => (
                          <Chip
                            key={tag}
                            label={`#${tag}`}
                            size="small"
                            sx={{ height: 20, fontSize: "10px", backgroundColor: "rgba(123, 104, 238, 0.1)", color: "#7b68ee", border: "1px solid rgba(123, 104, 238, 0.2)" }}
                          />
                        ))}
                      </Stack>
                    </CardContent>

                    <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 1.5, pt: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ opacity: 0.5 }}>
                        <MdCalendarToday size={12} />
                        <Typography variant="caption">
                          {format(new Date(note.updatedAt), "MMM dd")}
                        </Typography>
                      </Stack>
                      <Box>
                        <Tooltip title="Copy Content">
                          <IconButton size="small" onClick={() => handleCopyNote(note)} sx={{ color: "rgba(255,255,255,0.4)" }}>
                            <MdContentCopy />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={note.isArchived ? "Unarchive" : "Archive"}>
                          <IconButton size="small" onClick={() => handleToggleArchive(note)} sx={{ color: "rgba(255,255,255,0.4)" }}>
                            {note.isArchived ? <MdUnarchive /> : <MdArchive />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEditNote(note)} sx={{ color: "rgba(255,255,255,0.4)" }}>
                            <MdEditNote />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDeleteNote(note._id)} sx={{ color: "rgba(244, 67, 54, 0.6)" }}>
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

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
        PaperProps={{ sx: { backgroundColor: "#1e1e1e", color: "white", border: "1px solid #333", width: 200 } }}
      >
        <Typography variant="caption" sx={{ px: 2, py: 1, display: "block", color: "#888", fontWeight: "bold" }}>Priority</Typography>
        {["All", "High", "Medium", "Low"].map(p => (
          <MenuItem
            key={p}
            onClick={() => { setFilterPriority(p); setFilterMenuAnchor(null); }}
            sx={{ fontSize: "14px", backgroundColor: filterPriority === p ? "rgba(123, 104, 238, 0.1)" : "transparent" }}
          >
            {p}
          </MenuItem>
        ))}
        <hr style={{ border: "0", borderTop: "1px solid #333", margin: "8px 0" }} />
        <MenuItem
          onClick={() => { setShowArchived(!showArchived); setFilterMenuAnchor(null); }}
          sx={{ fontSize: "14px" }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            {showArchived ? <MdEditNote /> : <MdArchive />}
            <span>{showArchived ? "Show Active" : "Show Archived"}</span>
          </Stack>
        </MenuItem>
      </Menu>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={() => setSortMenuAnchor(null)}
        PaperProps={{ sx: { backgroundColor: "#1e1e1e", color: "white", border: "1px solid #333", width: 200 } }}
      >
        <Typography variant="caption" sx={{ px: 2, py: 1, display: "block", color: "#888", fontWeight: "bold" }}>Sort By</Typography>
        {[
          { label: "Newest Updated", value: "newest" },
          { label: "Oldest Created", value: "oldest" },
          { label: "Priority (High-Low)", value: "priority" },
          { label: "Title (A-Z)", value: "title" }
        ].map(s => (
          <MenuItem
            key={s.value}
            onClick={() => { setSortBy(s.value); setSortMenuAnchor(null); }}
            sx={{ fontSize: "14px", backgroundColor: sortBy === s.value ? "rgba(123, 104, 238, 0.1)" : "transparent" }}
          >
            {s.label}
          </MenuItem>
        ))}
      </Menu>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        PaperProps={{
          sx: { backgroundColor: "#1a1a1a", color: "white", borderRadius: 4, width: "100%", maxWidth: "500px", border: "1px solid #333" }
        }}
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>{currentNote ? "Update Note" : "Create New Note"}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              variant="outlined"
              size="small"
              value={noteForm.title}
              onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
              sx={{ input: { color: "white" }, "& .MuiInputLabel-root": { color: "#888" }, "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: "#333" } } }}
            />
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={6}
              variant="outlined"
              value={noteForm.content}
              onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
              sx={{ textarea: { color: "white" }, "& .MuiInputLabel-root": { color: "#888" }, "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: "#333" } } }}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Category"
                  fullWidth
                  size="small"
                  value={noteForm.category}
                  onChange={(e) => setNoteForm({ ...noteForm, category: e.target.value })}
                  sx={{ input: { color: "white" }, "& .MuiInputLabel-root": { color: "#888" }, "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: "#333" } } }}
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
              placeholder="e.g. todo, urgent, feedback"
              value={noteForm.tags}
              onChange={(e) => setNoteForm({ ...noteForm, tags: e.target.value })}
              sx={{ input: { color: "white" }, "& .MuiInputLabel-root": { color: "#888" }, "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: "#333" } } }}
            />
            <Box>
              <Typography variant="caption" sx={{ color: "#888", display: "block", mb: 1, fontWeight: "bold" }}>Note Color</Typography>
              <Stack direction="row" spacing={1.5} flexWrap="wrap">
                {NOTE_COLORS.map(color => (
                  <Box
                    key={color}
                    onClick={() => setNoteForm({ ...noteForm, color })}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      backgroundColor: color,
                      cursor: "pointer",
                      border: noteForm.color === color ? "3px solid #7b68ee" : "2px solid rgba(255,255,255,0.1)",
                      transition: "transform 0.2s",
                      "&:hover": { transform: "scale(1.2)" }
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setEditDialogOpen(false)} sx={{ color: "#888", textTransform: "none" }}>Cancel</Button>
          <Button onClick={handleCreateOrUpdateNote} variant="contained" sx={{ backgroundColor: "#7b68ee", "&:hover": { backgroundColor: "#8b78ee" }, borderRadius: 2, px: 4, textTransform: "none", fontWeight: "bold" }}>
            {currentNote ? "Update Note" : "Create Note"}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default UserNotesDrawer;
