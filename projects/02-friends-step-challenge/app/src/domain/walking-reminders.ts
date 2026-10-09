export type WalkingReminderPreferences = { enabled: boolean; hour: number; minute: number };
export type ReminderPermission = 'granted' | 'undetermined' | 'denied' | 'unavailable' | 'unsupported';
export const WALKING_REMINDER_KIND = 'walking-reminder';
export const DEFAULT_WALKING_REMINDER: WalkingReminderPreferences = { enabled: false, hour: 18, minute: 0 };

export function isReminderTime(hour: number, minute: number) {
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 && Number.isInteger(minute) && minute >= 0 && minute <= 59;
}

export function parseReminderTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return isReminderTime(hour, minute) ? { hour, minute } : null;
}

export function readReminderPreferences(value: string | null): WalkingReminderPreferences {
  try {
    const data = value ? JSON.parse(value) : null;
    if (data && typeof data.enabled === 'boolean' && isReminderTime(data.hour, data.minute)) {
      return { enabled: data.enabled, hour: data.hour, minute: data.minute };
    }
  } catch { /* A damaged local preference must never enable notifications. */ }
  return { ...DEFAULT_WALKING_REMINDER };
}

export function reminderTimeText({ hour, minute }: { hour: number; minute: number }) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
