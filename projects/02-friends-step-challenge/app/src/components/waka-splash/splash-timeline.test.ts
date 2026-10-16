import { describe, expect, it } from 'vitest';

import { logoSettleScale, poseMatrix, printNameForSlot, runnerFootPose, SPLASH_END, TRAIL_SLOT_COUNT, trailPrintPose } from './splash-timeline';
import { WAKA_PRINTS } from './waka-prints';

const LOGO_PX = 0.25;
const SLOTS = Array.from({ length: TRAIL_SLOT_COUNT }, (_, slot) => slot);

describe('Waka splash timeline', () => {
  it('keeps the full splash at about two and a half seconds', () => {
    expect(SPLASH_END).toBeLessThanOrEqual(2.5);
  });

  it('alternates left (WA) and right (KA) prints around the loop', () => {
    expect(SLOTS.map(printNameForSlot)).toEqual(['WA', 'KA', 'WA', 'KA', 'WA', 'KA', 'WA', 'KA']);
  });

  it('shows no prints before the first landing', () => {
    for (const slot of SLOTS) expect(trailPrintPose(0.25, slot).opacity).toBe(0);
  });

  it('keeps the whole trail clearly visible by the end of the run', () => {
    for (const slot of SLOTS) expect(trailPrintPose(1.58, slot).opacity).toBeGreaterThanOrEqual(0.6);
  });

  it('ends on the exact Waka logo: the last WA and KA prints in place, the rest gone', () => {
    const last = TRAIL_SLOT_COUNT - 1;
    for (const [slot, name] of [[0, 'WA'], [last, 'KA']] as const) {
      const pose = trailPrintPose(SPLASH_END, slot);
      const print = WAKA_PRINTS[name];
      expect(pose.opacity).toBe(1);
      expect(pose.x).toBeCloseTo(print.logoX * LOGO_PX, 5);
      expect(pose.y).toBeCloseTo(print.logoY * LOGO_PX, 5);
      expect(pose.scale).toBeCloseTo(print.logoScale * LOGO_PX, 5);
      expect(((pose.rotation - print.logoRotation) % 360 + 360) % 360).toBeCloseTo(0, 5);
    }
    for (const slot of SLOTS.slice(1, -1)) expect(trailPrintPose(SPLASH_END, slot).opacity).toBe(0);
  });

  it('hides the live runner once the sweep starts', () => {
    expect(runnerFootPose(1.0, -1).opacity).toBe(1);
    expect(runnerFootPose(1.7, -1).opacity).toBe(0);
    expect(runnerFootPose(1.7, 1).opacity).toBe(0);
  });

  it('settles the logo with a small overshoot and rests at full size', () => {
    expect(logoSettleScale(2.2)).toBeGreaterThan(1);
    expect(logoSettleScale(2.2)).toBeLessThan(1.04);
    expect(logoSettleScale(SPLASH_END)).toBeCloseTo(1, 5);
  });

  it('lays the trail on one round loop: every print within a few px of the same radius', () => {
    const radii = SLOTS.map((slot) => { const p = trailPrintPose(1.58, slot); return Math.hypot(p.x, p.y); });
    expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(8);
  });

  it('turns a pose into the native SVG matrix (translate, rotate, scale)', () => {
    const [a, b, c, d, e, f] = poseMatrix({ x: 10, y: -4, rotation: 90, scale: 2 });
    expect([a, b, c, d, e, f].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([0, 2, -2, 0, 10, -4]);
  });
});
