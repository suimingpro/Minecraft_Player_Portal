import json, uuid
from fastapi import APIRouter, Response
from pydantic import BaseModel
from src.apps.Yggdrasil.redis import redis_client

router = APIRouter()

class RefreshRequest(BaseModel):
    accessToken: str
    clientToken: str | None = None
    requestUser: bool = False
    selectedProfile: dict | None = None

@router.post("/refresh")
async def refresh(body: RefreshRequest):
    raw = await redis_client.get(f"yggdrasil:token:{body.accessToken}")
    if not raw:
        return Response(content=json.dumps({"error": "ForbiddenOperationException", "errorMessage": "Invalid token"}), status_code=403, media_type="application/json")
        
    session = json.loads(raw)
    if body.clientToken and session.get("clientToken") != body.clientToken:
        return Response(content=json.dumps({"error": "ForbiddenOperationException", "errorMessage": "Invalid token"}), status_code=403, media_type="application/json")
        
    await redis_client.delete(f"yggdrasil:token:{body.accessToken}")
    
    new_access = str(uuid.uuid4()).replace("-", "")
    session["accessToken"] = new_access
    
    await redis_client.setex(f"yggdrasil:token:{new_access}", 86400 * 7, json.dumps(session))
    
    resp = {
        "accessToken": new_access,
        "clientToken": session.get("clientToken", ""),
        "selectedProfile": session.get("selectedProfile")
    }
    if body.requestUser:
        resp["user"] = {"id": session["user_uuid"].replace("-", ""), "properties": []}
    return resp
