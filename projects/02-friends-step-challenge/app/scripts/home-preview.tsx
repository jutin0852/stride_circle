// Local design fixture for the real HomeView; no auth, Firebase or health access.
import { useState } from 'react';
import { AppRegistry, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeView, type HomeCircle } from '../src/features/home/home-view';

const query = new URLSearchParams(window.location.search);
const mode = query.get('state') ?? 'normal';
function Preview() {
  const [steps, setSteps] = useState(mode === 'goal' ? 8240 : mode === 'zero' ? 0 : 6240);
  const [event, setEvent] = useState(0);
  const [selected, setSelected] = useState('Morning Crew');
  const [cheer, setCheer] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [notice, setNotice] = useState('');
  const circle: HomeCircle = { id: selected, name: selected, memberCount: 8, rank: 3, deadline: 'Results in 4h 20m', timeZone: 'Africa/Lagos', scoreStatus: 'ready', standings: [
    { userId: 'maya', name: query.has('long') ? 'Maya Alexandra Montgomery' : 'Maya', steps: 8120, rank: 1, self: false },
    { userId: 'leo', name: 'Leo', steps: 7430, rank: 2, self: false }, { userId: 'you', name: 'You', steps: 6240, rank: 3, self: true },
  ] };
  const health = mode === 'unavailable' ? 'unavailable' : mode === 'stale' ? 'stale' : mode === 'loading' ? 'loading' : 'confirmed';
  return <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }, insets: { top: 0, bottom: 0, left: 0, right: 0 } }}><View style={{ flex: 1 }}>
    <View style={{ backgroundColor: '#173342', padding: 8 }}><Text style={{ color: 'white', fontSize: 12 }}>DESIGN PREVIEW · FICTIONAL SAMPLE DATA</Text><Pressable accessibilityRole="button" accessibilityLabel="Simulate goal crossing" onPress={() => { setSteps(8240); setEvent((value) => value + 1); }}><Text style={{ color: 'white' }}>Simulate goal crossing</Text></Pressable></View>
    <HomeView greeting="walker" profileName="Maya Walker" profileAvatar={{ seed: 'home-preview', style: 'sprouts' }} streak={12} steps={health === 'unavailable' || health === 'loading' ? null : steps} goal={8000} health={health} goalEvent={event}
      circle={mode === 'empty' ? null : circle} circleStatus={mode === 'circle-error' ? 'error' : mode === 'circle-loading' ? 'loading' : 'ready'} circles={[{ id: 'Morning Crew', name: 'Morning Crew' }, { id: 'Lunch Loop', name: 'Lunch Loop' }]}
      source="Sample provider" healthBusy={false} connectionError={null}
      onProfile={() => setNotice('Profile opened')} onGoal={() => setNotice('Goal opened')} onHistory={() => setNotice('History opened')} onCircle={() => setNotice('Circle opened')} onCircles={() => setNotice('Discovery opened')}
      onRetryCircle={() => setNotice('Circle retry')} onSelectCircle={async (id) => { setSelected(id); setCheer('idle'); }} onConnect={async () => { setNotice('Health retry'); }} onHealthSettings={async () => { setNotice('Health settings'); }}
      social={mode === 'empty' ? null : { name: 'Maya', steps: 8120, status: cheer, onCheer: async () => { setCheer('sending'); await new Promise((resolve) => setTimeout(resolve, 100)); setCheer('sent'); } }} />
    {notice ? <Text accessibilityRole="alert">{notice}</Text> : null}
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#DCE6EB' }}>{['Home', 'Circles', 'History'].map((name) => <Text key={name} style={{ color: '#087CA5', fontWeight: '700' }}>{name}</Text>)}</View>
  </View></SafeAreaProvider>;
}
AppRegistry.registerComponent('HomePreview', () => Preview);
AppRegistry.runApplication('HomePreview', { rootTag: document.getElementById('home-preview') });
