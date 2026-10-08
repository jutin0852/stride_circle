import { darkSemanticColors, semanticColors } from '@/design-system/tokens';

type HomeColorSource = {
  canvas: string;
  contentPrimary: string;
  contentSecondary: string;
  controlPrimary: string;
  controlPrimaryPressed: string;
  soft: string;
  successContent: string;
  circleMarkerYellow: string;
  celebrationSurface: string;
  border: string;
  borderStrong: string;
  surfaceEdge: string;
  contentOnBrand: string;
  protectedSurface: string;
  protectedBorder: string;
  protectedContent: string;
};

function homeColorsFromSemantic(colors: HomeColorSource) {
  return {
    canvas: colors.canvas,
    ink: colors.contentPrimary,
    muted: colors.contentSecondary,
    blue: colors.controlPrimary,
    edge: colors.controlPrimaryPressed,
    ice: colors.soft,
    green: colors.successContent,
    yellow: colors.circleMarkerYellow,
    coral: colors.celebrationSurface,
    line: colors.border,
    panelLine: colors.borderStrong,
    panelEdge: colors.surfaceEdge,
    onAction: colors.contentOnBrand,
    cheerBackground: colors.protectedSurface,
    cheerBorder: colors.protectedBorder,
    cheerText: colors.protectedContent,
  } as const;
}

/** Home keeps its local role names so the approved composition stays readable. */
export const homeColors = homeColorsFromSemantic(semanticColors);
export const homeDarkColors = homeColorsFromSemantic(darkSemanticColors);

export function homeTheme(isDark: boolean) {
  return isDark ? homeDarkColors : homeColors;
}

export const homeMotion = { greeting: 600, progress: 550, goal: 1400, cheer: 420, circle: 180 } as const;
