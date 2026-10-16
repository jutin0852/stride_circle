/** Portable Fetch API handler. Hosting and storage providers are injected. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_BODY_BYTES = Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 4096;

export class MediaError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function readBody(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new MediaError(415, 'JSON required.');
  const reader = request.body?.getReader();
  if (!reader) throw new MediaError(400, 'A request body is required.');
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new MediaError(413, 'Photo too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new MediaError(400, 'Invalid JSON.'); }
}

export function validatePhoto(photo) {
  if (!photo || typeof photo !== 'object' || typeof photo.base64 !== 'string'
    || !['image/jpeg', 'image/png', 'image/webp'].includes(photo.mimeType)
    || !photo.base64 || photo.base64.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(photo.base64)) {
    throw new MediaError(400, 'A JPG, PNG or WebP photo is required.');
  }
  const padding = photo.base64.endsWith('==') ? 2 : photo.base64.endsWith('=') ? 1 : 0;
  if (photo.base64.length * 3 / 4 - padding > MAX_PHOTO_BYTES) throw new MediaError(413, 'Photo too large.');
  const header = atob(photo.base64.slice(0, 24));
  const matches = photo.mimeType === 'image/jpeg' ? header.startsWith('\xff\xd8\xff')
    : photo.mimeType === 'image/png' ? header.startsWith('\x89PNG\r\n\x1a\n')
      : header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP';
  if (!matches) throw new MediaError(400, 'The photo format does not match its content.');
  return { base64: photo.base64, mimeType: photo.mimeType };
}

export function createMediaGateway({ storage, verifyUser, allowedOrigins = [] }) {
  return async request => {
    const origin = request.headers.get('origin');
    const headers = { 'Cache-Control': 'no-store', Vary: 'Origin', 'X-Content-Type-Options': 'nosniff' };
    if (origin && !allowedOrigins.includes(origin)) return Response.json({ error: 'Origin not allowed.' }, { status: 403, headers });
    if (origin) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const path = new URL(request.url).pathname;
    if (!['/v1/profile-photos', '/v1/profile-photos/delete'].includes(path)) return Response.json({ error: 'Not found.' }, { status: 404, headers });
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers });
    try {
      // Authentication happens before reading/uploading bytes. Never trust a body ownerId.
      const ownerId = await verifyUser(request.headers.get('authorization'));
      if (typeof ownerId !== 'string' || !ownerId) throw new MediaError(401, 'Sign in required.');
      const body = await readBody(request);
      if (path.endsWith('/delete')) {
        const asset = body?.asset;
        if (!asset || asset.ownerId !== ownerId || asset.purpose !== 'profile-photo'
          || typeof asset.id !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(asset.id)
          || typeof asset.providerFileId !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(asset.providerFileId)) {
          throw new MediaError(403, 'This photo cannot be removed by this account.');
        }
        await storage.deleteAsset(asset, ownerId);
        return new Response(null, { status: 204, headers });
      }
      const asset = await storage.uploadProfilePhoto(validatePhoto(body), ownerId);
      return Response.json(asset, { status: 201, headers });
    } catch (error) {
      // Do not reflect provider responses, tokens or private keys to clients/logs.
      const status = error instanceof MediaError ? error.status : 503;
      return Response.json({ error: status === 503 ? 'Photos are temporarily unavailable.' : error.message }, { status, headers });
    }
  };
}
