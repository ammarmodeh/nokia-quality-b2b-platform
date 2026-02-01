import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Box,
    Chip,
    Stack,
    Button,
    alpha
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { MdHistory, MdContentCopy } from 'react-icons/md';
import api from '../../api/api';
import { format } from 'date-fns';

const GaiaStepsDialog = ({ open, onClose, task }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && task?._id) {
            fetchTickets();
        }
    }, [open, task]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/tasks/tickets/${task._id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
            });

            // Sort Ascending: Event Date -> Created At
            // Backend already sorts by eventDate: 1, createdAt: 1.
            // verifying manually just in case:
            const sortedTickets = (data || []).sort((a, b) => {
                const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
                const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
                if (dateA !== dateB) return dateA - dateB; // Ascending time
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); // Tie-break ascending
            });

            setTickets(sortedTickets);
        } catch (error) {
            console.error('Error fetching GAIA tickets:', error);
            setTickets([]);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    bgcolor: '#1e1e1e', // Dark theme background
                    backgroundImage: 'none'
                }
            }}
        >
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #333',
                bgcolor: '#252525',
                color: '#fff'
            }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <MdHistory size={24} color="#7b68ee" />
                    <Typography variant="h6" fontWeight={700}>
                        Q-Ops Transaction Log
                    </Typography>
                </Stack>
                <IconButton onClick={onClose} sx={{ color: '#aaa' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0, bgcolor: '#1e1e1e', display: 'flex', flexDirection: 'column', height: '70vh' }}>
                {task && (
                    <Box sx={{ p: 2, bgcolor: '#2c2c2c', borderBottom: '1px solid #333', flexShrink: 0 }}>
                        <Typography variant="subtitle2" sx={{ color: '#aaa', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1 }}>
                            Target Case
                        </Typography>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>
                                {task.slid} <span style={{ color: '#7b68ee' }}>#{task.requestNumber}</span>
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#ccc' }}>
                                {task.customerName || "No Customer Name"}
                            </Typography>
                        </Stack>
                    </Box>
                )}

                <TableContainer sx={{ flex: 1, overflowY: 'auto' }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ bgcolor: '#252525', color: '#aaa', fontWeight: 700, fontSize: '0.75rem', borderBottom: '1px solid #333' }}>Execution Date</TableCell>
                                <TableCell sx={{ bgcolor: '#252525', color: '#aaa', fontWeight: 700, fontSize: '0.75rem', borderBottom: '1px solid #333' }}>Type / State</TableCell>
                                <TableCell sx={{ bgcolor: '#252525', color: '#aaa', fontWeight: 700, fontSize: '0.75rem', borderBottom: '1px solid #333' }}>Agent / Participant</TableCell>
                                <TableCell sx={{ bgcolor: '#252525', color: '#aaa', fontWeight: 700, fontSize: '0.75rem', borderBottom: '1px solid #333', width: '40%' }}>Detailed Technical Log</TableCell>
                                <TableCell sx={{ bgcolor: '#252525', color: '#aaa', fontWeight: 700, fontSize: '0.75rem', borderBottom: '1px solid #333' }}>Unf. Reason</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#aaa' }}>Loading...</TableCell>
                                </TableRow>
                            ) : tickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#aaa' }}>No logs found for this case.</TableCell>
                                </TableRow>
                            ) : tickets.map((ticket, index) => (
                                <TableRow
                                    key={ticket._id || index}
                                    sx={{
                                        '&:hover': { bgcolor: '#3d3d3d' },
                                        borderBottom: '1px solid #3d3d3d'
                                    }}
                                >
                                    <TableCell sx={{ color: '#fff', fontSize: '0.875rem' }}>
                                        {ticket.eventDate
                                            ? format(new Date(ticket.eventDate), 'dd/MM/yyyy')
                                            : '-'
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <Chip
                                                label={ticket.transactionType || ticket.mainCategory}
                                                size="small"
                                                sx={{
                                                    bgcolor: alpha('#7b68ee', 0.2),
                                                    color: '#9c8cf5',
                                                    fontWeight: 700,
                                                    fontSize: '0.7rem',
                                                    height: 20
                                                }}
                                            />
                                            <Typography variant="caption" sx={{ color: '#ccc' }}>
                                                {ticket.transactionState}
                                            </Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell sx={{ color: '#fff', fontSize: '0.875rem' }}>
                                        <Typography variant="body2">
                                            {ticket.recordedBy?.name || 'System'}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#777' }}>
                                            {ticket.agentName}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{
                                            p: 1,
                                            bgcolor: alpha('#000', 0.2),
                                            borderRadius: 1,
                                            border: '1px solid #333',
                                            direction: 'rtl',
                                            textAlign: 'right'
                                        }}>
                                            <Typography variant="body2" sx={{ color: '#eee', whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', fontSize: '0.85rem' }}>
                                                {ticket.note}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ color: '#ff7043', fontSize: '0.875rem', fontWeight: 600 }}>
                                        {ticket.unfReasonCode || '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

            </DialogContent>

            <DialogActions sx={{ p: 2, bgcolor: '#252525', borderTop: '1px solid #333' }}>
                <Button onClick={onClose} sx={{ color: '#aaa' }}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default GaiaStepsDialog;
