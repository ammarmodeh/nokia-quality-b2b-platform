import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Breadcrumbs,
  Link,
  Grid,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Button,
  useMediaQuery,
  TableHead,
  Radio,
  DialogActions,
  TextField,
} from "@mui/material";
import {
  NavigateNext as NavigateNextIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  ErrorOutline as ErrorIcon,
  VerifiedUser as VerifiedIcon,
  ContentPaste as ReportIcon,
  Visibility as VisibilityIcon,
  CompareArrows as CompareIcon,
  ArrowForward as ArrowIcon,
  CheckCircle as CheckCircleIcon,
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Undo as UndoIcon,
  AddCircle as AddIcon,
  Delete as DeleteIcon,
  Email as EmailIconUI,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import api from "../api/api";
import { MoonLoader } from "react-spinners";
import moment from "moment";
import * as XLSX from 'xlsx';
import { useNavigate } from "react-router-dom";
import { TaskDetailsDialog } from "../components/TaskDetailsDialog";
import ManagementEmailDialog from "../components/ManagementEmailDialog";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const IssuePreventionAnalytics = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedComparison, setSelectedComparison] = useState(null);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);


  // Excel upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadResults, setUploadResults] = useState(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Audit History & Strategy State
  const [auditHistory, setAuditHistory] = useState([]);
  const [selectedAuditForDeepDive, setSelectedAuditForDeepDive] = useState(null);
  const [deepStats, setDeepStats] = useState(null);
  const [loadingDeepStats, setLoadingDeepStats] = useState(false);
  const [deepAuditRecords, setDeepAuditRecords] = useState([]);
  const [loadingDeepRecords, setLoadingDeepRecords] = useState(false);
  const [deepRecordsPage, setDeepRecordsPage] = useState(1);
  const [totalDeepRecords, setTotalDeepRecords] = useState(0);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showEditRecordDialog, setShowEditRecordDialog] = useState(false);
  const [showAddToTrackerDialog, setShowAddToTrackerDialog] = useState(false);
  const [showEditPeriodDialog, setShowEditPeriodDialog] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState({ id: null, startDate: null, endDate: null });
  const [processingRecordId, setProcessingRecordId] = useState(null);
  const [overlapFilter, setOverlapFilter] = useState('all'); // all, promoters, neutrals, detractors, mismatches
  const [selectedSlidFilter, setSelectedSlidFilter] = useState(null); // For filtering by specific SLID

  const [selectedTaskTickets, setSelectedTaskTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    const fetchTickets = async () => {
      if (showComparisonDialog && selectedComparison) {
        const isAuditSource = !selectedComparison.task;
        const task = isAuditSource ? selectedComparison.linkedTask : selectedComparison.task;

        if (task?._id) {
          setLoadingTickets(true);
          try {
            const res = await api.get(`/tasks/tickets/${task._id}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
            });
            setSelectedTaskTickets(res.data);
          } catch (error) {
            console.error("Error fetching tickets for comparison:", error);
            setSelectedTaskTickets([]);
          } finally {
            setLoadingTickets(false);
          }
        } else {
          setSelectedTaskTickets([]);
        }
      }
    };
    fetchTickets();
  }, [showComparisonDialog, selectedComparison]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await api.get("/tasks/prevention-stats", {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });
      setData(response.data);
    } catch (error) {
      console.error("Error fetching prevention stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditHistory = async () => {
    try {
      const res = await api.get("/tasks/audit-logs", {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      setAuditHistory(res.data);
      // Auto-select latest audit if none selected
      if (res.data.length > 0 && !selectedAuditForDeepDive) {
        handleSelectAuditForDeepDive(res.data[0]);
      }
    } catch (error) {
      console.error("Error fetching audit history:", error);
    }
  };

  const handleSelectAuditForDeepDive = async (audit) => {
    setSelectedAuditForDeepDive(audit);
    setLoadingDeepStats(true);
    setDeepStats(null);
    try {
      const statsRes = await api.get(`/tasks/audit-stats/${audit._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });
      setDeepStats(statsRes.data);
      fetchDeepAuditRecords(audit._id, 1);
    } catch (err) {
      console.error("Error fetching deep stats:", err);
    } finally {
      setLoadingDeepStats(false);
    }
  };

  const fetchDeepAuditRecords = async (auditId, page) => {
    setLoadingDeepRecords(true);
    try {
      // Fetch all records (limit=0) to ensure the grid shows everything
      const res = await api.get(`/tasks/audit-records/${auditId}?page=1&limit=0`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });
      setDeepAuditRecords(res.data.records);
      setTotalDeepRecords(res.data.totalRecords);
      // setDeepRecordsPage(1); // Page is usually 1 when limit is 0
    } catch (err) {
      console.error("Error fetching audit records:", err);
    } finally {
      setLoadingDeepRecords(false);
    }
  };

  const handleDownloadAudit = async (id, originalName) => {
    try {
      const response = await api.get(`/tasks/audit-sheet/${id}/download`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Failed to download file");
    }
  };

  const handleUpdateAuditRecord = async (recordId, updates) => {
    try {
      await api.put(`/tasks/audit-records/${recordId}`, updates, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });
      // Refresh data
      if (selectedAuditForDeepDive) {
        fetchDeepAuditRecords(selectedAuditForDeepDive._id, deepRecordsPage);
      }
      setShowEditRecordDialog(false);
      setEditingRecord(null);
    } catch (error) {
      console.error("Error updating record:", error);
      alert("Failed to update record");
    }
  };

  const handleProcessManual = async (recordId, taskData) => {
    setProcessingRecordId(recordId);
    try {
      await api.post(`/tasks/audit-records/${recordId}/process-manual`, { taskData }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });
      if (selectedAuditForDeepDive) {
        fetchDeepAuditRecords(selectedAuditForDeepDive._id, deepRecordsPage);
      }
      fetchStats(); // Refresh global stats
      alert("Task created and linked successfully!");
    } catch (error) {
      console.error("Error processing record:", error);
      alert(error.response?.data?.error || "Failed to process record");
    } finally {
      setProcessingRecordId(null);
    }
  };

  const handleUpdateAuditDates = async () => {
    try {
      await api.put(`/tasks/update-audit-dates/${editingPeriod.id}`, {
        startDate: editingPeriod.startDate,
        endDate: editingPeriod.endDate
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });
      setShowEditPeriodDialog(false);
      fetchAuditHistory();
      // If the selected audit is the one we updated, refresh deep stats
      if (selectedAuditForDeepDive?._id === editingPeriod.id) {
        handleSelectAuditForDeepDive({ ...selectedAuditForDeepDive, startDate: editingPeriod.startDate, endDate: editingPeriod.endDate });
      }
      alert("Audit period updated successfully!");
    } catch (error) {
      alert("Failed to update audit dates");
    }
  };

  const handleDeleteAuditDates = async (auditId) => {
    if (!window.confirm("Are you sure you want to remove the custom period for this audit?")) return;
    try {
      await api.put(`/tasks/update-audit-dates/${auditId}`, {
        startDate: null,
        endDate: null
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });
      fetchAuditHistory();
      if (selectedAuditForDeepDive?._id === auditId) {
        handleSelectAuditForDeepDive({ ...selectedAuditForDeepDive, startDate: null, endDate: null });
      }
      alert("Audit period removed.");
    } catch (error) {
      alert("Failed to remove audit dates");
    }
  };

  const handleDeleteAudit = async (id) => {
    if (!window.confirm("Are you sure you want to delete this audit log? This will also delete all associated records and the physical file. This action cannot be undone.")) return;

    try {
      await api.delete(`/tasks/audit-logs/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      alert("Audit log deleted successfully!");
      fetchAuditHistory();
      // If the deleted audit was selected for deep dive, clear it
      if (selectedAuditForDeepDive?._id === id) {
        setSelectedAuditForDeepDive(null);
        setDeepStats(null);
        setDeepAuditRecords([]);
      }
    } catch (error) {
      console.error("Error deleting audit log:", error);
      alert(error.response?.data?.error || "Failed to delete audit log");
    }
  };


  const handleRevertRecord = async (recordId) => {
    if (!window.confirm("Are you sure you want to revert this action? This will delete any manually created task linked to this record.")) return;

    setProcessingRecordId(recordId);
    try {
      await api.post(`/tasks/audit-records/${recordId}/revert`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
      });
      if (selectedAuditForDeepDive) {
        fetchDeepAuditRecords(selectedAuditForDeepDive._id, deepRecordsPage);
      }
      fetchStats(); // Refresh global stats
    } catch (error) {
      console.error("Error reverting record:", error);
      alert("Failed to revert action");
    } finally {
      setProcessingRecordId(null);
    }
  };

  const handleExportFilteredData = () => {
    if (!selectedAuditForDeepDive || deepAuditRecords.length === 0) {
      alert("No audit data to export");
      return;
    }

    // Get the currently filtered rows (same logic as the DataGrid)
    const baseRows = deepAuditRecords;

    // Apply SLID filter if selected
    let filteredRows = baseRows;
    if (selectedSlidFilter) {
      filteredRows = baseRows.filter(row => row.slid === selectedSlidFilter);
    }

    // Apply category filter
    if (overlapFilter !== 'all' && deepStats?.manualOverlapStats?.slidLists) {
      const { promoters, neutrals, detractors } = deepStats.manualOverlapStats.slidLists;
      filteredRows = filteredRows.filter(row => {
        const rowSlid = row.slid;
        if (overlapFilter === 'promoters') return promoters.includes(rowSlid);
        if (overlapFilter === 'neutrals') return neutrals.includes(rowSlid);
        if (overlapFilter === 'detractors') return detractors.includes(rowSlid);
        return true;
      });
    }

    // Prepare data for export
    const exportData = filteredRows.map(row => ({
      'SLID': row.slid || '-',
      'NPS Score': row.evaluationScore || '-',
      'Customer Feedback': row.customerFeedback || '-',
      'Status': row.status || 'Pending',
      'Match': row.isMatched ? 'Yes' : 'No',
      'Reporter Note': row.matchedIssues?.[0]?.reporterNote || '-',
      'Matched Source': row.matchedIssues?.[0]?.sourceType || 'Manual (OJO)',
      'Match SLID': row.matchedIssues?.[0]?.slid || '-'
    }));

    // Create worksheet and workbook
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Data');

    // Generate filename with period and filter info
    const periodInfo = selectedAuditForDeepDive.startDate
      ? `${moment(selectedAuditForDeepDive.startDate).format("MMM-DD")}_to_${moment(selectedAuditForDeepDive.endDate).format("MMM-DD-YYYY")}`
      : moment(selectedAuditForDeepDive.createdAt).format("MMM-DD-YYYY");
    const filterInfo = overlapFilter !== 'all' ? `_${overlapFilter}` : '';
    const slidInfo = selectedSlidFilter ? `_SLID-${selectedSlidFilter}` : '';
    const filename = `Audit_${periodInfo}${filterInfo}${slidInfo}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);
  };

  useEffect(() => {
    fetchStats();
    fetchAuditHistory();
  }, []);

  const handleUploadExcel = async (file) => {
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post("/tasks/upload-audit-sheet", formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadResults(response.data);
      setShowUploadDialog(true);
      fetchAuditHistory(); // Refresh history list after upload
    } catch (error) {
      console.error("Error uploading Excel:", error);
      setUploadError(error.response?.data?.error || error.message || "Failed to upload file");
    } finally {
      setUploading(false);
      setUploadedFile(null);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      handleUploadExcel(file);
    }
  };

  // ... (skipping unchanged code) ...


  const auditOverlapColumns = [
    {
      field: "slid",
      headerName: "SLID",
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: "interviewDate",
      headerName: "Interview Date",
      width: 150,
      valueGetter: (value, row) => row.interviewDate || row.linkedTask?.interviewDate || null,
      valueFormatter: (value) => value ? moment(value).format("MMM DD, YYYY") : "-",
    },
    {
      field: "evaluationScore",
      headerName: "Audit Score",
      width: 100,
      renderCell: (params) => {
        const score = params.value;
        if (score === undefined || score === null) return "-";
        let color = "#d32f2f";
        if (score >= 9) color = "#2e7d32";
        else if (score >= 7) color = "#ed6c02";

        return (
          <Chip
            label={score}
            size="small"
            sx={{ backgroundColor: color, color: "white", fontWeight: "bold" }}
          />
        );
      }
    },
    {
      field: "trackerScore",
      headerName: "Tracker Score",
      width: 120,
      valueGetter: (value, row) => row.linkedTask?.evaluationScore ?? null,
      renderCell: (params) => {
        const score = params.value;
        if (score === undefined || score === null) return "-";
        let color = alpha("#d32f2f", 0.8);
        if (score >= 9) color = alpha("#2e7d32", 0.8);
        else if (score >= 7) color = alpha("#ed6c02", 0.8);

        return (
          <Chip
            label={score}
            size="small"
            sx={{
              backgroundColor: alpha(color, 0.1),
              color: color,
              borderColor: color,
              border: '1px solid',
              fontWeight: "bold"
            }}
          />
        );
      }
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => {
        const status = params.value || 'Pending';
        let color = 'default';
        if (status === 'Imported') color = 'success';
        if (status === 'Manually Added') color = 'info';
        if (status === 'Ignored') color = 'error';

        return <Chip label={status} size="small" color={color} variant="outlined" />;
      }
    },
    {
      field: "isMatched",
      headerName: "Match",
      width: 100,
      renderCell: (params) => (
        <Chip
          icon={params.value ? <CheckCircleIcon /> : <CloseIcon />}
          label={params.value ? "Yes" : "No"}
          size="small"
          color={params.value ? "success" : "warning"}
        />
      )
    },
    {
      field: "reporterNote",
      headerName: "Reporter Note",
      width: 250,
      valueGetter: (value, row) => row.matchedIssues?.[0]?.reporterNote || "-",
    },
    {
      field: "sourceType",
      headerName: "Matched Source",
      width: 180,
      valueGetter: (value, row) => row.matchedIssues?.[0]?.sourceType || "Manual (OJO)",
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            bgcolor: alpha(params.value.includes('Reach') ? theme.palette.info.main : theme.palette.primary.main, 0.1),
            color: params.value.includes('Reach') ? 'info.main' : 'primary.main',
            border: '1px solid',
            borderColor: params.value.includes('Reach') ? 'info.main' : 'primary.main',
          }}
        />
      )
    },
    {
      field: "matchedTransaction",
      headerName: "Match SLID",
      width: 150,
      valueGetter: (value, row) => row.matchedIssues?.[0]?.slid || "-",
    },
    {
      field: "customerFeedback",
      headerName: "Feedback",
      width: 300,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Compare Detail">
            <IconButton
              size="small"
              onClick={() => {
                setSelectedComparison(params.row);
                setShowComparisonDialog(true);
              }}
              sx={{ color: theme.palette.info.main }}
            >
              <CompareIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Record">
            <IconButton
              size="small"
              onClick={() => {
                setEditingRecord(params.row);
                setShowEditRecordDialog(true);
              }}
              sx={{ color: theme.palette.primary.main }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.status === 'Pending' ? (
            <Tooltip title="Add to Tracker">
              <IconButton
                size="small"
                onClick={() => {
                  setEditingRecord(params.row);
                  setShowAddToTrackerDialog(true);
                }}
                sx={{ color: theme.palette.success.main }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Undo Processing">
              <IconButton
                size="small"
                onClick={() => handleRevertRecord(params.row._id)}
                disabled={processingRecordId === params.row._id}
                sx={{ color: theme.palette.error.main }}
              >
                <UndoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      )
    }
  ];

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <MoonLoader color={theme.palette.primary.main} size={50} />
      </Box>
    );
  }


  return (
    <Box sx={{ pt: 3, pb: 6, px: 2 }}>
      {/* Header */}
      <Box mb={4}>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 1 }}>
          <Link underline="hover" color="inherit" href="/" sx={{ display: 'flex', alignItems: 'center' }}>
            Home
          </Link>
          <Typography color="text.primary">Analytics</Typography>
          <Typography color="text.primary" sx={{ fontWeight: 'bold' }}>Issue Prevention</Typography>
        </Breadcrumbs>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Avatar sx={{ bgcolor: theme.palette.success.main, width: 56, height: 56 }}>
            <VerifiedIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" fontWeight="800" color="text.primary">
              Issue Prevention Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cross-referencing reported issues with subsequent Detractor/Neutral outcomes to improve service delivery.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={uploading ? <MoonLoader size={16} color={theme.palette.secondary.main} /> : <UploadIcon />}
              component="label"
              disabled={uploading}
              sx={{
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 'bold',
                px: 3,
                height: 48,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                }
              }}
            >
              {uploading ? 'Uploading...' : 'Upload Audit Sheet'}
              <input
                type="file"
                hidden
                accept=".xlsx,.xls,.xlsm"
                onChange={handleFileSelect}
              />
            </Button>

            <Button
              variant="contained"
              color="primary"
              startIcon={<EmailIconUI />}
              onClick={() => setShowEmailDialog(true)}
              sx={{
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 'bold',
                px: 3,
                height: 48,
                boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
                '&:hover': {
                  boxShadow: `0 12px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                }
              }}
            >
              Generate Report
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Upload Error Display */}
      {uploadError && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            bgcolor: alpha(theme.palette.error.main, 0.1),
            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
            borderRadius: 2
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <ErrorIcon color="error" />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2" color="error" fontWeight="bold">
                Upload Error
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {uploadError}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setUploadError(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Paper>
      )}


      {/* Recent Audit Activity Section starts here */}



      {/* Audit Upload Activity & Stats */}
      <Box mt={10} mb={5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h6" fontWeight="700">
              Recent Audit Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track past Excel uploads and their data integration status.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<TimelineIcon />}
            onClick={() => fetchAuditHistory()}
          >
            Refresh History
          </Button>
        </Stack>

        <Paper sx={{ p: 0, borderRadius: 4, bgcolor: '#1a1a1a', border: '1px solid #333', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#262626' }}>
                <TableCell sx={{ color: 'grey.100', fontWeight: 'bold', py: 2, width: 50 }}>Select</TableCell>
                <TableCell sx={{ color: 'grey.100', fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ color: 'grey.100', fontWeight: 'bold' }}>Filename</TableCell>
                <TableCell sx={{ color: 'grey.100', fontWeight: 'bold' }}>Audit Period</TableCell>
                <TableCell sx={{ color: 'grey.100', fontWeight: 'bold' }}>Uploaded By</TableCell>
                <TableCell sx={{ color: 'grey.100', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: 'grey.100', fontWeight: 'bold' }}>Stats</TableCell>
                <TableCell sx={{ color: 'grey.100', fontWeight: 'bold', textAlign: 'right', pr: 3 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {auditHistory.map((log) => (
                <TableRow
                  key={log._id}
                  selected={selectedAuditForDeepDive?._id === log._id}
                  sx={{
                    '& td': { color: 'grey.300', borderBottom: '1px solid #333', py: 2 },
                    cursor: 'pointer',
                    '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }
                  }}
                  onClick={() => handleSelectAuditForDeepDive(log)}
                >
                  <TableCell padding="checkbox">
                    <Radio
                      checked={selectedAuditForDeepDive?._id === log._id}
                      onChange={() => handleSelectAuditForDeepDive(log)}
                      size="small"
                      sx={{ color: 'primary.main', '&.Mui-checked': { color: 'primary.main' } }}
                    />
                  </TableCell>
                  <TableCell>{moment(log.createdAt).format("MMM DD, YYYY HH:mm")}</TableCell>
                  <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.originalName}
                  </TableCell>
                  <TableCell>
                    {log.startDate && log.endDate ? (
                      <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        {moment(log.startDate).format("DD/MM")} - {moment(log.endDate).format("DD/MM")}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">Not Set</Typography>
                    )}
                  </TableCell>
                  <TableCell>{log.uploadedBy?.name || 'Unknown'}</TableCell>
                  <TableCell>
                    <Chip
                      label={log.status}
                      size="small"
                      color={log.status === 'Imported' ? 'success' : 'default'}
                      variant="filled"
                      sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    {log.status === 'Imported' && log.importStats ? (
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ borderRight: '1px solid #333', pr: 1.5 }}>
                          <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold', display: 'block' }}>
                            {log.importStats.updatedTasks}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', display: 'block' }}>
                            Tasks Updated
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 'bold', display: 'block' }}>
                            {log.importStats.matchedRows || 0}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', display: 'block' }}>
                            Issue Overlaps
                          </Typography>
                        </Box>
                        <Box sx={{ pl: 1, borderLeft: '1px solid #333' }}>
                          <Typography variant="caption" color="text.secondary">
                            from {log.importStats.totalRows} rows
                          </Typography>
                        </Box>
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {log.importStats?.totalRows || '-'} rows pending
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ pr: 3 }}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                      <Tooltip title="Edit Period">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingPeriod({ id: log._id, startDate: log.startDate, endDate: log.endDate });
                            setShowEditPeriodDialog(true);
                          }}
                          sx={{ color: 'primary.main', p: 0.5 }}
                        >
                          <EditIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Tooltip>
                      {log.startDate && (
                        <Tooltip title="Remove Period">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteAuditDates(log._id)}
                            sx={{ color: 'error.main', p: 0.5 }}
                          >
                            <DeleteIcon sx={{ fontSize: '1rem' }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleSelectAuditForDeepDive(log)}
                        sx={{ textTransform: 'none', ml: 1, px: 2, height: 28, fontSize: '0.75rem' }}
                      >
                        Deep Dive
                      </Button>
                      <Tooltip title="Download Original">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadAudit(log._id, log.originalName);
                          }}
                          sx={{ color: 'grey.500', p: 0.5 }}
                        >
                          <UploadIcon sx={{ transform: 'rotate(180deg)', fontSize: '1rem' }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Audit">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAudit(log._id);
                          }}
                          sx={{ color: 'error.main', p: 0.5 }}
                        >
                          <DeleteIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Tooltip>

                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {auditHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Stack spacing={1} alignItems="center">
                      <Typography color="text.secondary">No audit activity found.</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Upload an Excel sheet to see history.
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      {/* Audit Deep Analysis Section */}
      {selectedAuditForDeepDive && (
        <Box mt={10} mb={10}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Typography variant="h5" fontWeight="800" color="primary">
                Audit Deep Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Detailed insights for: <strong>{selectedAuditForDeepDive.originalName}</strong>
              </Typography>
            </Box>
            {loadingDeepStats && <MoonLoader size={20} color={theme.palette.primary.main} />}
          </Stack>

          {deepStats?.noRecords ? (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#1a1a1a', borderRadius: 4, border: '1px solid #333' }}>
              <Typography color="warning.main" fontWeight="bold" gutterBottom>
                No Row-Level Data Available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {deepStats.message}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Deep analytics are only available for Excel regular files uploaded after this feature implementation.
              </Typography>
            </Paper>
          ) : deepStats && (
            <>
              <Grid container spacing={3} mb={5}>
                {/* NPS Comparison Card */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', border: '1px solid #333', height: '100%' }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssessmentIcon fontSize="small" /> Audit NPS Score
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                      {selectedAuditForDeepDive.startDate ? (
                        `Period: ${moment(selectedAuditForDeepDive.startDate).format("MMM DD")} - ${moment(selectedAuditForDeepDive.endDate).format("MMM DD, YYYY")}`
                      ) : (
                        "No specific period defined for this audit."
                      )}
                    </Typography>

                    <Stack direction="row" spacing={4} mt={2} justifyContent="center" alignItems="center">
                      {/* Audit NPS */}
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h3" fontWeight="bold" color="primary">
                          {Math.round(deepStats.npsData.score)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">from {deepStats.npsData.validSample} samples</Typography>
                        <Stack direction="row" spacing={0.5} justifyContent="center" mt={1}>
                          <Tooltip title="Promoters"><Chip label={deepStats.npsData.promoters} size="small" sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main', height: 20, fontSize: '0.65rem' }} /></Tooltip>
                          <Tooltip title="Neutrals"><Chip label={deepStats.npsData.neutrals} size="small" sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main', height: 20, fontSize: '0.65rem' }} /></Tooltip>
                          <Tooltip title="Detractors"><Chip label={deepStats.npsData.detractors} size="small" sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main', height: 20, fontSize: '0.65rem' }} /></Tooltip>
                        </Stack>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>

                {/* Match & Gap Analysis */}
                <Grid item xs={12} md={3}>
                  <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', border: '1px solid #333', height: '100%' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Match & Coverage Gaps</Typography>
                    <Stack spacing={2} mt={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Issue Overlaps:</Typography>
                        <Typography variant="body2" fontWeight="bold" color="success.main">{deepStats.summary.matched}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Match Rate:</Typography>
                        <Typography variant="body2" fontWeight="bold">{Math.round(deepStats.summary.matchRate)}%</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>

                {/* DVOC Metrics */}
                <Grid item xs={12} md={3}>
                  <Paper sx={{ p: 3, borderRadius: 4, bgcolor: '#1a1a1a', border: '1px solid #333', height: '100%' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>DVOC Alignment</Typography>
                    <Stack spacing={1.5} mt={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption">ITN Related:</Typography>
                        <Typography variant="caption" fontWeight="bold">{deepStats.dvocMetrics.itnRelated}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption">Promoters %:</Typography>
                        <Typography variant="caption" fontWeight="bold" color="success.main">{Math.round(deepStats.dvocMetrics.promotersPercentage)}%</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption">Detractors %:</Typography>
                        <Typography variant="caption" fontWeight="bold" color="error.main">{Math.round(deepStats.dvocMetrics.detractorsPercentage)}%</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
              {/* Redundant table removed - integrated into Overlapping Case Details below */}
            </>
          )}
        </Box>
      )}


      {/* Prevention Trend Analysis (Commented out in original) */}
      {/* <Box my={5}> ... </Box> */}

      {/* Detailed Overlap Table */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h6" fontWeight="700">
              Overlapping Case Details
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Managing cross-referenced issues between the selected audit sheet and the tracker.
            </Typography>
          </Box>
        </Stack>

        {deepStats?.manualOverlapStats && (
          <Paper sx={{ p: 2, mb: 3, borderRadius: 3, bgcolor: alpha(theme.palette.secondary.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.secondary.main, 0.2) }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold', mb: 0.5 }}>
                  MANUAL (OJO) OVERLAP NPS
                </Typography>
                <Stack direction="row" spacing={1} alignItems="baseline">
                  <Typography variant="h4" fontWeight="bold" color="secondary.main">
                    {Math.round(deepStats.manualOverlapStats.score)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    from {deepStats.manualOverlapStats.totalMatched} issue overlaps
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={3} justifyContent="center" sx={{ mb: 2 }}>
                  <Box textAlign="center">
                    <Typography variant="h6" color="success.main" fontWeight="bold">
                      {deepStats.manualOverlapStats.promoters}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Promoters (9-10)</Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h6" color="warning.main" fontWeight="bold">
                      {deepStats.manualOverlapStats.neutrals}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Neutrals (7-8)</Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h6" color="error.main" fontWeight="bold">
                      {deepStats.manualOverlapStats.detractors}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Detractors (1-6)</Typography>
                  </Box>
                  {deepStats?.manualOverlapStats?.unscored > 0 && (
                    <Box textAlign="center">
                      <Typography variant="h6" color="grey.500" fontWeight="bold">
                        {deepStats.manualOverlapStats.unscored}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Unscored</Typography>
                    </Box>
                  )}
                </Stack>
              </Grid>
              <Grid item xs={12} md={3} textAlign="right">
                <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, border: '1px dashed #444', display: 'inline-block', minWidth: 120 }}>
                  <Typography variant="caption" color="text.secondary" display="block">Overlap Identification</Typography>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                    {Math.round(deepStats.summary.matchRate)}% Match
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {deepStats?.manualOverlapStats?.slidLists && (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #333' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Matched SLID Breakdown (Click to filter):
                  </Typography>
                  {selectedSlidFilter && (
                    <Button
                      size="small"
                      startIcon={<CloseIcon />}
                      onClick={() => setSelectedSlidFilter(null)}
                      sx={{
                        textTransform: 'none',
                        fontSize: '0.7rem',
                        color: 'warning.main',
                        '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.1) }
                      }}
                    >
                      Clear Filter: {selectedSlidFilter}
                    </Button>
                  )}
                </Stack>
                <Grid container spacing={2}>
                  {[
                    { label: 'Promoters', slids: deepStats.manualOverlapStats.slidLists.promoters, color: 'success.main' },
                    { label: 'Neutrals', slids: deepStats.manualOverlapStats.slidLists.neutrals, color: 'warning.main' },
                    { label: 'Detractors', slids: deepStats.manualOverlapStats.slidLists.detractors, color: 'error.main' }
                  ].map((group) => (
                    <Grid item xs={12} md={4} key={group.label}>
                      <Paper sx={{ p: 1.5, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, border: '1px solid #333' }}>
                        <Typography variant="caption" sx={{ color: group.color, fontWeight: 'bold', mb: 1, display: 'block' }}>
                          {group.label} ({group.slids.length})
                        </Typography>
                        <Box sx={{ maxHeight: 100, overflowY: 'auto', pr: 1, '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: '#444', borderRadius: '4px' } }}>
                          {group.slids.length > 0 ? (
                            <Stack spacing={0.5}>
                              {group.slids.map(slid => (
                                <Chip
                                  key={slid}
                                  label={slid}
                                  size="small"
                                  onClick={() => {
                                    setSelectedSlidFilter(slid);
                                    // Scroll to data grid
                                    setTimeout(() => {
                                      document.getElementById('overlap-data-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }, 100);
                                  }}
                                  sx={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.7rem',
                                    height: 20,
                                    cursor: 'pointer',
                                    bgcolor: selectedSlidFilter === slid ? alpha(theme.palette.primary.main, 0.3) : 'rgba(255,255,255,0.05)',
                                    color: selectedSlidFilter === slid ? 'primary.main' : 'grey.400',
                                    border: selectedSlidFilter === slid ? '1px solid' : 'none',
                                    borderColor: 'primary.main',
                                    '&:hover': {
                                      bgcolor: alpha(theme.palette.primary.main, 0.2),
                                      color: 'primary.light'
                                    }
                                  }}
                                />
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>None matched</Typography>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Paper>
        )}

        {/* Professional Filter Chips */}
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: 'grey.500', mr: 1, fontWeight: 'bold', textTransform: 'uppercase' }}>
              Filter By Category:
            </Typography>
            {[
              { id: 'all', label: 'All Cases', color: 'default', icon: <FilterIcon sx={{ fontSize: '1rem' }} /> },
              { id: 'promoters', label: 'Promoters (9-10)', color: 'success' },
              { id: 'neutrals', label: 'Neutrals (7-8)', color: 'warning' },
              { id: 'detractors', label: 'Detractors (1-6)', color: 'error' }
            ].map((chip) => (
              <Tooltip key={chip.id} title={chip.info || ''}>
                <Chip
                  label={chip.label}
                  onClick={() => setOverlapFilter(chip.id)}
                  icon={chip.icon}
                  variant={overlapFilter === chip.id ? 'filled' : 'outlined'}
                  color={chip.color !== 'default' ? chip.color : 'primary'}
                  size="small"
                  sx={{
                    borderRadius: 1.5,
                    fontWeight: overlapFilter === chip.id ? 'bold' : 'normal',
                    transition: 'all 0.2s',
                    '&:hover': { transform: 'translateY(-1px)' }
                  }}
                />
              </Tooltip>
            ))}
          </Box>

          {selectedAuditForDeepDive && (
            <Button
              variant="contained"
              size="small"
              startIcon={<UploadIcon />}
              onClick={handleExportFilteredData}
              sx={{
                textTransform: 'none',
                bgcolor: 'success.main',
                '&:hover': { bgcolor: 'success.dark' }
              }}
            >
              Export to Excel
            </Button>
          )}
        </Box>

        <Paper id="overlap-data-grid" sx={{ height: 600, width: '100%', borderRadius: 4, overflow: 'hidden', bgcolor: '#1a1a1a', border: '1px solid #333' }}>
          <DataGrid
            rows={(() => {
              const baseRows = deepAuditRecords.map((item, idx) => ({ id: item._id, ...item })) || [];

              // First apply SLID filter if selected
              let filteredRows = baseRows;
              if (selectedSlidFilter) {
                filteredRows = baseRows.filter(row => {
                  return row.slid === selectedSlidFilter;
                });
              }

              // Then apply category filter
              if (overlapFilter === 'all') return filteredRows;

              return filteredRows.filter(row => {
                // Use SLID membership in category lists
                if (deepStats?.manualOverlapStats?.slidLists) {
                  const rowSlid = row.slid;
                  const { promoters, neutrals, detractors, unscored } = deepStats.manualOverlapStats.slidLists;

                  if (overlapFilter === 'promoters') return promoters.includes(rowSlid);
                  if (overlapFilter === 'neutrals') return neutrals.includes(rowSlid);
                  if (overlapFilter === 'detractors') return detractors.includes(rowSlid);
                }

                return true;
              });
            })()}
            columns={auditOverlapColumns}
            getRowId={(row) => row.id}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 50 },
              },
            }}
            pageSizeOptions={[10, 25, 50, 100, 1000]}
            checkboxSelection
            disableSelectionOnClick
            slots={{ toolbar: GridToolbar }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                color: 'grey.300',
                borderBottom: '1px solid #333'
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#262626',
                color: 'grey.100',
                fontSize: 14,
                fontWeight: 'bold',
                borderBottom: '2px solid #333'
              },
              '& .MuiDataGrid-footerContainer': {
                backgroundColor: '#262626',
                borderTop: '2px solid #333'
              },
              '& .MuiDataGrid-toolbarContainer': {
                p: 2,
                backgroundColor: '#1a1a1a'
              },
              '& .MuiButton-textPrimary': {
                color: theme.palette.primary.main
              }
            }}
          />
        </Paper>
      </Box>
      <TaskDetailsDialog
        open={showTaskDialog}
        onClose={() => setShowTaskDialog(false)}
        tasks={selectedTask ? [selectedTask] : []}
        teamName={selectedTask?.teamName || "Task Details"}
      />

      {/* Detailed Comparison Dialog */}
      <Dialog
        open={showComparisonDialog}
        onClose={() => setShowComparisonDialog(false)}
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #333', pb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: theme.palette.info.main }}>
              <CompareIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="700">
                Issue Prevention Analysis
              </Typography>
              <Typography variant="caption" color="text.secondary">
                SLID: {selectedComparison?.slid || selectedComparison?.task?.slid || "N/A"}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedComparison && (() => {
            const isAuditSource = !selectedComparison.task;
            const task = isAuditSource ? (selectedComparison.linkedTask || { slid: selectedComparison.slid }) : selectedComparison.task;
            const report = isAuditSource ? (selectedComparison.matchedIssues?.[0] || {}) : selectedComparison.report;
            const auditFeedback = isAuditSource ? selectedComparison.customerFeedback : task.customerFeedback;

            return (
              <Stack spacing={3}>
                {/* Overview Section */}
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={5.5}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                      <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main, width: 24, height: 24, fontSize: 14 }}>
                        <ReportIcon fontSize="small" />
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ color: theme.palette.warning.main, fontWeight: 'bold' }}>Reported Issue</Typography>
                    </Stack>
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.05), border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}` }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{report.issues?.[0]?.category || "N/A"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {report.fromMain || "N/A"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {report.fromSub || ""}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: theme.palette.primary.main, fontWeight: 'bold' }}>
                        Reporter: {report.reporter || "Unknown"}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={1} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <ArrowIcon color="action" />
                  </Grid>

                  <Grid item xs={5.5}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                      <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main, width: 24, height: 24, fontSize: 14 }}>
                        <CheckCircleIcon fontSize="small" />
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ color: theme.palette.success.main, fontWeight: 'bold' }}>Final Resolution</Typography>
                    </Stack>
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.05), border: `1px solid ${alpha(theme.palette.success.main, 0.1)}` }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {(Array.isArray(task.reason) ? task.reason[0] : (task.reason || "N/A"))}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        Sub-Reason: {Array.isArray(task.subReason) ? task.subReason.join(", ") : (task.subReason || "N/A")}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: theme.palette.success.main, fontWeight: 'bold' }}>
                        Root Cause: {Array.isArray(task.rootCause) ? task.rootCause.join(", ") : (task.rootCause || "N/A")}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: theme.palette.primary.main, fontWeight: 'bold' }}>
                        Task Owner: {Array.isArray(task.responsible) ? task.responsible.join(", ") : (task.responsible || "Unassigned")}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Timeline Insight */}
                <Paper sx={{ p: 2, bgcolor: '#262626', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Timeline Analysis
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ color: 'grey.400', border: 'none' }}>PIS Date:</TableCell>
                        <TableCell sx={{ color: 'grey.100', border: 'none', fontWeight: 'bold' }}>
                          {task.pisDate ? moment(task.pisDate).format("MMM DD, YYYY") : "N/A"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'grey.400', border: 'none' }}>Reported Problem:</TableCell>
                        <TableCell sx={{ color: 'grey.100', border: 'none', fontWeight: 'bold' }}>
                          {report.issues?.[0]?.category || "N/A"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'grey.400', border: 'none' }}>First Reported:</TableCell>
                        <TableCell sx={{ color: 'grey.100', border: 'none', fontWeight: 'bold' }}>
                          {(report.date || report.createdAt) ? moment(report.date || report.createdAt).format("MMM DD, YYYY HH:mm") : "N/A"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'grey.400', border: 'none' }}>Interview Date:</TableCell>
                        <TableCell sx={{ color: 'grey.100', border: 'none', fontWeight: 'bold' }}>
                          {task.interviewDate ? moment(task.interviewDate).format("MMM DD, YYYY HH:mm") : "N/A"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'grey.400', border: 'none' }}>Resolved Date:</TableCell>
                        <TableCell sx={{ color: 'grey.100', border: 'none', fontWeight: 'bold' }}>
                          {report.resolveDate ? moment(report.resolveDate).format("MMM DD, YYYY HH:mm") : "N/A"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'grey.400', border: 'none' }}>Technical Delay (Reported vs Resolved):</TableCell>
                        <TableCell sx={{ border: 'none' }}>
                          {(() => {
                            const repDate = report.date || report.createdAt;
                            if (!report.resolveDate || !repDate) return "N/A";
                            const reportDate = moment(repDate).startOf('day');
                            const resolveDate = moment(report.resolveDate).startOf('day');
                            const techDelay = Math.abs(resolveDate.diff(reportDate, 'days'));
                            return (
                              <Chip
                                label={`${techDelay} days`}
                                size="small"
                                variant="outlined"
                                sx={{
                                  color: techDelay > 3 ? "#ed6c02" : "#4caf50",
                                  borderColor: techDelay > 3 ? "#ed6c02" : "#4caf50",
                                  fontWeight: "bold"
                                }}
                              />
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ color: 'grey.400', border: 'none' }}>Prevention Gap (Reported vs Interview):</TableCell>
                        <TableCell sx={{ border: 'none' }}>
                          {(() => {
                            const repDate = report.date || report.createdAt;
                            if (!task.interviewDate || !repDate) return "N/A";
                            const reportDate = moment(repDate).startOf('day');
                            const interviewDate = moment(task.interviewDate).startOf('day');
                            const gap = Math.abs(interviewDate.diff(reportDate, 'days'));
                            return (
                              <Chip
                                label={`${gap} days`}
                                size="small"
                                sx={{
                                  backgroundColor: gap > 7 ? "#d32f2f" : "#ed6c02",
                                  color: "white",
                                  fontWeight: "bold"
                                }}
                              />
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Paper>

                {/* Professional Insights & GAIA */}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: '#262626', borderRadius: 2, height: '100%' }}>
                      <Typography variant="subtitle2" color="success.main" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Professional Insights
                      </Typography>
                      <Stack spacing={1.5}>
                        <Box>
                          <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold' }}>
                            • Severity Assessment:
                          </Typography>
                          <Typography variant="body2" color="grey.300" sx={{ ml: 2 }}>
                            Final NPS Score: <strong>{task.evaluationScore ?? "N/A"}</strong> {task.evaluationScore !== undefined ? `(${task.evaluationScore <= 4 ? 'Detractor' : task.evaluationScore >= 9 ? 'Promoter' : 'Neutral'})` : ""}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold' }}>
                            • Prevention Opportunity:
                          </Typography>
                          <Typography variant="body2" color="grey.300" sx={{ ml: 2 }}>
                            {(() => {
                              const repDate = report.date || report.createdAt;
                              if (!task.interviewDate || !repDate) return "N/A";
                              const reportDate = moment(repDate).startOf('day');
                              const interviewDate = moment(task.interviewDate).startOf('day');
                              const gap = Math.abs(interviewDate.diff(reportDate, 'days'));
                              return gap > 7
                                ? "High - Issue was reported well in advance but escalated to negative feedback."
                                : "Medium - Window between report and interview suggests rapid escalation or missed intervention.";
                            })()}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: '#262626', borderRadius: 2, height: '100%' }}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <VerifiedIcon sx={{ color: task.gaiaCheck === 'Yes' ? '#4caf50' : '#f44336' }} fontSize="small" />
                        <Typography variant="subtitle2" sx={{ color: 'grey.100', fontWeight: 'bold' }}>
                          GAIA Verification
                        </Typography>
                      </Stack>
                      <Box sx={{ p: 1.5, bgcolor: '#1a1a1a', borderRadius: 2, border: '1px solid #333' }}>
                        <Typography variant="caption" color="text.secondary">Status:</Typography>
                        <Typography variant="body2" sx={{ color: task.gaiaCheck === 'Yes' ? '#4caf50' : '#f44336', fontWeight: 'bold', mb: 1 }}>
                          {task.gaiaCheck === 'Yes' ? 'VERIFIED' : task.gaiaCheck === 'No' ? 'NOT VERIFIED' : 'PENDING CHECK'}
                        </Typography>
                        {task.gaiaContent && (
                          <Typography variant="body2" color="grey.400" sx={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                            "{task.gaiaContent}"
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Feedback Comparison */}
                <Paper sx={{ p: 2, bgcolor: '#262626', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="warning.main" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Notes & Feedback Comparison
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ p: 2, bgcolor: '#1a1a1a', borderRadius: 2, border: '1px solid #333', height: '100%' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                          Initial Report (<span style={{ color: '#90caf9' }}>{report.reporter || "Unknown"}</span>)
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'primary.main', fontWeight: 'bold' }}>
                          Source: {report.sourceType || "Manual (OJO Team)"}
                        </Typography>
                        <Typography variant="body2" color="grey.300" sx={{ mt: 1 }}>
                          {report.reporterNote || "No note provided"}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ p: 2, bgcolor: '#1a1a1a', borderRadius: 2, border: '1px solid #333', height: '100%' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                          Final Customer Feedback
                        </Typography>
                        <Typography variant="body2" color="grey.300" sx={{ mt: 1 }}>
                          {auditFeedback || "No feedback provided"}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Q-Ops Transaction Logs */}
                <Paper sx={{ p: 2, bgcolor: '#262626', borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={2} justifyContent="space-between">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TimelineIcon sx={{ color: theme.palette.info.main }} />
                      <Typography variant="subtitle2" color="info.main" sx={{ fontWeight: 'bold' }}>
                        Q-Ops Transaction Logs
                      </Typography>
                    </Stack>
                    {loadingTickets && <MoonLoader size={15} color={theme.palette.info.main} />}
                  </Stack>

                  {selectedTaskTickets.length > 0 ? (
                    <Box sx={{ maxHeight: 300, overflow: 'auto', pr: 1 }}>
                      <Stack spacing={1}>
                        {selectedTaskTickets.map((ticket, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              p: 1.5,
                              bgcolor: '#1a1a1a',
                              borderRadius: 2,
                              border: `1px solid ${ticket.status === 'Closed' ? '#333' : alpha(theme.palette.info.main, 0.3)}`,
                              borderLeft: `4px solid ${ticket.status === 'Closed' ? 'grey' : theme.palette.info.main}`
                            }}
                          >
                            <Grid container spacing={1}>
                              <Grid item xs={3}>
                                <Typography variant="caption" color="text.secondary" display="block">DATE</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{moment(ticket.eventDate).format("MMM DD, HH:mm")}</Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="caption" color="text.secondary" display="block">STATE</Typography>
                                <Typography variant="body2" color="primary">{ticket.mainCategory}</Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="caption" color="text.secondary" display="block">TRANS. TYPE</Typography>
                                <Typography variant="body2">{ticket.transactionType || "-"}</Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="caption" color="text.secondary" display="block">AGENT</Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{ticket.agentName || "System"}</Typography>
                              </Grid>
                              <Grid item xs={12}>
                                <Divider sx={{ my: 0.5, borderColor: '#333' }} />
                                <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'grey.300' }}>
                                  {ticket.note || "No comments recorded."}
                                </Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  ) : (
                    <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#1a1a1a', borderRadius: 2, border: '1px dashed #444' }}>
                      <Typography variant="body2" color="text.secondary">
                        No Q-Ops transactions recorded for this task.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Stack>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #333', pt: 2 }}>
          <Button onClick={() => setShowComparisonDialog(false)} variant="contained" sx={{ bgcolor: '#333' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>


      <ManagementEmailDialog
        open={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        data={data}
        type="prevention"
      />

      {/* Upload Results Dialog */}
      <Dialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            borderRadius: 3,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #333', pb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                <UploadIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="700">
                  Audit Sheet Analysis Results
                </Typography>
                {uploadResults && (
                  <Typography variant="caption" color="text.secondary">
                    {uploadResults.summary.totalRows} total entries | {uploadResults.summary.matchedRows} matched | {Math.round(uploadResults.summary.matchRate)}% match rate
                  </Typography>
                )}
              </Box>
            </Box>
            <IconButton onClick={() => setShowUploadDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {uploadResults && (
            <Stack spacing={3}>
              {/* Summary Cards */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, bgcolor: '#262626', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">Total Entries</Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                      {uploadResults.summary.totalRows}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, bgcolor: '#262626', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">Matched</Typography>
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      {uploadResults.summary.matchedRows}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, bgcolor: '#262626', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">Not Matched</Typography>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                      {uploadResults.summary.unmatchedRows}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, bgcolor: '#262626', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">Match Rate</Typography>
                    <Typography variant="h4" fontWeight="bold" color="info.main">
                      {Math.round(uploadResults.summary.matchRate)}%
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Results Table */}
              <Paper sx={{ height: 500, width: '100%', borderRadius: 2, overflow: 'hidden', bgcolor: '#1a1a1a' }}>
                <DataGrid
                  rows={uploadResults.data.map((item, idx) => ({ id: idx, ...item }))}
                  columns={[
                    {
                      field: '_slid',
                      headerName: 'SLID',
                      width: 120,
                      renderCell: (params) => (
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                          {params.value}
                        </Typography>
                      )
                    },
                    {
                      field: '_hasMatch',
                      headerName: 'Match Status',
                      width: 130,
                      renderCell: (params) => (
                        <Chip
                          label={params.value ? 'Matched' : 'No Match'}
                          size="small"
                          color={params.value ? 'success' : 'warning'}
                          variant="filled"
                          sx={{ fontWeight: 'bold' }}
                        />
                      )
                    },
                    {
                      field: '_matchCount',
                      headerName: 'Issues Found',
                      width: 110,
                      renderCell: (params) => (
                        <Chip
                          label={params.value}
                          size="small"
                          color={params.value > 0 ? 'info' : 'default'}
                          variant="outlined"
                        />
                      )
                    },
                    ...uploadResults.columns
                      .filter(col => !col.toLowerCase().includes('slid'))
                      .slice(0, 5)
                      .map(col => ({
                        field: col,
                        headerName: col,
                        width: 150,
                        valueGetter: (value, row) => row[col] || 'N/A'
                      })),
                    {
                      field: 'matchDetails',
                      headerName: 'Issue Details',
                      width: 200,
                      sortable: false,
                      renderCell: (params) => {
                        const issues = params.row._matchedIssues || [];
                        if (issues.length === 0) return <Typography variant="caption" color="text.secondary">-</Typography>;
                        return (
                          <Stack spacing={0.5}>
                            {issues.slice(0, 2).map((issue, idx) => (
                              <Typography key={idx} variant="caption" sx={{ fontSize: '0.7rem' }}>
                                • {issue.fromMain} - {issue.reporter} ({moment(issue.date).format('MMM DD')})
                              </Typography>
                            ))}
                            {issues.length > 2 && (
                              <Typography variant="caption" color="primary" sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                                +{issues.length - 2} more
                              </Typography>
                            )}
                          </Stack>
                        );
                      }
                    }
                  ]}
                  initialState={{
                    pagination: {
                      paginationModel: { pageSize: 25 },
                    },
                  }}
                  pageSizeOptions={[25, 50, 100]}
                  checkboxSelection
                  disableSelectionOnClick
                  slots={{ toolbar: GridToolbar }}
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-cell': {
                      color: 'grey.300',
                      borderBottom: '1px solid #333'
                    },
                    '& .MuiDataGrid-columnHeaders': {
                      backgroundColor: '#262626',
                      color: 'grey.100',
                      fontSize: 13,
                      fontWeight: 'bold',
                      borderBottom: '2px solid #333'
                    },
                    '& .MuiDataGrid-footerContainer': {
                      backgroundColor: '#262626',
                      borderTop: '2px solid #333'
                    },
                    '& .MuiDataGrid-toolbarContainer': {
                      p: 2,
                      backgroundColor: '#1a1a1a'
                    },
                    '& .MuiButton-textPrimary': {
                      color: theme.palette.primary.main
                    }
                  }}
                />
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #333', pt: 2, justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              <CheckCircleIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle', color: 'success.main' }} />
              File saved to server
            </Typography>
            {uploadResults?.auditId && (
              <Button
                onClick={async () => {
                  if (uploadResults.summary.matchedRows === 0) return;
                  try {
                    const res = await api.post("/tasks/commit-audit-data", { auditId: uploadResults.auditId }, {
                      headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
                    });
                    alert(res.data.message);
                    setShowUploadDialog(false);
                    fetchStats();
                  } catch (err) {
                    alert(err.response?.data?.error || "Import failed");
                  }
                }}
                variant="contained"
                color="success"
                disabled={uploadResults.summary.matchedRows === 0}
              >
                Import Data ({uploadResults.summary.matchedRows} Matches)
              </Button>
            )}
          </Stack>
          <Button onClick={() => setShowUploadDialog(false)} variant="contained" sx={{ bgcolor: '#333' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Audit Record Dialog */}
      <Dialog
        open={showEditRecordDialog}
        onClose={() => setShowEditRecordDialog(false)}
        PaperProps={{ sx: { bgcolor: '#1a1a1a', borderRadius: 3, border: '1px solid #333', minWidth: 400 } }}
      >
        <DialogTitle sx={{ color: 'primary.main', fontWeight: 'bold' }}>Edit Audit Record</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="SLID"
              fullWidth
              variant="outlined"
              size="small"
              value={editingRecord?.slid || ''}
              onChange={(e) => setEditingRecord({ ...editingRecord, slid: e.target.value })}
            />
            <TextField
              label="Evaluation Score"
              type="number"
              fullWidth
              variant="outlined"
              size="small"
              value={editingRecord?.evaluationScore || ''}
              onChange={(e) => setEditingRecord({ ...editingRecord, evaluationScore: Number(e.target.value) })}
            />
            <TextField
              label="Customer Feedback"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              size="small"
              value={editingRecord?.customerFeedback || ''}
              onChange={(e) => setEditingRecord({ ...editingRecord, customerFeedback: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setShowEditRecordDialog(false)} sx={{ color: 'grey.500' }}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleUpdateAuditRecord(editingRecord._id, editingRecord)}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add to Tracker Dialog */}
      <Dialog
        open={showAddToTrackerDialog}
        onClose={() => setShowAddToTrackerDialog(false)}
        PaperProps={{ sx: { bgcolor: '#1a1a1a', borderRadius: 3, border: '1px solid #333', minWidth: 500 } }}
      >
        <DialogTitle sx={{ color: 'success.main', fontWeight: 'bold' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AddIcon />
            <Typography variant="h6" fontWeight="bold">Add to Task Tracker</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Converting SLID: {editingRecord?.slid} into a registered task.
          </Typography>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Unit / Team Name"
              fullWidth
              variant="outlined"
              size="small"
              value={editingRecord?._taskData?.teamName || ''}
              onChange={(e) => setEditingRecord({
                ...editingRecord,
                _taskData: { ...(editingRecord._taskData || {}), teamName: e.target.value }
              })}
            />
            <TextField
              label="Main Reason"
              fullWidth
              variant="outlined"
              size="small"
              value={editingRecord?._taskData?.reason || ''}
              onChange={(e) => setEditingRecord({
                ...editingRecord,
                _taskData: { ...(editingRecord._taskData || {}), reason: e.target.value }
              })}
            />
            <TextField
              label="Owner"
              fullWidth
              variant="outlined"
              size="small"
              value={editingRecord?._taskData?.owner || ''}
              onChange={(e) => setEditingRecord({
                ...editingRecord,
                _taskData: { ...(editingRecord._taskData || {}), owner: e.target.value }
              })}
            />
            <TextField
              label="Team Company"
              fullWidth
              variant="outlined"
              size="small"
              value={editingRecord?._taskData?.teamCompany || ''}
              onChange={(e) => setEditingRecord({
                ...editingRecord,
                _taskData: { ...(editingRecord._taskData || {}), teamCompany: e.target.value }
              })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setShowAddToTrackerDialog(false)} sx={{ color: 'grey.500' }}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => {
              handleProcessManual(editingRecord._id, editingRecord._taskData);
              setShowAddToTrackerDialog(false);
            }}
          >
            Create Task
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Audit Period Dialog */}
      <Dialog
        open={showEditPeriodDialog}
        onClose={() => setShowEditPeriodDialog(false)}
        PaperProps={{ sx: { bgcolor: '#1a1a1a', borderRadius: 3, border: '1px solid #333', minWidth: 400 } }}
      >
        <DialogTitle sx={{ color: 'primary.main', fontWeight: 'bold' }}>Set Audit Sheet Period</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Define the period covered by this specific audit sheet. This will be used to compare audit data with the tracker for the same timeframe.
          </Typography>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={editingPeriod.startDate ? new Date(editingPeriod.startDate) : null}
                onChange={(v) => setEditingPeriod({ ...editingPeriod, startDate: v })}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
              <DatePicker
                label="End Date"
                value={editingPeriod.endDate ? new Date(editingPeriod.endDate) : null}
                onChange={(v) => setEditingPeriod({ ...editingPeriod, endDate: v })}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </LocalizationProvider>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setShowEditPeriodDialog(false)} sx={{ color: 'grey.500' }}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdateAuditDates}
          >
            Save Period
          </Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
};

export default IssuePreventionAnalytics;
