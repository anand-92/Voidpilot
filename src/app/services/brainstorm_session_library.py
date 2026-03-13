from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import HTTPException, status

from src.app.services.brainstorm_auth import BrainstormFirebaseUser
from src.app.services.brainstorm_persistence import BrainstormPersistenceServices

BRAINSTORM_SESSION_COLLECTION = "brainstorm_sessions"
DEFAULT_BRAINSTORM_SESSION_TITLE = "Untitled session"


@dataclass(frozen=True)
class BrainstormSessionRecord:
    id: str
    owner_uid: str
    owner_email: str | None
    owner_name: str | None
    mode: str
    title: str
    created_at: str
    updated_at: str

    def to_response_dict(self) -> dict[str, str | None]:
        payload = asdict(self)
        return {
            "id": payload["id"],
            "ownerUid": payload["owner_uid"],
            "ownerEmail": payload["owner_email"],
            "ownerName": payload["owner_name"],
            "mode": payload["mode"],
            "title": payload["title"],
            "createdAt": payload["created_at"],
            "updatedAt": payload["updated_at"],
        }


class BrainstormSessionError(RuntimeError):
    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "brainstorm_session_error"
    default_message = "Brainstorm session request failed."

    def __init__(self, message: str | None = None):
        super().__init__(message or self.default_message)

    def to_http_exception(self) -> HTTPException:
        return HTTPException(
            status_code=self.status_code,
            detail={"code": self.error_code, "message": str(self)},
        )


class BrainstormSessionNotFoundError(BrainstormSessionError):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "brainstorm_session_not_found"
    default_message = "That brainstorm session no longer exists."


class BrainstormSessionAccessDeniedError(BrainstormSessionError):
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "brainstorm_session_forbidden"
    default_message = "You do not have access to that brainstorm session."


def _sessions_collection(services: BrainstormPersistenceServices):
    return services.firestore_client.collection(BRAINSTORM_SESSION_COLLECTION)


def _now_timestamp() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _session_record_from_snapshot(document_snapshot) -> BrainstormSessionRecord:
    payload = document_snapshot.to_dict()
    return BrainstormSessionRecord(
        id=document_snapshot.id,
        owner_uid=payload["owner_uid"],
        owner_email=payload.get("owner_email"),
        owner_name=payload.get("owner_name"),
        mode=payload.get("mode", "persisted"),
        title=payload.get("title") or DEFAULT_BRAINSTORM_SESSION_TITLE,
        created_at=payload["created_at"],
        updated_at=payload["updated_at"],
    )


def list_brainstorm_sessions_for_user(
    services: BrainstormPersistenceServices,
    *,
    owner_uid: str,
) -> list[BrainstormSessionRecord]:
    snapshots = (
        _sessions_collection(services)
        .where("owner_uid", "==", owner_uid)
        .stream()
    )
    sessions = [_session_record_from_snapshot(snapshot) for snapshot in snapshots]
    return sorted(sessions, key=lambda session: session.updated_at, reverse=True)


def create_brainstorm_session(
    services: BrainstormPersistenceServices,
    *,
    user: BrainstormFirebaseUser,
) -> BrainstormSessionRecord:
    session_id = uuid4().hex
    now = _now_timestamp()
    session_record = BrainstormSessionRecord(
        id=session_id,
        owner_uid=user.uid,
        owner_email=user.email,
        owner_name=user.name,
        mode="persisted",
        title=DEFAULT_BRAINSTORM_SESSION_TITLE,
        created_at=now,
        updated_at=now,
    )
    _sessions_collection(services).document(session_id).set(
        {
            "owner_uid": session_record.owner_uid,
            "owner_email": session_record.owner_email,
            "owner_name": session_record.owner_name,
            "mode": session_record.mode,
            "title": session_record.title,
            "created_at": session_record.created_at,
            "updated_at": session_record.updated_at,
        }
    )
    return session_record


def get_brainstorm_session_for_user(
    services: BrainstormPersistenceServices,
    *,
    owner_uid: str,
    session_id: str,
) -> BrainstormSessionRecord:
    document_reference = _sessions_collection(services).document(session_id)
    snapshot = document_reference.get()
    if not snapshot.exists:
        raise BrainstormSessionNotFoundError()

    session_record = _session_record_from_snapshot(snapshot)
    if session_record.owner_uid != owner_uid:
        raise BrainstormSessionAccessDeniedError()

    return session_record


def delete_brainstorm_session_for_user(
    services: BrainstormPersistenceServices,
    *,
    owner_uid: str,
    session_id: str,
) -> None:
    document_reference = _sessions_collection(services).document(session_id)
    snapshot = document_reference.get()
    if not snapshot.exists:
        raise BrainstormSessionNotFoundError()

    session_record = _session_record_from_snapshot(snapshot)
    if session_record.owner_uid != owner_uid:
        raise BrainstormSessionAccessDeniedError()

    document_reference.delete()
