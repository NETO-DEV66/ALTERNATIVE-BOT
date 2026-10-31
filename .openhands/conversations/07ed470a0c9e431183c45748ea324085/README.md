# Shared conversation archive

Archived copy of the OpenHands conversation shared at
`https://app.all-hands.dev/canvas/shared/conversations/07ed470a0c9e431183c45748ea324085`.

| Field | Value |
| --- | --- |
| Conversation id | `07ed470a0c9e431183c45748ea324085` |
| Title | Alternative Bot |
| Repository | `NETO-DEV66/ALTERNATIVE-BOT` (branch `main`) |
| Created | 2026-10-31T10:02:20Z |
| Model | `openhands/deepseek-v4.1-flash` |
| Events | 5765 |
| Messages (user/agent) | 17 |

## Files

| Path | Contents |
| --- | --- |
| `conversation.json` | Conversation record from `GET /api/v1/app-conversations?ids=...` |
| `trajectory/` | Extracted trajectory: `meta.json` + one `event_*.json` per event |
| `trajectory.zip` | Raw zip from `GET /api/v1/app-conversations/<id>/download` |
| `summary.txt` | Readable timeline: user/agent messages and terminal commands |
| `REVIEW.md` | Verification of what the session actually did |

## How it was fetched

```bash
curl -H "Authorization: Bearer $OPENHANDS_API_KEY" \
  "https://app.all-hands.dev/api/v1/app-conversations?ids=07ed470a0c9e431183c45748ea324085"
curl -H "Authorization: Bearer $OPENHANDS_API_KEY" \
  "https://app.all-hands.dev/api/v1/app-conversations/07ed470a0c9e431183c45748ea324085/download" \
  -o trajectory.zip
```

The `/api/v1/conversation/<id>/events/search` endpoint rate-limits (HTTP 429)
around page 129; the `/download` zip carries the same events in one request.
