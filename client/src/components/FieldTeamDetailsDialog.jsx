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
  useMediaQuery,
  useTheme,
  LinearProgress,
  Stack,
} from '@mui/material';
import {
  Badge,
  Phone,
  Business,
  DeviceHub,
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
      <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        {React.cloneElement(icon, { sx: { fontSize: 16, color: 'var(--accent-text)' } })} {label}
      </Typography>
      <Typography variant="body1" sx={{ color: 'var(--text)', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
        {value || 'N/A'}
      </Typography>
    </Box>
  );

  const SectionCard = ({ title, icon, children }) => (
    <Paper
      elevation={0}
      sx={{
        bgcolor: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 2,
        height: '100%',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {React.cloneElement(icon, { sx: { color: 'var(--accent-text)' } })}
        <Typography variant="subtitle1" sx={{ color: 'var(--text)', fontWeight: 600, letterSpacing: 0.5 }}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ p: 3 }}>
        {children}
      </Box>
    </Paper>
  );

  const getStatusColor = () => {
    if (team.isTerminated) return '#DC2626';
    if (team.isSuspended) return '#ed6c02';
    if (team.isOnLeave) return '#6C47FF';
    if (team.isActive) return '#16A34A';
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
          border: '1px solid var(--border)',
          borderRadius: isMobile ? 0 : 3,
          boxShadow: '0 24px 48px rgba(0,0,0,0.8)',
        }
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{
          p: 3,
          borderBottom: '1px solid var(--border)',
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
            bgcolor: 'var(--accent)',
            opacity: 0.1,
            filter: 'blur(40px)',
            zIndex: 0
          }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, zIndex: 1 }}>
            <Avatar sx={{
              width: 64,
              height: 64,
              bgcolor: 'rgba(108, 71, 255, 0.2)',
              border: '2px solid var(--accent)',
              color: 'var(--accent-text)'
            }}>
              <Badge sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ color: 'var(--text)', fontWeight: 600, mb: 0.5 }}>
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
                    fontWeight: 600,
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
                    bgcolor: 'var(--surface)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    '& .MuiChip-icon': { color: 'var(--text-muted)' }
                  }}
                />
              </Stack>
            </Box>
          </Box>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              borderColor: 'var(--border)',
              color: 'var(--text-muted)',
              zIndex: 1,
              '&:hover': { borderColor: '#fff', color: '#fff', bgcolor: 'var(--overlay-subtle)' }
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
                bgcolor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden'
              }}>
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Typography variant="subtitle2" sx={{ color: 'var(--text-muted)', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <School fontSize="small" color="primary" /> EVALUATION SCORE
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                    <Typography variant="h2" sx={{
                      fontWeight: 600,
                      color: score >= 90 ? '#16A34A' : score >= 70 ? '#D97706' : '#DC2626'
                    }}>
                      {parseFloat(score).toFixed(0)}
                    </Typography>
                    <Typography variant="h5" sx={{ color: 'var(--border-strong)' }}>/100</Typography>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={parseFloat(score)}
                    sx={{
                      height: 8,
                      borderRadius: "10px",
                      bgcolor: 'var(--surface)',
                      mb: 2,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: score >= 90 ? '#16A34A' : score >= 70 ? '#D97706' : '#DC2626'
                      }
                    }}
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                      Status: <span style={{ color: isEvaluated ? '#fff' : 'var(--text-muted)', fontWeight: isEvaluated ? 600 : 400 }}>
                        {isEvaluated ? 'Evaluated' : 'Pending'}
                      </span>
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                      Date: <span style={{ color: 'var(--text)' }}>{lastAssessmentDate ? new Date(lastAssessmentDate).toLocaleDateString() : 'N/A'}</span>
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
                <Avatar sx={{ bgcolor: 'rgba(220, 38, 38, 0.15)', color: '#DC2626' }}>
                  <GppBad />
                </Avatar>
                <Box>
                  <Typography variant="caption" sx={{ color: '#ff8a80', fontWeight: 600, display: 'block' }}>
                    TOTAL VIOLATION POINTS
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#ffcdd2', fontWeight: 600 }}>
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
                  <Grid item xs={6}>
                    <DetailItem
                      icon={<Person />}
                      label="Employment Classification"
                      value={team.employmentType === 'Employee' ? 'Direct Employee' : 'Subcontractor (Partner)'}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <DetailItem
                      icon={<School />}
                      label="Field Experience"
                      value={(() => {
                        const y = team.experienceYears !== undefined ? team.experienceYears : (team.yearsOfExperience ? Math.floor(Number(team.yearsOfExperience)) : 0);
                        const m = team.experienceMonths !== undefined ? team.experienceMonths : (team.yearsOfExperience ? Math.round((Number(team.yearsOfExperience) % 1) * 12) : 0);
                        const d = team.experienceDays !== undefined ? team.experienceDays : 0;
                        const parts = [];
                        if (y > 0) parts.push(`${y} ${y === 1 ? 'Year' : 'Years'}`);
                        if (m > 0) parts.push(`${m} ${m === 1 ? 'Month' : 'Months'}`);
                        if (d > 0) parts.push(`${d} ${d === 1 ? 'Day' : 'Days'}`);
                        return parts.length > 0 ? parts.join(', ') : '0 Days';
                      })()}
                    />
                  </Grid>
                </Grid>
              </SectionCard>

              {/* Safety & Compliance Certifications Matrix */}
              <SectionCard title="Safety & Compliance Certifications" icon={<VerifiedUser sx={{ color: '#00d2ff' }} />}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)', mb: 0.5 }}>
                    Mandatory field technician safety clearances & verified site credentials:
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 1.5 }}>
                    {[
                      { key: 'dd', code: 'DD', title: 'Defensive Driving', desc: 'Safe vehicle operation, hazard perception & driving compliance' },
                      { key: 'es', code: 'ES', title: 'Electrical Safety', desc: 'Safe handling of electrical sources, grounding & arc flash prevention' },
                      { key: 'fa', code: 'FA', title: 'First Aid', desc: 'Emergency first response, CPR & basic trauma management' },
                      { key: 'ff', code: 'FF', title: 'Fire Fighting', desc: 'Fire extinguisher operation, fire risk prevention & evacuation' },
                      { key: 'ra', code: 'RA', title: 'Risk Assessment', desc: 'Job site hazard identification, risk evaluation & control measures' },
                      { key: 'wah', code: 'WAH', title: 'Work at Height', desc: 'Ladder safety, harness usage, pole climbing & fall arrest systems' },
                    ].map((c) => {
                      const isCertified = Boolean(team.certificates?.[c.key]);
                      return (
                        <Box
                          key={c.key}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: isCertified ? 'rgba(22, 163, 74, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                            border: isCertified ? '1px solid rgba(22, 163, 74, 0.3)' : '1px solid #222',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={c.code}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontWeight: 600,
                                  fontSize: '0.65rem',
                                  bgcolor: isCertified ? '#16A34A' : 'var(--border)',
                                  color: 'var(--text)',
                                }}
                              />
                              <Typography variant="body2" sx={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.85rem' }}>
                                {c.title}
                              </Typography>
                            </Box>
                            <Chip
                              label={isCertified ? 'Certified' : 'Not Certified'}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                bgcolor: isCertified ? 'rgba(22, 163, 74, 0.2)' : 'rgba(220, 38, 38, 0.1)',
                                color: isCertified ? '#16A34A' : '#DC2626',
                                border: isCertified ? '1px solid #16A34A40' : '1px solid #DC262630',
                              }}
                            />
                          </Box>
                          <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '0.72rem', pl: 0.5 }}>
                            {c.desc}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </SectionCard>

              <SectionCard title="Role Expertise" icon={<VerifiedUser />}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(!team.isNewToInstallation && !team.isNewToActivation) ? (
                    <Box sx={{ p: 2, bgcolor: 'rgba(22, 163, 74, 0.1)', border: '1px solid #16A34A', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <VerifiedUser sx={{ color: '#16A34A' }} />
                      <Typography variant="body2" sx={{ color: 'var(--text)', fontWeight: 600 }}>
                        Identified as a Rich Expert in all roles.
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <DetailItem
                          icon={<Settings />}
                          label="Installation"
                          value={team.isNewToInstallation
                            ? `Learning (Since ${team.installationStartDate ? new Date(team.installationStartDate).toLocaleDateString() : 'N/A'})`
                            : 'Expert'
                          }
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <DetailItem
                          icon={<DeviceHub />}
                          label="Activation"
                          value={team.isNewToActivation
                            ? `Learning (Since ${team.activationStartDate ? new Date(team.activationStartDate).toLocaleDateString() : 'N/A'})`
                            : 'Expert'
                          }
                          fullWidth
                        />
                      </Grid>
                    </Grid>
                  )}
                </Box>
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

              <SectionCard title="Escalation Policy & Management Action" icon={<Warning sx={{ color: '#DB2777' }} />}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <DetailItem icon={<Warning />} label="Escalation Action" value={team.escalationAction || 'None Assigned'} fullWidth />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DetailItem icon={<VerifiedUser />} label="Escalation Status" value={team.escalationStatus || 'Pending'} fullWidth />
                  </Grid>
                  {team.escalationDate && (
                    <Grid item xs={12} sm={6}>
                      <DetailItem icon={<History />} label="Action Date" value={new Date(team.escalationDate).toLocaleDateString()} fullWidth />
                    </Grid>
                  )}
                  {team.escalationNotes && (
                    <Grid item xs={12}>
                      <DetailItem icon={<Info />} label="Escalation Notes" value={team.escalationNotes} fullWidth />
                    </Grid>
                  )}
                </Grid>
              </SectionCard>
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{
        bgcolor: '#000',
        borderTop: '1px solid var(--border)',
        p: 3,
        justifyContent: 'center'
      }}>
        <Button
          onClick={onClose}
          variant="contained"
          size="large"
          sx={{
            bgcolor: 'var(--surface)',
            color: 'var(--text)',
            minWidth: 200,
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: 'var(--surface-hover)' }
          }}
        >
          Close View
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FieldTeamDetailsDialog;
