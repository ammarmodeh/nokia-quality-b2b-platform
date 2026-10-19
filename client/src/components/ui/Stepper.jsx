import { Box, Button, LinearProgress, Typography } from "@mui/material";
import Check from "@mui/icons-material/Check";
import ArrowBack from "@mui/icons-material/ArrowBack";
import ArrowForward from "@mui/icons-material/ArrowForward";

/**
 * Horizontal step rail. steps: [{ label, hint?, tone?: 'success'|'danger'|'warning'|'neutral', done?: bool }]
 * Steps are free to jump between (forms here are not strictly linear).
 */
export const StepRail = ({ steps, active, onChange, ariaLabel = "Form steps" }) => {
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
          Step {active + 1} of {steps.length} · <strong style={{ color: "var(--text)" }}>{steps[active]?.label}</strong>
        </Typography>
        <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>{doneCount} of {steps.length} complete</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={((active + 1) / steps.length) * 100}
        sx={{ height: 4, borderRadius: 2, mb: 1.5, backgroundColor: "var(--surface-active)", "& .MuiLinearProgress-bar": { backgroundColor: "var(--accent)", borderRadius: 2 } }}
      />
      <Box component="ol" aria-label={ariaLabel} sx={{ display: "flex", gap: 0.75, overflowX: "auto", m: 0, p: 0, pb: 0.5, listStyle: "none" }}>
        {steps.map((s, i) => {
          const isActive = i === active;
          const toneColor = { success: "var(--success)", danger: "var(--danger)", warning: "var(--warning)" }[s.tone];
          return (
            <Box component="li" key={s.label} sx={{ flexShrink: 0 }}>
              <Box
                component="button"
                type="button"
                aria-current={isActive ? "step" : undefined}
                onClick={() => onChange(i)}
                sx={{
                  display: "flex", alignItems: "center", gap: 0.75, height: 32, pl: 0.75, pr: 1.25, borderRadius: "16px", cursor: "pointer",
                  font: "inherit", fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap",
                  border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                  backgroundColor: isActive ? "var(--accent-subtle)" : "var(--surface)",
                  color: isActive ? "var(--accent-text)" : "var(--text-secondary)",
                  "&:hover": { borderColor: isActive ? "var(--accent)" : "var(--border-strong)", color: "var(--text)" },
                  "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: 1 },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 20, height: 20, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, flexShrink: 0,
                    backgroundColor: s.done ? toneColor || "var(--success)" : isActive ? "var(--accent)" : "var(--surface-active)",
                    color: s.done || isActive ? "#fff" : "var(--text-muted)",
                  }}
                >
                  {s.done ? <Check sx={{ fontSize: 13 }} /> : i + 1}
                </Box>
                {s.label}
                {s.hint && <Box component="span" sx={{ fontSize: 11.5, color: toneColor || "var(--text-muted)", fontWeight: 600 }}>{s.hint}</Box>}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

/** Back / Next footer. On the last step it renders `finish` instead of Next. */
export const StepFooter = ({ active, count, onBack, onNext, nextDisabled = false, nextLabel = "Next", finish, extra }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, pt: 2, mt: 1, borderTop: "1px solid var(--border)" }}>
    <Button variant="outlined" startIcon={<ArrowBack sx={{ fontSize: 16 }} />} onClick={onBack} disabled={active === 0}>
      Back
    </Button>
    {extra}
    <Box sx={{ flex: 1 }} />
    {active < count - 1 ? (
      <Button variant="contained" endIcon={<ArrowForward sx={{ fontSize: 16 }} />} onClick={onNext} disabled={nextDisabled}>
        {nextLabel}
      </Button>
    ) : (
      finish
    )}
  </Box>
);
