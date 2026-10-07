export const MAX_CIRCLE_MEMBERS = 20;

export const CIRCLE_VISIBILITIES = ['private', 'public'] as const;
export type CircleVisibility = (typeof CIRCLE_VISIBILITIES)[number];

export const CIRCLE_JOIN_POLICIES = ['invite_only', 'open', 'approval'] as const;
export type CircleJoinPolicy = (typeof CIRCLE_JOIN_POLICIES)[number];

export const CIRCLE_ROLES = ['owner', 'moderator', 'member'] as const;
export type CircleRole = (typeof CIRCLE_ROLES)[number];

export function isCircleVisibility(value: unknown): value is CircleVisibility {
  return typeof value === 'string' && CIRCLE_VISIBILITIES.includes(value as CircleVisibility);
}

export function isCircleJoinPolicy(value: unknown): value is CircleJoinPolicy {
  return typeof value === 'string' && CIRCLE_JOIN_POLICIES.includes(value as CircleJoinPolicy);
}

export function getDefaultJoinPolicy(visibility: CircleVisibility): CircleJoinPolicy {
  return visibility === 'private' ? 'invite_only' : 'open';
}

export function validateCircleMembershipCount(memberCount: number) {
  return Number.isInteger(memberCount) && memberCount >= 0 && memberCount <= MAX_CIRCLE_MEMBERS;
}

export function isValidCompetitionTimeZone(value: unknown) {
  if (typeof value !== 'string' || !value) return false;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
