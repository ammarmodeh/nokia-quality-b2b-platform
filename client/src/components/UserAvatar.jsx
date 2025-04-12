import { useState } from "react";
import {
  Menu,
  MenuItem,
  Typography,
  Divider,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  useTheme,
  useMediaQuery
} from "@mui/material";
import {
  RiUserLine,
  RiLockPasswordLine,
  RiFeedbackLine,
  RiLogoutBoxRLine
} from "react-icons/ri";
import { useDispatch, useSelector } from "react-redux";
import { getInitials, newFormatDate } from "../utils/helpers";
import { logout } from "../redux/slices/authSlice";
import { useNavigate } from "react-router-dom";
import { HashLoader } from "react-spinners";
import { useForm } from "react-hook-form";
import api from "../api/api";
import CopyMenuItem from "./CopyMenuItem";

import {
  Stack,
  Chip,
  IconButton,
  Tooltip
} from "@mui/material";
import {
  FaInfoCircle,
  FaLightbulb,
  FaChevronRight,
  FaArrowLeft,
  FaCopy,
  FaWhatsapp
} from "react-icons/fa";

const SuggestionDialog = ({ open, onClose, userId }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [detailView, setDetailView] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
      setSubmittedData(data);
      setSubmitSuccess(true);
      setDetailView(true);
      reset();
    } catch (error) {
      console.error("Failed to submit suggestion:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (!submittedData) return;

    const suggestionText = formatSuggestionForSharing(submittedData);
    navigator.clipboard.writeText(suggestionText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareOnWhatsApp = () => {
    if (!submittedData) return;

    const suggestionText = formatSuggestionForSharing(submittedData);
    const encodedText = encodeURIComponent(suggestionText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const formatSuggestionForSharing = (data) => {
    return `*Suggestion Details*\n\n` +
      `*Title:* ${data.title}\n` +
      `*Category:* ${formatCategory(data.category)}\n` +
      `*Status:* Pending\n\n` +
      `*Description:*\n${data.description}\n\n` +
      `Submitted on ${newFormatDate(new Date(), 'MMM dd, yyyy')}`;
  };

  const formatCategory = (category) => {
    switch (category) {
      case 'bug': return 'Bug Report';
      case 'improvement': return 'Improvement Suggestion';
      case 'feature': return 'Feature Request';
      case 'other': return 'Other';
      default: return category;
    }
  };

  const handleBackToForm = () => {
    setDetailView(false);
    setSubmitSuccess(false);
    setSubmittedData(null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={isMobile}
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: '#1e1e1e',
          boxShadow: 'none',
          borderRadius: isMobile ? 0 : '8px',
        }
      }}
    >
      {detailView ? (
        <>
          <DialogTitle sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            borderBottom: '1px solid #444',
            padding: isMobile ? '12px 16px' : '16px 24px',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton
                onClick={handleBackToForm}
                size={isMobile ? "small" : "medium"}
                sx={{
                  mr: 1,
                  color: '#3ea6ff',
                  '&:hover': {
                    backgroundColor: 'rgba(62, 166, 255, 0.1)',
                  }
                }}
              >
                <FaArrowLeft fontSize={isMobile ? "14px" : "16px"} />
              </IconButton>
              <Typography variant={isMobile ? "subtitle1" : "h6"} component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FaLightbulb color="#3ea6ff" size={isMobile ? 16 : 20} />
                <Box component="span">Suggestion Details</Box>
              </Typography>
            </Box>
            <Box>
              <Tooltip title={copied ? "Copied!" : "Copy to clipboard"} arrow>
                <IconButton
                  onClick={copyToClipboard}
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    color: '#3ea6ff',
                    '&:hover': {
                      backgroundColor: 'rgba(62, 166, 255, 0.1)',
                    },
                    mr: 1
                  }}
                >
                  <FaCopy fontSize={isMobile ? "14px" : "16px"} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Share via WhatsApp" arrow>
                <IconButton
                  onClick={shareOnWhatsApp}
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    color: '#25D366',
                    '&:hover': {
                      backgroundColor: 'rgba(37, 211, 102, 0.1)',
                    }
                  }}
                >
                  <FaWhatsapp fontSize={isMobile ? "16px" : "18px"} />
                </IconButton>
              </Tooltip>
            </Box>
          </DialogTitle>

          <DialogContent dividers sx={{
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
          }}>
            <Stack spacing={isMobile ? 2 : 3}>
              {/* Title */}
              <Box>
                <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>Title</Typography>
                <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ color: '#ffffff' }}>
                  {submittedData?.title}
                </Typography>
              </Box>

              {/* Category and Status */}
              <Box sx={{ display: 'flex', gap: isMobile ? 2 : 3, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>Category</Typography>
                  <Chip
                    label={formatCategory(submittedData?.category)}
                    size={isMobile ? "small" : "medium"}
                    sx={{
                      backgroundColor: '#333',
                      color: '#ffffff',
                      fontWeight: 500,
                      border: '1px solid #3ea6ff'
                    }}
                  />
                </Box>
                <Box>
                  <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>Status</Typography>
                  <Chip
                    label="Pending"
                    size={isMobile ? "small" : "medium"}
                    sx={{
                      backgroundColor: '#1976d2',
                      color: '#ffffff',
                      fontWeight: 500
                    }}
                  />
                </Box>
              </Box>

              <Divider sx={{ backgroundColor: '#444' }} />

              {/* Description */}
              <Box>
                <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>Description</Typography>
                <Box sx={{
                  backgroundColor: '#272727',
                  p: isMobile ? 1.5 : 2,
                  borderRadius: 1,
                  border: '1px solid #444'
                }}>
                  <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ color: '#ffffff', whiteSpace: 'pre-line' }}>
                    {submittedData?.description}
                  </Typography>
                </Box>
              </Box>

              {/* Submission Date */}
              <Box>
                <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>Submitted On</Typography>
                <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ color: '#ffffff' }}>
                  {newFormatDate(new Date(), 'MMM dd, yyyy')}
                </Typography>
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{
            backgroundColor: '#1e1e1e',
            borderTop: '1px solid #444',
            padding: isMobile ? '8px 16px' : '12px 24px',
          }}>
            <Button
              onClick={onClose}
              size={isMobile ? "small" : "medium"}
              sx={{
                color: '#ffffff',
                backgroundColor: '#333',
                '&:hover': {
                  backgroundColor: '#444',
                }
              }}
            >
              Close
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle sx={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            borderBottom: '1px solid #444',
            padding: isMobile ? '12px 16px' : '16px 24px',
          }}>
            <FaLightbulb color="#3ea6ff" size={isMobile ? 16 : 20} />
            <Typography variant={isMobile ? "subtitle1" : "h6"} component="div" sx={{ ml: 1, fontWeight: 500 }}>
              User Experience Feedback
            </Typography>
          </DialogTitle>

          <DialogContent dividers sx={{
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            padding: isMobile ? '12px 16px' : '20px 24px',
            flex: isMobile ? 1 : undefined,
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#444',
              borderRadius: '2px',
            },
          }}>
            {submitSuccess ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <FaLightbulb color="#4caf50" size={48} />
                <Typography variant="h6" component="div" sx={{ color: '#4caf50', mt: 2 }}>
                  Thank you for your suggestion!
                </Typography>
                <Typography variant="body1" component="div" sx={{ color: '#aaaaaa', mt: 1 }}>
                  We&apos;ll review it soon.
                </Typography>
                <Button
                  onClick={() => setDetailView(true)}
                  variant="outlined"
                  size="medium"
                  sx={{
                    color: '#3ea6ff',
                    borderColor: '#3ea6ff',
                    mt: 3,
                    '&:hover': {
                      backgroundColor: 'rgba(62, 166, 255, 0.1)',
                      borderColor: '#3ea6ff',
                    }
                  }}
                >
                  View Details <FaChevronRight style={{ marginLeft: 8 }} size={14} />
                </Button>
              </Box>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={isMobile ? 2 : 3}>
                  <TextField
                    label="Title"
                    variant="outlined"
                    fullWidth
                    {...register("title", { required: "Title is required" })}
                    error={!!errors.title}
                    helperText={errors.title?.message}
                    sx={{
                      '& .MuiInputBase-root': { color: '#ffffff' },
                      '& .MuiInputLabel-root': { color: '#aaaaaa' },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: '#444' },
                        '&:hover fieldset': { borderColor: '#666' },
                        '&.Mui-focused fieldset': { borderColor: '#1976d2' },
                      },
                      '& .MuiFormHelperText-root': { color: '#aaaaaa' },
                    }}
                  />

                  <FormControl fullWidth>
                    <InputLabel sx={{ color: '#aaaaaa' }}>Category</InputLabel>
                    <Select
                      label="Category"
                      variant="outlined"
                      {...register("category", { required: "Category is required" })}
                      error={!!errors.category}
                      sx={{
                        color: '#ffffff',
                        '& .MuiSelect-icon': { color: '#aaaaaa' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' },
                      }}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            backgroundColor: '#1e1e1e',
                            color: '#ffffff',
                            border: '1px solid #444',
                            '& .MuiMenuItem-root': {
                              color: '#ffffff',
                              backgroundColor: '#1e1e1e',
                              '&:hover': { backgroundColor: '#2a2a2a' },
                              '&.Mui-selected': {
                                backgroundColor: '#1976d2',
                                '&:hover': { backgroundColor: '#1565c0' }
                              },
                            },
                          },
                        },
                      }}
                    >
                      <MenuItem value="bug">Bug Report</MenuItem>
                      <MenuItem value="improvement">Improvement Suggestion</MenuItem>
                      <MenuItem value="feature">Feature Request</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                    {errors.category && (
                      <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                        {errors.category.message}
                      </Typography>
                    )}
                  </FormControl>

                  <TextField
                    label="Description"
                    variant="outlined"
                    multiline
                    rows={isMobile ? 6 : 4}
                    fullWidth
                    {...register("description", { required: "Description is required" })}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    sx={{
                      '& .MuiInputBase-root': { color: '#ffffff' },
                      '& .MuiInputLabel-root': { color: '#aaaaaa' },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: '#444' },
                        '&:hover fieldset': { borderColor: '#666' },
                        '&.Mui-focused fieldset': { borderColor: '#1976d2' },
                      },
                      '& .MuiFormHelperText-root': { color: '#aaaaaa' },
                    }}
                  />
                </Stack>
              </form>
            )}
          </DialogContent>

          <DialogActions sx={{
            backgroundColor: '#1e1e1e',
            borderTop: '1px solid #444',
            padding: isMobile ? '8px 16px' : '12px 24px',
          }}>
            {!submitSuccess ? (
              <>
                <Button
                  onClick={onClose}
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    color: '#ffffff',
                    backgroundColor: '#333',
                    '&:hover': {
                      backgroundColor: '#444',
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit(onSubmit)}
                  variant="contained"
                  disabled={isSubmitting}
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    color: '#ffffff',
                    backgroundColor: '#1976d2',
                    '&:hover': {
                      backgroundColor: '#1565c0',
                    },
                    '&:disabled': {
                      backgroundColor: '#555',
                      color: '#999'
                    }
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </>
            ) : (
              <Button
                onClick={onClose}
                size={isMobile ? "small" : "medium"}
                sx={{
                  color: '#ffffff',
                  backgroundColor: '#333',
                  '&:hover': {
                    backgroundColor: '#444',
                  }
                }}
              >
                Close
              </Button>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

const UserAvatar = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);

  const open = Boolean(anchorEl);

  const menuStyles = {
    '& .MuiPaper-root': {
      backgroundColor: '#121212',
      color: '#A1A1A1',
      width: '280px',
      borderRadius: '12px',
      border: `1px solid ${theme.palette.divider}`,
      padding: '8px 0',
      borderColor: '#4f4f4f',
    },
    '& .MuiMenuItem-root': {
      padding: '8px 4px',
      borderRadius: '8px',
      fontSize: '14px',
      m: 1,
      '&:hover': {
        backgroundColor: '#FFFFFF0F',
        color: '#ffffff',
      },
      '& .MuiSvgIcon-root': {
        marginRight: '16px',
        color: theme.palette.text.secondary,
        fontSize: '20px',
      },
    },
  };

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
      await new Promise((resolve) => setTimeout(resolve, 500));
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

  const handleNavigation = (path) => {
    handleClose();
    navigate(path);
  };

  const handleOpenSuggestionDialog = () => {
    handleClose();
    setSuggestionDialogOpen(true);
  };

  const accountId = user._id;

  return (
    <>
      {isLoggingOut && (
        <Box sx={{
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
        }}>
          <HashLoader color={theme.palette.primary.main} size={60} />
        </Box>
      )}

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
            backgroundColor: '#8d6e63',
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {getInitials(user?.name)}
        </Box>
      </Button>

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
        <Box sx={{
          px: 3,
          py: 1,
          borderBottom: `1px solid #FFFFFF24`,
          backgroundColor: '#121212'
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#ffffff' }}>
            {user?.name}
          </Typography>
          <Typography variant="body2" sx={{
            color: '#A1A1A1',
            mt: 0.5,
          }}>
            {user?.email}
          </Typography>
        </Box>

        <CopyMenuItem accountId={accountId} />

        <Divider sx={{
          my: 1,
          backgroundColor: '#FFFFFF24'
        }} />

        <MenuItem onClick={() => handleNavigation("/profile")}>
          <RiUserLine style={{ fontSize: 18, marginRight: 8 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2" sx={{ ml: 1 }}>Profile</Typography>
          </Box>
        </MenuItem>
        <MenuItem onClick={() => handleNavigation("/change-password")}>
          <RiLockPasswordLine style={{ fontSize: 18, marginRight: 8 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2" sx={{ ml: 1 }}>Change Password</Typography>
          </Box>
        </MenuItem>

        {user.role === "Member" && (
          <>
            <Divider sx={{
              my: 1,
              backgroundColor: '#FFFFFF24'
            }} />
            <MenuItem onClick={handleOpenSuggestionDialog}>
              <RiFeedbackLine style={{ fontSize: 18, marginRight: 8 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2" sx={{ ml: 1 }}>Feedback</Typography>
              </Box>
            </MenuItem>
          </>
        )}

        <Divider sx={{
          my: 1,
          backgroundColor: '#FFFFFF24'
        }} />

        <MenuItem onClick={logoutHandler}>
          <RiLogoutBoxRLine style={{ fontSize: 18, marginRight: 8 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2" sx={{ ml: 1 }}>Sign out</Typography>
          </Box>
        </MenuItem>
      </Menu>

      <SuggestionDialog
        open={suggestionDialogOpen}
        onClose={() => setSuggestionDialogOpen(false)}
        userId={accountId}
      />
    </>
  );
};

export default UserAvatar;
