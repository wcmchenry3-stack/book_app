// Initialize i18n with English resources before every test.
// en translations are bundled as static imports and available synchronously;
// components calling useTranslation() will get the correct English strings.
import './src/i18n/i18n';

// Use fake timers for every test so that RNTL v13's waitFor uses its
// fake-timer polling path (auto-advances the clock), which is more reliable
// across platforms than the real-setInterval path.
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});
