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
  useMediaQuery,
  useTheme,
  Stack,
  Divider
} from '@mui/material';
import { AccountCircle, Phone, Add } from '@mui/icons-material';

// Fallback constants removed. Powered by dynamic API data.
import api from '../api/api';
import { useEffect, useState } from 'react';

const AddTeamForm = ({ onAddTeam, loading }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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

  const onSubmit = (data) => {
    onAddTeam(data);
    reset();
  };

  const sharedInputSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: '#1a1a1a',
      '& fieldset': { borderColor: '#333' },
      '&:hover fieldset': { borderColor: '#7b68ee' },
      '&.Mui-focused fieldset': { borderColor: '#7b68ee' },
      '& input': { color: '#fff' }
    },
    '& .MuiInputLabel-root': { color: '#888' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#7b68ee' }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        bgcolor: '#111',
        p: 3,
        borderRadius: 3,
        border: '1px solid #333',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Typography variant="h6" sx={{ color: '#fff', mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 4, height: 20, bgcolor: '#7b68ee', borderRadius: 1 }} />
        Add New Team
      </Typography>
      <Typography variant="caption" sx={{ color: '#888', mb: 3 }}>
        Enter team details to create a new field team account.
      </Typography>

      <Stack spacing={2.5}>
        {/* Section 1: Team Name Members */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField label="First Name" size="small" {...register('firstName', { required: true })} sx={sharedInputSx} />
          <TextField label="Second Name" size="small" {...register('secondName')} sx={sharedInputSx} />
          <TextField label="Third Name" size="small" {...register('thirdName')} sx={sharedInputSx} />
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
            startAdornment: <InputAdornment position="start"><Phone sx={{ color: '#666', fontSize: 18 }} /></InputAdornment>
          }}
        />

        <FormControl fullWidth size="small">
          <InputLabel sx={{ color: '#888', '&.Mui-focused': { color: '#7b68ee' } }}>Company</InputLabel>
          <NativeSelect
            {...register('teamCompany', { required: true })}
            sx={{
              color: '#fff',
              bgcolor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 1,
              pl: 1.5,
              py: 0.5,
              '&:before': { display: 'none' },
              '&:after': { display: 'none' },
              '& select': { paddingLeft: 1 },
              '& .MuiNativeSelect-icon': { color: '#7b68ee' }
            }}
          >
            <option value="" style={{ backgroundColor: '#111' }}>Select Company</option>
            {fieldTeamsCompany.map((opt, i) => (
              <option key={i} value={opt} style={{ backgroundColor: '#111', color: '#fff' }}>{opt}</option>
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
          FormHelperTextProps={{ sx: { color: '#555', fontSize: '0.7rem' } }}
        />

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField label="FSM Serial" size="small" {...register('fsmSerialNumber')} sx={sharedInputSx} />
          <TextField label="Laptop Serial" size="small" {...register('laptopSerialNumber')} sx={sharedInputSx} />
        </Box>
      </Stack>

      <Button
        type="submit"
        variant="contained"
        disabled={loading || user.role !== 'Admin'}
        startIcon={loading ? null : <Add />}
        disableElevation
        sx={{
          mt: 4,
          bgcolor: '#7b68ee',
          color: '#fff',
          py: 1.2,
          fontWeight: 'bold',
          '&:hover': { bgcolor: '#6652e0' },
          '&.Mui-disabled': { bgcolor: '#333', color: '#666' }
        }}
      >
        {loading ? 'Adding...' : 'Create Team'}
      </Button>
    </Box>
  );
};

export default AddTeamForm;