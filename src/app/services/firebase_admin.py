import json
import logging
import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials

from src.app.core.config import settings

logger = logging.getLogger(__name__)


class BrainstormFirebaseConfigurationError(RuntimeError):
    """Raised when Firebase Admin credentials/config cannot be initialized."""


def _require_firebase_setting(name: str, value: str) -> str:
    if value:
        return value

    raise BrainstormFirebaseConfigurationError(
        f"{name} must be configured before brainstorm Firebase services are used."
    )


def _find_gcloud_legacy_adc_path() -> Path | None:
    try:
        home_dir = Path.home()
    except RuntimeError:
        return None

    legacy_credentials_dir = home_dir / ".config" / "gcloud" / "legacy_credentials"
    if not legacy_credentials_dir.exists():
        return None

    candidates = sorted(legacy_credentials_dir.glob("*/adc.json"))
    if len(candidates) != 1:
        return None

    return candidates[0]


def _resolve_firebase_project_id() -> str:
    return settings.FIREBASE_PROJECT_ID


def _resolve_firebase_storage_bucket() -> str:
    return settings.FIREBASE_STORAGE_BUCKET


def get_configured_firebase_project_id() -> str:
    return _resolve_firebase_project_id()


def get_configured_firebase_storage_bucket() -> str:
    return _resolve_firebase_storage_bucket()


def _build_firebase_credentials():
    credentials_json = settings.FIREBASE_CREDENTIALS_JSON
    if not credentials_json:
        google_application_credentials = os.environ.get(
            "GOOGLE_APPLICATION_CREDENTIALS"
        )
        try:
            standard_adc_path = (
                Path.home()
                / ".config"
                / "gcloud"
                / "application_default_credentials.json"
            )
        except RuntimeError:
            standard_adc_path = None

        if google_application_credentials or (
            standard_adc_path is not None and standard_adc_path.exists()
        ):
            return credentials.ApplicationDefault()

        legacy_adc_path = _find_gcloud_legacy_adc_path()
        if legacy_adc_path is not None:
            logger.info(
                "Using gcloud legacy ADC refresh token for brainstorm Firebase access"
            )
            os.environ.setdefault(
                "GOOGLE_APPLICATION_CREDENTIALS",
                str(legacy_adc_path),
            )
            return credentials.ApplicationDefault()

        return credentials.ApplicationDefault()

    try:
        payload = json.loads(credentials_json)
    except json.JSONDecodeError as exc:
        raise BrainstormFirebaseConfigurationError(
            "FIREBASE_CREDENTIALS_JSON must be valid JSON."
        ) from exc

    try:
        return credentials.Certificate(payload)
    except (KeyError, TypeError, ValueError) as exc:
        raise BrainstormFirebaseConfigurationError(
            "FIREBASE_CREDENTIALS_JSON must contain a valid Firebase service "
            "account payload."
        ) from exc


def _build_firebase_options() -> dict[str, str]:
    return {
        "projectId": _require_firebase_setting(
            "FIREBASE_PROJECT_ID",
            _resolve_firebase_project_id(),
        ),
        "storageBucket": _require_firebase_setting(
            "FIREBASE_STORAGE_BUCKET",
            _resolve_firebase_storage_bucket(),
        ),
    }


def get_firebase_admin_app():
    """Return a configured Firebase Admin app for brainstorm-only services."""
    try:
        return firebase_admin.get_app()
    except ValueError:
        logger.info(
            "Initializing Firebase Admin for project %s",
            _resolve_firebase_project_id(),
        )
        try:
            return firebase_admin.initialize_app(
                _build_firebase_credentials(),
                _build_firebase_options(),
            )
        except ValueError as exc:
            raise BrainstormFirebaseConfigurationError(
                "Unable to initialize Firebase Admin for brainstorm services."
            ) from exc
