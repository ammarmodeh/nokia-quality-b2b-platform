import { useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import DragIndicator from "@mui/icons-material/DragIndicator";
import EditOutlined from "@mui/icons-material/EditOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import ArchiveOutlined from "@mui/icons-material/ArchiveOutlined";
import UnarchiveOutlined from "@mui/icons-material/UnarchiveOutlined";
import DeleteForeverOutlined from "@mui/icons-material/DeleteForeverOutlined";
import Add from "@mui/icons-material/Add";
import Sheet from "../../components/ui/Sheet";
import Badge from "../../components/ui/Badge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import FieldEditor from "./FieldEditor";
import { CORE_CONCEPTS, FIELD_TYPES } from "./fieldTypes";
import { tablesApi } from "./tablesApi";
import { errText } from "./useTable";

const FieldRow = ({ field, hidden, onEdit, onToggle, onArchive, isPrimary }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.key });
  const Icon = FIELD_TYPES[field.type]?.icon;
  return (
    <Box ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, py: 0.75, borderBottom: "1px solid var(--border)", backgroundColor: isDragging ? "var(--surface-hover)" : "var(--surface)", position: "relative", zIndex: isDragging ? 2 : 0 }}>
      <Box {...attributes} {...listeners} aria-label={`Reorder ${field.label}`} sx={{ cursor: "grab", display: "flex", color: "var(--text-muted)", touchAction: "none" }}><DragIndicator sx={{ fontSize: 18 }} /></Box>
      {Icon && <Icon sx={{ fontSize: 16, color: "var(--text-muted)" }} />}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography dir="auto" noWrap sx={{ fontSize: 13, fontWeight: 500, color: hidden ? "var(--text-muted)" : "var(--text)" }}>{field.label}{field.required ? " *" : ""}</Typography>
        <Typography noWrap sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>{FIELD_TYPES[field.type]?.label}{isPrimary ? " · primary" : ""}</Typography>
      </Box>
      {field.coreMapping && <Badge tone="accent">{CORE_CONCEPTS[field.coreMapping]?.label}</Badge>}
      <Tooltip title={hidden ? "Show in this view" : "Hide in this view"}><IconButton size="small" onClick={onToggle} aria-label={hidden ? "Show field" : "Hide field"}>{hidden ? <VisibilityOffOutlined sx={{ fontSize: 16 }} /> : <VisibilityOutlined sx={{ fontSize: 16 }} />}</IconButton></Tooltip>
      {onEdit && <Tooltip title="Edit field"><IconButton size="small" onClick={onEdit} aria-label="Edit field"><EditOutlined sx={{ fontSize: 16 }} /></IconButton></Tooltip>}
      {onArchive && <Tooltip title="Archive field (data is kept)"><IconButton size="small" onClick={onArchive} aria-label="Archive field"><ArchiveOutlined sx={{ fontSize: 16 }} /></IconButton></Tooltip>}
    </Box>
  );
};

/**
 * Field manager: order, visibility (per view), edit, archive and restore.
 * Structure changes are admin-only; anyone can show / hide fields in their view.
 */
const FieldManagerSheet = ({ open, onClose, table, fields, hiddenFields, onToggleHidden, onReorder, isAdmin, onTableChange, notify, initialEdit }) => {
  const [editing, setEditing] = useState(initialEdit || null); // field | "new" | null
  const [confirm, setConfirm] = useState(null); // { kind, field }
  const [busy, setBusy] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const archived = (table?.fields || []).filter((f) => f.archived);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      const t = await fn();
      onTableChange(t);
      if (okMsg) notify(okMsg, "neutral");
    } catch (e) {
      notify(errText(e));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const keys = fields.map((f) => f.key);
    const next = arrayMove(keys, keys.indexOf(active.id), keys.indexOf(over.id));
    onReorder(next);
  };

  const title = editing === "new" ? "New field" : editing ? `Edit “${editing.label}”` : "Fields";
  return (
    <Sheet open={open} onClose={() => { setEditing(null); onClose(); }} title={title} description={editing ? undefined : `${fields.length} fields · drag to reorder · rows keep their data when you rename a field`} width={500}
      actions={!editing && isAdmin ? <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setEditing("new")}>Add field</Button> : undefined}>
      {editing ? (
        <FieldEditor
          table={table}
          field={editing === "new" ? null : editing}
          fields={table.fields.filter((f) => !f.archived)}
          onCancel={() => setEditing(null)}
          onSaved={(t, converted) => {
            onTableChange(t);
            setEditing(null);
            notify(converted?.failed ? `Saved. ${converted.failed} value${converted.failed === 1 ? "" : "s"} didn’t convert; their old values are kept on each row.` : "Field saved", converted?.failed ? "warning" : "neutral");
          }}
        />
      ) : (
        <>
          <Box sx={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={fields.map((f) => f.key)} strategy={verticalListSortingStrategy}>
                {fields.map((f) => (
                  <FieldRow key={f.key} field={f} isPrimary={table.primaryField === f.key} hidden={hiddenFields.includes(f.key)} onToggle={() => onToggleHidden(f.key)}
                    onEdit={isAdmin ? () => setEditing(f) : undefined} onArchive={isAdmin && fields.length > 1 ? () => setConfirm({ kind: "archive", field: f }) : undefined} />
                ))}
              </SortableContext>
            </DndContext>
          </Box>
          {isAdmin && archived.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.75 }}>Archived fields</Typography>
              <Typography sx={{ fontSize: 12, color: "var(--text-muted)", mb: 1 }}>Their data is still stored. Restore a field to bring its values back.</Typography>
              <Box sx={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
                {archived.map((f) => (
                  <Box key={f.key} sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 0.75, borderBottom: "1px solid var(--border)", "&:last-of-type": { borderBottom: 0 } }}>
                    <Typography dir="auto" sx={{ fontSize: 13, flex: 1, color: "var(--text-secondary)" }}>{f.label} <span style={{ color: "var(--text-muted)" }}>· {FIELD_TYPES[f.type]?.label}</span></Typography>
                    <Button size="small" startIcon={<UnarchiveOutlined sx={{ fontSize: 16 }} />} disabled={busy} onClick={() => run(() => tablesApi.restoreField(table._id, f.key), `“${f.label}” restored`)}>Restore</Button>
                    <Tooltip title="Delete permanently with its data">
                      <IconButton size="small" aria-label="Delete permanently" onClick={() => setConfirm({ kind: "delete", field: f })}><DeleteForeverOutlined sx={{ fontSize: 17, color: "var(--danger)" }} /></IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </>
      )}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === "delete" ? `Delete “${confirm?.field.label}” permanently?` : `Archive “${confirm?.field.label}”?`}
        description={confirm?.kind === "delete" ? "The field and every value stored in it are removed for good. This can't be undone." : "The field disappears from views and forms. Its values stay stored, and you can restore it any time."}
        confirmLabel={confirm?.kind === "delete" ? "Delete permanently" : "Archive field"}
        danger={confirm?.kind === "delete"}
        loading={busy}
        onClose={() => setConfirm(null)}
        onConfirm={() => run(() => tablesApi.archiveField(table._id, confirm.field.key, confirm.kind === "delete"), confirm.kind === "delete" ? "Field deleted" : "Field archived")}
      />
    </Sheet>
  );
};

export default FieldManagerSheet;
