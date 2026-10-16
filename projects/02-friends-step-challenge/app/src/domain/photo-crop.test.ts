import { describe, expect, it } from 'vitest';
import { getPhotoCrop } from './photo-crop';

describe('profile crop geometry', () => {
  it('centres square crops in portrait and landscape images', () => {
    expect(getPhotoCrop(4000, 3000)).toEqual({ originX: 500, originY: 0, width: 3000, height: 3000 });
    expect(getPhotoCrop(3000, 4000)).toEqual({ originX: 0, originY: 500, width: 3000, height: 3000 });
  });
  it('bounds zoom and position without exposing pixels outside the image', () => {
    for (const zoom of [0, 1, 1.25, 3, 10]) for (const x of [-2, 0, 0.5, 1, 2]) {
      const crop = getPhotoCrop(2401, 3301, zoom, x, 1 - x);
      expect(crop.width).toBe(crop.height);
      expect(crop.originX).toBeGreaterThanOrEqual(0);
      expect(crop.originY).toBeGreaterThanOrEqual(0);
      expect(crop.originX + crop.width).toBeLessThanOrEqual(2401);
      expect(crop.originY + crop.height).toBeLessThanOrEqual(3301);
    }
  });
  it('rejects invalid dimensions and handles tiny images', () => {
    expect(getPhotoCrop(1, 1, 3).width).toBe(1);
    expect(() => getPhotoCrop(0, 100)).toThrow('dimensions');
    expect(() => getPhotoCrop(NaN, 100)).toThrow('dimensions');
  });
});
