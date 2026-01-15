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
  useTheme
} from '@mui/material';
import { MdClose, MdContentCopy, MdWhatsapp } from 'react-icons/md';
import api from '../api/api';
import { toast } from 'sonner';

const ViewIssueDetailsDialog = ({ open, onClose, issue }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!issue) return null;

  const handleCopyDetails = () => {
    const issuesText = (issue.issues && issue.issues.length > 0)
      ? issue.issues.map(i => `- ${i.category}${i.subCategory ? ` (${i.subCategory})` : ''}`).join('\n      ')
      : issue.issueCategory || 'N/A';

    const detailsText = `Issue Details:
      SLID: ${issue.slid}
      From (Main): ${issue.fromMain || issue.from || 'N/A'}
      From (Sub): ${issue.fromSub || 'N/A'}
      ${issue.reporterNote ? `Reporter Note: ${issue.reporterNote}\n      ` : ''}
      Team/Company: ${issue.teamCompany}
      Customer Name: ${issue.customerName || 'N/A'}
      Contact Info: ${issue.customerContact || 'N/A'}
      Issues:
      ${issuesText}
      Assigned To: ${issue.assignedTo}
      ${issue.assigneeNote ? `Assignee Note: ${issue.assigneeNote}\n      ` : ''}Installing Team: ${issue.installingTeam || 'N/A'}
      Status: ${issue.solved === 'yes' ? 'Resolved' : 'Unresolved'}
      ${issue.solved === 'yes' && issue.resolvedBy ? `Resolved By: ${issue.resolvedBy}\n      ` : ''}${issue.solved === 'yes' ? `Resolve Date: ${issue.resolveDate ? new Date(issue.resolveDate).toLocaleDateString() : 'N/A'}\n      ` : ''}${issue.closedBy ? `Supervisor: ${issue.closedBy}\n      ` : ''}${issue.resolutionDetails ? `Resolution Details: ${issue.resolutionDetails}\n      ` : ''}Date Reported: ${new Date(issue.date).toLocaleDateString()}
      PIS Date: ${issue.pisDate ? new Date(issue.pisDate).toLocaleDateString() : 'N/A'}`;

    navigator.clipboard.writeText(detailsText)
      .then(() => alert('Issue details copied to clipboard!'))
      .catch(() => alert('Failed to copy details'));
  };

  const handleShareWhatsApp = async () => {
    // Build comprehensive message
    let formattedMessage = `*🔔 Issue Report*\n\n`;

    formattedMessage += `*SLID:* ${issue.slid}\n`;
    if (issue.ticketId) formattedMessage += `*Ticket ID:* ${issue.ticketId}\n`;
    formattedMessage += `*Status:* ${issue.solved === 'yes' ? '✅ Resolved' : '⚠️ Open'}\n\n`;

    formattedMessage += `*📍 Source & Team*\n`;
    formattedMessage += `Team Company: ${issue.teamCompany}\n`;
    formattedMessage += `Installing Team: ${issue.installingTeam || 'N/A'}\n`;
    formattedMessage += `Assigned To: ${issue.assignedTo || 'Unassigned'}\n\n`;

    formattedMessage += `*👤 Customer Info*\n`;
    formattedMessage += `Name: ${issue.customerName || 'N/A'}\n`;
    formattedMessage += `Contact: ${issue.customerContact || 'N/A'}\n\n`;

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
      console.log('Fetching field teams for WhatsApp contact...');
      // Fetch field team data to get contact number
      const response = await api.get('/field-teams/get-field-teams', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      console.log('Target Installing Team:', installingTeamName);

      const fieldTeam = response.data.find(team =>
        team.teamName?.trim().toLowerCase() === installingTeamName.trim().toLowerCase()
      );
      console.log('Found Field Team:', fieldTeam);

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      // maxWidth="md"
      // fullWidth
      fullScreen
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: '#2d2d2d',
          boxShadow: 'none',
          borderRadius: isMobile ? 0 : '8px',
          width: isMobile ? '100%' : '100%',
          // margin: isMobile ? 0 : '32px',
          // maxHeight: isMobile ? '100%' : 'calc(100% - 64px)'
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#2d2d2d',
        color: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: isMobile ? '12px 16px' : '16px 24px',
      }}>
        <Typography variant="h6" component="div">
          Issue Details
        </Typography>
        <Box>
          <Tooltip title="Copy Details">
            <IconButton
              onClick={handleCopyDetails}
              sx={{
                mr: 1,
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#2a2a2a',
                }
              }}
            >
              <MdContentCopy />
            </IconButton>
          </Tooltip>
          <Tooltip title="Share via WhatsApp">
            <IconButton
              onClick={handleShareWhatsApp}
              sx={{
                mr: 1,
                color: '#25D366',
                '&:hover': {
                  backgroundColor: 'rgba(37, 211, 102, 0.1)',
                }
              }}
            >
              <MdWhatsapp />
            </IconButton>
          </Tooltip>
          <IconButton
            onClick={onClose}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#2a2a2a',
              }
            }}
          >
            <MdClose />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider sx={{ backgroundColor: '#e5e7eb' }} />

      <DialogContent dividers sx={{
        backgroundColor: '#2d2d2d',
        color: '#ffffff',
        padding: isMobile ? '16px' : '20px 24px',
        '&.MuiDialogContent-root': {
          padding: isMobile ? '16px' : '20px 24px',
        },
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 2 : 3, pt: 1 }}>
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 2,
            backgroundColor: '#2d2d2d',
            borderRadius: 2,
            border: '1px solid #3d3d3d'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: '#ffffff' }}>
              Basic Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 1 : 1.5 }}>
              <DetailRow label="Ticket ID" value={issue.ticketId} darkMode isMobile={isMobile} />
              <DetailRow label="SLID" value={issue.slid} darkMode isMobile={isMobile} />
              <DetailRow label="PIS Date" value={issue.pisDate ? new Date(issue.pisDate).toLocaleDateString() : 'N/A'} darkMode isMobile={isMobile} />
              <DetailRow label="Date Reported" value={issue.date ? new Date(issue.date).toLocaleDateString() : 'N/A'} darkMode isMobile={isMobile} />
              <DetailRow label="Customer Name" value={issue.customerName} darkMode isMobile={isMobile} />
              <DetailRow label="Customer Contact" value={issue.customerContact} darkMode isMobile={isMobile} />
            </Box>
          </Paper>

          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 2,
            backgroundColor: '#2d2d2d',
            borderRadius: 2,
            border: '1px solid #3d3d3d'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: '#ffffff' }}>
              Reporter Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 1 : 1.5 }}>
              <DetailRow label="From (Main)" value={issue.fromMain || issue.from} darkMode isMobile={isMobile} />
              <DetailRow label="From (Sub)" value={issue.fromSub} darkMode isMobile={isMobile} />
              <DetailRow label="Reporter" value={issue.reporter} darkMode isMobile={isMobile} />
              <DetailRow label="Reporter Note" value={issue.reporterNote} darkMode isMobile={isMobile} />
              <DetailRow label="Contact Method" value={issue.contactMethod} darkMode isMobile={isMobile} />
            </Box>
          </Paper>

          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 2,
            backgroundColor: '#2d2d2d',
            borderRadius: 2,
            border: '1px solid #3d3d3d'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: '#ffffff' }}>
              Team Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 1 : 1.5 }}>
              <DetailRow label="Team/Company" value={issue.teamCompany} darkMode isMobile={isMobile} />
              <DetailRow label="Assigned To" value={issue.assignedTo} darkMode isMobile={isMobile} />
              <DetailRow label="Assignee Note" value={issue.assigneeNote} darkMode isMobile={isMobile} />
              <DetailRow label="Installing Team" value={issue.installingTeam} darkMode isMobile={isMobile} />
            </Box>
          </Paper>

          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 2,
            backgroundColor: '#2d2d2d',
            borderRadius: 2,
            border: '1px solid #3d3d3d'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: '#ffffff' }}>
              Issue Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 1 : 1.5 }}>
              {issue.issues && issue.issues.length > 0 ? (
                issue.issues.map((i, idx) => (
                  <DetailRow
                    key={idx}
                    label={`Issue ${idx + 1}`}
                    value={`${i.category}${i.subCategory ? ` - ${i.subCategory}` : ''}`}
                    darkMode
                    isMobile={isMobile}
                  />
                ))
              ) : (
                <DetailRow label="Issue Category" value={issue.issueCategory} darkMode isMobile={isMobile} />
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" color="#ffffff">Status:</Typography>
                <Chip
                  label={issue.solved === 'yes' ? 'Resolved' : 'Unresolved'}
                  color={issue.solved === 'yes' ? 'success' : 'error'}
                  sx={{
                    '&.MuiChip-colorSuccess': {
                      backgroundColor: '#4caf50',
                      color: '#ffffff'
                    },
                    '&.MuiChip-colorError': {
                      backgroundColor: '#f44336',
                      color: '#ffffff'
                    }
                  }}
                />
              </Box>
              {issue.solved === 'yes' && (
                <>
                  {issue.resolvedBy && <DetailRow label="Resolved By" value={issue.resolvedBy} darkMode isMobile={isMobile} />}
                  <DetailRow label="Resolve Date" value={issue.resolveDate ? new Date(issue.resolveDate).toLocaleDateString() : 'N/A'} darkMode isMobile={isMobile} />
                  <DetailRow label="Supervisor" value={issue.closedBy} darkMode isMobile={isMobile} />
                </>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="subtitle1" color="#ffffff">Resolution Details:</Typography>
                <Typography sx={{
                  p: 1.5,
                  backgroundColor: '#2d2d2d',
                  color: '#ffffff',
                  borderRadius: 1,
                  border: '1px solid #3d3d3d'
                }}>
                  {issue.resolutionDetails || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      </DialogContent>

      <Divider sx={{ backgroundColor: '#e5e7eb' }} />

      <DialogActions sx={{
        backgroundColor: '#2d2d2d',
        borderTop: '1px solid #e5e7eb',
        padding: isMobile ? '8px 16px' : '12px 24px',
      }}>
        <Button
          onClick={onClose}
          sx={{
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#2a2a2a',
            }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Updated helper component with mobile responsiveness
const DetailRow = ({ label, value, darkMode, isMobile }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
    <Typography
      variant="subtitle1"
      sx={{
        fontWeight: '500',
        color: darkMode ? '#6b7280' : 'text.primary',
        fontSize: isMobile ? '0.875rem' : '1rem'
      }}
    >
      {label}:
    </Typography>
    <Typography
      sx={{
        maxWidth: '60%',
        textAlign: 'right',
        color: darkMode ? '#ffffff' : 'text.secondary',
        fontSize: isMobile ? '0.875rem' : '1rem'
      }}
    >
      {value || 'N/A'}
    </Typography>
  </Box>
);

export default ViewIssueDetailsDialog;