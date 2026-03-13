from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import Header, HTTPException, status
from firebase_admin import auth

from src.app.services.firebase_admin import get_firebase_admin_app


@dataclass(frozen=True)
class BrainstormFirebaseUser:
    """Normalized Firebase identity for brainstorm-only backend flows."""

    uid: str
    email: str | None
    name: str | None
    picture: str | None
    provider: str | None
    claims: dict[str, Any]


class BrainstormAuthError(RuntimeError):
    """Base class for brainstorm auth failures that later routes can inspect."""

    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "brainstorm_auth_error"
    default_message = "Brainstorm authentication failed."

    def __init__(self, message: str | None = None):
        super().__init__(message or self.default_message)

    def to_http_exception(self) -> HTTPException:
        return HTTPException(
            status_code=self.status_code,
            detail={
                "code": self.error_code,
                "message": str(self),
            },
        )


class MissingBrainstormAuthError(BrainstormAuthError):
    error_code = "brainstorm_auth_missing"
    default_message = "Missing Firebase bearer token for brainstorm access."


class InvalidBrainstormAuthError(BrainstormAuthError):
    error_code = "brainstorm_auth_invalid"
    default_message = "Invalid Firebase bearer token for brainstorm access."


class ExpiredBrainstormAuthError(BrainstormAuthError):
    error_code = "brainstorm_auth_expired"
    default_message = "Expired Firebase bearer token for brainstorm access."


class RevokedBrainstormAuthError(BrainstormAuthError):
    error_code = "brainstorm_auth_revoked"
    default_message = "Revoked Firebase bearer token for brainstorm access."


class DisabledBrainstormAuthError(BrainstormAuthError):
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "brainstorm_auth_disabled"
    default_message = "Firebase user is disabled for brainstorm access."


AuthorizationHeader = Annotated[
    str | None,
    Header(alias="Authorization"),
]


def parse_brainstorm_bearer_token(authorization: str | None) -> str:
    """Extract a Firebase ID token from an Authorization header."""
    if not authorization:
        raise MissingBrainstormAuthError()

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        raise InvalidBrainstormAuthError(
            "Authorization header must use the Bearer scheme."
        )

    stripped_token = token.strip()
    if not stripped_token:
        raise InvalidBrainstormAuthError(
            "Authorization header included the Bearer scheme but no token."
        )

    return stripped_token


def verify_brainstorm_id_token(
    id_token: str,
    *,
    check_revoked: bool = False,
) -> BrainstormFirebaseUser:
    """Verify a Firebase ID token and normalize the decoded claims."""
    if not id_token:
        raise MissingBrainstormAuthError()

    try:
        decoded_token = auth.verify_id_token(
            id_token,
            app=get_firebase_admin_app(),
            check_revoked=check_revoked,
        )
    except auth.ExpiredIdTokenError as exc:
        raise ExpiredBrainstormAuthError() from exc
    except auth.RevokedIdTokenError as exc:
        raise RevokedBrainstormAuthError() from exc
    except auth.UserDisabledError as exc:
        raise DisabledBrainstormAuthError() from exc
    except (auth.CertificateFetchError, auth.InvalidIdTokenError, ValueError) as exc:
        raise InvalidBrainstormAuthError() from exc

    uid = decoded_token.get("uid") or decoded_token.get("sub")
    if not uid:
        raise InvalidBrainstormAuthError(
            "Verified Firebase token did not include a user identifier."
        )

    firebase_claims = decoded_token.get("firebase")
    provider = None
    if isinstance(firebase_claims, dict):
        provider = firebase_claims.get("sign_in_provider")

    return BrainstormFirebaseUser(
        uid=uid,
        email=decoded_token.get("email"),
        name=decoded_token.get("name"),
        picture=decoded_token.get("picture"),
        provider=provider,
        claims=dict(decoded_token),
    )


def get_brainstorm_user_from_authorization(
    authorization: str | None,
    *,
    check_revoked: bool = False,
) -> BrainstormFirebaseUser:
    """Resolve a brainstorm user from a bearer Authorization header."""
    token = parse_brainstorm_bearer_token(authorization)
    return verify_brainstorm_id_token(token, check_revoked=check_revoked)


def require_brainstorm_user(
    authorization: AuthorizationHeader = None,
) -> BrainstormFirebaseUser:
    """FastAPI dependency for future brainstorm-private endpoints."""
    try:
        return get_brainstorm_user_from_authorization(authorization)
    except BrainstormAuthError as exc:
        raise exc.to_http_exception() from exc


def get_optional_brainstorm_user(
    authorization: AuthorizationHeader = None,
) -> BrainstormFirebaseUser | None:
    """Resolve brainstorm auth when present without forcing it on public flows."""
    if authorization is None:
        return None

    try:
        return get_brainstorm_user_from_authorization(authorization)
    except MissingBrainstormAuthError:
        return None
    except BrainstormAuthError as exc:
        raise exc.to_http_exception() from exc
