import {
  Box,
  Typography,
  Paper,
  Dialog,
  DialogActions,
  Divider,
  DialogContent,
  IconButton,
  DialogTitle,
  Tooltip,
  Chip,
  Button,
  useMediaQuery,
} from "@mui/material";
import { FaCopy, FaTimes } from "react-icons/fa";

const DetailRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
    <Typography
      variant="body2"
      component="div"
      sx={{
        fontWeight: '500',
        color: '#aaaaaa'
      }}
    >
      {label}
    </Typography>
    {typeof value === 'string' || typeof value === 'number' ? (
      <Typography
        variant="body1"
        component="div"
        sx={{
          color: '#ffffff',
          wordBreak: 'break-word'
        }}
      >
        {value || 'N/A'}
      </Typography>
    ) : (
      <Box sx={{ display: 'inline-block' }}>
        {value}
      </Box>
    )}
  </Box>
);

const TicketDetailsDialogForPortalView = ({ open, onClose, ticket, onCopy }) => {
  const isMobile = useMediaQuery('(max-width: 503px)');

  const colors = {
    background: '#121212',
    surface: '#1e1e1e',
    surfaceElevated: '#252525',
    border: '#444',
    primary: '#3ea6ff',
    primaryHover: 'rgba(62, 166, 255, 0.08)',
    textPrimary: '#ffffff',
    textSecondary: '#9e9e9e',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
  };

  if (!ticket) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: colors.surface,
          color: colors.textPrimary,
          borderRadius: isMobile ? '0px' : '8px',
          m: isMobile ? '0px' : undefined,
          width: isMobile ? '100%' : undefined,
          maxHeight: isMobile ? '100%' : undefined
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderBottom: `1px solid ${colors.border}`,
        padding: '16px 24px',
      }}>
        <Typography variant="h6">
          Ticket Details - {ticket.slid}
        </Typography>
        <Box>
          <Tooltip title="Copy Details">
            <IconButton
              onClick={() => onCopy(ticket)}
              sx={{
                mr: 1,
                color: colors.textPrimary,
                '&:hover': {
                  backgroundColor: colors.primaryHover,
                }
              }}
            >
              <FaCopy />
            </IconButton>
          </Tooltip>
          <IconButton
            onClick={onClose}
            sx={{
              color: colors.textPrimary,
              '&:hover': {
                backgroundColor: colors.primaryHover,
              }
            }}
          >
            <FaTimes />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider sx={{ backgroundColor: colors.border }} />

      <DialogContent dividers sx={{
        backgroundColor: colors.surface,
        padding: '20px 24px',
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Basic Information Section */}
          <Paper elevation={0} sx={{
            p: 2,
            backgroundColor: colors.surfaceElevated,
            borderRadius: 2,
            border: `1px solid ${colors.border}`
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: colors.primary }}>
              Basic Information
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <DetailRow label="SLID" value={ticket.slid} />
              <DetailRow label="Request Number" value={ticket.requestNumber} />
              <DetailRow label="Customer Name" value={ticket.customerName} />
              <DetailRow label="Contact Number" value={ticket.contactNumber} />
              <DetailRow label="PIS Date" value={ticket.pisDate ? new Date(ticket.pisDate).toLocaleDateString() : 'N/A'} />
              <DetailRow label="Tariff Name" value={ticket.tarrifName} />
              <DetailRow label="Customer Type" value={ticket.customerType} />
              <DetailRow label="Interview Date" value={ticket.interviewDate ? new Date(ticket.interviewDate).toLocaleDateString() : 'N/A'} />
            </Box>
          </Paper>

          {/* Location Information Section */}
          <Paper elevation={0} sx={{
            p: 2,
            backgroundColor: colors.surfaceElevated,
            borderRadius: 2,
            border: `1px solid ${colors.border}`
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: colors.primary }}>
              Location Information
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <DetailRow label="Governorate" value={ticket.governorate} />
              <DetailRow label="District" value={ticket.district} />
            </Box>
          </Paper>

          {/* Team Information Section */}
          <Paper elevation={0} sx={{
            p: 2,
            backgroundColor: colors.surfaceElevated,
            borderRadius: 2,
            border: `1px solid ${colors.border}`
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: colors.primary }}>
              Team Information
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <DetailRow label="Team Name" value={ticket.teamName} />
              <DetailRow label="Team Company" value={ticket.teamCompany} />
            </Box>
          </Paper>

          {/* Evaluation Section */}
          <Paper elevation={0} sx={{
            p: 2,
            backgroundColor: colors.surfaceElevated,
            borderRadius: 2,
            border: `1px solid ${colors.border}`
          }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: colors.primary }}>
              Evaluation
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <DetailRow
                label="Evaluation Score"
                value={
                  <Chip
                    label={`${ticket.evaluationScore || 'N/A'}`}
                    sx={{
                      color: '#ffffff',
                      backgroundColor: ticket.evaluationScore >= 9 ? colors.success :
                        ticket.evaluationScore >= 7 ? colors.warning : colors.error,
                      fontWeight: 'bold'
                    }}
                  />
                }
              />
              <DetailRow label="Customer Feedback" value={ticket.customerFeedback} />
              <DetailRow label="Reason" value={ticket.reason} />
              <DetailRow label="Status" value={ticket.status} />
            </Box>
          </Paper>
        </Box>
      </DialogContent>

      <Divider sx={{ backgroundColor: colors.border }} />

      <DialogActions sx={{
        backgroundColor: colors.surfaceElevated,
        borderTop: `1px solid ${colors.border}`,
        padding: '12px 24px',
      }}>
        <Button
          onClick={onClose}
          sx={{
            color: colors.textPrimary,
            '&:hover': {
              backgroundColor: colors.primaryHover,
            }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TicketDetailsDialogForPortalView
