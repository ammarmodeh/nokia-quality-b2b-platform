import { useEffect, useMemo, useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, IconButton, ListSubheader, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import Add from "@mui/icons-material/Add";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import Badge from "../../components/ui/Badge";
import { CHOICE_COLORS, COLOR_NAMES, CORE_CONCEPTS, FIELD_TYPES, READ_ONLY, SELECT_TYPES } from "./fieldTypes";
import { tablesApi } from "./tablesApi";
import { errText } from "./useTable";

const GROUPS = ["Basic", "Contact", "App", "System"];
const blank = { label: "", type: "text", description: "", required: false, defaultValue: null, validation: {}, options: { choices: [] }, coreMapping: null, hidden: false };

const ColorDot = ({ name, selected, onClick }) => (
  <Box component="button" type="button" aria-label={name} aria-pressed={selected} onClick={onClick}
    sx={{ width: 18, height: 18, borderRadius: "50%", border: selected ? "2px solid var(--text)" : "2px solid transparent", backgroundColor: CHOICE_COLORS[name], cursor: "pointer", p: 0 }} />
);

/**
 * Create or edit one field. For an existing field, changing the type (or the
 * choices of a select) shows how many stored values convert before saving.
 */
const FieldEditor = ({ table, field, fields, onSaved, onCancel }) => {
  const isNew = !field;
  const [f, setF] = useState(() => ({ ...blank, ...(field || {}), options: { choices: [], ...(field?.options || {}) }, validation: { ...(field?.validation || {}) } }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [colorFor, setColorFor] = useState(null);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const setOpt = (patch) => setF((x) => ({ ...x, options: { ...x.options, ...patch } }));
  const setVal = (patch) => setF((x) => ({ ...x, validation: { ...x.validation, ...patch } }));

  const typeChanged = !isNew && (f.type !== field.type || JSON.stringify(f.options?.choices || []) !== JSON.stringify(field.options?.choices || []));
  const coreTaken = useMemo(() => Object.fromEntries(fields.filter((x) => x.coreMapping && x.key !== field?.key).map((x) => [x.coreMapping, x.label])), [fields, field]);

  // conversion preview, debounced
  useEffect(() => {
    if (!typeChanged) { setPreview(null); return undefined; }
    const id = setTimeout(async () => {
      try {
        setPreview(await tablesApi.previewConvert(table._id, field.key, { type: f.type, options: f.options }));
      } catch (e) {
        setPreview({ error: errText(e) });
      }
    }, 300);
    return () => clearTimeout(id);
  }, [typeChanged, f.type, f.options, table._id, field]);

  useEffect(() => {
    if (f.coreMapping && !CORE_CONCEPTS[f.coreMapping].types.includes(f.type)) set({ coreMapping: null });
  }, [f.type, f.coreMapping]);

  const choices = f.options?.choices || [];
  const setChoices = (list) => setOpt({ choices: list });

  const save = async () => {
    if (!f.label.trim()) return setError("Give the field a name");
    if (SELECT_TYPES.includes(f.type) && !choices.filter((c) => c.value.trim()).length) return setError("Add at least one option");
    setBusy(true);
    setError(null);
    try {
      const body = { ...f, options: { ...f.options, choices: choices.filter((c) => c.value.trim()) } };
      if (isNew) onSaved(await tablesApi.addField(table._id, body));
      else {
        const out = await tablesApi.updateField(table._id, field.key, body);
        onSaved(out.table, out.converted);
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField label="Field name" value={f.label} onChange={(e) => set({ label: e.target.value })} autoFocus={isNew} required inputProps={{ dir: "auto" }} />
      <TextField select label="Type" value={f.type} onChange={(e) => set({ type: e.target.value })} helperText={!isNew ? "Values are converted; any that don't fit are kept in the row history" : " "}>
        {GROUPS.flatMap((g) => [
          <ListSubheader key={g}>{g}</ListSubheader>,
          ...Object.entries(FIELD_TYPES).filter(([, m]) => m.group === g).map(([t, m]) => {
            const Icon = m.icon;
            return <MenuItem key={t} value={t}><Icon sx={{ fontSize: 17, mr: 1, color: "var(--text-muted)" }} />{m.label}</MenuItem>;
          }),
        ])}
      </TextField>
      <TextField label="Description" value={f.description || ""} onChange={(e) => set({ description: e.target.value })} multiline minRows={2} placeholder="Help text shown in the row sheet" />

      {SELECT_TYPES.includes(f.type) && (
        <Box>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 1 }}>Options</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {choices.map((c, i) => (
              <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.75, position: "relative" }}>
                <Tooltip title="Colour">
                  <Box component="button" type="button" onClick={() => setColorFor(colorFor === i ? null : i)} aria-label="Change colour" sx={{ width: 22, height: 22, borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: CHOICE_COLORS[c.color] || CHOICE_COLORS.gray, cursor: "pointer", flexShrink: 0 }} />
                </Tooltip>
                <TextField size="small" value={c.value} onChange={(e) => setChoices(choices.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} sx={{ flex: 1 }} inputProps={{ "aria-label": `Option ${i + 1}`, dir: "auto" }} />
                <IconButton size="small" aria-label="Move up" disabled={i === 0} onClick={() => { const l = [...choices]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; setChoices(l); }}><ArrowUpward sx={{ fontSize: 15 }} /></IconButton>
                <IconButton size="small" aria-label="Move down" disabled={i === choices.length - 1} onClick={() => { const l = [...choices]; [l[i + 1], l[i]] = [l[i], l[i + 1]]; setChoices(l); }}><ArrowDownward sx={{ fontSize: 15 }} /></IconButton>
                <IconButton size="small" aria-label="Remove option" onClick={() => setChoices(choices.filter((_x, j) => j !== i))}><DeleteOutline sx={{ fontSize: 16 }} /></IconButton>
                {colorFor === i && (
                  <Box sx={{ position: "absolute", top: 30, left: 0, zIndex: 3, display: "flex", gap: 0.5, p: 0.75, borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", boxShadow: "var(--shadow-md)" }}>
                    {COLOR_NAMES.map((n) => <ColorDot key={n} name={n} selected={c.color === n} onClick={() => { setChoices(choices.map((x, j) => (j === i ? { ...x, color: n } : x))); setColorFor(null); }} />)}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
          <Button size="small" startIcon={<Add />} sx={{ mt: 1 }} onClick={() => setChoices([...choices, { value: "", color: COLOR_NAMES[(choices.length + 1) % COLOR_NAMES.length] }])}>Add option</Button>
        </Box>
      )}

      {f.type === "number" && (
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <TextField select label="Format" value={f.options?.format || "decimal"} onChange={(e) => setOpt({ format: e.target.value })} sx={{ flex: 1 }}>
            <MenuItem value="integer">Integer</MenuItem>
            <MenuItem value="decimal">Decimal</MenuItem>
            <MenuItem value="percent">Percent</MenuItem>
          </TextField>
          <TextField label="Decimals" type="number" value={f.options?.precision ?? ""} onChange={(e) => setOpt({ precision: e.target.value === "" ? undefined : Number(e.target.value) })} sx={{ width: 110 }} />
        </Box>
      )}
      {f.type === "rating" && <TextField label="Maximum" type="number" value={f.options?.max || 5} onChange={(e) => setOpt({ max: Math.max(1, Math.min(10, Number(e.target.value) || 5)) })} />}
      {f.type === "user" && <FormControlLabel control={<Checkbox checked={Boolean(f.options?.multiple)} onChange={(e) => setOpt({ multiple: e.target.checked })} />} label="Allow several people" />}
      {f.type === "autoNumber" && <TextField label="Prefix" value={f.options?.prefix || ""} onChange={(e) => setOpt({ prefix: e.target.value })} placeholder="e.g. CC-" />}

      {!READ_ONLY.includes(f.type) && (
        <Box>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 0.5 }}>Rules</Typography>
          <FormControlLabel control={<Checkbox checked={Boolean(f.required)} onChange={(e) => set({ required: e.target.checked })} />} label="Required" />
          {["text", "phone", "email", "number"].includes(f.type) && <FormControlLabel control={<Checkbox checked={Boolean(f.validation?.unique)} onChange={(e) => setVal({ unique: e.target.checked })} />} label="Unique (no two rows share a value)" />}
          {["number", "rating"].includes(f.type) && (
            <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
              <TextField label="Minimum" type="number" value={f.validation?.min ?? ""} onChange={(e) => setVal({ min: e.target.value === "" ? undefined : Number(e.target.value) })} />
              <TextField label="Maximum" type="number" value={f.validation?.max ?? ""} onChange={(e) => setVal({ max: e.target.value === "" ? undefined : Number(e.target.value) })} />
            </Box>
          )}
          {f.type === "text" && <TextField sx={{ mt: 1 }} fullWidth label="Pattern (regular expression)" value={f.validation?.pattern || ""} onChange={(e) => setVal({ pattern: e.target.value || undefined })} placeholder="e.g. ^INT\d+$" />}
          {["text", "number", "singleSelect", "checkbox", "date"].includes(f.type) && (
            f.type === "singleSelect" ? (
              <TextField select sx={{ mt: 1.5 }} fullWidth label="Default value" value={f.defaultValue || ""} onChange={(e) => set({ defaultValue: e.target.value || null })}>
                <MenuItem value=""><em>None</em></MenuItem>
                {choices.filter((c) => c.value).map((c) => <MenuItem key={c.value} value={c.value}>{c.value}</MenuItem>)}
              </TextField>
            ) : f.type === "checkbox" ? (
              <FormControlLabel control={<Checkbox checked={f.defaultValue === true} onChange={(e) => set({ defaultValue: e.target.checked || null })} />} label="Checked by default" />
            ) : (
              <TextField sx={{ mt: 1.5 }} fullWidth label="Default value" type={f.type === "date" ? "date" : "text"} value={f.defaultValue ?? ""} onChange={(e) => set({ defaultValue: e.target.value || null })} slotProps={{ inputLabel: { shrink: true } }} />
            )
          )}
        </Box>
      )}

      <TextField select label="Feeds the app's" value={f.coreMapping || ""} onChange={(e) => set({ coreMapping: e.target.value || null })}
        helperText={f.coreMapping ? CORE_CONCEPTS[f.coreMapping].hint : "Map to a core concept so rows show up in the Calendar, Dashboard and task views"}>
        <MenuItem value=""><em>Nothing</em></MenuItem>
        {Object.entries(CORE_CONCEPTS).map(([k, c]) => (
          <MenuItem key={k} value={k} disabled={!c.types.includes(f.type) || Boolean(coreTaken[k])}>
            {c.label}{coreTaken[k] ? ` — used by “${coreTaken[k]}”` : !c.types.includes(f.type) ? ` — needs ${c.types.map((t) => FIELD_TYPES[t].label.toLowerCase()).join(" / ")}` : ""}
          </MenuItem>
        ))}
      </TextField>

      {typeChanged && preview && (
        <Box sx={{ p: 1.5, borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: preview.failed ? "var(--warning-subtle)" : "var(--surface-subtle)" }}>
          {preview.error ? (
            <Typography sx={{ fontSize: 12.5, color: "var(--danger)" }}>{preview.error}</Typography>
          ) : (
            <>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 0.75 }}>
                {preview.failed > 0 && <WarningAmberOutlined sx={{ fontSize: 16, color: "var(--warning)" }} />}
                {preview.total ? `${preview.ok} of ${preview.total} values convert cleanly` : "No stored values to convert"}
              </Typography>
              {preview.failed > 0 && (
                <>
                  <Typography sx={{ fontSize: 12, color: "var(--text-secondary)", mt: 0.5 }}>{preview.failed} won’t fit and will be cleared from the cell (kept in a “kept values” note on each row):</Typography>
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.75 }}>
                    {preview.samples.failed.map((s, i) => <Badge key={i} tone="warning" title={s.error}>{typeof s.from === "object" ? JSON.stringify(s.from) : String(s.from)}</Badge>)}
                  </Box>
                </>
              )}
              {preview.samples?.ok?.length > 0 && (
                <Typography sx={{ fontSize: 12, color: "var(--text-muted)", mt: 0.75 }}>
                  e.g. {preview.samples.ok.slice(0, 3).map((s) => `${typeof s.from === "object" ? JSON.stringify(s.from) : s.from} → ${typeof s.to === "object" ? JSON.stringify(s.to) : s.to}`).join(" · ")}
                </Typography>
              )}
            </>
          )}
        </Box>
      )}

      {error && <Typography sx={{ fontSize: 12.5, color: "var(--danger)" }}>{error}</Typography>}
      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
        <Button variant="outlined" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy || Boolean(preview?.error)}>{busy ? "Saving…" : isNew ? "Add field" : typeChanged && preview?.failed ? `Convert and save` : "Save"}</Button>
      </Box>
    </Box>
  );
};

export default FieldEditor;
