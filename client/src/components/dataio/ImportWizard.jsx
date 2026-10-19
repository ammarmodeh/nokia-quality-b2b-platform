import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, MenuItem, Tab, Tabs, TextField, Tooltip, Typography } from "@mui/material";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import Close from "@mui/icons-material/Close";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import api from "../../api/api";
import Badge from "../ui/Badge";
import ErrorState from "../ui/ErrorState";
import { StepRail } from "../ui/Stepper";
import { ENTITIES } from "./entities";
import { autoMap, buildRecords, detectHeaderRow, downloadWorkbook, headerScore, norm, readWorkbook, toApiRow } from "./parse";

const STEPS = ["Upload", "Sheets", "Map columns", "Validate", "Import", "Result"];
const CHUNK = 200;
const SAVED_KEY = (entity) => `qops.importMapping.${entity}`;
const loadSaved = (entity) => {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY(entity)) || "{}");
  } catch {
    return {};
  }
};
const storeSaved = (entity, headers, mapping) => {
  try {
    const cur = loadSaved(entity);
    headers.forEach((h, i) => {
      if (norm(h)) cur[norm(h)] = mapping[i] || "";
    });
    localStorage.setItem(SAVED_KEY(entity), JSON.stringify(cur));
  } catch {
    /* storage unavailable */
  }
};

const fmtSize = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

const sheetWarnings = (sheet, headerIdx) => {
  const w = [];
  const header = sheet.rows[headerIdx] || [];
  const names = header.map(norm).filter(Boolean);
  if (new Set(names).size !== names.length) w.push("Duplicate column headers");
  if (sheet.merges) w.push(`${sheet.merges} merged cell range(s)`);
  const body = sheet.rows.slice(headerIdx + 1);
  const emptyCols = header.filter((h, i) => h !== "" && body.every((r) => r[i] === "" || r[i] === undefined)).length;
  if (emptyCols) w.push(`${emptyCols} empty column(s)`);
  if (body.length < 1) w.push("No data rows under the header");
  return w;
};

/**
 * Multi-sheet import wizard.
 * entity: default target; allowed: entities this page may import into.
 */
const ImportWizard = ({ open, onClose, entity: defaultEntity, allowed = [defaultEntity], onImported, context = {} }) => {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [sheets, setSheets] = useState([]); // { name, rows, merges, include, target, headerIdx, mapping, defaults, save }
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState("create");
  const [key, setKey] = useState("");
  const [validation, setValidation] = useState(null); // { [sheetIdx]: { records, problems, server } }
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setStep(0); setFile(null); setSheets([]); setActive(0); setMode("create"); setKey(""); setValidation(null); setResult(null); setError(null); setProgress(0);
    }
  }, [open]);

  const included = sheets.map((s, i) => ({ ...s, idx: i })).filter((s) => s.include && s.target);
  const targets = [...new Set(included.map((s) => s.target))];
  const keyOptions = targets.length === 1 ? ENTITIES[targets[0]].keys : [];
  const effectiveKey = key || keyOptions[0]?.value || "";

  const onFile = async (f) => {
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      setError("Choose an .xlsx, .xls or .csv file.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const raw = await readWorkbook(f);
      const saved = Object.fromEntries(allowed.map((e) => [e, loadSaved(e)]));
      const prepared = raw.map((sh) => {
        // pick the allowed entity whose fields match this sheet best
        let best = defaultEntity, bestHits = -1, bestIdx = 0;
        for (const e of allowed) {
          const idx = detectHeaderRow(sh.rows, ENTITIES[e].fields);
          const hits = (sh.rows[idx] || []).filter((h) => ENTITIES[e].fields.some((fd) => headerScore(h, fd) >= 0.8)).length;
          if (hits > bestHits) [best, bestHits, bestIdx] = [e, hits, idx];
        }
        const header = sh.rows[bestIdx] || [];
        const dataRows = sh.rows.length - bestIdx - 1;
        return {
          ...sh,
          include: dataRows > 0 && bestHits >= 1,
          target: best,
          headerIdx: bestIdx,
          mapping: autoMap(header, ENTITIES[best].fields, saved[best]),
          defaults: {},
          save: true,
        };
      });
      if (!prepared.some((s) => s.include) && prepared.length) prepared[0].include = true;
      setFile(f);
      setSheets(prepared);
      setStep(1);
    } catch (e) {
      setError(`Couldn't read the file: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const updateSheet = (i, patch) =>
    setSheets((list) =>
      list.map((s, j) => {
        if (j !== i) return s;
        const next = { ...s, ...patch };
        if (patch.target !== undefined || patch.headerIdx !== undefined) {
          next.mapping = autoMap(next.rows[next.headerIdx] || [], ENTITIES[next.target].fields, loadSaved(next.target));
          next.defaults = {};
        }
        return next;
      })
    );

  // ---- validation (client conversion + server dry run)
  const runChunks = useCallback(
    async (records, target, dryRun, onChunk) => {
      const results = [];
      for (let i = 0; i < records.length; i += CHUNK) {
        const body = records.slice(i, i + CHUNK).map((r) => toApiRow(target, r, context));
        const { data } = await api.post(`/import/${target}`, { rows: body, mode, key: effectiveKey || undefined, dryRun });
        results.push(...data.results);
        onChunk?.(Math.min(records.length, i + CHUNK));
      }
      return results;
    },
    [mode, effectiveKey, context]
  );

  const validate = async () => {
    setBusy(true);
    setError(null);
    try {
      const out = {};
      for (const s of included) {
        const { records, problems } = buildRecords(s.rows, s.headerIdx, s.mapping, ENTITIES[s.target].fields, s.defaults);
        const badRows = new Set(problems.map((p) => p.row));
        const clean = records.filter((r) => !badRows.has(r.__row));
        const server = clean.length ? await runChunks(clean, s.target, true) : [];
        out[s.idx] = { records, problems, server };
      }
      setValidation(out);
      setStep(3);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  // re-validate when mode / key change on the validate step
  const lastRun = useRef("");
  useEffect(() => {
    const sig = `${mode}|${key}`;
    if (step === 3 && validation && lastRun.current && lastRun.current !== sig) validate();
    lastRun.current = sig;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, key]);

  const summary = useMemo(() => {
    if (!validation) return null;
    const c = { created: 0, updated: 0, skipped: 0, invalid: 0 };
    Object.values(validation).forEach((v) => {
      c.invalid += new Set(v.problems.map((p) => p.row)).size;
      v.server.forEach((r) => {
        if (r.status === "error") c.invalid++;
        else c[r.action === "update" ? "updated" : r.action === "skip" ? "skipped" : "created"]++;
      });
    });
    return c;
  }, [validation]);

  const runImport = async () => {
    setStep(4);
    setBusy(true);
    setError(null);
    setProgress(0);
    const total = Object.values(validation).reduce((n, v) => n + v.server.filter((r) => r.status !== "error").length, 0) || 1;
    let done = 0;
    const out = {};
    try {
      for (const s of included) {
        const v = validation[s.idx];
        const okRows = new Set(v.server.filter((r) => r.status !== "error").map((r) => r.row));
        const toSend = v.records.filter((r) => okRows.has(r.__row));
        let sent = 0;
        const res = toSend.length
          ? await runChunks(toSend, s.target, false, (n) => {
              done += n - sent;
              sent = n;
              setProgress(Math.round((done / total) * 100));
            })
          : [];
        out[s.idx] = { ...v, final: res };
        if (s.save) storeSaved(s.target, s.rows[s.headerIdx] || [], s.mapping);
      }
      setResult(out);
      setStep(5);
      onImported?.();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
      setResult(out);
      setStep(5);
    } finally {
      setBusy(false);
    }
  };

  const downloadErrors = () => {
    const sheetsOut = included.map((s) => {
      const v = (result || validation)[s.idx] || {};
      const header = (s.rows[s.headerIdx] || []).map((h, i) => h || `Column ${i + 1}`);
      const msgs = new Map();
      (v.problems || []).forEach((p) => msgs.set(p.row, [...(msgs.get(p.row) || []), `${p.field}: ${p.message}`]));
      [...(v.final || v.server || [])].filter((r) => r.status === "error").forEach((r) => msgs.set(r.row, [...(msgs.get(r.row) || []), r.message]));
      const rows = [...msgs.entries()].sort((a, b) => a[0] - b[0]).map(([rowNo, m]) => [rowNo, m.join(" | "), ...(s.rows[rowNo - 1] || [])]);
      return { name: s.name, header: ["Row", "Error", ...header], rows };
    });
    downloadWorkbook(sheetsOut, "import-errors");
  };

  // ------------------------------------------------------------ render
  const cur = sheets[active];
  const curFields = cur ? ENTITIES[cur.target].fields : [];
  const mappedKeys = new Set(cur?.mapping.filter(Boolean));
  const missingRequired = curFields.filter((f) => f.required && !mappedKeys.has(f.key));
  const allMappedOk = included.every((s) => ENTITIES[s.target].fields.filter((f) => f.required).every((f) => s.mapping.includes(f.key) || s.defaults[f.key]));

  const sheetTabs = (
    <Tabs value={Math.max(0, included.findIndex((s) => s.idx === active))} onChange={(_e, i) => setActive(included[i].idx)} variant="scrollable" sx={{ mb: 2 }}>
      {included.map((s) => <Tab key={s.idx} label={`${s.name} → ${ENTITIES[s.target].short}`} />)}
    </Tabs>
  );

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="lg" slotProps={{ paper: { sx: { height: "min(88vh, 900px)" } } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          Import data
          <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 400 }}>
            Excel or CSV · multiple sheets · nothing is written until the final step
          </Typography>
        </Box>
        <IconButton aria-label="Close" onClick={onClose} disabled={busy} size="small"><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <StepRail steps={STEPS.map((l, i) => ({ label: l, done: i < step }))} active={step} onChange={(i) => i < step && step < 4 && setStep(i)} ariaLabel="Import steps" />
        {error && <ErrorState title="Something went wrong" message={error} sx={{ mb: 2 }} />}
        {busy && step !== 4 && <LinearProgress sx={{ mb: 2 }} />}

        {step === 0 && (
          <Box
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]); }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            sx={{ flex: 1, minHeight: 260, display: "grid", placeItems: "center", textAlign: "center", borderRadius: "12px", cursor: "pointer", border: `2px dashed ${drag ? "var(--accent)" : "var(--border-strong)"}`, backgroundColor: drag ? "var(--accent-subtle)" : "var(--surface-subtle)" }}
          >
            <Box>
              <UploadFileOutlined sx={{ fontSize: 40, color: "var(--text-muted)" }} />
              <Typography sx={{ fontSize: 15, fontWeight: 600, mt: 1 }}>Drop a file here or click to browse</Typography>
              <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mt: 0.5 }}>.xlsx, .xls or .csv · into {allowed.map((e) => ENTITIES[e].short).join(", ")}</Typography>
            </Box>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </Box>
        )}

        {step === 1 && (
          <Box>
            <Typography sx={{ fontSize: 13, color: "var(--text-secondary)", mb: 1.5 }}>
              <strong style={{ color: "var(--text)" }}>{file?.name}</strong> · {fmtSize(file?.size || 0)} · {sheets.length} sheet{sheets.length === 1 ? "" : "s"}. Choose which sheets to import and where.
            </Typography>
            <Box sx={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
              {sheets.map((s, i) => {
                const warns = sheetWarnings(s, s.headerIdx);
                return (
                  <Box key={s.name} sx={{ display: "grid", gridTemplateColumns: "36px minmax(0,1.4fr) 220px 120px minmax(0,1.6fr)", alignItems: "center", gap: 1.5, px: 1.5, py: 1, borderBottom: "1px solid var(--border)", "&:last-of-type": { borderBottom: 0 } }}>
                    <Checkbox checked={s.include} onChange={(e) => updateSheet(i, { include: e.target.checked })} inputProps={{ "aria-label": `Import sheet ${s.name}` }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: 13, fontWeight: 500 }}>{s.name}</Typography>
                      <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)" }}>{Math.max(0, s.rows.length - s.headerIdx - 1)} data rows · {(s.rows[s.headerIdx] || []).filter(Boolean).length} columns</Typography>
                    </Box>
                    <TextField select value={s.target} onChange={(e) => updateSheet(i, { target: e.target.value })} disabled={!s.include} slotProps={{ htmlInput: { "aria-label": "Import into" } }}>
                      {allowed.map((e) => <MenuItem key={e} value={e}>{ENTITIES[e].label}</MenuItem>)}
                    </TextField>
                    <TextField type="number" label="Header row" value={s.headerIdx + 1} disabled={!s.include} onChange={(e) => updateSheet(i, { headerIdx: Math.max(0, Math.min(s.rows.length - 1, Number(e.target.value) - 1)) })} slotProps={{ inputLabel: { shrink: true } }} />
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      {warns.map((w) => <Badge key={w} tone="warning" sx={{ height: 20, fontSize: 11 }}>{w}</Badge>)}
                      {!warns.length && <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>Looks clean</Typography>}
                    </Box>
                  </Box>
                );
              })}
            </Box>
            {cur && (
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mb: 0.75 }}>Preview of “{cur.name}” (header row highlighted)</Typography>
                <Box sx={{ overflow: "auto", maxHeight: 240, border: "1px solid var(--border)", borderRadius: "8px" }}>
                  <Box component="table" sx={{ borderCollapse: "collapse", fontSize: 12, "& td": { border: "1px solid var(--border)", px: 1, py: 0.5, whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" } }}>
                    <tbody>
                      {cur.rows.slice(0, 12).map((r, ri) => (
                        <tr key={ri} style={{ background: ri === cur.headerIdx ? "var(--accent-subtle)" : undefined, fontWeight: ri === cur.headerIdx ? 600 : 400 }}>
                          <td style={{ color: "var(--text-muted)" }}>{ri + 1}</td>
                          {r.slice(0, 20).map((c, ci) => <td key={ci} dir="auto">{String(c)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 0.75, mt: 1, flexWrap: "wrap" }}>
                  {sheets.map((s, i) => <Button key={s.name} size="small" variant={i === active ? "contained" : "outlined"} onClick={() => setActive(i)}>{s.name}</Button>)}
                </Box>
              </Box>
            )}
          </Box>
        )}

        {step === 2 && cur && (
          <Box sx={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
            {sheetTabs}
            {missingRequired.length > 0 && (
              <Box sx={{ mb: 1.5, p: 1.5, borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--warning-subtle)" }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 1, display: "flex", alignItems: "center", gap: 0.75 }}><WarningAmberOutlined sx={{ fontSize: 16, color: "var(--warning)" }} />Required fields not mapped — map a column or set a default for every row</Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {missingRequired.map((f) => (
                    <TextField key={f.key} label={`Default ${f.label}`} value={cur.defaults[f.key] || ""} onChange={(e) => updateSheet(active, { defaults: { ...cur.defaults, [f.key]: e.target.value } })} sx={{ width: 220 }} select={f.type === "enum"}>
                      {f.type === "enum" && f.options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </TextField>
                  ))}
                </Box>
              </Box>
            )}
            <Box sx={{ overflow: "auto", flex: 1, border: "1px solid var(--border)", borderRadius: "10px" }}>
              {(cur.rows[cur.headerIdx] || []).map((h, col) => {
                if (h === "" && cur.rows.slice(cur.headerIdx + 1, cur.headerIdx + 6).every((r) => r[col] === "")) return null;
                const samples = cur.rows.slice(cur.headerIdx + 1).map((r) => r[col]).filter((v) => v !== "").slice(0, 3);
                const field = curFields.find((f) => f.key === cur.mapping[col]);
                const score = field ? headerScore(h, field) : 0;
                return (
                  <Box key={col} sx={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1.4fr) 260px 70px", gap: 1.5, alignItems: "center", px: 1.5, py: 0.75, borderBottom: "1px solid var(--border)" }}>
                    <Typography dir="auto" noWrap title={String(h)} sx={{ fontSize: 13, fontWeight: 500 }}>{String(h) || <em style={{ color: "var(--text-muted)" }}>Column {col + 1}</em>}</Typography>
                    <Typography dir="auto" noWrap sx={{ fontSize: 12, color: "var(--text-muted)" }}>{samples.map(String).join(" · ") || "—"}</Typography>
                    <TextField select value={cur.mapping[col] || ""} onChange={(e) => updateSheet(active, { mapping: cur.mapping.map((m, j) => (j === col ? e.target.value || null : m === e.target.value ? null : m)) })} slotProps={{ htmlInput: { "aria-label": `Map ${h}` } }}>
                      <MenuItem value=""><em>Ignore this column</em></MenuItem>
                      {curFields.map((f) => <MenuItem key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</MenuItem>)}
                    </TextField>
                    <Box>{field && (score >= 0.95 ? <Badge tone="success" sx={{ height: 20, fontSize: 11 }}>exact</Badge> : <Tooltip title="Matched by similarity — check it"><span><Badge tone="warning" sx={{ height: 20, fontSize: 11 }}>{Math.round(score * 100)}%</Badge></span></Tooltip>)}</Box>
                  </Box>
                );
              })}
            </Box>
            <Box component="label" sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1, fontSize: 12.5, color: "var(--text-secondary)" }}>
              <Checkbox size="small" checked={cur.save} onChange={(e) => updateSheet(active, { save: e.target.checked })} />Remember this mapping for next time
            </Box>
          </Box>
        )}

        {step === 3 && validation && summary && (
          <Box sx={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap", mb: 2 }}>
              <TextField select label="Import mode" value={mode} onChange={(e) => setMode(e.target.value)} sx={{ width: 230 }}>
                <MenuItem value="create">Create only</MenuItem>
                <MenuItem value="upsert" disabled={!keyOptions.length}>Update existing (upsert)</MenuItem>
                <MenuItem value="skip" disabled={!keyOptions.length}>Skip duplicates</MenuItem>
              </TextField>
              <TextField select label="Match on" value={effectiveKey} onChange={(e) => setKey(e.target.value)} sx={{ width: 220 }} disabled={!keyOptions.length}>
                {keyOptions.map((k) => <MenuItem key={k.value} value={k.value}>{k.label}</MenuItem>)}
              </TextField>
              <Box sx={{ flex: 1 }} />
              <Badge tone="success">{summary.created} new</Badge>
              <Badge tone="info">{summary.updated} update</Badge>
              <Badge>{summary.skipped} skip</Badge>
              <Badge tone={summary.invalid ? "danger" : "neutral"}>{summary.invalid} invalid</Badge>
            </Box>
            {sheetTabs}
            {(() => {
              const v = validation[active] || validation[included[0]?.idx];
              if (!v) return null;
              const byRow = new Map(v.server.map((r) => [r.row, r]));
              const probs = new Map();
              v.problems.forEach((p) => probs.set(p.row, [...(probs.get(p.row) || []), `${p.field}: ${p.message}`]));
              const shown = v.records.slice(0, 200);
              const cols = (sheets[active] || included[0]).mapping.filter(Boolean).slice(0, 6);
              const fields = Object.fromEntries(curFields.map((f) => [f.key, f]));
              return (
                <Box sx={{ overflow: "auto", flex: 1, border: "1px solid var(--border)", borderRadius: "10px" }}>
                  <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, "& th, & td": { borderBottom: "1px solid var(--border)", px: 1.25, py: 0.75, textAlign: "left", whiteSpace: "nowrap", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }, "& th": { position: "sticky", top: 0, background: "var(--surface-subtle)", color: "var(--text-secondary)", fontWeight: 500 } }}>
                    <thead><tr><th>Row</th><th>Result</th>{cols.map((c) => <th key={c}>{fields[c]?.label}</th>)}<th>Message</th></tr></thead>
                    <tbody>
                      {shown.map((rec) => {
                        const p = probs.get(rec.__row);
                        const s = byRow.get(rec.__row);
                        const bad = p || s?.status === "error";
                        return (
                          <tr key={rec.__row} style={{ background: bad ? "var(--danger-subtle)" : undefined }}>
                            <td>{rec.__row}</td>
                            <td>{bad ? <Badge tone="danger">invalid</Badge> : <Badge tone={s?.action === "update" ? "info" : s?.action === "skip" ? "neutral" : "success"}>{s?.action || "new"}</Badge>}</td>
                            {cols.map((c) => <td key={c} dir="auto">{typeof rec[c] === "object" && rec[c] !== null ? (Array.isArray(rec[c]) ? rec[c].join(", ") : [rec[c].category, rec[c].sub].filter(Boolean).join(" · ")) : String(rec[c] ?? "")}</td>)}
                            <td style={{ color: bad ? "var(--danger)" : "var(--text-muted)", whiteSpace: "normal", minWidth: 220 }}>{p ? p.join(" | ") : s?.message}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Box>
                  {v.records.length > shown.length && <Typography sx={{ p: 1.5, fontSize: 12, color: "var(--text-muted)" }}>Showing first {shown.length} of {v.records.length} rows.</Typography>}
                </Box>
              );
            })()}
          </Box>
        )}

        {step === 4 && (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ fontSize: 15, fontWeight: 600, mb: 2 }}>Importing… {progress}%</Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4, maxWidth: 480, mx: "auto" }} />
            <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)", mt: 1.5 }}>Rows are sent in batches of {CHUNK}. Keep this window open.</Typography>
          </Box>
        )}

        {step === 5 && result && (
          <Box sx={{ py: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <CheckCircleOutline sx={{ color: "var(--success)" }} />
              <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Import finished</Typography>
            </Box>
            {included.map((s) => {
              const r = result[s.idx];
              if (!r) return <Typography key={s.idx} sx={{ fontSize: 13, color: "var(--danger)" }}>{s.name}: not imported</Typography>;
              const f = r.final || [];
              const c = { created: f.filter((x) => x.status === "ok" && x.action === "create").length, updated: f.filter((x) => x.status === "ok" && x.action === "update").length, skipped: f.filter((x) => x.action === "skip").length, failed: f.filter((x) => x.status === "error").length + new Set(r.problems.map((p) => p.row)).size + r.server.filter((x) => x.status === "error").length };
              return (
                <Box key={s.idx} sx={{ display: "flex", gap: 1, alignItems: "center", py: 1, borderBottom: "1px solid var(--border)" }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{s.name} → {ENTITIES[s.target].label}</Typography>
                  <Badge tone="success">{c.created} created</Badge>
                  <Badge tone="info">{c.updated} updated</Badge>
                  <Badge>{c.skipped} skipped</Badge>
                  <Badge tone={c.failed ? "danger" : "neutral"}>{c.failed} failed</Badge>
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {(step === 3 || step === 5) && (summary?.invalid > 0 || result) && <Button variant="text" onClick={downloadErrors}>Download error report</Button>}
        <Box sx={{ flex: 1 }} />
        {step === 1 && <Button variant="outlined" onClick={() => setStep(0)}>Choose another file</Button>}
        {step === 1 && <Button variant="contained" disabled={!included.length} onClick={() => { setActive(included[0].idx); setStep(2); }}>Map columns</Button>}
        {step === 2 && <Button variant="outlined" onClick={() => setStep(1)}>Back</Button>}
        {step === 2 && <Button variant="contained" disabled={!allMappedOk || busy} onClick={validate}>Validate (dry run)</Button>}
        {step === 3 && <Button variant="outlined" onClick={() => setStep(2)}>Back to mapping</Button>}
        {step === 3 && (
          <Button variant="contained" disabled={busy || !summary || summary.created + summary.updated === 0} onClick={runImport}>
            Import {summary ? summary.created + summary.updated : 0} row{summary && summary.created + summary.updated === 1 ? "" : "s"}
          </Button>
        )}
        {step === 5 && <Button variant="contained" onClick={onClose}>Done</Button>}
      </DialogActions>
    </Dialog>
  );
};

export default ImportWizard;
