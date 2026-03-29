// Initialize i18n with English resources before every test.
// en translations are bundled as static imports and available synchronously;
// components calling useTranslation() will get the correct English strings.
import './src/i18n/i18n';

// RNTL v13 defaults to concurrentRoot:true (React 18 concurrent mode), which
// causes act() to hang on Linux CI when async state updates come from Promise
// callbacks fired outside of act. Disable it globally so tests run in the
// same legacy root mode as v12.
import { configure } from '@testing-library/react-native';
configure({ concurrentRoot: false });
