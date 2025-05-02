// AddTeamForm.js
import { useForm } from 'react-hook-form';
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
} from '@mui/material';
import { AccountCircle, Phone, Add } from '@mui/icons-material';

const FIELDTEAMSCOMPANY = ['INH-1', 'INH-2', 'INH-3', 'INH-4', 'INH-5', 'INH-6', 'Al-Dar 2', 'Orange Team'];

const AddTeamForm = ({ onSubmit, errorMessage, user }) => {
  const { register, handleSubmit, reset } = useForm();
  const isMobileScreen = useMediaQuery('(max-width: 503px)');

  const sharedTextFieldStyle = {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 1,
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: 'dimgray',
      },
      '&:hover fieldset': {
        borderColor: user.role === 'Admin' ? 'white' : 'dimgray',
      },
      '&.Mui-focused fieldset': {
        borderColor: user.role === 'Admin' ? '#00bcd4' : 'dimgray',
      },
      '&.Mui-readOnly': {
        '& fieldset': {
          borderColor: 'dimgray',
        },
        '&:hover fieldset': {
          borderColor: 'dimgray',
        },
      },
    },
    '& .MuiInputBase-input.Mui-readOnly': {
      cursor: 'not-allowed',
      color: '#b3b3b3 !important',
    },
  };

  const handleFormSubmit = (data) => {
    onSubmit(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <Typography variant="h4" fontWeight="bold" textAlign="left" mb={5} color="#3ea6ff">
        Add Field Team Information
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: isMobileScreen ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3 }}>
        {/* Name Fields */}
        {['firstName', 'secondName', 'thirdName', 'surname'].map((field, index) => (
          <TextField
            key={index}
            label={field.replace(/([A-Z])/g, ' $1').trim()}
            variant="outlined"
            fullWidth={isMobileScreen ? true : false}
            readOnly={user.role !== 'Admin'}
            {...register(field)}
            sx={sharedTextFieldStyle}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AccountCircle sx={{ color: '#ffffff' }} />
                </InputAdornment>
              ),
              style: { color: '#ffffff' },
              readOnly: user.role !== 'Admin',
            }}
            InputLabelProps={{ style: { color: '#b3b3b3' } }}
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: isMobileScreen ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3 }}>
        {/* Contact Number */}
        <TextField
          label="Contact Number"
          variant="outlined"
          readOnly={user.role !== 'Admin'}
          type="tel"
          placeholder="+962"
          {...register('contactNumber', { required: 'Contact number is required' })}
          fullWidth={isMobileScreen ? true : false}
          sx={sharedTextFieldStyle}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Phone sx={{ color: '#ffffff' }} />
              </InputAdornment>
            ),
            style: { color: '#ffffff' },
            readOnly: user.role !== 'Admin',
          }}
          InputLabelProps={{ style: { color: '#b3b3b3' } }}
        />

        {/* Company Dropdown */}
        <FormControl
          variant="outlined"
          fullWidth={isMobileScreen ? true : false}
          sx={{
            flex: 1,
            backgroundColor: 'transparent',
            borderRadius: 1,
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'dimgray',
              },
              '&:hover fieldset': {
                borderColor: user.role === 'Admin' ? 'white' : 'dimgray',
              },
              '&.Mui-focused fieldset': {
                borderColor: user.role === 'Admin' ? '#00bcd4' : 'dimgray',
              },
              '&.Mui-disabled': {
                '& fieldset': {
                  borderColor: 'dimgray',
                },
                '&:hover fieldset': {
                  borderColor: 'dimgray',
                },
              },
            },
            '& .MuiInputBase-input.Mui-disabled': {
              cursor: 'not-allowed',
              color: '#b3b3b3 !important',
            },
          }}
        >
          <InputLabel sx={{ color: '#b3b3b3' }}>Company</InputLabel>
          <NativeSelect
            defaultValue={FIELDTEAMSCOMPANY[0]}
            disabled={user.role !== 'Admin'}
            {...register('teamCompany')}
            sx={{ color: '#ffffff' }}
            inputProps={{
              style: { cursor: user.role === 'Admin' ? 'pointer' : 'not-allowed' }
            }}
          >
            {FIELDTEAMSCOMPANY.map((list, index) => (
              <option key={index} value={list} style={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>
                {list}
              </option>
            ))}
          </NativeSelect>
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: isMobileScreen ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3 }}>
        {/* FSM Serial Number */}
        <TextField
          label="FSM Serial Number"
          variant="outlined"
          readOnly={user.role !== 'Admin'}
          {...register('fsmSerialNumber')}
          fullWidth={isMobileScreen ? true : false}
          sx={sharedTextFieldStyle}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <AccountCircle sx={{ color: '#ffffff' }} />
              </InputAdornment>
            ),
            style: { color: '#ffffff' },
            readOnly: user.role !== 'Admin',
          }}
          InputLabelProps={{ style: { color: '#b3b3b3' } }}
        />

        {/* Laptop Serial Number */}
        <TextField
          label="Laptop Serial Number"
          variant="outlined"
          readOnly={user.role !== 'Admin'}
          {...register('laptopSerialNumber')}
          sx={sharedTextFieldStyle}
          fullWidth={isMobileScreen ? true : false}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <AccountCircle sx={{ color: '#ffffff' }} />
              </InputAdornment>
            ),
            style: { color: '#ffffff' },
            readOnly: user.role !== 'Admin',
          }}
          InputLabelProps={{ style: { color: '#b3b3b3' } }}
        />
      </Box>

      {/* Error Message */}
      {errorMessage && <Typography color="error" sx={{ mb: 2 }}>{errorMessage}</Typography>}

      {/* Submit Button */}
      <Button
        type="submit"
        variant="contained"
        endIcon={<Add />}
        disabled={user.role !== 'Admin'}
        sx={{
          backgroundColor: '#3ea6ff',
          color: '#121212',
          '&:hover': { backgroundColor: '#1d4ed8' },
          '&.Mui-disabled': {
            cursor: 'not-allowed',
            backgroundColor: '#3ea6ff80',
          }
        }}
      >
        Add
      </Button>
    </form>
  );
};

export default AddTeamForm;