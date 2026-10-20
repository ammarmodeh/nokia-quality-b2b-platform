import { useEffect, useRef, useState } from "react";
import { Autocomplete, Box, Checkbox, MenuItem, Rating, TextField } from "@mui/material";
import CheckBoxRounded from "@mui/icons-material/CheckBoxRounded";
import CheckBoxOutlineBlank from "@mui/icons-material/CheckBoxOutlineBlank";
import AttachFileOutlined from "@mui/icons-material/AttachFileOutlined";
import Badge from "../../components/ui/Badge";
import TaxonomyBadge from "../../components/ui/TaxonomyBadge";
import { TAXONOMY, taxonomyByLabel, taxonomyLabel } from "../../constants/taxonomy";
import { choiceColor, formatValue } from "./fieldTypes";

const ellipsis = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

/** Read-only rendering of one cell. */
export const CellValue = ({ field, value, row, lookups, wrap = false }) => {
  const v = value;
  const none = v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
  switch (field.type) {
    case "checkbox":
      return v ? <CheckBoxRounded sx={{ fontSize: 18, color: "var(--accent)" }} /> : <CheckBoxOutlineBlank sx={{ fontSize: 18, color: "var(--border-strong)" }} />;
    case "singleSelect":
      return none ? null : <Badge color={choiceColor(field, v)} sx={{ maxWidth: "100%", ...ellipsis, display: "inline-block", lineHeight: "20px" }}>{v}</Badge>;
    case "multiSelect":
      return none ? null : (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: wrap ? "wrap" : "nowrap", overflow: "hidden" }}>
          {v.map((x) => <Badge key={x} color={choiceColor(field, x)}>{x}</Badge>)}
        </Box>
      );
    case "taxonomy":
      return none ? null : <TaxonomyBadge tax={{ category: v.category, subCategory: v.sub, color: taxonomyByLabel[v.category]?.color, label: taxonomyLabel(v.category, v.sub) }} />;
    case "rating":
      return none ? null : <Rating value={Number(v)} max={field.options?.max || 5} readOnly size="small" />;
    case "url":
      return none ? null : <a href={v} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "var(--accent-text)", ...ellipsis, display: "block" }}>{v}</a>;
    case "email":
      return none ? null : <a href={`mailto:${v}`} onClick={(e) => e.stopPropagation()} style={{ color: "var(--accent-text)", ...ellipsis, display: "block" }}>{v}</a>;
    case "attachment":
      return none ? null : <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "var(--text-secondary)", fontSize: 12.5 }}><AttachFileOutlined sx={{ fontSize: 15 }} />{v.length}</Box>;
    case "number":
      return <Box sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums", ...ellipsis }}>{formatValue(field, v, row, lookups)}</Box>;
    default: {
      const text = formatValue(field, v, row, lookups);
      return <Box dir="auto" sx={wrap ? { whiteSpace: "pre-wrap", wordBreak: "break-word" } : ellipsis} title={text.length > 30 ? text : undefined}>{text}</Box>;
    }
  }
};

const TAX_OPTIONS = TAXONOMY.flatMap((t) => (t.subs.length ? t.subs.map((s) => ({ category: t.label, sub: s })) : [{ category: t.label, sub: null }]));
const taxLabel = (o) => [o.category, o.sub].filter(Boolean).join(" · ");

/**
 * Editor for one value. `initial` is a first keystroke typed into a cell.
 * onCommit(value) saves; onCancel() discards. Selects and pickers commit on choice.
 */
export const CellEditor = ({ field, value, lookups, onCommit, onCancel, initial, autoFocus = true, inline = true }) => {
  const [draft, setDraft] = useState(() => {
    if (initial !== undefined) return initial;
    if (["date"].includes(field.type) && value) return String(value).slice(0, 10);
    if (["datetime"].includes(field.type) && value) return String(value).slice(0, 16);
    return value ?? "";
  });
  const ref = useRef(null);
  useEffect(() => {
    if (autoFocus && ref.current && initial !== undefined && ref.current.setSelectionRange) ref.current.setSelectionRange(String(initial).length, String(initial).length);
  }, [autoFocus, initial]);

  const keys = (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel?.(); }
    if (e.key === "Enter" && !(field.type === "longText" && e.shiftKey)) { e.preventDefault(); e.stopPropagation(); onCommit(draft); }
    if (e.key === "Tab") { e.preventDefault(); onCommit(draft, e.shiftKey ? "left" : "right"); }
  };
  const sx = inline ? { "& .MuiOutlinedInput-root": { borderRadius: 0, fontSize: 13, backgroundColor: "var(--surface)" }, "& fieldset": { borderColor: "var(--accent) !important", borderWidth: "2px !important" } } : {};

  switch (field.type) {
    case "singleSelect":
      return (
        <TextField select fullWidth size="small" value={draft || ""} autoFocus={autoFocus} sx={sx}
          SelectProps={{ defaultOpen: inline, onClose: () => inline && onCancel?.() }}
          onChange={(e) => onCommit(e.target.value || null)}>
          <MenuItem value=""><em>None</em></MenuItem>
          {(field.options?.choices || []).map((c) => (
            <MenuItem key={c.value} value={c.value}><Badge color={choiceColor(field, c.value)}>{c.value}</Badge></MenuItem>
          ))}
        </TextField>
      );
    case "multiSelect":
      return (
        <Autocomplete multiple size="small" openOnFocus autoHighlight disableCloseOnSelect options={(field.options?.choices || []).map((c) => c.value)} value={Array.isArray(draft) ? draft : []}
          onChange={(_e, v) => (inline ? setDraft(v) : onCommit(v))} onClose={() => inline && onCommit(draft)}
          renderInput={(p) => <TextField {...p} autoFocus={autoFocus} sx={sx} onKeyDown={(e) => e.key === "Escape" && onCancel?.()} />}
          renderTags={(vals) => vals.map((x) => <Badge key={x} color={choiceColor(field, x)} sx={{ mr: 0.5 }}>{x}</Badge>)} />
      );
    case "checkbox":
      return <Checkbox checked={Boolean(draft)} autoFocus={autoFocus} onChange={(e) => onCommit(e.target.checked)} />;
    case "user":
      return (
        <Autocomplete multiple={Boolean(field.options?.multiple)} size="small" openOnFocus options={lookups.userList || []} getOptionLabel={(u) => u?.name || ""}
          isOptionEqualToValue={(a, b) => a._id === b._id}
          value={field.options?.multiple ? (draft || []).map((id) => lookups.users[id]).filter(Boolean) : lookups.users[(draft || [])[0]] || null}
          onChange={(_e, v) => onCommit(v ? (Array.isArray(v) ? v.map((u) => u._id) : [v._id]) : [])}
          renderInput={(p) => <TextField {...p} autoFocus={autoFocus} sx={sx} placeholder="Choose people" onKeyDown={(e) => e.key === "Escape" && onCancel?.()} />} />
      );
    case "fieldTeam":
      return (
        <Autocomplete size="small" openOnFocus options={(lookups.teamList || []).filter((t) => !t.isTerminated)} getOptionLabel={(t) => t?.teamName || ""}
          isOptionEqualToValue={(a, b) => a._id === b._id} value={lookups.teams[draft] || null}
          onChange={(_e, v) => onCommit(v?._id || null)}
          renderInput={(p) => <TextField {...p} autoFocus={autoFocus} sx={sx} placeholder="Choose a team" onKeyDown={(e) => e.key === "Escape" && onCancel?.()} />} />
      );
    case "taxonomy":
      return (
        <Autocomplete size="small" openOnFocus options={TAX_OPTIONS} getOptionLabel={taxLabel} isOptionEqualToValue={(a, b) => taxLabel(a) === taxLabel(b)}
          value={draft && typeof draft === "object" ? draft : null} onChange={(_e, v) => onCommit(v || null)}
          renderInput={(p) => <TextField {...p} autoFocus={autoFocus} sx={sx} onKeyDown={(e) => e.key === "Escape" && onCancel?.()} />} />
      );
    case "rating":
      return <Rating value={Number(draft) || 0} max={field.options?.max || 5} autoFocus={autoFocus} onChange={(_e, v) => onCommit(v)} />;
    case "date":
    case "datetime":
      return (
        <TextField fullWidth size="small" type={field.type === "date" ? "date" : "datetime-local"} value={draft || ""} autoFocus={autoFocus} inputRef={ref} sx={sx}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={keys} onBlur={() => inline && onCommit(draft)} />
      );
    case "longText":
      return (
        <TextField fullWidth size="small" multiline minRows={inline ? 3 : 4} value={draft ?? ""} autoFocus={autoFocus} inputRef={ref} sx={{ ...sx, ...(inline ? { position: "relative", zIndex: 3, "& .MuiOutlinedInput-root": { ...sx["& .MuiOutlinedInput-root"], boxShadow: "var(--shadow-md)" } } : {}) }}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={keys} onBlur={() => inline && onCommit(draft)} helperText={inline ? "Shift+Enter for a new line" : undefined} dir="auto" />
      );
    default:
      return (
        <TextField fullWidth size="small" value={draft ?? ""} autoFocus={autoFocus} inputRef={ref} sx={sx} dir="auto"
          type={field.type === "number" ? "text" : field.type === "email" ? "email" : "text"} inputMode={field.type === "number" ? "decimal" : field.type === "phone" ? "tel" : undefined}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={keys} onBlur={() => inline && onCommit(draft)} />
      );
  }
};
