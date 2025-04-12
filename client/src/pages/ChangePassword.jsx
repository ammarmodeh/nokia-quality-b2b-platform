import { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { logout } from "../redux/slices/authSlice";
import {
  Box,
  Typography,
  TextField,
  Button as MuiButton,
  Snackbar,
  Alert,
  Divider,
  InputAdornment,
  IconButton,
  useMediaQuery,
  useTheme
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Verified as VerifiedIcon,
  ArrowBack as ArrowBackIcon
} from "@mui/icons-material";
import { HashLoader } from "react-spinners";

const ChangePassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [showPassword, setShowPassword] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const newPassword = watch("newPassword", "");

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const submitHandler = async (data) => {
    setLoading(true);
    try {
      const response = await api.post("/users/change-password",
        { oldPassword: data.oldPassword, newPassword: data.newPassword },
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );

      if (response.data.message === "Password changed successfully") {
        setSnackbarMessage(response.data.message);
        setSnackbarSeverity("success");
        setOpenSnackbar(true);

        setTimeout(() => {
          dispatch(logout());
          navigate("/auth");
        }, 1500);
      }
    } catch (error) {
      setSnackbarMessage(error.response?.data?.message || "An error occurred");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  // Style constants
  const textFieldStyles = {
    '& .MuiInputBase-root': {
      color: '#ffffff',
    },
    '& .MuiInputLabel-root': {
      color: '#aaaaaa',
    },
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: '#444',
      },
      '&:hover fieldset': {
        borderColor: '#666',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#1976d2',
      },
    },
    '& .MuiFormHelperText-root': {
      color: '#aaaaaa',
    },
  };

  const buttonStyles = {
    backgroundColor: '#1976d2',
    color: '#ffffff',
    fontWeight: 'bold',
    '&:hover': {
      backgroundColor: '#1565c0',
    },
    '&:disabled': {
      backgroundColor: '#555',
      color: '#999'
    }
  };

  const cancelButtonStyles = {
    color: '#ffffff',
    backgroundColor: '#555',
    fontWeight: 'bold',
    '&:hover': {
      backgroundColor: '#666',
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#121212',
        p: isMobile ? 0 : 2
      }}
    >
      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 1300
          }}
        >
          <HashLoader color="#1976d2" size={80} />
        </Box>
      )}

      <Box
        sx={{
          width: '100%',
          height: isMobile ? '100vh' : 'auto',
          maxWidth: isMobile ? '100%' : '450px',
          backgroundColor: '#1e1e1e',
          borderRadius: isMobile ? 0 : '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          border: isMobile ? 'none' : '1px solid #333',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ p: isMobile ? '16px' : '24px', flex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <MuiButton
              startIcon={<ArrowBackIcon />}
              onClick={handleBackClick}
              sx={{ color: '#ffffff' }}
            >
              {isMobile ? '' : 'Back'}
            </MuiButton>
          </Box>

          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LockIcon sx={{
              fontSize: isMobile ? 40 : 50,
              color: '#1976d2',
              mb: 1
            }} />
            <Typography
              variant={isMobile ? 'h6' : 'h5'}
              component="h1"
              sx={{ color: '#ffffff', fontWeight: 'bold' }}
            >
              Change Password
            </Typography>
            <Typography
              variant={isMobile ? 'body2' : 'body1'}
              sx={{ color: '#aaaaaa', mt: 1 }}
            >
              Secure your account with a new password
            </Typography>
          </Box>

          <Divider sx={{ borderColor: '#333', mb: 3 }} />

          <Box
            component="form"
            onSubmit={handleSubmit(submitHandler)}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
          >
            <TextField
              label="Current Password"
              type={showPassword.oldPassword ? 'text' : 'password'}
              variant="outlined"
              fullWidth
              {...register("oldPassword", {
                required: "Current password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters"
                }
              })}
              error={!!errors.oldPassword}
              helperText={errors.oldPassword?.message}
              sx={textFieldStyles}
              size={isMobile ? 'small' : 'medium'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ color: '#666' }}>
                    <LockIcon fontSize={isMobile ? 'small' : 'medium'} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('oldPassword')}
                      edge="end"
                      sx={{ color: '#666' }}
                      size={isMobile ? 'small' : 'medium'}
                    >
                      {showPassword.oldPassword ? <VisibilityOff fontSize={isMobile ? 'small' : 'medium'} /> : <Visibility fontSize={isMobile ? 'small' : 'medium'} />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <TextField
              label="New Password"
              type={showPassword.newPassword ? 'text' : 'password'}
              variant="outlined"
              fullWidth
              {...register("newPassword", {
                required: "New password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters"
                },
                validate: {
                  hasNumber: value => /\d/.test(value) || "Should contain at least one number",
                  hasSpecialChar: value => /[!@#$%^&*(),.?":{}|<>]/.test(value) || "Should contain at least one special character"
                }
              })}
              error={!!errors.newPassword}
              helperText={errors.newPassword?.message}
              sx={textFieldStyles}
              size={isMobile ? 'small' : 'medium'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ color: '#666' }}>
                    <LockOpenIcon fontSize={isMobile ? 'small' : 'medium'} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('newPassword')}
                      edge="end"
                      sx={{ color: '#666' }}
                      size={isMobile ? 'small' : 'medium'}
                    >
                      {showPassword.newPassword ? <VisibilityOff fontSize={isMobile ? 'small' : 'medium'} /> : <Visibility fontSize={isMobile ? 'small' : 'medium'} />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <TextField
              label="Confirm New Password"
              type={showPassword.confirmPassword ? 'text' : 'password'}
              variant="outlined"
              fullWidth
              {...register("confirmPassword", {
                required: "Please confirm your new password",
                validate: value => value === newPassword || "Passwords do not match"
              })}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              sx={textFieldStyles}
              size={isMobile ? 'small' : 'medium'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ color: '#666' }}>
                    <VerifiedIcon fontSize={isMobile ? 'small' : 'medium'} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('confirmPassword')}
                      edge="end"
                      sx={{ color: '#666' }}
                      size={isMobile ? 'small' : 'medium'}
                    >
                      {showPassword.confirmPassword ? <VisibilityOff fontSize={isMobile ? 'small' : 'medium'} /> : <Visibility fontSize={isMobile ? 'small' : 'medium'} />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <MuiButton
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={buttonStyles}
              startIcon={<LockIcon />}
              size={isMobile ? 'small' : 'medium'}
            >
              {loading ? 'Updating...' : 'Change Password'}
            </MuiButton>
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          bottom: { xs: 70, sm: 24 }
        }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          variant="filled"
          sx={{
            width: '100%',
            backgroundColor: snackbarSeverity === 'success' ? '#1976d2' : '#d32f2f',
            color: '#ffffff',
            '& .MuiAlert-icon': {
              color: '#ffffff'
            }
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChangePassword;