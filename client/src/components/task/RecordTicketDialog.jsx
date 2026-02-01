import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, Stack, Typography,
    alpha, Box, IconButton, Grid, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper, Tooltip,
    Tabs, Tab, Divider, Autocomplete, createFilterOptions
} from "@mui/material";
import { MdClose, MdHistory, MdInput, MdInfo, MdEdit, MdDelete, MdWarning, MdAccessTime, MdPeople, MdVisibility, MdContentCopy } from "react-icons/md";
import { format } from "date-fns";
import api from "../../api/api";

const filter = createFilterOptions();

// Helper function to detect Arabic text
const isArabicText = (text) => {
    if (!text) return false;
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(text);
};

const QUICK_PRESETS = [
    // FLOW: Initial & Engagement
    { label: "Contacted: No Answer", type: "CONTACT", state: "NO_ANSWER", status: "In Progress", note: "Called customer; no answer.", color: "#FF9800" },
    { label: "Contacted: Appt Set / Visit Scheduled", type: "CONTACT", state: "APPT_SET", status: "In Progress", note: "Customer contacted; appointment scheduled for visit.", color: "#06b6d4" },
    { label: "Contacted: Awaiting Reply", type: "CONTACT", state: "AWAITING_REPLY", status: "In Progress", note: "Customer contacted; awaiting customer to check and get back to us.", color: "#8b5cf6" },
    { label: "Contacted: Refused", type: "CONTACT", state: "REFUSED", status: "In Progress", note: "Customer refused the introduced solutions.", color: "#ef4444" },

    // FLOW: Dispatch & Visit
    { label: "Reflected to Team / Visit Scheduled", type: "REFLECT", state: "APPT_SET", status: "In Progress", note: "Task reflected to field team for visit.", color: "#6366f1" },
    { label: "Reflect: ONT Relocation / Follow-up", type: "REFLECT", state: "NEED_SCHEDULE", status: "In Progress", note: "Visit occurred but issue unresolved; task reflected to team to schedule an appointment for ONT relocation.", color: "#f59e0b" },
    { label: "Visit: Success", type: "VISIT", state: "VISIT_OK", status: "In Progress", note: "Technician visited site; visit successful.", color: "#8b5cf6" },
    { label: "Visit: Resolved", type: "VISIT", state: "ISSUE_RESOLVED", status: "Closed", note: "Customer visited and issue fully resolved.", color: "#10b981" },

    { label: "Resolved by Phone", type: "CONTACT", state: "SOLVED_REMOTE", status: "Closed", reason: "202", note: "Issue solved and closed by phone.", color: "#10b981" },
    { label: "Ticket Closed", type: "RESOLVE", state: "ISSUE_RESOLVED", status: "Closed", reason: "206", note: "Issue fully resolved; ticket closed.", color: "#4f46e5" },
];

const RecordTicketDialog = ({ open, onClose, task, onTicketAdded }) => {
    const { user } = useSelector((state) => state.auth);
    const [tabValue, setTabValue] = useState(0);
    const [transactionType, setTransactionType] = useState("");
    const [transactionState, setTransactionState] = useState("");
    const [unfReasonCode, setUnfReasonCode] = useState("");
    const [agentName, setAgentName] = useState("");
    const [teams, setTeams] = useState([]);
    const [note, setNote] = useState("");
    const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState(task?.status || "In Progress");
    const [loading, setLoading] = useState(false);
    const [tickets, setTickets] = useState([]);
    const [isNaDate, setIsNaDate] = useState(false);

    // Dynamic Options States
    const [dropdowns, setDropdowns] = useState({
        TRANSACTION_TYPE: [],
        TRANSACTION_STATE: [],
        UNF_REASON_CODE: [],
        SYSTEM_FLOW_STATUS: []
    });

    // Action States
    const [editingTicket, setEditingTicket] = useState(null);
    const [deletingTicket, setDeletingTicket] = useState(null);
    const [viewingTicket, setViewingTicket] = useState(null);
    const [confirmId, setConfirmId] = useState("");
    const [cellViewer, setCellViewer] = useState({ open: false, title: "", value: "", color: "#7b68ee" });

    const showCellValue = (title, value, color = "#7b68ee") => {
        setCellViewer({ open: true, title, value: value || "—", color });
    };

    useEffect(() => {
        if (open && task?._id) {
            fetchDropdowns();
            fetchTickets();
            fetchTeams();
            resetForm();
            setTabValue(0);
        }
    }, [open, task]);

    const fetchDropdowns = async () => {
        try {
            const { data } = await api.get("/dropdown-options/all");
            setDropdowns({
                TRANSACTION_TYPE: data.TRANSACTION_TYPE || [],
                TRANSACTION_STATE: data.TRANSACTION_STATE || [],
                UNF_REASON_CODE: data.UNF_REASON_CODE || [],
                SYSTEM_FLOW_STATUS: data.SYSTEM_FLOW_STATUS || []
            });

            // Set defaults if not editing
            if (!editingTicket) {
                const ticketCount = tickets.length;
                if (ticketCount === 0) {
                    setTransactionType("INIT");
                    setTransactionState("PENDING_CONTACT");
                } else {
                    // Smart defaults based on sequence (tickets are ASC: oldest first)
                    const lastTicket = tickets[tickets.length - 1];
                    const lastType = lastTicket?.transactionType || lastTicket?.mainCategory;

                    if (lastType === "INIT") setTransactionType("CONTACT");
                    else if (lastType === "CONTACT") setTransactionType("REFLECT");
                    else if (lastType === "REFLECT") setTransactionType("VISIT");
                    else if (lastType === "VISIT") setTransactionType("RESOLVE");
                    else setTransactionType("CONTACT"); // Fallback
                }
            }
        } catch (error) {
            console.error("Error fetching dropdowns:", error);
        }
    };

    const fetchTickets = async () => {
        try {
            const { data } = await api.get(`/tasks/tickets/${task._id}`);
            setTickets(data || []);
        } catch (error) {
            console.error("Error fetching tickets:", error);
        }
    };

    const fetchTeams = async () => {
        try {
            const [teamsRes, usersRes] = await Promise.all([
                api.get("/field-teams/get-field-teams"),
                api.get("/users/get-all-users")
            ]);

            const teamNames = teamsRes.data.map(team => team.teamName);
            const userNames = usersRes.data.map(u => u.name);

            // Merge and de-duplicate
            const merged = Array.from(new Set([...teamNames, ...userNames])).sort();
            setTeams(merged);
        } catch (error) {
            console.error("Error fetching teams/users:", error);
        }
    };

    const resetForm = () => {
        // Defaults will be handled by fetchDropdowns or manually here if needed
        setUnfReasonCode("");
        setNote("");
        setEventDate(new Date().toISOString().split('T')[0]);
        setStatus(task?.status || "In Progress");
        setAgentName(user?.name || ""); // Include current user session
        setIsNaDate(false);
        setEditingTicket(null);
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const applyPreset = (preset) => {
        setTransactionType(preset.type);
        setTransactionState(preset.state);
        // setUnfReasonCode(preset.reason); // Reason not always in presets now
        if (preset.reason) setUnfReasonCode(preset.reason);
        setNote(preset.note);
        setStatus(preset.status);
    };

    const handleStateSelection = (val) => {
        setTransactionState(val);
        if (val === "ISSUE_RESOLVED" || val === "SOLVED_REMOTE") {
            setStatus("Closed");
        } else {
            setStatus("In Progress");
        }
    };

    // Maintain special case for "Ticket Initiated" (INIT)
    useEffect(() => {
        if (transactionType === "INIT" && !editingTicket) {
            setTransactionState("PENDING_CONTACT");
            setStatus("Todo");
            setNote("Ticket initated by the system");
        }
    }, [transactionType]);

    const handleSubmit = async () => {
        if (!note.trim()) return;
        setLoading(true);
        try {
            const ticketData = {
                taskId: task._id,
                mainCategory: transactionType,
                status: status,
                note: note,
                eventDate: isNaDate ? null : eventDate,
                transactionType,
                transactionState,
                unfReasonCode,
                agentName: agentName || user?.name || "User"
            };

            if (editingTicket) {
                await api.put(`/tasks/tickets/${editingTicket._id}`, ticketData);
                fetchTickets();
                setTabValue(1); // Switch to list tab to see the updated sequence
                alert("Ticket updated successfully");
            } else {
                const { data } = await api.post("/tasks/tickets", ticketData);
                if (onTicketAdded) onTicketAdded(data);
                fetchTickets();
                setTabValue(1);
            }
            resetForm();
        } catch (error) {
            console.error("Error saving ticket:", error);
            alert("Failed to save transaction");
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (ticket) => {
        setEditingTicket(ticket);
        setTransactionType(ticket.transactionType || ticket.mainCategory);
        setTransactionState(ticket.transactionState || "");
        setUnfReasonCode(ticket.unfReasonCode || "");
        setAgentName(ticket.agentName || "");
        setNote(ticket.note || "");
        setEventDate(ticket.eventDate ? new Date(ticket.eventDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setIsNaDate(!ticket.eventDate);
        setStatus(ticket.status || "In Progress");
        setTabValue(0);
    };

    const handleDeleteClick = (ticket) => {
        setDeletingTicket(ticket);
        setConfirmId("");
    };

    const confirmDelete = async () => {
        if (confirmId !== deletingTicket.ticketId) {
            alert("Ticket ID mismatch. Please enter the correct ID.");
            return;
        }
        setLoading(true);
        try {
            await api.delete(`/tasks/tickets/${deletingTicket._id}`);
            setTickets(tickets.filter(t => t._id !== deletingTicket._id));
            setDeletingTicket(null);
            alert("Ticket deleted successfully.");
        } catch (error) {
            console.error("Error deleting ticket:", error);
            alert("Failed to delete ticket.");
        } finally {
            setLoading(false);
        }
    };

    const getMeaning = (category, value) => {
        const found = dropdowns[category]?.find(item => item.value === value);
        return found ? found.label : value;
    };

    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        // Optional: You could add a snackbar here
    };

    const copyRowData = (ticket) => {
        const date = ticket.eventDate ? format(new Date(ticket.eventDate), "yyyy-MM-dd") : "N/A";
        const text = `ID: ${ticket.ticketId} | Date: ${date} | Agent: ${ticket.recordedBy?.name || "System"} | Status: ${ticket.status} | Note: ${ticket.note || ""}`;
        copyToClipboard(text);
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1c1c1c' : '#ffffff',
                    }
                }}
            >
                <DialogTitle sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    pb: 1.5,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02)
                }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <MdHistory size={26} color="#7b68ee" />
                        <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: -0.5 }}>
                            {editingTicket ? "Technical Realignment" : "QOPS Transaction Log"}
                        </Typography>
                    </Stack>
                    <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
                        <MdClose />
                    </IconButton>
                </DialogTitle>

                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    sx={{
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        px: 2,
                        minHeight: 50,
                        '& .MuiTab-root': {
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            fontSize: '0.75rem',
                            letterSpacing: 1,
                            minHeight: 50
                        }
                    }}
                >
                    <Tab icon={<MdInput />} iconPosition="start" label={editingTicket ? "Modify Entry" : "New Transaction"} />
                    <Tab icon={<MdHistory />} iconPosition="start" label="Chronological Steps" />
                </Tabs>

                <DialogContent sx={{ p: 0 }}>
                    {tabValue === 0 ? (
                        <Box sx={{ p: 3 }}>
                            <Stack spacing={3}>
                                {/* Task Summary Card */}
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05), borderStyle: 'dashed' }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={900} sx={{ letterSpacing: 1 }}>TARGET SUBSCRIBER</Typography>
                                            <Typography variant="body1" fontWeight={900} sx={{ color: 'primary.main' }}>
                                                {task?.customerName || "SYSTEM ORDER"}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mt: 0.5 }}>
                                                Contact: {task?.contactNumber || task?.customer?.contactNumber || "N/A"}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6} sx={{ textAlign: 'right' }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={900} sx={{ letterSpacing: 1 }}>PRIMARY SLID / CASE</Typography>
                                            <Typography variant="body1" fontWeight={900}>
                                                {task?.slid} <span style={{ color: '#999', fontSize: '0.8rem' }}>• #{task?.requestNumber}</span>
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Paper>

                                <Box>
                                    <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.secondary', mb: 1, display: 'block' }}>
                                        Quick E2E Presets
                                    </Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        {QUICK_PRESETS.map((preset) => (
                                            <Button
                                                key={preset.label}
                                                size="small"
                                                variant="outlined"
                                                onClick={() => applyPreset(preset)}
                                                sx={{
                                                    borderRadius: 2,
                                                    fontSize: '0.65rem',
                                                    fontWeight: 900,
                                                    color: preset.color,
                                                    borderColor: alpha(preset.color, 0.5),
                                                    '&:hover': {
                                                        borderColor: preset.color,
                                                        bgcolor: alpha(preset.color, 0.05)
                                                    }
                                                }}
                                            >
                                                {preset.label}
                                            </Button>
                                        ))}
                                    </Stack>
                                </Box>

                                <Box>
                                    <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.secondary', mb: 2, display: 'block' }}>
                                        Technical Parameters
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                select
                                                label="Tran. Type"
                                                size="small"
                                                fullWidth
                                                value={transactionType}
                                                onChange={(e) => setTransactionType(e.target.value)}
                                            >
                                                {dropdowns.TRANSACTION_TYPE.map(opt => (
                                                    <MenuItem key={opt._id} value={opt.value} sx={{ py: 1 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 900, mr: 1, color: 'primary.main' }}>{opt.value}</Typography>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{opt.label}</Typography>
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                select
                                                label="Outcome State"
                                                size="small"
                                                fullWidth
                                                value={transactionState}
                                                onChange={(e) => handleStateSelection(e.target.value)}
                                            >
                                                {dropdowns.TRANSACTION_STATE.map(opt => (
                                                    <MenuItem key={opt._id} value={opt.value} sx={{ py: 1 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 900, mr: 1 }}>{opt.value}</Typography>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{opt.label}</Typography>
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Stack spacing={0.5}>
                                                <TextField
                                                    label="Execution Date"
                                                    type="date"
                                                    size="small"
                                                    fullWidth
                                                    value={eventDate}
                                                    onChange={(e) => setEventDate(e.target.value)}
                                                    disabled={isNaDate}
                                                    InputLabelProps={{ shrink: true }}
                                                />
                                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                                    <input
                                                        type="checkbox"
                                                        id="na-date"
                                                        checked={isNaDate}
                                                        onChange={(e) => setIsNaDate(e.target.checked)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <label htmlFor="na-date" style={{ fontSize: '0.7rem', fontWeight: 800, marginLeft: '4px', cursor: 'pointer', color: isNaDate ? '#7b68ee' : '#666' }}>
                                                        NOT APPLICABLE (N/A)
                                                    </label>
                                                </Box>
                                            </Stack>
                                        </Grid>

                                        <Grid item xs={12} sm={8}>
                                            <TextField
                                                select
                                                label="Unfulfillment / Failure Reason"
                                                size="small"
                                                fullWidth
                                                value={unfReasonCode}
                                                onChange={(e) => setUnfReasonCode(e.target.value)}
                                            >
                                                <MenuItem value=""><em>-- NO REASON CODE --</em></MenuItem>
                                                {dropdowns.UNF_REASON_CODE.map(opt => (
                                                    <MenuItem key={opt._id} value={opt.value} sx={{ py: 1 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 900, mr: 1, color: '#FF5722' }}>{opt.value}</Typography>
                                                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{opt.label}</Typography>
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                select
                                                label="System Flow Status"
                                                size="small"
                                                fullWidth
                                                value={status}
                                                onChange={(e) => setStatus(e.target.value)}
                                            >
                                                {dropdowns.SYSTEM_FLOW_STATUS.map(opt => (
                                                    <MenuItem key={opt._id} value={opt.value} sx={{ fontWeight: 800 }}>{opt.label}</MenuItem>
                                                ))}
                                                {dropdowns.SYSTEM_FLOW_STATUS.length === 0 && ["Todo", "In Progress", "Closed", "Completed"].map(s => (
                                                    <MenuItem key={s} value={s} sx={{ fontWeight: 800 }}>{s}</MenuItem>
                                                ))}
                                            </TextField>
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Autocomplete
                                                value={agentName}
                                                onChange={(event, newValue) => {
                                                    if (typeof newValue === 'string') setAgentName(newValue);
                                                    else if (newValue && newValue.inputValue) setAgentName(newValue.inputValue);
                                                    else setAgentName(newValue);
                                                }}
                                                filterOptions={(options, params) => {
                                                    const filtered = filter(options, params);
                                                    const { inputValue } = params;
                                                    if (inputValue !== '' && !options.some((o) => inputValue === o)) {
                                                        filtered.push({ inputValue, title: `ADD NEW: "${inputValue}"` });
                                                    }
                                                    return filtered;
                                                }}
                                                options={teams}
                                                getOptionLabel={(option) => typeof option === 'string' ? option : option.inputValue}
                                                renderOption={(props, option) => <li {...props} style={{ fontWeight: 700 }}>{option.title || option}</li>}
                                                freeSolo
                                                size="small"
                                                renderInput={(params) => (
                                                    <TextField {...params} label="Agent / Dispatcher / Field Team" placeholder="Search or define agent..." />
                                                )}
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>

                                <TextField
                                    label="Detailed Technical Log"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Enter exhaustive technical or logistic details..."
                                    required
                                    sx={{
                                        '& textarea': {
                                            fontSize: '0.9rem',
                                            fontWeight: 500,
                                            direction: isArabicText(note) ? 'rtl' : 'ltr',
                                            textAlign: isArabicText(note) ? 'right' : 'left'
                                        }
                                    }}
                                />
                            </Stack>
                        </Box>
                    ) : (
                        <TableContainer sx={{ borderTop: '1px solid', borderColor: 'divider', minHeight: 400, overflowX: 'auto' }}>
                            <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', minWidth: 1300 }}>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: alpha('#7b68ee', 0.05) }}>
                                        <TableCell sx={{ width: '130px', fontWeight: 900, py: 1.5, fontSize: '0.7rem', color: 'text.secondary', textTransform: 'uppercase', borderRight: '1px solid', borderColor: 'divider' }}>Ticket ID</TableCell>
                                        <TableCell sx={{ width: '120px', fontWeight: 900, py: 1.5, fontSize: '0.7rem', color: 'text.secondary', textTransform: 'uppercase', borderRight: '1px solid', borderColor: 'divider' }}>Execution Date</TableCell>
                                        <TableCell sx={{ width: '180px', fontWeight: 900, py: 1.5, fontSize: '0.7rem', color: 'text.secondary', textTransform: 'uppercase', borderRight: '1px solid', borderColor: 'divider' }}>Agent / Participant</TableCell>
                                        <TableCell sx={{ width: '150px', fontWeight: 900, py: 1.5, fontSize: '0.7rem', color: 'text.secondary', textTransform: 'uppercase', borderRight: '1px solid', borderColor: 'divider' }}>Type / State</TableCell>
                                        <TableCell sx={{ width: '110px', fontWeight: 900, py: 1.5, fontSize: '0.7rem', color: 'text.secondary', textTransform: 'uppercase', borderRight: '1px solid', borderColor: 'divider' }}>Unf. Reason</TableCell>
                                        <TableCell sx={{ width: '100px', fontWeight: 900, py: 1.5, fontSize: '0.7rem', color: 'text.secondary', textTransform: 'uppercase', borderRight: '1px solid', borderColor: 'divider' }}>Ticket Status</TableCell>
                                        <TableCell sx={{ width: '250px', fontWeight: 900, py: 1.5, fontSize: '0.7rem', color: 'text.secondary', textTransform: 'uppercase', borderRight: '1px solid', borderColor: 'divider' }}>Detailed Technical Log</TableCell>
                                        <TableCell sx={{ width: '160px', fontWeight: 900, py: 1.5, fontSize: '0.7rem', color: 'text.secondary', textTransform: 'uppercase', borderRight: '1px solid', borderColor: 'divider' }}>Metadata</TableCell>
                                        <TableCell sx={{ width: '100px', fontWeight: 900, py: 1.5, fontSize: '0.7rem', color: 'text.secondary', textTransform: 'uppercase' }} align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tickets.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} align="center" sx={{ py: 10, bgcolor: alpha('#eee', 0.2) }}>
                                                <Typography variant="caption" sx={{ fontWeight: 900, color: '#ccc', textTransform: 'uppercase', letterSpacing: 2 }}>
                                                    NO DATASTREAM RECOERDED FOR THIS CASE
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        tickets.map((ticket, index) => (
                                            <TableRow key={ticket._id} hover sx={{ bgcolor: index % 2 === 0 ? 'inherit' : alpha('#f0f0f0', 0.5) }}>
                                                <TableCell sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                                                        <Typography variant="caption" noWrap sx={{ fontWeight: 900, color: '#7b68ee', flex: 1 }}>{ticket.ticketId}</Typography>
                                                        {ticket.ticketId?.length > 10 && (
                                                            <Button size="small" onClick={() => showCellValue("TICKET IDENTIFIER", ticket.ticketId, "#7b68ee")} sx={{ minWidth: 'auto', p: 0, fontSize: '0.6rem', fontWeight: 900, color: '#7b68ee' }}>View</Button>
                                                        )}
                                                        <IconButton size="small" onClick={() => copyToClipboard(ticket.ticketId)} sx={{ opacity: 0.5 }}>
                                                            <MdContentCopy size={10} />
                                                        </IconButton>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                                                        <Typography variant="body2" noWrap sx={{ fontSize: '0.7rem', fontWeight: 600, flex: 1 }}>
                                                            {ticket.eventDate ? format(new Date(ticket.eventDate), "dd MMM, yy") : "N/A"}
                                                        </Typography>
                                                        {ticket.eventDate && (
                                                            <IconButton size="small" onClick={() => copyToClipboard(format(new Date(ticket.eventDate), "dd MMM, yy"))} sx={{ opacity: 0.5 }}>
                                                                <MdContentCopy size={10} />
                                                            </IconButton>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                                                        <Typography
                                                            variant="caption"
                                                            noWrap
                                                            sx={{
                                                                fontWeight: 900,
                                                                color: '#7b68ee',
                                                                flex: 1
                                                            }}
                                                        >
                                                            {`${ticket.recordedBy?.name || "System"} / ${ticket.agentName || "—"}`}
                                                        </Typography>
                                                        {(`${ticket.recordedBy?.name || "System"} / ${ticket.agentName || "—"}`).length > 15 && (
                                                            <Button size="small" onClick={() => showCellValue("PARTICIPANT DETAILS", `${ticket.recordedBy?.name || "System"} / ${ticket.agentName || "—"}`)} sx={{ minWidth: 'auto', p: 0, fontSize: '0.6rem', fontWeight: 900, color: '#7b68ee' }}>View</Button>
                                                        )}
                                                        <IconButton size="small" onClick={() => copyToClipboard(`${ticket.recordedBy?.name || "System"} / ${ticket.agentName || "—"}`)} sx={{ opacity: 0.5 }}>
                                                            <MdContentCopy size={10} />
                                                        </IconButton>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                            <Typography variant="caption" noWrap sx={{ fontWeight: 900, color: '#7b68ee', display: 'block' }}>
                                                                {`${ticket.transactionType || ticket.mainCategory} | ${ticket.transactionState || "VA"}`}
                                                            </Typography>
                                                        </Box>
                                                        {(`${ticket.transactionType || ticket.mainCategory} | ${ticket.transactionState || "VA"}`).length > 15 && (
                                                            <Button size="small" onClick={() => showCellValue("TRANSACTION TYPE/STATE", `${ticket.transactionType || ticket.mainCategory} | ${ticket.transactionState || "VA"}`)} sx={{ minWidth: 'auto', p: 0, fontSize: '0.6rem', fontWeight: 900, color: '#7b68ee' }}>View</Button>
                                                        )}
                                                        <IconButton size="small" onClick={() => copyToClipboard(`${ticket.transactionType || ticket.mainCategory} - ${ticket.transactionState || "VA"}`)} sx={{ opacity: 0.5 }}>
                                                            <MdContentCopy size={10} />
                                                        </IconButton>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                                                    {ticket.unfReasonCode ? (
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            <Tooltip title={getMeaning('UNF_REASON_CODE', ticket.unfReasonCode)}>
                                                                <Typography variant="caption" noWrap sx={{ color: '#FF5722', fontWeight: 900 }}>{ticket.unfReasonCode}</Typography>
                                                            </Tooltip>
                                                            <Button size="small" onClick={() => showCellValue("REASON CODE", `${ticket.unfReasonCode} - ${getMeaning('UNF_REASON_CODE', ticket.unfReasonCode)}`, "#FF5722")} sx={{ minWidth: 'auto', p: 0, fontSize: '0.6rem', fontWeight: 900, color: '#7b68ee' }}>View</Button>
                                                            <IconButton size="small" onClick={() => copyToClipboard(ticket.unfReasonCode)} sx={{ opacity: 0.5 }}>
                                                                <MdContentCopy size={10} />
                                                            </IconButton>
                                                        </Stack>
                                                    ) : "—"}
                                                </TableCell>
                                                <TableCell sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Typography
                                                            variant="caption"
                                                            noWrap
                                                            sx={{
                                                                fontWeight: 900,
                                                                color: 'text.primary'
                                                            }}
                                                        >
                                                            {ticket.status || 'Todo'}
                                                        </Typography>
                                                        <IconButton size="small" onClick={() => copyToClipboard(ticket.status || 'Todo')} sx={{ opacity: 0.5 }}>
                                                            <MdContentCopy size={10} />
                                                        </IconButton>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                                                        <Typography
                                                            variant="caption"
                                                            noWrap
                                                            sx={{
                                                                fontSize: '0.75rem',
                                                                fontWeight: 500,
                                                                color: 'text.primary',
                                                                direction: isArabicText(ticket.note) ? 'rtl' : 'ltr',
                                                                textAlign: isArabicText(ticket.note) ? 'right' : 'left',
                                                                flex: 1
                                                            }}
                                                        >
                                                            {ticket.note || "—"}
                                                        </Typography>
                                                        {ticket.note?.length > 30 && (
                                                            <Button
                                                                size="small"
                                                                onClick={() => showCellValue("AGENT REMARKS", ticket.note)}
                                                                sx={{
                                                                    minWidth: 'auto',
                                                                    p: 0,
                                                                    color: '#7b68ee',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 900,
                                                                    textTransform: 'none'
                                                                }}
                                                            >
                                                                Read More
                                                            </Button>
                                                        )}
                                                        {ticket.note && (
                                                            <IconButton size="small" onClick={() => copyToClipboard(ticket.note)} sx={{ opacity: 0.5 }}>
                                                                <MdContentCopy size={10} />
                                                            </IconButton>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell sx={{ borderRight: '1px solid', borderColor: 'divider' }}>
                                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                                                        <Typography variant="caption" noWrap sx={{ fontSize: '0.65rem', color: '#999', flex: 1 }}>
                                                            {`C: ${format(new Date(ticket.createdAt), "dd/MM/yy HH:mm")} | U: ${format(new Date(ticket.updatedAt), "dd/MM/yy HH:mm")}`}
                                                        </Typography>
                                                        <Button
                                                            size="small"
                                                            onClick={() => showCellValue("TECHNICAL LOG TIMESTAMPS", `CREATED: ${format(new Date(ticket.createdAt), "dd MMM yyyy HH:mm:ss")}\nUPDATED: ${format(new Date(ticket.updatedAt), "dd MMM yyyy HH:mm:ss")}`, "#999")}
                                                            sx={{ minWidth: 'auto', p: 0, fontSize: '0.6rem', fontWeight: 900, color: '#7b68ee' }}
                                                        >
                                                            View
                                                        </Button>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => copyToClipboard(`Created: ${format(new Date(ticket.createdAt), "dd MMM yyyy HH:mm")} | Updated: ${format(new Date(ticket.updatedAt), "dd MMM yyyy HH:mm")}`)}
                                                            sx={{ opacity: 0.5 }}
                                                        >
                                                            <MdContentCopy size={10} />
                                                        </IconButton>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={0.5} justifyContent="center">
                                                        <Tooltip title="Copy Row Details">
                                                            <IconButton size="small" onClick={() => copyRowData(ticket)}>
                                                                <MdContentCopy size={14} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <IconButton size="small" sx={{ bgcolor: alpha('#7bc', 0.1) }} onClick={() => setViewingTicket(ticket)}>
                                                            <MdVisibility size={14} />
                                                        </IconButton>
                                                        <IconButton size="small" color="primary" onClick={() => handleEditClick(ticket)}>
                                                            <MdEdit size={14} />
                                                        </IconButton>
                                                        <IconButton size="small" color="error" onClick={() => handleDeleteClick(ticket)}>
                                                            <MdDelete size={14} />
                                                        </IconButton>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: alpha('#f0f0f0', 0.5) }}>
                    <Button onClick={editingTicket ? resetForm : onClose} sx={{ fontWeight: 900, color: 'text.secondary', px: 3, borderRadius: 2 }}>
                        {editingTicket ? "DISCARD CHANGES" : "CLOSE LOG"}
                    </Button>
                    {tabValue === 0 && (
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={!note.trim() || loading}
                            sx={{ borderRadius: 2, fontWeight: 900, bgcolor: '#7b68ee', px: 4, '&:hover': { bgcolor: '#6854d9' } }}
                        >
                            {loading ? "TRANSMITTING..." : (editingTicket ? "UPDATE RECORD" : "COMMIT TRANSACTION")}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Sub-Dialog: Detailed View */}
            <Dialog open={!!viewingTicket} onClose={() => setViewingTicket(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <MdVisibility color="#7bc" size={24} />
                        <Typography variant="h6" fontWeight={900}>Detailed Transaction Payload</Typography>
                    </Stack>
                    <IconButton onClick={() => setViewingTicket(null)} size="small"><MdClose /></IconButton>
                </DialogTitle>
                <DialogContent>
                    {viewingTicket && (
                        <Grid container spacing={3} sx={{ mt: 1 }}>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="text.secondary" fontWeight={800}>TICKET IDENTIFIER</Typography>
                                <Typography variant="h6" fontWeight={900} color="primary">{viewingTicket.ticketId}</Typography>
                            </Grid>
                            <Grid item xs={6} sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={800}>STATUS / DATE</Typography>
                                <Typography variant="body1" fontWeight={700}>{getMeaning('SYSTEM_FLOW_STATUS', viewingTicket.status)} • {format(new Date(viewingTicket.eventDate), "yyyy-MM-dd")}</Typography>
                            </Grid>
                            <Grid item xs={12} sx={{ mt: -2 }}><Divider /></Grid>
                            <Grid item xs={12}>
                                <Stack spacing={2}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={800}>TRANSACTION TYPE / STATE</Typography>
                                        <Typography variant="body1" fontWeight={700}>
                                            {getMeaning('TRANSACTION_TYPE', viewingTicket.transactionType)} ({viewingTicket.transactionType}) • {getMeaning('TRANSACTION_STATE', viewingTicket.transactionState)} ({viewingTicket.transactionState})
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={800}>UNFULFILLED REASON</Typography>
                                        <Typography variant="body1" fontWeight={700} sx={{ color: '#FF5722' }}>
                                            {viewingTicket.unfReasonCode ? `${viewingTicket.unfReasonCode} - ${getMeaning('UNF_REASON_CODE', viewingTicket.unfReasonCode)}` : "EXECUTION SUCCESSFUL"}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={800}>RESPONSIBLE AGENT / TEAM</Typography>
                                        <Typography variant="body1" fontWeight={700}>{viewingTicket.agentName?.toUpperCase() || "UNASSIGNED"}</Typography>
                                    </Box>
                                    <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha('#eee', 0.3), borderRadius: 3 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={900} sx={{ mb: 1, display: 'block' }}>AGENT REMARKS</Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                whiteSpace: 'pre-wrap',
                                                lineHeight: 1.6,
                                                fontWeight: 500,
                                                direction: isArabicText(viewingTicket.note) ? 'rtl' : 'ltr',
                                                textAlign: isArabicText(viewingTicket.note) ? 'right' : 'left'
                                            }}
                                        >
                                            {viewingTicket.note}
                                        </Typography>
                                    </Paper>
                                </Stack>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
            </Dialog>

            {/* Sub-Dialog: Confirmation Delete */}
            <Dialog open={!!deletingTicket} onClose={() => setDeletingTicket(null)}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                    <MdWarning size={28} /> Confirm Irreversible Deletion
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 3 }}>
                        Initiating deletion for protocol <span style={{ fontWeight: 900, color: '#000' }}>{deletingTicket?.ticketId}</span>. This will purge all associated metadata and technical logs.
                    </Typography>
                    <TextField
                        fullWidth
                        label="Enter Transaction ID to Confirm"
                        placeholder={deletingTicket?.ticketId}
                        value={confirmId}
                        onChange={(e) => setConfirmId(e.target.value)}
                        autoFocus
                        helperText="Caution: Action is permanent."
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeletingTicket(null)} color="inherit" sx={{ fontWeight: 800 }}>ABORT</Button>
                    <Button onClick={confirmDelete} variant="contained" color="error" disabled={confirmId !== deletingTicket?.ticketId || loading} sx={{ fontWeight: 900 }}>
                        {loading ? "PURGING..." : "CONFIRM PURGE"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Specific Cell Content Viewer */}
            <Dialog open={cellViewer.open} onClose={() => setCellViewer({ ...cellViewer, open: false })} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={900} color="text.secondary">{cellViewer.title}</Typography>
                    <IconButton onClick={() => setCellViewer({ ...cellViewer, open: false })} size="small"><MdClose /></IconButton>
                </DialogTitle>
                <DialogContent>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(cellViewer.color || '#7b68ee', 0.05), borderRadius: 2, border: `1px solid ${alpha(cellViewer.color || '#7b68ee', 0.2)}` }}>
                        <Typography
                            variant="body2"
                            sx={{
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontWeight: 700,
                                color: cellViewer.color || 'text.primary',
                                direction: isArabicText(cellViewer.value) ? 'rtl' : 'ltr',
                                textAlign: isArabicText(cellViewer.value) ? 'right' : 'left'
                            }}
                        >
                            {cellViewer.value}
                        </Typography>
                    </Paper>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => copyToClipboard(cellViewer.value)} size="small" startIcon={<MdContentCopy />} sx={{ fontWeight: 900 }}>COPY CONTENT</Button>
                    <Button onClick={() => setCellViewer({ ...cellViewer, open: false })} size="small" sx={{ fontWeight: 900, color: 'text.secondary' }}>CLOSE</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default RecordTicketDialog;
