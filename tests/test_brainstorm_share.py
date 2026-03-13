"""Tests for brainstorm public share feature.

Covers:
- Share creation for signed-in persisted sessions only
- Public share resolution without auth
- Public artifact download without auth
- Share invalidation on session delete
- Owner-only share management
- Missing vs malformed auth distinction
"""

from __future__ import annotations

from dataclasses import dataclass

import pytest
from fastapi.testclient import TestClient

from src.app.main import app
from src.app.services.brainstorm_auth import BrainstormFirebaseUser


# ── Fake Firestore infrastructure ────────────────────────────────


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
    def __init__(
        self,
        store: dict[str, dict],
        document_id: str,
        *,
        global_stores: dict | None = None,
    ):
        self._store = store
        self.id = document_id
        self._global_stores = global_stores if global_stores is not None else {}

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

    def collection(self, subcollection_name: str) -> "FakeCollectionReference":
        sub_key = f"{self.id}/{subcollection_name}"
        sub_store: dict[str, dict] = self._global_stores.setdefault(sub_key, {})
        return FakeCollectionReference(sub_store, global_stores=self._global_stores)


class FakeQuery:
    def __init__(self, store: dict[str, dict], field_name: str, expected_value: str):
        self._store = store
        self._field_name = field_name
        self._expected_value = expected_value

    def stream(self) -> list[FakeDocumentSnapshot]:
        snapshots: list[FakeDocumentSnapshot] = []
        for document_id, value in self._store.items():
            if value.get(self._field_name) == self._expected_value:
                snapshots.append(FakeDocumentSnapshot(document_id, value))
        return snapshots


class FakeCollectionReference:
    def __init__(
        self,
        store: dict[str, dict],
        *,
        global_stores: dict | None = None,
    ):
        self._store = store
        self._global_stores = global_stores if global_stores is not None else {}

    def document(self, document_id: str) -> FakeDocumentReference:
        return FakeDocumentReference(
            self._store,
            document_id,
            global_stores=self._global_stores,
        )

    def stream(self) -> list[FakeDocumentSnapshot]:
        return [
            FakeDocumentSnapshot(doc_id, data)
            for doc_id, data in self._store.items()
        ]

    def where(self, field_name: str, operator: str, value: str) -> FakeQuery:
        assert operator == "=="
        return FakeQuery(self._store, field_name, value)


class FakeFirestoreClient:
    def __init__(self):
        self._collections: dict[str, dict[str, dict]] = {}
        self._global_stores: dict = {}

    def collection(self, collection_name: str) -> FakeCollectionReference:
        collection_store = self._collections.setdefault(collection_name, {})
        return FakeCollectionReference(
            collection_store,
            global_stores=self._global_stores,
        )


class FakeBlob:
    def __init__(self, bucket: "FakeStorageBucket", name: str):
        self._bucket = bucket
        self.name = name

    def upload_from_string(self, data: bytes, content_type: str = "") -> None:
        self._bucket._blobs[self.name] = data

    def download_as_bytes(self) -> bytes:
        if self.name not in self._bucket._blobs:
            raise RuntimeError(f"Blob {self.name} not found")
        return self._bucket._blobs[self.name]


class FakeStorageBucket:
    def __init__(self):
        self._blobs: dict[str, bytes] = {}

    def blob(self, name: str) -> FakeBlob:
        return FakeBlob(self, name)


# ── Helpers ──────────────────────────────────────────────────────


def make_user(uid: str, email: str) -> BrainstormFirebaseUser:
    return BrainstormFirebaseUser(
        uid=uid,
        email=email,
        name="Brainstorm Tester",
        picture=None,
        provider="password",
        claims={"uid": uid, "email": email},
    )


def _setup_overrides(
    *,
    user: BrainstormFirebaseUser | None = None,
    firestore_client: FakeFirestoreClient | None = None,
    storage_bucket: FakeStorageBucket | None = None,
    require_user_override=None,
):
    from src.app.api.v1.endpoints import brainstorm
    from src.app.services import brainstorm_persistence

    fs = firestore_client or FakeFirestoreClient()
    bucket = storage_bucket or FakeStorageBucket()

    if require_user_override:
        app.dependency_overrides[brainstorm.require_brainstorm_user] = (
            require_user_override
        )
    elif user:
        app.dependency_overrides[brainstorm.require_brainstorm_user] = lambda: user

    app.dependency_overrides[
        brainstorm_persistence.get_brainstorm_persistence_services
    ] = lambda: brainstorm_persistence.BrainstormPersistenceServices(
        firestore_client=fs,
        storage_bucket=bucket,
        project_id="project-id",
        location="us-east1",
    )

    return fs, bucket


def _clear_overrides():
    app.dependency_overrides.clear()


# ── Tests: Share creation ────────────────────────────────────────


class TestShareCreation:
    def test_create_share_for_persisted_session(self):
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        user = make_user("user-1", "user-1@example.com")
        _setup_overrides(user=user, firestore_client=fs, storage_bucket=bucket)
        client = TestClient(app)

        try:
            # Create a session first
            session_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = session_resp.json()["session"]["id"]

            # Create a share
            share_resp = client.post(
                f"/api/v1/live/brainstorm/sessions/{session_id}/share"
            )
        finally:
            _clear_overrides()

        assert share_resp.status_code == 200
        share = share_resp.json()["share"]
        assert share["sessionId"] == session_id
        assert share["shareToken"]
        assert share["createdAt"]

    def test_create_share_returns_same_token_on_repeat(self):
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        user = make_user("user-1", "user-1@example.com")
        _setup_overrides(user=user, firestore_client=fs, storage_bucket=bucket)
        client = TestClient(app)

        try:
            session_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = session_resp.json()["session"]["id"]

            share_resp_1 = client.post(
                f"/api/v1/live/brainstorm/sessions/{session_id}/share"
            )
            share_resp_2 = client.post(
                f"/api/v1/live/brainstorm/sessions/{session_id}/share"
            )
        finally:
            _clear_overrides()

        token_1 = share_resp_1.json()["share"]["shareToken"]
        token_2 = share_resp_2.json()["share"]["shareToken"]
        assert token_1 == token_2

    def test_create_share_rejects_non_owner(self):
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        current_user = {"value": make_user("user-1", "user-1@example.com")}
        _setup_overrides(
            firestore_client=fs,
            storage_bucket=bucket,
            require_user_override=lambda: current_user["value"],
        )
        client = TestClient(app)

        try:
            session_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = session_resp.json()["session"]["id"]

            current_user["value"] = make_user("user-2", "user-2@example.com")
            share_resp = client.post(
                f"/api/v1/live/brainstorm/sessions/{session_id}/share"
            )
        finally:
            _clear_overrides()

        assert share_resp.status_code == 403

    def test_create_share_rejects_nonexistent_session(self):
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        user = make_user("user-1", "user-1@example.com")
        _setup_overrides(user=user, firestore_client=fs, storage_bucket=bucket)
        client = TestClient(app)

        try:
            share_resp = client.post(
                "/api/v1/live/brainstorm/sessions/nonexistent/share"
            )
        finally:
            _clear_overrides()

        assert share_resp.status_code == 404


# ── Tests: Public share resolution ───────────────────────────────


class TestPublicShareResolution:
    def test_public_share_returns_session_data(self):
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        user = make_user("user-1", "user-1@example.com")
        _setup_overrides(user=user, firestore_client=fs, storage_bucket=bucket)
        client = TestClient(app)

        try:
            # Create session and share
            session_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = session_resp.json()["session"]["id"]
            share_resp = client.post(
                f"/api/v1/live/brainstorm/sessions/{session_id}/share"
            )
            share_token = share_resp.json()["share"]["shareToken"]

            # Save some turns
            client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/turns",
                json={"turns": [{"role": "user", "content": "hello"}]},
            )

            # Resolve the public share (no auth needed)
            _clear_overrides()
            _setup_overrides(firestore_client=fs, storage_bucket=bucket)
            public_resp = client.get(
                f"/api/v1/live/brainstorm/share/{share_token}"
            )
        finally:
            _clear_overrides()

        assert public_resp.status_code == 200
        data = public_resp.json()
        assert data["session"]["id"] == session_id
        assert "ownerUid" not in data["session"]
        assert "ownerEmail" not in data["session"]
        assert data["turns"] == [{"role": "user", "content": "hello"}]
        assert data["artifacts"] == []

    def test_public_share_with_artifacts(self):
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        user = make_user("user-1", "user-1@example.com")
        _setup_overrides(user=user, firestore_client=fs, storage_bucket=bucket)
        client = TestClient(app)

        try:
            session_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = session_resp.json()["session"]["id"]

            # Save an artifact
            client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts",
                json={
                    "filename": "test.md",
                    "content": "# Test",
                    "mimeType": "text/markdown",
                },
            )

            # Create share
            share_resp = client.post(
                f"/api/v1/live/brainstorm/sessions/{session_id}/share"
            )
            share_token = share_resp.json()["share"]["shareToken"]

            # Resolve public share
            public_resp = client.get(
                f"/api/v1/live/brainstorm/share/{share_token}"
            )
        finally:
            _clear_overrides()

        assert public_resp.status_code == 200
        data = public_resp.json()
        assert len(data["artifacts"]) == 1
        assert data["artifacts"][0]["filename"] == "test.md"

    def test_public_share_invalid_token_returns_404(self):
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        _setup_overrides(firestore_client=fs, storage_bucket=bucket)
        client = TestClient(app)

        try:
            public_resp = client.get(
                "/api/v1/live/brainstorm/share/nonexistent-token"
            )
        finally:
            _clear_overrides()

        assert public_resp.status_code == 404


# ── Tests: Public artifact download ──────────────────────────────


class TestPublicArtifactDownload:
    def test_public_artifact_download_succeeds(self):
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        user = make_user("user-1", "user-1@example.com")
        _setup_overrides(user=user, firestore_client=fs, storage_bucket=bucket)
        client = TestClient(app)

        try:
            session_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = session_resp.json()["session"]["id"]

            # Save an artifact
            save_resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts",
                json={
                    "filename": "notes.md",
                    "content": "# My Notes",
                    "mimeType": "text/markdown",
                },
            )
            artifact_id = save_resp.json()["artifact"]["artifactId"]

            # Create share
            share_resp = client.post(
                f"/api/v1/live/brainstorm/sessions/{session_id}/share"
            )
            share_token = share_resp.json()["share"]["shareToken"]

            # Download via public share
            download_resp = client.get(
                f"/api/v1/live/brainstorm/share/{share_token}"
                f"/artifacts/{artifact_id}/download"
            )
        finally:
            _clear_overrides()

        assert download_resp.status_code == 200
        assert download_resp.content == b"# My Notes"
        assert "notes.md" in download_resp.headers.get("content-disposition", "")

    def test_public_artifact_download_quotes_content_disposition_filename(self):
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        user = make_user("user-1", "user-1@example.com")
        _setup_overrides(user=user, firestore_client=fs, storage_bucket=bucket)
        client = TestClient(app)

        try:
            session_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = session_resp.json()["session"]["id"]

            save_resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts",
                json={
                    "filename": 'shared notes;".md',
                    "content": "# Shared Notes",
                    "mimeType": "text/markdown",
                },
            )
            artifact_id = save_resp.json()["artifact"]["artifactId"]

            share_resp = client.post(
                f"/api/v1/live/brainstorm/sessions/{session_id}/share"
            )
            share_token = share_resp.json()["share"]["shareToken"]

            download_resp = client.get(
                f"/api/v1/live/brainstorm/share/{share_token}"
                f"/artifacts/{artifact_id}/download"
            )
        finally:
            _clear_overrides()

        assert download_resp.status_code == 200
        assert (
            download_resp.headers["content-disposition"]
            == "attachment; filename*=UTF-8''shared%20notes%3B%22.md"
        )

    def test_public_artifact_download_invalid_share_returns_404(self):
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        _setup_overrides(firestore_client=fs, storage_bucket=bucket)
        client = TestClient(app)

        try:
            download_resp = client.get(
                "/api/v1/live/brainstorm/share/bad-token"
                "/artifacts/some-artifact/download"
            )
        finally:
            _clear_overrides()

        assert download_resp.status_code == 404


# ── Tests: Share invalidation on session delete ──────────────────


class TestShareInvalidationOnDelete:
    def test_delete_session_invalidates_share(self):
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        user = make_user("user-1", "user-1@example.com")
        _setup_overrides(user=user, firestore_client=fs, storage_bucket=bucket)
        client = TestClient(app)

        try:
            # Create session and share
            session_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = session_resp.json()["session"]["id"]
            share_resp = client.post(
                f"/api/v1/live/brainstorm/sessions/{session_id}/share"
            )
            share_token = share_resp.json()["share"]["shareToken"]

            # Verify share works
            public_resp = client.get(
                f"/api/v1/live/brainstorm/share/{share_token}"
            )
            assert public_resp.status_code == 200

            # Delete the session
            delete_resp = client.delete(
                f"/api/v1/live/brainstorm/sessions/{session_id}"
            )
            assert delete_resp.status_code == 204

            # Share should now be invalid
            public_resp_after = client.get(
                f"/api/v1/live/brainstorm/share/{share_token}"
            )
        finally:
            _clear_overrides()

        assert public_resp_after.status_code == 404

    def test_delete_session_invalidates_public_artifact_downloads(self):
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        user = make_user("user-1", "user-1@example.com")
        _setup_overrides(user=user, firestore_client=fs, storage_bucket=bucket)
        client = TestClient(app)

        try:
            session_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = session_resp.json()["session"]["id"]

            save_resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts",
                json={
                    "filename": "notes.md",
                    "content": "# My Notes",
                    "mimeType": "text/markdown",
                },
            )
            artifact_id = save_resp.json()["artifact"]["artifactId"]

            share_resp = client.post(
                f"/api/v1/live/brainstorm/sessions/{session_id}/share"
            )
            share_token = share_resp.json()["share"]["shareToken"]

            # Verify download works before delete
            download_before = client.get(
                f"/api/v1/live/brainstorm/share/{share_token}"
                f"/artifacts/{artifact_id}/download"
            )
            assert download_before.status_code == 200

            # Delete the session
            client.delete(f"/api/v1/live/brainstorm/sessions/{session_id}")

            # Download should fail after delete
            download_after = client.get(
                f"/api/v1/live/brainstorm/share/{share_token}"
                f"/artifacts/{artifact_id}/download"
            )
        finally:
            _clear_overrides()

        assert download_after.status_code == 404


# ── Tests: Owner-only privacy ────────────────────────────────────


class TestOwnerOnlyPrivacy:
    @pytest.mark.parametrize(
        ("method", "path_suffix"),
        [
            ("get", "/brainstorm/sessions"),
            ("post", "/brainstorm/sessions"),
            ("get", "/brainstorm/sessions/session-123"),
            ("delete", "/brainstorm/sessions/session-123"),
            ("get", "/brainstorm/sessions/session-123/turns"),
            ("put", "/brainstorm/sessions/session-123/turns"),
            ("get", "/brainstorm/sessions/session-123/artifacts"),
            (
                "get",
                "/brainstorm/sessions/session-123/artifacts/art-1/download",
            ),
            ("post", "/brainstorm/sessions/session-123/share"),
        ],
    )
    def test_private_endpoints_reject_missing_auth(
        self, method: str, path_suffix: str
    ):
        """Private endpoints must reject requests with no Authorization header."""
        client = TestClient(app, raise_server_exceptions=False)

        # Don't override require_brainstorm_user — let real auth run
        # We need to override persistence though, otherwise we get Firebase init errors
        from src.app.services import brainstorm_persistence

        app.dependency_overrides[
            brainstorm_persistence.get_brainstorm_persistence_services
        ] = lambda: brainstorm_persistence.BrainstormPersistenceServices(
            firestore_client=FakeFirestoreClient(),
            storage_bucket=FakeStorageBucket(),
            project_id="project-id",
            location="us-east1",
        )

        try:
            path = f"/api/v1/live{path_suffix}"
            kwargs: dict = {}
            if method == "put":
                kwargs["json"] = {"turns": []}
            response = getattr(client, method)(path, **kwargs)
        finally:
            _clear_overrides()

        # These should return 401 (missing auth) not 200 or 500
        assert response.status_code == 401

    def test_public_share_does_not_require_auth(self):
        """The public share resolution endpoint must work without auth."""
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        user = make_user("user-1", "user-1@example.com")
        _setup_overrides(user=user, firestore_client=fs, storage_bucket=bucket)
        client = TestClient(app)

        try:
            session_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = session_resp.json()["session"]["id"]
            share_resp = client.post(
                f"/api/v1/live/brainstorm/sessions/{session_id}/share"
            )
            share_token = share_resp.json()["share"]["shareToken"]

            # Clear auth overrides and call public endpoint
            _clear_overrides()
            _setup_overrides(firestore_client=fs, storage_bucket=bucket)

            public_resp = client.get(
                f"/api/v1/live/brainstorm/share/{share_token}"
            )
        finally:
            _clear_overrides()

        assert public_resp.status_code == 200

    def test_public_share_rejects_malformed_auth(self):
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        user = make_user("user-1", "user-1@example.com")
        _setup_overrides(user=user, firestore_client=fs, storage_bucket=bucket)
        client = TestClient(app)

        try:
            session_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = session_resp.json()["session"]["id"]
            share_resp = client.post(
                f"/api/v1/live/brainstorm/sessions/{session_id}/share"
            )
            share_token = share_resp.json()["share"]["shareToken"]

            _clear_overrides()
            _setup_overrides(firestore_client=fs, storage_bucket=bucket)

            public_resp = client.get(
                f"/api/v1/live/brainstorm/share/{share_token}",
                headers={"Authorization": "Basic nope"},
            )
        finally:
            _clear_overrides()

        assert public_resp.status_code == 401

    def test_public_share_rejects_empty_bearer_auth(self):
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        user = make_user("user-1", "user-1@example.com")
        _setup_overrides(user=user, firestore_client=fs, storage_bucket=bucket)
        client = TestClient(app)

        try:
            session_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = session_resp.json()["session"]["id"]
            share_resp = client.post(
                f"/api/v1/live/brainstorm/sessions/{session_id}/share"
            )
            share_token = share_resp.json()["share"]["shareToken"]

            _clear_overrides()
            _setup_overrides(firestore_client=fs, storage_bucket=bucket)

            public_resp = client.get(
                f"/api/v1/live/brainstorm/share/{share_token}",
                headers={"Authorization": "Bearer "},
            )
        finally:
            _clear_overrides()

        assert public_resp.status_code == 401

    def test_public_artifact_download_rejects_malformed_auth(self):
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        user = make_user("user-1", "user-1@example.com")
        _setup_overrides(user=user, firestore_client=fs, storage_bucket=bucket)
        client = TestClient(app)

        try:
            session_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = session_resp.json()["session"]["id"]

            save_resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts",
                json={
                    "filename": "notes.md",
                    "content": "# My Notes",
                    "mimeType": "text/markdown",
                },
            )
            artifact_id = save_resp.json()["artifact"]["artifactId"]

            share_resp = client.post(
                f"/api/v1/live/brainstorm/sessions/{session_id}/share"
            )
            share_token = share_resp.json()["share"]["shareToken"]

            _clear_overrides()
            _setup_overrides(firestore_client=fs, storage_bucket=bucket)

            download_resp = client.get(
                f"/api/v1/live/brainstorm/share/{share_token}"
                f"/artifacts/{artifact_id}/download",
                headers={"Authorization": "Basic nope"},
            )
        finally:
            _clear_overrides()

        assert download_resp.status_code == 401

    def test_public_artifact_download_rejects_empty_bearer_auth(self):
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        user = make_user("user-1", "user-1@example.com")
        _setup_overrides(user=user, firestore_client=fs, storage_bucket=bucket)
        client = TestClient(app)

        try:
            session_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = session_resp.json()["session"]["id"]

            save_resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts",
                json={
                    "filename": "notes.md",
                    "content": "# My Notes",
                    "mimeType": "text/markdown",
                },
            )
            artifact_id = save_resp.json()["artifact"]["artifactId"]

            share_resp = client.post(
                f"/api/v1/live/brainstorm/sessions/{session_id}/share"
            )
            share_token = share_resp.json()["share"]["shareToken"]

            _clear_overrides()
            _setup_overrides(firestore_client=fs, storage_bucket=bucket)

            download_resp = client.get(
                f"/api/v1/live/brainstorm/share/{share_token}"
                f"/artifacts/{artifact_id}/download",
                headers={"Authorization": "Bearer "},
            )
        finally:
            _clear_overrides()

        assert download_resp.status_code == 401


# ── Tests: Share reflects latest session state ───────────────────


class TestShareReflectsLatestState:
    def test_share_reflects_updated_turns(self):
        fs = FakeFirestoreClient()
        bucket = FakeStorageBucket()
        user = make_user("user-1", "user-1@example.com")
        _setup_overrides(user=user, firestore_client=fs, storage_bucket=bucket)
        client = TestClient(app)

        try:
            # Create session and share
            session_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = session_resp.json()["session"]["id"]
            share_resp = client.post(
                f"/api/v1/live/brainstorm/sessions/{session_id}/share"
            )
            share_token = share_resp.json()["share"]["shareToken"]

            # Save initial turns
            client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/turns",
                json={"turns": [{"role": "user", "content": "first"}]},
            )

            public_resp_1 = client.get(
                f"/api/v1/live/brainstorm/share/{share_token}"
            )
            assert len(public_resp_1.json()["turns"]) == 1

            # Update turns
            client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/turns",
                json={
                    "turns": [
                        {"role": "user", "content": "first"},
                        {"role": "gemini", "content": "response"},
                    ]
                },
            )

            # Same share token should now show updated content
            public_resp_2 = client.get(
                f"/api/v1/live/brainstorm/share/{share_token}"
            )
        finally:
            _clear_overrides()

        assert len(public_resp_2.json()["turns"]) == 2
        assert public_resp_2.json()["turns"][1]["content"] == "response"
