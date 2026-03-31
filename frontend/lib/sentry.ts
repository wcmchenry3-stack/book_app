import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * Initialise the JS layer of Sentry.
 *
 * On iOS the native SDK is already started in AppDelegate.mm via
 * [RNSentrySDK start] (reading sentry.options.json).  The JS init()
 * call configures the JS-side scope/transport and is safe to call even
 * when the native layer is already running.
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
      tracesSampleRate: process.env.EXPO_PUBLIC_ENVIRONMENT === 'production' ? 0.2 : 1.0,
      sendDefaultPii: false,
      enabled: !!DSN,
      // Skip native SDK init — already handled by [RNSentrySDK start] in
      // AppDelegate.mm.  Re-initialising the native layer causes RCTFatal
      // due to duplicate observer registrations.
      autoInitializeNativeSdk: false,
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
