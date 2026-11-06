import json
import os
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from sqlalchemy import (
    BigInteger,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    select,
    text,
    func,
)
from sqlalchemy.dialects.mysql import (
    ENUM,
    TIMESTAMP,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
)

# ============================================================
# Environment
# ============================================================

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("Environment variable DATABASE_URL is required")


# ============================================================
# Engine
# ============================================================

engine = create_async_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
)


# ============================================================
# Base
# ============================================================

class Base(
    AsyncAttrs,
    DeclarativeBase,
):
    pass


# ============================================================
# User model  –  identity / authentication data only
# ============================================================

class User(Base):
    __tablename__ = "users"

    __table_args__ = (
        UniqueConstraint("microsoft_oid", name="uk_microsoft_oid"),
        UniqueConstraint("email",         name="uk_email"),
        Index("idx_userid", "userid"),
    )

    uuid: Mapped[str] = mapped_column(
        String(36), primary_key=True,
        comment="Portal 内部用户 UUID",
    )
    userid: Mapped[str | None] = mapped_column(
        String(64), nullable=True,
        comment="用户自定义 / 平台 User ID",
    )
    microsoft_oid: Mapped[str | None] = mapped_column(
        String(64), nullable=True,
        comment="Microsoft Entra Object ID",
    )
    microsoft_tid: Mapped[str | None] = mapped_column(
        String(64), nullable=True,
        comment="Microsoft Entra Tenant ID",
    )
    email: Mapped[str | None] = mapped_column(
        String(255), nullable=True,
        comment="用户邮箱",
    )
    display_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True,
        comment="显示名称",
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
    last_login_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP, nullable=True, default=None,
        comment="最后登录时间",
    )
    launcher_password: Mapped[str | None] = mapped_column(
        String(64), nullable=True,
        comment="启动器独立密码",
    )
    groups: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="用户所属组 (JSON 数组)",
    )



class SystemSetting(Base):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(
        String(64), primary_key=True,
        comment="系统配置键名",
    )
    value: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="系统配置值",
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

class GroupMapping(Base):
    __tablename__ = "group_mappings"

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True,
        comment="自增主键",
    )
    group_id: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False,
        comment="Microsoft Entra Group Object ID (GUID)",
    )
    group_name: Mapped[str] = mapped_column(
        String(128), nullable=False,
        comment="显示名称",
    )
    group_color: Mapped[str | None] = mapped_column(
        String(32), nullable=True, default="blue",
        comment="标签颜色",
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
# Helpers
# ============================================================

def utc_now_naive() -> datetime:
    """
    MariaDB TIMESTAMP is stored without Python timezone info.
    Generate current UTC time without tzinfo.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def is_guid_string(val: str) -> bool:
    import re
    return bool(
        re.match(
            r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
            val.strip(),
        )
    )


_group_mapping_cache: dict[str, str] = {}


def get_cached_group_map() -> dict[str, str]:
    global _group_mapping_cache
    return _group_mapping_cache


async def refresh_group_mapping_cache() -> dict[str, str]:
    global _group_mapping_cache
    async with SessionLocal() as session:
        res = await session.execute(select(GroupMapping))
        mappings = res.scalars().all()
        _group_mapping_cache = {m.group_id.strip(): m.group_name.strip() for m in mappings}
        return _group_mapping_cache


async def get_all_group_mappings() -> list[dict]:
    await refresh_group_mapping_cache()

    async with SessionLocal() as session:
        res = await session.execute(select(GroupMapping).order_by(GroupMapping.id.asc()))
        mappings = res.scalars().all()
        return [
            {
                "id": m.id,
                "group_id": m.group_id,
                "group_name": m.group_name,
                "group_color": m.group_color or "blue",
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "updated_at": m.updated_at.isoformat() if m.updated_at else None,
            }
            for m in mappings
        ]


async def upsert_group_mapping(group_id: str, group_name: str, group_color: str | None = None) -> dict:
    group_id = group_id.strip()
    group_name = group_name.strip()
    color = group_color.strip() if group_color and str(group_color).strip() else "blue"
    async with SessionLocal() as session:
        res = await session.execute(
            select(GroupMapping).where(GroupMapping.group_id == group_id)
        )
        mapping = res.scalar_one_or_none()
        if mapping:
            mapping.group_name = group_name
            mapping.group_color = color
        else:
            mapping = GroupMapping(group_id=group_id, group_name=group_name, group_color=color)
            session.add(mapping)
        await session.commit()
        await session.refresh(mapping)
        result = {
            "id": mapping.id,
            "group_id": mapping.group_id,
            "group_name": mapping.group_name,
            "group_color": mapping.group_color or "blue",
            "created_at": mapping.created_at.isoformat() if mapping.created_at else None,
            "updated_at": mapping.updated_at.isoformat() if mapping.updated_at else None,
        }

    await refresh_group_mapping_cache()

    return result


async def delete_group_mapping(group_id: str) -> bool:
    group_id = group_id.strip()
    async with SessionLocal() as session:
        res = await session.execute(
            select(GroupMapping).where(GroupMapping.group_id == group_id)
        )
        mapping = res.scalar_one_or_none()
        if not mapping:
            return False
        await session.delete(mapping)
        await session.commit()

    await refresh_group_mapping_cache()

    return True



DEFAULT_APP_NAME = "Minecraft Player Portal"
_system_settings_cache: dict[str, str] = {}


async def refresh_system_settings_cache() -> dict[str, str]:
    global _system_settings_cache
    async with SessionLocal() as session:
        res = await session.execute(select(SystemSetting))
        settings = res.scalars().all()
        _system_settings_cache = {s.key.strip(): s.value for s in settings}
        return _system_settings_cache


async def get_system_setting(key: str, default: str = "") -> str:
    global _system_settings_cache
    if not _system_settings_cache:
        await refresh_system_settings_cache()

    # Clean up existing users.groups to ensure ONLY Object IDs (GUIDs) are stored
    async with SessionLocal() as session:
        try:
            mappings_res = await session.execute(select(GroupMapping))
            name_to_gid = {m.group_name.strip(): m.group_id.strip() for m in mappings_res.scalars().all()}

            users_res = await session.execute(select(User))
            users = users_res.scalars().all()
            for u in users:
                raw_groups = get_raw_user_groups(u)
                if not raw_groups:
                    continue
                clean_oids = []
                changed = False
                for g in raw_groups:
                    if is_guid_string(g):
                        if g not in clean_oids:
                            clean_oids.append(g)
                    elif g in name_to_gid:
                        gid = name_to_gid[g]
                        if gid not in clean_oids:
                            clean_oids.append(gid)
                        changed = True
                    else:
                        changed = True

                if changed or len(clean_oids) != len(raw_groups):
                    u.groups = json.dumps(clean_oids, ensure_ascii=False)
            await session.commit()
        except Exception as e:
            print("[init_db] users.groups cleanup error:", e)

    return _system_settings_cache.get(key, default)


async def set_system_setting(key: str, value: str) -> str:
    global _system_settings_cache
    key = key.strip()
    value = value.strip()
    async with SessionLocal() as session:
        res = await session.execute(
            select(SystemSetting).where(SystemSetting.key == key)
        )
        setting = res.scalar_one_or_none()
        if setting:
            setting.value = value
        else:
            setting = SystemSetting(key=key, value=value)
            session.add(setting)
        await session.commit()
    _system_settings_cache[key] = value
    return value


async def get_app_name() -> str:
    val = await get_system_setting("app_name", "")
    return val if val else DEFAULT_APP_NAME


def get_raw_user_groups(db_user: User) -> list[str]:
    if not getattr(db_user, "groups", None):
        return []
    try:
        data = json.loads(db_user.groups)
        if isinstance(data, list):
            return [str(item).strip() for item in data if item and str(item).strip()]
        elif str(data).strip():
            return [str(data).strip()]
    except Exception:
        return [g.strip() for g in db_user.groups.split(",") if g.strip()]
    return []


async def get_user_groups_async(db_user: User, session=None) -> list[str]:
    """
    Query group_mappings table directly to resolve the user's Object IDs to friendly group names.
    Only Object IDs that have a configured mapping in group_mappings are returned.
    """
    raw_oids = get_raw_user_groups(db_user)
    if not raw_oids:
        return []

    # Ensure only valid Object IDs are queried
    valid_oids = [oid for oid in raw_oids if is_guid_string(oid)]
    if not valid_oids:
        return []

    if session is not None:
        res = await session.execute(
            select(GroupMapping).where(GroupMapping.group_id.in_(valid_oids))
        )
        mappings = res.scalars().all()
    else:
        async with SessionLocal() as s:
            res = await s.execute(
                select(GroupMapping).where(GroupMapping.group_id.in_(valid_oids))
            )
            mappings = res.scalars().all()

    mapping_dict = {m.group_id.strip().lower(): m.group_name.strip() for m in mappings}
    result: list[str] = []
    for oid in valid_oids:
        name = mapping_dict.get(oid.strip().lower())
        if name and name not in result:
            result.append(name)
    return result


async def get_user_group_details_async(db_user: User, session=None) -> list[dict]:
    """
    Return list of {id, name, color} for user's configured groups.
    """
    raw_oids = get_raw_user_groups(db_user)
    if not raw_oids:
        return []

    valid_oids = [oid for oid in raw_oids if is_guid_string(oid)]
    if not valid_oids:
        return []

    if session is not None:
        res = await session.execute(
            select(GroupMapping).where(GroupMapping.group_id.in_(valid_oids))
        )
        mappings = res.scalars().all()
    else:
        async with SessionLocal() as s:
            res = await s.execute(
                select(GroupMapping).where(GroupMapping.group_id.in_(valid_oids))
            )
            mappings = res.scalars().all()

    mapping_by_id = {m.group_id.strip().lower(): m for m in mappings}
    details = []
    seen = set()
    for oid in valid_oids:
        m = mapping_by_id.get(oid.strip().lower())
        if m and m.group_name.strip() not in seen:
            seen.add(m.group_name.strip())
            details.append({
                "id": m.group_id.strip(),
                "name": m.group_name.strip(),
                "color": m.group_color or "blue",
            })
    return details


def get_user_groups(db_user: User) -> list[str]:
    """
    Synchronous helper resolving Object IDs to mapped group names via cached group mappings.
    """
    raw_oids = get_raw_user_groups(db_user)
    if not raw_oids:
        return []

    group_map = {k.lower(): v for k, v in get_cached_group_map().items()}
    result: list[str] = []
    for oid in raw_oids:
        name = group_map.get(oid.strip().lower())
        if name and name not in result:
            result.append(name)
    return result


def get_admin_groups() -> list[str]:
    raw = os.getenv("ADMIN_GROUPS", "").strip()
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return [str(x).strip().lower() for x in data if str(x).strip()]
    except Exception:
        pass
    return [x.strip().lower() for x in raw.split(",") if x.strip()]


def check_user_is_admin(db_user: User) -> bool:
    """
    Check if the user has admin rights.
    Compares the user's raw Entra Group Object IDs against ADMIN_GROUPS in .env.
    """
    admin_groups = get_admin_groups()
    if not admin_groups:
        return False

    raw_oids = [g.lower() for g in get_raw_user_groups(db_user)]
    admin_oids = set(g.lower() for g in admin_groups)

    # 1. Direct match on Object ID
    if any(oid in admin_oids for oid in raw_oids):
        return True

    # 2. Match via group_mappings
    group_map = get_cached_group_map()
    user_mapped_names = set(group_map[oid].lower() for oid in raw_oids if oid in group_map)
    for ag in admin_oids:
        if ag in user_mapped_names:
            return True
        for gid, gname in group_map.items():
            if gname.lower() == ag and gid.lower() in raw_oids:
                return True

    return False


# ============================================================
# Database initialization
# ============================================================

async def init_db():
    """
    Automatically create all missing tables.
    Existing tables are left untouched.
    """
    # Ensure all application models across all modules are loaded into Base.metadata
    from src.apps.Player.database import Player  # noqa: F401
    from src.apps.Server.models import MinecraftServer, ServerPlayerRule  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # 1. users table schema compatibility
        res = await conn.execute(
            text(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'groups'"
            )
        )
        if res.scalar() == 0:
            await conn.execute(
                text("ALTER TABLE users ADD COLUMN groups TEXT NULL COMMENT '用户所属组(JSON)'")
            )

        # 2. group_mappings table schema compatibility
        res_col = await conn.execute(
            text(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_mappings' AND COLUMN_NAME = 'group_color'"
            )
        )
        if res_col.scalar() == 0:
            await conn.execute(
                text("ALTER TABLE group_mappings ADD COLUMN group_color VARCHAR(32) NULL DEFAULT 'blue' COMMENT '标签颜色'")
            )

        # 3. minecraft_servers table schema compatibility
        server_cols = [
            ("access_mode", "VARCHAR(32) NOT NULL DEFAULT 'all'", "限制机制: all(全部), whitelist(白名单), blacklist(黑名单)"),
            ("is_public", "TINYINT(1) NOT NULL DEFAULT 1", "是否展示在server页: 1展示, 0不展示"),
            ("address", "VARCHAR(255) NULL", "服务器地址"),
            ("icon_url", "TEXT NULL", "服务器头像URL"),
            ("description", "TEXT NULL", "服务器简介"),
        ]
        for col_name, col_def, col_comment in server_cols:
            c_res = await conn.execute(
                text(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS "
                    f"WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'minecraft_servers' AND COLUMN_NAME = '{col_name}'"
                )
            )
            if c_res.scalar() == 0:
                await conn.execute(
                    text(f"ALTER TABLE minecraft_servers ADD COLUMN {col_name} {col_def} COMMENT '{col_comment}'")
                )

        # 4. server_player_rules table schema compatibility
        rule_cols = [
            ("player_name", "VARCHAR(64) NULL", "Minecraft玩家用户名"),
            ("rule_type", "VARCHAR(32) NOT NULL DEFAULT 'whitelist'", "规则类型: whitelist 或 blacklist"),
        ]
        for col_name, col_def, col_comment in rule_cols:
            r_res = await conn.execute(
                text(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS "
                    f"WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'server_player_rules' AND COLUMN_NAME = '{col_name}'"
                )
            )
            if r_res.scalar() == 0:
                await conn.execute(
                    text(f"ALTER TABLE server_player_rules ADD COLUMN {col_name} {col_def} COMMENT '{col_comment}'")
                )

    await refresh_group_mapping_cache()

    # Auto-seed system_settings app_name if not present
    async with SessionLocal() as session:
        try:
            res = await session.execute(
                select(SystemSetting).where(SystemSetting.key == "app_name")
            )
            setting = res.scalar_one_or_none()
            if not setting:
                env_app_name = os.getenv("APP_NAME", "").strip()
                initial_app_name = env_app_name if env_app_name else DEFAULT_APP_NAME
                session.add(SystemSetting(key="app_name", value=initial_app_name))
                await session.commit()
        except Exception as e:
            print("[init_db] system_settings seed error:", e)

    await refresh_system_settings_cache()



# ============================================================
# Get or create Microsoft user
# ============================================================

async def get_or_create_microsoft_user(
    *,
    microsoft_oid: str,
    microsoft_tid: str | None,
    email: str | None,
    display_name: str | None,
    groups: list[str] | None = None,
) -> User:

    import random, string

    async with SessionLocal() as session:
        result = await session.execute(
            select(User).where(User.microsoft_oid == microsoft_oid)
        )
        user = result.scalar_one_or_none()

        # ── Existing user ────────────────────────────────────
        if user is not None:
            user.last_login_at = utc_now_naive()
            if not user.launcher_password:
                user.launcher_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))

            if microsoft_tid:
                user.microsoft_tid = microsoft_tid
            if display_name:
                user.display_name = display_name
            if email and (user.email is None or user.email == email):
                user.email = email
            if groups is not None:
                clean_oids = [str(g).strip() for g in groups if is_guid_string(str(g).strip())]
                user.groups = json.dumps(clean_oids, ensure_ascii=False)

            await session.commit()
            await session.refresh(user)
            return user

        # ── New user ─────────────────────────────────────────
        user = User(
            uuid=str(uuid.uuid4()),
            userid=None,
            microsoft_oid=microsoft_oid,
            microsoft_tid=microsoft_tid,
            email=email,
            display_name=display_name,
            groups=json.dumps([str(g).strip() for g in groups if is_guid_string(str(g).strip())], ensure_ascii=False) if groups else None,
            last_login_at=utc_now_naive(),
            launcher_password=''.join(random.choices(string.ascii_letters + string.digits, k=10)),
        )
        session.add(user)

        try:
            await session.commit()
            await session.refresh(user)
            return user

        except IntegrityError:
            await session.rollback()

            result = await session.execute(
                select(User).where(User.microsoft_oid == microsoft_oid)
            )
            existing_user = result.scalar_one_or_none()

            if existing_user is not None:
                existing_user.last_login_at = utc_now_naive()
                await session.commit()
                await session.refresh(existing_user)
                return existing_user

            raise


# ============================================================
# Player model & services (separated into src.apps.Player)
# Re-exported here for backwards compatibility
# ============================================================

from src.apps.Player.database import (
    Player,
    get_player_by_user_uuid,
    get_player_by_player_uuid,
    get_player_by_username,
    get_players_by_user_uuids,
    update_player_skin,
    create_player,
    update_player_account,
)

# ============================================================
# Server models (separated into src.apps.Server)
# Re-exported here for backwards compatibility & Base registration
# ============================================================

from src.apps.Server.models import (
    MinecraftServer,
    ServerPlayerRule,
)

if __name__ == "__main__":
    import asyncio
    print("Executing database initialization...")
    asyncio.run(init_db())
    print("Database initialization completed successfully!")

