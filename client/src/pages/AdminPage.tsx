import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import BrightnessAutoIcon from '@mui/icons-material/BrightnessAuto';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, apiFetchWithParams } from '../lib/api';
import { useThemeMode } from '../context/theme-mode-context';
import { defaultDashboardSettings } from '@shared/defaults';
import type { DashboardSettings } from '@shared/types';
import type { ExportDataResponse, OperationLogsResponse, SessionResponse, SummaryResponse } from '../types/api';
import { roleLabels } from './admin/constants';
import { ScoreWorkbenchTab } from './admin/ScoreWorkbenchTab';
import { StudentsTab } from './admin/StudentsTab';
import { RulesTab } from './admin/RulesTab';
import { UsersTab } from './admin/UsersTab';
import { RecordsTab } from './admin/RecordsTab';
import { SettingsTab } from './admin/SettingsTab';
import { UserDialog } from './admin/UserDialog';
import type { RuleFormState, ScoreFormState, SettingsSection, StudentFormState, UserFormState } from './admin/types';
import type { OperationLogEntity } from '@shared/types';

interface AdminPageProps {
  session: SessionResponse;
  onLogout: () => void;
}

export function AdminPage({ session, onLogout }: AdminPageProps) {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [studentForm, setStudentForm] = useState<StudentFormState>({ id: 0, student_no: '', name: '', initial_score: 100 });
  const [ruleForm, setRuleForm] = useState<RuleFormState>({ id: 0, type: 'DEDUCT', name: '', score_value: 2 });
  const [scoreForm, setScoreForm] = useState<ScoreFormState>({ studentIds: [], ruleId: '', reason: '', changeValue: -2 });
  const [dashboardSettings, setDashboardSettings] = useState<DashboardSettings>(defaultDashboardSettings);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('class');
  const [userForm, setUserForm] = useState<UserFormState>({ id: 0, username: '', password: '', role: 'OFFICER' });
  const [classScoreAdjustValue, setClassScoreAdjustValue] = useState(0);
  const [classScoreAdjustReason, setClassScoreAdjustReason] = useState('');
  const [logs, setLogs] = useState<OperationLogEntity[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);

  const { preference, setPreference } = useThemeMode();
  const token = session.token;
  const currentRole = session.user.role;
  const canManageSystem = currentRole === 'SUPER_ADMIN';
  const canReset = currentRole !== 'OFFICER';
  const canRevoke = currentRole !== 'OFFICER';
  const canDeleteRecords = currentRole !== 'OFFICER';
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
    if (scoreForm.studentIds.length === 0) {
      setError('请至少选择 1 个学生。');
      return;
    }
    if (!scoreForm.reason.trim()) {
      setError('请填写加扣分原因。');
      return;
    }
    await apiFetch('/api/scores/apply', { method: 'POST', body: JSON.stringify({ ...scoreForm, ruleId: scoreForm.ruleId ? Number(scoreForm.ruleId) : null, changeValue: Number(scoreForm.changeValue) }) }, token);
    setError('');
    setScoreForm({ studentIds: [], ruleId: '', reason: '', changeValue: -2 });
    loadSummary();
  }

  async function revokeRecord(id: number) {
    await apiFetch(`/api/scores/${id}/revoke`, { method: 'POST', body: JSON.stringify({ revokeReason: '后台撤销误操作' }) }, token);
    loadSummary();
  }

  async function deleteRecord(id: number) {
    await apiFetch(`/api/scores/${id}`, { method: 'DELETE' }, token);
    loadSummary();
  }


  async function saveDashboard(nextSettings = dashboardSettings) {
    try {
      await apiFetch('/api/settings/dashboard', { method: 'PUT', body: JSON.stringify(nextSettings) }, token);
      setError('');
      loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存展示设置失败');
    }
  }

  async function updateClassInfo(className: string, initialClassScore: number) {
    await apiFetch('/api/settings/class-info', { method: 'PUT', body: JSON.stringify({ class_name: className, initial_class_score: initialClassScore }) }, token);
    loadSummary();
  }

  async function adjustClassScore() {
    if (classScoreAdjustValue === 0) {
      setError('调整分值不能为 0');
      return;
    }
    if (!classScoreAdjustReason.trim()) {
      setError('请填写调整原因');
      return;
    }
    await apiFetch('/api/settings/class-score', { method: 'POST', body: JSON.stringify({ changeValue: classScoreAdjustValue, reason: classScoreAdjustReason }) }, token);
    setClassScoreAdjustValue(0);
    setClassScoreAdjustReason('');
    setError('');
    loadSummary();
  }

  async function switchStorageMode(mode: 'sqlite' | 'sqljs') {
    await apiFetch('/api/storage-mode', { method: 'POST', body: JSON.stringify({ mode }) }, token);
    await loadSummary();
  }

  async function resetClassData() {
    await apiFetch('/api/reset', { method: 'POST' }, token);
    await loadSummary();
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

  async function logoutNow() {
    await apiFetch('/api/auth/logout', { method: 'POST' }, token).catch(() => undefined);
    localStorage.removeItem('token');
    onLogout();
  }

  async function loadLogs() {
    try {
      const result = await apiFetchWithParams<OperationLogsResponse>('/api/logs', { limit: 100, offset: 0 }, {}, token);
      setLogs(result.logs);
      setLogsTotal(result.total);
    } catch {
      // 忽略错误，操作日志加载失败不影响主功能
    }
  }

  async function rollbackLog(id: number) {
    try {
      await apiFetch(`/api/logs/${id}/rollback`, { method: 'POST' }, token);
      await Promise.all([loadLogs(), loadSummary()]);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '回滚失败');
    }
  }

  async function cancelRollbackLog(id: number) {
    try {
      await apiFetch(`/api/logs/${id}/cancel-rollback`, { method: 'POST' }, token);
      await Promise.all([loadLogs(), loadSummary()]);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '取消回滚失败');
    }
  }

  async function deleteLog(id: number) {
    try {
      await apiFetch(`/api/logs/${id}`, { method: 'DELETE' }, token);
      await loadLogs();
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '删除记录失败');
    }
  }

  async function deleteLogs(ids: number[]) {
    try {
      await apiFetch('/api/logs/batch', { method: 'DELETE', body: JSON.stringify({ ids }) }, token);
      await loadLogs();
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '批量删除记录失败');
    }
  }


  function startEditUser(id: number) {
    const target = summary?.users.find((item) => item.id === id);
    if (!target) return;
    setUserForm({ id: target.id, username: target.username, password: '', role: target.role });
    setCreateUserOpen(true);
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky">
        <Toolbar sx={{ gap: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={800}>
              {summary?.classInfo?.class_name ?? '未初始化班级'}
            </Typography>
            <Typography variant="caption" color="inherit" sx={{ opacity: 0.8 }}>
              班级总分：{summary?.classInfo?.current_class_score ?? '--'} · 管理后台
            </Typography>
          </Box>
          <Chip label={`当前角色：${roleLabels[session.user.role]}`} color="secondary" size="small" />
          <Button
            color="inherit"
            size="small"
            onClick={() => setPreference(preference === 'light' ? 'dark' : preference === 'dark' ? 'system' : 'light')}
            startIcon={preference === 'light' ? <LightModeIcon /> : preference === 'dark' ? <DarkModeIcon /> : <BrightnessAutoIcon />}
          >
            {preference === 'light' ? '浅色' : preference === 'dark' ? '深色' : '自动'}
          </Button>
          {(canManageAnyUser || canManageOfficerUser) ? <Button color="inherit" size="small" onClick={() => { resetUserForm(); setCreateUserOpen(true); }}>创建用户</Button> : null}
          <IconButton color="inherit" onClick={logoutNow} size="small"><LogoutIcon /></IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ py: 3 }}>
        <Stack spacing={3}>
          {error ? <Alert severity="error">{error}</Alert> : null}

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

          {tab === 0 ? <ScoreWorkbenchTab summary={summary} scoreForm={scoreForm} onScoreFormChange={setScoreForm} onSubmit={submitScore} /> : null}
          {tab === 1 ? <StudentsTab studentForm={studentForm} filteredStudents={filteredStudents} canDeleteStudents={canDeleteStudents} onStudentFormChange={setStudentForm} onSubmit={submitStudent} onReset={resetStudentForm} onDelete={deleteStudent} /> : null}
          {tab === 2 ? <RulesTab ruleForm={ruleForm} filteredRules={filteredRules} onRuleFormChange={setRuleForm} onSubmit={submitRule} onReset={resetRuleForm} onDelete={deleteRule} /> : null}
          {tab === 3 ? <UsersTab filteredUsers={filteredUsers} currentRole={currentRole} currentUserId={session.user.id} onEdit={startEditUser} onDelete={deleteUser} /> : null}
          {tab === 4 ? <RecordsTab records={summary?.scoreRecords ?? []} studentMap={studentMap} userMap={userMap} canRevoke={canRevoke} canDelete={canDeleteRecords} onRevoke={revokeRecord} onDelete={deleteRecord} /> : null}

          {tab === 5 ? <SettingsTab settingsSection={settingsSection} dashboardSettings={dashboardSettings} canManageSystem={canManageSystem} canReset={canReset} storageMode={summary?.storageMode ?? ''} classInfo={summary?.classInfo ?? null} classScoreAdjustValue={classScoreAdjustValue} classScoreAdjustReason={classScoreAdjustReason} onSectionChange={(section) => { setSettingsSection(section); if (section === 'logs') loadLogs(); }} onDashboardSettingsChange={setDashboardSettings} onSaveDashboard={() => saveDashboard()} onUpdateClassInfo={updateClassInfo} onClassScoreAdjustValueChange={setClassScoreAdjustValue} onClassScoreAdjustReasonChange={setClassScoreAdjustReason} onAdjustClassScore={adjustClassScore} onSwitchStorageMode={switchStorageMode} onExportJson={exportJson} onResetClassData={resetClassData} logs={logs} userMap={userMap} onRollback={rollbackLog} onCancelRollback={cancelRollbackLog} onDeleteLog={deleteLog} onDeleteLogs={deleteLogs} canRollback={canManageSystem} canDeleteLog={canManageSystem} /> : null}
        </Stack>
      </Container>

      <UserDialog open={createUserOpen} userForm={userForm} canEditRole={session.user.role === 'SUPER_ADMIN'} onClose={() => setCreateUserOpen(false)} onUserFormChange={setUserForm} onSave={saveUser} />
    </Box>
  );
}
