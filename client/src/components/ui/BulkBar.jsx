import { Box, Button, Typography } from "@mui/material";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";

/**
 * Selection bar above a table: "N selected", the page's actions, Export / Delete, Clear.
 * Pass onExport / onDelete to show those buttons (omit onDelete for people who can't delete).
 */
const BulkBar = ({ count, children, onExport, onDelete, onClear, sx }) => (
  <Box
    role="region"
    aria-label="Bulk actions"
    sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", px: 1.5, py: 1, mb: 1.5, borderRadius: "10px", border: "1px solid var(--accent)", backgroundColor: "var(--accent-subtle)", ...sx }}
  >
    <Typography sx={{ fontSize: 13, fontWeight: 600, color: "var(--accent-text)", mr: 1 }}>{count} selected</Typography>
    {children}
    {onExport && <Button variant="outlined" startIcon={<FileDownloadOutlined sx={{ fontSize: 16 }} />} onClick={onExport}>Export</Button>}
    {onDelete && <Button variant="outlined" color="error" startIcon={<DeleteOutline sx={{ fontSize: 16 }} />} onClick={onDelete} sx={{ color: "var(--danger)" }}>Delete</Button>}
    <Box sx={{ flex: 1 }} />
    <Button variant="text" onClick={onClear} sx={{ color: "var(--text-secondary)" }}>Clear selection</Button>
  </Box>
);

export default BulkBar;
