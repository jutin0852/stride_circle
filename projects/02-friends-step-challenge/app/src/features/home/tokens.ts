import { appColors, darkModePalette } from '@/design-system/tokens';

/** The Home palette is the canonical app palette. */
export const homeColors = appColors;

export const homeDarkColors: Record<keyof typeof homeColors, string> = {
  canvas: darkModePalette.background,
  ink: darkModePalette.textPrimary,
  muted: darkModePalette.textSecondary,
  blue: darkModePalette.primary,
  edge: darkModePalette.action,
  ice: darkModePalette.primarySubtle,
  green: darkModePalette.success,
  yellow: darkModePalette.protected,
  coral: darkModePalette.belowGoal,
  line: darkModePalette.border,
  panelLine: darkModePalette.borderStrong,
  panelEdge: darkModePalette.backgroundElevated,
};

export function homeTheme(isDark: boolean) {
  const surfaceColors = isDark ? homeDarkColors : homeColors;
  return {
    ...surfaceColors,
    onAction: isDark ? darkModePalette.textOnAccent : '#102F3C',
    cheerBackground: isDark ? darkModePalette.protectedSubtle : '#FFF5D2',
    cheerBorder: isDark ? darkModePalette.protectedBorder : '#A17A12',
    cheerText: isDark ? darkModePalette.protectedText : '#5C440B',
  } as const;
}

export const homeMotion = { greeting: 600, progress: 550, goal: 1400, cheer: 420, circle: 180 } as const;
