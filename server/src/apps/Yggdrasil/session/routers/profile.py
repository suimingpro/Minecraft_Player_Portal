import json
import base64
import os
from fastapi import APIRouter, Response, Query
from src.apps.MicrosoftSSO.database import SessionLocal, Player
from sqlalchemy import select
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization

router = APIRouter()

@router.get("/profile/{uuid}")
async def get_profile(uuid: str, unsigned: str = Query(default="true")):
    uuid_with_dashes = f"{uuid[:8]}-{uuid[8:12]}-{uuid[12:16]}-{uuid[16:20]}-{uuid[20:]}"
    
    async with SessionLocal() as session:
        result = await session.execute(select(Player).where(Player.player_uuid == uuid_with_dashes))
        player = result.scalar_one_or_none()
        
    if not player:
        return Response(status_code=204)
        
    import time
    textures = {
        "timestamp": int(time.time() * 1000),
        "profileId": uuid,
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
    
    if unsigned.lower() != "true":
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
            except Exception as e:
                print("Failed to sign textures:", e)

    return {
        "id": uuid,
        "name": player.minecraft_username,
        "properties": [prop]
    }
