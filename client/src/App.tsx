import { Alert, Box, CircularProgress } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthContext } from './context/auth-context';
import { apiFetch } from './lib/api';
import { AdminPage } from './pages/AdminPage';
import { DashboardPage } from './pages/DashboardPage';
import { InitPage } from './pages/InitPage';
import { LoginPage } from './pages/LoginPage';
import type { SessionResponse, SummaryResponse } from './types/api';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ initialized: boolean }>('/api/auth/status')
      .then((result) => {
        setInitialized(result.initialized);
        const token = localStorage.getItem('token');
        const userText = localStorage.getItem('user');
        if (token && userText) {
          try {
            const user = JSON.parse(userText);
            setSession({ token, user });
          } catch {
            // 解析失败，清除损坏的数据
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : '系统状态加载失败');
      })
      .finally(() => setLoading(false));
  }, []);

  const authValue = useMemo(() => ({
    session,
    setSession: (nextSession: SessionResponse | null) => {
      setSession(nextSession);
      if (nextSession) {
        localStorage.setItem('token', nextSession.token);
        localStorage.setItem('user', JSON.stringify(nextSession.user));
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    },
  }), [session]);

  function handleInitialized(summary: SummaryResponse) {
    setInitialized(summary.initialized);
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <AuthContext.Provider value={authValue}>
      <Routes>
        {!initialized ? (
          <Route path="*" element={<InitPage onInitialized={handleInitialized} onSession={authValue.setSession} />} />
        ) : null}
        {initialized && !session ? (
          <>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<LoginPage onSuccess={authValue.setSession} />} />
          </>
        ) : null}
        {initialized && session ? (
          <>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin" element={<AdminPage session={session} onLogout={() => authValue.setSession(null)} />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </>
        ) : null}
      </Routes>
    </AuthContext.Provider>
  );
}

