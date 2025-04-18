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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EditSessionDialog from "./EditSessionDialog";
import { useState } from "react";
import { useSelector } from "react-redux";

const ViewSessionsDialog = ({ open, onClose, sessions, onEditSession, onDeleteSession }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const user = useSelector((state) => state.auth.user);
  const [editSessionDialogOpen, setEditSessionDialogOpen] = useState(false);
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

  const renderSessionList = (sessionList) => {
    return (
      <List sx={{ padding: 0 }}>
        {sessionList.length === 0 ? (
          <Typography variant="body1" color="#aaaaaa" sx={{ p: 2 }}>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                      {session.conductedBy && (
                        <Typography
                          component="div"
                          variant="body2"
                          color="#aaaaaa"
                          sx={{ mt: 1 }}
                        >
                          <strong>Conducted by:</strong> {session.conductedBy}
                        </Typography>
                      )}
                      {session.outlines && (
                        <Typography
                          component="div"
                          variant="body2"
                          color="#aaaaaa"
                          sx={{ mt: 1 }}
                        >
                          <strong>Outlines:</strong> {session.outlines}
                        </Typography>
                      )}
                      {session.notes && (
                        <Typography
                          component="div"
                          variant="body2"
                          color="#aaaaaa"
                          sx={{ mt: 1 }}
                        >
                          <strong>Notes:</strong> {session.notes}
                        </Typography>
                      )}
                      {session.reason && (
                        <Typography
                          component="div"
                          variant="body2"
                          color="#aaaaaa"
                          sx={{ mt: 1, fontStyle: 'italic' }}
                        >
                          <strong>Reason:</strong> {session.reason}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                {user && user.role === "Admin" && (
                  <Box sx={{ display: 'flex' }}>
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
                  </Box>
                )}
              </ListItem>
              {index < sessionList.length - 1 && (
                <Divider sx={{ backgroundColor: '#444' }} />
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
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
        sx={{
          "& .MuiDialog-paper": {
            backgroundColor: '#1e1e1e',
            boxShadow: 'none',
            borderRadius: fullScreen ? '0px' : '8px',
          }
        }}
      >
        <DialogTitle sx={{
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          borderBottom: '1px solid #444',
          padding: '16px 24px',
        }}>
          Training Session History
          <Typography variant="body2" color="#aaaaaa">
            {completedSessions.length} completed session(s) | {missedOrCanceledSessions.length} missed/canceled
          </Typography>
        </DialogTitle>

        <Divider sx={{ backgroundColor: '#444' }} />

        <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#1e1e1e' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: '#3ea6ff',
              },
            }}
          >
            <Tab
              label={`Completed (${completedSessions.length})`}
              sx={{
                color: activeTab === 0 ? '#3ea6ff' : '#aaaaaa',
                textTransform: 'none',
                minWidth: 'unset',
                padding: '12px 16px',
              }}
            />
            <Tab
              label={`Missed/Canceled (${missedOrCanceledSessions.length})`}
              sx={{
                color: activeTab === 1 ? '#3ea6ff' : '#aaaaaa',
                textTransform: 'none',
                minWidth: 'unset',
                padding: '12px 16px',
              }}
            />
          </Tabs>
        </Box>

        <DialogContent sx={{
          backgroundColor: '#1e1e1e',
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

        <Divider sx={{ backgroundColor: '#444' }} />

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

      <EditSessionDialog
        open={editSessionDialogOpen}
        onClose={handleEditSessionDialogClose}
        session={selectedSession}
        onSave={handleSaveEdit}
      />
    </>
  );
};

export default ViewSessionsDialog;