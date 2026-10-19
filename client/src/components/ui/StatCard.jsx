import { Box, Skeleton, Typography } from "@mui/material";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import ArrowDownward from "@mui/icons-material/ArrowDownward";

/**
 * KPI tile. `delta` is a number vs the previous period; `goodWhen` says which
 * direction is positive ("up" | "down") so colour follows meaning, not sign.
 */
const StatCard = ({ label, value, hint, delta, deltaSuffix = "", goodWhen = "up", icon, loading = false, onClick, sx }) => {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const good = hasDelta && (goodWhen === "up" ? delta >= 0 : delta <= 0);
  const Arrow = hasDelta && delta < 0 ? ArrowDownward : ArrowUpward;
  return (
    <Box
      component={onClick ? "button" : "div"}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      sx={{
        textAlign: "left", font: "inherit", width: "100%", p: 2.25, borderRadius: "10px",
        border: "1px solid var(--border)", backgroundColor: "var(--surface)", boxShadow: "var(--shadow-xs)",
        cursor: onClick ? "pointer" : "default", minWidth: 0,
        "&:hover": onClick ? { borderColor: "var(--border-strong)" } : undefined,
        ...sx,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "var(--text-secondary)" }}>
        {icon}
        <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: "inherit" }}>{label}</Typography>
      </Box>
      {loading ? (
        <Skeleton width="50%" height={36} />
      ) : (
        <Typography sx={{ mt: 0.75, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)", lineHeight: 1.15, fontVariantNumeric: "tabular-nums" }}>
          {value ?? "—"}
        </Typography>
      )}
      {(hasDelta || hint) && (
        <Box sx={{ mt: 0.75, display: "flex", alignItems: "center", gap: 0.75, fontSize: 12, color: "var(--text-secondary)" }}>
          {hasDelta && (
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, fontWeight: 600, color: good ? "var(--success)" : "var(--danger)" }}>
              <Arrow sx={{ fontSize: 13 }} />
              {Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 1 })}{deltaSuffix}
            </Box>
          )}
          {hint && <span>{hint}</span>}
        </Box>
      )}
    </Box>
  );
};

export default StatCard;
