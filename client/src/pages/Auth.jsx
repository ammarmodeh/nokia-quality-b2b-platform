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
  IconButton,
  TextField,
  InputAdornment,
  useMediaQuery,
  Container,
  Paper,
  CircularProgress
} from '@mui/material';
import { MdVisibility, MdVisibilityOff, MdLogin } from 'react-icons/md';
import api from '../api/api';
import { login } from '../redux/slices/authSlice';

const Auth = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [welcomeSnackbar, setWelcomeSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { user, token } = useSelector((state) => state?.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ mode: 'onChange' });

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

  const handleWelcomeSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setWelcomeSnackbar(prev => ({ ...prev, open: false }));
  };

  const showWelcomeSnackbar = (message, severity = 'success') => {
    setWelcomeSnackbar({ open: true, message, severity });
  };

  const submitHandler = async (data) => {
    try {
      setIsLoading(true);

      const response = await api.post('/users/login', {
        email: data.email,
        password: data.password,
      });

      const { accessToken, user } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('userInfo', JSON.stringify(user));
      dispatch(login({ token: accessToken, user }));

      // Show login success immediately
      showSnackbar('Login successful!', 'success');

      // Show welcome message after 1.5 seconds
      setTimeout(() => {
        showWelcomeSnackbar(`Welcome back, ${user.name || user.email}!`, 'success');
      }, 1500);

    } catch (error) {
      // Error handling remains the same
      let errorMessage = 'An error occurred during login.';
      if (error.response) {
        errorMessage = error.response.data?.message ||
          error.response.data?.error ||
          error.response.statusText ||
          'Invalid email or password';
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      }
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      // Redirect after showing both messages (total ~3.5 seconds)
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [user, token, navigate]);

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      backgroundImage: 'url("/login_bg.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(13, 17, 23, 0.7)',
        backdropFilter: 'blur(4px)',
      },
      p: 2,
    }}>
      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Box sx={{ display: 'inline-flex', p: 1.5, borderRadius: '16px', background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', mb: 2, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <img src="/11319783.png" alt="Logo" style={{ width: '48px', height: '48px' }} />
          </Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              fontFamily: 'Outfit, sans-serif',
              background: 'linear-gradient(135deg, #ffffff 0%, #8b949e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
              letterSpacing: '-0.5px'
            }}
          >
            QOps Tracker
          </Typography>
          <Typography variant="body1" sx={{ color: '#8b949e', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
            Management Portal
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            background: 'rgba(12, 15, 19, 0.6)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            p: 4,
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <Box component="form" onSubmit={handleSubmit(submitHandler)} sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Email Address"
                variant="outlined"
                fullWidth
                autoComplete="email"
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
                    backgroundColor: 'rgba(13, 17, 23, 0.4)',
                    borderRadius: '12px',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(88, 166, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#58a6ff',
                      borderWidth: '2px',
                    },
                    color: '#c9d1d9',
                    fontFamily: 'Inter, sans-serif',
                    '& input': {
                      caretColor: '#58a6ff',
                    },
                    '& input:-webkit-autofill': {
                      WebkitBoxShadow: '0 0 0 100px rgba(13, 17, 23, 0.9) inset !important',
                      WebkitTextFillColor: '#c9d1d9 !important',
                    },
                    '& input:-internal-autofill-selected': {
                      backgroundColor: 'rgba(13, 17, 23, 0.9) !important',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#8b949e',
                    fontFamily: 'Inter, sans-serif',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#58a6ff',
                  },
                  '& .MuiFormHelperText-root': {
                    color: '#8b949e',
                  },
                }}
              />

              <TextField
                type={showPassword ? 'text' : 'password'}
                label="Password"
                variant="outlined"
                fullWidth
                autoComplete="current-password"
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
                        sx={{ color: '#8b949e' }}
                      >
                        {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(13, 17, 23, 0.4)',
                    borderRadius: '12px',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(88, 166, 255, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#58a6ff',
                      borderWidth: '2px',
                    },
                    color: '#c9d1d9',
                    fontFamily: 'Inter, sans-serif',
                    '& input': {
                      caretColor: '#58a6ff',
                    },
                    '& input:-webkit-autofill': {
                      WebkitBoxShadow: '0 0 0 100px rgba(13, 17, 23, 0.9) inset !important',
                      WebkitTextFillColor: '#c9d1d9 !important',
                    },
                    '& input:-internal-autofill-selected': {
                      backgroundColor: 'rgba(13, 17, 23, 0.9) !important',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#8b949e',
                    fontFamily: 'Inter, sans-serif',
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#58a6ff',
                  },
                  '& .MuiFormHelperText-root': {
                    color: '#8b949e',
                  },
                }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{
                  py: 1.8,
                  borderRadius: '12px',
                  backgroundColor: '#238636',
                  '&:hover': {
                    backgroundColor: '#2ea043',
                    boxShadow: '0 0 20px rgba(46, 160, 67, 0.4)',
                  },
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 700,
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.3s ease',
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} sx={{ color: '#ffffff' }} />
                ) : (
                  'Sign into Dashboard'
                )}
              </Button>
            </Box>
          </Box>
        </Paper>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            onClick={() => navigate('/audit/login')}
            sx={{
              color: '#8b949e',
              textTransform: 'none',
              fontFamily: 'Inter, sans-serif',
              '&:hover': { color: '#58a6ff', background: 'transparent' },
            }}
          >
            Access Auditor Portal →
          </Button>
        </Box>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={1500}  // Matches our delay before welcome message
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

      <Snackbar
        open={welcomeSnackbar.open}
        autoHideDuration={2000}  // Shows for 2 seconds before redirect
        onClose={handleWelcomeSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleWelcomeSnackbarClose}
          severity={welcomeSnackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {welcomeSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Auth;