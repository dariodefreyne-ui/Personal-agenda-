"""One-time interactive Garmin login.

Run locally:  python -m garmin.auth

It logs in (handling MFA), saves reusable tokens to GARMIN_TOKENSTORE, and
prints a base64 blob to paste into GARMIN_TOKENS_BASE64 -- locally in .env and
as a GitHub Actions secret. Tokens last ~6 months; re-run when they expire.
"""

import base64
import getpass
import io
import os
import tarfile

from garminconnect import Garmin

from . import config


def _tokens_to_base64(tokenstore: str) -> str:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w") as tar:
        tar.add(tokenstore, arcname=".")
    return base64.b64encode(buf.getvalue()).decode()


def main() -> None:
    email = config.GARMIN_EMAIL or input("Garmin email: ").strip()
    password = config.GARMIN_PASSWORD or getpass.getpass("Garmin password: ")

    garmin = Garmin(
        email,
        password,
        is_cn=config.GARMIN_IS_CN,
        prompt_mfa=lambda: input("MFA code (blank if none): ").strip(),
    )
    garmin.login()

    tokenstore = config.GARMIN_TOKENSTORE
    os.makedirs(tokenstore, exist_ok=True)
    garmin.garth.dump(tokenstore)
    print(f"\nTokens saved to {tokenstore}")

    blob = _tokens_to_base64(tokenstore)
    print("\n=== GARMIN_TOKENS_BASE64 (store as a secret) ===\n")
    print(blob)
    print("\nAdd it to .env and to the repo's GitHub Actions secrets.")


if __name__ == "__main__":
    main()
