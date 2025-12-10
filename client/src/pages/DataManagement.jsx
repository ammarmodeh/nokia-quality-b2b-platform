import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, Paper, Alert, Chip, Tabs, Tab, Card, CardContent, Grid, IconButton, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Autocomplete } from '@mui/material';
import { DataGrid, GridToolbarContainer, GridToolbarColumnsButton, GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport, GridActionsCellItem, GridColumnMenu } from '@mui/x-data-grid';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { CloudUpload as CloudUploadIcon, CheckCircle as CheckCircleIcon, Delete as DeleteIcon, Refresh as RefreshIcon, Edit as EditIcon, Save as SaveIcon, Add as AddIcon, History as HistoryIcon, PostAdd as PostAddIcon } from '@mui/icons-material';
import { MenuItem } from '@mui/material';

// --- Unsaved Changes Confirmation Dialog ---
const UnsavedChangesDialog = ({ open, onClose, onConfirm }) => {
  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { color: 'white' } }}>
      <DialogTitle sx={{ color: '#ff9800' }}>⚠ Unsaved Changes</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: '#ccc' }}>
          You have unsaved data in the upload tab. Switching tabs will discard this data.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: '#ffffff' }}>
          Are you sure you want to leave?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#aaa' }}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="warning">
          Discard & Leave
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DataManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const { token } = useSelector((state) => state.auth);

  const [teamNames, setTeamNames] = useState([]);
  const [batches, setBatches] = useState([]);

  // Tab Switching Logic
  const [isUploadDirty, setIsUploadDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleTabChange = (e, newVal) => {
    if (tabValue === 0 && isUploadDirty) {
      setPendingTab(newVal);
      setConfirmOpen(true);
    } else {
      setTabValue(newVal);
    }
  };

  const confirmTabSwitch = () => {
    setTabValue(pendingTab);
    setConfirmOpen(false);
    setPendingTab(null);
    setIsUploadDirty(false); // Reset dirty state as component will unmount
  };

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/field-teams/get-field-teams`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          const names = res.data.map(t => t.teamName).filter(Boolean);
          setTeamNames(names);
        }
      } catch (error) {
        console.error("Failed to fetch field teams", error);
        toast.error("Could not load team list");
      }
    };

    fetchTeams();
    fetchHistory();
  }, [token]);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/detractors/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.status) setBatches(res.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', minHeight: '90vh' }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'white', mb: 3 }}>
        Data Management Portal
      </Typography>

      <UnsavedChangesDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmTabSwitch}
      />

      <Paper sx={{ color: 'white', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} textColor="inherit" indicatorColor="primary">
          <Tab label="New Upload" icon={<CloudUploadIcon />} iconPosition="start" />
          <Tab label="Manage History" icon={<HistoryIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {tabValue === 0 ?
        <UploadTab
          token={token}
          teamNames={teamNames}
          existingBatches={batches}
          onUploadSuccess={fetchHistory}
          onDirtyChange={setIsUploadDirty}
        /> :
        <HistoryTab token={token} teamNames={teamNames} batches={batches} refreshHistory={fetchHistory} />
      }
    </Box>
  );
};

// --- Custom Toolbar with Add Column ---
const CustomToolbar = ({ onAddColumn }) => {
  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton style={{ color: 'white' }} />
      <GridToolbarFilterButton style={{ color: 'white' }} />
      <GridToolbarDensitySelector style={{ color: 'white' }} />
      <GridToolbarExport style={{ color: 'white' }} />
      <Button startIcon={<PostAddIcon />} onClick={onAddColumn} style={{ color: '#90caf9' }}>
        Add Column
      </Button>
    </GridToolbarContainer>
  );
};

const CustomColumnMenu = (props) => {
  const { hideMenu, colDef, onDeleteColumn, ...other } = props;

  // Handler for deleting a column
  const handleDeleteColumn = () => {
    if (onDeleteColumn) {
      onDeleteColumn(colDef.field);
    }
    hideMenu();
  };

  return (
    <GridColumnMenu
      {...other}
      hideMenu={hideMenu}
      colDef={colDef}
      slots={{
        // Add our custom item as a menu item slot if possible, or just append children
        // In v7, simple children append should work if not overridden
      }}
    >
      <MenuItem onClick={handleDeleteColumn}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#f44336' }}>
          <DeleteIcon fontSize="small" />
          <Typography variant="body2">Delete Column</Typography>
        </Box>
      </MenuItem>
    </GridColumnMenu>
  );
};

// --- Custom Edit Cell for Team Names ---
const TeamEditInputCell = ({ id, value, field, api, options }) => {
  const handleChange = (event, newValue) => {
    api.setEditCellValue({ id, field, value: newValue || '' });
  };

  return (
    <Autocomplete
      value={value}
      onChange={handleChange}
      options={options || []}
      renderInput={(params) => (
        <TextField
          {...params}
          fullWidth
          autoFocus
          sx={{
            '& .MuiInputBase-root': {
              color: '#ffffff',

            },
            '& .MuiInputBase-input': { color: '#ffffff' },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#3d3d3d' },
          }}
        />
      )}
      sx={{
        width: '100%',
        '& .MuiAutocomplete-popupIndicator': { color: '#aaa' },
        '& .MuiAutocomplete-clearIndicator': { color: '#aaa' },
      }}
      componentsProps={{
        paper: {
          sx: {
            bgcolor: '#2a2a2a',
            color: '#ffffff',
            '& .MuiAutocomplete-option': {
              color: '#ffffff',
              '&:hover': { bgcolor: '#3a3a3a' },
              '&[aria-selected="true"]': { bgcolor: '#7b68ee !important' },
            },
          },
        },
      }}
    />
  );
};

// --- Custom Edit Cell for Responsible Field ---
const ResponsibleEditInputCell = ({ id, value, field, api, options }) => {
  const handleChange = (event, newValue) => {
    api.setEditCellValue({ id, field, value: newValue || '' });
  };

  return (
    <Autocomplete
      value={value}
      onChange={handleChange}
      options={options || []}
      freeSolo
      renderInput={(params) => (
        <TextField
          {...params}
          fullWidth
          autoFocus
          placeholder="Select or type..."
          sx={{
            '& .MuiInputBase-root': {
              color: '#ffffff',

            },
            '& .MuiInputBase-input': { color: '#ffffff' },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#3d3d3d' },
          }}
        />
      )}
      sx={{
        width: '100%',
        '& .MuiAutocomplete-popupIndicator': { color: '#aaa' },
        '& .MuiAutocomplete-clearIndicator': { color: '#aaa' },
      }}
      componentsProps={{
        paper: {
          sx: {
            bgcolor: '#2a2a2a',
            color: '#ffffff',
            '& .MuiAutocomplete-option': {
              color: '#ffffff',
              '&:hover': { bgcolor: '#3a3a3a' },
              '&[aria-selected="true"]': { bgcolor: '#7b68ee !important' },
            },
          },
        },
      }}
    />
  );
};

// --- Dialog Component ---
const AddColumnDialog = ({ open, onClose, onConfirm }) => {
  const [colName, setColName] = useState("");

  const handleConfirm = () => {
    if (colName.trim()) {
      onConfirm(colName.trim());
      setColName("");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { color: 'white' } }}>
      <DialogTitle>Add New Column</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Column Name"
          fullWidth
          variant="outlined"
          value={colName}
          onChange={(e) => setColName(e.target.value)}
          sx={{ input: { color: 'white' }, label: { color: '#aaa' }, fieldset: { borderColor: '#3d3d3d' } }}
        />
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: '#aaa' }}>Suggested:</Typography>
          <Chip
            label="Team Name"
            onClick={() => setColName("Team Name")}
            color="primary"
            variant="outlined"
            clickable
            size="small"
          />
          <Chip
            label="Responsible"
            onClick={() => setColName("Responsible")}
            color="secondary"
            variant="outlined"
            clickable
            size="small"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#aaa' }}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained">Add</Button>
      </DialogActions>
    </Dialog>
  );
};

// --- Conflict Resolution Dialog ---
const ConflictResolutionDialog = ({ open, onClose, conflicts, onResolve }) => {
  const [resolutions, setResolutions] = useState({}); // map of index -> 'new' | 'old'
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (open) {
      // Default to keeping old? Or wait for user choice? Let's default to nothing or force choice.
      // For UX speed, maybe default 'new'? Let's start empty.
      setResolutions({});
      setCurrentIndex(0);
    }
  }, [open]);

  const currentConflict = conflicts[currentIndex];
  const total = conflicts.length;
  const resolvedCount = Object.keys(resolutions).length;

  const handleChoice = (choice) => {
    setResolutions(prev => ({ ...prev, [currentIndex]: choice }));
    if (currentIndex < total - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleFinish = () => {
    // Check if all resolved
    if (resolvedCount < total) {
      if (!confirm(`You have resolved ${resolvedCount} out of ${total} conflicts. Unresolved conflicts will keep the OLD record. Continue?`)) {
        return;
      }
    }
    // Build resolution map: which indices to use NEW for.
    // Resolution 'new' means use new record. Resolution 'old' or undefined means use old.
    const useNewIndices = Object.keys(resolutions).filter(k => resolutions[k] === 'new').map(Number);
    onResolve(useNewIndices);
  };

  if (!currentConflict) return null;

  // Helper to compare fields
  const allKeys = Array.from(new Set([...Object.keys(currentConflict.existing), ...Object.keys(currentConflict.new)]))
    .filter(k => !['_id', '__v', 'fileName', 'uploadDate', 'createdAt', 'updatedAt'].includes(k));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { color: 'white' } }}>
      <DialogTitle>
        Resolve Duplicate Requests ({currentIndex + 1} / {total})
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, justifyContent: 'center' }}>
          <Button variant="outlined" size="small" onClick={() => {
            const newRes = {};
            conflicts.forEach((_, i) => newRes[i] = 'old');
            setResolutions(newRes);
            onResolve([]); // All old means no new indices
          }}>Keep All Old</Button>
          <Button variant="outlined" size="small" onClick={() => {
            const newRes = {};
            conflicts.forEach((_, i) => newRes[i] = 'new');
            setResolutions(newRes);
            onResolve(conflicts.map((_, i) => i)); // All new indices
          }}>Use All New</Button>
        </Box>

        <Grid container spacing={2}>
          {/* OLD Record */}
          <Grid item xs={6}>
            <Paper sx={{ p: 2, bgcolor: '#f3f4f6', border: resolutions[currentIndex] === 'old' ? '2px solid #2196f3' : '1px solid #e5e7eb' }}>
              <Typography variant="h6" color="primary" gutterBottom>Existing Record</Typography>
              {allKeys.map(key => (
                <Box key={key} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', bgcolor: currentConflict.existing[key] !== currentConflict.new[key] ? '#e5e7eb' : 'transparent', p: 0.5 }}>
                  <Typography variant="caption" color="#aaa">{key}:</Typography>
                  <Typography variant="body2">{String(currentConflict.existing[key] || "")}</Typography>
                </Box>
              ))}
              <Button
                variant={resolutions[currentIndex] === 'old' ? 'contained' : 'outlined'}
                fullWidth
                onClick={() => handleChoice('old')}
                sx={{ mt: 2 }}
              >
                Keep This
              </Button>
            </Paper>
          </Grid>

          {/* NEW Record */}
          <Grid item xs={6}>
            <Paper sx={{ p: 2, bgcolor: '#f3f4f6', border: resolutions[currentIndex] === 'new' ? '2px solid #4caf50' : '1px solid #e5e7eb' }}>
              <Typography variant="h6" color="success.main" gutterBottom>New Record</Typography>
              {allKeys.map(key => (
                <Box key={key} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', bgcolor: currentConflict.existing[key] !== currentConflict.new[key] ? '#e5e7eb' : 'transparent', p: 0.5 }}>
                  <Typography variant="caption" color="#aaa">{key}:</Typography>
                  <Typography variant="body2">{String(currentConflict.new[key] || "")}</Typography>
                </Box>
              ))}
              <Button
                variant={resolutions[currentIndex] === 'new' ? 'contained' : 'outlined'}
                fullWidth
                color="success"
                onClick={() => handleChoice('new')}
                sx={{ mt: 2 }}
              >
                Replace with This
              </Button>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button disabled={currentIndex === 0} onClick={() => setCurrentIndex(prev => prev - 1)}>Previous</Button>
          <Typography>{resolvedCount} resolved</Typography>
          <Button disabled={currentIndex === total - 1} onClick={() => setCurrentIndex(prev => prev + 1)}>Next</Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#aaa' }}>Cancel Upload</Button>
        <Button onClick={handleFinish} variant="contained" disabled={resolvedCount === 0 && !confirm}>Finish Upload</Button>
      </DialogActions>
    </Dialog>
  );
};

// --- Delete Batch Confirmation Dialog ---
const DeleteBatchDialog = ({ open, onClose, onConfirm, batchName }) => {
  const [confirmName, setConfirmName] = useState("");

  const handleConfirm = () => {
    if (confirmName === batchName) {
      onConfirm();
      setConfirmName("");
    } else {
      toast.error("Batch name does not match");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { color: 'white' } }}>
      <DialogTitle sx={{ color: '#f44336' }}>⚠ Delete Batch: {batchName}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2, color: '#ccc' }}>
          This will permanently delete all {batchName} records. This action cannot be undone.
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, color: '#ffffff' }}>
          Type <strong>{batchName}</strong> to confirm:
        </Typography>
        <TextField
          autoFocus
          fullWidth
          variant="outlined"
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          sx={{ input: { color: 'white' }, fieldset: { borderColor: '#3d3d3d' } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#aaa' }}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={confirmName !== batchName}
        >
          Delete Permanently
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// --- Sub-component: New Upload ---
const UploadTab = ({ token, teamNames, existingBatches, onUploadSuccess, onDirtyChange }) => {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Notify parent of dirty state
  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(rows.length > 0);
    }
  }, [rows, onDirtyChange]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseExcel(selectedFile);
    }
  };

  const parseExcel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const binaryStr = e.target.result;
      const workbook = XLSX.read(binaryStr, { type: 'binary', cellDates: true, dateNF: 'yyyy-mm-dd' });
      let allRawData = [];
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false, dateNF: 'yyyy-mm-dd' });
        allRawData = [...allRawData, ...sheetData];
      });

      if (allRawData.length > 0) {
        const firstRow = allRawData[0];
        const dynamicColumns = Object.keys(firstRow).map((key) => {
          const isTeamCol = key.trim().toLowerCase() === "team name";
          const isResponsibleCol = key.trim().toLowerCase() === "responsible";
          const responsibleOptions = ['Nokia/Quality', 'Nokia/FMC', 'Other'];

          return {
            field: key,
            headerName: key,
            flex: 1,
            editable: true,
            minWidth: 150,
            type: (isTeamCol || isResponsibleCol) ? 'singleSelect' : 'string',
            valueOptions: isTeamCol ? teamNames : (isResponsibleCol ? responsibleOptions : undefined),
            renderEditCell: isTeamCol ? (params) => <TeamEditInputCell {...params} options={teamNames} /> :
              (isResponsibleCol ? (params) => <ResponsibleEditInputCell {...params} options={responsibleOptions} /> : undefined),
          };
        });

        // Add Delete Action
        dynamicColumns.push({
          field: 'actions', type: 'actions', headerName: 'Actions', width: 100,
          getActions: (params) => [
            <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={() => handleDeleteRow(params.id)} style={{ color: '#f44336' }} />,
          ]
        });

        setColumns(dynamicColumns);
        setRows(allRawData.map((row, index) => ({ id: index, ...row })));
        toast.success(`Loaded ${allRawData.length} rows.`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddColumn = (name) => {
    const isTeamCol = name.trim().toLowerCase() === "team name";
    const isResponsibleCol = name.trim().toLowerCase() === "responsible";
    const responsibleOptions = ['Nokia/Quality', 'Nokia/FMC', 'Other'];

    const newCol = {
      field: name,
      headerName: name,
      flex: 1,
      editable: true,
      minWidth: 150,
      type: (isTeamCol || isResponsibleCol) ? 'singleSelect' : 'string',
      valueOptions: isTeamCol ? teamNames : (isResponsibleCol ? responsibleOptions : undefined),
      renderEditCell: isTeamCol ? (params) => <TeamEditInputCell {...params} options={teamNames} /> :
        (isResponsibleCol ? (params) => <ResponsibleEditInputCell {...params} options={responsibleOptions} /> : undefined),
    };
    // Insert before actions
    const newCols = [...columns];
    newCols.splice(newCols.length - 1, 0, newCol);
    setColumns(newCols);

    // Update rows to include key (optional, but good for structure)
    setRows(prev => prev.map(r => ({ ...r, [name]: "" })));
    setIsDialogOpen(false);
    toast.success(`Column "${name}" added`);
  };

  const handleDeleteRow = (id) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleDeleteColumn = (field) => {
    if (field === 'actions') return;
    setColumns(prev => prev.filter(c => c.field !== field));
    toast.success(`Column ${field} removed from view`);
  };

  const handleProcessRowUpdate = (newRow) => {
    setRows(prev => prev.map(r => (r.id === newRow.id ? newRow : r)));
    return newRow;
  };

  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [pendingUploadData, setPendingUploadData] = useState(null); // Store data while resolving conflicts

  const handleUpload = async () => {
    if (!file || rows.length === 0) return toast.error("No data to upload");
    setLoading(true);

    const payloadRaw = rows.map(({ id, actions, ...rest }) => rest);

    // Check if filename exists
    const fileExists = existingBatches.some(b => b._id === file.name);

    if (fileExists) {
      // Check for duplicates
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/detractors/check-duplicates`,
          { fileName: file.name, newRecords: payloadRaw },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.status) {
          if (res.data.conflictCount > 0) {
            setConflicts(res.data.conflicts);
            setPendingUploadData({ payload: payloadRaw, conflicts: res.data.conflicts });
            setConflictOpen(true);
            setLoading(false);
            return; // Wait for resolution
          }
        }
      } catch (error) {
        console.error("Check duplicates failed", error);
        toast.error("Failed to check for duplicates");
        setLoading(false);
        return;
      }
    }

    // No conflicts or clean upload
    await executeUpload(payloadRaw, []);
  };

  const executeUpload = async (data, deleteIds) => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/detractors/upload`,
        { data: data, fileName: file.name, deleteIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.status) {
        toast.success(res.data.message);
        setRows([]); setFile(null); setColumns([]);
        if (onUploadSuccess) onUploadSuccess();
      }
    } catch (error) {
      toast.error("Upload failed");
      console.error(error);
    } finally {
      setLoading(false);
      setConflictOpen(false);
      setConflicts([]);
      setPendingUploadData(null);
    }
  };

  const handleConflictResolve = (useNewIndices) => {
    if (!pendingUploadData) return;

    // Helper to find key in object
    const findKey = (obj) => Object.keys(obj).find(k => /request.*no/i.test(k));

    const uniqueRecords = pendingUploadData.payload.filter(row => {
      // Is this row in conflicts?
      const rowKey = findKey(row);
      const rowReq = rowKey ? String(row[rowKey] || "").trim() : "";

      // Check against conflicts
      return !pendingUploadData.conflicts.some(c => {
        const cKey = findKey(c.new);
        const cReq = cKey ? String(c.new[cKey] || "").trim() : "";
        return cReq === rowReq;
      });
    });

    let recordsToInsert = [...uniqueRecords];
    const deleteIds = [];

    pendingUploadData.conflicts.forEach((conflict, index) => {
      if (useNewIndices.includes(index)) {
        // Conflict resolved to NEW
        recordsToInsert.push(conflict.new);
        deleteIds.push(conflict.existing._id);
      }
    });

    // If no new records to insert (all kept old), skip upload
    if (recordsToInsert.length === 0) {
      toast.info("All conflicts resolved to keep existing records. No changes made.");
      setConflictOpen(false);
      setConflicts([]);
      setPendingUploadData(null);
      setLoading(false);
      return;
    }

    executeUpload(recordsToInsert, deleteIds);
  };

  return (
    <Box>
      <AddColumnDialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} onConfirm={handleAddColumn} />
      <ConflictResolutionDialog
        open={conflictOpen}
        onClose={() => { setConflictOpen(false); setLoading(false); }}
        conflicts={conflicts}
        onResolve={handleConflictResolve}
      />

      <Paper sx={{ p: 3, mb: 3, color: 'white', display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button component="label" variant="contained" startIcon={<CloudUploadIcon />}>
          Select Excel
          <input type="file" hidden accept=".xlsx, .xls" onChange={handleFileChange} />
        </Button>
        <Typography sx={{ color: '#aaa' }}>{file ? file.name : "No file selected"}</Typography>
        {rows.length > 0 && (
          <>
            <Button
              variant="outlined"
              color="warning"
              onClick={() => { setRows([]); setFile(null); setColumns([]); }}
              sx={{ ml: 'auto', mr: 2 }}
            >
              Reset
            </Button>
            <Button variant="contained" color="success" onClick={handleUpload} disabled={loading}>
              {loading ? "Uploading..." : "Confirm Upload"}
            </Button>
          </>
        )}
      </Paper>
      {rows.length > 0 && (
        <Paper sx={{ height: 600, width: '100%', }}>
          <DataGrid
            rows={rows}
            columns={columns}
            processRowUpdate={handleProcessRowUpdate}
            slots={{ toolbar: CustomToolbar, columnMenu: CustomColumnMenu }}
            slotProps={{
              toolbar: { onAddColumn: () => setIsDialogOpen(true) },
              columnMenu: { onDeleteColumn: handleDeleteColumn }
            }}
            disableColumnReorder={false}
            sx={{
              color: 'white',
              borderColor: '#3d3d3d',
              '& .MuiDataGrid-cell': { borderColor: '#3d3d3d', color: '#ddd' },
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#f3f4f6', color: '#ffffff', borderBottom: '1px solid #555', fontWeight: 'bold' },
              '& .MuiDataGrid-columnHeader': { bgcolor: '#f3f4f6', color: '#ffffff' },
              '& .MuiDataGrid-columnHeaderTitle': { color: '#ffffff' },
              '& .MuiDataGrid-menuIcon': { color: '#ffffff' },
              '& .MuiDataGrid-footerContainer': { borderColor: '#3d3d3d', color: '#ffffff' },
              '& .MuiTablePagination-root': { color: '#ffffff' },
              '& .MuiButtonBase-root': { color: '#ffffff' },
            }}
          />
        </Paper>
      )}
    </Box>
  );
};

// --- Sub-component: History & Management ---
const HistoryTab = ({ token, teamNames, batches, refreshHistory }) => {
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchData, setBatchData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteBatchOpen, setDeleteBatchOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);

  // Effect removed, using passed batches prop

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/detractors/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.status) setBatches(res.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadBatch = async (fileName) => {
    setLoading(true);
    setSelectedBatch(fileName);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/detractors/batch/${fileName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.status) {
        const data = res.data.data;
        setBatchData(data.map(d => ({ ...d, id: d._id })));

        if (data.length > 0) {
          const exclude = ['_id', '__v', 'createdAt', 'updatedAt', 'fileName'];
          const first = data[0];
          const cols = Object.keys(first).filter(k => !exclude.includes(k)).map(k => {
            const isTeamCol = k.trim().toLowerCase() === "team name";
            const isResponsibleCol = k.trim().toLowerCase() === "responsible";
            const responsibleOptions = ['Nokia/Quality', 'Nokia/FMC', 'Other'];

            return {
              field: k,
              headerName: k,
              flex: 1,
              editable: true,
              minWidth: 120,
              type: (isTeamCol || isResponsibleCol) ? 'singleSelect' : 'string',
              valueOptions: isTeamCol ? teamNames : (isResponsibleCol ? responsibleOptions : undefined),
              renderEditCell: isTeamCol ? (params) => <TeamEditInputCell {...params} options={teamNames} /> :
                (isResponsibleCol ? (params) => <ResponsibleEditInputCell {...params} options={responsibleOptions} /> : undefined),
            };
          });

          cols.push({
            field: 'actions', type: 'actions', headerName: 'Actions', width: 100,
            getActions: (params) => [
              <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={() => handleDelete(params.id)} style={{ color: '#f44336' }} />,
            ]
          });
          setColumns(cols);
        }
      }
    } catch (error) {
      toast.error("Failed to load batch data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = (name) => {
    const isTeamCol = name.trim().toLowerCase() === "team name";
    const isResponsibleCol = name.trim().toLowerCase() === "responsible";
    const responsibleOptions = ['Nokia/Quality', 'Nokia/FMC', 'Other'];

    const newCol = {
      field: name,
      headerName: name,
      flex: 1,
      editable: true,
      minWidth: 120,
      type: (isTeamCol || isResponsibleCol) ? 'singleSelect' : 'string',
      valueOptions: isTeamCol ? teamNames : (isResponsibleCol ? responsibleOptions : undefined),
      renderEditCell: isTeamCol ? (params) => <TeamEditInputCell {...params} options={teamNames} /> :
        (isResponsibleCol ? (params) => <ResponsibleEditInputCell {...params} options={responsibleOptions} /> : undefined),
    };
    // Insert before actions
    const newCols = [...columns];
    newCols.splice(newCols.length - 1, 0, newCol);
    setColumns(newCols);
    setIsDialogOpen(false);
    toast.success(`Column "${name}" added. Edit a cell to save it to database.`);
  };

  const handleProcessRowUpdate = async (newRow, oldRow) => {
    try {
      // eslint-disable-next-line no-unused-vars
      const { id, _id, fileName, createdAt, updatedAt, __v, actions, ...updateData } = newRow;
      await axios.put(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/detractors/${id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Updated successfully");
      return newRow;
    } catch (error) {
      toast.error("Update failed");
      return oldRow;
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this row?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/detractors/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updatedData = batchData.filter(row => row.id !== id);
      setBatchData(updatedData);
      toast.success("Deleted successfully");

      // If no rows left in this batch, it means the batch is now empty
      // Refresh history and clear selection
      if (updatedData.length === 0) {
        toast.info("Batch is now empty");
        setSelectedBatch(null);
        setBatchData([]);
        setColumns([]);
        refreshHistory(); // Refresh the batch list
      }
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const handleDeleteColumn = async (field) => {
    if (field === 'actions') return;
    if (!confirm(`Are you sure you want to delete column "${field}" from ALL records in this batch?`)) return;

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/detractors/batch/${encodeURIComponent(selectedBatch)}/column/${field}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Column ${field} deleted`);
      // Refresh data
      loadBatch(selectedBatch);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete column");
    }
  };

  const handleDeleteBatch = async () => {
    if (!batchToDelete) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/detractors/batch/${encodeURIComponent(batchToDelete)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Batch ${batchToDelete} deleted`);
      setDeleteBatchOpen(false);
      setBatchToDelete(null);
      // setBatches removed (lifted state)
      refreshHistory(); // Refresh parent
      if (selectedBatch === batchToDelete) {
        setSelectedBatch(null);
        setBatchData([]);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete batch");
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, height: '100%' }}>
      <AddColumnDialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} onConfirm={handleAddColumn} />

      <DeleteBatchDialog
        open={deleteBatchOpen}
        onClose={() => setDeleteBatchOpen(false)}
        onConfirm={handleDeleteBatch}
        batchName={batchToDelete}
      />

      {/* Sidebar List */}
      <Paper sx={{ width: 250, p: 2, overflowY: 'auto', maxHeight: '80vh' }}>
        <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Upload History</Typography>
        {batches.map((batch) => (
          <Card
            key={batch._id}
            sx={{
              mb: 1,
              bgcolor: selectedBatch === batch._id ? '#7b68ee' : '#f3f4f6',
              color: 'white',
              position: 'relative',
              '&:hover': { bgcolor: '#7b68ee' }
            }}
          >
            <CardContent sx={{ p: '10px !important', cursor: 'pointer' }} onClick={() => loadBatch(batch._id)}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', width: '85%' }}>{batch._id}</Typography>
              <Typography variant="caption" sx={{ color: '#ccc' }}>
                {new Date(batch.uploadDate).toLocaleDateString()} • {batch.count} records
              </Typography>
            </CardContent>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setBatchToDelete(batch._id);
                setDeleteBatchOpen(true);
              }}
              sx={{ position: 'absolute', top: 5, right: 5, color: '#aaa', '&:hover': { color: '#f44336' } }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Card>
        ))}
      </Paper>

      {/* Main Editor Area */}
      <Paper sx={{ flex: 1, p: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedBatch ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ color: 'white' }}>Editing: {selectedBatch}</Typography>
              <Box>
                <Button startIcon={<RefreshIcon />} onClick={() => loadBatch(selectedBatch)} sx={{ mr: 1 }}>Refresh</Button>
              </Box>
            </Box>
            <DataGrid
              rows={batchData}
              columns={columns}
              processRowUpdate={handleProcessRowUpdate}
              onProcessRowUpdateError={(error) => console.error(error)}
              slots={{ toolbar: CustomToolbar, columnMenu: CustomColumnMenu }}
              slotProps={{
                toolbar: { onAddColumn: () => setIsDialogOpen(true) },
                columnMenu: { onDeleteColumn: handleDeleteColumn }
              }}
              disableColumnReorder={false}
              loading={loading}
              sx={{
                color: 'white',
                borderColor: '#3d3d3d',
                '& .MuiDataGrid-cell': { borderColor: '#3d3d3d', color: '#ddd' },
                '& .MuiDataGrid-columnHeaders': { bgcolor: '#f3f4f6', color: '#ffffff', borderBottom: '1px solid #555', fontWeight: 'bold' },
                '& .MuiDataGrid-columnHeader': { bgcolor: '#f3f4f6', color: '#ffffff' },
                '& .MuiDataGrid-columnHeaderTitle': { color: '#ffffff' },
                '& .MuiDataGrid-menuIcon': { color: '#ffffff' },
                '& .MuiDataGrid-footerContainer': { borderColor: '#3d3d3d', color: '#ffffff' },
                '& .MuiTablePagination-root': { color: '#ffffff' },
                '& .MuiButtonBase-root': { color: '#ffffff' },
              }}
            />
          </>
        ) : (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
            <Typography>Select a file from the left to manage data.</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default DataManagement;
