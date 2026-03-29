import '../src/i18n/i18n';

import { Stack } from 'expo-router';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { AuthProvider } from '../contexts/AuthContext';
import { initSentry, Sentry } from '../lib/sentry';
import { ThemeProvider } from '../theme';

initSentry();

function RootLayout() {
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

export default Sentry.wrap(RootLayout);
