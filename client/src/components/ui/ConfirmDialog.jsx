import AppDialog from "./AppDialog";

/** Yes / no confirmation on the shared dialog shell. For permanent deletes use SafeDeleteDialog. */
const ConfirmDialog = ({ open, title = "Are you sure?", description, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false, loading = false, error, children, onConfirm, onClose }) => (
  <AppDialog
    open={open}
    onClose={onClose}
    size="xs"
    title={title}
    description={description}
    error={error}
    dividers={false}
    bodySx={children || error ? undefined : { py: 1 }}
    secondary={{ label: cancelLabel }}
    primary={{ label: confirmLabel, onClick: onConfirm, loading, danger }}
  >
    {children}
  </AppDialog>
);

export default ConfirmDialog;
