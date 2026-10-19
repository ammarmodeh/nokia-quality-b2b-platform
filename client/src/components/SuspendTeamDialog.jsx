import { useForm, Controller } from "react-hook-form";
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
import { format, isAfter } from "date-fns";

export const SuspendTeamDialog = ({ open, onClose, teamId, setUpdateTeamStatus }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm();

  const startDate = watch("suspensionStartDate");
  const endDate = watch("suspensionEndDate");

  const onSubmit = async (data) => {
    try {
      const formattedData = {
        ...data,
        suspensionStartDate: format(new Date(data.suspensionStartDate), "yyyy-MM-dd"),
        suspensionEndDate: format(new Date(data.suspensionEndDate), "yyyy-MM-dd"),
      };

      const response = await api.post(`/field-teams/suspend-field-team/${teamId}`, formattedData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (response.status === 200) {
        alert("Team suspended successfully!");
        onClose();
        reset();
        setUpdateTeamStatus(prev => !prev);
      }
    } catch (error) {
      alert("Failed to suspend team.");
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
        Suspend Team
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
          <Controller
            name="suspensionStartDate"
            control={control}
            defaultValue=""
            rules={{ required: "Start date is required" }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                label="Suspension Start Date"
                type="date"
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                error={!!error}
                helperText={error ? error.message : null}
                inputProps={{
                  max: endDate || format(new Date(), "yyyy-MM-dd"),
                }}
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
                  '& .MuiFormHelperText-root': {
                    color: '#f44336',
                  },
                }}
              />
            )}
          />

          <Controller
            name="suspensionEndDate"
            control={control}
            defaultValue=""
            rules={{
              required: "End date is required",
              validate: (value) =>
                isAfter(new Date(value), new Date(startDate)) || "End date must be after start date",
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                label="Suspension End Date"
                type="date"
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                error={!!error}
                helperText={error ? error.message : null}
                inputProps={{
                  min: startDate || format(new Date(), "yyyy-MM-dd"),
                }}
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
                  '& .MuiFormHelperText-root': {
                    color: '#f44336',
                  },
                }}
              />
            )}
          />

          <Controller
            name="suspensionReason"
            control={control}
            defaultValue=""
            rules={{ required: "Suspension reason is required" }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                label="Suspension Reason"
                fullWidth
                margin="normal"
                error={!!error}
                helperText={error ? error.message : null}
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
                  '& .MuiFormHelperText-root': {
                    color: '#f44336',
                  },
                }}
              />
            )}
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
          Suspend
        </Button>
      </DialogActions>
    </Dialog>
  );
};