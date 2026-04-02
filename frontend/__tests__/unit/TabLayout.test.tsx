import React from 'react';
import { render } from '@testing-library/react-native';

import TabLayout from '../../app/(tabs)/_layout';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        iconActive: '#2563EB',
        iconInactive: '#9CA3AF',
        surface: '#FFFFFF',
        text: '#111827',
      },
    },
  }),
}));

// Capture Tabs.Screen props for assertion
const mockScreenProps: Array<{ name: string; options: Record<string, unknown> }> = [];

jest.mock('expo-router', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  function MockTabs({ children, screenOptions }: { children: React.ReactNode; screenOptions: Record<string, unknown> }) {
    return (
      <View testID="tabs-container" accessibilityHint={JSON.stringify(screenOptions)}>
        {children}
      </View>
    );
  }

  function MockScreen(props: { name: string; options: Record<string, unknown> }) {
    mockScreenProps.push({ name: props.name, options: props.options });
    // Invoke tabBarIcon to exercise the icon render callback
    const icon = typeof props.options?.tabBarIcon === 'function'
      ? props.options.tabBarIcon({ color: '#000', size: 24 })
      : null;
    return (
      <View testID={`tab-${props.name}`}>
        <Text>{props.options?.title as string}</Text>
        {icon}
      </View>
    );
  }

  MockTabs.Screen = MockScreen;
  return { Tabs: MockTabs };
});

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, size, color }: { name: string; size: number; color: string }) => (
      <Text testID={`icon-${name}`}>{name}</Text>
    ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockScreenProps.length = 0;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TabLayout', () => {
  it('renders 4 tab screens', () => {
    render(<TabLayout />);
    expect(mockScreenProps).toHaveLength(4);
  });

  it('includes scan, wishlist, my-books, and settings tabs', () => {
    render(<TabLayout />);
    const names = mockScreenProps.map((s) => s.name);
    expect(names).toEqual(['scan', 'wishlist', 'my-books', 'settings']);
  });

  it('tab titles use i18n keys', () => {
    render(<TabLayout />);
    const titles = mockScreenProps.map((s) => s.options.title);
    // react-i18next mock returns the key itself
    expect(titles).toEqual(['Scan', 'Wishlist', 'My Books', 'Settings']);
  });

  it('applies theme colors to tab bar via screenOptions', () => {
    const { getByTestId } = render(<TabLayout />);
    const container = getByTestId('tabs-container');
    const screenOptions = JSON.parse(container.props.accessibilityHint);
    expect(screenOptions.tabBarActiveTintColor).toBe('#2563EB');
    expect(screenOptions.tabBarInactiveTintColor).toBe('#9CA3AF');
    expect(screenOptions.tabBarStyle.backgroundColor).toBe('#FFFFFF');
  });
});
