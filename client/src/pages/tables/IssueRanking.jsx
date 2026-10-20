import { useMemo, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import StatCard from "../../components/ui/StatCard";
import SectionCard from "../../components/ui/SectionCard";
import { downloadWorkbook } from "../../components/dataio/parse";
import { rawOf } from "./viewUtils";

// Values that mean "this check failed" in audit sheets.
const ISSUE_RX = /^(nok|n\.?o\.?k\.?|not ?ok(ay)?|fail(ed)?|ng|no ?good|x|✗|✘|غير مطابق|مرفوض|خطأ)$/i;
const CHECK_TYPES = ["singleSelect", "text"];
const norm = (v) => (v === null || v === undefined ? "" : String(v).trim());
const key = (v) => norm(v).toLowerCase();

/**
 * Audit sheets have many OK / NOK columns. Find those check columns, count the NOK
 * (or whichever values are marked as an issue) in each one for the rows on screen,
 * and rank them, overall and per field team, to show which issues hurt field
 * performance most.
 */
export const useCheckColumns = (rows, fields) =>
  useMemo(() => {
    const out = [];
    for (const f of fields) {
      if (!CHECK_TYPES.includes(f.type) || ["slid", "teamCode", "customerId"].includes(f.coreMapping)) continue;
      const values = new Map();
      for (const r of rows) {
        const v = norm(rawOf(f, r));
        if (!v) continue;
        values.set(key(v), v);
        if (values.size > 8) break;
      }
      (f.options?.choices || []).forEach((c) => values.set(key(c.value), c.value));
      if (values.size > 8 || values.size < 1) continue;
      if (![...values.keys()].some((k) => ISSUE_RX.test(k))) continue;
      out.push({ field: f, values });
    }
    return out;
  }, [rows, fields]);

const Bar = ({ value, max, color = "var(--danger)" }) => (
  <Box sx={{ height: 8, borderRadius: 4, backgroundColor: "var(--surface-active)", overflow: "hidden" }}>
    <Box sx={{ height: "100%", width: `${max ? (value / max) * 100 : 0}%`, backgroundColor: color, borderRadius: 4, transition: "width .3s ease" }} />
  </Box>
);

const IssueRanking = ({ rows, checks, lookups, onFilter, title }) => {
  // every value seen in the check columns; the ones that read like a failure count by default
  const allValues = useMemo(() => {
    const m = new Map();
    checks.forEach((c) => c.values.forEach((label, k) => !m.has(k) && m.set(k, label)));
    return [...m.entries()].sort((a, b) => Number(ISSUE_RX.test(b[0])) - Number(ISSUE_RX.test(a[0])) || a[1].localeCompare(b[1]));
  }, [checks]);
  const [picked, setPicked] = useState(null);
  const issueSet = useMemo(() => new Set(picked || allValues.filter(([k]) => ISSUE_RX.test(k)).map(([k]) => k)), [picked, allValues]);
  const issueLabel = allValues.filter(([k]) => issueSet.has(k)).map(([, l]) => l).join(" / ") || "—";

  const s = useMemo(() => {
    const cols = checks.map((c) => ({ ...c, issues: 0, checked: 0, sample: null }));
    const teams = new Map();
    let rowsWithIssue = 0;
    let issues = 0;
    for (const r of rows) {
      const id = r.fieldTeamId ? String(r.fieldTeamId) : "";
      const t = teams.get(id) || { id, label: id ? lookups.teams[id]?.teamName || "Unknown team" : "No team", rows: 0, rowsWithIssue: 0, issues: 0, byCol: {} };
      t.rows++;
      let any = false;
      for (const c of cols) {
        const v = rawOf(c.field, r);
        if (!norm(v)) continue;
        c.checked++;
        if (issueSet.has(key(v))) {
          c.issues++;
          c.sample = c.sample ?? v;
          t.issues++;
          t.byCol[c.field.key] = (t.byCol[c.field.key] || 0) + 1;
          issues++;
          any = true;
        }
      }
      if (any) { rowsWithIssue++; t.rowsWithIssue++; }
      teams.set(id, t);
    }
    const ranked = cols.filter((c) => c.issues).sort((a, b) => b.issues - a.issues);
    const teamList = [...teams.values()].filter((t) => t.rows).sort((a, b) => b.issues - a.issues || b.rows - a.rows);
    teamList.forEach((t) => { t.top = ranked.find((c) => t.byCol[c.field.key] === Math.max(0, ...ranked.map((x) => t.byCol[x.field.key] || 0)) && t.byCol[c.field.key]); });
    return { ranked, clean: cols.filter((c) => !c.issues), teamList, rowsWithIssue, issues };
  }, [rows, checks, issueSet, lookups]);

  const maxIssues = s.ranked[0]?.issues || 0;
  const matrixCols = s.ranked.slice(0, 6);
  const maxCell = Math.max(1, ...s.teamList.flatMap((t) => matrixCols.map((c) => t.byCol[c.field.key] || 0)));
  const worstTeam = s.teamList.find((t) => t.id && t.issues);

  const exportXlsx = () => downloadWorkbook([
    { name: "Issues by column", header: ["Rank", "Column", `Issues (${issueLabel})`, "Rows checked", "% of checked rows", "% of all issues"], rows: s.ranked.map((c, i) => [i + 1, c.field.label, c.issues, c.checked, c.checked ? Math.round((c.issues / c.checked) * 1000) / 10 : 0, s.issues ? Math.round((c.issues / s.issues) * 1000) / 10 : 0]) },
    { name: "Issues by team", header: ["Team", "Rows", "Rows with an issue", "Issues", "Issues per row", "Top issue", ...s.ranked.map((c) => c.field.label)], rows: s.teamList.map((t) => [t.label, t.rows, t.rowsWithIssue, t.issues, t.rows ? Math.round((t.issues / t.rows) * 100) / 100 : 0, t.top?.field.label || "", ...s.ranked.map((c) => t.byCol[c.field.key] || 0)]) },
  ], "issue-ranking");

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 1.25 }}>
        <Typography sx={{ fontSize: 13, color: "var(--text-secondary)" }}>Counts as an issue:</Typography>
        {allValues.map(([k, label]) => {
          const on = issueSet.has(k);
          return (
            <Box key={k} component="button" type="button" aria-pressed={on} onClick={() => { const n = new Set(issueSet); if (on) n.delete(k); else n.add(k); setPicked([...n]); }}
              sx={{ height: 26, px: 1.25, borderRadius: "999px", font: "inherit", fontSize: 12.5, cursor: "pointer", border: "1px solid", borderColor: on ? "var(--danger)" : "var(--border)", backgroundColor: on ? "var(--danger-subtle, rgba(220,38,38,.08))" : "var(--surface)", color: on ? "var(--danger)" : "var(--text-secondary)" }}>
              {label}
            </Box>
          );
        })}
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="outlined" startIcon={<FileDownloadOutlined sx={{ fontSize: 16 }} />} onClick={exportXlsx} disabled={!s.ranked.length}>Export ranking</Button>
      </Box>

      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, mb: 1.5 }}>
        <StatCard label="Rows with an issue" value={`${rows.length ? Math.round((s.rowsWithIssue / rows.length) * 100) : 0}%`} hint={`${s.rowsWithIssue.toLocaleString()} of ${rows.length.toLocaleString()} rows`} />
        <StatCard label={`${issueLabel} found`} value={s.issues.toLocaleString()} hint={`in ${checks.length} check column${checks.length === 1 ? "" : "s"}`} />
        <StatCard label="Top issue" value={s.ranked[0]?.field.label || "—"} hint={s.ranked[0] ? `${s.ranked[0].issues.toLocaleString()} · ${Math.round((s.ranked[0].issues / (s.issues || 1)) * 100)}% of all issues` : "no issues"} />
        <StatCard label="Team with most issues" value={worstTeam?.label || "—"} hint={worstTeam ? `${worstTeam.issues.toLocaleString()} issues in ${worstTeam.rows.toLocaleString()} rows` : undefined} />
      </Box>

      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
        <SectionCard title="Issues by column" description={title || `Which checks fail most in these ${rows.length.toLocaleString()} rows. Click one to see its rows.`}>
          {s.ranked.length ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {s.ranked.map((c, i) => (
                <Box key={c.field.key} component="button" type="button" onClick={onFilter ? () => onFilter(c.field, c.sample) : undefined} title={`Show the rows with ${norm(c.sample)} in ${c.field.label}`}
                  sx={{ display: "grid", gridTemplateColumns: "22px minmax(90px, 34%) 1fr auto", alignItems: "center", gap: 1, p: 0, border: 0, background: "none", font: "inherit", textAlign: "left", cursor: onFilter ? "pointer" : "default", "&:hover .lbl": { color: "var(--accent-text)" } }}>
                  <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{i + 1}</Typography>
                  <Typography className="lbl" dir="auto" noWrap sx={{ fontSize: 12.5 }}>{c.field.label}</Typography>
                  <Bar value={c.issues} max={maxIssues} />
                  <Typography sx={{ fontSize: 12, textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: "var(--text-secondary)" }}>
                    <b style={{ color: "var(--text)" }}>{c.issues.toLocaleString()}</b> · {c.checked ? Math.round((c.issues / c.checked) * 100) : 0}% of checked
                  </Typography>
                </Box>
              ))}
              {s.clean.length > 0 && <Typography sx={{ fontSize: 12, color: "var(--text-muted)", mt: 0.5 }}>No issues in: {s.clean.map((c) => c.field.label).join(", ")}</Typography>}
            </Box>
          ) : <Typography sx={{ fontSize: 13, color: "var(--text-muted)" }}>No {issueLabel} in these rows.</Typography>}
        </SectionCard>

        <SectionCard title="Issues by field team" description="Teams with the most issues first, and the check each one fails most.">
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, "& td, & th": { py: 0.6, px: 0.5, borderBottom: "1px solid var(--border)", textAlign: "right", whiteSpace: "nowrap" }, "& th:first-of-type, & td:first-of-type, & td.top": { textAlign: "left" }, "& th": { color: "var(--text-secondary)", fontWeight: 500 } }}>
            <thead><tr><th>Team</th><th>Rows</th><th>With issue</th><th>Issues</th><th style={{ textAlign: "left" }}>Top issue</th></tr></thead>
            <tbody>
              {s.teamList.slice(0, 15).map((t) => (
                <tr key={t.id || "none"}>
                  <td style={{ color: t.id ? undefined : "var(--text-muted)", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis" }} dir="auto">{t.label}</td>
                  <td>{t.rows.toLocaleString()}</td>
                  <td>{t.rowsWithIssue.toLocaleString()} <span style={{ color: "var(--text-muted)" }}>({t.rows ? Math.round((t.rowsWithIssue / t.rows) * 100) : 0}%)</span></td>
                  <td><b>{t.issues.toLocaleString()}</b></td>
                  <td className="top" style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }} title={t.top?.field.label}>{t.top ? `${t.top.field.label} (${t.byCol[t.top.field.key]})` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </Box>
          {s.teamList.length > 15 && <Typography sx={{ fontSize: 12, color: "var(--text-muted)", mt: 0.75 }}>{s.teamList.length - 15} more teams in the export.</Typography>}
        </SectionCard>

        {matrixCols.length > 1 && s.teamList.some((t) => t.issues) && (
          <SectionCard title="Top issues × team" description="How often each team hits the most common issues." sx={{ gridColumn: { lg: "1 / -1" } }}>
            <Box sx={{ overflowX: "auto" }}>
              <Box component="table" sx={{ borderCollapse: "collapse", fontSize: 12.5, minWidth: "100%", "& td, & th": { py: 0.6, px: 1, borderBottom: "1px solid var(--border)", textAlign: "center", whiteSpace: "nowrap" }, "& th:first-of-type, & td:first-of-type": { textAlign: "left" }, "& th": { color: "var(--text-secondary)", fontWeight: 500, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" } }}>
                <thead><tr><th>Team</th>{matrixCols.map((c) => <th key={c.field.key} title={c.field.label}>{c.field.label}</th>)}</tr></thead>
                <tbody>
                  {s.teamList.filter((t) => t.issues).slice(0, 12).map((t) => (
                    <tr key={t.id || "none"}>
                      <td dir="auto">{t.label}</td>
                      {matrixCols.map((c) => {
                        const n = t.byCol[c.field.key] || 0;
                        return <td key={c.field.key} style={{ backgroundColor: n ? `color-mix(in srgb, var(--danger) ${Math.round(8 + (n / maxCell) * 40)}%, transparent)` : undefined, fontWeight: n ? 600 : 400, color: n ? "var(--text)" : "var(--text-muted)" }}>{n || "·"}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </Box>
            </Box>
          </SectionCard>
        )}
      </Box>
    </Box>
  );
};

export default IssueRanking;
