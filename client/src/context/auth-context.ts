import { createContext, useContext } from 'react';
import type { SessionResponse } from '../types/api';

export interface AuthContextValue {
  session: SessionResponse | null;
  setSession: (session: SessionResponse | null) => void;
}

export const AuthContext = createContext<AuthContextValue>({
  session: null,
  setSession: () => undefined,
});

export function useAuth() {
  return useContext(AuthContext);
}
