"""Tests for brainstorm artifact persistence and session isolation.

Covers:
- VAL-SESSION-009: Delayed artifact completions persist to the correct session
- VAL-SESSION-010: Reopened sessions restore real artifact files, not just metadata
- VAL-CROSS-006: Switching sessions preserves session isolation for artifacts
"""

from __future__ import annotations

import base64

from fastapi.testclient import TestClient

from src.app.main import app
from src.app.services.brainstorm_auth import BrainstormFirebaseUser
from src.app.services.brainstorm_persistence import BrainstormPersistenceServices
from tests.test_brainstorm_session_library import (
    FakeFirestoreClient,
)


class FakeBlob:
    """Minimal fake for a Cloud Storage blob."""

    def __init__(self, name: str, bucket: FakeStorageBucket):
        self.name = name
        self._bucket = bucket

    def upload_from_string(self, data: bytes, content_type: str = "") -> None:
        self._bucket._blobs[self.name] = {
            "data": data,
            "content_type": content_type,
        }

    def download_as_bytes(self) -> bytes:
        stored = self._bucket._blobs.get(self.name)
        if stored is None:
            from google.api_core import exceptions as google_exceptions

            raise google_exceptions.NotFound(f"Blob {self.name} not found")
        return stored["data"]


class FakeStorageBucket:
    """Minimal fake for a Cloud Storage bucket."""

    def __init__(self):
        self._blobs: dict[str, dict] = {}

    def blob(self, path: str) -> FakeBlob:
        return FakeBlob(path, self)


def _make_user(uid: str = "user-1", email: str = "user-1@example.com"):
    return BrainstormFirebaseUser(
        uid=uid,
        email=email,
        name="Tester",
        picture=None,
        provider="password",
        claims={"uid": uid, "email": email},
    )


def _make_services(firestore_client=None, storage_bucket=None):
    return BrainstormPersistenceServices(
        firestore_client=firestore_client or FakeFirestoreClient(),
        storage_bucket=storage_bucket or FakeStorageBucket(),
        project_id="project-id",
        location="us-east1",
    )


def _setup_overrides(user=None, services=None):
    from src.app.api.v1.endpoints import brainstorm
    from src.app.services import brainstorm_persistence

    app.dependency_overrides[brainstorm.require_brainstorm_user] = (
        lambda: user or _make_user()
    )
    app.dependency_overrides[
        brainstorm_persistence.get_brainstorm_persistence_services
    ] = lambda: services or _make_services()


def _clear_overrides():
    app.dependency_overrides.clear()


def _create_session(client: TestClient) -> str:
    """Create a brainstorm session and return its id."""
    resp = client.post("/api/v1/live/brainstorm/sessions")
    assert resp.status_code == 201
    return resp.json()["session"]["id"]


class TestSaveArtifact:
    """VAL-SESSION-009/010: Artifact persistence basics."""

    def test_save_artifact_requires_mime_type(self):
        fake_firestore = FakeFirestoreClient()
        fake_storage = FakeStorageBucket()
        services = _make_services(fake_firestore, fake_storage)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            session_id = _create_session(client)

            resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts",
                json={
                    "filename": "brainstorm_notes.md",
                    "content": "# My Brainstorm Notes\n\nSome ideas here.",
                },
            )
            assert resp.status_code == 422
        finally:
            _clear_overrides()

    def test_save_text_artifact(self):
        fake_firestore = FakeFirestoreClient()
        fake_storage = FakeStorageBucket()
        services = _make_services(fake_firestore, fake_storage)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            session_id = _create_session(client)

            resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts",
                json={
                    "filename": "brainstorm_notes.md",
                    "content": "# My Brainstorm Notes\n\nSome ideas here.",
                    "mimeType": "text/markdown",
                },
            )
            assert resp.status_code == 200
            body = resp.json()
            assert body["artifact"]["filename"] == "brainstorm_notes.md"
            assert body["artifact"]["mimeType"] == "text/markdown"
            assert body["artifact"]["artifactId"]
        finally:
            _clear_overrides()

    def test_save_image_artifact_with_base64(self):
        fake_firestore = FakeFirestoreClient()
        fake_storage = FakeStorageBucket()
        services = _make_services(fake_firestore, fake_storage)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            session_id = _create_session(client)

            # Simulate a small PNG-like payload
            image_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 50
            b64_content = base64.b64encode(image_bytes).decode("utf-8")

            resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts",
                json={
                    "filename": "diagram.png",
                    "content": b64_content,
                    "mimeType": "image/png",
                    "label": "Architecture Diagram",
                },
            )
            assert resp.status_code == 200
            body = resp.json()
            assert body["artifact"]["filename"] == "diagram.png"
            assert body["artifact"]["mimeType"] == "image/png"
            assert body["artifact"]["label"] == "Architecture Diagram"

            # Verify blob was stored in Cloud Storage
            stored_blobs = list(fake_storage._blobs)
            assert len(stored_blobs) == 1
            assert session_id in stored_blobs[0]
        finally:
            _clear_overrides()

    def test_save_media_artifact_updates_session_thumbnail_metadata(self):
        fake_firestore = FakeFirestoreClient()
        fake_storage = FakeStorageBucket()
        services = _make_services(fake_firestore, fake_storage)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            session_id = _create_session(client)
            image_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 50
            b64_content = base64.b64encode(image_bytes).decode("utf-8")

            resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts",
                json={
                    "filename": "diagram.png",
                    "content": b64_content,
                    "mimeType": "image/png",
                },
            )
            assert resp.status_code == 200

            session_doc = fake_firestore._collections["brainstorm_sessions"][
                session_id
            ]
            assert (
                session_doc["thumbnail_artifact_id"]
                == resp.json()["artifact"]["artifactId"]
            )
            assert session_doc["thumbnail_mime_type"] == "image/png"
        finally:
            _clear_overrides()

    def test_save_artifact_preserves_interleaved_text(self):
        """Text metadata from image generation is preserved."""
        fake_firestore = FakeFirestoreClient()
        fake_storage = FakeStorageBucket()
        services = _make_services(fake_firestore, fake_storage)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            session_id = _create_session(client)

            resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts",
                json={
                    "filename": "sketch.png",
                    "content": base64.b64encode(b"fake-image").decode(),
                    "mimeType": "image/png",
                    "label": "UI Sketch",
                    "text": "Here's a sketch of the proposed UI layout.",
                },
            )
            assert resp.status_code == 200
            assert resp.json()["artifact"]["text"] == (
                "Here's a sketch of the proposed UI layout."
            )
        finally:
            _clear_overrides()

    def test_save_artifact_rejects_nonexistent_session(self):
        services = _make_services()
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            resp = client.put(
                "/api/v1/live/brainstorm/sessions/nonexistent-id/artifacts",
                json={
                    "filename": "test.md",
                    "content": "hello",
                    "mimeType": "text/markdown",
                },
            )
            assert resp.status_code == 404
        finally:
            _clear_overrides()

    def test_save_artifact_rejects_non_owner(self):
        fake_firestore = FakeFirestoreClient()
        fake_storage = FakeStorageBucket()
        services = _make_services(fake_firestore, fake_storage)
        client = TestClient(app)

        from src.app.api.v1.endpoints import brainstorm
        from src.app.services import brainstorm_persistence

        current_user = {"value": _make_user("user-1")}
        app.dependency_overrides[brainstorm.require_brainstorm_user] = (
            lambda: current_user["value"]
        )
        app.dependency_overrides[
            brainstorm_persistence.get_brainstorm_persistence_services
        ] = lambda: services

        try:
            session_id = _create_session(client)

            # Switch to user-2
            current_user["value"] = _make_user("user-2")
            resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts",
                json={
                    "filename": "test.md",
                    "content": "hello",
                    "mimeType": "text/markdown",
                },
            )
            assert resp.status_code == 403
        finally:
            _clear_overrides()


class TestLoadArtifacts:
    """VAL-SESSION-010: Reopened sessions restore real artifact files."""

    def test_load_artifacts_returns_saved_metadata(self):
        fake_firestore = FakeFirestoreClient()
        fake_storage = FakeStorageBucket()
        services = _make_services(fake_firestore, fake_storage)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            session_id = _create_session(client)

            # Save two artifacts
            client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts",
                json={
                    "filename": "notes.md",
                    "content": "# Notes",
                    "mimeType": "text/markdown",
                },
            )
            client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts",
                json={
                    "filename": "diagram.png",
                    "content": base64.b64encode(b"fake-png").decode(),
                    "mimeType": "image/png",
                    "label": "Diagram",
                },
            )

            # Load artifacts
            resp = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts"
            )
            assert resp.status_code == 200
            body = resp.json()
            assert body["sessionId"] == session_id
            assert len(body["artifacts"]) == 2

            filenames = [a["filename"] for a in body["artifacts"]]
            assert "notes.md" in filenames
            assert "diagram.png" in filenames
            notes_artifact = next(
                artifact
                for artifact in body["artifacts"]
                if artifact["filename"] == "notes.md"
            )
            assert notes_artifact["sizeBytes"] == len(b"# Notes")
        finally:
            _clear_overrides()

    def test_load_artifacts_from_empty_session(self):
        fake_firestore = FakeFirestoreClient()
        fake_storage = FakeStorageBucket()
        services = _make_services(fake_firestore, fake_storage)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            session_id = _create_session(client)
            resp = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts"
            )
            assert resp.status_code == 200
            assert resp.json()["artifacts"] == []
        finally:
            _clear_overrides()

    def test_load_artifacts_rejects_non_owner(self):
        fake_firestore = FakeFirestoreClient()
        fake_storage = FakeStorageBucket()
        services = _make_services(fake_firestore, fake_storage)
        client = TestClient(app)

        from src.app.api.v1.endpoints import brainstorm
        from src.app.services import brainstorm_persistence

        current_user = {"value": _make_user("user-1")}
        app.dependency_overrides[brainstorm.require_brainstorm_user] = (
            lambda: current_user["value"]
        )
        app.dependency_overrides[
            brainstorm_persistence.get_brainstorm_persistence_services
        ] = lambda: services

        try:
            session_id = _create_session(client)
            current_user["value"] = _make_user("user-2")
            resp = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts"
            )
            assert resp.status_code == 403
        finally:
            _clear_overrides()


class TestDownloadArtifact:
    """VAL-SESSION-010: Artifact previews and downloads work after reopen."""

    def test_download_artifact_quotes_content_disposition_filename(self):
        fake_firestore = FakeFirestoreClient()
        fake_storage = FakeStorageBucket()
        services = _make_services(fake_firestore, fake_storage)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            session_id = _create_session(client)

            save_resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts",
                json={
                    "filename": 'notes with spaces;".md',
                    "content": "# My Notes\n\nContent here.",
                    "mimeType": "text/markdown",
                },
            )
            artifact_id = save_resp.json()["artifact"]["artifactId"]

            download_resp = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_id}"
                f"/artifacts/{artifact_id}/download"
            )
        finally:
            _clear_overrides()

        assert download_resp.status_code == 200
        assert (
            download_resp.headers["content-disposition"]
            == "attachment; filename*=UTF-8''notes%20with%20spaces%3B%22.md"
        )

    def test_download_text_artifact(self):
        fake_firestore = FakeFirestoreClient()
        fake_storage = FakeStorageBucket()
        services = _make_services(fake_firestore, fake_storage)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            session_id = _create_session(client)

            save_resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts",
                json={
                    "filename": "notes.md",
                    "content": "# My Notes\n\nContent here.",
                    "mimeType": "text/markdown",
                },
            )
            artifact_id = save_resp.json()["artifact"]["artifactId"]

            download_resp = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_id}"
                f"/artifacts/{artifact_id}/download"
            )
            assert download_resp.status_code == 200
            assert (
                download_resp.headers["content-type"]
                == "text/markdown; charset=utf-8"
            )
            assert b"# My Notes" in download_resp.content
        finally:
            _clear_overrides()

    def test_download_image_artifact(self):
        fake_firestore = FakeFirestoreClient()
        fake_storage = FakeStorageBucket()
        services = _make_services(fake_firestore, fake_storage)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            session_id = _create_session(client)
            image_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20
            b64_content = base64.b64encode(image_bytes).decode()

            save_resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/artifacts",
                json={
                    "filename": "image.png",
                    "content": b64_content,
                    "mimeType": "image/png",
                },
            )
            artifact_id = save_resp.json()["artifact"]["artifactId"]

            download_resp = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_id}"
                f"/artifacts/{artifact_id}/download"
            )
            assert download_resp.status_code == 200
            assert download_resp.content == image_bytes
        finally:
            _clear_overrides()

    def test_download_nonexistent_artifact(self):
        fake_firestore = FakeFirestoreClient()
        fake_storage = FakeStorageBucket()
        services = _make_services(fake_firestore, fake_storage)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            session_id = _create_session(client)
            resp = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_id}"
                f"/artifacts/nonexistent-artifact/download"
            )
            assert resp.status_code == 404
        finally:
            _clear_overrides()


class TestSessionIsolation:
    """VAL-CROSS-006: Session isolation for artifacts across multiple sessions."""

    def test_artifacts_belong_to_originating_session_only(self):
        """Save artifacts to session A, then verify session B has none."""
        fake_firestore = FakeFirestoreClient()
        fake_storage = FakeStorageBucket()
        services = _make_services(fake_firestore, fake_storage)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            session_a = _create_session(client)
            session_b = _create_session(client)

            # Save artifact to session A
            client.put(
                f"/api/v1/live/brainstorm/sessions/{session_a}/artifacts",
                json={
                    "filename": "session_a_notes.md",
                    "content": "Notes for session A",
                    "mimeType": "text/markdown",
                },
            )

            # Session A should have the artifact
            resp_a = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_a}/artifacts"
            )
            assert len(resp_a.json()["artifacts"]) == 1
            assert resp_a.json()["artifacts"][0]["filename"] == "session_a_notes.md"

            # Session B should have no artifacts
            resp_b = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_b}/artifacts"
            )
            assert len(resp_b.json()["artifacts"]) == 0
        finally:
            _clear_overrides()

    def test_delayed_artifact_persists_to_originating_session(self):
        """Simulate delayed artifact: user switches to session B,
        but delayed artifact save targets session A explicitly."""
        fake_firestore = FakeFirestoreClient()
        fake_storage = FakeStorageBucket()
        services = _make_services(fake_firestore, fake_storage)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            session_a = _create_session(client)
            session_b = _create_session(client)

            # User starts session A, a tool call is triggered
            client.put(
                f"/api/v1/live/brainstorm/sessions/{session_a}/artifacts",
                json={
                    "filename": "early_notes.md",
                    "content": "Early notes for session A",
                    "mimeType": "text/markdown",
                },
            )

            # User switches to session B (opens it)
            client.get(f"/api/v1/live/brainstorm/sessions/{session_b}")

            # Delayed artifact from session A arrives — saved to session A
            client.put(
                f"/api/v1/live/brainstorm/sessions/{session_a}/artifacts",
                json={
                    "filename": "delayed_image.png",
                    "content": base64.b64encode(b"delayed-image-data").decode(),
                    "mimeType": "image/png",
                    "label": "Delayed Image",
                },
            )

            # Session A should have both artifacts
            resp_a = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_a}/artifacts"
            )
            assert len(resp_a.json()["artifacts"]) == 2

            # Session B should still have none
            resp_b = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_b}/artifacts"
            )
            assert len(resp_b.json()["artifacts"]) == 0
        finally:
            _clear_overrides()

    def test_switching_sessions_preserves_independent_artifact_state(self):
        """Save artifacts to A and B separately, verify no cross-contamination."""
        fake_firestore = FakeFirestoreClient()
        fake_storage = FakeStorageBucket()
        services = _make_services(fake_firestore, fake_storage)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            session_a = _create_session(client)
            session_b = _create_session(client)

            # Artifact for A
            client.put(
                f"/api/v1/live/brainstorm/sessions/{session_a}/artifacts",
                json={
                    "filename": "a_notes.md",
                    "content": "Session A content",
                    "mimeType": "text/markdown",
                },
            )

            # Artifact for B
            client.put(
                f"/api/v1/live/brainstorm/sessions/{session_b}/artifacts",
                json={
                    "filename": "b_notes.md",
                    "content": "Session B content",
                    "mimeType": "text/markdown",
                },
            )

            # Verify A only has A's artifact
            resp_a = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_a}/artifacts"
            )
            a_artifacts = resp_a.json()["artifacts"]
            assert len(a_artifacts) == 1
            assert a_artifacts[0]["filename"] == "a_notes.md"

            # Verify B only has B's artifact
            resp_b = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_b}/artifacts"
            )
            b_artifacts = resp_b.json()["artifacts"]
            assert len(b_artifacts) == 1
            assert b_artifacts[0]["filename"] == "b_notes.md"

            # Download from A returns A's content
            download_a = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_a}"
                f"/artifacts/{a_artifacts[0]['artifactId']}/download"
            )
            assert b"Session A content" in download_a.content

            # Download from B returns B's content
            download_b = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_b}"
                f"/artifacts/{b_artifacts[0]['artifactId']}/download"
            )
            assert b"Session B content" in download_b.content
        finally:
            _clear_overrides()

    def test_artifact_download_from_wrong_session_fails(self):
        """Artifact ID from session A should not be downloadable via session B."""
        fake_firestore = FakeFirestoreClient()
        fake_storage = FakeStorageBucket()
        services = _make_services(fake_firestore, fake_storage)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            session_a = _create_session(client)
            session_b = _create_session(client)

            save_resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_a}/artifacts",
                json={
                    "filename": "secret.md",
                    "content": "Private content",
                    "mimeType": "text/markdown",
                },
            )
            artifact_id = save_resp.json()["artifact"]["artifactId"]

            # Try to download session A's artifact using session B's path
            resp = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_b}"
                f"/artifacts/{artifact_id}/download"
            )
            # Should be 404 because the artifact doesn't exist in session B's collection
            assert resp.status_code == 404
        finally:
            _clear_overrides()
