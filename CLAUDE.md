# personal-agenda - Claude Code guide

## Project

A personal health/agenda **webapp backed by Firestore** (the app itself is not
built yet). What exists today is the **Garmin Connect -> Firestore data
pipeline** that feeds it: steps, sleep, heart rate, activities, and training
readiness, synced daily plus a full-history backfill.

## Layout

```
garmin/                 Python sync package
  config.py             env-driven config (Garmin creds, Firestore creds, ids)
  auth.py               `python -m garmin.auth` -> token blob (MFA-proof)
  client.py             builds an authenticated Garmin client (token-first)
  fetchers.py           defensive per-day / activity fetchers
  firestore_db.py       Firestore init + writers (write_daily / write_activity)
  sync_daily.py         `python -m garmin.sync_daily` (the daily cron entry)
  backfill.py           `python -m garmin.backfill --start YYYY-MM-DD`
  import_export.py      `python -m garmin.import_export --path export.zip`
.github/workflows/garmin-daily.yml   scheduled daily sync
firestore.rules         starter security rules for the webapp
requirements.txt        garminconnect, firebase-admin, python-dotenv
.claude/skills/         project skills (incl. garmin-firestore)
```

## Firestore data model

```
users/{FIRESTORE_USER_ID}/garminDaily/{YYYY-MM-DD}
  { date, summary, sleep, heartRate, restingHeartRate,
    trainingReadiness, trainingStatus, stepsIntraday, syncedAt }
users/{FIRESTORE_USER_ID}/garminActivities/{activityId}
  { ...full Garmin activity..., syncedAt }
```

All writes use `merge=True`; re-running a day is safe and idempotent.

## Conventions

- Python 3.12, standard library + the three pinned deps. Keep new Garmin
  fetches in `fetchers.py` behind the `_safe` wrapper so one failing endpoint
  never aborts a sync.
- Underlying Garmin access is the `garminconnect` library (see the `garmin_mcp`
  repo for the same library's tool surface). Prefer summary endpoints over
  high-volume detail endpoints to stay well under Firestore's 1 MB/doc limit.
- When the webapp is added, keep it in its own top-level folder (e.g. `web/`)
  and read from the collections above rather than re-fetching from Garmin.

## Secrets (never commit)

`.env`, service-account JSON, and token files are git-ignored. CI reads
`GARMIN_TOKENS_BASE64`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIRESTORE_PROJECT_ID`,
and `FIRESTORE_USER_ID` from GitHub Actions secrets. See README for setup.
