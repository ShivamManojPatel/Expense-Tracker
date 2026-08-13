import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { DEFAULT_THEME, applyThemeVars } from '../utils/theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user, refreshUser } = useAuth();
  const [theme, setTheme] = useState(DEFAULT_THEME);

  // Pick up the user's saved theme whenever it changes (login, refresh, reset).
  useEffect(() => {
    const saved = user?.themeColors;
    setTheme(saved && Object.keys(saved).length > 0 ? { ...DEFAULT_THEME, ...saved } : DEFAULT_THEME);
  }, [user?.themeColors]);

  // Applying is instant and fully client-side (just sets CSS variables on the root
  // element) — nothing round-trips to the server until saveTheme() is called.
  useEffect(() => {
    applyThemeVars(theme);
  }, [theme]);

  const previewTheme = useCallback((partial) => {
    setTheme((t) => ({ ...t, ...partial }));
  }, []);

  const saveTheme = useCallback(async () => {
    await api.put('/auth/theme', { themeColors: theme });
    await refreshUser();
  }, [theme, refreshUser]);

  const resetTheme = useCallback(async () => {
    setTheme(DEFAULT_THEME);
    await api.put('/auth/theme', { themeColors: null });
    await refreshUser();
  }, [refreshUser]);

  return (
    <ThemeContext.Provider value={{ theme, previewTheme, saveTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}