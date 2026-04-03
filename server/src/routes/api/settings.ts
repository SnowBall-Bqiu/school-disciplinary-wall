import { Router } from 'express';
import { requirePermission } from '../../auth/middleware';
import { repository } from '../../data/repository';
import { dashboardSettingsSchema } from '../../validation/schemas';

export const settingsRouter = Router();

settingsRouter.put('/dashboard', requirePermission('settings:system'), async (req, res) => {

  const parsed = dashboardSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? '大屏设置参数错误。' });
    return;
  }
  res.json(await repository.saveDashboardSettings(parsed.data, req.authUser?.id));
});

settingsRouter.put('/class-info', requirePermission('class:update-name'), async (req, res) => {
  res.json(await repository.updateClassInfo({ class_name: String(req.body.class_name ?? ''), initial_class_score: Number(req.body.initial_class_score ?? 0) }, req.authUser?.id));
});

settingsRouter.post('/class-score', requirePermission('class:update-score'), async (req, res) => {
  if (!req.authUser) {
    res.status(401).json({ message: '未登录。' });
    return;
  }
  const value = Number(req.body.changeValue ?? 0);
  res.json(await repository.adjustClassScore(value, req.authUser.id, String(req.body.reason ?? '班级总分调整')));
});
