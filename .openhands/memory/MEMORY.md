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

## Current state (2026-11-01)

- `origin/main` = **`83c3e07`** "feat: remove the sign-in system" — **pushed**.
- **Sign-in removed for the app** (see `2026-11-01.md`): the mobile sign-in screen,
  auth routing, passkey offer, and deletion prompt are deleted; the server mints the
  session for its one account through `POST /local-session` and closes every
  credential route. Multi-user credential auth still exists behind
  `ALTERNATIVEBOT_LOCAL_SESSION=false`, and the web sign-in pages remain for it.
- **APK released.** Built locally with Gradle (no EAS/`EXPO_TOKEN`); asset
  `alternativebot.apk` (128,220,890 bytes) on release `android` (id 430456219).
  Rebuild recipe and SDK paths are in `2026-11-01.md`.

## Earlier state (2026-10-31)

- `origin/main` and local `main` are both at **`d464e4a`** — "chore: drop billing
  leftovers and the 24 MB source zip". **Pushed** successfully.
- Rebrand + billing removal are **verified complete**: no `rakazo`/`Rakazo` or
  `elie222` references remain outside `.git`; all billing/payment code, Prisma models,
  migrations and Stripe compose env are gone. The last dead remnant (the `pay_token`
  browser action + `card`/`cardField` fill fields, unreachable from the tool schema)
  was deleted along with `@stripe/link-sdk` and the 24 MB `ALTERNATIVE BOT.zip`.
- **T5 (APK build + GitHub release) is still open** — repo has **0 releases** and **0
  Actions secrets** (no `EXPO_TOKEN`); no java/Android SDK in the sandbox. The ready
  workflow `.github/workflows/release-android-apk.yml` needs an `EXPO_TOKEN` secret and
  a `GOOGLE_SERVICES_JSON` file var in the EAS *production* environment.
- 4 test files fail on clean `HEAD` for environmental reasons (no `::1` loopback,
  npm-in-pnpm, process-reaping timing, real model HTTP) — not regressions.

### Secret hygiene rule (learned the hard way)
- The repo is **public**. Before committing a fetched conversation/trajectory (or any
  third-party dump), grep it for secrets — the user pasted a live `ghp_…` PAT into a
  chat and it landed in the archive. Redact to `<REDACTED-SECRET>` in both the text
  files **and** any nested `.zip`, then `git reflog expire --expire=now --all &&
  git gc --prune=now` to drop the dangling blobs before pushing.

See `2026-10-31.md` for details.
