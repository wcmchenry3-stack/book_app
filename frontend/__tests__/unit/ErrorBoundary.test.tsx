import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ErrorBoundary } from '../../components/ErrorBoundary';

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('test error');
  return null;
}

describe('ErrorBoundary', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('renders children when no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(() => getByText('Something went wrong')).toThrow();
  });

  it('shows fallback UI when a child throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('The app ran into an unexpected error.')).toBeTruthy();
    expect(getByText('Try again')).toBeTruthy();
  });

  it('logs the error via componentDidCatch', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(consoleError).toHaveBeenCalledWith(
      '[ErrorBoundary] Unhandled error:',
      expect.any(Error),
      expect.anything()
    );
  });

  it('resets error state when Try again is pressed', () => {
    const { getByText, rerender } = render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    // Swap to non-throwing child first so the reset re-render succeeds
    rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );

    fireEvent.press(getByText('Try again'));

    expect(() => getByText('Something went wrong')).toThrow();
  });
});
