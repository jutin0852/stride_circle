import type { TextStyle } from 'react-native';

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

/** The approved Home palette is the single color source for the app. */
export const appColors = {
  canvas: '#FFFFFF',
  ink: '#173342',
  muted: '#4B606B',
  blue: '#13B5E8',
  edge: '#087CA5',
  ice: '#E8F8FF',
  green: '#317F1B',
  yellow: '#FFD34E',
  coral: '#F77768',
  line: '#DCE6EB',
  panelLine: '#B9E6F5',
  panelEdge: '#E0F1F6',
} as const;

export const semanticColors = {
  canvas: appColors.canvas,
  card: appColors.canvas,
  raised: '#FFFFFF',
  soft: appColors.ice,
  softLime: appColors.ice,
  inverse: appColors.ink,

  contentPrimary: appColors.ink,
  contentSecondary: appColors.muted,
  contentTertiary: '#78909A',
  contentInverse: palette.white,
  contentOnBrand: appColors.ink,
  contentLink: appColors.edge,

  border: appColors.line,
  borderStrong: appColors.panelLine,
  divider: appColors.line,

  brandAction: appColors.blue,
  brandActionPressed: appColors.edge,
  brandActionSoft: appColors.ice,
  brandDark: appColors.ink,
  brandDarkPressed: '#102F3C',

  infoSurface: appColors.ice,
  infoContent: appColors.edge,
  successSurface: '#E9F7E5',
  successContent: appColors.green,
  warningSurface: '#FFF7D8',
  warningContent: '#74530B',
  dangerSurface: '#FFF0EC',
  dangerContent: '#A94234',
  celebrationSurface: appColors.coral,
  celebrationContent: palette.white,

  overlay: 'rgba(23, 51, 66, 0.42)',
  scrim: 'rgba(23, 51, 66, 0.08)',

  // Compatibility aliases for existing screen-local styles. New UI should use
  // the semantic tokens above or the primitives in components/ui.
  legacyAction: appColors.blue,
  legacyActionPressed: appColors.edge,
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

/**
 * Named faces instead of per-component font strings. The Expo loader registers
 * these keys at the root before the app renders.
 */
export const fontFamilies = {
  regular: 'NunitoSans_400Regular',
  semiBold: 'NunitoSans_600SemiBold',
  bold: 'NunitoSans_700Bold',
  extraBold: 'NunitoSans_800ExtraBold',
} as const;

export function fontFamilyForWeight(weight: TextStyle['fontWeight'] | undefined) {
  const value = weight === 'normal' || weight === undefined ? 400 : weight === 'bold' ? 700 : Number(weight);
  if (value <= 400) return fontFamilies.regular;
  if (value <= 600) return fontFamilies.semiBold;
  if (value <= 700) return fontFamilies.bold;
  return fontFamilies.extraBold;
}

export const typeScale = {
  display: { fontFamily: fontFamilies.extraBold, fontSize: 56, lineHeight: 60, letterSpacing: -2.4 },
  displaySmall: { fontFamily: fontFamilies.extraBold, fontSize: 42, lineHeight: 46, letterSpacing: -1.8 },
  headline: { fontFamily: fontFamilies.extraBold, fontSize: 32, lineHeight: 37, letterSpacing: -1.2 },
  title: { fontFamily: fontFamilies.extraBold, fontSize: 24, lineHeight: 29, letterSpacing: -0.7 },
  titleSmall: { fontFamily: fontFamilies.extraBold, fontSize: 19, lineHeight: 24, letterSpacing: -0.3 },
  body: { fontFamily: fontFamilies.regular, fontSize: 16, lineHeight: 23, letterSpacing: 0 },
  bodyStrong: { fontFamily: fontFamilies.semiBold, fontSize: 16, lineHeight: 23, letterSpacing: 0 },
  bodySmall: { fontFamily: fontFamilies.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  caption: { fontFamily: fontFamilies.regular, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
  label: { fontFamily: fontFamilies.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  eyebrow: { fontFamily: fontFamilies.extraBold, fontSize: 10, lineHeight: 14, letterSpacing: 1.1 },
  button: { fontFamily: fontFamilies.bold, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  numeric: { fontFamily: fontFamilies.extraBold, fontSize: 30, lineHeight: 34, letterSpacing: -1.2 },
  stat: { fontFamily: fontFamilies.extraBold, fontSize: 30, lineHeight: 34, letterSpacing: -1.2 },
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
