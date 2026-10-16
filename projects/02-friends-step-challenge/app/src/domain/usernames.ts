export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;
export const PEOPLE_SEARCH_MIN_LENGTH = 2;
export const PEOPLE_SEARCH_LIMIT = 20;

/** Kept in sync with firebase/firestore.rules (`isValidUsername`). */
export const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'help',
  'moderator',
  'official',
  'root',
  'stride',
  'stridecircle',
  'support',
  'system',
  'waka',
] as const;

const USERNAME_PATTERN = /^[a-z][a-z0-9_.]{2,19}$/;

/** Handles are stored and compared lowercase, with an optional leading "@" ignored. */
export function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, '').toLowerCase();
}

/** Returns a user-facing problem, or null when the handle can be claimed. */
export function getUsernameError(value: string): string | null {
  const handle = normalizeUsername(value);
  if (handle.length < USERNAME_MIN_LENGTH) return `Use at least ${USERNAME_MIN_LENGTH} characters.`;
  if (handle.length > USERNAME_MAX_LENGTH) return `Use ${USERNAME_MAX_LENGTH} characters or fewer.`;
  if (!/^[a-z]/.test(handle)) return 'Start with a letter.';
  if (!/^[a-z0-9_.]+$/.test(handle)) return 'Use only letters, numbers, underscores and dots.';
  if (handle.includes('..')) return 'Dots cannot come one after another.';
  if (handle.endsWith('.')) return 'Do not end with a dot.';
  if (!USERNAME_PATTERN.test(handle)) return 'That username is not valid.';
  if ((RESERVED_USERNAMES as readonly string[]).includes(handle)) return 'That username is reserved.';
  return null;
}

export function isValidUsername(value: string) {
  return getUsernameError(value) === null;
}

/** A starting suggestion from a display name; the user can edit it. */
export function suggestUsername(displayName: string) {
  const base = displayName
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^[^a-z]+/, '')
    .replace(/\.+$/, '')
    .slice(0, USERNAME_MAX_LENGTH);
  return isValidUsername(base) ? base : '';
}

/** Upper bound for a prefix range query: `[prefix, prefix + '')`. */
export function getPrefixEnd(prefix: string) {
  return `${prefix}`;
}

/** A search term worth querying, or null when it is too short. */
export function normalizeSearchTerm(value: string) {
  const term = normalizeUsername(value);
  return term.length >= PEOPLE_SEARCH_MIN_LENGTH ? term : null;
}

export function getUsernameCooldownEnd(changedAt: Date | null) {
  if (!changedAt) return null;
  return new Date(changedAt.getTime() + USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
}

export type PublicProfile = {
  avatarSeed: string;
  avatarStyle: string;
  discoverable: boolean;
  displayName: string;
  userId: string;
  username: string;
  usernameChangedAt: Date | null;
};

/** Merges result lists, drops duplicates, the user and blocked people, and caps the total. */
export function mergePeopleResults(
  lists: readonly PublicProfile[][],
  options: { blockedIds: ReadonlySet<string>; limit?: number; selfId: string },
) {
  const seen = new Set<string>();
  const merged: PublicProfile[] = [];
  for (const list of lists) {
    for (const person of list) {
      if (person.userId === options.selfId || options.blockedIds.has(person.userId) || seen.has(person.userId)) continue;
      seen.add(person.userId);
      merged.push(person);
    }
  }
  return merged.slice(0, options.limit ?? PEOPLE_SEARCH_LIMIT);
}
