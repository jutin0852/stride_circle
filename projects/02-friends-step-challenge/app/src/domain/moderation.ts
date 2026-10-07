export const CHEER_TYPES = ['nice_work', 'keep_going', 'almost_there', 'lets_walk', 'congrats'] as const;
export type CheerType = (typeof CHEER_TYPES)[number];

export const REPORT_TARGET_TYPES = ['circle', 'member', 'cheer', 'profile'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASONS = ['spam', 'harassment', 'unsafe', 'privacy', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export function isCheerType(value: unknown): value is CheerType {
  return typeof value === 'string' && CHEER_TYPES.includes(value as CheerType);
}

export function isReportTargetType(value: unknown): value is ReportTargetType {
  return typeof value === 'string' && REPORT_TARGET_TYPES.includes(value as ReportTargetType);
}

export function isReportReason(value: unknown): value is ReportReason {
  return typeof value === 'string' && REPORT_REASONS.includes(value as ReportReason);
}
