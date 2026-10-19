import { Box, Typography } from "@mui/material";
import { Brand } from "./AppSidebar";

/** Centered auth card (used by staff sign-in and the field-team login). */
const AuthShell = ({ title, description, children, footer, dir }) => (
  <Box
    dir={dir}
    sx={{
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      px: 2, py: 6, backgroundColor: "var(--bg)",
      backgroundImage: "radial-gradient(circle at 50% -20%, var(--accent-subtle), transparent 55%)",
    }}
  >
    <Box
      sx={{
        width: "100%", maxWidth: 400, backgroundColor: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "12px", boxShadow: "var(--shadow-lg)", px: { xs: 3, sm: 4 }, pt: 4, pb: 3.5,
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Brand />
      </Box>
      <Typography component="h1" sx={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text)" }}>{title}</Typography>
      {description && <Typography sx={{ mt: 0.75, mb: 3, fontSize: 13, color: "var(--text-secondary)" }}>{description}</Typography>}
      {children}
    </Box>
    {footer && <Box sx={{ mt: 2.5, fontSize: 12.5, color: "var(--text-muted)", textAlign: "center" }}>{footer}</Box>}
  </Box>
);

export const FieldLabel = ({ htmlFor, label, children }) => (
  <Box>
    <Typography component="label" htmlFor={htmlFor} sx={{ display: "block", mb: 0.75, fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
      {label}
    </Typography>
    {children}
  </Box>
);

export default AuthShell;
