import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Alert, Snackbar, Box, IconButton, TextField, InputAdornment, CircularProgress } from '@mui/material';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import AuthShell, { FieldLabel } from '../components/shell/AuthShell';
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
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, token, navigate]);

  return (
    <AuthShell
      title="Sign in to QOps Tracker"
      description="Welcome back. Sign in with your work email to continue."
    >
      <Box component="form" noValidate onSubmit={handleSubmit(submitHandler)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FieldLabel htmlFor="email" label="Email address">
          <TextField
            id="email"
            fullWidth
            autoComplete="email"
            autoFocus
            placeholder="name@company.com"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
        </FieldLabel>
        <FieldLabel htmlFor="password" label="Password">
          <TextField
            id="password"
            fullWidth
            autoComplete="current-password"
            type={showPassword ? 'text' : 'password'}
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters'
              }
            })}
            error={!!errors.password}
            helperText={errors.password?.message}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={togglePasswordVisibility} aria-label={showPassword ? 'Hide password' : 'Show password'} edge="end" sx={{ color: 'var(--text-muted)' }}>
                      {showPassword ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </FieldLabel>
        <Button type="submit" variant="contained" size="large" fullWidth disabled={isLoading} sx={{ mt: 0.5 }}>
          {isLoading ? <CircularProgress size={18} sx={{ color: 'var(--on-accent)' }} /> : 'Continue'}
        </Button>
      </Box>

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
    </AuthShell>
  );
};

export default Auth;
