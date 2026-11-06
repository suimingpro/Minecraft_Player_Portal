"""
Server application router entrypoint.
Aggregates all Server sub-routers:
- Public server listing and icon serving
- Admin server management (CRUD)
- Admin server rules and player whitelist/blacklist
- Server icon uploads
"""

from src.apps.Server.routers import router
from src.apps.Server.schemas import (
    BatchAddServerPlayersRequest,
    ServerCreateRequest,
    ServerPlayerRuleRequest,
    ServerUpdateRequest,
    UserAddToWhitelistRequest,
)

__all__ = [
    "router",
    "ServerCreateRequest",
    "ServerUpdateRequest",
    "ServerPlayerRuleRequest",
    "BatchAddServerPlayersRequest",
    "UserAddToWhitelistRequest",
]
