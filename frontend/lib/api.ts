import axios from 'axios';

import { Sentry } from './sentry';
import * as storage from './storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8001';

export const ACCESS_TOKEN_KEY = 'bookshelf_access_token';
export const REFRESH_TOKEN_KEY = 'bookshelf_refresh_token';

let onAuthFailure: (() => void) | null = null;

// AuthProvider registers its logout function here on mount to avoid circular imports.
export function setAuthFailureCallback(cb: () => void) {
  onAuthFailure = cb;
}

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Inject access token on every request and add Sentry breadcrumb
api.interceptors.request.use(async (config) => {
  Sentry.addBreadcrumb({
    category: 'http',
    message: `${(config.method ?? 'GET').toUpperCase()} ${config.url}`,
    level: 'info',
  });
  const token = await storage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401: attempt token refresh once, then give up
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          await storage.setItem(ACCESS_TOKEN_KEY, data.access_token);
          await storage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          await storage.deleteItem(ACCESS_TOKEN_KEY);
          await storage.deleteItem(REFRESH_TOKEN_KEY);
          onAuthFailure?.();
        }
      }
    }
    return Promise.reject(error);
  }
);
