export const palette = {
  ink: {
    950: '#0E2022',
    900: '#142A2C',
    800: '#244143',
    700: '#385B5B',
    600: '#5F7773',
    500: '#7F918B',
    300: '#B9C5BD',
  },
  cream: {
    50: '#FFFDF7',
    100: '#F8F4E8',
    200: '#F0E9D9',
    300: '#E6DCC9',
  },
  lime: {
    100: '#F2FCD1',
    300: '#DDFB78',
    500: '#C6F34A',
    600: '#B0DF32',
    700: '#86B51B',
  },
  coral: {
    100: '#FFE6DE',
    300: '#FFB49F',
    500: '#F27658',
    600: '#DE5D42',
    700: '#B74332',
  },
  lavender: {
    100: '#EFEDFF',
    300: '#C9C5FF',
    500: '#9B95F5',
    700: '#6F69C8',
  },
  sky: {
    100: '#E5F4FF',
    300: '#B9E0FA',
    500: '#82C4EF',
    700: '#397FA8',
  },
  peach: {
    100: '#FFF0DA',
    300: '#FFD09A',
    500: '#F6B35B',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const semanticColors = {
  canvas: palette.cream[100],
  card: palette.cream[50],
  raised: '#FFFFFF',
  soft: palette.cream[200],
  softLime: palette.lime[100],
  inverse: palette.ink[950],

  contentPrimary: palette.ink[950],
  contentSecondary: palette.ink[600],
  contentTertiary: palette.ink[500],
  contentInverse: palette.white,
  contentOnBrand: palette.ink[950],
  contentLink: palette.ink[800],

  border: '#E3DAC9',
  borderStrong: '#CFC3AE',
  divider: '#EBE4D7',

  brandAction: palette.lime[500],
  brandActionPressed: palette.lime[600],
  brandActionSoft: palette.lime[100],
  brandDark: palette.ink[950],
  brandDarkPressed: palette.ink[800],

  infoSurface: palette.sky[100],
  infoContent: palette.sky[700],
  successSurface: '#E5F6E7',
  successContent: '#237247',
  warningSurface: palette.peach[100],
  warningContent: '#98601A',
  dangerSurface: palette.coral[100],
  dangerContent: palette.coral[700],
  celebrationSurface: palette.coral[500],
  celebrationContent: palette.white,

  overlay: 'rgba(14, 32, 34, 0.42)',
  scrim: 'rgba(14, 32, 34, 0.08)',

  // Compatibility aliases for existing screen-local styles. New UI should use
  // the semantic tokens above or the primitives in components/ui.
  legacyAction: palette.ink[950],
  legacyActionPressed: palette.ink[800],
} as const;

export const spacing = {
  none: 0,
  hairline: 1,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  section: 48,
} as const;

export const radii = {
  none: 0,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  sheet: 30,
  pill: 999,
} as const;

export const typeScale = {
  display: { fontSize: 56, lineHeight: 60, letterSpacing: -2.4, fontWeight: '900' },
  displaySmall: { fontSize: 42, lineHeight: 46, letterSpacing: -1.8, fontWeight: '900' },
  headline: { fontSize: 32, lineHeight: 37, letterSpacing: -1.2, fontWeight: '900' },
  title: { fontSize: 24, lineHeight: 29, letterSpacing: -0.7, fontWeight: '800' },
  titleSmall: { fontSize: 19, lineHeight: 24, letterSpacing: -0.3, fontWeight: '800' },
  body: { fontSize: 16, lineHeight: 23, letterSpacing: 0, fontWeight: '500' },
  bodySmall: { fontSize: 14, lineHeight: 20, letterSpacing: 0, fontWeight: '500' },
  label: { fontSize: 12, lineHeight: 16, letterSpacing: 0.1, fontWeight: '800' },
  eyebrow: { fontSize: 10, lineHeight: 14, letterSpacing: 1.1, fontWeight: '900' },
  button: { fontSize: 15, lineHeight: 20, letterSpacing: -0.1, fontWeight: '900' },
  numeric: { fontSize: 30, lineHeight: 34, letterSpacing: -1.2, fontWeight: '900' },
} as const;

export const controlHeights = {
  compact: 36,
  small: 44,
  medium: 52,
  large: 58,
} as const;

export const iconSizes = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
} as const;

export const touchTargets = {
  minimum: 44,
  comfortable: 52,
} as const;

export const opacity = {
  disabled: 0.48,
  pressed: 0.82,
  muted: 0.68,
  overlay: 0.42,
} as const;

export const motion = {
  fast: 120,
  standard: 220,
  expressive: 360,
  easing: 'ease-out',
  reducedMotionScale: 0,
} as const;

export const elevation = {
  none: {
    elevation: 0,
    shadowOpacity: 0,
  },
  card: {
    elevation: 2,
    shadowColor: palette.ink[950],
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
  },
  floating: {
    elevation: 6,
    shadowColor: palette.ink[950],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
  },
} as const;

export const layout = {
  contentPadding: spacing.xxl,
  compactContentPadding: spacing.lg,
  maxContentWidth: 560,
  bottomSafePadding: spacing.xxxl,
} as const;
