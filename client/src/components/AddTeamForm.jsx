// AddTeamForm.js
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import {
  TextField,
  FormControl,
  InputLabel,
  NativeSelect,
  Button,
  Box,
  Typography,
  InputAdornment,
  useTheme,
  Stack,
  Divider,
} from '@mui/material';
import { Phone, Add } from '@mui/icons-material';

// Fallback constants removed. Powered by dynamic API data.
import api from '../api/api';
import { useEffect, useState } from 'react';

const AddTeamForm = ({ onAddTeam, loading, errorMessage }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const theme = useTheme();
  const [fieldTeamsCompany, setFieldTeamsCompany] = useState([]);
  const user = useSelector((state) => state.auth.user);

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

  const onSubmit = async (data) => {
    const success = await onAddTeam({
      ...data,
      replaceExisting: Boolean(data.replaceExisting),
    });
    if (success) {
      reset();
    }
  };

  const sharedInputSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: 'var(--bg)',
      '& fieldset': { borderColor: 'var(--border)' },
      '&:hover fieldset': { borderColor: 'var(--accent)' },
      '&.Mui-focused fieldset': { borderColor: 'var(--accent)' },
      '& input': { color: 'var(--text)' }
    },
    '& .MuiInputLabel-root': { color: 'var(--text-muted)' },
    '& .MuiInputLabel-root.Mui-focused': { color: 'var(--accent-text)' }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        bgcolor: 'var(--bg)',
        p: 3,
        borderRadius: "10px",
        border: '1px solid var(--border)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Typography variant="h6" sx={{ color: 'var(--text)', mb: 1, fontWeight: '600', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 4, height: 20, bgcolor: 'var(--accent)', borderRadius: 1 }} />
        Add New Team
      </Typography>
      <Typography variant="caption" sx={{ color: 'var(--text-muted)', mb: 3 }}>
        Enter team details to create a new field team account.
      </Typography>

      <Stack spacing={2.5}>
        {/* Section 1: Team Name Members */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField label="First Name" size="small" {...register('firstName', { required: true })} sx={sharedInputSx} />
          <TextField label="Second Name (Optional)" size="small" {...register('secondName', { required: false })} sx={sharedInputSx} />
          <TextField label="Third Name (Optional)" size="small" {...register('thirdName', { required: false })} sx={sharedInputSx} />
          <TextField label="Surname" size="small" {...register('surname', { required: true })} sx={sharedInputSx} />
        </Box>

        <Divider sx={{ borderColor: '#222' }} />

        {/* Section 2: Contact & Company */}
        <TextField
          label="Contact Number"
          size="small"
          type="tel"
          placeholder="+962"
          {...register('contactNumber', { required: true })}
          sx={sharedInputSx}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Phone sx={{ color: 'var(--text-muted)', fontSize: 18 }} /></InputAdornment>
          }}
        />

        <FormControl fullWidth size="small">
          <InputLabel sx={{ color: 'var(--text-muted)', '&.Mui-focused': { color: 'var(--accent-text)' } }}>Company</InputLabel>
          <NativeSelect
            {...register('teamCompany', { required: true })}
            sx={{
              color: 'var(--text)',
              bgcolor: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 1,
              pl: 1.5,
              py: 0.5,
              '&:before': { display: 'none' },
              '&:after': { display: 'none' },
              '& select': { paddingLeft: 1 },
              '& .MuiNativeSelect-icon': { color: 'var(--accent-text)' }
            }}
          >
            <option value="" style={{ backgroundColor: 'var(--bg)' }}>Select Company</option>
            {fieldTeamsCompany.map((opt, i) => (
              <option key={i} value={opt} style={{ backgroundColor: 'var(--bg)', color: '#fff' }}>{opt}</option>
            ))}
          </NativeSelect>
        </FormControl>

        <Divider sx={{ borderColor: '#222' }} />

        {/* Section 3: Tech Info */}
        <TextField
          label="Team Code / ID"
          size="small"
          {...register('teamCode', { required: true })}
          sx={sharedInputSx}
          helperText="Auto-generates Quiz Code"
          FormHelperTextProps={{ sx: { color: 'var(--border-strong)', fontSize: '0.7rem' } }}
        />

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField label="FSM Serial" size="small" {...register('fsmSerialNumber')} sx={sharedInputSx} />
          <TextField label="Laptop Serial" size="small" {...register('laptopSerialNumber')} sx={sharedInputSx} />
        </Box>

        <Divider sx={{ borderColor: '#222' }} />

        {/* Section 4: Employment & Safety Certifications */}
        <Typography variant="overline" sx={{ color: 'var(--accent-text)', fontWeight: '600', display: 'block' }}>
          Employment & Certifications
        </Typography>

        <FormControl fullWidth size="small">
          <InputLabel sx={{ color: 'var(--text-muted)', '&.Mui-focused': { color: 'var(--accent-text)' } }}>Employment Type</InputLabel>
          <NativeSelect
            defaultValue="Subcontractor"
            {...register('employmentType')}
            sx={{
              color: 'var(--text)',
              bgcolor: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 1,
              pl: 1.5,
              py: 0.5,
              '&:before': { display: 'none' },
              '&:after': { display: 'none' },
              '& select': { paddingLeft: 1 },
              '& .MuiNativeSelect-icon': { color: 'var(--accent-text)' }
            }}
          >
            <option value="Subcontractor" style={{ backgroundColor: 'var(--bg)', color: '#fff' }}>Subcontractor (Partner)</option>
            <option value="Employee" style={{ backgroundColor: 'var(--bg)', color: '#fff' }}>Direct Employee</option>
          </NativeSelect>
        </FormControl>

        <Box sx={{ bgcolor: 'var(--bg)', p: 1.5, borderRadius: 1.5, border: '1px solid #282828' }}>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 600, mb: 1, display: 'block' }}>
            EXPERIENCE DURATION (YEARS / MONTHS / DAYS)
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
            <TextField
              label="Years"
              type="number"
              size="small"
              defaultValue={0}
              inputProps={{ min: 0, max: 50 }}
              {...register('experienceYears')}
              sx={sharedInputSx}
            />
            <TextField
              label="Months"
              type="number"
              size="small"
              defaultValue={0}
              inputProps={{ min: 0, max: 11 }}
              {...register('experienceMonths')}
              sx={sharedInputSx}
            />
            <TextField
              label="Days"
              type="number"
              size="small"
              defaultValue={0}
              inputProps={{ min: 0, max: 30 }}
              {...register('experienceDays')}
              sx={sharedInputSx}
            />
          </Box>
        </Box>

        <Box sx={{ bgcolor: 'var(--bg)', p: 1.5, borderRadius: 1.5, border: '1px solid #282828' }}>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 600, mb: 1, display: 'block' }}>
            SAFETY & COMPLIANCE CERTIFICATES
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            {[
              { id: 'certificates.dd', label: 'DD – Defensive Driving' },
              { id: 'certificates.es', label: 'ES – Electrical Safety' },
              { id: 'certificates.fa', label: 'FA – First Aid' },
              { id: 'certificates.ff', label: 'FF – Fire Fighting' },
              { id: 'certificates.ra', label: 'RA – Risk Assessment' },
              { id: 'certificates.wah', label: 'WAH – Work at Height' },
            ].map((cert) => (
              <Box key={cert.id} sx={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  {...register(cert.id)}
                  id={`add-${cert.id}`}
                  style={{ marginRight: '8px', accentColor: '#6C47FF', transform: 'scale(1.1)' }}
                />
                <label htmlFor={`add-${cert.id}`} style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}>
                  {cert.label}
                </label>
              </Box>
            ))}
          </Box>
        </Box>

        <Divider sx={{ borderColor: '#222' }} />

        {/* Section 5: Role Expertise */}
        <Typography variant="overline" sx={{ color: 'var(--accent-text)', fontWeight: '600', display: 'block' }}>
          Role Expertise
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <input type="checkbox" {...register('isNewToInstallation')} id="new-install" style={{ marginRight: '8px', accentColor: '#6C47FF', transform: 'scale(1.2)' }} />
              <label htmlFor="new-install" style={{ color: 'var(--text)', fontSize: '0.9rem', cursor: 'pointer' }}>New to Installation</label>
            </Box>
            <TextField
              label="Start Date"
              type="date"
              size="small"
              {...register('installationStartDate')}
              sx={{ ...sharedInputSx, flex: 1 }}
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <input type="checkbox" {...register('isNewToActivation')} id="new-activation" style={{ marginRight: '8px', accentColor: '#6C47FF', transform: 'scale(1.2)' }} />
              <label htmlFor="new-activation" style={{ color: 'var(--text)', fontSize: '0.9rem', cursor: 'pointer' }}>New to Activation</label>
            </Box>
            <TextField
              label="Start Date"
              type="date"
              size="small"
              {...register('activationStartDate')}
              sx={{ ...sharedInputSx, flex: 1 }}
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <input type="checkbox" {...register('replaceExisting')} id="replace-existing" style={{ accentColor: '#6C47FF', transform: 'scale(1.2)' }} />
            <label htmlFor="replace-existing" style={{ color: 'var(--text)', fontSize: '0.9rem', cursor: 'pointer' }}>
              Replace existing active team with this code
            </label>
          </Box>

          <Typography variant="caption" sx={{ color: 'var(--border-strong)', fontStyle: 'italic' }}>
            * If not checked, team is considered a Rich Expert.
          </Typography>
        </Box>
      </Stack>

      {errorMessage && (
        <Box sx={{
          mt: 2,
          p: 1.5,
          bgcolor: 'rgba(220, 38, 38, 0.1)',
          border: '1px solid #DC2626',
          borderRadius: 2
        }}>
          <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 600, display: 'block' }}>
            Submission Error:
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text)' }}>
            {errorMessage}
          </Typography>
        </Box>
      )}

      <Button
        type="submit"
        variant="contained"
        disabled={loading || user.role !== 'Admin'}
        startIcon={loading ? null : <Add />}
        disableElevation
        sx={{
          mt: 4,
          bgcolor: 'var(--accent)',
          color: 'var(--text)',
          py: 1.2,
          fontWeight: '600',
          '&:hover': { bgcolor: '#6652e0' },
          '&.Mui-disabled': { bgcolor: 'var(--surface-hover)', color: 'var(--text-muted)' }
        }}
      >
        {loading ? 'Adding...' : 'Create Team'}
      </Button>
    </Box>
  );
};

export default AddTeamForm;