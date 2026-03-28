import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ThemeToggleButton } from '../../components/ThemeToggleButton';

const mockToggleTheme = jest.fn();

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: { colors: { iconActive: '#000' } },
    mode: 'light',
    toggleTheme: mockToggleTheme,
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('ThemeToggleButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders with light-mode accessibility label', () => {
    const { getByRole } = render(<ThemeToggleButton />);
    expect(getByRole('button', { name: 'Switch to dark mode' })).toBeTruthy();
  });

  it('calls toggleTheme when pressed', () => {
    const { getByRole } = render(<ThemeToggleButton />);
    fireEvent.press(getByRole('button'));
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });
});
