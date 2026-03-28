import React from 'react';
import { render } from '@testing-library/react-native';

import SettingsScreen from '../../app/(tabs)/settings';

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: { background: '#fff', text: '#000' },
      spacing: { md: 16 },
    },
  }),
}));

jest.mock('../../components/ThemeToggleButton', () => ({
  ThemeToggleButton: () => null,
}));

describe('SettingsScreen', () => {
  it('renders the settings heading', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Settings')).toBeTruthy();
  });
});
