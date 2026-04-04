import { useContext } from 'react';
import { ScanJobContext } from '../contexts/ScanJobContext';

export function useScanJobs() {
  return useContext(ScanJobContext);
}
