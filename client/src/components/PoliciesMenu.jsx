import {
  Box,
  Stack,
  Tooltip,
  Typography,
  Button,
  TextField,
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
  InputAdornment,
  Divider,
} from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import { useState, useEffect } from 'react';
import api from '../api/api';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import GppGoodIcon from '@mui/icons-material/GppGood';
import GppBadIcon from '@mui/icons-material/GppBad';
import PendingIcon from '@mui/icons-material/Pending';

const MenuHeader = ({ title }) => (
  <Stack
    direction="row"
    alignItems="center"
    justifyContent="space-between"
    sx={{
      px: 3,
      py: 2,
      backgroundColor: "darkslategrey",
      borderBottom: "1px solid #444",
    }}
  >
    <Typography variant="h6" sx={{ fontWeight: "bold", color: "#ffffff" }}>
      {title}
    </Typography>
  </Stack>
);

const MenuLink = ({ title, tooltipTitle, onClick, onEdit, onDelete, isManager, status }) => (
  <MenuItem
    sx={{
      py: 1.5,
      px: 3,
      "&:hover": { backgroundColor: "#333", color: "#3ea6ff" },
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <Stack direction="row" spacing={1} alignItems="center">
      <Tooltip title={status === 'agree' ? 'Agree' : status === 'disagree' ? 'Disagree' : 'Pending'}>
        {status === 'agree' ? <GppGoodIcon sx={{ color: "green" }} /> : status === 'disagree' ? <GppBadIcon sx={{ color: "red" }} /> : <PendingIcon sx={{ color: "gray" }} />}
      </Tooltip>
      <Tooltip title={tooltipTitle}>
        <Typography
          variant="body1"
          onClick={onClick}
          sx={{
            maxWidth: 300,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            display: "block",
          }}
        >
          {title}
        </Typography>
      </Tooltip>
    </Stack>
    {isManager && (
      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        <IconButton onClick={onEdit} size="small" sx={{ color: "#3ea6ff" }}>
          <EditIcon />
        </IconButton>
        <IconButton onClick={onDelete} size="small" sx={{ color: "#ff4444" }}>
          <DeleteIcon />
        </IconButton>
      </Box>
    )}
  </MenuItem>
);

const PasswordDialog = ({ open, onClose, onConfirm, title }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleConfirm = () => {
    onConfirm(password);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={handleTogglePasswordVisibility}>
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleConfirm} color="primary">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const PoliciesMenu = () => {
  const user = useSelector((state) => state?.auth?.user);
  const [addedPolicies, setAddedPolicies] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [policyName, setPolicyName] = useState("");
  const [policyContent, setPolicyContent] = useState("");
  const [action, setAgreement] = useState("pending");
  const [password, setPassword] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, [user]);

  useEffect(() => {
    const fetchManagerPassword = async () => {
      try {
        const response = await api.get("/users/get-unhashed-users", {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        });
        const users = response.data;
        const manager = users.find((u) => u.isManager);
        if (manager) {
          setPassword(manager.password);
        }
      } catch (error) {
        console.error("Failed to fetch manager password:", error);
      }
    };

    fetchManagerPassword();
  }, []);

  useEffect(() => {
    if (!user || !user.isManager) {
      setPassword(password);
    }
  }, [password, user]);

  const fetchPolicies = async () => {
    try {
      const response = await api.get("/policies/get-all-policies", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      setAddedPolicies(response.data.policies);
    } catch (error) {
      console.error("Error fetching policies:", error);
      setSnackbarMessage("Failed to fetch policies.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleDialogOpen = (policy = null) => {
    if (policy) {
      setSelectedPolicy(policy);
      setPolicyName(policy.name);
      setPolicyContent(policy.content);
      setAgreement(policy.action);
      setPassword("");
      setIsEditMode(true);
    } else {
      setSelectedPolicy(null);
      setPolicyName("");
      setPolicyContent("");
      setAgreement("pending");
      setIsEditMode(false);
      if (user.isManager) {
        setPassword("");
      }
    }
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setPolicyName("");
    setPolicyContent("");
    setAgreement("agree");
    setPassword("");
    setSelectedPolicy(null);
  };

  const handleSavePolicy = async () => {
    if (!policyName || !policyContent || !password || !action) {
      setSnackbarMessage("Please fill in all fields.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    try {
      const endpoint = isEditMode ? `/policies/update-policy/${selectedPolicy._id}` : "/policies/add-policy";
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
        setSnackbarMessage(isEditMode ? "Policy updated successfully!" : "Policy added successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        handleDialogClose();
      } else {
        setSnackbarMessage(response.data.message || "Failed to save policy.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error saving policy:", error);
      setSnackbarMessage("Failed to save policy. Please try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleDeletePolicy = async (policy) => {
    setSelectedPolicy(policy);
    setPasswordDialogOpen(true);
  };

  const handlePasswordConfirm = async (enteredPassword) => {
    if (!enteredPassword) {
      setSnackbarMessage("Deletion canceled. Password is required.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    try {
      const response = await api.delete(`/policies/delete-policy/${selectedPolicy._id}`, {
        data: { password: enteredPassword },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.data.success) {
        fetchPolicies();
        setSnackbarMessage("Policy deleted successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      } else {
        setSnackbarMessage(response.data.message || "Failed to delete policy.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error("Error deleting policy:", error);
      setSnackbarMessage("Failed to delete policy. Please try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
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

  return (
    <>
      <MenuHeader title="All Policies" />

      <Stack sx={{ justifyContent: "space-between", height: "100%" }}>
        <Box sx={{ flex: 1, overflowY: "auto", maxHeight: "200px" }}>
          {addedPolicies.length === 0 ? (
            <Typography
              variant="body2"
              sx={{
                textAlign: "center",
                color: "#ffffff",
                py: 2,
              }}
            >
              No policies added.
            </Typography>
          ) : (
            addedPolicies.map((policy) => (
              <MenuLink
                key={policy._id}
                title={policy.name}
                tooltipTitle={`${policy.name} - ${policy.action}`}
                onClick={() => handleViewPolicy(policy)}
                onEdit={() => handleDialogOpen(policy)}
                onDelete={() => handleDeletePolicy(policy)}
                isManager={user && user.isManager}
                status={policy.action}
              />
            ))
          )}
        </Box>

        <Box sx={{ px: 2, py: 1 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => {
              if (user?.role === 'Admin' || user?.isManager) {
                handleDialogOpen();
              }
            }}
            sx={{
              backgroundColor: (user?.role === 'Admin' || user?.isManager) ? "#3ea6ff" : "rgba(62, 166, 255, 0.5)",
              color: "#ffffff",
              "&:hover": {
                backgroundColor: (user?.role === 'Admin' || user?.isManager) ? "#1c7fd6" : "rgba(62, 166, 255, 0.5)"
              },
              cursor: (user?.role === 'Admin' || user?.isManager) ? 'pointer' : 'not-allowed',
              '&.Mui-disabled': {
                color: '#ffffff',
                backgroundColor: "rgba(62, 166, 255, 0.5)",
              }
            }}
          >
            Add Policy
          </Button>
        </Box>
      </Stack>

      {/* Add and Edit policy dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            width: "600px",
            borderRadius: "8px",
          },
        }}
      >
        <DialogTitle
          sx={{
            backgroundColor: "dimgray",
            color: "#ffffff",
            borderBottom: "1px solid #444",
          }}
        >
          {isEditMode ? "Edit Policy" : "Add New Policy"}
        </DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: '#141414ed' }}>
          <TextField
            autoFocus
            margin="dense"
            label="Policy Name"
            fullWidth
            value={policyName}
            onChange={(e) => setPolicyName(e.target.value)}
            sx={{
              mb: 2,
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
              },
            }}
          />
          <TextField
            margin="dense"
            label="Policy Content"
            fullWidth
            multiline
            rows={6}
            value={policyContent}
            onChange={(e) => setPolicyContent(e.target.value)}
            sx={{
              mb: 2,
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
              },
            }}
          />
          {user && user.isManager && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: "#ffffff", mb: 1 }}>
                  Action:
                </Typography>
                <RadioGroup
                  value={action}
                  onChange={(e) => setAgreement(e.target.value)}
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Stack direction="row" spacing={2}>
                    <FormControlLabel
                      value="agree"
                      control={<Radio sx={{
                        transform: "scale(0.8)",
                        width: "10px",
                        height: "10px",
                        mr: 1,
                        color: '#ffffff',
                        '&.Mui-checked': {
                          color: '#4caf50',
                        },
                      }} />}
                      label={<Typography sx={{ fontSize: "0.9rem", color: "#ffffff" }}>Agree</Typography>}
                    />
                    <FormControlLabel
                      value="disagree"
                      control={<Radio sx={{
                        transform: "scale(0.8)",
                        width: "10px",
                        height: "10px",
                        mr: 1,
                        color: '#ffffff',
                        '&.Mui-checked': {
                          color: '#f44336',
                        },
                      }} />}
                      label={<Typography sx={{ fontSize: "0.9rem", color: "#ffffff" }}>Disagree</Typography>}
                    />
                    <FormControlLabel
                      value="pending"
                      control={<Radio sx={{
                        transform: "scale(0.8)",
                        width: "10px",
                        height: "10px",
                        mr: 1,
                        color: '#ffffff',
                        '&.Mui-checked': {
                          color: '#ff9800',
                        },
                      }} />}
                      label={<Typography sx={{ fontSize: "0.9rem", color: "#ffffff" }}>Pending</Typography>}
                    />
                  </Stack>
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
                  mt: 2,
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
                  },
                }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            backgroundColor: "dimgray",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Button
            onClick={handleDialogClose}
            sx={{
              color: "aliceblue",
              backgroundColor: "gray",
              '&:hover': {
                backgroundColor: '#555',
              },
            }}
          >
            Close
          </Button>
          <Button
            onClick={handleSavePolicy}
            color="primary"
            disabled={!policyName || !policyContent || (user?.isManager && !password)}
            sx={{
              color: "aliceblue",
              backgroundColor: "#1976d2",
              '&:hover': {
                backgroundColor: '#1565c0',
              },
              '&:disabled': {
                backgroundColor: '#555',
                color: '#888',
              },
            }}
          >
            {isEditMode ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View policy dialog */}
      <Dialog
        open={isViewDialogOpen}
        onClose={handleViewDialogClose}
        fullWidth
        maxWidth="md"
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
            {selectedPolicy?.name}
          </Typography>
        </DialogTitle>

        <Divider sx={{ backgroundColor: '#444' }} />

        <DialogContent dividers sx={{
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          padding: '20px 24px',
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Content:</Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {selectedPolicy?.content}
              </Typography>
            </Box>

            <Divider sx={{ backgroundColor: '#444' }} />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Action Status:</Typography>
              <Typography variant="body1">
                {selectedPolicy?.action === "agree" ? "Agreed" : selectedPolicy?.action === "disagree" ? "Disagreed" : "Pending"}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Approved By:</Typography>
                <Typography variant="body1">
                  {selectedPolicy?.approvedBy?.name || "N/A"}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Approved At:</Typography>
                <Typography variant="body1">
                  {selectedPolicy?.approvedAt
                    ? new Date(selectedPolicy.approvedAt).toLocaleString()
                    : "N/A"}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Rejected By:</Typography>
                <Typography variant="body1">
                  {selectedPolicy?.rejectedBy?.name || "N/A"}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Rejected At:</Typography>
                <Typography variant="body1">
                  {selectedPolicy?.rejectedAt
                    ? new Date(selectedPolicy.rejectedAt).toLocaleString()
                    : "N/A"}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Created By:</Typography>
                <Typography variant="body1">
                  {selectedPolicy?.createdBy?.name || "N/A"}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Created At:</Typography>
                <Typography variant="body1">
                  {selectedPolicy?.createdAt
                    ? new Date(selectedPolicy.createdAt).toLocaleString()
                    : "N/A"}
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Last Updated:</Typography>
              <Typography variant="body1">
                {selectedPolicy?.lastUpdate
                  ? new Date(selectedPolicy.lastUpdate).toLocaleString()
                  : "N/A"}
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <Divider sx={{ backgroundColor: '#444' }} />

        <DialogActions sx={{
          backgroundColor: '#1e1e1e',
          borderTop: '1px solid #444',
          padding: '12px 24px',
        }}>
          <Button
            onClick={handleViewDialogClose}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#2a2a2a',
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <PasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        onConfirm={handlePasswordConfirm}
        title="Enter your password to confirm deletion"
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
