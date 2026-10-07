import { describe, expect, it } from 'vitest';

import { controlHeights, darkModePalette, darkSemanticColors, layout, palette, radii, semanticColors, spacing, touchTargets, typeScale } from '@/design-system/tokens';

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
