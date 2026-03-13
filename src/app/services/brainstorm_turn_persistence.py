"""Brainstorm turn persistence service.

Handles saving and restoring transcript turns for signed-in brainstorm
sessions. Guest sessions are never persisted — they have no server-side
session record, so any attempt to save or load turns for a nonexistent
session will fail with a 404.
"""

from __future__ import annotations

from typing import Any

from google.api_core import exceptions as google_api_exceptions
from google.auth.exceptions import DefaultCredentialsError

from src.app.services.brainstorm_persistence import BrainstormPersistenceServices
from src.app.services.brainstorm_session_library import (
    BRAINSTORM_SESSION_COLLECTION,
    BrainstormSessionAccessDeniedError,
    BrainstormSessionNotFoundError,
    _now_timestamp,
    _raise_session_dependency_error,
)
from src.app.services.firebase_admin import BrainstormFirebaseConfigurationError

BRAINSTORM_TURNS_SUBCOLLECTION = "turns"
BRAINSTORM_TURNS_DOCUMENT_ID = "latest"
MAX_TITLE_LENGTH = 120


def _sessions_collection(services: BrainstormPersistenceServices):
    return services.firestore_client.collection(BRAINSTORM_SESSION_COLLECTION)


def _verify_session_ownership(
    services: BrainstormPersistenceServices,
    *,
    session_id: str,
    owner_uid: str,
) -> dict[str, Any]:
    """Fetch and verify session ownership. Returns the session data dict."""
    doc_ref = _sessions_collection(services).document(session_id)
    try:
        snapshot = doc_ref.get()
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        _raise_session_dependency_error(exc)

    if not snapshot.exists:
        raise BrainstormSessionNotFoundError()

    data = snapshot.to_dict()
    if data.get("owner_uid") != owner_uid:
        raise BrainstormSessionAccessDeniedError()

    return data


def save_brainstorm_turns(
    services: BrainstormPersistenceServices,
    *,
    session_id: str,
    owner_uid: str,
    turns: list[dict[str, Any]],
) -> int:
    """Persist the full turn list for a signed-in brainstorm session.

    Each save replaces the previous turn state entirely.
    Also updates the session's ``updated_at`` timestamp.

    Returns the number of saved turns.
    """
    _verify_session_ownership(services, session_id=session_id, owner_uid=owner_uid)

    turns_doc_ref = (
        _sessions_collection(services)
        .document(session_id)
        .collection(BRAINSTORM_TURNS_SUBCOLLECTION)
        .document(BRAINSTORM_TURNS_DOCUMENT_ID)
    )

    now = _now_timestamp()

    try:
        turns_doc_ref.set(
            {
                "turns": turns,
                "turn_count": len(turns),
                "updated_at": now,
            }
        )

        # Touch the session's updated_at timestamp
        _sessions_collection(services).document(session_id).set(
            {"updated_at": now},
            merge=True,
        )
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        _raise_session_dependency_error(exc)

    return len(turns)


def load_brainstorm_turns(
    services: BrainstormPersistenceServices,
    *,
    session_id: str,
    owner_uid: str,
) -> list[dict[str, Any]]:
    """Load persisted turns for a signed-in brainstorm session.

    Returns an empty list when no turns have been saved yet.
    """
    _verify_session_ownership(services, session_id=session_id, owner_uid=owner_uid)

    turns_doc_ref = (
        _sessions_collection(services)
        .document(session_id)
        .collection(BRAINSTORM_TURNS_SUBCOLLECTION)
        .document(BRAINSTORM_TURNS_DOCUMENT_ID)
    )

    try:
        snapshot = turns_doc_ref.get()
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        _raise_session_dependency_error(exc)

    if not snapshot.exists:
        return []

    data = snapshot.to_dict()
    return data.get("turns", [])


def update_brainstorm_session_title(
    services: BrainstormPersistenceServices,
    *,
    session_id: str,
    owner_uid: str,
    title: str,
) -> dict[str, str | None]:
    """Update a brainstorm session's title.

    Returns the updated session metadata as a camelCase dict.
    """
    from src.app.services.brainstorm_session_library import (
        _session_record_from_snapshot,
    )

    stripped_title = title.strip()
    if not stripped_title:
        from src.app.services.brainstorm_session_library import (
            BrainstormSessionError,
        )

        raise BrainstormSessionError("Session title cannot be empty.")

    if len(stripped_title) > MAX_TITLE_LENGTH:
        stripped_title = stripped_title[:MAX_TITLE_LENGTH]

    _verify_session_ownership(services, session_id=session_id, owner_uid=owner_uid)

    now = _now_timestamp()
    doc_ref = _sessions_collection(services).document(session_id)

    try:
        doc_ref.set(
            {
                "title": stripped_title,
                "updated_at": now,
            },
            merge=True,
        )
        snapshot = doc_ref.get()
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        _raise_session_dependency_error(exc)

    record = _session_record_from_snapshot(snapshot)
    return record.to_response_dict()
