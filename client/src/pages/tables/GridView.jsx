import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box, Checkbox, IconButton, Tooltip, Typography } from "@mui/material";
import OpenInFull from "@mui/icons-material/OpenInFull";
import Add from "@mui/icons-material/Add";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ChevronRight from "@mui/icons-material/ChevronRight";
import Badge from "../../components/ui/Badge";
import { CellEditor, CellValue } from "./CellValue";
import { FIELD_TYPES, READ_ONLY, formatValue, parseInput } from "./fieldTypes";
import { fromTSV, rawOf, toTSV } from "./viewUtils";

const ROW_H = 34;
const NUM_W = 76;
const OVERSCAN = 12;
const TYPE_TO_EDIT = ["text", "longText", "number", "phone", "email", "url", "date", "datetime", "rating"];

/**
 * Spreadsheet grid for a custom table.
 * items: [{ kind: "row", row } | { kind: "group", key, label, count }] in display order.
 */
const GridView = ({
  fields, items, lookups, frozen = 1, widths = {}, onResize, canEdit, selected, onSelect,
  onUpdateCells, onAddRow, onAddRows, onOpenRow, onHeaderMenu, collapsed = {}, onToggleGroup, notify,
}) => {
  const scrollRef = useRef(null);
  const [scroll, setScroll] = useState({ top: 0, height: 600 });
  const [active, setActive] = useState(null); // { r, c }
  const [anchor, setAnchor] = useState(null);
  const [editing, setEditing] = useState(null); // { r, c, initial }
  const dragging = useRef(false);
  const focused = useRef(false);

  const colW = useCallback((f) => widths[f.key] || f.width || 180, [widths]);
  const lefts = useMemo(() => {
    const out = [];
    let x = NUM_W;
    fields.forEach((f, i) => {
      out.push(i < frozen ? x : null);
      x += colW(f);
    });
    return out;
  }, [fields, frozen, colW]);
  const totalW = NUM_W + fields.reduce((n, f) => n + colW(f), 0) + 44;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setScroll((s) => ({ ...s, height: el.clientHeight })));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const start = Math.max(0, Math.floor(scroll.top / ROW_H) - OVERSCAN);
  const end = Math.min(items.length, Math.ceil((scroll.top + scroll.height) / ROW_H) + OVERSCAN);

  // keep the active cell valid when rows change
  useEffect(() => {
    if (active && (active.r >= items.length || active.c >= fields.length)) {
      setActive(null);
      setAnchor(null);
      setEditing(null);
    }
  }, [items.length, fields.length, active]);

  const range = useMemo(() => {
    if (!active) return null;
    const a = anchor || active;
    return { r1: Math.min(a.r, active.r), r2: Math.max(a.r, active.r), c1: Math.min(a.c, active.c), c2: Math.max(a.c, active.c) };
  }, [active, anchor]);
  const inRange = (r, c) => range && r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2;

  const editable = (f) => canEdit && !READ_ONLY.includes(f.type);
  const rowAt = (r) => (items[r]?.kind === "row" ? items[r].row : null);

  const scrollIntoView = (r, c) => {
    const el = scrollRef.current;
    if (!el) return;
    const y = r * ROW_H;
    const headerH = ROW_H;
    if (y < el.scrollTop) el.scrollTop = y;
    else if (y + ROW_H + headerH > el.scrollTop + el.clientHeight) el.scrollTop = y + ROW_H * 2 + headerH - el.clientHeight;
    if (c >= frozen) {
      let x = NUM_W;
      for (let i = 0; i < c; i++) x += colW(fields[i]);
      const frozenW = lefts[frozen - 1] !== undefined && frozen > 0 ? lefts[frozen - 1] + colW(fields[frozen - 1]) : NUM_W;
      if (x < el.scrollLeft + frozenW) el.scrollLeft = x - frozenW;
      else if (x + colW(fields[c]) > el.scrollLeft + el.clientWidth) el.scrollLeft = x + colW(fields[c]) - el.clientWidth;
    }
  };

  const move = (dr, dc, extend = false) => {
    if (!items.length || !fields.length) return;
    const cur = active || { r: 0, c: 0 };
    let r = Math.max(0, Math.min(items.length - 1, cur.r + dr));
    // skip group header rows
    while (items[r]?.kind === "group" && r + Math.sign(dr || 1) >= 0 && r + Math.sign(dr || 1) < items.length) r += Math.sign(dr || 1);
    if (items[r]?.kind === "group") return;
    const c = Math.max(0, Math.min(fields.length - 1, cur.c + dc));
    if (extend) setAnchor((a) => a || cur);
    else setAnchor(null);
    setActive({ r, c });
    scrollIntoView(r, c);
  };

  const commit = async (r, c, raw, then) => {
    const f = fields[c];
    const row = rowAt(r);
    setEditing(null);
    scrollRef.current?.focus({ preventScroll: true });
    if (!row) return;
    const parsed = ["singleSelect", "multiSelect", "checkbox", "user", "fieldTeam", "taxonomy", "rating"].includes(f.type) ? { value: raw } : parseInput(f, raw, lookups);
    if (parsed.error) return notify(`${f.label}: ${parsed.error}`);
    const prev = rawOf(f, row);
    if (JSON.stringify(prev ?? null) !== JSON.stringify(parsed.value ?? null)) await onUpdateCells([{ rowId: row._id, key: f.key, value: parsed.value }]);
    if (then === "down") move(1, 0);
    if (then === "right") move(0, 1);
    if (then === "left") move(0, -1);
  };

  const startEdit = (r, c, initial) => {
    const f = fields[c];
    if (!editable(f) || !rowAt(r)) return;
    if (f.type === "checkbox") {
      const row = rowAt(r);
      onUpdateCells([{ rowId: row._id, key: f.key, value: !rawOf(f, row) }]);
      return;
    }
    setEditing({ r, c, initial });
  };

  const cellsInRange = () => {
    const out = [];
    if (!range) return out;
    for (let r = range.r1; r <= range.r2; r++) {
      const row = rowAt(r);
      if (row) out.push({ r, row });
    }
    return out;
  };

  const clearRange = () => {
    const updates = [];
    for (const { row } of cellsInRange())
      for (let c = range.c1; c <= range.c2; c++) {
        const f = fields[c];
        if (editable(f) && rawOf(f, row) !== null && rawOf(f, row) !== undefined) updates.push({ rowId: row._id, key: f.key, value: f.type === "checkbox" ? false : null });
      }
    if (updates.length) onUpdateCells(updates);
  };

  const fillDown = () => {
    if (!range || range.r1 === range.r2) return;
    const top = rowAt(range.r1);
    if (!top) return;
    const updates = [];
    for (const { row, r } of cellsInRange()) {
      if (r === range.r1) continue;
      for (let c = range.c1; c <= range.c2; c++) {
        const f = fields[c];
        if (editable(f)) updates.push({ rowId: row._id, key: f.key, value: rawOf(f, top) ?? null });
      }
    }
    if (updates.length) onUpdateCells(updates);
  };

  // ---- clipboard (document-level events while the grid has focus)
  useEffect(() => {
    const onCopy = (e) => {
      if (!focused.current || editing || !range) return;
      const matrix = cellsInRange().map(({ row }) => fields.slice(range.c1, range.c2 + 1).map((f) => formatValue(f, rawOf(f, row), row, lookups)));
      e.clipboardData.setData("text/plain", toTSV(matrix));
      e.preventDefault();
    };
    const onPaste = async (e) => {
      if (!focused.current || editing || !active || !canEdit) return;
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;
      e.preventDefault();
      const matrix = fromTSV(text);
      // a single value pasted onto a range fills the whole range
      const single = matrix.length === 1 && matrix[0].length === 1 && range && (range.r1 !== range.r2 || range.c1 !== range.c2);
      const updates = [];
      const newRows = [];
      let errors = 0;
      const targetRows = [];
      for (let r = active.r; targetRows.length < (single ? range.r2 - range.r1 + 1 : matrix.length) && r < items.length; r++) if (rowAt(r)) targetRows.push(rowAt(r));
      const startR = single ? range.r1 : active.r;
      const startC = single ? range.c1 : active.c;
      if (single) {
        targetRows.length = 0;
        for (let r = range.r1; r <= range.r2; r++) if (rowAt(r)) targetRows.push(rowAt(r));
      }
      const lines = single ? targetRows.map(() => Array(range.c2 - range.c1 + 1).fill(matrix[0][0])) : matrix;
      lines.forEach((line, i) => {
        const data = {};
        line.forEach((val, j) => {
          const f = fields[startC + j];
          if (!f || !editable(f)) return;
          const p = parseInput(f, val, lookups);
          if (p.error) errors++;
          else data[f.key] = p.value;
        });
        const row = targetRows[i];
        if (row) Object.entries(data).forEach(([key, value]) => updates.push({ rowId: row._id, key, value }));
        else if (Object.keys(data).length) newRows.push(data);
      });
      if (updates.length) await onUpdateCells(updates);
      if (newRows.length) await onAddRows(newRows);
      if (errors) notify(`${errors} pasted value${errors === 1 ? "" : "s"} didn't fit the column type and were skipped`);
      if (!single) {
        setAnchor({ r: startR, c: startC });
        setActive({ r: Math.min(items.length - 1 + newRows.length, startR + lines.length - 1), c: Math.min(fields.length - 1, startC + (lines[0]?.length || 1) - 1) });
      }
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
    };
  });

  const onKeyDown = (e) => {
    if (editing) return;
    const mod = e.ctrlKey || e.metaKey;
    if (!active && ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
      e.preventDefault();
      const r = items.findIndex((i) => i.kind === "row");
      if (r >= 0) setActive({ r, c: 0 });
      return;
    }
    if (!active) return;
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); return move(mod ? items.length : 1, 0, e.shiftKey);
      case "ArrowUp": e.preventDefault(); return move(mod ? -items.length : -1, 0, e.shiftKey);
      case "ArrowRight": e.preventDefault(); return move(0, mod ? fields.length : 1, e.shiftKey);
      case "ArrowLeft": e.preventDefault(); return move(0, mod ? -fields.length : -1, e.shiftKey);
      case "Tab": e.preventDefault(); return move(0, e.shiftKey ? -1 : 1);
      case "Enter":
        e.preventDefault();
        if (e.shiftKey || mod) return rowAt(active.r) && onOpenRow(rowAt(active.r));
        return startEdit(active.r, active.c);
      case "F2": e.preventDefault(); return startEdit(active.r, active.c);
      case "Escape": setAnchor(null); return undefined;
      case " ":
        if (e.shiftKey) { e.preventDefault(); return rowAt(active.r) && onOpenRow(rowAt(active.r)); }
        if (fields[active.c]?.type === "checkbox") { e.preventDefault(); return startEdit(active.r, active.c); }
        break;
      case "Delete":
      case "Backspace": e.preventDefault(); return clearRange();
      default: break;
    }
    if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); return fillDown(); }
    if (mod && e.key.toLowerCase() === "a") {
      e.preventDefault();
      setAnchor({ r: 0, c: 0 });
      setActive({ r: items.length - 1, c: fields.length - 1 });
      return undefined;
    }
    if (!mod && !e.altKey && e.key.length === 1) {
      const f = fields[active.c];
      if (editable(f)) {
        e.preventDefault();
        if (TYPE_TO_EDIT.includes(f.type)) setEditing({ r: active.r, c: active.c, initial: e.key });
        else startEdit(active.r, active.c);
      }
    }
    return undefined;
  };

  // ---- column resize
  const startResize = (e, f) => {
    e.preventDefault();
    e.stopPropagation();
    const x0 = e.clientX;
    const w0 = colW(f);
    let w = w0;
    const onMove = (ev) => {
      w = Math.max(70, Math.min(640, w0 + ev.clientX - x0));
      onResize(f.key, w, false);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      onResize(f.key, w, true);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  useEffect(() => {
    const up = () => { dragging.current = false; };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const rowIds = items.filter((i) => i.kind === "row").map((i) => i.row._id);
  const allSelected = rowIds.length > 0 && rowIds.every((id) => selected.has(id));

  const frozenEdge = (i) => (i === frozen - 1 ? { boxShadow: "inset -1px 0 0 var(--border-strong)" } : {});

  return (
    <Box
      ref={scrollRef}
      tabIndex={0}
      role="grid"
      aria-rowcount={items.length}
      aria-colcount={fields.length}
      aria-label="Table rows"
      onKeyDown={onKeyDown}
      onFocus={() => { focused.current = true; }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) focused.current = false; }}
      onScroll={(e) => setScroll({ top: e.currentTarget.scrollTop, height: e.currentTarget.clientHeight })}
      sx={{ position: "relative", overflow: "auto", flex: 1, minHeight: 240, border: "1px solid var(--border)", borderRadius: "10px", backgroundColor: "var(--surface)", outline: "none", "&:focus-visible": { boxShadow: "0 0 0 2px var(--focus-ring)" }, fontSize: 13 }}
    >
      <Box sx={{ width: totalW, minWidth: "100%" }}>
        {/* header */}
        <Box role="row" sx={{ display: "flex", position: "sticky", top: 0, zIndex: 4, height: ROW_H, backgroundColor: "var(--surface-subtle)", borderBottom: "1px solid var(--border)" }}>
          <Box sx={{ width: NUM_W, flexShrink: 0, position: "sticky", left: 0, zIndex: 3, display: "flex", alignItems: "center", pl: 0.5, backgroundColor: "var(--surface-subtle)", borderRight: "1px solid var(--border)" }}>
            <Checkbox size="small" checked={allSelected} indeterminate={!allSelected && rowIds.some((id) => selected.has(id))} onChange={(e) => onSelect(e.target.checked ? new Set(rowIds) : new Set())} inputProps={{ "aria-label": "Select all rows" }} />
          </Box>
          {fields.map((f, i) => {
            const Icon = FIELD_TYPES[f.type]?.icon;
            return (
              <Box key={f.key} role="columnheader" onClick={(e) => onHeaderMenu(f, e.currentTarget)}
                sx={{ width: colW(f), flexShrink: 0, position: lefts[i] !== null ? "sticky" : "relative", left: lefts[i] ?? undefined, zIndex: lefts[i] !== null ? 3 : 1, display: "flex", alignItems: "center", gap: 0.75, px: 1, cursor: "pointer", color: "var(--text-secondary)", fontWeight: 500, fontSize: 12.5, backgroundColor: "var(--surface-subtle)", borderRight: "1px solid var(--border)", userSelect: "none", "&:hover": { color: "var(--text)", backgroundColor: "var(--surface-hover)" }, ...frozenEdge(i) }}>
                {Icon && <Icon sx={{ fontSize: 15, color: "var(--text-muted)", flexShrink: 0 }} />}
                <Box dir="auto" component="span" title={f.label} sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{f.label}{f.required ? " *" : ""}</Box>
                {f.coreMapping && <Tooltip title={`Feeds ${f.coreMapping}`}><Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--accent)", flexShrink: 0 }} /></Tooltip>}
                {onResize && <Box onMouseDown={(e) => startResize(e, f)} onClick={(e) => e.stopPropagation()} aria-hidden sx={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 7, cursor: "col-resize", zIndex: 2, "&:hover": { backgroundColor: "var(--accent-ring)" } }} />}
              </Box>
            );
          })}
          <Box sx={{ width: 44, flexShrink: 0 }} />
        </Box>

        {/* body */}
        <Box sx={{ height: start * ROW_H }} />
        {items.slice(start, end).map((item, k) => {
          const r = start + k;
          if (item.kind === "group") {
            return (
              <Box key={`g-${item.key}`} role="row" sx={{ display: "flex", alignItems: "center", height: ROW_H, borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface-subtle)" }}>
                <Box sx={{ position: "sticky", left: 0, display: "flex", alignItems: "center", gap: 1, px: 1, zIndex: 2 }}>
                  <IconButton size="small" aria-label={collapsed[item.key] ? "Expand group" : "Collapse group"} onClick={() => onToggleGroup(item.key)}>
                    {collapsed[item.key] ? <ChevronRight sx={{ fontSize: 17 }} /> : <ExpandMore sx={{ fontSize: 17 }} />}
                  </IconButton>
                  <Typography dir="auto" sx={{ fontSize: 13, fontWeight: 600 }}>{item.label}</Typography>
                  <Badge>{item.count}</Badge>
                </Box>
              </Box>
            );
          }
          const row = item.row;
          const isSel = selected.has(row._id);
          const rowBg = isSel ? "var(--accent-subtle)" : "var(--surface)";
          return (
            <Box key={row._id} role="row" aria-rowindex={r + 1} aria-selected={isSel}
              sx={{ display: "flex", height: ROW_H, borderBottom: "1px solid var(--border)", backgroundColor: rowBg, "&:hover .row-tools": { opacity: 1 }, "&:hover > .cell": { backgroundColor: isSel ? "var(--accent-subtle)" : "var(--surface-hover)" } }}>
              <Box className="cell" sx={{ width: NUM_W, flexShrink: 0, position: "sticky", left: 0, zIndex: 2, display: "flex", alignItems: "center", pl: 0.5, gap: 0.25, backgroundColor: rowBg, borderRight: "1px solid var(--border)" }}>
                <Checkbox size="small" checked={isSel} onChange={(e) => { const next = new Set(selected); if (e.target.checked) next.add(row._id); else next.delete(row._id); onSelect(next); }} inputProps={{ "aria-label": `Select row ${row.autoNumber}` }} />
                <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)", width: 20, textAlign: "right", fontVariantNumeric: "tabular-nums" }} className="row-num">{row.autoNumber}</Typography>
                <Tooltip title="Expand row (Shift+Space)">
                  <IconButton className="row-tools" size="small" aria-label="Expand row" onClick={() => onOpenRow(row)} sx={{ opacity: 0, width: 22, height: 22, "&:focus-visible": { opacity: 1 } }}>
                    <OpenInFull sx={{ fontSize: 13 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              {fields.map((f, c) => {
                const isActive = active && active.r === r && active.c === c;
                const isEditing = editing && editing.r === r && editing.c === c;
                const sel = inRange(r, c);
                const bg = sel && !isActive ? "color-mix(in srgb, var(--accent) 9%, var(--surface))" : rowBg;
                return (
                  <Box key={f.key} className="cell" role="gridcell" aria-selected={sel}
                    onMouseDown={(e) => {
                      if (isEditing) return;
                      if (e.button !== 0) return;
                      if (e.shiftKey && active) setAnchor((a) => a || active);
                      else setAnchor({ r, c });
                      setActive({ r, c });
                      dragging.current = true;
                    }}
                    onMouseEnter={() => {
                      if (dragging.current && !editing) setActive({ r, c });
                    }}
                    onDoubleClick={() => startEdit(r, c)}
                    sx={{
                      width: colW(f), flexShrink: 0, position: lefts[c] !== null ? "sticky" : "relative", left: lefts[c] ?? undefined, zIndex: isEditing ? 5 : lefts[c] !== null ? 2 : 0,
                      display: "flex", alignItems: "center", px: 1, minWidth: 0, borderRight: "1px solid var(--border)", backgroundColor: bg, cursor: "default",
                      boxShadow: isActive && !isEditing ? "inset 0 0 0 2px var(--accent)" : lefts[c] !== null && c === frozen - 1 ? "inset -1px 0 0 var(--border-strong)" : "none",
                      color: READ_ONLY.includes(f.type) ? "var(--text-secondary)" : "var(--text)",
                    }}>
                    {isEditing ? (
                      <Box sx={{ position: "absolute", left: 0, top: 0, width: f.type === "longText" ? Math.max(colW(f), 340) : f.type === "multiSelect" || f.type === "user" ? Math.max(colW(f), 260) : "100%", zIndex: 6 }}>
                        <CellEditor field={f} value={rawOf(f, row)} lookups={lookups} initial={editing.initial}
                          onCommit={(v, dir) => commit(r, c, v, dir || (["singleSelect", "multiSelect", "user", "fieldTeam", "taxonomy", "rating"].includes(f.type) ? null : "down"))}
                          onCancel={() => { setEditing(null); scrollRef.current?.focus({ preventScroll: true }); }} />
                      </Box>
                    ) : (
                      <Box sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}><CellValue field={f} value={rawOf(f, row)} row={row} lookups={lookups} /></Box>
                    )}
                  </Box>
                );
              })}
              <Box sx={{ width: 44, flexShrink: 0 }} />
            </Box>
          );
        })}
        <Box sx={{ height: Math.max(0, (items.length - end) * ROW_H) }} />
        {canEdit && (
          <Box component="button" type="button" onClick={onAddRow}
            sx={{ display: "flex", alignItems: "center", gap: 0.75, height: ROW_H, width: "100%", border: 0, borderBottom: "1px solid var(--border)", font: "inherit", fontSize: 13, color: "var(--text-secondary)", backgroundColor: "transparent", cursor: "pointer", pl: 1.5, position: "sticky", left: 0, "&:hover": { backgroundColor: "var(--surface-hover)", color: "var(--text)" } }}>
            <Add sx={{ fontSize: 17 }} />New row
          </Box>
        )}
        {!items.length && (
          <Typography sx={{ p: 3, fontSize: 13, color: "var(--text-muted)", position: "sticky", left: 0 }}>No rows match this view.</Typography>
        )}
      </Box>
    </Box>
  );
};

export default GridView;
