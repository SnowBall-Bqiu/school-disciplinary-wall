import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Slider,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';


import Grid from '@mui/material/Grid2';
import LogoutIcon from '@mui/icons-material/Logout';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import LightModeIcon from '@mui/icons-material/LightMode';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import BrightnessAutoIcon from '@mui/icons-material/BrightnessAuto';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';

import type { ExportDataResponse, SessionResponse, SummaryResponse } from '../types/api';
import { useTheme } from '@mui/material/styles';
import { useThemeMode } from '../context/theme-mode-context';
import type { DashboardLayoutItem, DashboardSettings, ScoreRuleType, UserRole } from '@shared/types';

import { defaultDashboardSettings } from '@shared/defaults';


interface AdminPageProps {
  session: SessionResponse;
  onLogout: () => void;
}

const GRID_COLUMNS = 12;
const GRID_ROW_HEIGHT = 72;

const layoutLabels: Record<string, string> = {
  clock: '时间日期',
  weather: '天气',
  quote: '一言',
  classScore: '班级总分',
  ranking: '排行榜',
  bulletin: '今日通报',
};

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: '超级管理员',
  TEACHER: '老师',
  OFFICER: '班干部',
};

const settingsSections = [
  { id: 'display', label: '展示设置' },
  { id: 'ranking', label: '排行榜设置' },
  { id: 'layout', label: '布局编辑' },
] as const;


function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}


export function AdminPage({ session, onLogout }: AdminPageProps) {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [studentForm, setStudentForm] = useState({ id: 0, student_no: '', name: '', initial_score: 100 });
  const [ruleForm, setRuleForm] = useState<{ id: number; type: ScoreRuleType; name: string; score_value: number }>({ id: 0, type: 'DEDUCT', name: '', score_value: 2 });
  const [scoreForm, setScoreForm] = useState({ studentIds: '', ruleId: '', reason: '', changeValue: -2 });
  const [dashboardSettings, setDashboardSettings] = useState<DashboardSettings>(defaultDashboardSettings);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'display' | 'ranking' | 'layout'>('display');

  const [userForm, setUserForm] = useState<{ id: number; username: string; password: string; role: UserRole }>({ id: 0, username: '', password: '', role: 'OFFICER' });

  const [importText, setImportText] = useState('');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const layoutEditorRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const theme = useTheme();
  const { preference, setPreference } = useThemeMode();
  const token = session.token;


  const currentRole = session.user.role;
  const canManageSystem = currentRole === 'SUPER_ADMIN';
  const canReset = currentRole !== 'OFFICER';
  const canRevoke = currentRole !== 'OFFICER';
  const canDeleteStudents = currentRole !== 'OFFICER';
  const canManageAnyUser = currentRole === 'SUPER_ADMIN';
  const canManageOfficerUser = currentRole === 'SUPER_ADMIN' || currentRole === 'TEACHER';

  async function loadSummary() {
    try {
      const result = await apiFetch<SummaryResponse>('/api/summary', {}, token);
      setSummary(result);
      if (result.settings.dashboard_settings) {
        const parsedSettings = JSON.parse(result.settings.dashboard_settings) as Partial<DashboardSettings>;
        setDashboardSettings({
          ...defaultDashboardSettings,
          ...parsedSettings,
          modules: {
            ...defaultDashboardSettings.modules,
            ...(parsedSettings.modules ?? {}),
          },
          layout: parsedSettings.layout ?? defaultDashboardSettings.layout,
        });
      }

      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载失败');
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  const filteredStudents = useMemo(() => {
    const list = summary?.students ?? [];
    if (!keyword.trim()) return list;
    return list.filter((student) => `${student.name} ${student.student_no}`.includes(keyword.trim()));
  }, [summary?.students, keyword]);

  const filteredRules = useMemo(() => {
    const list = summary?.scoreRules ?? [];
    if (!keyword.trim()) return list;
    return list.filter((rule) => `${rule.name} ${rule.type}`.includes(keyword.trim()));
  }, [summary?.scoreRules, keyword]);

  const filteredUsers = useMemo(() => {
    const list = summary?.users ?? [];
    if (!keyword.trim()) return list;
    return list.filter((user) => `${user.username} ${roleLabels[user.role]}`.includes(keyword.trim()));
  }, [summary?.users, keyword]);

  const studentMap = useMemo(() => Object.fromEntries((summary?.students ?? []).map((student) => [student.id, student.name])), [summary?.students]);
  const userMap = useMemo(() => Object.fromEntries((summary?.users ?? []).map((user) => [user.id, user.username])), [summary?.users]);
  const layoutRows = useMemo(() => Math.max(6, ...dashboardSettings.layout.map((item) => item.y + item.h + 1)), [dashboardSettings.layout]);

  function resetStudentForm() {
    setStudentForm({ id: 0, student_no: '', name: '', initial_score: 100 });
  }

  function resetRuleForm() {
    setRuleForm({ id: 0, type: 'DEDUCT', name: '', score_value: 2 });
  }

  function resetUserForm() {
    setUserForm({ id: 0, username: '', password: '', role: 'OFFICER' });
  }

  async function submitStudent() {
    const endpoint = studentForm.id ? `/api/students/${studentForm.id}` : '/api/students';
    const method = studentForm.id ? 'PUT' : 'POST';
    await apiFetch(endpoint, { method, body: JSON.stringify({ student_no: studentForm.student_no, name: studentForm.name, initial_score: Number(studentForm.initial_score) }) }, token);
    resetStudentForm();
    loadSummary();
  }

  async function deleteStudent(id: number) {
    await apiFetch(`/api/students/${id}`, { method: 'DELETE' }, token);
    loadSummary();
  }

  async function submitRule() {
    const endpoint = ruleForm.id ? `/api/rules/${ruleForm.id}` : '/api/rules';
    const method = ruleForm.id ? 'PUT' : 'POST';
    await apiFetch(endpoint, { method, body: JSON.stringify({ ...ruleForm, score_value: Number(ruleForm.score_value) }) }, token);
    resetRuleForm();
    loadSummary();
  }

  async function deleteRule(id: number) {
    await apiFetch(`/api/rules/${id}`, { method: 'DELETE' }, token);
    loadSummary();
  }

  async function submitScore() {
    const ids = scoreForm.studentIds.split(',').map((item) => Number(item.trim())).filter(Boolean);
    if (ids.length === 0) {
      setError('请先输入至少 1 个学生 ID，多个学生可用英文逗号分隔。');
      return;
    }
    if (!scoreForm.reason.trim()) {
      setError('请填写加扣分原因。');
      return;
    }
    await apiFetch('/api/scores/apply', { method: 'POST', body: JSON.stringify({ ...scoreForm, studentIds: ids, ruleId: scoreForm.ruleId ? Number(scoreForm.ruleId) : null, changeValue: Number(scoreForm.changeValue) }) }, token);
    setError('');
    setScoreForm({ studentIds: '', ruleId: '', reason: '', changeValue: -2 });
    loadSummary();
  }


  async function revokeRecord(id: number) {
    await apiFetch(`/api/scores/${id}/revoke`, { method: 'POST', body: JSON.stringify({ revokeReason: '后台撤销误操作' }) }, token);
    loadSummary();
  }

  async function saveDashboard(nextSettings = dashboardSettings) {
    await apiFetch('/api/settings/dashboard', { method: 'PUT', body: JSON.stringify(nextSettings) }, token);
    loadSummary();
  }

  async function switchStorageMode(mode: 'sqlite' | 'sqljs') {
    await apiFetch('/api/storage-mode', { method: 'POST', body: JSON.stringify({ mode }) }, token);
    loadSummary();
  }

  async function saveUser() {
    const isEdit = userForm.id > 0;
    const endpoint = isEdit ? `/api/users/${userForm.id}` : session.user.role === 'SUPER_ADMIN' ? '/api/users' : '/api/users/officer';
    const payload = isEdit
      ? { username: userForm.username, password: userForm.password || undefined, role: session.user.role === 'SUPER_ADMIN' ? userForm.role : 'OFFICER' }
      : session.user.role === 'SUPER_ADMIN'
        ? { username: userForm.username, password: userForm.password, role: userForm.role }
        : { username: userForm.username, password: userForm.password, role: 'OFFICER' };
    await apiFetch(endpoint, { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) }, token);
    resetUserForm();
    setCreateUserOpen(false);
    loadSummary();
  }

  async function deleteUser(id: number) {
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' }, token);
    loadSummary();
  }

  async function exportJson() {
    const result = await apiFetch<ExportDataResponse>('/api/export', {}, token);
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `班级德育数据-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importJsonText(text: string) {
    const parsed = JSON.parse(text);
    await apiFetch('/api/import', { method: 'POST', body: JSON.stringify(parsed) }, token);
    setImportText('');
    loadSummary();
  }

  async function logoutNow() {
    await apiFetch('/api/auth/logout', { method: 'POST' }, token).catch(() => undefined);
    localStorage.removeItem('token');
    onLogout();
  }

  function startEditUser(id: number) {
    const target = summary?.users.find((item) => item.id === id);
    if (!target) return;
    setUserForm({ id: target.id, username: target.username, password: '', role: target.role });
    setCreateUserOpen(true);
  }

  function updateLayoutItem(id: string, updater: (item: DashboardLayoutItem) => DashboardLayoutItem) {
    setDashboardSettings((prev) => ({
      ...prev,
      layout: prev.layout.map((item) => {
        if (item.id !== id) return item;
        const next = updater(item);
        return {
          ...next,
          x: clamp(next.x, 0, GRID_COLUMNS - next.w),
          y: clamp(next.y, 0, 20),
          w: clamp(next.w, 2, GRID_COLUMNS),
          h: clamp(next.h, 1, 8),
        };
      }),
    }));
  }

  function handleLayoutPointerDown(item: DashboardLayoutItem, event: React.PointerEvent<HTMLDivElement>) {
    const editor = layoutEditorRef.current;
    if (!canManageSystem || !editor) return;
    const rect = editor.getBoundingClientRect();
    const columnWidth = rect.width / GRID_COLUMNS;
    dragStateRef.current = {
      id: item.id,
      offsetX: event.clientX - rect.left - item.x * columnWidth,
      offsetY: event.clientY - rect.top - item.y * GRID_ROW_HEIGHT,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleLayoutPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const editor = layoutEditorRef.current;
    if (!canManageSystem || !editor || !dragStateRef.current) return;
    const rect = editor.getBoundingClientRect();
    const columnWidth = rect.width / GRID_COLUMNS;
    const active = dashboardSettings.layout.find((item) => item.id === dragStateRef.current?.id);
    if (!active) return;
    const rawX = event.clientX - rect.left - dragStateRef.current.offsetX;
    const rawY = event.clientY - rect.top - dragStateRef.current.offsetY;
    const nextX = clamp(Math.round(rawX / columnWidth), 0, GRID_COLUMNS - active.w);
    const nextY = clamp(Math.round(rawY / GRID_ROW_HEIGHT), 0, 20);
    updateLayoutItem(active.id, (item) => ({ ...item, x: nextX, y: nextY }));
  }


  function handleLayoutPointerUp() {
    dragStateRef.current = null;
  }

  function renderLayoutEditorItem(item: DashboardLayoutItem) {
    return (
      <Paper
        key={item.id}
        onPointerDown={(event) => handleLayoutPointerDown(item, event)}
        sx={{
          position: 'absolute',
          left: `${(item.x / GRID_COLUMNS) * 100}%`,
          top: item.y * GRID_ROW_HEIGHT,
          width: `calc(${(item.w / GRID_COLUMNS) * 100}% - 8px)`,
          height: item.h * GRID_ROW_HEIGHT - 8,
          p: 1.5,
          borderRadius: 3,
          bgcolor: 'background.paper',
          color: 'text.primary',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 10px 24px rgba(15,23,42,0.16)',
          cursor: canManageSystem ? 'grab' : 'default',
          userSelect: 'none',
          overflow: 'hidden',
        }}
      >
        <Stack spacing={1} sx={{ height: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <DragIndicatorIcon fontSize="small" />
              <Typography fontWeight={800}>{layoutLabels[item.id] ?? item.id}</Typography>
            </Stack>
            <Chip size="small" label={`${item.w}×${item.h}`} color="primary" variant="outlined" />
          </Stack>
          <Typography variant="caption" color="text.secondary">拖动卡片可自由调整位置，右下区域可微调尺寸。</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1}>
            <TextField size="small" label="宽" type="number" value={item.w} onChange={(e) => updateLayoutItem(item.id, (target) => ({ ...target, w: Number(e.target.value) }))} disabled={!canManageSystem} />
            <TextField size="small" label="高" type="number" value={item.h} onChange={(e) => updateLayoutItem(item.id, (target) => ({ ...target, h: Number(e.target.value) }))} disabled={!canManageSystem} />
          </Stack>
        </Stack>
      </Paper>

    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

      <AppBar position="sticky">
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800 }}>后台管理中心</Typography>
          <Chip label={`当前角色：${roleLabels[session.user.role]}`} color="secondary" />
          <Button
            color="inherit"
            onClick={() => setPreference(preference === 'light' ? 'dark' : preference === 'dark' ? 'system' : 'light')}
            startIcon={preference === 'light' ? <LightModeIcon /> : preference === 'dark' ? <DarkModeIcon /> : <BrightnessAutoIcon />}
          >
            {preference === 'light' ? '浅色' : preference === 'dark' ? '深色' : '自动'}
          </Button>
          {(canManageAnyUser || canManageOfficerUser) ? <Button color="inherit" onClick={() => { resetUserForm(); setCreateUserOpen(true); }}>创建用户</Button> : null}

          <IconButton color="inherit" onClick={logoutNow}><LogoutIcon /></IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ py: 3 }}>
        <Stack spacing={3}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Paper sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
              <Box>
                <Typography variant="h5" fontWeight={800}>{summary?.classInfo?.class_name ?? '未初始化班级'}</Typography>
                <Typography color="text.secondary">班级总分：{summary?.classInfo?.current_class_score ?? '--'} / 存储模式：{summary?.storageMode ?? '--'}</Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button variant="outlined" onClick={() => switchStorageMode('sqlite')} disabled={!canManageSystem}>切换 SQLite</Button>
                <Button variant="outlined" onClick={() => switchStorageMode('sqljs')} disabled={!canManageSystem}>切换 sql.js</Button>
                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportJson} disabled={!canManageSystem}>导出 JSON</Button>
                <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => importInputRef.current?.click()} disabled={!canManageSystem}>导入 JSON</Button>
                <Button variant="contained" color="error" disabled={!canReset} onClick={() => apiFetch('/api/reset', { method: 'POST' }, token).then(() => loadSummary())}>重置班级数据</Button>
              </Stack>
            </Stack>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              hidden
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                setImportText(text);
                await importJsonText(text);
                event.currentTarget.value = '';
              }}
            />
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              <TextField
                fullWidth
                placeholder="搜索学生、规则、用户"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
              />
              <Chip label={`学生 ${summary?.students.length ?? 0}`} />
              <Chip label={`规则 ${summary?.scoreRules.length ?? 0}`} />
              <Chip label={`用户 ${summary?.users.length ?? 0}`} />
            </Stack>
          </Paper>

          <Paper>
            <Tabs value={tab} onChange={(_e, value) => setTab(value)} variant="scrollable">
              <Tab label="德育分操作台" />
              <Tab label="学生管理" />
              <Tab label="规则管理" />
              <Tab label="用户管理" />
              <Tab label="流水明细" />
              <Tab label="系统设置" />
            </Tabs>
          </Paper>

          {tab === 0 ? (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 5 }}>
                <Card><CardContent><Stack spacing={2}>
                  <Typography variant="h6" fontWeight={800}>执行加扣分</Typography>
                  <TextField label="学生 ID（支持逗号批量）" value={scoreForm.studentIds} onChange={(e) => setScoreForm((prev) => ({ ...prev, studentIds: e.target.value }))} helperText="可参考右侧学生速览中的 ID" />
                  <TextField select label="引用规则" value={scoreForm.ruleId} onChange={(e) => {
                    const selected = summary?.scoreRules.find((item) => String(item.id) === e.target.value);
                    setScoreForm((prev) => ({ ...prev, ruleId: e.target.value, reason: selected?.name ?? prev.reason, changeValue: selected ? (selected.type === 'ADD' ? selected.score_value : -selected.score_value) : prev.changeValue }));
                  }}>
                    <MenuItem value="">手动填写</MenuItem>
                    {(summary?.scoreRules ?? []).map((rule) => <MenuItem key={rule.id} value={String(rule.id)}>{rule.name}（{rule.type === 'ADD' ? '+' : '-'}{rule.score_value}）</MenuItem>)}
                  </TextField>
                  <TextField label="备注原因" value={scoreForm.reason} onChange={(e) => setScoreForm((prev) => ({ ...prev, reason: e.target.value }))} />
                  <TextField label="实际分值" type="number" value={scoreForm.changeValue} onChange={(e) => setScoreForm((prev) => ({ ...prev, changeValue: Number(e.target.value) }))} />
                  <Button variant="contained" onClick={submitScore}>确认执行</Button>
                </Stack></CardContent></Card>
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <Card><CardContent><Stack spacing={1.5}>
                  <Typography variant="h6" fontWeight={800}>学生速览</Typography>
                  {(summary?.students ?? []).map((student) => (
                    <Stack key={student.id} direction="row" justifyContent="space-between">
                      <Typography>ID {student.id} · {student.name} · {student.student_no}</Typography>
                      <Chip label={`${student.current_score} 分`} color={student.current_score >= student.initial_score ? 'success' : 'warning'} />
                    </Stack>
                  ))}
                </Stack></CardContent></Card>
              </Grid>
            </Grid>
          ) : null}

          {tab === 1 ? (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card><CardContent><Stack spacing={2}>
                  <Typography variant="h6" fontWeight={800}>{studentForm.id ? '编辑学生' : '添加学生'}</Typography>
                  <TextField label="学号" value={studentForm.student_no} onChange={(e) => setStudentForm((prev) => ({ ...prev, student_no: e.target.value }))} />
                  <TextField label="姓名" value={studentForm.name} onChange={(e) => setStudentForm((prev) => ({ ...prev, name: e.target.value }))} />
                  <TextField label="初始德育分" type="number" value={studentForm.initial_score} onChange={(e) => setStudentForm((prev) => ({ ...prev, initial_score: Number(e.target.value) }))} />
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" onClick={submitStudent}>保存学生</Button>
                    {studentForm.id ? <Button onClick={resetStudentForm}>取消编辑</Button> : null}
                  </Stack>
                </Stack></CardContent></Card>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Card><CardContent>
                  <Typography variant="h6" fontWeight={800}>学生列表</Typography>
                  <Table>
                    <TableHead><TableRow><TableCell>ID</TableCell><TableCell>学号</TableCell><TableCell>姓名</TableCell><TableCell>初始分</TableCell><TableCell>当前分</TableCell><TableCell align="right">操作</TableCell></TableRow></TableHead>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        <TableRow key={student.id} hover>
                          <TableCell>{student.id}</TableCell>
                          <TableCell>{student.student_no}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.initial_score}</TableCell>
                          <TableCell>{student.current_score}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <IconButton onClick={() => setStudentForm(student)}><EditIcon /></IconButton>
                              <IconButton color="error" disabled={!canDeleteStudents} onClick={() => deleteStudent(student.id)}><DeleteIcon /></IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent></Card>
              </Grid>
            </Grid>
          ) : null}

          {tab === 2 ? (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card><CardContent><Stack spacing={2}>
                  <Typography variant="h6" fontWeight={800}>{ruleForm.id ? '编辑规则' : '添加规则'}</Typography>
                  <TextField select label="类型" value={ruleForm.type} onChange={(e) => setRuleForm((prev) => ({ ...prev, type: e.target.value as ScoreRuleType }))}>
                    <MenuItem value="ADD">加分</MenuItem>
                    <MenuItem value="DEDUCT">扣分</MenuItem>
                  </TextField>
                  <TextField label="规则名称" value={ruleForm.name} onChange={(e) => setRuleForm((prev) => ({ ...prev, name: e.target.value }))} />
                  <TextField label="默认分值" type="number" value={ruleForm.score_value} onChange={(e) => setRuleForm((prev) => ({ ...prev, score_value: Number(e.target.value) }))} />
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" onClick={submitRule}>保存规则</Button>
                    {ruleForm.id ? <Button onClick={resetRuleForm}>取消编辑</Button> : null}
                  </Stack>
                </Stack></CardContent></Card>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Card><CardContent>
                  <Typography variant="h6" fontWeight={800}>规则列表</Typography>
                  <Table>
                    <TableHead><TableRow><TableCell>名称</TableCell><TableCell>类型</TableCell><TableCell>分值</TableCell><TableCell align="right">操作</TableCell></TableRow></TableHead>
                    <TableBody>
                      {filteredRules.map((rule) => (
                        <TableRow key={rule.id} hover>
                          <TableCell>{rule.name}</TableCell>
                          <TableCell>{rule.type === 'ADD' ? '加分' : '扣分'}</TableCell>
                          <TableCell>{rule.type === 'ADD' ? '+' : '-'}{rule.score_value}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <IconButton onClick={() => setRuleForm(rule)}><EditIcon /></IconButton>
                              <IconButton color="error" onClick={() => deleteRule(rule.id)}><DeleteIcon /></IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent></Card>
              </Grid>
            </Grid>
          ) : null}

          {tab === 3 ? (
            <Card><CardContent>
              <Typography variant="h6" fontWeight={800}>用户管理</Typography>
              <Divider sx={{ my: 2 }} />
              <Table>
                <TableHead><TableRow><TableCell>用户名</TableCell><TableCell>角色</TableCell><TableCell>创建时间</TableCell><TableCell align="right">操作</TableCell></TableRow></TableHead>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const canOperate = currentRole === 'SUPER_ADMIN' || (currentRole === 'TEACHER' && user.role === 'OFFICER');
                    return (
                      <TableRow key={user.id} hover>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{roleLabels[user.role]}</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleString('zh-CN')}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <IconButton disabled={!canOperate} onClick={() => startEditUser(user.id)}><EditIcon /></IconButton>
                            <IconButton color="error" disabled={!canOperate || user.id === session.user.id} onClick={() => deleteUser(user.id)}><DeleteIcon /></IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent></Card>
          ) : null}

          {tab === 4 ? (
            <Card><CardContent>
              <Typography variant="h6" fontWeight={800}>流水明细（撤销保留痕迹）</Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1.5}>
                {(summary?.scoreRecords ?? []).map((record) => (
                  <Stack key={record.id} direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ md: 'center' }} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>

                    <Box>
                      <Typography>
                        {record.student_id === 0 ? '班级总分' : `${studentMap[record.student_id] ?? `学生ID ${record.student_id}`}`} / {record.reason} / 变动 {record.change_value > 0 ? `+${record.change_value}` : record.change_value} 分
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        操作人：{userMap[record.operator_id] ?? `用户ID ${record.operator_id}`} · 创建于 {new Date(record.created_at).toLocaleString('zh-CN')} {record.is_revoked ? `· 已撤销：${record.revoke_reason ?? ''}` : ''}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {record.is_revoked ? <Chip label="已撤销" /> : <Button variant="outlined" disabled={!canRevoke} onClick={() => revokeRecord(record.id)}>撤销</Button>}
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </CardContent></Card>
          ) : null}

          {tab === 5 ? (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 3 }}>
                <Card><CardContent>
                  <Typography variant="h6" fontWeight={800} gutterBottom>系统设置</Typography>
                  <List disablePadding>
                    {settingsSections.map((section) => (
                      <ListItemButton
                        key={section.id}
                        selected={settingsSection === section.id}
                        onClick={() => setSettingsSection(section.id)}
                        sx={{ borderRadius: 1, mb: 1 }}
                      >
                        <ListItemText primary={section.label} />
                      </ListItemButton>
                    ))}
                  </List>
                </CardContent></Card>
              </Grid>
              <Grid size={{ xs: 12, md: 9 }}>
                {settingsSection === 'display' ? (
                  <Card><CardContent><Stack spacing={2}>
                    <Typography variant="h6" fontWeight={800}>展示设置</Typography>
                    {Object.entries(dashboardSettings.modules).map(([key, value]) => (
                      <Stack key={key} direction="row" justifyContent="space-between" alignItems="center">
                        <Typography>{layoutLabels[key] ?? key}</Typography>
                        <Switch checked={value} onChange={(e) => setDashboardSettings((prev) => ({ ...prev, modules: { ...prev.modules, [key]: e.target.checked } }))} disabled={!canManageSystem} />
                      </Stack>
                    ))}
                    <TextField select label="背景类型" value={dashboardSettings.backgroundType} onChange={(e) => setDashboardSettings((prev) => ({ ...prev, backgroundType: e.target.value as DashboardSettings['backgroundType'] }))} disabled={!canManageSystem}>
                      <MenuItem value="gradient">渐变背景</MenuItem>
                      <MenuItem value="image">背景图</MenuItem>
                      <MenuItem value="video">背景视频</MenuItem>
                    </TextField>
                    <TextField label="背景值（URL 或渐变字符串）" value={dashboardSettings.backgroundValue} onChange={(e) => setDashboardSettings((prev) => ({ ...prev, backgroundValue: e.target.value }))} disabled={!canManageSystem} />
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography>背景蒙版透明度</Typography>
                        <Chip size="small" label={`${Math.round(dashboardSettings.overlayOpacity * 100)}%`} />
                      </Stack>
                      <Slider
                        value={dashboardSettings.overlayOpacity}
                        min={0}
                        max={1}
                        step={0.01}
                        marks={[
                          { value: 0, label: '0%' },
                          { value: 0.5, label: '50%' },
                          { value: 1, label: '100%' },
                        ]}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value) => `${Math.round(Number(value) * 100)}%`}
                        onChange={(_event, value) => setDashboardSettings((prev) => ({ ...prev, overlayOpacity: Number(value) }))}
                        disabled={!canManageSystem}
                      />
                    </Box>
                    <Button startIcon={<SaveIcon />} variant="contained" onClick={() => saveDashboard()} disabled={!canManageSystem}>保存展示设置</Button>

                  </Stack></CardContent></Card>
                ) : null}
                {settingsSection === 'ranking' ? (
                  <Card><CardContent><Stack spacing={2}>
                    <Typography variant="h6" fontWeight={800}>排行榜设置</Typography>
                    <TextField label="排行榜人数" type="number" value={dashboardSettings.rankingSize} onChange={(e) => setDashboardSettings((prev) => ({ ...prev, rankingSize: Number(e.target.value) }))} disabled={!canManageSystem} />
                    <TextField label="末位提醒人数" type="number" value={dashboardSettings.reminderSize} onChange={(e) => setDashboardSettings((prev) => ({ ...prev, reminderSize: Number(e.target.value) }))} disabled={!canManageSystem} />
                    <Button startIcon={<SaveIcon />} variant="contained" onClick={() => saveDashboard()} disabled={!canManageSystem}>保存排行榜设置</Button>
                  </Stack></CardContent></Card>
                ) : null}
                {settingsSection === 'layout' ? (

                  <Card><CardContent><Stack spacing={2}>
                    <Typography variant="h6" fontWeight={800}>真正拖拽式布局编辑</Typography>
                    <Alert severity="info">在下方画布中直接拖动模块卡片位置，保存后大屏将按坐标与尺寸真实渲染。</Alert>
                    <Box
                      ref={layoutEditorRef}
                      onPointerMove={handleLayoutPointerMove}
                      onPointerUp={handleLayoutPointerUp}
                      onPointerLeave={handleLayoutPointerUp}
                      sx={{
                        position: 'relative',
                        height: layoutRows * GRID_ROW_HEIGHT,
                        borderRadius: 4,
                        overflow: 'hidden',
                        backgroundColor: theme.palette.mode === 'dark' ? '#0f172a' : '#e2e8f0',
                        backgroundImage: theme.palette.mode === 'dark'
                          ? 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)'
                          : 'linear-gradient(rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.08) 1px, transparent 1px)',
                        backgroundSize: `calc(100% / ${GRID_COLUMNS}) ${GRID_ROW_HEIGHT}px`,
                      }}
                    >

                      {dashboardSettings.layout.map(renderLayoutEditorItem)}
                    </Box>
                    <TextField
                      label="粘贴 JSON 进行导入"
                      multiline
                      minRows={5}
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      disabled={!canManageSystem}
                    />
                    <Button variant="outlined" onClick={() => importJsonText(importText)} disabled={!canManageSystem || !importText.trim()}>从文本导入 JSON</Button>
                  </Stack></CardContent></Card>
                ) : null}
              </Grid>
            </Grid>
          ) : null}

        </Stack>
      </Container>

      <Dialog open={createUserOpen} onClose={() => setCreateUserOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{userForm.id ? '编辑系统用户' : '创建系统用户'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="用户名" value={userForm.username} onChange={(e) => setUserForm((prev) => ({ ...prev, username: e.target.value }))} />
            <TextField label={userForm.id ? '新密码（留空则不改）' : '密码'} type="password" value={userForm.password} onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))} />
            <TextField select label="角色" value={userForm.role} onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value as UserRole }))} disabled={session.user.role !== 'SUPER_ADMIN'}>
              <MenuItem value="OFFICER">班干部</MenuItem>
              <MenuItem value="TEACHER">老师</MenuItem>
              <MenuItem value="SUPER_ADMIN">超级管理员</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateUserOpen(false)}>取消</Button>
          <Button variant="contained" onClick={saveUser}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
