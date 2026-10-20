import { alpha } from "../../theme/colorFns";
import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Box, Chip, Stack, Button, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { MdHistory, MdContentCopy } from 'react-icons/md';
import api from '../../api/api';
import { format } from 'date-fns';
import { toast } from 'sonner';

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
        toast.success("Copied to clipboard!");
    };

    const formatTicket = (ticket) => {
        const date = ticket.eventDate ? format(new Date(ticket.eventDate), 'dd/MM/yyyy') : '-';
        const type = ticket.transactionType || ticket.mainCategory || 'N/A';
        const state = ticket.transactionState || 'N/A';
        const agent = ticket.agentName || 'N/A';
        const recordedBy = ticket.recordedBy?.name || 'System';
        const reason = ticket.unfReasonCode || '-';
        const note = ticket.note || '-';

        return `Date: ${date} | Type: ${type} - State: ${state}
Agent: ${agent} (Recorded by: ${recordedBy})
Unf. Reason: ${reason}
Note: ${note}
------------------------------------------`;
    };

    const handleCopyAll = () => {
        if (!tickets.length) return;

        const gaiaInfo = [];
        if (task?.gaiaCheck) gaiaInfo.push(`GAIA Check: ${task.gaiaCheck}`);
        if (task?.gaiaContent) gaiaInfo.push(`GAIA Content: ${task.gaiaContent}`);
        if (task?.latestGaia?.transactionType) gaiaInfo.push(`Latest GAIA Type: ${task.latestGaia.transactionType}`);
        if (task?.latestGaia?.transactionState) gaiaInfo.push(`Latest GAIA State: ${task.latestGaia.transactionState}`);
        if (task?.latestGaia?.unfReasonCode) gaiaInfo.push(`Latest GAIA Reason: ${task.latestGaia.unfReasonCode}`);

        const header = `Q-Ops Transaction Log for ${task?.slid || 'N/A'} #${task?.requestNumber || 'N/A'}
Customer: ${task?.customerName || "No Customer Name"}
${gaiaInfo.length ? gaiaInfo.join('\n') + '\n' : ''}==========================================
`;
        const body = tickets.map(t => formatTicket(t)).join('\n');
        copyToClipboard(header + body);
    };

    const handleCopyStep = (ticket) => {
        copyToClipboard(formatTicket(ticket));
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <MdHistory size={24} color="var(--accent-text)" />
                    <Typography variant="h6" fontWeight={600}>
                        Q-Ops Transaction Log
                    </Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Copy Full Log">
                        <IconButton onClick={handleCopyAll} sx={{ color: 'var(--accent-text)', '&:hover': { bgcolor: alpha('#6C47FF', 0.1) } }}>
                            <MdContentCopy />
                        </IconButton>
                    </Tooltip>
                    <IconButton onClick={onClose} sx={{ color: 'var(--text-secondary)' }}>
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </DialogTitle>

            <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '70vh' }}>
                {task && (
                    <Box sx={{ p: 2, bgcolor: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                        <Typography variant="subtitle2" sx={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 600, letterSpacing: 1 }}>
                            Target Case
                        </Typography>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body1" sx={{ color: 'var(--text)', fontWeight: 600 }}>
                                {task.slid} <span style={{ color: 'var(--accent-text)' }}>#{task.requestNumber}</span>
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                                {task.customerName || "No Customer Name"}
                            </Typography>
                        </Stack>
                        {(task.gaiaCheck || task.gaiaContent || task.latestGaia) && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: '#1b1b1b', borderRadius: 2, border: '1px solid var(--border)' }}>
                                <Typography variant="subtitle2" sx={{ color: 'var(--text-secondary)', letterSpacing: 0.5, mb: 1, fontSize: '0.75rem' }}>
                                    GAIA Summary
                                </Typography>
                                <Stack spacing={1}>
                                    <Typography variant="body2" sx={{ color: 'var(--text)' }}>
                                        <strong>GAIA Check:</strong> {task.gaiaCheck || 'No'}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                                        <strong>GAIA Content:</strong> {task.gaiaContent || 'N/A'}
                                    </Typography>
                                    {task.latestGaia?.transactionType && (
                                        <Typography variant="body2" sx={{ color: 'var(--text)' }}>
                                            <strong>Latest GAIA Type:</strong> {task.latestGaia.transactionType}
                                        </Typography>
                                    )}
                                    {task.latestGaia?.transactionState && (
                                        <Typography variant="body2" sx={{ color: 'var(--text)' }}>
                                            <strong>Latest GAIA State:</strong> {task.latestGaia.transactionState}
                                        </Typography>
                                    )}
                                    {task.latestGaia?.unfReasonCode && (
                                        <Typography variant="body2" sx={{ color: 'var(--text)' }}>
                                            <strong>Latest GAIA Reason:</strong> {task.latestGaia.unfReasonCode}
                                        </Typography>
                                    )}
                                </Stack>
                            </Box>
                        )}
                    </Box>
                )}

                <TableContainer sx={{ flex: 1, overflowY: 'auto' }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ bgcolor: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', borderBottom: '1px solid var(--border)', width: 50 }}>Action</TableCell>
                                <TableCell sx={{ bgcolor: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', borderBottom: '1px solid var(--border)' }}>Execution Date</TableCell>
                                <TableCell sx={{ bgcolor: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', borderBottom: '1px solid var(--border)' }}>Type / State</TableCell>
                                <TableCell sx={{ bgcolor: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', borderBottom: '1px solid var(--border)' }}>Agent / Participant</TableCell>
                                <TableCell sx={{ bgcolor: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', borderBottom: '1px solid var(--border)', width: '40%' }}>Detailed Technical Log</TableCell>
                                <TableCell sx={{ bgcolor: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', borderBottom: '1px solid var(--border)' }}>Unf. Reason</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'var(--text-secondary)' }}>Loading...</TableCell>
                                </TableRow>
                            ) : tickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'var(--text-secondary)' }}>No logs found for this case.</TableCell>
                                </TableRow>
                            ) : tickets.map((ticket, index) => (
                                <TableRow
                                    key={ticket._id || index}
                                    sx={{ borderBottom: '1px solid var(--border)'
                                    }}
                                >
                                    <TableCell>
                                        <Tooltip title="Copy This Step">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleCopyStep(ticket)}
                                                sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'var(--text)' } }}
                                            >
                                                <MdContentCopy size={16} />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell sx={{ color: 'var(--text)', fontSize: '0.875rem' }}>
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
                                                    bgcolor: alpha('#6C47FF', 0.2),
                                                    color: '#9c8cf5',
                                                    fontWeight: 600,
                                                    fontSize: '0.7rem',
                                                    height: 20
                                                }}
                                            />
                                            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                                                {ticket.transactionState}
                                            </Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell sx={{ color: 'var(--text)', fontSize: '0.875rem' }}>
                                        <Typography variant="body2">
                                            {ticket.recordedBy?.name || 'System'}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                                            {ticket.agentName}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{
                                            p: 1,
                                            bgcolor: alpha('#000', 0.2),
                                            borderRadius: 1,
                                            border: '1px solid var(--border)',
                                            direction: 'rtl',
                                            textAlign: 'right'
                                        }}>
                                            <Typography variant="body2" sx={{ color: 'var(--text)', whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', fontSize: '0.85rem' }}>
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

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} sx={{ color: 'var(--text-secondary)' }}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default GaiaStepsDialog;
