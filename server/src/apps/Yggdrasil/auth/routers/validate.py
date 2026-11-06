import json
from fastapi import APIRouter, Response
from pydantic import BaseModel
from src.apps.Yggdrasil.redis import redis_client

router = APIRouter()

class ValidateRequest(BaseModel):
    accessToken: str
    clientToken: str | None = None

@router.post("/validate")
async def validate(body: ValidateRequest):
    raw = await redis_client.get(f"yggdrasil:token:{body.accessToken}")
    if not raw:
        return Response(content=json.dumps({"error": "ForbiddenOperationException", "errorMessage": "Invalid token"}), status_code=403, media_type="application/json")
        
    session = json.loads(raw)
    if body.clientToken and session.get("clientToken") != body.clientToken:
        return Response(content=json.dumps({"error": "ForbiddenOperationException", "errorMessage": "Invalid token"}), status_code=403, media_type="application/json")
        
    return Response(status_code=204)
