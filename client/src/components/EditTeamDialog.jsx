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

const EditTeamDialog = ({ open, onClose, team, onSubmit, errorMessage }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useSelector((state) => state.auth);
  const { register, handleSubmit, reset } = useForm();
  const [fieldTeamsCompany, setFieldTeamsCompany] = useState([]);

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
      });
    }
  }, [team, reset]);

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
          border: '1px solid #333',
          margin: 0,
          width: isMobile ? '100%' : '70%',
          maxWidth: '100%'
        }
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle sx={{
          backgroundColor: '#111',
          color: '#ffffff',
          borderBottom: '1px solid #333',
          padding: isMobile ? '16px 20px' : '20px 32px',
          fontWeight: 700,
          letterSpacing: '-0.5px',
          position: 'sticky',
          top: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <AccountCircle sx={{ color: '#7b68ee' }} />
          Edit Team Information
        </DialogTitle>
        <DialogContent sx={{
          backgroundColor: '#111',
          color: '#ffffff',
          padding: isMobile ? '20px' : '32px',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#333',
            borderRadius: '2px',
          },
          height: '100%',
          "&.MuiDialogContent-root": {
            paddingTop: 4,
          }
        }}>
          {/* Section: Personal Info */}
          <Typography variant="overline" sx={{ color: '#666', fontWeight: 'bold', mb: 2, display: 'block' }}>
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1a1a1a',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#7b68ee' },
                  '&.Mui-focused fieldset': { borderColor: '#7b68ee' },
                },
              }}
              InputProps={{ style: { color: '#ffffff' } }}
              InputLabelProps={{ style: { color: '#888' }, shrink: true }}
            />
            <TextField
              label="Second Name"
              variant="outlined"
              {...register('secondName')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1a1a1a',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#7b68ee' },
                  '&.Mui-focused fieldset': { borderColor: '#7b68ee' },
                },
              }}
              InputProps={{ style: { color: '#ffffff' } }}
              InputLabelProps={{ style: { color: '#888' }, shrink: true }}
            />
            <TextField
              label="Third Name"
              variant="outlined"
              {...register('thirdName')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1a1a1a',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#7b68ee' },
                  '&.Mui-focused fieldset': { borderColor: '#7b68ee' },
                },
              }}
              InputProps={{ style: { color: '#ffffff' } }}
              InputLabelProps={{ style: { color: '#888' }, shrink: true }}
            />
            <TextField
              label="Surname"
              variant="outlined"
              {...register('surname')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1a1a1a',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#7b68ee' },
                  '&.Mui-focused fieldset': { borderColor: '#7b68ee' },
                },
              }}
              InputProps={{ style: { color: '#ffffff' } }}
              InputLabelProps={{ style: { color: '#888' }, shrink: true }}
            />
          </Box>

          {/* Section: Professional Info */}
          <Typography variant="overline" sx={{ color: '#666', fontWeight: 'bold', mb: 2, display: 'block' }}>
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1a1a1a',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#7b68ee' },
                  '&.Mui-focused fieldset': { borderColor: '#7b68ee' },
                },
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Phone sx={{ color: '#666' }} /></InputAdornment>,
                style: { color: '#ffffff' }
              }}
              InputLabelProps={{ style: { color: '#888' }, shrink: true }}
            />

            <TextField
              label="Team Code / Team ID"
              variant="outlined"
              {...register('teamCode')}
              helperText="Changing this will regenerate the Quiz Code"
              FormHelperTextProps={{ sx: { color: '#666' } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1a1a1a',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#7b68ee' },
                  '&.Mui-focused fieldset': { borderColor: '#7b68ee' },
                },
              }}
              InputProps={{ style: { color: '#ffffff' } }}
              InputLabelProps={{ style: { color: '#888' }, shrink: true }}
            />

            <FormControl fullWidth>
              <InputLabel shrink sx={{ color: '#888', '&.Mui-focused': { color: '#7b68ee' } }}>
                Company
              </InputLabel>
              <NativeSelect
                {...register('teamCompany')}
                disabled={user.role !== 'Admin'}
                sx={{
                  color: '#ffffff',
                  bgcolor: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  pl: 2,
                  py: 0.5,
                  '&:hover': { border: '1px solid #7b68ee' },
                  '&:before': { display: 'none' },
                  '&:after': { display: 'none' },
                  '& .MuiNativeSelect-icon': { color: '#7b68ee' },
                }}
              >
                {fieldTeamsCompany.map((list, index) => (
                  <option key={index} value={list} style={{ backgroundColor: '#111', color: '#fff' }}>
                    {list}
                  </option>
                ))}
              </NativeSelect>
            </FormControl>
          </Box>

          {/* Section: Device Info */}
          <Typography variant="overline" sx={{ color: '#666', fontWeight: 'bold', mb: 2, display: 'block' }}>
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1a1a1a',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#7b68ee' },
                  '&.Mui-focused fieldset': { borderColor: '#7b68ee' },
                },
              }}
              InputProps={{ style: { color: '#ffffff' } }}
              InputLabelProps={{ style: { color: '#888' }, shrink: true }}
            />
            <TextField
              label="Laptop Serial Number"
              variant="outlined"
              {...register('laptopSerialNumber')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#1a1a1a',
                  '& fieldset': { borderColor: '#333' },
                  '&:hover fieldset': { borderColor: '#7b68ee' },
                  '&.Mui-focused fieldset': { borderColor: '#7b68ee' },
                },
              }}
              InputProps={{ style: { color: '#ffffff' } }}
              InputLabelProps={{ style: { color: '#888' }, shrink: true }}
            />
          </Box>

          {errorMessage && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(244, 67, 54, 0.1)', border: '1px solid #f44336', borderRadius: '8px', color: '#f44336' }}>
              {errorMessage}
            </Box>
          )}

        </DialogContent>
        <DialogActions sx={{
          backgroundColor: '#111',
          borderTop: '1px solid #333',
          padding: isMobile ? '16px' : '20px 32px',
          position: 'sticky',
          bottom: 0,
          gap: 2
        }}>
          <Button
            onClick={onClose}
            sx={{
              color: '#888',
              '&:hover': { color: '#fff', bgcolor: '#ffffff10' }
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disableElevation
            sx={{
              backgroundColor: '#7b68ee',
              color: '#fff',
              px: 4,
              py: 1,
              '&:hover': { backgroundColor: '#6652e0' }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditTeamDialog;