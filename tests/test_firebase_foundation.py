from types import SimpleNamespace
from unittest.mock import patch

import pytest


def test_parse_brainstorm_bearer_token_rejects_missing_header():
    from src.app.services.brainstorm_auth import (
        MissingBrainstormAuthError,
        parse_brainstorm_bearer_token,
    )

    with pytest.raises(MissingBrainstormAuthError):
        parse_brainstorm_bearer_token(None)


def test_parse_brainstorm_bearer_token_rejects_wrong_scheme():
    from src.app.services.brainstorm_auth import (
        InvalidBrainstormAuthError,
        parse_brainstorm_bearer_token,
    )

    with pytest.raises(InvalidBrainstormAuthError):
        parse_brainstorm_bearer_token("Basic abc123")


def test_verify_brainstorm_id_token_maps_expired_token():
    from src.app.services import brainstorm_auth

    with (
        patch.object(
            brainstorm_auth,
            "get_firebase_admin_app",
            return_value="firebase-app",
        ),
        patch.object(
            brainstorm_auth.auth,
            "verify_id_token",
            side_effect=brainstorm_auth.auth.ExpiredIdTokenError(
                "expired",
                Exception("expired"),
            ),
        ),
    ):
        with pytest.raises(brainstorm_auth.ExpiredBrainstormAuthError):
            brainstorm_auth.verify_brainstorm_id_token("token-123")


def test_verify_brainstorm_id_token_returns_verified_user():
    from src.app.services.brainstorm_auth import verify_brainstorm_id_token

    decoded_token = {
        "uid": "user-123",
        "email": "brainstorm@example.com",
        "name": "Brain Storm",
        "picture": "https://example.com/avatar.png",
        "firebase": {"sign_in_provider": "password"},
    }

    with (
        patch(
            "src.app.services.brainstorm_auth.get_firebase_admin_app",
            return_value="firebase-app",
        ),
        patch(
            "src.app.services.brainstorm_auth.auth.verify_id_token",
            return_value=decoded_token,
        ),
    ):
        user = verify_brainstorm_id_token("token-123")

    assert user.uid == "user-123"
    assert user.email == "brainstorm@example.com"
    assert user.provider == "password"
    assert user.claims == decoded_token


def test_get_firebase_admin_app_initializes_with_project_and_bucket():
    from src.app.services import firebase_admin as firebase_service

    mock_settings = SimpleNamespace(
        FIREBASE_PROJECT_ID="gen-lang-client-0579048282",
        FIREBASE_STORAGE_BUCKET="gen-lang-client-0579048282.firebasestorage.app",
        FIREBASE_CREDENTIALS_JSON=None,
    )

    with (
        patch.object(firebase_service, "settings", mock_settings),
        patch.object(
            firebase_service.firebase_admin, "get_app", side_effect=ValueError
        ),
        patch.object(
            firebase_service.credentials,
            "ApplicationDefault",
            return_value="application-default-creds",
        ),
        patch.object(
            firebase_service.firebase_admin,
            "initialize_app",
            return_value="firebase-app",
        ) as initialize_app,
    ):
        app = firebase_service.get_firebase_admin_app()

    assert app == "firebase-app"
    initialize_app.assert_called_once_with(
        "application-default-creds",
        {
            "projectId": "gen-lang-client-0579048282",
            "storageBucket": "gen-lang-client-0579048282.firebasestorage.app",
        },
    )


def test_get_firebase_admin_app_wraps_invalid_service_account_payload():
    from src.app.services import firebase_admin as firebase_service

    mock_settings = SimpleNamespace(
        FIREBASE_PROJECT_ID="gen-lang-client-0579048282",
        FIREBASE_STORAGE_BUCKET="gen-lang-client-0579048282.firebasestorage.app",
        FIREBASE_CREDENTIALS_JSON='{"project_id":"gen-lang-client-0579048282"}',
    )

    with (
        patch.object(firebase_service, "settings", mock_settings),
        patch.object(
            firebase_service.firebase_admin, "get_app", side_effect=ValueError
        ),
    ):
        with pytest.raises(firebase_service.BrainstormFirebaseConfigurationError):
            firebase_service.get_firebase_admin_app()


def test_get_brainstorm_firestore_client_uses_firebase_app():
    from src.app.services import brainstorm_persistence

    with (
        patch.object(
            brainstorm_persistence,
            "get_firebase_admin_app",
            return_value="firebase-app",
        ),
        patch.object(
            brainstorm_persistence.firestore,
            "client",
            return_value="firestore-client",
        ) as firestore_client,
    ):
        client = brainstorm_persistence.get_brainstorm_firestore_client()

    assert client == "firestore-client"
    firestore_client.assert_called_once_with(app="firebase-app")


def test_get_brainstorm_storage_bucket_uses_configured_bucket():
    from src.app.services import brainstorm_persistence

    mock_settings = SimpleNamespace(
        FIREBASE_STORAGE_BUCKET="gen-lang-client-0579048282.firebasestorage.app"
    )

    with (
        patch.object(brainstorm_persistence, "settings", mock_settings),
        patch.object(
            brainstorm_persistence,
            "get_firebase_admin_app",
            return_value="firebase-app",
        ),
        patch.object(
            brainstorm_persistence.storage,
            "bucket",
            return_value="bucket-object",
        ) as bucket,
    ):
        resolved_bucket = brainstorm_persistence.get_brainstorm_storage_bucket()

    assert resolved_bucket == "bucket-object"
    bucket.assert_called_once_with(
        name="gen-lang-client-0579048282.firebasestorage.app",
        app="firebase-app",
    )


def test_build_brainstorm_artifact_blob_path_sanitizes_filename():
    from src.app.services.brainstorm_persistence import (
        build_brainstorm_artifact_blob_path,
    )

    assert build_brainstorm_artifact_blob_path(
        session_id="session-123",
        artifact_id="artifact-456",
        filename="nested/notes.md",
    ) == (
        "brainstorm/sessions/session-123/artifacts/artifact-456/notes.md"
    )
