from __future__ import annotations

from datetime import UTC, datetime
from typing import NoReturn
from urllib.parse import quote

from google.api_core import exceptions as google_api_exceptions
from google.auth.exceptions import DefaultCredentialsError

from src.app.services.firebase_admin import BrainstormFirebaseConfigurationError


def now_timestamp() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def raise_session_dependency_error(error: Exception) -> NoReturn:
    from src.app.services.brainstorm_session_library import (
        BrainstormSessionDependencyError,
    )

    if isinstance(error, BrainstormFirebaseConfigurationError):
        raise BrainstormSessionDependencyError(
            "Brainstorm session storage is unavailable because the backend "
            "Firebase configuration is incomplete."
        ) from error

    if isinstance(error, DefaultCredentialsError):
        raise BrainstormSessionDependencyError(
            "Brainstorm session storage is unavailable because backend Google "
            "credentials are not configured."
        ) from error

    if isinstance(error, google_api_exceptions.NotFound):
        lowered_message = str(error).lower()
        if "database (default) does not exist" in lowered_message:
            raise BrainstormSessionDependencyError(
                "Brainstorm session storage is unavailable because the "
                "Firestore database is not provisioned for this project yet."
            ) from error

    if isinstance(error, google_api_exceptions.PermissionDenied):
        raise BrainstormSessionDependencyError(
            "Brainstorm session storage is unavailable because the backend "
            "does not have permission to access Firestore."
        ) from error

    if isinstance(error, google_api_exceptions.GoogleAPICallError):
        raise BrainstormSessionDependencyError(
            "Brainstorm session storage is temporarily unavailable."
        ) from error

    raise error


def build_attachment_content_disposition(filename: str) -> str:
    safe_filename = filename or "artifact"
    quoted_filename = quote(safe_filename, safe="")
    return f"attachment; filename*=UTF-8''{quoted_filename}"
