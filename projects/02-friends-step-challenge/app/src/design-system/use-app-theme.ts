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
    border: colors.border,
    borderSubtle: colors.borderSubtle,
    soft: colors.soft,
    accent: colors.legacyAction,
    accentPressed: colors.legacyActionPressed,
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
    onAccent: colors.contentOnBrand,
    subtleBorder: isDark ? '#2B404B' : '#E7F1F4',
    selectedSurface: isDark ? '#203945' : '#FFFFFF',
  } as const), [colors, isDark]);
}
