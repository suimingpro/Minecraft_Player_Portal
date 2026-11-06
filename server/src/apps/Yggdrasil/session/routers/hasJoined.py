import json
import base64
import os
import time

from fastapi import APIRouter, Query, Response
from src.apps.Yggdrasil.redis import redis_client
from src.apps.MicrosoftSSO.database import SessionLocal, Player
from sqlalchemy import select

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization

router = APIRouter()

@router.get("/hasJoined")
async def has_joined(
    username: str,
    serverId: str,
    ip: str | None = Query(default=None),
):
    key = f"yggdrasil:join:{serverId}"
    raw = await redis_client.get(key)
    
    if raw is None:
        return Response(status_code=204)

    session_data = json.loads(raw)

    if session_data["username"] != username:
        return Response(status_code=204)

    if ip is not None:
        if session_data["ip"] != ip:
            return Response(status_code=204)

    player_uuid = session_data["profile"]
    uuid_with_dashes = f"{player_uuid[:8]}-{player_uuid[8:12]}-{player_uuid[12:16]}-{player_uuid[16:20]}-{player_uuid[20:]}"

    async with SessionLocal() as db_session:
        result = await db_session.execute(select(Player).where(Player.player_uuid == uuid_with_dashes))
        player = result.scalar_one_or_none()

    if not player:
        return Response(status_code=204)

    textures = {
        "timestamp": int(time.time() * 1000),
        "profileId": player_uuid,
        "profileName": player.minecraft_username,
        "textures": {}
    }

    if player.skin_url:
        textures["textures"]["SKIN"] = {"url": player.skin_url}
        if player.skin_model == "slim":
            textures["textures"]["SKIN"]["metadata"] = {"model": "slim"}
    if player.cape_url:
        textures["textures"]["CAPE"] = {"url": player.cape_url}

    textures_json = json.dumps(textures).encode("utf-8")
    textures_b64 = base64.b64encode(textures_json).decode("utf-8")

    prop = {
        "name": "textures",
        "value": textures_b64
    }

    priv_path = "certs/yggdrasil/private.pem"
    if os.path.exists(priv_path):
        try:
            with open(priv_path, "rb") as f:
                private_key = serialization.load_pem_private_key(f.read(), password=None)
            signature = private_key.sign(
                textures_b64.encode("utf-8"),
                padding.PKCS1v15(),
                hashes.SHA1()
            )
            prop["signature"] = base64.b64encode(signature).decode("utf-8")
        except Exception:
            pass

    return {
        "id": player_uuid,
        "name": player.minecraft_username,
        "properties": [prop]
    }
