import { useEffect, useState, useCallback, useRef } from 'react';
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
  Autocomplete,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  DragIndicator as DragIcon,
  Category as CategoryIcon,
  Quiz as QuizIcon,
  Update as UpdateIcon,
  ContentCopy as DuplicateIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { toast } from 'sonner';
import api from '../api/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Drag and Drop type
const ItemTypes = {
  QUESTION: 'question',
};

// Draggable Row Component
const DraggableRow = ({ question, index, moveRow, handleOpenDialog, handleDelete, handleDuplicate, colors }) => {
  const ref = useRef(null);
  const [{ handlerId }, drop] = useDrop({
    accept: ItemTypes.QUESTION,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveRow(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.QUESTION,
    item: () => ({ id: question._id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <TableRow
      ref={ref}
      data-handler-id={handlerId}
      sx={{
        bgcolor: isDragging ? 'rgba(255,255,255,0.05)' : 'inherit',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
        '& td': { borderBottom: `1px solid ${colors.border}` },
        cursor: 'move',
        opacity: isDragging ? 0.5 : 1
      }}
    >
      <TableCell sx={{ color: colors.textSecondary }}>
        <DragIcon sx={{ cursor: 'move', color: colors.textSecondary }} />
      </TableCell>
      <TableCell sx={{ color: colors.textPrimary, maxWidth: '400px' }}>
        <Typography variant="body2" sx={{
          fontWeight: '500',
          fontFamily: "'Inter', sans-serif",
          direction: /[\u0600-\u06FF]/.test(question.question) ? 'rtl' : 'ltr',
          textAlign: /[\u0600-\u06FF]/.test(question.question) ? 'right' : 'left'
        }}>
          {question.question}
          {question.questionImage && (
            <Tooltip title="Has Image">
              <Box component="span" sx={{ verticalAlign: 'middle', ml: 1, color: colors.primary, display: 'inline-flex' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>
              </Box>
            </Tooltip>
          )}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={question.category || 'General'}
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
          label={question.type || 'options'}
          size="small"
          variant="outlined"
          sx={{
            color: question.type === 'essay' ? colors.secondary : colors.textSecondary,
            borderColor: question.type === 'essay' ? `${colors.secondary}40` : colors.border
          }}
        />
      </TableCell>
      <TableCell align="right">
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Tooltip title="Duplicate">
            <IconButton
              onClick={() => handleDuplicate(question)}
              sx={{ color: colors.secondary, '&:hover': { bgcolor: `${colors.secondary}20` } }}
            >
              <DuplicateIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="View">
            <IconButton
              onClick={() => handleOpenDialog(question, true)}
              sx={{ color: colors.textSecondary, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              onClick={() => handleOpenDialog(question)}
              sx={{ color: colors.secondary, '&:hover': { bgcolor: `${colors.secondary}20` } }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              onClick={() => handleDelete(question._id)}
              sx={{ color: colors.error, '&:hover': { bgcolor: `${colors.error}20` } }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </TableCell>
    </TableRow>
  );
};

const QuizManagement = () => {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalCategories: 0,
    typeDistribution: [],
    categoryDistribution: []
  });

  const [formData, setFormData] = useState({
    question: '',
    questionImage: '',
    options: ['', '', '', ''],
    optionsImages: ['', '', '', ''],
    correctAnswer: '',
    category: '',
    type: 'options',
    guideline: ''
  });

  const handleImageUpload = (e, target, index = null) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024 * 2) { // 2MB limit
        toast.error('Image size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'question') {
          setFormData(prev => ({ ...prev, questionImage: reader.result }));
        } else if (target === 'option' && index !== null) {
          const newOptionImages = [...formData.optionsImages];
          newOptionImages[index] = reader.result;
          setFormData(prev => ({ ...prev, optionsImages: newOptionImages }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

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
    chartColors: ['#7b68ee', '#3ea6ff', '#ff4d4d', '#4caf50', '#ffa726', '#ba68c8']
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/quiz/questions');
      const data = response.data;
      setQuestions(data);

      // Extract unique categories
      const categories = [...new Set(data.map(q => q.category).filter(Boolean))];
      setAvailableCategories(categories);

      // Calculate Statistics
      const typeCounts = { options: 0, essay: 0 };
      const catCounts = {};

      data.forEach(q => {
        typeCounts[q.type || 'options'] = (typeCounts[q.type || 'options'] || 0) + 1;
        const cat = q.category || 'General';
        catCounts[cat] = (catCounts[cat] || 0) + 1;
      });

      setStats({
        totalQuestions: data.length,
        totalCategories: categories.length,
        typeDistribution: [
          { name: 'Multiple Choice', value: typeCounts.options },
          { name: 'Essay', value: typeCounts.essay }
        ],
        categoryDistribution: Object.entries(catCounts).map(([name, value]) => ({ name, value }))
      });

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

  const handleDuplicate = async (questionToDuplicate) => {
    const duplicatedData = {
      question: `${questionToDuplicate.question} (Copy)`,
      questionImage: questionToDuplicate.questionImage,
      options: [...questionToDuplicate.options],
      optionsImages: questionToDuplicate.optionsImages ? [...questionToDuplicate.optionsImages] : undefined,
      correctAnswer: questionToDuplicate.correctAnswer,
      category: questionToDuplicate.category,
      type: questionToDuplicate.type,
      guideline: questionToDuplicate.guideline
    };

    try {
      await api.post('/quiz', duplicatedData);
      toast.success('Question duplicated successfully');
      fetchQuestions();
    } catch (error) {
      console.error(error);
      toast.error('Failed to duplicate question');
    }
  };

  // Drag and Drop Logic
  const moveRow = useCallback((dragIndex, hoverIndex) => {
    setQuestions((prevQuestions) => {
      const updatedQuestions = [...prevQuestions];
      const [movedRow] = updatedQuestions.splice(dragIndex, 1);
      updatedQuestions.splice(hoverIndex, 0, movedRow);
      return updatedQuestions;
    });
  }, []);

  const saveOrder = async () => {
    try {
      const orderPayload = questions.map((q, index) => ({ _id: q._id, order: index }));
      await api.put('/quiz/reorder', { questions: orderPayload });
      toast.success('Question order saved');
    } catch (error) {
      toast.error('Failed to save order');
    }
  };

  const handleOpenDialog = (q = null, viewOnly = false) => {
    setIsViewMode(viewOnly);
    if (q) {
      setEditingQuestion(q);
      setFormData({
        question: q.question,
        questionImage: q.questionImage || '',
        options: q.options && q.options.length > 0 ? q.options : ['', ''],
        optionsImages: q.optionsImages && q.optionsImages.length > 0 ? q.optionsImages : (q.options ? new Array(q.options.length).fill('') : ['', '']),
        correctAnswer: q.correctAnswer,
        category: q.category || '',
        type: q.type || 'options',
        guideline: q.guideline || ''
      });
    } else {
      setEditingQuestion(null);
      setFormData({
        question: '',
        questionImage: '',
        options: ['', ''],
        optionsImages: ['', ''],
        correctAnswer: '',
        category: '',
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

  const handleAddOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, ''],
      optionsImages: [...formData.optionsImages, '']
    });
  };

  const handleRemoveOption = (indexToRemove) => {
    if (formData.options.length <= 2) {
      toast.error('At least 2 options are required');
      return;
    }

    // Check if the removed option was the correct answer
    const isCorrectAnswer = formData.options[indexToRemove] === formData.correctAnswer;

    const newOptions = formData.options.filter((_, idx) => idx !== indexToRemove);
    const newOptionsImages = formData.optionsImages.filter((_, idx) => idx !== indexToRemove);

    setFormData({
      ...formData,
      options: newOptions,
      optionsImages: newOptionsImages,
      correctAnswer: isCorrectAnswer ? '' : formData.correctAnswer // Reset if we deleted the correct answer
    });
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
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: colors.background }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" sx={{ color: colors.textPrimary, fontWeight: '900', letterSpacing: '-1px' }}>
              QUIZ <span style={{ color: colors.primary }}>MANAGEMENT</span>
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary, mt: 0.5 }}>
              Configure, analyze, and reorder questions for field team assessments.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<UpdateIcon />}
              onClick={saveOrder}
              sx={{
                borderColor: colors.border,
                color: colors.textSecondary,
                fontWeight: 'bold',
                textTransform: 'none',
                '&:hover': { borderColor: colors.primary, color: colors.primary }
              }}
            >
              Save Order
            </Button>
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
        </Stack>

        {/* Analytics Dashboard */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 4 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: colors.textSecondary }}>Total Questions</Typography>
                    <Typography variant="h3" sx={{ color: colors.textPrimary, fontWeight: 'bold' }}>{stats.totalQuestions}</Typography>
                  </Box>
                  <Box sx={{ p: 2, borderRadius: '50%', bgcolor: 'rgba(123, 104, 238, 0.1)', color: colors.primary }}>
                    <QuizIcon fontSize="large" />
                  </Box>
                </CardContent>
              </Card>
              <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 4 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: colors.textSecondary }}>Categories</Typography>
                    <Typography variant="h3" sx={{ color: colors.textPrimary, fontWeight: 'bold' }}>{stats.totalCategories}</Typography>
                  </Box>
                  <Box sx={{ p: 2, borderRadius: '50%', bgcolor: 'rgba(62, 166, 255, 0.1)', color: colors.secondary }}>
                    <CategoryIcon fontSize="large" />
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 4, height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ color: colors.textPrimary, mb: 2, fontWeight: 'bold' }}>Question Types</Typography>
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.typeDistribution} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" stroke={colors.textSecondary} width={100} tick={{ fontSize: 12 }} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar dataKey="value" fill={colors.primary} radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 4, height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ color: colors.textPrimary, mb: 2, fontWeight: 'bold' }}>Category Distribution</Typography>
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.categoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colors.chartColors[index % colors.chartColors.length]} stroke="rgba(0,0,0,0)" />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

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
                <TableCell width="50" sx={{ color: colors.textSecondary, fontWeight: 'bold', borderBottom: `2px solid ${colors.border}` }}></TableCell>
                <TableCell sx={{ color: colors.textSecondary, fontWeight: 'bold', borderBottom: `2px solid ${colors.border}` }}>Question</TableCell>
                <TableCell sx={{ color: colors.textSecondary, fontWeight: 'bold', borderBottom: `2px solid ${colors.border}` }}>Category</TableCell>
                <TableCell sx={{ color: colors.textSecondary, fontWeight: 'bold', borderBottom: `2px solid ${colors.border}` }}>Type</TableCell>
                <TableCell align="right" sx={{ color: colors.textSecondary, fontWeight: 'bold', borderBottom: `2px solid ${colors.border}` }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {questions.map((q, index) => (
                <DraggableRow
                  key={q._id}
                  index={index}
                  question={q}
                  moveRow={moveRow}
                  handleOpenDialog={handleOpenDialog}
                  handleDelete={handleDelete}
                  handleDuplicate={handleDuplicate}
                  colors={colors}
                />
              ))}
              {questions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
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
              {isViewMode ? 'View Question' : (editingQuestion ? 'Edit Question' : 'Add New Question')}
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
                    readOnly: isViewMode,
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

              <Box>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<AddIcon />}
                  disabled={isViewMode}
                  sx={{ mb: 2, borderColor: colors.border, color: colors.textSecondary, display: isViewMode ? 'none' : 'inline-flex' }}
                >
                  Upload Question Image
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'question')}
                  />
                </Button>
                {formData.questionImage && (
                  <Box sx={{ mt: 1, position: 'relative', width: 'fit-content' }}>
                    <img src={formData.questionImage} alt="Question Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: `1px solid ${colors.border}` }} />
                    <IconButton
                      size="small"
                      onClick={() => setFormData({ ...formData, questionImage: '' })}
                      sx={{ position: 'absolute', top: -10, right: -10, bgcolor: colors.surface, border: `1px solid ${colors.border}`, '&:hover': { bgcolor: colors.error }, display: isViewMode ? 'none' : 'flex' }}
                    >
                      <DeleteIcon fontSize="small" color="error" />
                    </IconButton>
                  </Box>
                )}
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  fullWidth
                  label="Question Type"
                  value={formData.type}
                  disabled={isViewMode}
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

                <Autocomplete
                  freeSolo
                  fullWidth
                  disabled={isViewMode}
                  options={availableCategories}
                  value={formData.category}
                  onChange={(event, newValue) => {
                    setFormData({ ...formData, category: newValue || '' });
                  }}
                  onInputChange={(event, newInputValue) => {
                    if (event?.type === 'change') {
                      setFormData({ ...formData, category: newInputValue || '' });
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Category"
                      placeholder="Select or type a category..."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: colors.border },
                        },
                        '& .MuiInputLabel-root': { color: colors.textSecondary },
                      }}
                    />
                  )}
                  sx={{
                    '& .MuiAutocomplete-popupIndicator': { color: colors.textSecondary },
                    '& .MuiAutocomplete-clearIndicator': { color: colors.textSecondary },
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
                      <Stack key={idx} direction="column" spacing={1} sx={{ width: '100%' }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <TextField
                            fullWidth
                            placeholder={`Option ${idx + 1}`}
                            value={option}
                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                            inputProps={{
                              readOnly: isViewMode,
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
                          <Tooltip title="Upload Option Image">
                            <Box component="span" sx={{ display: isViewMode ? 'none' : 'block' }}>
                              <IconButton
                                component="label"
                                sx={{ color: formData.optionsImages[idx] ? colors.primary : colors.textSecondary }}
                              >
                                <input
                                  type="file"
                                  hidden
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(e, 'option', idx)}
                                />
                                <AddIcon />
                              </IconButton>
                            </Box>
                          </Tooltip>

                          <Button
                            variant={formData.correctAnswer === option && option !== '' ? "contained" : "outlined"}
                            onClick={() => setFormData({ ...formData, correctAnswer: option })}
                            disabled={option === '' || isViewMode}
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

                          <Tooltip title="Remove Option">
                            <span>
                              <IconButton
                                onClick={() => handleRemoveOption(idx)}
                                disabled={formData.options.length <= 2 || isViewMode}
                                sx={{
                                  color: colors.error,
                                  opacity: (formData.options.length <= 2 || isViewMode) ? 0.3 : 1,
                                  '&:hover': { bgcolor: `${colors.error}20` },
                                  display: isViewMode ? 'none' : 'flex'
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                        {formData.optionsImages[idx] && (
                          <Box sx={{ mt: 1, position: 'relative', width: 'fit-content' }}>
                            <img src={formData.optionsImages[idx]} alt={`Option ${idx + 1} Preview`} style={{ maxHeight: '100px', maxWidth: '100px', borderRadius: '8px', border: `1px solid ${colors.border}` }} />
                            <IconButton
                              size="small"
                              onClick={() => {
                                const newOptionImages = [...formData.optionsImages];
                                newOptionImages[idx] = '';
                                setFormData(prev => ({ ...prev, optionsImages: newOptionImages }));
                              }}
                              sx={{ position: 'absolute', top: -10, right: -10, bgcolor: colors.surface, border: `1px solid ${colors.border}`, '&:hover': { bgcolor: colors.error }, display: isViewMode ? 'none' : 'flex' }}
                            >
                              <DeleteIcon fontSize="small" color="error" />
                            </IconButton>
                          </Box>
                        )}
                      </Stack>
                    ))}

                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleAddOption}
                      disabled={isViewMode}
                      sx={{
                        mt: 1,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                        borderStyle: 'dashed',
                        '&:hover': { borderColor: colors.primary, color: colors.primary },
                        display: isViewMode ? 'none' : 'flex'
                      }}
                    >
                      Add Option
                    </Button>
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
              {isViewMode ? 'Close' : 'Cancel'}
            </Button>
            {!isViewMode && (
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
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </DndProvider>
  );
};

export default QuizManagement;
