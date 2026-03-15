from fastapi.testclient import TestClient

from src.app.main import app


def test_share_preview_uses_request_origin_for_meta_tags(monkeypatch):
    from src.app.services import brainstorm_persistence, brainstorm_share

    services = object()

    monkeypatch.setattr(
        brainstorm_persistence,
        'get_brainstorm_persistence_services',
        lambda: services,
    )
    monkeypatch.setattr(
        brainstorm_share,
        'resolve_public_share',
        lambda resolved_services, share_token: {
            'session': {'title': 'Nebula Notes'},
            'artifacts': [
                {'artifactId': 'art-1', 'mimeType': 'image/png'},
            ],
        },
    )

    client = TestClient(app)
    response = client.get(
        '/share/share-123',
        headers={
            'host': 'preview.example.com',
            'x-forwarded-proto': 'https',
        },
    )

    assert response.status_code == 200
    assert (
        'content="https://preview.example.com/share/share-123"'
        in response.text
    )
    assert (
        'content="https://preview.example.com/api/v1/live/brainstorm/'
        'share/share-123/artifacts/art-1/download"' in response.text
    )
    assert (
        'window.location.replace('
        '"https://preview.example.com/#/share/share-123"'
        ')' in response.text
    )


def test_share_preview_falls_back_to_default_image_on_lookup_errors(monkeypatch):
    from src.app.services import brainstorm_persistence, brainstorm_share

    monkeypatch.setattr(
        brainstorm_persistence,
        'get_brainstorm_persistence_services',
        lambda: object(),
    )

    def raise_lookup_error(*args, **kwargs):
        raise RuntimeError('lookup failed')

    monkeypatch.setattr(
        brainstorm_share,
        'resolve_public_share',
        raise_lookup_error,
    )

    client = TestClient(app)
    response = client.get(
        '/share/share-456',
        headers={
            'host': 'preview.example.com',
            'x-forwarded-proto': 'https',
        },
    )

    assert response.status_code == 200
    assert 'content="https://preview.example.com/og-share.jpg"' in response.text
    assert 'content="https://preview.example.com/share/share-456"' in response.text
