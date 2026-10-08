import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { darkModePalette, darkSemanticColors, semanticColors } from './tokens';

export function useAppTheme() {
  const isDark = useColorScheme() === 'dark';

  return {
    isDark,
    colors: isDark ? darkSemanticColors : semanticColors,
    palette: isDark ? darkModePalette : null,
  } as const;
}

/** Compatibility palette for routes that still consume the legacy color names. */
export function useAppColors() {
  const { colors, isDark } = useAppTheme();

  return useMemo(() => ({
    background: colors.canvas,
    card: colors.card,
    ink: colors.contentPrimary,
    muted: colors.contentSecondary,
    disabled: colors.contentDisabled,
    border: colors.border,
    borderSubtle: colors.borderSubtle,
    borderSelected: colors.borderSelected,
    soft: colors.soft,
    subtleSurface: colors.surfaceSubtle,
    pressedSurface: colors.surfacePressed,
    surfaceEdge: colors.surfaceEdge,
    accent: colors.legacyAction,
    accentPressed: colors.legacyActionPressed,
    controlPrimary: colors.controlPrimary,
    controlPrimaryPressed: colors.controlPrimaryPressed,
    controlPrimaryDisabled: colors.controlPrimaryDisabled,
    controlSecondary: colors.controlSecondary,
    controlSecondaryPressed: colors.controlSecondaryPressed,
    hero: colors.infoSurface,
    infoSurface: colors.infoSurface,
    brandActionSoft: colors.brandActionSoft,
    brandActionPressed: colors.brandActionPressed,
    success: colors.successContent,
    placeholder: isDark ? '#A0B2BA' : '#78909A',
    overlay: colors.overlay,
    warningSurface: colors.warningSurface,
    warningContent: colors.warningContent,
    dangerSurface: colors.dangerSurface,
    dangerContent: colors.dangerContent,
    streakSurface: colors.streakSurface,
    streakContent: colors.streakContent,
    streakAccent: colors.streakAccent,
    protectedSurface: colors.protectedSurface,
    protectedContent: colors.protectedContent,
    protectedBorder: colors.protectedBorder,
    belowGoalBorder: colors.belowGoalBorder,
    coralContent: colors.coralContent,
    circleMarkerSky: colors.circleMarkerSky,
    circleMarkerYellow: colors.circleMarkerYellow,
    circleMarkerGreen: colors.circleMarkerGreen,
    circleMarkerCoral: colors.circleMarkerCoral,
    sheetSurface: colors.sheetSurface,
    sheetGrabber: colors.sheetGrabber,
    sheetDivider: colors.sheetDivider,
    onAccent: colors.contentOnBrand,
    subtleBorder: isDark ? '#2B404B' : '#E7F1F4',
    selectedSurface: isDark ? '#203945' : '#FFFFFF',
  } as const), [colors, isDark]);
}
