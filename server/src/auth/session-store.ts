import type { UserSession } from '../../../shared/types';

const sessionStore = new Map<string, UserSession>();
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24小时过期

// 定期清理过期会话（每30分钟）
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessionStore.entries()) {
    if (now - session.createdAt > SESSION_TIMEOUT_MS) {
      sessionStore.delete(token);
    }
  }
}, 30 * 60 * 1000);

export function saveSession(session: UserSession) {
  sessionStore.set(session.token, { ...session, createdAt: Date.now() });
  return session;
}

export function getSession(token: string) {
  return sessionStore.get(token) ?? null;
}

export function clearSession(token: string) {
  sessionStore.delete(token);
}

export function clearAllSessions() {
  sessionStore.clear();
}

