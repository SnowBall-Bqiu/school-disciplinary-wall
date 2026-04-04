import { Router } from 'express';
import { repository } from '../../data/repository';
import { updateUserSchema, userSchema } from '../../validation/schemas';
import { canManageTargetUser } from './helpers';
import { requirePermission } from '../../auth/middleware';

export const usersRouter = Router();

usersRouter.post('/users', requirePermission('users:create:any'), async (req, res, next) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? '用户参数错误。' });
    return;
  }
  try {
    res.json(await repository.createUser(parsed.data, req.authUser?.id));
  } catch (error) {
    next(error);
  }
});

usersRouter.post('/users/officer', requirePermission('users:create:officer'), async (req, res, next) => {
  const parsed = userSchema.safeParse({ ...req.body, role: 'OFFICER' });
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? '班干部参数错误。' });
    return;
  }
  try {
    res.json(await repository.createUser(parsed.data, req.authUser?.id));
  } catch (error) {
    next(error);
  }
});

usersRouter.put('/users/:id', requirePermission('users:update'), async (req, res, next) => {
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
    res.json(await repository.updateUser(id, parsed.data, req.authUser?.id));
  } catch (error) {
    next(error);
  }
});

usersRouter.delete('/users/:id', requirePermission('users:delete'), async (req, res) => {
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
  res.json(await repository.deleteUser(id, req.authUser?.id));
});
