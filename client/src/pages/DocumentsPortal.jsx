import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  useMediaQuery,
  Tooltip,
  Chip,
  Breadcrumbs,
  Stack,
  Avatar,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Link as MuiLink,
  CircularProgress
} from '@mui/material';
import {
  MdCloudUpload,
  MdDelete,
  MdEdit,
  MdFolder,
  MdInsertDriveFile,
  MdShare,
  MdSecurity,
  MdDescription,
  MdDownload,
  MdOpenInNew,
  MdLink
} from 'react-icons/md';
import { toast } from 'sonner';
import api from '../api/api';

const DocumentsPortal = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState(0); // 0: Shared with Field Teams, 1: QoS-Related Docs

  // Dialog States
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  // Form States
  const [linkUrl, setLinkUrl] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('field');

  // Edit/Delete Context
  const [currentDoc, setCurrentDoc] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLink, setEditLink] = useState('');

  // Fetch Documents
  const fetchDocs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/docs');
      setDocuments(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  // Handlers
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleUpload = async () => {
    if (!uploadName || !linkUrl) {
      toast.error('Please provide both name and URL');
      return;
    }

    try {
      const payload = {
        name: uploadName,
        category: uploadCategory,
        href: linkUrl,
        type: 'LINK',
        isExternalLink: true
      };

      await api.post('/docs/add', payload);

      toast.success('Document added successfully');
      setOpenUploadDialog(false);
      resetUploadForm();
      fetchDocs();

    } catch (error) {
      console.error(error);
      toast.error('Failed to add document');
    }
  };

  const resetUploadForm = () => {
    setUploadName('');
    setLinkUrl('');
  };

  const handleEditClick = (doc) => {
    setCurrentDoc(doc);
    setEditName(doc.name);
    setEditLink(doc.href || '');
    setOpenEditDialog(true);
  };

  const handleEditSubmit = async () => {
    if (!editName) return;
    try {
      await api.put(`/docs/${currentDoc._id}`, { name: editName, href: editLink });
      toast.success('Document updated');
      setOpenEditDialog(false);
      fetchDocs();
    } catch (error) {
      toast.error('Failed to update document');
    }
  };

  const handleDeleteClick = (doc) => {
    setCurrentDoc(doc);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/docs/${currentDoc._id}`);
      toast.success('Document deleted');
      setOpenDeleteDialog(false);
      fetchDocs();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const handleDownloadClick = (doc) => {
    window.open(doc.href, '_blank');
  };

  // Filter documents based on tab
  const filteredDocuments = documents.filter(doc =>
    currentTab === 0 ? doc.category === 'field' : doc.category === 'qos'
  );

  return (
    <Box sx={{ p: isMobile ? 0 : 4, minHeight: '100vh', color: '#ffffff' }}>

      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2, color: '#b3b3b3' }}>
          <Typography color="inherit">Resources</Typography>
          <Typography color="text.primary" sx={{ fontWeight: 'bold', color: '#7b68ee' }}>Documents Portal</Typography>
        </Breadcrumbs>

        <Box sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: 2,
          mb: 3
        }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: '#7b68ee', width: 56, height: 56 }}>
              <MdFolder size={32} />
            </Avatar>
            <Box>
              <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 'bold', color: '#ffffff' }}>
                OneDrive Documents
              </Typography>
              <Typography variant="body2" sx={{ color: '#b3b3b3' }}>
                Manage and control your uploaded documents
              </Typography>
            </Box>
          </Stack>

          <Button
            variant="contained"
            startIcon={<MdLink />}
            onClick={() => {
              setUploadCategory(currentTab === 0 ? 'field' : 'qos');
              setOpenUploadDialog(true);
            }}
            sx={{
              backgroundColor: '#7b68ee',
              '&:hover': { backgroundColor: '#6c5ce7' },
              textTransform: 'none',
              borderRadius: '8px',
              px: 3,
              py: 1
            }}
          >
            Add Document Link
          </Button>
        </Box>

        {/* Categories Tabs */}
        <Paper square sx={{ bgcolor: '#2d2d2d', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #3d3d3d' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            textColor="inherit"
            indicatorColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              '& .MuiTabs-indicator': { backgroundColor: '#7b68ee', height: 3 },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                minHeight: 56,
                color: '#b3b3b3',
                '&.Mui-selected': { color: '#ffffff' }
              }
            }}
          >
            <Tab
              icon={<MdShare size={20} />}
              iconPosition="start"
              label="Shared with Field Teams"
            />
            <Tab
              icon={<MdSecurity size={20} />}
              iconPosition="start"
              label="QoS-Related Docs"
            />
          </Tabs>
        </Paper>
      </Box>

      {/* Documents Table */}
      <TableContainer component={Paper} sx={{
        backgroundColor: '#2d2d2d',
        borderRadius: '0 0 12px 12px',
        border: '1px solid #3d3d3d',
        borderTop: 'none',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        {loading ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress color="primary" /></Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#b3b3b3', borderBottom: '1px solid #3d3d3d' }}>Name</TableCell>
                {!isMobile && <TableCell sx={{ color: '#b3b3b3', borderBottom: '1px solid #3d3d3d' }}>Type</TableCell>}
                <TableCell sx={{ color: '#b3b3b3', borderBottom: '1px solid #3d3d3d' }}>Added On</TableCell>
                {!isMobile && <TableCell sx={{ color: '#b3b3b3', borderBottom: '1px solid #3d3d3d' }}>Added By</TableCell>}
                <TableCell align="right" sx={{ color: '#b3b3b3', borderBottom: '1px solid #3d3d3d' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map((doc) => (
                  <TableRow key={doc._id} hover sx={{ '&:hover': { backgroundColor: '#333' } }}>
                    <TableCell sx={{ color: '#ffffff', borderBottom: '1px solid #3d3d3d' }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <MdInsertDriveFile color="#7b68ee" size={20} />
                        <MuiLink
                          onClick={() => handleDownloadClick(doc)}
                          underline="hover"
                          sx={{ color: '#ffffff', fontWeight: 500, cursor: 'pointer' }}
                        >
                          {doc.name}
                        </MuiLink>
                      </Stack>
                    </TableCell>
                    {!isMobile && (
                      <TableCell sx={{ color: '#ffffff', borderBottom: '1px solid #3d3d3d' }}>
                        <Chip
                          label={doc.type || 'LINK'}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: 'rgba(123, 104, 238, 0.1)',
                            color: '#7b68ee'
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell sx={{ color: '#b3b3b3', borderBottom: '1px solid #3d3d3d' }}>
                      {new Date(doc.createdAt || doc.date).toLocaleDateString()}
                    </TableCell>
                    {!isMobile && (
                      <TableCell sx={{ color: '#b3b3b3', borderBottom: '1px solid #3d3d3d' }}>{doc.uploader}</TableCell>
                    )}
                    <TableCell align="right" sx={{ borderBottom: '1px solid #3d3d3d' }}>
                      <Stack direction="row" justifyContent="flex-end" spacing={1}>
                        <Tooltip title="Open Link">
                          <IconButton size="small" onClick={() => handleDownloadClick(doc)} sx={{ color: '#4caf50', '&:hover': { color: '#81c784' } }}>
                            <MdOpenInNew />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Details">
                          <IconButton size="small" onClick={() => handleEditClick(doc)} sx={{ color: '#b3b3b3', '&:hover': { color: '#ffffff' } }}>
                            <MdEdit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDeleteClick(doc)} sx={{ color: '#f44336', '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.1)' } }}>
                            <MdDelete />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#b3b3b3', borderBottom: 'none' }}>
                    No documents found in this section.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Add Link Dialog */}
      <Dialog
        open={openUploadDialog}
        onClose={() => setOpenUploadDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#2d2d2d', color: '#ffffff', backgroundImage: 'none' }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #3d3d3d' }}>Add Document Link</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>

            <FormControl fullWidth>
              <InputLabel sx={{ color: '#b3b3b3', '&.Mui-focused': { color: '#7b68ee' } }}>Category</InputLabel>
              <Select
                value={uploadCategory}
                label="Category"
                onChange={(e) => setUploadCategory(e.target.value)}
                sx={{
                  color: '#ffffff',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#3d3d3d' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#b3b3b3' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7b68ee' },
                  '& .MuiSvgIcon-root': { color: '#b3b3b3' }
                }}
                MenuProps={{
                  PaperProps: { sx: { bgcolor: '#2d2d2d', color: '#ffffff' } }
                }}
              >
                <MenuItem value="field">Shared with Field Teams</MenuItem>
                <MenuItem value="qos">QoS-Related Docs</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Document Name"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  '& fieldset': { borderColor: '#3d3d3d' },
                  '&:hover fieldset': { borderColor: '#b3b3b3' },
                  '&.Mui-focused fieldset': { borderColor: '#7b68ee' },
                },
                '& .MuiInputLabel-root': { color: '#b3b3b3' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#7b68ee' }
              }}
            />

            <TextField
              label="Google Drive Link (URL)"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              fullWidth
              variant="outlined"
              helperText="Paste the shared link here"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  '& fieldset': { borderColor: '#3d3d3d' },
                  '&:hover fieldset': { borderColor: '#b3b3b3' },
                  '&.Mui-focused fieldset': { borderColor: '#7b68ee' },
                },
                '& .MuiInputLabel-root': { color: '#b3b3b3' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#7b68ee' },
                '& .MuiFormHelperText-root': { color: '#b3b3b3' }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #3d3d3d' }}>
          <Button onClick={() => setOpenUploadDialog(false)} sx={{ color: '#b3b3b3' }}>Cancel</Button>
          <Button onClick={handleUpload} variant="contained" sx={{ bgcolor: '#7b68ee', '&:hover': { bgcolor: '#6c5ce7' } }}>
            Add Link
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        // maxWidth="sm"
        fullWidth={!isMobile}
        fullScreen={isMobile}
        PaperProps={{
          sx: { backgroundColor: '#2d2d2d', color: '#ffffff' }
        }}
      >
        <DialogTitle>Edit Document Details</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Document Name"
              type="text"
              fullWidth
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  '& fieldset': { borderColor: '#3d3d3d' },
                  '&:hover fieldset': { borderColor: '#b3b3b3' },
                  '&.Mui-focused fieldset': { borderColor: '#7b68ee' },
                },
                '& .MuiInputLabel-root': { color: '#b3b3b3' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#7b68ee' }
              }}
            />
            <TextField
              margin="dense"
              label="Document URL"
              type="text"
              fullWidth
              value={editLink}
              onChange={(e) => setEditLink(e.target.value)}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  '& fieldset': { borderColor: '#3d3d3d' },
                  '&:hover fieldset': { borderColor: '#b3b3b3' },
                  '&.Mui-focused fieldset': { borderColor: '#7b68ee' },
                },
                '& .MuiInputLabel-root': { color: '#b3b3b3' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#7b68ee' }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEditDialog(false)} sx={{ color: '#b3b3b3' }}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained" sx={{ bgcolor: '#7b68ee', '&:hover': { bgcolor: '#6c5ce7' } }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        PaperProps={{
          sx: { backgroundColor: '#2d2d2d', color: '#ffffff' }
        }}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <b>{currentDoc?.name}</b>?</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeleteDialog(false)} sx={{ color: '#b3b3b3' }}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default DocumentsPortal;
