import { Platform } from 'react-native';
import type { ScanJob } from './scanJob';

const STORAGE_KEY = 'scan_job_queue';

// Web: in-memory only (no offline persistence needed).
const _webStore = new Map<string, string>();

async function getStorage() {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => _webStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        _webStore.set(key, value);
      },
      removeItem: (key: string) => {
        _webStore.delete(key);
      },
    };
  }
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  return AsyncStorage;
}

export async function saveJobs(jobs: ScanJob[]): Promise<void> {
  const storage = await getStorage();
  // Strip results from persisted jobs to keep storage size small.
  // Results are only useful for the current session.
  const stripped = jobs.map((j) => ({ ...j, results: undefined }));
  storage.setItem(STORAGE_KEY, JSON.stringify(stripped));
}

export async function loadJobs(): Promise<ScanJob[]> {
  try {
    const storage = await getStorage();
    const raw = await storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export async function clearJobs(): Promise<void> {
  const storage = await getStorage();
  storage.removeItem(STORAGE_KEY);
}
