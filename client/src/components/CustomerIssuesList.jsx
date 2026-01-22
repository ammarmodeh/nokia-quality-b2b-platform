import { useState, useEffect, useMemo } from 'react';
import {
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
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  FormControl,
  InputLabel,
  Stack,
  useMediaQuery,
  Hidden,
  useTheme,
  Divider,
  Tooltip,
  Grid,
  Checkbox,
  FormControlLabel,
  Tabs,
  Tab,
  TablePagination,
  Pagination,
  Badge
} from '@mui/material';
import {
  MdSearch,
  MdMoreVert,
  MdEdit,
  MdDelete,
  MdAdd,
  MdClose,
  MdVisibility,
  MdFileDownload,
  MdViewList,
  MdViewModule,
  MdBarChart,
  MdRefresh,
  MdTerminal
} from 'react-icons/md';
import api from '../api/api';
import CustomerIssueDialog from './CustomerIssueDialog';
import CustomerIssuesAnalytics from './CustomerIssuesAnalytics';
import ViewIssueDetailsDialog from './ViewIssueDetailsDialog';
import { utils, writeFile } from 'xlsx';
import { useSelector } from 'react-redux';
import ManagedAutocomplete from "./common/ManagedAutocomplete";
import { FaFilePdf } from 'react-icons/fa6';
import { toast } from 'sonner';
import CustomerIssueLogTerminal from './CustomerIssueLogTerminal';
import LoadingSpinner from './common/LoadingSpinner';

import { MdEmail } from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa6';
import { alpha } from '@mui/material/styles';



const CustomerIssuesList = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const user = useSelector((state) => state?.auth?.user);
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentIssue, setCurrentIssue] = useState(null);
  const [viewMode, setViewMode] = useState('analytics'); // 'list' | 'grid' | 'analytics'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'resolved' | 'unresolved'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openLogTerminal, setOpenLogTerminal] = useState(false);

  // Pagination & Source Filter State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sourceFilter, setSourceFilter] = useState('Overall');


  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const fetchIssues = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get('/customer-issues-notifications?limit=1000', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      setIssues(response.data.data);
      setFilteredIssues(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch issues');
      toast.error("Failed to refresh issues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  useEffect(() => {
    const handleSyncRefresh = () => {
      fetchIssues(true);
    };

    window.addEventListener('cin-refresh', handleSyncRefresh);
    return () => window.removeEventListener('cin-refresh', handleSyncRefresh);
  }, []);

  useEffect(() => {
    let filtered = issues;

    // Filter by status
    if (statusFilter === 'resolved') {
      filtered = filtered.filter(issue => issue.solved === 'yes');
    } else if (statusFilter === 'unresolved') {
      filtered = filtered.filter(issue => issue.solved === 'no');
    } else if (statusFilter === 'dispatchedOpen') {
      filtered = filtered.filter(issue => issue.dispatched === 'yes' && issue.solved === 'no');
    } else if (statusFilter === 'notDispatchedOpen') {
      filtered = filtered.filter(issue => issue.dispatched !== 'yes' && issue.solved === 'no');
    }

    // Filter by search term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(issue =>
        issue.slid.toLowerCase().includes(term) ||
        issue.reporter.toLowerCase().includes(term) ||
        issue.teamCompany.toLowerCase().includes(term) ||
        (issue.assignedTo && issue.assignedTo.toLowerCase().includes(term)) ||
        (issue.installingTeam && issue.installingTeam.toLowerCase().includes(term)) ||
        (issue.fromMain && issue.fromMain.toLowerCase().includes(term)) ||
        (issue.fromSub && issue.fromSub.toLowerCase().includes(term)) ||
        (issue.from && issue.from.toLowerCase().includes(term)) ||
        (issue.customerName && issue.customerName.toLowerCase().includes(term)) ||
        (issue.customerContact && issue.customerContact.toLowerCase().includes(term)) ||
        (issue.area && issue.area.toLowerCase().includes(term)) ||
        (issue.callerName && issue.callerName.toLowerCase().includes(term)) ||
        (issue.callerDetails && issue.callerDetails.toLowerCase().includes(term)) ||
        (issue.closedBy && issue.closedBy.toLowerCase().includes(term)) ||
        (issue.assigneeNote && issue.assigneeNote.toLowerCase().includes(term)) ||
        (issue.resolutionDetails && issue.resolutionDetails.toLowerCase().includes(term)) ||
        (issue.ticketId && issue.ticketId.toLowerCase().includes(term)) ||
        (issue.issues && issue.issues.some(i =>
          i.category.toLowerCase().includes(term) ||
          (i.subCategory && i.subCategory.toLowerCase().includes(term))
        ))
      );
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(issue => new Date(issue.date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(issue => new Date(issue.date) <= end);
    }

    // Filter by Source Tab
    if (sourceFilter !== 'Overall') {
      filtered = filtered.filter(issue => (issue.fromMain === sourceFilter) || (issue.from === sourceFilter));
    }

    setFilteredIssues(filtered);
  }, [searchTerm, issues, statusFilter, startDate, endDate, sourceFilter]);

  const handleMenuOpen = (event, issue) => {
    setAnchorEl(event.currentTarget);
    setCurrentIssue(issue);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    setOpenEditDialog(true);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setOpenDeleteDialog(true);
    handleMenuClose();
  };

  const handleIssueSubmit = async (issueData, id) => {
    try {
      // Auto-save new supervisor if provided
      if (issueData.solved === 'yes' && issueData.closedBy && issueData.closedBy.trim() !== '') {
        try {
          await api.post('/dropdown-options', {
            category: 'CIN_SUPERVISORS',
            value: issueData.closedBy.trim(),
            label: issueData.closedBy.trim(),
            order: 99
          }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          });
        } catch (opErr) {
          // console.error("Could not auto-save supervisor:", opErr);
          // Don't block issue submission if this fails
        }
      }

      if (id) {
        // Update
        const response = await api.put(
          `/customer-issues-notifications/${id}`,
          {
            ...issueData,
            date: new Date(issueData.date).toISOString()
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
        );
        const updated = response.data.data;
        setIssues(prev => prev.map(isl => isl._id === id ? updated : isl));
        setFilteredIssues(prev => prev.map(isl => isl._id === id ? updated : isl));
        setOpenEditDialog(false);
        await fetchIssues(true); // Refetch silently
        toast.success("Issue updated successfully");
      } else {
        // Create
        const response = await api.post('/customer-issues-notifications', issueData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        const created = response.data.data;
        setIssues(prev => [created, ...prev]);
        setFilteredIssues(prev => [created, ...prev]);
        setOpenAddDialog(false);
        // setOpenAnalytics(true); // User wants to see list/analytics updated
        // setOpenAnalytics(true); // User wants to see list/analytics updated
        await fetchIssues(true); // Refetch silently to ensure everything is synced
        toast.success("Issue reported successfully");
      }
    } catch (error) {
      toast.error(id ? "Failed to update issue" : "Failed to create issue");
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(
        `/customer-issues-notifications/${currentIssue._id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        }
      );

      setIssues(issues.filter(issue => issue._id !== currentIssue._id));
      setFilteredIssues(filteredIssues.filter(issue => issue._id !== currentIssue._id));
      setOpenDeleteDialog(false);
    } catch (error) {
      // console.error('Error deleting issue:', error);
      alert('Failed to delete issue. Please try again.');
    }
  };



  const handleIssueChange = (index, field, value) => {
    const updatedIssues = [...editFormData.issues];
    updatedIssues[index][field] = value;
    setEditFormData(prev => ({ ...prev, issues: updatedIssues }));
  };

  const addIssueRow = () => {
    setEditFormData(prev => ({
      ...prev,
      issues: [...prev.issues, { category: '', subCategory: '' }]
    }));
  };

  const removeIssueRow = (index) => {
    if (editFormData.issues.length > 1) {
      setEditFormData(prev => ({
        ...prev,
        issues: prev.issues.filter((_, i) => i !== index)
      }));
    }
  };

  const exportToExcel = () => {
    const worksheet = utils.json_to_sheet(filteredIssues.map(issue => ({
      'Ticket ID': issue.ticketId || '',
      'SLID': issue.slid,
      'From (Main)': issue.fromMain || issue.from || '',
      'From (Sub)': issue.fromSub || '',
      'Reporter': issue.reporter,
      'Contact Method': issue.contactMethod,
      'Customer Name': issue.customerName || '',
      'Customer Contact': issue.customerContact || '',
      'Area': issue.area || 'N/A',
      'Caller Name': issue.callerName || 'N/A',
      'Caller Details': issue.callerDetails || 'N/A',
      'Call Date': issue.callDate ? new Date(issue.callDate).toLocaleDateString() : 'N/A',
      'Reporter Note': issue.reporterNote || '',
      'Problem Description': (issue.issues && issue.issues.length > 0)
        ? issue.issues.map(i => `${i.category}${i.subCategory ? ` (${i.subCategory})` : ''}`).join(' | ')
        : issue.issueCategory || '',
      'Team/Company': issue.teamCompany,
      'Assigned User': issue.assignedTo,
      'Installing Team': issue.installingTeam || 'N/A',
      'Assignee Note': issue.assigneeNote || '',
      'Dispatched Status': issue.dispatched === 'yes' ? 'Yes' : 'No',
      'Dispatched Date': issue.dispatchedAt ? new Date(issue.dispatchedAt).toLocaleDateString() : 'N/A',
      'Life Cycle Status': issue.solved === 'yes' ? 'Closed' : 'Open',
      'Resolution Method': issue.resolvedBy || 'N/A',
      'Field Resolution Date': issue.resolveDate ? new Date(issue.resolveDate).toLocaleDateString() : 'N/A',
      'Responsible Supervisor': issue.closedBy || 'N/A',
      'Close Date (Approval)': issue.closedAt ? new Date(issue.closedAt).toLocaleDateString() : 'N/A',
      'Resolution Summary': issue.resolutionDetails || '',
      'Date Reported': new Date(issue.date).toLocaleDateString(),
      'PIS Date': issue.pisDate ? new Date(issue.pisDate).toLocaleDateString() : 'N/A'
    })));

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Customer Issues Notifications');
    writeFile(workbook, 'CIN.xlsx');
  };

  const handleExportPDF = async () => {
    try {
      if (filteredIssues.length === 0) {
        toast.error("No issues to export");
        return;
      }

      toast.info("Generating professional PDF report...");

      const reportTitle = "Customer Issue Notification (CIN) Analytics Report";
      let markdownContent = `**Date Range**: ${startDate || 'All Time'} to ${endDate || 'Now'}\n`;
      markdownContent += `**Total Records**: ${filteredIssues.length}\n`;
      markdownContent += `**Status Filter**: ${statusFilter.toUpperCase()}\n\n---\n\n`;

      filteredIssues.forEach((issue, index) => {
        markdownContent += `## ${index + 1}. Issue - SLID: ${issue.slid}\n`;
        markdownContent += `- **Date Reported**: ${new Date(issue.date).toLocaleDateString()}\n`;
        markdownContent += `- **Reporter**: ${issue.reporter || 'N/A'}\n`;
        markdownContent += `- **Area**: ${issue.area || 'N/A'}\n`;
        markdownContent += `- **Caller Name**: ${issue.callerName || 'N/A'}\n`;
        markdownContent += `- **Caller Details**: ${issue.callerDetails || 'N/A'}\n`;
        markdownContent += `- **Call Date**: ${issue.callDate ? new Date(issue.callDate).toLocaleDateString() : 'N/A'}\n`;
        markdownContent += `- **From (Main)**: ${issue.fromMain || issue.from || 'N/A'}\n`;
        markdownContent += `- **From (Sub)**: ${issue.fromSub || 'N/A'}\n`;
        markdownContent += `- **Assigned To**: ${issue.assignedTo || 'Unassigned'}\n`;
        markdownContent += `- **Installing Team**: ${issue.installingTeam || 'N/A'}\n`;
        markdownContent += `- **Status**: ${issue.solved === 'yes' ? 'Resolved ✅' : 'Unresolved ❌'}\n`;
        if (issue.resolveDate) markdownContent += `- **Resolve Date**: ${new Date(issue.resolveDate).toLocaleDateString()}\n`;

        markdownContent += `\n### Issues Highlighted:\n`;
        if (issue.issues && issue.issues.length > 0) {
          issue.issues.forEach(i => {
            markdownContent += `- **${i.category}**: ${i.subCategory || 'No Details'}\n`;
          });
        } else {
          markdownContent += `- ${issue.issueCategory || 'N/A'}\n`;
        }

        if (issue.reporterNote) markdownContent += `\n**Reporter Note**: ${issue.reporterNote}\n`;
        if (issue.resolutionDetails) markdownContent += `\n**Resolution Details**: ${issue.resolutionDetails}\n`;

        markdownContent += `\n---\n\n`;
      });

      markdownContent += `\n*Generated by Reach Quality Team - ${new Date().toLocaleString()}*`;

      const response = await api.post('/ai/report/download', {
        reportContent: markdownContent,
        title: reportTitle,
        format: 'pdf'
      }, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CIN_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("PDF Report exported successfully");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Failed to export professional PDF report");
    }
  };

  const handleWhatsAppContact = async (issue) => {
    // Build comprehensive message
    let formattedMessage = `*🔔 Issue Report*\n\n`;

    formattedMessage += `*SLID:* ${issue.slid}\n`;
    formattedMessage += `*👤 Customer Info*\n`;
    formattedMessage += `Name: ${issue.customerName || 'N/A'}\n`;
    formattedMessage += `Contact: ${issue.customerContact || 'N/A'}\n`;
    if (issue.ticketId) formattedMessage += `*Ticket ID:* ${issue.ticketId}\n`;
    formattedMessage += `*Status:* ${issue.solved === 'yes' ? '✅ Resolved' : '⚠️ Open'}\n\n`;

    formattedMessage += `*📍 Source & Team*\n`;
    formattedMessage += `Team Company: ${issue.teamCompany}\n`;
    formattedMessage += `Installing Team: ${issue.installingTeam || 'N/A'}\n`;
    formattedMessage += `Assigned To: ${issue.assignedTo || 'Unassigned'}\n\n`;

    formattedMessage += `*🔍 Issue Details*\n`;
    formattedMessage += `Categories: ${issue.issues?.map(i => i.category + (i.subCategory ? ` (${i.subCategory})` : '')).join(', ') || 'N/A'}\n`;
    if (issue.reporterNote) formattedMessage += `Reporter Note: ${issue.reporterNote}\n`;
    if (issue.assigneeNote) formattedMessage += `Assignee Note: ${issue.assigneeNote}\n`;
    formattedMessage += `\n`;

    formattedMessage += `*📅 Timeline*\n`;
    formattedMessage += `Reported: ${new Date(issue.date).toLocaleDateString()}\n`;
    if (issue.pisDate) formattedMessage += `PIS Date: ${new Date(issue.pisDate).toLocaleDateString()}\n`;
    if (issue.dispatched === 'yes') {
      formattedMessage += `Dispatched: ${issue.dispatchedAt ? new Date(issue.dispatchedAt).toLocaleDateString() : 'Yes'}\n`;
    }

    if (issue.solved === 'yes') {
      formattedMessage += `\n*✅ Resolution*\n`;
      if (issue.resolveDate) formattedMessage += `Resolved: ${new Date(issue.resolveDate).toLocaleDateString()}\n`;
      if (issue.resolvedBy) formattedMessage += `Method: ${issue.resolvedBy}\n`;
      if (issue.closedBy) formattedMessage += `Supervisor: ${issue.closedBy}\n`;
      if (issue.closedAt) formattedMessage += `Closed: ${new Date(issue.closedAt).toLocaleDateString()}\n`;
      if (issue.resolutionDetails) formattedMessage += `Details: ${issue.resolutionDetails}\n`;
    }

    const installingTeamName = issue.installingTeam;

    if (!installingTeamName) {
      toast.error('Installing team not specified');
      return;
    }

    try {
      // Fetch field team data to get contact number
      const response = await api.get('/field-teams/get-field-teams', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      const fieldTeam = response.data.find(team => team.teamName === installingTeamName);

      if (!fieldTeam || !fieldTeam.contactNumber) {
        toast.error('Team contact number not found');
        return;
      }

      let phoneNumber = fieldTeam.contactNumber;

      // Clean and validate phone number
      let cleanNumber = phoneNumber.toString().trim();
      const hasPlus = cleanNumber.startsWith('+');
      cleanNumber = cleanNumber.replace(/[^0-9]/g, '');
      if (hasPlus && cleanNumber) cleanNumber = '+' + cleanNumber;

      const digitsOnly = cleanNumber.replace(/\+/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        toast.error('Invalid phone number format');
        console.error('Invalid phone number:', phoneNumber, 'cleaned to:', cleanNumber);
        return;
      }

      navigator.clipboard.writeText(formattedMessage).catch(() => { });

      const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(formattedMessage)}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Failed to fetch team contact information');
    }
  };

  const availableSources = ['Overall', ...new Set(issues.map(i => i.fromMain || i.from).filter(Boolean))];

  // Calculate counts based on Source Filter
  const sourceFilteredForCounts = useMemo(() => {
    if (sourceFilter === 'Overall') return issues;
    return issues.filter(i => (i.fromMain === sourceFilter) || (i.from === sourceFilter));
  }, [issues, sourceFilter]);



  const paginatedIssues = filteredIssues.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (loading) {
    return <LoadingSpinner variant="page" />;
  }

  if (error) {
    return (
      <Box p={4}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }



  return (
    <Box sx={{
      // maxWidth: '1100px',
      mx: 'auto',
      p: isMobile ? 1 : 3,
      // px: isMobile ? 1 : 3
    }}>
      <Box sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? 2 : 0,
        mb: 3
      }}>
        <Typography variant="h5" sx={{
          color: '#7b68ee',
          fontWeight: 'bold',
          fontSize: isMobile ? '1.2rem' : '1.75rem',
        }}>
          Customer Issues
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => user?.role === 'Admin' && setOpenAddDialog(true)}
            startIcon={<MdAdd />}
            size={isMobile ? 'small' : 'medium'}
            disabled={user?.role !== 'Admin'}
            sx={{
              backgroundColor: '#1976d2',
              '&:hover': { backgroundColor: '#1565c0' },
              textTransform: 'none',
              borderRadius: '8px',
              px: isMobile ? 1.5 : 3,
            }}
          >
            {isMobile ? 'New' : 'New Issue'}
          </Button>
          <Button
            variant="outlined"
            onClick={exportToExcel}
            startIcon={<MdFileDownload />}
            size={isMobile ? 'small' : 'medium'}
            sx={{
              borderColor: '#3d3d3d',
              color: '#4caf50',
              '&:hover': { borderColor: '#4caf50', backgroundColor: 'rgba(76, 175, 80, 0.05)' },
              textTransform: 'none',
              borderRadius: '8px',
              px: isMobile ? 1.5 : 2,
            }}
          >
            {isMobile ? 'Excel' : 'Excel'}
          </Button>
          <Button
            variant="outlined"
            onClick={handleExportPDF}
            startIcon={<FaFilePdf />}
            size={isMobile ? 'small' : 'medium'}
            sx={{
              borderColor: '#3d3d3d',
              color: '#f44336',
              '&:hover': { borderColor: '#f44336', backgroundColor: 'rgba(244, 67, 54, 0.05)' },
              textTransform: 'none',
              borderRadius: '8px',
              px: isMobile ? 1.5 : 2,
            }}
          >
            {isMobile ? 'PDF' : 'Pro Report'}
          </Button>

          <Badge
            badgeContent="NEW"
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '10px',
                height: '18px',
                minWidth: '28px',
                backgroundColor: '#7b68ee', // Reach-style purple
                top: 5,
                right: 5,
                animation: 'pulse-animation 2s infinite',
                boxShadow: '0 0 0 0 rgba(123, 104, 238, 0.7)',
                '@keyframes pulse-animation': {
                  '0%': { boxShadow: '0 0 0 0 rgba(123, 104, 238, 0.7)' },
                  '70%': { boxShadow: '0 0 0 4px rgba(123, 104, 238, 0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(123, 104, 238, 0)' }
                }
              }
            }}
          >
            <Button
              variant="outlined"
              onClick={() => setOpenLogTerminal(true)}
              startIcon={<MdTerminal />}
              size={isMobile ? 'small' : 'medium'}
              sx={{
                borderColor: '#3d3d3d',
                color: '#00ff41',
                backgroundColor: 'rgba(0, 255, 65, 0.05)',
                '&:hover': { borderColor: '#00ff41', backgroundColor: 'rgba(0, 255, 65, 0.1)' },
                textTransform: 'none',
                borderRadius: '8px',
                px: isMobile ? 1.5 : 2,
                fontFamily: 'monospace'
              }}
            >
              {isMobile ? 'Logs' : 'System Logs'}
            </Button>
          </Badge>

        </Box>
      </Box>

      <Box sx={{
        backgroundColor: '#2d2d2d',
        p: 2,
        borderRadius: '12px',
        border: '1px solid #3d3d3d',
        mb: 3,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        {/* Source Tabs */}
        <Box sx={{ mb: 2, borderBottom: 1, borderColor: '#3d3d3d' }}>
          <Tabs
            value={sourceFilter}
            onChange={(e, val) => { setSourceFilter(val); setPage(0); }}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              '& .MuiTabs-indicator': { backgroundColor: '#7b68ee' },
              '& .MuiTab-root': {
                color: '#b3b3b3',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '1rem',
                '&.Mui-selected': { color: '#7b68ee' }
              }
            }}
          >
            {availableSources.map(source => (
              <Tab key={source} value={source} label={source} />
            ))}
          </Tabs>
        </Box>

        <Box sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 2,
          mb: 2,
          alignItems: isMobile ? 'stretch' : 'center'
        }}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search by SLID, Reporter, Team, or Category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth={isMobile}
            sx={{
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#1e1e1e',
                borderRadius: '8px',
                color: '#ffffff',
                '& fieldset': { borderColor: '#3d3d3d' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#7b68ee' },
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MdSearch style={{ color: '#b3b3b3' }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ color: '#b3b3b3' }}>
                  <MdClose />
                </IconButton>
              )
            }}
          />

          <Box sx={{
            display: 'flex',
            backgroundColor: '#1e1e1e',
            borderRadius: '8px',
            p: 0.5,
            border: '1px solid #3d3d3d'
          }}>
            {[
              { id: 'analytics', icon: <MdBarChart />, label: 'Analytics' },
              { id: 'list', icon: <MdViewList />, label: 'List' },
              { id: 'grid', icon: <MdViewModule />, label: 'Grid' }
            ].map((mode) => (
              <Tooltip key={mode.id} title={mode.label}>
                <IconButton
                  size="small"
                  onClick={() => setViewMode(mode.id)}
                  sx={{
                    borderRadius: '6px',
                    color: viewMode === mode.id ? '#ffffff' : '#b3b3b3',
                    backgroundColor: viewMode === mode.id ? '#7b68ee' : 'transparent',
                    '&:hover': {
                      backgroundColor: viewMode === mode.id ? '#6c5ce7' : 'rgba(255,255,255,0.05)'
                    },
                    transition: 'all 0.2s',
                    px: 1,
                    gap: 0.5
                  }}
                >
                  {mode.icon}
                  {!isMobile && <Typography variant="caption">{mode.label}</Typography>}
                </IconButton>
              </Tooltip>
            ))}
          </Box>
        </Box>

        <Divider sx={{ mb: 2, borderColor: '#3d3d3d' }} />

        <Box sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 2,
          mb: 2,
          alignItems: isMobile ? 'stretch' : 'center'
        }}>
          <Typography variant="body2" sx={{ color: '#b3b3b3', minWidth: 'fit-content' }}>Filter by Date:</Typography>
          <TextField
            type="date"
            label="From"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{
              maxWidth: isMobile ? 'none' : '200px',
              '& .MuiInputBase-root': { color: '#ffffff', backgroundColor: '#1e1e1e' },
              '& .MuiInputLabel-root': { color: '#b3b3b3' },
              '& .MuiOutlinedInput-root fieldset': { borderColor: '#3d3d3d' },
              '&:hover fieldset': { borderColor: '#666' },
            }}
          />
          <TextField
            type="date"
            label="To"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{
              maxWidth: isMobile ? 'none' : '200px',
              '& .MuiInputBase-root': { color: '#ffffff', backgroundColor: '#1e1e1e' },
              '& .MuiInputLabel-root': { color: '#b3b3b3' },
              '& .MuiOutlinedInput-root fieldset': { borderColor: '#3d3d3d' },
              '&:hover fieldset': { borderColor: '#666' },
            }}
          />
          {(startDate || endDate) && (
            <Button
              size="small"
              onClick={() => { setStartDate(''); setEndDate(''); }}
              sx={{ color: '#f44336', textTransform: 'none' }}
            >
              Clear Dates
            </Button>
          )}
        </Box>

        <Divider sx={{ mb: 2, borderColor: '#3d3d3d' }} />

        <Tabs
          value={statusFilter}
          onChange={(e, val) => setStatusFilter(val)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: '#7b68ee',
              height: 3,
              borderRadius: '3px 3px 0 0'
            },
            '& .MuiTab-root': {
              color: '#b3b3b3',
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.9rem',
              minWidth: 100,
              '&.Mui-selected': {
                color: '#ffffff',
              }
            }
          }}
        >
          <Tab value="all" label={`All (${sourceFilteredForCounts.length})`} />
          <Tab value="resolved" label={`Closed (${sourceFilteredForCounts.filter(i => i.solved === 'yes').length})`} />
          <Tab value="unresolved" label={`Open (${sourceFilteredForCounts.filter(i => i.solved === 'no').length})`} />
          <Tab value="dispatchedOpen" label={`Dispatched (Open) (${sourceFilteredForCounts.filter(i => i.dispatched === 'yes' && i.solved === 'no').length})`} />
          <Tab value="notDispatchedOpen" label={`Not Dispatched (Open) (${sourceFilteredForCounts.filter(i => i.dispatched !== 'yes' && i.solved === 'no').length})`} />
        </Tabs>
      </Box>

      {viewMode === 'analytics' ? (
        <CustomerIssuesAnalytics issues={filteredIssues} />
      ) : viewMode === 'list' ? (
        <>
          <TableContainer component={Paper} sx={{
            mt: 2,
            maxWidth: '100%',
            overflowX: 'auto',
            flex: 1,
            width: "100%",
            border: 0,
            color: "#ffffff",
            "&.MuiTableContainer-root": {
              backgroundColor: '#2d2d2d',
            },
            "& .MuiTable-root": {
              backgroundColor: "#2d2d2d",
            },
            "& .MuiTableHead-root": {
              backgroundColor: "#2d2d2d",
              "& .MuiTableCell-root": {
                color: "#b3b3b3",
                fontSize: "0.875rem",
                fontWeight: "bold",
                borderBottom: "1px solid #e5e7eb",
              }
            },
            "& .MuiTableBody-root": {
              "& .MuiTableCell-root": {
                borderBottom: "1px solid #e5e7eb",
                color: "#ffffff",
              },
              "& .MuiTableRow-root": {
                backgroundColor: "#2d2d2d",
                "&:hover": {
                  backgroundColor: "#2d2d2d",
                },
              }
            },
            "& .MuiPaper-root": {
              backgroundColor: "transparent",
              boxShadow: "none",
            },
            "&::-webkit-scrollbar": {
              width: "8px",
              height: "8px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#666",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "#e5e7eb",
            },
          }}>
            <Table size={isMobile ? 'small' : 'medium'}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ pl: 3 }}>SLID</TableCell>
                  <Hidden smDown>
                    <TableCell>From (Main)</TableCell>
                    <TableCell>From (Sub)</TableCell>
                  </Hidden>
                  <TableCell>Reporter</TableCell>
                  <Hidden smDown>
                    <TableCell>Team/Company</TableCell>
                    <TableCell>Installing Team</TableCell>
                  </Hidden>
                  <TableCell>Issues</TableCell>
                  <Hidden mdDown>
                    <TableCell>Assigned</TableCell>
                    <TableCell>Supervisor</TableCell>
                    <TableCell>Dispatched</TableCell>
                    <TableCell>Assignee Note</TableCell>
                  </Hidden>
                  <TableCell>Status</TableCell>
                  <Hidden xsDown>
                    <TableCell>Report Date</TableCell>
                  </Hidden>
                  <TableCell sx={{ pr: 3, textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedIssues.length > 0 ? (
                  paginatedIssues.map((issue) => (
                    <TableRow
                      key={issue._id}
                      sx={{
                        '&:hover': { backgroundColor: 'rgba(123, 104, 238, 0.05) !important' },
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <TableCell sx={{ pl: 3, fontWeight: 500, color: '#7b68ee !important' }}>{issue.slid}</TableCell>
                      <Hidden smDown>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{issue.fromMain || issue.from}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{issue.fromSub || '-'}</TableCell>
                      </Hidden>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{issue.reporter}</TableCell>
                      <Hidden smDown>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          <Chip
                            label={issue.teamCompany}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              backgroundColor: '#1e1e1e',
                              color: '#b3b3b3',
                              border: '1px solid #3d3d3d'
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{issue.installingTeam || '-'}</TableCell>
                      </Hidden>
                      <TableCell>
                        {issue.issues && issue.issues.length > 0 ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {issue.issues.map((i, idx) => (
                              <Chip
                                key={idx}
                                label={i.category}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.7rem',
                                  backgroundColor: 'rgba(123, 104, 238, 0.1)',
                                  color: '#7b68ee',
                                  border: '1px solid rgba(123, 104, 238, 0.2)'
                                }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ fontSize: '0.85rem', color: '#666' }}>No Category</Typography>
                        )}
                      </TableCell>
                      <Hidden mdDown>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{issue.assignedTo}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{issue.closedBy || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={issue.dispatched === 'yes' ? 'Yes' : 'No'}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              bgcolor: issue.dispatched === 'yes' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(158, 158, 158, 0.1)',
                              color: issue.dispatched === 'yes' ? '#4caf50' : '#9e9e9e',
                              border: `1px solid ${issue.dispatched === 'yes' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(158, 158, 158, 0.2)'}`
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', maxWidth: 150 }}>
                          <Tooltip title={issue.assigneeNote || ''}>
                            <span style={{
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {issue.assigneeNote || '-'}
                            </span>
                          </Tooltip>
                        </TableCell>
                      </Hidden>
                      <TableCell>
                        <Chip
                          label={issue.solved === 'yes' ? 'Closed' : 'Open'}
                          size="small"
                          sx={{
                            height: 24,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: issue.solved === 'yes' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                            color: issue.solved === 'yes' ? '#4caf50' : '#f44336',
                            border: `1px solid ${issue.solved === 'yes' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'}`,
                            borderRadius: '6px'
                          }}
                        />
                      </TableCell>
                      <Hidden xsDown>
                        <TableCell sx={{ fontSize: '0.85rem', color: '#b3b3b3' }}>
                          {new Date(issue.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </TableCell>
                      </Hidden>
                      <TableCell sx={{ pr: 3, textAlign: 'right' }}>
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {issue.installingTeam && (
                            <Tooltip title="Contact Team via WhatsApp">
                              <IconButton
                                size="small"
                                onClick={() => handleWhatsAppContact(issue)}
                                sx={{ color: '#25D366', '&:hover': { backgroundColor: 'rgba(37, 211, 102, 0.1)' } }}
                              >
                                <FaWhatsapp size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, issue)}
                            sx={{
                              color: '#b3b3b3',
                              '&:hover': { color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.05)' }
                            }}
                          >
                            <MdMoreVert />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isMobile ? 6 : 9} align="center" sx={{ color: '#ffffff' }}>
                      {searchTerm ? 'No matching issues found' : 'No issues available'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredIssues.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ color: '#ffffff', '.MuiTablePagination-selectIcon': { color: '#ffffff' } }}
          />
        </>
      ) : (
        // Grid View
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
            {paginatedIssues.length > 0 ? (
              paginatedIssues.map((issue) => (
                <Paper
                  key={issue._id}
                  sx={{
                    p: 2,
                    bgcolor: '#2d2d2d',
                    color: '#fff',
                    borderRadius: 2,
                    border: '1px solid #3d3d3d',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    position: 'relative'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#7b68ee', fontSize: '1rem' }}>
                      {issue.slid}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, issue)}
                      sx={{ color: '#ffffff', mt: -1, mr: -1 }}
                    >
                      <MdMoreVert />
                    </IconButton>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="#b3b3b3">From</Typography>
                    <Typography variant="body2">{issue.from}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="#b3b3b3">Issue</Typography>
                    {issue.issues && issue.issues.length > 0 ? (
                      <Stack spacing={0.5}>
                        {issue.issues.map((i, idx) => (
                          <Typography key={idx} variant="body2" noWrap>
                            {i.category}{i.subCategory ? ` - ${i.subCategory}` : ''}
                          </Typography>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" noWrap>{issue.issueCategory}</Typography>
                    )}
                  </Box>

                  <Box>
                    <Typography variant="caption" color="#b3b3b3">Assigned To</Typography>
                    <Typography variant="body2">{issue.assignedTo}</Typography>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <Chip
                      label={issue.solved === 'yes' ? 'Resolved' : 'Unresolved'}
                      color={issue.solved === 'yes' ? 'success' : 'error'}
                      size="small"
                      sx={{
                        color: "#ffffff",
                        '&.MuiChip-colorSuccess': { backgroundColor: '#4caf50' },
                        '&.MuiChip-colorError': { backgroundColor: '#f44336' }
                      }}
                    />
                  </Stack>

                  <Divider sx={{ bgcolor: '#3d3d3d' }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#b3b3b3' }}>
                    <span>Reported: {new Date(issue.date).toLocaleDateString()}</span>
                    {issue.resolveDate && <span>Resolved: {new Date(issue.resolveDate).toLocaleDateString()}</span>}
                  </Box>
                </Paper>
              ))
            ) : (
              <Typography sx={{ color: '#ffffff', gridColumn: '1/-1', textAlign: 'center', py: 4 }}>
                {searchTerm ? 'No matching issues found' : 'No issues available'}
              </Typography>
            )}
          </Box>
          <Pagination
            count={Math.ceil(filteredIssues.length / rowsPerPage)}
            page={page + 1}
            onChange={(e, p) => setPage(p - 1)}
            color="primary"
            sx={{ alignSelf: 'center', '& .MuiPaginationItem-root': { color: '#ffffff' } }}
          />
        </Box>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{
          "& .MuiPaper-root": {
            backgroundColor: '#2d2d2d',
            color: '#ffffff',
            boxShadow: 'none',
            borderRadius: '8px',
            border: '1px solid #3d3d3d',
            minWidth: '200px',
          },
          "& .MuiList-root": {
            padding: '4px 0',
          }
        }}
      >
        <MenuItem
          onClick={() => { setOpenViewDialog(true); handleMenuClose(); }}
          sx={{
            '&:hover': {
              backgroundColor: '#2a2a2a',
            },
            '&.MuiMenuItem-root': {
              padding: '8px 16px',
            }
          }}
        >
          <MdVisibility style={{ marginRight: 8, color: '#ffffff' }} />
          <Typography variant="body1" color="#ffffff">View</Typography>
        </MenuItem>

        {user && user.role === 'Admin' && [
          <MenuItem
            key="edit"
            onClick={handleEditClick}
            sx={{
              '&:hover': {
                backgroundColor: '#2a2a2a',
              },
              '&.MuiMenuItem-root': {
                padding: '8px 16px',
              }
            }}
          >
            <MdEdit style={{ marginRight: 8, color: '#ffffff' }} />
            <Typography variant="body1" color="#ffffff">Edit</Typography>
          </MenuItem>,

          <MenuItem
            key="delete"
            onClick={handleDeleteClick}
            sx={{
              '&:hover': {
                backgroundColor: '#2a2a2a',
              },
              '&.MuiMenuItem-root': {
                padding: '8px 16px',
              },
              color: '#f44336',
            }}
          >
            <MdDelete style={{ marginRight: 8, color: '#f44336' }} />
            <Typography variant="body1" color="#f44336">Delete</Typography>
          </MenuItem>
        ]}
      </Menu>



      <CustomerIssueLogTerminal
        open={openLogTerminal}
        onClose={() => setOpenLogTerminal(false)}
      />

      {/* Add Issue Dialog */}
      <CustomerIssueDialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        onSubmit={handleIssueSubmit}
      />

      {/* Edit Dialog */}
      <CustomerIssueDialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        onSubmit={handleIssueSubmit}
        issue={currentIssue}
      />

      {/* View Dialog */}
      <ViewIssueDetailsDialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        issue={currentIssue}
        onUpdate={handleIssueSubmit}
        fullScreen={isMobile}
      />


      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        fullScreen={isMobile}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this issue? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDeleteDialog(false)}
            size={isMobile ? 'small' : 'medium'}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            size={isMobile ? 'small' : 'medium'}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerIssuesList;