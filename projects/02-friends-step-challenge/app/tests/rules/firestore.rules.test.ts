import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';

const projectId = 'demo-stride-circle';
let testEnv: RulesTestEnvironment;

// firebase emulators:exec exposes its hub to child processes, but the rules
// harness uses the explicit Firestore endpoint below for deterministic tests.
delete process.env.FIREBASE_EMULATOR_HUB;
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
jest.setTimeout(30000);

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { host: '127.0.0.1', port: 8080 },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

async function seedCircle() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();

    await setDoc(doc(database, 'circles', 'public-circle'), {
      activityType: 'walking',
      competitionTimeZone: 'Africa/Lagos',
      discoverableArea: 'Lagos',
      inviteCode: null,
      joinPolicy: 'open',
      memberCount: 1,
      name: 'Public Circle',
      ownerId: 'owner-1',
      visibility: 'public',
    });
    await setDoc(doc(database, 'circles', 'public-circle', 'members', 'member-1'), {
      avatarSeed: 'member-1',
      avatarStyle: 'sprouts',
      displayName: 'Member One',
      role: 'member',
      userId: 'member-1',
    });
    await setDoc(doc(database, 'circles', 'private-circle'), {
      activityType: 'walking',
      competitionTimeZone: 'Africa/Lagos',
      discoverableArea: null,
      inviteCode: 'private-circle',
      joinPolicy: 'invite_only',
      memberCount: 1,
      name: 'Private Circle',
      ownerId: 'owner-1',
      visibility: 'private',
    });
  });
}

describe('Firestore launch rules', () => {
  beforeEach(async () => {
    await seedCircle();
  });

  it('rejects unauthenticated reads', async () => {
    const database = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(database, 'users', 'member-1')));
    await assertFails(getDocs(collection(database, 'circles')));
    await assertFails(getDoc(doc(database, 'globalLeaderboards', 'walk_all_time')));
  });

  it('makes global leaderboard entries public to signed-in users but immutable to clients', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'globalLeaderboards', 'walk_all_time'), {
        activityType: 'walk',
        period: 'all-time',
        periodKey: 'all-time',
      });
      await setDoc(doc(context.firestore(), 'globalLeaderboards', 'walk_all_time', 'entries', 'member-1'), {
        displayName: 'Member One',
        rank: 1,
        userId: 'member-1',
        verifiedSteps: 12000,
      });
    });

    const database = testEnv.authenticatedContext('outsider-1').firestore();
    const entry = doc(database, 'globalLeaderboards', 'walk_all_time', 'entries', 'member-1');

    await assertSucceeds(getDoc(entry));
    await assertFails(setDoc(entry, { rank: 1, userId: 'outsider-1', verifiedSteps: 999999 }));
  });

  it('keeps private circles out of collection discovery', async () => {
    const database = testEnv.authenticatedContext('member-1').firestore();

    await assertFails(getDocs(collection(database, 'circles')));
  });

  it('allows members to read scores but blocks outsiders', async () => {
    const memberDatabase = testEnv.authenticatedContext('member-1').firestore();
    const outsiderDatabase = testEnv.authenticatedContext('outsider-1').firestore();
    const score = doc(memberDatabase, 'circles', 'public-circle', 'days', '2026-10-01', 'scores', 'member-1');

    await assertSucceeds(getDoc(score));
    await assertFails(getDoc(doc(outsiderDatabase, 'circles', 'public-circle', 'days', '2026-10-01', 'scores', 'member-1')));
  });

  it('prevents clients from writing server-generated score projections', async () => {
    const database = testEnv.authenticatedContext('member-1').firestore();
    const score = doc(database, 'circles', 'public-circle', 'days', '2026-10-01', 'scores', 'member-1');

    await assertFails(setDoc(score, { steps: 999999, userId: 'member-1' }));
  });

  it('scopes circle chat to members and the authenticated author', async () => {
    const memberDatabase = testEnv.authenticatedContext('member-1').firestore();
    const outsiderDatabase = testEnv.authenticatedContext('outsider-1').firestore();
    const message = doc(memberDatabase, 'circles', 'public-circle', 'messages', 'message-1');

    await assertSucceeds(setDoc(message, {
      authorAvatarSeed: 'member-1',
      authorAvatarStyle: 'sprouts',
      authorId: 'member-1',
      authorName: 'Member One',
      body: 'Hello, circle!',
      circleId: 'public-circle',
      clientMessageId: 'message-1',
      createdAt: serverTimestamp(),
      schemaVersion: 1,
    }));
    await assertSucceeds(getDoc(message));
    await assertFails(getDoc(doc(outsiderDatabase, 'circles', 'public-circle', 'messages', 'message-1')));
  });

  it('rejects a circle message that impersonates another member', async () => {
    const database = testEnv.authenticatedContext('member-1').firestore();
    const message = doc(database, 'circles', 'public-circle', 'messages', 'message-spoof');

    await assertFails(setDoc(message, {
      authorAvatarSeed: 'member-1',
      authorAvatarStyle: 'sprouts',
      authorId: 'another-user',
      authorName: 'Member One',
      body: 'This should be rejected.',
      circleId: 'public-circle',
      clientMessageId: 'message-spoof',
      createdAt: serverTimestamp(),
      schemaVersion: 1,
    }));
  });
});

describe('private walking data', () => {
  it('keeps raw GPS chunks readable and writable only by the activity owner', async () => {
    const owner = testEnv.authenticatedContext('walker').firestore();
    const outsider = testEnv.authenticatedContext('circle-member').firestore();
    const guest = testEnv.unauthenticatedContext().firestore();
    const path = ['users', 'walker', 'activities', 'walk', 'rawRoute', '0'] as const;
    await assertSucceeds(setDoc(doc(owner, ...path), { samples: [{ latitude: 1, longitude: 1 }] }));
    await assertSucceeds(getDoc(doc(owner, ...path)));
    await assertFails(getDoc(doc(outsider, ...path))); await assertFails(getDoc(doc(guest, ...path)));
    await assertFails(setDoc(doc(outsider, ...path), { samples: [] }));
  });
  it('protects private activity detail including endpoints and notes', async () => {
    const owner = testEnv.authenticatedContext('walker').firestore();
    const outsider = testEnv.authenticatedContext('circle-member').firestore();
    await assertSucceeds(setDoc(doc(owner, 'users', 'walker', 'walkDetails', 'walk'), { notes: 'Private' }));
    await assertFails(getDoc(doc(outsider, 'users', 'walker', 'walkDetails', 'walk')));
    await assertFails(setDoc(doc(outsider, 'users', 'walker', 'walkDetails', 'walk'), { notes: 'Other' }));
  });
  it('lets only the route owner save, view, and delete a planned route', async () => {
    const owner = testEnv.authenticatedContext('walker').firestore();
    const outsider = testEnv.authenticatedContext('other').firestore();
    await assertSucceeds(setDoc(doc(owner, 'users', 'walker', 'plannedWalks', 'route'), { name: 'Park' }));
    await assertSucceeds(getDoc(doc(owner, 'users', 'walker', 'plannedWalks', 'route')));
    await assertFails(getDoc(doc(outsider, 'users', 'walker', 'plannedWalks', 'route')));
    await assertFails(deleteDoc(doc(outsider, 'users', 'walker', 'plannedWalks', 'route')));
    await assertSucceeds(deleteDoc(doc(owner, 'users', 'walker', 'plannedWalks', 'route')));
  });
});
