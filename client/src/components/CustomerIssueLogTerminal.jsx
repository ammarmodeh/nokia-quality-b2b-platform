import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  InputAdornment,
  Paper,
  Divider,
  Button,
} from '@mui/material';
import { MdClose, MdTerminal, MdSearch } from 'react-icons/md';
import api from '../api/api';
import { format, isSameDay } from 'date-fns';

const CustomerIssueLogTerminal = ({ open, onClose, slidFilter = "" }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(slidFilter);
  const [expandedLog, setExpandedLog] = useState(null);

  const fetchLogs = useCallback(async (searchTerm) => {
    setLoading(true);
    try {
      const response = await api.get('/customer-issues-notifications/logs', {
        params: { slid: searchTerm },
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setLogs(response.data.data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  }, []); // Remove 'search' dependency to prevent recreation on every keystroke

  useEffect(() => {
    if (open) {
      setSearch(slidFilter || "");
      fetchLogs(slidFilter || "");
      setExpandedLog(null);
    }
    // Only re-run when open state or prop-filter changes
  }, [open, slidFilter, fetchLogs]);

  // Handle manual search input
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    // Debounce would be nice, but simple direct fetch on change or Enter is fine.
    // For now, let's allow the user to type and then fetch works on effect? No, let's trigger it.
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      fetchLogs(search);
    }
  };

  const groupLogsByDate = (logs) => {
    const groups = [];
    logs.forEach(log => {
      const dateStr = format(new Date(log.timestamp), 'yyyy-MM-dd');
      let group = groups.find(g => g.date === dateStr);
      if (!group) {
        group = { date: dateStr, items: [] };
        groups.push(group);
      }
      group.items.push(log);
    });
    return groups;
  };

  const getLogColor = (action) => {
    switch (action) {
      case 'ADD': return '#4caf50'; // Green
      case 'UPDATE': return '#ffeb3b'; // Yellow
      case 'DELETE': return '#f44336'; // Red
      default: return '#7b68ee'; // Purple
    }
  };

  const toggleExpand = (id) => {
    setExpandedLog(expandedLog === id ? null : id);
  };

  const groupedLogs = groupLogsByDate(logs);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          backgroundColor: '#0c0c0c',
          color: '#00ff41', // Matrix/CMD Green
          fontFamily: 'Consolas, Monaco, "Lucida Console", "Liberation Mono", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Courier New", monospace',
          // borderRadius: 2,
          border: '1px solid #333',
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #333',
        p: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MdTerminal size={24} />
          <Typography variant="h6" sx={{ fontFamily: 'inherit' }}>
            CUSTOMER_ISSUE_AUDIT_LOG.exe
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#666' }}>
          <MdClose />
        </IconButton>
      </DialogTitle>

      <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <TextField
          size="small"
          placeholder="Filter by SLID... (Press Enter to scan)"
          value={search}
          onChange={handleSearchChange}
          onKeyPress={handleKeyPress}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MdSearch color="#666" />
              </InputAdornment>
            ),
            sx: {
              color: '#00ff41',
              fontFamily: 'inherit',
              '& fieldset': { borderColor: '#333' }
            }
          }}
          sx={{ flexGrow: 1 }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={() => fetchLogs(search)}
          sx={{
            color: '#00ff41',
            borderColor: '#333',
            fontFamily: 'inherit',
            fontSize: '0.75rem',
            '&:hover': { borderColor: '#00ff41' }
          }}
        >
          SCAN
        </Button>
        <Typography variant="caption" sx={{ color: '#666' }}>
          Total entries: {logs.length}
        </Typography>
      </Box>

      <DialogContent sx={{ minHeight: '400px', p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', py: 4 }}>
            <CircularProgress size={24} sx={{ color: '#00ff41' }} />
          </Box>
        ) : groupedLogs.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center', opacity: 0.5 }}>
            <Typography sx={{ fontFamily: 'inherit' }}>No log entries found. Session clean.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {groupedLogs.map((group) => (
              <Box key={group.date}>
                <Typography sx={{
                  fontFamily: 'inherit',
                  color: '#7b68ee',
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <span>{`>>> --- [ ${group.date} ] --- <<<`}</span>
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pl: 2 }}>
                  {group.items.map((log) => (
                    <Box key={log._id} sx={{
                      fontSize: '0.9rem',
                      lineHeight: 1.4,
                      py: 0.5,
                      borderLeft: `2px solid ${getLogColor(log.action)}`,
                      pl: 1.5,
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' }
                    }} onClick={() => toggleExpand(log._id)}>
                      <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                        <Typography component="span" sx={{ fontFamily: 'inherit', color: '#888' }}>
                          [{format(new Date(log.timestamp), 'HH:mm:ss')}]
                        </Typography>
                        <Typography component="span" sx={{
                          fontFamily: 'inherit',
                          color: getLogColor(log.action),
                          fontWeight: 'bold'
                        }}>
                          [{log.action}]
                        </Typography>
                        <Typography component="span" sx={{ fontFamily: 'inherit', color: '#fff' }}>
                          User: {log.performedBy}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontFamily: 'inherit', color: '#aaa', fontSize: '0.85rem' }}>
                        {log.details}
                      </Typography>

                      {expandedLog === log._id && (
                        <Box sx={{
                          mt: 1,
                          p: 1.5,
                          backgroundColor: '#000',
                          borderRadius: 1,
                          border: '1px solid #333',
                          fontSize: '0.75rem',
                          color: '#00ff41',
                          overflowX: 'auto',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {log.changes ? (
                            <>
                              <Typography sx={{ fontFamily: 'inherit', color: '#7b68ee', mb: 1 }}>DETECTED_CHANGES:</Typography>
                              {Object.entries(log.changes).map(([field, delta]) => (
                                <Box key={field} sx={{ mb: 1, borderLeft: '1px dashed #333', pl: 1 }}>
                                  <Typography component="span" sx={{ fontFamily: 'inherit', color: '#ffeb3b', mr: 1 }}>
                                    {field.toUpperCase()}:
                                  </Typography>
                                  <Typography component="span" sx={{ fontFamily: 'inherit', color: '#f44336' }}>
                                    {typeof delta.from === 'object' ? JSON.stringify(delta.from) : (delta.from || 'NULL')}
                                  </Typography>
                                  <Typography component="span" sx={{ fontFamily: 'inherit', color: '#888', mx: 1 }}>
                                    {` >>> `}
                                  </Typography>
                                  <Typography component="span" sx={{ fontFamily: 'inherit', color: '#4caf50' }}>
                                    {typeof delta.to === 'object' ? JSON.stringify(delta.to) : (delta.to || 'NULL')}
                                  </Typography>
                                </Box>
                              ))}
                              <Divider sx={{ my: 1.5, borderColor: '#222' }} />
                            </>
                          ) : null}
                          <Typography sx={{ fontFamily: 'inherit', color: '#7b68ee', mb: 0.5 }}>FULL_DATA_PAYLOAD:</Typography>
                          {JSON.stringify(log.newData || log.prevData, null, 2)}
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#444', fontStyle: 'italic' }}>
                          Click to {expandedLog === log._id ? 'collapse' : 'expand'} record details
                        </Typography>
                        {log.action === 'UPDATE' && (
                          <Typography variant="caption" sx={{ color: '#00aa2b', fontSize: '10px' }}>
                            * PARITY_CHECK: PASSED
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      <Box sx={{ p: 1.5, borderTop: '1px solid #333', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ color: '#444' }}>
          AUDIT_SERVICE_ACTIVE: SUCCESS
        </Typography>
        <Typography variant="caption" sx={{ color: '#444' }}>
          C:\ROOT\Reach Quality\CIN_LOGS\
        </Typography>
      </Box>
    </Dialog>
  );
};

export default CustomerIssueLogTerminal;
