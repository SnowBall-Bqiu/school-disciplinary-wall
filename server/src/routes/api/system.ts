import { Router } from 'express';
import { requirePermission } from '../../auth/middleware';
import { repository } from '../../data/repository';

export const systemRouter = Router();

systemRouter.get('/summary', async (_req, res) => {
  res.json(await repository.getSummary());
});

systemRouter.get('/export', requirePermission('settings:system'), async (req, res) => {
  await repository.logOperation(req.authUser?.id ?? 0, 'EXPORT', 'system', null, '导出数据');
  res.json({ exportedAt: new Date().toISOString(), data: await repository.exportData(req.authUser?.id) });
});

systemRouter.post('/storage-mode', requirePermission('settings:system'), async (req, res) => {
  const mode = req.body?.mode;
  if (mode !== 'sqlite' && mode !== 'sqljs') {
    res.status(400).json({ message: '存储模式必须为 sqlite 或 sqljs。' });
    return;
  }
  await repository.logOperation(req.authUser?.id ?? 0, 'UPDATE', 'settings', null, `切换存储模式为: ${mode}`);
  await repository.setStorageMode(mode);
  res.json(await repository.getSummary());
});

systemRouter.post('/reset', requirePermission('data:reset'), async (req, res) => {
  res.json(await repository.resetAll(req.authUser?.id));
});
