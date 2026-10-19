import { Box, Button, Typography } from "@mui/material";
import ErrorOutline from "@mui/icons-material/ErrorOutline";

const ErrorState = ({ title = "Something went wrong", message, onRetry, sx }) => (
  <Box role="alert" sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, p: 2, borderRadius: "8px", border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)", backgroundColor: "var(--danger-subtle)", ...sx }}>
    <ErrorOutline sx={{ fontSize: 18, color: "var(--danger)", mt: "1px" }} />
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{title}</Typography>
      {message && <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mt: 0.25 }}>{message}</Typography>}
    </Box>
    {onRetry && <Button variant="outlined" onClick={onRetry}>Retry</Button>}
  </Box>
);

export default ErrorState;
