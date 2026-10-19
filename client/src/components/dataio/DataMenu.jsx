import { lazy, Suspense, useState } from "react";
import { useSelector } from "react-redux";
import { Button, Divider, ListItemIcon, Menu, MenuItem } from "@mui/material";
import ImportExportOutlined from "@mui/icons-material/ImportExportOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { ENTITY_KEYS } from "./entities";
import { downloadTemplate } from "./exportUtils";

const ImportWizard = lazy(() => import("./ImportWizard"));
const ExportDialog = lazy(() => import("./ExportDialog"));

/** Page-level Import / Export / Template menu. Import is admin-only. */
const DataMenu = ({ entity, viewRows, selectedRows, onImported, filename, context }) => {
  const isAdmin = useSelector((s) => s?.auth?.user?.role) === "Admin";
  const [anchor, setAnchor] = useState(null);
  const [dialog, setDialog] = useState(null);
  const pick = (d) => () => {
    setAnchor(null);
    setDialog(d);
  };
  return (
    <>
      <Button variant="outlined" startIcon={<ImportExportOutlined sx={{ fontSize: 17 }} />} endIcon={<ExpandMore sx={{ fontSize: 16 }} />} onClick={(e) => setAnchor(e.currentTarget)} aria-haspopup="menu">
        Data
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
        {isAdmin && (
          <MenuItem onClick={pick("import")}>
            <ListItemIcon><FileUploadOutlined fontSize="small" /></ListItemIcon>Import from Excel / CSV…
          </MenuItem>
        )}
        <MenuItem onClick={pick("export")}>
          <ListItemIcon><FileDownloadOutlined fontSize="small" /></ListItemIcon>Export…
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setAnchor(null); downloadTemplate(entity); }}>
          <ListItemIcon><DescriptionOutlined fontSize="small" /></ListItemIcon>Download import template
        </MenuItem>
      </Menu>
      <Suspense fallback={null}>
        {dialog === "import" && <ImportWizard open entity={entity} allowed={[entity, ...ENTITY_KEYS.filter((e) => e !== entity)]} onClose={() => setDialog(null)} onImported={onImported} context={context} />}
        {dialog === "export" && <ExportDialog open entity={entity} viewRows={viewRows} selectedRows={selectedRows} filename={filename} onClose={() => setDialog(null)} />}
      </Suspense>
    </>
  );
};

export default DataMenu;
