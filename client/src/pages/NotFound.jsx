// Create a new file NotFound.jsx
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#2d2d2d",
        color: "white",
        textAlign: "center",
        padding: 3
      }}
    >
      <Typography variant="h1" sx={{ fontSize: "6rem", fontWeight: 700, mb: 2 }}>
        404
      </Typography>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Oops! Page not found
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, maxWidth: "500px" }}>
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        size="large"
        onClick={() => navigate("/")}
        sx={{
          px: 4,
          py: 1.5,
          borderRadius: 2,
          textTransform: "none",
          fontSize: "1rem"
        }}
      >
        Go to Homepage
      </Button>
    </Box>
  );
};

export default NotFound;