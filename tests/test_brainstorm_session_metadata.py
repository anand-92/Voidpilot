"""Tests for brainstorm_type session metadata.

Covers: BrainstormSessionRecord brainstorm_type field, POST endpoint
acceptance of brainstorm_type, to_response_dict inclusion, legacy
session fallback, and GET endpoint returning brainstorm_type.
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi.testclient import TestClient

from src.app.main import app
from src.app.services.brainstorm_auth import BrainstormFirebaseUser


# ── Fakes (reused from test_brainstorm_session_library.py) ───────


@dataclass
class FakeDocumentSnapshot:
    id: str
    _data: dict | None

    @property
    def exists(self) -> bool:
        return self._data is not None

    def to_dict(self) -> dict:
        if self._data is None:
            raise RuntimeError("Missing document")
        return dict(self._data)


class FakeDocumentReference:
    def __init__(self, store: dict[str, dict], document_id: str):
        self._store = store
        self.id = document_id

    def get(self) -> FakeDocumentSnapshot:
        return FakeDocumentSnapshot(self.id, self._store.get(self.id))

    def set(self, value: dict, merge: bool = False) -> None:
        if merge and self.id in self._store:
            merged = dict(self._store[self.id])
            merged.update(value)
            self._store[self.id] = merged
        else:
            self._store[self.id] = dict(value)

    def delete(self) -> None:
        self._store.pop(self.id, None)


class FakeQuery:
    def __init__(
        self, store: dict[str, dict], field_name: str, expected_value: str
    ):
        self._store = store
        self._field_name = field_name
        self._expected_value = expected_value

    def stream(self) -> list[FakeDocumentSnapshot]:
        return [
            FakeDocumentSnapshot(doc_id, data)
            for doc_id, data in self._store.items()
            if data.get(self._field_name) == self._expected_value
        ]


class FakeCollectionReference:
    def __init__(self, store: dict[str, dict]):
        self._store = store

    def document(self, document_id: str) -> FakeDocumentReference:
        return FakeDocumentReference(self._store, document_id)

    def where(
        self, field_name: str, operator: str, value: str
    ) -> FakeQuery:
        assert operator == "=="
        return FakeQuery(self._store, field_name, value)


class FakeFirestoreClient:
    def __init__(self):
        self._collections: dict[str, dict[str, dict]] = {}

    def collection(self, name: str) -> FakeCollectionReference:
        store = self._collections.setdefault(name, {})
        return FakeCollectionReference(store)


def _make_user(
    uid: str = "user-1", email: str = "u@example.com"
) -> BrainstormFirebaseUser:
    return BrainstormFirebaseUser(
        uid=uid,
        email=email,
        name="Tester",
        picture=None,
        provider="password",
        claims={"uid": uid, "email": email},
    )


def _override_deps(fake_firestore: FakeFirestoreClient, user=None):
    from src.app.api.v1.endpoints import brainstorm
    from src.app.services import brainstorm_persistence

    app.dependency_overrides[
        brainstorm.require_brainstorm_user
    ] = lambda: (user or _make_user())
    app.dependency_overrides[
        brainstorm_persistence.get_brainstorm_persistence_services
    ] = lambda: brainstorm_persistence.BrainstormPersistenceServices(
        firestore_client=fake_firestore,
        storage_bucket=None,
        project_id="project-id",
        location="us-east1",
    )


def _clear_overrides():
    app.dependency_overrides.clear()


# ── Unit tests: BrainstormSessionRecord ──────────────────────────


class TestBrainstormSessionRecordBrainstormType:
    """VAL-SPARK-012: brainstorm_type field on session record."""

    def test_default_brainstorm_type_is_open_studio(self):
        from src.app.services.brainstorm_session_library import (
            BrainstormSessionRecord,
        )

        record = BrainstormSessionRecord(
            id="s1",
            owner_uid="u1",
            owner_email="u@x.com",
            owner_name="U",
            mode="persisted",
            title="T",
            created_at="2025-01-01",
            updated_at="2025-01-01",
        )
        assert record.brainstorm_type == "open_studio"

    def test_brainstorm_type_can_be_set_to_creative_spark(self):
        from src.app.services.brainstorm_session_library import (
            BrainstormSessionRecord,
        )

        record = BrainstormSessionRecord(
            id="s1",
            owner_uid="u1",
            owner_email="u@x.com",
            owner_name="U",
            mode="persisted",
            title="T",
            created_at="2025-01-01",
            updated_at="2025-01-01",
            brainstorm_type="creative_spark",
        )
        assert record.brainstorm_type == "creative_spark"

    def test_to_response_dict_includes_brainstorm_type(self):
        from src.app.services.brainstorm_session_library import (
            BrainstormSessionRecord,
        )

        record = BrainstormSessionRecord(
            id="s1",
            owner_uid="u1",
            owner_email="u@x.com",
            owner_name="U",
            mode="persisted",
            title="T",
            created_at="2025-01-01",
            updated_at="2025-01-01",
            brainstorm_type="creative_spark",
        )
        resp = record.to_response_dict()
        assert resp["brainstormType"] == "creative_spark"

    def test_to_response_dict_defaults_brainstorm_type(self):
        from src.app.services.brainstorm_session_library import (
            BrainstormSessionRecord,
        )

        record = BrainstormSessionRecord(
            id="s1",
            owner_uid="u1",
            owner_email="u@x.com",
            owner_name="U",
            mode="persisted",
            title="T",
            created_at="2025-01-01",
            updated_at="2025-01-01",
        )
        resp = record.to_response_dict()
        assert resp["brainstormType"] == "open_studio"


class TestSessionRecordFromSnapshotFallback:
    """VAL-SPARK-012: legacy sessions without brainstorm_type default
    to open_studio."""

    def test_legacy_document_defaults_to_open_studio(self):
        from src.app.services.brainstorm_session_library import (
            _session_record_from_snapshot,
        )

        snapshot = FakeDocumentSnapshot(
            "legacy-session",
            {
                "owner_uid": "u1",
                "owner_email": "u@x.com",
                "owner_name": "U",
                "mode": "persisted",
                "title": "Legacy",
                "created_at": "2025-01-01",
                "updated_at": "2025-01-01",
                # No brainstorm_type field — legacy document
            },
        )
        record = _session_record_from_snapshot(snapshot)
        assert record.brainstorm_type == "open_studio"

    def test_document_with_brainstorm_type_preserves_value(self):
        from src.app.services.brainstorm_session_library import (
            _session_record_from_snapshot,
        )

        snapshot = FakeDocumentSnapshot(
            "new-session",
            {
                "owner_uid": "u1",
                "owner_email": "u@x.com",
                "owner_name": "U",
                "mode": "persisted",
                "title": "New",
                "created_at": "2025-01-01",
                "updated_at": "2025-01-01",
                "brainstorm_type": "creative_spark",
            },
        )
        record = _session_record_from_snapshot(snapshot)
        assert record.brainstorm_type == "creative_spark"


# ── API tests: POST /brainstorm/sessions ─────────────────────────


class TestCreateSessionWithBrainstormType:
    """VAL-SPARK-013: POST /brainstorm/sessions accepts brainstorm_type."""

    def test_create_session_with_creative_spark(self):
        fake_fs = FakeFirestoreClient()
        _override_deps(fake_fs)
        client = TestClient(app)
        try:
            resp = client.post(
                "/api/v1/live/brainstorm/sessions",
                json={"brainstorm_type": "creative_spark"},
            )
        finally:
            _clear_overrides()

        assert resp.status_code == 201
        session = resp.json()["session"]
        assert session["brainstormType"] == "creative_spark"

    def test_create_session_with_open_studio(self):
        fake_fs = FakeFirestoreClient()
        _override_deps(fake_fs)
        client = TestClient(app)
        try:
            resp = client.post(
                "/api/v1/live/brainstorm/sessions",
                json={"brainstorm_type": "open_studio"},
            )
        finally:
            _clear_overrides()

        assert resp.status_code == 201
        session = resp.json()["session"]
        assert session["brainstormType"] == "open_studio"

    def test_create_session_defaults_to_open_studio_when_missing(self):
        fake_fs = FakeFirestoreClient()
        _override_deps(fake_fs)
        client = TestClient(app)
        try:
            resp = client.post("/api/v1/live/brainstorm/sessions")
        finally:
            _clear_overrides()

        assert resp.status_code == 201
        session = resp.json()["session"]
        assert session["brainstormType"] == "open_studio"

    def test_create_session_defaults_to_open_studio_with_empty_body(self):
        fake_fs = FakeFirestoreClient()
        _override_deps(fake_fs)
        client = TestClient(app)
        try:
            resp = client.post(
                "/api/v1/live/brainstorm/sessions",
                json={},
            )
        finally:
            _clear_overrides()

        assert resp.status_code == 201
        session = resp.json()["session"]
        assert session["brainstormType"] == "open_studio"


# ── API tests: GET /brainstorm/sessions/{id} ─────────────────────


class TestReopenSessionReturnsBrainstormType:
    """GET /brainstorm/sessions/{id} returns brainstorm_type."""

    def test_reopen_returns_brainstorm_type(self):
        fake_fs = FakeFirestoreClient()
        _override_deps(fake_fs)
        client = TestClient(app)
        try:
            create_resp = client.post(
                "/api/v1/live/brainstorm/sessions",
                json={"brainstorm_type": "creative_spark"},
            )
            session_id = create_resp.json()["session"]["id"]
            reopen_resp = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_id}"
            )
        finally:
            _clear_overrides()

        assert reopen_resp.status_code == 200
        session = reopen_resp.json()["session"]
        assert session["brainstormType"] == "creative_spark"

    def test_list_sessions_returns_brainstorm_type(self):
        fake_fs = FakeFirestoreClient()
        _override_deps(fake_fs)
        client = TestClient(app)
        try:
            client.post(
                "/api/v1/live/brainstorm/sessions",
                json={"brainstorm_type": "creative_spark"},
            )
            client.post(
                "/api/v1/live/brainstorm/sessions",
                json={"brainstorm_type": "open_studio"},
            )
            list_resp = client.get("/api/v1/live/brainstorm/sessions")
        finally:
            _clear_overrides()

        assert list_resp.status_code == 200
        sessions = list_resp.json()["sessions"]
        types = {s["brainstormType"] for s in sessions}
        assert types == {"creative_spark", "open_studio"}


# ── Firestore persistence: brainstorm_type stored in document ────


class TestBrainstormTypePersistedToFirestore:
    """Verify brainstorm_type is written to the Firestore document."""

    def test_brainstorm_type_stored_in_firestore_document(self):
        fake_fs = FakeFirestoreClient()
        _override_deps(fake_fs)
        client = TestClient(app)
        try:
            resp = client.post(
                "/api/v1/live/brainstorm/sessions",
                json={"brainstorm_type": "creative_spark"},
            )
        finally:
            _clear_overrides()

        session_id = resp.json()["session"]["id"]
        # Read directly from the fake Firestore store
        stored = fake_fs._collections["brainstorm_sessions"][session_id]
        assert stored["brainstorm_type"] == "creative_spark"

    def test_default_brainstorm_type_stored_in_firestore_document(self):
        fake_fs = FakeFirestoreClient()
        _override_deps(fake_fs)
        client = TestClient(app)
        try:
            resp = client.post("/api/v1/live/brainstorm/sessions")
        finally:
            _clear_overrides()

        session_id = resp.json()["session"]["id"]
        stored = fake_fs._collections["brainstorm_sessions"][session_id]
        assert stored["brainstorm_type"] == "open_studio"
