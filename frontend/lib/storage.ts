import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// In-memory store for the web platform. localStorage is accessible to any
// JavaScript running in the page (XSS), so we use a module-level Map instead.
// Trade-off: tokens are lost on page refresh, requiring re-authentication via
// Google. AuthContext handles this gracefully — on mount it finds no stored
// token and redirects to the login screen.
const _webStore = new Map<string, string>();

export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return _webStore.get(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    _webStore.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    _webStore.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
