const { test } = require('node:test');
const assert = require('node:assert/strict');
const modules = Promise.all([
  import('../server/media/gateway.mjs'), import('../server/media/imagekit.mjs'), import('../server/media/firebase-identity.mjs'),
]);
const jpeg = { mimeType: 'image/jpeg', base64: Buffer.from([255, 216, 255, 0]).toString('base64') };
const asset = { schemaVersion: 1, id: 'asset-0001', ownerId: 'walker', purpose: 'profile-photo', provider: 'imagekit', providerFileId: 'file1', url: 'https://ik.imagekit.io/wakawalks/photo.jpg' };
const request = (path, body, headers = {}) => new Request(`https://media.example.com${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('media gateway verifies authentication before touching storage', async () => {
  const [{ createMediaGateway, MediaError }] = await modules;
  let uploads = 0;
  const handler = createMediaGateway({ storage: { uploadProfilePhoto() { uploads++; } }, verifyUser: async () => { throw new MediaError(401, 'Sign in.'); } });
  assert.equal((await handler(request('/v1/profile-photos', jpeg))).status, 401);
  assert.equal(uploads, 0);
});
test('media gateway derives ownership from verified identity, not request data', async () => {
  const [{ createMediaGateway }] = await modules;
  const handler = createMediaGateway({ verifyUser: async () => 'walker', storage: {
    async uploadProfilePhoto(photo, owner) { assert.equal(owner, 'walker'); assert.deepEqual(photo, jpeg); return asset; },
  } });
  const result = await handler(request('/v1/profile-photos', { ...jpeg, ownerId: 'other' }));
  assert.equal(result.status, 201); assert.deepEqual(await result.json(), asset);
});
test('media gateway rejects invalid formats, mismatched bytes, large images and other-owner deletion', async () => {
  const [{ createMediaGateway }] = await modules;
  const handler = createMediaGateway({ verifyUser: async () => 'walker', storage: {} });
  assert.equal((await handler(request('/v1/profile-photos', { ...jpeg, mimeType: 'image/svg+xml' }))).status, 400);
  assert.equal((await handler(request('/v1/profile-photos', { ...jpeg, mimeType: 'image/png' }))).status, 400);
  assert.equal((await handler(request('/v1/profile-photos', { ...jpeg, base64: 'A'.repeat(7 * 1024 * 1024) }))).status, 413);
  assert.equal((await handler(request('/v1/profile-photos/delete', { asset: { ...asset, ownerId: 'other' } }))).status, 403);
});
test('media gateway restricts browser origins and does not leak provider secrets', async () => {
  const [{ createMediaGateway }] = await modules;
  const handler = createMediaGateway({ verifyUser: async () => 'walker', allowedOrigins: ['https://app.example.com'], storage: { async uploadProfilePhoto() { throw new Error('PRIVATE_KEY=never-leak'); } } });
  assert.equal((await handler(request('/v1/profile-photos', jpeg, { Origin: 'https://evil.example' }))).status, 403);
  const response = await handler(request('/v1/profile-photos', jpeg, { Origin: 'https://app.example.com' }));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://app.example.com');
  assert.doesNotMatch(await response.text(), /PRIVATE_KEY/);
});
test('ImageKit adapter keeps app IDs separate from provider file IDs', async () => {
  const [, { createImageKitStorage }] = await modules;
  let storedPath;
  const storage = createImageKitStorage({ privateKey: 'test-private-key', urlEndpoint: 'https://ik.imagekit.io/wakawalks', fetcher: async (url, options) => {
    assert.equal(url, 'https://upload.imagekit.io/api/v1/files/upload');
    assert.equal(options.headers.Authorization, `Basic ${btoa('test-private-key:')}`);
    storedPath = `${options.body.get('folder')}/${options.body.get('fileName')}`;
    return Response.json({ fileId: 'provider-file-123', filePath: storedPath, url: `https://ik.imagekit.io/wakawalks${storedPath}` });
  } });
  const result = await storage.uploadProfilePhoto(jpeg, 'walker');
  assert.notEqual(result.id, result.providerFileId);
  assert.equal(result.ownerId, 'walker'); assert.equal(result.providerFileId, 'provider-file-123');
  assert.match(storedPath, /^\/profile-photos\/[a-f0-9]{64}\//);
});
test('ImageKit adapter refuses a forged ownership claim even with a valid provider file ID', async () => {
  const [, { createImageKitStorage }] = await modules;
  let deletions = 0;
  const storage = createImageKitStorage({ privateKey: 'key', urlEndpoint: 'https://ik.imagekit.io/wakawalks', fetcher: async (_url, options) => {
    if (options.method === 'DELETE') deletions++;
    return Response.json({ filePath: '/profile-photos/somebody-else/asset-0001.jpg' });
  } });
  await assert.rejects(storage.deleteAsset(asset, 'walker'), error => error.status === 403);
  assert.equal(deletions, 0);
});
test('Firebase identity adapter never accepts decoded JWT claims without server verification', async () => {
  const [, , { createFirebaseVerifier }] = await modules;
  const payload = Buffer.from(JSON.stringify({ aud: 'demo-app', iss: 'https://securetoken.google.com/demo-app', sub: 'walker' })).toString('base64url');
  const verify = createFirebaseVerifier({ projectId: 'demo-app', webApiKey: 'public-key', fetcher: async () => new Response(null, { status: 400 }) });
  await assert.rejects(verify(`Bearer header.${payload}.forged`), error => error.status === 401);
});
test('Firebase identity adapter accepts only Firebase-verified same-project users', async () => {
  const [, , { createFirebaseVerifier }] = await modules;
  const token = `header.${Buffer.from(JSON.stringify({ aud: 'demo-app', iss: 'https://securetoken.google.com/demo-app', sub: 'walker' })).toString('base64url')}.signature`;
  const verify = createFirebaseVerifier({ projectId: 'demo-app', webApiKey: 'public-key', fetcher: async (_url, options) => {
    assert.deepEqual(JSON.parse(options.body), { idToken: token });
    return Response.json({ users: [{ localId: 'walker' }] });
  } });
  assert.equal(await verify(`Bearer ${token}`), 'walker');
  await assert.rejects(verify('Bearer invalid'), error => error.status === 401);
});
