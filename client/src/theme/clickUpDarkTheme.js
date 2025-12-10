import { createTheme } from '@mui/material/styles';

// ClickUp Dark Theme - Based on actual ClickUp design
const clickUpDarkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7b68ee', // Purple accent
      light: '#9d8df1',
      dark: '#5e4ecf',
    },
    secondary: {
      main: '#49ccf9', // ClickUp blue accent
      light: '#6dd5f9',
      dark: '#2eb8e6',
    },
    background: {
      default: '#1a1a1a', // Main dark background (darker)
      paper: '#2d2d2d', // Card/surface background (lighter for elevation)
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
      disabled: '#6b6b6b',
    },
    divider: '#3d3d3d',
    success: {
      main: '#00c875', // ClickUp green
    },
    error: {
      main: '#e44258', // ClickUp red
    },
    warning: {
      main: '#fdab3d', // ClickUp orange
    },
  },
  typography: {
    fontFamily: '"Inter", "Rubik", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 14,
    h1: { fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.5rem', fontWeight: 600 },
    h4: { fontSize: '1.25rem', fontWeight: 600 },
    h5: { fontSize: '1.125rem', fontWeight: 600 },
    h6: { fontSize: '1rem', fontWeight: 600 },
    subtitle1: { fontSize: '0.875rem', fontWeight: 500, color: '#b3b3b3' },
    body1: { fontSize: '0.875rem', lineHeight: 1.5 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.4 },
    button: { fontSize: '0.875rem', fontWeight: 500, textTransform: 'none' },
    caption: { fontSize: '0.75rem', color: '#b3b3b3' },
  },
  shape: {
    borderRadius: 6,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(0, 0, 0, 0.3)',
    '0 2px 6px rgba(0, 0, 0, 0.3)',
    '0 4px 12px rgba(0, 0, 0, 0.3)',
    '0 8px 24px rgba(0, 0, 0, 0.3)',
    ...Array(20).fill('0 8px 24px rgba(0, 0, 0, 0.3)'),
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '8px 16px',
          fontSize: '0.875rem',
          fontWeight: 500,
          textTransform: 'none',
          transition: 'all 0.15s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(123, 104, 238, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#2d2d2d',
          border: '1px solid #3d3d3d',
          color: '#ffffff',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#2d2d2d',
          border: '1px solid #3d3d3d',
          borderRadius: 8,
          transition: 'all 0.15s ease',
          color: '#ffffff',
          '&:hover': {
            borderColor: '#7b68ee',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#2d2d2d',
            '& fieldset': {
              borderColor: '#3d3d3d',
            },
            '&:hover fieldset': {
              borderColor: '#7b68ee',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#7b68ee',
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#2d2d2d',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#3d3d3d',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#7b68ee',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#7b68ee',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#3d3d3d',
          padding: '12px 16px',
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
        },
        head: {
          backgroundColor: '#2d2d2d',
          fontWeight: 600,
          color: '#ffffff',
          borderBottom: '2px solid #3d3d3d',
        },
        body: {
          backgroundColor: '#2d2d2d',
          color: '#ffffff',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          backgroundColor: '#2d2d2d',
          '&:hover': {
            backgroundColor: '#3d3d3d',
          },
          '&.MuiTableRow-head': {
            backgroundColor: '#2d2d2d',
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          backgroundColor: '#2d2d2d',
          borderCollapse: 'separate',
          borderSpacing: 0,
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          backgroundColor: '#2d2d2d',
          border: '1px solid #3d3d3d',
          borderRadius: 8,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#2d2d2d',
          backgroundImage: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          '&.Mui-selected': {
            color: '#7b68ee',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#7b68ee',
        },
      },
    },
  },
});

export default clickUpDarkTheme;
