import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  IconButton,
  Divider,
  Box,
  Chip,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  Stack
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditSessionDialog from "./EditSessionDialog";
import SessionDetailsDialog from "./SessionDetailsDialog";
import { useState } from "react";
import { useSelector } from "react-redux";
import * as XLSX from "xlsx";
import { RiFileExcel2Fill } from "react-icons/ri";
import { FaFilePdf } from "react-icons/fa6";
import api from "../api/api";
import { toast } from "sonner";

const ViewSessionsDialog = ({ open, onClose, sessions, onEditSession, onDeleteSession, teamName }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const user = useSelector((state) => state.auth.user);
  const [editSessionDialogOpen, setEditSessionDialogOpen] = useState(false);
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // Filter sessions by status
  const completedSessions = sessions.filter(session => session.status === "Completed");
  const missedOrCanceledSessions = sessions.filter(session =>
    session.status === "Missed" || session.status === "Cancelled"
  );

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleEditClick = (session) => {
    setSelectedSession(session);
    setEditSessionDialogOpen(true);
  };

  const handleEditSessionDialogClose = () => {
    setEditSessionDialogOpen(false);
    setSelectedSession(null);
  };

  const handleViewClick = (session) => {
    setSelectedSession(session);
    setViewDetailsDialogOpen(true);
  };

  const handleViewDetailsDialogClose = () => {
    setViewDetailsDialogOpen(false);
    setSelectedSession(null);
  };

  const handleSaveEdit = (updatedSession) => {
    onEditSession(updatedSession);
    handleEditSessionDialogClose();
  };

  const handleDeleteClick = (session) => {
    if (!confirm(`Are you sure you want to delete this ${session.status.toLowerCase()} session?`)) {
      return;
    }
    onDeleteSession(session);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "success";
      case "Missed":
        return "error";
      case "Cancelled":
        return "warning";
      default:
        return "default";
    }
  };

  const handleExportExcel = () => {
    const data = sessions.map(session => {
      // Format outlines into a readable string
      let outlinesText = "None";
      if (typeof session.outlines === 'string' && session.outlines.trim()) {
        outlinesText = session.outlines;
      } else if (Array.isArray(session.outlines) && session.outlines.length > 0) {
        outlinesText = session.outlines.map((o, i) => {
          let item = `${i + 1}. ${o.mainTopic}`;
          if (o.subTopics && o.subTopics.length > 0) {
            item += `\n   - ${o.subTopics.join('\n   - ')}`;
          }
          return item;
        }).join('\n');
      }

      return {
        "Date": new Date(session.sessionDate).toLocaleDateString(),
        "Title": session.sessionTitle || "Training Session",
        "Type": session.sessionType || "N/A",
        "Status": session.status,
        "Conducted By": Array.isArray(session.conductedBy) ? session.conductedBy.join(", ") : session.conductedBy,
        "Location": session.location || "N/A",
        "Duration": session.duration || "N/A",
        "Violation Points": session.violationPoints || 0,
        "Notes": session.notes || "",
        "Reason for Status": session.reason || "N/A",
        "Detailed Outlines": outlinesText,
        "Created At": session.createdAt ? new Date(session.createdAt).toLocaleString() : "N/A"
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);

    // Adjust column widths
    const wscols = [
      { wch: 15 }, // Date
      { wch: 40 }, // Title
      { wch: 20 }, // Type
      { wch: 15 }, // Status
      { wch: 30 }, // Conducted By
      { wch: 20 }, // Location
      { wch: 15 }, // Duration
      { wch: 10 }, // Points
      { wch: 50 }, // Notes
      { wch: 40 }, // Reason
      { wch: 80 }, // Outlines
      { wch: 20 }, // Created At
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sessions");
    const fileName = teamName
      ? `Session_History_${teamName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `Session_History_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleExportPDF = async () => {
    try {
      if (!sessions || sessions.length === 0) {
        toast.error("No sessions available to export.");
        return;
      }

      const reportTitle = `Training Session History: ${teamName || "Field Team"}`;

      // 1. Summary Table Rows
      const tableRows = sessions.map(session => {
        const date = new Date(session.sessionDate).toLocaleDateString();
        const title = (session.sessionTitle || "Training Session").replace(/\|/g, '\\|');
        const type = (session.sessionType || "N/A").replace(/\|/g, '\\|');
        const status = (session.status).replace(/\|/g, '\\|');
        const pts = session.violationPoints || 0;

        return `| ${date} | ${title} | ${type} | ${status} | ${pts} |`;
      }).join('\n');

      // 2. Detailed Session Sections
      const detailedSections = sessions.map((session, index) => {
        const date = new Date(session.sessionDate).toLocaleDateString();
        const conductedBy = Array.isArray(session.conductedBy) ? session.conductedBy.join(", ") : session.conductedBy;

        let outlinesMd = "None";
        if (typeof session.outlines === 'string' && session.outlines.trim()) {
          outlinesMd = session.outlines;
        } else if (Array.isArray(session.outlines)) {
          outlinesMd = session.outlines.map((o, i) => {
            let item = `${i + 1}. **${o.mainTopic}**`;
            if (o.subTopics && o.subTopics.length > 0) {
              item += `\n   - ${o.subTopics.join('\n   - ')}`;
            }
            return item;
          }).join('\n');
        }

        return `
### ${index + 1}. ${session.sessionTitle || "Training Session"} (${date})
- **Status**: ${session.status}
- **Type**: ${session.sessionType || "N/A"}
- **Location**: ${session.location || "N/A"}
- **Duration**: ${session.duration || "N/A"}
- **Conducted By**: ${conductedBy}
- **Violation Points**: ${session.violationPoints || 0}
${session.status !== 'Completed' ? `- **Reason for ${session.status}**: ${session.reason || "N/A"}` : ""}
- **Notes**: ${session.notes || "None"}

**Training Outlines**:
${outlinesMd}

---
`;
      }).join('\n');

      const markdownContent = `
**Team Name**: ${teamName || "N/A"}
**Total Sessions**: ${sessions.length}
**Export Date**: ${new Date().toLocaleString()}

## Summary View

| Date | Title | Type | Status | Points |
| :--- | :--- | :--- | :--- | :--- |
${tableRows}

## Detailed Session Reports

${detailedSections}

---
*Generated by QoS Track Manager*
`;

      const fileName = teamName
        ? `Session_History_${teamName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`
        : `Session_History_${new Date().toISOString().slice(0, 10)}`;

      const response = await api.post('/ai/report/download', {
        reportContent: markdownContent,
        title: reportTitle,
        format: 'pdf'
      }, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${fileName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Failed to export PDF");
    }
  };

  const renderSessionList = (sessionList) => {
    return (
      <List sx={{ padding: 0 }}>
        {sessionList.length === 0 ? (
          <Typography variant="body1" color="#6b7280" sx={{ p: 2 }}>
            No sessions found in this category.
          </Typography>
        ) : (
          sessionList.map((session, index) => (
            <div key={session._id || index}>
              <ListItem sx={{
                padding: '12px',
                alignItems: 'flex-start',
                '&:hover': {
                  backgroundColor: '#2a2a2a',
                }
              }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography color="#ffffff" fontWeight="500">
                        {session.sessionTitle || (session.status === "Completed" ? "Training Session" : session.status)}
                      </Typography>
                      <Chip
                        label={new Date(session.sessionDate).toLocaleDateString()}
                        size="small"
                        sx={{
                          backgroundColor: '#3a3a3a',
                          color: '#ffffff',
                          fontSize: '0.7rem'
                        }}
                      />
                      <Chip
                        label={session.status}
                        size="small"
                        color={getStatusColor(session.status)}
                        sx={{ fontSize: '0.7rem' }}
                      />
                      {session.sessionType && (
                        <Chip
                          label={session.sessionType}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: '0.7rem',
                            color: '#9ca3af',
                            borderColor: '#4b5563'
                          }}
                        />
                      )}
                      {session.violationPoints > 0 && (
                        <Chip
                          label={`${session.violationPoints} pts`}
                          size="small"
                          color="error"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                  secondary={
                    <Box component="div">
                      <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mt: 1 }}>
                        <Typography variant="body2" color="#6b7280">
                          <strong>Conducted by:</strong>{" "}
                          {Array.isArray(session.conductedBy)
                            ? session.conductedBy.join(", ")
                            : session.conductedBy}
                        </Typography>
                        {session.location && (
                          <Typography variant="body2" color="#6b7280">
                            <strong>Location:</strong> {session.location}
                          </Typography>
                        )}
                        {session.duration && (
                          <Typography variant="body2" color="#6b7280">
                            <strong>Duration:</strong> {session.duration}
                          </Typography>
                        )}
                      </Stack>

                      {session.outlines && (
                        <Box component="div" sx={{ mt: 1 }}>
                          <Typography
                            component="div"
                            variant="body2"
                            color="#6b7280"
                            sx={{ fontWeight: 'bold', mb: 0.5 }}
                          >
                            Training Outlines:
                          </Typography>
                          {typeof session.outlines === 'string' ? (
                            <Typography
                              component="div"
                              variant="body2"
                              color="#6b7280"
                              sx={{ pl: 2 }}
                            >
                              {session.outlines}
                            </Typography>
                          ) : Array.isArray(session.outlines) ? (
                            <Box sx={{ pl: 2 }}>
                              {session.outlines.map((outline, idx) => (
                                <Box key={idx} sx={{ mb: 1 }}>
                                  <Typography
                                    variant="body2"
                                    color="#ffffff"
                                    sx={{ fontWeight: '500' }}
                                  >
                                    {idx + 1}. {outline.mainTopic}
                                  </Typography>
                                  {outline.subTopics && outline.subTopics.length > 0 && (
                                    <Box sx={{ pl: 2 }}>
                                      {outline.subTopics.map((subTopic, subIdx) => (
                                        <Typography
                                          key={subIdx}
                                          variant="body2"
                                          color="#9ca3af"
                                          sx={{ fontSize: '0.85rem' }}
                                        >
                                          • {subTopic}
                                        </Typography>
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              ))}
                            </Box>
                          ) : null}
                        </Box>
                      )}
                      {session.notes && (
                        <Typography
                          component="div"
                          variant="body2"
                          color="#6b7280"
                          sx={{ mt: 1 }}
                        >
                          <strong>Notes:</strong> {session.notes}
                        </Typography>
                      )}
                      {session.reason && (
                        <Typography
                          component="div"
                          variant="body2"
                          color="#6b7280"
                          sx={{ mt: 1, fontStyle: 'italic' }}
                        >
                          <strong>Reason:</strong> {session.reason}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton
                    onClick={() => handleViewClick(session)}
                    sx={{ color: '#7b68ee' }}
                    size="small"
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                  {user && user.role === "Admin" && (
                    <>
                      {session.status === "Completed" && (
                        <IconButton
                          onClick={() => handleEditClick(session)}
                          sx={{ color: '#1976d2' }}
                          size="small"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        onClick={() => handleDeleteClick(session)}
                        sx={{ color: '#f44336' }}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Box>

              </ListItem>
              {index < sessionList.length - 1 && (
                <Divider sx={{ backgroundColor: '#e5e7eb' }} />
              )}
            </div>
          ))
        )}
      </List>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        fullScreen={fullScreen}
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: '#2d2d2d',
            boxShadow: 'none',
            borderRadius: fullScreen ? '0px' : '8px',
          }
        }}
      >
        <DialogTitle sx={{
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box>
            Training Session History
            <Typography variant="body2" color="#6b7280">
              {completedSessions.length} completed session(s) | {missedOrCanceledSessions.length} missed/canceled
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<RiFileExcel2Fill />}
              onClick={handleExportExcel}
              size="small"
              sx={{
                color: '#4caf50',
                borderColor: '#4caf50',
                '&:hover': {
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  borderColor: '#4caf50',
                }
              }}
            >
              Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={<FaFilePdf />}
              onClick={handleExportPDF}
              size="small"
              sx={{
                color: '#f44336',
                borderColor: '#f44336',
                '&:hover': {
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  borderColor: '#f44336',
                }
              }}
            >
              PDF
            </Button>
          </Stack>
        </DialogTitle>

        <Divider sx={{ backgroundColor: '#e5e7eb' }} />

        <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#2d2d2d' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: '#7b68ee',
              },
            }}
          >
            <Tab
              label={`Completed (${completedSessions.length})`}
              sx={{
                color: activeTab === 0 ? '#7b68ee' : '#6b7280',
                textTransform: 'none',
                minWidth: 'unset',
                padding: '12px 16px',
              }}
            />
            <Tab
              label={`Missed/Canceled (${missedOrCanceledSessions.length})`}
              sx={{
                color: activeTab === 1 ? '#7b68ee' : '#6b7280',
                textTransform: 'none',
                minWidth: 'unset',
                padding: '12px 16px',
              }}
            />
          </Tabs>
        </Box>

        <DialogContent sx={{
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
          '&.MuiDialogContent-root': {
            padding: '0',
          },
          height: fullScreen ? 'calc(100vh - 180px)' : '400px',
          overflow: 'auto',
        }}>
          {activeTab === 0 ? (
            renderSessionList(completedSessions)
          ) : (
            renderSessionList(missedOrCanceledSessions)
          )}
        </DialogContent>

        <Divider sx={{ backgroundColor: '#e5e7eb' }} />

        <DialogActions sx={{
          backgroundColor: '#2d2d2d',
          borderTop: '1px solid #e5e7eb',
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

      <EditSessionDialog
        open={editSessionDialogOpen}
        onClose={handleEditSessionDialogClose}
        session={selectedSession}
        onSave={handleSaveEdit}
      />

      <SessionDetailsDialog
        open={viewDetailsDialogOpen}
        onClose={handleViewDetailsDialogClose}
        session={selectedSession}
      />
    </>
  );
};

export default ViewSessionsDialog;