import { useState, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
    Stack,
    useMediaQuery
} from '@mui/material';
import { MdClose, MdFileDownload } from 'react-icons/md';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const TrendTasksDialog = ({ open, onClose, entityName, entityData, analysisType, period }) => {
    const isMobile = useMediaQuery('(max-width:600px)');
    const [selectedPeriod, setSelectedPeriod] = useState('all');

    // Get tasks to display based on selected period
    const tasksToDisplay = useMemo(() => {
        if (!entityData) return [];

        if (selectedPeriod === 'all') {
            return entityData.allTasks || [];
        }

        return entityData.tasks[selectedPeriod] || [];
    }, [entityData, selectedPeriod]);

    // Get available periods
    const availablePeriods = useMemo(() => {
        if (!entityData || !entityData.tasks) return [];
        return Object.keys(entityData.tasks).filter(key => entityData.tasks[key].length > 0);
    }, [entityData]);

    const handlePeriodChange = (event, newPeriod) => {
        if (newPeriod !== null) setSelectedPeriod(newPeriod);
    };

    const getScoreColor = (score) => {
        if (score >= 1 && score <= 6) return '#f44336'; // Detractor - Red
        if (score >= 7 && score <= 8) return '#ff9800'; // Neutral - Orange
        return '#4caf50'; // Promoter - Green
    };

    const getScoreLabel = (score) => {
        if (score >= 1 && score <= 6) return 'Detractor';
        if (score >= 7 && score <= 8) return 'Neutral';
        return 'Promoter';
    };

    const handleExport = () => {
        if (tasksToDisplay.length === 0) return;

        const exportData = tasksToDisplay.map(task => ({
            'SLID': task.slid || '',
            'Request #': task.requestNumber || '',
            'Customer Name': task.customerName || '',
            'Contact Number': task.contactNumber || '',
            'Team': task.teamName || '',
            'Interview Date': task.interviewDate ? format(new Date(task.interviewDate), 'yyyy-MM-dd') : '',
            'Evaluation Score': task.evaluationScore || '',
            'Score Type': getScoreLabel(task.evaluationScore),
            'Reason': Array.isArray(task.reason) ? task.reason.join(', ') : (task.reason || ''),
            'Sub Reason': Array.isArray(task.subReason) ? task.subReason.join(', ') : (task.subReason || ''),
            'Root Cause': Array.isArray(task.rootCause) ? task.rootCause.join(', ') : (task.rootCause || ''),
            'Status': task.status || '',
            'Priority': task.priority || '',
            'Governorate': task.governorate || '',
            'District': task.district || '',
            'Operation': task.operation || ''
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Auto-width columns
        const wscols = Object.keys(exportData[0]).map(k => ({ wch: Math.max(k.length, 15) }));
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, 'Tasks');

        const fileName = `${entityName}_Tasks_${selectedPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    if (!entityData) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text)',
                    maxHeight: '90vh'
                }
            }}
        >
            <DialogTitle sx={{
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pb: 2
            }}>
                <Box>
                    <Typography variant="h6" sx={{ color: 'var(--text)', fontWeight: 'bold' }}>
                        {entityName} - Task Details
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                        {analysisType === 'team' ? 'Team' : 'Reason'} Analysis • {tasksToDisplay.length} task{tasksToDisplay.length !== 1 ? 's' : ''}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: 'var(--text-secondary)' }}>
                    <MdClose size={24} />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: isMobile ? 2 : 3 }}>
                {/* Period Filter */}
                <Stack direction={isMobile ? 'column' : 'row'} spacing={2} alignItems={isMobile ? 'flex-start' : 'center'} sx={{ mb: 3 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', mb: 0.5, display: 'block' }}>
                            Filter by Period
                        </Typography>
                        <ToggleButtonGroup
                            value={selectedPeriod}
                            exclusive
                            onChange={handlePeriodChange}
                            size="small"
                            sx={{
                                '& .MuiToggleButton-root': {
                                    color: 'var(--text-secondary)',
                                    borderColor: 'var(--border)',
                                    fontSize: isMobile ? '0.7rem' : '0.8rem',
                                    padding: isMobile ? '4px 8px' : '6px 12px',
                                    '&.Mui-selected': {
                                        bgcolor: 'var(--accent)',
                                        color: 'var(--text)',
                                        '&:hover': { bgcolor: 'var(--accent-hover)' }
                                    }
                                }
                            }}
                        >
                            <ToggleButton value="all">All Periods ({entityData.allTasks?.length || 0})</ToggleButton>
                            {availablePeriods.map(periodKey => (
                                <ToggleButton key={periodKey} value={periodKey}>
                                    {periodKey} ({entityData.tasks[periodKey]?.length || 0})
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Box>
                    <IconButton
                        onClick={handleExport}
                        disabled={tasksToDisplay.length === 0}
                        title="Export to Excel"
                        size="small"
                        sx={{
                            color: '#4caf50',
                            backgroundColor: 'rgba(76, 175, 80, 0.05)',
                            '&:hover': { bgcolor: 'rgba(76,175,80,0.15)' }
                        }}
                    >
                        <MdFileDownload size={20} />
                    </IconButton>
                </Stack>

                {/* Tasks Table */}
                {tasksToDisplay.length > 0 ? (
                    <TableContainer component={Paper} sx={{ backgroundColor: 'var(--surface)', maxHeight: isMobile ? 'none' : '60vh' }}>
                        <Table stickyHeader size={isMobile ? 'small' : 'medium'}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>SLID</TableCell>
                                    {!isMobile && <TableCell sx={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Request #</TableCell>}
                                    <TableCell sx={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Customer</TableCell>
                                    {!isMobile && <TableCell sx={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Team</TableCell>}
                                    <TableCell sx={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Interview Date</TableCell>
                                    <TableCell sx={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Score</TableCell>
                                    {!isMobile && <TableCell sx={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Reason</TableCell>}
                                    {!isMobile && <TableCell sx={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Status</TableCell>}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tasksToDisplay.map((task, index) => (
                                    <TableRow key={task._id || index} hover sx={{ '&:hover': { backgroundColor: 'var(--surface)' } }}>
                                        <TableCell sx={{ color: 'var(--text)', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                                            {task.slid || 'N/A'}
                                        </TableCell>
                                        {!isMobile && (
                                            <TableCell sx={{ color: 'var(--text)', fontSize: '0.875rem' }}>
                                                {task.requestNumber || 'N/A'}
                                            </TableCell>
                                        )}
                                        <TableCell sx={{ color: 'var(--text)', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                                            {task.customerName || 'N/A'}
                                        </TableCell>
                                        {!isMobile && (
                                            <TableCell sx={{ color: 'var(--text)', fontSize: '0.875rem' }}>
                                                {task.teamName || 'N/A'}
                                            </TableCell>
                                        )}
                                        <TableCell sx={{ color: 'var(--text)', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                                            {task.interviewDate ? format(new Date(task.interviewDate), 'MMM d, yyyy') : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${task.evaluationScore || 0} - ${getScoreLabel(task.evaluationScore)}`}
                                                size="small"
                                                sx={{
                                                    backgroundColor: getScoreColor(task.evaluationScore) + '33',
                                                    color: getScoreColor(task.evaluationScore),
                                                    fontWeight: 'bold',
                                                    fontSize: isMobile ? '0.65rem' : '0.75rem'
                                                }}
                                            />
                                        </TableCell>
                                        {!isMobile && (
                                            <TableCell sx={{ color: 'var(--text)', fontSize: '0.875rem' }}>
                                                {Array.isArray(task.reason) ? task.reason.join(', ') : (task.reason || 'N/A')}
                                            </TableCell>
                                        )}
                                        {!isMobile && (
                                            <TableCell>
                                                <Chip
                                                    label={task.status || 'N/A'}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: 'var(--surface-hover)',
                                                        color: 'var(--text)',
                                                        fontSize: '0.75rem'
                                                    }}
                                                />
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
                            No tasks found for the selected period.
                        </Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ borderTop: '1px solid var(--border)', p: 2 }}>
                <Button onClick={onClose} sx={{ color: 'var(--text-secondary)' }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TrendTasksDialog;
