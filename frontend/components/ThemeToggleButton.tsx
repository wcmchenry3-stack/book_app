import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../hooks/useTheme';

export function ThemeToggleButton() {
  const { theme, mode, toggleTheme } = useTheme();
  const { t } = useTranslation('components');

  return (
    <Pressable
      onPress={toggleTheme}
      style={styles.button}
      accessibilityLabel={mode === 'light' ? t('themeToggle.toDark') : t('themeToggle.toLight')}
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
