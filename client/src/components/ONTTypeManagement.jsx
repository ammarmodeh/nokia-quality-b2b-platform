import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { toast } from "sonner";
import api from "../api/api";

const ONTTypeManagement = ({ onTypeChange }) => {
  const [ontTypes, setOntTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [newType, setNewType] = useState({ name: "", description: "" });

  const colors = {
    background: "#2d2d2d",
    surface: "#252525",
    border: "#3d3d3d",
    primary: "#7b68ee",
    textPrimary: "#ffffff",
    textSecondary: "#b3b3b3",
    error: "#f44336",
  };

  const fetchONTTypes = async () => {
    setLoading(true);
    try {
      const response = await api.get("/ont-types");
      setOntTypes(response.data);
    } catch (error) {
      console.error("Failed to fetch ONT Types:", error);
      toast.error("Failed to load ONT Types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchONTTypes();
  }, []);

  const handleAddType = async () => {
    try {
      await api.post("/ont-types", newType);
      toast.success("ONT Type added successfully");
      setOpenDialog(false);
      setNewType({ name: "", description: "" });
      fetchONTTypes();
      if (onTypeChange) onTypeChange();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add ONT Type");
    }
  };

  const handleDeleteType = async (id) => {
    if (!window.confirm("Are you sure you want to delete this ONT Type?")) return;
    try {
      await api.delete(`/ont-types/${id}`);
      toast.success("ONT Type deleted successfully");
      fetchONTTypes();
      if (onTypeChange) onTypeChange();
    } catch (error) {
      toast.error("Failed to delete ONT Type");
    }
  };

  return (
    <Paper sx={{ p: 3, bgcolor: colors.surface, borderRadius: "12px", border: `1px solid ${colors.border}` }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" sx={{ color: colors.textPrimary }}>
          ONT Type Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ bgcolor: colors.primary, "&:hover": { bgcolor: "#6a5acd" } }}
        >
          Add Type
        </Button>
      </Stack>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: colors.textSecondary, borderBottom: `1px solid ${colors.border}` }}>Name</TableCell>
              <TableCell sx={{ color: colors.textSecondary, borderBottom: `1px solid ${colors.border}` }}>Description</TableCell>
              <TableCell align="right" sx={{ color: colors.textSecondary, borderBottom: `1px solid ${colors.border}` }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ontTypes.map((type) => (
              <TableRow key={type._id}>
                <TableCell sx={{ color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>{type.name}</TableCell>
                <TableCell sx={{ color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>{type.description}</TableCell>
                <TableCell align="right" sx={{ borderBottom: `1px solid ${colors.border}` }}>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDeleteType(type._id)} sx={{ color: colors.error }}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {ontTypes.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ color: colors.textSecondary, borderBottom: "none", py: 3 }}>
                  No ONT Types found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} PaperProps={{ sx: { bgcolor: colors.surface, color: colors.textPrimary, border: `1px solid ${colors.border}` } }}>
        <DialogTitle>Add New ONT Type</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              fullWidth
              label="Name"
              value={newType.name}
              onChange={(e) => setNewType({ ...newType, name: e.target.value })}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.border },
                  "&:hover fieldset": { borderColor: colors.primary },
                  "&.Mui-focused fieldset": { borderColor: colors.primary },
                },
                "& .MuiInputLabel-root": { color: colors.textSecondary },
                input: { color: colors.textPrimary },
              }}
            />
            <TextField
              fullWidth
              label="Description"
              value={newType.description}
              onChange={(e) => setNewType({ ...newType, description: e.target.value })}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.border },
                  "&:hover fieldset": { borderColor: colors.primary },
                  "&.Mui-focused fieldset": { borderColor: colors.primary },
                },
                "& .MuiInputLabel-root": { color: colors.textSecondary },
                input: { color: colors.textPrimary },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} sx={{ color: colors.textSecondary }}>Cancel</Button>
          <Button onClick={handleAddType} variant="contained" disabled={!newType.name} sx={{ bgcolor: colors.primary }}>Add</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ONTTypeManagement;
