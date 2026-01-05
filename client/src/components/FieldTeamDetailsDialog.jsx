import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Divider,
  Chip,
  Avatar,
  Stack,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Badge,
  Phone,
  Business,
  History,
  Info,
  Laptop,
  Settings,
  Person
} from '@mui/icons-material';

const FieldTeamDetailsDialog = ({ open, onClose, team }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!team) return null;

  const DetailItem = ({ icon, label, value, color = '#7b68ee' }) => (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, textTransform: 'uppercase', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {React.cloneElement(icon, { sx: { fontSize: 14, color: '#444' } })} {label}
      </Typography>
      <Typography variant="body1" sx={{ color: '#fff', fontWeight: 500 }}>
        {value || 'N/A'}
      </Typography>
    </Box>
  );

  const getStatusColor = () => {
    if (team.isTerminated) return '#f44336';
    if (team.isSuspended) return '#ed6c02';
    if (team.isOnLeave) return '#9c27b0';
    if (team.isActive) return '#4caf50';
    return '#757575';
  };

  const getStatusLabel = () => {
    if (team.isTerminated) return 'Terminated';
    if (team.isSuspended) return 'Suspended';
    if (team.isOnLeave) return 'On Leave';
    if (team.isActive) return 'Active';
    return 'Inactive';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          bgcolor: '#000',
          border: '1px solid #333',
          borderRadius: 3,
          boxShadow: '0 24px 48px rgba(0,0,0,0.8)',
          backgroundImage: 'none'
        }
      }}
    >
      <DialogTitle sx={{
        bgcolor: '#111',
        borderBottom: '1px solid #222',
        p: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#7b68ee', width: 48, height: 48 }}>
            <Badge sx={{ fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
              {team.teamName}
            </Typography>
            <Chip
              label={getStatusLabel()}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 800,
                bgcolor: `${getStatusColor()}20`,
                color: getStatusColor(),
                border: `1px solid ${getStatusColor()}40`
              }}
            />
          </Box>
        </Box>
        <Button onClick={onClose} sx={{ color: '#666', '&:hover': { color: '#fff' } }}>
          Close
        </Button>
      </DialogTitle>

      <DialogContent sx={{ p: 4, bgcolor: '#000' }}>
        <Grid container spacing={4}>
          {/* Section 1: Identity */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ color: '#7b68ee', fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person fontSize="small" /> TEAM IDENTITY
            </Typography>
            <Box sx={{ bgcolor: '#111', p: 3, borderRadius: 2, border: '1px solid #222' }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <DetailItem icon={<Person />} label="First Name" value={team.firstName} />
                </Grid>
                <Grid item xs={6}>
                  <DetailItem icon={<Person />} label="Second Name" value={team.secondName} />
                </Grid>
                <Grid item xs={6}>
                  <DetailItem icon={<Person />} label="Third Name" value={team.thirdName} />
                </Grid>
                <Grid item xs={6}>
                  <DetailItem icon={<Person />} label="Surname" value={team.surname} />
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Section 2: Professional Details */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ color: '#7b68ee', fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Business fontSize="small" /> PROFESSIONAL PROFILE
            </Typography>
            <Box sx={{ bgcolor: '#111', p: 3, borderRadius: 2, border: '1px solid #222' }}>
              <DetailItem icon={<Business />} label="Company" value={team.teamCompany} />
              <DetailItem icon={<Phone />} label="Contact Number" value={team.contactNumber} />
              <DetailItem icon={<Info />} label="Team Code (ID)" value={team.teamCode} />
            </Box>
          </Grid>

          {/* Section 3: Hardware Assets */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ color: '#7b68ee', fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Laptop fontSize="small" /> HARDWARE ASSETS
            </Typography>
            <Box sx={{ bgcolor: '#111', p: 3, borderRadius: 2, border: '1px solid #222' }}>
              <DetailItem icon={<Settings />} label="FSM Serial Number" value={team.fsmSerialNumber} />
              <DetailItem icon={<Laptop />} label="Laptop Serial Number" value={team.laptopSerialNumber} />
            </Box>
          </Grid>

          {/* Section 4: Performance Summary */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ color: '#7b68ee', fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <History fontSize="small" /> PERFORMANCE SNAPSHOT
            </Typography>
            {(() => {
              const latestEval = team.evaluationHistory && team.evaluationHistory.length > 0 ? team.evaluationHistory[0] : null;
              // Use percentage from history if available, otherwise parse from string or default to 0
              const score = latestEval ? latestEval.percentage : (typeof team.evaluationScore === 'string' ? parseFloat(team.evaluationScore) : (team.evaluationScore || 0));
              const isEvaluated = latestEval ? true : team.isEvaluated;
              const lastDate = latestEval ? (latestEval.submittedAt || latestEval.date) : team.lastEvaluationDate;

              return (
                <Box sx={{ bgcolor: '#111', p: 3, borderRadius: 2, border: '1px solid #222', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: score >= 90 ? '#4caf50' : score >= 70 ? '#ff9800' : '#f44336', fontWeight: 800 }}>
                      {score}%
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>Quiz Score</Typography>
                  </Box>
                  <Box sx={{ height: 40, width: 1, bgcolor: '#222' }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                      {isEvaluated ? 'Evaluated' : 'Not Evaluated'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Last: {lastDate ? new Date(lastDate).toLocaleDateString() : 'Never'}
                    </Typography>
                  </Box>
                </Box>
              );
            })()}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ bgcolor: '#111', borderTop: '1px solid #222', p: 3 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            bgcolor: '#7b68ee',
            color: '#fff',
            px: 4,
            fontWeight: 'bold',
            '&:hover': { bgcolor: '#6652e0' }
          }}
        >
          Close Detail View
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FieldTeamDetailsDialog;
