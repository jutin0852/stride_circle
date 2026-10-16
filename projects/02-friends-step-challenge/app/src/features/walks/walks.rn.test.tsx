import { Pressable as MockPressable, View as MockView } from 'react-native';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';
import { useActivityTracking } from '@/hooks/use-activity-tracking';
import { useForegroundLocation } from '@/hooks/use-foreground-location';
import { activityFromSession, deleteWalk, getWalk, saveLocalWalk, syncPendingWalks } from '@/services/walks/repository';
import { matchWalkingRoute, searchWalkingPlaces, walkingDirections } from '@/services/maps/mapbox';
import { finishRecording, newRecording } from '@/lib/activity-recording';
import { shareableWalk } from '@/domain/walk';
import { shareWalkImage } from '@/services/walks/share';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { WalkRecorder } from './walk-recorder';
import { WalkDetail } from './walk-detail';
import { WalkPlanner } from './walk-planner';
import { ActivityScreen } from './activity-screen';
import { WalkShareCard } from './share-card';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: jest.fn(), replace: jest.fn(), push: jest.fn() }, useIsFocused: jest.fn(() => true), useLocalSearchParams: jest.fn(() => ({ id: 'walk' })) }));
jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual('react');
  return { SafeAreaInsetsContext: React.createContext({ top: 0, right: 0, bottom: 0, left: 0 }), SafeAreaView: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children), useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) };
});
jest.mock('@/auth/auth-provider', () => {
  const user = { uid: 'user' };
  return { useAuth: () => ({ user }) };
});
jest.mock('@/components/activity-map', () => ({ ActivityMap: (props: { showsRecenterButton?: boolean; onRecenter?: () => void; onSelectCoordinate?: (point: { latitude: number; longitude: number }) => void }) => <MockView accessibilityLabel="Walk map">
  {props.showsRecenterButton ? <MockPressable accessibilityRole="button" accessibilityLabel="Recenter on your location" onPress={props.onRecenter}><MockView /></MockPressable> : null}
  {props.onSelectCoordinate ? <MockPressable accessibilityRole="button" accessibilityLabel="Add a map point" onPress={() => props.onSelectCoordinate?.({ latitude: 37.79, longitude: -122.39 })}><MockView /></MockPressable> : null}
</MockView> }));
jest.mock('@/hooks/use-activity-tracking', () => ({ useActivityTracking: jest.fn() }));
jest.mock('@/hooks/use-foreground-location', () => ({ useForegroundLocation: jest.fn(() => ({ point: { latitude: 37.77, longitude: -122.42 }, status: 'ready', canAskAgain: true, refresh: jest.fn().mockResolvedValue({ latitude: 37.77, longitude: -122.42 }), openSettings: jest.fn() })) }));
jest.mock('@/hooks/use-walks', () => ({ useWalks: () => ({ routes: [], activities: [], loading: false, error: false, refresh: jest.fn() }) }));
jest.mock('@/lib/background-activity', () => ({ getBackgroundRecording: () => ({ session: null, issue: null }) }));
jest.mock('@/services/walks/repository', () => ({
  ...jest.requireActual('@/services/walks/repository'),
  deleteWalk: jest.fn().mockResolvedValue(undefined), getWalk: jest.fn(), saveLocalWalk: jest.fn().mockResolvedValue(undefined), syncPendingWalks: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('firebase/firestore', () => ({}));
jest.mock('@/lib/firebase', () => ({ database: {}, firebaseIsConfigured: true, requireFirebase: jest.fn() }));
jest.mock('@/services/maps/mapbox', () => ({
  MapServiceError: class MapServiceError extends Error { code: string; constructor(code: string) { super(code); this.code = code; } },
  mapboxToken: () => null, searchWalkingPlaces: jest.fn().mockResolvedValue([{ label: 'Riverside Park', detail: 'Lakeside, Example City', point: { latitude: 37.78, longitude: -122.4 } }]),
  walkingDirections: jest.fn(), staticWalkMapUrl: () => null, matchWalkingRoute: jest.fn(),
}));
jest.mock('@/services/walks/share', () => ({ shareWalkImage: jest.fn() }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

const finished = finishRecording({ ...newRecording('walk', 'user', 'walk', 1000), steps: 120 }, 11000);
const tracking = () => (useActivityTracking as jest.Mock).getMockImplementation()!();
beforeEach(() => {
  jest.clearAllMocks();
  (matchWalkingRoute as jest.Mock).mockImplementation(async (route: unknown) => route);
  (shareWalkImage as jest.Mock).mockResolvedValue(undefined);
  (launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: null });
  (router.canGoBack as jest.Mock).mockReturnValue(true);
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'walk' });
  (useActivityTracking as jest.Mock).mockReturnValue({ status: 'idle', isPreparing: false, isRestoring: false, steps: null,
    route: [], elapsedMs: 0, distanceMeters: 0, gpsSignal: 'idle', start: jest.fn(), pause: jest.fn(), resume: jest.fn(), reset: jest.fn(),
    finish: jest.fn().mockResolvedValue({ session: finished }), discard: jest.fn().mockResolvedValue(undefined), requestStepAccess: jest.fn(), retryStop: jest.fn() });
  (getWalk as jest.Mock).mockResolvedValue(activityFromSession(finished));
});
it('shows zero steps before a walk session starts', async () => {
  const screen = await render(<WalkRecorder />);
  expect(screen.getByLabelText('Steps: 0')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Connect step data' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Start a walk' }));
  expect(tracking().start).toHaveBeenCalledTimes(1);
});
it('keeps a missing live sensor reading distinct from a true zero', async () => {
  (useActivityTracking as jest.Mock).mockReturnValue({ ...tracking(), status: 'tracking' });
  const screen = await render(<WalkRecorder />);
  expect(screen.getByLabelText('Steps: Unavailable')).toBeTruthy();
  expect(screen.getByText(/Your phone hasn’t provided step data/)).toBeTruthy();
});
it('waits for the walker to tap Walk before starting a recording', async () => {
  const start = jest.fn().mockResolvedValue(undefined);
  (useActivityTracking as jest.Mock).mockReturnValue({ ...tracking(), start });
  const screen = await render(<WalkRecorder embedded />);
  expect(start).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Start a walk' }));
  await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
  expect(start).toHaveBeenCalledWith('walk', undefined);
});
it('opens Activity directly on the ready map with route planning available', async () => {
  const start = jest.fn().mockResolvedValue(undefined);
  (useActivityTracking as jest.Mock).mockReturnValue({ ...tracking(), start });
  const screen = await render(<ActivityScreen />);
  expect(screen.getByText('Ready to walk')).toBeTruthy();
  expect(screen.getByLabelText('Walk map')).toBeTruthy();
  expect(start).not.toHaveBeenCalled();
  expect(within(screen.getByTestId('walk-action-dock')).getByRole('button', { name: 'Start a walk' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Add or plan a route' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Start a walk' }));
  expect(start).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Add or plan a route' }));
  expect(router.push).toHaveBeenCalledWith('/walk/plan');
});
it('explains denied location access and exposes Settings', async () => {
  (useActivityTracking as jest.Mock).mockReturnValue({ ...tracking(), status: 'denied' });
  const screen = await render(<WalkRecorder />);
  expect(screen.getByText(/Location access is denied/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Open Settings' })).toBeTruthy();
});
it('disables starting while restoring or preparing', async () => {
  (useActivityTracking as jest.Mock).mockReturnValue({ ...tracking(), isPreparing: true });
  const screen = await render(<WalkRecorder />);
  expect(screen.getByRole('button', { name: 'Start a walk' }).props.accessibilityState.disabled).toBe(true);
});
it('keeps Start disabled while recovering an existing walk', async () => {
  (useActivityTracking as jest.Mock).mockReturnValue({ ...tracking(), isRestoring: true });
  const screen = await render(<WalkRecorder />);
  await fireEvent.press(screen.getByRole('button', { name: 'Start a walk' }));
  expect(tracking().start).not.toHaveBeenCalled();
});
it('preserves pause and resume actions with the animated controls', async () => {
  const pause = jest.fn();
  const resume = jest.fn().mockResolvedValue(undefined);
  (useActivityTracking as jest.Mock).mockReturnValue({ ...tracking(), status: 'tracking', pause, resume });
  const screen = await render(<WalkRecorder />);
  await fireEvent.press(screen.getByRole('button', { name: 'Pause walk' }));
  expect(pause).toHaveBeenCalledTimes(1);
  (useActivityTracking as jest.Mock).mockReturnValue({ ...tracking(), status: 'paused' });
  await screen.rerender(<WalkRecorder />);
  await fireEvent.press(screen.getByRole('button', { name: 'Resume walk' }));
  expect(resume).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Finish' })).toBeTruthy();
});
it('offers a clear finish choice and saves only after confirmation', async () => {
  (useActivityTracking as jest.Mock).mockReturnValue({ ...tracking(), status: 'tracking' });
  const screen = await render(<WalkRecorder />);
  await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
  expect(screen.getByText('Finish this walk?')).toBeTruthy();
  expect(saveLocalWalk).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Finish & save' }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: '/walk/[id]', params: { id: 'walk', justSaved: '1' } }));
  expect(saveLocalWalk).toHaveBeenCalledWith(expect.objectContaining({ steps: 120, rawCoordinates: [] }));
});
it('snaps a saved route automatically in the background without blocking the detail screen', async () => {
  const route = [
    { latitude: 37.77, longitude: -122.42 },
    { latitude: 37.771, longitude: -122.421 },
  ];
  const matchedRoute = [
    { latitude: 37.7701, longitude: -122.4201 },
    { latitude: 37.7711, longitude: -122.4211 },
  ];
  const routedSession = { ...finished, route, distanceMeters: 250 };
  (getWalk as jest.Mock).mockResolvedValue(activityFromSession(routedSession));
  (matchWalkingRoute as jest.Mock).mockResolvedValueOnce(matchedRoute);
  (useActivityTracking as jest.Mock).mockReturnValue({ ...tracking(), status: 'tracking', finish: jest.fn().mockResolvedValue({ session: routedSession }) });
  const screen = await render(<WalkRecorder />);
  await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Finish & save' }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: '/walk/[id]', params: { id: 'walk', justSaved: '1' } }));
  await waitFor(() => expect(matchWalkingRoute).toHaveBeenCalledWith(route));
  await waitFor(() => expect(saveLocalWalk).toHaveBeenCalledWith(expect.objectContaining({ displayCoordinates: matchedRoute })));
});
it('pushes the saved walk over Activity so Back returns to the tab', async () => {
  (useActivityTracking as jest.Mock).mockReturnValue({ ...tracking(), status: 'tracking' });
  const screen = await render(<WalkRecorder embedded />);
  await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Finish & save' }));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: '/walk/[id]', params: { id: 'walk', justSaved: '1' } }));
  expect(router.replace).not.toHaveBeenCalled();
});
it('lets a walker discard an accidental session without saving it', async () => {
  (useActivityTracking as jest.Mock).mockReturnValue({ ...tracking(), status: 'tracking' });
  const screen = await render(<WalkRecorder />);
  await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Discard walk' }));
  expect(screen.getByText('Are you sure? This walk and its recorded route will be permanently removed.')).toBeTruthy();
  expect(tracking().discard).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Yes, discard walk' }));
  await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  expect(tracking().discard).toHaveBeenCalledTimes(1);
  expect(saveLocalWalk).not.toHaveBeenCalled();
});
it('keeps the Activity tab open after a confirmed discard', async () => {
  (useActivityTracking as jest.Mock).mockReturnValue({ ...tracking(), status: 'tracking' });
  const screen = await render(<WalkRecorder embedded />);
  await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Discard walk' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Yes, discard walk' }));
  await waitFor(() => expect(tracking().discard).toHaveBeenCalledTimes(1));
  expect(router.back).not.toHaveBeenCalled();
});
it('shows completed statistics and handles an empty route', async () => {
  const screen = await render(<WalkDetail />);
  await waitFor(() => expect(screen.getByLabelText('Steps: 120')).toBeTruthy());
  expect(screen.getByLabelText('Distance: 0.00 km')).toBeTruthy();
  expect(screen.getByLabelText('Walking time: 0:10')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Share walk' })).toBeTruthy();
  expect(screen.queryByText('Average pace')).toBeNull();
  expect(screen.queryByText('Elapsed time')).toBeNull();
  expect(screen.queryByText('Moving time (GPS)')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Snap route to walking paths' })).toBeNull();
  expect(screen.queryByLabelText('Privacy distance in meters')).toBeNull();
});
it('returns to History when a saved walk has no back-stack entry', async () => {
  (router.canGoBack as jest.Mock).mockReturnValue(false);
  const screen = await render(<WalkDetail />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(router.replace).toHaveBeenCalledWith('/history');
  expect(router.back).not.toHaveBeenCalled();
});
it('opens a share overlay with private defaults and delegates destination choice to the system', async () => {
  (shareWalkImage as jest.Mock).mockResolvedValue(undefined);
  const screen = await render(<WalkDetail />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Share walk' })).toBeTruthy());
  expect(screen.getByLabelText('Include route map').props.value).toBe(true);
  expect(screen.getByLabelText('Show streets and place labels').props.value).toBe(false);
  expect(screen.getByLabelText('Show streets and place labels').props.disabled).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Share walk' }));
  expect(screen.getByText('Share this walk')).toBeTruthy();
  expect(screen.queryByText('Story')).toBeNull();
  expect(screen.queryByText('Square')).toBeNull();
  const overlay = within(screen.getByTestId('walk-share-overlay-content'));
  expect(overlay.queryByLabelText('Include route map')).toBeNull();
  expect(overlay.queryByLabelText('Show streets and place labels')).toBeNull();
  expect(overlay.queryByText('Choose what appears, then pick an app.')).toBeNull();
  expect(screen.getByText('No GPS route was recorded for this walk.')).toBeTruthy();
  expect(screen.queryByLabelText('Include exact start and end')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Share' }));
  expect(shareWalkImage).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ route: [] }), true, expect.any(AbortSignal));
});
it('keeps exact endpoints private and exposes no privacy configuration', async () => {
  const walk = { ...activityFromSession(finished), displayCoordinates: [
    { latitude: 6.524, longitude: 3.379 }, { latitude: 6.5241, longitude: 3.3791 },
  ], privacy: { hideMap: false, hideStartEnd: false, radiusMeters: 0 } };
  (getWalk as jest.Mock).mockResolvedValue(walk);
  const screen = await render(<WalkDetail />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Share walk' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Share walk' }));
  expect(screen.getByText(/too short to show while keeping the start and finish private/)).toBeTruthy();
  expect(screen.queryByLabelText('Include exact start and end')).toBeNull();
  expect(screen.queryByLabelText('Privacy distance in meters')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Share' }));
  expect(shareWalkImage).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ route: [] }), true, expect.any(AbortSignal));
});
it('can cancel share preparation and ignores a late failure after reopening', async () => {
  let rejectShare!: (reason: Error) => void;
  (shareWalkImage as jest.Mock).mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { rejectShare = reject; }));
  const screen = await render(<WalkDetail />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Share walk' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Share walk' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Share' }));
  const signal = (shareWalkImage as jest.Mock).mock.calls[0][3] as AbortSignal;
  expect(screen.getByRole('button', { name: 'Close share preview' }).props.disabled).not.toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Close share preview' }));
  expect(signal.aborted).toBe(true);
  await waitFor(() => expect(screen.queryByText('Share this walk')).toBeNull());
  await fireEvent.press(screen.getByRole('button', { name: 'Share walk' }));
  await act(async () => { rejectShare(new Error('Late capture failure')); });
  expect(screen.queryByText('Sharing could not open. Try again.')).toBeNull();
  expect(screen.getByRole('button', { name: 'Share' }).props.accessibilityState.disabled).not.toBe(true);
});
it('dismisses the share overlay by tapping its backdrop and can open it again', async () => {
  const screen = await render(<WalkDetail />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Share walk' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Share walk' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Dismiss share preview', includeHiddenElements: true }));
  await waitFor(() => expect(screen.queryByText('Share this walk')).toBeNull());
  await fireEvent.press(screen.getByRole('button', { name: 'Share walk' }));
  expect(screen.getByText('Share this walk')).toBeTruthy();
});
it('keeps account synchronization automatic and hides implementation details', async () => {
  const screen = await render(<WalkDetail />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Share walk' })).toBeTruthy());
  expect(screen.queryByRole('button', { name: /sync|upload/i })).toBeNull();
  expect(screen.queryByText(/sync|upload|firebase|cloud copy/i)).toBeNull();
  expect(screen.getByRole('button', { name: 'Save changes' }).props.accessibilityState.disabled).toBe(true);
  await fireEvent.changeText(screen.getByLabelText('Private activity notes'), 'A quiet evening walk');
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(syncPendingWalks).toHaveBeenCalledWith('user'));
});
it('confirms deletion and returns to History', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find(button => button.text === 'Delete walk')?.onPress?.();
  });
  const screen = await render(<WalkDetail />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Delete saved walk' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Delete saved walk' }));
  expect(alert).toHaveBeenCalledWith('Delete saved walk?', expect.any(String), expect.any(Array));
  await waitFor(() => expect(deleteWalk).toHaveBeenCalledWith('user', 'walk'));
  expect(router.replace).toHaveBeenCalledWith('/history');
  alert.mockRestore();
});
it('confirms saved edits and clears success when the name changes again', async () => {
  const screen = await render(<WalkDetail />);
  await waitFor(() => expect(screen.getByLabelText('Activity title')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Activity title'), 'Evening walk');
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy());
  expect(saveLocalWalk).toHaveBeenCalledWith(expect.objectContaining({ title: 'Evening walk', id: 'walk' }));
  await fireEvent.changeText(screen.getByLabelText('Activity title'), 'Another title');
  expect(screen.queryByText('Saved')).toBeNull();
});
it('keeps drafts and reports a failed local save instead of showing success', async () => {
  (saveLocalWalk as jest.Mock).mockRejectedValueOnce(new Error('Storage full'));
  const screen = await render(<WalkDetail />);
  await waitFor(() => expect(screen.getByLabelText('Activity title')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Activity title'), 'My unsaved walk');
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByText('Changes could not save. Try again.')).toBeTruthy());
  expect(screen.getByLabelText('Activity title').props.value).toBe('My unsaved walk');
  expect(screen.queryByText('Saved')).toBeNull();
});
it('can replace the share background with a photo, wait for loading, and restore the route view', async () => {
  (launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///test-photo.jpg' }] });
  const screen = await render(<WalkDetail />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Share walk' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Share walk' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Add photo' }));
  await waitFor(() => expect(screen.getByTestId('walk-share-photo')).toBeTruthy());
  expect(screen.getByRole('button', { name: 'Share' }).props.accessibilityState.disabled).toBe(true);
  expect(launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['images'], exif: false }));
  await fireEvent(screen.getByTestId('walk-share-photo'), 'load');
  expect(screen.getByRole('button', { name: 'Share' }).props.accessibilityState.disabled).toBe(false);
  expect(within(screen.getByTestId('walk-share-overlay-content')).getByText('120')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Use route' }));
  expect(screen.queryByTestId('walk-share-photo')).toBeNull();
  expect(screen.getByText('No GPS route was recorded for this walk.')).toBeTruthy();
});
it('keeps the route preview when photo picking is cancelled', async () => {
  const screen = await render(<WalkDetail />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Share walk' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Share walk' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Add photo' }));
  await waitFor(() => expect(launchImageLibraryAsync).toHaveBeenCalledTimes(1));
  expect(screen.queryByTestId('walk-share-photo')).toBeNull();
  expect(screen.getByText('No GPS route was recorded for this walk.')).toBeTruthy();
});
it('offers saved routes and clear missing-token handling in the planner', async () => {
  const screen = await render(<WalkPlanner />);
  expect(screen.getByText(/Mapbox is not configured/)).toBeTruthy();
  expect(screen.getByText('No saved routes yet.')).toBeTruthy();
});
it('keeps the route start user-selected and recenters without adding a waypoint', async () => {
  const refresh = jest.fn().mockResolvedValue({ latitude: 37.77, longitude: -122.42 });
  (useForegroundLocation as jest.Mock).mockReturnValueOnce({ point: { latitude: 37.77, longitude: -122.42 }, status: 'ready', canAskAgain: true, refresh, openSettings: jest.fn() });
  const screen = await render(<WalkPlanner />);
  expect(screen.getByRole('button', { name: 'Recenter on your location' })).toBeTruthy();
  expect(screen.queryByText('Current location')).toBeNull();
  expect(screen.queryByText('Start')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Recenter on your location' }));
  await waitFor(() => expect(refresh).toHaveBeenCalledWith(true));
  expect(screen.queryByText('Start')).toBeNull();
});
it('plans with named place search and map points instead of coordinate entry', async () => {
  (walkingDirections as jest.Mock).mockResolvedValue({ coordinates: [{ latitude: 37.78, longitude: -122.4 }, { latitude: 37.79, longitude: -122.39 }], distanceMeters: 1200, estimatedDurationSeconds: 900 });
  const screen = await render(<WalkPlanner />);
  await fireEvent.changeText(screen.getByLabelText('Search for a place'), 'Riverside Park');
  await waitFor(() => expect(screen.getByRole('button', { name: /Add Riverside Park/ })).toBeTruthy());
  expect(searchWalkingPlaces).toHaveBeenCalledWith('Riverside Park', { latitude: 37.77, longitude: -122.42 });
  await fireEvent.press(screen.getByRole('button', { name: /Add Riverside Park/ }));
  expect(screen.getByText('Start')).toBeTruthy();
  expect(screen.getByText('Riverside Park')).toBeTruthy();
  expect(screen.queryByText('Current location')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Add a map point' }));
  expect(screen.getByText('Destination')).toBeTruthy();
  expect(screen.queryByLabelText('Waypoint latitude')).toBeNull();
  expect(screen.queryByLabelText('Waypoint longitude')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Find walking route' }));
  await waitFor(() => expect(screen.getByText('1.20 km')).toBeTruthy());
  expect(screen.getByText('Walking time')).toBeTruthy();
  expect(screen.getByText('15:00')).toBeTruthy();
  expect(screen.getByText('Estimated steps')).toBeTruthy();
  expect(screen.getByText('≈ 1,600')).toBeTruthy();
});
it('does not render a private route on a fully masked share card', async () => {
  const walk = activityFromSession(finished);
  const screen = await render(<WalkShareCard walk={shareableWalk(walk)} routeEmptyMessage="No GPS route was recorded for this walk." />);
  expect(screen.getByText('No GPS route was recorded for this walk.')).toBeTruthy();
});
it('keeps walk statistics and the filtered route over a photo without sharing private notes', async () => {
  const walk = { ...activityFromSession(finished), notes: 'Do not share these notes', displayCoordinates: [
    { latitude: 6.52, longitude: 3.37 }, { latitude: 6.525, longitude: 3.375 },
    { latitude: 6.53, longitude: 3.38 }, { latitude: 6.535, longitude: 3.385 },
  ] };
  const screen = await render(<WalkShareCard walk={shareableWalk(walk)} photoUri="file:///photo.jpg" routeEmptyMessage="No route" />);
  expect(screen.getByTestId('walk-share-photo')).toBeTruthy();
  expect(screen.getByTestId('walk-share-route')).toBeTruthy();
  expect(screen.getByText('120')).toBeTruthy();
  expect(screen.queryByText('Do not share these notes')).toBeNull();
  await screen.rerender(<WalkShareCard walk={shareableWalk({ ...walk, privacy: { ...walk.privacy, hideMap: true } })} photoUri="file:///photo.jpg" routeEmptyMessage="No route" />);
  expect(screen.queryByTestId('walk-share-route')).toBeNull();
  expect(screen.getByText('120')).toBeTruthy();
});
