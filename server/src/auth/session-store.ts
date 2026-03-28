import type { UserSession } from '../../../shared/types';

const sessionStore = new Map<string, UserSession>();

export function saveSession(session: UserSession) {
  sessionStore.set(session.token, session);
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

