import { Box, Skeleton } from "@mui/material";

const SkeletonRows = ({ rows = 6, height = 40 }) => (
  <Box aria-hidden sx={{ display: "flex", flexDirection: "column" }}>
    {Array.from({ length: rows }).map((_, i) => (
      <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 2, height, px: 2, borderBottom: "1px solid var(--border)" }}>
        <Skeleton variant="circular" width={22} height={22} />
        <Skeleton width="28%" />
        <Skeleton width="16%" />
        <Skeleton width="12%" sx={{ ml: "auto" }} />
      </Box>
    ))}
  </Box>
);

export default SkeletonRows;
