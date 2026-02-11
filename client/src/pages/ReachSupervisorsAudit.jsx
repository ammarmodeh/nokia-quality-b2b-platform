import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Button,
    Paper,
    Stack,
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
    IconButton,
    Tooltip,
    Chip,
    useTheme,
    alpha,
    LinearProgress,
} from "@mui/material";
import {
    CloudUpload as UploadIcon,
    Description as FileIcon,
    Delete as DeleteIcon,
    CheckCircle as CheckIcon,
    History as HistoryIcon,
    Storage as StorageIcon,
} from "@mui/icons-material";
import { toast } from "sonner";
import api from "../api/api";
import moment from "moment";
import { MoonLoader } from "react-spinners";

const ReachSupervisorsAudit = () => {
    const theme = useTheme();
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [committing, setCommitting] = useState(false);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
            const res = await api.get("/tasks/audit-logs?auditType=ReachSupervisors", {
                headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            setAuditLogs(res.data);
        } catch (error) {
            console.error("Error fetching Reach logs:", error);
            toast.error("Failed to load audit history");
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return toast.error("Please select a file first");

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await api.post("/tasks/upload-reach-audit", formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                    "Content-Type": "multipart/form-data",
                },
            });
            setPreviewData(res.data);
            toast.success("File uploaded successfully. Check the preview below.");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error(error.response?.data?.error || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleCommit = async () => {
        if (!previewData) return;

        setCommitting(true);
        try {
            await api.post("/tasks/commit-reach-audit",
                { auditId: previewData.auditId },
                { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
            );
            toast.success(`Successfully imported ${previewData.records.length} records!`);
            setPreviewData(null);
            setFile(null);
            fetchLogs();
        } catch (error) {
            console.error("Commit error:", error);
            toast.error("Failed to commit data");
        } finally {
            setCommitting(false);
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
            <Stack spacing={4}>
                {/* Header */}
                <Box>
                    <Typography variant="h4" fontWeight="800" gutterBottom sx={{ color: 'grey.100' }}>
                        Reach Supervisors Audit
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Upload and manage customer issue audit sheets specifically for the Reach Supervisors team.
                    </Typography>
                </Box>

                {/* Upload Section */}
                <Paper
                    sx={{
                        p: 4,
                        bgcolor: '#1a1a1a',
                        borderRadius: 4,
                        border: '2px dashed #333',
                        textAlign: 'center',
                        transition: 'all 0.3s ease',
                        '&:hover': { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.05) }
                    }}
                >
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        id="audit-upload"
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                    />
                    <label htmlFor="audit-upload">
                        <Stack spacing={2} alignItems="center" sx={{ cursor: 'pointer' }}>
                            <UploadIcon sx={{ fontSize: 60, color: file ? 'primary.main' : 'grey.600' }} />
                            <Box>
                                <Typography variant="h6" color="grey.200">
                                    {file ? file.name : "Click to select Reach Supervisor Audit Sheet"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Supported formats: XLSX, XLS (Max 10MB)
                                </Typography>
                            </Box>
                        </Stack>
                    </label>

                    {file && !previewData && (
                        <Box sx={{ mt: 3 }}>
                            <Button
                                variant="contained"
                                onClick={handleUpload}
                                disabled={uploading}
                                startIcon={uploading ? <MoonLoader size={15} color="white" /> : <UploadIcon />}
                                sx={{
                                    borderRadius: 2,
                                    px: 4,
                                    py: 1,
                                    textTransform: 'none',
                                    fontWeight: 'bold',
                                    boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`
                                }}
                            >
                                {uploading ? "Uploading..." : "Upload & Preview"}
                            </Button>
                        </Box>
                    )}
                </Paper>

                {/* Preview Section */}
                {previewData && (
                    <Paper sx={{ p: 3, bgcolor: '#1a1a1a', borderRadius: 4 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <CheckIcon color="success" />
                                <Typography variant="h6" color="grey.100">
                                    Data Preview ({previewData.records.length} rows found)
                                </Typography>
                            </Stack>
                            <Stack direction="row" spacing={2}>
                                <Button
                                    color="inherit"
                                    onClick={() => setPreviewData(null)}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="contained"
                                    color="success"
                                    onClick={handleCommit}
                                    disabled={committing}
                                    startIcon={committing && <MoonLoader size={15} color="white" />}
                                    sx={{ textTransform: 'none', fontWeight: 'bold' }}
                                >
                                    Commit to Reach Repository
                                </Button>
                            </Stack>
                        </Stack>

                        <TableContainer sx={{ maxHeight: 400, borderRadius: 2, border: '1px solid #333' }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        {Object.keys(previewData.records[0]).filter(k => !k.startsWith('_')).map(key => (
                                            <TableCell key={key} sx={{ bgcolor: '#262626', fontWeight: 'bold', color: 'primary.main' }}>
                                                {key}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {previewData.records.slice(0, 50).map((row, idx) => (
                                        <TableRow key={idx}>
                                            {Object.entries(row).filter(([k]) => !k.startsWith('_')).map(([key, val], vIdx) => (
                                                <TableCell key={vIdx} sx={{ color: 'grey.300', borderBottom: '1px solid #262626' }}>
                                                    {String(val)}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {previewData.records.length > 50 && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                * Showing first 50 rows for preview
                            </Typography>
                        )}
                    </Paper>
                )}

                {/* History Section */}
                <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                        <HistoryIcon color="primary" />
                        <Typography variant="h6" color="grey.100" fontWeight="bold">
                            Upload History
                        </Typography>
                    </Stack>

                    <Paper sx={{ bgcolor: '#1a1a1a', borderRadius: 4, overflow: 'hidden' }}>
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: '#262626' }}>
                                    <TableRow>
                                        <TableCell sx={{ color: 'grey.400', fontWeight: 'bold' }}>Filename</TableCell>
                                        <TableCell sx={{ color: 'grey.400', fontWeight: 'bold' }}>Date</TableCell>
                                        <TableCell sx={{ color: 'grey.400', fontWeight: 'bold' }}>Status</TableCell>
                                        <TableCell sx={{ color: 'grey.400', fontWeight: 'bold' }}>Records</TableCell>
                                        <TableCell sx={{ color: 'grey.400', fontWeight: 'bold' }}>Uploaded By</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loadingLogs ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                                <MoonLoader size={30} color={theme.palette.primary.main} />
                                            </TableCell>
                                        </TableRow>
                                    ) : auditLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                                No upload history found for Reach Supervisors.
                                            </TableCell>
                                        </TableRow>
                                    ) : auditLogs.map((log) => (
                                        <TableRow key={log._id} hover sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) } }}>
                                            <TableCell sx={{ borderBottom: '1px solid #262626' }}>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <FileIcon sx={{ color: 'grey.500' }} />
                                                    <Typography variant="body2" color="grey.200">{log.originalName}</Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell sx={{ color: 'grey.400', borderBottom: '1px solid #262626' }}>
                                                {moment(log.createdAt).format("MMM DD, YYYY HH:mm")}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #262626' }}>
                                                <Chip
                                                    label={log.status}
                                                    size="small"
                                                    color={log.status === 'Imported' ? 'success' : 'warning'}
                                                    variant="outlined"
                                                    sx={{ fontWeight: 'bold' }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ color: 'grey.300', fontWeight: 'bold', borderBottom: '1px solid #262626' }}>
                                                {log.importStats?.updatedTasks || log.importStats?.totalRows || 0}
                                            </TableCell>
                                            <TableCell sx={{ color: 'grey.400', borderBottom: '1px solid #262626' }}>
                                                {log.uploadedBy?.name || "Unknown"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>
            </Stack>
        </Box>
    );
};

export default ReachSupervisorsAudit;
