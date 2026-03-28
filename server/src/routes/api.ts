import { Router } from 'express';
import { requireAuth, requirePermission } from '../auth/middleware';
import { repository } from '../data/repository';
import { dashboardSettingsSchema, importSchema, ruleSchema, scoreActionSchema, studentSchema, updateUserSchema, userSchema } from '../validation/schemas';

export const apiRouter = Router();

function canManageTargetUser(currentRole: string | undefined, targetRole: string) {
  if (currentRole === 'SUPER_ADMIN') return true;
  if (currentRole === 'TEACHER') return targetRole === 'OFFICER';
  return false;
}

apiRouter.get('/dashboard', async (_req, res) => {
  const summary = await repository.getSummary();
  const dashboardSettings = await repository.getDashboardSettings();
  const studentMap = Object.fromEntries(summary.students.map((student: { id: number; name: string }) => [student.id, student.name]));
  const userMap = Object.fromEntries(summary.users.map((user: { id: number; username: string }) => [user.id, user.username]));

  res.json({
    classInfo: summary.classInfo,
    students: summary.students,
    records: summary.scoreRecords.slice(0, 20),
    dashboardSettings,
    studentMap,
    userMap,
  });
});

apiRouter.use(requireAuth);

apiRouter.get('/summary', async (_req, res) => {
  res.json(await repository.getSummary());
});

apiRouter.get('/export', requirePermission('settings:system'), async (_req, res) => {
  res.json({ exportedAt: new Date().toISOString(), data: await repository.exportData() });

});

apiRouter.post('/import', requirePermission('settings:system'), async (req, res) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? '导入数据格式错误。' });
    return;
  }
  const payload = {
    classInfo: parsed.data.classInfo,
    users: parsed.data.users.map((user) => ({ ...user, id: user.id ?? 0 })),
    students: parsed.data.students,
    scoreRules: parsed.data.scoreRules,
    scoreRecords: parsed.data.scoreRecords,
    settings: parsed.data.settings,
    storageMode: parsed.data.storageMode,
  };

  res.json(await repository.importData(payload));
});

apiRouter.post('/users', requirePermission('users:create:any'), async (req, res, next) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? '用户参数错误。' });
    return;
  }
  try {
    res.json(await repository.createUser(parsed.data));
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/users/officer', requirePermission('users:create:officer'), async (req, res, next) => {
  const parsed = userSchema.safeParse({ ...req.body, role: 'OFFICER' });
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? '班干部参数错误。' });
    return;
  }
  try {
    res.json(await repository.createUser(parsed.data));
  } catch (error) {
    next(error);
  }
});

apiRouter.put('/users/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? '用户参数错误。' });
    return;
  }
  const summary = await repository.getSummary();
  const user = summary.users.find((item: { id: number; role: string }) => item.id === id);
  if (!user) {

    res.status(404).json({ message: '用户不存在。' });
    return;
  }
  if (!canManageTargetUser(req.authUser?.role, user.role) || !canManageTargetUser(req.authUser?.role, parsed.data.role)) {
    res.status(403).json({ message: '无权修改该用户。' });
    return;
  }
  try {
    res.json(await repository.updateUser(id, parsed.data));
  } catch (error) {
    next(error);
  }
});

apiRouter.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  const summary = await repository.getSummary();
  const user = summary.users.find((item: { id: number; role: string }) => item.id === id);
  if (!user) {
    res.status(404).json({ message: '用户不存在。' });
    return;
  }
  if (!canManageTargetUser(req.authUser?.role, user.role)) {
    res.status(403).json({ message: '无权删除该用户。' });
    return;
  }
  res.json(await repository.deleteUser(id));
});


apiRouter.post('/students', requirePermission('students:create'), async (req, res) => {
  const parsed = studentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? '学生参数错误。' });
    return;
  }
  res.json(await repository.createStudent(parsed.data));
});

apiRouter.put('/students/:id', requirePermission('students:update'), async (req, res) => {
  const parsed = studentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? '学生参数错误。' });
    return;
  }
  res.json(await repository.updateStudent(Number(req.params.id), parsed.data));
});

apiRouter.delete('/students/:id', requirePermission('students:delete'), async (req, res) => {
  res.json(await repository.deleteStudent(Number(req.params.id)));
});

apiRouter.post('/rules', requirePermission('rules:manage'), async (req, res) => {
  const parsed = ruleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? '规则参数错误。' });
    return;
  }
  res.json(await repository.saveRule(parsed.data));
});

apiRouter.put('/rules/:id', requirePermission('rules:manage'), async (req, res) => {
  const parsed = ruleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? '规则参数错误。' });
    return;
  }
  res.json(await repository.saveRule(parsed.data, Number(req.params.id)));
});

apiRouter.delete('/rules/:id', requirePermission('rules:manage'), async (req, res) => {
  res.json(await repository.deleteRule(Number(req.params.id)));
});

apiRouter.post('/scores/apply', requirePermission('scores:change'), async (req, res) => {
  const parsed = scoreActionSchema.safeParse(req.body);
  if (!parsed.success || !req.authUser) {
    res.status(400).json({ message: parsed.success ? '未登录。' : parsed.error.issues[0]?.message ?? '加扣分参数错误。' });
    return;
  }
  res.json(await repository.applyScoreAction(parsed.data, req.authUser.id));
});

apiRouter.post('/scores/:id/revoke', requirePermission('scores:revoke'), async (req, res) => {
  if (!req.authUser) {
    res.status(401).json({ message: '未登录。' });
    return;
  }
  res.json(await repository.revokeScoreRecord(Number(req.params.id), req.authUser.id, String(req.body?.revokeReason ?? '误操作撤销')));
});

apiRouter.put('/class-info', requirePermission('class:update-name'), async (req, res) => {
  res.json(await repository.updateClassInfo({ class_name: String(req.body.class_name ?? ''), initial_class_score: Number(req.body.initial_class_score ?? 0) }));
});

apiRouter.post('/class-score', requirePermission('class:update-score'), async (req, res) => {
  if (!req.authUser) {
    res.status(401).json({ message: '未登录。' });
    return;
  }
  const value = Number(req.body.changeValue ?? 0);
  res.json(await repository.adjustClassScore(value, req.authUser.id, String(req.body.reason ?? '班级总分调整')));
});

apiRouter.put('/settings/dashboard', requirePermission('settings:system'), async (req, res) => {
  const parsed = dashboardSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? '大屏设置参数错误。' });
    return;
  }
  res.json(await repository.saveDashboardSettings(parsed.data));
});

apiRouter.post('/storage-mode', requirePermission('settings:system'), async (req, res) => {
  const mode = req.body?.mode;
  if (mode !== 'sqlite' && mode !== 'sqljs') {
    res.status(400).json({ message: '存储模式必须为 sqlite 或 sqljs。' });
    return;
  }
  await repository.setStorageMode(mode);
  res.json(await repository.getSummary());
});

apiRouter.post('/reset', requirePermission('data:reset'), async (_req, res) => {
  res.json(await repository.resetAll());
});
