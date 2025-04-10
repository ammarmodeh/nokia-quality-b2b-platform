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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { AccountCircle, Phone } from '@mui/icons-material';

const FIELDTEAMSCOMPANY = ['Barium 1', 'Barium 2', 'Barium 3', 'Aldar 2'];

const EditTeamDialog = ({ open, onClose, team, onSubmit, errorMessage }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      fullWidth
      maxWidth="md"
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: '#1e1e1e',
          boxShadow: 'none',
          borderRadius: isMobile ? 0 : '8px',
          border: isMobile ? 'none' : '1px solid #444',
          margin: 0,
          width: isMobile ? '100%' : '70%',
          maxWidth: '100%'
        }
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle sx={{
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          borderBottom: '1px solid #444',
          padding: isMobile ? '12px 16px' : '16px 24px',
          fontWeight: 500,
          position: 'sticky',
          top: 0,
          zIndex: 1
        }}>
          Edit Team Information
        </DialogTitle>
        <DialogContent sx={{
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          padding: isMobile ? '12px 16px' : '20px 24px',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#444',
            borderRadius: '2px',
          },
          height: '100%',
          "&.MuiDialogContent-root": {
            paddingTop: 3,
          }
        }}>
          {/* Name Fields */}
          <Box sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 2,
            my: isMobile ? 2 : 4
          }}>
            <TextField
              label="First Name"
              variant="outlined"
              {...register('firstName', { required: 'First name is required' })}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#444',
                  },
                  '&:hover fieldset': {
                    borderColor: '#3ea6ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3ea6ff',
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle sx={{ color: '#ffffff' }} />
                  </InputAdornment>
                ),
                style: { color: '#ffffff' },
              }}
              InputLabelProps={{
                style: { color: '#aaaaaa' },
                shrink: true
              }}
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Second Name"
              variant="outlined"
              {...register('secondName')}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#444',
                  },
                  '&:hover fieldset': {
                    borderColor: '#3ea6ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3ea6ff',
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle sx={{ color: '#ffffff' }} />
                  </InputAdornment>
                ),
                style: { color: '#ffffff' },
              }}
              InputLabelProps={{
                style: { color: '#aaaaaa' },
                shrink: true
              }}
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Third Name"
              variant="outlined"
              {...register('thirdName')}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#444',
                  },
                  '&:hover fieldset': {
                    borderColor: '#3ea6ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3ea6ff',
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle sx={{ color: '#ffffff' }} />
                  </InputAdornment>
                ),
                style: { color: '#ffffff' },
              }}
              InputLabelProps={{
                style: { color: '#aaaaaa' },
                shrink: true
              }}
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Surname"
              variant="outlined"
              {...register('surname')}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#444',
                  },
                  '&:hover fieldset': {
                    borderColor: '#3ea6ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3ea6ff',
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle sx={{ color: '#ffffff' }} />
                  </InputAdornment>
                ),
                style: { color: '#ffffff' },
              }}
              InputLabelProps={{
                style: { color: '#aaaaaa' },
                shrink: true
              }}
              size={isMobile ? "small" : "medium"}
            />
          </Box>

          {/* Contact Number and Company */}
          <Box sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 2,
            my: isMobile ? 2 : 4
          }}>
            <TextField
              label="Contact Number"
              variant="outlined"
              type="tel"
              placeholder="+962"
              {...register('contactNumber', { required: 'Contact number is required' })}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#444',
                  },
                  '&:hover fieldset': {
                    borderColor: '#3ea6ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3ea6ff',
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone sx={{ color: '#ffffff' }} />
                  </InputAdornment>
                ),
                style: { color: '#ffffff' },
              }}
              InputLabelProps={{
                style: { color: '#aaaaaa' },
                shrink: true
              }}
              size={isMobile ? "small" : "medium"}
            />
            <FormControl sx={{ flex: 1 }}>
              <InputLabel
                sx={{
                  color: '#aaaaaa',
                  '&.Mui-focused': {
                    color: '#3ea6ff',
                  }
                }}
              >
                Company
              </InputLabel>
              <NativeSelect
                {...register('teamCompany')}
                defaultValue={team?.teamCompany || FIELDTEAMSCOMPANY[0]}
                sx={{
                  color: '#ffffff',
                  '& .MuiNativeSelect-select': {
                    padding: isMobile ? '8.5px 14px' : '14px',
                  },
                  '& .MuiNativeSelect-icon': {
                    color: '#3ea6ff',
                  },
                  '&:before': {
                    borderBottom: '1px solid #444',
                  },
                  '&:hover:not(.Mui-disabled):before': {
                    borderBottom: '1px solid #3ea6ff',
                  },
                  '&:after': {
                    borderBottom: '1px solid #3ea6ff',
                  },
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

          {/* FSM and Laptop Serial Numbers */}
          <Box sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 2,
            my: isMobile ? 2 : 4
          }}>
            <TextField
              label="FSM Serial Number"
              variant="outlined"
              {...register('fsmSerialNumber')}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#444',
                  },
                  '&:hover fieldset': {
                    borderColor: '#3ea6ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3ea6ff',
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle sx={{ color: '#ffffff' }} />
                  </InputAdornment>
                ),
                style: { color: '#ffffff' },
              }}
              InputLabelProps={{
                style: { color: '#aaaaaa' },
                shrink: true
              }}
              size={isMobile ? "small" : "medium"}
            />
            <TextField
              label="Laptop Serial Number"
              variant="outlined"
              {...register('laptopSerialNumber')}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#444',
                  },
                  '&:hover fieldset': {
                    borderColor: '#3ea6ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3ea6ff',
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle sx={{ color: '#ffffff' }} />
                  </InputAdornment>
                ),
                style: { color: '#ffffff' },
              }}
              InputLabelProps={{
                style: { color: '#aaaaaa' },
                shrink: true
              }}
              size={isMobile ? "small" : "medium"}
            />
          </Box>

          {/* Error Message */}
          {errorMessage && (
            <Typography
              sx={{
                color: '#f44336',
                mb: 2,
                fontSize: isMobile ? '0.875rem' : '1rem'
              }}
            >
              {errorMessage}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{
          backgroundColor: '#1e1e1e',
          borderTop: '1px solid #444',
          padding: isMobile ? '8px 16px' : '12px 24px',
          position: 'sticky',
          bottom: 0
        }}>
          <Button
            onClick={onClose}
            size={isMobile ? "small" : "medium"}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#2a2a2a',
              }
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            size={isMobile ? "small" : "medium"}
            sx={{
              backgroundColor: '#3ea6ff',
              color: '#121212',
              '&:hover': {
                backgroundColor: '#1d4ed8'
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditTeamDialog;