import type { RecordingSession } from '@/lib/activity-recording';
import type { HealthDataProvider } from '@/services/health-data/types';

/** Query exact active intervals, rather than subtracting daily totals across midnight or pauses. */
export async function readSessionSteps(session: RecordingSession, provider: HealthDataProvider, now = Date.now()): Promise<number | null> {
  if (!session.stepIntervals?.length || !await provider.isAvailable()) return null;
  const permission = await provider.getPermissionStatus();
  if (!permission.granted && permission.status !== 'unknown') return null;
  let total = 0;
  for (const interval of session.stepIntervals) {
    const end = interval.end ?? now;
    if (end <= interval.start) continue;
    const count = await provider.getDailySteps({ start: new Date(interval.start), end: new Date(end) });
    if (!Number.isFinite(count) || count < 0) return null;
    total += Math.round(count);
  }
  return total;
}
