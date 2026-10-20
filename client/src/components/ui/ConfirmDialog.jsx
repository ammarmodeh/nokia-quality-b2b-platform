import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";

const ConfirmDialog = ({ open, title = "Are you sure?", description, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false, loading = false, onConfirm, onClose }) => (
  <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    {description && (
      <DialogContent sx={{ pt: "0 !important" }}>
        <Typography component={typeof description === "string" ? "p" : "div"} sx={{ fontSize: 13, color: "var(--text-secondary)" }}>{description}</Typography>
      </DialogContent>
    )}
    <DialogActions>
      <Button variant="outlined" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
      <Button variant="contained" color={danger ? "error" : "primary"} onClick={onConfirm} disabled={loading}>
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
