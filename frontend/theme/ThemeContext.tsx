import React, { createContext, useCallback, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import * as storage from '../lib/storage';
import { lightTheme, type Theme } from './light';
import { darkTheme } from './dark';

const THEME_STORE_KEY = 'bookshelf_theme_preference';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  mode: 'light',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(systemScheme === 'dark' ? 'dark' : 'light');

  // Load persisted preference on mount
  useEffect(() => {
    storage.getItem(THEME_STORE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') {
        setMode(stored);
      }
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      storage.setItem(THEME_STORE_KEY, next);
      return next;
    });
  }, []);

  const theme = mode === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}
