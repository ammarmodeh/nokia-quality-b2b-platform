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
          backgroundColor: '#2d2d2d',
          boxShadow: 'none',
          borderRadius: isMobile ? 0 : '8px',
          border: isMobile ? 'none' : '1px solid #e5e7eb',
          margin: 0,
          width: isMobile ? '100%' : '70%',
          maxWidth: '100%'
        }
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle sx={{
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: isMobile ? '12px 16px' : '16px 24px',
          fontWeight: 500,
          position: 'sticky',
          top: 0,
          zIndex: 1
        }}>
          Edit Team Information
        </DialogTitle>
        <DialogContent sx={{
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          padding: isMobile ? '12px 16px' : '20px 24px',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#e5e7eb',
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
                    borderColor: '#3d3d3d',
                  },
                  '&:hover fieldset': {
                    borderColor: '#7b68ee',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#7b68ee',
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
                style: { color: '#b3b3b3' },
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
                    borderColor: '#3d3d3d',
                  },
                  '&:hover fieldset': {
                    borderColor: '#7b68ee',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#7b68ee',
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
                style: { color: '#b3b3b3' },
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
                    borderColor: '#3d3d3d',
                  },
                  '&:hover fieldset': {
                    borderColor: '#7b68ee',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#7b68ee',
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
                style: { color: '#b3b3b3' },
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
                    borderColor: '#3d3d3d',
                  },
                  '&:hover fieldset': {
                    borderColor: '#7b68ee',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#7b68ee',
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
                style: { color: '#b3b3b3' },
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
                    borderColor: '#3d3d3d',
                  },
                  '&:hover fieldset': {
                    borderColor: '#7b68ee',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#7b68ee',
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
                style: { color: '#b3b3b3' },
                shrink: true
              }}
              size={isMobile ? "small" : "medium"}
            />
            <FormControl sx={{ flex: 1 }}>
              <InputLabel
                sx={{
                  color: '#b3b3b3',
                  '&.Mui-focused': {
                    color: '#7b68ee',
                  }
                }}
              >
                Company
              </InputLabel>
              <NativeSelect
                {...register('teamCompany')}
                disabled={user.role !== 'Admin'}
                sx={{
                  color: '#ffffff',
                  '& .MuiNativeSelect-select': {
                    padding: isMobile ? '8.5px 14px' : '14px',
                  },
                  '& .MuiNativeSelect-icon': {
                    color: '#7b68ee',
                  },
                  '&:before': {
                    borderBottom: '1px solid #e5e7eb',
                  },
                  '&:hover:not(.Mui-disabled):before': {
                    borderBottom: '1px solid #7b68ee',
                  },
                  '&:after': {
                    borderBottom: '1px solid #7b68ee',
                  },
                }}
              >
                {fieldTeamsCompany.map((list, index) => (
                  <option key={index} value={list} style={{ backgroundColor: '#2d2d2d', color: '#ffffff' }}>
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
                    borderColor: '#3d3d3d',
                  },
                  '&:hover fieldset': {
                    borderColor: '#7b68ee',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#7b68ee',
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
                style: { color: '#b3b3b3' },
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
                    borderColor: '#3d3d3d',
                  },
                  '&:hover fieldset': {
                    borderColor: '#7b68ee',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#7b68ee',
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
                style: { color: '#b3b3b3' },
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
          backgroundColor: '#2d2d2d',
          borderTop: '1px solid #e5e7eb',
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
              backgroundColor: '#7b68ee',
              color: '#f9fafb',
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