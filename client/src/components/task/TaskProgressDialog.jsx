import React, { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  LinearProgress,
  Stack,
  alpha,
  useTheme
} from '@mui/material';
import { MdClose } from "react-icons/md";

const TaskProgressDialog = ({ open, onClose, subtasks = [] }) => {
  const theme = useTheme();

  const activeStep = useMemo(() => {
    if (!subtasks || subtasks.length === 0) return 0;
    return subtasks.filter((subtask) => subtask.note !== "").length;
  }, [subtasks]);

  const progress = useMemo(() => {
    if (!subtasks || subtasks.length === 0) return 0;
    return Math.round((100 / subtasks.length) * activeStep);
  }, [subtasks, activeStep]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: theme.palette.background.paper,
          boxShadow: theme.shadows[10],
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Task Progress & Details</Typography>
        <IconButton onClick={onClose}>
          <MdClose />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ p: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Overall Completion</Typography>
            <Typography variant="h6" color="primary.main">{progress}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 10, borderRadius: 5, mb: 4, bgcolor: alpha(theme.palette.primary.main, 0.1) }}
          />

          <Stack spacing={3}>
            {subtasks.map((subtask, index) => (
              <Box key={index} sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: alpha(theme.palette.background.default, 0.5)
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: subtask.note ? 'success.main' : 'text.primary' }}>
                    {index + 1}. {subtask.title}
                  </Typography>
                  {subtask.dateTime && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {new Date(subtask.dateTime).toLocaleString()}
                    </Typography>
                  )}
                </Box>

                {/* Notes */}
                {subtask.note && (
                  <Box sx={{ mt: 1, p: 2, bgcolor: alpha(theme.palette.success.main, 0.05), borderLeft: `4px solid ${theme.palette.success.main}`, borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.primary' }}>
                      "{subtask.note}"
                    </Typography>
                  </Box>
                )}

                {/* Reception Summary */}
                {subtask.shortNote && (
                  <Box sx={{ mt: 1, p: 2, bgcolor: alpha(theme.palette.info.main, 0.05), borderLeft: `4px solid ${theme.palette.info.main}`, borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 700, display: 'block' }}>RECEPTION SUMMARY</Typography>
                    <Typography variant="body2">{subtask.shortNote}</Typography>
                  </Box>
                )}

                {/* Checkpoints */}
                {subtask.checkpoints && subtask.checkpoints.length > 0 && (
                  <Box sx={{ mt: 2, pl: 2 }}>
                    {subtask.checkpoints.map((cp, cpIdx) => (
                      <Box key={cpIdx} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: cp.checked ? 'success.main' : 'text.secondary', fontWeight: cp.checked ? 600 : 400 }}>
                            {cp.checked ? '✓' : '○'} {cp.name}
                          </Typography>
                        </Box>

                        {/* Nested Checkpoint Data Display (read-only) */}
                        {cp.options?.selected && (
                          <Typography variant="caption" sx={{ display: 'block', ml: 3, color: 'text.secondary' }}>
                            Result: {cp.options.choices?.find(c => c.value === cp.options.selected)?.label || cp.options.selected}
                          </Typography>
                        )}
                        {cp.options?.actionTaken?.selected && (
                          <Typography variant="caption" sx={{ display: 'block', ml: 3, color: 'info.main' }}>
                            Action: {cp.options.actionTaken.choices?.find(c => c.value === cp.options.actionTaken.selected)?.label || cp.options.actionTaken.selected}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskProgressDialog;
