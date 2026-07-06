// Ryft is strictly monochrome: neutral grays only, no hue. Light and dark are
// near-mirrors. `accent` is the highest-contrast tone (near-white on dark,
// near-black on light) — it stands in for the lime accent of journal-d1.html.

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  line: string;
  dim: string;
  muted: string;
  mid: string;
  text: string;
  bright: string;
  accent: string;
  onAccent: string;
  statusDone: string;
  statusPartial: string;
  statusSkip: string;
  danger: string;
}

export const darkColors: ThemeColors = {
  bg: '#0E0E0E',
  surface: '#141414',
  surfaceAlt: '#1A1A1A',
  line: '#242424',
  dim: '#2E2E2E',
  muted: '#5A5A5A',
  mid: '#8A8A8A',
  text: '#D6D6D6',
  bright: '#F2F2F2',
  accent: '#F2F2F2',
  onAccent: '#0A0A0A',
  statusDone: '#F2F2F2',
  statusPartial: '#7A7A7A',
  statusSkip: '#2E2E2E',
  danger: '#D9776F',
};

export const lightColors: ThemeColors = {
  bg: '#FFFFFF',
  surface: '#F6F6F6',
  surfaceAlt: '#EFEFEF',
  line: '#E6E6E6',
  dim: '#D6D6D6',
  muted: '#A6A6A6',
  mid: '#6E6E6E',
  text: '#1C1C1C',
  bright: '#0A0A0A',
  accent: '#0A0A0A',
  onAccent: '#FFFFFF',
  statusDone: '#0A0A0A',
  statusPartial: '#8A8A8A',
  statusSkip: '#DADADA',
  danger: '#B23A34',
};

// Font family keys — must match the names passed to useFonts() in app/_layout.tsx.
export const fonts = {
  mono: {
    regular: 'IBMPlexMono_400Regular',
    medium: 'IBMPlexMono_500Medium',
    semibold: 'IBMPlexMono_600SemiBold',
    bold: 'IBMPlexMono_700Bold',
  },
  serif: {
    regular: 'IBMPlexSerif_400Regular',
    medium: 'IBMPlexSerif_500Medium',
    italic: 'IBMPlexSerif_400Regular_Italic',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 2,
  md: 3,
  lg: 6,
  pill: 999,
} as const;

export const fontSize = {
  micro: 10,
  tiny: 11,
  small: 12,
  label: 13,
  body: 15,
  lg: 18,
  xl: 24,
  display: 36,
  huge: 52,
} as const;

export type ColorScheme = 'light' | 'dark';

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  fonts: typeof fonts;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
}

export function buildTheme(scheme: ColorScheme): Theme {
  return {
    scheme,
    colors: scheme === 'dark' ? darkColors : lightColors,
    fonts,
    spacing,
    radius,
    fontSize,
  };
}
