// Initialize i18n with English resources before every test.
// This ensures components that call useTranslation() return the English
// strings that existing tests assert against (e.g. getByText('Bookshelf')).
import './src/i18n/i18n';
