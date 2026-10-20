import DataMenu from "../components/dataio/DataMenu";
import PageHeader from "../components/ui/PageHeader";
import SectionCard from "../components/ui/SectionCard";
import StatCard from "../components/ui/StatCard";
import FilterChip from "../components/ui/FilterChip";
import Badge from "../components/ui/Badge";
import BulkBar from "../components/ui/BulkBar";
import EmptyState from "../components/ui/EmptyState";
import AppDialog from "../components/ui/AppDialog";
import SafeDeleteDialog from "../components/ui/SafeDeleteDialog";
import { bulkDelete, DELETE_PATHS } from "../api/bulkDelete";
import { exportRows } from "../utils/exportRows";
import SearchIcon from "@mui/icons-material/Search";
import InputBase from "@mui/material/InputBase";
import Checkbox from "@mui/material/Checkbox";
import TablePagination from "@mui/material/TablePagination";
import Sheet from "../components/ui/Sheet";
import SegmentedControl from "../components/ui/SegmentedControl";
import { tok } from "../theme/tokens";
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Stack,
  Tooltip,
  MenuItem,
  Autocomplete,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  DragIndicator as DragIcon,
  Update as UpdateIcon,
  ContentCopy as DuplicateIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import api from '../api/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Every field of a question, for exports and the backup before a permanent delete.
const QUESTION_COLUMNS = [
  ['Order', (q) => q.order ?? ''],
  ['Quiz', (q) => q.quizType || 'Performance'],
  ['Type', (q) => q.type || 'options'],
  ['Category', (q) => q.category || ''],
  ['Question', (q) => q.question],
  ['Options', (q) => (q.options || []).join(' | ')],
  ['Correct answer', (q) => q.correctAnswer || ''],
  ['Guideline', (q) => q.guideline || ''],
  ['Show guideline', (q) => (q.showGuideline ? 'yes' : 'no')],
  ['Has image', (q) => (q.questionImage ? 'yes' : 'no')],
  ['Record ID', (q) => q._id],
];

// Drag and Drop type
const ItemTypes = {
  QUESTION: 'question',
};

// Draggable Row Component
const isArabic = (t) => /[؀-ۿ]/.test(t || '');
const DraggableRow = ({ question, index, globalIndex, moveRow, handleOpenDialog, handleDelete, handleDuplicate, onSwapClick, selected, onToggle, canDrag }) => {
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
    canDrag,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <TableRow
      ref={ref}
      data-handler-id={handlerId}
      hover
      selected={selected}
      sx={{ opacity: isDragging ? 0.5 : 1, '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: 'var(--accent-subtle)' } }}
    >
      <TableCell padding="checkbox">
        <Checkbox size="small" checked={selected} onChange={() => onToggle(question._id)} slotProps={{ input: { 'aria-label': `Select question ${globalIndex + 1}` } }} />
      </TableCell>
      <TableCell sx={{ width: 36, px: 0.5 }}>
        <Tooltip title={canDrag ? 'Drag to reorder' : 'Clear filters to drag'}>
          <DragIcon sx={{ fontSize: 18, cursor: canDrag ? 'grab' : 'not-allowed', color: 'var(--text-muted)' }} />
        </Tooltip>
      </TableCell>
      <TableCell sx={{ width: 64 }}>
        <Tooltip title="Swap position with another question">
          <Box
            component="button"
            type="button"
            onClick={() => onSwapClick(globalIndex)}
            aria-label={`Position ${globalIndex + 1}, swap`}
            sx={{ width: 30, height: 26, borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', font: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', fontVariantNumeric: 'tabular-nums', '&:hover': { borderColor: 'var(--accent)', color: 'var(--accent-text)' } }}
          >
            {globalIndex + 1}
          </Box>
        </Tooltip>
      </TableCell>
      <TableCell sx={{ maxWidth: 480 }}>
        <Typography dir={isArabic(question.question) ? 'rtl' : 'ltr'} sx={{ fontSize: 13, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {question.question}
        </Typography>
        {question.questionImage && <Typography sx={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Has image</Typography>}
      </TableCell>
      <TableCell><Badge outline>{question.category || 'General'}</Badge></TableCell>
      <TableCell><Badge tone={question.type === 'essay' ? 'info' : 'neutral'}>{question.type === 'essay' ? 'Essay' : 'Multiple choice'}</Badge></TableCell>
      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        <Tooltip title="View"><IconButton size="small" aria-label="View question" onClick={() => handleOpenDialog(question, true)}><ViewIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Edit"><IconButton size="small" aria-label="Edit question" onClick={() => handleOpenDialog(question)}><EditIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Duplicate"><IconButton size="small" aria-label="Duplicate question" onClick={() => handleDuplicate(question)}><DuplicateIcon fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="Delete permanently…"><IconButton size="small" aria-label="Delete question" onClick={() => handleDelete(question._id)} sx={{ color: 'var(--danger)' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
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
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selection, setSelection] = useState([]);
  const [deleting, setDeleting] = useState(null); // questions to delete permanently
  const [savingOrder, setSavingOrder] = useState(false);

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
    surface: tok('--surface'),
    border: tok('--border'),
    primary: tok('--accent'),
    secondary: tok('--info'),
    textPrimary: tok('--text'),
    textSecondary: tok('--text-secondary'),
    error: tok('--danger'),
    success: tok('--success'),
    chartColors: ['#6C47FF', '#2563EB', '#DC2626', '#16A34A', '#D97706', '#6C47FF']
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
    setSavingOrder(true);
    try {
      const orderPayload = questions.map((q, index) => ({ _id: q._id, order: index }));
      await api.put('/quiz/reorder', { questions: orderPayload });
      toast.success('Question order saved');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Couldn’t save the order');
    } finally {
      setSavingOrder(false);
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

  const handleDelete = (id) => {
    const q = questions.find((x) => x._id === id);
    if (q) setDeleting([q]);
  };
  const selectedQuestions = questions.filter((q) => selection.includes(q._id));
  const swapCandidates = questions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q, idx }) => idx !== swapSourceIndex && (q.question || '').toLowerCase().includes(swapSearchQuery.toLowerCase()));

  if (loading && questions.length === 0) {
    return <LoadingSpinner variant="page" />;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Box>
        <PageHeader
          title="Manage Quiz"
          description="Question bank for the field-team technical assessment: edit, reorder and review analytics."
          actions={
            <>
              <DataMenu entity="quiz" viewRows={questions} filename="quiz-questions" onImported={fetchQuestions} />
              <Button variant="outlined" startIcon={<UpdateIcon sx={{ fontSize: 16 }} />} onClick={saveOrder} disabled={savingOrder}>{savingOrder ? 'Saving…' : 'Save order'}</Button>
              <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 18 }} />} onClick={() => handleOpenDialog()}>Add question</Button>
            </>
          }
        />

        {/* Analytics */}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1.5fr 1.5fr' }, mb: 2 }}>
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            <StatCard label="Questions" value={stats.totalQuestions} hint={selectedQuizType === 'IQ' ? 'IQ test' : 'Performance quiz'} />
            <StatCard label="Categories" value={stats.totalCategories} />
          </Box>
          <SectionCard title="Question types" bodySx={{ p: 2 }}>
            <Box sx={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.typeDistribution} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke={colors.textSecondary} width={100} tick={{ fontSize: 12 }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)', borderRadius: 8 }} itemStyle={{ color: 'var(--text)' }} cursor={{ fill: 'var(--overlay-subtle)' }} />
                  <Bar dataKey="value" fill={colors.primary} radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </SectionCard>
          <SectionCard title="Categories" bodySx={{ p: 2 }}>
            <Box sx={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.categoryDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                    {stats.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors.chartColors[index % colors.chartColors.length]} stroke="rgba(0,0,0,0)" />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)', borderRadius: 8 }} itemStyle={{ color: 'var(--text)' }} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </SectionCard>
        </Box>

        {/* Toolbar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
          <SegmentedControl ariaLabel="Quiz type" value={selectedQuizType} onChange={(v) => { setSelectedQuizType(v); setSelection([]); }} options={[{ value: 'Performance', label: 'Performance' }, { value: 'IQ', label: 'IQ test' }]} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 32, px: 1.25, width: { xs: '100%', sm: 260 }, mx: { sm: 0.5 }, borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', boxShadow: 'var(--shadow-xs)', '&:focus-within': { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-ring)' } }}>
            <SearchIcon sx={{ fontSize: 17, color: 'var(--text-muted)' }} />
            <InputBase value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} placeholder="Search questions…" inputProps={{ 'aria-label': 'Search questions' }} sx={{ flex: 1, fontSize: 13 }} />
          </Box>
          <FilterChip label="Category" single searchable options={['General', ...availableCategories.filter((c) => c !== 'General')].map((c) => ({ value: c, label: c }))} value={categoryFilter === 'All' ? [] : [categoryFilter]} onChange={(v) => { setCategoryFilter(v[0] || 'All'); setPage(1); }} />
          <FilterChip label="Type" single options={[{ value: 'options', label: 'Multiple choice' }, { value: 'essay', label: 'Essay' }]} value={typeFilter === 'All' ? [] : [typeFilter]} onChange={(v) => { setTypeFilter(v[0] || 'All'); setPage(1); }} />
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {filteredQuestions.length} of {questions.length} questions{isDndEnabled ? ' · drag rows to reorder' : ''}
          </Typography>
        </Box>

        {selectedQuestions.length > 0 && (
          <BulkBar
            count={selectedQuestions.length}
            onExport={() => exportRows(selectedQuestions, QUESTION_COLUMNS, { filename: 'quiz-questions-selected' })}
            onDelete={() => setDeleting(selectedQuestions)}
            onClear={() => setSelection([])}
          />
        )}

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={paginatedQuestions.length > 0 && paginatedQuestions.every((q) => selection.includes(q._id))}
                    indeterminate={paginatedQuestions.some((q) => selection.includes(q._id)) && !paginatedQuestions.every((q) => selection.includes(q._id))}
                    onChange={(e) => setSelection((s) => (e.target.checked ? [...new Set([...s, ...paginatedQuestions.map((q) => q._id)])] : s.filter((id) => !paginatedQuestions.some((q) => q._id === id))))}
                    slotProps={{ input: { 'aria-label': 'Select all on this page' } }}
                  />
                </TableCell>
                <TableCell />
                <TableCell>#</TableCell>
                <TableCell>Question</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedQuestions.map((q, index) => {
                const globalIndex = questions.findIndex((fullQ) => fullQ._id === q._id);
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
                    selected={selection.includes(q._id)}
                    onToggle={(id) => setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
                    canDrag={isDndEnabled}
                  />
                );
              })}
              {paginatedQuestions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ border: 0 }}>
                    <EmptyState
                      title={questions.length === 0 ? 'No questions yet' : 'No questions match'}
                      description={questions.length === 0 ? 'Add the first question or import a sheet.' : 'Try another category or clear the search.'}
                      minHeight={200}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={filteredQuestions.length}
            page={Math.max(0, page - 1)}
            onPageChange={(_e, p) => setPage(p + 1)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(1); }}
            sx={{ borderTop: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          />
        </TableContainer>

        <Sheet
          open={openDialog}
          onClose={handleCloseDialog}
          width={680}
          title={isViewMode ? 'Question preview' : editingQuestion ? 'Edit question' : 'New question'}
          description={`${formData.quizType === 'IQ' ? 'IQ test' : 'Performance quiz'} · ${formData.type === 'essay' ? 'Essay' : 'Multiple choice'}${formData.category ? ` · ${formData.category}` : ''}`}
          footer={
            <>
              <Button variant="outlined" onClick={handleCloseDialog}>{isViewMode ? 'Close' : 'Cancel'}</Button>
              {!isViewMode && (
                <Button
                  onClick={handleSubmit}
                  variant="contained"
                  startIcon={<SaveIcon sx={{ fontSize: 17 }} />}
                  disabled={!formData.question || (formData.type === 'options' && (!formData.correctAnswer || formData.options.some(o => !o)))}
                >
                  {editingQuestion ? 'Update question' : 'Save question'}
                </Button>
              )}
            </>
          }
        >
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" sx={{ color: colors.textSecondary, mb: 1, fontWeight: '600' }}>
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
                />
              </Stack>

              <TextField
                select
                fullWidth
                label="Quiz Type"
                value={formData.quizType}
                disabled={isViewMode}
                onChange={(e) => setFormData({ ...formData, quizType: e.target.value })}
              >
                <MenuItem value="Performance">Performance Assessment</MenuItem>
                <MenuItem value="IQ">IQ Test</MenuItem>
              </TextField>

              {formData.type === 'options' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ color: colors.textSecondary, mb: 2, fontWeight: '600' }}>
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

              <Box>
                <Typography variant="subtitle2" sx={{ color: colors.textSecondary, mb: 1, fontWeight: '600' }}>
                  Guideline
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
                      <Typography variant="body2" sx={{ color: colors.textSecondary, fontWeight: '600' }}>
                        Show Guideline in Quiz
                      </Typography>
                    }
                    sx={{ minWidth: '220px', ml: 0 }}
                  />
                </Stack>
              </Box>
            </Stack>
        </Sheet>

        {/* Swap position */}
        <AppDialog
          open={swapDialogOpen}
          onClose={() => setSwapDialogOpen(false)}
          size="sm"
          title="Swap question order"
          description={swapSourceIndex !== null ? `Pick the question to swap with #${swapSourceIndex + 1}. Save order afterwards to keep it.` : ''}
          actions={<Button variant="outlined" onClick={() => setSwapDialogOpen(false)}>Cancel</Button>}
          bodySx={{ p: 0 }}
        >
          {swapSourceIndex !== null && questions[swapSourceIndex] && (
            <Box sx={{ px: 2.5, py: 1.5, backgroundColor: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
              <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>Moving #{swapSourceIndex + 1}</Typography>
              <Typography dir={isArabic(questions[swapSourceIndex].question) ? 'rtl' : 'ltr'} sx={{ fontSize: 13, mt: 0.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {questions[swapSourceIndex].question}
              </Typography>
            </Box>
          )}
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid var(--border)' }}>
            <TextField fullWidth autoFocus placeholder="Search questions…" value={swapSearchQuery} onChange={(e) => setSwapSearchQuery(e.target.value)} slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: 17, color: 'var(--text-muted)', mr: 0.75 }} /> } }} />
          </Box>
          <Box sx={{ maxHeight: 380, overflowY: 'auto', p: 1 }}>
            {swapCandidates.map(({ q, idx }) => (
              <Box
                key={q._id}
                component="button"
                type="button"
                onClick={() => handleSwapConfirm(idx)}
                sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', width: '100%', textAlign: 'left', font: 'inherit', p: 1, borderRadius: '6px', border: 0, background: 'none', cursor: 'pointer', '&:hover': { backgroundColor: 'var(--surface-hover)' } }}
              >
                <Box sx={{ flexShrink: 0, width: 30, height: 24, borderRadius: '6px', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{idx + 1}</Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography dir={isArabic(q.question) ? 'rtl' : 'ltr'} sx={{ fontSize: 13, color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.question}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{[q.category, q.type === 'essay' ? 'Essay' : 'Multiple choice'].filter(Boolean).join(' · ')}</Typography>
                </Box>
              </Box>
            ))}
            {swapCandidates.length === 0 && <EmptyState title="No questions match" minHeight={140} />}
          </Box>
        </AppDialog>

        <SafeDeleteDialog
          open={Boolean(deleting)}
          onClose={() => setDeleting(null)}
          records={deleting || []}
          noun={{ one: 'question', many: 'questions' }}
          nameOf={(q) => `#${questions.findIndex((x) => x._id === q._id) + 1} · ${q.question}`}
          exportColumns={QUESTION_COLUMNS}
          exportFilename="quiz-questions"
          onDelete={(list) => bulkDelete(DELETE_PATHS.quiz, list.map((q) => q._id))}
          onDeleted={({ deleted }) => {
            setSelection((s) => s.filter((id) => !deleted.includes(id)));
            fetchQuestions();
          }}
        />
      </Box>
    </DndProvider>
  );
};

export default QuizManagement;
