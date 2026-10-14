import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { request as httpRequest } from 'node:http';
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';

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
      memberCount: 2,
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
    await setDoc(doc(database, 'circles', 'public-circle', 'members', 'owner-1'), {
      avatarSeed: 'owner-1',
      avatarStyle: 'sprouts',
      displayName: 'Circle Owner',
      role: 'owner',
      userId: 'owner-1',
    });
    await setDoc(doc(database, 'users', 'member-1', 'circleMemberships', 'public-circle'), {
      circleId: 'public-circle',
      circleName: 'Public Circle',
      joinedAt: serverTimestamp(),
      role: 'member',
    });
    await setDoc(doc(database, 'users', 'owner-1', 'circleMemberships', 'public-circle'), {
      circleId: 'public-circle',
      circleName: 'Public Circle',
      joinedAt: serverTimestamp(),
      role: 'owner',
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

async function clearFirestoreData() {
  const emulator = testEnv.emulators.firestore;
  if (!emulator) throw new Error('Firestore emulator is required to run these rules tests.');

  // jest-expo replaces fetch with a response shim that fails on the emulator's empty DELETE response.
  await new Promise<void>((resolve, reject) => {
    const request = httpRequest({
      hostname: emulator.host,
      port: emulator.port,
      path: `/emulator/v1/projects/${projectId}/databases/(default)/documents`,
      method: 'DELETE',
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => { body += chunk; });
      response.on('end', () => {
        const status = response.statusCode ?? 0;
        if (status >= 200 && status < 300) resolve();
        else reject(new Error(`Firestore emulator cleanup failed (${status}): ${body}`));
      });
    });

    request.on('error', reject);
    request.end();
  });
}

describe('Firestore launch rules', () => {
  beforeEach(async () => {
    await clearFirestoreData();
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

  it('lets a signed-in nonmember report a public circle without exposing reports to them', async () => {
    const outsider = testEnv.authenticatedContext('outsider-1').firestore();
    const owner = testEnv.authenticatedContext('owner-1').firestore();
    const report = doc(outsider, 'circles', 'public-circle', 'reports', 'outsider-1_circle_public-circle');
    const payload = {
      circleId: 'public-circle',
      createdAt: serverTimestamp(),
      details: 'This circle appears to be impersonating another group.',
      reason: 'spam',
      reporterId: 'outsider-1',
      schemaVersion: 1,
      status: 'open',
      targetId: 'public-circle',
      targetLabel: 'Public Circle',
      targetPreview: '',
      targetType: 'circle',
    };

    await assertSucceeds(setDoc(report, payload));
    await assertFails(getDoc(report));
    await assertSucceeds(getDoc(doc(owner, 'circles', 'public-circle', 'reports', 'outsider-1_circle_public-circle')));
    await assertFails(setDoc(report, payload));
  });

  it('restricts report targets and prevents members from reporting themselves', async () => {
    const member = testEnv.authenticatedContext('member-1').firestore();
    const wrongCircle = doc(member, 'circles', 'public-circle', 'reports', 'member-1_circle_private-circle');
    await assertFails(setDoc(wrongCircle, {
      circleId: 'public-circle',
      createdAt: serverTimestamp(),
      details: '',
      reason: 'spam',
      reporterId: 'member-1',
      schemaVersion: 1,
      status: 'open',
      targetId: 'private-circle',
      targetLabel: 'Private Circle',
      targetPreview: '',
      targetType: 'circle',
    }));

    const selfReport = doc(member, 'circles', 'public-circle', 'reports', 'member-1_member_member-1');
    await assertFails(setDoc(selfReport, {
      circleId: 'public-circle',
      createdAt: serverTimestamp(),
      details: '',
      reason: 'harassment',
      reporterId: 'member-1',
      schemaVersion: 1,
      status: 'open',
      targetId: 'member-1',
      targetLabel: 'Member One',
      targetPreview: '',
      targetType: 'member',
    }));
  });

  it('accepts a message report only with the original author and message preview', async () => {
    const member = testEnv.authenticatedContext('member-1').firestore();
    const message = doc(member, 'circles', 'public-circle', 'messages', 'message-7');
    await assertSucceeds(setDoc(message, {
      authorAvatarSeed: 'member-1',
      authorAvatarStyle: 'sprouts',
      authorId: 'member-1',
      authorName: 'Member One',
      body: 'Meet at the park entrance.',
      circleId: 'public-circle',
      clientMessageId: 'message-7',
      createdAt: serverTimestamp(),
      schemaVersion: 1,
    }));

    const report = doc(member, 'circles', 'public-circle', 'reports', 'member-1_message_message-7');
    const payload = {
      circleId: 'public-circle',
      createdAt: serverTimestamp(),
      details: 'This includes a private address.',
      reason: 'privacy',
      reporterId: 'member-1',
      schemaVersion: 1,
      status: 'open',
      targetId: 'message-7',
      targetLabel: 'Member One',
      targetPreview: 'Meet at the park entrance.',
      targetType: 'message',
    };
    await assertSucceeds(setDoc(report, payload));

    const spoofedReport = doc(member, 'circles', 'public-circle', 'reports', 'member-1_message_message-7-spoof');
    await assertFails(setDoc(spoofedReport, { ...payload, targetId: 'message-7-spoof', targetPreview: 'Someone else’s message.' }));
  });

  it('allows only owners to assign a mirrored moderator role', async () => {
    const owner = testEnv.authenticatedContext('owner-1').firestore();
    const member = testEnv.authenticatedContext('member-1').firestore();
    const ownerBatch = writeBatch(owner);
    ownerBatch.update(doc(owner, 'circles', 'public-circle', 'members', 'member-1'), { role: 'moderator' });
    ownerBatch.update(doc(owner, 'users', 'member-1', 'circleMemberships', 'public-circle'), { role: 'moderator' });
    await assertSucceeds(ownerBatch.commit());

    const memberBatch = writeBatch(member);
    memberBatch.update(doc(member, 'circles', 'public-circle', 'members', 'member-1'), { role: 'owner' });
    memberBatch.update(doc(member, 'users', 'member-1', 'circleMemberships', 'public-circle'), { role: 'owner' });
    await assertFails(memberBatch.commit());
  });

  it('lets moderators review reports but prevents other members from changing them', async () => {
    const owner = testEnv.authenticatedContext('owner-1').firestore();
    const member = testEnv.authenticatedContext('member-1').firestore();
    const reportPath = ['circles', 'public-circle', 'reports', 'member-1_member_owner-1'] as const;
    await assertSucceeds(setDoc(doc(member, ...reportPath), {
      circleId: 'public-circle',
      createdAt: serverTimestamp(),
      details: '',
      reason: 'harassment',
      reporterId: 'member-1',
      schemaVersion: 1,
      status: 'open',
      targetId: 'owner-1',
      targetLabel: 'Circle Owner',
      targetPreview: '',
      targetType: 'member',
    }));
    await assertFails(getDoc(doc(member, ...reportPath)));

    const closedAt = serverTimestamp();
    const resolution = {
      resolvedAt: closedAt,
      resolvedBy: 'member-1',
      resolution: 'Reviewed and addressed by circle moderators.',
      status: 'resolved',
      updatedAt: closedAt,
    };
    await assertFails(setDoc(doc(member, ...reportPath), resolution, { merge: true }));
    await assertSucceeds(setDoc(doc(owner, ...reportPath), {
      resolvedAt: serverTimestamp(),
      resolvedBy: 'owner-1',
      resolution: 'Reviewed and addressed by circle moderators.',
      status: 'resolved',
      updatedAt: serverTimestamp(),
    }, { merge: true }));
  });

  it('allows a user to block another person only in their own block list', async () => {
    const member = testEnv.authenticatedContext('member-1').firestore();
    const owner = testEnv.authenticatedContext('owner-1').firestore();
    const ownBlock = doc(member, 'users', 'member-1', 'blocks', 'owner-1');
    await assertSucceeds(setDoc(ownBlock, {
      blockedUserId: 'owner-1',
      createdAt: serverTimestamp(),
      displayName: 'Circle Owner',
      schemaVersion: 1,
    }));
    await assertSucceeds(getDoc(ownBlock));
    await assertFails(setDoc(doc(member, 'users', 'member-1', 'blocks', 'member-1'), {
      blockedUserId: 'member-1',
      createdAt: serverTimestamp(),
      displayName: 'Me',
      schemaVersion: 1,
    }));
    await assertFails(getDoc(doc(owner, 'users', 'member-1', 'blocks', 'owner-1')));
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
