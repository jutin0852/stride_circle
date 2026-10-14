import { describe, expect, it } from 'vitest';

import { controlHeights, darkModePalette, darkSemanticColors, layout, palette, radii, semanticColors, spacing, touchTargets, typeScale } from '@/design-system/tokens';

function contrastRatio(foreground: string, background: string) {
  const luminance = (color: string) => {
    const [red, green, blue] = color.match(/[\da-f]{2}/gi)!.map((channel) => parseInt(channel, 16) / 255).map((channel) => (
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    ));

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };

  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

describe('Stride Circle design tokens', () => {
  it('keeps brand surfaces and content colors distinct', () => {
    expect(palette.ink[950]).not.toBe(semanticColors.brandAction);
    expect(semanticColors.soft).not.toBe(semanticColors.canvas);
    expect(semanticColors.border).not.toBe(semanticColors.contentPrimary);
  });

  it('keeps touch controls at accessible minimum sizes', () => {
    expect(touchTargets.minimum).toBeGreaterThanOrEqual(44);
    expect(controlHeights.small).toBeGreaterThanOrEqual(touchTargets.minimum);
    expect(controlHeights.medium).toBeGreaterThanOrEqual(touchTargets.minimum);
    expect(controlHeights.large).toBeGreaterThanOrEqual(touchTargets.minimum);
  });

  it('keeps tertiary text at normal-text contrast on light content surfaces', () => {
    const lightSurfaces = [
      semanticColors.canvas,
      semanticColors.card,
      semanticColors.raised,
      semanticColors.soft,
      semanticColors.surfaceSubtle,
      semanticColors.surfacePressed,
      semanticColors.surfaceEdge,
      semanticColors.infoSurface,
      semanticColors.successSurface,
      semanticColors.warningSurface,
      semanticColors.dangerSurface,
      semanticColors.streakSurface,
      semanticColors.protectedSurface,
      semanticColors.sheetSurface,
    ];

    for (const surface of lightSurfaces) {
      expect(contrastRatio(semanticColors.contentTertiary, surface)).toBeGreaterThanOrEqual(4.5);
    }

    expect(darkSemanticColors.contentTertiary).toBe(darkModePalette.textMuted);
  });

  it('uses a consistent spacing and type scale', () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(spacing.xs * 2);
    expect(typeScale.display.fontSize).toBeGreaterThan(typeScale.headline.fontSize);
    expect(layout.contentPadding).toBe(spacing.xxl);
    expect(radii.pill).toBeGreaterThan(radii.xl);
  });

  it('keeps the approved dark palette layered and aligned to shared semantic roles', () => {
    expect(darkModePalette.background).toBe('#111F29');
    expect(darkModePalette.surface).toBe('#1B2D38');
    expect(darkModePalette.primary).toBe('#42C2E6');
    expect(darkSemanticColors.canvas).toBe(darkModePalette.background);
    expect(darkSemanticColors.card).toBe(darkModePalette.surface);
    expect(darkSemanticColors.contentPrimary).toBe(darkModePalette.textPrimary);
    expect(darkSemanticColors.successContent).toBe(darkModePalette.success);
    expect(Object.keys(darkSemanticColors).sort()).toEqual(Object.keys(semanticColors).sort());
  });
});
