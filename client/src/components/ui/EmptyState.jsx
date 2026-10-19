import { Box, Typography } from "@mui/material";
import SearchOffOutlined from "@mui/icons-material/SearchOffOutlined";

const EmptyState = ({ icon, title = "Nothing here yet", description, action, minHeight = 240, sx }) => (
  <Box sx={{ minHeight, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 3, py: 5, ...sx }}>
    <Box sx={{ width: 44, height: 44, borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--surface-subtle)", display: "grid", placeItems: "center", color: "var(--text-muted)", mb: 2, boxShadow: "var(--shadow-xs)" }}>
      {icon || <SearchOffOutlined sx={{ fontSize: 20 }} />}
    </Box>
    <Typography sx={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{title}</Typography>
    {description && <Typography sx={{ mt: 0.5, fontSize: 13, color: "var(--text-secondary)", maxWidth: 380 }}>{description}</Typography>}
    {action && <Box sx={{ mt: 2 }}>{action}</Box>}
  </Box>
);

export default EmptyState;
