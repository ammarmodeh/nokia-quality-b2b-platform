import { useMemo } from "react";
import { format } from "date-fns";
import { Box, Typography } from "@mui/material";
import StatCard from "../../components/ui/StatCard";
import SectionCard from "../../components/ui/SectionCard";
import EmptyState from "../../components/ui/EmptyState";
import { choiceColor, formatValue } from "./fieldTypes";
import { rawOf } from "./viewUtils";
import IssueRanking, { useCheckColumns } from "./IssueRanking";

const BREAKDOWN_TYPES = ["singleSelect", "multiSelect", "checkbox", "user", "fieldTeam", "taxonomy", "rating"];
const isEmpty = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);

const Bars = ({ items, total, onPick }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
    {items.map((it) => (
      <Box key={it.label} component={onPick && it.value !== undefined ? "button" : "div"} {...(onPick && it.value !== undefined ? { type: "button" } : {})} onClick={onPick && it.value !== undefined ? () => onPick(it.value) : undefined}
        title={onPick && it.value !== undefined ? "Filter the table by this value" : undefined}
        sx={{ display: "grid", gridTemplateColumns: "minmax(90px, 38%) 1fr 64px", alignItems: "center", gap: 1, p: 0, border: 0, background: "none", font: "inherit", textAlign: "left", cursor: onPick && it.value !== undefined ? "pointer" : "default", "&:hover .bar": { opacity: 0.85 } }}>
        <Typography dir="auto" noWrap sx={{ fontSize: 12.5, color: it.muted ? "var(--text-muted)" : "var(--text)" }}>{it.label}</Typography>
        <Box sx={{ height: 8, borderRadius: 4, backgroundColor: "var(--surface-active)", overflow: "hidden" }}>
          <Box className="bar" sx={{ height: "100%", width: `${total ? (it.count / total) * 100 : 0}%`, backgroundColor: it.color || "var(--accent)", borderRadius: 4, transition: "width .3s ease" }} />
        </Box>
        <Typography sx={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
          {it.count.toLocaleString()} · {total ? Math.round((it.count / total) * 100) : 0}%
        </Typography>
      </Box>
    ))}
  </Box>
);

const top = (map, n = 8) => {
  const list = [...map.values()].sort((a, b) => b.count - a.count);
  if (list.length <= n) return list;
  const rest = list.slice(n - 1).reduce((s, x) => s + x.count, 0);
  return [...list.slice(0, n - 1), { label: `${list.length - n + 1} more`, count: rest, muted: true }];
};

/**
 * Numbers for the rows on screen (the current group, view filters and search): totals,
 * the team each row counts for, and a breakdown of every choice-like field. Clicking a
 * value filters the table by it.
 */
const AnalysisPanel = ({ rows, allRows, fields, lookups, onFilter, title }) => {
  // OK / NOK check columns (found on the whole table so filtering doesn't hide them)
  const checks = useCheckColumns(allRows || rows, fields);
  const checkKeys = useMemo(() => new Set(checks.map((c) => c.field.key)), [checks]);
  const stats = useMemo(() => {
    const total = rows.length;
    const teams = new Map();
    const slidField = fields.find((f) => f.coreMapping === "slid");
    const slids = new Set();
    for (const r of rows) {
      const id = r.fieldTeamId ? String(r.fieldTeamId) : "";
      const label = id ? lookups.teams[id]?.teamName || "Unknown team" : r.teamResolution?.code ? `No team for code ${r.teamResolution.code}` : "No team";
      const k = id || `none:${label}`;
      teams.set(k, { label, count: (teams.get(k)?.count || 0) + 1, muted: !id });
      const s = r.slid || (slidField ? rawOf(slidField, r) : null);
      if (!isEmpty(s)) slids.add(String(s));
    }
    const breakdowns = fields
      .filter((f) => !checkKeys.has(f.key))
      .filter((f) => BREAKDOWN_TYPES.includes(f.type) || (f.type === "text" && f.coreMapping && ["teamCode", "status", "location"].includes(f.coreMapping)))
      .map((f) => {
        const m = new Map();
        for (const r of rows) {
          const raw = rawOf(f, r);
          const values = isEmpty(raw) ? [null] : f.type === "multiSelect" ? raw : [raw];
          for (const v of values) {
            const label = v === null ? `No ${f.label.toLowerCase()}` : formatValue(f, f.type === "multiSelect" ? [v] : v, r, lookups) || String(v);
            const k = v === null ? "__none" : typeof v === "object" ? JSON.stringify(v) : String(v);
            m.set(k, { label, count: (m.get(k)?.count || 0) + 1, value: v === null || typeof v === "object" ? undefined : v, muted: v === null, color: ["singleSelect", "multiSelect"].includes(f.type) && v !== null ? choiceColor(f, v) : undefined });
          }
        }
        return { field: f, items: top(m), distinct: m.size };
      })
      .filter((b) => b.distinct > 0 && b.distinct <= Math.max(30, total));
    const numbers = fields.filter((f) => f.type === "number" || f.type === "rating").map((f) => {
      const vals = rows.map((r) => rawOf(f, r)).filter((v) => typeof v === "number");
      return { field: f, n: vals.length, sum: vals.reduce((a, b) => a + b, 0), min: vals.length ? Math.min(...vals) : null, max: vals.length ? Math.max(...vals) : null };
    }).filter((x) => x.n);
    const dateField = fields.find((f) => f.coreMapping === "date") || fields.find((f) => ["date", "datetime"].includes(f.type));
    const months = new Map();
    let first = null;
    let last = null;
    if (dateField) {
      for (const r of rows) {
        const v = rawOf(dateField, r);
        if (!v) continue;
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) continue;
        const k = format(d, "yyyy-MM");
        months.set(k, { label: format(d, "MMM yyyy"), count: (months.get(k)?.count || 0) + 1, key: k });
        if (!first || d < first) first = d;
        if (!last || d > last) last = d;
      }
    }
    return { total, teams: top(teams, 10), teamed: rows.filter((r) => r.fieldTeamId).length, slids: slids.size, hasSlid: Boolean(slidField || rows.some((r) => r.slid)), breakdowns, numbers, dateField, months: [...months.values()].sort((a, b) => a.key.localeCompare(b.key)), first, last };
  }, [rows, fields, lookups, checkKeys]);

  if (!rows.length) return <EmptyState title="No rows to analyse" description="Clear the search or filters, or add rows to this group." />;

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", pb: 2 }}>
      {title && <Typography sx={{ fontSize: 13, color: "var(--text-secondary)", mb: 1.25 }}>{title}</Typography>}
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, mb: 2 }}>
        <StatCard label="Rows" value={stats.total.toLocaleString()} />
        <StatCard label="Counted for a team" value={`${stats.total ? Math.round((stats.teamed / stats.total) * 100) : 0}%`} hint={`${stats.teamed.toLocaleString()} rows`} />
        {stats.hasSlid ? <StatCard label="Distinct SLIDs" value={stats.slids.toLocaleString()} hint={stats.slids < stats.total ? `${(stats.total - stats.slids).toLocaleString()} repeat rows` : "no repeats"} /> : <StatCard label="Fields" value={fields.length} />}
        <StatCard label={stats.dateField ? stats.dateField.label : "Dates"} value={stats.first ? `${format(stats.first, "MMM yy")} – ${format(stats.last, "MMM yy")}` : "—"} hint={stats.first ? `${format(stats.first, "d MMM yyyy")} to ${format(stats.last, "d MMM yyyy")}` : undefined} />
      </Box>
      {checks.length > 0 && <IssueRanking rows={rows} checks={checks} lookups={lookups} onFilter={onFilter} />}
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
        <SectionCard title="By field team" description="The team that held the row's team code on the row's date.">
          <Bars items={stats.teams} total={stats.total} />
        </SectionCard>
        {stats.months.length > 1 && (
          <SectionCard title={`By month · ${stats.dateField.label}`}>
            <Bars items={stats.months} total={stats.total} />
          </SectionCard>
        )}
        {stats.breakdowns.map((b) => (
          <SectionCard key={b.field.key} title={`By ${b.field.label}`}>
            <Bars items={b.items} total={stats.total} onPick={onFilter ? (v) => onFilter(b.field, v) : undefined} />
          </SectionCard>
        ))}
        {stats.numbers.length > 0 && (
          <SectionCard title="Numbers">
            <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, "& td, & th": { py: 0.75, borderBottom: "1px solid var(--border)", textAlign: "right" }, "& th:first-of-type, & td:first-of-type": { textAlign: "left" }, "& th": { color: "var(--text-secondary)", fontWeight: 500 } }}>
              <thead><tr><th>Field</th><th>Sum</th><th>Average</th><th>Min</th><th>Max</th></tr></thead>
              <tbody>
                {stats.numbers.map((x) => (
                  <tr key={x.field.key}><td>{x.field.label}</td><td>{x.sum.toLocaleString()}</td><td>{(x.sum / x.n).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td><td>{x.min.toLocaleString()}</td><td>{x.max.toLocaleString()}</td></tr>
                ))}
              </tbody>
            </Box>
          </SectionCard>
        )}
      </Box>
    </Box>
  );
};

export default AnalysisPanel;
