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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EditSessionDialog from "./EditSessionDialog";
import { useState } from "react";
import { useSelector } from "react-redux";

const ViewSessionsDialog = ({ open, onClose, sessions, onEditSession, onDeleteSession }) => {
  const user = useSelector((state) => state.auth.user);
  const [editSessionDialogOpen, setEditSessionDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const handleEditClick = (session) => {
    // Only allow editing for completed sessions
    if (session.status !== "Completed") {
      return;
    }
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

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
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
          Training Session History
          <Typography variant="body2" color="#aaaaaa">
            {sessions.length} session(s) recorded
          </Typography>
        </DialogTitle>

        <Divider sx={{ backgroundColor: '#444' }} />

        <DialogContent sx={{
          backgroundColor: '#1e1e1e',
          color: '#ffffff',
          '&.MuiDialogContent-root': {
            padding: '20px 24px',
          },
        }}>
          {sessions.length === 0 ? (
            <Typography variant="body1" color="#aaaaaa">
              No training sessions found.
            </Typography>
          ) : (
            <List sx={{ padding: 0 }}>
              {sessions.map((session, index) => (
                <div key={session._id || index}>
                  <ListItem sx={{
                    padding: '12px 0',
                    alignItems: 'flex-start',
                    '&:hover': {
                      backgroundColor: '#2a2a2a',
                    }
                  }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography color="#ffffff" fontWeight="500">
                            {session.sessionTitle || "Training Session"}
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
                          <Typography
                            component="div"
                            variant="body2"
                            color="#aaaaaa"
                            sx={{ mt: 1 }}
                          >
                            <strong>Conducted by:</strong> {session.conductedBy}
                          </Typography>
                          {session.outlines && (
                            <Typography
                              component="div"
                              variant="body2"
                              color="#aaaaaa"
                              sx={{ mt: 1 }}
                            >
                              <strong>Training Outlines:</strong> {session.outlines}
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
                  {index < sessions.length - 1 && (
                    <Divider sx={{ backgroundColor: '#444' }} />
                  )}
                </div>
              ))}
            </List>
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