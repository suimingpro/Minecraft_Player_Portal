from datetime import datetime
from sqlalchemy import (
    BigInteger,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    select,
    text,
)
from sqlalchemy.dialects.mysql import (
    ENUM,
    TIMESTAMP,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)
from src.apps.MicrosoftSSO.database import Base, SessionLocal


# ============================================================
# Player model  –  Minecraft player data
# ============================================================

class Player(Base):
    __tablename__ = "players"

    __table_args__ = (
        UniqueConstraint("user_uuid",          name="uk_player_user_uuid"),
        UniqueConstraint("player_uuid",        name="uk_player_uuid"),
        UniqueConstraint("minecraft_username", name="uk_minecraft_username"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True,
        comment="自增主键",
    )
    user_uuid: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.uuid", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        comment="关联的 Portal 用户 UUID",
    )
    player_uuid: Mapped[str | None] = mapped_column(
        String(36), nullable=True,
        comment="Minecraft 游戏内 UUID",
    )
    minecraft_username: Mapped[str | None] = mapped_column(
        String(16), nullable=True,
        comment="Minecraft 游戏内用户名",
    )
    skin_url: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="皮肤材质 URL",
    )
    cape_url: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="披风材质 URL",
    )
    skin_model: Mapped[str] = mapped_column(
        ENUM("default", "slim"), nullable=False,
        server_default=text("'default'"),
        comment="皮肤模型: default(经典) / slim(细手臂)",
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        comment="创建时间",
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, nullable=False,
        server_default=text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        comment="更新时间",
    )


# ============================================================
# Database query & mutation functions
# ============================================================

async def get_player_by_user_uuid(user_uuid: str) -> Player | None:
    """Return the Player row linked to the given user_uuid."""
    async with SessionLocal() as session:
        result = await session.execute(
            select(Player).where(Player.user_uuid == user_uuid)
        )
        return result.scalar_one_or_none()


async def get_player_by_player_uuid(player_uuid: str) -> Player | None:
    """Return the Player row with the given Minecraft player_uuid."""
    async with SessionLocal() as session:
        result = await session.execute(
            select(Player).where(Player.player_uuid == player_uuid)
        )
        return result.scalar_one_or_none()


async def get_player_by_username(minecraft_username: str) -> Player | None:
    """Return the Player row with the given Minecraft username."""
    async with SessionLocal() as session:
        result = await session.execute(
            select(Player).where(
                Player.minecraft_username == minecraft_username
            )
        )
        return result.scalar_one_or_none()


async def get_players_by_user_uuids(user_uuids: list[str]) -> list[Player]:
    """Return all Player rows whose user_uuid is in the given list."""
    if not user_uuids:
        return []
    async with SessionLocal() as session:
        result = await session.execute(
            select(Player).where(Player.user_uuid.in_(user_uuids))
        )
        return list(result.scalars().all())


async def update_player_skin(
    *,
    user_uuid: str,
    skin_url: str | None = None,
    cape_url: str | None = None,
    skin_model: str | None = None,
) -> Player | None:
    """
    Update skin / cape for the player row associated with user_uuid.
    Returns the updated Player, or None if no player row exists.
    """
    async with SessionLocal() as session:
        result = await session.execute(
            select(Player).where(Player.user_uuid == user_uuid)
        )
        player = result.scalar_one_or_none()

        if player is None:
            return None

        if skin_url is not None:
            player.skin_url = skin_url
        if cape_url is not None:
            player.cape_url = cape_url
        if skin_model in ("default", "slim"):
            player.skin_model = skin_model

        await session.commit()
        await session.refresh(player)
        return player


async def create_player(
    *,
    user_uuid: str,
    player_uuid: str | None = None,
    minecraft_username: str | None = None,
    skin_url: str | None = None,
    cape_url: str | None = None,
    skin_model: str = "default",
) -> Player:
    """
    Create a new Player row linked to the given user_uuid.
    Raises IntegrityError if the user already has a player profile
    or if player_uuid / minecraft_username is already taken.
    """
    async with SessionLocal() as session:
        player = Player(
            user_uuid=user_uuid,
            player_uuid=player_uuid,
            minecraft_username=minecraft_username,
            skin_url=skin_url,
            cape_url=cape_url,
            skin_model=skin_model if skin_model in ("default", "slim") else "default",
        )
        session.add(player)
        await session.commit()
        await session.refresh(player)
        return player


async def update_player_account(
    *,
    user_uuid: str,
    player_uuid: str,
    minecraft_username: str,
) -> Player | None:
    """
    Update the basic account mapping (username and player_uuid) for the given user.
    Raises IntegrityError if the username/uuid is taken by another user.
    """
    async with SessionLocal() as session:
        result = await session.execute(
            select(Player).where(Player.user_uuid == user_uuid)
        )
        player = result.scalar_one_or_none()

        if player is None:
            return None

        player.player_uuid = player_uuid
        player.minecraft_username = minecraft_username

        await session.commit()
        await session.refresh(player)

        return player
