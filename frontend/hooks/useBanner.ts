import { useContext } from 'react';
import { BannerContext } from '../contexts/BannerContext';

export function useBanner() {
  return useContext(BannerContext);
}
