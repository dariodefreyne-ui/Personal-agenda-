"""Builds an authenticated `garminconnect.Garmin` client.

Resolution order:
  1. A base64 token blob in GARMIN_TOKENS_BASE64 (preferred, MFA-proof, CI-safe).
  2. Existing token files in GARMIN_TOKENSTORE.
  3. Email + password (only works for accounts without MFA).
"""

import base64
import io
import logging
import os
import tarfile

from garminconnect import Garmin

from . import config

log = logging.getLogger(__name__)


def _restore_tokens(b64: str, dest: str) -> None:
    """Unpack a base64-encoded tar of the token directory into `dest`."""
    os.makedirs(dest, exist_ok=True)
    data = base64.b64decode(b64)
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:*") as tar:
        tar.extractall(dest)


def _has_tokens(tokenstore: str) -> bool:
    if not os.path.isdir(tokenstore):
        return False
    return any(name.endswith(".json") for name in os.listdir(tokenstore))


def get_client() -> Garmin:
    tokenstore = config.GARMIN_TOKENSTORE

    if config.GARMIN_TOKENS_BASE64 and not _has_tokens(tokenstore):
        log.info("Restoring Garmin tokens from GARMIN_TOKENS_BASE64")
        _restore_tokens(config.GARMIN_TOKENS_BASE64, tokenstore)

    # 1 + 2: token-based login.
    if _has_tokens(tokenstore):
        try:
            garmin = Garmin()
            garmin.login(tokenstore)
            log.info("Authenticated with stored Garmin tokens")
            return garmin
        except Exception as exc:  # tokens expired / invalid
            log.warning("Token login failed (%s); trying credentials", exc)

    # 3: credential login (no MFA accounts only).
    if config.GARMIN_EMAIL and config.GARMIN_PASSWORD:
        garmin = Garmin(
            config.GARMIN_EMAIL,
            config.GARMIN_PASSWORD,
            is_cn=config.GARMIN_IS_CN,
        )
        garmin.login()
        try:
            garmin.client.dump(tokenstore)
            log.info("Saved fresh Garmin tokens to %s", tokenstore)
        except Exception:
            pass
        return garmin

    raise RuntimeError(
        "No Garmin credentials available. Run `python -m garmin.auth` to create "
        "a token blob, or set GARMIN_EMAIL / GARMIN_PASSWORD."
    )
