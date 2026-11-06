import uuid
from sqlalchemy import func, select

from src.apps.MicrosoftSSO.database import SessionLocal
from src.apps.Server.models import (
    MinecraftServer,
    ServerPlayerRule,
    server_to_dict,
)


async def create_server(
    name: str,
    description: str | None = None,
    address: str | None = None,
    icon_url: str | None = None,
    access_mode: str = "all",
    is_public: bool = True,
) -> dict:
    server_id = str(uuid.uuid4())
    async with SessionLocal() as session:
        server = MinecraftServer(
            id=server_id,
            name=name.strip(),
            description=description.strip() if description else None,
            address=address.strip() if address else None,
            icon_url=icon_url.strip() if icon_url else None,
            access_mode=access_mode.strip() if access_mode in ("all", "whitelist", "blacklist") else "all",
            is_public=bool(is_public),
        )
        session.add(server)
        await session.commit()
        await session.refresh(server)
        return server_to_dict(server)


async def get_server_by_id(server_id: str) -> MinecraftServer | None:
    async with SessionLocal() as session:
        res = await session.execute(
            select(MinecraftServer).where(MinecraftServer.id == server_id)
        )
        return res.scalar_one_or_none()


async def get_all_servers_with_stats() -> list[dict]:
    async with SessionLocal() as session:
        res = await session.execute(
            select(MinecraftServer).order_by(MinecraftServer.created_at.desc())
        )
        servers = res.scalars().all()
        result = []
        for s in servers:
            wl_res = await session.execute(
                select(func.count(ServerPlayerRule.id)).where(
                    ServerPlayerRule.server_id == s.id,
                    ServerPlayerRule.rule_type == "whitelist",
                )
            )
            bl_res = await session.execute(
                select(func.count(ServerPlayerRule.id)).where(
                    ServerPlayerRule.server_id == s.id,
                    ServerPlayerRule.rule_type == "blacklist",
                )
            )
            extra = {
                "whitelist_count": wl_res.scalar() or 0,
                "blacklist_count": bl_res.scalar() or 0,
            }
            result.append(server_to_dict(s, extra))
        return result


async def get_public_servers() -> list[dict]:
    async with SessionLocal() as session:
        res = await session.execute(
            select(MinecraftServer)
            .where(MinecraftServer.is_public == True)
            .order_by(MinecraftServer.created_at.desc())
        )
        servers = res.scalars().all()
        return [server_to_dict(s) for s in servers]


async def update_server(
    server_id: str,
    name: str | None = None,
    description: str | None = None,
    address: str | None = None,
    icon_url: str | None = None,
    access_mode: str | None = None,
    is_public: bool | None = None,
) -> dict | None:
    async with SessionLocal() as session:
        res = await session.execute(
            select(MinecraftServer).where(MinecraftServer.id == server_id)
        )
        server = res.scalar_one_or_none()
        if not server:
            return None

        if name is not None:
            server.name = name.strip()
        if description is not None:
            server.description = description.strip() if description else None
        if address is not None:
            server.address = address.strip() if address else None
        if icon_url is not None:
            server.icon_url = icon_url.strip() if icon_url else None
        if access_mode is not None and access_mode in ("all", "whitelist", "blacklist"):
            server.access_mode = access_mode
        if is_public is not None:
            server.is_public = bool(is_public)

        await session.commit()
        await session.refresh(server)
        return server_to_dict(server)


async def delete_server(server_id: str) -> bool:
    async with SessionLocal() as session:
        res = await session.execute(
            select(MinecraftServer).where(MinecraftServer.id == server_id)
        )
        server = res.scalar_one_or_none()
        if not server:
            return False
        await session.delete(server)
        await session.commit()
        return True
