import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function LoginScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text
        style={{ color: theme.colors.text, fontSize: theme.typography.fontSizeXL }}
        accessibilityRole="header"
      >
        Bookshelf
      </Text>
      {/* Google SSO — Phase 3 */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
