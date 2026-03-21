import { tokens } from './tokens';

export const lightTheme = {
  colors: {
    background:    tokens.colors.background.light,
    surface:       tokens.colors.surface.light,
    primary:       tokens.colors.primary.light,
    text:          tokens.colors.text.light,
    textSecondary: tokens.colors.textSecondary.light,
    border:        tokens.colors.border.light,
    error:         tokens.colors.error.light,
    success:       tokens.colors.success.light,
    iconActive:    tokens.colors.iconActive.light,
    iconInactive:  tokens.colors.iconInactive.light,
  },
  typography: tokens.typography,
  spacing:    tokens.spacing,
  radius:     tokens.radius,
  touchTarget: tokens.touchTarget,
  isDark: false,
} as const;

export type Theme = typeof lightTheme;
