import { useState, useEffect } from 'react';
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
  Select,
  FormControl,
  InputLabel,
  Stack,
  useMediaQuery,
  Hidden,
  useTheme,
  Divider
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
import api from '../api/api';
import CustomerIssueDialog from './CustomerIssueDialog';
import ViewIssueDetailsDialog from './ViewIssueDetailsDialog';
import { utils, writeFile } from 'xlsx';
import { useSelector } from 'react-redux';

const contactMethods = [
  'Phone call',
  'WhatsApp private message',
  'WhatsApp group message'
];

const teams = [
  "Activation Team",
  "Nokia Quality Team",
  "Orange Quality Team",
  "Nokia Closure Team"
];

const companyTeams = [
  'INH-1', 'INH-2', 'INH-3', 'INH-4', 'INH-5', 'INH-6', 'Al-Dar 2', 'Orange Team', 'Others'
];

const CustomerIssuesList = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const user = useSelector((state) => state?.auth?.user);
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentIssue, setCurrentIssue] = useState(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({
    slid: '',
    from: '',
    reporter: '',
    reporterNote: '',
    contactMethod: '',
    issueCategory: '',
    date: new Date().toISOString().split('T')[0],
    pisDate: new Date().toISOString().split('T')[0],
    solved: 'no',
    assignedTo: '',
    assignedNote: '',
    teamCompany: ''
  });

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const response = await api.get('/customer-issues-notifications', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        setIssues(response.data.data);
        setFilteredIssues(response.data.data);
      } catch (err) {
        setError(err.message || 'Failed to fetch issues');
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredIssues(issues);
    } else {
      const filtered = issues.filter(issue =>
        issue.slid.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredIssues(filtered);
    }
  }, [searchTerm, issues]);

  const handleMenuOpen = (event, issue) => {
    setAnchorEl(event.currentTarget);
    setCurrentIssue(issue);

    const fromValue = teams.includes(issue.from) ? issue.from : teams[0];
    const issueDate = issue.date
      ? new Date(issue.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const pisDateValue = issue.pisDate
      ? new Date(issue.pisDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    setEditFormData({
      ...issue,
      date: issueDate,
      pisDate: pisDateValue,
      from: fromValue,
    });
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    setOpenEditDialog(true);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setOpenDeleteDialog(true);
    handleMenuClose();
  };

  const handleAddIssue = async (newIssue) => {
    try {
      const response = await api.post('/customer-issues-notifications', newIssue, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      setIssues([response.data.data, ...issues]);
      setFilteredIssues([response.data.data, ...filteredIssues]);
      setOpenAddDialog(false);
    } catch (error) {
      // console.error('Error creating issue:', error);
      alert('Failed to create issue. Please try again.');
    }
  };

  const handleEditSubmit = async () => {
    try {
      const response = await api.put(
        `/customer-issues-notifications/${currentIssue._id}`,
        {
          ...editFormData,
          date: new Date(editFormData.date).toISOString()
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        }
      );

      setIssues(issues.map(issue =>
        issue._id === currentIssue._id ? response.data.data : issue
      ));
      setFilteredIssues(filteredIssues.map(issue =>
        issue._id === currentIssue._id ? response.data.data : issue
      ));
      setOpenEditDialog(false);
    } catch (error) {
      // console.error('Error updating issue:', error);
      alert('Failed to update issue. Please try again.');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(
        `/customer-issues-notifications/${currentIssue._id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        }
      );

      setIssues(issues.filter(issue => issue._id !== currentIssue._id));
      setFilteredIssues(filteredIssues.filter(issue => issue._id !== currentIssue._id));
      setOpenDeleteDialog(false);
    } catch (error) {
      // console.error('Error deleting issue:', error);
      alert('Failed to delete issue. Please try again.');
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const exportToExcel = () => {
    const worksheet = utils.json_to_sheet(filteredIssues.map(issue => ({
      'SLID': issue.slid,
      'From': issue.from,
      'Reporter': issue.reporter,
      'Reporter Note': issue.reporterNote || '',
      'Team/Company': issue.teamCompany,
      'Contact Method': issue.contactMethod,
      'Issue Category': issue.issueCategory,
      'Assigned User': issue.assignedTo,
      'Assigned User Note': issue.assignedNote || '',
      'Status': issue.solved === 'yes' ? 'Resolved' : 'Unresolved',
      'Resolution Details': issue.resolutionDetails || '',
      'Date Reported': new Date(issue.date).toLocaleDateString(),
      'PIS Date': issue.pisDate ? new Date(issue.pisDate).toLocaleDateString() : 'N/A'
    })));

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Customer Issues Notifications');
    writeFile(workbook, 'CIN.xlsx');
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
    <Box sx={{
      maxWidth: '1100px',
      mx: 'auto',
      p: 2,
      px: isMobile ? 0 : undefined
    }}>
      <Typography variant="h5" gutterBottom sx={{
        color: '#3ea6ff',
        fontWeight: 'bold',
        fontSize: isMobile ? '1.2rem' : '1.5rem',
        mb: 2
      }}>
        Customer Issues
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
          // width: isMobile ? '100%' : 'auto',
          backgroundColor: '#1e1e1e',
          p: 2,
          borderRadius: '8px',
          border: '1px solid #444',
          width: '100%',
        }}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search by SLID..."
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
            <Button
              variant="contained"
              color="primary"
              onClick={() => user?.role === 'Admin' && setOpenAddDialog(true)}
              startIcon={<MdAdd style={{
                color: '#ffffff',
                opacity: user?.role === 'Admin' ? 1 : 0.5
              }} />}
              fullWidth={isMobile}
              size={isMobile ? 'small' : 'medium'}
              sx={{
                backgroundColor: '#1976d2',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: user?.role === 'Admin' ? '#1565c0' : '#1976d2',
                },
                textTransform: 'none',
                borderRadius: '20px',
                px: 3,
                cursor: user?.role === 'Admin' ? 'pointer' : 'not-allowed',
                '&.Mui-disabled': {
                  backgroundColor: '#1976d2',
                  color: '#ffffff',
                  opacity: 0.5,
                }
              }}
            >
              {isMobile ? 'Add' : 'Add Issue'}
            </Button>
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
              <TableCell>SLID</TableCell>
              <Hidden smDown>
                <TableCell>PIS Date</TableCell>
              </Hidden>
              <Hidden xsDown>
                <TableCell>From</TableCell>
              </Hidden>
              <TableCell>Reporter</TableCell>
              <Hidden smDown>
                <TableCell>Team/Company</TableCell>
              </Hidden>
              <Hidden mdDown>
                <TableCell>Contact Method</TableCell>
              </Hidden>
              <TableCell>Issue</TableCell>
              <TableCell>Assigned</TableCell>
              <TableCell>Status</TableCell>
              <Hidden xsDown>
                <TableCell>Date</TableCell>
              </Hidden>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredIssues.length > 0 ? (
              filteredIssues.map((issue) => (
                <TableRow key={issue._id}>
                  <TableCell>{issue.slid}</TableCell>
                  <Hidden smDown>
                    <TableCell>{issue.pisDate ? new Date(issue.pisDate).toLocaleDateString() : 'N/A'}</TableCell>
                  </Hidden>
                  <Hidden xsDown>
                    <TableCell>{issue.from}</TableCell>
                  </Hidden>
                  <TableCell>{issue.reporter}</TableCell>
                  <Hidden smDown>
                    <TableCell>{issue.teamCompany}</TableCell>
                  </Hidden>
                  <Hidden mdDown>
                    <TableCell>{issue.contactMethod}</TableCell>
                  </Hidden>
                  <TableCell>{issue.issueCategory}</TableCell>
                  <TableCell>{issue.assignedTo}</TableCell>
                  <TableCell>
                    <Chip
                      label={issue.solved === 'yes' ? 'Resolved' : 'Unresolved'}
                      color={issue.solved === 'yes' ? 'success' : 'error'}
                      size={isMobile ? 'small' : 'medium'}
                      sx={{
                        color: "#ffffff",
                        '&.MuiChip-colorSuccess': {
                          backgroundColor: '#4caf50',
                        },
                        '&.MuiChip-colorError': {
                          backgroundColor: '#f44336',
                        }
                      }}
                    />
                  </TableCell>
                  <Hidden xsDown>
                    <TableCell>
                      {new Date(issue.date).toLocaleDateString()}
                    </TableCell>
                  </Hidden>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, issue)}
                      sx={{ color: '#ffffff' }}
                    >
                      <MdMoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isMobile ? 6 : 11} align="center" sx={{ color: '#ffffff' }}>
                  {searchTerm ? 'No matching issues found' : 'No issues available'}
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
          onClick={() => { setOpenViewDialog(true); handleMenuClose(); }}
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

        {user && user.role === 'Admin' && [
          <MenuItem
            key="edit"
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
          </MenuItem>,

          <MenuItem
            key="delete"
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
        ]}
      </Menu>

      {/* Add Issue Dialog */}
      <CustomerIssueDialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        onSubmit={handleAddIssue}
      />

      {/* Edit Dialog - Responsive */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        fullWidth
        maxWidth={isMobile ? 'xs' : 'sm'}
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
            Edit Customer Issue
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
              label="SLID (Subscription Number)"
              name="slid"
              value={editFormData.slid}
              onChange={handleEditChange}
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

            {/* Apply the same sx prop to all TextField components */}
            {[
              'pisDate',
              'reporter',
              'reporterNote',
              'issueCategory',
              'date',
              'resolutionDetails',
              'assignedTo',
              'assignedNote'
            ].map((field) => (
              <TextField
                key={field}
                fullWidth
                label={field === 'pisDate' ? 'PIS Date' :
                  field === 'reporterNote' ? 'Reporter Note' :
                    field === 'issueCategory' ? 'Issue Category' :
                      field === 'resolutionDetails' ? 'Resolution Details' :
                        field === 'assignedNote' ? 'Assigned User Note' :
                          field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                name={field}
                value={editFormData[field] || ''}
                onChange={handleEditChange}
                multiline={['reporterNote', 'resolutionDetails', 'assignedNote'].includes(field)}
                rows={field === 'resolutionDetails' ? 3 :
                  ['reporterNote', 'assignedNote'].includes(field) ? 2 : undefined}
                type={['pisDate', 'date'].includes(field) ? 'date' : undefined}
                InputLabelProps={['pisDate', 'date'].includes(field) ? { shrink: true } : undefined}
                required={['slid', 'reporter', 'issueCategory', 'assignedTo'].includes(field)}
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
                  '& .MuiFormHelperText-root': {
                    color: '#aaaaaa',
                  },
                }}
              />
            ))}

            {/* Style all Select components similarly */}
            {[
              { name: 'from', label: 'From', options: teams },
              { name: 'teamCompany', label: 'Team/Company', options: companyTeams },
              { name: 'contactMethod', label: 'Contact Method', options: contactMethods },
              { name: 'solved', label: 'Solved', options: ['yes', 'no'] }
            ].map((select) => (
              <FormControl
                key={select.name}
                fullWidth
                required
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  '& .MuiInputLabel-root': {
                    color: '#aaaaaa',
                  },
                  '& .MuiOutlinedInput-root': {
                    color: '#ffffff',
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
                <InputLabel>{select.label}</InputLabel>
                <Select
                  name={select.name}
                  value={editFormData[select.name] || ''}
                  label={select.label}
                  onChange={handleEditChange}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        backgroundColor: '#1e1e1e',
                        color: '#ffffff',
                        "& .MuiMenuItem-root": {
                          "&:hover": {
                            backgroundColor: '#2a2a2a',
                          }
                        }
                      }
                    }
                  }}
                >
                  {select.options.map(option => (
                    <MenuItem
                      key={option}
                      value={option}
                      sx={{
                        color: '#ffffff',
                        backgroundColor: '#1e1e1e',
                        '&:hover': {
                          backgroundColor: '#2a2a2a',
                        },
                      }}
                    >
                      {option === 'yes' ? 'Yes' : option === 'no' ? 'No' : option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ))}
          </Box>
        </DialogContent>

        <Divider sx={{ backgroundColor: '#444' }} />

        <DialogActions sx={{
          backgroundColor: '#1e1e1e',
          borderTop: '1px solid #444',
          padding: '12px 24px',
        }}>
          <Button
            onClick={() => setOpenEditDialog(false)}
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
            onClick={handleEditSubmit}
            variant="contained"
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            sx={{
              backgroundColor: '#1976d2',
              '&:hover': {
                backgroundColor: '#1565c0',
              }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <ViewIssueDetailsDialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        issue={currentIssue}
        fullScreen={isMobile}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        fullScreen={isMobile}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this issue? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDeleteDialog(false)}
            size={isMobile ? 'small' : 'medium'}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            size={isMobile ? 'small' : 'medium'}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerIssuesList;