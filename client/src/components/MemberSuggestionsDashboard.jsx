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
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Avatar,
  ListItemAvatar,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { format } from 'date-fns';
import api from '../api/api';

const MemberSuggestionsDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [responseLog, setResponseLog] = useState([]);

  const statusOptions = {
    pending: { label: 'Pending', color: 'warning' },
    reviewed: { label: 'Reviewed', color: 'info' },
    implemented: { label: 'Implemented', color: 'success' },
    rejected: { label: 'Rejected', color: 'error' }
  };

  // Fetch member's suggestions
  const fetchMemberSuggestions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/suggestions/user', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      setSuggestions(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch response log for a specific suggestion
  const fetchResponseLog = async (suggestionId) => {
    try {
      const response = await api.get(`/suggestions/${suggestionId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      setResponseLog(response.data.data.responseLog || []);
      setSelectedSuggestion(response.data.data);
      setDetailDialogOpen(true);
    } catch (err) {
      setError('Failed to fetch response history');
    }
  };

  useEffect(() => {
    fetchMemberSuggestions();
  }, []);

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

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      <Typography variant="h5" gutterBottom sx={{
        color: '#3ea6ff',
        fontWeight: 'bold',
        fontSize: isMobile ? '1.2rem' : '1.5rem',
        mb: 2
      }}>
        My Suggestions
      </Typography>

      {/* Suggestions Table */}
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
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date Submitted</TableCell>
              <TableCell>Last Response</TableCell>
              <TableCell>Actions</TableCell>
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
                        backgroundColor: '#3a3a3a',
                        color: '#ffffff',
                        textTransform: 'capitalize'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusOptions[suggestion.status]?.label || suggestion.status}
                      color={statusOptions[suggestion.status]?.color || 'default'}
                      size="small"
                      sx={{
                        color: '#ffffff',
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
                    {format(new Date(suggestion.createdAt), 'PP')}
                  </TableCell>
                  <TableCell>
                    {suggestion.lastRespondedAt ?
                      format(new Date(suggestion.lastRespondedAt), 'PPpp') :
                      'No response yet'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => fetchResponseLog(suggestion._id)}
                      sx={{
                        color: '#aaaaaa',
                        borderColor: '#444',
                        '&:hover': {
                          backgroundColor: 'rgba(170, 170, 170, 0.08)',
                          borderColor: '#666',
                        },
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        padding: isMobile ? '4px 8px' : '6px 16px'
                      }}
                    >
                      View Responses
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" sx={{ color: '#ffffff' }}>
                    You haven&apos;t submitted any suggestions yet
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Response History Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            boxShadow: 'none',
            borderRadius: '8px',
            border: '1px solid #444',
          }
        }}
      >
        <DialogTitle sx={{
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          borderBottom: '1px solid #444',
        }}>
          Response History: {selectedSuggestion?.title}
        </DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: '#1e1e1e', color: '#ffffff' }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#3ea6ff' }}>
            Original Suggestion
          </Typography>
          <Typography variant="body1" paragraph sx={{
            color: '#ffffff',
            backgroundColor: '#272727',
            p: 2,
            borderRadius: '4px',
          }}>
            {selectedSuggestion?.description}
          </Typography>

          <Divider sx={{ my: 2, backgroundColor: '#444' }} />

          <Typography variant="h6" gutterBottom sx={{ color: '#3ea6ff' }}>
            Response Log
          </Typography>

          {responseLog.length === 0 ? (
            <Typography variant="body1" sx={{ color: '#aaaaaa' }}>
              No responses yet
            </Typography>
          ) : (
            <List sx={{ backgroundColor: '#272727', borderRadius: '4px' }}>
              {responseLog.map((response, index) => (
                <React.Fragment key={index}>
                  <ListItem alignItems="flex-start" sx={{ color: '#ffffff' }}>
                    <ListItemAvatar>
                      <Avatar sx={{ backgroundColor: '#3ea6ff' }}>
                        {response.respondedBy?.name?.charAt(0) || 'A'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <>
                          <Chip
                            label={statusOptions[response.status]?.label || response.status}
                            size="small"
                            color={statusOptions[response.status]?.color || 'default'}
                            sx={{
                              mr: 1,
                              color: '#ffffff',
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
                              color: '#aaaaaa',
                              display: 'block',
                              mb: 1
                            }}
                          >
                            {format(new Date(response.respondedAt), 'PPpp')}
                          </Typography>
                          {response.response}
                        </>
                      }
                      sx={{ color: '#ffffff' }}
                    />
                  </ListItem>
                  {index < responseLog.length - 1 && <Divider variant="inset" component="li" sx={{ backgroundColor: '#444' }} />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{
          backgroundColor: '#1e1e1e',
          borderTop: '1px solid #444',
        }}>
          <Button
            onClick={() => setDetailDialogOpen(false)}
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
    </Box>
  );
};

export default MemberSuggestionsDashboard;