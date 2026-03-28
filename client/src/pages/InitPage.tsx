import { Alert, Box, Button, Card, CardContent, Container, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { SessionResponse, SummaryResponse } from '../types/api';

interface InitPageProps {
  onInitialized: (summary: SummaryResponse) => void;
  onSession: (session: SessionResponse) => void;
}

export function InitPage({ onInitialized, onSession }: InitPageProps) {
  const [form, setForm] = useState({
    className: '高三2班',
    initialClassScore: 100,
    defaultStudentScore: 100,
    storageMode: 'sqlite',
    username: 'admin',
    password: '1234',
  });
  const [error, setError] = useState('');
  const tips = useMemo(
    () => [
      '默认超管初始化方式：首次初始化时创建唯一超级管理员。',
      '撤销记录保留痕迹，不直接删除原流水。',
      '天气接口失败时自动降级为“天气暂不可用”。',
      '班级总分按班级初始分 + 全部未撤销流水总和联动。',
      'sql.js 可在系统设置中切换为备用模式。',
    ],
    [],
  );

  async function handleSubmit() {
    try {
      setError('');
      const summary = await apiFetch<SummaryResponse>('/api/auth/initialize', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          initialClassScore: Number(form.initialClassScore),
          defaultStudentScore: Number(form.defaultStudentScore),
        }),
      });
      const session = await apiFetch<SessionResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: form.username, password: form.password }),
      });
      onInitialized(summary);
      onSession(session);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '初始化失败');
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg, #0f172a, #1d4ed8)' }}>
      <Container maxWidth="md">
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h4" fontWeight={800}>首次初始化引导</Typography>
                <Typography variant="body1" color="text.secondary">当前系统为空库，请先完成单一班级与默认超管初始化。</Typography>
              </Box>
              {error ? <Alert severity="error">{error}</Alert> : null}
              <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
                <TextField label="班级名称" fullWidth value={form.className} onChange={(e) => setForm((prev) => ({ ...prev, className: e.target.value }))} />
                <TextField label="班级初始总分" type="number" fullWidth value={form.initialClassScore} onChange={(e) => setForm((prev) => ({ ...prev, initialClassScore: Number(e.target.value) }))} />
              </Stack>
              <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
                <TextField label="学生默认初始分" type="number" fullWidth value={form.defaultStudentScore} onChange={(e) => setForm((prev) => ({ ...prev, defaultStudentScore: Number(e.target.value) }))} />
                <TextField select label="主存储模式" fullWidth value={form.storageMode} onChange={(e) => setForm((prev) => ({ ...prev, storageMode: e.target.value }))}>
                  <MenuItem value="sqlite">SQLite（推荐）</MenuItem>
                  <MenuItem value="sqljs">sql.js（备用）</MenuItem>
                </TextField>
              </Stack>
              <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
                <TextField label="超管账号" fullWidth value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} />
                <TextField label="超管密码" type="password" fullWidth value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
              </Stack>
              <Alert severity="info">
                <Stack spacing={1}>
                  {tips.map((tip) => (
                    <Typography key={tip} variant="body2">{tip}</Typography>
                  ))}
                </Stack>
              </Alert>
              <Button variant="contained" size="large" onClick={handleSubmit}>完成初始化并进入系统</Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
