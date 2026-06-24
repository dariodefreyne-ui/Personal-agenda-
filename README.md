# Personal Agenda

Personal health/agenda webapp backed by **Firestore**. This repo currently
contains the **Garmin Connect -> Firestore data pipeline**; the webapp will be
built on top of the data it produces.

## What the pipeline does

Pulls from Garmin Connect into Firestore:

- **Steps** (daily total + intraday)
- **Sleep**
- **Heart rate** (intraday + resting)
- **Activities**
- **Training readiness** (+ training status)

Daily via a scheduled GitHub Action; full history via a one-off backfill or by
importing Garmin's official data export.

## Firestore data model

```
users/{FIRESTORE_USER_ID}/garminDaily/{YYYY-MM-DD}
  date, summary, sleep, heartRate, restingHeartRate,
  trainingReadiness, trainingStatus, stepsIntraday, syncedAt

users/{FIRESTORE_USER_ID}/garminActivities/{activityId}
  (full Garmin activity object) + syncedAt
```

Documents are written with `merge=True`, so re-running a day updates in place.

## One-time setup

1. **Install deps** (Python 3.12+):
   ```bash
   pip install -r requirements.txt
   ```
2. **Create a Firebase service account**: Firebase console -> Project settings
   -> Service accounts -> Generate new private key. Keep the JSON out of git.
3. **Configure env**: `cp .env.example .env` and fill it in.
4. **Authenticate with Garmin once** (handles MFA):
   ```bash
   python -m garmin.auth
   ```
   Copy the printed `GARMIN_TOKENS_BASE64` blob into `.env` and into the repo's
   GitHub Actions secrets. Tokens last ~6 months.

## Usage

```bash
# Daily sync (yesterday + today)
python -m garmin.sync_daily

# Backfill all history via the API
python -m garmin.backfill --start 2023-01-01

# Import Garmin's official "Export Your Data" archive
python -m garmin.import_export --path ~/Downloads/DI_CONNECT.zip
```

## Automated daily sync (GitHub Actions)

`.github/workflows/garmin-daily.yml` runs every day at 05:15 UTC (and on demand
via *Run workflow*). Add these **repository secrets**:

| Secret | Value |
| --- | --- |
| `GARMIN_TOKENS_BASE64` | Output of `python -m garmin.auth` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full service-account JSON, pasted as one secret |
| `FIRESTORE_PROJECT_ID` | Your Firebase/GCP project id |
| `FIRESTORE_USER_ID` | Logical owner id (matches the webapp user's uid) |

(Optional repository **variable** `GARMIN_IS_CN=true` for Garmin Connect China.)

## Security

Never commit `.env`, service-account JSON, or token files -- `.gitignore`
already blocks them. The pipeline writes via the Admin SDK; `firestore.rules`
keeps client writes to Garmin data off while letting the signed-in owner read.
