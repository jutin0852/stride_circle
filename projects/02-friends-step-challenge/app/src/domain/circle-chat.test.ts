import { describe, expect, it } from 'vitest';

import { createCircleMessageId, normalizeCircleMessageBody, validateCircleMessageBody } from './circle-chat';

describe('circle chat domain rules', () => {
  it('normalizes whitespace without changing intentional line breaks', () => {
    expect(normalizeCircleMessageBody('  Hello\r\nwalkers  ')).toBe('Hello\nwalkers');
  });

  it('requires content and enforces the message length limit', () => {
    expect(validateCircleMessageBody('   ')).toBe('Write a message first.');
    expect(validateCircleMessageBody('Hello')).toBeNull();
    expect(validateCircleMessageBody('x'.repeat(501))).toBe('Keep messages under 500 characters.');
  });

  it('creates non-empty local ids for retryable sends', () => {
    expect(createCircleMessageId()).toMatch(/^message-/);
  });
});
