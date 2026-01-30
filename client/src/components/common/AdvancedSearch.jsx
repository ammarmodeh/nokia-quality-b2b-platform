import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Typography,
    Grid,
    TextField,
    IconButton,
    Button,
    Box,
    alpha
} from '@mui/material';
import { MdSearch, MdClose } from 'react-icons/md';

const AdvancedSearch = ({ open, onClose, fields, setFields, onInitiate, onClear }) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    bgcolor: '#1c1c1c',
                    border: '1px solid #3d3d3d',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                }
            }}
        >
            <DialogTitle sx={{
                borderBottom: '1px solid #3d3d3d',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: alpha('#7b68ee', 0.05)
            }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <MdSearch color="#7b68ee" size={24} />
                    <Typography variant="h6" fontWeight={900}>Advanced Audit Engine</Typography>
                </Stack>
                <IconButton onClick={onClose} size="small" sx={{ color: '#aaa' }}>
                    <MdClose />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ color: '#7b68ee', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Search Parameters
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Subscriber SLID"
                                placeholder="e.g. SLID-123456"
                                value={fields.slid}
                                onChange={(e) => setFields({ ...fields, slid: e.target.value })}
                                variant="outlined"
                                size="small"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        color: '#fff',
                                        '& fieldset': { borderColor: '#3d3d3d' },
                                    },
                                    '& .MuiInputLabel-root': { color: '#aaa' }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="GAIA Transaction ID"
                                placeholder="e.g. GAIA-A1B2C3"
                                value={fields.gaiaId}
                                onChange={(e) => setFields({ ...fields, gaiaId: e.target.value })}
                                variant="outlined"
                                size="small"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        color: '#fff',
                                        '& fieldset': { borderColor: '#3d3d3d' },
                                    },
                                    '& .MuiInputLabel-root': { color: '#aaa' }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Request Number / Ticket ID"
                                placeholder="Exact numerical ID"
                                value={fields.requestNumber}
                                onChange={(e) => setFields({ ...fields, requestNumber: e.target.value })}
                                variant="outlined"
                                size="small"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        color: '#fff',
                                        '& fieldset': { borderColor: '#3d3d3d' },
                                    },
                                    '& .MuiInputLabel-root': { color: '#aaa' }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Customer Name"
                                placeholder="Search by full or partial name"
                                value={fields.customerName}
                                onChange={(e) => setFields({ ...fields, customerName: e.target.value })}
                                variant="outlined"
                                size="small"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        color: '#fff',
                                        '& fieldset': { borderColor: '#3d3d3d' },
                                    },
                                    '& .MuiInputLabel-root': { color: '#aaa' }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Contact Number"
                                placeholder="e.g. 05XXXXXXXX"
                                value={fields.contactNumber}
                                onChange={(e) => setFields({ ...fields, contactNumber: e.target.value })}
                                variant="outlined"
                                size="small"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        color: '#fff',
                                        '& fieldset': { borderColor: '#3d3d3d' },
                                    },
                                    '& .MuiInputLabel-root': { color: '#aaa' }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Team Name / Company"
                                placeholder="e.g. Team Alpha / Nokia"
                                value={fields.teamName}
                                onChange={(e) => setFields({ ...fields, teamName: e.target.value })}
                                variant="outlined"
                                size="small"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        color: '#fff',
                                        '& fieldset': { borderColor: '#3d3d3d' },
                                    },
                                    '& .MuiInputLabel-root': { color: '#aaa' }
                                }}
                            />
                        </Grid>
                    </Grid>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3, borderTop: '1px solid #3d3d3d', bgcolor: alpha('#000', 0.2) }}>
                <Button
                    onClick={onClear}
                    sx={{ color: '#aaa', fontWeight: 900 }}
                >
                    CLEAR ENGINE
                </Button>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                    variant="contained"
                    onClick={onInitiate}
                    sx={{
                        bgcolor: '#7b68ee',
                        fontWeight: 900,
                        px: 4,
                        '&:hover': { bgcolor: '#6854d9' }
                    }}
                >
                    INITIATE SEARCH
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AdvancedSearch;
