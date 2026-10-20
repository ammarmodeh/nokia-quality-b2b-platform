import { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import CheckCircle from "@mui/icons-material/CheckCircle";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import RadioButtonUnchecked from "@mui/icons-material/RadioButtonUnchecked";

/** Determinate bar with a smooth fill; indeterminate shimmer when `value` is null. */
export const ProgressBar = ({ value = null, tone = "accent", height = 6, sx }) => {
  const color = { accent: "var(--accent)", success: "var(--success)", danger: "var(--danger)" }[tone] || "var(--accent)";
  return (
    <Box
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === null ? undefined : Math.round(value)}
      sx={{ position: "relative", height, borderRadius: height, overflow: "hidden", backgroundColor: "var(--surface-active)", ...sx }}
    >
      {value === null ? (
        <Box sx={{ position: "absolute", inset: 0, width: "35%", borderRadius: height, backgroundColor: color, animation: "qops-indeterminate 1.1s ease-in-out infinite", "@keyframes qops-indeterminate": { "0%": { left: "-35%" }, "100%": { left: "100%" } } }} />
      ) : (
        <Box sx={{ height: "100%", width: `${Math.max(0, Math.min(100, value))}%`, borderRadius: height, backgroundColor: color, transition: "width .35s ease" }} />
      )}
    </Box>
  );
};

const fmtDuration = (s) => {
  if (!Number.isFinite(s) || s < 0) return "";
  if (s < 5) return "a few seconds";
  if (s < 60) return `${Math.round(s / 5) * 5} s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return r ? `${m} min ${r} s` : `${m} min`;
};

const StepIcon = ({ status }) => {
  if (status === "done") return <CheckCircle sx={{ fontSize: 18, color: "var(--success)" }} />;
  if (status === "error") return <ErrorOutline sx={{ fontSize: 18, color: "var(--danger)" }} />;
  if (status === "active") return <CircularProgress size={15} thickness={6} sx={{ color: "var(--accent)", m: "1.5px" }} />;
  return <RadioButtonUnchecked sx={{ fontSize: 18, color: "var(--border-strong)" }} />;
};

/**
 * Progress for long, multi-step work (imports, bulk writes). Replaces the form while it runs.
 *
 * steps: [{ label, status: 'pending'|'active'|'done'|'error', detail? }]
 * current: { done, total, unit } — the running step's determinate progress (omit for indeterminate)
 * startedAt: ms timestamp of the current step, for the time-left estimate
 * counts: [{ label, value, tone }] — live tallies (created, updated, failed …)
 * title / description: headline above the bar
 */
const ProgressPanel = ({ title, description, steps = [], current, startedAt, counts = [], footer }) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const pct = current?.total ? (current.done / current.total) * 100 : null;
  let eta = "";
  if (current?.total && current.done > 0 && startedAt) {
    const elapsed = (Date.now() - startedAt) / 1000;
    const rate = current.done / Math.max(elapsed, 0.001);
    eta = fmtDuration((current.total - current.done) / rate);
  }

  return (
    <Box aria-live="polite" sx={{ py: 1 }}>
      {title && <Typography sx={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{title}</Typography>}
      {description && <Typography sx={{ fontSize: 13, color: "var(--text-secondary)", mt: 0.25 }}>{description}</Typography>}

      <Box sx={{ mt: 2 }}>
        <ProgressBar value={pct} />
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.75, fontSize: 12.5, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
          <span>{current?.total ? `${current.done.toLocaleString()} of ${current.total.toLocaleString()} ${current.unit || "items"}` : "Working…"}</span>
          <span>{pct !== null ? `${Math.floor(pct)}%${eta ? ` · about ${eta} left` : ""}` : ""}</span>
        </Box>
      </Box>

      {counts.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1.5 }}>
          {counts.map((c) => (
            <Box key={c.label} sx={{ px: 1.25, py: 0.75, borderRadius: "8px", border: "1px solid var(--border)", minWidth: 96 }}>
              <Typography sx={{ fontSize: 18, fontWeight: 600, lineHeight: 1.2, fontVariantNumeric: "tabular-nums", color: c.tone ? `var(--${c.tone})` : "var(--text)" }}>{Number(c.value || 0).toLocaleString()}</Typography>
              <Typography sx={{ fontSize: 12, color: "var(--text-secondary)" }}>{c.label}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {steps.length > 0 && (
        <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, mt: 2, border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
          {steps.map((s, i) => (
            <Box component="li" key={`${s.label}-${i}`} sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.5, py: 1, borderBottom: "1px solid var(--border)", "&:last-of-type": { borderBottom: 0 }, backgroundColor: s.status === "active" ? "var(--surface-subtle)" : "transparent" }}>
              <StepIcon status={s.status} />
              <Typography dir="auto" sx={{ flex: 1, fontSize: 13, color: s.status === "pending" ? "var(--text-muted)" : "var(--text)", fontWeight: s.status === "active" ? 500 : 400 }}>{s.label}</Typography>
              {s.detail && <Typography sx={{ fontSize: 12, color: s.status === "error" ? "var(--danger)" : "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{s.detail}</Typography>}
            </Box>
          ))}
        </Box>
      )}
      {footer && <Box sx={{ mt: 1.5 }}>{footer}</Box>}
    </Box>
  );
};

export default ProgressPanel;
