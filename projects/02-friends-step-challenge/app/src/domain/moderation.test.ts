import { describe, expect, it } from 'vitest';

import {
  createCircleReportId,
  isCheerType,
  isCircleReportStatus,
  isReportReason,
  isReportTargetType,
  isValidReportTargetId,
} from './moderation';

describe('moderation values', () => {
  it('accepts only fixed cheer types', () => {
    expect(isCheerType('nice_work')).toBe(true);
    expect(isCheerType('free_text')).toBe(false);
  });

  it('accepts known report targets and reasons', () => {
    expect(isReportTargetType('member')).toBe(true);
    expect(isReportTargetType('message')).toBe(true);
    expect(isReportReason('privacy')).toBe(true);
    expect(isReportReason('insult')).toBe(false);
  });

  it('accepts only supported review statuses and safe target ids', () => {
    expect(isCircleReportStatus('open')).toBe(true);
    expect(isCircleReportStatus('deleted')).toBe(false);
    expect(isValidReportTargetId('message-123_abc')).toBe(true);
    expect(isValidReportTargetId('custom.uid-123')).toBe(true);
    expect(isValidReportTargetId('bad/target')).toBe(false);
    expect(isValidReportTargetId('')).toBe(false);
  });

  it('creates a stable per-reporter id for one target', () => {
    expect(createCircleReportId('walker-1', 'message', 'message-7')).toBe('walker-1_message_message-7');
  });
});
