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
  purpose) with `git -c credential.helper= push "https://NETO-DEV66:<pat>@github.com/NETO-DEV66/ALTERNATIVE-BOT.git" main`.
  Never persist the value; treat it as a transient secret.

## Archiving an OpenHands Cloud conversation

- `GET /api/v1/app-conversations?ids=<id>` — conversation record.
- `GET /api/v1/app-conversations/<id>/download` — **best**: one request, a zip with
  `meta.json` + `event_*.json` per event.
- `GET /api/v1/conversation/<id>/events/search?limit=100&page=N` — works but
  **429s around page 129** (~12,900 events). Prefer the download zip.
- The `/canvas/shared/...` web page requires login; the API does not.

## Current state (2026-10-31)

- `origin/main` is at `42aa60f fix: finish Alternative Bot rebrand and remove billing leftovers`.
  A newer local commit `8893438` (conversation archive + final billing-leftover cleanup)
  is **committed but not pushed** — the push 403s on the read-only token; needs the
  user's fresh PAT.
- Rebrand + billing removal are **verified complete**: no `rakazo`/`Rakazo` or
  `elie222` references remain outside `.git`/the original source zip; all
  billing/payment code, Prisma models, migrations and Stripe compose env are gone.
- **T5 (APK build + GitHub release) is still open** — no release exists, no APK built.
- 4 test files fail on clean `HEAD` for environmental reasons (no `::1` loopback,
  npm-in-pnpm, process-reaping timing, real model HTTP) — not regressions.

### Secret hygiene rule (learned the hard way)
- The repo is **public**. Before committing a fetched conversation/trajectory (or any
  third-party dump), grep it for secrets — the user pasted a live `ghp_…` PAT into a
  chat and it landed in the archive. Redact to `<REDACTED-SECRET>` in both the text
  files **and** any nested `.zip`, then `git reflog expire --expire=now --all &&
  git gc --prune=now` to drop the dangling blobs before pushing.

See `2026-10-31.md` for details.
