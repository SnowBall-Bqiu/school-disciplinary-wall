import { Router } from 'express';
import { repository } from '../data/repository';
import { initSchema, loginSchema } from '../validation/schemas';
import { clearSession, saveSession } from '../auth/session-store';
import { generateToken } from '../utils/security';
import { requireAuth } from '../auth/middleware';

export const authRouter = Router();

authRouter.get('/status', async (_req, res) => {
  const summary = await repository.getSummary();
  res.json({ initialized: summary.initialized, storageMode: summary.storageMode });
});

authRouter.post('/initialize', async (req, res) => {
  const result = initSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? '初始化参数错误。' });
    return;
  }
  const summary = await repository.initialize(result.data);
  res.json(summary);
});

authRouter.post('/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ message: result.error.issues[0]?.message ?? '登录参数错误。' });
    return;
  }
  const user = await repository.login(result.data.username, result.data.password);
  if (!user) {
    res.status(401).json({ message: '用户名或密码错误。' });
    return;
  }
  const session = saveSession({ token: generateToken(), user });
  res.json(session);
});

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.authUser });
});

authRouter.post('/logout', requireAuth, async (req, res) => {
  if (req.authToken) {
    clearSession(req.authToken);
  }
  res.json({ success: true });
});
