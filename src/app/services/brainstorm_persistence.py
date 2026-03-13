from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Any

from firebase_admin import firestore, storage

from src.app.core.config import settings
from src.app.services.firebase_admin import (
    BrainstormFirebaseConfigurationError,
    get_configured_firebase_project_id,
    get_configured_firebase_storage_bucket,
    get_firebase_admin_app,
)

BRAINSTORM_STORAGE_PREFIX = "brainstorm/sessions"


@dataclass(frozen=True)
class BrainstormPersistenceServices:
    """Reusable Firebase-backed services for brainstorm persistence flows."""

    firestore_client: Any
    storage_bucket: Any
    project_id: str
    location: str


def get_brainstorm_firestore_client():
    """Return the Firestore client bound to the brainstorm Firebase app."""
    return firestore.client(app=get_firebase_admin_app())


def get_brainstorm_storage_bucket(bucket_name: str | None = None):
    """Return the Cloud Storage bucket used for brainstorm artifacts."""
    resolved_bucket_name = bucket_name or get_configured_firebase_storage_bucket()
    if not resolved_bucket_name:
        raise BrainstormFirebaseConfigurationError(
            "FIREBASE_STORAGE_BUCKET must be configured before brainstorm "
            "Firebase services are used."
        )

    return storage.bucket(
        name=resolved_bucket_name,
        app=get_firebase_admin_app(),
    )


def get_brainstorm_persistence_services() -> BrainstormPersistenceServices:
    """Return the Firebase service bundle for brainstorm persistence work."""
    return BrainstormPersistenceServices(
        firestore_client=get_brainstorm_firestore_client(),
        storage_bucket=get_brainstorm_storage_bucket(),
        project_id=get_configured_firebase_project_id(),
        location=settings.FIREBASE_LOCATION,
    )


def build_brainstorm_artifact_blob_path(
    session_id: str,
    artifact_id: str,
    filename: str,
) -> str:
    """Build a stable Cloud Storage path for a brainstorm artifact."""
    safe_filename = PurePosixPath(filename).name or "artifact"
    return (
        f"{BRAINSTORM_STORAGE_PREFIX}/{session_id}/"
        f"artifacts/{artifact_id}/{safe_filename}"
    )
