"""Daily sync entry point.

    python -m garmin.sync_daily                 # yesterday + today
    python -m garmin.sync_daily --days-back 3    # last 3 days + today
    python -m garmin.sync_daily --date 2026-06-20

Today is re-synced because its data is still partial; merge=True keeps later
runs updating the same document.
"""

import argparse
import datetime as dt
import logging

from . import client as client_mod
from . import fetchers, firestore_db

log = logging.getLogger(__name__)


def run(date: str | None = None, days_back: int = 1) -> None:
    garmin = client_mod.get_client()

    if date:
        dates = [date]
    else:
        today = dt.date.today()
        dates = [
            (today - dt.timedelta(days=i)).isoformat()
            for i in range(days_back, -1, -1)
        ]

    for day in dates:
        doc = fetchers.fetch_day(garmin, day)
        firestore_db.write_daily(day, doc)
        log.info("daily synced: %s", day)

    start, end = min(dates), max(dates)
    activities = fetchers.fetch_activities(garmin, start, end)
    for activity in activities:
        activity_id = activity.get("activityId")
        if activity_id is None:
            continue
        firestore_db.write_activity(activity_id, activity)
    log.info("activities synced: %d (%s..%s)", len(activities), start, end)


def main() -> None:
    parser = argparse.ArgumentParser(description="Daily Garmin -> Firestore sync")
    parser.add_argument("--date", help="Sync a single day (YYYY-MM-DD)")
    parser.add_argument(
        "--days-back",
        type=int,
        default=1,
        help="How many days before today to include (default: 1)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    run(date=args.date, days_back=args.days_back)


if __name__ == "__main__":
    main()
