import { useState } from "react";
import { Box, Button, Popover, TextField, Typography } from "@mui/material";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { format } from "date-fns";

/**
 * Button + popover for choosing a reporting period: preset options plus a custom from/to range.
 * periods: [{ value, label }] (a "custom" entry is ignored; the custom range is always offered).
 */
const PeriodPicker = ({ periods, value, from, to, onChange, fallbackLabel }) => {
  const [anchor, setAnchor] = useState(null);
  const [draft, setDraft] = useState({ from: from || "", to: to || "" });
  const label = value === "custom" && from && to ? `${format(new Date(from), "MMM d")} – ${format(new Date(to), "MMM d, yyyy")}` : periods.find((p) => p.value === value)?.label || fallbackLabel || periods[0]?.label;
  return (
    <>
      <Button variant="outlined" startIcon={<CalendarMonthOutlined sx={{ fontSize: 17 }} />} endIcon={<ExpandMore sx={{ fontSize: 17 }} />} onClick={(e) => setAnchor(e.currentTarget)} aria-haspopup="dialog">
        {label}
      </Button>
      <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { mt: 0.75, width: 280, p: 0.5 } } }}>
        {periods.filter((p) => p.value !== "custom").map((p) => (
          <Box
            key={p.value}
            component="button"
            type="button"
            onClick={() => {
              onChange({ period: p.value, from: "", to: "" });
              setAnchor(null);
            }}
            sx={{ display: "flex", width: "100%", border: 0, background: value === p.value ? "var(--accent-subtle)" : "none", font: "inherit", fontSize: 13, textAlign: "left", cursor: "pointer", px: 1.25, height: 32, alignItems: "center", borderRadius: "5px", color: value === p.value ? "var(--accent-text)" : "var(--text)", fontWeight: value === p.value ? 600 : 400, "&:hover": { backgroundColor: value === p.value ? "var(--accent-subtle)" : "var(--surface-hover)" } }}
          >
            {p.label}
          </Box>
        ))}
        <Box sx={{ borderTop: "1px solid var(--border)", mt: 0.5, p: 1.25 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", mb: 1 }}>Custom range</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
            <TextField type="date" label="From" value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="date" label="To" value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
          </Box>
          <Button
            fullWidth
            variant="contained"
            sx={{ mt: 1.25 }}
            disabled={!draft.from || !draft.to || draft.from > draft.to}
            onClick={() => {
              onChange({ period: "custom", ...draft });
              setAnchor(null);
            }}
          >
            Apply range
          </Button>
        </Box>
      </Popover>
    </>
  );
};

export default PeriodPicker;
