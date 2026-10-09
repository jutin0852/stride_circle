import { describe, expect, it } from 'vitest';
import { DEFAULT_WALKING_REMINDER, parseReminderTime, readReminderPreferences } from './walking-reminders';

describe('walking reminder preferences', () => {
  it('accepts valid local 24-hour times, including midnight', () => {
    expect(parseReminderTime('00:00')).toEqual({ hour: 0, minute: 0 });
    expect(parseReminderTime('8:30')).toEqual({ hour: 8, minute: 30 });
    expect(parseReminderTime('23:59')).toEqual({ hour: 23, minute: 59 });
    for (const value of ['24:00', '12:60', '8:3', '18', '-1:00', '12:30pm', '']) expect(parseReminderTime(value)).toBeNull();
  });
  it('keeps reminders off when storage is missing or damaged', () => {
    for (const value of [null, '{broken', '{"enabled":true,"hour":24,"minute":0}', '{"enabled":"true","hour":8,"minute":0}']) {
      expect(readReminderPreferences(value)).toEqual(DEFAULT_WALKING_REMINDER);
    }
    expect(readReminderPreferences('{"enabled":true,"hour":8,"minute":30}')).toEqual({ enabled: true, hour: 8, minute: 30 });
  });
});
