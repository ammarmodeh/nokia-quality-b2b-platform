import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Button,
  Alert,
  Snackbar,
  Typography,
  Box,
  Divider,
  IconButton,
  Paper,
  TextField,
  InputAdornment,
  useMediaQuery
} from '@mui/material';
import { MdVisibility, MdVisibilityOff, MdLogin, MdPersonAdd } from 'react-icons/md';
import { HashLoader } from 'react-spinners';
import api from '../api/api';
import { login } from '../redux/slices/authSlice';

const Auth = () => {
  const isMobileView = useMediaQuery('(max-width: 600px)');
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useSelector((state) => state?.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
  } = useForm({ mode: 'onChange' });

  const toggleForm = () => {
    setIsLogin((prev) => !prev);
    setStep(0);
  };

  const nextStep = async () => {
    let isValid = false;

    if (step === 0) {
      isValid = await trigger(['name', 'email']);
    } else if (step === 1) {
      isValid = await trigger(['password']);
    } else if (step === 2) {
      isValid = await trigger(['phoneNumber']);
    } else if (step === 3) {
      isValid = await trigger(['title']);
    }

    if (isValid) {
      setStep((prev) => prev + 1);
    } else {
      showSnackbar('Please fill all required fields correctly', 'error');
    }
  };

  const prevStep = () => setStep((prev) => prev - 1);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const submitHandler = async (data) => {
    try {
      setIsLoading(true);

      if (isLogin) {
        const response = await api.post('/users/login', {
          email: data.email,
          password: data.password,
        });

        const { accessToken, user } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('userInfo', JSON.stringify(user));
        dispatch(login({ token: accessToken, user }));
      } else {
        await api.post('/users/register', {
          name: data.name,
          email: data.email,
          password: data.password,
          phoneNumber: data.phoneNumber,
          title: data.title,
        });

        showSnackbar('Registration successful! You can now log in.');
        setIsLogin(true);
      }
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'An error occurred.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      setTimeout(() => {
        navigate('/dashboard', { state: { showSnackbar: true } });
        setTimeout(() => setIsLoading(false), 500);
      }, 1500);
    }
  }, [user, navigate]);

  return (
    <Box sx={{
      width: '100%',
      height: '100vh',
      overflow: 'auto',
      display: 'flex',
      flexDirection: isMobileView ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#121212',
      px: { xs: 4, md: 18 },
      py: { xs: 4, md: 6 },
    }}>
      {isLoading && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999,
        }}>
          <HashLoader color="#4e73df" size={80} />
        </Box>
      )}

      <Box sx={{
        width: '100%',
        height: isMobileView ? 'max-content' : undefined,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'center',
        justifyContent: isMobileView ? 'start' : 'start',
      }}>
        {/* Branding section */}
        <Box sx={{
          // flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: isMobileView ? "32px 0" : 4,
          textAlign: 'center',
          width: isMobileView ? '100%' : '50%',
          height: isMobileView ? 'max-content' : '100%',
        }}>
          <Typography variant="h2" sx={{
            height: isMobileView ? '100%' : 'auto',
            fontWeight: 800,
            color: '#4e73df',
            fontSize: { xs: '24px', md: '48px' },
            lineHeight: 1.2,
          }}>
            Cloud-Based Task Manager
          </Typography>
        </Box>


        {/* Form section */}
        <Paper elevation={6} sx={{
          flex: isMobileView ? 1 : 'none',
          width: { xs: '100%', sm: '450px' },
          backgroundColor: '#1e1e1e',
          borderRadius: 2,
          border: '1px solid #333',
          overflow: 'auto',
        }}>
          <Box sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            // height: '100%',
          }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" sx={{
                fontWeight: 700,
                color: '#ffffff',
                mb: 1,
              }}>
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#9e9e9e' }}>
                {isLogin ? 'Sign in to continue' : `Step ${step + 1} of 4`}
              </Typography>
            </Box>

            <Divider sx={{ width: '100%', backgroundColor: '#333', mb: 4 }} />

            <Box component="form" onSubmit={handleSubmit(submitHandler)} sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Login form fields */}
                {isLogin && (
                  <>
                    <TextField
                      placeholder="email@example.com"
                      type="email"
                      label="Email Address"
                      variant="outlined"
                      fullWidth
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address'
                        }
                      })}
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: '#444',
                          },
                          '&:hover fieldset': {
                            borderColor: '#555',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#4e73df',
                          },
                          color: '#ffffff',
                          '& input:-webkit-autofill': {
                            WebkitBoxShadow: '0 0 0 100px #1e1e1e inset',
                            WebkitTextFillColor: '#ffffff',
                            caretColor: '#ffffff',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: '#9e9e9e',
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: '#4e73df',
                        },
                      }}
                    />

                    <TextField
                      placeholder="••••••••"
                      type={showPassword ? 'text' : 'password'}
                      label="Password"
                      variant="outlined"
                      fullWidth
                      {...register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 6,
                          message: 'Password must be at least 6 characters'
                        }
                      })}
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={togglePasswordVisibility}
                              edge="end"
                              sx={{ color: '#9e9e9e' }}
                            >
                              {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: '#444',
                          },
                          '&:hover fieldset': {
                            borderColor: '#555',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#4e73df',
                          },
                          color: '#ffffff',
                        },
                        '& .MuiInputLabel-root': {
                          color: '#9e9e9e',
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: '#4e73df',
                        },
                      }}
                    />
                  </>
                )}

                {/* Registration form fields - step by step */}
                {!isLogin && (
                  <>
                    {/* Step 0: Name and Email */}
                    {step === 0 && (
                      <>
                        <TextField
                          placeholder="John Doe"
                          type="text"
                          label="Full Name"
                          variant="outlined"
                          fullWidth
                          {...register('name', {
                            required: 'Name is required',
                            minLength: {
                              value: 2,
                              message: 'Name must be at least 2 characters'
                            }
                          })}
                          error={!!errors.name}
                          helperText={errors.name?.message}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#444',
                              },
                              '&:hover fieldset': {
                                borderColor: '#555',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#4e73df',
                              },
                              color: '#ffffff',
                              '& input:-webkit-autofill': {
                                WebkitBoxShadow: '0 0 0 100px #1e1e1e inset',
                                WebkitTextFillColor: '#ffffff',
                                caretColor: '#ffffff',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#9e9e9e',
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                              color: '#4e73df',
                            },
                          }}
                        />

                        <TextField
                          placeholder="email@example.com"
                          type="email"
                          label="Email Address"
                          variant="outlined"
                          fullWidth
                          {...register('email', {
                            required: 'Email is required',
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: 'Invalid email address'
                            }
                          })}
                          error={!!errors.email}
                          helperText={errors.email?.message}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#444',
                              },
                              '&:hover fieldset': {
                                borderColor: '#555',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#4e73df',
                              },
                              color: '#ffffff',
                              '& input:-webkit-autofill': {
                                WebkitBoxShadow: '0 0 0 100px #1e1e1e inset',
                                WebkitTextFillColor: '#ffffff',
                                caretColor: '#ffffff',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#9e9e9e',
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                              color: '#4e73df',
                            },
                          }}
                        />
                      </>
                    )}

                    {/* Step 1: Password */}
                    {step === 1 && (
                      <TextField
                        placeholder="••••••••"
                        type={showPassword ? 'text' : 'password'}
                        label="Password"
                        variant="outlined"
                        fullWidth
                        {...register('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters'
                          }
                        })}
                        error={!!errors.password}
                        helperText={errors.password?.message}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={togglePasswordVisibility}
                                edge="end"
                                sx={{ color: '#9e9e9e' }}
                              >
                                {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: '#444',
                            },
                            '&:hover fieldset': {
                              borderColor: '#555',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#4e73df',
                            },
                            color: '#ffffff',
                          },
                          '& .MuiInputLabel-root': {
                            color: '#9e9e9e',
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: '#4e73df',
                          },
                        }}
                      />
                    )}

                    {/* Step 2: Phone Number */}
                    {step === 2 && (
                      <TextField
                        placeholder="+1234567890"
                        type="tel"
                        label="Phone Number"
                        variant="outlined"
                        fullWidth
                        {...register('phoneNumber', {
                          required: 'Phone number is required',
                          pattern: {
                            value: /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/,
                            message: 'Invalid phone number'
                          }
                        })}
                        error={!!errors.phoneNumber}
                        helperText={errors.phoneNumber?.message}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: '#444',
                            },
                            '&:hover fieldset': {
                              borderColor: '#555',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#4e73df',
                            },
                            color: '#ffffff',
                            '& input:-webkit-autofill': {
                              WebkitBoxShadow: '0 0 0 100px #1e1e1e inset',
                              WebkitTextFillColor: '#ffffff',
                              caretColor: '#ffffff',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: '#9e9e9e',
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: '#4e73df',
                          },
                        }}
                      />
                    )}

                    {/* Step 3: Job Title */}
                    {step === 3 && (
                      <TextField
                        placeholder="Software Developer"
                        type="text"
                        label="Job Title"
                        variant="outlined"
                        fullWidth
                        {...register('title', {
                          required: 'Job title is required',
                          minLength: {
                            value: 2,
                            message: 'Title must be at least 2 characters'
                          }
                        })}
                        error={!!errors.title}
                        helperText={errors.title?.message}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: '#444',
                            },
                            '&:hover fieldset': {
                              borderColor: '#555',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#4e73df',
                            },
                            color: '#ffffff',
                            '& input:-webkit-autofill': {
                              WebkitBoxShadow: '0 0 0 100px #1e1e1e inset',
                              WebkitTextFillColor: '#ffffff',
                              caretColor: '#ffffff',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: '#9e9e9e',
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: '#4e73df',
                          },
                        }}
                      />
                    )}
                  </>
                )}

                <Box sx={{ display: 'flex', gap: 2 }}>
                  {!isLogin && step > 0 && (
                    <Button
                      fullWidth
                      variant="outlined"
                      color="secondary"
                      onClick={prevStep}
                      sx={{
                        py: 1.5,
                        color: '#ffffff',
                        borderColor: '#444',
                        '&:hover': {
                          borderColor: '#555',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        }
                      }}
                    >
                      Back
                    </Button>
                  )}
                  {!isLogin && step < 3 && (
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      onClick={nextStep}
                      sx={{
                        py: 1.5,
                        backgroundColor: '#4e73df',
                        '&:hover': {
                          backgroundColor: '#3b5ab5',
                        }
                      }}
                    >
                      Next
                    </Button>
                  )}
                  {(isLogin || step === 3) && (
                    <Button
                      fullWidth
                      type="submit"
                      variant="contained"
                      color="primary"
                      startIcon={isLogin ? <MdLogin /> : <MdPersonAdd />}
                      sx={{
                        py: 1.5,
                        backgroundColor: '#4e73df',
                        '&:hover': {
                          backgroundColor: '#3b5ab5',
                        }
                      }}
                    >
                      {isLogin ? 'Sign In' : 'Register'}
                    </Button>
                  )}
                </Box>

                <Divider sx={{ backgroundColor: '#333', my: 1 }} />

                <Button
                  fullWidth
                  variant="text"
                  onClick={toggleForm}
                  sx={{
                    color: '#9e9e9e',
                    '&:hover': {
                      color: '#ffffff',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    }
                  }}
                >
                  {isLogin ? 'Need an account? Register' : 'Already have an account? Sign In'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Auth;
