import React from 'react';
import { render } from '@testing-library/react-native';

import { LoadingSpinner } from '../../components/LoadingSpinner';

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: { primary: '#007AFF', textSecondary: '#888' },
      typography: { fontSizeBase: 16 },
    },
  }),
}));

describe('LoadingSpinner', () => {
  it('renders the activity indicator', () => {
    const { UNSAFE_getByType } = render(<LoadingSpinner />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows message text when provided', () => {
    const { getByText } = render(<LoadingSpinner message="Loading books…" />);
    expect(getByText('Loading books…')).toBeTruthy();
  });

  it('does not render message text when omitted', () => {
    const { queryByText } = render(<LoadingSpinner />);
    expect(queryByText(/./)).toBeNull();
  });
});
