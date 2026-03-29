import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry(): void {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: process.env.EXPO_PUBLIC_ENVIRONMENT ?? 'development',
    // Capture 20% of transactions in production to keep quota manageable
    tracesSampleRate: process.env.EXPO_PUBLIC_ENVIRONMENT === 'production' ? 0.2 : 1.0,
    sendDefaultPii: false,
    enabled: !!DSN,
  });
}

export { Sentry };
