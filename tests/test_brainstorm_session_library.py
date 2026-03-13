from __future__ import annotations

from dataclasses import dataclass

from fastapi.testclient import TestClient

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
    def __init__(self, store: dict[str, dict], document_id: str):
        self._store = store
        self.id = document_id

    def get(self) -> FakeDocumentSnapshot:
        return FakeDocumentSnapshot(self.id, self._store.get(self.id))

    def set(self, value: dict) -> None:
        self._store[self.id] = dict(value)

    def delete(self) -> None:
        self._store.pop(self.id, None)


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
    def __init__(self, store: dict[str, dict]):
        self._store = store

    def document(self, document_id: str) -> FakeDocumentReference:
        return FakeDocumentReference(self._store, document_id)

    def where(self, field_name: str, operator: str, value: str) -> FakeQuery:
        assert operator == '=='
        return FakeQuery(self._store, field_name, value)


class FakeFirestoreClient:
    def __init__(self):
        self._collections: dict[str, dict[str, dict]] = {}

    def collection(self, collection_name: str) -> FakeCollectionReference:
        collection_store = self._collections.setdefault(collection_name, {})
        return FakeCollectionReference(collection_store)


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
        first_session = client.post('/api/v1/live/brainstorm/sessions').json()['session']
        second_session = client.post('/api/v1/live/brainstorm/sessions').json()['session']

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
