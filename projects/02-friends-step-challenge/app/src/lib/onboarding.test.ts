import { describe, expect, it } from 'vitest';

import { needsOnboarding } from './onboarding';

describe('needsOnboarding', () => {
  it('only shows setup for profiles explicitly created for the new flow', () => {
    expect(needsOnboarding(undefined)).toBe(false);
    expect(needsOnboarding({})).toBe(false);
    expect(needsOnboarding({ onboardingVersion: 1 })).toBe(false);
    expect(needsOnboarding({ onboardingVersion: 0 })).toBe(true);
  });
});
