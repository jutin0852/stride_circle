// Isolated design fixture, never registered as an app route or connected to Firebase.
import { useState } from 'react';
import { AppText } from '../src/components/ui/AppText';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppRegistry, View } from 'react-native';
import { HistoryView } from '../src/features/history/history-view';
import { monthRange, shiftMonth } from '../src/domain/walking-history';
import { getStreakSummary } from '../src/lib/streaks';
import type { ActivityRecord } from '../src/lib/activities';
import type { HistoryLoadState } from '../src/features/history/use-walking-history';

const today = '2026-10-20';
// Keep the fixture sparse enough to exercise quiet no-data days, below-goal
// days, protected days, and disconnected journey segments in the preview.
const sampleDays = [
  { dateKey: '2026-10-01', steps: 8460 }, { dateKey: '2026-10-02', steps: 8750 },
  { dateKey: '2026-10-03', steps: 7000 }, { dateKey: '2026-10-04', steps: 8040 },
  { dateKey: '2026-10-05', steps: 9020 }, { dateKey: '2026-10-06', steps: 6240 },
  { dateKey: '2026-10-07', steps: 8180 }, { dateKey: '2026-10-08', steps: 0 },
  { dateKey: '2026-10-09', steps: 5420 }, { dateKey: '2026-10-10', steps: 9360 },
  { dateKey: '2026-10-11', steps: 7340 }, { dateKey: '2026-10-13', steps: 6800 },
  { dateKey: '2026-10-15', steps: 7200 }, { dateKey: '2026-10-17', steps: 8000 },
  { dateKey: '2026-10-20', steps: 4800 },
];
const previewParams = new URLSearchParams(window.location.search);
const state = previewParams.get('state') ?? 'ready';
const records = state === 'empty' ? [] : sampleDays;
const sampleWalks: ActivityRecord[] = [
  { activityType: 'walk', averagePaceSecondsPerKm: 726, dateKey: '2026-10-05', distanceMeters: 2640, durationMs: 32 * 60_000, id: 'sample-evening-loop', route: [{ latitude: 6.52, longitude: 3.37 }, { latitude: 6.521, longitude: 3.371 }] },
  { activityType: 'walk', averagePaceSecondsPerKm: 727, dateKey: '2026-10-02', distanceMeters: 1980, durationMs: 24 * 60_000, id: 'sample-lunch-stroll', route: [{ latitude: 6.52, longitude: 3.37 }, { latitude: 6.519, longitude: 3.369 }] },
];
const status: HistoryLoadState = state === 'loading' || state === 'error' ? state : 'ready';
const refresh = () => {};

function Preview() {
  const [month, setMonth] = useState('2026-10-01');
  const [selected, setSelected] = useState(today);
  const range = monthRange(month);
  // Web safe-area events overwrite initialMetrics with zero. Reserve the
  // physical-device top inset explicitly in this isolated screenshot fixture.
  return <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }, insets: { top: 0, bottom: 0, left: 0, right: 0 } }}>
    <View style={{ flex: 1, paddingTop: previewParams.has('iphone') ? 59 : 0, backgroundColor: '#F7FBFC' }}><View style={{ backgroundColor: '#0E2022', padding: 8 }}><AppText tone="inverse" variant="label">DESIGN PREVIEW · SAMPLE DATA ONLY</AppText></View>
      <HistoryView today={today} month={month} selected={selected} summary={getStreakSummary({ records, goal: 6000, todaySteps: 0, now: new Date(2026, 9, 20, 12) })} overview={{ records, status, refresh }} calendar={{ records: records.filter((day) => day.dateKey >= range.from && day.dateKey <= range.to), status, refresh }} goal={{ goal: 6000, status: state === 'goal-error' ? 'error' : status }} walks={{ records: state === 'empty' ? [] : sampleWalks, status, refresh }} refreshing={false} onRefresh={refresh} onSelect={setSelected} onOpenWalk={refresh} onMonthChange={(offset) => { const next = shiftMonth(month, offset); setMonth(next); setSelected(next === '2026-10-01' ? today : next); }} />
    </View>
  </SafeAreaProvider>;
}

const root = document.getElementById('history-preview');
if (!root) throw new Error('Run this fixture through the history preview server, not the app.');
AppRegistry.registerComponent('HistoryPreview', () => Preview);
AppRegistry.runApplication('HistoryPreview', { rootTag: root });
