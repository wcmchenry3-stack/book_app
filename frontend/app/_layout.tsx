import { Stack } from 'expo-router';
import { ThemeProvider } from '../theme';
import { ThemeToggleButton } from '../components/ThemeToggleButton';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerRight: () => <ThemeToggleButton />,
        }}
      />
    </ThemeProvider>
  );
}
