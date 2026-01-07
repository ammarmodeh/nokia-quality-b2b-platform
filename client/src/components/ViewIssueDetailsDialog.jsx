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
      Reporter: ${issue.reporter}
      ${issue.reporterNote ? `Reporter Note: ${issue.reporterNote}\n      ` : ''}Team/Company: ${issue.teamCompany}
      Customer Name: ${issue.customerName || 'N/A'}
      Customer Contact: ${issue.customerContact || 'N/A'}
      Contact Method: ${issue.contactMethod}
      Issues:
      ${issuesText}
      Assigned To: ${issue.assignedTo}
      ${issue.assigneeNote ? `Assignee Note: ${issue.assigneeNote}\n      ` : ''}Installing Team: ${issue.installingTeam || 'N/A'}
      Status: ${issue.solved === 'yes' ? 'Resolved' : 'Unresolved'}
      ${issue.solved === 'yes' && issue.resolvedBy ? `Resolved By: ${issue.resolvedBy}\n      ` : ''}${issue.solved === 'yes' ? `Resolve Date: ${issue.resolveDate ? new Date(issue.resolveDate).toLocaleDateString() : 'N/A'}\n      ` : ''}${issue.closedBy ? `Closed By (Supervisor): ${issue.closedBy}\n      ` : ''}${issue.resolutionDetails ? `Resolution Details: ${issue.resolutionDetails}\n      ` : ''}Date Reported: ${new Date(issue.date).toLocaleDateString()}
      PIS Date: ${issue.pisDate ? new Date(issue.pisDate).toLocaleDateString() : 'N/A'}`;

    navigator.clipboard.writeText(detailsText)
      .then(() => alert('Issue details copied to clipboard!'))
      .catch(() => alert('Failed to copy details'));
  };

  const handleShareWhatsApp = () => {
    const reportedDate = issue.date ? new Date(issue.date).toLocaleDateString() : 'N/A';
    const pisDate = issue.pisDate ? new Date(issue.pisDate).toLocaleDateString() : 'N/A';
    const resolveDate = issue.resolveDate ? new Date(issue.resolveDate).toLocaleDateString() : 'N/A';

    const issuesMsg = (issue.issues && issue.issues.length > 0)
      ? issue.issues.map(i => `• ${i.category}${i.subCategory ? ` (${i.subCategory})` : ''}`).join('\n  ')
      : issue.issueCategory || 'N/A';

    const message = `*CIN*\n
  *SLID*: ${issue.slid || 'N/A'}
  *From (Main)*: ${issue.fromMain || issue.from || 'N/A'}
  *From (Sub)*: ${issue.fromSub || 'N/A'}
  *Reporter*: ${issue.reporter || 'N/A'}
  *Reporter Note*: ${issue.reporterNote || 'N/A'}
  *Team/Company*: ${issue.teamCompany || 'N/A'}
  *Customer Name*: ${issue.customerName || 'N/A'}
  *Customer Contact*: ${issue.customerContact || 'N/A'}
  *Contact Method*: ${issue.contactMethod || 'N/A'}
  *Issues*:
  ${issuesMsg}
  *Assigned To*: ${issue.assignedTo || 'N/A'}
  ${issue.assigneeNote ? `*Assignee Note*: ${issue.assigneeNote}\n  ` : ''}*Installing Team*: ${issue.installingTeam || 'N/A'}
  *Status*: ${issue.solved === 'yes' ? 'Resolved' : 'Pending'}
  ${issue.solved === 'yes' && issue.resolvedBy ? `*Resolved By*: ${issue.resolvedBy}\n  ` : ''}${issue.solved === 'yes' ? `*Resolve Date*: ${resolveDate}\n  *Closed By (Supervisor)*: ${issue.closedBy || 'N/A'}\n  *Resolution Details*: ${issue.resolutionDetails || 'N/A'}\n` : ''}
  *Date Reported*: ${reportedDate}
  *PIS Date*: ${pisDate}
  
  *Assigned To*: ${issue.assignedTo || 'N/A'}
  *Installing Team*: ${issue.installingTeam || 'N/A'}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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
                  <DetailRow label="Closed By (Supervisor)" value={issue.closedBy} darkMode isMobile={isMobile} />
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