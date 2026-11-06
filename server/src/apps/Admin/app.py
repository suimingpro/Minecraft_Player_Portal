import hashlib
import uuid
import json
import os
import random
import string
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import delete, func, select

from src.apps.MicrosoftSSO.database import (
    GroupMapping,
    get_raw_user_groups,
    SessionLocal,
    User,
    check_user_is_admin,
    delete_group_mapping,
    get_admin_groups,
    get_all_group_mappings,
    get_user_groups,
    upsert_group_mapping,
    DEFAULT_APP_NAME,
    get_app_name,
    set_system_setting,
)
from src.apps.MicrosoftSSO.session import get_session_user_uuid, redis
from src.apps.Player.database import Player

router = APIRouter(prefix="/auth/api/admin", tags=["Admin"])


async def require_admin(request: Request) -> str:
    """
    Ensure the current request is from an authenticated user whose
    Microsoft group Object ID matches ADMIN_GROUPS in .env.
    Raises 401 if unauthenticated, 403 if unauthorized.
    """
    user_uuid = await get_session_user_uuid(request)
    async with SessionLocal() as db_session:
        res = await db_session.execute(select(User).where(User.uuid == user_uuid))
        db_user = res.scalar_one_or_none()
        if not db_user:
            raise HTTPException(status_code=401, detail="User not found")
        if not check_user_is_admin(db_user):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Admin access required",
            )
    return user_uuid


# ============================================================
# GET /auth/api/admin/stats
# ============================================================

@router.get("/stats")
async def get_admin_stats(_admin_uuid: str = Depends(require_admin)):
    """Return system overview statistics."""
    async with SessionLocal() as db_session:
        users_count_res = await db_session.execute(select(func.count(User.uuid)))
        total_users = users_count_res.scalar() or 0

        players_count_res = await db_session.execute(select(func.count(Player.id)))
        total_players = players_count_res.scalar() or 0

    session_keys = await redis.keys("portal:session:*")
    active_sessions = len(session_keys) if session_keys else 0

    mappings = await get_all_group_mappings()

    return {
        "total_users": total_users,
        "total_players": total_players,
        "active_sessions": active_sessions,
        "admin_groups": get_admin_groups(),
        "group_mappings_count": len(mappings),
    }


# ============================================================
# GET /auth/api/admin/users
# ============================================================

@router.get("/users")
async def list_admin_users(_admin_uuid: str = Depends(require_admin)):
    """List all registered Portal users with their player profiles and groups."""
    async with SessionLocal() as db_session:
        users_res = await db_session.execute(
            select(User).order_by(User.created_at.desc())
        )
        users = list(users_res.scalars().all())

        players_res = await db_session.execute(select(Player))
        players_by_user = {p.user_uuid: p for p in players_res.scalars().all()}

        mappings_res = await db_session.execute(select(GroupMapping))
        all_mappings = mappings_res.scalars().all()
        group_map = {m.group_id.strip().lower(): m.group_name.strip() for m in all_mappings}
        group_colors = {m.group_id.strip().lower(): (m.group_color or "blue") for m in all_mappings}

    user_list = []
    for u in users:
        p = players_by_user.get(u.uuid)
        raw_oids = get_raw_user_groups(u)
        user_groups = [group_map[oid.lower()] for oid in raw_oids if oid.lower() in group_map]
        user_group_details = [
            {
                "id": oid,
                "name": group_map[oid.lower()],
                "color": group_colors.get(oid.lower(), "blue"),
            }
            for oid in raw_oids if oid.lower() in group_map
        ]
        user_list.append(
            {
                "uuid": u.uuid,
                "email": u.email,
                "display_name": u.display_name,
                "microsoft_oid": u.microsoft_oid,
                "microsoft_tid": u.microsoft_tid,
                "groups": user_groups,
                "group_details": user_group_details,
                "is_admin": check_user_is_admin(u),
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
                "player": (
                    {
                        "player_uuid": p.player_uuid,
                        "minecraft_username": p.minecraft_username,
                        "skin_url": p.skin_url,
                        "cape_url": p.cape_url,
                        "skin_model": p.skin_model,
                        "created_at": p.created_at.isoformat() if p.created_at else None,
                    }
                    if p
                    else None
                ),
            }
        )

    return {"users": user_list, "total": len(user_list)}


# ============================================================
# Group Mappings Management
# ============================================================

class GroupMappingRequest(BaseModel):
    group_id: str
    group_name: str
    group_color: str | None = "blue" 


@router.get("/group-mappings")
async def list_group_mappings(_admin_uuid: str = Depends(require_admin)):
    """List all configured Microsoft Entra group Object ID to name mappings."""
    mappings = await get_all_group_mappings()
    return {"mappings": mappings, "total": len(mappings)}


@router.post("/group-mappings")
async def create_or_update_group_mapping(
    body: GroupMappingRequest,
    _admin_uuid: str = Depends(require_admin),
):
    """Add or update a Microsoft Entra group Object ID to name mapping."""
    gid = body.group_id.strip()
    gname = body.group_name.strip()
    gcolor = (body.group_color or "blue").strip()
    if not gid or not gname:
        raise HTTPException(status_code=400, detail="Group ID and name cannot be empty")

    mapping = await upsert_group_mapping(gid, gname, gcolor)
    return {"success": True, "mapping": mapping}


@router.delete("/group-mappings/{group_id}")
async def remove_group_mapping(
    group_id: str,
    _admin_uuid: str = Depends(require_admin),
):
    """Delete a Microsoft Entra group Object ID to name mapping."""
    deleted = await delete_group_mapping(group_id.strip())
    if not deleted:
        raise HTTPException(status_code=404, detail="Group mapping not found")
    return {"success": True, "message": f"Mapping for {group_id} removed"}



# ============================================================
# System Settings Management
# ============================================================

class AdminSettingsRequest(BaseModel):
    app_name: str | None = None


@router.get("/settings")
async def get_admin_settings(_admin_uuid: str = Depends(require_admin)):
    """Return system settings for admin management."""
    app_name = await get_app_name()
    return {
        "app_name": app_name,
    }


@router.post("/settings")
async def update_admin_settings(
    body: AdminSettingsRequest,
    _admin_uuid: str = Depends(require_admin),
):
    """Update system settings (such as app_name)."""
    raw_name = (body.app_name or "").strip()
    new_app_name = raw_name if raw_name else DEFAULT_APP_NAME
    await set_system_setting("app_name", new_app_name)
    return {
        "success": True,
        "app_name": new_app_name,
    }


# ============================================================
# User Operations
# ============================================================

@router.post("/users/{user_uuid}/unbind-player")
async def unbind_player(user_uuid: str, _admin_uuid: str = Depends(require_admin)):
    """Unbind (delete) the Minecraft player profile for the specified user."""
    async with SessionLocal() as db_session:
        res = await db_session.execute(select(Player).where(Player.user_uuid == user_uuid))
        player = res.scalar_one_or_none()
        if not player:
            raise HTTPException(status_code=404, detail="Player binding not found")

        await db_session.execute(delete(Player).where(Player.user_uuid == user_uuid))
        await db_session.commit()

    return {"success": True, "message": f"Successfully unbound player for user {user_uuid}"}


@router.post("/users/{user_uuid}/reset-password")
async def admin_reset_password(user_uuid: str, _admin_uuid: str = Depends(require_admin)):
    """Admin resets launcher password for the specified user."""
    new_password = "".join(random.choices(string.ascii_letters + string.digits, k=10))

    async with SessionLocal() as db_session:
        res = await db_session.execute(select(User).where(User.uuid == user_uuid))
        db_user = res.scalar_one_or_none()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        db_user.launcher_password = new_password
        await db_session.commit()

    return {"success": True, "launcher_password": new_password}


class AdminUpdateUserPlayerRequest(BaseModel):
    display_name: str | None = None
    minecraft_username: str
    player_uuid: str | None = None
    skin_model: str = "default"
    skin_url: str | None = None
    cape_url: str | None = None


def generate_offline_player_uuid(username: str) -> str:
    md5 = hashlib.md5(f"OfflinePlayer:{username}".encode("utf-8")).digest()
    byte_arr = bytearray(md5)
    byte_arr[6] = (byte_arr[6] & 0x0F) | 0x30  # RFC 4122 version 3
    byte_arr[8] = (byte_arr[8] & 0x3F) | 0x80  # RFC 4122 variant 1
    return str(uuid.UUID(bytes=bytes(byte_arr)))


@router.put("/users/{user_uuid}/player")
async def admin_update_user_player(
    user_uuid: str,
    body: AdminUpdateUserPlayerRequest,
    _admin_uuid: str = Depends(require_admin),
):
    """Admin updates or binds a Minecraft player profile for a user."""
    mc_user = body.minecraft_username.strip()
    if not mc_user or len(mc_user) > 16:
        raise HTTPException(status_code=400, detail="Minecraft 用户名长度须在 1 到 16 个字符之间")

    raw_uuid = (body.player_uuid or "").strip().lower()
    if raw_uuid:
        cleaned_hex = raw_uuid.replace("-", "")
        if len(cleaned_hex) != 32:
            raise HTTPException(status_code=400, detail="UUID 格式无效，须为 32 位十六进制或标准 36 位 UUID")
        try:
            mc_uuid = str(uuid.UUID(cleaned_hex))
        except ValueError:
            raise HTTPException(status_code=400, detail="UUID 格式无效")
    else:
        mc_uuid = generate_offline_player_uuid(mc_user)

    skin_model = body.skin_model if body.skin_model in ("default", "slim") else "default"
    skin_url = body.skin_url.strip() if body.skin_url and body.skin_url.strip() else None
    cape_url = body.cape_url.strip() if body.cape_url and body.cape_url.strip() else None

    async with SessionLocal() as db_session:
        user_res = await db_session.execute(select(User).where(User.uuid == user_uuid))
        db_user = user_res.scalar_one_or_none()
        if not db_user:
            raise HTTPException(status_code=404, detail="目标用户不存在")

        if body.display_name is not None:
            db_user.display_name = body.display_name.strip() or None

        # Check username collision with other users
        uname_res = await db_session.execute(
            select(Player).where(
                Player.minecraft_username == mc_user,
                Player.user_uuid != user_uuid,
            )
        )
        if uname_res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Minecraft 用户名 '{mc_user}' 已被其他用户绑定")

        # Check UUID collision with other users
        uuid_res = await db_session.execute(
            select(Player).where(
                Player.player_uuid == mc_uuid,
                Player.user_uuid != user_uuid,
            )
        )
        if uuid_res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"玩家 UUID '{mc_uuid}' 已被其他用户占用")

        # Upsert Player profile
        player_res = await db_session.execute(select(Player).where(Player.user_uuid == user_uuid))
        player = player_res.scalar_one_or_none()

        if player:
            player.minecraft_username = mc_user
            player.player_uuid = mc_uuid
            player.skin_model = skin_model
            player.skin_url = skin_url
            player.cape_url = cape_url
        else:
            player = Player(
                user_uuid=user_uuid,
                minecraft_username=mc_user,
                player_uuid=mc_uuid,
                skin_model=skin_model,
                skin_url=skin_url,
                cape_url=cape_url,
            )
            db_session.add(player)

        await db_session.commit()
        await db_session.refresh(player)

    return {
        "success": True,
        "player": {
            "player_uuid": player.player_uuid,
            "minecraft_username": player.minecraft_username,
            "skin_model": player.skin_model,
            "skin_url": player.skin_url,
            "cape_url": player.cape_url,
        },
    }
