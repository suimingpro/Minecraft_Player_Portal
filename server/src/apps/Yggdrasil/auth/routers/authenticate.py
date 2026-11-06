import uuid
import json
from fastapi import APIRouter, Response
from pydantic import BaseModel
from src.apps.MicrosoftSSO.database import SessionLocal, User, Player
from sqlalchemy import select
from src.apps.Yggdrasil.redis import redis_client

router = APIRouter()

class Agent(BaseModel):
    name: str
    version: int

class AuthRequest(BaseModel):
    username: str
    password: str
    clientToken: str | None = None
    requestUser: bool = False
    agent: Agent | None = None

@router.post("/authenticate")
async def authenticate(body: AuthRequest):
    async with SessionLocal() as session:
        result = await session.execute(select(User).where(User.email == body.username))
        user = result.scalar_one_or_none()
        
        if not user or user.launcher_password != body.password:
            return Response(
                content=json.dumps({"error": "ForbiddenOperationException", "errorMessage": "Invalid credentials. Invalid username or password."}),
                status_code=403,
                media_type="application/json"
            )
            
        result_player = await session.execute(select(Player).where(Player.user_uuid == user.uuid))
        player = result_player.scalar_one_or_none()

    clientToken = body.clientToken or str(uuid.uuid4()).replace("-", "")
    accessToken = str(uuid.uuid4()).replace("-", "")
    
    availableProfiles = []
    selectedProfile = None
    
    if player and player.player_uuid and player.minecraft_username:
        profile = {
            "id": player.player_uuid.replace("-", ""),
            "name": player.minecraft_username
        }
        availableProfiles.append(profile)
        selectedProfile = profile

    session_data = {
        "accessToken": accessToken,
        "clientToken": clientToken,
        "user_uuid": user.uuid,
        "selectedProfile": selectedProfile
    }
    
    await redis_client.setex(f"yggdrasil:token:{accessToken}", 86400 * 7, json.dumps(session_data))
    
    resp = {
        "accessToken": accessToken,
        "clientToken": clientToken,
        "availableProfiles": availableProfiles,
    }
    if selectedProfile:
        resp["selectedProfile"] = selectedProfile
    if body.requestUser:
        resp["user"] = {"id": user.uuid.replace("-", ""), "properties": []}
        
    return resp
