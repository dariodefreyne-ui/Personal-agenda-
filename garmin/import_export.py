"""Best-effort importer for Garmin's official \"Export Your Data\" archive.

Garmin lets you request a full data export at https://www.garmin.com/account/datamanagement/
which arrives as a zip (DI_CONNECT/...). The API backfill (garmin.backfill) is the
primary bulk loader; use this when you want the complete historic dump without
hitting the API day by day.

    python -m garmin.import_export --path ~/Downloads/DI_CONNECT.zip
    python -m garmin.import_export --path ~/Downloads/DI_CONNECT/

It walks the archive, recognises the common wellness / sleep / activity JSON
files, and writes them to Firestore keyed by their calendar date or activity id.
Garmin changes export layouts over time, so unknown files are logged and skipped
rather than guessed at.
"""

import argparse
import datetime as dt
import json
import logging
import os
import tempfile
import zipfile

from . import firestore_db

log = logging.getLogger(__name__)


def _iter_json_files(root: str):
    for dirpath, _dirs, files in os.walk(root):
        for name in files:
            if name.lower().endswith(".json"):
                yield os.path.join(dirpath, name)


def _load(path: str):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception as exc:
        log.warning("could not parse %s: %s", path, exc)
        return None


def _date_from_epoch_ms(value):
    try:
        return dt.datetime.utcfromtimestamp(int(value) / 1000).date().isoformat()
    except Exception:
        return None


def _import_sleep(records):
    n = 0
    for rec in records if isinstance(records, list) else []:
        date = rec.get("calendarDate") or rec.get("sleepStartTimestampLocal")
        if isinstance(date, str):
            date = date[:10]
        if not date:
            continue
        firestore_db.write_daily(date, {"date": date, "sleep": rec})
        n += 1
    return n


def _import_wellness(records):
    n = 0
    for rec in records if isinstance(records, list) else []:
        date = rec.get("calendarDate")
        if not date:
            continue
        firestore_db.write_daily(date[:10], {"date": date[:10], "summary": rec})
        n += 1
    return n


def _import_activities(records):
    n = 0
    for rec in records if isinstance(records, list) else []:
        activity_id = rec.get("activityId")
        if activity_id is None:
            continue
        firestore_db.write_activity(activity_id, rec)
        n += 1
    return n


def _classify_and_import(path: str) -> int:
    name = os.path.basename(path).lower()
    data = _load(path)
    if data is None:
        return 0

    # Garmin nests the list under the file name key in some exports.
    if isinstance(data, dict):
        for value in data.values():
            if isinstance(value, list):
                data = value
                break

    if "sleep" in name:
        return _import_sleep(data)
    if "uds" in name or "wellness" in name or "dailysummary" in name:
        return _import_wellness(data)
    if "activit" in name or "summarizedactivities" in name:
        return _import_activities(data)

    log.info("skipped unrecognised file: %s", os.path.basename(path))
    return 0


def run(path: str) -> None:
    cleanup = None
    root = path
    if path.lower().endswith(".zip"):
        cleanup = tempfile.mkdtemp(prefix="garmin_export_")
        with zipfile.ZipFile(path) as zf:
            zf.extractall(cleanup)
        root = cleanup
        log.info("extracted export to %s", root)

    total = 0
    for json_path in _iter_json_files(root):
        total += _classify_and_import(json_path)
    log.info("import complete: %d records written", total)

    if cleanup:
        log.info("temporary files left in %s (safe to delete)", cleanup)


def main() -> None:
    parser = argparse.ArgumentParser(description="Import a Garmin data export")
    parser.add_argument(
        "--path", required=True, help="Path to the export .zip or extracted folder"
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    run(args.path)


if __name__ == "__main__":
    main()
