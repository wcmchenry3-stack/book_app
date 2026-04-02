// Sentry MUST be the first import — its module self-initialises so the
// native crash reporter is ready before any other module can throw.
import { Sentry } from '../lib/sentry';

// Record that the root layout module has evaluated — helps diagnose
// crashes that happen between Sentry init and first render.
Sentry.addBreadcrumb({
  category: 'app.lifecycle',
  message: 'Root layout module evaluated',
  level: 'info',
});

import '../src/i18n/i18n';

import { Stack } from 'expo-router';

import { BookCandidatePicker } from '../components/BookCandidatePicker';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { InAppBanner } from '../components/InAppBanner';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { AuthProvider } from '../contexts/AuthContext';
import { BannerProvider } from '../contexts/BannerContext';
import { ScanJobProvider } from '../contexts/ScanJobContext';
import { useScanJobs } from '../hooks/useScanJobs';
import { ThemeProvider } from '../theme';

function GlobalBookPicker() {
  const { reviewingJob, dismissReview, handleSelectBook } = useScanJobs();

  return (
    <BookCandidatePicker
      visible={reviewingJob !== null}
      candidates={reviewingJob?.results ?? []}
      onSelect={handleSelectBook}
      onDismiss={dismissReview}
    />
  );
}

function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BannerProvider>
          <AuthProvider>
            <ScanJobProvider>
              <InAppBanner />
              <Stack
                screenOptions={{
                  headerRight: () => <ThemeToggleButton />,
                }}
              />
              <GlobalBookPicker />
            </ScanJobProvider>
          </AuthProvider>
        </BannerProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
