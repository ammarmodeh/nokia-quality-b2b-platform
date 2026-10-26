import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Tooltip, Typography } from "@mui/material";
import { format } from "date-fns";
import SectionCard from "../../components/ui/SectionCard";
import StatCard from "../../components/ui/StatCard";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { computePeriodNps } from "./npsPeriods";

const COLORS = { promoters: "var(--success)", neutrals: "var(--warning)", detractors: "var(--danger)" };

const topCounts = (tasks, field, limit = 5) => {
  const m = new Map();
  for (const t of tasks) {
    const vals = Array.isArray(t[field]) ? t[field].filter(Boolean) : t[field] ? [t[field]] : [];
    for (const v of vals.length ? vals : ["Not specified"]) m.set(v, (m.get(v) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
};

const Bar = ({ label, value, max, color }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 36px", gap: 1, alignItems: "center", py: 0.5 }}>
    <Box sx={{ minWidth: 0 }}>
      <Typography noWrap dir="auto" title={label} sx={{ fontSize: 12.5, color: "var(--text)", mb: 0.5 }}>{label}</Typography>
      <Box sx={{ height: 6, borderRadius: 3, backgroundColor: "var(--surface-active)", overflow: "hidden" }}>
        <Box sx={{ height: "100%", width: `${max ? (value / max) * 100 : 0}%`, backgroundColor: color, borderRadius: 3 }} />
      </Box>
    </Box>
    <Typography sx={{ fontSize: 12.5, fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
  </Box>
);

const iso = (d) => format(d, "yyyy-MM-dd");

/** NPS Performance (FTTH Installations): KPI cards + breakdown. */
const NpsPerformance = ({ tasks, samples, settings, period, teamFilter }) => {
  const navigate = useNavigate();
  const cur = useMemo(() => computePeriodNps(tasks, samples, period.current, settings || {}), [tasks, samples, period, settings]);
  const prev = useMemo(() => computePeriodNps(tasks, samples, period.previous, settings || {}), [tasks, samples, period, settings]);

  const tPro = settings?.npsTargets?.promoters ?? 75;
  const tDet = settings?.npsTargets?.detractors ?? 8;
  const delta = (a, b) => (prev.hasSamples && cur.hasSamples ? a - b : undefined);

  const openTasks = (type) =>
    navigate(`/dvoc-installations?view=table&type=${type}&from=${iso(period.current.start)}&to=${iso(period.current.end)}${teamFilter.length ? `&team=${encodeURIComponent(teamFilter.join(","))}` : ""}`);

  const reasons = useMemo(() => topCounts(cur.detractorTasks, "reason"), [cur]);
  const owners = useMemo(() => topCounts([...cur.detractorTasks, ...cur.neutralTasks], "responsible"), [cur]);

  return (
    <Box component="section" aria-labelledby="nps-perf" sx={{ mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
        <Typography id="nps-perf" component="h2" sx={{ fontSize: 15, fontWeight: 600 }}>NPS performance</Typography>
        <Typography sx={{ fontSize: 13, color: "var(--text-secondary)" }}>FTTH installations · {period.current.label}</Typography>
        <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>{period.current.sub}</Typography>
        {teamFilter.length > 0 && (
          <Tooltip title="Survey samples are recorded company-wide, so team-filtered percentages are shares of all samples.">
            <span><Badge tone="info" sx={{ ml: 0.5 }}>Team filter · share of total samples</Badge></span>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" }, mb: 1.5 }}>
        <StatCard label="NPS score" value={cur.hasSamples ? cur.nps : "—"} delta={delta(cur.nps, prev.nps)} deltaSuffix=" pts" hint={`Target ≥ ${tPro - tDet}`} />
        <StatCard
          label="Promoters"
          value={cur.hasSamples ? `${cur.promotersPercent}%` : "—"}
          delta={delta(cur.promotersPercent, prev.promotersPercent)}
          deltaSuffix=" pts"
          hint={`${cur.promoters.toLocaleString()} · goal ≥ ${tPro}%`}
          icon={<Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.promoters }} />}
        />
        <StatCard
          label="Passives"
          value={cur.hasSamples ? `${cur.neutralsPercent}%` : "—"}
          delta={delta(cur.neutralsPercent, prev.neutralsPercent)}
          deltaSuffix=" pts"
          goodWhen="down"
          hint={`${cur.neutrals.toLocaleString()} neutrals`}
          icon={<Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.neutrals }} />}
          onClick={cur.neutrals ? () => openTasks("Neutral") : undefined}
        />
        <StatCard
          label="Detractors"
          value={cur.hasSamples ? `${cur.detractorsPercent}%` : "—"}
          delta={delta(cur.detractorsPercent, prev.detractorsPercent)}
          deltaSuffix=" pts"
          goodWhen="down"
          hint={`${cur.detractors.toLocaleString()} · goal ≤ ${tDet}%`}
          icon={<Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.detractors }} />}
          onClick={cur.detractors ? () => openTasks("Detractor") : undefined}
        />
        <StatCard
          label="Responses"
          value={cur.totalSamples.toLocaleString()}
          delta={prev.hasSamples && cur.hasSamples ? cur.totalSamples - prev.totalSamples : undefined}
          hint="survey samples"
          sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}
        />
      </Box>

      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "1.3fr 1fr 1fr" } }}>
        <SectionCard title="Response mix" description={`vs. ${period.previous.label}`}>
          {!cur.hasSamples ? (
            <EmptyState title="No survey samples for this period" description="Enter this period’s sample size from Survey samples at the top of the page, or pick another period." minHeight={140} sx={{ py: 2 }} />
          ) : (
            [["This period", cur], ["Previous", prev]].map(([label, s]) => (
              <Box key={label} sx={{ mb: 2, "&:last-child": { mb: 0 } }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
                  <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{label}</Typography>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{s.hasSamples ? `NPS ${s.nps}` : "No samples"}</Typography>
                </Box>
                <Box sx={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", backgroundColor: "var(--surface-active)" }}>
                  {s.hasSamples &&
                    [["promoters", s.promotersPercent], ["neutrals", s.neutralsPercent], ["detractors", s.detractorsPercent]].map(([k, v]) => (
                      <Tooltip key={k} title={`${k[0].toUpperCase() + k.slice(1)}: ${v}%`}>
                        <Box sx={{ width: `${v}%`, backgroundColor: COLORS[k] }} />
                      </Tooltip>
                    ))}
                </Box>
              </Box>
            ))
          )}
          <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
            {[["Promoters 9–10", COLORS.promoters], ["Passives 7–8", COLORS.neutrals], ["Detractors 1–6", COLORS.detractors]].map(([l, c]) => (
              <Box key={l} sx={{ display: "flex", alignItems: "center", gap: 0.75, fontSize: 12, color: "var(--text-secondary)" }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "2px", backgroundColor: c }} />
                {l}
              </Box>
            ))}
          </Box>
        </SectionCard>

        <SectionCard title="Top detractor reasons" description={`${cur.detractors} detractor${cur.detractors === 1 ? "" : "s"} this period`}>
          {reasons.length ? reasons.map(([l, v]) => <Bar key={l} label={l} value={v} max={reasons[0][1]} color={COLORS.detractors} />) : (
            <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>No detractors in this period.</Typography>
          )}
        </SectionCard>

        <SectionCard title="Top owners" description="Detractors and neutrals by responsible owner">
          {owners.length ? owners.map(([l, v]) => <Bar key={l} label={l} value={v} max={owners[0][1]} color="var(--accent)" />) : (
            <Typography sx={{ fontSize: 12.5, color: "var(--text-muted)" }}>Nothing to attribute in this period.</Typography>
          )}
        </SectionCard>
      </Box>
    </Box>
  );
};

export default NpsPerformance;
