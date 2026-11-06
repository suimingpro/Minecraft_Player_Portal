from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from src.apps.Admin.app import require_admin
from src.apps.MicrosoftSSO.database import SessionLocal
from src.apps.Player.database import Player
from src.apps.Server.crud import (
    add_server_player_rule,
    get_server_by_id,
    get_server_player_rules,
    remove_server_player_rule,
    remove_server_player_rule_by_uuid,
)
from src.apps.Server.schemas import (
    BatchAddServerPlayersRequest,
    ServerPlayerRuleRequest,
    UserAddToWhitelistRequest,
)

router = APIRouter()


@router.get("/auth/api/admin/servers/{server_id}/players")
async def admin_get_server_players(
    server_id: str,
    admin_uuid: str = Depends(require_admin),
):
    """Get all player rules (whitelist/blacklist) for a server."""
    server = await get_server_by_id(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="服务器未找到")
    rules = await get_server_player_rules(server_id)
    return {"server_id": server_id, "rules": rules}


@router.post("/auth/api/admin/servers/{server_id}/players")
async def admin_add_server_player(
    server_id: str,
    body: ServerPlayerRuleRequest,
    admin_uuid: str = Depends(require_admin),
):
    """Add a player to server whitelist or blacklist."""
    server = await get_server_by_id(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="服务器未找到")

    rule = await add_server_player_rule(
        server_id=server_id,
        player_uuid=body.player_uuid,
        player_name=body.player_name,
        rule_type=body.rule_type,
    )
    return {"success": True, "rule": rule}


@router.delete("/auth/api/admin/servers/{server_id}/players/{rule_id}")
async def admin_remove_server_player(
    server_id: str,
    rule_id: int,
    admin_uuid: str = Depends(require_admin),
):
    """Remove a player rule from a server."""
    removed = await remove_server_player_rule(rule_id)
    if not removed:
        raise HTTPException(status_code=404, detail="规则记录未找到")
    return {"success": True}


@router.delete("/auth/api/admin/servers/{server_id}/players/by-uuid/{player_uuid}")
async def admin_remove_server_player_by_uuid(
    server_id: str,
    player_uuid: str,
    admin_uuid: str = Depends(require_admin),
):
    """Remove a player rule from a server by player UUID."""
    removed = await remove_server_player_rule_by_uuid(server_id, player_uuid)
    return {"success": True, "removed": removed}


@router.post("/auth/api/admin/servers/{server_id}/players/batch")
async def admin_batch_add_server_players(
    server_id: str,
    body: BatchAddServerPlayersRequest,
    admin_uuid: str = Depends(require_admin),
):
    """Batch add multiple players to server whitelist or blacklist."""
    server = await get_server_by_id(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="服务器未找到")

    added = []
    for p in body.players:
        rule = await add_server_player_rule(
            server_id=server_id,
            player_uuid=p.player_uuid,
            player_name=p.player_name,
            rule_type=p.rule_type,
        )
        added.append(rule)

    return {"success": True, "count": len(added)}


@router.post("/auth/api/admin/users/{user_uuid}/whitelist")
async def admin_quick_add_user_to_whitelist(
    user_uuid: str,
    body: UserAddToWhitelistRequest,
    admin_uuid: str = Depends(require_admin),
):
    """
    Quickly add a user's bound Minecraft player to one or more server whitelists.
    """
    async with SessionLocal() as db_session:
        res = await db_session.execute(
            select(Player).where(Player.user_uuid == user_uuid)
        )
        player = res.scalar_one_or_none()

    if not player or not player.player_uuid:
        raise HTTPException(
            status_code=400,
            detail="该用户尚未绑定 Minecraft 角色，无法加入白名单",
        )

    added_servers = []
    for sid in body.server_ids:
        server = await get_server_by_id(sid)
        if server:
            await add_server_player_rule(
                server_id=sid,
                player_uuid=player.player_uuid,
                player_name=player.minecraft_username,
                rule_type="whitelist",
            )
            added_servers.append(sid)

    return {
        "success": True,
        "player_username": player.minecraft_username,
        "player_uuid": player.player_uuid,
        "added_servers": added_servers,
    }
