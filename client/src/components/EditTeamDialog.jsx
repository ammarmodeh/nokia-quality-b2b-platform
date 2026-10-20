import React from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  NativeSelect,
  Button,
  Box,
  Typography,
  InputAdornment,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { AccountCircle, Phone } from '@mui/icons-material';

// Fallback constants removed. Powered by dynamic API data.
import api from '../api/api';
import { useEffect, useState } from 'react';

const EditTeamDialog = ({ open, onClose, team, onSubmit, loading, errorMessage }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useSelector((state) => state.auth);
  const { register, handleSubmit, reset } = useForm();
  const [fieldTeamsCompany, setFieldTeamsCompany] = useState([]);
  const [forceRegenerate, setForceRegenerate] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const { data } = await api.get("/dropdown-options/category/TEAM_COMPANY");
        if (data && data.length > 0) {
          setFieldTeamsCompany(data.map(opt => opt.value));
        }
      } catch (err) {
        console.error("Failed to load companies", err);
      }
    };
    fetchCompanies();
  }, []);

  // Reset form when team data changes
  React.useEffect(() => {
    if (team) {
      setForceRegenerate(false);
      reset({
        firstName: team.firstName || team.teamName.split(' ')[0] || '',
        secondName: team.secondName || team.teamName.split(' ')[1] || '',
        thirdName: team.thirdName || team.teamName.split(' ')[2] || '',
        surname: team.surname || team.teamName.split(' ')[3] || '',
        contactNumber: team.contactNumber,
        fsmSerialNumber: team.fsmSerialNumber === 'N/A' ? '' : team.fsmSerialNumber,
        laptopSerialNumber: team.laptopSerialNumber === 'N/A' ? '' : team.laptopSerialNumber,
        teamCompany: team.teamCompany || (fieldTeamsCompany.length > 0 ? fieldTeamsCompany[0] : ''),
        teamCode: team.teamCode || '',
        employmentType: team.employmentType || 'Subcontractor',
        experienceYears: team.experienceYears !== undefined ? team.experienceYears : (team.yearsOfExperience ? Math.floor(Number(team.yearsOfExperience)) : 0),
        experienceMonths: team.experienceMonths !== undefined ? team.experienceMonths : (team.yearsOfExperience ? Math.round((Number(team.yearsOfExperience) % 1) * 12) : 0),
        experienceDays: team.experienceDays !== undefined ? team.experienceDays : 0,
        yearsOfExperience: team.yearsOfExperience !== undefined ? team.yearsOfExperience : 0,
        certificates: {
          dd: Boolean(team.certificates?.dd),
          es: Boolean(team.certificates?.es),
          fa: Boolean(team.certificates?.fa),
          ff: Boolean(team.certificates?.ff),
          ra: Boolean(team.certificates?.ra),
          wah: Boolean(team.certificates?.wah),
        },
        isNewToInstallation: team.isNewToInstallation || false,
        isNewToActivation: team.isNewToActivation || false,
        installationStartDate: team.installationStartDate ? new Date(team.installationStartDate).toISOString().split('T')[0] : '',
        activationStartDate: team.activationStartDate ? new Date(team.activationStartDate).toISOString().split('T')[0] : '',
        escalationAction: team.escalationAction || '',
        escalationStatus: team.escalationStatus || 'Pending',
        escalationNotes: team.escalationNotes || '',
        escalationDate: team.escalationDate ? new Date(team.escalationDate).toISOString().split('T')[0] : '',
      });
    }
  }, [team, reset]);

  const handleFormSubmit = (data) => {
    console.log("EditTeamDialog: Submitting with data:", data, "forceRegenerate:", forceRegenerate);
    onSubmit({ ...data, forceRegenerateQuizCode: forceRegenerate });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      fullWidth
      maxWidth="md"
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: '#000000',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          borderRadius: isMobile ? 0 : '16px',
          border: '1px solid var(--border)',
          margin: 0,
          width: isMobile ? '100%' : '70%',
          maxWidth: '100%'
        }
      }}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogTitle sx={{
          backgroundColor: 'var(--bg)',
          color: 'var(--text)',
          borderBottom: '1px solid var(--border)',
          padding: isMobile ? '16px 20px' : '20px 32px',
          fontWeight: 600,
          letterSpacing: '-0.5px',
          position: 'sticky',
          top: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <AccountCircle sx={{ color: 'var(--accent-text)' }} />
          Edit Team Information
        </DialogTitle>
        <DialogContent sx={{
          backgroundColor: 'var(--bg)',
          color: 'var(--text)',
          padding: isMobile ? '20px' : '32px',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'var(--surface-hover)',
            borderRadius: '2px',
          },
          height: '100%',
          "&.MuiDialogContent-root": {
            paddingTop: 4,
          }
        }}>
          {/* Section: Personal Info */}
          <Typography variant="overline" sx={{ color: 'var(--text-muted)', fontWeight: '600', mb: 2, display: 'block' }}>
            Personal Details
          </Typography>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: 3,
            mb: 4
          }}>
            <TextField
              label="First Name"
              variant="outlined"
              {...register('firstName', { required: 'First name is required' })}
              InputProps={{ style: { color: 'var(--text)' } }}
              InputLabelProps={{ style: { color: 'var(--text-muted)' }, shrink: true }}
            />
            <TextField
              label="Second Name"
              variant="outlined"
              {...register('secondName')}
              InputProps={{ style: { color: 'var(--text)' } }}
              InputLabelProps={{ style: { color: 'var(--text-muted)' }, shrink: true }}
            />
            <TextField
              label="Third Name"
              variant="outlined"
              {...register('thirdName')}
              InputProps={{ style: { color: 'var(--text)' } }}
              InputLabelProps={{ style: { color: 'var(--text-muted)' }, shrink: true }}
            />
            <TextField
              label="Surname"
              variant="outlined"
              {...register('surname')}
              InputProps={{ style: { color: 'var(--text)' } }}
              InputLabelProps={{ style: { color: 'var(--text-muted)' }, shrink: true }}
            />
          </Box>

          {/* Section: Professional Info */}
          <Typography variant="overline" sx={{ color: 'var(--text-muted)', fontWeight: '600', mb: 2, display: 'block' }}>
            Professional Details
          </Typography>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: 3,
            mb: 4
          }}>
            <TextField
              label="Contact Number"
              variant="outlined"
              type="tel"
              placeholder="+962"
              {...register('contactNumber', { required: 'Contact number is required' })}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Phone sx={{ color: 'var(--text-muted)' }} /></InputAdornment>,
                style: { color: 'var(--text)' }
              }}
              InputLabelProps={{ style: { color: 'var(--text-muted)' }, shrink: true }}
            />

            <TextField
              label="Team Code / Team ID"
              variant="outlined"
              {...register('teamCode', { required: 'Team code is required' })}
              helperText="Changing this will automatically regenerate the Quiz Code"
              FormHelperTextProps={{ sx: { color: 'var(--text-muted)' } }}
              InputProps={{ style: { color: 'var(--text)' } }}
              InputLabelProps={{ style: { color: 'var(--text-muted)' }, shrink: true }}
            />

            <Box sx={{ position: 'relative' }}>
              <TextField
                label="Current Quiz Code"
                variant="outlined"
                fullWidth
                value={forceRegenerate ? "GENERATING NEW CODE..." : (team?.quizCode || 'N/A')}
                disabled
                InputProps={{
                  style: { color: forceRegenerate ? '#6C47FF' : 'var(--text-secondary)', fontStyle: forceRegenerate ? 'italic' : 'normal', fontWeight: forceRegenerate ? 'bold' : 'normal' },
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setForceRegenerate(!forceRegenerate)}
                        sx={{
                          color: forceRegenerate ? '#fff' : '#6C47FF',
                          borderColor: forceRegenerate ? '#6C47FF' : '#6C47FF',
                          bgcolor: forceRegenerate ? '#6C47FF' : 'transparent',
                          '&:hover': { bgcolor: forceRegenerate ? '#6652e0' : 'rgba(108, 71, 255, 0.1)' },
                          textTransform: 'none',
                          fontSize: '0.75rem'
                        }}
                      >
                        {forceRegenerate ? "Cancel" : "Regenerate"}
                      </Button>
                    </InputAdornment>
                  )
                }}
                InputLabelProps={{ style: { color: 'var(--text-muted)' }, shrink: true }}
              />
            </Box>

            <FormControl fullWidth>
              <InputLabel shrink sx={{ color: 'var(--text-muted)', '&.Mui-focused': { color: 'var(--accent-text)' } }}>
                Company
              </InputLabel>
              <NativeSelect
                {...register('teamCompany')}
                disabled={user.role !== 'Admin'}
                sx={{
                  color: 'var(--text)',
                  bgcolor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  pl: 2,
                  py: 0.5,
                  '&:hover': { border: '1px solid var(--accent)' },
                  '&:before': { display: 'none' },
                  '&:after': { display: 'none' },
                  '& .MuiNativeSelect-icon': { color: 'var(--accent-text)' },
                }}
              >
                {fieldTeamsCompany.map((list, index) => (
                  <option key={index} value={list} style={{ backgroundColor: 'var(--bg)', color: '#fff' }}>
                    {list}
                  </option>
                ))}
              </NativeSelect>
            </FormControl>
          </Box>

          {/* Section: Device Info */}
          <Typography variant="overline" sx={{ color: 'var(--text-muted)', fontWeight: '600', mb: 2, display: 'block' }}>
            Device Information
          </Typography>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: 3
          }}>
            <TextField
              label="FSM Serial Number"
              variant="outlined"
              {...register('fsmSerialNumber')}
              InputProps={{ style: { color: 'var(--text)' } }}
              InputLabelProps={{ style: { color: 'var(--text-muted)' }, shrink: true }}
            />
            <TextField
              label="Laptop Serial Number"
              variant="outlined"
              {...register('laptopSerialNumber')}
              InputProps={{ style: { color: 'var(--text)' } }}
              InputLabelProps={{ style: { color: 'var(--text-muted)' }, shrink: true }}
            />
          </Box>

          {/* Section: Employment & Safety Certifications */}
          <Typography variant="overline" sx={{ color: 'var(--accent-text)', fontWeight: '600', mt: 4, mb: 2, display: 'block' }}>
            Employment & Safety Certifications
          </Typography>
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth sx={{ mb: 2.5 }}>
              <InputLabel shrink sx={{ color: 'var(--text-muted)', '&.Mui-focused': { color: 'var(--accent-text)' } }}>
                Employment Type
              </InputLabel>
              <NativeSelect
                {...register('employmentType')}
                sx={{
                  color: 'var(--text)',
                  bgcolor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  pl: 2,
                  py: 0.5,
                  '&:hover': { border: '1px solid var(--accent)' },
                  '&:before': { display: 'none' },
                  '&:after': { display: 'none' },
                  '& .MuiNativeSelect-icon': { color: 'var(--accent-text)' },
                }}
              >
                <option value="Subcontractor" style={{ backgroundColor: 'var(--bg)', color: '#fff' }}>Subcontractor (Partner)</option>
                <option value="Employee" style={{ backgroundColor: 'var(--bg)', color: '#fff' }}>Direct Employee</option>
              </NativeSelect>
            </FormControl>

            <Box sx={{ bgcolor: 'var(--bg)', p: 2, borderRadius: 2, border: '1px solid #282828' }}>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 600, mb: 1.5, display: 'block' }}>
                EXPERIENCE DURATION (YEARS / MONTHS / DAYS)
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                <TextField
                  label="Years"
                  variant="outlined"
                  type="number"
                  inputProps={{ min: 0, max: 50 }}
                  {...register('experienceYears')}
                  InputProps={{ style: { color: 'var(--text)', textAlign: 'center' } }}
                  InputLabelProps={{ style: { color: 'var(--text-muted)' }, shrink: true }}
                />
                <TextField
                  label="Months"
                  variant="outlined"
                  type="number"
                  inputProps={{ min: 0, max: 11 }}
                  {...register('experienceMonths')}
                  InputProps={{ style: { color: 'var(--text)', textAlign: 'center' } }}
                  InputLabelProps={{ style: { color: 'var(--text-muted)' }, shrink: true }}
                />
                <TextField
                  label="Days"
                  variant="outlined"
                  type="number"
                  inputProps={{ min: 0, max: 30 }}
                  {...register('experienceDays')}
                  InputProps={{ style: { color: 'var(--text)', textAlign: 'center' } }}
                  InputLabelProps={{ style: { color: 'var(--text-muted)' }, shrink: true }}
                />
              </Box>
            </Box>
          </Box>

          <Box sx={{ bgcolor: 'var(--bg)', p: 2, borderRadius: 2, border: '1px solid #282828', mb: 3 }}>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 600, mb: 1.5, display: 'block' }}>
              SAFETY & COMPLIANCE CERTIFICATES
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 1.5 }}>
              {[
                { id: 'certificates.dd', label: 'DD – Defensive Driving' },
                { id: 'certificates.es', label: 'ES – Electrical Safety' },
                { id: 'certificates.fa', label: 'FA – First Aid' },
                { id: 'certificates.ff', label: 'FF – Fire Fighting' },
                { id: 'certificates.ra', label: 'RA – Risk Assessment' },
                { id: 'certificates.wah', label: 'WAH – Work at Height' },
              ].map((cert) => (
                <Box key={cert.id} sx={{ display: 'flex', alignItems: 'center', bgcolor: 'var(--bg)', p: 1, borderRadius: 1, border: '1px solid #222' }}>
                  <input
                    type="checkbox"
                    {...register(cert.id)}
                    id={`edit-${cert.id}`}
                    style={{ marginRight: '10px', accentColor: '#6C47FF', transform: 'scale(1.2)' }}
                  />
                  <label htmlFor={`edit-${cert.id}`} style={{ color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer' }}>
                    {cert.label}
                  </label>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Section: Role Expertise */}
          <Typography variant="overline" sx={{ color: 'var(--accent-text)', fontWeight: '600', mt: 4, mb: 2, display: 'block' }}>
            Role Expertise
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 3, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'var(--bg)', p: 1.5, borderRadius: 1, border: '1px solid var(--border)' }}>
                <input type="checkbox" {...register('isNewToInstallation')} id="edit-new-install" style={{ marginRight: '8px', accentColor: '#6C47FF', transform: 'scale(1.2)' }} />
                <label htmlFor="edit-new-install" style={{ color: 'var(--text)', fontSize: '0.9rem', cursor: 'pointer' }}>New to Installation</label>
              </Box>
              <TextField
                label="Installation Start Date"
                type="date"
                variant="outlined"
                fullWidth
                {...register('installationStartDate')}
                InputProps={{ style: { color: 'var(--text)' } }}
                InputLabelProps={{ style: { color: 'var(--text-muted)' }, shrink: true }}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 3, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'var(--bg)', p: 1.5, borderRadius: 1, border: '1px solid var(--border)' }}>
                <input type="checkbox" {...register('isNewToActivation')} id="edit-new-activation" style={{ marginRight: '8px', accentColor: '#6C47FF', transform: 'scale(1.2)' }} />
                <label htmlFor="edit-new-activation" style={{ color: 'var(--text)', fontSize: '0.9rem', cursor: 'pointer' }}>New to Activation</label>
              </Box>
              <TextField
                label="Activation Start Date"
                type="date"
                variant="outlined"
                fullWidth
                {...register('activationStartDate')}
                InputProps={{ style: { color: 'var(--text)' } }}
                InputLabelProps={{ style: { color: 'var(--text-muted)' }, shrink: true }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              * If not checked, team is considered a Rich Expert for that role.
            </Typography>
          </Box>

          {/* Section: Escalation Policy & Action */}
          <Typography variant="overline" sx={{ color: '#DB2777', fontWeight: '600', mt: 4, mb: 2, display: 'block' }}>
            Escalation Policy & Management Action
          </Typography>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 3,
            mb: 2
          }}>
            <TextField
              label="Escalation Action Taken"
              variant="outlined"
              placeholder="e.g. 1st Offense: Verbal Warning, Mandatory Training, Suspension"
              {...register('escalationAction')}
              InputProps={{ style: { color: 'var(--text)' } }}
              InputLabelProps={{ style: { color: 'var(--text-muted)' }, shrink: true }}
            />
            <FormControl fullWidth variant="outlined">
              <InputLabel shrink style={{ color: 'var(--text-muted)' }}>Escalation Status</InputLabel>
              <NativeSelect
                {...register('escalationStatus')}
                sx={{
                  bgcolor: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  pl: 2,
                  py: 0.5,
                  '&:hover': { border: '1px solid #DB2777' },
                  '&:before': { display: 'none' },
                  '&:after': { display: 'none' },
                  '& .MuiNativeSelect-icon': { color: '#DB2777' },
                }}
              >
                {['Pending', 'Under Review', 'Action Taken', 'Warning Issued', 'Training Assigned', '1 Week Suspension', '1 Month Suspension', 'Termination', 'Completed', 'Closed', 'Waived', 'Compliant'].map((st, idx) => (
                  <option key={idx} value={st} style={{ backgroundColor: 'var(--bg)', color: '#fff' }}>
                    {st}
                  </option>
                ))}
              </NativeSelect>
            </FormControl>
          </Box>
          <TextField
            label="Escalation Action Date"
            type="date"
            variant="outlined"
            fullWidth
            {...register('escalationDate')}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'var(--bg)',
                '& fieldset': { borderColor: 'var(--border)' },
                '&:hover fieldset': { borderColor: '#DB2777' },
                '&.Mui-focused fieldset': { borderColor: '#DB2777' },
              },
            }}
            InputProps={{ style: { color: 'var(--text)' } }}
            InputLabelProps={{ style: { color: 'var(--text-muted)' }, shrink: true }}
          />
          <TextField
            label="Escalation & Policy Notes"
            variant="outlined"
            fullWidth
            multiline
            rows={2}
            placeholder="Add relevant notes regarding the policy violation, deduction, training or consequence..."
            {...register('escalationNotes')}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'var(--bg)',
                '& fieldset': { borderColor: 'var(--border)' },
                '&:hover fieldset': { borderColor: '#DB2777' },
                '&.Mui-focused fieldset': { borderColor: '#DB2777' },
              },
            }}
            InputProps={{ style: { color: 'var(--text)' } }}
            InputLabelProps={{ style: { color: 'var(--text-muted)' }, shrink: true }}
          />

          {errorMessage && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(220, 38, 38, 0.1)', border: '1px solid #DC2626', borderRadius: '8px', color: '#DC2626' }}>
              {errorMessage}
            </Box>
          )}

        </DialogContent>
        <DialogActions sx={{
          backgroundColor: 'var(--bg)',
          borderTop: '1px solid var(--border)',
          padding: isMobile ? '16px' : '20px 32px',
          position: 'sticky',
          bottom: 0,
          gap: 2
        }}>
          <Button
            onClick={onClose}
            sx={{
              color: 'var(--text-muted)',
              '&:hover': { color: '#fff', bgcolor: 'var(--overlay-subtle)' }
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disableElevation
            disabled={loading}
            sx={{
              backgroundColor: 'var(--accent)',
              color: 'var(--text)',
              px: 4,
              py: 1,
              '&:hover': { backgroundColor: '#6652e0' },
              '&.Mui-disabled': { backgroundColor: 'var(--surface-hover)', color: 'var(--text-muted)' }
            }}
          >
            {loading ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditTeamDialog;