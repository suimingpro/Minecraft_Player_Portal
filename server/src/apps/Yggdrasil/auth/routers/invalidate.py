from fastapi import APIRouter, Response
from pydantic import BaseModel
from src.apps.Yggdrasil.redis import redis_client

router = APIRouter()

class InvalidateRequest(BaseModel):
    accessToken: str
    clientToken: str | None = None

@router.post("/invalidate")
async def invalidate(body: InvalidateRequest):
    await redis_client.delete(f"yggdrasil:token:{body.accessToken}")
    return Response(status_code=204)
