import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import { dashboardRouter } from './api/dashboard';
import { settingsRouter } from './api/settings';
import { rulesRouter } from './api/rules';
import { scoresRouter } from './api/scores';
import { studentsRouter } from './api/students';
import { systemRouter } from './api/system';
import { usersRouter } from './api/users';
import { logsRouter } from './api/logs';

export const apiRouter = Router();

apiRouter.use(dashboardRouter);
apiRouter.use(requireAuth);
apiRouter.use(systemRouter);
apiRouter.use(usersRouter);
apiRouter.use(studentsRouter);
apiRouter.use(rulesRouter);
apiRouter.use(scoresRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/logs', logsRouter);

