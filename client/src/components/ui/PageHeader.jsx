import { Box, Typography } from "@mui/material";

/** Page title + one-line description on the left, actions on the right. */
const PageHeader = ({ title, description, actions, children, sx }) => (
  <Box sx={{ mb: 3, ...sx }}>
    <Box sx={{ display: "flex", alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography component="h1" sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)", lineHeight: 1.25 }}>
          {title}
        </Typography>
        {description && (
          <Typography sx={{ mt: 0.5, fontSize: 13.5, color: "var(--text-secondary)" }}>{description}</Typography>
        )}
      </Box>
      {actions && <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", flexShrink: 0 }}>{actions}</Box>}
    </Box>
    {children && <Box sx={{ mt: 2 }}>{children}</Box>}
  </Box>
);

export default PageHeader;
