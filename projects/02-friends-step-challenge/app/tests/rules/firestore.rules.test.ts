import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

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
});
