"""
Standalone database initialization script for Minecraft Player Portal.

Usage:
    cd server
    python -m src.init_db

Performs:
    1. Creates all missing tables (users, group_mappings, system_settings, players, minecraft_servers, server_player_rules).
    2. Runs incremental schema updates and column migrations if upgrading from older schemas.
    3. Initializes system configuration cache and seeds default values.
"""

import asyncio
from src.apps.MicrosoftSSO.database import init_db


async def main():
    print("Starting database initialization and schema migration...")
    await init_db()
    print("Database initialization and schema migration completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())
