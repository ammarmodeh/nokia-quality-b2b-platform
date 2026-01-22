import { createTheme } from '@mui/material/styles';

const auditTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9', // Light Blue for Dark Mode
      light: '#e3f2fd',
      dark: '#42a5f5',
      contrastText: '#000000',
    },
    secondary: {
      main: '#ce93d8', // Light Purple
    },
    background: {
      default: '#0a0a0a', // Deep Matte Black (No gradients)
      paper: '#141414',   // Slightly lighter for cards
      subtle: '#1e1e1e'   // For headers/sections
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
    action: {
      active: '#fff',
      hover: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(255, 255, 255, 0.16)',
      disabled: 'rgba(255, 255, 255, 0.3)',
      disabledBackground: 'rgba(255, 255, 255, 0.12)',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ffa726',
    },
    success: {
      main: '#66bb6a',
    },
    info: {
      main: '#29b6f6',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    htmlFontSize: 14,
    fontSize: 12, // Compact
    h3: { fontWeight: 700, fontSize: '1.5rem', letterSpacing: '0em', color: '#fff' },
    h4: { fontWeight: 700, fontSize: '1.25rem', letterSpacing: '0em', color: '#fff' },
    h5: { fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0em', color: '#fff' },
    h6: { fontWeight: 700, fontSize: '1rem', letterSpacing: '0em', color: '#fff' },
    subtitle1: { fontSize: '0.9rem', fontWeight: 600, color: '#b0b0b0' },
    subtitle2: { fontSize: '0.8rem', fontWeight: 600, color: '#b0b0b0' },
    body1: { fontSize: '0.9rem', color: '#e0e0e0' },
    body2: { fontSize: '0.8rem', color: '#b0b0b0' },
    button: { textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' },
    caption: { fontSize: '0.75rem', color: '#888' },
  },
  shape: {
    borderRadius: 0, // STRICT SQUARE EDGES
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0a0a0a',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#0a0a0a',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#333',
            border: '1px solid #0a0a0a',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#141414',
          borderRadius: 0,
          border: '1px solid rgba(255, 255, 255, 0.08)', // High density visible border
        },
        elevation1: {
          boxShadow: 'none',
        }
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: 'none',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.23)',
          color: '#fff',
        }
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          height: 24,
          fontWeight: 600,
        },
        filled: {
          border: '1px solid transparent',
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.23)',
        }
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 0,
            backgroundColor: '#1e1e1e',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.12)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#90caf9',
            },
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e1e1e',
          '& th': {
            fontWeight: 700,
            color: '#fff',
            fontSize: '0.8rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '6px 12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#e0e0e0'
        }
      }
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 0,
          backgroundColor: '#141414',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#1e1e1e',
            color: '#fff',
            fontWeight: 700,
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          },
          '& .MuiDataGrid-row': {
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
            }
          },
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#e0e0e0',
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            backgroundColor: '#1e1e1e'
          },
          '& .MuiCheckbox-root': {
            color: 'rgba(255, 255, 255, 0.5)',
          }
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 48,
          color: 'rgba(255, 255, 255, 0.6)',
          '&.Mui-selected': {
            color: '#90caf9',
            fontWeight: 700
          }
        }
      }
    }
  },
});

export default auditTheme;
