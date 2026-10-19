import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, closestCorners, useSensor, useSensors, useDroppable,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChevronRight from "@mui/icons-material/ChevronRight";
import BoardCard from "./BoardCard";
import { STATUSES, boardSort, groupKeyFor } from "./taskUtils";

const PAGE = 40;
const SEP = "::";
const keyOf = (lane, status) => `${lane}${SEP}${status}`;
const statusOfKey = (k) => k.split(SEP)[1];
const laneOfKey = (k) => k.split(SEP)[0];

const SortableCard = ({ task, onOpen }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task._id });
  return (
    <Box ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners}>
      <BoardCard task={task} onOpen={onOpen} dragging={isDragging} />
    </Box>
  );
};

const Column = ({ containerKey, status, ids, byId, onOpen, onQuickAdd, showHeader = true }) => {
  const { setNodeRef, isOver } = useDroppable({ id: containerKey });
  const [limit, setLimit] = useState(PAGE);
  const visible = ids.slice(0, limit);
  return (
    <Box sx={{ flex: "1 1 0", minWidth: 272, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {showHeader && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: 36, px: 1.25, mb: 1, borderRadius: "8px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: status.color }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{status.label}</Typography>
          <Box sx={{ px: 0.75, height: 18, borderRadius: "5px", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", backgroundColor: "var(--surface-active)" }}>
            {ids.length}
          </Box>
          <Box sx={{ flex: 1 }} />
          <Tooltip title={`Create task`}>
            <IconButton size="small" onClick={() => onQuickAdd?.(status.value)} aria-label={`Create task in ${status.label}`} sx={{ width: 24, height: 24, color: "var(--text-muted)" }}>
              <AddIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
      <SortableContext id={containerKey} items={visible} strategy={verticalListSortingStrategy}>
        <Box
          ref={setNodeRef}
          sx={{
            display: "flex", flexDirection: "column", gap: 1, p: 0.75, minHeight: 80, minWidth: 0, borderRadius: "10px",
            backgroundColor: isOver ? "var(--accent-subtle)" : "var(--surface-subtle)",
            border: `1px dashed ${isOver ? "var(--accent)" : "transparent"}`,
            transition: "background-color .12s ease",
          }}
        >
          {visible.map((id) => byId[id] && <SortableCard key={id} task={byId[id]} onOpen={onOpen} />)}
          {!ids.length && (
            <Typography sx={{ py: 3, textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>No tasks</Typography>
          )}
          {ids.length > limit && (
            <Button variant="text" size="small" onClick={() => setLimit((l) => l + PAGE)} sx={{ color: "var(--text-secondary)" }}>
              Show {Math.min(PAGE, ids.length - limit)} more
            </Button>
          )}
        </Box>
      </SortableContext>
    </Box>
  );
};

/**
 * Kanban board. Columns = Task.status. Optional swimlanes (group by assignee,
 * team or priority); cards move between columns within their lane.
 * onMove(patches) receives { [taskId]: { status?, boardOrder? } }.
 */
const TaskBoard = ({ tasks, groupBy = "none", onOpen, onMove, onQuickAdd }) => {
  const byId = useMemo(() => Object.fromEntries(tasks.map((t) => [t._id, t])), [tasks]);

  const lanes = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "All" }];
    const m = new Map();
    for (const t of tasks) {
      const g = groupKeyFor(t, groupBy);
      if (!m.has(g.key)) m.set(g.key, { ...g, count: 0 });
      m.get(g.key).count++;
    }
    return [...m.values()].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0) || (a.key === "_none") - (b.key === "_none") || b.count - a.count);
  }, [tasks, groupBy]);

  const derived = useMemo(() => {
    const out = {};
    for (const l of lanes) for (const s of STATUSES) out[keyOf(l.key, s.value)] = [];
    for (const t of [...tasks].sort(boardSort)) {
      const lane = groupBy === "none" ? "all" : groupKeyFor(t, groupBy).key;
      const k = keyOf(lane, STATUSES.some((s) => s.value === t.status) ? t.status : "Todo");
      out[k]?.push(t._id);
    }
    return out;
  }, [tasks, lanes, groupBy]);

  const [items, setItems] = useState(derived);
  const [activeId, setActiveId] = useState(null);
  const origin = useRef(null);
  useEffect(() => {
    if (!activeId) setItems(derived);
  }, [derived, activeId]);

  const [collapsed, setCollapsed] = useState({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findContainer = (id) => (id in items ? id : Object.keys(items).find((k) => items[k].includes(id)));

  const handleDragStart = ({ active }) => {
    setActiveId(active.id);
    origin.current = findContainer(active.id);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;
    const from = findContainer(active.id);
    const to = findContainer(over.id);
    if (!from || !to || from === to) return;
    if (laneOfKey(from) !== laneOfKey(to)) return; // stay in the same swimlane
    setItems((prev) => {
      const src = prev[from].filter((id) => id !== active.id);
      const dst = [...prev[to]];
      const overIdx = dst.indexOf(over.id);
      dst.splice(overIdx >= 0 ? overIdx : dst.length, 0, active.id);
      return { ...prev, [from]: src, [to]: dst };
    });
  };

  const handleDragEnd = ({ active, over }) => {
    const startKey = origin.current;
    setActiveId(null);
    origin.current = null;
    if (!over) {
      setItems(derived);
      return;
    }
    const container = findContainer(active.id);
    if (!container) return;
    let list = items[container];
    const overIdx = list.indexOf(over.id);
    const curIdx = list.indexOf(active.id);
    if (overIdx >= 0 && curIdx !== overIdx) list = arrayMove(list, curIdx, overIdx);
    const next = { ...items, [container]: list };
    setItems(next);

    const idx = list.indexOf(active.id);
    const task = byId[active.id];
    const patches = {};
    const newStatus = statusOfKey(container);
    if (task && task.status !== newStatus) patches[active.id] = { status: newStatus };

    // Persist order for the top of the column down to the moved card (and any
    // card that already had a manual order); cards below keep newest-first.
    if (startKey !== container || curIdx !== overIdx) {
      let last = idx;
      list.forEach((id, i) => {
        if (byId[id]?.boardOrder != null) last = Math.max(last, i);
      });
      for (let i = 0; i <= last; i++) {
        const id = list[i];
        const order = (i + 1) * 1024;
        if (byId[id]?.boardOrder !== order) patches[id] = { ...(patches[id] || {}), boardOrder: order };
      }
    }
    if (Object.keys(patches).length) onMove?.(patches, { movedId: active.id, from: statusOfKey(startKey || container), to: newStatus });
  };

  const activeTask = activeId ? byId[activeId] : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setItems(derived);
      }}
    >
      <Box sx={{ overflowX: "auto", pb: 2, mx: { xs: -2, md: 0 }, px: { xs: 2, md: 0 } }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: STATUSES.length * 272 + (STATUSES.length - 1) * 12, width: "100%" }}>
          {groupBy !== "none" && (
            <Box sx={{ display: "flex", gap: 1.5, position: "sticky", top: 0 }}>
              {STATUSES.map((s) => (
                <Box key={s.value} sx={{ flex: "1 1 0", minWidth: 272, display: "flex", alignItems: "center", gap: 1, px: 1.25, height: 32 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: s.color }} />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)" }}>{s.label}</Typography>
                </Box>
              ))}
            </Box>
          )}
          {lanes.map((lane) => {
            const open = !collapsed[lane.key];
            return (
              <Box key={lane.key}>
                {groupBy !== "none" && (
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setCollapsed((c) => ({ ...c, [lane.key]: open }))}
                    aria-expanded={open}
                    sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1, border: 0, background: "none", font: "inherit", cursor: "pointer", color: "var(--text)", p: 0.5, borderRadius: "6px", "&:hover": { backgroundColor: "var(--surface-hover)" } }}
                  >
                    <ChevronRight sx={{ fontSize: 18, color: "var(--text-muted)", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{lane.label}</Typography>
                    <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>{lane.count}</Typography>
                  </Box>
                )}
                {open && (
                  <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                    {STATUSES.map((s) => {
                      const k = keyOf(lane.key, s.value);
                      return (
                        <Column
                          key={k}
                          containerKey={k}
                          status={s}
                          ids={items[k] || []}
                          byId={byId}
                          onOpen={onOpen}
                          onQuickAdd={onQuickAdd}
                          showHeader={groupBy === "none"}
                        />
                      );
                    })}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
      <DragOverlay dropAnimation={{ duration: 160 }}>{activeTask ? <Box sx={{ width: 282 }}><BoardCard task={activeTask} overlay /></Box> : null}</DragOverlay>
    </DndContext>
  );
};

export default TaskBoard;
