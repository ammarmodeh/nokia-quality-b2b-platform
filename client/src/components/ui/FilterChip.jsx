import { useMemo, useState } from "react";
import { Box, Checkbox, InputBase, Popover, Typography } from "@mui/material";
import AddCircleOutline from "@mui/icons-material/AddCircleOutline";
import Close from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";

/**
 * Clerk-style filter chip: "(+) Label" when empty, "Label: a, b" when set.
 * options: [{ value, label, hint?, icon? }]; value: array of selected values.
 */
const FilterChip = ({ label, options, value = [], onChange, searchable = options?.length > 8, single = false }) => {
  const [anchor, setAnchor] = useState(null);
  const [q, setQ] = useState("");
  const active = value.length > 0;
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => String(o.label).toLowerCase().includes(s)) : options;
  }, [options, q]);

  const summary = active
    ? value.length <= 2
      ? value.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ")
      : `${value.length} selected`
    : null;

  const toggle = (v) => {
    if (single) {
      onChange(value[0] === v ? [] : [v]);
      setAnchor(null);
      return;
    }
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="dialog"
        sx={{
          display: "inline-flex", alignItems: "center", gap: 0.5, height: 28, pl: 1, pr: active ? 0.5 : 1.25,
          borderRadius: "14px", font: "inherit", fontSize: 12.5, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
          border: active ? "1px solid var(--border-strong)" : "1px dashed var(--border-strong)",
          backgroundColor: active ? "var(--surface)" : "transparent",
          color: active ? "var(--text)" : "var(--text-secondary)",
          "&:hover": { backgroundColor: "var(--surface-hover)", color: "var(--text)" },
          "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 1 },
        }}
      >
        {!active && <AddCircleOutline sx={{ fontSize: 15 }} />}
        <span>{label}</span>
        {active && (
          <>
            <Box component="span" sx={{ width: "1px", height: 14, backgroundColor: "var(--border)", mx: 0.5 }} />
            <Box component="span" sx={{ color: "var(--accent-text)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{summary}</Box>
            <Box
              component="span"
              role="button"
              aria-label={`Clear ${label} filter`}
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  onChange([]);
                }
              }}
              sx={{ display: "grid", placeItems: "center", width: 20, height: 20, borderRadius: "10px", color: "var(--text-muted)", "&:hover": { backgroundColor: "var(--surface-active)", color: "var(--text)" } }}
            >
              <Close sx={{ fontSize: 13 }} />
            </Box>
          </>
        )}
      </Box>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => {
          setAnchor(null);
          setQ("");
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { mt: 0.75, width: 260, overflow: "hidden" } } }}
      >
        <Typography sx={{ px: 1.5, pt: 1.25, pb: 0.75, fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Filter by {label.toLowerCase()}</Typography>
        {searchable && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mx: 1, mb: 0.75, px: 1, height: 30, borderRadius: "6px", border: "1px solid var(--border)" }}>
            <SearchIcon sx={{ fontSize: 16, color: "var(--text-muted)" }} />
            <InputBase autoFocus placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ fontSize: 13, flex: 1 }} />
          </Box>
        )}
        <Box sx={{ maxHeight: 300, overflowY: "auto", px: 0.5, pb: 0.5 }}>
          {shown.map((o) => {
            const on = value.includes(o.value);
            return (
              <Box
                key={String(o.value)}
                component="button"
                type="button"
                onClick={() => toggle(o.value)}
                sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", border: 0, background: "none", font: "inherit", textAlign: "left", cursor: "pointer", px: 1, height: 32, borderRadius: "5px", fontSize: 13, color: "var(--text)", "&:hover": { backgroundColor: "var(--surface-hover)" } }}
              >
                {!single && <Checkbox size="small" checked={on} tabIndex={-1} disableRipple sx={{ p: 0, "& .MuiSvgIcon-root": { fontSize: 18 }, color: "var(--border-strong)", "&.Mui-checked": { color: "var(--accent)" } }} />}
                {o.icon}
                <Box component="span" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: single && on ? 600 : 400 }}>{o.label}</Box>
                {o.hint != null && <Box component="span" sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>{o.hint}</Box>}
              </Box>
            );
          })}
          {!shown.length && <Typography sx={{ px: 1.5, py: 2, fontSize: 12.5, color: "var(--text-muted)", textAlign: "center" }}>No matches</Typography>}
        </Box>
      </Popover>
    </>
  );
};

export default FilterChip;
