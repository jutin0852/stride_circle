# Portable profile-photo storage

Status (2026-10-16): implemented and deployed to `https://waka-media.jutindikonu8.workers.dev`. Both `FIREBASE_WEB_API_KEY` and `IMAGEKIT_PRIVATE_KEY` are installed as encrypted production secrets, verified in Cloudflare. Live gateway checks return 401 for anonymous/forged-token requests and 403 for an untrusted browser origin. Live authenticated upload and physical-device acceptance remain unverified. Local Metro is configured with the public gateway URL; remote build environments must be configured separately. Quick verification (TypeScript, lint, Vitest), eight server-boundary tests, and seven targeted profile component tests passed during this implementation.

## Boundaries

```text
Edit Profile → profile-photo service → MediaStorage interface → authenticated HTTP API
                                                               ↓
                                               Firebase identity verification
                                                               ↓
                                               storage adapter → ImageKit
```

The app uses `src/domain/media-storage.ts`; neither screens nor the photo-saving workflow import an ImageKit SDK or understand ImageKit paths. `src/services/media/http-media-storage.ts` is the HTTP adapter. `server/media/gateway.mjs` is hosting-independent (Request/Response/Fetch/Web Crypto), with a separate Firebase identity adapter and an ImageKit storage adapter. `entry.mjs` is the composition root; `wrangler.jsonc` only configures the approved Cloudflare host. The server has no added runtime dependencies; the app uses the approved Expo ImageManipulator module for local photo preparation.

## Selection and image size

Edit Profile warms the picker JS module when opened, then invokes the modern system picker directly on tap without a network request or broad library-permission preflight (`allowsEditing: false`, current asset representation, quality 1, no base64). On iOS this selects PHPicker rather than the legacy editing controller. After selection, a themed crop screen lets the user drag to position, zoom, reset, cancel, or Use photo. Accessible zoom and position actions are provided. Cancelling either gallery selection or crop retains any previous photo/name draft. Use photo stores only local URI and crop coordinates; preview and final processing use the same coordinates. Browsing characters does not clear the pending photo or name; selecting a character from Edit Profile returns a draft, and only Save persists it. The standalone character picker keeps its existing immediate-save behavior.

On Save, `src/services/profile-photo-preparation.ts` applies the confirmed square crop, then resizes to at most 1024px without enlarging smaller crops. PNG stays PNG to retain transparency; other device-decodable images are encoded as JPEG at 0.9 quality. Base64 is generated only for the resized image, and native image references are released afterward. The original library photo is untouched. There is no original-file MB rejection; the existing 5MB limit applies to the prepared upload, not the selected original. Phone memory, supported formats, OS picker startup and iCloud downloads still impose practical limits; arbitrary-size decoding and instant system UI cannot be guaranteed. This preserves sharpness at avatar sizes, not identical original pixels or lossless JPEG compression. Actual byte reduction depends on the input.

The updated native client must contain `expo-image-manipulator`. A non-throwing optional-module check now precedes importing its JS wrapper, avoiding the missing-native-module import seen on older clients. Those clients can still edit names/characters and preview/crop photos, but receive an update message on Save. Device acceptance should check cold/warm modern picker opening, gallery-to-crop presentation, drag/zoom and screen-reader actions, crop cancellation after a photo draft, character selection without premature persistence, large HEIC/JPEG and transparent PNG, and reopening the saved profile. Unit/component tests do not measure native gallery startup latency.

ImageKit account: `wakawalks`, Frankfurt region; delivery endpoint `https://ik.imagekit.io/wakawalks`. Images used as social avatars are publicly deliverable; upload and deletion require authenticated ownership. This service must not be reused for private walking routes or other private media without a separate access policy.

## Stored references

The owner's Firestore profile stores `photoAsset` with `schemaVersion`, app-generated `id`, `ownerId`, `purpose`, `provider`, `providerFileId`, and `url`. ImageKit file IDs are not the app's asset IDs. Existing `photoURL` remains the compatibility/display field copied into circle membership and leaderboard projections; character and Google URLs still work without managed-asset metadata. Returning to a character clears the active `photoAsset`; old blobs may require later reconciliation.

Uploads never overwrite the previous object. After profile persistence succeeds, best-effort cleanup removes the previous managed asset. Persistence failure triggers best-effort deletion of the new object. Cleanup failure must not report a successful save as failed. Responses lost after an upload, deletion outages, or interrupted clients can leave unreferenced files; a bounded reconciliation job is a future operational improvement, not a false promise of exactly-once delivery. There is no automatic background retry of ambiguous writes.

## Security and operation

- The gateway derives ownership from a Firebase-verified ID token, not request-body claims. Decoding claims is not verification: Firebase's `accounts:lookup` validates the token, then project/audience and user identity must agree.
- Authentication precedes upload-body reading; streamed request bodies and decoded images are capped. Only JPEG/PNG/WebP are accepted, with content signatures checked before upload. ImageKit still validates the actual image.
- Deletes verify the provider's actual file path belongs to the authenticated owner and app asset ID. A supplied URL, owner ID, or provider file ID alone is insufficient.
- The ImageKit private key belongs only in encrypted server secrets. The mobile `.env` gets `EXPO_PUBLIC_MEDIA_API_URL`, never a vendor private key. No image bytes are stored in Firestore. No production Firebase billing upgrade is needed for this service.
- Browser origins are explicitly allowed; native clients omit Origin. CORS is not authentication. Tokens, provider error bodies, and private keys must not be logged. Request timeouts bound waiting; offline failures retain the local picker selection for user retry.
- Current cost: one identity lookup and one ImageKit upload per photo change, plus bounded membership updates already used by avatars. Replacing an old photo adds an ownership lookup and deletion. There is no per-step work, polling, per-user listener, Redis, queue, or database service added.
- At roughly 1,000 active users, monitor upload failures and storage/bandwidth usage. Before open signup or meaningful scale, add per-user upload quotas/rate limits at the authenticated gateway, server-side image-size enforcement beyond the byte limit (clients can bypass local resizing), account abuse controls, and orphan reconciliation. At 10,000–100,000 active users, review identity-lookup limits and cached certificate-based token verification if metrics justify it. One million registrations alone does not justify new infrastructure; active uploads and CDN traffic determine cost. Free-plan limits are not unlimited capacity; uploads/delivery can stop at provider limits. This code does not enable paid overages.

## Deployment

1. Sign into the approved Cloudflare account. Use the current npm Wrangler CLI without adding it to mobile dependencies.
2. Add `IMAGEKIT_PRIVATE_KEY` and `FIREBASE_WEB_API_KEY` as encrypted secrets for `waka-media`. The first comes from ImageKit; the second is the existing Firebase web configuration value. Never paste either into chat or checked-in config.
3. Deploy `server/media/entry.mjs` using `server/media/wrangler.jsonc`. Configure exact allowed web-preview origins if needed. An empty list deliberately allows native requests only.
4. Set `EXPO_PUBLIC_MEDIA_API_URL` to the deployed HTTPS root in local Metro and the build environment, then reload/restart Metro for the environment change. No new native library or rebuild is required if the existing client already contains image-picker.
5. Verify anonymous/foreign-project requests fail, then use an isolated test account to upload, save, replace, reopen, and switch back to a character. Native picker behavior and live authenticated uploads require device acceptance; mocked API tests do not prove deployment.

## Moving provider later

Implement the same server storage interface for the replacement provider and run the contract tests. Keep old and new adapters available during migration so old asset references can still be cleaned up. Export/copy originals using an operator-owned, resumable migration; preserve app asset IDs and record old/new provider locators. Verify hashes or image equivalence, delivery, ownership and rollback before switching reads. Update the owner's profile URL/metadata and existing denormalized member/leaderboard URL snapshots in bounded batches. Keep old delivery URLs working during the transition. Only remove old objects after a rollback window and explicit operator approval. A storage interface avoids code rewrites; it does not magically migrate bytes or existing URLs.

## Checks

`node --test tests/media-storage.test.cjs` exercises the server with isolated fakes, including forged authentication and cross-account deletion. `npm run verify` includes app-side orchestration and HTTP adapter tests; component tests cover picker preview, cancel, save and failure recovery. The profile-saving tests deliberately substitute a fake second provider without changing UI/service code.
