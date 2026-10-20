import { useState } from "react";
import { Box, Button, IconButton, MenuItem, Popover, TextField, Typography } from "@mui/material";
import FilterList from "@mui/icons-material/FilterList";
import SwapVert from "@mui/icons-material/SwapVert";
import Close from "@mui/icons-material/Close";
import Add from "@mui/icons-material/Add";
import { TAXONOMY } from "../../constants/taxonomy";
import { OPS, opsFor } from "./viewUtils";

const countBtn = (active) => ({ color: active ? "var(--accent-text)" : undefined, borderColor: active ? "var(--accent-ring)" : undefined, backgroundColor: active ? "var(--accent-subtle)" : undefined });

const ValueInput = ({ field, value, onChange, lookups }) => {
  const common = { size: "small", sx: { flex: 1, minWidth: 140 }, slotProps: { htmlInput: { "aria-label": "Value" } } };
  switch (field.type) {
    case "singleSelect":
    case "multiSelect":
      return <TextField select {...common} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>{(field.options?.choices || []).map((c) => <MenuItem key={c.value} value={c.value}>{c.value}</MenuItem>)}</TextField>;
    case "checkbox":
      return <TextField select {...common} value={String(value ?? "true")} onChange={(e) => onChange(e.target.value === "true")}><MenuItem value="true">Checked</MenuItem><MenuItem value="false">Unchecked</MenuItem></TextField>;
    case "user":
      return <TextField select {...common} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>{lookups.userList.map((u) => <MenuItem key={u._id} value={u._id}>{u.name}</MenuItem>)}</TextField>;
    case "fieldTeam":
      return <TextField select {...common} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>{lookups.teamList.map((t) => <MenuItem key={t._id} value={t._id}>{t.teamName}</MenuItem>)}</TextField>;
    case "taxonomy":
      return <TextField select {...common} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>{TAXONOMY.flatMap((t) => [<MenuItem key={t.label} value={t.label}>{t.label}</MenuItem>, ...t.subs.map((s) => <MenuItem key={`${t.label}·${s}`} value={`${t.label} · ${s}`} sx={{ pl: 4 }}>{s}</MenuItem>)])}</TextField>;
    case "date":
    case "datetime":
    case "createdTime":
    case "updatedTime":
      return <TextField {...common} type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "number":
    case "rating":
    case "autoNumber":
      return <TextField {...common} type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    default:
      return <TextField {...common} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="Value" />;
  }
};

/** Filter builder (all conditions must match). */
export const FilterButton = ({ fields, filters, onChange, lookups }) => {
  const [anchor, setAnchor] = useState(null);
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
  const update = (i, patch) => onChange(filters.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <>
      <Button variant="outlined" size="small" startIcon={<FilterList sx={{ fontSize: 17 }} />} onClick={(e) => setAnchor(e.currentTarget)} sx={countBtn(filters.length)}>
        Filter{filters.length ? ` · ${filters.length}` : ""}
      </Button>
      <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
        <Box sx={{ p: 1.5, width: { xs: "calc(100vw - 32px)", sm: 560 }, display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{filters.length ? "Rows where all of these match" : "No filters yet"}</Typography>
          {filters.map((flt, i) => {
            const f = byKey[flt.field];
            if (!f) return null;
            const ops = opsFor(f);
            return (
              <Box key={i} sx={{ display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
                <TextField select size="small" value={flt.field} onChange={(e) => update(i, { field: e.target.value, op: opsFor(byKey[e.target.value])[0], value: "" })} sx={{ width: 170 }} slotProps={{ htmlInput: { "aria-label": "Field" } }}>
                  {fields.map((x) => <MenuItem key={x.key} value={x.key}>{x.label}</MenuItem>)}
                </TextField>
                <TextField select size="small" value={ops.includes(flt.op) ? flt.op : ops[0]} onChange={(e) => update(i, { op: e.target.value })} sx={{ width: 130 }} slotProps={{ htmlInput: { "aria-label": "Condition" } }}>
                  {ops.map((o) => <MenuItem key={o} value={o}>{OPS[o].label}</MenuItem>)}
                </TextField>
                {OPS[flt.op]?.needs !== false && <ValueInput field={f} value={flt.value} onChange={(value) => update(i, { value })} lookups={lookups} />}
                <IconButton size="small" aria-label="Remove filter" onClick={() => onChange(filters.filter((_x, j) => j !== i))}><Close sx={{ fontSize: 16 }} /></IconButton>
              </Box>
            );
          })}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" startIcon={<Add />} onClick={() => onChange([...filters, { field: fields[0].key, op: opsFor(fields[0])[0], value: "" }])}>Add condition</Button>
            {filters.length > 0 && <Button size="small" color="inherit" onClick={() => onChange([])}>Clear all</Button>}
          </Box>
        </Box>
      </Popover>
    </>
  );
};

/** Multi-level sort. */
export const SortButton = ({ fields, sorts, onChange }) => {
  const [anchor, setAnchor] = useState(null);
  const update = (i, patch) => onChange(sorts.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <>
      <Button variant="outlined" size="small" startIcon={<SwapVert sx={{ fontSize: 17 }} />} onClick={(e) => setAnchor(e.currentTarget)} sx={countBtn(sorts.length)}>
        Sort{sorts.length ? ` · ${sorts.length}` : ""}
      </Button>
      <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
        <Box sx={{ p: 1.5, width: { xs: "calc(100vw - 32px)", sm: 400 }, display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{sorts.length ? "Sort by" : "No sorting — rows keep their order"}</Typography>
          {sorts.map((s, i) => (
            <Box key={i} sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
              <TextField select size="small" value={s.field} onChange={(e) => update(i, { field: e.target.value })} sx={{ flex: 1 }} slotProps={{ htmlInput: { "aria-label": "Sort field" } }}>
                {fields.map((x) => <MenuItem key={x.key} value={x.key}>{x.label}</MenuItem>)}
              </TextField>
              <TextField select size="small" value={s.dir} onChange={(e) => update(i, { dir: e.target.value })} sx={{ width: 130 }} slotProps={{ htmlInput: { "aria-label": "Direction" } }}>
                <MenuItem value="asc">Ascending</MenuItem>
                <MenuItem value="desc">Descending</MenuItem>
              </TextField>
              <IconButton size="small" aria-label="Remove sort" onClick={() => onChange(sorts.filter((_x, j) => j !== i))}><Close sx={{ fontSize: 16 }} /></IconButton>
            </Box>
          ))}
          <Button size="small" startIcon={<Add />} sx={{ alignSelf: "flex-start" }} onClick={() => onChange([...sorts, { field: fields.find((f) => !sorts.some((s) => s.field === f.key))?.key || fields[0].key, dir: "asc" }])}>Add sort</Button>
        </Box>
      </Popover>
    </>
  );
};
