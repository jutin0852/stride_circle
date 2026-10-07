import { semanticColors } from '@/design-system/tokens';

export { elevation, iconSizes, layout, motion, opacity, palette, radii, semanticColors, spacing, touchTargets, typeScale } from '@/design-system/tokens';

// Keep the existing screen API stable while the redesigned primitives are
// adopted feature by feature. New components should use semanticColors.
export const colors = {
  background: semanticColors.canvas,
  card: semanticColors.card,
  ink: semanticColors.contentPrimary,
  muted: semanticColors.contentSecondary,
  border: semanticColors.border,
  soft: semanticColors.soft,
  accent: semanticColors.legacyAction,
  accentPressed: semanticColors.legacyActionPressed,
  accentText: semanticColors.contentOnBrand,
  accentBorder: semanticColors.brandActionPressed,
  hero: semanticColors.infoSurface,
  success: semanticColors.successContent,
  danger: semanticColors.dangerContent,
  dangerSurface: semanticColors.dangerSurface,
} as const;
