import { Router } from 'express';
import { requirePermission } from '../../auth/middleware';
import { repository } from '../../data/repository';
import { ruleSchema } from '../../validation/schemas';

export const rulesRouter = Router();

rulesRouter.post('/rules', requirePermission('rules:manage'), async (req, res) => {
  const parsed = ruleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? '规则参数错误。' });
    return;
  }
  res.json(await repository.saveRule(parsed.data, undefined, req.authUser?.id));
});

rulesRouter.put('/rules/:id', requirePermission('rules:manage'), async (req, res) => {
  const parsed = ruleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? '规则参数错误。' });
    return;
  }
  res.json(await repository.saveRule(parsed.data, Number(req.params.id), req.authUser?.id));
});

rulesRouter.delete('/rules/:id', requirePermission('rules:manage'), async (req, res) => {
  res.json(await repository.deleteRule(Number(req.params.id), req.authUser?.id));
});
