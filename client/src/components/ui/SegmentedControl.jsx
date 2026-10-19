import { Box, Tooltip } from "@mui/material";

/**
 * Segmented control (Board | Table | Calendar style switcher).
 * options: [{ value, label, icon? }]
 */
const SegmentedControl = ({ value, onChange, options, size = "md", iconOnly = false, ariaLabel }) => {
  const h = size === "sm" ? 26 : 30;
  return (
    <Box
      role="radiogroup"
      aria-label={ariaLabel}
      sx={{ display: "inline-flex", p: "2px", gap: "2px", borderRadius: "7px", backgroundColor: "var(--surface-active)", border: "1px solid var(--border)" }}
    >
      {options.map((o) => {
        const active = o.value === value;
        const btn = (
          <Box
            key={o.value}
            component="button"
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={iconOnly ? o.label : undefined}
            onClick={() => onChange?.(o.value)}
            sx={{
              display: "inline-flex", alignItems: "center", gap: 0.75, height: h - 6,
              px: iconOnly ? 0.75 : 1.25, border: 0, borderRadius: "5px", cursor: "pointer",
              font: "inherit", fontSize: 12.5, fontWeight: 500,
              color: active ? "var(--text)" : "var(--text-secondary)",
              backgroundColor: active ? "var(--surface)" : "transparent",
              boxShadow: active ? "var(--shadow-xs)" : "none",
              "&:hover": { color: "var(--text)" },
              "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 1 },
            }}
          >
            {o.icon}
            {!iconOnly && o.label}
          </Box>
        );
        return iconOnly ? <Tooltip key={o.value} title={o.label}>{btn}</Tooltip> : btn;
      })}
    </Box>
  );
};

export default SegmentedControl;
