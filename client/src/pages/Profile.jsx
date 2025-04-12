import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { logout, updateUser } from "../redux/slices/authSlice";
import {
  Box,
  Typography,
  TextField,
  Button as MuiButton,
  Snackbar,
  Alert,
  Divider,
  Avatar,
  IconButton,
  InputAdornment,
  useMediaQuery,
  useTheme
} from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon
} from "@mui/icons-material";
import { HashLoader } from "react-spinners";
import { getInitials } from "../utils/helpers";

const Profile = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [editMode, setEditMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
      title: user?.title || "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        title: user.title
      });
    }
  }, [user, reset]);

  const toggleEditMode = () => {
    setEditMode(!editMode);
    if (!editMode) {
      reset({
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        title: user.title
      });
    }
    setTempPassword("");
  };

  const cancelEdit = () => {
    reset({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      title: user.title
    });
    setEditMode(false);
    setTempPassword("");
  };

  const submitHandler = async (data) => {
    if (!tempPassword) {
      setSnackbarMessage("Please enter your password to confirm changes");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        ...data,
        password: tempPassword
      };

      const response = await api.put("/users/profile", requestData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });

      const updatedUser = response.data;

      console.log({ updatedUser });

      // Only perform these actions if the profile is successfully updated
      dispatch(updateUser(updatedUser));

      setSnackbarMessage("Profile updated successfully! You will be logged out shortly.");
      setSnackbarSeverity("success");
      setOpenSnackbar(true);
      setEditMode(false);
      setTempPassword("");

      setTimeout(() => {
        dispatch(logout());
        navigate('/auth');
      }, 1500);

    } catch (error) {
      let errorMessage = "Failed to update profile";

      if (error.response) {
        // The request was made and the server responded with a status code
        if (error.response.status === 401) {
          errorMessage = "Invalid password. Please try again.";
        } else if (error.response.status === 400) {
          errorMessage = error.response.data.message || "Validation error";
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = "No response from server. Please try again later.";
      } else {
        // Something happened in setting up the request
        errorMessage = error.message || "Request setup failed";
      }

      console.error("Error updating profile:", errorMessage);

      setSnackbarMessage(errorMessage);
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

  const textFieldStyles = {
    '& .MuiInputBase-root': {
      color: '#ffffff',
    },
    '& .MuiInputLabel-root': {
      color: '#aaaaaa',
    },
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: editMode ? '#444' : 'transparent',
      },
      '&:hover fieldset': {
        borderColor: editMode ? '#666' : 'transparent',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#1976d2',
      },
      backgroundColor: editMode ? '#252525' : 'transparent',
      borderRadius: '4px',
    },
    '& .MuiFormHelperText-root': {
      color: '#aaaaaa',
    },
    '& .Mui-disabled': {
      WebkitTextFillColor: '#ffffff !important',
    }
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
    },
    "& span": {
      mr: 0
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'transparent',
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
          maxWidth: isMobile ? '100%' : '600px',
          backgroundColor: '#1e1e1e',
          borderRadius: isMobile ? 0 : '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          border: isMobile ? 'none' : '1px solid #333',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{
          p: isMobile ? '16px' : '24px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <MuiButton
              startIcon={<ArrowBackIcon />}
              onClick={handleBackClick}
              sx={{ color: '#ffffff' }}
            >
              {isMobile ? '' : 'Back'}
            </MuiButton>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {editMode ? (
                <>
                  <MuiButton
                    startIcon={<CloseIcon />}
                    onClick={cancelEdit}
                    sx={cancelButtonStyles}
                    size={isMobile ? 'small' : 'medium'}
                  >
                    {isMobile ? '' : 'Cancel'}
                  </MuiButton>
                  <MuiButton
                    startIcon={<SaveIcon />}
                    onClick={handleSubmit(submitHandler)}
                    disabled={!isDirty || loading}
                    sx={buttonStyles}
                    size={isMobile ? 'small' : 'medium'}
                  >
                    {isMobile ? 'Save' : 'Save Changes'}
                  </MuiButton>
                </>
              ) : (
                <MuiButton
                  startIcon={<EditIcon />}
                  onClick={toggleEditMode}
                  sx={buttonStyles}
                  size={isMobile ? 'small' : 'medium'}
                >
                  {isMobile ? 'Edit' : 'Edit Profile'}
                </MuiButton>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Avatar
              sx={{
                width: isMobile ? 80 : 100,
                height: isMobile ? 80 : 100,
                fontSize: isMobile ? 32 : 40,
                backgroundColor: '#1976d2',
                mb: 2
              }}
            >
              {getInitials(user?.name)}
            </Avatar>
            <Typography variant={isMobile ? 'h6' : 'h5'} component="h1" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
              {user?.name}
            </Typography>
            <Typography variant={isMobile ? 'body2' : 'body1'} sx={{ color: '#aaaaaa' }}>
              {user?.title}
            </Typography>
          </Box>

          <Divider sx={{ borderColor: '#333', mb: 3 }} />

          <Box
            component="form"
            onSubmit={handleSubmit(submitHandler)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              flex: 1
            }}
          >
            <TextField
              label="Full Name"
              variant="outlined"
              fullWidth
              disabled={!editMode}
              {...register("name", { required: "Name is required" })}
              error={!!errors.name}
              helperText={errors.name?.message}
              sx={textFieldStyles}
              size={isMobile ? 'small' : 'medium'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ color: '#666' }}>
                    <PersonIcon fontSize={isMobile ? 'small' : 'medium'} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Email Address"
              variant="outlined"
              fullWidth
              disabled={!editMode}
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address"
                }
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={textFieldStyles}
              size={isMobile ? 'small' : 'medium'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ color: '#666' }}>
                    <EmailIcon fontSize={isMobile ? 'small' : 'medium'} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Phone Number"
              variant="outlined"
              fullWidth
              disabled={!editMode}
              {...register("phoneNumber", {
                required: "Phone number is required",
                pattern: {
                  value: /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/,
                  message: "Invalid phone number"
                }
              })}
              error={!!errors.phoneNumber}
              helperText={errors.phoneNumber?.message}
              sx={textFieldStyles}
              size={isMobile ? 'small' : 'medium'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ color: '#666' }}>
                    <PhoneIcon fontSize={isMobile ? 'small' : 'medium'} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Job Title"
              variant="outlined"
              fullWidth
              disabled={!editMode}
              {...register("title", { required: "Job title is required" })}
              error={!!errors.title}
              helperText={errors.title?.message}
              sx={textFieldStyles}
              size={isMobile ? 'small' : 'medium'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ color: '#666' }}>
                    <WorkIcon fontSize={isMobile ? 'small' : 'medium'} />
                  </InputAdornment>
                ),
              }}
            />

            {editMode && (
              <TextField
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                fullWidth
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                required
                sx={textFieldStyles}
                size={isMobile ? 'small' : 'medium'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ color: '#666' }}>
                      <CheckCircleIcon fontSize={isMobile ? 'small' : 'medium'} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#666' }}
                        size={isMobile ? 'small' : 'medium'}
                      >
                        {showPassword ? <VisibilityOffIcon fontSize={isMobile ? 'small' : 'medium'} /> : <VisibilityIcon fontSize={isMobile ? 'small' : 'medium'} />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                helperText="Enter your current password to save changes"
              />
            )}
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
            backgroundColor: snackbarSeverity === 'error' ? '#d32f2f' : '#1976d2',
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

export default Profile;