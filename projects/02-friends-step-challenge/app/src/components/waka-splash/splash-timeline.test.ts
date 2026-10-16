import { describe, expect, it } from 'vitest';

import { logoSettleScale, printNameForSlot, runnerFootPose, SPLASH_END, trailPrintPose } from './splash-timeline';
import { WAKA_PRINTS } from './waka-prints';

const LOGO_PX = 0.25;

describe('Waka splash timeline', () => {
  it('alternates left (WA) and right (KA) prints around the loop', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(printNameForSlot)).toEqual(['WA', 'KA', 'WA', 'KA', 'WA', 'KA', 'WA', 'KA']);
  });

  it('shows no prints before the first landing', () => {
    for (let slot = 0; slot < 8; slot += 1) expect(trailPrintPose(0.3, slot).opacity).toBe(0);
  });

  it('stamps every slot of the loop by the end of the run', () => {
    for (let slot = 0; slot < 8; slot += 1) expect(trailPrintPose(1.9, slot).opacity).toBeGreaterThan(0.3);
  });

  it('ends on the exact Waka logo: the last WA and KA prints in place, the rest gone', () => {
    for (const [slot, name] of [[0, 'WA'], [7, 'KA']] as const) {
      const pose = trailPrintPose(SPLASH_END, slot);
      const print = WAKA_PRINTS[name];
      expect(pose.opacity).toBe(1);
      expect(pose.x).toBeCloseTo(print.logoX * LOGO_PX, 5);
      expect(pose.y).toBeCloseTo(print.logoY * LOGO_PX, 5);
      expect(pose.scale).toBeCloseTo(print.logoScale * LOGO_PX, 5);
      expect(((pose.rotation - print.logoRotation) % 360 + 360) % 360).toBeCloseTo(0, 5);
    }
    for (const slot of [1, 2, 3, 4, 5, 6]) expect(trailPrintPose(SPLASH_END, slot).opacity).toBe(0);
  });

  it('hides the live runner once the sweep starts', () => {
    expect(runnerFootPose(1.0, -1).opacity).toBe(1);
    expect(runnerFootPose(2.0, -1).opacity).toBe(0);
    expect(runnerFootPose(2.0, 1).opacity).toBe(0);
  });

  it('settles the logo with a small overshoot and rests at full size', () => {
    expect(logoSettleScale(2.75)).toBeGreaterThan(1);
    expect(logoSettleScale(2.75)).toBeLessThan(1.04);
    expect(logoSettleScale(SPLASH_END)).toBeCloseTo(1, 5);
  });
});
