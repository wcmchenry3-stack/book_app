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

describe('storage — web (in-memory, no localStorage)', () => {
  const localStorageSetSpy = jest.spyOn(mockLocalStorage, 'setItem');
  const localStorageGetSpy = jest.spyOn(mockLocalStorage, 'getItem');
  const localStorageRemoveSpy = jest.spyOn(mockLocalStorage, 'removeItem');

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  });

  it('setItem stores value in memory and never calls localStorage', async () => {
    await setItem('web-key-set', 'web-val');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(localStorageSetSpy).not.toHaveBeenCalled();
  });

  it('getItem retrieves value previously stored in memory', async () => {
    await setItem('web-key-get', 'stored');
    const result = await getItem('web-key-get');
    expect(result).toBe('stored');
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(localStorageGetSpy).not.toHaveBeenCalled();
  });

  it('getItem returns null for unknown key', async () => {
    const result = await getItem('web-key-missing');
    expect(result).toBeNull();
  });

  it('deleteItem removes the value from memory and never calls localStorage', async () => {
    await setItem('web-key-del', 'to-delete');
    await deleteItem('web-key-del');
    const result = await getItem('web-key-del');
    expect(result).toBeNull();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(localStorageRemoveSpy).not.toHaveBeenCalled();
  });
});
