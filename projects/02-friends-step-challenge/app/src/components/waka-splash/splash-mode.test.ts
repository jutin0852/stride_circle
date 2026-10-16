import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));

import { chooseSplashMode, localDateKey } from './splash-mode';

describe('splash mode', () => {
  it('plays the full splash on the first launch of a day', () => {
    expect(chooseSplashMode(null, '2026-10-16')).toBe('full');
    expect(chooseSplashMode('2026-10-15', '2026-10-16')).toBe('full');
  });

  it('plays the short splash on later launches the same day', () => {
    expect(chooseSplashMode('2026-10-16', '2026-10-16')).toBe('short');
  });

  it('uses the local calendar date', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
