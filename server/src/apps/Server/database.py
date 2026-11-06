"""
Server database facade re-exporting models and CRUD operations
for full backward compatibility.
"""

from src.apps.Server.crud import (
    add_server_player_rule,
    check_player_server_access,
    create_server,
    delete_server,
    get_all_servers_with_stats,
    get_public_servers,
    get_server_by_id,
    get_server_player_rules,
    remove_server_player_rule,
    remove_server_player_rule_by_uuid,
    update_server,
)
from src.apps.Server.models import (
    MinecraftServer,
    ServerPlayerRule,
    server_to_dict,
)

__all__ = [
    "MinecraftServer",
    "ServerPlayerRule",
    "server_to_dict",
    "create_server",
    "get_server_by_id",
    "get_all_servers_with_stats",
    "get_public_servers",
    "update_server",
    "delete_server",
    "get_server_player_rules",
    "add_server_player_rule",
    "remove_server_player_rule",
    "remove_server_player_rule_by_uuid",
    "check_player_server_access",
]
