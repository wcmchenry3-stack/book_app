import React, { createContext, useCallback, useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';

import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, api } from '../lib/api';
import * as storage from '../lib/storage';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // Check for stored token on mount
  useEffect(() => {
    storage.getItem(ACCESS_TOKEN_KEY).then((token) => {
      setIsAuthenticated(!!token);
      setIsLoading(false);
    });
  }, []);

  // Redirect based on auth state
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/my-books');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  const login = useCallback(async (idToken: string) => {
    const { data } = await api.post('/auth/google', { id_token: idToken });
    await storage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    await storage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await storage.deleteItem(ACCESS_TOKEN_KEY);
    await storage.deleteItem(REFRESH_TOKEN_KEY);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
