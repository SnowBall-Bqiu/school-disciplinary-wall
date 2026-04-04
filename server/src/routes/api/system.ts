import { Router } from 'express';
import { requirePermission } from '../../auth/middleware';
import { repository } from '../../data/repository';

export const systemRouter = Router();

systemRouter.get('/summary', async (_req, res) => {
  res.json(await repository.getSummary());
});

systemRouter.get('/export', requirePermission('settings:system'), async (req, res) => {
  const operatorId = req.authUser!.id;
  await repository.logOperation(operatorId, 'EXPORT', 'system', null, '导出数据');
  res.json({ exportedAt: new Date().toISOString(), data: await repository.exportData(operatorId) });
});

systemRouter.post('/storage-mode', requirePermission('settings:system'), async (req, res) => {
  const mode = req.body?.mode;
  if (mode !== 'sqlite' && mode !== 'sqljs') {
    res.status(400).json({ message: '存储模式必须为 sqlite 或 sqljs。' });
    return;
  }
  const operatorId = req.authUser!.id;
  await repository.logOperation(operatorId, 'UPDATE', 'settings', null, `切换存储模式为: ${mode}`);
  await repository.setStorageMode(mode);
  res.json(await repository.getSummary());
});

systemRouter.post('/reset', requirePermission('data:reset'), async (req, res) => {
  res.json(await repository.resetAll(req.authUser?.id));
});

systemRouter.post('/import', requirePermission('settings:system'), async (req, res) => {
  try {
    const payload = req.body?.data;
    if (!payload) {
      res.status(400).json({ message: '缺少导入数据。' });
      return;
    }
    res.json(await repository.importData(payload, req.authUser?.id));
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : '导入失败。' });
  }
});
