import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import Close from "@mui/icons-material/Close";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import XLSX from "xlsx-js-style";
import { toast } from "sonner";
import { format } from "date-fns";
import Badge from "../../components/ui/Badge";
import { errMsg, maintenanceApi } from "./maintenanceApi";

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, " ")
    .trim();

const isMatch = (header, candidates) => {
  const h = norm(header);
  if (!h) return false;
  return candidates.some((c) => {
    const nc = norm(c);
    return h === nc || h.includes(nc) || nc.includes(h);
  });
};

const TEL_SYNONYMS = ["tel no", "tel no.", "tel", "tel_no", "telephone", "slid", "int no", "int", "phone", "msisdn", "رقم الهاتف", "رقم الاشتراك", "رقم المشترك"];
const INST_DATE_SYNONYMS = ["installation date", "install date", "pis date", "pis", "in date", "installation", "تاريخ التركيب", "تاريخ التفعيل"];
const CREATION_DATE_SYNONYMS = ["creation date", "created date", "fault date", "reporting date", "date", "created at", "تاريخ التبليغ", "تاريخ الإنشاء"];
const NCF_SYNONYMS = ["ncf", "new connection fault", "new connection", "عطل اشتراك جديد"];
const HC_SYNONYMS = ["hc responsibility", "hc resposnsibility", "hc", "home care", "مسؤولية hc", "مسؤولية الهوم كير"];
const CUSTOMER_SYNONYMS = ["customer name", "customer", "cust name", "name", "اسم المشترك", "الاسم"];
const COMPLAINT_SYNONYMS = ["customer complaint", "complaint", "complaint text", "شكوى المشترك", "الشكوى"];
const FAULT_TYPE_SYNONYMS = ["fault type", "fault", "issue type", "نوع العطل"];
const TICKET_SYNONYMS = ["ticket number", "ticket", "tt", "trouble ticket", "رقم التذكرة"];

const parseExcelDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === "number") {
    // Excel serial date format
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Upload maintenance sheet (Excel / CSV).
 * Maps "Tel no" column to SLID.
 * Auto-detects NCF (ticket created within 1 month / 31 days from installation date).
 * Supports HC responsibility and updating existing tasks or importing new ones.
 */
const MaintenanceUploadDialog = ({ open, onClose, teams = [], defaultTeam = "", onSuccess }) => {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({
    telNo: "",
    installationDate: "",
    creationDate: "",
    ncf: "",
    hcResponsibility: "",
    customerName: "",
    customerComplaint: "",
    faultType: "",
    ticketNumber: "",
  });
  const [team, setTeam] = useState(defaultTeam || (teams[0]?._id ?? ""));
  const [updateExistingNcf, setUpdateExistingNcf] = useState(true);
  const [createNewTasks, setCreateNewTasks] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setFile(null);
    setHeaders([]);
    setRawRows([]);
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const onFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError(null);
    setFile(selected);

    try {
      const buf = await selected.arrayBuffer();
      const isCsv = /\.csv$/i.test(selected.name);
      const wb = isCsv
        ? XLSX.read(new TextDecoder("utf-8").decode(buf), { type: "string", raw: false })
        : XLSX.read(buf, { type: "array", cellDates: true });

      const firstSheet = wb.SheetNames[0];
      const sheet = wb.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false });

      if (rows.length < 2) {
        throw new Error("Sheet contains insufficient data rows.");
      }

      // Detect header row (first non-empty row)
      let headerIdx = 0;
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const nonEmpty = rows[i].filter((c) => String(c).trim() !== "");
        if (nonEmpty.length >= 2) {
          headerIdx = i;
          break;
        }
      }

      const hRow = rows[headerIdx].map((h) => String(h || "").trim());
      const dataRows = rows.slice(headerIdx + 1).filter((r) => r.some((c) => String(c).trim() !== ""));

      setHeaders(hRow);
      setRawRows(dataRows);

      // Auto-map columns based on synonyms
      const autoMap = {
        telNo: hRow.find((h) => isMatch(h, TEL_SYNONYMS)) || "",
        installationDate: hRow.find((h) => isMatch(h, INST_DATE_SYNONYMS)) || "",
        creationDate: hRow.find((h) => isMatch(h, CREATION_DATE_SYNONYMS)) || "",
        ncf: hRow.find((h) => isMatch(h, NCF_SYNONYMS)) || "",
        hcResponsibility: hRow.find((h) => isMatch(h, HC_SYNONYMS)) || "",
        customerName: hRow.find((h) => isMatch(h, CUSTOMER_SYNONYMS)) || "",
        customerComplaint: hRow.find((h) => isMatch(h, COMPLAINT_SYNONYMS)) || "",
        faultType: hRow.find((h) => isMatch(h, FAULT_TYPE_SYNONYMS)) || "",
        ticketNumber: hRow.find((h) => isMatch(h, TICKET_SYNONYMS)) || "",
      };

      setMapping(autoMap);
    } catch (err) {
      setError(errMsg(err, "Failed to read the spreadsheet"));
      setFile(null);
    }
  };

  // Preview processed rows
  const parsedRecords = useMemo(() => {
    if (!rawRows.length || !mapping.telNo) return [];

    const telIdx = headers.indexOf(mapping.telNo);
    const instIdx = headers.indexOf(mapping.installationDate);
    const createIdx = headers.indexOf(mapping.creationDate);
    const ncfIdx = headers.indexOf(mapping.ncf);
    const hcIdx = headers.indexOf(mapping.hcResponsibility);
    const custIdx = headers.indexOf(mapping.customerName);
    const compIdx = headers.indexOf(mapping.customerComplaint);
    const faultIdx = headers.indexOf(mapping.faultType);
    const ticketIdx = headers.indexOf(mapping.ticketNumber);

    return rawRows.map((r) => {
      const slid = String(telIdx >= 0 ? r[telIdx] : "").trim().toUpperCase();
      const instDate = instIdx >= 0 ? parseExcelDate(r[instIdx]) : null;
      const createDate = createIdx >= 0 ? parseExcelDate(r[createIdx]) : null;

      let isNcf = false;
      if (ncfIdx >= 0 && r[ncfIdx] !== "") {
        const val = String(r[ncfIdx]).toLowerCase().trim();
        isNcf = val === "yes" || val === "true" || val === "1" || val === "y" || val === "نعم";
      } else if (instDate) {
        // NCF rule: ticket created within 1 month (31 days) from installation date
        const refDate = createDate || new Date();
        const diffDays = (refDate.getTime() - instDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0 && diffDays <= 31) {
          isNcf = true;
        }
      }

      let isHc = false;
      if (hcIdx >= 0 && r[hcIdx] !== "") {
        const val = String(r[hcIdx]).toLowerCase().trim();
        isHc = val === "yes" || val === "true" || val === "1" || val === "y" || val === "نعم";
      }

      return {
        slid,
        installationDate: instDate ? instDate.toISOString() : null,
        creationDate: createDate ? createDate.toISOString() : null,
        ncf: isNcf,
        hcResponsibility: isHc,
        customerName: custIdx >= 0 ? String(r[custIdx] || "").trim() : "",
        customerComplaint: compIdx >= 0 ? String(r[compIdx] || "").trim() : "",
        faultType: faultIdx >= 0 ? String(r[faultIdx] || "").trim() : "",
        ticketNumber: ticketIdx >= 0 ? String(r[ticketIdx] || "").trim() : "",
      };
    }).filter((r) => Boolean(r.slid));
  }, [rawRows, headers, mapping]);

  const ncfCount = useMemo(() => parsedRecords.filter((r) => r.ncf).length, [parsedRecords]);

  const handleSubmit = async () => {
    if (!parsedRecords.length) {
      setError("No valid records with Tel no / SLID found.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await maintenanceApi.tasks.bulkUpload({
        rows: parsedRecords,
        defaultTeam: team,
        updateExistingNcf,
        createNewTasks,
      });

      toast.success(
        `Upload complete: ${res.created || 0} task(s) created, ${res.updated || 0} updated with NCF / HC status.`
      );
      handleClose();
      onSuccess?.();
    } catch (err) {
      setError(errMsg(err, "Failed to upload maintenance sheet"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Box>
          <Typography sx={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
            Upload maintenance sheet · NCF check
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
            Upload an Excel or CSV file. The <b>Tel no</b> column matches the task <b>SLID</b>.
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} disabled={loading}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!file ? (
          <Box
            onClick={() => fileInputRef.current?.click()}
            sx={{
              p: 4,
              border: "2px dashed var(--border)",
              borderRadius: "8px",
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: "var(--surface-muted, rgba(0,0,0,0.01))",
              "&:hover": { borderColor: "var(--accent)", backgroundColor: "var(--surface-hover)" },
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileChange}
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
            />
            <UploadFileOutlined sx={{ fontSize: 44, color: "var(--text-muted)", mb: 1 }} />
            <Typography sx={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
              Click or drag spreadsheet here
            </Typography>
            <Typography sx={{ fontSize: 12, color: "var(--text-muted)", mt: 0.5 }}>
              Supports .xlsx, .xls, and .csv with a <b>Tel no</b> column
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, border: "1px solid var(--border)", borderRadius: "6px" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CheckCircleOutline sx={{ color: "var(--success)" }} />
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{file.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {parsedRecords.length.toLocaleString()} records detected · {ncfCount} identified as NCF
                  </Typography>
                </Box>
              </Box>
              <Button size="small" variant="text" onClick={reset} disabled={loading}>
                Change file
              </Button>
            </Box>

            {/* Column Mapping Section */}
            <Box sx={{ p: 1.5, border: "1px solid var(--border)", borderRadius: "6px" }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)", mb: 1 }}>
                Column Mapping (Tel no maps to SLID)
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 1.5 }}>
                <TextField
                  select
                  size="small"
                  label="Tel no (SLID) *"
                  value={mapping.telNo}
                  onChange={(e) => setMapping((m) => ({ ...m, telNo: e.target.value }))}
                >
                  <MenuItem value=""><em>Choose column</em></MenuItem>
                  {headers.map((h) => <MenuItem key={h} value={h}>{h}</MenuItem>)}
                </TextField>

                <TextField
                  select
                  size="small"
                  label="Installation date"
                  value={mapping.installationDate}
                  onChange={(e) => setMapping((m) => ({ ...m, installationDate: e.target.value }))}
                  helperText="Used to compute NCF within 1 month"
                >
                  <MenuItem value=""><em>Not mapped</em></MenuItem>
                  {headers.map((h) => <MenuItem key={h} value={h}>{h}</MenuItem>)}
                </TextField>

                <TextField
                  select
                  size="small"
                  label="Creation / Fault date"
                  value={mapping.creationDate}
                  onChange={(e) => setMapping((m) => ({ ...m, creationDate: e.target.value }))}
                >
                  <MenuItem value=""><em>Not mapped</em></MenuItem>
                  {headers.map((h) => <MenuItem key={h} value={h}>{h}</MenuItem>)}
                </TextField>

                <TextField
                  select
                  size="small"
                  label="NCF column (optional)"
                  value={mapping.ncf}
                  onChange={(e) => setMapping((m) => ({ ...m, ncf: e.target.value }))}
                >
                  <MenuItem value=""><em>Auto-compute from dates</em></MenuItem>
                  {headers.map((h) => <MenuItem key={h} value={h}>{h}</MenuItem>)}
                </TextField>

                <TextField
                  select
                  size="small"
                  label="HC responsibility (optional)"
                  value={mapping.hcResponsibility}
                  onChange={(e) => setMapping((m) => ({ ...m, hcResponsibility: e.target.value }))}
                >
                  <MenuItem value=""><em>Not mapped</em></MenuItem>
                  {headers.map((h) => <MenuItem key={h} value={h}>{h}</MenuItem>)}
                </TextField>

                <TextField
                  select
                  size="small"
                  label="Default Team (for new tasks)"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                >
                  <MenuItem value=""><em>First active team</em></MenuItem>
                  {teams.map((t) => <MenuItem key={t._id} value={t._id}>{t.teamName}</MenuItem>)}
                </TextField>
              </Box>
            </Box>

            {/* Options */}
            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", px: 0.5 }}>
              <FormControlLabel
                control={<Checkbox checked={updateExistingNcf} onChange={(e) => setUpdateExistingNcf(e.target.checked)} />}
                label={<Typography sx={{ fontSize: 13 }}>Update NCF & HC on existing maintenance tasks</Typography>}
              />
              <FormControlLabel
                control={<Checkbox checked={createNewTasks} onChange={(e) => setCreateNewTasks(e.target.checked)} />}
                label={<Typography sx={{ fontSize: 13 }}>Create tasks for new Tel numbers</Typography>}
              />
            </Box>

            {/* Preview Table */}
            {parsedRecords.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", mb: 0.5 }}>
                  Preview (showing first {Math.min(5, parsedRecords.length)} of {parsedRecords.length.toLocaleString()} rows):
                </Typography>
                <TableContainer sx={{ border: "1px solid var(--border)", borderRadius: "6px", maxHeight: 180 }}>
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: "var(--surface-muted, rgba(0,0,0,0.02))" }}>
                      <TableRow>
                        <TableCell sx={{ fontSize: 11.5, fontWeight: 600 }}>Tel no (SLID)</TableCell>
                        <TableCell sx={{ fontSize: 11.5, fontWeight: 600 }}>Installation Date</TableCell>
                        <TableCell sx={{ fontSize: 11.5, fontWeight: 600 }}>NCF</TableCell>
                        <TableCell sx={{ fontSize: 11.5, fontWeight: 600 }}>HC</TableCell>
                        <TableCell sx={{ fontSize: 11.5, fontWeight: 600 }}>Customer</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parsedRecords.slice(0, 5).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)" }}>{row.slid}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {row.installationDate ? format(new Date(row.installationDate), "d MMM yyyy") : "—"}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {row.ncf ? <Badge tone="warning">NCF</Badge> : <span style={{ color: "var(--text-muted)" }}>—</span>}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {row.hcResponsibility ? <Badge tone="danger">HC</Badge> : <span style={{ color: "var(--text-muted)" }}>—</span>}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{row.customerName || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={handleClose} disabled={loading} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !parsedRecords.length || !mapping.telNo}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <UploadFileOutlined />}
        >
          {loading ? "Processing…" : `Process ${parsedRecords.length ? `${parsedRecords.length.toLocaleString()} rows` : "sheet"}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MaintenanceUploadDialog;
