import type { Request, Response, NextFunction } from 'express';
import { getSession } from './session-store';
import { hasPermission } from './permissions';
import type { UserEntity } from '../../../shared/types';

declare global {
  namespace Express {
    interface Request {
      authUser?: UserEntity;
      authToken?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ message: '未登录或登录已失效。' });
    return;
  }

  const session = getSession(token);
  if (!session) {
    res.status(401).json({ message: '会话不存在，请重新登录。' });
    return;
  }

  req.authUser = session.user;
  req.authToken = token;
  next();
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.authUser;
    if (!user) {
      res.status(401).json({ message: '未登录。' });
      return;
    }
    if (!hasPermission(user.role, permission)) {
      res.status(403).json({ message: '当前角色无权执行此操作。' });
      return;
    }
    next();
  };
}

