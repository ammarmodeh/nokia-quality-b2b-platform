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
  useTheme
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { FaBalanceScale } from 'react-icons/fa';

const ViolationEvaluationDialog = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
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
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e5e7eb',
          padding: isMobile ? '12px 16px' : '16px 24px',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FaBalanceScale color="#7b68ee" size={isMobile ? 16 : 20} />
            <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontSize: isMobile ? 13 : 20 }}>
              Violation Evaluation Guide
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
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
              Our violation evaluation system ensures fair and consistent consequences for teams based on customer feedback scores. The system categorizes violations and applies progressive consequences.
            </Typography>
          </Box>

          {/* Detractor Customers */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Chip label="Detractor Customers (Score 1-6)" sx={{
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
              Customers who rate their experience between 1-6, indicating significant dissatisfaction with the service.
            </Typography>

            <Typography variant="subtitle2" sx={{ color: '#b3b3b3', mb: 1 }}>
              Violation Consequences:
            </Typography>
            <List dense sx={{ pl: 2, mb: 2, listStyleType: 'disc' }}>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="First-time offense: Verbal warning and mandatory coaching session on quality improvement" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Second-time offense (within 3 months): Formal warning and financial deduction (if applicable)" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Third-time offense (3+ occurrences within 6 months): Stronger penalties such as long-term suspension. Upon returning, the individual must attend a performance review meeting" />
              </ListItem>
            </List>
          </Box>

          <Divider sx={{ backgroundColor: '#e5e7eb', my: 3 }} />

          {/* Passive Customers */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Chip label="Passive Customers (Score 7-8)" sx={{
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
              Customers who rate their experience between 7-8, indicating they were satisfied but not delighted with the service.
            </Typography>

            <Typography variant="subtitle2" sx={{ color: '#b3b3b3', mb: 1 }}>
              Violation Consequences:
            </Typography>
            <List dense sx={{ pl: 2, mb: 2, listStyleType: 'disc' }}>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="First-time offense: Verbal warning and guidance on improvement areas" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Second-time offense (within 3 months): Performance improvement session" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Third-time offense (3+ occurrences within 6 months): Closer monitoring. If another passive customer is recorded, it will be counted as one detractor in impact scaling, leading to the same consequence as a first-time detractor offense" />
              </ListItem>
            </List>
          </Box>

          <Divider sx={{ backgroundColor: '#e5e7eb', my: 3 }} />

          {/* Fairness Measures */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Chip label="Fairness Measures" sx={{
                backgroundColor: '#4caf50',
                color: '#ffffff',
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                height: 'auto',
                py: 1
              }} />
            </Box>

            <Typography variant="subtitle2" sx={{ color: '#b3b3b3', mb: 1 }}>
              Considerations:
            </Typography>
            <List dense sx={{ pl: 2, mb: 2, listStyleType: 'disc' }}>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Customer Issue Validation: Before penalizing a team, confirm whether the customer's issue resulted from an actual violation or external factors (e.g., unresolved technical issues)" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', p: 0, color: '#ffffff' }}>
                <ListItemText primary="Impact Scaling: Every three passive customer cases will be considered equivalent to one detractor" />
              </ListItem>
            </List>

            <Typography variant="subtitle2" sx={{ color: '#b3b3b3', mb: 1 }}>
              Threshold Calculation:
            </Typography>
            <Typography variant="body1" sx={{ color: '#ffffff', mb: 2 }}>
              The system calculates &quot;Equivalent Detractors&quot; by combining actual detractors with scaled passive cases (3 passives = 1 detractor). When a team reaches 3 equivalent detractors within 6 months, the violation threshold is triggered.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{
          borderTop: '1px solid #e5e7eb',
          padding: isMobile ? '8px 16px' : '12px 24px',
        }}>
          <Button
            onClick={onClose}
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

export default ViolationEvaluationDialog;