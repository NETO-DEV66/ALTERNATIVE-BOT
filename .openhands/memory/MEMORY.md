# Alternative Bot — project memory

Repo: `NETO-DEV66/ALTERNATIVE-BOT` (branch `main`). A self-hosted AI-agent
monorepo (pnpm + turbo), originally the open-source "Rakazo" project. Now
rebranded to **Alternative Bot**, mobile-only, Android package
`com.alternativebot.app`. Local clone: `/workspace/ALTERNATIVE-BOT`.

## Credentials / auth (learned the hard way)

- The managed **`GITHUB_TOKEN`** (`ghu_…`, GitHub App installation token) is
  **read-only for this repo**. The REST API even reports `permissions.push=true`,
  but any `git push` returns **403 "Permission to … denied"** and write API calls
  (issue/contents/ref) return 403 "Resource not accessible by integration".
  `gh auth setup-git` does not change this.
- **`Token01`** (a `ghp_…` classic PAT) returns **401 Bad credentials** everywhere.
- **`OPENHANDS_API_KEY`** is for the OpenHands Cloud API, not GitHub.
- To push, use the **user's own PAT** (he pastes a `ghp_…` token in chat for this
  purpose; the classic PAT has full `repo` scope + admin on this repo).
  **Gotcha:** `~/.gitconfig` installs `gh` as the credential helper
  (`credential.https://github.com.helper = !/usr/bin/gh auth git-credential`), so a
  plain `git push` reuses the read-only `GITHUB_TOKEN` and still 403s even with a good
  PAT. You must **disable the helper** for the push:
  `git -c credential.helper= -c 'credential.https://github.com.helper=' push "https://NETO-DEV66:<pat>@github.com/NETO-DEV66/ALTERNATIVE-BOT.git" main`.
  Never persist the value; treat it as a transient secret.

## Archiving an OpenHands Cloud conversation

- `GET /api/v1/app-conversations?ids=<id>` — conversation record.
- `GET /api/v1/app-conversations/<id>/download` — **best**: one request, a zip with
  `meta.json` + `event_*.json` per event.
- `GET /api/v1/conversation/<id>/events/search?limit=100&page=N` — works but
  **429s around page 129** (~12,900 events). Prefer the download zip.
- The `/canvas/shared/...` web page requires login; the API does not.

## Current state (2026-11-03)

- `origin/main` = **`4c83a6d`** "build(mobile): release the Android APK with Gradle
  instead of EAS" — pushed. It replaced the EAS workflow with a local Gradle build,
  added `apps/mobile/plugins/with-release-signing.js`, bumped to **1.0.13 (versionCode
  12)**, removed `release-mobile.yml` + the EAS publish job + every `EXPO_TOKEN`
  reference, and updated docs/tests. **But its first CI run failed.**
- **APK released.** Release `android` (id 430456219) serves `alternativebot.apk`
  **1.0.13 (versionCode 12)**, 128,222,826 bytes, sha256 `a50513e3…e3ac399`,
  published 2026-11-03. `--latest=false`, so the desktop updater's "latest" is
  untouched. (1.0.12/vc11 was 128,222,814 bytes, sha256 `b3cdbece…b5e79ff`.)

### Release signing: phones are debug-signed (critical)
- The published APK's signing certificate is the **checked-in
  `apps/mobile/android/app/debug.keystore`** (`fac61745dc09…`), *not* a private
  release key. Phones reject an update signed by any other key ("App not
  installed"), so **the four `ANDROID_*` repo secrets were set to that debug
  keystore** (alias `androiddebugkey`, store+key pass `android`). Changing the
  signing key would strand every installed app; to move to a real upload key you
  must ship a fresh package/identity.
- The `release-android-apk` workflow builds with the secret keystore, verifies the
  APK against it, and *also* verifies it against the currently published APK
  before uploading — so a mismatch fails the run instead of shipping a broken
  update. The first CI run failed exactly there because the secret keystore did
  not match the published (debug-signed) APK.
- Secrets are writable with the user's PAT via
  `PUT /repos/{repo}/actions/secrets/{name}` after sealing the value with the
  repo public key (PyNaCl `SealedBox`).
- Rebrand + billing removal are **verified complete** (no `rakazo`/`elie222` outside
  `.git`; Stripe/billing gone).
- 4 test files fail on clean `HEAD` for environmental reasons (no `::1` loopback,
  npm-in-pnpm, process-reaping timing, real model HTTP) — not regressions.

### CI failure that blocked the 1.0.13 release (root cause)
- `./gradlew app:assembleRelease` died with `OutOfMemoryError: Metaspace` in
  `lintVitalAnalyzeRelease`. Cause: **Expo's template `gradle.properties` sets
  `org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m`**; 512 MB metaspace is not
  enough for the release lint over the whole RN/Expo graph. Fix: `with-release-signing`
  now also runs `withGradleProperties` and raises it to
  `-Xmx4096m -XX:MaxMetaspaceSize=2048m`.

### Local Android build recipe (verified)
- `sudo apt-get install openjdk-21-jdk-headless`; Android SDK at
  `/home/openhands/android-sdk` (cmdline-tools `13114758`), packages
  `platform-tools platforms;android-36 build-tools;36.0.0 build-tools;35.0.0
  ndk;27.1.12297006 cmake;3.22.1`.
- `corepack enable` fails (EACCES on `/usr/local/bin`); make a shim instead:
  `printf '#!/bin/sh\nexec corepack pnpm "$@"\n' | sudo tee /usr/local/bin/pnpm`.
- `pnpm install --frozen-lockfile`, then from `apps/mobile`:
  `pnpm exec expo prebuild --platform android --no-install`, then
  `cd android && ./gradlew app:assembleRelease --no-daemon`. Output
  `app/build/outputs/apk/release/app-release.apk`.
- **`EAS_BUILD_PROFILE` unset → `app.config.ts` skips the `EXPO_PUBLIC_API_URL`
  HTTPS check**, so a local build needs no API URL.
- Without the four `ALTERNATIVEBOT_*` env vars the release is signed with the
  checked-in `android/app/debug.keystore` (that is what 1.0.11/1.0.12 shipped).
  The repo's release keystore is the `ANDROID_KEYSTORE_BASE64` secret; CI decodes it
  to `$RUNNER_TEMP/alternativebot-release.keystore`.

  ### CI was red on main (2026-11-03, fixed)
  - The last `ci` run on `main` failed at `Checks → Typecheck`:
    `apps/api/src/local-session.postgres.test.ts(31,7): TS2353 'localSession' does not
    exist in type 'CreateAppOverrides'`. Pre-existing (from sign-in-era `30e8fe1`), not
    from the mobile work. Fix: drop the redundant `localSession: true` override —
    `localAccountEmail` alone enables single-user mode. `@alternativebot/api` `tsc` is
    clean again.
  - Then `Checks → Unit tests` failed too, on a **real compose regression**: the sign-in
    removal made `env.ts` read `ALTERNATIVEBOT_LOCAL_SESSION` + `ALTERNATIVEBOT_LOCAL_ACCOUNT_EMAIL`,
    but the api allowlist in `docker-compose{,.prod,.images}.yml` never passed them
    (`compose-env.test.ts`, 4 cases). Fix: add both keys to the api block of each file.
  - After both fixes the only CI red left is `packages/testkit/src/parallel-web.test.ts`
    (2 cases), the environmental "real model HTTP" failure — it hits
    `https://search.parallel.ai/mcp` and the sandbox adds an `authorization` header the
    test asserts is absent. Not a regression.
  - `main` went `801d9d0` → `62fa9a0` (typecheck) → `17d839b` (compose). The Gradle APK
    work (`4c83a6d`, `e6d8ebd`) was already committed **and pushed** by the prior session.
  - Release re-verified after the fixes: `release-android-apk` run 41613895866 green;
    served APK 1.0.13 (vc 12), 128,222,822 bytes, 2026-11-03T10:19:04Z.

  ### PII still in pushed history (not a credential)
  - `.openhands/conversations/` (added `4c83a6d`, removed `e6d8ebd`) leaves ~5,774 objects
    incl. a 12.7 MB `trajectory.zip` in history. No live secrets remain (scanned for
    `ghp_/ghu_/sk-or-v1-/AIza`), but the user's Gmail and the old Rakazo dev emails
    (`elie@rakazo.com`, `security@`, `support@`) are public. Purge needs filter-repo +
    force-push and the user's go-ahead.

  ### Secret hygiene rule (learned the hard way)
- The repo is **public**. Before committing a fetched conversation/trajectory (or any
  third-party dump), grep it for secrets — the user pasted a live `ghp_…` PAT into a
  chat and it landed in the archive. Redact to `<REDACTED-SECRET>` in both the text
  files **and** any nested `.zip`, then `git reflog expire --expire=now --all &&
  git gc --prune=now` to drop the dangling blobs before pushing.

See `2026-10-31.md` for details.
