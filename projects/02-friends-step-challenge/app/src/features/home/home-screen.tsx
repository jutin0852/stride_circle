import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import { useCurrentCircle } from '@/hooks/use-current-circle';
import { useCircleDailySteps } from '@/hooks/use-circle-daily-steps';
import { useDailyStepRecord } from '@/hooks/use-daily-step-record';
import { useDailyStepGoal } from '@/hooks/use-daily-step-goal';
import { usePersonalStreak } from '@/hooks/use-personal-streak';
import { useStepTracking } from '@/hooks/use-step-tracking';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getDateKeyInTimeZone } from '@/domain/dates';
import { getLocalDateKey } from '@/lib/daily-steps';
import { getCircleDeadline, getHomeHealth, getStandingPreview } from './home-model';
import { HomeView, type HomeCircle } from './home-view';
import { useHomeGoalEvent } from './use-home-motion';
import { useHomeCheer } from './use-home-cheer';

export function HomeScreen() {
  const { user } = useAuth();
  const profile = useUserProfile(user);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    const subscription = AppState.addEventListener('change', (status) => { if (status === 'active') setNow(new Date()); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  const today = getLocalDateKey(now);
  const circle = useCurrentCircle(user?.uid);
  const details = circle.details;
  const health = useStepTracking();
  const circleDate = details ? getDateKeyInTimeZone(now, details.circle.competitionTimeZone) : today;
  const record = useDailyStepRecord({ userId: user?.uid, dateKey: today, circleId: details?.circle.id, circleDateKey: circleDate, circleTimeZone: details?.circle.competitionTimeZone, readSteps: health.getDailySteps, shouldSave: health.status === 'tracking' && health.dateKey === today, source: health.source, steps: health.todaySteps });
  const personal = getHomeHealth({ status: health.status, dateKey: health.dateKey, today, steps: health.todaySteps, savedSteps: record.savedSteps });
  const dailyGoal = useDailyStepGoal(user?.uid);
  const goal = dailyGoal.status === 'ready' ? dailyGoal.goal : null;
  const streak = usePersonalStreak({ goal: dailyGoal.goal, todaySteps: personal.state === 'confirmed' ? personal.steps ?? 0 : 0, userId: user?.uid });
  const goalEvent = useHomeGoalEvent(user?.uid, today, personal.steps, goal, personal.state === 'confirmed');
  const scores = useCircleDailySteps(details?.circle.id, circleDate, details?.circle.competitionTimeZone);
  const other = (details?.members ?? []).find((member) => member.userId !== user?.uid && (scores.steps[member.userId] ?? 0) > 0);
  const cheer = useHomeCheer(user?.uid, details?.circle.id, other?.userId, circleDate);
  const viewCircle = useMemo<HomeCircle | null>(() => {
    if (!details) return null;
    const preview = getStandingPreview(scores.status === 'ready' ? scores.steps : {}, details.members.map((member) => member.userId), user?.uid ?? '');
    const yourScore = preview.find((entry) => entry.userId === user?.uid);
    return {
      id: details.circle.id, name: details.circle.name, memberCount: details.circle.memberCount, rank: yourScore?.rank ?? null,
      deadline: getCircleDeadline(now, details.circle.competitionTimeZone), timeZone: details.circle.competitionTimeZone,
      scoreStatus: scores.status,
      standings: preview.filter((entry) => entry.userId === user?.uid || (!cheer.blockedIds.includes('*') && !cheer.blockedIds.includes(entry.userId))).map((entry) => ({ userId: entry.userId, name: details.members.find((member) => member.userId === entry.userId)?.displayName ?? 'Walker', steps: entry.verifiedSteps, rank: entry.rank, self: entry.userId === user?.uid })),
    };
  }, [cheer.blockedIds, details, now, scores.status, scores.steps, user?.uid]);
  return <HomeView key={user?.uid}
    greeting={profile.displayName === 'Stride Circle member' ? 'walker' : profile.displayName.split(' ')[0] || 'walker'}
    streak={streak.status === 'ready' && dailyGoal.status === 'ready' ? streak.summary.currentStreak : null}
    steps={personal.steps} goal={goal} health={personal.state} goalEvent={goalEvent}
    circle={viewCircle} circles={circle.circles}
    circleStatus={circle.status === 'error' ? 'error' : circle.status === 'loading' || (circle.selectedCircleId && !details) ? 'loading' : 'ready'}
    source={health.source === 'healthkit' ? 'Apple Health' : health.source === 'health-connect' ? 'Health Connect' : 'Step sensor'}
    healthBusy={health.status === 'checking' || health.status === 'requesting'}
    connectionError={record.syncStatus === 'error' ? 'Your latest steps couldn’t be saved. They will be retried when you’re online again.' : health.status === 'error' ? 'Health data couldn’t be read. Check access and try again.' : null}
    onProfile={() => router.push('/profile')} onHistory={() => router.push('/history')} onGoal={() => router.push('/daily-goal')}
    onWalk={() => router.push('/walk/record')} onPlanWalk={() => router.push('/walk/plan')}
    onCircles={() => router.push('/circle')} onCircle={() => { if (details) router.push({ pathname: '/circle/[circleId]', params: { circleId: details.circle.id } }); }}
    onSelectCircle={circle.selectCircle} onConnect={health.requestStepAccess} onHealthSettings={health.openHealthSettings} onRetryCircle={circle.refresh}
    social={other && scores.status === 'ready' && !cheer.blockedIds.includes('*') && !cheer.blockedIds.includes(other.userId) ? { name: other.displayName, steps: scores.steps[other.userId], status: cheer.status, onCheer: cheer.send } : null}
  />;
}
