import { useEffect, useMemo, useState } from "react";
import { Box, Button, Checkbox, InputBase, Switch, Tooltip, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { toast } from "sonner";
import api from "../../api/api";
import AppDialog from "../ui/AppDialog";
import Badge from "../ui/Badge";
import SkeletonRows from "../ui/SkeletonRows";

const PARENT_LABEL = { RESPONSIBILITY: "owner", REASON: "reason", REASON_SUB: "sub-reason" };
const MIN_USES = 2; // pre-select missing values used at least this often

/**
 * Shows the values tasks actually use for an RCA list, most used first, and adds the chosen ones
 * to the list (each linked to the parent it's most often paired with). Nothing changes until "Add".
 */
const RcaUsageDialog = ({ open, category, listLabel, onClose, onAdded }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [q, setQ] = useState("");
  const [showExisting, setShowExisting] = useState(false);
  const [linkParent, setLinkParent] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setData(null);
    setError(null);
    setQ("");
    api
      .get(`/dropdown-options/usage/${category}`)
      .then(({ data: d }) => {
        setData(d);
        setSelected(new Set(d.items.filter((i) => !i.exists && i.count >= MIN_USES).map((i) => i.value)));
      })
      .catch((e) => setError(e?.response?.data?.message || "Couldn't read task usage"));
  }, [open, category]);

  const missing = useMemo(() => (data?.items || []).filter((i) => !i.exists), [data]);
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (data?.items || []).filter((i) => (showExisting || !i.exists) && (!n || i.value.toLowerCase().includes(n) || (i.parentValue || "").toLowerCase().includes(n)));
  }, [data, q, showExisting]);
  const toggle = (v) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    return n;
  });
  const parentWord = PARENT_LABEL[data?.parentCategory] || null;

  const add = async () => {
    const items = missing.filter((i) => selected.has(i.value)).map((i) => ({ value: i.value, label: i.value, parentValue: linkParent ? i.parentValue : null }));
    if (!items.length) return;
    setSaving(true);
    try {
      const { data: r } = await api.post("/dropdown-options/bulk-add", { category, items });
      toast.success(`Added ${r.added} value${r.added === 1 ? "" : "s"} to ${listLabel}`);
      onAdded?.();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Couldn't add the values");
    } finally {
      setSaving(false);
    }
  };

  const count = missing.filter((i) => selected.has(i.value)).length;
  return (
    <AppDialog
      open={open}
      onClose={onClose}
      size="lg"
      title={`Add ${listLabel} from task usage`}
      description={data ? `${data.items.length} distinct values found on ${data.tasksScanned.toLocaleString()} tasks · ${missing.length} not in the list yet · most used first` : "Reading the values used on DVOC tasks…"}
      error={error}
      primary={{ label: count ? `Add ${count} to the list` : "Add to the list", onClick: add, loading: saving, disabled: !count }}
      extraActions={
        data && (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Button size="small" variant="text" onClick={() => setSelected(new Set(missing.map((i) => i.value)))}>Select all missing</Button>
            <Button size="small" variant="text" onClick={() => setSelected(new Set())}>Clear</Button>
          </Box>
        )
      }
    >
      {!data && !error ? (
        <SkeletonRows rows={8} />
      ) : data && (
        <>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap", mb: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, height: 30, px: 1, border: "1px solid var(--border)", borderRadius: "6px", flex: 1, minWidth: 180 }}>
              <SearchIcon sx={{ fontSize: 16, color: "var(--text-muted)" }} />
              <InputBase value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search values" sx={{ fontSize: 13, flex: 1 }} inputProps={{ "aria-label": "Search values", dir: "auto" }} />
            </Box>
            <Box component="label" sx={{ display: "flex", alignItems: "center", fontSize: 12.5, color: "var(--text-secondary)", cursor: "pointer" }}>
              <Switch size="small" checked={showExisting} onChange={(e) => setShowExisting(e.target.checked)} />
              Show values already in the list
            </Box>
            {parentWord && (
              <Box component="label" sx={{ display: "flex", alignItems: "center", fontSize: 12.5, color: "var(--text-secondary)", cursor: "pointer" }}>
                <Switch size="small" checked={linkParent} onChange={(e) => setLinkParent(e.target.checked)} />
                Link each to its usual {parentWord}
              </Box>
            )}
          </Box>
          <Typography sx={{ fontSize: 12, color: "var(--text-muted)", mb: 1 }}>
            Values used {MIN_USES}+ times are pre-selected. Spellings that differ only in case or spacing are merged under the most common one.
          </Typography>
          {rows.length ? (
            <Box sx={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
              <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 13, "& th, & td": { px: 1.25, py: 0.75, borderBottom: "1px solid var(--border)", textAlign: "left" }, "& th": { fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", backgroundColor: "var(--surface-subtle)" }, "& tbody tr:last-of-type td": { borderBottom: 0 } }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }} />
                    <th>Value</th>
                    <th style={{ textAlign: "right", width: 90 }}>Times used</th>
                    {parentWord && <th>Usual {parentWord}</th>}
                    <th style={{ width: 120 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((i) => (
                    <Box component="tr" key={i.value} onClick={() => !i.exists && toggle(i.value)} sx={{ cursor: i.exists ? "default" : "pointer", "&:hover": { backgroundColor: i.exists ? undefined : "var(--surface-hover)" } }}>
                      <td><Checkbox size="small" disabled={i.exists} checked={i.exists || selected.has(i.value)} inputProps={{ "aria-label": `Add ${i.value}` }} sx={{ p: 0 }} /></td>
                      <td dir="auto">
                        {i.value}
                        {i.variants.length > 0 && (
                          <Tooltip title={`Also written as: ${i.variants.filter((v) => v !== i.value).join(" · ")}`}>
                            <Typography component="span" sx={{ fontSize: 11.5, color: "var(--text-muted)", ml: 0.75 }}>+{i.variants.length - 1} spelling{i.variants.length > 2 ? "s" : ""}</Typography>
                          </Tooltip>
                        )}
                      </td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{i.count.toLocaleString()}</td>
                      {parentWord && <td dir="auto" style={{ color: "var(--text-secondary)" }}>{i.parentValue ? `${i.parentValue}${i.parentShare < 100 ? ` (${i.parentShare}%)` : ""}` : "—"}</td>}
                      <td>{i.exists ? <Badge>In the list</Badge> : selected.has(i.value) ? <Badge tone="accent">Will be added</Badge> : <Badge outline>Not added</Badge>}</td>
                    </Box>
                  ))}
                </tbody>
              </Box>
            </Box>
          ) : (
            <Typography sx={{ fontSize: 13, color: "var(--text-muted)", py: 3, textAlign: "center" }}>
              {data.items.length ? (missing.length ? "No values match." : "Every value used on tasks is already in the list.") : "No values are recorded on tasks for this list yet."}
            </Typography>
          )}
        </>
      )}
    </AppDialog>
  );
};

export default RcaUsageDialog;
