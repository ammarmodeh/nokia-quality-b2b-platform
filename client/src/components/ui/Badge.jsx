import { Box } from "@mui/material";
import { tone as tones } from "../../theme/tokens";

/**
 * Soft badge: tinted background + coloured text.
 * tone: neutral | accent | success | warning | danger | info, or pass `color` (hex) for a custom hue.
 */
const Badge = ({ children, tone = "neutral", color, dot = false, outline = false, sx, ...rest }) => {
  const t = tones[tone] || tones.neutral;
  const fg = color || t.fg;
  const bg = color ? `color-mix(in srgb, ${color} 12%, transparent)` : t.bg;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex", alignItems: "center", gap: 0.75, height: 22, px: 0.875, borderRadius: "6px",
        fontSize: 12, fontWeight: 500, lineHeight: 1, whiteSpace: "nowrap",
        color: fg, backgroundColor: outline ? "transparent" : bg,
        border: outline ? "1px solid var(--border)" : "1px solid transparent",
        ...sx,
      }}
      {...rest}
    >
      {dot && <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: fg, flexShrink: 0 }} />}
      {children}
    </Box>
  );
};

export default Badge;
