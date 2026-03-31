import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * Initialise Sentry.  Safe to call more than once — subsequent calls are
 * no-ops because the SDK ignores re-initialisation.
 *
 * Wrapped in try/catch so a native-module error during init can never
 * escalate to RCTFatal and crash the app before anything renders.
 */
export function initSentry(): void {
  if (!DSN) return;

  try {
    Sentry.init({
      dsn: DSN,
      environment: process.env.EXPO_PUBLIC_ENVIRONMENT ?? 'development',
      // Capture 20% of transactions in production to keep quota manageable
      tracesSampleRate: process.env.EXPO_PUBLIC_ENVIRONMENT === 'production' ? 0.2 : 1.0,
      sendDefaultPii: false,
      enabled: !!DSN,
    });
  } catch (e) {
    // Log but never crash — the app must boot even if Sentry is broken.
    console.error('[Sentry] init failed:', e);
  }
}

// Self-initialise on import so Sentry is ready before any other module
// evaluates.  _layout.tsx must import this file FIRST.
initSentry();

export { Sentry };
