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
      backgroundColor: '#0d1117',
      p: 2,
    }}>
      <Container maxWidth="xs">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 600,
              color: '#c9d1d9',
              mb: 1,
            }}
          >
            QOps Tracker
          </Typography>
          <Typography variant="body2" sx={{ color: '#8b949e' }}>
            Sign in to your account
          </Typography>
        </Box>

        <Paper elevation={0} sx={{
          bgcolor: '#0c0f13',
          borderRadius: '6px',
          border: '1px solid #30363d',
          p: 4,
          width: '100%',
        }}>
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
                    backgroundColor: '#0d1117',
                    '& fieldset': {
                      borderColor: '#30363d',
                    },
                    '&:hover fieldset': {
                      borderColor: '#58a6ff',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#58a6ff',
                    },
                    color: '#c9d1d9',
                    '& input': {
                      caretColor: '#58a6ff', // Changed to camelCase
                    },
                    // These target the dropdown and selection
                    '& input:-webkit-autofill': {
                      WebkitBoxShadow: '0 0 0 100px #0d1117 inset !important', // Changed to camelCase
                      WebkitTextFillColor: '#c9d1d9 !important', // Changed to camelCase
                    },
                    '& input:-internal-autofill-selected': {
                      backgroundColor: '#0d1117 !important',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#8b949e',
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
                    backgroundColor: '#0d1117',
                    '& fieldset': {
                      borderColor: '#30363d',
                    },
                    '&:hover fieldset': {
                      borderColor: '#58a6ff',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#58a6ff',
                    },
                    color: '#c9d1d9',
                    '& input': {
                      caretColor: '#58a6ff', // ✅ Fixed to camelCase
                    },
                    // These target the dropdown and selection
                    '& input:-webkit-autofill': {
                      WebkitBoxShadow: '0 0 0 100px #0d1117 inset !important', // ✅ Fixed
                      WebkitTextFillColor: '#c9d1d9 !important', // ✅ Fixed
                    },
                    '& input:-internal-autofill-selected': {
                      backgroundColor: '#0d1117 !important',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#8b949e',
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
                  py: 1.5,
                  backgroundColor: '#1a1556',
                  '&:hover': {
                    backgroundColor: '#1a1556',
                  },
                  '&:disabled': {
                    backgroundColor: '#1a1556',
                    opacity: 0.7,
                  },
                  fontWeight: 600,
                  textTransform: 'none',
                  position: 'relative',
                }}
              >
                {isLoading ? (
                  <>
                    <CircularProgress
                      size={24}
                      sx={{
                        color: '#ffffff',
                        position: 'absolute',
                        left: '50%',
                        marginLeft: '-12px',
                      }}
                    />
                    <span style={{ opacity: 0 }}>Sign in</span>
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </Box>
          </Box>
        </Paper>
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