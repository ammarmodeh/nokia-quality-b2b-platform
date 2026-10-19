import { createTheme } from '@mui/material/styles';

// Clerk-style design system — neutral surfaces, 1px borders, violet accent.
// Colour tokens live in index.css (--bg, --surface, --border, --text, ...) so
// hard-coded styles and MUI components switch light/dark together via
// <html data-theme="light|dark">.

const shared = {
  success: { main: '#16A34A' },
  warning: { main: '#D97706' },
  error: { main: '#DC2626' },
  info: { main: '#2563EB' },
};

const appTheme = createTheme({
  cssVariables: { colorSchemeSelector: 'data-theme', cssVarPrefix: 'mui' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#6C47FF', light: '#8B6CFF', dark: '#5B3BE0', contrastText: '#FFFFFF' },
        secondary: { main: '#5E5F6E', contrastText: '#FFFFFF' },
        background: { default: '#FAFAFA', paper: '#FFFFFF' },
        text: { primary: '#131316', secondary: '#5E5F6E', disabled: '#9394A1' },
        divider: '#E5E7EB',
        action: { hover: 'rgba(19,19,22,0.04)', selected: 'rgba(108,71,255,0.08)' },
        ...shared,
      },
    },
    dark: {
      palette: {
        primary: { main: '#7C5CFF', light: '#9A82FF', dark: '#6C47FF', contrastText: '#FFFFFF' },
        secondary: { main: '#A1A1AA', contrastText: '#0B0B0F' },
        background: { default: '#0B0B0F', paper: '#131318' },
        text: { primary: '#EDEDF0', secondary: '#A1A1AA', disabled: '#6B6B76' },
        divider: '#26262E',
        action: { hover: 'rgba(255,255,255,0.05)', selected: 'rgba(124,92,255,0.16)' },
        success: { main: '#22C55E' },
        warning: { main: '#F59E0B' },
        error: { main: '#EF4444' },
        info: { main: '#3B82F6' },
      },
    },
  },
  typography: {
    fontFamily: '"Inter", "Rubik", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 13,
    h1: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.375rem', fontWeight: 600, letterSpacing: '-0.02em' },
    h3: { fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.015em' },
    h4: { fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontSize: '1rem', fontWeight: 600 },
    h6: { fontSize: '0.9375rem', fontWeight: 600 },
    subtitle1: { fontSize: '0.875rem', fontWeight: 500 },
    subtitle2: { fontSize: '0.8125rem', fontWeight: 500 },
    body1: { fontSize: '0.875rem', lineHeight: 1.5 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.45 },
    button: { fontSize: '0.8125rem', fontWeight: 500, textTransform: 'none' },
    caption: { fontSize: '0.75rem' },
    overline: { fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.04em' },
  },
  shape: { borderRadius: 6 },
  shadows: [
    'none',
    '0 1px 2px rgba(0,0,0,0.04)',
    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    '0 4px 12px rgba(0,0,0,0.08)',
    '0 8px 24px rgba(0,0,0,0.10)',
    ...Array(20).fill('0 12px 32px rgba(0,0,0,0.12)'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: { body: { backgroundColor: 'var(--bg)', color: 'var(--text)' } },
    },
    MuiButtonBase: { defaultProps: { disableRipple: true } },
    MuiButton: {
      defaultProps: { disableElevation: true, size: 'small' },
      styleOverrides: {
        root: {
          borderRadius: 6,
          minHeight: 32,
          padding: '5px 12px',
          fontWeight: 500,
          textTransform: 'none',
          transition: 'background-color .12s ease, border-color .12s ease, color .12s ease',
          '&.Mui-focusVisible': { outline: '2px solid var(--focus-ring)', outlineOffset: 2 },
        },
        sizeLarge: { minHeight: 36, padding: '7px 16px', fontSize: '0.875rem' },
        outlined: {
          borderColor: 'var(--border)',
          color: 'var(--text)',
          backgroundColor: 'var(--surface)',
          boxShadow: 'var(--shadow-xs)',
          '&:hover': { borderColor: 'var(--border-strong)', backgroundColor: 'var(--surface-hover)' },
        },
        text: { '&:hover': { backgroundColor: 'var(--surface-hover)' } },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          '&:hover': { backgroundColor: 'var(--surface-hover)' },
          '&.Mui-focusVisible': { outline: '2px solid var(--focus-ring)', outlineOffset: 2 },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'var(--surface)',
          color: 'var(--text)',
        },
        outlined: { borderColor: 'var(--border)' },
        elevation1: { border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          boxShadow: 'var(--shadow-xs)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--surface)',
          borderRadius: 6,
          fontSize: '0.8125rem',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-strong)' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--accent)',
            borderWidth: 1,
            boxShadow: '0 0 0 3px var(--accent-ring)',
          },
        },
        input: { padding: '8px 10px' },
        inputSizeSmall: { padding: '6px 10px' },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontSize: '0.8125rem' } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiAutocomplete: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        paper: { border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' },
        option: { fontSize: '0.8125rem' },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', borderRadius: 8 },
        list: { padding: 4 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          borderRadius: 4,
          minHeight: 32,
          '&:hover': { backgroundColor: 'var(--surface-hover)' },
          '&.Mui-selected': { backgroundColor: 'var(--accent-subtle)' },
        },
      },
    },
    MuiPopover: { styleOverrides: { paper: { border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' } } },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: 'var(--tooltip-bg)', color: 'var(--tooltip-text)', fontSize: '0.75rem', borderRadius: 6 },
        arrow: { color: 'var(--tooltip-bg)' },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 },
      },
    },
    MuiTable: { styleOverrides: { root: { borderCollapse: 'separate', borderSpacing: 0 } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: 'var(--border)', padding: '9px 14px', fontSize: '0.8125rem', color: 'var(--text)' },
        head: {
          backgroundColor: 'var(--surface-subtle)',
          color: 'var(--text-secondary)',
          fontWeight: 500,
          fontSize: '0.75rem',
          borderBottom: '1px solid var(--border)',
        },
        sizeSmall: { padding: '6px 12px' },
      },
    },
    MuiTableRow: {
      styleOverrides: { root: { '&.MuiTableRow-hover:hover': { backgroundColor: 'var(--surface-hover)' } } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)' },
      },
    },
    MuiBackdrop: { styleOverrides: { root: { backgroundColor: 'var(--overlay)' } } },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: '1rem', fontWeight: 600, padding: '16px 20px' } } },
    MuiDialogContent: { styleOverrides: { root: { padding: '16px 20px' } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '12px 20px', borderTop: '1px solid var(--border)' } } },
    MuiDrawer: { styleOverrides: { paper: { backgroundColor: 'var(--surface)', borderColor: 'var(--border)' } } },
    MuiChip: {
      defaultProps: { size: 'small' },
      styleOverrides: { root: { borderRadius: 6, fontWeight: 500, fontSize: '0.75rem' } },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 40, borderBottom: '1px solid var(--border)' },
        indicator: { backgroundColor: 'var(--text)', height: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.8125rem',
          minHeight: 40,
          minWidth: 0,
          padding: '8px 2px',
          marginRight: 20,
          color: 'var(--text-secondary)',
          '&.Mui-selected': { color: 'var(--text)' },
        },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: 'var(--border)' } } },
    MuiAccordion: {
      styleOverrides: { root: { border: '1px solid var(--border)', boxShadow: 'none', '&:before': { display: 'none' } } },
    },
    MuiAlert: { styleOverrides: { root: { borderRadius: 8, fontSize: '0.8125rem' } } },
    MuiSwitch: {
      styleOverrides: { root: { '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { opacity: 1 } } },
    },
  },
});

export default appTheme;
