import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Box, Typography } from "@mui/material";
import SectionCard from "../../components/ui/SectionCard";
import SegmentedControl from "../../components/ui/SegmentedControl";
import EmptyState from "../../components/ui/EmptyState";
import { TREND_GRAINS, computePeriodNps, trendBuckets } from "./npsPeriods";

const SERIES = [
  { key: "nps", label: "NPS", color: "var(--accent)" },
  { key: "promoters", label: "Promoters %", color: "var(--success)" },
  { key: "neutrals", label: "Passives %", color: "var(--warning)" },
  { key: "detractors", label: "Detractors %", color: "var(--danger)" },
];

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <Box sx={{ p: 1.25, borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", boxShadow: "var(--shadow-md)", minWidth: 180 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{d.label}</Typography>
      <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)", mb: 0.75 }}>{d.sub}</Typography>
      {!d.hasSamples ? (
        <Typography sx={{ fontSize: 12, color: "var(--text-secondary)" }}>No samples recorded</Typography>
      ) : (
        <>
          {SERIES.map((s) => (
            <Box key={s.key} sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 12, py: 0.25 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "2px", backgroundColor: s.color }} />
              <span style={{ flex: 1, color: "var(--text-secondary)" }}>{s.label}</span>
              <strong>{d[s.key]}</strong>
            </Box>
          ))}
          <Typography sx={{ fontSize: 11.5, color: "var(--text-muted)", mt: 0.5 }}>
            {d.samples.toLocaleString()} samples · {d.detCount} det. · {d.neuCount} neu.
          </Typography>
        </>
      )}
    </Box>
  );
};

/** NPS Performance Trends over time with a period-grain selector. */
const NpsTrends = ({ tasks, samples, settings, grain, onGrainChange }) => {
  const [hidden, setHidden] = useState({ neutrals: true });
  const tPro = settings?.npsTargets?.promoters ?? 75;
  const tDet = settings?.npsTargets?.detractors ?? 8;

  const data = useMemo(
    () =>
      trendBuckets(grain, settings || {}).map((b) => {
        const s = computePeriodNps(tasks, samples, b, settings || {});
        return {
          label: b.label, sub: b.sub, short: b.short, hasSamples: s.hasSamples, samples: s.totalSamples,
          detCount: s.detractors, neuCount: s.neutrals,
          nps: s.hasSamples ? s.nps : null,
          promoters: s.hasSamples ? s.promotersPercent : null,
          neutrals: s.hasSamples ? s.neutralsPercent : null,
          detractors: s.hasSamples ? s.detractorsPercent : null,
        };
      }),
    [tasks, samples, settings, grain]
  );

  const withData = data.filter((d) => d.hasSamples);
  const avg = withData.length ? Math.round(withData.reduce((n, d) => n + d.nps, 0) / withData.length) : null;

  return (
    <SectionCard
      title="NPS performance trends"
      description={avg === null ? "No sampled periods in this window" : `Average NPS ${avg} across ${withData.length} sampled period${withData.length === 1 ? "" : "s"}`}
      actions={<SegmentedControl ariaLabel="Trend period" size="sm" value={grain} onChange={onGrainChange} options={TREND_GRAINS.map((g) => ({ value: g.value, label: g.label }))} />}
      sx={{ mb: 3 }}
    >
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1.5 }}>
        {SERIES.map((s) => {
          const off = hidden[s.key];
          return (
            <Box
              key={s.key}
              component="button"
              type="button"
              aria-pressed={!off}
              onClick={() => setHidden((h) => ({ ...h, [s.key]: !off }))}
              sx={{
                display: "inline-flex", alignItems: "center", gap: 0.75, height: 26, px: 1, borderRadius: "6px", cursor: "pointer",
                font: "inherit", fontSize: 12, border: "1px solid var(--border)", backgroundColor: off ? "transparent" : "var(--surface-subtle)",
                color: off ? "var(--text-muted)" : "var(--text)", "&:hover": { borderColor: "var(--border-strong)" },
              }}
            >
              <Box sx={{ width: 10, height: 3, borderRadius: 2, backgroundColor: off ? "var(--border-strong)" : s.color }} />
              {s.label}
            </Box>
          );
        })}
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center" }}>
          Targets: NPS ≥ {tPro - tDet} · Promoters ≥ {tPro}% · Detractors ≤ {tDet}%
        </Typography>
      </Box>
      {!withData.length ? (
        <EmptyState title="No trend data yet" description="Trends appear once survey sample sizes are recorded for these periods." minHeight={260} />
      ) : (
        <Box sx={{ height: 300, "& .recharts-cartesian-axis-tick-value": { fill: "var(--text-muted)", fontSize: 11.5 } }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="npsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="short" tickLine={false} axisLine={{ stroke: "var(--border)" }} interval="preserveStartEnd" />
              <YAxis domain={[(min) => Math.min(0, Math.floor(min / 10) * 10), 100]} tickLine={false} axisLine={false} width={44} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border-strong)" }} />
              {!hidden.nps && <ReferenceLine y={tPro - tDet} stroke="var(--accent)" strokeDasharray="4 4" strokeOpacity={0.6} />}
              {!hidden.promoters && <ReferenceLine y={tPro} stroke="var(--success)" strokeDasharray="4 4" strokeOpacity={0.5} />}
              {!hidden.detractors && <ReferenceLine y={tDet} stroke="var(--danger)" strokeDasharray="4 4" strokeOpacity={0.5} />}
              {!hidden.nps && <Area type="monotone" dataKey="nps" name="NPS" stroke="var(--accent)" strokeWidth={2.25} fill="url(#npsFill)" connectNulls dot={{ r: 3, fill: "var(--accent)", strokeWidth: 0 }} activeDot={{ r: 5 }} />}
              {!hidden.promoters && <Line type="monotone" dataKey="promoters" stroke="var(--success)" strokeWidth={1.75} connectNulls dot={false} />}
              {!hidden.neutrals && <Line type="monotone" dataKey="neutrals" stroke="var(--warning)" strokeWidth={1.75} connectNulls dot={false} />}
              {!hidden.detractors && <Line type="monotone" dataKey="detractors" stroke="var(--danger)" strokeWidth={1.75} connectNulls dot={false} />}
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      )}
    </SectionCard>
  );
};

export default NpsTrends;
