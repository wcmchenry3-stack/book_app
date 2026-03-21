import { tokens } from './tokens';
import type { Theme } from './light';

export const darkTheme: Theme = {
  colors: {
    background:    tokens.colors.background.dark,
    surface:       tokens.colors.surface.dark,
    primary:       tokens.colors.primary.dark,
    text:          tokens.colors.text.dark,
    textSecondary: tokens.colors.textSecondary.dark,
    border:        tokens.colors.border.dark,
    error:         tokens.colors.error.dark,
    success:       tokens.colors.success.dark,
    iconActive:    tokens.colors.iconActive.dark,
    iconInactive:  tokens.colors.iconInactive.dark,
  },
  typography: tokens.typography,
  spacing:    tokens.spacing,
  radius:     tokens.radius,
  touchTarget: tokens.touchTarget,
  isDark: true,
};
