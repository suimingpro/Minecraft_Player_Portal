from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.mysql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column
from src.apps.MicrosoftSSO.database import Base


class MinecraftServer(Base):
    __tablename__ = "minecraft_servers"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True,
        comment="服务器唯一ID (UUID)",
    )
    name: Mapped[str] = mapped_column(
        String(128), nullable=False,
        comment="服务器名称",
    )
    description: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="服务器简介",
    )
    address: Mapped[str | None] = mapped_column(
        String(255), nullable=True,
        comment="服务器地址 (IP/域名:端口)",
    )
    icon_url: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="服务器头像/图标URL",
    )
    access_mode: Mapped[str] = mapped_column(
        String(32), nullable=False, default="all",
        comment="限制机制: all(全部), whitelist(白名单), blacklist(黑名单)",
    )
    is_public: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True,
        comment="是否展示在server页: 1展示, 0不展示",
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


class ServerPlayerRule(Base):
    __tablename__ = "server_player_rules"

    __table_args__ = (
        UniqueConstraint("server_id", "player_uuid", "rule_type", name="uk_server_player_rule"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True,
        comment="自增主键",
    )
    server_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("minecraft_servers.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        comment="关联服务器ID",
    )
    player_uuid: Mapped[str] = mapped_column(
        String(36), nullable=False,
        comment="Minecraft玩家UUID",
    )
    player_name: Mapped[str | None] = mapped_column(
        String(64), nullable=True,
        comment="Minecraft玩家用户名",
    )
    rule_type: Mapped[str] = mapped_column(
        String(32), nullable=False, default="whitelist",
        comment="规则类型: whitelist 或 blacklist",
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        comment="添加时间",
    )


def server_to_dict(s: MinecraftServer, extra: dict | None = None) -> dict:
    d = {
        "id": s.id,
        "name": s.name,
        "description": s.description,
        "address": s.address,
        "icon_url": s.icon_url,
        "access_mode": s.access_mode,
        "is_public": bool(s.is_public),
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }
    if extra:
        d.update(extra)
    return d
