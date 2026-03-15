import json
import logging
from html import escape as html_escape
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from google.auth.exceptions import DefaultCredentialsError

from src.app.api.v1.router import api_router
from src.app.core.config import settings
from src.app.services.brainstorm_session_library import BrainstormSessionError
from src.app.services.firebase_admin import BrainstormFirebaseConfigurationError

logging.basicConfig(level=logging.INFO, format="%(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.exception_handler(BrainstormFirebaseConfigurationError)
async def handle_brainstorm_firebase_configuration_error(
    request: Request,
    exc: BrainstormFirebaseConfigurationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "detail": {
                "code": "brainstorm_firebase_unavailable",
                "message": str(exc),
            }
        },
    )


@app.exception_handler(DefaultCredentialsError)
async def handle_default_credentials_error(
    request: Request,
    exc: DefaultCredentialsError,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "detail": {
                "code": "brainstorm_google_credentials_unavailable",
                "message": (
                    "Brainstorm persistence is unavailable because backend "
                    "Google credentials are not configured."
                ),
            }
        },
    )


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


_SHARE_API_PREFIX = "/api/v1/live/brainstorm"


def _build_share_preview_html(
    *,
    site_origin: str,
    share_token: str,
    title: str,
    description: str,
    og_image_url: str,
) -> str:
    t = html_escape(title)
    d = html_escape(description)
    share_url = f"{site_origin}/share/{share_token}"
    spa_url = f"{site_origin}/#/share/{share_token}"
    return (
        "<!doctype html>"
        '<html lang="en"><head><meta charset="UTF-8"/>'
        f"<title>{t}</title>"
        f'<meta property="og:type" content="website"/>'
        f'<meta property="og:title" content="{t}"/>'
        f'<meta property="og:description" content="{d}"/>'
        f'<meta property="og:image" content="{html_escape(og_image_url)}"/>'
        '<meta property="og:image:width" content="1200"/>'
        '<meta property="og:image:height" content="630"/>'
        f'<meta property="og:url" content="{html_escape(share_url)}"/>'
        '<meta property="og:site_name" content="Voidpilot"/>'
        '<meta name="twitter:card" content="summary_large_image"/>'
        f'<meta name="twitter:title" content="{t}"/>'
        f'<meta name="twitter:description" content="{d}"/>'
        f'<meta name="twitter:image" content="{html_escape(og_image_url)}"/>'
        f'<meta name="description" content="{d}"/>'
        f'<link rel="canonical" href="{html_escape(share_url)}"/>'
        f'<meta http-equiv="refresh" content="0;url={html_escape(spa_url)}"/>'
        f"</head><body><p>Redirecting...</p>"
        f'<script>window.location.replace({json.dumps(spa_url)})</script>'
        "</body></html>"
    )


def _resolve_site_origin(request: Request) -> str:
    forwarded_host = request.headers.get("x-forwarded-host")
    forwarded_proto = request.headers.get("x-forwarded-proto")
    host = forwarded_host or request.headers.get("host")
    scheme = (forwarded_proto or request.url.scheme).split(",", 1)[0].strip()

    if host:
        host = host.split(",", 1)[0].strip()
        return f"{scheme}://{host}"

    return str(request.base_url).rstrip("/")


@app.get("/share/{share_token}", response_class=HTMLResponse)
async def share_preview(request: Request, share_token: str) -> HTMLResponse:
    """Serve an HTML page with OG meta tags for social link previews.

    Crawlers see the meta tags; browsers are immediately redirected to
    the SPA at ``/#/share/{token}``.
    """
    site_origin = _resolve_site_origin(request)
    title = "Voidpilot Session"
    description = "AI-generated art and conversation"
    og_image_url = f"{site_origin}/og-share.jpg"

    try:
        from src.app.services.brainstorm_persistence import (
            get_brainstorm_persistence_services,
        )
        from src.app.services.brainstorm_share import resolve_public_share

        services = get_brainstorm_persistence_services()
        share_data = resolve_public_share(services, share_token=share_token)
        session = share_data.get("session", {})
        session_title = session.get("title")
        if session_title:
            title = session_title
            description = f"Voidpilot brainstorm session -- {session_title}"

        # Use first image/video artifact as the OG image if available
        artifacts = share_data.get("artifacts", [])
        for artifact in artifacts:
            mime = artifact.get("mimeType", "")
            if mime.startswith("image/"):
                aid = artifact["artifactId"]
                og_image_url = (
                    f"{site_origin}{_SHARE_API_PREFIX}"
                    f"/share/{share_token}/artifacts/{aid}/download"
                )
                break
    except BrainstormSessionError as exc:
        logger.info(
            "Falling back to default OG preview for share %s: %s",
            share_token,
            exc,
        )
    except Exception:
        logger.exception(
            "Unexpected error generating OG preview for share %s",
            share_token,
        )

    html = _build_share_preview_html(
        site_origin=site_origin,
        share_token=share_token,
        title=title,
        description=description,
        og_image_url=og_image_url,
    )
    return HTMLResponse(content=html)


# Serve React frontend in production
_frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _frontend_dist.exists():
    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="static")
