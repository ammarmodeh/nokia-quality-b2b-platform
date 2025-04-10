import { useState } from "react";
import * as XLSX from "xlsx";
import {
  Typography,
  Box,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme
} from "@mui/material";
import {
  FaInfoCircle,
  FaCalendarAlt,
  FaUser,
  FaPhone,
  FaIdCard,
  FaChevronRight,
  FaArrowLeft,
  FaCopy,
  FaWhatsapp,
} from "react-icons/fa";
import { format } from 'date-fns';
import { RiFileExcel2Fill } from "react-icons/ri";

export const ReportedIssueCardDialog = ({ open, onClose, teamIssues, teamName }) => {
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [detailView, setDetailView] = useState(false);
  const [copied, setCopied] = useState(false);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  if (!teamIssues || teamIssues.length === 0) return null;

  const handleShowDetails = (issue) => {
    setSelectedIssue(issue);
    setDetailView(true);
  };

  const handleBackToList = () => {
    setDetailView(false);
    setSelectedIssue(null);
  };

  const copyToClipboard = () => {
    if (!selectedIssue) return;

    const issueText = formatIssueForSharing(selectedIssue);
    navigator.clipboard.writeText(issueText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareOnWhatsApp = () => {
    if (!selectedIssue) return;

    const issueText = formatIssueForSharing(selectedIssue);
    const encodedText = encodeURIComponent(issueText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const formatIssueForSharing = (issue) => {
    return `*Issue Details*\n\n` +
      `*SLID:* ${issue.slid}\n` +
      `*PIS Date:* ${format(new Date(issue.pisDate), 'MMM dd, yyyy')}\n` +
      `*Report Date:* ${format(new Date(issue.date), 'MMM dd, yyyy')}\n` +
      `*Contact Method:* ${issue.contactMethod}\n` +
      `*From Team:* ${issue.from}\n` +
      `*Team/Company:* ${issue.teamCompany}\n` +
      `*Issue Category:* ${issue.issueCategory}\n\n` +
      `*Status:* ${issue.solved === 'yes' ? 'Solved' : 'Unresolved'}\n` +
      `*Reporter:* ${issue.reporter}\n` +
      `${issue.reporterNote ? `*Reporter Notes:*\n${issue.reporterNote}\n\n` : ''}` +
      `*Assigned To:* ${issue.assignedTo}\n` +
      `${issue.assignedNote ? `*Assignee Notes:*\n${issue.assignedNote}\n\n` : ''}` +
      `${issue.resolutionDetails ? `*Resolution Details:*\n${issue.resolutionDetails}\n\n` : ''}`;
  };

  const exportToExcel = () => {
    // Prepare the data for Excel
    const data = teamIssues.map(issue => ({
      'SLID': issue.slid,
      'PIS Date': format(new Date(issue.pisDate), 'MMM dd, yyyy'),
      'Report Date': format(new Date(issue.date), 'MMM dd, yyyy'),
      'Contact Method': issue.contactMethod,
      'From Team': issue.from,
      'Team/Company': issue.teamCompany,
      'Issue Category': issue.issueCategory,
      'Status': issue.solved === 'yes' ? 'Solved' : 'Unresolved',
      'Reporter': issue.reporter,
      'Reporter Notes': issue.reporterNote || '',
      'Assigned To': issue.assignedTo,
      'Assignee Notes': issue.assignedNote || '',
      'Resolution Details': issue.resolutionDetails || ''
    }));

    // Create a worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Create a workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Issues");

    // Generate the Excel file
    XLSX.writeFile(wb, `${teamName}_Issues_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: '#1e1e1e',
          boxShadow: 'none',
          borderRadius: fullScreen ? '0px' : '8px', // Remove border radius for mobile view
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
            padding: '16px 24px',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton
                onClick={handleBackToList}
                sx={{
                  mr: 1,
                  color: '#3ea6ff',
                  '&:hover': {
                    backgroundColor: 'rgba(62, 166, 255, 0.1)',
                  }
                }}
              >
                <FaArrowLeft />
              </IconButton>
              <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FaInfoCircle color="#3ea6ff" /> Customer Issue Details
              </Typography>
            </Box>
            <Box>
              <Tooltip title={copied ? "Copied!" : "Copy to clipboard"} arrow>
                <IconButton
                  onClick={copyToClipboard}
                  sx={{
                    color: '#3ea6ff',
                    '&:hover': {
                      backgroundColor: 'rgba(62, 166, 255, 0.1)',
                    },
                    mr: 1
                  }}
                >
                  <FaCopy />
                </IconButton>
              </Tooltip>
              <Tooltip title="Share via WhatsApp" arrow>
                <IconButton
                  onClick={shareOnWhatsApp}
                  sx={{
                    color: '#25D366',
                    '&:hover': {
                      backgroundColor: 'rgba(37, 211, 102, 0.1)',
                    }
                  }}
                >
                  <FaWhatsapp />
                </IconButton>
              </Tooltip>
            </Box>
          </DialogTitle>

          <DialogContent dividers sx={{
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            padding: '20px 24px',
          }}>
            <Stack spacing={3}>
              {/* SLID */}
              <Box>
                <Typography variant="subtitle2" component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>SLID</Typography>
                <Typography variant="body1" component="div" sx={{ color: '#ffffff' }}>
                  {selectedIssue.slid}
                </Typography>
              </Box>

              {/* Dates */}
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="subtitle2" component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>PIS Date</Typography>
                  <Typography variant="body1" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ffffff' }}>
                    <FaCalendarAlt size={14} color="#3ea6ff" />
                    {format(new Date(selectedIssue.pisDate), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>Report Date</Typography>
                  <Typography variant="body1" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ffffff' }}>
                    <FaCalendarAlt size={14} color="#3ea6ff" />
                    {format(new Date(selectedIssue.date), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ backgroundColor: '#444' }} />

              {/* Reporter Info */}
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="subtitle2" component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>Reporter</Typography>
                  <Typography variant="body1" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ffffff' }}>
                    <FaUser size={14} color="#3ea6ff" /> {selectedIssue.reporter}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>Contact Method</Typography>
                  <Typography variant="body1" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ffffff' }}>
                    <FaPhone size={14} color="#3ea6ff" /> {selectedIssue.contactMethod}
                  </Typography>
                </Box>
              </Box>

              {/* Team Info */}
              <Box>
                <Typography variant="subtitle2" component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>From Team</Typography>
                <Typography variant="body1" component="div" sx={{ color: '#ffffff' }}>
                  {selectedIssue.from}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>Assigned To</Typography>
                <Typography variant="body1" component="div" sx={{ color: '#ffffff' }}>
                  {selectedIssue.assignedTo}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>Team/Company</Typography>
                <Chip
                  label={selectedIssue.teamCompany}
                  size="small"
                  sx={{
                    backgroundColor: '#333',
                    color: '#ffffff',
                    fontWeight: 500,
                    border: '1px solid #3ea6ff'
                  }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>Status</Typography>
                <Chip
                  label={selectedIssue.solved === 'yes' ? 'Solved' : 'Unresolved'}
                  sx={{
                    backgroundColor: selectedIssue.solved === 'yes' ? '#4caf50' : '#6a1b1b',
                    color: '#ffffff',
                    fontWeight: 500
                  }}
                />
              </Box>

              <Divider sx={{ backgroundColor: '#444' }} />

              {/* Issue Details */}
              <Box>
                <Typography variant="subtitle2" component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>Issue Category</Typography>
                <Typography variant="body1" component="div" sx={{ color: '#ffffff' }}>
                  {selectedIssue.issueCategory}
                </Typography>
              </Box>

              {selectedIssue.reporterNote && (
                <Box>
                  <Typography variant="subtitle2" component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>Reporter Notes</Typography>
                  <Box sx={{
                    backgroundColor: '#272727',
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid #444'
                  }}>
                    <Typography variant="body1" component="div" sx={{ color: '#ffffff', whiteSpace: 'pre-line' }}>
                      {selectedIssue.reporterNote}
                    </Typography>
                  </Box>
                </Box>
              )}

              {selectedIssue.assignedNote && (
                <Box>
                  <Typography variant="subtitle2" component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>Assigned Notes</Typography>
                  <Box sx={{
                    backgroundColor: '#272727',
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid #444'
                  }}>
                    <Typography variant="body1" component="div" sx={{ color: '#ffffff', whiteSpace: 'pre-line' }}>
                      {selectedIssue.assignedNote}
                    </Typography>
                  </Box>
                </Box>
              )}

              {selectedIssue.resolutionDetails && (
                <Box>
                  <Typography variant="subtitle2" component="div" sx={{ color: '#aaaaaa', mb: 0.5 }}>Resolution Details</Typography>
                  <Box sx={{
                    backgroundColor: '#272727',
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid #444'
                  }}>
                    <Typography variant="body1" component="div" sx={{ color: '#ffffff', whiteSpace: 'pre-line' }}>
                      {selectedIssue.resolutionDetails}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Stack>
          </DialogContent>
        </>
      ) : (
        <>
          <DialogTitle sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            borderBottom: '1px solid #444',
            padding: '16px 24px',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FaInfoCircle color="#3ea6ff" />
              <Typography variant="h6" component="div" sx={{ ml: 1 }}>
                {teamName} - All Issues ({teamIssues.length})
              </Typography>
            </Box>
            <Tooltip title="Export to Excel">
              <IconButton
                onClick={exportToExcel}
                sx={{
                  color: '#4caf50',
                  '&:hover': {
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  }
                }}
              >
                <RiFileExcel2Fill />
              </IconButton>
            </Tooltip>
          </DialogTitle>

          <DialogContent dividers sx={{
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            padding: 0,
          }}>
            <List>
              {teamIssues.map((issue, index) => (
                <ListItem
                  key={index}
                  onClick={() => handleShowDetails(issue)}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#2a2a2a',
                    },
                    borderBottom: '1px solid #444',
                    padding: '16px 24px',
                    cursor: 'pointer'
                  }}
                >
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: '#3ea6ff' }}>
                      <FaIdCard color="#ffffff" />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body1" component="div" sx={{ color: '#ffffff' }}>
                        {issue.slid}
                      </Typography>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                    secondary={
                      <Box component="div">
                        <Typography variant="body2" component="div" sx={{ color: '#aaaaaa', mt: 0.5 }}>
                          Reporter: {issue.reporter}
                        </Typography>
                        <Typography variant="body2" component="div" sx={{ color: '#aaaaaa' }}>
                          Date: {format(new Date(issue.date), 'MMM dd, yyyy')}
                        </Typography>
                        <Box component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="body2" component="div" sx={{ color: '#aaaaaa' }}>Status:</Typography>
                          <Chip
                            label={issue.solved === 'yes' ? 'Solved' : 'Unresolved'}
                            size="small"
                            sx={{
                              backgroundColor: issue.solved === 'yes' ? '#4caf50' : '#6a1b1b',
                              color: '#ffffff',
                              fontWeight: 500
                            }}
                          />
                        </Box>
                      </Box>
                    }
                  />
                  <FaChevronRight color="#3ea6ff" />
                </ListItem>
              ))}
            </List>
          </DialogContent>
        </>
      )}

      <DialogActions sx={{
        backgroundColor: '#1e1e1e',
        borderTop: '1px solid #444',
        padding: '12px 24px',
      }}>
        <Button
          onClick={onClose}
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
  );
};
