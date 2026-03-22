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

## Commands

```bash
npx jest                          # unit tests
npx jest --coverage               # with coverage report
npx eslint .                      # lint (includes a11y rules)
npx prettier --check .            # format check
npx prettier --write .            # format fix
```
