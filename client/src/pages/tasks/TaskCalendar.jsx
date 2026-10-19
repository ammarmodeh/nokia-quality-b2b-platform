import { useMemo, useState } from "react";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { Box, Button, IconButton, Popover, Typography } from "@mui/material";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import { statusMeta, taskDate, taskTitle } from "./taskUtils";

const MAX_PER_DAY = 3;

const Event = ({ task, onOpen }) => {
  const s = statusMeta(task.status);
  return (
    <Box
      component="button"
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(task);
      }}
      title={`${task.slid} · ${taskTitle(task)}`}
      sx={{
        display: "flex", alignItems: "center", gap: 0.5, width: "100%", border: 0, font: "inherit", cursor: "pointer",
        textAlign: "left", px: 0.75, height: 20, borderRadius: "4px", fontSize: 11.5, color: "var(--text)",
        backgroundColor: `color-mix(in srgb, ${s.color} 12%, transparent)`,
        "&:hover": { backgroundColor: `color-mix(in srgb, ${s.color} 22%, transparent)` },
        "&:focus-visible": { outline: "2px solid var(--focus-ring)" },
      }}
    >
      <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: s.color, flexShrink: 0 }} />
      <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{taskTitle(task)}</Box>
    </Box>
  );
};

/** Month calendar of tasks by interview date (falls back to PIS / created date). */
const TaskCalendar = ({ tasks, onOpen, weekStartsOn = 0 }) => {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [more, setMore] = useState(null); // { anchor, day, list }

  const byDay = useMemo(() => {
    const m = new Map();
    for (const t of tasks) {
      const d = taskDate(t);
      if (!d) continue;
      const k = format(new Date(d), "yyyy-MM-dd");
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(t);
    }
    return m;
  }, [tasks]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn });
    const out = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [month, weekStartsOn]);

  const monthCount = useMemo(
    () => days.filter((d) => isSameMonth(d, month)).reduce((n, d) => n + (byDay.get(format(d, "yyyy-MM-dd"))?.length || 0), 0),
    [days, byDay, month]
  );

  const today = new Date();

  return (
    <Box sx={{ border: "1px solid var(--border)", borderRadius: "10px", backgroundColor: "var(--surface)", boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.25, borderBottom: "1px solid var(--border)" }}>
        <Typography sx={{ fontSize: 15, fontWeight: 600, minWidth: 150 }}>{format(month, "MMMM yyyy")}</Typography>
        <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>{monthCount} task{monthCount === 1 ? "" : "s"}</Typography>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month" sx={{ border: "1px solid var(--border)" }}>
          <ChevronLeft fontSize="small" />
        </IconButton>
        <Button variant="outlined" onClick={() => setMonth(startOfMonth(new Date()))}>Today</Button>
        <IconButton size="small" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month" sx={{ border: "1px solid var(--border)" }}>
          <ChevronRight fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ overflowX: "auto" }}>
        <Box sx={{ minWidth: 720 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface-subtle)" }}>
            {days.slice(0, 7).map((d) => (
              <Typography key={d.toISOString()} sx={{ px: 1.25, py: 0.75, fontSize: 11.5, fontWeight: 500, color: "var(--text-muted)" }}>
                {format(d, "EEE")}
              </Typography>
            ))}
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {days.map((d, i) => {
              const list = byDay.get(format(d, "yyyy-MM-dd")) || [];
              const inMonth = isSameMonth(d, month);
              const isToday = isSameDay(d, today);
              return (
                <Box
                  key={d.toISOString()}
                  sx={{
                    minHeight: 112, p: 0.75, display: "flex", flexDirection: "column", gap: 0.5,
                    borderRight: (i + 1) % 7 ? "1px solid var(--border)" : 0,
                    borderBottom: i < days.length - 7 ? "1px solid var(--border)" : 0,
                    backgroundColor: inMonth ? "transparent" : "var(--surface-subtle)",
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Box
                      sx={{
                        minWidth: 22, height: 22, px: 0.5, borderRadius: "11px", display: "grid", placeItems: "center",
                        fontSize: 12, fontWeight: isToday ? 600 : 500,
                        color: isToday ? "var(--on-accent)" : inMonth ? "var(--text)" : "var(--text-muted)",
                        backgroundColor: isToday ? "var(--accent)" : "transparent",
                      }}
                    >
                      {format(d, "d")}
                    </Box>
                  </Box>
                  {list.slice(0, MAX_PER_DAY).map((t) => <Event key={t._id} task={t} onOpen={onOpen} />)}
                  {list.length > MAX_PER_DAY && (
                    <Box
                      component="button"
                      type="button"
                      onClick={(e) => setMore({ anchor: e.currentTarget, day: d, list })}
                      sx={{ border: 0, background: "none", font: "inherit", cursor: "pointer", textAlign: "left", px: 0.75, fontSize: 11.5, fontWeight: 500, color: "var(--text-secondary)", "&:hover": { color: "var(--text)" } }}
                    >
                      +{list.length - MAX_PER_DAY} more
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      <Popover
        open={Boolean(more)}
        anchorEl={more?.anchor}
        onClose={() => setMore(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { width: 280, p: 1, maxHeight: 360 } } }}
      >
        {more && (
          <>
            <Typography sx={{ px: 0.75, pb: 0.75, fontSize: 12.5, fontWeight: 600 }}>{format(more.day, "EEEE, d MMM")}</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {more.list.map((t) => (
                <Event
                  key={t._id}
                  task={t}
                  onOpen={(x) => {
                    setMore(null);
                    onOpen(x);
                  }}
                />
              ))}
            </Box>
          </>
        )}
      </Popover>
    </Box>
  );
};

export default TaskCalendar;
