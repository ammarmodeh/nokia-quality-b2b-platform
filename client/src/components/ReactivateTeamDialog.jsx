import api from "../api/api";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useMediaQuery,
  useTheme,
  Typography
} from "@mui/material";

export const ReactivateTeamDialog = ({ open, onClose, teamId, setUpdateTeamStatus }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleReactivate = async () => {
    try {
      const response = await api.post(`/field-teams/reactivate-field-team/${teamId}`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.status === 200) {
        alert("Team reactivated successfully!");
        onClose();
        setUpdateTeamStatus(prev => !prev);
      }
    } catch (error) {
      alert("Failed to reactivate team.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      fullWidth
      maxWidth="md"
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: '#2d2d2d',
          boxShadow: 'none',
          borderRadius: isMobile ? 0 : '8px',
          border: isMobile ? 'none' : '1px solid #e5e7eb',
          margin: 0,
          width: isMobile ? '100%' : '70%',
          maxWidth: '100%'
        }
      }}
    >
      <DialogTitle sx={{
        backgroundColor: '#2d2d2d',
        color: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: isMobile ? '12px 16px' : '16px 24px',
        fontWeight: 500,
        position: 'sticky',
        top: 0,
        zIndex: 1
      }}>
        Reactivate Team
      </DialogTitle>
      <DialogContent sx={{
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
        "&.MuiDialogContent-root": {
          paddingTop: 3,
        }
      }}>
        <Typography variant="body1">
          Are you sure you want to reactivate this team?
        </Typography>
      </DialogContent>
      <DialogActions sx={{
        backgroundColor: '#2d2d2d',
        borderTop: '1px solid #e5e7eb',
        padding: isMobile ? '8px 16px' : '12px 24px',
        position: 'sticky',
        bottom: 0
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
          Cancel
        </Button>
        <Button
          onClick={handleReactivate}
          variant="contained"
          size={isMobile ? "small" : "medium"}
          sx={{
            backgroundColor: '#7b68ee',
            color: '#f9fafb',
            '&:hover': {
              backgroundColor: '#1d4ed8'
            }
          }}
        >
          Reactivate
        </Button>
      </DialogActions>
    </Dialog>
  );
};