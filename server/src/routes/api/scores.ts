import { Router } from 'express';
import { requirePermission } from '../../auth/middleware';
import { repository } from '../../data/repository';
import { scoreActionSchema } from '../../validation/schemas';

export const scoresRouter = Router();

scoresRouter.post('/scores/apply', requirePermission('scores:change'), async (req, res) => {
  const parsed = scoreActionSchema.safeParse(req.body);
  if (!parsed.success || !req.authUser) {
    res.status(400).json({ message: parsed.success ? '未登录。' : parsed.error.issues[0]?.message ?? '加扣分参数错误。' });
    return;
  }
  res.json(await repository.applyScoreAction(parsed.data, req.authUser.id));
});

scoresRouter.post('/scores/:id/revoke', requirePermission('scores:revoke'), async (req, res) => {
  if (!req.authUser) {
    res.status(401).json({ message: '未登录。' });
    return;
  }
  res.json(await repository.revokeScoreRecord(Number(req.params.id), req.authUser.id, String(req.body?.revokeReason ?? '误操作撤销')));
});

scoresRouter.delete('/scores/:id', requirePermission('scores:revoke'), async (req, res) => {
  res.json(await repository.deleteScoreRecord(Number(req.params.id), req.authUser?.id));
});

