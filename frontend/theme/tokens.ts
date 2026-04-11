// MD3 color role tokens — light and dark values.
// Convenience aliases (background, text, textSecondary, border, iconActive,
// iconInactive, success) are kept so existing components compile unchanged
// while screens are migrated to the new roles one at a time.
export const tokens = {
  colors: {
    // ── Primary ────────────────────────────────────────────────────────────
    primary: { light: '#0f426f', dark: '#a0cafe' },
    onPrimary: { light: '#ffffff', dark: '#003258' },
    primaryContainer: { light: '#2e5a88', dark: '#194976' },
    onPrimaryContainer: { light: '#aed1ff', dark: '#d2e4ff' },
    primaryFixed: { light: '#d2e4ff', dark: '#d2e4ff' },
    primaryFixedDim: { light: '#a0cafe', dark: '#a0cafe' },
    onPrimaryFixed: { light: '#001d36', dark: '#001d36' },
    onPrimaryFixedVariant: { light: '#194976', dark: '#194976' },
    inversePrimary: { light: '#a0cafe', dark: '#0f426f' },

    // ── Secondary ──────────────────────────────────────────────────────────
    secondary: { light: '#47645d', dark: '#adcdc4' },
    onSecondary: { light: '#ffffff', dark: '#02201a' },
    secondaryContainer: { light: '#c6e7dd', dark: '#2f4c45' },
    onSecondaryContainer: { light: '#4b6861', dark: '#c9e9e0' },
    secondaryFixed: { light: '#c9e9e0', dark: '#c9e9e0' },
    secondaryFixedDim: { light: '#adcdc4', dark: '#adcdc4' },
    onSecondaryFixed: { light: '#02201a', dark: '#02201a' },
    onSecondaryFixedVariant: { light: '#2f4c45', dark: '#2f4c45' },

    // ── Tertiary ───────────────────────────────────────────────────────────
    tertiary: { light: '#573c00', dark: '#eebf6b' },
    onTertiary: { light: '#ffffff', dark: '#2f1f00' },
    tertiaryContainer: { light: '#745202', dark: '#5e4200' },
    onTertiaryContainer: { light: '#f7c872', dark: '#ffdea8' },
    tertiaryFixed: { light: '#ffdea8', dark: '#ffdea8' },
    tertiaryFixedDim: { light: '#eebf6b', dark: '#eebf6b' },
    onTertiaryFixed: { light: '#271900', dark: '#271900' },
    onTertiaryFixedVariant: { light: '#5e4200', dark: '#5e4200' },

    // ── Error ──────────────────────────────────────────────────────────────
    error: { light: '#ba1a1a', dark: '#ffb4ab' },
    onError: { light: '#ffffff', dark: '#690005' },
    errorContainer: { light: '#ffdad6', dark: '#93000a' },
    onErrorContainer: { light: '#93000a', dark: '#ffdad6' },

    // ── Surface ────────────────────────────────────────────────────────────
    surface: { light: '#fbf9f5', dark: '#131210' },
    onSurface: { light: '#1b1c1a', dark: '#e5e3df' },
    surfaceVariant: { light: '#e4e2de', dark: '#43483f' },
    onSurfaceVariant: { light: '#42474f', dark: '#c4c9c1' },
    surfaceContainerLowest: { light: '#ffffff', dark: '#0e0d0b' },
    surfaceContainerLow: { light: '#f5f3ef', dark: '#1b1c1a' },
    surfaceContainer: { light: '#efeeea', dark: '#1f201e' },
    surfaceContainerHigh: { light: '#eae8e4', dark: '#292a28' },
    surfaceContainerHighest: { light: '#e4e2de', dark: '#343532' },
    surfaceBright: { light: '#fbf9f5', dark: '#393937' },
    surfaceDim: { light: '#dbdad6', dark: '#131210' },
    inverseSurface: { light: '#30312e', dark: '#e5e3df' },
    inverseOnSurface: { light: '#f2f0ed', dark: '#1b1c1a' },
    surfaceTint: { light: '#35618f', dark: '#a0cafe' },

    // ── Outline ────────────────────────────────────────────────────────────
    outline: { light: '#737780', dark: '#8e9299' },
    outlineVariant: { light: '#c2c7d0', dark: '#42474f' },

    // ── Convenience aliases (backward-compat) ──────────────────────────────
    background: { light: '#fbf9f5', dark: '#131210' },
    text: { light: '#1b1c1a', dark: '#e5e3df' },
    textSecondary: { light: '#42474f', dark: '#c4c9c1' },
    border: { light: '#c2c7d0', dark: '#42474f' },
    success: { light: '#16A34A', dark: '#4ADE80' },
    iconActive: { light: '#0f426f', dark: '#a0cafe' },
    iconInactive: { light: '#47645d', dark: '#adcdc4' },
  },

  typography: {
    // Font families
    fontFamilyHeadline: 'NotoSerif_700Bold' as const,
    fontFamilyBody: 'Inter_400Regular' as const,

    // Scale
    fontSizeDisplay: 48,
    fontSizeH1: 40,
    fontSizeH2: 32,
    fontSizeH3: 24,
    fontSizeXL: 24, // kept for compat
    fontSizeLG: 20,
    fontSizeBase: 16,
    fontSizeSM: 14,
    fontSizeXS: 12,

    lineHeightBody: 1.5, // WCAG 1.4.12
    fontWeightNormal: '400' as const,
    fontWeightMedium: '500' as const,
    fontWeightSemiBold: '600' as const,
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
    lg: 12,
    xl: 16,
    full: 9999,
  },

  touchTarget: {
    min: 44, // WCAG 2.5.8
  },
} as const;

export type ColorKey = keyof typeof tokens.colors;
