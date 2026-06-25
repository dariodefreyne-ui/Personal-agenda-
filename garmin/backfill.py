"""Backfill a full historical date range via the Garmin API.

    python -m garmin.backfill --start 2023-01-01 --end 2026-06-23
    python -m garmin.backfill --start 2023-01-01            # end = today
    python -m garmin.backfill --start 2023-01-01 --no-activities

Use this to seed Firestore with all history before the daily cron takes over.
A small delay between days keeps the API happy over long ranges.
"""

import argparse
import datetime as dt
import logging
import time

from . import client as client_mod
from . import fetchers, firestore_db

log = logging.getLogger(__name__)


def _daterange(start: dt.date, end: dt.date):
    day = start
    while day <= end:
        yield day
        day += dt.timedelta(days=1)


def run(
    start: str,
    end: str | None = None,
    with_activities: bool = True,
    delay: float = 0.7,
) -> None:
    garmin = client_mod.get_client()
    start_date = dt.date.fromisoformat(start)
    end_date = dt.date.fromisoformat(end) if end else dt.date.today()

    count = 0
    for day in _daterange(start_date, end_date):
        day_str = day.isoformat()
        doc = fetchers.fetch_day(garmin, day_str)
        firestore_db.write_daily(day_str, doc)
        count += 1
        if count % 25 == 0:
            log.info("... %d days written (through %s)", count, day_str)
        time.sleep(delay)
    log.info("daily backfill complete: %d days", count)

    if with_activities:
        activities = fetchers.fetch_activities(
            garmin, start_date.isoformat(), end_date.isoformat()
        )
        for activity in activities:
            activity_id = activity.get("activityId")
            if activity_id is None:
                continue
            firestore_db.write_activity(activity_id, activity)
        log.info("activities backfilled: %d", len(activities))


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill Garmin history")
    parser.add_argument("--start", required=True, help="Start date YYYY-MM-DD")
    parser.add_argument("--end", help="End date YYYY-MM-DD (default: today)")
    parser.add_argument(
        "--no-activities", action="store_true", help="Skip activity backfill"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.7,
        help="Seconds to wait between days (default: 0.7)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    run(
        start=args.start,
        end=args.end,
        with_activities=not args.no_activities,
        delay=args.delay,
    )


if __name__ == "__main__":
    main()
