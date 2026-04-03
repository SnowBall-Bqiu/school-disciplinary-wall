import { Router } from 'express';
import { requirePermission } from '../../auth/middleware';
import { repository } from '../../data/repository';

export const logsRouter = Router();

logsRouter.get('/', requirePermission('logs:read'), async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const offset = Number(req.query.offset ?? 0);
  const result = await repository.getOperationLogs(limit, offset);
  res.json(result);
});

logsRouter.get('/:id', requirePermission('logs:read'), async (req, res) => {
  const id = Number(req.params.id);
  const log = await repository.getOperationLogById(id);
  if (!log) {
    res.status(404).json({ message: '操作日志不存在。' });
    return;
  }
  res.json(log);
});

logsRouter.post('/:id/rollback', requirePermission('logs:rollback'), async (req, res) => {
  if (!req.authUser) {
    res.status(401).json({ message: '未登录。' });
    return;
  }
  const id = Number(req.params.id);
  const success = await repository.rollbackOperation(id, req.authUser.id);
  if (!success) {
    res.status(400).json({ message: '回滚失败，可能是不支持的操作类型或操作已被回滚。' });
    return;
  }
  res.json({ message: '回滚成功。' });
});

logsRouter.post('/:id/cancel-rollback', requirePermission('logs:rollback'), async (req, res) => {
  if (!req.authUser) {
    res.status(401).json({ message: '未登录。' });
    return;
  }
  const id = Number(req.params.id);
  const success = await repository.cancelRollback(id, req.authUser.id);
  if (!success) {
    res.status(400).json({ message: '取消回滚失败，可能是不支持的操作类型或无法取消。' });
    return;
  }
  res.json({ message: '取消回滚成功。' });
});

logsRouter.delete('/batch', requirePermission('logs:delete'), async (req, res) => {
  if (!req.authUser) {
    res.status(401).json({ message: '未登录。' });
    return;
  }
  const { ids } = req.body as { ids: number[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ message: '请提供要删除的日志ID列表。' });
    return;
  }
  const success = await repository.deleteOperationLogs(ids);
  if (!success) {
    res.status(400).json({ message: '批量删除失败。' });
    return;
  }
  res.json({ message: `成功删除 ${ids.length} 条日志。` });
});

logsRouter.delete('/:id', requirePermission('logs:delete'), async (req, res) => {
  if (!req.authUser) {
    res.status(401).json({ message: '未登录。' });
    return;
  }
  const id = Number(req.params.id);
  const success = await repository.deleteOperationLog(id);
  if (!success) {
    res.status(400).json({ message: '删除失败，可能是日志不存在。' });
    return;
  }
  res.json({ message: '删除成功。' });
});
