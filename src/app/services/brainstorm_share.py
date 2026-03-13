"""Brainstorm public share service.

Handles creating, resolving, and invalidating public share links
for persisted signed-in brainstorm sessions. Only persisted sessions
can be shared — guest sessions never produce share links.

Public share resolution does not require auth; anyone with the share
token can view the session read-only. Deleting the source session
immediately invalidates the share.
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import uuid4

from google.api_core import exceptions as google_api_exceptions
from google.auth.exceptions import DefaultCredentialsError

from src.app.services.brainstorm_persistence import BrainstormPersistenceServices
from src.app.services.brainstorm_persistence_utils import (
    now_timestamp,
    raise_session_dependency_error,
)
from src.app.services.brainstorm_session_library import (
    BRAINSTORM_SESSION_COLLECTION,
    BrainstormSessionAccessDeniedError,
    BrainstormSessionError,
    BrainstormSessionNotFoundError,
    _session_record_from_snapshot,
)
from src.app.services.firebase_admin import BrainstormFirebaseConfigurationError

logger = logging.getLogger(__name__)

BRAINSTORM_SHARES_COLLECTION = "brainstorm_shares"


class BrainstormShareNotFoundError(BrainstormSessionError):
    status_code = 404
    error_code = "brainstorm_share_not_found"
    default_message = "That brainstorm share link is no longer valid."


def _shares_collection(services: BrainstormPersistenceServices):
    return services.firestore_client.collection(BRAINSTORM_SHARES_COLLECTION)


def _sessions_collection(services: BrainstormPersistenceServices):
    return services.firestore_client.collection(BRAINSTORM_SESSION_COLLECTION)


def create_or_get_share(
    services: BrainstormPersistenceServices,
    *,
    session_id: str,
    owner_uid: str,
) -> dict[str, str]:
    """Create a public share link for a persisted session, or return the
    existing share token if one already exists.

    Only the session owner can create a share. The share token is stable:
    repeated calls for the same session return the same token.
    """
    # Verify session exists and belongs to the caller
    session_ref = _sessions_collection(services).document(session_id)
    try:
        session_snapshot = session_ref.get()
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        raise_session_dependency_error(exc)

    if not session_snapshot.exists:
        raise BrainstormSessionNotFoundError()

    session_data = session_snapshot.to_dict()
    if session_data.get("owner_uid") != owner_uid:
        raise BrainstormSessionAccessDeniedError()

    if session_data.get("mode") != "persisted":
        raise BrainstormSessionError("Only persisted sessions can be shared.")

    # Check if a share already exists for this session
    try:
        existing_shares = list(
            _shares_collection(services)
            .where("session_id", "==", session_id)
            .stream()
        )
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        raise_session_dependency_error(exc)

    if existing_shares:
        share_data = existing_shares[0].to_dict()
        return {
            "shareToken": existing_shares[0].id,
            "sessionId": share_data["session_id"],
            "createdAt": share_data.get("created_at", ""),
        }

    # Create a new share
    share_token = uuid4().hex
    now = now_timestamp()
    share_doc = {
        "session_id": session_id,
        "owner_uid": owner_uid,
        "created_at": now,
    }

    try:
        _shares_collection(services).document(share_token).set(share_doc)
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        raise_session_dependency_error(exc)

    return {
        "shareToken": share_token,
        "sessionId": session_id,
        "createdAt": now,
    }


def resolve_public_share(
    services: BrainstormPersistenceServices,
    *,
    share_token: str,
) -> dict[str, Any]:
    """Resolve a public share token to session data (no auth required).

    Returns the session metadata, turns, and artifact metadata for
    public rendering. Fails if the share token is invalid or the
    underlying session has been deleted.
    """
    # Look up the share
    share_ref = _shares_collection(services).document(share_token)
    try:
        share_snapshot = share_ref.get()
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        raise_session_dependency_error(exc)

    if not share_snapshot.exists:
        raise BrainstormShareNotFoundError()

    share_data = share_snapshot.to_dict()
    session_id = share_data["session_id"]

    # Verify the underlying session still exists
    session_ref = _sessions_collection(services).document(session_id)
    try:
        session_snapshot = session_ref.get()
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        raise_session_dependency_error(exc)

    if not session_snapshot.exists:
        # Session was deleted — clean up the orphaned share
        try:
            share_ref.delete()
        except Exception:
            logger.warning(
                "Failed to clean up orphaned share %s", share_token
            )
        raise BrainstormShareNotFoundError()

    session_record = _session_record_from_snapshot(session_snapshot)

    # Load turns
    turns_doc_ref = (
        _sessions_collection(services)
        .document(session_id)
        .collection("turns")
        .document("latest")
    )
    try:
        turns_snapshot = turns_doc_ref.get()
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        raise_session_dependency_error(exc)

    turns: list[dict[str, Any]] = []
    if turns_snapshot.exists:
        turns = turns_snapshot.to_dict().get("turns", [])

    # Load artifact metadata
    artifacts_collection = (
        _sessions_collection(services)
        .document(session_id)
        .collection("artifacts")
    )
    try:
        artifact_snapshots = list(artifacts_collection.stream())
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        raise_session_dependency_error(exc)

    artifact_list = []
    for snap in artifact_snapshots:
        data = snap.to_dict()
        artifact_list.append(
            {
                "artifactId": data["artifact_id"],
                "filename": data["filename"],
                "mimeType": data["mime_type"],
                "sizeBytes": data.get("size_bytes"),
                "label": data.get("label"),
                "text": data.get("text"),
                "createdAt": data.get("created_at"),
            }
        )
    artifact_list.sort(key=lambda a: a.get("createdAt") or "")

    session_data = session_record.to_response_dict()
    session_data.pop("ownerUid", None)
    session_data.pop("ownerEmail", None)

    return {
        "session": session_data,
        "turns": turns,
        "artifacts": artifact_list,
    }


def download_public_artifact(
    services: BrainstormPersistenceServices,
    *,
    share_token: str,
    artifact_id: str,
) -> tuple[bytes, str, str]:
    """Download a single artifact via a public share token.

    Returns (content_bytes, mime_type, filename).
    """
    # Verify share token
    share_ref = _shares_collection(services).document(share_token)
    try:
        share_snapshot = share_ref.get()
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        raise_session_dependency_error(exc)

    if not share_snapshot.exists:
        raise BrainstormShareNotFoundError()

    share_data = share_snapshot.to_dict()
    session_id = share_data["session_id"]

    # Verify session still exists
    session_ref = _sessions_collection(services).document(session_id)
    try:
        session_snapshot = session_ref.get()
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        raise_session_dependency_error(exc)

    if not session_snapshot.exists:
        try:
            share_ref.delete()
        except Exception:
            logger.warning(
                "Failed to clean up orphaned share %s", share_token
            )
        raise BrainstormShareNotFoundError()

    # Load artifact metadata
    artifact_doc_ref = (
        _sessions_collection(services)
        .document(session_id)
        .collection("artifacts")
        .document(artifact_id)
    )
    try:
        artifact_snapshot = artifact_doc_ref.get()
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        raise_session_dependency_error(exc)

    if not artifact_snapshot.exists:
        raise BrainstormSessionNotFoundError(
            "That brainstorm artifact no longer exists."
        )

    data = artifact_snapshot.to_dict()
    blob_path = data["blob_path"]
    mime_type = data["mime_type"]
    filename = data["filename"]

    # Download from Cloud Storage
    bucket = services.storage_bucket
    blob = bucket.blob(blob_path)
    try:
        content_bytes = blob.download_as_bytes()
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        raise_session_dependency_error(exc)

    return content_bytes, mime_type, filename


def delete_shares_for_session(
    services: BrainstormPersistenceServices,
    *,
    session_id: str,
) -> int:
    """Delete all share records for a given session.

    Called as a cascade when the session itself is deleted.
    Returns the number of shares deleted.
    """
    try:
        share_snapshots = list(
            _shares_collection(services)
            .where("session_id", "==", session_id)
            .stream()
        )
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        raise_session_dependency_error(exc)

    count = 0
    for snap in share_snapshots:
        try:
            _shares_collection(services).document(snap.id).delete()
            count += 1
        except Exception:
            logger.warning("Failed to delete share %s during cascade", snap.id)

    return count
