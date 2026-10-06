# Cloud development / local testing mirror

From `app/`, start `npm run cloud:sync` in its own terminal. Keep Expo separate. The watcher checks every 10 seconds while running; it is not a machine startup service. Stop with Ctrl+C. `ExecutionPolicy Bypass` applies only to this process, not machine policy.

It discovers the Git root, current branch, and configured upstream each cycle. Cloud must push to that upstream branch. It fetches origin (and the tracking remote if different), then fast-forwards only when the entire repository is clean. Detached HEAD, missing upstream, in-progress Git operations, authentication/network failures, and local edits pause updates. Local commits ahead of upstream also pause. Divergence or failed fast-forward stops the watcher: resolve manually and restart. It never commits, pushes, stashes, resets, or creates merge commits.

Commit these setup files before using auto-sync: `scripts/cloud-sync.ps1`, `scripts/cloud-sync.test.ps1`, `package.json`, and this document. Until committed, they intentionally cause dirty-tree protection. Commit/push requires separate approval. Do not ignore real source edits to make synchronization work.

Changed app source is visible to an already running Metro. Dependency/config/native changes may require manual `npm ci`, restarting Expo, or a new development build; auto-sync does not perform these operations. Keep local secrets and generated artifacts ignored using existing rules. Tracked files anywhere in the parent repository can block synchronization.

Safety tests: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/cloud-sync.test.ps1`. Tests use disposable local Git repositories, never GitHub or the application working tree. `npm run cloud:sync -- -Once` performs one real cycle (including fetch and a safe fast-forward if eligible).
