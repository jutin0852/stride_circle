import { describe, expect, it } from 'vitest';
import { isGoogleClientId } from './google-auth-config';

describe('Google OAuth configuration', () => {
  it('accepts real public client IDs', () => {
    expect(isGoogleClientId('123-ios-client.apps.googleusercontent.com')).toBe(true);
  });
  it('rejects placeholders, secrets, and missing configuration', () => {
    for (const value of [undefined, '', 'not-configured', 'secret', 'https://example.com']) {
      expect(isGoogleClientId(value)).toBe(false);
    }
  });
});
