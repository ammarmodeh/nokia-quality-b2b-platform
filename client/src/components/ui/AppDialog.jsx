import { useRef } from "react";
import { Box, Button, CircularProgress, Dialog, IconButton, Typography, useMediaQuery } from "@mui/material";
import Close from "@mui/icons-material/Close";
import ErrorState from "./ErrorState";

const WIDTHS = { xs: 420, sm: 520, md: 680, lg: 920, xl: 1180 };

/**
 * The one dialog shell for the app: header (title, description, close), a scrolling
 * body and a footer with the actions on the right (secondary, then primary).
 *
 * - size: xs | sm | md | lg | xl. Full screen on phones.
 * - Pass `primary` for the standard footer: { label, onClick, disabled, loading, danger, type: "submit" }.
 *   `secondary` defaults to Cancel; `extraActions` sit on the left (e.g. a destructive Delete in an edit form).
 *   Or pass `actions` to render your own footer content.
 * - `onSubmit` wraps the body in a <form>; Enter submits and the primary button becomes type="submit".
 * - While `primary.loading` is true the dialog can't be closed and the primary can't be clicked twice.
 * - `error` shows an ErrorState above the body (string or { title, message }).
 */
const AppDialog = ({
  open,
  onClose,
  title,
  description,
  icon,
  size = "sm",
  children,
  primary,
  secondary,
  extraActions,
  actions,
  error,
  onSubmit,
  dividers = true,
  bodySx,
  ...rest
}) => {
  const phone = useMediaQuery("(max-width:599.95px)");
  const busy = Boolean(primary?.loading);
  const submitting = useRef(false);
  const close = (e, reason) => {
    if (busy) return;
    if (reason === "backdropClick" && onSubmit) return; // don't lose a half-filled form to a stray click
    onClose?.(e, reason);
  };
  const runPrimary = async (e) => {
    e?.preventDefault?.();
    if (busy || submitting.current || primary?.disabled) return;
    submitting.current = true;
    try {
      await (onSubmit || primary?.onClick)?.(e);
    } finally {
      submitting.current = false;
    }
  };
  const err = typeof error === "string" ? { title: "Something went wrong", message: error } : error;
  const secondaryProps = secondary === false ? null : { label: "Cancel", onClick: onClose, ...secondary };

  return (
    <Dialog
      open={open}
      onClose={close}
      fullScreen={phone}
      scroll="paper"
      aria-labelledby="app-dialog-title"
      slotProps={{ paper: { sx: { width: "100%", maxWidth: phone ? "none" : WIDTHS[size] || WIDTHS.sm, m: phone ? 0 : 2, display: "flex", flexDirection: "column", maxHeight: phone ? "100%" : "calc(100% - 64px)" } } }}
      {...rest}
    >
      <Box
        component={onSubmit ? "form" : "div"}
        onSubmit={onSubmit ? runPrimary : undefined}
        noValidate
        sx={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25, px: 2.5, pt: 2, pb: dividers ? 1.75 : 0.5, borderBottom: dividers ? "1px solid var(--border)" : 0 }}>
          {icon && <Box sx={{ mt: "1px", color: "var(--text-secondary)", display: "flex" }}>{icon}</Box>}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography id="app-dialog-title" component="h2" sx={{ fontSize: 16, fontWeight: 600, color: "var(--text)", lineHeight: 1.35 }}>{title}</Typography>
            {description && (
              <Typography component={typeof description === "string" ? "p" : "div"} sx={{ mt: 0.25, fontSize: 13, color: "var(--text-secondary)" }}>{description}</Typography>
            )}
          </Box>
          <IconButton size="small" aria-label="Close" onClick={(e) => close(e, "closeButton")} disabled={busy} sx={{ color: "var(--text-muted)", mt: -0.25, mr: -0.75 }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 2.5, py: 2, ...bodySx }}>
          {err && <ErrorState title={err.title} message={err.message} sx={{ mb: 2 }} />}
          {children}
        </Box>
        {(actions || primary || extraActions) && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", px: 2.5, py: 1.5, borderTop: "1px solid var(--border)", backgroundColor: "var(--surface-subtle)", borderRadius: phone ? 0 : "0 0 12px 12px" }}>
            {extraActions}
            <Box sx={{ flex: 1 }} />
            {actions}
            {!actions && secondaryProps && (
              <Button variant="outlined" onClick={secondaryProps.onClick} disabled={busy || secondaryProps.disabled}>{secondaryProps.label}</Button>
            )}
            {!actions && primary && (
              <Button
                variant="contained"
                color={primary.danger ? "error" : "primary"}
                type={onSubmit ? "submit" : "button"}
                onClick={onSubmit ? undefined : runPrimary}
                disabled={busy || primary.disabled}
                startIcon={busy ? <CircularProgress size={14} thickness={5} sx={{ color: "inherit" }} /> : primary.icon}
              >
                {busy && primary.loadingLabel ? primary.loadingLabel : primary.label}
              </Button>
            )}
          </Box>
        )}
      </Box>
    </Dialog>
  );
};

export default AppDialog;
