import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../hooks/useTheme';
import { ThemeToggleButton } from '../../components/ThemeToggleButton';

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation('settings');
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={{ color: theme.colors.text, marginBottom: theme.spacing.md }}>
        {t('heading')}
      </Text>
      <ThemeToggleButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
