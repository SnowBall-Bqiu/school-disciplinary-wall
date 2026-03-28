import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import { ThemeModeContext, type ThemeModePreference } from './context/theme-mode-context';
import App from './App';

function RootApp() {
  const [preference, setPreferenceState] = React.useState<ThemeModePreference>(() => {
    const stored = localStorage.getItem('theme-mode-preference');
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  });
  const [systemMode, setSystemMode] = React.useState<'light' | 'dark'>(() => (
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  ));

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event: MediaQueryListEvent) => {
      setSystemMode(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const resolvedMode = preference === 'system' ? systemMode : preference;

  const setPreference = React.useCallback((next: ThemeModePreference) => {
    localStorage.setItem('theme-mode-preference', next);
    setPreferenceState(next);
  }, []);

  const theme = React.useMemo(() => createTheme({
    palette: {
      mode: resolvedMode,
      primary: { main: '#2563eb' },
      secondary: { main: '#8b5cf6' },
      success: { main: '#22c55e' },
      warning: { main: '#f59e0b' },
      background: resolvedMode === 'dark'
        ? { default: '#0b1220', paper: '#111827' }
        : { default: '#f3f6fb', paper: '#ffffff' },
      text: resolvedMode === 'dark'
        ? { primary: '#e5e7eb', secondary: '#94a3b8' }
        : { primary: '#0f172a', secondary: '#64748b' },
      divider: resolvedMode === 'dark' ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.22)',
    },
    shape: { borderRadius: 6 },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: resolvedMode === 'dark' ? '1px solid rgba(148,163,184,0.12)' : undefined,
            boxShadow: resolvedMode === 'dark' ? '0 10px 30px rgba(2, 6, 23, 0.35)' : '0 8px 24px rgba(15, 23, 42, 0.06)',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: resolvedMode === 'dark' ? 'rgba(15, 23, 42, 0.55)' : '#fff',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 700,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          outlined: {
            borderColor: resolvedMode === 'dark' ? 'rgba(148,163,184,0.28)' : undefined,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              backgroundColor: resolvedMode === 'dark' ? 'rgba(37,99,235,0.22)' : 'rgba(37,99,235,0.08)',
            },
          },
        },
      },
    },
  }), [resolvedMode]);

  return (
    <React.StrictMode>
      <ThemeModeContext.Provider value={{ preference, resolvedMode, setPreference }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
          </BrowserRouter>
        </ThemeProvider>
      </ThemeModeContext.Provider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<RootApp />);

