import { createTheme } from "@mui/material/styles";

// ClickUp-inspired light theme configuration
export const clickUpTheme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#f9fafb",
      paper: "#ffffff",
    },
    primary: {
      main: "#7b68ee",
      light: "#9d8df1",
      dark: "#5e4ecf",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#10b981",
      light: "#34d399",
      dark: "#059669",
      contrastText: "#ffffff",
    },
    error: {
      main: "#ef4444",
      light: "#f87171",
      dark: "#dc2626",
    },
    warning: {
      main: "#f59e0b",
      light: "#fbbf24",
      dark: "#d97706",
    },
    info: {
      main: "#3b82f6",
      light: "#60a5fa",
      dark: "#2563eb",
    },
    success: {
      main: "#10b981",
      light: "#34d399",
      dark: "#059669",
    },
    text: {
      primary: "#1f2937",
      secondary: "#6b7280",
      disabled: "#9ca3af",
    },
    divider: "#e5e7eb",
    grey: {
      50: "#f9fafb",
      100: "#f3f4f6",
      200: "#e5e7eb",
      300: "#d1d5db",
      400: "#9ca3af",
      500: "#6b7280",
      600: "#4b5563",
      700: "#374151",
      800: "#1f2937",
      900: "#111827",
    },
  },
  typography: {
    fontFamily: '"Inter", "Rubik", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: "2.5rem",
      letterSpacing: "-0.02em",
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 700,
      fontSize: "2rem",
      letterSpacing: "-0.02em",
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 600,
      fontSize: "1.75rem",
      letterSpacing: "-0.01em",
      lineHeight: 1.3,
    },
    h4: {
      fontWeight: 600,
      fontSize: "1.5rem",
      letterSpacing: "-0.01em",
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: "1.25rem",
      letterSpacing: "-0.01em",
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 600,
      fontSize: "1rem",
      letterSpacing: "-0.005em",
      lineHeight: 1.5,
    },
    subtitle1: {
      fontSize: "1rem",
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: "0.875rem",
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: "0.9375rem",
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 500,
      fontSize: "0.875rem",
      textTransform: "none",
      letterSpacing: "0.01em",
    },
    caption: {
      fontSize: "0.75rem",
      lineHeight: 1.4,
    },
    overline: {
      fontSize: "0.75rem",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    },
  },
  shape: {
    borderRadius: 6,
  },
  shadows: [
    "none",
    "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: "8px 16px",
          fontWeight: 500,
          boxShadow: "none",
          transition: "all 0.15s ease",
          "&:hover": {
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          },
        },
        contained: {
          "&:hover": {
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          },
        },
        outlined: {
          borderWidth: "1.5px",
          "&:hover": {
            borderWidth: "1.5px",
          },
        },
        sizeSmall: {
          padding: "6px 12px",
          fontSize: "0.8125rem",
        },
        sizeLarge: {
          padding: "10px 20px",
          fontSize: "0.9375rem",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        elevation0: {
          border: "1px solid #e5e7eb",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          boxShadow: "none",
          transition: "all 0.15s ease",
          "&:hover": {
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            backgroundColor: "#ffffff",
            transition: "all 0.15s ease",
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#7b68ee",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#7b68ee",
              borderWidth: "2px",
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#ffffff",
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#7b68ee",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#7b68ee",
            borderWidth: "2px",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: "0.8125rem",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid #e5e7eb",
          padding: "12px 16px",
        },
        head: {
          fontWeight: 600,
          backgroundColor: "#f9fafb",
          color: "#374151",
          fontSize: "0.8125rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: "background-color 0.15s ease",
          "&:hover": {
            backgroundColor: "#f9fafb",
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: "1.25rem",
          fontWeight: 600,
          padding: "20px 24px",
          borderBottom: "1px solid #e5e7eb",
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: "24px",
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "16px 24px",
          borderTop: "1px solid #e5e7eb",
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid #e5e7eb",
        },
        indicator: {
          height: 3,
          borderRadius: "3px 3px 0 0",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          fontSize: "0.875rem",
          minHeight: 48,
          transition: "all 0.15s ease",
          "&:hover": {
            color: "#7b68ee",
          },
        },
      },
    },
  },
});

export default clickUpTheme;
