"""Firestore connection and document writers.

Data model (single personal user):
    users/{FIRESTORE_USER_ID}/garminDaily/{YYYY-MM-DD}
    users/{FIRESTORE_USER_ID}/garminActivities/{activityId}

Credentials resolution:
    1. FIREBASE_SERVICE_ACCOUNT_JSON  (raw JSON string, used in CI)
    2. GOOGLE_APPLICATION_CREDENTIALS (path to a key file, used locally)
    3. Application Default Credentials (gcloud / workload identity)
"""

import json
import logging

import firebase_admin
from firebase_admin import credentials, firestore

from . import config

log = logging.getLogger(__name__)

_db = None


def get_db():
    global _db
    if _db is not None:
        return _db

    if not firebase_admin._apps:
        cred = None
        if config.FIREBASE_SERVICE_ACCOUNT_JSON:
            cred = credentials.Certificate(
                json.loads(config.FIREBASE_SERVICE_ACCOUNT_JSON)
            )
        elif config.GOOGLE_APPLICATION_CREDENTIALS:
            cred = credentials.Certificate(config.GOOGLE_APPLICATION_CREDENTIALS)

        options = {}
        if config.FIRESTORE_PROJECT_ID:
            options["projectId"] = config.FIRESTORE_PROJECT_ID

        if cred is not None:
            firebase_admin.initialize_app(cred, options or None)
        else:
            firebase_admin.initialize_app(options=options or None)

    _db = firestore.client()
    return _db


def _user_doc():
    return get_db().collection("users").document(config.FIRESTORE_USER_ID)


def write_daily(date_str: str, data: dict) -> None:
    payload = dict(data)
    payload["syncedAt"] = firestore.SERVER_TIMESTAMP
    _user_doc().collection(config.DAILY_COLLECTION).document(date_str).set(
        payload, merge=True
    )


def write_activity(activity_id, data: dict) -> None:
    payload = dict(data)
    payload["syncedAt"] = firestore.SERVER_TIMESTAMP
    _user_doc().collection(config.ACTIVITIES_COLLECTION).document(
        str(activity_id)
    ).set(payload, merge=True)
