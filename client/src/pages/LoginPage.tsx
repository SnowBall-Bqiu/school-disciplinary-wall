import { Alert, Box, Button, Card, CardContent, Container, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { apiFetch } from '../lib/api';
import type { SessionResponse } from '../types/api';

interface LoginPageProps {
  onSuccess: (session: SessionResponse) => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('1234');
  const [error, setError] = useState('');

  async function handleLogin() {
    try {
      setError('');
      const session = await apiFetch<SessionResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      onSuccess(session);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '登录失败');
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg, #111827, #1d4ed8)' }}>
      <Container maxWidth="sm">
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h4" fontWeight={800}>系统登录</Typography>
                <Typography variant="body2" color="text.secondary">本系统采用本地单机简化登录，适用于班级一体机与办公室电脑。</Typography>
              </Box>
              {error ? <Alert severity="error">{error}</Alert> : null}
              <TextField label="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
              <TextField label="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button variant="contained" size="large" onClick={handleLogin}>登录</Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
