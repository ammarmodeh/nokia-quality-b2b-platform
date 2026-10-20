import { useEffect, useMemo, useState } from "react";
import { eachWeekOfInterval, endOfWeek, endOfYear, format, isBefore, isSameWeek, startOfYear } from "date-fns";
import { Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import ShareOutlined from "@mui/icons-material/ShareOutlined";
import api from "../../api/api";
import { getCustomWeekNumber } from "../../utils/helpers";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The team's reporting weeks for a year (same numbering and share text as before). */
const WeekNumbers = () => {
  const [settings, setSettings] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data)).catch(() => setSettings({}));
  }, []);
  const weekStartDay = settings?.weekStartDay || 0;
  const now = useMemo(() => new Date(), []);

  const weeks = useMemo(
    () =>
      eachWeekOfInterval({ start: startOfYear(new Date(year, 0, 1)), end: endOfYear(new Date(year, 11, 31)) }, { weekStartsOn: weekStartDay }).map((start) => {
        const end = endOfWeek(start, { weekStartsOn: weekStartDay });
        return {
          start,
          number: getCustomWeekNumber(start, year, settings || {}),
          range: `${format(start, "MMM d")} - ${format(end, "MMM d")}`,
          spent: isBefore(end, now),
          current: isSameWeek(start, now, { weekStartsOn: weekStartDay }),
        };
      }),
    [year, weekStartDay, settings, now]
  );

  const share = () => {
    const cur = weeks.find((w) => w.current);
    let text = `Yearly Calendar ${year}\nWeeks start on ${DAYS[weekStartDay]}\n\nCurrent Week → ${cur ? `Week ${cur.number} (${cur.range})` : "Unknown"}\n\nWeekly Overview:\n━━━━━━━━━━━━━━━━━━\n`;
    weeks.forEach((w) => { text += `${w.spent ? "Completed" : ""} Week ${w.number}: ${w.range} ${w.current ? "Current Week" : ""}\n`; });
    text += "\nShared via Q-Ops Calendar App";
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const thisYear = new Date().getFullYear();
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
        <TextField select size="small" value={year} onChange={(e) => setYear(e.target.value)} sx={{ width: 110 }} slotProps={{ htmlInput: { "aria-label": "Year" } }}>
          {[thisYear - 1, thisYear, thisYear + 1].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
        <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", flex: 1 }}>Weeks start on {DAYS[weekStartDay]} (Settings → Calendar)</Typography>
        <Button size="small" variant="outlined" startIcon={<ShareOutlined sx={{ fontSize: 16 }} />} onClick={share}>Share to WhatsApp</Button>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 0.75 }}>
        {weeks.map((w) => (
          <Box key={w.start.toISOString()} sx={{ p: 1, borderRadius: "8px", border: `1px solid ${w.current ? "var(--accent)" : "var(--border)"}`, backgroundColor: w.current ? "var(--accent-subtle)" : w.spent ? "var(--surface-subtle)" : "var(--surface)", boxShadow: w.current ? "0 0 0 3px var(--accent-ring)" : "none" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: w.spent && !w.current ? "var(--text-secondary)" : "var(--text)" }}>Week {w.number}{w.current ? " · now" : ""}</Typography>
            <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>{w.range}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default WeekNumbers;
