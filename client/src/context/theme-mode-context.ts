import { createContext, useContext } from 'react';

export type ThemeModePreference = 'system' | 'light' | 'dark';

export interface ThemeModeContextValue {
  preference: ThemeModePreference;
  resolvedMode: 'light' | 'dark';
  setPreference: (mode: ThemeModePreference) => void;
}

export const ThemeModeContext = createContext<ThemeModeContextValue>({
  preference: 'system',
  resolvedMode: 'light',
  setPreference: () => undefined,
});

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
