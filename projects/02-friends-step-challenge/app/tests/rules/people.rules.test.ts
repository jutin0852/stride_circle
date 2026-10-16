import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { request as httpRequest } from 'node:http';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';

const projectId = 'demo-stride-circle';
let testEnv: RulesTestEnvironment;

delete process.env.FIREBASE_EMULATOR_HUB;
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
jest.setTimeout(30000);

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8080 } });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

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


type Db = ReturnType<ReturnType<RulesTestEnvironment['authenticatedContext']>['firestore']>;

function profileData(uid: string, username: string, extra: Record<string, unknown> = {}) {
  return {
    avatarSeed: uid,
    avatarStyle: 'sprouts',
    discoverable: true,
    displayName: `Name ${uid}`,
    displayNameLower: `name ${uid}`,
    schemaVersion: 1,
    updatedAt: serverTimestamp(),
    userId: uid,
    username,
    ...extra,
  };
}

/** Claims a handle and writes the public profile in one batch, like the app does. */
function claim(db: Db, uid: string, username: string, extra: Record<string, unknown> = {}) {
  const batch = writeBatch(db);
  batch.set(doc(db, 'usernames', username), { createdAt: serverTimestamp(), uid });
  batch.set(doc(db, 'publicProfiles', uid), profileData(uid, username, extra));
  return batch.commit();
}

async function seedUser(uid: string, username: string, discoverable = true) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', uid), { displayName: `Name ${uid}` });
    await setDoc(doc(db, 'usernames', username), { createdAt: Timestamp.now(), uid });
    await setDoc(doc(db, 'publicProfiles', uid), {
      ...profileData(uid, username, { discoverable }),
      updatedAt: Timestamp.now(),
    });
  });
}

async function seedCircle(memberCount = 2) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'circles', 'CIRCLE01'), {
      inviteCode: 'CIRCLE01',
      joinPolicy: 'invite_only',
      memberCount,
      name: 'Morning Walkers',
      ownerId: 'owner',
      visibility: 'private',
    });
    await setDoc(doc(db, 'circles', 'CIRCLE01', 'members', 'owner'), { displayName: 'Name owner', role: 'owner', userId: 'owner' });
    await setDoc(doc(db, 'circles', 'CIRCLE01', 'members', 'mod'), { displayName: 'Name mod', role: 'moderator', userId: 'mod' });
    await setDoc(doc(db, 'circles', 'CIRCLE01', 'members', 'plain'), { displayName: 'Name plain', role: 'member', userId: 'plain' });
  });
}

function inviteData(inviterId: string, inviteeId: string, extra: Record<string, unknown> = {}) {
  return {
    circleId: 'CIRCLE01',
    circleName: 'Morning Walkers',
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + 14 * 24 * 60 * 60 * 1000),
    inviteeId,
    inviterDisplayName: `Name ${inviterId}`,
    inviterId,
    schemaVersion: 1,
    ...extra,
  };
}

beforeEach(async () => {
  await clearFirestoreData();
  for (const uid of ['owner', 'mod', 'plain', 'alice', 'bob']) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', uid), { displayName: `Name ${uid}` });
    });
  }
});

describe('usernames and public profiles', () => {
  it('lets a user claim a handle together with their public profile', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(claim(alice, 'alice', 'alice.walks'));
    await assertSucceeds(getDoc(doc(testEnv.authenticatedContext('bob').firestore(), 'usernames', 'alice.walks')));
  });

  it('refuses a handle someone else already holds', async () => {
    await seedUser('bob', 'taken');
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertFails(claim(alice, 'alice', 'taken'));
  });

  it('refuses invalid and reserved handles', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    for (const handle of ['ab', '1abc', 'has space', 'dots..here', 'ends.', 'Upper', 'admin', 'stridecircle']) {
      await assertFails(claim(alice, 'alice', handle));
    }
  });

  it('refuses claiming a handle for another uid or without a matching profile', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(alice, 'usernames', 'solo'), { createdAt: serverTimestamp(), uid: 'alice' }));
    const batch = writeBatch(alice);
    batch.set(doc(alice, 'usernames', 'spoof'), { createdAt: serverTimestamp(), uid: 'bob' });
    batch.set(doc(alice, 'publicProfiles', 'alice'), profileData('alice', 'spoof'));
    await assertFails(batch.commit());
  });

  it('requires the public name to match the private profile', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertFails(claim(alice, 'alice', 'alice.walks', { displayName: 'Someone Else' }));
  });

  it('lets nobody overwrite a claim and keeps the claim list private', async () => {
    await seedUser('bob', 'taken');
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(alice, 'usernames', 'taken'), { createdAt: serverTimestamp(), uid: 'alice' }));
    await assertFails(getDocs(collection(alice, 'usernames')));
    await assertFails(deleteDoc(doc(alice, 'usernames', 'taken')));
  });

  it('changes a handle by moving the claim, then enforces the cooldown', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(claim(alice, 'alice', 'alice.one'));

    const change = writeBatch(alice);
    change.delete(doc(alice, 'usernames', 'alice.one'));
    change.set(doc(alice, 'usernames', 'alice.two'), { createdAt: serverTimestamp(), uid: 'alice' });
    change.set(doc(alice, 'publicProfiles', 'alice'), profileData('alice', 'alice.two', { usernameChangedAt: serverTimestamp() }));
    await assertSucceeds(change.commit());

    const again = writeBatch(alice);
    again.delete(doc(alice, 'usernames', 'alice.two'));
    again.set(doc(alice, 'usernames', 'alice.three'), { createdAt: serverTimestamp(), uid: 'alice' });
    again.set(doc(alice, 'publicProfiles', 'alice'), profileData('alice', 'alice.three', { usernameChangedAt: serverTimestamp() }));
    await assertFails(again.commit());
  });

  it('does not let a change leave the old handle claimed', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(claim(alice, 'alice', 'alice.one'));
    const change = writeBatch(alice);
    change.set(doc(alice, 'usernames', 'alice.two'), { createdAt: serverTimestamp(), uid: 'alice' });
    change.set(doc(alice, 'publicProfiles', 'alice'), profileData('alice', 'alice.two', { usernameChangedAt: serverTimestamp() }));
    await assertFails(change.commit());
  });

  it('only searches discoverable people, in bounded pages', async () => {
    await seedUser('alice', 'ann.a');
    await seedUser('bob', 'ann.b', false);
    const reader = testEnv.authenticatedContext('plain').firestore();
    const profiles = collection(reader, 'publicProfiles');

    const results = await assertSucceeds(getDocs(query(profiles, where('discoverable', '==', true), orderBy('username'), limit(20))));
    expect(results.docs.map((entry) => entry.id)).toEqual(['alice']);
    await assertFails(getDocs(query(profiles, where('discoverable', '==', true), limit(21))));
    await assertFails(getDocs(query(profiles, orderBy('username'), limit(20))));
    await assertFails(getDocs(profiles));
    // An exact lookup works for people who hid from search.
    await assertSucceeds(getDoc(doc(reader, 'publicProfiles', 'bob')));
  });

  it('rejects unauthenticated profile reads and writes to other profiles', async () => {
    await seedUser('bob', 'bobby');
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'publicProfiles', 'bob')));
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(alice, 'publicProfiles', 'bob'), profileData('bob', 'bobby', { discoverable: false })));
  });

  it('lets a user toggle discoverability without touching the handle', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(claim(alice, 'alice', 'alice.walks'));
    await assertSucceeds(setDoc(doc(alice, 'publicProfiles', 'alice'), profileData('alice', 'alice.walks', { discoverable: false })));
  });
});

describe('circle invites', () => {
  beforeEach(async () => {
    await seedCircle();
    await seedUser('alice', 'alice.walks');
    await seedUser('bob', 'bob.walks');
  });

  it('lets an owner or moderator invite someone, but not a plain member', async () => {
    await assertSucceeds(setDoc(doc(testEnv.authenticatedContext('owner').firestore(), 'circleInvites', 'CIRCLE01_alice'), inviteData('owner', 'alice')));
    await assertSucceeds(setDoc(doc(testEnv.authenticatedContext('mod').firestore(), 'circleInvites', 'CIRCLE01_bob'), inviteData('mod', 'bob')));
    await assertFails(setDoc(doc(testEnv.authenticatedContext('plain').firestore(), 'circleInvites', 'CIRCLE01_alice'), inviteData('plain', 'alice')));
    await assertFails(setDoc(doc(testEnv.authenticatedContext('alice').firestore(), 'circleInvites', 'CIRCLE01_bob'), inviteData('alice', 'bob')));
  });

  it('rejects malformed invites', async () => {
    const owner = testEnv.authenticatedContext('owner').firestore();
    await assertFails(setDoc(doc(owner, 'circleInvites', 'wrong-id'), inviteData('owner', 'alice')));
    await assertFails(setDoc(doc(owner, 'circleInvites', 'CIRCLE01_alice'), inviteData('owner', 'alice', { circleName: 'Renamed' })));
    await assertFails(setDoc(doc(owner, 'circleInvites', 'CIRCLE01_alice'), inviteData('owner', 'alice', { expiresAt: Timestamp.fromMillis(Date.now() + 400 * 24 * 60 * 60 * 1000) })));
    await assertFails(setDoc(doc(owner, 'circleInvites', 'CIRCLE01_alice'), inviteData('owner', 'alice', { inviterId: 'mod' })));
    await assertFails(setDoc(doc(owner, 'circleInvites', 'CIRCLE01_owner'), inviteData('owner', 'owner')));
  });

  it('refuses invites to existing members, removed members and unknown users', async () => {
    const owner = testEnv.authenticatedContext('owner').firestore();
    await assertFails(setDoc(doc(owner, 'circleInvites', 'CIRCLE01_plain'), inviteData('owner', 'plain')));
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'circles', 'CIRCLE01', 'removedMembers', 'alice'), { removedBy: 'owner', userId: 'alice' });
    });
    await assertFails(setDoc(doc(owner, 'circleInvites', 'CIRCLE01_alice'), inviteData('owner', 'alice')));
    await assertFails(setDoc(doc(owner, 'circleInvites', 'CIRCLE01_ghost'), inviteData('owner', 'ghost')));
  });

  it('refuses invites in either block direction', async () => {
    const owner = testEnv.authenticatedContext('owner').firestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'users', 'alice', 'blocks', 'owner'), { blockedUserId: 'owner' });
      await setDoc(doc(db, 'users', 'owner', 'blocks', 'bob'), { blockedUserId: 'bob' });
    });
    await assertFails(setDoc(doc(owner, 'circleInvites', 'CIRCLE01_alice'), inviteData('owner', 'alice')));
    await assertFails(setDoc(doc(owner, 'circleInvites', 'CIRCLE01_bob'), inviteData('owner', 'bob')));
  });

  it('refuses invites to a full circle', async () => {
    await seedCircle(20);
    await assertFails(setDoc(doc(testEnv.authenticatedContext('owner').firestore(), 'circleInvites', 'CIRCLE01_alice'), inviteData('owner', 'alice')));
  });

  it('shows an invite only to the invitee, inviter and circle moderators', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'circleInvites', 'CIRCLE01_alice'), { ...inviteData('owner', 'alice'), createdAt: Timestamp.now() });
    });
    const ref = (uid: string) => doc(testEnv.authenticatedContext(uid).firestore(), 'circleInvites', 'CIRCLE01_alice');
    await assertSucceeds(getDoc(ref('alice')));
    await assertSucceeds(getDoc(ref('owner')));
    await assertSucceeds(getDoc(ref('mod')));
    await assertFails(getDoc(ref('plain')));
    await assertFails(getDoc(ref('bob')));
    const inbox = (uid: string) => getDocs(query(collection(testEnv.authenticatedContext(uid).firestore(), 'circleInvites'), where('inviteeId', '==', uid)));
    expect((await assertSucceeds(inbox('alice'))).size).toBe(1);
    expect((await assertSucceeds(inbox('bob'))).size).toBe(0);
    await assertFails(getDocs(collection(testEnv.authenticatedContext('bob').firestore(), 'circleInvites')));
  });

  it('cannot be accepted by writing membership directly, and can be declined or cancelled', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'circleInvites', 'CIRCLE01_alice'), { ...inviteData('owner', 'alice'), createdAt: Timestamp.now() });
    });
    const alice = testEnv.authenticatedContext('alice').firestore();
    // Joining a private circle still needs its invite code; an invite alone gives no client write path.
    await assertFails(setDoc(doc(alice, 'circleInvites', 'CIRCLE01_alice'), inviteData('owner', 'alice')));
    await assertSucceeds(deleteDoc(doc(alice, 'circleInvites', 'CIRCLE01_alice')));

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'circleInvites', 'CIRCLE01_bob'), { ...inviteData('owner', 'bob'), createdAt: Timestamp.now() });
    });
    await assertFails(deleteDoc(doc(testEnv.authenticatedContext('plain').firestore(), 'circleInvites', 'CIRCLE01_bob')));
    await assertSucceeds(deleteDoc(doc(testEnv.authenticatedContext('owner').firestore(), 'circleInvites', 'CIRCLE01_bob')));
  });
});

describe('friend requests and friends', () => {
  beforeEach(async () => {
    await seedUser('alice', 'alice.walks');
    await seedUser('bob', 'bob.walks');
  });

  const requestData = (fromId: string, toId: string, extra: Record<string, unknown> = {}) => ({
    createdAt: serverTimestamp(),
    fromDisplayName: `Name ${fromId}`,
    fromId,
    schemaVersion: 1,
    toId,
    ...extra,
  });

  it('lets a user send a request as themself only', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(alice, 'friendRequests', 'alice_bob'), requestData('alice', 'bob')));
    await assertFails(setDoc(doc(alice, 'friendRequests', 'bob_alice'), requestData('bob', 'alice')));
    await assertFails(setDoc(doc(alice, 'friendRequests', 'alice_alice'), requestData('alice', 'alice')));
    await assertFails(setDoc(doc(alice, 'friendRequests', 'alice_ghost'), requestData('alice', 'ghost')));
    await assertFails(setDoc(doc(alice, 'friendRequests', 'mismatch'), requestData('alice', 'bob')));
  });

  it('refuses requests in either block direction and between friends', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', 'bob', 'blocks', 'alice'), { blockedUserId: 'alice' });
    });
    await assertFails(setDoc(doc(testEnv.authenticatedContext('alice').firestore(), 'friendRequests', 'alice_bob'), requestData('alice', 'bob')));
    await assertFails(setDoc(doc(testEnv.authenticatedContext('bob').firestore(), 'friendRequests', 'bob_alice'), requestData('bob', 'alice')));

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await deleteDoc(doc(db, 'users', 'bob', 'blocks', 'alice'));
      await setDoc(doc(db, 'users', 'alice', 'friends', 'bob'), { friendId: 'bob' });
    });
    await assertFails(setDoc(doc(testEnv.authenticatedContext('alice').firestore(), 'friendRequests', 'alice_bob'), requestData('alice', 'bob')));
  });

  it('shows a request only to its two people and lets either withdraw it', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'friendRequests', 'alice_bob'), { ...requestData('alice', 'bob'), createdAt: Timestamp.now() });
    });
    await assertSucceeds(getDoc(doc(testEnv.authenticatedContext('bob').firestore(), 'friendRequests', 'alice_bob')));
    await assertFails(getDoc(doc(testEnv.authenticatedContext('owner').firestore(), 'friendRequests', 'alice_bob')));
    const inbox = await assertSucceeds(getDocs(query(collection(testEnv.authenticatedContext('bob').firestore(), 'friendRequests'), where('toId', '==', 'bob'))));
    expect(inbox.size).toBe(1);
    await assertFails(getDocs(query(collection(testEnv.authenticatedContext('owner').firestore(), 'friendRequests'), where('toId', '==', 'bob'))));
    await assertFails(deleteDoc(doc(testEnv.authenticatedContext('owner').firestore(), 'friendRequests', 'alice_bob')));
    await assertSucceeds(deleteDoc(doc(testEnv.authenticatedContext('bob').firestore(), 'friendRequests', 'alice_bob')));
  });

  async function seedRequest() {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'friendRequests', 'alice_bob'), { ...requestData('alice', 'bob'), createdAt: Timestamp.now() });
    });
  }

  function acceptBatch(db: Db, userId: string, fromId: string, options: { deleteRequest?: boolean } = {}) {
    const batch = writeBatch(db);
    const fields = { createdAt: serverTimestamp(), schemaVersion: 1 };
    batch.set(doc(db, 'users', userId, 'friends', fromId), { ...fields, friendId: fromId });
    batch.set(doc(db, 'users', fromId, 'friends', userId), { ...fields, friendId: userId });
    if (options.deleteRequest !== false) batch.delete(doc(db, 'friendRequests', `${fromId}_${userId}`));
    return batch;
  }

  it('lets the recipient accept a request by creating both sides and deleting the request', async () => {
    await seedRequest();
    const bob = testEnv.authenticatedContext('bob').firestore();
    await assertSucceeds(acceptBatch(bob, 'bob', 'alice').commit());
    await assertSucceeds(getDoc(doc(bob, 'users', 'bob', 'friends', 'alice')));
    await assertFails(getDoc(doc(bob, 'users', 'alice', 'friends', 'bob')));
    await assertSucceeds(getDoc(doc(testEnv.authenticatedContext('alice').firestore(), 'users', 'alice', 'friends', 'bob')));
  });

  it('refuses friendships without a request to the signed-in user', async () => {
    const bob = testEnv.authenticatedContext('bob').firestore();
    await assertFails(acceptBatch(bob, 'bob', 'alice').commit());

    // The sender cannot accept their own request.
    await seedRequest();
    await assertFails(acceptBatch(testEnv.authenticatedContext('alice').firestore(), 'alice', 'bob').commit());
    // A third person cannot befriend two others with someone else's request.
    await assertFails(acceptBatch(testEnv.authenticatedContext('owner').firestore(), 'owner', 'alice').commit());
  });

  it('requires the request to be deleted in the same batch and refuses blocked pairs', async () => {
    await seedRequest();
    const bob = testEnv.authenticatedContext('bob').firestore();
    await assertFails(acceptBatch(bob, 'bob', 'alice', { deleteRequest: false }).commit());

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', 'alice', 'blocks', 'bob'), { blockedUserId: 'bob' });
    });
    await assertFails(acceptBatch(bob, 'bob', 'alice').commit());
  });

  it('refuses a friend document with extra fields or a mismatched friend id', async () => {
    await seedRequest();
    const bob = testEnv.authenticatedContext('bob').firestore();
    const extra = writeBatch(bob);
    extra.set(doc(bob, 'users', 'bob', 'friends', 'alice'), { createdAt: serverTimestamp(), friendId: 'alice', note: 'x', schemaVersion: 1 });
    extra.delete(doc(bob, 'friendRequests', 'alice_bob'));
    await assertFails(extra.commit());
    const wrong = writeBatch(bob);
    wrong.set(doc(bob, 'users', 'bob', 'friends', 'alice'), { createdAt: serverTimestamp(), friendId: 'owner', schemaVersion: 1 });
    wrong.delete(doc(bob, 'friendRequests', 'alice_bob'));
    await assertFails(wrong.commit());
  });

  it('keeps friends read-only for their owner and lets either side end a friendship', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'users', 'alice', 'friends', 'bob'), { friendId: 'bob' });
      await setDoc(doc(db, 'users', 'bob', 'friends', 'alice'), { friendId: 'alice' });
    });
    const alice = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(alice, 'users', 'alice', 'friends', 'bob')));
    await assertFails(getDoc(doc(alice, 'users', 'bob', 'friends', 'alice')));
    await assertFails(setDoc(doc(alice, 'users', 'alice', 'friends', 'owner'), { friendId: 'owner' }));
    await assertFails(setDoc(doc(alice, 'users', 'bob', 'friends', 'alice'), { friendId: 'alice', extra: 1 }));
    await assertFails(deleteDoc(doc(testEnv.authenticatedContext('owner').firestore(), 'users', 'alice', 'friends', 'bob')));
    const unfriend = writeBatch(alice);
    unfriend.delete(doc(alice, 'users', 'alice', 'friends', 'bob'));
    unfriend.delete(doc(alice, 'users', 'bob', 'friends', 'alice'));
    await assertSucceeds(unfriend.commit());
  });
});
