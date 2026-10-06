import { describe, expect, it } from 'vitest';

import { isCheerType, isReportReason, isReportTargetType } from './moderation';

describe('moderation values', () => {
  it('accepts only fixed cheer types', () => {
    expect(isCheerType('nice_work')).toBe(true);
    expect(isCheerType('free_text')).toBe(false);
  });

  it('accepts known report targets and reasons', () => {
    expect(isReportTargetType('member')).toBe(true);
    expect(isReportTargetType('message')).toBe(false);
    expect(isReportReason('privacy')).toBe(true);
    expect(isReportReason('insult')).toBe(false);
  });
});
