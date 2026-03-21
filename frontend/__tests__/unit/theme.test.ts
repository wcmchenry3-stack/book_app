import { tokens, lightTheme, darkTheme } from '../../theme';

describe('Theme system', () => {
  it('light theme uses light color values', () => {
    expect(lightTheme.colors.background).toBe(tokens.colors.background.light);
    expect(lightTheme.isDark).toBe(false);
  });

  it('dark theme uses dark color values', () => {
    expect(darkTheme.colors.background).toBe(tokens.colors.background.dark);
    expect(darkTheme.isDark).toBe(true);
  });

  it('touch target minimum is 44', () => {
    expect(tokens.touchTarget.min).toBe(44);
  });

  it('all color keys present in both themes', () => {
    const keys = Object.keys(tokens.colors) as Array<keyof typeof tokens.colors>;
    for (const key of keys) {
      expect(lightTheme.colors[key]).toBeDefined();
      expect(darkTheme.colors[key]).toBeDefined();
    }
  });
});
