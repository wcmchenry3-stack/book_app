/**
 * i18next initialisation for Bookshelf.
 *
 * Metro bundler cannot resolve fully dynamic import() paths, so every
 * locale × namespace combination must be a static import.
 * 11 locales × 8 namespaces = 88 imports.
 *
 * ar and he are excluded until RTL layout mirroring is implemented.
 * Translation files are preserved in locales/ar/ and locales/he/.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { LOCALES } from './locales';

// ---------------------------------------------------------------------------
// en
// ---------------------------------------------------------------------------
import en_common from './locales/en/common.json';
import en_auth from './locales/en/auth.json';
import en_tabs from './locales/en/tabs.json';
import en_myBooks from './locales/en/my-books.json';
import en_scan from './locales/en/scan.json';
import en_settings from './locales/en/settings.json';
import en_wishlist from './locales/en/wishlist.json';
import en_components from './locales/en/components.json';

// ---------------------------------------------------------------------------
// fr-CA
// ---------------------------------------------------------------------------
import frCA_common from './locales/fr-CA/common.json';
import frCA_auth from './locales/fr-CA/auth.json';
import frCA_tabs from './locales/fr-CA/tabs.json';
import frCA_myBooks from './locales/fr-CA/my-books.json';
import frCA_scan from './locales/fr-CA/scan.json';
import frCA_settings from './locales/fr-CA/settings.json';
import frCA_wishlist from './locales/fr-CA/wishlist.json';
import frCA_components from './locales/fr-CA/components.json';

// ---------------------------------------------------------------------------
// es
// ---------------------------------------------------------------------------
import es_common from './locales/es/common.json';
import es_auth from './locales/es/auth.json';
import es_tabs from './locales/es/tabs.json';
import es_myBooks from './locales/es/my-books.json';
import es_scan from './locales/es/scan.json';
import es_settings from './locales/es/settings.json';
import es_wishlist from './locales/es/wishlist.json';
import es_components from './locales/es/components.json';

// ---------------------------------------------------------------------------
// hi
// ---------------------------------------------------------------------------
import hi_common from './locales/hi/common.json';
import hi_auth from './locales/hi/auth.json';
import hi_tabs from './locales/hi/tabs.json';
import hi_myBooks from './locales/hi/my-books.json';
import hi_scan from './locales/hi/scan.json';
import hi_settings from './locales/hi/settings.json';
import hi_wishlist from './locales/hi/wishlist.json';
import hi_components from './locales/hi/components.json';

// ---------------------------------------------------------------------------
// zh
// ---------------------------------------------------------------------------
import zh_common from './locales/zh/common.json';
import zh_auth from './locales/zh/auth.json';
import zh_tabs from './locales/zh/tabs.json';
import zh_myBooks from './locales/zh/my-books.json';
import zh_scan from './locales/zh/scan.json';
import zh_settings from './locales/zh/settings.json';
import zh_wishlist from './locales/zh/wishlist.json';
import zh_components from './locales/zh/components.json';

// ---------------------------------------------------------------------------
// ja
// ---------------------------------------------------------------------------
import ja_common from './locales/ja/common.json';
import ja_auth from './locales/ja/auth.json';
import ja_tabs from './locales/ja/tabs.json';
import ja_myBooks from './locales/ja/my-books.json';
import ja_scan from './locales/ja/scan.json';
import ja_settings from './locales/ja/settings.json';
import ja_wishlist from './locales/ja/wishlist.json';
import ja_components from './locales/ja/components.json';

// ---------------------------------------------------------------------------
// ko
// ---------------------------------------------------------------------------
import ko_common from './locales/ko/common.json';
import ko_auth from './locales/ko/auth.json';
import ko_tabs from './locales/ko/tabs.json';
import ko_myBooks from './locales/ko/my-books.json';
import ko_scan from './locales/ko/scan.json';
import ko_settings from './locales/ko/settings.json';
import ko_wishlist from './locales/ko/wishlist.json';
import ko_components from './locales/ko/components.json';

// ---------------------------------------------------------------------------
// pt
// ---------------------------------------------------------------------------
import pt_common from './locales/pt/common.json';
import pt_auth from './locales/pt/auth.json';
import pt_tabs from './locales/pt/tabs.json';
import pt_myBooks from './locales/pt/my-books.json';
import pt_scan from './locales/pt/scan.json';
import pt_settings from './locales/pt/settings.json';
import pt_wishlist from './locales/pt/wishlist.json';
import pt_components from './locales/pt/components.json';

// ---------------------------------------------------------------------------
// de
// ---------------------------------------------------------------------------
import de_common from './locales/de/common.json';
import de_auth from './locales/de/auth.json';
import de_tabs from './locales/de/tabs.json';
import de_myBooks from './locales/de/my-books.json';
import de_scan from './locales/de/scan.json';
import de_settings from './locales/de/settings.json';
import de_wishlist from './locales/de/wishlist.json';
import de_components from './locales/de/components.json';

// ---------------------------------------------------------------------------
// nl
// ---------------------------------------------------------------------------
import nl_common from './locales/nl/common.json';
import nl_auth from './locales/nl/auth.json';
import nl_tabs from './locales/nl/tabs.json';
import nl_myBooks from './locales/nl/my-books.json';
import nl_scan from './locales/nl/scan.json';
import nl_settings from './locales/nl/settings.json';
import nl_wishlist from './locales/nl/wishlist.json';
import nl_components from './locales/nl/components.json';

// ---------------------------------------------------------------------------
// ru
// ---------------------------------------------------------------------------
import ru_common from './locales/ru/common.json';
import ru_auth from './locales/ru/auth.json';
import ru_tabs from './locales/ru/tabs.json';
import ru_myBooks from './locales/ru/my-books.json';
import ru_scan from './locales/ru/scan.json';
import ru_settings from './locales/ru/settings.json';
import ru_wishlist from './locales/ru/wishlist.json';
import ru_components from './locales/ru/components.json';

// ---------------------------------------------------------------------------
// Resources object
// ---------------------------------------------------------------------------

const resources = {
  en: {
    common: en_common,
    auth: en_auth,
    tabs: en_tabs,
    'my-books': en_myBooks,
    scan: en_scan,
    settings: en_settings,
    wishlist: en_wishlist,
    components: en_components,
  },
  'fr-CA': {
    common: frCA_common,
    auth: frCA_auth,
    tabs: frCA_tabs,
    'my-books': frCA_myBooks,
    scan: frCA_scan,
    settings: frCA_settings,
    wishlist: frCA_wishlist,
    components: frCA_components,
  },
  es: {
    common: es_common,
    auth: es_auth,
    tabs: es_tabs,
    'my-books': es_myBooks,
    scan: es_scan,
    settings: es_settings,
    wishlist: es_wishlist,
    components: es_components,
  },
  hi: {
    common: hi_common,
    auth: hi_auth,
    tabs: hi_tabs,
    'my-books': hi_myBooks,
    scan: hi_scan,
    settings: hi_settings,
    wishlist: hi_wishlist,
    components: hi_components,
  },
  zh: {
    common: zh_common,
    auth: zh_auth,
    tabs: zh_tabs,
    'my-books': zh_myBooks,
    scan: zh_scan,
    settings: zh_settings,
    wishlist: zh_wishlist,
    components: zh_components,
  },
  ja: {
    common: ja_common,
    auth: ja_auth,
    tabs: ja_tabs,
    'my-books': ja_myBooks,
    scan: ja_scan,
    settings: ja_settings,
    wishlist: ja_wishlist,
    components: ja_components,
  },
  ko: {
    common: ko_common,
    auth: ko_auth,
    tabs: ko_tabs,
    'my-books': ko_myBooks,
    scan: ko_scan,
    settings: ko_settings,
    wishlist: ko_wishlist,
    components: ko_components,
  },
  pt: {
    common: pt_common,
    auth: pt_auth,
    tabs: pt_tabs,
    'my-books': pt_myBooks,
    scan: pt_scan,
    settings: pt_settings,
    wishlist: pt_wishlist,
    components: pt_components,
  },
  de: {
    common: de_common,
    auth: de_auth,
    tabs: de_tabs,
    'my-books': de_myBooks,
    scan: de_scan,
    settings: de_settings,
    wishlist: de_wishlist,
    components: de_components,
  },
  nl: {
    common: nl_common,
    auth: nl_auth,
    tabs: nl_tabs,
    'my-books': nl_myBooks,
    scan: nl_scan,
    settings: nl_settings,
    wishlist: nl_wishlist,
    components: nl_components,
  },
  ru: {
    common: ru_common,
    auth: ru_auth,
    tabs: ru_tabs,
    'my-books': ru_myBooks,
    scan: ru_scan,
    settings: ru_settings,
    wishlist: ru_wishlist,
    components: ru_components,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: LOCALES.map((l) => l.code),
  ns: ['common', 'auth', 'tabs', 'my-books', 'scan', 'settings', 'wishlist', 'components'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false, // React Native handles escaping
  },
});

export default i18n;
