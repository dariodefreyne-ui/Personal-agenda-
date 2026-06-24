"""Configuration loaded from environment variables (and an optional .env)."""

import os

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # python-dotenv not installed yet; env vars still work
    pass


def _expand(path: str | None) -> str | None:
    return os.path.expanduser(path) if path else path


# --- Garmin Connect ---
GARMIN_EMAIL = os.getenv("GARMIN_EMAIL")
GARMIN_PASSWORD = os.getenv("GARMIN_PASSWORD")
GARMIN_TOKENS_BASE64 = os.getenv("GARMIN_TOKENS_BASE64")
GARMIN_TOKENSTORE = _expand(os.getenv("GARMIN_TOKENSTORE")) or os.path.expanduser(
    "~/.garminconnect"
)
GARMIN_IS_CN = os.getenv("GARMIN_IS_CN", "false").lower() in ("1", "true", "yes")

# --- Firestore ---
FIREBASE_SERVICE_ACCOUNT_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
GOOGLE_APPLICATION_CREDENTIALS = _expand(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
FIRESTORE_PROJECT_ID = os.getenv("FIRESTORE_PROJECT_ID")
FIRESTORE_USER_ID = os.getenv("FIRESTORE_USER_ID", "default")

# Firestore collection names (under users/{FIRESTORE_USER_ID}).
DAILY_COLLECTION = os.getenv("FIRESTORE_DAILY_COLLECTION", "garminDaily")
ACTIVITIES_COLLECTION = os.getenv("FIRESTORE_ACTIVITIES_COLLECTION", "garminActivities")
