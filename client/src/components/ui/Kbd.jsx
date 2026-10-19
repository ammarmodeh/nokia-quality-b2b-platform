import { Box } from "@mui/material";

const Kbd = ({ children, sx }) => (
  <Box
    component="kbd"
    sx={{
      display: "inline-flex", alignItems: "center", height: 20, px: 0.75, borderRadius: "4px",
      border: "1px solid var(--border)", backgroundColor: "var(--surface-subtle)",
      color: "var(--text-secondary)", fontSize: 11, fontFamily: "var(--font-mono)", lineHeight: 1, flexShrink: 0,
      ...sx,
    }}
  >
    {children}
  </Box>
);

export default Kbd;
