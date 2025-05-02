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
    const detailsText = `Issue Details:
      SLID: ${issue.slid}
      From: ${issue.from}
      Reporter: ${issue.reporter}
      ${issue.reporterNote ? `Reporter Note: ${issue.reporterNote}\n` : ''}
      Team/Company: ${issue.teamCompany}
      Contact Method: ${issue.contactMethod}
      Issue Category: ${issue.issueCategory}
      Assigned To: ${issue.assignedTo}
      ${issue.assignedNote ? `Assigned Note: ${issue.assignedNote}\n` : ''}
      Status: ${issue.solved === 'yes' ? 'Resolved' : 'Unresolved'}
      ${issue.resolutionDetails ? `Resolution Details: ${issue.resolutionDetails}\n` : ''}
      Date Reported: ${new Date(issue.date).toLocaleDateString()}
      PIS Date: ${issue.pisDate ? new Date(issue.pisDate).toLocaleDateString() : 'N/A'}`;

    navigator.clipboard.writeText(detailsText)
      .then(() => alert('Issue details copied to clipboard!'))
      .catch(() => alert('Failed to copy details'));
  };

  const handleShareWhatsApp = () => {
    const reportedDate = issue.date ? new Date(issue.date).toLocaleDateString() : 'N/A';
    const pisDate = issue.pisDate ? new Date(issue.pisDate).toLocaleDateString() : 'N/A';

    const message = `*CIN*\n
  *SLID*: ${issue.slid || 'N/A'}
  *From*: ${issue.from || 'N/A'}
  *Reporter*: ${issue.reporter || 'N/A'}
  *Reporter Note*: ${issue.reporterNote || 'N/A'}
  *Team/Company*: ${issue.teamCompany || 'N/A'}
  *Contact Method*: ${issue.contactMethod || 'N/A'}
  *Issue Category*: ${issue.issueCategory || 'N/A'}
  *Status*: ${issue.solved === 'yes' ? 'Resolved' : 'Pending'}
  ${issue.solved === 'yes' ? `*Resolution Details*: ${issue.resolutionDetails || 'N/A'}\n` : ''}
  *Date Reported*: ${reportedDate}
  *PIS Date*: ${pisDate}
  
  *Assigned To*: ${issue.assignedTo || 'N/A'}
  *Assigned Note*: ${issue.assignedNote || 'N/A'}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md" // Changed from "sm" to "md" for wider desktop view
      fullWidth
      fullScreen={isMobile} // Makes dialog full screen on mobile
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: '#1e1e1e',
          boxShadow: 'none',
          borderRadius: isMobile ? 0 : '8px', // Remove border radius on mobile
          width: isMobile ? '100%' : 'auto',
          margin: isMobile ? 0 : '32px',
          maxHeight: isMobile ? '100%' : 'calc(100% - 64px)'
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        borderBottom: '1px solid #444',
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

      <Divider sx={{ backgroundColor: '#444' }} />

      <DialogContent dividers sx={{
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        padding: isMobile ? '16px' : '20px 24px',
        '&.MuiDialogContent-root': {
          padding: isMobile ? '16px' : '20px 24px',
        },
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 2 : 3, pt: 1 }}>
          {/* Basic Information Section */}
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 2,
            backgroundColor: '#272727',
            borderRadius: 2,
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: '#ffffff' }}>
              Basic Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 1 : 1.5 }}>
              <DetailRow label="SLID" value={issue.slid} darkMode isMobile={isMobile} />
              <DetailRow label="PIS Date" value={issue.pisDate ? new Date(issue.pisDate).toLocaleDateString() : 'N/A'} darkMode isMobile={isMobile} />
              <DetailRow label="Date Reported" value={issue.date ? new Date(issue.date).toLocaleDateString() : 'N/A'} darkMode isMobile={isMobile} />
            </Box>
          </Paper>

          {/* Reporter Information Section */}
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 2,
            backgroundColor: '#272727',
            borderRadius: 2,
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: '#ffffff' }}>
              Reporter Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 1 : 1.5 }}>
              <DetailRow label="From" value={issue.from} darkMode isMobile={isMobile} />
              <DetailRow label="Reporter" value={issue.reporter} darkMode isMobile={isMobile} />
              <DetailRow label="Reporter Note" value={issue.reporterNote} darkMode isMobile={isMobile} />
              <DetailRow label="Contact Method" value={issue.contactMethod} darkMode isMobile={isMobile} />
            </Box>
          </Paper>

          {/* Team Information Section */}
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 2,
            backgroundColor: '#272727',
            borderRadius: 2,
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: '#ffffff' }}>
              Team Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 1 : 1.5 }}>
              <DetailRow label="Team/Company" value={issue.teamCompany} darkMode isMobile={isMobile} />
              <DetailRow label="Assigned To" value={issue.assignedTo} darkMode isMobile={isMobile} />
              <DetailRow label="Assigned Note" value={issue.assignedNote || "N/A"} darkMode isMobile={isMobile} />
            </Box>
          </Paper>

          {/* Issue Information Section */}
          <Paper elevation={0} sx={{
            p: isMobile ? 1.5 : 2,
            backgroundColor: '#272727',
            borderRadius: 2,
            border: '1px solid #444'
          }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: '#ffffff' }}>
              Issue Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 1 : 1.5 }}>
              <DetailRow label="Issue Category" value={issue.issueCategory} darkMode isMobile={isMobile} />
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="subtitle1" color="#ffffff">Resolution Details:</Typography>
                <Typography sx={{
                  p: 1.5,
                  backgroundColor: '#333',
                  color: '#ffffff',
                  borderRadius: 1,
                  border: '1px solid #444'
                }}>
                  {issue.resolutionDetails || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      </DialogContent>

      <Divider sx={{ backgroundColor: '#444' }} />

      <DialogActions sx={{
        backgroundColor: '#1e1e1e',
        borderTop: '1px solid #444',
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
        color: darkMode ? '#aaaaaa' : 'text.primary',
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