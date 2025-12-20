import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Tooltip,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Info, Close } from '@mui/icons-material';
import { FaFileAlt } from 'react-icons/fa';

const IssueCategoriesDialog = () => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <Tooltip title="Learn how we categorize issues" arrow>
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
            backgroundColor: '#2d2d2d',
            color: '#ffffff',
            borderRadius: isMobile ? 0 : '8px',
            border: '1px solid #3d3d3d',
          },
        }}
      >
        <DialogTitle component="div" sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e5e7eb',
          padding: isMobile ? '12px 16px' : '16px 24px',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FaFileAlt color="#7b68ee" size={isMobile ? 16 : 20} />
            <Typography variant={isMobile ? "subtitle1" : "h6"} component="div" sx={{ fontSize: isMobile ? 13 : 20 }}>
              Issue Categorization Guide
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
            backgroundColor: '#e5e7eb',
            borderRadius: '2px',
          },
        }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ color: '#ffffff', mb: 2 }}>
              To maintain high-quality service delivery and fair evaluation, we categorize customer feedback into three main areas. These categories help us identify the root cause of issues and take appropriate action.
            </Typography>
          </Box>

          {/* Customer Education */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Chip label="Customer Education" sx={{
                backgroundColor: '#7b68ee',
                color: '#ffffff',
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                height: 'auto',
                py: 1
              }} />
            </Box>

            <Typography variant="subtitle2" sx={{ color: '#b3b3b3', mb: 1 }}>
              Definition:
            </Typography>
            <Typography variant="body1" sx={{ color: '#ffffff', mb: 2 }}>
              When the customer is unaware of speed limitations, Wi-Fi bands (2.4G/5G), or basic troubleshooting, and no technical issues are found with the service.
            </Typography>

            <Typography variant="subtitle2" sx={{ color: '#b3b3b3', mb: 1 }}>
              Examples:
            </Typography>
            <List dense sx={{ pl: 2, mb: 2, listStyleType: 'disc' }}>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Customer doesn't understand the difference between 2.4GHz and 5GHz bands" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Customer expects higher speeds than their plan provides" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Unrealistic expectations about Wi-Fi range (through multiple thick walls)" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Maximum supported speeds of customer's devices" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Wi-Fi standards compatibility" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Common VPN Misconceptions" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Customer using wireless extender correctly placed but unaware of inherent 50% speed reduction" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Wired (Ethernet) backhaul connection maintains full speed" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Technically proper single-router setup in large home where customer expects full coverage without extenders" />
              </ListItem>
            </List>

            <Typography variant="subtitle2" sx={{ color: '#b3b3b3', mb: 1 }}>
              When We Use This Category:
            </Typography>
            <List dense sx={{ pl: 2, mb: 2, listStyleType: 'disc' }}>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="No technical issues are found" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="The comment is clear and falls within customer education" />
              </ListItem>
            </List>
          </Box>

          <Divider sx={{ backgroundColor: '#e5e7eb', my: 3 }} />

          {/* Lack of Technical Expertise */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Chip label="Lack of Technical Expertise" sx={{
                backgroundColor: '#f44336',
                color: '#ffffff',
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                height: 'auto',
                py: 1
              }} />
            </Box>

            <Typography variant="subtitle2" sx={{ color: '#b3b3b3', mb: 1 }}>
              Definition:
            </Typography>
            <Typography variant="body1" sx={{ color: '#ffffff', mb: 2 }}>
              When the issue arises from installation mistakes, incorrect troubleshooting, or poor network setup by the technician.
            </Typography>

            <Typography variant="subtitle2" sx={{ color: '#b3b3b3', mb: 1 }}>
              Examples:
            </Typography>
            <List dense sx={{ pl: 2, mb: 2, listStyleType: 'disc' }}>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Improper cable splicing or poor signal levels" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Incorrect router configuration" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Failed to test internet before leaving" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Skipped signal strength testing in all rooms" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Incorrect Router or Extender Placement" />
              </ListItem>
            </List>

            <Typography variant="subtitle2" sx={{ color: '#b3b3b3', mb: 1 }}>
              When We Use This Category:
            </Typography>
            <List dense sx={{ pl: 2, mb: 2, listStyleType: 'disc' }}>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Feedback is validated through an on-site visit" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Clear evidence of technician error exists" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="The issue required rework" />
              </ListItem>
            </List>
          </Box>

          <Divider sx={{ backgroundColor: '#e5e7eb', my: 3 }} />

          {/* Knowledge Gap */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Chip label="Knowledge Gap" sx={{
                backgroundColor: '#ff9800',
                color: '#ffffff',
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                height: 'auto',
                py: 1
              }} />
            </Box>

            <Typography variant="subtitle2" sx={{ color: '#b3b3b3', mb: 1 }}>
              Definition:
            </Typography>
            <Typography variant="body1" sx={{ color: '#ffffff', mb: 2 }}>
              When the issue could be due to either technical shortcomings or customer awareness, but the comment is unclear or lacks sufficient information.
            </Typography>

            <Typography variant="subtitle2" sx={{ color: '#b3b3b3', mb: 1 }}>
              Examples:
            </Typography>
            <List dense sx={{ pl: 2, mb: 2, listStyleType: 'disc' }}>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Vague complaints like 'Internet doesn't work well'" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Feedback that could point to either technical or education issues" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Reports that lack specific details about the problem" />
              </ListItem>
            </List>

            <Typography variant="subtitle2" sx={{ color: '#b3b3b3', mb: 1 }}>
              When We Use This Category:
            </Typography>
            <List dense sx={{ pl: 2, mb: 2, listStyleType: 'disc' }}>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="The comment is unclear or ambiguous" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Could reasonably be either customer education or technical issue" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Acts as a placeholder until more information is available" />
              </ListItem>
            </List>

            <Typography variant="subtitle2" sx={{ color: '#b3b3b3' }}>
              Note:
            </Typography>
            <ListItem sx={{ pl: 1, color: '#ffffff' }}>
              <ListItemText primary='Tickets labeled as "Knowledge gap" are initially categorized based on limited information and serve as placeholders. The categorization may be updated once additional details are gathered or after on-site validation confirms the issue&apos;s nature.' />
            </ListItem>
          </Box>


          <Divider sx={{ backgroundColor: '#e5e7eb', my: 3 }} />

          {/* Bad Team Behavior */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Chip label="Bad Team Behavior" sx={{
                backgroundColor: '#9c27b0',
                color: '#ffffff',
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                height: 'auto',
                py: 1
              }} />
            </Box>

            <Typography variant="subtitle2" sx={{ color: '#b3b3b3', mb: 1 }}>
              Definition:
            </Typography>
            <Typography variant="body1" sx={{ color: '#ffffff', mb: 2 }}>
              When the customer reports issues with the technician&apos;s conduct rather than technical service.
            </Typography>

            <Typography variant="subtitle2" sx={{ color: '#b3b3b3', mb: 1 }}>
              Examples:
            </Typography>
            <List dense sx={{ pl: 2, mb: 2, listStyleType: 'disc' }}>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Rudeness or unprofessional behavior" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Significant late arrival without notification" />
              </ListItem>
            </List>

            <Typography variant="subtitle2" sx={{ color: '#b3b3b3', mb: 1 }}>
              When We Use This Category:
            </Typography>
            <List dense sx={{ pl: 2, mb: 2, listStyleType: 'disc' }}>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="The complaint is specifically about conduct, not technical issues" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Behavioral issues are reported by the customer" />
              </ListItem>
            </List>
          </Box>
        </DialogContent>

        <DialogActions sx={{
          borderTop: '1px solid #e5e7eb',
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
      </Dialog >
    </>
  );
};

export default IssueCategoriesDialog;