import mimetypes
import os
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy import select

from src.apps.MicrosoftSSO.database import SessionLocal
from src.apps.MicrosoftSSO.session import get_session_user_uuid
from src.apps.Player.database import Player
from src.apps.Server.crud import check_player_server_access, get_public_servers

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/auth/api/servers")
async def list_public_servers(request: Request):
    """
    Public server list for all authenticated or guest users.
    Displays server info, access mode, and whether current user has access/whitelist.
    """
    servers = await get_public_servers()

    # Check current user's bound player
    player_uuid = None
    try:
        user_uuid = await get_session_user_uuid(request)
        if user_uuid:
            async with SessionLocal() as db_session:
                p_res = await db_session.execute(
                    select(Player).where(Player.user_uuid == user_uuid)
                )
                db_player = p_res.scalar_one_or_none()
                if db_player and db_player.player_uuid:
                    player_uuid = db_player.player_uuid
    except Exception:
        player_uuid = None

    result = []
    for s in servers:
        server_copy = dict(s)
        if not player_uuid:
            server_copy["has_access"] = s.get("access_mode") == "all"
            server_copy["access_status"] = "no_player"
            server_copy["access_message"] = "未绑定角色"
        else:
            has_acc, status_code = await check_player_server_access(
                server_id=s["id"],
                player_uuid=player_uuid,
            )
            server_copy["has_access"] = has_acc
            server_copy["access_status"] = status_code
            if status_code == "allowed":
                if s.get("access_mode") == "whitelist":
                    server_copy["access_message"] = "已在白名单"
                else:
                    server_copy["access_message"] = "允许加入"
            elif status_code == "not_whitelisted":
                server_copy["access_message"] = "未在白名单"
            elif status_code == "blacklisted":
                server_copy["access_message"] = "已在黑名单"
            else:
                server_copy["access_message"] = "无权限"

        result.append(server_copy)

    return {"servers": result}


@router.get("/auth/api/servers/uploads/{filename}")
async def get_uploaded_server_icon(filename: str):
    """Serve uploaded server icons publicly."""
    safe_filename = os.path.basename(filename)
    if safe_filename != filename or ".." in filename:
        raise HTTPException(status_code=400, detail="无效的文件名")

    filepath = os.path.join(UPLOAD_DIR, safe_filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="图片未找到")

    media_type, _ = mimetypes.guess_type(filepath)
    if not media_type:
        media_type = "image/png"

    return FileResponse(filepath, media_type=media_type)
