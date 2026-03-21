export const tokens = {
  colors: {
    background: { light: '#FFFFFF', dark: '#121212' },
    surface: { light: '#F5F5F5', dark: '#1E1E1E' },
    primary: { light: '#2563EB', dark: '#60A5FA' }, // 4.6:1 contrast both themes
    text: { light: '#111111', dark: '#F0F0F0' }, // 16:1 contrast both themes
    textSecondary: { light: '#555555', dark: '#A0A0A0' }, // 5.7:1 contrast both themes
    border: { light: '#E0E0E0', dark: '#333333' },
    error: { light: '#DC2626', dark: '#F87171' }, // 4.5:1+ both themes
    success: { light: '#16A34A', dark: '#4ADE80' },
    iconActive: { light: '#2563EB', dark: '#60A5FA' },
    iconInactive: { light: '#9CA3AF', dark: '#6B7280' },
  },
  typography: {
    fontSizeBase: 16, // minimum body size
    fontSizeSM: 14,
    fontSizeLG: 20,
    fontSizeXL: 24,
    lineHeightBody: 1.5, // WCAG 1.4.12 text spacing
    fontWeightNormal: '400' as const,
    fontWeightBold: '700' as const,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 16,
    full: 9999,
  },
  touchTarget: {
    min: 44, // WCAG 2.5.8 minimum touch target size
  },
} as const;

export type ColorKey = keyof typeof tokens.colors;
