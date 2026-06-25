"""CI-variant van de Garmin-login (geen interactieve prompts).

Draait in GitHub Actions. Leest GARMIN_EMAIL / GARMIN_PASSWORD (en optioneel
GARMIN_MFA) uit de omgeving, logt in en schrijft de base64-tokenblob naar
`garmin_token_b64.txt` (door de workflow geüpload als download-artifact).

Daarna plak je die inhoud in de secret GARMIN_TOKENS_BASE64.
"""

import base64
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
    email = config.GARMIN_EMAIL
    password = config.GARMIN_PASSWORD
    if not email or not password:
        raise SystemExit("Zet de secrets GARMIN_EMAIL en GARMIN_PASSWORD.")

    mfa = os.getenv("GARMIN_MFA", "").strip()

    garmin = Garmin(
        email,
        password,
        is_cn=config.GARMIN_IS_CN,
        # In CI komt de MFA-code uit een workflow-input; leeg = account zonder MFA.
        prompt_mfa=lambda: mfa,
    )
    garmin.login()

    # Bij een 429 (IP rate-limit) slikt garminconnect de fout soms in en blijft
    # garth ongeïnitialiseerd. Geef dan een duidelijke melding i.p.v. een crash.
    if getattr(garmin, "garth", None) is None:
        raise SystemExit(
            "Login niet voltooid (waarschijnlijk 429 IP rate-limit van Garmin).\n"
            "Wacht 30-60 min en probeer opnieuw, of genereer de token via "
            "Google Cloud Shell (zie README). 2FA staat best tijdelijk uit."
        )

    tokenstore = config.GARMIN_TOKENSTORE
    os.makedirs(tokenstore, exist_ok=True)
    garmin.garth.dump(tokenstore)

    blob = _tokens_to_base64(tokenstore)
    with open("garmin_token_b64.txt", "w", encoding="utf-8") as fh:
        fh.write(blob)
    print("OK — garmin_token_b64.txt geschreven (", len(blob), "tekens ).")


if __name__ == "__main__":
    main()
