import React, { useState, useEffect } from 'react';
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
  TextField,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
  ListItemAvatar,
  Stack,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { format } from 'date-fns';
import { MdRefresh } from 'react-icons/md';
import api from '../api/api';

const AdminSuggestionsDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    status: '',
    category: '',
  });
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [responseLog, setResponseLog] = useState([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [suggestionToDelete, setSuggestionToDelete] = useState(null);

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'warning' },
    { value: 'reviewed', label: 'Reviewed', color: 'info' },
    { value: 'implemented', label: 'Implemented', color: 'success' },
    { value: 'rejected', label: 'Rejected', color: 'error' }
  ];

  const handleDeleteSuggestion = async (suggestionId) => {
    try {
      const token = localStorage.getItem('accessToken');
      await api.delete(`/suggestions/${suggestionId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      fetchSuggestions();
      showSnackbar('Suggestion deleted successfully', 'success');
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'Failed to delete suggestion', 'error');
    }
  };

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await api.get('/suggestions', {
        params: {
          status: filter.status,
          category: filter.category,
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setSuggestions(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      showSnackbar('Failed to fetch suggestions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (suggestionId, newStatus) => {
    try {
      const token = localStorage.getItem('accessToken');
      await api.put(
        `/suggestions/${suggestionId}`,
        {
          status: newStatus,
          adminResponse: responseText
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      fetchSuggestions();
      setOpenDialog(false);
      showSnackbar('Suggestion updated successfully', 'success');
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'Failed to update suggestion', 'error');
    }
  };

  const fetchResponseLog = async (suggestionId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await api.get(`/suggestions/${suggestionId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setResponseLog(response.data.data.responseLog || []);
      setSelectedSuggestion(response.data.data);
      setDetailDialogOpen(true);
    } catch (err) {
      showSnackbar('Failed to fetch response history', err);
    }
  };

  const openResponseDialog = (suggestion) => {
    setSelectedSuggestion(suggestion);
    setResponseText(suggestion.adminResponse || '');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSuggestion(null);
    setResponseText('');
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  useEffect(() => {
    fetchSuggestions();
  }, [filter.status, filter.category]);

  if (loading && suggestions.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  const tableColumns = [
    { id: 'title', label: 'Title' },
    { id: 'category', label: 'Category' },
    { id: 'status', label: 'Status' },
    { id: 'user', label: 'Submitted By' },
    { id: 'createdAt', label: 'Created Date' },
    { id: 'lastRespondedAt', label: 'Last Response' },
    { id: 'actions', label: 'Actions' }
  ];

  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundColor: 'background.default',
      p: 3,
    }}>
      <Box sx={{
        mx: 'auto',
      }}>
        <Typography variant="h5" gutterBottom sx={{
          color: 'var(--accent-text)',
          fontWeight: 'bold',
          fontSize: isMobile ? '1.2rem' : '1.5rem',
          mb: 2
        }}>
          Suggestions Management
        </Typography>

        {/* Filter Controls */}
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
            backgroundColor: 'var(--surface)',
            p: 2,
            borderRadius: '8px',
            border: '1px solid var(--border)',
            width: '100%',
          }}>
            <Stack
              direction={isMobile ? 'column' : 'row'}
              spacing={1}
              justifyContent={'end'}
              alignItems="center"
              width={isMobile ? '100%' : 'auto'}
            >
              <Select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                displayEmpty
                size="small"
                sx={{
                  minWidth: 180,
                  backgroundColor: 'var(--surface)',
                  borderRadius: '20px',
                  '& .MuiSelect-select': {
                    color: 'var(--text)',
                    padding: '8.5px 14px',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: 'none',
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'var(--text-secondary)',
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text)',
                      "& .MuiMenuItem-root": {
                        "&:hover": {
                          backgroundColor: 'var(--surface)',
                        }
                      }
                    }
                  }
                }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value} sx={{ color: 'var(--text)' }}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>

              <Select
                value={filter.category}
                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                displayEmpty
                size="small"
                sx={{
                  minWidth: 180,
                  backgroundColor: 'var(--surface)',
                  borderRadius: '20px',
                  '& .MuiSelect-select': {
                    color: 'var(--text)',
                    padding: '8.5px 14px',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: 'none',
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'var(--text-secondary)',
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text)',
                      "& .MuiMenuItem-root": {
                        "&:hover": {
                          backgroundColor: 'var(--surface)',
                        }
                      }
                    }
                  }
                }}
              >
                <MenuItem value="">All Categories</MenuItem>
                <MenuItem value="bug" sx={{ color: 'var(--text)' }}>Bug Report</MenuItem>
                <MenuItem value="improvement" sx={{ color: 'var(--text)' }}>Improvement</MenuItem>
                <MenuItem value="feature" sx={{ color: 'var(--text)' }}>Feature Request</MenuItem>
                <MenuItem value="other" sx={{ color: 'var(--text)' }}>Other</MenuItem>
              </Select>
            </Stack>
            <Button
              variant="contained"
              onClick={fetchSuggestions}
              disabled={loading}
              startIcon={<MdRefresh style={{ color: 'var(--text)' }} />}
              size="small"
              sx={{
                backgroundColor: '#1976d2',
                color: 'var(--text)',
                '&:hover': {
                  backgroundColor: '#1565c0',
                },
                textTransform: 'none',
                borderRadius: '20px',
                px: 3,
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Suggestions Table */}
        <TableContainer component={Paper} sx={{
          mt: 2,
          maxWidth: '100%',
          overflowX: 'auto',
          flex: 1,
          width: "100%",
          border: 0,
          color: "var(--text)",
          "&.MuiTableContainer-root": {
            backgroundColor: 'var(--surface)',
          },
          "& .MuiTable-root": {
            backgroundColor: "var(--surface)",
          },
          "& .MuiTableHead-root": {
            backgroundColor: "var(--surface)",
            "& .MuiTableCell-root": {
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              fontWeight: "bold",
              borderBottom: "1px solid var(--border)",
            }
          },
          "& .MuiTableBody-root": {
            "& .MuiTableCell-root": {
              borderBottom: "1px solid var(--border)",
              color: "var(--text)",
            },
            "& .MuiTableRow-root": {
              backgroundColor: "var(--surface)",
              "&:hover": {
                backgroundColor: "var(--surface)",
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
            backgroundColor: "#e5e7eb",
          },
        }}>
          <Table size={isMobile ? 'small' : 'medium'}>
            <TableHead>
              <TableRow>
                {tableColumns.map((column) => (
                  <TableCell key={column.id}>{column.label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {suggestions.length > 0 ? (
                suggestions.map((suggestion) => (
                  <TableRow key={suggestion._id}>
                    <TableCell>{suggestion.title}</TableCell>
                    <TableCell>
                      <Chip
                        label={suggestion.category}
                        size="small"
                        sx={{
                          backgroundColor: 'var(--surface-hover)',
                          color: 'var(--text)',
                          textTransform: 'capitalize'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusOptions.find(s => s.value === suggestion.status)?.label || suggestion.status}
                        color={statusOptions.find(s => s.value === suggestion.status)?.color || 'default'}
                        size="small"
                        sx={{
                          color: 'var(--text)',
                          '&.MuiChip-colorWarning': {
                            backgroundColor: '#ff9800',
                          },
                          '&.MuiChip-colorInfo': {
                            backgroundColor: '#2196f3',
                          },
                          '&.MuiChip-colorSuccess': {
                            backgroundColor: '#4caf50',
                          },
                          '&.MuiChip-colorError': {
                            backgroundColor: '#f44336',
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {suggestion.user?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(suggestion.createdAt), 'PP')}
                    </TableCell>
                    <TableCell>
                      {suggestion.lastRespondedAt ?
                        format(new Date(suggestion.lastRespondedAt), 'PPpp') :
                        'No responses yet'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => openResponseDialog(suggestion)}
                          sx={{
                            color: 'var(--accent-text)',
                            borderColor: 'var(--accent)',
                            '&:hover': {
                              backgroundColor: 'rgba(62, 166, 255, 0.08)',
                              borderColor: 'var(--accent)',
                            },
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                            padding: isMobile ? '4px 8px' : '6px 16px'
                          }}
                        >
                          Respond
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => fetchResponseLog(suggestion._id)}
                          sx={{
                            color: 'var(--text-secondary)',
                            borderColor: 'var(--border)',
                            '&:hover': {
                              backgroundColor: 'rgba(170, 170, 170, 0.08)',
                              borderColor: '#666',
                            },
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                            padding: isMobile ? '4px 8px' : '6px 16px'
                          }}
                        >
                          History
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setSuggestionToDelete(suggestion._id);
                            setDeleteDialogOpen(true);
                          }}
                          sx={{
                            color: '#f44336',
                            borderColor: '#f44336',
                            '&:hover': {
                              backgroundColor: 'rgba(244, 67, 54, 0.08)',
                              borderColor: '#f44336',
                            },
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                            padding: isMobile ? '4px 8px' : '6px 16px'
                          }}
                        >
                          Delete
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={tableColumns.length} align="center" sx={{ py: 4, color: 'var(--text)' }}>
                    No suggestions found matching your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Response Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
          sx={{
            "& .MuiDialog-paper": {
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              boxShadow: 'none',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }
          }}
        >
          <DialogTitle sx={{
            backgroundColor: 'var(--surface)',
            color: 'var(--text)',
            borderBottom: '1px solid var(--border)',
          }}>
            Respond to Suggestion: {selectedSuggestion?.title}
          </DialogTitle>
          <DialogContent sx={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
            <Box mb={2} pt={2}>
              <Typography variant="subtitle1" sx={{ color: 'var(--accent-text)' }}>User&apos;s Suggestion:</Typography>
              <Typography variant="body1" sx={{
                whiteSpace: 'pre-line',
                color: 'var(--text)',
                backgroundColor: 'var(--surface)',
                p: 2,
                borderRadius: '4px',
                mt: 1
              }}>
                {selectedSuggestion?.description}
              </Typography>
            </Box>

            <TextField
              label="Your Response"
              fullWidth
              multiline
              rows={4}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Type your response to the user here..."
              sx={{ mb: 2 }}
              InputProps={{
                sx: {
                  color: 'var(--text)',
                  backgroundColor: 'var(--surface)',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--border)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#666',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--accent)',
                  },
                }
              }}
              InputLabelProps={{
                sx: {
                  color: 'var(--text-secondary)',
                  '&.Mui-focused': {
                    color: 'var(--accent-text)',
                  },
                }
              }}
            />

            <Typography variant="subtitle1" sx={{ color: 'var(--accent-text)' }}>Update Status:</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {statusOptions.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  color={option.color}
                  variant={selectedSuggestion?.status === option.value ? 'filled' : 'outlined'}
                  onClick={() => handleStatusUpdate(selectedSuggestion?._id, option.value)}
                  sx={{
                    cursor: 'pointer',
                    color: 'var(--text)',
                    '&.MuiChip-filledWarning': {
                      backgroundColor: '#ff9800',
                    },
                    '&.MuiChip-filledInfo': {
                      backgroundColor: '#2196f3',
                    },
                    '&.MuiChip-filledSuccess': {
                      backgroundColor: '#4caf50',
                    },
                    '&.MuiChip-filledError': {
                      backgroundColor: '#f44336',
                    },
                    '&.MuiChip-outlinedWarning': {
                      color: '#ff9800',
                      borderColor: '#ff9800',
                    },
                    '&.MuiChip-outlinedInfo': {
                      color: '#2196f3',
                      borderColor: '#2196f3',
                    },
                    '&.MuiChip-outlinedSuccess': {
                      color: '#4caf50',
                      borderColor: '#4caf50',
                    },
                    '&.MuiChip-outlinedError': {
                      color: '#f44336',
                      borderColor: '#f44336',
                    },
                  }}
                />
              ))}
            </Box>
          </DialogContent>
          <DialogActions sx={{
            backgroundColor: 'var(--surface)',
            borderTop: '1px solid var(--border)',
          }}>
            <Button
              onClick={handleCloseDialog}
              sx={{
                color: 'var(--text)',
                '&:hover': {
                  backgroundColor: 'var(--surface)',
                }
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => handleStatusUpdate(selectedSuggestion?._id, selectedSuggestion?.status)}
              disabled={!responseText}
              sx={{
                backgroundColor: '#1976d2',
                color: 'var(--text)',
                '&:hover': {
                  backgroundColor: '#1565c0',
                },
                '&.Mui-disabled': {
                  backgroundColor: '#1976d2',
                  color: 'var(--text)',
                  opacity: 0.5,
                }
              }}
            >
              Save Response
            </Button>
          </DialogActions>
        </Dialog>

        {/* Response History Dialog */}
        <Dialog
          open={detailDialogOpen}
          onClose={() => setDetailDialogOpen(false)}
          maxWidth="md"
          fullWidth
          sx={{
            "& .MuiDialog-paper": {
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              boxShadow: 'none',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }
          }}
        >
          <DialogTitle sx={{
            backgroundColor: 'var(--surface)',
            color: 'var(--text)',
            borderBottom: '1px solid var(--border)',
          }}>
            Response History: {selectedSuggestion?.title}
          </DialogTitle>
          <DialogContent dividers sx={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'var(--accent-text)' }}>
              Original Suggestion
            </Typography>
            <Typography variant="body1" paragraph sx={{
              color: 'var(--text)',
              backgroundColor: 'var(--surface)',
              p: 2,
              borderRadius: '4px',
            }}>
              {selectedSuggestion?.description}
            </Typography>

            <Divider sx={{ my: 2, backgroundColor: '#e5e7eb' }} />

            <Typography variant="h6" gutterBottom sx={{ color: 'var(--accent-text)' }}>
              Response Log
            </Typography>

            {responseLog.length === 0 ? (
              <Typography variant="body1" sx={{ color: 'var(--text-secondary)' }}>
                No responses yet
              </Typography>
            ) : (
              <List sx={{ backgroundColor: 'var(--surface)', borderRadius: '4px' }}>
                {responseLog.map((response, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start" sx={{ color: 'var(--text)' }}>
                      <ListItemAvatar>
                        <Avatar sx={{ backgroundColor: 'var(--accent)' }}>
                          {response.respondedBy?.name?.charAt(0) || 'A'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <>
                            <Chip
                              label={response.status}
                              size="small"
                              color={
                                statusOptions.find(s => s.value === response.status)?.color || 'default'
                              }
                              sx={{
                                mr: 1,
                                color: 'var(--text)',
                                '&.MuiChip-colorWarning': {
                                  backgroundColor: '#ff9800',
                                },
                                '&.MuiChip-colorInfo': {
                                  backgroundColor: '#2196f3',
                                },
                                '&.MuiChip-colorSuccess': {
                                  backgroundColor: '#4caf50',
                                },
                                '&.MuiChip-colorError': {
                                  backgroundColor: '#f44336',
                                }
                              }}
                            />
                            {response.respondedBy?.name || 'Admin'}
                          </>
                        }
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              sx={{
                                color: 'var(--text-secondary)',
                                display: 'block',
                                mb: 1
                              }}
                            >
                              {format(new Date(response.respondedAt), 'PPpp')}
                            </Typography>
                            {response.response}
                          </>
                        }
                        sx={{ color: 'var(--text)' }}
                      />
                    </ListItem>
                    {index < responseLog.length - 1 && <Divider variant="inset" component="li" sx={{ backgroundColor: '#e5e7eb' }} />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions sx={{
            backgroundColor: 'var(--surface)',
            borderTop: '1px solid var(--border)',
          }}>
            <Button
              onClick={() => setDetailDialogOpen(false)}
              sx={{
                color: 'var(--text)',
                '&:hover': {
                  backgroundColor: 'var(--surface)',
                }
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          sx={{
            "& .MuiDialog-paper": {
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              boxShadow: 'none',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }
          }}
        >
          <DialogTitle sx={{
            backgroundColor: 'var(--surface)',
            color: 'var(--text)',
            borderBottom: '1px solid var(--border)',
          }}>
            Confirm Deletion
          </DialogTitle>
          <DialogContent sx={{ backgroundColor: 'var(--surface)', color: 'var(--text)', pt: 3 }}>
            <Typography variant="body1">
              Are you sure you want to delete this suggestion? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{
            backgroundColor: 'var(--surface)',
            borderTop: '1px solid var(--border)',
          }}>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              sx={{
                color: 'var(--text)',
                '&:hover': {
                  backgroundColor: 'var(--surface)',
                }
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                handleDeleteSuggestion(suggestionToDelete);
                setDeleteDialogOpen(false);
              }}
              sx={{
                backgroundColor: '#f44336',
                color: 'var(--text)',
                '&:hover': {
                  backgroundColor: '#d32f2f',
                },
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar Notification */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{
              width: '100%',
              backgroundColor: snackbar.severity === 'error' ? '#f44336' :
                snackbar.severity === 'success' ? '#4caf50' :
                  snackbar.severity === 'warning' ? '#ff9800' : '#2196f3',
              color: 'var(--text)',
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default AdminSuggestionsDashboard;