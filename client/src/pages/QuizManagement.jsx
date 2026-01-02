import { useEffect, useState } from 'react';
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
  CircularProgress,
  Stack,
  Tooltip,
  MenuItem,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import api from '../api/api';

const QuizManagement = () => {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    category: 'General',
    type: 'options',
    guideline: ''
  });

  const colors = {
    background: 'transparent',
    surface: '#1e1e1e',
    border: '#333333',
    primary: '#7b68ee',
    secondary: '#3ea6ff',
    textPrimary: '#ffffff',
    textSecondary: '#a0a0a0',
    error: '#ff4d4d',
    success: '#4caf50',
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/quiz/questions');
      setQuestions(response.data);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      toast.error('Failed to load quiz questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleOpenDialog = (q = null) => {
    if (q) {
      setEditingQuestion(q);
      setFormData({
        question: q.question,
        options: q.options || ['', '', '', ''],
        correctAnswer: q.correctAnswer,
        category: q.category || 'General',
        type: q.type || 'options',
        guideline: q.guideline || ''
      });
    } else {
      setEditingQuestion(null);
      setFormData({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        category: 'General',
        type: 'options',
        guideline: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingQuestion(null);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = async () => {
    try {
      if (editingQuestion) {
        await api.put(`/quiz/${editingQuestion._id}`, formData);
        toast.success('Question updated successfully');
      } else {
        await api.post('/quiz', formData);
        toast.success('Question added successfully');
      }
      handleCloseDialog();
      fetchQuestions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save question');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.delete(`/quiz/${id}`);
      toast.success('Question deleted successfully');
      fetchQuestions();
    } catch (error) {
      toast.error('Failed to delete question');
    }
  };

  if (loading && questions.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: colors.background }}>
        <CircularProgress sx={{ color: colors.primary }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: colors.background }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ color: colors.textPrimary, fontWeight: '900', letterSpacing: '-1px' }}>
            QUIZ <span style={{ color: colors.primary }}>MANAGEMENT</span>
          </Typography>
          <Typography variant="body2" sx={{ color: colors.textSecondary, mt: 0.5 }}>
            Configure and manage questions for field team assessments.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            bgcolor: colors.primary,
            fontWeight: 'bold',
            px: 3,
            py: 1,
            borderRadius: '8px',
            textTransform: 'none',
            boxShadow: `0 4px 14px 0 ${colors.primary}40`,
            '&:hover': { bgcolor: '#6a5acd', boxShadow: `0 6px 20px 0 ${colors.primary}60` }
          }}
        >
          Add Question
        </Button>
      </Stack>

      <TableContainer component={Paper} sx={{
        bgcolor: colors.surface,
        backgroundImage: 'none',
        border: `1px solid ${colors.border}`,
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}>
              <TableCell sx={{ color: colors.textSecondary, fontWeight: 'bold', borderBottom: `2px solid ${colors.border}` }}>Question</TableCell>
              <TableCell sx={{ color: colors.textSecondary, fontWeight: 'bold', borderBottom: `2px solid ${colors.border}` }}>Category</TableCell>
              <TableCell sx={{ color: colors.textSecondary, fontWeight: 'bold', borderBottom: `2px solid ${colors.border}` }}>Type</TableCell>
              <TableCell align="right" sx={{ color: colors.textSecondary, fontWeight: 'bold', borderBottom: `2px solid ${colors.border}` }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {questions.map((q) => (
              <TableRow key={q._id} sx={{
                '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                '& td': { borderBottom: `1px solid ${colors.border}` }
              }}>
                <TableCell sx={{ color: colors.textPrimary, maxWidth: '400px' }}>
                  <Typography variant="body2" sx={{
                    fontWeight: '500',
                    fontFamily: "'Inter', sans-serif",
                    direction: /[\u0600-\u06FF]/.test(q.question) ? 'rtl' : 'ltr',
                    textAlign: /[\u0600-\u06FF]/.test(q.question) ? 'right' : 'left'
                  }}>
                    {q.question}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={q.category || 'General'}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(123, 104, 238, 0.1)',
                      color: colors.primary,
                      fontWeight: 'bold',
                      border: `1px solid ${colors.primary}40`
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={q.type || 'options'}
                    size="small"
                    variant="outlined"
                    sx={{
                      color: q.type === 'essay' ? colors.secondary : colors.textSecondary,
                      borderColor: q.type === 'essay' ? `${colors.secondary}40` : colors.border
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="Edit">
                      <IconButton
                        onClick={() => handleOpenDialog(q)}
                        sx={{ color: colors.secondary, '&:hover': { bgcolor: `${colors.secondary}20` } }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        onClick={() => handleDelete(q._id)}
                        sx={{ color: colors.error, '&:hover': { bgcolor: `${colors.error}20` } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {questions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 10 }}>
                  <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                    No questions found. Add your first question to start!
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            bgcolor: '#121212',
            color: colors.textPrimary,
            backgroundImage: 'none',
            borderRadius: '20px',
            border: `1px solid ${colors.border}`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${colors.border}`, px: 4, py: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {editingQuestion ? 'Edit Question' : 'Add New Question'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          <Stack spacing={3} mt={1}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: colors.textSecondary, mb: 1, fontWeight: 'bold' }}>
                Question Text (Arabic Supported)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Enter question in Arabic or English..."
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                inputProps={{
                  dir: /[\u0600-\u06FF]/.test(formData.question) ? 'rtl' : 'ltr',
                  style: { textAlign: /[\u0600-\u06FF]/.test(formData.question) ? 'right' : 'left' }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.03)',
                    '& fieldset': { borderColor: colors.border },
                    '&:hover fieldset': { borderColor: colors.primary },
                    '&.Mui-focused fieldset': { borderColor: colors.primary },
                  },
                  input: { color: colors.textPrimary },
                  textarea: { color: colors.textPrimary }
                }}
              />
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                fullWidth
                label="Question Type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: colors.border },
                  },
                  '& .MuiInputLabel-root': { color: colors.textSecondary },
                }}
              >
                <MenuItem value="options">Multiple Choice</MenuItem>
                <MenuItem value="essay">Essay / Free Text</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: colors.border },
                  },
                  '& .MuiInputLabel-root': { color: colors.textSecondary },
                }}
              />
            </Stack>

            {formData.type === 'options' && (
              <Box>
                <Typography variant="subtitle2" sx={{ color: colors.textSecondary, mb: 2, fontWeight: 'bold' }}>
                  Options & Correct Answer
                </Typography>
                <Stack spacing={2}>
                  {formData.options.map((option, idx) => (
                    <Stack key={idx} direction="row" spacing={2} alignItems="center">
                      <TextField
                        fullWidth
                        placeholder={`Option ${idx + 1}`}
                        value={option}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        inputProps={{
                          dir: /[\u0600-\u06FF]/.test(option) ? 'rtl' : 'ltr',
                          style: { textAlign: /[\u0600-\u06FF]/.test(option) ? 'right' : 'left' }
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: 'rgba(255,255,255,0.02)',
                            '& fieldset': { borderColor: colors.border },
                          }
                        }}
                      />
                      <Button
                        variant={formData.correctAnswer === option && option !== '' ? "contained" : "outlined"}
                        onClick={() => setFormData({ ...formData, correctAnswer: option })}
                        disabled={option === ''}
                        sx={{
                          minWidth: '120px',
                          bgcolor: formData.correctAnswer === option && option !== '' ? colors.success : 'transparent',
                          color: formData.correctAnswer === option && option !== '' ? 'white' : colors.textSecondary,
                          borderColor: formData.correctAnswer === option && option !== '' ? colors.success : colors.border,
                          '&:hover': {
                            bgcolor: formData.correctAnswer === option && option !== '' ? colors.success : 'rgba(255,255,255,0.05)',
                          }
                        }}
                      >
                        {formData.correctAnswer === option && option !== '' ? 'Correct' : 'Mark Correct'}
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}

            {formData.type === 'essay' && (
              <TextField
                fullWidth
                label="Guideline / Hint (Optional)"
                placeholder="Enter any guidance for the team..."
                value={formData.guideline}
                onChange={(e) => setFormData({ ...formData, guideline: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: colors.border },
                  },
                }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 4, borderTop: `1px solid ${colors.border}`, gap: 2 }}>
          <Button onClick={handleCloseDialog} sx={{ color: colors.textSecondary, fontWeight: 'bold' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!formData.question || (formData.type === 'options' && (!formData.correctAnswer || formData.options.some(o => !o)))}
            sx={{
              bgcolor: colors.primary,
              fontWeight: 'bold',
              px: 4,
              '&:hover': { bgcolor: '#6a5acd' }
            }}
          >
            {editingQuestion ? 'Update Question' : 'Save Question'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuizManagement;
