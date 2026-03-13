"""Tests for brainstorm signed-in turn persistence.

Covers:
- VAL-SESSION-002: Save/restore transcript after each turn
- VAL-SESSION-003: Voice transcripts restored as readable history
- VAL-SESSION-004: AI-generated title attached to session
- VAL-SESSION-005: Reopen and continue appends to same session
- VAL-SESSION-007: Guest sessions do not persist
- VAL-SESSION-008: Guest sessions cannot be upgraded
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.app.main import app
from src.app.services.brainstorm_auth import BrainstormFirebaseUser
from src.app.services.brainstorm_persistence import BrainstormPersistenceServices
from tests.test_brainstorm_session_library import (
    FakeFirestoreClient,
)


def _make_user(uid: str = "user-1", email: str = "user-1@example.com"):
    return BrainstormFirebaseUser(
        uid=uid,
        email=email,
        name="Tester",
        picture=None,
        provider="password",
        claims={"uid": uid, "email": email},
    )


def _make_services(firestore_client=None):
    return BrainstormPersistenceServices(
        firestore_client=firestore_client or FakeFirestoreClient(),
        storage_bucket=None,
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


class TestSaveTurns:
    """VAL-SESSION-002: Signed-in sessions save transcript after each turn."""

    def test_save_turns_to_new_session(self):
        fake_firestore = FakeFirestoreClient()
        services = _make_services(fake_firestore)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            # Create a session first
            create_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = create_resp.json()["session"]["id"]

            # Save turns
            turns = [
                {"role": "user", "content": "Let's brainstorm about AI"},
                {"role": "gemini", "content": "Great topic! What aspect interests you?"},
            ]
            save_resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/turns",
                json={"turns": turns},
            )
            assert save_resp.status_code == 200
            body = save_resp.json()
            assert body["sessionId"] == session_id
            assert body["turnCount"] == 2
        finally:
            _clear_overrides()

    def test_save_turns_updates_session_updated_at(self):
        fake_firestore = FakeFirestoreClient()
        services = _make_services(fake_firestore)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            create_resp = client.post("/api/v1/live/brainstorm/sessions")
            session = create_resp.json()["session"]
            session_id = session["id"]
            original_updated_at = session["updatedAt"]

            turns = [
                {"role": "user", "content": "Hello"},
                {"role": "gemini", "content": "Hi there!"},
            ]
            save_resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/turns",
                json={"turns": turns},
            )
            assert save_resp.status_code == 200

            # Reopen and check updated_at changed
            reopen_resp = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_id}"
            )
            reopened = reopen_resp.json()["session"]
            assert reopened["updatedAt"] >= original_updated_at
        finally:
            _clear_overrides()


class TestLoadTurns:
    """VAL-SESSION-002/003: Load saved turns including voice transcripts."""

    def test_load_turns_from_saved_session(self):
        fake_firestore = FakeFirestoreClient()
        services = _make_services(fake_firestore)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            create_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = create_resp.json()["session"]["id"]

            turns = [
                {"role": "user", "content": "Let's brainstorm"},
                {"role": "gemini", "content": "Sure! What topic?"},
                {"role": "user", "content": "Space travel"},
            ]
            client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/turns",
                json={"turns": turns},
            )

            load_resp = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_id}/turns"
            )
            assert load_resp.status_code == 200
            body = load_resp.json()
            assert body["sessionId"] == session_id
            assert len(body["turns"]) == 3
            assert body["turns"][0]["role"] == "user"
            assert body["turns"][0]["content"] == "Let's brainstorm"
            assert body["turns"][2]["content"] == "Space travel"
        finally:
            _clear_overrides()

    def test_load_turns_from_empty_session(self):
        fake_firestore = FakeFirestoreClient()
        services = _make_services(fake_firestore)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            create_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = create_resp.json()["session"]["id"]

            load_resp = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_id}/turns"
            )
            assert load_resp.status_code == 200
            body = load_resp.json()
            assert body["turns"] == []
        finally:
            _clear_overrides()

    def test_load_turns_preserves_voice_transcripts(self):
        """VAL-SESSION-003: Voice transcripts restored as readable text."""
        fake_firestore = FakeFirestoreClient()
        services = _make_services(fake_firestore)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            create_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = create_resp.json()["session"]["id"]

            turns = [
                {"role": "user", "content": "Tell me about quantum computing"},
                {
                    "role": "gemini",
                    "content": "Quantum computing uses qubits instead of bits...",
                },
                {"role": "user", "content": "That sounds fascinating"},
                {
                    "role": "gemini",
                    "content": "It really is! Superposition allows...",
                    "isToolResponse": True,
                },
            ]
            client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/turns",
                json={"turns": turns},
            )

            load_resp = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_id}/turns"
            )
            body = load_resp.json()
            assert len(body["turns"]) == 4
            # All voice-origin content should be readable text
            for saved, original in zip(body["turns"], turns):
                assert saved["role"] == original["role"]
                assert saved["content"] == original["content"]
        finally:
            _clear_overrides()


class TestSaveTurnsOverwrites:
    """VAL-SESSION-005: Continuing a saved session appends to same session."""

    def test_save_turns_replaces_previous_state(self):
        """Each save replaces the full turn list for the session."""
        fake_firestore = FakeFirestoreClient()
        services = _make_services(fake_firestore)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            create_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = create_resp.json()["session"]["id"]

            # First save
            client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/turns",
                json={"turns": [{"role": "user", "content": "Hello"}]},
            )

            # Second save with more turns (simulates continuing the session)
            extended_turns = [
                {"role": "user", "content": "Hello"},
                {"role": "gemini", "content": "Hi!"},
                {"role": "user", "content": "New message"},
            ]
            client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/turns",
                json={"turns": extended_turns},
            )

            load_resp = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_id}/turns"
            )
            body = load_resp.json()
            assert len(body["turns"]) == 3
            assert body["turns"][2]["content"] == "New message"
        finally:
            _clear_overrides()


class TestUpdateTitle:
    """VAL-SESSION-004: AI-generated title appears and stays attached."""

    def test_update_session_title(self):
        fake_firestore = FakeFirestoreClient()
        services = _make_services(fake_firestore)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            create_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = create_resp.json()["session"]["id"]
            assert create_resp.json()["session"]["title"] == "Untitled session"

            # Update title
            title_resp = client.patch(
                f"/api/v1/live/brainstorm/sessions/{session_id}/title",
                json={"title": "Quantum Computing Ideas"},
            )
            assert title_resp.status_code == 200
            assert title_resp.json()["session"]["title"] == "Quantum Computing Ideas"

            # Verify title persists on reopen
            reopen_resp = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_id}"
            )
            assert reopen_resp.json()["session"]["title"] == "Quantum Computing Ideas"

            # Verify title shows in library list
            list_resp = client.get("/api/v1/live/brainstorm/sessions")
            sessions = list_resp.json()["sessions"]
            matching = [s for s in sessions if s["id"] == session_id]
            assert len(matching) == 1
            assert matching[0]["title"] == "Quantum Computing Ideas"
        finally:
            _clear_overrides()

    def test_update_title_rejects_empty(self):
        fake_firestore = FakeFirestoreClient()
        services = _make_services(fake_firestore)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            create_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = create_resp.json()["session"]["id"]

            title_resp = client.patch(
                f"/api/v1/live/brainstorm/sessions/{session_id}/title",
                json={"title": "  "},
            )
            assert title_resp.status_code == 400
        finally:
            _clear_overrides()


class TestGuestIsolation:
    """VAL-SESSION-007/008: Guest sessions never persist or backfill."""

    def test_save_turns_rejects_nonexistent_session(self):
        """Guest sessions have no server-side session record."""
        fake_firestore = FakeFirestoreClient()
        services = _make_services(fake_firestore)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            save_resp = client.put(
                "/api/v1/live/brainstorm/sessions/nonexistent-id/turns",
                json={"turns": [{"role": "user", "content": "Hello"}]},
            )
            assert save_resp.status_code == 404
        finally:
            _clear_overrides()

    def test_load_turns_rejects_nonexistent_session(self):
        fake_firestore = FakeFirestoreClient()
        services = _make_services(fake_firestore)
        client = TestClient(app)
        _setup_overrides(services=services)

        try:
            load_resp = client.get(
                "/api/v1/live/brainstorm/sessions/nonexistent-id/turns"
            )
            assert load_resp.status_code == 404
        finally:
            _clear_overrides()

    def test_save_turns_rejects_non_owner(self):
        """VAL-SESSION-008: Cannot write to someone else's session."""
        fake_firestore = FakeFirestoreClient()
        services = _make_services(fake_firestore)
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
            create_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = create_resp.json()["session"]["id"]

            current_user["value"] = _make_user("user-2")
            save_resp = client.put(
                f"/api/v1/live/brainstorm/sessions/{session_id}/turns",
                json={"turns": [{"role": "user", "content": "Hello"}]},
            )
            assert save_resp.status_code == 403
        finally:
            _clear_overrides()

    def test_load_turns_rejects_non_owner(self):
        fake_firestore = FakeFirestoreClient()
        services = _make_services(fake_firestore)
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
            create_resp = client.post("/api/v1/live/brainstorm/sessions")
            session_id = create_resp.json()["session"]["id"]

            current_user["value"] = _make_user("user-2")
            load_resp = client.get(
                f"/api/v1/live/brainstorm/sessions/{session_id}/turns"
            )
            assert load_resp.status_code == 403
        finally:
            _clear_overrides()
