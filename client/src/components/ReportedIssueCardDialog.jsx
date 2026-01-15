import { useState, useEffect } from "react";
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

import { MdClose } from "react-icons/md";
import api from '../api/api';
import { toast } from 'sonner';

export const ReportedIssueCardDialog = ({ open, onClose, teamIssues, teamName }) => {
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [detailView, setDetailView] = useState(false);
  const [copied, setCopied] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (open) {
      setDetailView(false);
      setSelectedIssue(null);
    }
  }, [open, teamIssues]);

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

  const shareOnWhatsApp = async () => {
    if (!selectedIssue) return;

    // Check for installing team
    const installingTeamName = selectedIssue.installingTeam;

    if (!installingTeamName) {
      toast.error('Installing team not specified for this issue');
      return;
    }

    try {
      // Fetch field team data to get contact number
      const response = await api.get('/field-teams/get-field-teams', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      const fieldTeam = response.data.find(team =>
        team.teamName?.trim().toLowerCase() === installingTeamName.trim().toLowerCase()
      );

      if (!fieldTeam || !fieldTeam.contactNumber) {
        toast.error('Team contact number not found');
        return;
      }

      let phoneNumber = fieldTeam.contactNumber;

      // Clean and validate phone number
      let cleanNumber = phoneNumber.toString().trim();
      const hasPlus = cleanNumber.startsWith('+');
      cleanNumber = cleanNumber.replace(/[^0-9]/g, '');
      if (hasPlus && cleanNumber) cleanNumber = '+' + cleanNumber;

      const digitsOnly = cleanNumber.replace(/\+/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        toast.error('Invalid phone number format');
        return;
      }

      const issueText = formatIssueForSharing(selectedIssue);
      const encodedText = encodeURIComponent(issueText);
      window.open(`https://wa.me/${cleanNumber}?text=${encodedText}`, '_blank');
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Failed to fetch team contact information');
    }
  };

  const formatIssueForSharing = (issue) => {
    const issuesMsg = (issue.issues && issue.issues.length > 0)
      ? issue.issues.map(i => `• ${i.category}${i.subCategory ? ` (${i.subCategory})` : ''}`).join('\n  ')
      : issue.issueCategory || 'N/A';

    return `*🔔 Issue Report*\n\n` +
      `*SLID:* ${issue.slid}\n` +
      `*PIS Date:* ${format(new Date(issue.pisDate), 'MMM dd, yyyy')}\n` +
      `*Report Date:* ${format(new Date(issue.date), 'MMM dd, yyyy')}\n` +
      `*Status:* ${issue.solved === 'yes' ? '✅ Resolved' : '⚠️ Unresolved'}\n\n` +

      `*📍 Source & Team*\n` +
      `Team Company: ${issue.teamCompany}\n` +
      `Installing Team: ${issue.installingTeam || 'N/A'}\n` +
      `Assigned To: ${issue.assignedTo || 'Unassigned'}\n\n` +

      `*🔍 Issue Details*\n` +
      `Issues:\n  ${issuesMsg}\n` +
      `${issue.reporterNote ? `Reporter Notes: ${issue.reporterNote}\n` : ''}` +
      `${issue.resolutionDetails ? `\n*✅ Resolution*\nDetails: ${issue.resolutionDetails}\n` : ''}`;
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
      'Issues': (issue.issues && issue.issues.length > 0)
        ? issue.issues.map(i => `${i.category}${i.subCategory ? ` (${i.subCategory})` : ''}`).join(' | ')
        : issue.issueCategory || '',
      'Status': issue.solved === 'yes' ? 'Solved' : 'Unresolved',
      'Resolved Date': issue.resolveDate ? format(new Date(issue.resolveDate), 'MMM dd, yyyy') : '-',
      'Reporter': issue.reporter,
      'Reporter Notes': issue.reporterNote || '',
      'Assigned To': issue.assignedTo,
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
      fullScreen={isMobile}
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: '#2d2d2d',
          boxShadow: 'none',
          borderRadius: isMobile ? 0 : '8px',
        }
      }}
    >
      {detailView ? (
        <>
          <DialogTitle component="div" sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#2d2d2d',
            color: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            padding: isMobile ? '12px 16px' : '16px 24px',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <IconButton
                onClick={handleBackToList}
                size={isMobile ? "small" : "medium"}
                sx={{
                  mr: 1,
                  color: '#7b68ee',
                  '&:hover': {
                    backgroundColor: 'rgba(62, 166, 255, 0.1)',
                  }
                }}
              >
                <FaArrowLeft fontSize={isMobile ? "14px" : "16px"} />
              </IconButton>
              <Typography variant={isMobile ? "subtitle1" : "h6"} component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FaInfoCircle color="#7b68ee" size={isMobile ? 16 : 20} />
                <Box component="span">Customer Issue Details</Box>
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title={copied ? "Copied!" : "Copy to clipboard"} arrow>
                <IconButton
                  onClick={copyToClipboard}
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    color: '#7b68ee',
                    '&:hover': {
                      backgroundColor: 'rgba(62, 166, 255, 0.1)',
                    }
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
              <IconButton
                onClick={onClose}
                size={isMobile ? "small" : "medium"}
                sx={{
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                <MdClose />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent dividers sx={{
            backgroundColor: '#2d2d2d',
            color: '#ffffff',
            padding: isMobile ? '12px 16px' : '20px 24px',
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#e5e7eb',
              borderRadius: '2px',
            },
          }}>
            <Stack spacing={isMobile ? 2 : 3}>
              {/* SLID */}
              <Box>
                <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#b3b3b3', mb: 0.5 }}>SLID</Typography>
                <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ color: '#ffffff' }}>
                  {selectedIssue.slid}
                </Typography>
              </Box>

              {/* Dates */}
              <Box sx={{ display: 'flex', gap: isMobile ? 2 : 3, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#b3b3b3', mb: 0.5 }}>PIS Date</Typography>
                  <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ffffff' }}>
                    <FaCalendarAlt size={isMobile ? 12 : 14} color="#7b68ee" />
                    {format(new Date(selectedIssue.pisDate), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#b3b3b3', mb: 0.5 }}>Report Date</Typography>
                  <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ffffff' }}>
                    <FaCalendarAlt size={isMobile ? 12 : 14} color="#7b68ee" />
                    {format(new Date(selectedIssue.date), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ backgroundColor: '#e5e7eb' }} />

              {/* Customer Info */}
              <Box sx={{ display: 'flex', gap: isMobile ? 2 : 3, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#b3b3b3', mb: 0.5 }}>Customer Name</Typography>
                  <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ffffff' }}>
                    <FaUser size={isMobile ? 12 : 14} color="#7b68ee" /> {selectedIssue.customerName || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#b3b3b3', mb: 0.5 }}>Customer Contact</Typography>
                  <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ffffff' }}>
                    <FaPhone size={isMobile ? 12 : 14} color="#7b68ee" /> {selectedIssue.customerContact || 'N/A'}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ backgroundColor: '#e5e7eb' }} />

              {/* Reporter Info */}
              <Box sx={{ display: 'flex', gap: isMobile ? 2 : 3, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#b3b3b3', mb: 0.5 }}>Reporter</Typography>
                  <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ffffff' }}>
                    <FaUser size={isMobile ? 12 : 14} color="#7b68ee" /> {selectedIssue.reporter}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#b3b3b3', mb: 0.5 }}>Contact Method</Typography>
                  <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ffffff' }}>
                    <FaPhone size={isMobile ? 12 : 14} color="#7b68ee" /> {selectedIssue.contactMethod}
                  </Typography>
                </Box>
              </Box>

              {/* Team Info */}
              <Box>
                <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#b3b3b3', mb: 0.5 }}>From Team</Typography>
                <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ color: '#ffffff' }}>
                  {selectedIssue.from}
                </Typography>
              </Box>

              <Box>
                <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#b3b3b3', mb: 0.5 }}>Installing Team</Typography>
                <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ color: '#ffffff' }}>
                  {selectedIssue.installingTeam || 'N/A'}
                </Typography>
              </Box>

              <Box>
                <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#b3b3b3', mb: 0.5 }}>Assigned To</Typography>
                <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ color: '#ffffff' }}>
                  {selectedIssue.assignedTo}
                </Typography>
              </Box>

              <Box>
                <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#b3b3b3', mb: 0.5 }}>Team/Company</Typography>
                <Chip
                  label={selectedIssue.teamCompany}
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    backgroundColor: '#2d2d2d',
                    color: '#ffffff',
                    fontWeight: 500,
                    border: '1px solid #7b68ee'
                  }}
                />
              </Box>

              <Box>
                <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#b3b3b3', mb: 0.5 }}>Status</Typography>
                <Chip
                  label={selectedIssue.solved === 'yes' ? 'Solved' : 'Unresolved'}
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    backgroundColor: selectedIssue.solved === 'yes' ? '#4caf50' : '#6a1b1b',
                    color: '#ffffff',
                    fontWeight: 500
                  }}
                />
              </Box>

              {selectedIssue.solved === 'yes' && selectedIssue.resolveDate && (
                <Box>
                  <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#b3b3b3', mb: 0.5 }}>Resolved Date</Typography>
                  <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ffffff' }}>
                    <FaCalendarAlt size={isMobile ? 12 : 14} color="#7b68ee" />
                    {format(new Date(selectedIssue.resolveDate), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ backgroundColor: '#e5e7eb' }} />

              {/* Issue Details */}
              <Box>
                <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#b3b3b3', mb: 0.5 }}>Issue Category</Typography>
                {selectedIssue.issues && selectedIssue.issues.length > 0 ? (
                  <Stack spacing={1}>
                    {selectedIssue.issues.map((i, idx) => (
                      <Box key={idx} sx={{
                        backgroundColor: '#2d2d2d',
                        p: 1.5,
                        borderRadius: 1,
                        border: '1px solid #3d3d3d'
                      }}>
                        <Typography variant={isMobile ? "body2" : "body1"} sx={{ color: '#ffffff' }}>
                          {i.category}{i.subCategory ? ` - ${i.subCategory}` : ''}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ color: '#ffffff' }}>
                    {selectedIssue.issueCategory}
                  </Typography>
                )}
              </Box>

              {selectedIssue.reporterNote && (
                <Box>
                  <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#b3b3b3', mb: 0.5 }}>Reporter Notes</Typography>
                  <Box sx={{
                    backgroundColor: '#2d2d2d',
                    p: isMobile ? 1.5 : 2,
                    borderRadius: 1,
                    border: '1px solid #3d3d3d'
                  }}>
                    <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ color: '#ffffff', whiteSpace: 'pre-line' }}>
                      {selectedIssue.reporterNote}
                    </Typography>
                  </Box>
                </Box>
              )}

              {selectedIssue.resolutionDetails && (
                <Box>
                  <Typography variant={isMobile ? "caption" : "subtitle2"} component="div" sx={{ color: '#b3b3b3', mb: 0.5 }}>Resolution Details</Typography>
                  <Box sx={{
                    backgroundColor: '#2d2d2d',
                    p: isMobile ? 1.5 : 2,
                    borderRadius: 1,
                    border: '1px solid #3d3d3d'
                  }}>
                    <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ color: '#ffffff', whiteSpace: 'pre-line' }}>
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
          <DialogTitle component="div" sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#2d2d2d',
            color: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            padding: isMobile ? '12px 16px' : '16px 24px',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FaInfoCircle color="#7b68ee" size={isMobile ? 16 : 20} />
              <Typography variant={isMobile ? "subtitle1" : "h6"} component="div" sx={{ ml: 1, fontWeight: 500 }}>
                {teamName} - All Issues ({teamIssues.length})
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Export to Excel">
                <IconButton
                  onClick={exportToExcel}
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    color: '#4caf50',
                    '&:hover': {
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    }
                  }}
                >
                  <RiFileExcel2Fill fontSize={isMobile ? "16px" : "20px"} />
                </IconButton>
              </Tooltip>
              <IconButton
                onClick={onClose}
                size={isMobile ? "small" : "medium"}
                sx={{
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                <MdClose />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent dividers sx={{
            backgroundColor: '#2d2d2d',
            color: '#ffffff',
            padding: 0,
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#e5e7eb',
              borderRadius: '2px',
            },
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
                    borderBottom: '1px solid #e5e7eb',
                    padding: isMobile ? '12px 16px' : '16px 24px',
                    cursor: 'pointer'
                  }}
                >
                  <ListItemIcon>
                    <Avatar sx={{
                      bgcolor: '#7b68ee',
                      width: isMobile ? 36 : 40,
                      height: isMobile ? 36 : 40
                    }}>
                      <FaIdCard color="#ffffff" size={isMobile ? 16 : 18} />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant={isMobile ? "body2" : "body1"} component="div" sx={{ color: '#ffffff' }}>
                        {issue.slid}
                      </Typography>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                    secondary={
                      <Box component="div">
                        <Typography variant={isMobile ? "caption" : "body2"} component="div" sx={{ color: '#b3b3b3', mt: 0.5 }}>
                          Customer: {issue.customerName || 'N/A'} - {issue.customerContact || 'N/A'}
                        </Typography>
                        <Typography variant={isMobile ? "caption" : "body2"} component="div" sx={{ color: '#b3b3b3' }}>
                          Reporter: {issue.reporter}
                        </Typography>
                        <Typography variant={isMobile ? "caption" : "body2"} component="div" sx={{ color: '#b3b3b3' }}>
                          Date: {format(new Date(issue.date), 'MMM dd, yyyy')}
                        </Typography>
                        <Box component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant={isMobile ? "caption" : "body2"} component="div" sx={{ color: '#b3b3b3' }}>Status:</Typography>
                          <Chip
                            label={issue.solved === 'yes' ? 'Solved' : 'Unresolved'}
                            size={isMobile ? "small" : "medium"}
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
                  <FaChevronRight color="#7b68ee" size={isMobile ? 14 : 16} />
                </ListItem>
              ))}
            </List>
          </DialogContent>
        </>
      )}

      <DialogActions sx={{
        backgroundColor: '#2d2d2d',
        borderTop: '1px solid #e5e7eb',
        padding: isMobile ? '8px 16px' : '12px 24px',
      }}>
        <Button
          onClick={onClose}
          size={isMobile ? "small" : "medium"}
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