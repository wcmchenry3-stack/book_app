import { Stack } from 'expo-router';

import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../theme';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerRight: () => <ThemeToggleButton />,
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
