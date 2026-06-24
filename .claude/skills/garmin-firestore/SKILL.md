---
name: garmin-firestore
description: Working with the Garmin Connect -> Firestore sync pipeline in this repo (daily sync, historical backfill, Garmin export import, and the Firestore data model the webapp reads). Use when adding health-data fetches, debugging the sync, wiring the webapp to Garmin data, or configuring the daily GitHub Action.
---

# Garmin -> Firestore pipeline

This repo syncs Garmin Connect health data into Firestore for the personal-agenda
webapp. Use this skill when touching anything in `garmin/`, the daily workflow,
or the Firestore data the webapp consumes.

## Architecture

```
Garmin Connect --(garminconnect lib)--> garmin/fetchers.py --> garmin/firestore_db.py --> Firestore
                                              ^                         |
      garmin/client.py (token auth) ----------+                         v
                                                          webapp reads users/{uid}/garmin*
```

- **Auth is token-first.** `garmin/client.py` restores tokens from
  `GARMIN_TOKENS_BASE64`, else a token dir, else email/password. Create the
  blob with `python -m garmin.auth` (handles MFA). Never put passwords in CI.
- **Fetches are defensive.** Every Garmin call in `fetchers.py` goes through
  `_safe(...)` so a single failing endpoint logs a warning and returns `None`
  instead of aborting the whole sync. Keep new fetches in that pattern.
- **Writes are idempotent.** `firestore_db.write_daily` / `write_activity` use
  `set(..., merge=True)`, so re-running any day updates in place.

## Data model

```
users/{FIRESTORE_USER_ID}/garminDaily/{YYYY-MM-DD}
  date, summary (incl. totalSteps), sleep, heartRate, restingHeartRate,
  trainingReadiness, trainingStatus, stepsIntraday, syncedAt
users/{FIRESTORE_USER_ID}/garminActivities/{activityId}
  full Garmin activity object + syncedAt
```

When building the webapp, read these collections; do not call Garmin from the
client. Keep documents under Firestore's 1 MB limit -- prefer summary endpoints.

## Common tasks

| Goal | Command |
| --- | --- |
| One-time Garmin login / token blob | `python -m garmin.auth` |
| Daily sync (yesterday + today) | `python -m garmin.sync_daily` |
| Sync a specific day | `python -m garmin.sync_daily --date 2026-06-20` |
| Backfill full history via API | `python -m garmin.backfill --start 2023-01-01` |
| Import Garmin's export zip | `python -m garmin.import_export --path export.zip` |

## Adding a new metric

1. Add a `_safe(garmin.get_xxx, date_str)` line to `fetch_day` in
   `garmin/fetchers.py` under a clear camelCase key.
2. It flows into `garminDaily/{date}` automatically (no writer change needed).
3. Mirror it in the export importer only if the export contains that data.

## Gotchas

- Tokens expire ~every 6 months -> re-run `python -m garmin.auth` and update the
  `GARMIN_TOKENS_BASE64` secret.
- Long backfills can hit Garmin rate limits; `backfill.py` sleeps between days
  (`--delay`). Increase it if you see failures.
- The daily GitHub Action needs the secrets listed in README / CLAUDE.md.
