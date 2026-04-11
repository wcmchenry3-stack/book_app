import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
      <MaterialIcons name="dark-mode" size={22} color={theme.colors.primary} />
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
