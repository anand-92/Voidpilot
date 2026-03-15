from __future__ import annotations

from dataclasses import dataclass

import pytest
from fastapi.testclient import TestClient
from google.api_core import exceptions as google_exceptions

from src.app.main import app
from src.app.services.brainstorm_auth import BrainstormFirebaseUser


@dataclass
class FakeDocumentSnapshot:
    id: str
    _data: dict | None

    @property
    def exists(self) -> bool:
        return self._data is not None

    def to_dict(self) -> dict:
        if self._data is None:
            raise RuntimeError('Missing document')
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
        # global_stores tracks all subcollection data keyed by path-like keys
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

    def collection(self, subcollection_name: str) -> FakeCollectionReference:
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
        """Stream all documents in the collection (used by artifact listing)."""
        return [
            FakeDocumentSnapshot(doc_id, data)
            for doc_id, data in self._store.items()
        ]

    def where(self, field_name: str, operator: str, value: str) -> FakeQuery:
        assert operator == '=='
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


class UnavailableDocumentReference:
    def __init__(self, error: Exception):
        self._error = error

    def get(self):
        raise self._error

    def set(self, value: dict) -> None:
        raise self._error

    def delete(self) -> None:
        raise self._error


class UnavailableQuery:
    def __init__(self, error: Exception):
        self._error = error

    def stream(self):
        raise self._error


class UnavailableCollectionReference:
    def __init__(self, error: Exception):
        self._error = error

    def document(self, document_id: str) -> UnavailableDocumentReference:
        return UnavailableDocumentReference(self._error)

    def where(self, field_name: str, operator: str, value: str) -> UnavailableQuery:
        assert operator == '=='
        return UnavailableQuery(self._error)


class UnavailableFirestoreClient:
    def __init__(self, error: Exception):
        self._error = error

    def collection(self, collection_name: str) -> UnavailableCollectionReference:
        return UnavailableCollectionReference(self._error)


def make_user(uid: str, email: str) -> BrainstormFirebaseUser:
    return BrainstormFirebaseUser(
        uid=uid,
        email=email,
        name='Brainstorm Tester',
        picture=None,
        provider='password',
        claims={'uid': uid, 'email': email},
    )


def test_brainstorm_session_library_returns_empty_list_for_new_user():
    from src.app.api.v1.endpoints import brainstorm
    from src.app.services import brainstorm_persistence

    fake_firestore = FakeFirestoreClient()
    client = TestClient(app)

    app.dependency_overrides[brainstorm.require_brainstorm_user] = lambda: make_user(
        'user-1', 'user-1@example.com'
    )
    app.dependency_overrides[
        brainstorm_persistence.get_brainstorm_persistence_services
    ] = lambda: brainstorm_persistence.BrainstormPersistenceServices(
        firestore_client=fake_firestore,
        storage_bucket=None,
        project_id='project-id',
        location='us-east1',
    )

    try:
        response = client.get('/api/v1/live/brainstorm/sessions')
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {'sessions': []}


def test_brainstorm_session_library_returns_thumbnail_metadata_for_latest_media():
    from src.app.api.v1.endpoints import brainstorm
    from src.app.services import brainstorm_persistence
    from src.app.services.brainstorm_artifact_persistence import (
        BRAINSTORM_ARTIFACTS_SUBCOLLECTION,
    )
    from src.app.services.brainstorm_session_library import (
        BRAINSTORM_SESSION_COLLECTION,
    )

    fake_firestore = FakeFirestoreClient()
    client = TestClient(app)

    app.dependency_overrides[brainstorm.require_brainstorm_user] = lambda: make_user(
        'user-1', 'user-1@example.com'
    )
    app.dependency_overrides[
        brainstorm_persistence.get_brainstorm_persistence_services
    ] = lambda: brainstorm_persistence.BrainstormPersistenceServices(
        firestore_client=fake_firestore,
        storage_bucket=None,
        project_id='project-id',
        location='us-east1',
    )

    try:
        create_response = client.post('/api/v1/live/brainstorm/sessions')
        session_id = create_response.json()['session']['id']

        artifacts = (
            fake_firestore.collection(BRAINSTORM_SESSION_COLLECTION)
            .document(session_id)
            .collection(BRAINSTORM_ARTIFACTS_SUBCOLLECTION)
        )
        artifacts.document('art-image').set(
            {
                'artifact_id': 'art-image',
                'filename': 'poster.png',
                'mime_type': 'image/png',
                'blob_path': 'brainstorm/sessions/s1/artifacts/art-image/poster.png',
                'created_at': '2025-01-01T00:00:00Z',
            }
        )
        artifacts.document('art-video').set(
            {
                'artifact_id': 'art-video',
                'filename': 'clip.mp4',
                'mime_type': 'video/mp4',
                'blob_path': 'brainstorm/sessions/s1/artifacts/art-video/clip.mp4',
                'created_at': '2025-01-02T00:00:00Z',
            }
        )

        list_response = client.get('/api/v1/live/brainstorm/sessions')
    finally:
        app.dependency_overrides.clear()

    assert list_response.status_code == 200
    session = list_response.json()['sessions'][0]
    assert session['thumbnailArtifactId'] == 'art-video'
    assert session['thumbnailMimeType'] == 'video/mp4'



def test_brainstorm_session_library_uses_stored_thumbnail_metadata(
    monkeypatch,
):
    from src.app.api.v1.endpoints import brainstorm
    from src.app.services import brainstorm_persistence
    from src.app.services.brainstorm_session_library import (
        BRAINSTORM_SESSION_COLLECTION,
    )

    fake_firestore = FakeFirestoreClient()
    client = TestClient(app)

    app.dependency_overrides[brainstorm.require_brainstorm_user] = lambda: make_user(
        'user-1', 'user-1@example.com'
    )
    app.dependency_overrides[
        brainstorm_persistence.get_brainstorm_persistence_services
    ] = lambda: brainstorm_persistence.BrainstormPersistenceServices(
        firestore_client=fake_firestore,
        storage_bucket=None,
        project_id='project-id',
        location='us-east1',
    )

    def fail_if_called(*args, **kwargs):
        raise AssertionError('Fallback thumbnail lookup should not run')

    monkeypatch.setattr(brainstorm, 'get_thumbnail_artifacts', fail_if_called)

    try:
        create_response = client.post('/api/v1/live/brainstorm/sessions')
        session_id = create_response.json()['session']['id']
        fake_firestore._collections[
            BRAINSTORM_SESSION_COLLECTION
        ][session_id].update(
            {
                'thumbnail_artifact_id': 'art-123',
                'thumbnail_mime_type': 'video/mp4',
            }
        )

        list_response = client.get('/api/v1/live/brainstorm/sessions')
    finally:
        app.dependency_overrides.clear()

    assert list_response.status_code == 200
    session = list_response.json()['sessions'][0]
    assert session['thumbnailArtifactId'] == 'art-123'
    assert session['thumbnailMimeType'] == 'video/mp4'



def test_brainstorm_session_create_then_reopen_returns_same_session():
    from src.app.api.v1.endpoints import brainstorm
    from src.app.services import brainstorm_persistence

    fake_firestore = FakeFirestoreClient()
    client = TestClient(app)

    app.dependency_overrides[brainstorm.require_brainstorm_user] = lambda: make_user(
        'user-1', 'user-1@example.com'
    )
    app.dependency_overrides[
        brainstorm_persistence.get_brainstorm_persistence_services
    ] = lambda: brainstorm_persistence.BrainstormPersistenceServices(
        firestore_client=fake_firestore,
        storage_bucket=None,
        project_id='project-id',
        location='us-east1',
    )

    try:
        create_response = client.post('/api/v1/live/brainstorm/sessions')
        session_id = create_response.json()['session']['id']
        reopen_response = client.get(f'/api/v1/live/brainstorm/sessions/{session_id}')
    finally:
        app.dependency_overrides.clear()

    assert create_response.status_code == 201
    created_session = create_response.json()['session']
    reopened_session = reopen_response.json()['session']

    assert reopened_session['id'] == session_id
    assert reopened_session['id'] == created_session['id']
    assert reopened_session['mode'] == 'persisted'
    assert reopened_session['ownerUid'] == 'user-1'
    assert reopened_session['title'] == 'Untitled session'


def test_brainstorm_session_delete_removes_only_selected_session():
    from src.app.api.v1.endpoints import brainstorm
    from src.app.services import brainstorm_persistence

    fake_firestore = FakeFirestoreClient()
    client = TestClient(app)

    app.dependency_overrides[brainstorm.require_brainstorm_user] = lambda: make_user(
        'user-1', 'user-1@example.com'
    )
    app.dependency_overrides[
        brainstorm_persistence.get_brainstorm_persistence_services
    ] = lambda: brainstorm_persistence.BrainstormPersistenceServices(
        firestore_client=fake_firestore,
        storage_bucket=None,
        project_id='project-id',
        location='us-east1',
    )

    try:
        first_session = client.post('/api/v1/live/brainstorm/sessions').json()[
            'session'
        ]
        second_session = client.post('/api/v1/live/brainstorm/sessions').json()[
            'session'
        ]

        delete_response = client.delete(
            f"/api/v1/live/brainstorm/sessions/{first_session['id']}"
        )
        list_response = client.get('/api/v1/live/brainstorm/sessions')
        reopen_deleted_response = client.get(
            f"/api/v1/live/brainstorm/sessions/{first_session['id']}"
        )
        reopen_remaining_response = client.get(
            f"/api/v1/live/brainstorm/sessions/{second_session['id']}"
        )
    finally:
        app.dependency_overrides.clear()

    assert delete_response.status_code == 204
    assert [session['id'] for session in list_response.json()['sessions']] == [
        second_session['id']
    ]
    assert reopen_deleted_response.status_code == 404
    assert reopen_remaining_response.status_code == 200


def test_brainstorm_session_reopen_rejects_non_owner():
    from src.app.api.v1.endpoints import brainstorm
    from src.app.services import brainstorm_persistence

    fake_firestore = FakeFirestoreClient()
    client = TestClient(app)
    current_user = {'value': make_user('user-1', 'user-1@example.com')}

    app.dependency_overrides[brainstorm.require_brainstorm_user] = lambda: current_user[
        'value'
    ]
    app.dependency_overrides[
        brainstorm_persistence.get_brainstorm_persistence_services
    ] = lambda: brainstorm_persistence.BrainstormPersistenceServices(
        firestore_client=fake_firestore,
        storage_bucket=None,
        project_id='project-id',
        location='us-east1',
    )

    try:
        create_response = client.post('/api/v1/live/brainstorm/sessions')
        session_id = create_response.json()['session']['id']
        current_user['value'] = make_user('user-2', 'user-2@example.com')
        reopen_response = client.get(f'/api/v1/live/brainstorm/sessions/{session_id}')
    finally:
        app.dependency_overrides.clear()

    assert reopen_response.status_code == 403


@pytest.mark.parametrize(
    ('method', 'path'),
    [
        ('get', '/api/v1/live/brainstorm/sessions'),
        ('post', '/api/v1/live/brainstorm/sessions'),
        ('get', '/api/v1/live/brainstorm/sessions/session-123'),
        ('delete', '/api/v1/live/brainstorm/sessions/session-123'),
    ],
)
def test_brainstorm_session_routes_surface_firestore_dependency_errors(
    method: str,
    path: str,
):
    from src.app.api.v1.endpoints import brainstorm
    from src.app.services import brainstorm_persistence

    dependency_error = google_exceptions.NotFound(
        'The database (default) does not exist for project '
        'gen-lang-client-0579048282.'
    )
    client = TestClient(app, raise_server_exceptions=False)

    app.dependency_overrides[brainstorm.require_brainstorm_user] = lambda: make_user(
        'user-1', 'user-1@example.com'
    )
    app.dependency_overrides[
        brainstorm_persistence.get_brainstorm_persistence_services
    ] = lambda: brainstorm_persistence.BrainstormPersistenceServices(
        firestore_client=UnavailableFirestoreClient(dependency_error),
        storage_bucket=None,
        project_id='gen-lang-client-0579048282',
        location='us-east1',
    )

    try:
        response = getattr(client, method)(path)
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json() == {
        'detail': {
            'code': 'brainstorm_session_dependency_unavailable',
            'message': (
                'Brainstorm session storage is unavailable because the '
                'Firestore database is not provisioned for this project yet.'
            ),
        }
    }


@pytest.mark.parametrize(
    ('error_kind', 'expected_detail'),
    [
        (
            'firebase_config',
            {
                'code': 'brainstorm_firebase_unavailable',
                'message': (
                    'FIREBASE_STORAGE_BUCKET must be configured before '
                    'brainstorm Firebase services are used.'
                ),
            },
        ),
        (
            'default_credentials',
            {
                'code': 'brainstorm_google_credentials_unavailable',
                'message': (
                    'Brainstorm persistence is unavailable because backend '
                    'Google credentials are not configured.'
                ),
            },
        ),
    ],
)
def test_brainstorm_session_routes_surface_dependency_initialization_errors(
    error_kind: str,
    expected_detail: dict[str, str],
):
    from google.auth.exceptions import DefaultCredentialsError

    from src.app.api.v1.endpoints import brainstorm
    from src.app.services import brainstorm_persistence
    from src.app.services.firebase_admin import BrainstormFirebaseConfigurationError

    client = TestClient(app, raise_server_exceptions=False)

    app.dependency_overrides[brainstorm.require_brainstorm_user] = lambda: make_user(
        'user-1', 'user-1@example.com'
    )

    def broken_services():
        if error_kind == 'firebase_config':
            raise BrainstormFirebaseConfigurationError(expected_detail['message'])

        raise DefaultCredentialsError('ADC unavailable')

    app.dependency_overrides[
        brainstorm_persistence.get_brainstorm_persistence_services
    ] = broken_services

    try:
        response = client.get('/api/v1/live/brainstorm/sessions')
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json() == {'detail': expected_detail}
