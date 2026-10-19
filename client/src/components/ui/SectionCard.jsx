import { Box, Typography } from "@mui/material";

/** Bordered surface with an optional header row (title, description, actions). */
const SectionCard = ({ title, description, actions, children, padding = 2.5, sx, bodySx }) => (
  <Box
    component="section"
    sx={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", boxShadow: "var(--shadow-xs)", minWidth: 0, ...sx }}
  >
    {(title || actions) && (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, px: padding, py: 1.75, borderBottom: "1px solid var(--border)" }}>
        <Box sx={{ minWidth: 0 }}>
          {title && <Typography component="h2" sx={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{title}</Typography>}
          {description && <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mt: 0.25 }}>{description}</Typography>}
        </Box>
        {actions && <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexShrink: 0 }}>{actions}</Box>}
      </Box>
    )}
    <Box sx={{ p: padding, ...bodySx }}>{children}</Box>
  </Box>
);

export default SectionCard;
