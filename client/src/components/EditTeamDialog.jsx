// EditTeamDialog.js
import React from 'react';
import { useForm } from 'react-hook-form';
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
} from '@mui/material';
import { AccountCircle, Phone } from '@mui/icons-material';

const FIELDTEAMSCOMPANY = ['Barium 1', 'Barium 2', 'Barium 3', 'Aldar 2'];

const EditTeamDialog = ({ open, onClose, team, onSubmit, errorMessage }) => {
  const { register, handleSubmit, reset } = useForm();

  // Reset form when team data changes
  React.useEffect(() => {
    if (team) {
      reset({
        firstName: team.teamName.split(' ')[0],
        secondName: team.teamName.split(' ')[1],
        thirdName: team.teamName.split(' ')[2],
        surname: team.teamName.split(' ')[3],
        contactNumber: team.contactNumber,
        fsmSerialNumber: team.fsmSerialNumber === 'N/A' ? '' : team.fsmSerialNumber,
        laptopSerialNumber: team.laptopSerialNumber === 'N/A' ? '' : team.laptopSerialNumber,
        teamCompany: team.teamCompany || FIELDTEAMSCOMPANY[0],
      });
    }
  }, [team, reset]);

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle sx={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>Edit Team Information</DialogTitle>
        <DialogContent sx={{ backgroundColor: '#1e1e1e' }}>
          {/* Name Fields */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, my: 4 }}>
            <TextField
              label="First Name"
              variant="outlined"
              {...register('firstName', { required: 'First name is required' })}
              sx={{ flex: 1, backgroundColor: '#1e1e1e', borderRadius: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle sx={{ color: '#ffffff' }} />
                  </InputAdornment>
                ),
                style: { color: '#ffffff' },
              }}
              InputLabelProps={{ style: { color: '#b3b3b3' } }}
            />
            <TextField
              label="Second Name"
              variant="outlined"
              {...register('secondName')}
              sx={{ flex: 1, backgroundColor: '#1e1e1e', borderRadius: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle sx={{ color: '#ffffff' }} />
                  </InputAdornment>
                ),
                style: { color: '#ffffff' },
              }}
              InputLabelProps={{ style: { color: '#b3b3b3' } }}
            />
            <TextField
              label="Third Name"
              variant="outlined"
              {...register('thirdName')}
              sx={{ flex: 1, backgroundColor: '#1e1e1e', borderRadius: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle sx={{ color: '#ffffff' }} />
                  </InputAdornment>
                ),
                style: { color: '#ffffff' },
              }}
              InputLabelProps={{ style: { color: '#b3b3b3' } }}
            />
            <TextField
              label="Surname"
              variant="outlined"
              {...register('surname')}
              sx={{ flex: 1, backgroundColor: '#1e1e1e', borderRadius: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle sx={{ color: '#ffffff' }} />
                  </InputAdornment>
                ),
                style: { color: '#ffffff' },
              }}
              InputLabelProps={{ style: { color: '#b3b3b3' } }}
            />
          </Box>

          {/* Contact Number and Company */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, my: 4 }}>
            <TextField
              label="Contact Number"
              variant="outlined"
              type="tel"
              placeholder="+962"
              {...register('contactNumber', { required: 'Contact number is required' })}
              sx={{ flex: 1, backgroundColor: '#1e1e1e', borderRadius: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone sx={{ color: '#ffffff' }} />
                  </InputAdornment>
                ),
                style: { color: '#ffffff' },
              }}
              InputLabelProps={{ style: { color: '#b3b3b3' } }}
            />
            <FormControl sx={{ flex: 1, backgroundColor: '#1e1e1e', borderRadius: 1 }}>
              <InputLabel sx={{ color: '#b3b3b3' }}>Company</InputLabel>
              <NativeSelect
                {...register('teamCompany')}
                defaultValue={team?.teamCompany || FIELDTEAMSCOMPANY[0]}
                sx={{ color: '#ffffff' }}
              >
                {FIELDTEAMSCOMPANY.map((list, index) => (
                  <option key={index} value={list} style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>
                    {list}
                  </option>
                ))}
              </NativeSelect>
            </FormControl>
          </Box>

          {/* FSM and Laptop Serial Numbers */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, my: 4 }}>
            <TextField
              label="FSM Serial Number"
              variant="outlined"
              {...register('fsmSerialNumber')}
              sx={{ flex: 1, backgroundColor: '#1e1e1e', borderRadius: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle sx={{ color: '#ffffff' }} />
                  </InputAdornment>
                ),
                style: { color: '#ffffff' },
              }}
              InputLabelProps={{ style: { color: '#b3b3b3' } }}
            />
            <TextField
              label="Laptop Serial Number"
              variant="outlined"
              {...register('laptopSerialNumber')}
              sx={{ flex: 1, backgroundColor: '#1e1e1e', borderRadius: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle sx={{ color: '#ffffff' }} />
                  </InputAdornment>
                ),
                style: { color: '#ffffff' },
              }}
              InputLabelProps={{ style: { color: '#b3b3b3' } }}
            />
          </Box>

          {/* Error Message */}
          {errorMessage && <Typography color="error" sx={{ mb: 2 }}>{errorMessage}</Typography>}
        </DialogContent>
        <DialogActions sx={{ backgroundColor: '#1e1e1e' }}>
          <Button onClick={onClose} sx={{ color: '#ffffff' }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" sx={{ backgroundColor: '#3ea6ff', color: '#121212', '&:hover': { backgroundColor: '#1d4ed8' } }}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditTeamDialog;