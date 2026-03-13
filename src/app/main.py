import logging
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from google.auth.exceptions import DefaultCredentialsError

from src.app.api.v1.router import api_router
from src.app.core.config import settings
from src.app.services.firebase_admin import BrainstormFirebaseConfigurationError

logging.basicConfig(level=logging.INFO, format="%(name)s - %(levelname)s - %(message)s")

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


# Serve React frontend in production
_frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _frontend_dist.exists():
    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="static")
