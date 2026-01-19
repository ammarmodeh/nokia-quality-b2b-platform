import { createTheme } from '@mui/material/styles';

const auditTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3ea6ff', // Pro Blue
      light: '#65b8ff',
      dark: '#007acc',
      contrastText: '#000000',
    },
    secondary: {
      main: '#00f5d4', // Cyber Teal
    },
    background: {
      default: '#000000', // True Black
      paper: '#0a0a0a',   // Premium Dark Grey
      subtle: '#141414'
    },
    text: {
      primary: '#ffffff',
      secondary: '#9e9e9e',
    },
    divider: 'rgba(255, 255, 255, 0.05)',
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
    h3: { fontWeight: 800, letterSpacing: '-1px' },
    h4: { fontWeight: 700, letterSpacing: '-0.5px' },
    h5: { fontWeight: 600, color: '#3ea6ff' },
    h6: { fontWeight: 600, letterSpacing: '0.1px' },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#0a0a0a',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          '&:hover': {
            borderColor: 'rgba(62, 166, 255, 0.3)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
        containedPrimary: {
          backgroundColor: '#3ea6ff',
          '&:hover': {
            backgroundColor: '#007acc',
            boxShadow: '0 0 15px rgba(62, 166, 255, 0.4)',
          },
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          backgroundColor: '#0a0a0a',
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#050505',
            borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
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
