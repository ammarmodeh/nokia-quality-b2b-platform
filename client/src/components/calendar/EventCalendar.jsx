import { useMemo, useState } from "react";
import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { Box, Button, IconButton, Popover, Tooltip, Typography } from "@mui/material";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import Add from "@mui/icons-material/Add";
import EventAvailableOutlined from "@mui/icons-material/EventAvailableOutlined";
import SegmentedControl from "../ui/SegmentedControl";

const MAX_PER_DAY = 3;
const keyOf = (d) => format(d, "yyyy-MM-dd");

/**
 * events: [{ id, title, date (Date|string), color, subtitle, draggable, scheduled }]
 * `scheduled` marks a booked appointment / visit (calendar icon instead of the dot).
 * onOpen(event) · onMove(event, newDay) (drag to reschedule) · onCreate(day) (click an empty day)
 */
const EventChip = ({ ev, onOpen, dense = true }) => (
  <Box
    component="button"
    type="button"
    draggable={ev.draggable !== false}
    onDragStart={(e) => {
      e.dataTransfer.setData("text/event-id", String(ev.id));
      e.dataTransfer.effectAllowed = "move";
    }}
    onClick={(e) => {
      e.stopPropagation();
      onOpen?.(ev);
    }}
    title={[ev.title, ev.subtitle].filter(Boolean).join(" · ")}
    sx={{
      display: "flex", alignItems: "center", gap: 0.5, width: "100%", border: 0, font: "inherit", cursor: "pointer", textAlign: "left",
      px: 0.75, minHeight: dense ? 20 : 30, py: dense ? 0 : 0.5, borderRadius: "4px", fontSize: dense ? 11.5 : 12.5, color: "var(--text)",
      backgroundColor: `color-mix(in srgb, ${ev.color || "var(--accent)"} 12%, transparent)`,
      "&:hover": { backgroundColor: `color-mix(in srgb, ${ev.color || "var(--accent)"} 22%, transparent)` },
      "&:focus-visible": { outline: "2px solid var(--focus-ring)" },
    }}
  >
    {ev.scheduled ? (
      <EventAvailableOutlined aria-label="Scheduled" sx={{ fontSize: 12, color: ev.color || "var(--accent)", flexShrink: 0 }} />
    ) : (
      <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: ev.color || "var(--accent)", flexShrink: 0 }} />
    )}
    <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{ev.title}</Box>
    {!dense && ev.subtitle && <Box component="span" sx={{ color: "var(--text-muted)", fontSize: 11.5, whiteSpace: "nowrap" }}>{ev.subtitle}</Box>}
  </Box>
);

const EventCalendar = ({ events, onOpen, onMove, onCreate, weekStartsOn = 0, initialView = "month", initialDate, toolbarExtra, height }) => {
  const [view, setView] = useState(initialView);
  const [cursor, setCursor] = useState(() => startOfDay(initialDate && !Number.isNaN(new Date(initialDate).getTime()) ? new Date(initialDate) : new Date()));
  const [more, setMore] = useState(null);
  const [over, setOver] = useState(null);

  const byDay = useMemo(() => {
    const m = new Map();
    for (const ev of events) {
      if (!ev.date) continue;
      const d = new Date(ev.date);
      if (Number.isNaN(d.getTime())) continue;
      const k = keyOf(d);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(ev);
    }
    return m;
  }, [events]);
  const byId = useMemo(() => new Map(events.map((e) => [String(e.id), e])), [events]);

  const days = useMemo(() => {
    if (view === "day") return [cursor];
    const start = view === "week" ? startOfWeek(cursor, { weekStartsOn }) : startOfWeek(startOfMonth(cursor), { weekStartsOn });
    const end = view === "week" ? endOfWeek(cursor, { weekStartsOn }) : endOfWeek(endOfMonth(cursor), { weekStartsOn });
    const out = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [view, cursor, weekStartsOn]);

  const step = (n) => setCursor((c) => (view === "month" ? addMonths(c, n) : view === "week" ? addWeeks(c, n) : addDays(c, n)));
  const title = view === "month" ? format(cursor, "MMMM yyyy") : view === "week" ? `${format(days[0], "d MMM")} – ${format(days[days.length - 1], "d MMM yyyy")}` : format(cursor, "EEEE d MMMM yyyy");

  const dropProps = (day) =>
    onMove
      ? {
          onDragOver: (e) => { e.preventDefault(); setOver(keyOf(day)); },
          onDragLeave: () => setOver((o) => (o === keyOf(day) ? null : o)),
          onDrop: (e) => {
            e.preventDefault();
            setOver(null);
            const ev = byId.get(e.dataTransfer.getData("text/event-id"));
            if (ev && !isSameDay(new Date(ev.date), day)) onMove(ev, day);
          },
        }
      : {};

  const weekdays = days.slice(0, 7).map((d) => format(d, "EEE"));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, height }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
        <Button variant="outlined" size="small" onClick={() => setCursor(startOfDay(new Date()))}>Today</Button>
        <IconButton size="small" aria-label="Previous" onClick={() => step(-1)}><ChevronLeft fontSize="small" /></IconButton>
        <IconButton size="small" aria-label="Next" onClick={() => step(1)}><ChevronRight fontSize="small" /></IconButton>
        <Typography sx={{ fontSize: 15, fontWeight: 600, minWidth: 180 }}>{title}</Typography>
        <Box sx={{ flex: 1 }} />
        {toolbarExtra}
        <SegmentedControl value={view} onChange={setView} size="sm" ariaLabel="Calendar view" options={[{ value: "month", label: "Month" }, { value: "week", label: "Week" }, { value: "day", label: "Day" }]} />
      </Box>

      {view !== "day" && (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)" }}>
          {weekdays.map((w) => (
            <Box key={w} sx={{ px: 1, py: 0.75, fontSize: 11.5, fontWeight: 500, color: "var(--text-muted)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface-subtle)" }}>{w}</Box>
          ))}
        </Box>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: view === "day" ? "1fr" : "repeat(7, minmax(0,1fr))",
          gridAutoRows: view === "month" ? "minmax(104px, 1fr)" : "minmax(320px, 1fr)",
          borderLeft: "1px solid var(--border)",
          borderTop: view === "day" ? "1px solid var(--border)" : 0,
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
        }}
      >
        {days.map((day) => {
          const list = byDay.get(keyOf(day)) || [];
          const limit = view === "month" ? MAX_PER_DAY : list.length;
          const outside = view === "month" && !isSameMonth(day, cursor);
          const today = isSameDay(day, new Date());
          return (
            <Box
              key={keyOf(day)}
              {...dropProps(day)}
              sx={{
                position: "relative", p: 0.75, display: "flex", flexDirection: "column", gap: "3px", minWidth: 0,
                borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
                backgroundColor: over === keyOf(day) ? "var(--accent-subtle)" : outside ? "var(--surface-subtle)" : "var(--surface)",
                "&:hover .cal-add": { opacity: 1 },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 0.25 }}>
                <Box component="span" sx={{ fontSize: 12, fontWeight: today ? 600 : 500, color: today ? "var(--on-accent)" : outside ? "var(--text-muted)" : "var(--text-secondary)", backgroundColor: today ? "var(--accent)" : "transparent", borderRadius: "10px", px: today ? 0.75 : 0, lineHeight: "20px" }}>
                  {view === "day" ? `${list.length} item${list.length === 1 ? "" : "s"}` : format(day, view === "week" ? "EEE d" : "d")}
                </Box>
                <Box sx={{ flex: 1 }} />
                {onCreate && (
                  <Tooltip title="Add here">
                    <IconButton className="cal-add" size="small" aria-label={`Add on ${format(day, "d MMM")}`} onClick={() => onCreate(day)} sx={{ opacity: 0, width: 20, height: 20, transition: "opacity .1s", "&:focus-visible": { opacity: 1 } }}>
                      <Add sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {list.slice(0, limit).map((ev) => <EventChip key={ev.id} ev={ev} onOpen={onOpen} dense={view === "month"} />)}
              {list.length > limit && (
                <Box component="button" type="button" onClick={(e) => setMore({ anchor: e.currentTarget, day, list })} sx={{ border: 0, background: "none", font: "inherit", fontSize: 11.5, color: "var(--text-secondary)", textAlign: "left", px: 0.75, cursor: "pointer", "&:hover": { color: "var(--text)" } }}>
                  +{list.length - limit} more
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
      <Popover open={Boolean(more)} anchorEl={more?.anchor} onClose={() => setMore(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
        {more && (
          <Box sx={{ p: 1.25, width: 280, display: "flex", flexDirection: "column", gap: "3px", maxHeight: 360, overflowY: "auto" }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.5 }}>{format(more.day, "EEEE d MMMM")}</Typography>
            {more.list.map((ev) => <EventChip key={ev.id} ev={ev} onOpen={(x) => { setMore(null); onOpen?.(x); }} />)}
          </Box>
        )}
      </Popover>
    </Box>
  );
};

export default EventCalendar;
