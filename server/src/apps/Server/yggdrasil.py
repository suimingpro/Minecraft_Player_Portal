import base64
import json
import os
import time

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from fastapi import APIRouter, HTTPException, Query, Request, Response
from sqlalchemy import select
from src.apps.MicrosoftSSO.database import SessionLocal
from src.apps.Player.database import Player
from src.apps.Server.database import check_player_server_access, get_server_by_id
from src.apps.Yggdrasil.auth.app import app as auth_app
from src.apps.Yggdrasil.redis import redis_client
from src.apps.Yggdrasil.session.routers.join import JoinRequest
from src.apps.Yggdrasil.session.routers.join import join as ygg_join
from src.apps.Yggdrasil.session.routers.profile import get_profile as ygg_get_profile

router = APIRouter(prefix="/api/yggdrasil/{server_id}")


def get_public_key() -> str:
    candidates = [
        os.path.join("certs", "yggdrasil", "public.pem"),
        os.path.join("server", "certs", "yggdrasil", "public.pem"),
        os.path.join(
            os.path.dirname(__file__),
            "..",
            "..",
            "..",
            "certs",
            "yggdrasil",
            "public.pem",
        ),
    ]
    for p in candidates:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                return f.read()
    return ""


def get_private_key_path() -> str | None:
    candidates = [
        os.path.join("certs", "yggdrasil", "private.pem"),
        os.path.join("server", "certs", "yggdrasil", "private.pem"),
        os.path.join(
            os.path.dirname(__file__),
            "..",
            "..",
            "..",
            "certs",
            "yggdrasil",
            "private.pem",
        ),
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


@router.get("")
@router.get("/")
async def server_yggdrasil_metadata(server_id: str):
    server = await get_server_by_id(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    return {
        "meta": {
            "implementationName": "MinecraftPlayerPortal",
            "implementationVersion": "0.1.0",
            "serverName": server.name,
            "feature.non_email_login": True,
            "feature.enable_profile_key": False,
        },
        "skinDomains": [
            "localhost",
            "127.0.0.1",
        ],
        "signaturePublickey": get_public_key(),
    }


@router.get("/sessionserver/session/minecraft/hasJoined")
async def server_has_joined(
    server_id: str,
    username: str,
    serverId: str,
    ip: str | None = Query(default=None),
):
    """
    Game server verifies joining player through this endpoint.
    Enforces server-specific access control (all / whitelist / blacklist).
    """
    server = await get_server_by_id(server_id)
    if not server:
        return Response(status_code=204)

    key = f"yggdrasil:join:{serverId}"
    raw = await redis_client.get(key)
    if raw is None:
        return Response(status_code=204)

    session_data = json.loads(raw)
    if session_data.get("username") != username:
        return Response(status_code=204)

    if ip is not None and session_data.get("ip") and session_data["ip"] != ip:
        return Response(status_code=204)

    player_uuid = session_data["profile"]
    uuid_with_dashes = f"{player_uuid[:8]}-{player_uuid[8:12]}-{player_uuid[12:16]}-{player_uuid[16:20]}-{player_uuid[20:]}"

    # Access control verification
    has_access, reason = await check_player_server_access(
        server_id=server_id,
        player_uuid=uuid_with_dashes,
        server=server,
    )
    if not has_access:
        print(
            f"[Yggdrasil {server.name}] Player {username} ({uuid_with_dashes}) rejected: {reason}"
        )
        return Response(status_code=204)

    # Fetch player details
    async with SessionLocal() as db_session:
        result = await db_session.execute(
            select(Player).where(Player.player_uuid == uuid_with_dashes)
        )
        player = result.scalar_one_or_none()

    if not player:
        return Response(status_code=204)

    textures = {
        "timestamp": int(time.time() * 1000),
        "profileId": player_uuid,
        "profileName": player.minecraft_username,
        "textures": {},
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
        "value": textures_b64,
    }

    priv_path = get_private_key_path()
    if priv_path and os.path.exists(priv_path):
        try:
            with open(priv_path, "rb") as f:
                private_key = serialization.load_pem_private_key(
                    f.read(), password=None
                )
            signature = private_key.sign(
                textures_b64.encode("utf-8"),
                padding.PKCS1v15(),
                hashes.SHA1(),
            )
            prop["signature"] = base64.b64encode(signature).decode("utf-8")
        except Exception as e:
            print("Failed to sign textures in server_has_joined:", e)

    return {
        "id": player_uuid,
        "name": player.minecraft_username,
        "properties": [prop],
    }


@router.post("/sessionserver/session/minecraft/join")
async def server_join(server_id: str, body: JoinRequest, request: Request):
    return await ygg_join(body, request)


@router.get("/sessionserver/session/minecraft/profile/{uuid}")
async def server_profile(
    server_id: str, uuid: str, unsigned: str = Query(default="true")
):
    return await ygg_get_profile(uuid, unsigned)


@router.api_route("/authserver/{sub_path:path}", methods=["GET", "POST"])
async def server_authserver_proxy(server_id: str, sub_path: str, request: Request):
    """
    Mount/forward authserver calls (authenticate, refresh, validate, etc.)
    if client uses server-specific endpoint.
    """

    # Simply call the auth_app router directly
    return await auth_app(request.scope, request.receive, request._send)
