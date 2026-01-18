import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Tooltip,
  IconButton,
  Paper,
  Divider,
  useMediaQuery,
  useTheme,
  Grid,
  Stack,
  Avatar
} from '@mui/material';
import {
  MdClose,
  MdContentCopy,
  MdWhatsapp,
  MdOutlineBugReport,
  MdTimeline,
  MdPerson,
  MdPhone,
  MdLocationOn,
  MdAssignmentInd,
  MdAccessTime,
  MdCheckCircle,
  MdEvent,
  MdOutlineSubtitles,
  MdOutlineDescription,
  MdOutlineEngineering,
  MdOutlineSupervisorAccount,
  MdOutlineDoneAll,
  MdInfo,
  MdEdit
} from 'react-icons/md';
import { FaBuilding } from 'react-icons/fa';
import api from '../api/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useSelector } from 'react-redux';
import CustomerIssueDialog from './CustomerIssueDialog';

// Premium Colors
const colors = {
  background: '#121212',
  surface: 'rgba(30, 30, 30, 0.7)',
  primary: '#8b5cf6', // Violet
  secondary: '#10b981', // Emerald
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  border: 'rgba(255, 255, 255, 0.08)',
  timeline: {
    reported: '#3b82f6', // Blue
    dispatched: '#f59e0b', // Amber
    resolved: '#10b981', // green
    closed: '#8b5cf6', // Violet
  }
};

const SectionTitle = ({ icon: Icon, title }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, mt: 1 }}>
    <Avatar sx={{ bgcolor: `${colors.primary}20`, color: colors.primary, width: 32, height: 32 }}>
      <Icon size={18} />
    </Avatar>
    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: colors.textPrimary, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '0.75rem' }}>
      {title}
    </Typography>
  </Box>
);

const DetailItem = ({ icon: Icon, label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', py: 0.8 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: colors.textSecondary }}>
      <Icon size={16} />
      <Typography variant="caption" sx={{ fontWeight: 500 }}>{label}:</Typography>
    </Box>
    <Typography variant="body2" sx={{ color: colors.textPrimary, fontWeight: 600, textAlign: 'right', maxWidth: '65%', wordBreak: 'break-word' }}>
      {value || 'N/A'}
    </Typography>
  </Box>
);

const StatusTimeline = ({ issue }) => {
  const steps = [
    { label: 'Reported', date: issue.date || issue.createdAt, icon: MdEvent, color: colors.timeline.reported, active: true },
    { label: 'Dispatched', date: issue.dispatchedAt || (issue.dispatched === 'yes' ? (issue.date || issue.createdAt) : null), icon: MdTimeline, color: colors.timeline.dispatched, active: issue.dispatched === 'yes' },
    { label: 'Resolved', date: issue.resolveDate, icon: MdCheckCircle, color: colors.timeline.resolved, active: !!issue.resolveDate || issue.solved === 'yes' },
    { label: 'Closed', date: issue.closedAt, icon: MdOutlineDoneAll, color: colors.timeline.closed, active: !!issue.closedAt || issue.solved === 'yes' }
  ];

  return (
    <Box sx={{ py: 3, px: 1 }}>
      <Grid container spacing={1}>
        {steps.map((step, idx) => (
          <Grid item xs={3} key={idx} sx={{ position: 'relative', textAlign: 'center' }}>
            {idx < steps.length - 1 && (
              <Box sx={{
                position: 'absolute',
                top: 20,
                left: '60%',
                width: '80%',
                height: '2px',
                bgcolor: steps[idx + 1].active ? steps[idx + 1].color : 'rgba(255,255,255,0.05)',
                zIndex: 0
              }} />
            )}
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              zIndex: 1,
              opacity: step.active ? 1 : 0.3
            }}>
              <Avatar sx={{
                bgcolor: step.active ? `${step.color}20` : 'transparent',
                color: step.active ? step.color : colors.textSecondary,
                width: 40,
                height: 40,
                border: `2px solid ${step.active ? step.color : 'rgba(255,255,255,0.1)'}`,
                mb: 1
              }}>
                <step.icon size={20} />
              </Avatar>
              <Typography variant="caption" sx={{ fontWeight: 700, color: step.active ? '#fff' : colors.textSecondary, display: 'block' }}>
                {step.label}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', color: colors.textSecondary }}>
                {step.date ? format(new Date(step.date), 'MMM dd') : '--'}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const ViewIssueDetailsDialog = ({ open, onClose, issue, onUpdate }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const user = useSelector((state) => state?.auth?.user);
  const [openEditDialog, setOpenEditDialog] = useState(false);

  const isAdmin = user?.role === 'Admin';

  if (!issue) return null;

  const handleCopyDetails = () => {
    const issuesText = (issue.issues && issue.issues.length > 0)
      ? issue.issues.map(i => `- ${i.category}${i.subCategory ? ` (${i.subCategory})` : ''}`).join('\n      ')
      : issue.issueCategory || 'N/A';

    const detailsText = `Issue Details:
      SLID: ${issue.slid}
      Ticket ID: ${issue.ticketId || 'N/A'}
      From (Main): ${issue.fromMain || issue.from || 'N/A'}
      From (Sub): ${issue.fromSub || 'N/A'}
      Area: ${issue.area || 'N/A'}
      Caller Name: ${issue.callerName || 'N/A'}
      Caller Details: ${issue.callerDetails || 'N/A'}
      Call Date: ${issue.callDate ? format(new Date(issue.callDate), 'MMM dd, yyyy') : 'N/A'}
      Reporter: ${issue.reporter}
      Reporter Note: ${issue.reporterNote || 'N/A'}
      Team/Company: ${issue.teamCompany}
      Customer Name: ${issue.customerName || 'N/A'}
      Contact Info: ${issue.customerContact || 'N/A'}
      Issues:
      ${issuesText}
      Assigned To: ${issue.assignedTo}
      Assignee Note: ${issue.assigneeNote || 'N/A'}
      Installing Team: ${issue.installingTeam || 'N/A'}
      Status: ${issue.solved === 'yes' ? 'Resolved' : 'Unresolved'}
      Dispatched: ${issue.dispatched === 'yes' ? (issue.dispatchedAt ? new Date(issue.dispatchedAt).toLocaleString() : 'Yes') : 'No'}
      Resolved By: ${issue.resolvedBy || 'N/A'}
      Resolve Date: ${issue.resolveDate ? new Date(issue.resolveDate).toLocaleString() : 'N/A'}
      Supervisor: ${issue.closedBy || 'N/A'}
      Resolution Details: ${issue.resolutionDetails || 'N/A'}
      Date Reported: ${new Date(issue.date || issue.createdAt).toLocaleString()}
      PIS Date: ${issue.pisDate ? new Date(issue.pisDate).toLocaleDateString() : 'N/A'}`;

    navigator.clipboard.writeText(detailsText)
      .then(() => toast.success('Issue details copied to clipboard!'))
      .catch(() => toast.error('Failed to copy details'));
  };

  const handleShareWhatsApp = async () => {
    let formattedMessage = `*🔔 Issue Report*\n\n`;
    formattedMessage += `*SLID:* ${issue.slid}\n`;
    formattedMessage += `*👤 Customer Info*\n`;
    formattedMessage += `Name: ${issue.customerName || 'N/A'}\n`;
    formattedMessage += `Contact: ${issue.customerContact || 'N/A'}\n`;
    formattedMessage += `Area: ${issue.area || 'N/A'}\n`;
    formattedMessage += `Caller: ${issue.callerName || 'N/A'} (${issue.callerDetails || 'N/A'})\n`;
    formattedMessage += `Call Date: ${issue.callDate ? format(new Date(issue.callDate), 'MMM dd, yyyy') : 'N/A'}\n`;
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
    formattedMessage += `Reported: ${new Date(issue.date || issue.createdAt).toLocaleDateString()}\n`;
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
      const response = await api.get('/field-teams/get-field-teams', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const fieldTeam = response.data.find(team =>
        team.teamName?.trim().toLowerCase() === installingTeamName.trim().toLowerCase()
      );

      if (!fieldTeam || !fieldTeam.contactNumber) {
        toast.error('Team contact number not found');
        return;
      }

      let phoneNumber = fieldTeam.contactNumber.toString().trim().replace(/[^0-9+]/g, '');
      if (!phoneNumber.startsWith('+') && phoneNumber.length >= 10) phoneNumber = '+' + phoneNumber;

      navigator.clipboard.writeText(formattedMessage).catch(() => { });
      window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(formattedMessage)}`, '_blank');
    } catch (error) {
      toast.error('Failed to fetch team contact information');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: '#1a1a1a',
          backgroundImage: 'none',
          borderRadius: isMobile ? 0 : 4,
          border: isMobile ? 'none' : `1px solid ${colors.border}`,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{
        p: 2.5,
        bgcolor: 'rgba(255,255,255,0.02)',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: `${colors.primary}20`, color: colors.primary }}>
            <MdOutlineBugReport size={24} />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              Issue Details
            </Typography>
            <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 500 }}>
              SLID: {issue.slid} • ID: {issue.ticketId || 'N/A'}
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Copy to Clipboard">
            <IconButton onClick={handleCopyDetails} sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: colors.primary } }}>
              <MdContentCopy size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Share on WhatsApp">
            <IconButton onClick={handleShareWhatsApp} sx={{ color: '#25D366', '&:hover': { bgcolor: 'rgba(37, 211, 102, 0.1)' } }}>
              <MdWhatsapp size={20} />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' } }}>
            <MdClose size={20} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: isMobile ? 2 : 4, bgcolor: '#121212' }}>
        <StatusTimeline issue={issue} />

        <Grid container spacing={isMobile ? 2 : 4}>
          {/* Customer Information */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, bgcolor: colors.surface, borderRadius: 3, border: `1px solid ${colors.border}`, height: '100%' }}>
              <SectionTitle icon={MdPerson} title="Customer Information" />
              <Stack spacing={0.5}>
                <DetailItem icon={MdPerson} label="Full Name" value={issue.customerName} />
                <DetailItem icon={MdPhone} label="Contact Number" value={issue.customerContact} />
                <DetailItem icon={MdPerson} label="Caller Name" value={issue.callerName} />
                <DetailItem icon={MdInfo} label="Caller Details" value={issue.callerDetails} />
                <DetailItem icon={MdEvent} label="Call Date" value={issue.callDate ? format(new Date(issue.callDate), 'MMM dd, yyyy') : 'N/A'} />
                <DetailItem icon={MdLocationOn} label="Area" value={issue.area} />
                <DetailItem icon={MdEvent} label="PIS Date" value={issue.pisDate ? format(new Date(issue.pisDate), 'MMM dd, yyyy') : 'N/A'} />
                <DetailItem icon={MdLocationOn} label="SLID" value={issue.slid} />
              </Stack>
            </Paper>
          </Grid>

          {/* Reporter Information */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, bgcolor: colors.surface, borderRadius: 3, border: `1px solid ${colors.border}`, height: '100%' }}>
              <SectionTitle icon={MdAssignmentInd} title="Reporter Information" />
              <Stack spacing={0.5}>
                <DetailItem icon={MdAssignmentInd} label="Reporter Name" value={issue.reporter} />
                <DetailItem icon={FaBuilding} label="Source (Main)" value={issue.fromMain || issue.from} />
                <DetailItem icon={MdOutlineSubtitles} label="Source (Sub)" value={issue.fromSub} />
                <DetailItem icon={MdPhone} label="Contact Method" value={issue.contactMethod} />
              </Stack>
            </Paper>
          </Grid>

          {/* Issue Details */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2.5, bgcolor: colors.surface, borderRadius: 3, border: `1px solid ${colors.border}` }}>
              <SectionTitle icon={MdOutlineBugReport} title="Problem Description" />
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ color: colors.textSecondary, mb: 1, display: 'block' }}>Reported Categories:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {issue.issues?.length > 0 ? issue.issues.map((i, idx) => (
                    <Chip
                      key={idx}
                      label={`${i.category}${i.subCategory ? `: ${i.subCategory}` : ''}`}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600 }}
                    />
                  )) : (
                    <Chip label={issue.issueCategory || 'No Categories'} size="small" variant="outlined" />
                  )}
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, borderLeft: `4px solid ${colors.primary}` }}>
                <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 800, textTransform: 'uppercase', mb: 0.5, display: 'block' }}>Reporter Note</Typography>
                <Typography variant="body2" sx={{ color: '#fff', fontStyle: 'italic', lineHeight: 1.6 }}>
                  {issue.reporterNote || "No additional notes from reporter."}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Team Assignment */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, bgcolor: colors.surface, borderRadius: 3, border: `1px solid ${colors.border}`, height: '100%' }}>
              <SectionTitle icon={MdOutlineEngineering} title="Field Team & Assignment" />
              <Stack spacing={0.5}>
                <DetailItem icon={FaBuilding} label="Team Company" value={issue.teamCompany} />
                <DetailItem icon={MdOutlineEngineering} label="Installing Team" value={issue.installingTeam} />
                <DetailItem icon={MdAssignmentInd} label="Assigned User" value={issue.assignedTo} />
                <DetailItem icon={MdOutlineDescription} label="Assignee Note" value={issue.assigneeNote} />
              </Stack>
            </Paper>
          </Grid>

          {/* Status & Resolution */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, bgcolor: colors.surface, borderRadius: 3, border: `1px solid ${colors.border}`, height: '100%' }}>
              <SectionTitle icon={MdCheckCircle} title="Resolution Status" />
              <Stack spacing={0.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.8 }}>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 500 }}>Current Status:</Typography>
                  <Chip
                    label={issue.solved === 'yes' ? 'RESOLVED' : 'IN PROGRESS'}
                    size="small"
                    sx={{
                      bgcolor: issue.solved === 'yes' ? `${colors.secondary}20` : 'rgba(245, 158, 11, 0.1)',
                      color: issue.solved === 'yes' ? colors.secondary : '#f59e0b',
                      fontWeight: 800,
                      fontSize: '0.65rem'
                    }}
                  />
                </Box>
                <DetailItem icon={MdAccessTime} label="Dispatch Time" value={issue.dispatchedAt ? format(new Date(issue.dispatchedAt), 'MMM dd, p') : (issue.dispatched === 'yes' ? 'Dispatched' : 'Pending')} />
                <DetailItem icon={MdOutlineDescription} label="Method" value={issue.resolvedBy} />
                <DetailItem icon={MdOutlineSupervisorAccount} label="Supervisor" value={issue.closedBy} />
                <DetailItem icon={MdOutlineDoneAll} label="Final Close" value={issue.closedAt ? format(new Date(issue.closedAt), 'MMM dd, p') : 'Open'} />
              </Stack>
            </Paper>
          </Grid>

          {/* Resolution Details */}
          {issue.solved === 'yes' && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2.5, bgcolor: `${colors.secondary}05`, borderRadius: 3, border: `1px solid ${colors.secondary}20` }}>
                <SectionTitle icon={MdOutlineDoneAll} title="Resolution Summary" />
                <Typography variant="body2" sx={{ color: colors.textPrimary, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {issue.resolutionDetails || "Issue resolved but no details provided."}
                </Typography>
              </Paper>
            </Grid>
          )}

          {/* Audit Logs */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: colors.textSecondary, px: 2 }}>
              <Typography variant="caption">Created: {format(new Date(issue.createdAt || issue.date), 'MMM dd, yyyy HH:mm')}</Typography>
              <Typography variant="caption">Last Update: {format(new Date(issue.updatedAt || issue.date), 'MMM dd, yyyy HH:mm')}</Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderTop: `1px solid ${colors.border}`, gap: 1 }}>
        {isAdmin && (
          <Button
            onClick={() => setOpenEditDialog(true)}
            variant="contained"
            startIcon={<MdEdit />}
            sx={{
              bgcolor: colors.primary,
              '&:hover': { bgcolor: '#6a5acd' },
              textTransform: 'none',
              borderRadius: 2,
              px: 3
            }}
          >
            Edit Details
          </Button>
        )}
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            color: '#fff',
            borderColor: 'rgba(255,255,255,0.2)',
            textTransform: 'none',
            borderRadius: 2,
            px: 4,
            '&:hover': {
              borderColor: '#fff',
              bgcolor: 'rgba(255,255,255,0.05)'
            }
          }}
        >
          Close Insight
        </Button>
      </DialogActions>

      {/* Edit Dialog Integration */}
      {isAdmin && (
        <CustomerIssueDialog
          open={openEditDialog}
          onClose={() => setOpenEditDialog(false)}
          issue={issue}
          onSubmit={async (data, id) => {
            if (onUpdate) await onUpdate(data, id);
            setOpenEditDialog(false);
          }}
        />
      )}
    </Dialog>
  );
};

export default ViewIssueDetailsDialog;