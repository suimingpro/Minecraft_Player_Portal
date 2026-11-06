#!/usr/bin/env python3
import asyncio
import os
import sys
from pathlib import Path

# 将 server 目录加入到 sys.path，以便能够导入 src 模块
current_dir = Path(__file__).resolve().parent
server_dir = current_dir.parent / "server"
sys.path.insert(0, str(server_dir))

# 尝试加载 .env
for env_path in [server_dir / ".env", current_dir.parent / ".env"]:
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip().strip("'\"")
        break

from sqlalchemy import inspect, text
from src.apps.MicrosoftSSO.database import Base, Player, User, engine


async def main() -> None:
    sep = "=" * 60

    print(sep)
    print("  Minecraft Player Portal — 数据库初始化")
    print(sep)
    print(f"  连接: {engine.url}")
    print()

    try:
        # 1. 测试连接
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        print("[✓] 数据库连接成功")

        # 2. 建表（已存在的表跳过，不修改）
        print()
        print("[→] 正在同步表结构 (已存在则跳过)...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("[✓] 表结构同步完成")

        # 3. 检查各表状态
        print()
        print("[→] 检查表状态...")
        MODELS = [User, Player]

        async with engine.connect() as conn:
            for model in MODELS:
                tname = model.__tablename__

                exists = await conn.run_sync(
                    lambda sc, tn=tname: inspect(sc).has_table(tn)
                )
                if not exists:
                    print(f"    [✗] {tname:20s}  未找到（建表可能失败）")
                    continue

                row_count = (
                    await conn.execute(text(f"SELECT COUNT(*) FROM `{tname}`"))
                ).scalar()

                cols = await conn.run_sync(
                    lambda sc, tn=tname: [
                        c["name"] for c in inspect(sc).get_columns(tn)
                    ]
                )

                print(
                    f"    [✓] {tname:20s}  {row_count:>6} 行  |  列: {', '.join(cols)}"
                )

        # 4. 完成
        print()
        print("[✓] 初始化脚本执行完毕！")
        print()

    except Exception as exc:
        print()
        print(f"[✗] 初始化失败: {exc}")
        sys.exit(1)

    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
