import type { EnrichedBook } from '../components/BookCandidatePicker';

export type ScanJobType = 'image' | 'text';
export type ScanJobStatus = 'pending' | 'searching' | 'complete' | 'failed' | 'queued';

export interface ScanJob {
  id: string;
  type: ScanJobType;
  status: ScanJobStatus;
  createdAt: number;
  query?: string;
  imageUri?: string;
  results?: EnrichedBook[];
  error?: string;
  retryCount: number;
}
