import { Platform } from 'react-native';
import { saveJobs, loadJobs, clearJobs } from '../../lib/scanJobStorage';
import type { ScanJob } from '../../lib/scanJob';

// Force web platform so we use the in-memory store (no AsyncStorage needed).
beforeAll(() => {
  Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
});

afterAll(() => {
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
});

const sampleJob: ScanJob = {
  id: 'test-1',
  type: 'text',
  status: 'queued',
  createdAt: 1234567890,
  query: 'Dune',
  retryCount: 0,
};

describe('scanJobStorage', () => {
  beforeEach(async () => {
    await clearJobs();
  });

  it('round-trips save and load', async () => {
    await saveJobs([sampleJob]);
    const loaded = await loadJobs();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('test-1');
    expect(loaded[0].query).toBe('Dune');
  });

  it('returns empty array when nothing stored', async () => {
    const loaded = await loadJobs();
    expect(loaded).toEqual([]);
  });

  it('strips results from persisted jobs to save space', async () => {
    const jobWithResults: ScanJob = {
      ...sampleJob,
      status: 'complete',
      results: [
        {
          title: 'Dune',
          author: 'Herbert',
          subjects: [],
          confidence: 0.9,
          already_in_library: false,
          editions: [],
        },
      ],
    };
    await saveJobs([jobWithResults]);
    const loaded = await loadJobs();
    expect(loaded[0].results).toBeUndefined();
  });

  it('clearJobs removes all stored data', async () => {
    await saveJobs([sampleJob]);
    await clearJobs();
    const loaded = await loadJobs();
    expect(loaded).toEqual([]);
  });

  it('handles multiple jobs', async () => {
    const jobs = [sampleJob, { ...sampleJob, id: 'test-2', query: 'Foundation' }];
    await saveJobs(jobs);
    const loaded = await loadJobs();
    expect(loaded).toHaveLength(2);
  });
});
