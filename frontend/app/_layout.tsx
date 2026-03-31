// Sentry MUST be the first import — its module self-initialises so the
// native crash reporter is ready before any other module can throw.
import { Sentry } from '../lib/sentry';

import '../src/i18n/i18n';

import { Stack } from 'expo-router';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../theme';

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
