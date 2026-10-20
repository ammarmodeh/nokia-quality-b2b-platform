import { Box, CircularProgress, Skeleton } from "@mui/material";

const bar = (w, h = 12) => <Skeleton variant="rounded" width={w} height={h} sx={{ borderRadius: "6px", bgcolor: "var(--surface-active)" }} />;

/**
 * Loading placeholder shaped like the content that is coming, so the page doesn't jump.
 * variant: 'page' (header + toolbar + table, default), 'table' (toolbar + rows),
 * 'cards' (KPI row + two panels), 'spinner' (small centred spinner).
 * fullScreen: app boot screen.
 */
const PageLoader = ({ minHeight = 320, fullScreen = false, variant = "page", rows = 8 }) => {
  if (fullScreen) {
    return (
      <Box role="status" aria-label="Loading" sx={{ display: "grid", placeItems: "center", minHeight: "100vh", backgroundColor: "var(--bg)" }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: "9px", display: "grid", placeItems: "center", backgroundColor: "var(--accent)", color: "var(--on-accent)", fontSize: 13, fontWeight: 700 }}>QO</Box>
          <CircularProgress size={18} thickness={5} sx={{ color: "var(--accent)" }} />
        </Box>
      </Box>
    );
  }
  if (variant === "spinner") {
    return (
      <Box role="status" aria-label="Loading" sx={{ display: "grid", placeItems: "center", minHeight }}>
        <CircularProgress size={22} thickness={5} sx={{ color: "var(--accent)" }} />
      </Box>
    );
  }

  const table = (
    <Box sx={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", backgroundColor: "var(--surface)" }}>
      <Box sx={{ display: "flex", gap: 3, px: 2, py: 1.25, backgroundColor: "var(--surface-subtle)", borderBottom: "1px solid var(--border)" }}>
        {[90, 160, 110, 120, 80].map((w, i) => <Box key={i}>{bar(w, 10)}</Box>)}
      </Box>
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 3, px: 2, height: 48, borderBottom: "1px solid var(--border)", "&:last-of-type": { borderBottom: 0 }, opacity: 1 - i * (0.6 / rows) }}>
          {bar(90)}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.75 }}>{bar("55%")}{bar("30%", 9)}</Box>
          {bar(72, 20)}
          {bar(110)}
          {bar(60)}
        </Box>
      ))}
    </Box>
  );

  return (
    <Box role="status" aria-label="Loading" aria-busy="true" sx={{ minHeight, display: "flex", flexDirection: "column", gap: 2 }}>
      {variant === "page" && (
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          {bar(240, 32)}
          {bar(70, 28)}
          {bar(70, 28)}
          {bar(90, 28)}
        </Box>
      )}
      {variant === "cards" ? (
        <>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, minmax(0, 1fr))" } }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Box key={i} sx={{ p: 2.25, border: "1px solid var(--border)", borderRadius: "10px", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: 1 }}>{bar("50%", 10)}{bar("35%", 26)}</Box>
            ))}
          </Box>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
            {[0, 1].map((i) => <Box key={i} sx={{ height: 220, border: "1px solid var(--border)", borderRadius: "10px", backgroundColor: "var(--surface)", p: 2 }}>{bar("40%")}</Box>)}
          </Box>
        </>
      ) : (
        table
      )}
    </Box>
  );
};

export default PageLoader;
