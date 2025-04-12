import { Box, Stack, Tooltip, Typography, MenuItem, Divider, Button, ListItemText, ListItem, List } from '@mui/material';
import { useState, useEffect } from 'react';
import { FaFileAlt } from 'react-icons/fa';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  IconButton,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Chip,
  Avatar,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Edit, Delete, GppGood, GppBad, Pending, Close, CopyAll, WhatsApp } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import api from '../api/api';

const MenuHeader = ({ title, icon }) => (
  <Stack
    direction="row"
    alignItems="center"
    spacing={1}
    sx={{
      px: 3,
      py: 1.5,
      backgroundColor: "#1e1e1e",
      borderBottom: "1px solid #444",
    }}
  >
    {icon}
    <Typography variant="subtitle2" sx={{ fontWeight: "600", color: "#ffffff" }}>
      {title}
    </Typography>
  </Stack>
);

const MenuLink = ({ title, tooltipTitle, onClick, onEdit, onDelete, isManager, status }) => (
  <MenuItem
    onClick={onClick}
    sx={{
      py: 1.5,
      px: 3,
      borderRadius: '8px',
      m: 1,
      "&:hover": {
        backgroundColor: "#FFFFFF0F",
        color: "#3ea6ff",
      },
    }}
  >
    <Tooltip title={tooltipTitle} arrow>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {status === 'agree' ? (
            <GppGood sx={{ color: "green", fontSize: 16 }} />
          ) : status === 'disagree' ? (
            <GppBad sx={{ color: "red", fontSize: 16 }} />
          ) : (
            <Pending sx={{ color: "gray", fontSize: 16 }} />
          )}
          <FaFileAlt style={{
            color: "#3ea6ff",
            fontSize: 16,
            flexShrink: 0
          }} />
        </Box>
        <Typography
          variant="body2"
          sx={{
            maxWidth: 200,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            display: "block",
            color: "inherit"
          }}
        >
          {title}
        </Typography>
        {isManager && (
          <Box sx={{ display: "flex", marginLeft: 'auto' }}>
            <IconButton onClick={(e) => { e.stopPropagation(); onEdit(); }} size="small" sx={{ color: "#3ea6ff" }}>
              <Edit fontSize="small" />
            </IconButton>
            <IconButton onClick={(e) => { e.stopPropagation(); onDelete(); }} size="small" sx={{ color: "#ff4444" }}>
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Stack>
    </Tooltip>
  </MenuItem>
);

export const PoliciesMenu = () => {
  const user = useSelector((state) => state?.auth?.user);
  const [policies, setPolicies] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [policyName, setPolicyName] = useState("");
  const [policyContent, setPolicyContent] = useState("");
  const [action, setAction] = useState("pending");
  const [password, setPassword] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchPolicies();
  }, [user]);

  const fetchPolicies = async () => {
    try {
      const response = await api.get("/policies/get-all-policies", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      setPolicies(response.data.policies);
    } catch (error) {
      showSnackbar("Failed to fetch policies.", "error");
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleDialogOpen = (policy = null) => {
    if (policy) {
      setSelectedPolicy(policy);
      setPolicyName(policy.name);
      setPolicyContent(policy.content);
      setAction(policy.action);
      setIsEditMode(true);
    } else {
      resetForm();
      setIsEditMode(false);
    }
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedPolicy(null);
    setPolicyName("");
    setPolicyContent("");
    setAction("pending");
    setPassword("");
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSavePolicy = async () => {
    if (!policyName || !policyContent) {
      showSnackbar("Please fill in all fields.", "error");
      return;
    }

    try {
      const endpoint = isEditMode
        ? `/policies/update-policy/${selectedPolicy._id}`
        : "/policies/add-policy";
      const method = isEditMode ? "put" : "post";

      const response = await api[method](endpoint, {
        name: policyName,
        content: policyContent,
        action: action,
        password: password,
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.data.success) {
        fetchPolicies();
        showSnackbar(
          isEditMode ? "Policy updated successfully!" : "Policy added successfully!",
          "success"
        );
        handleDialogClose();
      }
    } catch (error) {
      showSnackbar("Failed to save policy. Please try again.", "error");
    }
  };

  const handleDeletePolicy = async (policy) => {
    try {
      const response = await api.delete(`/policies/delete-policy/${policy._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.data.success) {
        fetchPolicies();
        showSnackbar("Policy deleted successfully!", "success");
      }
    } catch (error) {
      showSnackbar("Failed to delete policy. Please try again.", "error");
    }
  };

  const handleViewPolicy = (policy) => {
    setSelectedPolicy(policy);
    setIsViewDialogOpen(true);
  };

  const handleViewDialogClose = () => {
    setIsViewDialogOpen(false);
    setSelectedPolicy(null);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const copyToClipboard = () => {
    if (!selectedPolicy) return;

    const policyText = `*Policy Details*\n\n` +
      `*Name:* ${selectedPolicy.name}\n` +
      `*Status:* ${selectedPolicy.action === "agree" ? "Agreed" : selectedPolicy.action === "disagree" ? "Disagreed" : "Pending"}\n\n` +
      `*Content:*\n${selectedPolicy.content}`;

    navigator.clipboard.writeText(policyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareOnWhatsApp = () => {
    if (!selectedPolicy) return;

    const policyText = `*Policy Details*\n\n` +
      `*Name:* ${selectedPolicy.name}\n` +
      `*Status:* ${selectedPolicy.action === "agree" ? "Agreed" : selectedPolicy.action === "disagree" ? "Disagreed" : "Pending"}\n\n` +
      `*Content:*\n${selectedPolicy.content}`;

    const encodedText = encodeURIComponent(policyText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <MenuHeader
        title="Company Policies"
        icon={<FaFileAlt style={{ color: "#3ea6ff", fontSize: 16 }} />}
      />

      <Box sx={{
        flex: 1,
        overflowY: "auto",
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#444',
          borderRadius: '3px',
        },
      }}>
        {policies.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              textAlign: "center",
              color: "#ffffff",
              py: 2,
              px: 3,
            }}
          >
            No policies available.
          </Typography>
        ) : (
          policies.map((policy) => (
            <MenuLink
              key={policy._id}
              title={policy.name}
              tooltipTitle={`${policy.name} - ${policy.action}`}
              onClick={() => handleViewPolicy(policy)}
              onEdit={() => handleDialogOpen(policy)}
              onDelete={() => handleDeletePolicy(policy)}
              isManager={user?.isManager}
              status={policy.action}
            />
          ))
        )}
      </Box>

      {(user?.role === 'Admin' || user?.isManager) && (
        <>
          <Divider sx={{ backgroundColor: "#444" }} />
          <Box sx={{ px: 2, py: 1.5 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={() => handleDialogOpen()}
              sx={{
                backgroundColor: "#3ea6ff",
                color: "#ffffff",
                "&:hover": {
                  backgroundColor: "#1c7fd6"
                },
              }}
            >
              Add Policy
            </Button>
          </Box>
        </>
      )}

      {/* Add/Edit Policy Dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            borderRadius: isMobile ? 0 : '8px',
            border: '1px solid #444',
          },
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #444',
          padding: isMobile ? '12px 16px' : '16px 24px',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FaFileAlt color="#3ea6ff" size={isMobile ? 16 : 20} />
            <Typography variant={isMobile ? "subtitle1" : "h6"}>
              {isEditMode ? "Edit Policy" : "Add New Policy"}
            </Typography>
          </Box>
          <IconButton
            onClick={handleDialogClose}
            size={isMobile ? "small" : "medium"}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            <Close fontSize={isMobile ? "small" : "medium"} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{
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
            <TextField
              autoFocus
              margin="dense"
              label="Policy Name"
              fullWidth
              value={policyName}
              onChange={(e) => setPolicyName(e.target.value)}
              sx={{
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
                    borderColor: '#3ea6ff',
                  },
                },
              }}
            />

            <Box>
              <Typography variant={isMobile ? "caption" : "subtitle2"} sx={{ color: '#aaaaaa', mb: 1 }}>
                Policy Content
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={isMobile ? 6 : 8}
                value={policyContent}
                onChange={(e) => setPolicyContent(e.target.value)}
                sx={{
                  '& .MuiInputBase-root': {
                    color: '#ffffff',
                  },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: '#444',
                    },
                    '&:hover fieldset': {
                      borderColor: '#666',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#3ea6ff',
                    },
                  },
                }}
              />
            </Box>

            {user?.isManager && (
              <>
                <Divider sx={{ backgroundColor: '#444' }} />

                <Box>
                  <Typography variant={isMobile ? "caption" : "subtitle2"} sx={{ color: '#aaaaaa', mb: 1 }}>
                    Action
                  </Typography>
                  <RadioGroup
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    row
                    sx={{ gap: 2 }}
                  >
                    <FormControlLabel
                      value="agree"
                      control={
                        <Radio sx={{
                          color: '#4caf50',
                          '&.Mui-checked': {
                            color: '#4caf50'
                          }
                        }} />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <GppGood sx={{ color: '#4caf50', fontSize: 18 }} />
                          <Typography variant="body2">Agree</Typography>
                        </Box>
                      }
                      sx={{ color: '#ffffff' }}
                    />
                    <FormControlLabel
                      value="disagree"
                      control={
                        <Radio sx={{
                          color: '#f44336',
                          '&.Mui-checked': {
                            color: '#f44336'
                          }
                        }} />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <GppBad sx={{ color: '#f44336', fontSize: 18 }} />
                          <Typography variant="body2">Disagree</Typography>
                        </Box>
                      }
                      sx={{ color: '#ffffff' }}
                    />
                    <FormControlLabel
                      value="pending"
                      control={
                        <Radio sx={{
                          color: '#ff9800',
                          '&.Mui-checked': {
                            color: '#ff9800'
                          }
                        }} />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Pending sx={{ color: '#ff9800', fontSize: 18 }} />
                          <Typography variant="body2">Pending</Typography>
                        </Box>
                      }
                      sx={{ color: '#ffffff' }}
                    />
                  </RadioGroup>
                </Box>

                <TextField
                  margin="dense"
                  label="Manager Password"
                  type="password"
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={{
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
                        borderColor: '#3ea6ff',
                      },
                    },
                  }}
                />
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{
          borderTop: '1px solid #444',
          padding: isMobile ? '8px 16px' : '12px 24px',
        }}>
          <Button
            onClick={handleDialogClose}
            size={isMobile ? "small" : "medium"}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSavePolicy}
            variant="contained"
            disabled={!policyName || !policyContent || (user?.isManager && !password)}
            size={isMobile ? "small" : "medium"}
            sx={{
              backgroundColor: "#3ea6ff",
              color: "#ffffff",
              "&:hover": {
                backgroundColor: "#1c7fd6"
              },
              '&:disabled': {
                backgroundColor: '#333',
                color: '#666',
              },
            }}
          >
            {isEditMode ? "Update Policy" : "Add Policy"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Policy Dialog */}
      <Dialog
        open={isViewDialogOpen}
        onClose={handleViewDialogClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            borderRadius: isMobile ? 0 : '8px',
            border: '1px solid #444',
          },
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #444',
          padding: isMobile ? '12px 16px' : '16px 24px',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FaFileAlt color="#3ea6ff" size={isMobile ? 16 : 20} />
            <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontSize: isMobile ? 13 : 20 }}>
              {selectedPolicy?.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={copied ? "Copied!" : "Copy to clipboard"} arrow>
              <IconButton
                onClick={copyToClipboard}
                size={isMobile ? "small" : "medium"}
                sx={{
                  color: '#3ea6ff',
                  '&:hover': {
                    backgroundColor: 'rgba(62, 166, 255, 0.1)',
                  }
                }}
              >
                <CopyAll fontSize={isMobile ? "small" : "medium"} />
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
                <WhatsApp fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
            </Tooltip>
            <IconButton
              onClick={handleViewDialogClose}
              size={isMobile ? "small" : "medium"}
              sx={{
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <Close fontSize={isMobile ? "small" : "medium"} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{
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
            {/* Policy Header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Avatar sx={{
                bgcolor: '#3ea6ff',
                width: isMobile ? 40 : 48,
                height: isMobile ? 40 : 48
              }}>
                <FaFileAlt size={isMobile ? 16 : 20} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant={isMobile ? "body1" : "h6"} sx={{ color: '#ffffff' }}>
                  {selectedPolicy?.name}
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  <Chip
                    label={selectedPolicy?.action === "agree" ? "Agreed" :
                      selectedPolicy?.action === "disagree" ? "Disagreed" : "Pending"}
                    size={isMobile ? "small" : "medium"}
                    sx={{
                      backgroundColor: selectedPolicy?.action === "agree" ? '#4caf50' :
                        selectedPolicy?.action === "disagree" ? '#f44336' : '#ff9800',
                      color: '#ffffff',
                      fontWeight: 500
                    }}
                  />

                  {selectedPolicy?.approvedAt && (
                    <Chip
                      label={`Approved on ${new Date(selectedPolicy.approvedAt).toLocaleDateString()}`}
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        backgroundColor: '#4caf50',
                        color: '#ffffff',
                        fontWeight: 500
                      }}
                    />
                  )}

                  {selectedPolicy?.rejectedAt && (
                    <Chip
                      label={`Rejected on ${new Date(selectedPolicy.rejectedAt).toLocaleDateString()}`}
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        backgroundColor: '#f44336',
                        color: '#ffffff',
                        fontWeight: 500
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Box>

            <Divider sx={{ backgroundColor: '#444' }} />

            {/* Policy Metadata */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 2
            }}>
              <Box>
                <Typography variant={isMobile ? "caption" : "subtitle2"} sx={{ color: '#aaaaaa' }}>
                  Created By
                </Typography>
                <Typography variant={isMobile ? "body2" : "body1"} sx={{ color: '#ffffff' }}>
                  {selectedPolicy?.logs?.find(l => l.action === 'create')?.details.split('by user ')[1] || 'Unknown'}
                </Typography>
              </Box>

              <Box>
                <Typography variant={isMobile ? "caption" : "subtitle2"} sx={{ color: '#aaaaaa' }}>
                  Created On
                </Typography>
                <Typography variant={isMobile ? "body2" : "body1"} sx={{ color: '#ffffff' }}>
                  {selectedPolicy?.createdAt ? new Date(selectedPolicy.createdAt).toLocaleString() : 'Unknown'}
                </Typography>
              </Box>

              <Box>
                <Typography variant={isMobile ? "caption" : "subtitle2"} sx={{ color: '#aaaaaa' }}>
                  Last Updated
                </Typography>
                <Typography variant={isMobile ? "body2" : "body1"} sx={{ color: '#ffffff' }}>
                  {selectedPolicy?.updatedAt ? new Date(selectedPolicy.updatedAt).toLocaleString() : 'Never'}
                </Typography>
              </Box>

              <Box>
                <Typography variant={isMobile ? "caption" : "subtitle2"} sx={{ color: '#aaaaaa' }}>
                  Approval Status
                </Typography>
                <Typography variant={isMobile ? "body2" : "body1"} sx={{ color: '#ffffff' }}>
                  {selectedPolicy?.approvedAt ? 'Approved' :
                    selectedPolicy?.rejectedAt ? 'Rejected' : 'Pending Approval'}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ backgroundColor: '#444' }} />

            {/* Policy Content */}
            <Box>
              <Typography variant={isMobile ? "caption" : "subtitle2"} sx={{ color: '#aaaaaa', mb: 1 }}>
                Policy Content
              </Typography>
              <Box sx={{
                backgroundColor: '#272727',
                p: isMobile ? 1.5 : 2,
                borderRadius: 1,
                border: '1px solid #444'
              }}>
                <Typography
                  variant={isMobile ? "body2" : "body1"}
                  sx={{
                    color: '#ffffff',
                    whiteSpace: 'pre-wrap',
                    '& ul': {
                      pl: 2,
                      mb: 1
                    },
                    '& li': {
                      mb: 0.5
                    }
                  }}
                >
                  {selectedPolicy?.content}
                </Typography>
              </Box>
            </Box>

            {/* Policy History */}
            {selectedPolicy?.logs?.length > 0 && (
              <>
                <Divider sx={{ backgroundColor: '#444' }} />

                <Box>
                  <Typography variant={isMobile ? "caption" : "subtitle2"} sx={{ color: '#aaaaaa', mb: 1 }}>
                    Policy History
                  </Typography>
                  <Box sx={{
                    backgroundColor: '#272727',
                    p: isMobile ? 1.5 : 2,
                    borderRadius: 1,
                    border: '1px solid #444',
                    maxHeight: 200,
                    overflowY: 'auto'
                  }}>
                    <List dense sx={{ py: 0 }}>
                      {selectedPolicy.logs
                        .sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt))
                        .map((log, index) => (
                          <ListItem
                            key={index}
                            sx={{
                              px: 0,
                              py: 1,
                              borderBottom: index < selectedPolicy.logs.length - 1 ? '1px solid #444' : 'none'
                            }}
                          >
                            <ListItemText
                              primary={
                                <Typography variant="body2" sx={{ color: '#ffffff' }}>
                                  {log.details}
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" sx={{ color: '#aaaaaa' }}>
                                  {new Date(log.performedAt).toLocaleString()}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                    </List>
                  </Box>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{
          borderTop: '1px solid #444',
          padding: isMobile ? '8px 16px' : '12px 24px',
        }}>
          <Button
            onClick={handleViewDialogClose}
            size={isMobile ? "small" : "medium"}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{
            width: '100%',
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            border: '1px solid #444'
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};