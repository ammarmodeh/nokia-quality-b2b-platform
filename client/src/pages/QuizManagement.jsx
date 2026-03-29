import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  Grid,
  useTheme,
  useMediaQuery,
  Switch,
  FormControlLabel
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
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Drag and Drop type
const ItemTypes = {
  QUESTION: 'question',
};

// Draggable Row Component
const DraggableRow = ({ question, index, globalIndex, moveRow, handleOpenDialog, handleDelete, handleDuplicate, onSwapClick, colors }) => {
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
      <TableCell sx={{ color: colors.textSecondary, width: '40px' }}>
        <DragIcon sx={{ cursor: 'move', color: colors.textSecondary }} />
      </TableCell>
      {/* Order Badge */}
      <TableCell sx={{ width: '60px' }}>
        <Tooltip title={`Position ${globalIndex + 1} — Click to swap with another question`} placement="right">
          <Box
            onClick={() => onSwapClick(globalIndex)}
            sx={{
              cursor: 'pointer',
              width: 36, height: 36,
              borderRadius: '10px',
              bgcolor: 'rgba(123, 104, 238, 0.12)',
              border: '1.5px solid rgba(123, 104, 238, 0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: colors.primary, fontWeight: 'bold', fontSize: '13px',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(123, 104, 238, 0.28)',
                borderColor: colors.primary,
                transform: 'scale(1.08)'
              }
            }}
          >
            {globalIndex + 1}
          </Box>
        </Tooltip>
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [selectedQuizType, setSelectedQuizType] = useState('Performance');
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalCategories: 0,
    typeDistribution: [],
    categoryDistribution: []
  });

  // Frontend Pagination & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);

  // Swap Dialog State
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [swapSourceIndex, setSwapSourceIndex] = useState(null);
  const [swapSearchQuery, setSwapSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    question: '',
    questionImage: '',
    options: ['', '', '', ''],
    optionsImages: ['', '', '', ''],
    correctAnswer: '',
    category: '',
    type: 'options',
    guideline: '',
    showGuideline: false,
    quizType: 'Performance'
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
      const response = await api.get(`/quiz/questions?quizType=${selectedQuizType}`);
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
    setPage(1); // Reset page on type change
  }, [selectedQuizType]);

  // Derived filtered questions
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const questionText = q.question || '';
      const matchesSearch = questionText.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || q.category === categoryFilter;
      const matchesType = typeFilter === 'All' || (q.type || 'options') === typeFilter;
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [questions, searchQuery, categoryFilter, typeFilter]);

  // Is Drag & Drop enabled (only when no filters are active)
  const isDndEnabled = searchQuery === '' && categoryFilter === 'All' && typeFilter === 'All';

  // Derived paginated questions
  const paginatedQuestions = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return filteredQuestions.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredQuestions, page, rowsPerPage]);

  const handleDuplicate = async (questionToDuplicate) => {
    const duplicatedData = {
      question: `${questionToDuplicate.question} (Copy)`,
      questionImage: questionToDuplicate.questionImage,
      options: [...questionToDuplicate.options],
      optionsImages: questionToDuplicate.optionsImages ? [...questionToDuplicate.optionsImages] : undefined,
      correctAnswer: questionToDuplicate.correctAnswer,
      category: questionToDuplicate.category,
      type: questionToDuplicate.type,
      guideline: questionToDuplicate.guideline,
      showGuideline: questionToDuplicate.showGuideline || false,
      quizType: questionToDuplicate.quizType || selectedQuizType
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

  // Swap handlers
  const handleSwapClick = useCallback((globalIdx) => {
    setSwapSourceIndex(globalIdx);
    setSwapSearchQuery('');
    setSwapDialogOpen(true);
  }, []);

  const handleSwapConfirm = useCallback((targetGlobalIndex) => {
    if (targetGlobalIndex === swapSourceIndex) {
      setSwapDialogOpen(false);
      return;
    }
    setQuestions(prev => {
      const updated = [...prev];
      const temp = updated[swapSourceIndex];
      updated[swapSourceIndex] = updated[targetGlobalIndex];
      updated[targetGlobalIndex] = temp;
      return updated;
    });
    setSwapDialogOpen(false);
    toast.success(`Question #${swapSourceIndex + 1} swapped with #${targetGlobalIndex + 1}`);
  }, [swapSourceIndex]);

  // Drag and Drop Logic
  const moveRow = useCallback((dragIndex, hoverIndex) => {
    if (!isDndEnabled) return;

    const startIndex = (page - 1) * rowsPerPage;
    const actualDragIndex = startIndex + dragIndex;
    const actualHoverIndex = startIndex + hoverIndex;

    setQuestions((prevQuestions) => {
      const updatedQuestions = [...prevQuestions];
      const [movedRow] = updatedQuestions.splice(actualDragIndex, 1);
      updatedQuestions.splice(actualHoverIndex, 0, movedRow);
      return updatedQuestions;
    });
  }, [page, rowsPerPage, isDndEnabled]);

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
        guideline: q.guideline || '',
        showGuideline: q.showGuideline || false,
        quizType: q.quizType || 'Performance'
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
        guideline: '',
        showGuideline: false,
        quizType: selectedQuizType
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
    return <LoadingSpinner variant="page" />;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ minHeight: '100vh', bgcolor: colors.background }}>
        <Stack
          direction={isMobile ? "column" : "row"}
          justifyContent="space-between"
          alignItems={isMobile ? "flex-start" : "center"}
          spacing={isMobile ? 2 : 0}
          mb={4}
        >
          <Box>
            <Typography variant={isMobile ? "h5" : "h4"} sx={{ color: colors.textPrimary, fontWeight: '900', letterSpacing: '-1px' }}>
              QUIZ <span style={{ color: colors.primary }}>MANAGEMENT</span>
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textSecondary, mt: 0.5 }}>
              Configure, analyze, and reorder questions for field team assessments.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ bgcolor: 'rgba(255,255,255,0.05)', p: 0.5, borderRadius: '12px' }}>
            <Button
              size="small"
              onClick={() => setSelectedQuizType('Performance')}
              sx={{
                bgcolor: selectedQuizType === 'Performance' ? colors.primary : 'transparent',
                color: selectedQuizType === 'Performance' ? 'white' : colors.textSecondary,
                fontWeight: 'bold',
                '&:hover': { bgcolor: selectedQuizType === 'Performance' ? colors.primary : 'rgba(255,255,255,0.1)' }
              }}
            >
              Performance
            </Button>
            <Button
              size="small"
              onClick={() => setSelectedQuizType('IQ')}
              sx={{
                bgcolor: selectedQuizType === 'IQ' ? colors.primary : 'transparent',
                color: selectedQuizType === 'IQ' ? 'white' : colors.textSecondary,
                fontWeight: 'bold',
                '&:hover': { bgcolor: selectedQuizType === 'IQ' ? colors.primary : 'rgba(255,255,255,0.1)' }
              }}
            >
              IQ Test
            </Button>
          </Stack>
          <Stack direction={isMobile ? "column" : "row"} spacing={2} width={isMobile ? "100%" : "auto"}>
            <Button
              variant="outlined"
              startIcon={<UpdateIcon />}
              onClick={saveOrder}
              fullWidth={isMobile}
              size={isMobile ? "small" : "medium"}
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
              fullWidth={isMobile}
              size={isMobile ? "small" : "medium"}
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

        {/* Filter Toolbar */}
        <Box sx={{
          bgcolor: colors.surface,
          p: 2,
          mb: 3,
          borderRadius: '16px',
          border: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          alignItems: 'center'
        }}>
          <TextField
            placeholder="Search questions..."
            size="small"
            fullWidth
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            InputProps={{
              startAdornment: (
                <Box component="span" sx={{ mr: 1, color: colors.textSecondary, display: 'flex' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </Box>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.03)',
                '& fieldset': { borderColor: colors.border },
                '&:hover fieldset': { borderColor: colors.primary },
              },
              '& input': { color: colors.textPrimary }
            }}
          />
          <Stack direction="row" spacing={2} sx={{ minWidth: { md: '450px' }, width: { xs: '100%', md: 'auto' } }}>
            <TextField
              select
              label="Category"
              size="small"
              fullWidth
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.03)',
                  '& fieldset': { borderColor: colors.border },
                },
                '& .MuiInputLabel-root': { color: colors.textSecondary },
                '& .MuiSelect-select': { color: colors.textPrimary }
              }}
            >
              <MenuItem value="All">All Categories</MenuItem>
              <MenuItem value="General">General</MenuItem>
              {availableCategories.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Type"
              size="small"
              fullWidth
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.03)',
                  '& fieldset': { borderColor: colors.border },
                },
                '& .MuiInputLabel-root': { color: colors.textSecondary },
                '& .MuiSelect-select': { color: colors.textPrimary }
              }}
            >
              <MenuItem value="All">All Types</MenuItem>
              <MenuItem value="options">Multiple Choice</MenuItem>
              <MenuItem value="essay">Essay</MenuItem>
            </TextField>
          </Stack>
        </Box>

        <TableContainer component={Paper} sx={{
          bgcolor: colors.surface,
          backgroundImage: 'none',
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          overflow: 'auto',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}>
                <TableCell width="40" sx={{ borderBottom: `2px solid ${colors.border}` }}></TableCell>
                <TableCell width="60" sx={{ color: colors.textSecondary, fontWeight: 'bold', borderBottom: `2px solid ${colors.border}`, fontSize: '12px', letterSpacing: '0.08em' }}>ORDER</TableCell>
                <TableCell sx={{ color: colors.textSecondary, fontWeight: 'bold', borderBottom: `2px solid ${colors.border}` }}>Question</TableCell>
                <TableCell sx={{ color: colors.textSecondary, fontWeight: 'bold', borderBottom: `2px solid ${colors.border}` }}>Category</TableCell>
                <TableCell sx={{ color: colors.textSecondary, fontWeight: 'bold', borderBottom: `2px solid ${colors.border}` }}>Type</TableCell>
                <TableCell align="right" sx={{ color: colors.textSecondary, fontWeight: 'bold', borderBottom: `2px solid ${colors.border}` }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedQuestions.map((q, index) => {
                const globalIndex = questions.findIndex(fullQ => fullQ._id === q._id);
                return (
                  <DraggableRow
                    key={q._id}
                    index={index}
                    globalIndex={globalIndex}
                    question={q}
                    moveRow={moveRow}
                    handleOpenDialog={handleOpenDialog}
                    handleDelete={handleDelete}
                    handleDuplicate={handleDuplicate}
                    onSwapClick={handleSwapClick}
                    colors={colors}
                  />
                );
              })}
              {paginatedQuestions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                    <Typography variant="body1" sx={{ color: colors.textSecondary }}>
                      {questions.length === 0 ? 'No questions found. Add your first question to start!' : 'No questions match your filters.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {filteredQuestions.length > rowsPerPage && (
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', borderTop: `1px solid ${colors.border}` }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                  Showing {Math.min(filteredQuestions.length, (page - 1) * rowsPerPage + 1)}-{Math.min(filteredQuestions.length, page * rowsPerPage)} of {filteredQuestions.length}
                </Typography>
                <Box sx={{
                  '& .MuiPaginationItem-root': {
                    color: colors.textSecondary,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(123, 104, 238, 0.2)',
                      color: colors.primary,
                      fontWeight: 'bold'
                    },
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.05)'
                    }
                  }
                }}>
                  <Box component="nav">
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        sx={{ color: colors.textSecondary }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                      </IconButton>
                      <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                        <Typography sx={{ color: colors.textPrimary, fontWeight: 'bold' }}>
                          Page {page} of {Math.ceil(filteredQuestions.length / rowsPerPage)}
                        </Typography>
                      </Box>
                      <IconButton
                        disabled={page >= Math.ceil(filteredQuestions.length / rowsPerPage)}
                        onClick={() => setPage(page + 1)}
                        sx={{ color: colors.textSecondary }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </IconButton>
                    </Stack>
                  </Box>
                </Box>
              </Stack>
            </Box>
          )}
        </TableContainer>

        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          fullScreen
          // maxWidth="md"
          PaperProps={{
            sx: {
              bgcolor: '#121212',
              color: colors.textPrimary,
              backgroundImage: 'none',
              // borderRadius: '20px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }
          }}
        >
          <DialogTitle sx={{ borderBottom: `1px solid ${colors.border}`, px: 4, py: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'red' }}>
              !!! VERSION 5 - REFRESH IF YOU DONT SEE THIS !!!
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

              <TextField
                select
                fullWidth
                label="Quiz Type"
                value={formData.quizType}
                disabled={isViewMode}
                onChange={(e) => setFormData({ ...formData, quizType: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: colors.border },
                  },
                  '& .MuiInputLabel-root': { color: colors.textSecondary },
                }}
              >
                <MenuItem value="Performance">Performance Assessment</MenuItem>
                <MenuItem value="IQ">IQ Test</MenuItem>
              </TextField>

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

              <Box sx={{ border: '2px solid red', p: 2, borderRadius: '8px', mt: 2 }}>
                <Typography variant="caption" sx={{ color: 'red', fontWeight: 'bold', mb: 1, display: 'block' }}>
                  DEBUG: GUIDELINE CONTROL AREA
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <TextField
                    fullWidth
                    label="Guideline / Hint"
                    placeholder="Enter any guidance or hint for the team..."
                    value={formData.guideline}
                    onChange={(e) => setFormData({ ...formData, guideline: e.target.value })}
                    disabled={isViewMode}
                    multiline
                    rows={2}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: colors.border },
                      },
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.showGuideline}
                        onChange={(e) => setFormData({ ...formData, showGuideline: e.target.checked })}
                        disabled={isViewMode}
                        color="secondary"
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ color: colors.textSecondary, fontWeight: 'bold' }}>
                        Show Guideline in Quiz
                      </Typography>
                    }
                    sx={{ minWidth: '220px', ml: 0 }}
                  />
                </Stack>
              </Box>
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

        {/* ─── Swap Position Dialog ─── */}
        <Dialog
          open={swapDialogOpen}
          onClose={() => setSwapDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: '#121212',
              color: colors.textPrimary,
              backgroundImage: 'none',
              borderRadius: '20px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 25px 60px rgba(0,0,0,0.7)'
            }
          }}
        >
          <DialogTitle sx={{ borderBottom: `1px solid ${colors.border}`, px: 3, py: 2.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {/* swap icon */}
              <Box sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(123,104,238,0.15)', color: colors.primary, display: 'flex' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: colors.textPrimary, lineHeight: 1.2 }}>
                  Swap Question Order
                </Typography>
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                  {swapSourceIndex !== null ? `Moving #${swapSourceIndex + 1} — pick the question to swap with` : ''}
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>

          <DialogContent sx={{ p: 0 }}>
            {/* Source question preview */}
            {swapSourceIndex !== null && questions[swapSourceIndex] && (
              <Box sx={{ px: 3, pt: 2.5, pb: 2, bgcolor: 'rgba(123,104,238,0.06)', borderBottom: `1px solid ${colors.border}` }}>
                <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Selected (Position #{swapSourceIndex + 1})
                </Typography>
                <Typography variant="body2" sx={{
                  color: colors.textPrimary, mt: 0.5, fontWeight: '500',
                  direction: /[\u0600-\u06FF]/.test(questions[swapSourceIndex].question) ? 'rtl' : 'ltr',
                  textAlign: /[\u0600-\u06FF]/.test(questions[swapSourceIndex].question) ? 'right' : 'left',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                }}>
                  {questions[swapSourceIndex].question}
                </Typography>
              </Box>
            )}

            {/* Search */}
            <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${colors.border}` }}>
              <TextField
                placeholder="Search questions to swap with..."
                size="small"
                fullWidth
                autoFocus
                value={swapSearchQuery}
                onChange={(e) => setSwapSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Box component="span" sx={{ mr: 1, color: colors.textSecondary, display: 'flex' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </Box>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.04)',
                    '& fieldset': { borderColor: colors.border },
                    '&:hover fieldset': { borderColor: colors.primary },
                    '&.Mui-focused fieldset': { borderColor: colors.primary },
                  },
                  '& input': { color: colors.textPrimary }
                }}
              />
            </Box>

            {/* Questions list */}
            <Box sx={{ maxHeight: '380px', overflowY: 'auto', px: 1.5, py: 1 }}>
              {questions
                .map((q, idx) => ({ q, idx }))
                .filter(({ q, idx }) =>
                  idx !== swapSourceIndex &&
                  (q.question || '').toLowerCase().includes(swapSearchQuery.toLowerCase())
                )
                .map(({ q, idx }) => (
                  <Box
                    key={q._id}
                    onClick={() => handleSwapConfirm(idx)}
                    sx={{
                      p: 1.5,
                      mb: 0.5,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: '1px solid transparent',
                      display: 'flex',
                      gap: 1.5,
                      alignItems: 'flex-start',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        bgcolor: 'rgba(123,104,238,0.1)',
                        borderColor: 'rgba(123,104,238,0.4)'
                      }
                    }}
                  >
                    {/* Position badge */}
                    <Box sx={{
                      flexShrink: 0,
                      width: 34, height: 34,
                      borderRadius: '8px',
                      bgcolor: 'rgba(62,166,255,0.12)',
                      border: '1px solid rgba(62,166,255,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: colors.secondary, fontWeight: 'bold', fontSize: '13px'
                    }}>
                      {idx + 1}
                    </Box>
                    {/* Question content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{
                        color: colors.textPrimary, fontWeight: '500',
                        direction: /[\u0600-\u06FF]/.test(q.question) ? 'rtl' : 'ltr',
                        textAlign: /[\u0600-\u06FF]/.test(q.question) ? 'right' : 'left',
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden'
                      }}>
                        {q.question}
                      </Typography>
                      <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap">
                        {q.category && (
                          <Typography variant="caption" sx={{ color: colors.primary }}>
                            {q.category}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                          {q.type === 'essay' ? 'Essay' : 'Multiple Choice'}
                        </Typography>
                      </Stack>
                    </Box>
                    {/* Swap arrow hint */}
                    <Box sx={{ flexShrink: 0, color: 'rgba(123,104,238,0.4)', display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </Box>
                  </Box>
                ))}
              {questions.filter((q, idx) =>
                idx !== swapSourceIndex &&
                (q.question || '').toLowerCase().includes(swapSearchQuery.toLowerCase())
              ).length === 0 && (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: colors.textSecondary }}>No questions found matching your search.</Typography>
                </Box>
              )}
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${colors.border}` }}>
            <Button onClick={() => setSwapDialogOpen(false)} sx={{ color: colors.textSecondary, fontWeight: 'bold' }}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </DndProvider>
  );
};

export default QuizManagement;
