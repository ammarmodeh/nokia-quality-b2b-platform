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
  Chip,
  Avatar,
  Paper,
  Divider,
  useMediaQuery,
  useTheme,
  LinearProgress,
  Stack
} from '@mui/material';
import {
  Badge,
  Phone,
  Business,
  History,
  Info,
  Laptop,
  Settings,
  Person,
  Warning,
  School,
  VerifiedUser,
  GppBad,
  CheckCircle,
  Cancel
} from '@mui/icons-material';

const FieldTeamDetailsDialog = ({ open, onClose, team }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!team) return null;

  const DetailItem = ({ icon, label, value, fullWidth = false }) => (
    <Box sx={{ mb: 2, width: fullWidth ? '100%' : 'auto' }}>
      <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, textTransform: 'uppercase', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        {React.cloneElement(icon, { sx: { fontSize: 16, color: '#7b68ee' } })} {label}
      </Typography>
      <Typography variant="body1" sx={{ color: '#fff', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
        {value || 'N/A'}
      </Typography>
    </Box>
  );

  const SectionCard = ({ title, icon, children }) => (
    <Paper
      elevation={0}
      sx={{
        bgcolor: '#111',
        border: '1px solid #333',
        borderRadius: 2,
        height: '100%',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {React.cloneElement(icon, { sx: { color: '#7b68ee' } })}
        <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700, letterSpacing: 0.5 }}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ p: 3 }}>
        {children}
      </Box>
    </Paper>
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

  // Safe checks for nested properties
  const latestEval = team.evaluationHistory && team.evaluationHistory.length > 0 ? team.evaluationHistory[0] : null;
  const score = latestEval ? latestEval.percentage : (typeof team.evaluationScore === 'string' ? parseFloat(team.evaluationScore) : (team.evaluationScore || 0));
  const isEvaluated = latestEval ? true : team.isEvaluated;
  const lastAssessmentDate = latestEval ? (latestEval.submittedAt || latestEval.date) : team.lastEvaluationDate;
  const violationPoints = team.totalViolationPoints || 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth={!isMobile}
      fullScreen={isMobile}
      maxWidth="md"
      PaperProps={{
        sx: {
          bgcolor: '#000',
          backgroundImage: 'linear-gradient(180deg, #1a1a1a 0%, #000 100%)',
          border: '1px solid #333',
          borderRadius: isMobile ? 0 : 3,
          boxShadow: '0 24px 48px rgba(0,0,0,0.8)',
        }
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{
          p: 3,
          borderBottom: '1px solid #333',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: 2,
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background decoration */}
          <Box sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 150,
            height: 150,
            borderRadius: '50%',
            bgcolor: '#7b68ee',
            opacity: 0.1,
            filter: 'blur(40px)',
            zIndex: 0
          }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, zIndex: 1 }}>
            <Avatar sx={{
              width: 64,
              height: 64,
              bgcolor: 'rgba(123, 104, 238, 0.2)',
              border: '2px solid #7b68ee',
              color: '#7b68ee'
            }}>
              <Badge sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, mb: 0.5 }}>
                {team.teamName}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={getStatusLabel()}
                  size="small"
                  icon={team.isActive ? <CheckCircle sx={{ fontSize: '14px !important' }} /> : <Cancel sx={{ fontSize: '14px !important' }} />}
                  sx={{
                    height: 24,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    bgcolor: `${getStatusColor()}20`,
                    color: getStatusColor(),
                    border: `1px solid ${getStatusColor()}40`,
                    '& .MuiChip-icon': { color: 'inherit' }
                  }}
                />
                <Chip
                  label={team.teamCompany || 'No Company'}
                  size="small"
                  icon={<Business sx={{ fontSize: '14px !important' }} />}
                  sx={{
                    height: 24,
                    fontSize: '0.7rem',
                    bgcolor: '#222',
                    color: '#aaa',
                    border: '1px solid #333',
                    '& .MuiChip-icon': { color: '#777' }
                  }}
                />
              </Stack>
            </Box>
          </Box>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              borderColor: '#444',
              color: '#888',
              zIndex: 1,
              '&:hover': { borderColor: '#fff', color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' }
            }}
          >
            Close
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: '24px !important', overflowY: 'auto' }}>
        <Grid container spacing={3}>
          {/* Left Column: Stats & Performance */}
          <Grid item xs={12} md={5}>
            <Stack spacing={3}>
              {/* Performance Score Card */}
              <Paper sx={{
                p: 3,
                bgcolor: '#111',
                border: '1px solid #333',
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden'
              }}>
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: '#888', fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <School fontSize="small" color="primary" /> EVALUATION SCORE
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                    <Typography variant="h2" sx={{
                      fontWeight: 800,
                      color: score >= 90 ? '#4caf50' : score >= 70 ? '#ff9800' : '#f44336'
                    }}>
                      {parseFloat(score).toFixed(0)}
                    </Typography>
                    <Typography variant="h5" sx={{ color: '#555' }}>/100</Typography>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={parseFloat(score)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#222',
                      mb: 2,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: score >= 90 ? '#4caf50' : score >= 70 ? '#ff9800' : '#f44336'
                      }
                    }}
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Status: <span style={{ color: isEvaluated ? '#fff' : '#888', fontWeight: isEvaluated ? 600 : 400 }}>
                        {isEvaluated ? 'Evaluated' : 'Pending'}
                      </span>
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Date: <span style={{ color: '#fff' }}>{lastAssessmentDate ? new Date(lastAssessmentDate).toLocaleDateString() : 'N/A'}</span>
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Violation Stats */}
              <Paper sx={{
                p: 2,
                bgcolor: '#1a0505',
                border: '1px solid #5c1818',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                <Avatar sx={{ bgcolor: 'rgba(244, 67, 54, 0.15)', color: '#f44336' }}>
                  <GppBad />
                </Avatar>
                <Box>
                  <Typography variant="caption" sx={{ color: '#ff8a80', fontWeight: 600, display: 'block' }}>
                    TOTAL VIOLATION POINTS
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#ffcdd2', fontWeight: 700 }}>
                    {violationPoints}
                  </Typography>
                </Box>
              </Paper>
            </Stack>
          </Grid>

          {/* Right Column: Detailed Info */}
          <Grid item xs={12} md={7}>
            <Stack spacing={3}>
              <SectionCard title="Team Identity" icon={<Person />}>
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
              </SectionCard>

              <SectionCard title="Professional Details" icon={<Info />}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <DetailItem icon={<Badge />} label="Team Code (ID)" value={team.teamCode} />
                  </Grid>
                  <Grid item xs={6}>
                    <DetailItem icon={<VerifiedUser />} label="Quiz Code" value={team.quizCode} />
                  </Grid>
                  <Grid item xs={6}>
                    <DetailItem icon={<Phone />} label="Contact Number" value={team.contactNumber} />
                  </Grid>
                  <Grid item xs={6}>
                    <DetailItem icon={<Business />} label="Company" value={team.teamCompany} />
                  </Grid>
                </Grid>
              </SectionCard>

              <SectionCard title="Hardware Assets" icon={<Laptop />}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <DetailItem icon={<Settings />} label="FSM Serial Number" value={team.fsmSerialNumber} fullWidth />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DetailItem icon={<Laptop />} label="Laptop Serial Number" value={team.laptopSerialNumber} fullWidth />
                  </Grid>
                </Grid>
              </SectionCard>
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{
        bgcolor: '#000',
        borderTop: '1px solid #333',
        p: 3,
        justifyContent: 'center'
      }}>
        <Button
          onClick={onClose}
          variant="contained"
          size="large"
          sx={{
            bgcolor: '#222',
            color: '#fff',
            minWidth: 200,
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: '#333' }
          }}
        >
          Close View
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FieldTeamDetailsDialog;
