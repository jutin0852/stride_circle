import { useMemo } from 'react';

import { appColors, darkModePalette } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';

const lightHistoryColors = {
  screen: appColors.canvas,
  ink: appColors.ink,
  muted: appColors.muted,
  blue: appColors.blue,
  blueDeep: appColors.edge,
  route: appColors.panelLine,
  ice: appColors.ice,
  panel: appColors.ice,
  green: appColors.green,
  greenDeep: appColors.green,
  yellow: appColors.yellow,
  yellowPale: '#FFF2BD',
  yellowDeep: '#624700',
  coral: appColors.coral,
  coralPale: '#FFF0EC',
  streak: '#F6B35B',
  streakSurface: '#FFF0DA',
  goalDay: appColors.blue,
  goalDayText: appColors.ink,
  selectedBackground: appColors.canvas,
  selectedOutline: appColors.edge,
  normalDate: appColors.ink,
  futureDate: '#78909A',
  belowOutline: appColors.coral,
  overlay: 'rgba(23, 51, 66, 0.42)',
  paper: appColors.canvas,
  line: appColors.line,
  panelLine: appColors.panelLine,
  panelEdge: appColors.panelEdge,
  shade: appColors.panelLine,
} as const;

const darkHistoryColors = {
  screen: darkModePalette.background,
  ink: darkModePalette.textPrimary,
  muted: darkModePalette.textSecondary,
  blue: darkModePalette.primary,
  blueDeep: darkModePalette.action,
  route: darkModePalette.journeyPath,
  ice: darkModePalette.surfaceSecondary,
  panel: darkModePalette.surface,
  green: darkModePalette.success,
  greenDeep: darkModePalette.success,
  yellow: darkModePalette.protected,
  yellowPale: darkModePalette.protectedBackground,
  yellowDeep: darkModePalette.protectedText,
  coral: darkModePalette.belowGoal,
  coralPale: darkModePalette.belowGoalSubtle,
  streak: darkModePalette.streak,
  streakSurface: '#3A2D27',
  goalDay: darkModePalette.goalBackground,
  goalDayText: darkModePalette.goalText,
  selectedBackground: darkModePalette.surfaceSelected,
  selectedOutline: darkModePalette.selectedOutline,
  normalDate: darkModePalette.dateNormal,
  futureDate: darkModePalette.dateFuture,
  belowOutline: darkModePalette.belowGoalOutline,
  overlay: 'rgba(11, 22, 29, 0.76)',
  paper: darkModePalette.surface,
  line: darkModePalette.borderSubtle,
  panelLine: darkModePalette.borderStrong,
  panelEdge: darkModePalette.backgroundElevated,
  shade: darkModePalette.cardDepth,
} as const;

export type HistoryColorSet = { [Key in keyof typeof lightHistoryColors]: string };

export function useHistoryTheme() {
  const { isDark } = useAppTheme();
  const colors = useMemo<HistoryColorSet>(() => isDark ? darkHistoryColors : lightHistoryColors, [isDark]);
  return { colors, isDark } as const;
}
