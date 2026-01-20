import { createTheme } from '@mui/material/styles';

const auditTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#0070f3', // Elegant Professional Blue (Vercel-like)
      light: '#3291ff',
      dark: '#004fc0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ffffff', // Clean White
    },
    background: {
      default: '#000000', // Deep Black
      paper: '#0a0a0a',   // Dark Graphite
      subtle: '#111111'
    },
    text: {
      primary: '#ffffff',
      secondary: '#888888',
    },
    divider: 'rgba(255, 255, 255, 0.1)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h3: { fontWeight: 800, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 600, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, letterSpacing: '0.01em' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 0, // STICK TO SQUARE EDGES
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#0a0a0a',
          borderRadius: 0, // Force Square
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Force Square
          padding: '10px 20px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 0,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 0,
          backgroundColor: '#0a0a0a',
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#050505',
            borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 0,
          },
          '& .MuiDataGrid-footerContainer': {
            backgroundColor: '#050505',
            borderTop: 'none',
          },
        },
      },
    },
  },
});

export default auditTheme;
