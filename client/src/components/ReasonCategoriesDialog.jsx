import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Box,
  Button,
  Chip,
  useMediaQuery,
  useTheme,
  Tooltip
} from '@mui/material';
import { Info, Close } from '@mui/icons-material';
import { FaFileAlt } from 'react-icons/fa';

const ReasonCategoriesDialog = () => {
  const [open, setOpen] = React.useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <Tooltip title="Learn how we categorize reasons" arrow>
        <IconButton
          onClick={handleOpen}
          size="small"
          sx={{ color: '#ffffff', ml: 0.5 }}
        >
          <Info fontSize="small" />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            borderRadius: isMobile ? 0 : '8px',
            border: '1px solid #444',
          },
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #444',
          padding: isMobile ? '12px 16px' : '16px 24px',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FaFileAlt color="#3ea6ff" size={isMobile ? 16 : 20} />
            <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontSize: isMobile ? 13 : 20 }}>
              Reason Categories Guide
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            size={isMobile ? "small" : "medium"}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <Close fontSize={isMobile ? "small" : "medium"} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{
          padding: isMobile ? '12px 16px' : '20px 24px',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#444',
            borderRadius: '2px',
          },
        }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ color: '#ffffff', mb: 2 }}>
              Our categorization of customer feedback reasons helps identify patterns and areas for improvement in service delivery. Here&apos;s how we classify each reason type:
            </Typography>
          </Box>

          {/* Speed */}
          <Box sx={{ mb: 3 }}>
            <Chip label="🚀 Speed" sx={{
              backgroundColor: '#3ea6ff',
              color: '#ffffff',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              height: 'auto',
              py: 1,
              mb: 1
            }} />
            <Typography variant="body1" sx={{ color: '#ffffff' }}>
              Complaints about internet speed not meeting expectations, regardless of actual measured speed.
            </Typography>
          </Box>

          {/* Disconnection */}
          <Box sx={{ mb: 3 }}>
            <Chip label="🔌 Disconnection" sx={{
              backgroundColor: '#f44336',
              color: '#ffffff',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              height: 'auto',
              py: 1,
              mb: 1
            }} />
            <Typography variant="body1" sx={{ color: '#ffffff' }}>
              Reports of complete service interruptions or frequent disconnections.
            </Typography>
          </Box>

          {/* WiFi Coverage */}
          <Box sx={{ mb: 3 }}>
            <Chip label="📶 WiFi Coverage" sx={{
              backgroundColor: '#4caf50',
              color: '#ffffff',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              height: 'auto',
              py: 1,
              mb: 1
            }} />
            <Typography variant="body1" sx={{ color: '#ffffff' }}>
              Issues with WiFi signal strength or dead zones in the customer&apos;s premises.
            </Typography>
          </Box>

          {/* Positive Feedback */}
          <Box sx={{ mb: 3 }}>
            <Chip label="👍 Positive Feedback" sx={{
              backgroundColor: '#673ab7',
              color: '#ffffff',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              height: 'auto',
              py: 1,
              mb: 1
            }} />
            <Typography variant="body1" sx={{ color: '#ffffff' }}>
              Positive comments about service quality or installation experience.
            </Typography>
          </Box>

          {/* Trial Phase */}
          <Box sx={{ mb: 3 }}>
            <Chip label="🔄 Trial Phase" sx={{
              backgroundColor: '#ff9800',
              color: '#ffffff',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              height: 'auto',
              py: 1,
              mb: 1
            }} />
            <Typography variant="body1" sx={{ color: '#ffffff' }}>
              Customer hesitance to provide definitive feedback due to the service being new.
            </Typography>
          </Box>

          {/* Slow Internet Performance */}
          <Box sx={{ mb: 3 }}>
            <Chip label="🐢 Slow Internet Performance" sx={{
              backgroundColor: '#009688',
              color: '#ffffff',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              height: 'auto',
              py: 1,
              mb: 1
            }} />
            <Typography variant="body1" sx={{ color: '#ffffff' }}>
              General complaints about sluggish performance without specific speed metrics.
            </Typography>
          </Box>

          {/* Silent Response */}
          <Box sx={{ mb: 3 }}>
            <Chip label="🤐 Silent Response" sx={{
              backgroundColor: '#607d8b',
              color: '#ffffff',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              height: 'auto',
              py: 1,
              mb: 1
            }} />
            <Typography variant="body1" sx={{ color: '#ffffff' }}>
              Non-committal feedback like &quot;No Comment&quot; or &quot;No Reason&quot;.
            </Typography>
          </Box>

          {/* Can't Determine */}
          <Box sx={{ mb: 3 }}>
            <Chip label="❓ Can't Determine" sx={{
              backgroundColor: '#795548',
              color: '#ffffff',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              height: 'auto',
              py: 1,
              mb: 1
            }} />
            <Typography variant="body1" sx={{ color: '#ffffff' }}>
              Issues where the root cause cannot be determined from available information.
            </Typography>
          </Box>

          {/* Performance Inconsistency */}
          <Box sx={{ mb: 3 }}>
            <Chip label="📊 Performance Inconsistency" sx={{
              backgroundColor: '#e91e63',
              color: '#ffffff',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              height: 'auto',
              py: 1,
              mb: 1
            }} />
            <Typography variant="body1" sx={{ color: '#ffffff' }}>
              Mixed feedback citing periods of optimal performance alongside unexplained degradation
            </Typography>
          </Box>

          {/* Ping */}
          <Box sx={{ mb: 2 }}>
            <Chip label="Ping" sx={{
              backgroundColor: '#8bc34a',
              color: '#ffffff',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              height: 'auto',
              py: 1,
              mb: 1
            }} />
            <Typography variant="body1" sx={{ color: '#ffffff' }}>
              Specific complaints about latency or ping times affecting real-time applications.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{
          borderTop: '1px solid #444',
          padding: isMobile ? '8px 16px' : '12px 24px',
        }}>
          <Button
            onClick={handleClose}
            size={isMobile ? "small" : "medium"}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReasonCategoriesDialog;