import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  useMediaQuery,
  useTheme,
  Tooltip
} from '@mui/material';
import { Info, Close } from '@mui/icons-material';
import { FaFileAlt } from 'react-icons/fa';

const ResponsibilityCategoriesDialog = () => {
  const [open, setOpen] = React.useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <Tooltip title="Learn how we assign responsibility" arrow>
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
              Responsibility Categories Guide
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
              We categorize responsibility for service issues into these clear groups to help identify where improvements are needed:
            </Typography>
          </Box>

          {/* Activation Team */}
          <Box sx={{ mb: 3 }}>
            <Chip label="Activation Team" sx={{
              backgroundColor: '#3ea6ff',
              color: '#ffffff',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              height: 'auto',
              py: 1,
              mb: 1
            }} />
            <Typography variant="body1" sx={{ color: '#ffffff', mb: 1 }}>
              Issues caused by the activation/installation team&apos;s work:
            </Typography>
            <List dense sx={{ pl: 2, mb: 1, listStyleType: 'disc' }}>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Incorrect equipment configuration" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Missed installation steps" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Failure to test properly before leaving" />
              </ListItem>
            </List>
          </Box>

          {/* Cabling Team */}
          <Box sx={{ mb: 3 }}>
            <Chip label="Cabling Team" sx={{
              backgroundColor: '#4caf50',
              color: '#ffffff',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              height: 'auto',
              py: 1,
              mb: 1
            }} />
            <Typography variant="body1" sx={{ color: '#ffffff', mb: 1 }}>
              Issues stemming from cabling infrastructure:
            </Typography>
            <List dense sx={{ pl: 2, mb: 1, listStyleType: 'disc' }}>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Improper OTO (Optical Termination Outlet) placement" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Delays in cabling deployment/execution" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Incorrect or suboptimal cable routing" />
              </ListItem>
            </List>
          </Box>

          {/* Customer */}
          <Box sx={{ mb: 3 }}>
            <Chip label="Customer" sx={{
              backgroundColor: '#ff9800',
              color: '#ffffff',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              height: 'auto',
              py: 1,
              mb: 1
            }} />
            <Typography variant="body1" sx={{ color: '#ffffff', mb: 1 }}>
              Issues caused by customer actions or environment:
            </Typography>
            <List dense sx={{ pl: 2, mb: 1, listStyleType: 'disc' }}>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Service Misuse: The customer overloads the network (excessive connected devices) or applies incorrect configurations, even after proper technician guidance" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Unrealistic Expectations: The customer expects performance beyond what their plan or network conditions allow" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Non-Cooperation: The customer does not follow technician advice or declines recommended solutions" />
              </ListItem>
            </List>
          </Box>

          {/* Can't Determine */}
          <Box sx={{ mb: 3 }}>
            <Chip label="Can't Determine" sx={{
              backgroundColor: '#607d8b',
              color: '#ffffff',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              height: 'auto',
              py: 1,
              mb: 1
            }} />
            <Typography variant="body1" sx={{ color: '#ffffff', mb: 1 }}>
              Cases where responsibility cannot be determined:
            </Typography>
            <List dense sx={{ pl: 2, mb: 1, listStyleType: 'disc' }}>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Insufficient information" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="No clear evidence" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Intermittent issues: Problems that occur sporadically, making them difficult to diagnose (e.g., random disconnections, fluctuating speeds)." />
              </ListItem>
            </List>

            <Typography variant="body1" sx={{ color: '#ffffff' }}>
              Note:
            </Typography>
            <ListItem dense sx={{ pl: 1, mb: 1 }}>
              <ListItemText primary="Some tickets may be labeled 'Can't Determine' until on-site validation or sufficient information becomes available to clarify responsibility" />
            </ListItem>
          </Box>

          {/* Others */}
          <Box sx={{ mb: 2 }}>
            <Chip label="Others" sx={{
              backgroundColor: '#9c27b0',
              color: '#ffffff',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              height: 'auto',
              py: 1,
              mb: 1
            }} />
            <Typography variant="body1" sx={{ color: '#ffffff', mb: 1 }}>
              Miscellaneous or external factors:
            </Typography>
            <List dense sx={{ pl: 2, mb: 1, listStyleType: 'disc' }}>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Third-party service issues" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Equipment failures" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Area-wide outages" />
              </ListItem>
            </List>
          </Box>

          <Divider sx={{ backgroundColor: '#444', my: 2 }} />

          <Typography variant="body2" sx={{ color: '#aaaaaa', fontStyle: 'italic' }}>
            Note: Responsibility assignment is based on thorough investigation and evidence. When in doubt, we default to &quot;Can&apos;t Detected&quot; to avoid incorrect attributions.
          </Typography>
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

export default ResponsibilityCategoriesDialog;