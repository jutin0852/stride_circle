import { describe, expect, it } from 'vitest';

import {
  getPrefixEnd,
  getUsernameCooldownEnd,
  getUsernameError,
  mergePeopleResults,
  normalizeSearchTerm,
  normalizeUsername,
  suggestUsername,
  type PublicProfile,
} from './usernames';

function person(userId: string, username: string): PublicProfile {
  return { avatarSeed: userId, avatarStyle: 'sprouts', discoverable: true, displayName: username, userId, username, usernameChangedAt: null };
}

describe('usernames', () => {
  it('normalises case, whitespace and a leading @', () => {
    expect(normalizeUsername('  @Ada.Walks ')).toBe('ada.walks');
  });

  it('accepts valid handles', () => {
    for (const handle of ['ada', 'ada.walks', 'ada_99', '@Ada_Walks', 'a'.concat('b'.repeat(19))]) {
      expect(getUsernameError(handle)).toBeNull();
    }
  });

  it('rejects invalid handles', () => {
    expect(getUsernameError('ab')).toMatch(/at least/);
    expect(getUsernameError('a'.repeat(21))).toMatch(/or fewer/);
    expect(getUsernameError('1ada')).toMatch(/letter/);
    expect(getUsernameError('ada walks')).toMatch(/only letters/);
    expect(getUsernameError('ada-walks')).toMatch(/only letters/);
    expect(getUsernameError('ada..walks')).toMatch(/Dots/);
    expect(getUsernameError('ada.')).toMatch(/end with a dot/);
    expect(getUsernameError('Admin')).toMatch(/reserved/);
    expect(getUsernameError('stridecircle')).toMatch(/reserved/);
  });

  it('suggests a handle from a display name, or nothing', () => {
    expect(suggestUsername('Ada Lovelace')).toBe('ada.lovelace');
    expect(suggestUsername('Zoë  Q.')).toBe('zoe.q');
    expect(suggestUsername('12')).toBe('');
    expect(suggestUsername('Admin')).toBe('');
  });

  it('builds prefix bounds and ignores short search terms', () => {
    expect(getPrefixEnd('ad')).toBe('ad');
    expect(normalizeSearchTerm(' A')).toBeNull();
    expect(normalizeSearchTerm('@Ad')).toBe('ad');
  });

  it('computes the change cooldown end', () => {
    expect(getUsernameCooldownEnd(null)).toBeNull();
    expect(getUsernameCooldownEnd(new Date('2026-01-01T00:00:00Z'))?.toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });

  it('merges results without duplicates, yourself or blocked people', () => {
    const merged = mergePeopleResults(
      [[person('a', 'ada'), person('me', 'mia')], [person('a', 'ada'), person('b', 'bob'), person('x', 'xan')]],
      { blockedIds: new Set(['x']), selfId: 'me' },
    );
    expect(merged.map((entry) => entry.userId)).toEqual(['a', 'b']);
  });
});
