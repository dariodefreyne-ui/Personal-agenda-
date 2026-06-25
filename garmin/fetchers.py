"""Defensive fetchers: a single failing Garmin endpoint never aborts a sync."""

import logging

log = logging.getLogger(__name__)


def _safe(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except Exception as exc:
        log.warning("%s failed: %s", getattr(fn, "__name__", fn), exc)
        return None


def fetch_day(garmin, date_str: str) -> dict:
    """Pull one calendar day of wellness data. `date_str` is YYYY-MM-DD."""
    return {
        "date": date_str,
        # Daily roll-up: totalSteps, totalKilocalories, floors, etc.
        "summary": _safe(garmin.get_user_summary, date_str),
        "sleep": _safe(garmin.get_sleep_data, date_str),
        "heartRate": _safe(garmin.get_heart_rates, date_str),
        "restingHeartRate": _safe(garmin.get_rhr_day, date_str),
        "trainingReadiness": _safe(garmin.get_training_readiness, date_str),
        "trainingStatus": _safe(garmin.get_training_status, date_str),
        "stepsIntraday": _safe(garmin.get_steps_data, date_str),
        # Fase 3: profiel & lichaamsmetrieken voor de coach-laag.
        "bodyBattery": _safe(garmin.get_body_battery, date_str, date_str),
        "bodyComposition": _safe(garmin.get_body_composition, date_str, date_str),
        "maxMetrics": _safe(garmin.get_max_metrics, date_str),
        "hrv": _safe(garmin.get_hrv_data, date_str),
        # Statisch profiel (leeftijd/lengte/gewicht/geslacht); zelfde elke dag.
        "userProfile": _safe(garmin.get_userprofile),
    }


def fetch_activities(garmin, start_date: str, end_date: str) -> list:
    """Activities between two YYYY-MM-DD dates (inclusive)."""
    return _safe(garmin.get_activities_by_date, start_date, end_date) or []
