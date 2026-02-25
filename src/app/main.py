from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from src.app.api.v1.router import api_router
from src.app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.API_V1_STR)
