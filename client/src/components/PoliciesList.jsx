import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../api/api';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  useMediaQuery,
  Hidden,
  useTheme,
  Divider,
  Alert,
  Snackbar
} from '@mui/material';
import {
  MdSearch,
  MdMoreVert,
  MdEdit,
  MdDelete,
  MdAdd,
  MdClose,
  MdVisibility,
  MdFileDownload
} from 'react-icons/md';
import { CheckCircle, Cancel, Pending } from '@mui/icons-material';
import { utils, writeFile } from 'xlsx';

const StatusIndicator = ({ status }) => {
  let icon;
  let color;
  let text;

  switch (status) {
    case 'agree':
      icon = <CheckCircle />;
      color = 'success';
      text = 'Accepted';
      break;
    case 'disagree':
      icon = <Cancel />;
      color = 'error';
      text = 'Rejected';
      break;
    default:
      icon = <Pending />;
      color = 'warning';
      text = 'Pending';
  }

  return (
    <Chip
      icon={icon}
      label={text}
      color={color}
      sx={{
        '&.MuiChip-colorSuccess': {
          backgroundColor: '#4caf50',
          color: '#ffffff'
        },
        '&.MuiChip-colorError': {
          backgroundColor: '#f44336',
          color: '#ffffff'
        },
        '&.MuiChip-colorWarning': {
          backgroundColor: '#ff9800',
          color: '#ffffff'
        }
      }}
    />
  );
};

const PoliciesList = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const user = useSelector((state) => state?.auth?.user);
  const [policies, setPolicies] = useState([]);
  const [filteredPolicies, setFilteredPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentPolicy, setCurrentPolicy] = useState(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    action: 'pending'
  });
  const [password, setPassword] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [managerPassword, setManagerPassword] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [policiesRes, usersRes] = await Promise.all([
          api.get('/policies/get-all-policies', {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          }),
          api.get('/users/get-unhashed-users', {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          })
        ]);

        setPolicies(policiesRes.data.policies);
        setFilteredPolicies(policiesRes.data.policies);

        const manager = usersRes.data.find(u => u.isManager);
        if (manager) setManagerPassword(manager.password);

        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to fetch data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPolicies(policies);
    } else {
      const filtered = policies.filter(policy =>
        policy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policy.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPolicies(filtered);
    }
  }, [searchTerm, policies]);

  const handleMenuOpen = (event, policy) => {
    setAnchorEl(event.currentTarget);
    setCurrentPolicy(policy);
    setFormData({
      name: policy.name,
      content: policy.content,
      action: policy.action
    });
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAddClick = () => {
    setFormData({
      name: '',
      content: '',
      action: 'pending'
    });
    setOpenAddDialog(true);
  };

  const handleEditClick = () => {
    setOpenEditDialog(true);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setOpenDeleteDialog(true);
    handleMenuClose();
  };

  const handleViewClick = () => {
    setOpenViewDialog(true);
    handleMenuClose();
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSavePolicy = async (isEdit = false) => {
    try {
      const endpoint = isEdit
        ? `/policies/update-policy/${currentPolicy._id}`
        : '/policies/add-policy';
      const method = isEdit ? 'put' : 'post';

      // Always include manager password for Admin/Manager actions
      const requestData = {
        ...formData,
        password: managerPassword // Automatically use stored manager password
      };

      const response = await api[method](endpoint, requestData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      // Update state and show success message
      setPolicies(isEdit
        ? policies.map(p => p._id === currentPolicy._id ? response.data.policy : p)
        : [response.data.policy, ...policies]
      );

      setSnackbarMessage(isEdit ? 'Policy updated successfully!' : 'Policy added successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      // Close the appropriate dialog
      if (isEdit) setOpenEditDialog(false);
      else setOpenAddDialog(false);

    } catch (error) {
      // console.error('Error saving policy:', error);
      setSnackbarMessage(error.response?.data?.message || 'Failed to save policy');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/policies/delete-policy/${currentPolicy._id}`, {
        data: { password },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      setPolicies(policies.filter(p => p._id !== currentPolicy._id));
      setSnackbarMessage('Policy deleted successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setOpenDeleteDialog(false);
    } catch (error) {
      // console.error('Error deleting policy:', error);
      setSnackbarMessage(error.response?.data?.message || 'Failed to delete policy');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const exportToExcel = () => {
    const worksheet = utils.json_to_sheet(filteredPolicies.map(policy => ({
      'Name': policy.name,
      'Status': policy.action === 'agree' ? 'Accepted' : policy.action === 'disagree' ? 'Rejected' : 'Pending',
      'Created By': policy.createdBy?.name || 'N/A',
      'Created At': new Date(policy.createdAt).toLocaleString(),
      'Last Updated': new Date(policy.lastUpdate).toLocaleString()
    })));

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Policies');
    writeFile(workbook, 'Policies.xlsx');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      <Typography variant="h5" gutterBottom sx={{
        color: '#3ea6ff',
        fontWeight: 'bold',
        fontSize: isMobile ? '1.2rem' : '1.5rem',
        mb: 2
      }}>
        Policies Management
      </Typography>

      <Box sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        mb: 2,
        gap: isMobile ? 2 : 0,
      }}>
        <Box sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: isMobile ? 'flex-start' : 'space-between',
          gap: 2,
          alignItems: 'center',
          backgroundColor: '#1e1e1e',
          p: 2,
          borderRadius: '8px',
          border: '1px solid #444',
          width: '100%',
        }}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search policies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MdSearch style={{ color: '#aaaaaa' }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <IconButton
                  size="small"
                  onClick={() => setSearchTerm('')}
                  sx={{
                    visibility: searchTerm ? 'visible' : 'hidden',
                    color: '#aaaaaa',
                    '&:hover': {
                      backgroundColor: '#2a2a2a',
                    }
                  }}
                >
                  <MdClose />
                </IconButton>
              ),
              sx: {
                borderRadius: '20px',
                backgroundColor: '#272727',
                width: '100%',
                '& fieldset': {
                  border: 'none',
                },
                '& input': {
                  color: '#ffffff',
                  '&::placeholder': {
                    color: '#666',
                    opacity: 1,
                  }
                },
              },
              style: {
                paddingRight: '8px',
              }
            }}
            sx={{
              width: isMobile ? '100%' : 300,
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  border: '1px solid #666 !important',
                },
                '&.Mui-focused fieldset': {
                  border: '1px solid #3ea6ff !important',
                },
              },
            }}
          />

          <Stack
            direction={isMobile ? 'column' : 'row'}
            spacing={1}
            justifyContent={'end'}
            alignItems="center"
            width={isMobile ? '100%' : 'auto'}
          >
            {(user?.isManager || user?.role === 'Admin') && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddClick}
                startIcon={<MdAdd />}
                fullWidth={isMobile}
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  backgroundColor: '#1976d2',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#1565c0',
                  },
                  textTransform: 'none',
                  borderRadius: '20px',
                  px: 3,
                }}
              >
                {isMobile ? 'Add' : 'Add Policy'}
              </Button>
            )}

            <Button
              variant="outlined"
              onClick={exportToExcel}
              startIcon={<MdFileDownload style={{ color: '#1976d2' }} />}
              fullWidth={isMobile}
              size={isMobile ? 'small' : 'medium'}
              sx={{
                borderColor: '#444',
                color: '#1976d2',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  borderColor: '#666',
                },
                textTransform: 'none',
                borderRadius: '20px',
                px: 3,
              }}
            >
              {isMobile ? 'Export' : 'Export to Excel'}
            </Button>
          </Stack>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{
        mt: 2,
        maxWidth: '100%',
        overflowX: 'auto',
        flex: 1,
        width: "100%",
        border: 0,
        color: "#ffffff",
        "&.MuiTableContainer-root": {
          backgroundColor: '#1e1e1e',
        },
        "& .MuiTable-root": {
          backgroundColor: "#272727",
        },
        "& .MuiTableHead-root": {
          backgroundColor: "#333",
          "& .MuiTableCell-root": {
            color: "#9e9e9e",
            fontSize: "0.875rem",
            fontWeight: "bold",
            borderBottom: "1px solid #444",
          }
        },
        "& .MuiTableBody-root": {
          "& .MuiTableCell-root": {
            borderBottom: "1px solid #444",
            color: "#ffffff",
          },
          "& .MuiTableRow-root": {
            backgroundColor: "#272727",
            "&:hover": {
              backgroundColor: "#333",
            },
          }
        },
        "& .MuiPaper-root": {
          backgroundColor: "transparent",
          boxShadow: "none",
        },
        "&::-webkit-scrollbar": {
          width: "8px",
          height: "8px",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "#666",
          borderRadius: "4px",
        },
        "&::-webkit-scrollbar-track": {
          backgroundColor: "#444",
        },
      }}>
        <Table size={isMobile ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Name</TableCell>
              <Hidden smDown>
                <TableCell>Created By</TableCell>
              </Hidden>
              <Hidden xsDown>
                <TableCell>Created At</TableCell>
              </Hidden>
              <TableCell>Last Updated</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPolicies.length > 0 ? (
              filteredPolicies.map((policy) => (
                <TableRow key={policy._id}>
                  <TableCell>
                    <StatusIndicator status={policy.action} />
                  </TableCell>
                  <TableCell>{policy.name}</TableCell>
                  <Hidden smDown>
                    <TableCell>{policy.createdBy?.name || 'N/A'}</TableCell>
                  </Hidden>
                  <Hidden xsDown>
                    <TableCell>{new Date(policy.createdAt).toLocaleString()}</TableCell>
                  </Hidden>
                  <TableCell>{new Date(policy.lastUpdate).toLocaleString()}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, policy)}
                      sx={{ color: '#ffffff' }}
                    >
                      <MdMoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: '#ffffff' }}>
                  {searchTerm ? 'No matching policies found' : 'No policies available'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{
          "& .MuiPaper-root": {
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            boxShadow: 'none',
            borderRadius: '8px',
            border: '1px solid #444',
            minWidth: '200px',
          },
          "& .MuiList-root": {
            padding: '4px 0',
          }
        }}
      >
        <MenuItem
          onClick={handleViewClick}
          sx={{
            '&:hover': {
              backgroundColor: '#2a2a2a',
            },
            '&.MuiMenuItem-root': {
              padding: '8px 16px',
            }
          }}
        >
          <MdVisibility style={{ marginRight: 8, color: '#ffffff' }} />
          <Typography variant="body1" color="#ffffff">View</Typography>
        </MenuItem>

        {(user?.isManager) && (
          <MenuItem
            onClick={handleEditClick}
            sx={{
              '&:hover': {
                backgroundColor: '#2a2a2a',
              },
              '&.MuiMenuItem-root': {
                padding: '8px 16px',
              }
            }}
          >
            <MdEdit style={{ marginRight: 8, color: '#ffffff' }} />
            <Typography variant="body1" color="#ffffff">Edit</Typography>
          </MenuItem>
        )}

        {user?.isManager && (
          <MenuItem
            onClick={handleDeleteClick}
            sx={{
              '&:hover': {
                backgroundColor: '#2a2a2a',
              },
              '&.MuiMenuItem-root': {
                padding: '8px 16px',
              },
              color: '#f44336',
            }}
          >
            <MdDelete style={{ marginRight: 8, color: '#f44336' }} />
            <Typography variant="body1" color="#f44336">Delete</Typography>
          </MenuItem>
        )}
      </Menu>

      {/* Add/Edit Dialog */}
      <Dialog
        open={openAddDialog || openEditDialog}
        onClose={() => openAddDialog ? setOpenAddDialog(false) : setOpenEditDialog(false)}
        fullWidth
        maxWidth="md"
        fullScreen={isMobile}
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: '#1e1e1e',
            boxShadow: 'none',
            borderRadius: isMobile ? 0 : '8px',
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
            {openAddDialog ? 'Add New Policy' : 'Edit Policy'}
          </Typography>
        </DialogTitle>

        <Divider sx={{ backgroundColor: '#444' }} />

        <DialogContent dividers sx={{
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          padding: '20px 24px',
          '&.MuiDialogContent-root': {
            padding: isMobile ? '16px' : '20px 24px',
          },
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Policy Name"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              size={isMobile ? 'small' : 'medium'}
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
                    borderColor: '#1976d2',
                  },
                },
              }}
            />

            <TextField
              fullWidth
              label="Policy Content"
              name="content"
              value={formData.content}
              onChange={handleFormChange}
              required
              multiline
              rows={6}
              size={isMobile ? 'small' : 'medium'}
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
                    borderColor: '#1976d2',
                  },
                },
              }}
            />

            {user?.isManager && (
              <TextField
                fullWidth
                label="Action"
                name="action"
                value={formData.action}
                onChange={handleFormChange}
                select
                size={isMobile ? 'small' : 'medium'}
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
                      borderColor: '#1976d2',
                    },
                  },
                  '& .MuiSvgIcon-root': {
                    color: '#aaaaaa',
                  },
                }}
              >
                <MenuItem value="agree" sx={{ color: '#ffffff', backgroundColor: '#1e1e1e' }}>
                  Agree
                </MenuItem>
                <MenuItem value="disagree" sx={{ color: '#ffffff', backgroundColor: '#1e1e1e' }}>
                  Disagree
                </MenuItem>
                <MenuItem value="pending" sx={{ color: '#ffffff', backgroundColor: '#1e1e1e' }}>
                  Pending
                </MenuItem>
              </TextField>
            )}

            {/* {(user?.isManager || user?.role === 'Admin') && (
              <TextField
                fullWidth
                label={user?.role === 'Admin' ? 'Manager Password' : 'Your Password'}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                size={isMobile ? 'small' : 'medium'}
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
                      borderColor: '#1976d2',
                    },
                  },
                }}
              />
            )} */}
          </Box>
        </DialogContent>

        <Divider sx={{ backgroundColor: '#444' }} />

        <DialogActions sx={{
          backgroundColor: '#1e1e1e',
          borderTop: '1px solid #444',
          padding: '12px 24px',
        }}>
          <Button
            onClick={() => openAddDialog ? setOpenAddDialog(false) : setOpenEditDialog(false)}
            size={isMobile ? 'small' : 'medium'}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#2a2a2a',
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleSavePolicy(!openAddDialog)}
            variant="contained"
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            disabled={
              !formData.name ||
              !formData.content ||
              (user?.isManager && !formData.action) // Only require action for managers
            }
            sx={{
              backgroundColor: '#1976d2',
              '&:hover': {
                backgroundColor: '#1565c0',
              },
              '&.Mui-disabled': {
                backgroundColor: '#555',
                color: '#888',
              }
            }}
          >
            {openAddDialog ? 'Add' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        fullWidth
        maxWidth="md"
        fullScreen={isMobile}
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: '#1e1e1e',
            boxShadow: 'none',
            borderRadius: isMobile ? 0 : '8px',
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
            {currentPolicy?.name}
          </Typography>
        </DialogTitle>

        <Divider sx={{ backgroundColor: '#444' }} />

        <DialogContent dividers sx={{
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          padding: '20px 24px',
          '&.MuiDialogContent-root': {
            padding: isMobile ? '16px' : '20px 24px',
          },
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Content:</Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {currentPolicy?.content}
              </Typography>
            </Box>

            <Divider sx={{ backgroundColor: '#444' }} />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Status:</Typography>
              <StatusIndicator status={currentPolicy?.action} />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Created By:</Typography>
                <Typography variant="body1">{currentPolicy?.createdBy?.name || 'N/A'}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Created At:</Typography>
                <Typography variant="body1">
                  {currentPolicy?.createdAt ? new Date(currentPolicy.createdAt).toLocaleString() : 'N/A'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Approved By:</Typography>
                <Typography variant="body1">
                  {currentPolicy?.approvedBy?.name || 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Approved At:</Typography>
                <Typography variant="body1">
                  {currentPolicy?.approvedAt ? new Date(currentPolicy.approvedAt).toLocaleString() : 'N/A'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Rejected By:</Typography>
                <Typography variant="body1">
                  {currentPolicy?.rejectedBy?.name || 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Rejected At:</Typography>
                <Typography variant="body1">
                  {currentPolicy?.rejectedAt ? new Date(currentPolicy.rejectedAt).toLocaleString() : 'N/A'}
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Last Updated:</Typography>
              <Typography variant="body1">
                {currentPolicy?.lastUpdate ? new Date(currentPolicy.lastUpdate).toLocaleString() : 'N/A'}
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
            onClick={() => setOpenViewDialog(false)}
            size={isMobile ? 'small' : 'medium'}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        fullScreen={isMobile}
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: '#1e1e1e',
            boxShadow: 'none',
            borderRadius: isMobile ? 0 : '8px',
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
            Confirm Delete
          </Typography>
        </DialogTitle>

        <DialogContent sx={{
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          padding: '20px 24px',
        }}>
          <Typography>
            Are you sure you want to delete the policy &quot;{currentPolicy?.name}&quot;? This action cannot be undone.
          </Typography>
          <TextField
            fullWidth
            label="Your Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            sx={{
              mt: 3,
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
            }}
          />
        </DialogContent>

        <Divider sx={{ backgroundColor: '#444' }} />

        <DialogActions sx={{
          backgroundColor: '#1e1e1e',
          borderTop: '1px solid #444',
          padding: '12px 24px',
        }}>
          <Button
            onClick={() => setOpenDeleteDialog(false)}
            size={isMobile ? 'small' : 'medium'}
            sx={{
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#2a2a2a',
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            size={isMobile ? 'small' : 'medium'}
            disabled={!password}
            sx={{
              backgroundColor: '#f44336',
              '&:hover': {
                backgroundColor: '#d32f2f',
              },
              '&.Mui-disabled': {
                backgroundColor: '#555',
                color: '#888',
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{
            width: '100%',
            backgroundColor: snackbarSeverity === 'error' ? '#f44336' : '#4caf50',
            color: '#ffffff'
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PoliciesList;