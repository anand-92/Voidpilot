import json
import logging

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


def _build_firebase_credentials():
    credentials_json = settings.FIREBASE_CREDENTIALS_JSON
    if not credentials_json:
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
            settings.FIREBASE_PROJECT_ID,
        ),
        "storageBucket": _require_firebase_setting(
            "FIREBASE_STORAGE_BUCKET",
            settings.FIREBASE_STORAGE_BUCKET,
        ),
    }


def get_firebase_admin_app():
    """Return a configured Firebase Admin app for brainstorm-only services."""
    try:
        return firebase_admin.get_app()
    except ValueError:
        logger.info(
            "Initializing Firebase Admin for project %s",
            settings.FIREBASE_PROJECT_ID,
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
