import { useState } from "react";
import {
  Menu,
  MenuItem,
  Button,
  Typography,
  Divider,
  Box,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select
} from "@mui/material";
import { RiFileCopyLine } from "react-icons/ri";
import { useDispatch, useSelector } from "react-redux";
import { getInitials } from "../utils/helpers";
import { logout } from "../redux/slices/authSlice";
import { useNavigate } from "react-router-dom";
import { HashLoader } from "react-spinners";
import { useForm } from "react-hook-form";
import api from "../api/api";

// Style constants
const menuStyles = {
  '& .MuiPaper-root': {
    backgroundColor: '#1e1e1e',
    color: '#ffffff',
    width: '300px',
    borderRadius: '8px',
    border: '1px solid #444',
    boxShadow: 'none',
  },
  '& .MuiMenuItem-root': {
    '&:hover': {
      backgroundColor: '#2a2a2a',
    },
  },
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

const formControlStyles = {
  '& .MuiInputBase-root': {
    color: '#ffffff',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#444',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#666',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#1976d2',
  },
};

const selectStyles = {
  '& .MuiSelect-icon': {
    color: '#aaaaaa',
  },
};

const menuItemStyles = {
  color: '#ffffff',
  backgroundColor: '#1e1e1e',
  '&:hover': {
    backgroundColor: '#2a2a2a',
  },
  '&.Mui-selected': {
    backgroundColor: '#1976d2',
    '&:hover': {
      backgroundColor: '#1565c0',
    },
  },
};

const buttonStyles = {
  color: '#ffffff',
  backgroundColor: '#1976d2',
  '&:hover': {
    backgroundColor: '#1565c0',
  },
};

const cancelButtonStyles = {
  color: '#ffffff',
  backgroundColor: '#555',
  '&:hover': {
    backgroundColor: '#666',
  },
};

// New Dialog Component for Suggestions
const SuggestionDialog = ({ open, onClose, userId }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Updated input label styles
  const inputLabelStyles = {
    color: '#aaaaaa',
    '&.Mui-focused': {
      color: '#1976d2',
      backgroundColor: '#1e1e1e',
      padding: '0 8px',
      transform: 'translate(14px, -9px) scale(0.75)',
    },
    '&.MuiFormLabel-filled': {
      backgroundColor: '#1e1e1e',
      padding: '0 8px',
      transform: 'translate(14px, -9px) scale(0.75)',
    },
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await api.post('/suggestions', {
        ...data,
        userId,
        status: 'pending'
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      setSubmitSuccess(true);
      reset();
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to submit suggestion:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: '#1e1e1e',
          boxShadow: 'none',
          borderRadius: '8px',
        }
      }}
    >
      <DialogTitle sx={{
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        borderBottom: '1px solid #444',
        padding: '16px 24px',
      }}>
        <Typography variant="h6" component="div">
          User Experience Feedback
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        padding: '20px 24px',
      }}>
        {submitSuccess ? (
          <Typography color="#4caf50" sx={{ py: 2 }}>
            Thank you for your suggestion! We&apos;ll review it soon.
          </Typography>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <Box sx={{ '& > *:not(:last-child)': { mb: 2 } }}>
              <FormControl fullWidth>
                <TextField
                  label="Title"
                  variant="outlined"
                  {...register("title", { required: "Title is required" })}
                  error={!!errors.title}
                  helperText={errors.title?.message}
                  sx={textFieldStyles}
                  InputLabelProps={{
                    sx: inputLabelStyles
                  }}
                />
              </FormControl>

              <FormControl fullWidth>
                <TextField
                  label="Description"
                  variant="outlined"
                  multiline
                  rows={4}
                  {...register("description", { required: "Description is required" })}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  sx={textFieldStyles}
                  InputLabelProps={{
                    sx: inputLabelStyles
                  }}
                />
              </FormControl>

              <FormControl fullWidth sx={formControlStyles}>
                <InputLabel sx={inputLabelStyles}>Category</InputLabel>
                <Select
                  variant="outlined"
                  {...register("category", { required: "Category is required" })}
                  error={!!errors.category}
                  sx={selectStyles}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        backgroundColor: '#1e1e1e',
                        color: '#ffffff',
                        '& .MuiMenuItem-root': menuItemStyles,
                      },
                    },
                  }}
                >
                  <MenuItem value="bug" sx={menuItemStyles}>Bug Report</MenuItem>
                  <MenuItem value="improvement" sx={menuItemStyles}>Improvement Suggestion</MenuItem>
                  <MenuItem value="feature" sx={menuItemStyles}>Feature Request</MenuItem>
                  <MenuItem value="other" sx={menuItemStyles}>Other</MenuItem>
                </Select>
                {errors.category && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                    {errors.category.message}
                  </Typography>
                )}
              </FormControl>
            </Box>
          </form>
        )}
      </DialogContent>

      <DialogActions sx={{
        backgroundColor: '#1e1e1e',
        borderTop: '1px solid #444',
        padding: '12px 24px',
      }}>
        {!submitSuccess && (
          <>
            <Button onClick={onClose} sx={cancelButtonStyles}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              variant="contained"
              disabled={isSubmitting}
              sx={buttonStyles}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </>
        )}
        {submitSuccess && (
          <Button onClick={onClose} sx={buttonStyles}>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const UserAvatar = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const logoutHandler = async () => {
    handleClose();
    setIsLoggingOut(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userInfo");
      dispatch(logout());
      navigate("/auth");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleProfileNavigation = () => {
    navigate("/profile");
  };

  const handleChangePasswordNavigation = () => {
    navigate("/change-password");
  };

  const handleOpenSuggestionDialog = () => {
    handleClose();
    setSuggestionDialogOpen(true);
  };

  const accountId = user._id;

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(accountId)
      .then(() => {
        alert("Account ID copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  return (
    <>
      {/* HashLoader for logout */}
      {isLoggingOut && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#121212] bg-opacity-90 z-50">
          <HashLoader color="#1976d2" size={60} />
        </div>
      )}

      {/* Suggestion Dialog */}
      <SuggestionDialog
        open={suggestionDialogOpen}
        onClose={() => setSuggestionDialogOpen(false)}
        userId={accountId}
      />

      {/* Avatar Button */}
      <Button
        onClick={handleClick}
        disableRipple
        sx={{
          height: "55px",
          minWidth: 0,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "end",
          "&:hover": { backgroundColor: "transparent" },
        }}
      >
        <Box
          sx={{
            color: "white",
            fontWeight: "bold",
            fontSize: "12px",
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            backgroundColor: "#795548",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {getInitials(user?.name)}
        </Box>
      </Button>

      {/* Dropdown Menu */}
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={menuStyles}
      >
        {/* Account ID Section */}
        <MenuItem
          disableRipple
          disableTouchRipple
          sx={{
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 1,
            py: 2,
            px: 3,
            "&:hover": { backgroundColor: "#2a2a2a" },
          }}
        >
          <Typography variant="body2" sx={{ color: "#9e9e9e" }}>
            Account ID
          </Typography>
          <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title="Copy to clipboard">
              <RiFileCopyLine color="#1976d2" size={20} style={{ cursor: "pointer" }} onClick={copyToClipboard} />
            </Tooltip>
            {accountId}
          </Typography>
        </MenuItem>

        <Divider sx={{ backgroundColor: "#444", my: 1 }} />

        {/* Profile and Change Password */}
        <MenuItem
          onClick={() => {
            handleClose();
            handleProfileNavigation();
          }}
          sx={{
            py: 1,
            px: 3,
            "&:hover": { backgroundColor: "#2a2a2a", color: "#1976d2" },
          }}
        >
          Profile
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleClose();
            handleChangePasswordNavigation();
          }}
          sx={{
            py: 1,
            px: 3,
            "&:hover": { backgroundColor: "#2a2a2a", color: "#1976d2" },
          }}
        >
          Change Password
        </MenuItem>

        {/* New Suggestion Menu Item */}
        {user.role === "Member" && [
          <Divider key="divider" sx={{ backgroundColor: "#444", my: 1 }} />,
          <MenuItem
            key="suggest-improvement"
            onClick={handleOpenSuggestionDialog}
            sx={{
              py: 1,
              px: 3,
              "&:hover": { backgroundColor: "#2a2a2a", color: "#1976d2" },
            }}
          >
            User Experience Feedback
          </MenuItem>,
        ]}

        <Divider sx={{ backgroundColor: "#444", my: 1 }} />

        {/* Logout Section */}
        <MenuItem
          onClick={logoutHandler}
          sx={{
            py: 1,
            px: 3,
            display: "flex",
            justifyContent: "flex-end",
            "&:hover": { backgroundColor: "#2a2a2a" },
          }}
        >
          <Button
            sx={{
              fontWeight: "bold",
              color: "#ff6b6b",
              "&:hover": { color: "#ff3b3b" },
            }}
          >
            Logout
          </Button>
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserAvatar;