# Frontend Conventions

## Stack
Expo SDK 51 · Expo Router · React Native · TypeScript · TanStack Query · axios · expo-secure-store

## Running Locally

```bash
cd frontend
npm install
npx expo start
# Press i (iOS), a (Android), or w (web)
```

## Key Patterns

### Theme
- **All colours must come from `useTheme()`** — zero hardcoded colour values, ever
- Import: `import { useTheme } from '../hooks/useTheme'`
- Use `theme.colors.*`, `theme.spacing.*`, `theme.typography.*`, `theme.radius.*`

### Accessibility
See [~/.claude/standards/accessibility.md](~/.claude/standards/accessibility.md). WCAG 2.2 AA required on every interactive element. React Native: `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` (if non-obvious), `minWidth/minHeight: 44` on all `Pressable`.

### Token Storage
- Tokens and preferences: `expo-secure-store` only
- Never use `AsyncStorage` for anything sensitive

### File Routing
- Screens live in `app/` — Expo Router picks them up automatically
- Tabs: `app/(tabs)/<name>.tsx`
- Auth: `app/(auth)/<name>.tsx`
- Modals: `app/<name>.tsx` with `presentation: 'modal'`

### Internationalisation (i18n)

Stack: `i18next` + `react-i18next`. All user-facing strings must use `useTranslation()`.

#### Namespaces

| Namespace | Covers |
|-----------|--------|
| `common` | Error title, Close, Remove, cover alt |
| `auth` | Login screen |
| `tabs` | Tab bar labels + a11y labels |
| `my-books` | My Books screen — status tabs, badge, detail sheet, actions |
| `scan` | Scan screen — alerts, mode tabs, permission, camera |
| `settings` | Settings screen |
| `wishlist` | Wishlist screen |
| `components` | `BookCandidatePicker`, `ThemeToggleButton` |

#### Using translations in a screen

```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation('my-books');
// Cross-namespace lookup:
t('close', { ns: 'common' })
// Interpolation:
t('coverAlt', { ns: 'common', title: book.title })
// Dynamic nested key:
t(`status.${item.status}`)
```

#### Adding a new language

1. Add locale object to `LOCALES` in `src/i18n/locales.ts`
2. Run translate script for each namespace:
   ```bash
   cd frontend
   OPENAI_API_KEY=... node scripts/translate.js --locale <code> --namespace <ns>
   # or all namespaces at once for one locale:
   OPENAI_API_KEY=... node scripts/translate.js --locale <code> --namespace common && ...
   ```
3. Add 8 static imports to `src/i18n/i18n.ts` and add locale entry to `resources`
4. If RTL (ar/he), add to `RTL_LOCALES` in `locales.ts`

#### Re-running translations (e.g. after adding keys)

```bash
# Translate missing keys only:
node scripts/translate.js --locale es --namespace scan
# Retranslate all keys (force):
node scripts/translate.js --locale es --namespace scan --force
# Preview without writing:
node scripts/translate.js --locale es --namespace scan --dry-run
# All locales × all namespaces:
node scripts/translate.js --all
```

#### RTL locales
Arabic (`ar`) and Hebrew (`he`) are RTL. String translations are complete.
Layout mirroring (`I18nManager.forceRTL()` + app restart) is a follow-up task.

## Commands

```bash
npx jest                          # unit tests
npx jest --coverage               # with coverage report
npx eslint .                      # lint (includes a11y rules)
npx prettier --check .            # format check
npx prettier --write .            # format fix
```
