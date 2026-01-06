import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Chip,
  Stack,
  useTheme,
  useMediaQuery,
} from "@mui/material";

const SessionDetailsDialog = ({ open, onClose, session }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  if (!session) return null;

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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      sx={{
        "& .MuiDialog-paper": {
          backgroundColor: "#2d2d2d",
          color: "#ffffff",
          borderRadius: fullScreen ? "0px" : "8px",
        },
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: "1px solid #4b5563",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          Session Details
        </Typography>
        <Chip
          label={session.status}
          color={getStatusColor(session.status)}
          size="small"
        />
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" color="#9ca3af" display="block">
              Title
            </Typography>
            <Typography variant="body1" fontWeight="500">
              {session.sessionTitle || "Training Session"}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 4 }}>
            <Box>
              <Typography variant="caption" color="#9ca3af" display="block">
                Date
              </Typography>
              <Typography variant="body2">
                {new Date(session.sessionDate).toLocaleDateString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="#9ca3af" display="block">
                Type
              </Typography>
              <Typography variant="body2">{session.sessionType || "N/A"}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 4 }}>
            <Box>
              <Typography variant="caption" color="#9ca3af" display="block">
                Duration
              </Typography>
              <Typography variant="body2">{session.duration || "N/A"}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="#9ca3af" display="block">
                Location
              </Typography>
              <Typography variant="body2">{session.location || "N/A"}</Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="caption" color="#9ca3af" display="block">
              Conducted By
            </Typography>
            <Typography variant="body2">
              {Array.isArray(session.conductedBy)
                ? session.conductedBy.join(", ")
                : session.conductedBy || "N/A"}
            </Typography>
          </Box>

          <Divider sx={{ backgroundColor: "#4b5563" }} />

          <Box>
            <Typography variant="subtitle2" color="#7b68ee" gutterBottom>
              Training Outlines
            </Typography>
            {session.outlines && Array.isArray(session.outlines) ? (
              <Box sx={{ pl: 1 }}>
                {session.outlines.map((outline, idx) => (
                  <Box key={idx} sx={{ mb: 1.5 }}>
                    <Typography variant="body2" fontWeight="600">
                      {idx + 1}. {outline.mainTopic}
                    </Typography>
                    {outline.subTopics && outline.subTopics.length > 0 && (
                      <Box sx={{ pl: 2, mt: 0.5 }}>
                        {outline.subTopics.map((sub, sIdx) => (
                          <Typography key={sIdx} variant="caption" color="#9ca3af" display="block">
                            • {sub}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            ) : typeof session.outlines === 'string' ? (
              <Typography variant="body2">{session.outlines}</Typography>
            ) : (
              <Typography variant="body2" color="#6b7280">No outline provided.</Typography>
            )}
          </Box>

          {session.notes && (
            <Box>
              <Typography variant="caption" color="#9ca3af" display="block">
                Notes
              </Typography>
              <Typography variant="body2">{session.notes}</Typography>
            </Box>
          )}

          {session.reason && (
            <Box>
              <Typography variant="caption" color="#ef4444" display="block">
                Reason (Missed/Cancelled)
              </Typography>
              <Typography variant="body2" color="#ef4444">{session.reason}</Typography>
            </Box>
          )}

          {session.violationPoints > 0 && (
            <Chip
              label={`Violation Points: ${session.violationPoints}`}
              color="error"
              size="small"
              sx={{ alignSelf: "flex-start" }}
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: "1px solid #4b5563" }}>
        <Button onClick={onClose} variant="contained" sx={{ backgroundColor: "#4b5563", "&:hover": { backgroundColor: "#374151" } }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionDetailsDialog;
