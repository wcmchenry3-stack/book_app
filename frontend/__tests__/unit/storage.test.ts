import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { deleteItem, getItem, setItem } from '../../lib/storage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });

describe('storage — native (non-web)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  it('getItem delegates to SecureStore', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('val');
    const result = await getItem('key');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('key');
    expect(result).toBe('val');
  });

  it('setItem delegates to SecureStore', async () => {
    await setItem('key', 'value');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('key', 'value');
  });

  it('deleteItem delegates to SecureStore', async () => {
    await deleteItem('key');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('key');
  });
});

describe('storage — web', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  });

  it('getItem uses localStorage', async () => {
    mockLocalStorage.setItem('k', 'v');
    const result = await getItem('k');
    expect(result).toBe('v');
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  });

  it('setItem uses localStorage', async () => {
    await setItem('k', 'v');
    expect(mockLocalStorage.getItem('k')).toBe('v');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('deleteItem uses localStorage', async () => {
    mockLocalStorage.setItem('k', 'v');
    await deleteItem('k');
    expect(mockLocalStorage.getItem('k')).toBeNull();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});
