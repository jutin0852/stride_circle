import { useMemo } from 'react';

import { darkModePalette } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';

type AppSemanticColors = ReturnType<typeof useAppTheme>['colors'];

function createHistoryColors(colors: AppSemanticColors, isDark: boolean) {
  return {
    screen: colors.canvas,
    ink: colors.contentPrimary,
    muted: colors.contentSecondary,
    blue: colors.controlPrimary,
    blueDeep: colors.controlPrimaryPressed,
    // The journey path is History-specific artwork, but its light/dark values
    // still come from the approved palette rather than screen-local hexes.
    route: isDark ? darkModePalette.journeyPath : colors.borderStrong,
    ice: colors.infoSurface,
    panel: isDark ? colors.card : colors.soft,
    green: colors.successContent,
    greenDeep: colors.successContent,
    yellow: colors.protectedBorder,
    yellowPale: colors.protectedSurface,
    yellowDeep: colors.protectedContent,
    coral: colors.celebrationSurface,
    coralDeep: colors.coralContent,
    coralPale: colors.dangerSurface,
    streak: colors.streakAccent,
    streakContent: colors.streakContent,
    streakSurface: colors.streakSurface,
    goalDay: isDark ? darkModePalette.goalBackground : colors.controlPrimary,
    goalDayText: isDark ? darkModePalette.goalText : colors.contentPrimary,
    selectedBackground: isDark ? colors.surfacePressed : colors.card,
    selectedOutline: colors.borderSelected,
    normalDate: colors.contentPrimary,
    futureDate: isDark ? darkModePalette.dateFuture : colors.contentTertiary,
    belowOutline: colors.belowGoalBorder,
    paper: colors.card,
    line: colors.border,
    panelLine: colors.borderStrong,
    panelEdge: colors.surfaceSubtle,
  } as const;
}

export type HistoryColorSet = ReturnType<typeof createHistoryColors>;

export function useHistoryTheme() {
  const { colors, isDark } = useAppTheme();
  const historyColors = useMemo(() => createHistoryColors(colors, isDark), [colors, isDark]);
  return { colors: historyColors, isDark } as const;
}
