import DataMenu from '../components/dataio/DataMenu';
import { tok } from "../theme/tokens";
import { useEffect, useState, useRef, useCallback } from 'react';
import { Box, Typography, Button, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Stack, Tooltip } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, DragIndicator as DragIcon, Update as UpdateIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import InputBase from '@mui/material/InputBase';
import SearchIcon from '@mui/icons-material/Search';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import Sheet from '../components/ui/Sheet';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import PageLoader from '../components/ui/PageLoader';
import api from '../api/api';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Drag and Drop type
const ItemTypes = {
  OPTION: 'option',
};

const READ_ONLY_CATEGORIES = ['FIELD_TEAMS', 'SUPERVISORS'];
// Values here are stored on tasks and snags, so they can be renamed but not deleted.
const PROTECTED_CATEGORIES = ['ISSUE_TAXONOMY', 'ISSUE_TAXONOMY_SUB'];

// Organized Groups
const FORM_GROUPS = [
  {
    title: "0. Issue taxonomy",
    categories: {
      ISSUE_TAXONOMY: "Issue categories",
      ISSUE_TAXONOMY_SUB: "Issue sub-categories",
    }
  },
  {
    title: "1. Core Task Flow",
    categories: {
      TASK_CATEGORIES: "Task Categories",
      PRIORITY: "Task Priorities",
      TEAM_COMPANY: "Subcon Providers",
      VALIDATION_STATUS: "Field Validation Status",
      FIELD_TEAMS: "Field Teams / Techs (Dynamic)",
      SUPERVISORS: "Conducting Supervisors (Dynamic)",
    }
  },
  {
    title: "2. Assessment & Locations",
    categories: {
      SESSION_TYPE: "Session Classifications",
      EVALUATION_SCORE: "Performance Scores",
      GOVERNORATES: "Governorates / Locations",
      RESPONSIBILITY: "Action Responsibilities",
    }
  },
  {
    title: "3. OJO Snags - Engagement Hub",
    categories: {
      CUSTOMER_TYPE: "Client Classifications",
      CONTACT_METHOD: "Customer Contact Channels",
      REPORTERS: "Incident Reporters",
      CIN_SUPERVISORS: "OJO Snags resolution supervisors",
      ISSUE_FROM_MAIN: "Incident Source (Main)",
      ISSUE_FROM_SUB: "Incident Source (Sub)",
      CALLERS: "Customer Caller Names",
    }
  },
  {
    title: "4. OJO Snags - Technical Analysis",
    categories: {
      ISSUE_CATEGORY: "Issue Category (L1)",
      ISSUE_SUB_CATEGORY: "Issue Sub-Category (L2)",
    }
  },
  {
    title: "5. Technical Hardware Specs",
    categories: {
      ONT_TYPE: "ONT Hardware Models",
      EXTENDER_TYPE: "Extender Variants",
    }
  },
  {
    title: "6. Root Cause Deep Dive",
    categories: {
      REASON: "Analysis Reason (L1)",
      REASON_SUB: "Sub-Reason Analysis (L2)",
      ROOT_CAUSE: "Final Root Cause (L3)",
    }
  },
  {
    title: "7. GAIA Master Tracking",
    categories: {
      TRANSACTION_TYPE: "GAIA: Transaction Types",
      TRANSACTION_STATE: "GAIA: Outcome States",
      UNF_REASON_CODE: "GAIA: Unfulfillment Reasons",
      SYSTEM_FLOW_STATUS: "GAIA: Flow Statuses",
    }
  }
];

// Flatten for easy lookup
const CATEGORY_MAP = FORM_GROUPS.reduce((acc, group) => ({ ...acc, ...group.categories }), {});

// Draggable Row Component
const DraggableRow = ({ option, index, moveRow, handleOpenDialog, handleDelete, colors, activeTab }) => {
  const ref = useRef(null);
  const [{ handlerId }, drop] = useDrop({
    accept: ItemTypes.OPTION,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveRow(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.OPTION,
    item: () => ({ id: option._id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <TableRow
      ref={ref}
      data-handler-id={handlerId}
      sx={{
        bgcolor: isDragging ? 'var(--accent-subtle)' : 'inherit',
        '&:hover': { bgcolor: 'var(--surface-hover)' },
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      <TableCell sx={{ color: colors.textSecondary }}>
        <DragIcon sx={{ cursor: 'grab', fontSize: 18, color: 'var(--text-muted)' }} />
      </TableCell>
      <TableCell sx={{ color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>{option.value}</TableCell>
      <TableCell sx={{ color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>{option.label}</TableCell>
      {activeTab === 'REASON_SUB' && (
        <TableCell sx={{ color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>{option.parentValue}</TableCell>
      )}
      {activeTab === 'ROOT_CAUSE' && (
        <TableCell sx={{ color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>{option.parentValue}</TableCell>
      )}
      {activeTab === 'REASON' && (
        <TableCell sx={{ color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>{option.parentValue}</TableCell>
      )}
      {(activeTab === 'ISSUE_SUB_CATEGORY' || activeTab === 'ISSUE_TAXONOMY_SUB') && (
        <TableCell sx={{ color: colors.textPrimary, borderBottom: `1px solid ${colors.border}` }}>{option.parentValue}</TableCell>
      )}
      <TableCell align="right" sx={{ borderBottom: `1px solid ${colors.border}` }}>
        {!READ_ONLY_CATEGORIES.includes(activeTab) ? (
          <>
            <Tooltip title="Edit">
              <IconButton size="small" aria-label="Edit option" onClick={() => handleOpenDialog(option)} sx={{ color: 'var(--text-secondary)' }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {!PROTECTED_CATEGORIES.includes(activeTab) && <Tooltip title="Delete">
              <IconButton size="small" aria-label="Delete option" onClick={() => handleDelete(option._id)} sx={{ color: 'var(--danger)' }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>}
          </>
        ) : (
          <Typography variant="caption" sx={{ color: colors.textSecondary, fontStyle: 'italic' }}>
            System Managed
          </Typography>
        )}
      </TableCell>
    </TableRow>
  );
};

// Empty placeholder for safety since we moved it up



const DropdownManagement = () => {
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState({});
  const [activeTab, setActiveTab] = useState('PRIORITY');
  const [catSearch, setCatSearch] = useState('');
  const [rowSearch, setRowSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [formData, setFormData] = useState({ value: '', label: '', order: 0, parentCategory: null, parentValue: null });

  const colors = {
    background: 'transparent',
    surface: tok('--surface'),
    border: tok('--border'),
    primary: tok('--accent'),
    textPrimary: tok('--text'),
    textSecondary: tok('--text-secondary'),
    error: tok('--danger'),
  };

  const fetchOptions = async () => {
    setLoading(true);
    try {
      await api.post('/dropdown-options/seed'); // Ensure defaults exist
      const response = await api.get('/dropdown-options/all');
      setOptions(response.data);
    } catch (error) {
      console.error('Failed to fetch options:', error);
      toast.error('Failed to load dropdown options');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);


  // When clicking a tab in an accordion, make sure that accordion is open (it is by definition)
  // and set the active tab.

  const handleOpenDialog = (option = null) => {
    if (option) {
      setEditingOption(option);
      setFormData({ value: option.value, label: option.label, order: option.order, parentCategory: option.parentCategory, parentValue: option.parentValue });
    } else {
      setEditingOption(null);
      setFormData({
        value: '',
        label: '',
        parentCategory: activeTab === 'REASON_SUB' ? 'REASON' : activeTab === 'ROOT_CAUSE' ? 'REASON_SUB' : activeTab === 'REASON' ? 'RESPONSIBILITY' : activeTab === 'ISSUE_SUB_CATEGORY' ? 'ISSUE_CATEGORY' : activeTab === 'ISSUE_TAXONOMY_SUB' ? 'ISSUE_TAXONOMY' : null,
        parentValue: null
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingOption(null);
    setFormData({ value: '', label: '', order: 0, parentCategory: null, parentValue: null });
  };

  const handleSubmit = async () => {
    try {
      if (editingOption) {
        await api.patch(`/dropdown-options/update/${editingOption._id}`, formData);
        toast.success('Option updated successfully');
      } else {
        await api.post('/dropdown-options/add', { ...formData, category: activeTab });
        toast.success('Option added successfully');
      }
      handleCloseDialog();
      fetchOptions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save option');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/dropdown-options/delete/${id}`);
      toast.success('Option deleted successfully');
      fetchOptions();
    } catch (error) {
      toast.error('Failed to delete option');
    }
  };

  const [currentOptions, setCurrentOptions] = useState([]);

  useEffect(() => {
    if (options[activeTab]) {
      const sorted = [...options[activeTab]].sort((a, b) => (a.order || 0) - (b.order || 0));
      setCurrentOptions(sorted);
    } else {
      setCurrentOptions([]);
    }
  }, [options, activeTab]);

  const moveRow = useCallback((dragIndex, hoverIndex) => {
    setCurrentOptions((prevOptions) => {
      const updatedOptions = [...prevOptions];
      const [movedRow] = updatedOptions.splice(dragIndex, 1);
      updatedOptions.splice(hoverIndex, 0, movedRow);
      return updatedOptions;
    });
  }, []);

  const saveOrder = async () => {
    try {
      const orderPayload = currentOptions.map((opt, index) => ({ _id: opt._id, order: index + 1 }));
      await api.put('/dropdown-options/reorder', { options: orderPayload });
      toast.success('Order saved successfully');
    } catch (error) {
      console.error(error)
      toast.error('Failed to save order');
    }
  };

  const PARENTS = {
    REASON_SUB: { category: 'REASON', label: 'Parent reason' },
    ROOT_CAUSE: { category: 'REASON_SUB', label: 'Parent sub-reason' },
    REASON: { category: 'RESPONSIBILITY', label: 'Parent responsibility' },
    ISSUE_SUB_CATEGORY: { category: 'ISSUE_CATEGORY', label: 'Parent category' },
    ISSUE_TAXONOMY_SUB: { category: 'ISSUE_TAXONOMY', label: 'Parent category' },
  };
  const parent = PARENTS[activeTab];
  const readOnly = READ_ONLY_CATEGORIES.includes(activeTab);
  const filteredOptions = currentOptions.filter((o) => {
    const q = rowSearch.trim().toLowerCase();
    return !q || [o.value, o.label, o.parentValue].filter(Boolean).join(' ').toLowerCase().includes(q);
  });
  const groupMatches = (group) => {
    const q = catSearch.trim().toLowerCase();
    return Object.entries(group.categories).filter(([k, l]) => !q || l.toLowerCase().includes(q) || k.toLowerCase().includes(q));
  };

  if (loading && Object.keys(options).length === 0) {
    return <PageLoader />;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Box>
        <PageHeader
          title="Dropdown Management"
          description="Lists that power the selects across tasks, snags, assessments and reports. Changes apply app-wide."
          actions={<DataMenu entity="dropdownOptions" viewRows={currentOptions} filename={`dropdown-${activeTab.toLowerCase()}`} onImported={fetchOptions} />}
        />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px minmax(0, 1fr)' }, gap: { xs: 2, md: 3 }, alignItems: 'start' }}>
          {/* Category list */}
          <Box sx={{ position: { md: 'sticky' }, top: { md: 72 }, border: '1px solid var(--border)', borderRadius: '10px', backgroundColor: 'var(--surface)', boxShadow: 'var(--shadow-xs)', overflow: 'hidden' }}>
            <Box sx={{ p: 1, borderBottom: '1px solid var(--border)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 30, px: 1, borderRadius: '6px', border: '1px solid var(--border)' }}>
                <SearchIcon sx={{ fontSize: 16, color: 'var(--text-muted)' }} />
                <InputBase value={catSearch} onChange={(e) => setCatSearch(e.target.value)} placeholder="Find a list…" inputProps={{ 'aria-label': 'Find a list' }} sx={{ fontSize: 13, flex: 1 }} />
              </Box>
            </Box>
            <Box component="nav" aria-label="Dropdown lists" sx={{ maxHeight: { md: 'calc(100vh - 200px)' }, overflowY: 'auto', p: 0.75 }}>
              {FORM_GROUPS.map((group) => {
                const items = groupMatches(group);
                if (!items.length) return null;
                return (
                  <Box key={group.title} sx={{ mb: 1 }}>
                    <Typography sx={{ px: 1, pt: 0.75, pb: 0.25, fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>{group.title.replace(/^\d+\.\s*/, '')}</Typography>
                    {items.map(([key, label]) => {
                      const active = key === activeTab;
                      return (
                        <Box key={key} component="button" type="button" onClick={() => { setActiveTab(key); setRowSearch(''); }} aria-current={active ? 'page' : undefined}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', height: 30, px: 1, border: 0, borderRadius: '5px', cursor: 'pointer', font: 'inherit', fontSize: 13, textAlign: 'left',
                            color: active ? 'var(--text)' : 'var(--text-secondary)', fontWeight: active ? 600 : 400,
                            backgroundColor: active ? 'var(--surface-active)' : 'transparent', '&:hover': { backgroundColor: active ? 'var(--surface-active)' : 'var(--surface-hover)' } }}>
                          <Box component="span" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</Box>
                          <Box component="span" sx={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{(options[key] || []).length}</Box>
                        </Box>
                      );
                    })}
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Selected list */}
          <SectionCard
            title={CATEGORY_MAP[activeTab] || activeTab}
            description={`${currentOptions.length} option${currentOptions.length === 1 ? '' : 's'}${parent ? ` · each linked to a ${parent.label.replace('Parent ', '')}` : ''}${readOnly ? ' · managed automatically' : ' · drag rows to reorder'}${PROTECTED_CATEGORIES.includes(activeTab) ? ' · used on records, so values can be renamed but not deleted' : ''}`}
            actions={!readOnly && (
              <>
                <Button variant="outlined" startIcon={<UpdateIcon sx={{ fontSize: 16 }} />} onClick={saveOrder}>Save order</Button>
                <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 17 }} />} onClick={() => handleOpenDialog()}>Add option</Button>
              </>
            )}
            padding={0}
            bodySx={{ p: 0 }}
          >
            {readOnly && (
              <Box sx={{ m: 2, p: 1.5, borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                This list is filled automatically from {activeTab === 'FIELD_TEAMS' ? 'Field Teams' : 'Users & roles'}. Change it there.
              </Box>
            )}
            <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid var(--border)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 30, px: 1, width: { xs: '100%', sm: 280 }, borderRadius: '6px', border: '1px solid var(--border)' }}>
                <SearchIcon sx={{ fontSize: 16, color: 'var(--text-muted)' }} />
                <InputBase value={rowSearch} onChange={(e) => setRowSearch(e.target.value)} placeholder="Search options…" inputProps={{ 'aria-label': 'Search options' }} sx={{ fontSize: 13, flex: 1 }} />
              </Box>
            </Box>
            <TableContainer sx={{ maxHeight: '62vh', border: 0, borderRadius: 0 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width="44" />
                    <TableCell>Value</TableCell>
                    <TableCell>Label</TableCell>
                    {parent && <TableCell>{parent.label}</TableCell>}
                    <TableCell align="right" width="110">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredOptions.map((option) => (
                    <DraggableRow
                      key={option._id}
                      index={currentOptions.indexOf(option)}
                      option={option}
                      moveRow={rowSearch ? () => {} : moveRow}
                      handleOpenDialog={handleOpenDialog}
                      handleDelete={(id) => setConfirmDelete(currentOptions.find((o) => o._id === id) || { _id: id })}
                      colors={colors}
                      activeTab={activeTab}
                    />
                  ))}
                  {filteredOptions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ border: 0 }}>
                        <EmptyState title={rowSearch ? 'No matching options' : 'This list is empty'} description={rowSearch ? 'Try a different search.' : readOnly ? '' : 'Add the first option for this list.'} minHeight={160} />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        </Box>

        {/* Option editor */}
        <Sheet
          open={openDialog}
          onClose={handleCloseDialog}
          width={440}
          title={editingOption ? 'Edit option' : 'Add option'}
          description={CATEGORY_MAP[activeTab] || activeTab}
          footer={
            <>
              <Button variant="outlined" onClick={handleCloseDialog}>Cancel</Button>
              <Button onClick={handleSubmit} variant="contained" disabled={!formData.value || !formData.label}>
                {editingOption ? 'Save changes' : 'Add option'}
              </Button>
            </>
          }
        >
          <Stack spacing={2}>
            {parent && (
              <TextField
                select
                fullWidth
                label={parent.label}
                value={formData.parentValue || ''}
                onChange={(e) => setFormData({ ...formData, parentValue: e.target.value })}
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
              >
                <option value="" disabled>Select…</option>
                {(options[parent.category] || []).map((opt) => (
                  <option key={opt._id} value={opt.value}>{opt.label}</option>
                ))}
              </TextField>
            )}
            <TextField fullWidth label="Value" helperText="Stored on records. Avoid changing it once in use." value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} />
            <TextField fullWidth label="Label" helperText="What people see in the select." value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} />
            <TextField fullWidth label="Display order" type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} />
          </Stack>
        </Sheet>

        <ConfirmDialog
          open={Boolean(confirmDelete)}
          danger
          title="Delete this option?"
          description={`"${confirmDelete?.label || confirmDelete?.value || ''}" will be removed from ${CATEGORY_MAP[activeTab] || 'this list'}. Records that already use it keep their stored value.`}
          confirmLabel="Delete"
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            const id = confirmDelete._id;
            setConfirmDelete(null);
            handleDelete(id);
          }}
        />
      </Box>
    </DndProvider>
  );
};

export default DropdownManagement;
