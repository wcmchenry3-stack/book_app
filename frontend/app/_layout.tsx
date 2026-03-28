import '../src/i18n/i18n';

import { Stack } from 'expo-router';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../theme';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Stack
            screenOptions={{
              headerRight: () => <ThemeToggleButton />,
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
