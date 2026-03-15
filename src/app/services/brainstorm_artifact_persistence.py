"""Brainstorm artifact persistence service.

Handles saving and restoring artifact blobs and metadata for signed-in
brainstorm sessions. Artifact content is stored in Cloud Storage while
metadata lives in Firestore alongside the session record.

Delayed tool completions (artifacts that arrive after a conversational turn
boundary) are persisted to the originating session by always binding the
save to an explicit session_id rather than whatever session the frontend
currently has open.
"""

from __future__ import annotations

import base64
import logging
from typing import Any
from uuid import uuid4

from google.api_core import exceptions as google_api_exceptions
from google.auth.exceptions import DefaultCredentialsError

from src.app.services.brainstorm_persistence import (
    BrainstormPersistenceServices,
    build_brainstorm_artifact_blob_path,
)
from src.app.services.brainstorm_persistence_utils import (
    now_timestamp,
    raise_session_dependency_error,
)
from src.app.services.brainstorm_session_library import (
    BRAINSTORM_SESSION_COLLECTION,
    BrainstormSessionAccessDeniedError,
    BrainstormSessionNotFoundError,
)
from src.app.services.firebase_admin import BrainstormFirebaseConfigurationError

logger = logging.getLogger(__name__)

BRAINSTORM_ARTIFACTS_SUBCOLLECTION = "artifacts"


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
        raise_session_dependency_error(exc)

    if not snapshot.exists:
        raise BrainstormSessionNotFoundError()

    data = snapshot.to_dict()
    if data.get("owner_uid") != owner_uid:
        raise BrainstormSessionAccessDeniedError()

    return data


def _upload_artifact_blob(
    services: BrainstormPersistenceServices,
    *,
    blob_path: str,
    content_bytes: bytes,
    content_type: str,
) -> None:
    """Upload artifact content to Cloud Storage."""
    bucket = services.storage_bucket
    blob = bucket.blob(blob_path)
    blob.upload_from_string(content_bytes, content_type=content_type)


def _download_artifact_blob(
    services: BrainstormPersistenceServices,
    *,
    blob_path: str,
) -> bytes:
    """Download artifact content from Cloud Storage."""
    bucket = services.storage_bucket
    blob = bucket.blob(blob_path)
    return blob.download_as_bytes()


def save_brainstorm_artifact(
    services: BrainstormPersistenceServices,
    *,
    session_id: str,
    owner_uid: str,
    filename: str,
    content: str,
    mime_type: str,
    label: str | None = None,
    text: str | None = None,
 ) -> dict[str, str | int | None]:
    """Persist a brainstorm artifact (metadata + blob) for a signed-in session.

    Artifacts are always bound to an explicit session_id so that delayed
    completions persist to the originating session even if the user has
    switched to a different session in the frontend.

    Returns camelCase metadata suitable for JSON responses.
    """
    _verify_session_ownership(services, session_id=session_id, owner_uid=owner_uid)

    artifact_id = uuid4().hex
    now = now_timestamp()

    # Decode content: base64 for binary (images, video), raw string for text
    is_binary = mime_type.startswith("image/") or mime_type.startswith("video/")
    if is_binary:
        try:
            content_bytes = base64.b64decode(content)
        except Exception:
            content_bytes = content.encode("utf-8")
    else:
        content_bytes = content.encode("utf-8")

    # Upload blob to Cloud Storage
    blob_path = build_brainstorm_artifact_blob_path(
        session_id=session_id,
        artifact_id=artifact_id,
        filename=filename,
    )

    try:
        _upload_artifact_blob(
            services,
            blob_path=blob_path,
            content_bytes=content_bytes,
            content_type=mime_type,
        )
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        raise_session_dependency_error(exc)

    # Save metadata to Firestore
    artifact_metadata = {
        "artifact_id": artifact_id,
        "filename": filename,
        "mime_type": mime_type,
        "blob_path": blob_path,
        "size_bytes": len(content_bytes),
        "label": label,
        "text": text,
        "created_at": now,
    }

    artifacts_doc_ref = (
        _sessions_collection(services)
        .document(session_id)
        .collection(BRAINSTORM_ARTIFACTS_SUBCOLLECTION)
        .document(artifact_id)
    )

    try:
        artifacts_doc_ref.set(artifact_metadata)

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
        raise_session_dependency_error(exc)

    return {
        "artifactId": artifact_id,
        "filename": filename,
        "mimeType": mime_type,
        "sizeBytes": len(content_bytes),
        "label": label,
        "text": text,
        "createdAt": now,
    }


def load_brainstorm_artifacts(
    services: BrainstormPersistenceServices,
    *,
    session_id: str,
    owner_uid: str,
 ) -> list[dict[str, str | int | None]]:
    """Load all artifact metadata for a signed-in brainstorm session.

    Returns a list of camelCase metadata dicts. The actual content must
    be fetched separately via the download endpoint.
    """
    _verify_session_ownership(services, session_id=session_id, owner_uid=owner_uid)

    artifacts_collection = (
        _sessions_collection(services)
        .document(session_id)
        .collection(BRAINSTORM_ARTIFACTS_SUBCOLLECTION)
    )

    try:
        snapshots = list(artifacts_collection.stream())
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        raise_session_dependency_error(exc)

    result = []
    for snapshot in snapshots:
        data = snapshot.to_dict()
        result.append(
            {
                "artifactId": data["artifact_id"],
                "filename": data["filename"],
                "mimeType": data["mime_type"],
                "blobPath": data["blob_path"],
                "sizeBytes": data.get("size_bytes"),
                "label": data.get("label"),
                "text": data.get("text"),
                "createdAt": data.get("created_at"),
            }
        )

    # Sort by creation time (oldest first, to preserve artifact order)
    result.sort(key=lambda a: a.get("createdAt") or "")

    return result


def download_brainstorm_artifact(
    services: BrainstormPersistenceServices,
    *,
    session_id: str,
    owner_uid: str,
    artifact_id: str,
) -> tuple[bytes, str, str]:
    """Download a single artifact's content bytes.

    Returns (content_bytes, mime_type, filename).
    """
    _verify_session_ownership(services, session_id=session_id, owner_uid=owner_uid)

    artifact_doc_ref = (
        _sessions_collection(services)
        .document(session_id)
        .collection(BRAINSTORM_ARTIFACTS_SUBCOLLECTION)
        .document(artifact_id)
    )

    try:
        snapshot = artifact_doc_ref.get()
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        raise_session_dependency_error(exc)

    if not snapshot.exists:
        raise BrainstormSessionNotFoundError(
            "That brainstorm artifact no longer exists."
        )

    data = snapshot.to_dict()
    blob_path = data["blob_path"]
    mime_type = data["mime_type"]
    filename = data["filename"]

    try:
        content_bytes = _download_artifact_blob(services, blob_path=blob_path)
    except (
        BrainstormFirebaseConfigurationError,
        DefaultCredentialsError,
        google_api_exceptions.GoogleAPICallError,
    ) as exc:
        raise_session_dependency_error(exc)

    return content_bytes, mime_type, filename


_IMAGE_VIDEO_PREFIXES = ("image/", "video/")


def get_thumbnail_artifact_ids(
    services: BrainstormPersistenceServices,
    *,
    session_ids: list[str],
) -> dict[str, str]:
    """Return a mapping of session_id -> first image/video artifact_id.

    Queries the artifacts subcollection for each session and picks the
    most recently created image or video artifact. Sessions with no
    image/video artifacts are omitted from the result.
    """
    result: dict[str, str] = {}

    for sid in session_ids:
        artifacts_collection = (
            _sessions_collection(services)
            .document(sid)
            .collection(BRAINSTORM_ARTIFACTS_SUBCOLLECTION)
        )
        try:
            snapshots = list(artifacts_collection.stream())
        except (
            BrainstormFirebaseConfigurationError,
            DefaultCredentialsError,
            google_api_exceptions.GoogleAPICallError,
        ) as exc:
            logger.warning("Failed to load artifacts for session %s: %s", sid, exc)
            continue

        candidates = []
        for snap in snapshots:
            data = snap.to_dict()
            mime = data.get("mime_type", "")
            if any(mime.startswith(prefix) for prefix in _IMAGE_VIDEO_PREFIXES):
                candidates.append(data)

        if candidates:
            candidates.sort(key=lambda a: a.get("created_at") or "", reverse=True)
            result[sid] = candidates[0]["artifact_id"]

    return result
