import { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
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
  CircularProgress,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import api from '../api/api';

const CATEGORY_MAP = {
  PRIORITY: "Task Priorities",
  TASK_CATEGORIES: "Task Categories",
  TEAM_COMPANY: "Team Companies (Add Task)",
  FIELDTEAMSCOMPANY: "Team Companies (Add Field Team)",
  EVALUATION_SCORE: "Satisfaction Scores",
  GOVERNORATES: "Governorates",
  CUSTOMER_TYPE: "Customer Types",
  VALIDATION_STATUS: "Validation Statuses",
  VALIDATION_CATEGORY: "Validation Categories",
  REASON: "General Reasons",
  RESPONSIBILITY: "Responsibilities (Main)",
  RESPONSIBILITY_SUB: "Responsibilities (Sub/Team)",
};

const DropdownManagement = () => {
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState({});
  const [activeTab, setActiveTab] = useState('PRIORITY');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [formData, setFormData] = useState({ value: '', label: '', order: 0, parentCategory: null, parentValue: null });

  const colors = {
    background: 'transparent',
    surface: '#252525',
    border: '#3d3d3d',
    primary: '#7b68ee',
    textPrimary: '#ffffff',
    textSecondary: '#b3b3b3',
    error: '#f44336',
  };

  const fetchOptions = async () => {
    setLoading(true);
    try {
      // First, try to seed if empty
      await api.post('/dropdown-options/seed');

      const response = await api.get('/dropdown-options/all');
      setOptions(response.data);
      if (Object.keys(response.data).length > 0 && !response.data[activeTab]) {
        setActiveTab(Object.keys(response.data)[0]);
      }
    } catch (error) {
      console.error('Failed to fetch options:', error);
      toast.error('Failed to load dropdown options');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleOpenDialog = (option = null) => {
    if (option) {
      setEditingOption(option);
      setFormData({ value: option.value, label: option.label, order: option.order, parentCategory: option.parentCategory, parentValue: option.parentValue });
    } else {
      setEditingOption(null);
      setFormData({
        value: '',
        label: '',
        order: (options[activeTab]?.length || 0) + 1,
        parentCategory: activeTab === 'RESPONSIBILITY_SUB' ? 'RESPONSIBILITY' : null,
        parentValue: null
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingOption(null);
    setFormData({ value: '', label: '', order: 0, parentCategory: null, parentValue: null });
  };

  const handleSubmit = async () => {
    try {
      if (editingOption) {
        await api.patch(`/dropdown-options/update/${editingOption._id}`, formData);
        toast.success('Option updated successfully');
      } else {
        await api.post('/dropdown-options/add', { ...formData, category: activeTab });
        toast.success('Option added successfully');
      }
      handleCloseDialog();
      fetchOptions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save option');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this option?')) return;
    try {
      await api.delete(`/dropdown-options/delete/${id}`);
      toast.success('Option deleted successfully');
      fetchOptions();
    } catch (error) {
      toast.error('Failed to delete option');
    }
  };

  const currentOptions = useMemo(() => options[activeTab] || [], [options, activeTab]);

  if (loading && Object.keys(options).length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: colors.background }}>
        <CircularProgress sx={{ color: colors.primary }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, minHeight: '100vh', bgcolor: colors.background }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" sx={{ color: colors.primary, fontWeight: 'bold' }}>
          Dropdown Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: colors.primary, '&:hover': { bgcolor: '#6a5acd' } }}
        >
          Add New Option
        </Button>
      </Stack>

      <Paper sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(e, newVal) => setActiveTab(newVal)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: `1px solid ${colors.border}`,
            '& .MuiTabs-indicator': { bgcolor: colors.primary },
            '& .MuiTab-root': { color: colors.textSecondary, py: 2 },
            '& .Mui-selected': { color: colors.primary },
          }}
        >
          {Object.keys(CATEGORY_MAP).map((cat) => (
            <Tab key={cat} label={CATEGORY_MAP[cat]} value={cat} />
          ))}
        </Tabs>

        <TableContainer sx={{ maxHeight: '60vh' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: colors.surface, color: colors.textSecondary, borderBottom: `2px solid ${colors.border}` }}>Value</TableCell>
                <TableCell sx={{ bgcolor: colors.surface, color: colors.textSecondary, borderBottom: `2px solid ${colors.border}` }}>Label</TableCell>
                {activeTab === 'RESPONSIBILITY_SUB' && (
                  <TableCell sx={{ bgcolor: colors.surface, color: colors.textSecondary, borderBottom: `2px solid ${colors.border}` }}>Parent (Main)</TableCell>
                )}
                <TableCell sx={{ bgcolor: colors.surface, color: colors.textSecondary, borderBottom: `2px solid ${colors.border}` }}>Order</TableCell>
                <TableCell align="right" sx={{ bgcolor: colors.surface, color: colors.textSecondary, borderBottom: `2px solid ${colors.border}` }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentOptions.map((option) => (
                <TableRow key={option._id} sx={{ '&:hover': { bgcolor: '#2a2a2a' } }}>
                  <TableCell sx={{ color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>{option.value}</TableCell>
                  <TableCell sx={{ color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>{option.label}</TableCell>
                  {activeTab === 'RESPONSIBILITY_SUB' && (
                    <TableCell sx={{ color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>{option.parentValue}</TableCell>
                  )}
                  <TableCell sx={{ color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>{option.order}</TableCell>
                  <TableCell align="right" sx={{ borderBottom: `1px solid ${colors.border}` }}>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => handleOpenDialog(option)} sx={{ color: colors.primary }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => handleDelete(option._id)} sx={{ color: colors.error }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {currentOptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: colors.textSecondary }}>
                    No options found for this category.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        PaperProps={{
          sx: { bgcolor: colors.surface, color: colors.textPrimary, border: `1px solid ${colors.border}`, width: '400px' }
        }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${colors.border}` }}>
          {editingOption ? 'Edit Option' : 'Add New Option'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3} mt={1}>
            {activeTab === 'RESPONSIBILITY_SUB' && (
              <TextField
                select
                fullWidth
                label="Parent Responsibility"
                value={formData.parentValue || ''}
                onChange={(e) => setFormData({ ...formData, parentValue: e.target.value })}
                SelectProps={{ native: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: colors.border },
                    '&:hover fieldset': { borderColor: colors.primary },
                    '&.Mui-focused fieldset': { borderColor: colors.primary },
                  },
                  '& .MuiInputLabel-root': { color: colors.textSecondary },
                  select: { color: colors.textPrimary, bgcolor: colors.surface },
                }}
              >
                <option value="" disabled style={{ backgroundColor: colors.surface }}>Select Parent</option>
                {(options['RESPONSIBILITY'] || []).map(opt => (
                  <option key={opt._id} value={opt.value} style={{ backgroundColor: colors.surface }}>{opt.label}</option>
                ))}
              </TextField>
            )}
            <TextField
              fullWidth
              label="Value"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: colors.primary },
                  '&.Mui-focused fieldset': { borderColor: colors.primary },
                },
                '& .MuiInputLabel-root': { color: colors.textSecondary },
                input: { color: colors.textPrimary },
              }}
            />
            <TextField
              fullWidth
              label="Label"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: colors.primary },
                  '&.Mui-focused fieldset': { borderColor: colors.primary },
                },
                '& .MuiInputLabel-root': { color: colors.textSecondary },
                input: { color: colors.textPrimary },
              }}
            />
            <TextField
              fullWidth
              label="Display Order"
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: colors.primary },
                  '&.Mui-focused fieldset': { borderColor: colors.primary },
                },
                '& .MuiInputLabel-root': { color: colors.textSecondary },
                input: { color: colors.textPrimary },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: `1px solid ${colors.border}` }}>
          <Button onClick={handleCloseDialog} sx={{ color: colors.textSecondary }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.value || !formData.label}
            sx={{ bgcolor: colors.primary, '&:hover': { bgcolor: '#6a5acd' } }}
          >
            {editingOption ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DropdownManagement;
