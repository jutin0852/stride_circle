import { describe, expect, it } from 'vitest';

import { getDateKeyInTimeZone, isValidTimeZone } from './dates';

describe('getDateKeyInTimeZone', () => {
  it('uses the circle timezone rather than the device timezone', () => {
    const instant = new Date('2026-10-02T00:30:00.000Z');

    expect(getDateKeyInTimeZone(instant, 'America/Los_Angeles')).toBe('2026-10-01');
    expect(getDateKeyInTimeZone(instant, 'Africa/Lagos')).toBe('2026-10-02');
  });
});

describe('isValidTimeZone', () => {
  it('rejects unknown IANA timezones', () => {
    expect(isValidTimeZone('Not/A_Timezone')).toBe(false);
    expect(isValidTimeZone('UTC')).toBe(true);
  });
});
