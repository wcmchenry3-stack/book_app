/**
 * i18n infrastructure tests.
 *
 * Validates that:
 * - All 8 namespaces initialise for the `en` locale and return strings
 * - Exactly 11 locales are registered (one per entry in LOCALES; ar/he excluded until RTL ready)
 * - No English key has __NEEDS_TRANSLATION__ as its value
 * - RTL_LOCALES is empty (no RTL locales are currently active)
 */

import i18n from '../../src/i18n/i18n';
import { LOCALES, RTL_LOCALES } from '../../src/i18n/locales';

const NAMESPACES = [
  'common',
  'auth',
  'tabs',
  'my-books',
  'scan',
  'settings',
  'wishlist',
  'components',
] as const;

describe('i18n initialisation', () => {
  it('registers exactly 11 locales', () => {
    const registered = Object.keys((i18n as any).store?.data ?? {});
    expect(registered.length).toBe(LOCALES.length);
    expect(registered.length).toBe(11);
  });

  it.each(NAMESPACES)('en/%s namespace exists and has at least one string', (ns) => {
    const bundle = (i18n as any).store?.data?.en?.[ns];
    expect(bundle).toBeDefined();
    const keys = Object.keys(bundle ?? {});
    expect(keys.length).toBeGreaterThan(0);
  });

  it('en/auth.appTitle is "Bookshelf"', () => {
    expect(i18n.t('appTitle', { ns: 'auth', lng: 'en' })).toBe('Bookshelf');
  });

  it('en/tabs has all 4 tab keys', () => {
    const bundle = (i18n as any).store?.data?.en?.tabs ?? {};
    expect(bundle.scan).toBeDefined();
    expect(bundle.wishlist).toBeDefined();
    expect(bundle.myBooks).toBeDefined();
    expect(bundle.settings).toBeDefined();
  });

  it('en/my-books has all status tab keys', () => {
    const statusTab = (i18n as any).store?.data?.en?.['my-books']?.statusTab ?? {};
    expect(statusTab.all).toBeDefined();
    expect(statusTab.wishlisted).toBeDefined();
    expect(statusTab.purchased).toBeDefined();
    expect(statusTab.reading).toBeDefined();
    expect(statusTab.read).toBeDefined();
  });

  it('no English key has __NEEDS_TRANSLATION__ as value', () => {
    const enData = (i18n as any).store?.data?.en ?? {};
    const problematic: string[] = [];

    function checkValues(obj: unknown, path: string) {
      if (typeof obj === 'string') {
        if (obj === '__NEEDS_TRANSLATION__') problematic.push(path);
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [k, v] of Object.entries(obj)) {
          checkValues(v, `${path}.${k}`);
        }
      }
    }

    for (const [ns, bundle] of Object.entries(enData)) {
      checkValues(bundle, `en.${ns}`);
    }

    expect(problematic).toEqual([]);
  });
});

describe('RTL_LOCALES', () => {
  it('is empty — ar and he are inactive until RTL layout is implemented', () => {
    expect(RTL_LOCALES.size).toBe(0);
  });

  it('does not contain any ltr locales', () => {
    expect(RTL_LOCALES.has('en')).toBe(false);
    expect(RTL_LOCALES.has('es')).toBe(false);
    expect(RTL_LOCALES.has('fr-CA')).toBe(false);
  });
});
