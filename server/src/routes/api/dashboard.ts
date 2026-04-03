import { Router } from 'express';
import { repository } from '../../data/repository';

export const dashboardRouter = Router();

dashboardRouter.get('/dashboard', async (_req, res) => {
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
