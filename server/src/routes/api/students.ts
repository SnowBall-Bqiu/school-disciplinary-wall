import { Router } from 'express';
import { requirePermission } from '../../auth/middleware';
import { repository } from '../../data/repository';
import { studentSchema } from '../../validation/schemas';

export const studentsRouter = Router();

studentsRouter.post('/students', requirePermission('students:create'), async (req, res) => {
  const parsed = studentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? '学生参数错误。' });
    return;
  }
  res.json(await repository.createStudent(parsed.data, req.authUser?.id));
});

studentsRouter.put('/students/:id', requirePermission('students:update'), async (req, res) => {
  const parsed = studentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? '学生参数错误。' });
    return;
  }
  res.json(await repository.updateStudent(Number(req.params.id), parsed.data, req.authUser?.id));
});

studentsRouter.delete('/students/:id', requirePermission('students:delete'), async (req, res) => {
  res.json(await repository.deleteStudent(Number(req.params.id), req.authUser?.id));
});
