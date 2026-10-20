import { useForm } from "react-hook-form";
import api from "../api/api";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  useMediaQuery,
  useTheme
} from "@mui/material";

export const TerminateTeamDialog = ({ open, onClose, teamId, setUpdateTeamStatus }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data) => {
    try {
      const response = await api.post(`/field-teams/terminate-field-team/${teamId}`, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.status === 200) {
        alert("Team terminated successfully!");
        onClose();
        setUpdateTeamStatus(prev => !prev);
      }
    } catch {
      alert("Failed to terminate team.");
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
        "& .MuiDialog-paper": { margin: 0, width: isMobile ? '100%' : '70%', maxWidth: '100%' }
      }}
    >
      <DialogTitle sx={{ padding: isMobile ? '12px 16px' : '16px 24px', position: 'sticky', top: 0, zIndex: 1 }}>
        Terminate Team
      </DialogTitle>
      <DialogContent sx={{ padding: isMobile ? '12px 16px' : '20px 24px', '&::-webkit-scrollbar': {
          width: '4px',
        }, '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#e5e7eb',
          borderRadius: '2px',
        }, "&.MuiDialogContent-root": {
          paddingTop: 3,
        } }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            label="Termination Reason"
            {...register('terminationReason', { required: true })}
            fullWidth
            margin="normal"
            required
          />
        </form>
      </DialogContent>
      <DialogActions sx={{ padding: isMobile ? '8px 16px' : '12px 24px', position: 'sticky', bottom: 0 }}>
        <Button
          onClick={onClose}
          size={isMobile ? "small" : "medium"}
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
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          size={isMobile ? "small" : "medium"}
          sx={{ '&:hover': {
              backgroundColor: '#2563EB'
            } }}
        >
          Terminate
        </Button>
      </DialogActions>
    </Dialog>
  );
};