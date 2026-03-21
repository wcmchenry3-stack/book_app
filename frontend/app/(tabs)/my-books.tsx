import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export default function MyBooksScreen() {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={{ color: theme.colors.text }}>My Books — coming in Phase 5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
