from sqlalchemy import delete, select

from src.apps.MicrosoftSSO.database import SessionLocal
from src.apps.Server.crud.server import get_server_by_id
from src.apps.Server.models import MinecraftServer, ServerPlayerRule


async def get_server_player_rules(server_id: str) -> list[dict]:
    async with SessionLocal() as session:
        res = await session.execute(
            select(ServerPlayerRule)
            .where(ServerPlayerRule.server_id == server_id)
            .order_by(ServerPlayerRule.created_at.desc())
        )
        rules = res.scalars().all()
        return [
            {
                "id": r.id,
                "server_id": r.server_id,
                "player_uuid": r.player_uuid,
                "player_name": r.player_name,
                "rule_type": r.rule_type,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rules
        ]


async def add_server_player_rule(
    server_id: str,
    player_uuid: str,
    player_name: str | None = None,
    rule_type: str = "whitelist",
) -> dict:
    puuid = player_uuid.strip().lower()
    pname = player_name.strip() if player_name else None
    rtype = rule_type.strip().lower()
    if rtype not in ("whitelist", "blacklist"):
        rtype = "whitelist"

    async with SessionLocal() as session:
        # Remove any conflicting opposite rule
        opposite_type = "blacklist" if rtype == "whitelist" else "whitelist"
        await session.execute(
            delete(ServerPlayerRule).where(
                ServerPlayerRule.server_id == server_id,
                ServerPlayerRule.player_uuid == puuid,
                ServerPlayerRule.rule_type == opposite_type,
            )
        )

        # Check existing rule
        res = await session.execute(
            select(ServerPlayerRule).where(
                ServerPlayerRule.server_id == server_id,
                ServerPlayerRule.player_uuid == puuid,
                ServerPlayerRule.rule_type == rtype,
            )
        )
        rule = res.scalar_one_or_none()
        if rule:
            if pname and rule.player_name != pname:
                rule.player_name = pname
                await session.commit()
                await session.refresh(rule)
        else:
            rule = ServerPlayerRule(
                server_id=server_id,
                player_uuid=puuid,
                player_name=pname,
                rule_type=rtype,
            )
            session.add(rule)
            await session.commit()
            await session.refresh(rule)

        return {
            "id": rule.id,
            "server_id": rule.server_id,
            "player_uuid": rule.player_uuid,
            "player_name": rule.player_name,
            "rule_type": rule.rule_type,
            "created_at": rule.created_at.isoformat() if rule.created_at else None,
        }


async def remove_server_player_rule(rule_id: int) -> bool:
    async with SessionLocal() as session:
        res = await session.execute(
            select(ServerPlayerRule).where(ServerPlayerRule.id == rule_id)
        )
        rule = res.scalar_one_or_none()
        if not rule:
            return False
        await session.delete(rule)
        await session.commit()
        return True


async def remove_server_player_rule_by_uuid(
    server_id: str, player_uuid: str, rule_type: str | None = None
) -> bool:
    puuid = player_uuid.strip().lower()
    async with SessionLocal() as session:
        stmt = delete(ServerPlayerRule).where(
            ServerPlayerRule.server_id == server_id,
            ServerPlayerRule.player_uuid == puuid,
        )
        if rule_type:
            stmt = stmt.where(ServerPlayerRule.rule_type == rule_type)
        res = await session.execute(stmt)
        await session.commit()
        return res.rowcount > 0


async def check_player_server_access(
    server_id: str,
    player_uuid: str,
    server: MinecraftServer | None = None,
) -> tuple[bool, str]:
    """
    Returns (has_access: bool, status_code: str)
    status_code: 'allowed', 'not_whitelisted', 'blacklisted', 'server_not_found'
    """
    if server is None:
        server = await get_server_by_id(server_id)
        if not server:
            return False, "server_not_found"

    mode = server.access_mode or "all"
    if mode == "all":
        return True, "allowed"

    puuid = player_uuid.strip().lower()
    # Normalize uuid with or without dashes
    puuid_no_dash = puuid.replace("-", "")
    puuid_with_dash = (
        f"{puuid_no_dash[:8]}-{puuid_no_dash[8:12]}-{puuid_no_dash[12:16]}-{puuid_no_dash[16:20]}-{puuid_no_dash[20:]}"
        if len(puuid_no_dash) == 32
        else puuid
    )
    possible_uuids = [puuid, puuid_no_dash, puuid_with_dash]

    async with SessionLocal() as session:
        if mode == "whitelist":
            res = await session.execute(
                select(ServerPlayerRule).where(
                    ServerPlayerRule.server_id == server_id,
                    ServerPlayerRule.player_uuid.in_(possible_uuids),
                    ServerPlayerRule.rule_type == "whitelist",
                )
            )
            found = res.scalar_one_or_none()
            if found:
                return True, "allowed"
            return False, "not_whitelisted"

        elif mode == "blacklist":
            res = await session.execute(
                select(ServerPlayerRule).where(
                    ServerPlayerRule.server_id == server_id,
                    ServerPlayerRule.player_uuid.in_(possible_uuids),
                    ServerPlayerRule.rule_type == "blacklist",
                )
            )
            found = res.scalar_one_or_none()
            if found:
                return False, "blacklisted"
            return True, "allowed"

    return True, "allowed"
