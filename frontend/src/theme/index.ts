import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Create a theme instance with the new 3-color scheme - Purple as primary
const baseTheme = createTheme({
  // Add spacing scale reduction for more compact UI
  spacing: 7, // Reduced from default 8 to 7 for more compact spacing
  palette: {
    primary: {
      main: '#D291E2', // Purple (main primary)
      light: '#E0B0EA', 
      dark: '#C277D8',
      contrastText: '#000',
    },
    secondary: {
      main: '#6EE5D9', // Teal (main secondary)
      light: '#8EEAE0',
      dark: '#5BC4B8',
      contrastText: '#000',
    },
    background: {
      default: '#FFFFFF', // Clean white background
      paper: '#FFFFFF',
    },
        error: {
      main: '#FF4444', // Red for errors
      light: '#FF6666',
      dark: '#CC3333',
      contrastText: '#000',
    },
    warning: {
      main: '#FF4444', // Red for warnings (same as error)
      light: '#FF6666',
      dark: '#CC3333',
      contrastText: '#000',
    },
    info: {
      main: '#6EE5D9', // Teal for info
      light: '#8EEAE0',
      dark: '#5BC4B8',
      contrastText: '#000',
    },
    success: {
      main: '#62EF83', // Green for success
      light: '#7FF299',
      dark: '#4FBF69',
      contrastText: '#000',
    },
    text: {
      primary: '#000000', // Black for primary text
      secondary: '#666666', // Gray for secondary text
    },
    // Custom grays that complement the new theme
    grey: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#EEEEEE', 
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    // Reduce font sizes slightly for more compact UI while maintaining readability
    h1: {
      fontWeight: 700,
      fontSize: '2.2rem', // Reduced from 2.5rem
      color: '#000000',
    },
    h2: {
      fontWeight: 600,
      fontSize: '1.8rem', // Reduced from 2rem
      color: '#000000',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem', // Reduced from 1.75rem
      color: '#000000',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.3rem', // Reduced from 1.5rem
      color: '#000000',
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.1rem', // Reduced from 1.25rem
      color: '#000000',
    },
    h6: {
      fontWeight: 500,
      fontSize: '0.95rem', // Reduced from 1rem
      color: '#000000',
    },
    subtitle1: {
      fontSize: '0.95rem', // Reduced from 1rem
      fontWeight: 400,
      color: '#000000',
    },
    subtitle2: {
      fontSize: '0.825rem', // Reduced from 0.875rem
      fontWeight: 500,
      color: '#666666',
    },
    body1: {
      fontSize: '0.9rem', // Reduced from 1rem
      color: '#000000',
    },
    body2: {
      fontSize: '0.8rem', // Reduced from 0.875rem
      color: '#666666',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      fontSize: '0.85rem', // Make buttons slightly smaller
    },
  },
  shape: {
    borderRadius: 6, // Reduced from 8 for more compact look
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: 'none',
          minHeight: '36px',
          border: '1px solid transparent',
          '&:hover': {
            boxShadow: 'none',
            borderColor: '#A6FDED',
          },
        },
        containedPrimary: {
          backgroundColor: '#D291E2',
          border: '1px solid #D291E2',
          color: '#000000',
          '&:hover': {
            backgroundColor: '#C277D8',
            borderColor: '#C277D8',
            boxShadow: 'none',
          },
        },
        containedSecondary: {
          backgroundColor: '#6EE5D9',
          border: '1px solid #6EE5D9',
          color: '#000000',
          '&:hover': {
            backgroundColor: '#5BC4B8',
            borderColor: '#5BC4B8',
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: '#A6FDED',
          color: '#000000',
          '&:hover': {
            borderColor: '#D291E2',
            backgroundColor: 'rgba(210, 145, 226, 0.04)',
            boxShadow: 'none',
          },
        },
        sizeSmall: {
          padding: '6px 12px',
          fontSize: '0.8rem',
        },
        sizeLarge: {
          padding: '10px 20px',
          fontSize: '0.95rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderRadius: 12,
          border: '1px solid #A6FDED',
          '&:hover': {
            borderColor: '#6EE5D9',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '16px',
          '&:last-child': {
            paddingBottom: '16px',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: '1px solid #A6FDED',
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: 'none',
          border: '1px solid #A6FDED',
        },
        elevation2: {
          boxShadow: 'none',
          border: '1px solid #6EE5D9',
        },
        elevation3: {
          boxShadow: 'none',
          border: '1px solid #D291E2',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#000000',
          boxShadow: 'none',
          borderBottom: '1px solid #A6FDED',
          minHeight: '60px',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '60px !important',
          padding: '0 24px !important',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          height: '28px', // Reduced from default 32px
          fontSize: '0.8rem',
          '&.MuiChip-colorPrimary': {
            backgroundColor: '#D291E2',
            color: '#000000',
          },
          '&.MuiChip-colorSecondary': {
            backgroundColor: '#6EE5D9',
            color: '#000000',
          },
        },
        sizeSmall: {
          height: '24px',
          fontSize: '0.75rem',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          padding: '6px 14px', // Reduced from default padding
          minHeight: '40px', // Reduced from default
          '&:hover': {
            backgroundColor: 'rgba(210, 145, 226, 0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(210, 145, 226, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(210, 145, 226, 0.12)',
            },
          },
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        root: {
          margin: '4px 0', // Reduced from default
        },
        primary: {
          fontSize: '0.9rem', // Reduced font size
        },
        secondary: {
          fontSize: '0.8rem', // Reduced font size
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '8px 12px', // Reduced from default 16px
          fontSize: '0.85rem',
        },
        head: {
          fontSize: '0.8rem',
          fontWeight: 600,
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          marginBottom: '12px', // Reduced from default spacing
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            fontSize: '0.9rem',
          },
          '& .MuiInputLabel-root': {
            fontSize: '0.9rem',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 8, // Reduced from default
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: '16px 20px', // Reduced padding
          fontSize: '1.2rem', // Reduced font size
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '12px 20px', // Reduced padding
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 20px 16px', // Reduced padding
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          boxShadow: 'none',
          border: '1px solid #A6FDED',
          borderRadius: 12,
          minWidth: '200px',
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          boxShadow: 'none',
          border: '1px solid #A6FDED',
          borderRadius: 12,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '14px',
          padding: '8px 16px',
          borderRadius: '8px',
          margin: '0 8px',
          '&:hover': {
            backgroundColor: 'rgba(166, 253, 237, 0.1)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(210, 145, 226, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(210, 145, 226, 0.12)',
            },
          },
        },
      },
    },
  },
});

// Create responsive theme
const theme = responsiveFontSizes(baseTheme);

export default theme; 