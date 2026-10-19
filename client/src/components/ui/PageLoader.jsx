import { Box, CircularProgress } from "@mui/material";

const PageLoader = ({ minHeight = 320, fullScreen = false }) => (
  <Box
    role="status"
    aria-label="Loading"
    sx={{ display: "grid", placeItems: "center", minHeight: fullScreen ? "100vh" : minHeight, backgroundColor: fullScreen ? "var(--bg)" : "transparent" }}
  >
    <CircularProgress size={22} thickness={5} sx={{ color: "var(--accent)" }} />
  </Box>
);

export default PageLoader;
