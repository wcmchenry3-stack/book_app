import React from 'react';
import { renderHook, act } from '@testing-library/react-native';

import {
  BannerProvider,
  BannerContext,
  BannerConfig,
} from '../../contexts/BannerContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BannerProvider>{children}</BannerProvider>
);

function useBannerContext() {
  return React.useContext(BannerContext);
}

describe('BannerContext', () => {
  it('has null banner by default', () => {
    const { result } = renderHook(() => useBannerContext(), { wrapper });
    expect(result.current.banner).toBeNull();
  });

  it('showBanner sets banner state', () => {
    const { result } = renderHook(() => useBannerContext(), { wrapper });

    const config: BannerConfig = {
      message: 'Book added!',
      type: 'success',
    };

    act(() => {
      result.current.showBanner(config);
    });

    expect(result.current.banner).toEqual(config);
  });

  it('hideBanner clears banner state', () => {
    const { result } = renderHook(() => useBannerContext(), { wrapper });

    act(() => {
      result.current.showBanner({ message: 'Test', type: 'info' });
    });
    expect(result.current.banner).not.toBeNull();

    act(() => {
      result.current.hideBanner();
    });
    expect(result.current.banner).toBeNull();
  });

  it('showBanner with actions preserves action config', () => {
    const { result } = renderHook(() => useBannerContext(), { wrapper });

    const onPress = jest.fn();
    const config: BannerConfig = {
      message: 'Error occurred',
      type: 'error',
      actions: [{ label: 'Retry', onPress }],
      duration: 5000,
    };

    act(() => {
      result.current.showBanner(config);
    });

    expect(result.current.banner?.actions).toHaveLength(1);
    expect(result.current.banner?.actions?.[0].label).toBe('Retry');
    expect(result.current.banner?.duration).toBe(5000);
  });

  it('default context provides no-op functions', () => {
    // Render without provider — uses default context value
    const { result } = renderHook(() => useBannerContext());
    expect(result.current.banner).toBeNull();
    // Should not throw
    act(() => {
      result.current.showBanner({ message: 'test', type: 'info' });
    });
    act(() => {
      result.current.hideBanner();
    });
  });
});
