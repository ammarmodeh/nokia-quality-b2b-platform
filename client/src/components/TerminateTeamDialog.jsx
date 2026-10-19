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
    } catch (error) {
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
        "& .MuiDialog-paper": {
          backgroundColor: 'var(--surface)',
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
        backgroundColor: 'var(--surface)',
        color: 'var(--text)',
        borderBottom: '1px solid var(--border)',
        padding: isMobile ? '12px 16px' : '16px 24px',
        fontWeight: 500,
        position: 'sticky',
        top: 0,
        zIndex: 1
      }}>
        Terminate Team
      </DialogTitle>
      <DialogContent sx={{
        backgroundColor: 'var(--surface)',
        color: 'var(--text)',
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
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            label="Termination Reason"
            {...register('terminationReason', { required: true })}
            fullWidth
            margin="normal"
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'var(--border)',
                },
                '&:hover fieldset': {
                  borderColor: 'var(--accent)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'var(--accent)',
                },
              },
              '& .MuiInputBase-input': {
                color: 'var(--text)',
              },
              '& .MuiInputLabel-root': {
                color: 'var(--text-secondary)',
              },
            }}
          />
        </form>
      </DialogContent>
      <DialogActions sx={{
        backgroundColor: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        padding: isMobile ? '8px 16px' : '12px 24px',
        position: 'sticky',
        bottom: 0
      }}>
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
          sx={{
            backgroundColor: 'var(--accent)',
            color: '#f9fafb',
            '&:hover': {
              backgroundColor: '#1d4ed8'
            }
          }}
        >
          Terminate
        </Button>
      </DialogActions>
    </Dialog>
  );
};