import { Box, Drawer, IconButton, Typography } from "@mui/material";
import Close from "@mui/icons-material/Close";

/** Right-hand side sheet for create / edit / details. */
const Sheet = ({ open, onClose, title, description, actions, footer, width = 520, children }) => (
  <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: "100%", sm: width }, borderLeft: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" } } }}>
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, px: 2.5, py: 2, borderBottom: "1px solid var(--border)" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{title}</Typography>
          {description && <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mt: 0.25 }}>{description}</Typography>}
        </Box>
        {actions}
        <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ color: "var(--text-muted)" }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2 }}>{children}</Box>
      {footer && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, px: 2.5, py: 1.5, borderTop: "1px solid var(--border)", backgroundColor: "var(--surface-subtle)" }}>
          {footer}
        </Box>
      )}
    </Box>
  </Drawer>
);

export default Sheet;
