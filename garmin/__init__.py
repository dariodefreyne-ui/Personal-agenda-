"""Garmin Connect -> Firestore sync pipeline.

Modules:
    config         Environment-driven configuration.
    auth           One-time interactive login -> reusable token blob.
    client         Builds an authenticated Garmin client (token-first).
    fetchers       Pulls a day of health data / activities, defensively.
    firestore_db   Firestore connection and document writers.
    sync_daily     Entry point for the daily scheduled sync.
    backfill       Loads a full historical date range via the API.
    import_export  Best-effort importer for Garmin's \"Export Your Data\" zip.
"""

__all__ = [
    "config",
    "auth",
    "client",
    "fetchers",
    "firestore_db",
]
