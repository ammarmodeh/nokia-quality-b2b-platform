import { useMemo, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { Box, Button, Typography } from "@mui/material";
import Add from "@mui/icons-material/Add";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { CellValue } from "./CellValue";
import { choiceColor, formatValue } from "./fieldTypes";
import { rawOf } from "./viewUtils";

const NONE = "__none";

export const laneOptions = (field) => {
  if (!field) return [];
  if (field.type === "checkbox") return [{ key: "false", label: "Not done", value: false, color: "var(--text-secondary)" }, { key: "true", label: "Done", value: true, color: "var(--success)" }];
  return [...(field.options?.choices || []).map((c) => ({ key: c.value, label: c.value, value: c.value, color: choiceColor(field, c.value) })), { key: NONE, label: `No ${field.label.toLowerCase()}`, value: null, color: "var(--text-muted)" }];
};
const laneOf = (field, row) => {
  const v = rawOf(field, row);
  if (field.type === "checkbox") return v ? "true" : "false";
  return v === null || v === undefined || v === "" ? NONE : String(v);
};

const Card = ({ row, primary, cardFields, lookups, onOpen, dragging, overlay }) => (
  <Box
    onClick={() => onOpen?.(row)}
    sx={{
      p: 1.25, borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", cursor: overlay ? "grabbing" : "pointer",
      boxShadow: overlay ? "var(--shadow-lg)" : "var(--shadow-xs)", opacity: dragging ? 0.4 : 1, display: "flex", flexDirection: "column", gap: 0.75,
      "&:hover": { borderColor: "var(--border-strong)" },
    }}
  >
    <Typography dir="auto" sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, wordBreak: "break-word" }}>
      {primary ? formatValue(primary, rawOf(primary, row), row, lookups) || <span style={{ color: "var(--text-muted)" }}>Untitled #{row.autoNumber}</span> : `#${row.autoNumber}`}
    </Typography>
    {cardFields.map((f) => {
      const v = rawOf(f, row);
      if (v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length)) return null;
      return (
        <Box key={f.key} sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, fontSize: 12 }}>
          <Typography noWrap sx={{ fontSize: 11.5, color: "var(--text-muted)", width: 86, flexShrink: 0 }} title={f.label}>{f.label}</Typography>
          <Box sx={{ minWidth: 0, flex: 1, fontSize: 12.5 }}><CellValue field={f} value={v} row={row} lookups={lookups} /></Box>
        </Box>
      );
    })}
  </Box>
);

const DraggableCard = (props) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: props.row._id, disabled: !props.canEdit });
  return (
    <Box ref={setNodeRef} {...attributes} {...listeners} sx={{ touchAction: "none" }}>
      <Card {...props} dragging={isDragging} />
    </Box>
  );
};

const Lane = ({ lane, count, children, onAdd, canEdit }) => {
  const { setNodeRef, isOver } = useDroppable({ id: lane.key });
  return (
    <Box sx={{ width: 286, minWidth: 286, display: "flex", flexDirection: "column", maxHeight: "100%", borderRadius: "10px", backgroundColor: isOver ? "var(--accent-subtle)" : "var(--surface-subtle)", border: "1px solid var(--border)" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1.25 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: lane.color }} />
        <Typography dir="auto" sx={{ fontSize: 13, fontWeight: 600, flex: 1 }} noWrap>{lane.label}</Typography>
        <Badge>{count}</Badge>
      </Box>
      <Box ref={setNodeRef} sx={{ flex: 1, overflowY: "auto", px: 1, pb: 1, display: "flex", flexDirection: "column", gap: 1, minHeight: 60 }}>
        {children}
        {canEdit && (
          <Button size="small" variant="text" startIcon={<Add sx={{ fontSize: 16 }} />} onClick={onAdd} sx={{ justifyContent: "flex-start", color: "var(--text-secondary)" }}>
            Add card
          </Button>
        )}
      </Box>
    </Box>
  );
};

/** Kanban grouped by a single-select or checkbox field. */
const KanbanView = ({ rows, groupField, primary, cardFields, lookups, canEdit, onUpdateCells, onAddRow, onOpenRow, onPickGroup }) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const [dragId, setDragId] = useState(null);
  const lanes = useMemo(() => laneOptions(groupField), [groupField]);
  const byLane = useMemo(() => {
    const m = Object.fromEntries(lanes.map((l) => [l.key, []]));
    if (groupField) for (const r of rows) (m[laneOf(groupField, r)] || (m[NONE] ||= [])).push(r);
    return m;
  }, [rows, lanes, groupField]);

  if (!groupField) {
    return (
      <EmptyState
        title="Choose a field to group cards by"
        description="Kanban lanes come from a single-select or checkbox field, such as Status."
        action={onPickGroup}
      />
    );
  }
  const dragRow = dragId && rows.find((r) => r._id === dragId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setDragId(e.active.id)}
      onDragCancel={() => setDragId(null)}
      onDragEnd={(e) => {
        setDragId(null);
        const row = rows.find((r) => r._id === e.active.id);
        const lane = lanes.find((l) => l.key === e.over?.id);
        if (!row || !lane || laneOf(groupField, row) === lane.key) return;
        onUpdateCells([{ rowId: row._id, key: groupField.key, value: lane.value }]);
      }}
    >
      <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", flex: 1, minHeight: 0, pb: 1, alignItems: "stretch" }}>
        {lanes.map((lane) => (
          <Lane key={lane.key} lane={lane} count={byLane[lane.key]?.length || 0} canEdit={canEdit} onAdd={() => onAddRow({ [groupField.key]: lane.value })}>
            {(byLane[lane.key] || []).map((row) => (
              <DraggableCard key={row._id} row={row} primary={primary} cardFields={cardFields} lookups={lookups} onOpen={onOpenRow} canEdit={canEdit} />
            ))}
          </Lane>
        ))}
      </Box>
      <DragOverlay>{dragRow ? <Card row={dragRow} primary={primary} cardFields={cardFields} lookups={lookups} overlay /> : null}</DragOverlay>
    </DndContext>
  );
};

export default KanbanView;
