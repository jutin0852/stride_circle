import { createMediaGateway } from './gateway.mjs';
import { createImageKitStorage } from './imagekit.mjs';
import { createFirebaseVerifier } from './firebase-identity.mjs';

/** Fetch-compatible entry point; deploy on a chosen host, not Firebase Functions. */
export function createMediaServer(environment) {
  return createMediaGateway({
    storage: createImageKitStorage({ privateKey: environment.IMAGEKIT_PRIVATE_KEY, urlEndpoint: environment.IMAGEKIT_URL_ENDPOINT }),
    verifyUser: createFirebaseVerifier({ projectId: environment.FIREBASE_PROJECT_ID, webApiKey: environment.FIREBASE_WEB_API_KEY }),
    allowedOrigins: (environment.MEDIA_ALLOWED_ORIGINS ?? '').split(',').map(origin => origin.trim()).filter(Boolean),
  });
}

export default {
  async fetch(request, environment) {
    try { return await createMediaServer(environment)(request); }
    catch { return Response.json({ error: 'Photos are temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
  },
};
