from fastapi import APIRouter

from src.app.api.v1.endpoints import brainstorm, walkthrough

api_router = APIRouter()


@api_router.get("/hello")
async def hello():
    return {"message": "Hello from the latest Python backend! 🚀"}


api_router.include_router(walkthrough.router, prefix="/live", tags=["Walkthrough"])
api_router.include_router(brainstorm.router, prefix="/live", tags=["Brainstorm"])
