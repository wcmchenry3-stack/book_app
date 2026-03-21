import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggleButton() {
  const { theme, mode, toggleTheme } = useTheme();

  return (
    <Pressable
      onPress={toggleTheme}
      style={styles.button}
      accessibilityLabel={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      accessibilityRole="button"
      hitSlop={8}
    >
      <Ionicons
        name={mode === 'light' ? 'moon-outline' : 'sunny-outline'}
        size={22}
        color={theme.colors.iconActive}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
